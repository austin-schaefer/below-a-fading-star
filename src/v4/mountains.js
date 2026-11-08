// The walls (v4 systems, BI: the Recession of Ranges). The bowl's mountains as ranges in depth instead of one
// fractal wall:
//   tier 0, the front range: a broken line of lower ridges at r ~362, dark and sharp, standing in front of
//   tier 1, the main wall: a steep face from r ~320 to a crest at r ~430-475, its foot pushed out along
//          buttresses (arêtes every ~6°) with gullies between, talus fans at the gullies' mouths, bedding
//          ledges that dip gently east-north-east across the faces, and the named peaks (PEAKS in world.js)
//          on the crest; both live in the heightfield (terrain.js calls applyMountains in a marked block);
//   tiers 2 and 3, the far ranges: two rings of mesh beyond the terrain (crests at r ~820 and ~1380) that
//          rise above the main crest, each paler under the fog tiers (kit/fog.js), the last nearly the sky.
// The sun's saddle is a flat-floored gate ±8° wide at the floor, its walls rising to full height by ±13°, with
// a walkable wedge (±4.5°) out to the road's start at r 366 and two flat seats for AM's colossi on its flanks
// (the marked block below). Every range dips in the saddle, below the line from the gate over the col, so
// the sun and the Parhelion City keep the gap. Deterministic: no rng, only seeded noise.
import * as THREE from 'three';
import { makeSimplex, hash2, clamp, lerp, smoothstep } from '../noise.js';
import { WORLD, SUN, PEAKS } from '../world.js';

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
// --- v5 study: the mountains' candidate profiles (begin). ?mountains=a|b|c swaps the main wall's form for one of
// three candidates (wilderness-mountains-study.md); no flag, or ?mountains=v4, keeps the walls above exactly. Each
// candidate is one organic barrier instead of a wall: a crest that rolls between massifs and cols through a periodic
// spline over bearing (control points below; the named peaks become broad crowns on it, not spikes), a face whose
// mean slope follows the crest's height (gentle under the cols, steeper under the massifs, never a continuous cliff),
// the old pinnacles kept only as texture (amplitude under half, wavelength about double), buttresses and bedding only
// where a face is steep. Every candidate keeps the sun's saddle (the lowest col), AM's seats, the glacier's notch,
// the fall's wall, AP's merlons, walkLimit and M_START. The far ranges follow the same form, smoothed and lower in
// the picture, so they show over the cols and the low shoulders.
//   a, the rolling range: crest 120-260 m on five long waves, cols at 180 and 328 (floors ~75 m), foothills for a front range;
//   b, the shouldered range: a, with four spurs running down to toes at r ~310 and no front range;
//   c, the massifs: five massifs 220-300 m, cols at 112, 180 and 328 (floors ~50 m), scree at the feet.
const PROFILE = (() => {
  const v = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('mountains') : null;
  return v === 'a' || v === 'b' || v === 'c' ? v : 'v4';
})();
const CANDIDATES = {
  a: {
    // [bearing, crest height above the floor]; the saddle's gate (237-263) is the saddle's own
    crest: [[0, 165], [35, 215], [72, 235], [100, 200], [122, 160], [140, 180], [162, 215], [172, 150], [180, 75], [188, 150],
      [200, 200], [222, 170], [236, 150], [250, 140], [264, 160], [276, 225], [288, 250], [306, 225], [318, 150], [328, 75], [338, 150], [348, 200]],
    peaks: 0.45, slope: [30, 48], foothills: true, spurs: [], talus: 10, far: [0.74, 0.84],
  },
  b: {
    crest: [[0, 165], [35, 215], [72, 235], [100, 200], [122, 160], [140, 180], [162, 215], [172, 150], [180, 75], [188, 150],
      [200, 200], [222, 170], [236, 150], [250, 140], [264, 160], [276, 225], [288, 250], [306, 225], [318, 150], [328, 75], [338, 150], [348, 200]],
    peaks: 0.45, slope: [30, 48], foothills: false, talus: 10, far: [0.74, 0.84],
    // the spurs: [bearing at the crest, bearing at the toe, the toe's radius, height where the spur leaves the crest]
    spurs: [[110, 116, 312, 150], [166, 160, 308, 160], [208, 203, 306, 150], [308, 314, 312, 160]],
  },
  c: {
    crest: [[8, 190], [20, 210], [45, 255], [72, 270], [94, 240], [104, 140], [112, 52], [120, 140], [132, 225], [150, 275],
      [165, 285], [173, 150], [180, 50], [187, 150], [200, 270], [218, 250], [236, 170], [250, 150], [264, 180], [278, 285], [292, 300], [308, 270],
      [320, 150], [328, 50], [336, 160], [346, 270], [356, 240]],
    peaks: 0.35, slope: [28, 52], foothills: false, spurs: [], talus: 18, far: [0.6, 0.7],
  },
};
const CAND = CANDIDATES[PROFILE] || null;
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
const T_FE = new Float32Array(N + 1); // candidates: the far ranges' elevation (degrees from the centre), the crest's smoothed
if (CAND) {
  const el = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const az = -Math.PI + (TAU * i) / N, b = bearingOf(az);
    const vig = 1 - smoothstep(4, 11, Math.min(Math.abs(b - 72), 360 - Math.abs(b - 72)));
    T_CS[i] = splineAt(CAND.crest, b) + 9 * ring(az, 1.4, 41.3) + 4 * ring(az, 4.0, 43.9);
    T_CH[i] = T_CS[i] + crownAt(b, CAND.peaks);
    // the crest stands out where it is high, so the high massifs keep a long face; held inside the terrain's square
    const edge = 500 / Math.max(Math.abs(Math.cos(az)), Math.abs(Math.sin(az)));
    T_CR[i] = lerp(clamp(452 + 0.3 * (T_CH[i] - 150) + 12 * ring(az, 1.6, 3.1), 440, edge - 22), 476, vig);
    T_FR[i] = 352 + 14 * ring(az, 2.2, 21.1);
    T_FH[i] = CAND.foothills ? (30 + 14 * ring(az, 3.0, 23.9)) * smoothstep(0.05, 0.45, ring(az, 1.9, 25.3)) : 0;
    el[i] = Math.atan2(T_CS[i], T_CR[i]) / D2R;
  }
  // the far ranges see the crest smoothed over ±24°: the same rolls, without the cols
  const W = 240, acc = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) { let s = 0; for (let k = -W; k <= W; k += 4) s += el[((i + k) % N + N) % N] * (1 - Math.abs(k) / (W + 4)); acc[i] = s; }
  let norm = 0; for (let k = -W; k <= W; k += 4) norm += 1 - Math.abs(k) / (W + 4);
  for (let i = 0; i <= N; i++) T_FE[i] = acc[i] / norm;
}
// --- v5 study: the mountains' candidate profiles (end; applyCandidate and the far ranges' hook below)
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
  if (CAND) return applyCandidate(h, x, z, r, g, glacierH); // v5 study: the candidate profiles
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

