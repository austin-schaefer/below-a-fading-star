// The Diffident Stair's dust (v12-H3): earth thrown up where a slab tears out of its bed or drops back into it
// (`puff`), and grit shaken off a slab's edges as it settles in its place, falling away into the air under the stair
// (`shake`). One Points draw, a ring of particles moved in the vertex shader from where and when each was let go;
// the CPU writes a few particles per event and nothing per frame but the time.
import * as THREE from 'three';

const VS = /* glsl */`
  attribute vec4 aO;  // origin xyz, birth time
  attribute vec4 aV;  // velocity xyz, kind (0 earth, 1 grit)
  uniform float uT, uScale;
  varying float vA, vK;
  #include <fog_pars_vertex>
  void main() {
    float age = uT - aO.w, life = aV.w > 0.5 ? 3.2 : 2.2;
    float k = clamp(age / life, 0.0, 1.0);
    // drag on the throw, a slow fall (earth hangs; grit drops)
    float d = (1.0 - exp(-age * 1.6)) / 1.6;
    vec3 p = aO.xyz + aV.xyz * d + vec3(0.0, aV.w > 0.5 ? -2.4 : -0.35, 0.0) * age * age * 0.5;
    vec3 transformed = p;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vA = (age < 0.0 || age > life) ? 0.0 : (1.0 - k) * smoothstep(0.0, 0.08, age);
    vK = aV.w;
    gl_PointSize = (aV.w > 0.5 ? 0.06 : 0.22 + k * 0.5) * uScale / max(0.5, -mvPosition.z);
    #include <fog_vertex>
  }`;
const FS = /* glsl */`
  varying float vA, vK;
  #include <fog_pars_fragment>
  void main() {
    vec2 c = gl_PointCoord - 0.5; float r = dot(c, c);
    if (r > 0.25 || vA <= 0.0) discard;
    vec3 col = vK > 0.5 ? vec3(0.42, 0.38, 0.40) : vec3(0.30, 0.23, 0.16);
    gl_FragColor = vec4(col, vA * (vK > 0.5 ? 0.9 : 0.45) * (1.0 - r * 4.0));
    #include <fog_fragment>
  }`;

export function buildDust(ctx, low) {
  const N = low ? 192 : 384;
  const O = new Float32Array(N * 4).fill(-1e4), Vv = new Float32Array(N * 4);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const ao = new THREE.BufferAttribute(O, 4).setUsage(THREE.DynamicDrawUsage), av = new THREE.BufferAttribute(Vv, 4).setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aO', ao); g.setAttribute('aV', av);
  const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uScale: { value: 400 } }]);
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: true });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false; pts.name = 'stair-dust'; pts.renderOrder = 3;
  ctx.scene.add(pts);
  const rng = ctx.makeRng(12321);
  let head = 0, t = 0, dirty = false;
  function emit(x, y, z, vx, vy, vz, kind) {
    const i = head; head = (head + 1) % N;
    O[i * 4] = x; O[i * 4 + 1] = y; O[i * 4 + 2] = z; O[i * 4 + 3] = t;
    Vv[i * 4] = vx; Vv[i * 4 + 1] = vy; Vv[i * 4 + 2] = vz; Vv[i * 4 + 3] = kind;
    dirty = true;
  }
  return {
    calls: 1,
    // earth thrown up in a ring from a bed
    puff(x, y, z, n, soft) {
      for (let k = 0; k < n; k++) {
        const a = rng() * Math.PI * 2, s = (soft ? 0.6 : 1.4) * (0.4 + rng());
        emit(x + Math.cos(a) * 0.6, y, z + Math.sin(a) * 0.6, Math.cos(a) * s, (soft ? 0.5 : 1.6) * rng(), Math.sin(a) * s, 0);
      }
    },
    // grit off a settling slab's edges
    shake(e, n) {
      for (let k = 0; k < n; k++) {
        const f = (rng() - 0.5) * 2 * e.hd, r = (rng() < 0.5 ? -1 : 1) * e.hw * (0.6 + rng() * 0.4);
        emit(e.cx + e.ux * f - e.uz * r, e.y - 0.3, e.cz + e.uz * f + e.ux * r, (rng() - 0.5) * 0.3, -0.2 - rng() * 0.4, (rng() - 0.5) * 0.3, 1);
      }
    },
    update(dt) {
      t += dt; U.uT.value = t;
      U.uScale.value = ctx.renderer.domElement.height * 0.9;
      if (dirty) { ao.needsUpdate = true; av.needsUpdate = true; dirty = false; }
    },
  };
}
