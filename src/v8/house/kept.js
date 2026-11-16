// v14-B3 the Pomegranate House kept (#42: "a little bare, still reads as a ruin"). The host lives here, and these are
// the things a person who sleeps in a house, cooks in it and keeps it owns and mends. All of it goes into the props
// mesh (house/props.js calls keptHouse with its Builder), so it costs no draw of its own.
//
//   the hearth    the south gallery, east of the cloth-patched hole in its roof (the smoke goes out there): a clay bread
//                 oven against the wall, its mouth lit; a ring of stones with the coals in it and a copper pot on an
//                 iron trivet; a low stool and the host's long-handled peel; split wood stacked along the wall; a tall
//                 water jar with a dipper; a basket of pomegranates; flat loaves cooling on a cloth on a board. The court's
//                 one point light is this fire's (house.js, at HEARTH).
//   the divan     the west gallery: a long kilim of madder, indigo and ochre stripes on the floor, bolsters along the
//                 wall, cushions, a low brass tray on a stand with a coffee pot and three cups.
//   the alcove    the east gallery's north end: a striped curtain on a rod between two columns, half drawn; behind it
//                 his pallet with a rose quilt and a bolster, a chest with iron bands, his own slippers set side by side.
//   the line      across the court's south-west corner, column to column: a sheet, a long shirt, a sash, pegged.
//   the mending   a ladder laid down along the south gallery by the patched hole, a bucket of limewash at its foot and a
//                 brush across it; fresh limewash in patches on the court's side of the north wall (brighter, square).
//   the fountain  water in it again, drawn by hand: a dark still disc in the basin and a bucket on the rim.
//   the broom     against the gate's jamb inside.
// The floor is swept beaten earth (house/props.js bareGround, its court area); house/clear.js keeps the ground cover
// out of the court and the galleries.
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { TAVERNA } from '../../structures/taverna.js';
import { rod } from './props.js';
import { ladders } from '../../v15/ways/ladder.js';

const { x: CX, z: CZ } = TAVERNA;
// where the fire is (the court light and its ground pool are placed from it in house.js)
export const HEARTH = { x: CX + 2.7, z: CZ + 11.0 };
// the lamps hung inside, one where each thing is done: [x, z, height of the hook over the ground]
export const HUNG = [
  [CX + 4.1, CZ + 10.1, 2.55], // over the hearth, under the arch
  [CX - 10.1, CZ - 1.4, 2.55], // over the divan
  [CX + 10.1, CZ - 4.1, 2.5], // in the alcove, by the curtain
  [CX - 4.1, CZ - 10.1, 2.55], // the north gallery, west of the gate
];

const c = (h) => new THREE.Color(h);
const CLAY = c('#9a5a38'), CLAY_D = c('#5e3422'), SOOT = c('#1c1410'), COAL = c('#2a0e06'), COPPER = c('#b0603a');
const MADDER = c('#8a2a22'), INDIGO = c('#2a2e5a'), OCHRE = c('#c08a32'), CREAM = c('#e4d6b8'), ROSE = c('#c87a6a');
const LEATHER = c('#5a3420'), BRASS = c('#c09040'), LINEN = c('#d8cdb4'), WOOD_D = c('#3e2818');

