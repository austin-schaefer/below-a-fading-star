// The Quarrels' works (v15-Q1): what the masons have standing on the crown. The Last Arch (the Heliarch aqueduct's
// last standing arch, on the line of the pier the Rungs' bridge lands on: two piers, the arch, the channel broken off
// past the second pier where the next arch sprang), the templates hung on its pier, the shears over a block half
// lifted, the block split with wedges, and the Drag (a track of planks with a loaded sledge on rollers).
//
// Each maker is (B, M, o) into a structures Builder and returns what the quarter's module needs (points in world
// space, colliders in the engine's own shapes).
import * as THREE from 'three';
import { H, V, L, PARTS, ch, worn, beam, plate } from '../../houses/kit.js';

const _v = new THREE.Vector3();
const W = (M, x, y, z) => { _v.set(x, y, z).applyMatrix4(M); return [_v.x, _v.y, _v.z]; };
const bx = (B, w, h, d, o = {}) => B.box(w, h, d, { seg: 9, ...o });

// The Last Arch. M: the ground under the pier nearer the brink (P1), +z along the aqueduct's line toward the brink.
// o: { span (7.2, pier to pier), spring (3), top (6.2: the channel's bed), over (how far the broken channel overhangs
// P1's face), rng, low }. Returns { lip (the bed's broken end, where the water drips: world), west (a Matrix4 on P1's
// face that looks along M's +x, origin at its foot: for the templates), colliders, top }.
export function lastArch(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], low = !!o.low, span = o.span ?? 7.2, sp = o.spring ?? 3, T = o.top ?? 6.2, over = o.over ?? 1.1;
  const pw = 1.7, pl = 2.3, half = (span - pl) / 2, aw = pw - 0.1;
  const stone = () => ({ color: worn(H.stone, rng, 0.1, 0.1).multiplyScalar(0.9), course: 0.5, moss: 0.75, ground: g0, disp: 0.04 });
  for (const z of [0, -span]) {
    B.add(B.box(pw + 0.5, 0.6, pl + 0.5, { seg: 1.6, chip: 0.12, seed: z + 2 }), ch(M, 0, 0.02, z), { ...stone(), moss: 1 });
    B.add(B.box(pw, sp + 0.64, pl, { seg: low ? 1.7 : 1.1, chip: 0.14, seed: z + 5, uvOffset: [z, 0] }), ch(M, 0, (sp + 0.04 - 0.6) / 2, z), stone());
    B.add(bx(B, pw + 0.22, 0.28, pl + 0.22, { chip: 0.05 }), ch(M, 0, sp - 0.11, z), { ...stone(), color: worn(H.dark, rng, 0.1) });
  }
  // the arch and the wall over it, to the channel's bed
  { const sh = new THREE.Shape(), e = pl / 2 + half + 0.02;
    sh.moveTo(-e, T); sh.lineTo(e, T); sh.lineTo(e, sp); sh.lineTo(half, sp); sh.absarc(0, sp, half, 0, Math.PI, false); sh.lineTo(-e, sp); sh.lineTo(-e, T);
    B.add(B.extrude(sh, aw, low ? 8 : 12), ch(M, 0, 0, -span / 2, 0, -Math.PI / 2, 0), stone()); }
  // past P1: the haunch of the arch that is gone, and the bed running out on it to a broken end
  { const sh = new THREE.Shape(), a1 = pl / 2 + over;
    [[0, T - 0.03], [a1, T - 0.03], [a1 + 0.05, T - 0.42], [a1 - 0.32, T - 0.86], [a1 - 0.5, T - 1.6], [a1 - 0.82, T - 2.3], [pl / 2, sp + 0.02], [0, sp + 0.02]].forEach(([a, y], i) => (i ? sh.lineTo(a, y) : sh.moveTo(a, y)));
    B.add(B.extrude(sh, aw - 0.05, 1), ch(M, 0, 0, 0, 0, -Math.PI / 2, 0), stone()); }
  // behind P0: the same, shorter, and what fell of it
  { const sh = new THREE.Shape();
    [[0, T - 0.03], [-0.6, T - 0.03], [-0.95, T - 0.7], [-0.85, T - 1.5], [-pl / 2, sp + 0.02], [0, sp + 0.02]].reverse().forEach(([a, y], i) => (i ? sh.lineTo(a, y) : sh.moveTo(a, y)));
    B.add(B.extrude(sh, aw - 0.05, 1), ch(M, 0, 0, -span, 0, -Math.PI / 2, 0), stone()); }
  const fallen = [];
  for (let i = 0; i < (low ? 4 : 6); i++) {
    const w = 0.7 + rng() * 0.5, h = 0.45 + rng() * 0.25, x = (rng() - 0.5) * 2.6, z = -span - pl / 2 - 0.9 - rng() * 2.2;
    B.add(B.box(w, h, 0.6 + rng() * 0.3, { seg: 9, chip: 0.08, seed: i }), ch(M, x, h * 0.3, z, (rng() - 0.5) * 0.4, rng() * 3, (rng() - 0.5) * 0.3), { ...stone(), moss: 1 });
    fallen.push(W(M, x, 0, z));
  }
  // the channel: its two kerbs, broken in places, and the bed between them still wet
  const z0 = -span - 0.55, z1 = pl / 2 + over - 0.08;
  for (const s of [-1, 1]) {
    let z = z0 + (s > 0 ? 0 : 0.5);
    while (z < z1 - 0.4) {
      const len = Math.min(z1 - z, 1.3 + rng() * 2.2), gone = rng() < 0.22;
      if (!gone) B.add(bx(B, 0.2, 0.5 + rng() * 0.08, len - 0.03, { chip: 0.05, chipTop: true, seed: z }), ch(M, s * (aw / 2 - 0.13), T + 0.16, z + len / 2), stone());
      z += len;
    }
  }
  B.add(bx(B, aw - 0.52, 0.07, z1 - z0 - 0.1), ch(M, 0, T + 0.0, (z0 + z1) / 2), { color: new THREE.Color('#1b2226'), moss: 0.6, ground: g0 - 9, wet: 1 });
  const a = W(M, 0, 0, -0.5), b = W(M, 0, 0, 0.5), c = W(M, 0, 0, -span - 0.5), d = W(M, 0, 0, -span + 0.5);
  const colliders = [{ x1: a[0], z1: a[2], x2: b[0], z2: b[2], r: 1.05, y: g0 - 0.5, h: sp + 0.5, stand: false }, { x1: c[0], z1: c[2], x2: d[0], z2: d[2], r: 1.05, y: g0 - 0.5, h: sp + 0.5, stand: false }];
  for (const f of fallen) colliders.push({ x: f[0], z: f[2], r: 0.5, y: g0 - 0.5, h: 1.05 });
  return { lip: W(M, 0, T + 0.02, z1 + 0.06), west: ch(M, pw / 2, 0, 0, 0, Math.PI / 2, 0), east: ch(M, -pw / 2, 0, 0, 0, -Math.PI / 2, 0), colliders, top: T + 0.5 };
}

