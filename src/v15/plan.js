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
export const benchAmt = (b) => { const u = b >= 300 ? b - 360 : b; return sstep(2, 12, u) * (1 - sstep(84, 94, u)); };
// the foot is levelled to -0.8 in the wedge under the house's south wall (bearings 34 to 70, 14 m out from the ha-ha)
export function footAmt(x, z, r = radiusOf(x, z), b = bearingOf(x, z)) {
  const u = b >= 300 ? b - 360 : b;
  return sstep(30, 36, u) * (1 - sstep(64, 76, u)) * (1 - sstep(HAHA + 10, HAHA + 20, r));
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
  if (D >= RISERS[3].D) return u > 4 && u < 92 ? LEVEL.bench : null;
  if (villageAmt(x, z) <= 0) return null;
  if (D < RISERS[0].D) return D > RISERS[0].D - APRON - 6 ? LEVEL.crown : null;
  return D < RISERS[1].D ? LEVEL.high : D < RISERS[2].D ? LEVEL.mid : LEVEL.low;
}
// the lanes round the Pomegranate House (x 82..108, z -58..-32) that belong to the Pennyworth: 9 m out from its east
// wall and 5 m from its south
export const HOUSE = { x0: 82, x1: 108, z0: -58, z1: -32, gate: [95, -58], ground: -0.8 };
function inHouseLanes(x, z) { return x > HOUSE.x1 && x < HOUSE.x1 + 9 && z > HOUSE.z0 - 4 && z < HOUSE.z1 + 6; }
export function quarterOf(x, z) { const l = levelAt(x, z); return l ? l.quarter : null; }
// where the village has the ground to itself: no yews, blocks, grass tufts, rocks or scatter. A margin wider than the
// built ground (2 m), and the whole of the fades.
export function villageClear(x, z) {
  const r = radiusOf(x, z);
  if (r > HAHA + 22 || r < 30) return false;
  const b = bearingOf(x, z), u = b >= 300 ? b - 360 : b;
  if (r >= HAHA - 1) return footAmt(x, z, r, b) > 0.02 || inHouseLanes(x, z);
  const D = Dof(x, z);
  if (D >= RISERS[3].D - 2) return u > 8 && u < 90;
  return villageAmt(x, z) > 0 && D > RISERS[0].D - APRON;
}

// ---------------------------------------------------------------- the outlines (polylines, world x z)
// a line at D along both runs, from s1 = a on run 1 to s2 = b on run 2, mitred at the corner
export function lineAt(D, a = FADE.s1[0], b = FADE.s2[1]) { return [at(1, a, D), at(1, cornerS(1, D), D), at(2, b, D)]; }
// each riser's face (the ha-ha's as a polyline of 2-degree chords over the sector)
export const OUTLINES = Object.fromEntries(RISERS.map((R) => [R.key, R.D !== undefined ? lineAt(R.D)
  : Array.from({ length: 48 }, (_, i) => polar(2 + i * 2, R.r))]));

// ---------------------------------------------------------------- lanes: { name, level, width, pts: [[x, z], ...] }
const lane = (name, level, width, pts, note) => ({ name, level, y: LEVEL[level].y, width, pts, note });
export const LANES = [
  lane('high-lane', 'high', ROAD_HALF * 2, lineAt(0), 'the causeway on the High Rung: the Elder tread is the road'),
  lane('mid-lane', 'mid', 1.6, lineAt(9.1, 4, 28), 'the Mid Rung\'s outer strip, in front of its houses; the Low Rung\'s roofs widen it'),
  lane('low-lane', 'low', 1.6, lineAt(14.5, 4, 28), 'the Low Rung\'s outer strip'),
  lane('lees-street', 'bench', 3, [at(1, -4, 19), at(1, 12, 19.5), at(1, 30, 21), at(1, cornerS(1, 18.6), 18.6), at(2, 14, 18.4), at(2, 30, 18)], 'the bench\'s street: it bends at the square and again at the corner'),
  lane('wall-lane', 'foot', 2.4, [[87, -29.6], [96, -29.2], [108, -28.4], [112.5, -31]], 'under the house\'s south wall, from the ramp\'s foot to its east side'),
  lane('gate-lane', 'foot', 2.4, [[112.5, -31], [112, -45], [110.5, -59], [100, -62.5], [95, -61]], 'round the house\'s east side to its gate'),
];

