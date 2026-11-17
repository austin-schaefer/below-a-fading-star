// The regions' weights and their height hooks (v13 L2; v4/regions.js carries the regions' modules, their ground, cover,
// stone, air and sound, and three). What heightAt needs of the regions, importable in a worker: each
// region's shape as a signed distance, regionAt(x, z, out?, blend?) (the weights; v4/regions.js's header says what
// they are), regionDistance, regionsHeight (terrain.js's marked block: each region's height hook by its weight; the
// hooks are the regions' own, in v4/regions/height/<key>.js, which their modules re-export) and the coarse pass.
// v4/regions.js re-exports all of it, so callers import from there as before.
import { REGIONS, LANDMARKS } from '../world.js';
import { smoothstep, makeSimplex } from '../noise.js';
import { fenShoreDistance, FEN_EDGE } from './fen.js'; // v16 L3: the fen's edge, for its place and the Saltings' yield
import { height as bletting } from '../v4/regions/height/bletting.js';
import { height as saltings } from '../v4/regions/height/saltings.js';
import { height as outwash } from '../v4/regions/height/outwash.js';
import { height as highLing } from '../v4/regions/height/high-ling.js';
import { height as demesne } from '../v4/regions/height/demesne.js';
import { height as lynchets } from '../v4/regions/height/lynchets.js';
import { height as strandline } from '../v4/regions/height/strandline.js';
import { height as adust } from '../v4/regions/height/adust.js';

export const REGION_KEYS = Object.keys(REGIONS);
export const PLACE_KEYS = ['wood', 'fen', 'lattice'];
export const REGION_AIR_BLEND = 25 / 8; // the Tinctures cross a boundary over 20-30 m, the ground over 6-10
// each region's height hook (the same function its module exports as height)
export const HEIGHT_HOOKS = { bletting, saltings, outwash, highLing, demesne, lynchets, strandline, adust };

// the places that keep their own character, and where they win (placement plan, section 2)
// (v16 L3: no natural place keeps a ruled outline. The fen's is its edge, 10 m out (src/height/fen.js); the wood's
// circle is broken by a slow noise, 12 m either way. sd(x, z) is the place's signed distance where it has one.)
const RAG = makeSimplex(1605);
const ragged = (amp, freq, ox = 0) => (x, z) => amp * RAG.noise2(x * freq + ox, z * freq - ox);
export const woodRag = ragged(12, 0.022, 7.3); // field.js's wood paint gives out on the same line
const PLACES = {
  wood: { x: LANDMARKS.wood.x, z: LANDMARKS.wood.z, r: 95, blend: 20, rag: 12,
    sd: (x, z) => Math.sqrt((x - LANDMARKS.wood.x) ** 2 + (z - LANDMARKS.wood.z) ** 2) - 95 + woodRag(x, z) },
  // (v16 L5: where the edge's floor of sd says the weight is 0 at any blend (hb under 20), sd is not asked)
  fen: { x: 70, z: 160, r: 75, blend: 12, sd: (x, z) => { const lb = FEN_EDGE.sdFloor(x, z); return lb > 30 ? lb - 10 : fenShoreDistance(x, z) - 10; } },
  lattice: { x: LANDMARKS.moraine.x, z: LANDMARKS.moraine.z, r: 50, blend: 12 },
};
// a region's ragged edge (REGIONS[k].ragged: { amp, freq }): its distance moved by up to amp metres of slow noise
const EDGE_SD = { fen: fenShoreDistance }, EDGE_LB = { fen: FEN_EDGE.sdFloor }; // the edges a region may yield to ({ edge, off } in its yields), and their floors of sd

