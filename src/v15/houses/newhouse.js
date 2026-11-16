// The new house, half built (v15-V1): the only new thing in the valley, and made of the oldest thing its masons could
// reach. Its walls are going up in pale fresh-cut ashlar quarried from the keep's fallen corner: every block was a
// Heliarch block, re-cut on five faces, and still carries on its sixth what it was, weathered grey: a pair of fillets,
// a hexagon, a run of fluting, the sign itself, turned whichever way the block went into the wall. The corners are
// raised first and the courses rack back from them; the door has its timber centering up and the first stones of a
// horseshoe arch on it, a Late arch in new stone. Raw pole scaffold lashed along the front with a plank stage, a
// ladder, the lime pit and its spill, the mason's line (the one red thing) pinned along the working course, a plumb
// bob, and the stock waiting: one block with the whole sign on it, upside down. Entered: it has no door yet.
// Three stages, three silhouettes (o.stage, else by the seed): 0 'footing' (two or three courses, one corner begun,
// shear-legs standing over it with a block in the sling), 1 'rising' (the corners up and the walls racked back between
// them, the scaffold along the front), 2 'roofing' (the walls near their height, the arch turned, the first roof poles
// laid across).
// o: seed, w (8), d (6.5), stage, low. Needs 5 x 4.6; less throws.
import * as THREE from 'three';
import { L, H, V, PARTS, rngOf, pick, ch, worn, site, beam, plate, patch, ladder, pot } from './kit.js';

const CH = 0.42, BT = 0.46; // a course's height, a wall's thickness

