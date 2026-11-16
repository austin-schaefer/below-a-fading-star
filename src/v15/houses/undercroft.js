// A shop in a Heliarch undercroft (v15-V1): a wall of exact coursed ashlar a metre thick with a round arch let into
// it, voussoirs and a keystone under the sign, the old bronze still in the jambs, and the Late folk's shop in it.
// Three forms, three silhouettes:
//   'single'  a vault whose building is gone, one arch, a hexagonal pilaster either side where there is room. The
//             Late folk have walled the arch up a metre in, crooked: a counter that is one leaf of the arch's own
//             bronze-bound door laid flat on two plaster piers, a narrow door beside it. On its top, stumps of the
//             storey that is gone and somebody's washing, or a Late room built on the vault.
//   'double'  7.6 m of front or more: two arches and the pier between them; one is the shop, open-mouthed, the
//             other a byre behind a plank gate.
//   'riser'   let into a giant step: no vault of its own shows, only the face (o.riser m tall, its top the tread
//             above) with one squat arch half drowned in the bench's fill, and the shop in its mouth: a counter
//             across it with a way round its end, shelves and a lamp in the dark behind. With o.fit the Heliarch
//             work is left out altogether (src/v15/ways/misc.js undercroft has drawn the vault and its front; the
//             arch is sized as that one is, from w and the riser, or as o.arch { aw, sp } says) and only the Late
//             folk's fitting is added. Where the riser's face is at the plot's back (the Strake's shop: 5 m of
//             bench before the arch) the plot is the shop's forecourt: yard walls down its sides, the counter
//             out at the street under a cloth, a gate beside it, the store's jars and sacks, the arch the storeroom.
// o: seed, w (8), d (6), form, shop (false: a byre, the arch closed with a plank gate), h (a free vault's height, to
// meet something), riser (m: the 'riser' form), face (the riser face's local z: d / 2 - 2), fit, top ('stumps' |
// 'hut'), low. Needs 3.6 x 2.4; less throws.
import * as THREE from 'three';
import { L, H, V, PARTS, rngOf, pick, ch, worn, site, facade, plate, beam, pot, leaf, stop, washing, hangSign, dirty, niche, awning } from './kit.js';
import { shopfront, room } from './late.js';

export const UNDER_FORMS = ['single', 'double', 'riser'];