// ---------------------------------------------------------------- signed distances (metres, < 0 inside)
function sdPoly(pts, x, z) {
  let d = Infinity, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, az] = pts[j], [bx, bz] = pts[i];
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    let t = ((x - ax) * ex + (z - az) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - ex * t, dz = z - az - ez * t;
    d = Math.min(d, dx * dx + dz * dz);
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  d = Math.sqrt(d);
  return inside ? -d : d;
}
// a spine of [x, z, halfWidth]: distance to the nearest segment minus the half-width there. (v16 L5: compiled to
// flat arrays, and a segment whose box, less its wider half-width, is no nearer than the best so far is skipped: the
// same number, to the bit.)
function compileStrip(sp) {
  const n = sp.length - 1, S = new Float64Array(n * 10);
  for (let i = 0; i < n; i++) {
    const [ax, az, aw] = sp[i], [bx, bz, bw] = sp[i + 1];
    S.set([ax, az, bx - ax, bz - az, aw, bw - aw, Math.min(ax, bx), Math.max(ax, bx), Math.min(az, bz), Math.max(az, bz) ], i * 10);
  }
  return { n, S, W: new Float64Array(sp.slice(0, n).map((p, i) => Math.max(p[2], sp[i + 1][2]))) };
}
function sdStrip(c, x, z) {
  const { n, S, W } = c;
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const o = i * 10;
    const gx = x < S[o + 6] ? S[o + 6] - x : x > S[o + 7] ? x - S[o + 7] : 0, gz = z < S[o + 8] ? S[o + 8] - z : z > S[o + 9] ? z - S[o + 9] : 0;
    const lim = best + W[i];
    if (lim < Infinity && (lim <= 0 || gx * gx + gz * gz >= lim * lim)) continue;
    const ax = S[o], az = S[o + 1], ex = S[o + 2], ez = S[o + 3], l2 = ex * ex + ez * ez;
    let t = ((x - ax) * ex + (z - az) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - ex * t, dz = z - az - ez * t;
    best = Math.min(best, Math.sqrt(dx * dx + dz * dz) - (S[o + 4] + S[o + 5] * t));
  }
  return best;
}
function sdEllipse(e, x, z) {
  const dx = (x - e.x) / e.rx, dz = (z - e.z) / e.rz, k = Math.sqrt(dx * dx + dz * dz);
  return (k - 1) * Math.min(e.rx, e.rz); // approximate: metres along the short axis
}
// an annulus between r0 and r1 on compass bearings from..to (clockwise)
function sdAnnulus(a, x, z) {
  const dx = x - a.x, dz = z - a.z, r = Math.sqrt(dx * dx + dz * dz);
  let d = Math.max(a.r0 - r, r - a.r1);
  const b = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
  const span = (a.to - a.from + 360) % 360, into = (b - a.from + 360) % 360;
  if (into > span) {
    const off = Math.min(into - span, 360 - into) * (Math.PI / 180) * Math.max(r, 1); // metres round the arc
    d = Math.max(d, off);
  }
  return d;
}
export const SHAPES = {};
const SHAPE_W = {};
for (const k of REGION_KEYS) {
  const R = REGIONS[k], s = R.shape;
  let f;
  if (s.circle) f = (x, z) => Math.sqrt((x - s.circle.x) ** 2 + (z - s.circle.z) ** 2) - s.circle.r;
  else if (s.ellipse) f = (x, z) => sdEllipse(s.ellipse, x, z);
  else if (s.poly) f = (x, z) => sdPoly(s.poly, x, z);
  else if (s.strip) { const c = compileStrip(s.strip); f = (x, z) => sdStrip(c, x, z); }
  else if (s.annulus) f = (x, z) => sdAnnulus(s.annulus, x, z);
  const clip = R.clip || {};
  const yields = R.yields || [];
  const rag0 = R.ragged ? ragged(R.ragged.amp, R.ragged.freq, R.ragged.amp) : null, still = R.ragged?.still || [];
  // (still: [x, z, r] where the edge keeps its old line, easing out over 15 m: a built place laid against it)
  const rag = rag0 && (still.length ? (x, z) => { let m = 1; for (const [sx, sz, sr] of still) m = Math.min(m, smoothstep(sr, sr + 15, Math.sqrt((x - sx) ** 2 + (z - sz) ** 2))); return m && rag0(x, z) * m; } : rag0);
  // the full signed distance, with clips and the places it yields to cut out
  const plain = (x, z) => {
    let d = f(x, z);
    if (clip.zMin !== undefined) d = Math.max(d, clip.zMin - z);
    if (clip.zMax !== undefined) d = Math.max(d, z - clip.zMax);
    // (v16 L5: an edge's yield is not measured where its floor of sd already puts it under d)
    for (const y of yields) d = y.edge ? (y.off - EDGE_LB[y.edge](x, z) <= d ? d : Math.max(d, y.off - EDGE_SD[y.edge](x, z))) : Math.max(d, y.r - Math.sqrt((x - y.x) ** 2 + (z - y.z) ** 2));
    return d;
  };
  SHAPES[k] = rag ? (x, z) => plain(x, z) + rag(x, z) : plain; // the ragged edge moves the yields' line too
  // the weights' form (v16 L5): past lim + the rag's reach (|noise| < 1.1) from the line the weight is 0 or 1 whatever
  // the rag says, so its noise is not asked there
  const reach = 1.1 * (R.ragged?.amp ?? 0);
  SHAPE_W[k] = rag ? (x, z, lim) => { const d = plain(x, z); return d > lim + reach || d < -lim - reach ? d : d + rag(x, z); } : plain;
}
// bounding boxes, padded by the widest blend, so far points skip the distance maths
export const BOX = {};
for (const k of REGION_KEYS) {
  const s = REGIONS[k].shape, pad = 30 * REGION_AIR_BLEND / 2 + 10 + (REGIONS[k].ragged?.amp ?? 0);
  let pts;
  if (s.circle) pts = [[s.circle.x - s.circle.r, s.circle.z - s.circle.r], [s.circle.x + s.circle.r, s.circle.z + s.circle.r]];
  else if (s.ellipse) pts = [[s.ellipse.x - s.ellipse.rx, s.ellipse.z - s.ellipse.rz], [s.ellipse.x + s.ellipse.rx, s.ellipse.z + s.ellipse.rz]];
  else if (s.annulus) pts = [[s.annulus.x - s.annulus.r1, s.annulus.z - s.annulus.r1], [s.annulus.x + s.annulus.r1, s.annulus.z + s.annulus.r1]];
  else pts = (s.poly || s.strip).map((p) => [p[0] - (p[2] || 0), p[1] - (p[2] || 0)]).concat((s.poly || s.strip).map((p) => [p[0] + (p[2] || 0), p[1] + (p[2] || 0)]));
  BOX[k] = [Math.min(...pts.map((p) => p[0])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[1])) + pad];
}

