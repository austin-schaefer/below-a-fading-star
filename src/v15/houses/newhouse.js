// The new house, half built (v15-V1): the only new thing in the valley, and made of the oldest thing its masons could
// reach. Its walls are going up in pale fresh-cut ashlar quarried from the keep's fallen corner: every block was a
// Heliarch block, re-cut on five faces, and still carries on its sixth what it was, weathered grey: a pair of fillets,
// a hexagon, a run of fluting, the sign itself, turned whichever way the block went into the wall. The corners are
// raised first and the courses rack back from them; the door has its timber centering up and the first stones of a
// horseshoe arch on it, a Late arch in new stone. Raw pole scaffold lashed along the front with a plank stage, a
// ladder, the lime pit and its spill, the mason's line (the one red thing) pinned along the working course, a plumb
// bob, and the stock waiting: one block with the whole sign on it, upside down. Entered: it has no door yet.
// o: seed, w (8), d (6.5), low.
import * as THREE from 'three';
import { L, H, V, PARTS, rngOf, pick, ch, worn, site, beam, plate, patch, ladder, pot } from './kit.js';

const CH = 0.42, BT = 0.46; // a course's height, a wall's thickness

// what a block was: its one old face. m: the face's centre, +z out of it; bw by bh
function oldFace(B, m, bw, bh, rng, g0, low) {
  const old = { color: worn(H.stone, rng, 0.06, 0.1), moss: 0.45, ground: g0 - 1 }, cut = { color: H.carve, moss: 0.1, ground: g0 - 1 };
  B.add(B.box(bw - 0.05, bh - 0.05, 0.024, { seg: 9 }), ch(m, 0, 0, 0.006), old);
  const what = Math.floor(rng() * 4), q = Math.floor(rng() * 4), s = Math.min(bw, bh) * 0.8, long = Math.max(bw, bh) - 0.12, wide = bw >= bh;
  if (what === 0) for (const k of [-0.2, 0.18]) B.add(wide ? B.box(long, 0.035, 0.02, { seg: 9 }) : B.box(0.035, long, 0.02, { seg: 9 }), wide ? ch(m, 0, k * bh, 0.022) : ch(m, k * bw, 0, 0.022), cut); // fillets, along the block
  else if (what === 1) for (let i = -1; i <= 1; i++) B.add(wide ? B.box(0.04, bh - 0.1, 0.02, { seg: 9 }) : B.box(bw - 0.1, 0.04, 0.02, { seg: 9 }), wide ? ch(m, i * 0.13 + (q - 1.5) * 0.08, 0, 0.022) : ch(m, 0, i * 0.13, 0.022), cut); // fluting, across it
  else if (what === 2) B.add(B.cyl(s * 0.42, s * 0.42, 0.02, 6, 1), ch(m, (q - 1.5) * 0.1, 0, 0.024, Math.PI / 2, 0, 0), cut); // a hexagon
  else { // the sign, any way up: the notch's two flanks and the disc in it
    const r = ch(m, 0, 0, 0.022, 0, 0, q * Math.PI / 2);
    for (const sx of [-1, 1]) B.add(B.box(0.035, s * 0.62, 0.02, { seg: 9 }), ch(r, sx * s * 0.17, -s * 0.08, 0, 0, 0, -sx * 0.61), cut);
    B.add(B.cyl(s * 0.19, s * 0.19, 0.02, low ? 6 : 8, 1), ch(r, 0, s * 0.2, 0.002, Math.PI / 2, 0, 0), { color: H.bronzeDull, moss: 0.1, ground: g0 - 1 });
  }
}

