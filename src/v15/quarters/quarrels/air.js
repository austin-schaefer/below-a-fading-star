// The Quarrels' air (v15-Q1): what moves on the crown. One Points in one shader (the model: src/v5/keptfire.js,
// premultiplied so smoke darkens and fire adds): the kiln's smoke going up from the saint's crown and leaning off
// down the wind, the glow at his stoke hole, and the aqueduct's drip falling from the channel's broken end into the
// hand, with the ring it makes. Everything moves in uniforms; nothing is rewritten per frame.
//   air(ctx, { mouth, fire, lip, pool } (world [x, y, z]), low) -> { points, tick(t) }
import * as THREE from 'three';
import { fogPars, fogAtten, softDot } from '../../../particles/shaderParts.js';

const WIND = [0.55, 0.0, -0.3]; // the smoke leans north-east, out over the Rungs: the keep's wall turns the west wind

export function air(ctx, o) {
  const N_SMOKE = o.low ? 30 : 46, N_DROP = 3;
  const kinds = [], seeds = [];
  const rng = ctx.makeRng(15107);
  const push = (k) => { kinds.push(k); seeds.push(rng(), rng(), rng(), rng()); };
  for (let i = 0; i < N_SMOKE; i++) push(0);
  push(1); push(1); // the stoke hole's glow: near and wide
  for (let i = 0; i < N_DROP; i++) push(2);
  for (let i = 0; i < N_DROP; i++) push(3); // each drop's ring on the water
  const n = kinds.length, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(kinds), 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seeds), 4));
  const fall = Math.max(0.5, o.lip[1] - o.pool[1]);
  const U = {
    uTime: { value: 0 }, uScale: { value: 500 }, uFire: { value: 1 },
    uMouth: { value: new THREE.Vector3(...o.mouth) }, uStoke: { value: new THREE.Vector3(...o.fire) }, uLip: { value: new THREE.Vector3(...o.lip) }, uPool: { value: new THREE.Vector3(...o.pool) },
    uWind: { value: new THREE.Vector3(...WIND) }, uFall: { value: fall },
  };
  const vs = /* glsl */`
    uniform float uTime, uScale, uFire, uFall; uniform vec3 uMouth, uStoke, uLip, uPool, uWind;
    attribute vec4 aSeed; attribute float aKind;
    varying vec4 vCol; varying float vA;
    #include <fog_pars_vertex>
    void main() {
      float k = aKind, T = uTime, s0 = aSeed.x, s1 = aSeed.y, s2 = aSeed.z, s3 = aSeed.w;
      vec3 p = uMouth, c = vec3(0.0); float size = 0.05, al = 0.0, ak = 0.0, fade = 1.0;
      if (k < 0.5) { // the smoke: slow, heavy with lime; lit from under by the throat for its first metre
        float life = 17.0, ph = fract(T / life + s0), t = ph * life;
        p += vec3((s1 - 0.5) * 0.3, 0.1 + 0.62 * t - 0.012 * t * t, (s2 - 0.5) * 0.3) + uWind * (0.12 * t + 0.035 * t * t)
          + vec3(sin(T * 0.37 + s3 * 30.0), 0.0, cos(T * 0.31 + s1 * 30.0)) * (0.1 + 0.9 * ph);
        size = 0.55 + 3.3 * ph;
        c = mix(vec3(0.78, 0.36, 0.14), vec3(0.2, 0.165, 0.2), smoothstep(0.0, 0.12, ph));
        al = 0.32 * smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.5, 1.0, ph)); ak = 0.9;
      } else if (k < 1.5) { // the glow at the stoke hole
        p = uStoke; size = s0 < 0.5 ? 1.1 : 4.5;
        c = vec3(1.25, 0.42, 0.08); al = (s0 < 0.5 ? 0.32 : 0.16) * uFire; fade = s0 < 0.5 ? -1.0 : -2.0;
      } else if (k < 2.5) { // a drop: it gathers on the lip, lets go and falls
        float per = 2.3 + 1.9 * s0, t = fract(T / per + s1) * per, tf = sqrt(2.0 * uFall / 9.8), hang = per - tf, tt = max(0.0, t - hang);
        p = uLip + vec3((s2 - 0.5) * 0.16, -0.04 - 4.9 * tt * tt, (s3 - 0.5) * 0.05);
        size = t < hang ? 0.03 + 0.05 * smoothstep(hang - 1.2, hang, t) : 0.075;
        c = vec3(0.5, 0.55, 0.66); al = t < hang ? 0.5 * smoothstep(hang - 1.2, hang, t) : 0.85;
      } else { // its ring, spreading on the water in the palm
        float per = 2.3 + 1.9 * s0, t = fract(T / per + s1) * per, tf = sqrt(2.0 * uFall / 9.8), hang = per - tf;
        // (the drop of this period landed when t wrapped: the ring is the first 0.7 s after)
        p = uPool + vec3((s2 - 0.5) * 0.16, 0.02, (s3 - 0.5) * 0.05);
        size = 0.1 + 0.5 * t; c = vec3(0.32, 0.36, 0.44); al = 0.5 * (1.0 - smoothstep(0.0, 0.7, t)); fade = 2.0;
      }
      vec3 transformed = p;
      vec4 mvPosition = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      float depth = -mvPosition.z;
      if (fade < -1.5) al *= smoothstep(8.0, 30.0, depth); else if (fade < 0.0) al *= smoothstep(3.0, 14.0, depth);
      gl_PointSize = clamp(size * uScale / max(depth, 0.1), 1.0, 180.0);
      vCol = vec4(c, ak); vA = al * (fade > 1.5 ? -1.0 : 1.0);
      #include <fog_vertex>
    }`;
  const fs = /* glsl */`
    varying vec4 vCol; varying float vA;
    ${fogPars}
    ${softDot}
    void main() {
      ${fogAtten}
      float r = length(gl_PointCoord - 0.5) * 2.0;
      float s = vA < 0.0 ? smoothstep(0.55, 0.8, r) * (1.0 - smoothstep(0.8, 1.0, r)) * -vA : softDot(gl_PointCoord) * vA;
      s *= fogAtten;
      gl_FragColor = vec4(vCol.rgb * s, vCol.a * s);
    }`;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]), vertexShader: vs, fragmentShader: fs, fog: true, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  Object.assign(mat.uniforms, U);
  mat.customProgramCacheKey = () => 'quarrels-air';
  const points = new THREE.Points(g, mat);
  points.name = 'quarrels-air'; points.frustumCulled = false; points.renderOrder = 26;
  const size = new THREE.Vector2();
  return { points, tick(t, fire) {
    U.uTime.value = t; U.uFire.value = fire;
    ctx.renderer.getDrawingBufferSize(size);
    U.uScale.value = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
  } };
}
