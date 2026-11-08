// Wings: large dark long-necked things circling the Armiger's Tower (and a few very high over the fen).
// Steered toward a drifting point on an orbit, so circles are slightly irregular; one breaks off to cross the sun.
import * as THREE from 'three';
import { Mesher, flapMaterial, flapInstanced, clamp, lerp } from './geo.js';
import { hyp } from '../noise.js';

const SPAN = 4.9;

function wingGeometry() {
  const M = new Mesher();
  const W = (x) => clamp((Math.abs(x) - 0.15) / (SPAN - 0.15), 0, 1);
  const wf = (p) => W(p[0]);
  // body, neck, head, beak, tail (forward is +z)
  M.loft([[0, 0, -1.0], [0, 0.02, -0.4], [0, 0.08, 0.3], [0, 0.17, 0.9]], [[0.1, 0.09], [0.3, 0.25], [0.3, 0.26], [0.16, 0.16]], 8);
  M.loft([[0, 0.17, 0.85], [0, 0.1, 1.5], [0, 0.32, 2.15], [0, 0.78, 2.65], [0, 0.9, 3.05]], [0.15, 0.1, 0.075, 0.062, 0.06], 6);
  M.loft([[0, 0.9, 3.0], [0, 0.93, 3.3], [0, 0.8, 3.95]], [[0.075, 0.07], [0.055, 0.05], [0.008, 0.008]], 6);
  M.loft([[0, 0, -0.9], [0, -0.02, -2.1], [0, -0.1, -3.4]], [[0.1, 0.05], [0.05, 0.02], [0.012, 0.008]], 5);
  // ragged tail vane
  const t0 = M.v(0, -0.02, -1.6), t1 = M.v(0.5, -0.06, -3.0), t2 = M.v(0.12, -0.08, -2.5), t3 = M.v(0, -0.1, -3.9), t4 = M.v(-0.12, -0.08, -2.5), t5 = M.v(-0.5, -0.06, -3.0);
  M.tri(t0, t2, t1); M.tri(t0, t3, t2); M.tri(t0, t4, t3); M.tri(t0, t5, t4);
  // wings: leading edge arches forward and sweeps back; trailing edge is fingers and notches
  const TX = [0.3, 1.0, 1.5, 2.1, 2.7, 3.3, 3.8, 4.4, 4.9];
  const TZ = [-1.4, -2.6, -1.5, -2.8, -1.4, -2.3, -0.9, -1.5, -0.3];
  const lead = (x) => [x, 0.12 + 0.5 * Math.sin(x * 0.55), 0.65 - 0.2 * x];
  for (const side of [1, -1]) {
    const L = [], T = [];
    for (let k = 0; k < TX.length; k++) {
      const l = lead(TX[k]);
      L.push([l[0] * side, l[1], l[2]]);
      const tip = (k % 2 === 1 || k === TX.length - 1);
      T.push([TX[k] * side, l[1] - (tip ? 0.55 : 0.25), TZ[k]]);
    }
    M.strip(L, T, 3, 0.25, (x) => W(x), side < 0);
  }
  return M.geometry();
}

