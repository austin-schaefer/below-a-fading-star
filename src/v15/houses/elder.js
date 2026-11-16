// A house under Elder blocks (v15-V1): cyclopean blocks nobody alive could move, and a dwelling scraped into what
// they leave, made by people a fortieth of their weight. Three forms, three silhouettes:
//   'lean'      one block standing and one fallen against its head; in the cleft under the leaning one a plaster
//               front the size of a cupboard, a slot for a door and a curtain for a leaf, rubble packed above it to the
//               stone, a stovepipe out through the packing. Entered: a cleft room two metres wide and five tall at
//               the standing block, its ceiling the slab coming down to the floor; whoever lives here keeps pledges,
//               and they hang ticketed up the tall wall on a rack. (7.5 x 5.5 m or more.)
//   'overhang'  one great slab lying across two stubs, out of level, its front edge a metre and a half out over
//               the air; under it, set back in its shadow, a whole Late front whose roof is the stone. (6.6 x 4.6.)
//   'stack'     three blocks piled as they were left, the top one askew; a lean-to against the pile's flank where
//               there is room, and a hut the size of a dovecote on its shoulder, a ladder up to a ledge before its door (climbed). (4 x 3.6.)
// A form that does not fit its plot becomes the next that does; under 4 x 3.6 throws.
// The blocks go into o.E (a Builder for the Elder material) when it is given, else into B in the Elder colour.
// o: seed, w (9), d (7), form, E, back (the local z behind which the ground may rise: the room keeps in front of it), low.
import * as THREE from 'three';
import { L, H, V, E as EC, PARTS, rngOf, pick, ch, worn, site, beam, pot, plate, wallPoly, stop, bed, climbLadder, washing } from './kit.js';
import { room } from './late.js';

export const ELDER_FORMS = ['lean', 'overhang', 'stack'];

export function elder(B, M, o = {}) {
  const w = o.w ?? 9, d = o.d ?? 7, seed = o.seed | 0;
  if (w < 4 || d < 3.6) throw new Error(`elder: a plot ${w} x ${d} m is too small (4 x 3.6)`);
  const fits = { lean: w >= 7.5 && d >= 5.5, overhang: w >= 6.6 && d >= 4.6, stack: true };
  let form = o.form || ELDER_FORMS[seed % 3];
  for (let i = 0; i < 3 && !fits[form]; i++) form = ELDER_FORMS[(ELDER_FORMS.indexOf(form) + 1) % 3];
  const R = form === 'lean' ? lean(B, M, o) : form === 'overhang' ? overhang(B, M, o) : stack(B, M, o);
  R.form = form;
  return R;
}
const stoneOf = (rng, g0) => (k = 0) => ({ color: EC.stone.clone().multiplyScalar(0.92 + rng() * 0.16 - k), moss: 0.4, ground: g0 });
const washOf = (rng) => worn(L.plaster[rng() < 0.5 ? 0 : 3], rng, 0.1);

