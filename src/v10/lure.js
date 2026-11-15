// The lure (v10-F1; v14-B1, #38): how an act that can be done now shows itself. Tally-moths: five moths,
// their wings dusted with the saffron of the Halt's chalk, that come to whatever in the valley is waiting for a hand
// and sit on the very place the hand goes (the next stroke's place on the slab, the ring on the bell's post, the
// bronze door, the plank of the seat), opening and closing their wings, now and then lifting off for a short loop
// round it and settling again. When the act is done they go up off it in a flurry, and they are not there again
// until it can be done again. So the sign is a living thing of the place, on the thing itself: from 30 m nothing
// but a fleck that moves now and then, from 10 m a few pale flecks on the stone, from 2 m plainly moths sat where
// your hand is wanted. No glow, no light, nothing brighter far off than near (v10-F1's thread of motes rose 4.6 m,
// drew a halo and was brightened with distance; the owner found it "insanely visible", v12's critic "a pale
// many-armed creature").
//
// Owned by acts.js (buildLure(ctx, acts) from its build). A def opts out with `lure: false` or moves the moths with
// `lure: { x, y, z, face: {x, z} | null }`: where they sit (world coordinates) and the surface's outward normal (null:
// they sit on a level top). Without it they sit at `at`, on the vertical face `face` when the def has one, else on a
// level top. One InstancedMesh (two triangles a moth) for every act, no light; per frame only the moths of acts within
// SEE m of the eye are moved (a few dozen matrices). Hidden under ?acts=0 (acts.js never builds it).
// ctx.acts.lure: { mesh, state() → [{ id, want, on, at, near }] } for the tests.
import * as THREE from 'three';

const MAXL = 16, M = 5; // act slots, moths a slot
const FADE = 1.6; // s for the moths to come to a thing or leave it
const SEE = 42, GONE = 34; // m: beyond SEE nothing is moved or drawn; from GONE to SEE they shrink to nothing
const SZ = 0.06; // m, half a wingspan: a big moth, 12 cm across, so a few of them are flecks at 10 m and not nothing
const SPREAD = 0.22; // m: how far from the spot they sit

