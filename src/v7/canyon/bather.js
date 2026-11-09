// CE The Bather's forms: the woman reclining in the canyon's pool and the long pale stones that lie where her masses
// lie. Both are one smooth surface each, built by surface nets (nets.js) from a skeleton of tapered capsules, and
// share one material (the stone): pale, polished, a soft wrap so the low sun reads round her shoulders, dark below the
// waterline, a foam line where she meets the water and a foam ring on the water round her (a strip of the same mesh,
// cut out of a plane by the 2D field at the water's level). The Brâncuși end of the figure: a smooth ovoid head with no
// features, a long neck, shoulders, one arm raised across her and its mitten hand washing the other arm, which lies
// along the water; the hair a few long flat lobes on the water; the rest lost in the water's dark. No face, no detail.
//
// Local frame: u along her length (+ toward the head, upstream), v across (+ toward the rim's side), y up from the
// water's surface. canyon.js maps it into the world (mesh-local axes, the water's fall along her length as a shear).
import * as THREE from 'three';
import { capsule, smin, surfaceNets } from './nets.js';
import { DITHER_GLSL } from '../../fauna/uncanny/kit.js';

// ---------------------------------------------------------------- the skeleton (metres; [u, y, v])
const BODY = [
  // torso, wide across (v) and shallow front to back (y): she lies back in the water
  [[2.55, 0.0, 0], [1.6, -0.25, 0], 0.82, 0.72, 0.55],
  [[1.6, -0.25, 0], [0.6, -0.45, 0], 0.68, 0.62, 0.55],
  [[0.6, -0.45, 0], [0.1, -0.52, 0], 0.78, 0.74, 0.55],
  // the line of the shoulders, the long neck, the head (an egg, inclined down toward the arm she washes)
  [[2.62, 0.04, -0.95], [2.62, 0.04, 0.95], 0.3, 0.3, 1],
  [[2.75, 0.18, 0], [3.3, 0.62, 0.06], 0.21, 0.18, 1],
  [[3.72, 0.98, -0.1], [3.35, 0.75, 0.15], 0.36, 0.26, 1],
  // the near knee drawn up to the surface, the far leg long in the water
  [[0.1, -0.5, 0.42], [-1.75, 0.12, 0.5], 0.44, 0.3, 1],
  [[-1.75, 0.12, 0.5], [-3.6, -0.55, 0.45], 0.28, 0.16, 1],
  [[-3.6, -0.55, 0.45], [-3.95, -0.42, 0.45], 0.15, 0.12, 1],
  [[0.1, -0.55, -0.42], [-1.9, -0.6, -0.45], 0.44, 0.3, 1],
  [[-1.9, -0.6, -0.45], [-3.7, -0.7, -0.4], 0.27, 0.16, 1],
  [[-3.7, -0.7, -0.4], [-4.05, -0.56, -0.4], 0.15, 0.12, 1],
  // the washed arm, lying along the water on the near side, its hand a smooth mitten
  [[2.62, 0.04, 1.0], [1.3, -0.05, 1.65], 0.24, 0.19, 1],
  [[1.3, -0.05, 1.65], [0.15, -0.02, 2.0], 0.18, 0.14, 1],
  [[0.15, -0.02, 2.0], [-0.4, -0.02, 2.1], 0.13, 0.1, 0.62],
];
const HAIR = [
  // from the back of the head down to the water, then flat lobes spread on it, drawn back along the far shoulder by the current
  [[3.85, 0.8, -0.15], [4.2, 0.06, -0.22], 0.3, 0.28, 1],
  [[4.15, 0.03, -0.2], [5.4, 0.03, -0.9], 0.38, 0.18, 0.2],
  [[4.0, 0.03, -0.3], [3.4, 0.03, -1.55], 0.36, 0.22, 0.2],
  [[3.4, 0.03, -1.55], [2.1, 0.03, -1.9], 0.22, 0.1, 0.2],
  [[4.1, 0.03, 0.05], [5.0, 0.03, 0.6], 0.3, 0.12, 0.2],
];
// the raised arm: from the far shoulder across her, the elbow high, the forearm down to a hand over the washed arm
export const ARM = { shoulder: [2.62, 0.08, -0.95], elbow: [2.05, 1.05, 0.35], wrist: [1.55, 0.5, 1.38], hand: [1.42, 0.4, 1.7] };
const ARM_PARTS = [
  [ARM.shoulder, ARM.elbow, 0.23, 0.18, 1],
  [ARM.elbow, ARM.wrist, 0.17, 0.13, 1],
  [ARM.wrist, ARM.hand, 0.13, 0.1, 0.62],
];
// the stroke: the forearm turns about the elbow so the hand moves along the washed arm toward its wrist and back
export const STROKE = { period: 8, angle: 0.5, travel: [-1, 0, 0.32] };
// the stones: where her masses lie (the head, a shoulder, the raised arm fallen along the water, the hip, the knee, the long leg)
const STONES = [
  [[3.95, 0.1, -0.05], [3.35, 0.1, 0.2], 0.46, 0.42, 0.85],
  [[2.75, 0.06, -0.9], [2.1, 0.06, -0.5], 0.48, 0.44, 0.8],
  [[2.3, 0.08, 1.05], [0.2, 0.08, 1.85], 0.3, 0.22, 0.9],
  [[0.9, 0.04, -0.2], [-0.3, 0.04, 0.1], 0.64, 0.6, 0.72],
  [[-1.3, 0.1, 0.45], [-2.2, 0.1, 0.5], 0.42, 0.36, 0.92],
  [[-2.9, 0.02, -0.35], [-3.9, 0.02, -0.4], 0.34, 0.26, 0.8],
];
export const STONE_PARTS = STONES;

