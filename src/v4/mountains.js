// The walls: the bowl's mountains as five massifs with deep cols between them (plans/wilderness-v5.md, "The massifs"):
//   tier 1, the massifs, in the heightfield (terrain.js calls applyMountains in a marked block): the north-east
//          (20-100°, to 300 m: the Ridge, the Vigilant), the south-east (125-172°, the Horn to 335 m), the south
//          (190-235°, ~300 m), the west (265-318°, to 320 m: the Galleries) and the Tierce (336-356°, 300 m); the
//          cols at 112° (61 m), 180° (41 m) and 328° (73 m), the glacier's notch (354-20°) and the sun's saddle
//          (250°, 22 m, the lowest). The crest runs through a periodic spline over bearing, rounded within a massif,
//          the named peaks (PEAKS) broad crowns on it. Each face has three sizes of structure: a scree apron at 33°,
//          a steep rock band behind it, a convex shoulder into the crest, and corries; ledges along each massif's
//          tilted bedding plane, a few gullies crest to apron, buttresses where the face is steep; creased facets.
//   tiers 2 and 3, the far ranges: two rings of mesh beyond the terrain (crests at r ~800 and ~1350), each rolling
//          in massifs of its own set behind the near cols, ridged in plan and lit on their sunward sides, lower in
//          the picture and paler under the fog tiers.
//   v11 the form: summits, notches and serration along the crest, spurs and the valleys between them (FORM, SPURS_M).
// ?mountains=v4 builds the v4 wall instead (a front range at r ~362, a steep face with buttresses, talus and
// bedding to a fractal crest at r ~430-475, far ranges rising above it): applyMountains' body and farCrest's.
// The sun's saddle is a flat-floored gate ±8° wide at the floor, its walls rising to full height by ±13°, with
// a walkable wedge (±4.5°) out to the road's start at r 366 and two flat seats for AM's colossi on its flanks
// (the marked block below). Every range dips in the saddle, below the line from the gate over the col, so
// the sun and the Parhelion City keep the gap. Deterministic: no rng, only seeded noise.
import * as THREE from 'three';
import { makeSimplex, hash2, clamp, lerp, smoothstep } from '../noise.js';
import { WORLD, SUN, PEAKS, PALETTE } from '../world.js';

const S = makeSimplex(WORLD.seed + 404);
const D2R = Math.PI / 180;
const TAU = Math.PI * 2;
export const M_START = 284; // nothing of the walls inside this radius

// ---------------------------------------------------------------- the saddle (BI, AM)
export const SADDLE = {
  azimuth: SUN.azimuth,   // world.js azimuth (from +x toward +z); bearing 250°
  bearing: 90 + SUN.azimuth / D2R,
  full: 8 * D2R,          // flat floor within ±8° of the sun's line
  wall: 13 * D2R,         // the gate's walls at full height by ±13°
  walkHalf: 4.5 * D2R,    // the walkable wedge
  walkR: 372,             // the wedge's limit (the road starts at r 366)
  roadR: 366,
};
// The saddle's floor along its axis: up gently to the road's start, then up to the col at the terrain's edge
// (y 44 at r 530), low enough that the whole sun clears it from the road's start and high enough, seen from
// the gate (4.7°), to keep the Parhelion City's ground line (5°) standing on it.
export function saddleFloor(r) {
  return 13 * smoothstep(288, 368, r) + 31 * smoothstep(372, 530, r);
}
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
export function saddleWeight(az) { return 1 - smoothstep(SADDLE.full, SADDLE.wall, Math.abs(angDiff(az, SADDLE.azimuth))); }

// How far out a walker may go at (x, z): the region's edge (regionRadius + 48) everywhere but the saddle's
// wedge, which runs out to the road's start.
const BASE_LIMIT = WORLD.regionRadius + 48;
export function walkLimit(x, z) {
  const d = Math.abs(angDiff(Math.atan2(z, x), SADDLE.azimuth));
  if (d > SADDLE.walkHalf + 1.5 * D2R) return BASE_LIMIT;
  return lerp(SADDLE.walkR, BASE_LIMIT, smoothstep(SADDLE.walkHalf, SADDLE.walkHalf + 1.5 * D2R, d));
}

// --- v4 systems: AM's seats (begin). Two flat benches cut into the saddle's flanks for the crawling colossi
// (AM, src/v5/thrones.js), one under each throne site in the placement plan, (-420, 100) and (-400, 200): each a
// radial strip from r 380 (a plinth's edge 8 m above the road's start, their hands) to r 505, 48 m wide, at
// y 22. The colossi crawl out of the wall toward the bowl; the road starts between their hands.
export const SEATS = [[-420, 100], [-400, 200]].map(([x, z]) => {
  const az = Math.atan2(z, x);
  return { x, z, az, cx: Math.cos(az), cz: Math.sin(az), r0: 380, r1: 505, half: 24, y: 22 };
});
function seatHeights(h, x, z) {
  for (const s of SEATS) {
    const along = x * s.cx + z * s.cz;
    if (along < s.r0 - 14 || along > s.r1 + 14) continue;
    const across = Math.abs(-x * s.cz + z * s.cx);
    if (across > s.half + 12) continue;
    const m = (1 - smoothstep(s.half, s.half + 12, across)) * smoothstep(s.r0 - 4, s.r0, along) * (1 - smoothstep(s.r1, s.r1 + 14, along));
    h = lerp(h, s.y, m);
  }
  return h;
}
// --- v4 systems: AM's seats (end)

// --- v5 wonders: AP the Battlemented Ridge (begin). The north-east crest, bearings 9-57 (the full run 12-54 with
// 3 degrees of taper at each end; 60-85 stays the Vigilant's), is cut into a run of merlons and embrasures: a
// square wave in bearing, period 7.6 degrees (62 m at r 470), a merlon 0.54 of it (4.1 degrees, 34 m), an
// embrasure the rest (28 m). Each merlon's top is flat at the natural crest's height at its centre plus 45 m, less
// 0-2 m of wear; two are broken to half. The embrasure floor is the natural crest, with its pinnacles damped, so
// the notches read as cut and the tops as raised (raising a clean block off a damped crest reads as masonry;
// lowering the notches would leave the natural crest's pinnacles standing above the "wall"). Merlons are 14 m deep
// in r (full height from the crest's r - 6 to + 4, ramping out to r - 10 and + 8), with nothing behind. Edges rise over ~4 m, two samples of the high mesh (2.1 m).
// ?ridge=0 leaves the crest as it was; the heightfield is built once, so a reload.
const RIDGE_ON = !(typeof location !== 'undefined' && new URLSearchParams(location.search).get('ridge') === '0');
const RG = { b0: 8.15, period: 7.6, merlon: 0.54, edge: 0.06, lo: 9, hi: 57, taper: 3, height: 45, kMin: 0, kMax: 6, broken: [2, 5] };
export const RIDGE = { bearings: [RG.lo + RG.taper, RG.hi - RG.taper], merlons: [] };
const ridgeEnv = (b) => smoothstep(RG.lo, RG.lo + RG.taper, b) * (1 - smoothstep(RG.hi - RG.taper, RG.hi, b));
// --- v5 wonders: AP the Battlemented Ridge (end)

