#!/usr/bin/env node
// Audio quality gates (v7.2-00), run before every push after tools/audio-test.mjs. In one browser:
//  1. the survey (tools/audio-survey.mjs) into shots/wip/audio/quality-<timestamp>/: one check a pose that it rendered,
//     and one a gated band (tools/audio-survey.json marks them);
//  2. limiter engagement: the moor walk rendered with --pre (the master and the post-limiter tap of the same render,
//     sample-aligned); per 50 ms block the post/pre level difference, less its median (Chromium's compressor adds a
//     fixed makeup gain), is the gain reduction; reduction over 1 dB must be under 1 % of the blocks above -70 dBFS;
//  3. determinism: the first pose rendered again agrees with the survey's render within 0.2 dB on lufs_i.
// Prints PASS/FAIL lines and a count; exit 1 on any failure; zero checks is a failure.
// Usage: node tools/audio-quality-test.mjs <base> [--q=low] [--only=pose,...] (only: a subset of the survey, for a quick look)
import fs from 'node:fs';
import path from 'node:path';
import { launch, parseArgs, render } from './audio-render.mjs';
import { survey, loadSurvey, poseUrl } from './audio-survey.mjs';
import { readWav, analyse } from './audio-metrics.mjs';

const { o, pos } = parseArgs(process.argv.slice(2));
const base = pos[0] || 'http://localhost:8123', q = typeof o.q === 'string' ? o.q : 'low';
const dir = `shots/wip/audio/quality-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ': ' + info : ''}`); };

function limiterEngagement(preFile, postFile, blockS = 0.05) {
  const A = readWav(preFile), B = readWav(postFile), sr = A.sr, n = Math.min(A.ch[0].length, B.ch[0].length), L = Math.round(blockS * sr);
  const ms = (w, o) => { let s = 0; for (const c of w.ch) for (let i = o; i < o + L; i++) s += c[i] * c[i]; return s / (L * w.ch.length); };
  const diffs = [];
  for (let o = 0; o + L <= n; o += L) { const p = ms(A, o), q2 = ms(B, o); if (p > 1e-7) diffs.push(10 * Math.log10(Math.max(q2, 1e-20) / p)); }
  const s = diffs.slice().sort((x, y) => x - y), med = s.length ? s[s.length >> 1] : 0;
  const over = diffs.filter((d) => med - d > 1).length, worst = s.length ? med - s[0] : 0;
  return { blocks: diffs.length, makeup: med, over, share: diffs.length ? over / diffs.length : 0, worst };
}

const S = loadSurvey(), only = typeof o.only === 'string' ? o.only.split(',') : null;
const browser = await launch();
try {
  // 1. the survey
  const { rows } = await survey(base, { out: dir, only, q, browser, log: (l) => console.log('  ' + l) });
  for (const r of rows) {
    check(`${r.name}: rendered`, !r.error && !!r.metrics, r.error || `${r.metrics.seconds} s`);
    const p = S.poses.find((x) => x.name === r.name);
    for (const [k, b] of Object.entries(p.bands)) if (b.gated) {
      const v = r.metrics?.[k], j = r.judged[k];
      check(`${r.name}: ${k} ${b.none ? 'none' : [b.min != null ? '≥ ' + b.min : '', b.max != null ? '≤ ' + b.max : ''].filter(Boolean).join(' ')}`, j === 'ok', `${v ?? 'none'}`);
    }
  }
  // 2. limiter engagement on the moor walk
  const walk = S.poses.find((p) => p.name === 'moor-walk') || S.poses.find((p) => p.options?.walk) || S.poses[0];
  const pre = path.join(dir, `${walk.name}-pre.wav`);
  try {
    await render(browser, poseUrl(base, walk, q), pre, { ...walk.options, seconds: walk.seconds, pre: true }, { quiet: true });
    const e = limiterEngagement(pre, pre.replace(/\.wav$/, '.post.wav'));
    check(`limiter: gain reduction over 1 dB in under 1 % of blocks (${walk.name})`, e.blocks > 0 && e.share < 0.01, `${(100 * e.share).toFixed(2)} % of ${e.blocks} 50 ms blocks (worst ${e.worst.toFixed(1)} dB; makeup ${e.makeup.toFixed(2)} dB)`);
  } catch (err) { check(`limiter: ${walk.name} rendered with --pre`, false, err.message); }
  // 3. determinism: the first pose again
  const first = rows.find((r) => r.metrics);
  if (first) {
    const p = S.poses.find((x) => x.name === first.name), again = path.join(dir, `${p.name}-again.wav`);
    try {
      await render(browser, poseUrl(base, p, q), again, { ...p.options, seconds: p.seconds }, { quiet: true });
      const m = analyse(again).m, d = Math.abs(m.lufs_i - first.metrics.lufs_i);
      check(`determinism: ${p.name} twice, lufs_i within 0.2 dB`, d <= 0.2, `${first.metrics.lufs_i} and ${m.lufs_i} (${d.toFixed(2)} dB)`);
    } catch (err) { check(`determinism: ${p.name} rendered again`, false, err.message); }
  } else check('determinism: a first pose to render twice', false, 'no pose rendered');
} finally { await browser.close(); }

const passed = results.filter((r) => r.ok).length;
fs.writeFileSync(path.join(dir, 'quality.json'), JSON.stringify({ base, q, results }, null, 1));
console.log(`\n${passed}/${results.length} checks passed (${dir})`);
process.exit(!results.length || passed < results.length ? 1 : 0);