export function buildWings(ctx) {
  const { THREE: _T, scene, terrain, landmarks, sun } = ctx;
  const rng = ctx.makeRng(101);
  const geo = wingGeometry();
  const mat = flapMaterial({ color: 0x0b090e, roughness: 0.82, metalness: 0.0, side: THREE.DoubleSide });
  const N = 8;
  const { mesh, flap, fold } = flapInstanced(geo, mat, N);
  mesh.name = 'wings';
  scene.add(mesh);

  const tower = landmarks.tower, fen = landmarks.fen;
  const tGround = terrain.heightAt(tower.x, tower.z);
  const fGround = terrain.heightAt(fen.x, fen.z);

  const wings = [];
  for (let i = 0; i < N; i++) {
    const high = i >= 5;
    const c = high ? { x: fen.x, z: fen.z, y0: fGround + 105 + rng() * 40, R: 55 + rng() * 25 } : { x: tower.x, z: tower.z, y0: tGround + 44 + rng() * 26, R: 38 + rng() * 26 };
    const a0 = rng() * Math.PI * 2;
    const w = {
      c, dir: (i === 3 || i === 6) ? -1 : 1, phase: rng() * 6.28, ph2: rng() * 6.28, ph3: rng() * 6.28,
      speed: 8 + rng() * 3, scale: (high ? 1.0 : 0.85) + rng() * 0.3,
      pos: new THREE.Vector3(c.x + Math.cos(a0) * c.R, c.y0, c.z + Math.sin(a0) * c.R),
      h: new THREE.Vector3(), hPrev: new THREE.Vector3(), tgt: new THREE.Vector3(),
      roll: 0, flapPhase: rng() * 6.28, flapAmt: 0, flapGoal: 0, toggle: 3 + rng() * 14, mode: 0, step: 0,
      way: [new THREE.Vector3(), new THREE.Vector3()], flapRate: 1.0 + rng() * 0.25,
    };
    // initial heading tangent to the orbit
    w.h.set(-Math.sin(a0) * w.dir, 0, Math.cos(a0) * w.dir).normalize();
    w.hPrev.copy(w.h);
    wings.push(w);
  }
  ctx.wings = { positions: wings.map((w) => w.pos), count: N };

  // scratch
  const up = new THREE.Vector3(0, 1, 0), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), mr = new THREE.Matrix4(), des = new THREE.Vector3();
  const cam = ctx.camera.position;
  let nextCross = 22 + rng() * 20, nextCry = 12 + rng() * 15;
  const crossCtl = { active: false };

  function startCross() {
    const w = wings[0];
    if (w.mode !== 0) return false;
    const s = sun.vec, D = 175, side = rng() < 0.5 ? -1 : 1;
    let lx = -s.z, lz = s.x; const ll = Math.hypot(lx, lz); lx /= ll; lz /= ll;
    const cx = cam.x + s.x * D, cz = cam.z + s.z * D;
    const cy = Math.max(cam.y + s.y * D + 2, terrain.heightAt(cx, cz) + 18);
    w.way[0].set(cx - lx * 95 * side, cy + 4, cz - lz * 95 * side);
    w.way[1].set(cx + lx * 95 * side, cy - 1, cz + lz * 95 * side);
    w.mode = 1; w.step = 0; w.flapGoal = 1; w.toggle = 7;
    return true;
  }
  ctx.fauna = Object.assign(ctx.fauna || {}, { crossSun: startCross });

  function update(dt, t) {
    nextCross -= dt;
    if (nextCross <= 0) { startCross(); nextCross = 70 + rng() * 50; }
    nextCry -= dt;
    if (nextCry <= 0) {
      nextCry = 18 + rng() * 30;
      const w = wings[(rng() * N) | 0];
      if (w.pos.distanceTo(cam) < 420) ctx.audio?.cue?.('cry', w.pos);
    }
    for (let i = 0; i < N; i++) {
      const w = wings[i], c = w.c;
      // target
      if (w.mode === 0) {
        const a = Math.atan2(w.pos.z - c.z, w.pos.x - c.x) + w.dir * 0.42;
        const R = c.R + 7 * Math.sin(t * 0.071 + w.phase) + 3 * Math.sin(t * 0.19 + w.ph2);
        const y = c.y0 + 5 * Math.sin(t * 0.093 + w.ph3) + 2 * Math.sin(t * 0.21 + w.phase);
        w.tgt.set(c.x + Math.cos(a) * R, y, c.z + Math.sin(a) * R);
      } else if (w.mode === 1) {
        w.tgt.copy(w.way[w.step]);
        if (hyp(w.pos.x - w.tgt.x, w.pos.z - w.tgt.z) < 30) {
          w.step++;
          if (w.step > 1) { w.mode = 2; w.step = 0; }
        }
      } else {
        const a = Math.atan2(w.pos.z - c.z, w.pos.x - c.x) + w.dir * 0.5;
        w.tgt.set(c.x + Math.cos(a) * c.R, c.y0, c.z + Math.sin(a) * c.R);
        if (hyp(w.pos.x - c.x, w.pos.z - c.z) < c.R + 45 && Math.abs(w.pos.y - c.y0) < 25) w.mode = 0;
      }
      // steer
      const kTurn = w.mode === 0 ? 0.9 : 0.75;
      des.subVectors(w.tgt, w.pos).normalize();
      w.hPrev.copy(w.h);
      w.h.lerp(des, Math.min(1, kTurn * dt)).normalize();
      // limit pitch so they never dive or climb steeply
      if (Math.abs(w.h.y) > 0.28) { w.h.y = 0.28 * Math.sign(w.h.y); w.h.normalize(); }
      w.pos.addScaledVector(w.h, w.speed * dt);
      const turn = (w.hPrev.z * w.h.x - w.hPrev.x * w.h.z) / Math.max(dt, 1e-4); // + = left turn
      w.roll += (clamp(-turn * 1.6, -0.55, 0.55) - w.roll) * Math.min(1, dt * 1.5);
      // flapping: mostly glide, bursts now and then
      w.toggle -= dt;
      if (w.toggle <= 0) {
        if (w.flapGoal > 0.5 && w.mode === 0) { w.flapGoal = 0; w.toggle = 8 + rng() * 14; }
        else { w.flapGoal = 1; w.toggle = 3 + rng() * 3.5; }
      }
      if (w.mode === 1 && w.step === 1) w.flapGoal = 0;
      w.flapAmt += (w.flapGoal - w.flapAmt) * Math.min(1, dt * 1.2);
      w.flapPhase += dt * Math.PI * 2 * w.flapRate * (0.5 + 0.5 * w.flapAmt);
      const stroke = Math.sin(w.flapPhase) + 0.25 * Math.sin(w.flapPhase * 2 + 0.8);
      const glide = 0.16 + 0.07 * Math.sin(t * 0.6 + w.phase) + 0.03 * Math.sin(t * 1.7 + w.ph2);
      flap.array[i] = lerp(glide, 0.12 + 0.62 * stroke, w.flapAmt);
      fold.array[i] = 0;
      // orientation
      bz.copy(w.h);
      bx.crossVectors(up, bz).normalize();
      by.crossVectors(bz, bx);
      m4.makeBasis(bx, by, bz);
      mr.makeRotationZ(w.roll);
      m4.multiply(mr);
      const sc = w.scale;
      const e = m4.elements;
      for (let k = 0; k < 12; k++) e[k] *= sc;
      m4.setPosition(w.pos);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true; flap.needsUpdate = true; fold.needsUpdate = true;
  }
  ctx.registerUpdate(update);
}
