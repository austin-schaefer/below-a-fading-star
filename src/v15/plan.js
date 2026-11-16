// The Lappet's plan (v15-V0): the one place a village coordinate lives. Three-free and import-free, so the height
// path (a worker), the node tests and every quarter's module read the same numbers. If the plan is wrong, change it
// here and say so; never hard-code a village coordinate anywhere else.
//
// THE IDEA IN ONE LINE: the Titan's Causeway, where it rings the keep's hill on the north-east, is the top tread of
// an Elder stair. Everything is measured from the road's centre line: D (metres, + downhill, - toward the keep) and
// s (metres along the road). The road has two straight runs here, meeting at a corner at (80, -8):
//   run 1 ("north"): from (45, -22) to (80, -8), faces bearing 22 (north-north-east), 37.7 m
//   run 2 ("east"):  from (80, -8) to (98, 25), faces bearing 61 (east-north-east), 37.6 m
// and the giant steps run parallel to it, so every riser is two straight walls and one corner.
//
//   level     key      y      where (D)             what stands on it
//   crown     crown    18     D < -4.6              the Quarrels: the masons' yard, the new house, the upper square
//   High Rung high     14     -4.6 .. 4.6           the causeway itself, the High Lane (9 m of Elder tread)
//   Mid Rung  mid      10     4.6 .. 10             houses back to the riser, their roofs level with the High Rung
//   Low Rung  low       6     10 .. 15.4            the same, their roofs level with the Mid Rung
//   bench     bench     3.1   15.4 .. the ha-ha     the Lees: the main square, the fountain, the shops in the riser
//   foot      foot     -0.8   beyond the ha-ha      the Pennyworth: the wedge under the house's south wall and round it
//
// Risers: three of 4 m (the giant steps), one of 2.9 m (the Low Rung's, half buried in the bench's fill) and the old
// ha-ha (3.9 m, the lowest riser, a circle of r 77.22 round the keep: it was always the stair's foot).
// The steps are whole from s1 4 to s2 28 (bearings about 9 to 75 from the keep) and die into the turf at each end over
// 10 m (FADE): beyond that the hill is still the buried stair.
//
// Frames: a "run frame" is (run, s, D). at(run, s, D) gives [x, z]; every plot, lane and way below is written in it
// and resolved to world x, z when this file loads, so moving a riser moves what stands against it.
// Facing: a plot's `face` is the unit vector [fx, fz] its front looks along, and `yaw` the walker's yaw that looks the
// same way (0 looks down -z, pi/2 down -x: src/world.js).

export const KEEP = { x: 40, z: 30 };
export const HAHA = 77.22; // the lowest riser's face: the Demesne's sunk wall (src/v4/regions/height/demesne.js WALL_R)

const RUNS = [null,
  { o: [45, -22], e: [80, -8] },
  { o: [80, -8], e: [98, 25] },
];
for (const R of RUNS) if (R) {
  const dx = R.e[0] - R.o[0], dz = R.e[1] - R.o[1], L = Math.hypot(dx, dz);
  R.len = L; R.dir = [dx / L, dz / L]; R.n = [dz / L, -dx / L]; // n: outward (downhill)
  R.k = R.n[0] * R.o[0] + R.n[1] * R.o[1];
  R.bearing = ((Math.atan2(R.n[0], -R.n[1]) * 180) / Math.PI + 360) % 360;
}
export const RUN = RUNS; // RUN[1], RUN[2]: { o, e, len, dir, n, bearing }
// the corner's bisector: run 1 owns a point when its plane is the farther out (D is the max of the two)
const TAN_HALF = Math.tan(Math.acos(RUNS[1].n[0] * RUNS[2].n[0] + RUNS[1].n[1] * RUNS[2].n[1]) / 2);

// ---------------------------------------------------------------- the levels and the risers
export const LEVELS = [
  { key: 'crown', y: 18, name: 'the Quarrels', quarter: 'quarrels' },
  { key: 'high', y: 14, name: 'the High Rung', quarter: 'rungs' },
  { key: 'mid', y: 10, name: 'the Mid Rung', quarter: 'rungs' },
  { key: 'low', y: 6, name: 'the Low Rung', quarter: 'rungs' },
  { key: 'bench', y: 3.1, name: 'the Lees', quarter: 'lees' },
  { key: 'foot', y: -0.8, name: 'the Pennyworth', quarter: 'pennyworth' },
];
export const LEVEL = Object.fromEntries(LEVELS.map((l, i) => [l.key, Object.assign(l, { i })]));
// the risers' faces, as D: RISERS[i] is the drop from LEVELS[i] to LEVELS[i + 1] (the last is the ha-ha, a circle)
export const RISERS = [
  { key: 'rim', D: -4.6, top: 18, foot: 14 },
  { key: 'high', D: 4.6, top: 14, foot: 10 },
  { key: 'mid', D: 10, top: 10, foot: 6 },
  { key: 'low', D: 15.4, top: 6, foot: 3.1 },
  { key: 'haha', r: HAHA, top: 3.1, foot: -0.8 },
];
export const ROAD_HALF = 2.6; // the causeway's paving, either side of D 0
export const FADE = { s1: [-6, 4], s2: [28, 38] }; // along the runs: where the steps come out of the turf and go back under it
export const APRON = 9; // the crown is levelled to 18 for this far behind its rim (the masons' ground)

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- the frame
export const bearingOf = (x, z) => ((Math.atan2(x - KEEP.x, -(z - KEEP.z)) * 180) / Math.PI + 360) % 360;
export const radiusOf = (x, z) => Math.hypot(x - KEEP.x, z - KEEP.z);
export const polar = (b, r) => { const a = (b * Math.PI) / 180; return [KEEP.x + Math.sin(a) * r, KEEP.z - Math.cos(a) * r]; };
// D at (x, z): metres out from the road's centre line (the farther of the two runs' planes: the corner is convex)
export function Dof(x, z) {
  const a = RUNS[1], b = RUNS[2];
  const d1 = a.n[0] * x + a.n[1] * z - a.k, d2 = b.n[0] * x + b.n[1] * z - b.k;
  return d1 > d2 ? d1 : d2;
}
// the run frame of a point: { run, s, D }
export function frameOf(x, z, out = {}) {
  const a = RUNS[1], b = RUNS[2];
  const d1 = a.n[0] * x + a.n[1] * z - a.k, d2 = b.n[0] * x + b.n[1] * z - b.k;
  if (d1 > d2) { out.run = 1; out.D = d1; out.s = a.dir[0] * (x - a.o[0]) + a.dir[1] * (z - a.o[1]); }
  else { out.run = 2; out.D = d2; out.s = b.dir[0] * (x - b.o[0]) + b.dir[1] * (z - b.o[1]); }
  return out;
}
export function at(run, s, D) { const R = RUNS[run]; return [R.o[0] + R.dir[0] * s + R.n[0] * D, R.o[1] + R.dir[1] * s + R.n[1] * D]; }
// where a run's part of a line at D begins and ends (the corner's mitre): run 1 ends at s = len + D tan, run 2 begins at -D tan
export const cornerS = (run, D) => (run === 1 ? RUNS[1].len + D * TAN_HALF : -D * TAN_HALF);
// the yaw that looks along [fx, fz]
export const yawOf = (fx, fz) => Math.atan2(-fx, -fz);

