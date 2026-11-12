// Places that differ (v8-02): the character of each place, as one table, and the pieces that read it.
//
// The owner, issue #1: "almost all areas of the world have similar dark palette, similarly dense vegetation". Each
// place now has its own ground, its own cover and its own light, inside the dying-sun palette:
//
// | place | ground | cover | light (exposure, saturation, contrast, warmth) |
// |---|---|---|---|
// | the common (moor round the keep, the causeway and the stones) | pale sage turf, grazed | ankle turf, rare tussocks, bare trodden patches | pale, open: 1.12, 1.0, 1.0, 0 |
// | the far moor | dun-olive, peat | knee grass in drifts with bare gaps | as v7: 1.0, 1.0, 1.0, 0 |
// | the Bletting | rank green | grass to the head in places, the most flowers | warm, saturated: 1.1, 1.3, 1.04, +0.05 |
// | the Pomegranate House's ground | (the Bletting's) | (the Bletting's) | warmest, most saturated: 1.18, 1.38, 1.04, +0.08 |
// | the High Ling | purple-brown | low, wind-flat heather | 1.0, 1.15, 1.08, +0.02 |
// | the Demesne | shaven bright lawn, a crisp edge | turf a few cm high, nothing else | palest: 1.28, 1.1, 0.94, 0 |
// | the Lynchets | striped strips, each a different crop's ghost | stubble rows and fallow | 1.06, 1.05, 1.0, +0.02 |
// | the Deodand Wood | leaf litter, near black | almost nothing under the canopy | darkest, ember-warm: 0.8, 0.95, 1.1, +0.1 |
// | Corpse-Candle Fen | black mud | tall reeds in stands, open black water between | cold, not dark (it is black mud and fog already): 1.0, 0.85, 1.04, -0.1 |
// | the Adust | red clay | none | hot: 1.06, 1.12, 1.06, +0.04 |
// | the Saltings | white crust | none | palest, washed out: 1.32, 0.72, 0.92, 0 |
// | the Outwash | grey-blue gravel | ankle grass, sparse | cold: 1.08, 0.8, 1.0, -0.05 |
// | the Strandline | black flint | none | 0.9, 0.85, 1.12, -0.03 |
//
// ground(col, x, z, cd): the terrain's vertex colour for the places without a region module of their own (the common,
// the wood's leaf litter, the fen's black mud); terrain.js calls it after the regions' ground hooks.
// trodAt(x, z, cd): 0..1, the common's bare trodden patches (the grass leaves them bare too).
// placeAt(x, z, cd, out?, blend?) -> weights for every place (the regions' own, the wood, fen and Lattice, and the moor
// split into `common` and `moor`; `house` taken from whatever lies round the Pomegranate House); cd is the causeway's
// distance (terrain.causewayDistance). commonAt(x, z, cd): how much of the moor here is grazed common.
// gradeAt(x, z, cd, out) -> out (a Vector4: exposure, saturation, contrast, warmth) blended over 25 m like the
// Tinctures; post.js's finish applies it at the camera. ?placegrade=0 holds it at (1, 1, 1, 0).
import { LANDMARKS } from '../world.js';
import { regionAt, REGION_KEYS, PLACE_KEYS, REGION_AIR_BLEND } from '../v4/regions.js';
import * as THREE from 'three';
import { smoothstep, makeSimplex } from '../noise.js';

export const GRADE = {
  common: [1.12, 1.0, 1.0, 0],
  moor: [1.0, 1.0, 1.0, 0],
  bletting: [1.1, 1.3, 1.04, 0.05],
  house: [1.18, 1.38, 1.04, 0.08],
  highLing: [1.0, 1.15, 1.08, 0.02],
  demesne: [1.28, 1.1, 0.94, 0],
  lynchets: [1.06, 1.05, 1.0, 0.02],
  wood: [0.8, 0.95, 1.1, 0.1],
  fen: [1.0, 0.85, 1.04, -0.1],
  adust: [1.06, 1.12, 1.06, 0.04],
  saltings: [1.32, 0.72, 0.92, 0],
  outwash: [1.08, 0.8, 1.0, -0.05],
  strandline: [0.9, 0.85, 1.12, -0.03],
  lattice: [1.0, 0.9, 1.04, -0.03],
};

const K = LANDMARKS.castle, ST = LANDMARKS.stones, TV = LANDMARKS.taverna;
const hyp = (x, z) => Math.sqrt(x * x + z * z);

