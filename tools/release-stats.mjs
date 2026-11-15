#!/usr/bin/env node
// The "Stats" section of a release note: how long a release took and what it cost in tokens.
//
//   node tools/release-stats.mjs <version>                      e.g. 14 or v11.1: print the section as Markdown
//   node tools/release-stats.mjs <version> --from <ISO time>    start the clock there (a point release has no milestone doc)
//   node tools/release-stats.mjs <version> --to <ISO time>      stop it there (before the release is tagged: use `date -Iseconds`)
//
// Two parts. "This release": the clock runs from the first commit of the milestone's doc
// (plans/wilderness-v<N>.md; with none, from the release before it) to the commit tagged v<version>.
// "Since the project started": the same counts from the walk's first commit to that tag, so v5's covers
// v1 to v5 and everything between them.
//
// Tokens are read from Claude Code's own session transcripts on this machine (~/.claude/projects/), every
// model call whose timestamp falls inside the window: the main sessions (the orchestrator) and each
// subagent they started. The walk began inside another repository (fading-planet, until 2026-11-11), so
// that project's transcripts are read too, from the walk's first commit on; a little card-game work in
// those days is counted with it. The numbers exist only while the transcripts do (Claude Code prunes old
// ones) and only for work done on this machine. v1's own sessions are not on record: its part says so,
// and the running totals are short by them.
//
// "Tokens" is everything the models read and wrote: fresh input, input written to the cache, input read
// back from the cache (by far the largest part: a long session rereads its own context on every call),
// and output. Each part gives the total, the part that was not a cache read, and what was written.
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

const when = (...a) => { const s = git('log', ...a).split('\n').pop(); return s ? new Date(s) : null; };
const born = when('--reverse', '--format=%aI', '--', 'src', 'index.html') && new Date(git('log', '--reverse', '--format=%aI', '--', 'src', 'index.html').split('\n')[0]);
const to = toArg ? new Date(toArg) : when('-1', '--format=%aI', `v${version}`);
if (!to || isNaN(to)) { console.error(`no end for v${version}: needs the tag v${version}, or --to`); process.exit(1); }
const before = git('tag').split('\n').filter((x) => /^v[\d.]+$/.test(x) && x !== `v${version}`).map((x) => when('-1', '--format=%aI', x)).filter((d) => d && d < to).sort((a, b) => b - a)[0];
const from = fromArg ? new Date(fromArg) : when('--follow', '--diff-filter=A', '--format=%aI', '--', `plans/wilderness-v${version}.md`) || before || born;
const first = version.replace(/\..*$/, '') === '1' ? null : 'v1';

// Claude Code names a project's transcript directory after the path it was started in, "/" and "." as "-".
// Sessions started in a worktree of this repository get their own directory with the same prefix.
const root = git('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
const base = join(homedir(), '.claude', 'projects');
const keys = [root, join(root, '..', 'fading-planet')].map((r) => r.replace(/[/.]/g, '-'));
const dirs = existsSync(base) ? readdirSync(base).filter((d) => keys.some((k) => d === k || d.startsWith(k + '-'))).map((d) => join(base, d)) : [];

const calls = new Map(); // message id -> { agent, model, time, tokens by kind }
const names = new Map(); // agent key -> its description
const read = (file, agent) => {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('"usage"')) continue;
    let d; try { d = JSON.parse(line); } catch { continue; }
    const m = d.message, u = m && m.usage;
    if (!u || !m.id || !d.timestamp || m.model === '<synthetic>') continue;
    const t = new Date(d.timestamp);
    if (t < born || t > to) continue;
    const k = { in: u.input_tokens || 0, write: u.cache_creation_input_tokens || 0, read: u.cache_read_input_tokens || 0, out: u.output_tokens || 0 };
    const old = calls.get(m.id); // one call is written once per content block; the last line has the final output count
    if (!old || k.out >= old.k.out) calls.set(m.id, { agent: agent === 'main' ? 'main' : file, model: m.model, t, k });
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
      names.set(join(sub, s), desc);
      read(join(sub, s), id);
    }
  }
}
const sum = (k) => k.in + k.write + k.read + k.out;
const tally = (since) => {
  const byAgent = new Map(), byModel = new Map(), all = { all: 0, fresh: 0, out: 0 };
  const add = (map, key, c) => { const r = map.get(key) || { all: 0, fresh: 0, out: 0, models: new Set() }; r.all += sum(c.k); r.fresh += sum(c.k) - c.k.read; r.out += c.k.out; r.models.add(c.model); map.set(key, r); };
  for (const c of calls.values()) { if (c.t < since) continue; add(byAgent, c.agent, c); add(byModel, c.model, c); all.all += sum(c.k); all.fresh += sum(c.k) - c.k.read; all.out += c.k.out; }
  return { byAgent, byModel, all, subs: [...byAgent].filter(([a]) => a !== 'main').sort((a, b) => b[1].all - a[1].all) };
};
const n = (x) => x >= 1e9 ? (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? (x / 1e6).toFixed(1) + ' million' : Math.round(x / 1e3) + ' thousand';
const short = (x) => x >= 1e9 ? (x / 1e9).toFixed(2) + 'B' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : Math.round(x / 1e3) + 'k';
const model = (m) => m.replace(/^claude-/, '').replace(/-(\d+)-(\d+).*$/, ' $1.$2').replace(/-\d{8}$/, '').replace(/^./, (c) => c.toUpperCase());
const span = (a, b) => { const mins = Math.round((b - a) / 60000); return mins >= 2880 ? `${Math.floor(mins / 1440)} days ${Math.round((mins % 1440) / 60)} hours` : `${Math.floor(mins / 60)} hours ${mins % 60} minutes`; };
const models = (T) => `| Model | Tokens | Without cache rereads | Written |\n|---|---|---|---|\n${[...T.byModel].sort((a, b) => b[1].all - a[1].all).map(([m, r]) => `| ${model(m)} | ${short(r.all)} | ${short(r.fresh)} | ${short(r.out)} |`).join('\n')}`;
const tokens = (T) => `${n(T.all.all)} read and written in all; ${n(T.all.fresh)} not counting what was reread from the cache, ${n(T.all.out)} of it written by the models`;

const R = tally(from), C = tally(born);
if (!C.all.all) { console.error(`no transcripts on this machine cover anything up to v${version}`); process.exit(1); }
const one = first && R.all.all ? `- **Agents:** one orchestrator and ${R.subs.length} sub-agents.
- **Tokens:** ${tokens(R)}.

${models(R)}

<details><summary>Each agent</summary>

| Agent | Model | Tokens | Without cache rereads | Written |
|---|---|---|---|---|
${[['main', R.byAgent.get('main')], ...R.subs].filter(([, r]) => r).map(([a, r]) => `| ${a === 'main' ? 'The orchestrator' : names.get(a).replace(/\|/g, '/')} | ${[...r.models].map(model).join(', ')} | ${short(r.all)} | ${short(r.fresh)} | ${short(r.out)} |`).join('\n')}

</details>` : '- **Agents and tokens:** not on record; the sessions that built this release were not kept.';

console.log(`### Stats

**This release**

- **Time:** ${span(from, to)}, from the first plan to live.
${one}
${first ? `
**Since the project started** (v1 to v${version})

- **Time:** ${span(born, to)} since the walk's first commit.
- **Agents:** ${C.subs.length} sub-agents.
- **Tokens:** ${tokens(C)}. v1's sessions were not kept, so this is short by them.

${models(C)}` : ''}`);
