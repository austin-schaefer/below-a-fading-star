// The Armiger's Tower (v5 recast, the awe audit): a lens mount. The age of instruments, slender and fluted like a
// modern spire: one fluted shaft 70 m tall on three plain blade-fins, carrying at its head a bronze yoke and a ring
// 20 m across (its top 92 m up) that holds a dished black-glass lens to the sun. Three of the lens's twelve panes were never set; one
// lies at the foot where it was left. One window lit near the top, looking back down the v3 road; a doorway with
// no handle in the south fin's end, at (-250, -120), for the lit doorway (v5 lights). `?tower=v2` builds the old
// watchtower instead (tower/v2.js); only one of the two is ever built.
// Draws: the masonry (kit cyclopean stone, courses diminishing as they rise), the bronze, the glass, the measure
// figure, and the window panel inside the structures' merged stone mesh.
import * as THREE from 'three';
import { mat } from './geo.js';
import { mergeGeometries } from '../v4/kit/merge.js';
import { CAUSEWAY } from '../world.js'; // v4 map: placed by the v3 stretch of the road (gate to tower hill), which CAUSEWAY_V4 keeps
import { buildTowerV2 } from './tower/v2.js';

// heights above the hilltop (m)
export const TOWER = { shaft: 70, ringY: 81.5, ring: 10, finReach: 15, finTop: 36, finEnd: 9, door: { w: 1.2, h: 5.8, depth: 1.8 } };

export function buildTower(ctx, B, env) {
  if (new URL(location.href).searchParams.get('tower') === 'v2') return buildTowerV2(ctx, B, env);
  return buildLensMount(ctx, B, env);
}

const R = (y) => 2.5 + 3.4 * Math.pow(Math.max(0, 1 - y / TOWER.shaft), 1.7) + 1.4 * Math.exp(-Math.max(0, y) / 3);

