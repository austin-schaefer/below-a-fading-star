// AB. The Menology [Proposed]: thirty-six low menhirs set out in a spiral on the south moor, one for each
// month of a run, from the centre outward; each rough-hewn and dark, dressed smooth only on the face that
// turns to the spiral's heart; the thirty-sixth, at the outer end, left unfinished and short. Lichen keeps
// to the sun side. Small lizards live among them: they bask flat on the warm faces, dart and freeze, slip
// under the nearest stone when you come close, and come out again when you have stood still long enough.
// When the sun gutters every one of them goes still until it comes back.
import * as THREE from 'three';
import { Painter, paintedMaterial, makeGround, angDiff } from '../../fauna/uncanny/kit.js';
import { smoothstep, clamp } from '../../fauna/geo.js';

const TAU = Math.PI * 2;
const STONE = new THREE.Color('#1d1b19'), STONE_FACE = new THREE.Color('#2a2724'), STONE_RAW = new THREE.Color('#24211d');
const LICHEN = new THREE.Color('#6f6c4c'), LICHEN_D = new THREE.Color('#4e5238'), RUST = new THREE.Color('#5a4630');

// ---------------------------------------------------------------- the stones
function layout(C, rng) {
  // Archimedean spiral r = r0 + b*theta, stones spaced along its arc, the spacing growing outward
  const b = 1.3, r0 = 1.6, out = [];
  let th = 0, s = 0, next = 0;
  for (let i = 0; i < 36; i++) {
    const want = 2.15 + 1.05 * (i / 35);
    if (i > 0) { while (s < next) { const r = r0 + b * th, dth = 0.01; s += Math.hypot(r, b) * dth; th += dth; } }
    next = s + want;
    const r = r0 + b * th + (rng() - 0.5) * 0.25;
    const a = th + Math.PI * 0.35;                       // the spiral opens toward the south-west, toward the sun
    out.push({ i, x: C.x + Math.cos(a) * r, z: C.z + Math.sin(a) * r, r, a });
  }
  return out;
}

// The stone's outer surface, shared by the mesh and by the lizards that sit on it:
// local frame: +z is the dressed face (toward the spiral's centre), x across, y up from the ground.
function stoneShape(st, noise) {
  const { w, d, h, seed, unfinished, taperK } = st;
  return (a, y, out) => {
    // a: angle about the stone's axis, 0 = +x, pi/2 = +z (the face)
    const v = clamp(y / h, 0, 1);
    const ca = Math.cos(a), sa = Math.sin(a);
    // a rounded slab: superellipse section, narrowing and thinning toward a blunt, uneven top
    const taper = 1 - taperK * v * v - (unfinished ? 0.0 : 0.06 * v);
    const pw = 2.6, sx = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / pw), sz = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / pw);
    let x = sx * w * 0.5 * taper, z = sz * d * 0.5 * taper;
    // dressed face: flat, the noise mostly planed off; the rest rough, in big flakes and small pits
    const face = smoothstep(0.35, 0.8, sa) * (unfinished ? 0.0 : 1);
    const n1 = noise.noise2(seed + a * 1.3 + y * 0.9, seed * 0.7 + y * 1.6 + a * 0.2);
    const n2 = noise.noise2(seed * 1.9 + a * 4.1, y * 5.3 - seed);
    const n3 = noise.noise2(seed * 0.37 + a * 2.2, y * 2.4 + seed * 0.5);
    // flakes: ridged noise gives the broken, faceted look of stone split along its grain
    // and a vertical grain: shallow flutes where the stone was split
    const grain = Math.sin(a * 5 + seed + n1 * 2) * 0.012;
    const rough = (n1 * 0.07 + (0.35 - Math.abs(n3)) * 0.08 + n2 * 0.03 + grain) * (1 - 0.85 * face);
    // the unfinished stone keeps quarry steps on its flanks
    const step = unfinished ? 0.05 * Math.round(Math.sin(y * 6 + seed) * 1.5) / 1.5 : 0;
    const k = 1 + (rough + step) / Math.max(0.15, Math.hypot(x, z));
    x *= k; z *= k;
    if (face > 0) z -= face * 0.008;
    out[0] = x; out[1] = y; out[2] = z;
    return out;
  };
}

