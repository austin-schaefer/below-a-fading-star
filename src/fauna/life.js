// More life: birds that flush from the grass, bats round the keep and tower, a wader in the fen, an eel-back in the tarn.
import * as THREE from 'three';
import { Mesher, flapMaterial, flapInstanced, clamp, lerp, smoothstep } from './geo.js';
import { crowGeometry } from './small.js';

const up = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------- flushed birds
export function buildFlush(ctx) {
  const { scene, terrain, camera, player } = ctx;
  const rng = ctx.makeRng(707);
  const N = ctx.quality === 'low' ? 4 : 6;
  const mat = flapMaterial({ color: 0x0d0b0c, roughness: 0.8, side: THREE.DoubleSide });
  const { mesh, flap, fold } = flapInstanced(crowGeometry(), mat, N);
  mesh.name = 'flush'; mesh.visible = false; scene.add(mesh);
  const B = Array.from({ length: N }, () => ({ pos: new THREE.Vector3(), p0: new THREE.Vector3(), p1: new THREE.Vector3(), c: new THREE.Vector3(), u: 1, dur: 3, delay: 0, yaw: 0, ph: rng() * 6, sc: 0.5 + rng() * 0.2, tan: new THREE.Vector3(0, 0, 1) }));
  let mode = 0, cool = 6, hideT = 0; // 0 idle, 1 flying/sitting
  const cam = camera.position, fwd = new THREE.Vector3();
  const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const okSpot = (x, z) => {
    const b = terrain.biomeAt(x, z);
    return b.moor + b.heath > 0.5 && b.wood < 0.4 && b.marsh < 0.3 && terrain.waterLevelAt(x, z) === null && terrain.causewayDistance(x, z) > 4 && b.slope < 0.5;
  };
  function flush() {
    camera.getWorldDirection(fwd);
    for (let tries = 0; tries < 12; tries++) {
      const a = Math.atan2(-fwd.x, -fwd.z) + (rng() - 0.5) * 1.2, d = 5 + rng() * 4;
      const x = cam.x - Math.sin(a) * d, z = cam.z - Math.cos(a) * d;
      if (!okSpot(x, z)) continue;
      const gy = terrain.heightAt(x, z);
      // landing 30 m off, roughly away from the player
      const la = Math.atan2(x - cam.x, z - cam.z) + (rng() - 0.5) * 1.4;
      for (let k = 0; k < N; k++) {
        const o = B[k];
        o.p0.set(x + (rng() - 0.5) * 2, gy + 0.1, z + (rng() - 0.5) * 2);
        const sd = 26 + rng() * 10, sa = la + (rng() - 0.5) * 0.8, lx = x + Math.sin(sa) * sd, lz = z + Math.cos(sa) * sd;
        o.p1.set(lx, terrain.heightAt(lx, lz) + 0.1, lz);
        o.c.set((o.p0.x + lx) / 2 + (rng() - 0.5) * 12, gy + 4 + rng() * 5, (o.p0.z + lz) / 2 + (rng() - 0.5) * 12);
        o.u = 0; o.dur = 2.6 + rng() * 1.4; o.delay = rng() * 0.35; o.pos.copy(o.p0);
      }
      mesh.visible = true; mode = 1; hideT = 0; cool = 14 + rng() * 10;
      ctx.audio?.cue?.('flush', B[0].p0);
      return;
    }
    cool = 3;
  }
  ctx.fauna = Object.assign(ctx.fauna || {}, { flushBirds: flush });
  function update(dt) {
    cool -= dt;
    if (cool <= 0 && player.speed > 1.2 && player.onGround) flush();
    if (mode === 0) return;
    let allDown = true;
    for (let i = 0; i < N; i++) {
      const o = B[i];
      let fl = -0.2, fd = 1;
      if (o.delay > 0) { o.delay -= dt; allDown = false; } else if (o.u < 1) {
        allDown = false;
        o.u = Math.min(1, o.u + dt / o.dur);
        const u = o.u, v = 1 - (1 - u) * (1 - u) * 0.5 - 0.5 * (1 - u) * (1 - u) * (1 - u) * 0 , w = 1 - u;
        const s = u * u * (3 - 2 * u), t = 1 - s;
        o.pos.set(t * t * o.p0.x + 2 * t * s * o.c.x + s * s * o.p1.x, t * t * o.p0.y + 2 * t * s * o.c.y + s * s * o.p1.y, t * t * o.p0.z + 2 * t * s * o.c.z + s * s * o.p1.z);
        o.tan.set(2 * t * (o.c.x - o.p0.x) + 2 * s * (o.p1.x - o.c.x), 2 * t * (o.c.y - o.p0.y) + 2 * s * (o.p1.y - o.c.y), 2 * t * (o.c.z - o.p0.z) + 2 * s * (o.p1.z - o.c.z)).normalize();
        o.ph += dt * 6.283 * 12;
        fl = 0.1 + 0.95 * Math.sin(o.ph); fd = u > 0.94 ? 1 : 0;
      } else { fd = 1; fl = -0.25; }
      flap.array[i] = fl; fold.array[i] = fd;
      if (o.u >= 1 && o.delay <= 0) bz.set(Math.sin(o.yaw), 0, Math.cos(o.yaw)); else bz.copy(o.tan);
      bx.crossVectors(up, bz).normalize(); by.crossVectors(bz, bx);
      m4.makeBasis(bx, by, bz);
      const e = m4.elements; for (let k = 0; k < 12; k++) e[k] *= o.sc;
      m4.setPosition(o.pos.x, o.pos.y + (o.u >= 1 ? 0.04 : 0), o.pos.z);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = flap.needsUpdate = fold.needsUpdate = true;
    if (allDown) { hideT += dt; if (hideT > 20 || Math.hypot(cam.x - B[0].pos.x, cam.z - B[0].pos.z) > 70) { mesh.visible = false; mode = 0; } }
  }
  ctx.registerUpdate(update);
}

// ---------------------------------------------------------------- bats
export function batGeometry() {
  const M = new Mesher();
  const W = (x) => clamp((Math.abs(x) - 0.01) / 0.3, 0, 1);
  M.loft([[0, 0, -0.07], [0, 0, 0.0], [0, 0.005, 0.07]], [[0.012, 0.012], [0.025, 0.025], [0.012, 0.012]], 5);
  for (const s of [1, -1]) {
    const L = [[0.015 * s, 0.01, 0.04], [0.12 * s, 0.03, 0.06], [0.3 * s, 0.01, -0.02]];
    const T = [[0.015 * s, 0, -0.07], [0.12 * s, 0, -0.1], [0.3 * s, 0, -0.1]];
    M.strip(L, T, 2, 0.02, (x) => W(x), s < 0);
  }
  return M.geometry();
}
export function buildBats(ctx) {
  const { scene, terrain, landmarks, camera } = ctx;
  const rng = ctx.makeRng(808);
  const N = ctx.quality === 'low' ? 6 : 10;
  const mat = flapMaterial({ color: 0x0a0809, roughness: 0.9, side: THREE.DoubleSide });
  const { mesh, flap, fold } = flapInstanced(batGeometry(), mat, N);
  mesh.name = 'bats'; scene.add(mesh);
  const cs = landmarks.castle, tw = landmarks.tower;
  const roosts = [
    { x: cs.x, z: cs.z, y: 18 + 14, R: 26 }, { x: tw.x, z: tw.z, y: terrain.heightAt(tw.x, tw.z) + 24, R: 12 },
  ];
  const bats = Array.from({ length: N }, (_, i) => ({ r: roosts[i % 2], a: rng() * 6.28, w: (0.5 + rng() * 0.5) * (rng() < 0.5 ? -1 : 1), p: [rng() * 6, rng() * 6, rng() * 6], fp: rng() * 6, pos: new THREE.Vector3(), prev: new THREE.Vector3(), sc: 5 + rng() * 2 }));
  const cam = camera.position;
  const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), m4 = new THREE.Matrix4();
  function update(dt, t) {
    let vis = false;
    for (let i = 0; i < N; i++) {
      const o = bats[i], r = o.r;
      if (Math.hypot(cam.x - r.x, cam.z - r.z) < 330) vis = true;
      o.a += dt * o.w;
      const R = r.R * (0.55 + 0.4 * Math.sin(t * 0.21 + o.p[0])) + 3 * Math.sin(t * 0.9 + o.p[1]);
      o.prev.copy(o.pos);
      o.pos.set(r.x + Math.cos(o.a) * R + 3 * Math.sin(t * 1.7 + o.p[2]), r.y + 5 * Math.sin(t * 0.47 + o.p[1]) + 1.5 * Math.sin(t * 2.3 + o.p[0]), r.z + Math.sin(o.a * 1.3) * R * 0.8 + 3 * Math.cos(t * 1.3 + o.p[0]));
      bz.subVectors(o.pos, o.prev);
      if (bz.lengthSq() < 1e-9) bz.set(0, 0, 1); bz.normalize();
      bx.crossVectors(up, bz).normalize(); by.crossVectors(bz, bx);
      m4.makeBasis(bx, by, bz);
      const e = m4.elements; for (let k = 0; k < 12; k++) e[k] *= o.sc;
      m4.setPosition(o.pos);
      mesh.setMatrixAt(i, m4);
      o.fp += dt * 6.283 * (10 + 4 * Math.sin(t * 0.7 + i));
      flap.array[i] = Math.abs(Math.sin(o.fp)) < 0.0 ? 0 : 1.0 * Math.sin(o.fp) * (Math.sin(t * 1.1 + o.p[2]) > -0.7 ? 1 : 0.15);
    }
    mesh.visible = vis;
    mesh.instanceMatrix.needsUpdate = flap.needsUpdate = true;
  }
  ctx.registerUpdate(update);
}

