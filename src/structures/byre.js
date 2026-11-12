// The Deodand Byre (the Oast Byre): a low drystone byre at the wood's edge, its slate roof sagging and half fallen in,
// a dark doorway facing the wood, a stone trough, a tether ring, and bones. A few more inside the door.
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, rubblePile } from './common.js';

export function buildByre(ctx, B, env) {
  const { rng, ground, tints } = env;
  const LM = ctx.landmarks.byre;
  // The landmark centre sits on the tarn's shore (its south-east quarter is under water), so the byre
  // stands a few strides north-west of it on dry ground, still within the landmark.
  const ox = LM.x - 8, oz = LM.z - 8;
  // the long axis runs north-west to south-east; the door side faces south-west, toward the wood
  const theta = -0.877;
  const Lx = Math.cos(theta), Lz = -Math.sin(theta);   // local +x
  const Fx = Math.sin(theta), Fz = Math.cos(theta);    // local +z, the door side
  const W = (lx, lz) => [ox + Lx * lx + Fx * lz, oz + Lz * lx + Fz * lz];
  const M = (lx, ly, lz, rx = 0, ry = 0, rz = 0) => { const [x, z] = W(lx, lz); return mat(x, ly, z, rx, theta + ry, rz); };
  const len = 10, wid = 5.2, th = 0.65, eave = 2.15, peak = 3.65;
  const hl = len / 2, hw = wid / 2;
  let g0 = Infinity, gSum = 0;
  for (const [a, b] of [[-hl, -hw], [hl, -hw], [-hl, hw], [hl, hw], [0, 0]]) { const [x, z] = W(a, b); const h = ground.groundAt(x, z); g0 = Math.min(g0, h); gSum += h; }
  const gAvg = gSum / 5, base = g0 - 0.35;
  const stoneT = vary(tints.stone, rng, 0.04).multiplyScalar(0.85);
  const COURSE = 0.26;
  const door = { lx0: 0.25, lx1: 1.55, h: 1.85 };
  const collapsedSide = -1; // the north-west half has fallen in

  const wallChunk = (lx, lz, w, h, alongX, i) => {
    const [x, z] = W(lx, lz);
    const gm = ground.groundAt(x, z);
    const H = gAvg + h - base;
    B.add(B.box(alongX ? w : th, H, alongX ? th : w, { seg: 0.5, chip: 0.1, chipTop: true, seed: i, uvOffset: [alongX ? lx : lz, 0] }), M(lx, base + H / 2, lz, (rng() - 0.5) * 0.015, 0, (rng() - 0.5) * 0.015), {
      color: vary(stoneT, rng, 0.07), course: COURSE, moss: 0.95, ground: gm, disp: 0.05, dispScale: 2.2,
    });
  };
  // long walls, the eaves sagging toward the fallen end
  const sag = (lx) => -0.18 * Math.max(0, -lx * collapsedSide) / hl - 0.12 * Math.sin(Math.PI * (lx + hl) / len);
  let ci = 0;
  for (const side of [-1, 1]) {
    for (let lx = -hl; lx < hl - 0.01; lx += 1.0) {
      const w = Math.min(1.0, hl - lx), cxm = lx + w / 2;
      let h = eave + sag(cxm) + (rng() - 0.5) * 0.12;
      if (cxm * collapsedSide > 3.3 && side < 0) h -= 0.8 * rng(); // the back wall slumps where the roof went
      if (side > 0 && cxm > door.lx0 - 0.02 && cxm < door.lx1 + 0.02) {
        // the doorway: a lintel stone above a dark gap
        const [x, z] = W(cxm, side * (hw - th / 2));
        B.add(B.box(w + 0.02, eave + sag(cxm) - door.h - 0.3, th, { seg: 0.5, chip: 0.06 }), M(cxm, gAvg + door.h + 0.3 + (eave + sag(cxm) - door.h - 0.3) / 2, side * (hw - th / 2)), { color: vary(stoneT, rng, 0.07), course: COURSE, moss: 0.9, ground: ground.groundAt(x, z), disp: 0.04, dispScale: 2.2 });
        continue;
      }
      wallChunk(cxm, side * (hw - th / 2), w + 0.02, h, true, ci++);
    }
  }
  // lintel over the door
  B.add(B.box(door.lx1 - door.lx0 + 0.9, 0.32, th + 0.1, { chip: 0.05 }), M((door.lx0 + door.lx1) / 2, gAvg + door.h + 0.16, hw - th / 2), { color: vary(tints.old, rng, 0.05), moss: 0.7, ground: gAvg });
  // v8-03: the Late folk keep it now: a painted leaf swung back against the wall, a rag awning over the door, their
  // sign tiled into the wall beside it (the Elder block for the threshold is v8/strata/place.js's)
  const S = ctx.strata?.on ? ctx.strata : null;
  if (S) {
    const L = S.colors.late, face = hw + 0.005;
    for (let k = 0; k < 5; k++) B.add(B.box(0.25, 1.75, 0.06), M(door.lx0 - 1.0 + k * 0.255, gAvg + 0.92, face + 0.08, 0, 0, (rng() - 0.5) * 0.02), { color: vary(k % 2 ? L.paint[1] : L.paint[1].clone().multiplyScalar(0.85), rng, 0.05), moss: 0.05, ground: gAvg });
    for (const y of [0.35, 1.5]) B.add(B.box(1.3, 0.12, 0.05), M(door.lx0 - 0.49, gAvg + y, face + 0.13), { color: L.paint[0], moss: 0, ground: gAvg });
    B.add(B.box(0.1, 1.4, 0.05), M(door.lx0 - 0.49, gAvg + 0.93, face + 0.13, 0, 0, 0.72), { color: L.paint[0], moss: 0, ground: gAvg });
    S.parts.late.awning(B, M((door.lx0 + door.lx1) / 2, gAvg, face), { w: 2.4, d: 1.5, h: 2.3, rng });
    S.parts.late.sign(B, M(2.55, gAvg + 0.75, face + 0.05), { w: 0.7, h: 0.7, rng });
    const [sx, sz] = W(2.55, face + 0.08);
    S.place({ hand: 'late', kind: 'sign', name: "the Oast Byre's door", x: sx, y: gAvg + 1.1, z: sz, face: [Fx, Fz], mount: 'wall', size: 0.7 });
  }
  // gable ends: courses stepping in toward the ridge; the fallen end broken low
  for (const end of [-1, 1]) {
    const lx = end * (hl - th / 2);
    const broken = end === collapsedSide;
    for (let y = 0; y < peak; y += COURSE * 1.5) {
      const yc = y + COURSE * 0.75;
      let w = yc < eave ? wid : wid * (1 - (yc - eave) / (peak - eave)) + 0.2;
      if (w < 0.3) break;
      if (broken && yc > 2.2 + rng() * 0.6) {
        if (yc > 2.9) break;
        w *= 0.4 + rng() * 0.3;
      }
      const off = broken && yc > 2.0 ? (rng() - 0.5) * 1.2 : 0;
      const H = (y === 0 ? gAvg - base : 0) + COURSE * 1.5 + 0.02;
      B.add(B.box(th, H, w, { seg: 0.5, chip: 0.08, seed: y * 10 + end }), M(lx, (y === 0 ? base : gAvg + y) + H / 2, off), { color: vary(stoneT, rng, 0.07), course: COURSE, moss: 0.95, ground: gAvg, disp: 0.045, dispScale: 2.2 });
    }
  }
  // a slit window in the back wall, a stone loose beneath it
  {
    const [x, z] = W(2.6, -hw - 0.01);
    B.add(B.box(0.18, 0.6, 0.05), M(2.6, gAvg + 1.35, -hw - 0.005), { color: tints.black, moss: 0, ground: gAvg });
    void x; void z;
  }

  // ---- the roof ----
  const pitch = Math.atan2(peak - eave, hw + 0.25);
  const slopeLen = Math.hypot(peak - eave, hw + 0.25) + 0.35;
  const roofY = (lx, s) => gAvg + peak + 0.08 - s * Math.sin(pitch) + sag(lx) * (0.6 + 0.4 * s / slopeLen) - 0.28 * Math.sin(Math.PI * Math.min(1, (lx + hl) / len)) * Math.sin(Math.PI * s / slopeLen);
  const slateC = tints.slate;
  for (const side of [-1, 1]) {
    // rafters
    for (let lx = -hl + 0.3; lx < hl; lx += 0.75) {
      const fallen = lx * collapsedSide > 0.6;
      if (fallen && rng() < 0.75) continue;
      const s = slopeLen / 2;
      const y = roofY(lx, s) - 0.12;
      B.add(B.box(0.12, 0.14, slopeLen), M(lx, y - (fallen ? 0.6 + rng() * 0.6 : 0), side * (s * Math.cos(pitch)), side * pitch + (fallen ? side * (0.3 + rng() * 0.5) : 0), 0, fallen ? (rng() - 0.5) * 0.4 : 0), { color: vary(tints.wood, rng, 0.15), moss: 0.2, ground: gAvg });
    }
    // slates, row by row, slipping and missing toward the hole
    for (let s = 0.15; s < slopeLen; s += 0.24) {
      for (let lx = -hl - 0.25; lx < hl + 0.25; lx += 0.31) {
        const hole = lx * collapsedSide;
        const edge = hole + 0.3 * Math.sin(s * 4) + (rng() - 0.5) * 0.8;
        if (edge > 0.3) continue;
        if (rng() < 0.07 + Math.max(0, edge + 1.6) * 0.12) continue;
        const lz = side * (s * Math.cos(pitch));
        const y = roofY(lx, s) + 0.02;
        const slip = rng() < 0.06 ? 0.15 : 0;
        B.add(B.box(0.3, 0.025, 0.42), M(lx + (rng() - 0.5) * 0.03, y - slip * Math.sin(pitch), lz + side * slip * Math.cos(pitch), side * pitch + (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.08, (rng() - 0.5) * 0.06), {
          color: vary(slateC, rng, 0.16), moss: 0.85, ground: gAvg, disp: 0,
        });
      }
    }
  }
  // ridge stones over the part that stands
  for (let lx = 0.2; lx < hl + 0.2; lx += 0.5) B.add(B.box(0.52, 0.16, 0.42, { chip: 0.03 }), M(lx, roofY(lx, 0) + 0.06, 0, Math.PI / 4, 0, 0), { color: vary(tints.old, rng, 0.07), moss: 0.9, ground: gAvg });
  // the fallen half inside: a heap of slates and stone
  for (let i = 0; i < 70; i++) {
    const lx = collapsedSide * (0.8 + rng() * (hl - 1.6)), lz = (rng() - 0.5) * (wid - 1.8);
    const [x, z] = W(lx, lz);
    const gy = ground.groundAt(x, z) + 0.05 + rng() * 0.35 * (1 - Math.abs(lz) / hw);
    B.add(B.box(0.3, 0.025, 0.42), mat(x, gy, z, (rng() - 0.5) * 1.6, rng() * 6.28, (rng() - 0.5) * 1.6), { color: vary(slateC, rng, 0.18), moss: 0.5, ground: gy - 0.3 });
  }
  {
    const [x, z] = W(collapsedSide * 2.8, -0.4);
    rubblePile(B, env, x, z, 1.8, 16, { height: 0.5, size: 0.35, tint: stoneT });
  }

  // ---- the trough, the ring ----
  {
    const lx = 3.2, lz = hw + 1.0;
    const [x, z] = W(lx, lz);
    const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 1.1) - 0.15;
    const tH = 0.6 + gm - gb;
    B.add(B.box(2.0, 0.22, 0.75, { chip: 0.04 }), M(lx, gb + 0.11, lz, 0, 0.08, 0), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: gm });
    for (const s of [-1, 1]) {
      B.add(B.box(2.0, tH, 0.13, { chip: 0.04, chipTop: true, seed: s }), M(lx, gb + tH / 2, lz + s * 0.31, 0, 0.08, 0), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: gm, disp: 0.01 });
      B.add(B.box(0.13, tH, 0.75, { chip: 0.04 }), M(lx + s * 0.94, gb + tH / 2, lz, 0, 0.08, 0), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: gm, disp: 0.01 });
    }
    // stagnant water, black and still
    B.add(B.box(1.75, 0.02, 0.5), M(lx, gm + 0.42, lz, 0, 0.08, 0), { color: new THREE.Color(0.006, 0.007, 0.006), moss: 0, wet: 1, ground: gm - 1 });
    ctx.addCollider({ x, z, r: 0.75 });
    const [x2, z2] = W(lx - 0.7, lz); ctx.addCollider({ x: x2, z: z2, r: 0.5 });
    const [x3, z3] = W(lx + 0.7, lz); ctx.addCollider({ x: x3, z: z3, r: 0.5 });
  }
  {
    const lx = -0.45, ly = gAvg + 1.25, lz = hw + 0.04;
    B.add(B.box(0.06, 0.1, 0.08), M(lx, ly + 0.06, lz), { color: tints.iron, iron: 1, moss: 0, ground: gAvg });
    const ring = new THREE.TorusGeometry(0.1, 0.017, 6, 14);
    B.add(ring, M(lx, ly - 0.06, lz + 0.03, 0, Math.PI / 2, 0.15), { color: tints.iron, iron: 1, moss: 0, ground: gAvg });
    const [x, z] = W(lx, hw + 0.01);
    env.rust.push([x, ly + 0.02, z, 1.15]);
  }

  // ---- colliders: the walls, the doorway left open ----
  const wallC = (lx, lz) => { const [x, z] = W(lx, lz); ctx.addCollider({ x, z, r: 0.42 }); };
  for (let lx = -hl + 0.3; lx <= hl - 0.3; lx += 0.9) {
    wallC(lx, -(hw - th / 2));
    if (!(lx > door.lx0 - 0.35 && lx < door.lx1 + 0.35)) wallC(lx, hw - th / 2);
  }
  for (let lz = -hw + 0.3; lz <= hw - 0.3; lz += 0.9) { wallC(-(hl - th / 2), lz); wallC(hl - th / 2, lz); }

  // ---- bones: long bones and skulls, scattered before the door, a few within ----
  const boneGeo = makeLongBone(), skullGeo = makeSkull();
  const bones = { name: 'bones', geo: boneGeo, mats: [], cols: [], material: 'bone', cast: false };
  const skulls = { name: 'skulls', geo: skullGeo, mats: [], cols: [], material: 'bone', cast: false };
  const boneC = new THREE.Color(ctx.palette.bone);
  const place = (set, lx, lz, s, lift) => {
    const [x, z] = W(lx, lz);
    const gy = ground.groundAt(x, z);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.3 + (set === skulls ? (rng() < 0.4 ? 1.4 : 0) : 0)));
    set.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, gy + lift * s, z), q, new THREE.Vector3(s, s, s)));
    set.cols.push(vary(boneC, rng, 0.2).multiplyScalar(0.55 + rng() * 0.3));
  };
  for (let i = 0; i < 44; i++) {
    const inside = i < 8;
    const lx = inside ? door.lx0 - 0.4 + rng() * 2.2 : (door.lx0 + door.lx1) / 2 + (rng() - 0.5) * 9 * Math.sqrt(rng());
    const lz = inside ? hw - th - 0.3 - rng() * 1.6 : hw + 0.4 + Math.pow(rng(), 1.6) * 7;
    place(bones, lx, lz, 0.7 + rng() * 0.8, 0.03);
  }
  for (let i = 0; i < 10; i++) {
    const inside = i < 2;
    const lx = inside ? door.lx0 + rng() * 1.4 : (door.lx0 + door.lx1) / 2 + (rng() - 0.5) * 8;
    const lz = inside ? hw - th - 0.5 - rng() * 1.2 : hw + 0.6 + Math.pow(rng(), 1.5) * 6;
    place(skulls, lx, lz, 0.85 + rng() * 0.5, 0.08);
  }
  (env.instanced ||= []).push(bones, skulls);

  const [dx, dz] = W((door.lx0 + door.lx1) / 2, hw);
  env.notes.byre = { door: { x: +dx.toFixed(2), z: +dz.toFixed(2), facing: { x: +Fx.toFixed(3), z: +Fz.toFixed(3) }, width: door.lx1 - door.lx0 }, centre: { x: ox, z: oz } };
}

