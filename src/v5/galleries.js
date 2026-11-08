// AL The Galleries of Durance [Proposed] (IDEAS-v4.md AL; wilderness-v4.md: "make the whole thing active: no figures
// seen, but machinery turns, chains move up and down, gantries shift, animation with no visible animating force"; site in
// wilderness-v4-placement.md section 5, key `galleries`, (-390, -80), 60-260 m up, r 70, the west wall).
// North of the sun's saddle the west wall's face carries eleven tiers of galleries between 68 and 245 m up (bearings
// 268-296, densest 271.5-292.5, thinning into fragments beyond) and four catwalks, each a run of
// one repeated bay (a deck, a post, a lintel, a roof beam into the rock, a lattice screen in some bays) laid along the
// face's most protruding line, so where the face falls back into a cleft the gallery runs straight across it as a bridge
// on a truss. Some runs stop mid-work: posts with no lintel, a deck with nothing on it, a beam ending in the air.
// Three booms stand out from the face (the longest 80 m, at the top, with a derrick mast and stays) and two gantry
// towers stand proud of it to above the crest, each with a jib; chains of 2.5 m links hang from them, the longest 252 m,
// five to within 4 m of the talus outside the walk limit. An inclined lift runs up the face from the lowest tier to the
// highest, two rails and their rungs.
//
// What moves, all on the GPU from one time uniform (uT) and two travel vectors, so nothing per link or per strut is
// touched on the CPU: the chains are wound in and paid out (each a slow cycle with dwells; links scroll into the anchor
// and the end shackle rises and falls), and every long one swings as a pendulum of its own length (periods of 12-32 s),
// one more than the rest; a trolley travels along the top boom with its chain; a carriage climbs and descends the lift;
// a great wheel set flat in the face ticks round a tooth at a time; a lesser one turns steadily; the drums and sheaves
// the chains run over turn by exactly the chain they wind. Nothing is seen working them.
// Light: lamps hung from the lintels (32 at high) and two furnace mouths in the rock behind the galleries (emissive, with a soft
// halo for the bloom), brighter while the sun gutters; one real point light at the lower furnace, lighting the rock
// round it for a walker at the wall's foot (lights.js slots it only within about 105 m).
// Seen from the bowl the sun is behind the wall, so every face toward the walker is in shade: dark bronze, and the
// fog's haze is held back by 25%, so the lattice stays darker than the hazed wall it hangs on without reading nearer than it.
//
// Draws: struts (one instanced box), chain links (one instanced link), wheels (one merged mesh), halos (one points
// draw), stays (one line draw). No shadows: the wall they hang on casts none, and a lattice's shadow on its own face is
// lost in the shade the sun leaves there. No colliders: nothing reaches walkable
// ground. ?galleries=0 leaves the whole thing out. ctx.galleries = { stats(), offset } (offset: seconds added to the
// machinery's clock, for before/after renders).
import * as THREE from 'three';
import { clamp, lerp } from '../noise.js';
import { SITES } from '../world.js';

const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('galleries') === '0';
const D2R = Math.PI / 180;
export const GALLERIES = {
  link: 2.5,      // a chain link's length (m): the measure, 28 links to the lens mount's 70 m shaft
  bay: 8,         // a gallery bay's width along the face (m)
  floorGap: 4,    // a chain's end stops this far above the ground under it
  hold: 0.25,     // how much of the fog's haze the ironwork holds back
};

// ---------------------------------------------------------------- shared GLSL: the machinery's clock
const CLOCK_GLSL = /* glsl */`
  uniform float uT;
  uniform vec4 uRail[2];      // a travelling part's travel vector (m) and its cycle (s)
  uniform vec2 uRailPh;
  // out, dwell, back, dwell
  float gTravel(float u) { return smoothstep(0.02, 0.42, u) - smoothstep(0.52, 0.92, u); }
  vec3 gOff(float g) {
    if (g < 0.5) return vec3(0.0);
    int i = g < 1.5 ? 0 : 1;
    vec4 r = uRail[i];
    return r.xyz * gTravel(fract(uT / r.w + (i == 0 ? uRailPh.x : uRailPh.y)));
  }
  // metres of chain wound in: amp, cycle (s), phase
  float gWind(vec3 p) { return p.x * gTravel(fract(uT / p.y + p.z)); }
`;

function hold(shader, U) {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uHold;')
    .replace('#include <fog_fragment>', 'vec3 gPre = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, gPre, uHold);');
  shader.uniforms.uHold = U.uHold;
}