// how much of the stair there is here, 0..1: whole between the fades, nothing beyond them
export function villageAmt(x, z) {
  const a = RUNS[1], b = RUNS[2];
  const d1 = a.n[0] * x + a.n[1] * z - a.k, d2 = b.n[0] * x + b.n[1] * z - b.k;
  if (d1 > d2) return sstep(FADE.s1[0], FADE.s1[1], a.dir[0] * (x - a.o[0]) + a.dir[1] * (z - a.o[1]));
  return 1 - sstep(FADE.s2[0], FADE.s2[1], b.dir[0] * (x - b.o[0]) + b.dir[1] * (z - b.o[1]));
}
// the bench is brought to 3.1 a little wider than the steps (the Lees runs on west to the parterre), by bearing
export const benchAmt = (b) => { const u = b >= 300 ? b - 360 : b; return sstep(-8, 2, u) * (1 - sstep(84, 94, u)); };
// the foot is levelled to -0.8 in the wedge outside the house's south wall (bearings 34 to 70, 14 m out from the ha-ha)
export function footAmt(x, z, r = radiusOf(x, z), b = bearingOf(x, z)) {
  const u = b >= 300 ? b - 360 : b;
  return sstep(30, 36, u) * (1 - sstep(64, 76, u)) * (1 - sstep(HAHA + 10, HAHA + 20, r));
}
// metres outside the Pomegranate House's walls (82..108, -58..-32; negative inside): its ground is not the village's
export const houseOut = (x, z) => Math.max(82 - x, x - 108, -58 - z, z + 32);
// The village's ground where the Demesne's hook has no say (a region's hook runs only where its weight is above 0:
// r 39 to 88 from the keep): the crown, levelled to 18 behind the rim, and the Pennyworth, level from the lowest
// riser's face out to its fade. src/height/field.js calls it after the regions' hooks.
export function lappetGround(h, x, z) {
  if (x < 40 || x > 128 || z < -64 || z > 36) return h;
  const r = radiusOf(x, z);
  if (r > HAHA + 0.25) {
    const fa = footAmt(x, z, r) * sstep(HAHA + 0.25, HAHA + 0.35, r) * sstep(0, 0.6, houseOut(x, z));
    return fa > 0 ? h + (LEVELS[5].y - h) * fa : h;
  }
  if (r < 60) {
    const D = Dof(x, z), RIM = RISERS[0].D;
    if (D >= RIM - 0.3 || D < RIM - APRON - 6) return h;
    const A = villageAmt(x, z);
    if (A <= 0) return h;
    const v = D < RIM - APRON ? h + (LEVELS[0].y - h) * sstep(RIM - APRON - 6, RIM - APRON, D) : LEVELS[0].y - SINK * sstep(0.9, 1, A);
    return h + (v - h) * A;
  }
  return h;
}

// ---------------------------------------------------------------- the ground's section (read by the Demesne's height hook)
// The steps' level at D, as the terrain carries it: each tread flat, the drop at each riser's face taken in the last
// EDGE metres behind the face (under the built tread: the masonry and its stacked floor hide it). SINK: the terrain
// lies this far under every built tread, so the slab drawn at the level never fights the mesh.
export const EDGE = 0.25, SINK = 0.3;
export function stepsY(D) {
  let y = LEVELS[0].y;
  for (let i = 0; i < 4; i++) { const R = RISERS[i]; if (D > R.D - EDGE) y = R.foot + (R.top - R.foot) * clamp01((R.D - D) / EDGE); }
  return y;
}
// the same under the mesh's coarse pass (cell c): the lower envelope across a cell's diagonal, so no triangle of the
// 2-3 m mesh ever stands out in front of a riser's face
export function stepsYCoarse(D, c) { const w = c * 1.45; return Math.min(stepsY(D - w), stepsY(D), stepsY(D + w)); }

// ---------------------------------------------------------------- queries
// the level a point stands on: one of LEVELS, or null outside the village. (Where the steps fade at their ends the
// level is still named, but the ground is the hill's own: check villageAmt.)
export function levelAt(x, z) {
  const r = radiusOf(x, z), b = bearingOf(x, z), u = b >= 300 ? b - 360 : b;
  if (r >= HAHA) return footAmt(x, z, r, b) > 0.5 || inHouseLanes(x, z) ? LEVEL.foot : null;
  const D = Dof(x, z);
  if (D >= RISERS[3].D) return u > 1 && u < 92 ? LEVEL.bench : null;
  if (villageAmt(x, z) <= 0) return null;
  if (D < RISERS[0].D) return D > RISERS[0].D - APRON - 6 ? LEVEL.crown : null;
  return D < RISERS[1].D ? LEVEL.high : D < RISERS[2].D ? LEVEL.mid : LEVEL.low;
}
// the lanes round the Pomegranate House (x 82..108, z -58..-32) that belong to the Pennyworth: 11.5 m out from its
// east wall (past its stable, to the foot of the field bank the house's lamp poles stand along), 5 m from its south,
// and round its north-east corner. `door`: the south door (v15-Q4), cut through the wall's tenth bay from the east,
// under the bracket lamp that hangs there, where the gallery's roof is patched with cloth (src/structures/taverna.js).
export const HOUSE = { x0: 82, x1: 108, z0: -58, z1: -32, gate: [95, -58], ground: -0.8, door: { x: 92.8, z: -32, w: 1.2, sp: 1.5 }, stable: { x0: 109.6, x1: 114.9, z0: -48.9, z1: -37.1 } };
function inHouseLanes(x, z) { return x > HOUSE.x1 && x < HOUSE.x1 + 11.5 && z > HOUSE.z0 - 8.5 && z < HOUSE.z1 + 6; }
export function quarterOf(x, z) { const l = levelAt(x, z); return l ? l.quarter : null; }
// where the village has the ground to itself: no yews, blocks, grass tufts, rocks or scatter. A margin wider than the
// built ground (2 m), and the whole of the fades.
// the box the Pennyworth's plots and the foot's lanes lie in (villageClear asks at every point of a wide ring at load: outside it, no loop)
let FOOT_BOX_ = null;
const footBox = () => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; const eat = (x, z, p) => { x0 = Math.min(x0, x - p); x1 = Math.max(x1, x + p); z0 = Math.min(z0, z - p); z1 = Math.max(z1, z + p); }; for (const p of PLOTS_) if (p.quarter === 'pennyworth') eat(p.x, p.z, Math.hypot(p.w, p.d) / 2 + 1.5); for (const l of LANES) if (l.level === 'foot') for (const q of l.pts) eat(q[0], q[1], l.width / 2 + 0.6); return [x0, x1, z0, z1]; };
// (v15-Q3) The Lees' square runs out past the ha-ha's line where the old way's bank comes up to it: the bench is level
// there to D 30 (the bank's head), and the square's floor is laid on it. 0..1: how much of that ground is the square's.
export function leesHead(x, z) {
  if (x < 50 || x > 84 || z < -52 || z > -30) return 0;
  frameOf(x, z, _h);
  if (_h.run !== 1) return 0;
  return sstep(6.2, 7.6, _h.s) * (1 - sstep(21.5, 24, _h.s)) * (1 - sstep(30.4, 31.6, _h.D)) * sstep(20, 22, _h.D);
}
const _h = { run: 0, s: 0, D: 0 };
export function villageClear(x, z) {
  const FOOT_BOX = FOOT_BOX_ || (FOOT_BOX_ = footBox());
  const r = radiusOf(x, z);
  if (r < 30) return false;
  if (r > HAHA + 22) return r < HAHA + 62 && x > FOOT_BOX[0] && x < FOOT_BOX[1] && z > FOOT_BOX[2] && z < FOOT_BOX[3] && (footLaneDist(x, z) < 0.5 || PLOTS_.some((p) => p.quarter === 'pennyworth' && inPlot(p, x, z, 1.2))); // (v15-Q4) the Hitch's worn line and the two houses beside it, out in the house's grass
  const b = bearingOf(x, z), u = b >= 300 ? b - 360 : b;
  if (r >= HAHA - 1) return footAmt(x, z, r, b) > 0.02 || inHouseLanes(x, z) || leesHead(x, z) > 0.3 || PLOTS_.some((p) => p.quarter === 'pennyworth' && inPlot(p, x, z, 1.2));
  const D = Dof(x, z);
  if (D >= RISERS[3].D - 2) return u > 1 && u < 90;
  return villageAmt(x, z) > 0 && D > RISERS[0].D - APRON;
}