// ---------------------------------------------------------------- per-bearing tables
// Everything that varies only with bearing is tabulated once (0.1° steps) and interpolated.
const N = 3600;
const T_CR = new Float32Array(N + 1); // crest radius
const T_CH = new Float32Array(N + 1); // crest height above the floor
const T_CS = new Float32Array(N + 1); // the crest's height without its peaks, for the far ranges to rise behind
const T_FR = new Float32Array(N + 1); // front range: ridge radius
const T_FH = new Float32Array(N + 1); // front range: ridge height (0 where it breaks off)
const SPURS = 40;                     // buttresses round the bowl, about every 9°
const T_PH = new Float32Array(N + 1); // buttress phase: one buttress per unit
const T_SW = new Float32Array(N + 1); // saddle weight
const ring = (az, f, o) => S.noise2(Math.cos(az) * f + o, Math.sin(az) * f - o * 0.7);
const bearingOf = (az) => ((az / D2R + 90) % 360 + 360) % 360;
function peakAt(bearing) {
  let add = 0;
  for (const p of Object.values(PEAKS)) {
    let d = Math.abs(bearing - p.bearing); if (d > 180) d = 360 - d;
    if (p.twin) {
      // two horns 0.55 w either side of the bearing, a notch between
      const a = Math.max(0, 1 - Math.abs(d - p.w * 0.55) / (p.w * 0.6));
      add += p.h * Math.pow(a, 1.3) + p.h * 0.45 * Math.max(0, 1 - d / (p.w * 1.6));
    } else if (p.table) {
      add += p.h * (1 - smoothstep(p.w * 0.55, p.w, d));
    } else add += p.h * Math.pow(Math.max(0, 1 - d / p.w), 1.4);
  }
  return add;
}
for (let i = 0; i <= N; i++) {
  const az = -Math.PI + (TAU * i) / N, b = bearingOf(az);
  // the Vigilant (skylife/vigilant.js) sits on the crest at bearing 72°, r 476: the crest bends out to meet it
  const vig = 1 - smoothstep(4, 11, Math.min(Math.abs(b - 72), 360 - Math.abs(b - 72)));
  T_CR[i] = lerp(452 + 17 * ring(az, 1.6, 3.1) + 7 * ring(az, 5.0, 7.3), 476, vig);
  // the north-west, where the Escarpment Lamps and the Galleries will hang, stands taller
  const nw = smoothstep(262, 285, b) * (1 - smoothstep(330, 345, b));
  T_CS[i] = 186 + 34 * ring(az, 2.2, 11.7) + 14 * ring(az, 6.5, 13.3) + 40 * nw;
  T_CH[i] = T_CS[i] + peakAt(b);
  T_FR[i] = 362 + 12 * ring(az, 3.0, 21.1);
  T_FH[i] = (54 + 28 * ring(az, 4.2, 23.9)) * smoothstep(-0.25, 0.2, ring(az, 2.4, 25.3));
  T_PH[i] = ((az + Math.PI) / TAU) * SPURS + 0.8 * ring(az, 3.0, 31.7);
  T_SW[i] = saddleWeight(az);
}
// --- the massifs (begin). The main wall's form: five massifs with deep cols between them (the header). ?mountains=v4
// builds the v4 wall instead (applyMountains' body and farCrest's below), for comparison. The crest rolls between
// massifs and cols through a periodic spline over bearing (control points below; the named peaks are broad crowns on
// it, not spikes); the face's mean slope follows the crest's height (gentle under the cols, steep under the massifs).
export const PROFILE = (() => {
  const v = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('mountains') : null;
  return v === 'v4' ? 'v4' : 'c';
})();
const CAND = PROFILE === 'c' ? {
  // [bearing, crest height above the floor]; the saddle's gate (237-263) is the saddle's own. The cols: 112° (east),
  // 180° (south-east), 328° (north-west); the sun's saddle at 250° stays the lowest point of the circuit.
  crest: [[8, 190], [20, 210], [45, 255], [72, 270], [94, 240], [104, 140], [112, 52], [120, 140], [132, 225], [150, 275],
    [165, 285], [173, 150], [180, 50], [187, 150], [200, 270], [218, 250], [236, 170], [250, 150], [264, 180], [278, 285], [292, 300], [308, 270],
    [320, 175], [328, 102], [336, 180], [346, 270], [356, 240]],
  peaks: 0.35, slope: [28, 52], farEl: [[8.5, 8], [10.5, 8]],
} : null;
// a periodic Catmull-Rom spline through [bearing, value] points
function splineAt(pts, b) {
  const n = pts.length;
  let i = n - 1;
  for (let k = 0; k < n; k++) if (pts[k][0] > b) { i = k - 1; break; }
  const P = (k) => { const j = ((k % n) + n) % n, w = Math.floor(k / n); return [pts[j][0] + 360 * w, pts[j][1]]; };
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
  let bb = b; if (bb < p1[0]) bb += 360;
  const t = (bb - p1[0]) / (p2[0] - p1[0]);
  // non-uniform tangents, scaled to the segment so uneven spacing does not overshoot
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0])) * (p2[0] - p1[0]), m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0])) * (p2[0] - p1[0]);
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}
// the named peaks as broad crowns on the massifs (no new peaks: the same PEAKS, flattened and widened)
function crownAt(bearing, k) {
  let add = 0;
  for (const p of Object.values(PEAKS)) {
    let d = Math.abs(bearing - p.bearing); if (d > 180) d = 360 - d;
    const w = p.w * 2.6;
    if (d < w) add += p.h * k * Math.pow(Math.cos((d / w) * Math.PI / 2), 2);
  }
  return add;
}
if (CAND) {
  for (let i = 0; i <= N; i++) {
    const az = -Math.PI + (TAU * i) / N, b = bearingOf(az);
    const vig = 1 - smoothstep(4, 11, Math.min(Math.abs(b - 72), 360 - Math.abs(b - 72)));
    T_CS[i] = splineAt(CAND.crest, b) + 9 * ring(az, 1.4, 41.3) + 4 * ring(az, 4.0, 43.9);
    T_CH[i] = T_CS[i] + crownAt(b, CAND.peaks);
    // the crest stands out where it is high, so the high massifs keep a long face; held inside the terrain's square
    const edge = 500 / Math.max(Math.abs(Math.cos(az)), Math.abs(Math.sin(az)));
    T_CR[i] = lerp(clamp(452 + 0.3 * (T_CH[i] - 150) + 12 * ring(az, 1.6, 3.1), 440, edge - 22), 476, vig);
    T_FH[i] = 0; // no front range before the massifs
  }
}
// --- the form (v11): the outline and the spurs. The spline gives each massif its mass; this block breaks the bell.
// The crest's top (the upper third of each face's run and everything behind it) takes FORM: hand-set summits and
// notches, each with a steep side and a long one (a fall from a summit is steeper on one side, as rock breaks), and a
// serration along the whole crest from broken noise (sharp nicks, rounded tops between). It is held to nothing where
// something hangs at the crest (HOLD_CREST) and at the cols' floors, so faceAt below ~0.6 of the run, crestAt at the
// hung bearings, the cols and the Ridge's merlons stay. SPURS push the face toward the bowl along a narrow line from
// under the crest down to the apron: a ridge that comes down at the viewer, broad at its foot, a lit flank and a dark
// one, a shoulder where it leaves the crest; only where nothing hangs on the face (HOLD_FACE); neither spur nor valley
// reaches inside r 352 (walkLimit is 348)
// (walkLimit is 348).
const HOLD_CREST = [[6, 61], [66, 78], [99, 107], [109, 115], [126, 134], [177, 183], [226, 234], [236, 264], [262, 300], [325, 331]];
const HOLD_FACE = [[50, 62], [64, 80], [98, 108], [125, 149], [225, 300], [300, 320], [338, 360], [0, 10]];
function holdOf(list, b, soft) {
  let w = 0;
  for (const [a0, a1] of list) w = Math.max(w, smoothstep(a0 - soft, a0, b) * (1 - smoothstep(a1, a1 + soft, b)));
  return w;
}
// [bearing of the top, height (m), half-width on the low-bearing side, on the high-bearing side (degrees)]; negative
// heights are notches. The SE massif climbs long from its col to the Horn by two shoulders and drops short to the
// col at 180; the south massif rises steeply from that col to the Abbess and runs out long and broken to the
// saddle; the Lectern's table breaks off steep to the north-west col; the Tierce climbs long from that col and falls
// short to the glacier; the Mitre's north horn stands over a notch.
const FORM = [
  // the north-east, between the Vigilant and the Long Figure
  [84, -26, 3, 4], [88, 22, 6, 3.75], [96, 16, 4.5, 3],
  // the south-east: shoulders on the long side, a nick, the Horn pushed up, a short steep fall
  [118, 20, 4.5, 7.5], [152, 30, 9, 3.75], [158, -16, 1.6, 2.2], [160, 22, 3, 3], [165, 26, 9, 5], [172, -40, 2, 3.5],
  // the south: a steep climb to the Abbess, then a long broken run down to the saddle
  [186, -30, 2, 3], [196, 46, 6, 10.5], [205, -38, 2, 2.4], [211, 30, 4.5, 6], [217, -24, 1.5, 2.5], [222, 18, 3.75, 4.5],
  // the west, north of the Galleries: the Lectern's table broken, a nick, a steep fall to the col
  [303, 26, 4.5, 4.5], [309, -28, 1.5, 2], [314, 24, 3, 3], [320, -34, 2, 4],
  // the Tierce: a long shoulder from the col, its top, a short fall to the glacier
  [335, 26, 6, 4.5], [339, -18, 1.5, 2], [350, 34, 10.5, 4.5],
];
const T_FM = new Float32Array(N + 1); // the crest's form, added over the face's top
if (CAND) {
  const bd = (a, c) => ((a - c) % 360 + 540) % 360 - 180;
  for (let i = 0; i <= N; i++) {
    const az = -Math.PI + (TAU * i) / N, b = bearingOf(az);
    let f = 0;
    for (const [fb, fh, w0, w1] of FORM) {
      const d = bd(b, fb), w = d < 0 ? w0 : w1, t = Math.abs(d) / w;
      if (t < 1.6) f += fh * Math.exp(-2.2 * t * t) * (fh < 0 ? 1 : 1 - 0.25 * smoothstep(0.6, 1.6, t));
    }
    // serration: sharp nicks (the abs of noise) with rounded tops, two wavelengths along the arc (~45 m and ~110 m)
    const n1 = Math.abs(ring(az, 14.0, 61.7)), n2 = Math.abs(ring(az, 5.5, 63.1));
    f += 22 * (n2 - 0.35) + 12 * (n1 - 0.35);
    const hold = holdOf(HOLD_CREST, b, 2.5);
    T_FM[i] = f * (1 - hold) * smoothstep(80, 150, T_CS[i]);
  }
}
// The plan: spurs (+, the face pushed toward the bowl) and the valleys between them (-, pulled back into the mass).
// [bearing at the root, push (m), half-width at the root (m), at the foot (m), lean (degrees the line swings from
// root to foot)]. A spur leaves the crest at a shoulder and runs down sharp-backed, broadening; a valley is cut
// deepest at its mouth and closes under the crest, round-floored, so the drainage between the spurs reads.
const SPURS_M = [
  [16, -91, 36, 90, 4], [24, 38, 19, 53, -2], [33, -78, 31, 72, -3], [40, 35, 19, 48, 2], [46, -52, 24, 43, 2],
  [82, -72, 29, 67, 2], [89, 46, 26, 66, 3], [96, -52, 24, 48, -2],
  [118, -39, 24, 48, 0],
  [152, 59, 29, 72, -4], [158, -91, 34, 86, 3], [165, 49, 24, 60, 3], [172, -58, 26, 58, -2],
  [187, -65, 26, 60, 2], [192, 54, 26, 70, 4], [199, -104, 38, 101, -3], [208, 62, 31, 77, -3], [215, -84, 31, 79, 3], [221, 40, 22, 60, 3],
  [322, 35, 22, 55, 3], [334, 46, 24, 62, -3],
];
function sampleForm(az) {
  const q = ((az + Math.PI) / TAU) * N, i = Math.min(N - 1, Math.max(0, Math.floor(q))), f = q - i;
  return T_FM[i] + (T_FM[i + 1] - T_FM[i]) * f;
}
function spurPush(b, r, Rc) {
  let push = 0, pull = 0;
  const t = clamp((Rc - r) / 150, 0, 1); // 0 at the crest, 1 at the foot
  for (const [sb, sp, w0, w1, lean] of SPURS_M) {
    let db = b - sb; if (db > 180) db -= 360; if (db < -180) db += 360;
    if (Math.abs(db) > 24) continue;
    const edge = 1 - smoothstep(18, 24, Math.abs(db)); // fades out before the cutoff, so a wide foot leaves no step
    const across = Math.abs(db - lean * t + 1.2 * S.noise2(r * 0.013, sb)) * D2R * r;
    const w = lerp(w0, w1, t);
    if (across > w) continue;
    if (sp > 0) {
      const prof = smoothstep(Rc - 8, Rc - 70, r) * (1 - 0.35 * smoothstep(0.55, 1, t)); // a shoulder leaving the crest, weaker at the foot
      push = Math.max(push, sp * prof * Math.pow(1 - across / w, 1.15) * edge);
    } else {
      const prof = smoothstep(Rc - 10, Rc - 100, r); // closes under the crest, deepest at the mouth
      const c = across / w;
      pull = Math.max(pull, -sp * prof * (1 - c * c) * (1 - c * c) * edge);
    }
  }
  return (push * smoothstep(352, 395, r) - pull * smoothstep(352, 390, r)) * (1 - holdOf(HOLD_FACE, b, 3));
}
// --- the form (end)
// --- the massifs (end; applyMassifs and the far ranges' hook below)
// --- v5 wonders: AP (begin): each merlon's flat top (natural crest height at its centre + 45 m, less wear)
for (let k = RG.kMin - 1; k <= RG.kMax + 1; k++) {
  const bc = RG.b0 + (k + RG.merlon / 2) * RG.period, i = Math.round(((bc - 90) * D2R + Math.PI) / TAU * N);
  const wear = RG.broken.includes(k) ? 0.5 : 1 - 0.06 * hash2(k + 40, 77); // 0-2 m of wear; two broken to half
  RIDGE.merlons.push({ k, bearing: bc, top: T_CH[i] + RG.height * wear * ridgeEnv(bc) });
}
// --- v5 wonders: AP (end)
const _b = { cr: 0, ch: 0, fr: 0, fh: 0, ph: 0, sw: 0 };
function sampleBearing(az) {
  const u = ((az + Math.PI) / TAU) * N;
  const i = Math.min(N - 1, Math.max(0, Math.floor(u))), f = u - i;
  _b.cr = T_CR[i] + (T_CR[i + 1] - T_CR[i]) * f;
  _b.ch = T_CH[i] + (T_CH[i + 1] - T_CH[i]) * f;
  _b.fr = T_FR[i] + (T_FR[i + 1] - T_FR[i]) * f;
  _b.fh = T_FH[i] + (T_FH[i + 1] - T_FH[i]) * f;
  _b.ph = T_PH[i] + (T_PH[i + 1] - T_PH[i]) * f;
  _b.sw = T_SW[i] + (T_SW[i + 1] - T_SW[i]) * f;
  return _b;
}

