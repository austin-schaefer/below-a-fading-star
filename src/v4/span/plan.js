// The Great Span's plan (v4, W): every measure the build, the terrain's marked blocks, the vegetation's
// keep-out and the tests share. Pure data and functions, no THREE, so terrain.js and vegetation can import it.
// plans/wilderness-v4-placement.md section 3: a straight span along z = 215 between abutments 48 m into the walls at
// x ±257 (the floor ends at x ±209), deck top at y 56, ten piers, three collapsed bays, a crack at x -45, a
// stair at each end, the west gate shut, the east gate blocked by rockfall.
import { smoothstep, lerp, clamp } from '../../noise.js';

export const BOT = -10;   // every footing reaches this far down
export const RING = 2.2;  // the arch rings' depth of voussoir

export const SPAN = {
  z: 215,
  deckY: 56,
  gateX: 257,       // the gates' faces (the doors stand in them)
  half: 8,          // the structure's half-width: z 207..223
  inner: 6.8,       // the parapets' inner faces: the walk is |z - 215| <= 6.8
  keep: 6.3,        // how close to a parapet the colliders let you come
  pierT: 14,        // pier thickness along the line
  apexY: 46,        // the arches' crowns (intrados)
  archK: 0.8,       // pointed arches: each arc's radius as a fraction of the clear span
  piers: [-211, -166, -120, -70, -22, 25, 70, 115, 176, 222],
  collapsed: [[-120, -70], [25, 70], [115, 176]], // the deck is gone between these piers
  crack: { x: -45, w: 3.6 },                      // the one gap a running hop clears
  gateW: 18,        // the portal's opening (z 206..224) and its height above the deck
  gateH: 34,
  facade: { depth: 8, z0: 183, z1: 247, top: 116 }, // the gate's dressed front, set in the rock (crag)
  crag: { x0: 262, x1: 302, z0: 166, z1: 264, top: 112 },
};
SPAN.z0 = SPAN.z - SPAN.half; SPAN.z1 = SPAN.z + SPAN.half;
const P = SPAN.piers, T2 = SPAN.pierT / 2;

// The walkable deck: x ranges between the gates and the collapsed bays (pier face to pier face).
SPAN.decks = (() => {
  const out = []; let x0 = -SPAN.gateX;
  for (const [a, b] of SPAN.collapsed) { out.push([x0, a + T2]); x0 = b - T2; }
  out.push([x0, SPAN.gateX]);
  return out;
})();
export const isCollapsed = (a, b) => SPAN.collapsed.some(([p, q]) => p === a && q === b);

// ---------------------------------------------------------------- the stairs
// Each stair is a run of flights (a straight run of treads, kit.stair) and landings (flat), laid out in lanes
// 7 m apart so the switchbacks stand side by side. A flight: { x, z, dir: [dx, dz] (unit, up the flight),
// len }; a landing: { rect: [x0, x1, z0, z1] }. The rise is shared out so the last tread is the deck.
// West: out of the wood's southern fringe at (-205, 200), three flights in lanes along x (z 200, 193, 186) and
// a top landing that runs south to the deck at (-246.5, 212), beside the west gate.
// East: from (225, 165), three flights in lanes along z (x 225, 232, 239) climbing south-east, the top landing
// joining the deck at (243, 212), beside the east gate.
export const STAIR_W = 5, CURB = 0.7, RUN = 0.52;
export const STAIRS = {
  west: {
    foot: [-205, 200],
    parts: [
      { x: -205, z: 200, dir: [-1, 0], len: 31 },
      { rect: [-243, -236, 189.8, 203.2] },
      { x: -236, z: 193, dir: [1, 0], len: 28 },
      { rect: [-208, -201, 182.8, 196.2], rubble: true }, // the collapsed landing: you step across rubble
      { x: -208, z: 186, dir: [-1, 0], len: 35 },
      { rect: [-250, -243, 182.8, 207], top: true },
    ],
    gap: [-250, -243], // where the top landing meets the deck, through the north parapet
  },
  east: {
    foot: [225, 165],
    parts: [
      { x: 225, z: 165, dir: [0, 1], len: 34 },
      { rect: [221.8, 235.2, 199, 205.4] },
      { x: 232, z: 199, dir: [0, -1], len: 31 },
      { rect: [228.8, 242.2, 161.6, 168], rubble: true },
      { x: 239, z: 168, dir: [0, 1], len: 33 },
      { rect: [235.8, 250, 201, 207], top: true },
    ],
    gap: [236, 250],
  },
};
// a flight's footprint rectangle (with its curbs)
export function flightRect(f) {
  const hw = STAIR_W / 2 + CURB, x1 = f.x + f.dir[0] * f.len, z1 = f.z + f.dir[1] * f.len;
  return [Math.min(f.x, x1) - (f.dir[0] ? 0 : hw), Math.max(f.x, x1) + (f.dir[0] ? 0 : hw), Math.min(f.z, z1) - (f.dir[1] ? 0 : hw), Math.max(f.z, z1) + (f.dir[1] ? 0 : hw)];
}
const rectOf = (p) => p.rect || flightRect(p);
// the whole stair's footprint, for the terrain and the vegetation
const STAIR_BOX = {};
for (const [k, s] of Object.entries(STAIRS)) {
  const b = [Infinity, -Infinity, Infinity, -Infinity];
  for (const p of s.parts) { const r = rectOf(p); b[0] = Math.min(b[0], r[0]); b[1] = Math.max(b[1], r[1]); b[2] = Math.min(b[2], r[2]); b[3] = Math.max(b[3], r[3]); }
  STAIR_BOX[k] = b;
}
export { STAIR_BOX };

