// The walkers' fire and smoke, one Points for all three (one draw call): the Thurifer's thin blue smoke (40 sprites,
// each born at the censer and then rising 0.25 m/s and drifting with the wind for 4 s), the glow at the tip of the
// Leerie's pole (one sprite, flickering 2-5 Hz), and the Link-Boy's flame (16 tongues and a halo about the link's head,
// leaning back as he walks) with a thread of smoke (6 sprites born at the flame). The shared particle parts
// (fog attenuation, the soft dot) and the Kept Fire's premultiplied blend: the flame adds, the smoke darkens.
// Smoke sprites carry their birth (place and time) in an attribute written only when one is born; the flame is
// stateless about its origin uniform, as the Kept Fire's is.
import * as THREE from 'three';
import { fogPars, fogAtten, softDot } from '../../particles/shaderParts.js';

export const N_SMOKE = 40, N_TONGUE = 16, N_LSMOKE = 6;
const K = { smoke: 0, glow: 1, tongue: 2, halo: 3, lsmoke: 4 };

export function buildFlames(ctx, rng) {
  const list = [[K.smoke, N_SMOKE], [K.glow, 1], [K.tongue, N_TONGUE], [K.halo, 1], [K.lsmoke, N_LSMOKE]];
  const total = list.reduce((a, k) => a + k[1], 0);
  const seeds = new Float32Array(total * 4), kinds = new Float32Array(total), birth = new Float32Array(total * 4).fill(0);
  const start = {};
  let o = 0;
  for (const [k, n] of list) { start[k] = o; for (let i = 0; i < n; i++, o++) { kinds[o] = k; for (let j = 0; j < 4; j++) seeds[o * 4 + j] = rng(); birth[o * 4 + 3] = -1e4; } }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geo.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));
  const bAttr = new THREE.BufferAttribute(birth, 4);
  bAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aBirth', bAttr);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const U = {
    uTime: { value: 0 }, uScale: { value: 500 }, uWind: { value: new THREE.Vector3(0.22, 0, 0.1) },
    uLeer: { value: new THREE.Vector4(0, -1e3, 0, 0) },  // the pole's tip, w its glow (0 off)
    uLink: { value: new THREE.Vector4(0, -1e3, 0, 0) },  // the link's head, w its flicker (0 off)
    uLinkV: { value: new THREE.Vector3() },             // his velocity, for the flame's lean
    uOn: { value: new THREE.Vector2(1, 1) },            // the Thurifer's smoke, the link's smoke
  };
  const vs = /* glsl */`
    uniform float uTime, uScale; uniform vec3 uWind, uLinkV; uniform vec4 uLeer, uLink; uniform vec2 uOn;
    attribute vec4 aSeed, aBirth; attribute float aKind;
    varying vec4 vCol; varying float vA;
    #include <fog_pars_vertex>
    void main() {
      float k = aKind, T = uTime, s0 = aSeed.x, s1 = aSeed.y, s2 = aSeed.z, s3 = aSeed.w;
      vec3 p = vec3(0.0, -1000.0, 0.0), c = vec3(0.0); float size = 0.05, al = 0.0, ak = 0.0, nearFade = 0.0;
      if (k < 0.5) { // the censer's smoke: a cold pale blue, very thin
        float age = T - aBirth.w, ph = age / 4.0;
        if (ph >= 0.0 && ph < 1.0) {
          p = aBirth.xyz + vec3(0.0, 0.25 * age, 0.0) + uWind * age * (0.5 + 0.4 * s0)
            + vec3(sin(T * 0.9 + s1 * 20.0), 0.0, cos(T * 0.7 + s2 * 20.0)) * 0.06 * age;
          size = 0.05 + 0.32 * ph * (0.8 + 0.4 * s3);
          c = vec3(0.42, 0.58, 0.9) * 0.5;
          al = 0.075 * smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.45, 1.0, ph)) * uOn.x; ak = 0.2;
        }
      } else if (k < 1.5) { // the glow at the pole's tip: a small flame, no light
        p = uLeer.xyz + vec3(0.0, 0.04, 0.0);
        size = 0.42 * (0.85 + 0.3 * uLeer.w);
        c = vec3(1.7, 0.78, 0.26); al = 0.7 * step(0.001, uLeer.w);
      } else if (k < 2.5) { // a tongue of the link's flame, leaning back from his way
        float ph = fract(T * (1.4 + 0.9 * s3) + s0);
        float hmax = (0.22 + 0.3 * s1 * s1) * (0.85 + 0.3 * uLink.w);
        float a = s1 * 6.2831 + s2 * 3.0, r = (0.03 + 0.07 * s2) * (1.0 - 0.8 * ph);
        vec2 xz = vec2(cos(a), sin(a)) * r + vec2(sin(T * 7.0 + s0 * 50.0), cos(T * 6.1 + s1 * 40.0)) * 0.03 * ph;
        p = uLink.xyz + vec3(xz.x, hmax * ph, xz.y) - uLinkV * (0.09 * ph * ph) + uWind * ph * ph * 0.1;
        size = (0.2 + 0.12 * s3) * (1.0 - ph * 0.7);
        c = mix(vec3(2.4, 1.3, 0.38), vec3(1.5, 0.3, 0.04), smoothstep(0.05, 0.75, ph));
        al = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.6, 1.0, ph)) * 0.75 * step(0.001, uLink.w);
      } else if (k < 3.5) { // the halo round the link's head
        p = uLink.xyz + vec3(0.0, 0.12, 0.0);
        size = 1.5 * (0.9 + 0.2 * uLink.w);
        c = vec3(1.1, 0.45, 0.11); al = 0.55 * step(0.001, uLink.w); nearFade = 1.0;
      } else { // the link's thread of smoke
        float age = T - aBirth.w, ph = age / 3.3;
        if (ph >= 0.0 && ph < 1.0) {
          p = aBirth.xyz + vec3(0.0, 0.55 * age, 0.0) + uWind * age * 0.8 + vec3(sin(T * 0.8 + s3 * 30.0), 0.0, cos(T * 0.6 + s1 * 30.0)) * 0.05 * age;
          size = 0.12 + 0.5 * ph;
          c = mix(vec3(0.25, 0.14, 0.08), vec3(0.09, 0.08, 0.09), smoothstep(0.0, 0.3, ph));
          al = 0.3 * smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.55, 1.0, ph)) * uOn.y; ak = 1.0;
        }
      }
      vec3 transformed = p;
      vec4 mvPosition = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      float depth = -mvPosition.z;
      if (nearFade > 0.0) al *= smoothstep(1.5, 6.0, depth);
      gl_PointSize = clamp(size * uScale / max(depth, 0.1), 1.0, 120.0);
      vCol = vec4(c, ak); vA = al;
      #include <fog_vertex>
    }`;
  const fs = /* glsl */`
    varying vec4 vCol; varying float vA;
    ${fogPars}
    ${softDot}
    void main() {
      ${fogAtten}
      float s = softDot(gl_PointCoord) * vA * fogAtten;
      if (s < 0.002) discard;
      gl_FragColor = vec4(vCol.rgb * s, vCol.a * s);
    }`;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]), vertexShader: vs, fragmentShader: fs, fog: true, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  Object.assign(mat.uniforms, U);
  mat.customProgramCacheKey = () => 'v7-walkers-points';
  const points = new THREE.Points(geo, mat);
  points.name = 'walkers-flames'; points.frustumCulled = false; points.renderOrder = 26;

  // births: a ring of sprites per source; born(kind, x, y, z, t) takes the next
  const next = { [K.smoke]: 0, [K.lsmoke]: 0 }, count = { [K.smoke]: N_SMOKE, [K.lsmoke]: N_LSMOKE };
  let dirty = false;
  function born(k, x, y, z, t) {
    const i = start[k] + next[k];
    next[k] = (next[k] + 1) % count[k];
    birth[i * 4] = x; birth[i * 4 + 1] = y; birth[i * 4 + 2] = z; birth[i * 4 + 3] = t;
    dirty = true;
  }
  const size = new THREE.Vector2();
  function frame(t) {
    ctx.renderer.getDrawingBufferSize(size);
    U.uScale.value = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    U.uTime.value = t;
    if (dirty) { bAttr.needsUpdate = true; dirty = false; }
  }
  return { points, U, born, frame, K, sprites: total };
}