// polynomial smooth max: meets two shapes without a crease
function smax(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return lerp(a, b, h) + k * h * (1 - h);
}

// The Tumbling Water's wall (plan, section 4): the face behind the pool stands 65 m or more within 15 m of the
// lip, so the river agent can raise the fall into it. Bearing of the lip, about 141°.
const FALL_AZ = Math.atan2(258, 208);

// ---------------------------------------------------------------- the heightfield
// h: the floor's height at (x, z) before the walls; r = hypot(x, z); g, glacierH: the glacier's notch (its
// mask and its own surface, from terrain.js) cuts through every tier of the walls as before.
export function applyMountains(h, x, z, r, g, glacierH) {
  if (r < M_START) return h;
  if (CAND) return applyMassifs(h, x, z, r, g, glacierH); // the massifs; below, the v4 wall (?mountains=v4)
  const az = Math.atan2(z, x);
  const B = sampleBearing(az);
  const Rc = B.cr, Hc = B.ch, sw = B.sw;
  // buttresses: sharp arêtes, broad gullies, each its own strength; they wander as they climb
  const ph = B.ph + 0.22 * S.noise2(r * 0.012, az * 3.0);
  const fl = Math.floor(ph), s = Math.abs(ph - fl - 0.5) * 2; // 0 on a buttress's crest, 1 in a gully
  const spA = 0.4 + 0.6 * hash2(((fl % SPURS) + SPURS) % SPURS, 913);
  const sp = (1 - Math.pow(s, 0.75)) * spA;
  // the main wall's foot: out along the buttresses; behind the front range where there is one, so a trough
  // lies between them and the front range stands clear against the face
  let foot = Math.max(318, Rc - 125 - 60 * sp);
  foot = lerp(foot, Math.max(foot, B.fr + 16 - 20 * sp), smoothstep(12, 32, B.fh));
  const span = Rc - foot;
  // the profile: a concave lower slope up to a bench (the Annals' band, 100-140 m, rides the cliff above it),
  // then the upper cliff to the crest; behind the crest it falls away out of sight
  const yb = Math.min(108, 0.6 * Hc) + 5 * S.noise2(az * 4.0, 1.7);
  const rb = foot + span * 0.4, rb2 = rb + span * 0.1;
  let m;
  if (r <= foot) m = 0;
  else if (r < rb) m = yb * Math.pow((r - foot) / (rb - foot), 1.6);
  else if (r < rb2) m = yb + 6 * (r - rb) / (rb2 - rb);
  else if (r <= Rc) m = yb + 6 + (Hc - yb - 6) * Math.pow((r - rb2) / (Rc - rb2), 1.1);
  else m = Math.max(Hc * 0.55, Hc - (r - Rc) * 1.3);
  const u = clamp((r - foot) / span, 0, 1);
  // arêtes and pinnacles on the upper face and the crest, sharper than the far ranges carry
  const up = smoothstep(0.45, 1.0, u);
  // (pinnacles rise from the crest line; the troughs between stay broad, not a saw)
  const rEnv = RIDGE_ON ? ridgeEnv(bearingOf(az)) : 0; // v5 wonders: AP (the run's weight)
  m += (Math.max(0, S.ridged2(x * 0.011 + 3.1, z * 0.011 - 7.7, 4) - 0.32) * 52 - 5 + S.fbm2(x * 0.006, z * 0.006, 3) * 14) * up * (1 - 0.85 * rEnv * smoothstep(0.85, 1, u));
  m += S.noise2(x * 0.08, z * 0.08) * 2.2 * u;
  // bedding: ledges every 11 m that dip gently east-north-east, so strata run across the faces and the
  // buttresses alike instead of following the noise
  const face = smoothstep(0.05, 0.25, u) * (1 - sw);
  if (face > 0) {
    const dip = x * 0.045 - z * 0.02, st = 11;
    const q = (m + dip) / st, qf = Math.floor(q), t = q - qf;
    m = lerp(m, (qf + t * t * t) * st - dip, 0.45 * face);
  }
  // the front range: a broken line of lower ridges standing in front of the main wall
  if (B.fh > 0.5) {
    const d = Math.abs(r - B.fr);
    if (d < 42) m = smax(m, B.fh * Math.pow(1 - d / 42, 1.2) * (0.72 + 0.56 * S.ridged2(x * 0.026 + 9, z * 0.026 + 1, 3)), 5);
  }
  // talus: fans of scree spilling from the gullies' mouths onto the floor
  m = smax(m, 28 * Math.pow(s, 0.8) * (0.55 + 0.45 * spA) * Math.pow(smoothstep(Math.max(296, foot - 60), foot + 14, r), 2), 4);
  // the apron: the floor tilts up into the wall
  m = smax(m, 9 * smoothstep(290, 350, r), 3);
  // the fall's wall
  {
    const da = Math.abs(angDiff(az, FALL_AZ));
    if (da < 0.16) m = smax(m, 76 * smoothstep(340, 356, r) * (1 - smoothstep(0.07, 0.16, da)), 4);
  }
  // --- v5 wonders: AP the Battlemented Ridge (begin): the merlons, raised off the damped crest (see the head block)
  if (rEnv > 0) {
    const t = (bearingOf(az) - RG.b0) / RG.period, k = Math.floor(t), f = t - k;
    const rm = smoothstep(Rc - 10, Rc - 6, r) * (1 - smoothstep(Rc + 4, Rc + 8, r));
    const bm = smoothstep(0, RG.edge, f) * (1 - smoothstep(RG.merlon - RG.edge, RG.merlon, f));
    if (rm * bm > 0) {
      const M = RIDGE.merlons[k - (RG.kMin - 1)];
      if (M) m = lerp(m, Math.max(m, M.top + S.noise2(x * 0.15, z * 0.15) * 0.5), rm * bm);
    }
  }
  // --- v5 wonders: AP (end)
  m *= smoothstep(M_START, M_START + 18, r); // no seam where the walls begin
  // the saddle: a flat-floored gate; the moor's roll damps out across its floor
  if (sw > 0) {
    const hs = saddleFloor(r) + S.noise2(x * 0.025, z * 0.025) * 2 * smoothstep(330, 420, r);
    m = lerp(m, hs, sw);
    h *= 1 - 0.65 * sw * smoothstep(296, 340, r);
  }
  if (g > 0) m = lerp(m, glacierH, g);
  return seatHeights(h + m, x, z);
}

