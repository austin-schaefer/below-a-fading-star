// A Late house (v15-V1): the living folk's own, lime plaster over whatever was to hand, never plumb, patched and
// limewashed over, its colour in one door, a shutter, a cloth. Four forms, so a street of them is not one house
// repeated: 'yard' (one storey, an outside stair to a flat roof that is a yard: walked), 'tower' (narrow and two
// storeys, a screened oriel, a dome or a wind-catcher, a lean-to beside it), 'step' (a tall half and a low half whose
// roof is the tall half's yard, a ladder up to it), 'long' (low and wide on raking buttresses, a wind-catcher).
// o: seed, w (7), d (6), form, h (the roof's height, for a 'yard' or 'long' whose roof must meet a tread above),
// stair (false: a 'yard' with no stair, its roof reached from the tread behind), shop (true: a shopfront in place of
// a window), low (the low tier: fewer small things). A 'yard' needs d 4.6 for its stair; narrower, give stair: false.
import * as THREE from 'three';
import { L, H, V, PARTS, rngOf, pick, ch, leaned, worn, site, facade, patch, plate, beam, pot, leaf, stop, shutter, flight, ladder, washing, bed, hangSign, niche, openingTop, batter, dirty } from './kit.js';

export const LATE_FORMS = ['yard', 'tower', 'step', 'long'];
const T = 0.36; // a wall's thickness

