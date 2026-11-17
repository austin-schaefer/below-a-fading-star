// v17's water surfaces (W1): every stream of the kit (src/v17/stream.js; the brook now, W2's leat after it) in one
// ribbon mesh with one program of its own (one draw call while any is in view), and the still bodies (the mere and the
// Swallow's cut) in one mesh in the tarn's own material (water.js: no new program, one draw). Called from water.js's
// build, which hands it the water texture and the tarn's material.
//
// The ribbon follows the river's (water/river.js): flow coordinates per vertex (s downstream, d across), the two-phase
// flow map so a change of speed never shears the pattern, the sky and the mountain ring in the reflection; its edge is
// the depth over the drawn terrain (meshHeightSampler), not heightAt, with a soft backstop at the stream's own edge.
// What is its own: white water below every step (the kit's ROUGH, carried a few metres down), riffle lines that run
// down the quick water, pale so a stream reads in the south trough's shadow from the deck and from 30 m, a still look in
// the pools, and a fade at each end where the stream gives itself to the tarn and the mere.
import * as THREE from 'three';
import { STREAMS, STILLS } from './bodies.js';
import { meshHeightSampler } from '../water/river.js';

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

const VERT = /* glsl */`
  attribute vec4 aFlow;   // s (downstream m), d (across, + left), the edge's half-width on this side, depth over the drawn ground
  attribute vec4 aMisc;   // speed m/s, rough (white water below a step), still (a pool: 1), fade (the ends)
  attribute vec2 aTan;    // downstream (x, z)
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

const FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform float uTime, uFlicker;
  uniform vec3 uSunDir, uSunCore, uSunLight, uHorizonSun, uHorizonAway, uZenith, uWater, uFoam;
  varying vec4 vFlow; varying vec4 vMisc; varying vec2 vTan; varying vec3 vWorld;
  #include <fog_pars_fragment>
  #define FLOW_T 2.0
  ${SKY_GLSL}
  vec2 slope2(vec2 uv) { return (texture2D(uTex, uv).rg - 0.5) * 2.0; }
  float mask(vec2 uv) { return texture2D(uTex, uv).a; }
  void main() {
    vec3 P = vWorld;
    float s = vFlow.x, d = vFlow.y, hw = vFlow.z;
    float sp = vMisc.x, rough = vMisc.y, still = vMisc.z, fade = vMisc.w;
    float rag = mask(P.xz * 0.23);
    float dep = vFlow.w - rag * 0.08;
    // the edge: the depth over the drawn ground (the rag only ever takes from it, so no sheen lies on dry ground at the
    // level), and a backstop just past the stream's own edge
    float edge = smoothstep(0.01, 0.12, dep) * (1.0 - smoothstep(hw - 0.15, hw + 0.45, abs(d) + (rag - 0.5) * 0.5)) * fade;
    if (edge <= 0.002) discard;

    vec3 toCam = cameraPosition - P;
    float dist = length(toCam);
    vec3 V = toCam / dist;
    float far = 1.0 / (1.0 + dist * 0.012);

    // flow space, carried by two phases (water/river.js says why), staggered across the water
    float t = uTime;
    float fJit = mask(P.xz * 0.031 + 0.5);
    float fF0 = fract(t / FLOW_T + fJit), fF1 = fract(fF0 + 0.5);
    float fT0 = fF0 * FLOW_T, fT1 = fF1 * FLOW_T, fW0 = 1.0 - abs(2.0 * fF0 - 1.0);
    float fNorm = inversesqrt(fW0 * fW0 + (1.0 - fW0) * (1.0 - fW0));
    vec2 a = mix(slope2(vec2(d * 0.21 + 0.43, (s - sp * fT1) * 0.11 + 0.29)), slope2(vec2(d * 0.21, (s - sp * fT0) * 0.11)), fW0);
    vec2 b = mix(slope2(vec2(d * 0.5 + 0.74, (s - sp * 1.2 * fT1) * 0.27 + 0.53)), slope2(vec2(d * 0.5 + 0.31, (s - sp * 1.2 * fT0) * 0.27)), fW0);
    vec2 c = mix(slope2(vec2(d * 1.1 + 0.19, (s - sp * 0.9 * fT1) * 0.62 + 0.67)), slope2(vec2(d * 1.1 + 0.7, (s - sp * 0.9 * fT0) * 0.62)), fW0);
    // a slow drift of its own in the pools (they turn, they do not run)
    vec2 sw = slope2(vec2(P.x * 0.07 + t * 0.008, P.z * 0.07 - t * 0.006));
    float amp = (0.06 + 0.07 * sp + rough * 0.18) * (1.0 - 0.6 * still);
    vec2 sl = (a * 0.5 + b * 0.45 + c * 0.35 * far) * amp * fNorm + sw * (0.02 + 0.02 * still);
    // the bed's stones under the quick water stand the surface up in waves that stay put
    sl.y += sin(s * 2.4 + d * 0.9 + mask(vec2(d * 0.3, s * 0.05)) * 6.0) * 0.035 * smoothstep(0.5, 1.6, sp);
    vec3 T = vec3(vTan.x, 0.0, vTan.y), B = vec3(vTan.y, 0.0, -vTan.x);
    vec3 N = normalize(vec3(0.0, 1.0, 0.0) - B * sl.x - T * sl.y);

    float NV = max(dot(N, V), 0.0);
    float fres = clamp((0.04 + 0.96 * pow(1.0 - NV, 4.0)) * 1.1, 0.0, 1.0);
    vec3 R = reflect(-V, N); R.y = abs(R.y);
    vec3 refl = skyCol(R) * 0.85;
    {
      float az = atan(R.z, R.x);
      float crest = 0.13 + 0.07 * sin(az * 7.0 + 1.3) + 0.04 * sin(az * 19.0 + 0.4);
      float mtn = 1.0 - smoothstep(crest - 0.02, crest + 0.02, R.y);
      refl = mix(refl, vec3(0.010, 0.008, 0.014) + uHorizonAway * 0.05, mtn * 0.85);
    }
    float sd = dot(R, uSunDir);
    refl += uSunCore * smoothstep(0.9948, 0.9972, sd) * 2.4 * uFlicker;
    refl += uSunLight * pow(max(sd, 0.0), 160.0) * 0.9 * uFlicker;

    // body: peat-brown and clear where shallow, so the bed's gravel shows through at the edges
    vec3 body = uWater * (0.7 + 0.3 * NV) + vec3(0.006, 0.004, 0.002);
    // from above (the Span's deck, 60 m up) the sky's own colour off the moving surface, so it reads as water at all
    float fpUp = smoothstep(12.0, 50.0, cameraPosition.y - P.y);
    // (a floor under the reflection: in the south trough's shade the ground and a near-black body are one dark, and moving
    // water there is seen by the sky it carries, lighter than the bank)
    vec3 col = mix(body, refl, clamp(max(fres, 0.38) + fpUp * 0.22 * (0.6 + 4.0 * length(sl)), 0.0, 1.0));
    float alpha = edge * mix(0.5, 0.95, smoothstep(0.08, 0.9, dep));
    alpha = mix(alpha, 1.0, fres * 0.6 * edge);

    // white water: churn below a step, riffle lines down the quick water, a line along the swift edges
    float streak = mix(mask(vec2(d * 1.1 + 0.37, (s - sp * fT1) * 0.3 + 0.41)) * 0.55 + mask(vec2(d * 2.6 + 0.83, (s - sp * 1.15 * fT1) * 0.8 + 0.17)) * 0.45,
                       mask(vec2(d * 1.1, (s - sp * fT0) * 0.3)) * 0.55 + mask(vec2(d * 2.6 + 0.4, (s - sp * 1.15 * fT0) * 0.8)) * 0.45, fW0);
    float churn = mix(mask(vec2(d * 0.9 + t * 0.07 + 0.59, (s - sp * 1.3 * fT1) * 0.7 + 0.23)) * 0.5 + mask(vec2(d * 2.2 + 0.31, (s - sp * 1.6 * fT1) * 1.7 + 0.71)) * 0.5,
                      mask(vec2(d * 0.9 + t * 0.07, (s - sp * 1.3 * fT0) * 0.7)) * 0.5 + mask(vec2(d * 2.2, (s - sp * 1.6 * fT0) * 1.7)) * 0.5, fW0);
    streak = 0.5 + (streak - 0.5) * fNorm; churn = 0.5 + (churn - 0.5) * fNorm;
    float foam = smoothstep(0.7 - rough * 0.55, 0.9 - rough * 0.45, churn) * smoothstep(0.02, 0.2, rough);
    // riffles: thin pale lines drawn out down the stream where it runs (the texture stretched along s)
    // (drawn out about 3 to 1 along the stream: longer reads as ruled lines from a vanishing point)
    float rif = mix(mask(vec2(d * 0.9 + 0.13, (s - sp * fT1) * 0.3 + 0.61)), mask(vec2(d * 0.9 + 0.77, (s - sp * fT0) * 0.3)), fW0);
    rif = 0.5 + (rif - 0.5) * fNorm;
    // riffles are not foam: the quick water's surface stood up into ridges that catch the sky, drawn out along the flow,
    // lighter than the water round them but the sky's colour, not white, and half seen through
    float riffle = smoothstep(0.6, 0.76, rif) * smoothstep(0.3, 1.2, sp) * (1.0 - still);
    col = mix(col, skyCol(normalize(vec3(R.x, max(R.y, 0.25), R.z))) * 1.5 + uFoam * 0.06, riffle * 0.55);
    alpha = max(alpha, riffle * 0.6 * edge);
    float edgeLine = (1.0 - smoothstep(0.0, 0.18, dep)) * smoothstep(0.8, 1.8, sp) * smoothstep(0.66, 0.82, streak) * 0.25;
    foam = max(foam, edgeLine) * edge;
    vec3 foamCol = uFoam * (0.35 + 0.65 * uFlicker) * (0.75 + 0.25 * N.y);
    col = mix(col, foamCol, foam * 0.9);
    alpha = max(alpha, foam * 0.95);

    gl_FragColor = vec4(col, alpha);
    vec3 preFog = gl_FragColor.rgb;
    #include <fog_fragment>
    gl_FragColor.rgb = mix(gl_FragColor.rgb, preFog, 0.3 * (1.0 - smoothstep(40.0, 220.0, dist)));
  }`;

