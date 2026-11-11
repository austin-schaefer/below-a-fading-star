// The walking rig for v7's three walkers (the Little Thurifer, the Leerie, the Link-Boy), and only for them: not a
// public kit. A figure is one merged mesh whose vertices each name one or two rigid parts (aP0, aP1, blended by aW1)
// and a hem weight (aHem). The parts' matrices are posed on the CPU into preallocated Matrix4s and read by the vertex
// shader (uParts), and the hem or coat skirt swings in the shader from one uniform (uGait.x), opposite the legs; the
// shadow pass reads the same through a depth material. No skinning library.
//
// The rig: a figure follows a polyline of lead samples by arc length at a speed, feet on the rendered ground, yaw
// eased toward the line's tangent at most MAX_TURN rad/s; a step cycle from the speed (cadence = speed / stride, the
// stride a full cycle of two steps), and per step a vertical bob of 2.5 % of the height, a lateral sway of +-2 degrees
// and the hem swinging; onStep(figure, i) fires at each footfall (i 0 or 1) for the audio pass's cues.
import * as THREE from 'three';
import { Painter, paintedMaterial, makeGround, turnToward, approach } from '../../fauna/uncanny/kit.js';
import { clamp } from '../../noise.js';
import { tag } from '../../v8/livery.js';

export const MAX_TURN = 1.6; // rad/s
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// The ground the figures stand on: the rendered terrain mesh, never under the analytic ground (as v5/lights.js does).
export function standGround(ctx) {
  const MG = makeGround(ctx), T = ctx.terrain;
  const G = (x, z) => Math.max(MG.at(x, z), T.heightAt(x, z));
  G.mesh = MG.at; // the rendered mesh alone: cheap, for draping many vertices
  return G;
}

// A polyline of lead samples ({x, z, s}) by arc length.
export class Track {
  constructor(samples) {
    const S = samples.filter((p, i) => i === 0 || p.s > samples[i - 1].s + 1e-4);
    const n = this.n = S.length;
    this.x = new Float64Array(n); this.z = new Float64Array(n); this.s = new Float64Array(n);
    for (let i = 0; i < n; i++) { this.x[i] = S[i].x; this.z[i] = S[i].z; this.s[i] = S[i].s - S[0].s; }
    this.length = this.s[n - 1];
  }
  seg(s) {
    let lo = 0, hi = this.n - 2;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.s[m] <= s) lo = m; else hi = m - 1; }
    return lo;
  }
  // position and unit tangent at arc length s (clamped), into out {x, z, tx, tz}
  at(s, out) {
    s = clamp(s, 0, this.length);
    const i = this.seg(s), ds = this.s[i + 1] - this.s[i], t = (s - this.s[i]) / ds;
    const dx = this.x[i + 1] - this.x[i], dz = this.z[i + 1] - this.z[i];
    out.x = this.x[i] + dx * t; out.z = this.z[i] + dz * t; out.tx = dx / ds; out.tz = dz / ds;
    return out;
  }
  // the tangent smoothed over +-w metres (the samples wander; a figure's heading should not)
  heading(s, w = 1.5) {
    const a = this.at(s - w, _h0), ax = a.x, az = a.z, b = this.at(s + w, _h0);
    return Math.atan2(b.x - ax, b.z - az);
  }
  // the nearest point to (px, pz): out {s, d}; searches samples i0..i1 (default all)
  project(px, pz, out, i0 = 0, i1 = this.n - 1) {
    let best = Infinity, bs = 0;
    for (let i = Math.max(0, i0); i < Math.min(this.n - 1, i1); i++) {
      const ax = this.x[i], az = this.z[i], ex = this.x[i + 1] - ax, ez = this.z[i + 1] - az, l2 = ex * ex + ez * ez;
      const t = clamp(((px - ax) * ex + (pz - az) * ez) / l2, 0, 1), qx = ax + ex * t - px, qz = az + ez * t - pz, d2 = qx * qx + qz * qz;
      if (d2 < best) { best = d2; bs = this.s[i] + (this.s[i + 1] - this.s[i]) * t; }
    }
    out.s = bs; out.d = Math.sqrt(best);
    return out;
  }
}
const _h0 = { x: 0, z: 0, tx: 0, tz: 0 };

// The step cycle. stride(v) is the length of one full cycle (two steps) at speed v.
export class Gait {
  constructor(figure, height, stride, onStep) {
    this.figure = figure; this.H = height; this.stride = stride; this.onStep = onStep;
    this.phase = 0; this.m = 0; this.s1 = 0; this.bob = 0; this.roll = 0;
  }
  advance(dt, v) {
    this.m = approach(this.m, v > 0.04 ? clamp(v / 0.35, 0, 1) : 0, 7, dt);
    if (v > 0.01) {
      const p0 = this.phase, p1 = p0 + (v * dt) / this.stride(v);
      if (Math.floor(p1 * 2) !== Math.floor(p0 * 2)) this.onStep?.(this.figure, Math.floor(p1 * 2) & 1);
      this.phase = p1 % 1;
    }
    const a = this.phase * TAU;
    this.s1 = Math.sin(a) * this.m;                                      // +1: the left leg forward
    this.bob = this.H * 0.025 * this.m * (0.5 - 0.5 * Math.cos(2 * a)); // lowest at each footfall
    this.roll = 2 * DEG * this.s1;                                       // the weight over the leg in stance
    return this;
  }
}

