// The icefall's faces (v12 H2): the cliffs of ice at each step, drawn over the terrain's convex riser, and the far
// wall of the last crevasse. A face runs across the notch as a sheet from just under its foot to over its lip, then
// lies back onto the terrace above (a lip row a hand over the ground), pushed out down-glacier by bulges and
// vertical flutes, its top broken into teeth. Where a riser is cut by the climb (the slot's cleft through R1, the
// stair's slump in R3, the bridge's landing on R2) the face is left open or kept under the way.
import { RISERS, riserSpan, zOf, axisX, CREVASSE, UPPER, upperFoot } from './plan.js';

// one face: `span(x) -> [s0, s1]` (its foot and top, metres up-glacier), from xa to xb; H(x, z) the ground.
// `under(x)`: a cap on the face's top there (the bridge lies on it), or null. `deepTop`: the face is deep (blue)
// toward its foot over its whole height when true (a crevasse's wall), else only its lower part.
export function face(G, rng, H, noise, o) {
  const dx = o.dx, rows = o.rows ?? 12;
  const P = [], Q = [];
  const seed = rng();
  const cols = [];
  for (let x = o.xa; x <= o.xb + 1e-6; x += dx) cols.push(Math.min(x, o.xb));
  const _sp = [0, 0];
  for (let j = 0; j < cols.length; j++) {
    const x = cols[j];
    const [s0, s1] = o.span(x, _sp);
    const zb = zOf(s0 - (o.foot ?? 0.8)), zt = zOf(s1 + 0.5), zl = zOf(s1 + (o.lipBack ? o.lipBack(x) : 2.6));
    const yb = (o.floorY ?? H(x, zb)) - (o.sinkB ?? 3), ylip = H(x, zl) + 0.12;
    let yt = H(x, zt) + 0.6;
    const cap = o.under ? o.under(x) : null;
    if (cap !== null && cap !== undefined) yt = Math.min(yt, cap);
    // the lip: broken down in places (a bite out of it several metres deep), raised in others
    const tooth = cap !== null && cap !== undefined ? 0 : Math.max(0, noise.noise2(x * 0.08 + seed * 9, 1.7)) * 3.2 - Math.pow(Math.max(0, noise.noise2(x * 0.05, 4.4 + seed)), 1.5) * 9.0;
    for (let i = 0; i <= rows; i++) {
      if (!P[i]) { P[i] = []; Q[i] = []; }
      const v = i / rows;
      let z = zb + (zt - zb) * v, y = yb + (yt - yb) * v;
      if (i === rows) y += tooth;
      // pushed out down-glacier (+z): broad bulges, vertical flutes, and less at the foot (buried) and the top
      // nothing pushed out within 3.5 m of the foot (a walker on the terrace meets the face where its collider is), an
      // overhang above head height, little at the lip
      const hgt = y - (yb + (o.sinkB ?? 3));
      const env = (Math.sin(Math.min(1, v * 1.15) * Math.PI) * 0.8 + 0.2) * (o.deepTop ? 1 : Math.min(1, Math.max(0, (hgt - 1.5) / 2)));
      // buttresses and bays (broad, a few metres), lumps on them, faint flutes; the vertices jittered so the facets
      // break unevenly (rows of equal facets read as planks)
      const bul = Math.max(0, noise.noise2(x * 0.03 + seed * 3, y * 0.045) + 0.15) * 4.2 + Math.max(0, noise.noise2(x * 0.09 + seed, y * 0.11)) * 1.8;
      const flu = 0;
      z += (bul + flu) * env * (o.out ?? 1);
      const deep = o.deepTop ? Math.pow(1 - v, 0.8) : 0.7 * Math.pow(1 - v, 1.6);
      const mid = i > 0 && i < rows;
      P[i].push([x + (mid ? noise.noise2(y * 0.31, x * 0.27) * dx * 0.35 : 0), y + (mid ? noise.noise2(x * 0.33, y * 0.29) * 0.9 : 0), z]);
      Q[i].push([deep, seed, 0.15]);
    }
    if (o.feet) o.feet.push([x, zOf(s0 - 0.5), yb + (o.sinkB ?? 3)]);
    if (o.lips) o.lips.push([x, zOf(s1 + 0.3), yt]);
    // the lip: back onto the terrace
    if (!P[rows + 1]) { P[rows + 1] = []; Q[rows + 1] = []; }
    P[rows + 1].push([x, Math.max(ylip, yt - 0.4), zl]);
    Q[rows + 1].push([0, seed, 0.3]);
  }
  // rows run up the face, columns along x: a quad (i, j)-(i, j+1)-(i+1, j+1) faces +z when x grows along j and y with i
  G.grid(P, Q, o.flip ?? false, true);
  return cols.length;
}

// the three risers' faces, the upper icefall's, and the far wall of the last crevasse
// lines: { feet: [[x, z, y] per riser], lips: [...] } are filled with each reachable face's foot and lip, for colliders
export function buildFaces(G, rng, H, noise, low, cutouts, lines) {
  const dx = low ? 2.6 : 1.7;
  let n = 0;
  for (let k = 0; k < 3; k++) { lines.feet[k] = []; lines.lips[k] = []; }
  const zMid = (k) => zOf(RISERS[k][0] + RISERS[k][1] / 2);
  const ax = (z) => axisX(z);
  // R1: open at the slot's cleft (x 69..76)
  for (const [xa, xb] of [[ax(zMid(0)) - 78, 68.6], [76.2, ax(zMid(0)) + 72]])
    n += face(G, rng, H, noise, { xa, xb, dx, span: (x, o) => riserSpan(0, x, zMid(0), o), feet: lines.feet[0], lips: lines.lips[0], lipBack: (x) => (x > 12 && x < 100 ? 0.3 : 2.6) }); // over the slot the lip row stops short of it
  // R2: whole, its top kept under the bridge where the bridge lies on it
  n += face(G, rng, H, noise, { xa: ax(zMid(1)) - 78, xb: ax(zMid(1)) + 72, dx, span: (x, o) => riserSpan(1, x, zMid(1), o), under: cutouts.r2, feet: lines.feet[1], lips: lines.lips[1] });
  // R3: open over the slump, where the stair climbs
  for (const [xa, xb] of [[ax(zMid(2)) - 80, -6], [54, ax(zMid(2)) + 72]])
    n += face(G, rng, H, noise, { xa, xb, dx, span: (x, o) => riserSpan(2, x, zMid(2), o), feet: lines.feet[2], lips: lines.lips[2] });
  // the upper icefall's six steps (bowed and wandering as plan.js's)
  const U = UPPER;
  for (let k = 0; k < U.n; k++) {
    const zc = zOf(U.s0 + k * U.every);
    n += face(G, rng, H, noise, {
      xa: ax(zc) - 70, xb: ax(zc) + 66, dx: dx * 1.3, rows: 6, out: 0.7,
      span: (x, o) => { const f = upperFoot(k, x, zc); o[0] = f; o[1] = f + U.run; return o; },
    });
  }
  // the last crevasse's far wall: from its floor up to the far lip, deep blue all the way
  const C = CREVASSE;
  n += face(G, rng, H, noise, { xa: ax(zOf(C.far)) - 66, xb: ax(zOf(C.far)) + 62, dx, rows: 10, deepTop: true, floorY: C.floor + 1, sinkB: 2, foot: 0.2,
    span: (x, o) => { o[0] = C.s1 - 0.2; o[1] = C.far - 0.5; return o; } });
  return n;
}
