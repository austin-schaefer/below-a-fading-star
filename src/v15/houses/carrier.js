// A house in a Noonwright carrier (v15-V1): one of the great vessels that carried a measure of noon, stalled here and
// standing on its tail as it was fired, taller than any house in the row. Blown whole and glazed in a field (celadon
// or ox-blood) with a band brushed round it, the foot bare, the shoulder amber glass, the edges run toward the tail in
// drips; the glaze broken off in sheets so the milk body shows, and what noon it still holds comes through the wall
// there. It slumped as it set: above the room it leans. The Late folk cut a door in its belly and hung a plank leaf
// in it, put a stovepipe out through its shoulder, shored its lee side with two poles, and somebody lives in the
// round room: a bed built to the curve, a square cupboard wedged off the wall, a picture that will not hang.
// One of its own bull's-eyes is the window. Entered: a disc floor, the wall a ring of colliders with the door left.
// o: seed, w (8), d (7), form ('long' | 'waist' | 'gourd'), glaze (0..3, GLAZES), lit (0..1: 0.8), low.
import * as THREE from 'three';
import { GLAZES, formAt, NOON_PARTS } from '../../v8/strata/noon.js';
import { L, H, V, N, PARTS, rngOf, pick, ch, worn, site, beam, pot, leaf, plate, addPainted } from './kit.js';

const FORMS = ['long', 'waist', 'gourd']; // (a 'drop', fat at the nose, has no room at its foot)

