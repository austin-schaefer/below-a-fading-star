// CM The Indistinct [Proposed] (wilderness-v5.md, "### CM. The Indistinct"): "Something small and dark that keeps exactly
// seven metres from you along the ha-ha's ditch, always a little out of focus whatever you do: a soft blur where the eye
// wants an animal. Walk toward it and it keeps the distance; stop and it stops." Austin: "ensure it's not too subtle to be seen."
// The line: the ditch floor at r 78.2 from the keep, bearings 0-90 (the ha-ha's NE arc), on the drawn floor's height.
// The rule: within 30 m of the line it stands on it exactly 7.0 m (straight line, from the walker's feet) from the walker,
// on its own side; when the walker is more than 7 m from the line, at the line's point nearest the walker; beyond 30 m it
// waits at bearing 45. It holds while the walker's speed is under 0.1 m/s. It moves under a speed cap of 8 m/s and an
// acceleration cap of 12 m/s², and the distance is a constraint over that: never nearer than 6.75 m nor further than 7.25 m
// while the walker is within 7 m of the line. Pushed past an end of the arc, it thins (the blur widens and it fades over
// 0.6 s) and forms again 7 m on the walker's far side.
// The look: one camera-facing quad whose fragment shader draws a soft dark mass 0.55 x 0.35 m, no limbs, no face, its edge
// blurred by a radius held at 8 px of a 720-px-tall view at any distance (so it never sharpens), a slow noise moving it as
// if breathing; near-black brown with the faintest rim of the sky's colour; fogged; far under bloom's threshold. A second
// flat quad is its contact shadow. Neither casts a shadow; it makes no sound.
import * as THREE from 'three';
import { LANDMARKS } from '../../world.js';
import { clamp } from '../../noise.js';

const K = LANDMARKS.castle;             // (40, 30): the keep
const R = 78.2, B0 = 0, B1 = 90, WAIT_B = 45;
const KEEP = 7.0, NEAR_LINE = 30, BAND = 0.25, HOLD_V = 0.1, VMAX = 8, AMAX = 12, THIN = 0.6;
const LEN = (R * (B1 - B0) * Math.PI) / 180; // 122.8 m of arc
const STEP = 0.25, NS = Math.ceil(LEN / STEP) + 1;
const MASS = { w: 0.55, h: 0.35 }, BLUR_PX = 8;

