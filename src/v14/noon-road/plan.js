// The Noon Road's plan (v14-D3): where the Noonwrights' stalled freight lies on the Foundered Nave's water, in world
// metres: the carriers (walked and adrift), the junction node under the stage, the hoops of the line they ran in, the
// torn elbow that rose to the sky, and the stored light a few still hold. Shared by v14/noon-road.js (draws it),
// v5/nave.js (the stored light baked into the hall, the hulls seen through the water) and the tests. The walked
// floor's rectangles are v14/coffin-road/plan.js's; the hall is NAVE (v5/nave/ground.js).
import { NAVE } from '../../v5/nave/ground.js';

export const WY = NAVE.water;
export const FLOOR_Y = WY + 1.3;           // the carriers' backs: they ride a third out of the water (coffin-road/plan.js ROAD_Y)
export const R_MAIN = 2.3, R_LESS = 1.5;   // the main's carriers and the branch's
// a carrier afloat: its axis lies level, `a` its heading (0 east, pi/2 south), its crown a hand under the floor line
export const axisY = (r, sink = 0, fat = 1.02) => FLOOR_Y - 0.06 - r * (fat + 0.016) - sink;
// the main string: seven, nose to tail on the road's line, no two alike; three still hold their light
const X0 = 245.9, PITCH = 7.2, ZC = 42.0;
export const MAIN = [
  { form: 'long', lit: 0, roll: 0.1 },
  { form: 'waist', lit: 0.3, roll: -0.05, net: true },
  { form: 'long', lit: 0, roll: 0.3, crack: true },
  { form: 'waist', lit: 1, roll: 0 },
  { form: 'long', lit: 0, roll: -0.22, net: true },
  { form: 'waist', lit: 0, roll: 0.15, crack: true, crackAt: -0.2 },
  { form: 'long', lit: 1, roll: 0.04 },
].map((v, i) => ({ id: 'main-' + i, x: X0 + PITCH * (i + 0.5), z: ZC + [0.03, -0.04, 0.05, 0, -0.05, 0.04, 0][i], a: [0.01, -0.012, 0.014, 0, -0.01, 0.012, 0][i], r: R_MAIN, len: 6.85, walked: true, ...v }));
export const gapX = (i) => X0 + PITCH * (i + 1); // the coupling between main i and i + 1
// the junction node under the stage at the stair's foot, tapped; the lesser carrier pitched down to the door
export const NODE = { x: 247.0, z: 47.75, r: 2.7, y: FLOOR_Y - 0.14 - 2.7 * 0.86, lit: 0.4 };
export const BRANCH = { id: 'branch', x: 246.7, z: 51.75, a: Math.PI / 2, r: R_LESS, len: 4.7, form: 'long', lit: 0.5, pitch: -0.217, y: FLOOR_Y - 0.6 - R_LESS * 1.04 };
// adrift, never walked: one stood on its tail and still alight down the north aisle, a gourd rolled over under the
// hole, a lesser one alight in the south aisle, one nose-down and one sunk to its back by the east wall
export const ADRIFT = [
  { id: 'up-north', x: 282.5, z: 29.3, a: 0.2, r: R_MAIN, len: 7.4, form: 'gourd', lit: 0.7, pitch: 1.12, y: WY + 1.0, net: true },
  { id: 'rolled', x: 258.2, z: 32.0, a: 0.75, r: R_MAIN, len: 7.4, form: 'gourd', lit: 0, roll: 1.1, sink: 0.5, crack: true },
  { id: 'south-lit', x: 287.6, z: 48.3, a: -0.25, r: R_LESS, len: 4.9, form: 'drop', lit: 0.6, roll: 0.5, sink: 0.25 },
  { id: 'nose-down', x: 291.2, z: 31.6, a: 2.2, r: R_LESS, len: 4.9, form: 'gourd', lit: 0, pitch: -0.85, y: WY + 0.2 },
  { id: 'sunk', x: 277.5, z: 32.2, a: 0.1, r: R_MAIN, len: 7.0, form: 'drop', lit: 0, roll: -0.7, sink: 1.15, crack: true, crackAt: 0.7 },
  { id: 'west-lit', x: 241.2, z: 47.9, a: 1.3, r: R_LESS, len: 4.9, form: 'waist', lit: 0.45, roll: 0.3, sink: 0.2 },
];
export const VESSELS = [...MAIN, BRANCH, ...ADRIFT];
const FAT = { long: 1.02, waist: 1.02, gourd: 1.06, drop: 1.04 };
export const yOf = (v) => v.y ?? axisY(v.r, v.sink || 0, FAT[v.form] || 1.02);

