// CP The Scriveners [Proposed] (plans/wilderness-v5.md, "### CP. The Scriveners"): "A shoal of small dark fish in the tarn's north
// shallows that arranges itself, for a breath at a time, into one of the Hypogeum's glyphs, holds it, and breaks up. The
// glyph is the one the bronze door showed last."
// 70 fish (45 at low), 14 cm, one instanced mesh with the tail beat in its vertex shader (fauna/geo.js flapMaterial's
// pattern: one shared clock, a per-fish phase). They wander as a loose shoal in the 0.2-0.8 m water of the shallows within
// r 8 of SITES.scriveners, then over 3 s each eases to its place on the door's last glyph (strokes sampled evenly, dots as
// knots of three, x16 so the glyph is about 3.5 m across), laid flat at the surface and turned to read upright from P2's
// end at (-101, 50); they hold 4 s, tails barely moving, and break outward 1.5 m over 2.5 s. The tarn is near-black, so
// while formed each back breaks the water: a second instanced mesh on the surface draws a small dark notch in the
// reflected sky where a back lies, with a thin wet rim catching the sun; while they wander it draws a ring now and then.
import * as THREE from 'three';
import { SITES, WATER, PALETTE } from '../../world.js';
import { hyp } from '../../noise.js';
import { tideAt } from '../../v4/tarn.js';
import { strokeTargets, strokeDistance, lintelForms, doorsLast, FORMS } from './forms.js';

const SITE = SITES.scriveners;          // (-100, 58) r 8
const VIEW = { x: -101, z: 50 };        // P2's end, the nearest point of the path
const SCALE = 16, LEN = 0.14;
const T = { wander: [20, 40], form: 3, hold: 4, break: 2.5 };
const NEAR = 40, RINGS = 8;
const GRID = 0.25, GH = 9;              // the depth grid: 0.25 m cells over the site's square, +-9 m