// ---------------------------------------------------------------- the two squares
export const SQUARES = [
  { name: 'quarrels-square', level: 'crown', quarter: 'quarrels', note: 'the upper square, at the stair\'s head: the masons\' ground',
    pts: [at(1, 25, -5.2), at(1, cornerS(1, -5.2), -5.2), at(2, 9, -5.2), at(2, 9, -13), at(1, 25, -13)] },
  { name: 'lees-square', level: 'bench', quarter: 'lees', note: 'the main square: arrived in from the stair\'s foot, the fountain off its centre',
    pts: [at(1, 12, 16), at(1, 33.5, 16), at(1, 34, 24.6), at(1, 24, 26.2), at(1, 12, 27.3)] },
];

// ---------------------------------------------------------------- the ways between levels
// Each: { name, kind, hand, from, to (level keys), run, s, D0, D1 (its line in the run frame), note }. The kits in
// src/v15/ways/ build them from these records; a quarter adds its own with the same kit and a record of its own.
export const STAIR = { run: 1, s: 31, width: 3 }; // the Heliarch stair's axis: straight out from the road at s 31, at the house's south-west corner
export const WAYS = [
  { name: 'heliarch-head', kind: 'stair', hand: 'heliarch', from: 'crown', to: 'high', run: 1, s: 31, D0: -4.6, D1: -2.8,
    note: 'a hexagon landing on the crown\'s rim and twin flights down along the riser, east and west, 6.4 m each' },
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
  { name: 'lees-stair', kind: 'stair', hand: 'late', from: 'bench', to: 'low', run: 1, s: 9, D0: 15.4, D1: 16.6,
    note: 'a plank outside stair along the Low Rung\'s riser, 2.9 m' },
  { name: 'pennyworth-ramp', kind: 'ramp', hand: 'late', from: 'bench', to: 'foot', b0: 40, b1: 53,
    note: 'rammed earth and plank down the outside of the lowest riser, from the square\'s east end to the house\'s wall' },
  { name: 'p9-bank', kind: 'ramp', hand: 'late', from: 'bench', to: 'foot', b0: 20, b1: 28,
    note: 'the old way\'s bank across the ha-ha (src/v8/roads/crossings.js), kept' },
  { name: 'lane-bridge', kind: 'bridge', hand: 'late', from: 'mid', to: 'mid', run: 2, s: 24, D0: 9.6, D1: 13.4,
    note: 'a plank bridge from the Mid Rung\'s edge to a Low Rung roof, over the low lane' },
];
export const way = (name) => WAYS.find((w) => w.name === name) || null;

// ---------------------------------------------------------------- the plots
// { name, kind, quarter, level, y, x, z, face: [fx, fz], yaw, w (across the front), d (front to back), hand,
//   against (the riser at its back, or null), roof (the level its flat roof should meet, or null), note }
// A house "against" a riser stands with its back wall on the face, on the lower tread; `roof` is the tread above, so
// its roof is that tread's yard. Corners: plotCorners(p).
const PLOTS_ = [];
function put(name, kind, quarter, level, run, s, D, w, d, hand, extra = {}) {
  const R = RUNS[run], [x, z] = at(run, s, D), f = extra.faceIn ? [-R.n[0], -R.n[1]] : extra.face || R.n;
  const p = { name, kind, quarter, level, y: LEVEL[level].y, x, z, face: [f[0], f[1]], yaw: yawOf(f[0], f[1]), w, d, hand, against: null, roof: null, run, s, D, ...extra };
  delete p.faceIn;
  PLOTS_.push(p); return p;
}
const free = (name, kind, quarter, level, x, z, face, w, d, hand, extra = {}) => {
  const l = Math.hypot(face[0], face[1]), f = [face[0] / l, face[1] / l], fr = frameOf(x, z);
  const p = { name, kind, quarter, level, y: LEVEL[level].y, x, z, face: f, yaw: yawOf(f[0], f[1]), w, d, hand, against: null, roof: null, run: fr.run, s: fr.s, D: fr.D, ...extra };
  PLOTS_.push(p); return p;
};
const HD = 3.7, backD = (riser) => RISERS.find((r) => r.key === riser).D + HD / 2 + 0.05; // a stacked house's depth; its centre's D against a riser

// --- the Rungs: stacked houses. Mid Rung (y 10) against the High Rung's riser, roofs at 14; Low Rung (y 6), roofs at 10.
// Kept clear: the stair (run 1, s 28..34), the tube (run 2, s 6.6..11.4), the ladder (run 2, s 19), the corner.
for (const [i, run, s, w] of [[1, 1, 7.5, 5.6], [2, 1, 14, 6.2], [3, 1, 21.5, 5.4], [4, 1, 36.6, 5.2], [5, 2, 2.4, 5], [6, 2, 15, 5.6], [7, 2, 24, 6]])
  put(`rungs-mid-${i}`, 'house', 'rungs', 'mid', run, s, backD('high'), w, HD, 'late', { against: 'high', roof: 'high' });
