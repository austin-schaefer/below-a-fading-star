// Ground sampling for placement. Heights and normals come from the rendered terrain mesh itself,
// interpolated over the same triangles the GPU draws, so nothing floats or sinks. Biome weights
// come from a coarse grid of terrain.biomeAt() (it is too slow to call per blade of grass).
import { clamp } from './util.js';

// Open ground other modules need: the man in the cloak of eyes (fauna/uncanny/cloak.js, first candidate spot)
// stands alone on the moor, so no tree may grow on him. [x, z, radius]
const CLEARINGS = [[-86, -48, 7]];

const BIOME_KEYS = ['moor', 'heath', 'wood', 'marsh', 'shore', 'rock', 'ice', 'orchard', 'crystal', 'glacier'];

export function makeGround(ctx) {
  const { terrain, landmarks: L, water } = ctx;
  const geo = terrain.mesh.geometry;
  const prm = geo.parameters;
  const segs = prm.widthSegments, size = prm.width;
  const step = size / segs, half = size / 2, row = segs + 1;
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;

  // Height on the rendered triangle. PlaneGeometry (rotated -90° about x) puts vertex (ix, iz) at
  // x = ix*step - half, z = iz*step - half, faces (a,b,d) and (b,c,d) with a=(ix,iz) b=(ix,iz+1) c=(ix+1,iz+1) d=(ix+1,iz).
  function heightAt(x, z) {
    const gx = clamp((x + half) / step, 0, segs - 1e-4), gz = clamp((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
    if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
    return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
  }
  // Bilinear vertex normal; writes into out (any {x,y,z}).
  function normalAt(x, z, out) {
    const gx = clamp((x + half) / step, 0, segs - 1e-4), gz = clamp((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const i00 = (iz * row + ix) * 3, i10 = i00 + 3, i01 = i00 + row * 3, i11 = i01 + 3;
    const w00 = (1 - fx) * (1 - fz), w10 = fx * (1 - fz), w01 = (1 - fx) * fz, w11 = fx * fz;
    let nx = N[i00] * w00 + N[i10] * w10 + N[i01] * w01 + N[i11] * w11;
    let ny = N[i00 + 1] * w00 + N[i10 + 1] * w10 + N[i01 + 1] * w01 + N[i11 + 1] * w11;
    let nz = N[i00 + 2] * w00 + N[i10 + 2] * w10 + N[i01 + 2] * w01 + N[i11 + 2] * w11;
    const l = Math.hypot(nx, ny, nz) || 1;
    out.x = nx / l; out.y = ny / l; out.z = nz / l;
    return out;
  }
  const _n = { x: 0, y: 1, z: 0 };
  const slopeAt = (x, z) => Math.acos(clamp(normalAt(x, z, _n).y, -1, 1));

  // Coarse biome grid over the walkable region.
  const BG = 4, BMIN = -324, BN = Math.ceil(648 / BG) + 1;
  const grid = {};
  for (const k of BIOME_KEYS) grid[k] = new Float32Array(BN * BN);
  for (let j = 0; j < BN; j++) for (let i = 0; i < BN; i++) {
    const x = BMIN + i * BG, z = BMIN + j * BG, k = j * BN + i;
    if (Math.hypot(x, z) > 335) { grid.rock[k] = 1; continue; }
    const b = terrain.biomeAt(x, z);
    grid.moor[k] = b.moor; grid.heath[k] = b.heath; grid.wood[k] = b.wood; grid.marsh[k] = b.marsh;
    grid.shore[k] = b.shore; grid.rock[k] = b.rock; grid.ice[k] = b.ice; grid.orchard[k] = b.orchard;
    grid.crystal[k] = b.crystal; grid.glacier[k] = terrain.glacierMask(x, z);
  }
  // Bilinear biome lookup into a reusable object.
  const biome = {}; for (const k of BIOME_KEYS) biome[k] = 0;
  function biomeAt(x, z, out = biome) {
    const gx = clamp((x - BMIN) / BG, 0, BN - 1.001), gz = clamp((z - BMIN) / BG, 0, BN - 1.001);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const k00 = iz * BN + ix, k10 = k00 + 1, k01 = k00 + BN, k11 = k01 + 1;
    const w00 = (1 - fx) * (1 - fz), w10 = fx * (1 - fz), w01 = (1 - fx) * fz, w11 = fx * fz;
    for (const k of BIOME_KEYS) { const g = grid[k]; out[k] = g[k00] * w00 + g[k10] * w10 + g[k01] * w01 + g[k11] * w11; }
    return out;
  }

  const waters = Object.values(water);
  // The river and the ravine above the fall are paths with a width, not discs: terrain.waterLevelAt knows them.
  const riverLevel = (x, z) => terrain.waterLevelAt(x, z);
  function waterDepth(x, z, y = heightAt(x, z)) {
    for (const w of waters) if ((x - w.x) ** 2 + (z - w.z) ** 2 < w.r * w.r) return w.y - y;
    const rl = riverLevel(x, z);
    return rl === null ? -Infinity : rl - y;
  }
  // Nearest water body within `extra` metres of its rim: depth (water level - ground) and how far inside the rim.
  const _wn = { dep: 0, rim: 0 };
  function waterNear(x, z, y, extra = 10) {
    for (const w of waters) {
      const d = Math.hypot(x - w.x, z - w.z);
      if (d < w.r + extra) { _wn.dep = w.y - y; _wn.rim = w.r - d; return _wn; }
    }
    const r = terrain.riverAt ? terrain.riverAt(x, z) : null;
    if (r && Math.abs(r.d) < r.hw + extra) { _wn.dep = r.y - y; _wn.rim = r.hw - Math.abs(r.d); return _wn; }
    return null;
  }
  const d2 = (x, z, p) => (x - p.x) ** 2 + (z - p.z) ** 2;
  // The shared placement rules from the brief. `margin` widens every keep-out (trees use it).
  // opts.wet: allow shallow water down to that depth (reeds).
  function excluded(x, z, margin = 0, opts = null) {
    if (x * x + z * z > 318 * 318) return true;
    // trees and shrubs (margin >= 0) keep out of the clearings; ground cover still grows there
    if (margin >= 0) for (const c of CLEARINGS) if ((x - c[0]) ** 2 + (z - c[1]) ** 2 < (c[2] + margin) ** 2) return true;
    if (d2(x, z, L.castle) < (31 + margin * 1.6) ** 2) return true; // the keep's hexagon has apothem ~29; trees (margin) stay further out
    if (d2(x, z, L.tower) < (12 + margin) ** 2) return true;
    if (d2(x, z, L.stones) < (10 + margin) ** 2) return true;
    if (d2(x, z, L.byre) < (16 + margin) ** 2) return true;
    if (d2(x, z, L.court) < (20 + margin) ** 2) return true;
    if (slopeAt(x, z) > 0.85) return true;
    const y = heightAt(x, z);
    const depth = waterDepth(x, z, y);
    if (depth > (opts && opts.wet ? opts.wet : 0)) return true;
    if (terrain.causewayDistance(x, z) < 4 + margin) return true;
    return false;
  }

  return { heightAt, normalAt, slopeAt, biomeAt, waterDepth, waterNear, excluded, causewayDistance: terrain.causewayDistance };
}
