// Rooks at the Leaning Yard: a dozen, perched on the tops of the leaning stones, the lid of the great tomb
// and the kerb of the Hypogeum's cut next door. Come within 12 m and they all lift at once, wheel over the
// yard for a while, and come down again on the perches farthest from you. One 'rooks-lift' cue per lift.
// Perches are found by casting down onto the structures' and ruins' meshes once they exist (either may
// build after fauna), so the flock follows the yard wherever the structures module puts it.
import * as THREE from 'three';
import { flapMaterial, flapInstanced, lerp, makeDownCaster } from './geo.js';
import { crowGeometry } from './small.js';

const rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3(), hits = [];
const cast = (objs, x, z) => { o.set(x, 80, z); rc.set(o, down); rc.far = 160; hits.length = 0; rc.intersectObjects(objs, false, hits); return hits.length ? hits[0].point.y : null; };
const structureMeshes = (scene) => { const a = []; scene.traverse((m) => { if (m.isMesh && /^structures-/.test(m.name) && !m.isInstancedMesh) a.push(m); }); return a; };

export function buildRooks(ctx) {
  const { scene, terrain, landmarks } = ctx;
  const N = ctx.quality === 'low' ? 9 : 12;
  const yard = { x: landmarks.graveyard.x, z: landmarks.graveyard.z };
  let tries = 0;
  return buildFlock(ctx, { name: 'rooks', n: N, salt: 1212, home: yard, liftR: 12, cue: 'rooks-lift', orbit: [8, 15], height: [8, 14], findPerches: () => {
    const stones = scene.getObjectByName('structures-gravestones');
    const hyp = ctx.hypogeum;
    // wait for the Hypogeum too (ruins2), for up to 20 tries
    if (!stones || (!hyp && tries++ < 20)) return null;
    const note = ctx.structures?.notes?.graveyard;
    if (note) { yard.x = note.x; yard.z = note.z; }
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), up = new THREE.Vector3();
    const cand = [];
    for (let i = 0; i < stones.count; i++) {
      stones.getMatrixAt(i, m4);
      p.setFromMatrixPosition(m4);
      if (Math.hypot(p.x - yard.x, p.z - yard.z) > 16) continue;
      up.set(m4.elements[4], m4.elements[5], m4.elements[6]).normalize();
      if (up.y < 0.75) continue; // fallen
      const y = cast([stones], p.x, p.z);
      if (y !== null && y > terrain.heightAt(p.x, p.z) + 0.5) cand.push({ x: p.x, y, z: p.z });
    }
    // the tomb's lid, at the yard's middle
    const structs = structureMeshes(scene);
    for (const [dx, dz] of [[-0.6, 0], [0.6, 0.1]]) {
      const y = cast(structs, yard.x + dx, yard.z - 0.3 + dz);
      if (y !== null && y > terrain.heightAt(yard.x, yard.z) + 0.9) cand.push({ x: yard.x + dx, y, z: yard.z - 0.3 + dz });
    }
    // the Hypogeum's kerb: the rim of its cut, along both side walls
    const ruin = scene.getObjectByName('ruins-hypogeum');
    if (hyp && ruin) {
      const castRuin = makeDownCaster([ruin]);
      const x0 = hyp.stairTop.x, x1 = hyp.door.x, zc = hyp.door.z;
      for (let x = x0 + 0.5; x < x1 - 0.2; x += 1.1) for (const s of [-1, 1]) {
        let best = null;
        for (let dz = 1.0; dz < 3.4; dz += 0.2) {
          const z = zc + s * dz, y = castRuin(x, z);
          if (y !== null && y > terrain.heightAt(x, z) - 0.3 && (!best || y > best.y)) best = { x, y, z };
        }
        if (best) cand.push(best);
      }
    }
    return cand.length >= N ? cand : null;
  } });
}

