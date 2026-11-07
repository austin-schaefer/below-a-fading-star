// Grazers: a small herd of stilt-legged, grey, antlered beasts on the moor between the keep and the stones.
// Four instanced meshes (bodies, heads+antlers, upper legs, lower legs); poses are composed per frame from matrices.
import * as THREE from 'three';
import { Mesher, clamp, lerp } from './geo.js';

const HIP_Y = 1.18, SHOULDER = [0, 1.42, 0.8], LEG_X = 0.13, FRONT_Z = 0.55, BACK_Z = -0.58, UP_LEN = 0.6, LO_LEN = 0.58;

function bodyGeometry() {
  const M = new Mesher();
  M.loft([[0, 1.24, -0.9], [0, 1.29, -0.55], [0, 1.33, 0.05], [0, 1.4, 0.6], [0, 1.43, 0.88]],
    [[0.1, 0.12], [0.2, 0.24], [0.21, 0.25], [0.19, 0.23], [0.1, 0.12]], 8);
  M.blob(0, 1.3, -0.62, 0.2, 0.22, 0.26, 7, 5);   // haunch
  M.blob(0, 1.5, 0.5, 0.12, 0.12, 0.2, 6, 4);     // withers
  M.loft([[0, 1.3, -0.85], [0, 1.15, -1.0], [0, 0.95, -1.04]], [0.03, 0.025, 0.012], 4); // thin tail
  return M.geometry();
}
function headGeometry() {
  const M = new Mesher();
  // neck and long narrow skull, origin at the shoulder pivot, pointing +z
  M.loft([[0, 0, 0], [0, 0.1, 0.3], [0, 0.2, 0.62], [0, 0.2, 0.86]], [[0.11, 0.14], [0.09, 0.11], [0.07, 0.08], [0.06, 0.065]], 6);
  M.loft([[0, 0.2, 0.84], [0, 0.14, 1.04], [0, 0.04, 1.24]], [[0.062, 0.07], [0.05, 0.055], [0.02, 0.022]], 6);
  for (const s of [-1, 1]) {
    M.blob(0.06 * s, 0.26, 0.82, 0.015, 0.06, 0.1, 4, 3); // ears, laid back
    // antlers: a long back-swept beam, tines forward
    const beam = [[0.04, 0.26, 0.9], [0.17, 0.55, 0.82], [0.33, 0.88, 0.62], [0.36, 1.2, 0.4], [0.28, 1.5, 0.25]];
    M.loft(beam.map((p) => [p[0] * s, p[1], p[2]]), [0.022, 0.02, 0.017, 0.013, 0.005], 4);
    for (const [k, len] of [[1, 0.4], [2, 0.5], [3, 0.42]]) {
      const b = beam[k];
      M.loft([[b[0] * s, b[1], b[2]], [(b[0] + 0.1) * s, b[1] + len * 0.5, b[2] + 0.22], [(b[0] + 0.05) * s, b[1] + len, b[2] + 0.34]], [0.012, 0.009, 0.003], 4);
    }
  }
  return M.geometry();
}
function legGeometry(len, r0, r1) {
  const M = new Mesher();
  M.loft([[0, 0, 0], [0, -len * 0.5, 0], [0, -len, 0]], [r0, (r0 + r1) / 2, r1], 5);
  return M.geometry();
}

