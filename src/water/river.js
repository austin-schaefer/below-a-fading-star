// The Tumbling Water: the ravine stream above the lip, the fall, the mist at its foot, and the river from
// the pool to the fen. One ribbon mesh for the running water (ravine and river strips share it), one sheet
// for the fall, one instanced billboard set for the mist, one instanced mesh for the boulders in the
// stream. The channel itself is carved in terrain.js; RIVER there is the single source of the layout.
import * as THREE from 'three';
import { injectReachRiver } from '../v7/reach.js'; // v7: DP the Luminous Reach, a chunk in the ribbon's fragment shader

const MAX_ROCKS = 16;

// Height on the rendered terrain triangles (not the analytic heightAt), so the water's edge fade follows
// what the GPU draws at either quality.
export function meshHeightSampler(terrain) {
  const geo = terrain.mesh.geometry, prm = geo.parameters;
  const segs = prm.widthSegments, size = prm.width, step = size / segs, half = size / 2, row = segs + 1;
  const P = geo.attributes.position.array;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  return (x, z) => {
    const gx = cl((x + half) / step, 0, segs - 1e-4), gz = cl((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
    if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
    return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
  };
}

// The scene's own sky as still water sees it (same gradient as sky.js), with the mountain ring mirrored
// as a black band. Shared by the river; the fen and tarn carry their own copy in water.js.
const SKY_GLSL = /* glsl */`
  vec3 skyCol(vec3 d) {
    float up = clamp(d.y, 0.0, 1.0);
    float toSun = max(dot(d, uSunDir), 0.0);
    float band = pow(1.0 - up, 3.5);
    vec3 horizon = mix(uHorizonAway, uHorizonSun, pow(toSun, 1.6));
    vec3 sky = mix(uZenith, horizon, band);
    float glow = pow(toSun, 6.0) * 0.55 + pow(toSun, 24.0) * 0.7 + pow(toSun, 90.0) * 1.2;
    sky += uSunLight * glow * uFlicker * (0.6 + 0.4 * (1.0 - smoothstep(0.0, 0.35, up)));
    return sky;
  }`;

const RIBBON_VERT = /* glsl */`
  attribute vec4 aFlow;   // s (downstream metres), d (across, + left), half-width, depth (level - ground)
  attribute vec4 aMisc;   // speed m/s, roughness (rapids / cascade), wall (how much canyon stands over it), strip (0 river, 1 ravine)
  attribute vec2 aTan;    // downstream direction (x, z)
  varying vec4 vFlow; varying vec4 vMisc; varying vec2 vTan; varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec3 transformed = position;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vFlow = aFlow; vMisc = aMisc; vTan = aTan;
    vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const RIBBON_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime, uFlicker;
  uniform vec3 uSunDir, uSunCore, uSunLight, uHorizonSun, uHorizonAway, uZenith, uWater, uFoam;
  uniform vec3 uPool;      // x, z, r: the pool's own surface takes over inside
  uniform vec3 uFen;       // x, z, r: the fen's surface takes over inside
  uniform vec4 uRocks[${MAX_ROCKS}]; // s, d, radius, on
  varying vec4 vFlow; varying vec4 vMisc; varying vec2 vTan; varying vec3 vWorld;
  #include <fog_pars_fragment>
  #define FLOW_T 2.0
  ${SKY_GLSL}
  vec2 slope2(vec2 uv) { return (texture2D(uTex, uv).rg - 0.5) * 2.0; }
  float mask(vec2 uv) { return texture2D(uTex, uv).a; }
  void main() {
    vec3 P = vWorld;
    if (distance(P.xz, uPool.xy) < uPool.z) discard;
    float fenFade = smoothstep(uFen.z - 1.0, uFen.z + 3.0, distance(P.xz, uFen.xy));
    if (fenFade <= 0.002) discard;
    float s = vFlow.x, d = vFlow.y, hw = vFlow.z;
    float sp = vMisc.x, rough = vMisc.y, wall = vMisc.z, ravine = vMisc.w;
    float rag = mask(P.xz * 0.23);
    float dep = vFlow.w + (rag - 0.5) * 0.16;
    float edge = smoothstep(0.0, 0.16, dep);
    if (edge <= 0.002) discard;

    vec3 toCam = cameraPosition - P;
    float dist = length(toCam);
    vec3 V = toCam / dist;
    float far = 1.0 / (1.0 + dist * 0.01);

    // flow space: ripples stretched along the stream and carried down it, faster where it runs. The carry is a
    // flow map's two phases: each runs FLOW_T seconds from where it started and fades out as it restarts, the
    // other half a period behind, so the speed's change along the stream never shears the pattern by more than
    // FLOW_T seconds' worth (carried by the whole of uTime, it crushed the texture into streaks and noise wherever
    // the speed changed, worse every minute); the phases are staggered across the water so it never pulses as one
    float t = uTime;
    float fJit = mask(P.xz * 0.031 + 0.5);
    float fF0 = fract(t / FLOW_T + fJit), fF1 = fract(fF0 + 0.5);
    float fT0 = fF0 * FLOW_T, fT1 = fF1 * FLOW_T, fW0 = 1.0 - abs(2.0 * fF0 - 1.0);
    vec2 a = mix(slope2(vec2(d * 0.16 + 0.43, (s - sp * fT1) * 0.075 + 0.29)), slope2(vec2(d * 0.16, (s - sp * fT0) * 0.075)), fW0);
    vec2 b = mix(slope2(vec2(d * 0.37 + 0.74, (s - sp * 1.25 * fT1) * 0.19 + 0.53)), slope2(vec2(d * 0.37 + 0.31, (s - sp * 1.25 * fT0) * 0.19)), fW0);
    vec2 c = mix(slope2(vec2(d * 0.85 + 0.19, (s - sp * 0.85 * fT1) * 0.47 + 0.67)), slope2(vec2(d * 0.85 + 0.7, (s - sp * 0.85 * fT0) * 0.47)), fW0);
    // two uncorrelated phases half and half are flatter than either: give back the lost relief (1 / sqrt(w^2 + (1-w)^2))
    float fNorm = inversesqrt(fW0 * fW0 + (1.0 - fW0) * (1.0 - fW0));
    // a slow cross-swirl so slow water still breathes
    vec2 sw = slope2(vec2(P.x * 0.05 + t * 0.006, P.z * 0.05 - t * 0.004));
    float amp = 0.035 + 0.045 * sp + rough * 0.16;
    vec2 sl = (a * 0.5 + b * 0.4 + c * 0.35 * far) * amp * fNorm + sw * 0.025;
    // standing waves over the stones of the bed where it runs fast
    sl.y += sin(s * 2.1 + d * 0.7 + mask(vec2(d * 0.3, s * 0.05)) * 6.0) * 0.03 * smoothstep(1.0, 3.0, sp);
    vec3 T = vec3(vTan.x, 0.0, vTan.y), B = vec3(vTan.y, 0.0, -vTan.x);
    vec3 N = normalize(vec3(0.0, 1.0, 0.0) - B * sl.x - T * sl.y);

    float NV = max(dot(N, V), 0.0);
    float fres = clamp((0.04 + 0.96 * pow(1.0 - NV, 4.0)) * 1.1, 0.0, 1.0);
    vec3 R = reflect(-V, N); R.y = abs(R.y);
    vec3 refl = skyCol(R) * 0.8;
    // the canyon walls stand over the water: low reflections are of dark rock, warm where the sun takes it
    float wallR = wall * (1.0 - smoothstep(0.08, 0.55, R.y));
    vec3 rock = vec3(0.022, 0.017, 0.016) + uSunLight * 0.025 * uFlicker * max(dot(normalize(R.xz + 1e-4), -normalize(uSunDir.xz)), 0.0);
    refl = mix(refl, rock, wallR * 0.92);
    // and beyond the canyon the mountain ring, as on the fen
    {
      float az = atan(R.z, R.x);
      float crest = 0.13 + 0.07 * sin(az * 7.0 + 1.3) + 0.04 * sin(az * 19.0 + 0.4);
      float mtn = 1.0 - smoothstep(crest - 0.02, crest + 0.02, R.y);
      refl = mix(refl, vec3(0.010, 0.008, 0.014) + uHorizonAway * 0.05, mtn * 0.85 * (1.0 - wall));
    }
    float sd = dot(R, uSunDir);
    refl += uSunCore * smoothstep(0.9948, 0.9972, sd) * 2.4 * uFlicker;
    refl += uSunLight * pow(max(sd, 0.0), 160.0) * 0.9 * uFlicker;

    // body: peat-brown and clear where shallow, so the shingle shows through
    vec3 body = uWater * (0.7 + 0.3 * NV) + vec3(0.006, 0.004, 0.002);
    vec3 col = mix(body, refl, fres);
    float alpha = edge * mix(0.42, 0.94, smoothstep(0.08, 1.1, dep));
    alpha = mix(alpha, 1.0, fres * 0.6 * edge);

    // foam: white water on the rapids and the ravine cascade, streaks along the swift edges,
    // a cushion and a wake behind every boulder in the stream
    // (the same two phases; a mask's mean is kept as they cross, its spread given back as for the slopes)
    float streak = mix(mask(vec2(d * 0.9 + 0.37, (s - sp * fT1) * 0.11 + 0.41)) * 0.55 + mask(vec2(d * 2.3 + 0.83, (s - sp * 1.15 * fT1) * 0.3 + 0.17)) * 0.45,
                       mask(vec2(d * 0.9, (s - sp * fT0) * 0.11)) * 0.55 + mask(vec2(d * 2.3 + 0.4, (s - sp * 1.15 * fT0) * 0.3)) * 0.45, fW0);
    float churn = mix(mask(vec2(d * 0.6 + t * 0.03 + 0.59, (s - sp * fT1) * 0.35 + 0.23)) * 0.5 + mask(vec2(d * 1.7 + 0.31, (s - sp * 1.4 * fT1) * 0.9 + 0.71)) * 0.5,
                      mask(vec2(d * 0.6 + t * 0.03, (s - sp * fT0) * 0.35)) * 0.5 + mask(vec2(d * 1.7, (s - sp * 1.4 * fT0) * 0.9)) * 0.5, fW0);
    streak = 0.5 + (streak - 0.5) * fNorm; churn = 0.5 + (churn - 0.5) * fNorm;
    float foam = smoothstep(0.72 - rough * 0.55, 0.92 - rough * 0.45, churn) * smoothstep(0.02, 0.25, rough);
    float edgeLine = (1.0 - smoothstep(0.0, 0.22, dep)) * smoothstep(1.0, 3.0, sp);
    foam = max(foam, edgeLine * smoothstep(0.6, 0.8, streak) * 0.6);
    float wakes = 0.0;
    for (int i = 0; i < ${MAX_ROCKS}; i++) {
      vec4 rk = uRocks[i];
      if (rk.w < 0.5) continue;
      float ds = s - rk.x, dd = d - rk.y, r = rk.z;
      if (ds < -r * 1.6 || ds > 26.0 || abs(dd) > r * 4.0 + 2.0) continue;
      float rr = length(vec2(ds, dd));
      float cushion = exp(-pow((rr - r * 0.95) / (0.18 + r * 0.12), 2.0)) * smoothstep(-r * 1.4, -r * 0.2, -ds + r * 0.3);
      float spread = r * (0.7 + max(ds, 0.0) * 0.09);
      float wake = exp(-pow(dd / spread, 2.0)) * exp(-max(ds, 0.0) / (1.5 + r * 1.5)) * step(0.0, ds);
      // the wake splits into two trailing lines
      float lines = exp(-pow((abs(dd) - spread * 0.75) / (0.12 + spread * 0.12), 2.0)) * exp(-max(ds, 0.0) / (3.0 + r * 3.0)) * step(0.0, ds);
      wakes = max(wakes, max(cushion, max(wake * 0.7, lines * 0.6)));
    }
    foam = max(foam, wakes * smoothstep(0.5, 0.78, streak + 0.1));
    foam *= edge;
    vec3 foamCol = uFoam * (0.3 + 0.7 * uFlicker) * (0.75 + 0.25 * N.y);
    col = mix(col, foamCol, foam * 0.9);
    alpha = max(alpha, foam * 0.95);
    // the ravine cascade is mostly white
    col = mix(col, foamCol * 0.85, ravine * smoothstep(0.4, 0.7, churn) * 0.6);

    alpha *= fenFade;
    gl_FragColor = vec4(col, alpha);
    vec3 preFog = gl_FragColor.rgb;
    #include <fog_fragment>
    gl_FragColor.rgb = mix(gl_FragColor.rgb, preFog, 0.3 * (1.0 - smoothstep(40.0, 220.0, dist)));
  }`;

const FALL_VERT = /* glsl */`
  attribute vec3 aFall; // u across (-1..1), v down the fall (0 lip .. 1 pool), layer
  varying vec3 vFall; varying vec3 vWorld; varying vec3 vN;
  #include <fog_pars_vertex>
  void main() {
    vec3 transformed = position;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vFall = aFall; vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FALL_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime, uFlicker;
  uniform vec3 uSunDir, uSunLight, uFoam, uShade;
  varying vec3 vFall; varying vec3 vWorld; varying vec3 vN;
  #include <fog_pars_fragment>
  void main() {
    float u = vFall.x, v = vFall.y, layer = vFall.z;
    // falling water accelerates: texture distance runs with the square of the time fallen
    float fallen = v * v * 2.2 + v * 0.6;
    float t = uTime * (layer > 0.5 ? 1.25 : 1.0);
    float s1 = texture2D(uTex, vec2(u * 0.9 + layer * 0.37, fallen * 0.28 - t * 0.55)).a;
    float s2 = texture2D(uTex, vec2(u * 2.3 + 0.13 + layer * 0.21, fallen * 0.6 - t * 1.05)).a;
    float s3 = texture2D(uTex, vec2(u * 5.1 + 0.5, fallen * 1.4 - t * 2.0)).a;
    float n = s1 * 0.45 + s2 * 0.35 + s3 * 0.2;
    // streaks: thin vertical lanes where the sheet is thick
    float lanes = texture2D(uTex, vec2(u * 1.7 + layer * 0.5, 0.31)).a;
    float thick = smoothstep(0.32, 0.62, n + (lanes - 0.5) * 0.5 + 0.2 * (1.0 - v));
    float sideFade = 1.0 - smoothstep(0.55 + 0.25 * v, 1.0, abs(u));
    float lipFade = smoothstep(0.0, 0.03, v);
    float footFade = 1.0 - smoothstep(0.8, 1.0, v) * 0.75;
    float alpha = thick * sideFade * lipFade * footFade * (layer > 0.5 ? 0.55 : 0.85);
    // bright at the lip where the water first turns white, greying as it breaks up below
    float sunFace = max(dot(normalize(vN), normalize(uSunDir)), 0.0) * 0.6 + 0.4;
    vec3 lit = mix(uShade, uFoam * 1.15, sunFace * (0.35 + 0.65 * uFlicker));
    float lip = 1.0 - smoothstep(0.0, 0.18, v);
    vec3 col = lit * (0.75 + 0.35 * n) + uFoam * lip * 0.6 * (0.4 + 0.6 * uFlicker);
    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
  }`;

const MIST_VERT = /* glsl */`
  attribute vec4 aSeed;  // offset x, y, z from the foot, size
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv; varying float vA; varying float vPh;
  #include <fog_pars_vertex>
  void main() {
    float ph = aPhase;
    float life = fract(uTime * 0.045 + ph);
    vec3 c = aSeed.xyz + vec3(sin(uTime * 0.11 + ph * 6.0) * 0.6, life * 3.5, cos(uTime * 0.09 + ph * 5.0) * 0.6);
    float size = aSeed.w * (0.8 + life * 0.6);
    vec3 transformed = c;
    vec4 mvPosition = modelViewMatrix * vec4(c, 1.0);
    mvPosition.xy += position.xy * size;
    vUv = position.xy + 0.5; vA = sin(life * 3.14159); vPh = ph;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const MIST_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime, uFlicker, uStrength;
  uniform vec3 uMist;
  varying vec2 vUv; varying float vA; varying float vPh;
  #include <fog_pars_fragment>
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float n = texture2D(uTex, vUv * 0.45 + vec2(vPh * 3.1, -uTime * 0.01)).a * 0.6 + texture2D(uTex, vUv * 1.1 + vec2(vPh, uTime * 0.016)).a * 0.4;
    float a = (1.0 - smoothstep(0.15, 1.0, r)) * smoothstep(0.25, 0.7, n) * vA * uStrength;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uMist * (0.45 + 0.55 * uFlicker), a);
    #include <fog_fragment>
  }`;

export function buildRiver(ctx, tex) {
  const { scene, terrain, palette } = ctx;
  const RV = terrain.river;
  const high = ctx.quality !== 'low';
  const C = (h) => new THREE.Color(h);
  const meshH = meshHeightSampler(terrain);
  const rng = ctx.makeRng(7301);
  const flick = ctx.sky && ctx.sky.flicker ? ctx.sky.flicker : { value: 1 };
  const sunDir = new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z);
  const updates = [];

  // ---------------------------------------------------------------- the ribbon
  const pos = [], flow = [], misc = [], tan = [], idx = [];
  const line = RV.line, gully = RV.gully;
  // sample a polyline at arc length s: position and tangent
  const at = (L, s) => {
    let i = 0;
    while (i < L.n - 2 && L.S[i + 1] < s) i++;
    const l = L.S[i + 1] - L.S[i], f = Math.max(0, Math.min(1, (s - L.S[i]) / l));
    return { x: L.X[i] + (L.X[i + 1] - L.X[i]) * f, z: L.Z[i] + (L.Z[i + 1] - L.Z[i]) * f, tx: (L.X[i + 1] - L.X[i]) / l, tz: (L.Z[i + 1] - L.Z[i]) / l };
  };
  // smooth the tangent over a few metres so the ribbon's cross-lines do not fan at the joints
  const tangent = (L, s, dir) => {
    const a = at(L, s - 2), b = at(L, s + 2);
    let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1;
    return { tx: tx / l * dir, tz: tz / l * dir };
  };
  function strip(L, s0, s1, step, cols, widthAt, levelAt, speedAt, roughAt, wallAt, ravine, dir) {
    const base = pos.length / 3;
    let rows = 0;
    for (let s = s0; s <= s1 + 1e-6; s += step) {
      const p = at(L, s), tg = tangent(L, s, 1);
      const hw = widthAt(s), ext = hw + (ravine ? 0.6 : 2.0);
      const y = levelAt(s);
      // the speed averaged over 8 m: the surface's gradient steps it from 1.8 to 4.2 m/s within a metre or two,
      // and the carry's shear (above) is that change times the phase's length
      let spd = 0; for (let k = -8; k <= 8; k++) spd += speedAt(s + k * 0.5) / 17;
      // downstream direction and the flow coordinate run the same way on both strips
      const fs = dir > 0 ? s : -s;
      const ftx = tg.tx * dir, ftz = tg.tz * dir;
      for (let j = 0; j < cols; j++) {
        const d = -ext + (2 * ext) * j / (cols - 1);
        // left of the downstream direction
        const x = p.x + ftz * d, z = p.z - ftx * d;
        pos.push(x, y, z);
        flow.push(fs, d, hw, y - meshH(x, z));
        misc.push(spd, roughAt(s), wallAt(s), ravine);
        tan.push(ftx, ftz);
      }
      rows++;
    }
    for (let r = 0; r < rows - 1; r++) for (let j = 0; j < cols - 1; j++) {
      const a = base + r * cols + j, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const sEnd = RV.fenEnter + 6;
  const W = RV.levelAt;
  const roughRiver = (s) => Math.max(0, Math.min(1, ((W(s - 1.2) - W(s + 1.2)) / 2.4 - 0.05) * 7));
  strip(line, 3.0, sEnd, high ? 0.6 : 0.9, high ? 18 : 12, RV.halfWidthAt, W, RV.speedAt, roughRiver,
    (s) => Math.min(1, RV.rimAt(s) / 8), 0, 1);
  // the ravine: its arc length runs uphill from the lip, so the strip is laid with the flow reversed
  const gLen = gully.length;
  strip(gully, 0.4, gLen - 0.5, high ? 0.5 : 0.8, high ? 6 : 4, () => 1.25, RV.gullyLevelAt, () => 3.4,
    (u) => Math.min(1, 0.45 + ((RV.gullyLevelAt(u + 1) - RV.gullyLevelAt(u - 1)) / 2) * 0.9), () => 1, 1, -1);

  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  rg.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 4));
  rg.setAttribute('aMisc', new THREE.Float32BufferAttribute(misc, 4));
  rg.setAttribute('aTan', new THREE.Float32BufferAttribute(tan, 2));
  rg.setIndex(idx);
  rg.computeBoundingSphere();

  // boulders standing in the stream: deterministic spots in the swift reach, never in the narrows' thread
  const rocks = [];
  for (let tries = 0; tries < 400 && rocks.length < 14; tries++) {
    const s = 9 + rng() * 76;
    const hw = RV.halfWidthAt(s);
    const d = (rng() * 2 - 1) * hw * 0.85;
    const r = 0.45 + rng() * rng() * 1.0;
    if (rocks.some((k) => Math.hypot(k.s - s, k.d - d) < k.r + r + 2.5)) continue;
    // keep a wading line clear at the two narrows
    if ((Math.abs(s - 40) < 5 || Math.abs(s - 67) < 5) && Math.abs(d) < 1.6) continue;
    const p = at(line, s), tg = tangent(line, s, 1);
    rocks.push({ s, d, r, x: p.x + tg.tz * d, z: p.z - tg.tx * d, y: W(s) });
  }
  // outcrops and fallen blocks along the canyon's walls, half sunk in them: they break the long smooth
  // faces the heightfield makes and drop talus at the wall's foot (same mesh as the stream's boulders)
  const wallRocks = [];
  for (let s = 6; s < 84; s += high ? 2.2 : 3.2) {
    for (const side of [-1, 1]) {
      if (rng() < 0.3) continue;
      const bw = RV.bankWidths(s), hw = RV.halfWidthAt(s);
      const edge = hw + (side > 0 ? bw.bl : bw.br);
      const up = rng() < 0.2 ? 0.8 + rng() * 1.5 : 0;  // a few a little way up the face
      const d = side * (edge + 0.6 + up + rng() * 0.8);
      const p = at(line, s + (rng() - 0.5) * 2), tg = tangent(line, s, 1);
      const x = p.x + tg.tz * d, z = p.z - tg.tx * d;
      const r = (up ? 0.9 : 0.7) + rng() * (up ? 1.6 : 1.2);
      wallRocks.push({ x, z, r, y: terrain.heightAt(x, z) - r * 0.45 });
    }
  }
  const rockUniform = Array.from({ length: MAX_ROCKS }, (_, i) => {
    const k = rocks[i];
    return k ? new THREE.Vector4(k.s, k.d, k.r, 1) : new THREE.Vector4(0, 0, 0, 0);
  });

  const ribbonMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTex: { value: tex }, uTime: { value: 0 }, uFlicker: { value: 1 },
      uSunDir: { value: sunDir.clone() }, uSunCore: { value: C(palette.sunCore) }, uSunLight: { value: C(palette.sunLight) },
      uHorizonSun: { value: C(palette.skyHorizonSun) }, uHorizonAway: { value: C(palette.skyHorizonAway) }, uZenith: { value: C(palette.skyZenith) },
      uWater: { value: C('#0b0807') }, uFoam: { value: C('#a89a90') },
      uPool: { value: new THREE.Vector3(RV.pool.x, RV.pool.z, RV.poolR) },
      uFen: { value: new THREE.Vector3(ctx.water.fen.x, ctx.water.fen.z, ctx.water.fen.r) },
      uRocks: { value: rockUniform },
    }]),
    vertexShader: RIBBON_VERT, fragmentShader: RIBBON_FRAG, fog: true, transparent: true, depthWrite: false,
  });
  injectReachRiver(ribbonMat, ctx); // v7: DP the Luminous Reach, the glow from the fall to the fen (src/v7/reach.js)
  const ribbon = new THREE.Mesh(rg, ribbonMat);
  ribbon.renderOrder = 10; ribbon.name = 'water-river';
  scene.add(ribbon);
  updates.push((dt, t) => { ribbonMat.uniforms.uTime.value = t; ribbonMat.uniforms.uFlicker.value = flick.value; });

  // the boulders: lumpy, wet-dark, one instanced mesh
  {
    const g = new THREE.IcosahedronGeometry(1, high ? 2 : 1);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = ctx.noise.fbm2(v.x * 1.3 + v.z * 0.7, v.y * 1.3 - v.z * 0.4, 3);
      v.multiplyScalar(1 + n * 0.28); v.y *= 0.72;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0 });
    const cWet = C('#26221f'), cDry = C('#4a4440');
    const im = new THREE.InstancedMesh(g, m, rocks.length + wallRocks.length);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pp = new THREE.Vector3();
    rocks.forEach((k, i) => {
      e.set((rng() - 0.5) * 0.4, rng() * 6.28, (rng() - 0.5) * 0.4);
      q.setFromEuler(e);
      sc.set(k.r * (1 + rng() * 0.3), k.r * (0.9 + rng() * 0.5), k.r * (1 + rng() * 0.3));
      pp.set(k.x, Math.min(k.y - k.r * 0.15, terrain.heightAt(k.x, k.z) + k.r * 0.55), k.z);
      M.compose(pp, q, sc);
      im.setMatrixAt(i, M);
      im.setColorAt(i, cWet);
      if (k.r > 0.75) ctx.addCollider({ x: k.x, z: k.z, r: k.r * 0.85 });
    });
    wallRocks.forEach((k, j) => {
      e.set((rng() - 0.5) * 0.8, rng() * 6.28, (rng() - 0.5) * 0.8);
      q.setFromEuler(e);
      sc.set(k.r * (1 + rng() * 0.6), k.r * (0.7 + rng() * 0.6), k.r * (1 + rng() * 0.6));
      pp.set(k.x, k.y, k.z);
      M.compose(pp, q, sc);
      im.setMatrixAt(rocks.length + j, M);
      im.setColorAt(rocks.length + j, cDry.clone().multiplyScalar(0.8 + rng() * 0.35));
    });
    im.castShadow = true; im.receiveShadow = true; im.name = 'river-rocks';
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    scene.add(im);
  }

  // ---------------------------------------------------------------- the fall
  const lip = RV.lip, back = RV.back, pool = RV.pool;
  const out = { x: -back.x, z: -back.z };           // the way the water leaps
  const across = { x: back.z, z: -back.x };
  const g = 9.8, drop = lip.y + 0.25 - pool.y;
  const tFall = Math.sqrt(2 * drop / g);
  const impactR = 3.0;                               // lands this far from the pool's centre, at the back
  const vx = (RV.lipR - impactR) / tFall;
  const fallPos = [], fallUV = [], fallIdx = [];
  const ROWS = high ? 36 : 22, COLS = high ? 12 : 8;
  for (const layer of [0, 1]) {
    const base = fallPos.length / 3;
    for (let r = 0; r <= ROWS; r++) {
      const v = r / ROWS, tt = v * tFall;
      const h = vx * tt - (layer ? 0.35 : 0);      // the back layer hugs closer to the rock
      const y = lip.y + 0.25 - 0.5 * g * tt * tt;
      const w = (1.7 + 0.7 * v + v * v * 0.5) * (layer ? 0.85 : 1);
      for (let c = 0; c <= COLS; c++) {
        const u = (c / COLS) * 2 - 1;
        const bow = (1 - u * u) * 0.25;              // a faint outward belly across the sheet
        fallPos.push(lip.x + out.x * (h + bow) + across.x * u * w, y, lip.z + out.z * (h + bow) + across.z * u * w);
        fallUV.push(u, v, layer);
      }
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const a = base + r * (COLS + 1) + c, b = a + 1, cc = a + COLS + 1, d = cc + 1;
      fallIdx.push(a, cc, b, b, cc, d);
    }
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fallPos, 3));
  fg.setAttribute('aFall', new THREE.Float32BufferAttribute(fallUV, 3));
  fg.setIndex(fallIdx);
  fg.computeVertexNormals();
  fg.computeBoundingSphere();
  const fallMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTex: { value: tex }, uTime: { value: 0 }, uFlicker: { value: 1 },
      uSunDir: { value: sunDir.clone() }, uSunLight: { value: C(palette.sunLight) },
      uFoam: { value: C('#d2c4b8') }, uShade: { value: C('#4a4a58') },
    }]),
    vertexShader: FALL_VERT, fragmentShader: FALL_FRAG, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const fall = new THREE.Mesh(fg, fallMat);
  fall.renderOrder = 12; fall.name = 'water-fall';
  scene.add(fall);
  updates.push((dt, t) => { fallMat.uniforms.uTime.value = t; fallMat.uniforms.uFlicker.value = flick.value; });

  // ---------------------------------------------------------------- mist at the foot
  const impact = { x: pool.x + back.x * impactR, z: pool.z + back.z * impactR, y: pool.y };
  {
    const n = high ? 14 : 8;
    const quad = new THREE.PlaneGeometry(1, 1);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = quad.index; ig.setAttribute('position', quad.attributes.position);
    const seed = new Float32Array(n * 4), phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, r = rng() * 3.2;
      seed[i * 4] = impact.x + Math.cos(a) * r + out.x * 0.8; seed[i * 4 + 1] = pool.y + 0.3 + rng() * 2.5; seed[i * 4 + 2] = impact.z + Math.sin(a) * r + out.z * 0.8;
      seed[i * 4 + 3] = 4 + rng() * 4;
      phase[i] = i / n + rng() * 0.05;
    }
    ig.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    ig.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    ig.instanceCount = n;
    ig.boundingSphere = new THREE.Sphere(new THREE.Vector3(impact.x, pool.y + 4, impact.z), 14);
    const mm = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTex: { value: tex }, uTime: { value: 0 }, uFlicker: { value: 1 }, uStrength: { value: 0.32 }, uMist: { value: C('#9a8e92') },
      }]),
      vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, fog: true, transparent: true, depthWrite: false,
    });
    const mist = new THREE.Mesh(ig, mm);
    mist.frustumCulled = true; mist.renderOrder = 13; mist.name = 'fall-mist';
    scene.add(mist);
    updates.push((dt, t) => { mm.uniforms.uTime.value = t; mm.uniforms.uFlicker.value = flick.value; });
  }

  return {
    update: (dt, t) => { for (const u of updates) u(dt, t); },
    rocks, impact, tFall, vx,
    fall: { x: lip.x + out.x * vx * tFall * 0.5, z: lip.z + out.z * vx * tFall * 0.5, y: (lip.y + pool.y) / 2, lip: { ...lip }, foot: impact, drop, rumbleRadius: 140 }, // v4 map: the taller fall carries twice as far (was 70)
  };
}