// The templates: the masons' wooden profiles, cut to match the mouldings of the stones they take, hung in a row on a
// rail. None is the moulding it was cut for: each is a little out (too fat a roll, the notch's flanks too wide). M: on
// a wall's face at its foot, +z out of it. o: { w (the rail's length), y (its height), rng, low }
export function templates(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], w = o.w ?? 2.0, y = o.y ?? 2.35;
  const wood = () => ({ color: worn(V.rawWood, rng, 0.12, 0.2), moss: 0.02, ground: g0 - 9 });
  beam(B, M, [-w / 2, y, 0.05], [w / 2, y + 0.03, 0.05], 0.06, wood(), 0.05);
  const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  // each drawn hanging from its top edge's middle at (0, 0), going down
  const shapes = [
    [[-0.15, 0], [0.15, 0], [0.15, -0.12], [0.07, -0.16], [0.12, -0.27], [0.01, -0.34], [0.05, -0.43], [-0.05, -0.52], [-0.15, -0.52]], // an ogee, stepped
    [[-0.17, 0], [0.17, 0], [0.17, -0.1], ...arc(0.17, -0.42, 0.32, Math.PI / 2, Math.PI, 5).slice(1), [-0.17, -0.42]], // a cavetto: a quarter hollow
    [[-0.13, 0], [0.13, 0], [0.13, -0.08], [0.05, -0.08], ...arc(0.05, -0.23, 0.15, Math.PI / 2, -Math.PI / 2, 6).slice(1), [0.13, -0.38], [0.13, -0.46], [-0.13, -0.46]], // a roll between fillets
    [[-0.22, 0], [0.22, 0], [0.22, -0.5], [0.11, -0.5], [0.0, -0.14], [-0.11, -0.5], [-0.22, -0.5]], // the notch of the sign, its flanks too wide
    [[-0.11, 0], [0.11, 0], [0.11, -0.1], [0.04, -0.14], [0.04, -0.3], [0.11, -0.34], [0.11, -0.62], [-0.11, -0.62]], // a fillet and a scotia, tall
    [[-0.19, 0], [0.19, 0], [0.19, -0.07], ...arc(0, -0.07, 0.19, 0, -Math.PI, 7).slice(1), [-0.19, 0]].slice(0, -1), // a half round
  ];
  const n = o.low ? 4 : shapes.length;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.22 + (i / (n - 1)) * (w - 0.44), drop = 0.1 + rng() * 0.12, tm = ch(M, x, y - drop, 0.055, 0, 0, (rng() - 0.5) * 0.22);
    plate(B, tm, shapes[i], 0.022, wood());
    beam(B, M, [x, y + 0.01, 0.07], [x, y - drop - 0.03, 0.062], 0.012, { color: V.rope, moss: 0, ground: g0 - 9 });
    B.add(bx(B, 0.03, 0.03, 0.09), ch(M, x, y + 0.012, 0.075), wood());
  }
}

