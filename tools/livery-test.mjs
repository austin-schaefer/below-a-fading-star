#!/usr/bin/env node
// v8-06 the liveries (src/v8/livery.js): every Heliarch officer's mesh carries the ember stole in its vertex colours and
// a badge (the formal sign) among its parts; every Late figure wears at least three cloths and the sign sewn wrong; the
// dealings' props stand (the Leerie's slate on his first standard, the keeper's peg at the Kept Fire); the Thurifer bows
// to a gnomon it passes (one is registered for the test, as brief 01's will be) and walks on.
// Usage: node tools/livery-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`); };
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });

const OFFICERS = { 'walkers-thurifer': 'the Thurifer', 'walkers-leerie': 'the Leerie', 'walkers-linkboy': 'the Link-Boy', 'living-workers-taker': 'the Taker', 'living-workers-sexton': 'the Sexton', 'living-still-stylite': 'the Stylite', 'living-still-sleeper': 'the Long Sleeper', 'living-still-accrescent': 'the Accrescent' };
const LATE = { 'living-workers-coheirs': 'the Coheirs', 'inhabitants-guest': 'the Wimpled Guest' };

const figs = await page.evaluate(({ OFFICERS, LATE }) => {
  // vertex colours are linear (THREE.Color converts the hex): back to sRGB before the hue is read
  const sg = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const hsv = (r, g, b) => { r = sg(r); g = sg(g); b = sg(b); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d > 1e-6) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx > 0 ? d / mx : 0, mx]; };
  const out = {};
  __fp.scene.traverse((o) => {
    if (!o.isMesh || !(o.name in OFFICERS || o.name in LATE)) return;
    const g = o.geometry, c = g.attributes.color.array, n = c.length / 3, L = g.userData.livery || null;
    let stole = 0; const cls = { pom: 0, saffron: 0, turq: 0, undyed: 0 };
    for (let i = 0; i < n; i++) {
      const [h, s, v] = hsv(c[i * 3], c[i * 3 + 1], c[i * 3 + 2]);
      if (h >= 8 && h <= 23 && s > 0.55 && v > 0.12) stole++;
      if ((h >= 345 || h <= 6) && s > 0.45 && v > 0.05) cls.pom++;
      else if (h >= 30 && h <= 50 && s > 0.5 && v > 0.08) cls.saffron++;
      else if (h >= 160 && h <= 195 && s > 0.4 && v > 0.05) cls.turq++;
      else if (s < 0.3 && v > 0.45 && h >= 25 && h <= 60) cls.undyed++;
    }
    // the badge's vertices: a brass part (a warm, metallic colour) within the recorded range
    let brass = 0;
    const mr = g.attributes.aMRE?.array;
    for (const [a, b] of L?.badge || []) for (let i = a; i < b; i++) { const [h, s] = hsv(c[i * 3], c[i * 3 + 1], c[i * 3 + 2]); if (h >= 20 && h <= 55 && s > 0.3 && mr && mr[i * 3] > 0.5) brass++; }
    out[o.name] = { verts: n, stole, cls, brass, L: L && { people: L.people, stole: L.stole.length, badge: L.badge.length, sign: L.sign.length } };
  });
  return out;
}, { OFFICERS, LATE });

for (const [name, who] of Object.entries(OFFICERS)) {
  const f = figs[name];
  check(`${who}: the stole's ember in its vertex colours, and a brass badge`, !!f && f.L?.people === 'heliarch' && f.L.stole >= 1 && f.stole >= 40 && f.L.badge >= 1 && f.brass >= 12, f && { stoleVerts: f.stole, stoles: f.L?.stole, badges: f.L?.badge, brassVerts: f.brass });
}
for (const [name, who] of Object.entries(LATE)) {
  const f = figs[name], n = f ? Object.values(f.cls).filter((k) => k >= 12).length : 0;
  check(`${who}: at least three cloths, and the sign sewn wrong`, !!f && f.L?.people === 'late' && n >= 3 && f.L.sign >= 1, f && { cloths: f.cls, signs: f.L?.sign });
}

// the dealings' props
const props = await page.evaluate(() => {
  const L = __fp.livery, slate = __fp.scene.getObjectByName('livery-slate'), peg = __fp.scene.getObjectByName('livery-peg');
  const heads = __fp.leerie?.heads;
  return { slate: !!slate, peg: !!peg, slateToHead0: heads && L.slate ? Math.hypot(L.slate.x - heads[0].x, L.slate.z - heads[0].z) : null,
    pegToHearth: L.peg ? Math.hypot(L.peg.x - 8.3, L.peg.z + 193.2) : null, pegToP6: L.peg ? Math.hypot(L.peg.x - 10, L.peg.z + 188) : null, stats: L.stats?.() };
});
check('the Leerie\'s slate hangs on his first standard (within 1 m of its lamp\'s line)', props.slate && props.slateToHead0 != null && props.slateToHead0 < 1.0, props);
check('the keeper\'s peg stands at the Kept Fire, clear of the hearth and within 6 m of P6', props.peg && props.pegToHearth > 1.8 && props.pegToHearth < 4 && props.pegToP6 < 6, props);

// the Thurifer's bow to a gnomon: one registered 1.6 m off the track 6 m ahead of it; 20 s
const nod = await page.evaluate(() => {
  const T = __fp.walkers.thurifer, tr = T.track, at = { x: 0, z: 0, tx: 0, tz: 1 };
  const s0 = 60; T.place(s0, 1);
  tr.at(s0 + 6, at);
  const g = { x: at.x + at.tz * 1.6, z: at.z - at.tx * 1.6 };
  const before = T.state.nods;
  __fp.gnomons = [g];
  const modes = new Set(); let maxK = 0;
  for (let k = 0; k < 200; k++) { const st = T.sim(0.1); modes.add(st.mode); maxK = Math.max(maxK, st.bowK); }
  const after = T.state;
  delete __fp.gnomons;
  const none = (() => { T.place(s0, 1); const n0 = T.state.nods; T.sim(20); return T.state.nods - n0; })();
  return { nods: after.nods - before, modes: [...modes], maxK: +maxK.toFixed(2), mode: after.mode, moved: +(after.s - s0).toFixed(1), none };
});
check('the Thurifer bows to a gnomon it passes, once, and walks on', nod.nods === 1 && nod.maxK > 0.25 && nod.maxK < 0.6 && nod.modes.includes('nod') && nod.mode === 'walk' && nod.moved > 6, nod);
check('with no gnomon registered it never bows to one', nod.none === 0, nod);

check('no page errors', errors.length === 0, errors.slice(0, 3));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