// ---------------------------------------------------------------- the outlines (polylines, world x z)
// a line at D along both runs, from s1 = a on run 1 to s2 = b on run 2, mitred at the corner
export function lineAt(D, a = FADE.s1[0], b = FADE.s2[1]) { return [at(1, a, D), at(1, cornerS(1, D), D), at(2, b, D)]; }
// each riser's face (the ha-ha's as a polyline of 2-degree chords over the sector)
export const OUTLINES = Object.fromEntries(RISERS.map((R) => [R.key, R.D !== undefined ? lineAt(R.D)
  : Array.from({ length: 48 }, (_, i) => polar(2 + i * 2, R.r))]));

// a line at D from s1 4 to s2 28 that steps in to another D where something lies across it: jogs [[run, s, D, half], ...]
function jogged(D, jogs) {
  const out = [at(1, 4, D)];
  for (const run of [1, 2]) {
    for (const [r, sj, Dj, h] of jogs) if (r === run) out.push(at(run, sj - h - 0.9, D), at(run, sj - h, Dj), at(run, sj + h, Dj), at(run, sj + h + 0.9, D));
    out.push(run === 1 ? at(1, cornerS(1, D), D) : at(2, 28, D));
  }
  return out;
}

// ---------------------------------------------------------------- lanes: { name, level, width, pts: [[x, z], ...] }
const lane = (name, level, width, pts, note) => ({ name, level, y: LEVEL[level].y, width, pts, note });
export const LANES = [
  lane('high-lane', 'high', ROAD_HALF * 2, lineAt(0), 'the causeway on the High Rung: the Elder tread is the road'),
  lane('mid-lane', 'mid', 1.4, jogged(9.1, [[2, 9, 5.9, 2.3]]), 'the Mid Rung\'s outer strip, in front of its houses; the Low Rung\'s roofs widen it; it ducks in under the tube'),
  lane('low-lane', 'low', 1.4, jogged(14.5, [[1, 31, 11.4, 2.2], [2, 9, 11.5, 2.3], [2, 20.1, 12, 1.3]]), 'the Low Rung\'s outer strip; it ducks in under the timber flight, the tube and the bridge\'s pier'),
  lane('lees-street', 'bench', 2.2, [at(1, -6, 22), at(1, 29, 22), at(1, cornerS(1, 19.4), 19.4), at(2, 2, 19.6), at(2, 14, 19.6), at(2, 23.4, 19.8)], 'the bench\'s street: along the Strake\'s fronts (a hand clear of them), past the stair\'s foot, round the corner, along the shops\' forecourts to the house at the east end'),
  // (v15-Q4: the wall lane begins at the house's south door, in the pocket under the ramp's head; the gate lane goes
  // round the back of the house's stable, between it and the field bank, where the house's own lamp poles already
  // stand: V0 drew it through the stable and both its houses on the stable's walls)
  lane('wall-lane', 'foot', 2.4, [[93.6, -30.3], [100, -29.6], [108, -28.6], [112.5, -31]], 'the Thumbway [Proposed]: under the house\'s south wall, from its south door (the Afterdoor [Proposed]) to its east side'),
  lane('gate-lane', 'foot', 2.4, [[112.5, -31], [116.4, -36.2], [116.6, -48], [116.0, -57.5], [115.2, -63.6], [108.5, -63.4], [100, -61.5], [95, -61]], 'the Hitch [Proposed]: round the back of the house\'s stable to its gate'),
  lane('ramp-cut', 'foot', 1.4, [[104.3, -17.3], [104.15, -19.6], [103.95, -21.5], [103.95, -25.2], [103.5, -28.9]], 'the Slip [Proposed]: from the ramp\'s foot between the booths\' end and the garden\'s wall to the Thumbway (the straight way from the hill to the house\'s south door)'),
];

// ---------------------------------------------------------------- the two squares
export const SQUARES = [
  { name: 'quarrels-square', level: 'crown', quarter: 'quarrels', note: 'the upper square, at the stair\'s head: the masons\' ground',
    pts: [at(1, 25, -5.2), at(1, cornerS(1, -5.2), -5.2), at(2, 9, -5.2), at(2, 9, -13), at(1, 25, -13)] },
  { name: 'lees-square', level: 'bench', quarter: 'lees', note: 'the main square: arrived in from the stair\'s foot, the fountain off its centre',
    pts: [at(1, 10, 20.9), at(1, 28.6, 20.9), at(1, 34, 24.6), at(1, 24, 26.2), at(1, 10, 27)] },
];

// ---------------------------------------------------------------- the ways between levels
// Each: { name, kind, hand, from, to (level keys), run, s, D0, D1 (its line in the run frame), note }. The kits in
// src/v15/ways/ build them from these records; a quarter adds its own with the same kit and a record of its own.
export const STAIR = { run: 1, s: 31, width: 3 }; // the Heliarch stair's axis: straight out from the road at s 31, at the house's south-west corner
export const WAYS = [
  { name: 'heliarch-head', kind: 'stair', hand: 'heliarch', from: 'crown', to: 'high', run: 1, s: 31, D0: -4.6, D1: -2.8,
    note: 'a hexagon landing on the crown\'s rim and twin flights down along the riser, east and west, 3.9 m each (steep: the east one ends at the corner)' },
  { name: 'heliarch-upper', kind: 'stair', hand: 'heliarch', from: 'high', to: 'mid', run: 1, s: 31, D0: 2.7, D1: 7.9,
    note: 'cut 1.9 m into the High Rung, then out over the Mid Rung; lands on a hexagon at D 7.9..10.1' },
  { name: 'timber-patch', kind: 'stair', hand: 'late', from: 'mid', to: 'low', run: 1, s: 31, D0: 10.1, D1: 15.3,
    note: 'the Heliarch flight is broken here; a Late plank flight spans the gap, and the Low Rung\'s lane passes under it' },
  { name: 'heliarch-foot', kind: 'stair', hand: 'heliarch', from: 'low', to: 'bench', run: 1, s: 31, D0: 17.6, D1: 21.4,
    note: 'from the hexagon bastion at D 15.3..17.6 (level with the Low Rung) down into the Lees square' },
  { name: 'noon-main', kind: 'tube', hand: 'noon', from: 'high', to: 'bench', run: 2, s: 9, D0: 3.6, D1: 19.6,
    note: 'the daylight main: laid straight down the three nosings, walked inside on a Late plank stair; open at both ends and breached on the Low Rung' },
  { name: 'rungs-ladder', kind: 'ladder', hand: 'late', from: 'low', to: 'mid', run: 2, s: 19, D0: 10, D1: 10,
    note: 'up the Mid Rung\'s riser, 4 m' },
  { name: 'lees-stair', kind: 'stair', hand: 'late', from: 'bench', to: 'low', run: 2, s: 22.9, sign: -1, D0: 15.4, D1: 17.1,
    note: 'a plank outside stair along the Low Rung\'s riser, 2.9 m: its head at s, the flight going down toward the corner (sign -1)' },
  { name: 'pennyworth-ramp', kind: 'ramp', hand: 'late', from: 'bench', to: 'foot', b0: 41.2, b1: 53,
    note: 'rammed earth and plank down the outside of the lowest riser, from the square\'s east end to the house\'s wall' },
  { name: 'p9-bank', kind: 'ramp', hand: 'late', from: 'bench', to: 'foot', b0: 20, b1: 28,
    note: 'the old way\'s bank across the ha-ha (src/v8/roads/crossings.js), kept' },
  { name: 'lane-bridge', kind: 'bridge', hand: 'late', from: 'mid', to: 'mid', run: 2, s: 20.1, D0: 9.7, D1: 13.3,
    note: 'a plank bridge from the Mid Rung\'s edge to the last pier of a Heliarch aqueduct (D 13.3..15.1, its top level with the Mid Rung): the lookout' },
];
export const way = (name) => WAYS.find((w) => w.name === name) || null;

