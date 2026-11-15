// The icefall's plan (v12 H2): the ice's height in the glacier's notch and the climb's pieces, as plain numbers, so the
// terrain (src/terrain.js, through src/v4/glacier.js) and the module that draws and walks it (src/v12/icefall.js) agree.
// No three.js here: terrain.js calls iceY and carve inside heightAt.
//
// s is metres up-glacier: s = -z - 285 (z -285 is behind the mother crystal, where the tongue meets the notch). The
// ice comes down the notch as a stair of three great steps, each a cliff ("riser") of 23 m over 10 m and a terrace
// of 20 m, onto the tongue; above the third step a shelf 30 m deep, at y 93 to 96, then the last great crevasse, 50 m
// deep, and beyond it the upper icefall climbing to y 178 at the terrain's edge, where the Plummet hangs into it.
//   tongue  s 0..12    y 15 -> 18
//   R1      s 12..22   +23           T1  s 22..42   41 -> 44
//   R2      s 42..52   +23           T2  s 52..72   67 -> 70
//   R3      s 72..82   +23 (66..88 where the stair is cut, x 0..46)       the shelf s 82..112   93 -> 96
//   the last crevasse s 112..129 (its floor y 45);  the upper icefall s 129..215, 100 -> 178, six steps of 9 m
// Each riser bows down-glacier in the middle and wanders a little across the notch (rOff); the terrain's riser is
// convex, under the plane of its drawn face (src/v12/icefall/ice.js draws the faces from the same numbers).
//
// The climb (every piece but the terraces is a stacked floor in icefall.js; the terrain is carved under the slot
// and the stair so it never stands in them):
//   1. the slot: a crevasse behind R1's face, entered by a cleft in it at x 90, climbing west 60 m to T1 at x 22
//   2. T1, east between the slot's lip and the block, on the terrace itself
//   3. the block: a serac the size of a house fallen on T1 against R2, its top a ramp up west to y 63
//   4. the bridge: an old lead (a crystal on its side, its bronze eye at the top) across the gap and R2's lip, onto T2
//   5. T2, west to the cut stair
//   6. the stair: two flights cut in the ice where R3 has slumped, the upper one tilted and cracked by the ice since
//   7. the shelf, north to the lip of the last crevasse
import { makeSimplex, clamp, smoothstep, hyp } from '../../noise.js';
import { WORLD } from '../../world.js';

const SX = makeSimplex(WORLD.seed); // terrain.js's stream: the axis is glacierMask's
const N = makeSimplex(WORLD.seed + 1203);

export const S0 = 285;
export const sOf = (z) => -z - S0;
export const zOf = (s) => -(s + S0);
export const axisX = (z) => 40 + SX.fbm2(z * 0.004, 3.1, 3) * 40;

// the risers: [s0 of the foot at the axis, run, rise, bow (m down-glacier at the axis), wander (m)]
export const RISERS = [
  [12, 10, 23, 3, 1.2],
  [42, 10, 23, 1, 0.6],
  [72, 10, 23, 2, 1.0],
];
export const UPPER = { s0: 132, every: 13, run: 4, rise: 9, n: 6, bow: 6, wander: 3.5 };
export const SHELF = { s0: 82, s1: 112, y0: 93, y1: 96 };
export const CREVASSE = { lip: 112.5, s0: 115.5, s1: 125.5, far: 129, floor: 45 };
// the stair's slump in R3: within x 0..46 the riser runs s 66..88
const SLUMP = { x0: -2, x1: 50, edge: 6, s0: 66, s1: 88 };

