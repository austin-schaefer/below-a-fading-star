// BR The High Ling [Proposed] (plans/wilderness-v5.md; shape and site in plans/wilderness-v4-placement.md section 2,
// REGIONS.highLing in world.js). "The heath under the eastern wall, the one place that faces the sun across the
// whole bowl and is lit full on: deep ling and bell-heather, ruddy and knee-high, bilberry in the hollows, and gorse
// in bloom whose yellow turns ember in this light. Its stone is a pinkish granite that weathers into tors, stacked
// pillows of rock 6 to 10 m high, with a skirt of clitter fallen round each. Heather pollen hangs in the air;
// grasshoppers stridulate and the wind moans in the tors' joints. It sits on a shelf: the boundary is a scarp three
// metres high along its western edge, so you climb into it. Only here: stonechats, whose call is two pebbles knapped
// together, each on the top sprig of a gorse bush."
// The tallest tor stands at (268, -80), for CI (SITES.tallestTor); the brow at (238, -30) is kept clear for the
// Unfinished Prospect (SITES.prospect); the scarp is gentle enough to climb at (233, -60), where P10 comes up.
import * as THREE from 'three';
import { REGIONS, SITES } from '../../world.js';
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../noise.js';
import { Mesher, flapMaterial, flapInstanced } from '../../fauna/geo.js';
import { groundOf, stoneGeo, instanced, stoneMaterial, airMotes, meshStats, compose } from './common.js';
import { nearestLead } from '../paths/routes.js'; // v8-09: no stone or bush across a road (called at build time)
import { stairClear, stairSight } from '../../v12/stair/plan.js'; // v12-H3: none on the Diffident Stair's slabs (after the draws)
const onRoad = (x, z, r) => { const h = nearestLead(x, z, r + 0.3); return !!h && h.kind !== 'rivulet'; };

const KEY = 'highLing';
const SN = makeSimplex(6611);
const POLY = REGIONS.highLing.shape.poly;
// the west edge, from (228, 10) to (236, -105): x of the scarp's foot at z
const edgeX = (z) => POLY[0][0] + (POLY[0][1] - z) * ((POLY[1][0] - POLY[0][0]) / (POLY[0][1] - POLY[1][1]));
// where the scarp is broken and easy to climb: P10's way up at z -60, and two more gullies
const CLIMBS = [-60, -12, -92];
const scarpWidth = (z) => {
  let w = 3 + 1.2 * SN.noise2(z * 0.07, 1.3);
  for (const c of CLIMBS) w += 7 * Math.exp(-(((z - c) / 5) ** 2));
  return w;
};
const RISE = 3;

// the shelf: everything inside stands three metres up; along the west edge it rises in a scarp of three or four metres'
// width (gentle at the climbs), elsewhere it fades over the region's blend
export function height(h, x, z, w) {
  const dw = x - edgeX(z);
  let shelf = w;
  if (dw < 14 && z < 12 && z > -107) shelf = Math.min(w, smoothstep(-0.6, scarpWidth(z), dw));
  return h + RISE * shelf + SN.fbm2(x * 0.05, z * 0.05, 3) * 0.6 * w;
}

const C = (h) => new THREE.Color(h);
const cLing = C('#54303e'), cBell = C('#5e3252') /* v8-02: purple-brown */, cBil = C('#34442a'), cGrit = C('#6a5854');
const _gc = new THREE.Color();
export function ground(col, x, z, w, b) {
  const n = SN.fbm2(x * 0.06 + 5, z * 0.06, 3) * 0.5 + 0.5;
  _gc.copy(cLing).lerp(cBell, smoothstep(0.55, 0.72, n) * 0.6);
  // bilberry in the hollows (the terrain's own low places), granite grit on the scarp's face
  const hollow = smoothstep(0.3, 0.7, SN.fbm2(x * 0.03 - 4, z * 0.03 + 2, 2) * -0.5 + 0.5);
  _gc.lerp(cBil, hollow * 0.55);
  const dw = x - edgeX(z);
  _gc.lerp(cGrit, (1 - smoothstep(0, 5, Math.abs(dw - 1.5))) * 0.6 * (z < 12 && z > -107 ? 1 : 0));
  col.lerp(_gc, w * 0.85);
}

