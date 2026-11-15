// The Strandline's height hook and what it reads (v13 L2: apart from v4/regions/strandline.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { WATER } from '../../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';

export const WY = WATER.tarn.y;
export const TX = WATER.tarn.x, TZ = WATER.tarn.z;
export const N = makeSimplex(20261107 + 707);
export const LAP_RISE = 0.17; // metres the lap's front climbs above the tide: about a metre up the shingle

// metres above the still water, and how the beach is sorted there: 0 fine at the water .. 1 coarse up top
export const grade = (s) => clamp(s / 1.7, 0, 1);

// ---------------------------------------------------------------- the beach profile: a berm, cusps
// Both bumps are positive, so the coarse pass (regions.js) takes the bare slope: the skin carries the detail.
export function height(h, x, z, w, coarse) {
  if (coarse) return h;
  const s = h - WY;
  if (s < -1.2 || s > 3) return h;
  // a storm berm along the top of the shingle, and beach cusps every 7 m along the shore just above the water
  const along = Math.atan2(z - TZ, x - TX) * 70;
  const berm = 0.3 * Math.exp(-(((s - 1.15) / 0.38) ** 2)) * (0.75 + 0.25 * N.noise2(x * 0.05, z * 0.05));
  const cusp = 0.09 * (0.5 + 0.5 * Math.sin((along * 2 * Math.PI) / 7)) * Math.exp(-(((s - 0.35) / 0.4) ** 2));
  return h + smoothstep(0.35, 0.65, w) * (berm + cusp);
}
