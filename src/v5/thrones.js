// AM The Acephalous Thrones [Proposed] (IDEAS-v4.md AM; wilderness-v4.md: "the two colossi are not seated: both are
// crawling on hands and knees, flanking the sun's saddle"; site in wilderness-v4-placement.md section 5, key `thrones`).
// Two headless colossi carved from the west wall, one on each of AM's seats (src/v4/mountains.js, the marked block),
// crawling out of the wall into the bowl: hands flat on the bench at the plinth's edge (r 380, 8 m above the road's
// start), the outer hand's fingers over it; arms 50 m; shoulders 67 m above the bench and the neck's stump to 75 m;
// the back level to the hips; knees on the bench; the hind end turned 20° toward its own wall and going into it, the outer haunch and the feet still in an uncut
// mass of the wall's rock, as if the carvers stopped there. About 125 m from fingertip to heel, a figure of some 150 m
// if it stood. Where the head was, the neck ends in a break weathered as smooth as the rest. The road starts between
// their hands; from the road's start, from spawn and from the causeway the sun stands in the gap between them.
//
// Each figure is one signed-distance field (tapered capsules smooth-joined, the bench and the wall joined in with a
// fillet, the wall's bedding cut into it as soft ledges every 11 m, a little weathering noise), polygonised once at
// build by surface nets into one mesh; both are one geometry and one draw call, in the terrain's own material (its
// colours, triplanar detail, bedding streaks, snow on the ledges, and the walls' fog tier by world radius), plus one
// rim term: while the sun gutters the shoulders catch a thin edge of sunlight, then lose it (uRim, set each frame from
// the gutter's phase; no lights). No shadows: the wall casts none, and a 330 m shadow does not fit the shadow
// camera's 190 m box. No
// colliders: nothing of them is inside the walkable wedge (±4.5°, to r 372); the nearest fingers are about 8 m beyond
// its corner. ?thrones=0 leaves them out (the seats stay, empty). ctx.thrones = { stats(), rim, rimHold, mesh }.
import * as THREE from 'three';
import { makeSimplex, clamp, lerp, smoothstep } from '../noise.js';
import { WORLD, SUN } from '../world.js';

export const THRONES = {
  bench: 22,       // the seats' y (mountains.js SEATS)
  edge: 380,       // r of the plinth's edge, where the hands rest (u = 0 in a figure's frame)
  out: 5,          // each body sits this far off its seat's centre line, toward its wall
  turn: 20 * Math.PI / 180, // and is turned this much, its hind end toward the wall
  scale: 1.0,
};
const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('thrones') === '0';

// ---------------------------------------------------------------- the distance field (local frame)
// u: metres out along the seat's radial from the plinth's edge (toward the sun; the figure faces -u, the bowl),
// v: across, positive toward the figure's own wall, y: metres above the bench.
const sminK = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
const smaxK = (a, b, k) => -sminK(-a, -b, k);
// tapered capsule from A to B (radii ra, rb), v stretched by sv
function cap(u, v, y, A, B, ra, rb, sv = 1) {
  const pu = u - A[0], pv = (v - A[1]) / sv, py = y - A[2];
  const bu = B[0] - A[0], bv = (B[1] - A[1]) / sv, by = B[2] - A[2];
  const h = clamp((pu * bu + pv * bv + py * by) / (bu * bu + bv * bv + by * by + 1e-9), 0, 1);
  const du = pu - bu * h, dv = pv - bv * h, dy = py - by * h;
  return (Math.sqrt(du * du + dv * dv + dy * dy) - lerp(ra, rb, h)) * Math.min(1, sv);
}
function box(u, v, y, c, hs, r) {
  const qu = Math.abs(u - c[0]) - hs[0] + r, qv = Math.abs(v - c[1]) - hs[1] + r, qy = Math.abs(y - c[2]) - hs[2] + r;
  const ou = Math.max(qu, 0), ov = Math.max(qv, 0), oy = Math.max(qy, 0);
  return Math.sqrt(ou * ou + ov * ov + oy * oy) + Math.min(Math.max(qu, qv, qy), 0) - r;
}