// deep ling everywhere, knee-high and ruddy; little grass; no trees (gorse and the tors are the region's own)
export const cover = {
  density: { grass: 0.15, heather: 2.2, bracken: 0.1, flowers: 0.15, trees: 0 },
  scale: { heather: 0.62, grass: 0.45 }, // v8-02: low and wind-flat
  floor: { heather: 1.6 },
  tint: { heather: '#6e3a52', grass: '#7a5a5a', bracken: '#6a3a2a' }, tintAmt: 0.75,
};
export const stone = { density: 0.3, tors: false };
export const air = { tint: '#f2c95e', strength: 1 }; // "gold pollen" (DI)

// the tors: [x, z, height]; the tallest at (268, -80)
const TORS = [[SITES.tallestTor.x, SITES.tallestTor.z, 10], [252, -40, 7.5], [281, -20, 6.2], [258, -2, 6.5], [247, -92, 7], [283, -62, 6]];

// ---------------------------------------------------------------- sound: grasshoppers, the wind in the tors
export const sound = {
  start(k) {
    const { ac, panner, setPos, filt, gainOf, chain, white, pink, camera } = k;
    const rng = k.makeRng(6101);
    const bus = gainOf(0); bus.connect(k.master); k.send(bus, 0.12);
    // three grasshoppers in the heather round you, each a train of scraped pulses then a rest
    const hoppers = [0, 1, 2].map((i) => {
      const p = panner('equalpower', 3, 1.2, 40); p.connect(bus);
      return { p, f: 3400 + i * 700 + rng() * 400, next: rng() * 2, a: rng() * 6.28 };
    });
    function chirr(h, at) {
      const n = 8 + (rng() * 10 | 0), rate = 0.035 + rng() * 0.015;
      for (let i = 0; i < n; i++) {
        const tt = at + i * rate, g = gainOf(0); k.env(g, tt, 0.05 * (0.6 + 0.4 * Math.sin(i / n * Math.PI)), 0.002, rate * 0.7);
        const s = ac.createBufferSource(); s.buffer = white; s.start(tt, rng() * 2, rate + 0.01);
        chain(s, filt('bandpass', h.f, 3), g, h.p);
      }
      return n * rate;
    }
    // the moan: wind finding the nearest tor in a gust, a swell of noise through two bands (A3 rising toward D4, and
    // its octave), Q 3: an event of 3-5 s with rests, not a standing whistle. Near the tors it comes every half
    // minute or so; from the moor it is a far call and keeps to the far calls' shared clock
    let tor = null, torD = Infinity;
    function moan(gain) {
      if (!tor) return;
      const pos = { x: tor[0], y: (k.terrain.heightAt(tor[0], tor[1]) || 0) + tor[2] * 0.6, z: tor[1] };
      const cp = camera.position, d = Math.hypot(pos.x - cp.x, pos.y - cp.y, pos.z - cp.z), dur = 3 + rng() * 2;
      const v = k.voice(pos, { ref: 30, roll: 1, range: 450, air: 80, verb: k.wetBy(d), dur: dur + 0.5 });
      if (!v) return;
      const t0 = v.t0, g = gainOf(0), src = k.vNoise(v, pink, t0, dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.22 * gain, t0 + dur * 0.35); g.gain.setTargetAtTime(0.0001, t0 + dur * 0.55, dur * 0.15);
      const b1 = filt('bandpass', 220, 3), b2 = filt('bandpass', 440, 3);
      b1.frequency.setValueAtTime(205, t0); b1.frequency.linearRampToValueAtTime(260, t0 + dur * 0.4); b1.frequency.linearRampToValueAtTime(215, t0 + dur);
      b2.frequency.setValueAtTime(410, t0); b2.frequency.linearRampToValueAtTime(520, t0 + dur * 0.4); b2.frequency.linearRampToValueAtTime(430, t0 + dur);
      chain(src, b1, gainOf(0.8), g); chain(src, b2, gainOf(0.35), g); g.connect(v.in);
    }
    const moans = k.caller(rng, { bout: [1, 2], gap: [4, 8], rest: [30, 0.7, 8, 300], first: [5, 40],
      when: () => {
        if (torD > 450) return false;
        if (torD > 150) { if (ac.currentTime - k.far.last < 20 || rng() < 0.6) return false; k.far.last = ac.currentTime; }
        return true;
      } }, (i, n, gain) => moan(gain));
    const cues = { 'stonechat': (pos) => chack(k, pos) };
    return {
      cues,
      tick(w, x, z, step, t, now) {
        bus.gain.setTargetAtTime(w > 0.02 ? w * (k.sky?.flicker?.value ?? 1) : 0, now, 0.5); // they fall quiet in the gutter
        // the nearest tor
        torD = Infinity;
        for (const T of TORS) { const d = hyp(T[0] - x, T[1] - z); if (d < torD) { torD = d; tor = T; } }
        moans.tick(step);
        if (w <= 0.1) return;
        for (const h of hoppers) {
          h.next -= step;
          if (h.next > 0) continue;
          h.a += 1 + rng() * 2;
          const r = 3 + rng() * 9;
          setPos(h.p, x + Math.cos(h.a) * r, camera.position.y - 1.5, z + Math.sin(h.a) * r);
          h.next = chirr(h, now + k.lead() + 0.02) + k.lognormal(rng, 3, 0.7);
        }
      },
    };
  },
};
// "two pebbles knapped together": two dry clacks, the second a touch higher
function chack(k, pos) {
  const { ac, voice, vNoise, vOsc, filt, gainOf, chain, white } = k;
  const v = voice(pos, { ref: 5, roll: 1.1, range: 70, dur: 0.5, verb: 0.2, air: 150 });
  if (!v) return;
  for (let i = 0; i < 2; i++) {
    const at = v.t0 + i * (0.11 + 0.02 * Math.sin(v.t0 * 7)), f = 3400 + i * 500;
    const g = gainOf(0); k.env(g, at, 0.32, 0.0005, 0.03);
    chain(vNoise(v, white, at, 0.04), filt('bandpass', f, 5), g, v.in);
    const o = vOsc(v, 'triangle', f * 0.62, at, at + 0.05), og = gainOf(0); k.env(og, at, 0.12, 0.0005, 0.018);
    o.connect(og); og.connect(v.in);
  }
}

