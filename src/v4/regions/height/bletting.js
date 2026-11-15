// The Bletting's height hook and what it reads (v13 L2: apart from v4/regions/bletting.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { REGIONS, LANDMARKS } from '../../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';

export const R = REGIONS.bletting, CI = R.shape.circle, ZMIN = R.clip.zMin;
export const O = LANDMARKS.orchard; // Medlar Close
export const SN = makeSimplex(5511);
export const HEDGE_R = CI.r - 3, HEDGE_N = ZMIN + 3; // the hedge stands just inside the region's edge, and along its northern clip
// gaps where paths come through (placement plan section 4: P7 at the Plinth Road's foot, P8 toward the Hypogeum,
// P9 and the causeway from (80, -8), the Leerie's kerb K1)
// [x, z, r]: r the wall's gap (6 m unless given; the hedge's is 4.5). v8-09: Medlar Close's wicket (strata/place.js),
// where P8 comes through the close's circuit, a gate's width
export const GAPS = [[130, -150], [212, -121], [82, -6], [123, 5], [178.7, -115.05, 1.2]];

export function hedgeDist(x, z) {
  const r = hyp(x - CI.x, z - CI.z);
  let d = Math.abs(r - HEDGE_R);
  if (z < ZMIN + 12) d = Math.min(d, Math.abs(z - HEDGE_N) + Math.max(0, r - HEDGE_R));
  return d;
}

// a low bank under the hedge, and nothing else: the orchard ground keeps the moor's lie (and Medlar Close its terraces)
export function height(h, x, z, w) {
  const d = hedgeDist(x, z);
  if (d > 4) return h;
  return h + 0.55 * Math.exp(-((d / 1.3) ** 2)) * Math.min(1, w * 2);
}
