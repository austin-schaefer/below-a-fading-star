// First-person walking: pointer-lock mouse look, WASD, shift to hurry, terrain-following with
// a little head bob, soft cylinder colliders registered by other modules, and touch fallback.
import * as THREE from 'three';
import { clamp, smoothstep } from './noise.js';
import { SPAWN, WORLD } from './world.js';

const WALK = 4.2, HURRY = 7.6;      // m/s
const STEPS_WALK = 1.9, STEPS_HURRY = 2.6; // footsteps per second at full speed
const LOOK_SENS = 0.005;            // rad per css px of touch drag
const AUTO_HURRY = 0.8;             // stick pulled past this fraction hurries

export function buildControls(ctx) {
  const { camera, renderer, terrain } = ctx;
  const el = renderer.domElement;
  const state = {
    yaw: SPAWN.yaw, pitch: -0.04,
    pos: new THREE.Vector3(SPAWN.x, 0, SPAWN.z),
    vel: new THREE.Vector3(),
    eye: 1.72, bob: 0, bobAmt: 0, speed: 0, onGround: true, vy: 0,
    locked: false, everLocked: false, lockFailed: false, enabled: false, moving: false, stepPhase: 0,
    keys: new Set(), colliders: [],
    onStep: null,
  };
  state.pos.y = terrain.heightAt(state.pos.x, state.pos.z) + state.eye;
  state.hurrying = false;

  const url = new URL(location.href);
  if (url.searchParams.get('pos')) {
    const [x, z] = url.searchParams.get('pos').split(',').map(Number);
    state.pos.set(x, terrain.heightAt(x, z) + state.eye, z);
  }
  if (url.searchParams.get('yaw')) state.yaw = Number(url.searchParams.get('yaw'));
  const speedMul = Number(url.searchParams.get('speed')) > 0 ? Number(url.searchParams.get('speed')) : 1;
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
    if (state.locked) state.everLocked = true;
    ctx.events.dispatchEvent(new CustomEvent('lock', { detail: state.locked }));
  });
  // Pointer lock can be refused (an embedding iframe without the permission, some browsers). Then
  // the mouse looks by dragging on the canvas instead, and the page says so once.
  let dragging = false;
  function onLockFail() {
    if (state.lockFailed) return;
    state.lockFailed = true;
    ctx.events.dispatchEvent(new CustomEvent('lockfail'));
  }
  document.addEventListener('pointerlockerror', onLockFail);
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || state.locked) return;
    if (state.enabled && state.lockFailed) { dragging = true; e.preventDefault(); }
    else if (state.enabled && !document.pointerLockElement) lock();
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked && !dragging) return;
    state.yaw -= e.movementX * 0.0021;
    state.pitch = clamp(state.pitch - e.movementY * 0.0021, -1.45, 1.45);
  });

  // --- touch: a drawn thumbstick in the bottom-left zone, look from any other touch
  const stickEl = document.getElementById('stick');
  const knobEl = document.getElementById('stick-knob');
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const RING_R = 60;                       // css px (ring is 120 wide)
  const moveVec = { x: 0, y: 0, mag: 0 }; // y positive = pulled down
  let moveTouch = null, lookTouch = null, cornerTimer = 0;
  let ringX = 0, ringY = 0;                // current ring centre, css px
  let homeSet = false;
  const lookVel = { x: 0, y: 0 };          // rad/s inertia after release
  let lastLookT = 0;

  function ringHome() {
    // measure the home position the CSS gives the ring (safe-area aware)
    stickEl.style.left = ''; stickEl.style.top = ''; stickEl.style.bottom = ''; stickEl.style.transform = 'none';
    const r = stickEl.getBoundingClientRect();
    ringX = r.left + r.width / 2; ringY = r.top + r.height / 2; homeSet = true;
    placeRing(ringX, ringY, false);
  }
  function placeRing(cx, cy, custom) {
    stickEl.style.bottom = 'auto';
    stickEl.style.left = (cx - RING_R) + 'px'; stickEl.style.top = (cy - RING_R) + 'px';
    ringX = cx; ringY = cy;
  }
  function setKnob(dx, dy) { knobEl.style.transform = `translate(${dx}px, ${dy}px)`; }
  function inStickZone(x, y) { return x < innerWidth * 0.4 && y > innerHeight * 0.55; }
  function inCorner(x, y) { return x > innerWidth - 72 && y < 72; }
  if (isTouch) document.body.classList.add('touch');
  ctx.events.addEventListener('begin', () => { if (isTouch) { document.body.classList.add('begun'); if (stickEl) ringHome(); } });
  addEventListener('resize', () => { if (isTouch && stickEl && !moveTouch) ringHome(); });

  el.addEventListener('touchstart', (e) => {
    if (!isTouch) { document.body.classList.add('touch'); }
    for (const t of e.changedTouches) {
      if (!moveTouch && inStickZone(t.clientX, t.clientY) && stickEl) {
        if (!homeSet) ringHome();
        if (Math.hypot(t.clientX - ringX, t.clientY - ringY) > RING_R) {
          placeRing(clamp(t.clientX, RING_R, innerWidth - RING_R), clamp(t.clientY, RING_R, innerHeight - RING_R), true);
        }
        moveTouch = { id: t.identifier };
        stickEl.classList.add('active');
        updateStick(t.clientX, t.clientY);
      } else if (!lookTouch) {
        lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY };
        lookVel.x = lookVel.y = 0; lastLookT = performance.now();
        if (inCorner(t.clientX, t.clientY)) {
          clearTimeout(cornerTimer);
          cornerTimer = setTimeout(() => { if (lookTouch && lookTouch.corner) { ctx.debug?.reveal(); lookTouch = null; } }, 1200);
          lookTouch.corner = true;
        }
      }
    }
    if (!state.enabled) ctx.events.dispatchEvent(new CustomEvent('begin'));
    e.preventDefault();
  }, { passive: false });
  function updateStick(cx, cy) {
    let dx = cx - ringX, dy = cy - ringY;
    const d = Math.hypot(dx, dy);
    if (d > RING_R) { dx *= RING_R / d; dy *= RING_R / d; }
    setKnob(dx, dy);
    moveVec.x = dx / RING_R; moveVec.y = dy / RING_R; moveVec.mag = Math.min(1, d / RING_R);
  }
  el.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) updateStick(t.clientX, t.clientY);
      else if (lookTouch && t.identifier === lookTouch.id) {
        const dxp = t.clientX - lookTouch.x, dyp = t.clientY - lookTouch.y;
        if (lookTouch.corner && Math.hypot(t.clientX - lookTouch.sx, t.clientY - lookTouch.sy) > 14) { lookTouch.corner = false; clearTimeout(cornerTimer); }
        const dYaw = -dxp * LOOK_SENS, dPitch = -dyp * LOOK_SENS;
        state.yaw += dYaw;
        state.pitch = clamp(state.pitch + dPitch, -1.45, 1.45);
        const now = performance.now(), dtm = Math.max(1, now - lastLookT) / 1000;
        lookVel.x += (dYaw / dtm - lookVel.x) * 0.5; lookVel.y += (dPitch / dtm - lookVel.y) * 0.5;
        lastLookT = now;
        lookTouch.x = t.clientX; lookTouch.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const endTouch = (e) => {
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        moveTouch = null; moveVec.x = moveVec.y = moveVec.mag = 0; setKnob(0, 0);
        stickEl.classList.remove('active'); ringHome();
      }
      if (lookTouch && t.identifier === lookTouch.id) {
        clearTimeout(cornerTimer);
        if (performance.now() - lastLookT > 80) lookVel.x = lookVel.y = 0; // held still: no fling
        lookTouch = null;
      }
    }
  };
  el.addEventListener('touchend', endTouch); el.addEventListener('touchcancel', endTouch);

  // --- walkable floors: fn(x, z) -> world y of a floor, or null
  const walkables = [];
  function addWalkable(fn) { walkables.push(fn); }
  ctx.addWalkable = addWalkable;

  // Put the player at (x, z) at ground height: inside the region, pushed out of colliders.
  function placeAt(x, z) {
    const limit = WORLD.regionRadius + 48;
    for (let iter = 0; iter < 8; iter++) {
      let moved = false;
      const rr = Math.hypot(x, z);
      if (rr > limit) { x *= limit / rr; z *= limit / rr; moved = true; }
      for (const c of state.colliders) {
        const dx = x - c.x, dz = z - c.z, rad = c.r + 0.6;
        const d = Math.hypot(dx, dz);
        if (d < rad) {
          if (c.h !== undefined && c.y + c.h < terrain.heightAt(x, z)) continue;
          const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
          x = c.x + nx * rad; z = c.z + nz * rad; moved = true;
        }
      }
      if (!moved) break;
    }
    const g = terrain.heightAt(x, z), wl = terrain.waterLevelAt(x, z);
    let floor = g;
    if (wl !== null && g < wl) floor = Math.max(g, wl - 1.1);
    state.pos.set(x, floor + state.eye, z);
    state.vel.set(0, 0, 0); state.vy = 0; state.onGround = true;
    return { x, z };
  }

  function lock() {
    if (state.lockFailed || !el.requestPointerLock) { if (!el.requestPointerLock) onLockFail(); return; }
    let r;
    try { r = el.requestPointerLock(); } catch (e) { onLockFail(); return; }
    if (r && typeof r.catch === 'function') r.catch(onLockFail);
    // No change event within a moment means the request was quietly dropped: fall back.
    setTimeout(() => { if (!state.locked && !state.everLocked) onLockFail(); }, 1500);
  }

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
    // touch look inertia
    if (!lookTouch && (lookVel.x || lookVel.y)) {
      state.yaw += lookVel.x * dt; state.pitch = clamp(state.pitch + lookVel.y * dt, -1.45, 1.45);
      const decay = Math.exp(-dt / 0.08);
      lookVel.x *= decay; lookVel.y *= decay;
      if (Math.abs(lookVel.x) + Math.abs(lookVel.y) < 0.01) lookVel.x = lookVel.y = 0;
    }
    const hurry = k.has('ShiftLeft') || k.has('ShiftRight') || moveVec.mag > AUTO_HURRY;
    state.hurrying = hurry;
    const maxSpeed = (hurry ? HURRY : WALK) * speedMul;
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
    // walkable floors (decks, ramps): within 1.2 m below the feet or 0.6 m above
    const feet0 = state.pos.y - state.eye;
    for (const fn of walkables) {
      const h = fn(state.pos.x, state.pos.z);
      if (h !== null && h !== undefined && h <= feet0 + 0.6 && h >= feet0 - 1.2 && h > floorY) floorY = h;
    }
    state.vy -= 12 * dt;
    let feet = state.pos.y - state.eye + state.vy * dt;
    // stick to ground going downhill (faster speeds out-run gravity on slopes)
    if (state.onGround && state.vy <= 0 && feet > floorY && feet - floorY < 0.35) feet = floorY;
    if (feet <= floorY) { feet = floorY; state.vy = 0; state.onGround = true; } else state.onGround = false;
    // smooth the ground-follow a touch when walking
    const speed = Math.hypot(state.vel.x, state.vel.z);
    state.speed = speed;
    if (state.onGround) {
      // |sin(bob)| has one bump per footstep, so bob advances pi per step
      state.bob += dt * Math.PI * (hurry ? STEPS_HURRY : STEPS_WALK) * (speed / maxSpeed);
      state.bobAmt += ((speed > 0.3 ? 1 : 0) - state.bobAmt) * Math.min(1, dt * 6);
      const stepNo = Math.floor(state.bob / Math.PI);
      if (stepNo !== state.stepPhase) { state.stepPhase = stepNo; if (state.bobAmt > 0.3) state.onStep?.(hurry); }
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

  return { state, update, lock, addCollider, addWalkable, placeAt };
}
