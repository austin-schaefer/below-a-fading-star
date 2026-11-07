// Shared kit for the uncanny inhabitants: a painting mesh builder (vertex colour, metalness, roughness and
// emission per vertex, plus optional named scalar attributes), the material that reads it, an exact
// sampler of the rendered terrain surface, and placement rules.
import * as THREE from 'three';
import { Mesher, clamp } from '../geo.js';

const _c = new THREE.Color();
const _v = new THREE.Vector3();

// Mesher that also writes colour + (metal, rough, emit) per vertex and any declared extra attributes.
export class Painter extends Mesher {
  constructor(extra = []) {
    super();
    this.c = []; this.mr = []; this.col = [1, 1, 1]; this.mre = [0, 0.8, 0];
    this.extraNames = extra; this.extra = {}; this.cur = {};
    for (const n of extra) { this.extra[n] = []; this.cur[n] = 0; }
    this.m = null; // optional Matrix4 applied to every vertex
  }
  paint(hex, metal = 0, rough = 0.85, emit = 0) {
    _c.set(hex); this.col = [_c.r, _c.g, _c.b]; this.mre = [metal, rough, emit]; return this;
  }
  set(name, value) { this.cur[name] = value; return this; }
  xf(m) { this.m = m; return this; }
  v(x, y, z, w = 0) {
    if (this.m) { _v.set(x, y, z).applyMatrix4(this.m); x = _v.x; y = _v.y; z = _v.z; }
    this.c.push(this.col[0], this.col[1], this.col[2]);
    this.mr.push(this.mre[0], this.mre[1], this.mre[2]);
    for (const n of this.extraNames) this.extra[n].push(this.cur[n]);
    return super.v(x, y, z, w);
  }
  // Closed parametric surface: fn(u, v, out[3]) with u wrapping 0..1 (around) and v 0..1 (along).
  // fn may call this.paint() to colour the vertex it is about to make.
  grid(nu, nv, fn, capStart = false, capEnd = false) {
    const p = [0, 0, 0], rows = [];
    for (let j = 0; j <= nv; j++) {
      const row = [];
      for (let i = 0; i < nu; i++) { fn(i / nu, j / nv, p); row.push(this.v(p[0], p[1], p[2])); }
      rows.push(row);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const i1 = (i + 1) % nu;
      this.quad(rows[j][i], rows[j + 1][i], rows[j + 1][i1], rows[j][i1]);
    }
    const cap = (row, flip, vv) => {
      let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < nu; i++) { fn(i / nu, vv, p); cx += p[0]; cy += p[1]; cz += p[2]; }
      const c = this.v(cx / nu, cy / nu, cz / nu);
      for (let i = 0; i < nu; i++) { const i1 = (i + 1) % nu; flip ? this.tri(row[i1], row[i], c) : this.tri(row[i], row[i1], c); }
    };
    if (capStart) cap(rows[0], false, 0);
    if (capEnd) cap(rows[nv], true, 1);
  }
  // Open sheet: fn(u, v, out) over u,v in 0..1 (no wrap), both sides drawn by the material if DoubleSide.
  sheet(nu, nv, fn) {
    const p = [0, 0, 0], rows = [];
    for (let j = 0; j <= nv; j++) {
      const row = [];
      for (let i = 0; i <= nu; i++) { fn(i / nu, j / nv, p); row.push(this.v(p[0], p[1], p[2])); }
      rows.push(row);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) this.quad(rows[j][i], rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1]);
  }
  // Axis-aligned box (separate verts per face so it shades flat), optionally yawed about its centre.
  box(cx, cy, cz, sx, sy, sz, yaw = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (x, y, z) => this.v(cx + x * c + z * s, cy + y, cz - x * s + z * c);
    const F = (a, b, d, e) => { const i0 = P(...a), i1 = P(...b), i2 = P(...d), i3 = P(...e); this.quad(i0, i1, i2, i3); };
    F([-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]);
    F([hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]);
    F([hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]);
    F([-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]);
    F([-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]);
    F([-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]);
  }
  // Solid of revolution about y: profile [[r, y], ...] bottom to top, capped.
  lathe(cx, cy, cz, prof, sides = 12) {
    this.grid(sides, prof.length - 1, (u, v, o) => {
      const k = Math.round(v * (prof.length - 1)), a = u * Math.PI * 2;
      o[0] = cx + Math.cos(a) * prof[k][0]; o[1] = cy + prof[k][1]; o[2] = cz + Math.sin(a) * prof[k][0];
    }, true, true);
  }
  // Ring (torus) of tube radius tr around a circle of radius R in the xz plane at height y.
  ring(cx, cy, cz, R, tr, sides = 24, tsides = 5, sx = 1, sz = 1) {
    const pts = [], rad = [];
    for (let k = 0; k <= sides; k++) { const a = (k / sides) * Math.PI * 2; pts.push([cx + Math.cos(a) * R * sx, cy, cz + Math.sin(a) * R * sz]); rad.push(tr); }
    this.loft(pts, rad, tsides, 0, false);
  }
  geometry() {
    const g = super.geometry();
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aMRE', new THREE.Float32BufferAttribute(this.mr, 3));
    for (const n of this.extraNames) g.setAttribute(n, new THREE.Float32BufferAttribute(this.extra[n], 1));
    return g;
  }
}