// ---------------------------------------------------------------- the keep's fallen face (the Quarrels build on it)
// Carcanet Keep's north face lies on the crown where it fell (src/structures/keep.js SLAB, which builds it and walks
// it: these numbers are that file's, kept equal by src/v15/quarters/quarrels.js, which warns if they part): from r0
// out along bearing b for `len` metres on the level, W wide, its top falling from yHi to the turf at its toe.
export const SLAB = (() => {
  const b = 30, r0 = 27, Ls = 17, W = 13, yHi = 24.5, toe = 18.35, a = (b * Math.PI) / 180, th = Math.asin((yHi - toe) / Ls);
  return { b, r0, Ls, W, yHi, toe, len: Ls * Math.cos(th), tan: Math.tan(th), f: [Math.sin(a), -Math.cos(a)], side: [Math.cos(a), Math.sin(a)] };
})();
// a point on it: `along` metres from its propped end (on the level), `side` metres east of its middle line
export const slabAt = (along, side = 0) => [KEEP.x + SLAB.f[0] * (SLAB.r0 + along) + SLAB.side[0] * side, KEEP.z + SLAB.f[1] * (SLAB.r0 + along) + SLAB.side[1] * side];
export const slabTop = (along) => SLAB.yHi - along * SLAB.tan;

// ---------------------------------------------------------------- the plots
// { name, kind, quarter, level, y, x, z, face: [fx, fz], yaw, w (across the front), d (front to back), hand,
//   against (the riser at its back, or null), roof (the level its flat roof should meet, or null), stair ('front': a Late house
//   wide enough, 6.3 m, for the front outside stair to a roof yard; false: no outside stair), stairStrip (on the Rungs:
//   the plot's front 0.9 m is that stair's), slope (a plot on the old ground past the levelled foot: its fall, m), stands ('tread': on a built tread at y, never on heightAt, which lies
//   lower under the slab and lower still over an undercroft; 'ground': on the terrain, which is at y), opening
//   ({ riser, width, height }: the riser's face at its back is left open that wide, centred on the plot: declare it
//   here and the bones leave it), fronts ([route ids] it may stand beside), note }
// A house "against" a riser stands with its back wall on the face, on the lower tread; `roof` is the tread above, so
// its roof is that tread's yard. Corners: plotCorners(p).
const PLOTS_ = [];
function put(name, kind, quarter, level, run, s, D, w, d, hand, extra = {}) {
  const R = RUNS[run], [x, z] = at(run, s, D), f = extra.faceIn ? [-R.n[0], -R.n[1]] : extra.face || R.n;
  const p = { name, kind, quarter, level, y: LEVEL[level].y, x, z, face: [f[0], f[1]], yaw: yawOf(f[0], f[1]), w, d, hand, against: null, roof: null, stands: level === 'bench' || level === 'foot' ? 'ground' : 'tread', run, s, D, ...extra };
  delete p.faceIn;
  PLOTS_.push(p); return p;
}
const free = (name, kind, quarter, level, x, z, face, w, d, hand, extra = {}) => {
  const l = Math.hypot(face[0], face[1]), f = [face[0] / l, face[1] / l], fr = frameOf(x, z);
  const p = { name, kind, quarter, level, y: LEVEL[level].y, x, z, face: f, yaw: yawOf(f[0], f[1]), w, d, hand, against: null, roof: null, stands: 'ground', run: fr.run, s: fr.s, D: fr.D, ...extra };
  PLOTS_.push(p); return p;
};
const HD = 3.7, backD = (riser) => RISERS.find((r) => r.key === riser).D + HD / 2 + 0.05; // a stacked house's depth; its centre's D against a riser

// --- the Rungs: stacked houses. Mid Rung (y 10) against the High Rung's riser, roofs at 14; Low Rung (y 6), roofs at 10.
// Kept clear: the stair (run 1, s 28..34), the tube (run 2, s 6.6..11.4), the ladder (run 2, s 19), the corner.
// (v15-Q2, the Rungs' own changes: mid-5 is the Cantle, a sherd of a carrier standing as an apse where the main's
// line was first laid; low-6 is the dyers' yard under the Tenter, their stair, not a house.)
for (const [i, run, s, w] of [[1, 1, 7.5, 6.3], [2, 1, 14.2, 6.4], [3, 1, 22.6, 6.4], [4, 1, 36.6, 5.2], [6, 2, 15.7, 5.6], [7, 2, 24.3, 6.4]])
  put(`rungs-mid-${i}`, 'house', 'rungs', 'mid', run, s, backD('high'), w, HD, 'late', { against: 'high', roof: 'high' });
for (const [i, run, s, w] of [[1, 1, 6, 6], [2, 1, 17, 5.4], [3, 1, 23.9, 6.4], [4, 1, 38, 5.2], [5, 2, 0.5, 5.8], [7, 2, 25.35, 5.1]])
  put(`rungs-low-${i}`, 'house', 'rungs', 'low', run, s, backD('mid'), w, HD, 'late', { against: 'mid', roof: 'mid' });
// the Cantle [Proposed]: a carrier's sherd needs 4.4 m of depth and the Mid Rung gives 3.8 before its lane, so the
// plot's back lies 0.6 m in the High Rung's riser: the sherd's back is bedded in the step (its maker packs nothing)
put('rungs-cantle', 'carrier', 'rungs', 'mid', 2, 2.25, RISERS[1].D + 1.6, 5.8, 4.4, 'noon', { against: 'high', called: 'the Cantle', note: 'a third of a carrier\'s wall standing as an apse over the High Rung, a plaster house in its lap: where the main\'s line was first laid, beside its head' });
// the dyers' yard [Proposed]: open ground under the Tenter (RUNGS.tenter), vats and tenter-poles; `against` keeps the Mid Rung's nosing clear of the bones' wall above it
put('rungs-dyers', 'yard', 'rungs', 'low', 2, 15.1, backD('mid'), 4.2, HD, 'late', { against: 'mid', called: 'the dyers\' yard', note: 'the dyers\' vats at the Tenter\'s foot; nothing roofed' });
// --- the Lees: shops in the Low Rung's riser (Heliarch undercrofts: round arches let 3.2 m into the step, a Late front
// out on the bench), and two houses that stand free on the square's west side
for (const [i, run, s, w] of [[4, 1, 39.5, 5], [5, 2, 3, 4.6], [6, 2, 15, 4.6]])
  put(`lees-shop-${i}`, 'shop', 'lees', 'bench', run, s, RISERS[3].D - 0.6, w, 5.2, 'heliarch', { against: 'low', roof: 'low', opening: { riser: 'low', width: w - 1, height: 2.6 }, note: 'an undercroft: 3.2 m in under the Low Rung (a bare vault now: its maker fits it out), 2 m of Late front on the bench' });
