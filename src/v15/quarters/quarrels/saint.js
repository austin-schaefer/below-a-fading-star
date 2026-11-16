// The Quarrels' saint (v15-Q1): the colossus that stood on Carcanet Keep's north-east corner and came down with it,
// put to work by the masons. His head stopped on the brink of the crown: they hollowed it and it is their lime kiln
// (the Smoking Saint): fed through a hole broken in the crown of his skull, fired through a stoke hole of robbed
// ashlar let in at the nape, where his neck broke, smoke out of the broken crown of his skull. What they
// burn in him for lime is the rest of the Heliarchs' statuary (the valley's broken hands and crowned heads:
// src/structures/scatter.js): three lesser heads wait in a row on the brink. One of his hands lies palm up under the
// broken end of the aqueduct and takes its drip (the Almoner): a kerb of clay on the palm makes it the masons' trough.
//
// Each maker is (B, M, o) into a structures Builder, M at the ground with +z the way the thing faces, and returns
// what the quarter's module needs (points in world space, colliders in the engine's own shapes).
import * as THREE from 'three';
import { H, V, L, PARTS, ch, worn, beam, addPainted, quad } from '../../houses/kit.js';

const gs = (a, b, sa, sb) => Math.exp(-(a * a) / (sa * sa) - (b * b) / (sb * sb));
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _v = new THREE.Vector3();
const W = (M, x, y, z) => { _v.set(x, y, z).applyMatrix4(M); return [_v.x, _v.y, _v.z]; };

// The Heliarchs' crowned head, as the scatter cuts it: a unit sphere drawn into a long face looking along +z (brow,
// sockets, nose, lips, chin), about 1.6 wide, 2.24 high and 1.9 deep. ws, hs: the sphere's segments.
function headGeo(N2, ws, hs, deep = 1) {
  const g = new THREE.SphereGeometry(1, ws, hs), pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const jaw = y < -0.2 ? 1 - 0.25 * Math.min(1, (-0.2 - y) / 0.8) : 1;
    x *= 0.8 * jaw; y *= 1.12; z *= 0.9;
    if (z > 0) {
      z += (0.26 + 0.07 * (deep - 1) * 4) * gs(x, y + 0.12, 0.1, 0.25) * z + (0.08 + 0.03 * (deep - 1) * 4) * gs(0, y - 0.22, 1, 0.07) - 0.13 * deep * gs(Math.abs(x) - 0.28, y - 0.08, 0.13, 0.09);
      z += 0.05 * gs(x, y + 0.53, 0.2, 0.05) - 0.05 * gs(x, y + 0.585, 0.24, 0.025) + 0.06 * gs(x, y + 0.86, 0.17, 0.09);
    }
    const w = N2(x * 3 + 1, y * 3 + z * 2) * 0.03;
    pos.setXYZ(i, x * (1 + w), y * (1 + w), z * (1 + w));
  }
  return g;
}
// a solid ring about the y axis (a circlet, a kerb): inner and outer radius, y0 to y1
const ring = (B, ri, ro, y0, y1, n) => B.lathe([[ri, y0], [ro, y0], [ro * 0.985, y1], [ri, y1], [ri, y0]], n);

