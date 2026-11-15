#!/usr/bin/env node
// The "Stats" section of a release note: how long a release took and what it cost in tokens.
//
//   node tools/release-stats.mjs <version>                      e.g. 14 or v11.1: print the section as Markdown
//   node tools/release-stats.mjs <version> --from <ISO time>    start the clock there (a point release has no milestone doc)
//   node tools/release-stats.mjs <version> --to <ISO time>      stop it there (before the release is tagged: use `date -Iseconds`)
//
// Two parts. "This release": the clock runs from the first commit of the milestone's doc
// (plans/wilderness-v<N>.md; with none, from the release before it) to the commit tagged v<version>.
// "Since the project started": agents and tokens from the walk's first commit to that tag, so v5's covers
// v1 to v5 and everything between them. It gives no time: elapsed days since the first commit say nothing
// about work (the owner, 2026-11-15).
//
// Tokens are read from Claude Code's own session transcripts on this machine (~/.claude/projects/), every
// model call whose timestamp falls inside the window: the main sessions (the orchestrator) and each
// subagent they started. The walk began inside another repository (fading-planet, until 2026-11-11), so
// that project's transcripts are read too, from the walk's first commit on; a little card-game work in
// those days is counted with it. The numbers exist only while the transcripts do (Claude Code prunes old
// ones) and only for work done on this machine. v1's own sessions are not on record: its part says so,
// and the running totals are short by them.
//
// "Tokens" is one number: everything the models read and wrote (fresh input, input written to the cache,
// input reread from the cache, and output). Rereads are by far the largest part, since a long session
// rereads its own context on every call. "Public API cost" is what those tokens would cost at Anthropic's
// listed API prices, each kind at its own rate (PRICE, below); it is not what anyone was billed.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
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
// Public API prices in dollars per million tokens: [input, output, cache read], as Anthropic lists them
// (read 2026-11-15 from the Claude API reference dated 2026-11-03). A cache write costs 1.25 times the
// input price (2 times for the one-hour cache); a call made in fast mode costs twice the standard rate.
// Haiku 5.5's higher rate for prompts over 100 thousand tokens is not applied. A model missing from this
// table is counted in tokens and left out of the cost: add its row when a new model is used.
const PRICE = {
  'claude-fable-5-2': [8, 40, 0.2], 'claude-fable-5-1': [10, 50, 0.25], 'claude-opus-5-5': [4, 20, 0.2],
  'claude-sonnet-5-5': [2, 10, 0.1], 'claude-haiku-5-5': [0.1, 0.5, 0.01],
};
const unpriced = new Set();
const price = (model, r) => {
  const p = PRICE[model.replace(/-\d{8}$/, '')];
  if (!p) { unpriced.add(model); return 0; }
  return (r.in * p[0] + (r.write - r.w1h) * p[0] * 1.25 + r.w1h * p[0] * 2 + r.read * p[2] + r.out * p[1]) / 1e6 * (r.fast ? 2 : 1);
};