put('lees-house-3', 'house', 'lees', 'bench', 2, 27.5, 17.5, 5.6, 4.2, 'late', { against: 'low', roof: 'low' });
// --- the Strake: five ages shoulder to shoulder along the foot of the Low Rung's riser on the north run, their fronts
// in one line facing out over the Lees (the old way from the north arrives opposite them; the Heliarch stair's foot
// is at their east end). STRAKE is the row's frame; its five plots, west to east, are strake-elder (where the Elder
// steps die into the turf), strake-late, strake-shop (the riser behind it is cut into an undercroft), strake-carrier
// and strake-new.
export const STRAKE = { run: 1, s0: -6, s1: 28, D0: RISERS[3].D + 0.2, depth: 5.2, slot: 6.8, origin: at(1, -6, RISERS[3].D + 0.2 + 5.2), along: RUNS[1].dir, face: RUNS[1].n, length: 34, y: LEVEL.bench.y,
  slots: ['strake-elder', 'strake-late', 'strake-shop', 'strake-carrier', 'strake-new'] };
[['strake-elder', 'house', 'elder', 'an Elder slab-house: three blocks and a lintel nobody alive could lift, lived in'], ['strake-late', 'house', 'late', null], ['strake-shop', 'shop', 'heliarch', 'the undercroft behind it is cut 3.2 m into the Low Rung'],
  ['strake-carrier', 'carrier', 'noon', 'a length of carrier stood in the row as a house'], ['strake-new', 'new-house', 'new', 'the newest front in the row: the keep\'s fallen ashlar, half built']]
  .forEach(([name, kind, hand, note], i) => put(name, kind, 'lees', 'bench', 1, STRAKE.s0 + STRAKE.slot * (i + 0.5), STRAKE.D0 + STRAKE.depth / 2, STRAKE.slot, STRAKE.depth, hand, { against: 'low', roof: 'low', strake: i, ...(kind === 'shop' ? { opening: { riser: 'low', width: STRAKE.slot - 1, height: 2.6 } } : {}), ...(note ? { note } : {}) }));
// (v15-Q3: the fountain stands 3 m west of where V0 drew it, before the Strake's sherd (the vessel's wall there, its foot here),
// on the line of sight from the old way's bank through the arch at its head, and is 3.4 m, a vessel's foot, not 2.6.)
put('fountain', 'fountain', 'lees', 'bench', 1, 19.6, 25.0, 3.4, 3.4, 'noon', { fronts: ['P9', 'P41'], title: 'the Fountain of Noon', note: 'the fountain of noon: a vessel\'s broken foot that wells stored daylight (src/v15/quarters/lees/fountain.js)' });
// (v15-Q3: a stall on the square, its back to the brink and its counter to the street. Titles are [Proposed].)
put('lees-stall-salt', 'stall', 'lees', 'bench', 1, 10.2, 25.1, 2.8, 2.2, 'late', { faceIn: true, fronts: ['P41'], title: 'the Tare', note: 'the salt-weigher\'s stall: a slab counter under one cloth, a balance' });
for (const [n, t] of [['lees-shop-4', 'the Lagan'], ['lees-shop-5', 'the Ullage'], ['lees-shop-6', 'the Welt'], ['lees-house-3', 'the Rebate']]) PLOTS_.find((q) => q.name === n).title = t; // [Proposed]: the dead-letter counter, the vintner, the slipper-maker, the picture-framer
// --- the Quarrels: the crown. The keep's fallen face (SLAB) lies across its west half and the corner's blocks are
// strung from the wound to the rim at the east run's s 11..14, so: the new house stands east of them (it stood on
// them at s 15), hard by the aqueduct's line; the masons' lodging leans on the slab's west flank, its roof level with
// the slab where the two meet (the slab is the way up to it); a narrow house stands on the rim at the west end.
put('new-house', 'new-house', 'quarrels', 'crown', 2, 24, -9.4, 7, 5.6, 'new', { title: 'the Unroofed House', note: 'half built, of the keep\'s own fallen ashlar: pale stone, raw scaffold. [Proposed] name' });
put('masons-yard', 'yard', 'quarrels', 'crown', 2, 5.0, -6.7, 5.4, 3.2, 'new', { title: 'the Banker', stock: 'quarrels', note: 'the stock squared up on the brink east of the saint; `stock`: the quarter builds the blocks (src/v15/quarters/quarrels.js), the Demesne only gives up its fallen ones' });
{ const a = 7.6, d = 4.4, [x, z] = slabAt(a, -SLAB.W / 2 - d / 2 + 0.04); // (its back wall's outer face a finger inside the slab's flank: no two faces in one plane)
  free('quarrels-house-1', 'house', 'quarrels', 'crown', x, z, [-SLAB.side[0], -SLAB.side[1]], 6, d, 'late', { leans: 'slab', roofY: slabTop(a), title: 'the Leaning Lodging', note: 'the masons\' lodging, its back on the west flank of the keep\'s fallen face, its roof level with the face where they meet: the slab is its stair. [Proposed] name' }); }
