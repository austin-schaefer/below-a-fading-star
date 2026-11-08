// Moths at the lamps of the Pomegranate House: eight to fourteen pale moths to each lamp, in slow irregular
// orbits 0.3-1.2 m from the flame, darting now and then; every so often one settles on the lantern's
// cage, opens and closes its wings a few times, and goes back to the light. Two-triangle wings, one
// InstancedMesh for all the lamps. The lamps are the structures module's PointLights near the taverna
// (looked for until they appear: structures may build after fauna). No audio.
import * as THREE from 'three';
import { clamp, smoothstep } from './geo.js';

const LAMP_COLOUR = 'ff9a4a';

export function buildLampMoths(ctx) {
  const { scene, camera, landmarks } = ctx;
  const rng = ctx.makeRng(1414);
  const T = landmarks.taverna;
  const PER = ctx.quality === 'low' ? [8, 10] : [10, 14];
  const MAXN = 2 * PER[1] + 4;
  // a moth: two wings, each one triangle, hinged on the body line (z); the flap squeezes x
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0.45, 1.0, 0.05, 0.55, 0.75, 0, -0.55,
    0, 0, 0.45, -0.75, 0, -0.55, -1.0, 0.05, 0.55,
  ], 3));
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(g, mat, MAXN);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color()); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.count = 0; mesh.name = 'lamp-moths';
  scene.add(mesh);
  const pale = new THREE.Color('#e9dcc0'), ash = new THREE.Color('#b8ac98'), col = new THREE.Color();

  const lamps = []; // { light, pos, moths: [] }
  const moths = [];
  let lookT = 0, waited = 0, done = false;
  const wp = new THREE.Vector3();
  function findLamps() {
    const found = [];
    scene.traverse((o) => {
      if (!o.isPointLight || o.color.getHexString() !== LAMP_COLOUR) return;
      o.getWorldPosition(wp);
      if (Math.hypot(wp.x - T.x, wp.z - T.z) < T.r + 8) found.push({ light: o, pos: wp.clone(), base: o.intensity || 3 });
    });
    return found;
  }
  function populate() {
    for (const L of lamps) {
      const n = PER[0] + ((rng() * (PER[1] - PER[0] + 1)) | 0);
      for (let k = 0; k < n && moths.length < MAXN; k++) {
        moths.push({
          L, a: rng() * 6.28, w: (0.7 + rng() * 1.1) * (rng() < 0.5 ? -1 : 1), r0: 0.3 + rng() * 0.9, ph: [rng() * 6.28, rng() * 6.28, rng() * 6.28],
          y0: (rng() - 0.35) * 0.7, sz: 0.026 + rng() * 0.018, flapW: 26 + rng() * 14, flapPh: rng() * 6.28,
          pos: new THREE.Vector3().copy(L.pos), prev: new THREE.Vector3().copy(L.pos), yaw: 0,
          dart: 2 + rng() * 6, dx: 0, dy: 0, dz: 0, // a sudden sideways jink, decaying
          mode: 0, landT: 0, land: new THREE.Vector3(), landYaw: 0, nextLand: 8 + rng() * 40, tint: rng(),
        });
      }
    }
    mesh.count = moths.length;
    ctx.lampMoths = { lamps: lamps.map((l) => l.pos), count: moths.length, moths, advance: (sec, step = 0.03) => { for (let k = 0; k < sec; k += step) update(step, ctx.time.t + k); } };
  }
  const cam = camera.position;
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), M4 = new THREE.Matrix4(), tmp = new THREE.Vector3();
  function update(dt, t) {
    if (!done) {
      waited += dt;
      if ((lookT -= dt) > 0) return;
      lookT = 1;
      const f = findLamps();
      if (f.length >= 2 || (f.length && waited > 20)) { lamps.push(...f); populate(); done = true; }
      else return;
    }
    if (!moths.length) return;
    const far = Math.hypot(cam.x - T.x, cam.z - T.z) > 140;
    mesh.visible = !far;
    if (far) return;
    for (let i = 0; i < moths.length; i++) {
      const m = moths[i], L = m.L.pos;
      const lit = clamp((m.L.light.intensity || 0) / m.L.base, 0.2, 1.3);
      m.prev.copy(m.pos);
      let flapAmt = 1;
      if (m.mode === 0) {
        m.nextLand -= dt;
        // orbit: slow, uneven, the radius breathing; the height wandering; now and then a dart
        m.a += dt * m.w * (0.6 + 0.6 * Math.sin(t * 0.8 + m.ph[0]) ** 2);
        const r = clamp(m.r0 + 0.25 * Math.sin(t * 0.37 + m.ph[1]) + 0.12 * Math.sin(t * 1.9 + m.ph[2]), 0.28, 1.25);
        m.dart -= dt;
        if (m.dart <= 0) { m.dart = 1.5 + rng() * 5; m.dx = (rng() - 0.5) * 0.9; m.dy = (rng() - 0.5) * 0.5; m.dz = (rng() - 0.5) * 0.9; }
        const k = Math.exp(-dt * 2.2); m.dx *= k; m.dy *= k; m.dz *= k;
        tmp.set(L.x + Math.cos(m.a) * r + m.dx * 0.6 + 0.06 * Math.sin(t * 7.3 + m.ph[0]), L.y + m.y0 + 0.28 * Math.sin(t * 0.61 + m.ph[2]) + m.dy * 0.6 + 0.04 * Math.sin(t * 9.1 + m.ph[1]), L.z + Math.sin(m.a) * r + m.dz * 0.6);
        m.pos.lerp(tmp, Math.min(1, dt * 6));
        if (m.nextLand <= 0) {
          // settle on the cage, on the side away from the flame's heat: just outside the glass
          const a = rng() * 6.28;
          m.land.set(L.x + Math.cos(a) * 0.19, L.y - 0.04 + (rng() - 0.5) * 0.24, L.z + Math.sin(a) * 0.19);
          m.landYaw = a; m.mode = 1; m.landT = 0;
        }
      } else if (m.mode === 1) {
        // flying in to land
        m.pos.lerp(m.land, Math.min(1, dt * 2.4));
        if (m.pos.distanceToSquared(m.land) < 0.0004) { m.mode = 2; m.landT = 4 + rng() * 10; }
      } else {
        // sitting: wings spread flat against the cage, opening and closing slowly
        m.pos.copy(m.land);
        m.landT -= dt;
        flapAmt = 0;
        if (m.landT <= 0) { m.mode = 0; m.nextLand = 20 + rng() * 50; }
      }
      let yaw = m.yaw;
      tmp.subVectors(m.pos, m.prev);
      if (m.mode !== 2 && tmp.lengthSq() > 1e-9) yaw = Math.atan2(tmp.x, tmp.z);
      m.yaw = yaw;
      let open;
      if (m.mode === 2) {
        // flat on the cage: body vertical, belly to the glass
        e.set(-Math.PI / 2, m.landYaw + Math.PI / 2, 0, 'YXZ');
        open = 0.55 + 0.45 * smoothstep(-0.3, 0.3, Math.sin(t * 0.9 + m.ph[0]));
      } else {
        e.set(-0.35 + 0.25 * Math.sin(t * 3 + m.ph[1]), yaw, 0.3 * Math.sin(t * 2.1 + m.ph[2]), 'YXZ');
        open = 0.18 + 0.82 * Math.abs(Math.sin(t * m.flapW + m.flapPh)) * flapAmt + (1 - flapAmt) * 0.6;
      }
      q.setFromEuler(e);
      sc.set(m.sz * open, m.sz, m.sz);
      M4.compose(m.pos, q, sc);
      mesh.setMatrixAt(i, M4);
      // pale where the flame lights them, ash-grey farther out
      const d = m.pos.distanceTo(L);
      col.copy(ash).lerp(pale, m.tint * 0.4 + 0.6 * (1 - smoothstep(0.3, 1.3, d))).multiplyScalar((0.55 + 0.75 * (1 - smoothstep(0.2, 1.3, d))) * lit);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  }
  ctx.registerUpdate(update);
}