// The shears: three raw poles lashed at the head, a tackle under it, a block of the keep half lifted in a sling, the
// fall taken to a windlass between two of the legs. M: the ground under the block, world axes (no turn).
// o: { feet: [[x, z] x 3] (from M's origin; the first two carry the windlass), head (its height, 6.4), rng, low }
export function shears(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], hy = o.head ?? 6.4, feet = o.feet, hz = 0.55;
  const raw = { color: worn(V.rawWood, rng, 0.08, 0.06), moss: 0.04, ground: g0, round: 7 }, rope = { color: V.rope, moss: 0, ground: g0 - 9 };
  const colliders = [], at = (f, t) => [f[0] * (1 - t), -0.3 + (hy + 0.3) * t, f[1] + (hz - f[1]) * t];
  for (const f of feet) { beam(B, M, at(f, 0), at(f, 1.09), 0.17, { ...raw, color: worn(V.rawWood, rng, 0.1, 0.12) }, 0.13); const p = W(M, f[0], 0, f[1]); colliders.push({ x: p[0], z: p[2], r: 0.16, y: g0 - 0.5, h: 2.4, stand: false }); }
  B.add(bx(B, 0.42, 0.34, 0.42), ch(M, 0, hy, hz, 0.2, 0.6, 0.1), { ...rope, color: V.rope.clone().multiplyScalar(0.8) }); // the lashing
  // the tackle: an upper block under the head, three falls, a lower block, the sling
  const blk = { color: worn(L.wood, rng, 0.1), moss: 0.02, ground: g0 - 9 }, by = 1.5, bw = 1.25, bh = 0.6, bd = 0.7, yaw = 0.5;
  beam(B, M, [0, hy - 0.1, hz], [0, hy - 1.0, hz], 0.03, rope);
  B.add(bx(B, 0.2, 0.36, 0.16), ch(M, 0, hy - 1.15, hz), blk);
  for (const dx of [-0.05, 0, 0.05]) beam(B, M, [dx, hy - 1.3, hz], [dx, by + bh / 2 + 0.95, hz], 0.018, rope);
  B.add(bx(B, 0.18, 0.3, 0.15), ch(M, 0, by + bh / 2 + 0.82, hz), blk);
  const BM = ch(M, 0, by, hz, 0.05, yaw, -0.04);
  for (const s of [-1, 1]) {
    beam(B, BM, [0, bh / 2 + 0.7, 0], [s * 0.4, bh / 2 + 0.02, 0], 0.022, rope);
    for (const [w2, h2, d2] of [[0.03, bh + 0.05, bd + 0.05]]) B.add(bx(B, w2, h2, d2), ch(BM, s * 0.4, 0, 0), rope); // a turn of rope round it
  }
  // the block: old on five faces, a piece of the Heliarchs' sign still on the one that faced out, hanging upside down
  B.add(bx(B, bw, bh, bd, { chip: 0.03, seed: 7 }), BM, { color: worn(H.stone, rng, 0.06, 0.05), moss: 0.4, ground: g0 + by - 1, course: 0 });
  B.add(bx(B, bw - 0.06, bh - 0.06, 0.02), ch(BM, 0, 0, -bd / 2 - 0.004), { color: worn(V.newStone, rng, 0.1).multiplyScalar(0.72), moss: 0, ground: g0 - 9, course: 0 }); // its fresh bed, where it was split off
  if (!o.low) PARTS.heliarch.roundel(B, ch(BM, 0.2, bh / 2 - 0.02, bd / 2 - 0.045, 0, 0, Math.PI), { size: 0.56, disc: 'bronze' });
  // the fall, down to the windlass: a drum between the first two legs at a hand's height, two handspikes through it
  const t = (1.0 + 0.3) / (hy + 0.3), a = at(feet[0], t), b = at(feet[1], t), mid = [(a[0] + b[0]) / 2, 1.0, (a[2] + b[2]) / 2], dx = b[0] - a[0], dz = b[2] - a[2], dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
  beam(B, M, [a[0] - ux * 0.25, 1.0, a[2] - uz * 0.25], [b[0] + ux * 0.25, 1.0, b[2] + uz * 0.25], 0.22, { ...raw, round: 8, color: worn(V.rawWood, rng, 0.2, 0.05) });
  beam(B, M, [mid[0] - ux * 0.22, 1.0, mid[2] - uz * 0.22], [mid[0] + ux * 0.22, 1.0, mid[2] + uz * 0.22], 0.3, { ...rope, round: 8 });
  beam(B, M, [0, hy - 1.3, hz], [mid[0], 1.13, mid[2]], 0.02, rope);
  const hx = b[0] - ux * 0.38, hz2 = b[2] - uz * 0.38;
  beam(B, M, [hx, 0.38, hz2 + 0.1], [hx, 1.62, hz2 - 0.1], 0.05, { ...raw, round: 5 });
  beam(B, M, [hx + uz * 0.6, 1.02, hz2 - ux * 0.6], [hx - uz * 0.6, 0.98, hz2 + ux * 0.6], 0.05, { ...raw, round: 5 });
  for (const p of [a, b]) B.add(bx(B, 0.3, 0.14, 0.3), ch(M, p[0], 1.0, p[2], 0, 0.5, 0), rope);
  // under it: the dunnage it will be set down on, and what the splitting left
  for (const s of [-1, 1]) B.add(bx(B, 0.16, 0.14, 1.0), ch(M, s * 0.38, 0.0, hz, 0, yaw + 0.1 * s, 0), { ...raw, round: 0 });
  for (let i = 0; i < (o.low ? 4 : 8); i++) { const r = 0.1 + rng() * 0.16, ang = rng() * 6.28, d = 0.9 + rng() * 1.3; B.add(B.rock(r, 0, 1.2, 0.45, 0.8), ch(M, Math.cos(ang) * d, 0.02, hz + Math.sin(ang) * d * 0.7, 0, rng() * 3, 0), { color: worn(V.newStone, rng, 0.2, 0.2), moss: 0, ground: g0 - 9 }); }
  const c = W(M, 0, 0, hz), wa = W(M, a[0], 0, a[2]), wb = W(M, b[0], 0, b[2]);
  colliders.push({ x: c[0], z: c[2], r: 0.72, y: g0 - 0.5, h: by + bh / 2 + 0.6, stand: false }, { x1: wa[0], z1: wa[2], x2: wb[0], z2: wb[2], r: 0.14, y: g0 + 0.6, h: 0.75, stand: false });
  return { colliders, head: W(M, 0, hy, hz), spike: W(M, hx - uz * 0.9, 0, hz2 + ux * 0.9), top: hy + 0.7 };
}