export function buildGrazers(ctx, opts = {}) {
  const { scene, terrain, camera } = ctx;
  const rng = ctx.makeRng(opts.salt ?? 202);
  const N = opts.n ?? 6;
  const mat = new THREE.MeshStandardMaterial({ color: 0x8d8c92, roughness: 0.95, metalness: 0 });
  const mk = (g, n) => { const m = new THREE.InstancedMesh(g, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  const bodies = mk(bodyGeometry(), N), heads = mk(headGeometry(), N);
  const uppers = mk(legGeometry(UP_LEN, 0.05, 0.034), N * 4), lowers = mk(legGeometry(LO_LEN, 0.03, 0.016), N * 4);
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    col.setHSL(0.72, 0.05, 0.62 + rng() * 0.2);
    for (const m of [bodies, heads]) m.setColorAt(i, col);
    for (let k = 0; k < 4; k++) { uppers.setColorAt(i * 4 + k, col); lowers.setColorAt(i * 4 + k, col); }
  }

  const slopeLimit = 0.7;
  const valid = (x, z) => {
    if (Math.hypot(x, z) > 280) return false;
    if (terrain.causewayDistance(x, z) < 5.5) return false;
    const wl = terrain.waterLevelAt(x, z);
    if (wl !== null && terrain.heightAt(x, z) < wl + 1.2) return false;
    if (terrain.slopeAt(x, z) > slopeLimit) return false;
    return true;
  };

  const [HX, HZ] = opts.home ?? [-60, -40];
  const herd = { x: HX, z: HZ, mode: 'graze', alertT: 0, calmT: 0 };
  const A = [];
  let tries = 0;
  while (A.length < N && tries++ < 200) {
    const a = rng() * 6.28, r = 2 + rng() * 11, x = HX + Math.cos(a) * r, z = HZ + Math.sin(a) * r;
    if (!valid(x, z)) continue;
    if (A.some((b) => Math.hypot(b.x - x, b.z - z) < 3)) continue;
    A.push({
      x, z, yaw: rng() * 6.28, speed: 0, gait: rng() * 6.28, lift: 0, liftGoal: 0, pitch: 0,
      state: 'graze', timer: 2 + rng() * 8, wx: x, wz: z, flee: 0, fx: 0, fz: 0, off: (rng() - 0.5) * 0.5, delay: rng() * 0.5, delayT: 0, perk: 6 + rng() * 14,
      yOff: 0,
    });
  }
  const n = A.length;
  (ctx.herds = ctx.herds || []).push({ animals: A, herd });
  ctx.grazers = ctx.grazers || { animals: A, herd };

  const M = new THREE.Matrix4(), Mh = new THREE.Matrix4(), Mu = new THREE.Matrix4(), Ml = new THREE.Matrix4(), T = new THREE.Matrix4(), R = new THREE.Matrix4();
  const cam = camera.position;
  const stepOk = (x, z, dx, dz, ahead) => valid(x + dx * ahead, z + dz * ahead);

  function steer(a, hx, hz, ahead) {
    // returns a heading (angle) near the desired one that is valid ahead, or null
    const base = Math.atan2(hx, hz);
    for (const o of [0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3, 1.9, -1.9]) {
      const ang = base + o;
      if (stepOk(a.x, a.z, Math.sin(ang), Math.cos(ang), ahead)) return ang;
    }
    return null;
  }
  const turnTo = (a, ang, rate, dt) => {
    let d = ang - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.yaw += clamp(d, -rate * dt, rate * dt);
  };

  function update(dt, t) {
    // herd-level awareness
    let dmin = 1e9, cx = 0, cz = 0;
    for (let i = 0; i < n; i++) { const a = A[i]; dmin = Math.min(dmin, Math.hypot(cam.x - a.x, cam.z - a.z)); cx += a.x; cz += a.z; }
    cx /= n; cz /= n; herd.x = cx; herd.z = cz;
    if (herd.mode !== 'flee') {
      if (dmin < 14) {
        herd.mode = 'flee';
        for (const a of A) {
          const dx = a.x - cam.x, dz = a.z - cam.z, l = Math.hypot(dx, dz) || 1;
          const ang = Math.atan2(dx / l, dz / l) + a.off * 1.2;
          a.fx = Math.sin(ang); a.fz = Math.cos(ang); a.flee = 38 + rng() * 6; a.state = 'flee'; a.delayT = a.delay * 0.4;
        }
      } else if (dmin < 25) { herd.mode = 'alert'; herd.calmT = 0; }
      else if (herd.mode === 'alert') { herd.calmT += dt; if (herd.calmT > 4) { herd.mode = 'graze'; for (const a of A) { a.state = 'graze'; a.timer = 2 + rng() * 5; } } }
    } else {
      let moving = false; for (const a of A) if (a.state === 'flee') moving = true;
      if (!moving) { herd.mode = 'graze'; for (const a of A) { a.state = 'graze'; a.timer = 3 + rng() * 6; } }
    }

    for (let i = 0; i < n; i++) {
      const a = A[i];
      let goalSpeed = 0, gaitStride = 1.3;
      const pdx = cam.x - a.x, pdz = cam.z - a.z;
      if (a.state === 'flee') {
        if (a.delayT > 0) { a.delayT -= dt; a.liftGoal = 1; }
        else {
          const ang = steer(a, a.fx, a.fz, 4);
          if (ang === null) a.flee = 0;
          else { a.fx = Math.sin(ang); a.fz = Math.cos(ang); turnTo(a, ang, 4, dt); goalSpeed = 6.8; gaitStride = 3.6; a.liftGoal = 0.55; }
          if (goalSpeed > 0) a.flee -= a.speed * dt;
          if (a.flee <= 0) { a.state = 'settle'; a.timer = 3 + rng() * 3; }
        }
      } else if (herd.mode === 'alert') {
        // all watch the player, heads up
        a.liftGoal = 1;
        turnTo(a, Math.atan2(pdx, pdz) + a.off, 2.2, dt);
      } else if (a.state === 'settle') {
        a.timer -= dt; a.liftGoal = a.timer > 1.5 ? 0.9 : 0.3;
        if (a.timer <= 0) { a.state = 'graze'; a.timer = 1 + rng() * 4; }
      } else if (a.state === 'graze') {
        a.liftGoal = 0; a.perk -= dt;
        if (a.perk <= 0) { a.perk = 7 + rng() * 16; a.state = 'perk'; a.timer = 1.2 + rng() * 1.6; }
        a.timer -= dt;
        if (a.timer <= 0) {
          // amble a few metres, kept near the herd's home
          const hx = HX - a.x, hz = HZ - a.z, hl = Math.hypot(hx, hz);
          const bias = clamp((hl - 8) / 10, 0, 1);
          const ang0 = rng() * 6.28;
          const dx = lerp(Math.sin(ang0), hx / (hl || 1), bias), dz = lerp(Math.cos(ang0), hz / (hl || 1), bias);
          const ang = steer(a, dx, dz, 4);
          if (ang !== null) { a.wx = a.x + Math.sin(ang) * (2 + rng() * 3.5); a.wz = a.z + Math.cos(ang) * (2 + rng() * 3.5); a.state = 'amble'; }
          else a.timer = 2;
        }
      } else if (a.state === 'amble') {
        a.liftGoal = 0.25;
        const dx = a.wx - a.x, dz = a.wz - a.z, d = Math.hypot(dx, dz);
        const ang = steer(a, dx, dz, 1.5);
        if (d < 0.5 || ang === null) { a.state = 'graze'; a.timer = 3 + rng() * 8; }
        else { turnTo(a, ang, 1.2, dt); goalSpeed = 0.75; gaitStride = 1.1; }
      } else if (a.state === 'perk') {
        a.liftGoal = 1; a.timer -= dt;
        if (a.timer <= 0) { a.state = 'graze'; a.timer = 1 + rng() * 3; }
      }

      a.speed += (goalSpeed - a.speed) * Math.min(1, dt * (goalSpeed > 3 ? 4 : 3));
      if (a.speed > 0.02) {
        a.x += Math.sin(a.yaw) * a.speed * dt; a.z += Math.cos(a.yaw) * a.speed * dt;
        a.gait += (a.speed / gaitStride) * Math.PI * 2 * dt;
      }
      const lg = a.liftGoal > a.lift ? 5 : 2.2;
      a.lift += (a.liftGoal - a.lift) * Math.min(1, dt * lg);

      // pose
      const gy = terrain.heightAt(a.x, a.z);
      const sy = Math.sin(a.yaw), cy = Math.cos(a.yaw);
      const hF = terrain.heightAt(a.x + sy * 0.8, a.z + cy * 0.8), hB = terrain.heightAt(a.x - sy * 0.8, a.z - cy * 0.8);
      const tilt = -Math.atan2(hF - hB, 1.6);
      a.pitch += (tilt - a.pitch) * Math.min(1, dt * 6);
      const fast = clamp(a.speed / 6.5, 0, 1);
      const bob = 0.1 * fast * Math.abs(Math.sin(a.gait)) + 0.015 * clamp(a.speed, 0, 1) * Math.sin(a.gait * 2);
      T.makeTranslation(a.x, gy + bob, a.z);
      R.makeRotationY(a.yaw);
      M.multiplyMatrices(T, R);
      R.makeRotationX(a.pitch);
      M.multiply(R);
      bodies.setMatrixAt(i, M);

      // head: grazing head hangs to the grass; alert head high and still
      const nib = (1 - a.lift) * (0.03 * Math.sin(t * 2.3 + i * 3) * Math.max(0, Math.sin(t * 0.37 + i * 5)));
      const headPitch = lerp(1.32, -0.5, a.lift) + nib + 0.04 * Math.sin(a.gait) * fast;
      T.makeTranslation(SHOULDER[0], SHOULDER[1], SHOULDER[2]);
      R.makeRotationX(headPitch);
      Mh.multiplyMatrices(M, T).multiply(R);
      // a slow listening turn of the head when alert
      if (a.lift > 0.7) { R.makeRotationY(0.1 * Math.sin(t * 0.7 + i * 2)); Mh.multiply(R); }
      heads.setMatrixAt(i, Mh);

      // legs, diagonal gait
      const amp = Math.min(1, a.speed / 0.4) * (0.2 + 0.4 * fast);
      for (let k = 0; k < 4; k++) {
        const front = k < 2, right = k % 2;
        const ph = a.gait + ((front ? 0 : Math.PI) + (right ? Math.PI : 0)); // FL,FR opposite; BL opposite of FL (diagonals pair)
        const swing = amp * Math.sin(ph);
        const bend = amp * 1.9 * Math.max(0, -Math.cos(ph)) + 0.02;
        T.makeTranslation((right ? -LEG_X : LEG_X), HIP_Y, front ? FRONT_Z : BACK_Z);
        R.makeRotationX(swing);
        Mu.multiplyMatrices(M, T).multiply(R);
        uppers.setMatrixAt(i * 4 + k, Mu);
        T.makeTranslation(0, -UP_LEN, 0);
        R.makeRotationX(bend + (front ? 0 : -0.12));
        Ml.multiplyMatrices(Mu, T).multiply(R);
        lowers.setMatrixAt(i * 4 + k, Ml);
      }
    }
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = uppers.instanceMatrix.needsUpdate = lowers.instanceMatrix.needsUpdate = true;
  }
  for (const m of [bodies, heads, uppers, lowers]) m.count = n;
  ctx.registerUpdate(update);
}
