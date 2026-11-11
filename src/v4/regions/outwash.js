// BQ The Outwash [Proposed] (plans/wilderness-v5.md; shape and site in plans/wilderness-v4-placement.md section 2, REGIONS.outwash
// in world.js). The glacier's foreland: "a grey plain of gravel and till in braided dry channels, the stones sorted
// and rounded, with erratics the size of carts perched on three points where the ice put them down. Cushions of
// moss-campion with a few pinpricks of pink, map-lichen in yellow-green continents on every boulder, and nothing
// taller than an ankle. A cold breath comes down off the ice and lays the grass flat; under the stones meltwater
// ticks. The boundary on the south is a long low ridge of terminal moraine you step up onto and see the gravel
// beyond. Only here: a white grouse that sits among the erratics so still it reads as a stone, and flushes at three
// metres with a sound like a pane breaking."
// The glacier itself is rebuilt in src/v4/glacier.js (its tongue, snout and ice, through terrain.js).
// Reserved for later releases and kept clear here: meltwater pools at (20, -205) (CQ), the line from (40, -265) to
// (60, -180) (CL's trail), the hearth at (10, -190) (DN); one erratic stands at (75, -200) for the glyph.
import * as THREE from 'three';
import { REGIONS } from '../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../noise.js';
import { Mesher, flapMaterial, flapInstanced } from '../../fauna/geo.js';
import { groundOf, stoneGeo, weld, instanced, stoneMaterial, airMotes, meshStats, compose } from './common.js';

const KEY = 'outwash';
const E = REGIONS.outwash.shape.ellipse;
const SN = makeSimplex(4411);
const sdE = (x, z) => { const dx = (x - E.x) / E.rx, dz = (z - E.z) / E.rz; return (Math.sqrt(dx * dx + dz * dz) - 1) * Math.min(E.rx, E.rz); };

// ---------------------------------------------------------------- the braided channels
// Six dry channels leave the snout's foot, wander south-west across the plain, cross and rejoin, and gather at the
// one gap in the moraine (OUT), where the meltwater once left.
const OUT = { x: -4, z: -178 }; // toward the Sunken Court, as R1 runs (placement plan section 4)
const CHANNELS = (() => {
  const rng = (() => { let s = 99; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const starts = [-8, 14, 33, 52, 74, 96];
  return starts.map((x0, i) => {
    const pts = [], amp = 4 + rng() * 5, ph = rng() * 6.28, k = 2 + rng() * 1.5, hw = 2.2 + rng() * 1.6;
    for (let s = 0; s <= 28; s++) {
      const t = s / 28, e = Math.pow(t, 1.15);
      const x = lerp(x0, OUT.x + 2, e) + Math.sin(t * Math.PI * k + ph) * amp * (1 - t * 0.85);
      const z = lerp(-213 - (i % 2) * 2, OUT.z - 6, t) + Math.cos(t * Math.PI * 1.3 + ph) * 2.5 * (1 - t);
      pts.push([x, z]);
    }
    pts.push([OUT.x, OUT.z + 6]);
    return { pts, hw };
  });
})();
const CH_BOX = [-30, 110, -222, -160];
// 0..1: how deep in a channel the point lies (1 on a channel's floor)
function channelAt(x, z) {
  if (x < CH_BOX[0] || x > CH_BOX[1] || z < CH_BOX[2] || z > CH_BOX[3]) return 0;
  let best = 0;
  for (const c of CHANNELS) {
    const p = c.pts;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0], az = p[i][1], ex = p[i + 1][0] - ax, ez = p[i + 1][1] - az, l2 = ex * ex + ez * ez;
      let t = ((x - ax) * ex + (z - az) * ez) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - ax - ex * t, dz = z - az - ez * t, d2 = dx * dx + dz * dz;
      const hw = c.hw * (0.8 + 0.4 * SN.noise2(x * 0.05, z * 0.05 + 3));
      if (d2 > hw * hw * 1.6) continue;
      const v = 1 - smoothstep(hw * 0.55, hw, Math.sqrt(d2));
      if (v > best) best = v;
    }
  }
  return best;
}
// the terminal moraine: a ridge along the ellipse's southern arc, crest 6 m inside the edge, gapped at OUT
function moraineAt(x, z) {
  const d = sdE(x, z), south = smoothstep(-199, -187, z);
  if (south <= 0) return 0;
  const gap = 1 - 0.9 * Math.exp(-(((x - OUT.x) / 5.5) ** 2));
  return Math.exp(-(((d + 6.5) / 3.4) ** 2)) * south * gap * (1 + 0.3 * SN.fbm2(x * 0.06, z * 0.06, 2));
}

