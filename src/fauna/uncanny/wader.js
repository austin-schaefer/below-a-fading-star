// The stilted wading thing: tall, thin and grey, two and a half metres at the shoulder on three stilt legs,
// its head down in the water. It stands in the shallows of the river's slow reach above the mouth and along
// the fen's edge. It is only ever seen at the edge of sight or far off: look straight at it (within ~12 degrees
// of centre) for more than ~0.7 s and when you look again it is not there. It fades out in 0.3 s and is
// somewhere else, 40 m or more away and out of view. It never lets you within 15 m. Cue: 'wader-gone' (quiet).
import * as THREE from 'three';
import { clamp, smoothstep } from '../geo.js';
import { Painter, paintedMaterial, DITHER_GLSL, approach } from './kit.js';

const GREY = '#8c8a90', GREY_D = '#5e5c64', BONE = '#a49d92';

function waderGeometry(low) {
  const P = new Painter();
  const sides = low ? 4 : 5;
  // three legs: feet splayed on a 1 m circle, a backward knee two-thirds up, meeting under the body
  const hip = [0, 2.5, -0.05];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    const fx = Math.sin(a) * 0.95, fz = Math.cos(a) * 0.95 - 0.05;
    const kx = Math.sin(a) * 0.62 - Math.sin(a) * 0.1, kz = Math.cos(a) * 0.62 - 0.32, ky = 1.62;
    P.paint(GREY_D, 0, 0.9);
    P.loft([[fx, -0.05, fz], [fx * 0.92, 0.6, fz * 0.92], [kx, ky, kz]], [0.018, 0.02, 0.026], sides);
    P.paint(GREY, 0, 0.9);
    P.blob(kx, ky, kz, 0.035, 0.035, 0.04, sides, 3); // the knee, a knuckle
    P.loft([[kx, ky, kz], [(kx + hip[0]) / 2, (ky + hip[1]) / 2 + 0.05, (kz + hip[2]) / 2], [hip[0] + Math.sin(a) * 0.05, hip[1], hip[2] + Math.cos(a) * 0.05]], [0.028, 0.033, 0.04], sides);
  }
  // the body: a short, keeled spindle, higher at the shoulder
  P.paint(GREY, 0, 0.88);
  P.loft([[0, 2.46, -0.55], [0, 2.52, -0.25], [0, 2.6, 0.1], [0, 2.66, 0.32], [0, 2.62, 0.44]], [[0.03, 0.04], [0.11, 0.14], [0.13, 0.17], [0.1, 0.13], [0.05, 0.06]], low ? 6 : 8);
  // a ridge of quills along the spine
  P.paint(GREY_D, 0, 0.95);
  for (let k = 0; k < 7; k++) { const z = -0.4 + k * 0.12; P.loft([[0, 2.6 + (k > 3 ? 0.06 : 0), z], [0, 2.8 + 0.04 * Math.sin(k * 1.7), z - 0.12]], [0.012, 0.002], 3); }
  // the neck: up off the shoulder, then a long fall forward and down, the head under the surface
  P.paint(GREY, 0, 0.88);
  const neck = [[0, 2.66, 0.38], [0, 2.92, 0.6], [0, 2.86, 0.92], [0, 2.4, 1.28], [0, 1.6, 1.58], [0, 0.8, 1.74], [0, 0.18, 1.8], [0, -0.1, 1.82]];
  P.loft(neck, [0.05, 0.042, 0.036, 0.032, 0.03, 0.028, 0.03, 0.03], sides + 1);
  // where the neck goes into the water, a pale collar of wet skin
  P.paint(BONE, 0, 0.5);
  P.blob(0, 0.32, 1.79, 0.04, 0.03, 0.05, sides + 1, 3);
  return P.geometry();
}