function buildStones(ctx, C, ground, rng, low) {
  const { noise } = ctx;
  const sun = ctx.sun.dir;
  const sunLen = Math.hypot(sun.x, sun.z), sunX = sun.x / sunLen, sunZ = sun.z / sunLen;
  const P = new Painter();
  const spots = layout(C, rng);
  const stones = [];
  const tmp = [0, 0, 0], tmpA = [0, 0, 0], tmpB = [0, 0, 0];
  const NU = low ? 10 : 16, NV = low ? 6 : 10;
  for (const sp of spots) {
    const unfinished = sp.i === 35;
    const h = unfinished ? 0.78 + rng() * 0.08 : 1.1 + 0.7 * Math.pow(rng(), 0.8) * (0.75 + 0.25 * (1 - sp.i / 35));
    const st = {
      ...sp, h, unfinished, seed: sp.i * 7.31 + 3.1,
      w: (unfinished ? 0.95 : 0.62 + rng() * 0.22) * (0.9 + 0.1 * h), d: unfinished ? 0.72 : 0.34 + rng() * 0.12,
      lean: (rng() - 0.5) * 0.08, roll: (rng() - 0.5) * 0.06,
      taperK: 0.12 + rng() * 0.3, tiltA: (rng() - 0.5) * 0.7, tiltB: (rng() - 0.5) * 0.35,
    };
    if (unfinished) { st.tiltA = 0.04; st.tiltB = 0; }
    // the top, broken across at a slant
    st.topY = (a) => st.h + st.sink + st.tiltA * Math.cos(a) * st.w * 0.5 + st.tiltB * Math.sin(a) * st.d * 0.5;
    // face the spiral's centre (with a little error, as if set by eye)
    st.yaw = Math.atan2(C.x - sp.x, C.z - sp.z) + (rng() - 0.5) * 0.18;
    st.gy = ground.at(sp.x, sp.z);
    st.sink = 0.28;
    st.shape = stoneShape(st, noise);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(sp.x, st.gy - st.sink, sp.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(st.lean, st.yaw, st.roll, 'YXZ')),
      new THREE.Vector3(1, 1, 1));
    st.m = m; st.mi = m.clone().invert();
    const top = h + st.sink;
    // the body, as a grid in (angle, height), capped with a domed, broken top
    P.xf(m);
    const rows = [];
    for (let j = 0; j <= NV; j++) {
      const row = [];
      for (let i2 = 0; i2 < NU; i2++) {
        const a = (i2 / NU) * TAU + 0.11;
        const y = (j / NV) * top;
        st.shape(a, y, tmp);
        // the top: pulled in and rounded; on the unfinished stone a flat quarry bed
        let yy = tmp[1];
        if (j === NV) {
          const dome = unfinished ? 0.02 : 0.1 + 0.06 * noise.noise2(st.seed + a, 3.3);
          yy = st.topY(a) + dome * 0.4; tmp[0] *= 0.84; tmp[2] *= 0.84;
        }
        // colour: dark stone; the dressed face a shade lighter and smoother; lichen on the sun side, low and on the top
        const ca = Math.cos(a), sa = Math.sin(a);
        // the outward direction of this vertex in world space, for the sun test
        const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
        const wx = ca * cy + sa * sy, wz = -ca * sy + sa * cy;
        const sunSide = wx * sunX + wz * sunZ;
        const face = smoothstep(0.4, 0.85, sa) * (unfinished ? 0 : 1);
        const ln = noise.noise2(st.seed * 3 + a * 2.2, y * 3.1) * 0.6 + noise.noise2(a * 7 + st.seed, y * 9) * 0.4;
        const lichen = smoothstep(0.0, 0.6, sunSide) * smoothstep(0.05, 0.45, ln + 0.25 * (1 - y / top) + (j === NV ? 0.3 : 0)) * (1 - face * 0.6) * (y > st.sink - 0.05 ? 1 : 0);
        const c = (unfinished ? STONE_RAW : STONE).clone().lerp(STONE_FACE, face);
        c.multiplyScalar(0.9 + 0.2 * noise.noise2(a * 3 + st.seed, y * 2.7));
        if (y < st.sink + 0.12) c.lerp(RUST, 0.25);
        c.lerp(ln > 0.2 ? LICHEN : LICHEN_D, lichen * 0.85);
        P.col = [c.r, c.g, c.b]; P.mre = [0, 0.95 - 0.25 * face, 0];
        row.push(P.v(tmp[0], yy, tmp[2]));
      }
      rows.push(row);
    }
    for (let j = 0; j < NV; j++) for (let i2 = 0; i2 < NU; i2++) {
      const i1 = (i2 + 1) % NU;
      P.quad(rows[j][i2], rows[j + 1][i2], rows[j + 1][i1], rows[j][i1]);
    }
    // top cap
    let cx = 0, cz = 0;
    for (let i2 = 0; i2 < NU; i2++) { st.shape((i2 / NU) * TAU + 0.11, top, tmpA); cx += tmpA[0] * 0.82; cz += tmpA[2] * 0.82; }
    const capY = top + (unfinished ? 0.02 : 0.08);
    const cTop = P.col.slice();
    P.col = [LICHEN_D.r * 0.8 + STONE.r * 0.2, LICHEN_D.g * 0.8 + STONE.g * 0.2, LICHEN_D.b * 0.8 + STONE.b * 0.2];
    if (unfinished) P.col = [STONE_RAW.r, STONE_RAW.g, STONE_RAW.b];
    const ct = P.v(cx / NU, capY, cz / NU);
    for (let i2 = 0; i2 < NU; i2++) P.tri(rows[NV][(i2 + 1) % NU], rows[NV][i2], ct);
    P.col = cTop;
    P.xf(null);
    stones.push(st);
    // a collider a little inside the stone's footprint
    ctx.addCollider({ x: sp.x, z: sp.z, r: Math.max(st.w, st.d) * 0.5 + 0.05 });
  }
  const geo = P.geometry();
  geo.computeVertexNormals();
  const mat = paintedMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'inhabitants-menology-stones'; mesh.castShadow = true; mesh.receiveShadow = true;
  return { mesh, stones, sunX, sunZ };
}