for (const [i, run, s, w] of [[1, 1, 6, 6], [2, 1, 17, 5.4], [3, 1, 23.5, 5.6], [4, 1, 38, 5.2], [5, 2, 0.5, 5.8], [6, 2, 14.5, 5], [7, 2, 24, 5.6]])
  put(`rungs-low-${i}`, 'house', 'rungs', 'low', run, s, backD('mid'), w, HD, 'late', { against: 'mid', roof: 'mid' });
// --- the Lees: shops in the Low Rung's riser (Heliarch undercrofts: round arches let 3.2 m into the step, a Late front
// out on the bench), and two houses that stand free on the square's west side
for (const [i, run, s, w] of [[1, 1, 15, 4.6], [2, 1, 20.5, 4.6], [3, 1, 26, 4.6], [4, 1, 39.5, 5], [5, 2, 3, 4.6], [6, 2, 15, 4.6], [7, 2, 21, 4.6]])
  put(`lees-shop-${i}`, 'shop', 'lees', 'bench', run, s, RISERS[3].D - 0.6, w, 5.2, 'heliarch', { against: 'low', roof: 'low', note: 'an undercroft: 3.2 m in under the Low Rung, 2 m of Late front on the bench' });
put('lees-house-1', 'house', 'lees', 'bench', 1, 3, 18, 6, 4.4, 'late', { against: 'low', roof: 'low' });
put('lees-house-2', 'house', 'lees', 'bench', 1, 8.5, 24.5, 5.4, 4.6, 'late', { faceIn: true, note: 'free-standing, on the ha-ha\'s edge, its front to the street' });
put('lees-house-3', 'house', 'lees', 'bench', 2, 27.5, 17.5, 5.6, 4.2, 'late', { against: 'low', roof: 'low' });
put('fountain', 'fountain', 'lees', 'bench', 1, 21, 21.2, 5, 5, 'noon', { note: 'the fountain of noon: a carrier\'s broken punt that wells stored daylight' });
// --- the Quarrels: the crown
put('new-house', 'new-house', 'quarrels', 'crown', 2, 15, -9.4, 7, 5.6, 'new', { note: 'half built, of the keep\'s own fallen ashlar: pale stone, raw scaffold' });
put('masons-yard', 'yard', 'quarrels', 'crown', 2, 4, -11.5, 9, 7, 'new', { note: 'the lime pit, the sledge on rollers, the banker; the Demesne\'s fallen blocks stacked as stock' });
put('quarrels-house-1', 'house', 'quarrels', 'crown', 1, 18, -8, 5.6, 4.4, 'late', { note: 'the masons\' lodging, on the rim west of the keep\'s fallen slab' });
// --- the Pennyworth: the foot
free('carrier-house', 'carrier', 'pennyworth', 'foot', 109.5, -17.5, [-0.82, -0.57], 14, 5, 'noon', { note: 'a stalled carrier on its side along the lowest riser: a door cut in its belly, a chimney through its shoulder' });
free('pennyworth-house-1', 'house', 'pennyworth', 'foot', 114.5, -37, [-1, 0], 6, 4.4, 'late', { note: 'east of the house, facing its wall across the gate lane' });
free('pennyworth-house-2', 'house', 'pennyworth', 'foot', 114.5, -50, [-1, 0], 5.6, 4.4, 'late');
free('pennyworth-stall-1', 'shop', 'pennyworth', 'foot', 94, -26.6, [0.1, -1], 3.4, 2.4, 'late', { note: 'a stall against the lowest riser, facing the house\'s south wall' });
free('pennyworth-stall-2', 'shop', 'pennyworth', 'foot', 101, -23.4, [0.35, -0.94], 3.4, 2.4, 'late');
free('pennyworth-garden', 'garden', 'pennyworth', 'foot', 104.5, -27, [0, -1], 6, 4, 'late', { note: 'pot herbs and a bean row between the stalls and the wall lane' });
// --- the tube's line, as a plot: nothing else is built on it
{ const w = WAYS.find((v) => v.name === 'noon-main'); put('tube-line', 'tube', 'rungs', 'high', w.run, w.s, (w.D0 + w.D1) / 2, 4.4, w.D1 - w.D0, 'noon', { note: 'the daylight main\'s bed, 4.4 m wide: lanes pass under it, nothing stands on it' }); }

export const PLOTS = PLOTS_;
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
