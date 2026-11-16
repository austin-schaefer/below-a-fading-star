// A house under an Elder block (v15-V1): two cyclopean blocks, one standing and one fallen against its head, and in
// the cleft under the leaning one a dwelling scraped out by people a fortieth of its weight: a plaster front the size
// of a cupboard with a slot for a door and a curtain for a leaf, rubble packed above it to the stone, a stovepipe out
// through the packing. Entered: a cleft room two metres wide and five tall at the standing block, its ceiling the
// slab coming down to the floor; whoever lives here keeps pledges, and they hang ticketed up the tall wall on a rack.
// The blocks go into o.E (a Builder for the Elder material) when it is given, else into B in the Elder colour.
// o: seed, w (9), d (7), E, back (the local z behind which the ground may rise: the room keeps in front of it), low.
import * as THREE from 'three';
import { L, H, V, E as EC, PARTS, rngOf, pick, ch, worn, site, beam, pot, plate, wallPoly, stop, bed, patch, ladder } from './kit.js';

export function elder(B, M, o = {}) {
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
