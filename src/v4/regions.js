// The regions kit (v4 systems): the eight bioregions of wilderness-v5.md as shapes with soft boundaries, and
// the hooks through which each region's own module (src/v4/regions/<key>.js) reaches the shared systems.
//
// regionAt(x, z, out?, blend?) -> { bletting, saltings, ..., moor, wood, fen, lattice, primary }
//   Weights 0..1 for each region (REGIONS in world.js), for the three places that keep their own character (the
//   Deodand Wood, Corpse-Candle Fen, the Lattice) and `moor`, the remainder; they sum to 1. `primary` is the key
//   with the largest weight. blend scales every boundary's width: 1 (default) is each region's own (6-10 m, for
//   ground, stone and cover), REGION_AIR_BLEND (25 m) is the Tinctures'. One preallocated object unless `out`.
// Hooks: a region module exports any of these; null or missing means the shared default:
//   height(h, x, z, w) -> h     the marked heightfield block: terrain.js calls it for every point the region
//                               touches (w its weight), after the landmarks are shaped and before the walls
//   ground(col, x, z, w, b)     the terrain's vertex colour (a THREE.Color to change in place; b is biomeAt)
//   cover                       { ... } read by vegetation (what grows, how dense): the region agent's schema
//   stone                       { ... } read by rocks (colour, shape, how it lies)
//   air                         { tint: '#hex', strength } the Tincture; airAt() blends them over 25 m
//   sound                       { ... } read by audio; soundAt() gives the weights to mix by
//   build(ctx)                  async, the region's meshes, creatures and lights, run as a world module
//                               named `region-<key>` (main.js)
// ctx.regions = { regionAt, airAt, soundAt, hooks, defs, shapes, distance(key, x, z), keys }.
// ?regions=1 tints the ground by region so the weights can be seen (and the map tool can draw them).
import * as THREE from 'three';
import { REGIONS, LANDMARKS } from '../world.js';
import { smoothstep } from '../noise.js';
import * as bletting from './regions/bletting.js';
import * as saltings from './regions/saltings.js';
import * as outwash from './regions/outwash.js';
import * as highLing from './regions/high-ling.js';
import * as demesne from './regions/demesne.js';
import * as lynchets from './regions/lynchets.js';
import * as strandline from './regions/strandline.js';
import * as adust from './regions/adust.js';

export const REGION_KEYS = Object.keys(REGIONS);
export const PLACE_KEYS = ['wood', 'fen', 'lattice'];
export const REGION_AIR_BLEND = 25 / 8; // the Tinctures cross a boundary over 20-30 m, the ground over 6-10
export const HOOKS = { bletting, saltings, outwash, highLing, demesne, lynchets, strandline, adust };
// module file name for each key (main.js loads them as region-<key> world modules)
export const REGION_FILES = { bletting: 'bletting', saltings: 'saltings', outwash: 'outwash', highLing: 'high-ling', demesne: 'demesne', lynchets: 'lynchets', strandline: 'strandline', adust: 'adust' };