// The ornament the keep's corner carried, as four great friezes each laid out once in its own plane (metres): a
// block's old face shows whatever part of one fell on it, so every motif is cut through wherever the saw went.
// Each returns polylines near (u, v); `fine` is the step along a curve.
const arc = (cx, cy, r, a0, a1, fine) => { const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * r) / fine)), p = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
const FRIEZES = [
  // a row of great sun-roses: three rings and sixteen rays, 1.5 m apart, a fillet above and below
  (u, v, fine) => { const out = [], cx = Math.round(u / 1.5) * 1.5, cy = Math.round(v / 1.2) * 1.2; for (const r of [0.2, 0.27, 0.5]) out.push(arc(cx, cy, r, 0, Math.PI * 2, fine)); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; out.push([[cx + Math.cos(a) * 0.29, cy + Math.sin(a) * 0.29], [cx + Math.cos(a) * 0.48, cy + Math.sin(a) * 0.48]]); } for (const y of [-0.56, 0.56]) out.push([[cx - 0.8, cy + y], [cx + 0.8, cy + y]]); return out; },
  // a running braid: two bands crossing every 0.34 m between a pair of fillets, repeated every 0.62 m up
  (u, v, fine) => { const out = [], cy = Math.round(v / 0.62) * 0.62, x0 = Math.floor(u / 0.34 - 3) * 0.34; for (const ph of [0, Math.PI]) for (const off of [0, 0.045]) { const p = []; for (let x = x0; x <= x0 + 2.2; x += fine) p.push([x, cy + (0.13 - off) * Math.sin((x / 0.68) * Math.PI * 2 + ph)]); out.push(p); } for (const y of [-0.2, -0.24, 0.2, 0.24]) out.push([[x0, cy + y], [x0 + 2.2, cy + y]]); return out; },
  // fluting: reeds every 0.085 m with a round stop at each end of a 1.1 m flute
  (u, v, fine) => { const out = [], cy = Math.round(v / 1.3) * 1.3, x0 = Math.floor(u / 0.085 - 8) * 0.085; for (let i = 0; i < 18; i++) { const x = x0 + i * 0.085; out.push([[x, cy - 0.5], [x, cy + 0.5]]); if (i % 2 === 0) { out.push(arc(x + 0.0425, cy + 0.5, 0.0425, 0, Math.PI, fine)); out.push(arc(x + 0.0425, cy - 0.5, 0.0425, Math.PI, Math.PI * 2, fine)); } } return out; },
  // the sign itself, a man's height: the notch's flanks doubled, the disc in it ringed, rays over it
  (u, v, fine) => { const out = [], cx = Math.round(u / 1.7) * 1.7, cy = Math.round(v / 1.5) * 1.5, k = Math.tan(0.61); for (const o2 of [0, 0.06]) for (const sx of [-1, 1]) out.push([[cx + sx * o2, cy - 0.45], [cx + sx * (o2 + k * 0.95), cy + 0.5]]); for (const r of [0.2, 0.25]) out.push(arc(cx, cy + 0.12, r, 0, Math.PI * 2, fine)); for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; out.push([[cx + Math.cos(a) * 0.3, cy + 0.12 + Math.sin(a) * 0.3], [cx + Math.cos(a) * 0.42, cy + 0.12 + Math.sin(a) * 0.42]]); } return out; },
];
// what a block was: its one old face, weathered, and the piece of a frieze that was on it, turned whichever way the
// block went into the wall (often on its side or upside down). m: the face's centre, +z out of it; bw by bh
function oldFace(B, m, bw, bh, rng, g0, low) {
  const oldC = worn(H.stone, rng, 0.06, 0.1).lerp(V.newDust, 0.22), old = { color: oldC, moss: 0.3, ground: g0 - 1 }, cut = { color: oldC.clone().multiplyScalar(0.5), moss: 0.1, ground: g0 - 1 };
  B.add(B.box(bw - 0.05, bh - 0.05, 0.024, { seg: 9 }), ch(m, 0, 0, 0.006), old);
  const q = Math.floor(rng() * 4) * Math.PI / 2 + (rng() - 0.5) * 0.06, cq = Math.cos(q), sq = Math.sin(q), u0 = rng() * 9, v0 = rng() * 9, hx = bw / 2 - 0.035, hy = bh / 2 - 0.035, lw = 0.011;
  const pos = [];
  for (const line of FRIEZES[Math.floor(rng() * FRIEZES.length)](u0, v0, low ? 0.11 : 0.055)) for (let i = 1; i < line.length; i++) {
    // into the face's frame, and clipped to it (Liang-Barsky)
    let ax = (line[i - 1][0] - u0) * cq - (line[i - 1][1] - v0) * sq, ay = (line[i - 1][0] - u0) * sq + (line[i - 1][1] - v0) * cq, bx = (line[i][0] - u0) * cq - (line[i][1] - v0) * sq, by = (line[i][0] - u0) * sq + (line[i][1] - v0) * cq;
    let t0 = 0, t1 = 1, ok = true; const dx = bx - ax, dy = by - ay;
    for (const [pp, qq] of [[-dx, ax + hx], [dx, hx - ax], [-dy, ay + hy], [dy, hy - ay]]) { if (pp === 0) { if (qq < 0) ok = false; } else { const r = qq / pp; if (pp < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else { if (r < t0) ok = false; else if (r < t1) t1 = r; } } }
    if (!ok || t1 - t0 < 1e-3) continue;
    bx = ax + dx * t1; by = ay + dy * t1; ax += dx * t0; ay += dy * t0;
    const l = Math.hypot(bx - ax, by - ay); if (l < 0.012) continue;
    const nx = (-(by - ay) / l) * lw, ny = ((bx - ax) / l) * lw, z = 0.027;
    pos.push(ax - nx, ay - ny, z, bx - nx, by - ny, z, bx + nx, by + ny, z, ax - nx, ay - ny, z, bx + nx, by + ny, z, ax + nx, ay + ny, z);
  }
  if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); B.add(g, m, cut); }
}

