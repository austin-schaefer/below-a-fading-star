#!/usr/bin/env node
// v8-03 three hands (src/v8/strata.js, src/v8/strata/): the kit's parts build (every part of every hand adds clean
// geometry into a Builder); the sign is placed at least a dozen times and at least three times in each hand; the spolia at
// least ten times; every placement stands where it says it does (on the ground: its foot at or under the ground and not
// lost in it; on a wall: rays back from beside it, either side, meet the wall within 0.6 m; on top of something: a ray down meets
// its support within 0.4 m; across a gap: its deck within half a metre of the banks); every placement is in sight of a road
// (a lead, the causeway, the Plinth Road or the Span's deck: a sample within 60 m with a clear line over the terrain from
// eye height); the module's cost (two draw calls, under 60k triangles).
// Usage: node tools/strata-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const r = await page.evaluate(async () => {
  const fp = window.__fp, S = fp.strata, THREE = fp.THREE, out = {};
  // the ground as the terrain mesh draws it (what the structures stand on), not the analytic height under it
  const G = (await import('/src/structures/geo.js')).makeGround(fp), T = { heightAt: G.groundAt };
  if (!S) return { missing: true };
  // ---- the kit
  out.parts = [];
  for (const h of S.HANDS) for (const [name, fn] of Object.entries(S.parts[h])) {
    const B = S.builder();
    let err = null;
    try { fn(B, new THREE.Matrix4().makeTranslation(3, 2, -1), { rng: fp.makeRng(5) }); } catch (e) { err = String(e); }
    let nan = false; for (const v of B.P) if (!Number.isFinite(v)) { nan = true; break; }
    out.parts.push({ h, name, count: B.count, tris: B.I.length / 3, nan, err });
  }
  out.signs = S.HANDS.map((h) => S.placements.filter((p) => p.hand === h && p.kind === 'sign').length);
  out.spolia = S.placements.filter((p) => p.kind === 'spolia').length;
  // ---- standing
  const meshes = [];
  fp.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.visible && o.geometry?.attributes?.position && !o.isSkinnedMesh) meshes.push(o); });
  const rc = new THREE.Raycaster();
  const minG = G.minGround, maxG = G.maxGround;
  const cast = (o, d, far) => { rc.set(new THREE.Vector3(o[0], o[1], o[2]), new THREE.Vector3(d[0], d[1], d[2]).normalize()); rc.near = 0.003; rc.far = far; const h = rc.intersectObjects(meshes, false); return h.length ? h[0].distance : null; };
  // ---- the roads: leads (not runnels), the causeway, the Plinth Road, the Span's deck
  const roads = [];
  for (const l of fp.paths?.leads || []) if (l.kind !== 'rivulet') for (const line of l.lines) for (const s of line) roads.push([s[0], s[1], T.heightAt(s[0], s[1])]);
  const cw = fp.causeway;
  for (let i = 0; i < cw.length - 1; i++) { const a = cw[i], b = cw[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z); for (let s = 0; s < L; s += 2) { const x = a.x + (b.x - a.x) * s / L, z = a.z + (b.z - a.z) * s / L; roads.push([x, z, T.heightAt(x, z)]); } }
  const P0 = [130, -150], P1 = [165, -290];
  for (let s = 0; s <= 1.0001; s += 0.01) { const x = P0[0] + (P1[0] - P0[0]) * s, z = P0[1] + (P1[1] - P0[1]) * s; roads.push([x, z, T.heightAt(x, z)]); }
  const sp = fp.span?.plan;
  if (sp) for (const [a, b] of sp.decks) for (let x = a; x <= b; x += 3) roads.push([x, sp.z, sp.deckY]);
  out.roads = roads.length;
  const sight = (p) => {
    let best = null;
    for (const [rx, rz, ry] of roads) {
      const d = Math.hypot(rx - p.x, rz - p.z);
      if (d > 60 || (best && d >= best)) continue;
      const ey = ry + 1.6, n = Math.max(8, Math.ceil(d / 1.5)), py = p.kind === 'spolia' ? p.y + 0.6 : p.y; // a piece of spolia: its visible top, not its buried foot
      let clear = true;
      for (let k = 1; k < n * 0.92; k++) { const t = k / n, x = rx + (p.x - rx) * t, z = rz + (p.z - rz) * t, y = ey + (py - ey) * t; if (T.heightAt(x, z) > y - 0.15) { clear = false; break; } }
      if (clear) best = d;
    }
    return best;
  };
  out.placed = S.placements.map((p) => {
    const g = T.heightAt(p.x, p.z), m = p.mount || 'ground', o = { name: p.name, hand: p.hand, kind: p.kind, mount: m };
    if (m === 'ground') {
      const foot = p.foot ?? p.y, r = p.r ?? 0.5, lo = minG(p.x, p.z, r);
      o.ok = foot <= lo + 0.12 && foot >= g - 2.5 && p.y + (p.kind === 'sign' ? 0 : 0.3) > foot - 0.01;
      o.info = `foot ${(foot - lo).toFixed(2)} m from the lowest ground under it, ${(g - foot).toFixed(2)} m under its centre`;
    } else if (m === 'span') {
      const r = p.r ?? 1, hi = maxG(p.x, p.z, r);
      o.ok = Math.abs(p.y - hi) < 0.5; o.info = `deck ${(p.y - hi).toFixed(2)} m from the banks`;
    } else if (m === 'wall') {
      // beside it on both hands, in its own plane, a ray straight back meets the wall it hangs on (the sign's own
      // tablet is merged into the same mesh, so the ray starts clear of it)
      const k = (p.size ?? 1) / 2 + 0.12, lx = -p.face[1], lz = p.face[0];
      const ds = [1, -1].map((sg) => cast([p.x + lx * k * sg, p.y, p.z + lz * k * sg], [-p.face[0], 0, -p.face[1]], 1.0));
      o.ok = ds.every((d) => d != null && d < 0.6); o.info = `the wall ${ds.map((d) => (d == null ? 'not met' : d.toFixed(2) + ' m')).join(' and ')} behind, either side`;
    } else if (m === 'top') {
      const d = cast([p.x, p.foot + 0.05, p.z], [0, -1, 0], 0.6);
      o.ok = d != null && d < 0.4; o.info = `support ${d == null ? 'not met' : d.toFixed(2) + ' m'} under its foot`;
    }
    o.sight = sight(p);
    return o;
  });
  out.stats = S.stats?.();
  out.on = S.on;
  return out;
});
await browser.close();