// one room: a front with holes, three walls, a roof slab; its walls run on above the roof as its parapet
function room(B, HM, R, r) {
  const { x0, x1, zb, zf, h, rng, g0 } = r, w = x1 - x0, cx = (x0 + x1) / 2, dep = zf - zb, p = r.par || {};
  const pf = p.f ?? 0.4, pb = p.b ?? 0.4, pl = p.l ?? 0.4, pr = p.r ?? 0.4, col = r.color, moss = r.moss ?? 0.22;
  const top = [], n = 2 + Math.floor(rng() * 3), from = B.count;
  for (let i = 0; i <= n; i++) top.push([w / 2 - (i / n) * w, h + pf + (rng() - 0.5) * 0.14 - (i === 0 || i === n ? 0.05 : 0)]);
  if (r.gap) { // the parapet left down where a stair comes onto the roof: [xa, xb] (the room's own x)
    const [ga, gb] = [r.gap[0] - cx, r.gap[1] - cx], keep = top.filter(([x]) => x > gb + 0.05 || x < ga - 0.05), hi = h + pf;
    top.length = 0; top.push(...keep.filter(([x]) => x > gb), ...(gb < w / 2 - 0.05 ? [[gb, hi]] : []), [Math.min(gb, w / 2), h + 0.02], [Math.max(ga, -w / 2), h + 0.02], ...(ga > -w / 2 + 0.05 ? [[ga, hi]] : []), ...keep.filter(([x]) => x < ga));
  }
  facade(B, ch(HM, cx, 0, zf - T / 2), { w, top, d: T, openings: (r.openings || []).map((op) => ({ ...op, x: op.x - cx })), color: col, moss, ground: g0, n: r.low ? 7 : 10 });
  const side = (hh, x, z, ww, dd, seed) => B.add(B.box(ww, hh + 0.5, dd, { seg: 1.5, chip: 0.05, chipTop: true, seed }), ch(HM, x, (hh - 0.5) / 2, z), { color: worn(col, rng, 0.06, 0.06), moss, ground: g0, disp: 0.018, dispScale: 1.4 });
  side(h + pb, cx, zb + T / 2, w, T, 3);
  side(h + pl, x0 + T / 2 + 0.015, (zb + zf) / 2 - 0.045, T, dep - 0.12, 5);
  side(h + pr, x1 - T / 2 - 0.015, (zb + zf) / 2 - 0.045, T, dep - 0.12, 7);
  B.add(B.box(w - 0.3, 0.26, dep - 0.3, { seg: 9 }), ch(HM, cx, h - 0.13, (zb + zf) / 2), { color: worn(V.mud, rng, 0.2), moss: 0.25, ground: g0 });
  // what stops each opening: a leaf behind a door, a pane or a shutter behind a window
  for (const op of r.openings || []) {
    const m = ch(HM, op.x, op.y || 0, zf - T / 2);
    if (op.door) {
      leaf(B, ch(m, 0, 0, -0.1), op.w + 0.24, openingTop(op.kind, op.w, op.sp) + 0.12, worn(op.paint, rng, 0.22), rng, { plain: r.low });
      // the painted frame, proud of the plaster (the alfiz), and a threshold of somebody else's stone
      const fh = openingTop(op.kind, op.w, op.sp) + 0.17, fc = worn(op.frame, rng, 0.2);
      for (const sx of [-1, 1]) B.add(B.box(0.1, fh, 0.035, { seg: 9 }), ch(m, sx * (op.w / 2 + 0.17), fh / 2, T / 2 + 0.012), { color: fc, moss: 0.05, ground: g0 });
      B.add(B.box(op.w + 0.44, 0.1, 0.035, { seg: 9 }), ch(m, 0, fh, T / 2 + 0.012), { color: fc, moss: 0.05, ground: g0 });
      B.add(B.box(op.w + 0.5, 0.3, 0.5, { seg: 9, chip: 0.03 }), ch(m, 0, -0.1, T / 2 + 0.12), { color: H.stone, moss: 0.45, ground: g0, course: 0 });
      R.door(op.x, zf + 0.6, { w: op.w });
    } else if (!op.shop) {
      const hh = openingTop(op.kind, op.w, op.sp);
      stop(B, m, op.w, hh, op.stop, rng, { paint: worn(op.paint, rng, 0.2) });
      if (op.stop !== 'shut' && !r.low) for (const sx of op.one ? [op.one] : [-1, 1]) shutter(B, ch(m, 0, 0, T / 2), op.w, op.sp, sx, worn(op.paint, rng, 0.25), 0.1 + rng() * 0.5);
      // a sill of tile, one or two gone
      B.add(B.box(op.w + 0.2, 0.05, 0.12, { seg: 9 }), ch(m, 0, -0.03, T / 2 + 0.03), { color: worn(pick(L.tile, rng), rng, 0.25), moss: 0, wet: 0.25, ground: g0 });
      R.window(op.x, (op.y || 0) + hh / 2, zf, op.stop === 'lit');
    }
  }
  // patches on the front, each a tone off the wall: limewash over a mend, raw mud, damp risen from the ground, and
  // low down the plaster gone from the coursed stone it hides
  const np = r.patches ?? (r.low ? 2 : 3 + Math.floor(rng() * 2));
  for (let i = 0; i < np; i++) {
    const kind = i === 0 ? 'bare' : i === 1 ? 'damp' : rng() < 0.55 ? 'lime' : 'mud', py = kind === 'bare' ? 0.3 + rng() * 0.3 : kind === 'damp' ? 0.25 : 1.0 + rng() * Math.max(0.3, h - 2);
    let px = 0, ok = false; // clear of every opening
    for (let t = 0; t < 8 && !ok; t++) { px = cx + (rng() - 0.5) * (w - 1.6); ok = (r.openings || []).every((op) => Math.abs(px - op.x) > op.w / 2 + 0.85 || py > (op.y || 0) + op.sp + op.w + 0.6 || py < (op.y || 0) - 0.7); }
    if (!ok) continue;
    const o2 = kind === 'bare' ? { color: worn(H.stone, rng, 0.1), course: 0.26, moss: 0.5, ground: g0 } : { color: kind === 'lime' ? col.clone().lerp(L.plaster[3], 0.4) : kind === 'damp' ? col.clone().lerp(V.dirt, 0.45) : col.clone().lerp(V.mud, 0.5), moss: kind === 'damp' ? 0.5 : 0.12, ground: g0 };
    patch(B, ch(HM, px, py, zf + 0.004, 0, 0, 0, kind === 'damp' ? 1.7 : 1, 1, 1), kind === 'bare' ? 0.5 + rng() * 0.3 : 0.4 + rng() * 0.45, rng, o2);
  }
  // its walls, as walls (a closed house)
  for (const [a, b, c2, e] of [[x0 + 0.2, zf - 0.2, x1 - 0.2, zf - 0.2], [x0 + 0.2, zb + 0.2, x1 - 0.2, zb + 0.2], [x0 + 0.2, zb + 0.2, x0 + 0.2, zf - 0.2], [x1 - 0.2, zb + 0.2, x1 - 0.2, zf - 0.2]]) R.wall(a, b, c2, e, 0, h, 0.2);
  // battered: a mud wall is thicker at its foot (the taller the room, the less a metre)
  const k = r.batter ?? Math.min(0.03, 0.075 / h);
  batter(B, from, HM, cx, (zb + zf) / 2, k);
  return { cx, w, dep, f: 1 - k * h };
}