// MeshStandardMaterial reading per-vertex metalness/roughness/emission (aMRE). uEmit scales the emission
// (tie it to the lantern or the sun's guttering). `patch(shader)` may further modify the shader.
export function paintedMaterial(params = {}, patch) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, ...params });
  const uEmit = { value: 1 };
  m.userData.uEmit = uEmit;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uEmit = uEmit;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aMRE; varying vec3 vMRE;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMRE = aMRE;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMRE; uniform float uEmit;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMRE.y;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMRE.x;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vMRE.z * uEmit;');
    if (patch) patch(sh);
  };
  return m;
}

// Exact height of the rendered terrain mesh (same triangulation as PlaneGeometry), and its face normal.
export function makeGround(ctx) {
  const T = ctx.terrain;
  const geo = T.mesh.geometry, pos = geo.attributes.position.array;
  const size = T.size || ctx.world.size;
  const segs = geo.parameters?.widthSegments ?? Math.round(Math.sqrt(geo.attributes.position.count)) - 1;
  const half = size / 2, cell = size / segs, row = segs + 1;
  const H = (ix, iy) => pos[(ix + row * iy) * 3 + 1];
  const locate = (x, z) => {
    let gx = (x + half) / cell, gy = (z + half) / cell; // PlaneGeometry rows run +y..-y, i.e. -z..+z after rotateX(-90)
    gx = clamp(gx, 0, segs - 1e-4); gy = clamp(gy, 0, segs - 1e-4);
    const ix = Math.floor(gx), iy = Math.floor(gy);
    return [ix, iy, gx - ix, gy - iy];
  };
  function at(x, z) {
    const [ix, iy, fx, fy] = locate(x, z);
    const ha = H(ix, iy), hb = H(ix, iy + 1), hc = H(ix + 1, iy + 1), hd = H(ix + 1, iy);
    if (fx + fy <= 1) return ha + (hd - ha) * fx + (hb - ha) * fy;
    return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fy);
  }
  function normal(x, z, out) {
    const [ix, iy, fx, fy] = locate(x, z);
    const ha = H(ix, iy), hb = H(ix, iy + 1), hc = H(ix + 1, iy + 1), hd = H(ix + 1, iy);
    // gradient in (gx, gy) cell units; gx runs with +x and gy with +z
    let dgx, dgy;
    if (fx + fy <= 1) { dgx = hd - ha; dgy = hb - ha; } else { dgx = hc - hb; dgy = hc - hd; }
    out.set(-dgx / cell, 1, -dgy / cell).normalize();
    return out;
  }
  return { at, normal };
}

// Where the static inhabitants may stand.
export function makeRules(ctx) {
  const T = ctx.terrain, L = ctx.landmarks;
  const dry = (x, z, margin = 0.3) => { const w = T.waterLevelAt(x, z); return w === null || T.heightAt(x, z) > w + margin; };
  const inKeep = (x, z, r = 46) => Math.hypot(x - L.castle.x, z - L.castle.z) < r;
  const inRegion = (x, z, r = 280) => x * x + z * z < r * r;
  const okFoot = (x, z) => dry(x, z) && !inKeep(x, z) && inRegion(x, z) && T.slopeAt(x, z) < 0.8;
  const okStatic = (x, z) => okFoot(x, z) && T.causewayDistance(x, z) > 6;
  return { dry, inKeep, inRegion, okFoot, okStatic };
}

export const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
export const approach = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
// Turn `cur` toward `target` (radians) by at most maxStep.
export const turnToward = (cur, target, maxStep) => { const d = angDiff(target, cur); return cur + clamp(d, -maxStep, maxStep); };

// Interleaved-gradient dither, used to dissolve things in and out without transparency sorting.
export const DITHER_GLSL = `float fpIGN(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;
