// The Lees' shops (v15-Q3): three in the Low Rung's vaults (the vaults and their round arches are the bones':
// src/v15/ways/misc.js undercroft), one stall on the square, one house at the bench's east end. Each mouth is closed
// its own way and each has the furniture of one trade and none of its goods (batch 3 brings those):
//   the Lagan   lees-shop-4: the dead-letter counter. A counter across the mouth and over it a rack of
//               pigeonholes to the arch's crown, a hatch left in the middle; the lit room shows through every hole.
//   the Ullage  lees-shop-5: the vintner. A plank shutter propped out from the arch's head, a low
//               counter and a half gate, and across the mouth a beam with twelve hooks.
//   the Welt    lees-shop-6: the slipper-maker. A plank wall with a wicket in it and a window; on the
//               sill an iron stand for a last, half a curtain; a trying-on bench outside.
//   the Tare    lees-stall-salt: the salt-weigher. A door-slab counter on two drums under one cloth, a
//               curtain behind, a balance with a perch on its beam too small for any bird, a peg nobody's pack hangs on.
//   the Rebate  lees-house-3: the picture-framer. Empty frames leaned against the front, and out on the
//               brink a great frame on two posts, sized for the view and holding it.
// (A lagan is cargo lying on the sea's floor; ullage, what a bottle lacks of full; a welt, a shoe's seam; tare, the
// weight of the vessel alone; a rebate, the groove a picture sits in.)
import * as THREE from 'three';
import { L, H, V, PARTS, rngOf, ch, worn, beam, leaf, site, plotMatrix, awning, wallPoly, limeGlow, dirty } from '../../houses/kit.js';
import { makePlot } from '../../houses/index.js';
import { Soup } from './light.js';
import { tradeBoard, bottle, slipper, last, cask, saltCone, sack } from './goods.js';

const BASIS = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)); // a standing slab laid flat along x