// a shopfront let into a front: the hole's lining with a shelf, a counter on brackets, a shutter propped open over
// it, an awning and a hanging sign. op: the opening { x, y, w, sp }; zf the wall's face
export function shopfront(B, HM, R, op, zf, rng, o = {}) {
  const g0 = HM.elements[13], m = ch(HM, op.x, op.y, zf - T + 0.02), dark = { color: V.soot.clone().lerp(L.wood, 0.3), moss: 0, ground: g0 - 2 };
  const k = 0.35 + rng() * 0.25;
  niche(B, m, op.w + 0.3, op.sp + 0.3, 0.9, dark, { color: new THREE.Color('#2a1a0c'), moss: 0, ground: g0 - 2, emit: [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] });
  B.add(B.box(op.w + 0.2, 0.04, 0.3, { seg: 9 }), ch(m, 0, op.sp * 0.52, -0.7), { color: L.wood, moss: 0, ground: g0 - 2 }); // the shelf
  R.shelf(op.x, op.y + op.sp * 0.52 + 0.02, zf - T - 0.68, op.w, 0.3);
  // the counter: a board on two brackets, worn pale along its front edge
  if (o.counter !== false) {
    const cw = op.w + 0.3, wood = L.wood;
    B.add(B.box(cw, 0.07, 0.62, { seg: 9, chip: 0.01 }), ch(HM, op.x, op.y - 0.035, zf + 0.08), { color: wood, moss: 0.05, ground: g0 });
    for (const sx of [-1, 1]) beam(B, HM, [op.x + sx * cw * 0.38, op.y - 0.5, zf + 0.02], [op.x + sx * cw * 0.38, op.y - 0.08, zf + 0.34], 0.06, { color: wood, moss: 0, ground: g0 });
    R.counter(op.x, op.y, zf + 0.39, cw);
  }
  // the shutter, hinged at the head and propped up on a stick
  const sm = ch(HM, op.x, op.y + op.sp + 0.03, zf + 0.03, -0.95 - rng() * 0.25, 0, 0);
  B.add(B.box(op.w + 0.1, 0.04, op.sp, { seg: 9 }), ch(sm, 0, 0, op.sp / 2), { color: worn(o.paint || L.paint[0], rng, 0.25), moss: 0.05, ground: g0 - 1 });
  for (const t of [0.25, 0.75]) B.add(B.box(op.w + 0.1, 0.02, 0.05, { seg: 9 }), ch(sm, 0, -0.03, op.sp * t), { color: V.soot, moss: 0, ground: g0 - 1 });
  const from = B.count;
  if (o.awning !== false) PARTS.late.awning(B, ch(HM, op.x, 0, zf), { w: op.w + 1.1, d: 1.5, h: op.y + op.sp + 0.95, rng });
  if (o.sign !== false) hangSign(B, ch(HM, op.x + (op.w / 2 + 0.75) * (o.signSide || 1), op.y + op.sp + 1.0, zf), rng, { size: o.low ? 0.42 : 0.5 });
  dirty(B, from, 0.3, rng);
}

