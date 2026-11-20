// The Lower Beds' one floor (v18-F3), three-free so the tests can import it in node: every level and every edge a
// walker meets from the forecourt to the chamber under the glasshouse, from BEDS in src/v18/plan.js.
//   floorAt(x, z) -> y | null      the floor's level there (the held stacked floor 'beds'); null off it
//   way: { at(s), near(x, z, out), LEN, floorY(s) }   the way under, a Catmull-Rom through BEDS.way.pts
//   ROUTE: [[x, z, y], ...]        the walk from the forecourt's mouth to the chamber (the ascent, the walk tool)
//   Y: { sill, landing, vault, chamber }
// The walls stand at each part's `half`; a walker keeps WALK_IN (0.4 m) inside them, so the eye never meets a face.
import { BEDS } from '../plan.js';

export const WALK_IN = 0.4;
const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const { court: C, stair: ST, landing: LA, steps: SP, vault: V, way: W, chamber: CH } = BEDS;
const YS = BEDS.sill, YL = YS - ST.slope * (ST.x0 - ST.x1), YV = V.y, YC = CH.y;
export const Y = { sill: YS, landing: YL, vault: YV, chamber: YC };
export const DOOR_HALF = 1.0; // the doorway's half width (z 171..173)
export const DOOR_H = 2.85;   // its height over the sill (a hop lifts the eye to 2.46 m)

// the stair's floor at x (eased over 0.6 m at its head and foot: a mean of the straight profile)
const stairLin = (x) => YS - ST.slope * Math.min(ST.x0 - ST.x1, Math.max(0, ST.x0 - x));
export function stairY(x) { let y = 0; for (let k = -3; k <= 3; k++) y += stairLin(x + k * 0.1); return y / 7; }
// the steps north from the landing into the vault: z from SP.z0 (the landing) to SP.z1 (the vault's south wall)
const stepsLin = (z) => YL + (YV - YL) * Math.min(1, Math.max(0, (SP.z0 - z) / (SP.z0 - SP.z1)));
export function stepsY(z) { let y = 0; for (let k = -3; k <= 3; k++) y += stepsLin(z + k * 0.1); return y / 7; }

// ---- the way under: a centripetal-ish Catmull-Rom through the plan's points, sampled every DS
const DS = 0.25;
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
const WP = W.pts, WX = [], WZ = [];
for (let i = 0; i < WP.length - 1; i++) {
  const a = WP[Math.max(0, i - 1)], b = WP[i], c = WP[i + 1], d = WP[Math.min(WP.length - 1, i + 2)];
  const n = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1]) / 0.05);
  for (let k = 0; k < n; k++) { const t = k / n; WX.push(cr(a[0], b[0], c[0], d[0], t)); WZ.push(cr(a[1], b[1], c[1], d[1], t)); }
}
WX.push(WP[WP.length - 1][0]); WZ.push(WP[WP.length - 1][1]);
// resample at DS by arc length
const SX = [WX[0]], SZ = [WZ[0]];
{ let acc = 0; for (let i = 1; i < WX.length; i++) { const l = Math.hypot(WX[i] - WX[i - 1], WZ[i] - WZ[i - 1]); acc += l; while (acc >= DS) { acc -= DS; const f = 1 - acc / l; SX.push(WX[i - 1] + (WX[i] - WX[i - 1]) * f); SZ.push(WZ[i - 1] + (WZ[i] - WZ[i - 1]) * f); } } SX.push(WX[WX.length - 1]); SZ.push(WZ[WZ.length - 1]); }
const NS = SX.length;
const LEN = (NS - 2) * DS + Math.hypot(SX[NS - 1] - SX[NS - 2], SZ[NS - 1] - SZ[NS - 2]);
const WB = { x0: Math.min(...SX) - 3, x1: Math.max(...SX) + 3, z0: Math.min(...SZ) - 3, z1: Math.max(...SZ) + 3 };
function wayAt(s, out = {}) {
  const f = Math.max(0, Math.min(NS - 1.0001, s / DS)), i = Math.floor(f), t = f - i, j = Math.min(NS - 1, i + 1);
  out.x = SX[i] + (SX[j] - SX[i]) * t; out.z = SZ[i] + (SZ[j] - SZ[i]) * t;
  const a = Math.max(0, i - 1), b = Math.min(NS - 1, i + 2), l = Math.hypot(SX[b] - SX[a], SZ[b] - SZ[a]) || 1;
  out.tx = (SX[b] - SX[a]) / l; out.tz = (SZ[b] - SZ[a]) / l;
  return out;
}
// the way's floor falls from the vault's level to the chamber's, eased at both ends
const wayFloor = (s) => YV + (YC - YV) * ss(2, LEN - 2, s);
function wayNear(x, z, out = {}) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < NS; i += 3) { const dx = SX[i] - x, dz = SZ[i] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } }
  for (let i = Math.max(0, bi - 3); i <= Math.min(NS - 1, bi + 3); i++) { const dx = SX[i] - x, dz = SZ[i] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } }
  const a = wayAt(bi * DS, {}), along = (x - a.x) * a.tx + (z - a.z) * a.tz;
  out.s = bi * DS + along; out.d = (x - a.x) * -a.tz + (z - a.z) * a.tx;
  if (out.s < 0 || out.s > LEN) { const e = wayAt(Math.max(0, Math.min(LEN, out.s))); out.d = Math.hypot(x - e.x, z - e.z) * Math.sign(out.d || 1); }
  return out;
}
export const way = { at: wayAt, near: wayNear, LEN, floorY: wayFloor, BOX: WB, DS, half: W.half, height: W.height };