// ---------------------------------------------------------------- a slab on two stubs, a house in its shadow
function overhang(B, M, o) {
  const seed = o.seed | 0, rng = rngOf(seed, 41), w = o.w ?? 9, d = o.d ?? 7, low = !!o.low, g0 = M.elements[13], EB = o.E || B;
  const R = site(M, 'elder', { seed, w, d }), base = B.triangles, ebase = EB === B ? 0 : EB.triangles, stone = stoneOf(rng, g0);
  const s = seed % 2 ? -1 : 1, sw = 1.5 + rng() * 0.4, hA = 3.3 + rng() * 0.9, hB = hA - 0.5 - rng() * 0.7, sd = d - 2.0 - rng() * 0.4, xs = w / 2 - 0.25 - sw / 2;
  // the stubs (the higher on the side s), and the slab across them, pushed forward
  for (const [sx, hh, k] of [[s, hA, 1], [-s, hB, 2]]) { EB.add(EB.box(sw, hh + 1, sd, { seg: 3, chip: 0.16, seed: seed + k }), ch(M, sx * xs, (hh - 1) / 2, -0.5, 0, (rng() - 0.5) * 0.08, sx * (rng() - 0.3) * 0.03), stone()); R.wall(sx * xs, -0.5 - sd / 2 + sw / 2, sx * xs, -0.5 + sd / 2 - sw / 2, 0, hh, sw / 2); }
  const th = 1.5 + rng() * 0.5, tilt = Math.atan2(hA - hB, 2 * xs) * s, sl = w - 0.2, sdd = d - 0.9, zs = d / 2 - 0.15 - sdd / 2;
  EB.add(EB.box(sl, th, sdd, { seg: 3, chip: 0.2, seed: seed + 7 }), ch(M, 0, (hA + hB) / 2 + th / 2 * Math.cos(tilt) - 0.03, zs, 0, 0, tilt), stone(0.04));
  const under = (x) => (hA + hB) / 2 + Math.tan(tilt) * x; // the slab's under face over x
  // the house: a plaster front between the stubs, its roof the stone
  const x0 = -xs + sw / 2 + 0.06, x1 = xs - sw / 2 - 0.06, hr = Math.min(under(x0), under(x1)) - 0.12, zf = zs + sdd / 2 - 1.5 - rng() * 0.4, zb = Math.max(-d / 2 + 0.6, (o.back ?? -99) + 0.2, zf - 3.4);
  const wash = washOf(rng), ai = Math.floor(rng() * 4), paint = L.paint[ai], cx = (x0 + x1) / 2, rw = x1 - x0;
  const ops = [{ door: true, kind: rng() < 0.5 ? 'horseshoe' : 'ogee', x: cx - s * rw * 0.2, y: 0, w: 1.12, sp: Math.min(1.45, hr - 1.35), paint, frame: L.paint[(ai + 1) % 4] }, { kind: 'rect', x: cx + s * rw * 0.22, y: 1.2, w: 0.5, sp: 0.6, paint, stop: 'lit', one: s }];
  if (rw > 4.6) ops.push({ kind: 'ogee', x: cx + s * rw * 0.4, y: 1.5, w: 0.4, sp: 0.4, paint, stop: rng() < 0.5 ? 'lit' : 'dark', one: 0 });
  room(B, M, R, { x0, x1, zb, zf, h: hr, rng, g0, color: wash, low, openings: ops, par: { f: 0.02, b: 0.02, l: 0.02, r: 0.02 }, batter: 0 });
  // rubble packed between the plaster's head and the stone
  wallPoly(B, ch(M, 0, 0, zf - 0.4), [[x0, hr - 0.1], [x1, hr - 0.1], [x1, under(x1) + 0.06], [x0, under(x0) + 0.06]], null, 0.3, { color: worn(V.mud, rng, 0.3).multiplyScalar(0.8), course: 0.19, moss: 0.3, ground: g0 });
  // in the porch the stone makes: a bench that is a drum on its side, jars, a lamp's bracket, the stovepipe out of the packing
  const dl = cx - s * rw * 0.2, bx = dl + s * 0.95;
  PARTS.late.bracket(B, ch(M, bx, 2.1, zf), { reach: 0.45 }); R.lamp(bx, 2.12, zf + 0.45);
  PARTS.heliarch.drum(B, ch(M, cx + s * (rw / 2 - 0.5), -0.3, zf + 0.6), { r: 0.3, h: 0.78, moss: 0.5 }); R.post(cx + s * (rw / 2 - 0.5), zf + 0.6, 0.3, 0, 0.48);
  for (let i = 0; i < (low ? 1 : 3); i++) pot(B, M, cx - s * (rw / 2 - 0.45 - i * 0.42), 0, zf + 0.35 + (i % 2) * 0.3, 0.17 + rng() * 0.08, worn(pick([V.mud, L.tile[4], L.tile[0]], rng), rng, 0.3), 1.8 + rng(), 6);
  { const px = cx + s * rw * 0.05, py = hr + 0.12; beam(B, M, [px, py, zf - 0.5], [px, py + 0.05, zf + 1.3], 0.17, { color: L.iron, iron: 0.55, moss: 0, ground: g0, round: 6 }); beam(B, M, [px, py + 0.05, zf + 1.3], [px, py + 0.5, zf + 1.42], 0.16, { color: L.iron, iron: 0.55, moss: 0, ground: g0, round: 6 }); R.chimney = R.W(px, py + 0.55, zf + 1.42); }
  // on the stone: nothing of theirs but a pole and a rag, where somebody once got up
  if (!low) { const px = -s * (xs - 0.3), py = under(px) + th * Math.cos(tilt); beam(B, M, [px, py - 0.1, zs], [px + 0.1, py + 2.2, zs], 0.06, { color: V.rawWood, moss: 0.1, ground: g0 + py, round: 5 }); B.add(B.box(0.5, 0.34, 0.014, { seg: 9 }), ch(M, px + 0.35, py + 1.95, zs, 0, 0, -0.12), { color: worn(V.saffron, rng, 0.25), moss: 0, ground: g0 }); }
  R.tris = B.triangles - base; R.etris = EB === B ? 0 : EB.triangles - ebase; R.top = Math.max(hA, hB) + th + 0.3;
  return R;
}

