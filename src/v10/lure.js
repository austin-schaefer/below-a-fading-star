// The lure (v10-F1; v14-B1, #38): how an act that can be done now shows itself. Tally-moths: five moths,
// their wings dusted with the saffron of the Halt's chalk, that come to whatever in the valley is waiting for a hand
// and sit on the very place the hand goes (the next stroke's place on the slab, the ring on the bell's post, the
// bronze door, the plank of the seat), opening and closing their wings, now and then lifting off for a short loop
// round it and settling again. When the act is done they go up off it in a flurry, and they are not there again
// until it can be done again. So the sign is a living thing of the place, on the thing itself: from 30 m nothing
// but a fleck that moves now and then, from 10 m a few pale flecks on the stone, from 2 m plainly moths sat where
// your hand is wanted. No glow, no light of their own (lit as the stone they sit on is), nothing brighter far off than near (v10-F1's thread of motes rose 4.6 m,
// drew a halo and was brightened with distance; the owner found it "insanely visible", v12's critic "a pale
// many-armed creature").
//
// Owned by acts.js (buildLure(ctx, acts) from its build). A def opts out with `lure: false` or moves the moths with
// `lure: { x, y, z, face: {x, z} | null }`: where they sit (world coordinates) and the surface's outward normal (null:
// they sit on a level top). Without it they sit at `at`, on the vertical face `face` when the def has one, else on a
// level top. One InstancedMesh (two triangles a moth) for every act, no light; per frame only the moths of acts within
// SEE m of the eye are moved (a few dozen matrices). Lit by the scene (Lambert, in shadow where the place is); found
// by movement, not light: each moth flies one short loop every CYCLE s, staggered so one of the five is nearly always up. Hidden under ?acts=0 (acts.js never builds it).
// In the sun's gutter (v16-S1, #78) they take the dark for dusk: one after another they go up off the spot and wheel
// round it a hand or two above, all five in the air at once, and settle again one by one when the light comes back.
// v16-S2: and the rest of them come out of the cracks: X more a spot, unseen by day, go up off it in a loose column
// that turns as it climbs (to about five metres), a cloud of pale wings read from 15 m, and drop back into the stone
// as the light returns. In the gutter the dust on their wings takes the starlight (a faint emissive, uDusk), so the
// cloud is pale against the cold; by day nothing of theirs glows.
// ctx.acts.lure: { mesh, state() → [{ id, want, on, at, near }] } for the tests.
import * as THREE from 'three';

const MAXL = 16, M = 5, X = 48; // act slots, moths a slot, and the gutter's cloud a slot (v16-S2)
const FADE = 1.6; // s for the moths to come to a thing or leave it
const SEE = 42, GONE = 34; // m: beyond SEE nothing is moved or drawn; from GONE to SEE they shrink to nothing
const SZ = 0.07; // m, half a wingspan: a big moth, 14 cm across
const CYCLE = 12, FLY = 2.2; // s: each moth flies one short loop in every CYCLE, the five staggered, so one is nearly always
// in the air: pale movement read from about 15 m, while the light on them is only the scene's (v14-B1 review)
const SPREAD = 0.22; // m: how far from the spot they sit