function makeLongBone() {
  const shaft = new THREE.CylinderGeometry(0.022, 0.026, 0.42, 6, 1, true);
  shaft.rotateZ(Math.PI / 2);
  const parts = [shaft];
  for (const s of [-1, 1]) {
    for (const o of [-0.022, 0.022]) {
      const k = new THREE.SphereGeometry(0.034, 6, 4);
      k.translate(s * 0.215, 0, o);
      parts.push(k);
    }
  }
  return mergeSimple(parts);
}
function makeSkull() {
  const g = new THREE.SphereGeometry(0.11, 12, 9);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    z *= 1.25; if (z > 0.04) { y -= (z - 0.04) * 0.5; x *= 1 - (z - 0.04) * 2.2; }
    // eye sockets
    const e = Math.exp(-(((Math.abs(x) - 0.045) ** 2) + (y - 0.0) ** 2) / 0.0006);
    if (z > 0.06) z -= 0.03 * e;
    if (y < -0.06) y = -0.06 - (y + 0.06) * 0.3;
    pos.setXYZ(i, x, y + 0.06, z);
  }
  const jaw = new THREE.BoxGeometry(0.1, 0.03, 0.12);
  jaw.translate(0, 0.0, 0.07);
  return mergeSimple([g, jaw]);
}
function mergeSimple(parts) {
  let n = 0;
  const geos = parts.map((p) => { const g = p.index ? p.toNonIndexed() : p; g.computeVertexNormals(); n += g.attributes.position.count; return g; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  return out;
}