// ---------------------------------------------------------------- three blocks piled, a hut on the shoulder
function stack(B, M, o) {
  const seed = o.seed | 0, rng = rngOf(seed, 42), w = o.w ?? 9, d = o.d ?? 7, low = !!o.low, g0 = M.elements[13], EB = o.E || B;
  const R = site(M, 'elder', { seed, w, d }), base = B.triangles, ebase = EB === B ? 0 : EB.triangles, stone = stoneOf(rng, g0);
  const s = seed % 2 ? -1 : 1, flank = w >= 6.8; // the pile on the side s; a lean-to on the other where there is room
  const bw = flank ? Math.min(4.6, w * 0.52) + rng() * 0.3 : w - 1.3, bd = Math.min(d - 0.9, 4.6 + rng() * 0.6), bh = 2.6 + rng() * 0.5, bx = s * (w / 2 - 0.6 - bw / 2), bz = -d / 2 + 0.35 + bd / 2;
  EB.add(EB.box(bw, bh + 1, bd, { seg: 3, chip: 0.18, seed }), ch(M, bx, (bh - 1) / 2, bz, 0, 0, s * 0.012), stone());
  R.wall(bx - bw / 2 + Math.min(bw, bd) / 2, bz, bx + bw / 2 - Math.min(bw, bd) / 2, bz, 0, bh, Math.min(bw, bd) / 2 - 0.05);
  // the second, set back and to the pile's outer side so the first keeps a shoulder; the third askew on top
  const w2 = bw * (0.62 + rng() * 0.1), d2 = bd * (0.72 + rng() * 0.12), h2 = 2.2 + rng() * 0.5, x2 = bx + s * (bw - w2) / 2 * 0.9, z2 = bz - (bd - d2) / 2 * 0.8, yaw2 = (rng() - 0.5) * 0.16;
  EB.add(EB.box(w2, h2, d2, { seg: 3, chip: 0.18, seed: seed + 5 }), ch(M, x2, bh + h2 / 2 - 0.02, z2, 0, yaw2, -s * 0.02), stone(0.03));
  const w3 = w2 * (0.6 + rng() * 0.15), h3 = 1.5 + rng() * 0.5, d3 = d2 * 0.75;
  EB.add(EB.box(w3, h3, d3, { seg: 3, chip: 0.2, seed: seed + 11 }), ch(M, x2 - s * (w2 - w3) * 0.2, bh + h2 + h3 / 2 - 0.12, z2 + 0.1, 0.03, 0.35 + rng() * 0.3, s * (0.1 + rng() * 0.08)), stone(0.06));
  const wash = washOf(rng), ai = Math.floor(rng() * 4), paint = L.paint[ai];
  // the hut on the shoulder: on the first block's top, on the side away from the second, its window lit
  const shx0 = Math.min(bx - s * bw / 2, x2 - s * w2 / 2), shx1 = Math.max(bx - s * bw / 2, x2 - s * w2 / 2), shw = shx1 - shx0;
  const hutOnFront = shw < 1.5, hm = ch(M, 0, bh - 0.02, 0);
  const rec = { door: () => {}, window: (x, y, z, lit) => R.window(x, y + bh, z, lit), wall: () => {} };
  // the hut is never the same hut: its height, its window's shape, and what is on its roof (a dome the size of a
  // bread oven, a chimney, a jar and a pole with a rag)
  const hk = pick(['rect', 'ogee', 'horseshoe'], rng), hcap = pick(['dome', 'chimney', 'pole', 'none'], rng);
  const cap = (x0, x1, zb, zf, hh) => { const cx = (x0 + x1) / 2, cz = (zb + zf) / 2, y = bh + hh, o2 = { color: worn(wash, rng, 0.12), moss: 0.12, ground: g0 + bh };
    if (hcap === 'dome') { const r = Math.min(x1 - x0, zf - zb) * 0.36; B.add(new THREE.SphereGeometry(r, low ? 7 : 9, 3, 0, Math.PI * 2, 0, Math.PI / 2), ch(M, cx, y + 0.02, cz, 0, 0, 0, 1, 0.75, 1), o2); R.top = Math.max(R.top || 0, y + r); }
    else if (hcap === 'chimney') { const hc = 0.7 + rng() * 0.5; B.add(B.box(0.36, hc, 0.36, { seg: 9, chip: 0.03 }), ch(M, cx - s * (x1 - x0) * 0.25, y + hc / 2 + 0.05, zb + 0.4), o2); R.top = Math.max(R.top || 0, y + hc); }
    else if (hcap === 'pole') { const px = cx + s * (x1 - x0) * 0.3; beam(B, M, [px, y, cz], [px + 0.1, y + 1.7, cz], 0.045, { color: V.rawWood, moss: 0.05, ground: g0 + bh, round: 5 }); B.add(B.box(0.5, 0.3, 0.014, { seg: 9 }), ch(M, px + 0.33, y + 1.5, cz, 0, 0, -0.15), { color: worn(V.madder, rng, 0.45), moss: 0, ground: g0 + bh }); pot(B, M, cx - s * 0.3, y + 0.05, cz, 0.2, worn(L.tile[0], rng, 0.4), 1.6); }
  };
  // (v15-W2, the owner's rule on ladders) the ladder is climbed, so it lands somewhere: the hut stands back LEDGE from
  // the first block's brink and the ladder comes up onto that ledge (a floor, its edges held) before the hut's door
  const LEDGE = 0.9, front1 = bz + bd / 2, front2 = z2 + d2 / 2 + 0.12; // (the second block is turned a little: its corners come forward)
  let lx, lz = front1, hut = false, hx0, hx1, hzb, hzf, hh;
  if (!hutOnFront) {
    hx0 = shx0 + 0.12; hx1 = shx1 - 0.05; hzf = front1 - LEDGE - rng() * 0.08; hzb = Math.max(bz - bd / 2 + 0.3, hzf - 2.4); hh = 1.9 + rng() * 0.5;
    hut = true;
  } else {
    // (no shoulder: the hut on the front of the first block's top, before the second)
    const hw = Math.min(2.4, bw - 0.8); hx0 = bx - hw / 2; hx1 = hx0 + hw; hzb = front2 - 0.17; hzf = front1 - LEDGE; hh = 1.9 + rng() * 0.4;
    hut = hzf - hzb > 1.3;
  }
  if (hut) {
    const hc = (hx0 + hx1) / 2, door = hx1 - hx0 >= 1.5; // (a door 0.6 wide needs the front 1.5: a narrower hut keeps its window and is entered by it)
    room(B, hm, rec, { x0: hx0, x1: hx1, zb: hzb, zf: hzf, h: hh, rng, g0: g0 + bh, color: wash, low, patches: 1, openings: [door ? { door: true, kind: hk, x: hc, y: 0, w: 0.6, sp: 1.1, paint } : { kind: hk, x: hc, y: 0.7, w: 0.46, sp: hk === 'rect' ? 0.5 : 0.4, paint, stop: 'lit', one: -s }], par: { f: 0.12, b: 0.12, l: 0.12, r: 0.12 } });
    cap(hx0, hx1, hzb, hzf, hh);
    R.wall(hx0 + (hzf - hzb) / 2, (hzb + hzf) / 2, hx1 - (hzf - hzb) / 2, (hzb + hzf) / 2, bh, hh + 0.2, (hzf - hzb) / 2 + 0.02);
    R.floor(hc, lz - LEDGE / 2 - 0.02, hx1 - hx0 + 0.1, LEDGE - 0.1, bh, { layer: 1 });
    lx = hc - s * 0.1;
    const far = Math.abs(hx0 + 0.3 - lx) > Math.abs(hx1 - 0.3 - lx) ? hx0 + 0.3 : hx1 - 0.3;
    climbLadder(B, M, R, [lx, 0, lz + 0.95], [lx, bh + 0.7, lz + 0.08], 0.5, { color: V.rawWood, moss: 0.05, ground: g0 }, { y1: bh, head: [lx, lz - 0.45], away: [far, lz - 0.45] });
    R.post(lx, lz + 0.55, 0.32, 0, 1.3, { stand: false });
    R.door(lx, lz + 1.5, { w: 0.5, ladder: true }); // (the way in is the ladder, to the hut's door)
  } else lx = bx - s * (Math.min(2.4, bw - 0.8) / 2 + 0.25);
  if (flank) {
    // the lean-to against the pile's flank: one room, its door and a window, a chimney, jars on its roof
    const x0 = s > 0 ? -w / 2 + 0.2 : bx + bw / 2 - 0.08, x1 = s > 0 ? bx - bw / 2 + 0.08 : w / 2 - 0.2, zf = Math.min(d / 2 - 0.3, bz + bd / 2 + 0.3 + rng() * 0.5), zb = Math.max(-d / 2 + 0.5, (o.back ?? -99) + 0.2, zf - 3.6), hh = 2.2 + rng() * 0.3, cx = (x0 + x1) / 2, rw = x1 - x0;
    room(B, M, R, { x0, x1, zb, zf, h: hh, rng, g0, color: wash, low, openings: [{ door: true, kind: rng() < 0.5 ? 'horseshoe' : 'ogee', x: cx + s * rw * 0.18, y: 0, w: 1.12, sp: 1.3, paint, frame: L.paint[(ai + 1) % 4] }, { kind: 'rect', x: cx - s * rw * 0.25, y: 1.15, w: 0.5, sp: 0.6, paint, stop: rng() < 0.6 ? 'lit' : 'dark', one: -s }], par: { f: 0.3, b: 0.2, l: 0.25, r: 0.25 } });
    const hc = 0.8 + rng() * 0.5; B.add(B.box(0.4, hc, 0.4, { seg: 9, chip: 0.03 }), ch(M, cx - s * 0.6, hh + hc / 2 + 0.15, zb + 0.6), { color: worn(wash, rng, 0.2), moss: 0.1, ground: g0 });
    R.chimney = R.W(cx - s * 0.6, hh + hc + 0.2, zb + 0.6);
    for (let i = 0; i < (low ? 1 : 3); i++) pot(B, M, cx + (rng() - 0.5) * (rw - 1.4), hh, zb + 1.2 + rng() * Math.max(0.2, zf - zb - 2.2), 0.2 + rng() * 0.1, worn(pick([V.mud, L.tile[4], L.tile[0]], rng), rng, 0.35), 1.6 + rng());
    const dx = cx + s * rw * 0.18 - s * 0.95; PARTS.late.bracket(B, ch(M, dx, 2.0, zf), { reach: 0.45 }); R.lamp(dx, 2.02, zf + 0.45);
    if (!low) { const a = [cx - s * (rw / 2 - 0.4), hh + 1.9, zf - 0.5], b = [bx - s * (bw / 2 - 0.1), bh + 1.3, bz + bd / 2 - 0.3]; beam(B, M, [a[0], hh, a[2]], a, 0.06, { color: V.rawWood, moss: 0.05, ground: g0, round: 5 }); beam(B, M, [b[0], bh, b[2]], b, 0.06, { color: V.rawWood, moss: 0.05, ground: g0, round: 5 }); washing(B, M, a, b, rng, 4); }
  } else { const lxp = lx + s * 0.9; PARTS.late.bracket(B, ch(M, lxp, 2.1, lz), { reach: 0.45 }); R.lamp(lxp, 2.12, lz + 0.45); }
  R.tris = B.triangles - base; R.etris = EB === B ? 0 : EB.triangles - ebase; R.top = bh + h2 + h3;
  return R;
}

