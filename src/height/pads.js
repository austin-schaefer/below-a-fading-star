// Level pads (v15-W6): ground made level under a thing built for a flat place, eased into the land round it. Medlar
// Close's terraces were floor() steps whose treads were flat; v15-W5 made them a continuous wave (field.js), and what
// stood on a tread stood on a slope. A pad is a rectangle in its own frame (centre, angle, half-length hu along the
// angle, half-width hv across) held at one height, and a skirt `ease` metres wide round it where the ground goes back
// to itself on a smoothstep of the distance from the rectangle (C1: no step in height, no kink in slope). Its height is
// `y` when given (a plot's floor), else the mean of the ground over the rectangle with no pads, measured once on first
// use (heightAt calls itself for it, pads off), so it follows the land if the moor under it changes. Pads apply in
// order, each on the ground the last left. Pure and deterministic: the height path's workers run it too.
import { plot } from '../v15/plan.js';

const PADS = [
  // the Collation: the table 11 by 1.1 m with its chairs pulled out and the fallen one, 13 by 4 m on its axis. x, z and
  // angle are COLLATION's (src/v5/dressing/collation.js, which imports three, so not imported here); dressing-test
  // checks the two agree
  { name: 'collation', x: 141, z: -66, angle: -0.4, hu: 6.6, hv: 2.1, ease: 6, y: null },
  // the Pennyworth's two houses north of the stable, built on old treads (fall 0.23 and 0.25 m); their floors at the
  // plan's y, the pad 0.6 m out past the walls, the lane between them a smooth bank
  ...['pennyworth-house-1', 'pennyworth-house-2'].map((n) => ({ ...fromPlot(plot(n), 0.6), ease: 6 })),
];
function fromPlot(p, m) { return { name: p.name, x: p.x, z: p.z, angle: Math.atan2(p.face[1], p.face[0]), hu: p.d / 2 + m, hv: p.w / 2 + m, y: p.y }; }
for (const p of PADS) { p.ca = Math.cos(p.angle); p.sa = Math.sin(p.angle); p.r = Math.hypot(p.hu, p.hv) + p.ease; }
let measuring = false;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// h: the ground at the pad's step in heightAt; heightAt: the whole field, called only to measure a pad's height once
export function padGround(h, x, z, heightAt) {
  if (measuring) return h;
  for (let i = 0; i < PADS.length; i++) {
    const p = PADS[i], dx = x - p.x, dz = z - p.z;
    if (dx > p.r || dx < -p.r || dz > p.r || dz < -p.r) continue;
    const u = dx * p.ca + dz * p.sa, v = -dx * p.sa + dz * p.ca;
    const eu = Math.max(Math.abs(u) - p.hu, 0), ev = Math.max(Math.abs(v) - p.hv, 0);
    const d = Math.sqrt(eu * eu + ev * ev);
    if (d >= p.ease) continue;
    if (p.y === null) p.y = measure(p, heightAt);
    const w = 1 - smooth(d / p.ease);
    h += (p.y - h) * w;
  }
  return h;
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
