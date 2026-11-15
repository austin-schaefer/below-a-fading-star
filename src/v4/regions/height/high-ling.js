// The High Ling's height hook and what it reads (v13 L2: apart from v4/regions/high-ling.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { REGIONS } from '../../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';

export const SN = makeSimplex(6611);
export const POLY = REGIONS.highLing.shape.poly;
// the west edge, from (228, 10) to (236, -105): x of the scarp's foot at z
export const edgeX = (z) => POLY[0][0] + (POLY[0][1] - z) * ((POLY[1][0] - POLY[0][0]) / (POLY[0][1] - POLY[1][1]));
// where the scarp is broken and easy to climb: P10's way up at z -60, and two more gullies
export const CLIMBS = [-60, -12, -92];
export const scarpWidth = (z) => {
  let w = 3 + 1.2 * SN.noise2(z * 0.07, 1.3);
  for (const c of CLIMBS) w += 7 * Math.exp(-(((z - c) / 5) ** 2));
  return w;
};
export const RISE = 3;

// the shelf: everything inside stands three metres up; along the west edge it rises in a scarp of three or four metres'
// width (gentle at the climbs), elsewhere it fades over the region's blend
export function height(h, x, z, w) {
  const dw = x - edgeX(z);
  let shelf = w;
  if (dw < 14 && z < 12 && z > -107) shelf = Math.min(w, smoothstep(-0.6, scarpWidth(z), dw));
  return h + RISE * shelf + SN.fbm2(x * 0.05, z * 0.05, 3) * 0.6 * w;
}