// A block split with wedges, and its neighbour marked for the same: M at the split block's middle on the ground, +x
// along it. Returns { colliders }.
export function splitBlock(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], len = 1.55, hh = 0.72, th = 0.42, gap = 0.04;
  const old = () => ({ color: worn(H.stone, rng, 0.06, 0.08), moss: 0.5, ground: g0, course: 0 }), fresh = { color: worn(V.newStone, rng, 0.08), moss: 0, ground: g0 - 9, course: 0 }, iron = { color: L.iron, iron: 0.8, moss: 0, ground: g0 - 9 };
  for (const s of [-1, 1]) {
    const HM = ch(M, 0, 0, s * (gap + th / 2), s * 0.035, 0, 0); // each half leans away from the cut
    B.add(bx(B, len - (s > 0 ? 0 : 0.06), hh, th, { chip: 0.04, seed: s + 2 }), ch(HM, 0, hh / 2 - 0.03, 0), old());
    B.add(bx(B, len - 0.1, hh - 0.07, 0.02), ch(HM, 0, hh / 2 - 0.04, -s * (th / 2 + 0.002)), fresh); // the new face: pale, a hand's breadth from its twin
  }
  for (let i = 0; i < 5; i++) B.add(bx(B, 0.075, 0.2, 0.09), ch(M, -len / 2 + 0.22 + i * (len - 0.44) / 4, hh - 0.05 + (i % 2) * 0.035, 0, 0, 0, (rng() - 0.5) * 0.2), iron);
  // the maul left on it
  beam(B, M, [-0.25, hh + 0.0, 0.26], [0.45, hh + 0.02, 0.36], 0.04, { color: worn(V.rawWood, rng, 0.2), moss: 0, ground: g0 - 9, round: 5 });
  B.add(B.cyl(0.07, 0.07, 0.24, 7, 1), ch(M, 0.5, hh + 0.04, 0.37, Math.PI / 2, 0.15, 0), { color: worn(L.wood, rng, 0.1), moss: 0, ground: g0 - 9 });
  // its neighbour, squared off and marked: a row of plugs set and not yet struck
  const NM = ch(M, 0.25, 0, 1.25, 0, 0.16, 0);
  B.add(bx(B, 1.3, 0.6, 0.8, { chip: 0.05, seed: 13 }), ch(NM, 0, 0.27, 0), old());
  for (let i = 0; i < 6; i++) B.add(bx(B, 0.05, 0.1, 0.05), ch(NM, -0.5 + i * 0.2, 0.6, 0.02), iron);
  const a = W(M, -len / 2 + 0.3, 0, 0), b = W(M, len / 2 - 0.3, 0, 0), c = W(NM, -0.3, 0, 0), d = W(NM, 0.3, 0, 0);
  return { colliders: [{ x1: a[0], z1: a[2], x2: b[0], z2: b[2], r: 0.5, y: g0 - 0.5, h: hh + 0.48 }, { x1: c[0], z1: c[2], x2: d[0], z2: d[2], r: 0.46, y: g0 - 0.5, h: 1.08 }] };
}

