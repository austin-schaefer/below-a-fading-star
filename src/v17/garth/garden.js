// The Garth's garden (v17-U2): the floor's soil, and what grows and died in it, ring by ring, into one UnderBuilder
// (one draw, both faces: the noon comes through a leaf). In the light: green grass, flowers in the colours the walk
// has nowhere else, three fruit trees trained flat on the Noonwrights' frames of spun rings. Round it, each ring a
// stage further gone: wilting (the grass yellowing and lying over, the trees' leaves turning), brown (matted, the
// leaves dead on the frames), grey (tall dead stalks, the trees bare), and the oldest (dust, fallen stalks, frames
// with a stump in them). Every number here is from garth/plan.js.
import * as THREE from 'three';
import { NOON } from '../../v8/strata/noon.js';
import { CX, CZ, FLOOR, RINGS, WALK, TREES, TREE, RILL, RADIALS, CAN, at, DOOR_A, PATH } from './plan.js';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// the soil of each ring, and what grows on it (grass blades: base colours; the trees' leaves; their bark)
export const PAL = {
  live: { soil: C('#504234'), soil2: C('#484632'), grass: [C('#4a7e2c'), C('#5a8a34'), C('#2f6a2c'), C('#6a9040'), C('#3a6a3a'), C('#7a8a40'), C('#8a8a50')], leaf: [C('#3f742c'), C('#4e8034'), C('#2f6026'), C('#5a7a30')], bark: C('#4a3626') },
  wilt: { soil: C('#3c3420'), soil2: C('#4a4226'), grass: [C('#a8b03a'), C('#c2b846'), C('#98a834'), C('#ccbe58')], leaf: [C('#a8a034'), C('#c2a23e'), C('#8c8c30')], bark: C('#4c3a2a') },
  brown: { soil: C('#4e4434'), soil2: C('#56493a'), grass: [C('#c8b888'), C('#d4c49a'), C('#b8a878'), C('#dccca4')], leaf: [C('#b09a6a'), C('#c2ac7c'), C('#9a8458')], bark: C('#4a3e34') },
  grey: { soil: C('#4a4846'), soil2: C('#52504c'), grass: [C('#86888a'), C('#909294'), C('#7a7c7e'), C('#9a9c9c')], leaf: null, bark: C('#8a8c8c') },
  ash: { soil: C('#6a6862'), soil2: C('#64625c'), grass: [C('#6a6862'), C('#72706a'), C('#5e5c58')], leaf: null, bark: C('#76746e') }, // swept: little left on it
};
const FLOWERS = [C('#3a62d8'), C('#4a7ae8'), C('#6e6c84'), C('#c8a41c'), C('#e86ca2'), C('#f09a2a'), C('#8a4ad0')];
const FRUIT = C('#966210'), BLUSH = C('#8a3a16'), UNDER = C('#2a1a0c'); // yellow-orange fruit, a blush on the side the light takes, dark beneath (it is lit, it does not glow)
const STRAND = [NOON.strand.r, NOON.strand.g, NOON.strand.b];

// which ring a point is in, by radius; the edges between rings drawn a little irregular (each death was not exact)
const wob = (b, k) => 0.1 * Math.sin(b * 5 + k * 1.7) + 0.06 * Math.sin(b * 13 + k * 3.1);
export function ringAt(r, b) {
  for (let k = 0; k < RINGS.length; k++) if (r < RINGS[k].r1 + (k < RINGS.length - 1 ? wob(b, k) : 0)) return k;
  return RINGS.length;
}

