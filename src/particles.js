// Particles: seven GPU-driven systems, eleven draw calls.
//   dust motes (box around camera)      ash and embers (box around camera)
//   corpse-candles (CPU wander, 4 real point lights)
//   fireflies (Deodand Wood)            ground mist (instanced billboards)
//   frost motes (the Lattice)           wind-borne seeds and leaves (gusts on the open moor)
// Positions are mostly computed in the vertex shader from per-point seeds and a time uniform, so the
// per-frame CPU cost is a handful of uniform writes plus the wisps. Everything is deterministic from makeRng.
import * as THREE from 'three';
import { fogPars, fogAtten, softDot } from './particles/shaderParts.js';
import { makeMistTexture } from './particles/mistTexture.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function build(ctx) {
  const { scene, terrain, palette, camera } = ctx;
  const high = ctx.quality === 'high';
  const q = high ? 1 : 0.5;
  const C = (h) => new THREE.Color(h);
  const L = ctx.landmarks;
  const flick = ctx.sky && ctx.sky.flicker ? ctx.sky.flicker : { value: 1 };
  const sunDir = new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z);

  // uniforms shared by every material (one object each, so one write per frame)
  const U = {
    uTime: { value: 0 }, uScale: { value: 400 }, uSun: { value: sunDir }, uFlicker: { value: 1 },
  };
  const mkMat = (vs, fs, extra, { additive = false } = {}) => new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, extra || {}]),
    vertexShader: vs, fragmentShader: fs, fog: true, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  // share the common uniform objects by reference
  const bind = (m) => { Object.assign(m.uniforms, U); return m; };
  const pointsOf = (geo, mat, order = 20) => {
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = order; scene.add(p); return p;
  };
  const seedGeo = (n, rng, extra) => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) seed[i] = rng();
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    if (extra) extra(g, n);
    return g;
  };

  const PT_VERT_HEAD = /* glsl */`
    uniform float uTime, uScale, uFlicker; uniform vec3 uSun;
    attribute vec4 aSeed;
    #include <fog_pars_vertex>
  `;

  // ------------------------------------------------------------------ 1. dust motes
  {
    const n = Math.round(1400 * q), box = 30;
    const geo = seedGeo(n, ctx.makeRng(8101));
    const vs = PT_VERT_HEAD + /* glsl */`
      uniform float uBox; varying float vA; varying float vFw;
      void main() {
        vec3 p0 = aSeed.xyz * uBox + vec3(0.06, -0.015, 0.04) * uTime * (0.4 + aSeed.w);
        p0 += vec3(sin(uTime * 0.31 + aSeed.x * 40.0), sin(uTime * 0.23 + aSeed.y * 30.0) * 0.6, cos(uTime * 0.27 + aSeed.z * 50.0)) * 0.45;
        vec3 rel = mod(p0 - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
        vec3 transformed = cameraPosition + rel;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        vec3 dir = rel / max(length(rel), 0.001);
        vFw = pow(max(dot(dir, uSun), 0.0), 3.0);
        float edge = 1.0 - smoothstep(0.55, 1.0, max(abs(rel.x), max(abs(rel.y), abs(rel.z))) / (uBox * 0.5));
        float near = smoothstep(0.4, 2.5, length(rel));
        float tw = 0.6 + 0.4 * sin(uTime * (1.0 + aSeed.w * 2.0) + aSeed.x * 90.0);
        vA = edge * near * tw * (0.35 + 0.65 * aSeed.w);
        gl_PointSize = clamp(max(1.6, (0.016 + 0.02 * aSeed.w) * uScale / max(depth, 0.1)), 1.6, 14.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      uniform float uFlicker; uniform vec3 uWarm; uniform vec3 uCool;
      varying float vA; varying float vFw;
      ${fogPars}
      ${softDot}
      void main() {
        ${fogAtten}
        float s = softDot(gl_PointCoord);
        vec3 col = uCool * 0.45 + uWarm * (0.05 + 2.3 * vFw) * uFlicker;
        gl_FragColor = vec4(col * s * vA * fogAtten * 0.55, 1.0);
      }`;
    const mat = bind(mkMat(vs, fs, { uBox: { value: box }, uWarm: { value: C(palette.sunLight) }, uCool: { value: C('#5a4a6a') } }, { additive: true }));
    pointsOf(geo, mat, 25);
  }

  // ------------------------------------------------------------------ 2. ash and embers
  {
    const n = Math.round(1100 * q), box = 40;
    const geo = seedGeo(n, ctx.makeRng(8201));
    const vs = PT_VERT_HEAD + /* glsl */`
      uniform float uBox; varying float vA; varying vec3 vCol;
      uniform vec3 uWarm, uEmber;
      void main() {
        float fall = 0.28 + 0.3 * aSeed.w;
        vec3 p0 = aSeed.xyz * uBox;
        p0.y -= uTime * fall;
        p0.x += sin(uTime * 0.37 + aSeed.z * 60.0) * 0.9 + uTime * 0.12;
        p0.z += cos(uTime * 0.29 + aSeed.x * 50.0) * 0.9;
        vec3 rel = mod(p0 - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
        vec3 transformed = cameraPosition + rel;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        vec3 dir = rel / max(length(rel), 0.001);
        float fw = pow(max(dot(dir, uSun), 0.0), 4.0);
        float edge = 1.0 - smoothstep(0.5, 1.0, max(abs(rel.x), max(abs(rel.y), abs(rel.z))) / (uBox * 0.5));
        float ember = step(0.945, fract(aSeed.w * 17.31 + aSeed.x * 3.7));
        float glow = 0.6 + 0.4 * sin(uTime * (3.0 + aSeed.y * 5.0) + aSeed.z * 80.0);
        vCol = mix(vec3(0.34, 0.31, 0.32) + uWarm * fw * 1.4 * uFlicker, uEmber * (2.2 * glow), ember);
        vA = edge * smoothstep(0.5, 3.0, length(rel)) * mix(0.5, 0.95, ember);
        gl_PointSize = clamp(max(1.3, (0.025 + 0.03 * aSeed.w + ember * 0.02) * uScale / max(depth, 0.1)), 1.3, 12.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      varying float vA; varying vec3 vCol;
      ${fogPars}
      ${softDot}
      void main() {
        float s = softDot(gl_PointCoord);
        gl_FragColor = vec4(vCol, s * vA);
        #include <fog_fragment>
      }`;
    const mat = bind(mkMat(vs, fs, { uBox: { value: box }, uWarm: { value: C(palette.sunLight) }, uEmber: { value: C(palette.ember) } }));
    pointsOf(geo, mat, 24);
  }

  // ------------------------------------------------------------------ 3. corpse-candles
  const wisps = { count: 0, list: [], lights: [] }; // exposed as ctx.wisps for audio and others
  {
    const fen = ctx.water.fen, wy = fen.y;
    const n = Math.round(20 * (high ? 1 : 0.75)), nOut = Math.round(n * 0.2);
    const rng = ctx.makeRng(8301);
    // homes over pools: prefer points where the terrain is below the water, spread by rejection
    const homes = [];
    for (let tries = 0; tries < 4000 && homes.length < n - nOut; tries++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 62;
      const x = fen.x + Math.cos(a) * r, z = fen.z + Math.sin(a) * r;
      if (terrain.heightAt(x, z) > wy - 0.25 && tries < 3000) continue;
      if (homes.some((h) => Math.hypot(h.x - x, h.z - z) < 9)) continue;
      homes.push({ x, z });
    }
    // a few stray lights beyond the fen's edge, over the wet moor
    for (let tries = 0; tries < 400 && homes.length < n; tries++) {
      const a = rng() * Math.PI * 2, r = 86 + rng() * 26;
      const x = fen.x + Math.cos(a) * r, z = fen.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > ctx.world.regionRadius - 20 || terrain.heightAt(x, z) > 6) continue;
      homes.push({ x, z });
    }
    while (homes.length < n) homes.push({ x: fen.x + (rng() - 0.5) * 80, z: fen.z + (rng() - 0.5) * 80 });
    const W = homes.map((h, i) => ({
      hx: h.x, hz: h.z, s1: rng() * 100, s2: rng() * 100, ph: rng() * 6.28, hover: 1.1 + rng() * 0.9,
      x: h.x, y: wy + 1.5, z: h.z, wander: 9 + rng() * 6, speed: 0.035 + rng() * 0.03, vx: 0, vz: 0, dist: 0,
    }));
    wisps.count = n;
    // two points per wisp: the light, and its reflection in the water
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 2 * 3), ph = new Float32Array(n * 2), kind = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { ph[i * 2] = ph[i * 2 + 1] = W[i].ph; kind[i * 2 + 1] = 1; }
    const posAttr = new THREE.BufferAttribute(pos, 3); posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1));
    geo.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    const vs = /* glsl */`
      uniform float uTime, uScale, uBoost;
      attribute float aPh, aKind;
      varying float vI; varying float vKind;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        float pulse = 0.72 + 0.28 * sin(uTime * 1.3 + aPh * 3.0) * sin(uTime * 0.53 + aPh * 7.0);
        float gut = step(0.985, sin(uTime * 0.9 + aPh * 11.0) * 0.5 + 0.5);   // a rare stutter
        vI = pulse * (1.0 - 0.7 * gut) * uBoost * mix(1.0, 0.32, aKind);
        vKind = aKind;
        gl_PointSize = clamp((2.6 + aKind * 0.8) * uScale / max(depth, 0.1), 6.0, 200.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      uniform vec3 uWisp; varying float vI; varying float vKind;
      ${fogPars}
      void main() {
        ${fogAtten}
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        c.y *= mix(1.0, 2.6, vKind);               // reflections smear downward
        float r2 = dot(c, c);
        float core = exp(-r2 * 160.0);
        float mid = exp(-r2 * 24.0) * 0.4;
        float halo = exp(-r2 * 5.0) * 0.14;
        float a = core * 1.6 + mid + halo;
        vec3 col = mix(uWisp, vec3(0.92, 1.0, 0.95), core) * a;
        gl_FragColor = vec4(col * vI * fogAtten, 1.0);
      }`;
    const mat = bind(mkMat(vs, fs, { uWisp: { value: C(palette.wisp) }, uBoost: { value: 1 } }, { additive: true }));
    pointsOf(geo, mat, 30);

    const nl = 4;
    for (let i = 0; i < nl; i++) {
      const light = new THREE.PointLight(C(palette.wisp), 0, 18, 2);
      light.userData = { w: -1, k: 0 };
      scene.add(light); wisps.lights.push(light);
    }
    for (let i = 0; i < n; i++) wisps.list.push(new THREE.Vector3(W[i].x, W[i].y, W[i].z));

    const player = ctx.player;
    const step = (dt, t) => {
      const px = camera.position.x, pz = camera.position.z;
      mat.uniforms.uBoost.value = 1 + (1 - flick.value) * 1.4;
      for (let i = 0; i < n; i++) {
        const w = W[i];
        // wander by noise around the pool; a slow figure of eight
        const tx = w.hx + ctx.noise.noise2(t * w.speed + w.s1, w.s2) * w.wander * 1.6;
        const tz = w.hz + ctx.noise.noise2(t * w.speed + w.s2, w.s1 + 17.0) * w.wander * 1.6;
        let gx = tx, gz = tz;
        // retreat: never nearer than 6m, eased out to 10m
        let dx = gx - px, dz = gz - pz, d = Math.hypot(dx, dz);
        if (d < 10) {
          if (d < 1e-3) { dx = w.x - px; dz = w.z - pz; d = Math.hypot(dx, dz) || 1; }
          const nd = 6 + 0.4 * d, k = nd / d;
          gx = px + dx * k; gz = pz + dz * k;
        }
        // ease toward the goal (fast enough to keep ahead of a player at a run)
        const e = 1 - Math.exp(-dt * (d < 10 ? 5.0 : 1.5));
        w.x += (gx - w.x) * e; w.z += (gz - w.z) * e;
        // hard floor on distance after easing
        dx = w.x - px; dz = w.z - pz; d = Math.hypot(dx, dz);
        if (d < 6) { const k = 6 / Math.max(d, 1e-3); w.x = px + dx * k; w.z = pz + dz * k; d = 6; }
        w.dist = d;
        const ground = Math.max(terrain.heightAt(w.x, w.z), wy);
        const bob = Math.sin(t * 0.9 + w.ph) * 0.28 + Math.sin(t * 0.37 + w.ph * 2.0) * 0.18;
        const ty = ground + w.hover + bob;
        w.y += (ty - w.y) * Math.min(1, dt * 2.0);
        const v = wisps.list[i]; v.set(w.x, w.y, w.z);
        pos[i * 6] = w.x; pos[i * 6 + 1] = w.y; pos[i * 6 + 2] = w.z;
        const wl = terrain.waterLevelAt(w.x, w.z);
        const wh = wl === null ? ground : wl;
        pos[i * 6 + 3] = w.x; pos[i * 6 + 4] = 2 * wh - w.y; pos[i * 6 + 5] = w.z;
      }
      posAttr.needsUpdate = true;
      // lights follow the nearest four, handing over through a fade
      const lights = wisps.lights;
      for (let k = 0; k < lights.length; k++) {
        const li = lights[k], ud = li.userData;
        let rank = 99;
        if (ud.w >= 0) { rank = 0; const dw = W[ud.w].dist; for (let j = 0; j < n; j++) if (W[j].dist < dw) rank++; }
        const want = rank < 4 && W[ud.w] && W[ud.w].dist < 36 ? 1 : 0;
        ud.k += (want - ud.k) * Math.min(1, dt * 3);
        if (want === 0 && ud.k < 0.03) {
          // pick the nearest wisp not already carrying a light
          let best = -1, bd = 36;
          for (let j = 0; j < n; j++) {
            if (W[j].dist >= bd) continue;
            let taken = false; for (let m = 0; m < lights.length; m++) if (lights[m].userData.w === j) { taken = true; break; }
            if (!taken) { best = j; bd = W[j].dist; }
          }
          ud.w = best; ud.k = 0;
        }
        if (ud.w >= 0) {
          const w = W[ud.w];
          li.position.set(w.x, w.y, w.z);
          const pulse = 0.8 + 0.2 * Math.sin(t * 1.3 + w.ph * 3.0);
          li.intensity = 30 * ud.k * pulse * (1 + (1 - flick.value) * 1.4);
        } else li.intensity = 0;
      }
    };
    ctx.registerUpdate(step);
    ctx.wisps = wisps;
  }

  // ------------------------------------------------------------------ 4. fireflies in the Deodand Wood
  {
    const wood = L.wood, rng = ctx.makeRng(8401);
    const want = Math.round(140 * q);
    const geo = new THREE.BufferGeometry();
    const pos = [], seed = [];
    for (let tries = 0; tries < 3000 && pos.length / 3 < want; tries++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * (wood.r - 8);
      const x = wood.x + Math.cos(a) * r, z = wood.z + Math.sin(a) * r;
      const h = terrain.heightAt(x, z), wl = terrain.waterLevelAt(x, z);
      if (wl !== null && h < wl + 0.6) continue;
      pos.push(x, h + 0.4 + rng() * rng() * 3.4, z);
      seed.push(rng(), rng(), rng(), rng());
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 4));
    const vs = /* glsl */`
      uniform float uTime, uScale, uFlicker;
      attribute vec4 aSeed; varying float vI;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position;
        float t = uTime * (0.25 + aSeed.w * 0.2);
        transformed += vec3(sin(t * 1.7 + aSeed.x * 30.0) * 1.2, sin(t * 2.3 + aSeed.y * 30.0) * 0.5, cos(t * 1.3 + aSeed.z * 30.0) * 1.2);
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        // blink: a slow swell, a sudden fall, a long dark
        float c = fract(uTime * (0.16 + aSeed.w * 0.12) + aSeed.x * 9.0);
        vI = pow(smoothstep(0.0, 0.22, c) * (1.0 - smoothstep(0.22, 0.42, c)), 1.5) * (0.8 + 0.2 * uFlicker);
        gl_PointSize = clamp(0.55 * uScale / max(depth, 0.1), 2.5, 48.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      uniform vec3 uAmber; varying float vI;
      ${fogPars}
      void main() {
        ${fogAtten}
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c);
        float a = exp(-r2 * 38.0) * 1.3 + exp(-r2 * 7.0) * 0.18;
        gl_FragColor = vec4(uAmber * a * vI * fogAtten * 1.6, 1.0);
      }`;
    pointsOf(geo, bind(mkMat(vs, fs, { uAmber: { value: C('#ffb347') } }, { additive: true })), 30);
  }

  // ------------------------------------------------------------------ 5. ground mist
  {
    const rng = ctx.makeRng(8501);
    const homes = [], dims = [];
    const add = (x, y, z, w, h) => {
      homes.push(x, y, z, rng());
      dims.push(w, h, 0.010 + rng() * 0.008, rng() * 10);
    };
    const nFen = Math.round(26 * q), nTarn = Math.round(14 * q), nHollow = Math.round(44 * q);
    const fen = ctx.water.fen, tarn = ctx.water.tarn;
    for (let i = 0; i < nFen; i++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 72;
      const x = fen.x + Math.cos(a) * r, z = fen.z + Math.sin(a) * r;
      add(x, Math.max(terrain.heightAt(x, z), fen.y) + 0.2, z, 24 + rng() * 22, 3 + rng() * 2.5);
    }
    for (let i = 0; i < nTarn; i++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 52;
      add(tarn.x + Math.cos(a) * r, tarn.y + 0.3, tarn.z + Math.sin(a) * r, 26 + rng() * 22, 3 + rng() * 2);
    }
    for (let tries = 0, got = 0; tries < 8000 && got < nHollow; tries++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 270;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = terrain.heightAt(x, z);
      if (h < -9) continue;
      const nb = (terrain.heightAt(x + 14, z) + terrain.heightAt(x - 14, z) + terrain.heightAt(x, z + 14) + terrain.heightAt(x, z - 14)) * 0.25;
      if (h >= -1 && h > nb - 0.7) continue;     // a hollow: low, or lower than its surroundings
      if (Math.hypot(x - fen.x, z - fen.z) < fen.r + 10 || Math.hypot(x - tarn.x, z - tarn.z) < tarn.r + 10) continue;
      add(x, h + 0.2, z, 18 + rng() * 16, 2.5 + rng() * 2); got++;
    }
    const n = homes.length / 4;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
    geo.setAttribute('aHome', new THREE.InstancedBufferAttribute(new Float32Array(homes), 4));
    geo.setAttribute('aDim', new THREE.InstancedBufferAttribute(new Float32Array(dims), 4));
    geo.instanceCount = n;
    const vs = /* glsl */`
      uniform float uTime;
      attribute vec4 aHome, aDim;
      varying vec2 vUv; varying float vLife; varying float vSeed; varying vec2 vOff;
      #include <fog_pars_vertex>
      void main() {
        float ph = fract(uTime * aDim.z + aHome.w);               // drifts east, then fades and returns
        vec3 c = aHome.xyz + vec3((ph - 0.5) * 70.0, 0.0, (ph - 0.5) * 9.0);
        c.y += 0.3 * aDim.y;
        vec3 f = normalize(cameraPosition - c);
        vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), f));
        vec3 up = cross(f, right);
        vec3 transformed = c + right * position.x * aDim.x + up * position.y * aDim.y;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vUv = uv; vSeed = aHome.w;
        vOff = vec2(aDim.w, aHome.w * 7.0);
        float cam = length(cameraPosition - c);
        vLife = sin(3.14159 * ph) * smoothstep(5.0, 26.0, cam);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      uniform sampler2D uTex; uniform float uTime, uFlicker; uniform vec3 uSun, uWarm;
      varying vec2 vUv; varying float vLife; varying float vSeed; varying vec2 vOff;
      ${fogPars}
      void main() {
        vec2 uv = vUv;
        float n = texture2D(uTex, uv * vec2(1.3, 0.55) + vOff + vec2(uTime * 0.004, 0.0)).r * 0.6
                + texture2D(uTex, uv * vec2(3.1, 1.2) + vOff * 1.7 - vec2(uTime * 0.007, 0.0)).r * 0.4;
        float edge = smoothstep(0.0, 0.42, uv.x) * (1.0 - smoothstep(0.58, 1.0, uv.x));
        float prof = pow(sin(3.14159 * clamp(uv.y, 0.0, 1.0)), 1.4);
        float a = smoothstep(0.34, 0.78, n) * edge * prof * vLife * 0.30;
        ${fogAtten}
        vec3 dir = normalize(vFogWorldPos - cameraPosition);
        float toSun = max(dot(dir, uSun), 0.0);
        vec3 col = mix(vec3(0.20, 0.16, 0.24), uWarm * 0.7, pow(toSun, 2.5) * uFlicker) + vec3(0.03, 0.025, 0.035);
        gl_FragColor = vec4(col, a * fogDistAtten);
      }`;
    const mat = bind(mkMat(vs, fs, { uTex: { value: makeMistTexture(ctx.makeRng(8502)) }, uWarm: { value: C(palette.sunLight) } }));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false; mesh.renderOrder = 22; scene.add(mesh);
  }

  // ------------------------------------------------------------------ 6. frost motes at the Lattice
  {
    const m = L.moraine, rng = ctx.makeRng(8601);
    const want = Math.round(600 * q);
    const pos = [], seed = [];
    for (let tries = 0; tries < 6000 && pos.length / 3 < want; tries++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * (m.r + 20);
      const x = m.x + Math.cos(a) * r, z = m.z + Math.sin(a) * r;
      if (terrain.glacierMask(x, z) < 0.05 && r > m.r * 0.7) continue;
      if (Math.hypot(x, z) > ctx.world.regionRadius + 40) continue;
      pos.push(x, terrain.heightAt(x, z), z);
      seed.push(rng(), rng(), rng(), rng());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 4));
    const vs = /* glsl */`
      uniform float uTime, uScale;
      attribute vec4 aSeed; varying float vI;
      #include <fog_pars_vertex>
      void main() {
        float life = 3.5 + aSeed.w * 4.0;
        float c = fract(uTime / life + aSeed.x * 13.0);                 // 0..1 through its rise
        vec3 transformed = position;
        transformed.y += c * (2.5 + aSeed.y * 5.0) + 0.1;
        transformed.x += sin(uTime * 0.5 + aSeed.z * 40.0) * 0.5 * c;
        transformed.z += cos(uTime * 0.43 + aSeed.y * 40.0) * 0.5 * c;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        float wink = sin(3.14159 * c); wink *= wink;
        float glint = 0.55 + 0.45 * sin(uTime * (4.0 + aSeed.z * 6.0) + aSeed.x * 60.0);
        vI = wink * glint;
        gl_PointSize = clamp((0.22 + aSeed.w * 0.25) * uScale / max(depth, 0.1), 2.5, 40.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      uniform vec3 uBlue; varying float vI;
      ${fogPars}
      void main() {
        ${fogAtten}
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c);
        // a four-pointed glint over a soft core
        float star = exp(-abs(c.x) * 18.0 - c.y * c.y * 6.0) + exp(-abs(c.y) * 18.0 - c.x * c.x * 6.0);
        float a = exp(-r2 * 20.0) + star * 0.5;
        gl_FragColor = vec4(uBlue * a * vI * fogAtten * 2.2, 1.0);
      }`;
    pointsOf(geo, bind(mkMat(vs, fs, { uBlue: { value: C(palette.crystal) } }, { additive: true })), 30);
  }

  // ------------------------------------------------------------------ 7. wind-borne seeds and leaves
  {
    const n = Math.round(110 * q), box = 70;
    const geo = seedGeo(n, ctx.makeRng(8701));
    const vs = PT_VERT_HEAD + /* glsl */`
      uniform float uBox, uWindD, uGust;
      varying float vA; varying vec3 vCol; varying float vRot; varying float vElong;
      uniform vec3 uColA, uColB, uColC;
      void main() {
        vec3 wind = normalize(vec3(1.0, 0.0, 0.35));
        float sp = 0.7 + 0.5 * aSeed.w;
        vec3 p0 = aSeed.xyz * uBox + wind * uWindD * sp;
        p0.y = 0.5 + aSeed.y * 2.6 + sin(uWindD * 0.4 * sp + aSeed.x * 30.0) * 0.5 + sin(uTime * 1.3 + aSeed.z * 20.0) * 0.1;
        p0.y += floor(cameraPosition.y) * 0.0;
        vec3 rel = mod(p0 - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
        rel.y = p0.y - (cameraPosition.y - 1.4) ;
        vec3 transformed = cameraPosition + rel;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        float edge = 1.0 - smoothstep(0.5, 1.0, length(rel.xz) / (uBox * 0.5));
        vA = edge * uGust * smoothstep(1.2, 4.0, length(rel));
        float k = fract(aSeed.w * 7.13 + aSeed.x * 5.1);
        vCol = k < 0.5 ? uColA : (k < 0.8 ? uColB : uColC);
        vRot = uTime * (1.0 + aSeed.z * 3.0) * (aSeed.x > 0.5 ? 1.0 : -1.0) + aSeed.y * 6.28;
        vElong = k < 0.5 ? 2.2 : (k < 0.8 ? 1.0 : 1.6);
        gl_PointSize = clamp(max(1.5, (0.07 + 0.08 * aSeed.w) * uScale / max(depth, 0.1)), 1.5, 26.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      varying float vA; varying vec3 vCol; varying float vRot; varying float vElong;
      ${fogPars}
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        float cs = cos(vRot), sn = sin(vRot);
        c = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
        c.x /= vElong; 
        float r = length(c);
        float a = 1.0 - smoothstep(0.55, 0.85, r);
        gl_FragColor = vec4(vCol, a * vA * 0.85);
        #include <fog_fragment>
      }`;
    const mat = bind(mkMat(vs, fs, {
      uBox: { value: box }, uWindD: { value: 0 }, uGust: { value: 0 },
      uColA: { value: C('#6a4a22') }, uColB: { value: C('#8a6a3a') }, uColC: { value: C('#9a8a78') },
    }));
    pointsOf(geo, mat, 24);
    // gusts: a slow irregular cycle; the stream only shows while a gust blows, and only on open moor
    let windD = 0;
    const wood = L.wood, fen = L.fen, tarn = L.tarn;
    ctx.registerUpdate((dt, t) => {
      const g = Math.max(0, Math.sin(t * 0.11 + 1.3) * 0.6 + Math.sin(t * 0.047 + 0.4) * 0.5 + 0.05);
      const gust = smooth(0.25, 0.85, g);
      windD += dt * (1.2 + gust * 10);
      const px = camera.position.x, pz = camera.position.z;
      const open = 1 - Math.max(
        1 - smooth(wood.r - 30, wood.r + 10, Math.hypot(px - wood.x, pz - wood.z)),
        1 - smooth(fen.r - 20, fen.r + 20, Math.hypot(px - fen.x, pz - fen.z)),
        1 - smooth(tarn.r - 20, tarn.r + 20, Math.hypot(px - tarn.x, pz - tarn.z)));
      mat.uniforms.uWindD.value = windD;
      mat.uniforms.uGust.value = gust * open;
    });
  }


  // ------------------------------------------------------------------ 8. midges over the fen and the water's edge
  {
    const rng = ctx.makeRng(8801), n = Math.round(700 * q);
    const pos = [], seed = [];
    const fen = ctx.water.fen, tarn = ctx.water.tarn;
    for (let i = 0; i < n; i++) {
      const onFen = rng() < 0.7, b = onFen ? fen : tarn;
      const a = rng() * 6.283, r = Math.sqrt(rng()) * (onFen ? 84 : 70);
      const x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
      pos.push(x, Math.max(terrain.heightAt(x, z), b.y) + 0.4 + rng() * 2.4, z);
      seed.push(rng(), rng(), rng(), rng());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 4));
    const vs = /* glsl */`
      uniform float uTime, uScale, uFlicker; uniform vec3 uSun;
      attribute vec4 aSeed; varying float vA; varying float vFw;
      #include <fog_pars_vertex>
      void main() {
        float t = uTime * (0.8 + aSeed.w);
        vec3 transformed = position + vec3(sin(t * 1.3 + aSeed.x * 50.0) * 1.1 + sin(t * 0.31 + aSeed.y * 9.0) * 2.0,
                                           sin(t * 1.7 + aSeed.y * 40.0) * 0.45,
                                           cos(t * 1.1 + aSeed.z * 50.0) * 1.1 + cos(t * 0.27 + aSeed.x * 9.0) * 2.0);
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        vec3 dir = normalize(transformed - cameraPosition);
        vFw = pow(max(dot(dir, uSun), 0.0), 3.0);
        vA = (1.0 - smoothstep(18.0, 55.0, depth)) * smoothstep(0.8, 3.0, depth) * (0.5 + 0.5 * sin(uTime * 9.0 + aSeed.x * 99.0));
        gl_PointSize = clamp(max(1.5, 0.028 * uScale / max(depth, 0.1)), 1.5, 8.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      uniform vec3 uWarm; varying float vA; varying float vFw;
      ${fogPars}
      ${softDot}
      void main() {
        float s = softDot(gl_PointCoord);
        vec3 col = vec3(0.16, 0.14, 0.17) + uWarm * vFw * 0.9;
        gl_FragColor = vec4(col, s * vA * 0.7);
        #include <fog_fragment>
      }`;
    pointsOf(geo, bind(mkMat(vs, fs, { uWarm: { value: C(palette.sunLight) } })), 26);
  }

  // ------------------------------------------------------------------ 9. moths in the Deodand Wood
  {
    const wood = L.wood, rng = ctx.makeRng(8901), want = Math.round(48 * q);
    const pos = [], seed = [];
    for (let tries = 0; tries < 2000 && pos.length / 3 < want; tries++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * (wood.r - 10);
      const x = wood.x + Math.cos(a) * r, z = wood.z + Math.sin(a) * r;
      const h = terrain.heightAt(x, z), wl = terrain.waterLevelAt(x, z);
      if (wl !== null && h < wl + 0.6) continue;
      pos.push(x, h + 1.2 + rng() * 3.5, z); seed.push(rng(), rng(), rng(), rng());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 4));
    const vs = /* glsl */`
      uniform float uTime, uScale, uFlicker; uniform vec3 uSun;
      attribute vec4 aSeed; varying float vA; varying float vFw; varying float vWing;
      #include <fog_pars_vertex>
      void main() {
        float t = uTime * (0.12 + aSeed.w * 0.1);
        vec3 transformed = position + vec3(sin(t * 3.1 + aSeed.x * 60.0) * 4.0 + sin(t * 7.3 + aSeed.z * 20.0) * 0.8,
                                           sin(t * 2.3 + aSeed.y * 60.0) * 1.2 + sin(uTime * 4.0 + aSeed.x * 30.0) * 0.12,
                                           cos(t * 2.7 + aSeed.z * 60.0) * 4.0);
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        vFw = pow(max(dot(normalize(transformed - cameraPosition), uSun), 0.0), 2.0);
        vWing = 0.55 + 0.45 * sin(uTime * (14.0 + aSeed.y * 6.0) + aSeed.x * 90.0);
        vA = (1.0 - smoothstep(30.0, 70.0, depth)) * smoothstep(1.0, 3.0, depth);
        gl_PointSize = clamp(max(2.0, 0.17 * uScale / max(depth, 0.1)), 2.0, 22.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      uniform vec3 uWarm; varying float vA; varying float vFw; varying float vWing;
      ${fogPars}
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        c.y *= 1.0 + 0.8 * vWing;                         // wings open and shut
        float s = 1.0 - smoothstep(0.3, 0.9, length(vec2(c.x * 0.8, c.y)));
        vec3 col = vec3(0.30, 0.27, 0.24) + uWarm * vFw * 0.7;
        gl_FragColor = vec4(col, s * vA * 0.75);
        #include <fog_fragment>
      }`;
    pointsOf(geo, bind(mkMat(vs, fs, { uWarm: { value: C(palette.sunLight) } })), 26);
  }

  // ------------------------------------------------------------------ 10. bubbles rising in the fen, popping in rings
  {
    const fen = ctx.water.fen, rng = ctx.makeRng(9001), want = Math.round(70 * q);
    const pos = [], seed = [];
    for (let tries = 0; tries < 6000 && pos.length / 3 < want; tries++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 74;
      const x = fen.x + Math.cos(a) * r, z = fen.z + Math.sin(a) * r;
      if (terrain.heightAt(x, z) > fen.y - 0.5) continue;
      pos.push(x, fen.y, z); seed.push(rng(), rng(), rng(), rng());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 4));
    const vs = /* glsl */`
      uniform float uTime, uScale, uFlicker;
      attribute vec4 aSeed; varying float vC; varying float vA;
      #include <fog_pars_vertex>
      void main() {
        float c = fract(uTime * (0.045 + aSeed.w * 0.05) + aSeed.x * 7.0);  // 0..0.55 rising, then a ring
        vec3 transformed = position;
        float rise = min(c / 0.55, 1.0);
        transformed.y -= (1.0 - rise) * 0.9;
        transformed.y += step(0.55, c) * 0.03;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        float ring = clamp((c - 0.55) / 0.45, 0.0, 1.0);
        vC = c < 0.55 ? -1.0 : ring;
        vA = c < 0.55 ? 0.35 * rise : (1.0 - ring);
        float sz = c < 0.55 ? 0.12 : 0.25 + ring * 0.9;
        vA *= 1.0 - smoothstep(25.0, 70.0, depth);
        gl_PointSize = clamp(sz * uScale / max(depth, 0.1), 2.0, 70.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      varying float vC; varying float vA;
      ${fogPars}
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r = length(c);
        float a = vC < 0.0 ? exp(-r * r * 12.0) : exp(-pow((r - 0.8) / 0.12, 2.0)) * 0.7;
        gl_FragColor = vec4(vec3(0.42, 0.40, 0.36), a * vA);
        #include <fog_fragment>
      }`;
    pointsOf(geo, bind(mkMat(vs, fs, {})), 21);
  }

  // ------------------------------------------------------------------ 11. leaf litter and petals drifting on the tarn
  {
    const tarn = ctx.water.tarn, rng = ctx.makeRng(9101), n = Math.round(120 * q);
    const pos = [], seed = [];
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 48;
      pos.push(tarn.x + Math.cos(a) * r, tarn.y + 0.02, tarn.z + Math.sin(a) * r);
      seed.push(rng(), rng(), rng(), rng());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 4));
    const vs = /* glsl */`
      uniform float uTime, uScale; uniform vec3 uA, uB, uC;
      attribute vec4 aSeed; varying vec3 vCol; varying float vRot; varying float vA;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position;
        transformed.x += sin(uTime * 0.05 + aSeed.x * 40.0) * 4.0 + uTime * 0.02;
        transformed.z += cos(uTime * 0.04 + aSeed.y * 40.0) * 4.0;
        transformed.y += sin(uTime * 0.8 + aSeed.z * 50.0) * 0.015;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        float k = fract(aSeed.w * 7.1 + aSeed.x * 3.3);
        vCol = k < 0.55 ? uA : (k < 0.8 ? uB : uC);
        vRot = aSeed.z * 6.28 + sin(uTime * 0.1 + aSeed.x * 30.0) * 0.6;
        vA = 1.0 - smoothstep(40.0, 90.0, depth);
        gl_PointSize = clamp(max(2.0, (0.16 + 0.2 * aSeed.w) * uScale / max(depth, 0.1)), 2.0, 22.0);
        #include <fog_vertex>
      }`;
    const fs = /* glsl */`
      varying vec3 vCol; varying float vRot; varying float vA;
      ${fogPars}
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        float cs = cos(vRot), sn = sin(vRot);
        c = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y);
        c.y *= 1.9;                                          // flattened to lie on the surface
        float a = 1.0 - smoothstep(0.6, 0.9, length(c * vec2(1.0, 0.6)));
        gl_FragColor = vec4(vCol, a * vA * 0.9);
        #include <fog_fragment>
      }`;
    pointsOf(geo, bind(mkMat(vs, fs, { uA: { value: C('#4a2a14') }, uB: { value: C('#6a4a22') }, uC: { value: C('#8a7a76') } })), 21);
  }

  // ------------------------------------------------------------------ frame: shared uniforms
  const tmpSize = new THREE.Vector2();
  ctx.registerUpdate((dt, t) => {
    U.uTime.value = t;
    U.uFlicker.value = flick.value;
    ctx.renderer.getDrawingBufferSize(tmpSize);
    U.uScale.value = tmpSize.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5));
  });
  ctx.log('particles: 11 systems');
}