put('quarrels-house-2', 'house', 'quarrels', 'crown', 1, 6.5, -7.5, 4.4, 4.2, 'late', { title: 'the Brow House', note: 'narrow, on the rim where the steps come out of the turf: the first lit window a traveller from the west sees. [Proposed] name' });
// --- the Pennyworth: the foot
// (v15-Q4: the carrier's plot is 5.8 deep, the widest a wreck is made; the two houses stand north of the house's stable,
// one on the flat between the stable and the gate, one up on the field bank across the lane from it; the garden is
// the ground between the stalls, the wall lane, the kerb and the ramp's foot)
free('carrier-house', 'carrier', 'pennyworth', 'foot', ...polar(60.5, HAHA + 3.6), [Math.sin(60.5 * Math.PI / 180), -Math.cos(60.5 * Math.PI / 180)], 12, 5.8, 'noon', { fronts: ['K1'], note: 'the Spilt Measure [Proposed]: a carrier fallen off the end of the daylight main and lying along the lowest riser, half sunk: someone lives in the sound half, the broken half is a garden' });
free('pennyworth-house-1', 'house', 'pennyworth', 'foot', 112.2, -53.3, [1, 0], 6, 4.4, 'late', { y: -0.2, note: 'north of the house\'s stable, its back to the house\'s east wall, facing the gate lane' });
free('pennyworth-house-2', 'house', 'pennyworth', 'foot', 121.7, -54.3, [-1, 0], 6.2, 4.4, 'late', { y: 0.95, note: 'up on the field bank across the lane from the first, a metre over it: steps down the bank from its door' });
// (v15-Q4 round 2) the foot built up to the house: a street down the old kerb, the Hitch's far side, and a pair facing the house's gate. Their `y` is nominal: the quarter's module stands each at the ground before its door, on a footing of older stone where the ground falls away under it.
free('pennyworth-kerb-1', 'house', 'pennyworth', 'foot', 116.9, -22.1, [-0.86, 0.5], 6, 4.4, 'late', { y: -1.8, slope: 0.8, fronts: ['K1'], note: 'across the old kerb from the garden' });
free('pennyworth-kerb-2', 'house', 'pennyworth', 'foot', 120.6, -15.8, [-0.86, 0.5], 5.6, 4.2, 'late', { y: -1.85, slope: 0.9, fronts: ['K1'], note: 'across the old kerb from the wreck' });
free('pennyworth-east-1', 'house', 'pennyworth', 'foot', 118.2, -30, [-1, 0], 5.2, 4.4, 'late', { y: -1.5, slope: 1.2, note: 'at the Thumbway\'s east end, facing the house\'s corner tower' });
free('pennyworth-hitch-3', 'house', 'pennyworth', 'foot', 121, -39, [-1, 0], 5.6, 4.4, 'late', { y: 1.05, slope: 1.4, note: 'on the Hitch, facing the stable\'s back' });
free('pennyworth-hitch-4', 'house', 'pennyworth', 'foot', 121.2, -45.3, [-1, 0], 5.8, 4.4, 'late', { y: 1.45, slope: 1.0, note: 'on the Hitch, facing the stable\'s back' });
free('pennyworth-gate-1', 'house', 'pennyworth', 'foot', 104, -68.6, [0, 1], 6, 4.4, 'late', { y: 1.55, slope: 0.9, note: 'across the gate\'s road from the house, facing its gate' });
free('pennyworth-gate-2', 'house', 'pennyworth', 'foot', 110.8, -69.4, [0.1, 1], 5.6, 4.4, 'late', { y: 0.95, slope: 1.7, note: 'beside it, toward the Hitch' });
free('pennyworth-stall-1', 'shop', 'pennyworth', 'foot', 97.5, -26.4, [0, -1], 3.4, 2.4, 'late', { note: 'a stall under the ramp\'s revetment, facing the house\'s south wall across the lane' });
free('pennyworth-stall-2', 'shop', 'pennyworth', 'foot', 101.2, -24.4, [0.2, -0.98], 3.4, 2.4, 'late');
free('pennyworth-garden', 'garden', 'pennyworth', 'foot', 107.45, -21.5, [0, -1], 4.7, 6.2, 'late', { fronts: ['K1'], note: 'the Grudge [Proposed]: beans on poles, a well under a Heliarch drum, and the Tesserine Moles\' heaps in the beds' });
// --- the tube's line, as a plot: nothing else is built on it
{ const w = WAYS.find((v) => v.name === 'noon-main'); put('tube-line', 'tube', 'rungs', 'high', w.run, w.s, (w.D0 + w.D1) / 2, 4.4, w.D1 - w.D0, 'noon', { note: 'the daylight main\'s bed, 4.4 m wide: lanes pass under it, nothing stands on it' }); }

{ const w = WAYS.find((v) => v.name === 'lane-bridge'); put('bridge-pier', 'pier', 'rungs', 'low', w.run, w.s, 14.2, 2, 1.8, 'heliarch', { note: 'the aqueduct\'s last pier; the bridge lands on it' }); }

// a Late house with an outside stair up its front to a roof yard needs 6.3 m of front (V1's makers): `stair` says which plots have it
for (const p of PLOTS_) if (p.kind === 'house') p.stair = p.hand === 'late' && p.w >= 6.3 ? 'front' : false;
// On the Rungs a tread is 5.4 m deep: a plot is 3.7 and the lane 1.4. So a front stair stands inside its plot: the
// plot's front 0.9 m is the stair's strip, and that house's wall stands 0.9 m back from the plot's front (`stairStrip`).
for (const p of PLOTS_) if (p.stair === 'front' && p.quarter === 'rungs') p.stairStrip = 0.9;
export const PLOTS = PLOTS_;
// The Pennyworth's small standing things that are not plots (v15-Q4): the market's stalls, the lean-tos against the
// lowest riser, the well, the posts where the village ends. { name, x, z, r (what it keeps clear), face: [fx, fz] }.
// The quarter's module builds each where this says; the moles keep off them (molesMay).
const fix = (name, x, z, r, face, note) => { const l = Math.hypot(face[0], face[1]); return { name, x, z, r, face: [face[0] / l, face[1] / l], y: LEVELS[5].y, note }; };
const onRiser = (name, b, r, note) => { const a = (b * Math.PI) / 180, [x, z] = polar(b, HAHA + 0.3); return { name, x, z, r, face: [Math.sin(a), -Math.cos(a)], bearing: b, y: LEVELS[5].y, note }; };
export const FIXTURES = [
  fix('cloth-stall', 95.0, -28.2, 0.9, [0.3, -1], 'a three-cornered cloth from the ramp\'s revetment to one pole, in the pocket by the south door: slippers, when there are any'),
  fix('salt-stall', 106.0, -26.5, 1.3, [0, -1], 'the salt-weigher\'s: a plank on two Heliarch drums, the Twk-men\'s perch, a peg at thumb height'),
  fix('news-block', 108.35, -26.1, 1.2, [-0.15, -1], 'a counter that is a block of the keep, fallen with its carved face up: news is sold over it'),
  fix('well', 106.2, -23.5, 1.0, [0, -1], 'the well: a Heliarch drum bored through, a sweep on a forked post'),
  fix('west-post-1', 70.3, -47, 0.6, [0, 1], 'a post of drums and a lamp where the west way (the path P9) passes the house\'s west wall'),
  fix('west-post-2', 86.2, -66.6, 0.6, [0, 1], 'the same, where the west way comes round to the gate\'s road'),
  onRiser('riser-buttress', 65.6, 0.9, 'a Late buttress of plastered rubble raked against the Elder face'),
  onRiser('riser-repair', 67.1, 1.7, 'the Heliarchy\'s repair: a panel of exact ashlar let into the giants\' face, a blind arch in it'),
  onRiser('leanto-oil', 69.1, 1.5, 'a lean-to against the riser under a plank roof: lamp oil'),
  onRiser('leanto-slippers', 70.9, 1.4, 'a second, lower: its board is bare'),
  fix('leave-east', 122.5, -6.8, 0.6, [0.504, 0.863], 'the Leave [Proposed]: two posts either side of the old kerb where the village ends, and the last lamp'),
  fix('leave-west', 119.7, -5.2, 0.6, [0.504, 0.863], 'its fellow, broken short'),
];
export const fixture = (name) => FIXTURES.find((f) => f.name === name) || null;
// where a mole may heap in the Pennyworth: in the garden's beds and the bare earth of the market, never under a
// building, a stall, the well or a lane's worn line
export function molesMay(x, z) {
  for (const p of PLOTS_) if (p.quarter === 'pennyworth' && p.kind !== 'garden' && inPlot(p, x, z, 0.5)) return false;
  for (const f of FIXTURES) if ((x - f.x) ** 2 + (z - f.z) ** 2 < (f.r + 0.4) ** 2) return false;
  return footLaneDist(x, z) > 0.3;
}
// metres outside the nearest lane of the foot (negative on it): the Thumbway and the Hitch
export function footLaneDist(x, z) {
  let best = Infinity;
  for (const l of LANES) if (l.level === 'foot') for (let i = 0; i < l.pts.length - 1; i++) {
    const a = l.pts[i], b = l.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = clamp01(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz));
    const d = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) - l.width / 2;
    if (d < best) best = d;
  }
  return best;
}
export const plot = (name) => PLOTS.find((p) => p.name === name) || null;
// a plot's four corners, world [x, z]: front-left, front-right, back-right, back-left (as seen from in front, looking at it)
export function plotCorners(p) {
  const [fx, fz] = p.face, rx = -fz, rz = fx, hw = p.w / 2, hd = p.d / 2;
  return [[p.x + fx * hd + rx * hw, p.z + fz * hd + rz * hw], [p.x + fx * hd - rx * hw, p.z + fz * hd - rz * hw],
    [p.x - fx * hd - rx * hw, p.z - fz * hd - rz * hw], [p.x - fx * hd + rx * hw, p.z - fz * hd + rz * hw]];
}
// is (x, z) inside a plot's footprint, grown by `pad`
export function inPlot(p, x, z, pad = 0) {
  const dx = x - p.x, dz = z - p.z, [fx, fz] = p.face;
  return Math.abs(dx * fx + dz * fz) <= p.d / 2 + pad && Math.abs(-dx * fz + dz * fx) <= p.w / 2 + pad;
}