function buildLensMount(ctx, B, env) {
  const { ground } = env;
  const rng = ctx.makeRng(5301);
  const low = ctx.quality === 'low';
  const L = ctx.landmarks.tower;
  const x = L.x, z = L.z;
  const gm = ground.groundAt(x, z);
  const H = TOWER.shaft;
  // the window looks back down the v3 road toward the keep (as the old tower's did)
  const end = CAUSEWAY[CAUSEWAY.length - 1];
  const winA = Math.atan2(end.z - z, end.x - x);
  const stone = [], bronze = [], glass = [];

  // ---- the shaft: NF concave flutes with sharp arrises, each its own strip so the arrises stay crisp
  const NF = 16, segF = low ? 3 : 5, rings = low ? 44 : 84;
  const FD = 0.11, theta0 = winA - Math.PI / NF; // a flute centred on the window
  const y0 = ground.minGround(x, z, 7.5) - 1.0 - gm;
  {
    const pos = [], idx = [];
    for (let f = 0; f < NF; f++) {
      const base = pos.length / 3;
      for (let j = 0; j <= rings; j++) {
        const t = Math.pow(j / rings, 1.35);
        const yl = y0 + (H - y0) * t, r0 = R(yl);
        for (let i = 0; i <= segF; i++) {
          const u = i / segF, th = theta0 + (f + u) * Math.PI * 2 / NF;
          const r = r0 * (1 - FD * Math.pow(Math.sin(Math.PI * u), 0.7));
          pos.push(x + Math.cos(th) * r, gm + yl, z + Math.sin(th) * r);
        }
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < segF; i++) {
        const a = base + j * (segF + 1) + i, b = a + 1, c = a + segF + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    stone.push(g);
  }

  // flat-shaded quads, wound to face `o`
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();
  function quads() {
    const P = [];
    return {
      P,
      quad(a, b, c, d, o) {
        _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
        _n.crossVectors(_a, _b);
        const flip = _n.x * o[0] + _n.y * o[1] + _n.z * o[2] < 0;
        if (flip) P.push(...a, ...c, ...b, ...a, ...d, ...c); else P.push(...a, ...b, ...c, ...a, ...c, ...d);
      },
      geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g; },
    };
  }

  // ---- three blade-fins, plain planes sweeping from the shaft at 32 m down to a vertical end 15 m out; the
  // south one ends at the doorway
  const S = TOWER.finReach, sIn = 1.5, Yf = TOWER.finTop, hEnd = TOWER.finEnd, Ns = low ? 14 : 26;
  const yTop = (s) => hEnd + (Yf - hEnd) * Math.pow((S - s) / (S - sIn), 2.2);
  const halfAt = (s, yt) => { const hb = 2.0; return [hb, hb * (1 - 0.55 * Math.min(1, (yt - hEnd) / (Yf - hEnd)))]; };
  const door = TOWER.door;
  const doorNote = {};
  for (let k = 0; k < 3; k++) {
    const phi = Math.PI / 2 + k * Math.PI * 2 / 3; // k 0 points due south, at the road
    const dx = Math.cos(phi), dz = Math.sin(phi), nx = -dz, nz = dx;
    const Q = quads();
    const P = (s, side, y) => [x + dx * s + nx * side, y, z + dz * s + nz * side];
    let prev = null;
    for (let q = 0; q <= Ns; q++) {
      const s = sIn + (S - sIn) * (q / Ns);
      const yt = gm + yTop(s), [hb, ht] = halfAt(s, yt - gm);
      const yb = ground.minGround(x + dx * s, z + dz * s, 2.2) - 0.8;
      const cur = { s, yt, yb, hb, ht };
      if (prev) {
        for (const sd of [1, -1]) Q.quad(P(prev.s, sd * prev.hb, prev.yb), P(s, sd * hb, yb), P(s, sd * ht, yt), P(prev.s, sd * prev.ht, prev.yt), [nx * sd, 0, nz * sd]);
        Q.quad(P(prev.s, prev.ht, prev.yt), P(s, ht, yt), P(s, -ht, yt), P(prev.s, -prev.ht, prev.yt), [0, 1, 0]);
      }
      prev = cur;
    }
    // the end face, with the doorway in the south fin
    const e = prev, out = [dx, 0, dz];
    if (k !== 0) Q.quad(P(S, e.hb, e.yb), P(S, -e.hb, e.yb), P(S, -e.ht, e.yt), P(S, e.ht, e.yt), out);
    else {
      const gd = ground.groundAt(x + dx * S, z + dz * S), w = door.w / 2, dh = gd + door.h, dp = S - door.depth;
      Q.quad(P(S, e.hb, e.yb), P(S, w, e.yb), P(S, w, e.yt), P(S, e.ht, e.yt), out);
      Q.quad(P(S, -w, e.yb), P(S, -e.hb, e.yb), P(S, -e.ht, e.yt), P(S, -w, e.yt), out);
      Q.quad(P(S, w, dh), P(S, -w, dh), P(S, -w, e.yt), P(S, w, e.yt), out);
      Q.quad(P(S, w, e.yb), P(S, -w, e.yb), P(S, -w, gd + 0.04), P(S, w, gd + 0.04), out);
      // the reveal: jambs, soffit, a floor worn by nothing
      Q.quad(P(dp, w, gd), P(S, w, gd), P(S, w, dh), P(dp, w, dh), [-nx, 0, -nz]);
      Q.quad(P(dp, -w, gd), P(S, -w, gd), P(S, -w, dh), P(dp, -w, dh), [nx, 0, nz]);
      Q.quad(P(dp, w, dh), P(S, w, dh), P(S, -w, dh), P(dp, -w, dh), [0, -1, 0]);
      Q.quad(P(dp, w, gd + 0.04), P(S, w, gd + 0.04), P(S, -w, gd + 0.04), P(dp, -w, gd + 0.04), [0, 1, 0]);
      // the door itself: one black-glass leaf, flush, no handle
      const G = quads();
      G.quad(P(dp, w, gd), P(dp, -w, gd), P(dp, -w, dh), P(dp, w, dh), out);
      glass.push(G.geo());
      Object.assign(doorNote, { x: x + dx * S, z: z + dz * S, y: gd, facing: { x: dx, z: dz }, width: door.w, height: door.h });
    }
    stone.push(Q.geo());
    for (let s = 5; s < S - 0.4; s += 1.6) ctx.addCollider({ x: x + dx * s, z: z + dz * s, r: 2.0 });
  }
  ctx.addCollider({ x, z, r: 7.0 });

  // ---- the head: a bronze collar, a yoke of two arms, trunnions, the ring, the dished lens
  const sun = ctx.sun?.dir || { x: -0.913, y: 0.233, z: 0.332 };
  const nL = new THREE.Vector3(sun.x, sun.y, sun.z).normalize(); // the lens faces the sun
  const tL = new THREE.Vector3(-nL.z, 0, nL.x).normalize();     // the trunnions' axis, level
  const bL = new THREE.Vector3().crossVectors(nL, tL).normalize();
  if (bL.y < 0) bL.negate();
  const C = new THREE.Vector3(x, gm + TOWER.ringY, z), RL = TOWER.ring;
  const M = new THREE.Matrix4();
  const put = (g, list) => { list.push(g.index ? g.toNonIndexed() : g); return g; };
  put(new THREE.CylinderGeometry(3.1, 2.7, 2.6, 32, 1).applyMatrix4(M.makeTranslation(x, gm + H - 0.4, z)), bronze);
  put(new THREE.CylinderGeometry(1.9, 3.1, 0.9, 32, 1).applyMatrix4(M.makeTranslation(x, gm + H + 1.35, z)), bronze);
  const trunR = RL + 1.3;
  for (const sg of [1, -1]) {
    const at = (h, d) => new THREE.Vector3(x, gm + h, z).addScaledVector(tL, sg * d);
    const curve = new THREE.CatmullRomCurve3([at(H + 0.8, 1.6), at(H + 2.2, 4.8), at(H + 5.0, 8.6), at(TOWER.ringY - 3.0, trunR), at(TOWER.ringY, trunR)]);
    put(new THREE.TubeGeometry(curve, low ? 16 : 32, 0.8, low ? 6 : 10, false), bronze);
    const trun = new THREE.CylinderGeometry(1.0, 1.0, 2.0, 14, 1);
    trun.applyMatrix4(M.makeBasis(nL, tL, bL)).applyMatrix4(new THREE.Matrix4().makeTranslation(C.x + tL.x * sg * (RL + 0.9), C.y, C.z + tL.z * sg * (RL + 0.9)));
    put(trun, bronze);
  }
  const basis = new THREE.Matrix4().makeBasis(tL, bL, nL); // lens-local x along the trunnions, y up the face, z at the sun
  const dish = (rho) => 1.0 * (rho / RL) * (rho / RL);
  const lensPt = (rho, psi) => new THREE.Vector3(Math.cos(psi) * rho, Math.sin(psi) * rho, dish(rho)).applyMatrix4(basis).add(C);
  {
    const ring = new THREE.TorusGeometry(RL + 0.1, 0.8, low ? 6 : 8, low ? 64 : 112);
    ring.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, dish(RL))).applyMatrix4(basis).applyMatrix4(new THREE.Matrix4().makeTranslation(C.x, C.y, C.z));
    put(ring, bronze);
    const hub = new THREE.CylinderGeometry(1.5, 1.5, 0.9, 20, 1);
    hub.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)).applyMatrix4(basis).applyMatrix4(new THREE.Matrix4().makeTranslation(C.x, C.y, C.z));
    put(hub, bronze);
  }
  // twelve panes between twelve spokes; three never set
  const NP = 12, missing = new Set([4, 5, 9]);
  const paneQ = quads();
  const pane = (Q, k, at = lensPt) => {
    const a0 = (k / NP) * Math.PI * 2 + 0.012, a1 = ((k + 1) / NP) * Math.PI * 2 - 0.012, nr = 4, na = low ? 4 : 6;
    for (let i = 0; i < nr; i++) for (let j = 0; j < na; j++) {
      const r0 = 1.4 + (RL - 1.9) * i / nr, r1 = 1.4 + (RL - 1.9) * (i + 1) / nr;
      const p0 = a0 + (a1 - a0) * j / na, p1 = a0 + (a1 - a0) * (j + 1) / na;
      const v = [at(r0, p0), at(r1, p0), at(r1, p1), at(r0, p1)].map((p) => [p.x, p.y, p.z]);
      Q.quad(v[0], v[1], v[2], v[3], [nL.x, nL.y, nL.z]);
    }
  };
  for (let k = 0; k < NP; k++) {
    if (!missing.has(k)) pane(paneQ, k);
    const psi = (k / NP) * Math.PI * 2;
    const p0 = lensPt(1.0, psi), p1 = lensPt(RL - 0.2, psi), len = p0.distanceTo(p1);
    const spoke = new THREE.BoxGeometry(0.34, len, 0.4);
    const dir = p1.clone().sub(p0).normalize();
    const side = new THREE.Vector3().crossVectors(dir, nL).normalize(), fwd = new THREE.Vector3().crossVectors(side, dir);
    spoke.applyMatrix4(new THREE.Matrix4().makeBasis(side, dir, fwd)).applyMatrix4(new THREE.Matrix4().makeTranslation((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2));
    put(spoke, bronze);
  }
  glass.push(paneQ.geo());
  // the pane left at the foot, between the south fin and the window's side: lying where it was set down
  {
    const ang = 0.12, rr = 12.5, px = x + Math.cos(ang) * rr, pz = z + Math.sin(ang) * rr, py = ground.groundAt(px, pz) + 0.25;
    const lay = new THREE.Matrix4().makeRotationY(-ang - 0.9).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2 + 0.16));
    const at = (rho, psi) => new THREE.Vector3(Math.cos(psi) * rho, Math.sin(psi) * rho - (RL / 2 + 0.6), dish(rho)).applyMatrix4(lay).add(new THREE.Vector3(px, py, pz));
    const Q = quads(); pane(Q, 3, at); glass.push(Q.geo());
    ctx.addCollider({ x: px, z: pz, r: 3.6, y: py - 1, h: 2.2 });
  }

  // ---- the lit window: a slot of warm light at the deep of the flute that faces the road, high on the shaft
  {
    const wy0 = 54, wy1 = 59, rr = R((wy0 + wy1) / 2) * (1 - FD) + 0.05;
    const cx = x + Math.cos(winA) * rr, cz = z + Math.sin(winA) * rr;
    B.add(B.box(0.7, wy1 - wy0, 0.04), mat(cx, gm + (wy0 + wy1) / 2, cz, 0, Math.PI / 2 - winA, 0), { color: new THREE.Color(0.05, 0.03, 0.02), moss: 0, ground: gm, emit: [1.6, 0.62, 0.2, 1] });
    const light = new THREE.PointLight(new THREE.Color('#ff8a3c'), 6, 11, 2);
    light.position.set(x + Math.cos(winA) * (rr + 0.7), gm + (wy0 + wy1) / 2, z + Math.sin(winA) * (rr + 0.7));
    ctx.scene.add(light);
    (env.updates ||= []).push((dt, t, f, flame) => { light.intensity = 6 * flame * (0.3 + 0.7 * f); });
    env.notes.towerWindow = { x: light.position.x, y: light.position.y, z: light.position.z };
  }
  // where the bats come out at a gutter: the gap under the collar (fauna/gutterbats.js)
  env.notes.towerTop = { y: H - 1.8, r: 2.9 };
  env.notes.towerDoor = doorNote;

  // ---- materials and meshes
  const extra = (env.extraMeshes ||= []);
  const add = (geos, material, name) => {
    const g = mergeGeometries(geos);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
    extra.push({ mesh: m, tris: g.attributes.position.count / 3 });
    return g;
  };
  const masonry = ctx.kit.masonry({ color: '#6c645c', course: 1.8, base: gm, diminish: 0.972, slab: 2.6, joint: 0.03, wear: 0.55, moss: 0.35, inlay: 'bronze', inlayEvery: 0.1 });
  add(stone, masonry.mat, 'tower-masonry');
  // bronze, gone to verdigris where the rain runs and black where it does not
  const bg = add(bronze, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.5 }), 'tower-bronze');
  {
    const p = bg.attributes.position, n = bg.attributes.normal, col = new Float32Array(p.count * 3);
    const dark = new THREE.Color('#2c2014'), verd = new THREE.Color('#3d6a58'), c = new THREE.Color();
    const N2 = ctx.noise.noise2;
    for (let i = 0; i < p.count; i++) {
      const v = 0.5 + 0.5 * N2(p.getX(i) * 0.45 + p.getY(i) * 0.3, p.getZ(i) * 0.45 - p.getY(i) * 0.2);
      const w = Math.min(1, Math.max(0, (v - 0.45) * 2.2 + Math.max(0, n.getY(i)) * 0.5));
      c.copy(dark).lerp(verd, w).multiplyScalar(0.85 + 0.3 * rng());
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  add(glass, new THREE.MeshStandardMaterial({ color: '#07070a', roughness: 0.07, metalness: 0.5, side: THREE.DoubleSide }), 'tower-glass');
  // a measure: one robed figure by the doorway
  const fig = ctx.kit.measureFigures([{ x: x - 3.3, z: z + S - 2.6, yaw: -0.3 }], { name: 'tower-measure' }, ctx);
  extra.push({ mesh: fig, tris: fig.geometry.attributes.position.count / 3 });
}