const partsField = (parts, k) => (u, y, v) => {
  let d = 1e9;
  for (const [A, B, ra, rb, fy] of parts) d = smin(d, capsule(u, y, v, A, B, ra, rb, fy), k);
  return d;
};
const bodyF = partsField(BODY, 0.22), hairF = partsField(HAIR, 0.18), armF = partsField(ARM_PARTS, 0.12), stonesRaw = partsField(STONES, 0);
// the stones are water-worn, not turned: a slow wobble over each, flatter where the river has worn their tops
const stonesF = (u, y, v) => stonesRaw(u, y, v) + 0.05 * Math.sin(u * 2.3 + v * 1.1) * Math.sin(v * 2.9 - u * 0.7 + 1.3) + 0.035 * Math.sin(u * 5.1 - y * 3.0 + v * 4.3) + Math.max(0, y - 0.3) * 0.25;
const SH = ARM.shoulder;
// the raised arm joins the body softly at the shoulder only, so its hand stays its own over the washed arm
function batherField(u, y, v) {
  const a = smin(bodyF(u, y, v), hairF(u, y, v), 0.2);
  const ds = Math.hypot(u - SH[0], y - SH[1], v - SH[2]);
  return smin(a, armF(u, y, v), 0.28 * Math.max(0, 1 - ds / 0.9));
}

// the 2D field at the water's level -> a strip of quads round the waterline (the foam ring on the water)
function ringStrip(field, box, step, y0) {
  const nu = Math.ceil((box.x1 - box.x0) / step), nv = Math.ceil((box.z1 - box.z0) / step);
  const S = new Float32Array((nu + 1) * (nv + 1));
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) S[j * (nu + 1) + i] = field(box.x0 + i * step, 0, box.z0 + j * step);
  const pos = [], sdf = [], idx = [], map = new Int32Array(S.length).fill(-1);
  const vert = (i, j) => { const k = j * (nu + 1) + i; if (map[k] < 0) { map[k] = pos.length / 3; pos.push(box.x0 + i * step, y0, box.z0 + j * step); sdf.push(S[k]); } return map[k]; };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = S[j * (nu + 1) + i], b = S[j * (nu + 1) + i + 1], c = S[(j + 1) * (nu + 1) + i + 1], d = S[(j + 1) * (nu + 1) + i];
    const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
    if (hi < -0.02 || lo > 0.55) continue; // only the band round the waterline
    const A = vert(i, j), B = vert(i + 1, j), C = vert(i + 1, j + 1), D = vert(i, j + 1);
    idx.push(A, D, C, A, C, B);
  }
  return { pos, sdf, idx };
}

