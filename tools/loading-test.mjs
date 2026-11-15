#!/usr/bin/env node
// Loading bar test: the card shows a partly filled bar, a step label and a disabled button mid-load;
// once body.ready the button enables; the fill width never decreases; the startup marks are set and in order.
// v13 L3, the kept store (src/v13/kept.js, src/v13/bake.js), in the same browser context: the cold load bakes in the
// worker and keeps it; a reload takes the terrain and rocks' placements from the store; a load whose key differs
// misses, and its record replaces the old one in the slot (so the old key misses after); a record of another tree is
// pruned; a record whose arrays are changed, or of another format, or not this mesh's size, is not used (the bake is
// made again); ?kept=0 and ?worker=0 bake on the page. Usage: node tools/loading-test.mjs [url]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.addInitScript(() => {
  window.__samples = [];
  setInterval(() => {
    const f = document.querySelector('#load .fill'), s = document.querySelector('#load .step'), b = document.getElementById('begin');
    if (f && b) window.__samples.push({ w: parseFloat(f.style.width) || 0, label: s.textContent, disabled: b.disabled, ready: document.body.classList.contains('ready') });
  }, 50);
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
const mid = await page.evaluate(() => ({ w: document.querySelector('#load .fill').style.width, label: document.querySelector('#load .step').textContent, disabled: document.getElementById('begin').disabled, ready: document.body.classList.contains('ready') }));
await page.screenshot({ path: 'shots/wip/loading-01-card-midload.png', timeout: 240000 });
console.log('mid', mid);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.waitForFunction(() => parseFloat(getComputedStyle(document.getElementById('load')).opacity) < 0.05, null, { timeout: 120000 });
const end = await page.evaluate(() => ({ disabled: document.getElementById('begin').disabled, opacity: getComputedStyle(document.getElementById('load')).opacity }));
await page.screenshot({ path: 'shots/wip/loading-01-card-ready.png', timeout: 240000 });
console.log('end', end);
const samples = await page.evaluate(() => window.__samples);
// v13-P0: the startup marks (src/startup.js) all set, in order, and in the browser's own measures
const marks = await page.evaluate(() => {
  const want = ['module', 'tier', 'renderer', 'terrain', 'mountains', 'scaffold', 'imports', 'modules', 'post', 'programs', 'warmup', 'ready'];
  const at = window.__fp_startup?.report().at || {};
  const ms = new Set(performance.getEntriesByType('measure').map((e) => e.name));
  let ordered = true; for (let i = 1; i < want.length; i++) if (!(at[want[i]] >= at[want[i - 1]])) ordered = false;
  return { all: want.every((k) => at[k] != null && ms.has('fp:' + k)), ordered, ready: at.ready };
});
let mono = true; for (let i = 1; i < samples.length; i++) if (samples[i].w < samples[i - 1].w) mono = false;
console.log('labels', [...new Set(samples.map((s) => s.label))]);
const checks = [
  ['mid-load bar partly filled', parseFloat(mid.w) > 0 && parseFloat(mid.w) < 100 && !mid.ready],
  ['mid-load button disabled', mid.disabled === true],
  ['mid-load label visible', mid.label.length > 0],
  ['ready: button enabled', end.disabled === false],
  ['ready: bar faded', parseFloat(end.opacity) < 0.05],
  ['fill never decreased (' + samples.length + ' samples)', mono],
  ['startup marks set, in order, as measures (ready at ' + Math.round(marks.ready) + ' ms)', marks.all && marks.ordered],
  ['button disabled in every pre-ready sample', samples.filter((s) => !s.ready).every((s) => s.disabled)],
];
// ---------------------------------------------------------------- v13 L3: the kept store
const ready = (p) => p.waitForFunction(() => window.__fp_startup?.report().ready != null, null, { timeout: 300000 });
const kept = (p) => p.waitForFunction(() => window.__fp?.keptDone, null, { timeout: 120000 });
const how = (p) => p.evaluate(() => ({ bake: window.__fp_startup.report().extra.bake?.source, fell: window.__fp_startup.report().extra.bake?.fellBack, kept: window.__fp_startup.report().extra.bake?.kept, hits: window.__fp.keptStats.hits, misses: window.__fp.keptStats.misses, errors: window.__fp.keptStats.errors }));
// the store's records, read in the page: slot -> { key, tree, v }
const records = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open('fp-kept'); r.onsuccess = () => { const out = {}; const c = r.result.transaction('records').objectStore('records').openCursor(); c.onsuccess = () => { const k = c.result; if (!k) { r.result.close(); return res(out); } out[k.key] = { key: k.value.key, tree: k.value.tree, v: k.value.v }; k.continue(); }; }; }));
// change the record in a slot in the page: what = 'value' (one height in P), 'format', 'short' (P cut down), 'stray' (another tree's record), 'deps' (a script's hash)
const spoil = (p, slot, what) => p.evaluate(([slot, what]) => new Promise((res, rej) => { const r = indexedDB.open('fp-kept'); r.onsuccess = () => { const st = r.result.transaction('records', 'readwrite').objectStore('records'); const g = st.get(slot); g.onsuccess = () => { const v = g.result; if (what === 'stray') { st.put({ ...v, tree: 'commit:0000000' }, 'bake:999'); } else if (what === 'value') v.data.P[4] += 1; else if (what === 'format') v.v = -1; else if (what === 'deps') { if (v.deps?.length) v.deps[0] = [v.deps[0][0], 'changed']; } else if (what === 'short') v.data.P = v.data.P.subarray(0, 300).slice(); if (what !== 'stray') st.put(v, slot); st.transaction.oncomplete = () => { r.result.close(); res(true); }; }; g.onerror = () => rej(g.error); }; }), [slot, what]);
const kp = await browser.newPage({ viewport: { width: 640, height: 360 } });
const u0 = url.includes('?') ? url : url + '?';
await kp.goto(u0); await ready(kp);
const h1 = await how(kp); await kept(kp);
const slot = Object.keys(await records(kp)).find((k) => k.startsWith('bake:'));
await kp.reload(); await ready(kp); const h2 = await how(kp); await kept(kp);
const u1 = u0 + '&tinct=1'; // a switch no list of view-only switches holds: another key
await kp.goto(u1); await ready(kp); const h3 = await how(kp); await kept(kp);
const r3 = await records(kp);
await kp.goto(u0); await ready(kp); const h4 = await how(kp); await kept(kp); // the old key was replaced: a miss, kept again
await spoil(kp, slot, 'stray');
await kp.reload(); await ready(kp); const h5 = await how(kp); await kept(kp);
const r5 = await records(kp);
const spoiled = {};
for (const what of ['value', 'format', 'short', 'deps']) { await spoil(kp, slot, what); await kp.reload(); await ready(kp); spoiled[what] = await how(kp); await kept(kp); }
await kp.goto(u0 + '&kept=0'); await ready(kp); const h6 = await how(kp);
await kp.goto(u0 + '&worker=0&kept=0'); await ready(kp); const h7 = await how(kp);
await kp.close();
console.log('kept', JSON.stringify({ h1, h2, h3, h4, h5, spoiled, h6, h7, slots: Object.keys(r5) }));
const recHits = (h, s) => h.hits.includes(s);
checks.push(
  ['kept: a cold load bakes in the worker and keeps it (' + h1.bake + ', kept ' + h1.kept + ')', h1.bake === 'worker' && h1.kept === true && !!slot],
  ['kept: a reload takes the terrain and the rocks from the store (' + h2.hits.join(', ') + ')', h2.bake === 'kept' && recHits(h2, slot) && h2.hits.some((x) => x.startsWith('kept:rocks.place'))],
  ['kept: another key misses and its record replaces the old in the slot', h3.bake === 'worker' && h3.kept === true && r3[slot]?.key?.includes('tinct=1')],
  ['kept: the old key, replaced, misses (' + h4.misses.join(', ') + ')', h4.bake === 'worker' && h4.misses.some((x) => x.startsWith(slot + ': key'))],
  ['kept: another tree\'s record is pruned', h5.bake === 'kept' && !('bake:999' in r5)],
  ['kept: a record with a changed height is not used (' + spoiled.value.misses.join(', ') + ')', spoiled.value.bake === 'worker' && spoiled.value.misses.some((x) => x.startsWith(slot))],
  ['kept: a record of another format is not used', spoiled.format.bake === 'worker' && spoiled.format.misses.some((x) => x === slot + ': format')],
  ['kept: a record cut short is not used (the walk is baked again)', spoiled.short.bake !== 'kept'],
  ['kept: without commit.json, a record whose scripts\' hashes differ is not used (' + spoiled.deps.misses.join(', ') + ')', r5[slot]?.tree !== 'src' ? spoiled.deps.bake === 'kept' : spoiled.deps.bake === 'worker' && spoiled.deps.misses.includes(slot + ': scripts changed')],
  ['kept: ?kept=0 neither reads nor keeps', h6.bake === 'worker' && h6.hits.length === 0 && h6.kept === null],
  ['kept: ?worker=0&kept=0 bakes on the page', h7.bake === 'page' && h7.fell === '?worker=0'],
  ['kept: no store errors', [h1, h2, h3, h4, h5, ...Object.values(spoiled)].every((h) => h.errors.length === 0)],
);
for (const [n, ok] of checks) console.log(ok ? 'PASS' : 'FAIL', n);
await browser.close();
process.exit(checks.every((c) => c[1]) ? 0 : 1);
