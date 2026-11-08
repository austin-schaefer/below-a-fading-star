// Beetles on the Hypogeum's bronze door: small, black, with a dull green sheen, crawling slowly over the
// door face in random walks that drift toward the two rings and dawdle there, so they cluster about them.
// Within 2 m of you they all freeze. Now and then one lets go, drops to the floor of the cut and crawls off
// into a crack; later another comes up over the threshold. One InstancedMesh. The door comes from
// ctx.hypogeum.door (ruins2, which may build after fauna: looked for each second until it appears). No audio.
import * as THREE from 'three';
import { Mesher, clamp, smoothstep } from './geo.js';
import { hyp } from '../noise.js';

function beetleGeometry() {
  const M = new Mesher();
  // forward +z, up +y, about 1 unit long (scaled to ~1.6 cm): elytra, pronotum, head, six legs
  M.blob(0, 0.16, -0.1, 0.27, 0.2, 0.42, 7, 5);
  M.blob(0, 0.15, 0.36, 0.2, 0.13, 0.13, 6, 3);
  M.blob(0, 0.1, 0.52, 0.11, 0.08, 0.08, 5, 3);
  for (const s of [-1, 1]) for (const [z, a] of [[0.3, 0.6], [0.05, 0], [-0.2, -0.6]]) {
    M.loft([[0.18 * s, 0.1, z], [0.42 * s, 0.14, z + Math.sin(a) * 0.2], [0.55 * s, 0, z + Math.sin(a) * 0.35]], [0.025, 0.02, 0.012], 3, 0, false);
  }
  for (const s of [-1, 1]) M.loft([[0.06 * s, 0.12, 0.58], [0.16 * s, 0.16, 0.8], [0.22 * s, 0.14, 0.95]], [0.015, 0.01, 0.006], 3, 0, false);
  return M.geometry();
}

