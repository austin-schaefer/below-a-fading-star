// Geometry toolkit for the ruins: a builder that merges many small weathered primitives into one
// BufferGeometry per site, with the per-vertex attributes the stone shader reads:
//   aMuv  (vec2)  masonry coordinates in metres (course lines follow these)
//   aAux  (vec4)  x: course height (0 = no mortar), y: moss/lichen, z: iron (1 = rusted metal), w: wetness
//   aEmit (vec4)  rgb glow colour, w: channel (0 = glyph pulse, 1 = lit window)
//   aLow  (float) height above the ground the part stands on (damp and moss creep up from below)
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// The ground as the terrain mesh actually draws it: the same grid and triangle split as terrain.js's
// PlaneGeometry, linearly interpolated, so things sit on the visible surface rather than the analytic one.
export function makeGround(ctx) {
  const T = ctx.terrain;
  const size = T.size || 1000;
  const segs = ctx.quality === 'low' ? 320 : 480;
  const cell = size / segs, half = size / 2, n1 = segs + 1;
  const cache = new Float32Array(n1 * n1).fill(NaN);
  const hv = (ix, iz) => {
    const k = iz * n1 + ix;
    let h = cache[k];
    if (h !== h) { h = T.heightAt(-half + ix * cell, -half + iz * cell); cache[k] = h; }
    return h;
  };
  function groundAt(x, z) {
    const gx = (x + half) / cell, gz = (z + half) / cell;
    const ix = Math.floor(gx), iz = Math.floor(gz);
    if (ix < 0 || iz < 0 || ix >= segs || iz >= segs) return T.heightAt(x, z);
    const fx = gx - ix, fz = gz - iz;
    if (fx + fz <= 1) {
      const ha = hv(ix, iz), hb = hv(ix, iz + 1), hd = hv(ix + 1, iz);
      return ha + fx * (hd - ha) + fz * (hb - ha);
    }
    const hb = hv(ix, iz + 1), hc = hv(ix + 1, iz + 1), hd = hv(ix + 1, iz);
    return hc + (1 - fx) * (hb - hc) + (1 - fz) * (hd - hc);
  }
  function groundNormal(x, z, out = new THREE.Vector3(), e = 0.5) {
    const hl = groundAt(x - e, z), hr = groundAt(x + e, z), hd = groundAt(x, z - e), hu = groundAt(x, z + e);
    return out.set(hl - hr, 2 * e, hd - hu).normalize();
  }
  // lowest ground under a footprint (for sinking bases so no gap shows on slopes)
  function minGround(x, z, r) {
    let m = groundAt(x, z);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      m = Math.min(m, groundAt(x + Math.cos(a) * r, z + Math.sin(a) * r));
    }
    return m;
  }
  function maxGround(x, z, r) {
    let m = groundAt(x, z);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      m = Math.max(m, groundAt(x + Math.cos(a) * r, z + Math.sin(a) * r));
    }
    return m;
  }
  return { groundAt, groundNormal, minGround, maxGround };
}

// Matrix helper: position, euler (x, y, z, order YXZ by default), scale.
export function mat(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'YXZ') {
  _e.set(rx, ry, rz, order);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}
// Matrix that stands a part on a tilted ground normal, then yaws it.
export function matOnNormal(x, y, z, n, yaw = 0, extra = null) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, n);
  const qy = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  q.multiply(qy);
  if (extra) q.multiply(extra);
  return new THREE.Matrix4().compose(_p.set(x, y, z), q, _s.set(1, 1, 1));
}

export class Builder {
  constructor(noise) {
    this.N2 = noise.noise2;
    this.P = []; this.Nn = []; this.C = []; this.U = []; this.A = []; this.E = []; this.L = []; this.I = [];
    this.count = 0;
  }
  // vector-ish 3D noise from the shared 2D simplex, [-1,1]
  n3(x, y, z) {
    const N2 = this.N2;
    return 0.5 * (N2(x + 0.37 * z, y - 0.53 * z) + N2(z + 0.61 * y + 17.3, x - 0.29 * y - 5.1));
  }