export function newhouse(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 5), w = o.w ?? 8, d = o.d ?? 6.5, low = !!o.low, g0 = M.elements[13];
  const R = site(M, 'new', { seed, w, d }), base = B.triangles;
  const side = seed % 2 ? -1 : 1; // the scaffold's side of the front; the lime pit and the stock are on the other
  const hw = w / 2 - 1.15, x0 = -hw - side * 0.35, x1 = hw - side * 0.35, zb = -d / 2 + 0.35, zf = d / 2 - 2.0, cx = (x0 + x1) / 2;
  const xd = cx + side * (0.2 + rng() * 0.5) * -1, dw = 1.36;
  const fresh = () => ({ color: V.newStone.clone().multiplyScalar(0.93 + rng() * 0.12), moss: 0, ground: g0 - 0.6, course: 0 });
  // how many courses stand at each corner, and how far the wall between dips: corners first
  const cor = [0, 1, 2, 3].map(() => 5 + Math.floor(rng() * 4)); cor[side > 0 ? 0 : 1] += 2; // (fl, fr, br, bl); the scaffold's corner is highest
  const courses = (a, b, t, dip) => Math.max(1, Math.round(a + (b - a) * t - dip * Math.sin(Math.PI * t) ** 0.7));
  let maxC = 0, front = 0;
  // one wall: from p to q (local x, z), the outward normal's yaw ry, corner heights ca, cb
  const wall = (px, pz, len, ry, ca, cb, dip, gap) => {
    const Wm = ch(M, px, 0, pz, 0, ry, 0); // +x along the wall, +z out of it
    for (let c = 0; c < 10; c++) {
      let x = c % 2 ? -0.22 - rng() * 0.2 : 0;
      while (x < len - 0.05) {
        let bl = 0.72 + rng() * 0.42, xa = Math.max(0, x), xb = Math.min(len, x + bl);
        x += bl;
        if (xb - xa < 0.12) continue;
        if (gap && xb > gap[0] && xa < gap[1]) { if (xa < gap[0] - 0.12) xb = gap[0]; else if (xb > gap[1] + 0.12) xa = gap[1]; else continue; }
        const mid = (xa + xb) / 2, n = courses(ca, cb, mid / len, dip);
        if (c >= n) continue;
        maxC = Math.max(maxC, c + 1);
        const m = ch(Wm, mid, (c + 0.5) * CH, 0);
        B.add(B.box(xb - xa - 0.008, CH - 0.008, BT, { seg: 9, chip: 0.014, seed: c * 31 + x * 7 }), m, fresh());
        if (rng() < (low ? 0.22 : 0.36) && xb - xa > 0.4) oldFace(B, ch(m, 0, 0, BT / 2), xb - xa - 0.008, CH - 0.008, rng, g0, low);
        else if (c === n - 1 && rng() < 0.3 && xb - xa > 0.5) oldFace(B, ch(m, 0, CH / 2 - 0.004, 0, -Math.PI / 2, 0, 0), xb - xa - 0.008, BT, rng, g0, low);
      }
    }
  };
  const fl = x1 - x0, sl = zf - zb - BT, dipF = 2.5 + rng() * 1.5;
  wall(x0, zf - BT / 2, fl, 0, cor[0], cor[1], dipF, [xd - dw / 2 - x0, xd + dw / 2 - x0]);
  wall(x1, zb + BT / 2, fl, Math.PI, cor[2], cor[3], 2 + rng() * 2, null);
  wall(x1 - BT / 2, zf - BT, sl, Math.PI / 2, cor[1], cor[2], 1.5 + rng() * 2, null);
  wall(x0 + BT / 2, zb + BT, sl, -Math.PI / 2, cor[3], cor[0], 1.5 + rng() * 2, null);
  front = Math.min(cor[0], cor[1]);
  // the footing shows a hand's breadth all round: rubble in lime
  B.add(B.box(fl + 0.3, 0.5, zf - zb + 0.3, { seg: 2.5, chip: 0.04 }), ch(M, cx, -0.2, (zf + zb) / 2), { color: worn(V.newDust, rng, 0.25), course: 0.2, moss: 0.05, ground: g0 - 0.6 });
  // the door's centering: two props and a half-wheel of boards, the first arch stones on it either side
  const raw = { color: V.rawWood, moss: 0.03, ground: g0 - 0.5 }, zc = zf - BT / 2, sp = 1.72, cr = dw / 2 - 0.03;
  for (const sx of [-1, 1]) beam(B, M, [xd + sx * (dw / 2 - 0.09), 0, zc], [xd + sx * (dw / 2 - 0.09), sp, zc], 0.11, raw);
  beam(B, M, [xd - dw / 2 + 0.03, sp, zc], [xd + dw / 2 - 0.03, sp, zc], 0.1, raw, 0.34);
  { const pts = []; for (let i = 0; i <= 8; i++) { const a = -0.25 + (i / 8) * (Math.PI + 0.5); pts.push([Math.cos(a) * cr, sp + 0.18 + Math.sin(a) * cr]); } plate(B, ch(M, xd, 0, zc), pts, 0.3, raw); }
  for (const sx of [-1, 1]) for (let i = 0; i < (sx === side ? 3 : 2); i++) { const a = -0.2 + i * 0.42, rr = cr + 0.2; B.add(B.box(0.3, 0.36, BT, { seg: 9, chip: 0.012 }), ch(M, xd + sx * Math.cos(a) * rr, sp + 0.18 + Math.sin(a) * rr, zc, 0, 0, sx * (a - 0.15)), fresh()); }
  R.door(xd, zf + 0.8, { enter: true, w: dw });
  // the scaffold along the front on its side: three standards, two ledgers, putlogs into the wall, a stage of planks
  const sx0 = side > 0 ? x0 - 0.2 : xd + dw / 2 + 0.5, sx1 = side > 0 ? xd - dw / 2 - 0.5 : x1 + 0.2, sz = zf + 1.15, sy = 1.98;
  const lash = (x, y, z) => B.add(B.box(0.14, 0.1, 0.14, { seg: 9 }), ch(M, x, y, z, 0, 0.6, 0), { color: V.rope, moss: 0, ground: g0 - 2 });
  for (let i = 0; i < 3; i++) {
    const x = sx0 + (i / 2) * (sx1 - sx0), top = 3.6 + rng() * 1.3;
    beam(B, M, [x + (rng() - 0.5) * 0.1, -0.2, sz], [x + (rng() - 0.5) * 0.12, top, sz + (rng() - 0.5) * 0.1], 0.1, { ...raw, round: 6 });
    beam(B, M, [x, sy - 0.06, sz + 0.12], [x, sy - 0.06, zf - 0.2], 0.08, { ...raw, round: 5 }); // the putlog
    lash(x, sy - 0.05, sz); if (top > 3.9) lash(x, 3.45, sz);
    R.post(x, sz, 0.09);
  }
  beam(B, M, [sx0 - 0.3, sy - 0.14, sz - 0.07], [sx1 + 0.3, sy - 0.14, sz - 0.07], 0.08, { ...raw, round: 5 });
  beam(B, M, [sx0 - 0.2, 3.42, sz - 0.07], [sx1 + 0.25, 3.5, sz - 0.07], 0.07, { ...raw, round: 5 });
  for (let i = 0; i < 3; i++) B.add(B.box(sx1 - sx0 + 0.5 - i * 0.2, 0.045, 0.27, { seg: 9 }), ch(M, (sx0 + sx1) / 2 + (i - 1) * 0.07, sy + 0.01 + i * 0.004, sz - 0.2 - i * 0.3, 0, (rng() - 0.5) * 0.03, 0), { ...raw, color: worn(V.rawWood, rng, 0.12) });
  // on the stage: a block waiting, the mortar board
  B.add(B.box(0.8, CH, BT, { seg: 9, chip: 0.014 }), ch(M, sx0 + 0.7, sy + 0.25, sz - 0.5, 0, 0.3, 0), fresh());
  B.add(B.box(0.5, 0.03, 0.5, { seg: 9 }), ch(M, sx1 - 0.6, sy + 0.05, sz - 0.5, 0, 0.5, 0), raw);
  B.add(B.cyl(0.02, 0.2, 0.12, 7, 1), ch(M, sx1 - 0.6, sy + 0.12, sz - 0.5), { color: V.lime, moss: 0, ground: g0 - 3 });
  // the ladder up to the stage
  const lx = side > 0 ? sx0 - 0.05 : sx1 + 0.05;
  ladder(B, M, [lx, 0, sz + 0.78], [lx, sy + 0.75, sz + 0.1], 0.48, raw); R.post(lx, sz + 0.5, 0.3, 0, 1.3, { stand: false });
  // the mason's line, red, pinned along the front's working course; the plumb bob off the high corner
  const ly = front * CH + 0.05, lineC = { color: L.tile[1], moss: 0, ground: g0 - 3, emit: [0.25, 0.03, 0.04, 1] };
  beam(B, M, [x0 - 0.1, ly + cor[0] * 0 + 0.0, zf + 0.03], [x1 + 0.1, ly, zf + 0.03], 0.016, lineC);
  for (const x of [x0 - 0.1, x1 + 0.1]) beam(B, M, [x, ly - 0.12, zf + 0.03], [x, ly + 0.14, zf + 0.03], 0.03, raw);
  { const px = side > 0 ? x0 : x1, top = cor[side > 0 ? 0 : 1] * CH; beam(B, M, [px, top + 0.02, zf - 0.1], [px - side * 0.05, top + 0.05, zf + 0.34], 0.035, raw); beam(B, M, [px - side * 0.05, top + 0.04, zf + 0.3], [px - side * 0.05, top - 1.5, zf + 0.3], 0.012, lineC); B.add(B.cyl(0.05, 0.004, 0.14, 6, 1), ch(M, px - side * 0.05, top - 1.56, zf + 0.3), { color: H.bronze, moss: 0, ground: g0 - 3 }); }
  // the lime pit: boards round it, the putty white in it, the hoe, the spill
  const px = side > 0 ? x1 - 0.7 : x0 + 0.7, pz = zf + 1.25;
  for (const [bx, bz, bw, bd] of [[0, 0.5, 1.5, 0.06], [0, -0.5, 1.5, 0.06], [0.72, 0, 0.06, 1.0], [-0.72, 0, 0.06, 1.0]]) B.add(B.box(bw, 0.34, bd, { seg: 9 }), ch(M, px + bx, 0.12, pz + bz), raw);
  B.add(B.box(1.4, 0.2, 0.96, { seg: 0.5 }), ch(M, px, 0.1, pz), { color: V.lime, moss: 0, wet: 0.25, ground: g0 - 3, disp: 0.015, dispScale: 3, emit: [0.05, 0.05, 0.045, 1] });
  beam(B, M, [px + 0.2, 0.18, pz], [px + 0.9, 1.25, pz - 0.75], 0.04, { ...raw, round: 5 });
  for (let i = 0; i < (low ? 2 : 4); i++) patch(B, ch(M, px + (rng() - 0.5) * 2.4, 0.012 + i * 0.003, pz + (rng() - 0.3) * 1.3, -Math.PI / 2, rng() * 3, 0), 0.25 + rng() * 0.3, rng, { color: V.lime, moss: 0, ground: g0 - 3 });
  R.wall(px - 0.5, pz, px + 0.5, pz, 0, 0.3, 0.5, { stand: true });
  // the stock: quarried blocks waiting, the sign whole on one of them and upside down; a column drum not yet cut
  const kx = side > 0 ? x1 + 0.55 : x0 - 0.55, kz = zb + 1.4;
  for (let i = 0; i < 5; i++) { const row = i < 3 ? 0 : 1, zz = kz + (i < 3 ? i : i - 2.5) * 0.95; B.add(B.box(0.62, CH, 0.86, { seg: 9, chip: 0.02, seed: i }), ch(M, kx + (rng() - 0.5) * 0.08, (row + 0.5) * CH, zz, 0, (rng() - 0.5) * 0.12, 0), i === 1 || i === 4 ? { color: worn(H.stone, rng, 0.05), moss: 0.45, ground: g0, course: 0 } : fresh()); }
  { const bx = side > 0 ? x1 + 0.6 : x0 - 0.6, bz = zf - 0.6; B.add(B.box(0.7, 1.0, 1.1, { seg: 9, chip: 0.03 }), ch(M, bx, 0.5, bz), { color: worn(H.stone, rng, 0.05), moss: 0.45, ground: g0, course: 0 }); PARTS.heliarch.roundel(B, ch(M, bx, 1.0, bz + 0.56, 0, 0, Math.PI), { size: 0.62, disc: 'bronze' }); R.post(bx, bz, 0.6, 0, 1.0); }
  if (!low) PARTS.heliarch.drum(B, ch(M, kx - side * 0.2, 0.36, kz + 3.3, Math.PI / 2, 0.4, 0), { r: 0.36, h: 0.8, moss: 0.5 });
  R.wall(kx, kz, kx, kz + 1.9, 0, CH * 2, 0.45, { stand: true });
  // inside: trodden earth white with stone dust, a trestle, the masons' jar
  B.add(B.box(fl - BT, 0.4, zf - zb - BT, { seg: 1.5 }), ch(M, cx, -0.17, (zf + zb) / 2), { color: worn(V.newDust, rng, 0.5), moss: 0.1, ground: g0 - 0.3, disp: 0.012, dispScale: 2 });
  R.floor(cx, (zf + zb) / 2, fl - BT, zf - zb - BT, 0.03, { keep: false }); R.floor(xd, zf - BT / 2, dw, BT + 0.5, 0.03, { keep: false });
  if (!low) { for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) beam(B, M, [cx + sx * 0.7, 0, zb + 1.5 + sz2 * 0.3], [cx + sx * 0.6, 0.75, zb + 1.5 + sz2 * 0.08], 0.05, raw); B.add(B.box(1.6, 0.05, 0.5, { seg: 9 }), ch(M, cx, 0.77, zb + 1.5), raw); pot(B, M, cx + 0.3, 0.8, zb + 1.5, 0.14, worn(L.tile[0], rng, 0.3), 2, 6); R.wall(cx - 0.5, zb + 1.5, cx + 0.5, zb + 1.5, 0, 0.8, 0.3, { stand: true }); }
  // its walls as walls, the door left
  const wh = 2 * CH;
  R.wall(x0 + 0.23, zf - 0.23, xd - dw / 2 - 0.2, zf - 0.23, 0, Math.min(cor[0], 4) * CH, 0.23); R.wall(xd + dw / 2 + 0.2, zf - 0.23, x1 - 0.23, zf - 0.23, 0, Math.min(cor[1], 4) * CH, 0.23);
  R.wall(x0 + 0.23, zb + 0.23, x1 - 0.23, zb + 0.23, 0, wh, 0.23); R.wall(x0 + 0.23, zb + 0.23, x0 + 0.23, zf - 0.23, 0, wh, 0.23); R.wall(x1 - 0.23, zb + 0.23, x1 - 0.23, zf - 0.23, 0, wh, 0.23);
  R.tris = B.triangles - base; R.top = maxC * CH;
  return R;
}