export function buildGarden(B, rng, { low, rings }) {
  const grow = new Set(rings);
  const lowK = low ? 0.45 : 1;
  // ---- the floor: soil from the middle out to the walk, its colour ring by ring with a sharp step at each edge
  const radii = [];
  for (let r = 0.35; r < WALK.r0 - 0.03; r += 0.32) radii.push(r);
  for (const g of RINGS) for (const d of [-0.07, 0.07]) radii.push(g.r1 + d);
  radii.push(WALK.r0 - 0.01); radii.sort((a, b) => a - b);
  const NA = low ? 120 : 180;
  const soilAt = (r, b) => {
    const k = ringAt(r, b), P = PAL[RINGS[Math.min(k, RINGS.length - 1)].key];
    const n = 0.5 + 0.5 * Math.sin(r * 2.3 + b * 9) * Math.sin(r * 0.7 - b * 5 + 1);
    let c = mix(P.soil, P.soil2, n);
    // the dead rings' soil is dry and cracked: a paler crust in patches
    if (k >= 2) c = mul(c, 0.92 + 0.16 * (0.5 + 0.5 * Math.sin(r * 9 + b * 31) * Math.sin(r * 4 - b * 17)));
    return c;
  };
  const W = (r, a) => [CX + Math.cos(DOOR_A + a) * r, FLOOR, CZ + Math.sin(DOOR_A + a) * r];
  for (let j = 0; j < NA; j++) {
    const a0 = (j / NA) * Math.PI * 2 - Math.PI, a1 = ((j + 1) / NA) * Math.PI * 2 - Math.PI;
    B.tri([CX, FLOOR, CZ], W(radii[0], a0), W(radii[0], a1), soilAt(0, a0), [0, 1, 0], 0.04);
    for (let i = 0; i < radii.length - 1; i++) {
      const r0 = radii[i], r1 = radii[i + 1], rm = (r0 + r1) / 2;
      B.quad(W(r0, a0), W(r0, a1), W(r1, a1), W(r1, a0), soilAt(rm, (a0 + a1) / 2), [0, 1, 0], 0.05);
    }
  }
  // ---- where the light once reached: a band of paler, sun-bleached stone just inside each older ring's edge, like a
  // tide line, so "it used to be wider" is drawn on the ground
  for (let k = 0; k < RINGS.length - 1; k++) {
    const r1 = RINGS[k].r1, rr0 = r1 - 0.24, rr1 = r1 - 0.06, pale = mul(C('#a8a49a'), 1.05 - k * 0.08);
    for (let j = 0; j < NA; j++) {
      const a0 = (j / NA) * Math.PI * 2 - Math.PI, a1 = ((j + 1) / NA) * Math.PI * 2 - Math.PI;
      if (Math.abs(Math.sin(a0) * r1) < PATH.half + 0.1 && Math.cos(a0) > 0) continue; // (the stones cross it)
      if (RADIALS.some((rb) => [a0, a1].some((a) => Math.abs(Math.sin(a - rb) * r1) < RILL.w / 2 + RILL.kerb + 0.5 && Math.cos(a - rb) > 0))) continue; // (and the feeders)
      const w0 = wob(a0, k), w1 = wob(a1, k);
      B.quad(W(rr0 + w0, a0).map((v, i) => (i === 1 ? FLOOR + 0.006 : v)), W(rr0 + w1, a1).map((v, i) => (i === 1 ? FLOOR + 0.006 : v)), W(rr1 + w1, a1).map((v, i) => (i === 1 ? FLOOR + 0.006 : v)), W(rr1 + w0, a0).map((v, i) => (i === 1 ? FLOOR + 0.006 : v)), pale, [0, 1, 0], 0.06);
    }
  }
  // ---- the stepping stones from the door to the light: Heliarch hexagons sunk in the soil, worn
  for (let r = WALK.r0 - 0.3; r > RINGS[0].r1 + 0.1; r -= 0.82) {
    if (Math.abs(r - RILL.outer) < RILL.w / 2 + RILL.kerb + 0.4 || Math.abs(r - RILL.inner) < RILL.w / 2 + RILL.kerb + 0.4) continue; // (the rill passes there)
    const [x, z] = at(r, 0.04 * Math.sin(r * 1.7)), s = 0.36, k = 0.7 + 0.25 * rng();
    for (let e = 0; e < 6; e++) {
      const q0 = (e / 6) * Math.PI * 2 + r, q1 = ((e + 1) / 6) * Math.PI * 2 + r;
      B.tri([x, FLOOR + 0.018, z], [x + Math.cos(q0) * s, FLOOR + 0.018, z + Math.sin(q0) * s], [x + Math.cos(q1) * s, FLOOR + 0.018, z + Math.sin(q1) * s], mul(C('#8c8592'), k), [0, 1, 0], 0.04);
    }
  }
  const onPath = (r, b) => Math.abs(Math.sin(b) * r) < PATH.half + 0.15 && Math.cos(b) > 0 && r > RINGS[0].r1 - 0.2;
  const onRill = (r, b) => Math.abs(r - RILL.outer) < RILL.w / 2 + RILL.kerb + 0.05 || Math.abs(r - RILL.inner) < RILL.w / 2 + RILL.kerb + 0.05 ||
    (r > RILL.inner && r < RILL.outer && RADIALS.some((rb) => Math.abs(Math.sin(b - rb) * r) < RILL.w / 2 + RILL.kerb + 0.05 && Math.cos(b - rb) > 0));

  // ---- the cover, ring by ring: blades scattered by area, each ring's own kind
  const blade = (x, z, h, lean, dirA, w, col, kneeF = 0) => {
    // a blade from its base up and over: a knee part way (kneeF > 0 bends it over: wilting, lying down)
    const dx = Math.cos(dirA), dz = Math.sin(dirA), px = -dz * w, pz = dx * w;
    const kn = [x + dx * lean * 0.4, FLOOR + h * (1 - kneeF * 0.45) * 0.6, z + dz * lean * 0.4];
    const tip = [x + dx * lean, FLOOR + Math.max(0.02, h * (1 - kneeF)), z + dz * lean];
    if (kneeF > 0.05) {
      B.quad([x - px, FLOOR, z - pz], [x + px, FLOOR, z + pz], [kn[0] + px * 0.6, kn[1], kn[2] + pz * 0.6], [kn[0] - px * 0.6, kn[1], kn[2] - pz * 0.6], mul(col, 0.8), null, 0.08);
      B.tri([kn[0] - px * 0.6, kn[1], kn[2] - pz * 0.6], [kn[0] + px * 0.6, kn[1], kn[2] + pz * 0.6], tip, col, null, 0.1);
    } else B.tri([x - px, FLOOR, z - pz], [x + px, FLOOR, z + pz], tip, col, null, 0.1);
  };
  const scatter = (k, per, fn) => {
    const g = RINGS[k], area = Math.PI * (g.r1 * g.r1 - g.r0 * g.r0), n = Math.round(area * per * lowK);
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(g.r0 * g.r0 + rng() * (g.r1 * g.r1 - g.r0 * g.r0)), b = rng() * Math.PI * 2 - Math.PI;
      if (ringAt(r, b) !== k || onPath(r, b) || onRill(r, b) || ((r - CAN.r) ** 2 + (r * (b - CAN.b)) ** 2 < 0.72 * 0.72)) continue;
      const x = CX + Math.cos(DOOR_A + b) * r, z = CZ + Math.sin(DOOR_A + b) * r;
      fn(x, z, r, b);
    }
  };
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  if (grow.has('live')) {
    const P = PAL.live;
    scatter(0, 60, (x, z) => { const h = 0.1 + rng() * rng() * 0.36; blade(x, z, h, (rng() - 0.3) * 0.14, rng() * 6.28, 0.012 + rng() * 0.01, mul(pick(P.grass), 0.7 + rng() * 0.4)); });
    // flowers: a stalk and a head of petals, in drifts (each colour where its seed fell)
    const drifts = Array.from({ length: 9 }, () => ({ a: rng() * 6.28, r: 0.8 + rng() * 3.4, c: pick(FLOWERS) }));
    scatter(0, 3.2, (x, z, r, b) => {
      let best = drifts[0], bd = 1e9;
      for (const d of drifts) { const dd = (r * Math.cos(b) - d.r * Math.cos(d.a)) ** 2 + (r * Math.sin(b) - d.r * Math.sin(d.a)) ** 2; if (dd < bd) { bd = dd; best = d; } }
      if (bd > 2.2) return;
      const h = 0.32 + rng() * 0.3, la = rng() * 6.28, lean = rng() * 0.06, hx = x + Math.cos(la) * lean, hz = z + Math.sin(la) * lean;
      B.beam([x, FLOOR, z], [hx, FLOOR + h, hz], 0.006, P.leaf[0], 0.1);
      const s = 0.045 + rng() * 0.03, col = mul(best.c, 0.9 + rng() * 0.2), q = rng() * 6.28;
      for (let e = 0; e < 5; e++) {
        const t0 = q + e * 1.2566, t1 = t0 + 0.7;
        B.tri([hx, FLOOR + h + 0.012, hz], [hx + Math.cos(t0) * s, FLOOR + h + 0.004, hz + Math.sin(t0) * s], [hx + Math.cos(t1) * s, FLOOR + h + 0.004, hz + Math.sin(t1) * s], col, [0, 1, 0], 0.08);
      }
      B.tri([hx - 0.01, FLOOR + h + 0.016, hz], [hx + 0.01, FLOOR + h + 0.016, hz], [hx, FLOOR + h + 0.016, hz + 0.012], C('#f0d040'), [0, 1, 0], 0);
    });
  }
  if (grow.has('wilt')) {
    const P = PAL.wilt;
    scatter(1, 30, (x, z, r) => { const h = 0.14 + rng() * 0.24, f = 0.25 + 0.55 * Math.min(1, (r - RINGS[1].r0) / 2.5) * rng(); blade(x, z, h, 0.08 + rng() * 0.14, rng() * 6.28, 0.02, mul(pick(P.grass), 0.85 + rng() * 0.3), f); });
    // the flowers nodding over, their heads faded
    scatter(1, 1.2, (x, z) => {
      const h = 0.3 + rng() * 0.2, la = rng() * 6.28, top = [x + Math.cos(la) * 0.12, FLOOR + h, z + Math.sin(la) * 0.12], hd = [x + Math.cos(la) * 0.2, FLOOR + h - 0.12, z + Math.sin(la) * 0.2];
      B.beam([x, FLOOR, z], top, 0.006, P.leaf[2], 0.1); B.beam(top, hd, 0.005, P.leaf[2], 0.1);
      const col = mix(pick(FLOWERS), C('#8a6a4a'), 0.55);
      for (let e = 0; e < 4; e++) { const t0 = e * 1.57 + la, s = 0.04; B.tri([hd[0], hd[1] - 0.005, hd[2]], [hd[0] + Math.cos(t0) * s, hd[1] - 0.045, hd[2] + Math.sin(t0) * s], [hd[0] + Math.cos(t0 + 0.9) * s, hd[1] - 0.045, hd[2] + Math.sin(t0 + 0.9) * s], col, null, 0.1); }
    });
  }
  if (grow.has('brown')) {
    const P = PAL.brown;
    scatter(2, 30, (x, z) => { const h = 0.2 + rng() * 0.3; blade(x, z, h, 0.06 + rng() * 0.1, rng() * 6.28, 0.02, mul(pick(P.grass), 0.85 + rng() * 0.25), rng() * 0.25); }); // straw: standing dead, pale
  }
  if (grow.has('grey')) {
    const P = PAL.grey;
    scatter(3, 7, (x, z) => { const h = 0.08 + rng() * 0.12; blade(x, z, h, 0.1, rng() * 6.28, 0.02, mul(pick(P.grass), 0.8 + rng() * 0.3), 0.8); });
    // tall dead stalks, standing, a seed head at the top of each, some snapped and hanging
    scatter(3, 1.6, (x, z) => {
      const h = 0.7 + rng() * 0.75, la = rng() * 6.28, lean = rng() * 0.12, col = mul(pick(P.grass), 0.85 + rng() * 0.25);
      const top = [x + Math.cos(la) * lean, FLOOR + h, z + Math.sin(la) * lean];
      if (rng() < 0.25) { const kn = [x + Math.cos(la) * lean * 0.6, FLOOR + h * 0.62, z + Math.sin(la) * lean * 0.6]; B.beam([x, FLOOR, z], kn, 0.008, col, 0.1); B.beam(kn, [kn[0] + Math.cos(la) * 0.45, FLOOR + 0.006, kn[2] + Math.sin(la) * 0.45], 0.007, col, 0.1); return; } // (snapped: its top lies on the ground)
      B.beam([x, FLOOR, z], top, 0.009, col, 0.1);
      B.beam([top[0], top[1] - 0.06, top[2]], [top[0], top[1] + 0.05, top[2]], 0.024, mul(col, 0.6), 0.1);
    });
  }
  if (grow.has('ash')) {
    const P = PAL.ash;
    // fallen stalks lying in the dust, and stubs
    scatter(4, 0.8, (x, z) => {
      const col = mul(pick(P.grass), 0.8 + rng() * 0.25);
      if (rng() < 0.3) { B.beam([x, FLOOR, z], [x, FLOOR + 0.06 + rng() * 0.1, z], 0.01, col, 0.1); return; }
      const a = rng() * 6.28, l = 0.4 + rng() * 0.8; B.beam([x, FLOOR + 0.012, z], [x + Math.cos(a) * l, FLOOR + 0.012, z + Math.sin(a) * l], 0.008, col, 0.1);
    });
  }
  // ---- the trained trees, in the rings that grow
  for (const t of TREES) if (grow.has(t.ring)) espalier(B, rng, t, low);
}

