// Corpse-Candle Fen on the edge (v16 L3; the owner, #73: "nothing natural keeps a ruled outline"). A fen is not a
// lake: it has no clean shore. FEN_EDGE (src/height/outline.js) is where its wet ground gives out: a hard wobble, fingers
// of wet running out along the low lines (west toward the tarn, north-west, east, south under the Span, and the broad
// side toward the river's mouth), islets of dry ground standing in it (land lobes, lifted by fenHeight) and pools
// apart from the main water. The side toward the higher ground (the keep's slope, north) is tight: the moor comes back
// within a few metres. The side toward the river is open: the flat runs on and the last pools lie 25 m out.
// The pools themselves are field.js's old warped noise: deep in, every hollow of it holds water; out through the
// fringe only its deepest cores do, so the edge breaks into separate pools instead of drawing a line.
// Pure and worker-safe. Readers: heightAt (fenHeight), the river's cut (fenRiverKeep), biomeWith's marsh (fenMarsh),
// waterLevelAt (fenWet), the regions' fen place and the Saltings' yield (fenShoreDistance), the river's and the
// reach's shaders (FEN_EDGE.glsl), and whatever is placed on it (fenAt, fenIn).
import { makeSimplex, smoothstep, lerp } from '../noise.js';
import { WORLD, LANDMARKS, WATER } from '../world.js';
import { radialOutline, sectorWeight } from './outline.js';

const L = LANDMARKS.fen;
export const FEN_Y = L.y;          // the fen's flat (-2): above the water, so only the pools are wet
export const FEN_WATER = WATER.fen.y; // -2.45
const SX = makeSimplex(WORLD.seed); // field.js's SX: the pools are the same noise as before

// the islets: land lobes in the edge, and fenHeight lifts them a little so they stand dry
const ISLES = [
  { bearing: 22, d: 26, r: 7, k: 4 },
  { bearing: 205, d: 30, r: 5.5, k: 3 },
  { bearing: 112, d: 36, r: 6, k: 3.5 },
  { bearing: 300, d: 22, r: 4, k: 2.5 },
  { bearing: 160, d: 44, r: 3.5, k: 2 },
];
export const FEN_EDGE = radialOutline({
  x: L.x, z: L.z, r: 54, seed: 1605, K: 12, amp: 0.15, falloff: 1.0,
  lobes: [
    // the fingers, along the low lines (tapered capsules); everything stays inside the water's disc (WATER.fen.r 80)
    { bearing: 284, d: 46, r: 9, k: 9, to: { bearing: 281, d: 76, r: 2.2 } },   // west, toward the tarn
    { bearing: 318, d: 48, r: 6, k: 7, to: { bearing: 312, d: 72, r: 1.6 } },   // north-west
    { bearing: 74, d: 50, r: 8, k: 8, to: { bearing: 70, d: 77, r: 2.2 } },     // east, along the Saltings' hem
    { bearing: 40, d: 48, r: 5, k: 6, to: { bearing: 34, d: 70, r: 1.5 } },     // north-east, short
    { bearing: 178, d: 52, r: 9, k: 9, to: { bearing: 188, d: 75, r: 3 } },     // south, under the Span
    { bearing: 232, d: 50, r: 6, k: 6, to: { bearing: 238, d: 73, r: 2 } },     // south-west
    // the open side: broad toward the river's mouth (bearing 128, 82 m)
    { bearing: 128, d: 50, r: 16, k: 14, to: { bearing: 128, d: 66, r: 10 } },
    { bearing: 100, d: 60, r: 8, k: 8 },
    // pools apart from the main water (discs, joined by nothing)
    { bearing: 262, d: 73, r: 3.5, k: 1.2 },
    { bearing: 88, d: 74, r: 3, k: 1 },
    { bearing: 214, d: 72, r: 3, k: 1 },
    { bearing: 56, d: 74, r: 3, k: 1 },
    { bearing: 338, d: 70, r: 2.6, k: 1 },
    { bearing: 150, d: 74, r: 3.5, k: 1 },
    // the islets
    ...ISLES.map((i) => ({ ...i, land: true })),
  ],
});
// the tight side (the keep's slope) and the open side (the river's mouth), 0..1 by bearing
const TIGHT = sectorWeight(L.x, L.z, { bearing: 352, half: 50, ramp: 30 });
const OPEN = sectorWeight(L.x, L.z, { bearing: 128, half: 45, ramp: 30 });
const ISLE_XZ = FEN_EDGE.lobes.filter((l) => l.land).map((l) => [l.x, l.z, l.r]);

// the last pools: how far past the shore the fringe runs (metres of sd)
const FRINGE_MAX = 26;
// the flatten's reach past the shore, and so how far heightAt reads the edge at all
export const FEN_REACH = Math.max(115, FEN_EDGE.rMax + 34);

