// v8-05 the Pomegranate House's lamps: glass lanterns in four colours (pomegranate red, saffron, turquoise, green) on
// brief 03's brackets (TAVERNA_BRACKETS), on strings from a painted mast in the dry fountain to the four turrets' finials
// and the galleries' roofs, and on strings between painted poles out along P9 toward the causeway and round the east
// side to the head of kerb K1. No real light: the court keeps the house's own two lanterns (taverna.js) as its point
// lights, and the rest is emissive glass, a halo per lamp that never shrinks under about two pixels across (so from the
// causeway at 200 m the lamps read as separate coloured points), and warm ground pools under the court and the gate.
//
// Draws: the lamps (one mesh: gilt caps, coloured glass, iron cords; emission per vertex by channel; swaying in the
// vertex shader about each lamp's hook), the glows (one mesh of additive halos and ground pools), and the strings and
// poles, which are in the props mesh (house/props.js). Low tier: every other lamp on a string, no sway.
//
// The gutter (ctx.sky.flicker): read with a hysteresis (in under 0.6, out over 0.85). While it lasts every lamp dims
// to a nervous flutter round a third of its light and the fickle ones (channels 1..FICKLE) sputter out one by one; as it
// ends they all flare together and settle over a second, and the fickle ones stay dark until somebody relights them,
// one every couple of seconds from four seconds after (house-tick at each). Channel brightness is uK[ch]; channel 0 is
// every other lamp.
import * as THREE from 'three';
import { hyp } from '../../noise.js';

export const GLASS = [
  [3.6, 0.34, 0.22], // pomegranate red
  [3.3, 1.75, 0.28], // saffron
  [0.22, 2.3, 2.05], // turquoise
  [0.75, 2.9, 0.42], // green
];
export const FICKLE = 12;
const GILT = new THREE.Color('#c8963a'), IRON = new THREE.Color('#1c1714');

// a catenary-ish string from a to b (each [x, y, z]) sagging `sag` at the middle: point at s 0..1
export function stringAt(a, b, sag, s, out = [0, 0, 0]) {
  out[0] = a[0] + (b[0] - a[0]) * s; out[1] = a[1] + (b[1] - a[1]) * s - sag * 4 * s * (1 - s); out[2] = a[2] + (b[2] - a[2]) * s;
  return out;
}

// lamp records: { x, y, z (the hook), kind, col (0..3), ch (0 or a fickle channel), seed, sway (rad), size }
export function layLamps(ctx, plan, rng) {
  const low = ctx.quality === 'low', lamps = [];
  let n = 0;
  const add = (x, y, z, kind, size = 1, drop = 0) => {
    const h = (n * 0.618034 + rng() * 0.3) % 1, col = (n + (rng() < 0.3 ? 1 + Math.floor(rng() * 3) : 0)) % 4;
    lamps.push({ x, y: y - drop, z, kind, col, ch: 0, seed: h, sway: kind === 'bracket' ? 0.05 : 0.11 + rng() * 0.06, size, drop });
    n++;
  };
  for (const b of plan.brackets) add(b.x, b.y, b.z, 'bracket', 1.15);
  for (const s of plan.strings) {
    const L = hyp(s.b[0] - s.a[0], s.b[2] - s.a[2]), step = s.step * (low ? 2 : 1), k = Math.max(1, Math.round(L / step));
    const p = [0, 0, 0];
    for (let i = 1; i < k; i++) { stringAt(s.a, s.b, s.sag, i / k, p); add(p[0], p[1], p[2], s.kind || 'string', s.size || 0.85); }
  }
  for (const h of plan.hung) add(h.x, h.y, h.z, h.kind || 'hung', h.size || 1);
  // the fickle ones: spread through the list, never the gate's pair
  const pool = lamps.map((l, i) => i).filter((i) => lamps[i].kind !== 'gate');
  for (let c = 1; c <= FICKLE && pool.length; c++) { const j = Math.floor(((c - 0.5) / FICKLE) * pool.length); lamps[pool[j]].ch = c; }
  return lamps;
}

