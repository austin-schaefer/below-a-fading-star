// Carcanet Keep as it stood through v4 (?keep=v2): a hexagonal curtain wall on the castle hill, two sections fallen,
// a broken round donjon near the east wall, a gatehouse in the west wall whose gate has not closed in a thousand years.
// keep.js builds this instead of the v5 recast when the URL carries ?keep=v2, so the two can be compared in the page.
import * as THREE from 'three';
import { mat } from '../geo.js';
import { vary, rubblePile, colliderChain, hexCellsIn } from '../common.js';

export const KEEP_V2 = {
  cx: 40, cz: 30,
  apothem: 30,
  thick: 1.7,
  gate: { x: 10, z0: 31.0, z1: 37.6, zc: 34.3, outerX: 7.0, innerX: 12.5 },
  donjon: { x: 60, z: 26, rOut: 5.6, rIn: 3.9 },
  well: { x: 33, z: 41 },
  plinth: { x: 41, z: 16.5 },
  brazier: { x: 50.5, z: 31.5 },
  poles: [{ x: 17.5, z: 27.6 }, { x: 17.5, z: 39.4 }],
};

export function buildKeepV2(ctx, B, env) {
  const { rng, ground, tints } = env;
  const K = KEEP_V2;
  const R = K.apothem / Math.cos(Math.PI / 6);
  const V = [];
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + k * Math.PI / 3;
    V.push({ x: K.cx + Math.cos(a) * R, z: K.cz + Math.sin(a) * R });
  }
  const N2 = ctx.noise.noise2;
  const COURSE = 0.46;
  const wallTint = tints.stone;
  // breaches: side index → [t0, t1] along the side from V[k]
  const breaches = { 4: [12, 22.5], 0: [10, 18.5] };
  const gateSide = 2;
  const g = K.gate;
  const gateT0 = V[2].z - g.z1, gateT1 = V[2].z - g.z0; // side 2 runs from V2 (south) to V3 (north)
  const towerT0 = gateT0 - 4.0, towerT1 = gateT1 + 4.0;

  // ---- curtain wall ----
  for (let k = 0; k < 6; k++) {
    const a = V[k], b = V[(k + 1) % 6];
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const tx = (b.x - a.x) / L, tz = (b.z - a.z) / L;
    const yaw = Math.atan2(-tz, tx); // local x along the side
    // inward normal
    let nx = -tz, nz = tx;
    if ((K.cx - a.x) * nx + (K.cz - a.z) * nz < 0) { nx = -nx; nz = -nz; }
    const br = breaches[k];
    const step = 1.5;
    for (let t = 2.4; t < L - 2.4; t += step) {
      const tm = t + step / 2;
      if (k === gateSide && tm > towerT0 - 0.2 && tm < towerT1 + 0.2) continue;
      const cx = a.x + tx * tm, cz = a.z + tz * tm;
      let h = 4.9 + 0.9 * N2(tm * 0.09 + k * 7, 1.3) + 0.5 * N2(tm * 0.37 + k, 5.1) + (rng() - 0.5) * 0.35 - (rng() < 0.12 ? 0.9 + rng() : 0);
      let fallen = 0;
      if (br) {
        const edge = Math.min(tm - br[0], br[1] - tm);
        if (edge > -3) {
          fallen = THREE.MathUtils.smoothstep(edge, -3, 1.5);
          h = THREE.MathUtils.lerp(h, 0.35 + rng() * 1.2, fallen);
        }
      }
      // the wall above the stair is broken down: the stair climbs to nothing
      if (k === 3 && tm > 13 && tm < 20) h = Math.min(h, 3.1 + (rng() - 0.5) * 0.5 + Math.abs(tm - 16.5) * 0.25);
      h = Math.max(0.3, Math.round(h / COURSE) * COURSE + (rng() - 0.5) * 0.12);
      const gy = ground.minGround(cx, cz, 1.2) - 0.35;
      const gm = ground.groundAt(cx, cz);
      const H = h + (gm - gy);
      const gb = B.box(step + 0.04, H, K.thick, { chip: 0.22, chipTop: true, seed: k * 31 + t, uvOffset: [t, gy - gm + 0.35] });
      B.add(gb, mat(cx, gy + H / 2, cz, (rng() - 0.5) * 0.012 * (1 + fallen * 4), yaw, (rng() - 0.5) * 0.01), {
        color: vary(wallTint, rng, 0.06), course: COURSE, moss: 0.75, ground: gm, disp: 0.045, dispScale: 1.4,
      });
      // merlons on the outer parapet where the wall still stands to full height
      if (h > 4.6 && fallen < 0.1 && rng() > 0.45 && Math.floor(t / step) % 2 === 0) {
        const mh = 0.7 + rng() * 0.35;
        const ox = cx - nx * (K.thick / 2 - 0.3), oz = cz - nz * (K.thick / 2 - 0.3);
        const gm2 = B.box(1.05, mh, 0.6, { chip: 0.12, seed: t * 3 + k });
        B.add(gm2, mat(ox, gm + h + mh / 2 - 0.02, oz, (rng() - 0.5) * 0.05, yaw, (rng() - 0.5) * 0.06), {
          color: vary(wallTint, rng, 0.08), course: COURSE, moss: 0.8, ground: gm, disp: 0.04,
        });
      }
      // a string course moulding along the outside, broken where the wall is
      if (h > 3.0 && fallen < 0.2 && rng() > 0.15) {
        const ox = cx - nx * (K.thick / 2 + 0.08), oz = cz - nz * (K.thick / 2 + 0.08);
        B.add(B.box(step + 0.02, 0.22, 0.2, { chip: 0.05, seed: t + k * 13 }), mat(ox, gm + 2.9, oz, 0, yaw, 0), { color: vary(tints.old, rng, 0.06), moss: 0.7, ground: gm, disp: 0.02 });
      }
      // colliders: one per chunk while the wall stands above knee height
      if (h > 1.1) ctx.addCollider({ x: cx, z: cz, r: K.thick / 2 + 0.1 });
    }
    // rubble spilling from the breaches, mostly outward and down the hill
    if (br) {
      const tm = (br[0] + br[1]) / 2;
      const bx = a.x + tx * tm, bz = a.z + tz * tm;
      rubblePile(B, env, bx - nx * 2.5, bz - nz * 2.5, 5.5, 70, { height: 1.4, size: 0.8, dirX: -nx, dirZ: -nz, blocks: 0.45 });
      rubblePile(B, env, bx + nx * 1.8, bz + nz * 1.8, 3.2, 28, { height: 0.9, size: 0.6 });
      // great slabs of wall that fell whole, courses still showing
      for (let i = 0; i < 4; i++) {
        const s = br[0] + 1 + rng() * (br[1] - br[0] - 2);
        const off = 2 + rng() * 5;
        const px = a.x + tx * s - nx * off, pz = a.z + tz * s - nz * off;
        const gy = ground.groundAt(px, pz);
        const w = 1.4 + rng() * 1.4, hh = 1.0 + rng() * 0.8;
        B.add(B.box(w, hh, 1.5, { chip: 0.25, seed: i * 17 + k }), mat(px, gy + 0.25, pz, (rng() - 0.5) * 1.2, yaw + (rng() - 0.5) * 0.8, (rng() - 0.5) * 0.7), {
          color: vary(wallTint, rng, 0.08), course: COURSE, moss: 0.9, ground: gy, disp: 0.05,
        });
      }
    }
  }

  // ---- corner towers: hollow rings, broken tops ----
  for (let k = 0; k < 6; k++) {
    const v = V[k];
    const ruined = k === 0 || k === 5;
    const baseH = ruined ? 3.2 + rng() * 1.2 : 7.0 + rng() * 0.9;
    ringTower(B, env, v.x, v.z, 3.2, 2.0, baseH, 16, { ragged: ruined ? 1.6 : 0.7, breachAt: Math.atan2(v.z - K.cz, v.x - K.cx), breach: ruined ? 1.3 : 0.4, seed: k, slits: !ruined });
    if (ruined) rubblePile(B, env, v.x + (v.x - K.cx) * 0.12, v.z + (v.z - K.cz) * 0.12, 4.5, 40, { height: 1.0, size: 0.7 });
    ringColliders(ctx, v.x, v.z, 3.2, null);
  }

  // ---- gatehouse ----
  const gw = g.z1 - g.z0, gDepth = g.innerX - g.outerX, gxc = (g.outerX + g.innerX) / 2;
  const gy0 = ground.minGround(gxc, g.zc, 4) - 0.4;
  const gTop = 8.4;
  for (const side of [-1, 1]) {
    const zc = side < 0 ? g.z0 - 2.0 : g.z1 + 2.0;
    const H = gTop - gy0 + ground.groundAt(gxc, zc) + (side < 0 ? 0.6 : -0.4);
    const gm = ground.groundAt(gxc, zc);
    B.add(B.box(gDepth, H, 4.0, { chip: 0.3, chipTop: false, seed: 91 + side }), mat(gxc, gy0 + H / 2, zc), {
      color: vary(tints.stone, rng, 0.05), course: COURSE, moss: 0.7, ground: gm, disp: 0.05,
    });
    // battered plinth
    B.add(B.box(gDepth + 0.7, 1.2, 4.6, { chip: 0.2, seed: 7 + side }), mat(gxc - 0.05, gm + 0.15, zc), { color: vary(tints.stone, rng, 0.06), course: 0.4, moss: 0.9, ground: gm, disp: 0.05 });
    // broken merlons on the gatehouse top
    for (let i = 0; i < 3; i++) {
      if (rng() < 0.35) continue;
      const mh = 0.6 + rng() * 0.6;
      const mz = zc - 1.3 + i * 1.3;
      B.add(B.box(0.7, mh, 0.9, { chip: 0.15, seed: i + side * 5 }), mat(g.outerX + 0.4, gy0 + H + mh / 2 - 0.05, mz, 0, 0, (rng() - 0.5) * 0.1), { color: vary(tints.stone, rng, 0.08), course: COURSE, moss: 0.8, ground: gm });
    }
    // arrow slits on the west face
    for (const y of [3.2, 6.0]) {
      B.add(B.box(0.12, 1.1, 0.16), mat(g.outerX - 0.02, gm + y, zc), { color: tints.black, moss: 0, ground: gm });
    }
    // corbels under a lost hoarding
    for (let i = 0; i < 4; i++) B.add(B.box(0.45, 0.35, 0.35, { chip: 0.06 }), mat(g.outerX - 0.2, gm + 7.2, zc - 1.5 + i, 0, 0, 0), { color: vary(tints.old, rng, 0.08), moss: 0.6, ground: gm });
    ctx.addCollider({ x: gxc - 1.2, z: zc, r: 2.3 });
    ctx.addCollider({ x: gxc + 1.4, z: zc, r: 2.3 });
  }
  // the vault over the passage: an extruded arch the depth of the gatehouse
  {
    const half = gw / 2, spring = 3.3, top = gTop - (ground.groundAt(gxc, g.zc) - gy0) - 0.5;
    const sh = new THREE.Shape();
    sh.moveTo(-half, top); sh.lineTo(half, top); sh.lineTo(half, spring);
    sh.absarc(0, spring, half, 0, Math.PI, false);
    sh.lineTo(-half, top);
    const eg = B.extrude(sh, gDepth, 14);
    const gm = ground.groundAt(gxc, g.zc);
    B.add(eg, mat(gxc, gm, g.zc, 0, Math.PI / 2, 0), { color: vary(tints.stone, rng, 0.04), course: COURSE, moss: 0.6, ground: gm, disp: 0.03 });
    // voussoirs proud of the west face, one missing
    for (let i = 0; i < 11; i++) {
      if (i === 7) continue;
      const a = (i + 0.5) / 11 * Math.PI;
      const r = half + 0.32;
      B.add(B.box(0.25, 0.7, 0.45, { chip: 0.06, seed: i }), mat(g.outerX - 0.12, gm + spring + Math.sin(a) * r, g.zc + Math.cos(a) * r, -(a - Math.PI / 2), 0, 0, 1, 1, 1, 'XYZ'), {
        color: vary(tints.old, rng, 0.1), moss: 0.5, ground: gm,
      });
    }
    // a carved keystone panel: a worn hexagon over the gate
    B.add(B.cyl(0.42, 0.42, 0.14, 6, 1), mat(g.outerX - 0.12, gm + spring + half + 0.95, g.zc, 0, 0, Math.PI / 2), { color: vary(tints.old, rng, 0.05), moss: 0.4, ground: gm, disp: 0.015 });
    // hinge pintles on the south jamb, rusting down the stone
    for (const y of [0.6, 2.7]) {
      const px = g.innerX - 0.6, pz = g.z1 - 0.05;
      B.add(B.box(0.12, 0.1, 0.25), mat(px, gm + y, pz), { color: tints.iron, iron: 1, moss: 0, ground: gm });
      env.rust.push([px, gm + y, pz + 0.12, 1.6]);
    }
  }
  // the gate leaves: one hangs ajar against the south jamb, the other lies where it fell
  {
    const gm = ground.groundAt(g.innerX - 0.6, g.z1);
    const leafW = gw / 2 + 0.2, leafH = 3.6;
    // flung back against the south wall of the passage, a hand's breadth ajar
    const hx = g.innerX - 0.25, hz = g.z1 - 0.12;
    const open = Math.PI / 2 + 0.22;
    const lm = mat(hx - Math.sin(open) * leafW / 2, gm + leafH / 2 + 0.05, hz - Math.cos(open) * leafW / 2, 0, open, 0.02);
    B.add(B.box(0.14, leafH, leafW, { seg: 0.4 }), lm, { color: vary(tints.wood, rng, 0.1), moss: 0.2, ground: gm, disp: 0.02, dispScale: 3 });
    for (const y of [0.5, 1.8, 3.1]) {
      const mb = lm.clone().multiply(mat(-0.09, y - leafH / 2 - 0.05, 0));
      B.add(B.box(0.04, 0.13, leafW + 0.02), mb, { color: tints.iron, iron: 1, moss: 0, ground: gm });
    }
    // fallen leaf, half in the passage
    const fx = g.innerX + 0.6, fz = g.z0 + 1.4;
    const fg = ground.groundAt(fx, fz);
    B.add(B.box(leafH, 0.15, leafW, { seg: 0.4 }), mat(fx, fg + 0.08, fz, 0.04, 0.35, -0.05), { color: vary(tints.wood, rng, 0.1), moss: 0.5, ground: fg - 0.2, disp: 0.03, dispScale: 3 });
    for (const s of [-1.3, 0, 1.3]) {
      B.add(B.box(0.13, 0.04, leafW + 0.02), mat(fx + Math.cos(0.35) * s, fg + 0.17, fz - Math.sin(0.35) * s, 0.04, 0.35, -0.05), { color: tints.iron, iron: 1, moss: 0, ground: fg });
    }
  }
  // wall stubs joining gatehouse to curtain: the curtain chunks skip the gatehouse span
  // colliders down the passage walls are the towers' own (above); the passage itself stays clear.

  // ---- donjon ----
  const D = K.donjon;
  {
    const breachA = Math.atan2(36 - D.z, 6 - D.x); // toward the spawn: the break shows from the gate
    ringTower(B, env, D.x, D.z, D.rOut, D.rIn, 16.5, 28, {
      ragged: 1.8, breachAt: breachA + 0.25, breach: 9.5, breachWidth: 1.25, tintVar: 0.02, seed: 77, slits: true,
      door: Math.PI + 0.12, windows: [[0.6, 7.4, 8.9], [2.4, 11.2, 12.8], [4.1, 7.6, 9.0], [5.3, 12.0, 13.4], [-0.4, 3.6, 4.6]],
      corbels: 14.2, sockets: [6.2, 10.6], plinth: true, course: COURSE,
    });
    ringColliders(ctx, D.x, D.z, D.rOut, Math.PI + 0.12);
    rubblePile(B, env, D.x + Math.cos(breachA) * 8, D.z + Math.sin(breachA) * 8, 4.5, 60, { height: 1.3, size: 0.7, blocks: 0.5 });
    rubblePile(B, env, D.x, D.z, 2.6, 22, { height: 1.0, size: 0.55 });
  }

  // ---- the stair to nowhere, against the inside of the north-west wall ----
  {
    const a = V[3], b = V[4];
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const tx = (b.x - a.x) / L, tz = (b.z - a.z) / L;
    let nx = -tz, nz = tx;
    if ((K.cx - a.x) * nx + (K.cz - a.z) * nz < 0) { nx = -nx; nz = -nz; }
    const yaw = Math.atan2(-tz, tx);
    const tread = 0.44, rise = 0.29, w = 1.3, n = 12;
    for (let i = 0; i < n; i++) {
      const t = 9.6 + i * tread;
      const off = K.thick / 2 + w / 2 - 0.02;
      const px = a.x + tx * t + nx * off, pz = a.z + tz * t + nz * off;
      const gm = ground.groundAt(px, pz);
      let top = (i + 1) * rise;
      if (i >= n - 2) top -= rng() * 0.4; // the last steps crumble
      const gb = ground.minGround(px, pz, 0.7) - 0.3;
      const H = gm + top - gb;
      B.add(B.box(tread + 0.02, H, w, { chip: 0.07, chipTop: true, seed: i * 3 }), mat(px, gb + H / 2, pz, 0, yaw, 0), {
        color: vary(tints.stone, rng, 0.07), course: COURSE * 0.65, moss: 0.7, ground: gm, disp: 0.03, uvOffset: [t, 0],
      });
      ctx.addCollider({ x: px, z: pz, r: 0.55, y: gm, h: top });
    }
    // the step that fell
    const px = a.x + tx * (9.6 + n * tread + 0.9) + nx * 2.4, pz = a.z + tz * (9.6 + n * tread + 0.9) + nz * 2.4;
    const gm = ground.groundAt(px, pz);
    B.add(B.box(0.5, 0.32, 1.3, { chip: 0.06 }), mat(px, gm + 0.12, pz, 0.15, yaw + 0.5, 0.3), { color: vary(tints.stone, rng, 0.06), moss: 0.8, ground: gm });
  }

  // ---- dry well ----
  {
    const w = K.well, gm = ground.groundAt(w.x, w.z);
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2;
      const h = 0.85 + (rng() - 0.5) * 0.12 - (i === 4 ? 0.35 : 0);
      const wg = B.wedge(a0, a1 + 0.004, 0.95, 1.42, -0.3, h, 1, 1);
      B.add(wg, mat(w.x, gm, w.z), { color: vary(tints.old, rng, 0.08), course: 0.35, moss: 0.85, ground: gm, disp: 0.03 });
    }
    // the shaft: black, going down further than the eye can follow
    B.add(B.cyl(0.97, 0.97, 0.05, 16, 1), mat(w.x, gm + 0.03, w.z), { color: tints.black, moss: 0, ground: gm - 1 });
    for (const s of [-1, 1]) {
      B.add(B.box(0.32, 2.3, 0.32, { chip: 0.06 }), mat(w.x + s * 1.2, gm + 1.1, w.z), { color: vary(tints.old, rng, 0.06), moss: 0.7, ground: gm, disp: 0.02 });
      env.rust.push([w.x + s * 1.2, gm + 2.05, w.z + 0.17, 1.2]);
    }
    B.add(B.cyl(0.09, 0.09, 2.7, 8, 1), mat(w.x, gm + 2.1, w.z, 0, 0, Math.PI / 2 + 0.03), { color: vary(tints.woodGrey, rng, 0.1), moss: 0.2, ground: gm });
    B.add(B.box(0.08, 0.5, 0.06), mat(w.x - 0.4, gm + 1.85, w.z, 0, 0, 0.1), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    ctx.addCollider({ x: w.x, z: w.z, r: 1.45 });
  }

  // ---- the toppled statue: a robed and hooded figure, head apart from the body ----
  {
    const p = K.plinth, gm = ground.groundAt(p.x, p.z);
    B.add(B.box(1.9, 1.5, 1.9, { chip: 0.14 }), mat(p.x, gm + 0.55, p.z, 0, 0.2, 0), { color: vary(tints.old, rng, 0.05), course: 0.75, moss: 0.8, ground: gm, disp: 0.03 });
    B.add(B.box(2.3, 0.3, 2.3, { chip: 0.1 }), mat(p.x, gm + 1.38, p.z, 0, 0.2, 0), { color: vary(tints.old, rng, 0.05), moss: 0.7, ground: gm });
    B.add(B.box(2.2, 0.35, 2.2, { chip: 0.1 }), mat(p.x, gm + 0.0, p.z, 0, 0.2, 0), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: gm });
    // the feet, broken at the ankles, and the hem stump
    B.add(B.cyl(0.55, 0.62, 0.4, 14, 1), mat(p.x, gm + 1.72, p.z), { color: vary(tints.old, rng, 0.05), moss: 0.5, ground: gm, disp: 0.04, dispScale: 3 });
    // the body, lying where it fell, face up, a little on its side
    const yaw = 0.9, bx = p.x + 2.4, bz = p.z + 1.6;
    const bg = ground.groundAt(bx, bz);
    const prof = [[0.0, 0], [0.6, 0], [0.62, 0.12], [0.55, 0.6], [0.46, 1.25], [0.41, 1.75], [0.46, 2.1], [0.52, 2.35], [0.47, 2.52], [0.24, 2.62], [0.0, 2.64]];
    const lg = B.lathe(prof, 18);
    {
      const pos = lg.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const fold = 1 + 0.07 * Math.sin(a * 7 + y * 0.9) * (1 - y / 2.7) + 0.03 * Math.sin(a * 13 - y * 2);
        pos.setXYZ(i, x * fold, y, z * fold * 0.78);
      }
    }
    const stoneC = vary(tints.old, rng, 0.04);
    const bm = mat(bx, bg + 0.36, bz, -Math.PI / 2, yaw, 0.35);
    B.add(lg, bm, { color: stoneC, moss: 0.85, ground: bg, disp: 0.03, dispScale: 2.5 });
    // folded arms across the breast
    for (const s of [-1, 1]) {
      const arm = B.cyl(0.13, 0.15, 0.85, 8, 1);
      const local = new THREE.Matrix4().compose(new THREE.Vector3(s * 0.08, 1.85, 0.42), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2 + s * 0.35)), new THREE.Vector3(1, 1, 1));
      B.add(arm, bm.clone().multiply(local), { color: stoneC, moss: 0.7, ground: bg, disp: 0.02, dispScale: 3 });
    }
    // the hooded head, two strides off, face to the sky
    const hx = bx + Math.sin(yaw) * -3.9 + 0.6, hz = bz + Math.cos(yaw) * -3.9 - 0.4;
    const hgY = ground.groundAt(hx, hz);
    const head = B.lathe([[0, -0.32], [0.2, -0.3], [0.27, -0.15], [0.29, 0.05], [0.26, 0.22], [0.15, 0.32], [0, 0.35]], 14);
    {
      const pos = head.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const nose = Math.exp(-(x * x) / 0.004 - ((y + 0.02) ** 2) / 0.012) * (z > 0 ? 0.07 : 0);
        const eye = -0.03 * (Math.exp(-((Math.abs(x) - 0.1) ** 2) / 0.003 - ((y - 0.06) ** 2) / 0.003)) * (z > 0 ? 1 : 0);
        pos.setXYZ(i, x, y, z + nose + eye);
      }
    }
    const hm = mat(hx, hgY + 0.22, hz, -1.2, 2.2, 0.4);
    B.add(head, hm, { color: stoneC, moss: 0.8, ground: hgY, disp: 0.012, dispScale: 6 });
    // the cowl around it
    const cowl = B.lathe([[0.3, -0.36], [0.36, -0.1], [0.37, 0.12], [0.32, 0.32], [0.18, 0.44], [0.0, 0.47]], 14);
    {
      const pos = cowl.attributes.position;
      for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); if (z > 0.12) pos.setZ(i, 0.12 + (z - 0.12) * 0.25); }
    }
    B.add(cowl, hm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.07)), { color: stoneC, moss: 0.85, ground: hgY, disp: 0.02, dispScale: 4 });
    ctx.addCollider({ x: p.x, z: p.z, r: 1.35 });
    ctx.addCollider({ x: bx - Math.sin(yaw) * 0.6, z: bz - Math.cos(yaw) * 0.6, r: 0.6 });
    ctx.addCollider({ x: bx - Math.sin(yaw) * 1.9, z: bz - Math.cos(yaw) * 1.9, r: 0.6 });
    ctx.addCollider({ x: hx, z: hz, r: 0.4 });
  }

  // ---- banner poles, the keep's ember and black still flying ----
  for (let i = 0; i < K.poles.length; i++) {
    const p = K.poles[i], gm = ground.groundAt(p.x, p.z);
    const H = 9.6;
    B.add(B.cyl(0.11, 0.15, H, 8, 4), mat(p.x, gm + H / 2 - 0.4, p.z, (rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.03), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    B.add(B.cyl(0.0, 0.12, 0.6, 6, 1), mat(p.x, gm + H + 0.2, p.z), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    B.add(B.box(0.9, 0.7, 0.9, { chip: 0.1 }), mat(p.x, gm + 0.15, p.z, 0, 0.3, 0), { color: vary(tints.old, rng, 0.06), moss: 0.9, ground: gm, disp: 0.03 });
    env.banners.add(new THREE.Vector3(p.x + 0.1, gm + H - 0.35, p.z), new THREE.Vector3(0.93, 0, -0.36), 2.9, 1.7, i * 2.1, 0);
    ctx.addCollider({ x: p.x, z: p.z, r: 0.5 });
  }

  // ---- one cold brazier ----
  {
    const b = K.brazier, gm = ground.groundAt(b.x, b.z);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.4;
      B.add(B.cyl(0.035, 0.045, 1.25, 6, 1), mat(b.x + Math.cos(a) * 0.3, gm + 0.58, b.z + Math.sin(a) * 0.3, Math.sin(a) * 0.33, 0, -Math.cos(a) * 0.33, 1, 1, 1, 'XYZ'), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    }
    const bowl = B.lathe([[0.04, 0], [0.3, 0.03], [0.52, 0.2], [0.6, 0.38], [0.57, 0.4], [0.48, 0.24], [0.27, 0.09], [0.0, 0.07]], 14);
    B.add(bowl, mat(b.x, gm + 1.08, b.z, 0.06, 0, 0.04), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    for (let i = 0; i < 9; i++) {
      const a = rng() * 6.28, d = rng() * 0.32;
      B.add(B.rock(0.08 + rng() * 0.06, 0), mat(b.x + Math.cos(a) * d, gm + 1.22, b.z + Math.sin(a) * d, rng() * 3, rng() * 3, 0), { color: new THREE.Color(0.012, 0.011, 0.011), moss: 0, ground: gm, flat: true });
    }
    // a skirt of old ash and spilled coal on the paving
    for (let i = 0; i < 7; i++) {
      const a = rng() * 6.28, d = 0.3 + rng() * 0.8;
      const px = b.x + Math.cos(a) * d, pz = b.z + Math.sin(a) * d;
      B.add(B.rock(0.05 + rng() * 0.05, 0), mat(px, ground.groundAt(px, pz) + 0.09, pz, rng() * 3, rng() * 3, 0), { color: new THREE.Color(0.02, 0.018, 0.017), moss: 0, ground: gm, flat: true });
    }
    ctx.addCollider({ x: b.x, z: b.z, r: 0.6 });
  }

  // ---- rubble about the courtyard ----
  const piles = [[24, 18, 2.6, 26], [27, 45, 2.2, 18], [48, 50, 3.0, 30], [52, 12, 2.6, 22], [32, 30, 1.4, 9]];
  for (const [x, z, r, n] of piles) rubblePile(B, env, x, z, r, n, { height: r * 0.35, size: 0.6 });

  // ---- hex paving, worn through to earth ----
  const inside = (x, z) => {
    // inside the hexagon (flat sides at angles 0, 60, ...), a margin from the wall
    const dx = x - K.cx, dz = z - K.cz;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      if (dx * Math.cos(a) + dz * Math.sin(a) > K.apothem - K.thick / 2 - 0.55) return false;
    }
    return true;
  };
  const inPassage = (x, z) => x > g.outerX - 0.2 && x < g.innerX + 0.5 && z > g.z0 + 0.2 && z < g.z1 - 0.2;
  hexCellsIn(K.cx - 36, K.cz - 36, K.cx + 36, K.cz + 36, (x, z, i, j) => {
    const pass = inPassage(x, z);
    if (!pass && !inside(x, z)) return;
    if (Math.hypot(x - D.x, z - D.z) < D.rOut + 0.6) return;
    if (Math.hypot(x - K.well.x, z - K.well.z) < 1.8) return;
    if (Math.abs(x - K.plinth.x) < 1.5 && Math.abs(z - K.plinth.z) < 1.5) return;
    // worn through along the old ways and in blotches, more where feet went
    const pathD = Math.abs((z - g.zc) - (x - g.innerX) * ((D.z - g.zc) / (D.x - g.innerX)));
    const wear = N2(x * 0.09 + 3.3, z * 0.09 - 1.7) * 0.6 + N2(x * 0.31, z * 0.31) * 0.25 + (pathD < 2.2 ? 0.25 : 0);
    if (!pass && wear > 0.12) return;
    if (rng() < 0.1) return;
    env.addPaver(x, z, i, j, { sink: 0.03 + Math.max(0, wear + 0.4) * 0.05, tilt: 0.05 });
  });

  env.notes.keep = {
    gate: { x0: g.outerX, x1: g.innerX, z0: g.z0, z1: g.z1 },
    courtyard: { cx: K.cx, cz: K.cz, apothem: K.apothem - K.thick / 2 - 0.5 },
  };
}

// A hollow round tower of curved wall blocks with a ragged top, optional breach, door, windows.
export function ringTower(B, env, x, z, rOut, rIn, H, sectors, o = {}) {
  const { rng, ground, tints } = env;
  const N2 = env.ctx.noise.noise2;
  const gm = ground.groundAt(x, z);
  const gb = ground.minGround(x, z, rOut) - 0.4;
  const course = o.course || 0.46;
  const tint = o.tint || tints.stone;
  const da = (Math.PI * 2) / sectors;
  const angDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
  for (let s = 0; s < sectors; s++) {
    const a0 = s * da, a1 = a0 + da, am = a0 + da / 2;
    let h = H + (rng() - 0.5) * (o.ragged || 0.6) + N2(am * 2 + (o.seed || 0), 3.3) * (o.ragged || 0.6) * 0.6;
    if (o.breach) {
      const w = o.breachWidth || 0.8;
      const d = angDiff(am, o.breachAt);
      if (d < w) h -= o.breach * Math.pow(1 - d / w, 0.7) * (0.6 + 0.4 * rng());
    }
    h = Math.max(1.2, Math.round(h / course) * course);
    // openings: [y0, y1] gaps in this sector
    const gaps = [];
    if (o.door !== undefined && angDiff(am, o.door) < da * 0.6) gaps.push([-1, 2.6]);
    if (o.windows) for (const [wa, y0, y1] of o.windows) if (angDiff(am, ((wa % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) < da * 0.5 && y1 < h - 0.6) gaps.push([y0, y1]);
    let y = gb - gm;
    const segs = [];
    for (const [y0, y1] of gaps) { if (y0 > y) segs.push([y, y0]); y = y1; }
    segs.push([y, h]);
    for (const [y0, y1] of segs) {
      if (y1 - y0 < 0.05) continue;
      const wg = B.wedge(a0, a1, rIn, rOut, y0, y1, 2, Math.max(1, Math.ceil((y1 - y0) / 1.2)));
      B.add(wg, mat(x, gm, z), { color: vary(tint, rng, o.tintVar ?? 0.03), course, moss: 0.75, ground: gm });
    }
    // a lintel over each opening, and a sill
    for (const [y0, y1] of gaps) {
      if (y0 < 0) {
        const wg = B.wedge(a0 - 0.05, a1 + 0.05, rIn - 0.05, rOut + 0.08, y1, y1 + 0.45, 2, 1);
        B.add(wg, mat(x, gm, z), { color: vary(tints.old, rng, 0.05), moss: 0.5, ground: gm, disp: 0.02 });
      }
    }
    // arrow slits: dark, proud of the face by a hair
    if (o.slits && !gaps.length && rng() < 0.28) {
      const sy = 2.5 + rng() * Math.max(0.5, h - 4.5);
      const r = rOut + 0.03;
      B.add(B.box(0.1, 1.0, 0.12), mat(x + Math.cos(am) * r, gm + sy, z + Math.sin(am) * r, 0, Math.PI / 2 - am, 0), { color: tints.black, moss: 0, ground: gm });
    }
    // corbels of a lost machicolation, only on the sectors that still stand that high
    if (o.corbels && h > o.corbels + 0.6) {
      const r = rOut + 0.22;
      B.add(B.box(0.4, 0.45, 0.42, { chip: 0.05 }), mat(x + Math.cos(am) * r, gm + o.corbels, z + Math.sin(am) * r, 0, Math.PI / 2 - am, 0), { color: vary(tints.old, rng, 0.06), moss: 0.6, ground: gm });
    }
    // beam sockets inside where the floors were
    if (o.sockets) for (const sy of o.sockets) {
      if (sy > h - 0.4 || s % 2) continue;
      const r = rIn - 0.01;
      B.add(B.box(0.3, 0.32, 0.06), mat(x + Math.cos(am) * r, gm + sy, z + Math.sin(am) * r, 0, -am + Math.PI / 2, 0), { color: tints.black, moss: 0, ground: gm });
    }
  }
  if (o.plinth) {
    for (let s = 0; s < sectors; s++) {
      const a0 = s * da, a1 = a0 + da;
      if (o.door !== undefined && angDiff(a0 + da / 2, o.door) < da * 0.7) continue;
      const wg = B.wedge(a0, a1 + 0.003, rOut - 0.2, rOut + 0.45, gb - gm, 0.9, 2, 1);
      B.add(wg, mat(x, gm, z), { color: vary(tint, rng, 0.06), course: 0.45, moss: 0.95, ground: gm, disp: 0.05 });
    }
  }
}

export function ringColliders(ctx, x, z, r, doorAngle) {
  const n = Math.max(6, Math.round((Math.PI * 2 * r) / 1.5));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (doorAngle !== null && doorAngle !== undefined) {
      let d = Math.abs(a - doorAngle) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < 0.75 / r + 0.08) continue;
    }
    ctx.addCollider({ x: x + Math.cos(a) * (r - 0.6), z: z + Math.sin(a) * (r - 0.6), r: 0.75 });
  }
}
