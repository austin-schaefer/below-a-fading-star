// Grazers: small herds of stilt-legged, grey, antlered beasts, each pinned to a landmark (opts.home): one on the
// moor south of the keep above the fen's rim, one grazing the edge of Medlar Close. They amble back toward home
// after they bolt, so meeting them tells you where you are.
// Four instanced meshes (bodies, heads+antlers, upper legs, lower legs); poses are composed per frame from matrices.
// They keep out of the colliders (v7.1): every heading they take is tested against them, a step into one slides
// along it, and a bolting herd follows its leader's turn off a wall. tools/grazers-test.mjs drives them.
import * as THREE from 'three';
import { Mesher, clamp, lerp } from './geo.js';
import { hyp } from '../noise.js';

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
  const uppers = mk(legGeometry(UP_LEN, 0.065, 0.04), N * 4), lowers = mk(legGeometry(LO_LEN, 0.038, 0.022), N * 4);
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    col.setHSL(0.06, 0.12, 0.66 + rng() * 0.2); // a warm grey, the low sun's rust in the flank (v7.1)
    for (const m of [bodies, heads]) m.setColorAt(i, col);
    for (let k = 0; k < 4; k++) { uppers.setColorAt(i * 4 + k, col); lowers.setColorAt(i * 4 + k, col); }
  }

  const slopeLimit = 0.7;
  // terrain.slopeAt's own sums with a scratch normal (slopeAt allocates a Vector3 per call; this runs per frame)
  const nTmp = new THREE.Vector3();
  const slopeAt = (x, z) => Math.acos(clamp(terrain.normalAt(x, z, nTmp).y, -1, 1));
  // v7.1: the colliders (the list controls.js reads), bucketed once into an 8 m grid over the bowl with each circle
  // grown by the body's radius; built at the first update, after every module has registered its own, and again
  // only if the list's length changes. Capped colliders count where the grazer's ground is within their height.
  const CL = ctx.controls?.state?.colliders || [];
  const walkLimit = ctx.mountains?.walkLimit;
  const BODY = 0.6, CELL = 8, G0 = -320, GN = 80;
  let gridLen = -1, cellStart = null, cellIdx = null;
  function buildGrid() {
    gridLen = CL.length;
    const counts = new Int32Array(GN * GN + 1);
    const span = (c, f) => {
      const r = c.r + BODY;
      const i0 = Math.max(0, Math.floor((c.x - r - G0) / CELL)), i1 = Math.min(GN - 1, Math.floor((c.x + r - G0) / CELL));
      const j0 = Math.max(0, Math.floor((c.z - r - G0) / CELL)), j1 = Math.min(GN - 1, Math.floor((c.z + r - G0) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(j * GN + i);
    };
    for (const c of CL) span(c, (k) => counts[k + 1]++);
    for (let k = 1; k <= GN * GN; k++) counts[k] += counts[k - 1];
    cellStart = counts.slice();
    cellIdx = new Int32Array(counts[GN * GN]);
    const fill = counts.slice(0, GN * GN);
    CL.forEach((c, ci) => span(c, (k) => { cellIdx[fill[k]++] = ci; }));
  }
  // the collider (index) whose circle, grown by pad, holds (x, z), or -1; the ground's y is read only for a capped one
  const hitAt = (x, z, pad) => {
    if (cellStart === null) return -1;
    const i = Math.floor((x - G0) / CELL), j = Math.floor((z - G0) / CELL);
    if (i < 0 || j < 0 || i >= GN || j >= GN) return -1;
    const k = j * GN + i;
    for (let q = cellStart[k], e = cellStart[k + 1]; q < e; q++) {
      const c = CL[cellIdx[q]], r = c.r + pad, dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz >= r * r) continue;
      if (c.h !== undefined) { const gy = terrain.heightAt(x, z); if (gy > c.y + c.h || gy < c.y - 0.5) continue; }
      return cellIdx[q];
    }
    return -1;
  };
  const blocked = (x, z, pad) => hitAt(x, z, pad) >= 0;
  const valid = (x, z) => {
    if (Math.hypot(x, z) > 280) return false;
    if (walkLimit && x * x + z * z > 240 * 240 && hyp(x, z) > walkLimit(x, z) - 2) return false;
    if (blocked(x, z, BODY)) return false;
    const K = ctx.landmarks.castle;
    if (Math.hypot(x - K.x, z - K.z) < 40) return false; // not under the keep's walls
    if (terrain.causewayDistance(x, z) < 5.5) return false;
    const wl = terrain.waterLevelAt(x, z);
    if (wl !== null && terrain.heightAt(x, z) < wl + 1.2) return false;
    if (slopeAt(x, z) > slopeLimit) return false;
    return true;
  };

  const [HX, HZ] = opts.home ?? [22, 78];
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
  // the herd's own hook (v7.1): update(dt, t) steps it once, so tools/grazers-test.mjs can run it accelerated
  const entry = { animals: A, herd, home: [HX, HZ], update: (dt, t) => update(dt, t) };
  (ctx.herds = ctx.herds || []).push(entry);
  ctx.grazers = ctx.grazers || entry;

  const M = new THREE.Matrix4(), Mh = new THREE.Matrix4(), Mu = new THREE.Matrix4(), Ml = new THREE.Matrix4(), T = new THREE.Matrix4(), R = new THREE.Matrix4();
  const cam = camera.position;
  const stepOk = (x, z, dx, dz, ahead) => valid(x + dx * ahead, z + dz * ahead) && !blocked(x + dx * 1.2, z + dz * 1.2, BODY) && !blocked(x + dx * ahead * 0.5, z + dz * ahead * 0.5, BODY);
  // headings tried around the wanted one: straight, then ±23°, ±45°, ±75°, ±90°, ±110°
  const OFFS = [0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3, Math.PI / 2, -Math.PI / 2, 1.9, -1.9];
  let lastOff = 0;

  function steer(a, hx, hz, ahead) {
    // returns a heading (angle) near the desired one that is valid ahead, or null
    const base = Math.atan2(hx, hz);
    for (let k = 0; k < OFFS.length; k++) {
      const ang = base + OFFS[k];
      if (stepOk(a.x, a.z, Math.sin(ang), Math.cos(ang), ahead)) { lastOff = OFFS[k]; return ang; }
    }
    return null;
  }
  const turnTo = (a, ang, rate, dt) => {
    let d = ang - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.yaw += clamp(d, -rate * dt, rate * dt);
  };

  function update(dt, t) {
    if (gridLen !== CL.length) {
      buildGrid();
      for (let i = 0; i < n; i++) {
        const a = A[i];
        for (let k = 0; k < 4; k++) {
          const ci = hitAt(a.x, a.z, BODY);
          if (ci < 0) break;
          const c = CL[ci], dx = a.x - c.x, dz = a.z - c.z, d = hyp(dx, dz) || 1, r = c.r + BODY + 0.05;
          a.x = c.x + (dx / d) * r; a.z = c.z + (dz / d) * r;
        }
        a.wx = a.x; a.wz = a.z;
      }
    }
    // herd-level awareness
    let dmin = 1e9, cx = 0, cz = 0;
    for (let i = 0; i < n; i++) { const a = A[i]; dmin = Math.min(dmin, hyp(cam.x - a.x, cam.z - a.z)); cx += a.x; cz += a.z; }
    cx /= n; cz /= n; herd.x = cx; herd.z = cz;
    if (herd.mode !== 'flee') {
      if (dmin < 14) {
        herd.mode = 'flee';
        for (const a of A) {
          const dx = a.x - cam.x, dz = a.z - cam.z, l = hyp(dx, dz) || 1;
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
          else {
            a.fx = Math.sin(ang); a.fz = Math.cos(ang); turnTo(a, ang, 4, dt); goalSpeed = 6.8; gaitStride = 3.6; a.liftGoal = 0.55;
            // the leader (the first) turned off its line by a wall: the rest of the bolting herd takes its new line
            if (i === 0 && lastOff !== 0) {
              for (let j = 1; j < n; j++) {
                const b = A[j];
                if (b.state !== 'flee') continue;
                const bang = ang + b.off * 0.6;
                b.fx = Math.sin(bang); b.fz = Math.cos(bang);
              }
            }
          }
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
          const hx = HX - a.x, hz = HZ - a.z, hl = hyp(hx, hz);
          const bias = clamp((hl - 8) / 10, 0, 1);
          const ang0 = rng() * 6.28;
          const dx = lerp(Math.sin(ang0), hx / (hl || 1), bias), dz = lerp(Math.cos(ang0), hz / (hl || 1), bias);
          const ang = steer(a, dx, dz, 4);
          if (ang !== null) { a.wx = a.x + Math.sin(ang) * (2 + rng() * 3.5); a.wz = a.z + Math.cos(ang) * (2 + rng() * 3.5); a.state = 'amble'; }
          else a.timer = 2;
        }
      } else if (a.state === 'amble') {
        a.liftGoal = 0.25;
        const dx = a.wx - a.x, dz = a.wz - a.z, d = hyp(dx, dz);
        const ang = steer(a, dx, dz, 1.5);
        if (d < 0.5 || ang === null) { a.state = 'graze'; a.timer = 3 + rng() * 8; }
        else { turnTo(a, ang, 1.2, dt); goalSpeed = 0.75; gaitStride = 1.1; }
      } else if (a.state === 'perk') {
        a.liftGoal = 1; a.timer -= dt;
        if (a.timer <= 0) { a.state = 'graze'; a.timer = 1 + rng() * 3; }
      }

      a.speed += (goalSpeed - a.speed) * Math.min(1, dt * (goalSpeed > 3 ? 4 : 3));
      if (a.speed > 0.02) {
        let nx = a.x + Math.sin(a.yaw) * a.speed * dt, nz = a.z + Math.cos(a.yaw) * a.speed * dt;
        const ci = hitAt(nx, nz, BODY);
        if (ci >= 0) {
          // slide: out to the grown circle's edge along the line from its centre, kept only if that is clear too
          const c = CL[ci], dx = nx - c.x, dz = nz - c.z, d = hyp(dx, dz) || 1, r = c.r + BODY + 0.01;
          nx = c.x + (dx / d) * r; nz = c.z + (dz / d) * r;
          if (hitAt(nx, nz, BODY) >= 0) { nx = a.x; nz = a.z; a.speed *= 0.5; }
        }
        a.x = nx; a.z = nz;
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
  bodies.count = heads.count = n; uppers.count = lowers.count = n * 4;
  ctx.registerUpdate(update, { at: () => herd, near: 120, hz: 5 }); // v3: beyond 120 m the herd steps at 5 Hz
}
