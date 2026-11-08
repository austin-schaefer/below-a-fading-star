// BD the Foundered Nave (v5 wonders): on the east moor the turf has fallen through a roof. Over the torn edge of a
// ragged hole 23-33 m across the walker looks down on the capitals of a buried hall, a few metres below the eye,
// whose columns go down 14 m into black water and out of sight. The nave runs east-west under the moor both ways
// from the hole, bay after bay of close-set octagonal columns in the age of weight (the Sunken Court's order,
// smaller: straight-tapered, a broad channel down each face, a plain block for a capital carrying the roof's slabs),
// receding under the turf until the dark takes the count; the west end is choked with slumped earth. Under the hole
// lie the roof's slabs with their turf still on them, tilted against the columns, and a cone of soil and stones. In
// the water two or three dark shapes swim slowly; now and then one splashes (rings, a slosh from below). Look
// straight at one for long and it sinks away under the roof; stand still long enough and one surfaces, a wet back,
// briefly, and is gone.
// The plan and the clearances are nave/ground.js. The heightfield is left alone (see there): this module takes the
// terrain's triangles over the hole out, so the hall shows under the rim, and the roof sinks where the moor is thin.
// Draws: the hall (stone, earth, turf, the slabs, the rubble, the lip with its clods and roots, the ceiling, the
// measure figure: one mesh), the water, the shapes (only while one surfaces). ?nave=0 leaves the whole thing out.
import * as THREE from 'three';
import { NAVE, NAVE_OFF, naveRim, naveEdge, naveBearing } from './nave/ground.js';
import { makeSimplex, smoothstep, clamp, lerp, hyp } from '../noise.js';
import { approach, angDiff, makeGround } from '../fauna/uncanny/kit.js';

const CX = NAVE.x, CZ = NAVE.z, YC = NAVE.ceil, WY = NAVE.water, RIM_Y = -2.0;
// the roof's underside at (x, z): level at NAVE.ceil, sunk with the moor wherever the moor lies lower than the cover
// allows (the west end and the north aisle have settled); a 1 m grid of the terrain, set at build
let ceilAt = () => YC;
function makeCeil(T) {
  const x0 = NAVE.x0 - 3, z0 = CZ - NAVE.walls - 4, nx = Math.ceil(NAVE.x1 + 3 - x0), nz = Math.ceil(2 * NAVE.walls + 8);
  const G = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) G[j * (nx + 1) + i] = Math.min(YC, T.heightAt(x0 + i, z0 + j) - NAVE.cover);
  ceilAt = (x, z) => {
    const gx = clamp(x - x0, 0, nx - 1e-4), gz = clamp(z - z0, 0, nz - 1e-4), i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const a = G[j * (nx + 1) + i], b = G[j * (nx + 1) + i + 1], c = G[(j + 1) * (nx + 1) + i], d = G[(j + 1) * (nx + 1) + i + 1];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
  };
}
const HALF = NAVE.walls + 0.5; // the outer walls' inner faces, z from the axis
const RAD = Math.PI / 180;
const dirOf = (b) => [Math.sin(b * RAD), -Math.cos(b * RAD)]; // compass bearing -> (x, z) unit

// How much of the hole's light reaches a point, and how much of the moor's air: 1 under the open hole, falling off
// with depth and, under the roof, with the distance in from the rim (the deeper, the further the hole is seen from).
function litAt(x, y, z, out) {
  const dd = Math.max(0, RIM_Y - y);
  const A = 1 - 0.94 * Math.pow(smoothstep(1, 15, dd), 0.8);
  let B = 1;
  if (y < ceilAt(x, z) + 0.05) { const e = naveEdge(x, z); if (e > 0) B = Math.exp(-Math.max(0, e - 0.3 * dd) / 5.5); }
  // the moor's haze does not pool down here: a third of it in the hole, none under the roof
  out[0] = Math.max(0.008, A * B); out[1] = lerp(1, 0.15, smoothstep(0.3, 2.5, dd)) * smoothstep(0.03, 0.6, B);
  return out;
}

// ---------------------------------------------------------------- the hall's one mesh
class Builder {
  constructor() { this.p = []; this.n = []; this.c = []; this.l = []; this._la = [0, 0]; this._v = new THREE.Vector3(); }
  get tris() { return this.p.length / 9; }
  vert(x, y, z, nx, ny, nz, col, jit) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz);
    const j = 1 + jit * (Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453 % 1);
    this.c.push(col[0] * j, col[1] * j, col[2] * j);
    litAt(x, y, z, this._la); this.l.push(this._la[0], this._la[1], 0);
  }
  // a flat triangle; `hint` is any vector on its outward side (the winding is turned to face it)
  tri(a, b, c, col, hint, jit = 0.12) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { [b, c] = [c, b]; nx = -nx; ny = -ny; nz = -nz; }
    this.vert(...a, nx, ny, nz, col, jit); this.vert(...b, nx, ny, nz, col, jit); this.vert(...c, nx, ny, nz, col, jit);
  }
  quad(a, b, c, d, col, hint, jit) { this.tri(a, b, c, col, hint, jit); this.tri(a, c, d, col, hint, jit); }
  // a triangle with its own vertex normals and colours (the lip's turf, matched to the terrain's)
  triN(a, b, c, na, nb, nc, ca, cb, cc) {
    // wound to face up
    if ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; [cb, cc] = [cc, cb]; }
    this.vert(...a, ...na, ca, 0); this.vert(...b, ...nb, cb, 0); this.vert(...c, ...nc, cc, 0);
  }
  // any three.js geometry, transformed; per-face colour from fn(normal) or one colour
  geo(g, m, col, jit = 0.1) {
    const ng = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    ng.computeVertexNormals();
    const P = ng.attributes.position.array, N = ng.attributes.normal.array;
    for (let i = 0; i < P.length; i += 3) {
      const cc = typeof col === 'function' ? col(N[i], N[i + 1], N[i + 2]) : col;
      this.vert(P[i], P[i + 1], P[i + 2], N[i], N[i + 1], N[i + 2], cc, jit);
    }
    ng.dispose();
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aLA', new THREE.Float32BufferAttribute(this.l, 3));
    g.computeBoundingSphere();
    return g;
  }
}

function hallMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aLA; varying vec3 vLA; varying vec3 vNW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLA = aLA; vNW = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLA; varying vec3 vNW;
        float nvH(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float nvN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(nvH(i), nvH(i + vec3(1,0,0)), f.x), mix(nvH(i + vec3(0,1,0)), nvH(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(nvH(i + vec3(0,0,1)), nvH(i + vec3(1,0,1)), f.x), mix(nvH(i + vec3(0,1,1)), nvH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // worn, stained, damp toward the water: no texture, only the world position
        diffuseColor.rgb *= 0.72 + 0.4 * nvN(vNW * 0.9) * (0.6 + 0.4 * nvN(vNW * 3.7 + 11.0));
        diffuseColor.rgb *= 1.0 - 0.35 * smoothstep(${(WY + 6).toFixed(1)}, ${(WY + 0.2).toFixed(1)}, vNW.y);`)
      .replace('#include <opaque_fragment>', `outgoingLight *= vLA.x;\n#include <opaque_fragment>`)
      // under the roof the air is the hall's, not the moor's lit haze
      .replace('#include <fog_fragment>', `vec3 fpNoFog = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(fpNoFog, gl_FragColor.rgb, vLA.y);`);
  };
  m.customProgramCacheKey = () => 'fp-nave-hall';
  return m;
}

// ---------------------------------------------------------------- the water
const WATER_VERT = /* glsl */`
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec3 transformed = position;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const WATER_FRAG = /* glsl */`
  precision highp float;
  uniform float uT, uRimY, uRim[36];
  uniform vec2 uCenter;
  uniform vec3 uSky;
  uniform vec4 uShape[3];   // x, z, heading, how near the surface (0 gone .. 1 just under)
  uniform vec2 uSize[3];    // half length, half width
  uniform vec4 uSplash[3];  // x, z, start time, strength
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  float rimAt(vec2 d) {
    float b = atan(d.x, -d.y); if (b < 0.0) b += 6.2831853;
    float f = b / 6.2831853 * 36.0; float i0 = floor(f); float t = f - i0;
    int a = int(mod(i0, 36.0)), c = int(mod(i0 + 1.0, 36.0));
    float ra = 0.0, rc = 0.0;
    for (int k = 0; k < 36; k++) { if (k == a) ra = uRim[k]; if (k == c) rc = uRim[k]; }
    return mix(ra, rc, t);
  }
  void main() {
    vec2 p = vWorld.xz;
    vec2 d = p - uCenter;
    float e = length(d) - rimAt(d);
    float lit = e < 0.0 ? 1.0 : exp(-e / 3.2);
    // still, but not dead: a slow shiver, and the rings of whatever moved
    vec2 slope = vec2(sin(p.x * 1.7 + uT * 0.5 + sin(p.y * 0.9)), cos(p.y * 1.9 - uT * 0.4 + sin(p.x * 1.1))) * 0.008;
    float glint = 0.0;
    for (int i = 0; i < 3; i++) {
      float age = uT - uSplash[i].z;
      if (age > 0.0 && age < 7.0 && uSplash[i].w > 0.0) {
        vec2 q = p - uSplash[i].xy; float r = length(q) + 1e-4;
        float front = age * 0.95;
        float w = (r - front);
        float ring = sin(w * 7.0) * exp(-w * w * 1.1) * exp(-age * 0.55);
        slope += q / r * ring * 0.22 * uSplash[i].w;
        glint += max(ring, 0.0) * uSplash[i].w;
        // the first instant: a burst of broken water where it struck
        glint += exp(-r * r * 1.2) * exp(-age * 2.2) * 3.0 * uSplash[i].w;
      }
    }
    // the shapes: dark under the surface, soft-edged, the surface smoothed over them
    float dark = 0.0;
    for (int i = 0; i < 3; i++) {
      vec2 q = p - uShape[i].xy; float c = cos(uShape[i].z), s = sin(uShape[i].z);
      vec2 l = vec2(q.x * c - q.y * s, q.x * s + q.y * c) / uSize[i];
      float k = length(l) * (1.0 + 0.12 * sin(atan(l.y, l.x) * 3.0 + uT * 0.3));
      float soft = mix(0.95, 0.35, uShape[i].w);
      dark = max(dark, (1.0 - smoothstep(1.0 - soft, 1.0 + soft * 0.4, k)) * uShape[i].w);
    }
    slope *= 1.0 - 0.6 * dark;
    vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 V = normalize(vWorld - cameraPosition);
    vec3 R = reflect(V, N);
    // the reflection: the hole's sky where the reflected ray goes out through it, the roof's black elsewhere
    float open = 0.0;
    if (R.y > 0.02) {
      vec2 q = p + R.xz * ((uRimY - vWorld.y) / R.y) - uCenter;
      open = 1.0 - smoothstep(-1.2, 0.3, length(q) - rimAt(q));
    }
    vec3 refl = mix(vec3(0.004, 0.004, 0.005), uSky, open);
    float F = 0.3 + 0.7 * pow(1.0 - max(dot(-V, N), 0.0), 4.0);
    vec3 body = vec3(0.010, 0.013, 0.012) * lit;
    vec3 col = body * (1.0 - 0.8 * dark) + refl * F * (1.0 - 0.94 * dark);
    col = mix(col, uSky * 1.6 + 0.03, clamp(glint * 0.55, 0.0, 0.85) * lit);
    gl_FragColor = vec4(col, 1.0);
    vec3 preFog = gl_FragColor.rgb;
    #include <fog_fragment>
    gl_FragColor.rgb = mix(preFog, gl_FragColor.rgb, 0.25 * lit);
  }`;

// ---------------------------------------------------------------- the module
export async function build(ctx) {
  if (NAVE_OFF) { ctx.nave = { off: true, stats: () => ({ calls: 0, tris: 0 }) }; return; }
  const { scene, terrain: T, camera, player } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(9231);
  const SN = makeSimplex(9232);
  const t0 = performance.now();
  await ctx.progress?.('the foundered nave', 0);
  makeCeil(T);
  const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const STONE = C('#7d7268'), STONE_D = C('#5f574f'), SLAB = C('#4a443d'), SOIL = C('#3e3124'), SOIL_L = C('#54432f');
  const TURF = C('#5a6630'), TURF_D = C('#48502a'), RUBBLE = C('#7a7064'), FIG = C('#1d1a1c');
  const H = new Builder();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);

  // ---- the terrain over the hole is not drawn: its triangles with a corner inside the rim are made degenerate
  let cut = 0;
  {
    const g = T.mesh.geometry, idx = g.index.array, P = g.attributes.position.array;
    const inside = (i) => { const x = P[i * 3], z = P[i * 3 + 2]; return x > CX - 20 && x < CX + 20 && z > CZ - 20 && z < CZ + 20 && naveEdge(x, z) < 0; };
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const xa = P[a * 3], za = P[a * 3 + 2];
      if (xa < CX - 24 || xa > CX + 24 || za < CZ - 24 || za > CZ + 24) continue;
      if (inside(a) || inside(b) || inside(c)) { idx[t + 1] = a; idx[t + 2] = a; cut++; }
    }
    g.index.needsUpdate = true;
  }
  // the terrain's own colour at (x, z), bilinear from its vertex colours (for the lip's turf)
  const tc = (() => {
    const g = T.mesh.geometry, col = g.attributes.color.array, segs = g.parameters?.widthSegments ?? 480, size = T.size || 1000;
    const half = size / 2, cell = size / segs, row = segs + 1;
    return (x, z, out) => {
      const gx = (x + half) / cell, gy = (z + half) / cell, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
      for (let k = 0; k < 3; k++) {
        const a = col[(iy * row + ix) * 3 + k], b = col[(iy * row + ix + 1) * 3 + k], c = col[((iy + 1) * row + ix) * 3 + k], d = col[((iy + 1) * row + ix + 1) * 3 + k];
        out[k] = lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
      }
      return out;
    };
  })();

  // ---- the lip: the turf's broken edge, the soil under it, the roof's slabs snapped off and jutting, round every bearing
  const step = low ? 3 : 2;
  const lipOut = low ? [-0.3, 0, 0.4, 1.0, 1.8, 2.7, 3.7, 4.9] : [-0.3, 0, 0.35, 0.8, 1.4, 2.1, 2.9, 3.7];
  // the lip lies on the drawn terrain (the mesh's own triangles), not the analytic ground, so no sliver shows through
  const MG = makeGround(ctx), _mn = new THREE.Vector3();
  const rimPts = [];
  for (let b = 0; b <= 360; b += step) {
    const bb = b % 360, R = naveRim(bb), [dx, dz] = dirOf(bb);
    const jut = 0.25 + Math.max(0, SN.noise2(bb * 0.09, 3.1)) * 1.6;      // the slab's broken end, past the turf
    const sag = 0.1 + Math.max(0, SN.noise2(bb * 0.13, 7.7)) * 0.35;      // how far the turf curls over
    const top = [], tcol = [], tnor = [];
    for (const e of lipOut) {
      const ee = Math.max(e, 0.02), x = CX + dx * (R + ee), z = CZ + dz * (R + ee), near = 1 - smoothstep(0, 1.3, e);
      // cracked, lifted turf near the break; a hair over the mesh further out
      const lift = Math.max(0, SN.noise2(x * 1.3, z * 1.3)) * 0.09 * near;
      const y = MG.at(x, z) + (e < 0 ? -0.06 - sag * 0.4 : lerp(0.05, 0.015, smoothstep(1.2, lipOut[lipOut.length - 1], e)) + lift);
      top.push([CX + dx * (R + e), y, CZ + dz * (R + e)]);
      const sx = CX + dx * (R + Math.max(e, lipOut[lipOut.length - 1])), sz = CZ + dz * (R + Math.max(e, lipOut[lipOut.length - 1]));
      const c = tc(sx, sz, [0, 0, 0]);
      // torn: the soil shows through in patches near the edge
      const torn = near * smoothstep(-0.1, 0.5, SN.noise2(x * 0.9 + 3, z * 0.9 - 2));
      for (let k = 0; k < 3; k++) c[k] = lerp(c[k], SOIL_L[k], torn * 0.75);
      tcol.push(c);
      // the mesh's normal from far enough out that the hole's own (undrawn) triangles do not tilt it
      const ne = Math.max(e, 0.9); MG.normal(CX + dx * (R + ne), CZ + dz * (R + ne), _mn); tnor.push([_mn.x, _mn.y, _mn.z]);
    }
    const yr = top[0][1], cl = ceilAt(CX + dx * R, CZ + dz * R);
    // the face, from the turf's curled edge down to the slab's underside, then back under the roof to the rim
    const face = [
      [R - 0.38 - sag * 0.3, yr - 0.1, SOIL_L],
      [R - 0.12 + SN.noise2(bb * 0.4, 1) * 0.15, Math.max(yr - 0.3, cl + 0.66), SOIL],
      [R - 0.05 + SN.noise2(bb * 0.3, 2) * 0.25, cl + 0.6, SOIL],
      [R - jut, cl + 0.55, SLAB],
      [R - jut - 0.05, cl + 0.02, STONE_D],
      [R + 0.15, cl - 0.01, SLAB],
    ].map(([r, y, c]) => ({ p: [CX + dx * r, y, CZ + dz * r], c }));
    rimPts.push({ b: bb, R, dx, dz, top, tcol, tnor, face });
  }
  for (let i = 0; i < rimPts.length - 1; i++) {
    const A = rimPts[i], B2 = rimPts[i + 1];
    for (let k = 0; k < A.top.length - 1; k++) {
      H.triN(A.top[k], A.top[k + 1], B2.top[k + 1], A.tnor[k], A.tnor[k + 1], B2.tnor[k + 1], k === 0 ? TURF_D : A.tcol[k], A.tcol[k + 1], B2.tcol[k + 1]);
      H.triN(A.top[k], B2.top[k + 1], B2.top[k], A.tnor[k], B2.tnor[k + 1], B2.tnor[k], k === 0 ? TURF_D : A.tcol[k], B2.tcol[k + 1], k === 0 ? TURF_D : B2.tcol[k]);
    }
    // the faces' normals point into the hole (the underside's down)
    const fa = [A.top[0], ...A.face.map((f) => f.p)], fb = [B2.top[0], ...B2.face.map((f) => f.p)];
    for (let k = 0; k < fa.length - 1; k++) {
      const col = A.face[k].c;
      const hint = k === fa.length - 2 ? [0, -1, 0] : k === 3 ? [-A.dx * 0.3, 1, -A.dz * 0.3] : [-A.dx, 0, -A.dz];
      H.quad(fa[k], fa[k + 1], fb[k + 1], fb[k], col, hint, 0.15);
    }
  }
  // clods of turf broken off the edge, hanging over or lodged on the slab's end, and roots trailing down the soil face
  {
    const ROOT = C('#271d15'), nClod = low ? 22 : 44, nRoot = low ? 60 : 130;
    for (let i = 0; i < nClod; i++) {
      const bb = rng() * 360, R = naveRim(bb), [dx, dz] = dirOf(bb), r = R - 0.15 - rng() * 0.5;
      const x = CX + dx * r, z = CZ + dz * r, y = MG.at(CX + dx * (R + 0.05), CZ + dz * (R + 0.05)) - 0.12 - rng() * 0.35;
      const sz = 0.25 + rng() * 0.45;
      E.set((rng() - 0.5) * 0.9, rng() * 6.28, (rng() - 0.5) * 0.9);
      M.compose(V.set(x, y, z), Q.setFromEuler(E), S1);
      H.geo(new THREE.BoxGeometry(sz * (1 + rng() * 0.6), sz * 0.6, sz), M, (nx, ny) => (ny > 0.5 ? TURF_D : SOIL), 0.2);
    }
    for (let i = 0; i < nRoot; i++) {
      const bb = rng() * 360, R = naveRim(bb), [dx, dz] = dirOf(bb), tx = -dz, tz = dx;
      const r0 = R - 0.15 - rng() * 0.2, y0 = MG.at(CX + dx * (R + 0.05), CZ + dz * (R + 0.05)) - 0.1 - rng() * 0.25;
      const len = 0.5 + rng() * 1.4, w = 0.02 + rng() * 0.035, sway = (rng() - 0.5) * 0.5;
      let px = CX + dx * r0, pz = CZ + dz * r0, py = y0;
      for (let k = 0; k < 3; k++) {
        const ny = py - len / 3, nr = 0.08 * (k + 1), qx = px - dx * nr * 0.3 + tx * sway * 0.15, qz = pz - dz * nr * 0.3 + tz * sway * 0.15, ww = w * (1 - k * 0.3);
        const a = [px - tx * ww, py, pz - tz * ww], b = [px + tx * ww, py, pz + tz * ww], c = [qx + tx * ww * 0.7, ny, qz + tz * ww * 0.7], d = [qx - tx * ww * 0.7, ny, qz - tz * ww * 0.7];
        H.quad(a, b, c, d, ROOT, [-dx, 0, -dz], 0.1); H.quad(a, b, c, d, ROOT, [dx, 0, dz], 0.1);
        px = qx; pz = qz; py = ny;
      }
    }
  }
  const lipTris = H.tris;
  await ctx.progress?.('the foundered nave', 0.25);

  // ---- the ceiling: the roof's underside over the whole hall, cut back to the rim over the hole
  {
    const cell = low ? 2.4 : 1.75, nx = Math.ceil((NAVE.x1 - NAVE.x0) / cell), nz = Math.ceil((2 * HALF) / cell);
    const at = (i, j) => {
      const x = NAVE.x0 + (i / nx) * (NAVE.x1 - NAVE.x0), z = CZ - HALF + (j / nz) * 2 * HALF;
      const e = naveEdge(x, z);
      if (e >= 0.15) return { p: [x, ceilAt(x, z), z], in: false };
      const b = naveBearing(x, z), R = naveRim(b) + 0.15, [dx, dz] = dirOf(b);
      return { p: [CX + dx * R, ceilAt(CX + dx * R, CZ + dz * R), CZ + dz * R], in: true };
    };
    const grid = [];
    for (let j = 0; j <= nz; j++) { const r = []; for (let i = 0; i <= nx; i++) r.push(at(i, j)); grid.push(r); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
      const slab = ((Math.floor((a.p[0] - CX) / NAVE.bay) + Math.floor((a.p[2] - CZ) / 3.2) * 7) & 3) * 0.06;
      const col = [SLAB[0] * (0.9 + slab), SLAB[1] * (0.9 + slab), SLAB[2] * (0.9 + slab)];
      if (!(a.in && b.in && c.in)) H.tri(a.p, b.p, c.p, col, [0, -1, 0], 0.05);
      if (!(a.in && c.in && d.in)) H.tri(a.p, c.p, d.p, col, [0, -1, 0], 0.05);
    }
  }
  // ---- the walls: the aisles' outer walls, the east end far under the moor, and the west end choked with earth
  {
    const y0 = WY - 1.5, n = 32, bands = (top) => [y0, WY + 4, top - 4, top];
    for (const side of [-1, 1]) {
      const z = CZ + side * HALF;
      for (let i = 0; i < n; i++) {
        const xa = NAVE.x0 + (i / n) * (NAVE.x1 - NAVE.x0), xb = NAVE.x0 + ((i + 1) / n) * (NAVE.x1 - NAVE.x0), A = bands(ceilAt(xa, z)), Bb = bands(ceilAt(xb, z));
        for (let k = 0; k < 3; k++) H.quad([xa, A[k], z], [xb, Bb[k], z], [xb, Bb[k + 1], z], [xa, A[k + 1], z], STONE_D, [0, 0, -side], 0.1);
      }
    }
    for (let i = 0; i < 6; i++) {
      const za = CZ - HALF + (i / 6) * 2 * HALF, zb = CZ - HALF + ((i + 1) / 6) * 2 * HALF, A = bands(ceilAt(NAVE.x1, za)), Bb = bands(ceilAt(NAVE.x1, zb));
      for (let k = 0; k < 3; k++) H.quad([NAVE.x1, A[k], za], [NAVE.x1, Bb[k], zb], [NAVE.x1, Bb[k + 1], zb], [NAVE.x1, A[k + 1], za], STONE_D, [-1, 0, 0], 0.1);
    }
    // the choke: earth slumped in from the west end, from the roof down into the water 10 m out
    const nz = 10, nx = 6, pts = [];
    for (let i = 0; i <= nx; i++) {
      const r = [];
      for (let j = 0; j <= nz; j++) {
        const z = CZ - HALF + (j / nz) * 2 * HALF, u = i / nx;
        const x = NAVE.x0 + u * (10 + SN.noise2(z * 0.2, 5) * 2.5);
        const y = lerp(ceilAt(NAVE.x0, z) + 0.05, WY - 1.5, Math.pow(u, 0.8)) + SN.noise2(x * 0.4, z * 0.4) * 0.6 * Math.sin(u * Math.PI);
        r.push([x, y, z]);
      }
      pts.push(r);
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) H.quad(pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1], i < 2 ? SOIL : SOIL_L, [1, 1, 0], 0.18);
  }
  await ctx.progress?.('the foundered nave', 0.45);

  // ---- the columns: octagons straight-tapered from the water to a plain block of a capital that carries the roof
  const COL = { a0: 0.95, a1: 0.78, chW: 0.42, chD: 0.1, cap: 0.85, capW: 2.1, neck: 0.3, neckW: 1.75 };
  const columns = [];
  const RC = 1 / Math.cos(Math.PI / 8);
  // what the roof's fall did to the columns under the hole: one gone (its drums lie in the water), one broken at
  // mid-height, one broken off where the cone now buries it
  const FATE = { '0:4.5': { gone: true }, '1:-4.5': { top: YC - 7.4 }, '-1:-4.5': { top: WY + 4.6 } };
  const broken = { x: CX + NAVE.bay, z: CZ - 4.5 };
  for (const rz of NAVE.rows) for (let k = -3; ; k++) {
    const x = CX + k * NAVE.bay; if (x > NAVE.x1 - 2) break; if (x < NAVE.x0 + 4) continue;
    const z = CZ + rz, fate = FATE[`${k}:${rz}`];
    const isBroken = !!fate?.top;
    const lean = Math.max(0, rng() - 0.55) * 0.5, la = rng() * Math.PI * 2; // a few settled out of true
    if (fate?.gone) continue;
    const cTop = ceilAt(x, z), yTop = isBroken ? fate.top : cTop - COL.cap - COL.neck, yBot = WY - 5;
    const near = Math.hypot(x - CX, z - CZ) < 24 && !low;
    const levels = [yBot, WY + 1.5, cTop - 8, cTop - 3.5, yTop].filter((y) => y <= yTop + 1e-6);
    const ox = (y) => Math.cos(la) * lean * (y - yBot) / (cTop - yBot), oz = (y) => Math.sin(la) * lean * (y - yBot) / (cTop - yBot);
    const apo = (y) => lerp(COL.a0, COL.a1, (y - yBot) / (cTop - yBot));
    for (let f = 0; f < 8; f++) {
      const a0 = (f - 0.5) * Math.PI / 4, a1 = (f + 0.5) * Math.PI / 4, am = f * Math.PI / 4;
      const nxm = Math.cos(am), nzm = Math.sin(am);
      for (let li = 0; li < levels.length - 1; li++) {
        const ya = levels[li], yb = levels[li + 1];
        const pt = (y, ang, depth = 0) => { const a = apo(y), r = a * RC; const px = Math.cos(ang) * r, pz = Math.sin(ang) * r; return [x + ox(y) + px - nxm * depth * a, y, z + oz(y) + pz - nzm * depth * a]; };
        const hint = [nxm, 0, nzm];
        if (!near) { H.quad(pt(ya, a0), pt(ya, a1), pt(yb, a1), pt(yb, a0), STONE, hint, 0.08); continue; }
        // the channel: the face's middle stands back by chD of the apothem
        const w = COL.chW / 2;
        const P = (y, t, d) => {
          const a = apo(y), r = a * RC; const ca = Math.cos(a0) * r, sa = Math.sin(a0) * r, cb = Math.cos(a1) * r, sb = Math.sin(a1) * r;
          return [x + ox(y) + lerp(ca, cb, t) - nxm * d * a, y, z + oz(y) + lerp(sa, sb, t) - nzm * d * a];
        };
        const t1 = 0.5 - w, t2 = 0.5 + w, tg = [Math.cos(a1) - Math.cos(a0), 0, Math.sin(a1) - Math.sin(a0)], tn = [-tg[0], 0, -tg[2]];
        H.quad(P(ya, 0, 0), P(ya, t1, 0), P(yb, t1, 0), P(yb, 0, 0), STONE, hint, 0.08);
        H.quad(P(ya, t1, 0), P(ya, t1, COL.chD), P(yb, t1, COL.chD), P(yb, t1, 0), STONE_D, tg, 0.08);
        H.quad(P(ya, t1, COL.chD), P(ya, t2, COL.chD), P(yb, t2, COL.chD), P(yb, t1, COL.chD), STONE_D, hint, 0.08);
        H.quad(P(ya, t2, COL.chD), P(ya, t2, 0), P(yb, t2, 0), P(yb, t2, COL.chD), STONE_D, tn, 0.08);
        H.quad(P(ya, t2, 0), P(ya, 1, 0), P(yb, 1, 0), P(yb, t2, 0), STONE, hint, 0.08);
      }
    }
    const tx = x + ox(yTop), tz = z + oz(yTop);
    if (isBroken) {
      // the break: a jagged top
      const ctr = [tx, yTop + 0.5, tz];
      for (let f = 0; f < 8; f++) {
        const a0 = (f - 0.5) * Math.PI / 4, a1 = (f + 0.5) * Math.PI / 4, r = apo(yTop) * RC;
        const ya = yTop + SN.noise2(f * 0.9, 1.3) * 0.5, yb = yTop + SN.noise2((f + 1) * 0.9, 1.3) * 0.5;
        H.tri([tx + Math.cos(a0) * r, ya, tz + Math.sin(a0) * r], [tx + Math.cos(a1) * r, yb, tz + Math.sin(a1) * r], ctr, STONE, [0, 1, 0], 0.15);
      }
    } else {
      // the necking and the capital: plain blocks, the capital's top the roof's underside
      M.compose(V.set(tx, yTop + COL.neck / 2, tz), Q.identity(), S1);
      H.geo(new THREE.BoxGeometry(COL.neckW, COL.neck, COL.neckW), M, STONE_D);
      M.compose(V.set(tx, cTop - COL.cap / 2, tz), Q.identity(), S1);
      H.geo(new THREE.BoxGeometry(COL.capW, COL.cap, COL.capW), M, STONE);
    }
    columns.push({ x, z });
  }
  await ctx.progress?.('the foundered nave', 0.65);

  // ---- the cone: soil, turf and stones come down through the hole under its west-north-west lip, 7 m high above the water
  const CONE = { x: CX - 9.5, z: CZ - 4.5, r: 9, top: WY + 7 };
  const coneY = (x, z) => {
    const r = Math.hypot(x - CONE.x, z - CONE.z), u = clamp(r / CONE.r, 0, 1.3);
    return CONE.top - (CONE.top - (WY - 2.5)) * Math.pow(u, 1.25) + SN.fbm2(x * 0.25, z * 0.25, 3) * 0.9;
  };
  {
    const nb = low ? 20 : 30, nr = low ? 6 : 9;
    const ring = [];
    for (let j = 0; j <= nr; j++) {
      const r = [];
      for (let i = 0; i < nb; i++) {
        const a = (i / nb) * Math.PI * 2, rr = (j / nr) * CONE.r * 1.25 * (1 + 0.18 * SN.noise2(Math.cos(a) * 1.3, Math.sin(a) * 1.3));
        const x = CONE.x + Math.cos(a) * rr, z = CONE.z + Math.sin(a) * rr;
        r.push([x, coneY(x, z), z]);
      }
      ring.push(r);
    }
    for (let j = 0; j < nr; j++) for (let i = 0; i < nb; i++) {
      const i1 = (i + 1) % nb, p = ring[j][i];
      const grass = SN.noise2(p[0] * 0.3, p[2] * 0.3) > 0.15 && p[1] > WY + 1.5;
      H.quad(ring[j][i], ring[j][i1], ring[j + 1][i1], ring[j + 1][i], grass ? TURF_D : j < 3 ? SOIL_L : SOIL, [0, 1, 0], 0.2);
    }
    // the stones: blocks of the roof and its fill, all sizes, on the cone and the water's edge
    const nStones = low ? 55 : 110;
    for (let s = 0; s < nStones; s++) {
      const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * CONE.r * 1.15, x = CONE.x + Math.cos(a) * rr, z = CONE.z + Math.sin(a) * rr;
      const sz = 0.35 + Math.pow(rng(), 2.2) * 1.8;
      E.set((rng() - 0.5) * 0.9, rng() * 6.28, (rng() - 0.5) * 0.9);
      M.compose(V.set(x, coneY(x, z) + sz * 0.15, z), Q.setFromEuler(E), S1);
      H.geo(new THREE.BoxGeometry(sz * (1 + rng()), sz * (0.5 + rng() * 0.4), sz * (0.8 + rng() * 0.6)), M, rng() < 0.3 ? STONE_D : RUBBLE, 0.12);
    }
    // the fallen column's drums in a line in the water, half under, its capital beyond; a drum of the broken one
    const fall = Math.atan2(4.7, -6.2);
    const lay = [[CX + 1.2, CZ + 2.6, fall, 3.2, 'drum'], [CX + 3.0, CZ + 0.3, fall + 0.12, 3.0, 'drum'], [CX + 4.6, CZ - 1.9, fall - 0.2, 2.6, 'drum'],
      [CX + 2.6, CZ + 6.0, 0.4, 0, 'cap'], [broken.x + 2.3, broken.z + 3.0, 1.9, 2.4, 'drum']];
    for (const [x, z, yaw, len, kind] of lay) {
      E.set(kind === 'drum' ? Math.PI / 2 : 0.35, yaw, kind === 'drum' ? 0.06 : 0.22, 'YXZ');
      const y = Math.max(coneY(x, z), WY - 0.35) + (kind === 'drum' ? 0.15 : 0.1);
      M.compose(V.set(x, y, z), Q.setFromEuler(E), S1);
      H.geo(kind === 'cap' ? new THREE.BoxGeometry(COL.capW, COL.cap, COL.capW) : new THREE.CylinderGeometry(0.86, 0.86, len, 8), M, STONE, 0.1);
    }
  }
  // ---- the fallen slabs: the roof's, their turf still on them, tilted against the columns and down onto the cone
  const SLABS = [
    // x, z (centre offset from the hole's centre), length, width, yaw, pitch (deg), roll (deg), y-lift above the cone
    [-6.5, 7.5, 7.2, 4.2, 20, -28, 6, 1.4],
    [3.5, 8.0, 6.4, 3.6, -15, 34, -8, 2.2],
    [-9.5, -3.0, 6.8, 3.8, 95, 22, 10, 1.2],
    [6.5, -4.0, 5.8, 3.4, 70, -38, 4, 2.8],
    [-1.5, -7.5, 7.0, 4.0, -5, 18, -14, 1.0],
    [9.0, 4.5, 5.2, 3.0, 120, 30, 12, 1.6],
    [-3.0, 1.0, 5.6, 3.2, 40, 12, 26, 0.6],
  ];
  for (const [ox, oz, len, wid, yaw, pitch, roll, lift] of SLABS) {
    const x = CX + ox, z = CZ + oz, y = Math.max(coneY(x, z), WY - 0.4) + lift;
    E.set(pitch * RAD, yaw * RAD, roll * RAD, 'YXZ');
    Q.setFromEuler(E);
    M.compose(V.set(x, y, z), Q, S1);
    H.geo(new THREE.BoxGeometry(wid, 0.85, len), M, (nx, ny) => (ny < -0.5 ? SLAB : STONE_D), 0.1);
    // its turf and soil, a little short of its edges, torn
    const turf = new THREE.BoxGeometry(wid * 0.92, 0.45, len * 0.88, 2, 1, 3);
    const tp = turf.attributes.position;
    for (let i = 0; i < tp.count; i++) if (tp.getY(i) > 0) tp.setY(i, tp.getY(i) + SN.noise2(tp.getX(i) * 1.7 + ox, tp.getZ(i) * 1.7 + oz) * 0.12);
    M.compose(V.set(0, 0.62, 0).applyQuaternion(Q).add(new THREE.Vector3(x, y, z)), Q, S1);
    H.geo(turf, M, (nx, ny) => (ny > 0.5 ? TURF : SOIL), 0.2);
  }
  // ---- one figure on the north-east rim, looking in: a person's height against the hole
  const FIG_B = 38, FR = naveRim(FIG_B) + 1.7, [fdx, fdz] = dirOf(FIG_B), fx = CX + fdx * FR, fz = CZ + fdz * FR;
  {
    const fm = ctx.kit.measureFigures([{ x: fx, z: fz, yaw: Math.atan2(-fdx, -fdz) }], { name: 'nave-figure' }, ctx);
    fm.getMatrixAt(0, M);
    H.geo(fm.geometry, M, FIG, 0.02);
    fm.geometry.dispose(); fm.material.dispose(); fm.dispose?.();
  }
  await ctx.progress?.('the foundered nave', 0.8);

  const hallGeo = H.geometry();
  const hall = new THREE.Mesh(hallGeo, hallMaterial());
  hall.castShadow = true; hall.receiveShadow = true; hall.name = 'nave-hall';
  scene.add(hall);

  // ---- the water
  const rimU = new Array(36); for (let i = 0; i < 36; i++) rimU[i] = naveRim(i * 10);
  const shapeU = [0, 1, 2].map(() => new THREE.Vector4(0, 0, 0, 0)), sizeU = [0, 1, 2].map(() => new THREE.Vector2(1, 0.5)), splashU = [0, 1, 2].map(() => new THREE.Vector4(0, 0, -100, 0));
  const skyU = new THREE.Color('#5a5470');
  const wmat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uRimY: { value: RIM_Y }, uRim: { value: rimU }, uCenter: { value: new THREE.Vector2(CX, CZ) }, uSky: { value: skyU }, uShape: { value: shapeU }, uSize: { value: sizeU }, uSplash: { value: splashU } }]),
    vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, fog: true,
  });
  // UniformsUtils.merge clones the arrays: keep the material's own
  const WU = wmat.uniforms;
  WU.uSky.value = skyU; WU.uShape.value = shapeU; WU.uSize.value = sizeU; WU.uSplash.value = splashU;
  const wgeo = new THREE.PlaneGeometry(NAVE.x1 - NAVE.x0, 2 * HALF, 1, 1).rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wgeo, wmat);
  water.position.set((NAVE.x0 + NAVE.x1) / 2, WY, CZ); water.name = 'nave-water'; water.receiveShadow = false;
  scene.add(water);

  // ---- the shapes: three dark wet backs, drawn only while one breaks the surface
  const sgeo = new THREE.SphereGeometry(1, low ? 12 : 18, low ? 8 : 12);
  {
    const p = sgeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ridge = y > 0 ? 1 + 0.5 * Math.exp(-(x * x) / 0.04) * (1 - Math.abs(z)) : 1;
      const lump = 1 + 0.12 * SN.noise2(x * 2.1 + z * 1.3, y * 2.1);
      p.setXYZ(i, x * lump, y * ridge * lump, z * lump * (z < 0 ? 0.85 : 1));
    }
    sgeo.computeVertexNormals();
  }
  const smat = new THREE.MeshStandardMaterial({ color: '#060606', roughness: 0.22, metalness: 0.05 });
  const shapesMesh = new THREE.InstancedMesh(sgeo, smat, 3);
  shapesMesh.name = 'nave-shapes'; shapesMesh.frustumCulled = false; shapesMesh.visible = false; shapesMesh.castShadow = false;
  scene.add(shapesMesh);

  // ---- the rim's colliders: a ring just outside the edge and a second 0.7 m further out (the pit's precedent)
  let colliders = 0;
  if (ctx.addCollider) {
    for (const out of [0.15, 0.5]) {
      let lx = Infinity, lz = Infinity;
      for (let b = 0; b < 360; b += 0.5) {
        const R = naveRim(b) + out, [dx, dz] = dirOf(b), x = CX + dx * R, z = CZ + dz * R;
        if (Math.hypot(x - lx, z - lz) < 0.8) continue;
        ctx.addCollider({ x, z, r: 0.5 }); colliders++; lx = x; lz = z;
      }
    }
    ctx.addCollider({ x: fx, z: fz, r: 0.35 }); colliders++;
  }

  // ---- the life in the water
  const inWater = (x, z) => x > NAVE.x0 + 10 && x < NAVE.x1 - 2 && Math.abs(z - CZ) < HALF - 1.2;
  const S = {
    shapes: [0, 1, 2].map((i) => ({
      x: CX + (i - 1) * 9, z: CZ + (i - 1) * 4, h: rng() * 6.28, v: 0.35 + rng() * 0.25, len: 1.6 + rng() * 0.8, wid: 0.6 + rng() * 0.3,
      near: 0.6, mode: 'swim', t: 0, look: 0, flee: 0, back: 0, seed: rng() * 100,
    })),
    still: 0, splashT: 10 + rng() * 20, slot: 0, hold: false, splashes: 0, surfacings: 0, sinkings: 0,
  };
  const fwd = new THREE.Vector3(), aim = new THREE.Vector3(), ppos = { x: 0, y: 0, z: 0 };
  const cam = camera.position;
  function splashAt(x, z, strength, t, sound) {
    const u = splashU[S.slot]; S.slot = (S.slot + 1) % 3;
    u.set(x, z, t, strength); S.splashes++;
    if (sound && hyp(cam.x - x, cam.z - z) < 70) { ppos.x = x; ppos.y = WY; ppos.z = z; ctx.audio?.cue?.('tarn-step', ppos); }
  }
  function respawn(sh) {
    // back from somewhere under the roof, east or west of the hole
    const side = rng() < 0.5 ? -1 : 1;
    sh.x = CX + side * (18 + rng() * 14); sh.z = CZ + (rng() - 0.5) * 18; sh.h = side > 0 ? Math.PI : 0; sh.mode = 'swim'; sh.near = 0; sh.back = 0;
  }
  function pickSurfacer() {
    camera.getWorldDirection(fwd);
    let best = null, bs = -1;
    for (const sh of S.shapes) {
      if (sh.mode !== 'swim' || naveEdge(sh.x, sh.z) > -2) continue;
      aim.set(sh.x - cam.x, WY - cam.y, sh.z - cam.z).normalize();
      const d = fwd.dot(aim);
      if (d > bs) { bs = d; best = sh; }
    }
    return bs > 0.75 ? best : null;
  }
  function surface(sh, t) { sh.mode = 'surface'; sh.t = 0; S.surfacings++; splashAt(sh.x, sh.z, 0.35, t, false); }
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), p4 = new THREE.Vector3(), s4 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function update(dt, t) {
    WU.uT.value = t;
    if (ctx.scene.fog) skyU.copy(ctx.scene.fog.color).multiplyScalar(2.2);
    if (S.hold) return;
    dt = Math.min(dt, 0.5);
    const pd = hyp(cam.x - CX, cam.z - CZ);
    // standing still near the rim
    if (pd < 32 && !player.moving) S.still += dt; else S.still = Math.max(0, S.still - dt * 3);
    camera.getWorldDirection(fwd);
    let anyUp = false;
    for (let i = 0; i < 3; i++) {
      const sh = S.shapes[i];
      if (sh.mode === 'swim') {
        // wander slowly, kept in the water and drawn back toward the hole when far under the roof
        const w = SN.noise2(t * 0.04 + sh.seed, sh.seed) * 0.5;
        let want = sh.h + w * dt * 2;
        const dx = CX - sh.x, dz = CZ - sh.z, dc = hyp(dx, dz);
        if (dc > 16 && !sh.flee) want = sh.h + clamp(angDiff(Math.atan2(dz, dx), sh.h), -1, 1) * dt * 0.35;
        if (!inWater(sh.x + Math.cos(sh.h) * 3, sh.z + Math.sin(sh.h) * 3)) want = sh.h + clamp(angDiff(Math.atan2(dz, dx), sh.h), -1, 1) * dt * 1.2;
        sh.h = want;
        // round the columns, not through them
        const k = Math.round((sh.x - CX) / NAVE.bay), cx = CX + k * NAVE.bay;
        for (const rz of NAVE.rows) {
          const ex = sh.x - cx, ez = sh.z - (CZ + rz), d = hyp(ex, ez);
          if (d < 1.7 && d > 1e-3) { sh.x = cx + (ex / d) * 1.7; sh.z = CZ + rz + (ez / d) * 1.7; }
        }
        // and round the cone where it stands out of the water
        { const ex = sh.x - CONE.x, ez = sh.z - CONE.z, d = hyp(ex, ez); if (d < 7.6 && d > 1e-3) { sh.x = CONE.x + (ex / d) * 7.6; sh.z = CONE.z + (ez / d) * 7.6; } }
        const v = sh.flee > 0 ? 1.1 : sh.v;
        sh.x += Math.cos(sh.h) * v * dt; sh.z += Math.sin(sh.h) * v * dt;
        // looked at straight on (within ~12 degrees) for long, it sinks away and makes for the dark under the roof
        aim.set(sh.x - cam.x, WY - cam.y, sh.z - cam.z);
        const al = aim.length() || 1, ang = Math.acos(clamp(fwd.dot(aim) / al, -1, 1));
        if (pd < 45 && ang < 0.21 && naveEdge(sh.x, sh.z) < 1) sh.look += dt; else sh.look = Math.max(0, sh.look - dt);
        if (sh.look > 1.6 && !sh.flee) { sh.flee = 7; sh.look = 0; S.sinkings++; sh.h = sh.x > CX ? 0 : Math.PI; }
        if (sh.flee > 0) sh.flee = Math.max(0, sh.flee - dt);
        sh.near = approach(sh.near, sh.flee > 0 ? 0.05 : 0.55 + 0.3 * Math.sin(t * 0.13 + sh.seed), sh.flee > 0 ? 1.2 : 0.3, dt);
      } else if (sh.mode === 'surface') {
        // the back comes up, holds, and goes down: 1 s, 1.4 s, 1 s; then it is gone a while
        sh.t += dt;
        if (sh.t > 3.4) { sh.mode = 'gone'; sh.t = 0; sh.near = 0; splashAt(sh.x, sh.z, 0.8, t, true); }
        else { anyUp = true; sh.near = 1; sh.x += Math.cos(sh.h) * 0.25 * dt; sh.z += Math.sin(sh.h) * 0.25 * dt; }
      } else if (sh.mode === 'gone') {
        sh.t += dt; sh.near = 0;
        if (sh.t > 40) respawn(sh);
      }
      shapeU[i].set(sh.x, sh.z, -sh.h, sh.near);
      sizeU[i].set(sh.len, sh.wid);
    }
    // stand still long enough and one surfaces where you are looking
    if (S.still > 20) { const sh = pickSurfacer(); if (sh) { surface(sh, t); S.still = 0; } }
    // now and then a splash: in the hole if one is there, else somewhere under the roof, heard and not seen
    if ((S.splashT -= dt) <= 0) {
      S.splashT = 22 + rng() * 34;
      let sh = S.shapes.find((s) => s.mode === 'swim' && naveEdge(s.x, s.z) < 0);
      if (!sh) sh = S.shapes.find((s) => s.mode === 'swim');
      if (sh) { splashAt(sh.x + Math.cos(sh.h) * sh.len * 0.6, sh.z + Math.sin(sh.h) * sh.len * 0.6, 1, t, true); sh.flick = 0.6; }
    }
    // pose the backs that are up (and the flick of a splash)
    let shown = 0;
    for (let i = 0; i < 3; i++) {
      const sh = S.shapes[i];
      let rise = -1;
      if (sh.mode === 'surface') rise = sh.t < 1 ? smoothstep(0, 1, sh.t) : sh.t < 2.4 ? 1 : 1 - smoothstep(2.4, 3.4, sh.t);
      if (sh.flick > 0) { sh.flick -= dt; rise = Math.max(rise, Math.sin((1 - sh.flick / 0.6) * Math.PI) * 0.6); }
      if (rise <= 0) { s4.set(1e-3, 1e-3, 1e-3); p4.set(sh.x, WY - 5, sh.z); }
      else { shown++; s4.set(sh.wid, 0.42, sh.len); p4.set(sh.x, WY - 0.36 + rise * 0.3, sh.z); }
      q4.setFromAxisAngle(up, Math.PI / 2 - sh.h);
      shapesMesh.setMatrixAt(i, m4.compose(p4, q4, s4));
    }
    shapesMesh.visible = shown > 0 || anyUp;
    if (shapesMesh.visible) shapesMesh.instanceMatrix.needsUpdate = true;
  }
  ctx.registerUpdate(update, { pos: { x: CX, z: CZ }, near: 80, hz: 2, r: 30 });

  const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const stats = () => ({ calls: 2 + (shapesMesh.visible ? 1 : 0), tris: Math.round(tris(hallGeo) + 2 + (shapesMesh.visible ? 3 * tris(sgeo) : 0)), hall: Math.round(tris(hallGeo)), lip: lipTris, columns: columns.length, slabs: SLABS.length, colliders, terrainCut: cut });
  ctx.nave = {
    state: S, stats, columns, cone: CONE, figure: { x: fx, z: fz }, rim: naveRim, edge: naveEdge,
    // test hooks: a splash at shape i (or at (x, z)), shape i surfacing now, shape i placed at (x, z), hold the life still
    splash(i = 0, x, z) { const sh = S.shapes[i]; splashAt(x ?? sh.x, z ?? sh.z, 1, WU.uT.value, true); sh.flick = 0.6; return { x: x ?? sh.x, z: z ?? sh.z }; },
    surface(i = 0) { surface(S.shapes[i], WU.uT.value); },
    place(i, x, z, h = 0) { const sh = S.shapes[i]; sh.x = x; sh.z = z; sh.h = h; sh.mode = 'swim'; sh.near = 0.8; shapeU[i].set(x, z, -h, 0.8); },
    hold(on = true) { S.hold = on; },
  };
  ctx.log?.(`nave: ${columns.length} columns, ${SLABS.length} slabs, hall ${Math.round(tris(hallGeo))} tris (lip ${lipTris}), ${cut} terrain triangles cut, ${colliders} colliders, ${(performance.now() - t0).toFixed(0)} ms`);
}
