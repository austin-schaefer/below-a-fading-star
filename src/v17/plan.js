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
  end: { z: 311.5 },  // its bank's reach stops at the Swallow's face too (U1: the face stands in the hillside)
  // the pegs' line (src/v4/dressing/pegs.js, x -80 from wall to wall) crosses the mere's east lobe: a bar under it, the
  // water half a metre deep over it, so the pegs wade across as they do in the tarn's shallows and the line ends at z 285
  shoals: [{ x: -80, half: 1.5, depth: 0.5 }],
  bankSouth: { z0: 292, z1: 304, k: 2.2 }, // its bank steepens toward the apron, so it leaves the hillside round the face whole
  bank: 0.8,          // its bank cut down to the level: steeper than the floor's pools' (the apron rises 1 in 1.4 south of it)
  D: 1.6,             // the bowl's depth under the shelf (the hollow's own floor is -10)
};

// The tarn's outflow (index, BROOK, routed round what lies there): out of the south bay (the lip at (-83, 200) stands
// at -3.1), through the 3 m gap between the crown's piece 1 (x -98.7..-90.5) and piece 4 (leaning on pier -70, x
// -87.7..-78) (the pieces' colliders, src/v4/span/fallen.js), west of piece 3 (x -90..-76, z 222..237), into the
// hollow at (-92, 241) (ground -5.5..-6.2 over x -101..-81) where it stands in a broad pool, out over its south lip
// (ground -4.6 at z 250) in a cut, and down a step into the mere. 20 m and more west of the dead traveller.
// pts: [x, z, hw] (hw the water's half-width there, m); levels: [x, z, y] stations, a step two close together.
// The narrowest water is 3.2 m across: the drawn terrain is 2.1 m a cell on medium and 3.1 on low, and water narrower than
// a cell has no vertex under it along a straight run and is drawn under the ground (the ribbon's edge is the depth over
// the drawn ground): on low the 2.6 m the brook had first vanished between the crown's pieces.
export const BROOK = {
  pts: [
    [-89, 191, 2.2],     // in the tarn's south bay (its shallows -8)
    [-89.5, 199, 1.8],   // the bay's neck
    [-89.4, 205, 1.65],   // the lip: the water quickens
    [-89.1, 211, 1.6],   // between the two crown pieces, narrow and quick
    [-89.3, 217, 1.6],
    [-91.5, 222, 1.7],   // below the first step
    [-94, 228, 1.8],
    [-95, 234, 2.9],
    [-92, 241, 7.5],     // the pool in the hollow, broad and slow
    [-90, 246.5, 2.3],   // its tail, over the lip
    [-88, 251, 1.6],     // quick in the cut
    [-86.5, 256, 1.7],
    [-86, 260, 1.9],     // the second step, into the mere
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
// ends square at the face's plane (z 311.5, U1's word): past it the ground is the hillside's own. U1 builds the portal and
// the fall there.
export const SWALLOW_CUT = {
  pts: [[-95, 290, 4.2], [-95, 302, 4.0], [-95, 312.5, 4.0]],
  levels: [[-95, 290, -6.8], [-95, 312.5, -6.8]],  // MERE.level
  hold: [[-95, 296], [-95, 312.5]],
  face: [-95, 311],
  end: { z: 311.5 },  // U1: nothing of the cut past the face's plane (the face stands square in the hillside)
  bank: 1.3, reach: 14,
  banks: [[-95, 296, 1.3], [-95, 305, 1.3], [-95, 309, 4]],  // U1: steep near the face, +2..+7 within 3 m of x -99..-91
};

// ---------------------------------------------------------------- W2: the leat (live: W2's)
// The Heliarchs' leat: the fen's outflow, made. A straight stone-kerbed channel off the fen's flat at (12, 228) (the
// fen's level; the flat stands at -2.25 there, its nearest pools 14 m east, which the leat neither drains nor raises),
// south down the trough's east side in five ponds stepping down over five weirs (each a dressed sill across the
// channel, the water falling 0.87 m into the pond below), under the slab bridge at (9, 252) where P14 and P38 meet,
// then level at the mere's level on a raised bank across the dry hollow at (-5, 279) (ground -8.7: 1.9 m under the
// water) and in a cut through the rise west of it (ground -5.4), into the mere's east lobe at (-64, 288).
// `corners`: the table's line, each straight run held straight (a point 3 m in from each corner, so the kit's spline
// rounds only the corners). `levels`: as the brook's, [x, z, y] stations, a weir two stations 0.6 m apart (the sound
// reads the steps here). `weirs`: the sills, each [x, z, top, below, state] (`top` the pond above, `below` the pond
// under it); one is breached (its middle stones gone, the water through the gap).
const LEAT_CORNERS = [[12, 227], [10.6, 245], [6.6, 252.6], [4, 266], [-8, 282], [-35, 290], [-62, 288], [-69, 288.4]];
const LEAT_HW = 1.6; // half the 3.2 m between the kerbs' inner faces (the table's 2.4 m drew no water: the drawn ground's
// 2.1 m cells (3.1 on low) found no vertex in the bed between the kerbs' lips and stood over the water, as W1 found for the brook)
const _straight = (C, hw, inset = 3) => {
  const out = [];
  for (let i = 0; i < C.length; i++) {
    const [x, z] = C[i];
    if (i > 0) { const [px, pz] = C[i - 1], l = Math.hypot(x - px, z - pz); if (l > inset * 2.5) out.push([x + (px - x) * inset / l, z + (pz - z) * inset / l, hw]); }
    out.push([x, z, i === 0 ? hw + 0.5 : hw]);
    if (i < C.length - 1) { const [nx, nz] = C[i + 1], l = Math.hypot(nx - x, nz - z); if (l > inset * 2.5) out.push([x + (nx - x) * inset / l, z + (nz - z) * inset / l, hw]); }
  }
  return out;
};
// a point on the line at z (on the run that holds that z), for the weirs' stations
const _onLine = (C, z, k = 0) => { for (let i = k; i < C.length - 1; i++) { const [x0, z0] = C[i], [x1, z1] = C[i + 1]; if ((z - z0) * (z - z1) <= 0 && z0 !== z1) return [x0 + (x1 - x0) * (z - z0) / (z1 - z0), z]; } return null; };
const _W = [[241, -3.32], [247.5, -4.19], [255.6, -5.06], [259.5, -5.93, 'breached'], [264.5, MERE.level]];
const _lv = [[12, 227, FEN_LEVEL]];
const _weirs = [];
{
  let y = FEN_LEVEL;
  for (const [z, below, state] of _W) {
    const a = _onLine(LEAT_CORNERS, z - 0.3), b = _onLine(LEAT_CORNERS, z + 0.3), c = _onLine(LEAT_CORNERS, z);
    _lv.push([a[0], a[1], y], [b[0], b[1], below]);
    _weirs.push([+c[0].toFixed(2), z, y, below, state ?? 'whole']);
    y = below;
  }
  _lv.push([-69, 288.4, MERE.level]);
}
export const LEAT = {
  // the table's line, but for its third corner: 2.4 m west of (9, 252), so the meeting of P14 and P38 is on the bank at
  // the bridge's east foot, not in the water (the owner's stand, ?pos=9,252, is on dry stone); the last corner carries
  // it on into the mere's lobe
  line: LEAT_CORNERS.slice(0, 7),
  pts: _straight(LEAT_CORNERS, LEAT_HW),
  levels: _lv,
  weirs: _weirs,
  head: FEN_LEVEL,    // the fen's level at its head
  kerbs: 2 * LEAT_HW, // between kerbs, m
  hw: LEAT_HW,
  hold: [[12, 228.5], [-63.5, 288]],  // its lip held from the head to the mere's lobe
  bank: 1.0, reach: 8, rag: 0, wob: 0, lipW: 1.0, lipFall: 0.55, minSpeed: 0.7, speedWin: 2, shade: 0.5, // a built channel: a kerbed line, a steep bank, a narrow embankment, slow when level
  fade: { in: [[12, 227], [12, 227.8]], out: [[-63.5, 288], [-67.5, 288.3]] },
  // the slab bridge where P14 and P38 meet (src/v4/paths/routes.js), across pond 2
  bridge: { at: [6.6, 252.6], len: 6.4, w: 2.1 }, // its east step at the meeting (9, 252)
  fallen: [6.9, 258.6],  // a kerb stone fallen into pond 3 off the east kerb
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
// both (`tube`): plan points [x, z], resampled by src/v17/swallow/line.js (straights, each corner rounded to its
// radius in `turn`). `profile` is the planks' line inside the tube, [s, y] (s metres along from the lip),
// eased between; the tube's axis is `axisUp` over the planks, its bore `bore`, its outside `outer`.
export const AQUEDUCT = {
  from: SWALLOW.portal,
  to: [-30, 318],         // the Garth's west door
  z: [311, 318.5],        // under the apron, 10 to 30 m under the ground
  floorEnd: -24,          // the planks reach the door's sill at -24
  // the lip on the quay; the corner in the head; a bend 9 m short of the door, so the last length runs in on the door's
  // own line (U2's GARTH_DOOR.dir, radial to the hall); the end at the wall's outer face (GARTH_DOOR.face)
  tube: [[-90.5, 306.5], [-90.5, 318.5], [-40.0, 316.0], [-31.18, 317.76]],
  turn: [5, 8],           // each corner's radius
  profile: [[0, -5.9], [5, -5.9], [20, -12.65], [66, -23.9], [67.5, -24]], // level on the quay and through the face, a steep stair down the head, the long fall down the conduit, level into the door
  axisUp: 1.1, bore: 1.65, outer: 1.75,
  conduit: { half: 3.6, spring: 2.6, below: 1.15 }, // its walls from the tube's line (half-width), the vault's springing over its floor, its floor under the planks
};

// ---------------------------------------------------------------- U2: the Meridian Garth (the table's)
export const GARTH = {
  c: [-10, 322],
  floor: -24,
  r: 20,              // its walkable floor stays inside the walk limit (r 346)
  crown: -4,          // the dome to about y -4 at the crown
  door: [-30, 318],   // the west door, where U1's tube meets U2's hall at y -24
};
// U2's: the west door's numbers, where U1's tube meets the hall (U2 builds the arch in the wall and the floor inside
// it; U1 everything west of `face`). The door lies on the bearing from the centre through GARTH.door; its reveal runs
// through the wall from the inner face (r 20) to the outer face (r 21.6), and the plan's door point (r 20.4) is the
// sill line inside it. U2's floor runs at y -24 through the reveal to `face`; U1's tube ends at `face`, its floor at
// y -24 and its bore inside the opening: `half` either side of the axis, `h` over the sill at the crown of the arch
// (a round head: it springs at h - half). An overlap of the two floors inside the reveal is fine (both held, level).
const _gd = [GARTH.door[0] - GARTH.c[0], GARTH.door[1] - GARTH.c[1]], _gl = Math.hypot(_gd[0], _gd[1]);
export const GARTH_DOOR = {
  dir: [_gd[0] / _gl, _gd[1] / _gl], // out of the hall, toward the aqueduct (about west, a little north)
  y: GARTH.floor,     // the sill
  half: 1.9,          // half the opening's width
  h: 5.2,             // the arch's crown over the sill
  inner: 20,          // the wall's inner face (r from GARTH.c)
  outer: 21.6,        // the wall's outer face: where U1's tube ends
  face: [GARTH.c[0] + (_gd[0] / _gl) * 21.6, GARTH.c[1] + (_gd[1] / _gl) * 21.6], // about (-31.18, 317.76)
};

// ---------------------------------------------------------------- S1: the sphere (S1's)
// The man at the wheel (stories/the-man-at-the-wheel.md): the Noonwrights' junction at the west wall's foot, a ball of
// their glass sunk in the ground and the wall's foot. Ground at its centre 14, at x -307 about 4.5, at x -337 about 21:
// at y 8 its east bulge meets the ground just under the equator and its west quarter is in the hill (S1 measured).
// The site is the table's (west, under the Galleries), judged against the spawn's frame (S1's report).
export const SPHERE = {
  c: [-322, 22],
  r: 15,
  y: 8,               // centre y (the table's 8 to 10; 8 so the east bulge sits on the ground, not over it)
  // the keeper: seated in his sling under the eye in the glass where the noon comes in (6 m east of the centre, on
  // the side a visitor comes from), facing south-east to the wheel on the junction's node, so a visitor coming from the
  // east (the Taker's pavements) sees him three-quarter on, a body bent over a wheel, in a fall of white light
  node: [-313.95, 10.6, 22.05], // the junction's node, 2.9 m before him along keeperFace
  seat: [-316, 9.8, 20.0],  // the sling's seat (his pelvis); he faces `keeperFace`
  keeperFace: [0.707, 0.707], // south-east, down the line he shut: from the east his wheel is seen open, not edge on
  face: [0.72, 0.69],      // the hoops' line: toward the Meridian Garth (south-east), unit
  // the hoops leaving the south-east side, toward the Garth: distances from the glass along `face`, metres
  hoops: [2.5, 8.5, 15, 22, 29.5, 38, 47],
  hoopR: 1.7,
};
