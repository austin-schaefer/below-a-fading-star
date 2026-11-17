// Lees Tarn's shore. v4 regions (plans/wilderness-v4-placement.md section 2) gave the round basin a south bay that
// reaches z 200 beside the Trigon Span's dry bed and a shingle spit running 28 m west-north-west from the south-east
// shore; v16 L2 (the owner, #68: "the lake is too perfectly round") draws the rest on the edge (src/height/outline.js):
// TARN_EDGE, a seeded wobble with a west bay, the Byre's point, an inlet where the water comes in from the higher
// north-east, a reedy shallows in the north, one steep bank in the west; the wobble is held low where the Strandline's
// strip runs (bearings 100 to 245) and at the Scriveners' shallows. WATER.tarn.r (92) takes all of it in; tarnWet()
// says where the water really is, so waterLevelAt() stays null on the dry ground inside that radius.
// Pure functions of (x, z): field.js calls tarnBasin() for the basin (keyed on the edge's sd, not the radius),
// tarnHeight() for the bay and the spit, tarnWet() in waterLevelAt() and tarnShoreDistance() for the shore's paint;
// the Strandline lays its shingle along tarnShoreDistance(), the reeds, mists and the bench's arc read it too.
import { WATER } from '../world.js';
import { makeSimplex, smoothstep, clamp, lerp } from '../noise.js';
import { radialOutline, sectorWeight } from '../height/outline.js';

const T = WATER.tarn;
const N = makeSimplex(20261107 + 4242);
// The waterline drawn on the edge: the basin's profile crosses the water level (-4.6) about 1.5 m inside sd 0.
export const TARN_EDGE = radialOutline({
  x: T.x, z: T.z, r: 57, seed: 1604, K: 6, amp: 0.1, falloff: 1.5, warp: 0.6, warpFreq: 0.09,
  window: [
    { bearing: 172, half: 70, ramp: 18, min: 0.85 }, // held a little where the Strandline (world.js REGIONS.strandline) and the spit lie
    { bearing: 349, half: 8, ramp: 14, min: 0.35 }, // the Scriveners' glyphs, in the shallows off the north shore
    { bearing: 292, half: 18, ramp: 16, min: 0.2 },  // the galley's western turn (src/v2/inhabitants/galley.js), deep to the bank
  ],
  lobes: [
    { bearing: 243, d: 56, r: 12, k: 12, to: { bearing: 257, d: 70, r: 8 } }, // the west bay, under the wood
    { bearing: 300, d: 70, r: 9, k: 8, land: true, to: { bearing: 297, d: 57, r: 3.5 } }, // the Byre's point
    { bearing: 63, d: 50, r: 7, k: 6, to: { bearing: 70, d: 80, r: 2.2 } },  // the inlet, from the higher north-east
    { bearing: 12, d: 58, r: 11, k: 9 },                                     // the reedy shallows' bay, toward the causeway
  ],
});
// one steep bank (the west, between the bay and the point), one shallows (the north, round its bay): 0..1 by bearing
const STEEP = sectorWeight(T.x, T.z, { bearing: 278, half: 10, ramp: 14 });
const SHELF = sectorWeight(T.x, T.z, { bearing: 8, half: 12, ramp: 18 });
export const tarnShelf = SHELF; // the shore's paint (and so the reeds) reaches out over the shallows
// how far past the edge the basin reaches (the flatten's 38 m): field.js skips the block beyond it
export const TARN_REACH = TARN_EDGE.rMax + 38;

// The basin, keyed on the edge's sd (it was a radial flatten and dish round one centre): the ground flattens toward
// -4 within 38 m of the shore (14 on the steep bank, where the moor comes back and stands in a lip), then the floor
// falls to -12.5: over 24 m in the open, 8 on the steep bank, and on the shallows a shelf a hand deep for 15 m first.
// n05, n03: field.js's noises at 0.05 and 0.03 (its SX), as the old block read them.
export function tarnBasin(h, x, z, n05, n03) {
  const sd = TARN_EDGE.sd(x, z), st = STEEP(x, z), sh = SHELF(x, z);
  const m = 1 - smoothstep(lerp(4, 0.5, st), lerp(38, 14, st), sd);
  h = lerp(h, -4.0 + n05 * 0.25, m);
  if (st > 0) h += st * 2.0 * smoothstep(-2, 2.5, sd) * (1 - smoothstep(6, 20, sd));
  let bowl = 1 - smoothstep(-22, 2, sd);
  if (st > 0) bowl = lerp(bowl, 1 - smoothstep(-7, 1.5, sd), st);
  if (sh > 0) bowl = lerp(bowl, 0.1 * (1 - smoothstep(-5, 1, sd)) + 0.9 * (1 - smoothstep(-24, -13, sd)), sh);
  return h - bowl * 8.5 - n03 * 0.5 * (1 - smoothstep(-18, 12, sd));
}
// the bay: a round lobe joined to the old circle with a wide fillet, so its mouth opens like a real bay's
export const BAY = { x: -97, z: 182, r: 19, k: 30 };
// the spit: root on the south-east shore, tip out in the water; half-widths at root and tip
export const SPIT = { ax: -42, az: 152, bx: -68, bz: 142, w0: 5.5, w1: 2.4 };
const SPIT_L = Math.hypot(SPIT.bx - SPIT.ax, SPIT.bz - SPIT.az);
const SPIT_DX = (SPIT.bx - SPIT.ax) / SPIT_L, SPIT_DZ = (SPIT.bz - SPIT.az) / SPIT_L;

