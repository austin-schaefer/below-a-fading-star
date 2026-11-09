// DP The Luminous Reach (IDEAS-v5.md DP; wilderness-v5.md "### DP. The Luminous Reach"): "Where the river breaks white
// in the Clough the water flashes a faint blue-green, plankton lit by the churn, and the glow is carried downstream on the
// current, out of the canyon and across the slow reach into the fen, fading as it goes. During a gutter it is the
// brightest line on the bowl's floor, a thread from the fall to the fen."
//
// No geometry, no draw call, no light, no program of its own: two chunks in shaders that already exist. water/river.js
// calls injectReachRiver on the ribbon's material and water.js calls injectReachFen on each disc's material (the tarn's
// and the fen's share one program; the fen's chunk runs only where uFen, so the tarn draws as before).
//
// The sources: wherever the ribbon is faster than about 1.6 m/s (weighted by how much faster) or rough (the rapids,
// the same roughness river.js gives the ribbon), and the Speculum's churn where the pool spills into the ribbon. The carry:
// a glow profile over the river's arc length s, built once here into a 256x1 DataTexture. Each metre of source
// excites the water toward saturation; the light then decays with travel time (ds / speed) over TAU seconds, so it is
// carried down the canyon and fades slowly across the slow reach to the mouth. Drawn as soft streaks stretched along
// the flow and advected at the current's speed, so the glow is seen to travel. In the white water a fine sparkle of
// points twinkles at 6-10 Hz. From the mouth a plume widens into the fen along the current's line and fades out by
// about 55 m. Gain: 1 + 2.5 x (1 - flicker), so it is faint in daylight (below the bloom threshold) and the brightest
// line on the floor while the sun gutters. The glow is added after the host's fog, the haze dimming it (as the lamps'
// sprites) rather than painting haze colour over it.
//
// ?reach=0 compiles both chunks out (the shaders are exactly as before); ?reach=mask paints the glow red, to check
// where it lies (also __fp.reach.mask(true)). ctx.reach = { uniforms, profile, plumeAt(u), gainAt(flicker), mouth, ... }.
import * as THREE from 'three';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const MODE = Q.get('reach');
export const REACH_OFF = MODE === '0';

export const REACH = {
  color: '#5cd8e4',  // its own blue-green: hue ~186, between the wisps (#9fe8c2, ~150) and the crystal (#7ad7ff, ~200), off the moss (#46e8c8, ~168)
  tau: 70,           // seconds of travel for the light to fall to 1/e
  n: 256,            // texels in the profile
  sMax: 104,         // metres of s the profile spans (the ribbon runs 3 .. fenEnter + 6)
  vFast: [1.6, 3.4], // m/s: the source weight ramps over this
  excite: 0.25,      // per metre of full source, toward saturation
  gain: 2.5,         // the gutter's gain: 1 + gain x (1 - flicker)
  carry: 0.04,       // the carried thread's strength (linear, before the gain)
  sparkle: 0.32,     // the white water's points
  plume: { len: 60, decay: 35, w0: 4.5, spread: 0.32 }, // the fen's plume: ends by len, e-folds over decay, half-width w0 + u x spread
};

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The glow profile along s: src (source weight per metre), G (0..1, the light in the water), T (travel seconds from s = 0).
export function reachProfile(RV) {
  const { n, sMax, tau, excite, vFast } = REACH;
  const W = RV.levelAt, ds = sMax / (n - 1);
  const rough = (s) => Math.max(0, Math.min(1, ((W(s - 1.2) - W(s + 1.2)) / 2.4 - 0.05) * 7)); // as water/river.js's roughRiver
  const src = new Float32Array(n), G = new Float32Array(n), T = new Float32Array(n);
  let g = 0, t = 0;
  for (let i = 0; i < n; i++) {
    const s = i * ds, v = Math.max(0.2, RV.speedAt(s));
    // the Speculum's churn spills into the ribbon's head (s 3-7); then the fast and the rough water
    const churn = s > 2.5 && s < 7.5 ? 1 - smooth(5, 7.5, s) : 0;
    const w = Math.max(churn, smooth(vFast[0], vFast[1], v) * (v > vFast[0] ? 1 : 0), rough(s));
    src[i] = w;
    if (i) { t += ds / v; g *= Math.exp(-ds / (v * tau)); }
    g += (1 - g) * (1 - Math.exp(-excite * w * ds));
    G[i] = g; T[i] = t;
  }
  let first = -1, last = -1;
  for (let i = 0; i < n; i++) if (src[i] > 0) { if (first < 0) first = i; last = i; }
  return { src, G, T, ds, first, last, sFirst: first * ds, sLast: last * ds, at: (s) => { const f = Math.max(0, Math.min(n - 1, s / ds)), i = Math.min(n - 2, f | 0), k = f - i; return G[i] + (G[i + 1] - G[i]) * k; } };
}

