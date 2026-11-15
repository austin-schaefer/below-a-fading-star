#!/usr/bin/env node
// The "Stats" section of a release note: how long a release took and what it cost in tokens.
//
//   node tools/release-stats.mjs <version>                      e.g. 14 or v11.1: print the section as Markdown
//   node tools/release-stats.mjs <version> --from <ISO time>    start the clock there (a point release has no milestone doc)
//   node tools/release-stats.mjs <version> --to <ISO time>      stop it there (before the release is tagged: use `date -Iseconds`)
//
// The clock runs from the first commit of the milestone's doc (plans/wilderness-v<N>.md) to the commit
// tagged v<version>. Tokens are read from Claude Code's own session transcripts on this machine
// (~/.claude/projects/<this repository>/), every model call whose timestamp falls inside that window:
// the main sessions (the orchestrator) and each subagent they started. So the numbers exist only while
// those transcripts do (Claude Code prunes old ones), only for work done on this machine, and a session
// working on something else in the same window is counted too. A release whose transcripts are gone
// prints nothing and exits 1.
//
// "Tokens" is everything the models read and wrote: fresh input, input written to the cache, input read
// back from the cache (by far the largest part: a long session rereads its own context on every call),
// and output. The section gives the total and the part that was not a cache read.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const fromArg = opt('--from'), toArg = opt('--to');
const version = (args[0] || '').replace(/^v/, '');
if (!version) { console.error('usage: release-stats.mjs <version> [--from ISO] [--to ISO]'); process.exit(2); }
const git = (...a) => { try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

const doc = `plans/wilderness-v${version}.md`;
const from = new Date(fromArg || git('log', '--diff-filter=A', '--format=%aI', '--', doc).split('\n').pop());
const to = new Date(toArg || git('log', '-1', '--format=%aI', `v${version}`));
if (isNaN(from) || isNaN(to)) { console.error(`no window for v${version}: needs ${doc} in history (or --from) and the tag v${version} (or --to)`); process.exit(1); }

// Claude Code names a project's transcript directory after the path it was started in, "/" and "." as "-".
// Sessions started in a worktree of this repository get their own directory with the same prefix.
const root = git('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
const base = join(homedir(), '.claude', 'projects');
const key = root.replace(/[/.]/g, '-');
const dirs = existsSync(base) ? readdirSync(base).filter((d) => d === key || d.startsWith(key + '-')).map((d) => join(base, d)) : [];

const calls = new Map(); // message id -> { agent, model, tokens by kind }
const names = new Map(); // agent key -> its description
const read = (file, agent) => {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('"usage"')) continue;
    let d; try { d = JSON.parse(line); } catch { continue; }
    const m = d.message, u = m && m.usage;
    if (!u || !m.id || !d.timestamp || m.model === '<synthetic>') continue;
    const t = new Date(d.timestamp);
    if (t < from || t > to) continue;
    const k = { in: u.input_tokens || 0, write: u.cache_creation_input_tokens || 0, read: u.cache_read_input_tokens || 0, out: u.output_tokens || 0 };
    const old = calls.get(m.id); // one call is written once per content block; the last line has the final output count
    if (!old || k.out >= old.k.out) calls.set(m.id, { agent, model: m.model, k });
  }
};
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
    read(join(dir, f), 'main');
    const sub = join(dir, f.replace(/\.jsonl$/, ''), 'subagents');
    if (!existsSync(sub)) continue;
    for (const s of readdirSync(sub).filter((s) => s.endsWith('.jsonl'))) {
      const id = s.replace(/\.jsonl$/, '');
      let desc = id; try { desc = JSON.parse(readFileSync(join(sub, id + '.meta.json'), 'utf8')).description || id; } catch {}
      names.set(id, desc);
      read(join(sub, s), id);
    }
  }
}
if (!calls.size) { console.error(`no transcripts on this machine cover v${version} (${from.toISOString()} to ${to.toISOString()})`); process.exit(1); }

const sum = (k) => k.in + k.write + k.read + k.out;
const add = (map, key, c) => { const r = map.get(key) || { all: 0, fresh: 0, out: 0, models: new Set() }; r.all += sum(c.k); r.fresh += sum(c.k) - c.k.read; r.out += c.k.out; r.models.add(c.model); map.set(key, r); };
const byAgent = new Map(), byModel = new Map(), total = new Map();
for (const c of calls.values()) { add(byAgent, c.agent, c); add(byModel, c.model, c); add(total, 'all', c); }
const n = (x) => x >= 1e9 ? (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? (x / 1e6).toFixed(1) + ' million' : Math.round(x / 1e3) + ' thousand';
const short = (x) => x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : Math.round(x / 1e3) + 'k';
const model = (m) => m.replace(/^claude-/, '').replace(/-(\d+)-(\d+).*$/, ' $1.$2').replace(/^./, (c) => c.toUpperCase());
const mins = Math.round((to - from) / 60000);
const clock = mins >= 2880 ? `${Math.floor(mins / 1440)} days ${Math.round((mins % 1440) / 60)} hours` : `${Math.floor(mins / 60)} hours ${mins % 60} minutes`;
const subs = [...byAgent].filter(([a]) => a !== 'main').sort((a, b) => b[1].all - a[1].all);
const T = total.get('all');
const row = (label, r) => `| ${label} | ${short(r.all)} | ${short(r.fresh)} | ${short(r.out)} |`;

console.log(`### Stats

- **Time:** ${clock}, from the first plan to live.
- **Agents:** one orchestrator and ${subs.length} sub-agents.
- **Tokens:** ${n(T.all)} read and written in all; ${n(T.fresh)} not counting what was reread from the cache, ${n(T.out)} of it written by the models.

| Model | Tokens | Without cache rereads | Written |
|---|---|---|---|
${[...byModel].sort((a, b) => b[1].all - a[1].all).map(([m, r]) => row(model(m), r)).join('\n')}

<details><summary>Each agent</summary>

| Agent | Model | Tokens | Without cache rereads | Written |
|---|---|---|---|---|
${[['main', byAgent.get('main')], ...subs].filter(([, r]) => r).map(([a, r]) => `| ${a === 'main' ? 'The orchestrator' : names.get(a).replace(/\|/g, '/')} | ${[...r.models].map(model).join(', ')} | ${short(r.all)} | ${short(r.fresh)} | ${short(r.out)} |`).join('\n')}

</details>`);