// (v13 L2) the tight boxes, for the regions' own blend (blend 1, the ground's and the height's): outside one, the
// shape's distance is at least the region's half-blend, so its weight is exactly 0 and the distance is not taken.
// Each shape's own bound: a circle's and a polygon's distance is true (the box is the shape's, padded by hb); a strip's
// is at least the distance to its spine less the widest half-width; an ellipse's (k - 1) min(rx, rz) passes hb only
// where k passes 1 + hb / min(rx, rz); an annulus's at least r - r1. Clips and yields only add to a distance. One more
// metre of pad for the rounding.
const TIGHT = {};
for (const k of REGION_KEYS) {
  const s = REGIONS[k].shape, hb = REGIONS[k].blend / 2 + (REGIONS[k].ragged?.amp ?? 0), pad = hb + 1;
  let b;
  if (s.circle) b = [s.circle.x - s.circle.r - pad, s.circle.x + s.circle.r + pad, s.circle.z - s.circle.r - pad, s.circle.z + s.circle.r + pad];
  else if (s.ellipse) { const e = s.ellipse, g = 1 + hb / Math.min(e.rx, e.rz); b = [e.x - e.rx * g - 1, e.x + e.rx * g + 1, e.z - e.rz * g - 1, e.z + e.rz * g + 1]; }
  else if (s.annulus) { const a = s.annulus; b = [a.x - a.r1 - pad, a.x + a.r1 + pad, a.z - a.r1 - pad, a.z + a.r1 + pad]; }
  else {
    const pts = s.poly || s.strip, w = s.strip ? Math.max(...pts.map((p) => p[2])) : 0;
    b = [Math.min(...pts.map((p) => p[0])) - w - pad, Math.max(...pts.map((p) => p[0])) + w + pad, Math.min(...pts.map((p) => p[1])) - w - pad, Math.max(...pts.map((p) => p[1])) + w + pad];
  }
  TIGHT[k] = b;
}

export function regionDistance(key, x, z) { return SHAPES[key](x, z); }