// One figure's skeleton: a crawl toward the bowl, the near arm and the far knee forward together (ph = +1 or -1
// swaps them). u = 0 is the plinth's edge; the figure faces -u.
function skeleton(ph, rng) {
  const S = THRONES.scale, j = () => (rng() - 0.5) * 2;
  const P = (u, v, y) => [u * S, v * S, y * S];
  const sk = { parts: [], hands: [], hold: [] };
  // the torso: shoulders, chest, waist, pelvis; wide across (sv), the belly slung, the back falling to the hips
  sk.torso = [
    [P(31, 0, 58), 14.5], [P(44, 0, 56), 16.0], [P(62, 0, 54), 13.0], [P(82, 0, 57), 15.5],
  ];
  // shoulder blades and deltoids, and the stump of the neck
  sk.blades = [[P(42, 9, 70), 7], [P(42, -9, 70), 7], [P(30, 19, 57), 10], [P(30, -19, 57), 10]];
  sk.neck = [P(34, 0, 62), P(21, 0, 78), 9.5 * S];
  // the break: a plane facing the bowl and the sky, through the neck a little ahead of the shoulders
  sk.cut = { n: [-0.5, 0.05 * ph, 0.87], p: P(24, 0, 73) };
  for (const s of [1, -1]) {
    const fwd = s * ph; // +1: this side's arm is forward, its knee back
    const sh = P(30, s * 15.5, 57), el = P(23 - fwd * 2, s * 18.5, 31 + j() * 1.5), wr = P(16 - fwd * 4, s * 16.5, 4.5);
    sk.parts.push([sh, el, 8.0 * S, 6.6 * S], [el, wr, 6.4 * S, 5.0 * S]);
    // the hand flat on the plinth: the palm, four fingers ahead over the plinth's edge, the thumb turned in
    const hu = wr[0] - 5.5 * S;
    sk.hands.push({ c: [hu, s * 16.5 * S, 1.6 * S], hs: [6.5 * S, 5.4 * S, 2.3 * S] });
    for (let f = 0; f < 4; f++) {
      const fv = s * (16.5 + (f - 1.5) * 2.5) * S, len = (7.5 - Math.abs(f - 1.2) * 1.1) * S;
      const k0 = [hu - 5 * S, fv, 1.7 * S], k1 = [hu - 5 * S - len, fv + s * (f - 1.5) * 0.4, 1.0 * S];
      sk.parts.push([k0, k1, 1.45 * S, 1.2 * S]);
      if (k1[0] < 1.5) sk.parts.push([k1, [k1[0] - 1.6 * S, k1[1], k1[2] - 3.2 * S], 1.2 * S, 1.0 * S]); // over the edge
      sk.hold.push(k1);
    }
    sk.parts.push([[hu + 1 * S, s * 11.5 * S, 1.6 * S], [hu - 5 * S, s * 9.5 * S, 1.2 * S], 1.7 * S, 1.3 * S]);
    // the leg: hip joint, the knee on the bench, the shin lying back along it, the foot upright on tucked toes
    const kneeU = 94 + fwd * 3;
    const hip = P(82, s * 10.5, 52), kn = P(kneeU, s * 11.5, 6), an = P(113, s * 11, 11), heel = P(119, s * 11, 21), ball = P(119.5, s * 11, 2.5);
    sk.parts.push([hip, kn, 11.5 * S, 8.0 * S], [kn, an, 7.6 * S, 5.0 * S], [an, heel, 5.2 * S, 4.4 * S], [heel, ball, 4.6 * S, 4.4 * S]);
    sk.parts.push([[kn[0] - 2, kn[1], kn[2] + 1], [kn[0] + 2, kn[1], kn[2] + 1], 8.6 * S, 8.0 * S]); // the knee
    sk.parts.push([[ball[0] - 1, ball[1] - 5 * S, 2.6 * S], [ball[0] - 1, ball[1] + 5 * S, 2.6 * S], 3.0 * S, 3.0 * S]); // the toes, tucked
  }
  // the uncut mass on the wall's side at the far end: the outer haunch and both feet are still in the rock
  sk.matrix = { c: P(118, 24, 16), hs: P(18, 24, 21) };
  return sk;
}

