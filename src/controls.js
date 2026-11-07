// First-person walking: pointer-lock mouse look, WASD, shift to hurry, terrain-following with
// a little head bob, soft cylinder colliders registered by other modules, and touch fallback.
import * as THREE from 'three';
import { clamp, smoothstep } from './noise.js';
import { SPAWN, WORLD } from './world.js';

export function buildControls(ctx) {
  const { camera, renderer, terrain } = ctx;
  const el = renderer.domElement;
  const state = {
    yaw: SPAWN.yaw, pitch: -0.04,
    pos: new THREE.Vector3(SPAWN.x, 0, SPAWN.z),
    vel: new THREE.Vector3(),
    eye: 1.72, bob: 0, bobAmt: 0, speed: 0, onGround: true, vy: 0,
    locked: false, enabled: false, moving: false, stepPhase: 0,
    keys: new Set(), colliders: [],
    onStep: null,
  };
  state.pos.y = terrain.heightAt(state.pos.x, state.pos.z) + state.eye;

  const url = new URL(location.href);
  if (url.searchParams.get('pos')) {
    const [x, z] = url.searchParams.get('pos').split(',').map(Number);
    state.pos.set(x, terrain.heightAt(x, z) + state.eye, z);
  }
  if (url.searchParams.get('yaw')) state.yaw = Number(url.searchParams.get('yaw'));
  if (url.searchParams.get('pitch')) state.pitch = Number(url.searchParams.get('pitch'));

  // --- input
  const onKey = (down) => (e) => {
    if (e.repeat) return;
    const k = e.code;
    if (down) state.keys.add(k); else state.keys.delete(k);
    if (down && k === 'Space' && state.onGround && state.enabled) { state.vy = 4.2; state.onGround = false; }
  };
  window.addEventListener('keydown', onKey(true));
  window.addEventListener('keyup', onKey(false));
  window.addEventListener('blur', () => state.keys.clear());

  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === el;
    ctx.events.dispatchEvent(new CustomEvent('lock', { detail: state.locked }));
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked) return;
    state.yaw -= e.movementX * 0.0021;
    state.pitch = clamp(state.pitch - e.movementY * 0.0021, -1.45, 1.45);
  });

  // Touch: left half = move stick, right half = look
  let moveTouch = null, lookTouch = null;
  const moveVec = { x: 0, y: 0 };
  el.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth / 2 && !moveTouch) moveTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
      else if (!lookTouch) lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
    if (!state.enabled) ctx.events.dispatchEvent(new CustomEvent('begin'));
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        moveVec.x = clamp((t.clientX - moveTouch.x) / 60, -1, 1);
        moveVec.y = clamp((t.clientY - moveTouch.y) / 60, -1, 1);
      } else if (lookTouch && t.identifier === lookTouch.id) {
        state.yaw -= (t.clientX - lookTouch.x) * 0.005;
        state.pitch = clamp(state.pitch - (t.clientY - lookTouch.y) * 0.005, -1.45, 1.45);
        lookTouch.x = t.clientX; lookTouch.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) { moveTouch = null; moveVec.x = moveVec.y = 0; }
      if (lookTouch && t.identifier === lookTouch.id) lookTouch = null;
    }
  };
  el.addEventListener('touchend', endTouch); el.addEventListener('touchcancel', endTouch);

  function lock() { el.requestPointerLock?.(); }

  // --- colliders: {x, z, r} cylinders (infinite height) or {x, z, r, y, h} capped
  function addCollider(c) { state.colliders.push(c); }

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
  function update(dt) {
    dt = Math.min(dt, 0.05);
    const k = state.keys;
    let mx = 0, mz = 0;
    if (state.enabled) {
      if (k.has('KeyW') || k.has('ArrowUp')) mz += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) mz -= 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
      mx += moveVec.x; mz -= moveVec.y;
    }
    const hurry = k.has('ShiftLeft') || k.has('ShiftRight');
    const maxSpeed = hurry ? 6.2 : 3.1;
    fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    wish.set(0, 0, 0).addScaledVector(fwd, mz).addScaledVector(right, mx);
    const len = wish.length();
    if (len > 1) wish.divideScalar(len);
    state.moving = len > 0.05;

    // slope slows you and stops you on the steep stuff
    const n = terrain.normalAt(state.pos.x, state.pos.z);
    const slope = Math.acos(clamp(n.y, -1, 1));
    const slopeFactor = 1 - smoothstep(0.55, 0.95, slope);

    const accel = state.onGround ? 14 : 3;
    const target = wish.clone().multiplyScalar(maxSpeed * (0.35 + 0.65 * slopeFactor));
    state.vel.x += (target.x - state.vel.x) * Math.min(1, accel * dt);
    state.vel.z += (target.z - state.vel.z) * Math.min(1, accel * dt);
    // steep slopes push you back down
    if (slope > 0.95 && state.onGround) {
      state.vel.x += n.x * 9 * dt; state.vel.z += n.z * 9 * dt;
    }

    let nx = state.pos.x + state.vel.x * dt;
    let nz = state.pos.z + state.vel.z * dt;
    // region boundary (the mountains are impassable)
    const rr = Math.hypot(nx, nz);
    const limit = WORLD.regionRadius + 48;
    if (rr > limit) { nx *= limit / rr; nz *= limit / rr; }
    // colliders
    for (const c of state.colliders) {
      const dx = nx - c.x, dz = nz - c.z;
      const d = Math.hypot(dx, dz);
      const rad = c.r + 0.45;
      if (d < rad && d > 1e-4) {
        if (c.h !== undefined && (state.pos.y - state.eye > c.y + c.h || state.pos.y - state.eye < c.y - 0.5)) continue;
        nx = c.x + (dx / d) * rad; nz = c.z + (dz / d) * rad;
      }
    }
    state.pos.x = nx; state.pos.z = nz;

    // vertical: follow the ground, with a small jump
    const groundY = terrain.heightAt(state.pos.x, state.pos.z);
    const wl = terrain.waterLevelAt(state.pos.x, state.pos.z);
    let floorY = groundY;
    if (wl !== null && groundY < wl) floorY = Math.max(groundY, wl - 1.1); // wade, don't sink
    state.vy -= 12 * dt;
    let feet = state.pos.y - state.eye + state.vy * dt;
    if (feet <= floorY) { feet = floorY; state.vy = 0; state.onGround = true; } else state.onGround = false;
    // smooth the ground-follow a touch when walking
    const speed = Math.hypot(state.vel.x, state.vel.z);
    state.speed = speed;
    if (state.onGround) {
      state.bob += dt * (hurry ? 11 : 7.5) * (speed / maxSpeed);
      state.bobAmt += ((speed > 0.3 ? 1 : 0) - state.bobAmt) * Math.min(1, dt * 6);
      const phase = Math.sin(state.bob);
      if (phase < -0.98 && state.stepPhase >= 0) { state.stepPhase = -1; state.onStep?.(hurry); }
      if (phase > 0) state.stepPhase = 0;
    }
    const bobY = Math.abs(Math.sin(state.bob)) * 0.06 * state.bobAmt;
    const bobX = Math.sin(state.bob * 0.5) * 0.035 * state.bobAmt;
    const wading = wl !== null && groundY < wl ? smoothstep(0, 1.1, wl - groundY) : 0;
    state.pos.y = feet + state.eye;

    camera.position.set(state.pos.x + right.x * bobX, state.pos.y + bobY - wading * 0.15, state.pos.z + right.z * bobX);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(state.pitch, state.yaw, Math.sin(state.bob * 0.5) * 0.004 * state.bobAmt);
    state.wading = wading;
  }

  return { state, update, lock, addCollider };
}