// ---------------------------------------------------------------- the fallen pieces (sites; the build sets y)
// Bay-sized pieces of the three fallen crowns: across the old Span's hollow and in the tarn's south bay; half
// sunk in the fen's south reach; on the canyon's north rim, never in the river. `lean` leans one against a pier.
export const SLABS = [
  // bay -120..-70: the biggest fall, across the hollow and into the tarn's south bay (its shallows at z <= 200)
  { bay: 0, piece: 0, x: -108, z: 224, yaw: 0.35, tilt: 0.22, roll: -0.12, sink: 0.25 },
  { bay: 0, piece: 1, x: -94, z: 211, yaw: -0.2, tilt: -0.3, roll: 0.5, sink: 0.3 },
  { bay: 0, piece: 2, x: -100, z: 197, yaw: 1.2, tilt: 0.12, roll: 1.35, sink: 0.35 },
  { bay: 0, piece: 3, x: -83, z: 230, yaw: 2.6, tilt: 0.4, roll: 0.1, sink: 0.3 },
  { bay: 0, piece: 4, x: -84, z: 213, lean: -77, yaw: 0, tilt: 0, roll: 0, sink: 0.1 }, // against pier -70's west face
  // bay 25..70: half-sunk in the fen
  { bay: 1, piece: 0, x: 37, z: 221, yaw: 0.5, tilt: 0.3, roll: 0.25, sink: 0.5 },
  { bay: 1, piece: 1, x: 51, z: 206, yaw: -0.9, tilt: -0.2, roll: 1.4, sink: 0.45 },
  { bay: 1, piece: 2, x: 61, z: 229, yaw: 2.1, tilt: 0.5, roll: -0.3, sink: 0.55 },
  // bay 115..176: on the canyon's north rim (the build moves a piece off any water it finds)
  { bay: 2, piece: 0, x: 151, z: 197, yaw: 0.8, tilt: 0.25, roll: 1.3, sink: 0.2 },
  { bay: 2, piece: 1, x: 166, z: 203, yaw: -0.4, tilt: -0.35, roll: 0.2, sink: 0.25 },
  { bay: 2, piece: 2, x: 174, z: 192, yaw: 1.9, tilt: 0.15, roll: 1.5, sink: 0.2 },
];

// ---------------------------------------------------------------- the walkable deck
// The deck's height at (x, z), or null: between the parapets on a standing deck, off the crack, and through the
// parapet's gap where each top landing joins it; on the west gate's sill a little higher.
export function deckAt(x, z) {
  const dz = z - SPAN.z;
  if (dz > SPAN.inner || dz < -SPAN.half) return null;
  if (dz < -SPAN.inner) { // the north parapet's line: open only where a stair arrives
    const gw = STAIRS.west.gap, ge = STAIRS.east.gap;
    if (!((x >= gw[0] && x <= gw[1]) || (x >= ge[0] && x <= ge[1]))) return null;
  }
  if (Math.abs(x - SPAN.crack.x) < SPAN.crack.w / 2) return null;
  for (const d of SPAN.decks) if (x >= d[0] && x <= d[1]) return x < -SPAN.gateX + 6 && Math.abs(dz) < SPAN.gateW / 2 ? SPAN.deckY + 0.25 : SPAN.deckY;
  return null;
}