// ---------------------------------------------------------------- the Quarrels' own places (src/v15/quarters/quarrels.js builds them)
// Everything the crown's quarter stands where no plot is, in the run frame: [run, s, D]. The keep's fallen blocks lie
// where they fell (src/structures/keep.js); these are set between them. Names are [Proposed].
const xz = (run, s, D) => { const [x, z] = at(run, s, D); return { run, s, D, x, z }; };
export const QUARRELS = {
  // the Smoking Saint: the lime kiln, in the head of the keep's fallen colossus. He lies in the Saint's Rest behind the
  // Heliarch stair's head, east of its axis (clear of the landing, D > -7.4, and of the long view down the notch):
  // `face` the way he looks (at the stair's head, and past it at the Pomegranate House), so the stair's head has his
  // face and the square and the causeway's end his profile; `stoke`: the side his fire is fed from (the yard's)
  kiln: { ...xz(1, 33.59, -8.86), face: [-0.15, -0.99], stoke: [0.6, 0.8], S: 1.7, name: 'the Smoking Saint' },
  // (the bench stands at his right cheek, looking where he looks); three lesser heads on the brink, waiting
  heads: [[1, 33.72, -5.5, 0.44], [1, 34.38, -5.52, 0.35], [1, 34.9, -5.5, 0.27]],
  // the aqueduct's last arch, on the line of the Rungs' last pier (WAYS lane-bridge): its two piers' D; the water it
  // still carries drips off its broken end into the saint's upturned hand
  aqueduct: { run: 2, s: way('lane-bridge').s, piers: [-20.6, -13.4], name: 'the Last Arch' },
  hand: { ...xz(2, way('lane-bridge').s, -11.15), name: 'the Almoner' },
  // the quarry in the keep's wound: the shears over the block being lifted, the block split with wedges
  shears: xz(2, 4.5, -14.5),
  split: xz(1, 28.36, -11.92),
  // the Drag: the plank track from the shears round the stock and along the brink to the new house's stock
  track: [[2, 6.4, -13.9], [2, 10.8, -6.6], [2, 13.0, -5.6], [2, 17, -5.6], [2, 21.0, -6.5]].map(([r, s, D]) => xz(r, s, D)),
  sledge: 0.3, // how far along the Drag's first length the loaded sledge stands
  // the square's paving (Heliarch hexagons relaid in a patch round the stair's head court): north run, s and D
  paving: { run: 1, s0: 23.4, s1: 35.7, D0: -12.4, D1: -4.98 },
  square: 'the Saint\'s Rest',
};
// the Quarrels walked: from the west end between the two houses, along the brink past the slab's toe, across the
// square to the split block and the shears, down the Drag, past the hand, to the new house's door
export const QUARRELS_ROUTE = [[1, 5.5, -11.4], [1, 10.5, -10.5], [1, 13.5, -7.2], [1, 22, -6.6], [1, 27.2, -8.6], [1, 29.92, -9.36], [1, 32.27, -11.75], [2, 5.74, -12.25], [2, 7.4, -12.6], [2, 10.6, -7.4], [2, 13.0, -5.8], [2, 17.5, -6.4], [2, 19.2, -8.2], [2, 21.4, -6.2], [2, 24.8, -6.2], [2, 24.8, -7.4]]
  .map(([r, s, D]) => [...at(r, s, D), LEVEL.crown.y]);

// ---------------------------------------------------------------- cuts: where a tread is cut down into
// { name, run, s0, s1, D0, D1, y }: the ground there is at y (the Demesne's height hook reads cutAt). A shop against
// a riser is an undercroft let 3.2 m into the step behind it, at the bench's level; the Heliarch stair is cut 1.9 m
// into the High Rung.
export const VAULT_DEPTH = 3.2;
export const CUTS = [
  ...PLOTS.filter((p) => p.kind === 'shop' && p.against).map((p) => { const R = RISERS.find((r) => r.key === p.against); return { name: p.name, run: p.run, s0: p.s - p.w / 2 + 0.4, s1: p.s + p.w / 2 - 0.4, D0: R.D - VAULT_DEPTH - 0.2, D1: R.D + 0.4, y: R.foot - 0.04 }; }),
  { name: 'heliarch-upper', run: STAIR.run, s0: STAIR.s - STAIR.width / 2 - 0.3, s1: STAIR.s + STAIR.width / 2 + 0.3, D0: way('heliarch-upper').D0, D1: RISERS[1].D + 0.4, y: LEVEL.mid.y - SINK },
];
const _f = { run: 0, s: 0, D: 0 };
// the cut's level at (x, z), or null; `pad` widens every cut (the mesh's coarse pass: its lower envelope)
export function cutAt(x, z, pad = 0) {
  frameOf(x, z, _f);
  let y = null;
  for (const c of CUTS) if (c.run === _f.run && _f.s > c.s0 - pad && _f.s < c.s1 + pad && _f.D > c.D0 - pad && _f.D < c.D1 + pad && (y === null || c.y < y)) y = c.y;
  return y;
}

// ---------------------------------------------------------------- the Rungs' own (v15-Q2)
// What src/v15/quarters/rungs.js builds between its plots, in the run frame; names [Proposed], in the valley's voice.
export const RUNGS = {
  // the dyers' stair: a plank flight down the Mid Rung's riser on the east run, its head at s (a plank landing east of it), going down toward the corner
  tenter: { name: 'the Tenter', id: 'rungs-tenter', run: 2, s: 17.05, sign: -1, out: 0.9, width: 1.3, run1: 0.25 },
  // the slot stair at the corner, straight down the bisector between rungs-low-4 and rungs-low-5: the meanest way, and whole
  gullet: { name: 'the Gullet', id: 'rungs-gullet', clear: 0.6, width: 1.05 },
  // the Heliarch service flight east of the aqueduct's pier, down along the riser from its head at s: seven treads of it, and then the end wall of rungs-low-7, which was built over the rest
  stub: { name: 'the Short Stair', run: 2, s: 21.25, sign: 1, width: 1.1 },
  // the lane under the main on the Low Rung: a door in the step, a niche, a lamp
  slype: { name: 'the Slype', run: 2, s0: 7.2, s1: 10.9, D: 11.5 },
  // where three stairs of three ages are seen side by side in one look (the Short Stair at the feet, the Tenter, the main beyond): the west end of rungs-low-7's roof, a bench against its parapet
  squint: { name: 'the Squint', plot: 'rungs-low-7' },
  // the roof walk on the Low Rung's roofs (the Mid Rung's level), west to east; a crossing between each pair that has no stair between
  leads: { name: 'the Leads', roofs: ['rungs-low-1', 'rungs-low-2', 'rungs-low-3', 'rungs-low-4', 'rungs-low-5'], crossings: [['rungs-low-1', 'rungs-low-2'], ['rungs-low-2', 'rungs-low-3'], ['rungs-low-4', 'rungs-low-5']] },
  // the house stairs the plan gives (stair: 'front'), each a way between two treads: their ascents' ids
  stairs: ['rungs-mid-1', 'rungs-mid-2', 'rungs-mid-3', 'rungs-mid-7', 'rungs-low-3'].map((n) => `${n}-stair`),
};

