// v18-F1: the Deodand Wood's north lobe, as a shape. Three-free (the heightfield, the regions and the bake's worker import
// it). The lobe is the old wood grown out onto the moor north of it: a neck of trees out of the old edge (about z 45)
// and a ragged spread round the plan's centre (NORTH_LOBE, (-198, 22)), with two tongues, all of it inside the plan's
// box. Its signed distance (metres, < 0 inside) is the wood's second line: field.js's biome paints the wood out to it
// (lobeWood, a shorter fade than the old circle's), height/regions.js's place `wood` takes the lower of the two lines.
//
// Its west edge is held at x -218 (LOBE_WEST): the place's weight reaches 10 m past its line at the ground's blend, and
// the Adust's height hook begins at x -229, so the lobe moves no ground; the same line keeps it off the tor at (-230, 30).
// Its north edge is held at z -1 (the Stones' ring is at z -24), its east at x -168 (rivulet R4 runs at x -150..-160).
import { makeSimplex, smoothstep } from '../noise.js';
import { NORTH_LOBE } from './plan.js';

const N = makeSimplex(1801);
export const LOBE_WEST = -218;
// where lobeSd is worked out: the lobe and the air's blend round it (31 m); outside, FAR
export const LOBE_BOX = { x0: -262, x1: -130, z0: -40, z1: 95 };
const FAR = 99;
const B = LOBE_BOX;
export const inLobeBox = (x, z) => x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1;

const seg = (x, z, ax, az, bx, bz, r) => {
  const ex = bx - ax, ez = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
  const dx = x - ax - ex * t, dz = z - az - ez * t;
  return Math.sqrt(dx * dx + dz * dz) - r;
};
const disc = (x, z, cx, cz, r) => Math.sqrt((x - cx) ** 2 + (z - cz) ** 2) - r;
const ell = (x, z, cx, cz, rx, rz) => { const dx = (x - cx) / rx, dz = (z - cz) / rz; return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(rx, rz); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

const C = NORTH_LOBE;
// the lobe's signed distance; FAR outside LOBE_BOX
export function lobeSd(x, z) {
  if (!inLobeBox(x, z)) return FAR;
  // the neck, out of the old edge north-west to the spread; the spread, longer east-west; a tongue east, one north-west
  let d = seg(x, z, -188, 58, -195, 30, 15);
  d = smin(d, ell(x, z, C.x - 1, C.z - 2, 27, 19), 12);
  d = smin(d, disc(x, z, -178, 9, 9), 9);
  d = smin(d, disc(x, z, -212, 3, 8), 9);
  // ragged: a slow sway and a short one
  d += N.noise2(x * 0.045, z * 0.045) * 7 + N.noise2(x * 0.13 + 5.1, z * 0.13 - 2.3) * 2.5;
  // held off what it must not touch
  return Math.max(d, LOBE_WEST - x, x + 168, -1 - z);
}
// the biome's wood weight from the lobe (before the wood's blotch): full 13 m in, nothing 4 m past its line
export const lobeWood = (x, z) => { const d = lobeSd(x, z); return d >= 4 ? 0 : 1 - smoothstep(-13, 4, d); };