// the grazed common: round the keep, along the causeway as far as the stones, and round the stones themselves
export function commonAt(x, z, cd) {
  const dk = hyp(x - K.x, z - K.z), ds = hyp(x - ST.x, z - ST.z);
  const keep = 1 - smoothstep(70, 115, dk);
  const road = (1 - smoothstep(12, 34, cd)) * (1 - smoothstep(200, 240, dk));
  const stones = 1 - smoothstep(24, 50, ds);
  return Math.max(keep, road, stones);
}

// the Pomegranate House's surroundings: its yard and the ground in sight of its door
export function houseAt(x, z) {
  return 1 - smoothstep(22, 60, hyp(x - TV.x, z - TV.z));
}

const KEYS = [...REGION_KEYS, ...PLACE_KEYS, 'common', 'moor', 'house'];
const _p = Object.fromEntries(KEYS.map((k) => [k, 0]));
const _rw = {};
export function placeAt(x, z, cd, out = _p, blend = 1) {
  const w = regionAt(x, z, _rw, blend);
  for (const k of REGION_KEYS) out[k] = w[k];
  for (const k of PLACE_KEYS) out[k] = w[k];
  const c = commonAt(x, z, cd);
  out.common = w.moor * c; out.moor = w.moor * (1 - c);
  const h = houseAt(x, z);
  if (h > 0) { for (const k of KEYS) if (k !== 'house') out[k] *= 1 - h; }
  out.house = h;
  return out;
}

const PARAMS = typeof location !== 'undefined' ? new URL(location.href).searchParams : new URLSearchParams();
const GRADE_ON = PARAMS.get('placegrade') !== '0';
const _g = { ..._p };
export function gradeAt(x, z, cd, out) {
  if (!GRADE_ON) return out.set(1, 1, 1, 0);
  const w = placeAt(x, z, cd, _g, REGION_AIR_BLEND);
  let e = 0, s = 0, c = 0, t = 0, sum = 0;
  for (const k of KEYS) {
    const wk = w[k]; if (!(wk > 0)) continue;
    const g = GRADE[k] || GRADE.moor;
    // exposure and contrast blend in log space, so a crossing eases evenly
    e += Math.log(g[0]) * wk; s += g[1] * wk; c += Math.log(g[2]) * wk; t += g[3] * wk; sum += wk;
  }
  if (sum <= 0) return out.set(1, 1, 1, 0);
  return out.set(Math.exp(e / sum), s / sum, Math.exp(c / sum), t / sum);
}

// ---------------------------------------------------------------- ground
const N = makeSimplex(20261111 + 802);
// the common: pale grazed turf, sage to straw, with bare trodden earth near the road and the keep's gate
const cTurf = new THREE.Color('#7c8a56'), cTurf2 = new THREE.Color('#969a68'), cTrod = new THREE.Color('#7c6a52');
// the wood: leaf litter, rust-brown to near black; the fen: black mud
const cLitter = new THREE.Color('#3a2414'), cLitter2 = new THREE.Color('#1c140e'), cMud = new THREE.Color('#1c2220');
const _gp = { ..._p }, _c = new THREE.Color();
export function trodAt(x, z, cd) {
  const near = Math.max(1 - smoothstep(5, 16, cd), 1 - smoothstep(40, 62, hyp(x - K.x, z - K.z)));
  return smoothstep(0.58, 0.72, N.fbm2(x * 0.05 + 11, z * 0.05 - 7, 3) * 0.5 + 0.5 + 0.12 * near);
}
export function ground(col, x, z, cd) {
  const w = placeAt(x, z, cd, _gp);
  const com = w.common, wood = w.wood, fen = w.fen;
  if (com > 0.001) {
    _c.copy(cTurf).lerp(cTurf2, smoothstep(0.3, 0.7, N.fbm2(x * 0.03, z * 0.03, 3) * 0.5 + 0.5)).lerp(cTrod, trodAt(x, z, cd) * 0.8);
    col.lerp(_c, com * 0.85);
  }
  if (wood > 0.001) { _c.copy(cLitter).lerp(cLitter2, smoothstep(0.3, 0.7, N.fbm2(x * 0.07 - 3, z * 0.07, 2) * 0.5 + 0.5)); col.lerp(_c, wood * 0.85); }
  if (fen > 0.001) col.lerp(cMud, fen * 0.6);
  return col;
}
