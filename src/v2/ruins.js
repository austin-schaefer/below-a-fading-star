// v2 ruins: N the Gradine, Q the Cutting, L the Hypogeum, Z the Carillon Flags. Names [Proposed].
// Follows the module contract in README.md. The sites live in src/v2/ruins/*.js; this file opens the
// ground over the Hypogeum first, synchronously and with no imports, so the cut exists before any
// other module samples the ground there.
//
// The Hypogeum is cut 4 m below the terrain. terrain.js is not ours, so:
//  - the terrain mesh's cells over the cut are made degenerate and the vertices inside are dropped
//    below the floor (vegetation reads the mesh, so nothing grows in mid-air over the hole);
//  - a patch of the same surface, with the same material and vertex data, re-covers those cells up
//    to the cut's rim exactly;
//  - the stair and floor inside the cut go to the controls through ctx.addWalkable(plan.floorAt).

export async function build(ctx) {
  const t0 = performance.now();
  const plan = planHypogeum(ctx);
  const opened = openGround(ctx, plan);
  if (window.__vegStats) ctx.log('ruins: vegetation built before the Hypogeum was opened; grass may hang over the cut');

  const [util, mats, hyp, grad, cut, car] = await Promise.all([
    import('./ruins/util.js'), import('../structures/materials.js'),
    import('./ruins/hypogeum.js'), import('./ruins/gradine.js'), import('./ruins/cutting.js'), import('./ruins/carillon.js'),
  ]);
  const env = { stone: mats.makeStoneMaterial(ctx), ground: util.meshGround(ctx), util, plan, opened, meshes: [] };
  const report = {};
  for (const [name, fn] of [['hypogeum', hyp.buildHypogeum], ['gradine', grad.buildGradine], ['cutting', cut.buildCutting], ['carillon', car.buildCarillon]]) {
    const ts = performance.now(), m0 = env.meshes.length;
    try { report[name] = fn(ctx, env) || {}; }
    catch (e) { console.error(`[fp] ruins: ${name} failed:`, e?.stack || e); continue; }
    let tris = 0;
    for (const m of env.meshes.slice(m0)) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * (m.count || 1);
    report[name].draws = env.meshes.length - m0; report[name].tris = Math.round(tris); report[name].ms = Math.round(performance.now() - ts);
  }
  for (const m of env.meshes) ctx.scene.add(m);
  const draws = env.meshes.length, tris = Object.values(report).reduce((a, r) => a + (r.tris || 0), 0);
  ctx.ruins = { report, draws, tris };
  ctx.log(`ruins: ${draws} draw calls, ${(tris / 1000).toFixed(1)}k tris, built in ${(performance.now() - t0).toFixed(0)}ms`,
    JSON.stringify(Object.fromEntries(Object.entries(report).map(([k, r]) => [k, { draws: r.draws, tris: r.tris, ms: r.ms }]))));
}

// The terrain mesh, sampled on its own triangles (vertex (ix, iz) at x = ix*step - half, z = iz*step - half;
// faces (a,b,d) and (b,c,d) with a=(ix,iz) b=(ix,iz+1) c=(ix+1,iz+1) d=(ix+1,iz)).
function meshInfo(ctx) {
  const geo = ctx.terrain.mesh.geometry;
  const segs = geo.parameters.widthSegments, size = geo.parameters.width;
  return { geo, segs, size, step: size / segs, half: size / 2, row: segs + 1 };
}
function meshHeight(M, P, x, z) {
  let gx = (x + M.half) / M.step, gz = (z + M.half) / M.step;
  gx = Math.min(Math.max(gx, 0), M.segs - 1e-4); gz = Math.min(Math.max(gz, 0), M.segs - 1e-4);
  const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, row = M.row;
  const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
  if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
  return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
}

// The cut: axis east-west, a stair descending eastward from the west end to a floor before the bronze
// door in the east wall. HW: clear half-width; WT: wall lining; D: tread run.
export function planHypogeum(ctx) {
  const L = ctx.landmarks.hypogeum;
  const M = meshInfo(ctx), P = M.geo.attributes.position.array;
  const g = (x, z) => meshHeight(M, P, x, z);
  const xc = L.x, zc = L.z, HW = 1.6, WT = 0.6, D = 0.38, FLOOR = 3.3, DEPTH = 4.0;
  let x0 = xc - 5, x1 = xc + 5, n = 16, Yf = 0, yTop = 0, Yr = 0;
  for (let it = 0; it < 4; it++) {
    let s = 0, c = 0;
    for (let x = x0; x <= x1 + WT; x += 0.5) for (const sd of [-1, 1]) { s += g(x, zc + sd * (HW + WT)); c++; }
    Yr = s / c; Yf = Yr - DEPTH;
    yTop = (g(x0 - 0.2, zc - HW) + g(x0 - 0.2, zc) + g(x0 - 0.2, zc + HW)) / 3;
    n = Math.max(8, Math.round((yTop - Yf) / 0.24));
    const len = n * D + FLOOR;
    x0 = xc - (len + WT) / 2; x1 = x0 + len;
  }
  const rise = (yTop - Yf) / n;
  const R = { x0, x1: x1 + WT, z0: zc - HW - WT, z1: zc + HW + WT };
  // floor height inside the clear interior (stair, then the floor), else null
  function floorAt(x, z) {
    if (x < x0 || x > x1 || z < zc - HW || z > zc + HW) return null;
    return Math.max(Yf, yTop - rise * (Math.floor((x - x0) / D) + 1));
  }
  return { xc, zc, HW, WT, D, n, rise, Yf, Yr, yTop, x0, x1, R, floorAt, depth: DEPTH };
}