// ---------------------------------------------------------------- the marked blocks (terrain.js)
// West stair and gate x -270..-195, z 180..245; east stair and gate x 220..270, z 160..245 (placement plan).
// In each: the wall raised south of the deck into a shoulder that buries the gate's flank (the stair's
// massif stands on the north side), and a flat bed under the abutment so the walker's slope on the deck reads
// level. Everything else is the walls as they were. Called last in heightAt.
export const BLOCKS = { west: [-270, -195, 180, 245], east: [220, 270, 160, 245] };
const FLAT = { west: -2, east: 0 };
export function spanGround(h, x, z) {
  if (z < 160 || z > 245) return h;
  let side;
  if (x >= -270 && x <= -195 && z >= 180) side = 'west';
  else if (x >= 220 && x <= 270) side = 'east';
  else return h;
  const xa = Math.abs(x), B = BLOCKS[side];
  // fade everything to nothing at the block's edges
  const edge = smoothstep(0, 4, Math.min(x - B[0], B[1] - x, z - B[2], B[3] - z));
  if (edge <= 0) return h;
  const sb = STAIR_BOX[side];
  const inStair = x > sb[0] - 2 && x < sb[1] + 2 && z > sb[2] - 2 && z < sb[3] + 2;
  // the shoulder: up toward the gate's face, south of the deck only
  let s = 0;
  if (!inStair) {
    const sx = smoothstep(232, 258, xa) * (1 - smoothstep(265, 270, xa));
    const sz = smoothstep(SPAN.z1 + 1, SPAN.z1 + 9, z) * (1 - smoothstep(239, 244.5, z));
    const rough = Math.sin(x * 0.31 + z * 0.17) * 2.5 + Math.sin(x * 0.11 - z * 0.23) * 4;
    s = (98 + rough) * sx * sz;
  }
  let y = lerp(h, Math.max(h, s), edge * smoothstep(1, 6, s)); // (the shoulder's toe leaves the floor as it was)
  // the flat bed under the abutment (|z - 215| < 7.5, from the gate to the abutment's face)
  const dz = Math.abs(z - SPAN.z);
  if (xa > 214 && xa < 264) {
    const band = (1 - smoothstep(7.5, 8.6, dz)) * smoothstep(214, 217, xa) * edge;
    y = lerp(y, FLAT[side], band);
  }
  return y;
}

// ---------------------------------------------------------------- what the vegetation keeps off
// Piers, abutments, the gates' blocks, the stairs' massifs and the fallen pieces (with a margin).
export function spanClear(x, z, margin = 0) {
  if (z < 150 - margin || z > 250 + margin || x < -285 - margin || x > 285 + margin) return false;
  const m = margin;
  const dz = Math.abs(z - SPAN.z);
  // the abutments and the gates' blocks
  if (Math.abs(x) > 204 - m && dz < SPAN.half + 2 + m) return true;
  if (Math.abs(x) > SPAN.gateX - 1 - m && z > SPAN.facade.z0 - m && z < SPAN.facade.z1 + m) return true;
  // piers with their cutwaters
  if (dz < 15 + m) for (const p of P) if (Math.abs(x - p) < T2 + 1 + m) return true;
  // the stairs
  for (const k in STAIR_BOX) { const b = STAIR_BOX[k]; if (x > b[0] - m && x < b[1] + m && z > b[2] - m && z < b[3] + m) return true; }
  for (const s of SLABS) if ((x - s.x) ** 2 + (z - s.z) ** 2 < (9 + m) ** 2) return true;
  return false;
}

// ---------------------------------------------------------------- arches
// A bay between piers a and b: the clear span between their faces and the pointed arch's two arcs.
export function bayArch(a, b) {
  const fl = a + T2, fr = b - T2, c = fr - fl, R = SPAN.archK * c;
  const h = Math.sqrt(R * R - (R - c / 2) ** 2);
  return { a, b, fl, fr, c, R, m: (a + b) / 2, ys: SPAN.apexY - h, cl: fl + R, cr: fr - R };
}
// the intrados height over x within a bay (the lower of the two arcs' tops)
export function intrados(A, x) {
  if (x <= A.fl || x >= A.fr) return A.ys;
  const dl = x - A.cl, dr = x - A.cr;
  const yl = A.ys + Math.sqrt(Math.max(0, A.R * A.R - dl * dl)), yr = A.ys + Math.sqrt(Math.max(0, A.R * A.R - dr * dr));
  return x <= A.m ? yl : yr;
}
export const clampX = (x) => clamp(x, -SPAN.gateX, SPAN.gateX);
