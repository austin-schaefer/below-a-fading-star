// The regions kit (v4 systems): the eight bioregions of plans/wilderness-v5.md as shapes with soft boundaries, and
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
//                               (v4 regions: { start(kit) -> { tick(w, x, z, step, t, now), step?(x, z, at, vol, pitch,
//                               out) -> bool, cues?: { name: (pos, opts) => void } } }, started by audio/regions.js)
//   cover (v4 regions)          { density: { grass, sedge, heather, bracken, flowers, fleshy, reeds, trees }, scale:
//                               { grass, heather, ... }, floor: { heather, ... }, tint: { grass: '#hex', ... },
//                               tintAmt, trees(ground, rng, regionAt) -> [{ x, z, kind: 'medlar'|'thorn'|'dead'|'crooked', s, gap?, rot? }] }:
//                               multipliers (1 = as the moor), read by vegetation through coverAt() and treesFor()
//   stone (v4 regions)          { density, tors: bool }: how many of rocks.js's shared stones lie here (stoneAt());
//                               a region's own stone is built in its module
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

import { REGION_KEYS, PLACE_KEYS, REGION_AIR_BLEND, SHAPES, BOX, _w, regionAt, regionDistance, regionsHeight, setRegionsCoarse, COARSE_BOXES, HEIGHT_HOOKS } from '../height/regions.js'; // (v13 L2) the weights and the height hooks, three-free
export { REGION_KEYS, PLACE_KEYS, REGION_AIR_BLEND, regionAt, regionDistance, regionsHeight, setRegionsCoarse, COARSE_BOXES };
// (v13 L3) the ground hooks and the terrain's colour pass through them, three-free, for the bake in a worker
import { GROUND_HOOKS, regionsGround, REGIONS_DEBUG, REGION_DEBUG_COLORS } from '../height/ground.js';
export { regionsGround, REGION_DEBUG_COLORS };

export const HOOKS = { bletting, saltings, outwash, highLing, demesne, lynchets, strandline, adust };
// module file name for each key (main.js loads them as region-<key> world modules)
export const REGION_FILES = { bletting: 'bletting', saltings: 'saltings', outwash: 'outwash', highLing: 'high-ling', demesne: 'demesne', lynchets: 'lynchets', strandline: 'strandline', adust: 'adust' };

// ---------------------------------------------------------------- hooks for the shared systems
for (const k of REGION_KEYS) if (HOOKS[k].height !== HEIGHT_HOOKS[k]) throw new Error(`region ${k}: its module's height is not v4/regions/height's`);
for (const k of REGION_KEYS) if ((HOOKS[k].ground || null) !== (GROUND_HOOKS[k] || null)) throw new Error(`region ${k}: its module's ground is not v4/regions/ground's`);
const DEBUG = REGIONS_DEBUG;

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