// ---------------------------------------------------------------- the lizards
function lizardGeometry() {
  // nose along +z, back up +y, belly at y = 0; about 22 cm nose to tail tip.  ~40 triangles.
  const P = new Painter(['aTail']);
  const BACK = '#4a4c3c', THROAT = '#8a8670';
  // body: a flattened four-sided tube, snout to tail root; the throat and belly pale
  const body = [[0, 0.012, 0.085], [0, 0.017, 0.045], [0, 0.016, -0.005], [0, 0.011, -0.045]];
  const brad = [[0.007, 0.005], [0.015, 0.01], [0.016, 0.01], [0.008, 0.006]];
  const sides = 4;
  const rings = [];
  for (let k = 0; k < body.length; k++) {
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const an = (s / sides) * TAU + Math.PI / 4;
      const x = Math.cos(an) * brad[k][0], y = body[k][1] + Math.sin(an) * brad[k][1];
      P.paint(Math.sin(an) < 0 && k <= 1 ? THROAT : BACK, 0, 0.75);
      P.set('aTail', 0);
      ring.push(P.v(x, y, body[k][2]));
    }
    rings.push(ring);
  }
  for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < sides; s++) { const s1 = (s + 1) % sides; P.quad(rings[k][s], rings[k][s1], rings[k + 1][s1], rings[k + 1][s]); }
  P.paint(BACK, 0, 0.75);
  const nose = P.v(0, 0.011, 0.1);
  for (let s = 0; s < sides; s++) P.tri(rings[0][(s + 1) % sides], rings[0][s], nose);
  // tail: a flat tapering ribbon (aTail = distance down the tail, for the swish); the material is two-sided
  const tail = [[-0.08, 0.004], [-0.115, 0.002], [-0.15, 0.0006]];
  let prev = [rings[3][1], rings[3][3]];
  for (let k = 0; k < tail.length; k++) {
    const [z, w] = tail[k];
    P.set('aTail', (k + 1) / tail.length);
    const a = P.v(-w, 0.008, z), b = P.v(w, 0.008, z);
    P.tri(prev[0], a, b); P.tri(prev[0], b, prev[1]);
    prev = [a, b];
  }
  // four splayed legs, each a single flat triangle
  P.set('aTail', 0);
  for (const [sx, z] of [[-1, 0.045], [1, 0.045], [-1, -0.03], [1, -0.03]]) {
    const r = P.v(sx * 0.012, 0.008, z), f = P.v(sx * 0.036, 0.001, z + 0.014), b = P.v(sx * 0.032, 0.001, z - 0.01);
    P.tri(r, f, b);
  }
  const g = P.geometry();
  return g;
}