// --- the massifs (begin): the heightfield (see the tables' block). The face: from a foot set by the crest's height
// and the mean slope that height asks for (CAND.slope, from the cols' to the massifs'), a long concave toe, a steeper middle and a convex shoulder rounding over the crest.
// The face's structure at three sizes:
//   the big form: a scree apron at 33° from the foot (lighter, smooth), a steep rock band standing behind it (a
//     clear break of slope where they meet), a convex shoulder rounding over into the crest; corries (CORRIES)
//     scooped high in the north- and east-facing faces, a lip below and a headwall under the crest;
//   the middle: bedding, ledges every 13-17 m along a plane tilted 4-7° (MASSIFS: one dip per massif, another
//     across the next col), a few deep gullies from the crest to the apron (GULLIES), each with a heavier scree fan
//     at its mouth, and the buttress rhythm only where the face's mean slope passes ~50°;
//   the small: creased facets (ridged noise, ~45 m) so the low sun picks out planes, and the old noise octaves low.
const TAN_SCREE = Math.tan(33 * D2R);
// [first bearing, last bearing, dip (dy/dx, dy/dz), ledge step (m)]; the cols between blend from one to the next
export const MASSIFS = [[20, 100, 0.07, -0.06, 15], [125, 172, -0.05, -0.08, 17], [190, 235, 0.09, 0.03, 14], [264, 318, -0.04, 0.1, 16], [336, 356, 0.08, 0.05, 13]];
// [bearing, half-width at the crest (m), depth (m)]: clear of the Gradine (54), the Vigilant (72), the Span (130,
// 230), the fall (133-145), the Galleries (268-296), the Hawser (342) and the glacier (354-20)
const GULLIES = [[40, 14, 20], [88, 12, 16], [153, 13, 18], [166, 11, 14], [199, 14, 20], [214, 12, 16], [305, 13, 18], [314, 11, 15]];
// [bearing, half-width (degrees), push back (fraction of the face's run)]: the south massif's north face, the
// south-east massif's north-west face, the west massif's east face north of the Galleries
const CORRIES = [[158, 6.5, 0.22], [207, 8, 0.26], [308, 6.5, 0.22]];
const T_DX = new Float32Array(N + 1), T_DZ = new Float32Array(N + 1), T_ST = new Float32Array(N + 1);
if (CAND) {
  const bd = (a, b) => ((a - b) % 360 + 540) % 360 - 180;
  for (let i = 0; i <= N; i++) {
    const b = bearingOf(-Math.PI + (TAU * i) / N);
    // the massif this bearing belongs to (or the two a col lies between, blended across it)
    let best = 0, w = 0, dx = 0, dz = 0, st = 0;
    for (const [b0, b1, mx, mz, ms] of MASSIFS) {
      const mid = (b0 + b1) / 2, half = (b1 - b0) / 2;
      const d = Math.abs(bd(b, mid));
      const k = Math.pow(Math.max(1e-3, 1 - smoothstep(half, half + 14, d)), 2) + 1e-6 / (1 + d);
      dx += mx * k; dz += mz * k; st += ms * k; w += k; best = Math.max(best, k);
    }
    T_DX[i] = dx / w; T_DZ[i] = dz / w; T_ST[i] = st / w;
  }
}
function applyMassifs(h, x, z, rTrue, g, glacierH) {
  const az = Math.atan2(z, x);
  const B = sampleBearing(az);
  const Rc = B.cr, Hc = B.ch, sw = B.sw;
  const b = bearingOf(az);
  const r = rTrue + spurPush(b, rTrue, Rc); // v11 the form: a spur is the face pushed toward the bowl (the face's code sees it as nearer the crest)
  const slope = lerp(CAND.slope[0], CAND.slope[1], smoothstep(70, 280, Hc)) * D2R;
  const foot = Math.max(298, Rc - Hc / Math.tan(slope) + 14 * S.noise2(az * 2.6, 5.3)); // the apron's toe
  const steep = smoothstep(46, 58, Math.atan2(Hc, Rc - foot) / D2R); // 0 on an easy face, 1 on a steep one
  const span = Rc - foot;
  const u = clamp((r - foot) / span, 0, 1);
  // buttresses, only where the face is steep: they push the rock band out over the apron
  const ph = B.ph + 0.22 * S.noise2(r * 0.012, az * 3.0);
  const fl = Math.floor(ph), s = Math.abs(ph - fl - 0.5) * 2;
  const spA = 0.4 + 0.6 * hash2(((fl % SPURS) + SPURS) % SPURS, 913);
  const sp = (1 - Math.pow(s, 0.75)) * spA * steep;
  // the gullies: across-distance (m) from each one's line, which wanders as it climbs
  let gul = 0, fan = 0;
  for (const [gb, gw, gd] of GULLIES) {
    const w = gw * (0.55 + 0.45 * u);
    let db = b - gb; if (db > 180) db -= 360; if (db < -180) db += 360;
    if ((Math.abs(db) - 1.6) * D2R * r >= w * 2.2) continue; // out of reach even at the line's widest wander (±1.6°)
    db -= 1.6 * S.noise2(r * 0.011, gb * 0.37); if (db > 180) db -= 360; if (db < -180) db += 360;
    const d = Math.abs(db) * D2R * r;
    if (d < w * 2.2) {
      const v = Math.max(0, 1 - d / w);
      gul = Math.max(gul, gd * Math.pow(v, 1.4) * (0.4 + 0.6 * steep));
      fan = Math.max(fan, (1 - smoothstep(w * 0.6, w * 2.2, d)) * (0.4 + 0.6 * steep));
    }
  }
  // corries: the face pushed back in a bowl high on the face, so a lip stands below and a headwall above
  let push = 0;
  for (const [cb, cw, ck] of CORRIES) {
    let db = Math.abs(b - cb); if (db > 180) db = 360 - db;
    if (db < cw) push = Math.max(push, ck * span * Math.pow(Math.cos((db / cw) * Math.PI / 2), 2));
  }
  const re = r - push * smoothstep(0.22, 0.55, u) * (1 - smoothstep(0.78, 0.96, u));
  // the apron: scree at 33° from the foot up to Ha, heavier under the steep faces and at the gullies' mouths
  const Ha = Hc * (0.1 + 0.1 * steep) * (0.8 + 0.25 * fan + 0.25 * S.noise2(az * 9.0, 2.9));
  const r0 = foot + 0.75 * Ha / TAN_SCREE; // the rock band's foot, behind the apron's top
  const H0 = 0.55 * Ha;
  // the profile along the run: easy faces a concave toe into a convex shoulder; steep ones a band steepest at its
  // foot, rounding over into the crest; past the crest the shoulder rounds over, then falls away
  const P = (q) => {
    if (q > Rc) { const d = q - Rc; return Math.max(Hc * 0.6, Hc - 0.5 * Math.min(d, 30) - 1.1 * Math.max(0, d - 30)); }
    if (q < r0) return H0 - (r0 - q) * 3;
    const v = (q - r0) / (Rc - r0);
    return H0 + (Hc - H0) * lerp(lerp(Math.pow(v, 1.7), v * v * (3 - 2 * v), 0.6), lerp(v, 1 - Math.pow(1 - v, 2.4), 0.55), steep);
  };
  const face = smoothstep(0.08, 0.3, u) * (1 - smoothstep(0.94, 1, u)); // the rock face, not the crest's rounding
  // The face's relief moves it in and out (r), not up and down, so a steep face keeps its planes instead of taking
  // noise stretched down its height; the relief's noise runs in the face's own chart (along the arc, up the face).
  const up0 = P(re), along = az * Rc;
  let dr = 9 * sp - 4 * Math.pow(s, 1.5) * steep * smoothstep(0.15, 0.6, u); // the buttresses and their gullies
  dr -= gul * smoothstep(0.05, 0.25, u) * (1 - smoothstep(0.93, 1.02, u)); // the gullies, crest to apron
  dr += (S.ridged2(along * 0.018 + 7.1, up0 * 0.04 - 3.3, 2) - 0.55) * 8 * face * (0.4 + 0.6 * steep); // facets, wider than tall
  dr += S.fbm2(along * 0.011 + 1.3, up0 * 0.011 - 2.1, 3) * 14 * face; // ribs and bays
  let m = P(re + dr);
  // the small: the old pinnacles at a quarter of v4's height and twice its wavelength, on the crest only (it stays
  // rounded); the broad roll and the fine noise, low
  const up = smoothstep(0.6, 1.0, u);
  const rEnv = RIDGE_ON ? ridgeEnv(b) : 0; // AP's run, as in applyMountains
  m += (Math.max(0, S.ridged2(x * 0.0055 + 3.1, z * 0.0055 - 7.7, 3) - 0.4) * 13 - 1 + S.fbm2(x * 0.004, z * 0.004, 3) * 7) * up * (1 - 0.85 * rEnv * smoothstep(0.85, 1, u));
  m += S.noise2(x * 0.06, z * 0.06) * 1.2 * u + S.fbm2(x * 0.018 + 4.4, z * 0.018, 3) * 2.5 * u;
  m += S.fbm2(x * 0.009 + 1.3, z * 0.009 - 2.1, 3) * 6 * u * (1 - 0.7 * u);
  // bedding: treads and risers along the massif's tilted plane, on the rock (the apron covers their feet)
  const bed = face * (1 - sw) * (0.3 + 0.7 * steep);
  if (bed > 0) {
    const ui = Math.min(N - 1, Math.max(0, Math.floor(((az + Math.PI) / TAU) * N)));
    const dip = x * T_DX[ui] + z * T_DZ[ui], st = T_ST[ui];
    const q = (m + dip) / st, qf = Math.floor(q), t = q - qf;
    m = lerp(m, (qf + Math.pow(t, 4)) * st - dip, 0.6 * bed);
  }
  // the apron meets the band in a crease, its top soft
  if (r > foot - 6) {
    const cone = (r - foot) * TAN_SCREE * (1 + 0.06 * S.noise2(x * 0.05, z * 0.05));
    m = smax(m, -smax(-cone, -Ha * 1.15, 10), 3); // the cone, its top capped softly
  }
  m = Math.max(m, 0);
  m += sampleForm(az) * lerp(smoothstep(0.62, 1.0, u), smoothstep(0.12, 1.0, u), 1 - holdOf(HOLD_FACE, b, 3)) * smoothstep(352, 390, rTrue); // v11 the form: the crest's summits, notches and serration, over the face's top (all the face where nothing hangs on it), nothing inside r 352 (walkLimit 348, and one cell of the low mesh)
  // the apron, the fall's wall, AP's merlons, the seam, the saddle, the glacier and the seats: as applyMountains
  m = smax(m, 9 * smoothstep(290, 350, r), 3);
  {
    const da = Math.abs(angDiff(az, FALL_AZ));
    if (da < 0.16) m = smax(m, 76 * smoothstep(340, 356, r) * (1 - smoothstep(0.07, 0.16, da)), 4);
  }
  if (rEnv > 0) {
    const t = (bearingOf(az) - RG.b0) / RG.period, k = Math.floor(t), f = t - k;
    const rm = smoothstep(Rc - 10, Rc - 6, r) * (1 - smoothstep(Rc + 4, Rc + 8, r));
    const bm = smoothstep(0, RG.edge, f) * (1 - smoothstep(RG.merlon - RG.edge, RG.merlon, f));
    if (rm * bm > 0) {
      const M = RIDGE.merlons[k - (RG.kMin - 1)];
      if (M) m = lerp(m, Math.max(m, M.top + S.noise2(x * 0.15, z * 0.15) * 0.5), rm * bm);
    }
  }
  m *= smoothstep(M_START, M_START + 18, r);
  if (sw > 0) {
    const hs = saddleFloor(r) + S.noise2(x * 0.025, z * 0.025) * 2 * smoothstep(330, 420, r);
    m = lerp(m, hs, sw);
    h *= 1 - 0.65 * sw * smoothstep(296, 340, r);
  }
  if (g > 0) m = lerp(m, glacierH, g);
  return seatHeights(h + m, x, z);
}
// The far ranges behind the massifs (v11): ranges of their own, not the near crest smoothed (that read as an echo).
// Each ring's crest is an envelope of lobes, [bearing, half-width, the steep side (-1 low bearings, +1 high)], over
// a floor elevation (degrees seen from the bowl's centre, CAND.farEl), so it stands below the massifs in the picture
// and above the cols; the nearer ring sets a massif behind each near col (112, 180, 328), the farthest's lobes fall
// between. Under the envelope the ground is a warped ridged field in plan (farHeight), so each range has ridges
// running out in every direction, spurs and valleys the low sun lights on one side and leaves dark on the other.
const FAR_LOBES = {
  far: [[30, 16, 1], [74, 13, -1], [112, 14, 1], [150, 14, -1], [180, 11, 1], [214, 14, -1], [292, 15, 1], [328, 12, -1], [356, 10, 1]],
  farthest: [[8, 14, -1], [52, 15, 1], [94, 13, 1], [132, 14, -1], [198, 15, 1], [282, 13, -1], [310, 12, 1], [344, 13, -1]],
};
function farLobe(T, b) {
  let w = 0;
  for (const [lb, lw, side] of FAR_LOBES[T.name]) {
    let d = b - lb; if (d > 180) d -= 360; if (d < -180) d += 360;
    const ww = lw * (Math.sign(d) === side ? 0.6 : 1.4); // a short steep side and a long one
    if (Math.abs(d) < ww) w = Math.max(w, Math.pow(Math.cos((Math.abs(d) / ww) * Math.PI / 2), 1.1));
  }
  return w;
}
function farCrestMassifs(T, az, out) {
  const rc = T.rc + T.rcv * ring(az, 1.3, T.seed);
  const [el0, el1] = CAND.farEl[T.name === 'far' ? 0 : 1];
  const elev = (el0 + el1 * farLobe(T, bearingOf(az)) + 1.6 * ring(az, 2.3, T.seed + 3) + 1.1 * ring(az, 7.0, T.seed + 5)) * D2R;
  let hc = Math.tan(elev) * rc;
  const d = Math.abs(angDiff(az, SADDLE.azimuth));
  hc = lerp(T.floor, hc, smoothstep(T.full * D2R, T.wall * D2R, d));
  out.rc = rc; out.hc = hc;
  return out;
}
// the far ground under its envelope: 0..~1.1 of the crest's height, ridges in plan at about T.grain metres
const _fr = { y: 0, ridge: 0 };
function farMassifs(T, az, r, out) {
  const { rc, hc } = farCrestMassifs(T, az, _fc);
  const x = Math.cos(az) * r, z = Math.sin(az) * r, D = T.r1 - T.r0;
  const env = Math.pow(smoothstep(T.r0, rc - 0.12 * D, r), 1.2) * (1 - 0.5 * smoothstep(rc + 0.05 * D, T.r1, r));
  const f = 1 / T.grain;
  const wx = x + T.grain * S.noise2(x * f * 0.3 + T.seed, z * f * 0.3), wz = z + T.grain * S.noise2(x * f * 0.3, z * f * 0.3 - T.seed);
  // ridges at the grain (two octaves: more reads as a saw of spikes at this distance), their height varied by a
  // broad swell so the tops along a crest are not a row of equal teeth, and a finer set of ribs on the flanks
  const R = S.ridged2(wx * f + T.seed * 0.37, wz * f - T.seed * 0.21, 2) / 0.75; // 0..~1: sharp ridges, broad valleys
  const B = S.fbm2(x * f * 0.4 - T.seed, z * f * 0.4, 2);                          // -1..1, about 2.5 grains across
  const Rf = S.ridged2(wx * f * 2.7 - T.seed, wz * f * 2.7 + 3.3, 1);
  const ridge = R * (0.55 + 0.45 * smoothstep(-0.5, 0.5, B));
  out.ridge = 0.8 * R + 0.2 * Rf;
  out.y = hc * env * (0.5 + 0.55 * ridge + 0.14 * B + 0.08 * Rf * (1 - R)) - 30 * (1 - smoothstep(T.r0, T.r0 + 80, r)); // the inner edge tucks below the floor
  return out;
}
const FAR_PALE = new THREE.Color('#8e8a99'); // the far ranges paled toward the haze
// --- the massifs (end)

