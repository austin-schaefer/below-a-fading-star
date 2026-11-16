#!/usr/bin/env node
// Where the ground under the walker disagrees with what is drawn (v15-W5, the owner's "strange terrain transitions that
// cause the walker to hang, and sort of teleport up and down a bit as it walks", in a grassy dip by the Pomegranate
// House's gate). One page at q=medium (SEAMS_Q=low for low: its 3.1 m terrain cells miss the moor's own relief by
// 0.2 m, so `off` there is mostly the mesh's grain) with every module built; the village's footprint and a 30 m skirt (x 10..160,
// z -105..70) are stepped on a 0.25 m grid with ctx.controls.floorAt (the floor a walker on the ground finds there:
// the ground, a stacked floor within a riser, a collider's top within a step), against the drawn surfaces: the terrain
// mesh's own triangles and every visible mesh in the box but plants, creatures and the far hills (instanced too),
// indexed by the metre. A cell no walker can reach (inside a collider at the feet's height, with the body's half-width)
// is skipped. Three kinds of finding, each clustered by the metre:
//   seam   two neighbouring cells whose floors differ by more than a step (0.12 m, the controls' STEP_UP) where the
//          drawn surface does not make the same step (within 0.12 m) and no collider stands within 0.5 m (a kerb, a
//          wall): the feet jump where the eye sees none, or none where it sees one
//   off    a floor more than 0.15 m from the drawn surface nearest it (above or below): the feet float or sink
//   ghost  a collider in the box with nothing drawn within 0.3 m of half or more of its outline (sampled every 0.5 m
//          at 0.3 and 1 m over its foot), or a held edge of a stacked floor (`keep`) with nothing drawn within 0.3 m
//          of the walker's body stopped at it (0.75 m of the edge): the walker stopped by something unseen
// Prints the counts and the worst places (with the floor and the plot or way nearest), then the rows:
//   PASS/FAIL swept       cells swept and triangles indexed (zero is a failure)
//   PASS/FAIL owner-dip   no seam or off in the owner's dip (x 103..122, z -70..-52; the Medlar terraces' steps)
//   PASS/FAIL ceiling     each kind's cluster count at or under tools/seams-baseline.json (SEAMS_RECORD=1 rewrites it:
//                         a ratchet, as geometry-test's; say in the commit why it grew if it ever does)
// SEAMS_JSON=path writes every cluster; SEAMS_PROBE=x,y,z[;x,y,z] prints the floor there and what is drawn within a metre (by
// mesh name), to read a finding by; SEAMS_TOP=n lists n of each kind. About two minutes.
//   node tools/seams-test.mjs [base=http://localhost:8123]
import fs from 'node:fs';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const BASELINE = new URL('./seams-baseline.json', import.meta.url), Q = process.env.SEAMS_Q || 'medium';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${Q}&music=0&pos=112,-62`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
if (process.env.SEAMS_PROBE) await page.evaluate((p) => { window.__seamsProbe = p.split(';').map((q) => q.split(',').map(Number)); }, process.env.SEAMS_PROBE);
const r = await page.evaluate(async () => {
  const fp = window.__fp, THREE = fp.THREE, C = fp.controls, cols = C.state.colliders, P = await import('/src/v15/plan.js');
  const { meshGround } = await import('/src/v4/regions/skin.js');
  const X0 = 10, X1 = 160, Z0 = -105, Z1 = 70, H = 0.25, STEP = 0.12, BODY = 0.45, OFF = 0.15, NEAR = 0.3;
  const ground = meshGround(fp.terrain);
  // ---- the drawn surfaces, binned by the metre
  const SKIP = /^far:|veg-|grass|horsetail|reed|nettle|thistle|gorse|toadstool|glasswort|rosette|heather|beetle|peafowl|people|folk|eyes|snail|moth|lure|bird|fly|flies|ranges|sky|cloud|water|mote|smoke|spark|ember|cushion|clitter|pellet|lamp-glow|halo/i;
  fp.scene.updateMatrixWorld(true);
  const NBX = X1 - X0, NBZ = Z1 - Z0, bins = new Array(NBX * NBZ);
  const tri = [], triMesh = [], meshNames = []; // tri: x0 y0 z0 x1 y1 z1 x2 y2 z2 ny (10 a triangle); triMesh: its mesh's index in meshNames
  const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), M = new THREE.Matrix4(), IM = new THREE.Matrix4(), bb = new THREE.Box3();
  const BOX = new THREE.Box3(new THREE.Vector3(X0, -60, Z0), new THREE.Vector3(X1, 90, Z1));
  let meshes = 0;
  const addTris = (g, Mw) => {
    const pos = g.attributes.position, idx = g.index, n = idx ? idx.count : pos.count;
    for (let k = 0; k + 2 < n; k += 3) {
      const a = idx ? idx.getX(k) : k, b = idx ? idx.getX(k + 1) : k + 1, c = idx ? idx.getX(k + 2) : k + 2;
      va.fromBufferAttribute(pos, a).applyMatrix4(Mw); vb.fromBufferAttribute(pos, b).applyMatrix4(Mw); vc.fromBufferAttribute(pos, c).applyMatrix4(Mw);
      const x0 = Math.min(va.x, vb.x, vc.x), x1 = Math.max(va.x, vb.x, vc.x), z0 = Math.min(va.z, vb.z, vc.z), z1 = Math.max(va.z, vb.z, vc.z);
      if (x1 < X0 || x0 > X1 || z1 < Z0 || z0 > Z1) continue;
      const ux = vb.x - va.x, uy = vb.y - va.y, uz = vb.z - va.z, wx = vc.x - va.x, wy = vc.y - va.y, wz = vc.z - va.z;
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-9) continue;
      const id = tri.length / 10;
      tri.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z, Math.abs(ny / nl)); triMesh.push(meshNames.length - 1);
      for (let bz = Math.max(0, Math.floor(z0 - Z0)); bz <= Math.min(NBZ - 1, Math.floor(z1 - Z0)); bz++) for (let bx = Math.max(0, Math.floor(x0 - X0)); bx <= Math.min(NBX - 1, Math.floor(x1 - X0)); bx++) (bins[bz * NBX + bx] ||= []).push(id);
    }
  };
  fp.scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position || o === fp.terrain.mesh || SKIP.test(o.name || '') || SKIP.test(o.parent?.name || '') || !shown(o)) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    meshNames.push(o.name || o.parent?.name || '?');
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, IM); M.multiplyMatrices(o.matrixWorld, IM); bb.copy(g.boundingBox).applyMatrix4(M); if (bb.intersectsBox(BOX)) addTris(g, M); }
      meshes++; return;
    }
    bb.copy(g.boundingBox).applyMatrix4(o.matrixWorld); if (!bb.intersectsBox(BOX)) return;
    addTris(g, o.matrixWorld); meshes++;
  });
  // the drawn surface at (x, z) nearest the height y: the terrain's triangles, or a face of a drawn thing lying flatter than 1 in 1
  const drawnAt = (x, z, y) => {
    let best = ground(x, z), bd = Math.abs(best - y);
    const bx = Math.floor(x - X0), bz = Math.floor(z - Z0), L = bx >= 0 && bx < NBX && bz >= 0 && bz < NBZ ? bins[bz * NBX + bx] : null;
    if (L) for (const id of L) {
      const o = id * 10; if (tri[o + 9] < 0.7) continue;
      const ax = tri[o], ay = tri[o + 1], az = tri[o + 2], ex = tri[o + 3] - ax, ey = tri[o + 4] - ay, ez = tri[o + 5] - az, fx = tri[o + 6] - ax, fy = tri[o + 7] - ay, fz = tri[o + 8] - az;
      const det = ex * fz - ez * fx; if (Math.abs(det) < 1e-9) continue;
      const px = x - ax, pz = z - az, u = (px * fz - pz * fx) / det, v = (ex * pz - ez * px) / det;
      if (u < -1e-4 || v < -1e-4 || u + v > 1.0001) continue;
      const h = ay + ey * u + fy * v, d = Math.abs(h - y);
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  };
  // the distance from p to the nearest drawn face (any lie), up to lim (Infinity if none within it)
  const cp = (o, px, py, pz) => { // closest point on triangle o to p: squared distance (Ericson)
    const ax = tri[o], ay = tri[o + 1], az = tri[o + 2], bx = tri[o + 3], by = tri[o + 4], bz = tri[o + 5], cx = tri[o + 6], cy = tri[o + 7], cz = tri[o + 8];
    const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = px - ax, apy = py - ay, apz = pz - az;
    const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
    const q = (x, y, z) => (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
    if (d1 <= 0 && d2 <= 0) return q(ax, ay, az);
    const bpx = px - bx, bpy = py - by, bpz = pz - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) return q(bx, by, bz);
    const vc_ = d1 * d4 - d3 * d2; if (vc_ <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return q(ax + abx * v, ay + aby * v, az + abz * v); }
    const cpx = px - cx, cpy = py - cy, cpz = pz - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
    if (d6 >= 0 && d5 <= d6) return q(cx, cy, cz);
    const vb_ = d5 * d2 - d1 * d6; if (vb_ <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return q(ax + acx * w, ay + acy * w, az + acz * w); }
    const va_ = d3 * d6 - d5 * d4; if (va_ <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return q(bx + (cx - bx) * w, by + (cy - by) * w, bz + (cz - bz) * w); }
    const den = 1 / (va_ + vb_ + vc_), v = vb_ * den, w = vc_ * den;
    return q(ax + abx * v + acx * w, ay + aby * v + acy * w, az + abz * v + acz * w);
  };
  const drawnNear = (x, y, z, lim) => {
    const l2 = lim * lim;
    for (let bz = Math.floor(z - lim - Z0); bz <= Math.floor(z + lim - Z0); bz++) for (let bx = Math.floor(x - lim - X0); bx <= Math.floor(x + lim - X0); bx++) {
      if (bx < 0 || bx >= NBX || bz < 0 || bz >= NBZ) continue;
      const L = bins[bz * NBX + bx]; if (L) for (const id of L) if (cp(id * 10, x, y, z) <= l2) return true;
    }
    return false;
  };
  // ---- the colliders a walker meets (the controls' shapes: a post { x, z, r } or a capsule { x1, z1, x2, z2, r })
  const CB = 2, cb = new Map(), colIn = [];
  for (const c of cols) {
    const cx = c.len === undefined ? c.x : (c.x1 + c.x2) / 2, cz = c.len === undefined ? c.z : (c.z1 + c.z2) / 2, ext = (c.len === undefined ? c.r : c.len / 2 + c.r);
    if (cx + ext < X0 || cx - ext > X1 || cz + ext < Z0 || cz - ext > Z1) continue;
    colIn.push(c);
    for (let gz = Math.floor((cz - ext - 1) / CB); gz <= Math.floor((cz + ext + 1) / CB); gz++) for (let gx = Math.floor((cx - ext - 1) / CB); gx <= Math.floor((cx + ext + 1) / CB); gx++) { const k = gx + ',' + gz; if (!cb.has(k)) cb.set(k, []); cb.get(k).push(c); }
  }
  const segD = (c, x, z) => { if (c.len === undefined) return Math.hypot(x - c.x, z - c.z); let t = (x - c.x1) * c.ux + (z - c.z1) * c.uz; t = Math.max(0, Math.min(c.len, t)); return Math.hypot(x - c.x1 - c.ux * t, z - c.z1 - c.uz * t); };
  const atFeet = (c, feet) => c.h === undefined || (feet >= c.y - 0.5 && feet < c.y + c.h - STEP);
  const colNear = (x, z, feet, pad) => { const L = cb.get(Math.floor(x / CB) + ',' + Math.floor(z / CB)); if (L) for (const c of L) if (atFeet(c, feet) && segD(c, x, z) < c.r + pad) return c; return null; };
  // ---- the grid
  const NX = Math.round((X1 - X0) / H) + 1, NZ = Math.round((Z1 - Z0) / H) + 1, N = NX * NZ;
  const F = new Float32Array(N), D = new Float32Array(N), K = new Int32Array(N), OK = new Uint8Array(N);
  const stacks = new Map(), stackNames = ['ground', 'top'], stackRef = [null, null];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = X0 + i * H, z = Z0 + j * H, k = j * NX + i;
    const g0 = C.floorAt(x, z, -1e4).ground, f = C.floorAt(x, z, g0 + 0.05);
    F[k] = f.y;
    if (f.stack) { if (!stacks.has(f.stack)) { stacks.set(f.stack, stackNames.length); stackNames.push(f.stack.name || 'stack'); stackRef.push(f.stack); } K[k] = stacks.get(f.stack); } else K[k] = f.top ? 1 : 0;
    if (colNear(x, z, f.y, BODY)) continue; // no walker's middle comes here
    OK[k] = 1; D[k] = drawnAt(x, z, f.y);
  }
  // ---- where a walker can get to: flooded from the skirt's edge (the open moor), a cell to its neighbour when the
  // neighbour is not more than a metre over it (down, any drop: a walker may go over a lip), so a house's shut rooms
  // and the tops of walls are not swept
  const REACH = new Uint8Array(N), queue = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) if ((i === 0 || j === 0 || i === NX - 1 || j === NZ - 1) && OK[j * NX + i]) { REACH[j * NX + i] = 1; queue[qt++] = j * NX + i; }
  while (qh < qt) {
    const k = queue[qh++], i = k % NX, j = (k / NX) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue;
      const n = jj * NX + ii; if (REACH[n] || !OK[n] || F[n] - F[k] > 1) continue;
      REACH[n] = 1; queue[qt++] = n;
    }
  }
  for (let k = 0; k < N; k++) if (!REACH[k]) OK[k] = 0;
  // ---- findings, clustered by the metre: key -> { kind, x, z, mag, floor }
  const clusters = new Map();
  const find = (kind, x, z, mag, floor, extra = '') => { const key = `${kind}:${Math.floor(x)},${Math.floor(z)}`; const o = clusters.get(key); if (!o || Math.abs(mag) > Math.abs(o.mag)) clusters.set(key, { kind, x: +x.toFixed(2), z: +z.toFixed(2), mag: +mag.toFixed(2), floor, extra }); };
  let cells = 0;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i; if (!OK[k]) continue; cells++;
    const x = X0 + i * H, z = Z0 + j * H;
    if (Math.abs(F[k] - D[k]) > OFF) find('off', x, z, F[k] - D[k], stackNames[K[k]], `feet ${F[k].toFixed(2)} drawn ${D[k].toFixed(2)}`);
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      if (i + di >= NX || j + dj >= NZ) continue;
      const n = (j + dj) * NX + i + di; if (!OK[n]) continue;
      const dF = F[n] - F[k]; if (Math.abs(dF) <= STEP) continue;
      // the drawn step between them, read at each one's floor
      const dD = drawnAt(X0 + (i + di) * H, Z0 + (j + dj) * H, F[n]) - drawnAt(x, z, F[k]);
      if (Math.abs(dF - dD) <= Math.max(STEP, Math.abs(dF) * 0.25)) continue; // (at a drawn riser the two may differ by its batter)
      const mx = x + di * H / 2, mz = z + dj * H / 2;
      if (colNear(mx, mz, Math.min(F[k], F[n]), 0.5)) continue;
      find('seam', mx, mz, dF, `${stackNames[K[k]]}>${stackNames[K[n]]}`, `feet ${F[k].toFixed(2)} -> ${F[n].toFixed(2)}, drawn ${dD > 0 ? '+' : ''}${dD.toFixed(2)}`);
    }
  }
  // held edges: a cell on a keep floor, its neighbour off it beyond a riser, nothing drawn within NEAR of the edge
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, s = stackRef[K[k]]; if (!s || !s.keep) continue;
    const x = X0 + i * H, z = Z0 + j * H;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xn = x + di * H, zn = z + dj * H, m = C.floorAt(xn, zn, F[k]);
      if (m.stack === s || (m.y >= F[k] - 0.6 && m.y <= F[k] + 0.6) || (s.keep !== true && !s.keep(xn, zn))) continue;
      const mx = x + di * H / 2, mz = z + dj * H / 2, rise = m.y > F[k];
      const lim = NEAR + BODY; // (the walker's middle stops at the edge: its body is already half a width past it)
      const seen = rise ? ground(mx, mz) > F[k] + 0.3 || drawnNear(mx, F[k] + 0.6, mz, lim) : drawnNear(mx, F[k] + 0.05, mz, lim) || drawnNear(mx, F[k] + 0.6, mz, lim);
      if (!seen) find('ghost', mx, mz, m.y - F[k], `${s.name || 'stack'} held edge`);
    }
  }
  // colliders: half or more of the outline with nothing drawn within NEAR
  let nCol = 0;
  for (const c of colIn) {
    if (c.r < 0.05) continue;
    nCol++;
    const pts = [];
    if (c.len === undefined) { const n = Math.max(6, Math.ceil((2 * Math.PI * c.r) / 0.5)); for (let q = 0; q < n; q++) { const a = (q / n) * Math.PI * 2; pts.push([c.x + Math.cos(a) * c.r, c.z + Math.sin(a) * c.r]); } }
    else { const n = Math.max(2, Math.ceil(c.len / 0.5)); for (let q = 0; q <= n; q++) { const t = (q / n) * c.len, px = c.x1 + c.ux * t, pz = c.z1 + c.uz * t; pts.push([px - c.uz * c.r, pz + c.ux * c.r], [px + c.uz * c.r, pz - c.ux * c.r]); } }
    let bare = 0;
    for (const [px, pz] of pts) {
      const foot = c.y ?? ground(px, pz), top = c.h === undefined ? foot + 2 : c.y + c.h;
      const ys = [foot + 0.3, Math.min(top, foot + 1)];
      if (!ys.some((y) => drawnNear(px, y, pz, NEAR))) bare++;
    }
    if (bare >= pts.length / 2) { const cx = c.len === undefined ? c.x : (c.x1 + c.x2) / 2, cz = c.len === undefined ? c.z : (c.z1 + c.z2) / 2; find('ghost', cx, cz, bare / pts.length, `collider r ${c.r.toFixed(2)}${c.len !== undefined ? ` len ${c.len.toFixed(2)}` : ''}${c.name ? ' ' + c.name : ''}`); }
  }
  // SEAMS_PROBE=x,y,z: what is drawn within a metre of a point (to read a finding by)
  const probe = [];
  for (const [px, py, pz] of window.__seamsProbe || []) {
    const seen = new Map();
    for (let bz = Math.floor(pz - 1 - Z0); bz <= Math.floor(pz + 1 - Z0); bz++) for (let bx = Math.floor(px - 1 - X0); bx <= Math.floor(px + 1 - X0); bx++) {
      const L = bx >= 0 && bx < NBX && bz >= 0 && bz < NBZ ? bins[bz * NBX + bx] : null;
      if (L) for (const id of L) { const d = Math.sqrt(cp(id * 10, px, py, pz)), nm = meshNames[triMesh[id]]; if (d < 1 && (!seen.has(nm) || seen.get(nm) > d)) seen.set(nm, +d.toFixed(2)); }
    }
    const fl = C.floorAt(px, pz, py);
    probe.push({ at: [px, py, pz], floor: { y: fl.y, ground: fl.ground, stack: fl.stack?.name || null, top: fl.top }, terrainMesh: ground(px, pz), drawnAt: drawnAt(px, pz, fl.y), near: [...seen.entries()].sort((a, b) => a[1] - b[1]) });
  }
  // the nearest plot or way, for the reader
  const ways = fp.ascents.list.filter((a) => !a.test);
  const near = (x, z) => {
    let best = '', bd = 8;
    for (const p of P.PLOTS) { const d = Math.hypot(p.x - x, p.z - z) - Math.max(p.w, p.d) / 2; if (d < bd) { bd = d; best = p.name; } }
    for (const w of ways) for (const q of w.path) { const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; best = `way ${w.id}`; } }
    return best;
  };
  const list = [...clusters.values()].map((o) => ({ ...o, near: near(o.x, o.z) }));
  return { cells, tris: tri.length / 10, meshes, colliders: nCol, list, probe };
});
await browser.close();
for (const q of r.probe) console.log(`probe ${JSON.stringify(q)}`);
if (r.missing) { console.log(`FAIL swept: ${r.missing}`); process.exit(1); }
const kinds = ['seam', 'off', 'ghost'], by = Object.fromEntries(kinds.map((k) => [k, r.list.filter((o) => o.kind === k)]));
console.log(`swept ${r.cells} cells, ${r.tris} triangles from ${r.meshes} meshes, ${r.colliders} colliders`);
for (const k of kinds) {
  const L = by[k].sort((a, b) => Math.abs(b.mag) - Math.abs(a.mag));
  console.log(`${k}: ${L.length} clusters`);
  for (const o of L.slice(0, +(process.env.SEAMS_TOP || 15))) console.log(`  (${o.x}, ${o.z}) ${o.mag > 0 ? '+' : ''}${o.mag} on ${o.floor}${o.extra ? ` (${o.extra})` : ''}${o.near ? ` by ${o.near}` : ''}`);
}
if (process.env.SEAMS_JSON) fs.writeFileSync(process.env.SEAMS_JSON, JSON.stringify(r.list, null, 1));
let fail = 0;
const row = (ok, name, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${msg}`); if (!ok) fail++; };
row(r.cells > 100000 && r.tris > 1000, 'swept', `${r.cells} cells, ${r.tris} triangles`);
const dip = r.list.filter((o) => o.kind !== 'ghost' && o.x > 103 && o.x < 122 && o.z > -70 && o.z < -52);
row(dip.length === 0, 'owner-dip', dip.length ? `${dip.length} clusters, the worst (${dip[0].x}, ${dip[0].z}) ${dip[0].mag} on ${dip[0].floor}` : 'the ground under the feet is the ground drawn');
const counts = Object.fromEntries(kinds.map((k) => [k, by[k].length]));
if (process.env.SEAMS_RECORD === '1') { fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 1) + '\n'); console.log(`recorded ${JSON.stringify(counts)}`); }
const was = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;
row(!!was && kinds.every((k) => counts[k] <= was[k]), 'ceiling', `${JSON.stringify(counts)} against ${was ? JSON.stringify(was) : 'no baseline'}`);
if (errors.length) console.log(`page errors: ${errors.slice(0, 3).join(' | ')}`);
process.exit(fail ? 1 : 0);