// ---- the lamp's parts, hanging from its hook at the origin (y down), at size 1
function template() {
  const parts = [];
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  parts.push({ g: new THREE.CylinderGeometry(0.006, 0.006, 0.12, 3, 1).translate(0, -0.06, 0), col: IRON, glass: false });
  parts.push({ g: new THREE.TorusGeometry(0.022, 0.006, 3, 8).translate(0, -0.005, 0), col: IRON, glass: false });
  // a pierced gilt cap, an onion of glass, a drip
  parts.push({ g: lathe([[0.0, -0.12], [0.03, -0.125], [0.085, -0.17], [0.1, -0.195], [0.0, -0.2]], 8), col: GILT, glass: false });
  parts.push({ g: lathe([[0.0, -0.19], [0.085, -0.205], [0.112, -0.26], [0.1, -0.33], [0.055, -0.385], [0.0, -0.4]], 8), col: null, glass: true });
  parts.push({ g: lathe([[0.0, -0.385], [0.045, -0.39], [0.02, -0.44], [0.0, -0.47]], 6), col: GILT, glass: false });
  for (const p of parts) { p.g = p.g.toNonIndexed(); p.g.computeVertexNormals(); }
  return parts;
}
export const GLASS_Y = -0.29; // the glass's centre below the hook, at size 1