// ---------------------------------------------------------------- one standing, one fallen against it
function lean(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 4), w = o.w ?? 9, d = o.d ?? 7, low = !!o.low, g0 = M.elements[13], EB = o.E || B;
  const R = site(M, 'elder', { seed, w, d }), base = B.triangles, ebase = EB === B ? 0 : EB.triangles;
  const s = seed % 2 ? -1 : 1; // which side the standing block is on (s = 1: the right, +x)
  const X = (x) => -s * x; // the plan below is drawn with the standing block at -x, and mirrored for s = 1
  const stone = (k = 0) => ({ color: EC.stone.clone().multiplyScalar(0.92 + rng() * 0.16 - k), moss: 0.4, ground: g0 });
  // the standing block
  const aw = Math.min(w * 0.36, 2.7 + rng() * 0.8), ah = 5.3 + rng() * 1.3, ad = d - 1.4 - rng() * 0.6, xl = -w / 2 + 0.3, xa = xl + aw, xf = w / 2 - 2.35 - rng() * 0.3;
  EB.add(EB.box(aw, ah + 1, ad, { seg: 3, chip: 0.16, seed }), ch(M, X(xl + aw / 2), (ah - 1) / 2, -0.1, 0, 0, -s * (0.01 + rng() * 0.025)), stone());
  // the leaning one: its under face from its foot at (xf, 0) to where it rests on the standing block's head
  const rx = xa - 0.35, ry = ah - 0.25, ul = Math.hypot(rx - xf, ry), ux = (rx - xf) / ul, uy = ry / ul, nx = uy, ny = -ux;
  const sth = 1.35 + rng() * 0.45, over = 0.9 + rng() * 1.6, slen = ul + over + 1.0, sd = d - 0.5, mid = slen / 2 - 1.0;
  EB.add(EB.box(slen, sth, sd, { seg: 3, chip: 0.18, seed: seed + 9 }), ch(M, X(xf + ux * mid + nx * sth / 2), uy * mid + ny * sth / 2, 0.05, 0, 0, -s * Math.atan2(uy, ux) + (s < 0 ? Math.PI : 0)), stone(0.04));
  // a chock under its foot, and a spall fallen off its head
  EB.add(EB.box(1.5, 1.3, 1.9, { seg: 3, chip: 0.14, seed: seed + 3 }), ch(M, X(xf + 0.85), 0.2, sd / 2 - 1.5, 0.05, 0.2, s * 0.2), stone());
  const yl = (x) => ry * (xf - x) / (xf - rx); // the under face over x
  // the room: from the standing block's face (xa) to where the slab comes down to head height
  const zfr = sd / 2 - 1.25 - rng() * 0.3, zbk = Math.max(-ad / 2 + 0.5, (o.back ?? -99) + 0.3), hp = 2.75 + rng() * 0.35, xh = xf - (xf - rx) * hp / ry, xHead = xf - (xf - rx) * 1.95 / ry;
  const dw = 1.06, xd = xa + 0.25 + dw / 2 + rng() * 0.15, dh = Math.min(hp - 0.2, 2.35 + rng() * 0.2, ry * (xf - xd - dw / 2) / (xf - rx) - 0.3); // (the slot's head clear of the slab)
  const wash = worn(L.plaster[rng() < 0.5 ? 0 : 3], rng, 0.28), ai = Math.floor(rng() * 4);
  const mir = (pts) => pts.map(([x, y]) => [X(x), y]);
  // the front: plaster to hp, the slot in it, a pane beside it; packed rubble from there up to the stone
  const wx = xd + dw / 2 + 0.55, wy = 1.25, pane = ry * (xf - wx - 0.16) / (xf - rx) > wy + 0.75; // a pane beside the slot, where the slab leaves room
  wallPoly(B, ch(M, 0, 0, zfr - 0.16), mir([[xa - 0.12, -0.5], [xf + 0.1, -0.5], [xf + 0.1, 0.02], [xh + 0.06, hp + 0.04], [xa - 0.12, hp]]), [mir([[xd - dw / 2, 0], [xd + dw / 2, 0], [xd + dw / 2, dh], [xd, dh + 0.14], [xd - dw / 2, dh]]), ...(pane ? [mir([[wx - 0.16, wy], [wx + 0.16, wy], [wx + 0.16, wy + 0.42], [wx - 0.16, wy + 0.42]])] : [])], 0.32, { color: wash, moss: 0.3, ground: g0 });
  if (pane) { stop(B, ch(M, X(wx), wy, zfr - 0.16), 0.32, 0.42, 'lit', rng); R.window(X(wx), wy + 0.2, zfr, true); }
  wallPoly(B, ch(M, 0, 0, zfr - 0.4), mir([[xa - 0.12, hp - 0.2], [xh + 0.3, hp - 0.2], [xa - 0.12, yl(xa - 0.12) + 0.1]]), null, 0.3, { color: worn(V.mud, rng, 0.3).multiplyScalar(0.8), course: 0.19, moss: 0.45, ground: g0 });
  // the curtain, pulled to one side on its pole; a threshold
  beam(B, M, [X(xd - dw / 2 - 0.2), dh + 0.22, zfr + 0.06], [X(xd + dw / 2 + 0.25), dh + 0.2, zfr + 0.06], 0.035, { color: L.wood, moss: 0, ground: g0, round: 5 });
  for (let i = 0; i < 3; i++) B.add(B.box(0.13, dh + 0.1, 0.05, { seg: 0.7 }), ch(M, X(xd + dw / 2 + 0.12 - i * 0.1), (dh + 0.1) / 2 + 0.06, zfr + 0.05 + (i % 2) * 0.03), { color: worn(L.cloth[i % 2 ? 1 : [0, 2, 3][ai % 3]], rng, 0.18), moss: 0, ground: g0, disp: 0.012, dispScale: 5 });
  B.add(B.box(dw + 0.3, 0.3, 0.6, { seg: 9, chip: 0.03 }), ch(M, X(xd), -0.11, zfr), { color: H.stone, moss: 0.4, ground: g0 });
  PARTS.late.bracket(B, ch(M, X(Math.min(xh - 0.5, xd + dw / 2 + 0.75)), 2.15, zfr), { reach: 0.45 }); R.lamp(X(Math.min(xh - 0.5, xd + dw / 2 + 0.75)), 2.17, zfr + 0.45);
  // the stovepipe out through the packing, and its soot up the stone
  { const px = xa + 0.55, py = hp + 0.45; beam(B, M, [X(px), py, zfr - 0.5], [X(px), py + 0.1, zfr + 0.35], 0.18, { color: L.iron, iron: 0.55, moss: 0, ground: g0, round: 6 }); beam(B, M, [X(px), py + 0.1, zfr + 0.35], [X(px), py + 0.75, zfr + 0.42], 0.17, { color: L.iron, iron: 0.55, moss: 0, ground: g0, round: 6 }); R.chimney = R.W(X(px), py + 0.8, zfr + 0.42); }
  // inside: a floor of flags, the back wall with its hearth, the pledges
  B.add(B.box(xf - xa + 0.3, 0.3, zfr - zbk + 0.1, { seg: 1.2, chip: 0.02 }), ch(M, X((xa + xf) / 2), -0.1, (zfr + zbk) / 2 - 0.1), { color: worn(V.flag, rng, 0.1), course: 0.9, moss: 0.15, ground: g0 - 1 });
  wallPoly(B, ch(M, 0, 0, zbk - 0.14), mir([[xa - 0.12, -0.5], [xf + 0.1, -0.5], [xf + 0.1, 0.02], [xa - 0.12, yl(xa - 0.12) + 0.1]]), null, 0.3, { color: worn(wash, rng, 0.2), moss: 0.1, ground: g0 - 1, emit: [0.05, 0.03, 0.015, 1] });
  { // the hearth: a plastered hood, the fire's mouth
    const hx = xa + 1.15, m = ch(M, X(hx), 0, zbk + 0.02);
    plate(B, m, [[-0.55, 0], [0.55, 0], [0.55, 0.9], [0.22, 2.3], [-0.22, 2.3], [-0.55, 0.9]], 0.5, { color: worn(wash, rng, 0.3), moss: 0, ground: g0 - 1, emit: [0.05, 0.03, 0.015, 1] });
    B.add(B.box(0.7, 0.55, 0.03, { seg: 9 }), ch(m, 0, 0.36, 0.25), { color: V.soot, moss: 0, ground: g0 - 1, emit: [V.ember[0] * 0.8, V.ember[1] * 0.8, V.ember[2] * 0.8, 1] });
    R.light(X(hx), 0.7, zbk + 0.7, '#ff8a3a', 2.6, 10);
    R.post(X(hx), zbk + 0.25, 0.5, 0, 2.3, { stand: false });
  }
  { // the rack up the standing block's face, and what hangs on it, each thing with its ticket
    const z0 = zbk + 1.0, z1 = zfr - 0.55, rxk = xa + 0.06, rows = [1.25, 2.15, 3.05, 3.95].filter((y) => y < yl(xa + 0.3) - 0.4), wood = { color: L.wood, moss: 0, ground: g0 - 2 };
    for (const z of [z0, z1]) beam(B, M, [X(rxk), 0, z], [X(rxk), rows[rows.length - 1] + 0.3, z], 0.07, wood);
    for (const y of rows) beam(B, M, [X(rxk + 0.02), y, z0 - 0.15], [X(rxk + 0.02), y, z1 + 0.15], 0.05, wood);
    const glowC = (col) => ({ color: col, moss: 0, ground: g0 - 2, emit: [col.r * 0.07, col.g * 0.07, col.b * 0.07, 1] });
    let k = 0;
    for (const y of rows) for (let z = z0 + 0.25; z < z1 - 0.1; z += 0.62 + rng() * 0.25) {
      const px = rxk + 0.13, what = (k++ + seed) % 6, m = ch(M, X(px), y - 0.07, z, 0, -s * Math.PI / 2, 0);
      if (low && k % 2) continue;
      beam(B, M, [X(rxk + 0.02), y, z], [X(px), y - 0.07 - [-0.03, 0.14, 0.06, 0.08, 0.07, 0.06][what], z], 0.012, wood); // its cord from the rail
      if (what === 0) { B.add(new THREE.IcosahedronGeometry(0.11, 0), ch(m, 0, -0.2, 0, 0, 0, 0, 1, 1.3, 1), glowC(L.gilt)); B.add(B.box(0.012, 0.14, 0.012, { seg: 9 }), ch(m, 0, -0.03, 0), wood); }
      else if (what === 1) pot(B, m, 0, -0.42, 0, 0.13, worn(L.tile[0], rng, 0.3), 2.2, 6);
      else if (what === 2) for (const q of [-0.07, 0.07]) B.add(B.box(0.09, 0.3, 0.2, { seg: 9 }), ch(m, q, -0.2, 0.02, 0.1, 0, q), glowC(worn(L.paint[1], rng, 0.3)));
      else if (what === 3) B.add(B.cyl(0.17, 0.17, 0.03, 10, 1), ch(m, 0, -0.24, 0, Math.PI / 2, 0, 0), glowC(H.bronzeDull));
      else if (what === 4) B.add(B.cyl(0.08, 0.08, 0.5, 6, 1), ch(m, 0, -0.14, 0, 0, 0, Math.PI / 2), glowC(worn(L.cloth[k % 4], rng, 0.2)));
      else PARTS.late.finial(B, ch(m, 0, -0.6, 0), { h: 0.55, rng });
      B.add(B.box(0.09, 0.12, 0.008, { seg: 9 }), ch(m, 0.16, -0.14, 0.02, 0, 0, 0.2 - rng() * 0.4), { color: L.plaster[3], moss: 0, ground: g0 - 2, emit: [0.16, 0.14, 0.1, 1] }); // its ticket
    }
  }
  // under the slope, where nobody can stand: a pallet and jars
  if (xf - xHead > 1.3) { bed(B, M, X(xHead + 0.75), 0.05, (zbk + zfr) / 2 - 0.3, 0, rng, { w: 0.8, len: 1.8 }); R.post(X(xHead + 0.75), (zbk + zfr) / 2 - 0.3, 0.55, 0, 0.6, { stand: false }); }
  for (let i = 0; i < (low ? 1 : 3); i++) pot(B, M, X(xHead + 0.4 + i * 0.45), 0.05, zfr - 0.55 - (i % 2) * 0.35, 0.17 + rng() * 0.08, worn(pick([V.mud, L.tile[4], L.tile[0]], rng), rng, 0.3), 1.8 + rng(), 6);
  // outside, in the porch the slab makes: a jar, a stool that is a drum
  { const sx2 = Math.max(xh - 0.2, xd + dw / 2 + 0.85); PARTS.heliarch.drum(B, ch(M, X(sx2), -0.3, zfr + 0.75), { r: 0.3, h: 0.78, moss: 0.5 }); R.post(X(sx2), zfr + 0.75, 0.3, 0, 0.48); } // (clear of the slot)
  // floors and walls. The room and the sill through the front
  const fx0 = xa, fx1 = xHead + 0.1;
  R.floor(X((fx0 + fx1) / 2), (zbk + zfr) / 2 - 0.1, fx1 - fx0, zfr - zbk - 0.2, 0.05, { keep: false });
  R.floor(X(xd), zfr - 0.1, dw, 0.9, 0.05, { keep: false });
  R.door(X(xd), zfr + 0.9, { enter: true, w: dw });
  R.wall(X(xa + 0.02), zfr - 0.16, X(xd - dw / 2 - 0.13), zfr - 0.16, 0, hp, 0.13);
  R.wall(X(xd + dw / 2 + 0.13), zfr - 0.16, X(xf), zfr - 0.16, 0, hp, 0.13);
  R.wall(X(xa), zbk + 0.02, X(xf), zbk + 0.02, 0, 5, 0.15);
  R.wall(X(xHead + 0.3), zbk, X(xHead + 0.3), zfr - 0.3, 0, 2, 0.2);
  // the blocks themselves
  R.wall(X(xl + aw / 2), -0.1 - ad / 2 + aw / 2, X(xl + aw / 2), -0.1 + ad / 2 - aw / 2, 0, ah, aw / 2);
  { const cx2 = (xHead + 0.5 + xf + sth * 0.9) / 2, r2 = (xf + sth * 0.9 - xHead - 0.5) / 2; R.wall(X(cx2), -sd / 2 + r2, X(cx2), sd / 2 - r2, 0, 3, r2); }
  R.tris = B.triangles - base; R.etris = EB === B ? 0 : EB.triangles - ebase; R.top = Math.max(ah, ry + over * uy);
  return R;
}