// the ribbon's fade at the ends: in from the tarn, out into the mere (stations on the plan's line)
const FADES = { brook: { in: [[-89.5, 197], [-89.5, 201.5]], out: [[-86.8, 263.5], [-87.6, 268.5]] } };

export function buildV17Water(ctx, tex, stillMat) {
  const { scene, terrain, palette } = ctx;
  const high = ctx.quality !== 'low';
  const C = (h) => new THREE.Color(h);
  const meshH = meshHeightSampler(terrain);
  const flick = ctx.sky && ctx.sky.flicker ? ctx.sky.flicker : { value: 1 };
  const sunDir = new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z);
  const out = { streams: [], stills: [], update: () => {} };

  // ---------------------------------------------------------------- the streams' ribbon
  const pos = [], flow = [], misc = [], tan = [], idx = [];
  const rowStep = high ? 1 : 2; // samples are 0.5 m apart: a row every 0.5 m (1 m on low)
  for (const st of STREAMS) {
    if (st.Y.every((y) => y === st.Y[0])) continue; // a level stream is still water: the stills' mesh draws it (the cut)
    const F = FADES[st.name];
    const fin = F ? F.in.map((p) => st.sOf(...p)) : [0, 0], fout = F ? F.out.map((p) => st.sOf(...p)) : [st.length, st.length];
    const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a || 1))); return u * u * (3 - 2 * u); };
    const cols = high ? 13 : 9;
    const base = pos.length / 3;
    let rows = 0;
    for (let k = 0; k < st.n; k += rowStep) {
      const s = st.S[k], y = st.Y[k], tx = st.TX[k], tz = st.TZ[k];
      const fade = sm(fin[0], fin[1], s) * (1 - sm(fout[0], fout[1], s));
      const still = st.SPEED[k] < 0.2 ? 1 : 0;
      const eL = st.HWL[k] + 2.6, eR = st.HWR[k] + 2.6;
      for (let j = 0; j < cols; j++) {
        const u = j / (cols - 1), dd = -eR + (eL + eR) * u;  // right (−) to left (+)
        const x = st.X[k] + tz * dd, z = st.Z[k] - tx * dd, hs = dd >= 0 ? st.HWL[k] : st.HWR[k], m = meshH(x, z);
        // the drawn ground is 2.1 m a cell on medium and 3.1 on low: where the water is narrower than that, no vertex of
        // it may fall in the bed and the drawn ground stands over the water across the whole stream. In the stream's
        // core the surface rides just over the drawn ground there, so the water is drawn on the ground the visitor sees
        // (the walker's feet still go by heightAt, under it)
        const core = 1 - Math.min(1, Math.max(0, (Math.abs(dd) - 0.6 * hs) / (0.4 * hs)));
        const yy = core > 0 && m + 0.06 > y ? y + (m + 0.06 - y) * core : y;
        pos.push(x, yy, z);
        flow.push(s, dd, hs, Math.max(yy - m, core * 0.3));
        misc.push(st.SPEED[k], st.ROUGH[k], still, fade);
        tan.push(tx, tz);
      }
      rows++;
    }
    for (let r = 0; r < rows - 1; r++) for (let j = 0; j < cols - 1; j++) {
      const a = base + r * cols + j, b2 = a + 1, c = a + cols, d = c + 1;
      idx.push(a, c, b2, b2, c, d);
    }
    out.streams.push({ name: st.name, length: st.length, rows });
  }
  let ribbon = null;
  if (idx.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 4));
    g.setAttribute('aMisc', new THREE.Float32BufferAttribute(misc, 4));
    g.setAttribute('aTan', new THREE.Float32BufferAttribute(tan, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTex: { value: tex }, uTime: { value: 0 }, uFlicker: { value: 1 },
        uSunDir: { value: sunDir.clone() }, uSunCore: { value: C(palette.sunCore) }, uSunLight: { value: C(palette.sunLight) },
        uHorizonSun: { value: C(palette.skyHorizonSun) }, uHorizonAway: { value: C(palette.skyHorizonAway) }, uZenith: { value: C(palette.skyZenith) },
        uWater: { value: C('#0b0908') }, uFoam: { value: C('#b8aea4') },
      }]),
      vertexShader: VERT, fragmentShader: FRAG, fog: true, transparent: true, depthWrite: false,
    });
    ribbon = new THREE.Mesh(g, mat);
    ribbon.name = 'water-v17-streams'; ribbon.renderOrder = 11;
    scene.add(ribbon);
    out.update = (dt, t) => { mat.uniforms.uTime.value = t; mat.uniforms.uFlicker.value = flick.value; };
  }

  // ---------------------------------------------------------------- the still water: a grid over each body, its level,
  // the depth over the drawn ground (−0.5 where the body is dry), only the cells near its water kept
  const stills = [...STILLS.map((b) => ({ b, y: b.y, wet: b.wet, box: b.wbox })),
    ...STREAMS.filter((st) => st.Y.every((y) => y === st.Y[0])).map((st) => ({ b: st, y: st.Y[0], wet: st.wet, box: st.box }))];
  if (stillMat && stills.length) {
    const sp = high ? 1.2 : 1.8, P = [], Dp = [], I = [];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const S of stills) {
      const [bx0, bx1, bz0, bz1] = S.box, nx = Math.ceil((bx1 - bx0 + 6) / sp) + 1, nz = Math.ceil((bz1 - bz0 + 6) / sp) + 1;
      const gx = (i) => bx0 - 3 + i * sp, gz = (j) => bz0 - 3 + j * sp;
      const dep = new Float32Array(nx * nz), keep = new Int32Array(nx * nz).fill(-1);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
        const x = gx(i), z = gz(j), dd = S.y - meshH(x, z);
        dep[j * nx + i] = S.wet(x, z) ? dd : Math.min(-0.5, dd);
      }
      const vid = (i, j) => {
        const k = j * nx + i;
        if (keep[k] < 0) { keep[k] = P.length / 3; P.push(gx(i), S.y, gz(j)); Dp.push(dep[k]); }
        return keep[k];
      };
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const k = j * nx + i;
        if (Math.max(dep[k], dep[k + 1], dep[k + nx], dep[k + nx + 1]) <= -0.3) continue;
        const a = vid(i, j), b2 = vid(i + 1, j), c = vid(i, j + 1), d = vid(i + 1, j + 1);
        I.push(a, c, b2, b2, c, d);
      }
      x0 = Math.min(x0, bx0 - 3); x1 = Math.max(x1, bx1 + 3); z0 = Math.min(z0, bz0 - 3); z1 = Math.max(z1, bz1 + 3);
      out.stills.push({ name: S.b.name, y: S.y });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('depth', new THREE.Float32BufferAttribute(Dp, 1));
    g.setIndex(I);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, stills[0].y, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0) / 2 + 2);
    const m = new THREE.Mesh(g, stillMat);
    m.name = 'water-v17-still'; m.renderOrder = 10;
    scene.add(m);
  }
  return out;
}