function fishGeometry(low) {
  // a slim lens along +z (nose), an elliptic section, and a small vertical tail fin; aTail weights the beat toward the tail
  const sides = low ? 4 : 6, zs = [0.07, 0.055, 0.025, -0.01, -0.04, -0.052], rs = [0.001, 0.0075, 0.011, 0.0095, 0.004, 0.0015];
  const P = [], C = [], W = [], I = [];
  const back = [0.07, 0.075, 0.055], belly = [0.2, 0.2, 0.16];
  for (let i = 0; i < zs.length; i++) for (let s = 0; s < sides; s++) {
    const a = (s / sides) * Math.PI * 2 + (low ? Math.PI / 4 : 0), x = Math.cos(a) * rs[i], y = Math.sin(a) * rs[i] * 1.25;
    P.push(x, y, zs[i]);
    const k = 0.5 + 0.5 * Math.sin(a);  // 1 on the back
    C.push(...belly.map((b, j) => b + (back[j] - b) * k));
    W.push(Math.max(0, (0.03 - zs[i]) / 0.1) ** 1.5);
  }
  for (let i = 0; i < zs.length - 1; i++) for (let s = 0; s < sides; s++) {
    const a = i * sides + s, b = i * sides + ((s + 1) % sides), c = a + sides, d = b + sides;
    I.push(a, c, b, b, c, d);
  }
  // the tail fin, both faces
  const f0 = P.length / 3;
  P.push(0, 0, -0.05, 0, 0.014, -0.075, 0, -0.012, -0.073);
  for (let k = 0; k < 3; k++) C.push(...back);
  W.push(0.75, 1.15, 1.15);
  I.push(f0, f0 + 1, f0 + 2, f0, f0 + 2, f0 + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('aTail', new THREE.Float32BufferAttribute(W, 1));
  g.setIndex(I); g.computeVertexNormals();
  return g;
}

function fishMaterial(uTime, uBeat) {
  // dark backs with a faint olive sheen: a little metal, a smooth skin
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.42, metalness: 0.25 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; sh.uniforms.uBeat = uBeat;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTail; attribute float aPhase; uniform float uTime; uniform float uBeat;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.x += sin(uTime * 13.0 + aPhase * 6.2832 - position.z * 34.0) * uBeat * aTail * 0.016;`);
  };
  m.customProgramCacheKey = () => 'scriveners-fish';
  return m;
}

function markMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uFlicker: { value: 1 }, uSun: { value: new THREE.Color(PALETTE.sunLight) } }]),
    vertexShader: /* glsl */`
      attribute vec3 aMark; varying vec3 vMark; varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vMark = aMark; vUv = uv - 0.5;
        vec3 transformed = position; // atmosphere.js's height fog reads it (and applies instanceMatrix itself)
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uFlicker; uniform vec3 uSun; varying vec3 vMark; varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        float d = length(vUv) * 2.0;
        vec3 col; float a;
        if (vMark.x < 0.5) {
          // a back breaking the surface: a dark notch in the sheen, and a thin wet rim catching the sun
          // (the notch reads where the water mirrors the sky; the rim, the back's wet skin in the low sun, where it mirrors the walls)
          vec2 q = vUv * 2.0; float along = 1.0 - smoothstep(0.55, 1.0, abs(q.y));
          float core = (1.0 - smoothstep(0.4, 0.8, d)) * vMark.y;
          float rim = exp(-pow((d - 0.78) / 0.14, 2.0)) * along * vMark.y * (0.3 + 0.7 * uFlicker);
          a = max(core * 0.8, rim * 0.85);
          col = mix(vec3(0.004, 0.004, 0.006), uSun * 0.75 + vec3(0.1, 0.09, 0.11), clamp(rim * 0.85 / max(a, 1e-3), 0.0, 1.0));
        } else {
          // a ring spreading from a rise: pale, thin, fading as it widens
          float r = vMark.z, w = 0.04 + 0.05 * r;
          a = exp(-pow((d - r) / w, 2.0)) * (1.0 - r) * vMark.y * 0.32;
          col = vec3(0.55, 0.52, 0.62) * (0.4 + 0.6 * uFlicker);
        }
        if (a < 0.004) discard;
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
}

export function buildScriveners(ctx) {
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low', N = low ? 45 : 70;
  const rng = ctx.makeRng(7401);
  const lintel = lintelForms(ctx);

  // ---- the shallows: depth on a grid, and the band where they wander
  const GN = Math.round((2 * GH) / GRID) + 1, depth = new Float32Array(GN * GN);
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) depth[j * GN + i] = terrain.waterDepthAt(SITE.x - GH + i * GRID, SITE.z - GH + j * GRID) || 0;
  const depthAt = (x, z) => {
    const gx = Math.max(0, Math.min(GN - 1.001, (x - SITE.x + GH) / GRID)), gz = Math.max(0, Math.min(GN - 1.001, (z - SITE.z + GH) / GRID));
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, o = iz * GN + ix;
    return (depth[o] * (1 - fx) + depth[o + 1] * fx) * (1 - fz) + (depth[o + GN] * (1 - fx) + depth[o + GN + 1] * fx) * fz;
  };
  const band = [];
  for (let j = 0; j < GN; j += 2) for (let i = 0; i < GN; i += 2) {
    const x = SITE.x - GH + i * GRID, z = SITE.z - GH + j * GRID, d = depth[j * GN + i];
    if (d > 0.35 && d < 0.65 && hyp(x - SITE.x, z - SITE.z) < SITE.r - 1) band.push([x, z]);
  }

  // ---- where the glyph lies: on the line from P2's end, as near the path as lets every form's strokes lie in 0.2 m of water
  // or more, all of it inside r 8; upright as read from there (its top the far side)
  const targets = [];
  let C = null, fx = 0, fz = 1;
  for (let dist = 4; dist <= 16 && !C; dist += 0.25) for (const side of [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2]) {
    const ax = SITE.x - VIEW.x, az = SITE.z - VIEW.z, al = hyp(ax, az), ux = ax / al, uz = az / al;
    const cx = VIEW.x + ux * dist - uz * side, cz = VIEW.z + uz * dist + ux * side;
    const dx = cx - VIEW.x, dz = cz - VIEW.z, dl = hyp(dx, dz), f = [dx / dl, dz / dl], r = [-f[1], f[0]];
    let ok = true;
    for (let form = 0; form < FORMS && ok; form++) {
      const tg = strokeTargets(form, SCALE, N);
      for (let k = 0; k < N; k++) {
        const x = cx + r[0] * tg[k * 3] + f[0] * tg[k * 3 + 1], z = cz + r[1] * tg[k * 3] + f[1] * tg[k * 3 + 1];
        if (depthAt(x, z) < 0.2 || hyp(x - SITE.x, z - SITE.z) > SITE.r) { ok = false; break; }
      }
    }
    if (ok) { C = { x: cx, z: cz }; fx = f[0]; fz = f[1]; break; }
  }
  if (!C) C = { x: SITE.x, z: SITE.z };
  const rx = -fz, rz = fx;              // the viewer's right
  // every form's targets in world xz, with the fish's yaw (nose along the stroke)
  for (let form = 0; form < FORMS; form++) {
    const tg = strokeTargets(form, SCALE, N), w = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) {
      const gx = tg[k * 3], gy = tg[k * 3 + 1], h = tg[k * 3 + 2];
      w[k * 3] = C.x + rx * gx + fx * gy; w[k * 3 + 1] = C.z + rz * gx + fz * gy;
      const hx = rx * Math.cos(h) + fx * Math.sin(h), hz = rz * Math.cos(h) + fz * Math.sin(h);
      w[k * 3 + 2] = Math.atan2(hx, hz);
    }
    targets.push(w);
  }

  // ---- the meshes
  const uTime = { value: 0 }, uBeat = { value: 1 };
  const geo = fishGeometry(low);
  const phase = new Float32Array(N); for (let i = 0; i < N; i++) phase[i] = rng();
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  const fish = new THREE.InstancedMesh(geo, fishMaterial(uTime, uBeat), N);
  fish.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fish.name = 'living-scriveners'; fish.castShadow = false; fish.receiveShadow = false;
  const markGeo = new THREE.PlaneGeometry(1, 1); markGeo.rotateX(-Math.PI / 2);
  const NM = N + RINGS, mark = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) mark[i * 3] = i < N ? 0 : 1;
  const markAttr = new THREE.InstancedBufferAttribute(mark, 3); markAttr.setUsage(THREE.DynamicDrawUsage);
  markGeo.setAttribute('aMark', markAttr);
  const mmat = markMaterial();
  const marks = new THREE.InstancedMesh(markGeo, mmat, NM);
  marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  marks.name = 'living-scriveners-marks'; marks.renderOrder = 11; // after the tarn's surface (10)
  for (const m of [fish, marks]) { m.frustumCulled = true; m.boundingSphere = new THREE.Sphere(new THREE.Vector3(SITE.x, WATER.tarn.y, SITE.z), SITE.r + 4); scene.add(m); }

  // ---- the shoal
  const px = new Float32Array(N), pz = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vz = new Float32Array(N), yaw = new Float32Array(N);
  const ox = new Float32Array(N), oz = new Float32Array(N), oy = new Float32Array(N), oyaw = new Float32Array(N), dep = new Float32Array(N);
  const slot = new Int32Array(N), taken = new Uint8Array(N);
  const start = band.length ? band[(rng() * band.length) | 0] : [SITE.x, SITE.z];
  const S = { x: start[0], z: start[1], tx: start[0], tz: start[1], retarget: 0 };
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 20; k++) {     // somewhere round the centre in 0.25-0.75 m of water
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 1.2;
      px[i] = S.x + Math.cos(a) * r; pz[i] = S.z + Math.sin(a) * r;
      const d = depthAt(px[i], pz[i]); if (d > 0.25 && d < 0.75) break;
      px[i] = S.x; pz[i] = S.z;
    }
    dep[i] = 0.05 + rng() * 0.07;
    const sa = rng() * 6.283; vx[i] = Math.cos(sa) * 0.4; vz[i] = Math.sin(sa) * 0.4; yaw[i] = Math.atan2(vx[i], vz[i]);
  }
  const st = { phase: 'wander', t: 0, dur: T.wander[0] + rng() * (T.wander[1] - T.wander[0]), form: -1, formed: 0, holdFor: T.hold, nextRing: 3, ringCursor: 0, forms: 0, seen: [] };
  const rings = Array.from({ length: RINGS }, () => ({ on: false, x: 0, z: 0, age: 0, dur: 2.6, size: 1.2 }));
  const E = fish.instanceMatrix.array, ME = marks.instanceMatrix.array;
  let surf = WATER.tarn.y, frame = 0;
  const ease = (u) => u * u * (3 - 2 * u);

  function spawnRing(x, z, size = 1.2) {
    const r = rings[st.ringCursor++ % RINGS];
    r.on = true; r.x = x; r.z = z; r.age = 0; r.dur = 2.2 + rng() * 0.8; r.size = size;
  }
  function beginForm(form) {
    st.form = form; st.phase = 'form'; st.t = 0; st.forms++; st.seen.push(form); if (st.seen.length > 16) st.seen.shift();
    const tg = targets[form];
    // each fish to the nearest free place (greedy, in the order they lie from the glyph's centre outward)
    taken.fill(0);
    for (let i = 0; i < N; i++) {
      let best = -1, bd = Infinity;
      for (let k = 0; k < N; k++) { if (taken[k]) continue; const d = (tg[k * 3] - px[i]) ** 2 + (tg[k * 3 + 1] - pz[i]) ** 2; if (d < bd) { bd = d; best = k; } }
      taken[best] = 1; slot[i] = best;
      ox[i] = px[i]; oz[i] = pz[i]; oy[i] = dep[i]; oyaw[i] = yaw[i];
    }
  }
  function form(f) { beginForm(f === undefined || f === null ? doorsLast(ctx, lintel) : f); }

  function wander(dt) {
    // the shoal's centre drifts to a new point in the band every 6-12 s, and the shoal turns with it
    S.retarget -= dt;
    if (S.retarget <= 0 && band.length) { const b = band[(rng() * band.length) | 0]; S.tx = b[0]; S.tz = b[1]; S.retarget = 6 + rng() * 6; }
    const sdx = S.tx - S.x, sdz = S.tz - S.z, sl = hyp(sdx, sdz);
    if (sl > 0.05) { const m = Math.min(sl, 0.45 * dt) / sl; S.x += sdx * m; S.z += sdz * m; }
    let mvx = 0, mvz = 0; for (let i = 0; i < N; i++) { mvx += vx[i]; mvz += vz[i]; } mvx /= N; mvz /= N;
    const k0 = (frame * 7) % N;
    for (let i = 0; i < N; i++) {
      let ax = (S.x - px[i]) * 0.5 + (mvx - vx[i]) * 0.8, az = (S.z - pz[i]) * 0.5 + (mvz - vz[i]) * 0.8;
      // separation from eight others (a different eight each frame)
      for (let k = 1; k <= 8; k++) {
        const j = (i + k0 + k * 9) % N; if (j === i) continue;
        const dx = px[i] - px[j], dz = pz[i] - pz[j], d2 = dx * dx + dz * dz;
        if (d2 < 0.0625 && d2 > 1e-6) { const d = Math.sqrt(d2), f = (0.25 - d) / d * 6; ax += dx * f; az += dz * f; }
      }
      // the water's depth: back from the shallow edge and the deep
      const d = depthAt(px[i], pz[i]);
      if (d < 0.3 || d > 0.7) {
        const gx = depthAt(px[i] + 0.3, pz[i]) - depthAt(px[i] - 0.3, pz[i]), gz = depthAt(px[i], pz[i] + 0.3) - depthAt(px[i], pz[i] - 0.3), gl = hyp(gx, gz) || 1;
        const s = d < 0.3 ? (0.3 - d) * 30 : -(d - 0.7) * 30;
        ax += (gx / gl) * s; az += (gz / gl) * s;
      }
      vx[i] += ax * dt; vz[i] += az * dt;
      let sp = hyp(vx[i], vz[i]);
      const want = sp < 0.3 ? 0.3 : sp > 0.6 ? 0.6 : sp;
      if (sp < 1e-4) { vx[i] = 0.3; sp = 0.3; }
      vx[i] *= want / sp; vz[i] *= want / sp;
      px[i] += vx[i] * dt; pz[i] += vz[i] * dt;
      // never into water shallower than 0.2 m or deeper than 0.8 (one left outside by a break only ever moves back in)
      const d2 = depthAt(px[i], pz[i]);
      if ((d2 < 0.2 && d2 < d) || (d2 > 0.8 && d2 > d)) { px[i] -= vx[i] * dt; pz[i] -= vz[i] * dt; vx[i] = -vx[i] * 0.5; vz[i] = -vz[i] * 0.5; }
      const ty = Math.atan2(vx[i], vz[i]); let dy = ty - yaw[i]; dy -= Math.round(dy / 6.2832) * 6.2832; yaw[i] += dy * Math.min(1, dt * 6);
    }
  }

  function step(dt, t, near) {
    frame++;
    const ph = st.phase;
    st.t += dt;
    if (ph === 'wander') {
      wander(Math.min(dt, 0.1));
      st.formed = 0;
      // the cycle runs only while the walker is within 40 m
      if (near && st.t >= st.dur) form();
      if (near) { st.nextRing -= dt; if (st.nextRing <= 0) { const i = (rng() * N) | 0; spawnRing(px[i], pz[i], 0.9 + rng() * 0.6); st.nextRing = 3 + rng() * 5; } }
    } else if (ph === 'form' || ph === 'hold') {
      const tg = targets[st.form], u = ph === 'form' ? Math.min(1, st.t / T.form) : 1, e = ease(u);
      for (let i = 0; i < N; i++) {
        const k = slot[i];
        // a gentle arc in rather than a straight slide: the later half eases onto the stroke
        px[i] = ox[i] + (tg[k * 3] - ox[i]) * e; pz[i] = oz[i] + (tg[k * 3 + 1] - oz[i]) * e;
        let dy = tg[k * 3 + 2] - oyaw[i]; dy -= Math.round(dy / 6.2832) * 6.2832; yaw[i] = oyaw[i] + dy * ease(Math.min(1, u * 1.3));
        dep[i] = oy[i] + (0.022 - oy[i]) * e;      // up to the surface: the back breaking it
      }
      st.formed = ph === 'hold' ? 1 : Math.max(0, (u - 0.55) / 0.45);
      if (ph === 'form' && u >= 1) { st.phase = 'hold'; st.t = 0; }
      else if (ph === 'hold' && st.t >= st.holdFor) {
        st.phase = 'break'; st.t = 0; st.holdFor = T.hold;
        for (let i = 0; i < N; i++) { ox[i] = px[i]; oz[i] = pz[i]; oy[i] = dep[i]; }
      }
    } else if (ph === 'break') {
      const u = Math.min(1, st.t / T.break), e = 1 - (1 - u) * (1 - u);
      for (let i = 0; i < N; i++) {
        const dx = ox[i] - C.x, dz = oz[i] - C.z, dl = hyp(dx, dz) || 1, j = phase[i] - 0.5;
        const nx = dx / dl + j * 0.6, nz = dz / dl - j * 0.6;
        let tx = ox[i] + nx * 1.5 * e, tz = oz[i] + nz * 1.5 * e;
        if (depthAt(tx, tz) < 0.15) { tx = px[i]; tz = pz[i]; }
        vx[i] = (tx - px[i]) / Math.max(dt, 1e-3); vz[i] = (tz - pz[i]) / Math.max(dt, 1e-3);
        px[i] = tx; pz[i] = tz; dep[i] = oy[i] + (0.05 + phase[i] * 0.07 - oy[i]) * e;
        const ty = Math.atan2(nx, nz); let dy = ty - yaw[i]; dy -= Math.round(dy / 6.2832) * 6.2832; yaw[i] += dy * Math.min(1, dt * 5);
      }
      st.formed = Math.max(0, 1 - u * 2.2);
      if (u >= 1) {
        st.phase = 'wander'; st.t = 0; st.dur = T.wander[0] + rng() * (T.wander[1] - T.wander[0]);
        let cx = 0, cz = 0; for (let i = 0; i < N; i++) { cx += px[i]; cz += pz[i]; } S.x = cx / N; S.z = cz / N; S.retarget = 0; // and off to the band
        // the break's dash, then the shoal's own pace: some fish ended in deeper water; the depth rule herds them back
        for (let i = 0; i < N; i++) { const sp = hyp(vx[i], vz[i]) || 1; vx[i] *= 0.45 / sp; vz[i] *= 0.45 / sp; }
      }
    }
    // the tails: a steady beat while swimming, barely moving while held
    uBeat.value = ph === 'hold' ? 0.12 : ph === 'form' ? 1 - 0.8 * st.formed : 1;
    uTime.value = t;
    surf = WATER.tarn.y + tideAt(t);
    write(dt);
  }

  function write(dt) {
    const notch = st.formed;
    for (let i = 0; i < N; i++) {
      const c = Math.cos(yaw[i]), s = Math.sin(yaw[i]), o = i * 16, y = surf - dep[i];
      E[o] = c; E[o + 1] = 0; E[o + 2] = -s; E[o + 3] = 0; E[o + 4] = 0; E[o + 5] = 1; E[o + 6] = 0; E[o + 7] = 0;
      E[o + 8] = s; E[o + 9] = 0; E[o + 10] = c; E[o + 11] = 0; E[o + 12] = px[i]; E[o + 13] = y; E[o + 14] = pz[i]; E[o + 15] = 1;
      // its notch on the surface: 6 cm by 19 cm along the back, so neighbours on a stroke run together
      const w = notch > 0 ? 0.06 : 0, l = notch > 0 ? 0.19 : 0;
      ME[o] = c * w; ME[o + 1] = 0; ME[o + 2] = -s * w; ME[o + 3] = 0; ME[o + 4] = 0; ME[o + 5] = 1; ME[o + 6] = 0; ME[o + 7] = 0;
      ME[o + 8] = s * l; ME[o + 9] = 0; ME[o + 10] = c * l; ME[o + 11] = 0; ME[o + 12] = px[i]; ME[o + 13] = surf + 0.004; ME[o + 14] = pz[i]; ME[o + 15] = 1;
      mark[i * 3 + 1] = notch;
    }
    for (let k = 0; k < RINGS; k++) {
      const r = rings[k], o = (N + k) * 16, m = (N + k) * 3;
      if (r.on) { r.age += dt; if (r.age >= r.dur) r.on = false; }
      const u = r.on ? r.age / r.dur : 0, sz = r.on ? r.size : 0;
      ME.fill(0, o, o + 16); ME[o] = sz; ME[o + 5] = 1; ME[o + 10] = sz; ME[o + 12] = r.x; ME[o + 13] = surf + 0.005; ME[o + 14] = r.z; ME[o + 15] = 1;
      mark[m + 1] = r.on ? 1 : 0; mark[m + 2] = Math.max(0.04, u);
    }
    fish.instanceMatrix.needsUpdate = true; marks.instanceMatrix.needsUpdate = true; markAttr.needsUpdate = true;
  }

  // a first pose, so the fish are in the water before the first frame
  step(0, 0, false);
  const flick = ctx.sky?.flicker || { value: 1 };
  ctx.registerUpdate((dt, t) => {
    const near = hyp(ctx.player.pos.x - SITE.x, ctx.player.pos.z - SITE.z) < NEAR;
    mmat.uniforms.uFlicker.value = flick.value;
    step(dt, t, near);
  }, { pos: { x: SITE.x, z: SITE.z }, near: NEAR, hz: 2 });

  // the formed glyph as the fish make it: the furthest any lies from the form's strokes (m), in glyph space
  function formedError() {
    if (st.form < 0) return null;
    let worst = 0;
    for (let i = 0; i < N; i++) {
      const dx = px[i] - C.x, dz = pz[i] - C.z, gx = (dx * rx + dz * rz) / SCALE, gy = (dx * fx + dz * fz) / SCALE;
      worst = Math.max(worst, strokeDistance(st.form, gx, gy, 0.012) * SCALE);
    }
    return worst;
  }
  return {
    fish, marks, N, centre: C, facing: { x: fx, z: fz },
    form: (f, opts = {}) => {
      form(f);
      if (opts.now) { st.t = T.form; step(0.0001, ctx.time?.t || 0, true); }
      if (opts.hold) st.holdFor = opts.hold;
      return st.form;
    },
    wander: () => { st.phase = 'wander'; st.t = 0; st.formed = 0; st.holdFor = T.hold; for (let i = 0; i < N; i++) dep[i] = 0.05 + phase[i] * 0.07; },
    release: () => { st.holdFor = st.phase === 'hold' ? Math.min(T.hold, st.t) : T.hold; }, // a held pose breaks now
    state: () => ({ phase: st.phase, t: st.t, form: st.form, forms: st.forms, seen: st.seen.slice(), formed: st.formed, dur: st.dur }),
    depths: () => { let lo = Infinity, hi = 0; for (let i = 0; i < N; i++) { const d = depthAt(px[i], pz[i]); lo = Math.min(lo, d); hi = Math.max(hi, d); } return [lo, hi]; },
    positions: () => Array.from({ length: N }, (_, i) => [px[i], pz[i], surf - dep[i], yaw[i]]),
    formedError,
    doorsLast: () => doorsLast(ctx, lintel),
    tris: () => (geo.index.count / 3) * N + 2 * NM,
  };
}
