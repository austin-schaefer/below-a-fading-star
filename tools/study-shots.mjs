#!/usr/bin/env node
// The study sheets (#77): every figure, every creature and every recipe's six seeds, rendered from study.html into
// shots/wip/, one page load a sheet. A sheet is up to PER subjects (figures and creatures, default 16) or RECIPES recipes
// (default 4, six seeds each); each load takes its pictures in order on the page's own clock: the neutral light at t and
// t + 0.4 s (two frames of the same motion, to read it by), then the low western sun at t + 0.4 s.
//   node tools/study-shots.mjs [base] [prefix] [what]
//     base    default $FP_BASE or http://localhost:8123
//     prefix  default study: files are shots/wip/<prefix>-<sheet>-<part>-<light>[-a|-b].png
//     what    figures,creatures,recipes (default all three) or ids: only=thurifer,leerie (one sheet of just those)
//   W=2560 H=1440 PER=16 RECIPES=4 T=2.5 Q=high (the builders' quality)
// Prints one line per picture and a PASS or FAIL per sheet (a subject that failed to build or update, or a page error).
import { launch } from './launch.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const prefix = process.argv[3] || 'study';
const what = process.argv[4] || 'figures,creatures,recipes';
const W = +(process.env.W || 2560), H = +(process.env.H || 1440), PER = +(process.env.PER || 16), RPER = +(process.env.RECIPES || 4);
const T = +(process.env.T || 2.5), Q = process.env.Q || 'high';
mkdirSync('shots/wip', { recursive: true });

const browser = await launch();
let fails = 0, shots = 0;
async function sheet(query, name, recipes) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(`${base}/study.html?shot=1&q=${Q}&t=${T}&${query}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__study?.ready, null, { timeout: 180000 });
  const info = await page.evaluate(() => ({ total: __study.total, n: __study.subjects.length, errors: __study.errors.slice(), bad: __study.subjects.filter((s) => !s.ok).map((s) => `${s.id}: ${s.error}`) }));
  const shoot = async (suffix) => { const out = `shots/wip/${prefix}-${name}${suffix}.png`; await page.screenshot({ path: out }); shots++; console.log(`[saved] ${out}`); };
  if (recipes) { await shoot('-neutral'); }
  else {
    await shoot('-neutral-a');
    await page.evaluate(() => { __study.advance(0.4); __study.render(); });
    await shoot('-neutral-b');
    await page.evaluate(() => { __study.setLight('sun'); __study.render(); });
    await shoot('-sun');
  }
  const after = await page.evaluate(() => __study.errors.slice());
  const bad = [...new Set([...info.bad, ...after, ...pageErrors])];
  console.log(`${bad.length ? 'FAIL' : 'PASS'} ${name}: ${info.n} subjects${bad.length ? ': ' + bad.join(' | ') : ''}`);
  if (bad.length) fails++;
  await page.close();
  return info.total;
}

for (const w of what.split(',')) {
  if (w.startsWith('only=')) { await sheet(w, 'only', false); continue; }
  const recipes = w === 'recipes', per = recipes ? RPER : PER;
  let total = Infinity;
  for (let part = 1; (part - 1) * per < total; part++) total = await sheet(`sheet=${w}&part=${part}&per=${per}`, `${w}-${part}`, recipes);
}
await browser.close();
console.log(`${shots} pictures, ${fails} sheets with failures`);
process.exit(fails || !shots ? 1 : 0);