export const _w = Object.fromEntries([...REGION_KEYS, ...PLACE_KEYS, 'moor', 'primary'].map((k) => [k, k === 'primary' ? 'moor' : 0]));
// (v13 L2) the weights are worked in flat arrays, by index (regions, then places, then moor), and written to the
// object once: the same arithmetic in the same order as the keyed loops it replaces, so the same bits
const NR = REGION_KEYS.length, NP = PLACE_KEYS.length, MOOR = NR + NP;
const W_KEYS = [...REGION_KEYS, ...PLACE_KEYS, 'moor'];
const R_SHAPE = REGION_KEYS.map((k) => SHAPE_W[k]), R_BLEND = new Float64Array(REGION_KEYS.map((k) => REGIONS[k].blend));
const R_TIGHT = new Float64Array(REGION_KEYS.flatMap((k) => TIGHT[k])), R_BOX = new Float64Array(REGION_KEYS.flatMap((k) => BOX[k]));
const P_DEF = new Float64Array(PLACE_KEYS.flatMap((k) => [PLACES[k].x, PLACES[k].z, PLACES[k].r, PLACES[k].blend]));
const P_SD = PLACE_KEYS.map((k) => PLACES[k].sd ?? null);
// the squared radius past which a place with an edge has no weight at any blend up to the air's: the wood's circle,
// its rag and its half-blend; the fen's edge (its rMax and its 10 m) and its half-blend
// (v16 L5: by the blend asked, so regionAt's tight blend reads the wood's rag over 119 m, not the air's 140)
const P_FAR = new Float64Array([95 + 12 + 2, FEN_EDGE.rMax + 10 + 2, 0]);
// fills W (NR + NP + 1) with the weights at (x, z); returns the primary's index in W_KEYS
function weights(x, z, blend, W) {
  // the places first: they win inside their limits
  let placeSum = 0;
  for (let i = 0; i < NP; i++) {
    const px = P_DEF[4 * i], pz = P_DEF[4 * i + 1];
    const hb = (P_DEF[4 * i + 3] * blend) / 2, sd = P_SD[i];
    let d;
    if (sd) { // the far side of a place with an edge: a cheap bound first (P_FAR: past it the weight is 0)
      const e2 = (x - px) ** 2 + (z - pz) ** 2, far = P_FAR[i] + hb;
      if (e2 > far * far) { W[NR + i] = 0; continue; }
      d = sd(x, z);
    } else d = Math.sqrt((x - px) ** 2 + (z - pz) ** 2) - P_DEF[4 * i + 2];
    const w = 1 - smoothstep(-hb, hb, d);
    W[NR + i] = w; placeSum += w;
  }
  const free = Math.max(0, 1 - Math.min(1, placeSum));
  let sum = 0;
  const B = blend === 1 ? R_TIGHT : R_BOX;
  for (let i = 0; i < NR; i++) {
    if (x < B[4 * i] || x > B[4 * i + 1] || z < B[4 * i + 2] || z > B[4 * i + 3]) { W[i] = 0; continue; }
    const hb = (R_BLEND[i] * blend) / 2, w = 1 - smoothstep(-hb, hb, R_SHAPE[i](x, z, hb));
    W[i] = w; sum += w;
  }
  // regions share what the places leave; where two overlap they split it; the remainder is plain moor
  const scale = sum > 1 ? free / sum : free;
  let best = MOOR, bw = 0;
  for (let i = 0; i < NR; i++) { W[i] *= scale; if (W[i] > bw) { bw = W[i]; best = i; } }
  if (placeSum > 1) for (let i = NR; i < MOOR; i++) W[i] /= placeSum;
  for (let i = NR; i < MOOR; i++) if (W[i] > bw) { bw = W[i]; best = i; }
  W[MOOR] = Math.max(0, 1 - Math.min(1, placeSum) - sum * scale);
  if (W[MOOR] > bw) best = MOOR;
  return best;
}
const _wa = new Float64Array(MOOR + 1);
export function regionAt(x, z, out = _w, blend = 1) {
  const best = weights(x, z, blend, _wa);
  for (let i = 0; i <= MOOR; i++) out[W_KEYS[i]] = _wa[i];
  out.primary = W_KEYS[best];
  return out;
}


// ---------------------------------------------------------------- the height hooks
const HEIGHT_KEYS = REGION_KEYS.filter((k) => typeof HEIGHT_HOOKS[k] === 'function');
const H_IDX = HEIGHT_KEYS.map((k) => REGION_KEYS.indexOf(k)), H_FN = HEIGHT_KEYS.map((k) => HEIGHT_HOOKS[k]);
const H_TIGHT = new Float64Array(HEIGHT_KEYS.flatMap((k) => TIGHT[k])), NH = HEIGHT_KEYS.length;
const _hw = new Float64Array(MOOR + 1);
// terrain.js's marked block: each region's height hook, by its weight
export function regionsHeight(h, x, z) {
  if (!NH) return h;
  let any = false;
  for (let i = 0; i < NH; i++) if (x >= H_TIGHT[4 * i] && x <= H_TIGHT[4 * i + 1] && z >= H_TIGHT[4 * i + 2] && z <= H_TIGHT[4 * i + 3]) { any = true; break; }
  if (!any) return h;
  weights(x, z, 1, _hw);
  for (let i = 0; i < NH; i++) { const w = _hw[H_IDX[i]]; if (w > 0) h = H_FN[i](h, x, z, w, COARSE); }
  return h;
}
// The coarse pass (v4 regions): while terrain.js lays its mesh (2-3 m cells) it calls setRegionsCoarse(cell), and
// every height hook gets that cell size as a fifth argument (0 the rest of the time). Relief finer than a cell (a
// ha-ha's drop, a shingle berm) returns its lower envelope then, so the coarse mesh never pokes through the fine
// ground skin the region draws over it (regions/skin.js); heightAt() itself stays exact for walking and placing.
let COARSE = 0;
export function setRegionsCoarse(cell) { COARSE = cell || 0; }
export const regionsCoarse = () => COARSE; // (v15-W1: the Lappet's crown, outside the regions' hooks, takes the same lower envelope at its rim)
// The boxes of the regions whose height hook takes the coarse pass (a fifth parameter): only there can the mesh sit
// below heightAt() under a skin, so placement (vegetation/ground.js) asks only there.
export const COARSE_BOXES = HEIGHT_KEYS.filter((k) => HEIGHT_HOOKS[k].length >= 5).map((k) => BOX[k]);