// Yaw eased toward a target at most MAX_TURN rad/s.
export const easeYaw = (yaw, target, dt, rate = MAX_TURN) => turnToward(yaw, target, rate * dt);

// The figure's painter: extra attributes for the parts and the hem.
export function figurePainter() {
  const P = new Painter(['aP0', 'aP1', 'aW1', 'aHem']);
  P.part = (a, b = a, w = 0) => { P.set('aP0', a); P.set('aP1', b); P.set('aW1', w); return P; };
  P.hem = (w) => { P.set('aHem', w); return P; };
  return P;
}

// The material (painted, per-vertex metal/rough/emission) and its depth twin, both posed by uParts.
function patchVertex(src, nParts, normals) {
  const decl = `attribute float aP0; attribute float aP1; attribute float aW1; attribute float aHem; uniform mat4 uParts[${nParts}]; uniform vec4 uGait;`;
  const M = 'mat4 fpM = uParts[int(aP0 + 0.5)] * (1.0 - aW1) + uParts[int(aP1 + 0.5)] * aW1;';
  const move = `
    transformed.z += aHem * uGait.x * clamp(transformed.x * 9.0, -1.0, 1.0); // each side of the hem with its leg, opposite
    transformed.x += aHem * uGait.y;
    transformed = (fpM * vec4(transformed, 1.0)).xyz;`;
  src = src.replace('#include <common>', `#include <common>\n${decl}`);
  if (normals) {
    src = src.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${M}\nobjectNormal = normalize(mat3(fpM) * objectNormal);`);
    src = src.replace('#include <begin_vertex>', `#include <begin_vertex>\n${move}`);
  } else src = src.replace('#include <begin_vertex>', `#include <begin_vertex>\n${M}\n${move}`);
  return src;
}
export function figureMaterial(nParts) {
  const uParts = { value: Array.from({ length: nParts }, () => new THREE.Matrix4()) };
  const uGait = { value: new THREE.Vector4() };
  const mat = paintedMaterial({}, (sh) => {
    sh.uniforms.uParts = uParts; sh.uniforms.uGait = uGait;
    sh.vertexShader = patchVertex(sh.vertexShader, nParts, true);
  });
  mat.customProgramCacheKey = () => `v7-walker-${nParts}`;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (sh) => {
    sh.uniforms.uParts = uParts; sh.uniforms.uGait = uGait;
    sh.vertexShader = patchVertex(sh.vertexShader, nParts, false);
  };
  depth.customProgramCacheKey = () => `v7-walker-depth-${nParts}`;
  return { mat, depth, parts: uParts.value, gait: uGait.value };
}

// One figure's mesh from its painter: its own bounding sphere (the parts reach beyond the rest pose), casting.
export function figureMesh(P, nParts, name, centerY, radius) {
  const geo = P.geometry();
  geo.deleteAttribute('aW');
  tag(geo, P, 'heliarch'); // v8-06: the livery's record, for its test
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, centerY, 0), radius);
  const M = figureMaterial(nParts);
  const mesh = new THREE.Mesh(geo, M.mat);
  mesh.customDepthMaterial = M.depth;
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name;
  return { mesh, parts: M.parts, gait: M.gait, mat: M.mat, tris: geo.index.count / 3 };
}

// Posing helpers, all into preallocated objects.
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _t = new THREE.Matrix4(), _u = new THREE.Matrix4();
// out = base * T(px,py,pz) * R(rx, ry, rz, 'YXZ') * T(-px,-py,-pz) (a rotation about a pivot, in base's frame)
export function about(out, base, px, py, pz, rx, ry = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  _t.makeRotationFromQuaternion(_q);
  const e = _t.elements;
  // translation part: p - R p
  e[12] = px - (e[0] * px + e[4] * py + e[8] * pz);
  e[13] = py - (e[1] * px + e[5] * py + e[9] * pz);
  e[14] = pz - (e[2] * px + e[6] * py + e[10] * pz);
  return out.multiplyMatrices(base, _t);
}
// the root of a figure: the bob up and the sway about the forward axis at the feet
export function rootMatrix(out, bob, roll) {
  _e.set(0, 0, roll, 'YXZ'); _q.setFromEuler(_e);
  out.makeRotationFromQuaternion(_q); out.elements[13] = bob;
  return out;
}
// out = T(at) * R * T(-pivot): a part hung from a point that moves with another part, keeping its own orientation
export function hang(out, ax, ay, az, px, py, pz, rx, ry = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e);
  out.makeRotationFromQuaternion(_q);
  const e = out.elements;
  e[12] = ax - (e[0] * px + e[4] * py + e[8] * pz);
  e[13] = ay - (e[1] * px + e[5] * py + e[9] * pz);
  e[14] = az - (e[2] * px + e[6] * py + e[10] * pz);
  return out;
}
// a point (x, y, z) through matrix m, into out (Vector3)
export function point(out, m, x, y, z) { return out.set(x, y, z).applyMatrix4(m); }
export { _u as scratchMatrix };
