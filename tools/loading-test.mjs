#!/usr/bin/env node
// Loading bar test: the card shows a partly filled bar, a step label and a disabled button mid-load;
// once body.ready the button enables; the fill width never decreases; the startup marks are set and in order.
// v13 L3, the kept store (src/v13/kept.js, src/v13/bake.js), in the same browser context: the cold load bakes in the
// worker and keeps it; a reload takes the terrain and rocks' placements from the store; a load whose key differs
// misses, and its record replaces the old one in the slot (so the old key misses after); a record of another tree is
// pruned; a record whose arrays are changed, or of another format, or not this mesh's size, is not used (the bake is
// made again); ?kept=0 and ?worker=0 bake on the page; no module fails, also with the bake held back 3 s
// (?bakehold=3000). And on this tree served as Netlify serves it (tools/sw-site.mjs: an X-Fp-Commit stamp on every
// response, with ?kept=commit): a record made under one commit is not read under another (and is pruned), and a load
// whose commit.json disagrees with its code's stamp neither reads, writes nor prunes. Usage: node tools/loading-test.mjs [url]
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './sw-site.mjs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
const how = (p) => p.evaluate(() => ({ failed: window.__fp_startup.report().extra.failed, bake: window.__fp_startup.report().extra.bake?.source, fell: window.__fp_startup.report().extra.bake?.fellBack, kept: window.__fp_startup.report().extra.bake?.kept, hits: window.__fp.keptStats.hits, misses: window.__fp.keptStats.misses, errors: window.__fp.keptStats.errors, tapes: (window.__fp.keptStats.timing || []).filter((t) => t.tape).map((t) => ({ name: t.name, hit: !!t.hit, ...t.tape })), gal: window.__fp.galleries?.stats?.() || null, galHash: (() => { const objs = window.__fp.modules?.of?.('galleries'); if (!objs?.size) return null; let h = 0, n = 0; for (const o of objs) o.traverse((c) => { const a = c.geometry?.attributes?.position?.array; if (a) for (let i = 0; i < a.length; i++) { h = (Math.imul(h, 31) + Math.round(a[i] * 1e4)) | 0; n++; } }); return `${h}:${n}`; })() }));
// the store's records, read in the page: slot -> { key, tree, v }
const records = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open('fp-kept'); r.onsuccess = () => { const out = {}; const c = r.result.transaction('records').objectStore('records').openCursor(); c.onsuccess = () => { const k = c.result; if (!k) { r.result.close(); return res(out); } out[k.key] = { key: k.value.key, tree: k.value.tree, v: k.value.v }; k.continue(); }; }; }));
// change the record in a slot in the page: what = 'value' (one height in P), 'format', 'short' (P cut down), 'stray' (another tree's record), 'deps' (a script's hash)
const spoil = (p, slot, what) => p.evaluate(([slot, what]) => new Promise((res, rej) => { const r = indexedDB.open('fp-kept'); r.onsuccess = () => { const st = r.result.transaction('records', 'readwrite').objectStore('records'); const g = st.get(slot); g.onsuccess = () => { const v = g.result; if (what === 'stray') { st.put({ ...v, tree: 'commit:0000000' }, 'commit:0000000|' + slot.split('|')[1]); } else if (what === 'value') v.data.P[4] += 1; else if (what === 'format') v.v = -1; else if (what === 'deps') { if (v.deps?.length) v.deps[0] = [v.deps[0][0], 'changed']; } else if (what === 'short') v.data.P = v.data.P.subarray(0, 300).slice(); if (what !== 'stray') st.put(v, slot); st.transaction.oncomplete = () => { r.result.close(); res(true); }; }; g.onerror = () => rej(g.error); }; }), [slot, what]);
const kp = await browser.newPage({ viewport: { width: 640, height: 360 } });
const u0 = url.includes('?') ? url : url + '?';
await kp.goto(u0); await ready(kp);
const h1 = await how(kp); await kept(kp);
const slot = Object.keys(await records(kp)).find((k) => k.startsWith('src|bake:'));
await kp.reload(); await ready(kp); const h2 = await how(kp); await kept(kp);
// v13 L4: a well-formed tape (its checksum made again) that is not the module's call order: its first call changed, a
// call it makes taken out, one it never makes put in. Those calls are answered by the terrain (missed), the tape
// resyncs past the strays (skipped), and the Galleries build the same, vertex for vertex
const forged = await kp.evaluate(async () => {
  const { sumOf } = await import(new URL('src/v13/kept.js', document.baseURI).href);
  return new Promise((res) => { const r = indexedDB.open('fp-kept'); r.onsuccess = () => { const st = r.result.transaction('records', 'readwrite').objectStore('records'); const c = st.openCursor();
    c.onsuccess = () => { const k = c.result; if (!k) { res(null); return; } if (!/\|kept:galleries\.heightAt:/.test(k.key)) { k.continue(); return; }
      const v = k.value, H = v.data, cut = (a) => { const b = Array.from(a); b[0] += 1; b.splice(100, 1); b.splice(200, 0, 12345.5); return new Float64Array(b); };
      H.xs = cut(H.xs); H.zs = cut(H.zs); H.vs = cut(H.vs); v.sum = sumOf(v.data); k.update(v); st.transaction.oncomplete = () => { r.result.close(); res(k.key); }; }; }; });
});
await kp.reload(); await ready(kp); const h2t = await how(kp); await kept(kp);
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
await kp.goto(u0 + '&bakehold=3000'); await ready(kp); const h8 = await how(kp);
await kp.close();
// as Netlify serves it: a stamp on every response, commit.json with the commit (or, to test, another)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let C = 'aaaaaaa', J = null; // the stamp; commit.json's commit when it differs from the stamp
const site = await serveSite({ port: 8199, stamp304: true, commit: () => C,
  files: (p) => { if (p === '/commit.json') return JSON.stringify({ commit: J || C }); const f = join(ROOT, normalize(p)); return f.startsWith(ROOT) && existsSync(f) && statSync(f).isFile() ? readFileSync(f) : null; } });