// ---------------------------------------------------------------- materials
function ironMaterial(U, kind) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color('#1c1510'), roughness: 0.6, metalness: 0.6 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uT: U.uT, uRail: U.uRail, uRailPh: U.uRailPh, uLamp: U.uLamp });
    let vs = shader.vertexShader, fs = shader.fragmentShader;
    if (kind === 'strut') {
      vs = vs.replace('#include <common>', `#include <common>
        ${CLOCK_GLSL}
        attribute vec3 iA, iB, iU;
        attribute vec4 iS;   // width, height, travelling group, lamp (0 none; 1+seed a lamp; 2+seed a furnace)
        varying float vEmis;`)
        .replace('#include <beginnormal_vertex>', `
        vec3 sA = iA + gOff(iS.z), sB = iB + gOff(iS.z);
        vec3 sAx = sB - sA; float sLen = max(length(sAx), 1e-3); vec3 sZ = sAx / sLen;
        vec3 sX = normalize(cross(iU, sZ)); vec3 sY = cross(sZ, sX);
        vec3 objectNormal = sX * normal.x + sY * normal.y + sZ * normal.z;
        vEmis = iS.w;`)
        .replace('#include <begin_vertex>', 'vec3 transformed = sA + sZ * (position.z + 0.5) * sLen + sX * position.x * iS.x + sY * position.y * iS.y;');
      fs = fs.replace('#include <common>', `#include <common>
        uniform float uT, uLamp;
        varying float vEmis;`)
        .replace('#include <emissivemap_fragment>', `
        if (vEmis > 0.5) {
          float kind = floor(vEmis), seed = fract(vEmis);
          float breathe = 0.82 + 0.18 * sin(uT * (0.35 + seed * 0.4) + seed * 40.0);
          totalEmissiveRadiance += (kind > 1.5 ? vec3(2.6, 0.95, 0.28) : vec3(2.2, 1.35, 0.55)) * breathe * uLamp;
        }`);
    } else if (kind === 'link') {
      vs = vs.replace('#include <common>', `#include <common>
        ${CLOCK_GLSL}
        attribute vec4 cA;   // anchor (m), travelling group
        attribute vec4 cB;   // the far anchor for a draped chain; w: 0 hanging, 1 draped
        attribute vec4 cW;   // hanging: wind amp, cycle, phase, sway (rad); draped: sag, cycle, phase, sag swing
        attribute vec4 cL;   // link index, links, link length, seed`)
        .replace('#include <beginnormal_vertex>', `
        vec3 lA = cA.xyz + gOff(cA.w);
        float li = cL.x, lN = cL.y, lL = cL.z, sc = 1.0;
        vec3 lP, lD;
        if (cB.w < 0.5) {
          float w = gWind(cW.xyz);
          float s = (li + 0.5) * lL - w, hang = lN * lL - w;
          // a pendulum of its own length: two slow modes and a little bow
          float om = sqrt(9.8 / max(hang, 8.0));
          float t1 = cW.w * sin(uT * om + cL.w * 6.283), t2 = cW.w * 0.55 * sin(uT * om * 1.31 + cL.w * 17.0);
          float u = s / max(hang, 1.0), bow = 0.22 * hang;
          vec2 off = vec2(t1, t2) * s + vec2(t2, -t1) * bow * sin(3.14159 * u);
          vec2 slope = vec2(t1, t2) + vec2(t2, -t1) * bow * 3.14159 / max(hang, 1.0) * cos(3.14159 * u);
          lP = lA + vec3(off.x, -s, off.y);
          lD = normalize(vec3(-slope.x, 1.0, -slope.y));
          if (s < -0.3 * lL) sc = 0.0;          // wound in at the anchor
          if (li > lN - 1.5) sc = 2.3;          // the end shackle
        } else {
          float sag = cW.x + cW.w * sin(6.283 * uT / cW.y + cW.z * 6.283);
          float u = (li + 0.5) / lN;
          vec3 ab = cB.xyz - lA;
          lP = lA + ab * u - vec3(0.0, 4.0 * sag * u * (1.0 - u), 0.0);
          lD = normalize(ab - vec3(0.0, 4.0 * sag * (1.0 - 2.0 * u), 0.0));
        }
        float ang = cL.w * 6.283 + mod(li, 2.0) * 1.5708;
        vec3 lR = abs(lD.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(cos(ang), 0.0, sin(ang));
        vec3 lX = normalize(cross(lD, lR));
        if (abs(lD.y) < 0.95 && mod(li, 2.0) > 0.5) lX = normalize(cross(lD, lX));
        vec3 lZ = cross(lX, lD);
        vec3 objectNormal = lX * normal.x + lD * normal.y + lZ * normal.z;`)
        .replace('#include <begin_vertex>', 'vec3 transformed = lP + (lX * position.x + lD * position.y + lZ * position.z) * lL * sc;');
    } else if (kind === 'wheel') {
      vs = vs.replace('#include <common>', `#include <common>
        ${CLOCK_GLSL}
        attribute vec3 aC, aAx;
        attribute vec4 aW;   // mode (0 steady, 1 ticking, 2 a chain's drum), then its numbers
        attribute vec4 aW2;  // a drum's chain: wind amp, cycle, phase; radius
        vec3 gRot(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }`)
        .replace('#include <beginnormal_vertex>', `
        float wa;
        if (aW.x < 0.5) wa = aW.y * uT + aW.z;
        else if (aW.x < 1.5) { float q = uT / aW.z; wa = aW.y * (floor(q) + smoothstep(0.0, 0.12, fract(q))) + aW.w; }
        else wa = gWind(aW2.xyz) / aW2.w;
        vec3 objectNormal = gRot(normal, aAx, wa);`)
        .replace('#include <begin_vertex>', 'vec3 transformed = aC + gRot(position - aC, aAx, wa);');
    }
    shader.vertexShader = vs; shader.fragmentShader = fs;
    hold(shader, U);
  };
  m.customProgramCacheKey = () => `galleries-${kind}`;
  return m;
}

