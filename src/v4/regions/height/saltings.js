// The Saltings's height hook and what it reads (v13 L2: apart from v4/regions/saltings.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { REGIONS, LANDMARKS } from '../../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';
import { fenShoreDistance, FEN_EDGE } from '../../../height/fen.js';

export const SPINE = REGIONS.saltings.shape.strip;
export const FEN = LANDMARKS.fen;
export const SN = makeSimplex(8811);
export const DROP = 1.0;

// the runnels: shallow drainage lines wandering across the flat (the same function on the CPU, for the
// glasswort, and in the crust's shader)
export const runnel = (x, z) => Math.abs(Math.sin(x * 0.11 + z * 0.07 + 1.7 * Math.sin(x * 0.031 + z * 0.023)));
export const RUNNEL_GLSL = 'abs(sin(p.x * 0.11 + p.y * 0.07 + 1.7 * sin(p.x * 0.031 + p.y * 0.023)))';

// a metre's step down from the moor at the tideline, the flat's own small relief smoothed; never below the fen's
// water where the strip runs along its rim
export function height(h, x, z, w) {
  const s = smoothstep(0.3, 0.7, w);
  let h2 = h - DROP * s - SN.fbm2(x * 0.08, z * 0.08, 2) * 0.12 * s;
  h2 -= (1 - smoothstep(0.06, 0.16, runnel(x, z))) * 0.12 * s; // the runnels, a hand deep
  if (FEN_EDGE.sdFloor(x, z) < 30 && fenShoreDistance(x, z) < 30) h2 = Math.max(h2, Math.min(h, -2.25)); // v16 L3: within 30 m of the fen's edge
  return h2;
}