// ---------------------------------------------------------------- hooks
// the plain: smoothed toward a gentle apron that falls from the snout's foot to the moraine, a quarter of the moor's
// relief kept; the channels cut half a metre into it; the moraine stands up to three metres
export function height(h, x, z, w) {
  const plane = -0.5 + clamp((-176 - z) / 40, 0, 1) * 1.9 + 0.006 * (x - 25);
  h = lerp(h, plane + (h - plane) * 0.25 + SN.fbm2(x * 0.09, z * 0.09, 2) * 0.25, w * 0.9);
  h -= channelAt(x, z) * 0.7 * w;
  h += moraineAt(x, z) * 2.9 * w;
  return h;
}

const C = (h) => new THREE.Color(h);
const cGravel = C('#6e7c8a'), cBar = C('#56616e'), cWash = C('#9eaab6'), cTill = C('#6c7078'), cMoss = C('#4c5a52'), cWet = C('#434a56'); // v8-02: grey-blue, the glacier's
const _gc = new THREE.Color();
export function ground(col, x, z, w, b) {
  const ch = channelAt(x, z), mo = moraineAt(x, z);
  const n = SN.fbm2(x * 0.08 + 20, z * 0.08, 3) * 0.5 + 0.5;
  _gc.copy(cGravel).lerp(cBar, smoothstep(0.55, 0.75, n) * 0.8);
  _gc.lerp(cWash, ch);
  _gc.lerp(cTill, smoothstep(0.15, 0.6, mo));
  _gc.lerp(cMoss, smoothstep(0.62, 0.8, SN.fbm2(x * 0.05 - 9, z * 0.05 + 4, 3) * 0.5 + 0.5) * (1 - ch) * 0.7);
  _gc.lerp(cWet, (1 - smoothstep(-214, -204, z)) * 0.5); // the snout's foot is damp
  col.lerp(_gc, w * (1 - (b?.ice ?? 0)));
}

// nothing taller than an ankle: the moor's grass thinned, cut short and greyed by the cold breath; no heather,
// bracken, flowers or trees (the cushions are the region's own, below)
export const cover = {
  density: { grass: 0.22, sedge: 0, heather: 0, bracken: 0, flowers: 0, fleshy: 0.15, reeds: 0, trees: 0 },
  scale: { grass: 0.38 },
  tint: { grass: '#8a96a0' }, tintAmt: 0.8,
};
export const stone = { density: 0.12, tors: false }; // the shared stones mostly give way to the region's own
export const air = { tint: '#cfe0f6', strength: 1 }; // "a blue-white breath" (DI)

