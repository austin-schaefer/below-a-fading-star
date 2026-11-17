// v17's water on the ground (W1): the bodies the kit (stream.js) makes from the plan (plan.js), and the three calls the
// height path makes behind the one box test (field.js: heightRaw, biomeWith, waterLevelAt). Pure, three-free.
// Order matters in the ground: the mere first, then what runs out of it and into it (the cut, the brook), so a stream's
// bank cut down to its level wins over the mere's lip where the two meet. W2's leat goes in STREAMS after the brook.
import { BOX, MERE, BROOK, SWALLOW_CUT } from './plan.js';
import { makeStream, makeStill } from './stream.js';

export const MERE_BODY = makeStill({ name: 'mere', y: MERE.level, D: MERE.D, bank: MERE.bank, end: MERE.end, bankSouth: MERE.bankSouth, outline: MERE.outline });
export const BROOK_BODY = makeStream({ name: 'brook', ...BROOK });
export const CUT_BODY = makeStream({ name: 'swallow-cut', ...SWALLOW_CUT });
export const STILLS = [MERE_BODY];
export const STREAMS = [BROOK_BODY, CUT_BODY];
const ALL = [...STILLS, ...STREAMS];

export const inV17Box = (x, z) => x >= BOX.x0 && x <= BOX.x1 && z >= BOX.z0 && z <= BOX.z1;

// heightRaw's last word inside the box
export function v17Ground(h, x, z) {
  for (let i = 0; i < ALL.length; i++) h = ALL[i].ground(h, x, z);
  return h;
}
// waterLevelAt inside the box: the first body that is wet here
export function v17Level(x, z) {
  for (let i = 0; i < ALL.length; i++) { const y = ALL[i].level(x, z); if (y !== null) return y; }
  return null;
}
// biomeWith inside the box: raises out.wet, out.strand and out.shore (0..1 each) where a body paints
export function v17Paint(x, z, out) {
  for (let i = 0; i < ALL.length; i++) ALL[i].paint(x, z, out);
  return out;
}
// WATER_BODIES' rows (field.js): each body's wet test and its shore's signed distance, both behind the box
export const V17_ROWS = ALL.map((b) => ({
  name: b.name,
  w: { x: (b.box[0] + b.box[1]) / 2, z: (b.box[2] + b.box[3]) / 2, r: Math.hypot(b.box[1] - b.box[0], b.box[3] - b.box[2]) / 2, y: b.kind === 'still' ? b.y : b.Y[0] },
  wet: (x, z) => inV17Box(x, z) && b.wet(x, z),
  sd: (x, z) => (inV17Box(x, z) ? b.sd(x, z) : 1e3),
  // the level that holds here (a stream's falls along it): the tests read it in place of w.y; -Infinity off the body
  levelAt: b.kind === 'still' ? () => b.y : (x, z) => { const p = b.project(x, z); return p.ok ? b.levelOfS(p.s) : -Infinity; },
  body: b,
}));