// the places that keep their own character, and where they win (placement plan, section 2)
const PLACES = {
  wood: { x: LANDMARKS.wood.x, z: LANDMARKS.wood.z, r: 95, blend: 20 },
  fen: { x: 70, z: 160, r: 75, blend: 12 },
  lattice: { x: LANDMARKS.moraine.x, z: LANDMARKS.moraine.z, r: 50, blend: 12 },
};

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
// a spine of [x, z, halfWidth]: distance to the nearest segment minus the half-width there
function sdStrip(sp, x, z) {
  let best = Infinity;
  for (let i = 0; i < sp.length - 1; i++) {
    const [ax, az, aw] = sp[i], [bx, bz, bw] = sp[i + 1];
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    let t = ((x - ax) * ex + (z - az) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - ex * t, dz = z - az - ez * t;
    best = Math.min(best, Math.sqrt(dx * dx + dz * dz) - (aw + (bw - aw) * t));
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
const SHAPES = {};
for (const k of REGION_KEYS) {
  const R = REGIONS[k], s = R.shape;
  let f;
  if (s.circle) f = (x, z) => Math.sqrt((x - s.circle.x) ** 2 + (z - s.circle.z) ** 2) - s.circle.r;
  else if (s.ellipse) f = (x, z) => sdEllipse(s.ellipse, x, z);
  else if (s.poly) f = (x, z) => sdPoly(s.poly, x, z);
  else if (s.strip) f = (x, z) => sdStrip(s.strip, x, z);
  else if (s.annulus) f = (x, z) => sdAnnulus(s.annulus, x, z);
  const clip = R.clip || {};
  const yields = R.yields || [];
  // the full signed distance, with clips and the places it yields to cut out
  SHAPES[k] = (x, z) => {
    let d = f(x, z);
    if (clip.zMin !== undefined) d = Math.max(d, clip.zMin - z);
    if (clip.zMax !== undefined) d = Math.max(d, z - clip.zMax);
    for (const y of yields) d = Math.max(d, y.r - Math.sqrt((x - y.x) ** 2 + (z - y.z) ** 2));
    return d;
  };
}
// bounding boxes, padded by the widest blend, so far points skip the distance maths
const BOX = {};
for (const k of REGION_KEYS) {
  const s = REGIONS[k].shape, pad = 30 * REGION_AIR_BLEND / 2 + 10;
  let pts;
  if (s.circle) pts = [[s.circle.x - s.circle.r, s.circle.z - s.circle.r], [s.circle.x + s.circle.r, s.circle.z + s.circle.r]];
  else if (s.ellipse) pts = [[s.ellipse.x - s.ellipse.rx, s.ellipse.z - s.ellipse.rz], [s.ellipse.x + s.ellipse.rx, s.ellipse.z + s.ellipse.rz]];
  else if (s.annulus) pts = [[s.annulus.x - s.annulus.r1, s.annulus.z - s.annulus.r1], [s.annulus.x + s.annulus.r1, s.annulus.z + s.annulus.r1]];
  else pts = (s.poly || s.strip).map((p) => [p[0] - (p[2] || 0), p[1] - (p[2] || 0)]).concat((s.poly || s.strip).map((p) => [p[0] + (p[2] || 0), p[1] + (p[2] || 0)]));
  BOX[k] = [Math.min(...pts.map((p) => p[0])) - pad, Math.max(...pts.map((p) => p[0])) + pad, Math.min(...pts.map((p) => p[1])) - pad, Math.max(...pts.map((p) => p[1])) + pad];
}

export function regionDistance(key, x, z) { return SHAPES[key](x, z); }

const _w = Object.fromEntries([...REGION_KEYS, ...PLACE_KEYS, 'moor', 'primary'].map((k) => [k, k === 'primary' ? 'moor' : 0]));
export function regionAt(x, z, out = _w, blend = 1) {
  // the places first: they win inside their limits
  let placeSum = 0;
  for (const k of PLACE_KEYS) {
    const P = PLACES[k], d = Math.sqrt((x - P.x) ** 2 + (z - P.z) ** 2) - P.r, hb = (P.blend * blend) / 2;
    const w = 1 - smoothstep(-hb, hb, d);
    out[k] = w; placeSum += w;
  }
  const free = Math.max(0, 1 - Math.min(1, placeSum));
  let sum = 0;
  for (const k of REGION_KEYS) {
    const b = BOX[k];
    if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) { out[k] = 0; continue; }
    const hb = (REGIONS[k].blend * blend) / 2, w = 1 - smoothstep(-hb, hb, SHAPES[k](x, z));
    out[k] = w; sum += w;
  }
  // regions share what the places leave; where two overlap they split it; the remainder is plain moor
  const scale = sum > 1 ? free / sum : free;
  let best = 'moor', bw = 0;
  for (const k of REGION_KEYS) { out[k] *= scale; if (out[k] > bw) { bw = out[k]; best = k; } }
  if (placeSum > 1) for (const k of PLACE_KEYS) out[k] /= placeSum;
  for (const k of PLACE_KEYS) if (out[k] > bw) { bw = out[k]; best = k; }
  out.moor = Math.max(0, 1 - Math.min(1, placeSum) - sum * scale);
  if (out.moor > bw) best = 'moor';
  out.primary = best;
  return out;
}

// ---------------------------------------------------------------- hooks for the shared systems
const HEIGHT_KEYS = REGION_KEYS.filter((k) => typeof HOOKS[k].height === 'function');
const GROUND_KEYS = REGION_KEYS.filter((k) => typeof HOOKS[k].ground === 'function');
const _hw = { ..._w };
// terrain.js's marked block: each region's height hook, by its weight
export function regionsHeight(h, x, z) {
  if (!HEIGHT_KEYS.length) return h;
  let any = false;
  for (const k of HEIGHT_KEYS) { const b = BOX[k]; if (x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3]) { any = true; break; } }
  if (!any) return h;
  const w = regionAt(x, z, _hw);
  for (const k of HEIGHT_KEYS) if (w[k] > 0) h = HOOKS[k].height(h, x, z, w[k]);
  return h;
}

const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).get('regions') === '1';
export const REGION_DEBUG_COLORS = {
  bletting: '#c8902a', saltings: '#f0e0e8', outwash: '#8fb4d8', highLing: '#b04a6a', demesne: '#5aa04a', lynchets: '#c8c070',
  strandline: '#222228', adust: '#c84a1a', wood: '#1a4a1a', fen: '#3a6a5a', lattice: '#4ad0ff', moor: '#6a6a40',
};
const DBG = Object.fromEntries(Object.entries(REGION_DEBUG_COLORS).map(([k, v]) => [k, new THREE.Color(v)]));
const _gw = { ..._w }, _dc = new THREE.Color();
// terrain.js's vertex colours: each region's ground hook; with ?regions=1, a flat tint by weight instead
export function regionsGround(col, x, z, b) {
  if (!DEBUG && !GROUND_KEYS.length) return col;
  const w = regionAt(x, z, _gw);
  if (DEBUG) {
    _dc.setRGB(0, 0, 0);
    for (const k of Object.keys(DBG)) if (w[k] > 0) _dc.r += DBG[k].r * w[k], _dc.g += DBG[k].g * w[k], _dc.b += DBG[k].b * w[k];
    return col.lerp(_dc, 0.75);
  }
  for (const k of GROUND_KEYS) if (w[k] > 0) HOOKS[k].ground(col, x, z, w[k], b);
  return col;
}