// --- v5 study: the mountains' candidate profiles (begin): the heightfield for ?mountains=a|b|c (see the tables'
// block). The face: from a foot set by the crest's height and the mean slope that height asks for (CAND.slope, from
// the cols' to the massifs'), a long concave toe, a steeper middle and a convex shoulder rounding over the crest.
const SPUR_W = 22; // a spur's half-width at its toe (m); it broadens as it climbs
function applyCandidate(h, x, z, r, g, glacierH) {
  const az = Math.atan2(z, x);
  const B = sampleBearing(az);
  const Rc = B.cr, Hc = B.ch, sw = B.sw;
  const slope = lerp(CAND.slope[0], CAND.slope[1], smoothstep(70, 280, Hc)) * D2R;
  let foot = Math.max(298, Rc - Hc / Math.tan(slope) + 14 * S.noise2(az * 2.6, 5.3));
  const steep = smoothstep(46, 60, Math.atan2(Hc, Rc - foot) / D2R); // 0 on an easy face, 1 on a steep one
  // buttresses, only where the face is steep
  const ph = B.ph + 0.22 * S.noise2(r * 0.012, az * 3.0);
  const fl = Math.floor(ph), s = Math.abs(ph - fl - 0.5) * 2;
  const spA = 0.4 + 0.6 * hash2(((fl % SPURS) + SPURS) % SPURS, 913);
  const sp = (1 - Math.pow(s, 0.75)) * spA * steep;
  foot = Math.max(296, foot - 26 * sp);
  const span = Rc - foot;
  const u = clamp((r - foot) / span, 0, 1);
  let m;
  if (r <= foot) m = 0;
  else if (r <= Rc) {
    // concave toe into a convex shoulder: a smoothstep leaned toward the toe
    const p = lerp(Math.pow(u, 1.7), u * u * (3 - 2 * u), 0.6);
    m = Hc * p;
  } else { const d = r - Rc; m = Math.max(Hc * 0.6, Hc - 0.5 * Math.min(d, 30) - 1.1 * Math.max(0, d - 30)); } // the shoulder rounds over, then falls away
  // the gullies between the buttresses, where steep
  m -= 9 * Math.pow(s, 1.5) * steep * smoothstep(0.15, 0.6, u) * (1 - smoothstep(0.9, 1, u));
  // texture: the old pinnacles at under half their height and twice their wavelength, the crest's broad roll
  const up = smoothstep(0.55, 1.0, u);
  const rEnv = RIDGE_ON ? ridgeEnv(bearingOf(az)) : 0; // AP's run, as in applyMountains
  m += (Math.max(0, S.ridged2(x * 0.0055 + 3.1, z * 0.0055 - 7.7, 3) - 0.4) * 22 - 2 + S.fbm2(x * 0.004, z * 0.004, 3) * 10) * up * (1 - 0.85 * rEnv * smoothstep(0.85, 1, u));
  m += S.noise2(x * 0.06, z * 0.06) * 2.0 * u + S.fbm2(x * 0.018 + 4.4, z * 0.018, 3) * 5 * u;
  m += S.fbm2(x * 0.009 + 1.3, z * 0.009 - 2.1, 3) * 18 * u * (1 - 0.6 * u); // lumps on the shoulders, so no face is a cone
  // bedding: the same ledges as the main wall's, only where a face is steep
  const face = smoothstep(0.1, 0.35, u) * (1 - sw) * steep;
  if (face > 0) {
    const dip = x * 0.045 - z * 0.02, st = 11;
    const q = (m + dip) / st, qf = Math.floor(q), t = q - qf;
    m = lerp(m, (qf + t * t * t) * st - dip, 0.4 * face);
  }
  // a: the front range as foothills, rounded and broken
  if (B.fh > 0.5) {
    const d = Math.abs(r - B.fr);
    if (d < 58) m = smax(m, B.fh * (0.5 + 0.5 * Math.cos((d / 58) * Math.PI)) * (0.8 + 0.35 * S.fbm2(x * 0.012 + 9, z * 0.012 + 1, 3)), 10);
  }
  // b: the spurs, long ridges leaving the crest and running down into the floor, their toes rounded
  for (const [bc, bt, rt, ht] of CAND.spurs) {
    if (r < rt - 30) continue;
    const t = clamp((r - rt) / (Rc - 40 - rt), 0, 1);
    const ab = (lerp(bt, bc, Math.pow(t, 0.8)) - 90) * D2R + 0.04 * S.noise2(r * 0.01, bc);
    const d = Math.abs(angDiff(az, ab)) * r;
    const hs = ht * Math.pow(t, 1.35) + 4 * smoothstep(rt - 30, rt, r);
    const w = SPUR_W + 0.55 * hs;
    if (d < w) {
      const c = Math.pow(1 - (d / w) * (d / w), 1.5) * (0.92 + 0.12 * S.fbm2(x * 0.02, z * 0.02, 2));
      m = smax(m, hs * c, 12);
    }
  }
  // talus: scree at the foot, heavier under the steep faces
  m = smax(m, CAND.talus * (0.4 + 0.6 * steep) * (0.6 + 0.4 * S.fbm2(x * 0.03, z * 0.03, 2)) * smoothstep(foot - 40, foot + 20, r) * (1 - smoothstep(foot + 30, foot + 70, r)), 5);
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
// the far ranges for a candidate: the crest's smoothed elevation, scaled down (CAND.far, per tier), so each range
// stands below the massifs in the picture and above the cols
function farCrestCand(T, az, out) {
  const u = ((az + Math.PI) / TAU) * N, i = Math.min(N - 1, Math.max(0, Math.floor(u))), f = u - i;
  const fe = T_FE[i] + (T_FE[i + 1] - T_FE[i]) * f;
  const rc = T.rc + T.rcv * ring(az, 1.3, T.seed);
  const k = CAND.far[T.name === 'far' ? 0 : 1];
  const elev = (fe * k + 1.2 * ring(az, 2.3, T.seed + 3)) * D2R;
  let hc = Math.tan(elev) * rc;
  const d = Math.abs(angDiff(az, SADDLE.azimuth));
  hc = lerp(T.floor, hc, smoothstep(T.full * D2R, T.wall * D2R, d));
  out.rc = rc; out.hc = hc;
  return out;
}
const FAR_PALE = new THREE.Color('#8e8a99'); // candidates: the far ranges paled toward the haze
// --- v5 study: the mountains' candidate profiles (end)

// ---------------------------------------------------------------- the far ranges (tiers 2 and 3)
// Each far range stands a few degrees higher, seen from the bowl's centre, than the main crest in front of it
// (its peaks left out), so it shows as a band above it: lift is that margin in degrees, with its spread.
const FAR = [
  // crest radius and spread, lift over the main crest (degrees) and spread, inner and outer radius,
  // saddle floor and gate (degrees)
  { name: 'far', rc: 800, rcv: 50, lift: 2.6, liftv: 1.6, r0: 560, r1: 1040, floor: 55, full: 9, wall: 17, seed: 51, rows: 30 },
  { name: 'farthest', rc: 1350, rcv: 80, lift: 5.4, liftv: 2.2, r0: 1080, r1: 1740, floor: 95, full: 11, wall: 22, seed: 67, rows: 30 },
];
function farCrest(T, az, out) {
  if (CAND) return farCrestCand(T, az, out); // v5 study: the candidate profiles
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
  const { rc, hc } = farCrest(T, az, _fc);
  const u = r <= rc ? smoothstep(T.r0, rc, r) : 1 - smoothstep(rc, T.r1, r) * 0.55;
  let y = hc * (r <= rc ? Math.pow(u, 1.5) : u);
  // coarse arêtes: the far ranges are smoother than the near (the air takes the detail)
  const x = Math.cos(az) * r, z = Math.sin(az) * r;
  // broad massifs, then a little crest texture (ridged noise alone hangs from the sky like stalactites)
  y += S.fbm2(x * 0.0032 + T.seed, z * 0.0032, 4) * hc * 0.16 * smoothstep(0.25, 1, u);
  y += (S.ridged2(x * 0.011 - T.seed, z * 0.011, 3) - 0.45) * hc * 0.045 * smoothstep(0.2, 1, u);
  return y - 30 * (1 - smoothstep(T.r0, T.r0 + 80, r)); // the inner edge tucks below the floor, out of sight
}
function buildRing(ctx, T) {
  const low = ctx.quality === 'low';
  const nA = low ? 540 : 900, nR = low ? 18 : T.rows;
  const pos = new Float32Array((nA + 1) * (nR + 1) * 3), col = new Float32Array((nA + 1) * (nR + 1) * 3);
  const cRock = new THREE.Color('#5a535c'), cHigh = new THREE.Color('#77717c'), cSnow = new THREE.Color('#a2a2b4'), c = new THREE.Color();
  let k = 0;
  for (let i = 0; i <= nA; i++) {
    const az = -Math.PI + (TAU * i) / nA;
    for (let j = 0; j <= nR; j++) {
      // rows denser toward the crest
      const v = j / nR, r = T.r0 + (T.r1 - T.r0) * (0.5 - 0.5 * Math.cos(v * Math.PI));
      const y = farHeight(T, az, r);
      pos[k] = Math.cos(az) * r; pos[k + 1] = y; pos[k + 2] = Math.sin(az) * r;
      const hc = farCrest(T, az, _fc).hc;
      c.copy(cRock).lerp(cHigh, smoothstep(hc * 0.35, hc * 0.8, y));
      c.lerp(cSnow, smoothstep(hc * 0.85, hc * 1.02, y + 0.08 * hc * S.noise2(pos[k] * 0.01, pos[k + 2] * 0.01)) * (T.name === 'farthest' ? 0.8 : 0.4));
      if (CAND) c.lerp(FAR_PALE, T.name === 'far' ? 0.3 : 0.5); // v5 study: the candidates' far ranges, paler
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

