// Geometry helpers for vegetation: a growable vertex builder, tubes along a spine, small maths.
import * as THREE from 'three';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Accumulates an indexed triangle mesh with position, normal, color, uv and optional extra scalar attributes.
export class GeoBuilder {
  constructor(extras = []) {
    this.p = []; this.n = []; this.c = []; this.uv = []; this.idx = [];
    this.extras = {}; for (const e of extras) this.extras[e] = [];
  }
  get count() { return this.p.length / 3; }
  vert(x, y, z, nx, ny, nz, r, g, b, u = 0, v = 0, ex = null) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(r, g, b); this.uv.push(u, v);
    for (const k in this.extras) this.extras[k].push(ex && ex[k] !== undefined ? ex[k] : 0);
    return this.count - 1;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  quad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }
  build({ flat = false } = {}) {
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    for (const k in this.extras) g.setAttribute(k, new THREE.Float32BufferAttribute(this.extras[k], 1));
    g.setIndex(this.idx);
    if (flat) { g = g.toNonIndexed(); g.computeVertexNormals(); }
    g.computeBoundingSphere();
    return g;
  }
}

const _t = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _ref = new THREE.Vector3();
// A tube along spine points [{x,y,z,r}], `sides` around. colorFn(i, t) -> [r,g,b]. Caps the tip with a point.
// u runs u0..u1 around the tube; v runs with length along the spine (vPerMetre).
export function tube(gb, pts, sides, colorFn, { capTip = true, u0 = 0, u1 = 1, vPerMetre = 0.5, v0 = 0, ex = null } = {}) {
  const rings = [];
  let prevA = null, len = v0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q0 = pts[Math.max(0, i - 1)], q1 = pts[Math.min(pts.length - 1, i + 1)];
    _t.set(q1.x - q0.x, q1.y - q0.y, q1.z - q0.z).normalize();
    if (!prevA) {
      _ref.set(0, 1, 0); if (Math.abs(_t.y) > 0.9) _ref.set(1, 0, 0);
      _a.crossVectors(_t, _ref).normalize();
    } else {
      // parallel transport: project previous a onto the plane normal to t
      _a.copy(prevA).addScaledVector(_t, -prevA.dot(_t)).normalize();
    }
    _b.crossVectors(_t, _a).normalize();
    prevA = prevA || new THREE.Vector3(); prevA.copy(_a);
    if (i > 0) { const q = pts[i - 1]; len += Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) * vPerMetre; }
    const ring = [];
    const col = colorFn(i, i / (pts.length - 1));
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * Math.PI * 2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const nx = _a.x * ca + _b.x * sa, ny = _a.y * ca + _b.y * sa, nz = _a.z * ca + _b.z * sa;
      const rr = p.r * (p.wob ? 1 + p.wob * Math.sin(ang * 3 + i) : 1);
      ring.push(gb.vert(p.x + nx * rr, p.y + ny * rr, p.z + nz * rr, nx, ny, nz, col[0], col[1], col[2], u0 + (u1 - u0) * (s / sides), len, ex));
    }
    rings.push(ring);
  }
  for (let i = 0; i < rings.length - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    for (let s = 0; s < sides; s++) {
      const s1 = (s + 1) % sides;
      gb.quad(A[s], B[s], B[s1], A[s1]);
    }
  }
  if (capTip) {
    const last = pts[pts.length - 1];
    const col = colorFn(pts.length - 1, 1);
    const tip = gb.vert(last.x + _t.x * last.r * 1.5, last.y + _t.y * last.r * 1.5, last.z + _t.z * last.r * 1.5, _t.x, _t.y, _t.z, col[0], col[1], col[2], (u0 + u1) / 2, len, ex);
    const R = rings[rings.length - 1];
    for (let s = 0; s < sides; s++) gb.tri(R[s], R[(s + 1) % sides], tip);
  }
}

// Shared shader snippets.
export const GLSL_HASH = /* glsl */`
  float fpHash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;
// Prevailing west wind: returns a horizontal lean (dimensionless, ~0.1-0.5) at world xz.
export const GLSL_WIND = /* glsl */`
  vec2 fpWind(vec2 p, float t) {
    float gust = sin(p.x * 0.045 - t * 1.6 + sin(p.y * 0.031 + t * 0.21) * 2.0) * 0.5 + 0.5;
    gust = gust * gust * gust;
    float g2 = sin(p.x * 0.13 - t * 2.9 + p.y * 0.07) * 0.5 + 0.5;
    float sway = sin(t * 2.3 + p.x * 0.71 + p.y * 0.93) * 0.6 + sin(t * 3.7 + p.y * 1.31 - p.x * 0.4) * 0.4;
    vec2 dir = normalize(vec2(1.0, 0.3 * sin(t * 0.13 + p.y * 0.011)));
    float s = 0.10 + gust * 0.32 + g2 * 0.06 + sway * 0.05 * (0.6 + gust);
    return dir * s + vec2(-dir.y, dir.x) * sway * 0.035;
  }
`;
// Lambert/Standard double-sided materials flip the normal on back faces; for foliage and grass
// with up-bent normals that makes the back faces black. This undoes the flip.
export function unflipNormals(shader) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);');
}

// Fisher-Yates in place on a typed or plain array range.
export function shuffleRange(arr, start, end, rng) {
  for (let i = end - 1; i > start; i--) {
    const j = start + Math.floor(rng() * (i - start + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
}

// Three's BatchedMesh applies its per-instance matrix after `transformed`, so the atmosphere's
// vFogWorldPos (modelMatrix * transformed) would sit at the batch origin. Recompute it with the batching matrix.
export function fogBatchFix(shader) {
  shader.vertexShader = shader.vertexShader.replace('#include <fog_vertex>', `#include <fog_vertex>
  #if defined( USE_FOG ) && defined( USE_BATCHING )
    vFogWorldPos = (modelMatrix * batchingMatrix * vec4(transformed, 1.0)).xyz;
  #endif`);
}