// ---- the floor
const _n = {};
export function floorAt(x, z) {
  // the forecourt (open to the ground at its east end, x1) and the doorway through the door's block
  if (x <= C.x1 + 0.2 && x >= ST.x0 && z > 160 && z < 180) {
    if (x >= C.x0 && z >= C.z0 + WALK_IN + 0.05 && z <= C.z1 - WALK_IN - 0.05) return YS;
    if (x < C.x0 && Math.abs(z - ST.z) <= DOOR_HALF - 0.15) return YS;
  }
  // the stair down west, and the landing at its foot
  if (x < ST.x0 && x >= ST.x1 - 0.01 && Math.abs(z - ST.z) <= ST.half - WALK_IN) return stairY(x);
  if (x >= LA.x0 + WALK_IN && x <= LA.x1 + 0.01 && z >= LA.z0 + WALK_IN && z <= LA.z1 - WALK_IN) return YL;
  // the steps north into the vault
  if (Math.abs(x - SP.x) <= SP.half - WALK_IN && z <= LA.z0 + WALK_IN + 0.01 && z >= SP.z1 - 0.01) return stepsY(z);
  // the vault
  if (x >= V.x0 + WALK_IN && x <= V.x1 - WALK_IN && z >= V.z0 + WALK_IN - 0.01 && z <= V.z1 + 0.01) return YV;
  // the way under
  if (x > WB.x0 && x < WB.x1 && z > WB.z0 && z < WB.z1) {
    wayNear(x, z, _n);
    if (_n.s >= -0.6 && _n.s <= LEN + 0.6 && Math.abs(_n.d) <= W.half - WALK_IN) return wayFloor(Math.max(0, Math.min(LEN, _n.s)));
  }
  // the chamber
  { const dx = x - CH.x, dz = z - CH.z; if (dx * dx + dz * dz <= (CH.r - WALK_IN) ** 2) return YC; }
  return null;
}
// the roof over the floor at (x, z) (the eye stays under it; edges-test asks), or Infinity in the open
export function ceilAt(x, z) {
  if (x >= ST.x0) return x >= C.x0 ? Infinity : YS + DOOR_H;
  if (x >= ST.x1 - 0.01 && Math.abs(z - ST.z) <= ST.half) return stairY(x) + 2.85 - 0.17;
  if (x >= LA.x0 && x <= LA.x1 && z >= LA.z0 && z <= LA.z1) return YL + 2.85;
  if (Math.abs(x - SP.x) <= SP.half && z <= LA.z0 && z >= SP.z1) return stepsY(z) + 2.85 - 0.18;
  if (x >= V.x0 && x <= V.x1 && z >= V.z0 && z <= V.z1) { const hw = (V.x1 - V.x0) / 2, sag = V.crown - V.spring, R = (hw * hw + sag * sag) / (2 * sag), d = x - (V.x0 + hw); return YV + V.crown - R + Math.sqrt(Math.max(0, R * R - d * d)); }
  { const n = wayNear(x, z, {}); if (n.s >= -0.2 && n.s <= LEN && Math.abs(n.d) <= W.half) { const dx = x - CH.x, dz = z - CH.z; if (dx * dx + dz * dz > CH.r * CH.r) return wayFloor(Math.max(0, Math.min(LEN, n.s))) + W.height; } }
  { const dx = x - CH.x, dz = z - CH.z; if (dx * dx + dz * dz <= CH.r * CH.r) return YC + CH.wall; }
  return Infinity;
}
// everything the floor covers, for a quick reject
export const BBOX = { x0: Math.min(WB.x0, V.x0, CH.x - CH.r) - 1, x1: C.x1 + 1, z0: Math.min(WB.z0, CH.z - CH.r) - 1, z1: C.z1 + 1 };

// ---- the route: the forecourt's mouth to the chamber's middle, as a visitor walks it
export const ROUTE = (() => {
  const R = [[C.x1 - 0.1, ST.z, YS], [C.x0 + 0.6, ST.z, YS], [ST.x0 + 0.2, 171.58, YS], [ST.x0 - 0.6, 171.62, stairY(ST.x0 - 0.6)]];
  for (let x = ST.x0 - 1.5; x > ST.x1; x -= 1.2) R.push([x, ST.z, stairY(x)]);
  R.push([SP.x + 0.3, ST.z, YL], [SP.x, LA.z0 + 0.2, YL], [SP.x, (SP.z0 + SP.z1) / 2, stepsY((SP.z0 + SP.z1) / 2)], [SP.x, V.z1 - 0.6, YV], [SP.x, (V.z0 + V.z1) / 2, YV], [SP.x, V.z0 + 0.8, YV]);
  const a = {};
  for (let s = 1; s < LEN - 0.5; s += 2) { wayAt(s, a); R.push([+a.x.toFixed(2), +a.z.toFixed(2), +wayFloor(s).toFixed(3)]); }
  R.push([CH.x - 0.4, CH.z + 2.4, YC]);
  return R;
})();
