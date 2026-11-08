#!/usr/bin/env node
// v4 Tinctures and set-dressing check: the air at a Saltings point has the rose-white hue and the tint at spawn is neutral,
// the tint keeps the fog's luminance; the Discontinued Track's footprints (count, ends, spacing, none on the causeway, all on
// the crust); the Surveyor's Pegs (count, spacing, the caps, none in deep water, all on x = -80); the Long Figure (80 m
// long on the ground, its centre on the wall's face, hugging the terrain); and the four items' draw calls and triangles;
// and v5's story set-dressing: the Collation (twelve places, twelve chairs one of them down, clear of every tree, level, collided),
// the Slipper (25 cm, on a slab, no collider) and the Unfinished Prospect (the canvas facing the painter, 512 x 384, under 200 KB).
// Usage: node tools/dressing-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
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
await page.goto(`${base}/?q=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const r = await page.evaluate(async () => {
  const fp = window.__fp, T = fp.terrain, out = {};
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  // the Tinctures
  const want = new fp.THREE.Color('#f4dede'), sal = fp.tinctures.at(185, 150), air = fp.regions.airAt(185, 150);
  out.saltAir = Math.max(Math.abs(air.color.r - want.r), Math.abs(air.color.g - want.g), Math.abs(air.color.b - want.b));
  out.saltK = sal.k; out.saltShift = [sal.shift.r, sal.shift.g, sal.shift.b];
  const spawn = fp.tinctures.at(fp.spawn.x, fp.spawn.z);
  out.spawnShift = [spawn.shift.r, spawn.shift.g, spawn.shift.b]; out.spawnStrength = spawn.strength;
  out.demesne = fp.tinctures.at(40, 85).k; out.strand = fp.tinctures.at(-66, 171).k;
  const f = new fp.THREE.Color('#4a3c52'), l0 = lum(f); fp.camera.position.set(185, 3, 150); fp.tinctures.apply(f); out.lumDrift = Math.abs(lum(f) / l0 - 1);
  out.enabled = fp.tinctures.enabled;
  // the track
  const tr = fp.dressing.track, P = tr.prints;
  out.track = { n: P.length, first: P[0], last: P[P.length - 1], minGap: Infinity, maxGap: 0, road: 0, offCrust: 0, under: 0 };
  for (let i = 1; i < P.length; i++) { const g = Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z); out.track.minGap = Math.min(out.track.minGap, g); out.track.maxGap = Math.max(out.track.maxGap, g); }
  for (const p of P) { if (T.causewayDistance(p.x, p.z) < 3 ) out.track.road++; if (fp.regions.regionAt(p.x, p.z, {}).saltings < 0.5) out.track.offCrust++; if (T.isUnderwater(p.x, p.z)) out.track.under++; }
  out.track.gaps = []; for (let i = 1; i < P.length; i++) { const g = Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z); if (g > 1.5) out.track.gaps.push([+P[i - 1].x.toFixed(1), +P[i].x.toFixed(1)]); }
  // the pegs
  const pg = fp.dressing.pegs, Q = pg.pegs;
  out.pegs = { n: Q.length, caps: pg.caps.map((c) => c.z), deep: 0, offLine: 0, minGap: Infinity, over: 0, wet: pg.wet };
  for (let i = 0; i < Q.length; i++) { const d = T.waterDepthAt(Q[i].x, Q[i].z) || 0; if (d > 0.7) out.pegs.deep++; if (Math.abs(Q[i].x + 80) > 0.1) out.pegs.offLine++; if (i && Q[i].z - Q[i - 1].z < 40) { const g = Q[i].z - Q[i - 1].z; out.pegs.minGap = Math.min(out.pegs.minGap, g); if (g > 10.5) out.pegs.over++; } }
  out.pegs.first = Q[0].z; out.pegs.last = Q[Q.length - 1].z;
  // the figure
  const fg = fp.dressing.figure, pos = fg.mesh.geometry.attributes.position.array, c = fg.centre;
  let maxLift = 0, minLift = 1e9;
  // against the rendered terrain triangles (rays from above), not the analytic heightfield the coarse mesh only approximates
  const ray = new fp.THREE.Raycaster(), dir = new fp.THREE.Vector3(0, -1, 0), org = new fp.THREE.Vector3(); fp.terrain.mesh.updateMatrixWorld();
  const nV = pos.length / 3, stepV = Math.floor(nV / 28);
  for (let v = 0; v < nV; v += stepV) { org.set(pos[v * 3], 700, pos[v * 3 + 2]); ray.set(org, dir); const hit = ray.intersectObject(fp.terrain.mesh, false)[0]; if (!hit) continue; const l = pos[v * 3 + 1] - hit.point.y; maxLift = Math.max(maxLift, l); minLift = Math.min(minLift, l); }
  // dy: the centre against the rendered triangles: the massifs' face carries relief finer than the mesh, so the analytic height can stand a few centimetres off it
  out.fig = { centre: c, slope: T.slopeAt(c.x, c.z) * 57.3, groundY: T.heightAt(c.x, c.z), dy: (() => { org.set(c.x, 700, c.z); ray.set(org, dir); const hit = ray.intersectObject(fp.terrain.mesh, false)[0]; return hit ? c.y - hit.point.y : NaN; })(), dyAnalytic: c.y - T.heightAt(c.x, c.z), r: Math.hypot(c.x, c.z), foot: fg.foot, head: fg.head, maxLift, minLift, castShadow: fg.mesh.castShadow };
  let arc = 0, last = null; const a = Math.atan2(70, 292); for (let r = fg.radii[0]; r <= fg.radii[1]; r += 0.5) { const x = Math.cos(a) * r, z = Math.sin(a) * r, h = T.heightAt(x, z); if (last !== null) arc += Math.hypot(0.5, h - last); last = h; }
  out.fig.arc = arc;
  out.stats = fp.dressing.stats();
  // v5: the Collation
  {
    const d = fp.dressing5, cy = d.collation, A = cy.axis, ca = Math.cos(A.angle), sa = Math.sin(A.angle), trees = window.__vegParts.trees.trees.filter((t) => !t.hidden);
    let minTree = Infinity, lo = Infinity, hi = -Infinity;
    for (const t of trees) { const dx = t.x - A.x, dz = t.z - A.z, u = dx * ca + dz * sa, v = -dx * sa + dz * ca; minTree = Math.min(minTree, Math.hypot(Math.max(Math.abs(u) - A.length / 2, 0), Math.max(Math.abs(v) - A.width / 2, 0))); }
    for (let u = -5.5; u <= 5.5; u += 0.5) { const h = T.heightAt(A.x + u * ca, A.z + u * sa); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    const near = fp.controls.state.colliders.filter((c) => Math.hypot(c.x - A.x, c.z - A.z) < 8).length, f = cy.chairs.filter((c) => c.fallen);
    out.cy = { places: cy.places, plates: cy.plates, medlars: cy.medlars, glasses: cy.glasses, chairs: cy.chairs.length, fallen: f.length, fallenLow: f[0] && f[0].rise < 1.1, minTree, level: hi - lo, off: Math.hypot(A.x - 150, A.z + 70), bletting: fp.regions.regionAt(A.x, A.z, {}).bletting, near, calls: cy.meshes.length, len: A.length, tris: cy.mesh.geometry.attributes.position.count / 3 };
    // the Slipper
    const sl = d.slipper.mesh, bb = new fp.THREE.Box3().setFromObject(sl), cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, pav = fp.scene.getObjectByName('structures-pavers');
    const ray = new fp.THREE.Raycaster(); ray.set(new fp.THREE.Vector3(cx, bb.max.y + 5, cz), new fp.THREE.Vector3(0, -1, 0)); const hit = ray.intersectObject(pav, false)[0];
    out.sl = { len: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), height: bb.max.y - bb.min.y, slab: hit ? bb.min.y - hit.point.y : null, off: Math.hypot(cx + 20, cz - 26), colliders: fp.controls.state.colliders.filter((c) => Math.hypot(c.x - cx, c.z - cz) < 1.5).length, fromSpawn: Math.hypot(cx - fp.spawn.x, cz - fp.spawn.z), lights: sl.children.length, emissive: sl.material.emissive.getHex(), tris: sl.geometry.index.count / 3 };
    // the Unfinished Prospect
    const pr = d.prospect, n = new fp.THREE.Vector3(0, 0, 1).transformDirection(pr.plane.matrixWorld), wc = new fp.THREE.Vector3().setFromMatrixPosition(pr.plane.matrixWorld), img = pr.map && pr.map.image;
    const toPainter = new fp.THREE.Vector3(Math.sin(1.74), 0, Math.cos(1.74));
    const size = await fetch(new URL('src/v5/dressing/prospect-canvas.png', location.href)).then((r) => r.blob()).then((b) => b.size).catch(() => -1);
    out.pr = { img: img ? [img.width, img.height] : null, size, facing: n.dot(toPainter), drop: n.y, off: Math.hypot(wc.x - 238, wc.z + 30), above: wc.y - T.heightAt(wc.x, wc.z), colliders: fp.controls.state.colliders.filter((c) => Math.hypot(c.x - 238, c.z + 30) < 1).length, region: fp.regions.regionAt(238, -30, {}).highLing, tris: pr.furniture.geometry.attributes.position.count / 3 + 2 };
    out.d5 = d.stats();
  }
  return out;
});
await browser.close();
let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
check(r.enabled, 'Tinctures enabled by default');
check(r.saltAir < 0.01, 'airAt in the Saltings is its rose-white', `err ${r.saltAir.toFixed(4)}`);
check(r.saltK > 0.1 && r.saltShift[0] > 1 && r.saltShift[1] < 1, 'the Saltings turn the haze toward rose', `shift ${r.saltShift.map((v) => v.toFixed(3))}`);
check(r.spawnStrength === 0 && r.spawnShift.every((v) => v === 1), 'the tint at spawn is neutral', `shift ${r.spawnShift}`);
check(r.demesne === 0 && r.strand === 0, 'the Demesne and the Strandline stay neutral', `${r.demesne} ${r.strand}`);
check(r.lumDrift < 0.002, 'the tint keeps the fog colour\'s luminance', `drift ${(100 * r.lumDrift).toFixed(3)} %`);
const t = r.track;
check(t.n >= 40 && t.n <= 60, 'the footprints are N', `N = ${t.n}`);
check(Math.abs(t.first.x - 170) < 1.2 && Math.abs(t.last.x - 215) < 1.2, 'the footprints end at the plan\'s x (170 to 215)', `${t.first.x.toFixed(1)} to ${t.last.x.toFixed(1)}`);
check(t.minGap > 0.6 && t.gaps.length === 1, 'evenly spaced, one gap where the causeway crosses', `gaps ${JSON.stringify(t.gaps)}, step ${t.minGap.toFixed(2)}`);
check(t.offCrust === 0 && t.under === 0 && t.road === 0, 'every print is on the crust, dry, off the causeway', `off ${t.offCrust} under ${t.under} road ${t.road}`);
const p = r.pegs;
check(p.n >= 45 && p.n <= 80, 'the pegs are counted', `${p.n} (${p.wet} standing in the tarn)`);
check(p.offLine === 0 && p.first === -285 && p.last === 285, 'dead straight along x = -80, wall to wall', `z ${p.first} to ${p.last}`);
check(p.deep === 0, 'none stands in deep water (over 0.7 m)');
check(p.minGap >= 5.5 && p.over <= 4, 'spaced 6 to 10 m (longer only across the tarn\'s deeps and the fallen slabs)', `shortest ${p.minGap.toFixed(1)}, ${p.over} longer`);
check(p.caps.length >= 4 && p.caps.every((z) => [-200, -100, 0, 100, 200].includes(z)), 'brass caps only at the five z values (the one in the tarn\'s deep is absent)', `caps at ${p.caps}`);
const f = r.fig;
check(Math.abs(f.arc - 80) < 4, 'the figure is 80 m long on the ground', `${f.arc.toFixed(1)} m`);
check(f.slope > 20 && Math.abs(f.dy) < 0.01 && f.r > 300 && f.r < 360, 'the figure\'s centre is on the wall face', `slope ${f.slope.toFixed(0)} deg, r ${f.r.toFixed(0)}, dy ${f.dy.toFixed(3)} (analytic ${f.dyAnalytic.toFixed(2)})`);
check(f.minLift > 0 && f.maxLift < 1.2 && !f.castShadow, 'it hugs the ground and casts no shadow', `lift ${f.minLift.toFixed(2)} to ${f.maxLift.toFixed(2)}`);
check(r.stats.calls <= 8 && r.stats.tris <= 60000, 'draw calls and triangles within the budget', `${r.stats.calls} calls, ${r.stats.tris} tris`);
const cy = r.cy, sl = r.sl, pr = r.pr;
check(cy.places === 12 && cy.plates === 12 && cy.medlars === 12 && cy.glasses === 12 && cy.chairs === 12 && cy.fallen === 1 && cy.fallenLow && cy.len >= 10 && cy.len <= 12 && cy.near >= 23 && cy.minTree >= 1 && cy.level < 0.3 && cy.bletting > 0.9 && cy.off < 15 && cy.calls === 1 && r.d5.calls <= 4 && r.d5.tris <= 12000, 'the Collation: an 11 m table laid for twelve, twelve chairs and one down, clear of every tree, level, collided; with the Slipper and the Prospect at most 4 draws and 12k triangles', `plates ${cy.plates} medlars ${cy.medlars} glasses ${cy.glasses} chairs ${cy.chairs} (${cy.fallen} down), ${cy.near} colliders, trees ${cy.minTree.toFixed(1)} m off, bletting ${cy.bletting.toFixed(2)}, fall ${cy.level.toFixed(2)} m, ${cy.off.toFixed(0)} m from the plan, ${Math.round(cy.tris)} tris; the three: ${r.d5.calls} calls, ${r.d5.tris} tris`);
check(sl.len > 0.2 && sl.len < 0.27 && sl.height < 0.1 && sl.slab !== null && Math.abs(sl.slab) < 0.06 && sl.off < 1 && sl.colliders === 0 && sl.lights === 0 && sl.emissive === 0 && sl.fromSpawn > 15 && sl.fromSpawn < 35, 'the Slipper: 25 cm, on a slab on the first walk, no collider, no light, no emissive', `${(sl.len * 100).toFixed(0)} cm long, ${(sl.height * 100).toFixed(0)} cm high, ${sl.slab === null ? 'no slab' : (sl.slab * 100).toFixed(1) + ' cm off the slab'}, ${sl.off.toFixed(2)} m from (-20, 26), ${sl.fromSpawn.toFixed(0)} m from spawn, ${Math.round(sl.tris)} tris`);
check(pr.img && pr.img[0] === 512 && pr.img[1] === 384 && pr.size > 0 && pr.size < 200000 && pr.facing > 0.95 && Math.abs(pr.drop) < 0.2 && pr.off < 4 && pr.above > 1 && pr.above < 2 && pr.colliders === 1 && pr.region > 0.9, 'the Unfinished Prospect: the baked canvas (512 x 384, under 200 KB) faces the painter at the brow, one collider', `canvas ${pr.img}, ${pr.size} bytes, facing ${pr.facing.toFixed(2)}, ${pr.off.toFixed(1)} m from the site, ${pr.above.toFixed(2)} m up, ${pr.colliders} collider`);
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