export function undercroft(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 2), w = o.w ?? 8, d = o.d ?? 6, low = !!o.low, g0 = M.elements[13];
  if (w < 3.6 || d < 2.4) throw new Error(`undercroft: a plot ${w} x ${d} m is too small (3.6 x 2.4)`);
  const form = o.riser ? 'riser' : o.form && o.form !== 'riser' ? (o.form === 'double' && w < 7.6 ? 'single' : o.form) : w >= 7.6 && seed % 3 === 1 ? 'double' : 'single';
  const R = site(M, 'undercroft', { seed, w, d }), base = B.triangles; R.form = form;
  const side = rng() < 0.5 ? -1 : 1, shop = o.shop !== false, riser = form === 'riser';
  const st = (k = 0.05) => ({ color: worn(H.stone, rng, k, 0.06), course: 0.42, moss: 0.4, ground: g0 });
  const wash = worn(L.plaster[rng() < 0.6 ? 0 : 3], rng, 0.12), ai = Math.floor(rng() * 4), paint = L.paint[ai];
  // the front's width and height, the wall's thickness, its face, and the arches: [{ x, aw, sp }]
  let W, h, th, zf, zb, arches;
  if (riser) {
    // as src/v15/ways/misc.js sizes it: the vault a metre narrower than the plot, the arch under the tread's slab
    W = w - 1; h = o.riser; th = 0.5; zf = o.face ?? d / 2 - 2; zb = zf - (o.fit ? 3.2 : Math.max(1, Math.min(3.2, zf + d / 2 - 0.1)));
    const rad = Math.min(W / 2 - 0.25, h - 0.42 - 1.0);
    arches = [o.arch ? { x: 0, aw: o.arch.aw, sp: o.arch.sp } : { x: 0, aw: rad * 2, sp: h - 0.52 - rad }];
  } else {
    W = w - 0.5; th = 1.0; zf = d / 2 - 0.35; zb = -d / 2 + 0.2;
    if (form === 'double') { const aw = Math.min(2.5 + rng() * 0.4, (W - 2.5) / 2), sp = 1.5 + rng() * 0.3, off = aw / 2 + 0.5; arches = [{ x: -off, aw, sp }, { x: off, aw, sp }]; }
    else arches = [{ x: 0, aw: Math.min(2.9 + rng() * 0.7, W - 1.0), sp: 1.5 + rng() * 0.3 }];
    h = arches[0].sp + arches[0].aw / 2 + 1.75 + rng() * 0.5;
    if (o.h !== undefined && o.h < h) { h = o.h; for (const a of arches) a.sp = Math.max(0.5, h - 1.0 - a.aw / 2); }
  }
  const aw0 = arches[0].aw, sp = arches[0].sp, xa0 = arches[0].x - aw0 / 2, xa1 = arches[arches.length - 1].x + aw0 / 2;
  const ts = Math.max(0.35, Math.min(0.8, W / 2 - xa1 - 0.12)); // the vault's side walls: never in an arch's way
  if (!o.fit) {
    facade(B, ch(M, 0, 0, zf - th / 2), { w: W, h, d: th, openings: arches.map((a) => ({ kind: 'round', x: a.x, y: 0, w: a.aw, sp: a.sp })), n: low ? 10 : 16, ...st() });
    if (!riser) {
      // the vault behind it: the back, the sides between back and front, the top (no two of them in one plane)
      B.add(B.box(W, h + 0.48, 0.8, { seg: 2.5, chip: 0.04 }), ch(M, 0, (h - 0.52) / 2, zb + 0.4), st());
      for (const sx of [-1, 1]) B.add(B.box(ts, h + 0.44, zf - th - zb - 0.74, { seg: 2.5, chip: 0.04 }), ch(M, sx * (W / 2 - ts / 2 - 0.03), (h - 0.52) / 2 - 0.02, (zb + 0.8 + zf - th) / 2 - 0.03), st());
      B.add(B.box(W - 0.1, 0.5, zf - th - zb - 0.7, { seg: 2.5 }), ch(M, 0, h - 0.31, (zb + 0.8 + zf - th) / 2 - 0.05), st(0.12));
      // the cornice: two fillets and a cut line, exact
      B.add(B.box(W + 0.36, 0.2, 0.34, { seg: 2.5, chip: 0.03 }), ch(M, 0, h - 0.1, zf + 0.1), st());
      B.add(B.box(W + 0.18, 0.12, 0.2, { seg: 2.5 }), ch(M, 0, h - 0.27, zf + 0.06), { ...st(), color: H.dark });
      B.add(B.box(W + 0.02, 0.03, 0.03, { seg: 9 }), ch(M, 0, h - 0.42, zf + 0.012), { color: H.cut, moss: 0, ground: g0 });
    } else {
      // the room behind the arch, seen through it: dark, and warm at the back
      const k = 0.16;
      niche(B, ch(M, 0, 0.0, zf - th + 0.01), W, sp + aw0 / 2 + 0.03, zf - th - zb, { color: worn(H.stone, rng, 0.1).multiplyScalar(0.7), course: 0.42, moss: 0.2, ground: g0 - 1 }, { color: worn(H.stone, rng, 0.1).multiplyScalar(0.7), course: 0.42, moss: 0.1, ground: g0 - 1, emit: [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] });
      R.wall(-W / 2 - 0.2, zb - 0.2, W / 2 + 0.2, zb - 0.2, 0, h, 0.25); for (const sx of [-1, 1]) R.wall(sx * (W / 2 + 0.2), zb, sx * (W / 2 + 0.2), zf - th, 0, h, 0.25);
    }
    for (const a of arches) {
      // voussoirs, alternately a tone darker, the keystone taller, with a bronze hexagon
      const nv = low ? 9 : 11, r1 = a.aw / 2 - 0.012, ring = riser ? 0.34 : 0.5, r2 = r1 + ring;
      for (let i = 0; i < nv; i++) {
        const a0 = (i / nv) * Math.PI, a1 = ((i + 1) / nv) * Math.PI, key = i === (nv - 1) / 2, ro = key ? Math.min(r2 + 0.22, h - a.sp - 0.04) : r2, pts = [];
        for (const [an, r] of [[a0, r1], [(a0 + a1) / 2, r1], [a1, r1], [a1, ro], [(a0 + a1) / 2, ro + (key ? 0 : 0.012)], [a0, ro]]) pts.push([Math.cos(an) * r, a.sp + Math.sin(an) * r]);
        plate(B, ch(M, a.x, 0, zf + 0.035), pts, key ? 0.16 : 0.09, { color: worn(i % 2 ? H.stone : H.dark, rng, 0.04, 0.05), moss: 0.3, ground: g0, course: 0 });
      }
      B.add(B.cyl(0.13, 0.13, 0.03, 6, 1), ch(M, a.x, a.sp + r2 - 0.05 - (riser ? 0.1 : 0), zf + 0.125, Math.PI / 2, 0, 0), { color: H.bronze, moss: 0, ground: g0 });
      for (const sx of [-1, 1]) B.add(B.box(0.62, 0.2, th + 0.16, { seg: 9, chip: 0.02 }), ch(M, a.x + sx * (a.aw / 2 + 0.22), a.sp - 0.1, zf - th / 2 + 0.05), { ...st(), color: H.dark }); // the imposts
      // the old bronze in the jambs: a strip up each and the pintles the leaves hung on, gone green
      for (const sx of [-1, 1]) {
        B.add(B.box(0.04, a.sp - 0.1, 0.14, { seg: 9 }), ch(M, a.x + sx * (a.aw / 2 - 0.015), a.sp / 2 + 0.05, zf - 0.3), { color: H.bronze, moss: 0, ground: g0 });
        for (const y of [0.45, a.sp * 0.55, a.sp - 0.25]) if (y > 0.3 && y < a.sp) B.add(B.box(0.16, 0.1, 0.1, { seg: 9 }), ch(M, a.x + sx * (a.aw / 2 - 0.07), y, zf - 0.3), { color: H.bronzeDark, moss: 0, ground: g0 });
      }
    }
    // the sign, as the Heliarchy cut it: over a single arch's key, over the pier between two
    if (!riser) PARTS.heliarch.roundel(B, ch(M, 0, sp + (form === 'double' ? aw0 * 0.3 : aw0 / 2 + 0.5 + 0.42), zf + 0.06), { size: 0.8, disc: 'bronze' });
    if (!riser) {
      // a plinth course either side of the arches; pilasters where the wall has the width for them: hexagonal drums
      // to a capital; one stands whole, the other is down to two drums under a Late jar, its capital at the foot
      const pw = (W / 2 + xa0) - 0.14;
      if (pw > 0.25) for (const sx of [-1, 1]) B.add(B.box(pw, 0.46, 0.2, { seg: 2.5, chip: 0.03 }), ch(M, sx * (W / 2 - pw / 2), 0.17, zf + 0.07), { ...st(), color: H.dark });
      const px = W / 2 - 0.5, ph = h - 0.55, nd = Math.max(1, Math.floor((ph - 0.62) / 0.86));
      if (px - 0.36 >= xa1 + 0.52) for (const sx of [-1, 1]) {
        const broke = sx === side, n = broke ? Math.min(2, nd) : nd;
        for (let i = 0; i < n; i++) PARTS.heliarch.drum(B, ch(M, sx * px, i * (ph - 0.62) / nd, zf + 0.2), { r: 0.34, h: (ph - 0.62) / nd, turn: rng() * 0.2, moss: 0.4 });
        if (!broke) PARTS.heliarch.capital(B, ch(M, sx * px, ph - 0.62, zf + 0.2), { r: 0.34 });
        else {
          pot(B, M, sx * px, n * (ph - 0.62) / nd, zf + 0.2, 0.26, worn(L.tile[0], rng, 0.35), 2);
          PARTS.heliarch.capital(B, ch(M, sx * (px - 0.2), -0.02, zf + 1.3, 0.05, rng(), 0.04), { r: 0.34 });
          R.post(sx * (px - 0.2), zf + 1.3, 0.5, 0, 0.62);
        }
        R.post(sx * px, zf + 0.2, 0.36, 0, 2, { stand: false });
      }
    }
  }
  // ---- the Late folk's fittings
  const zi = zf - th + 0.08;
  // a shop in an arch's mouth, nothing walled up: the counter across it at the wall's face with a way round its end,
  // shelves and sacks in the dark behind, a cloth on poles before it
  const mouth = (a, s2, bare) => {
    const cl = a.aw - 1.3, cx = a.x - s2 * (a.aw / 2 - cl / 2 - 0.05), cz = zf - th / 2, ctop = 0.96; // (1.25 m left at its end: a walker is 0.9 wide)
    if (!bare) for (const s of [-1, 1]) B.add(B.box(0.3, ctop - 0.16 + 0.4, 0.6, { seg: 9, chip: 0.03 }), ch(M, cx + s * (cl / 2 - 0.3), (ctop - 0.16 - 0.4) / 2, cz), { color: worn(wash, rng, 0.08), moss: 0.12, ground: g0 });
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
    if (!bare) { PARTS.heliarch.slab(B, ch(M, cx - cl / 2, ctop - 0.08, cz).multiply(basis), { w: 0.8, h: cl, d: 0.16 });
      R.counter(cx, ctop, cz + 0.42, cl); R.wall(cx - cl / 2 + 0.36, cz, cx + cl / 2 - 0.36, cz, 0, ctop, 0.36);
      R.door(a.x + s2 * (a.aw / 2 - 0.62), zf + 0.6, { w: 1.2, enter: true }); }
    // inside: a rack of shelves along the back with jars on it, two sacks, a lamp over the counter
    const zr = Math.max(zb + (riser ? 0.2 : 0.95), cz - 2.6), rw = Math.min(a.aw - 0.4, 2.2), wood = { color: L.wood, moss: 0, ground: g0 - 2 };
    for (const sx of [-1, 1]) beam(B, M, [a.x + sx * rw / 2, 0, zr], [a.x + sx * rw / 2, Math.min(1.9, a.sp + 0.5), zr], 0.06, wood);
    for (const y of [0.55, 1.05, 1.55]) if (y < a.sp + 0.3) { B.add(B.box(rw + 0.1, 0.035, 0.3, { seg: 9 }), ch(M, a.x, y, zr + 0.1), wood); R.shelf(a.x, y + 0.02, zr + 0.1, rw, 0.3); for (let i = 0; i < (low ? 1 : 3); i++) pot(B, M, a.x - rw / 2 + 0.25 + rng() * (rw - 0.5), y + 0.018, zr + 0.1, 0.08 + rng() * 0.06, worn(pick([L.tile[0], V.mud, L.tile[4], L.plaster[1]], rng), rng, 0.3), 1.5 + rng(), 6); }
    R.wall(a.x - rw / 2, zr + 0.1, a.x + rw / 2, zr + 0.1, 0, 1.7, 0.2);
    for (let i = 0; i < 2; i++) { const sx2 = a.x - s2 * (a.aw / 2 - 0.55 - i * 0.2), sz2 = cz - 0.9 - i * 0.6; B.add(new THREE.IcosahedronGeometry(0.3, 1), ch(M, sx2, 0.22, sz2, 0, rng() * 3, 0, 1, 0.8, 1.15), { color: worn(V.linen, rng, 0.3), moss: 0, ground: g0 - 2, disp: 0.03 }); R.post(sx2, sz2, 0.3, 0, 0.45); }
    R.light(a.x, Math.min(1.9, a.sp + a.aw * 0.3), cz - 0.9, '#ffb060', 1.6, 7);
    B.add(new THREE.IcosahedronGeometry(0.07, 0), ch(M, a.x, Math.min(1.95, a.sp + a.aw * 0.32), cz - 0.6, 0, 0, 0, 1, 1.3, 1), { color: new THREE.Color('#201008'), moss: 0, ground: g0 - 3, emit: [V.lit[0] * 0.8, V.lit[1] * 0.8, V.lit[2] * 0.8, 1] });
    beam(B, M, [a.x, Math.min(2.0, a.sp + a.aw * 0.32) + 0.06, cz - 0.6], [a.x, a.sp + Math.sqrt(Math.max(0.01, (a.aw / 2) ** 2 - 0.36)) - 0.02, cz - 0.6], 0.012, { color: L.iron, iron: 1, moss: 0, ground: g0 - 3 });
    R.window(a.x, a.sp, zf, true);
    if (bare) return;
    const af = B.count, ah = Math.min(h - 0.3, a.sp + a.aw / 2 + 0.55);
    awning(B, ch(M, a.x, 0, zf + 0.02), { w: a.aw + 0.5, d: 1.55, h: ah, drop: Math.min(0.5, ah - 1.95), rng });
    for (const s of [-1, 1]) R.post(a.x + s * (a.aw / 2 + 0.2), zf + 1.55, 0.07, 0, 2.0, { stand: false });
    hangSign(B, ch(M, a.x - s2 * (a.aw / 2 + 0.5), Math.min(h - 0.25, a.sp + 1.25), zf), rng, { size: low ? 0.42 : 0.5 });
    dirty(B, af, 0.2, rng);
  };
  // the arch walled up a metre in, crooked, with the shop's hole and a narrow door in the infill
  const infill = (a) => {
    const top = [[a.aw / 2 + 0.25, a.sp + 0.6], [0.3, a.sp + a.aw / 2 + 0.25], [-0.3, a.sp + a.aw / 2 + 0.25], [-a.aw / 2 - 0.25, a.sp + 0.6]];
    const sx0 = side * (a.aw / 2 - 1.12), dx0 = -side * (a.aw / 2 - 0.62), op = { shop: true, kind: 'rect', x: sx0, y: 0.98, w: 1.45, sp: 1.0 }, dop = { kind: 'rect', x: dx0, y: 0.02, w: 0.72, sp: 1.83 };
    const vent = { kind: 'ogee', x: (rng() - 0.5) * 0.5, y: a.sp + a.aw * 0.14, w: 0.4, sp: 0.3 };
    facade(B, ch(M, a.x, 0, zi - 0.18), { w: a.aw + 0.5, d: 0.36, sink: 0.3, top, openings: [op, dop, vent], color: wash, moss: 0.08, ground: g0, n: 6 });
    leaf(B, ch(M, a.x + dx0, 0, zi - 0.26), 0.9, 1.95, worn(paint, rng, 0.22), rng, { plain: low });
    stop(B, ch(M, a.x + vent.x, vent.y, zi - 0.18), 0.4, 0.5, 'lit', rng);
    R.window(a.x + vent.x, vent.y + 0.25, zi, true);
    shopfront(B, M, R, { ...op, x: a.x + sx0 }, zi, rng, { paint, low, awning: false, sign: false, counter: false });
    // the counter: a leaf of the arch's door, bronze-bound, laid flat on two piers
    const cl = 1.95, cz = zi + 0.62, ctop = 0.98;
    for (const s of [-1, 1]) B.add(B.box(0.3, ctop - 0.16 + 0.4, 0.7, { seg: 9, chip: 0.03 }), ch(M, a.x + sx0 + s * 0.62, (ctop - 0.16 - 0.4) / 2, cz), { color: worn(wash, rng, 0.08), moss: 0.12, ground: g0 });
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
    PARTS.heliarch.slab(B, ch(M, a.x + sx0 - cl / 2, ctop - 0.08, cz).multiply(basis), { w: 0.86, h: cl, d: 0.16 });
    R.counter(a.x + sx0, ctop, cz + 0.45, cl);
    R.wall(a.x + sx0 - cl / 2 + 0.4, cz, a.x + sx0 + cl / 2 - 0.4, cz, 0, ctop, 0.42);
    R.door(a.x + dx0, zf + 0.5, { w: 0.72 });
    R.wall(a.x - a.aw / 2, zi - 0.2, a.x + a.aw / 2, zi - 0.2, 0, h, 0.2);
    // the cloth under the arch's head, on two poles out in the street; the sign on its arm from the wall
    const ah = Math.max(a.sp + 0.5, 2.45), awn = Math.min(a.aw - 0.3, 2 * Math.sqrt(Math.max(0.1, (a.aw / 2) ** 2 - 0.55 ** 2)) - 0.25), af = B.count;
    awning(B, ch(M, a.x, 0, zf - 0.25), { w: awn, d: 1.75, h: ah, drop: 0.3, rng });
    for (const s of [-1, 1]) R.post(a.x + s * (awn / 2 - 0.05), zf + 1.5, 0.07, 0, 2.0, { stand: false });
    hangSign(B, ch(M, a.x - side * (a.aw / 2 + 0.62), a.sp + 1.25, zf), rng, { size: low ? 0.42 : 0.5 });
    dirty(B, af, 0.2, rng);
  };
  // a byre: the arch closed with a plank gate, crooked
  const gate = (a) => {
    facade(B, ch(M, a.x, 0, zi - 0.18), { w: a.aw + 0.5, d: 0.36, top: [[a.aw / 2 + 0.25, a.sp + 0.6], [0.3, a.sp + a.aw / 2 + 0.25], [-0.3, a.sp + a.aw / 2 + 0.25], [-a.aw / 2 - 0.25, a.sp + 0.6]], openings: [{ kind: 'rect', x: 0, y: 0, w: a.aw - 0.7, sp: a.sp + 0.25 }], color: wash, moss: 0.08, ground: g0 });
    for (const s of [-1, 1]) leaf(B, ch(M, a.x + s * (a.aw - 0.7) / 4, 0, zi - 0.24, 0, s * 0.05, 0), (a.aw - 0.7) / 2 + 0.1, a.sp + 0.35, worn(L.wood, rng, 0.1), rng);
    R.door(a.x, zf + 0.5, { w: a.aw - 0.7 });
    R.wall(a.x - a.aw / 2, zi - 0.2, a.x + a.aw / 2, zi - 0.2, 0, h, 0.2);
  };
  const court = riser && zf < -d / 2 + 1.5;
  if (riser) mouth(arches[0], side, court);
  else if (form === 'double') { const si = side > 0 ? 1 : 0; mouth(arches[si], side); gate(arches[1 - si]); }
  else if (!shop) gate(arches[0]);
  else if (aw0 >= 2.85) infill(arches[0]);
  else mouth(arches[0], side);
  if (!riser) {
    // on its top: stumps of the storey that is gone and the washing, or a Late room somebody built up there
    const hut = (o.top || (seed % 2 ? 'hut' : 'stumps')) === 'hut' && W >= 4.4 && zf - zb >= 3.4;
    R.top = h; R.variant = hut ? 'hut' : 'stumps';
    if (hut) {
      const hw2 = Math.min(3.4, W - 1.3) + rng() * Math.min(0.8, W - 4.4), hx0 = side > 0 ? -W / 2 + 0.3 : W / 2 - 0.3 - hw2, hh = 2.1 + rng() * 0.4, hzf = zf - 0.5 - rng() * 0.4, hzb = Math.max(zb + 0.3, hzf - 3.2);
      const HM = ch(M, 0, h - 0.02, 0), rec = { door: () => {}, window: (x, y, z, lit) => R.window(x, y + h, z, lit), wall: () => {} };
      room(B, HM, rec, { x0: hx0, x1: hx0 + hw2, zb: hzb, zf: hzf, h: hh, rng, g0: g0 + h, color: wash, low, patches: 2, openings: [{ kind: 'ogee', x: hx0 + hw2 / 2 + (rng() - 0.5) * 0.8, y: 0.85, w: 0.5, sp: 0.6, paint, stop: 'lit', one: side }], par: { f: 0.2, b: 0.2, l: 0.2, r: 0.2 } });
      const cx2 = hx0 + hw2 / 2 + side * 0.7, hc = 0.9 + rng() * 0.5;
      B.add(B.box(0.4, hc, 0.4, { seg: 9, chip: 0.03 }), ch(HM, cx2, hh + hc / 2 + 0.15, hzb + 0.6), { color: worn(wash, rng, 0.2), moss: 0.1, ground: g0 + h });
      R.chimney = R.W(cx2, h + hh + hc + 0.2, hzb + 0.6); R.top = h + hh + hc + 0.15;
      // one stump left beside it, a jar on it
      const sx2 = -side * (W / 2 - 0.9); PARTS.heliarch.drum(B, ch(M, sx2, h - 0.03, zf - 1.1), { r: 0.4, h: 0.8, turn: rng(), moss: 0.5 }); pot(B, M, sx2, h + 0.77, zf - 1.1, 0.22, worn(L.tile[4], rng, 0.35), 2);
    } else {
      const tops = [];
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * (W / 2 - 1.1) + (rng() - 0.5) * 0.3, z = Math.max(zb + 1, zf - 1.2 - rng() * 0.6), hh = 0.5 + rng() * 1.9, nn = Math.max(1, Math.round(hh / 0.8));
        for (let k = 0; k < nn; k++) PARTS.heliarch.drum(B, ch(M, x, h - 0.03 + k * hh / nn, z), { r: 0.4, h: hh / nn, turn: rng(), moss: 0.5 });
        tops.push([x, h + hh, z]); R.top = Math.max(R.top, h + hh);
      }
      if (!low || seed % 2) { const a = tops[side > 0 ? 0 : 2], b = tops[1]; for (const q of [a, b]) beam(B, M, q, [q[0], Math.max(a[1], b[1]) + 1.2, q[2]], 0.05, { color: L.wood, moss: 0.05, ground: g0 + h, round: 5 }); const y = Math.max(a[1], b[1]) + 1.15; washing(B, M, [a[0], y, a[2]], [b[0], y - 0.12, b[2]], rng, low ? 3 : 6); }
    }
    // colliders: the vault as walls, the front between and beside the arches
    R.wall(-W / 2 + 0.5, zb + 0.5, W / 2 - 0.5, zb + 0.5, 0, h, 0.5);
    for (const sx of [-1, 1]) R.wall(sx * (W / 2 - ts / 2), zb + 0.5, sx * (W / 2 - ts / 2), zf - 0.5, 0, h, ts / 2);
    const edges = [-W / 2, ...arches.flatMap((a) => [a.x - a.aw / 2, a.x + a.aw / 2]), W / 2];
    for (let i = 0; i < edges.length; i += 2) { const a = edges[i], b = edges[i + 1], r = Math.min(0.5, (b - a) / 2); if (b - a > 0.2) R.wall(a + r, zf - 0.5, b - r, zf - 0.5, 0, h, r); }
  } else {
    R.top = h;
    if (!o.fit) for (const [a, b] of [[-W / 2, xa0], [xa1, W / 2]]) if (b - a > 0.2) { const r = Math.min(0.25, (b - a) / 2); R.wall(a + r, zf - 0.25, b - r, zf - 0.25, 0, h, r); }
  }
  if (court) {
    // the forecourt: yard walls of plaster down both sides, stepping down to the street; the counter at the street
    // under a cloth; a gate beside it between two piers; the store's big jars and sacks along the walls
    const zF = d / 2 - 0.3, pl = () => ({ color: worn(wash, rng, 0.06, 0.06), moss: 0.08, ground: g0, disp: 0.015, dispScale: 1.4 });
    for (const sx of [-1, 1]) { const xw = sx * (w / 2 - 0.22), zm = zf + 0.1 + (zF - zf) * (0.4 + rng() * 0.2);
      for (const [za, zb2, hh] of [[zf + 0.08, zm, 1.9 + rng() * 0.4], [zm - 0.02, zF, 1.15 + rng() * 0.25]]) { B.add(B.box(0.34, hh + 0.5, zb2 - za, { seg: 1.5, chip: 0.04, chipTop: true, seed: seed + sx + hh }), ch(M, xw, (hh - 0.5) / 2, (za + zb2) / 2), pl()); R.wall(xw, za + 0.17, xw, zb2 - 0.17, 0, hh, 0.17); } }
    const gx = side * (w / 2 - 1.55), cl = w - 3.6, cxc = -side * (w / 2 - 0.5 - cl / 2), cz = zF - 0.3, ctop = 0.96; // the gate's middle; the counter
    for (const s of [-1, 1]) B.add(B.box(0.34, ctop - 0.16 + 0.4, 0.62, { seg: 9, chip: 0.03 }), ch(M, cxc + s * (cl / 2 - 0.35), (ctop - 0.16 - 0.4) / 2, cz), pl());
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
    PARTS.heliarch.slab(B, ch(M, cxc - cl / 2, ctop - 0.08, cz).multiply(basis), { w: 0.86, h: cl, d: 0.16 });
    R.counter(cxc, ctop, cz + 0.45, cl); R.wall(cxc - cl / 2 + 0.36, cz, cxc + cl / 2 - 0.36, cz, 0, ctop, 0.36);
    for (const s of [-1, 1]) { const px = gx + s * 0.95, ph = 1.55 + rng() * 0.3; B.add(B.box(0.42, ph + 0.5, 0.42, { seg: 1.5, chip: 0.04 }), ch(M, px, (ph - 0.5) / 2, zF - 0.21), pl()); R.post(px, zF - 0.21, 0.22, 0, ph); if (s === side) pot(B, M, px, ph, zF - 0.21, 0.2, worn(L.tile[0], rng, 0.35), 1.9); }
    R.door(gx, zF + 0.5, { w: 1.4, enter: true });
    const af = B.count, ar = cz - 1.5; // the cloth: from a rail on two poles behind the counter to two in the street
    for (const s of [-1, 1]) { beam(B, M, [cxc + s * (cl / 2 - 0.1), -0.15, ar], [cxc + s * (cl / 2 - 0.1), 2.65, ar], 0.08, { color: V.rawWood, moss: 0.08, ground: g0, round: 5 }); R.post(cxc + s * (cl / 2 - 0.1), ar, 0.08); R.post(cxc + s * (cl / 2 + 0.05), ar + 2.2, 0.07, 0, 2, { stand: false }); }
    awning(B, ch(M, cxc, 0, ar), { w: cl + 0.3, d: 2.2, h: 2.6, drop: 0.3, rng });
    hangSign(B, ch(M, gx - side * 0.95, 1.5, zF - 0.02), rng, { size: low ? 0.42 : 0.5, reach: 0.7 });
    dirty(B, af, 0.2, rng);
    PARTS.late.bracket(B, ch(M, gx + side * 0.95, 1.35, zF), { reach: 0.45 }); R.lamp(gx + side * 0.95, 1.37, zF + 0.45);
    // along the walls: the big jars, the sacks, a bench
    const jx = -side * (w / 2 - 0.95);
    for (let i = 0; i < (low ? 2 : 4); i++) { const z = zf + 0.9 + i * 0.85 + rng() * 0.2, r = 0.3 + rng() * 0.12; pot(B, M, jx, 0, z, r, worn(pick([L.tile[0], V.mud, L.tile[4], V.mud], rng), rng, 0.35), 1.9 + rng() * 0.5); R.post(jx, z, r, 0, 0.8); }
    for (let i = 0; i < 3; i++) { const x = side * (w / 2 - 0.85) - side * (i % 2) * 0.5, z = zf + 0.8 + i * 0.5; B.add(new THREE.IcosahedronGeometry(0.32, 1), ch(M, x, 0.2 + (i === 2 ? 0.34 : 0), z - (i === 2 ? 0.25 : 0), 0, rng() * 3, 0, 1, 0.75, 1.15), { color: worn(V.linen, rng, 0.3), moss: 0, ground: g0, disp: 0.03 }); if (i < 2) R.post(x, z, 0.32, 0, 0.5); }
    R.top = Math.max(h, 2.6);
  } else {
    const lx = side * Math.min(W / 2 - 0.2, (form === 'double' ? xa1 : aw0 / 2) + 0.7), ly = Math.min(h - 0.5, sp + 0.9);
    R.lamp(lx, ly, zf + 0.5); PARTS.late.bracket(B, ch(M, lx, ly, zf), { reach: 0.5 });
  }
  R.tris = B.triangles - base;
  return R;
}