// One geometry: the surface (weights for the stroke) and the ring strip, mapped through toWorld(u, y, v) -> [x, y, z].
function assemble(surf, ring, toWorld, frame, weightAt, tint) {
  const nS = surf.count, nR = ring.pos.length / 3, n = nS + nR;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), Cc = new Float32Array(n * 3), W = new Float32Array(n), R = new Float32Array(n), D = new Float32Array(n);
  const put = (i, u, y, v) => { const w = toWorld(u, y, v); P[i * 3] = w[0]; P[i * 3 + 1] = w[1]; P[i * 3 + 2] = w[2]; };
  for (let i = 0; i < nS; i++) {
    const u = surf.position[i * 3], y = surf.position[i * 3 + 1], v = surf.position[i * 3 + 2];
    put(i, u, y, v);
    const nu = surf.normal[i * 3], ny = surf.normal[i * 3 + 1], nv = surf.normal[i * 3 + 2];
    N[i * 3] = nu * frame.U[0] + nv * frame.V[0]; N[i * 3 + 1] = ny; N[i * 3 + 2] = nu * frame.U[1] + nv * frame.V[1];
    W[i] = weightAt ? weightAt(u, y, v) : 0;
    const t = tint(u, y, v); Cc[i * 3] = t; Cc[i * 3 + 1] = t; Cc[i * 3 + 2] = t;
    D[i] = 1;
  }
  for (let r = 0; r < nR; r++) {
    const i = nS + r;
    put(i, ring.pos[r * 3], ring.pos[r * 3 + 1], ring.pos[r * 3 + 2]);
    N[i * 3 + 1] = 1; Cc[i * 3] = Cc[i * 3 + 1] = Cc[i * 3 + 2] = 1; R[i] = 1; D[i] = ring.sdf[r];
  }
  const idx = new Uint32Array(surf.index.length + ring.idx.length);
  idx.set(surf.index); for (let k = 0; k < ring.idx.length; k++) idx[surf.index.length + k] = ring.idx[k] + nS;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
  g.setAttribute('aW', new THREE.BufferAttribute(W, 1));
  g.setAttribute('aRing', new THREE.BufferAttribute(R, 1));
  g.setAttribute('aSdf', new THREE.BufferAttribute(D, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

// the stroke's weight: 1 on the forearm and hand, rising over the last of the upper arm into the elbow, 0 elsewhere
function strokeWeight(u, y, v) {
  const body = smin(bodyF(u, y, v), hairF(u, y, v), 0.2), up = capsule(u, y, v, ARM_PARTS[0][0], ARM_PARTS[0][1], 0.23, 0.18);
  const fore = Math.min(capsule(u, y, v, ARM_PARTS[1][0], ARM_PARTS[1][1], 0.17, 0.13), capsule(u, y, v, ARM_PARTS[2][0], ARM_PARTS[2][1], 0.13, 0.1, 0.62));
  if (body < Math.min(up, fore) - 0.02) return 0;
  if (fore <= up) return 1;
  const [A, B] = [ARM.shoulder, ARM.elbow], bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2];
  const h = ((u - A[0]) * bx + (y - A[1]) * by + (v - A[2]) * bz) / (bx * bx + by * by + bz * bz);
  const t = Math.max(0, Math.min(1, (h - 0.8) / 0.2));
  return t * t * (3 - 2 * t);
}

export function buildForms(toWorld, frame, low) {
  const cell = low ? 0.13 : 0.1, step = low ? 0.18 : 0.13;
  // the box stops under the river's bed (y -1.05): what is below is never seen, so it is not made
  const box = { x0: -4.4, x1: 5.9, y0: -1.05, y1: 1.5, z0: -2.45, z1: 2.55 };
  const surf = surfaceNets(batherField, box, cell);
  const ring = ringStrip(batherField, box, step, 0.025);
  const hairTone = (u, y, v) => (hairF(u, y, v) < Math.min(bodyF(u, y, v), armF(u, y, v)) - 0.01 ? 0.42 : 1);
  const bather = assemble(surf, ring, toWorld, frame, strokeWeight, hairTone);
  const sbox = { x0: -4.5, x1: 4.6, y0: -1.05, y1: 0.8, z0: -1.6, z1: 2.3 };
  const ssurf = surfaceNets(stonesF, sbox, cell * 1.12);
  const sring = ringStrip(stonesF, sbox, step, 0.025);
  const stones = assemble(ssurf, sring, toWorld, frame, null, (u, y, v) => 0.86 + 0.08 * Math.sin(u * 1.9 + v * 3.1));
  return { bather, stones, tris: { bather: bather.index.count / 3, stones: stones.index.count / 3 } };
}

// ---------------------------------------------------------------- the stone material (shared by both; one program)
export function stoneMaterial(shared, flip) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8cdb4'), roughness: 0.36, metalness: 0, vertexColors: true });
  const own = { uFade: { value: flip ? 0 : 1 }, uFlip: { value: flip ? 1 : 0 } };
  m.userData.uniforms = own;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared, own);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aW; attribute float aRing; attribute float aSdf;
        uniform float uTime, uStroke; uniform vec3 uElbow, uAxis;
        varying float vRing; varying float vSdf; varying vec3 vWPos;
        vec3 fpRot(vec3 p, vec3 k, float a) { float c = cos(a), s = sin(a); return p * c + cross(k, p) * s + k * dot(k, p) * (1.0 - c); }
        float fpStroke() { return uStroke * (0.5 - 0.5 * cos(6.2831853 * uTime / ${STROKE.period.toFixed(1)})); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        if (aW > 0.0) objectNormal = fpRot(objectNormal, uAxis, fpStroke() * aW);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        if (aW > 0.0) transformed = uElbow + fpRot(transformed - uElbow, uAxis, fpStroke() * aW);
        vRing = aRing; vSdf = aSdf;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uFade, uFlip, uTime; uniform vec4 uWaterP; uniform vec2 uWaterD; uniform vec3 uFoamCol, uSunView, uWrapCol;
        varying float vRing; varying float vSdf; varying vec3 vWPos;
        ${DITHER_GLSL}
        float fpH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float fpN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(fpH(i), fpH(i + vec2(1, 0)), f.x), mix(fpH(i + vec2(0, 1)), fpH(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        { float ign = fpIGN(gl_FragCoord.xy); if ((uFlip > 0.5 ? 1.0 - ign : ign) >= uFade) discard; }
        float fpWy = uWaterP.z + uWaterP.w * dot(vWPos.xz - uWaterP.xy, uWaterD);
        float fpFoam = fpN(vWPos.xz * 3.1 + vec2(uTime * 0.35, -uTime * 0.21)) * 0.6 + fpN(vWPos.xz * 7.3 - vec2(uTime * 0.6, uTime * 0.4)) * 0.4;
        if (vRing > 0.5) {
          float band = step(0.0, vSdf) * (1.0 - smoothstep(0.0, 0.34, vSdf));
          if (band * (0.35 + 0.9 * fpFoam) < 0.45) discard;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fpUnder = fpWy - vWPos.y;
        float fpLine = 1.0 - smoothstep(0.0, 0.08, abs(fpUnder + 0.015));
        diffuseColor.rgb *= mix(0.5, 1.0, smoothstep(0.0, 0.14, -fpUnder)); // wet just above the water
        diffuseColor.rgb = mix(diffuseColor.rgb, uFoamCol, max(fpLine * smoothstep(0.35, 0.7, fpFoam), vRing));`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { float ndl = dot(normal, uSunView); float wrap = clamp((ndl + 0.5) / 1.5, 0.0, 1.0) - clamp(ndl, 0.0, 1.0);
          reflectedLight.indirectDiffuse += diffuseColor.rgb * uWrapCol * max(wrap, 0.0) * (1.0 - vRing); }`)
      .replace('#include <opaque_fragment>', `
        outgoingLight = mix(outgoingLight, outgoingLight * 0.04 + vec3(0.002, 0.0025, 0.003), smoothstep(0.0, 0.2, fpUnder) * (1.0 - vRing));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'fp-canyon-stone';
  return m;
}
