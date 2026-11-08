// H. The Wimpled Guest [Proposed]: a cowled woman standing by the dry fountain in the courtyard of the
// Pomegranate House, facing it, as if waiting to be served from it. A long black-violet robe, a mantle,
// a hood drawn forward over a face that is not there to see, and a pale wimple at the throat that stirs
// in the wind. She never moves. Look at her too long and a heartbeat rises while the edges of the
// screen flush red and drowsy; look away and it ebbs.
import * as THREE from 'three';
import { Painter, paintedMaterial } from '../../fauna/uncanny/kit.js';
import { smoothstep, clamp } from '../../fauna/geo.js';

const ROBE = '#0b080b', ROBE_D = '#070507', MANTLE = '#0e0a0d', WIMPLE = '#8c8476', WIMPLE_D = '#6e675b', VOID = '#010101';
const TAU = Math.PI * 2;

// Courtyard geometry from src/structures/taverna.js (not ours to import from): the compound is a square
// of half-side 13 about (95,-45), the fountain basin is an octagon of radius 2.5 at its centre and the
// gate is a 3.2 m gap in the north wall.
const COURT = { x: 95, z: -45, half: 13, basin: 2.5, gateHalf: 1.6 };

function guestGeometry(low) {
  const P = new Painter(['aSway']);
  const nu = low ? 28 : 40;
  // ---- the robe: pooled at the hem, narrow at the waist, high-shouldered; deep vertical folds
  P.paint(ROBE, 0, 0.96);
  P.grid(nu, low ? 12 : 18, (u, v, o) => {
    const a = u * TAU, y = -0.04 + v * 1.5;
    const r = 0.44 - 0.2 * smoothstep(0.0, 0.62, v) + 0.02 * smoothstep(0.7, 0.86, v) - 0.03 * smoothstep(0.9, 1.0, v);
    const foldAmp = 0.1 * (1 - v) * (1 - v) + 0.015;
    const fold = 1 + foldAmp * (Math.abs(Math.sin(a * 4.5 + 0.7 * Math.sin(a * 2 + 1))) * 1.4 - 0.7);
    // a short train behind (-z), the front falling straight
    const train = (Math.sin(a) < 0 ? -Math.sin(a) : 0) * 0.16 * smoothstep(0.25, 0, v);
    P.set('aSway', smoothstep(0.3, 0.0, v) * 0.7);
    if (v < 0.04) P.paint(ROBE_D, 0, 0.98); else P.paint(ROBE, 0, 0.95);
    o[0] = Math.cos(a) * r * fold; o[1] = y + (v === 0 ? 0.015 * Math.sin(a * 9) : 0); o[2] = Math.sin(a) * (r * 0.78 * fold + train) + 0.01;
  }, true, true);
  P.set('aSway', 0);
  // ---- sleeves: the arms hang and meet in front at the waist; long cuffs swallow the hands
  for (const sx of [-1, 1]) {
    P.paint(ROBE, 0, 0.95);
    P.set('aSway', 0.1);
    P.loft([[sx * 0.2, 1.4, 0.0], [sx * 0.24, 1.17, 0.03], [sx * 0.19, 0.99, 0.12], [sx * 0.08, 0.92, 0.19], [sx * 0.01, 0.91, 0.205]],
      [0.055, 0.062, 0.07, 0.08, 0.085], low ? 8 : 10, 0, false);
    // the cuff hangs open below the wrists
    P.set('aSway', 0.5);
    P.sheet(6, 3, (u, v, o) => {
      const a = Math.PI * (0.15 + 0.7 * u);
      o[0] = sx * (0.07 - 0.06 * u); o[1] = 0.9 - v * 0.2 - 0.03 * Math.sin(u * Math.PI); o[2] = 0.2 + Math.sin(a) * 0.06 - v * 0.015;
    });
  }
  P.set('aSway', 0);
  // ---- the mantle over the shoulders, open at the front, its hem ragged and loose
  P.paint(MANTLE, 0, 0.94);
  P.sheet(low ? 20 : 30, low ? 5 : 7, (u, v, o) => {
    const a = Math.PI * 0.5 + (u - 0.5) * Math.PI * 1.42 + Math.PI; // centred on the back (-z)
    const y = 1.56 - v * (0.5 + 0.06 * Math.sin(u * 23) + 0.04 * Math.sin(u * 41 + 1));
    const r = 0.13 + 0.15 * smoothstep(0, 0.35, v) + 0.04 * v;
    P.set('aSway', v * v * 1.3);
    o[0] = Math.cos(a) * r * 1.05; o[1] = y; o[2] = Math.sin(a) * r * 0.86 + 0.0;
  });
  P.set('aSway', 0);
  const bow = new THREE.Matrix4().makeTranslation(0, 1.48, 0).multiply(new THREE.Matrix4().makeRotationX(0.2)).multiply(new THREE.Matrix4().makeTranslation(0, -1.48, 0));
  // ---- the wimple: a gorget wrapped about the throat and chin, and a bib falling over the breast
  P.paint(WIMPLE, 0, 0.92, 0.07);
  P.xf(bow);
  P.grid(low ? 14 : 18, 4, (u, v, o) => {
    const a = u * TAU, y = 1.46 + v * 0.2;
    const r = 0.1 + 0.025 * (1 - v) + 0.012 * Math.sin(a * 6);
    o[0] = Math.cos(a) * r; o[1] = y; o[2] = Math.sin(a) * r * 0.95 + 0.02;
  }, false, false);
  P.xf(null);
  P.sheet(low ? 9 : 12, low ? 6 : 8, (u, v, o) => {
    const w = 0.11 + 0.05 * v, a = (u - 0.5) * 2 * w / 0.23; // across the chest
    const r = 0.21 + 0.045 * smoothstep(0.2, 0.7, v) + 0.012;
    const y = 1.5 - v * 0.3 - 0.05 * Math.cos((u - 0.5) * Math.PI) * v;
    P.set('aSway', smoothstep(0.35, 1, v) * 1.6);
    if (v > 0.75) P.paint(WIMPLE_D, 0, 0.94, 0.1); else P.paint(WIMPLE, 0, 0.92, 0.15);
    o[0] = Math.sin(a) * r; o[1] = y; o[2] = Math.cos(a) * r * 0.82 + 0.02;
  });
  P.set('aSway', 0);
  // the wimple's veil-band across the brow, inside the hood
  P.xf(bow);
  P.paint(WIMPLE_D, 0, 0.94, 0.16);
  P.sheet(10, 2, (u, v, o) => {
    const a = (u - 0.5) * 2.2;
    o[0] = Math.sin(a) * 0.112; o[1] = 1.79 - v * 0.045; o[2] = Math.cos(a) * 0.105 + 0.02;
  });
  // ---- where the face should be: nothing that takes the light
  P.paint(VOID, 0, 1);
  P.blob(0, 1.7, 0.03, 0.095, 0.11, 0.1, 10, 6);
  // ---- the hood: drawn well forward, open only in a narrow window at the front
  P.paint(MANTLE, 0, 0.94);
  P.sheet(low ? 18 : 26, low ? 9 : 12, (u, v, o) => {
    // v: 0 at the shoulders, 1 at the crown; u: round the head from the front-left edge, by the back, to the front-right
    const open = 0.62 - 0.36 * smoothstep(0.55, 1.0, v);                 // half-angle of the face window
    const a = Math.PI / 2 + open + u * (TAU - 2 * open);                   // +pi/2 is the front (+z)
    const y = 1.52 + v * 0.42;
    const r = (0.2 - 0.07 * smoothstep(0.0, 0.35, v)) * Math.sqrt(Math.max(0.0, 1 - Math.pow(smoothstep(0.45, 1.0, v), 1.6)));
    const edge = Math.min(u, 1 - u);                                       // 0 at the window's rim
    const lip = smoothstep(0.08, 0.0, edge);                               // the rim rolls forward
    const peak = smoothstep(0.7, 1.0, v) * 0.03;                           // the crown peaks forward
    P.set('aSway', 0.05);
    o[0] = Math.cos(a) * r * (1 + 0.04 * lip); o[1] = y; o[2] = Math.sin(a) * r * 1.08 + 0.02 + lip * 0.04 + peak;
  });
  P.xf(null);
  return P.geometry();
}

