// BD the Foundered Nave's plan (v5 wonders), in its marked block of the placement plan (SITES.nave.block, x 230-280,
// z 15-65): the hole's ragged rim, the hall's measures, and the clearances rocks.js, vegetation/ground.js and
// structures/scatter.js apply after their draws. The heightfield is not changed: every placement stream that reads
// the ground before it draws (the rocks' and trees' slope tests, and the structures' scatter, whose candidates
// test slope and height: one of them falls at (255.7, 37.4), in the hole) would shift, and everything after it
// with it, across the whole map. The hole is made by v5/nave.js taking the terrain's triangles out over the rim;
// the hall's roof follows the moor down where the moor lies low. ?nave=0 makes every export here a no-op.
import { SITES } from '../../world.js';
import { makeSimplex } from '../../noise.js';

export const NAVE_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('nave') === '0';
const SN = makeSimplex(20261123);
const S = SITES.nave;
// the plan, in world metres. The nave runs east-west on z = 40; the hall's level parts are flat.
export const NAVE = {
  x: S.x, z: S.z, r: 12, block: S.block,
  ceil: -3.0,                 // the roof's underside where the moor stands high enough; under lower ground it sinks with it
  cover: 0.9,                 // the least turf and soil over the roof
  water: -17.0,               // the water: 15-17 m below the rim
  rows: [-11, -4.5, 4.5, 11], // the column rows, z from the axis: a 9 m nave between 6.5 m aisles
  walls: 14,                  // the aisles' outer walls, z from the axis
  bay: 5.5, x0: 233.5, x1: 300, // bays along x from the hole's centre; the west end is choked, the east runs out under the moor
};
const B = NAVE.block;
// rim radius on compass bearing b (degrees): ragged on every scale, a little long east-west (the roof broke along
// the nave), torn further on the south-west where most of the turf came down
export function naveRim(b) {
  const a = (b * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  let r = 0, amp = 2.4, f = 1.0;
  for (let k = 0; k < 6; k++) { r += amp * SN.noise2(c * f + 4.7 * k, s * f - 9.3 * k); amp *= 0.55; f *= 2.1; }
  const along = Math.abs(s); // 1 east and west
  const sw = Math.exp(-(((b - 225 + 540) % 360 - 180) ** 2) / (2 * 28 * 28));
  return NAVE.r + r + 1.6 * along * along + 1.8 * sw;
}
export const naveBearing = (x, z) => ((Math.atan2(x - NAVE.x, -(z - NAVE.z)) * 180) / Math.PI + 360) % 360;
// signed distance to the rim (< 0 over the hole)
export function naveEdge(x, z) { return Math.hypot(x - NAVE.x, z - NAVE.z) - naveRim(naveBearing(x, z)); }
// rocks and trees keep off the rim and the hole (read after the draws by rocks.js and vegetation/ground.js)
export function naveClear(x, z) {
  if (NAVE_OFF || x < B[0] - 4 || x > B[1] + 4 || z < B[2] - 4 || z > B[3] + 4) return false;
  return naveEdge(x, z) < 4;
}
// ground cover grows to within 2 m of the lip (the broken edge is bare), never over the hole
export function naveHole(x, z) {
  if (NAVE_OFF || x < B[0] || x > B[1] || z < B[2] || z > B[3]) return false;
  return naveEdge(x, z) < 2.0;
}
