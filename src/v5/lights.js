// The local lights (v5; plans/wilderness-v4.md Light (a), plans/wilderness-v4-placement.md's `lightMoss`, `lightEmbers`,
// `lightPost`, `lightDoor` and `leerie`). Five small lit things on the walk, each a reason to walk toward it:
//   moss    bioluminescent moss in a hollow of the Deodand Wood: clumps and three roots glowing cold green-blue,
//           brightest at the hollow's bottom, a pool on the ground, a haze over it, motes. No real light.
//   embers  under the Arcature: three dead fire-rings and one still alive, its bed pulsing, a thread of smoke, a
//           spark now and then. One real light, r 12.
//   post    a guttering lamp on a stone post with a bronze bracket by the causeway, on its own slow rhythm, dark
//           for a second every minute or two. One real light, r 10.
//   door    the lens mount's door in the south fin, ajar: a slit of warm light at its west edge, the east jamb lit,
//           a wedge on the ground outside. One real light, r 8, just inside.
//   leerie  the Leerie's twelve lamp-standards beside kerb K1, unlit, except while the sun gutters: then all twelve
//           light in a wave along the row with a flare and a tick each, and go out together when it ends (plans/IDEAS-v5.md CG
//           with Austin's change; the lamplighter who walks the row is v7's). Emissive heads and glow sprites; two real
//           lights, r 12, at the row's quarter points, on only while it is lit.
// Draws: one mesh of solids (vertex colours, emissive per vertex by channel; casts) and one mesh of glows (additive
// sprites, decals, sparks and motes, with the smoke in the same premultiplied pass). `?locallights=0` leaves all five
// out; `?locallights=moss,post` builds only those. `ctx.localLights`: `stats()`, `leerie` (also `ctx.leerie`: `light(true | false | null)`,
// `lit`), `mothLamps` (read by fauna/lamps.js).
import * as THREE from 'three';
import { SITES } from '../world.js';
import { makeGround } from '../fauna/uncanny/kit.js';
import { TOWER } from '../structures/tower.js';
import { hyp, clamp, smoothstep } from '../noise.js';

const PARAM = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('locallights') : null;
const ALL = ['moss', 'embers', 'post', 'door', 'leerie'];
export const LEERIE = { n: 12, height: 2.85, side: 1.0 };
const CH = { moss: 0, embers: 1, post: 2, door: 3, leerie: 4 }; // leerie: 4..15, one per standard
const COL = { moss: '#46e8c8', ember: '#ff4a12', post: '#ff8a3a', door: '#ffae5c', leerie: '#ffbc72' };

