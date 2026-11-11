// Lees Tarn's new shore (v4 regions; plans/wilderness-v4-placement.md section 2, "The new shore"): Austin's "make the
// lake not perfectly circular". The old round basin (terrain.js) keeps its shore everywhere but two places: a
// south bay that reaches z 200 beside the Trigon Span's dry bed, and a shingle spit running 28 m west-north-west
// from the south-east shore. WATER.tarn grows to r 92 so its surface covers the bay; tarnWet() says where the
// water really is, so waterLevelAt() stays null on the dry ground inside that radius (the Byre, the Sward's foot).
// Pure functions of (x, z): terrain.js calls tarnHeight() at the end of its tarn block and tarnWet() in
// waterLevelAt(); the Strandline (regions/strandline.js) lays its shingle along tarnShoreDistance().
import { WATER } from '../world.js';
import { makeSimplex, smoothstep, clamp, lerp } from '../noise.js';

const T = WATER.tarn;
const N = makeSimplex(20261107 + 4242);
// the old waterline: terrain.js's dish crosses the water level at about r 58
const R0 = 58;
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

// Signed distance to the tarn's waterline (metres, < 0 in the water), ignoring the spit.
export function tarnShoreDistance(x, z) {
  const dc = Math.sqrt((x - T.x) ** 2 + (z - T.z) ** 2) - R0;
  const db = Math.sqrt((x - BAY.x) ** 2 + (z - BAY.z) ** 2) - BAY.r;
  if (db > BAY.k + 8) return dc;
  // a little irregularity round the bay so it reads as a drawn shore, not two circles
  return smin(dc, db, BAY.k) + N.noise2(x * 0.06, z * 0.06) * 1.6 * smoothstep(40, 10, db);
}

// Where the water stands (the spit's crest is above it, but waterLevelAt reports the level there as it did on the
// old shore's lip; the margin takes in the shingle the water laps).
export function tarnWet(x, z) {
  return tarnShoreDistance(x, z) < 2.5;
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