// Parsing the transcripts is the slow part (gigabytes), so what each file yielded is kept in the system's
// temporary directory, keyed by the file's size and time: numbers only, nothing of what was said.
const cacheFile = join(tmpdir(), 'release-stats-cache-v1.json');
let cache = {}; try { cache = JSON.parse(readFileSync(cacheFile, 'utf8')); } catch {}
const parse = (file) => {
  const st = statSync(file), stamp = `${st.size}:${st.mtimeMs}`;
  if (cache[file] && cache[file].stamp === stamp) return cache[file].rows;
  const rows = new Map(); // one call is written once per content block; the last line has the final output count
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('"usage"')) continue;
    let d; try { d = JSON.parse(line); } catch { continue; }
    const m = d.message, u = m && m.usage;
    if (!u || !m.id || !d.timestamp || m.model === '<synthetic>') continue;
    const r = { id: m.id, model: m.model, t: d.timestamp, in: u.input_tokens || 0, write: u.cache_creation_input_tokens || 0, w1h: (u.cache_creation && u.cache_creation.ephemeral_1h_input_tokens) || 0, read: u.cache_read_input_tokens || 0, out: u.output_tokens || 0, fast: u.speed === 'fast' ? 1 : 0 };
    const old = rows.get(m.id);
    if (!old || r.out >= old.out) rows.set(m.id, r);
  }
  cache[file] = { stamp, rows: [...rows.values()] };
  return cache[file].rows;
};
const read = (file, agent) => {
  for (const r of parse(file)) {
    const t = new Date(r.t);
    if (t < born || t > to) continue;
    const old = calls.get(r.id);
    if (!old || r.out >= old.k.out) calls.set(r.id, { agent: agent === 'main' ? 'main' : file, model: r.model, t, k: r, cost: price(r.model, r) });
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
try { writeFileSync(cacheFile, JSON.stringify(cache)); } catch {}
const sum = (k) => k.in + k.write + k.read + k.out;
const tally = (since) => {
  const byAgent = new Map(), byModel = new Map(), all = { all: 0, fresh: 0, out: 0, cost: 0 };
  const add = (map, key, c) => { const r = map.get(key) || { all: 0, fresh: 0, out: 0, cost: 0, models: new Set(), agents: new Set() }; r.cost += c.cost; r.all += sum(c.k); r.fresh += sum(c.k) - c.k.read; r.out += c.k.out; r.models.add(c.model); r.agents.add(c.agent); map.set(key, r); };
  for (const c of calls.values()) { if (c.t < since) continue; add(byAgent, c.agent, c); add(byModel, c.model, c); all.cost += c.cost; all.all += sum(c.k); all.fresh += sum(c.k) - c.k.read; all.out += c.k.out; }
  return { byAgent, byModel, all, subs: [...byAgent].filter(([a]) => a !== 'main').sort((a, b) => b[1].all - a[1].all) };
};
const n = (x) => x >= 1e9 ? (x / 1e9).toFixed(2) + ' billion' : x >= 1e6 ? (x / 1e6).toFixed(1) + ' million' : Math.round(x / 1e3) + ' thousand';
const short = (x) => x >= 1e9 ? (x / 1e9).toFixed(2) + 'B' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : Math.round(x / 1e3) + 'k';
const model = (m) => m.replace(/^claude-/, '').replace(/-(\d+)-(\d+).*$/, ' $1.$2').replace(/-\d{8}$/, '').replace(/^./, (c) => c.toUpperCase());
const span = (a, b) => { const mins = Math.round((b - a) / 60000); return mins >= 2880 ? `${Math.floor(mins / 1440)} days ${Math.round((mins % 1440) / 60)} hours` : `${Math.floor(mins / 60)} hours ${mins % 60} minutes`; };
// Agents counts the orchestrator as one, in the model it ran on; an agent that used two models is in both rows and once in the total.
const usd = (x) => '$' + Math.round(x).toLocaleString('en-US');
const models = (T) => `| Model | Agents | Tokens | Public API cost |\n|---|---|---|---|\n${[...T.byModel].sort((a, b) => b[1].all - a[1].all).map(([m, r]) => `| ${model(m)} | ${r.agents.size} | ${short(r.all)} | ${usd(r.cost)} |`).join('\n')}\n| **Total** | **${T.byAgent.size}** | **${short(T.all.all)}** | **${usd(T.all.cost)}** |`;
const tokens = (T) => n(T.all.all);

const R = tally(from), C = tally(born);
if (!C.all.all) { console.error(`no transcripts on this machine cover anything up to v${version}`); process.exit(1); }
const one = first && R.all.all ? `
${models(R)}

<details><summary>Each agent</summary>

| Agent | Model | Tokens | Public API cost |
|---|---|---|---|
${[['main', R.byAgent.get('main')], ...R.subs].filter(([, r]) => r).map(([a, r]) => `| ${a === 'main' ? 'The orchestrator' : names.get(a).replace(/\|/g, '/')} | ${[...r.models].map(model).join(', ')} | ${short(r.all)} | ${usd(r.cost)} |`).join('\n')}
| **Total** | | **${short(R.all.all)}** | **${usd(R.all.cost)}** |

</details>` : '- **Agents and tokens:** not on record; the sessions that built this release were not kept.';

console.log(`### Stats

**This release**

- **Time:** ${span(from, to)}, from the first plan to live.
${one}
${first ? `
**Since the project started** (v1 to v${version})

Not counting v1, whose sessions were not kept.

${models(C)}` : ''}`);
if (unpriced.size) console.error(`no price for: ${[...unpriced].join(', ')} (counted in tokens, not in cost; add to PRICE)`);
