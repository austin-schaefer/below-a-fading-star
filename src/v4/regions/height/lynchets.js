// The Lynchets's height hook and what it reads (v13 L2: out of v4/regions/lynchets.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { REGIONS } from '../../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';

export const N = makeSimplex(20261107 + 909);
export const POLY = REGIONS.lynchets.shape.poly;
// ridge-and-furrow: the ridges run north-north-east, so the low sun from the west-south-west rakes across them
export const RF = { ax: 0.34, az: -0.94, period: 7, amp: 0.15 }; // along-ridge direction, metres
export const RFX = -RF.az, RFZ = RF.ax; // across the ridges
export const TERRACE = 1.5; // metres from one tread to the next

// ---------------------------------------------------------------- relief: terraces along the contours, ridge and furrow
export function height(h, x, z, w) {
  // strip lynchets: long level treads and short steep risers, following the hill's own contours
  const t = (h + 100) / TERRACE, f = t - Math.floor(t);
  const terr = (Math.floor(t) + smoothstep(0.72, 0.98, f)) * TERRACE - 100;
  // the ridges, lowest at the risers' foot so the furrows drain off the terrace
  const a = (x * RFX + z * RFZ) / RF.period;
  const rf = RF.amp * (0.5 - 0.5 * Math.cos(a * 2 * Math.PI)) * (1 - smoothstep(0.6, 0.75, f));
  const k = smoothstep(0.15, 0.7, w);
  return h + (terr + rf - h) * k;
}
