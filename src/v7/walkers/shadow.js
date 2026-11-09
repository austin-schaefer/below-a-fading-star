// The Link-Boy's shadows, drawn (the idea keeps his light "for its moving shadows"; here a point light casts none: the
// one shadow map is the sun's, and a shadow-casting point light would recompile every lit shader or add a cube pass).
// One disc of ground 28 m across, a grid draped over the rendered ground round him and redrawn (heights only) at 15 Hz
// on a fixed 1.4 m lattice, so its vertices sit still on the ground between moves. Its fragment shader takes the
// light's pool away again where something stands between it and the ground: behind each Lynchets wall run within 10 m
// of the flame (clipped to that circle) and each boulder collider within 10 m, it projects the obstacle's top from the
// flame's position (a wall 1.1 m high under a flame 1.75 m up throws a shadow 2.7 times its distance from the flame,
// out to the pool's edge), and darkens the ground there, softly. The flame swings with his stride, so the edges swing
// across the ground with it. The heather: a fine noise darkening in the pool that slides opposite the light's swing (a
// trick, honestly: no plant is traced). Everything per frame is uniforms. Drawn only while he walks within 40 m of you,
// faded in and out over half a second.
import * as THREE from 'three';
import { clamp, hyp } from '../../noise.js';

const R = 14, STEP = 1.4, GRID = Math.round((2 * R) / STEP), NS = 8, NR = 6, REACH = 10;