// The colossus's head, carved: the unit sphere drawn into a long Heliarch face looking along +z, with the relief a
// visitor reads at arm's length and at 30 m (a brow ridge over hollow sockets, heavy lids closed, a nose broken off
// short, lips, long ears, a band round the brow, the hair in carved bands above it and down the back), a crack through
// his left cheek, the crown of the skull broken open (the kiln's vent) and the neck broken off flat. Returns the
// geometry and, a vertex each, `shade` (the relief cut in colour too: hollows dark, ridges pale) and `glow` (the
// fire, inside the broken crown).
function colossus(N2, ws, hs) {
  const g = new THREE.SphereGeometry(1, ws, hs), pos = g.attributes.position, n = pos.count, shade = new Float32Array(n), glow = new Float32Array(n);
  const crackPts = [[0.5, 0.32], [0.36, 0.02], [0.43, -0.3], [0.25, -0.8]];
  const segD = (x, y, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy))); return Math.hypot(x - a[0] - vx * t, y - a[1] - vy * t); };
  for (let i = 0; i < n; i++) {
    const ux = pos.getX(i), uy = pos.getY(i), uz = pos.getZ(i);
    const jaw = uy < -0.2 ? 1 - 0.3 * Math.min(1, (-0.2 - uy) / 0.8) : 1;
    const neck = 1 - 0.28 * sstep(-0.35, -1.0, uy) * (1 - sstep(0.1, 0.6, uz)); // the skull's back draws in to the neck; the jaw and chin stay forward
    let x = ux * 0.74 * jaw * neck, y = uy * 1.12, z = uz * 0.92 * (uz < 0 ? neck : 1 - 0.32 * uz); // (the face is a flattened front: its features stand out of it)
    const ax = Math.abs(x), front = sstep(0.0, 0.4, uz), back = 1 - sstep(-0.4, -0.05, uz);
    // the face
    let d = 0.14 * gs(0, y - 0.25, 1, 0.06) * (1 - sstep(0.3, 0.62, ax)); // the brow ridge
    d -= 0.19 * gs(ax - 0.27, y - 0.1, 0.15, 0.085); // the socket
    d += 0.085 * gs(ax - 0.27, y - 0.095, 0.105, 0.04) + 0.03 * gs(ax - 0.27, y - 0.15, 0.13, 0.014) - 0.025 * gs(ax - 0.27, y - 0.095, 0.1, 0.008); // the eye under its lids, closed
    const t = Math.max(0, Math.min(1, (0.22 - y) / 0.52));
    let nose = (0.1 + 0.3 * t) * Math.exp(-((x / (0.06 + 0.05 * t)) ** 2)) * sstep(-0.38, -0.3, y) * (1 - sstep(0.2, 0.3, y));
    if (y < -0.06) nose = Math.min(nose, 0.21 + 0.03 * N2(x * 20, y * 20)); // broken off short
    d += nose + 0.07 * gs(ax - 0.11, y + 0.3, 0.05, 0.045);
    d += 0.1 * gs(x, y + 0.5, 0.21, 0.04) - 0.07 * gs(x, y + 0.558, 0.25, 0.018) + 0.12 * gs(x, y + 0.63, 0.17, 0.045) - 0.06 * gs(x, y + 0.74, 0.2, 0.04) + 0.15 * gs(x, y + 0.9, 0.2, 0.1); // the lips, the chin
    d += 0.07 * gs(ax - 0.43, y + 0.08, 0.14, 0.12) - 0.05 * gs(ax - 0.4, y + 0.45, 0.12, 0.2);
    let cr = 9; for (let k = 0; k < crackPts.length - 1; k++) cr = Math.min(cr, segD(x, y, crackPts[k], crackPts[k + 1]));
    const crack = front * Math.exp(-((cr / 0.024) ** 2));
    d = (d * 0.3 - 0.05 * crack) * front; // (an undertone: the features themselves are masses of their own, in saint())
    z += d;
    // the band round his brow, the hair in carved bands above it and down the back of his head, his ears
    const band = sstep(0.38, 0.41, y) * (1 - sstep(0.55, 0.58, y)), hair = Math.max(sstep(0.58, 0.63, y), back * sstep(-0.62, -0.5, y) * (1 - band)), flute = Math.sin(y * 21);
    const rad = 0.06 * band + hair * 0.022 * flute;
    const side = 1 - sstep(0.1, 0.3, Math.abs(uz + 0.05)), ear = side * (0.11 * gs(0, y + 0.1, 1, 0.3) - 0.05 * gs(uz + 0.05, y + 0.02, 0.07, 0.16)) * (1 - band);
    x = x * (1 + rad) + Math.sign(x) * ear; z *= 1 + rad;
    // the crown of his skull broken open, and his neck broken off
    let fire = 0;
    if (y > 0.95) { const dep = y - 0.95; y = 0.95 - dep * 1.7 + 0.05 * N2(x * 9 + 3, z * 9); x *= 0.88; z *= 0.88; fire = sstep(0.0, 0.1, dep); }
    if (y < -1.0) y = -1.0 + 0.02 * N2(x * 7, z * 7);
    const w = N2(x * 3 + 1, y * 3 + z * 2) * 0.022;
    pos.setXYZ(i, x * (1 + w), y, z * (1 + w));
    shade[i] = Math.max(0.22, Math.min(1.55, 1 + 4.6 * d - 0.5 * crack + hair * 0.16 * flute + 0.12 * band - 0.5 * Math.max(0, -ear) * 8));
    glow[i] = fire;
  }
  return { g, shade, glow };
}