export async function build(ctx) {
  const want = PARAM === null ? ALL : PARAM === '0' ? [] : PARAM.split(',').filter((k) => ALL.includes(k));
  if (!want.length) { ctx.localLights = null; return; }
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const MG = makeGround(ctx);
  const G = (x, z) => Math.max(MG.at(x, z), terrain.heightAt(x, z)); // on the drawn mesh, never under the analytic ground
  const N2 = ctx.noise.noise2;
  const U = { uCh: { value: new Float32Array(16) }, uTime: { value: 0 } };
  const solids = new Solids();
  const glows = new Glows();
  const lights = [];
  const updates = [];
  const C = (h) => new THREE.Color(h);
  const light = (hex, intensity, distance, x, y, z) => {
    const l = new THREE.PointLight(C(hex), intensity, distance, 2);
    l.position.set(x, y, z); l.name = 'local-light'; scene.add(l); lights.push(l); return l;
  };
  const api = { stats: null, leerie: null, mothLamps: [], mothMax: 0 };

  // ---------------------------------------------------------------- the moss in the hollow
  if (want.includes('moss')) {
    const S = SITES.lightMoss, rng = ctx.makeRng(9101);
    // the hollow: its bottom and rim heights, for the glow's depth term
    let hMin = Infinity, rim = 0;
    for (let a = 0; a < 16; a++) rim += G(S.x + Math.cos(a / 16 * 6.283) * S.r, S.z + Math.sin(a / 16 * 6.283) * S.r) / 16;
    for (let dx = -S.r; dx <= S.r; dx += 1) for (let dz = -S.r; dz <= S.r; dz += 1) if (hyp(dx, dz) <= S.r) hMin = Math.min(hMin, G(S.x + dx, S.z + dz));
    const depth = (x, z) => {
      const r = hyp(x - S.x, z - S.z);
      return (1 - smoothstep(S.r * 0.35, S.r * 1.1, r)) * (0.35 + 0.65 * smoothstep(rim + 0.15, hMin + 0.1, G(x, z)));
    };
    const glow = C(COL.moss), deep = C('#2fb8e0'), moss = C('#1d2a1c'), mossD = C('#141c16'), e = new THREE.Color();
    const emitAt = (x, z, k) => { const w = depth(x, z) * k; e.copy(glow).lerp(deep, 0.5 + 0.5 * N2(x * 0.3, z * 0.3)); return [e.r * w, e.g * w, e.b * w]; };
    // three roots arching through the hollow, out of the ground and back in, from the trees round it
    const roots = [];
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + rng() * 0.8, r0 = S.r * (0.95 + rng() * 0.3), r1 = 0.6 + rng() * 2.2;
      const ax = S.x + Math.cos(a) * r0, az = S.z + Math.sin(a) * r0, b = a + (rng() - 0.5) * 1.6;
      const bx = S.x + Math.cos(b) * r1, bz = S.z + Math.sin(b) * r1;
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, x = ax + (bx - ax) * t + Math.sin(t * 6 + k) * 0.35, z = az + (bz - az) * t + Math.cos(t * 5 + k) * 0.35;
        pts.push(new THREE.Vector3(x, G(x, z) + Math.sin(t * Math.PI) * (0.22 + rng() * 0.12) - 0.08, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts), rad = 0.13 + rng() * 0.06;
      const tube = new THREE.TubeGeometry(curve, low ? 10 : 16, rad, 5, false);
      roots.push(curve);
      solids.add(tube, null, C('#2a2018'), (x, y, z) => emitAt(x, z, 0.35 + 0.65 * smoothstep(-0.05, 0.25, y - G(x, z))), CH.moss);
    }
    // the clumps: a low cushion on the ground, thicker toward the bottom, and along the roots
    const n = low ? 320 : 600, clump = new THREE.OctahedronGeometry(1, 0);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      let x, z, y;
      if (i % 5 === 0) { const t = rng(), c = roots[i % 3].getPoint(t); x = c.x + (rng() - 0.5) * 0.3; z = c.z + (rng() - 0.5) * 0.3; y = c.y + 0.1; }
      else { const a = rng() * 6.283, r = S.r * Math.pow(rng(), 0.7); x = S.x + Math.cos(a) * r; z = S.z + Math.sin(a) * r; y = G(x, z); }
      const d = depth(x, z);
      if (rng() > 0.25 + d) continue;
      const s = 0.08 + rng() * 0.2 * (0.5 + d), k = 0.25 + 0.65 * rng() * rng();
      q.setFromAxisAngle(up, rng() * 6.28); sc.set(s * (1 + rng() * 0.6), s * (0.35 + rng() * 0.25), s); p.set(x, y + 0.01, z);
      solids.add(clump, m4.compose(p, q, sc), rng() < 0.5 ? moss : mossD, (vx, vy, vz) => emitAt(vx, vz, k * (0.7 + 0.3 * rng())), CH.moss);
    }
    // the pool of light on the ground, a low haze over it (what reads between the trunks) and motes
    glows.decal(MG, S.x, S.z, S.r * 1.25, 0, C(COL.moss).multiplyScalar(0.4), CH.moss, G);
    glows.halo(S.x - 1, hMin + 0.9, S.z, 6.5, C(COL.moss).multiplyScalar(0.11), CH.moss, 1.4);
    glows.halo(S.x + 1.5, hMin + 0.5, S.z + 1, 4.0, C('#36c8e8').multiplyScalar(0.12), CH.moss, 1.4);
    for (let i = 0, nm = low ? 14 : 26; i < nm; i++) {
      const a = rng() * 6.283, r = S.r * Math.sqrt(rng()) * 0.9, x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r;
      glows.mote(x, G(x, z) + 0.3 + rng() * 1.6, z, 0.06 + rng() * 0.04, C(COL.moss).multiplyScalar(2.2), CH.moss, rng());
    }
    updates.push([(dt, t, f) => { U.uCh.value[CH.moss] = (0.9 + 0.1 * Math.sin(t * 0.45)) * (1 + 0.35 * (1 - f)); }, { pos: S, near: 90, hz: 2 }]);
  }

  // ---------------------------------------------------------------- the embers under the Arcature
  if (want.includes('embers')) {
    const S = SITES.lightEmbers, rng = ctx.makeRng(9201);
    const stoneC = C('#3a3430'), ash = C('#3e3a36'), char = C('#120e0c'), e = C(COL.ember);
    const ring = (cx, cz, r, alive) => {
      const g = G(cx, cz);
      // the ash: a low disc, and the stones round it
      const disc = new THREE.CircleGeometry(r * 0.95, 14).rotateX(-Math.PI / 2);
      solids.add(disc, new THREE.Matrix4().makeTranslation(cx, g + 0.03, cz), alive ? ash : ash.clone().multiplyScalar(0.8), null, 0, (x, z) => G(x, z) + 0.025);
      const ns = 9 + (rng() * 3 | 0);
      for (let k = 0; k < ns; k++) {
        const a = k / ns * 6.283 + rng() * 0.3, s = 0.13 + rng() * 0.08;
        if (!alive && rng() < 0.15) continue; // a stone kicked away
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
        const geo = new THREE.DodecahedronGeometry(1, 0);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x, G(x, z) + s * 0.35, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, 0)), new THREE.Vector3(s * 1.3, s * 0.8, s));
        solids.add(geo, m, stoneC.clone().multiplyScalar(0.7 + rng() * 0.5), null, 0);
      }
      // charred wood: sticks fallen inward, their inner ends live in the one still burning
      const nw = alive ? 5 : 2 + (rng() * 2 | 0);
      for (let k = 0; k < nw; k++) {
        const a = rng() * 6.283, len = 0.5 + rng() * 0.4, rr = 0.035 + rng() * 0.03;
        const geo = new THREE.CylinderGeometry(rr, rr * 1.2, len, 5).rotateZ(Math.PI / 2);
        const ox = Math.cos(a) * len * 0.35, oz = Math.sin(a) * len * 0.35;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(cx + ox, g + 0.07 + k * 0.02, cz + oz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0.12)), new THREE.Vector3(1, 1, 1));
        solids.add(geo, m, char, alive ? (x, y, z) => { const w = 1 - smoothstep(0.08, 0.35, hyp(x - cx, z - cz)); return [e.r * w * 2.2, e.g * w * 2.2, e.b * w * 2.2]; } : null, CH.embers);
      }
      if (alive) {
        // the bed: a low heap of coals, the glow broken by the noise and pulsing in the shader
        const bed = new THREE.CircleGeometry(r * 0.62, low ? 16 : 28, 0, 6.283).rotateX(-Math.PI / 2);
        const pos = bed.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), rr = hyp(x, z) / (r * 0.62); pos.setY(i, 0.09 * (1 - rr * rr) + 0.03 * N2(x * 9, z * 9)); }
        bed.computeVertexNormals();
        solids.add(bed, new THREE.Matrix4().makeTranslation(cx, g + 0.04, cz), C('#1a0d08'), (x, y, z) => {
          const w = (1 - smoothstep(0.1, r * 0.62, hyp(x - cx, z - cz))) * (0.45 + 0.55 * clamp(0.5 + N2(x * 7, z * 7), 0, 1));
          return [e.r * w * 3.2, e.g * w * 2.6, e.b * w * 2.0];
        }, CH.embers);
      }
    };
    // the live ring a little off the centre; three dead ones round it, all inside the armillary's bare r 6
    const lx = S.x + 0.6, lz = S.z - 0.8;
    ring(lx, lz, 0.72, true);
    for (const [a, rr] of [[0.35, 3.9], [2.55, 4.4], [4.35, 3.4]]) ring(S.x + Math.cos(a) * rr, S.z + Math.sin(a) * rr, 0.55 + rng() * 0.2, false);
    const g = G(lx, lz);
    glows.decal(MG, lx, lz, 3.4, 0, C(COL.ember).multiplyScalar(0.5), CH.embers, G);
    glows.halo(lx, g + 0.4, lz, 1.6, C('#ff5a1e').multiplyScalar(0.6), CH.embers, 2.2);
    for (let i = 0; i < (low ? 5 : 8); i++) glows.spark(lx + (rng() - 0.5) * 0.6, g + 0.15, lz + (rng() - 0.5) * 0.6, 0.035, C('#ffb060').multiplyScalar(3.5), CH.embers, rng());
    for (let i = 0; i < (low ? 7 : 12); i++) glows.smoke(lx, g + 0.2, lz, 0.25, C('#5a4c46'), i / (low ? 7 : 12));
    const L = light(COL.ember, 7, 12, lx, g + 0.45, lz);
    updates.push([(dt, t) => {
      const k = 0.78 + 0.12 * N2(t * 0.35, 4.1) + 0.07 * N2(t * 1.9, 2.3) + 0.03 * N2(t * 7, 1.7);
      U.uCh.value[CH.embers] = k; L.intensity = 7 * k;
    }, { pos: S, near: 90, hz: 2 }]);
  }

  // ---------------------------------------------------------------- the guttering lamp on a post
  if (want.includes('post')) {
    const S = SITES.lightPost, rng = ctx.makeRng(9301);
    // beside the causeway, on P3's side, its bracket over the road
    const ax = 45 / 61.5, az = 42 / 61.5; // the road's direction here, (-185, -72) to (-140, -30)
    const nx = az, nz = -ax; // south-east, the side P3 comes from
    const px = S.x + nx * 3.3, pz = S.z + nz * 3.3, g = G(px, pz), H = 3.6;
    const stone = C('#57504a'), bronze = C('#4a3a22'), verd = C('#3d5a4a'), iron = C('#1c1916');
    // local frame: +z along the bracket toward the road (north-west), +x across it
    const yaw = Math.atan2(-nx, -nz), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const at = (lx, ly, lz) => new THREE.Vector3(px + cy * lx + sy * lz, g + ly, pz - sy * lx + cy * lz);
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const put = (geo, lx, ly, lz, col, emit = null, ch = 0, s = null) => solids.add(geo, new THREE.Matrix4().compose(at(lx, ly, lz), rot, s || new THREE.Vector3(1, 1, 1)), col, emit, ch);
    put(new THREE.BoxGeometry(0.62, 0.4, 0.62), 0, 0.1, 0, stone.clone().multiplyScalar(0.85));
    put(new THREE.BoxGeometry(0.36, H, 0.36), 0, H / 2 + 0.25, 0, stone);
    put(new THREE.BoxGeometry(0.46, 0.14, 0.46), 0, H + 0.3, 0, stone.clone().multiplyScalar(0.9));
    // the bracket: a bronze arm out over the road with a strut under it
    put(new THREE.BoxGeometry(0.07, 0.09, 1.05), 0, H - 0.05, 0.62, bronze.clone().lerp(verd, 0.4));
    { const geo = new THREE.BoxGeometry(0.05, 0.05, 0.95).rotateX(-0.72); put(geo, 0, H - 0.4, 0.5, bronze); }
    put(new THREE.BoxGeometry(0.22, 0.08, 0.22), 0, H - 0.05, 0.02, bronze.clone().lerp(verd, 0.6), null, 0, new THREE.Vector3(1.9, 1, 1.9));
    put(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 3), 0, H - 0.26, 1.08, iron);
    const ly = H - 0.66;
    lantern(solids, (lx, yy, lz) => at(lx, yy, lz + 1.08), ly, rot, 1.15, C(COL.post), CH.post, iron, bronze);
    const lp = at(0, ly, 1.08);
    glows.halo(lp.x, lp.y, lp.z, 1.9, C(COL.post).multiplyScalar(0.6), CH.post, 1.8);
    glows.decal(MG, lp.x, lp.z, 5.5, 0, C(COL.post).multiplyScalar(0.3), CH.post, G);
    const L = light(COL.post, 3.4, 10, lp.x, lp.y - 0.05, lp.z);
    ctx.addCollider?.({ x: px, z: pz, r: 0.4 });
    // its own rhythm: a slow uneven flame; every 7-18 s it sags and flutters and recovers; every 60-120 s it goes
    // out for a second and sputters back
    let sag = 9 + rng() * 9, out = 40 + rng() * 50;
    let sagT = -1, outT = -1;
    updates.push([(dt, t) => {
      let k = 0.84 + 0.1 * N2(t * 0.9, 7.3) + 0.06 * N2(t * 5.3, 1.1);
      if (t >= sag && sagT < 0) { sagT = 0; sag = t + 7 + rng() * 11; }
      if (sagT >= 0) {
        sagT += dt;
        const dn = smoothstep(0, 0.5, sagT) * (1 - smoothstep(1.1, 2.8, sagT));
        k *= 1 - dn * (0.55 + 0.25 * Math.sin(sagT * 23) * Math.sin(sagT * 9.1));
        if (sagT > 2.8) sagT = -1;
      }
      if (t >= out && outT < 0) { outT = 0; out = t + 60 + rng() * 60; }
      if (outT >= 0) {
        outT += dt;
        const o = outT < 0.35 ? 1 - outT / 0.35 * 0.9 : outT < 1.45 ? 0.02 : outT < 1.55 ? 0.7 : outT < 1.7 ? 0.1 : outT < 2.5 ? smoothstep(1.7, 2.5, outT) : 1;
        k *= o;
        if (outT > 2.5) outT = -1;
      }
      U.uCh.value[CH.post] = k; L.intensity = 3.4 * k;
    }, { pos: S, near: 100, hz: 3 }]);
    api.post = { pos: lp, force: () => { out = ctx.time.t; } };
  }

  // ---------------------------------------------------------------- the lit doorway in the lens mount's south fin
  if (want.includes('door')) {
    const T = ctx.landmarks.tower, D = TOWER.door, S = SITES.lightDoor;
    // the south fin's end (structures/tower.js): the face at z = T.z + finReach, the leaf door.depth in
    const fz = T.z + TOWER.finReach, x = T.x, gd = MG.at(x, fz), w = D.w / 2, back = fz - D.depth;
    const warm = C(COL.door);
    // ajar: the leaf stands a hand open at its west edge; the slit of light between it and the jamb
    const slit = new THREE.PlaneGeometry(0.075, D.h - 0.12);
    solids.add(slit, new THREE.Matrix4().makeTranslation(x - w + 0.0375, gd + D.h / 2, back + 0.02), C('#000000'), () => [warm.r * 3.2, warm.g * 3.0, warm.b * 2.6], CH.door);
    // light thrown across onto the east jamb's inner face, the floor of the reveal and out onto the ground in a wedge toward the
    // south-east (rays from a slit at the west edge clear the east jamb)
    glows.wall(x + w - 0.01, gd, back + 0.05, fz - 0.02, D.h - 0.15, warm.clone().multiplyScalar(1.6), CH.door);
    glows.wedge(MG, x - w + 0.05, back + 0.1, 0.33, 7.5, 0.22, warm.clone().multiplyScalar(0.7), CH.door, G, gd);
    glows.halo(x, gd + 2.7, fz - 0.4, 0.75, warm.clone().multiplyScalar(0.45), CH.door, 1.6, 4.4);
    const L = light(COL.door, 2.6, 8, x - w + 0.3, gd + 1.6, back + 0.5);
    updates.push([(dt, t) => {
      const k = 0.9 + 0.07 * N2(t * 0.4, 3.3) + 0.03 * N2(t * 2.7, 9.1);
      U.uCh.value[CH.door] = k; L.intensity = 2.6 * k;
    }, { pos: S, near: 140, hz: 1 }]);
  }

  // ---------------------------------------------------------------- the Leerie's twelve standards
  if (want.includes('leerie')) {
    const S = SITES.leerie, rng = ctx.makeRng(9401);
    const [x0, z0] = S.from, [x1, z1] = S.to, len = hyp(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const nx = uz, nz = -ux; // the east side of the kerb, clear of the causeway
    const iron = C('#1d1a17'), rustC = C('#4b2a19'), lichen = C('#5d6540'), stone = C('#4c463f'), lit = C(COL.leerie);
    const heads = [], up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < LEERIE.n; i++) {
      const t = i / (LEERIE.n - 1), x = x0 + (x1 - x0) * t + nx * LEERIE.side, z = z0 + (z1 - z0) * t + nz * LEERIE.side, g = G(x, z) - 0.12;
      // each one a little different: height +-15 %, a lean of 0-4 degrees toward any side, a turn along the row
      const Hs = LEERIE.height * (0.85 + rng() * 0.3), la = rng() * 0.07, ld = rng() * Math.PI * 2;
      const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(ld) * la, Math.atan2(ux, uz) + (rng() - 0.5) * 0.3, Math.sin(ld) * la));
      const at = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(lean).add(new THREE.Vector3(x, g, z));
      const put = (geo, lx, ly, lz, col, emit = null, ch = 0, q = lean) => solids.add(geo, new THREE.Matrix4().compose(at(lx, ly, lz), q, new THREE.Vector3(1, 1, 1)), col, emit, ch);
      // the iron: dark and scaled, rust-brown toward the foot, a few blisters of scale; some standards rustier than others
      const rust = 0.25 + rng() * 0.5, tone = 0.85 + rng() * 0.3;
      const fe = (k) => iron.clone().multiplyScalar(tone).lerp(rustC, clamp(rust * k, 0, 1));
      // a stone foot, then the square shaft in three lengths, tapering; the forged collar a third of the way up
      put(new THREE.BoxGeometry(0.36, 0.3, 0.36), 0, 0.15, 0, stone.clone().multiplyScalar(0.8 + rng() * 0.3));
      const sq = (rb, rt, h) => new THREE.CylinderGeometry(rt, rb, h, 4, 1).rotateY(Math.PI / 4); // a square section: circumradius = side / sqrt 2
      const y0 = 0.3, yc = y0 + (Hs - y0) / 3, hA = yc - y0, hB = Hs - yc, rB = 0.11, rT = 0.055, rC = rB + (rT - rB) / 3;
      put(sq(rB * 1.25, rB, 0.3), 0, y0 + 0.15, 0, fe(1.3));
      put(sq(rB, rC, hA - 0.3), 0, y0 + 0.3 + (hA - 0.3) / 2, 0, fe(1));
      put(sq(rC, rT, hB), 0, yc + hB / 2, 0, fe(0.35));
      put(new THREE.BoxGeometry(0.18, 0.07, 0.18), 0, yc, 0, fe(0.6), null, 0, lean.clone().multiply(new THREE.Quaternion().setFromAxisAngle(up, Math.PI / 4)));
      put(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 3, 1, true), (rng() - 0.5) * 0.1, 0.5 + rng() * (Hs - 1), (rng() < 0.5 ? -1 : 1) * 0.08, rustC.clone().multiplyScalar(0.8 + rng() * 0.4)); // a blister of scale
      if (i % 3 === 1) put(new THREE.SphereGeometry(0.07, 5, 3).scale(1, 1.5, 0.4), 0.02, 0.45 + rng() * 0.5, 0.1, lichen); // a lichen patch on the shaft's face
      if (i % 4 === 2) put(new THREE.SphereGeometry(0.1, 5, 3).scale(1.3, 0.35, 1), 0.08, 0.3, 0.08, lichen); // and on the foot's shoulder
      // the crook: the shaft's head bends over the kerb (local -x) in an arc of five bars and ends in a hook turned down
      const cr = 0.22, ccy = Hs + 0.02, arc = [0, 30, 60, 90, 120, 150].map((d) => d * Math.PI / 180);
      for (let k = 0; k < 5; k++) {
        const a0 = arc[k], a1 = arc[k + 1], p0 = [-cr + cr * Math.cos(a0), ccy + cr * Math.sin(a0)], p1 = [-cr + cr * Math.cos(a1), ccy + cr * Math.sin(a1)];
        const dxa = p1[0] - p0[0], dya = p1[1] - p0[1];
        put(new THREE.CylinderGeometry(0.022, 0.022, Math.hypot(dxa, dya) + 0.012, 3, 1, true).rotateZ(Math.PI / 2), (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0, fe(0.4), null, 0, lean.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(dya, dxa))));
      }
      // the cage hangs from the hook by a short chain: five links; one hangs askew on a slack chain
      const hkx = -cr + cr * Math.cos(arc[5]), hky = ccy + cr * Math.sin(arc[5]) - 0.04, askew = i === 7, cx = hkx, cyTop = hky - 0.27;
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(askew ? 0.13 : (rng() - 0.5) * 0.05, rng() * 6, askew ? -0.3 : (rng() - 0.5) * 0.05));
      const cq = lean.clone().multiply(tilt), swing = askew ? 0.1 : 0;
      for (let k = 0; k < 5; k++) put(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 3, 1, true), cx + swing * (k + 1) / 6, hky - 0.025 - k * 0.04, 0, fe(0.3));
      // the cage: an open basket of six to eight ribs around the mantle; no glass, no cap. Its frame is the tilted one.
      const cageY = cyTop - 0.12, ccx = cx + swing, nr = 6 + Math.floor(rng() * 3), miss = i % 2 ? (rng() < 0.5 ? 1 : 0) + (rng() < 0.3 ? 1 : 0) : 0, skip = new Set();
      while (skip.size < miss) skip.add(Math.floor(rng() * nr));
      const cp = (px, py, pz) => { const v = new THREE.Vector3(px, py, pz).applyQuaternion(tilt); return [ccx + v.x, cageY + 0.12 + v.y, v.z]; }; // a point in the cage's frame (origin at its top ring) in the shaft's
      const [rx, ry, rz] = cp(0, 0, 0);
      put(new THREE.CylinderGeometry(0.052, 0.052, 0.014, 6, 1, true), rx, ry - 0.01, rz, fe(0.4), null, 0, cq);
      for (let k = 0; k < nr; k++) {
        if (skip.has(k)) continue;
        const a = k / nr * Math.PI * 2 + 0.2;
        // two segments per rib, bowing out to 0.1 at the waist and in to 0.07 at the foot
        for (const [r0, y0r, r1, y1r] of [[0.05, 0, 0.1, -0.17], [0.1, -0.17, 0.07, -0.34]]) {
          const dxr = Math.cos(a) * (r1 - r0), dzr = Math.sin(a) * (r1 - r0), dy = y1r - y0r, len3 = Math.hypot(dxr, dzr, dy);
          const mid = cp(Math.cos(a) * (r0 + r1) / 2, (y0r + y1r) / 2, Math.sin(a) * (r0 + r1) / 2);
          const rq = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(dxr, dy, dzr).normalize());
          put(new THREE.CylinderGeometry(0.008, 0.008, len3, 3, 1, true), mid[0], mid[1] + 0.0, mid[2], fe(0.5), (px, py, pz) => [lit.r * 0.55, lit.g * 0.5, lit.b * 0.4], CH.leerie + i, lean.clone().multiply(tilt).multiply(rq));
        }
      }
      const [bx, by, bz] = cp(0, -0.345, 0);
      put(new THREE.CylinderGeometry(0.075, 0.06, 0.025, 5), bx, by, bz, fe(0.6), null, 0, cq);
      // the mantle: a small ember-bright knot of ash on a wire, hung in the middle of the basket
      const [mx, my, mz] = cp(0, -0.17, 0);
      put(new THREE.SphereGeometry(0.055, 5, 3).scale(1, 1.6, 1), mx, my, mz, new THREE.Color('#0c0a08'), () => [lit.r * 4.2, lit.g * 3.8, lit.b * 3.1], CH.leerie + i, cq);
      const hp = at(mx, my, mz);
      heads.push(hp);
      glows.halo(hp.x, hp.y, hp.z, 1.2, lit.clone().multiplyScalar(0.42), CH.leerie + i, 2.4);
      glows.decal(MG, x, z, 4.2, 0, lit.clone().multiplyScalar(0.16), CH.leerie + i, G);
      ctx.addCollider?.({ x, z, r: 0.32 });
      api.mothLamps.push({ light: { intensity: 0 }, pos: hp.clone(), base: 1, per: [3, 5], min: 0 });
    }
    api.mothMax = LEERIE.n * 5;
    // two slot lights at the row's quarter points, each reaching the standards round it; on only while the row is lit
    const Ls = [2, 8].map((i) => light(COL.leerie, 0, 12, (heads[i].x + heads[i + 1].x) / 2, heads[i].y - 0.1, (heads[i].z + heads[i + 1].z) / 2));
    // the row lights only while the sun gutters: all twelve in a wave along it over half a second, from the house's end,
    // each with a flare and a tick; when the gutter ends they all go out together, the mantles glowing on for 2 s.
    // The gutter is read from the sun's flicker with a hysteresis (lit under 0.6, out over 0.85), so a held flicker poses
    // it. `ctx.leerie.light(true | false)` overrides (for renders and the v7 lamplighter); `light(null)` gives it back.
    const WAVE = 0.5 / (LEERIE.n - 1), AFTER = 2;
    const onT = new Float32Array(LEERIE.n).fill(-1e9);
    let rowLit = false, offT = -1e9, override = null, lastT = 0;
    const flare = (a) => (a < 0.12 ? 1 + 2.8 * (a / 0.12) : 1 + 2.8 * Math.exp(-(a - 0.12) * 2.6));
    function set(on, t) {
      if (on === rowLit) return;
      rowLit = on;
      if (on) for (let i = 0; i < LEERIE.n; i++) onT[i] = t + i * WAVE + 0.75 + 0.75 * N2(i * 2.3, 9.4); // v7.2-08: each catches on its own beat, 0-1.5 s late (a 22 Hz train of ticks was a rattle)
      else offT = t;
    }
    updates.push([(dt, t, f) => {
      lastT = t;
      set(override != null ? override : rowLit ? f < 0.85 : f < 0.6, t);
      let mid = 0;
      for (let i = 0; i < LEERIE.n; i++) {
        let k = 0;
        if (rowLit) {
          const a = t - onT[i];
          if (a >= 0) {
            if (a < dt + 0.001) ctx.audio?.cue?.('lamp-tick', heads[i]);
            k = flare(a) * (0.93 + 0.05 * N2(t * 0.8, i * 3.1) + 0.02 * N2(t * 4.4, i));
          }
        } else {
          const a = t - offT;
          if (a < AFTER) k = 0.55 * Math.pow(1 - a / AFTER, 2);
        }
        U.uCh.value[CH.leerie + i] = k; api.mothLamps[i].light.intensity = k; mid += k;
      }
      Ls[0].intensity = Ls[1].intensity = 3.0 * mid / LEERIE.n;
    }, { pos: S, r: len / 2, near: 40, hz: 4 }]);
    api.leerie = { heads, get lit() { return rowLit; }, light: (on) => { override = on; if (on != null) set(on, lastT); } };
    ctx.leerie = api.leerie;
  }

  // ---------------------------------------------------------------- the meshes
  const sMesh = solids.mesh(U);
  sMesh.name = 'local-lights-solids';
  scene.add(sMesh);
  const gMesh = glows.mesh(U);
  gMesh.name = 'local-lights-glows';
  scene.add(gMesh);
  for (const [fn, meta] of updates) ctx.registerUpdate((dt, t) => { U.uTime.value = t; fn(dt, t, ctx.sky?.flicker?.value ?? 1); }, meta);
  api.stats = () => ({ built: want, lights: lights.length, calls: 2, tris: sMesh.geometry.index.count / 3 + glows.count * 2, solidsTris: sMesh.geometry.index.count / 3, glowQuads: glows.count });
  api.lights = lights;
  ctx.localLights = api;
  ctx.log('local lights:', JSON.stringify(api.stats()));
}

