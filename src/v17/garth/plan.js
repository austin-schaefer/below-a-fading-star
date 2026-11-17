// The Meridian Garth's own numbers (v17-U2): the hall, the noon, the rings, the trees, the rills and the can, all
// from GARTH and GARTH_DOOR in src/v17/plan.js. Three-free, so the tests can read it. Bearings are measured from the
// door's bearing (0 = toward the door, out of the hall), counter-clockwise seen from above (x east, z south).
import { GARTH, GARTH_DOOR } from '../plan.js';

export const CX = GARTH.c[0], CZ = GARTH.c[1], FLOOR = GARTH.floor, R = GARTH.r, CROWN = GARTH.crown;
export const DRUM = FLOOR + 7;              // the drum's top (the cornice), -17
// the dome: a segmental dome from the drum's top at r R to the crown; its sphere's radius and centre height
export const DOME_R = (R * R + (CROWN - DRUM) ** 2) / (2 * (CROWN - DRUM));
export const DOME_Y = CROWN - DOME_R;
export const domeY = (rho) => DOME_Y + Math.sqrt(Math.max(0, DOME_R * DOME_R - rho * rho));
export const OCULUS = 2.8;                  // the hole in the crown, r
export const LENS = { y: -5.2, r: 2.35 };   // the Noonwrights' lens hung under it
export const LIGHT_R = 4.5;                 // the noon's disc on the floor, r (9 m across)
export const beamR = (y) => LIGHT_R + (LENS.r - LIGHT_R) * Math.min(1, Math.max(0, (y - FLOOR) / (LENS.y - FLOOR)));

export const DOOR_A = Math.atan2(GARTH_DOOR.dir[1], GARTH_DOOR.dir[0]); // the door's bearing as an angle in x-z
// a point at radius r, bearing b (radians from the door's bearing)
export const at = (r, b) => [CX + Math.cos(DOOR_A + b) * r, CZ + Math.sin(DOOR_A + b) * r];
export const polar = (x, z) => { const dx = x - CX, dz = z - CZ; let b = Math.atan2(dz, dx) - DOOR_A; b = ((b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return { r: Math.sqrt(dx * dx + dz * dz), b }; };

// the garden's rings, the living innermost: each ring was once inside the light, and died when it shrank past it
export const RINGS = [
  { key: 'live', r0: 0, r1: 4.75 },
  { key: 'wilt', r0: 4.75, r1: 7.3 },
  { key: 'brown', r0: 7.3, r1: 10.0 },
  { key: 'grey', r0: 10.0, r1: 12.9 },
  { key: 'ash', r0: 12.9, r1: 15.7 },
];
export const WALK = { r0: 16.55, r1: R };   // the paved walk round the wall (Heliarch hexes)
export const RILL = { outer: 16.1, inner: 5.15, w: 0.44, kerb: 0.12, y: FLOOR + 0.016 }; // the water's face sits a little proud of the soil, between kerbs
export const RADIALS = [Math.PI / 3, Math.PI, -Math.PI / 3]; // the feeders from the outer rill in to the inner, by bearing
export const INLET = 0.34, DRAIN = Math.PI;  // the water comes out of the wall north of the door and leaves by a grate opposite
export const PATH = { half: 0.5 };           // the stepping stones from the door to the light, along bearing 0

// the trained trees: a ring of them in each ring of the garden, each a stage further dead outward. b: bearing, r: radius
export const TREES = [
  { ring: 'live', r: 2.55, b: 0.95 }, { ring: 'live', r: 2.55, b: -1.05 }, { ring: 'live', r: 2.45, b: Math.PI - 0.1 },
  { ring: 'wilt', r: 6.0, b: 0.98 }, { ring: 'wilt', r: 6.0, b: 2.15 }, { ring: 'wilt', r: 6.0, b: -2.0 }, { ring: 'wilt', r: 6.0, b: -0.75 },
  { ring: 'brown', r: 8.65, b: 0.42 }, { ring: 'brown', r: 8.65, b: 1.5 }, { ring: 'brown', r: 8.65, b: 2.65 }, { ring: 'brown', r: 8.65, b: -2.55 }, { ring: 'brown', r: 8.65, b: -1.45 }, { ring: 'brown', r: 8.65, b: -0.48 },
  { ring: 'grey', r: 11.45, b: 0.36 }, { ring: 'grey', r: 11.45, b: 1.25 }, { ring: 'grey', r: 11.45, b: 2.2 }, { ring: 'grey', r: 11.45, b: 2.85 }, { ring: 'grey', r: 11.45, b: -2.6 }, { ring: 'grey', r: 11.45, b: -1.7 }, { ring: 'grey', r: 11.45, b: -0.85 },
  { ring: 'ash', r: 14.3, b: 0.55 }, { ring: 'ash', r: 14.3, b: 1.45 }, { ring: 'ash', r: 14.3, b: 2.45 }, { ring: 'ash', r: 14.3, b: -2.75 }, { ring: 'ash', r: 14.3, b: -1.85 }, { ring: 'ash', r: 14.3, b: -0.6 },
];
export const TREE = { half: 1.3, h: 2.3 };   // an espalier's half-width along its frame and its height

// the can, set down at the light's edge beside the path, its spout reaching over the rill there
export const CAN = { r: 6.3, b: 0.5, h: 1.86 };

// the floor: inside the wall (held at its foot) and through the door's reveal to its outer face (U1's tube beyond)
export const WALK_R = R - 0.45;
export function floorAt(x, z) {
  const dx = x - CX, dz = z - CZ, r2 = dx * dx + dz * dz;
  if (r2 <= WALK_R * WALK_R) return FLOOR;
  if (r2 > (GARTH_DOOR.outer + 0.05) ** 2) return null;
  const u = dx * GARTH_DOOR.dir[0] + dz * GARTH_DOOR.dir[1], v = -dx * GARTH_DOOR.dir[1] + dz * GARTH_DOOR.dir[0];
  return u > 0 && Math.abs(v) <= GARTH_DOOR.half - 0.35 && u <= GARTH_DOOR.outer + 0.05 ? FLOOR : null;
}