function openGround(ctx, plan) {
  const T = ctx.terrain, THREE = ctx.THREE;
  const M = meshInfo(ctx), geo = M.geo;
  const pos = geo.attributes.position, P = pos.array;
  const R = plan.R, st = M.step, half = M.half, row = M.row;
  // every cell touching R grown by one cell is taken out, and every vertex strictly inside that is dropped,
  // so the mesh as other modules sample it lies under the floor everywhere inside R
  const E = { x0: R.x0 - st, x1: R.x1 + st, z0: R.z0 - st, z1: R.z1 + st };
  const ix0 = Math.floor((E.x0 + half) / st), ix1 = Math.ceil((E.x1 + half) / st) - 1;
  const iz0 = Math.floor((E.z0 + half) / st), iz1 = Math.ceil((E.z1 + half) / st) - 1;
  // snapshot of the original surface over the removed block (vertices ix0..ix1+1, iz0..iz1+1)
  const nx = ix1 - ix0 + 2, nz = iz1 - iz0 + 2;
  const attrs = ['position', 'normal', 'color', 'aIce', 'aWet'].filter((k) => geo.attributes[k]);
  const snap = {};
  for (const k of attrs) {
    const a = geo.attributes[k], is = a.itemSize, out = new Float32Array(nx * nz * is);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const v = (iz0 + j) * row + ix0 + i;
      for (let c = 0; c < is; c++) out[(j * nx + i) * is + c] = a.array[v * is + c];
    }
    snap[k] = { arr: out, is };
  }
  // sample the snapshot on the original triangle split
  const w = [0, 0, 0], vi = [0, 0, 0];
  function bary(x, z) {
    let gx = (x + half) / st - ix0, gz = (z + half) / st - iz0;
    gx = Math.min(Math.max(gx, 0), nx - 1 - 1e-5); gz = Math.min(Math.max(gz, 0), nz - 1 - 1e-5);
    const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j;
    const a = j * nx + i, b = (j + 1) * nx + i, c = (j + 1) * nx + i + 1, d = j * nx + i + 1;
    if (fx + fz <= 1) { vi[0] = a; vi[1] = d; vi[2] = b; w[0] = 1 - fx - fz; w[1] = fx; w[2] = fz; }
    else { vi[0] = c; vi[1] = b; vi[2] = d; w[0] = fx + fz - 1; w[1] = 1 - fx; w[2] = 1 - fz; }
  }
  const sample = (k, c) => { const s = snap[k]; return s.arr[vi[0] * s.is + c] * w[0] + s.arr[vi[1] * s.is + c] * w[1] + s.arr[vi[2] * s.is + c] * w[2]; };

  // degenerate the cells, drop the inner vertices
  const idx = geo.index.array;
  for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
    const o = (iz * M.segs + ix) * 6, a = idx[o];
    for (let k = 1; k < 6; k++) idx[o + k] = a;
  }
  const yDrop = plan.Yf - 0.8;
  for (let iz = iz0; iz <= iz1 + 1; iz++) for (let ix = ix0; ix <= ix1 + 1; ix++) {
    const x = ix * st - half, z = iz * st - half;
    if (x > E.x0 && x < E.x1 && z > E.z0 && z < E.z1) P[(iz * row + ix) * 3 + 1] = yDrop;
  }
  geo.index.needsUpdate = true; pos.needsUpdate = true;

  // the patch: the removed block minus R, on a grid that has R's edges as lines
  const bx0 = ix0 * st - half, bx1 = (ix1 + 1) * st - half, bz0 = iz0 * st - half, bz1 = (iz1 + 1) * st - half;
  const lines = (a, r0, r1, b) => {
    const out = [];
    const seg = (p, q) => { const n = Math.max(1, Math.ceil((q - p) / 0.55)); for (let k = 0; k < n; k++) out.push(p + (q - p) * k / n); };
    seg(a, r0); seg(r0, r1); seg(r1, b); out.push(b);
    return out;
  };
  const xs = lines(bx0, R.x0, R.x1, bx1), zs = lines(bz0, R.z0, R.z1, bz1);
  const NX = xs.length, NZ = zs.length;
  const out = {};
  for (const k of attrs) out[k] = new Float32Array(NX * NZ * snap[k].is);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = xs[i], z = zs[j], v = j * NX + i;
    bary(x, z);
    for (const k of attrs) {
      const is = snap[k].is;
      for (let c = 0; c < is; c++) out[k][v * is + c] = sample(k, c);
    }
    out.position[v * 3] = x; out.position[v * 3 + 2] = z;
  }
  const index = [];
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
    if (cx > R.x0 && cx < R.x1 && cz > R.z0 && cz < R.z1) continue;
    const a = j * NX + i, b = (j + 1) * NX + i, c = (j + 1) * NX + i + 1, d = j * NX + i + 1;
    index.push(a, b, d, b, c, d);
  }
  const pg = new THREE.BufferGeometry();
  for (const k of attrs) pg.setAttribute(k, new THREE.BufferAttribute(out[k], snap[k].is));
  pg.setIndex(index);
  pg.computeBoundingSphere();
  const patch = new THREE.Mesh(pg, ctx.terrain.mesh.material);
  patch.receiveShadow = true; patch.name = 'ruins-hypogeum-ground';
  ctx.scene.add(patch);

  // the floor inside the cut is offered to the controls as a walkable surface; nothing under ctx.terrain is touched
  ctx.addWalkable?.(plan.floorAt);
  // the ground as it was drawn before the opening (the patch's surface), for seating things round the rim
  const at = (x, z) => {
    if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return meshHeight(M, P, x, z);
    bary(x, z); return sample('position', 1);
  };
  return { patch, tris: index.length / 3, cells: (ix1 - ix0 + 1) * (iz1 - iz0 + 1), at };
}