// ---------------------------------------------------------------- the places the geometry check walks (#64)
// tools/geometry-test.mjs and tools/route-frames.mjs read this list (the format: tools/geometry/places.mjs). Each way
// is its registered ascent; each level is its lane walked end to end; the crown is the court behind the stair's head.
// A quarter adds its own places here as it builds.
const laneRoute = (name) => { const l = LANES.find((q) => q.name === name); return l.pts.map(([x, z]) => [x, z, l.y]); };
// what the village's ground change left where it lay, hidden: older things under a built tread or under the levelled foot
// (and what stood here before v15 and is seen from the village's places as it was: not the village's to mend)
const OLD = {
  'structures-keep': 'Carcanet Keep\'s fallen corner, as it stood before v15, seen from the crown',
  'house-lamps': 'the Pomegranate House\'s lanterns are one-sided glass (v14-B3; the place `house` carries sixteen such on next): from the village\'s places their backs are seen as they are from the house\'s own. Not the ground: the house\'s ground is as it was',
};
const BURIED = {
  ...OLD,
  'structures-drums*': 'the causeway\'s old fallen drums, now under the Mid Rung\'s tread: not seen',
  'structures-ashlars*': 'the causeway\'s old fallen ashlars, now under a tread: not seen',
  'rocks-pebble*': 'a pebble of the old slope under a tread: not seen',
  'roads-gnomons': 'a road gnomon stands through the High Rung\'s tread into the ground 0.3 m under it',
  'livery-slate': 'the house\'s slates lie under the Pennyworth\'s levelled ground: not seen',
  'demesne-peafowl-trains*': 'a perched bird\'s train hangs free',
  'threads-chair-marks': 'a mark drawn on the ground, level here since the bench was levelled',
};
export const GEOMETRY_PLACES = [
  ...['heliarch-head-east', 'heliarch-head-west', 'heliarch-upper', 'timber-patch', 'heliarch-foot', 'rungs-ladder', 'lane-bridge', 'lees-stair', 'pennyworth-ramp']
    .map((id) => ({ name: `lappet-${id}`, ascent: id, half: 5, exempt: BURIED })),
  { name: 'lappet-noon-main', ascent: 'noon-main', half: 6, exempt: BURIED }, // the daylight main: cracked and breached, so never `sealed`
  { name: 'quarrels', pts: QUARRELS_ROUTE, half: 8, exempt: BURIED }, // the crown's quarter: the lodgings, the square, the quarry, the Drag, the new house
  { name: 'lappet-crown', pts: [[...at(1, 20, -8), LEVEL.crown.y], [...at(1, STAIR.s, -7), LEVEL.crown.y], [...at(2, 6, -8), LEVEL.crown.y]], half: 6, exempt: BURIED },
  { name: 'lappet-high', pts: [[...at(1, 5, 0.6), LEVEL.high.y], [...at(1, cornerS(1, 0.6), 0.6), LEVEL.high.y], [...at(2, 27, 0.6), LEVEL.high.y]], half: 6, exempt: BURIED },
  { name: 'lappet-mid', pts: laneRoute('mid-lane'), half: 5, exempt: BURIED },
  { name: 'lappet-low', pts: laneRoute('low-lane'), half: 5, exempt: BURIED },
  { name: 'lappet-lees', pts: [at(1, 2, 22.6), at(1, 29, 22.6), at(1, cornerS(1, 18.6), 18.6), at(2, 14, 18.4), at(2, 24, 18)], half: 7, near: ['rungs-houses', 'rungs-ways'], exempt: BURIED }, // (near: the Rungs' houses stand over it, beyond its region, and are taken in part)
  // (v15-Q3) the Lees' square from the old way's bank: through the arch, round the fountain, past the stall to the stair's foot and the Lagan
  { name: 'lappet-lees-square', pts: [at(1, 12.6, 31.4), at(1, 14.4, 28.7), at(1, 16.9, 25.6), at(1, 10.4, 23.2), at(1, 17.4, 22.5), at(1, 22.6, 22.4), at(1, 24.7, 24.1), at(1, 28.6, 23.1), at(1, 32.8, 22.5), at(1, 35.8, 19.8), at(1, 39.5, 18.9)], half: 6, exempt: BURIED },
  { name: 'lappet-pennyworth', pts: [[HOUSE.door.x, HOUSE.door.z + 1.5, LEVELS[5].y], ...LANES.find((q) => q.name === 'wall-lane').pts], half: 6, exempt: BURIED }, // the Thumbway, from the south door's step
  { name: 'lappet-pennyworth-market', pts: [[98.6, -28.6], [103.5, -28], [107.2, -27.6], [110.8, -26.4], [112.6, -21], [115.2, -16.2], [118.2, -10.6], [121.1, -6]], half: 6, exempt: BURIED }, // along the stalls and down the old kerb past the wreck to the Leave
  { name: 'lappet-pennyworth-foot', pts: [[103.6, -16.8], [106.6, -17.5], [110.9, -17.5], [113.4, -19.2]], half: 5, exempt: BURIED }, // from the ramp's foot between the garden and the wreck's neck to the kerb
  { name: 'lappet-pennyworth-skirts', pts: [[117.6, -9.5], [116.2, -3.5], [115.8, 1.6]], half: 8, exempt: BURIED }, // along the lowest riser east of the wreck: the repair, the buttress, the lean-tos
  { name: 'lappet-pennyworth-hitch', pts: LANES.find((q) => q.name === 'gate-lane').pts.slice(0, 6), half: 9, exempt: { ...BURIED, 'structures-taverna': 'the Pomegranate House is judged whole in its own place, `house`: here the take cuts it at the region\'s edge', 'house-props': 'as the house' } }, // the Hitch, round the stable and between the two houses
  // the Rungs (v15-Q2): its own ways, and the Leads walked along the Low Rung's roofs
  ...[RUNGS.tenter.id, RUNGS.gullet.id, ...RUNGS.stairs].map((id) => ({ name: `lappet-${id}`, ascent: id, half: 5, exempt: BURIED })),
  ...RUNGS.leads.crossings.map((c, i) => ({ name: `lappet-rungs-leads-${i + 1}`, ascent: `rungs-leads-${i + 1}`, half: 5, near: ['rungs-houses', 'village-row'], exempt: BURIED })),
  { name: 'lappet-rungs-squint', pts: [[...at(2, 27, 11.6), LEVEL.mid.y], [...at(2, 23.4, 11.6), LEVEL.mid.y]], half: 6, exempt: BURIED },
];