export function buildBeetles(ctx) {
  const { scene, camera } = ctx;
  const rng = ctx.makeRng(1616);
  const N = ctx.quality === 'low' ? 16 : 26;
  const geo = beetleGeometry();
  // black, with the green of old bronze in the highlights only
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e3a28, metalness: 0.85, roughness: 0.34 });
  // and a dull green glint at the rims of the wing cases, so they read on the dark bronze
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0); totalEmissiveRadiance += vec3(0.05, 0.13, 0.08) * fr; }`);
  };
  mat.customProgramCacheKey = () => 'fp-beetle-sheen';
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.visible = false; mesh.name = 'door-beetles'; mesh.receiveShadow = true;
  scene.add(mesh);
  const cam = camera.position;

  let D = null, lookT = 0;
  // door frame (filled in once the door exists): face plane x = fx, outward normal -x; s along +z, h up
  const F = { fx: 0, zc: 0, y0: 0, H: 2.5, half: 0.8, rings: [], rails: [], stiles: [], floor: 0 };
  function setup(door) {
    D = door;
    F.fx = door.x; F.zc = door.z; F.half = door.width / 2;
    F.y0 = door.y - 1.27 + 0.02; F.H = door.height - 0.03; F.floor = ctx.hypogeum.floor ?? (door.y - 1.27);
    F.rings = [[-0.17, F.y0 - 0.02 + 1.16], [0.17, F.y0 - 0.02 + 1.16]];
    F.rails = [0.03, 0.34, 0.66, 0.97].map((f) => F.y0 + F.H * f);
    F.stiles = [-(F.half - 0.05), -0.05, 0.05, F.half - 0.05];
    for (const b of B) { spawnOnDoor(b, true); }
    mesh.visible = true;
  }
  // how far the surface stands out from the leaf at (s, h): on a rail or a stile the beetle rides 3.5 cm out
  const relief = (s, h) => {
    for (const y of F.rails) if (Math.abs(h - y) < 0.045) return 0.035;
    for (const z of F.stiles) if (Math.abs(s - z) < 0.045) return 0.035;
    return 0;
  };
  const B = Array.from({ length: N }, () => ({
    mode: 'door', s: 0, h: 0, x: 0, y: 0, z: 0, head: 0, speed: 0.025, off: 0, vy: 0, t: 0, sc: 0.02 + rng() * 0.008, pause: 0, life: 1,
  }));
  function spawnOnDoor(b, anywhere) {
    b.mode = 'door'; b.life = 1;
    if (anywhere) {
      // a few already round the rings, the rest anywhere on the leaves
      if (rng() < 0.6) { const r = F.rings[(rng() * 2) | 0]; b.s = r[0] + (rng() - 0.5) * 0.3; b.h = r[1] + (rng() - 0.5) * 0.3; }
      else { b.s = (rng() - 0.5) * 2 * (F.half - 0.06); b.h = F.y0 + 0.1 + rng() * (F.H - 0.2); }
      b.head = rng() * Math.PI * 2;
    } else {
      // coming up over the threshold
      b.s = (rng() - 0.5) * 2 * (F.half - 0.1); b.h = F.y0 + 0.01; b.head = (rng() - 0.5) * 0.6; b.life = 0;
    }
    b.speed = 0.018 + rng() * 0.022; b.off = relief(b.s, b.h); b.pause = rng() * 3;
  }
  let dropT = 14 + rng() * 14, frozen = false, drops = 0;
  const pub = ctx.beetles = { count: N, frozen: false, drops: () => drops, beetles: B, frame: F };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), o3 = new THREE.Vector3(), hits = [];
  function floorAt(x, z) {
    const ruin = scene.getObjectByName('ruins-hypogeum');
    if (!ruin) return F.floor;
    o3.set(x, F.floor + 1.2, z); rc.set(o3, dn); rc.far = 3; hits.length = 0; rc.intersectObject(ruin, false, hits);
    return hits.length ? hits[0].point.y : F.floor;
  }

  function update(dt, t) {
    if (!D) {
      if ((lookT -= dt) > 0) return;
      lookT = 1;
      if (ctx.hypogeum?.door) setup(ctx.hypogeum.door); else return;
    }
    const dd = hyp(cam.x - F.fx, cam.z - F.zc);
    if (dd > 80) { mesh.visible = false; return; }
    mesh.visible = true;
    frozen = Math.hypot(cam.x - F.fx, cam.y - (F.y0 + 1.2), cam.z - F.zc) < 2.0 || (dd < 2.0);
    pub.frozen = frozen;
    if (!frozen && (dropT -= dt) <= 0) {
      dropT = 18 + rng() * 26;
      const b = B[(rng() * N) | 0];
      if (b.mode === 'door' && b.h > F.y0 + 0.4) {
        b.mode = 'fall'; b.x = F.fx - b.off - 0.012; b.y = b.h; b.z = F.zc + b.s; b.vy = 0; drops++;
        b.floorY = floorAt(F.fx - 0.25, b.z);
        if (rng() < 0.3) { const c = B[(rng() * N) | 0]; if (c !== b && c.mode === 'door' && c.h > F.y0 + 0.4) { c.mode = 'fall'; c.x = F.fx - c.off - 0.012; c.y = c.h; c.z = F.zc + c.s; c.vy = 0; c.floorY = b.floorY; drops++; } }
      }
    }
    for (let i = 0; i < N; i++) {
      const b = B[i];
      if (b.mode === 'door') {
        if (!frozen) {
          if (b.pause > 0) b.pause -= dt;
          else {
            // random walk, drawn toward the nearer ring when out in the open, dawdling when close to one
            const r = Math.abs(b.s - F.rings[0][0]) < Math.abs(b.s - F.rings[1][0]) ? F.rings[0] : F.rings[1];
            const rx = r[0] - b.s, ry = r[1] - b.h, rd = hyp(rx, ry);
            b.head += (rng() - 0.5) * 2.4 * dt * 3;
            if (rd > 0.22) { const want = Math.atan2(rx, ry); let d = want - b.head; d = Math.atan2(Math.sin(d), Math.cos(d)); b.head += d * dt * 0.9; }
            const v = b.speed * (rd < 0.22 ? 0.35 : 1);
            let ns = b.s + Math.sin(b.head) * v * dt, nh = b.h + Math.cos(b.head) * v * dt;
            if (Math.abs(ns) > F.half - 0.03) { b.head = -b.head; ns = clamp(ns, -(F.half - 0.03), F.half - 0.03); }
            if (nh < F.y0 + 0.04 || nh > F.y0 + F.H - 0.04) { b.head = Math.PI - b.head; nh = clamp(nh, F.y0 + 0.04, F.y0 + F.H - 0.04); }
            b.s = ns; b.h = nh;
            if (rng() < dt * 0.15) b.pause = 1 + rng() * 5;
          }
        }
        b.off += (relief(b.s, b.h) - b.off) * Math.min(1, dt * 6);
        b.life = Math.min(1, b.life + dt * 0.8);
        // on the door: belly to the bronze (up = -x), heading in the door's plane
        pv.set(F.fx - b.off - 0.004, b.h, F.zc + b.s);
        // basis by hand: up Y = (-1, 0, 0) out of the bronze, forward Z = (0, cos head, sin head), X = Y x Z
        const fy = Math.cos(b.head), fz = Math.sin(b.head);
        m4.set(
          0, -1, 0, pv.x,
          fz, 0, fy, pv.y,
          -fy, 0, fz, pv.z,
          0, 0, 0, 1);
        const sc = b.sc * smoothstep(0, 1, b.life);
        sv.set(sc, sc, sc); m4.scale(sv);
        mesh.setMatrixAt(i, m4);
        continue;
      }
      if (b.mode === 'fall') {
        b.vy -= 9.8 * dt; b.y += b.vy * dt; b.x -= 0.15 * dt;
        if (b.y <= b.floorY) { b.y = b.floorY; b.mode = 'floor'; b.head = Math.PI + (rng() - 0.5) * 1.6; b.t = 0; b.walk = 0.6 + rng() * 0.9; }
      } else if (b.mode === 'floor') {
        // a moment on its back, righting itself, then away over the flags toward the stair, into a crack
        b.t += dt;
        if (!frozen && b.t > 1.2) {
          b.head += (rng() - 0.5) * 2 * dt;
          const v = b.speed * 1.4;
          b.x += Math.cos(b.head) * v * dt; b.z += Math.sin(b.head) * v * dt;
          b.walk -= v * dt;
          if (b.walk <= 0) b.life = Math.max(0, b.life - dt * 0.7);
          if (b.life <= 0) { spawnOnDoor(b, false); continue; }
        }
      }
      // off the door: upright (or tumbling while it falls / lies on its back), heading in the floor plane
      pv.set(b.x, b.y + 0.003, b.z);
      const onBack = b.mode === 'fall' || (b.mode === 'floor' && b.t < 1.0);
      e.set(0, Math.PI / 2 - b.head, onBack ? Math.PI + Math.sin(t * 20) * 0.3 : 0, 'YXZ');
      q.setFromEuler(e);
      const sc = b.sc * smoothstep(0, 1, b.life);
      sv.set(sc, sc, sc);
      m4.compose(pv, q, sv);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  ctx.registerUpdate(update);
  pub.advance = (sec, step = 0.1) => { for (let k = 0; k < sec; k += step) update(step, ctx.time.t + k); };
}