function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(b, a, h) - k * h * (1 - h);
}
// along (0 root .. 1 tip, unclamped), across (metres from the spine), the half-width there
const _sp = { t: 0, d: 0, w: 0 };
export function spitAt(x, z, out = _sp) {
  const px = x - SPIT.ax, pz = z - SPIT.az;
  const s = px * SPIT_DX + pz * SPIT_DZ;
  out.t = s / SPIT_L;
  const tc = clamp(out.t, 0, 1);
  const qx = px - SPIT_DX * tc * SPIT_L, qz = pz - SPIT_DZ * tc * SPIT_L;
  out.d = Math.sqrt(qx * qx + qz * qz);
  out.w = lerp(SPIT.w0, SPIT.w1, tc) * (1 + 0.18 * N.noise2(x * 0.09, z * 0.09));
  return out;
}

// Signed distance to the tarn's waterline (metres, < 0 in the water), ignoring the spit: the edge, and the bay.
export function tarnShoreDistance(x, z) {
  const dc = TARN_EDGE.sd(x, z);
  const db = Math.sqrt((x - BAY.x) ** 2 + (z - BAY.z) ** 2) - BAY.r;
  if (db > BAY.k + 8) return dc;
  // a little irregularity round the bay so it reads as a drawn shore, not two circles
  return smin(dc, db, BAY.k) + N.noise2(x * 0.06, z * 0.06) * 1.6 * smoothstep(40, 10, db);
}

// Where the water stands (the spit's crest is above it, but waterLevelAt reports the level there as it did on the
// old shore's lip; the margin takes in the shingle the water laps).
export function tarnWet(x, z) {
  const dx = x - T.x, dz = z - T.z;
  return dx * dx + dz * dz < T.r * T.r && tarnShoreDistance(x, z) < 2.5;
}

// The basin under the bay and the spit's ridge, applied after terrain.js has dished the old round tarn.
export function tarnHeight(h, x, z) {
  if (x < -150 || x > -20 || z < 120 || z > 225) return h;
  // the bay: a shelving floor inside the new waterline, a gentle beach outside it, only where the bay changed it
  const db = Math.sqrt((x - BAY.x) ** 2 + (z - BAY.z) ** 2);
  if (db < BAY.r + 34) {
    const u = -tarnShoreDistance(x, z); // metres inside the waterline
    // -4.0 at the line, the water (-4.6) about 1.4 m in, a 7.5 m floor; outside, rising 0.12 a metre
    const g = u > -2 ? -3.7 - 4.2 * smoothstep(-2, 10, u) : -3.7 + (-u - 2) * 0.12;
    const m = 1 - smoothstep(BAY.r + 18, BAY.r + 34, db); // fade out well before the Span's piers
    h = lerp(h, Math.min(h, g + N.noise2(x * 0.08, z * 0.08) * 0.15), m);
  }
  // the spit: a low shingle ridge, its crest a little above the water, running out and under at the tip
  const s = spitAt(x, z);
  if (s.t > -0.4 && s.t < 1.35 && s.d < s.w + 16) {
    const crest = lerp(-3.55, -5.1, smoothstep(0.72, 1.12, s.t)) + 0.12 * N.noise2(x * 0.2, z * 0.2);
    const k = s.d < s.w ? (s.d / s.w) ** 2 * 0.35 : 0.35 + (s.d - s.w) * 0.55; // a rounded back, steep flanks
    const root = smoothstep(-0.4, 0.0, s.t);  // it grows out of the shore
    const ridge = crest - k;
    if (ridge > h) h = lerp(h, ridge, root);
  }
  return h;
}

// The tide the tarn has with no moon to pull it (the Strandline's brief): a hand's breadth up and down every few
// minutes, two slow periods beating so it never quite repeats. Metres about WATER.tarn.y; t is game time.
export const TIDE = { amp: 0.05, period: 190 };
export function tideAt(t) {
  return TIDE.amp * (0.8 * Math.sin((t * 2 * Math.PI) / TIDE.period) + 0.2 * Math.sin((t * 2 * Math.PI) / 71 + 1.3));
}
// The lap: water laps though there is no wind, a swash up the shingle every few seconds, riding on the tide.
// 0..1, how far up the beach this lap has run (1 at its top). The sandpipers run in and out in step with it.
export const LAP = { period: 5.6 };
export function lapAt(t) {
  const p = ((t / LAP.period) % 1 + 1) % 1;
  // a quick run up (0.35 of the cycle) and a slower draw back
  return p < 0.35 ? Math.sin((p / 0.35) * Math.PI * 0.5) : 0.5 + 0.5 * Math.cos(((p - 0.35) / 0.65) * Math.PI);
}