// The Smoking Saint. M: the ground under the head's middle, +z the way he looks. o: { S (the head's scale: 1.9 is
// 4 m from the neck's break to the broken crown), sink, stoke: [lx, lz] (the stoke hole's side, in M's frame), N2,
// low, rng }. He lies where he fell: tilted back and over on his left cheek, half his jaw in the ground.
// Returns { mouth (the broken crown, where the smoke leaves), fire (the stoke hole's mouth), stand (where the burner
// stands to feed it), colliders, r }.
export function saint(B, M, o) {
  const S = o.S ?? 1.7, sink = o.sink ?? 0.85, low = !!o.low, rng = o.rng, g0 = M.elements[13];
  const cy = 1.0 * S - sink;
  const HM = ch(M, 0, cy, 0, -0.06, 0, 0.2, S, S, S);
  const stone = worn(H.stone, rng, 0.06, 0.04).multiplyScalar(1.12), sootC = V.soot.clone().lerp(stone, 0.15), limeC = V.newDust.clone().lerp(stone, 0.4);
  const sl = Math.hypot(o.stoke[0], o.stoke[1]) || 1, sx = o.stoke[0] / sl, sz = o.stoke[1] / sl;
  const C = colossus(o.N2, low ? 72 : 104, low ? 54 : 76);
  let vi = 0;
  addPainted(B, C.g, HM, { color: stone, moss: 0.4, ground: g0, course: 0.22, disp: 0.008, dispScale: 6 }, (x, y, z, out) => {
    const sh = C.shade[vi], fire = C.glow[vi]; vi++;
    const side = (x * sx + z * sz) / (Math.hypot(x, z) || 1); // toward the stoke hole
    const soot = Math.min(0.92, 0.75 * sstep(0.72, 0.95, y) + 0.85 * sstep(0.7, 0.97, side) * sstep(-0.9, -0.4, y) * (1 - sstep(0.0, 0.8, y)) + fire);
    const lime = 0.4 * sstep(0.5, 0.9, y) * (1 - sstep(0.9, 1.0, y)) * (0.5 + 0.5 * Math.sin(x * 9 + z * 7));
    out.r = stone.r + (sootC.r - stone.r) * soot; out.g = stone.g + (sootC.g - stone.g) * soot; out.b = stone.b + (sootC.b - stone.b) * soot;
    out.r += (limeC.r - out.r) * lime; out.g += (limeC.g - out.g) * lime; out.b += (limeC.b - out.b) * lime;
    out.r *= sh; out.g *= sh; out.b *= sh;
    out.e = fire * 0.42;
  }, V.ember);
  // His face, cut as the Heliarchs cut a colossus: in masses that throw their own shadows. A brow in one bar, the
  // sockets hollow under it and the lids closed, the nose a wedge broken off short, the cheeks, the lips with the dark
  // between them, the chin, the long ears.
  const fs = (k = 1) => ({ color: stone.clone().multiplyScalar(k), moss: 0.35, ground: g0, course: 0 }), hollow = { color: H.cut.clone().lerp(V.soot, 0.4), moss: 0, ground: g0 - 9, course: 0 };
  const ball = (rx, ry, rz, x, y, z, st, det = 2, rot = 0) => B.add(new THREE.IcosahedronGeometry(1, low ? 1 : det), ch(HM, x, y, z, 0, 0, rot, rx, ry, rz), st);
  const dim = { color: stone.clone().multiplyScalar(0.5).lerp(H.cut, 0.3), moss: 0.2, ground: g0 - 9, course: 0 };
  for (const s of [-1, 1]) {
    B.add(B.box(0.5, 0.11, 0.2, { seg: 0.15, chip: 0.025, seed: s + 3 }), ch(HM, s * 0.25, 0.26 - 0.0, 0.6, 0.15, s * 0.16, -s * 0.1), fs(1.1)); // the brow, in two arcs
    ball(0.15, 0.075, 0.04, s * 0.265, 0.115, 0.615, dim, 1); // the socket's shadow
    ball(0.11, 0.048, 0.07, s * 0.265, 0.095, 0.625, fs(0.97)); // the eye
    ball(0.13, 0.042, 0.085, s * 0.265, 0.135, 0.625, fs(1.06), 2, -s * 0.1); // its lid, shut
    ball(0.19, 0.2, 0.13, s * 0.4, -0.18, 0.5, fs(1.02)); // the cheek
    ball(0.06, 0.05, 0.065, s * 0.095, -0.285, 0.74, fs(0.98), 1); // the nostril's wing
    B.add(B.box(0.07, 0.66, 0.26, { seg: 0.2, chip: 0.03, seed: s + 7 }), ch(HM, s * 0.73, -0.12, -0.03, 0, s * 0.12, s * 0.05), fs(0.95)); // the ear, its lobe long
    B.add(B.box(0.03, 0.3, 0.1, { seg: 9 }), ch(HM, s * 0.765, -0.02, -0.03, 0, s * 0.12, s * 0.05), dim);
  }
  { const sh = new THREE.Shape(); [[0, 0.24], [0.1, 0.2], [0.33, -0.12], [0.25, -0.18], [0.28, -0.25], [0.2, -0.32], [0, -0.32]].forEach(([q, y], i) => (i ? sh.lineTo(q, y) : sh.moveTo(q, y)));
    B.add(B.extrude(sh, 0.14, 1), ch(HM, 0, 0, 0.58, 0, -Math.PI / 2, 0), fs(1.1)); } // the nose: a wedge, its end broken off
  ball(0.23, 0.034, 0.07, 0, -0.52, 0.64, fs(1.04)); ball(0.19, 0.04, 0.07, 0, -0.6, 0.63, fs(1.0)); ball(0.2, 0.014, 0.05, 0, -0.562, 0.655, dim, 1); // the lips, and the dark between them
  ball(0.2, 0.14, 0.14, 0, -0.87, 0.56, fs(1.02)); // the chin
  B.add(ring(B, 0.66, 0.765, 0.4, 0.57, low ? 18 : 28), ch(HM, 0, 0, -0.1, 0, 0, 0, 0.93, 1, 1.03), { color: stone.clone().multiplyScalar(0.86), moss: 0.3, ground: g0 - 9, course: 0 }); // the band round his brow
  // the roundel on his band, over the brow: a hexagon boss, its disc long gone and the socket empty; a lesser boss each side
  const boss = { color: worn(H.dark, rng, 0.1), moss: 0.3, ground: g0 - 9, course: 0 };
  B.add(B.cyl(0.095, 0.095, 0.09, 6, 1), ch(HM, 0, 0.5, 0.65, Math.PI / 2 - 0.2, 0, 0), boss);
  B.add(B.cyl(0.045, 0.045, 0.03, low ? 10 : 16, 1), ch(HM, 0, 0.507, 0.69, Math.PI / 2 - 0.2, 0, 0), { color: H.cut, moss: 0, ground: g0 - 9, course: 0 });
  for (const s of [-1, 1]) B.add(B.cyl(0.06, 0.06, 0.05, 6, 1), ch(HM, s * 0.4, 0.475, 0.55, Math.PI / 2 - 0.2, s * 0.6, 0), boss);

  // the stoke hole, let into the nape where the neck broke in robbed ashlar: two jambs, a lintel, a relieving block, the fire
  const PM = ch(M, 0, 0, 0, 0, Math.atan2(sx, sz), 0), z0 = 0.6 * S, z1 = z0 + 1.28, zm = (z0 + z1) / 2; // (+z out of the hole)
  const ash = (k) => worn(H.stone, rng, 0.1, 0.1).lerp(sootC, k);
  for (const s of [-1, 1]) B.add(B.box(0.36, 1.2, z1 - z0, { seg: 9, chip: 0.035, seed: s + 3 }), ch(PM, s * 0.51, 0.47, zm, 0, 0, s * 0.02), { color: ash(0.35), moss: 0.1, ground: g0, course: 0 });
  B.add(B.box(1.56, 0.34, z1 - z0 + 0.1, { seg: 9, chip: 0.04, seed: 9 }), ch(PM, 0.02, 1.22, zm - 0.02, 0, 0.02, 0), { color: ash(0.6), moss: 0.05, ground: g0, course: 0 });
  B.add(B.box(1.05, 0.34, 0.8, { seg: 9, chip: 0.05, seed: 11 }), ch(PM, -0.05, 1.54, zm - 0.3, 0, -0.04, 0), { color: ash(0.7), moss: 0.05, ground: g0, course: 0 });
  quad(B, PM, [-0.33, 0.03, z0 + 0.5], [0.33, 0.03, z0 + 0.5], [0.33, 1.06, z0 + 0.5], [-0.33, 1.06, z0 + 0.5], { color: new THREE.Color('#3a1206'), moss: 0, ground: g0 - 9, emit: [V.ember[0] * 0.42, V.ember[1] * 0.42, V.ember[2] * 0.42, 1] });
  B.add(B.box(0.74, 0.09, z1 - z0 + 0.5, { seg: 0.5 }), ch(PM, 0, 0.03, zm + 0.25), { color: V.newDust.clone().lerp(V.soot, 0.45), moss: 0, ground: g0 - 9, disp: 0.02, dispScale: 4 }); // the ash raked out
  for (let i = 0; i < (low ? 3 : 6); i++) B.add(B.rock(0.07 + rng() * 0.05, 0, 1, 0.6, 1), ch(PM, (rng() - 0.5) * 0.5, 0.1, z0 + 0.62 + rng() * 0.5, 0, rng() * 3, 0), { color: new THREE.Color('#2a0a04'), moss: 0, ground: g0 - 9, emit: [V.ember[0] * 0.7, V.ember[1] * 0.5, V.ember[2] * 0.4, 1] });
  // the rake left leaning by it, and the fuel: split thorn, stacked
  beam(B, PM, [0.86, 0, z1 + 0.5], [0.72, 1.7, z1 - 0.35], 0.035, { color: L.iron, iron: 0.9, moss: 0, ground: g0, round: 5 });
  B.add(B.box(0.3, 0.03, 0.12, { seg: 9 }), ch(PM, 0.86, 0.02, z1 + 0.5, 0, 0.3, 0), { color: L.iron, iron: 0.9, moss: 0, ground: g0 });
  const stack = [-1.28, z1 - 0.55];
  for (let i = 0; i < (low ? 7 : 11); i++) { const row = i < 5 ? 0 : i < 9 ? 1 : 2, k = i < 5 ? i : i < 9 ? i - 5 + 0.5 : i - 9 + 1; B.add(B.cyl(0.075, 0.085, 0.8 + rng() * 0.12, 5, 1), ch(PM, stack[0] + (rng() - 0.5) * 0.04, 0.08 + row * 0.15, stack[1] + k * 0.17, 0, (rng() - 0.5) * 0.12, Math.PI / 2), { color: worn(L.wood, rng, 0.2, 0.3), moss: 0.1, ground: g0 }); }

  const mouth = W(HM, 0, 0.9, 0), fire = W(PM, 0, 0.6, z1 - 0.1), stand = W(PM, 0, 0, z1 + 1.0);
  const c0 = W(M, 0, 0, 0), a = W(PM, 0, 0, z0 + 0.2), b = W(PM, 0, 0, z1 - 0.2), st = W(PM, stack[0], 0, stack[1] + 0.35);
  return { mouth, fire, stand, r: 0.86 * S,
    colliders: [{ x: c0[0], z: c0[2], r: 0.83 * S, y: g0 - 0.5, h: 2.1 * S }, { x1: a[0], z1: a[2], x2: b[0], z2: b[2], r: 0.66, y: g0 - 0.5, h: 2.2, stand: false }, { x: st[0], z: st[2], r: 0.5, y: g0 - 0.5, h: 0.95 }] };
}

