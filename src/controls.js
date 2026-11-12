// First-person walking: pointer-lock mouse look, WASD, shift to hurry, terrain-following with
// a little head bob, soft cylinder colliders registered by other modules, and touch fallback.
import * as THREE from 'three';
import { clamp, smoothstep, hyp } from './noise.js';
import { SPAWN } from './world.js';
import { walkLimit } from './v4/mountains.js'; // v4 systems: the saddle's walkable wedge

const WALK = 3.6, HURRY = 6.6;      // m/s (4.2/7.6 in v2 was a shade too fast, Austin)
const STEPS_WALK = 1.7, STEPS_HURRY = 2.4; // footsteps per second at full speed
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
    locked: false, everLocked: false, lockFailed: false, dragLook: false, enabled: false, moving: false, stepPhase: 0,
    keys: new Set(), colliders: [],
    onStep: null, hops: 0, hopping: false, onTop: false, carried: false, intent: 0,
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
    if (down && k === 'Space') hop();
  };
  // The one jump: Space and the touch button both come here.
  function hop() {
    if (!state.onGround || !state.enabled || carried) return false;
    state.vy = 4.2; state.onGround = false; state.hopping = true; state.hops++;
    return true;
  }
  window.addEventListener('keydown', onKey(true));
  window.addEventListener('keyup', onKey(false));
  window.addEventListener('blur', () => state.keys.clear());

  // One place decides whether the mouse is captured. Called on the browser's event and again
  // every frame, because Firefox has been seen to drop or keep the capture without telling us.
  function syncLock() {
    const held = document.pointerLockElement === el;
    if (held === state.locked) return;
    state.locked = held;
    if (held) state.everLocked = true;
    ctx.events.dispatchEvent(new CustomEvent('lock', { detail: held }));
  }
  document.addEventListener('pointerlockchange', syncLock);
  // Never leave the mouse captured by a page that is going away or hidden.
  const release = () => { if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* ignore */ } } };
  window.addEventListener('pagehide', release);
  window.addEventListener('beforeunload', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  // If the GPU resets (driver crash, context lost under load) the canvas goes blank; a page holding the
  // mouse captured through that has been seen to leave Firefox's cursor stuck. Let go at once and say so.
  el.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    release();
    state.enabled = false; state.keys.clear();
    ctx.events.dispatchEvent(new CustomEvent('contextlost'));
  });
  el.addEventListener('webglcontextrestored', () => location.reload());
  // Drag-look mode: never ask for pointer lock; the mouse looks while the left button is held.
  // Chosen with ?lock=0, remembered in localStorage, or offered on the paused card when the lock misbehaves.
  function setDragLook(on) {
    state.dragLook = !!on;
    state.lockFailed = !!on;
    try { localStorage.setItem('fp-draglook', on ? '1' : '0'); } catch (e) { /* ignore */ }
    if (on) release();
    ctx.events.dispatchEvent(new CustomEvent('draglook', { detail: state.dragLook }));
  }
  try { if (url.searchParams.get('lock') === '0' || localStorage.getItem('fp-draglook') === '1') { state.dragLook = true; state.lockFailed = true; } } catch (e) { /* ignore */ }
  // In drag-look mode Esc is ours (no capture to release), so it toggles the pause.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && state.dragLook && state.enabled) ctx.events.dispatchEvent(new CustomEvent('pausetoggle'));
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

  // --- touch: a drawn thumbstick at bottom right, look from any other touch, a hop button
  const stickEl = document.getElementById('stick');
  const knobEl = document.getElementById('stick-knob');
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const RING_R = 60;                       // css px (ring is 120 wide)
  // A touch that starts within ZONE_R of the stick's home walks, and the ring moves under the thumb
  // if it lands outside it; any touch farther off looks. (The zone was once the whole lower-right
  // 40% x 45% of the screen, so in portrait a look drag from mid-screen grabbed the stick and
  // carried the ring there: #100.)
  const ZONE_R = 110;
  const moveVec = { x: 0, y: 0, mag: 0 }; // y positive = pulled down
  let moveTouch = null, lookTouch = null, cornerTimer = 0;
  let ringX = 0, ringY = 0;                // current ring centre, css px
  let homeX = 0, homeY = 0;                // the ring's CSS home, css px, measured at each touchstart
  const lookVel = { x: 0, y: 0 };          // rad/s inertia after release
  let lastLookT = 0;

  // At rest the ring carries no inline position, so the CSS (safe-area aware) places it wherever
  // the viewport now is; only a stick in use is pinned in px.
  function ringHome() {
    stickEl.style.left = ''; stickEl.style.top = ''; stickEl.style.bottom = ''; stickEl.style.transform = 'none';
    measureHome();
  }
  function measureHome() {
    const r = stickEl.getBoundingClientRect();
    homeX = ringX = r.left + r.width / 2; homeY = ringY = r.top + r.height / 2;
  }
  function placeRing(cx, cy) {
    stickEl.style.bottom = 'auto';
    stickEl.style.left = (cx - RING_R) + 'px'; stickEl.style.top = (cy - RING_R) + 'px';
    ringX = cx; ringY = cy;
  }
  function setKnob(dx, dy) { knobEl.style.transform = `translate(${dx}px, ${dy}px)`; }
  function inStickZone(x, y) { return Math.hypot(x - homeX, y - homeY) <= ZONE_R; }
  function inCorner(x, y) { return x > innerWidth - 72 && y < 72; }
  if (isTouch) document.body.classList.add('touch');
  ctx.events.addEventListener('begin', () => { if (isTouch) { document.body.classList.add('begun'); if (stickEl) ringHome(); } });
  // A viewport change (rotation, Safari's bars) moves the home: a held stick lets go and the ring
  // goes to the new home. iOS can also take the page away mid-drag (app switch, lock, notification
  // or Control Centre pull, a system alert) without a touchend or touchcancel, which left the stick
  // held where it was until the next touch: losing focus or visibility lets go of every touch.
  addEventListener('resize', () => { if (isTouch && stickEl) releaseMove(); });
  const dropTouches = () => { releaseMove(); releaseLook(); lookVel.x = lookVel.y = 0; };
  addEventListener('blur', dropTouches);
  addEventListener('pagehide', dropTouches);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') dropTouches(); });

  // A touch keeps the role it was given at touchstart for its whole life: one that starts in the
  // stick zone walks, any other looks. Mobile Safari reuses identifiers at once and can deliver a
  // new finger's touchstart before (or without) the old finger's touchend, so a tracked id can go
  // stale and then belong to a different finger. Every event first releases tracked touches the
  // browser no longer lists, and a touchstart that reuses a tracked id releases the old owner.
  function releaseMove() {
    if (!moveTouch) return;
    moveTouch = null; moveVec.x = moveVec.y = moveVec.mag = 0; setKnob(0, 0);
    stickEl.classList.remove('active'); ringHome();
  }
  function releaseLook() {
    if (!lookTouch) return;
    clearTimeout(cornerTimer);
    if (performance.now() - lastLookT > 80) lookVel.x = lookVel.y = 0; // held still: no fling
    lookTouch = null;
  }
  function listed(list, id) { for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return true; return false; }
  function reconcile(e) {
    if (moveTouch && !listed(e.touches, moveTouch.id)) releaseMove();
    if (lookTouch && !listed(e.touches, lookTouch.id)) releaseLook();
  }
  // A real thumb never covers this much ground between two touchmoves; a stale id that now
  // belongs to another finger does. Such a jump releases the stick and the finger looks instead.
  const STALE_JUMP = 160; // css px of finger travel in one event
  function startLook(t) {
    lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY };
    lookVel.x = lookVel.y = 0; lastLookT = performance.now();
    if (inCorner(t.clientX, t.clientY)) {
      clearTimeout(cornerTimer);
      cornerTimer = setTimeout(() => { if (lookTouch && lookTouch.corner) { ctx.debug?.reveal(); lookTouch = null; } }, 1200);
      lookTouch.corner = true;
    }
  }

  el.addEventListener('touchstart', (e) => {
    if (!isTouch) { document.body.classList.add('touch'); }
    reconcile(e);
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) releaseMove();
      if (lookTouch && t.identifier === lookTouch.id) releaseLook();
      if (!moveTouch && stickEl) measureHome();
      if (!moveTouch && stickEl && inStickZone(t.clientX, t.clientY)) {
        if (Math.hypot(t.clientX - ringX, t.clientY - ringY) > RING_R) {
          placeRing(clamp(t.clientX, RING_R, innerWidth - RING_R), clamp(t.clientY, RING_R, innerHeight - RING_R));
        }
        moveTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
        stickEl.classList.add('active');
        updateStick(t.clientX, t.clientY);
      } else if (!lookTouch) startLook(t);
    }
    if (!state.enabled && document.body.classList.contains('ready')) ctx.events.dispatchEvent(new CustomEvent('begin'));
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
    reconcile(e);
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        if (Math.hypot(t.clientX - moveTouch.x, t.clientY - moveTouch.y) > STALE_JUMP) {
          releaseMove();
          if (!lookTouch) startLook(t);
          continue;
        }
        moveTouch.x = t.clientX; moveTouch.y = t.clientY;
        updateStick(t.clientX, t.clientY);
      } else if (lookTouch && t.identifier === lookTouch.id) {
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
    reconcile(e); // e.touches is what remains
    for (const t of e.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) releaseMove();
      if (lookTouch && t.identifier === lookTouch.id) releaseLook();
    }
  };
  el.addEventListener('touchend', endTouch); el.addEventListener('touchcancel', endTouch);

  // --- the hop button, left of and below the stick's home. A sibling of the canvas: a touch that
  // starts on it is its own and never reaches the stick or look; one that drifts onto it does nothing.
  const jumpEl = document.getElementById('jump');
  if (jumpEl) {
    let jumpId = null;
    jumpEl.addEventListener('touchstart', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (jumpId === null) { jumpId = e.changedTouches[0].identifier; jumpEl.classList.add('held'); }
      hop();
    }, { passive: false });
    const jumpEnd = (e) => {
      e.stopPropagation();
      if (!listed(e.touches, jumpId)) { jumpId = null; jumpEl.classList.remove('held'); }
    };
    jumpEl.addEventListener('touchend', jumpEnd); jumpEl.addEventListener('touchcancel', jumpEnd);
    jumpEl.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    jumpEl.addEventListener('click', () => hop()); // assistive tech activates without touch events
  }
  // read-only view of the touch state, for tools/touch-test.mjs
  const touch = {
    moveVec,
    get ring() { if (!moveTouch && stickEl) measureHome(); return { x: ringX, y: ringY }; },
    get moveId() { return moveTouch ? moveTouch.id : null; },
    get lookId() { return lookTouch ? lookTouch.id : null; },
  };

  // --- walkable floors: fn(x, z) -> world y of a floor, or null
  // Walkable floors. Default: a floor can only raise the ground (decks, ramps). With
  // { replace: true } the floor replaces the terrain wherever it returns a value (a cut, a pit,
  // stairs going down), so the player can descend below the heightfield.
  const walkables = [], replacers = [];
  function addWalkable(fn, opts) { (opts && opts.replace ? replacers : walkables).push(fn); }
  function baseFloor(x, z) {
    for (const fn of replacers) { const h = fn(x, z); if (h !== null && h !== undefined) return h; }
    return terrain.heightAt(x, z);
  }
  ctx.addWalkable = addWalkable;

  // Put the player at (x, z) at ground height: inside the region, pushed out of colliders. A teleport: it ends a carry.
  function placeAt(x, z) {
    if (carried) dropCarry();
    for (let iter = 0; iter < 8; iter++) {
      let moved = false;
      const rr = Math.hypot(x, z), limit = walkLimit(x, z);
      if (rr > limit) { x *= limit / rr; z *= limit / rr; moved = true; }
      for (const c of state.colliders) {
        const t = along(c, x, z), px = c.len === undefined ? c.x : c.x1 + c.ux * t, pz = c.len === undefined ? c.z : c.z1 + c.uz * t;
        const dx = x - px, dz = z - pz, rad = c.r + 0.6;
        const d = Math.hypot(dx, dz);
        if (d < rad) {
          if (c.h !== undefined && c.y + c.h < terrain.heightAt(x, z)) continue;
          const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
          x = px + nx * rad; z = pz + nz * rad; moved = true;
        }
      }
      if (!moved) break;
    }
    const g = baseFloor(x, z), wl = g !== terrain.heightAt(x, z) ? null : terrain.waterLevelAt(x, z);
    let floor = g;
    if (wl !== null && g < wl) floor = Math.max(g, wl - 1.1);
    state.pos.set(x, floor + state.eye, z);
    state.vel.set(0, 0, 0); state.vy = 0; state.onGround = true; state.hopping = false; state.onTop = false;
    eyeOff = 0; lastY = null;
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

  // --- colliders: {x, z, r} cylinders of infinite height, or capped {x, z, r, y, h}: bottom y, top y + h.
  // A capsule {x1, z1, x2, z2, r, y, h, dh?} is a wall: the segment swept by r, its top y + h at (x1, z1) and
  // y + h + dh at (x2, z2) (x, z are set to its middle). A round one may take `dome`: its top falls by that much
  // toward its rim (a boulder). `stand: false` keeps a capped collider's top from being stood on (a pier's top
  // hidden under a deck, a figure's easel).
  //
  // Standing on things (issue #7), the one rule: a capped collider whose top the feet are above (less STEP_UP)
  // does not push, and while the feet are over its top (within its r + FOOT) the top is the walker's floor;
  // stepping off drops them. Rising in a hop, a top up to MANTLE above the feet that the walker moves toward does
  // not push either: they scramble onto it. So a hop (0.74 m) and a scramble reach about 1.4 m, chest height.
  // Uncapped colliders (trees, pillars, people) stay columns to the sky.
  const BODY = 0.45, STEP_UP = 0.12, FOOT = 0.15, MANTLE = 0.65;
  function addCollider(c) {
    if (c.x2 !== undefined) {
      const dx = c.x2 - c.x1, dz = c.z2 - c.z1, len = Math.hypot(dx, dz) || 1e-6;
      c.ux = dx / len; c.uz = dz / len; c.len = len; c.dh ||= 0;
      c.x = (c.x1 + c.x2) / 2; c.z = (c.z1 + c.z2) / 2;
      c.ex = Math.abs(dx) / 2 + c.r; c.ez = Math.abs(dz) / 2 + c.r;
    }
    state.colliders.push(c);
  }
  // how far along a capsule the point nearest (x, z) lies (0 for a round collider)
  function along(c, x, z) {
    if (c.len === undefined) return 0;
    const t = (x - c.x1) * c.ux + (z - c.z1) * c.uz;
    return t < 0 ? 0 : t > c.len ? c.len : t;
  }
  // a capped collider's top at distance d from its axis, t along it
  function topAt(c, t, d) {
    let y = c.y + c.h;
    if (c.len !== undefined) y += c.dh * t / c.len;
    if (c.dome) { const f = d / c.r; y -= c.dome * (f < 1 ? f * f : 1); }
    return y;
  }
  // --- carrying (v10): a module holds the player for a while (a seat on a rope) and gives them back.
  // carry({ step(pos, dt), drop() }) → release(). While carried, each frame step() sets pos (the eye) and nothing
  // else moves the player: no walking, hop, gravity or colliders; the look stays free, and state.intent (0..1) says
  // how hard the visitor is pushing to move, for the carrier to read. The carrier gives them back by calling
  // release() and then placing them (placeAt, or pos itself). A teleport (placeAt, or pos moved more than 1.5 m by
  // anyone else) ends the carry and calls drop(), so the carrier can let go of its end; a step() that throws ends it
  // too, and puts the player back where the carry began.
  let carried = null, carryAt = null;
  const carryFrom = new THREE.Vector3(); // where the carry began: a carrier that throws puts them back here
  function carry(c) {
    if (carried) dropCarry();
    carried = c; carryAt = null; state.carried = true; state.intent = 0; carryFrom.copy(state.pos);
    return () => { if (carried === c) { carried = null; carryAt = null; state.carried = false; } };
  }
  function dropCarry() {
    const c = carried; carried = null; carryAt = null; state.carried = false;
    try { c?.drop?.(); } catch (e) { console.error('[fp] carry drop failed:', e); }
  }
  const cand = new Array(32); // the capped colliders touched this frame whose tops may be stood on

  const EYE_TAU = 0.08, EYE_LAG = 0.4; // s, m
  let eyeOff = 0, lastY = null, eyeLim = EYE_LAG; // the eye's height less the feet's; how far it may lag
  const UP = new THREE.Vector3(0, 1, 0);
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3(), target = new THREE.Vector3();
  function update(dt) {
    syncLock();
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
    if (carried) {
      if (carryAt && Math.abs(state.pos.x - carryAt.x) + Math.abs(state.pos.y - carryAt.y) + Math.abs(state.pos.z - carryAt.z) > 1.5) dropCarry();
      else {
        state.intent = Math.min(1, hyp(mx, mz));
        try { carried.step(state.pos, dt); }
        catch (e) { console.error('[fp] carry step failed:', e); dropCarry(); placeAt(carryFrom.x, carryFrom.z); return; }
        (carryAt ||= new THREE.Vector3()).copy(state.pos);
        state.vel.set(0, 0, 0); state.vy = 0; state.onGround = true; state.hopping = false; state.onTop = false;
        state.moving = false; state.speed = 0; state.bobAmt = 0; state.wading = 0;
        eyeOff = 0; lastY = state.pos.y; state.eyeY = state.pos.y;
        camera.position.copy(state.pos);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(state.pitch, state.yaw, 0);
        return;
      }
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

    // slope slows you and stops you on the steep stuff; a raised floor (a deck, a stair) more than a metre
    // above the ground is level, whatever the slope beneath it
    const raised = state.onTop || state.pos.y - state.eye > terrain.heightAt(state.pos.x, state.pos.z) + 1;
    const n = raised ? UP : terrain.normalAt(state.pos.x, state.pos.z);
    const slope = raised ? 0 : Math.acos(clamp(n.y, -1, 1));
    const slopeFactor = 1 - smoothstep(0.55, 0.95, slope);

    const accel = state.onGround ? 14 : 3;
    target.copy(wish).multiplyScalar(maxSpeed * (0.35 + 0.65 * slopeFactor));
    state.vel.x += (target.x - state.vel.x) * Math.min(1, accel * dt);
    state.vel.z += (target.z - state.vel.z) * Math.min(1, accel * dt);
    // steep slopes push you back down
    if (slope > 0.95 && state.onGround) {
      state.vel.x += n.x * 9 * dt; state.vel.z += n.z * 9 * dt;
    }

    let nx = state.pos.x + state.vel.x * dt;
    let nz = state.pos.z + state.vel.z * dt;
    // region boundary (the mountains are impassable but for the saddle's wedge, v4 systems)
    const rr = hyp(nx, nz);
    const limit = walkLimit(nx, nz);
    if (rr > limit) { nx *= limit / rr; nz *= limit / rr; }
    // colliders (the rule for standing on them is at addCollider)
    const feetNow = state.pos.y - state.eye;
    let nCand = 0;
    for (const c of state.colliders) {
      const rad = c.r + BODY;
      let dx = nx - c.x, dz = nz - c.z, px = c.x, pz = c.z, t = 0;
      if (c.len === undefined) {
        if (dx > rad || dx < -rad || dz > rad || dz < -rad) continue;
      } else {
        if (dx > c.ex + BODY || dx < -c.ex - BODY || dz > c.ez + BODY || dz < -c.ez - BODY) continue;
        t = along(c, nx, nz); px = c.x1 + c.ux * t; pz = c.z1 + c.uz * t; dx = nx - px; dz = nz - pz;
      }
      const d = hyp(dx, dz);
      if (d >= rad) continue;
      if (c.h !== undefined) {
        if (feetNow < c.y - 0.5) continue; // under it
        const top = topAt(c, t, d);
        const over = feetNow > top - STEP_UP;
        const reach = !over && state.hopping && c.stand !== false && top - feetNow <= MANTLE && state.vel.x * dx + state.vel.z * dz < 0;
        if (over || reach) { if (c.stand !== false && nCand < cand.length) cand[nCand++] = c; continue; }
      }
      if (d > 1e-4) { nx = px + (dx / d) * rad; nz = pz + (dz / d) * rad; }
    }
    state.pos.x = nx; state.pos.z = nz;
    // the highest top under the feet, within a step (or, rising in a hop, a scramble) of them
    let standY = -Infinity;
    for (let i = 0; i < nCand; i++) {
      const c = cand[i], t = along(c, nx, nz);
      const d = c.len === undefined ? hyp(nx - c.x, nz - c.z) : hyp(nx - c.x1 - c.ux * t, nz - c.z1 - c.uz * t);
      if (d >= c.r + FOOT) continue;
      const top = topAt(c, t, Math.min(d, c.r));
      if (top > standY && top <= feetNow + (state.hopping ? MANTLE : STEP_UP)) standY = top;
    }

    // vertical: follow the ground, with a small jump
    const groundY = baseFloor(state.pos.x, state.pos.z);
    const wl = replacers.length && groundY !== terrain.heightAt(state.pos.x, state.pos.z) ? null : terrain.waterLevelAt(state.pos.x, state.pos.z);
    let floorY = groundY;
    if (wl !== null && groundY < wl) floorY = Math.max(groundY, wl - 1.1); // wade, don't sink
    // walkable floors (decks, ramps): within 1.2 m below the feet or 0.6 m above
    const feet0 = state.pos.y - state.eye;
    for (const fn of walkables) {
      const h = fn(state.pos.x, state.pos.z);
      if (h !== null && h !== undefined && h <= feet0 + 0.6 && h >= feet0 - 1.2 && h > floorY) floorY = h;
    }
    const onTop = standY > floorY;
    if (onTop) floorY = standY;
    const wasOnGround = state.onGround;
    state.vy -= 12 * dt;
    let feet = state.pos.y - state.eye + state.vy * dt;
    // stick to ground going downhill (faster speeds out-run gravity on slopes), down a stair's tread too
    if (state.onGround && state.vy <= 0 && feet > floorY && feet - floorY < 0.6) feet = floorY;
    if (feet <= floorY) { feet = floorY; state.vy = 0; state.onGround = true; state.hopping = false; } else state.onGround = false;
    state.onTop = onTop && state.onGround;
    // smooth the ground-follow a touch when walking
    const speed = hyp(state.vel.x, state.vel.z);
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
    // the feet follow the floor; the eye follows the feet, damped, for steps under 0.7 m
    const step = state.pos.y - (lastY ?? state.pos.y);
    if (wasOnGround && state.onGround && Math.abs(step) < 0.7) eyeOff -= step;
    else if (!wasOnGround && state.onTop && step > 0) { eyeOff -= step; eyeLim = MANTLE; } // a scramble: the eye follows up
    eyeLim = Math.max(EYE_LAG, eyeLim * Math.exp(-dt / EYE_TAU));
    eyeOff = clamp(eyeOff * Math.exp(-dt / EYE_TAU), -eyeLim, eyeLim); // first-order; never more than a riser and a bit behind
    lastY = state.pos.y;
    state.eyeY = state.pos.y + eyeOff;

    camera.position.set(state.pos.x + right.x * bobX, state.eyeY + bobY - wading * 0.15, state.pos.z + right.z * bobX);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(state.pitch, state.yaw, Math.sin(state.bob * 0.5) * 0.004 * state.bobAmt);
    state.wading = wading;
  }

  return { state, update, lock, addCollider, addWalkable, placeAt, setDragLook, release, hop, touch, carry };
}