// ---------------------------------------------------------------- sound: meltwater ticking under the stones
export const sound = {
  start(k) {
    const { ac, panner, setPos, filt, gainOf, chain, white, camera } = k;
    const rng = k.makeRng(7101);
    const bus = gainOf(0); bus.connect(k.master); k.send(bus, 0.25);
    // under the stones: runs of ticks and drips from one hollow, then a rest; each from its place with the air between
    const pans = [0, 1, 2].map(() => k.placed({ ref: 2.5, roll: 1.3, range: 40, air: 60, dest: bus }));
    let pi = 0, cx = 0, cz = 0, cw = 0, now0 = 0, ha = 0, hr = 0;
    const cues = { 'grouse-flush': (pos) => flushCue(k, pos) };
    function tickOne(x, z, at) {
      const p = pans[pi++ % 3], a = ha + (rng() - 0.5) * 0.3, r = hr + (rng() - 0.5);
      p.at(x + Math.cos(a) * r, camera.position.y - 1.9, z + Math.sin(a) * r);
      if (rng() < 0.78) { // a tick: a tiny resonant knock in a hollow under the stones
        const f = 1200 + rng() * 1600, o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = ac.createGain(); k.env(g, at, 0.05 + rng() * 0.05, 0.001, 0.02 + rng() * 0.03);
        o.connect(g); g.connect(p.in); o.start(at); o.stop(at + 0.08);
        const s = ac.createBufferSource(); s.buffer = white; s.start(at, rng() * 2, 0.02);
        const ng = ac.createGain(); k.env(ng, at, 0.03, 0.0005, 0.008); chain(s, filt('bandpass', f * 1.7, 3), ng, p.in);
      } else { // a drip into a hidden pool: a falling plink
        const o = ac.createOscillator(); o.type = 'sine';
        const f0 = 900 + rng() * 700; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + 0.06);
        const g = ac.createGain(); k.env(g, at, 0.06, 0.002, 0.07);
        o.connect(g); g.connect(p.in); o.start(at); o.stop(at + 0.12);
      }
    }
    const runs = k.caller(rng, { bout: [3, 9], gap: [0.12, 0.45], rest: [5, 0.7, 1.5, 30], first: [0.5, 3],
      when: () => { if (cw <= 0.05) return false; ha = rng() * 6.283; hr = 2 + rng() * 10; return true; } }, () => tickOne(cx, cz, now0 + k.lead() + rng() * 0.04));
    return {
      cues,
      tick(w, x, z, step, t, now) {
        bus.gain.setTargetAtTime(w > 0.02 ? 0.9 * w : 0, now, 0.4);
        cx = x; cz = z; cw = w; now0 = now;
        runs.tick(step);
      },
    };
  },
};
// "a sound like a pane breaking": a crack, a spill of glassy pings and falling grit, and the whirr of the wings
function flushCue(k, pos) {
  const { ac, voice, vOsc, vNoise, filt, gainOf, chain, white, pink } = k;
  const rng = k.makeRng(7102 + ((pos?.x ?? 0) * 13 | 0));
  const v = voice(pos, { ref: 4, roll: 1.1, range: 90, dur: 1.4, verb: 0.35, air: 120 });
  if (!v) return;
  const t0 = v.t0;
  // the crack
  const cg = gainOf(0); k.env(cg, t0, 0.5, 0.0008, 0.035);
  chain(vNoise(v, white, t0, 0.05), filt('highpass', 2500, 0.7), cg, v.in);
  // shards: inharmonic pings, thick at first then thinning, a little lower as they fall
  for (let i = 0; i < 22; i++) {
    const at = t0 + 0.01 + Math.pow(rng(), 1.8) * 0.5, f = (2600 + rng() * 5200) * (1 - (at - t0) * 0.35);
    const o = vOsc(v, 'sine', f, at, at + 0.2), g = gainOf(0); k.env(g, at, 0.05 + rng() * 0.07, 0.0008, 0.04 + rng() * 0.12);
    o.connect(g); g.connect(v.in);
  }
  for (let i = 0; i < 16; i++) {
    const at = t0 + 0.02 + rng() * 0.6, g = gainOf(0); k.env(g, at, 0.05, 0.0005, 0.01 + rng() * 0.02);
    chain(vNoise(v, white, at, 0.04), filt('bandpass', 5000 + rng() * 4000, 4), g, v.in);
  }
  // the wings: a fast flutter of filtered noise, dying away as the bird goes
  const wg = gainOf(0); wg.gain.setValueAtTime(0.0001, t0); wg.gain.linearRampToValueAtTime(0.16, t0 + 0.05); wg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
  const am = vOsc(v, 'square', 19, t0, t0 + 1.25), amg = gainOf(0.5), base = gainOf(0.5); am.connect(amg); amg.connect(base.gain);
  chain(vNoise(v, pink, t0, 1.25), filt('bandpass', 1300, 0.9), base, wg, v.in);
}