  // --- primitives (local space; each returns a fresh BufferGeometry with an 'muv' attribute) ---

  // Box with chipped edges. chip: how far edges bite in (m). chipTop: only chip edges touching the top.
  box(w, h, d, o = {}) {
    const seg = o.seg || 0.75;
    const sx = Math.min(8, Math.max(1, Math.ceil(w / seg))), sy = Math.min(10, Math.max(1, Math.ceil(h / seg))), sz = Math.min(8, Math.max(1, Math.ceil(d / seg)));
    const g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
    const pos = g.attributes.position, nrm = g.attributes.normal;
    const hx = w / 2, hy = h / 2, hz = d / 2;
    const chip = o.chip || 0, seed = o.seed || 0;
    const muv = new Float32Array(pos.count * 2);
    const ux = o.uvOffset ? o.uvOffset[0] : 0, uy = o.uvOffset ? o.uvOffset[1] : 0;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i));
      // masonry coordinates: courses run horizontally on the vertical faces
      if (ax > 0.5) { muv[i * 2] = z + hz + ux; muv[i * 2 + 1] = y + hy + uy; }
      else if (ay > 0.5) { muv[i * 2] = x + ux; muv[i * 2 + 1] = z; }
      else { muv[i * 2] = x + hx + ux; muv[i * 2 + 1] = y + hy + uy; }
      if (chip > 0) {
        const ex = Math.abs(x) > hx * 0.999, ey = Math.abs(y) > hy * 0.999, ez = Math.abs(z) > hz * 0.999;
        const top = y > hy * 0.999;
        const edges = (ex ? 1 : 0) + (ey ? 1 : 0) + (ez ? 1 : 0);
        if (edges >= 2 && (!o.chipTop || top)) {
          const k = chip * Math.max(0, 0.35 + 0.9 * this.n3(x * 3.1 + seed, y * 3.1, z * 3.1 - seed));
          if (ex) x -= Math.sign(x) * k * (ey || ez ? 1 : 0);
          if (ey) y -= Math.sign(y) * k * 0.8;
          if (ez) z -= Math.sign(z) * k * (ex || ey ? 1 : 0);
          pos.setXYZ(i, x, y, z);
        }
      }
    }
    g.setAttribute('muv', new THREE.BufferAttribute(muv, 2));
    return g;
  }

  // Cylinder / truncated cone. Masonry runs around it.
  cyl(rt, rb, h, radial = 12, hseg = 1, open = false, o = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, radial, hseg, open);
    const pos = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
    const muv = new Float32Array(pos.count * 2);
    const r = (rt + rb) / 2;
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(nrm.getY(i)) > 0.999) {
        muv[i * 2] = pos.getX(i); muv[i * 2 + 1] = pos.getZ(i);
      } else {
        muv[i * 2] = uv.getX(i) * Math.PI * 2 * r; muv[i * 2 + 1] = pos.getY(i) + h / 2;
      }
    }
    if (o.flute) {
      // shallow vertical fluting on the shaft
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(nrm.getY(i)) > 0.5) continue;
        const x = pos.getX(i), z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const f = 1 - o.flute * Math.pow(0.5 + 0.5 * Math.cos(a * (o.flutes || 16)), 2.0);
        pos.setX(i, x * f); pos.setZ(i, z * f);
      }
    }
    g.setAttribute('muv', new THREE.BufferAttribute(muv, 2));
    return g;
  }

  // A curved wall block: annular sector from angle a0..a1, radius rIn..rOut, height y0..y1.
  wedge(a0, a1, rIn, rOut, y0, y1, segA = 2, segY = 1) {
    const g = new THREE.BoxGeometry(1, 1, 1, segA, segY, 1);
    const pos = g.attributes.position, nrm = g.attributes.normal;
    const muv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i) + 0.5, ly = pos.getY(i) + 0.5, lz = pos.getZ(i) + 0.5;
      // angle runs backwards along local x so the mapping keeps the box's winding (tangent, up, radial is left-handed)
      const a = a1 - lx * (a1 - a0), r = rIn + lz * (rOut - rIn), y = y0 + ly * (y1 - y0);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.setXYZ(i, x, y, z);
      const ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
      if (ny > 0.5) { muv[i * 2] = x; muv[i * 2 + 1] = z; }
      else if (nz > 0.5) { muv[i * 2] = a * rOut; muv[i * 2 + 1] = y; }
      else { muv[i * 2] = r; muv[i * 2 + 1] = y; }
    }
    g.setAttribute('muv', new THREE.BufferAttribute(muv, 2));
    return g;
  }

  // A rough rock: faceted icosahedron, squashed. Displace it with o.disp when adding.
  rock(r, detail = 1, sx = 1, sy = 0.7, sz = 1) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    g.scale(sx, sy, sz);
    return g;
  }

  lathe(points, segs = 12) {
    const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const muv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { muv[i * 2] = uv.getX(i) * 4; muv[i * 2 + 1] = pos.getY(i); }
    g.setAttribute('muv', new THREE.BufferAttribute(muv, 2));
    return g;
  }

  extrude(shape, depth, curveSegments = 10) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
    g.translate(0, 0, -depth / 2);
    g.deleteAttribute('uv');
    return g;
  }

  // --- add a primitive, transformed and weathered, into the merged buffers ---
  // o: { color: THREE.Color, course, moss, iron, wet, emit: [r,g,b,ch], ground, disp, dispScale, flat }
  add(g, m, o = {}) {
    if (g.index && o.flat) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    let muv = g.attributes.muv;
    const pos = g.attributes.position;
    if (!muv) {
      // planar masonry coordinates from the local normal
      g.computeVertexNormals();
      const nrm = g.attributes.normal;
      const arr = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
        if (ay >= ax && ay >= az) { arr[i * 2] = pos.getX(i); arr[i * 2 + 1] = pos.getZ(i); }
        else if (ax >= az) { arr[i * 2] = pos.getZ(i); arr[i * 2 + 1] = pos.getY(i); }
        else { arr[i * 2] = pos.getX(i); arr[i * 2 + 1] = pos.getY(i); }
      }
      muv = new THREE.BufferAttribute(arr, 2);
    }
    if (m) g.applyMatrix4(m);
    const disp = o.disp || 0;
    if (disp > 0) {
      const s = o.dispScale || 1.3;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const px = x * s, py = y * s, pz = z * s;
        let dx = this.n3(px, py, pz) + 0.45 * this.n3(px * 2.7 + 3.1, py * 2.7, pz * 2.7);
        let dy = this.n3(py + 31.7, pz, px) + 0.45 * this.n3(py * 2.7 - 7.7, pz * 2.7, px * 2.7);
        let dz = this.n3(pz - 13.1, px, py) + 0.45 * this.n3(pz * 2.7 + 9.3, px * 2.7, py * 2.7);
        pos.setXYZ(i, x + dx * disp, y + dy * disp * (o.dispY ?? 1), z + dz * disp);
      }
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    const base = this.count;
    const c = o.color || WHITE;
    const course = o.course || 0, moss = o.moss ?? 0.6, iron = o.iron || 0, wet = o.wet || 0;
    const em = o.emit || NOEMIT;
    let ground = o.ground;
    if (ground === undefined) { ground = Infinity; for (let i = 0; i < pos.count; i++) ground = Math.min(ground, pos.getY(i)); }
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      this.P.push(pos.getX(i), y, pos.getZ(i));
      this.Nn.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      this.C.push(c.r, c.g, c.b);
      this.U.push(muv.getX(i), muv.getY(i));
      this.A.push(course, moss, iron, wet);
      this.E.push(em[0], em[1], em[2], em[3]);
      this.L.push(y - ground);
    }
    if (g.index) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) this.I.push(ix[i] + base); }
    else for (let i = 0; i < pos.count; i++) this.I.push(base + i);
    this.count += pos.count;
    g.dispose();
  }

  // Average normals of coincident vertices whose normals already nearly agree, so curved walls built
  // from separate blocks shade as one surface while real edges stay hard.
  weldNormals(cosMin = 0.82) {
    const P = this.P, N = this.Nn, n = this.count;
    const map = new Map();
    const q = (v) => Math.round(v * 400);
    for (let i = 0; i < n; i++) {
      const k = q(P[i * 3]) + ',' + q(P[i * 3 + 1]) + ',' + q(P[i * 3 + 2]);
      let l = map.get(k);
      if (!l) { l = []; map.set(k, l); }
      l.push(i);
    }
    const acc = new Float32Array(3);
    for (const l of map.values()) {
      if (l.length < 2) continue;
      for (const i of l) {
        acc[0] = 0; acc[1] = 0; acc[2] = 0;
        for (const j of l) {
          const d = N[i * 3] * N[j * 3] + N[i * 3 + 1] * N[j * 3 + 1] + N[i * 3 + 2] * N[j * 3 + 2];
          if (d >= cosMin) { acc[0] += N[j * 3]; acc[1] += N[j * 3 + 1]; acc[2] += N[j * 3 + 2]; }
        }
        const len = Math.hypot(acc[0], acc[1], acc[2]) || 1;
        this._w = this._w || [];
        this._w.push(i, acc[0] / len, acc[1] / len, acc[2] / len);
      }
    }
    const w = this._w || [];
    for (let k = 0; k < w.length; k += 4) { const i = w[k]; N[i * 3] = w[k + 1]; N[i * 3 + 1] = w[k + 2]; N[i * 3 + 2] = w[k + 3]; }
    this._w = null;
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.P), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.Nn), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.C), 3));
    g.setAttribute('aMuv', new THREE.BufferAttribute(new Float32Array(this.U), 2));
    g.setAttribute('aAux', new THREE.BufferAttribute(new Float32Array(this.A), 4));
    g.setAttribute('aEmit', new THREE.BufferAttribute(new Float32Array(this.E), 4));
    g.setAttribute('aLow', new THREE.BufferAttribute(new Float32Array(this.L), 1));
    g.setIndex(new THREE.BufferAttribute(this.count > 65535 ? new Uint32Array(this.I) : new Uint16Array(this.I), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
  get triangles() { return this.I.length / 3; }
}

const WHITE = new THREE.Color(1, 1, 1);
const NOEMIT = [0, 0, 0, 0];

// Put stone-shader attributes on an ordinary geometry used by an InstancedMesh (pavers, etc.).
export function decorate(g, { course = 0, moss = 0.5, mossFn = null, iron = 0, wet = 0, low = 0.3 } = {}) {
  const n = g.attributes.position.count, pos = g.attributes.position;
  const C = new Float32Array(n * 3).fill(1), U = new Float32Array(n * 2), A = new Float32Array(n * 4), E = new Float32Array(n * 4), L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    U[i * 2] = pos.getX(i); U[i * 2 + 1] = pos.getZ(i);
    A[i * 4] = course; A[i * 4 + 1] = mossFn ? mossFn(pos.getX(i), pos.getY(i), pos.getZ(i)) : moss; A[i * 4 + 2] = iron; A[i * 4 + 3] = wet;
    L[i] = low;
  }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setAttribute('aMuv', new THREE.BufferAttribute(U, 2));
  g.setAttribute('aAux', new THREE.BufferAttribute(A, 4));
  g.setAttribute('aEmit', new THREE.BufferAttribute(E, 4));
  g.setAttribute('aLow', new THREE.BufferAttribute(L, 1));
  return g;
}

export const tmpVec = _v;
export const tmpMat = _m;
