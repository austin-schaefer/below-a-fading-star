// The Coffin Road's plan (v14-D0): the Sexton's way down into the Foundered Nave and the road of forty coffins lashed
// two by two on its black water, in world metres. Shared by v14/coffin-road.js (draws it, its floor and its lights),
// v5/nave.js (the gap in the rim's colliders at the stair's head, the door in the south wall, the candles' glow baked
// into the hall, the shapes kept from under the road) and the tests. The hall is NAVE (v5/nave/ground.js).
//
//   the shears and the stair's head: the south-east rim, on the line z = SZ, the stair going down west through the
//     hole's light along the south aisle (between the column rows z 44.5 and 51) to the raft at the hall's west end
//   the raft: four coffins abreast at the stair's foot, x 245.3-248.7
//   the door spur: one pair, south from the raft to the door in the south wall (the onward passage, DOOR)
//   the north spur: one pair, north from the raft between the columns to the road
//   the road: sixteen pairs east along the nave on z = 42, past the cone's toe and under the hole's light, into the
//     dark under the moor to the east wall and the sun on it (x 296.4)
import { NAVE, naveEdge } from '../../v5/nave/ground.js';

export const ROAD_Y = NAVE.water + 0.34;  // the lids' tops
export const SZ = 47.75, SHALF = 0.85;     // the stair's line and half-width
export const FOOT_X = 248.7;               // the stair's foot, the raft's east edge
export const RAFT = { x0: 245.3, x1: 248.7, z0: 46.6, z1: 48.9 };
export const NSPUR = { x0: 245.9, x1: 247.5, z0: 41.2, z1: 46.6 };
export const SSPUR = { x0: 245.9, x1: 247.5, z0: 48.9, z1: 54.5 };
export const ROAD = { x0: 245.9, x1: 296.4, z0: 41.2, z1: 42.8, zc: 42.0 };
export const PAIRS = 16;                   // on the road; with the raft's four and the spurs' two pairs, forty
// the onward passage: a door in the hall's south wall (z = NAVE.z + NAVE.walls + 0.5), its sill a hand under the
// road; inside, a level floor, three treads going down south toward the Pit (200, 185), and a fall of the roof's
// blocks that fills it (the next brief opens it)
export const DOOR = { x: 246.7, half: 1.1, sill: ROAD_Y - 0.04, h: 3.0, z: NAVE.z + NAVE.walls + 0.5, floorTo: 56.8, treads: 3, tread: 0.42, rise: 0.22, fall: 58.4, depth: 4.6 };

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

// the candles: [x, z, kind] (kind 0 a pair's pricket, 1 a tall candle, 2 a great candle on an iron stand), the flame ROAD_Y + their height above it
export function candles() {
  const out = [];
  const pitch = (ROAD.x1 - FOOT_X) / PAIRS;
  for (let i = 0; i < PAIRS; i++) {
    const x = FOOT_X + pitch * (i + 1) - 0.25, side = i % 2 ? 1 : -1;
    out.push([x, ROAD.zc + side * 0.68, 0]);
  }
  out.push([RAFT.x0 + 0.25, RAFT.z0 + 0.3, 1], [RAFT.x1 - 0.3, RAFT.z1 - 0.25, 1]); // the raft's two
  out.push([DOOR.x - DOOR.half - 0.25, DOOR.z - 0.35, 1], [DOOR.x + DOOR.half + 0.25, DOOR.z - 0.35, 1]); // the door's
  out.push([ROAD.x1 + 0.7, ROAD.z0 - 0.5, 2], [ROAD.x1 + 0.7, ROAD.z1 + 0.5, 2]); // the road's end: two great candles under the sun
  return out;
}
export const FLAME_Y = [0.44, 0.98, 1.9]; // a pricket's flame, a tall candle's, a great candle's, above ROAD_Y

// the floor under (x, z): the stair (given its head), the raft, the spurs, the road, the passage; else null
export function makeFloor(head) {
  const { xHead, yHead, xLand } = head, k = (yHead - ROAD_Y) / (xHead - FOOT_X);
  const inR = (R, x, z) => x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1;
  return (x, z) => {
    if (z >= SZ - SHALF && z <= SZ + SHALF && x >= FOOT_X && x <= xLand) return x >= xHead ? yHead : ROAD_Y + (x - FOOT_X) * k;
    if (inR(RAFT, x, z) || inR(ROAD, x, z) || inR(NSPUR, x, z) || inR(SSPUR, x, z)) return ROAD_Y;
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