// The plume's strength at u metres from the mouth along the current (the GLSL below, on the centre line).
export function plumeAt(u) {
  const P = REACH.plume;
  return u < -2 ? 0 : smooth(-2, 2, u) * Math.exp(-Math.max(u, 0) / P.decay) * (1 - smooth(P.len * 0.6, P.len, u));
}
export const gainAt = (flicker) => 1 + REACH.gain * (1 - Math.max(0, Math.min(1, flicker)));

// ---------------------------------------------------------------- shared state (built on first inject)
let state = null;
function ensure(ctx) {
  if (state) return state;
  const RV = ctx.terrain.river, fen = ctx.water.fen, prof = reachProfile(RV);
  const data = new Uint8Array(REACH.n * 4);
  for (let i = 0; i < REACH.n; i++) { const v = Math.round(prof.G[i] * 255); data[i * 4] = v; data[i * 4 + 1] = Math.round(prof.src[i] * 255); data[i * 4 + 3] = 255; }
  const tex = new THREE.DataTexture(data, REACH.n, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true; tex.name = 'reach-profile';
  // the mouth: where the ribbon gives itself to the fen (its fade's middle, r + 1 from the fen's centre)
  const L = RV.line;
  let mi = L.n - 1;
  for (let i = 0; i < L.n; i++) if (Math.hypot(L.X[i] - fen.x, L.Z[i] - fen.z) < fen.r + 1) { mi = i; break; }
  const a = Math.max(0, mi - 2), b = Math.min(L.n - 1, mi + 2), tl = Math.hypot(L.X[b] - L.X[a], L.Z[b] - L.Z[a]) || 1;
  const mouth = { x: L.X[mi], z: L.Z[mi], s: L.S[mi], tx: (L.X[b] - L.X[a]) / tl, tz: (L.Z[b] - L.Z[a]) / tl, g: prof.at(L.S[mi]), hw: RV.halfWidthAt(L.S[mi]) };
  const P = REACH.plume;
  const uniforms = {
    uReachProf: { value: tex },
    uReachCol: { value: new THREE.Color(REACH.color) },
    uReachK: { value: new THREE.Vector4(1 / REACH.sMax, REACH.carry, REACH.sparkle, MODE === 'mask' ? 1 : 0) }, // 1/sMax, carry, sparkle, mask
    uReachMouth: { value: new THREE.Vector4(mouth.x, mouth.z, mouth.tx, mouth.tz) },
    uReachPlume: { value: new THREE.Vector4(Math.max(P.w0, mouth.hw * 0.6), P.spread, mouth.g, P.decay) }, // half-width at the mouth, spread, glow at the mouth, decay
    uReachGain: { value: REACH.gain },
  };
  state = { prof, tex, mouth, uniforms, mats: [] };
  ctx.reach = {
    uniforms, profile: prof, mouth, plumeAt, gainAt, REACH, materials: state.mats,
    mask(on) { uniforms.uReachK.value.w = on ? 1 : 0; },
    // strength(k): scale the carry and the sparkle (0 leaves the water's colours exactly as with ?reach=0)
    strength(k = 1) { uniforms.uReachK.value.y = REACH.carry * k; uniforms.uReachK.value.z = REACH.sparkle * k; },
  };
  return state;
}

// ---------------------------------------------------------------- GLSL
const DECL = /* glsl */`
  uniform sampler2D uReachProf; uniform vec3 uReachCol; uniform vec4 uReachK; uniform vec4 uReachMouth; uniform vec4 uReachPlume; uniform float uReachGain;
  float reachHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
`;

// in the ribbon, before the fen's fade: s, d, hw, sp, rough, ravine, foam, edge, t, dist, far, col, alpha are the host's
const RIVER_CHUNK = /* glsl */`
    float fpReach = 0.0;
    if (ravine < 0.5) {
      float rGain = 1.0 + uReachGain * (1.0 - clamp(uFlicker, 0.0, 1.0));
      vec4 rProf = texture2D(uReachProf, vec2(clamp(s * uReachK.x, 0.0, 1.0), 0.5));
      // the carry: soft streaks stretched along the flow and carried down it at the current's speed, on the host's
      // two flow phases (fT0, fT1, fW0, fNorm: water/river.js), so the speed's changes never shear them into noise
      float rS = mix(mask(vec2(d * 0.19 + 0.58, (s - sp * fT1) * 0.045 + 0.37)) * 0.6 + mask(vec2(d * 0.52 + 0.29, (s - sp * 1.1 * fT1) * 0.11 + 0.83)) * 0.4,
                     mask(vec2(d * 0.19 + 0.13, (s - sp * fT0) * 0.045)) * 0.6 + mask(vec2(d * 0.52 + 0.71, (s - sp * 1.1 * fT0) * 0.11)) * 0.4, fW0);
      float rStreak = smoothstep(0.3, 0.85, 0.5 + (rS - 0.5) * fNorm);
      float rMid = 1.0 - smoothstep(0.45, 1.05, abs(d) / max(hw, 0.5));
      float rCarry = rProf.r * (0.3 + 0.7 * rStreak) * rMid * uReachK.y;
      // the flash: fine points in the white water, each twinkling at 6-10 Hz, carried at the local speed
      float rWhite = max(foam, smoothstep(0.02, 0.45, rough) * 0.7) * rProf.g;
      // (each point rides one of the two phases and fades with it; a point under about two pixels is not drawn, as
      // a smaller one only flickers on and off between pixels as the view moves)
      float rCellPx = length(fwidth(vec2(d, s))) * 7.0;                       // cells per pixel
      float rSpark = 0.0;
      if (rCellPx < 0.5) {
        for (int k = 0; k < 2; k++) {
          vec2 rq = vec2(d, s - sp * (k == 0 ? fT0 : fT1)) * 7.0 + float(k) * vec2(0.5, 31.7);
          vec2 rc = floor(rq), rf = fract(rq) - 0.5;
          float rh = reachHash(rc), rh2 = reachHash(rc + 17.31);
          vec2 rOff = vec2(rh2, fract(rh * 7.13)) - 0.5;
          float rPt = 1.0 - smoothstep(0.06, 0.2, length(rf - rOff * 0.6));
          float rTw = pow(max(0.0, sin(t * (37.7 + 25.1 * rh2) + rh * 6.2832)), 6.0);
          rSpark += step(0.55, rh) * rPt * rTw * (k == 0 ? fW0 : 1.0 - fW0);
        }
        rSpark *= rWhite * uReachK.z * (1.0 - smoothstep(30.0, 120.0, dist)) * (1.0 - smoothstep(0.25, 0.5, rCellPx));
      }
      float rGlow = (rCarry + rSpark) * rGain * edge;
      fpReach = rGlow;
      alpha = max(alpha, clamp(rGlow * 1.6, 0.0, 1.0) * edge);
      if (uReachK.w > 0.5) { float rm = clamp(rGlow * 25.0, 0.0, 1.0); col = mix(col, vec3(1.0, 0.0, 0.0), rm); alpha = max(alpha, rm); }
    }
`;

// in the fen's (and the tarn's) disc, before gl_FragColor: p, uFen, uTime, uFlicker, weed, pads, shore, col, alpha are the host's
const FEN_CHUNK = /* glsl */`
    float fpReach = 0.0;
    if (uFen > 0.5) {
      vec2 rq = p - uReachMouth.xy;
      float ru = dot(rq, uReachMouth.zw), rv = dot(rq, vec2(-uReachMouth.w, uReachMouth.z));
      if (ru > -2.0 && ru < 64.0) {
        float rGain = 1.0 + uReachGain * (1.0 - clamp(uFlicker, 0.0, 1.0));
        float rw = uReachPlume.x + max(ru, 0.0) * uReachPlume.y;
        float rAcross = exp(-pow(rv / rw, 2.0));
        float rAlong = smoothstep(-2.0, 2.0, ru) * exp(-max(ru, 0.0) / uReachPlume.w) * (1.0 - smoothstep(36.0, 60.0, ru));
        // the current slows as it spreads: the streaks drift out at a falling speed
        float rPh = ru - uTime * mix(1.6, 0.3, smoothstep(0.0, 40.0, ru));
        float rS = texture2D(uTex, vec2(rv * 0.06 + 0.37, rPh * 0.035)).a * 0.6 + texture2D(uTex, vec2(rv * 0.15 + 0.11, rPh * 0.09)).a * 0.4;
        float rStreak = smoothstep(0.3, 0.85, rS);
        float rGlow = uReachPlume.z * rAlong * rAcross * (0.3 + 0.7 * rStreak) * uReachK.y * rGain * (1.0 - weed) * (1.0 - pads * 0.9) * shore;
        fpReach = rGlow;
        alpha = max(alpha, clamp(rGlow * 1.6, 0.0, 1.0) * shore);
        if (uReachK.w > 0.5) { float rm = clamp(rGlow * 25.0, 0.0, 1.0); col = mix(col, vec3(1.0, 0.0, 0.0), rm); alpha = max(alpha, rm); }
      }
    }
`;

// at the end of either host's main, after its fog: the glow is light from the water, so the haze dims it (as the
// lamps' and the wisps' sprites: particles/shaderParts.js) rather than painting over it with haze colour
const AFTER_FOG = /* glsl */`
    {
      float rT = 1.0;
      #if defined(USE_FOG) && defined(FOG_EXP2)
        vec3 rR = vFogWorldPos - cameraPosition; float rL = length(rR);
        rT = (1.0 - (1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth))) * (1.0 - fpHeightFog(cameraPosition, rR / max(rL, 1e-4), rL) * 0.7);
      #endif
      if (uReachK.w < 0.5) gl_FragColor.rgb += uReachCol * fpReach * (0.35 + 0.65 * rT);
    }
`;

function inject(mat, ctx, at, chunk) {
  if (REACH_OFF) { ctx.reach = ctx.reach || { off: true }; return false; }
  const st = ensure(ctx);
  const fs = mat.fragmentShader;
  if (!fs.includes(at) || !fs.includes('void main() {')) { console.warn('reach: the host shader has changed; the Luminous Reach is left out of', mat.name || 'a material'); return false; }
  let out = fs.replace('void main() {', `${DECL}\n  void main() {`).replace(at, `${chunk}\n${at}`);
  const end = out.lastIndexOf('}');
  out = out.slice(0, end) + AFTER_FOG + out.slice(end);
  mat.fragmentShader = out;
  Object.assign(mat.uniforms, st.uniforms); // the same uniform objects in every material, so ctx.reach drives them all
  st.mats.push(mat);
  return true;
}

// water/river.js: the ribbon (its uFlicker is set each frame by the host)
export function injectReachRiver(mat, ctx) { return inject(mat, ctx, '    alpha *= fenFade;', RIVER_CHUNK); }
// water.js: the tarn's and the fen's disc (one program; the chunk runs where uFen)
export function injectReachFen(mat, ctx) { return inject(mat, ctx, '    gl_FragColor = vec4(col, alpha);', FEN_CHUNK); }
