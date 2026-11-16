// A shop in a Heliarch undercroft (v15-V1): a wall of exact coursed ashlar a metre thick with one round arch let
// into it, voussoirs and a keystone under the sign, a hexagonal pilaster either side, the old bronze still in the
// jambs. The Late folk have walled the arch up a metre in, crooked, and made it a shop: a counter that is one leaf of
// the arch's own bronze-bound door laid flat on two plaster piers, a shutter propped over it, a narrow door beside
// it, an awning under the arch's head, a hanging sign. In the Lees it is let into a riser; alone it is a vault whose
// building is gone, three column stumps on its top and somebody's washing between them.
// o: seed, w (8), d (6), shop (false: a byre, the arch closed with a plank gate), low.
import * as THREE from 'three';
import { L, H, V, PARTS, rngOf, pick, ch, worn, site, facade, plate, beam, pot, leaf, stop, washing, hangSign } from './kit.js';
import { shopfront } from './late.js';

export function undercroft(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 2), w = o.w ?? 8, d = o.d ?? 6, low = !!o.low, g0 = M.elements[13];
  const R = site(M, 'undercroft', { seed, w, d }), base = B.triangles;
  const W = w - 0.5, aw = 2.9 + rng() * 0.7, sp = 1.5 + rng() * 0.3, th = 1.0, zf = d / 2 - 0.35, zb = -d / 2 + 0.2;
  const h = sp + aw / 2 + 1.75 + rng() * 0.5, side = rng() < 0.5 ? -1 : 1, shop = o.shop !== false;
  const st = (k = 0.05) => ({ color: worn(H.stone, rng, k, 0.06), course: 0.42, moss: 0.4, ground: g0 });
  // the wall and its arch; the vault's sides, back and top behind it
  facade(B, ch(M, 0, 0, zf - th / 2), { w: W, h, d: th, openings: [{ kind: 'round', x: 0, y: 0, w: aw, sp }], n: low ? 10 : 16, ...st() });
  for (const sx of [-1, 1]) B.add(B.box(0.8, h + 0.48, zf - th - zb + 0.06, { seg: 2.5, chip: 0.04 }), ch(M, sx * (W / 2 - 0.42), (h - 0.52) / 2, (zb + zf - th) / 2 + 0.03), st());
  B.add(B.box(W - 0.04, h + 0.48, 0.8, { seg: 2.5, chip: 0.04 }), ch(M, 0, (h - 0.52) / 2, zb + 0.4), st());
  B.add(B.box(W - 0.06, 0.6, zf - th - zb, { seg: 2.5 }), ch(M, 0, h - 0.32, (zb + zf - th) / 2), st(0.12));
  // the cornice: two fillets and a cut line, exact; a plinth course either side of the arch
  B.add(B.box(W + 0.36, 0.2, 0.34, { seg: 2.5, chip: 0.03 }), ch(M, 0, h - 0.1, zf + 0.1), st());
  B.add(B.box(W + 0.18, 0.12, 0.2, { seg: 2.5 }), ch(M, 0, h - 0.27, zf + 0.06), { ...st(), color: H.dark });
  B.add(B.box(W + 0.02, 0.03, 0.03, { seg: 9 }), ch(M, 0, h - 0.42, zf + 0.012), { color: H.cut, moss: 0, ground: g0 });
  const pw = (W - aw) / 2 - 0.14;
  for (const sx of [-1, 1]) B.add(B.box(pw, 0.46, 0.2, { seg: 2.5, chip: 0.03 }), ch(M, sx * (aw / 2 + 0.14 + pw / 2), 0.17, zf + 0.07), { ...st(), color: H.dark });
  // voussoirs, alternately a tone darker, the keystone taller, with a bronze hexagon
  const nv = low ? 9 : 11, r1 = aw / 2 - 0.012, r2 = r1 + 0.5;
  for (let i = 0; i < nv; i++) {
    const a0 = (i / nv) * Math.PI, a1 = ((i + 1) / nv) * Math.PI, key = i === (nv - 1) / 2, ro = key ? r2 + 0.22 : r2, pts = [];
    for (const [a, r] of [[a0, r1], [(a0 + a1) / 2, r1], [a1, r1], [a1, ro], [(a0 + a1) / 2, ro + (key ? 0 : 0.012)], [a0, ro]]) pts.push([Math.cos(a) * r, sp + Math.sin(a) * r]);
    plate(B, ch(M, 0, 0, zf + 0.035), pts, key ? 0.16 : 0.09, { color: worn(i % 2 ? H.stone : H.dark, rng, 0.04, 0.05), moss: 0.3, ground: g0, course: 0 });
  }
  B.add(B.cyl(0.13, 0.13, 0.03, 6, 1), ch(M, 0, sp + r2 - 0.05, zf + 0.125, Math.PI / 2, 0, 0), { color: H.bronze, moss: 0, ground: g0 });
  for (const sx of [-1, 1]) B.add(B.box(0.62, 0.2, th + 0.16, { seg: 9, chip: 0.02 }), ch(M, sx * (aw / 2 + 0.22), sp - 0.1, zf - th / 2 + 0.05), { ...st(), color: H.dark }); // the imposts
  // the sign over the key, as the Heliarchy cut it
  PARTS.heliarch.roundel(B, ch(M, 0, sp + r2 + 0.42, zf + 0.06), { size: 0.8, disc: 'bronze' });
  // the old bronze in the jambs: a strip up each and the pintles the leaves hung on, gone green
  for (const sx of [-1, 1]) {
    B.add(B.box(0.04, sp - 0.1, 0.14, { seg: 9 }), ch(M, sx * (aw / 2 - 0.015), sp / 2 + 0.05, zf - 0.3), { color: H.bronze, moss: 0, ground: g0 });
    for (const y of [0.45, sp * 0.55, sp - 0.25]) B.add(B.box(0.16, 0.1, 0.1, { seg: 9 }), ch(M, sx * (aw / 2 - 0.07), y, zf - 0.3), { color: H.bronzeDark, moss: 0, ground: g0 });
  }
  // pilasters: hexagonal drums to a capital; one stands whole, the other is down to two drums under a Late jar,
  // and its capital lies at the foot for a stool
  const px = W / 2 - 0.5, ph = h - 0.55, nd = Math.floor((ph - 0.62) / 0.86);
  for (const sx of [-1, 1]) {
    const broke = sx === side, n = broke ? 2 : nd;
    for (let i = 0; i < n; i++) PARTS.heliarch.drum(B, ch(M, sx * px, i * (ph - 0.62) / nd, zf + 0.2), { r: 0.34, h: (ph - 0.62) / nd, turn: rng() * 0.2, moss: 0.4 });
    if (!broke) PARTS.heliarch.capital(B, ch(M, sx * px, ph - 0.62, zf + 0.2), { r: 0.34 });
    else {
      pot(B, M, sx * px, 2 * (ph - 0.62) / nd, zf + 0.2, 0.26, worn(L.tile[0], rng, 0.35), 2);
      PARTS.heliarch.capital(B, ch(M, sx * (px - 0.2), 0.62, zf + 1.3, Math.PI, rng(), 0.08), { r: 0.34 });
      R.post(sx * (px - 0.2), zf + 1.3, 0.5, 0, 0.62);
    }
    R.post(sx * px, zf + 0.2, 0.36, 0, 2, { stand: false });
  }
  // the Late infill, a metre in under the arch: plaster, off true, with its own small openings
  const zi = zf - th + 0.08, wash = worn(L.plaster[rng() < 0.6 ? 0 : 3], rng, 0.26), ai = Math.floor(rng() * 4), paint = L.paint[ai];
  if (shop) {
    const sx0 = side * (aw / 2 - 1.12), dx0 = -side * (aw / 2 - 0.62), op = { shop: true, kind: 'rect', x: sx0, y: 0.98, w: 1.45, sp: 1.0 }, dop = { kind: 'rect', x: dx0, y: 0, w: 0.72, sp: 1.85 };
    const vent = { kind: 'ogee', x: (rng() - 0.5) * 0.5, y: sp + aw * 0.14, w: 0.4, sp: 0.3 };
    facade(B, ch(M, 0, 0, zi - 0.18), { w: aw + 0.5, d: 0.36, top: [[aw / 2 + 0.25, sp + 0.6], [0.3, sp + aw / 2 + 0.25], [-0.3, sp + aw / 2 + 0.25], [-aw / 2 - 0.25, sp + 0.6]], openings: [op, dop, vent], color: wash, moss: 0.2, ground: g0, n: 6 });
    leaf(B, ch(M, dx0, 0, zi - 0.26), 0.9, 1.95, worn(paint, rng, 0.22), rng, { plain: low });
    stop(B, ch(M, vent.x, vent.y, zi - 0.18), 0.4, 0.5, 'lit', rng);
    R.window(vent.x, vent.y + 0.25, zi, true);
    shopfront(B, M, R, op, zi, rng, { paint, low, awning: false, sign: false, counter: false });
    // the counter: a leaf of the arch's door, bronze-bound, laid flat on two piers
    const cl = 1.95, cz = zi + 0.62, ctop = 0.98;
    for (const s of [-1, 1]) B.add(B.box(0.3, ctop - 0.16 + 0.4, 0.7, { seg: 9, chip: 0.03 }), ch(M, sx0 + s * 0.62, (ctop - 0.16 - 0.4) / 2, cz), { color: worn(wash, rng, 0.08), moss: 0.25, ground: g0 });
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
    PARTS.heliarch.slab(B, ch(M, sx0 - cl / 2, ctop - 0.08, cz).multiply(basis), { w: 0.86, h: cl, d: 0.16 });
    R.counter(sx0, ctop, cz + 0.45, cl);
    R.wall(sx0 - cl / 2 + 0.4, cz, sx0 + cl / 2 - 0.4, cz, 0, ctop, 0.42);
    R.door(dx0, zf + 0.5, { w: 0.72 });
    // the awning under the arch's head, on two poles out in the street; the sign on its arm from the wall
    const ah = sp + 0.5, awn = Math.min(aw - 0.3, 2 * Math.sqrt(Math.max(0.1, (aw / 2) ** 2 - 0.55 ** 2)) - 0.25);
    PARTS.late.awning(B, ch(M, 0, 0, zf - 0.25), { w: awn, d: 1.75, h: ah, rng });
    for (const s of [-1, 1]) R.post(s * (awn / 2 - 0.05), zf + 1.5, 0.07, 0, 2.2, { stand: false });
    hangSign(B, ch(M, -side * (aw / 2 + 0.62), sp + 1.25, zf), rng, { size: low ? 0.42 : 0.5 });
  } else {
    // a byre: the arch closed with a plank gate, a wicket in it, a pane lit over it
    facade(B, ch(M, 0, 0, zi - 0.18), { w: aw + 0.5, d: 0.36, top: [[aw / 2 + 0.25, sp + 0.6], [0.3, sp + aw / 2 + 0.25], [-0.3, sp + aw / 2 + 0.25], [-aw / 2 - 0.25, sp + 0.6]], openings: [{ kind: 'rect', x: 0, y: 0, w: aw - 0.7, sp: sp + 0.25 }], color: wash, moss: 0.2, ground: g0 });
    for (const s of [-1, 1]) leaf(B, ch(M, s * (aw - 0.7) / 4, 0, zi - 0.24, 0, s * 0.05, 0), (aw - 0.7) / 2 + 0.1, sp + 0.35, worn(L.wood, rng, 0.1), rng);
    R.door(0, zf + 0.5, { w: aw - 0.7 });
  }
  R.wall(-aw / 2, zi - 0.2, aw / 2, zi - 0.2, 0, h, 0.2);
  // on its top: stumps of the storey that is gone, and the washing
  const tops = [];
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * (W / 2 - 1.1) + (rng() - 0.5) * 0.3, z = zf - 1.2 - rng() * 0.6, hh = 0.5 + rng() * 1.5, nn = Math.max(1, Math.round(hh / 0.8));
    for (let k = 0; k < nn; k++) PARTS.heliarch.drum(B, ch(M, x, h - 0.03 + k * hh / nn, z), { r: 0.4, h: hh / nn, turn: rng(), moss: 0.5 });
    tops.push([x, h + hh, z]);
  }
  if (!low || seed % 2) { const a = tops[side > 0 ? 0 : 2], b = tops[1]; for (const q of [a, b]) beam(B, M, q, [q[0], Math.max(a[1], b[1]) + 1.2, q[2]], 0.05, { color: L.wood, moss: 0.05, ground: g0 + h, round: 5 }); const y = Math.max(a[1], b[1]) + 1.15; washing(B, M, [a[0], y, a[2]], [b[0], y, b[2]], rng, low ? 2 : 4); }
  // colliders: the vault as walls
  R.wall(-W / 2 + 0.5, zb + 0.5, W / 2 - 0.5, zb + 0.5, 0, h, 0.5);
  for (const sx of [-1, 1]) { R.wall(sx * (W / 2 - 0.5), zb + 0.5, sx * (W / 2 - 0.5), zf - 0.5, 0, h, 0.5); R.wall(sx * (W / 2 - 0.5), zf - 0.5, sx * (aw / 2 + 0.5), zf - 0.5, 0, h, 0.5); }
  R.lamp(side * (aw / 2 + 0.7), sp + 0.9, zf + 0.5);
  PARTS.late.bracket(B, ch(M, side * (aw / 2 + 0.7), sp + 0.9, zf), { reach: 0.5 });
  R.tris = B.triangles - base;
  return R;
}
