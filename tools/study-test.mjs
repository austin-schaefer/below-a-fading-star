#!/usr/bin/env node
// The study page's gate (#77). Static: every figure or creature module is on the page or says why not (a file directly in
// one of src/study/registry.js's FIGURE_DIRS, one of its FIGURE_FILES, or any file under src/ importing a body-making
// name from one of its FIGURE_KITS is in STUDY_MODULES or NOT_FIGURES); every module listed exports `study` (and every
// recipe module `studyRecipes`); nothing the walk loads names src/study/ or study.html. Live: study.html builds every
// figure and creature and every recipe's seeds with no page error, no subject failing to build or to run 3 s of its
// clock, and at least one subject from every module listed.
//   node tools/study-test.mjs [base]     (default $FP_BASE or http://localhost:8123)
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './launch.mjs';

const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
let fails = 0, passes = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); ok ? passes++ : fails++; };

// ---- static
const R = await import(path.resolve('src/study/registry.js'));
const { RECIPE_MODULES } = await import(path.resolve('src/study/recipes.js'));
const all = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) all.push(p); } };
walk('src');
const cand = new Map(); // file -> why it counts
for (const f of R.FIGURE_FILES) cand.set(f, 'listed in FIGURE_FILES');
for (const d of R.FIGURE_DIRS) for (const f of fs.readdirSync(d)) if (f.endsWith('.js')) cand.set(path.join(d, f), `in ${d}`);
for (const f of all) {
  if (f.startsWith('src/study/')) continue;
  const s = fs.readFileSync(f, 'utf8');
  // import { a, b as c } from '…kit', import * as K from '…kit', import('…kit') (a dynamic import counts as all of it)
  const imports = [...s.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)].map((m) => [m[2], m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean)])
    .concat([...s.matchAll(/import\s*\*\s*as\s+\w+\s+from\s*['"]([^'"]+)['"]/g)].map((m) => [m[1], ['*']]))
    .concat([...s.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => [m[1], ['*']]));
  for (const [spec, got] of imports) {
    const file = path.normalize(path.join(path.dirname(f), spec));
    for (const [k, names] of Object.entries(R.FIGURE_KITS)) {
      if (file !== path.join('src', k)) continue;
      const used = got.filter((n) => n === '*' || names === '*' || names.includes(n));
      if (used.length && !cand.has(f)) cand.set(f, `imports ${used.join(', ')} from ${k}`);
    }
  }
}
const reg = new Set(R.STUDY_MODULES);
const missing = [...cand.keys()].filter((f) => !reg.has(f) && !(f in R.NOT_FIGURES) && !(f in R.DEFERRED)).sort();
const nDef = Object.keys(R.DEFERRED).length;
check(nDef <= R.DEFERRED_MAX, `the deferred figures do not grow (${nDef} of at most ${R.DEFERRED_MAX}: ${Object.keys(R.DEFERRED).join(', ')})`);
const both = Object.keys(R.DEFERRED).filter((f) => f in R.NOT_FIGURES || reg.has(f));
check(both.length === 0, `no file is both deferred and excused or registered${both.length ? ': ' + both.join(', ') : ''}`);
check(missing.length === 0, `every figure or creature module is registered, excused or deferred (${cand.size} found${missing.length ? '; not: ' + missing.map((f) => `${f} (${cand.get(f)})`).join(', ') : ''})`);
const stale = [...Object.keys(R.NOT_FIGURES), ...Object.keys(R.DEFERRED)].filter((f) => !fs.existsSync(f));
check(stale.length === 0, `every excused file exists${stale.length ? ': not ' + stale.join(', ') : ''}`);
const noExport = R.STUDY_MODULES.filter((f) => !fs.existsSync(f) || !/export const study\b/.test(fs.readFileSync(f, 'utf8')));
check(noExport.length === 0, `every registered module exports study (${reg.size}${noExport.length ? '; not: ' + noExport.join(', ') : ''})`);
const noRecipe = RECIPE_MODULES.filter((f) => !fs.existsSync(f) || !/export const studyRecipes\b/.test(fs.readFileSync(f, 'utf8')));
check(noRecipe.length === 0, `every recipe module exports studyRecipes (${RECIPE_MODULES.length}${noRecipe.length ? '; not: ' + noRecipe.join(', ') : ''})`);
const walkFiles = ['index.html', ...all.filter((f) => !f.startsWith('src/study/'))];
// an import of src/study/ (static or dynamic), or a link to study.html (comments may name them: the modules' study exports say where they are read)
const linked = walkFiles.filter((f) => /(from\s*|import\s*\(\s*)['"][^'"]*\/study\/|(href|src)\s*=\s*['"][^'"]*study\.html/.test(fs.readFileSync(f, 'utf8')));
check(linked.length === 0, `nothing the walk loads imports src/study/ or links study.html${linked.length ? ': ' + linked.join(', ') : ''}`);

// ---- live
const browser = await launch();
async function load(query, label) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(`${base}/study.html?shot=1&t=0.5&${query}`, { waitUntil: 'load', timeout: 60000 });
  const ready = await page.waitForFunction(() => window.__study?.ready, null, { timeout: 240000 }).then(() => true, () => false);
  check(ready, `${label}: the page is ready`);
  if (!ready) { await page.close(); return null; }
  await page.evaluate(() => { __study.advance(3); __study.render(); });
  const r = await page.evaluate(() => ({ errors: __study.errors.slice(), subs: __study.subjects.map((s) => ({ id: s.id, module: s.module, ok: s.ok, error: s.error })) }));
  check(pageErrors.length === 0, `${label}: no page error${pageErrors.length ? ': ' + pageErrors.slice(0, 3).join(' | ') : ''}`);
  const bad = r.subs.filter((s) => !s.ok);
  check(r.subs.length > 0 && bad.length === 0 && r.errors.length === 0, `${label}: ${r.subs.length} built and ran 3 s${bad.length || r.errors.length ? '; failed: ' + [...bad.map((s) => `${s.id}: ${s.error}`), ...r.errors].slice(0, 6).join(' | ') : ''}`);
  await page.close();
  return r.subs;
}
const subs = await load('sheet=all', 'figures and creatures');
if (subs) {
  const on = new Set(subs.map((s) => s.module));
  const none = R.STUDY_MODULES.filter((f) => !on.has(f));
  check(none.length === 0, `every registered module stands at least one subject on the page${none.length ? '; none from ' + none.join(', ') : ''}`);
}
const recs = await load('sheet=recipes&seeds=2', 'recipes');
if (recs) {
  const on = new Set(recs.map((s) => s.module));
  const none = RECIPE_MODULES.filter((f) => !on.has(f));
  check(none.length === 0, `every recipe module's recipes are on the page${none.length ? '; none from ' + none.join(', ') : ''}`);
}
await browser.close();
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails || !passes ? 1 : 0);