// ---------------------------------------------------------------- wader in the fen shallows
export function buildWader(ctx) {
  const { scene, terrain, landmarks, water } = ctx;
  const rng = ctx.makeRng(909);
  const F = landmarks.fen, wy = water.fen.y;
  const shallow = (x, z) => { const h = terrain.heightAt(x, z); return h < wy - 0.05 && h > wy - 1.2; };
  let x0 = 0, z0 = 0, found = false, bestN = -1;
  for (let k = 0; k < 800; k++) {
    const a = rng() * 6.28, r = 8 + rng() * 55, x = F.x + Math.cos(a) * r, z = F.z + Math.sin(a) * r;
    if (!shallow(x, z)) continue;
    let n = 0; for (let j = 0; j < 8; j++) if (shallow(x + Math.cos(j * 0.785) * 1.6, z + Math.sin(j * 0.785) * 1.6)) n++;
    if (n > bestN) { bestN = n; x0 = x; z0 = z; }
  }
  found = bestN >= 3;
  if (!found) { ctx.log('fauna: no shallow spot for the wader'); return; }
  const M = new Mesher();
  M.loft([[0, 1.02, -0.4], [0, 1.1, 0], [0, 1.18, 0.3]], [[0.07, 0.1], [0.13, 0.17], [0.07, 0.09]], 7); // body
  M.loft([[0, 1.2, 0.25], [0, 1.45, 0.4], [0, 1.75, 0.3], [0, 2.0, 0.42], [0, 2.08, 0.5]], [0.06, 0.04, 0.035, 0.032, 0.035], 5); // neck
  M.loft([[0, 2.08, 0.46], [0, 2.07, 0.8]], [[0.03, 0.03], [0.006, 0.006]], 5); // bill
  M.loft([[0, 1.06, -0.4], [0, 0.95, -0.85]], [0.03, 0.006], 4); // tail
  const bodyGeo = M.geometry();
  const L = new Mesher(); L.loft([[0, 0, 0], [0, -0.5, 0.02], [0, -1.02, 0]], [0.02, 0.014, 0.01], 4);
  const legGeo = L.geometry();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a4a58, roughness: 0.7 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(bodyGeo, mat); body.castShadow = true; g.add(body);
  const legs = [0, 1].map((k) => { const m = new THREE.Mesh(legGeo, mat); m.position.set(k ? -0.09 : 0.09, 1.04, 0); m.castShadow = true; g.add(m); return m; });
  scene.add(g);
  const st = { x: x0, z: z0, yaw: rng() * 6.28, wait: 4, leg: 0, u: -1, sx: 0, sz: 0, tx: 0, tz: 0 };
  ctx.wader = st;
  function place() { g.position.set(st.x, terrain.heightAt(st.x, st.z) - 0.0, st.z); g.rotation.y = st.yaw; }
  place();
  function update(dt, t) {
    if (st.u < 0) {
      st.wait -= dt;
      body.rotation.x = 0.02 * Math.sin(t * 0.6); // a slow settling
      if (st.wait <= 0) {
        const ny = st.yaw + (rng() - 0.5) * 1.0, d = 0.5 + rng() * 0.4;
        const tx = st.x + Math.sin(ny) * d, tz = st.z + Math.cos(ny) * d;
        if (shallow(tx, tz) && Math.hypot(tx - F.x, tz - F.z) < 66) { st.u = 0; st.yaw = ny; st.sx = st.x; st.sz = st.z; st.tx = tx; st.tz = tz; st.leg ^= 1; }
        else { st.yaw += 0.8; st.wait = 2; }
      }
    } else {
      st.u += dt / 2.4;
      const s = smoothstep(0.1, 0.9, st.u);
      st.x = lerp(st.sx, st.tx, s); st.z = lerp(st.sz, st.tz, s);
      const lift = Math.sin(clamp(st.u, 0, 1) * Math.PI);
      legs[st.leg].rotation.x = -0.9 * lift; legs[st.leg].position.y = 1.04 + 0.2 * lift;
      legs[1 - st.leg].rotation.x = 0.2 * s; legs[1 - st.leg].position.y = 1.04;
      body.rotation.x = 0.06 * lift;
      if (st.u >= 1) { st.u = -1; st.wait = 6 + rng() * 10; legs[st.leg].rotation.x = 0; legs[1 - st.leg].rotation.x = 0; legs[st.leg].position.y = 1.04; }
    }
    place();
  }
  ctx.registerUpdate(update);
}