// ---------------------------------------------------------------- the link: a stadium ring, long axis y, in link lengths
function linkGeometry(low) {
  const nP = low ? 6 : 8, nT = low ? 3 : 4;
  const L = 1, W = 0.6, T = 0.17; // outer length, outer width, wire thickness (link lengths)
  const rr = (W - T) / 2, straight = L - W; // the centreline's end radius and straight run
  // the centreline: two half-circles joined by straights, sampled at nP points
  const path = [];
  for (let i = 0; i < nP; i++) {
    const a = (i / nP) * Math.PI * 2;
    const cy = (Math.sin(a) >= 0 ? 1 : -1) * straight / 2;
    path.push([Math.cos(a) * rr, Math.sin(a) * rr + cy, Math.cos(a), Math.sin(a)]);
  }
  const pos = [], nor = [], idx = [];
  for (let i = 0; i < nP; i++) {
    const [px, py, nx, ny] = path[i];
    for (let j = 0; j < nT; j++) {
      const b = (j / nT) * Math.PI * 2 + Math.PI / nT;
      const c = Math.cos(b), s = Math.sin(b);
      pos.push(px + nx * c * T / 2, py + ny * c * T / 2, s * T / 2);
      nor.push(nx * c, ny * c, s);
    }
  }
  for (let i = 0; i < nP; i++) for (let j = 0; j < nT; j++) {
    const a = i * nT + j, b = ((i + 1) % nP) * nT + j, c = ((i + 1) % nP) * nT + (j + 1) % nT, d = i * nT + (j + 1) % nT;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------- geometry helpers
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.sqrt(dot(a, a));
const norm = (a) => mul(a, 1 / Math.max(1e-9, len(a)));
const mix = (a, b, t) => add(a, mul(sub(b, a), t));
// the closest distance between segments p1-q1 and p2-q2
function segDist(p1, q1, p2, q2) {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s, t;
  if (a < 1e-9 && e < 1e-9) return len(r);
  if (a < 1e-9) { s = 0; t = clamp(f / e, 0, 1); }
  else {
    const c = dot(d1, r);
    if (e < 1e-9) { t = 0; s = clamp(-c / a, 0, 1); }
    else {
      const b = dot(d1, d2), den = a * e - b * b;
      s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  return len(sub(add(p1, mul(d1, s)), add(p2, mul(d2, t))));
}

export async function build(ctx) {
  if (OFF) { ctx.galleries = { stats: () => ({ calls: 0, tris: 0 }), offset: 0, off: true }; return; }
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(8121);
  const site = SITES.galleries;
  const azOf = (b) => (b - 90) * D2R;
  const P = (b, r, y) => { const a = azOf(b); return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  const inward = (b) => { const a = azOf(b); return [-Math.cos(a), 0, -Math.sin(a)]; };
  const along = (b) => { const a = azOf(b); return [-Math.sin(a), 0, Math.cos(a)]; };
  const UP = [0, 1, 0];

  // the face: the first radius on a bearing where the ground reaches y (cached; bisected to 0.25 m)
  const faceCache = new Map();
  function faceR(b, y) {
    const key = `${b.toFixed(3)}:${y.toFixed(1)}`;
    const c = faceCache.get(key); if (c !== undefined) return c;
    const a = azOf(b), cx = Math.cos(a), cz = Math.sin(a);
    let r0 = 330, out = 520;
    for (let r = 330; r <= 520; r += 3) {
      if (terrain.heightAt(cx * r, cz * r) >= y) {
        let lo = r - 3, hi = r;
        for (let k = 0; k < 4; k++) { const m = (lo + hi) / 2; if (terrain.heightAt(cx * m, cz * m) >= y) hi = m; else lo = m; }
        out = hi; break;
      }
      r0 = r;
    }
    faceCache.set(key, out);
    return out;
  }
  const groundAt = (p) => terrain.heightAt(p[0], p[2]);

  // ---- collectors
  const struts = []; // [A, B, up, w, h, group, lamp]
  const strut = (A, B, w, h, up = UP, g = 0, lamp = 0) => { if (len(sub(B, A)) > 0.05) struts.push([A, B, up, w, h, g, lamp]); };
  const chains = []; // { A, B?, n, wind:[amp,cycle,phase], sway, group, mode, sag... }
  const wheelBoxes = []; // [A, B, up, w, h, centre, axis, W, W2]
  const halos = [];  // [x, y, z, size, seed]
  const stays = [];  // line segments
  const keep = [];   // keep-outs for the galleries' bays: { a, b, r, y? }
  let lightAt = null;

  // ---- the booms: girders standing out of the face, a derrick mast at the top one's root
  const booms = [
    { b: 283.0, y: 236, tipR: 376, mast: 26, trolley: true },
    { b: 276.3, y: 142, tipR: 384, mast: 0 },
    { b: 289.6, y: 208, tipR: 0, reach: 32, mast: 0 },
  ];
  for (const bm of booms) {
    const rootR = faceR(bm.b, bm.y + 3) + 1.5;
    const tipR = bm.tipR || rootR - bm.reach;
    bm.rootR = rootR; bm.tipR = tipR;
    const io = inward(bm.b), al = along(bm.b);
    const root = P(bm.b, rootR, bm.y), tip = P(bm.b, tipR, bm.y);
    bm.root = root; bm.tip = tip;
    const L = rootR - tipR, half = 2.2, deep = 3.6;
    // a triangular girder: two bottom chords, one top chord, a panel every 5 m
    const nP = Math.max(2, Math.round(L / 5));
    const at = (u, side, top) => add(add(mix(root, tip, u), mul(al, side * half * (1 - 0.35 * u))), [0, top ? deep * (1 - 0.4 * u) : 0, 0]);
    strut(at(0, -1, 0), at(1, -1, 0), 0.9, 0.9, al);
    strut(at(0, 1, 0), at(1, 1, 0), 0.9, 0.9, al);
    strut(at(0, 0, 1), at(1, 0, 1), 0.8, 0.8, al);
    for (let k = 0; k <= nP; k++) {
      const u = k / nP;
      strut(at(u, -1, 0), at(u, 1, 0), 0.45, 0.45, UP);
      strut(at(u, -1, 0), at(u, 0, 1), 0.4, 0.4, io);
      strut(at(u, 1, 0), at(u, 0, 1), 0.4, 0.4, io);
      if (k < nP) {
        const u1 = (k + 1) / nP;
        strut(at(u, k % 2 ? -1 : 1, 0), at(u1, k % 2 ? 1 : -1, 0), 0.3, 0.3, UP);
        strut(at(u, -1, 0), at(u1, 0, 1), 0.3, 0.3, io);
        strut(at(u, 1, 0), at(u1, 0, 1), 0.3, 0.3, io);
      }
    }
    keep.push({ a: root, b: tip, r: 6 });
    // stays to the rock above, or to the derrick's mast
    if (bm.mast) {
      const mb = P(bm.b, rootR - 3, bm.y + deep), mt = P(bm.b, rootR - 3, bm.y + bm.mast);
      strut(mb, mt, 1.3, 1.3, io);
      strut(add(mb, mul(al, -3)), mt, 0.6, 0.6, io);
      strut(add(mb, mul(al, 3)), mt, 0.6, 0.6, io);
      for (const u of [0.35, 0.65, 1]) stays.push(mt, at(u, 0, 1));
      const back = P(bm.b, faceR(bm.b, bm.y + bm.mast + 4) + 1, bm.y + bm.mast + 4);
      stays.push(mt, back, mt, add(back, mul(al, 8)), mt, add(back, mul(al, -8)));
      keep.push({ a: mb, b: mt, r: 5 });
      bm.mastTop = mt;
    } else {
      const yb = Math.min(bm.y + 34, 258);
      const back = P(bm.b, faceR(bm.b, yb) + 1, yb);
      for (const u of [0.5, 1]) stays.push(add(back, mul(al, 3)), at(u, 0, 1), add(back, mul(al, -3)), at(u, 0, 1));
    }
    // the sheave at the tip: the tip's chain runs over it
    bm.sheave = add(tip, mul(io, -0.5));
  }

  // ---- chains. Hanging ones: an anchor, a length to a few metres above the ground under it (or shorter, ending in the
  // air), a wind cycle, a sway. Each is a keep-out for the galleries below it.
  const L = GALLERIES.link;
  function hangLen(anchor, travel) {
    let g = groundAt(anchor);
    if (travel) for (let k = 1; k <= 4; k++) g = Math.max(g, groundAt(add(anchor, mul(travel, k / 4))));
    return anchor[1] - g - GALLERIES.floorGap;
  }
  function hang(anchor, o = {}) {
    const full = hangLen(anchor, o.travel);
    const want = o.len ? Math.min(o.len, full) : full;
    const n = Math.max(4, Math.floor(want / L));
    const c = { mode: 0, A: anchor, n, group: o.group || 0, wind: o.wind || [0, 100, 0], sway: o.sway ?? 0.004, seed: rng(), drum: o.drum };
    chains.push(c);
    const bottom = add(anchor, [0, -n * L, 0]);
    keep.push({ a: anchor, b: bottom, r: 3.5 });
    if (o.travel) keep.push({ a: add(anchor, o.travel), b: add(bottom, o.travel), r: 3.5 }, { a: add(anchor, mul(o.travel, 0.5)), b: add(bottom, mul(o.travel, 0.5)), r: 3.5 });
    return c;
  }
  const [bA, bB, bC] = booms;
  // the top boom: the tip's chain to the talus, the trolley's chain travelling with it, a short one at mid-boom
  hang(add(bA.sheave, [0, -1.6, 0]), { wind: [14, 120, 0.1], sway: 0.0035, drum: { at: bA.sheave, r: 1.6, b: bA.b } });
  const trolleyTravel = mul(inward(bA.b), -22); // toward the wall, 22 m
  const trolleyAt = add(P(bA.b, bA.tipR + 5, bA.y - 1.2), [0, 0, 0]);
  const trolleyChain = hang(add(trolleyAt, [0, -2.6, 0]), { group: 1, travel: trolleyTravel, wind: [26, 150, 0.55], sway: 0.003 });
  hang(add(P(bA.b, bA.tipR + 40, bA.y - 0.6), mul(along(bA.b), 1.6)), { len: 62, wind: [18, 95, 0.3], sway: 0.006 });
  // the middle boom: one to the floor, swaying very slowly, a little more than the rest
  hang(add(bB.sheave, [0, -1.6, 0]), { wind: [10, 135, 0.8], sway: 0.011, drum: { at: bB.sheave, r: 1.6, b: bB.b } });
  hang(add(P(bB.b, bB.tipR + 14, bB.y - 0.6), mul(along(bB.b), -1.6)), { len: 36, wind: [12, 105, 0.15], sway: 0.007 });
  // the short boom: two ending in the air
  hang(add(bC.sheave, [0, -1.6, 0]), { len: 96, wind: [20, 115, 0.4], sway: 0.006, drum: { at: bC.sheave, r: 1.6, b: bC.b } });
  hang(add(P(bC.b, bC.tipR + 12, bC.y - 0.6), mul(along(bC.b), 1.6)), { len: 54, wind: [16, 100, 0.7], sway: 0.008 });
  // draped: one across from the top boom's tip to the short boom's, swinging its sag slowly
  {
    const A = bA.tip, B = bC.tip, d = len(sub(B, A)), sag = 16;
    const n = Math.round((d + 8 * sag * sag / (3 * d)) / L);
    chains.push({ mode: 1, A, B, n, group: 0, sag, cycle: 70, phase: rng(), swing: 1.5, seed: rng() });
    keep.push({ a: A, b: add(mix(A, B, 0.5), [0, -sag, 0]), r: 4 }, { a: add(mix(A, B, 0.5), [0, -sag, 0]), b: B, r: 4 });
  }

  // the trolley on the top boom: a frame hung under the chords (travelling group 1)
  {
    const io = inward(bA.b), al = along(bA.b);
    const c = trolleyAt, hw = 2.0, hd = 2.4, top = 1.1, bot = -2.4;
    const corner = (sx, sz, y) => add(add(c, mul(al, sx * hw)), add(mul(io, sz * hd), [0, y, 0]));
    for (const y of [top, bot]) {
      strut(corner(-1, -1, y), corner(1, -1, y), 0.45, 0.45, UP, 1); strut(corner(-1, 1, y), corner(1, 1, y), 0.45, 0.45, UP, 1);
      strut(corner(-1, -1, y), corner(-1, 1, y), 0.45, 0.45, UP, 1); strut(corner(1, -1, y), corner(1, 1, y), 0.45, 0.45, UP, 1);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) strut(corner(sx, sz, bot), corner(sx, sz, top), 0.45, 0.45, io, 1);
    strut(corner(-1, 0, bot), corner(1, 0, bot), 0.9, 0.9, UP, 1); // the block the chain hangs from
  }

  // ---- the gantry towers: square lattice towers standing proud of the face in front of every gallery, from the rock
  // they stand on to above the crest, tied back to the face every 24 m, each with a jib at its head
  for (const tw of [{ b: 290.4, top: 276, jib: 18, wind: [22, 170, 0.35] }, { b: 279.6, top: 262, jib: 12, len: 118, wind: [30, 140, 0.85] }]) {
    const half = 2.4, step = 6;
    const need = (y) => Math.min(faceR(tw.b - 0.6, y), faceR(tw.b, y), faceR(tw.b + 0.6, y)) - 11;
    let r = Infinity; for (let y = 120; y <= Math.min(tw.top, 250); y += 5) r = Math.min(r, need(y));
    let y0 = 30; while (y0 < 200 && faceR(tw.b, y0) < r + half + 1) y0 += 2; // stand on the rock where it meets the tower
    const io = inward(tw.b), al = along(tw.b), base = P(tw.b, r, y0);
    const leg = (sx, sz, y) => add(add(base, mul(al, sx * half)), add(mul(io, sz * half), [0, y - y0, 0]));
    const n = Math.round((tw.top - y0) / step);
    const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sz] of legs) strut(leg(sx, sz, y0 - 2), leg(sx, sz, tw.top), 0.7, 0.7, io);
    for (let k = 0; k <= n; k++) {
      const y = y0 + k * step, y1 = y + step;
      for (let e = 0; e < 4; e++) {
        const [ax, az] = legs[e], [bx, bz] = legs[(e + 1) % 4];
        strut(leg(ax, az, y), leg(bx, bz, y), 0.3, 0.3, UP);
        if (k < n && !low) strut(leg(ax, az, y), leg(bx, bz, Math.min(y1, tw.top)), 0.2, 0.2, UP);
      }
      if (k % 4 === 2) for (const sx of [-1, 1]) strut(leg(sx, -1, y), P(tw.b + sx * 0.2, faceR(tw.b, y) + 0.5, y), 0.45, 0.45, UP);
    }
    // the jib at the head, standing out over the bowl, its stay to a short king post
    const jr = add(leg(0, 1, tw.top), [0, 0, 0]), jt = add(jr, mul(io, tw.jib + half));
    strut(add(jr, mul(io, -half * 2)), jt, 0.8, 1.0, UP);
    const kp = add(leg(0, 0, tw.top), [0, 7, 0]);
    strut(leg(0, 0, tw.top), kp, 0.6, 0.6, io);
    stays.push(kp, jt, kp, add(jr, mul(io, -half * 2)));
    // its chain, over a sheave at the jib's end
    const sh = add(jt, [0, -1.4, 0]);
    hang(add(sh, [0, -1.6, 0]), { len: tw.len, wind: tw.wind, sway: 0.004, drum: { at: sh, r: 1.6, b: tw.b } });
  }

  // ---- the wheels: a great wheel set flat in the face that ticks a tooth at a time, a lesser one turning steadily, the
  // drum at the top boom's root and the sheaves at the tips, which turn by the chain they wind
  function wheel(o) {
    const C = o.C, ax = norm(o.axis);
    const ref = Math.abs(ax[1]) < 0.9 ? UP : [1, 0, 0];
    const e1 = norm(cross(ax, ref)), e2 = cross(ax, e1);
    const pt = (a, r) => add(C, add(mul(e1, Math.cos(a) * r), mul(e2, Math.sin(a) * r)));
    const W = o.W, W2 = o.W2 || [0, 1, 0, 1];
    const box = (A, B, w, h, up) => wheelBoxes.push([A, B, up, w, h, C, ax, W, W2]);
    const nR = o.rimSeg || 24, R = o.R, rw = o.rim || R * 0.09;
    for (let i = 0; i < nR; i++) {
      const a0 = (i / nR) * Math.PI * 2, a1 = ((i + 1) / nR) * Math.PI * 2;
      box(pt(a0, R - rw / 2), pt(a1, R - rw / 2), o.depth, rw * 1.02, ax);
    }
    for (let i = 0; i < o.spokes; i++) {
      const a = (i / o.spokes) * Math.PI * 2;
      box(C, pt(a, R - rw), o.depth * 0.5, rw * 0.55, ax);
    }
    box(add(C, mul(ax, -o.depth * 0.9)), add(C, mul(ax, o.depth * 0.9)), R * 0.22, R * 0.22, e1);
    if (o.teeth) for (let i = 0; i < o.teeth; i++) {
      const a = ((i + 0.5) / o.teeth) * Math.PI * 2;
      box(pt(a, R - 0.1), pt(a, R + rw * 0.9), o.depth * 0.8, rw * 0.7, ax);
    }
    keep.push({ a: add(C, mul(e2, -R)), b: add(C, mul(e2, R)), r: R + 2.5 });
  }
  // the great wheel: 24 m across, flat against the face, a tooth every 7.5°, a tooth's step every 9 s
  {
    const b = 285.6, y = 192, R = 12;
    let r = Infinity; for (let yy = y - R; yy <= y + R; yy += 3) r = Math.min(r, faceR(b - 1.4, yy), faceR(b, yy), faceR(b + 1.4, yy));
    const C = P(b, r - 3, y);
    wheel({ C, axis: inward(b), R, spokes: 8, depth: 1.6, rim: 1.3, teeth: 48, rimSeg: 32, W: [1, 7.5 * D2R, 9, 0] });
    strut(add(C, mul(inward(b), -4)), C, 1.4, 1.4, UP); // its axle into the rock
  }
  // the lesser wheel: 14 m, turning steadily the other way
  {
    const b = 278.7, y = 126, R = 7;
    let r = Infinity; for (let yy = y - R; yy <= y + R; yy += 3) r = Math.min(r, faceR(b - 0.9, yy), faceR(b, yy), faceR(b + 0.9, yy));
    const C = P(b, r - 2.5, y);
    wheel({ C, axis: inward(b), R, spokes: 6, depth: 1.1, rim: 0.8, teeth: low ? 0 : 30, rimSeg: 24, W: [0, -0.045, 0, 0] });
    strut(add(C, mul(inward(b), -3)), C, 1.0, 1.0, UP);
  }
  // the drum at the top boom's root (the trolley's chain), and the sheaves
  {
    const C = add(P(bA.b, bA.rootR - 2.5, bA.y + 7.5), [0, 0, 0]);
    const tc = trolleyChain;
    wheel({ C, axis: along(bA.b), R: 3.4, spokes: 6, depth: 2.2, rim: 0.5, rimSeg: 16, W: [2, 0, 0, 0], W2: [...tc.wind, 3.4] });
    tc.drum = null;
  }
  for (const c of chains) if (c.drum) {
    const d = c.drum;
    wheel({ C: d.at, axis: along(d.b), R: d.r, spokes: 4, depth: 0.6, rim: 0.35, rimSeg: 12, W: [2, 0, 0, 0], W2: [...c.wind, -d.r] });
  }

  let liftTravel = [0, 0, 0];
  // ---- the lift: two rails straight up the face from the lowest tier to the highest, in front of every gallery, rungs
  // every 6 m, braced back to the rock; a carriage climbs and descends it (travelling group 2)
  {
    const b = 273.6, y0 = 66, y1 = 246, gap = 3.2;
    const need = (y) => Math.min(faceR(b - 0.5, y), faceR(b, y), faceR(b + 0.5, y)) - 12;
    let r0 = need(y0), r1 = need(y1), v = 0;
    for (let y = y0; y <= y1; y += 4) v = Math.max(v, lerp(r0, r1, (y - y0) / (y1 - y0)) - need(y));
    r0 -= v; r1 -= v;
    const al = along(b), io = inward(b);
    const rail = (u, s) => add(P(b, lerp(r0, r1, u), lerp(y0, y1, u)), mul(al, s * gap));
    const dir = norm(sub(rail(1, 0), rail(0, 0)));
    for (const s of [-1, 1]) strut(rail(0, s), rail(1, s), 0.8, 0.8, io);
    const runLen = len(sub(rail(1, 0), rail(0, 0)));
    const nR = Math.round(runLen / 6);
    for (let k = 0; k <= nR; k++) {
      const u = k / nR;
      strut(rail(u, -1), rail(u, 1), 0.35, 0.35, io);
      if (k % 3 === 0) for (const s of [-1, 1]) {
        const p = rail(u, s), y = p[1];
        strut(p, add(P(b, faceR(b, y) + 0.5, y), mul(al, s * gap)), 0.4, 0.4, UP);
      }
      if (!low && k < nR && k % 2 === 0) strut(rail(u, -1), rail((k + 1) / nR, 1), 0.22, 0.22, io);
    }
    // the carriage: a cage riding the rails' face, from a fifth of the way up to near three fifths
    const c0 = rail(0.2, 0), up = norm(cross(al, dir));
    const corner = (sx, sz, h) => add(add(c0, mul(al, sx * (gap - 0.4))), add(mul(up, -sz * 3.2 - 0.8), mul(dir, h)));
    for (const h of [0, 6]) {
      strut(corner(-1, 0, h), corner(1, 0, h), 0.4, 0.4, dir, 2); strut(corner(-1, 1, h), corner(1, 1, h), 0.4, 0.4, dir, 2);
      strut(corner(-1, 0, h), corner(-1, 1, h), 0.4, 0.4, dir, 2); strut(corner(1, 0, h), corner(1, 1, h), 0.4, 0.4, dir, 2);
    }
    for (const sx of [-1, 1]) for (const sz of [0, 1]) strut(corner(sx, sz, 0), corner(sx, sz, 6), 0.4, 0.4, al, 2);
    strut(corner(-1, 1, 0), corner(1, 1, 6), 0.25, 0.25, up, 2);
    // a lamp in the cage
    strut(add(corner(0, 0.5, 2.6), [0, -0.4, 0]), add(corner(0, 0.5, 2.6), [0, 0.4, 0]), 0.7, 0.7, al, 2, 1.37);
    liftTravel = mul(dir, runLen * 0.38);
  }

  // ---- the galleries: eleven tiers and four catwalks. Each tier: [y, from bearing, to bearing, depth, height,
  // which end stops mid-work (-1 the first, 1 the last, 0 neither)]
  const tiers = [];
  for (let y = 68, i = 0; y <= 248; y += 16 + rng() * 5, i++) {
    // ragged: each tier starts and stops where it was left, some broken into two runs; one end of every other one
    // stops mid-work
    const b0 = 267.6 + Math.pow(rng(), 1.4) * 11, b1 = 296.2 - Math.pow(rng(), 1.4) * 11;
    const D = 5 + rng() * 2.5, H = 8.5 + rng() * 3.5, stop = i % 2 ? (rng() < 0.5 ? 1 : -1) : 0;
    if (b1 - b0 > 12 && rng() < 0.4) {
      const m = lerp(b0 + 4, b1 - 4, rng()), gap = 1.2 + rng() * 2;
      tiers.push([y, b0, m - gap / 2, D, H, 1], [y, m + gap / 2, b1, D, H, -1]);
    } else tiers.push([y, b0, b1, D, H, stop]);
  }
  // catwalks between the tiers, across the clefts
  for (const [y, b0, b1] of [[124, 283.4, 288.2], [158, 274.4, 279.8], [194, 279.0, 283.0], [229, 284.0, 288.4]]) tiers.push([y, b0, b1, 2.6, 4, 0]);
  const furnaceTiers = new Set([0, 3]);
  const lampP = low ? 0.1 : 0.14;
  tiers.forEach(([y, b0, b1, D, H, stop], ti) => {
    const cat = D < 3;
    const meanR = faceR((b0 + b1) / 2, y);
    const step = (GALLERIES.bay / meanR) / D2R * (cat ? 1.25 : 1);
    const nB = Math.max(2, Math.round((b1 - b0) / step));
    const bs = [], back = [];
    const raw = (b) => Math.min(faceR(b, y - 1.5), faceR(b, y + H * 0.5), faceR(b, y + H));
    for (let k = 0; k <= nB; k++) {
      const b = b0 + ((b1 - b0) * k) / nB;
      bs.push(b);
      let m = Infinity; for (const f of [-0.5, -0.25, 0, 0.25, 0.5]) m = Math.min(m, raw(b + f * step));
      back.push(m);
    }
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k <= nB; k++) {
      const nb = [back[k - 1], back[k + 1]].filter((v) => v !== undefined);
      back[k] = Math.min(back[k], nb.reduce((a, v) => a + v, 0) / nb.length + 1.5);
    }
    const F = (k, yy) => P(bs[k], back[k] - D, yy);
    const K = (k, yy) => P(bs[k], back[k] + 1, yy);
    const io = (k) => inward(bs[k]);
    // which bays are left open for the chains, the wheels, the booms and the lift
    const open = [];
    for (let k = 0; k < nB; k++) {
      let hit = false;
      for (const yy of [y - 1, y + H / 2, y + H]) {
        const a = F(k, yy), b = F(k + 1, yy), a2 = K(k, yy), b2 = K(k + 1, yy);
        if (keep.some((q) => Math.min(segDist(a, b, q.a, q.b), segDist(a2, b2, q.a, q.b), segDist(mix(a, a2, 0.5), mix(b, b2, 0.5), q.a, q.b)) < q.r)) hit = true;
      }
      // beyond the core (bearings 271.5-292.5) the bays thin out into fragments
      const bm = (bs[k] + bs[k + 1]) / 2, edge = Math.max(0, 271.5 - bm, bm - 292.5);
      if (edge > 0 && rng() < edge / 4.5) hit = true;
      open.push(hit);
    }
    // the unfinished end: its last bays carry less and less
    const unfinished = (k) => (stop === 1 ? k - (nB - 3) : stop === -1 ? 2 - k : -1); // 0..2 within the last three bays
    const postAt = new Set();
    for (let k = 0; k < nB; k++) {
      if (open[k]) continue;
      const uf = unfinished(k);
      const bridge = raw((bs[k] + bs[k + 1]) / 2) - (back[k] + back[k + 1]) / 2 > 3.5;
      // the deck (left out of the very last bay of an unfinished end: only the posts stand there)
      if (uf < 2) strut(mix(F(k, y - 0.55), K(k, y - 0.55), 0.5), mix(F(k + 1, y - 0.55), K(k + 1, y - 0.55), 0.5), D + 1, 1.1, UP);
      postAt.add(k); postAt.add(k + 1);
      if (uf < 1) {
        strut(F(k, y + H), F(k + 1, y + H), 1.0, 1.3, UP);                      // the lintel
        if (!low) strut(F(k, y + 1.2), F(k + 1, y + 1.2), 0.22, 0.22, UP);      // the rail
        if (!cat && !low) strut(mix(F(k, y), F(k + 1, y), 0.5), mix(F(k, y + H), F(k + 1, y + H), 0.5), 0.4, 0.4, io(k)); // a mullion
        if (!cat && rng() < 0.45) {                                             // a lattice screen
          strut(F(k, y), F(k + 1, y + H), 0.3, 0.3, io(k)); strut(F(k + 1, y), F(k, y + H), 0.3, 0.3, io(k));
        }
      } else if (uf === 1) {
        // the lintel begun: a stub from the first post
        strut(F(k, y + H), mix(F(k, y + H), F(k + 1, y + H), 0.4), 1.0, 1.3, UP);
      }
      if (bridge && !cat) {
        // across a cleft: a truss under the front and back edges
        const yb = y - 5.5;
        for (const E of [F, (kk, yy) => P(bs[kk], back[kk] + 0.5, yy)]) {
          strut(E(k, yb), E(k + 1, yb), 0.6, 0.6, UP);
          strut(E(k, yb), E(k, y - 1), 0.5, 0.5, io(k)); strut(E(k + 1, yb), E(k + 1, y - 1), 0.5, 0.5, io(k));
          strut(E(k, yb), E(k + 1, y - 1), 0.35, 0.35, io(k)); strut(E(k + 1, yb), E(k, y - 1), 0.35, 0.35, io(k));
        }
      } else if (cat) {
        // a catwalk: hangers from the rock above
        for (const kk of [k, k + 1]) strut(F(kk, y), P(bs[kk], faceR(bs[kk], y + 7) + 0.5, y + 7), 0.25, 0.25, UP);
      }
      // a lamp now and then, hung from the lintel
      if (uf < 1 && rng() < lampP) {
        const p = mix(F(k, y + H - 1.6), F(k + 1, y + H - 1.6), 0.5), seed = rng() * 0.98;
        strut(add(p, [0, -0.45, 0]), add(p, [0, 0.45, 0]), 0.8, 0.8, io(k), 0, 1 + seed);
        strut(add(p, [0, 0.45, 0]), add(p, [0, 1.6, 0]), 0.12, 0.12, io(k));
        halos.push([...p, 7, seed]);
      }
    }
    // a furnace mouth in the rock behind a closed bay near the middle
    if (furnaceTiers.has(ti)) {
      let k = Math.floor(nB * (ti === 0 ? 0.62 : 0.4));
      while (k < nB - 1 && open[k]) k++;
      const b = (bs[k] + bs[k + 1]) / 2, r = raw(b) + 0.3, p0 = P(b, r, y), p1 = P(b, r, y + Math.min(7, H - 2));
      strut(p0, p1, 3.4, 0.8, inward(b), 0, 2 + rng() * 0.98);
      const c = mix(p0, p1, 0.5), out = add(c, mul(inward(b), 1.2));
      halos.push([...out, 18, rng()]);
      if (ti === 0) lightAt = add(c, mul(inward(b), 4));
    }
    // posts at every boundary a bay uses; brackets under them to the rock where it is near
    for (const k of postAt) {
      const uf = unfinished(Math.min(k, nB - 1));
      const h = uf >= 2 ? H * (0.45 + 0.3 * rng()) : H;
      strut(F(k, y - 1.1), F(k, y + h), cat ? 0.4 : 0.9, cat ? 0.4 : 0.9, io(k));
      if (!cat) {
        if (uf < 1 || rng() < 0.5) strut(F(k, y + H), add(P(bs[k], faceR(bs[k], y + H) + 1, y + H + 1.5), [0, 0, 0]), 0.7, 0.9, UP); // a roof beam
        const yb = y - 8, rb = faceR(bs[k], yb);
        if (rb - (back[k] - D) < 14) strut(F(k, y - 1.1), P(bs[k], rb + 0.6, yb), 0.6, 0.6, along(bs[k]));
      }
    }
  });

  // ---- build the struts
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sg = new THREE.InstancedBufferGeometry();
  sg.index = box.index; sg.setAttribute('position', box.attributes.position); sg.setAttribute('normal', box.attributes.normal);
  const nS = struts.length;
  const iA = new Float32Array(nS * 3), iB = new Float32Array(nS * 3), iU = new Float32Array(nS * 3), iS = new Float32Array(nS * 4);
  struts.forEach(([A, B, up, w, h, g, lamp], k) => {
    iA.set(A, k * 3); iB.set(B, k * 3);
    // the cross-section's reference must not run along the strut
    const d = norm(sub(B, A)); let u = up; if (Math.abs(dot(d, norm(u))) > 0.98) u = Math.abs(d[1]) < 0.9 ? UP : [1, 0, 0];
    iU.set(u, k * 3); iS.set([w, h, g, lamp], k * 4);
  });
  sg.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 3));
  sg.setAttribute('iB', new THREE.InstancedBufferAttribute(iB, 3));
  sg.setAttribute('iU', new THREE.InstancedBufferAttribute(iU, 3));
  sg.setAttribute('iS', new THREE.InstancedBufferAttribute(iS, 4));
  sg.instanceCount = nS;
  const centre = P(281.6, 425, 150);
  const bound = new THREE.Sphere(new THREE.Vector3(...centre), 175);
  sg.boundingSphere = bound;

  const U = {
    uT: { value: 0 }, uLamp: { value: 1 }, uHold: { value: GALLERIES.hold },
    uRail: { value: [new THREE.Vector4(...trolleyTravel, 160), new THREE.Vector4(...liftTravel, 180)] },
    uRailPh: { value: new THREE.Vector2(0.15, 0.62) },
  };
  const group = new THREE.Group(); group.name = 'galleries';
  const strutMesh = new THREE.Mesh(sg, ironMaterial(U, 'strut'));
  strutMesh.name = 'galleries-struts';

  // ---- build the chains
  const linkG = linkGeometry(low);
  const cg = new THREE.InstancedBufferGeometry();
  cg.index = linkG.index; cg.setAttribute('position', linkG.attributes.position); cg.setAttribute('normal', linkG.attributes.normal);
  const nL = chains.reduce((a, c) => a + c.n, 0);
  const cA = new Float32Array(nL * 4), cB = new Float32Array(nL * 4), cW = new Float32Array(nL * 4), cL = new Float32Array(nL * 4);
  let li = 0;
  for (const c of chains) for (let i = 0; i < c.n; i++, li++) {
    cA.set([...c.A, c.group], li * 4);
    if (c.mode === 0) { cB.set([0, 0, 0, 0], li * 4); cW.set([...c.wind, c.sway], li * 4); }
    else { cB.set([...c.B, 1], li * 4); cW.set([c.sag, c.cycle, c.phase, c.swing], li * 4); }
    cL.set([i, c.n, L, c.seed], li * 4);
  }
  cg.setAttribute('cA', new THREE.InstancedBufferAttribute(cA, 4));
  cg.setAttribute('cB', new THREE.InstancedBufferAttribute(cB, 4));
  cg.setAttribute('cW', new THREE.InstancedBufferAttribute(cW, 4));
  cg.setAttribute('cL', new THREE.InstancedBufferAttribute(cL, 4));
  cg.instanceCount = nL;
  cg.boundingSphere = new THREE.Sphere(new THREE.Vector3(...P(281.6, 410, 130)), 200);
  const linkMat = ironMaterial(U, 'link');
  linkMat.color.set('#241b15'); linkMat.metalness = 0.65; linkMat.roughness = 0.5;
  const linkMesh = new THREE.Mesh(cg, linkMat);
  linkMesh.name = 'galleries-chains';

  // ---- build the wheels: one merged geometry, each vertex carrying its wheel's centre, axis and motion
  const nWB = wheelBoxes.length;
  const wPos = new Float32Array(nWB * 24 * 3), wNor = new Float32Array(nWB * 24 * 3), wC = new Float32Array(nWB * 24 * 3),
    wAx = new Float32Array(nWB * 24 * 3), wW = new Float32Array(nWB * 24 * 4), wW2 = new Float32Array(nWB * 24 * 4);
  const wIdx = [];
  const bp = box.attributes.position.array, bn = box.attributes.normal.array, bi = box.index.array;
  wheelBoxes.forEach(([A, B, up, w, h, C, ax, W, W2], k) => {
    const d = sub(B, A), l = len(d), z = mul(d, 1 / l);
    let u = up; if (Math.abs(dot(z, norm(u))) > 0.98) u = Math.abs(z[1]) < 0.9 ? UP : [1, 0, 0];
    const x = norm(cross(u, z)), y = cross(z, x);
    for (let v = 0; v < 24; v++) {
      const px = bp[v * 3], py = bp[v * 3 + 1], pz = bp[v * 3 + 2];
      const p = add(A, add(mul(z, (pz + 0.5) * l), add(mul(x, px * w), mul(y, py * h))));
      const n = add(mul(x, bn[v * 3]), add(mul(y, bn[v * 3 + 1]), mul(z, bn[v * 3 + 2])));
      const o = (k * 24 + v);
      wPos.set(p, o * 3); wNor.set(n, o * 3); wC.set(C, o * 3); wAx.set(ax, o * 3); wW.set(W, o * 4); wW2.set(W2, o * 4);
    }
    for (let i = 0; i < bi.length; i++) wIdx.push(bi[i] + k * 24);
  });
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  wg.setAttribute('normal', new THREE.BufferAttribute(wNor, 3));
  wg.setAttribute('aC', new THREE.BufferAttribute(wC, 3));
  wg.setAttribute('aAx', new THREE.BufferAttribute(wAx, 3));
  wg.setAttribute('aW', new THREE.BufferAttribute(wW, 4));
  wg.setAttribute('aW2', new THREE.BufferAttribute(wW2, 4));
  wg.setIndex(wIdx);
  wg.boundingSphere = bound.clone();
  const wheelMesh = new THREE.Mesh(wg, ironMaterial(U, 'wheel'));
  wheelMesh.name = 'galleries-wheels';

  // ---- the halos round the lamps and furnaces: soft additive points, for the bloom to take
  const hPos = new Float32Array(halos.length * 3), hSz = new Float32Array(halos.length * 2);
  halos.forEach(([x, y, z, s, seed], k) => { hPos.set([x, y, z], k * 3); hSz.set([s, seed], k * 2); });
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
  hg.setAttribute('aS', new THREE.BufferAttribute(hSz, 2));
  hg.boundingSphere = bound.clone();
  const U_SCALE = { value: 1 };
  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uT: U.uT, uLamp: U.uLamp, uScale: U_SCALE },
    vertexShader: /* glsl */`
      attribute vec2 aS; uniform float uScale, uT, uLamp; varying float vA; varying float vHot;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float breathe = 0.82 + 0.18 * sin(uT * (0.35 + aS.y * 0.4) + aS.y * 40.0);
        float d = -mv.z;
        gl_PointSize = max(2.0, aS.x * uScale / d);
        vA = breathe * uLamp * exp(-d * 0.0016); vHot = step(12.0, aS.x);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vA; varying float vHot;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q);
        if (r2 > 1.0) discard;
        float a = exp(-r2 * 5.0) * vA * 0.55;
        gl_FragColor = vec4(mix(vec3(1.0, 0.62, 0.3), vec3(1.0, 0.42, 0.14), vHot) * a, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const haloMesh = new THREE.Points(hg, haloMat);
  haloMesh.name = 'galleries-halos';

  // ---- the stays: one line draw
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.Float32BufferAttribute(stays.flat(), 3));
  sgeo.boundingSphere = bound.clone();
  const stayMesh = new THREE.LineSegments(sgeo, new THREE.LineBasicMaterial({ color: new THREE.Color('#15100c') }));
  stayMesh.name = 'galleries-stays';

  for (const m of [strutMesh, linkMesh, wheelMesh, haloMesh, stayMesh]) {
    m.castShadow = false; m.receiveShadow = false;
    m.matrixAutoUpdate = false; m.updateMatrix();
    group.add(m);
  }
  group.matrixAutoUpdate = false;
  scene.add(group);

  // ---- the one point light: at the lower furnace mouth
  let light = null;
  if (lightAt) {
    light = new THREE.PointLight(new THREE.Color('#ff8436'), 1400, 85, 2);
    light.position.set(...lightAt);
    light.name = 'galleries-furnace';
    group.add(light);
  }

  // ---- the clock: a time uniform, the lamps' strength (they come up while the sun gutters), the halos' scale
  const G = {
    offset: 0,
    stats() {
      const tris = nS * 12 + nL * linkG.index.count / 3 + wIdx.length / 3;
      return { calls: 5, tris, struts: nS, links: nL, chains: chains.length, longest: Math.max(...chains.map((c) => (c.mode ? 0 : c.n * L))), nearestR: Math.min(...chains.map((c) => Math.hypot(c.A[0], c.A[2]))), wheelBoxes: nWB, halos: halos.length, light: !!light };
    },
  };
  ctx.galleries = G;
  const flick = ctx.sky?.flicker;
  const update = (dt, t) => {
    U.uT.value = t + G.offset;
    const f = flick ? flick.value : 1;
    U.uLamp.value = 1 + 1.4 * clamp((0.9 - f) / 0.6, 0, 1);
    U_SCALE.value = ctx.renderer.domElement.height / (2 * Math.tan((ctx.camera.fov * D2R) / 2));
    if (light) light.intensity = 1400 * U.uLamp.value * (0.85 + 0.15 * Math.sin(t * 0.9));
  };
  update(0, 0);
  ctx.registerUpdate(update, { pos: { x: site.x, z: site.z }, r: site.r, near: 260, hz: 10 });
  ctx.log?.(`galleries: ${nS} struts, ${chains.length} chains (${nL} links), ${nWB} wheel parts, ${halos.length} lamps; ${Math.round(G.stats().tris / 1000)}k tris`);
}
