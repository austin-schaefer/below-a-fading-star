// The study page's ctx (src/study/): a stand-in for the walk's ctx (src/main.js, the comment above `const ctx = {`)
// on a flat, empty world, so a figure or creature module's own builder runs unchanged and draws one of itself on plain
// ground at y 0. Each subject gets its own: its own scene group, its own updates, its own player (standing where its
// cell's camera stands, so whatever answers a visitor answers the one looking at it).
//
// What is real: THREE, the world's tables (world.js), the noise and rng streams (the walk's seeds, so a module's
// makeRng draws what it draws in the walk), the camera and renderer (the page's). What is flat: the terrain (height 0,
// level, moor, dry), the regions (moor), the mountains (no walls). What is a no-op: colliders, walkables, acts, audio
// cues, the profiler, claims. A field nobody stood in for reads undefined, as an absent module's does in the walk;
// `S.missing` lists each one a builder asked for (the page prints them under the subject when it fails).
import * as THREE from 'three';
import { makeSimplex, mulberry32 } from '../noise.js';
import { WORLD, SUN, LANDMARKS, CAUSEWAY_V4, WATER, PALETTE, SPAWN } from '../world.js';

const FLAT = (() => {
  const g = new THREE.PlaneGeometry(WORLD.size, WORLD.size, 8, 8);
  g.rotateX(-Math.PI / 2); // as the terrain's: its heights in y
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial());
})();

const BIOME = { moor: 1, heath: 0, wood: 0, marsh: 0, shore: 0, rock: 0, ice: 0, orchard: 0, crystal: 0, slope: 0, h: 0 };
export const terrain = {
  heightAt: () => 0,
  normalAt: (x, z, out) => (out ? out.set(0, 1, 0) : new THREE.Vector3(0, 1, 0)),
  slopeAt: () => 0,
  biomeAt: () => ({ ...BIOME }),
  waterLevelAt: () => null,
  isUnderwater: () => false,
  causewayDistance: () => 100,
  glacierMask: () => 0,
  regionRadius: WORLD.regionRadius,
  size: WORLD.size,
  mesh: FLAT,
  river: null,
};

const REGION = { wood: 0, fen: 0, lattice: 0, moor: 1, primary: 'moor' };
const regions = {
  regionAt: (x, z, out) => (out ? Object.assign(out, REGION) : { ...REGION }),
  airAt: () => ({ color: new THREE.Color('#5a5070'), strength: 0 }),
  soundAt: () => null,
  distance: () => 1e4,
  hooks: {},
  setRegionsCoarse() {},
};

const mountains = {
  crestAt: (b) => ({ x: Math.cos(b) * 440, z: Math.sin(b) * 440, r: 440, y: 120 }),
  faceAt: (b, y) => ({ x: Math.cos(b) * 400, z: Math.sin(b) * 400, y }),
  farHeightAt: () => 0,
  walkLimit: () => true,
  inWalk: () => true,
  addCorridor: () => () => {},
  peaks: [], ranges: [], seats: [], saddle: null,
};

const noop = () => {};
const quiet = new Proxy({}, { get: (t, k) => (k === 'then' ? undefined : noop) }); // any method, does nothing

// One subject's ctx. `shared` is the page's: { renderer, scene, camera, quality, flicker, time, built }.
export function studyCtx(shared, sub) {
  const group = new THREE.Group();
  group.name = `study-${sub.id}`;
  // the module's scene: its own group, with the page's scene to search (some modules find another's mesh by name)
  const scene = {
    add: (...o) => { for (const x of o) if (x) group.add(x); return scene; },
    remove: (...o) => { for (const x of o) group.remove(x); return scene; },
    getObjectByName: (n) => group.getObjectByName(n) || shared.scene.getObjectByName(n),
    traverse: (f) => group.traverse(f),
    get children() { return group.children; },
    get fog() { return null; },
    isScene: true,
  };
  const updates = [];
  // the cell's own camera, so `ctx.camera.position` is where the looker stands; `looker: 'far'` puts the looker a
  // long way off instead, for a thing that runs or hides from whoever comes close (it is studied as it is unwatched)
  const camera = sub.looker === 'far' ? Object.assign(new THREE.PerspectiveCamera(68, 1.6, 0.08, 2600), { name: 'study-far' }) : sub.camera;
  if (sub.looker === 'far') { camera.position.set(9000, 1.7, 9000); camera.updateMatrixWorld(); }
  const player = {
    pos: camera.position, yaw: 0, pitch: 0, speed: 0, moving: false, onGround: true, enabled: true, eye: 1.72,
    vel: new THREE.Vector3(), carried: false, intent: 0, lookQuiet: 99, hurrying: false, hops: 0, onStep: null,
  };
  const base = {
    THREE, scene, renderer: shared.renderer, camera, quality: shared.quality, events: shared.events,
    world: WORLD, sun: SUN, landmarks: LANDMARKS, causeway: CAUSEWAY_V4, water: WATER, palette: PALETTE, spawn: SPAWN,
    noise: makeSimplex(WORLD.seed + 1),
    rng: mulberry32(WORLD.seed + 2),
    makeRng: (salt) => mulberry32(WORLD.seed ^ (salt * 2654435761 >>> 0)),
    time: shared.time,
    registerUpdate: (fn, meta) => { updates.push(fn); }, // every frame: the study is close, no throttle
    log: (...a) => console.log(`[study:${sub.id}]`, ...a),
    progress: async () => {},
    throttle: false,
    terrain, regions, mountains,
    tinctures: { at: () => null },
    lights: shared.lights,
    sky: { flicker: shared.flicker, dark: 0, lamps: 0, gutter: 0 },
    player,
    controls: { state: player, addCollider: noop, addWalkable: () => noop, placeAt: noop, carry: () => noop, floorAt: () => 0 },
    addCollider: noop,
    addWalkable: () => noop,
    perf: quiet,
    audio: { cue: noop, echoStep: noop, ctx: null },
    acts: { add: (def) => { const h = { def, count: 0, done: false, busy: false, data: {}, setData: noop }; def.show?.(0, {}); return h; }, count: () => 0, off: true, forget: noop },
    claims: { at: () => null, add: noop, list: [] },
    ascents: { add: noop },
    below: { add: noop, inside: () => false, here: 0 },
    built: (name) => (name == null ? shared.built : Promise.resolve(false)),
    kept: { get: () => null, put: noop, preload: async () => {} },
    settings: { get: () => undefined, on: noop, add: noop },
    hud: quiet, post: null,
    lightSlots: quiet,
    tier: { stats: () => ({}), state: {} },
  };
  const missing = new Set();
  const ctx = new Proxy(base, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'string' && k !== 'then' && k !== 'toJSON') missing.add(k);
      return undefined;
    },
  });
  return { ctx, group, updates, missing, player };
}
