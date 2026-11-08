#!/usr/bin/env node
// Tree LOD check: every LOD of a tree variant is meshed from the same skeleton and placed with the same matrix, so a tree
// keeps its silhouette as it swaps detail. For one placed tree of every variant (and the dead tree nearest the Lattice),
// in both batch paths, it switches the instance to each LOD, reads back the geometry and matrix the renderer draws, and
// finds the turn about the vertical that best aligns each LOD's area-weighted azimuth profile (world space, about
// the base) with the near one's, compares the direction of each LOD's lean (its height-weighted horizontal centroid),
// and checks every LOD is drawn with the same matrix. It also prints a placement digest (x, z, rot of every tree) so placement can be compared across changes.
// With the cross-fade on (not ?xfade=0) it checks one switch's fade (the spare, 0.4 s, gone after) and a wood walk's spares.
// Usage: node tools/tree-lod-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const TOL = 3, LEAN_TOL = 15; // degrees: the azimuth profile's best turn; the lean's direction (a far mesh without twigs shifts a sparse crown's centroid a little)
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
const digests = [];
for (const mode of ['instanced', 'batched']) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?q=low&only=vegetation&batch=${mode}&skip=audio&adapt=0`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
  const r = await page.evaluate(() => {
    const fp = window.__fp, THREE = fp.THREE, T = window.__vegParts.trees, b = T.batch, m = new THREE.Matrix4(), v = new THREE.Vector3();
    const inst = b.isInstancedBatch;
    // the vertices and matrix the renderer draws for instance id right now
    // area-weighted azimuth histogram (weight area x horizontal reach) of the drawn triangles, in world space about the base
    const NB = 360;
    const drawn = (id) => {
      let pos, idx, start = 0, count;
      if (inst) { const it = b.inst[id]; const mesh = b.meshes.get(`${it.geo}|${it.cell}`); mesh.getMatrixAt(it.slot, m); const g = b.geos[it.geo]; pos = g.attributes.position; idx = g.index.array; count = idx.length; }
      else { b.getMatrixAt(id, m); const gi = b._geometryInfo[b.getGeometryIdAt(id)]; pos = b.geometry.attributes.position; idx = b.geometry.index.array; start = gi.indexStart; count = gi.indexCount; }
      const o = new THREE.Vector3().setFromMatrixPosition(m), A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
      const hist = new Float64Array(NB);
      let lx = 0, lz = 0, lw = 0, reach = 0, rw = 0;
      for (let i = start; i < start + count; i += 3) {
        A.fromBufferAttribute(pos, idx[i]).applyMatrix4(m); B.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(m); C.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(m);
        const area = B.clone().sub(A).cross(C.clone().sub(A)).length() / 2;
        const x = (A.x + B.x + C.x) / 3 - o.x, z = (A.z + B.z + C.z) / 3 - o.z, r = Math.hypot(x, z);
        const y = (A.y + B.y + C.y) / 3 - o.y;
        if (y > 0) { lx += x * area * y; lz += z * area * y; lw += area * y; }
        reach += r * area; rw += area;
        if (r < 1e-3) continue;
        const bin = Math.floor(((Math.atan2(z, x) / (2 * Math.PI)) + 1) % 1 * NB) % NB;
        hist[bin] += area * r;
      }
      // smooth (sigma 8 degrees), circularly
      const smooth = (h) => { const sm = new Float64Array(NB), K = 24; for (let i = 0; i < NB; i++) for (let k = -K; k <= K; k++) sm[i] += h[(i + k + NB) % NB] * Math.exp(-(k * k) / (2 * 64)); return Array.from(sm); };
      // the lean: the height-weighted horizontal centroid of the area, against the mean reach
      return { hist: smooth(hist), m: Array.from(m.elements), lean: Math.atan2(lz, lx), leanLen: Math.hypot(lx, lz) / lw, reach: reach / rw };
    };
    const geoOf = (id) => inst ? b.inst[id].geo : b.getGeometryIdAt(id);
    const names = T.variantNames;
    const lat = fp.landmarks.moraine;
    const picks = [];
    const seen = new Set();
    for (const t of T.trees) if (!t.hidden && !seen.has(t.v)) { seen.add(t.v); picks.push(t); }
    if (lat) { let best = null, bd = Infinity; for (const t of T.trees) if (!t.hidden && names[t.v].startsWith('dead')) { const d = Math.hypot(t.x - lat.x, t.z - lat.z); if (d < bd) { bd = d; best = t; } } if (best) picks.push(best); }
    const out = [];
    for (const t of picks) {
      const g0 = geoOf(t.id), set = b.lodSets(g0), res = [];
      for (const g of set) { b.setGeometryIdAt(t.id, g); res.push(drawn(t.id)); }
      b.setGeometryIdAt(t.id, g0);
      out.push({ name: names[t.v], kind: t.kind, x: t.x, z: t.z, rot: t.rot, lods: res });
    }
    let h = 0; const fmt = (a) => a.toFixed(6);
    for (const t of T.trees) { const s = `${fmt(t.x)},${fmt(t.z)},${fmt(t.rot)},${t.v};`; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return { out, digest: h.toString(16), n: T.trees.length, first: T.trees.slice(0, 4).map((t) => [t.x.toFixed(3), t.z.toFixed(3), t.rot.toFixed(4)]), lat: lat && [lat.x, lat.z] };
  });
  // the cross-fade (v6-04): one switch fades in 0.4 s of world time and its spare hides after; a walk through the
  // wood at 3 m/s leaves no spare showing and none run out
  const fz = await page.evaluate(async () => {
    const fp = window.__fp, T = window.__vegParts.trees, b = T.batch, F = T.fade, p = fp.player;
    if (!F?.spares) return null;
    const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const shown = (id) => (b.isInstancedBatch ? b.inst[id].slot >= 0 : b.getVisibleAt(id));
    const spareShown = () => F.spareIds.filter(shown).length;
    const pose = (x, z) => { p.enabled = false; p.pos.x = x; p.pos.z = z; p.pos.y = fp.terrain.heightAt(x, z) + p.eye; };
    const geoOf = (id) => (b.isInstancedBatch ? b.inst[id].geo : b.getGeometryIdAt(id));
    const HI = fp.quality === 'low' ? 18 : 24;
    const t = T.trees.find((q) => !q.hidden && q.kind === 'wood');
    pose(t.x + HI + 8, t.z); await frames(60);
    const g0 = geoOf(t.id), idle = spareShown();
    pose(t.x + HI - 4, t.z);
    let t0 = null, mid = null;
    for (let k = 0; k < 600 && t0 === null; k++) { await frames(1); if (t.fade >= 0) t0 = fp.time.t; }
    await frames(3);
    if (t.fade >= 0) mid = { inFlight: F.inFlight, own: shown(F.spareIds[t.fade]), main: geoOf(t.id), spareGeo: geoOf(F.spareIds[t.fade]) };
    let t1 = null;
    for (let k = 0; k < 600 && t1 === null; k++) { await frames(1); if (t.fade < 0) t1 = fp.time.t; }
    await frames(30);
    const one = { t0, t1, secs: t1 - t0, dt: fp.time.dt, g0, mid, after: spareShown(), afterGeo: geoOf(t.id), idle };
    // a switch while it fades: start the near fade, then a frame later jump 200 m (it wants far: the fade ends and
    // the switch is hard), and separately step back out (the fade turns round and ends on the level it left)
    const set = b.lodSets(geoOf(t.id)), settle = async () => { for (let k = 0; k < 120 && F.inFlight; k++) await frames(1); await frames(5); };
    pose(t.x + HI + 8, t.z); await frames(60); await settle();
    pose(t.x + HI - 4, t.z); await frames(2);
    const jumpFading = t.fade >= 0;
    pose(t.x + 200, t.z); await frames(2); await settle();
    const jump = { fading: jumpFading, geo: geoOf(t.id), far: set[0], shown: spareShown(), inFlight: F.inFlight, fade: t.fade };
    pose(t.x + HI + 8, t.z); await frames(60); await settle();
    const gBack = geoOf(t.id);
    pose(t.x + HI - 4, t.z); await frames(2);
    const backFading = t.fade >= 0;
    pose(t.x + HI + 8, t.z); await frames(2); await settle();
    const back = { fading: backFading, geo: geoOf(t.id), want: gBack, shown: spareShown(), inFlight: F.inFlight, fade: t.fade };
    // the wood walk
    const rt = [[-68, 142], [-120, 136], [-170, 130], [-215, 128]];
    const segs = []; let L = 0; for (let i = 1; i < rt.length; i++) { const l = Math.hypot(rt[i][0] - rt[i - 1][0], rt[i][1] - rt[i - 1][1]); segs.push({ a: rt[i - 1], b: rt[i], L0: L, l }); L += l; }
    pose(rt[0][0], rt[0][1]); await frames(40);
    const st0 = F.starts, ov0 = F.overflow; F.peak = 0;
    let maxShown = 0;
    const w0 = fp.time.t;
    for (;;) {
      const s = Math.min(L, (fp.time.t - w0) * 3);
      let g = segs[segs.length - 1]; for (const q of segs) if (s <= q.L0 + q.l) { g = q; break; }
      const u = (s - g.L0) / g.l; pose(g.a[0] + (g.b[0] - g.a[0]) * u, g.a[1] + (g.b[1] - g.a[1]) * u);
      await frames(1);
      maxShown = Math.max(maxShown, spareShown());
      if (s >= L) break;
    }
    await frames(40);
    return { one, jump, back, walk: { starts: F.starts - st0, overflow: F.overflow - ov0, peak: F.peak, maxShown, inFlight: F.inFlight, shownAfter: spareShown(), spares: F.spares } };
  });
  await page.close();
  if (fz) {
    const o = fz.one, w = fz.walk;
    check(o.t0 !== null && o.mid && o.mid.own && o.mid.spareGeo === o.g0 && o.mid.main !== o.g0, `${mode}: a switch shows the old level as a spare while the new one fades in`, JSON.stringify(o.mid));
    check(o.t1 !== null && o.secs >= 0.4 - 1e-6 && o.secs <= 0.4 + 0.1 + 1e-6, `${mode}: the fade completes in 0.4 s of world time`, `${o.secs?.toFixed(3)} s (frames of up to 0.1 s)`);
    check(o.after === o.idle && o.afterGeo !== o.g0, `${mode}: the spare is gone after the fade`, `spares shown ${o.after}, before ${o.idle}`);
    const j = fz.jump, k = fz.back;
    check(!errors.length && j.fading && j.geo === j.far && j.shown === 0 && j.inFlight === 0 && j.fade === -1, `${mode}: a 200 m jump mid-fade ends far with no spare left`, JSON.stringify(j));
    check(!errors.length && k.fading && k.geo === k.want && k.shown === 0 && k.inFlight === 0 && k.fade === -1, `${mode}: stepping back mid-fade turns the fade round to the level it left`, JSON.stringify(k));
    check(w.inFlight === 0 && w.shownAfter === 0 && w.overflow === 0, `${mode}: no spare leaks or runs out over the wood walk`, `${w.starts} fades, at most ${w.peak} in flight of ${w.spares} spares, ${w.overflow} hard for want of one, ${w.shownAfter} shown after`);
  }
  console.log(`-- ${mode}: ${r.n} trees, placement digest ${r.digest}, first ${JSON.stringify(r.first)}`);
  digests.push(r.digest);
  check(!errors.length, `${mode}: no page errors`, errors.slice(0, 2).join(' | '));
  // the turn that best aligns a LOD's azimuth histogram with the near one's (circular cross-correlation), in degrees
  const turn = (a, b) => { let best = -Infinity, at = 0; const n = a.length; for (let s = 0; s < n; s++) { let c = 0; for (let i = 0; i < n; i++) c += a[i] * b[(i + s) % n]; if (c > best) { best = c; at = s; } } return at > n / 2 ? at - n : at; };
  for (const p of r.out) {
    const [far, lo, hi] = p.lods;
    const dm = Math.max(...[lo, far].flatMap((l) => l.m.map((e, i) => Math.abs(e - hi.m[i]))));
    const tl = turn(hi.hist, lo.hist), tf = turn(hi.hist, far.hist), worst = Math.max(Math.abs(tl), Math.abs(tf));
    // the profile's turn counts only where the near profile has a shape (not a round snag or mound); the lean only where
    // the near mesh clearly leans
    const mean = hi.hist.reduce((a, v) => a + v, 0) / hi.hist.length, shaped = (Math.max(...hi.hist) - Math.min(...hi.hist)) / mean >= 2.5;
    const leans = hi.leanLen >= 0.15 * hi.reach;
    const lean = (l) => Math.round(((((l.lean - hi.lean) * 180 / Math.PI) % 360) + 540) % 360 - 180);
    const bad = (l, t) => (shaped && Math.abs(t) >= TOL) || (leans && Math.abs(lean(l)) >= LEAN_TOL);
    const fmt = (nm, l, t) => `${nm}: turn ${shaped ? t + '°' : '-'} lean ${leans ? lean(l) + '°' : '-'}`;
    check(!bad(lo, tl) && !bad(far, tf) && dm < 1e-6, `${mode}: ${p.name} (${p.kind}) at ${p.x.toFixed(0)},${p.z.toFixed(0)} keeps its heading near to far`, `${fmt('lo', lo, tl)}  ${fmt('far', far, tf)}  matrix diff ${dm.toExponential(1)}`);
  }
}
await browser.close();
check(digests[0] === digests[1], 'placement identical in both batch paths', digests.join(' '));
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
