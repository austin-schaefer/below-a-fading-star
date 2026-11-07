// Meteors: streaks at sky distance, mostly white but many in sullen colours, now and then a
// shower from one radiant, and rarely a slow blue-white fireball that lights the ground and
// rumbles a few seconds later. Some leave a smoke train that drifts, kinks and dissolves.
// Two draw calls: all streaks in one instanced quad mesh, all trains in another. The motion and
// fades live in the shaders; the CPU only writes an instance's attributes when it spawns.
import * as THREE from 'three';
import { SKY_GLSL, withSky } from './common.js';

const R = 1800; // metres from the eye; the group follows the camera

// [hex, weight]: plain white, dull copper, bruise violet, sickly green, sullen red, blue-white
export const METEOR_COLOURS = [
  ['#f2e6d4', 38], ['#d08048', 18], ['#9a62d0', 15], ['#a4d060', 14], ['#c04428', 10], ['#d8ecff', 5],
];
const FIREBALL = 5;

const STREAK_VS = /* glsl */`
  attribute vec3 iS, iE;      // path start and end directions
  attribute vec4 iTime;       // t0, duration, trail length (fraction of path), half-width (m)
  attribute vec4 iCol;        // rgb, brightness
  attribute vec4 iShape;      // flare, whiteness, seed, -
  varying vec2 vQ; varying float vP; varying vec4 vCol; varying vec3 vShape, vW;
  uniform float uT;
  void main() {
    float p = (uT - iTime.x) / iTime.y;
    if (p < 0.0 || p > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float hf = p, tf = max(0.0, p - iTime.z);
    float f = mix(tf, hf, position.y);
    vec3 dir = normalize(mix(iS, iE, f));
    vec3 across = normalize(cross(iE - iS, dir));
    vec3 P = dir * ${R.toFixed(1)} + across * position.x * iTime.w * mix(0.22, 1.0, position.y * position.y);
    vec4 wp = modelMatrix * vec4(P, 1.0);
    vW = wp.xyz; vQ = position.xy; vP = p; vCol = iCol; vShape = iShape.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const STREAK_FS = /* glsl */`
  ${SKY_GLSL}
  varying vec2 vQ; varying float vP; varying vec4 vCol; varying vec3 vShape, vW;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    float ac = 1.0 - vQ.x * vQ.x;
    float core = ac * ac * ac;
    float along = pow(vQ.y, 2.4);
    float head = smoothstep(0.82, 1.0, vQ.y);
    float env = smoothstep(0.0, 0.1, vP) * (1.0 - smoothstep(0.88, 1.0, vP)) * (1.0 + vShape.x * smoothstep(0.45, 0.9, vP));
    float sputter = 0.7 + 0.3 * sin(vQ.y * 37.0 - uT * 41.0 + vShape.z * 17.0);
    vec3 c = vCol.rgb * along * ac * sputter + mix(vCol.rgb, vec3(1.0), vShape.y) * head * core * 1.6;
    c *= env * vCol.a * sl_trans(d, 0.06);
    gl_FragColor = vec4(c, 1.0);
  }`;

const TRAIN_VS = /* glsl */`
  attribute vec3 iS, iE;      // segment of the path the train hangs along
  attribute vec4 iTime;       // t0, life, start half-width, growth (m/s)
  attribute vec3 iDrift;      // drift (m/s)
  attribute vec4 iCol;        // glow rgb, seed
  varying vec2 vQ; varying float vA; varying vec4 vCol; varying vec3 vW;
  uniform float uT;
  void main() {
    float age = uT - iTime.x, a = age / iTime.y;
    if (a < 0.0 || a > 1.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float f = position.y;
    vec3 dir = normalize(mix(iS, iE, f));
    vec3 across = normalize(cross(iE - iS, dir));
    vec3 along = normalize(iE - iS);
    // wind shear: the line drifts, the far end faster, and kinks into slow curls
    float kink = sin(f * 8.0 + iCol.a * 6.0 + age * 0.12) + 0.5 * sin(f * 19.0 - iCol.a * 3.0 + age * 0.21);
    vec3 P = dir * ${R.toFixed(1)} + iDrift * age * (0.5 + f) + across * kink * age * 1.4 + along * sin(f * 5.0 + iCol.a) * age * 0.6;
    float w = iTime.z + iTime.w * age;
    P += across * position.x * w;
    vec4 wp = modelMatrix * vec4(P, 1.0);
    vW = wp.xyz; vQ = position.xy; vA = a; vCol = iCol;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const TRAIN_FS = /* glsl */`
  ${SKY_GLSL}
  varying vec2 vQ; varying float vA; varying vec4 vCol; varying vec3 vW;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    float age = vA;
    float ac = 1.0 - vQ.x * vQ.x;
    float n = sl_vnoise(vec2(vQ.y * 26.0 + vCol.a * 50.0, uT * 0.18 + vCol.a)) * 0.65 + sl_vnoise(vec2(vQ.y * 70.0, vQ.x * 2.0 + uT * 0.3)) * 0.35;
    float keep = smoothstep(age * 1.05 - 0.05, age * 1.05 + 0.25, n);
    float ends = smoothstep(0.0, 0.12, vQ.y) * smoothstep(1.0, 0.75, vQ.y);
    float alpha = ac * keep * ends * (1.0 - age) * smoothstep(0.0, 0.03, age) * 0.55;
    vec3 smoke = mix(vec3(0.035, 0.03, 0.045), uSunLight * 0.06, 0.5 + 0.5 * max(dot(d, uSunDir), 0.0));
    vec3 glow = vCol.rgb * exp(-age * 18.0) * 1.5;
    vec3 c = sl_air(smoke + glow, d, 0.05);
    gl_FragColor = vec4(c, alpha);
  }`;

function quadStrip(segments) {
  const g = new THREE.InstancedBufferGeometry();
  const pos = [], idx = [];
  for (let k = 0; k <= segments; k++) { const y = k / segments; pos.push(-1, y, 0, 1, y, 0); }
  for (let k = 0; k < segments; k++) { const a = k * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
function inst(g, name, size, n) {
  const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size);
  a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute(name, a);
  return a;
}

export function buildMeteors(ctx, group, U, rng) {
  const N = ctx.quality === 'high' ? 16 : 10, NT = ctx.quality === 'high' ? 10 : 6;
  const cols = METEOR_COLOURS.map(([h]) => new THREE.Color(h));
  const wsum = METEOR_COLOURS.reduce((s, [, w]) => s + w, 0);

  // streaks
  const sg = quadStrip(1); sg.instanceCount = N;
  const S = { s: inst(sg, 'iS', 3, N), e: inst(sg, 'iE', 3, N), time: inst(sg, 'iTime', 4, N), col: inst(sg, 'iCol', 4, N), shape: inst(sg, 'iShape', 4, N) };
  for (let i = 0; i < N; i++) S.time.setXYZW(i, -1e6, 1, 0.3, 1);
  const smat = new THREE.ShaderMaterial({
    uniforms: withSky(U, {}), vertexShader: STREAK_VS, fragmentShader: STREAK_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  });
  const streaks = new THREE.Mesh(sg, smat);
  streaks.frustumCulled = false; streaks.name = 'skylife-meteors'; streaks.renderOrder = 5;
  group.add(streaks);

  // trains
  const tg = quadStrip(28); tg.instanceCount = NT;
  const T = { s: inst(tg, 'iS', 3, NT), e: inst(tg, 'iE', 3, NT), time: inst(tg, 'iTime', 4, NT), drift: inst(tg, 'iDrift', 3, NT), col: inst(tg, 'iCol', 4, NT) };
  for (let i = 0; i < NT; i++) T.time.setXYZW(i, -1e6, 1, 1, 0);
  const tmat = new THREE.ShaderMaterial({
    uniforms: withSky(U, {}), vertexShader: TRAIN_VS, fragmentShader: TRAIN_FS,
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
  });
  const trains = new THREE.Mesh(tg, tmat);
  trains.frustumCulled = false; trains.name = 'skylife-trains'; trains.renderOrder = 4;
  group.add(trains);

  // the fireball's flash on the ground
  const flash = new THREE.AmbientLight(new THREE.Color('#a9c2ff'), 0);
  ctx.scene.add(flash);

  // state
  const live = []; for (let i = 0; i < N; i++) live.push({ t0: -1e6, dur: 1, kind: 0, flare: 0, bright: 0, smoke: false, done: true, s: new THREE.Vector3(), e: new THREE.Vector3(), w: 1 });
  let slot = 0, tslot = 0;
  const pending = []; for (let i = 0; i < 8; i++) pending.push({ t: Infinity, kind: -1 });
  const radiant = new THREE.Vector3();
  const rumble = { t: Infinity, pos: new THREE.Vector3() };
  let next = 3 + rng() * 5;
  const up = new THREE.Vector3(0, 1, 0), ve = new THREE.Vector3(), vn = new THREE.Vector3(), tan = new THREE.Vector3(), tmp = new THREE.Vector3();

  function pickKind() {
    let r = rng() * wsum;
    for (let k = 0; k < METEOR_COLOURS.length; k++) { r -= METEOR_COLOURS[k][1]; if (r <= 0) return k; }
    return 0;
  }
  // basis on the sphere at s: ve east-ish, vn toward the zenith
  function basisAt(s) {
    ve.crossVectors(up, s); if (ve.lengthSq() < 1e-6) ve.set(1, 0, 0); ve.normalize();
    vn.crossVectors(s, ve).normalize();
  }
  function randomDir(out, elMin, elMax) {
    const b = rng() * Math.PI * 2, e = (elMin + rng() * (elMax - elMin)) * Math.PI / 180;
    return out.set(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e));
  }

  // opts: { at: progress 0..1 now, dir: Vector3 start, fromRadiant: bool, t: start time }
  function spawn(kind = pickKind(), opts = {}) {
    const fire = kind === FIREBALL;
    const m = live[slot], i = slot; slot = (slot + 1) % N;
    const now = opts.t ?? U.uT.value;
    m.kind = kind; m.done = false;
    m.dur = fire ? 2.4 + rng() * 1.0 : 0.3 + rng() * rng() * 1.3;
    const arc = (fire ? 26 + rng() * 18 : 5 + rng() * 22) * Math.PI / 180;
    if (opts.dir) m.s.copy(opts.dir).normalize();
    else if (opts.fromRadiant) {
      // start a little away from the radiant, travel straight away from it
      basisAt(radiant);
      const a = rng() * Math.PI * 2, off = (6 + rng() * 22) * Math.PI / 180;
      tan.copy(ve).multiplyScalar(Math.cos(a)).addScaledVector(vn, Math.sin(a));
      m.s.copy(radiant).multiplyScalar(Math.cos(off)).addScaledVector(tan, Math.sin(off)).normalize();
    } else randomDir(m.s, fire ? 28 : 14, fire ? 60 : 72);
    basisAt(m.s);
    if (opts.fromRadiant) { tan.subVectors(m.s, radiant); tan.addScaledVector(m.s, -tan.dot(m.s)).normalize(); }
    else {
      // mostly falling, at all slants; one in six climbs or runs level
      const a = rng() < 0.83 ? -Math.PI * (0.08 + rng() * 0.84) : rng() * Math.PI;
      tan.copy(ve).multiplyScalar(Math.cos(a)).addScaledVector(vn, Math.sin(a));
    }
    m.e.copy(m.s).multiplyScalar(Math.cos(arc)).addScaledVector(tan, Math.sin(arc)).normalize();
    if (m.e.y < 0.02) { m.e.y = 0.02; m.e.normalize(); }
    const len = fire ? 0.45 + rng() * 0.2 : 0.2 + rng() * 0.45;
    m.w = fire ? 15 + rng() * 5 : 3.5 + rng() * rng() * 7;
    m.bright = fire ? 5.5 : (0.7 + rng() * rng() * 2.6) * (kind === 4 ? 0.8 : 1);
    m.flare = fire ? 2.4 : rng() * rng() * 1.8;
    m.smoke = fire || (m.bright > 1.5 && rng() < 0.4);
    m.t0 = now - (opts.at ?? 0) * m.dur;
    const c = cols[kind];
    S.s.setXYZ(i, m.s.x, m.s.y, m.s.z); S.e.setXYZ(i, m.e.x, m.e.y, m.e.z);
    S.time.setXYZW(i, m.t0, m.dur, len, m.w);
    S.col.setXYZW(i, c.r, c.g, c.b, m.bright);
    S.shape.setXYZW(i, m.flare, fire ? 0.75 : 0.2 + rng() * 0.4, rng(), 0);
    for (const a of Object.values(S)) a.needsUpdate = true;
    if (fire) { rumble.t = m.t0 + m.dur + 3.5 + rng() * 3; rumble.pos.copy(m.e).multiplyScalar(300).add(ctx.camera.position); }
    return m;
  }

  function startTrain(m) {
    const i = tslot; tslot = (tslot + 1) % NT;
    const c = cols[m.kind];
    // the train hangs along the part of the path the meteor burned brightest
    tmp.copy(m.s).lerp(m.e, 0.3).normalize();
    T.s.setXYZ(i, tmp.x, tmp.y, tmp.z); T.e.setXYZ(i, m.e.x, m.e.y, m.e.z);
    const fire = m.kind === FIREBALL;
    T.time.setXYZW(i, m.t0 + m.dur * 0.9, fire ? 22 : 9 + rng() * 9, m.w * (fire ? 0.5 : 0.7), (fire ? 1.6 : 0.6) + rng() * 0.8);
    basisAt(m.e);
    const a = rng() * Math.PI * 2, sp = 1.2 + rng() * 3;
    tmp.copy(ve).multiplyScalar(Math.cos(a) * sp).addScaledVector(vn, Math.sin(a) * sp * 0.5);
    T.drift.setXYZ(i, tmp.x, tmp.y, tmp.z);
    T.col.setXYZW(i, c.r, c.g, c.b, rng());
    for (const a2 of Object.values(T)) a2.needsUpdate = true;
  }

  function shower(t = U.uT.value) {
    randomDir(radiant, 35, 75);
    const n = 5 + ((rng() * 4) | 0), kind = pickKind() === FIREBALL ? 0 : pickKind();
    for (let k = 0; k < n && k < pending.length; k++) {
      pending[k].t = t + (k === 0 ? 0 : rng() * 3.5);
      pending[k].kind = rng() < 0.6 ? (kind === FIREBALL ? 0 : kind) : 0;
    }
  }

  function update(dt) {
    const t = U.uT.value;
    next -= dt;
    if (next <= 0) {
      if (rng() < 0.09) { shower(t); next = 14 + rng() * 10; }
      else { spawn(); next = 4 + rng() * 8; }
    }
    for (let k = 0; k < pending.length; k++) {
      const p = pending[k];
      if (p.t <= t) { spawn(p.kind, { fromRadiant: true }); p.t = Infinity; }
    }
    let fl = 0;
    for (let i = 0; i < N; i++) {
      const m = live[i];
      if (m.done) continue;
      const p = (t - m.t0) / m.dur;
      if (m.kind === FIREBALL && p >= 0 && p <= 1.15) {
        const env = Math.min(1, p / 0.15) * (1 - THREE.MathUtils.smoothstep(p, 0.92, 1.15)) * (1 + 1.8 * THREE.MathUtils.smoothstep(p, 0.6, 0.92));
        fl = Math.max(fl, env * (0.75 + 0.25 * Math.sin(t * 47)));
      }
      if (p >= 1) { m.done = true; if (m.smoke) startTrain(m); }
    }
    flash.intensity = fl * 0.55;
    if (t >= rumble.t) { rumble.t = Infinity; ctx.audio?.cue?.('rumble', rumble.pos); }
  }

  return { update, spawn, shower: (t) => { shower(t); }, streaks, trains, flash, count: N };
}