// a lantern: a glass box in an iron cage under a pyramid cap; the glass's emissive on its channel. `at(lx, ly, lz)`
// places a local point, `rot` turns the parts.
function lantern(solids, at, y, rot, s, col, ch, iron, cap) {
  const m = (lx, ly, lz, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(at(lx, ly, lz), rot, new THREE.Vector3(sx, sy, sz));
  solids.add(new THREE.BoxGeometry(0.24 * s, 0.34 * s, 0.24 * s), m(0, y, 0), new THREE.Color('#0c0a08'), () => [col.r * 2.6, col.g * 2.4, col.b * 2.0], ch);
  for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) solids.add(new THREE.BoxGeometry(0.028 * s, 0.4 * s, 0.028 * s), m(cx * 0.125 * s, y, cz * 0.125 * s), iron, null, 0);
  solids.add(new THREE.ConeGeometry(0.24 * s, 0.2 * s, 4, 1).rotateY(Math.PI / 4), m(0, y + 0.29 * s, 0), cap, null, 0);
  solids.add(new THREE.BoxGeometry(0.3 * s, 0.04 * s, 0.3 * s), m(0, y - 0.19 * s, 0), iron, null, 0);
  solids.add(new THREE.SphereGeometry(0.035 * s, 6, 4), m(0, y + 0.42 * s, 0), cap, null, 0);
}

