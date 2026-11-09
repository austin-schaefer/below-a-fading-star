// Small life: moths at the tower window, crows on the keep, rings of fish rising on the tarn.
import * as THREE from 'three';
import { Mesher, flapMaterial, flapInstanced, clamp, lerp, smoothstep, makeDownCaster } from './geo.js';
import { KEEP } from '../structures/keep.js';
import { hyp } from '../noise.js';

// ---------------------------------------------------------------- moths
export function buildMoths(ctx) {
  const { scene, terrain, landmarks } = ctx;
  const rng = ctx.makeRng(404);
  const N = 9;
  const g = new THREE.BufferGeometry();
  // two wings as a bowtie of triangles, lying in the xz plane, body along z
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, 1, 0, 0.9, 1.1, 0, -0.5, 0, 0, 0.5, -1, 0, 0.9, -1.1, 0, -0.5, 0, 0, 0.5, 0, 0, -0.5, 0.0, 0.2, 0], 3));
  g.setIndex([0, 1, 2, 3, 5, 4]);
  const mat = new THREE.MeshBasicMaterial({ color: 0xe8d2a8, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(g, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.name = 'moths';
  scene.add(mesh);
  const tower = landmarks.tower;
  const centre = new THREE.Vector3(tower.x, terrain.heightAt(tower.x, tower.z) + 22, tower.z);
  let found = false, lookT = 0;
  const m = Array.from({ length: N }, () => ({ a: rng() * 6.28, w: 1.6 + rng() * 2.2, r: 0.9 + rng() * 1.6, p1: rng() * 6.28, p2: rng() * 6.28, y: rng() * 6.28, sz: 0.05 + rng() * 0.03 }));
  const cam = ctx.camera.position;
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), prev = new THREE.Vector3(), eul = new THREE.Euler(), up = new THREE.Vector3(0, 1, 0), vel = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  function findWindow() {
    // the structures module's lit window: a PointLight near the tower top
    scene.traverse((o) => {
      if (o.isPointLight) {
        o.getWorldPosition(tmpV);
        if (Math.hypot(tmpV.x - tower.x, tmpV.z - tower.z) < 14 && tmpV.y > centre.y - 14) { centre.copy(tmpV); found = true; }
      }
    });
  }
  const pts = m.map(() => new THREE.Vector3());
  function update(dt, t) {
    if (!found) { lookT -= dt; if (lookT <= 0) { lookT = 1.5; findWindow(); } }
    const far = hyp(cam.x - centre.x, cam.z - centre.z) > 260;
    mesh.visible = !far;
    if (far) return;
    for (let i = 0; i < N; i++) {
      const o = m[i];
      o.a += dt * o.w * (0.7 + 0.5 * Math.sin(t * 0.9 + o.p1));
      const r = o.r * (0.6 + 0.5 * Math.sin(t * 0.31 + o.p2)) + 0.4 * Math.sin(t * 2.3 + o.p1);
      prev.copy(pts[i]);
      pos.set(centre.x + Math.cos(o.a) * r + 0.3 * Math.sin(t * 5 + o.p1), centre.y + Math.sin(t * 0.7 + o.p2) * 1.1 + 0.25 * Math.sin(t * 4.1 + o.p1), centre.z + Math.sin(o.a) * r);
      pts[i].copy(pos);
      vel.subVectors(pos, prev);
      const yaw = vel.lengthSq() > 1e-8 ? Math.atan2(vel.x, vel.z) : o.y;
      o.y = yaw;
      eul.set(0.2, yaw, 0); q.setFromEuler(eul);
      const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 38 + i * 2.1));
      sc.set(o.sz * flap, o.sz, o.sz);
      M4.compose(pos, q, sc);
      mesh.setMatrixAt(i, M4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  ctx.registerUpdate(update, { pos: centre, near: 120, hz: 5 }); // v3: 5 Hz beyond 120 m
}

// ---------------------------------------------------------------- crows
// Perches are the broken donjon top and points along the curtain wall, laid out from the keep's own plan
// (KEEP). Their heights start as estimates and are snapped onto the real masonry by a downward ray once the
// structures module has built the keep; candidates where the wall has fallen are dropped.
const PERCH_CANDIDATES = (() => {
  const P = [], K = KEEP, D = K.donjon, rMid = (D.rOut + D.rIn) / 2;
  for (let k = 0; k < 12; k++) { const a = k * (Math.PI * 2 / 12) + 0.2; P.push([D.x + Math.cos(a) * rMid, 18 + 15.5, D.z + Math.sin(a) * rMid]); }
  const R = K.apothem / Math.cos(Math.PI / 6), V = [];
  for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; V.push([K.cx + Math.cos(a) * R, K.cz + Math.sin(a) * R]); }
  for (let k = 0; k < 6; k++) {
    if (k === 2) continue; // the gate side
    const a = V[k], b = V[(k + 1) % 6], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 4.5; t < L - 4; t += 5.5) P.push([a[0] + (b[0] - a[0]) * t / L, 18 + 5, a[1] + (b[1] - a[1]) * t / L]);
  }
  return P;
})();
const PERCHES = PERCH_CANDIDATES.slice(0, 8).concat(PERCH_CANDIDATES.slice(12, 22)).map((p) => p.slice());
// Snap perches onto the keep mesh: returns true once done (or once it is clear there is no keep to sit on).
function snapPerches(scene, terrain) {
  const keep = scene.getObjectByName('structures-keep');
  if (!keep) return false;
  const cast = makeDownCaster([keep]); // binned, not a Raycaster over every triangle (geo.js)
  const good = { donjon: [], wall: [] };
  PERCH_CANDIDATES.forEach((p, i) => {
    const hitY = cast(p[0], p[2], 80, 120);
    // the turf at the foot of the wall: the higher of the courtyard side and the wall line itself
    const gy = Math.max(terrain.heightAt(p[0], p[2]), terrain.heightAt(p[0] + (KEEP.cx - p[0]) * 0.1, p[2] + (KEEP.cz - p[2]) * 0.1));
    // a wall top well above the turf: a perch; anything lower is rubble or a fallen stretch
    if (hitY !== null && hitY > gy + (i < 12 ? 8 : 2.5)) (i < 12 ? good.donjon : good.wall).push([p[0], hitY, p[2]]);
  });
  const list = good.donjon.slice(0, 8).concat(good.wall.slice(0, 10));
  if (list.length >= 6) { PERCHES.length = 0; PERCHES.push(...list); }
  return true;
}