const sp = await browser.newPage({ viewport: { width: 640, height: 360 } });
const su = 'http://localhost:8199/?q=low&kept=commit';
await sp.goto(su); await ready(sp); const s1 = await how(sp); await kept(sp); const sr1 = Object.keys(await records(sp));
await sp.reload(); await ready(sp); const s2 = await how(sp); await kept(sp);
C = 'bbbbbbb'; await sp.reload(); await ready(sp); const s3 = await how(sp); await kept(sp); const sr3 = Object.keys(await records(sp));
J = 'ccccccc'; await sp.reload(); await ready(sp); const s4 = await how(sp); await kept(sp); const sr4 = Object.keys(await records(sp));
await sp.close(); await site.close();
console.log('stamped', JSON.stringify({ s1, s2, s3, s4, sr1, sr3, sr4 }));
console.log('kept', JSON.stringify({ h1, h2, h3, h4, h5, spoiled, h6, h7, slots: Object.keys(r5) }));
const recHits = (h, s) => h.hits.includes(s.split('|')[1]);
checks.push(
  ['kept: a cold load bakes in the worker and keeps it (' + h1.bake + ', kept ' + h1.kept + ')', h1.bake === 'worker' && h1.kept === true && !!slot],
  ['kept: a reload takes the terrain and the rocks from the store (' + h2.hits.join(', ') + ')', h2.bake === 'kept' && recHits(h2, slot) && h2.hits.some((x) => x.startsWith('kept:rocks.place'))],
  ['tape: a reload answers every taped query from its tape (' + h2.tapes.map((t) => `${t.name} ${t.fromTape}/${t.calls}`).join(', ') + ')', h2.tapes.length >= 6 && h2.tapes.every((t) => t.hit && t.calls > 0 && t.missed === 0 && t.skipped === 0 && t.fromTape === t.calls) && h1.tapes.every((t) => !t.hit && t.calls > 0)],
  ['tape: a tape out of the module\'s order (a call changed, one dropped, one added) is answered by the terrain where it differs and the Galleries build the same (' + forged + ': ' + JSON.stringify(h2t.tapes.find((t) => t.name === 'galleries.heightAt')) + ', ' + h2t.galHash + ')', !!forged && (() => { const t = h2t.tapes.find((x) => x.name === 'galleries.heightAt'); return t && t.hit && t.missed >= 2 && t.skipped >= 1 && t.fromTape + t.missed === t.calls && t.fromTape > t.calls * 0.99 && JSON.stringify(h2t.gal) === JSON.stringify(h2.gal) && !!h2.galHash && h2t.galHash === h2.galHash; })()],
  ['kept: another key misses and its record replaces the old in the slot', h3.bake === 'worker' && h3.kept === true && r3[slot]?.key?.includes('tinct=1')],
  ['kept: the old key, replaced, misses (' + h4.misses.join(', ') + ')', h4.bake === 'worker' && h4.misses.some((x) => x.startsWith(slot.split('|')[1] + ': key'))],
  ['kept: another tree\'s record is pruned', h5.bake === 'kept' && !Object.keys(r5).some((k) => k.startsWith('commit:0000000|'))],
  ['kept: a record with a changed height is not used (' + spoiled.value.misses.join(', ') + ')', spoiled.value.bake === 'worker' && spoiled.value.misses.some((x) => x.startsWith(slot.split('|')[1]))],
  ['kept: a record of another format is not used', spoiled.format.bake === 'worker' && spoiled.format.misses.some((x) => x === slot.split('|')[1] + ': format')],
  ['kept: a record cut short is not used (the walk is baked again)', spoiled.short.bake !== 'kept'],
  ['kept: without commit.json, a record whose scripts\' hashes differ is not used (' + spoiled.deps.misses.join(', ') + ')', r5[slot]?.tree !== 'src' ? spoiled.deps.bake === 'kept' : spoiled.deps.bake === 'worker' && spoiled.deps.misses.includes(slot.split('|')[1] + ': scripts changed')],
  ['kept: ?kept=0 neither reads nor keeps', h6.bake === 'worker' && h6.hits.length === 0 && h6.kept === null],
  ['kept: ?worker=0&kept=0 bakes on the page', h7.bake === 'page' && h7.fell === '?worker=0'],
  ['kept: no module failed (cold, repeat, spoiled, ?kept=0, ?worker=0: ' + [h1, h2, h3, h4, h5, ...Object.values(spoiled), h6, h7].map((h) => h.failed?.length ?? 'none').join(' ') + ')', [h1, h2, h3, h4, h5, ...Object.values(spoiled), h6, h7].every((h) => Array.isArray(h.failed) && h.failed.length === 0)],
  ['kept: with the bake held back 3 s, no module fails (every mesh reader is marked) (' + (h8.failed || []).join(', ') + ')', Array.isArray(h8.failed) && h8.failed.length === 0],
  ['stamped: a cold load keeps under its commit (' + sr1.join(', ') + ')', s1.bake === 'worker' && s1.kept === true && sr1.some((k) => k.startsWith('commit:aaaaaaa|bake:'))],
  ['stamped: the same commit reads it', s2.bake === 'kept'],
  ['stamped: under another commit the record is not read, and is pruned (' + s3.misses.join(', ') + ')', s3.bake === 'worker' && !s3.hits.length && sr3.every((k) => k.startsWith('commit:bbbbbbb|'))],
  ['stamped: commit.json not the code\'s stamp: nothing read, written or pruned (' + s4.misses[0] + ')', s4.bake === 'worker' && !s4.hits.length && s4.kept === false && JSON.stringify(sr4) === JSON.stringify(sr3) && s4.misses.some((x) => x.startsWith('the store is off'))],
  ['kept: no store errors', [h1, h2, h3, h4, h5, ...Object.values(spoiled)].every((h) => h.errors.length === 0)],
);
for (const [n, ok] of checks) console.log(ok ? 'PASS' : 'FAIL', n);
await browser.close();
process.exit(checks.every((c) => c[1]) ? 0 : 1);
