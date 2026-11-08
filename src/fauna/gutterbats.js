// Bats out of the Armiger's Tower at every gutter. When the sun's flicker drops below 0.5 a flight of them
// pours out of the lit window and from between the merlons just below the banner, wheels over the tower
// hill, and goes back in as the sun recovers (but not before about fifteen seconds of flight). One
// 'bats-out' cue per gutter, at the window. Tiny: one InstancedMesh of the life.js bat, hidden between gutters.
import * as THREE from 'three';
import { flapMaterial, flapInstanced, clamp, smoothstep } from './geo.js';
import { batGeometry } from './life.js';
import { hyp } from '../noise.js';

export function buildGutterBats(ctx) {
  const { scene, terrain, camera, landmarks, sky } = ctx;
  const rng = ctx.makeRng(1515);
  const N = ctx.quality === 'low' ? 20 : 34;
  const mat = flapMaterial({ color: 0x0a0809, roughness: 0.9, side: THREE.DoubleSide });
  const { mesh, flap, fold } = flapInstanced(batGeometry(), mat, N);
  mesh.name = 'gutter-bats'; mesh.visible = false; scene.add(mesh);
  const TW = landmarks.tower, gm = terrain.heightAt(TW.x, TW.z);
  // ways out: the lit window (the structures note, when it exists) and the gaps of the parapet (shaft top 21 m)
  const exits = [];
  const winGuess = new THREE.Vector3(TW.x + 3.4, gm + 19, TW.z);
  function setExits() {
    exits.length = 0;
    const w = ctx.structures?.notes?.towerWindow;
    const win = w ? new THREE.Vector3(w.x, w.y, w.z) : winGuess;
    const out = new THREE.Vector3(win.x - TW.x, 0, win.z - TW.z).normalize();
    exits.push({ p: win.clone().addScaledVector(out, -0.5), out, w: 0.5 });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.4;
      const o = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      exits.push({ p: new THREE.Vector3(TW.x + o.x * 2.9, gm + 21.8, TW.z + o.z * 2.9), out: o, w: 0.5 / 6 });
    }
  }
  setExits();
  const pickExit = () => { let r = rng(); for (const e of exits) { r -= e.w; if (r <= 0) return e; } return exits[0]; };
  const B = Array.from({ length: N }, () => ({
    mode: 0, ex: null, delay: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), a: rng() * 6.28,
    R: 9 + rng() * 24, y: gm + 20 + rng() * 22, w: (0.35 + rng() * 0.35) * (rng() < 0.5 ? -1 : 1), ph: [rng() * 6, rng() * 6, rng() * 6], fp: rng() * 6, sc: 2.4 + rng() * 0.8, shrink: 1,
  }));
  const st = { out: false, t: 0, armed: true, gutters: 0, flying: 0 };
  ctx.gutterBats = st;
  const cam = camera.position;
  const up = new THREE.Vector3(0, 1, 0), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), m4 = new THREE.Matrix4(), des = new THREE.Vector3();
  function pour() {
    if (ctx.structures?.notes?.towerWindow) setExits();
    st.out = true; st.t = 0; st.gutters++;
    for (const b of B) {
      b.ex = pickExit(); b.mode = 1; b.delay = Math.pow(rng(), 1.6) * 3.2; b.shrink = 0;
      b.pos.copy(b.ex.p); b.vel.copy(b.ex.out).multiplyScalar(5 + rng() * 3); b.vel.y = -1.5 - rng() * 2; // they drop out, then climb
    }
    ctx.audio?.cue?.('bats-out', exits[0].p, { count: N });
  }
  function update(dt, t) {
    const f = sky.flicker.value;
    if (f < 0.5 && st.armed && !st.out) { st.armed = false; pour(); }
    if (f > 0.85) st.armed = true;
    if (!st.out) return;
    st.t += dt;
    // go home once the sun has come back and they have had their flight
    const homing = st.t > 15 && f > 0.8;
    const far = hyp(cam.x - TW.x, cam.z - TW.z) > 420;
    let flying = 0;
    for (let i = 0; i < N; i++) {
      const b = B[i];
      if (b.mode === 0) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); continue; }
      if (b.delay > 0) { b.delay -= dt; m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); flying++; continue; }
      flying++;
      b.shrink = Math.min(1, b.shrink + dt * 4);
      let speed = 9, k = 1.6;
      if (homing && b.mode === 1) b.mode = 2;
      if (b.mode === 1) {
        // wheeling over the hill: an orbit that breathes in and out, with the jinks bats make
        b.a += b.w * dt;
        const R = b.R * (0.7 + 0.3 * Math.sin(t * 0.23 + b.ph[0]));
        des.set(TW.x + Math.cos(b.a) * R + 3 * Math.sin(t * 2.1 + b.ph[1]), b.y + 4 * Math.sin(t * 0.5 + b.ph[2]) + 1.5 * Math.sin(t * 3.1 + b.ph[0]), TW.z + Math.sin(b.a) * R + 3 * Math.cos(t * 1.7 + b.ph[2]));
        if (st.t < 2.5) k = 0.7; // let the fall out of the window carry them first
      } else {
        des.copy(b.ex.p);
        const d = b.pos.distanceTo(des);
        speed = Math.min(9, 1.5 + d * 0.9); k = 3;
        if (d < 0.6) { b.mode = 0; continue; }
        if (d < 2.5) b.shrink = clamp(d / 2.5, 0.2, 1);
      }
      des.sub(b.pos); const dl = des.length() || 1; des.multiplyScalar(speed / dl);
      b.vel.lerp(des, Math.min(1, dt * k));
      b.pos.addScaledVector(b.vel, dt);
      if (far) continue;
      bz.copy(b.vel); if (bz.lengthSq() < 1e-6) bz.set(0, 0, 1); bz.normalize();
      bx.crossVectors(up, bz).normalize(); by.crossVectors(bz, bx);
      m4.makeBasis(bx, by, bz);
      const e = m4.elements, s = b.sc * smoothstep(0, 1, b.shrink); for (let q = 0; q < 12; q++) e[q] *= s;
      m4.setPosition(b.pos);
      mesh.setMatrixAt(i, m4);
      b.fp += dt * 6.283 * (11 + 4 * Math.sin(t * 0.9 + i));
      flap.array[i] = 0.95 * Math.sin(b.fp);
      fold.array[i] = 0;
    }
    st.flying = flying;
    if (!flying) { st.out = false; mesh.visible = false; return; }
    mesh.visible = !far;
    mesh.instanceMatrix.needsUpdate = flap.needsUpdate = fold.needsUpdate = true;
  }
  ctx.registerUpdate(update);
  // test hook: let them out now, regardless of the sun
  st.pour = pour;
  st.advance = (sec, step = 0.05) => { for (let k = 0; k < sec; k += step) update(step, ctx.time.t + k); };
}