// Crows on the gibbet by the causeway, between the keep and the Cardinal Stones: three, on the beam and the
// post's top, lifting when you pass under (the same 'crows' cue as the keep's).
export function buildGibbetCrows(ctx) {
  const { scene, terrain } = ctx;
  const home = { x: 0, z: 0 };
  return buildFlock(ctx, { name: 'gibbet-crows', n: 3, salt: 1313, home, liftR: 9, cue: 'crows', orbit: [5, 9], height: [6, 10], findPerches: () => {
    const g = ctx.structures?.notes?.gibbet;
    if (!g) return null;
    home.x = g.x; home.z = g.z;
    const castObjs = makeDownCaster(structureMeshes(scene)), gm = terrain.heightAt(g.x, g.z), cand = [];
    for (let dz = -2.6; dz <= 2.6; dz += 0.18) for (let dx = -2.6; dx <= 2.6; dx += 0.18) {
      const x = g.x + dx, z = g.z + dz, y = castObjs(x, z);
      if (y === null || y < gm + 4.4) continue;
      if (cand.some((c) => Math.hypot(c.x - x, c.z - z) < 0.5)) continue;
      cand.push({ x, y, z });
    }
    return cand.length >= 3 ? cand : null;
  } });
}

function buildFlock(ctx, opts) {
  const { scene, terrain, camera } = ctx;
  const rng = ctx.makeRng(opts.salt);
  const N = opts.n;
  const mat = flapMaterial({ color: 0x0b0a0d, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const { mesh, flap, fold } = flapInstanced(crowGeometry(), mat, N);
  mesh.name = opts.name; mesh.visible = false; scene.add(mesh);
  const cam = camera.position;
  const perches = []; // { x, y, z, taken }
  const yard = opts.home;
  let found = false, lookT = 0;
  function findPerches() {
    const c = opts.findPerches();
    if (!c) return false;
    perches.push(...c.map((p) => ({ ...p, taken: -1 })));
    return true;
  }

  // ---- birds
  const B = Array.from({ length: N }, () => ({
    mode: 0, perch: -1, pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: rng() * 6.28, fl: 0, flPh: rng() * 6, foldV: 1,
    delay: 0, orbit: rng() * 6.28, orbitR: opts.orbit[0] + rng() * (opts.orbit[1] - opts.orbit[0]), orbitY: opts.height[0] + rng() * (opts.height[1] - opts.height[0]), orbitW: (0.32 + rng() * 0.2) * (rng() < 0.3 ? -1 : 1), hop: 3 + rng() * 10, sc: 0.82 + rng() * 0.12,
  }));
  const farthestFree = (avoid) => {
    let best = -1, bd = -1;
    for (let k = 0; k < perches.length; k++) {
      if (perches[k].taken >= 0) continue;
      const d = Math.hypot(perches[k].x - cam.x, perches[k].z - cam.z) + rng() * 6;
      if (avoid && d < opts.liftR + 2) continue;
      if (d > bd) { bd = d; best = k; }
    }
    return best;
  };
  function seat(b, i, k) {
    if (b.perch >= 0) perches[b.perch].taken = -1;
    b.perch = k; perches[k].taken = i;
    b.pos.set(perches[k].x, perches[k].y, perches[k].z); b.vel.set(0, 0, 0); b.mode = 0; b.foldV = 1;
  }
  let flightT = 0, cool = 0, lifts = 0;
  const centre = new THREE.Vector3();
  function lift() {
    lifts++; flightT = 9 + rng() * 6; cool = 6;
    centre.set(0, 0, 0);
    for (const b of B) {
      centre.add(b.pos);
      if (b.perch >= 0) { perches[b.perch].taken = -1; b.perch = -1; }
      b.mode = 1; b.delay = rng() * 0.7;
      b.vel.set((b.pos.x - cam.x) * 0.2 + (rng() - 0.5), 3.5 + rng() * 2, (b.pos.z - cam.z) * 0.2 + (rng() - 0.5));
    }
    centre.multiplyScalar(1 / N);
    ctx.audio?.cue?.(opts.cue, centre, { count: N });
  }
  const pub = (ctx.flocks ||= {})[opts.name] = { birds: B, perches, lifts: () => lifts, lift, flying: () => B.some((b) => b.mode !== 0) };

  const up = new THREE.Vector3(0, 1, 0), bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const des = new THREE.Vector3();
  function update(dt, t) {
    if (!found) {
      if ((lookT -= dt) > 0) return;
      lookT = 1;
      if (!(found = findPerches())) return;
      B.forEach((b, i) => seat(b, i, farthestFree(false)));
      mesh.visible = true;
    }
    const far = Math.hypot(cam.x - yard.x, cam.z - yard.z) > 260;
    mesh.visible = !far;
    if (far) return;
    cool -= dt;
    if (flightT <= 0 && cool <= 0) {
      for (const b of B) if (b.mode === 0 && Math.hypot(b.pos.x - cam.x, b.pos.z - cam.z) < opts.liftR && Math.abs(b.pos.y - cam.y) < 10) { lift(); break; }
    }
    if (flightT > 0) {
      flightT -= dt;
      if (flightT <= 0) {
        // come down on the perches farthest from you; keep wheeling if there is nowhere far enough
        let ok = true;
        B.forEach((b, i) => { const k = farthestFree(true); if (k < 0) { ok = false; return; } b.perch = k; perches[k].taken = i; b.mode = 2; });
        if (!ok) { for (const b of B) if (b.mode === 2) { perches[b.perch].taken = -1; b.perch = -1; b.mode = 1; } flightT = 4; }
      }
    }
    const gy = terrain.heightAt(yard.x, yard.z);
    for (let i = 0; i < N; i++) {
      const b = B[i];
      if (b.mode === 0) {
        b.hop -= dt;
        if (b.hop <= 0) { b.hop = 3 + rng() * 12; b.yaw += (rng() - 0.5) * 1.8; }
        flap.array[i] = -0.25; fold.array[i] = 1;
        bz.set(Math.sin(b.yaw), 0, Math.cos(b.yaw));
      } else {
        if (b.delay > 0) { b.delay -= dt; b.foldV += (0.3 - b.foldV) * Math.min(1, dt * 10); }
        else {
          let speed;
          if (b.mode === 1) {
            b.orbit += b.orbitW * dt;
            des.set(yard.x + Math.cos(b.orbit) * b.orbitR, gy + b.orbitY + 2 * Math.sin(t * 0.5 + i), yard.z + Math.sin(b.orbit) * b.orbitR);
            speed = 7.5;
          } else {
            const p = perches[b.perch];
            des.set(p.x, p.y, p.z);
            const d = b.pos.distanceTo(des);
            speed = Math.min(7.5, 0.6 + d * 1.1);
            if (d < 0.22) { seat(b, i, b.perch); b.yaw = Math.atan2(b.vel.x, b.vel.z) || b.yaw; continue; }
            // above the perch and dropping onto it, not skimming in
            if (d > 3) des.y += Math.min(3, d * 0.3);
          }
          des.sub(b.pos);
          const dl = des.length() || 1;
          des.multiplyScalar(speed / dl);
          b.vel.lerp(des, Math.min(1, dt * (b.mode === 2 ? 2.4 : 1.6)));
          b.pos.addScaledVector(b.vel, dt);
          const near = b.mode === 2 && b.pos.distanceTo(des.set(perches[b.perch].x, perches[b.perch].y, perches[b.perch].z)) < 2.5;
          b.fl += ((near ? 1 : b.vel.y > 0.4 || rng() < 0.02 ? 1 : 0.35) - b.fl) * Math.min(1, dt * 4);
          b.flPh += dt * Math.PI * 2 * (5.5 + 3 * b.fl);
          b.foldV += ((near && b.vel.length() < 1.2 ? 0.6 : 0) - b.foldV) * Math.min(1, dt * 6);
        }
        flap.array[i] = lerp(0.12, 0.1 + 0.95 * Math.sin(b.flPh), b.fl);
        fold.array[i] = b.foldV;
        if (b.vel.lengthSq() > 0.01) { bz.copy(b.vel).normalize(); if (Math.abs(bz.y) > 0.5) { bz.y = 0.5 * Math.sign(bz.y); bz.normalize(); } }
        else bz.set(Math.sin(b.yaw), 0, Math.cos(b.yaw));
      }
      bx.crossVectors(up, bz).normalize(); by.crossVectors(bz, bx);
      m4.makeBasis(bx, by, bz);
      const e = m4.elements; for (let k = 0; k < 12; k++) e[k] *= b.sc;
      m4.setPosition(b.pos.x, b.pos.y + (b.mode === 0 ? 0.03 : 0), b.pos.z);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = flap.needsUpdate = fold.needsUpdate = true;
  }
  ctx.registerUpdate(update);
  // test hook: run it forward (seconds) without rendering
  pub.advance = (sec, step = 0.05) => { for (let k = 0; k < sec; k += step) update(step, ctx.time.t + k); };
  return pub;
}
