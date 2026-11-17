#!/usr/bin/env node
// What the valley costs from above (v12 H5): draw calls and triangles at the four tops (the Span's middle run, the
// Diffident Stair's deck, the glacier's shelf, the west gallery) and three floor places, at eight headings each, with
// the shadow map redrawn on the frame measured (the worst case: the frames a phone feels). Each draw is credited to
// the module that added the object (perf.js's forModule; anything else to core:<name or type>), in the colour pass
// and the shadow pass apart, so the table says where the triangles go when the eye is high.
//   node tools/heights-cost.mjs [base=http://localhost:8123] [q=low] [out.json] [--modules=8] [--objects=40] [--only=span,stair]
//     [--extra=&far=0] (more URL params: &far=0 is the valley as it was before v12-H5's far culling)
// Prints, per station, the worst heading's calls and triangles, the mean over the headings, and the top modules at the
// worst heading. With BOUND=1 it also checks each top against 1.3 x the floor's worst (calls and triangles) and
// prints PASS / FAIL lines, and against fixed numbers (380 calls, 1.3 x 2.1M triangles); heights-test calls it that way on low.
// A top with no floor at its height yet (the shelf and the gallery before H2 and H4 merge) is held in the air there.
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const base = (args[0] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const q = args[1] || 'low';
const out = args[2];
const nMods = +(flags.modules || 8);
const STATIONS = [
  { name: 'span', top: true, x: 98, z: 213, y: 56, pitch: -0.2 },
  { name: 'stair', top: true, x: 228.6, z: -55, y: 108, pitch: -0.2 },
  { name: 'shelf', top: true, x: 40, z: -390, y: 95, pitch: -0.2 },
  { name: 'gallery', top: true, x: -320, z: -60, y: 135, pitch: -0.2 },
  { name: 'spawn', top: false, x: null, z: null, pitch: 0 },
  { name: 'meadow', top: false, x: -190, z: 165, pitch: 0 },
  { name: 'lattice', top: false, x: 40, z: -230, pitch: 0 },
].filter((s) => !flags.only || flags.only.split(',').includes(s.name));
if (flags.village) STATIONS.splice(0, STATIONS.length, // the village's three near stands on low (v15-N1): the Lees' square, the Mid Rung, the Pennyworth
  { name: 'square', top: false, x: 73.7, z: -36.3, pitch: 0 }, { name: 'rungs', top: false, x: 64.3, z: -21.8, pitch: 0 }, { name: 'pennyworth', top: false, x: 100, z: -25, pitch: 0 });
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&perf=1&adapt=0&idle=0&cap=0&gutter=1,100000${flags.extra || ''}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => {
  const fp = window.__fp, info = fp.renderer.info.render;
  document.getElementById('card')?.classList.add('hidden');
  fp.events.dispatchEvent(new CustomEvent('begin'));
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
  // tag every object with its module
  const owner = new Map();
  for (const [name, objects] of fp.modules) for (const o of objects) o.traverse((c) => owner.set(c, name));
  const acc = window.__cost = { main: {}, shadow: {}, tag(o) { let n = owner.get(o) || owner.get(o.userData.farOf); if (!n) { let p = o; while (p && !owner.get(p)) p = p.parent; n = (p && owner.get(p)) || 'core:' + (o.name || o.geometry?.type || o.type); owner.set(o, n); } return n; } };
  const hook = (o) => {
    if (o.__costHooked || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
    o.__costHooked = true;
    let c0 = 0, t0 = 0, s0 = 0, st0 = 0;
    const br = o.onBeforeRender, ar = o.onAfterRender, bs = o.onBeforeShadow, as = o.onAfterShadow;
    o.onBeforeRender = function (...a) { br.apply(this, a); c0 = info.calls; t0 = info.triangles; };
    o.onAfterRender = function (...a) { ar.apply(this, a); const k = acc.tag(o), e = acc.main[k] || (acc.main[k] = [0, 0]); e[0] += info.calls - c0; e[1] += info.triangles - t0;
      if (acc.objs) { const id = k + ' ' + (o.name || o.geometry?.type || o.type) + '#' + o.id, f = acc.objs[id] || (acc.objs[id] = [0, 0, o.count ?? o.instanceCount ?? 1, Math.round(o.geometry?.boundingSphere?.radius || 0)]); f[0] += info.calls - c0; f[1] += info.triangles - t0; } };
    o.onBeforeShadow = function (...a) { bs.apply(this, a); s0 = info.calls; st0 = info.triangles; };
    o.onAfterShadow = function (...a) { as.apply(this, a); const k = acc.tag(o), e = acc.shadow[k] || (acc.shadow[k] = [0, 0]); e[0] += info.calls - s0; e[1] += info.triangles - st0; };
  };
  acc.hookAll = () => fp.scene.traverse(hook);
  acc.hookAll();
  const comp = fp.post.composer, render = comp.render.bind(comp);
  acc.frames = 0;
  comp.render = (...a) => { acc.main = {}; acc.shadow = {}; if (acc.wantObjs) acc.objs = {}; if (acc.force) { fp.renderer.shadowMap.needsUpdate = true; acc.force = false; } render(...a); acc.last = { calls: info.calls, tris: info.triangles, main: acc.main, shadow: acc.shadow, objs: acc.objs }; acc.objs = null; acc.frames++; };
});
const frames = (n) => page.evaluate((n) => new Promise((res) => { const f0 = window.__cost.frames; const w = () => (window.__cost.frames >= f0 + n ? res() : requestAnimationFrame(w)); w(); }), n);
const results = {};
for (const s of STATIONS) {
  const placed = await page.evaluate((s) => {
    const fp = window.__fp, p = fp.player;
    window.__hold && window.__hold(); window.__hold = null;
    const x = s.x ?? fp.spawn.x, z = s.z ?? fp.spawn.z;
    if (s.y == null) { fp.controls.placeAt(x, z); return { how: 'ground', y: p.pos.y - p.eye }; }
    fp.controls.placeAt(x, z, s.y);
    for (let i = 0; i < 4; i++) fp.controls.update(1 / 60);
    const feet = p.pos.y - p.eye;
    if (Math.abs(feet - s.y) < 1.5) return { how: 'floor', y: feet };
    const Y = s.y + p.eye;
    window.__hold = fp.controls.carry({ step(pos) { pos.set(x, Y, z); } });
    return { how: 'held', y: s.y, floorAt: feet };
  }, s);
  await frames(30); // the plants and rocks stream in round the new place
  const rows = [];
  for (let i = 0; i < 8; i++) {
    const yaw = (i * Math.PI) / 4;
    await page.evaluate(([yaw, pitch]) => { const p = window.__fp.player; p.yaw = yaw; p.pitch = pitch; }, [yaw, s.pitch]);
    await frames(8);
    // the next render redraws the shadow map (set in the composer's wrapper, so no frame slips in between)
    const f0 = await page.evaluate((w) => { window.__cost.hookAll(); window.__cost.wantObjs = w; window.__cost.force = true; return window.__cost.frames; }, !!flags.objects);
    await page.evaluate((f0) => new Promise((res) => { const w = () => (window.__cost.frames > f0 ? res() : requestAnimationFrame(w)); w(); }), f0);
    const r = await page.evaluate(() => JSON.parse(JSON.stringify(window.__cost.last)));
    rows.push({ yaw: +yaw.toFixed(2), ...r }); if (!flags.objects) delete r.objs;
  }
  if (flags.village) { // the village's own modules (colour pass), per heading: the worst heading and the mean
    const V = ['lappet', 'quarrels', 'rungs', 'lees', 'pennyworth', 'villagerow', 'lappetfar', 'house'];
    const vs = rows.map((r) => V.reduce((a, k) => [a[0] + (r.main[k]?.[0] || 0), a[1] + (r.main[k]?.[1] || 0)], [0, 0]));
    const w = vs.reduce((a, b) => (b[1] > a[1] ? b : a));
    console.log(`  VILLAGE ${s.name}: worst heading ${w[0]} calls / ${Math.round(w[1] / 1000)}k tris (by heading: ${vs.map((v) => Math.round(v[1] / 1000) + 'k').join(' ')})`);
    for (const k of V) console.log(`    ${k.padEnd(12)} max ${String(Math.max(...rows.map((r) => r.main[k]?.[0] || 0))).padStart(2)} calls ${String(Math.round(Math.max(...rows.map((r) => r.main[k]?.[1] || 0)) / 1000)).padStart(4)}k`);
  }
  const worstT = rows.reduce((a, b) => (b.tris > a.tris ? b : a));
  const worstC = rows.reduce((a, b) => (b.calls > a.calls ? b : a));
  if (flags.objects) { const ob = Object.entries(worstT.objs || {}).sort((a, b) => b[1][1] - a[1][1]).slice(0, +flags.objects); for (const [k, v] of ob) console.log(`      obj ${k.padEnd(50)} ${String(v[0]).padStart(3)} calls ${(v[1] / 1000).toFixed(0).padStart(5)}k n ${v[2]} r ${v[3]}`); }
  const mods = Object.entries(worstT.main).map(([k, v]) => [k, v[0], v[1], (worstT.shadow[k] || [0, 0])]).sort((a, b) => (b[2] + b[3][1]) - (a[2] + a[3][1]));
  const sum = (o) => Object.values(o).reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
  results[s.name] = { top: s.top, placed, maxTris: worstT.tris, maxTrisYaw: worstT.yaw, maxCalls: worstC.calls, maxCallsYaw: worstC.yaw,
    meanTris: Math.round(rows.reduce((a, r) => a + r.tris, 0) / rows.length), meanCalls: Math.round(rows.reduce((a, r) => a + r.calls, 0) / rows.length),
    worstMain: sum(worstT.main), worstShadow: sum(worstT.shadow), modules: mods.slice(0, 40), rows: rows.map((r) => ({ yaw: r.yaw, calls: r.calls, tris: r.tris })) };
  const R = results[s.name];
  console.log(`${s.name.padEnd(8)} ${placed.how.padEnd(6)} y ${placed.y.toFixed(1).padStart(6)}  calls max ${String(R.maxCalls).padStart(4)} (yaw ${R.maxCallsYaw}) mean ${R.meanCalls}  tris max ${(R.maxTris / 1e6).toFixed(2)}M (yaw ${R.maxTrisYaw}) mean ${(R.meanTris / 1e6).toFixed(2)}M  [colour ${R.worstMain[0]} / ${(R.worstMain[1] / 1e6).toFixed(2)}M, shadow ${R.worstShadow[0]} / ${(R.worstShadow[1] / 1e6).toFixed(2)}M]`);
  for (const [k, c, t, sh] of mods.slice(0, nMods)) console.log(`    ${k.padEnd(28)} ${String(c).padStart(4)} calls ${(t / 1000).toFixed(0).padStart(6)}k   shadow ${String(sh[0]).padStart(3)} ${(sh[1] / 1000).toFixed(0).padStart(6)}k`);
}
let fail = 0;
if (process.env.BOUND) {
  const floor = Object.values(results).filter((r) => !r.top);
  const fT = Math.max(...floor.map((r) => r.maxTris)), fC = Math.max(...floor.map((r) => r.maxCalls));
  const k = +(process.env.BOUND_K || 1.3);
  for (const [n, r] of Object.entries(results)) if (r.top) {
    const ok = r.maxTris <= k * fT && r.maxCalls <= k * fC;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'} top ${n} on ${q} within ${k}x the floor's worst — ${r.maxCalls} calls / ${(r.maxTris / 1e6).toFixed(2)}M vs ${fC} / ${(fT / 1e6).toFixed(2)}M`);
    // and against fixed numbers, so the floor growing heavier cannot carry the tops up with it: 1.3x the 2.1M
    // triangles the v12-H5 brief measured as the floor's worst, and 380 calls (364 was 1.4x its 260: with the lift's cage,
    // station and gallery drawn, the stair's top is 351 and the gallery 344, and v12's own floor is 322; v17 puts the
    // Slake, the brook, the leat, the Swallow and the Shuttered Noon in view of the stair's top, 18 calls, which
    // makes it 374: the ceiling is 380)
    const ok2 = r.maxTris <= k * 2.1e6 && r.maxCalls <= 380;
    if (!ok2) fail++;
    console.log(`${ok2 ? 'PASS' : 'FAIL'} top ${n} on ${q} within 380 calls / ${k}x 2.1M triangles — ${r.maxCalls} / ${(r.maxTris / 1e6).toFixed(2)}M`);
  }
}
if (errors.length) console.log('page errors:', errors.slice(0, 5));
if (out) writeFileSync(out, JSON.stringify({ q, results }, null, 1));
await browser.close();
process.exit(fail ? 1 : 0);
