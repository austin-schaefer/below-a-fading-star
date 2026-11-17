// What is left of a Noonwright carrier, lived in (v15-V1). The carriers were vessels the size of a hall, blown whole
// and glazed, that carried a measure of noon; the line failed and they came down. None here is whole: a house is made
// in a piece of one. The wall is a forearm thick (a milk body under a skin of glaze) and shows it at every break;
// the glaze is crazed all over, crusted with lime in streaks from the top, sooted round the flue, sheared off in a
// sheet to the dull body, mossed at the foot. Nothing is smooth and nothing shines. Three forms:
//   'sherd'  a third of a vessel's wall standing broken-edged behind the plot, 10 m and more across, curving in
//            overhead like an apse; in its lap a Late plaster house, poles and planks from its roof to the wall
//   'sunk'   one buried to its shoulder: a glazed dome with a lens in it and the stub of its neck, earth banked
//            round it, entered by a ragged cut with a plank frame knocked into it and a door hung in the frame
//   'wreck'  one lying along the plot (8 m of front and more), half in the ground: the belly caved in on top, a
//            breach in its side walled up in plaster with a door, the neck snapped off and lying apart, shards
// o: seed, w, d, form, glaze (0..3, GLAZES), lit (0..1), low. Least plot 4.6 x 4.4 ('wreck' 8 x 3.6); less throws.
import * as THREE from 'three';
import { GLAZES, NOON_PARTS } from '../../v8/strata/noon.js';
import { L, H, V, N, rngOf, ch, worn, site, beam, pot, addPainted, facade, leaf, limeGlow } from './kit.js';
import { room } from './late.js';

export const VESSEL_FORMS = ['sherd', 'sunk', 'wreck'];
const TH = 0.36; // the wall's thickness