// The Drag: a track of planks, two rails of boards laid end to end along pts ([[x, y, z], ...], world), with a
// loaded sledge standing on rollers `sledge` of the way along its first length. Returns { colliders, sledgeAt }.
export function drag(B, pts, o) {
  const rng = o.rng, I = new THREE.Matrix4(), g0 = pts[0][1], colliders = [];
  const wood = (k = 0.25) => ({ color: worn(V.rawWood, rng, k, 0.25).multiplyScalar(0.82), moss: 0.12, ground: g0 });
  let sled = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, yaw = Math.atan2(ux, uz);
    const t0 = i === 0 ? 0 : 0.45, t1 = len - (i === pts.length - 2 ? 0 : 0.45);
    for (const s of [-1, 1]) {
      let t = t0 + (s > 0 ? 0 : rng() * 0.5);
      while (t < t1 - 0.5) {
        const l = Math.min(t1 - t, 1.9 + rng() * 1.1), th = 0.045 + rng() * 0.02, m = t + l / 2, off = s * 0.33 + (rng() - 0.5) * 0.05;
        B.add(bx(B, 0.22 + rng() * 0.05, th, l - 0.04), I.clone().multiply(new THREE.Matrix4().makeRotationY(yaw + (rng() - 0.5) * 0.025).setPosition(a[0] + ux * m + uz * off, a[1] + th / 2 - 0.004, a[2] + uz * m - ux * off)), wood());
        t += l;
      }
    }
    if (i === 0) {
      // the sledge: two runners, three cross bars, a block of the keep lashed on, three rollers under it and one run out behind
      const t = len * (o.sledge ?? 0.4), SM = new THREE.Matrix4().makeRotationY(yaw).setPosition(a[0] + ux * t, a[1] + 0.025, a[2] + uz * t);
      for (const k of [-0.75, 0, 0.75]) B.add(B.cyl(0.085, 0.085, 1.15, 7, 1), ch(SM, 0, 0.085, k, 0, 0.03 * k, Math.PI / 2), wood(0.1));
      B.add(B.cyl(0.085, 0.085, 1.1, 7, 1), ch(SM, 0.15, 0.085, -1.9, 0, 0.3, Math.PI / 2), wood(0.1));
      for (const s of [-1, 1]) B.add(bx(B, 0.14, 0.16, 2.3, { chip: 0.02 }), ch(SM, s * 0.36, 0.225, 0), wood(0.15));
      for (const k of [-0.8, 0, 0.8]) B.add(bx(B, 0.84, 0.07, 0.12), ch(SM, 0, 0.325, k), wood(0.2));
      B.add(bx(B, 0.82, 0.56, 1.35, { chip: 0.03, seed: 4 }), ch(SM, 0, 0.63, -0.05, 0, 0.04, 0), { color: worn(H.stone, rng, 0.06, 0.06), moss: 0.35, ground: g0, course: 0 });
      B.add(bx(B, 0.76, 0.5, 0.02), ch(SM, 0, 0.63, -0.05, 0, 0.04, 0).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.68)), { color: worn(V.newStone, rng, 0.08), moss: 0, ground: g0 - 9, course: 0 });
      for (const k of [-0.4, 0.35]) B.add(bx(B, 0.86, 0.6, 0.03), ch(SM, 0, 0.63, k), { color: V.rope, moss: 0, ground: g0 - 9 });
      // the drag rope, thrown down ahead of it
      beam(B, SM, [0, 0.3, 1.15], [0.1, 0.03, 1.9], 0.03, { color: V.rope, moss: 0, ground: g0 - 9 });
      beam(B, SM, [0.1, 0.03, 1.9], [-0.25, 0.03, 3.0], 0.03, { color: V.rope, moss: 0, ground: g0 - 9 });
      const p = W(SM, 0, 0, -0.5), q = W(SM, 0, 0, 0.5);
      colliders.push({ x1: p[0], z1: p[2], x2: q[0], z2: q[2], r: 0.55, y: g0 - 0.5, h: 1.5 });
      sled = W(SM, 0, 0, 0);
    }
  }
  return { colliders, sledgeAt: sled };
}