export function buildLure(ctx, acts) {
  const rng = ctx.makeRng(1438);
  // a moth from above (local x across, z to the head, y its back): a broad forewing and a smaller hindwing each side
  // and a dark body between; the flap squeezes x. Vertex colours: the wings 1, darker at the root; the body dark
  const W = [
    [0.04, 0, 0.32, 1.0, 0.04, 0.34, 0.86, 0.02, -0.06], [0.04, 0, 0.32, 0.86, 0.02, -0.06, 0.05, 0, -0.08], // forewing
    [0.05, 0, -0.04, 0.72, 0.01, -0.22, 0.3, 0, -0.62], [0.05, 0, -0.04, 0.3, 0, -0.62, 0.04, 0, -0.42], // hindwing
  ];
  const P = [], C = [];
  for (const sg of [1, -1]) for (const t of W) {
    const tri = sg > 0 ? [0, 1, 2] : [0, 2, 1];
    for (const k of tri) { P.push(t[k * 3] * sg, t[k * 3 + 1], t[k * 3 + 2]); const r = Math.abs(t[k * 3]); C.push(...[0.55 + 0.45 * Math.min(1, r * 1.6)].flatMap((v) => [v, v * 0.97, v * 0.9])); }
  }
  for (const v of [[-0.07, 0.03, 0.42], [0, 0.03, -0.66], [0.07, 0.03, 0.42]]) { P.push(...v); C.push(0.32, 0.27, 0.22); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, fog: true });
  const mesh = new THREE.InstancedMesh(g, mat, MAXL * M);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color()); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.count = 0; mesh.name = 'act-lures'; mesh.visible = false;
  ctx.scene.add(mesh);
  // chalk-dusted wings: bone with saffron, a little darker underneath (seen in flight from below)
  const dusted = new THREE.Color('#d9b778'), bone = new THREE.Color('#c8bba2'), col = new THREE.Color();

  const slots = new Map(); // handle -> slot
  const list = [];
  const ground = (x, z) => ctx.terrain?.heightAt?.(x, z) ?? 0;
  function makeSlot(h) {
    const d = h.def, L = d.lure && typeof d.lure === 'object' ? d.lure : {};
    const face = 'face' in L ? L.face : d.face || null;
    const fl = face ? Math.hypot(face.x, face.z) || 1 : 1;
    const nx = face ? face.x / fl : 0, nz = face ? face.z / fl : 0;
    const x = L.x ?? d.at.x, z = L.z ?? d.at.z, y = L.y ?? d.at.y ?? ground(x, z);
    const s = { h, x, y, z, nx, nz, wall: !!face, on: 0, want: 0, k: list.length, moths: [] };
    for (let i = 0; i < M; i++) {
      // a sitting place on the surface: within SPREAD of the spot, a little apart from the others
      const a = (i / M) * Math.PI * 2 + rng() * 1.2, r = SPREAD * (0.35 + 0.65 * rng());
      const u = Math.cos(a) * r, v = Math.sin(a) * r * (face ? 0.8 : 1);
      // on a wall: u along it (the wall's tangent is (-nz, nx)), v up it; on a top: u, v in x and z
      const sx = face ? x - nz * u + nx * 0.012 : x + u, sz = face ? z + nx * u + nz * 0.012 : z + v, sy = face ? y + v : y + 0.012;
      s.moths.push({
        sx, sy, sz, head: face ? rng() * 0.9 - 0.45 : rng() * 6.28, // a sitter's heading: up the wall give or take, or any way on a top
        mode: 0, t: rng() * 6, sit: 3 + rng() * 6, // 0 sitting, 1 flying a loop
        ph: rng() * 6.28, ph2: rng() * 6.28, w: (0.8 + rng() * 0.8) * (rng() < 0.5 ? -1 : 1), flap: 24 + rng() * 10,
        p: new THREE.Vector3(sx, sy, sz), prev: new THREE.Vector3(sx, sy, sz), yaw: 0, tint: rng(),
        out: new THREE.Vector3((rng() - 0.5) * 2, 2.2 + rng() * 1.6, (rng() - 0.5) * 2), // where it goes when the act is done
      });
    }
    list.push(s); slots.set(h, s);
    return s;
  }
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), M4 = new THREE.Matrix4(), tgt = new THREE.Vector3(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const AY = new THREE.Vector3(0, 1, 0), q2 = new THREE.Quaternion(), qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); // a sitter on a wall: its back out from the stone, head up
  const cam = ctx.camera.position;
  // per frame from acts.js: want(h) says whether h's moths should be there now
  function step(dt, t, want) {
    let any = false, n = 0;
    for (const h of acts.list) {
      if (h.def.lure === false) continue;
      let s = slots.get(h);
      if (!s) { if (list.length >= MAXL) continue; s = makeSlot(h); }
      const to = want(h) ? 1 : 0;
      s.want = to;
      if (s.on !== to) s.on = to > s.on ? Math.min(1, s.on + dt / FADE) : Math.max(0, s.on - dt / FADE);
      const dx = s.x - cam.x, dz = s.z - cam.z, d = Math.sqrt(dx * dx + dz * dz);
      s.near = d < SEE;
      const base = s.k * M;
      if (s.on <= 0 || !s.near) { for (let i = 0; i < M; i++) mesh.setMatrixAt(base + i, hide); continue; }
      any = true;
      const far = 1 - Math.min(1, Math.max(0, (d - GONE) / (SEE - GONE)));
      for (let i = 0; i < M; i++) moth(s, s.moths[i], dt, t, far, base + i, to);
      n = Math.max(n, base + M);
    }
    mesh.count = Math.max(mesh.count, n);
    mesh.visible = any;
    if (any) { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; }
  }
  function moth(s, m, dt, t, far, idx, to) {
    m.prev.copy(m.p);
    m.t += dt;
    const leaving = to === 0, coming = !leaving && s.on < 1;
    let open, flying = leaving || coming || m.mode === 1;
    if (leaving || coming) {
      // going up off it in a flurry (or, coming, down onto it): the same path, run by how far on they are
      const u = 1 - s.on, k = u * u;
      tgt.set(m.sx + m.out.x * k + 0.15 * Math.sin(t * 5 + m.ph), m.sy + m.out.y * k, m.sz + m.out.z * k + 0.15 * Math.cos(t * 4.3 + m.ph2));
      m.p.lerp(tgt, Math.min(1, dt * 8));
      if (coming && s.on > 0.95) { m.mode = 0; m.t = 0; }
    } else if (m.mode === 0) { // sitting on the spot
      m.p.set(m.sx, m.sy, m.sz);
      if (m.t > m.sit) { m.mode = 1; m.t = 0; m.sit = 1.4 + Math.abs(m.w) * 1.5; }
    } else { // a short loop round the spot, out from the surface, and back to its place
      const u = Math.min(1, m.t / m.sit), lift = Math.sin(u * Math.PI);
      const a = m.ph + u * Math.PI * 2 * m.w;
      const ox = Math.cos(a) * 0.3 * lift, oy = (0.12 + 0.18 * Math.sin(t * 2.3 + m.ph2)) * lift;
      if (s.wall) tgt.set(m.sx - s.nz * ox + s.nx * 0.3 * lift, m.sy + oy, m.sz + s.nx * ox + s.nz * 0.3 * lift);
      else tgt.set(m.sx + ox, m.sy + 0.25 * lift + oy, m.sz + Math.sin(a) * 0.3 * lift);
      m.p.lerp(tgt, Math.min(1, dt * 10));
      if (u >= 1) { m.mode = 0; m.t = 0; m.sit = 4 + 6 * m.tint; }
    }
    flying = leaving || coming || m.mode === 1;
    if (flying) {
      tgt.subVectors(m.p, m.prev);
      if (tgt.lengthSq() > 1e-10) m.yaw = Math.atan2(tgt.x, tgt.z);
      e.set(-0.3 + 0.25 * Math.sin(t * 3 + m.ph), m.yaw, 0.3 * Math.sin(t * 2.1 + m.ph2), 'YXZ');
      open = 0.2 + 0.8 * Math.abs(Math.sin(t * m.flap + m.ph));
    } else if (s.wall) { // flat against the face, head up it, belly to the stone; wings opening and closing slowly
      q.setFromAxisAngle(AY, Math.atan2(s.nx, s.nz)).multiply(qX).multiply(q2.setFromAxisAngle(AY, m.head));
      open = 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.8 + m.ph)) ** 2;
    } else {
      e.set(0, m.head, 0, 'YXZ');
      open = 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.8 + m.ph)) ** 2;
    }
    if (flying || !s.wall) q.setFromEuler(e);
    const sz = SZ * far * Math.min(1, s.on * 3);
    sc.set(sz * open, sz, sz);
    M4.compose(m.p, q, sc);
    mesh.setMatrixAt(idx, M4);
    col.copy(bone).lerp(dusted, 0.5 + 0.5 * m.tint).multiplyScalar(flying ? 0.85 : 1);
    mesh.setColorAt(idx, col);
  }
  const state = () => acts.list.map((h) => { const s = slots.get(h); return { id: h.def.id, want: s ? s.want : 0, on: s ? +s.on.toFixed(3) : 0, at: s ? { x: s.x, y: s.y, z: s.z } : null, near: s ? !!s.near : false }; });
  return { mesh, step, state };
}