function lizardMaterial() {
  const mat = paintedMaterial({ side: THREE.DoubleSide }, (sh) => {
    sh.uniforms.uTime = mat.userData.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTail; attribute vec2 aSwish; uniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { float sw = sin(uTime * 5.0 + aSwish.y) * aSwish.x * aTail * aTail;
          transformed.x += sw * 0.03; }`);
  });
  mat.userData.uTime = { value: 0 };
  mat.customProgramCacheKey = () => 'fp-lizard';
  return mat;
}

export function buildMenology(ctx) {
  const { scene, camera } = ctx;
  const low = ctx.quality === 'low';
  const L = ctx.landmarks.menology || { x: -15, z: 255, r: 24 };
  const C = { x: L.x, z: L.z }, R = Math.min(L.r || 24, 24);
  const rng = ctx.makeRng(7731);
  const ground = makeGround(ctx);
  const { mesh, stones, sunX, sunZ } = buildStones(ctx, C, ground, rng, low);
  scene.add(mesh);

  // ---- lizards
  const N = low ? 26 : 48;
  const lgeo = lizardGeometry();
  const swish = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2); swish.setUsage(THREE.DynamicDrawUsage);
  lgeo.setAttribute('aSwish', swish);
  const lmat = lizardMaterial();
  const liz = new THREE.InstancedMesh(lgeo, lmat, N);
  liz.name = 'inhabitants-menology-lizards'; liz.castShadow = false; liz.receiveShadow = true;
  liz.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  liz.frustumCulled = false;
  scene.add(liz);

  // Where a lizard can be: on the ground (stone = -1), or flat on a stone's face (stone index, angle a, height y).
  const tmp = [0, 0, 0];
  const v3 = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(), fw = new THREE.Vector3(), side = new THREE.Vector3();
  const q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), sc = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  // a point on a stone's surface, and its outward normal (world)
  function onStone(st, a, y, outP, outN) {
    st.shape(a, y + st.sink, tmp);
    outP.set(tmp[0], tmp[1], tmp[2]);
    // normal from neighbouring samples
    st.shape(a + 0.05, y + st.sink, tmp); const ax = tmp[0], az = tmp[2];
    st.shape(a - 0.05, y + st.sink, tmp); const tx = ax - tmp[0], tz = az - tmp[2];
    outN.set(tz, 0, -tx).normalize();
    // outward check
    if (outN.x * outP.x + outN.z * outP.z < 0) outN.negate();
    outP.applyMatrix4(st.m); outN.transformDirection(st.m);
    outP.addScaledVector(outN, 0.006);
  }
  const sunAngleFor = (st) => {
    // the stone-local angle that faces the sun
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
    const lx = sunX * cy - sunZ * sy, lz = sunX * sy + sunZ * cy;
    return Math.atan2(lz, lx);
  };
  const nearestStone = (x, z) => { let best = 0, bd = 1e9; for (let i = 0; i < stones.length; i++) { const d = Math.hypot(stones[i].x - x, stones[i].z - z); if (d < bd) { bd = d; best = i; } } return best; };
  const inside = (x, z) => Math.hypot(x - C.x, z - C.z) < R - 0.6;

  // state per lizard
  const Z = [];
  const BASK = 0, DART = 1, FREEZE = 2, FLEE = 3, HIDDEN = 4;
  function pickBask(L, st) {
    // somewhere warm: the sun face of this stone, the ground at its sunny foot, or its top
    const r = rng();
    if (r < 0.55) { L.stone = st.i; L.a = sunAngleFor(st) + (rng() - 0.5) * 1.3; L.y = 0.15 + rng() * (st.h - 0.35); }
    else if (r < 0.75) { L.stone = st.i; L.a = sunAngleFor(st) + (rng() - 0.5) * 2.0; L.y = st.h - 0.04; L.top = true; }
    else {
      L.stone = -1; L.top = false;
      const d = 0.6 + rng() * 1.6, a = Math.atan2(sunZ, sunX) + (rng() - 0.5) * 1.6;
      L.x = st.x + Math.cos(a) * d; L.z = st.z + Math.sin(a) * d; L.yaw = rng() * TAU;
    }
  }
  for (let i = 0; i < N; i++) {
    const st = stones[Math.floor(rng() * stones.length)];
    const L = { state: BASK, t: 2 + rng() * 10, stone: -1, a: 0, y: 0, top: false, x: st.x, z: st.z, yaw: 0, home: st.i,
      fx: 0, fz: 0, tx: 0, tz: 0, dur: 0, el: 0, phase: rng() * TAU, swish: 0, vis: 1, seed: rng() };
    pickBask(L, st);
    Z.push(L);
  }
  // Leave a stone face for the ground at its foot, so every dart starts on the ground.
  function toGround(L) {
    if (L.stone < 0) return;
    const st = stones[L.stone];
    onStone(st, L.a, 0, v3, nrm);
    L.x = v3.x + nrm.x * 0.08; L.z = v3.z + nrm.z * 0.08; L.yaw = Math.atan2(nrm.x, nrm.z); L.stone = -1; L.top = false;
  }
  function startDart(L, tx, tz, speed) {
    toGround(L);
    // clamp to the site
    const dx = tx - C.x, dz = tz - C.z, d = Math.hypot(dx, dz);
    if (d > R - 0.6) { tx = C.x + dx / d * (R - 0.6); tz = C.z + dz / d * (R - 0.6); }
    L.fx = L.x; L.fz = L.z; L.tx = tx; L.tz = tz;
    L.dur = Math.max(0.15, Math.hypot(tx - L.x, tz - L.z) / speed); L.el = 0;
    L.yaw = Math.atan2(tx - L.x, tz - L.z);
  }

  const S = { skitterT: 0, frozen: false, near: 0 };
  const cam = camera.position;
  function update(dt, t) {
    lmat.userData.uTime.value = t;
    const frozen = ctx.sky.flicker.value < 0.55;
    S.frozen = frozen;
    const farAway = Math.hypot(cam.x - C.x, cam.z - C.z) > R + 140;
    S.skitterT -= dt;
    let near = 0;
    for (let i = 0; i < N; i++) {
      const L = Z[i];
      // where it is now (ground position for distance tests)
      let px, pz;
      if (L.stone >= 0) { px = stones[L.stone].x; pz = stones[L.stone].z; } else { px = L.x; pz = L.z; }
      const pd = Math.hypot(cam.x - px, cam.z - pz);
      if (pd < 12) near++;
      if (!frozen && !farAway) {
        L.t -= dt;
        // the player too close: away under the nearest stone, on the side away from you
        if (pd < 4 && L.state !== FLEE && L.state !== HIDDEN) {
          const st = stones[nearestStone(px, pz)];
          const ax = st.x - cam.x, az = st.z - cam.z, al = Math.hypot(ax, az) || 1;
          L.hideAt = st.i;
          startDart(L, st.x + (ax / al) * (st.d * 0.5 + 0.12), st.z + (az / al) * (st.d * 0.5 + 0.12), 3.6 + L.seed);
          L.state = FLEE;
          if (pd < 6 && S.skitterT <= 0) { S.skitterT = 1; ctx.audio?.cue?.('lizard-skitter', v3.set(L.x, ground.at(L.x, L.z), L.z), {}); }
        }
        switch (L.state) {
          case BASK:
            if (L.t <= 0) {
              // a dart of 1 to 3 m, then a freeze; or a move to bask somewhere else
              const a = rng() * TAU, d = 1 + rng() * 2;
              const fromX = L.stone >= 0 ? stones[L.stone].x : L.x, fromZ = L.stone >= 0 ? stones[L.stone].z : L.z;
              startDart(L, fromX + Math.cos(a) * d, fromZ + Math.sin(a) * d, 2.4 + L.seed * 1.4);
              L.state = DART;
              if (Math.hypot(cam.x - L.x, cam.z - L.z) < 6 && S.skitterT <= 0) { S.skitterT = 1; ctx.audio?.cue?.('lizard-skitter', v3.set(L.x, ground.at(L.x, L.z), L.z), {}); }
            }
            break;
          case DART: case FLEE:
            L.el += dt;
            {
              const f = Math.min(1, L.el / L.dur);
              L.x = L.fx + (L.tx - L.fx) * f; L.z = L.fz + (L.tz - L.fz) * f;
              if (f >= 1) {
                if (L.state === FLEE) { L.state = HIDDEN; L.t = 10 + rng() * 10; }
                else { L.state = FREEZE; L.t = 0.6 + rng() * 3; }
              }
            }
            break;
          case FREEZE:
            if (L.t <= 0) {
              if (rng() < 0.45) { const a = rng() * TAU, d = 1 + rng() * 2; startDart(L, L.x + Math.cos(a) * d, L.z + Math.sin(a) * d, 2.4 + L.seed * 1.4); L.state = DART;
                if (Math.hypot(cam.x - L.x, cam.z - L.z) < 6 && S.skitterT <= 0) { S.skitterT = 1; ctx.audio?.cue?.('lizard-skitter', v3.set(L.x, ground.at(L.x, L.z), L.z), {}); } }
              else { pickBask(L, stones[nearestStone(L.x, L.z)]); L.state = BASK; L.t = 6 + rng() * 18; }
            }
            break;
          case HIDDEN:
            if (L.t <= 0) {
              // out again, but not while you stand over the stone
              const st = stones[L.hideAt];
              if (Math.hypot(cam.x - st.x, cam.z - st.z) < 5) L.t = 2 + rng() * 3;
              else { L.state = FREEZE; L.t = 1.5 + rng() * 2; L.yaw = Math.atan2(L.x - st.x, L.z - st.z); }
            }
            break;
        }
      }
      // tail swish while basking (not while the sun is out)
      const sw = L.state === BASK && !frozen ? 0.6 + 0.4 * Math.sin(t * 0.37 + L.phase) : 0;
      L.swish += (sw - L.swish) * Math.min(1, dt * 3);
      swish.array[i * 2] = L.swish * (0.5 + 0.5 * Math.max(0, Math.sin(t * 0.21 + L.phase * 3))); swish.array[i * 2 + 1] = L.phase;
      // visibility: tucked under the stone while hidden
      const visT = L.state === HIDDEN ? 0 : 1;
      L.vis += (visT - L.vis) * Math.min(1, dt * (visT ? 4 : 10));
      // pose
      if (L.stone >= 0) {
        const st = stones[L.stone];
        if (L.top) {
          // on top: flat, facing the sun
          st.shape(L.a, st.h + st.sink, tmp);
          v3.set(tmp[0] * 0.5, st.topY(L.a) * 0.5 + (st.h + st.sink) * 0.5 + 0.06, tmp[2] * 0.5).applyMatrix4(st.m);
          up.set(0, 1, 0); fw.set(-sunX, 0, -sunZ);
        } else {
          // flat against the face, head up
          onStone(st, L.a, L.y, v3, nrm);
          up.copy(nrm); fw.set(0, 1, 0).addScaledVector(nrm, -nrm.y).normalize();
        }
      } else {
        v3.set(L.x, ground.at(L.x, L.z) + 0.002, L.z);
        up.set(0, 1, 0); fw.set(Math.sin(L.yaw), 0, Math.cos(L.yaw));
      }
      side.crossVectors(up, fw).normalize(); fw.crossVectors(side, up);
      basis.makeBasis(side, up, fw);
      q.setFromRotationMatrix(basis);
      const s = 1.15 * L.vis * (0.85 + 0.3 * L.seed);
      sc.set(s, s, s);
      if (L.vis < 0.02) sc.set(0, 0, 0);
      m4.compose(v3, q, sc);
      liz.setMatrixAt(i, m4);
    }
    S.near = near;
    liz.instanceMatrix.needsUpdate = true; swish.needsUpdate = true;
  }
  ctx.registerUpdate(update);

  const tri = (g) => g.index.count / 3;
  return {
    api: { tick: (dt, t) => update(dt, t), stones, lizards: Z, state: S, mesh, lizardMesh: liz, centre: C },
    drawCalls: 2, tris: tri(mesh.geometry) + tri(lgeo) * N, lizardTris: tri(lgeo),
  };
}