export function buildIndistinct(ctx) {
  const { scene, terrain, player, camera } = ctx;
  // ---- the line, sampled every 0.25 m of arc: x, y (the skin's drawn floor: heightAt + its 2 cm lift), z
  const LX = new Float32Array(NS), LY = new Float32Array(NS), LZ = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    const a = Math.min(LEN, i * STEP) / R;
    LX[i] = K.x + Math.sin(a) * R; LZ[i] = K.z - Math.cos(a) * R; LY[i] = terrain.heightAt(LX[i], LZ[i]) + 0.02;
  }
  const out = { x: 0, y: 0, z: 0 };
  function lineAt(s, o = out) {
    const u = clamp(s, 0, LEN) / STEP, i = Math.min(NS - 2, u | 0), f = u - i;
    o.x = LX[i] + (LX[i + 1] - LX[i]) * f; o.y = LY[i] + (LY[i + 1] - LY[i]) * f; o.z = LZ[i] + (LZ[i + 1] - LZ[i]) * f;
    return o;
  }
  let fx = 0, fy = 0, fz = 0; // the walker's feet
  const dAt = (s) => { const p = lineAt(s); const dx = p.x - fx, dy = p.y - fy, dz = p.z - fz; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  // the arc parameter nearest the walker (by bearing from the keep), clamped to the arc
  function nearestS(x, z) {
    let b = (Math.atan2(x - K.x, -(z - K.z)) * 180) / Math.PI; // -180..180, 0 north, 90 east
    if (b < -90) b += 360;
    return clamp(((b - B0) * Math.PI * R) / 180, 0, LEN);
  }
  // the point at distance KEEP from the feet between s0 (inside) and s1 (outside): bisection
  function root(s0, s1) {
    let a = s0, b = s1;
    for (let k = 0; k < 22; k++) { const m = (a + b) * 0.5; if (dAt(m) < KEEP) a = m; else b = m; }
    return (a + b) * 0.5;
  }

  // ---- the look
  const U = {
    uC: { value: new THREE.Vector3() }, uTime: { value: 0 }, uThin: { value: 0 }, uFlicker: { value: 1 },
    uBlurPx: { value: BLUR_PX }, uUnveil: { value: 0.3 }, uRim: { value: 2.4 }, uMass: { value: new THREE.Vector2(MASS.w, MASS.h) },
  };
  const geo = new THREE.PlaneGeometry(1, 1);
  // the shader places both quads; the bounds follow it (place() moves the centre) so they are culled out of view
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.5);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]),
    vertexShader: /* glsl */`
      uniform vec3 uC; uniform float uBlurPx, uThin; uniform vec2 uMass;
      varying vec2 vP; varying float vBlur;
      #include <fog_pars_vertex>
      void main() {
        // the blur's radius in metres at this depth: uBlurPx of a 720-px-tall view, whatever the window or pixel ratio
        vec4 mvC = viewMatrix * vec4(uC, 1.0);
        float depth = max(0.5, -mvC.z);
        float blur = depth * (2.0 / projectionMatrix[1][1]) * uBlurPx / 720.0 * (1.0 + 2.5 * uThin);
        vec2 half_ = uMass * 0.5 + 2.6 * blur;
        vP = position.xy * 2.0 * half_; vBlur = blur;
        vec4 mvPosition = mvC + vec4(vP, 0.0, 0.0);
        // drawn a little toward the eye (and shrunk to keep its size) so the floor under it never cuts the blur's edge
        float pull = min(0.6, depth * 0.3);
        mvPosition.xyz *= (depth - pull) / depth;
        vec3 transformed = (inverse(viewMatrix) * mvPosition).xyz;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uThin, uFlicker, uUnveil, uRim; uniform vec2 uMass;
      varying vec2 vP; varying float vBlur;
      #include <fog_pars_fragment>
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        // a low soft mass, flatter below than above, a little fuller at one end; it breathes
        vec2 p = vP;
        float br = 1.0 + 0.035 * sin(uTime * 1.7) + 0.015 * sin(uTime * 0.63 + 1.3);
        vec2 hm = uMass * 0.5 * vec2(1.0, br);
        p.y -= -hm.y * 0.15;
        vec2 q = p / hm;
        q.y *= q.y < 0.0 ? 1.35 : 1.0;
        q.x *= 1.0 - 0.12 * q.x;
        float n = vn(vec2(atan(q.y, q.x) * 1.6, uTime * 0.35)) - 0.5;
        float d = (length(q) - 1.0 - 0.12 * n) * min(hm.x, hm.y);  // metres, roughly
        // its edge: a Gaussian of the blur's radius, never sharper
        float a = 1.0 - smoothstep(-1.15 * vBlur, 1.15 * vBlur, d);
        a *= 1.0 - uThin;
        if (a < 0.01) discard;
        // near-black brown, and on its upper edge the faintest rim of the sky
        float rim = smoothstep(-1.4 * vBlur, 0.0, d) * (1.0 - smoothstep(0.0, 1.4 * vBlur, d)) * (0.2 + 0.8 * smoothstep(-0.3, 0.7, q.y));
        vec3 col = vec3(0.016, 0.011, 0.008) + fogColor * uRim * rim * (0.6 + 0.4 * uFlicker);
        gl_FragColor = vec4(col, a * 0.97);
        #include <fog_fragment>
        // the ditch holds the ground mist, which flattens a dark thing to the turf's own tone at a few metres: the distance
        // fog stands (it fades with the world), but the mist only half veils it, so it is found by eye ("not too subtle")
        #ifdef USE_FOG
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(col, haze, fogFactor), uUnveil);
        #endif
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  Object.assign(mat.uniforms, U); // merge() clones: share the live ones
  mat.customProgramCacheKey = () => 'small-indistinct';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'small-indistinct'; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 6;
  scene.add(mesh);
  // the contact shadow: a dark blurred oval flat on the floor under it
  const SU = { uC: U.uC, uThin: U.uThin, uDir: { value: new THREE.Vector2(1, 0) } };
  const sMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, SU]),
    vertexShader: /* glsl */`
      uniform vec3 uC; uniform vec2 uDir; varying vec2 vP;
      #include <fog_pars_vertex>
      void main() {
        vP = position.xy;
        vec2 a = uDir * position.x * 0.85, b = vec2(-uDir.y, uDir.x) * position.y * 0.6;
        vec3 transformed = uC + vec3(a.x + b.x, 0.03, a.y + b.y);
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uThin; varying vec2 vP;
      #include <fog_pars_fragment>
      void main() {
        float r = length(vP * 2.0);
        float a = exp(-r * r * 3.2) * 0.55 * (1.0 - uThin);
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.0), a);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  Object.assign(sMat.uniforms, SU);
  sMat.customProgramCacheKey = () => 'small-indistinct-shadow';
  const shadow = new THREE.Mesh(geo, sMat);
  shadow.name = 'small-indistinct-shadow'; shadow.castShadow = false; shadow.renderOrder = 5;
  scene.add(shadow);

  // ---- the state
  const sWait = ((WAIT_B - B0) * Math.PI * R) / 180;
  const st = { s: sWait, v: 0, target: sWait, mode: 'wait', thin: 0, phase: 'shown', pending: 0, side: 1, walkerV: 0, dist: 0, lineD: 0, held: false, moved: 0 };
  let px = player.pos.x, pz = player.pos.z, prevTarget = sWait, first = true;
  const fwd = new THREE.Vector3();
  // which of two points is better in view: larger dot with the camera's forward
  const viewDot = (s) => { const p = lineAt(s), dx = p.x - camera.position.x, dz = p.z - camera.position.z, l = Math.hypot(dx, dz) || 1; return (dx * fwd.x + dz * fwd.z) / l; };

  function place() {
    const p = lineAt(st.s);
    U.uC.value.set(p.x, p.y + MASS.h * 0.5, p.z);
    geo.boundingSphere.center.copy(U.uC.value);
    // the shadow lies along the ditch
    const a = st.s / R; U.uThin.value = st.thin;
    SU.uDir.value.set(Math.cos(a), Math.sin(a));
  }
  function update(dt, t) {
    U.uTime.value = t; U.uFlicker.value = ctx.sky?.flicker?.value ?? 1;
    if (dt <= 0) return;
    const P = player.pos;
    fx = P.x; fz = P.z; fy = P.y - (player.eye ?? 1.72);
    const jump = Math.hypot(P.x - px, P.z - pz);
    const wv = jump / dt; st.walkerV = wv;
    px = P.x; pz = P.z;
    camera.getWorldDirection(fwd);
    // ---- where it should be
    const s0 = nearestS(fx, fz), d0 = dAt(s0);
    st.lineD = d0;
    let target = st.s, mode;
    if (d0 > NEAR_LINE) { mode = 'wait'; target = sWait; }
    else if (d0 > KEEP) { mode = 'near'; target = s0; }
    else {
      mode = 'keep';
      const hasHi = dAt(LEN) >= KEEP, hasLo = dAt(0) >= KEEP;
      const hi = hasHi ? root(s0, LEN) : -1, lo = hasLo ? root(s0, 0) : -1;
      let side = st.s > s0 + 0.5 ? 1 : st.s < s0 - 0.5 ? -1 : 0;
      if (side === 0) side = hasHi && hasLo ? (viewDot(hi) >= viewDot(lo) ? 1 : -1) : hasHi ? 1 : -1;
      if (side > 0 && !hasHi) side = -1; else if (side < 0 && !hasLo) side = 1; // pushed past the end: the far side
      target = side > 0 ? hi : lo;
    }
    st.mode = mode; st.target = target;
    // ---- thinning and forming
    if (st.phase === 'thin') {
      st.thin = Math.min(1, st.thin + dt / THIN);
      if (st.thin >= 1) { st.s = target; st.v = 0; st.phase = 'form'; }
      prevTarget = target; place(); return;
    }
    if (st.phase === 'form') { st.thin = Math.max(0, st.thin - dt / THIN); st.s = target; if (st.thin <= 0) st.phase = 'shown'; prevTarget = target; place(); return; }
    // a jump of the walker (a teleport), a jump of the target (an end swapped, the walker coming within 30 m far along
    // the arc): it thins and forms there
    if (first || jump > 4) { first = false; st.s = target; st.v = 0; prevTarget = target; place(); return; }
    if (Math.abs(target - st.s) > 6) { st.phase = 'thin'; st.pending = target; prevTarget = target; place(); return; }
    // ---- stop and it stops (unless the walker is drifting nearer than the band allows)
    const dNow = dAt(st.s);
    st.dist = dNow;
    st.held = wv < HOLD_V && (mode !== 'keep' || dNow >= KEEP - BAND);
    if (st.held) { st.v = 0; prevTarget = target; place(); return; }
    // ---- follow: the target's own speed plus a pull, under the caps
    const vT = clamp((target - prevTarget) / dt, -VMAX, VMAX);
    const vDes = clamp(vT + (target - st.s) * 8, -VMAX, VMAX);
    st.v += clamp(vDes - st.v, -AMAX * dt, AMAX * dt);
    const s1 = clamp(st.s + st.v * dt, 0, LEN);
    st.moved += Math.abs(s1 - st.s);
    st.s = s1;
    // ---- the distance is a constraint: within the band round 7 m while the walker is within 7 m of the line
    if (mode === 'keep') {
      const d = dAt(st.s);
      if (d < KEEP - BAND || d > KEEP + BAND) {
        // back to the band's edge, on the way to the target (the distance runs monotonically between them)
        const edge = d < KEEP ? KEEP - BAND : KEEP + BAND, nearer = d < KEEP;
        let a = st.s, b = target;
        for (let k = 0; k < 18; k++) { const m = (a + b) * 0.5, dm = dAt(m); if (nearer ? dm < edge : dm > edge) a = m; else b = m; }
        st.moved += Math.abs(b - st.s);
        st.s = b; st.v = vT;
      }
    }
    prevTarget = target;
    place();
  }

  return {
    mesh, shadow, update, lineAt, LEN, R,
    state: () => { const p = lineAt(st.s, {}); return { ...st, x: p.x, y: p.y, z: p.z, dist: dAt(st.s), bearing: (st.s / R) * 180 / Math.PI }; },
    tris: () => 4,
  };
}