export function vessel(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 7), w = o.w ?? 8, d = o.d ?? 6, low = !!o.low, g0 = M.elements[13], lit = o.lit ?? 0.8;
  let form = o.form || (w >= 8 && w >= d * 1.8 ? 'wreck' : seed % 2 ? 'sunk' : 'sherd');
  if (form === 'wreck' && (w < 8 || d < 3.6)) form = 'sunk';
  if (w < 4.6 || d < 4.4 - (form === 'wreck' ? 0.8 : 0)) throw new Error(`carrier: a plot ${w} x ${d} m is too small (4.6 x 4.4)`);
  const R = site(M, 'carrier', { seed, w, d }), base = B.triangles; R.form = form;
  const G = GLAZES[(o.glaze ?? seed) % GLAZES.length], side = rng() < 0.5 ? -1 : 1;
  const set = (out, C, k = 1) => { out.r = C.r * k; out.g = C.g * k; out.b = C.b * k; };
  const mix = (out, C, k) => { out.r += (C.r - out.r) * k; out.g += (C.g - out.g) * k; out.b += (C.b - out.b) * k; };
  const n3 = (x, y, z) => B.n3(x + seed * 1.7, y, z - seed * 0.9);
  const sat = (v) => Math.max(0, Math.min(1, v));
  const soots = []; // { x, y, z, r }: where smoke has gone up the glaze
  // the glaze at a point of the skin (local metres), y01 its height in the piece (0 the foot, 1 the top)
  const glazeAt = (x, y, z, y01, out) => {
    const u = x * 0.9 + z * 0.6, tone = 0.92 + 0.16 * n3(u * 0.25, y * 0.25, 2.2);
    set(out, G[0], tone); mix(out, V.dirt, 0.14 + 0.16 * n3(u * 0.6, y * 0.5, 5));
    if (y01 > 0.78) mix(out, G[2], 0.5 * sat((y01 - 0.78) * 6)); // the shoulder's amber, gone dull
    // sheared off in a sheet: the dull milk body, a tone greyer than limewash
    const sh = n3(u * 0.13, y * 0.13, 9.3) + 0.12 * n3(u * 0.6, y * 0.6, 1.1);
    if (sh > 0.3) { const k = sat((sh - 0.3) * 7); mix(out, { r: N.milk.r * 0.7, g: N.milk.g * 0.68, b: N.milk.b * 0.64 }, k * 0.9); }
    // lime in streaks down from the top, heaviest high up
    const st = sat(n3(u * 1.7, y * 0.06, 3.3) * 1.6 - 0.2) * sat(0.25 + y01 * 1.1) * (0.6 + 0.4 * n3(u * 4, y * 0.3, 8));
    mix(out, V.lime, sat(st) * 0.6);
    // damp and moss colour at the foot
    mix(out, { r: 0.16, g: 0.19, b: 0.12 }, sat(1 - y / 0.9) * 0.6);
    let k = 0; for (const s of soots) { const dy = y - s.y, dh = Math.hypot(x - s.x, z - s.z); if (dy > -0.3 && dy < s.len && dh < s.r) k = Math.max(k, (1 - dy / s.len) * (1 - dh / s.r)); }
    mix(out, V.soot, sat(k * 1.5) * 0.85);
    out.e = 0;
  };
  const bodyAt = (x, y, z, out, glow = 0) => { set(out, N.milk, 0.5 + 0.1 * n3(x * 0.8, y * 0.8, z * 0.8)); mix(out, V.dirt, 0.2); out.e = glow; };
  const skinOpts = { color: N.milk, moss: 0.55, wet: 0, course: 0.17, ground: g0 }; // (the crazing: a fine net all over)
  // a piece of wall: P(i, j, inner) over a grid nu by nv (wrapU: closed round), cells where open(i, j) left out; its
  // outer skin glazed, its inner the body, and a face through the thickness at every broken edge
  const piece = (P, nu, nv, wrapU, open, y01, inGlow = 0, footJ = true) => {
    const cols = wrapU ? nu : nu + 1, id = (i, j) => j * cols + (wrapU ? ((i % nu) + nu) % nu : i);
    const shut = (i, j) => { if (j < 0 || j >= nv) return false; if (wrapU) i = ((i % nu) + nu) % nu; else if (i < 0 || i >= nu) return false; return !open(i, j); };
    for (const inner of [false, true]) {
      const pos = [], idx = [];
      for (let j = 0; j <= nv; j++) for (let i = 0; i < cols; i++) pos.push(...P(i, j, inner));
      let flip = null;
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        if (!shut(i, j)) continue;
        const a = id(i, j), b = id(i + 1, j), c2 = id(i, j + 1), e = id(i + 1, j + 1);
        if (flip === null) { const pa = new THREE.Vector3(...P(i, j, inner)), n = new THREE.Vector3(...P(i + 1, j, inner)).sub(pa).cross(new THREE.Vector3(...P(i, j + 1, inner)).sub(pa)), out = new THREE.Vector3(...P(i, j, false)).sub(new THREE.Vector3(...P(i, j, true))); flip = n.dot(out) < 0 !== inner; }
        if (flip) idx.push(a, c2, b, b, c2, e); else idx.push(a, b, c2, b, e, c2);
      }
      if (!idx.length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      if (!inner) { // the crazing: the shader's mortar net, laid askew and pulled about so no line of it runs true
        const mu = new Float32Array((pos.length / 3) * 2);
        for (let k = 0; k < pos.length / 3; k++) { const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2], s = x * 0.8 + z * 0.6; mu[k * 2] = s * 0.77 - y * 0.64 + 0.5 * n3(x * 0.9, y * 0.9, z * 0.9 + 3); mu[k * 2 + 1] = s * 0.64 + y * 0.77 + 0.5 * n3(x * 0.9 + 7, y * 0.9, z * 0.9); }
        g.setAttribute('muv', new THREE.BufferAttribute(mu, 2)); }
      addPainted(B, g, M, inner ? { color: N.milk, moss: 0.05, wet: 0, ground: g0 - 3 } : skinOpts, inner ? (x, y, z, out) => bodyAt(x, y, z, out, inGlow) : (x, y, z, out) => glazeAt(x, y, z, y01(y), out));
    }
    // the breaks: the wall seen in section
    const pos = [], v = [0, 1, 2, 3].map(() => new THREE.Vector3()), cen = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (!shut(i, j)) continue;
      cen.set(0, 0, 0); for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cen.add(q.set(...P(i + di, j + dj, false)).add(n.set(...P(i + di, j + dj, true))).multiplyScalar(0.5)); cen.multiplyScalar(0.25);
      for (const [ni, nj, e0, e1] of [[i - 1, j, [0, 0], [0, 1]], [i + 1, j, [1, 0], [1, 1]], [i, j - 1, [0, 0], [1, 0]], [i, j + 1, [0, 1], [1, 1]]]) {
        if (shut(ni, nj) || (footJ && nj < 0)) continue; // (the foot is in the ground)
        v[0].set(...P(i + e0[0], j + e0[1], false)); v[1].set(...P(i + e1[0], j + e1[1], false)); v[2].set(...P(i + e1[0], j + e1[1], true)); v[3].set(...P(i + e0[0], j + e0[1], true));
        n.copy(v[1]).sub(v[0]).cross(q.copy(v[2]).sub(v[0]));
        for (const k of n.dot(q.copy(v[0]).sub(cen)) > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) pos.push(v[k].x, v[k].y, v[k].z);
      }
    }
    if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); addPainted(B, g, M, { color: N.milk, moss: 0.15, wet: 0, ground: g0 - 1 }, (x, y, z, out) => { set(out, N.milk, 0.66 + 0.12 * n3(x * 2, y * 2, z * 2)); mix(out, V.dirt, 0.18); }); }
  };
  // a shard: a lump of the wall, as thick as the wall, lying where it fell and half in the ground
  const shard = (x, z, s = 1) => {
    const a = 0.7 + rng() * 0.6, b = 0.5 + rng() * 0.5, col = G[0].clone().multiplyScalar(0.6).lerp(V.dirt, 0.4);
    B.add(B.box(a * s, TH, b * s, { seg: 0.5, chip: 0.12, seed: seed + x * 7 }), ch(M, x, 0.02 + rng() * 0.08, z, (rng() - 0.5) * 0.5, rng() * 3, (rng() - 0.5) * 0.5), { color: rng() < 0.4 ? N.milk.clone().multiplyScalar(0.55).lerp(V.dirt, 0.25) : col, moss: 0.6, course: 0.17, ground: g0 });
    R.post(x, z, 0.35 * s, 0, 0.3);
  };
  const plaster = worn(L.plaster[rng() < 0.6 ? 0 : 3], rng, 0.08 + rng() * 0.1, 0.08), paint = L.paint[Math.floor(rng() * 4)];
  const wood = () => ({ color: worn(L.wood, rng, 0.25, 0.2), moss: 0.08, ground: g0 - 1 });

  if (form === 'sherd') {
    // ---- a third of a great vessel's wall behind, a plaster house in its lap
    const Rv = Math.max(5, Math.min(7.5, w * 0.8)), tm = Math.asin(Math.min(0.97, (w / 2 - 0.2) / Rv)), Ht = 8.5 + rng() * 3, zbk = -d / 2 + 0.12, zc = zbk + Rv;
    const nu = low ? 12 : 18, nv = low ? 7 : 10, ph = rng() * 0.5;
    const top = (u) => Ht * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, Math.max(0, u * 0.85 + (side > 0 ? 0.12 : 0.03) + ph * 0.06))) ** 0.7) * (0.86 + 0.14 * n3(u * 5, 1, 4)); // the broken top: high to one side
    const rAt = (y) => Rv * (1 + 0.05 * Math.sin((Math.PI * y) / Ht) - 0.2 * sat(y / Ht) ** 2.2); // bellied, then in overhead
    const P = (i, j, inner) => { const u = i / nu, v = j / nv, y = -0.5 + (top(u) + 0.5) * v, jag = 1 - 0.16 * sat(v) * (0.5 + 0.5 * n3(j * 1.3, u > 0.5 ? 3 : 7, 2)), t = tm * (2 * u - 1) * jag, r = rAt(y) - (inner ? TH : 0); return [Math.sin(t) * r, y, zc - Math.cos(t) * r]; };
    // the house: as wide as the lap lets it be, its back wall in under the curve
    const hx = Math.min(w / 2 - 0.5, (Rv - TH) * Math.sin(tm) - 0.45), hh = 2.55 + rng() * 0.35, zf = d / 2 - 0.45 - rng() * 0.2, zb = Math.min(zf - 2.4, zc - Math.sqrt((Rv - TH) ** 2 - hx * hx) + 0.1), dx = side * (hx - 1.0 - rng() * 0.5);
    const fx = -side * hx * 0.45, fz = zb + 0.7; // the flue
    soots.push({ x: fx, y: hh + 0.6, z: zc - Math.sqrt(Math.max(0, Rv * Rv - fx * fx)), len: Ht * 0.6, r: 1.5 });
    piece(P, nu, nv, false, () => false, (y) => sat(y / Ht));
    for (let i = 0; i < 8; i++) { const a = -tm + (i / 8) * 2 * tm, b = -tm + ((i + 1) / 8) * 2 * tm, r = Rv - TH / 2; R.wall(Math.sin(a) * r, zc - Math.cos(a) * r, Math.sin(b) * r, zc - Math.cos(b) * r, 0, 5, TH / 2); }
    room(B, M, R, { x0: -hx, x1: hx, zb, zf, h: hh, rng, g0, color: plaster, low, patches: low ? 2 : 3, openings: [{ door: true, kind: 'ogee', x: dx, y: 0, w: 1.0, sp: 1.35, paint, frame: L.paint[(seed + 1) % 4] }, { kind: 'rect', x: -side * hx * 0.4, y: 1.25, w: 0.55, sp: 0.6, paint, stop: 'lit', one: side }], par: { f: 0.3, b: 0, l: 0.25, r: 0.25 } });
    // poles from its roof to the wall, planks on them; the flue
    const zin = (x, y) => zc - Math.sqrt(Math.max(0.01, (rAt(y) - TH) ** 2 - x * x));
    for (let i = 0, np = low ? 3 : 5; i < np; i++) { const x = -hx + 0.5 + (i / (np - 1)) * (2 * hx - 1), y1 = hh + 1.15; beam(B, M, [x, hh + 0.28, zf - 0.6], [x + (rng() - 0.5) * 0.3, y1, zin(x, y1) + 0.05], 0.11, { color: V.rawWood, moss: 0.1, ground: g0 - 2, round: 5 }); }
    { const za = zf - 0.6, zz = zin(0, hh + 1.15) + 0.05, sl = (hh + 1.15 - (hh + 0.28)) / (za - zz); // (the planks lie on the poles: their slope, a pole's half thickness up)
      for (let i = 0; i < (low ? 2 : 4); i++) { const z = Math.max(zz + 0.4, zb + 0.3) + i * 0.52; if (z > za - 0.3) break; B.add(B.box(2 * hx - 0.8, 0.04, 0.5, { seg: 9 }), ch(M, 0, hh + 0.28 + (za - z) * sl + 0.075, z, Math.atan(sl), 0, 0), wood()); } }
    beam(B, M, [fx, hh - 0.2, fz], [fx, hh + 2.2, fz - 0.15], 0.16, { color: L.iron, iron: 0.6, moss: 0, ground: g0 - 3, round: 6 });
    pot(B, M, dx + side * 0.95 > hx - 0.3 ? dx - side * 0.95 : dx + side * 0.95, 0, zf + 0.35, 0.26, worn(L.tile[0], rng, 0.4), 1.9);
    for (let i = 0; i < (low ? 2 : 4); i++) shard(side * (w / 2 - 0.5 - rng() * 0.8) * (i % 2 ? 1 : -1), zf + 0.1 + rng() * 0.5 - (i > 1 ? 1.5 : 0));
    R.top = Ht;
  } else if (form === 'sunk') {
    // ---- buried to the shoulder: a dome, the stub of the neck, a door cut in it
    const Rd = Math.min(w / 2 - 0.45, d / 2 - 0.25, 3.4), Hd = Math.max(2.55, Rd * 0.86), rn = 0.5 + rng() * 0.12, zc = -0.15;
    const nu = Math.max(14, Math.round((2 * Math.PI * Rd) / (low ? 0.8 : 0.7))), nv = low ? 8 : 10, nd = 2, hDoor = 2.0;
    // rows: the dome from under the ground to the neck's foot, then the stub up to its break
    const prof = (v) => { if (v <= 0.8) { const p = (v / 0.8) * Math.PI / 2; return [rn + (Rd - rn) * Math.cos(p) ** 0.75, -0.4 + (Hd + 0.4) * Math.sin(p) ** 0.85]; } return [rn * (1 + (v - 0.8) * 0.5), Hd + (v - 0.8) * 2.2]; };
    const a0 = Math.PI / nu * (nd % 2 ? 1 : 0); // (the door's cells centred on the front)
    const P = (i, j, inner) => { const a = (i / nu) * Math.PI * 2 - (nd / 2) * (Math.PI * 2 / nu) + a0 * 0, [r0, y0] = prof(j / nv), top = j === nv ? 0.28 * n3(i * 1.9, 3, 1) : 0, r = r0 - (inner ? TH * (j > nv * 0.8 ? 0.5 : 1) : 0); return [Math.sin(a) * r, y0 + top, zc + Math.cos(a) * r]; };
    const jDoor = Math.max(2, Math.ceil(nv * 0.8 * (Math.asin(Math.min(1, ((hDoor + 0.4) / (Hd + 0.4)) ** (1 / 0.85))) / (Math.PI / 2))));
    const open = (i, j) => i < nd && j < jDoor;
    soots.push({ x: -side * rn * 0.5, y: Hd * 0.7, z: zc - 0.2, len: 1.6, r: 0.9 }, { x: 0, y: hDoor - 0.2, z: zc + Rd * 0.7, len: 1.4, r: 0.8 });
    piece(P, nu, nv, true, open, (y) => sat(y / (Hd + 0.4)), lit * 0.11);
    // the frame knocked into the cut, the leaf hung in it and standing open inward
    const pa = P(0, 0, false), pb = P(nd, 0, false), ja = P(0, jDoor, false), dw = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]), zd = (pa[2] + pb[2]) / 2 - 0.1, yd = ja[1] - 0.05, fw = dw - 0.16;
    for (const s of [-1, 1]) beam(B, M, [s * fw / 2, -0.1, zd], [s * fw / 2, yd, zd - 0.25], 0.12, wood(), 0.2);
    beam(B, M, [-fw / 2 - 0.12, yd, zd - 0.25], [fw / 2 + 0.12, yd + 0.03, zd - 0.25], 0.14, wood(), 0.2);
    B.add(B.box(fw + 0.1, 0.1, 1.5, { seg: 9, chip: 0.02 }), ch(M, 0, 0.0, zd + 0.15), wood()); // the sill: a board out over the bank
    leaf(B, ch(M, side * (fw / 2 - 0.08), 0.06, zd - 0.14, 0, -side * 1.35, 0).multiply(new THREE.Matrix4().makeTranslation(-side * (fw - 0.2) / 2, 0, 0)), fw - 0.2, Math.min(1.85, yd - 0.1), worn(paint, rng, 0.35), rng, { plain: low });
    R.door(0, zd + 0.9, { enter: true, w: fw - 0.1 });
    // the round room: boards, a bed on the curve, a hearth under the neck's side, a flask of the old light
    const ri = Rd - TH, yF = 0.05, dim = (col, k = 0.05) => ({ color: col, moss: 0, ground: g0 - 3, emit: [col.r * k, col.g * k, col.b * k, 1] });
    B.add(new THREE.CircleGeometry(ri + 0.1, low ? 14 : 20).rotateX(-Math.PI / 2), ch(M, 0, yF, zc), dim(worn(L.wood, rng, 0.2), 0.07));
    R.disc(0, zc, ri - 0.05, yF); R.floor(0, zd + 0.15, fw, 1.3, yF);
    { const n = 12, half = Math.asin(Math.min(0.9, (fw / 2 + 0.3) / (Rd - TH / 2))); for (let i = 0; i < n; i++) { const a = half + (i / n) * (Math.PI * 2 - 2 * half), b = half + ((i + 1) / n) * (Math.PI * 2 - 2 * half), r = Rd - TH / 2; R.wall(Math.sin(a) * r, zc + Math.cos(a) * r, Math.sin(b) * r, zc + Math.cos(b) * r, 0, 4, TH / 2); } }
    { const a = Math.PI + side * 0.5, r = ri - 0.75, m = ch(M, Math.sin(a) * r, yF, zc + Math.cos(a) * r, 0, a, 0); B.add(B.box(1.7, 0.32, 0.8, { seg: 9 }), ch(m, 0, 0.16, 0), dim(L.wood)); B.add(B.box(1.72, 0.1, 0.72, { seg: 9 }), ch(m, 0, 0.37, 0), dim(worn(V.linen, rng, 0.2), 0.07)); R.post(Math.sin(a) * r, zc + Math.cos(a) * r, 0.6, yF, 0.5); }
    { const a = Math.PI - side * 0.75, r = ri - 0.5, x = Math.sin(a) * r, z = zc + Math.cos(a) * r, m = ch(M, x, yF, z, 0, a + Math.PI, 0), mud = dim(worn(V.mud, rng, 0.15), 0.06);
      B.add(B.box(0.9, 0.4, 0.6, { seg: 9, chip: 0.03 }), ch(m, 0, 0.2, 0), mud); B.add(B.cyl(0.14, 0.45, 1.1, 6, 1), ch(m, 0, 0.95, -0.05), mud);
      B.add(B.box(0.42, 0.3, 0.03, { seg: 9 }), ch(m, 0, 0.58, 0.27), { color: V.soot, moss: 0, ground: g0 - 3, emit: [...V.ember, 1] });
      R.post(x, z, 0.45, yF, 1.2, { stand: false }); R.light(x - Math.sin(a) * 0.5, yF + 0.7, z - Math.cos(a) * 0.5, '#ff8a3a', 1.5, 6); }
    // the lens in the shoulder, where the street sees it
    { const a = -side * 0.95, v = 0.42, [r0, y0] = prof(v), [r1, y1] = prof(v + 0.05), sl = Math.atan2(r0 - r1, y1 - y0), p = [Math.sin(a) * r0, y0, zc + Math.cos(a) * r0];
      NOON_PARTS.lens(B, ch(M, p[0], p[1], p[2], 0, a, 0).multiply(new THREE.Matrix4().makeRotationX(-sl)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.04)), { r: 0.5, lit: lit * 0.3, cheap: low }); R.window(p[0], p[1], p[2], true); }
    // earth banked against it, all round but the front
    for (let i = 0, nb = low ? 5 : 8; i < nb; i++) { const a = 1.0 + (i / (nb - 1)) * (Math.PI * 2 - 2.0), s = 0.7 + rng() * 0.35, r = Rd + 0.15, bx = Math.max(-w / 2 - 0.4 + s, Math.min(w / 2 + 0.4 - s, Math.sin(a) * r)), bz = Math.max(-d / 2 + 0.25 + s * 0.8, zc + Math.cos(a) * r * 0.96);
      B.add(new THREE.IcosahedronGeometry(1, 1), ch(M, bx, -0.05, bz, 0, rng() * 3, 0, s, 0.45 + rng() * 0.35, s * 0.8), { color: worn(V.dirt, rng, 0.2, 0.2), moss: 0.9, ground: g0, disp: 0.08, dispScale: 1.2 }); }
    for (let i = 0; i < (low ? 1 : 3); i++) shard((i % 2 ? 1 : -1) * side * (fw / 2 + 1.0 + i * 0.5), d / 2 - 0.5 - rng() * 0.4, 0.8);
    R.top = Hd + 0.5;
  } else {
    // ---- lying along the plot, half in the ground: caved in on top, a breach walled up in plaster, the neck apart
    const Rw = Math.min(d / 2 - 0.2, 2.7), neckGap = 2.4, Lw = Math.min(w - 0.8 - neckGap, Rw * 4.4), x0 = -side * (w / 2 - 0.4), yc = Rw * 0.22;
    const nv = low ? 12 : 18, nu = low ? 9 : 13, am = Math.acos(Math.max(-1, (-0.45 - yc) / Rw)); // (a: from the top, down each side to under the ground)
    const cs = 0.42 + rng() * 0.14, ca = -0.25 - rng() * 0.3; // the cave: where along, and round toward the back
    const rs = (s) => Rw * (s < 0.14 ? Math.sin((s / 0.14) * Math.PI / 2) ** 0.6 * 0.92 + 0.04 : s > 0.8 ? 1 - 0.34 * ((s - 0.8) / 0.2) ** 1.5 : 0.96 + 0.04 * Math.sin(s * 7));
    const dent = (a, s) => Math.exp(-(((a - ca) / 0.55) ** 2) - ((s - cs) / 0.2) ** 2);
    const b0 = side > 0 ? 0.18 : 0.52, b1 = b0 + Math.min(0.3, 2.9 / Lw), aB = Math.acos(Math.max(-1, Math.min(1, (2.3 - yc) / Rw))); // the breach: along, and from the ground up to 2.3 m
    const P = (i, j, inner) => { const s = j / nv, a = -am + (i / nu) * 2 * am, r = Math.max(0.03, rs(s) * (1 - 0.6 * dent(a, s)) - (inner ? TH : 0)), rag = j === nv ? 0.3 * n3(i * 2.1, 2, 6) : 0; return [x0 + side * (s * Lw + rag), yc + Math.cos(a) * r, Math.sin(a) * r]; };
    const open = (i, j) => { const s = (j + 0.5) / nv, a = -am + ((i + 0.5) / nu) * 2 * am; return dent(a, s) > 0.72 || (s > b0 && s < b1 && a > aB); };
    soots.push({ x: x0 + side * Lw * (b0 + b1) / 2, y: 2.0, z: Rw * 0.7, len: 1.4, r: 1.0 });
    piece(P, nu, nv, false, open, (y) => sat(y / (yc + Rw)), 0, false);
    // the breach's wall: plaster, set back inside the break, a plank door in it
    const xb = x0 + side * Lw * (b0 + b1) / 2, bw = Lw * (b1 - b0), zw = Math.sqrt(Math.max(0.2, (Rw * 0.94 - TH) ** 2 - (2.3 - yc) ** 2)) - 0.12, dop = { kind: 'rect', x: side * bw * 0.12, y: 0, w: 0.95, sp: 1.85 };
    facade(B, ch(M, xb, 0, zw - 0.15), { w: bw + 0.9, h: 3.0, d: 0.3, openings: [dop], color: plaster, moss: 0.1, ground: g0, n: 6, emit: limeGlow(plaster) });
    leaf(B, ch(M, xb + dop.x, 0, zw - 0.2), 0.99, 1.89, worn(paint, rng, 0.35), rng, { plain: low });
    for (const s of [-1, 1]) B.add(B.box(0.1, 1.95, 0.1, { seg: 9 }), ch(M, xb + dop.x + s * 0.53, 0.97, zw + 0.03), wood());
    B.add(B.box(1.26, 0.12, 0.12, { seg: 9 }), ch(M, xb + dop.x, 1.97, zw + 0.03), wood());
    R.door(xb + dop.x, zw + 0.8);
    // the neck, snapped off and lying apart
    { const nl = 1.5 + rng() * 0.4, r0 = Rw * 0.62, r1 = Rw * 0.4, mx = x0 + side * (Lw + neckGap * 0.55), mz = (rng() - 0.3) * 0.8, yaw = side * (0.35 + rng() * 0.4), cyw = Math.cos(yaw), syw = Math.sin(yaw), nn = low ? 8 : 12;
      const PN = (i, j, inner) => { const a = (i / nn) * Math.PI * 2, t = j / 3, r = r0 + (r1 - r0) * t - (inner ? TH * 0.7 : 0), lx = side * (t - 0.5) * nl + (j === 0 ? 0.2 * n3(i * 2.3, 5, 1) : 0), lz = Math.sin(a) * r; return [mx + lx * cyw + lz * syw, r0 * 0.3 + Math.cos(a) * r, mz - lx * syw + lz * cyw]; };
      piece(PN, nn, 3, true, () => false, (y) => sat(y / (yc + Rw)), 0, false);
      R.post(mx, mz, r0 * 0.9, 0, 1.2, { stand: false }); }
    { const xa = x0 + side * TH, xe = x0 + side * Lw, r = Rw * 0.9; R.wall(xa, r * 0.8, xe, r * 0.8, 0, 3.5, 0.3); R.wall(xa, -r * 0.8, xe, -r * 0.8, 0, 3.5, 0.3); R.wall(xa, -r * 0.8, xa, r * 0.8, 0, 3.5, 0.3); R.wall(xe, -r * 0.6, xe, r * 0.6, 0, 3, 0.3); }
    for (let i = 0; i < (low ? 3 : 6); i++) shard(x0 + side * Lw * (0.25 + rng() * 0.75), Rw + 0.1 + rng() * 0.7, 0.8 + rng() * 0.5);
    R.top = yc + Rw;
  }
  R.tris = B.triangles - base;
  return R;
}
