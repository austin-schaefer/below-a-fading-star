// Level pads (v15-W6): ground made level under a thing built for a flat place, eased into the land round it. Medlar
// Close's terraces were floor() steps whose treads were flat; v15-W5 made them a continuous wave (field.js), and what
// stood on a tread stood on a slope. A pad is a rectangle in its own frame (centre, angle, half-length hu along the
// angle, half-width hv across) held at one height, and a skirt `ease` metres wide round it where the ground goes back
// to itself on a smoothstep of the distance from the rectangle (C1: no step in height, no kink in slope). Its height is
// `y` when given (a plot's floor), else the mean of the ground over the rectangle with no pads, measured once on first
// use (heightAt calls itself for it, pads off), so it follows the land if the moor under it changes. Pads blend
// together: each pad's weight w (1 inside it, 0 past its skirt) counts as w / (1 - w), so where skirts overlap the
// ground goes to their weighted level and inside a pad it is that pad's own y. Pure and deterministic: the height path's workers run it too.
import { plot, HOUSE } from '../v15/plan.js';

const ALLEY = { x0: HOUSE.x1, x1: HOUSE.stable.x0, z0: HOUSE.stable.z0, z1: HOUSE.stable.z1 }; // between the house's east wall and its stable

const PADS = [
  // the Collation: the table 11 by 1.1 m with its chairs pulled out and the fallen one, 13 by 4 m on its axis. x, z and
  // angle are COLLATION's (src/v5/dressing/collation.js, which imports three, so not imported here); dressing-test
  // checks the two agree
  { name: 'collation', x: 141, z: -66, angle: -0.4, hu: 6.6, hv: 2.1, ease: 6, y: null },
  // the Pennyworth's two houses north of the stable, built on old treads (fall 0.23 and 0.25 m); their floors at the
  // plan's y, the pad 0.3 m out past the walls, the lane between them a smooth bank. Their skirts stop at the
  // Pomegranate House's walls and its stable's (`off`): the ground under a wall built on it is not a pad's to move
  ...['pennyworth-house-1', 'pennyworth-house-2'].map((n) => ({ ...fromPlot(plot(n), 0.3), ease: 6, off: [HOUSE, HOUSE.stable, ALLEY] })),
];
const OFF_EASE = 3; // metres outside an `off` rectangle over which a pad comes back in
function fromPlot(p, m) { return { name: p.name, x: p.x, z: p.z, angle: Math.atan2(p.face[1], p.face[0]), hu: p.d / 2 + m, hv: p.w / 2 + m, y: p.y }; }
for (const p of PADS) { p.ca = Math.cos(p.angle); p.sa = Math.sin(p.angle); p.r = Math.hypot(p.hu, p.hv) + p.ease; }
let measuring = false;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// h: the ground at the pad's step in heightAt; heightAt: the whole field, called only to measure a pad's height once
export function padGround(h, x, z, heightAt) {
  if (measuring) return h;
  let cover = 0, sa = 0, sy = 0;
  for (let i = 0; i < PADS.length; i++) {
    const p = PADS[i], dx = x - p.x, dz = z - p.z;
    if (dx > p.r || dx < -p.r || dz > p.r || dz < -p.r) continue;
    const u = dx * p.ca + dz * p.sa, v = -dx * p.sa + dz * p.ca;
    const eu = Math.max(Math.abs(u) - p.hu, 0), ev = Math.max(Math.abs(v) - p.hv, 0);
    const d = Math.sqrt(eu * eu + ev * ev);
    if (d >= p.ease) continue;
    if (p.y === null) p.y = measure(p, heightAt);
    let w = 1 - smooth(d / p.ease);
    if (p.off) for (const r of p.off) {
      const ox = Math.max(r.x0 - x, 0, x - r.x1), oz = Math.max(r.z0 - z, 0, z - r.z1);
      if (ox < OFF_EASE && oz < OFF_EASE) w *= smooth(Math.sqrt(ox * ox + oz * oz) / OFF_EASE);
    }
    if (w <= 0) continue;
    const a = w / (1 - w + 1e-9);
    cover = 1 - (1 - cover) * (1 - w); sa += a; sy += a * p.y;
  }
  return cover > 0 ? h + (sy / sa - h) * cover : h;
}

function measure(p, heightAt) {
  measuring = true;
  let s = 0, n = 0;
  try {
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++) {
      const u = -p.hu + (2 * p.hu * i) / 8, v = -p.hv + (2 * p.hv * j) / 4;
      s += heightAt(p.x + u * p.ca - v * p.sa, p.z + u * p.sa + v * p.ca); n++;
    }
  } finally { measuring = false; }
  return s / n;
}

export const LEVEL_PADS = PADS;