// ---------------------------------------------------------------- the region's meshes and the grouse
export async function build(ctx) {
  const { scene, terrain, noise, regions } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(7100);
  const G = groundOf(terrain);
  const w = {};
  const inRegion = (x, z, min = 0.6) => regions.regionAt(x, z, w).outwash >= min;
  const iceAt = (x, z) => terrain.biomeAt(x, z).ice;
  const nrm = { x: 0, y: 1, z: 0 };
  const meshes = [];

  // the stone: grey gravel, and the erratics a paler granite that came from somewhere else, all with map lichen
  const stoneMat = stoneMaterial({
    color: '#ffffff', rough: 0.88, strata: 0.06, grain: 0.8,
    lichen: [
      { color: [0.3, 0.36, 0.08], scale: 0.85, cover: 0.4, up: 0.6, rim: 0.9 },
      { color: [0.36, 0.37, 0.34], scale: 2.3, cover: 0.28, up: 0.3, rim: 0.3 },
    ],
  });

  // erratics, cart-sized, each perched on three stones; one at (75, -200) for the glyph, a knot round (50, -195)
  const errGeo = (() => {
    const big = stoneGeo(ctx.makeRng(7110), noise, 3, { sx: 1.25, sy: 0.85, sz: 1.0, round: 0.6, flatBase: false, seed: 3 });
    big.translate(0, 0.95, 0);
    const parts = [big];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * 6.283 + 0.4, g = stoneGeo(ctx.makeRng(7111 + i), noise, 0, { sx: 1, sy: 0.8, sz: 1, round: 0.8, seed: 5 + i });
      g.scale(0.26, 0.26, 0.26); g.translate(Math.cos(a) * 0.62, 0.14, Math.sin(a) * 0.5);
      parts.push(g.index ? g.toNonIndexed() : g);
    }
    const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
    let n = 0; for (const g of flat) n += g.attributes.position.count;
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3); let o = 0;
    for (const g of flat) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    return m;
  })();
  const erratics = [];
  const tryErratic = (x, z, s) => {
    if (!inRegion(x, z, 0.7) || iceAt(x, z) > 0.05 || channelAt(x, z) > 0.2 || moraineAt(x, z) > 0.4) return false;
    if (hyp(x - 20, z + 205) < 8 || hyp(x - 10, z + 190) < 7) return false; // CQ's pools, DN's hearth
    if (erratics.some((e) => hyp(e.x - x, e.z - z) < (e.s + s) * 2.2)) return false;
    erratics.push({ x, y: G.heightAt(x, z) - 0.08, z, s, sx: s * (0.85 + rng() * 0.3), sy: s * (0.8 + rng() * 0.35), sz: s * (0.85 + rng() * 0.3), ry: rng() * 6.283, rx: (rng() - 0.5) * 0.12, rz: (rng() - 0.5) * 0.12, c: new THREE.Color().setHSL(0.05 + rng() * 0.04, 0.08 + rng() * 0.06, 0.13 + rng() * 0.05) });
    return true;
  };
  tryErratic(75, -200, 1.6);
  for (const [x, z] of [[46, -192], [56, -198], [40, -201], [61, -189], [50, -205]]) tryErratic(x + (rng() - 0.5) * 3, z + (rng() - 0.5) * 3, 1.1 + rng() * 0.5);
  for (let k = 0; k < 400 && erratics.length < 17; k++) tryErratic(-30 + rng() * 140, -214 + rng() * 40, 1.0 + rng() * rng() * 0.9);
  const errMesh = instanced(errGeo, stoneMat, erratics, { name: 'outwash-erratics', shadow: true, colors: true });
  scene.add(errMesh); meshes.push(errMesh);
  for (const e of erratics) ctx.addCollider({ x: e.x, z: e.z, r: e.s * 1.15, y: e.y - 1, h: e.s * 1.9 + 1 });

  // cobbles: rounded and sorted; small and close in the channels' floors, larger and sparser on the bars
  const cobGeo = stoneGeo(ctx.makeRng(7120), noise, 0, { sx: 1.1, sy: 0.55, sz: 0.9, round: 0.7, seed: 9 });
  const cobbles = [];
  const nC = low ? 1400 : 2600;
  for (let k = 0; k < nC * 3 && cobbles.length < nC; k++) {
    const x = -40 + rng() * 155, z = -218 + rng() * 50;
    if (!inRegion(x, z, 0.35) || iceAt(x, z) > 0.1) continue;
    const ch = channelAt(x, z), mo = moraineAt(x, z);
    if (rng() > 0.35 + ch * 0.6 + mo * 0.3) continue;
    const s = ch > 0.5 ? 0.05 + rng() * 0.09 : mo > 0.3 ? 0.08 + rng() * rng() * 0.45 : 0.07 + rng() * rng() * 0.3;
    G.normalAt(x, z, nrm);
    const l = 0.1 + rng() * rng() * 0.12;
    cobbles.push({ x, y: G.heightAt(x, z) + s * 0.25, z, sx: s * (1 + rng() * 0.5), sy: s, sz: s * (1 + rng() * 0.4), ry: rng() * 6.283, rx: nrm.z * 0.8, rz: -nrm.x * 0.8, c: new THREE.Color(l, l * (0.98 + rng() * 0.03), l * (0.97 + rng() * 0.05)) });
  }
  const cobMat = stoneMaterial({ color: '#ffffff', rough: 0.85, strata: 0.04, grain: 0.7, lichen: [{ color: [0.4, 0.42, 0.36], scale: 6, cover: 0.12, up: 0.8, rim: 0 }] });
  const cobMesh = instanced(cobGeo, cobMat, cobbles, { name: 'outwash-cobbles', colors: true });
  scene.add(cobMesh); meshes.push(cobMesh);

  // moss-campion: tight green cushions on the gravel, a few pinpricks of pink
  const cushGeo = (() => {
    const g = new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y * 0.32 - 0.04); }
    g.computeVertexNormals();
    return g;
  })();
  const cushMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
  cushMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCL;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCL = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vCL;
      float cHash(vec3 p) { p = fract(p * vec3(443.9, 441.4, 437.2)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float tuft = cHash(floor(vCL * 14.0));
        diffuseColor.rgb *= 0.75 + 0.4 * tuft;
        float pink = step(0.955, cHash(floor(vCL * 26.0) + 7.0)) * smoothstep(0.02, 0.12, vCL.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.36, 0.52), pink);`);
  };
  const cushions = [];
  const nK = low ? 500 : 950;
  for (let k = 0; k < nK * 4 && cushions.length < nK; k++) {
    const x = -40 + rng() * 155, z = -217 + rng() * 48;
    if (!inRegion(x, z, 0.5) || iceAt(x, z) > 0.05) continue;
    const ch = channelAt(x, z), patch = noise.fbm2(x * 0.07 + 31, z * 0.07, 3) * 0.5 + 0.5;
    if (ch > 0.3 || rng() > smoothstep(0.35, 0.7, patch) + 0.08) continue;
    const s = 0.12 + rng() * rng() * 0.35, g = 0.75 + rng() * 0.35;
    cushions.push({ x, y: G.heightAt(x, z), z, sx: s * (1 + rng() * 0.3), sy: s, sz: s, ry: rng() * 6.283, c: new THREE.Color(0.2 * g, 0.3 * g, 0.15 * g) });
  }
  const cushMesh = instanced(cushGeo, cushMat, cushions, { name: 'outwash-cushions', colors: true });
  scene.add(cushMesh); meshes.push(cushMesh);

  // crystal litter: the Lattice's shards washed out onto the gravel, thickest near the ice
  const shardGeo = new THREE.OctahedronGeometry(1, 0); shardGeo.scale(0.35, 1, 0.35);
  const shardMat = new THREE.MeshStandardMaterial({ color: '#5a8aa0', roughness: 0.25, metalness: 0.1, emissive: new THREE.Color('#3aa8e0'), emissiveIntensity: 0.25 });
  const shards = [];
  for (let k = 0; k < 2000 && shards.length < (low ? 160 : 300); k++) {
    const x = -30 + rng() * 140, z = -219 + rng() * 34;
    if (!inRegion(x, z, 0.4) || iceAt(x, z) > 0.05 || rng() > smoothstep(-186, -214, z)) continue;
    const s = 0.04 + rng() * rng() * 0.12;
    shards.push({ x, y: G.heightAt(x, z) + s * 0.3, z, sx: s, sy: s * (1 + rng() * 1.5), sz: s, rx: (rng() - 0.5) * 1.8, ry: rng() * 6.28, rz: (rng() - 0.5) * 1.8 });
  }
  const shardMesh = instanced(shardGeo, shardMat, shards, { name: 'outwash-shards' });
  scene.add(shardMesh); meshes.push(shardMesh);

  // the cold breath: a few pale motes sliding down off the ice, low over the gravel
  const motes = airMotes(ctx, KEY, { count: 220, color: '#dbe8ff', size: 0.045, drift: [0.15, 0, 0.9], sway: 0.25, opacity: 0.45, low: 0.05, high: 1.6 });
  meshes.push(motes);

  // the grouse ------------------------------------------------------------
  const gm = new Mesher();
  gm.blob(0, 0.15, 0, 0.13, 0.12, 0.19, 8, 6, 0);          // body, plump
  gm.blob(0, 0.27, 0.15, 0.06, 0.06, 0.07, 6, 4, 0);       // head
  // wings, folded along the body when sitting (aFold 1) and spread in flight
  for (const sx of [-1, 1]) {
    const L = [[sx * 0.08, 0.2, 0.1], [sx * 0.2, 0.21, 0.06], [sx * 0.33, 0.2, -0.02]];
    const T = [[sx * 0.08, 0.18, -0.08], [sx * 0.2, 0.19, -0.1], [sx * 0.3, 0.19, -0.1]];
    gm.strip(L, T, 2, 0.01, (x) => Math.min(1, Math.abs(x) / 0.3), sx < 0);
  }
  const gGeo = gm.geometry();
  { // white; a dark eye and the black edge of the tail; a scarlet comb over the eye
    const p = gGeo.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      let r = 0.93, g = 0.93, b = 0.95;
      if (z < -0.15 && y < 0.2) { r = g = b = 0.12; }
      if (z > 0.17 && y > 0.27 && Math.abs(x) > 0.035) { r = 0.7; g = 0.1; b = 0.08; }
      if (z > 0.19 && y > 0.24 && y < 0.28 && Math.abs(x) > 0.04) { r = g = b = 0.05; }
      c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
    }
    gGeo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  const NG = 7;
  const fm = flapMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.8 });
  const { mesh: gMesh, flap, fold } = flapInstanced(gGeo, fm, NG);
  gMesh.name = 'outwash-grouse'; gMesh.castShadow = true; gMesh.receiveShadow = true;
  scene.add(gMesh); meshes.push(gMesh);
  // perches: the lee of an erratic in the knot round (50, -195), or open gravel beside a big stone
  const perches = [];
  for (const e of erratics) for (let i = 0; i < 2; i++) {
    const a = rng() * 6.283, r = e.s * 1.5 + 0.4 + rng() * 0.8, x = e.x + Math.cos(a) * r, z = e.z + Math.sin(a) * r;
    if (inRegion(x, z, 0.8) && iceAt(x, z) < 0.02) perches.push({ x, z, used: false });
  }
  perches.sort((a, b) => hyp(a.x - 50, a.z + 195) - hyp(b.x - 50, b.z + 195));
  const birds = [];
  for (let i = 0; i < NG && i < perches.length; i++) {
    const p = perches[i]; p.used = true;
    birds.push({ state: 'sit', x: p.x, z: p.z, y: G.heightAt(p.x, p.z), yaw: rng() * 6.283, perch: p, t: 0, fx: 0, fz: 0, fy: 0, tx: 0, tz: 0, dur: 1, rest: 0, flap: 0 });
  }
  gMesh.count = birds.length;
  const M4 = new THREE.Matrix4(), it = { x: 0, y: 0, z: 0, s: 1, ry: 0, rx: 0, rz: 0 };
  const cam = ctx.camera.position;
  function pose(i, b) {
    it.x = b.x; it.y = b.y; it.z = b.z; it.ry = b.yaw; it.rx = b.state === 'fly' ? -0.15 : 0; it.s = 1.25;
    gMesh.setMatrixAt(i, compose(it, M4));
    flap.array[i] = b.flap; fold.array[i] = b.state === 'fly' ? 0 : 1;
  }
  birds.forEach((b, i) => pose(i, b));
  gMesh.instanceMatrix.needsUpdate = true; flap.needsUpdate = true; fold.needsUpdate = true;
  let flying = 0;
  ctx.registerUpdate((dt, t) => {
    const px = cam.x, pz = cam.z, py = cam.y;
    let moved = false;
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      if (b.state === 'sit') {
        b.rest -= dt;
        // still as a stone, until you are within three metres
        if (b.rest <= 0 && hyp(px - b.x, pz - b.z) < 3 && Math.abs(py - b.y) < 4) {
          // away from you, a little to one side, 40-70 m, to a free perch if one lies that way, else open gravel
          let ax = b.x - px, az = b.z - pz; const al = hyp(ax, az) || 1; ax /= al; az /= al;
          let best = null, bs = -Infinity;
          for (const p of perches) {
            if (p.used) continue;
            const dx = p.x - b.x, dz = p.z - b.z, d = hyp(dx, dz);
            if (d < 25 || d > 90) continue;
            const sc = (dx * ax + dz * az) / d + rng() * 0.5;
            if (sc > bs) { bs = sc; best = p; }
          }
          b.perch.used = false;
          if (best) { best.used = true; b.perch = best; b.tx = best.x; b.tz = best.z; }
          else { b.tx = clamp(b.x + ax * 50, -20, 100); b.tz = clamp(b.z + az * 50, -212, -182); b.perch = { x: b.tx, z: b.tz, used: true }; }
          b.fx = b.x; b.fz = b.z; b.fy = b.y; b.t = 0; b.dur = hyp(b.tx - b.x, b.tz - b.z) / 9 + 0.6;
          b.state = 'fly'; flying++;
          ctx.audio?.cue?.('grouse-flush', { x: b.x, y: b.y + 0.4, z: b.z });
        }
      } else {
        b.t += dt;
        const u = Math.min(1, b.t / b.dur), e = u * u * (3 - 2 * u);
        const nx = lerp(b.fx, b.tx, e), nz = lerp(b.fz, b.tz, e);
        const gy = lerp(b.fy, G.heightAt(b.tx, b.tz), e);
        b.yaw = Math.atan2(nx - b.x, nz - b.z) || b.yaw;
        b.x = nx; b.z = nz; b.y = gy + Math.sin(u * Math.PI) * (2.5 + b.dur * 0.6);
        // whirring at first, then a glide on bowed wings, a few beats to brake, and down
        b.flap = u < 0.3 || u > 0.88 ? Math.sin(t * 46 + i) * 0.9 : -0.25 + Math.sin(t * 4) * 0.05;
        if (u >= 1) { b.state = 'sit'; b.y = G.heightAt(b.x, b.z); b.flap = 0; b.rest = 1.5; flying--; }
        moved = true;
      }
      if (moved || b.state === 'fly') pose(i, b);
    }
    if (moved) { gMesh.instanceMatrix.needsUpdate = true; flap.needsUpdate = true; fold.needsUpdate = true; }
    // a still bird keeps its small shadow; a flying one would lag the slow shadow clock, so none while any fly
    gMesh.castShadow = flying === 0 && hyp(px - 50, pz + 195) < 40 + 60;
  }, { pos: { x: 50, z: -195 }, near: 160, hz: 4 });

  // the snout's face: the terrain draws its slope; nothing to add here (glacier.js colours it)
  regions.stats[KEY] = () => ({ ...meshStats(meshes), creature: birds.length, at: birds.map((b) => [Math.round(b.x), Math.round(b.z)]), erratics: erratics.length, cobbles: cobbles.length, cushions: cushions.length });
  ctx.log(`region-outwash: ${erratics.length} erratics, ${cobbles.length} cobbles, ${cushions.length} cushions, ${shards.length} shards, ${birds.length} grouse`);
}