const shape = (t, k = 2.5) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(t, k)); // convex: under its drawn face
// how far riser k's foot is moved down-glacier at x (z for the axis): its bow and its wander
// away from the climb (FREE: the x the climb keeps each riser to) a riser wanders far more, so the steps break up
const FREE = [[10, 102], [14, 100], [-10, 60]];
export function rOff(k, x, z, ax = axisX(z)) {
  const R = RISERS[k], a = clamp((x - ax) / 60, -1, 1), [fa, fb] = FREE[k];
  const free = 1 - smoothstep(fa - 14, fa, x) * (1 - smoothstep(fb, fb + 14, x));
  return R[3] * (1 - a * a) + (R[4] + 5.5 * free) * N.noise2(x * 0.035 + k * 7.1, k * 3.3) + 3 * free * N.noise2(x * 0.09, k + 0.5);
}
// riser k's foot and top s at x (with the slump for R3)
export function riserSpan(k, x, z, out = [0, 0], ax = axisX(z)) {
  const R = RISERS[k], o = rOff(k, x, z, ax);
  let s0 = R[0] - o, s1 = R[0] + R[1] - o;
  if (k === 2) {
    const w = smoothstep(SLUMP.x0 - SLUMP.edge, SLUMP.x0, x) * (1 - smoothstep(SLUMP.x1, SLUMP.x1 + SLUMP.edge, x));
    s0 += (SLUMP.s0 - R[0]) * w; s1 += (SLUMP.s1 - R[0] - R[1]) * w;
  }
  out[0] = s0; out[1] = s1;
  return out;
}
export function slumpW(x) { return smoothstep(SLUMP.x0 - SLUMP.edge, SLUMP.x0, x) * (1 - smoothstep(SLUMP.x1, SLUMP.x1 + SLUMP.edge, x)); }

// the upper icefall's step k: its foot's s at x
export function upperFoot(k, x, z, ax = axisX(z)) {
  const U = UPPER, a = clamp((x - ax) / 60, -1, 1);
  return U.s0 + k * U.every - U.bow * (1 - a * a) - U.wander * N.noise2(x * 0.03 + k * 4.7, 9.1 + k);
}
const _sp = [0, 0];
// the ice's height (absolute y) at (x, z), before the carve
export function iceY(x, z) {
  const s = sOf(z), ax = axisX(z); // the axis once a call
  let y = 15 + 3 * clamp(s / 12, 0, 1);
  for (let k = 0; k < 3; k++) {
    riserSpan(k, x, z, _sp, ax);
    y += RISERS[k][2] * shape((s - _sp[0]) / (_sp[1] - _sp[0]), k === 2 ? 2.5 - 1.3 * slumpW(x) : 2.5); // the slump is a plainer slope
    if (k < 2) y += 3 * clamp((s - _sp[1]) / 20, 0, 1); // the terrace's own gentle rise
  }
  y += 3 * clamp((s - SHELF.s0) / (SHELF.s1 - SHELF.s0), 0, 1);
  if (s > CREVASSE.lip) {
    const C = CREVASSE;
    const down = smoothstep(C.lip, C.s0, s) * (1 - smoothstep(C.s1, C.far, s));
    y = y + 4 * smoothstep(C.s1, C.far, s) - (y - C.floor) * down;
    // the upper icefall: six steps of 9 m, bowed and wandering more than the three below
    if (s > C.far) {
      const U = UPPER;
      for (let k = 0; k < U.n; k++) y += U.rise * shape((s - upperFoot(k, x, z, ax)) / U.run);
      y += 0.3 * Math.max(0, s - C.far);
    }
  }
  // the ice's own unevenness: low swells, more on the shelf and the terraces' backs than at their lips
  y += N.fbm2(x * 0.03, z * 0.03, 3) * 0.9 + N.noise2(x * 0.11, z * 0.11) * 0.25;
  return y;
}