// The flush: a full-screen quad of our own, drawn last over the scene. post.js has its own vignette
// but exposes no uniform for this, so the red stays here.
function flushOverlay() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uPulse: { value: 0 }, uAspect: { value: 16 / 9 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform float uA, uPulse, uAspect; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= mix(1.0, uAspect, 0.35);
        p.y *= 1.18;                                  // heavier at the top and bottom, like lids
        float r = length(p);
        float grow = 0.75 - 0.35 * uA;                // the red creeps inward as it deepens
        float edge = smoothstep(grow, grow + 0.85, r);
        vec3 blood = mix(vec3(0.05, 0.0, 0.004), vec3(0.42, 0.02, 0.03), smoothstep(0.2, 1.0, edge));
        float a = uA * (0.16 + 0.84 * edge) * (0.88 + 0.12 * uPulse);
        gl_FragColor = vec4(blood, a);
      }`,
    transparent: true, depthTest: false, depthWrite: false, fog: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false; quad.renderOrder = 10000; quad.name = 'inhabitants-guest-flush';
  quad.visible = false;
  return quad;
}

export function buildGuest(ctx) {
  const { scene, camera, terrain } = ctx;
  const low = ctx.quality === 'low';
  // 1.5 m out from the basin's rim, south-south-west of the column, so that from the gate she shows
  // beside the fountain rather than behind it; facing the fountain, which is to say facing the gate.
  const bear = Math.PI / 2 + 0.6;                       // from +x toward +z: south, swung west
  const dist = COURT.basin + 1.5;
  const x = COURT.x + Math.cos(bear) * dist, z = COURT.z + Math.sin(bear) * dist;
  const gy = terrain.heightAt(x, z);
  const yaw = Math.atan2(COURT.x - x, COURT.z - z);

  const mat = paintedMaterial({ side: THREE.DoubleSide }, undefined, true);
  const body = new THREE.Mesh(guestGeometry(low), mat);
  body.name = 'inhabitants-guest'; body.castShadow = true; body.receiveShadow = true;
  body.position.set(x, gy - 0.02, z); body.rotation.y = yaw;
  body.scale.setScalar(1.04);
  scene.add(body);
  ctx.addCollider({ x, z, r: 0.45 });

  const flush = flushOverlay();
  scene.add(flush);
  const U = flush.material.uniforms;

  // gaze: the camera's forward within a few degrees of her breast, within 25 m, and a clear line
  const fwd = new THREE.Vector3(), to = new THREE.Vector3();
  const chest = new THREE.Vector3(x, gy + 1.35, z);
  const S = { gaze: 0, lost: 0, level: 0, beatT: 0, pulse: 0, strength: 0, gazing: false };
  function lineClear(px, pz) {
    // the compound's walls block her unless you are inside or looking in through the gate
    const lx = px - COURT.x, lz = pz - COURT.z, h = COURT.half;
    if (Math.abs(lx) < h - 0.5 && Math.abs(lz) < h - 0.5) return true;
    if (lz > -h || Math.abs(lx) > h + 30) return false;             // only the north wall has a gate
    const gx = x - COURT.x, gz = z - COURT.z;
    const t = (-h - lz) / (gz - lz);                                 // where the sight line crosses the north wall
    const cx = lx + (gx - lx) * t;
    return t >= 0 && t <= 1 && Math.abs(cx) < COURT.gateHalf - 0.2;
  }
  function update(dt, t) {
    mat.userData.uT.value = t;
    const cam = camera.position;
    to.copy(chest).sub(cam);
    const d = to.length();
    let looking = false;
    if (d < 25 && d > 0.3) {
      camera.getWorldDirection(fwd);
      const ang = Math.acos(clamp(fwd.dot(to) / d, -1, 1));
      const allow = Math.max(0.11, Math.atan(0.95 / d) * 1.15);
      looking = ang < allow && lineClear(cam.x, cam.z);
    }
    // a glance away shorter than a quarter second is forgiven; longer, and it starts again
    if (looking) { S.gaze += dt; S.lost = 0; }
    else if ((S.lost += dt) > 0.25) S.gaze = 0;
    S.gazing = S.gaze > 2;
    const target = S.gazing ? smoothstep(2, 10, S.gaze) : 0;
    // rises with the gaze; ebbs over three seconds when it breaks
    S.level = target > S.level ? Math.min(target, S.level + dt * 0.5) : Math.max(target, S.level - dt / 3);
    S.strength = S.level;
    if (S.gazing) {
      S.beatT -= dt;
      if (S.beatT <= 0) {
        S.beatT = 0.8 + 0.55 * (1 - S.level);                        // at most every 0.8 s; quicker as it rises
        S.pulse = 1;
        ctx.audio?.cue?.('guest-heartbeat', body.position, { strength: Math.max(0.05, S.level) });
      }
    } else S.beatT = 0;
    S.pulse = Math.max(0, S.pulse - dt * 3);
    const a = S.level * 0.35;
    U.uA.value = a;
    U.uPulse.value = S.pulse;
    U.uAspect.value = camera.aspect;
    flush.visible = a > 0.002;
  }
  ctx.registerUpdate(update);

  const tri = body.geometry.index.count / 3;
  return {
    api: {
      position: body.position, yaw, state: S, mesh: body,
      // test hooks: aim the camera at her breast, or away
      tick: (dt, t) => update(dt, t),
      lookAt() { const p = ctx.player; to.copy(chest).sub(p.pos); p.yaw = Math.atan2(-to.x, -to.z); p.pitch = Math.atan2(to.y, Math.hypot(to.x, to.z)); },
    },
    drawCalls: 2, tris: tri + 2,
  };
}