// The field takes the seat's frame (u along the seat, v across it toward the wall); the body is turned `turn` radians
// about its shoulders' line (u = PIVOT), its hind end toward the wall, so it comes out of the wall at a slant and the
// bowl sees its inner flank.
const PIVOT = 20;
function makeField(sk, noise, turn) {
  const N2 = noise.noise2;
  const ct = Math.cos(turn), st = Math.sin(turn);
  const bodyU = (u, v) => PIVOT + ct * (u - PIVOT) + st * v;
  const bodyV = (u, v) => -st * (u - PIVOT) + ct * v;
  // body only (no bench or wall), for the rim mask and the fillet's reach
  function body(us, vs, y) {
    const u = bodyU(us, vs), v = bodyV(us, vs);
    let d = 1e9;
    const T = sk.torso;
    for (let i = 0; i < T.length - 1; i++) d = sminK(d, cap(u, v, y, T[i][0], T[i + 1][0], T[i][1], T[i + 1][1], 1.3), 6);
    for (const b of sk.blades) d = sminK(d, cap(u, v, y, b[0], b[0], b[1], b[1]), 5);
    // the neck and its weathered break
    const c = sk.cut, n = c.n;
    let nk = cap(u, v, y, sk.neck[0], sk.neck[1], sk.neck[2], sk.neck[2] * 0.92);
    nk = smaxK(nk, (u - c.p[0]) * n[0] + (v - c.p[1]) * n[1] + (y - c.p[2]) * n[2], 3.5);
    d = sminK(d, nk, 5);
    for (const p of sk.parts) d = sminK(d, cap(u, v, y, p[0], p[1], p[2], p[3]), 3.2);
    for (const h of sk.hands) d = sminK(d, box(u, v, y, h.c, h.hs, 1.8), 2.5);
    return d;
  }
  // the whole: the body, the uncut mass, the bench and the wall, the bedding and the weathering
  const matrix = (us, vs, y) => box(bodyU(us, vs), bodyV(us, vs), y, sk.matrix.c, sk.matrix.hs, 4);
  function field(u, v, y, ground, yAbs, xw, zw) {
    let d = body(u, v, y);
    const mx = matrix(u, v, y) + 2.6 * N2(u * 0.09 + 3.1, y * 0.09) + 1.6 * N2(v * 0.13, y * 0.13 + 7.7);
    d = sminK(d, mx, 7);
    // the bedding: the wall's ledges (mountains.js: every 11 m, dipping east-north-east) weathered into soft grooves
    const q = (yAbs + xw * 0.045 - zw * 0.02) / 11, f = q - Math.floor(q);
    d += 0.75 * smoothstep(0.78, 0.95, f) * (1 - smoothstep(0.95, 1.0, f));
    d += 0.7 * N2(xw * 0.07 + yAbs * 0.05, zw * 0.07 - yAbs * 0.04) + 0.35 * N2(xw * 0.21 - 5, yAbs * 0.21 + zw * 0.1);
    // the bench and the wall (the heightfield 2 m down, so only the fillet where they meet the body shows)
    return sminK(d, (yAbs - (ground - 1.5)) * 0.7, 3.5);
  }
  return { body, field, matrix, bodyU };
}

// ---------------------------------------------------------------- surface nets
// The field on a grid; one vertex per cell the surface crosses (the mean of its edge crossings), one quad per crossed
// edge. Only cells near the surface are evaluated exactly: a coarse pass finds them.
function polygonise(F, nx, ny, nz) {
  const idx = (i, j, k) => (k * (ny + 1) + j) * (nx + 1) + i;
  const cellV = new Int32Array(nx * ny * nz).fill(-1);
  const verts = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { val[c] = F[idx(i + C[c][0], j + C[c][1], k + C[c][2])]; if (val[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      const fa = val[a], fb = val[b];
      if ((fa < 0) === (fb < 0)) continue;
      const t = fa / (fa - fb);
      sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t;
      n++;
    }
    cellV[(k * ny + j) * nx + i] = verts.length / 3;
    verts.push(i + sx / n, j + sy / n, k + sz / n);
  }
  const quads = [];
  const cv = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : cellV[(k * ny + j) * nx + i]);
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const f0 = F[idx(i, j, k)];
    // x edges: cells (i, j-1..j, k-1..k)
    if (i < nx && (f0 < 0) !== (F[idx(i + 1, j, k)] < 0)) {
      const a = cv(i, j - 1, k - 1), b = cv(i, j, k - 1), c = cv(i, j, k), d = cv(i, j - 1, k);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) quads.push(f0 < 0 ? [a, b, c, d] : [a, d, c, b]);
    }
    if (j < ny && (f0 < 0) !== (F[idx(i, j + 1, k)] < 0)) {
      const a = cv(i - 1, j, k - 1), b = cv(i - 1, j, k), c = cv(i, j, k), d = cv(i, j, k - 1);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) quads.push(f0 < 0 ? [a, b, c, d] : [a, d, c, b]);
    }
    if (k < nz && (f0 < 0) !== (F[idx(i, j, k + 1)] < 0)) {
      const a = cv(i - 1, j - 1, k), b = cv(i, j - 1, k), c = cv(i, j, k), d = cv(i - 1, j, k);
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) quads.push(f0 < 0 ? [a, b, c, d] : [a, d, c, b]);
    }
  }
  return { verts, quads };
}

