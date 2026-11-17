// The Outwash's height hook and what it reads (v13 L2: apart from v4/regions/outwash.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { REGIONS } from '../../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';
import { floorLift } from '../../../height/floor.js'; // v16: the plane rides on the floor's fall

export const E = REGIONS.outwash.shape.ellipse;
export const SN = makeSimplex(4411);
export const sdE = (x, z) => { const dx = (x - E.x) / E.rx, dz = (z - E.z) / E.rz; return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(E.rx, E.rz); };

// ---------------------------------------------------------------- the braided channels
// Six dry channels leave the snout's foot, wander south-west across the plain, cross and rejoin, and gather at the
// one gap in the moraine (OUT), where the meltwater once left.
export const OUT = { x: -4, z: -178 }; // toward the Sunken Court, as R1 runs (placement plan section 4)
export const CHANNELS = (() => {
  const rng = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const starts = [-8, 14, 33, 52, 74, 96];
  return starts.map((x0, i) => {
    const pts = [], amp = 4 + rng() * 5, ph = rng() * 6.28, k = 2 + rng() * 1.5, hw = 2.2 + rng() * 1.6;
    for (let s = 0; s <= 28; s++) {
      const t = s / 28, e = Math.pow(t, 1.15);
      const x = lerp(x0, OUT.x + 2, e) + Math.sin(t * Math.PI * k + ph) * amp * (1 - t * 0.85);
      const z = lerp(-213 - (i % 2) * 2, OUT.z - 6, t) + Math.cos(t * Math.PI * 1.3 + ph) * 2.5 * (1 - t);
      pts.push([x, z]);
    }
    pts.push([OUT.x, OUT.z + 6]);
    return { pts, hw };
  });
})();
export const CH_BOX = [-30, 110, -222, -160];
// 0..1: how deep in a channel the point lies (1 on a channel's floor)
export function channelAt(x, z) {
  if (x < CH_BOX[0] || x > CH_BOX[1] || z < CH_BOX[2] || z > CH_BOX[3]) return 0;
  let best = 0;
  const wob = 0.8 + 0.4 * SN.noise2(x * 0.05, z * 0.05 + 3); // (one noise a point, not one a segment: the same number)
  for (const c of CHANNELS) {
    const p = c.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0], az = p[i][1], ex = p[i + 1][0] - ax, ez = p[i + 1][1] - az, l2 = ex * ex + ez * ez;
      let t = ((x - ax) * ex + (z - az) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - ax - ex * t, dz = z - az - ez * t, d2 = dx * dx + dz * dz;
      const hw = c.hw * wob;
      if (d2 > hw * hw * 1.6) continue;
      const v = 1 - smoothstep(hw * 0.55, hw, Math.sqrt(d2));
      if (v > best) best = v;
    }
  }
  return best;
}
// the terminal moraine: a ridge along the ellipse's southern arc, crest 6 m inside the edge, gapped at OUT
export function moraineAt(x, z) {
  const d = sdE(x, z), south = smoothstep(-199, -187, z);
  if (south <= 0) return 0;
  const gap = 1 - 0.9 * Math.exp(-(((x - OUT.x) / 5.5) ** 2));
  return Math.exp(-(((d + 6.5) / 3.4) ** 2)) * south * gap * (1 + 0.3 * SN.fbm2(x * 0.06, z * 0.06, 2));
}

// ---------------------------------------------------------------- hooks
// the plain: smoothed toward a gentle apron that falls from the snout's foot to the moraine, a quarter of the moor's
// relief kept; the channels cut half a metre into it; the moraine stands up to three metres. The apron lies on the
// floor's fall (src/height/floor.js), so the plain is the old one lifted with the ground round it.
export function height(h, x, z, w) {
  const plane = -0.5 + clamp((-176 - z) / 40, 0, 1) * 1.9 + 0.006 * (x - 25) + floorLift(x, z);
  h = lerp(h, plane + (h - plane) * 0.25 + SN.fbm2(x * 0.09, z * 0.09, 2) * 0.25, w * 0.9);
  h -= channelAt(x, z) * 0.7 * w;
  h += moraineAt(x, z) * 2.9 * w;
  return h;
}