// sd, the last point's kept (heightAt, the river's cut, the regions' place and the Saltings' yield all ask at one point)
let _lx = NaN, _lz = NaN, _ls = 0;
export function fenShoreDistance(x, z) {
  if (x === _lx && z === _lz) return _ls;
  _lx = x; _lz = z; _ls = FEN_EDGE.sd(x, z);
  return _ls;
}
const _f = { tight: 0, open: 0, fall: 0, fringe: 0 };
function fringe(x, z) {
  const tg = TIGHT(x, z), op = OPEN(x, z);
  _f.tight = tg; _f.open = op;
  _f.fall = lerp(lerp(24, 10, tg), 34, op); // metres past the shore where the moor has come back
  _f.fringe = lerp(lerp(16, 4, tg), FRINGE_MAX, op); // metres past the shore the last pools lie
  return _f;
}
// how much the pools dig at (x, z), given sd: every hollow deep in, only the deepest cores out through the fringe
function dig(x, z, sd, fr) {
  const t = smoothstep(-14, fr.fringe, sd);
  if (t >= 1) return 0;
  const pools = SX.warped2(x * 0.03 + 11, z * 0.03 - 7, 4, 0.9);
  const thr = 0.05 + 0.4 * t;
  return smoothstep(thr, thr + 0.3, pools) * (2.2 - 0.6 * t) + 0.3 * (1 - smoothstep(-6, 4, sd));
}
function isleLift(x, z) {
  let m = 0;
  for (let i = 0; i < ISLE_XZ.length; i++) {
    const I = ISLE_XZ[i], dx = x - I[0], dz = z - I[1], d2 = dx * dx + dz * dz, r = 1.3 * I[2];
    if (d2 < r * r) m = Math.max(m, 1 - smoothstep(0.35, 1.3, Math.sqrt(d2) / I[2]));
  }
  return m;
}

// heightAt's fen block. The broad bowl is the old one (the ground eased toward FEN_Y within 70 m of the centre and out
// over 45 more: a slope no eye reads as a line, and what stands round the fen stands where it stood); on it the edge
// does the rest: the flat drawn further down along the fingers (only ever down), the pools pocked in by sd, the
// islets standing dry.
export function fenHeight(h, x, z) {
  const dx = x - L.x, dz = z - L.z, d2 = dx * dx + dz * dz;
  if (d2 > FEN_REACH * FEN_REACH && h !== 0) return h;
  const mB = 1 - smoothstep(70, 115, Math.sqrt(d2));
  h = lerp(h, FEN_Y, mB);
  const sd = fenShoreDistance(x, z), fr = fringe(x, z);
  const mE = 1 - smoothstep(lerp(4, 1, fr.tight), fr.fall, sd);
  if (mE > 0) { const h2 = lerp(h, FEN_Y, mE); if (h2 < h) h = h2; }
  const m = mB > mE ? mB : mE;
  if (m === 0) return h;
  const lift = isleLift(x, z);
  return h - dig(x, z, sd, fr) * m * (1 - lift) + lift * 0.55;
}
// where the fen's water stands: within the fringe, where the pools dig below it (a little generous: the water's disc
// keeps its shore fade where the ground is just above the line). Off it, waterLevelAt goes on to the river.
export function fenDig(x, z) { const sd = fenShoreDistance(x, z); return dig(x, z, sd, fringe(x, z)) * (1 - isleLift(x, z)); }
export function fenWet(x, z) {
  const dx = x - L.x, dz = z - L.z;
  if (dx * dx + dz * dz > WATER.fen.r * WATER.fen.r) return false;
  const sd = fenShoreDistance(x, z);
  if (sd > FRINGE_MAX) return false;
  const fr = fringe(x, z);
  if (sd > fr.fringe) return false;
  return dig(x, z, sd, fr) * (1 - isleLift(x, z)) > 0.42;
}
// the marsh's paint: whole inside, out through the fringe in tongues (a slow noise moves where it gives out)
export function fenMarsh(x, z, n) {
  const sd = fenShoreDistance(x, z);
  if (sd > 60) return 0;
  const fr = fringe(x, z);
  return 1 - smoothstep(-10, fr.fringe * 0.6 + 3, sd + n * 10);
}
// the river's cut (field.js riverSection): kept to the fen's edge, given up where the fen is deep (0..1, 1 kept)
export function fenRiverKeep(x, z) {
  return smoothstep(-22, -11, fenShoreDistance(x, z));
}

// Placing on the edge, keeping the caller's random draws: the point on bearing a (radians, x = cos a, z = sin a, as
// the callers draw it) where sd is about off (two Newton steps along the ray); and the point at u (0..1) of the way
// out to the shore on that bearing.
const _p = { x: 0, z: 0 };
export function fenAt(a, off, out = _p) {
  const c = Math.cos(a), s = Math.sin(a), th = Math.atan2(s, c);
  let r = Math.max(2, FEN_EDGE.R(th) + off);
  for (let i = 0; i < 2; i++) r = Math.max(2, r + off - FEN_EDGE.sd(L.x + c * r, L.z + s * r));
  out.x = L.x + c * r; out.z = L.z + s * r;
  return out;
}
export function fenIn(a, u, out = _p) {
  const c = Math.cos(a), s = Math.sin(a), r = u * FEN_EDGE.R(Math.atan2(s, c));
  out.x = L.x + c * r; out.z = L.z + s * r;
  return out;
}