// ---------------------------------------------------------------- the climb's pieces
// A piece is a run of floor: pts [[x, z, y], ...] (the floor's y at each), half its width; its floor between points
// is linear. `cut`: the terrain is carved under it (to y - 1.2 within half + 3 m, blending out over 3 m more).
// The slot: a cleft straight through R1 at x 72 (in the ice front's face, not at its margin), then west along a crevasse just behind R1's lip (s 25), up to T1.
// Its floor's y: the cleft's mouth on the tongue (measured: heightAt there), a level turn at the cleft's back (three
// points at one height, so the floor has no step where the nearest segment changes), the end level with T1;
// levels() fills the rest by length.
export const SLOT = { half: 1.7, pts: [[72.5, -293, 16.06], [72, -307.2, 0], [72, -310, 0], [69.2, -310, 0], [60, -310.8, 0], [50, -309.6, 0], [40, -310.9, 0], [31, -310, 0], [24, -311, 0]], cut: true, taper: [true, true] };
// the slot's width by metres along it: 1.7 either side, pinched to 1.15 where the walls lean together and to 1.3
// where a crystal grows out of the north wall (CRYSTAL_AT) and the walker goes round it
export const SLOT_PINCH = [[33, 4, 1.15], [55, 3, 1.3]];
export const SLOT_CRYSTAL_AT = 55;
export function slotHalf(d) {
  let h = SLOT.half;
  for (const [c, w, m] of SLOT_PINCH) { const t = Math.abs(d - c) / w; if (t < 1.6) h = Math.min(h, m + (SLOT.half - m) * smoothstep(0.6, 1.6, t)); }
  return h;
}
// the block's ramp: its top, a plane from its east foot to its high west end (the walkable is the whole top face)
export const BLOCK = { foot: [95, -322.4, 0], head: [57, -322.9, 63], half: 2.8 };
// the bridge: an old lead lying from the block's head across the gap and R2's lip onto T2 (its top facet)
export const BRIDGE = { pts: [[56.4, -323.2, 63], [53, -340.5, 0]], half: 0.85, taper: [false, true] };
// the stair: flight 1 east along T2's back, a landing, flight 2 back west up the slump onto the shelf
export const STAIR = {
  half: 1.25,
  f1: [[6, -351, 0], [38, -357, 0]],
  landing: [[38, -357], [43, -360]],
  f2: [[41, -362.5, 0], [8, -370.5, 0]],
  crack: 0.55, // where flight 2 is broken, as a fraction of its length; the upper part is dropped and shifted
  drop: 0.3, shift: 0.35, tilt: 0.12,
};
// the lanes across the terraces and the shelf (no floors: kept clear of seracs, marked by crystals)
export const LANES = {
  t1: [[21, -318], [40, -318], [70, -318], [96.5, -318], [99.2, -321]],
  t2: [[53, -340], [40, -344], [20, -347.5], [6, -351]],
  shelf: [[8, -370.5], [4.5, -371.5], [8, -376.5], [22, -380], [40, -388], [50, -397]],
  approach: [[58, -279], [66, -285], [72.5, -291]],
};
export const LIP = { z: -397.6 }; // the shelf's north edge: the corridor ends here

// the floors' heights that the plan sets from the ice itself (iceY, never heightAt: the carve runs inside heightAt)
let levelled = false;
export function levels() {
  if (levelled) return;
  levelled = true;
  const P = SLOT.pts, end = P[P.length - 1];
  end[2] = iceY(end[0], end[1]) + 0.05;
  // the cleft rises gently through R1 (to 21 m at its back), turns on the level, then the crevasse climbs at an even grade to T1
  P[1][2] = P[2][2] = P[3][2] = 21;
  let L = 0; const acc = [0];
  for (let i = 4; i < P.length; i++) { L += hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); acc.push(L); }
  for (let i = 4; i < P.length - 1; i++) P[i][2] = P[3][2] + (end[2] - P[3][2]) * (acc[i - 3] / L);
  BLOCK.foot[2] = iceY(BLOCK.foot[0], BLOCK.foot[1]) + 0.05;
  // the bridge starts on the block's top, 1.2 m short of its head and 0.6 m to its north, at the ramp's height there
  {
    const [fx, fz, fy] = BLOCK.foot, [hx, hz, hy] = BLOCK.head, L = hyp(hx - fx, hz - fz), ux = (hx - fx) / L, uz = (hz - fz) / L, vx = -uz, vz = ux;
    const a = L - 1.2;
    BRIDGE.pts[0][0] = fx + ux * a - vx * 0.6; BRIDGE.pts[0][1] = fz + uz * a - vz * 0.6; BRIDGE.pts[0][2] = fy + (hy - fy) * (a / L);
  }
  BRIDGE.pts[1][2] = iceY(BRIDGE.pts[1][0], BRIDGE.pts[1][1]) + 0.05;
  STAIR.f1[0][2] = iceY(STAIR.f1[0][0], STAIR.f1[0][1]) + 0.05;
  STAIR.f2[1][2] = iceY(STAIR.f2[1][0], STAIR.f2[1][1]) + 0.05;
  const mid = (STAIR.f1[0][2] + STAIR.f2[1][2]) / 2;
  STAIR.f1[1][2] = mid; STAIR.f2[0][2] = mid;
}

