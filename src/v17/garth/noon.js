// The Garth's noon (v17-U2): the light that falls from the lens. Not a PointLight: a beam, computed per fragment on
// every surface of the hall from where it is (inside the cone from the lens to the disc on the floor, lit as from
// the lens), so its edge on the floor and on a leaf is the same edge. It breathes (a slow swell, never a flicker) and
// does not answer the sun's gutter: it is the one light in the walk that does not. Its bounce, the dim gold that the
// lit garden throws up onto the dome and out over the dead rings, is baked into each vertex (under.js's glow, in the
// same colour, breathing with it).
//   noonLit(mat, foliage) patches a MeshStandardMaterial before underMaterial(): foliage lights both faces of a
//   blade or a leaf (the beam comes through them), anything else as a surface turned toward the lens.
//   shaft(): the beam seen in the air, a faint cone; motes(): dust turning in it.
import * as THREE from 'three';
import { NOON } from '../../v8/strata/noon.js';
import { CX, CZ, FLOOR, LENS, LIGHT_R } from './plan.js';

export const NOON_I = 2.6; // the beam's strength on a surface square to it (times the surface's colour)
export const U = {
  uNoon: { value: new THREE.Vector4(NOON_I, LIGHT_R - 0.15, 0.38, 0) }, // strength (breathing), r at the floor, the penumbra's half-width (it ends short of the yellowing ring)
  uNoonA: { value: new THREE.Vector4(CX, FLOOR, CZ, LENS.y) },
  uNoonB: { value: new THREE.Vector2(LENS.r, 0) },
  uNoonCol: { value: new THREE.Color('#f4f7ff') }, // white, a breath of blue: the walk's one cold-neutral light (the stored glass's NOON.lightHex is cream; this is the noon it was)
  uNoonT: { value: 0 },
};
const GLSL = `
  uniform vec4 uNoon, uNoonA; uniform vec2 uNoonB; uniform vec3 uNoonCol;
  float fpNoonBeam(vec3 w) {
    float t = (w.y - uNoonA.y) / (uNoonA.w - uNoonA.y);
    if (t > 1.0) return 0.0;
    float rb = mix(uNoon.y, uNoonB.x, clamp(t, 0.0, 1.0)), r = length(w.xz - uNoonA.xz);
    // the edge is soft by a hand's breadth, and a little ragged (the lens is old)
    float e = uNoon.z * (1.0 + 0.6 * sin(atan(w.z - uNoonA.z, w.x - uNoonA.x) * 7.0 + 1.3));
    return 1.0 - smoothstep(rb - e, rb + e, r);
  }`;
export function noonLit(mat, foliage = false) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + GLSL)
      .replace('#include <opaque_fragment>', `{ vec3 fpWN = inverseTransformDirection(normal, viewMatrix);
        vec3 fpL = normalize(vec3(uNoonA.x, uNoonA.w, uNoonA.z) - vUnderW); float fpD = dot(fpWN, fpL);
        float fpLam = ${foliage ? '0.5 + 0.5 * abs(fpD)' : 'max(fpD, 0.0)'};
        outgoingLight += uNoonCol * uNoon.x * diffuseColor.rgb * fpNoonBeam(vUnderW) * fpLam; }
#include <opaque_fragment>`);
  };
  return mat;
}

// the beam in the air: an open cone from the lens to the floor, drawn from both sides, brightest where the eye looks
// through most of it (across its middle), fading at its foot and its head; additive and faint
export function shaft() {
  const h = LENS.y - FLOOR - 0.05, g = new THREE.CylinderGeometry(LENS.r * 0.98, LIGHT_R, h, 48, 6, true);
  g.translate(CX, FLOOR + 0.05 + h / 2, CZ);
  const m = new THREE.ShaderMaterial({
    uniforms: { uNoon: U.uNoon, uNoonA: U.uNoonA, uNoonCol: U.uNoonCol, uNoonT: U.uNoonT },
    vertexShader: `varying vec3 vW; varying vec3 vN;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(vec3(position.x - ${CX.toFixed(2)}, 0.0, position.z - ${CZ.toFixed(2)})); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec4 uNoon, uNoonA; uniform vec3 uNoonCol; uniform float uNoonT; varying vec3 vW; varying vec3 vN;
      void main() {
        vec3 v = normalize(cameraPosition - vW);
        float across = abs(dot(normalize(vec3(v.x, 0.0, v.z)), vN));
        float t = (vW.y - uNoonA.y) / (uNoonA.w - uNoonA.y);
        float k = pow(across, 2.0) * smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.82, 1.0, t)) * (0.75 + 0.25 * t);
        // slow streaks down it, as dust in a beam is never even
        float a = atan(vW.z - uNoonA.z, vW.x - uNoonA.x);
        k *= 0.7 + 0.3 * sin(a * 9.0 + uNoonT * 0.07) * sin(a * 4.0 - vW.y * 0.3 + uNoonT * 0.05);
        gl_FragColor = vec4(uNoonCol * k * 0.13 * uNoon.x / ${NOON_I.toFixed(2)}, 1.0);
      }`,
    // (no fog chunks: under the ground the haze is nil, under.js's own materials mix it out too)
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
  const mesh = new THREE.Mesh(g, m); mesh.name = 'garth-shaft'; mesh.renderOrder = 18;
  return mesh;
}

// dust turning in the beam: points that drift down slowly and round, bright inside the cone, gone outside it
export function motes(rng, n) {
  const P = new Float32Array(n * 3), S = new Float32Array(n);
  for (let i = 0; i < n; i++) { P[i * 3] = rng(); P[i * 3 + 1] = rng(); P[i * 3 + 2] = rng(); S[i] = 0.5 + rng(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(CX, (FLOOR + LENS.y) / 2, CZ), 14);
  const m = new THREE.ShaderMaterial({
    uniforms: { uNoon: U.uNoon, uNoonA: U.uNoonA, uNoonB: U.uNoonB, uNoonCol: U.uNoonCol, uNoonT: U.uNoonT, uPx: { value: 1 } },
    vertexShader: `uniform vec4 uNoon, uNoonA; uniform vec2 uNoonB; uniform float uNoonT, uPx; attribute float aS; varying float vA;
      void main() {
        // each mote's place: a fraction up the beam (falling slowly, wrapping), an angle (turning) and a radius
        float f = fract(position.y - uNoonT * 0.006 * aS);
        float y = mix(uNoonA.y + 0.3, uNoonA.w - 0.5, f);
        float rb = mix(uNoon.y, uNoonB.x, f), a = position.x * 6.2832 + uNoonT * 0.025 * (aS - 1.0), r = sqrt(position.z) * rb * 1.05;
        vec3 w = vec3(uNoonA.x + cos(a) * r, y + sin(uNoonT * 0.3 * aS + position.x * 40.0) * 0.08, uNoonA.z + sin(a) * r);
        vA = (1.0 - smoothstep(rb * 0.92, rb * 1.05, r)) * smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.9, 1.0, f)) * (0.4 + 0.6 * fract(aS * 7.31));
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_PointSize = clamp(uPx * 0.035 / -mv.z, 1.0, 6.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uNoonCol; uniform vec4 uNoon; varying float vA;
      void main() { vec2 c = gl_PointCoord - 0.5; float d = 1.0 - smoothstep(0.15, 0.5, length(c)); gl_FragColor = vec4(uNoonCol * d * vA * 0.55 * uNoon.x / ${NOON_I.toFixed(2)}, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const pts = new THREE.Points(g, m); pts.name = 'garth-motes'; pts.frustumCulled = false; pts.renderOrder = 19;
  return pts;
}