// One colossus on one seat, into the shared arrays (world space).
function buildOne(ctx, seat, side, ph, out, cell) {
  const T = ctx.terrain, rng = ctx.makeRng(8810 + side * 7);
  const noise = makeSimplex(WORLD.seed + 8811 + side);
  const sk = skeleton(ph, rng);
  const { body, field, matrix, bodyU } = makeField(sk, noise, THRONES.turn);
  const wallSign = side; // across (mountains.js seatHeights: -x*cz + z*cx) toward this seat's wall
  const off = THRONES.out * wallSign;
  // local (u, v, y) -> world
  const toX = (u, v) => seat.cx * (THRONES.edge + u) - seat.cz * (off + v * wallSign);
  const toZ = (u, v) => seat.cz * (THRONES.edge + u) + seat.cx * (off + v * wallSign);
  const B = { u0: -8, u1: 136, v0: -34, v1: 76, y0: -10, y1: 86 };
  const nx = Math.ceil((B.u1 - B.u0) / cell), ny = Math.ceil((B.y1 - B.y0) / cell), nz = Math.ceil((B.v1 - B.v0) / cell);
  // the ground under each column, sampled once
  const G = new Float32Array((nx + 1) * (nz + 1));
  for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) {
    const u = B.u0 + i * cell, v = B.v0 + k * cell;
    G[k * (nx + 1) + i] = T.heightAt(toX(u, v), toZ(u, v));
  }
  const at = (u, v, y, g) => field(u, v, y, g, THRONES.bench + y, toX(u, v), toZ(u, v));
  // a coarse pass (every 4th node), then exact values only within reach of the surface
  const F = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
  const s4 = 4, cx = Math.ceil(nx / s4), cy = Math.ceil(ny / s4), cz = Math.ceil(nz / s4);
  const Cg = new Float32Array((cx + 1) * (cy + 1) * (cz + 1));
  for (let k = 0; k <= cz; k++) for (let j = 0; j <= cy; j++) for (let i = 0; i <= cx; i++) {
    const ii = Math.min(nx, i * s4), kk = Math.min(nz, k * s4);
    Cg[(k * (cy + 1) + j) * (cx + 1) + i] = at(B.u0 + ii * cell, B.v0 + kk * cell, B.y0 + Math.min(ny, j * s4) * cell, G[kk * (nx + 1) + ii]);
  }
  const reach = cell * s4 * 1.9;
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const fi = Math.min(cx - 1e-6, i / s4), fj = Math.min(cy - 1e-6, j / s4), fk = Math.min(cz - 1e-6, k / s4);
    const i0 = Math.floor(fi), j0 = Math.floor(fj), k0 = Math.floor(fk), ti = fi - i0, tj = fj - j0, tk = fk - k0;
    const c = (a, b, d) => Cg[((k0 + d) * (cy + 1) + j0 + b) * (cx + 1) + i0 + a];
    const e = lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), ti), lerp(c(0, 1, 0), c(1, 1, 0), ti), tj),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), ti), lerp(c(0, 1, 1), c(1, 1, 1), ti), tj), tk);
    const id = (k * (ny + 1) + j) * (nx + 1) + i;
    F[id] = Math.abs(e) > reach ? e : at(B.u0 + i * cell, B.v0 + k * cell, B.y0 + j * cell, G[k * (nx + 1) + i]);
  }
  const { verts, quads } = polygonise(F, nx, ny, nz);
  // per vertex: world position, the field's normal, how far from the body (the fillet's reach), below the ground?
  const nv = verts.length / 3, base = out.pos.length / 3;
  const keepV = new Uint8Array(nv), map = new Int32Array(nv).fill(-1);
  const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), BD = new Float32Array(nv), UVY = new Float32Array(nv * 3);
  const gAt = (u, v) => {
    const fi = clamp((u - B.u0) / cell, 0, nx - 1e-6), fk = clamp((v - B.v0) / cell, 0, nz - 1e-6);
    const i = Math.floor(fi), k = Math.floor(fk), ti = fi - i, tk = fk - k, r = nx + 1;
    return lerp(lerp(G[k * r + i], G[k * r + i + 1], ti), lerp(G[(k + 1) * r + i], G[(k + 1) * r + i + 1], ti), tk);
  };
  const e = 0.35;
  for (let q = 0; q < nv; q++) {
    const u = B.u0 + verts[q * 3] * cell, y = B.y0 + verts[q * 3 + 1] * cell, v = B.v0 + verts[q * 3 + 2] * cell;
    const g = gAt(u, v);
    const xw = toX(u, v), zw = toZ(u, v), yw = THRONES.bench + y;
    P[q * 3] = xw; P[q * 3 + 1] = yw; P[q * 3 + 2] = zw;
    UVY[q * 3] = u; UVY[q * 3 + 1] = v; UVY[q * 3 + 2] = y;
    // the normal from the field's gradient, in world axes
    const du = at(u + e, v, y, g) - at(u - e, v, y, g), dv = at(u, v + e, y, g) - at(u, v - e, y, g), dy = at(u, v, y + e, g) - at(u, v, y - e, g);
    // d/dx and d/dz: u runs along (cx, cz), v along wallSign * (-cz, cx)
    const nxw = du * seat.cx - dv * wallSign * seat.cz, nzw = du * seat.cz + dv * wallSign * seat.cx;
    const l = Math.hypot(nxw, dy, nzw) || 1;
    Nn[q * 3] = nxw / l; Nn[q * 3 + 1] = dy / l; Nn[q * 3 + 2] = nzw / l;
    BD[q] = Math.min(body(u, v, y), matrix(u, v, y));
    // kept: anything above the ground, or within the fillet's reach of the body
    keepV[q] = yw > g - 0.6 || BD[q] < 6 ? 1 : 0;
  }
  const cRock = new THREE.Color('#3c3838'), cRockD = new THREE.Color('#1f1c20'), cScree = new THREE.Color('#4a4644'), col = new THREE.Color();
  const addV = (q) => {
    if (map[q] >= 0) return map[q];
    const xw = P[q * 3], yw = P[q * 3 + 1], zw = P[q * 3 + 2], u = UVY[q * 3], v = UVY[q * 3 + 1], y = UVY[q * 3 + 2];
    out.pos.push(xw, yw, zw); out.nrm.push(Nn[q * 3], Nn[q * 3 + 1], Nn[q * 3 + 2]);
    // the wall's rock, as terrain.js colours it by height, darkened in the joints and under the belly (the field a
    // few metres out along the normal: low where something else is close)
    col.copy(cScree).lerp(cRock, smoothstep(10, 60, yw)).lerp(cRockD, smoothstep(60, 160, yw));
    const g = gAt(u, v);
    const ao = clamp(aoAt(u, v, y, q, g) / 4, 0, 1);
    const k = (0.5 + 0.5 * ao) * (0.92 + 0.16 * noise.noise2(xw * 0.05, yw * 0.08 + zw * 0.05));
    out.col.push(col.r * k, col.g * k, col.b * k);
    // the rim's reach: the shoulders, the neck's stump and the top of the back
    const bu = bodyU(u, v);
    const rim = smoothstep(12, 18, bu) * (1 - smoothstep(46, 54, bu)) * smoothstep(44, 56, y) * (BD[q] < 3 ? 1 : 0);
    out.rim.push(rim);
    map[q] = out.pos.length / 3 - 1;
    return map[q];
  };
  // ambient occlusion: the field's value 4 m out along the normal (local axes)
  function aoAt(u, v, y, q, g) {
    const nxw = Nn[q * 3], nyw = Nn[q * 3 + 1], nzw = Nn[q * 3 + 2];
    const nu = nxw * seat.cx + nzw * seat.cz, nvv = wallSign * (-nxw * seat.cz + nzw * seat.cx);
    return at(u + nu * 4, v + nvv * 4, y + nyw * 4, g);
  }
  for (const qd of quads) {
    if (!keepV[qd[0]] && !keepV[qd[1]] && !keepV[qd[2]] && !keepV[qd[3]]) continue;
    // wound outward: against the field's normal (the local frame is mirrored on one side, v toward its wall)
    const i0 = qd[0] * 3, i1 = qd[1] * 3, i2 = qd[2] * 3;
    const ax = P[i1] - P[i0], ay = P[i1 + 1] - P[i0 + 1], az = P[i1 + 2] - P[i0 + 2];
    const bx = P[i2] - P[i0], by = P[i2 + 1] - P[i0 + 1], bz = P[i2 + 2] - P[i0 + 2];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    const nq = (Nn[i0] + Nn[i1] + Nn[i2]) * fx + (Nn[i0 + 1] + Nn[i1 + 1] + Nn[i2 + 1]) * fy + (Nn[i0 + 2] + Nn[i1 + 2] + Nn[i2 + 2]) * fz;
    const o = nq >= 0 ? qd : [qd[0], qd[3], qd[2], qd[1]];
    const a = addV(o[0]), b = addV(o[1]), c = addV(o[2]), d = addV(o[3]);
    out.idx.push(a, b, c, a, c, d);
  }
  return { base, cells: nx * ny * nz };
}