// one espalier: a trunk, tiers of arms trained flat along a frame of the Noonwrights' spun rings (a row of hoops
// along each tier and a column of them at each end, laced at a tangent: their mark is the empty ring), its leaves and
// fruit as its ring has left them. The frame faces the middle (its plane is tangent to the circle it stands on).
function espalier(B, rng, t, low) {
  const [x0, z0] = at(t.r, t.b), a = DOOR_A + t.b, tx = -Math.sin(a), tz = Math.cos(a); // the frame's line, along the tangent
  const P = (u, y) => [x0 + tx * u, FLOOR + y, z0 + tz * u];
  const stage = ['live', 'wilt', 'brown', 'grey', 'ash'].indexOf(t.ring), pal = PAL[t.ring];
  const half = TREE.half, tiers = [0.62, 1.12, 1.62, 2.12], top = tiers[3] + 0.28;
  const ST = mul(STRAND, stage >= 3 ? 0.5 : stage === 0 ? 0.36 : 0.58), broke = () => stage === 4 && rng() < 0.3;
  // the frame, spun: a post of drawn filament at each end, a wire along each tier and a rail over the top, and on the
  // rail a row of small empty rings standing at a tangent (their mark); a larger ring crowns each post
  const seg = low ? 8 : 12, ring = (cu, cy, hr) => {
    for (let i = 0; i < seg; i++) {
      const q0 = (i / seg) * Math.PI * 2, q1 = ((i + 1) / seg) * Math.PI * 2;
      B.beam(P(cu + Math.cos(q0) * hr, cy + Math.sin(q0) * hr), P(cu + Math.cos(q1) * hr, cy + Math.sin(q1) * hr), 0.0075, ST, 0.03);
    }
  };
  let low_ = top;
  for (const s of [-1, 1]) { const ph = stage === 4 && rng() < 0.4 ? 0.35 + rng() * 0.6 : 1; B.beam(P(s * half, 0), P(s * half, top * ph), 0.014, ST, 0.03); if (ph === 1) ring(s * half, top + 0.2, 0.2); low_ = Math.min(low_, top * ph); }
  // (a wire or the rail only where both posts still reach it: nothing of the frame hangs in the air)
  for (const ty of tiers) if (ty <= low_ && !broke()) B.beam(P(-half, ty), P(half, ty), 0.006, ST, 0.02);
  if (low_ >= top && !broke()) { B.beam(P(-half, top), P(half, top), 0.01, ST, 0.02); for (let u = -half + 0.2; u < half - 0.1; u += 0.2) if (!broke()) ring(u, top + 0.09, 0.09); }
  // the trunk and its arms: the oldest a stump
  const bark = pal.bark;
  if (stage === 4) { B.beam(P(0, 0), P(0.03, 0.4 + rng() * 0.5), 0.07, bark, 0.12); return; }
  const H = stage >= 3 ? tiers[3] + 0.1 : tiers[3] + 0.25;
  B.beam(P(0, 0), P(0.02, 0.3), 0.085, bark, 0.12);
  B.beam(P(0.02, 0.3), P(0, H), 0.06, bark, 0.12);
  const leaves = [];
  for (const ty of tiers) for (const s of [-1, 1]) {
    // each arm trained out along its tier, a little wavy, its end turned up
    const reach = half * (0.82 + 0.16 * rng()) * (stage === 3 && rng() < 0.3 ? 0.55 : 1);
    let pu = 0, py = ty - 0.06;
    const n = 5;
    for (let k = 1; k <= n; k++) {
      const u = s * reach * k / n, y = ty + 0.03 * Math.sin(k * 2 + ty * 7) + (k === n ? 0.12 : 0);
      B.beam(P(pu, py), P(u, y), 0.03 - k * 0.003, bark, 0.12);
      if (pal.leaf) for (let q = 0; q < 3; q++) leaves.push([pu + (u - pu) * (q + rng()) / 3, py + (y - py) * (q + 0.5) / 3]);
      pu = u; py = y;
    }
  }
  // spurs: short twigs off each arm, up and down
  if (!pal.leaf) return;
  const n = Math.round(leaves.length * (stage === 0 ? 4.5 : stage === 1 ? 2.6 : 1.4) * (low ? 0.6 : 1));
  const nx = Math.cos(a), nz = Math.sin(a); // out of the frame's plane
  for (let i = 0; i < n; i++) {
    const [u, y] = leaves[Math.floor(rng() * leaves.length)];
    const base = P(u, y + 0.01), out = (rng() - 0.5) * 0.3; // (on the arm: a leaf that does not touch its twig floats)
    const la = rng() * 6.28, L = 0.13 + rng() * 0.07, droop = stage === 0 ? 0.02 : stage === 1 ? -0.05 : -0.09;
    const tip = [base[0] + Math.cos(la) * L * tx * 0.8 + nx * out, base[1] + Math.sin(la) * L * 0.6 + droop, base[2] + Math.cos(la) * L * tz * 0.8 + nz * out];
    const w = 0.05 + rng() * 0.02, side = [-Math.sin(la) * w * tx + nx * 0.015, Math.cos(la) * w, -Math.sin(la) * w * tz + nz * 0.015];
    const col = mul(pal.leaf[Math.floor(rng() * pal.leaf.length)], 0.8 + rng() * 0.35);
    B.quad(base, [ (base[0] + tip[0]) / 2 + side[0], (base[1] + tip[1]) / 2 + side[1], (base[2] + tip[2]) / 2 + side[2]], tip, [(base[0] + tip[0]) / 2 - side[0], (base[1] + tip[1]) / 2 - side[1], (base[2] + tip[2]) / 2 - side[2]], col, null, 0.06);
  }
  // fruit: the living trees hang with it, the wilting ones with a few gone hard and brown; and some on the ground
  const nf = stage === 0 ? 11 : stage === 1 ? 4 : 0;
  const ball = new THREE.IcosahedronGeometry(1, low ? 0 : 1);
  for (let i = 0; i < nf; i++) {
    const tier = tiers[Math.floor(rng() * 4)], u = (rng() * 2 - 1) * half * 0.85, s = stage === 0 ? 0.055 + rng() * 0.02 : 0.04;
    const c = [x0 + tx * u + Math.cos(a) * (rng() - 0.5) * 0.12, FLOOR + tier - 0.09, z0 + tz * u + Math.sin(a) * (rng() - 0.5) * 0.12];
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...c), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.08, s));
    const fc = stage === 0 ? FRUIT : C('#7a5a2a');
    B.geo(ball.clone(), m, (nx_, ny_) => mix(stage === 0 ? mix(FRUIT, BLUSH, Math.max(0, ny_ * 0.6 + (nx_ * 0.4))) : fc, UNDER, Math.min(1, Math.max(0, -ny_ * 1.2 + 0.1))), 0.06);
    B.beam([c[0], c[1] + s * 0.9, c[2]], [c[0], c[1] + s * 1.8, c[2]], 0.004, bark, 0);
  }
  if (stage <= 1) for (let i = 0; i < (stage === 0 ? 3 : 5); i++) {
    const u = (rng() * 2 - 1) * half, off = 0.2 + rng() * 0.5, s = 0.05;
    const c = [x0 + tx * u + Math.cos(a) * off * (rng() < 0.5 ? -1 : 1), FLOOR + s * 0.8, z0 + tz * u + Math.sin(a) * off];
    B.geo(ball.clone(), new THREE.Matrix4().compose(new THREE.Vector3(...c), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.9, s)), () => (stage === 0 ? mix(FRUIT, BLUSH, 0.4) : C('#6a4a24')), 0.06);
  }
  ball.dispose();
}
