// The Adust's height hook and what it reads (v13 L2: apart from v4/regions/adust.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { SUN } from '../../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';

export const N = makeSimplex(20261107 + 808);
// the sun's direction on the ground (toward it), for the varnish and the beetles
export const SUNX = SUN.dir.x / Math.hypot(SUN.dir.x, SUN.dir.z), SUNZ = SUN.dir.z / Math.hypot(SUN.dir.x, SUN.dir.z);
export const SUN_YAW = Math.atan2(SUNX, SUNZ); // a mesh built facing +z, turned by this, faces the sun

// where the red sand drifts (else cracked clay)
export const sandAt = (x, z) => smoothstep(0.62, 0.8, N.fbm2(x * 0.035 + 7, z * 0.035 - 3, 3) * 0.5 + 0.5 + 0.08 * N.noise2(x * 0.2, z * 0.2));
// the drifts' ripples and small dunes: crests run north-south, a long west face and a short steep lee to the east
export function dune(x, z) {
  const u = (x + N.noise2(x * 0.03, z * 0.05) * 9 + z * 0.12) / 6.5, f = u - Math.floor(u);
  return (f < 0.78 ? f / 0.78 : (1 - f) / 0.22) ** 1.4;
}

// ---------------------------------------------------------------- relief: small dunes in the drifts (positive: the
// coarse pass leaves them to the skin)
export function height(h, x, z, w, coarse) {
  if (coarse) return h;
  const s = sandAt(x, z) * smoothstep(0.3, 0.8, w);
  return s > 0 ? h + s * 0.42 * dune(x, z) : h;
}
