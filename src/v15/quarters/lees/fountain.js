// The fountain of noon (v15-Q3). Not water. When the Noonwrights' line broke on this hill a vessel came down on the
// Heliarchs' processional way: its wall stands in the Strake as the back of a house, and its foot lies here in the
// square, cracked across the bottom, and out of the crack a little stored daylight still wells. It pools, white-gold
// and steady, a hand deep; it brims at the low side of the broken rim and runs off down a gutter (square.js).
// The Late folk come to it with flasks as to a well.
//
// What is here: the foot (a thick milk-glass bowl 3.4 m across, glazed outside, its rim broken low to the north where
// people dip and high to the south, a ragged tongue 3 m tall that the light climbs); the light in it (the lit floor
// and its crack in stone, the depth of it as four additive sheets: light.js); a worn kerb of robbed stones on the
// dipping side; a shelf of flasks left to fill, each fuller than the last; the Swape [Proposed], a well-sweep with a
// Heliarch drum for its counterweight, a chain and a cradle; the Leerie's slate on its post; a bench built against
// the glass where it is warm, and a vine on three poles that has grown its only leaves toward the light.
//
// The local frame is the plot's: +z out from the Strake (north), +x west; an angle is measured from +z toward +x.
import * as THREE from 'three';
import { L, H, V, N, PARTS, rngOf, ch, worn, beam, site, plotMatrix, dirty } from '../../houses/kit.js';
import { Soup, LIGHT } from './light.js';

const TAU = Math.PI * 2, rad = (d) => (d * Math.PI) / 180;
const adiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const sm = (t) => t * t * (3 - 2 * t);
export const YS = 0.46, YF = 0.16; // the light's surface and the bowl's floor, over the paving
const PROF = [[-0.14, 1.16], [0.1, 1.3], [0.4, 1.5], [0.8, 1.66], [1.4, 1.74], [2.2, 1.72], [3.6, 1.56]]; // the outer wall: [y, r]
export const ro = (y) => { for (let i = 1; i < PROF.length; i++) if (y <= PROF[i][0]) { const [y0, r0] = PROF[i - 1], [y1, r1] = PROF[i]; return r0 + (r1 - r0) * Math.max(0, (y - y0) / (y1 - y0)); } return PROF[PROF.length - 1][1]; };
const TH = 0.24;
export const NOTCH = rad(-25), SWAPE = rad(-75);

// a geometry added and then painted vertex by vertex in its own frame: fn(x, y, z, out) writes r, g, b and e (noon)
function painted(B, g, M, o, fn) {
  const lp = g.attributes.position.array.slice(), base = B.count, out = { r: 1, g: 1, b: 1, e: 0 };
  B.add(g, M, o);
  for (let i = 0, n = lp.length / 3; i < n; i++) {
    out.e = 0; fn(lp[i * 3], lp[i * 3 + 1], lp[i * 3 + 2], out);
    const k = (base + i) * 3, q = (base + i) * 4;
    B.C[k] = out.r; B.C[k + 1] = out.g; B.C[k + 2] = out.b;
    if (out.e > 0) { B.E[q] = LIGHT[0] * out.e; B.E[q + 1] = LIGHT[1] * out.e; B.E[q + 2] = LIGHT[2] * out.e; B.E[q + 3] = 0; }
  }
}