// ---------------------------------------------------------------- the module
export async function build(ctx) {
  if (OFF) { ctx.thrones = { stats: () => ({ calls: 0, tris: 0 }), rim: null, off: true }; return; }
  const seats = ctx.mountains.seats;
  const cell = ctx.quality === 'low' ? 2.4 : 1.7;
  const out = { pos: [], nrm: [], col: [], rim: [], idx: [] };
  const t0 = performance.now();
  await ctx.progress('carving the thrones', 0);
  // seat 0 (-420, 100) has its wall on +across, seat 1 (-400, 200) on -across; the two crawl out of step
  buildOne(ctx, seats[0], 1, 1, out, cell);
  await ctx.progress('carving the thrones', 0.5);
  buildOne(ctx, seats[1], -1, -1, out, cell);
  const t1 = performance.now();
  const n = out.pos.length / 3;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3));
  geo.setAttribute('aRim', new THREE.Float32BufferAttribute(out.rim, 1));
  // the terrain material's own attributes, empty: no ice, no wet, no glacier
  geo.setAttribute('aIce', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aWet', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aGlac', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(out.idx, 1) : new THREE.Uint16BufferAttribute(out.idx, 1));
  geo.computeBoundingSphere();

  // the terrain's material, compiled again with the rim (as v4/regions/skin.js does for the ground skins)
  const baseMat = ctx.terrain.mesh.material;
  const mat = baseMat.clone();
  const rim = { value: 0 };
  const d = SUN.dir;
  mat.onBeforeCompile = (sh, r) => {
    const kept = baseMat.userData.shader;
    baseMat.onBeforeCompile(sh, r);
    baseMat.userData.shader = kept; // the terrain's own uniforms stay the console's handle
    sh.uniforms.uRim = rim;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aRim; varying float vRim;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRim = aRim;');
    // after the fog, so the walls' cap (nothing outshines the sky behind) does not take the edge of light
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim; varying float vRim;')
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        if (uRim > 0.0 && vRim > 0.0) {
          vec3 rN = normalize(vTNormal), rV = normalize(cameraPosition - vTPos);
          vec3 rS = vec3(${d.x.toFixed(5)}, ${d.y.toFixed(5)}, ${d.z.toFixed(5)});
          // a grazing edge near, widening with distance so it stays a line a few pixels thick from the bowl
          float rD = length(cameraPosition - vTPos);
          float edge = pow(1.0 - clamp(dot(rN, rV), 0.0, 1.0), mix(6.0, 1.6, smoothstep(60.0, 420.0, rD)));
          // the edge that faces up and away from the bowl, which the sun behind is grazing; seen from below, the
          // outline's last facets turn toward you, so the light wraps a little over the brow
          float lit = smoothstep(-0.55, 0.15, dot(rN, rS)) * smoothstep(0.05, 0.55, rN.y);
          gl_FragColor.rgb += vec3(1.0, 0.55, 0.26) * (mix(4.5, 5.0, smoothstep(60.0, 420.0, rD)) * uRim * vRim * edge * lit);
        }`);
  };
  mat.customProgramCacheKey = () => 'thrones';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'thrones';
  mesh.castShadow = false; mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  ctx.scene.add(mesh);

  const api = { rim, rimHold: null }; // rimHold pins the rim (0..1), for renders
  // the rim: it catches as the light fails, holds a few seconds, then the gutter takes it; nothing until the next
  const g = { on: false, t: 0 };
  ctx.registerUpdate((dt) => {
    const f = ctx.sky.flicker.value;
    if (f < 0.85) { if (!g.on) { g.on = true; g.t = 0; } g.t += dt; }
    else if (f > 0.95) g.on = false;
    const depth = clamp((0.88 - f) / 0.4, 0, 1);
    const env = g.on ? 1 - smoothstep(4.5, 7.5, g.t) : 0;
    rim.value = api.rimHold ?? depth * env;
  });

  const tris = geo.index.count / 3;
  ctx.thrones = Object.assign(api, { mesh, stats: () => ({ calls: 1, tris: Math.round(tris), verts: n, buildMs: Math.round(t1 - t0) }) });
}