export function crowGeometry() {
  const M = new Mesher();
  const W = (x) => clamp((Math.abs(x) - 0.03) / 0.55, 0, 1);
  M.loft([[0, 0.02, -0.2], [0, 0.03, 0], [0, 0.05, 0.14]], [[0.03, 0.035], [0.065, 0.07], [0.05, 0.055]], 6);
  M.blob(0, 0.085, 0.2, 0.04, 0.042, 0.055, 6, 4);
  M.loft([[0, 0.085, 0.24], [0, 0.078, 0.33]], [[0.022, 0.018], [0.004, 0.004]], 4);
  const a = M.v(0, 0.02, -0.15), b = M.v(0.06, 0.0, -0.42), c = M.v(0, 0.0, -0.36), d = M.v(-0.06, 0.0, -0.42);
  M.tri(a, c, b); M.tri(a, d, c);
  for (const s of [1, -1]) {
    const L = [[0.04 * s, 0.07, 0.12], [0.2 * s, 0.1, 0.1], [0.4 * s, 0.08, 0.0], [0.55 * s, 0.01, -0.14]];
    const T = [[0.06 * s, 0.04, -0.2], [0.22 * s, 0.03, -0.3], [0.38 * s, 0.01, -0.22], [0.56 * s, -0.03, -0.34]];
    M.strip(L, T, 2, 0.03, (x) => W(x), s < 0);
  }
  return M.geometry();
}

