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

// ---------------------------------------------------------------- U1: the Swallow, the aqueduct, the tube (U1's, live)
// The portal is a round arch in a dressed face standing across the cut's end, its face in the plane z = 311, facing
// north. The water goes through its west part over the sill and falls into the head (a drowned hall behind the face);
// its east bay holds the quay (the ledge) and the tube's end. Asked of W1's cut (W1 owns the ground): at the face the
// cut is 12.6 m between its banks' feet (x -101 .. -88.4, `cutAtFace`), its bed under -7.5 there, so the quay stands
// in the cut against the east bank and the arch's piers stand on the banks' feet. If the cut does not meet these, U1's
// report says so; the portal is drawn to these numbers either way.
export const SWALLOW = {
  portal: [-95, 311],     // the index's point on the face (ground +7.5)
  face: 311,              // the face's plane, z (the arch's front)
  open: [-100.5, -88.5],  // the arch's opening, x (12 m: the fall's 8 m to the west, the quay's bay to the east)
  sill: MERE.level,       // the sill at the mere's level, -6.8 (the fall's lip, x -100.5 .. -92.6)
  spring: -2.3,           // the arch springs here: its crown at spring + 6 = +3.7, 10.5 m clear over the sill
  width: 12,              // index: at least 8
  clear: 10.5,            // index: at least 9
  ledge: [-91, 309],      // index: beside the fall, where the tube's end comes out of the water
  quay: { x: [-92.6, -88.4], z: [297, 313], y: -5.9 }, // the ledge as built: a stone quay in the cut's east side, its top 0.9 over the mere, steps up to the shore at its north end
  cutAtFace: [-101, -88.4], // asked of W1 (above): the cut's banks' feet at the face
  head: { x: [-101.5, -84], z: [311, 324.5], floor: -17, crown: 4.5 }, // the drowned hall behind the face
  pool: -9.2,             // the water in the head and the conduit: the fall is 2.4 m, sill to pool
};
// The aqueduct: the Heliarchs' vaulted conduit from the head's east wall to the Garth's west wall, drowned (its crown
// goes under the pool's level 10 m in), and the Noonwrights' tube laid down it on stone saddles. One centreline for
// both (`tube`): plan points [x, z], resampled by src/v17/swallow/line.js (straight, a quarter turn of radius `turn`
// about the corner, straight). `profile` is the planks' line inside the tube, [s, y] (s metres along from the lip),
// eased between; the tube's axis is `axisUp` over the planks, its bore `bore`, its outside `outer`.
export const AQUEDUCT = {
  from: SWALLOW.portal,
  to: [-30, 318],         // the Garth's west door
  z: [311, 318.5],        // under the apron, 10 to 30 m under the ground
  floorEnd: -24,          // the planks reach the door's sill at -24
  tube: [[-90.5, 306.5], [-90.5, 318.5], [-29.6, 318]], // the lip on the quay; the corner; the end in the Garth's wall
  turn: 5,                // the corner's radius
  profile: [[0, -5.9], [5, -5.9], [20, -12.65], [68.5, -23.9], [70.6, -24]], // level on the quay and through the face, a steep stair down the head, the long fall down the conduit, level into the door
  axisUp: 1.1, bore: 1.65, outer: 1.75,
  conduit: { half: 3.6, spring: 2.6, below: 1.15 }, // its walls from the tube's line (half-width), the vault's springing over its floor, its floor under the planks
};
// The door between them (U1 brings the tube to it; U2 builds the wall and the hall's floor round it): the tube's end
// is a round hole in the Garth's west wall, its axis level and running east (+x), its plank floor at the sill.
export const GARTH_DOOR = {
  x: -29.6, z: 318,       // where the tube's glass ends: the hall's inner wall face (r 20 from (-10, 322) at z 318 is x -29.6)
  sill: -24,              // the planks' level at the door, the hall's floor
  axis: -22.9,            // the tube's axis (sill + axisUp)
  rOut: 1.75,             // the glass's outside: the hole in the wall is at least this (U2 frames it)
  dir: [1, 0],            // the way into the hall
  bulkhead: -31.6,        // the conduit's east end (a Heliarch wall the tube passes through); between it and x the tube is in U2's wall
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
