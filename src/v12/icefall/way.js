// The climb's pieces (v12 H2): what each is drawn as and the floor that walks it. Each piece's floor is a stacked
// floor (src/controls.js) the same width as what is drawn, its sides held where they drop; walls are capsules.
//   the slot: a floor of old snow between two walls of ice, over the head, leaning in at the top
//   the block: a serac the size of a house lying on T1 against R2, its top a ramp
//   the stair: two flights cut into the slumped ice of R3, a landing between, the upper flight tilted and broken
// The bridge (a lead on its side) is drawn in icefall.js with the other leads; its floor is here.
import { SLOT, BLOCK, BRIDGE, STAIR, nearest, iceY } from './plan.js';

const hyp = (x, z) => Math.sqrt(x * x + z * z);

// points every `step` m along a polyline [[x, z, y], ...]: { x, z, y, tx, tz (unit tangent), d (metres along) }
export function samples(pts, step) {
  const out = [];
  let d = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1], L = hyp(B[0] - A[0], B[1] - A[1]), tx = (B[0] - A[0]) / L, tz = (B[1] - A[1]) / L;
    const n = Math.max(1, Math.round(L / step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) { const t = k / n; out.push({ x: A[0] + (B[0] - A[0]) * t, z: A[1] + (B[1] - A[1]) * t, y: A[2] + (B[2] - A[2]) * t, tx, tz, d: d + L * t }); }
    d += L;
  }
  // a corner's tangent is the mean of its two
  for (let i = 1; i < out.length - 1; i++) { const a = out[i - 1], b = out[i + 1], l = hyp(b.x - a.x, b.z - a.z) || 1; out[i].tx = (b.x - a.x) / l; out[i].tz = (b.z - a.z) / l; }
  return out;
}

// a wall along samples S on one side (sgn: +1 left of travel, -1 right): its inner face at `half`, its top at
// top(i), its outer face `thick` further out going down to ground(i); leans in at the top by `lean`. Deep blue down
// its inner face. Colliders along its inner face. Returns nothing; pushes into G.
export function wall(G, rng, noise, S, o, colliders) {
  const { sgn, half, thick, lean } = o;
  const seed = rng();
  const inner = [], outer = [], qIn = [], qOut = [];
  const rows = 5;
  for (let i = 0; i < S.length; i++) {
    const s = S[i], nx = -s.tz * sgn, nz = s.tx * sgn; // outward from the way
    const bottom = s.y - 1.0, top = o.top(i, s, nx, nz) + Math.max(0, noise.noise2(s.d * 0.33 + seed * 5, sgn * 3.1)) * 1.8;
    const colI = [], colQ = [];
    for (let r = 0; r <= rows; r++) {
      const v = r / rows, y = bottom + (top - bottom) * v;
      // the face: outward only below head height; leans in above it
      const bul = Math.abs(noise.noise2(s.d * 0.21 + seed, y * 0.12)) * 0.5 + Math.max(0, noise.noise2(s.d * 0.06, y * 0.05 + sgn) + 0.2) * 1.3;
      const lin = y > s.y + 2.3 ? -lean * Math.min(1, (y - s.y - 2.3) / Math.max(1, top - s.y - 2.3)) : 0;
      const off = half + bul + lin;
      colI.push([s.x + nx * off, y, s.z + nz * off]);
      colQ.push([Math.min(1, Math.max(0, (top - y) / 10)) * (o.deepMax ?? 0.65), seed, o.strata ?? 0.6]);
    }
    inner.push(colI); qIn.push(colQ);
    const g = o.ground(i, s, nx, nz), off2 = half + thick + noise.noise2(s.d * 0.2, 7 + sgn) * 0.6;
    outer.push([[s.x + nx * off2, top - 0.3, s.z + nz * off2], [s.x + nx * (off2 + 0.6), g - 2, s.z + nz * (off2 + 0.6)]]);
    qOut.push([[0.05, seed, 0.2], [0.4, seed, 0.2]]);
  }
  // inner face: rows up (j), samples along (i): P[r][i]
  const P = [], Q = [];
  for (let r = 0; r <= rows; r++) { P.push(inner.map((c) => c[r])); Q.push(qIn.map((c) => c[r])); }
  G.grid(P, Q, sgn > 0, true);
  // the top: from the inner top to the outer top; the outer face down to the ground
  const T = [P[rows], outer.map((c) => c[0]), outer.map((c) => c[1])], TQ = [Q[rows].map((q) => [0, q[1], 0.3]), qOut.map((c) => c[0]), qOut.map((c) => c[1])];
  G.grid(T, TQ, sgn > 0);
  // colliders: capsules along the inner face, each its own height
  if (colliders) for (let i = 0; i < S.length - 1; i += 3) {
    const a = S[i], b = S[Math.min(S.length - 1, i + 3)];
    const na = [-a.tz * sgn, a.tx * sgn], nb = [-b.tz * sgn, b.tx * sgn], r = 0.4;
    colliders.push({ x1: a.x + na[0] * (half + r), z1: a.z + na[1] * (half + r), x2: b.x + nb[0] * (half + r), z2: b.z + nb[1] * (half + r), r, y: Math.min(a.y, b.y) - 1.5, h: 30, stand: false });
  }
}

