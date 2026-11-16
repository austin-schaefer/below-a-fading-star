// The Noon Road's floor plan (v14-D0, D3; the file keeps the name the way down was first built under, and so do
// ctx.coffinRoad and the module's key, which other modules read): the Late folk's stair down into the Foundered Nave
// and the walked line along the Noonwrights' stalled carriers on its black water, in world metres. Shared by
// v14/coffin-road.js (draws the way down, its floor), v14/noon-road.js and v14/noon-road/plan.js (the carriers, the
// hoops, the stored light), v5/nave.js (the gap in the rim's colliders at the stair's head, the door in the south
// wall, the shapes kept from under the road) and the tests. The hall is NAVE (v5/nave/ground.js).
//
//   the shears and the stair's head: the south-east rim, on the line z = SZ, the stair going down west through the
//     hole's light along the south aisle (between the column rows z 44.5 and 51) to the stage at the hall's west end
//   the stage (RAFT): planks on the back of the junction node, at the stair's foot, x 245.3-248.7
//   the door spur: boards and a lesser carrier pitched down south from the stage to the door in the south wall (DOOR)
//   the north spur: a gangway north from the stage between the columns to the road
//   the road: seven carriers nose to tail east along the nave on z = 42, past the cone's toe, under the hole's light
//     and through the hoops of the broken line, into the dark under the moor to the east wall and the sun on it
import { NAVE, naveEdge } from '../../v5/nave/ground.js';
import { gapX, MAIN, HOOPS, LINE } from '../noon-road/plan.js';

// ?coffinroad=0, or the module skipped or left out by ?only=: the Nave keeps its rim's colliders and south wall whole
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const CR_OFF = !!Q && (Q.get('coffinroad') === '0' || (Q.get('skip') || '').split(',').includes('coffinroad') || (Q.get('only') !== null && !Q.get('only').split(',').includes('coffinroad')));
export const ROAD_Y = NAVE.water + 1.3;   // the carriers' backs: they ride a third out of the water
export const SZ = 47.75, SHALF = 0.85;     // the stair's line and half-width
export const FOOT_X = 248.7;               // the stair's foot, the raft's east edge
export const RAFT = { x0: 245.3, x1: 248.7, z0: 46.6, z1: 48.9 };
export const NSPUR = { x0: 245.9, x1: 247.5, z0: 41.2, z1: 46.6 };
export const SSPUR = { x0: 245.9, x1: 247.5, z0: 48.9, z1: 54.5 };
export const ROAD = { x0: 245.9, x1: 296.4, z0: 41.2, z1: 42.8, zc: 42.0 };
// the onward passage: a door in the hall's south wall (z = NAVE.z + NAVE.walls + 0.5), its sill a hand over the
// water (y -16.78, fixed: the passage is built from it), a metre under the road: the door spur slopes down to it; inside, a level floor, three treads going down south toward the Pit (200, 185), and a fall of the roof's
// blocks that fills it (the next brief opens it)
export const DOOR = { x: 246.7, half: 1.1, sill: NAVE.water + 0.22, h: 3.0, z: NAVE.z + NAVE.walls + 0.5, floorTo: 56.8, treads: 3, tread: 0.42, rise: 0.22, fall: 58.1, depth: 4.6 };

// the stair's head, from the rim on z = SZ, east of the hole: a landing of planks a step over the turf, from LAND m
// back from the lip out over it (clear of the lip's turf and soil), and the flight going down from its end
export const LAND = 3.0;
export function stairHead(T) {
  let x = 275;
  while (x > 258 && naveEdge(x, SZ) > 0) x -= 0.05;
  const xRim = x + 0.05, xHead = xRim - 0.3, xLand = xRim + LAND;
  let g = -Infinity; for (let u = xHead; u <= xLand; u += 0.25) for (const dz of [-SHALF, 0, SHALF]) g = Math.max(g, T.heightAt(u, SZ + dz));
  return { xRim, xHead, xLand, yHead: g + 0.38 };
}

// the door spur's slope: level with the stage to SLOPE.z0, then down to the sill at SLOPE.z1
export const SLOPE = { z0: 49.3, z1: 54.2 };
export const spurY = (z) => ROAD_Y + (DOOR.sill - ROAD_Y) * Math.min(1, Math.max(0, (z - SLOPE.z0) / (SLOPE.z1 - SLOPE.z0)));

// the planks over each coupling (and at the string's two ends): PATCH.half either side of the line, from x - PATCH.w
// to x + PATCH.e of the coupling. Where they bridge the gap between two carriers' noses nothing else is under the road's
// edges, so there the floor is as wide as the planks, and it widens back to the road's over PATCH.ease m of the backs
export const PATCH = { half: 0.48, w: 1.4, e: 1.45, ease: 0.85, ends: [[ROAD.x0 - 1, ROAD.x0 + 1.2], [ROAD.x1 - 1.45, ROAD.x1 + 1]] };
const RHALF = (ROAD.z1 - ROAD.z0) / 2, NARROW = PATCH.half + 0.07;
// and beside each standing hoop's south limb, and through the bay of the line's wall, so the eye keeps a hand clear of
// the glaze (the camera's near plane is 0.08 m)
const SPANS = [...MAIN.slice(1).map((_, i) => [gapX(i) - PATCH.w, gapX(i) + PATCH.e]), ...PATCH.ends,
  ...HOOPS.filter((h) => h.a0 === undefined || h.wall).map((h) => [h.x - LINE.t - 0.15, h.x + (h.wall ? h.wall.len : 0) + LINE.t + 0.15])];
export function roadHalf(x) {
  let d = Infinity; for (const [a, b] of SPANS) d = Math.min(d, x < a ? a - x : x > b ? x - b : 0);
  return NARROW + (RHALF - NARROW) * Math.min(1, d / PATCH.ease);
}

// the floor under (x, z): the stair (given its head), the stage, the spurs, the road, the passage; else null
export function makeFloor(head) {
  const { xHead, yHead, xLand } = head, k = (yHead - ROAD_Y) / (xHead - FOOT_X);
  const inR = (R, x, z) => x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1;
  return (x, z) => {
    if (z >= SZ - SHALF && z <= SZ + SHALF && x >= FOOT_X && x <= xLand) return x >= xHead ? yHead : ROAD_Y + (x - FOOT_X) * k;
    if (inR(RAFT, x, z)) return ROAD_Y;
    if (inR(ROAD, x, z) || inR(NSPUR, x, z)) {
      // over a coupling, only the planks (the north spur's gangway comes in at the west end from the south)
      if (z > ROAD.z1 - 0.3 && inR(NSPUR, x, z)) return ROAD_Y;
      return Math.abs(z - ROAD.zc) <= roadHalf(x) ? ROAD_Y : null;
    }
    if (inR(SSPUR, x, z)) return spurY(z);
    if (Math.abs(x - DOOR.x) <= DOOR.half - 0.15 && z > DOOR.z - 0.01 && z <= DOOR.fall) {
      if (z <= DOOR.floorTo) return DOOR.sill;
      return DOOR.sill - DOOR.rise * Math.min(DOOR.treads, Math.ceil((z - DOOR.floorTo) / DOOR.tread));
    }
    return null;
  };
}
// is (x, z) within m of the road's floor (the water's life keeps out from under it)
export function nearRoad(x, z, m = 1) {
  const n = (R) => x > R.x0 - m && x < R.x1 + m && z > R.z0 - m && z < R.z1 + m;
  return n(ROAD) || n(RAFT) || n(NSPUR) || n(SSPUR) || (z > SZ - SHALF - m && z < SZ + SHALF + m && x > FOOT_X - m && x < 268);
}