export function newhouse(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 5), w = o.w ?? 8, d = o.d ?? 6.5, low = !!o.low, g0 = M.elements[13];
  if (w < 5 || d < 4.6) throw new Error(`new house: a plot ${w} x ${d} m is too small (5 x 4.6)`);
  const R = site(M, 'new', { seed, w, d }), base = B.triangles, stage = o.stage ?? seed % 3; R.form = ['footing', 'rising', 'roofing'][stage];
  const side = seed % 2 ? -1 : 1; // the scaffold's side of the front; the lime pit and the stock are on the other
  const hw = w / 2 - 1.15, x0 = -hw - side * 0.35, x1 = hw - side * 0.35, zb = -d / 2 + 0.35, zf = d / 2 - 2.0, cx = (x0 + x1) / 2;
  const xd = cx + side * (0.2 + rng() * 0.5) * -1, dw = 1.36, courses = (a, b, t, dip) => Math.max(1, Math.round(a + (b - a) * t - dip * Math.sin(Math.PI * t) ** 0.7));
  // new-cut, and already not clean: chalky, dusted, a block here and there a tone warmer or greyer from the quarry
  const fresh = () => ({ color: V.newStone.clone().lerp(rng() < 0.3 ? H.stone : V.dirt, 0.08 + rng() * 0.16).multiplyScalar(0.9 + rng() * 0.1), moss: 0.03, ground: g0 - 0.6, course: 0 });
  // how many courses stand at each corner, and how far the wall between dips: corners first
  const cor = [0, 1, 2, 3].map(() => (stage === 0 ? 1 + Math.floor(rng() * 2) : stage === 2 ? 8 + Math.floor(rng() * 2) : 5 + Math.floor(rng() * 4))); cor[side > 0 ? 0 : 1] += stage === 2 ? 1 : 2; // (fl, fr, br, bl); the scaffold's corner is highest
  const dipK = stage === 0 ? 0.3 : stage === 2 ? 0.45 : 1, sp = 2.06, dw0 = 1.36, gapTop = Math.ceil((sp + 0.18 + dw0 / 2 + 0.45) / CH); // (the door's gap closes over the arch)
  let maxC = 0, front = 0;
  // one wall: from p to q (local x, z), the outward normal's yaw ry, corner heights ca, cb
  const wall = (px, pz, len, ry, ca, cb, dip, gap) => {
    const Wm = ch(M, px, 0, pz, 0, ry, 0); // +x along the wall, +z out of it
    dip *= dipK;
    // as a wall for the walker: lengths of about a metre, each as high as its lowest stone
    { const ns = Math.max(1, Math.round(len / 1.1)), cy = Math.cos(ry), sy = Math.sin(ry), P = (x) => [px + x * cy, pz - x * sy];
      for (let i = 0; i < ns; i++) { let a = (i / ns) * len, b = ((i + 1) / ns) * len; if (gap && b > gap[0] && a < gap[1]) { if (a < gap[0] - 0.5) b = gap[0]; else if (b > gap[1] + 0.5) a = gap[1]; else continue; } const n = Math.min(courses(ca, cb, a / len, dip), courses(ca, cb, (a + b) / 2 / len, dip), courses(ca, cb, b / len, dip)), r = BT / 2, p0 = P(a + r), p1 = P(b - r); R.wall(p0[0], p0[1], p1[0], p1[1], 0, n * CH, r); } }
    for (let c = 0; c < 12; c++) {
      let x = c % 2 ? -0.22 - rng() * 0.2 : 0;
      while (x < len - 0.05) {
        let bl = 0.72 + rng() * 0.42, xa = Math.max(0, x), xb = Math.min(len, x + bl);
        x += bl;
        if (xb - xa < 0.12) continue;
        if (gap && c < gapTop && xb > gap[0] && xa < gap[1]) { if (xa < gap[0] - 0.12) xb = gap[0]; else if (xb > gap[1] + 0.12) xa = gap[1]; else continue; }
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
  const fl = x1 - x0, sl = zf - zb - 2 * BT, dipF = 2.5 + rng() * 1.5;
  wall(x0, zf - BT / 2, fl, 0, cor[0], cor[1], dipF, [xd - dw / 2 - x0, xd + dw / 2 - x0]);
  wall(x1, zb + BT / 2, fl, Math.PI, cor[2], cor[3], 2 + rng() * 2, null);
  wall(x1 - BT / 2, zf - BT, sl, Math.PI / 2, cor[1], cor[2], 1.5 + rng() * 2, null);
  wall(x0 + BT / 2, zb + BT, sl, -Math.PI / 2, cor[3], cor[0], 1.5 + rng() * 2, null);
  front = Math.min(cor[0], cor[1]);
  // the footing shows a hand's breadth all round: rubble in lime
  B.add(B.box(fl + 0.3, 0.5, zf - zb + 0.3, { seg: 2.5, chip: 0.04 }), ch(M, cx, -0.232, (zf + zb) / 2), { color: worn(V.newDust, rng, 0.25), course: 0.2, moss: 0.05, ground: g0 - 0.6 });
  // the door's centering: two props and a half-wheel of boards, the first arch stones on it either side
  const raw = { color: V.rawWood, moss: 0.03, ground: g0 - 0.5 }, zc = zf - BT / 2, cr = dw / 2 - 0.03; // (the tie, at sp, clears a walker's head)
  if (stage > 0) {
  for (const sx of [-1, 1]) beam(B, M, [xd + sx * (dw / 2 - 0.09), 0, zc], [xd + sx * (dw / 2 - 0.09), sp, zc], 0.11, raw);
  beam(B, M, [xd - dw / 2 + 0.03, sp, zc], [xd + dw / 2 - 0.03, sp, zc], 0.1, raw, 0.34);
  { const pts = []; for (let i = 0; i <= 8; i++) { const a = -0.25 + (i / 8) * (Math.PI + 0.5); pts.push([Math.cos(a) * cr, sp + 0.18 + Math.sin(a) * cr]); } plate(B, ch(M, xd, 0, zc), pts, 0.3, raw); }
  for (const sx of [-1, 1]) for (let i = 0; i < (stage === 2 ? 4 : sx === side ? 3 : 2); i++) { const a = -0.2 + i * 0.42, rr = cr + 0.2; B.add(B.box(0.3, 0.36, BT, { seg: 9, chip: 0.012 }), ch(M, xd + sx * Math.cos(a) * rr, sp + 0.18 + Math.sin(a) * rr, zc, 0, 0, sx * (a - 0.15)), fresh()); }
  }
  R.door(xd, zf + 0.8, { enter: true, w: dw });
  if (stage === 0) {
    // no scaffold yet: shear-legs over the corner that is begun, a block in the sling, the fall made off to a peg
    const hx = side > 0 ? x0 + 0.5 : x1 - 0.5, hz = zf - 0.3, top = [hx + side * 0.15, 5.6 + rng() * 0.8, hz + 0.2], pole = { ...raw, round: 6 };
    for (const [fx, fz] of [[-side * 1.1, 1.2], [side * 1.2, -1.4]]) { /* one foot in the street beyond the corner, one inside: neither before the door */ beam(B, M, [hx + fx, -0.2, hz + fz], [top[0] + fx * 0.04, top[1] + 0.3, top[2]], 0.13, pole); R.post(hx + fx, hz + fz, 0.12); }
    beam(B, M, [hx - side * 1.0, -0.2, hz - 2.4], [top[0], top[1] + 0.1, top[2] - 0.1], 0.11, pole); R.post(hx - side * 1.0, hz - 2.4, 0.12);
    B.add(B.box(0.3, 0.22, 0.3, { seg: 9 }), ch(M, top[0], top[1], top[2], 0, 0.6, 0), { color: V.rope, moss: 0, ground: g0 - 2 });
    const by = cor[side > 0 ? 0 : 1] * CH + 0.75 + rng() * 0.5;
    beam(B, M, [top[0], top[1], top[2]], [top[0], by + CH + 0.25, top[2]], 0.02, { color: V.rope, moss: 0, ground: g0 - 3 });
    B.add(B.box(0.84, CH, BT, { seg: 9, chip: 0.014 }), ch(M, top[0], by + CH / 2, top[2], 0.03, 0.35, 0.05), fresh());
    for (const sx of [-1, 1]) beam(B, M, [top[0] + sx * 0.3, by, top[2]], [top[0], by + CH + 0.25, top[2]], 0.018, { color: V.rope, moss: 0, ground: g0 - 3 });
    beam(B, M, [top[0], top[1], top[2]], [hx - side * 0.4, 0.25, hz + 2.3], 0.016, { color: V.rope, moss: 0, ground: g0 - 3 });
    beam(B, M, [hx - side * 0.4, -0.2, hz + 2.3], [hx - side * 0.45, 0.4, hz + 2.35], 0.07, raw);
    R.top = top[1] + 0.4;
  } else {
  // the scaffold along the front on its side: three standards, two ledgers, putlogs into the wall, a stage of planks
  const sx0 = side > 0 ? x0 - 0.2 : xd + dw / 2 + 0.5, sx1 = side > 0 ? xd - dw / 2 - 0.5 : x1 + 0.2, sz = zf + 1.15, sy = stage === 2 ? 2.82 : 1.98;
  const lash = (x, y, z) => B.add(B.box(0.14, 0.1, 0.14, { seg: 9 }), ch(M, x, y, z, 0, 0.6, 0), { color: V.rope, moss: 0, ground: g0 - 2 });
  for (let i = 0; i < 3; i++) {
    const x = sx0 + (i / 2) * (sx1 - sx0), top = sy + 1.6 + rng() * 1.3;
    beam(B, M, [x + (rng() - 0.5) * 0.1, -0.2, sz], [x + (rng() - 0.5) * 0.12, top, sz + (rng() - 0.5) * 0.1], 0.1, { ...raw, round: 6 });
    beam(B, M, [x, sy - 0.06, sz + 0.12], [x, sy - 0.06, zf - 0.2], 0.08, { ...raw, round: 5 }); // the putlog
    lash(x, sy - 0.05, sz); if (top > sy + 1.9) lash(x, sy + 1.47, sz);
    R.post(x, sz, 0.09);
  }
  beam(B, M, [sx0 - 0.3, sy - 0.14, sz - 0.07], [sx1 + 0.3, sy - 0.14, sz - 0.07], 0.08, { ...raw, round: 5 });
  beam(B, M, [sx0 - 0.2, sy + 1.44, sz - 0.07], [sx1 + 0.25, sy + 1.52, sz - 0.07], 0.07, { ...raw, round: 5 });
  for (let i = 0; i < 3; i++) B.add(B.box(sx1 - sx0 + 0.5 - i * 0.2, 0.045, 0.27, { seg: 9 }), ch(M, (sx0 + sx1) / 2 + (i - 1) * 0.07, sy + 0.01 + i * 0.004, sz - 0.2 - i * 0.3, 0, (rng() - 0.5) * 0.03, 0), { ...raw, color: worn(V.rawWood, rng, 0.12) });
  // on the stage: a block waiting, the mortar board
  B.add(B.box(0.8, CH, BT, { seg: 9, chip: 0.014 }), ch(M, sx0 + 0.7, sy + 0.25, sz - 0.5, 0, 0.3, 0), fresh());
  B.add(B.box(0.5, 0.03, 0.5, { seg: 9 }), ch(M, sx1 - 0.6, sy + 0.05, sz - 0.5, 0, 0.5, 0), raw);
  B.add(B.cyl(0.02, 0.2, 0.12, 7, 1), ch(M, sx1 - 0.6, sy + 0.12, sz - 0.5), { color: V.lime, moss: 0, ground: g0 - 3 });
  // the ladder up to the stage
  const lx = side > 0 ? sx0 - 0.05 : sx1 + 0.05;
  ladder(B, M, [lx, 0, sz + 0.78], [lx, sy + 0.75, sz + 0.1], 0.48, raw); R.post(lx, sz + 0.5, 0.3, 0, 1.3, { stand: false });
  }
  // the mason's line, red, pinned along the front's working course; the plumb bob off the high corner
  const ly = front * CH + 0.05, lineC = { color: worn(L.tile[1], rng, 0.45), moss: 0, ground: g0 - 3 }; // (madder twine, dull: it shows by being straight)
  beam(B, M, [x0 - 0.1, ly, zf + 0.03], [cx, ly - 0.035, zf + 0.03], 0.012, lineC); beam(B, M, [cx, ly - 0.035, zf + 0.03], [x1 + 0.1, ly, zf + 0.03], 0.012, lineC);
  for (const x of [x0 - 0.1, x1 + 0.1]) beam(B, M, [x, ly - 0.12, zf + 0.03], [x, ly + 0.14, zf + 0.03], 0.03, raw);
  if (stage > 0) { // (a stick driven into a joint four courses under the high corner, where the wall is sure to stand)
    const px = (side > 0 ? x0 : x1) + side * 0.3, top = (cor[side > 0 ? 0 : 1] - 3.5) * CH, ll = Math.min(1.5, top - 0.3);
    beam(B, M, [px, top, zf - 0.12], [px, top + 0.03, zf + 0.34], 0.035, raw); beam(B, M, [px, top + 0.03, zf + 0.3], [px, top - ll, zf + 0.3], 0.012, lineC); B.add(B.cyl(0.05, 0.004, 0.14, 6, 1), ch(M, px, top - ll - 0.06, zf + 0.3), { color: H.bronze, moss: 0, ground: g0 - 3 }); }
  if (stage === 2) { // the first roof poles, laid across from the front wall to the back, not yet lashed
    const ty = Math.min(...cor) * CH - 0.5 * CH; for (let i = 0; i < 5; i++) { const x = (side > 0 ? x1 - 0.5 : x0 + 0.5) - side * i * (0.7 + rng() * 0.15); beam(B, M, [x + (rng() - 0.5) * 0.2, ty + CH * 0.5 + 0.09 + (rng() < 0.3 ? CH : 0), zf + 0.25], [x + (rng() - 0.5) * 0.2, ty + CH * 0.5 + 0.09, zb - 0.3], 0.13, { ...raw, round: 6 }); }
  }
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
  R.tris = B.triangles - base; R.top = Math.max(R.top || 0, maxC * CH);
  return R;
}