export function shops(Q) {
  const { B, plan, ctx, low } = Q, built = ctx.lappet.built;
  const Rz = plan.RISERS.find((r) => r.key === 'low');
  const lit = (k) => [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1];

  // what the three vaults share: the frame, the arch, a lit plaster partition at the back with two bare shelves, a
  // lamp from the crown, flags before the mouth, a sign and a bracket lamp
  const vault = (name, seed, signSide, trade) => {
    const p = plan.plot(name), bu = built[name], M = plotMatrix(p), rng = rngOf(seed, 5), g0 = p.y;
    const R = site(M, 'undercroft', { seed, w: p.w, d: p.d }); R.name = name; R.form = 'riser';
    const zf = Rz.D - p.D, rad = bu.rad, sp = bu.spring - p.y, hw = (p.w - 1) / 2 - 0.07, top = Rz.top - 0.42 - p.y, rise = top - sp - 0.1 - 0.03;
    const yArch = (x) => sp + Math.sqrt(Math.max(0, rad * rad - x * x));
    const wash = worn(L.plaster[seed % 2 ? 0 : 3], rng, 0.2), zb = zf - 2.35;
    { const pts = [[-hw, -0.05], [hw, -0.05], [hw, sp]]; for (let i = 1; i < 8; i++) { const a = (i / 8) * Math.PI; pts.push([Math.cos(a) * hw, sp + Math.sin(a) * rise]); } pts.push([-hw, sp]);
      wallPoly(B, ch(M, 0, 0, zb), pts, null, 0.1, { color: wash, moss: 0.05, ground: g0 - 2, emit: lit(0.2) }); }
    for (const y of [0.9, 1.45]) { const sw = 2 * hw - 0.5; B.add(B.box(sw, 0.035, 0.26, { seg: 9 }), ch(M, 0, y, zb + 0.18), { color: L.wood, moss: 0, ground: g0 - 2, emit: lit(0.05) }); R.shelf(0, y + 0.02, zb + 0.18, sw, 0.26); }
    B.add(new THREE.IcosahedronGeometry(0.075, 0), ch(M, 0, top - 0.5, zf - 1.0, 0, 0, 0, 1, 1.3, 1), { color: new THREE.Color('#201008'), moss: 0, ground: g0 - 3, emit: lit(0.9) });
    beam(B, M, [0, top - 0.42, zf - 1.0], [0, top + 0.03, zf - 1.0], 0.012, { color: L.iron, iron: 1, moss: 0, ground: g0 - 3 });
    R.window(0, sp + 0.4, zf + 0.25, true);
    // flags before the mouth
    const fl = new Soup(), z0 = zf + 0.55, z1 = p.d / 2;
    for (let z = z0; z < z1 - 0.2;) { const dz = Math.min(z1 - z, 0.5 + rng() * 0.25); for (let x = -p.w / 2 + rng() * 0.3; x < p.w / 2 - 0.3;) { const w = Math.min(p.w / 2 - x, 0.55 + rng() * 0.5); if (rng() > 0.1) { const col = worn(rng() < 0.2 ? H.stone : V.flag, rng, 0.16, 0.2), y = 0.04 + rng() * 0.012; fl.slab([[x + 0.015, y, z + 0.015], [x + w - 0.015, y, z + 0.015], [x + w - 0.015, y, z + dz - 0.015], [x + 0.015, y, z + dz - 0.015]], 0.07, col, col.clone().multiplyScalar(0.55)); } x += w; } z += dz; }
    fl.flush(B, { color: V.flag, moss: 0.45, wet: 0.1, ground: g0 - 0.2 }, M);
    const zw = zf, sx = signSide * (rad + 0.62), from = B.count;
    tradeBoard(B, ch(M, Math.max(-p.w / 2 + 0.7, Math.min(p.w / 2 - 0.7, sx)), Math.min(Rz.top - p.y - 0.5, sp + rad + 0.2), zw), trade, rng, { size: 0.66, turn: signSide * 0.75 });
    dirty(B, from, 0.25, rng);
    const lx = -signSide * Math.min(p.w / 2 - 0.7, rad + 0.5), ly = sp + rad - 0.35;
    PARTS.late.bracket(B, ch(M, lx, ly, zw), { reach: 0.5 }); R.lamp(lx, ly + 0.02, zw + 0.5);
    Q.lampSrc.push({ ...R.W(0, sp + 0.7, zf - 0.7), r: 3.6, k: 0.55, col: V.lit.map((v) => v / 2.3) }); // the lit room, on what stands in its mouth
    return { p, M, R, rng, g0, zf, zb, rad, sp, yArch, wash, zw, zm: zf + 0.03 };
  };
  const wd = (rng, k = 0.2) => ({ color: worn(L.wood, rng, k, 0.14), moss: 0.1, ground: 0 });
  // a counter in the mouth: a slab on plaster, the mouth shut under it
  const counter = (v, x0, x1, top) => {
    const { M, R, rng, g0, zm, wash } = v, w = x1 - x0, cx = (x0 + x1) / 2;
    B.add(B.box(w - 0.02, top - 0.08 + 0.3, 0.3, { seg: 1.2, chip: 0.03, seed: v.R.seed }), ch(M, cx, (top - 0.08 - 0.3) / 2, zm), { color: worn(wash, rng, 0.34, 0.1), moss: 0.3, wet: 0.2, ground: g0 });
    PARTS.heliarch.slab(B, ch(M, x0, top - 0.07, zm + 0.02).multiply(BASIS), { w: 0.62, h: w, d: 0.14 });
    R.counter(cx, top, zm + 0.75, w);
  };

  // ---------------------------------------------------------------- the Lagan
  { const v = vault('lees-shop-4', 41, 1, 'letter'), { M, R, rng, g0, zm, rad, sp, yArch } = v, w = wd(rng), top = 0.98;
    counter(v, -rad + 0.01, rad - 0.01, top);
    const zr = zm - 0.05, dep = 0.34, x0 = -rad + 0.1, n = 8, cw = (2 * rad - 0.2) / n, rows = [top + 0.015, 1.31, 1.62, 1.93];
    for (let i = 0; i <= n; i++) { const x = x0 + i * cw, y0 = i === n / 2 ? rows[2] : top, y1 = yArch(Math.abs(x) + 0.03) - 0.03; if (y1 - y0 > 0.12) B.add(B.box(0.03, y1 - y0, dep, { seg: 9 }), ch(M, x, (y0 + y1) / 2, zr), { ...w, ground: g0 }); }
    rows.forEach((y, k) => { const half = Math.sqrt(Math.max(0, rad * rad - (y + 0.04 - sp) ** 2)) - 0.05, a = Math.max(x0, -half), b = Math.min(-x0, half);
      if (k === 1) { for (const [p0, p1] of [[a, -cw], [cw, b]]) B.add(B.box(p1 - p0, 0.028, dep - 0.012, { seg: 9 }), ch(M, (p0 + p1) / 2, y, zr), { ...w, ground: g0 }); }
      else B.add(B.box(b - a, 0.028, dep - 0.012, { seg: 9 }), ch(M, (a + b) / 2, y, zr), { ...w, ground: g0 }); });
    R.wall(-rad, zm, rad, zm, 0, 2.7, 0.3);
    R.shelf(0, 1.33, zr, 2 * rad - 0.4, dep); // the pigeonholes
    // the dead letters: a few in most holes, one hole stuffed; a tied bundle and a hand bell on the counter
    { const paper = () => ({ color: worn(V.linen, rng, 0.3, 0.2), moss: 0, ground: g0 - 3 }); let stuffed = false;
      for (let k = 0; k < rows.length; k++) for (let i = 0; i < n; i++) { const xc = x0 + (i + 0.5) * cw, y = rows[k] + 0.016;
        if ((k === 1 && (i === n / 2 - 1 || i === n / 2)) || y + 0.2 > yArch(Math.abs(xc) + cw / 2) || rng() < 0.42) continue;
        if (!stuffed && k === 1 && i > 4) { stuffed = true; B.add(B.box(cw - 0.07, 0.25, 0.3, { seg: 0.12, chip: 0.03, seed: 9 }), ch(M, xc, y + 0.125, zr + 0.07), paper()); continue; }
        if (rng() < 0.45) { // a letter stood on edge, its sealed side out: the flap's two lines and the wax
          const lw2 = cw * 0.7, lh = 0.2, lm = ch(M, xc + (rng() - 0.5) * 0.03, y, zr + dep / 2 - 0.02, -0.12, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.12);
          B.add(B.box(lw2, lh, 0.014, { seg: 9 }), ch(lm, 0, lh / 2, 0), paper());
          for (const sd of [-1, 1]) B.add(B.box(lw2 * 0.56, 0.012, 0.006, { seg: 9 }), ch(lm, sd * lw2 * 0.24, lh * 0.74, 0.009, 0, 0, -sd * 0.6), { color: V.soot, moss: 0, ground: g0 - 3 });
          B.add(B.cyl(0.026, 0.026, 0.012, 6, 1), ch(lm, 0, lh * 0.5, 0.012, Math.PI / 2, 0, 0), { color: new THREE.Color('#8e2318'), moss: 0, ground: g0 - 3 }); continue; }
        const nl = 1 + Math.floor(rng() * 3); for (let q = 0; q < nl; q++) B.add(B.box(cw * (0.5 + rng() * 0.22), 0.014, 0.26, { seg: 9 }), ch(M, xc + (rng() - 0.5) * 0.04, y + 0.007 + q * 0.016, zr + 0.06 + rng() * 0.06, 0, (rng() - 0.5) * 0.5, 0), paper()); }
      B.add(B.box(0.3, 0.13, 0.2, { seg: 0.1, chip: 0.02, seed: 4 }), ch(M, -0.85, top + 0.065, zm + 0.12, 0, 0.3, 0), paper()); B.add(B.box(0.31, 0.02, 0.03, { seg: 9 }), ch(M, -0.85, top + 0.135, zm + 0.12, 0, 0.3, 0), { color: V.madder, moss: 0, ground: g0 - 3 });
      B.add(B.cyl(0.02, 0.07, 0.09, 7, 1), ch(M, 0.9, top + 0.045, zm + 0.14), { color: H.bronzeDull, moss: 0, ground: g0 - 3 }); B.add(B.cyl(0.012, 0.012, 0.08, 4, 1), ch(M, 0.9, top + 0.13, zm + 0.14), { color: L.wood, moss: 0, ground: g0 - 3 }); }
    Q.places.push({ what: 'the Lagan: 30 pigeonholes over the counter (one to be stuffed full), the hatch a clerk looks out of', ...R.W(0, 1.3, zr), shop: 'lees-shop-4' });
    Q.records.push(R);
  }
  // ---------------------------------------------------------------- the Ullage
  { const v = vault('lees-shop-5', 52, -1, 'bottle'), { M, R, rng, g0, zm, zf, zb, rad, sp } = v, top = 0.8;
    counter(v, -rad + 0.01, 0.46, top);
    // the half gate
    leaf(B, ch(M, 0.96, 0, zm + 0.02), 0.98, 1.02, worn(L.paint[1], rng, 0.4), rng, { plain: low });
    // the beam and its twelve hooks
    const yb = 1.78, half = Math.sqrt(rad * rad - (yb + 0.05 - sp) ** 2) - 0.02, iron = { color: L.iron, iron: 0.9, moss: 0, ground: g0 - 3 };
    B.add(B.box(2 * half, 0.08, 0.08, { seg: 9 }), ch(M, 0, yb, zm), { ...wd(rng, 0.1), ground: g0 });
    for (let i = 0; i < 12; i++) { const x = -half + 0.16 + i * ((2 * half - 0.32) / 11);
      B.add(B.box(0.014, 0.1, 0.014, { seg: 9 }), ch(M, x, yb - 0.085, zm), iron);
      B.add(new THREE.TorusGeometry(0.026, 0.007, 3, low ? 4 : 6, Math.PI), ch(M, x, yb - 0.135, zm + 0.026, 0, Math.PI / 2, Math.PI), iron);
      if (i !== 7) bottle(B, M, x, yb - 0.15, zm + 0.026, 0.27 + rng() * 0.07, worn(new THREE.Color(['#2f5a3c', '#6b4217', '#2f5a3c', '#8a8f6a'][i % 4]), rng, 0.2), { hung: true, n: low ? 5 : 6 }); } // eleven bottles by the neck, the eighth hook bare
    // casks on the room's shelves, a jug and two cups on the counter
    for (const [x, y] of [[-0.75, 0.92], [-0.2, 0.92], [0.5, 0.92], [-0.45, 1.47], [0.3, 1.47]]) cask(B, M, x, y, zb + 0.2, 0.12, 0.24, rng);
    bottle(B, M, -0.9, top, zm + 0.1, 0.36, worn(new THREE.Color('#7b4a2c'), rng, 0.2), { n: low ? 5 : 7 });
    for (const x of [-0.55, -0.38]) B.add(B.cyl(0.045, 0.035, 0.08, 6, 1), ch(M, x, top + 0.04, zm + 0.16), { color: worn(H.bronzeDull, rng, 0.2), moss: 0, ground: g0 - 3 });
    // the shutter: a leaf of planks hinged under the nosing, propped out on two sticks
    { const y0 = Math.min(Rz.top - v.p.y - 0.3, sp + rad + 0.3), bw = 2 * rad + 0.3, bl = 1.35, t = 0.3, bm = ch(M, 0, y0, zf + 0.45, -t, 0, 0), w = wd(rng, 0.3);
      B.add(B.box(bw, 0.045, bl, { seg: 9 }), ch(bm, 0, 0, bl / 2), { ...w, ground: g0 });
      for (const q of [0.2, 0.8]) B.add(B.box(bw - 0.1, 0.035, 0.09, { seg: 9 }), ch(bm, 0, -0.04, bl * q), { ...wd(rng, 0.1), ground: g0 });
      for (let i = 1; i < 6; i++) B.add(B.box(0.012, 0.006, bl - 0.04, { seg: 9 }), ch(bm, -bw / 2 + (i / 6) * bw, 0.026, bl / 2), { color: V.soot, moss: 0, ground: g0 });
      for (const s of [-1, 1]) { const px = s * (bw / 2 - 0.1), pz = zf + 0.45 + Math.cos(t) * (bl - 0.08), py = y0 + Math.sin(t) * (bl - 0.08) - 0.03; beam(B, M, [px, 0.03, pz + 0.14], [px, py, pz], 0.05, { color: V.rawWood, moss: 0.05, ground: g0, round: 5 }); R.post(px, pz + 0.1, 0.07, 0, 2.0, { stand: false }); } }
    R.wall(-rad, zm, rad, zm, 0, 2.7, 0.3);
    Q.places.push({ what: 'the Ullage: twelve hooks on the beam (eleven bottles), a counter', ...R.W(0, yb - 0.14, zm), shop: 'lees-shop-5' });
    Q.records.push(R);
  }
  // ---------------------------------------------------------------- the Welt
  { const v = vault('lees-shop-6', 63, 1, 'slipper'), { M, R, rng, g0, zm, rad, yArch } = v, n = 11, pw = (2 * rad) / n;
    // planks 1 to 4 are cut for the window, 6 to 9 left out for the wicket (of eleven, from the west)
    const WI = [1, 4], DI = [6, 9], win = [-rad + WI[0] * pw, -rad + (WI[1] + 1) * pw, 1.0, 1.72], door = [-rad + DI[0] * pw, -rad + (DI[1] + 1) * pw, 1.82], paint = worn(L.paint[3], rng, 0.45);
    for (let i = 0; i < n; i++) {
      const xa = -rad + i * pw, x = xa + pw / 2, topY = yArch(Math.max(Math.abs(xa), Math.abs(xa + pw))) - 0.02, col = worn(L.wood, rng, 0.22, 0.2), z = zm + (i % 2) * 0.012;
      const part = (y0, y1) => { if (y1 - y0 > 0.05) B.add(B.box(pw - 0.012, y1 - y0, 0.05, { seg: 9 }), ch(M, x, (y0 + y1) / 2, z), { color: col, moss: 0.15, ground: g0 }); };
      if (i >= WI[0] && i <= WI[1]) { part(-0.12, win[2]); part(win[3], topY); }
      else if (i >= DI[0] && i <= DI[1]) part(door[2] + 0.02, topY);
      else part(-0.12, topY);
    }
    for (const [a, b, y] of [[-rad + 0.05, door[0] - 0.02, 0.5], [-rad + 0.3, rad - 0.3, 1.9]]) B.add(B.box(b - a, 0.1, 0.045, { seg: 9 }), ch(M, (a + b) / 2, y, zm + 0.06), { ...wd(rng, 0.1), ground: g0 });
    // the wicket: its leaf, shut
    leaf(B, ch(M, (door[0] + door[1]) / 2, 0.02, zm + 0.005), door[1] - door[0] - 0.03, door[2] - 0.03, paint, rng, { plain: low }); R.door((door[0] + door[1]) / 2, zm + 0.8, { w: door[1] - door[0] });
    // the window: the pane lit, a frame, a sill; the last's stand; half a curtain
    { const wx0 = win[0], wx1 = win[1], wx = (wx0 + wx1) / 2, ww = wx1 - wx0, wh = win[3] - win[2], iron = { color: L.iron, iron: 0.9, moss: 0, ground: g0 - 3 };
      B.add(B.box(ww + 0.3, wh + 0.3, 0.03, { seg: 9 }), ch(M, wx, win[2] + wh / 2, zm - 0.3), { color: new THREE.Color('#3a2410'), moss: 0, ground: g0 - 3, emit: lit(0.4) });
      for (const s of [-1, 1]) { beam(B, M, [wx + s * (ww / 2 + 0.035), win[2] - 0.04, zm + 0.045], [wx + s * (ww / 2 + 0.035), win[3] + 0.04, zm + 0.045], 0.06, { color: paint, moss: 0, ground: g0 }); }
      B.add(B.box(ww + 0.16, 0.06, 0.08, { seg: 9 }), ch(M, wx, win[3] + 0.07, zm + 0.05), { color: paint, moss: 0, ground: g0 });
      B.add(B.box(ww + 0.24, 0.045, 0.42, { seg: 9 }), ch(M, wx, win[2] - 0.02, zm + 0.12), { ...wd(rng, 0.1), ground: g0 });
      B.add(B.cyl(0.05, 0.07, 0.025, 6, 1), ch(M, wx + 0.1, win[2] + 0.015, zm + 0.16), iron); B.add(B.cyl(0.012, 0.012, 0.2, 5, 1), ch(M, wx + 0.1, win[2] + 0.11, zm + 0.16), iron);
      B.add(B.box(0.08, 0.035, 0.03, { seg: 9 }), ch(M, wx + 0.1, win[2] + 0.22, zm + 0.16, 0, 0.5, 0), iron); // the stand's foot-plate: the last goes on it
      R.shelf(wx, win[2] + 0.01, zm + 0.16, ww, 0.3);
      // the glazing bars; behind them a shelf of lasts, dark against the room; slippers on the sill, one on the stand, a string of them over the wicket
      { const dk = { color: worn(L.wood, rng, 0.1).multiplyScalar(0.5), moss: 0, ground: g0 - 3 }, dye = () => worn([V.madder, V.saffron, V.teal, V.madder][Math.floor(rng() * 4)], rng, 0.25, 0.12);
        B.add(B.box(0.03, wh, 0.03, { seg: 9 }), ch(M, wx + 0.02, win[2] + wh / 2, zm - 0.03), dk); B.add(B.box(ww, 0.03, 0.026, { seg: 9 }), ch(M, wx, win[2] + wh * 0.56, zm - 0.03), dk);
        B.add(B.box(ww, 0.03, 0.14, { seg: 9 }), ch(M, wx, win[2] + 0.3, zm - 0.22), dk);
        for (let i = 0; i < 4; i++) last(B, M, wx - ww * 0.42 + i * ww * 0.25, win[2] + 0.316, zm - 0.22, 0.2, (i % 2) * Math.PI);
        slipper(B, M, wx - 0.42, win[2] + 0.004, zm + 0.2, 0.25, dye(), -0.5); slipper(B, M, wx - 0.33, win[2] + 0.004, zm + 0.3, 0.25, dye(), -0.3); slipper(B, M, wx + 0.36, win[2] + 0.004, zm + 0.24, 0.23, dye(), Math.PI + 0.4);
        slipper(B, M, wx + 0.02, win[2] + 0.24, zm + 0.16, 0.24, dye(), 0.5, 0.12);
        const dxm = (door[0] + door[1]) / 2, dwd = door[1] - door[0];
        beam(B, M, [door[0] - 0.05, door[2] + 0.07, zm + 0.1], [door[1] + 0.05, door[2] + 0.02, zm + 0.1], 0.014, { color: V.rope, moss: 0, ground: g0 - 3 });
        for (let i = 0; i < 5; i++) slipper(B, M, dxm - dwd * 0.4 + i * dwd * 0.2, door[2] + 0.05 - i * 0.01, zm + 0.1, 0.24, dye(), 0, -Math.PI / 2 + (rng() - 0.5) * 0.3); }
      Q.places.push({ what: 'the Welt: the sill and the last\'s stand (one left slipper)', ...R.W(wx + 0.1, win[2] + 0.24, zm + 0.16), shop: 'lees-shop-6' });
      // the trying-on bench under it
      const bz = zm + 1.0; for (const s of [-1, 1]) B.add(B.box(0.26, 0.6, 0.3, { seg: 9, chip: 0.04, seed: 5 + s }), ch(M, wx + s * 0.5, 0.1, bz), { color: worn(H.stone, rng, 0.15), moss: 0.5, ground: g0 });
      B.add(B.box(1.4, 0.05, 0.32, { seg: 9 }), ch(M, wx, 0.425, bz), { ...wd(rng, 0.3), ground: g0 });
      R.wall(wx - 0.55, bz, wx + 0.55, bz, 0, 0.45, 0.17, { stand: true });
      Q.places.push({ what: 'the Welt\'s trying-on bench (a seat)', ...R.W(wx, 0.45, bz), shop: 'lees-shop-6' });
    }
    R.wall(-rad, zm, rad, zm, 0, 2.7, 0.3);
    Q.records.push(R);
  }
  // ---------------------------------------------------------------- the Tare: the salt-weigher's stall on the square
  { const p = plan.plot('lees-stall-salt'), M = plotMatrix({ ...p, y: Q.Y }), rng = rngOf(74, 5), g0 = Q.Y, R = site(M, 'late', { seed: 74, w: p.w, d: p.d }); R.name = p.name; R.form = 'stall';
    const hw = p.w / 2 - 0.12, zb = -p.d / 2 + 0.15, zc = 0.35, top = 0.93, raw = () => ({ color: worn(V.rawWood, rng, 0.35, 0.15), moss: 0.1, ground: g0, round: 5 });
    for (const s of [-1, 1]) { PARTS.heliarch.drum(B, ch(M, s * 0.72, -0.08, zc), { r: 0.25, h: top - 0.06, turn: rng(), moss: 0.45 }); }
    PARTS.heliarch.slab(B, ch(M, -1.12, top, zc).multiply(BASIS), { w: 0.66, h: 2.24, d: 0.14 });
    R.wall(-0.9, zc, 0.9, zc, 0, top + 0.07, 0.32); R.counter(0, top + 0.07, zc + 0.8, 2.2);
    // the cloth: from a rail on two poles behind to two in front; the curtain hangs from the rail
    const hr = 2.5, from = B.count;
    for (const s of [-1, 1]) { beam(B, M, [s * (hw + 0.03) + (rng() - 0.5) * 0.1, -0.2, zb - 0.02], [s * hw, hr + 0.06, zb], 0.07, raw()); R.post(s * hw, zb, 0.08, 0, 2.2, { stand: false }); R.post(s * (hw - 0.07), zb + p.d - 0.3, 0.07, 0, 2.2, { stand: false }); }
    { const a0 = B.count; awning(B, ch(M, 0, 0, zb), { w: 2 * hw - 0.1, d: p.d - 0.3, h: hr, drop: 0.22, rng, color: worn(V.linen, rng, 0.3) });
      for (let i = a0; i < B.count; i++) if (B.Nn[i * 3 + 1] < -0.3) B.P[i * 3 + 1] -= 0.012; } // (the cloth stands free here and is seen from under at its hem: its underside hangs clear of its top all the way to the edge)
    { const cw = 2 * hw - 0.3, col = worn(V.madder, rng, 0.35, 0.1), n = 6; // the curtain, in six folds
      for (let i = 0; i < n; i++) { const sh = rng() * 0.3, hh = hr - 0.32 - sh; // (each width its own length and tone, a patch on two: a back that is cloth, not a board)
        B.add(B.box(cw / n + 0.01, hh, 0.016, { seg: 9 }), ch(M, -cw / 2 + (i + 0.5) * (cw / n), hh / 2 + 0.3 - 0.02 + sh, zb - 0.045 + (i % 2) * 0.025, 0, (i % 2 ? 1 : -1) * 0.22, 0), { color: col.clone().multiplyScalar(0.62 + 0.5 * rng()), moss: 0, ground: g0 - 2 });
        if (i === 1 || i === 4) B.add(B.box(cw / n * 0.6, 0.34, 0.012, { seg: 9 }), ch(M, -cw / 2 + (i + 0.5) * (cw / n), 0.9 + i * 0.18, zb - 0.07 - (i % 2) * 0.012, 0, (i % 2 ? 1 : -1) * 0.22, 0.1), { color: worn(i === 1 ? V.linen : V.teal, rng, 0.4, 0.2).multiplyScalar(0.7), moss: 0, ground: g0 - 2 }); }
      R.wall(-cw / 2, zb, cw / 2, zb, 0, 2.2, 0.1); }
    dirty(B, from, 0.15, rng);
    // the balance: a post on the counter, a beam out of true, two pans on three cords; the perch on the beam
    { const iron = { color: L.iron, iron: 0.9, moss: 0, ground: g0 - 3 }, bz = { color: H.bronzeDull, moss: 0, ground: g0 - 3 }, bx = 0.5, by = top + 0.07, tilt = 0.1;
      B.add(B.cyl(0.07, 0.1, 0.04, 6, 1), ch(M, bx, by + 0.02, zc), iron); B.add(B.cyl(0.014, 0.018, 0.62, 5, 1), ch(M, bx, by + 0.33, zc), iron);
      const bm = ch(M, bx, by + 0.63, zc, 0, 0, tilt);
      B.add(B.box(0.7, 0.022, 0.022, { seg: 9 }), bm, iron);
      for (const s of [-1, 1]) { const ex = bx + s * 0.34 * Math.cos(tilt), ey = by + 0.63 + s * 0.34 * Math.sin(tilt), py = ey - 0.3;
        B.add(B.cyl(0.11, 0.09, 0.02, 8, 1), ch(M, ex, py, zc), bz);
        for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.5; beam(B, M, [ex, ey - 0.006, zc], [ex + Math.cos(a) * 0.1, py + 0.008, zc + Math.sin(a) * 0.1], 0.006, iron); } }
      B.add(B.cyl(0.005, 0.005, 0.06, 4, 1), ch(bm, 0, 0.04, 0), iron); B.add(B.box(0.055, 0.007, 0.007, { seg: 9 }), ch(bm, 0, 0.072, 0), iron); // the perch
      Q.places.push({ what: 'the Tare: the balance\'s perch (a Twk-man\'s), the counter', ...R.W(bx, by + 0.7, zc), shop: 'lees-stall-salt' }); }
    // the peg on the west pole, at a pack's height
    beam(B, M, [-hw + 0.01, 1.5 * 1, zb + 0.0], [-hw - 0.01, 1.54, zb + 0.16], 0.022, { color: L.wood, moss: 0, ground: g0 });
    Q.places.push({ what: 'the Tare: the pedlar\'s empty peg', ...R.W(-hw, 1.52, zb + 0.14), shop: 'lees-stall-salt' });
    tradeBoard(B, ch(M, hw - 0.07, 2.42, zb + p.d - 0.3 - 0.03, 0, Math.PI, 0), 'cone', rng, { size: 0.36, reach: 0.5, turn: 0.6 }); // (in under the cloth, over the counter's end: its foot at 1.9 m, off the walked line)
    // loaves of salt on the counter, sacks by it
    for (const [x, h] of [[-0.75, 0.3], [-0.42, 0.22], [-0.1, 0.36]]) saltCone(B, M, x, top + 0.07, zc + (x + 0.4) * 0.1, h, rng);
    sack(B, M, -1.0, 0, zc + 0.62, 0.42, 0.5, rng); sack(B, M, -0.62, 0, zc + 0.78, 0.36, 0.4, rng); sack(B, M, 0.95, 0, zc + 0.85, 0.44, 0.56, rng);
    R.lamp(-0.5, hr - 0.02, zb + 0.03);
    Q.records.push(R);
  }
  // ---------------------------------------------------------------- the Rebate: the framer's house, its frames, and the great frame on the brink
  { const p = plan.plot('lees-house-3'), M = plotMatrix(p), rng = rngOf(85, 5), g0 = p.y;
    const R = makePlot(B, p, { plan, built, seed: 7, low }); // (seed 5 leaves two walls of its rooms in one plane: geometry-test; the others are clean since the kit's facade is cut to short edges)
    Q.records.push(R);
    const inv = M.clone().invert(), d0 = R.doors[0] ? new THREE.Vector3(R.doors[0].x, 0, R.doors[0].z).applyMatrix4(inv) : new THREE.Vector3(0, 0, 0), side = d0.x > 0 ? -1 : 1, zf = R.front ? R.front.zf : p.d / 2 - 0.4;
    const bar = (m, w, h, t, col) => { const o = { color: col, moss: 0.05, ground: g0 - 1 };
      for (const s of [-1, 1]) { B.add(B.box(t, h, t * 0.7, { seg: 9 }), ch(m, s * (w / 2 - t / 2), h / 2, 0), o); B.add(B.box(w - 2 * t + 0.02, t, t * 0.62, { seg: 9 }), ch(m, 0, s > 0 ? h - t / 2 : t / 2, 0), o); } };
    const gilt = () => worn(L.gilt, rng, 0.5, 0.2);
    // three leaned against the wall, the largest behind
    [[1.5, 1.15, 0.09, gilt(), 0], [0.95, 1.3, 0.07, worn(L.paint[1], rng, 0.4), 0.12], [0.72, 0.8, 0.06, gilt(), -0.3]].forEach(([w, h, t, col, dx], k) => {
      const out = 0.42 + k * 0.1, tilt = Math.asin(Math.min(0.9, (out - 0.05 - k * 0.09) / h));
      const fm = ch(M, side * (p.w / 2 - 1.25) + dx, 0.02, zf + out, -tilt, 0, 0); bar(fm, w, h, t, col);
      if (k === 1) { // one holds a canvas: a sun, too red, over a black horizon (the painter's, unsold)
        B.add(B.box(w - 2 * t + 0.02, h - 2 * t + 0.02, 0.012, { seg: 9 }), ch(fm, 0, h / 2, 0), { color: worn(new THREE.Color('#40335c'), rng, 0.1), moss: 0, ground: g0 - 1 });
        B.add(B.box(w - 2 * t + 0.02, h * 0.24, 0.026, { seg: 9 }), ch(fm, 0, t + h * 0.12, 0), { color: new THREE.Color('#17131c'), moss: 0, ground: g0 - 1 });
        B.add(B.cyl(w * 0.2, w * 0.2, 0.04, 10, 1), ch(fm, 0.04, h * 0.5, 0, Math.PI / 2, 0, 0), { color: new THREE.Color('#b8381a'), moss: 0, ground: g0 - 1 }); }
    });
    Q.places.push({ what: 'the Rebate: empty frames leaned by the door', ...R.W(side * (p.w / 2 - 1.25), 0.6, zf + 0.5), shop: 'lees-house-3' });
    // the great frame: on two posts on the brink, the view in it
    { const z = 4.25, fw = 2.7, fh = 1.75, y0 = 0.85, t = 0.13, raw = { color: worn(V.rawWood, rng, 0.3), moss: 0.12, ground: g0, round: 6 }, T = ctx.terrain;
      const wpt = (x, zz) => new THREE.Vector3(x, 0, zz).applyMatrix4(M);
      if (T.heightAt(wpt(0, z).x, wpt(0, z).z) > g0 - 0.2) {
        for (const s of [-1, 1]) { beam(B, M, [s * (fw / 2 - t / 2), 0, z], [s * (fw / 2 - t / 2), y0 + 0.02, z], 0.12, raw); beam(B, M, [s * (fw / 2 - t / 2), 0, z - 0.75], [s * (fw / 2 - t / 2), y0 - 0.1, z - 0.02], 0.07, raw); const q = wpt(s * (fw / 2 - t / 2), z); ctx.addCollider({ x: q.x, z: q.z, r: 0.14, y: g0 - 0.3, h: 3, stand: false }); }
        bar(ch(M, 0, y0, z), fw, fh, t, gilt()); R.wall(-fw / 2, z, fw / 2, z, 0, y0 + t, 0.08, { stand: false }); // (its bottom rail stops a walker: nobody steps through a picture)
        for (const sx of [-1, 1]) for (const sy of [0, 1]) B.add(B.cyl(0.11, 0.11, 0.12, 6, 1), ch(M, sx * (fw / 2 - t / 2), y0 + (sy ? fh - t / 2 : t / 2), z, Math.PI / 2, 0, 0), { color: gilt(), moss: 0.05, ground: g0 - 1 });
        Q.places.push({ what: 'the Rebate\'s great frame, sized for the Prospect: look through it from the street', ...R.W(0, y0 + fh / 2, z), shop: 'lees-house-3' });
      }
    }
  }
}