// a floor ribbon over samples S, `half` wide, at y + lift; old snow and grit (a top, a little deep)
export function ribbon(G, S, half, lift, deep, dirt) {
  const P = [], Q = [];
  for (const k of [-1, -0.33, 0.33, 1]) {
    P.push(S.map((s) => [s.x - s.tz * half * k, s.y + lift, s.z + s.tx * half * k]));
    Q.push(S.map(() => [deep, 0.5, dirt]));
  }
  G.grid(P, Q, true);
}

// ---------------------------------------------------------------- floors
// a polyline floor: within half of the line, at the line's y (linear between points), or null
export function lineFloor(pts, half, extra) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  x0 -= half; x1 += half; z0 -= half; z1 += half;
  const nr = [0, 0, 0, 0];
  return (x, z) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return null;
    nearest(pts, x, z, nr);
    if (nr[0] > half) return null;
    // past either end along the line: no floor (nearest clamps t; a point beyond the end is off it)
    const i = nr[3], A = pts[i], B = pts[i + 1];
    if ((i === 0 && nr[2] <= 0 && ((x - A[0]) * (B[0] - A[0]) + (z - A[1]) * (B[1] - A[1])) < 0) ||
        (i === pts.length - 2 && nr[2] >= 1 && ((x - B[0]) * (B[0] - A[0]) + (z - B[1]) * (B[1] - A[1])) > 0)) return null;
    return extra ? extra(nr[1], nr, x, z) : nr[1];
  };
}

// the block: a plane over a rotated rectangle from foot to head, half wide
export function blockFrame() {
  const [fx, fz, fy] = BLOCK.foot, [hx, hz, hy] = BLOCK.head;
  const L = hyp(hx - fx, hz - fz), ux = (hx - fx) / L, uz = (hz - fz) / L;
  return { fx, fz, fy, hx, hz, hy, L, ux, uz, vx: -uz, vz: ux, half: BLOCK.half };
}
export function blockFloor() {
  const B = blockFrame();
  return (x, z) => {
    const dx = x - B.fx, dz = z - B.fz, a = dx * B.ux + dz * B.uz, c = dx * B.vx + dz * B.vz;
    if (a < 0 || a > B.L || Math.abs(c) > B.half) return null;
    return B.fy + (B.hy - B.fy) * (a / B.L);
  };
}

// the stair: each flight stepped (tread run t, rise r from its count), flight 2 tilted across and broken at `crack`
export function stairPlan() {
  const S = STAIR, fl = [];
  for (const [k, f] of [[1, S.f1], [2, S.f2]]) {
    const [a, b] = f, L = hyp(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const rise = b[2] - a[2], n = Math.round(L / 0.46), run = L / n, step = rise / n;
    fl.push({ k, a, b, L, ux, uz, vx: -uz, vz: ux, n, run, step, y0: a[2] });
  }
  const [la, lb] = S.landing, ly = S.f1[1][2];
  return { fl, landing: { pts: [[la[0], la[1], ly], [lb[0], lb[1], ly], [S.f2[0][0], S.f2[0][1], ly]], half: 2.0, y: ly } };
}
// the floor of flight f at (along a, across c): the tread's top, with flight 2's tilt and crack
export function treadY(f, a, c) {
  const S = STAIR;
  const i = Math.max(0, Math.min(f.n - 1, Math.floor(a / f.run)));
  let y = f.y0 + f.step * (i + 1);
  if (f.k === 2) {
    // tilted: the side away from the cut (the outer, down-glacier side: +c here) lower
    y -= Math.tan(S.tilt) * (c - (a > f.L * S.crack ? S.shift : 0));
    if (a > f.L * S.crack) y -= S.drop;
  }
  return y;
}
export function stairFloor() {
  const P = stairPlan(), land = lineFloor(P.landing.pts, P.landing.half);
  return (x, z) => {
    for (const f of P.fl) {
      const dx = x - f.a[0], dz = z - f.a[1], a = dx * f.ux + dz * f.uz;
      if (a < -0.05 || a > f.L + 0.05) continue;
      let c = dx * f.vx + dz * f.vz;
      // which side is outer: the flight's left (v) points down-glacier (+z) for flight 1 (east), up for flight 2 (west)
      const outer = f.vz > 0 ? c : -c;
      const sh = f.k === 2 && a > f.L * STAIR.crack ? STAIR.shift : 0;
      if (Math.abs(outer - sh) > STAIR.half) continue;
      return treadY(f, Math.max(0, Math.min(f.L - 1e-3, a)), outer);
    }
    return land(x, z);
  };
}
export { iceY };
