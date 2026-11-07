// The deodand: black, man-shaped, 2.3 m, standing at the edge of the wood. It never moves while the player
// can see it; when unseen it comes a few metres closer along the tree line. Within 9 m it is simply gone.
import * as THREE from 'three';
import { Mesher, clamp } from './geo.js';

function figureGeometry() {
  const M = new Mesher();
  const stoop = 0.1;
  // legs: long, a little bent, feet splayed
  for (const s of [-1, 1]) {
    M.loft([[0.1 * s, 1.2, 0], [0.13 * s, 0.75, 0.07], [0.12 * s, 0.38, -0.02], [0.13 * s, 0.05, 0.05]], [0.075, 0.06, 0.045, 0.04], 6);
    M.loft([[0.13 * s, 0.07, 0.03], [0.14 * s, 0.03, 0.2]], [[0.035, 0.03], [0.03, 0.02]], 5);
  }
  // pelvis, gaunt torso, narrow shoulders
  M.loft([[0, 1.15, 0], [0, 1.45, 0.02], [0, 1.78, 0.05 + stoop * 0.3], [0, 1.9, 0.07 + stoop * 0.5]], [[0.17, 0.11], [0.16, 0.1], [0.23, 0.1], [0.13, 0.09]], 8);
  // neck and head, tilted
  M.loft([[0, 1.9, 0.07], [0, 2.0, 0.13], [0.02, 2.1, 0.17]], [0.05, 0.045, 0.045], 6);
  M.loft([[0.02, 2.1, 0.16], [0.03, 2.2, 0.2], [0.05, 2.31, 0.19]], [[0.075, 0.08], [0.09, 0.1], [0.04, 0.03]], 8);
  // arms: too long, knuckles near the knee, fingers trailing
  for (const s of [-1, 1]) {
    M.loft([[0.24 * s, 1.84, 0.05], [0.31 * s, 1.5, 0.02], [0.34 * s, 1.12, 0.08], [0.33 * s, 0.82, 0.04]], [0.05, 0.04, 0.035, 0.032], 6);
    for (let f = 0; f < 4; f++) {
      const dx = (f - 1.5) * 0.022 * s;
      M.loft([[0.33 * s + dx, 0.84, 0.04 + (f - 1.5) * 0.015], [0.34 * s + dx, 0.68, 0.05 + (f - 1.5) * 0.02], [0.34 * s + dx * 1.5, 0.52, 0.04 + (f - 1.5) * 0.025]], [0.012, 0.009, 0.004], 4);
    }
  }
  return M.geometry();
}

export function buildDeodand(ctx) {
  const { scene, terrain, landmarks, camera, sky } = ctx;
  const rng = ctx.makeRng(303);
  const wood = landmarks.wood, byre = landmarks.byre;
  const mat = new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.42, metalness: 0.15 });
  const body = new THREE.Mesh(figureGeometry(), mat);
  body.castShadow = true; body.receiveShadow = true;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
  const eyeGeo = new THREE.SphereGeometry(0.024, 8, 6);
  const g = new THREE.Group();
  g.add(body);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.position.set(0.05 + 0.034 * s, 2.25, 0.275);
    g.add(e); eyes.push(e);
  }
  scene.add(g);

  const state = ctx.deodand = { position: g.position, visible: true, inView: false, distance: 99 };

  // wood-edge helpers
  const ok = (x, z) => {
    const wl = terrain.waterLevelAt(x, z);
    if (wl !== null && terrain.heightAt(x, z) < wl + 0.5) return false;
    return terrain.slopeAt(x, z) < 0.85;
  };
  // start: the tree line at r~88, a little way round from the byre so it is not inside the building
  const a0 = Math.atan2(byre.z - wood.z, byre.x - wood.x) - 0.3;
  let ang = a0, rad = 88;
  let px = wood.x + Math.cos(ang) * rad, pz = wood.z + Math.sin(ang) * rad;
  g.position.set(px, terrain.heightAt(px, pz), pz);

  const cam = camera.position, fwd = new THREE.Vector3();
  const COS_VIEW = Math.cos(0.8);
  const inViewOf = (x, y, z) => {
    const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z, l = Math.hypot(dx, dy, dz) || 1;
    return (fwd.x * dx + fwd.y * dy + fwd.z * dz) / l > COS_VIEW;
  };
  let hidden = 0, gone = 0, reappearAt = 0;
  const faceYaw = () => Math.atan2(cam.x - g.position.x, cam.z - g.position.z);
  g.rotation.y = faceYaw();

  function placeCandidates(count, spread, pickFn) {
    let best = null, bestScore = Infinity, bx = 0, bz = 0, ba = 0, br = 0;
    for (let k = 0; k < count; k++) {
      const a = spread < 0 ? rng() * Math.PI * 2 : ang + (rng() - 0.5) * 2 * spread;
      const r = 70 + rng() * 22;
      const x = wood.x + Math.cos(a) * r, z = wood.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > 285 || !ok(x, z)) continue;
      const y = terrain.heightAt(x, z);
      if (inViewOf(x, y + 1.2, z)) continue;
      const score = pickFn(Math.hypot(x - cam.x, z - cam.z));
      if (score < bestScore) { bestScore = score; bx = x; bz = z; ba = a; br = r; best = true; }
    }
    return best ? { x: bx, z: bz, a: ba, r: br, score: bestScore } : null;
  }

  function update(dt, t) {
    camera.getWorldDirection(fwd);
    const dx = cam.x - g.position.x, dz = cam.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    state.distance = dist;
    const f = sky.flicker.value;
    // eyes: pale glints, flaring when the sun gutters
    const flare = 1 + clamp((0.5 - f) / 0.3, 0, 1) * 7;
    eyeMat.color.setRGB(2.2 * flare, 2.0 * flare, 1.5 * flare);

    if (gone > 0) {
      gone -= dt; state.visible = false; g.visible = false; state.inView = false;
      if (gone <= 0) {
        const c = placeCandidates(30, -1, (d) => -d);
        if (c) { ang = c.a; rad = c.r; g.position.set(c.x, terrain.heightAt(c.x, c.z), c.z); g.rotation.y = faceYaw(); }
        g.visible = true; state.visible = true; hidden = 0;
      }
      return;
    }
    const view = inViewOf(g.position.x, g.position.y + 1.2, g.position.z);
    state.inView = view;
    if (dist < 9) { gone = 60 + rng() * 30; g.visible = false; state.visible = false; return; }
    if (view) { hidden = 0; return; }     // frozen while seen
    g.rotation.y = faceYaw();               // it always faces you (only turned while unseen)
    hidden += dt;
    if (hidden > 2.2) {
      hidden = 0;
      const step = 3 + rng() * 3.5, target = Math.max(18, dist - step);
      const c = placeCandidates(16, 0.22, (d) => Math.abs(d - target) + (d < 18 ? 50 : 0));
      if (c && Math.abs(c.score) < 40) {
        const nd = Math.hypot(c.x - cam.x, c.z - cam.z);
        // only ever come closer, never retreat out of the tree-line band
        if (nd < dist - 0.5 || dist > 90) {
          ang = c.a; rad = c.r;
          g.position.set(c.x, terrain.heightAt(c.x, c.z), c.z);
          g.rotation.y = faceYaw();
        }
      }
    }
  }
  ctx.registerUpdate(update);
}