// ---------------------------------------------------------------- tors, clitter, gorse, stonechats
export async function build(ctx) {
  const { scene, terrain, noise, regions } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(6100);
  const G = groundOf(terrain);
  const W = {};
  const inRegion = (x, z, min = 0.6) => regions.regionAt(x, z, W).highLing >= min;
  const meshes = [];

  const granite = stoneMaterial({
    color: '#ffffff', rough: 0.9, strata: 0.0, grain: 1.2,
    lichen: [{ color: [0.5, 0.54, 0.44], scale: 1.3, cover: 0.32, up: 0.75, rim: 0.3 }, { color: [0.72, 0.4, 0.13], scale: 2.7, cover: 0.14, up: 0.5, rim: 0 }],
  });
  granite.onBeforeCompile = ((prev) => (sh) => { // feldspar: the granite's pink and white crystals
    prev(sh);
    sh.fragmentShader = sh.fragmentShader.replace('diffuseColor.rgb *= 1.0 - smoothstep(0.1, -0.25, vRN.y) * 0.3;', `diffuseColor.rgb *= 1.0 - smoothstep(0.1, -0.25, vRN.y) * 0.3;
          float fs = rhash(floor(vRPos * 38.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.44, 0.4), step(0.86, fs) * 0.45);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.1, 0.1), step(0.93, rhash(floor(vRPos * 45.0) + 3.0)) * 0.5);`);
  })(granite.onBeforeCompile);
  granite.customProgramCacheKey = () => 'fp-stone:highling-granite';
  const pinkish = (k = 1) => new THREE.Color().setHSL(0.01 + rng() * 0.03, 0.16 + rng() * 0.08, (0.085 + rng() * 0.04) * k); // linear lightness

  // tors: stacked pillows in layers, each layer a little smaller and set back, the joints between them open
  const pillowGeo = stoneGeo(ctx.makeRng(6110), noise, 2, { sx: 1.0, sy: 0.72, sz: 0.85, round: 0.55, flatBase: true, seed: 2 });
  const pillows = [];
  for (const [tx, tz, H] of TORS) {
    // two to four stacks side by side along a joint, the tallest H, the others lower; each stack pillows of
    // granite, wider than they are tall, laid one on another with the joints open between them
    const yaw0 = rng() * 6.28, n = 2 + (rng() * 2.5 | 0), ca = Math.cos(yaw0), sa = Math.sin(yaw0);
    for (let c = 0; c < n; c++) {
      const off = (c - (n - 1) / 2) * (3.4 + rng() * 1.0), cx = tx + ca * off + (rng() - 0.5) * 1.5, cz = tz - sa * off + (rng() - 0.5) * 1.5;
      const Hc = c === Math.floor(n / 2) ? H : H * (0.45 + rng() * 0.35);
      const base = G.heightAt(cx, cz);
      let y = base - 0.6, wdt = 4.4 + rng() * 1.6;
      while (y < base + Hc - 0.8) {
        const th = 1.5 + rng() * 0.9;
        pillows.push({ x: cx + (rng() - 0.5) * 0.7, y: y + th * 0.42, z: cz + (rng() - 0.5) * 0.7, sx: wdt * (0.5 + rng() * 0.12), sy: th, sz: wdt * (0.45 + rng() * 0.12), ry: yaw0 + (rng() - 0.5) * 0.35, rx: (rng() - 0.5) * 0.1, rz: (rng() - 0.5) * 0.1, c: pinkish() });
        y += th * 0.93; wdt *= 0.88 + rng() * 0.08;
      }
      ctx.addCollider({ x: cx, z: cz, r: 2.2 });
    }
  }
  const torMesh = instanced(pillowGeo, granite, pillows, { name: 'highling-tors', shadow: true, colors: true });
  scene.add(torMesh); meshes.push(torMesh);

  // clitter: the blocks fallen round each tor's foot, and the granite showing along the scarp
  const clitGeo = stoneGeo(ctx.makeRng(6111), noise, 1, { sx: 1.2, sy: 0.6, sz: 0.9, round: 0.2, seed: 4 });
  const clitter = [];
  for (const [tx, tz, H] of TORS) for (let i = 0; i < (low ? 28 : 46); i++) {
    const a = rng() * 6.283, r = 3 + Math.pow(rng(), 0.8) * (8 + H), x = tx + Math.cos(a) * r, z = tz + Math.sin(a) * r;
    if (!inRegion(x, z, 0.5)) continue;
    const s = (0.25 + Math.pow(rng(), 2) * 1.0) * (1 - r / (24 + H) * 0.5);
    if (onRoad(x, z, s * 0.8)) continue;
    clitter.push({ x, y: G.heightAt(x, z) + s * 0.1, z, s, sx: s * (1 + rng() * 0.5), sy: s * (0.7 + rng() * 0.4), sz: s, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.6, rz: (rng() - 0.5) * 0.6, c: pinkish(0.9) });
    if (s > 0.8 && !stairClear(x, z, s) && !stairSight(x, z)) ctx.addCollider({ x, z, r: s * 0.8 });
  }
  for (let z = -104; z < 10; z += 1.6) { // the scarp's lip: granite breaking through the turf where it is steep
    if (scarpWidth(z) > 6.5 || rng() < 0.35) continue;
    const x = edgeX(z) + 0.6 + rng() * 2.2, s = 0.4 + rng() * 0.8;
    clitter.push({ x, y: G.heightAt(x, z) - s * 0.25, z, s, sx: s * 1.4, sy: s * 0.8, sz: s, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.5, rz: (rng() - 0.5) * 0.5, c: pinkish(0.85) });
  }
  for (let i = clitter.length - 1; i >= 0; i--) if (stairClear(clitter[i].x, clitter[i].z, clitter[i].s) || stairSight(clitter[i].x, clitter[i].z)) clitter.splice(i, 1);
  const clitMesh = instanced(clitGeo, granite, clitter, { name: 'highling-clitter', colors: true });
  scene.add(clitMesh); meshes.push(clitMesh);

  // gorse: spiny dark mounds, flowering; the bloom's yellow goes to ember in the red light
  const gorseGeo = (() => {
    // five spiny lumps in a mound, smooth-shaded; the bloom is a speckle in the shader, thickest on top
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const g = stoneGeo(ctx.makeRng(6112 + i), noise, 1, { sx: 1, sy: 0.9, sz: 1, round: 0.2, flatBase: true, seed: 6 + i });
      const a = (i / 5) * 6.283, r = i === 0 ? 0 : 0.42, sc = i === 0 ? 0.75 : 0.5;
      g.scale(sc, sc * 1.1, sc); g.translate(Math.cos(a) * r, (i === 0 ? 0.55 : 0.35), Math.sin(a) * r);
      parts.push(g.index ? g.toNonIndexed() : g);
    }
    let n = 0; for (const p of parts) n += p.attributes.position.count;
    const P = new Float32Array(n * 3); let o = 0; for (const p of parts) { P.set(p.attributes.position.array, o * 3); o += p.attributes.position.count; }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.computeVertexNormals();
    m.computeBoundingBox();
    return m;
  })();
  const gorseTop = gorseGeo.boundingBox.max.y;
  const gorseMat = new THREE.MeshStandardMaterial({ color: '#16220f', roughness: 0.9 });
  gorseMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGL;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGL = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vGL;
      float gHash(vec3 p) { p = fract(p * vec3(443.9, 441.4, 437.2)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 0.7 + 0.6 * gHash(floor(vGL * 30.0));
        float bl = step(0.93 - 0.12 * smoothstep(0.4, 1.1, vGL.y), gHash(floor(vGL * 55.0) + 5.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.6, 0.04) * (0.7 + 0.3 * gHash(floor(vGL * 50.0))), bl);`);
  };
  const gorse = [];
  const prospect = SITES.prospect;
  for (let k = 0; k < 6000 && gorse.length < (low ? 110 : 170); k++) {
    const x = 228 + rng() * 66, z = -106 + rng() * 118;
    if (!inRegion(x, z, 0.8) || x - edgeX(z) < 5) continue;
    if (hyp(x - prospect.x, z - prospect.z) < 8) continue;
    if (TORS.some(([tx, tz, H]) => hyp(x - tx, z - tz) < 5 + H * 0.4)) continue;
    const clump = SN.fbm2(x * 0.045 + 13, z * 0.045 - 2, 3) * 0.5 + 0.5;
    if (rng() > smoothstep(0.42, 0.65, clump) + 0.05) continue;
    if (gorse.some((g) => hyp(g.x - x, g.z - z) < g.s * 1.7)) continue;
    const s = 0.55 + rng() * 0.6;
    if (onRoad(x, z, s * 0.8)) continue;
    gorse.push({ x, y: G.heightAt(x, z) - 0.05, z, s, sx: s * (1 + rng() * 0.4), sy: s * (0.9 + rng() * 0.6), sz: s * (1 + rng() * 0.3), ry: rng() * 6.28 });
  }
  for (let i = gorse.length - 1; i >= 0; i--) if (stairClear(gorse[i].x, gorse[i].z, gorse[i].s) || stairSight(gorse[i].x, gorse[i].z)) gorse.splice(i, 1);
  const gorseMesh = instanced(gorseGeo, gorseMat, gorse, { name: 'highling-gorse' });
  scene.add(gorseMesh); meshes.push(gorseMesh);
  for (const g of gorse) if (g.s > 0.85) ctx.addCollider({ x: g.x, z: g.z, r: g.s * 0.8, y: g.y - 0.5, h: g.sy * 1.2 + 0.5, stand: false }); // v8-10: gorse is not stood on
  // the top sprig of each bush: where a stonechat sits
  const tops = gorse.map((g) => ({ x: g.x, z: g.z, y: g.y + g.sy * gorseTop * 0.97, used: false }));

  const motes = airMotes(ctx, KEY, { count: 260, color: '#f4c860', size: 0.03, drift: [0.25, 0.1, -0.05], sway: 0.7, opacity: 0.5, low: 0.4, high: 5 });
  meshes.push(motes);

  // the stonechats --------------------------------------------------------
  const sm = new Mesher();
  sm.blob(0, 0.05, 0, 0.035, 0.038, 0.06, 7, 5, 0);       // body
  sm.blob(0, 0.095, 0.045, 0.026, 0.026, 0.028, 6, 4, 0); // head
  sm.blob(0, 0.06, -0.075, 0.012, 0.008, 0.04, 4, 3, 0);  // tail
  for (const sx of [-1, 1]) {
    const L = [[sx * 0.025, 0.07, 0.03], [sx * 0.07, 0.072, 0.0], [sx * 0.11, 0.07, -0.03]];
    const T = [[sx * 0.025, 0.065, -0.04], [sx * 0.07, 0.066, -0.05], [sx * 0.1, 0.066, -0.06]];
    sm.strip(L, T, 2, 0.003, (x) => Math.min(1, Math.abs(x) / 0.1), sx < 0);
  }
  const sGeo = sm.geometry();
  { // black head, white half-collar, chestnut-orange breast, brown back and wings
    const p = sGeo.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      let col = [0.2, 0.14, 0.09];
      if (z > 0.025 && y > 0.075) col = [0.03, 0.03, 0.03];
      else if (z > 0.02 && y > 0.06 && Math.abs(x) > 0.018) col = [0.85, 0.85, 0.82];
      else if (y < 0.06 && z > -0.02) col = [0.62, 0.25, 0.08];
      c[i * 3] = col[0]; c[i * 3 + 1] = col[1]; c[i * 3 + 2] = col[2];
    }
    sGeo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  const NB = low ? 7 : 11;
  const { mesh: sMesh, flap, fold } = flapInstanced(sGeo, flapMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.75 }), NB);
  sMesh.name = 'highling-stonechats'; sMesh.castShadow = false;
  scene.add(sMesh); meshes.push(sMesh);
  // perches nearest (255, -50) first
  const order = tops.map((t, i) => i).sort((a, b) => hyp(tops[a].x - 255, tops[a].z + 50) - hyp(tops[b].x - 255, tops[b].z + 50));
  const birds = [];
  for (let i = 0; i < NB && i < order.length; i++) {
    const t = tops[order[i * 2] ?? order[i]]; if (!t || t.used) continue; t.used = true;
    birds.push({ perch: t, x: t.x, y: t.y, z: t.z, yaw: rng() * 6.28, state: 'perch', bob: rng() * 3, call: 2 + rng() * 6, t: 0, dur: 1, fx: 0, fy: 0, fz: 0, flap: 0, tail: 0 });
  }
  sMesh.count = birds.length;
  const M4 = new THREE.Matrix4(), it = { x: 0, y: 0, z: 0, s: 1.8, ry: 0, rx: 0 };
  const cam = ctx.camera.position;
  function pose(i, b) {
    it.x = b.x; it.y = b.y; it.z = b.z; it.ry = b.yaw; it.rx = b.state === 'fly' ? 0 : -b.tail * 0.25; it.s = 1.8;
    sMesh.setMatrixAt(i, compose(it, M4));
    flap.array[i] = b.flap; fold.array[i] = b.state === 'fly' ? 0 : 1;
  }
  birds.forEach((b, i) => pose(i, b));
  ctx.registerUpdate((dt, t) => {
    const px = cam.x, pz = cam.z;
    let nearest = -1, nd = Infinity;
    for (let i = 0; i < birds.length; i++) { const d = hyp(birds[i].x - px, birds[i].z - pz); if (d < nd) { nd = d; nearest = i; } }
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      if (b.state === 'perch') {
        // bob and flick the tail now and then; turn on the sprig
        b.bob -= dt;
        if (b.bob <= 0) { b.bob = 1.2 + rng() * 2.5; b.tail = 1; if (rng() < 0.3) b.yaw += (rng() - 0.5) * 1.5; }
        b.tail = Math.max(0, b.tail - dt * 5);
        // the nearest bird calls while you are about
        b.call -= dt;
        if (i === nearest && nd < 35 && b.call <= 0) { b.call = 3 + rng() * 6; b.tail = 1; ctx.audio?.cue?.('stonechat', { x: b.x, y: b.y, z: b.z }); }
        // too close: it flits low to another bush 12-30 m on
        if (hyp(px - b.x, pz - b.z) < 7) {
          let best = null, bs = -Infinity;
          for (const tp of tops) {
            if (tp.used) continue;
            const d = hyp(tp.x - b.x, tp.z - b.z); if (d < 12 || d > 32) continue;
            const away = ((tp.x - b.x) * (b.x - px) + (tp.z - b.z) * (b.z - pz)) / (d * (hyp(b.x - px, b.z - pz) || 1));
            const sc = away + rng() * 0.4; if (sc > bs) { bs = sc; best = tp; }
          }
          if (best) {
            b.perch.used = false; best.used = true; b.perch = best;
            b.fx = b.x; b.fy = b.y; b.fz = b.z; b.t = 0; b.dur = hyp(best.x - b.x, best.z - b.z) / 7; b.state = 'fly';
            ctx.audio?.cue?.('stonechat', { x: b.x, y: b.y, z: b.z });
          }
        }
        b.flap = 0;
      } else {
        b.t += dt;
        const u = Math.min(1, b.t / b.dur), P = b.perch;
        const nx = lerp(b.fx, P.x, u), nz = lerp(b.fz, P.z, u);
        b.yaw = Math.atan2(nx - b.x, nz - b.z) || b.yaw;
        b.x = nx; b.z = nz;
        // a dipping flight: low over the heather in bounds
        b.y = lerp(b.fy, P.y, u) + Math.sin(u * Math.PI) * 0.8 - Math.abs(Math.sin(u * Math.PI * 3)) * 0.3;
        b.flap = Math.sin(t * 50 + i) * 0.9 * (Math.sin(u * Math.PI * 3) > 0 ? 1 : 0.2);
        if (u >= 1) { b.state = 'perch'; b.x = P.x; b.y = P.y; b.z = P.z; b.flap = 0; b.bob = 0.5; }
      }
      pose(i, b);
    }
    sMesh.instanceMatrix.needsUpdate = true; flap.needsUpdate = true; fold.needsUpdate = true;
  }, { pos: { x: 255, z: -50 }, near: 90, hz: 0 });

  regions.stats[KEY] = () => ({ ...meshStats(meshes), creature: birds.length, at: birds.map((b) => [Math.round(b.x), Math.round(b.z)]), tors: TORS.length, pillows: pillows.length, clitter: clitter.length, gorse: gorse.length });
  ctx.log(`region-high-ling: ${TORS.length} tors (${pillows.length} pillows), ${clitter.length} clitter, ${gorse.length} gorse, ${birds.length} stonechats`);
}
