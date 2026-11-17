#!/usr/bin/env node
// What the height path costs a call, against another tree (v16 L5): heightAt, biomeAt, regionAt and waterLevelAt, in
// node, over two fixed pseudo-random point sets (the valley: a disc of r 315; the fen's box: 230 m square round
// (70, 160)), 1e6 calls each (biomeAt a quarter of that), the trees run interleaved (A B, B A, ...) so a busy machine
// loads both alike. Prints, per query and set, each tree's median µs a call over the runs, the spread (min..max), and
// the ratio of the medians (this tree / the base). The base is a git ref (exported with git archive into
// shots/wip/height-speed/<ref>) or a directory holding src/.
//   node tools/height-speed.mjs [--base=origin/main] [--runs=5] [--only=heightAt,regionAt] [--sets=valley,fen] [--n=1e6]
//     [--max=1.0]   exit 1 when a ratio of medians is over max (a gate; the default only prints)
// The numbers swing with the machine's load: read the ratio, run it twice, and never trust one run.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const baseArg = flags.base || 'origin/main', RUNS = +(flags.runs || 5), N = +(flags.n || 1e6);
const ONLY = (flags.only || 'heightAt,biomeAt,regionAt,waterLevelAt').split(',');
const SETS = (flags.sets || 'valley,fen').split(',');
let baseDir = baseArg;
if (!existsSync(`${baseArg}/src/height/field.js`)) {
  const sha = execSync(`git -C ${ROOT} rev-parse ${baseArg}`).toString().trim();
  baseDir = `${ROOT}/shots/wip/height-speed/${sha.slice(0, 10)}`;
  if (!existsSync(`${baseDir}/src/height/field.js`)) { mkdirSync(baseDir, { recursive: true }); execSync(`git -C ${ROOT} archive ${sha} src | tar -x -C ${baseDir}`); }
}
globalThis.FP_HEIGHT_PARAMS = '?';
async function load(dir) {
  const F = await import(pathToFileURL(`${dir}/src/height/field.js`).href);
  const R = await import(pathToFileURL(`${dir}/src/height/regions.js`).href);
  return { heightAt: F.heightAt, biomeAt: F.biomeAt, waterLevelAt: F.waterLevelAt, regionAt: R.regionAt };
}
const TREES = { base: await load(baseDir), this: await load(ROOT) };
function mul(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const PTS = {};
{ const r = mul(42), X = new Float64Array(N), Z = new Float64Array(N); for (let i = 0; i < N; i++) { const a = r() * 6.2832, d = Math.sqrt(r()) * 315; X[i] = Math.cos(a) * d; Z[i] = Math.sin(a) * d; } PTS.valley = [X, Z]; }
{ const r = mul(7), X = new Float64Array(N), Z = new Float64Array(N); for (let i = 0; i < N; i++) { X[i] = 70 - 115 + r() * 230; Z[i] = 160 - 115 + r() * 230; } PTS.fen = [X, Z]; }
let sink = 0;
const res = {};
// one warm-up run (not counted), then RUNS, the order of the trees swapped each run
for (let run = 0; run <= RUNS; run++) for (const tr of run % 2 ? ['this', 'base'] : ['base', 'this']) for (const q of ONLY) for (const sn of SETS) {
  const f = TREES[tr][q], [X, Z] = PTS[sn], n = q === 'biomeAt' ? N / 4 : N;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) { const v = f(X[i], Z[i]); sink += typeof v === 'number' ? v : v ? 1 : 0; }
  if (run) (res[`${q}.${sn}.${tr}`] ??= []).push((performance.now() - t0) * 1000 / n);
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const f3 = (v) => v.toFixed(3);
console.log(`height-speed: this tree against ${baseArg}, ${RUNS} interleaved runs, µs a call (median, min..max)`);
let worst = 0;
for (const q of ONLY) for (const sn of SETS) {
  const a = res[`${q}.${sn}.base`], b = res[`${q}.${sn}.this`], ratio = med(b) / med(a);
  worst = Math.max(worst, ratio);
  console.log(`${(q + ' ' + sn).padEnd(20)} base ${f3(med(a))} (${f3(Math.min(...a))}..${f3(Math.max(...a))})  this ${f3(med(b))} (${f3(Math.min(...b))}..${f3(Math.max(...b))})  ratio ${ratio.toFixed(3)}`);
}
if (sink === 1.2345) console.log('');
if (flags.max) { const ok = worst <= +flags.max; console.log(`${ok ? 'PASS' : 'FAIL'} height-speed: worst ratio ${worst.toFixed(3)} (max ${flags.max})`); process.exit(ok ? 0 : 1); }