export function buildShadowDisc(ctx, G) {
  const n = GRID + 1, pos = new Float32Array(n * n * 3), idx = [];
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
  const geo = new THREE.BufferGeometry();
  const pA = new THREE.BufferAttribute(pos, 3); pA.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', pA); geo.setIndex(idx);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.5);
  const U = {
    uL: { value: new THREE.Vector4(0, 0, 1.75, 0) },   // the flame's x, z, height over the ground, and the pool's strength
    uSeg: { value: Array.from({ length: NS }, () => new THREE.Vector4()) }, uSegH: { value: new Array(NS).fill(0) },
    uRock: { value: Array.from({ length: NR }, () => new THREE.Vector4()) },
    uSwing: { value: new THREE.Vector2() }, uFade: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */`varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec4 uL; uniform vec4 uSeg[${NS}]; uniform float uSegH[${NS}]; uniform vec4 uRock[${NR}]; uniform vec2 uSwing; uniform float uFade;
      varying vec2 vXZ;
      float cr(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec2 L = uL.xy, r = vXZ - L; float d = length(r), hL = uL.z;
        // the light's own falloff (inverse square, as the slot light draws it), so the shadows lie where its light falls;
        // the wedges take a little more than the link's own light off the ground (a trick, so that they read at all
        // against the light rig's ambient floor)
        float pool = min(1.0, 16.0 / (d * d + 0.5)) * (1.0 - smoothstep(${R - 3}.0, ${R - 0.5}, d));
        if (pool <= 0.004) discard;
        float sh = 0.0;
        for (int i = 0; i < ${NS}; i++) {
          float hw = uSegH[i]; if (hw <= 0.0) continue;
          vec2 a = uSeg[i].xy, s = uSeg[i].zw - a; float den = cr(r, s); if (abs(den) < 1e-5) continue;
          vec2 q = a - L; float t = cr(q, s) / den, u = cr(q, r) / den; // where the ray from the flame to here crosses the wall
          float sl = length(s), k = hL > hw + 0.05 ? hL / (hL - hw) : 40.0;
          float across = smoothstep(-0.25, 0.15, u * sl) * smoothstep(-0.25, 0.15, (1.0 - u) * sl); // within the run, soft ends
          float beyond = smoothstep(0.0, 0.35, (1.0 - t) * d);                                          // past the wall
          float tip = 1.0 - smoothstep(0.75, 1.0, t * k > 0.0 ? 1.0 / (t * k) : 0.0);                  // to the shadow's end
          sh = max(sh, across * beyond * (t > 0.0 ? tip : 0.0));
        }
        for (int i = 0; i < ${NR}; i++) {
          vec4 R4 = uRock[i]; if (R4.z <= 0.0) continue;
          vec2 c = R4.xy - L; float dc = length(c); if (dc < R4.z + 0.2) continue;
          float k = hL > R4.w + 0.05 ? hL / (hL - R4.w) : 40.0;
          float ang = acos(clamp(dot(r, c) / max(d * dc, 1e-4), -1.0, 1.0)), hw2 = asin(clamp(R4.z / dc, 0.0, 1.0));
          float inA = 1.0 - smoothstep(hw2 * 0.7, hw2 * 1.15, ang);
          float beyond = smoothstep(dc - R4.z * 0.3, dc + R4.z * 0.5, d), tip = 1.0 - smoothstep(dc * k * 0.7, dc * k, d);
          sh = max(sh, inA * beyond * tip);
        }
        float heather = smoothstep(0.45, 0.85, vn((vXZ - uSwing * 2.2) * 3.1)) * smoothstep(0.6, 2.0, d);
        float dark = min(0.8, (0.8 * sh + 0.28 * heather * (1.0 - sh) * min(1.0, 5.0 / (d * d + 0.5))) * pool) * uL.w * uFade;
        gl_FragColor = vec4(0.0, 0.0, 0.0, dark);
      }`,
  });
  mat.customProgramCacheKey = () => 'v7-walkers-shadow';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'walkers-linkboy-shadows'; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.visible = false;

  // the obstacles: the Lynchets' wall runs (the region exposes them) and the boulder colliders, bucketed once
  let walls = null, rocks = null, bucket = null;
  function gather() {
    walls = ctx.regions?.lynchetsWalls || null;
    const cs = ctx.controls?.state?.colliders || [];
    bucket = new Map();
    for (const c of cs) {
      if (c.r < 0.6 || c.h === undefined || c.r > 4) continue; // boulders (rocks.js): capped cylinders; not the walls' 0.45 m posts
      const k = Math.floor(c.x / 8) * 4096 + Math.floor(c.z / 8);
      let b = bucket.get(k); if (!b) bucket.set(k, (b = [])); b.push(c);
    }
    rocks = true;
  }
  let cx = 1e9, cz = 1e9, acc = 1;
  const segT = new Float64Array(NS * 5), rockT = [];
  function drape(x, z) {
    const sx = Math.round(x / STEP) * STEP, sz = Math.round(z / STEP) * STEP;
    if (sx === cx && sz === cz) return;
    cx = sx; cz = sz;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const px = sx - R + i * STEP, pz = sz - R + j * STEP, o = (j * n + i) * 3;
      pos[o] = px; pos[o + 1] = G(px, pz) + 0.06; pos[o + 2] = pz;
    }
    pA.needsUpdate = true;
  }
  function obstacles(lx, lz) {
    if (!rocks) gather();
    let ns = 0;
    if (walls) {
      for (const w of walls) {
        // clip the run to the circle of REACH round the flame
        const dx = w.bx - w.ax, dz = w.bz - w.az, l2 = dx * dx + dz * dz, fx = w.ax - lx, fz = w.az - lz;
        const b = fx * dx + fz * dz, c = fx * fx + fz * fz - REACH * REACH, disc = b * b - l2 * c;
        if (disc <= 0) continue;
        const sq = Math.sqrt(disc), t0 = Math.max(0, (-b - sq) / l2), t1 = Math.min(1, (-b + sq) / l2);
        if (t1 <= t0) continue;
        const dmin = Math.sqrt(Math.max(0, c + REACH * REACH - (b * b) / l2));
        if (ns < NS) { const o = ns * 5; segT[o] = w.ax + dx * t0; segT[o + 1] = w.az + dz * t0; segT[o + 2] = w.ax + dx * t1; segT[o + 3] = w.az + dz * t1; segT[o + 4] = dmin; ns++; }
      }
    }
    for (let i = 0; i < NS; i++) {
      if (i < ns) { const o = i * 5; U.uSeg.value[i].set(segT[o], segT[o + 1], segT[o + 2], segT[o + 3]); U.uSegH.value[i] = 1.1; }
      else U.uSegH.value[i] = 0;
    }
    rockT.length = 0;
    const gx = Math.floor(lx / 8), gz = Math.floor(lz / 8);
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const B = bucket.get((gx + a) * 4096 + gz + b); if (!B) continue;
      for (const c of B) { const d = hyp(c.x - lx, c.z - lz); if (d < REACH && rockT.length < NR) rockT.push(c); }
    }
    for (let i = 0; i < NR; i++) {
      const c = rockT[i];
      if (c) { const top = clamp(c.y + c.h - G(c.x, c.z), 0.3, 3); U.uRock.value[i].set(c.x, c.z, c.r * 0.9, top * 0.8); }
      else U.uRock.value[i].set(0, 0, 0, 0);
    }
    return ns + rockT.length;
  }
  let fade = 0, count = 0;
  // on: whether he is walking within 40 m; strength: the pool's darkening scale (by the sun's guttering)
  function update(dt, on, lx, ly, lz, swingX, swingZ, strength) {
    fade = clamp(fade + (on ? dt : -dt) * 2, 0, 1);
    U.uFade.value = fade;
    const vis = fade > 0.001;
    if (vis !== mesh.visible) mesh.visible = vis;
    if (!vis) return;
    acc += dt;
    if (acc >= 1 / 15) { acc = 0; drape(lx, lz); count = obstacles(lx, lz); }
    U.uL.value.set(lx, lz, ly - G(lx, lz), strength);
    U.uSwing.value.set(swingX, swingZ);
  }
  return { mesh, update, get obstacles() { return count; }, gather, U };
}
