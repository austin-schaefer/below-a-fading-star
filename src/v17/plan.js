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

// ---------------------------------------------------------------- W1: the brook and the mere (live: W1's)
// The Slake [Proposed]: still water in the trough's west hollow (floor -10 at (-87, 283); survey "Where the low
// ground is"). On its own edge (height/outline.js radialOutline), fitted to the natural -6.8 contour (x -121..-70,
// z 261..295, heightAt in node on next with the mere off): a centre at (-88, 279), lobes into the west and east
// hollows, to the brook's mouth (-87, 263), the leat's mouth (-68, 288) and the Swallow's cut (-95, 296). Fitted so
// the lip raises the ground 0.3 m or more over only ~80 m2, never more than 1 m.
// `level` is the Swallow's sill (U1) and the leat's last level (W2): W1 measured it (see `measured`).
export const MERE = {
  level: -6.8,        // index, MERE: y -6.8; kept (measured: the lowest ground 3 m outside the edge, with the mere off,
                      // is under it only where the lip is raised, at most 0.4 m: tools/outline-test.mjs prints it)
  outline: {
    x: -88, z: 279, r: 15, seed: 17031, K: 6, amp: 0.08,
    lobes: [
      { x: -105, z: 270, r: 9, to: { x: -110, z: 263, r: 6 } },   // the west hollow (ground -7.8 at (-105, 264))
      { x: -74, z: 281, r: 8 },                                    // the east hollow (ground -7.8 at (-77, 274))
      { x: -89, z: 271, r: 5, to: { x: -87, z: 263.5, r: 3.5 } },  // the brook's mouth
      { x: -76, z: 289, r: 6, to: { x: -68, z: 288, r: 4 } },      // the leat's mouth (index, LEAT's last point (-62, 288))
      { x: -94, z: 288, r: 4, to: { x: -95, z: 296, r: 3.5 } },    // the Swallow's cut leaves it here
    ],
  },
  bank: 0.8,          // its bank cut down to the level: steeper than the floor's pools' (the apron rises 1 in 1.4 south of it)
  D: 1.6,             // the bowl's depth under the shelf (the hollow's own floor is -10)
};

// The tarn's outflow (index, BROOK, routed round what lies there): out of the south bay (the lip at (-83, 200) stands
// at -3.1), through the 3 m gap between the crown's piece 1 (x -98.7..-90.5) and piece 4 (leaning on pier -70, x
// -87.7..-78) (the pieces' colliders, src/v4/span/fallen.js), west of piece 3 (x -90..-76, z 222..237), into the
// hollow at (-92, 241) (ground -5.5..-6.2 over x -101..-81) where it stands in a broad pool, out over its south lip
// (ground -4.6 at z 250) in a cut, and down a step into the mere. 20 m and more west of the dead traveller.
// pts: [x, z, hw] (hw the water's half-width there, m); levels: [x, z, y] stations, a step two close together.
export const BROOK = {
  pts: [
    [-89, 191, 2.2],     // in the tarn's south bay (its shallows -8)
    [-89.5, 199, 1.8],   // the bay's neck
    [-89.4, 205, 1.1],   // the lip: the water quickens
    [-89.1, 211, 0.85],  // between the two crown pieces, narrow and quick
    [-89.3, 217, 0.9],
    [-91.5, 222, 1.1],   // below the first step
    [-94, 228, 1.3],
    [-95, 234, 2.6],
    [-92, 241, 7.5],     // the pool in the hollow, broad and slow
    [-90, 246.5, 2.0],   // its tail, over the lip
    [-88, 251, 1.0],     // quick in the cut
    [-86.5, 256, 1.1],
    [-86, 260, 1.5],     // the second step, into the mere
    [-87, 266, 2.2],
    [-88, 271, 2.5],     // in the mere
  ],
  levels: [
    [-89, 191, TARN_LEVEL], [-89.4, 204, TARN_LEVEL],   // the tarn's own level to the lip
    [-89.2, 209, -4.75], [-89.2, 216, -4.95],          // the run between the blocks
    [-89.6, 218.5, -5.0], [-90.4, 220.5, -5.45],       // a step (white water below it)
    [-94.5, 231, -5.8], [-95, 235, -5.95],
    [-94, 237, -6.05], [-90.3, 246, -6.05],            // the pool (the hollow's floor is -5.9..-6.2: under it only in its core)
    [-89.6, 247.8, -6.1], [-89, 249.5, -6.35],         // a step off the pool's lip
    [-86.6, 256, -6.45], [-86.2, 258.5, -6.48],
    [-86.1, 260.5, -6.8], [-88, 271, -6.8],            // the step into the mere (MERE.level)
  ],
  hold: [[-89.4, 203], [-86.5, 262]],  // where it holds its own water (its lip): out of the tarn, into the mere
  bank: 0.45, reach: 8,
};
// The fallen crown's pieces the brook runs round (the colliders' centres and radii, src/v4/span/fallen.js), and the
// dead traveller (stories/the-traveller-on-the-span.md): nothing of W1 touches them; outline-test checks it.
export const CROWN = [[-108.2, 224.6, 6], [-94.6, 206, 4.1], [-94.6, 215.8, 4.1], [-100.1, 197.1, 5.5], [-82.9, 229.6, 7], [-82.9, 213, 4.8]];
export const TRAVELLER = { body: [-63.5, 242.5], hat: [-49.5, 247.5] };

// The Swallow's cut (index, SWALLOW): the mere's water carried south in a cut in the slope to the portal's face at
// z 311 (ground there +7.5), level with the mere; its banks rise at 1.3 (a cut, not a shore) as the slope rises. It
// runs on 1.5 m past the face so the face stands in water; U1 builds the portal and the fall there.
export const SWALLOW_CUT = {
  pts: [[-95, 290, 4.2], [-95, 302, 4.0], [-95, 312.5, 4.0]],
  levels: [[-95, 290, -6.8], [-95, 312.5, -6.8]],  // MERE.level
  hold: [[-95, 296], [-95, 312.5]],
  face: [-95, 311],
  bank: 1.3, reach: 14,
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
// cut is 12.6 m between its banks' feet (x -101 .. -88.4, `cutAtFace`). W1's cut as built (SWALLOW_CUT) is 8 m of water
// (x -99 .. -91) with banks rising 1.3 in 1: the quay stands on its east bank (U1 opens the ground under it), and the
// arch's piers stand on the banks either side.
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