// ---------------------------------------------------------------- v4 regions: cover, stone, trees and sound
// cover: each region's multipliers, blended by its weight (6-10 m boundaries); 1 everywhere a region does not touch
export const COVER_KINDS = ['grass', 'sedge', 'heather', 'bracken', 'flowers', 'fleshy', 'reeds', 'trees'];
const COVER_KEYS = REGION_KEYS.filter((k) => HOOKS[k].cover);
const COVER = Object.fromEntries(COVER_KEYS.map((k) => {
  const c = HOOKS[k].cover, tint = {};
  for (const [kind, hex] of Object.entries(c.tint || {})) { const col = new THREE.Color(hex); tint[kind] = [col.r, col.g, col.b]; }
  return [k, { d: c.density || {}, s: c.scale || {}, f: c.floor || {}, tint, ta: c.tintAmt ?? 0.85 }];
}));
const mk = (v) => Object.fromEntries(COVER_KINDS.map((k) => [k, v]));
const _cov = { d: mk(1), s: mk(1), f: mk(0), tint: Object.fromEntries(COVER_KINDS.map((k) => [k, [0, 0, 0]])), tw: mk(0) };
const _cw = { ..._w };
export function coverAt(x, z, out = _cov) {
  for (const k of COVER_KINDS) { out.d[k] = 1; out.s[k] = 1; out.f[k] = 0; out.tw[k] = 0; }
  let any = false;
  for (const k of COVER_KEYS) { const b = BOX[k]; if (x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3]) { any = true; break; } }
  if (!any) return out;
  const w = regionAt(x, z, _cw);
  for (const k of COVER_KEYS) {
    const wk = w[k]; if (!(wk > 0)) continue;
    const C = COVER[k];
    for (const kind in C.d) out.d[kind] += wk * (C.d[kind] - 1);
    for (const kind in C.s) out.s[kind] += wk * (C.s[kind] - 1);
    for (const kind in C.f) out.f[kind] += wk * C.f[kind];
    for (const kind in C.tint) {
      const t = out.tint[kind], c = C.tint[kind], a = wk * C.ta, tw = out.tw[kind] + a;
      // a running weighted mean of the tints, and their total weight
      t[0] += (c[0] - t[0]) * (a / tw); t[1] += (c[1] - t[1]) * (a / tw); t[2] += (c[2] - t[2]) * (a / tw);
      out.tw[kind] = tw;
    }
  }
  return out;
}
// stone: how many of rocks.js's shared stones lie here, and whether its old tors stand
const STONE_KEYS = REGION_KEYS.filter((k) => HOOKS[k].stone);
const _st = { density: 1, tors: true }, _sw2 = { ..._w };
export function stoneAt(x, z, out = _st) {
  out.density = 1; out.tors = true;
  if (!STONE_KEYS.length) return out;
  const w = regionAt(x, z, _sw2);
  for (const k of STONE_KEYS) {
    const wk = w[k]; if (!(wk > 0)) continue;
    const S = HOOKS[k].stone;
    out.density += wk * ((S.density ?? 1) - 1);
    if (S.tors === false && wk > 0.3) out.tors = false;
  }
  return out;
}
// trees a region plants itself (placed by vegetation/trees.js with its own variants, so they batch with the rest)
export function treesFor(ground, makeRng) {
  const out = [];
  REGION_KEYS.forEach((k, i) => { const f = HOOKS[k].cover?.trees; if (typeof f === 'function') for (const t of f(ground, makeRng(5100 + i), regionAt)) out.push(t); });
  return out;
}
// sound: audio/regions.js starts every region's sound hook once with its kit; each ticks at 10 Hz with its soundAt weight
export function startSounds(kit) {
  const live = [];
  for (const k of REGION_KEYS) {
    const S = HOOKS[k].sound;
    if (!S || typeof S.start !== 'function') continue;
    try { const r = S.start(kit); if (r) live.push({ k, r }); } catch (e) { console.error(`region ${k}: sound`, e); }
  }
  const cues = {};
  for (const { r } of live) Object.assign(cues, r.cues || {});
  const sw = { ..._w };
  return {
    keys: live.map((l) => l.k), cueNames: Object.keys(cues),
    tick(x, z, step, t, now) {
      const w = soundAt(x, z, sw);
      for (const { k, r } of live) r.tick?.(w[k] || 0, x, z, step, t, now);
    },
    cue(name, pos, opts) { const f = cues[name]; if (!f) return false; f(pos, opts); return true; },
    // a region's own footstep where it is the ground underfoot (weight over a half); true if it sounded
    step(x, z, at, vol, pitch, out) {
      const w = regionAt(x, z, sw);
      for (const { k, r } of live) if (r.step && w[k] > 0.5 && r.step(x, z, at, vol, pitch, out)) return true;
      return false;
    },
  };
}

export function makeRegions() {
  return {
    keys: REGION_KEYS, places: PLACE_KEYS, defs: REGIONS, hooks: HOOKS, files: REGION_FILES,
    regionAt, airAt, soundAt, distance: regionDistance, debugColors: REGION_DEBUG_COLORS, debug: DEBUG,
    cover: (k) => HOOKS[k].cover ?? null, stone: (k) => HOOKS[k].stone ?? null, sound: (k) => HOOKS[k].sound ?? null,
    coverAt, stoneAt, treesFor, startSounds,
    // each region module registers stats[key] = () => ({ calls, tris, instances, creature }) (tools/regions-test.mjs)
    stats: {},
  };
}