export function late(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 1), w = o.w ?? 7, d = o.d ?? 6, low = !!o.low, g0 = M.elements[13];
  const form = o.form || LATE_FORMS[(seed + Math.floor(rng() * 2) * (seed % 3 === 0 ? 1 : 0)) % LATE_FORMS.length];
  const R = site(M, 'late', { seed, w, d }); R.form = form;
  const base = B.triangles;
  const HM = leaned(M, (rng() - 0.5) * (form === 'yard' ? 0.03 : 0.07), (rng() - 0.5) * 0.03);
  // its wash: cream or limewash, dirty; rarely an old rose or saffron wash nearly gone. One accent paint, one frame
  const wi = rng(), wash = worn(L.plaster[wi < 0.45 ? 0 : wi < 0.8 ? 3 : wi < 0.9 ? 1 : 2], rng, wi < 0.8 ? 0.2 + rng() * 0.16 : 0.42, 0.08);
  const ai = Math.floor(rng() * 4), paint = L.paint[ai], frame = L.paint[(ai + 1 + Math.floor(rng() * 2)) % 4];
  const zf = d / 2 - 0.15 - rng() * Math.min(0.45, Math.max(0, d - 4.4) * 0.3), zb = -d / 2 + 0.1, side = rng() < 0.5 ? -1 : 1;
  const doorKind = rng() < 0.6 ? 'horseshoe' : 'ogee';
  const door = (x, hmax) => { const dw = 0.95 + rng() * 0.22, sp = doorKind === 'ogee' ? 1.25 + rng() * 0.2 : 1.42 + rng() * 0.2; return { door: true, kind: doorKind, x, y: 0, w: dw, sp: Math.min(sp, hmax - 0.75 - dw / 2), paint, frame }; };
  const win = (x, y, lit, big) => { const ww = (big ? 0.6 : 0.42) + rng() * 0.2; return { kind: rng() < 0.4 ? 'ogee' : 'rect', x, y, w: ww, sp: ww * (0.9 + rng() * 0.6), paint, stop: lit ?? (rng() < 0.45 ? 'lit' : rng() < 0.6 ? 'shut' : 'dark'), one: rng() < 0.3 ? (rng() < 0.5 ? -1 : 1) : 0 }; };
  const shop = (x) => ({ shop: true, kind: 'rect', x, y: 0.98, w: 1.5 + rng() * 0.5, sp: 1.05 + rng() * 0.15 });
  const roofBits = [];

  if (form === 'yard') {
    // one storey; a solid stair up to a flat roof that is a yard, with a bed, a jar and the washing. The stair runs
    // along the front where the plot is shallow or the seed says (the house's whole front is then a diagonal), else
    // up its side
    const hr = 2.75 + rng() * 0.55, h = o.h ?? hr, n = Math.ceil(h / 0.22), want = o.stair ?? (rng() < 0.5 || d < 5.4 ? 'front' : 'side');
    const stair = want === false ? null : want === 'side' && d / 1 - 0.7 >= n * 0.24 + 1.15 ? 'side' : w - 0.4 >= n * 0.25 + 2.6 ? 'front' : null;
    const zfr = stair === 'front' ? d / 2 - 1.12 : zf, xs = side * (w / 2 - 1.1);
    const x0 = stair === 'side' && side < 0 ? xs : -w / 2 + 0.1, x1 = stair === 'side' && side > 0 ? xs : w / 2 - 0.1, cx = (x0 + x1) / 2, rw = x1 - x0;
    const tread = stair === 'front' ? Math.min(0.27, (rw - 2.6) / n) : Math.min(0.3, (zfr - zb - 1.15) / n), run = n * tread;
    // the front stair's landing is at the `side` end; its foot comes down toward the door
    const la = side * (rw / 2 - 1.05) + cx, dx = stair === 'front' ? cx - side * (rw / 2 - 0.95) : cx - side * rw * (0.12 + rng() * 0.16), ops = [door(dx, h)];
    const sh = o.shop && stair !== 'front' ? shop(cx + side * rw * 0.22) : null;
    if (sh) ops.push(sh); else if (stair === 'front') ops.push(win(la - side * (run * 0.72), Math.min(h - 1.0, 1.75 + rng() * 0.2), 'lit', true)); else ops.push(win(cx + side * rw * (0.2 + rng() * 0.1), 1.25 + rng() * 0.3, null, true));
    if (rw > 4.6 && !sh && stair !== 'front') ops.push(win(dx - side * 1.25, 1.5 + rng() * 0.2));
    const gap = stair === 'front' ? (side > 0 ? [la, x1] : [x0, la]) : null, ps = stair === 'side' ? 0 : 0.5;
    const rm = room(B, HM, R, { x0, x1, zb, zf: zfr, h, rng, g0, color: wash, low, openings: ops, gap, par: { f: 0.45 + rng() * 0.3, b: 0.5 + rng() * 0.4, l: side > 0 ? 0.5 : ps, r: side > 0 ? ps : 0.5 } });
    if (sh) shopfront(B, HM, R, sh, zfr, rng, { paint, low, signSide: side });
    const sc = worn(wash, rng, 0.1), sc2 = wash.clone().lerp(H.stone, 0.3); // (every third tread a slab of somebody's stone, limewashed)
    if (stair === 'side') {
      const sx = xs + side * 0.47, f = flight(B, HM, R, { x: sx, z: zfr - 0.08, dx: 0, dz: -1, w: 1.0, h, tread, color: sc, color2: sc2, seed, into: 0.4, ox: -side, oz: 0 });
      const lz = zfr - 0.08 - f.run, ld = Math.min(1.0, lz - zb);
      B.add(B.box(1.4, h + 0.4, ld, { seg: 1.5, chip: 0.03, chipTop: true }), ch(HM, sx - side * 0.2, (h - 0.4) / 2, lz - ld / 2), { color: sc, moss: 0.25, ground: g0 });
      R.floor(sx - side * 0.3, lz - ld / 2, 1.6, ld, h, { layer: 1 });
      R.wall(sx, lz - Math.min(0.55, ld - 0.2), sx, lz - ld + 0.1, -0.4, h + 0.4 - 0.16, 0.42); // (its round end clear of the top treads)
    } else if (stair === 'front') {
      const sz = zfr + 0.49, fx0 = la - side * run;
      flight(B, HM, R, { x: fx0, z: sz, dx: side, dz: 0, w: 1.0, h, tread, color: sc, color2: sc2, seed, into: 0.4, ox: 0, oz: -1 });
      const lw = Math.abs((side > 0 ? x1 : x0) - la);
      B.add(B.box(lw, h + 0.4, 1.4, { seg: 1.5, chip: 0.03, chipTop: true }), ch(HM, la + side * lw / 2, (h - 0.4) / 2, sz - 0.2), { color: sc, moss: 0.25, ground: g0 });
      R.floor(la + side * lw / 2, sz - 0.45, lw, 1.9, h, { layer: 1 }); // the landing, and on over the wall's head
      R.wall(la + side * 0.78, sz, la + side * (lw - 0.3), sz, -0.4, h + 0.4 - 0.16, 0.42); // (its round end clear of the top treads)
      // the cupboard under the stair: a small door in its high end, and a kerb of plaster down its open side
      if (!low) leaf(B, ch(HM, la - side * 0.75, 0, sz + 0.5), 0.62, Math.min(1.3, h - 1.6), worn(frame, rng, 0.3), rng, { plain: true });
    }
    // the yard's floor, inside the parapets as the batter leaves them (to the wall's outer face on a side stair's side)
    const fw = (rw - (stair === 'side' ? T : 2 * T)) * rm.f, fd = (zfr - zb - 2 * T) * rm.f, fcx = cx + (stair === 'side' ? side * T / 2 : 0);
    R.floor(fcx, (zb + zfr) / 2, fw, fd, h, { layer: 1 });
    R.roof = { x0: fcx - fw / 2, x1: fcx + fw / 2, zb: (zb + zfr) / 2 - fd / 2, zf: (zb + zfr) / 2 + fd / 2, y: h };
    // the yard's things, away from the stair's head
    const bx = cx - side * rw * 0.22, bz = zb + 1.15;
    bed(B, HM, bx, h, bz, Math.PI / 2 + (rng() - 0.5) * 0.3, rng);
    R.post(bx, bz, 0.6, h, 0.55);
    const jx = cx - side * (rw / 2 - 0.8), jz = zfr - 0.85;
    pot(B, HM, jx, h, jz, 0.3, worn(L.tile[rng() < 0.5 ? 0 : 4], rng, 0.35), 2.1);
    R.post(jx, jz, 0.3, h, 0.7);
    const pa = [cx - side * (rw / 2 - 0.55), h, zb + 0.55], pb2 = [cx + side * (rw / 2 - 1.5), h, zb + 0.6 + rng() * 0.5];
    for (const q of [pa, pb2]) { beam(B, HM, q, [q[0] + (rng() - 0.5) * 0.1, h + 2.0, q[2]], 0.06, { color: L.wood, moss: 0.05, ground: g0 + h - 1, round: 5 }); R.post(q[0], q[2], 0.07, h, 2); }
    washing(B, HM, [pa[0], h + 1.9, pa[2]], [pb2[0], h + 1.9, pb2[2]], rng, low ? 3 : 5);
    roofBits.push([cx - side * rw * 0.1, h]);
  } else if (form === 'tower') {
    // narrow, two storeys; an oriel; a dome or a wind-catcher; a low lean-to beside it with jars on its roof
    const tw = 3.5 + rng() * 0.8, h = 5.5 + rng() * 1.3, x0 = side > 0 ? -w / 2 + 0.15 : w / 2 - 0.15 - tw, x1 = x0 + tw, cx = (x0 + x1) / 2;
    const ops = [door(cx + (rng() - 0.5) * 0.9, 3), win(cx + (rng() - 0.5) * 1.2, h - 1.5 - rng() * 0.3, 'lit')];
    room(B, HM, R, { x0, x1, zb: zb + 0.4, zf, h, rng, g0, color: wash, low, openings: ops, par: { f: 0.3, b: 0.3, l: 0.3, r: 0.3 } });
    // the oriel: a box on two brackets, its face a screen, a tiled lip
    const oy = 2.7 + rng() * 0.3, ox = cx + (rng() - 0.5) * 0.5, ow = 1.3 + rng() * 0.4;
    B.add(B.box(ow, 1.25, 0.8, { seg: 9, chip: 0.02 }), ch(HM, ox, oy + 0.62, zf + 0.18), { color: worn(wash, rng, 0.05), moss: 0.15, ground: g0 });
    for (const sx of [-1, 1]) beam(B, HM, [ox + sx * ow * 0.35, oy - 0.55, zf], [ox + sx * ow * 0.35, oy, zf + 0.5], 0.09, { color: L.wood, moss: 0.05, ground: g0 });
    if (low) for (let i = 0; i < 4; i++) B.add(B.box(0.05, 0.8, 0.02, { seg: 9 }), ch(HM, ox - ow * 0.3 + i * ow * 0.2, oy + 0.65, zf + 0.59), { color: paint, moss: 0, ground: g0 });
    else PARTS.late.screen(B, ch(HM, ox, oy + 0.25, zf + 0.6), { w: ow - 0.3, h: 0.8, color: worn(paint, rng, 0.2) });
    B.add(B.box(ow - 0.3, 0.8, 0.02, { seg: 9 }), ch(HM, ox, oy + 0.65, zf + 0.572), { color: new THREE.Color('#33200e'), moss: 0, ground: g0, emit: [V.lit[0] * 0.5, V.lit[1] * 0.5, V.lit[2] * 0.5, 1] });
    B.add(B.box(ow + 0.12, 0.06, 0.7, { seg: 9 }), ch(HM, ox, oy + 1.27, zf + 0.3, 0.12), { color: worn(L.tile[0], rng, 0.3), moss: 0.1, wet: 0.25, ground: g0 });
    R.window(ox, oy + 0.65, zf + 0.6, true);
    roofBits.push([cx, h, 'crown']);
    // the lean-to
    const lh = 2.0 + rng() * 0.5, lx0 = side > 0 ? x1 - 0.05 : -w / 2 + 0.2, lx1 = side > 0 ? w / 2 - 0.2 : x0 + 0.05, lzf = zf - 0.5 - rng() * 0.6;
    const lops = o.shop ? [shop((lx0 + lx1) / 2)] : [win((lx0 + lx1) / 2 + (rng() - 0.5), 1.1 + rng() * 0.2, null, true)];
    room(B, HM, R, { x0: lx0, x1: lx1, zb: zb + 1.2, zf: lzf, h: lh, rng, g0, color: worn(wash, rng, 0.12), low, openings: lops, par: { f: 0.12, b: 0.12, l: 0.12, r: 0.12 } });
    if (o.shop) shopfront(B, HM, R, lops[0], lzf, rng, { paint, low, signSide: -side });
    for (let i = 0; i < (low ? 2 : 4); i++) pot(B, HM, lx0 + 0.6 + rng() * (lx1 - lx0 - 1.2), lh, zb + 1.8 + rng() * (lzf - zb - 2.6), 0.2 + rng() * 0.14, worn(pick([L.tile[0], V.mud, L.tile[4], L.plaster[1]], rng), rng, 0.35), 1.6 + rng());
  } else if (form === 'step') {
    // a tall half and a low half; the low roof is the tall half's yard, under a pergola, a ladder up from the street
    const split = (rng() - 0.5) * 1.2, th = 5.0 + rng() * 1.0, lh = 2.6 + rng() * 0.4;
    const tx0 = side > 0 ? split : -w / 2 + 0.1, tx1 = side > 0 ? w / 2 - 0.1 : split, lx0 = side > 0 ? -w / 2 + 0.1 : split - 0.05, lx1 = side > 0 ? split + 0.05 : w / 2 - 0.1;
    const tcx = (tx0 + tx1) / 2, lcx = (lx0 + lx1) / 2, lzf = zf - rng() * 0.5;
    room(B, HM, R, { x0: tx0, x1: tx1, zb, zf, h: th, rng, g0, color: wash, low, openings: [win(tcx + (rng() - 0.5) * 0.8, 1.3, null, true), win(tcx + (rng() - 0.5) * 1.2, th - 1.7, 'lit'), ...(tx1 - tx0 > 3.3 ? [win(tcx + 0.9 * (rng() < 0.5 ? -1 : 1), 3.0)] : [])], par: { f: 0.3, b: 0.3, l: 0.3, r: 0.3 } });
    const lops = [door(lcx - side * (lx1 - lx0) * 0.15, lh)];
    if (o.shop) lops.push(shop(lcx + side * (lx1 - lx0) * 0.2));
    room(B, HM, R, { x0: lx0, x1: lx1, zb, zf: lzf, h: lh, rng, g0, color: worn(wash, rng, 0.1), low, openings: lops, par: { f: 0.5, b: 0.5, l: side > 0 ? 0.5 : 0.02, r: side > 0 ? 0.02 : 0.5 } });
    if (o.shop) shopfront(B, HM, R, lops[1], lzf, rng, { paint, low, awning: false, signSide: -side });
    // the door from the tall half onto the yard, and the pergola's cloth
    const wx = side > 0 ? tx0 : tx1;
    leaf(B, ch(HM, wx - side * 0.03, lh, (zb + lzf) / 2 + 0.4, 0, -side * Math.PI / 2, 0), 0.8, 1.75, worn(paint, rng, 0.2), rng, { plain: low });
    const px0 = side > 0 ? lx0 + 0.5 : lx1 - 0.5, pz0 = zb + 0.6, pz1 = lzf - 0.6, ph = 2.0;
    for (const z of [pz0, pz1]) { beam(B, HM, [px0, lh, z], [px0, lh + ph, z], 0.07, { color: L.wood, moss: 0.05, ground: g0, round: 5 }); beam(B, HM, [px0, lh + ph, z], [wx - side * 0.05, lh + ph + 0.25, z], 0.06, { color: L.wood, moss: 0.05, ground: g0 }); }
    const nc = low ? 3 : 5, cc = pick([0, 2, 3], rng);
    for (let i = 0; i < nc; i++) { const z = pz0 + (i + 0.5) * (pz1 - pz0) / nc; if (rng() < 0.2) continue; beam(B, HM, [px0, lh + ph + 0.03 - 0.1 * Math.sin(i), z], [wx - side * 0.05, lh + ph + 0.28, z], 0.02, { color: worn(L.cloth[i % 2 ? 1 : cc], rng, 0.2), moss: 0, ground: g0 }, (pz1 - pz0) / nc * 0.9); }
    const fx = lcx + side * (lx1 - lx0) * 0.3 * (o.shop ? -1 : 1);
    ladder(B, HM, [fx, 0, lzf + 0.95], [fx, lh + 0.95, lzf + 0.05], 0.5, { color: V.rawWood, moss: 0.05, ground: g0 }); R.post(fx, lzf + 0.6, 0.3, 0, 1.2, { stand: false });
    pot(B, HM, lcx, lh, lzf - 0.8, 0.26, worn(L.tile[0], rng, 0.35), 2);
    roofBits.push([tcx, th, 'crown']);
  } else {
    // long and low on raking buttresses; two doors; a wind-catcher over one end
    const h = o.h ?? 2.5 + rng() * 0.45, x0 = -w / 2 + 0.1, x1 = w / 2 - 0.1, d1 = -w * 0.22 + (rng() - 0.5) * 0.6, sx2 = w * 0.2 + (rng() - 0.5) * 0.4;
    const ops = [door(d1 * side, h), o.shop ? shop(sx2 * side) : win(sx2 * side, 1.15, null, true), win(-side * w * 0.4, 1.3 + rng() * 0.3)];
    room(B, HM, R, { x0, x1, zb: zb + 0.6, zf: zf - 0.5, h, rng, g0, color: wash, low, openings: ops, par: { f: 0.25, b: 0.25, l: 0.25, r: 0.25 } });
    if (o.shop) shopfront(B, HM, R, ops[1], zf - 0.5, rng, { paint, low, signSide: side });
    const nb = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < nb; i++) {
      const bx = [side * w * 0.02, -side * w * 0.31, side * (w / 2 - 0.5)][i] + (rng() - 0.5) * 0.3, bh = h * (0.6 + rng() * 0.3), out = 0.75 + rng() * 0.4;
      plate(B, ch(HM, bx, 0, zf - 0.5 - 0.05, 0, -Math.PI / 2, 0), [[0, -0.4], [out, -0.4], [out * 0.85, 0.2], [0.16, bh], [0, bh]], 0.5 + rng() * 0.2, { color: worn(wash, rng, 0.1), moss: 0.3, ground: g0 });
      R.post(bx, zf - 0.3, 0.3, 0, bh * 0.7, { stand: false });
    }
    roofBits.push([-side * (w / 2 - 1.5), h, 'catcher']);
    for (let i = 0; i < (low ? 1 : 3); i++) pot(B, HM, side * (0.5 + i * 0.8), h, zb + 1.3 + rng(), 0.22 + rng() * 0.1, worn(pick([V.mud, L.tile[4], L.tile[0]], rng), rng, 0.35), 1.6 + rng());
  }

  // the roofline: a small dome on a drum, a wind-catcher, a chimney
  for (const [x, y, what] of roofBits) {
    const kind = what === 'crown' ? (rng() < 0.55 ? 'dome' : 'catcher') : what;
    const z = (zb + zf) / 2 - 0.3;
    if (kind === 'dome') {
      const r = 0.95 + rng() * 0.35;
      B.add(B.cyl(r * 1.02, r * 1.08, 0.5, 8, 1), ch(HM, x, y + 0.2, z), { color: worn(wash, rng, 0.05), moss: 0.2, ground: g0 });
      B.add(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), ch(HM, x, y + 0.44, z, 0, 0, 0, 1, 0.8 + rng() * 0.3, 1), { color: worn(rng() < 0.4 ? L.tile[0] : L.plaster[3], rng, 0.3), moss: 0.25, ground: g0, wet: 0.15 });
      if (!low) PARTS.late.finial(B, ch(HM, x, y + 0.44 + r * 0.82, z), { h: 0.8, rng });
    } else if (kind === 'catcher') {
      const ch2 = 1.9 + rng() * 0.9;
      B.add(B.box(0.95, ch2, 0.95, { seg: 1.2, chip: 0.03 }), ch(HM, x, y + ch2 / 2 - 0.05, z), { color: worn(wash, rng, 0.08), moss: 0.2, ground: g0 });
      for (let f = 0; f < 4; f++) for (const s of [-0.22, 0.22]) B.add(B.box(0.16, 0.7, 0.03, { seg: 9 }), ch(ch(HM, x, y + ch2 - 0.62, z, 0, f * Math.PI / 2, 0), s, 0, 0.47), { color: V.pane, moss: 0, ground: g0 });
      B.add(B.box(1.12, 0.07, 1.12, { seg: 9 }), ch(HM, x, y + ch2, z), { color: worn(L.tile[0], rng, 0.3), moss: 0.1, wet: 0.2, ground: g0 });
    }
    // a chimney, where there is a fire: a plastered stack under a tile, or a pot
    const cxh = x + (rng() - 0.5) * 2.2, czh = zb + 0.9, hh = 0.8 + rng() * 0.7;
    B.add(B.box(0.42, hh, 0.42, { seg: 9, chip: 0.03 }), ch(HM, cxh, y + hh / 2 + 0.2, czh), { color: worn(wash, rng, 0.25), moss: 0.2, ground: g0 });
    B.add(B.box(0.56, 0.05, 0.56, { seg: 9 }), ch(HM, cxh, y + hh + 0.3, czh, 0.1, rng(), 0.06), { color: worn(L.tile[1], rng, 0.4), moss: 0.1, ground: g0 });
    R.chimney = R.W(cxh, y + hh + 0.35, czh);
  }
  // a lamp's bracket by the door, a bench or a jar beside it
  const d0 = R.doors[0];
  if (d0) {
    const dl = new THREE.Vector3(d0.x, d0.y, d0.z).applyMatrix4(M.clone().invert()), bxs = dl.x + (rng() < 0.5 ? -1 : 1) * 0.95, wz = dl.z - 0.6;
    const hook = PARTS.late.bracket(B, ch(HM, bxs, 2.25, wz), { reach: 0.5 });
    R.lamp(bxs, 2.25 + hook.y, wz + hook.z);
  }
  R.tris = B.triangles - base;
  return R;
}