export function keptHouse(ctx, B, G, S) {
  const L = S.colors.late, Hc = S.colors.heliarch, P = S.parts, rng = ctx.makeRng(8060), low = ctx.quality === 'low';
  const o = (color, g, x = {}) => ({ color, moss: 0, ground: g, ...x });

  // ---------------------------------------------------------------- the hearth (south gallery, z CZ + 9.6 .. 12.6)
  {
    // the oven: a clay beehive against the wall, its mouth toward the court, lit
    const ox = CX + 5.5, oz = CZ + 11.55, og = G(ox, oz);
    B.add(B.lathe([[0.62, 0], [0.64, 0.25], [0.6, 0.6], [0.48, 0.9], [0.28, 1.08], [0.12, 1.14], [0.0, 1.15]], low ? 9 : 14), mat(ox, og - 0.02, oz), o(CLAY, og, { wet: 0.1, disp: 0.02 }));
    B.add(B.cyl(0.13, 0.15, 0.12, 8, 1), mat(ox, og + 1.17, oz), o(CLAY_D, og));
    // the mouth: a dark arch rim and the fire inside, seen through it
    B.add(B.box(0.42, 0.36, 0.06), mat(ox, og + 0.3, oz - 0.6, 0, 0, 0), o(SOOT, og));
    B.add(B.box(0.32, 0.22, 0.05), mat(ox, og + 0.24, oz - 0.62, 0, 0, 0), o(COAL, og, { emit: [2.6, 0.9, 0.18, 1] }));
    // soot up the wall behind it, where the smoke has gone for years
    B.add(B.box(0.9, 1.9, 0.02), mat(ox, og + 1.6, CZ + 12.58, 0, 0, 0), o(SOOT, og - 1, { moss: 0.1 }));
    // the fire: a ring of stones, the coals, an iron trivet and a copper pot
    const hx = HEARTH.x, hz = HEARTH.z, hg = G(hx, hz);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + rng() * 0.3; B.add(B.rock(0.11 + rng() * 0.05, 0, 1, 0.7, 1), mat(hx + Math.cos(a) * 0.42, hg + 0.05, hz + Math.sin(a) * 0.42, rng() * 3, rng() * 3, 0), { color: Hc.stone.clone().multiplyScalar(0.55), moss: 0, ground: hg }); }
    B.add(B.cyl(0.36, 0.38, 0.03, 10, 1), mat(hx, hg + 0.04, hz), o(SOOT, hg)); // clear of the swept floor (+0.02)
    for (let k = 0; k < (low ? 5 : 9); k++) { const a = rng() * 6.28, d = rng() * 0.22; B.add(B.rock(0.05 + rng() * 0.04, 0, 1, 0.6, 1), mat(hx + Math.cos(a) * d, hg + 0.05, hz + Math.sin(a) * d, rng() * 3, rng() * 3, 0), o(COAL, hg, { emit: [2.2 + rng() * 0.8, 0.55 + rng() * 0.25, 0.08, 1] })); }
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.4; rod(B, [hx + Math.cos(a) * 0.34, hg, hz + Math.sin(a) * 0.34], [hx + Math.cos(a) * 0.2, hg + 0.42, hz + Math.sin(a) * 0.2], 0.012, { color: L.iron, iron: 0.9, moss: 0, ground: hg }, 4); }
    B.add(new THREE.TorusGeometry(0.21, 0.012, 4, 12), mat(hx, hg + 0.42, hz, Math.PI / 2, 0, 0), { color: L.iron, iron: 0.9, moss: 0, ground: hg });
    B.add(B.lathe([[0.0, 0], [0.16, 0.02], [0.22, 0.1], [0.23, 0.22], [0.2, 0.3], [0.21, 0.33]], 12), mat(hx, hg + 0.42, hz), o(COPPER, hg, { iron: 0.25, wet: 0.3 }));
    B.add(B.cyl(0.19, 0.19, 0.01, 12, 1), mat(hx, hg + 0.7, hz), o(SOOT, hg)); // what is in it, dark
    rod(B, [hx - 0.2, hg + 0.73, hz], [hx - 0.45, hg + 0.98, hz - 0.15], 0.01, o(L.wood, hg), 4); // a ladle's handle out of it
    // the stool the host sits on to tend it, and his peel
    const sx = hx - 0.95, sz = hz - 0.45, sg = G(sx, sz);
    B.add(B.cyl(0.2, 0.2, 0.05, 8, 1), mat(sx, sg + 0.32, sz), o(L.wood, sg));
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; rod(B, [sx + Math.cos(a) * 0.15, sg, sz + Math.sin(a) * 0.15], [sx + Math.cos(a) * 0.1, sg + 0.31, sz + Math.sin(a) * 0.1], 0.02, o(WOOD_D, sg), 4); }
    rod(B, [ox - 0.9, G(ox - 0.9, oz) + 0.02, oz + 0.75], [ox - 0.75, G(ox, oz) + 1.95, oz + 0.92], 0.02, o(L.wood, og), 4); // the peel, against the wall
    B.add(B.box(0.3, 0.012, 0.36), mat(ox - 0.9, og + 0.18, oz + 0.68, 1.4, 0, 0.08), o(L.wood, og));
    // the wood, split, stacked along the wall east of the oven
    for (let r = 0; r < (low ? 3 : 4); r++) for (let k = 0; k < 7 - r; k++) {
      const wx = CX + 6.6 + k * 0.17 + r * 0.08, wz = CZ + 12.05, wg = G(wx, wz);
      B.add(B.cyl(0.075, 0.075, 1.0, 5, 1), mat(wx, wg + 0.08 + r * 0.14, wz - 0.15 + rng() * 0.04, Math.PI / 2, 0, (rng() - 0.5) * 0.2), o(rng() < 0.5 ? L.wood : c('#7a5a3a'), wg));
    }
    // the water jar with its dipper, a basket of pomegranates, loaves on a board
    const jx = CX - 0.2, jz = CZ + 12.1, jg = G(jx, jz);
    B.add(B.lathe([[0.0, 0], [0.16, 0.02], [0.3, 0.3], [0.32, 0.55], [0.22, 0.85], [0.11, 0.95], [0.13, 1.02]], low ? 9 : 12), mat(jx, jg - 0.02, jz), o(CLAY, jg, { wet: 0.5 }));
    B.add(B.cyl(0.12, 0.12, 0.01, 10, 1), mat(jx, jg + 0.99, jz), o(SOOT, jg, { wet: 1 }));
    rod(B, [jx + 0.05, jg + 0.92, jz], [jx + 0.32, jg + 1.32, jz - 0.12], 0.012, o(L.wood, jg), 4);
    const bx = hx + 1.1, bz = hz + 0.85, bg = G(bx, bz);
    B.add(B.cyl(0.26, 0.2, 0.22, 10, 1, true), mat(bx, bg + 0.11, bz), o(c('#8a6a3a'), bg));
    for (let k = 0; k < 7; k++) { const a = k * 0.9 + rng(), d = k ? 0.13 : 0; B.add(new THREE.IcosahedronGeometry(0.07, 0), mat(bx + Math.cos(a) * d, bg + 0.2 + (k ? 0 : 0.05), bz + Math.sin(a) * d, rng() * 3, rng() * 3, 0), o(k % 3 ? L.pom : L.pomDark, bg)); }
    const lx = hx - 1.6, lz = hz + 1.15, lg = G(lx, lz);
    B.add(B.box(0.8, 0.05, 0.45), mat(lx, lg + 0.42, lz, 0, 0.1, 0), o(L.wood, lg));
    for (const dx of [-0.32, 0.32]) B.add(B.box(0.06, 0.4, 0.4), mat(lx + dx, lg + 0.2, lz, 0, 0.1, 0), o(WOOD_D, lg));
    B.add(B.box(0.7, 0.01, 0.42), mat(lx, lg + 0.45, lz, 0, 0.1, 0), o(LINEN, lg));
    for (let k = 0; k < 3; k++) B.add(B.cyl(0.13, 0.14, 0.03, 10, 1), mat(lx - 0.22 + k * 0.22, lg + 0.47 + (k === 1 ? 0.02 : 0), lz + (k - 1) * 0.04, (rng() - 0.5) * 0.15, 0, (rng() - 0.5) * 0.15), o(c('#c08a50'), lg));
    // onions and red peppers hung in strings from the arch's soffit over the fire
    for (let k = 0; k < (low ? 2 : 3); k++) {
      const px = CX + 3.0 + k * 0.45, pz = CZ + 9.75, top = G(px, pz) + 2.62;
      rod(B, [px, top, pz], [px, top - 0.75, pz], 0.006, o(c('#6a5a3a'), top - 3), 3);
      for (let j = 0; j < 6; j++) B.add(new THREE.IcosahedronGeometry(j % 2 ? 0.045 : 0.05, 0), mat(px + (rng() - 0.5) * 0.06, top - 0.12 - j * 0.11, pz + (rng() - 0.5) * 0.06, 0, rng() * 3, 0, 1, k === 1 ? 1.8 : 1, 1), o(k === 1 ? c('#a01810') : c('#b08a50'), top - 3));
    }
  }

  // ---------------------------------------------------------------- the divan (west gallery, x CX - 12.6 .. -9.6)
  {
    const x0 = CX - 12.1, x1 = CX - 10.0, z0 = CZ - 5.2, z1 = CZ + 3.4, g = G(CX - 11, CZ);
    const cols = [MADDER, INDIGO, MADDER, OCHRE, CREAM, MADDER, INDIGO];
    const n = low ? 14 : 28;
    for (let i = 0; i < n; i++) {
      const za = z0 + (z1 - z0) * i / n, zb = z0 + (z1 - z0) * (i + 1) / n, zm = (za + zb) / 2;
      B.add(B.box(x1 - x0, 0.012, zb - za + 0.002), mat((x0 + x1) / 2, G((x0 + x1) / 2, zm) + 0.05, zm), o(cols[i % cols.length].clone().multiplyScalar(1.0 + 0.3 * rng()), g));
    }
    B.add(B.box(0.12, 0.014, z1 - z0), mat(x1 - 0.06, G(x1, CZ) + 0.055, (z0 + z1) / 2), o(OCHRE.clone().multiplyScalar(0.8), g)); // the border
    // bolsters along the wall, cushions in front
    for (let k = 0; k < 4; k++) {
      const z = z0 + 0.8 + k * 2.1, bg = G(CX - 12.2, z);
      B.add(B.cyl(0.19, 0.19, 1.7, 10, 1), mat(CX - 12.25, bg + 0.22, z, Math.PI / 2, 0, 0), o(k % 2 ? MADDER : INDIGO, bg));
      B.add(B.box(0.55, 0.13, 0.55, { chip: 0.04 }), mat(CX - 11.6, bg + 0.1, z - 0.4 + rng() * 0.2, 0, rng() * 0.4, 0), o(k % 2 ? OCHRE : ROSE, bg));
    }
    // the brass tray on its stand, the pot and three cups
    const tx = CX - 10.9, tz = CZ - 1.3, tg = G(tx, tz);
    B.add(B.cyl(0.18, 0.24, 0.32, 8, 1), mat(tx, tg + 0.16, tz), o(WOOD_D, tg));
    B.add(B.cyl(0.42, 0.42, 0.025, 16, 1), mat(tx, tg + 0.34, tz), o(BRASS, tg, { iron: 0.3, wet: 0.4 }));
    B.add(B.lathe([[0.0, 0], [0.08, 0.01], [0.09, 0.08], [0.05, 0.14], [0.03, 0.2], [0.06, 0.24], [0.0, 0.27]], 10), mat(tx + 0.12, tg + 0.35, tz - 0.1), o(BRASS, tg, { iron: 0.3, wet: 0.4 }));
    rod(B, [tx + 0.2, tg + 0.47, tz - 0.1], [tx + 0.31, tg + 0.53, tz - 0.1], 0.012, o(BRASS, tg, { iron: 0.3 }), 4);
    for (let k = 0; k < 3; k++) { const a = 2 + k * 1.1; B.add(B.cyl(0.035, 0.028, 0.05, 8, 1), mat(tx + Math.cos(a) * 0.22, tg + 0.38, tz + Math.sin(a) * 0.22), o(k === 1 ? L.tile[0] : CREAM, tg, { wet: 0.4 })); }
  }

  // ---------------------------------------------------------------- the alcove (east gallery's north end)
  {
    const ax = CX + 9.6, za = CZ - 6.86, zb = CZ - 1.37, rodY = G(ax, CZ - 4) + 2.35;
    rod(B, [ax + 0.15, rodY, za], [ax + 0.15, rodY, zb], 0.018, o(L.wood, rodY - 3), 5);
    // the curtain: drawn across the first bay in folds, bunched at the second
    const stripes = [L.cloth[0], L.cloth[1], L.cloth[2], L.cloth[1]];
    const nf = low ? 8 : 14;
    for (let i = 0; i < nf; i++) {
      const z = za + 0.15 + i * (2.6 / nf), w = 2.6 / nf + 0.01, g = G(ax, z);
      B.add(B.box(0.02, rodY - g - 0.08, w), mat(ax + 0.15 + (i % 2 ? 0.05 : -0.03), (rodY + g + 0.08) / 2, z, 0, (i % 2 ? 0.35 : -0.35), 0), o(stripes[i % 4], g));
    }
    for (let i = 0; i < 4; i++) { const z = za + 3.0 + i * 0.12, g = G(ax, z); B.add(B.box(0.06, rodY - g - 0.12, 0.1), mat(ax + 0.12, (rodY + g + 0.12) / 2, z, 0, 0.2, 0.03 * (i - 1.5)), o(stripes[i % 4], g)); }
    // the pallet, the quilt, the bolster
    const px = CX + 11.6, pz = CZ - 5.2, pg = G(px, pz);
    B.add(B.box(1.0, 0.16, 2.0, { chip: 0.03 }), mat(px, pg + 0.08, pz), o(LINEN, pg));
    B.add(B.box(1.04, 0.05, 1.45, { chip: 0.02 }), mat(px - 0.02, pg + 0.18, pz + 0.24, 0, 0.02, 0.02), o(ROSE, pg));
    B.add(B.cyl(0.12, 0.12, 0.85, 8, 1), mat(px, pg + 0.24, pz - 0.82, 0, 0, Math.PI / 2), o(CREAM, pg));
    B.add(B.box(0.5, 0.04, 0.5), mat(px - 0.1, pg + 0.22, pz + 0.55, 0, 0.5, 0), o(OCHRE, pg)); // a shawl thrown on it
    // the chest, banded, against the wall
    const kx = CX + 12.0, kz = CZ - 2.4, kg = G(kx, kz);
    B.add(B.box(0.55, 0.5, 0.9, { chip: 0.02 }), mat(kx, kg + 0.25, kz), o(L.wood, kg));
    for (const dz of [-0.3, 0.3]) B.add(B.box(0.57, 0.52, 0.05), mat(kx, kg + 0.25, kz + dz), { color: L.iron, iron: 0.8, moss: 0, ground: kg });
    B.add(B.cyl(0.04, 0.04, 0.06, 6, 1), mat(kx - 0.29, kg + 0.38, kz, 0, 0, Math.PI / 2), { color: L.gilt, iron: 0.5, moss: 0, ground: kg });
    // his own slippers, plain, side by side at the pallet's foot
    for (const dx of [-0.09, 0.09]) B.add(B.box(0.09, 0.05, 0.27, { chip: 0.02 }), mat(CX + 10.7 + dx, G(CX + 10.7, CZ - 3.9) + 0.025, CZ - 3.9, 0, 0.1, 0), o(LEATHER, kg));
  }

  // ---------------------------------------------------------------- the washing line (the court's south-west corner)
  {
    const a = [CX - 9.6, G(CX - 9.6, CZ + 6.86) + 2.3, CZ + 6.86], b = [CX - 6.86, G(CX - 6.86, CZ + 9.6) + 2.3, CZ + 9.6];
    const at = (s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s - 0.25 * 4 * s * (1 - s), a[2] + (b[2] - a[2]) * s];
    for (let i = 0; i < 8; i++) rod(B, at(i / 8), at((i + 1) / 8), 0.006, o(c('#7a6a50'), a[1] - 3), 3);
    const yaw = Math.atan2(b[2] - a[2], b[0] - a[0]);
    const hang = (s, w, h, col) => { const p = at(s); B.add(B.box(w, h, 0.015), mat(p[0], p[1] - h / 2, p[2], 0, -yaw, 0.01), o(col, p[1] - 3)); };
    hang(0.27, 1.1, 1.3, LINEN); // a sheet
    hang(0.6, 0.55, 0.95, L.cloth[0]); // a long shirt, saffron
    hang(0.6, 0.95, 0.18, L.cloth[0]); // its arms
    hang(0.82, 0.12, 0.7, MADDER); // a sash
  }

  // ---------------------------------------------------------------- the mending
  {
    // the ladder laid down along the south gallery's front, the roof's patch done for the day, a bucket of limewash
    // at its foot and a brush across it. (v15-W2, the owner's rule: it stood against the gallery's roof and read as a
    // way up that was not one; lying down it is a thing put away.)
    const lx = CX - 0.6, lz = CZ + 8.95, x0 = lx - 4.05, x1 = lx - 0.05, y = (x) => G(x, lz) + 0.035;
    for (const dz of [-0.22, 0.22]) rod(B, [x0, y(x0), lz + dz], [x1, y(x1), lz + dz], 0.03, o(L.wood, G(lx, lz)), 4);
    for (let k = 1; k < 11; k++) { const x = x0 + (x1 - x0) * k / 11; rod(B, [x, y(x) + 0.01, lz - 0.22], [x, y(x) + 0.01, lz + 0.22], 0.018, o(L.wood, G(lx, lz)), 4); }
    ladders(ctx).add({ id: 'pomegranate-ladder', mod: 'house', foot: [x1, lz, G(x1, lz)], top: [x0, lz, G(x0, lz)], scenery: 'laid down on the court along the south gallery, the bucket at its foot' });
    const bx = lx + 0.7, bz = lz - 0.2, bg = G(bx, bz);
    B.add(B.cyl(0.15, 0.12, 0.3, 10, 1, true), mat(bx, bg + 0.15, bz), o(WOOD_D, bg));
    B.add(B.cyl(0.14, 0.14, 0.01, 10, 1), mat(bx, bg + 0.27, bz), o(L.plaster[3], bg, { wet: 0.6 }));
    B.add(B.box(0.06, 0.04, 0.42), mat(bx, bg + 0.31, bz, 0, 0.7, 0), o(L.wood, bg));
    B.add(B.box(0.08, 0.06, 0.1), mat(bx + 0.12, bg + 0.3, bz + 0.12, 0, 0.7, 0), o(L.plaster[3], bg));
    // fresh limewash on the court's side of the north wall, in square patches, brighter than the old
    for (const [dx, h, w, hh] of [[-6.2, 1.2, 1.1, 0.9], [-3.4, 0.7, 0.8, 0.7], [5.0, 1.0, 1.3, 1.1], [7.6, 1.6, 0.7, 0.6]]) {
      const x = CX + dx, z = CZ - 12.58, g = G(x, z);
      B.add(B.box(w, hh, 0.012), mat(x, g + h, z), o(L.plaster[3].clone().multiplyScalar(1.06), g));
    }
  }

  // ---------------------------------------------------------------- water in the fountain; the broom
  {
    const g = G(CX, CZ);
    B.add(B.cyl(2.02, 2.02, 0.02, 8, 1), mat(CX, g + 0.6, CZ, 0, Math.PI / 8, 0), { color: c('#141820'), moss: 0, ground: g, wet: 1 });
    const bx = CX - 1.65, bz = CZ + 1.65, bg = G(bx, bz); // on the rim, away from the musician's side
    B.add(B.cyl(0.14, 0.11, 0.26, 10, 1, true), mat(bx, g + 0.73, bz), { color: L.wood, iron: 0, moss: 0, ground: bg });
    rod(B, [bx - 0.13, g + 0.86, bz], [bx + 0.13, g + 0.86, bz], 0.008, { color: L.iron, iron: 0.9, moss: 0, ground: bg }, 3);
    // the broom against the gate's east jamb, inside
    const kx = CX + 1.9, kz = CZ - 12.0, kg = G(kx, kz);
    rod(B, [kx, kg + 0.02, kz + 0.3], [kx + 0.05, kg + 1.4, kz], 0.016, o(L.wood, kg), 4);
    B.add(B.cyl(0.03, 0.13, 0.42, 6, 1), mat(kx - 0.005, kg + 0.2, kz + 0.29, -0.2, 0, 0), o(c('#a08a50'), kg));
  }

  // ---------------------------------------------------------------- the inside lamps' cords, from the gallery roofs
  for (const [x, z, h] of HUNG) { const g = G(x, z); rod(B, [x, g + 3.92, z], [x, g + h, z], 0.006, { color: L.iron, iron: 0.9, moss: 0, ground: g }, 3); }

  // ---------------------------------------------------------------- what a walker does not walk through
  // the fire and the oven are walls (`stand: false`): nobody climbs onto an oven or stands in the coals
  const col = (x, z, r, h, stand) => { const g = G(x, z); ctx.addCollider({ x, z, r, y: g - 1, h: h + 1, ...(stand === false ? { stand: false } : {}) }); };
  col(CX + 5.5, CZ + 11.55, 0.66, 1.15, false); // the oven
  col(HEARTH.x, HEARTH.z, 0.55, 0.8, false); // the fire, its stones and the pot
  col(CX - 0.2, CZ + 12.1, 0.34, 1.0); // the jar
  col(CX + 7.2, CZ + 11.9, 0.5, 0.6); // the wood
  col(CX - 10.9, CZ - 1.3, 0.42, 0.36); // the tray
  col(CX + 12.0, CZ - 2.4, 0.45, 0.5); // the chest
}
