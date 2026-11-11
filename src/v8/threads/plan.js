// v8-04, stories with two ends (briefs/v8/index.md, threads 1, 2 and 4): where every prop of the three threads lies, the
// flags, the ground cover's clearances and the settings panel's stand points. Pure data and functions, no THREE, so
// vegetation/ground.js, v5/dressing/collation.js and settings.js can import it before anything is built.
//
// 1 the traveller: his boots, cloak and pack at the west lip of the Span's first broken bay (the deck stops at pier
//   -120's east face, x -113, after 130 m of deck from the west stair); his body below on the sunlit slope by P15, out
//   past pier -70, 55 m from the lip and in plain view down from it; his hat on a thorn further along P15.
// 2 the twelfth chair: gone from the Collation's north side (its second place from the west end), dragged out of
//   the clearing west toward P9; set down by P9 (four dents and a medlar's core), a rung snapped off on the causeway
//   by the fen, set down again on P14's salt crust; it stands at the head of the Sexton's forty-first grave.
// 3 the gold from the court: a mosaic of the sign (disc in notch) on the Sunken Court's west floor by P5's end, its gold
//   disc half picked out; two glints along P5; the hoard a jackdaw's nest on the head of the Wayside Shrine's saint,
//   one tessera left in the offering bowl.
import { toWorld } from '../../v5/dressing/collation.js'; // (a cycle: collation.js reads CHAIR_GONE; both are read only after load)

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
// off by its flag, or when the module is not loaded at all (?only= without it, ?skip= with it)
export const THREADS_OFF = Q.get('threads') === '0' || (Q.get('only') ? !Q.get('only').split(',').includes('threads') : false) || (Q.get('skip') || '').split(',').includes('threads');
export const OFF = {
  traveller: THREADS_OFF || Q.get('traveller') === '0',
  chair: THREADS_OFF || Q.get('chair') === '0',
  gold: THREADS_OFF || Q.get('gold') === '0',
};

// ---------------------------------------------------------------- 1 the traveller
export const TRAVELLER = {
  deckY: 56,
  edgeX: -113, // pier -120's east face: the deck's end over the fallen bay (-120..-70), 130 m from the west stair's head
  yaw: Math.PI, // the kit's frame: its local -x points over the lip (east)
  kit: { x: -113.42, z: 219.2 }, // the boots' heels, toes at the very lip; cloak, pack and the laid-out things behind them
  // where he came down: out past pier -70 on the sunlit slope by P15, nothing over him, 55 m from the lip and in plain
  // view down from it at a natural angle (a walker looks 45 degrees down and finds him)
  body: { x: -60, z: 238, yaw: 0.7 },
  hat: { x: -45.5, z: 244.5 }, // on a dead thorn by P15, further on: the wind took it
  stand: { deck: { x: -113.3, z: 221.2 }, body: { x: -63.5, z: 242.5 }, approach: { x: -44, z: 238 }, hat: { x: -49.5, z: 247.5 } },
};

// ---------------------------------------------------------------- 2 the twelfth chair
// the Collation's chair that goes: side -1 (north), the second place from the west end (collation.js PU[1])
export const CHAIR_GONE = { side: -1, i: 1 };
export const CHAIR = {
  drag: { len: 15, bearing: -2.62 }, // the furrows from the gap: their length and heading (atan2(dz, dx), west-north-west)
  rests: [
    { kind: 'dents', x: 87.4, z: -24.6, yaw: 0.3, medlar: true }, // beside P9, on the turf
    { kind: 'rung', x: 166.6, z: 122.3, yaw: 1.1 }, // on the causeway's verge by the fen, on the pale crust
    { kind: 'dents', x: 90.1, z: 238.9, yaw: -0.6 }, // beside P14, in the salt crust
  ],
  grave: 40, // graves.js SLOTS index: the forty-first, the one he is digging at load
};

// ---------------------------------------------------------------- 4 the gold from the court
export const GOLD = {
  mosaic: { x: -68, z: -153, size: 3.6, yaw: 0.45 }, // on the court's west floor; yaw turns its notch toward P5
  glints: [{ x: -80.2, z: -143.2 }, { x: -95.8, z: -137.0 }], // along P5, each within 1.5 m of its line
  shrine: { x: -108, z: -128 }, // LANDMARKS.shrine: the niche is at +4.2, +1.2 (structures/scatter.js)
};

// ---------------------------------------------------------------- where the ground cover keeps off (ground.js, after the draws)
const d2 = (x, z, p) => (x - p.x) ** 2 + (z - p.z) ** 2;
const C = Math.cos(CHAIR.drag.bearing), S = Math.sin(CHAIR.drag.bearing);
// the furrows begin where the gone chair stood: its place's u along the table (collation.js PU), a pace out from the edge
let dragFrom = null;
export function dragStart() {
  if (!dragFrom) { const [x, z] = toWorld(-4.25 + CHAIR_GONE.i * 1.7, CHAIR_GONE.side * 1.15); dragFrom = { x, z }; }
  return dragFrom;
}
export function threadsClear(x, z) {
  if (!OFF.traveller) {
    if (d2(x, z, TRAVELLER.body) < 7.2 * 7.2) return true; // the body, his coat and the fan of his letters
    if (d2(x, z, TRAVELLER.hat) < 1.2 * 1.2) return true;
  }
  if (!OFF.chair) {
    for (const r of CHAIR.rests) if (d2(x, z, r) < 1.3 * 1.3) return true;
    { // a strip a metre and a half wide along the furrows, the grass pressed flat
      const f = dragStart(), dx = x - f.x, dz = z - f.z, u = dx * C + dz * S, v = -dx * S + dz * C;
      if (u > -0.5 && u < CHAIR.drag.len + 1 && Math.abs(v) < 0.75 + 0.15 * Math.sin(u * 0.7)) return true;
    }
  }
  if (!OFF.gold) {
    for (const g of GOLD.glints) if (d2(x, z, g) < 0.9 * 0.9) return true;
    if (d2(x, z, GOLD.mosaic) < 2.9 * 2.9) return true;
  }
  return false;
}

// ---------------------------------------------------------------- the settings panel's stand points (group 'Stories')
// y: a stand point above the ground (the deck); the panel's teleport lands on the deck there (controls.placeAt's floor)
export const THREAD_PLACES = [
  { name: 'A pack on the Span', x: -118.5, z: 221.0, y: 56, look: { x: -113, z: 219.2 }, pitch: -0.3, thread: 'traveller' },
  { name: 'Under the broken bay', x: -44, z: 238, look: { x: -60, z: 238 }, pitch: -0.02, thread: 'traveller' },
  { name: 'A gap at the Collation', x: 131.5, z: -72.5, look: { x: 138.5, z: -68.5 }, pitch: -0.12, thread: 'chair' },
  { name: 'A chair by the graves', x: 34.5, z: 276.0, look: { x: 40.3, z: 279 }, pitch: -0.12, thread: 'chair' },
  { name: 'Gold in the court', x: -73.5, z: -149.0, look: { x: -68, z: -153 }, pitch: -0.3, thread: 'gold' },
  { name: 'The Wayside Shrine', x: -97.5, z: -124.5, look: { x: -103.8, z: -126.8 }, pitch: 0.05, thread: 'gold' },
];