// ---------------------------------------------------------------- the far ranges (tiers 2 and 3)
// Each far range stands a few degrees higher, seen from the bowl's centre, than the main crest in front of it
// (its peaks left out), so it shows as a band above it: lift is that margin in degrees, with its spread.
const FAR = [
  // crest radius and spread, lift over the main crest (degrees) and spread, inner and outer radius,
  // saddle floor and gate (degrees)
  { name: 'far', rc: 800, rcv: 50, lift: 2.6, liftv: 1.6, r0: 560, r1: 1040, floor: 55, full: 9, wall: 17, seed: 51, rows: 30, grain: 230 },
  { name: 'farthest', rc: 1350, rcv: 80, lift: 5.4, liftv: 2.2, r0: 1080, r1: 1740, floor: 95, full: 11, wall: 22, seed: 67, rows: 30, grain: 360 },
];
function farCrest(T, az, out) {
  if (CAND) return farCrestMassifs(T, az, out); // the massifs; below, the v4 far crest
  const u = ((az + Math.PI) / TAU) * N, i = Math.min(N - 1, Math.max(0, Math.floor(u))), f = u - i;
  const hs = T_CS[i] + (T_CS[i + 1] - T_CS[i]) * f, rs = T_CR[i] + (T_CR[i + 1] - T_CR[i]) * f;
  const rc = T.rc + T.rcv * ring(az, 1.3, T.seed);
  const elev = Math.atan2(hs, rs) + (T.lift + T.liftv * ring(az, 3.1, T.seed + 3)) * D2R;
  let hc = Math.tan(elev) * rc;
  const d = Math.abs(angDiff(az, SADDLE.azimuth));
  hc = lerp(T.floor, hc, smoothstep(T.full * D2R, T.wall * D2R, d));
  out.rc = rc; out.hc = hc;
  return out;
}
const _fc = { rc: 0, hc: 0 };
function farHeight(T, az, r) {
  if (CAND) return farMassifs(T, az, r, _fr).y;
  const { rc, hc } = farCrest(T, az, _fc);
  const u = r <= rc ? smoothstep(T.r0, rc, r) : 1 - smoothstep(rc, T.r1, r) * 0.55;
  let y = hc * (r <= rc ? Math.pow(u, 1.5) : u);
  // coarse arêtes: the far ranges are smoother than the near (the air takes the detail)
  const x = Math.cos(az) * r, z = Math.sin(az) * r;
  // broad massifs, then a little crest texture (ridged noise alone hangs from the sky like stalactites)
  y += S.fbm2(x * 0.0032 + T.seed, z * 0.0032, 4) * hc * 0.16 * smoothstep(0.25, 1, u);
  y += (S.ridged2(x * 0.011 - T.seed, z * 0.011, 3) - 0.45) * hc * (CAND ? 0.08 : 0.045) * smoothstep(0.2, 1, u); // the massifs: more crest silhouette, as the far ranges stand in the open through the cols
  return y - 30 * (1 - smoothstep(T.r0, T.r0 + 80, r)); // the inner edge tucks below the floor, out of sight
}
function buildRing(ctx, T) {
  const low = ctx.quality === 'low';
  // v11: more cells, evenly spaced in r, so the ridges in plan have room (medium/high 1200x56, low 720x30 a ring)
  const nA = CAND ? (low ? 720 : 1200) : (low ? 540 : 900), nR = CAND ? (low ? 30 : 56) : (low ? 18 : T.rows);
  const pos = new Float32Array((nA + 1) * (nR + 1) * 3), col = new Float32Array((nA + 1) * (nR + 1) * 3);
  const cRock = new THREE.Color('#5a535c'), cHigh = new THREE.Color('#77717c'), cSnow = new THREE.Color('#a2a2b4'), c = new THREE.Color();
  const cGully = new THREE.Color(T.name === 'far' ? '#302c3a' : '#3e3c4c'), cRib = new THREE.Color(T.name === 'far' ? '#867a80' : '#86828e');
  let k = 0;
  for (let i = 0; i <= nA; i++) {
    const az = -Math.PI + (TAU * i) / nA;
    for (let j = 0; j <= nR; j++) {
      const v = j / nR;
      if (CAND) {
        // the far ranges: rock darker in the valleys and pale on the ridges (the ridged field's value), snow on the
        // farthest's high ridges only, all paled a step toward the haze (the fog tiers do the rest)
        const r = T.r0 + (T.r1 - T.r0) * v, F = farMassifs(T, az, r, _fr), hc = _fc.hc;
        pos[k] = Math.cos(az) * r; pos[k + 1] = F.y; pos[k + 2] = Math.sin(az) * r;
        c.copy(cGully).lerp(cRib, smoothstep(0.15, 0.7, F.ridge));
        c.lerp(cSnow, smoothstep(0.78, 0.98, F.y / hc + 0.1 * S.noise2(pos[k] * 0.006, pos[k + 2] * 0.006)) * smoothstep(0.45, 0.7, F.ridge) * (T.name === 'farthest' ? 0.7 : 0.25));
        c.lerp(FAR_PALE, T.name === 'far' ? 0.15 : 0.3);
        col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
        k += 3;
        continue;
      }
      // rows denser toward the crest
      const r = T.r0 + (T.r1 - T.r0) * (0.5 - 0.5 * Math.cos(v * Math.PI));
      const y = farHeight(T, az, r);
      pos[k] = Math.cos(az) * r; pos[k + 1] = y; pos[k + 2] = Math.sin(az) * r;
      const hc = farCrest(T, az, _fc).hc;
      c.copy(cRock).lerp(cHigh, smoothstep(hc * 0.35, hc * 0.8, y));
      c.lerp(cSnow, smoothstep(hc * 0.85, hc * 1.02, y + 0.08 * hc * S.noise2(pos[k] * 0.01, pos[k + 2] * 0.01)) * (T.name === 'farthest' ? 0.8 : 0.4));
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
      k += 3;
    }
  }
  const idx = [];
  for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) {
    const a = i * (nR + 1) + j, b = a + nR + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1); // counter-clockwise seen from above
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  if (CAND) {
    // v11: the sun's side baked into the colour too, so the far ranges keep a bright side and a shadow side under
    // the fog tiers: warmed and lifted where a slope faces the low sun, cooled and dropped where it turns away
    const nrm = geo.getAttribute('normal').array, sd = SUN.dir, warm = new THREE.Color(PALETTE.sunLight);
    for (let q = 0; q < col.length; q += 3) {
      const ndl = nrm[q] * sd.x + nrm[q + 1] * sd.y + nrm[q + 2] * sd.z;
      const lit = smoothstep(-0.1, 0.6, ndl), sh = 0.45 + 0.85 * lit;
      col[q] = col[q] * sh + warm.r * 0.02 * lit; col[q + 1] = col[q + 1] * sh + warm.g * 0.02 * lit; col[q + 2] = col[q + 2] * (sh * 0.92 + 0.08) + warm.b * 0.02 * lit;
    }
  }
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  mesh.name = `ranges-${T.name}`;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  return mesh;
}