export function carrier(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 3), w = o.w ?? 8, d = o.d ?? 7, low = !!o.low, g0 = M.elements[13], lit = o.lit ?? 0.8;
  const R = site(M, 'carrier', { seed, w, d }), base = B.triangles;
  const form = o.form || FORMS[seed % FORMS.length], G = GLAZES[(o.glaze ?? seed) % GLAZES.length];
  const Rr = Math.min(w / 2 - 0.9, 2.5 + rng() * 0.4), Lh = 9.2 + rng() * 2.4, sink = 0.95, body = Lh - 1.0;
  const yF = 0.24, sF = yF + sink, sT = sF + 2.12, sC = sF + 2.75; // the room: floor, the door's head, the ceiling
  const ni = low ? 28 : 32, da = (Math.PI * 2) / ni, th = 0.17;
  const side = rng() < 0.5 ? -1 : 1, bend = (0.012 + rng() * 0.012) * side, bendz = (rng() - 0.5) * 0.012;
  const rad = (s) => (s <= body ? Rr * formAt(form, s / body) : Rr * formAt(form, 1) * (s > Lh - 0.3 ? 1.24 : 1.02));
  // slumped: above the room every ring is carried aside, more the higher
  const off = (s) => { const u = Math.max(0, s - sC); return [bend * u * u, bendz * u * u]; };
  const ss = new Set([sF, sT, sC, body + 0.35, Lh - 0.3, Lh - 0.28, Lh]);
  const nb = low ? 13 : 20; for (let i = 0; i <= nb; i++) { const s = (i / nb) * body; if ([sF, sT, sC].every((q) => Math.abs(q - s) > 0.18)) ss.add(s); }
  const S = [...ss].sort((a, b) => a - b), jF = S.indexOf(sF), jT = S.indexOf(sT), jC = S.indexOf(sC);
  const inDoor = (i, j) => j >= jF && j < jT && (i === ni - 1 || i <= 1);
  const hull = (inner, j0, j1) => {
    const pos = [], idx = [];
    for (let j = j0; j <= j1; j++) for (let i = 0; i < ni; i++) { const a = (i - 0.5) * da, r = rad(S[j]) - (inner ? th : 0), [ox, oz] = off(S[j]); pos.push(Math.sin(a) * r * 0.95 + ox, S[j] - sink, Math.cos(a) * r + oz); }
    for (let j = j0; j < j1; j++) for (let i = 0; i < ni; i++) {
      if (inDoor(i, j)) continue;
      const a = (j - j0) * ni + i, b = (j - j0) * ni + (i + 1) % ni, c2 = a + ni, e = b + ni;
      if (inner) idx.push(a, c2, b, b, c2, e); else idx.push(a, b, c2, b, e, c2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  };
  // the glaze, in the vessel's own frame: the foot bare, the field, the band and its drips, the amber shoulder, and
  // the sheets where it has come away to the milk body, which is where the light gets out
  const hash = (a) => { const v = Math.sin(a * 127.1 + seed * 3.3) * 43758.5453; return v - Math.floor(v); };
  const drip = (a, k) => { const u = ((a / (Math.PI * 2)) % 1 + 1) % 1 * 27, f = u - Math.floor(u), hh = hash(Math.floor(u) + k * 17); return hh > 0.6 ? Math.sin(f * Math.PI) ** 2 * (hh - 0.5) * 2 : 0; };
  const tb = 0.5 + rng() * 0.08, set = (out, C, k = 1) => { out.r = C.r * k; out.g = C.g * k; out.b = C.b * k; };
  const paint = (x, y, z, out) => {
    const s = y + sink, t = s / body, [ox, oz] = off(s), a = Math.atan2(x - ox, z - oz), tone = 0.9 + 0.2 * hash(Math.round(s * 7) + 0.5);
    const gone = 0.8 * B.n3(x * 0.42 + seed, y * 0.34, z * 0.42) + 0.6 * B.n3(x * 1.3, y * 1.1 + seed, z * 1.3) + (t < 0.42 && Math.abs(a) < 1.1 ? 0.3 : 0) + (t > 0.62 ? -0.15 : 0);
    let glow = 0.2;
    if (s > body + 0.2) set(out, G[2], tone * 0.8);
    else if (t < 0.085 + 0.04 * drip(a, 1) || gone > 0.4) { set(out, N.milk, tone * 0.92); glow = 0.62; }
    else if (t > tb - 0.07 - 0.09 * drip(a, 2) && t < tb + 0.06) { set(out, G[1], tone); glow = 0.1; }
    else if (t > 0.86 - 0.05 * drip(a, 4)) { set(out, G[2], tone); glow = 0.45; }
    else set(out, G[0], tone * (0.94 + 0.08 * Math.sin(a * 3 + seed)));
    const low2 = Math.max(0, 1 - t * 1.25);
    out.e = lit * glow * (0.05 + 0.3 * low2 * low2);
  };
  addPainted(B, hull(false, 0, S.length - 1), M, { color: N.milk, moss: 0.1, wet: 0.45, ground: g0 }, paint);
  addPainted(B, hull(true, jF, jC), M, { color: N.milk, moss: 0, wet: 0.2, ground: g0 - 3 }, (x, y, z, out) => { set(out, N.cloud, 0.9); out.e = lit * 0.16; });
  // the cut: the wall's thickness round the door, the milk body, pale
  const pt = (i, j, inner) => { const a = (i - 0.5) * da, r = rad(S[j]) - (inner ? th : 0); return [Math.sin(a) * r * 0.95, S[j] - sink, Math.cos(a) * r]; };
  {
    const pos = [], q = (a, b, c2, e) => pos.push(...a, ...b, ...c2, ...a, ...c2, ...e);
    for (let j = jF; j < jT; j++) { q(pt(ni - 1, j, false), pt(ni - 1, j, true), pt(ni - 1, j + 1, true), pt(ni - 1, j + 1, false)); q(pt(2, j, true), pt(2, j, false), pt(2, j + 1, false), pt(2, j + 1, true)); }
    for (const i of [ni - 1, 0, 1]) q(pt(i, jT, true), pt(i + 1, jT, true), pt(i + 1, jT, false), pt(i, jT, false));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    B.add(g, M, { color: N.milk, moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.2 * lit, N.light[1] * 0.2 * lit, N.light[2] * 0.2 * lit, 1] });
  }
  // the mouth stopped with a Late bung; the great ring at its nose; a rib where the shoulder turns; the pulled thread
  const [tx, tz] = off(Lh), rN = rad(Lh - 0.5), glass = (col, k = 0) => ({ color: col, moss: 0.05, wet: 0.45, ground: g0 - 3, emit: k ? [N.light[0] * k, N.light[1] * k, N.light[2] * k, 1] : undefined });
  B.add(B.cyl(rN * 1.22, rN * 1.22, 0.1, 14, 1), ch(M, tx, Lh - sink - 0.03, tz), glass(N.bone));
  B.add(B.cyl(rN * 0.8, rN * 0.95, 0.5, 8, 1), ch(M, tx, Lh - sink + 0.2, tz), { color: L.wood, moss: 0.3, ground: g0 - 3 });
  B.add(new THREE.TorusGeometry(rN * 1.05, 0.1, 6, low ? 14 : 20), ch(M, tx, Lh - sink + 0.45 + rN * 1.05, tz, 0, rng() * 3, 0), glass(N.bone));
  for (const t of [0.86, 0.1]) { const s = t * body, [ox, oz] = off(s); B.add(new THREE.TorusGeometry(rad(s), 0.08, 5, ni).rotateX(Math.PI / 2), ch(M, ox, s - sink, oz, 0, 0, 0, 0.95, 1, 1), glass(N.bone)); }
  {
    const pts = [], turns = 2.4 + rng(), ph = rng() * 6.28, nn = low ? 30 : 56;
    for (let i = 0; i <= nn; i++) { const f = i / nn, s = (0.78 + 0.2 * f) * body, a = ph + f * turns * Math.PI * 2, r = rad(s) + 0.03, [ox, oz] = off(s); pts.push(new THREE.Vector3(Math.sin(a) * r * 0.95 + ox, s - sink, Math.cos(a) * r + oz)); }
    B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nn, 0.055, 4, false), M, glass(N.amberG, 0.06 * lit));
  }
  // its bull's-eyes: one at head height beside the door, the room's window; one high in its front
  const eye = (a, s, r, k) => {
    const rr = rad(s), [ox, oz] = off(s), m = ch(M, Math.sin(a) * rr * 0.95 + ox, s - sink, Math.cos(a) * rr + oz, 0, a, 0);
    NOON_PARTS.lens(B, ch(m, 0, 0, -0.02), { r, lit: k, cheap: low });
    R.window(Math.sin(a) * rr, s - sink, Math.cos(a) * rr, true);
    return m;
  };
  const ea = -side * (0.95 + rng() * 0.25), em = eye(ea, sF + 1.55, 0.5, lit);
  B.add(new THREE.CircleGeometry(0.46, 10), ch(em, 0, 0, -th - 0.02, 0, Math.PI, 0), { color: N.honey, moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.9, N.light[1] * 0.75, N.light[2] * 0.4, 1] });
  eye(side * (0.2 + rng() * 0.5), body * (0.66 + rng() * 0.06), 0.62, lit);
  // the Late folk's work on it. The door: a frame of two posts and a head, a plank leaf thrown open
  const ad = 1.5 * da, rD = rad(sF + 1) * 0.95, dxh = Math.sin(ad) * rD, dzh = Math.cos(ad) * rad(sF + 1), ai = Math.floor(rng() * 4), paintC = worn(L.paint[ai], rng, 0.2);
  for (const s of [-1, 1]) B.add(B.box(0.12, 2.2, 0.14, { seg: 9 }), ch(M, s * (dxh + 0.02), yF + 1.08, dzh + 0.05), { color: worn(L.paint[(ai + 1) % 4], rng, 0.25), moss: 0.05, ground: g0 });
  B.add(B.box(dxh * 2 + 0.34, 0.14, 0.16, { seg: 9 }), ch(M, 0, yF + 2.2, dzh + 0.07), { color: worn(L.paint[(ai + 1) % 4], rng, 0.25), moss: 0.05, ground: g0 });
  const lm = ch(M, side * (dxh + 0.09), yF, dzh + 0.13, 0, side * (1.75 + rng() * 0.3), 0);
  leaf(B, ch(lm, -side * (dxh - 0.02), 0, 0), dxh * 2 - 0.08, 2.1, paintC, rng);
  R.post(side * (dxh + 0.5), dzh + 0.75, 0.45, 0, 2.3, { stand: false });
  // a Heliarch drum for a doorstep
  PARTS.heliarch.drum(B, ch(M, 0, -0.62, dzh + 0.42), { r: 0.62, h: 0.62 + yF - 0.03, moss: 0.5 });
  R.post(0, dzh + 0.42, 0.62, -0.62, 0.62 + yF - 0.03);
  // the stovepipe out through its shoulder, a lump of lime round it where it comes through, a cowl
  {
    const a = side * (2.1 + rng() * 0.5), s = body * 0.8, r = rad(s), [ox, oz] = off(s), p0 = [Math.sin(a) * (r - 0.3) * 0.95 + ox, s - sink - 0.2, Math.cos(a) * (r - 0.3) + oz];
    const p1 = [p0[0] + Math.sin(a) * 0.85, p0[1] + 0.45, p0[2] + Math.cos(a) * 0.85], p2 = [p1[0] + (rng() - 0.5) * 0.15, p1[1] + 1.5 + rng() * 0.6, p1[2]];
    const iron = { color: L.iron, iron: 0.55, moss: 0, ground: g0 - 3, round: 6 };
    beam(B, M, p0, p1, 0.24, iron); beam(B, M, p1, p2, 0.22, iron);
    B.add(new THREE.IcosahedronGeometry(0.2, 0), ch(M, ...p1), { color: L.iron, iron: 0.55, moss: 0, ground: g0 - 3 });
    B.add(new THREE.IcosahedronGeometry(0.36, 1), ch(M, Math.sin(a) * r * 0.95 + ox, s - sink + 0.02, Math.cos(a) * r + oz), { color: worn(V.lime, rng, 0.2), moss: 0.2, ground: g0 - 3, disp: 0.05 });
    B.add(B.cyl(0.02, 0.26, 0.24, 6, 1), ch(M, p2[0], p2[1] + 0.2, p2[2]), { color: L.iron, iron: 0.6, moss: 0, ground: g0 - 3 });
    R.chimney = R.W(p2[0], p2[1] + 0.35, p2[2]);
  }
  // two raw poles shoring the side it leans to, each foot on a stone
  for (let i = 0; i < 2; i++) {
    const a = side * (1.35 + i * 0.75), s = sC + 1.2 + i * 0.5, r = rad(s), [ox, oz] = off(s), fr = Math.min(w / 2 - 0.3, r + 1.9);
    const foot = [Math.sin(a) * fr, -0.1, Math.cos(a) * Math.min(d / 2 - 0.3, fr)];
    beam(B, M, foot, [Math.sin(a) * r * 0.93 + ox, s - sink, Math.cos(a) * r * 0.98 + oz], 0.16, { color: V.rawWood, moss: 0.1, ground: g0, round: 6 });
    B.add(B.box(0.6, 0.3, 0.5, { seg: 9, chip: 0.04 }), ch(M, foot[0], 0.05, foot[2], 0, a, 0), { color: H.stone, moss: 0.5, ground: g0 });
    R.post(foot[0] * 0.9, foot[2] * 0.9, 0.3, 0, 1.6, { stand: false });
  }
  // the room. Floor boards and the loft's underside
  const ri = rad(sF + 0.6) * 0.95 - th, wood = { color: worn(L.wood, rng, 0.1), moss: 0, ground: g0 - 3, emit: [0.05, 0.035, 0.015, 1] };
  B.add(new THREE.CircleGeometry(rad(sF) - 0.05, ni).rotateX(-Math.PI / 2), ch(M, 0, yF, 0, 0, 0, 0, 0.95, 1, 1), wood);
  B.add(new THREE.CircleGeometry(rad(sC) - 0.05, ni).rotateX(Math.PI / 2), ch(M, 0, sC - sink, 0, 0, 0, 0, 0.95, 1, 1), { ...wood, color: L.wood.clone().multiplyScalar(0.7) });
  B.add(B.box(dxh * 2 + 0.06, 0.3, 1.5, { seg: 9 }), ch(M, 0, yF - 0.152, dzh - 0.55), { color: worn(L.wood, rng, 0.2), moss: 0.1, ground: g0 - 1 }); // the sill, a plank through the cut
  R.disc(0, 0, ri - 0.1, yF);
  R.disc(0, dzh - 0.1, 0.72, yF); // the sill, through the wall's thickness
  R.door(0, dzh + 1.2, { enter: true, w: dxh * 2 });
  // the wall as a ring of short walls, the door left open
  { const rw = rad(sF + 1) - th / 2, a0 = ad + 0.1, a1 = Math.PI * 2 - ad - 0.1, n = 12; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * (a1 - a0), b = a0 + ((i + 1) / n) * (a1 - a0); R.wall(Math.sin(a) * rw * 0.95, Math.cos(a) * rw, Math.sin(b) * rw * 0.95, Math.cos(b) * rw, 0, 6, 0.13); } }
  // a bed built to the curve along the back wall, in patchwork
  const rb = ri - 0.5, quilt = [L.cloth[2], L.cloth[0], L.cloth[3], L.cloth[1]];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + side * (-0.75 + i * 0.36), m = ch(M, Math.sin(a) * rb, yF, Math.cos(a) * rb, 0, a, 0);
    B.add(B.box(0.92, 0.34, 0.82, { seg: 9 }), ch(m, 0, 0.17, 0), { color: L.wood, moss: 0, ground: g0 - 3 });
    B.add(B.box(0.94, 0.1, 0.74, { seg: 9 }), ch(m, 0, 0.39, 0), { color: i === 0 ? worn(L.plaster[3], rng, 0.05) : worn(quilt[i % 4], rng, 0.15), moss: 0, ground: g0 - 3, emit: [0.04, 0.03, 0.015, 1] });
  }
  R.wall(Math.sin(Math.PI - side * 0.75) * rb, Math.cos(Math.PI - side * 0.75) * rb, Math.sin(Math.PI + side * 0.7) * rb, Math.cos(Math.PI + side * 0.7) * rb, yF, 0.45, 0.42, { stand: true });
  // a square cupboard in a round house: stood off the wall on two wedges
  {
    const a = side * 1.75, rc = ri - 0.62, m = ch(M, Math.sin(a) * rc, yF, Math.cos(a) * rc, 0, a + Math.PI, 0), col = worn(L.paint[(ai + 2) % 4], rng, 0.25);
    B.add(B.box(1.05, 1.75, 0.5, { seg: 9 }), ch(m, 0, 0.875, 0, 0, 0, 0.02), { color: col, moss: 0, ground: g0 - 3, emit: [0.03, 0.03, 0.02, 1] });
    for (const sx of [-1, 1]) { B.add(B.box(0.46, 1.45, 0.02, { seg: 9 }), ch(m, sx * 0.25, 0.9, 0.255, 0, 0, 0.02), { color: col.clone().multiplyScalar(0.78), moss: 0, ground: g0 - 3 }); plate(B, ch(m, sx * 0.4, 0, -0.36, 0, Math.PI / 2, 0), [[-0.14, 0], [0.14, 0], [-0.14, 0.2]], 0.1, { color: V.rawWood, moss: 0, ground: g0 - 3 }); }
    R.post(Math.sin(a) * rc, Math.cos(a) * rc, 0.52, yF, 1.8, { stand: false });
  }
  // a rug; a picture that will not hang on a round wall, leaning on the floor; the stove under its pipe
  B.add(new THREE.CircleGeometry(1.0, 14).rotateX(-Math.PI / 2), ch(M, 0.1 * side, yF + 0.012, 0.25), { color: worn(L.cloth[2], rng, 0.2), moss: 0, ground: g0 - 3 });
  B.add(new THREE.RingGeometry(0.55, 0.72, 14).rotateX(-Math.PI / 2), ch(M, 0.1 * side, yF + 0.02, 0.25), { color: worn(L.cloth[1], rng, 0.1), moss: 0, ground: g0 - 3 });
  {
    const a = -side * 2.3, rp = ri - 0.2, m = ch(M, Math.sin(a) * rp, yF, Math.cos(a) * rp, -0.22, a + Math.PI, 0);
    B.add(B.box(0.74, 0.6, 0.04, { seg: 9 }), ch(m, 0, 0.3, 0), { color: L.gilt.clone().multiplyScalar(0.7), moss: 0, ground: g0 - 3 });
    B.add(B.box(0.58, 0.44, 0.02, { seg: 9 }), ch(m, 0, 0.3, 0.02), { color: new THREE.Color('#3a2a3c'), moss: 0, ground: g0 - 3 });
    B.add(B.cyl(0.11, 0.11, 0.012, 10, 1), ch(m, 0.08, 0.26, 0.032, Math.PI / 2, 0, 0), { color: new THREE.Color('#c2401a'), moss: 0, ground: g0 - 3, emit: [0.5, 0.12, 0.03, 1] }); // a sun, painted
  }
  {
    const a = side * 2.55, rs = ri - 0.5, x = Math.sin(a) * rs, z = Math.cos(a) * rs;
    B.add(B.cyl(0.26, 0.3, 0.75, 8, 1), ch(M, x, yF + 0.375, z), { color: L.iron, iron: 0.5, moss: 0, ground: g0 - 3 });
    B.add(B.box(0.2, 0.14, 0.02, { seg: 9 }), ch(M, x - Math.sin(a) * 0.29, yF + 0.3, z - Math.cos(a) * 0.29, 0, a, 0), { color: V.soot, moss: 0, ground: g0 - 3, emit: [...V.ember, 1] });
    beam(B, M, [x, yF + 0.75, z], [x, sC - sink + 0.02, z], 0.14, { color: L.iron, iron: 0.5, moss: 0, ground: g0 - 3, round: 6 });
    R.post(x, z, 0.34, yF, 0.8, { stand: false });
  }
  // a flask of the noon it was made to carry, hung from the loft: the room's light
  beam(B, M, [0, sC - sink, 0], [0, yF + 2.15, 0], 0.02, { color: V.rope, moss: 0, ground: g0 - 3 });
  B.add(new THREE.SphereGeometry(0.13, 8, 6), ch(M, 0, yF + 2.05, 0, 0, 0, 0, 1, 1.25, 1), { color: N.milk, moss: 0, ground: g0 - 3, emit: [N.light[0] * 2.4, N.light[1] * 2.4, N.light[2] * 2.4, 1] });
  R.light(0, yF + 1.95, 0, N.lightHex, 2.2 * lit + 0.6, 11);
  if (!low) pot(B, M, -side * 0.9, yF, dzh - 0.75, 0.2, worn(L.tile[4], rng, 0.3), 2.2);
  R.tris = B.triangles - base; R.form = form; R.top = Lh - sink;
  return R;
}