export function buildStiltWader(ctx, U) {
  const { scene, camera, terrain, landmarks } = ctx;
  const rng = ctx.makeRng(9606);
  const low = ctx.quality === 'low';

  // ---- where it may stand: water 0.2-0.6 m deep, the river's slow reach above the mouth and the fen's edge
  const spots = [];
  const okDepth = (x, z) => { if (terrain.waterLevelAt(x, z) === null) return false; const d = terrain.waterDepthAt(x, z); return d >= 0.2 && d <= 0.6; };
  const avoid = [landmarks.eddy, landmarks.speculum, landmarks.cutting].map((l) => [l.x, l.z, l.r + 10]);
  const free = (x, z) => avoid.every(([ax, az, r]) => Math.hypot(x - ax, z - az) > r) && spots.every((s) => Math.hypot(s.x - x, s.z - z) > 7);
  function consider(x, z, where) {
    if (!okDepth(x, z) || !free(x, z)) return;
    // all three feet in the shallows too
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; if (terrain.waterLevelAt(x + Math.sin(a), z + Math.cos(a)) === null) return; }
    // face so the head goes down into water at least as deep
    for (let j = 0; j < 8; j++) {
      const yaw = rng() * Math.PI * 2, hx = x + Math.sin(yaw) * 1.8, hz = z + Math.cos(yaw) * 1.8;
      if (terrain.waterLevelAt(hx, hz) !== null && terrain.waterDepthAt(hx, hz) > 0.3) { spots.push({ x, z, yaw, where }); return; }
    }
  }
  const M = { x: 134, z: 211 }; // the river's mouth into the fen, at the foot of its slow reach
  for (let k = 0; k < 900; k++) consider(M.x - 25 + rng() * 60, M.z - 26 + rng() * 52, 'reach');
  const F = landmarks.fen;
  for (let k = 0; k < 1400; k++) { const a = rng() * Math.PI * 2, r = 25 + rng() * 60; consider(F.x + Math.cos(a) * r, F.z + Math.sin(a) * r, 'fen'); }
  if (spots.length < 4) { ctx.log('uncanny: no shallows for the wader'); return { drawCalls: 0, tris: 0 }; }

  // ---- the thing
  const uni = { uFade: { value: 1 } };
  const patch = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFade;\n' + DITHER_GLSL)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (fpIGN(gl_FragCoord.xy) > uFade) discard;');
  };
  const mat = paintedMaterial({}, patch);
  const geo = waderGeometry(low);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'uncanny-wader';
  scene.add(mesh);

  const cam = camera.position, fwd = new THREE.Vector3(), aim = new THREE.Vector3(), frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 2.2);
  const S = { spot: null, mode: 'stand', fade: 1, look: 0, gone: 0, vanishes: 0, retry: 0, hold: false };
  function put(sp) {
    S.spot = sp;
    mesh.position.set(sp.x, terrain.heightAt(sp.x, sp.z), sp.z);
    mesh.rotation.set(0, sp.yaw, 0);
  }
  function inView(x, y, z) {
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pm);
    sph.center.set(x, y + 1.4, z);
    return frustum.intersectsSphere(sph);
  }
  // somewhere else: 40 m or more from where it was, 25 m or more from you, out of view; preferring a middle distance
  function relocate() {
    const from = S.spot;
    let best = null, bs = -1e9;
    for (const sp of spots) {
      if (from && Math.hypot(sp.x - from.x, sp.z - from.z) < 40) continue;
      const d = Math.hypot(sp.x - cam.x, sp.z - cam.z);
      if (d < 25) continue;
      if (inView(sp.x, terrain.heightAt(sp.x, sp.z), sp.z)) continue;
      const sc = -Math.abs(d - 60) + rng() * 25;
      if (sc > bs) { bs = sc; best = sp; }
    }
    if (!best) return false;
    put(best);
    return true;
  }
  put(spots[(rng() * spots.length) | 0]);
  const pub = ctx.wader2 = { position: mesh.position, state: S, spots };

  function update(dt, t) {
    if (S.hold) return;
    const p = mesh.position;
    const dist = Math.hypot(p.x - cam.x, p.z - cam.z);
    if (S.mode === 'stand') {
      // the gaze test: the middle of its height, against the centre of the view
      camera.getWorldDirection(fwd);
      aim.set(p.x - cam.x, p.y + 1.6 - cam.y, p.z - cam.z);
      const al = aim.length() || 1;
      const ang = Math.acos(clamp(fwd.dot(aim) / al, -1, 1));
      if (ang < 0.21 && al < 260) S.look += dt; else S.look = Math.max(0, S.look - dt * 1.5);
      if (S.look > 0.7 || dist < 15) {
        S.mode = 'fading'; S.look = 0; S.vanishes++;
        ctx.audio?.cue?.('wader-gone', { x: p.x, y: p.y + 1.5, z: p.z }, { quiet: true });
      }
      S.fade = approach(S.fade, 1, 2, dt);
      // a slow sway, the neck working as if it fed
      mesh.rotation.z = 0.012 * Math.sin(t * 0.4);
      mesh.rotation.x = 0.01 * Math.sin(t * 0.9 + 1);
    } else if (S.mode === 'fading') {
      S.fade = Math.max(0, S.fade - dt / 0.3);
      if (S.fade <= 0) { S.mode = 'gone'; S.retry = 0; }
    } else {
      if ((S.retry -= dt) <= 0) {
        S.retry = 1;
        if (relocate()) { S.mode = 'stand'; S.fade = 0; S.look = 0; }
      }
    }
    uni.uFade.value = smoothstep(0, 1, S.fade);
    mesh.visible = S.fade > 0.01 && S.mode !== 'gone';
    mesh.castShadow = S.fade > 0.9;
  }
  ctx.registerUpdate(update, { at: () => mesh.position, near: 120, hz: 5 }); // v3: 5 Hz beyond 120 m

  U.wader = Object.assign(pub, {
    // test hook: stand it at the spot nearest (x, z), facing as it was, and hold it there
    stage(x, z) { let b = spots[0], bd = 1e9; for (const s of spots) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } put(b); S.mode = 'stand'; S.fade = 1; S.hold = true; mesh.visible = true; uni.uFade.value = 1; return b; },
    release() { S.hold = false; },
  });
  return { drawCalls: 1, tris: geo.index.count / 3 };
}