// ---------------------------------------------------------------- ctx.mountains
// Builds the far ranges and returns the walls' API for the modules that sit things on them.
export function buildMountains(ctx) {
  const rings = FAR.map((T) => buildRing(ctx, T));
  for (const m of rings) ctx.scene.add(m);
  const terrain = ctx.terrain;
  const azOf = (bearing) => (bearing - 90) * D2R;
  return {
    saddle: SADDLE, seats: SEATS, peaks: PEAKS, ranges: rings, far: FAR, profile: PROFILE,
    walkLimit, saddleWeight, saddleFloor,
    // the main crest along a compass bearing: its radius and the ground's height there
    crestAt(bearing, out = { x: 0, z: 0, r: 0, y: 0 }) {
      const az = azOf(bearing); sampleBearing(az);
      // the crest radius is the shape's; search ±25 m for the rendered high point (the noise moves it)
      let best = -Infinity, br = _b.cr;
      for (let r = _b.cr - 25; r <= _b.cr + 25; r += 2.5) { const y = terrain.heightAt(Math.cos(az) * r, Math.sin(az) * r); if (y > best) { best = y; br = r; } }
      out.r = br; out.y = best; out.x = Math.cos(az) * br; out.z = Math.sin(az) * br;
      return out;
    },
    // the first point on the inner face, walking out along a bearing, where the ground reaches height y
    // (for things hung on the wall at a height: the Annals' band, the Galleries, the Lamps); null if the
    // wall never gets that high on that bearing
    faceAt(bearing, y, out = { x: 0, z: 0, r: 0, y: 0 }) {
      const az = azOf(bearing), cx = Math.cos(az), cz = Math.sin(az);
      let prev = -Infinity;
      for (let r = M_START; r <= 520; r += 2) {
        const h = terrain.heightAt(cx * r, cz * r);
        if (h >= y) {
          const rr = prev > -Infinity ? r - 2 + 2 * (y - prev) / Math.max(1e-3, h - prev) : r;
          out.r = rr; out.y = y; out.x = cx * rr; out.z = cz * rr;
          return out;
        }
        prev = h;
      }
      return null;
    },
    // the far ranges' surface (tier 2 or 3) at a bearing and radius, for anything set on them
    farHeightAt(tier, bearing, r) { return farHeight(FAR[tier - 2], azOf(bearing), r); },
  };
}