export function buildCrows(ctx) {
  const { scene, terrain } = ctx;
  const rng = ctx.makeRng(505);
  const N = 7;
  const mat = flapMaterial({ color: 0x0a090c, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide });
  const { mesh, flap, fold } = flapInstanced(crowGeometry(), mat, N);
  mesh.name = 'crows';
  scene.add(mesh);
  const used = new Set();
  const cam = ctx.camera.position;
  const crows = [];
  const pick = (avoidPlayer) => {
    for (let tries = 0; tries < 40; tries++) {
      const k = (rng() * PERCHES.length) | 0;
      if (used.has(k)) continue;
      if (avoidPlayer && Math.hypot(PERCHES[k][0] - cam.x, PERCHES[k][2] - cam.z) < 18) continue;
      return k;
    }
    return -1;
  };
  for (let i = 0; i < N; i++) {
    const k = i < 5 ? i : pick(false);
    used.add(k);
    crows.push({
      perch: k, mode: 0, delay: 0, u: 0, dur: 7, yaw: rng() * 6.28, pos: new THREE.Vector3(...PERCHES[k]), p0: new THREE.Vector3(), p1: new THREE.Vector3(), c: new THREE.Vector3(),
      fl: 0, flPhase: rng() * 6, foldV: 1, glideAt: 0.4 + rng() * 0.2, hop: rng() * 20, roll: 0,
    });
  }
  const up = new THREE.Vector3(0, 1, 0), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), tan = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), mr = new THREE.Matrix4();
  let cooldown = 3;
  function takeoff() {
    ctx.audio?.cue?.('crows', crows.reduce((b, o) => (hyp(o.pos.x - cam.x, o.pos.z - cam.z) < hyp(b.pos.x - cam.x, b.pos.z - cam.z) ? o : b)).pos); // v7.2-03: from the nearest bird
    cooldown = 8;
    for (const o of crows) {
      const k = pick(true);
      if (k < 0) continue;
      used.delete(o.perch); used.add(k);
      o.perch = k; o.mode = 1; o.u = 0; o.delay = rng() * 0.8; o.dur = 6 + rng() * 4;
      o.p0.copy(o.pos); o.p1.set(...PERCHES[k]);
      const dx = o.p0.x - cam.x, dz = o.p0.z - cam.z, dl = Math.hypot(dx, dz) || 1;
      const side = rng() < 0.5 ? -1 : 1;
      o.c.set((o.p0.x + o.p1.x) / 2 + dx / dl * (6 + rng() * 10) + (-dz / dl) * side * 12, Math.max(o.p0.y, o.p1.y) + 10 + rng() * 14, (o.p0.z + o.p1.z) / 2 + dz / dl * (6 + rng() * 10) + (dx / dl) * side * 12);
    }
  }
  ctx.crows = { takeoff, perches: PERCHES };
  let snapped = false, snapT = 0;
  function update(dt, t) {
    if (!snapped && (snapT -= dt) <= 0) {
      snapT = 1;
      snapped = snapPerches(ctx.scene, ctx.terrain);
      if (snapped) for (const o of crows) { if (o.perch >= PERCHES.length) o.perch = o.perch % PERCHES.length; if (o.mode === 0) o.pos.set(...PERCHES[o.perch]); }
    }
    cooldown -= dt;
    if (cooldown <= 0) {
      for (const o of crows) if (o.mode === 0 && hyp(o.pos.x - cam.x, o.pos.z - cam.z) < 15 && Math.abs(o.pos.y - cam.y) < 25) { takeoff(); break; }
    }
    for (let i = 0; i < N; i++) {
      const o = crows[i];
      if (o.mode === 1) {
        if (o.delay > 0) { o.delay -= dt; }
        else {
          o.u = Math.min(1, o.u + dt / o.dur);
          const u = o.u, v = lerp(u, u * u * (3 - 2 * u), 0.55), w = 1 - v;
          o.pos.set(w * w * o.p0.x + 2 * w * v * o.c.x + v * v * o.p1.x, w * w * o.p0.y + 2 * w * v * o.c.y + v * v * o.p1.y, w * w * o.p0.z + 2 * w * v * o.c.z + v * v * o.p1.z);
          tan.set(2 * w * (o.c.x - o.p0.x) + 2 * v * (o.p1.x - o.c.x), 2 * w * (o.c.y - o.p0.y) + 2 * v * (o.p1.y - o.c.y), 2 * w * (o.c.z - o.p0.z) + 2 * v * (o.p1.z - o.c.z));
          if (tan.lengthSq() > 1e-6) { tan.normalize(); o.yaw = Math.atan2(tan.x, tan.z); }
          const gliding = u > o.glideAt && u < o.glideAt + 0.14;
          o.fl += ((gliding ? 0 : 1) - o.fl) * Math.min(1, dt * 6);
          o.flPhase += dt * Math.PI * 2 * (7 + 3 * o.fl);
          o.foldV += ((u > 0.96 ? 1 : 0) - o.foldV) * Math.min(1, dt * 8);
          if (o.u >= 1) { o.mode = 0; o.pos.copy(o.p1); o.foldV = 1; }
        }
        if (o.delay > 0) { /* still perched, wings opening */ o.foldV += (0.3 - o.foldV) * Math.min(1, dt * 10); }
      }
      let fl;
      if (o.mode === 1 && o.delay <= 0) fl = lerp(0.05, 0.1 + 0.95 * Math.sin(o.flPhase), o.fl);
      else fl = -0.25;
      flap.array[i] = fl; fold.array[i] = o.mode === 0 ? 1 : o.foldV;
      // orientation: heading yaw, slight pitch from climb
      if (o.mode === 1 && o.delay <= 0) { bz.copy(tan); } else bz.set(Math.sin(o.yaw), 0, Math.cos(o.yaw));
      bx.crossVectors(up, bz).normalize(); by.crossVectors(bz, bx);
      m4.makeBasis(bx, by, bz);
      m4.setPosition(o.pos.x, o.pos.y + (o.mode === 0 ? 0.05 : 0), o.pos.z);
      mesh.setMatrixAt(i, m4);
      // idle: perched crows turn their heads/bodies now and then
      if (o.mode === 0) { o.hop -= dt; if (o.hop <= 0) { o.hop = 6 + rng() * 18; o.yaw += (rng() - 0.5) * 1.6; } }
    }
    mesh.instanceMatrix.needsUpdate = true; flap.needsUpdate = true; fold.needsUpdate = true;
  }
  ctx.registerUpdate(update, { pos: { x: KEEP.cx, z: KEEP.cz }, near: 120, hz: 5 }); // v3: 5 Hz beyond 120 m
}