// the Tinctures: the blended air hue and its strength at a point (regions without air add nothing)
const AIR = Object.fromEntries(REGION_KEYS.map((k) => [k, HOOKS[k].air ? { c: new THREE.Color(HOOKS[k].air.tint), s: HOOKS[k].air.strength ?? 1 } : null]));
const _aw = { ..._w };
export function airAt(x, z, out = { color: new THREE.Color(), strength: 0 }) {
  const w = regionAt(x, z, _aw, REGION_AIR_BLEND);
  out.color.setRGB(0, 0, 0); out.strength = 0;
  let sum = 0;
  for (const k of REGION_KEYS) {
    const a = AIR[k]; if (!a || w[k] <= 0) continue;
    out.color.r += a.c.r * w[k]; out.color.g += a.c.g * w[k]; out.color.b += a.c.b * w[k];
    out.strength += a.s * w[k]; sum += w[k];
  }
  if (sum > 0) out.color.multiplyScalar(1 / sum);
  return out;
}
// audio: the weights to mix each region's sound by (its sound hook says what the sound is)
const _sw = { ..._w };
export function soundAt(x, z, out) { return regionAt(x, z, out || _sw, REGION_AIR_BLEND); }

export function makeRegions() {
  return {
    keys: REGION_KEYS, places: PLACE_KEYS, defs: REGIONS, hooks: HOOKS, files: REGION_FILES,
    regionAt, airAt, soundAt, distance: regionDistance, debugColors: REGION_DEBUG_COLORS, debug: DEBUG,
    cover: (k) => HOOKS[k].cover ?? null, stone: (k) => HOOKS[k].stone ?? null, sound: (k) => HOOKS[k].sound ?? null,
  };
}