// A lesser crowned head, waiting for the fire: r its size (m, about its half-width). M: the ground under it, +z its face.
export function lesserHead(B, M, o) {
  const r = o.r, rng = o.rng, g0 = M.elements[13], k = r / 0.8;
  const HM = ch(M, 0, 1.12 * k * 0.86, 0, o.rx ?? 0, 0, o.rz ?? 0, k, k, k), stone = worn(H.stone, rng, 0.12, 0.12);
  B.add(headGeo(o.N2, o.low ? 12 : 18, o.low ? 9 : 13), HM, { color: stone, moss: 0.6, ground: g0, course: 0 });
  B.add(ring(B, 0.6, 0.83, 0.62, 0.86, o.low ? 8 : 12), HM, { color: stone.clone().multiplyScalar(0.85), moss: 0.5, ground: g0 });
  const c = W(M, 0, 0, 0);
  return { colliders: [{ x: c[0], z: c[2], r: r * 0.9, y: g0 - 0.5, h: 2 * k + 0.5 }] };
}

// The Almoner: the saint's hand, palm up, fingers along +z, three times the scatter's hand (its palm 1.26 by 1.5 m),
// a kerb of clay on the palm and the water standing in it. M: the ground under the palm's middle.
// Returns { pool: the water's middle (world), colliders }.
export function almoner(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], k = o.k ?? 3, low = !!o.low;
  const HM = ch(M, 0, -0.05 * k, 0, 0.1, 0, -0.04, k, k, k), stone = worn(H.stone, rng, 0.1, 0.06).multiplyScalar(1.08);
  const st = { color: stone, moss: 0.5, ground: g0, course: 0, wet: 0.1 }, seg = low ? 6 : 8, ball = (r, x, y, z, sx = 1, sy = 1, sz = 1) => B.add(new THREE.IcosahedronGeometry(r, 1), ch(HM, x, y, z, 0, 0, 0, sx, sy, sz), st);
  B.add(B.box(0.46, 0.14, 0.5, { seg: 0.09, chip: 0.035 }), ch(HM, 0, 0.09, 0), { ...st, disp: 0.012, dispScale: 5 });
  ball(0.1, 0.15, 0.13, -0.12, 1.0, 0.55, 1.5); ball(0.085, -0.17, 0.13, -0.08, 0.8, 0.5, 1.9); // the heel of the thumb, the heel of the hand
  B.add(B.cyl(0.17, 0.2, 0.36, low ? 8 : 10, 1), ch(HM, 0, 0.09, -0.41, Math.PI / 2, 0, 0, 1.2, 1, 0.72), st); // the wrist, broken off
  // four fingers of three joints, lying out and curling up at the ends (the third's last two joints are gone)
  const fingers = [[-0.172, 0.86, 1.0], [-0.058, 1.0, 0.6], [0.058, 0.95, 0.8], [0.172, 0.76, 1.25]];
  for (let i = 0; i < 4; i++) {
    const [x, len, curl] = fingers[i], r0 = 0.052 - (i === 3 ? 0.006 : 0);
    let p = [x, 0.1, 0.2], ang = 0.06 * curl;
    for (let j = 0; j < 3; j++) {
      if (i === 2 && j > 0) break;
      const r = r0 - j * 0.006, l = [0.27, 0.19, 0.13][j] * len, q = [p[0] + (j ? 0 : x * 0.3), p[1] + Math.sin(ang) * l, p[2] + Math.cos(ang) * l];
      beam(B, HM, p, q, r * 2, { ...st, round: seg }, (r - 0.004) * 2);
      ball(r - 0.002, q[0], q[1], q[2]);
      p = q; ang += [0.5, 0.7, 0][j] * curl;
    }
  }
  { const a = [0.2, 0.1, -0.1], b = [0.35, 0.14, 0.1], c = [0.38, 0.27, 0.27];
    beam(B, HM, a, b, 0.125, { ...st, round: seg }, 0.11); beam(B, HM, b, c, 0.105, { ...st, round: seg }, 0.085);
    ball(0.055, ...b); ball(0.043, ...c); }
  B.add(new THREE.TorusGeometry(0.062, 0.016, 5, 12), ch(HM, -0.072, 0.115, 0.36, 0.1, 0, 0), { color: H.bronze, moss: 0.1, ground: g0 - 9, wet: 0.2 }); // his ring: nobody has got it off
  // the hollow of the palm, kerbed with a ring of clay and lime to hold more: the water in it dark, showing the sky
  const yw = 0.178, rw = 0.135;
  B.add(new THREE.TorusGeometry(rw + 0.012, 0.024, 5, low ? 10 : 14), ch(HM, 0, 0.168, 0.0, Math.PI / 2, 0, 0, 1, 1.25, 1), { color: worn(V.mud, rng, 0.15).lerp(V.lime, 0.25), moss: 0.2, ground: g0 - 9, wet: 0.3, disp: 0.004, dispScale: 14 });
  B.add(B.cyl(rw, rw, 0.02, low ? 10 : 14, 1), ch(HM, 0, yw - 0.01, 0, 0, 0, 0, 1, 1, 1.25), { color: new THREE.Color('#141d27'), moss: 0, ground: g0 - 9, wet: 1, emit: [0.02, 0.026, 0.04, 2] });
  // where it runs over, between the fingers: a dark wet tongue on the stone, and a jar set to catch it
  B.add(B.box(0.05, 0.012, 0.34, { seg: 9 }), ch(HM, 0.0, 0.163, 0.33, -0.06, 0, 0), { color: new THREE.Color('#1c242a'), moss: 0.5, ground: g0 - 9, wet: 1 });
  const pool = W(HM, 0, yw, 0), c = W(M, 0, 0, 0), f = W(M, 0, 0, 0.5 * k), wr = W(M, 0, 0, -0.42 * k);
  return { pool, jar: W(M, 0.0, 0, 0.92 * k), colliders: [{ x1: wr[0], z1: wr[2], x2: f[0], z2: f[2], r: 0.25 * k, y: g0 - 0.5, h: 0.5 + 0.22 * k }], c };
}

// the masons' bench: a plank on two robbed capitals. M: its middle on the ground, +z the way a sitter looks
export function bench(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], w = o.w ?? 1.5;
  for (const s of [-1, 1]) B.add(B.box(0.3, 0.42, 0.32, { seg: 9, chip: 0.03, seed: s + 5 }), ch(M, s * (w / 2 - 0.26), 0.19, 0, 0, (rng() - 0.5) * 0.3, 0), { color: worn(H.stone, rng, 0.1, 0.1), moss: 0.4, ground: g0, course: 0 });
  B.add(B.box(w, 0.055, 0.36, { seg: 9 }), ch(M, 0, 0.425, 0.02, 0, (rng() - 0.5) * 0.04, 0), { color: worn(V.rawWood, rng, 0.3, 0.1), moss: 0.05, ground: g0 });
  const a = W(M, -w / 2 + 0.15, 0, 0), b = W(M, w / 2 - 0.15, 0, 0);
  return { seat: W(M, 0, 0.45, 0.02), colliders: [{ x1: a[0], z1: a[2], x2: b[0], z2: b[2], r: 0.2, y: g0 - 0.5, h: 0.95 }] };
}