// the carve: the terrain is pulled down under the slot and the stair, so neither has ground standing in it
const CUTS = [];
function addCut(pts, half, taper, full = 0.5, blend = 1.3) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, L = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i]; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); if (i) L += hyp(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); }
  const m = half + blend + 0.5;
  CUTS.push({ pts, half, full, blend, taper: taper || [false, false], L, x0: x0 - m, x1: x1 + m, z0: z0 - m, z1: z1 + m });
}
let cutsReady = false;
function readyCuts() {
  cutsReady = true;
  levels();
  // the slot: carved well past its walls, so no vertex of the terrain's mesh (2.1 to 3.1 m apart) stands in it: a
  // mesh drawn over a narrower cut sliced the slot with flat planes of ground; the walls' tops and outer faces cover the rest
  addCut(SLOT.pts, SLOT.half, SLOT.taper, 3.0, 4.5);
  addCut(BRIDGE.pts, BRIDGE.half + 0.6, BRIDGE.taper);
  addCut([...STAIR.f1, ...STAIR.f2], STAIR.half, [true, true]);
}
// the nearest point of a piece's polyline to (x, z): writes [distance, floor y, t along the whole, segment index]
export function nearest(pts, x, z, out = [0, 0, 0, 0]) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], ex = B[0] - A[0], ez = B[1] - A[1], l2 = ex * ex + ez * ez || 1;
    const t = clamp(((x - A[0]) * ex + (z - A[1]) * ez) / l2, 0, 1);
    const dx = x - A[0] - ex * t, dz = z - A[1] - ez * t, d = Math.sqrt(dx * dx + dz * dz);
    if (d < best) { best = d; out[0] = d; out[1] = A[2] + (B[2] - A[2]) * t; out[2] = t; out[3] = i; }
  }
  return out;
}
const _nr = [0, 0, 0, 0];
// metres from the start of a polyline to the nearest point found by nearest() (segment _nr[3], t _nr[2])
function along(pts, i, t) { let d = 0; for (let k = 0; k < i; k++) d += hyp(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); return d + t * hyp(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); }
export function carve(x, z, y) {
  if (z > -285 || z < -380 || x < -20 || x > 110) return y;
  if (!cutsReady) readyCuts();
  for (const c of CUTS) {
    if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) continue;
    nearest(c.pts, x, z, _nr);
    const w = 1 - smoothstep(c.half + c.full, c.half + c.blend, _nr[0]);
    if (w <= 0) continue;
    // at an end that meets the ground (a tapered end), the cut shallows to nothing over its last 5 m
    let depth = 1.2;
    if (c.taper[0] || c.taper[1]) {
      const d = along(c.pts, _nr[3], _nr[2]);
      if (c.taper[0]) depth *= smoothstep(0, 5, d);
      if (c.taper[1]) depth *= smoothstep(c.L, c.L - 5, d);
    }
    const target = _nr[1] - depth;
    if (y > target) y -= (y - target) * w;
  }
  return y;
}