// ---------------------------------------------------------------- fish rings on the tarn
export function buildFishRings(ctx) {
  const { scene, terrain, water } = ctx;
  const rng = ctx.makeRng(606);
  const NR = 12;
  const geo = new THREE.RingGeometry(0.9, 1.0, 40, 1); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, NR);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.name = 'fishrings';
  // the per-ring colour exists from the start, so its program is compiled behind the title card with the rest
  mesh.setColorAt(0, new THREE.Color(0, 0, 0)); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  const base = new THREE.Color(0x9a90a8), col = new THREE.Color();
  scene.add(mesh);
  const y = water.tarn.y + 0.05;
  const rings = Array.from({ length: NR }, () => ({ on: false, age: 0, delay: 0, x: 0, z: 0, dur: 3.2, max: 2 }));
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const cam = ctx.camera.position, fwd = new THREE.Vector3();
  let next = 2.5 + rng() * 3, cursor = 0;
  const tp = new THREE.Vector3();
  function spawn(x, z) {
    const count = 3;
    for (let k = 0; k < count; k++) {
      const r = rings[cursor++ % NR];
      r.on = true; r.age = 0; r.delay = k * 0.45; r.x = x; r.z = z; r.dur = 3.4 - k * 0.3; r.max = 3.6 + k * 0.8;
    }
    tp.set(x, y, z);
    ctx.audio?.cue?.('plop', tp);
  }
  ctx.fauna = Object.assign(ctx.fauna || {}, { fishRing: spawn });
  function update(dt, t) {
    next -= dt;
    if (next <= 0) {
      next = 5 + rng() * 8;
      {
        ctx.camera.getWorldDirection(fwd);
        let best = null, bs = -9;
        const T = ctx.landmarks.tarn;
        for (let k = 0; k < 10; k++) {
          const a = rng() * 6.28, r = 6 + rng() * 40, x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r;
          if (terrain.heightAt(x, z) > y - 0.8) continue;
          const dx = x - cam.x, dz = z - cam.z, d = hyp(dx, dz);
          const s = (fwd.x * dx + fwd.z * dz) / (d || 1) - d * 0.003;
          if (s > bs) { bs = s; best = [x, z]; }
        }
        if (best) spawn(best[0], best[1]);
      }
    }
    for (let i = 0; i < NR; i++) {
      const r = rings[i];
      if (!r.on) { sc.set(0, 0, 0); pos.set(0, -50, 0); M4.compose(pos, q, sc); mesh.setMatrixAt(i, M4); continue; }
      if (r.delay > 0) { r.delay -= dt; sc.set(0, 0, 0); pos.set(r.x, y, r.z); M4.compose(pos, q, sc); mesh.setMatrixAt(i, M4); mesh.setColorAt(i, col.setRGB(0, 0, 0)); continue; }
      r.age += dt;
      const u = r.age / r.dur;
      if (u >= 1) { r.on = false; continue; }
      const s = 0.1 + r.max * (1 - Math.pow(1 - u, 2.2));
      const fade = Math.pow(1 - u, 1.3) * smoothstep(0, 0.06, u) * 1.6;
      sc.set(s, 1, s); pos.set(r.x, y, r.z); M4.compose(pos, q, sc);
      mesh.setMatrixAt(i, M4);
      mesh.setColorAt(i, col.copy(base).multiplyScalar(fade));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  ctx.registerUpdate(update);
}