// ---- the solids: indexed geometry accumulated with vertex colours and a per-vertex emissive (rgb, channel)
class Solids {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.emit = []; this.idx = []; this.v = 0; }
  // emit: null, or (x, y, z) => [r, g, b] in world space; drape: (x, z) => y puts every vertex on the ground
  add(geo, m4, color, emit, ch, drape = null) {
    const g = m4 ? geo.clone().applyMatrix4(m4) : geo;
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = drape ? drape(x, z) : p.getY(i);
      this.pos.push(x, y, z); this.nor.push(n.getX(i), n.getY(i), n.getZ(i)); this.col.push(color.r, color.g, color.b);
      const e = emit ? emit(x, y, z) : null;
      if (e) this.emit.push(e[0], e[1], e[2], ch); else this.emit.push(0, 0, 0, 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.idx.push(this.v + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(this.v + i);
    this.v += p.count;
    if (g !== geo) g.dispose();
  }
  mesh(U) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('aEmit', new THREE.Float32BufferAttribute(this.emit, 4));
    geo.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    geo.computeBoundingSphere();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.1 });
    mat.onBeforeCompile = (s) => {
      s.uniforms.uCh = U.uCh; s.uniforms.uTime = U.uTime;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aEmit; uniform float uCh[16]; uniform float uTime; varying vec3 vEmit;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          int ch = int(aEmit.a + 0.5);
          float k = uCh[ch];
          // the embers' coals: a slow travelling pulse through the bed
          if (ch == 1) k *= 0.5 + 0.5 * (0.5 + 0.5 * sin(uTime * 0.9 + position.x * 6.1 + position.z * 4.3)) * (0.6 + 0.4 * sin(uTime * 0.37 + position.z * 7.7 - position.x * 2.9));
          vEmit = aEmit.rgb * k;`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEmit;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmit;');
    };
    mat.customProgramCacheKey = () => 'local-lights-solids';
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}

// ---- the glows: one quad per sprite. aAnchor the centre, aCorner the corner (-1..1), aSize (w, h), aColor,
// aMeta (channel, kind, seed, extra). Kinds: 0 a halo facing the camera; 1 a decal already placed (aCorner is its
// own shape coordinate, extra 0 round, 1 a wedge); 2 a spark, rising and going out; 3 a mote, drifting; 4 smoke (drawn
// "over", the rest add); 5 a wall wash (placed, fading from the slit). Premultiplied blending carries both.
class Glows {
  constructor() { this.a = []; this.c = []; this.s = []; this.col = []; this.meta = []; this.pos = []; this.idx = []; this.count = 0; }
  quad(ax, ay, az, corners, w, h, col, ch, kind, seed, extra, placed = null) {
    const base = this.count * 4;
    for (let k = 0; k < 4; k++) {
      const [cx, cy] = corners[k];
      this.a.push(ax, ay, az); this.c.push(cx, cy); this.s.push(w, h); this.col.push(col.r, col.g, col.b); this.meta.push(ch, kind, seed, extra);
      if (placed) this.pos.push(...placed[k]); else this.pos.push(ax, ay, az);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.count++;
  }
  halo(x, y, z, r, col, ch, sharp = 2, stretch = 1) { this.quad(x, y, z, SQ, r, r * stretch, col, ch, 0, sharp, 0); }
  spark(x, y, z, r, col, ch, seed) { this.quad(x, y, z, SQ, r, r, col, ch, 2, seed, 0); }
  mote(x, y, z, r, col, ch, seed) { this.quad(x, y, z, SQ, r, r, col, ch, 3, seed, 0); }
  smoke(x, y, z, r, col, seed) { this.quad(x, y, z, SQ, r, r, col, 1, 4, seed, 0); }
  // a ground decal: a grid of quads draped on the terrain mesh, its shape coordinate in aCorner
  decal(MG, x, z, r, shape, col, ch, G) {
    const n = 6;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cs = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [a / n * 2 - 1, b / n * 2 - 1]);
      const placed = cs.map(([u, v]) => { const px = x + u * r, pz = z + v * r; return [px, G(px, pz) + 0.07, pz]; });
      this.quad(x, 0, z, cs, r, r, col, ch, 1, 0, shape, placed);
    }
  }
  // a wedge on the ground from (x, z), along bearing `dir` (radians from +z toward +x), `len` long, `half` its half-angle
  wedge(MG, x, z, dir, len, half, col, ch, G, y0) {
    const nl = 8;
    for (let i = 0; i < nl; i++) {
      const s0 = i / nl, s1 = (i + 1) / nl;
      const cs = [[-1, s0], [1, s0], [1, s1], [-1, s1]];
      const placed = cs.map(([u, s]) => {
        const a = dir + u * half, d = 0.15 + s * len, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
        const inside = d < TOWER.door.depth + 0.1; // the reveal's floor, then the ground outside
        return [px, (inside ? y0 + 0.06 : G(px, pz) + 0.07), pz];
      });
      this.quad(x, 0, z, cs, len, len, col, ch, 1, 0, 1, placed);
    }
  }
  // a wash on a jamb's inner face (the plane x = x), from the leaf (z0) out to the face (z1)
  wall(x, y0, z0, z1, h, col, ch) {
    const cs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const placed = cs.map(([u, v]) => [x, y0 + v * h, z0 + u * (z1 - z0)]);
    this.quad(x, y0, z0, cs, 1, 1, col, ch, 5, 0, 0, placed);
  }
  mesh(U) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('aAnchor', new THREE.Float32BufferAttribute(this.a, 3));
    geo.setAttribute('aCorner', new THREE.Float32BufferAttribute(this.c, 2));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(this.s, 2));
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setAttribute('aMeta', new THREE.Float32BufferAttribute(this.meta, 4));
    geo.setIndex(this.idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
      vertexShader: GLOW_VS, fragmentShader: GLOW_FS, fog: true, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    });
    mat.uniforms.uCh = U.uCh; mat.uniforms.uTime = U.uTime;
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false; m.renderOrder = 25;
    return m;
  }
}
const SQ = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

const GLOW_VS = /* glsl */`
  uniform float uCh[16]; uniform float uTime;
  attribute vec3 aAnchor; attribute vec2 aCorner; attribute vec2 aSize; attribute vec3 aColor; attribute vec4 aMeta;
  varying vec2 vC; varying vec3 vCol; varying float vKind; varying float vX; varying float vA;
  #include <fog_pars_vertex>
  void main() {
    int ch = int(aMeta.x + 0.5); float kind = aMeta.y, seed = aMeta.z;
    float k = uCh[ch];
    vec3 transformed = position;
    vec4 mvPosition;
    vA = 1.0;
    if (kind < 0.5 || kind > 1.5 && kind < 4.5) {
      vec3 c = aAnchor; float s = aSize.x;
      if (kind < 0.5) s *= 1.0 + 0.3 * max(k - 1.0, 0.0); // a halo swells with a flare
      if (kind > 1.5 && kind < 2.5) {
        // a spark: most of its period nothing; then it rises a metre or two, wandering, and goes out
        float per = 5.0 + seed * 9.0, ph = fract(uTime / per + seed * 7.3), life = ph * per / 1.6;
        vA = life < 1.0 ? (1.0 - life) * smoothstep(0.0, 0.05, life) : 0.0;
        c += vec3(sin(life * 5.0 + seed * 20.0) * 0.25, life * (1.2 + seed * 0.8), cos(life * 4.0 + seed * 11.0) * 0.25);
      } else if (kind > 2.5 && kind < 3.5) {
        // a mote: slow drift round its home and a long slow blink
        float t = uTime * (0.12 + seed * 0.1);
        c += vec3(sin(t * 1.3 + seed * 30.0) * 0.8, sin(t * 1.9 + seed * 17.0) * 0.35, cos(t * 1.1 + seed * 23.0) * 0.8);
        vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.3 + seed * 0.2) + seed * 40.0), 3.0);
      } else if (kind > 3.5) {
        // smoke: a thread rising and leaning off with the air, widening and thinning
        float life = fract(uTime / 7.0 + seed);
        c += vec3(life * life * 1.4 + sin(life * 6.0 + seed * 9.0) * 0.12, life * 4.2, life * 0.6 + cos(life * 5.0) * 0.1);
        s *= 0.5 + life * 2.2;
        vA = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.45, 1.0, life)) * 0.24;
      }
      transformed = c;
      mvPosition = viewMatrix * vec4(c, 1.0);
      mvPosition.xy += aCorner * vec2(s, s * aSize.y / aSize.x);
    } else {
      mvPosition = viewMatrix * vec4(position, 1.0);
    }
    gl_Position = projectionMatrix * mvPosition;
    vC = aCorner; vKind = kind; vX = kind < 0.5 ? seed : aMeta.w; vCol = aColor * (kind > 3.5 ? 1.0 + 3.0 * k * pow(1.0 - fract(uTime / 7.0 + seed), 4.0) : k);
    #include <fog_vertex>
  }`;
const GLOW_FS = /* glsl */`
  varying vec2 vC; varying vec3 vCol; varying float vKind; varying float vX; varying float vA;
  #include <fog_pars_fragment>
  void main() {
    #ifdef USE_FOG
      vec3 fpR = vFogWorldPos - cameraPosition;
      float fpL = length(fpR);
      float fpF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      float fpH = fpHeightFog(cameraPosition, fpR / max(fpL, 1e-4), fpL);
      float fogAtten = (1.0 - fpF) * (1.0 - fpH * 0.7);
    #else
      float fogAtten = 1.0;
    #endif
    float a;
    if (vKind < 0.5) { float r2 = dot(vC, vC); a = exp(-r2 * vX * 2.0) * (1.0 - smoothstep(0.7, 1.0, r2)); }
    else if (vKind < 1.5) {
      if (vX < 0.5) { float r = length(vC); a = pow(max(0.0, 1.0 - r), 2.2); }
      else { float s = vC.y; a = pow(1.0 - s, 1.6) * smoothstep(0.0, 0.08, s) * (1.0 - smoothstep(0.35, 1.0, abs(vC.x))); }
    }
    else if (vKind < 3.5) { float r2 = dot(vC, vC); a = exp(-r2 * 5.0) * (1.0 - step(1.0, r2)) * vA; }
    else if (vKind < 4.5) {
      float r2 = dot(vC, vC); float al = exp(-r2 * 2.5) * (1.0 - smoothstep(0.6, 1.0, r2)) * vA * fogAtten;
      gl_FragColor = vec4(vCol * al, al); return;
    }
    else { a = pow(1.0 - vC.x, 2.0) * smoothstep(0.0, 0.1, vC.y) * (1.0 - smoothstep(0.75, 1.0, vC.y)); }
    gl_FragColor = vec4(vCol * a * fogAtten, 0.0);
  }`;