export function buildLure(ctx, acts) {
  const rng = ctx.makeRng(1438), crng = ctx.makeRng(1439); // (the cloud's own stream: the five keep their draws)
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
  g.computeVertexNormals();
  // lit by the scene like everything round them (in the arch's shadow they are in shadow): a moth, never a glow
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, fog: true, emissive: new THREE.Color('#c9c4d8'), emissiveIntensity: 0 });
  const mesh = new THREE.InstancedMesh(g, mat, MAXL * (M + X));
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color()); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.count = 0; mesh.name = 'act-lures'; mesh.visible = false;
  ctx.scene.add(mesh);
  // chalk-dusted wings: bone with saffron, a little darker underneath (seen in flight from below)
  // pale as moths are: the palest thing on dark stone, by the same light as it
  const dusted = new THREE.Color('#f2dcaa'), bone = new THREE.Color('#efe7d6'), col = new THREE.Color();

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
        mode: 0, t: 0, sit: (i / M) * CYCLE + 0.5, // 0 sitting, 1 flying a loop; the first flights staggered
        ph: rng() * 6.28, ph2: rng() * 6.28, w: (0.8 + rng() * 0.8) * (rng() < 0.5 ? -1 : 1), flap: 24 + rng() * 10,
        p: new THREE.Vector3(sx, sy, sz), prev: new THREE.Vector3(sx, sy, sz), yaw: 0, tint: rng(),
        out: new THREE.Vector3((rng() - 0.5) * 2, 2.2 + rng() * 1.6, (rng() - 0.5) * 2), // where it goes when the act is done
      });
    }
    s.cloud = []; s.cloudOn = true; // (on, so the first frame hides them: an instance never set is drawn at the origin)
    for (let i = 0; i < X; i++) s.cloud.push({ tint: crng(), ph: crng() * 6.28, ph2: crng() * 6.28, w: (crng() < 0.5 ? -1 : 1) * (0.7 + 0.8 * crng()), flap: 22 + crng() * 12, top: 0.6 + 4.2 * crng() * crng() + 0.6 * crng(), r: 0.3 + 1.3 * crng() * crng(), p: new THREE.Vector3(), yaw: 0 });
    list.push(s); slots.set(h, s);
    return s;
  }
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), M4 = new THREE.Matrix4(), tgt = new THREE.Vector3(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const AY = new THREE.Vector3(0, 1, 0), q2 = new THREE.Quaternion(), qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); // a sitter on a wall: its back out from the stone, head up
  const cam = ctx.camera.position;
  // per frame from acts.js: want(h) says whether h's moths should be there now
  let dusk = 0;
  function step(dt, t, want) {
    let any = false, n = 0;
    { const fl = ctx.sky?.flicker, to = (fl?.dark ?? 0) > 0.35 ? 1 : 0; dusk = fl?.hold != null ? to : Math.min(1, Math.max(0, dusk + (to ? dt / 1.6 : -dt / 3.2))); }
    mat.emissiveIntensity = 0.9 * dusk;
    for (const h of acts.list) {
      if (h.def.lure === false) continue;
      let s = slots.get(h);
      if (!s) { if (list.length >= MAXL) continue; s = makeSlot(h); }
      const to = want(h) ? 1 : 0;
      s.want = to;
      if (s.on !== to) s.on = to > s.on ? Math.min(1, s.on + dt / FADE) : Math.max(0, s.on - dt / FADE);
      const dx = s.x - cam.x, dz = s.z - cam.z, d = Math.sqrt(dx * dx + dz * dz);
      s.near = d < SEE;
      const base = s.k * (M + X);
      if (s.on <= 0 || !s.near) { if (s.shown !== false) { for (let i = 0; i < M + X; i++) mesh.setMatrixAt(base + i, hide); s.shown = false; } continue; }
      any = true; s.shown = true;
      const far = 1 - Math.min(1, Math.max(0, (d - GONE) / (SEE - GONE)));
      for (let i = 0; i < M; i++) moth(s, s.moths[i], dt, t, far, base + i, to);
      const up = to === 0 ? 0 : dusk;
      if (up > 0 || s.cloudOn) { s.cloudOn = up > 0; for (let i = 0; i < X; i++) cloudMoth(s, s.cloud[i], t, far * s.on, base + M + i, up); }
      n = Math.max(n, base + M + X);
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
      if (m.t > m.sit) { m.mode = 1; m.t = 0; m.sit = FLY; }
    } else { // a short loop round the spot, out from the surface, and back to its place
      const u = Math.min(1, m.t / m.sit), lift = Math.sin(u * Math.PI);
      const a = m.ph + u * Math.PI * 2 * m.w;
      const ox = Math.cos(a) * 0.45 * lift, oy = (0.2 + 0.25 * Math.sin(t * 2.3 + m.ph2)) * lift;
      if (s.wall) tgt.set(m.sx - s.nz * ox + s.nx * 0.5 * lift, m.sy + oy, m.sz + s.nx * ox + s.nz * 0.5 * lift); // out off the stone into the light
      else tgt.set(m.sx + ox, m.sy + 0.25 * lift + oy, m.sz + Math.sin(a) * 0.3 * lift);
      m.p.lerp(tgt, Math.min(1, dt * 10));
      if (u >= 1) { m.mode = 0; m.t = 0; m.sit = CYCLE - FLY; }
    }
    // the gutter: wheeling round the spot, each moth off at its own moment (tint staggers them)
    const dk = leaving || coming ? 0 : Math.min(1, Math.max(0, dusk * 1.6 - m.tint * 0.6));
    if (dk > 0) {
      const a = t * 1.9 * Math.sign(m.w) + m.ph, r = 0.42 + 0.3 * m.tint, h = 0.55 + 0.35 * m.tint + 0.12 * Math.sin(t * 2.7 + m.ph2);
      const ox = Math.cos(a) * r, oz = Math.sin(a) * r;
      if (s.wall) tgt.set(m.sx - s.nz * ox + s.nx * (0.35 + 0.35 * (oz + r)), m.sy + h * 0.45 - 0.1, m.sz + s.nx * ox + s.nz * (0.35 + 0.35 * (oz + r)));
      else tgt.set(m.sx + ox, m.sy + h, m.sz + oz);
    }
    if (!m.draw) { m.draw = m.p.clone(); m.dprev = m.p.clone(); } // (where it is drawn: its own path, or the wheel)
    m.dprev.copy(m.draw);
    if (dk > 0) m.draw.copy(m.p).lerp(tgt, dk * dk * (3 - 2 * dk)); else m.draw.copy(m.p);
    flying = leaving || coming || m.mode === 1 || dk > 0.2;
    if (flying) {
      tgt.subVectors(m.draw, m.dprev);
      if (tgt.lengthSq() > 1e-10) m.yaw = Math.atan2(tgt.x, tgt.z);
      e.set(-0.3 + 0.25 * Math.sin(t * 3 + m.ph), m.yaw, 0.3 * Math.sin(t * 2.1 + m.ph2) + (dk > 0.2 ? 0.75 * Math.sign(m.w) : 0), 'YXZ'); // (banked into the gutter's wheel, so the wings are seen)
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
    M4.compose(m.draw, q, sc);
    mesh.setMatrixAt(idx, M4);
    col.copy(bone).lerp(dusted, 0.5 + 0.5 * m.tint).multiplyScalar(flying ? 0.85 : 1);
    mesh.setColorAt(idx, col);
  }
  // one of the cloud: out of the stone at its own moment, up a turning column to its own height, back down as it ends
  function cloudMoth(s, m, t, far, idx, up) {
    const k = Math.min(1, Math.max(0, up * 1.5 - m.tint * 0.5)), e3 = k * k * (3 - 2 * k);
    if (k <= 0) { mesh.setMatrixAt(idx, hide); return; }
    const a = t * (1.1 + 0.6 * m.tint) * Math.sign(m.w) + m.ph, r = m.r * (0.4 + 0.6 * e3), h = m.top * e3 + 0.18 * Math.sin(t * 2.2 + m.ph2);
    const ox = Math.cos(a) * r, oz = Math.sin(a) * r;
    const px = m.p.x, py = m.p.y, pz = m.p.z;
    if (s.wall) m.p.set(s.x - s.nz * ox + s.nx * (0.3 + 0.5 * e3 + 0.4 * (oz + r)), s.y + h, s.z + s.nx * ox + s.nz * (0.3 + 0.5 * e3 + 0.4 * (oz + r)));
    else m.p.set(s.x + ox, s.y + 0.1 + h, s.z + oz);
    const vx = m.p.x - px, vz = m.p.z - pz;
    if (vx * vx + vz * vz > 1e-10) m.yaw = Math.atan2(vx, vz);
    e.set(-0.35 + 0.3 * Math.sin(t * 3.1 + m.ph) - (m.p.y - py > 0 ? 0.2 : 0), m.yaw, 0.7 * Math.sign(m.w) + 0.3 * Math.sin(t * 2.3 + m.ph2), 'YXZ');
    q.setFromEuler(e);
    const open = 0.2 + 0.8 * Math.abs(Math.sin(t * m.flap + m.ph)), sz = SZ * (1.5 + 0.7 * m.tint) * far * Math.min(1, k * 3);
    sc.set(sz * open, sz, sz);
    M4.compose(m.p, q, sc);
    mesh.setMatrixAt(idx, M4);
    col.copy(bone).lerp(dusted, m.tint);
    mesh.setColorAt(idx, col);
  }
  const state = () => acts.list.map((h) => { const s = slots.get(h); return { id: h.def.id, want: s ? s.want : 0, on: s ? +s.on.toFixed(3) : 0, at: s ? { x: s.x, y: s.y, z: s.z } : null, near: s ? !!s.near : false }; });
  return { mesh, step, state };
}
