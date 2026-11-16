// The Quarrels' saint (v15-Q1): the colossus that stood on Carcanet Keep's north-east corner and came down with it,
// put to work by the masons. His head stopped on the brink of the crown: they hollowed it and it is their lime kiln
// (the Smoking Saint): fed through a hole broken in the crown of his skull, fired through a stoke hole of robbed
// ashlar let in behind his ear, smoke out between the points of his crown, the fire showing in his eyes. What they
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

// The Smoking Saint. M: the ground under the head's middle, +z the way he looks. o: { S (the head's scale: 1.72 is
// 3.85 m from chin to crown), sink, stoke: [lx, lz] (the stoke hole's side, in M's frame), N2, low, rng }
// Returns { mouth (the top of the charging hole, where the smoke comes out), fire (the stoke hole's mouth), stand
// (where the burner stands to feed it), colliders, r }.
export function saint(B, M, o) {
  const S = o.S ?? 1.72, sink = o.sink ?? 0.5, low = !!o.low, rng = o.rng, g0 = M.elements[13];
  const cy = 1.12 * S - sink;
  const HM = ch(M, 0, cy, 0, -0.1, 0, 0.045, S, S, S); // tilted back a little, and off true: it rolled here
  const stone = worn(H.stone, rng, 0.12, 0.04).lerp(V.newDust, 0.22), sootC = V.soot.clone().lerp(stone, 0.12), limeC = V.newDust.clone().lerp(stone, 0.35);
  const sl = Math.hypot(o.stoke[0], o.stoke[1]) || 1, sx = o.stoke[0] / sl, sz = o.stoke[1] / sl;
  // the head, painted: soot from the crown down and above each eye and over the stoke hole, burnt pale round the
  // charging hole, the fire's own colour where the stone is thin in the sockets
  addPainted(B, headGeo(o.N2, low ? 44 : 60, low ? 30 : 42, 1.25), HM, { color: stone, moss: 0.35, ground: g0, course: 0 }, (x, y, z, out) => {
    const front = z > 0 ? 1 : 0, ax = Math.abs(x);
    let soot = 0.8 * sstep(0.5, 1.0, y) + 0.55 * front * gs(ax - 0.28, 0, 0.11, 9) * sstep(0.06, 0.2, y) * (1 - sstep(0.55, 0.95, y)) + 0.35 * front * gs(x, 0, 0.2, 9) * sstep(-0.6, -0.5, y) * (1 - sstep(-0.5, -0.1, y));
    const side = (x * sx + z * sz) / (Math.hypot(x, z) || 1); // toward the stoke hole
    soot += 0.85 * sstep(0.75, 0.97, side) * sstep(-0.75, -0.3, y) * (1 - sstep(0.1, 0.9, y));
    soot = Math.min(0.92, soot);
    const lime = 0.5 * sstep(0.78, 1.05, y) * (0.5 + 0.5 * Math.sin(x * 9 + z * 7));
    const c = stone;
    // the face cut in colour as well as stone, so it reads in the keep's shadow: the sockets, under the nose, the lips' line dark; the nose's ridge and the brow pale
    const dark = front * Math.min(0.75, 0.62 * gs(ax - 0.28, y - 0.08, 0.16, 0.1) + 0.5 * gs(x, y + 0.36, 0.13, 0.05) + 0.7 * gs(x, y + 0.585, 0.25, 0.028) + 0.3 * gs(ax - 0.5, y + 0.3, 0.12, 0.4)), pale = front * (0.4 * gs(x, y + 0.1, 0.045, 0.2) + 0.28 * gs(x, y - 0.24, 0.5, 0.05) + 0.25 * gs(x, y + 0.5, 0.15, 0.03) + 0.2 * gs(x, y + 0.86, 0.14, 0.07));
    out.r = c.r + (sootC.r - c.r) * soot; out.g = c.g + (sootC.g - c.g) * soot; out.b = c.b + (sootC.b - c.b) * soot;
    out.r += (limeC.r - out.r) * lime; out.g += (limeC.g - out.g) * lime; out.b += (limeC.b - out.b) * lime;
    const m = (1 - dark) * (1 + pale * 0.5); out.r *= m; out.g *= m; out.b *= m;
  });
  // his eyes: burnt through. A dark almond in each socket with the fire behind it
  for (const s of [-1, 1]) B.add(new THREE.IcosahedronGeometry(1, 1), ch(HM, s * 0.285, 0.075, 0.735, 0, 0, -s * 0.12, 0.125, 0.06, 0.07), { color: new THREE.Color('#2a0c04'), moss: 0, ground: g0 - 9, emit: [V.ember[0] * 0.3, V.ember[1] * 0.26, V.ember[2] * 0.26, 1] });
  B.add(new THREE.IcosahedronGeometry(1, 1), ch(HM, 0, -0.585, 0.735, 0, 0, 0.03, 0.18, 0.024, 0.05), { color: new THREE.Color('#2a0c04'), moss: 0, ground: g0 - 9, emit: [V.ember[0] * 0.26, V.ember[1] * 0.2, V.ember[2] * 0.2, 1] }); // and between his lips
  // his crown: a circlet standing off the skull, five of its six points left
  const gold = worn(H.bronzeDull, rng, 0.25, 0.06).lerp(sootC, 0.35);
  B.add(ring(B, 0.6, 0.84, 0.6, 0.88, low ? 14 : 20), HM, { color: gold, moss: 0.1, ground: g0 - 9 });
  for (let k = 0; k < 6; k++) {
    if (k === 4) continue;
    const a = (k / 6) * Math.PI * 2 + 0.26;
    B.add(B.cyl(0.0, 0.11, 0.5, 4, 1), ch(HM, Math.cos(a) * 0.74, 1.1, Math.sin(a) * 0.74 - 0.02, 0, -a, -0.17), { color: gold, moss: 0.05, ground: g0 - 9 });
  }
  // the charging hole broken in the top of his skull: a kerb of mud brick round it, the throat glowing
  B.add(ring(B, 0.27, 0.47, 0.96, 1.25, low ? 10 : 14), HM, { color: worn(V.mud, rng, 0.2).lerp(limeC, 0.3), moss: 0, ground: g0 - 9, disp: 0.03, dispScale: 3 });
  B.add(B.cyl(0.275, 0.275, 0.04, low ? 10 : 14, 1), ch(HM, 0, 1.17, 0), { color: new THREE.Color('#160804'), moss: 0, ground: g0 - 9, emit: [V.ember[0] * 0.5, V.ember[1] * 0.4, V.ember[2] * 0.4, 1] });

  // the stoke hole, let into him behind the ear in robbed ashlar: two jambs, a lintel, a relieving block, the fire
  const PM = ch(M, 0, 0, 0, 0, Math.atan2(sx, sz), 0), z0 = 0.62 * S, z1 = z0 + 1.28, zm = (z0 + z1) / 2; // (+z out of the hole)
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

  const mouth = W(HM, 0, 1.28, 0), fire = W(PM, 0, 0.6, z1 - 0.1), stand = W(PM, 0, 0, z1 + 1.0);
  const c0 = W(M, 0, 0, 0), a = W(PM, 0, 0, z0 + 0.2), b = W(PM, 0, 0, z1 - 0.2), st = W(PM, stack[0], 0, stack[1] + 0.35);
  return { mouth, fire, stand, r: 0.86 * S,
    colliders: [{ x: c0[0], z: c0[2], r: 0.83 * S, y: g0 - 0.5, h: 2.24 * S }, { x1: a[0], z1: a[2], x2: b[0], z2: b[2], r: 0.66, y: g0 - 0.5, h: 2.2, stand: false }, { x: st[0], z: st[2], r: 0.5, y: g0 - 0.5, h: 0.95 }] };
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
