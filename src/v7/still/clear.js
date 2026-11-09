// Ground cover keeps off the places the still figures need bare (v7-03): the grass round the Sleeper, a patch under the
// Stylite's basket. vegetation/ground.js hands these to the plants as part of the leads' wear (wornAt, leadNear), which
// they apply per blade by a hash of the spot after their draws, so no other plant moves and no tree is touched.
import { SITES } from '../../world.js';
const Q = new URLSearchParams(location.search);
const discs = [];
// fixed at import, so they hold before the plants' first chunks are made (the modules build side by side)
if (Q.get('still') !== '0' && Q.get('sleeper') !== '0') discs.push({ x: SITES.sleeper.x, z: SITES.sleeper.z - 0.45, r: 8, r2: 64, n2: 30 * 30 });

export const stillWorn = (x, z) => {
  let w = 0;
  for (let i = 0; i < discs.length; i++) {
    const d = discs[i], dx = x - d.x, dz = z - d.z, q = dx * dx + dz * dz;
    if (q >= d.r2) continue;
    const e = Math.min(3.5, d.r * 0.5), dd = Math.sqrt(q), f = dd < d.r - e ? 1 : (d.r - dd) / e;
    if (f > w) w = f;
  }
  return w;
};
export const stillNear = (x, z) => {
  for (let i = 0; i < discs.length; i++) { const d = discs[i], dx = x - d.x, dz = z - d.z; if (dx * dx + dz * dz < d.n2) return true; }
  return false;
};

// Rocks keep off the figures and the Accrescent's line (rocks.js reads this after its draws, as it does the plinths').
const keep = [];
if (Q.get('still') !== '0') {
  if (Q.get('sleeper') !== '0') keep.push({ x: SITES.sleeper.x, z: SITES.sleeper.z - 0.45, r: 3.2 });
  if (Q.get('stylite') !== '0') keep.push({ x: 264.4, z: -81.0, r: 1.6 });
  if (Q.get('accrescent') !== '0') keep.push({ x: SITES.accrescent.x, z: SITES.accrescent.z, r: 2.4 });
}
const [LX, LZ] = SITES.accrescent.trailFrom, LDX = SITES.accrescent.x - LX, LDZ = SITES.accrescent.z - LZ, LL = LDX * LDX + LDZ * LDZ;
const lineOn = Q.get('still') !== '0' && Q.get('accrescent') !== '0';
export const stillRockClear = (x, z, size = 0) => {
  for (let i = 0; i < keep.length; i++) { const k = keep[i], dx = x - k.x, dz = z - k.z, r = k.r + size; if (dx * dx + dz * dz < r * r) return true; }
  if (lineOn) { // the line from the Lattice to him: 1.8 m either side, more for a big stone
    const t = Math.max(0, Math.min(1, ((x - LX) * LDX + (z - LZ) * LDZ) / LL)), dx = x - (LX + LDX * t), dz = z - (LZ + LDZ * t), r = 1.8 + size * 0.6;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
};