export function lampMesh(ctx, lamps, U) {
  const T = template();
  const pos = [], nor = [], col = [], emi = [], piv = [], meta = [];
  const c = new THREE.Color();
  for (const L of lamps) {
    const g = GLASS[L.col], s = L.size;
    for (const p of T) {
      const P = p.g.attributes.position, N = p.g.attributes.normal;
      if (p.glass) c.setRGB(g[0] * 0.09, g[1] * 0.09, g[2] * 0.09); else c.copy(p.col);
      for (let i = 0; i < P.count; i++) {
        pos.push(L.x + P.getX(i) * s, L.y + P.getY(i) * s, L.z + P.getZ(i) * s);
        nor.push(N.getX(i), N.getY(i), N.getZ(i));
        col.push(c.r, c.g, c.b);
        if (p.glass) emi.push(g[0], g[1], g[2]); else emi.push(0, 0, 0);
        piv.push(L.x, L.y, L.z);
        meta.push(L.seed, L.ch, L.sway, 0);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aEmit', new THREE.Float32BufferAttribute(emi, 3));
  geo.setAttribute('aPivot', new THREE.Float32BufferAttribute(piv, 3));
  geo.setAttribute('aMeta', new THREE.Float32BufferAttribute(meta, 4));
  geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uK = U.uK; sh.uniforms.uTime = U.uTime; sh.uniforms.uSway = U.uSway;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec3 aEmit; attribute vec3 aPivot; attribute vec4 aMeta; uniform float uK[${FICKLE + 1}]; uniform float uTime; uniform float uSway; varying vec3 vEmitL;\n${SWAY_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = fpSway(position, aPivot, aMeta, uTime, uSway);
        vEmitL = aEmit * uK[int(aMeta.y + 0.5)];`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEmitL;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmitL;');
  };
  mat.customProgramCacheKey = () => 'house-lamps';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'house-lamps'; mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}

// both meshes sway the same way: a pendulum about the hook in two planes, its own rate and phase
const SWAY_GLSL = /* glsl */`
  vec3 fpSway(vec3 p, vec3 pivot, vec4 meta, float t, float amt) {
    float seed = meta.x, A = meta.z * amt;
    float w = 1.7 + seed * 0.9;
    float ax = A * (0.75 * sin(t * w + seed * 40.0) + 0.25 * sin(t * w * 2.3 + seed * 13.0));
    float az = A * 0.6 * sin(t * w * 0.83 + seed * 27.0);
    vec3 d = p - pivot;
    // small rotations about x then z
    vec3 r = vec3(d.x, d.y * cos(ax) - d.z * sin(ax), d.y * sin(ax) + d.z * cos(ax));
    r = vec3(r.x * cos(az) - r.y * sin(az), r.x * sin(az) + r.y * cos(az), r.z);
    return pivot + r;
  }`;

// ---- the glows: halos (camera-facing, at least uMinPx pixels across) and ground pools (draped quads)
export function glowMesh(ctx, lamps, pools, G, U) {
  const pos = [], anc = [], cor = [], siz = [], colA = [], piv = [], meta = [], idx = [];
  let q = 0;
  const SQ = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const quad = (pts, a, corners, size, c, pv, m) => {
    for (let k = 0; k < 4; k++) { pos.push(...pts[k]); anc.push(...a); cor.push(...corners[k]); siz.push(size[0], size[1]); colA.push(...c); piv.push(...pv); meta.push(...m); }
    const b = q * 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); q++;
  };
  for (const L of lamps) {
    const g = GLASS[L.col], a = [L.x, L.y + GLASS_Y * L.size, L.z], k = 0.16;
    quad([a, a, a, a], a, SQ, [0.55 * L.size, 0], [g[0] * k, g[1] * k, g[2] * k], [L.x, L.y, L.z], [L.seed, L.ch, L.sway, 0]);
  }
  // pools: a warm light on the ground, a grid draped on the drawn ground
  for (const P of pools) {
    const n = 8, c = P.col;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cs = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([u, v]) => [u / n * 2 - 1, v / n * 2 - 1]);
      const pts = cs.map(([u, v]) => { const x = P.x + u * P.rx, z = P.z + v * P.rz; return [x, G(x, z) + 0.06, z]; });
      quad(pts, [P.x, 0, P.z], cs, [P.rx, P.rz], c, [P.x, 0, P.z], [0, P.ch ?? 0, 0, 1]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aAnchor', new THREE.Float32BufferAttribute(anc, 3));
  geo.setAttribute('aCorner', new THREE.Float32BufferAttribute(cor, 2));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(siz, 2));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colA, 3));
  geo.setAttribute('aPivot', new THREE.Float32BufferAttribute(piv, 3));
  geo.setAttribute('aMeta', new THREE.Float32BufferAttribute(meta, 4));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), uK: U.uK, uTime: U.uTime, uSway: U.uSway, uMinPx: U.uMinPx, uPool: U.uPool },
    vertexShader: GLOW_VS, fragmentShader: GLOW_FS, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'house-glows'; mesh.frustumCulled = false; mesh.renderOrder = 25;
  return mesh;
}

const GLOW_VS = /* glsl */`
  uniform float uK[${FICKLE + 1}]; uniform float uTime; uniform float uSway; uniform float uMinPx; uniform float uPool;
  attribute vec3 aAnchor; attribute vec2 aCorner; attribute vec2 aSize; attribute vec3 aColor; attribute vec3 aPivot; attribute vec4 aMeta;
  varying vec2 vC; varying vec3 vCol; varying float vKind; varying float vFar;
  #include <fog_pars_vertex>
  ${SWAY_GLSL}
  void main() {
    float k = uK[int(aMeta.y + 0.5)];
    vec3 transformed = position;
    vec4 mvPosition;
    vKind = aMeta.w; vFar = 0.0;
    if (aMeta.w < 0.5) {
      vec3 c = fpSway(aAnchor, aPivot, aMeta, uTime, uSway);
      transformed = c;
      mvPosition = viewMatrix * vec4(c, 1.0);
      // at least a few pixels across: projectionMatrix[1][1] is 1 / tan(fov / 2), a pixel 2 / (P11 * H) a metre deep;
      // uMinPx is that minimum's radius in pixels times 2 / H (house.js sets it each frame from the canvas)
      float depth = max(-mvPosition.z, 0.1);
      float s = aSize.x * (0.85 + 0.25 * max(k - 1.0, 0.0));
      float minS = uMinPx * depth / projectionMatrix[1][1];
      vFar = clamp((minS - s) / max(minS, 1e-4), 0.0, 1.0);
      s = max(s, minS);
      mvPosition.xy += aCorner * s;
      vCol = aColor * k * (1.0 + 3.5 * vFar);
    } else {
      mvPosition = viewMatrix * vec4(position, 1.0);
      vCol = aColor * k * uPool;
    }
    gl_Position = projectionMatrix * mvPosition;
    vC = aCorner;
    #include <fog_vertex>
  }`;
const GLOW_FS = /* glsl */`
  varying vec2 vC; varying vec3 vCol; varying float vKind; varying float vFar;
  #include <fog_pars_fragment>
  void main() {
    #ifdef USE_FOG
      vec3 fpR = vFogWorldPos - cameraPosition;
      float fpL = length(fpR);
      float fpF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      float fpH = fpHeightFog(cameraPosition, fpR / max(fpL, 1e-4), fpL);
      float fogAtten = (1.0 - fpF) * (1.0 - fpH * 0.6);
    #else
      float fogAtten = 1.0;
    #endif
    float r2 = dot(vC, vC), a;
    // near: a soft halo; far: a tighter core, so a string of lamps stays a string of points
    if (vKind < 0.5) a = exp(-r2 * mix(3.0, 6.0, vFar)) * (1.0 - smoothstep(0.6, 1.0, r2));
    else a = pow(max(0.0, 1.0 - sqrt(r2)), 1.8);
    // a lamp's light carries through the haze further than a lit wall does
    gl_FragColor = vec4(vCol * a * (vKind < 0.5 ? sqrt(fogAtten) : fogAtten), 0.0);
  }`;

// ---- the gutter: channel brightness from the sun's flicker, on the CPU, per frame (or per sim step)
export function makeGutter(rng) {
  const st = { on: false, since: 0, endedAt: -1e9, t: 0, flare: 0, out: new Float32Array(FICKLE + 1), outAt: new Float32Array(FICKLE + 1), relitAt: new Float32Array(FICKLE + 1), relit: 0, gutters: 0, events: [] };
  for (let c = 1; c <= FICKLE; c++) { st.outAt[c] = 0.3 + rng() * 2.5; st.relitAt[c] = 4 + (c - 1) * (1.6 + rng() * 1.2); }
  // k: the Float32Array of channel brightness, written; returns the events fired this step (relights)
  st.step = (dt, f, N2, k) => {
    st.t += dt;
    const t = st.t, fired = st.events; fired.length = 0;
    if (!st.on && f < 0.6) { st.on = true; st.since = t; st.gutters++; fired.push({ type: 'gutter-on' }); }
    else if (st.on && f > 0.85) { st.on = false; st.endedAt = t; st.flare = 1; fired.push({ type: 'gutter-off' }); }
    st.flare = Math.max(0, st.flare - dt / 1.1);
    // all of them: dim with the sun, flutter in the gutter, flare as it catches
    const flut = st.on ? 0.75 + 0.25 * N2(t * 4.3, 1.7) + 0.12 * N2(t * 11.0, 4.1) : 1;
    const base = (0.42 + 0.58 * Math.min(1, f)) * flut * (1 + 0.85 * st.flare * st.flare);
    k[0] = base;
    for (let c = 1; c <= FICKLE; c++) {
      // out: in a gutter, after its own delay, with a sputter on the way
      if (st.on && t - st.since > st.outAt[c]) { if (!st.out[c]) st.out[c] = t; }
      if (!st.on && st.out[c] && t - st.endedAt > st.relitAt[c]) { st.out[c] = 0; st.relit++; fired.push({ type: 'relit', ch: c }); st.lit = st.lit || new Float32Array(FICKLE + 1); st.lit[c] = t; }
      let kc = base;
      if (st.out[c]) { const e = t - st.out[c]; kc = e < 0.5 ? base * (0.5 + 0.5 * Math.sin(e * 40)) * (1 - e / 0.5) : 0; }
      else if (st.lit && t - st.lit[c] < 0.8) { const e = t - st.lit[c]; kc = (0.42 + 0.58 * f) * (1 + 1.6 * (1 - e / 0.8)) * Math.min(1, e / 0.08); } // a relit wick: up bright, settles
      k[c] = kc;
    }
    return fired;
  };
  return st;
}