let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
if (r.missing) { check(false, 'ctx.strata is installed'); process.exit(1); }
check(r.on, 'the strata are on by default');
const bad = r.parts.filter((p) => !p.count || p.nan || p.err);
check(r.parts.length >= 15 && !bad.length, `the kit's ${r.parts.length} parts build`, bad.length ? JSON.stringify(bad) : r.parts.map((p) => `${p.h}.${p.name} ${p.tris}`).join(', '));
const total = r.signs.reduce((a, b) => a + b, 0);
check(total >= 12 && r.signs.every((n) => n >= 3), 'the sign placed at least 12 times, at least 3 in each hand', `elder ${r.signs[0]}, heliarch ${r.signs[1]}, late ${r.signs[2]}`);
check(r.spolia >= 10, 'spolia placed at least 10 times', `${r.spolia}`);
const stand = r.placed.filter((p) => !p.ok);
for (const p of r.placed) console.log(`   ${p.ok ? 'ok ' : 'BAD'} ${p.hand.padEnd(8)} ${p.kind.padEnd(6)} ${p.mount.padEnd(6)} ${p.name}: ${p.info}; road ${p.sight == null ? 'none in sight' : p.sight.toFixed(0) + ' m'}`);
check(!stand.length, 'every placement stands where it says (ground, wall, top, span)', stand.map((p) => p.name).join('; '));
const blind = r.placed.filter((p) => p.sight == null);
check(r.roads > 500 && !blind.length, 'every placement in sight of a road within 60 m', blind.length ? blind.map((p) => p.name).join('; ') : `${r.roads} road samples`);
check(r.stats && r.stats.calls <= 2 && r.stats.tris < 60000, "the module's cost: 2 draw calls, under 60k triangles", JSON.stringify(r.stats));
check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
