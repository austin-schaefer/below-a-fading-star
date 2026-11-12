#!/usr/bin/env node
// Audio quality gates (v7.2-00; one page v9-M5), run before every push after tools/audio-test.mjs. One browser, into shots/wip/audio/quality-<timestamp>/:
//  1. the survey (tools/audio-survey.mjs): one check a pose that it rendered, and one a gated band (tools/audio-survey.json
//     marks them);
//  2. limiter engagement: the moor walk is tapped before the limiter as well as after (--pre; the survey's numbers for
//     that pose are the post tap of the same render), the two lined up past the compressor's look-ahead; per 50 ms block
//     the post/pre level difference, less its median (Chromium's compressor adds a fixed makeup gain), is the gain
//     reduction; reduction over 1 dB must be under 1 % of the blocks above -70 dBFS;
//  3. determinism: the first pose rendered once more at the end agrees with its first render within 0.2 dB on lufs_i.
// The moor walk's pre-limiter tap is the survey's own render of that pose, so the limiter check costs no render of its own.
// Prints PASS/FAIL lines and a count; exit 1 on any failure; zero checks is a failure.
// Usage: node tools/audio-quality-test.mjs <base> [--q=low] [--only=pose,...] [--one-page [--between=s]]
// (only: a subset of the survey, for a quick look; the walk is added for the limiter check; --one-page: see audio-survey.mjs, not for a push)
import fs from 'node:fs';
import path from 'node:path';
import { launch, parseArgs } from './audio-render.mjs';
import { survey, loadSurvey } from './audio-survey.mjs';
import { readWav } from './audio-metrics.mjs';

const { o, pos } = parseArgs(process.argv.slice(2));
const base = pos[0] || 'http://localhost:8123', q = typeof o.q === 'string' ? o.q : 'low';
const dir = `shots/wip/audio/quality-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ': ' + info : ''}`); };

// the compressor delays its output (Chromium's look-ahead, 6 ms): the post tap is lined up on the pre tap first, by
// the lag (0-25 ms) of the best correlation over the render's first 5 s
function limiterEngagement(preFile, postFile, blockS = 0.05) {
  const A = readWav(preFile), B = readWav(postFile), sr = A.sr, L = Math.round(blockS * sr), x = A.ch[0], y = B.ch[0];
  let lag = 0, best = -Infinity;
  for (let k = 0; k < Math.round(0.025 * sr); k++) {
    let s = 0, a = 0, b = 0; for (let i = 0; i < Math.min(5 * sr, x.length - k); i++) { s += x[i] * y[i + k]; a += x[i] * x[i]; b += y[i + k] * y[i + k]; }
    const r = s / Math.sqrt(a * b || 1); if (r > best) { best = r; lag = k; }
  }
  const n = Math.min(A.ch[0].length, B.ch[0].length - lag);
  const ms = (w, o) => { let s = 0; for (const c of w.ch) for (let i = o; i < o + L; i++) s += c[i] * c[i]; return s / (L * w.ch.length); };
  const diffs = [];
  for (let o = 0; o + L <= n; o += L) { const p = ms(A, o), q2 = ms(B, o + lag); if (p > 1e-7) diffs.push(10 * Math.log10(Math.max(q2, 1e-20) / p)); }
  const s = diffs.slice().sort((u, v) => u - v), med = s.length ? s[s.length >> 1] : 0;
  const over = diffs.filter((d) => med - d > 1).length, worst = s.length ? med - s[0] : 0;
  return { blocks: diffs.length, makeup: med, over, share: diffs.length ? over / diffs.length : 0, worst, lagMs: lag / sr * 1000, r: best };
}

if (typeof o.rescore === 'string') { // node tools/audio-quality-test.mjs --rescore=<pre.wav>: the limiter check on an existing --pre render
  const e = limiterEngagement(o.rescore, o.rescore.replace(/\.wav$/, '.post.wav')); console.log(e); process.exit(e.share < 0.01 ? 0 : 1);
}
const S = loadSurvey(), walk = S.poses.find((p) => p.name === 'moor-walk') || S.poses.find((p) => p.options?.walk) || S.poses[0];
let only = typeof o.only === 'string' ? o.only.split(',') : null;
if (only && !only.some((n) => walk.name === n || walk.name.startsWith(n))) only.push(walk.name); // the limiter check needs its pose
const browser = await launch();
try {
  // the survey's poses, the walk also tapped before the limiter, and the first pose once more at the end
  const { rows, againRow } = await survey(base, { out: dir, only, q, browser, log: (l) => console.log('  ' + l), modify: { [walk.name]: { pre: true } }, again: true, onePage: !!o['one-page'], between: typeof o.between === 'string' ? Number(o.between) : undefined });
  // 1. the survey
  for (const r of rows) {
    check(`${r.name}: rendered`, !r.error && !!r.metrics, r.error || `${r.metrics.seconds} s`);
    const p = S.poses.find((x) => x.name === r.name);
    for (const [k, b] of Object.entries(p.bands)) if (b.gated) {
      const v = r.metrics?.[k], j = r.judged[k];
      check(`${r.name}: ${k} ${b.none ? 'none' : [b.min != null ? '≥ ' + b.min : '', b.max != null ? '≤ ' + b.max : ''].filter(Boolean).join(' ')}`, j === 'ok', `${v ?? 'none'}`);
    }
  }
  // 2. limiter engagement on the moor walk (its --pre render is the survey's own)
  const pre = path.join(dir, `${walk.name}.wav`);
  try {
    if (!fs.existsSync(pre.replace(/\.wav$/, '.post.wav'))) throw new Error('no pre/post render of ' + walk.name);
    const e = limiterEngagement(pre, pre.replace(/\.wav$/, '.post.wav'));
    check(`limiter: gain reduction over 1 dB in under 1 % of blocks (${walk.name})`, e.blocks > 0 && e.share < 0.01, `${(100 * e.share).toFixed(2)} % of ${e.blocks} 50 ms blocks (worst ${e.worst.toFixed(1)} dB; makeup ${e.makeup.toFixed(2)} dB; post tap ${e.lagMs.toFixed(1)} ms behind, r ${e.r.toFixed(4)})`);
  } catch (err) { check(`limiter: ${walk.name} rendered with --pre`, false, err.message); }
  // 3. determinism: the first pose again, at the end
  const first = rows.find((r) => r.metrics);
  if (first && againRow?.metrics) {
    const d = Math.abs(againRow.metrics.lufs_i - first.metrics.lufs_i);
    check(`determinism: ${first.name} twice, lufs_i within 0.2 dB`, d <= 0.2, `${first.metrics.lufs_i} and ${againRow.metrics.lufs_i} (${d.toFixed(2)} dB)`);
  } else check(first ? `determinism: ${first.name} rendered again` : 'determinism: a first pose to render twice', false, againRow?.error || 'no pose rendered');
} finally { await browser.close(); }

const passed = results.filter((r) => r.ok).length;
fs.writeFileSync(path.join(dir, 'quality.json'), JSON.stringify({ base, q, results }, null, 1));
console.log(`\n${passed}/${results.length} checks passed (${dir})`);
process.exit(!results.length || passed < results.length ? 1 : 0);