export function fountain(Q, plot) {
  const { B, G, low } = Q, rng = rngOf(1512, 3), g0 = Q.Y;
  const M = plotMatrix({ ...plot, y: Q.Y });
  const R = site(M, 'fountain', { seed: 1512, w: plot.w, d: plot.d });
  const n3 = (x, y, z) => B.n3(x + 3.1, y, z - 7.7);
  const P = (a, r, y) => [Math.sin(a) * r, y, Math.cos(a) * r];

  // ---------------------------------------------------------------- the foot
  const nu = low ? 32 : 48, nv = low ? 8 : 11, jag = Array.from({ length: nu }, () => rng());
  const rimAt = (i) => {
    const a = (((i % nu) + nu) % nu) / nu * TAU, j = jag[((i % nu) + nu) % nu];
    const t = Math.max(0, 1 - Math.abs(adiff(a, rad(185))) / 1.5), t2 = Math.max(0, 1 - Math.abs(adiff(a, SWAPE)) / 0.42), t3 = Math.max(0, 1 - Math.abs(adiff(a, NOTCH)) / 0.34);
    let h = 0.62 + 3.5 * sm(t) + 1.1 * sm(t2) * (1 - sm(t));
    h += (j - 0.5) * (0.05 + 0.55 * Math.min(1, (h - 0.62) / 1.2)); // glass breaks in points: the higher, the more ragged
    return Math.max(0.5, h - 0.1 * sm(t3));
  };
  const rims = Array.from({ length: nu }, (_, i) => rimAt(i));
  const ang = (i) => (i / nu) * TAU;
  // the outside's rings: fixed where the band is (so it is a band on every column), even above it to the break
  const levs = rims.map((h) => { const f = [-0.14, 0.4, 0.86, 0.9, 1.06, 1.1].filter((y) => y < h - 0.06), top = f[f.length - 1], n = nv + 1 - f.length; for (let k = 1; k <= n; k++) f.push(top + (h - top) * (k / n)); return f; });
  const out = (i, j) => { const y = levs[((i % nu) + nu) % nu][j]; return P(ang(i), ro(y), y); };
  const inn = (i, j) => { const h = rims[((i % nu) + nu) % nu], y = YF + (h - YF) * (j / nv); return P(ang(i), ro(y) - TH, y); };
  const milkDull = N.milk.clone().multiplyScalar(0.7), mossC = new THREE.Color(0.16, 0.19, 0.12), col = new THREE.Color();
  // the glaze at a point of the outside: deep celadon, an ox-blood band a metre up, sheared to the dull body in
  // sheets, limed from the broken edge down, green at the foot. Through it the light shows, low, and the band is dark.
  const glaze = (a, y, h) => {
    const u = a * 1.9, band = Math.abs(y - 0.98) < 0.085;
    col.copy(band ? N.oxblood : N.celadonD); if (!band) col.lerp(N.celadon, 0.3 + 0.3 * n3(u * 0.4, y * 0.3, 4.4)); col.multiplyScalar(0.9 + 0.25 * n3(u * 0.7, y * 0.6, 2.2));
    const sh = n3(u * 0.35, y * 0.4, 9.3); if (sh > 0.36 && !band) col.lerp(milkDull, Math.min(1, (sh - 0.36) * 6) * 0.85);
    col.lerp(V.dirt, 0.12 + 0.2 * Math.max(0, n3(u, y, 5)));
    col.lerp(V.lime, 0.3 * Math.max(0, n3(u * 2.4, y * 0.12, 3.3)) * Math.min(1, Math.max(0, y) / Math.max(0.6, h)));
    col.lerp(mossC, 0.55 * Math.max(0, 1 - Math.max(0, y) / 0.5));
    const e = (0.24 * Math.exp(-Math.max(0, y) / 1.2) + 0.05 * Math.max(0, 1 - (h - y) / 0.22)) * (band ? 0.5 : 1) * (0.7 + 0.6 * Math.max(0, n3(a * 2, y, 7) + 0.5));
    return [col.clone(), e];
  };
  const body = (a, y) => [col.copy(N.milk).multiplyScalar(0.6 + 0.12 * n3(a * 3, y * 2, 1.5)).clone(), y < YS ? 0.5 : 0.07 + 0.36 * Math.exp(-(y - YS) / 1.0)];
  const S = new Soup(), I = new Soup(), yOf = (p) => p[1];
  for (let i = 0; i < nu; i++) {
    const a0 = ang(i), a1 = ang(i + 1), h0 = rims[i], h1 = rims[(i + 1) % nu], radial = [Math.sin((a0 + a1) / 2), 0, Math.cos((a0 + a1) / 2)], inward = [-radial[0], 0, -radial[2]];
    for (let j = 0; j < nv; j++) {
      const p = [out(i, j), out(i + 1, j), out(i + 1, j + 1), out(i, j + 1)], c = [glaze(a0, yOf(p[0]), h0), glaze(a1, yOf(p[1]), h1), glaze(a1, yOf(p[2]), h1), glaze(a0, yOf(p[3]), h0)];
      S.quad(...p, radial, c.map((q) => q[0]), c.map((q) => q[1]));
      const q = [inn(i, j), inn(i + 1, j), inn(i + 1, j + 1), inn(i, j + 1)], d = [body(a0, yOf(q[0])), body(a1, yOf(q[1])), body(a1, yOf(q[2])), body(a0, yOf(q[3]))];
      I.quad(...q, inward, d.map((k) => k[0]), d.map((k) => k[1]));
    }
    // the break: the milk body in section, bright where the light is in it
    const pb = [out(i, nv), out(i + 1, nv), inn(i + 1, nv), inn(i, nv)], cb = N.milk.clone().multiplyScalar(0.8);
    I.quad(...pb, [radial[0] * 0.05, 1, radial[2] * 0.05], cb, [0.1, 0.1, 0.16, 0.16]);
  }
  // its floor, silted, lit from the crack; the crack itself
  { const r0 = ro(YF) - TH, c0 = N.silt.clone().lerp(N.milk, 0.25), nf = nu / 2;
    for (let i = 0; i < nf; i++) { const a0 = (i / nf) * TAU, a1 = ((i + 1) / nf) * TAU; I.tri([0, YF + 0.03, 0], P(a0, r0 + 0.02, YF), P(a1, r0 + 0.02, YF), [0, 1, 0], c0, [0.42, 0.3, 0.3]); }
    const cr = [[-0.72, 0.36], [-0.4, 0.2], [-0.22, 0.27], [0.02, 0.04], [0.2, 0.1], [0.44, -0.2], [0.7, -0.26]];
    for (let i = 0; i < cr.length - 1; i++) { const [x0, z0] = cr[i], [x1, z1] = cr[i + 1], l = Math.hypot(x1 - x0, z1 - z0), px = (-(z1 - z0) / l) * 0.03, pz = ((x1 - x0) / l) * 0.03, y = YF + 0.045;
      I.quad([x0 - px, y, z0 - pz], [x1 - px, y, z1 - pz], [x1 + px, y, z1 + pz], [x0 + px, y, z0 + pz], [0, 1, 0], N.milk, 1.3); }
  }
  S.flush(B, { color: N.milk, moss: 0.2, wet: 0.35, course: 0, ground: g0 }, M, 3.4);
  I.flush(B, { color: N.milk, moss: 0, wet: 0, course: 0, ground: g0 - 3 }, M);
  // the foot's collar, sunk in the paving
  B.add(new THREE.TorusGeometry(1.25, 0.1, 5, nu).rotateX(Math.PI / 2), ch(M, 0, 0.03, 0), { color: worn(N.celadonD, rng, 0.3), moss: 0.7, wet: 0.2, ground: g0 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, b = ((i + 1) / 12) * TAU; R.wall(Math.sin(a) * 1.5, Math.cos(a) * 1.5, Math.sin(b) * 1.5, Math.cos(b) * 1.5, 0, Math.max(1.1, Math.min(rimAt(Math.round((i + 0.5) / 12 * nu)), 3)), 0.24); }

  // ---------------------------------------------------------------- the light, as depth
  { const ys = [0.24, 0.32, 0.4, YS], nf = low ? 12 : 18;
    ys.forEach((y, k) => { const r = ro(y) - TH - 0.012, top = k === ys.length - 1;
      for (let i = 0; i < nf; i++) { const a0 = (i / nf) * TAU, a1 = ((i + 1) / nf) * TAU, c = [0, y + (top ? 0.035 : 0), 0], m0 = P(a0, r * 0.5, y + (top ? 0.012 : 0)), m1 = P(a1, r * 0.5, y + (top ? 0.012 : 0));
        const w = (p) => R.W(p[0], p[1], p[2]), v = (p) => { const q = w(p); return [q.x, q.y, q.z]; };
        G.tri(v(c), v(m0), v(m1), 0.15, 0.11, 0.11); G.quad(v(m0), v(P(a0, r, y)), v(P(a1, r, y)), v(m1), 0.11, 0.06, 0.06, 0.11); } });
  }

  // ---------------------------------------------------------------- the kerb, where people dip: five robbed stones, dished by knees
  { const dips = [0.004, 0.022, 0.04, 0.03, 0.01];
    for (let k = 0; k < 5; k++) { const a = rad(12 + k * 12 + 6), rc = 1.76, top = 0.2 - dips[k];
      B.add(B.box(0.45, 0.6, 0.62 + (k % 2) * 0.06, { seg: 9, chip: 0.05, chipTop: true, seed: 40 + k }), ch(M, Math.sin(a) * rc, top - 0.3, Math.cos(a) * rc, 0, a, 0), { color: worn(k === 2 ? H.dark : H.stone, rng, 0.14, 0.12), moss: 0.4, wet: 0.2, ground: g0 });
      R.floor(Math.sin(a) * rc, Math.cos(a) * rc, 0.42, 0.66, top, { ry: a, keep: false }); }
  }
  // ---------------------------------------------------------------- flasks left to fill
  const flask = (x, y, z, fill, s = 1, tilt = 0) => {
    const g = B.lathe([[0.001, 0], [0.07, 0], [0.098, 0.06], [0.1, 0.16], [0.058, 0.25], [0.03, 0.3], [0.042, 0.345], [0.001, 0.34]], low ? 5 : 7), yf = 0.02 + fill * 0.25, glass = worn(N.amberG, rng, 0.3, 0.2).multiplyScalar(0.55);
    painted(B, g, ch(M, x, y, z, tilt, rng() * 3, 0, s, s, s), { color: glass, moss: 0, wet: 0.6, ground: g0 - 3 }, (px, py, pz, o) => { const lit = py < yf && fill > 0; o.r = glass.r; o.g = glass.g; o.b = glass.b; o.e = lit ? 0.6 - 0.2 * (py / Math.max(0.02, yf)) : fill > 0 ? 0.02 : 0; });
  };
  { // the shelf: a Heliarch slab on two drum ends, level with the lip
    const a = rad(-4), rc = 1.98, m = ch(M, Math.sin(a) * rc, 0, Math.cos(a) * rc, 0, a, 0);
    for (const sx of [-1, 1]) PARTS.heliarch.drum(B, ch(m, sx * 0.34, -0.1, 0), { r: 0.17, h: 0.5, turn: rng(), moss: 0.5 });
    B.add(B.box(1.05, 0.09, 0.36, { seg: 9, chip: 0.03, chipTop: true, seed: 7 }), ch(m, 0, 0.44, 0), { color: worn(H.dark, rng, 0.1), moss: 0.35, ground: g0 });
    [0.95, 0.6, 0.3, 0.08].forEach((f, k) => { const q = new THREE.Vector3(-0.38 + k * 0.25, 0.485, (rng() - 0.5) * 0.1).applyMatrix4(mat4(a, rc)); flask(q.x, q.y, q.z, f); });
    R.wall(Math.sin(a) * rc - Math.cos(a) * 0.4, Math.cos(a) * rc + Math.sin(a) * 0.4, Math.sin(a) * rc + Math.cos(a) * 0.4, Math.cos(a) * rc - Math.sin(a) * 0.4, 0, 0.5, 0.2);
    R.shelf(Math.sin(a) * rc, 0.49, Math.cos(a) * rc, 1.0, 0.34);
    flask(Math.sin(rad(30)) * 1.82, 0.2 - 0.022, Math.cos(rad(30)) * 1.82, 0); flask(Math.sin(rad(55)) * 1.7, 0.2 - 0.04, Math.cos(rad(55)) * 1.7, 0.45, 0.85);
  }
  function mat4(a, rc) { return new THREE.Matrix4().makeRotationY(a).setPosition(Math.sin(a) * rc, 0, Math.cos(a) * rc); }

  // ---------------------------------------------------------------- the Swape: post, pole, counterweight, chain, cradle
  const wood = () => ({ color: worn(V.rawWood, rng, 0.35, 0.15), moss: 0.12, ground: g0, round: 6 }), iron = { color: L.iron, iron: 0.9, moss: 0, ground: g0 - 4 };
  const p0 = P(SWAPE, 2.6, 0), tipXZ = P(rad(30), 0.95, 0), hl = Math.hypot(tipXZ[0] - p0[0], tipXZ[2] - p0[2]), hx = (tipXZ[0] - p0[0]) / hl, hz = (tipXZ[2] - p0[2]) / hl, PV = 2.8, TAIL = 2.5;
  const tail = [p0[0] - hx * TAIL, 0.58, p0[2] - hz * TAIL], slope = (PV - tail[1]) / TAIL, tip = [tipXZ[0], PV + slope * hl, tipXZ[2]];
  { const qx = -hz, qz = hx; // across the pole
    for (const s of [-1, 1]) beam(B, M, [p0[0] + s * qx * 0.5, -0.25, p0[2] + s * qz * 0.5], [p0[0] - s * qx * 0.1, PV + 0.4, p0[2] - s * qz * 0.1], 0.13, wood());
    beam(B, M, [p0[0] + qx * 0.36, 0.95, p0[2] + qz * 0.36], [p0[0] - qx * 0.36, 1.0, p0[2] - qz * 0.36], 0.08, wood());
    beam(B, M, tail, tip, 0.11, wood());
    B.add(new THREE.TorusGeometry(0.1, 0.03, 4, 8), ch(M, p0[0], PV, p0[2], 0, Math.atan2(hx, hz), 0), { color: V.rope, moss: 0, ground: g0 }); // the lashing in the fork
    PARTS.heliarch.drum(B, ch(M, tail[0], -0.06, tail[2]), { r: 0.3, h: 0.58, turn: 0.3, moss: 0.5 });
    for (const k of [-1, 1]) B.add(new THREE.TorusGeometry(0.31, 0.02, 4, 10).rotateX(Math.PI / 2), ch(M, tail[0], 0.26 + k * 0.14, tail[2]), { color: V.rope, moss: 0, ground: g0 });
    R.wall(p0[0] + qx * 0.4, p0[2] + qz * 0.4, p0[0] - qx * 0.4, p0[2] - qz * 0.4, 0, 2.9, 0.14);
    R.post(tail[0], tail[2], 0.36, 0, 0.6); R.wall(tail[0], tail[2], p0[0], p0[2], 0, 2.3, 0.12);
    // the chain and the cradle, hung over the light; a flask in it
    beam(B, M, tip, [tip[0], 0.86, tip[2]], 0.02, iron);
    for (let y = 1.2; y < tip[1] - 0.3; y += low ? 1.1 : 0.55) B.add(new THREE.TorusGeometry(0.032, 0.009, 3, 6), ch(M, tip[0], y, tip[2], 0, (y * 7) % 3, 0), iron);
    B.add(B.cyl(0.125, 0.1, 0.16, 6, 1), ch(M, tip[0], 0.7, tip[2]), { color: worn(V.rope, rng, 0.4), moss: 0, ground: g0 - 4 });
    for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; beam(B, M, [tip[0] + Math.sin(a) * 0.12, 0.76, tip[2] + Math.cos(a) * 0.12], [tip[0], 0.9, tip[2]], 0.012, iron); }
    flask(tip[0], 0.66, tip[2], 0.55, 0.9);
    // the Leerie's slate, hung on the tie: what is owed, in fives, one five struck through
    const sy = Math.atan2(qx, qz), sm4 = ch(M, p0[0] + qx * 0.02 + hx * 0.09, 1.02, p0[2] + qz * 0.02 + hz * 0.09, 0, Math.atan2(hx, hz), 0);
    B.add(B.box(0.4, 0.52, 0.025, { seg: 9, chip: 0.01 }), ch(sm4, 0, 0.3, 0.02), { color: new THREE.Color('#2b2d35'), moss: 0, ground: g0 - 4 });
    for (let gI = 0; gI < 4; gI++) for (let k = 0; k < (gI === 3 ? 3 : 5); k++) B.add(B.box(0.012, 0.075, 0.006, { seg: 9 }), ch(sm4, -0.13 + (gI % 2) * 0.17 + k * 0.022, 0.42 - Math.floor(gI / 2) * 0.16, 0.036, 0, 0, (rng() - 0.5) * 0.3), { color: V.lime, moss: 0, ground: g0 - 4 });
    B.add(B.box(0.13, 0.01, 0.006, { seg: 9 }), ch(sm4, -0.085, 0.42, 0.043, 0, 0, 0.45), { color: V.lime, moss: 0, ground: g0 - 4 });
    beam(B, sm4, [0, 0.56, 0.02], [0, 0.66, -0.04], 0.012, { color: V.rope, moss: 0, ground: g0 - 4 }); void sy;
  }

  // ---------------------------------------------------------------- the bench against the warm glass, and the vine
  const seats = [];
  { const from = B.count;
    for (const d of [-116, -131, -146]) { const a = rad(d), rc = 1.74; PARTS.late.bench(B, ch(M, Math.sin(a) * rc, 0, Math.cos(a) * rc, 0, a, 0), { w: 0.5, h: 0.42, d: 0.46, rng }); R.post(Math.sin(a) * rc, Math.cos(a) * rc, 0.28, 0, 0.42); seats.push(R.W(Math.sin(a) * rc, 0.42, Math.cos(a) * rc)); }
    dirty(B, from, 0.4, rng);
    const tops = [];
    for (const d of [-104, -124, -142]) { const a = rad(d), f = P(a, 2.36, -0.2), t = P(a, 2.05, 2.3 + rng() * 0.3); beam(B, M, f, t, 0.07, wood()); R.post(f[0], f[2], 0.08, 0, 2.2, { stand: false }); tops.push(t); }
    for (let k = 0; k < 2; k++) beam(B, M, tops[k], tops[k + 1], 0.045, wood());
    // the vine: up the middle pole, along the rail, and off it toward the bowl; leaves only where the light is
    const stem = { color: new THREE.Color('#3a2c20'), moss: 0.2, ground: g0 }, f1 = P(rad(-124), 2.3, -0.1), path = [f1, [f1[0] * 0.97, 0.8, f1[2] * 0.97 + 0.05], [tops[1][0] + 0.04, 1.6, tops[1][2] - 0.03], tops[1], [(tops[1][0] + tops[2][0]) / 2, tops[1][1] - 0.08, (tops[1][2] + tops[2][2]) / 2], tops[2]];
    const reach = P(rad(-133), ro(1.7) + 0.02, 1.72); path.push([(tops[2][0] + reach[0]) / 2, 2.1, (tops[2][2] + reach[2]) / 2], reach);
    for (let k = 0; k < path.length - 1; k++) beam(B, M, path[k], path[k + 1], 0.035 - k * 0.003, stem);
    const leafC = new THREE.Color('#8e9a58');
    for (let k = 0; k < (low ? 12 : 26); k++) { const s = 3.2 + rng() * (path.length - 4.25), i = Math.floor(s), t = s - i, a = path[i], b = path[i + 1]; const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
      B.add(B.box(0.12, 0.008, 0.085, { seg: 9 }), ch(M, x + (rng() - 0.5) * 0.06, y - 0.03 - rng() * 0.05, z + (rng() - 0.5) * 0.06, (rng() - 0.5) * 1.2, rng() * 6, (rng() - 0.5) * 1.2), { color: worn(leafC, rng, 0.1, 0.25), moss: 0, ground: g0 - 4 }); }
  }
  const nw = R.W(Math.sin(NOTCH) * (ro(0.5) - 0.02), 0.5, Math.cos(NOTCH) * (ro(0.5) - 0.02)), c = R.W(0, 0, 0), spW = R.W(p0[0], 0, p0[2]), tailW = R.W(tail[0], 0, tail[2]);
  return { R, M, x: c.x, z: c.z, notch: nw, post: spW, tail: tailW, tipY: Q.Y + tip[1], seats };
}