// ---------------------------------------------------------------- the eel-back in the tarn
export function buildEel(ctx) {
  const { scene, terrain, landmarks, water, camera } = ctx;
  const rng = ctx.makeRng(1010);
  const wy = water.tarn.y, T = landmarks.tarn;
  const g = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.25, metalness: 0.2 }));
  const Mh = new Mesher(); Mh.blob(0, 0, 0, 0.3, 0.26, 1.1, 8, 6);
  const geo = Mh.geometry();
  const humps = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(geo, g.material); m.castShadow = false; m.visible = false; scene.add(m); return m; });
  const cam = camera.position, fwd = new THREE.Vector3();
  const e = { on: false, u: 0, dur: 11, x: 0, z: 0, yaw: 0, speed: 0.6, next: 12 + rng() * 15 };
  function begin() {
    camera.getWorldDirection(fwd);
    let best = null, bs = -9;
    for (let k = 0; k < 12; k++) {
      const a = rng() * 6.28, r = 10 + rng() * 30, x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r;
      if (terrain.heightAt(x, z) > wy - 1.5) continue;
      const dx = x - cam.x, dz = z - cam.z, d = Math.hypot(dx, dz);
      const s = (fwd.x * dx + fwd.z * dz) / (d || 1) - d * 0.004;
      if (s > bs) { bs = s; best = [x, z]; }
    }
    if (!best) return;
    e.x = best[0]; e.z = best[1]; e.yaw = rng() * 6.28; e.u = 0; e.on = true; e.dur = 10 + rng() * 4;
    ctx.fauna?.fishRing?.(e.x, e.z);
  }
  ctx.fauna = Object.assign(ctx.fauna || {}, { eel: begin }); ctx.eelState = e;
  function update(dt, t) {
    if (!e.on) { e.next -= dt; if (e.next <= 0) { e.next = 28 + rng() * 30; begin(); } return; }
    e.u += dt / e.dur;
    if (e.u >= 1) { e.on = false; for (const h of humps) h.visible = false; return; }
    const sx = Math.sin(e.yaw), sz = Math.cos(e.yaw);
    const env = Math.sin(e.u * Math.PI);
    const travel = e.u * 5;
    for (let i = 0; i < humps.length; i++) {
      const h = humps[i];
      const wave = Math.max(0, Math.sin((e.u * 1.8 - i * 0.16) * Math.PI * 2)) * env; // each hump rises in turn
      const off = travel - i * 2.0;
      h.position.set(e.x + sx * off, wy - 0.35 + 0.5 * wave, e.z + sz * off);
      h.rotation.y = e.yaw + 0.15 * Math.sin(t * 0.5 + i);
      h.rotation.x = 0;
      h.scale.set(1, 0.9 + 0.2 * (i === 1), 1 - i * 0.12);
      h.visible = wave > 0.02;
    }
  }
  ctx.registerUpdate(update);
}
