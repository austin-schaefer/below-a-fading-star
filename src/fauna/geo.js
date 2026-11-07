// Geometry helpers for fauna: a small mesh builder (lofted tubes, blobs, membrane strips) and a
// MeshStandardMaterial patch that flaps wings in the vertex shader, per instance.
import * as THREE from 'three';

export class Mesher {
  constructor() { this.p = []; this.w = []; this.i = []; }
  get n() { return this.p.length / 3; }
  v(x, y, z, w = 0) { this.p.push(x, y, z); this.w.push(w); return this.n - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }

  // Tube along points [[x,y,z],...]; radii[k] is a number or [side, up]. wFn: number or (point)=>weight.
  loft(pts, radii, sides = 6, wFn = 0, cap = true) {
    const rings = [];
    const wf = typeof wFn === 'function' ? wFn : () => wFn;
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let rx = 0, ry = 1, rz = 0;
      if (Math.abs(ty) > 0.95) { rx = 0; ry = 0; rz = 1; }
      // u = ref x t, v = t x u
      let ux = ry * tz - rz * ty, uy = rz * tx - rx * tz, uz = rx * ty - ry * tx;
      const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      const r = radii[k]; const rs = Array.isArray(r) ? r[0] : r, ru = Array.isArray(r) ? r[1] : r;
      const ring = [];
      for (let s = 0; s < sides; s++) {
        const an = (s / sides) * Math.PI * 2, c = Math.cos(an) * rs, sn = Math.sin(an) * ru;
        const x = pts[k][0] + ux * c + vx * sn, y = pts[k][1] + uy * c + vy * sn, z = pts[k][2] + uz * c + vz * sn;
        ring.push(this.v(x, y, z, wf([x, y, z])));
      }
      rings.push(ring);
    }
    for (let k = 0; k < rings.length - 1; k++) {
      for (let s = 0; s < sides; s++) {
        const s1 = (s + 1) % sides;
        this.quad(rings[k][s], rings[k][s1], rings[k + 1][s1], rings[k + 1][s]);
      }
    }
    if (cap) {
      const e = pts[pts.length - 1], b = pts[0];
      const ce = this.v(e[0], e[1], e[2], wf(e)), cb = this.v(b[0], b[1], b[2], wf(b));
      const last = rings[rings.length - 1], first = rings[0];
      for (let s = 0; s < sides; s++) {
        const s1 = (s + 1) % sides;
        this.tri(last[s], last[s1], ce);
        this.tri(first[s1], first[s], cb);
      }
    }
  }

  // Ellipsoid elongated along z (ends are points).
  blob(cx, cy, cz, rx, ry, rz, sides = 8, rings = 6, w = 0) {
    const pts = [], rad = [];
    for (let k = 0; k <= rings; k++) {
      const ph = (k / rings) * Math.PI;
      pts.push([cx, cy, cz - Math.cos(ph) * rz]);
      const s = Math.max(Math.sin(ph), 0.001);
      rad.push([rx * s, ry * s]);
    }
    this.loft(pts, rad, sides, w, false);
  }

  // Membrane between two edge polylines L and T (same length), with `chord` layers and camber drooping to T.
  strip(L, T, chord, camber, wFn, flip = false) {
    const rows = [];
    for (let k = 0; k < L.length; k++) {
      const row = [];
      for (let m = 0; m <= chord; m++) {
        const f = m / chord;
        const x = L[k][0] + (T[k][0] - L[k][0]) * f;
        const y = L[k][1] + (T[k][1] - L[k][1]) * f - camber * f * (1 - f * 0.5);
        const z = L[k][2] + (T[k][2] - L[k][2]) * f;
        row.push(this.v(x, y, z, wFn(x, y, z)));
      }
      rows.push(row);
    }
    for (let k = 0; k < rows.length - 1; k++) for (let m = 0; m < chord; m++)
      (flip ? this.quad(rows[k][m], rows[k][m + 1], rows[k + 1][m + 1], rows[k + 1][m]) : this.quad(rows[k][m], rows[k + 1][m], rows[k + 1][m + 1], rows[k][m + 1]));
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('aW', new THREE.Float32BufferAttribute(this.w, 1));
    g.setIndex(this.i);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

// Wing flapping in the vertex shader. Per-vertex aW (0 body .. 1 wingtip); per-instance aFlap (radians,
// positive raises the tips) and aFold (0 spread .. 1 tucked against the body).
export function flapMaterial(params) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aW; attribute float aFlap; attribute float aFold;
        vec3 fpRot(vec3 p, float th) { float c = cos(th), s = sin(th); return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        if (aW > 0.0) objectNormal = fpRot(objectNormal, aFlap * aW * (position.x < 0.0 ? -1.0 : 1.0));`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (aW > 0.0) {
          float sx = position.x < 0.0 ? -1.0 : 1.0;
          transformed.x *= mix(1.0, 0.2, aFold);
          transformed = fpRot(transformed, aFlap * aW * sx);
        }`);
  };
  return m;
}

export function flapInstanced(geometry, material, count) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const flap = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  const fold = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  flap.setUsage(THREE.DynamicDrawUsage); fold.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aFlap', flap); geometry.setAttribute('aFold', fold);
  mesh.frustumCulled = false;
  return { mesh, flap, fold };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