// the line the string ran in: a tube 5.7 m in the bore down the nave, a hand clear of the colonnade, joined a bay at a
// time; its collars still stand as hoops round the string (`a0`, `a1`: the arc left, from the crown; + is north)
export const LINE = { z: 40.1, y: WY + 2.4, r: 2.85, hoop: 3.1, t: 0.26 };
export const HOOPS = [
  { x: 263.25, a0: 0.75, a1: 2.75 },                 // under the hole: a horn, the rest gone with the roof
  { x: 268.75 },                                      // the elbow's foot
  { x: 274.25 },
  { x: 279.75, wall: { len: 5.5, a0: -1.8, a1: 2.45, ragged: 0.35 } }, // a bay of the wall still up: the road goes through it
  { x: 285.25 },
  { x: 290.75, a0: 0.95, a1: 2.7 },                  // by the sun: a horn on the north side
];
// shards of wall standing on a hoop: [hoop's index, len, a0, a1, ragged]
export const SHARDS = [[1, 3.4, 0.9, 2.5, 0.8], [2, 2.2, -1.75, -0.7, 0.9], [4, 2.6, 1.2, 2.6, 0.9]];
// the elbow: from the hoop at 268.75 the line turned up and west toward the sky (it came down through the roof where
// the hole is now); what is left stands torn open under the hole. Centre line: x = x0 - rho sin f, y = y0 + rho (1 - cos f)
export const ELBOW = { x0: 268.75, rho: 9.5, f: [0.12, 0.42, 0.72, 0.98, 1.2] };
export const elbowAt = (f) => [ELBOW.x0 - ELBOW.rho * Math.sin(f), LINE.y + ELBOW.rho * (1 - Math.cos(f)), LINE.z];

// the stored light, as lamps: [x, y, z, strength, reach (m)] for the hall's baked glow and the point lights
export function lamps() {
  const L = VESSELS.filter((v) => v.lit > 0).map((v) => { const k = v.lit * (v.r / R_MAIN); return [v.x, Math.max(yOf(v) + v.r * 0.9, WY + 1.6) + (v.pitch > 0.5 ? 2.5 : v.walked ? 1.2 : 0), v.z, k, 8 + 7 * k]; });
  L.push([NODE.x - 1.2, FLOOR_Y + 0.2, NODE.z + 1.9, NODE.lit, 9]);
  return L;
}
// the hulls as the water sees them, lit ones first: [x1, z1, x2, z2, r, depth of the axis under the water, light, adrift]
export function hulls() {
  const H = VESSELS.filter((v) => Math.abs(v.pitch || 0) < 0.5).map((v) => {
    const h = Math.max(0, v.len / 2 - v.r * 0.8), c = Math.cos(v.a), s = Math.sin(v.a);
    return [v.x - c * h, v.z - s * h, v.x + c * h, v.z + s * h, v.r * 0.9, WY - yOf(v), v.lit || 0, v.walked ? 0 : 1];
  });
  for (const v of VESSELS) if (Math.abs(v.pitch || 0) >= 0.5) H.push([v.x, v.z, v.x + 0.01, v.z, v.r * 0.8, 0.3, v.lit || 0, 1]);
  H.push([NODE.x, NODE.z, NODE.x + 0.01, NODE.z, NODE.r, WY - NODE.y, NODE.lit, 0]);
  return H.sort((p, q) => q[6] - p[6]);
}
