// v17's plan (the water goes under): every coordinate and level of the milestone, and only here. Pure data,
// three-free, imports nothing beyond world.js, so the height path, the builds and the tests can all read it.
// x east, z south, levels in world metres. The numbers come from briefs/v17/index.md ("The plan's numbers"),
// measured on next at f8f62b6 with heightAt in node; plans/wilderness-v17.md has the survey behind them.
// A section per brief. Each brief's rows are live once that brief has changed them from the table; a level that
// moves moves for everyone downstream (the mere's level is the Swallow's sill): say so in your report.
import { WATER } from '../world.js';

// ---------------------------------------------------------------- shared
// Every new height, paint and water term of the milestone sits behind this one box test (index, `BOX`).
export const BOX = { x0: -125, x1: 25, z0: 195, z1: 335 };
export const inBox = (x, z) => x >= BOX.x0 && x <= BOX.x1 && z >= BOX.z0 && z <= BOX.z1;

// The two bodies the chain starts from (survey, "The levels"; read from world.js where they live).
export const TARN_LEVEL = WATER.tarn.y;  // -4.6, Lees Tarn / Circumbambulate Pool (src/v4/tarn.js)
export const FEN_LEVEL = WATER.fen.y;    // -2.45, Corpse-Candle Fen

// ---------------------------------------------------------------- W1: the brook and the mere
// The Slake [Proposed]: still water in the trough's west hollow (floor -10 at (-87, 283); survey "Where the low
// ground is"). A radial outline about a centre, drawn out by lobes toward the brook's mouth, the leat's mouth and
// the Swallow's cut. `level` is the Swallow's sill: W1 measures it on the ground round it and may move it 0.4 m.
export const MERE = {
  c: [-87, 280],
  r: 22,
  lobes: [
    { at: [-85, 262], w: 0.5 },  // the brook's mouth (index, BROOK's last point)
    { at: [-68, 288], w: 0.5 },  // the leat's mouth (index, LEAT's last point is (-62, 288))
    { at: [-95, 295], w: 0.5 },  // the Swallow's cut (index, SWALLOW)
  ],
  level: -6.8,                   // index, MERE: y -6.8 (W1 measures it; the Swallow's sill)
};

// The tarn's outflow (index, BROOK): a line out of the south bay (the lip at (-83, 200) stands at -3.1; the
// shallows end at z 200), south through the Span's fallen bay among the crown's pieces (src/v4/span/plan.js
// SLABS, bay 0), down past the dead traveller (his body at (-63.5, 242.5): leave him be) to the mere.
// `levels` are [z, y] stations along the line, falling only downstream; `width` [min, max] in metres.
export const BROOK = {
  line: [[-90, 197], [-92, 210], [-97, 222], [-90, 238], [-84, 252], [-85, 264]],
  levels: [[197, -4.6], [205, -4.6], [216, -5.3], [240, -6.0], [264, -6.8]], // the last is MERE.level
  width: [1.5, 3],
};
// The fallen crown's pieces the brook runs round, not through (src/v4/span/plan.js SLABS, bay 0).
export const CROWN = [[-108, 224], [-94, 211], [-100, 197], [-83, 230], [-84, 213]];
// The dead traveller (stories/the-traveller-on-the-span.md): his body and his hat. Nothing of W1 touches them.
export const TRAVELLER = { body: [-63.5, 242.5], hat: [-49.5, 247.5] };

// The Swallow's cut (index, SWALLOW): the mere's water carried south in a cut in the slope to the portal's face,
// its water at the mere's level; W1 cuts the ground, U1 builds the portal and the fall at the face.
export const SWALLOW_CUT = {
  from: [-95, 294],
  to: [-95, 311],     // the portal's face (ground there +7.5)
  width: 8,           // the portal's opening is at least 8 m wide (index, SWALLOW)
};

// ---------------------------------------------------------------- W2: the leat (the table's until W2 changes it)
export const LEAT = {
  line: [[12, 228], [11, 245], [9, 252], [4, 266], [-8, 282], [-35, 290], [-62, 288]],
  head: FEN_LEVEL,    // the fen's level at its head
  weirs: [[11, 245], [-8, 282]], // four or five weirs between these, down to the mere's level, then level
  kerbs: 2.4,         // between kerbs, m
  bridge: [9, 252],   // the slab bridge where P14 and P38 meet
};

// ---------------------------------------------------------------- U1: the Swallow, the aqueduct, the tube (the table's)
export const SWALLOW = {
  portal: [-95, 311], // the face (ground +7.5)
  sill: MERE.level,   // the sill at the mere's level
  width: 8,           // at least 8 m wide
  clear: 9,           // at least 9 m clear
  ledge: [-91, 309],  // beside the fall, where the tube's end comes out of the water
};
export const AQUEDUCT = {
  from: SWALLOW.portal,
  to: [-30, 318],     // the Garth's west door
  z: [311, 318],      // under the apron, 10 to 30 m under the ground
  floorEnd: -24,      // its floor falls from the sill to -24
};

// ---------------------------------------------------------------- U2: the Meridian Garth (the table's)
export const GARTH = {
  c: [-10, 322],
  floor: -24,
  r: 20,              // its walkable floor stays inside the walk limit (r 346)
  crown: -4,          // the dome to about y -4 at the crown
  door: [-30, 318],   // the west door, where U1's tube meets U2's hall at y -24
};

// ---------------------------------------------------------------- S1: the sphere (the table's)
export const SPHERE = {
  c: [-322, 22],
  r: 15,
  y: 9,               // centre y 8 to 10 (survey, "The sphere's site")
};
