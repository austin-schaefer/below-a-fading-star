// The geometry check's arithmetic (#64), in node, over a triangle soup taken from the page by tools/geometry-test.mjs
// (or built by hand for its fixture). No three.js: plain arrays, so it runs anywhere and fast.
//
//   soup = { P: Float32Array(9 n) world-space triangles, part: Uint32Array(n) which part each belongs to,
//            parts: [{ name, side: 0 front | 1 back | 2 double, ghost (transparent, no depth write), offset (polygon
//            offset), anchor (the ground, water: what everything else may rest on), exempt: reason | null }],
//            spheres: [[x, y, z, r], ...] the place's region, stands: [{ x, y, z (the eye), sealed }] }
//
//   coplanar(soup, T)  → [{ a, b, area, at, n }]   faces of one plane overlapping (the cause of flicker)
//   floating(soup, T)  → [{ parts, at, size, tris }] groups of connected pieces that touch nothing that holds them
//   backs(soup, T)     → [{ part, at, from, dir, rays, sky }] the back of a single-sided face, first thing a ray meets
//                        from a standing eye (or, `sky`, a ray from a sealed stand that meets nothing)
//
// T, the tolerances (TOL below): they are the craft. Each is what made #60, #61 and #63 show and kept what is sound
// quiet; the comment beside each says why it is what it is.
export const TOL = {
  // coplanar: normals within 1.8 degrees (as tools/coplanar.js), every vertex of each within `plane` of the other's
  // plane, and an overlap of more than `area`. The camera's near plane is 0.08 m on a 24-bit depth buffer: two faces 4 mm
  // apart fight from about 70 m, 1 mm apart from 35 m; v14-F1's landing fix moved planks 2.5 cm and held.
  dot: 0.9995, plane: 0.004, area: 0.02,
  // floating: vertices welded at 2 mm make a piece; two pieces touch when a vertex of one is within `touch` of a face of
  // the other or an edge of one passes through a face of the other. A group of touching pieces floats when none of it
  // is an anchor (the ground, water), leaves the place, or is bigger than `big` across (a wall, a floor, a hall: what
  // things are hung from, which a place this size cannot see the far end of).
  weld: 0.002, touch: 0.05, big: 12, minSize: 0.12, decal: 0.08,
  // loose ends: a piece at least `endMin` long and `slender` times its thickness, each end its last `endLen` of length
  slender: 4, endMin: 0.3, endLen: 0.12,
  // backs: rays from each standing eye; the first face met within `far` metres. `rays` directions on a sphere.
  rays: 320, far: 60, near: 0.05,
  // buried: `samples` points over each piece's skin (by area), each nudged `nudge` inward; a point is inside when at least
  // `inside` of the 14 rays from it first meet the back of a solid face of another mesh, or the ray straight up meets the
  // ground's underside. A piece is buried when `frac` of its skin is inside: a box half in a wall is, a post rooted a
  // tenth of its height is not
  // `flush`: what shows of a piece whose shown samples' faces all lie within this of their mean is laid (a flag, a
  // tread, a panel), unless `whole` of it is inside. `deep`: rays look this far for a way out
  samples: 24, nudge: 0.01, inside: 11, frac: 0.42, flush: 0.9, whole: 0.9, deep: 8,
};

const hypot3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
const STANDIN = /^lappet-far/; // drawn in place of what is near for a far eye (src/v15/far.js): nothing rests on it or is held by it

// per-triangle normal, plane, area and box, once
export function prepare(soup) {
  if (soup._prep) return soup._prep;
  const { P } = soup, n = P.length / 9;
  const N = new Float32Array(n * 3), D = new Float64Array(n), A = new Float32Array(n), B = new Float32Array(n * 6);
  for (let t = 0; t < n; t++) {
    const o = t * 9;
    const ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2];
    const vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = hypot3(nx, ny, nz);
    A[t] = l / 2;
    if (l > 1e-12) { nx /= l; ny /= l; nz /= l; } else { nx = ny = nz = 0; }
    N[t * 3] = nx; N[t * 3 + 1] = ny; N[t * 3 + 2] = nz;
    D[t] = nx * P[o] + ny * P[o + 1] + nz * P[o + 2];
    B[t * 6] = Math.min(P[o], P[o + 3], P[o + 6]); B[t * 6 + 1] = Math.min(P[o + 1], P[o + 4], P[o + 7]); B[t * 6 + 2] = Math.min(P[o + 2], P[o + 5], P[o + 8]);
    B[t * 6 + 3] = Math.max(P[o], P[o + 3], P[o + 6]); B[t * 6 + 4] = Math.max(P[o + 1], P[o + 4], P[o + 7]); B[t * 6 + 5] = Math.max(P[o + 2], P[o + 5], P[o + 8]);
  }
  soup._prep = { n, N, D, A, B };
  return soup._prep;
}

// a uniform grid of cells `cs` metres, each triangle in every cell its box (grown by `pad`) touches
function grid(soup, cs, pad, keep, cap = 4000) {
  const { n, B } = prepare(soup);
  const cells = new Map();
  const K = (i, j, k) => (i + 4096) * 67108864 + (j + 4096) * 8192 + (k + 4096);
  for (let t = 0; t < n; t++) {
    if (keep && !keep(t)) continue;
    const i0 = Math.floor((B[t * 6] - pad) / cs), i1 = Math.floor((B[t * 6 + 3] + pad) / cs);
    const j0 = Math.floor((B[t * 6 + 1] - pad) / cs), j1 = Math.floor((B[t * 6 + 4] + pad) / cs);
    const k0 = Math.floor((B[t * 6 + 2] - pad) / cs), k1 = Math.floor((B[t * 6 + 5] + pad) / cs);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > cap) continue; // a face bigger than a hall: the sky's
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) {
      const key = K(i, j, k);
      let c = cells.get(key);
      if (!c) cells.set(key, (c = []));
      c.push(t);
    }
  }
  return { cells, K, cs };
}

// ------------------------------------------------------------------ coplanar
// the area two coplanar triangles share: B clipped by A, in A's plane
function overlapArea(P, a, b, N) {
  const nx = N[a * 3], ny = N[a * 3 + 1], nz = N[a * 3 + 2];
  // a basis in the plane
  let ux, uy, uz;
  if (Math.abs(nx) < 0.9) { ux = 0; uy = -nz; uz = ny; } else { ux = nz; uy = 0; uz = -nx; }
  let l = hypot3(ux, uy, uz); ux /= l; uy /= l; uz /= l;
  const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
  const pr = (t) => { const o = t * 9, r = []; for (let k = 0; k < 3; k++) { const x = P[o + k * 3], y = P[o + k * 3 + 1], z = P[o + k * 3 + 2]; r.push([x * ux + y * uy + z * uz, x * vx + y * vy + z * vz]); } return r; };
  let A = pr(a), poly = pr(b);
  // A counter-clockwise
  const sgn = (p) => (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
  if (sgn(A) < 0) A = [A[0], A[2], A[1]];
  for (let e = 0; e < 3 && poly.length; e++) {
    const p = A[e], q = A[(e + 1) % 3], ex = q[0] - p[0], ey = q[1] - p[1];
    const side = (s) => ex * (s[1] - p[1]) - ey * (s[0] - p[0]);
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const s = poly[i], t = poly[(i + 1) % poly.length], ds = side(s), dt = side(t);
      if (ds >= 0) out.push(s);
      if ((ds >= 0) !== (dt >= 0)) { const k = ds / (ds - dt); out.push([s[0] + (t[0] - s[0]) * k, s[1] + (t[1] - s[1]) * k]); }
    }
    poly = out;
  }
  let ar = 0;
  for (let i = 0; i < poly.length; i++) { const s = poly[i], t = poly[(i + 1) % poly.length]; ar += s[0] * t[1] - t[0] * s[1]; }
  return Math.abs(ar) / 2;
}

// two faces that would draw the same colour (one material, the same vertex colour, normal and uv): their fight cannot
// be seen, so it is not a finding (a merged kit's blocks overlapping inside one course, one wall)
function sameShade(soup, a, b) {
  const { S, part, parts } = soup;
  if (!S) return false;
  const pa = parts[part[a]], pb = parts[part[b]];
  if (part[a] !== part[b] && (!pa.mat || pa.mat !== pb.mat)) return false;
  const i = a * 8, j = b * 8;
  for (let k = 0; k < 3; k++) if (Math.abs(S[i + k] - S[j + k]) > 0.03) return false;
  if (S[i + 3] * S[j + 3] + S[i + 4] * S[j + 4] + S[i + 5] * S[j + 5] < 0.995) return false;
  if (Math.abs(S[i + 6] - S[j + 6]) > 1e-3 || Math.abs(S[i + 7] - S[j + 7]) > 1e-3) return false;
  return true;
}

export function coplanar(soup, T = TOL) {
  const { P, part, parts } = soup, { N, D, A } = prepare(soup);
  const usable = (t) => A[t] > 1e-6 && !parts[part[t]].exempt && !parts[part[t]].offset;
  const G = grid(soup, 1.0, T.plane, usable);
  const seen = new Set(), out = [];
  const vis = (t) => (parts[part[t]].side === 1 ? -1 : 1);
  for (const list of G.cells.values()) {
    if (list.length < 2) continue;
    // sweep on the normal's x (pairs must agree to 0.032 in every component), both orientations
    const items = list.map((t) => { const s = N[t * 3] < 0 || (N[t * 3] === 0 && (N[t * 3 + 1] < 0 || (N[t * 3 + 1] === 0 && N[t * 3 + 2] < 0))) ? -1 : 1; return [N[t * 3] * s, t, s]; });
    items.sort((p, q) => p[0] - q[0]);
    for (let i = 0; i < items.length; i++) {
      const [xi, a, sa] = items[i];
      for (let j = i + 1; j < items.length && items[j][0] - xi < 0.032; j++) {
        const b = items[j][1], sb = items[j][2];
        const dot = N[a * 3] * N[b * 3] + N[a * 3 + 1] * N[b * 3 + 1] + N[a * 3 + 2] * N[b * 3 + 2];
        if (Math.abs(dot) < T.dot) continue;
        const pa = part[a], pb = part[b];
        // faces that face the same way as drawn fight; opposite ones only if one is drawn from both sides
        const same = dot * vis(a) * vis(b) > 0;
        if (!same && parts[pa].side !== 2 && parts[pb].side !== 2) continue;
        if (!same && pa === pb) continue; // one thin double-sided sheet's two faces
        // every vertex of each within the tolerance of the other's plane
        let ok = true;
        for (let k = 0; k < 3 && ok; k++) {
          const o = b * 9 + k * 3; if (Math.abs(N[a * 3] * P[o] + N[a * 3 + 1] * P[o + 1] + N[a * 3 + 2] * P[o + 2] - D[a]) > T.plane) ok = false;
          const q = a * 9 + k * 3; if (Math.abs(N[b * 3] * P[q] + N[b * 3 + 1] * P[q + 1] + N[b * 3 + 2] * P[q + 2] - D[b]) > T.plane) ok = false;
        }
        if (!ok) continue;
        if (sameShade(soup, a, b)) continue;
        const key = a < b ? a * 4194304 + b : b * 4194304 + a;
        if (seen.has(key)) continue;
        seen.add(key);
        const ar = overlapArea(P, a, b, N);
        if (ar < 1e-5) continue;
        const o = b * 9;
        out.push({ a: pa, b: pb, ta: a, tb: b, area: ar, at: [(P[o] + P[o + 3] + P[o + 6]) / 3, (P[o + 1] + P[o + 4] + P[o + 7]) / 3, (P[o + 2] + P[o + 5] + P[o + 8]) / 3], n: [N[a * 3] * sa, N[a * 3 + 1] * sa, N[a * 3 + 2] * sa] });
      }
    }
  }
  // gathered: by the pair of parts and a 2 m cell, the areas summed, the biggest pair's place kept
  const groups = new Map();
  for (const f of out) {
    const lo = Math.min(f.a, f.b), hi = Math.max(f.a, f.b);
    const key = `${lo}|${hi}|${Math.floor(f.at[0] / 2)},${Math.floor(f.at[1] / 2)},${Math.floor(f.at[2] / 2)}`;
    const g = groups.get(key);
    if (!g) groups.set(key, { a: lo, b: hi, area: f.area, at: f.at, n: f.n, pairs: 1, big: f.area });
    else { g.area += f.area; g.pairs++; if (f.area > g.big) { g.big = f.area; g.at = f.at; g.n = f.n; } }
  }
  return [...groups.values()].filter((g) => g.area >= T.area).sort((p, q) => q.area - p.area);
}

// ------------------------------------------------------------------ floating
const sub = (P, i, j) => [P[i] - P[j], P[i + 1] - P[j + 1], P[i + 2] - P[j + 2]];
// squared distance from point (px, py, pz) to triangle t
function pointTri2(P, t, px, py, pz) {
  const o = t * 9;
  const ax = P[o], ay = P[o + 1], az = P[o + 2], bx = P[o + 3], by = P[o + 4], bz = P[o + 5], cx = P[o + 6], cy = P[o + 7], cz = P[o + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  const q = (x, y, z) => (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
  if (d1 <= 0 && d2 <= 0) return q(ax, ay, az);
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return q(bx, by, bz);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return q(ax + abx * v, ay + aby * v, az + abz * v); }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return q(cx, cy, cz);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return q(ax + acx * w, ay + acy * w, az + acz * w); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return q(bx + (cx - bx) * w, by + (cy - by) * w, bz + (cz - bz) * w); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return q(ax + abx * v + acx * w, ay + aby * v + acy * w, az + abz * v + acz * w);
}
// does segment p→q cross triangle t (Möller–Trumbore on the segment)
function segTri(P, t, px, py, pz, qx, qy, qz) {
  const o = t * 9;
  const dx = qx - px, dy = qy - py, dz = qz - pz;
  const e1x = P[o + 3] - P[o], e1y = P[o + 4] - P[o + 1], e1z = P[o + 5] - P[o + 2];
  const e2x = P[o + 6] - P[o], e2y = P[o + 7] - P[o + 1], e2z = P[o + 8] - P[o + 2];
  const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
  const a = e1x * hx + e1y * hy + e1z * hz;
  if (Math.abs(a) < 1e-12) return false;
  const f = 1 / a, sx = px - P[o], sy = py - P[o + 1], sz = pz - P[o + 2];
  const u = f * (sx * hx + sy * hy + sz * hz); if (u < 0 || u > 1) return false;
  const qx2 = sy * e1z - sz * e1y, qy2 = sz * e1x - sx * e1z, qz2 = sx * e1y - sy * e1x;
  const v = f * (dx * qx2 + dy * qy2 + dz * qz2); if (v < 0 || u + v > 1) return false;
  const s = f * (e2x * qx2 + e2y * qy2 + e2z * qz2);
  return s >= 0 && s <= 1;
}
function triTouch(P, a, b, tol2) {
  for (let k = 0; k < 3; k++) {
    const i = a * 9 + k * 3; if (pointTri2(P, b, P[i], P[i + 1], P[i + 2]) <= tol2) return true;
    const j = b * 9 + k * 3; if (pointTri2(P, a, P[j], P[j + 1], P[j + 2]) <= tol2) return true;
  }
  for (let k = 0; k < 3; k++) {
    const i = a * 9 + k * 3, i2 = a * 9 + ((k + 1) % 3) * 3;
    if (segTri(P, b, P[i], P[i + 1], P[i + 2], P[i2], P[i2 + 1], P[i2 + 2])) return true;
    const j = b * 9 + k * 3, j2 = b * 9 + ((k + 1) % 3) * 3;
    if (segTri(P, a, P[j], P[j + 1], P[j + 2], P[j2], P[j2 + 1], P[j2 + 2])) return true;
  }
  return false;
}

function uf(n) {
  const p = new Int32Array(n); for (let i = 0; i < n; i++) p[i] = i;
  const find = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  const join = (a, b) => { a = find(a); b = find(b); if (a !== b) p[a] = b; return a !== b; };
  return { find, join };
}

// the pieces: triangles of one part joined through shared (welded) vertices
export function pieces(soup, T = TOL) {
  const { P, part } = soup, { n } = prepare(soup);
  const U = uf(n), vmap = new Map(), q = 1 / T.weld;
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const o = t * 9 + k * 3;
    const key = `${part[t]}:${Math.round(P[o] * q)},${Math.round(P[o + 1] * q)},${Math.round(P[o + 2] * q)}`;
    const s = vmap.get(key);
    if (s === undefined) vmap.set(key, t); else U.join(t, s);
  }
  const id = new Int32Array(n), roots = new Map();
  for (let t = 0; t < n; t++) { const r = U.find(t); let c = roots.get(r); if (c === undefined) roots.set(r, (c = roots.size)); id[t] = c; }
  return { id, count: roots.size };
}

export function floating(soup, T = TOL) {
  const { P, part, parts, spheres } = soup, { n, B } = prepare(soup);
  const { id, count } = pieces(soup, T);
  const box = new Float32Array(count * 6).fill(0);
  for (let c = 0; c < count; c++) { box[c * 6] = box[c * 6 + 1] = box[c * 6 + 2] = Infinity; box[c * 6 + 3] = box[c * 6 + 4] = box[c * 6 + 5] = -Infinity; }
  const tris = new Int32Array(count), pOf = new Int32Array(count);
  for (let t = 0; t < n; t++) {
    const c = id[t]; tris[c]++; pOf[c] = part[t];
    for (let k = 0; k < 3; k++) { box[c * 6 + k] = Math.min(box[c * 6 + k], B[t * 6 + k]); box[c * 6 + 3 + k] = Math.max(box[c * 6 + 3 + k], B[t * 6 + 3 + k]); }
  }
  // anchors: the ground and water, a piece bigger than `big`, a piece that leaves the place (its box not inside the
  // region shrunk by a metre), an exempt part (it is meant to hang in air, and what touches it is not held by it but is
  // not floating either: a flame on a wick)
  const inside = (x, y, z) => spheres.some(([sx, sy, sz, r]) => (x - sx) ** 2 + (y - sy) ** 2 + (z - sz) ** 2 < (r - 1) ** 2);
  const anchor = new Uint8Array(count);
  for (let c = 0; c < count; c++) {
    const p = parts[pOf[c]], o = c * 6;
    const size = Math.max(box[o + 3] - box[o], box[o + 4] - box[o + 1], box[o + 5] - box[o + 2]);
    if (p.anchor || p.exempt || size > T.big) { anchor[c] = 1; continue; }
    let all = true;
    for (let k = 0; k < 8 && all; k++) all = inside(k & 1 ? box[o + 3] : box[o], k & 2 ? box[o + 4] : box[o + 1], k & 4 ? box[o + 5] : box[o + 2]);
    if (!all) anchor[c] = 1;
  }
  // touching pieces joined
  const U = uf(count), tol2 = T.touch * T.touch;
  const G = grid(soup, 0.6, T.touch, null, 60000); // a water's or a floor's one big face holds what stands in it
  for (const list of G.cells.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      const a = list[i], ca = id[a];
      const ax0 = B[a * 6] - T.touch, ay0 = B[a * 6 + 1] - T.touch, az0 = B[a * 6 + 2] - T.touch, ax1 = B[a * 6 + 3] + T.touch, ay1 = B[a * 6 + 4] + T.touch, az1 = B[a * 6 + 5] + T.touch;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j], cb = id[b];
        if (ca === cb) continue;
        if (B[b * 6] > ax1 || B[b * 6 + 3] < ax0 || B[b * 6 + 1] > ay1 || B[b * 6 + 4] < ay0 || B[b * 6 + 2] > az1 || B[b * 6 + 5] < az0) continue;
        if (U.find(ca) === U.find(cb)) continue;
        if (triTouch(P, a, b, tol2)) U.join(ca, cb);
      }
    }
  }
  const groups = new Map();
  for (let c = 0; c < count; c++) {
    const r = U.find(c);
    let g = groups.get(r);
    if (!g) groups.set(r, (g = { anchored: false, members: [] }));
    g.members.push(c);
    if (anchor[c]) g.anchored = true;
  }
  // a decal: a group made only of flat sheets, each lying parallel to another face within `decal` (a patch of plaster,
  // a stain, a painted band laid a hair off the wall). It is drawn on its surface, not hung from it
  const { N } = prepare(soup);
  let compTris = null;
  const isDecal = (g) => {
    if (!compTris) { compTris = Array.from({ length: count }, () => []); for (let t = 0; t < n; t++) compTris[id[t]].push(t); }
    const mine = new Set(g.members);
    for (const c of g.members) {
      const L = compTris[c], t0 = L[0];
      for (const t of L) if (N[t * 3] * N[t0 * 3] + N[t * 3 + 1] * N[t0 * 3 + 1] + N[t * 3 + 2] * N[t0 * 3 + 2] < 0.999) return false;
    }
    const d2 = T.decal * T.decal, cs = G.cs;
    for (const c of g.members) {
      let held = false;
      for (const t of compTris[c]) {
        const o = t * 9, cx = (P[o] + P[o + 3] + P[o + 6]) / 3, cy = (P[o + 1] + P[o + 4] + P[o + 7]) / 3, cz = (P[o + 2] + P[o + 5] + P[o + 8]) / 3;
        for (let i = Math.floor((cx - T.decal) / cs); i <= Math.floor((cx + T.decal) / cs) && !held; i++)
          for (let j = Math.floor((cy - T.decal) / cs); j <= Math.floor((cy + T.decal) / cs) && !held; j++)
            for (let k = Math.floor((cz - T.decal) / cs); k <= Math.floor((cz + T.decal) / cs) && !held; k++)
              for (const u of G.cells.get(G.K(i, j, k)) || []) {
                if (mine.has(id[u])) continue;
                if (Math.abs(N[u * 3] * N[t * 3] + N[u * 3 + 1] * N[t * 3 + 1] + N[u * 3 + 2] * N[t * 3 + 2]) < 0.98) continue;
                if (pointTri2(P, u, cx, cy, cz) <= d2) { held = true; break; }
              }
        if (held) break;
      }
      if (!held) return false;
    }
    return true;
  };
  const out = [];
  let decals = 0;
  for (const g of groups.values()) {
    if (g.anchored) continue;
    if (isDecal(g)) { decals++; continue; }
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, nt = 0;
    const names = new Map();
    for (const c of g.members) {
      const o = c * 6;
      x0 = Math.min(x0, box[o]); y0 = Math.min(y0, box[o + 1]); z0 = Math.min(z0, box[o + 2]);
      x1 = Math.max(x1, box[o + 3]); y1 = Math.max(y1, box[o + 4]); z1 = Math.max(z1, box[o + 5]);
      nt += tris[c]; names.set(pOf[c], (names.get(pOf[c]) || 0) + 1);
    }
    const size = Math.max(x1 - x0, y1 - y0, z1 - z0);
    if (size < T.minSize) continue; // a crumb: grit, a nail head, a drip
    out.push({ parts: [...names.keys()], pieces: g.members.length, at: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], lo: [x0, y0, z0], hi: [x1, y1, z1], size, tris: nt });
  }
  // a loose end: a slender piece (a strut, a stay, a prop: `slender` times longer than it
  // is thick, at least `endMin` long) held at one end and touching nothing at the other (#63: the stays under the
  // planks on the carriers). Each end is the last `endLen` of its length; it is held if a vertex there is within
  // `touch` of another piece's face, or an edge from there passes through one, or it leaves the place
  if (!compTris) { compTris = Array.from({ length: count }, () => []); for (let t = 0; t < n; t++) compTris[id[t]].push(t); }
  const cs = G.cs, tol2b = T.touch * T.touch;
  for (let c = 0; c < count; c++) {
    if (anchor[c] || tris[c] > 400) continue;
    const L = compTris[c];
    // a flat sheet (a root, a rag, a painted board seen edge on) is not a support
    let flat = true;
    for (const t of L) if (Math.abs(N[t * 3] * N[L[0] * 3] + N[t * 3 + 1] * N[L[0] * 3 + 1] + N[t * 3 + 2] * N[L[0] * 3 + 2]) < 0.99) { flat = false; break; }
    if (flat) continue;
    // the long axis: the box's longest diagonal-ish direction, by power iteration on the vertices' spread
    let mx = 0, my = 0, mz = 0, nv = 0;
    for (const t of L) for (let k = 0; k < 3; k++) { const o = t * 9 + k * 3; mx += P[o]; my += P[o + 1]; mz += P[o + 2]; nv++; }
    mx /= nv; my /= nv; mz /= nv;
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;
    for (const t of L) for (let k = 0; k < 3; k++) { const o = t * 9 + k * 3, dx = P[o] - mx, dy = P[o + 1] - my, dz = P[o + 2] - mz; xx += dx * dx; xy += dx * dy; xz += dx * dz; yy += dy * dy; yz += dy * dz; zz += dz * dz; }
    let ax = 1, ay = 0.7, az = 0.3;
    for (let it = 0; it < 30; it++) { const nx = xx * ax + xy * ay + xz * az, ny = xy * ax + yy * ay + yz * az, nz = xz * ax + yz * ay + zz * az; const l = hypot3(nx, ny, nz) || 1; ax = nx / l; ay = ny / l; az = nz / l; }
    let lo = Infinity, hi = -Infinity, thick = 0;
    for (const t of L) for (let k = 0; k < 3; k++) { const o = t * 9 + k * 3, dx = P[o] - mx, dy = P[o + 1] - my, dz = P[o + 2] - mz, s = dx * ax + dy * ay + dz * az; lo = Math.min(lo, s); hi = Math.max(hi, s); thick = Math.max(thick, hypot3(dx - ax * s, dy - ay * s, dz - az * s)); }
    const len = hi - lo;
    if (len < T.endMin || len < T.slender * 2 * thick) continue;
    const endLen = Math.max(T.endLen * len, 2 * thick, 0.03);
    const held = [false, false];
    for (const t of L) {
      for (let k = 0; k < 3; k++) {
        const o = t * 9 + k * 3, x = P[o], y = P[o + 1], z = P[o + 2], s = (x - mx) * ax + (y - my) * ay + (z - mz) * az;
        const e = s < lo + endLen ? 0 : s > hi - endLen ? 1 : -1;
        if (e < 0 || held[e]) continue;
        if (!inside(x, y, z)) { held[e] = true; continue; }
        const o2 = t * 9 + ((k + 1) % 3) * 3;
        for (let i = Math.floor((x - T.touch) / cs); i <= Math.floor((x + T.touch) / cs) && !held[e]; i++)
          for (let j = Math.floor((y - T.touch) / cs); j <= Math.floor((y + T.touch) / cs) && !held[e]; j++)
            for (let q = Math.floor((z - T.touch) / cs); q <= Math.floor((z + T.touch) / cs) && !held[e]; q++)
              for (const u of G.cells.get(G.K(i, j, q)) || []) {
                if (id[u] === c || STANDIN.test(parts[part[u]].name || '')) continue; // (v15-W1: a stand-in holds nothing: the far mesh's block round the Strake's new house held a scaffold pole's head, and the pole was judged held there and loose at its foot)
                if (pointTri2(P, u, x, y, z) <= tol2b || segTri(P, u, x, y, z, P[o2], P[o2 + 1], P[o2 + 2])) { held[e] = true; break; }
              }
      }
      if (held[0] && held[1]) break;
    }
    if (held[0] && held[1]) continue;
    if (!held[0] && !held[1]) continue; // a piece held at neither end is a floating group's business (above), or held along its side
    const free = held[0] ? 1 : 0, sgn = free ? hi : lo, other = free ? lo : hi;
    const at = [mx + ax * sgn, my + ay * sgn, mz + az * sgn];
    // a support reaches down to what it stands on: only a free end lower than the held one by a third of the length
    // is a fault (a level arm is a bracket; an upright tip is a finial; both are meant)
    if (my + ay * other - at[1] < len / 3) continue;
    const o = c * 6;
    out.push({ parts: [pOf[c]], pieces: 1, end: true, at, lo: [box[o], box[o + 1], box[o + 2]], hi: [box[o + 3], box[o + 4], box[o + 5]], size: len, tris: tris[c] });
  }
  out.sort((p, q) => q.size - p.size);
  out.decals = decals;
  return out;
}

// ------------------------------------------------------------------ backs
// a bounding volume hierarchy over the triangles that stop a ray (not exempt, not see-through)
function bvh(soup, keep) {
  const { n, B } = prepare(soup);
  const idx = []; for (let t = 0; t < n; t++) if (keep(t)) idx.push(t);
  const T = Int32Array.from(idx);
  const C = new Float32Array(n * 3);
  for (const t of idx) for (let k = 0; k < 3; k++) C[t * 3 + k] = (B[t * 6 + k] + B[t * 6 + 3 + k]) / 2;
  const nodes = []; // [x0,y0,z0,x1,y1,z1, left|-start-1, right|count]
  function build(s, e) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let i = s; i < e; i++) { const t = T[i]; x0 = Math.min(x0, B[t * 6]); y0 = Math.min(y0, B[t * 6 + 1]); z0 = Math.min(z0, B[t * 6 + 2]); x1 = Math.max(x1, B[t * 6 + 3]); y1 = Math.max(y1, B[t * 6 + 4]); z1 = Math.max(z1, B[t * 6 + 5]); }
    const me = nodes.length; nodes.push(null);
    if (e - s <= 6) { nodes[me] = [x0, y0, z0, x1, y1, z1, -s - 1, e - s]; return me; }
    const ex = x1 - x0, ey = y1 - y0, ez = z1 - z0, ax = ex > ey && ex > ez ? 0 : ey > ez ? 1 : 2;
    const sub = Array.from(T.subarray(s, e)).sort((p, q) => C[p * 3 + ax] - C[q * 3 + ax]);
    T.set(sub, s);
    const m = (s + e) >> 1;
    const l = build(s, m), r = build(m, e);
    nodes[me] = [x0, y0, z0, x1, y1, z1, l, r];
    return me;
  }
  if (T.length) build(0, T.length);
  return { nodes, T };
}
function raycast(P, H, ox, oy, oz, dx, dy, dz, near, far, skip = null, own = -1) {
  const { nodes, T } = H;
  if (!nodes.length) return null;
  const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
  let best = far, bt = -1, bBack = false;
  const stack = [0];
  while (stack.length) {
    const nd = nodes[stack.pop()];
    let t0 = ((ix >= 0 ? nd[0] : nd[3]) - ox) * ix, t1 = ((ix >= 0 ? nd[3] : nd[0]) - ox) * ix;
    const ty0 = ((iy >= 0 ? nd[1] : nd[4]) - oy) * iy, ty1 = ((iy >= 0 ? nd[4] : nd[1]) - oy) * iy;
    if (ty0 > t0) t0 = ty0; if (ty1 < t1) t1 = ty1;
    const tz0 = ((iz >= 0 ? nd[2] : nd[5]) - oz) * iz, tz1 = ((iz >= 0 ? nd[5] : nd[2]) - oz) * iz;
    if (tz0 > t0) t0 = tz0; if (tz1 < t1) t1 = tz1;
    if (t0 > t1 || t1 < near || t0 > best) continue;
    if (nd[6] < 0) {
      const s = -nd[6] - 1;
      for (let i = s; i < s + nd[7]; i++) {
        const t = T[i], o = t * 9;
        if (skip && skip[t] === own) continue;
        const e1x = P[o + 3] - P[o], e1y = P[o + 4] - P[o + 1], e1z = P[o + 5] - P[o + 2];
        const e2x = P[o + 6] - P[o], e2y = P[o + 7] - P[o + 1], e2z = P[o + 8] - P[o + 2];
        const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
        const a = e1x * hx + e1y * hy + e1z * hz;
        if (Math.abs(a) < 1e-12) continue;
        const f = 1 / a, sx = ox - P[o], sy = oy - P[o + 1], sz = oz - P[o + 2];
        const u = f * (sx * hx + sy * hy + sz * hz); if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const v = f * (dx * qx + dy * qy + dz * qz); if (v < 0 || u + v > 1) continue;
        const d = f * (e2x * qx + e2y * qy + e2z * qz);
        if (d > near && d < best + (skip ? 1e-3 : 0)) {
          // (buried, `skip` given: of two faces met at one distance, a box's floor on a slab's top, the back wins: the
          // point is inside the box whichever the walk meets first. Möller-Trumbore's a < 0: the ray meets the back)
          const back = a < 0;
          if (!skip || bt < 0 || d < best - 1e-3) { best = d; bt = t; bBack = back; }
          else if (back && !bBack) { best = Math.min(best, d); bt = t; bBack = true; }
          else if (d < best && back === bBack) { best = d; bt = t; }
        }
      }
    } else { stack.push(nd[6], nd[7]); }
  }
  return bt < 0 ? null : { t: bt, d: best };
}
export function sphereDirs(k) {
  const out = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < k; i++) { const y = 1 - (2 * (i + 0.5)) / k, r = Math.sqrt(1 - y * y), a = g * i; out.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
  return out;
}
export function backs(soup, T = TOL) {
  const { P, part, parts, stands, spheres } = soup, { N } = prepare(soup);
  const H = bvh(soup, (t) => !parts[part[t]].exempt && !parts[part[t]].ghost);
  const dirs = sphereDirs(T.rays);
  const groups = new Map();
  const inside = (x, y, z) => spheres.some(([sx, sy, sz, r]) => (x - sx) ** 2 + (y - sy) ** 2 + (z - sz) ** 2 < r * r);
  let inside0 = 0;
  for (const s of stands) {
    // a stand inside something (an eye in a wall, a stand on a disc that fell in a pillar): a quarter of its rays meet a
    // back within 1.5 m. It is not a place a visitor stands; it is left out and counted
    let close = 0;
    for (const [dx, dy, dz] of dirs) {
      const h = raycast(P, H, s.x, s.y, s.z, dx, dy, dz, T.near, 1.5);
      if (!h) continue;
      const p = parts[part[h.t]];
      if (p.side !== 2 && (N[h.t * 3] * dx + N[h.t * 3 + 1] * dy + N[h.t * 3 + 2] * dz) * (p.side === 1 ? -1 : 1) > 0) close++;
    }
    if (close > dirs.length / 4) { inside0++; continue; }
    for (const [dx, dy, dz] of dirs) {
      const h = raycast(P, H, s.x, s.y, s.z, dx, dy, dz, T.near, T.far);
      let key, rec;
      if (!h) {
        if (!s.sealed) continue;
        // escaped: only a finding if it left through the place's region (not out past what was taken from the page)
        const ex = s.x + dx * 6, ey = s.y + dy * 6, ez = s.z + dz * 6;
        if (!inside(ex, ey, ez)) continue;
        key = `sky|${Math.round(s.x)},${Math.round(s.y)},${Math.round(s.z)}`;
        rec = { part: -1, sky: true, at: [s.x + dx * 4, s.y + dy * 4, s.z + dz * 4], from: [s.x, s.y, s.z], dir: [dx, dy, dz] };
      } else {
        const t = h.t, p = parts[part[t]];
        if (p.side === 2) continue;
        const facing = (N[t * 3] * dx + N[t * 3 + 1] * dy + N[t * 3 + 2] * dz) * (p.side === 1 ? -1 : 1);
        if (facing <= 0) continue; // its front, as drawn
        const at = [s.x + dx * h.d, s.y + dy * h.d, s.z + dz * h.d];
        // a place that names parts in `near: [name, ...]` (a roof walk or a square with a quarter standing over it): a back of
        // one of those parts met outside the place's region is not a finding. Only the faces that reach into the region
        // are taken from the page (a wall's long front without its top), so out there a back says nothing about it
        if (soup.near && soup.near.some((n) => p.name.startsWith(n)) && !inside(at[0], at[1], at[2])) continue;
        key = `${part[t]}|${Math.floor(at[0])},${Math.floor(at[1])},${Math.floor(at[2])}`;
        rec = { part: part[t], sky: false, at, from: [s.x, s.y, s.z], dir: [dx, dy, dz], d: h.d };
      }
      const g = groups.get(key);
      if (!g) groups.set(key, { ...rec, rays: 1, stands: new Set([s]) });
      else { g.rays++; g.stands.add(s); if (!rec.sky && rec.d < g.d) Object.assign(g, { from: rec.from, dir: rec.dir, at: rec.at, d: rec.d }); }
    }
  }
  const res = [...groups.values()].map((g) => ({ ...g, stands: g.stands.size })).sort((p, q) => q.rays - p.rays);
  res.insideStands = inside0;
  return res;
}

// ------------------------------------------------------------------ buried
// What lies mostly inside something solid of another mesh, or mostly under the drawn ground: a bird in a wall, a lamp in
// a roof, a rock through a stair, a prop the new ground was raised over. Nothing about what it is.
//   solid: the faces of a piece that is not flat (a card, a sheet, a decal has no inside), not exempt, not see-through
//   (glass, water, a ghost: what is under water is not buried) and not a stand-in.
//   a point is inside when, of 14 rays from it, at least `inside` first meet such a face from its back (inside a closed
//   thing every way out is a back; an open shell's missing floor or end costs a ray or three, which the margin allows),
//   its own mesh never counted (a mesh's material groups and an instanced mesh's instances are one thing: what it makes
//   of itself is the other kinds' business); it is under the ground when the ray straight up first meets the back of an
//   anchor (the ground, laid ground).
//   inside a solid: judged a piece at a time (faces of one part joined through shared vertices: in a merged quarter one
//   house, one prop, one beam), when `frac` of its skin is inside.
//   under the ground: judged a group at a time (the pieces of one part that touch: a house and its footing, a bird and its
//   legs), when `frac` of the group's skin is under: a wall's footing below the turf belongs to a wall that stands.
// Exempt by rule, not name: an anchor or exempt part; a flat piece; a piece or group smaller than `minSize` or bigger than
// `big` (a hall, a quarter: what things are let into); what is let in by its end (a post rooted, a beam's end in a wall, a
// plant's base: a small share of its skin); what shows only one flat face (`flush`: a flag or a tread laid in the
// ground, a panel set in a wall) unless `whole` of it is inside.
//   buried(soup, T) → [{ part, with, at, frac, size, under, pieces, tris }]
const DIRS14 = (() => {
  const out = [[0.013, 1, 0.007]]; // up first (a little off the axis so it never runs down an edge): it says "under the ground" too
  for (const d of [[0.009, -1, 0.011], [1, 0.012, 0.008], [-1, 0.007, -0.013], [0.011, 0.006, 1], [-0.008, -0.012, -1]]) out.push(d);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out.push([sx * 1.01, sy, sz * 0.99]);
  return out.map(([x, y, z]) => { const l = hypot3(x, y, z); return [x / l, y / l, z / l]; });
})();
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
export function buried(soup, T = TOL) {
  const { P, part, parts } = soup, { n, N, A, B } = prepare(soup);
  const { id, count } = pieces(soup, T);
  // the mesh each part belongs to: its name without the material's #k (an instanced mesh's instances share it)
  const keys = new Map(), mk = new Int32Array(parts.length);
  parts.forEach((p, i) => { const k = (p.name || '').replace(/#\d+$/, ''); if (!keys.has(k)) keys.set(k, keys.size); mk[i] = keys.get(k); });
  const triMesh = new Int32Array(n);
  for (let t = 0; t < n; t++) triMesh[t] = mk[part[t]];
  const L = Array.from({ length: count }, () => []);
  for (let t = 0; t < n; t++) L[id[t]].push(t);
  const flat = new Uint8Array(count), box = new Float64Array(count * 6), area = new Float64Array(count), pOf = new Int32Array(count);
  for (let c = 0; c < count; c++) {
    const l = L[c], t0 = l[0];
    let f = 1, x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, ar = 0;
    for (const t of l) {
      if (f && Math.abs(N[t * 3] * N[t0 * 3] + N[t * 3 + 1] * N[t0 * 3 + 1] + N[t * 3 + 2] * N[t0 * 3 + 2]) < 0.99) f = 0;
      x0 = Math.min(x0, B[t * 6]); y0 = Math.min(y0, B[t * 6 + 1]); z0 = Math.min(z0, B[t * 6 + 2]);
      x1 = Math.max(x1, B[t * 6 + 3]); y1 = Math.max(y1, B[t * 6 + 4]); z1 = Math.max(z1, B[t * 6 + 5]);
      ar += A[t];
    }
    flat[c] = f; area[c] = ar; pOf[c] = part[t0];
    box[c * 6] = x0; box[c * 6 + 1] = y0; box[c * 6 + 2] = z0; box[c * 6 + 3] = x1; box[c * 6 + 4] = y1; box[c * 6 + 5] = z1;
  }
  // (an exempt part is judged too: what may hang in air or be seen through may still not stand in a wall. It is never
  // what another is inside: exempt things are not taken as solid)
  // a piece that leaves the place (a corner of its box outside the region) is not judged: only part of it was taken
  const { spheres } = soup;
  const within = (c) => { const o = c * 6; for (let k = 0; k < 8; k++) { const x = box[o + (k & 1 ? 3 : 0)], y = box[o + (k & 2 ? 4 : 1)], z = box[o + (k & 4 ? 5 : 2)]; if (!spheres.some(([sx, sy, sz, r]) => (x - sx) ** 2 + (y - sy) ** 2 + (z - sz) ** 2 < r * r)) return false; } return true; };
  const member = (c) => { const p = parts[pOf[c]]; return !p.anchor && !p.ghost && area[c] > 0 && !STANDIN.test(p.name || ''); };
  const judged = (c) => member(c) && !flat[c] && within(c);
  const solidT = (t) => { const p = parts[part[t]]; return !p.exempt && !p.ghost && !p.clear && !flat[id[t]] && A[t] > 1e-9 && !STANDIN.test(p.name || ''); };
  const H = bvh(soup, solidT);
  const G = grid(soup, 1.0, 0, solidT, 60000);
  // the groups: pieces of one part that touch
  const U = uf(count), tol2 = T.touch * T.touch;
  {
    const GT = grid(soup, 0.6, T.touch, (t) => member(id[t]), 60000);
    for (const list of GT.cells.values()) {
      for (let i = 0; i < list.length; i++) {
        const a = list[i], ca = id[a];
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j], cb = id[b];
          if (ca === cb || part[a] !== part[b] || U.find(ca) === U.find(cb)) continue;
          if (B[b * 6] > B[a * 6 + 3] + T.touch || B[b * 6 + 3] < B[a * 6] - T.touch || B[b * 6 + 1] > B[a * 6 + 4] + T.touch || B[b * 6 + 4] < B[a * 6 + 1] - T.touch || B[b * 6 + 2] > B[a * 6 + 5] + T.touch || B[b * 6 + 5] < B[a * 6 + 2] - T.touch) continue;
          if (triTouch(P, a, b, tol2)) U.join(ca, cb);
        }
      }
    }
  }
  const leaves = new Set(); // groups with a piece that leaves the place (a roof sheet joins a house's walls: flat pieces join, unjudged)
  for (let c = 0; c < count; c++) if (member(c) && !within(c)) leaves.add(U.find(c));
  const backOf = (t, dx, dy, dz) => { const p = parts[part[t]], d = N[t * 3] * dx + N[t * 3 + 1] * dy + N[t * 3 + 2] * dz; return (p.side === 1 ? -d : d) > 0; };
  const need = T.inside, K = DIRS14.length, hits = new Map();
  // one point: under the ground (-2 - the anchor's part), inside a solid (its part), or -1. `full`: false asks only
  // whether it is under the ground
  const probe = (x, y, z, own, full) => {
    hits.clear();
    let ins = 0, miss = 0;
    for (let r = 0; r < K; r++) {
      const [dx, dy, dz] = DIRS14[r];
      const h = raycast(P, H, x, y, z, dx, dy, dz, 1e-4, T.deep, triMesh, own);
      if (h && backOf(h.t, dx, dy, dz)) {
        const pi = part[h.t];
        if (r === 0 && parts[pi].anchor) return -2 - pi;
        ins++; hits.set(pi, (hits.get(pi) || 0) + 1);
      } else if (++miss > K - need) return -1;
      if (!full) return -1;
    }
    if (ins < need) return -1;
    let best = -1, bn = 0; for (const [pi, k] of hits) if (k > bn) { bn = k; best = pi; }
    return best;
  };
  const S = T.samples, out = [];
  const shownAligned = (list) => { // every shown sample's face turned one way: laid flush
    if (!list.length) return false;
    let nx = 0, ny = 0, nz = 0; for (const t of list) { nx += N[t * 3]; ny += N[t * 3 + 1]; nz += N[t * 3 + 2]; }
    const l = hypot3(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    return list.every((t) => N[t * 3] * nx + N[t * 3 + 1] * ny + N[t * 3 + 2] * nz > T.flush);
  };
  // per group: area, area under, the shown faces, where the under part is, which anchor
  const grp = new Map();
  for (let c = 0; c < count; c++) {
    if (!judged(c)) continue;
    const l = L[c], o = c * 6, own = mk[pOf[c]];
    const size = Math.max(box[o + 3] - box[o], box[o + 4] - box[o + 1], box[o + 5] - box[o + 2]);
    const gk = U.find(c);
    let g = grp.get(gk);
    if (!g) grp.set(gk, (g = { part: pOf[c], area: 0, under: 0, shown: [], sx: 0, sy: 0, sz: 0, n: 0, with: new Map(), pieces: 0, tris: 0, box: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity] }));
    g.area += area[c]; g.pieces++; g.tris += l.length;
    for (let k = 0; k < 3; k++) { g.box[k] = Math.min(g.box[k], box[o + k]); g.box[3 + k] = Math.max(g.box[3 + k], box[o + 3 + k]); }
    // looked at only when another mesh's solid face reaches into its box, or what is over its middle is the back of
    // something (it is wholly inside, or deep under the ground)
    let near = false;
    for (let i = Math.floor(box[o] / G.cs); i <= Math.floor(box[o + 3] / G.cs) && !near; i++)
      for (let j = Math.floor(box[o + 1] / G.cs); j <= Math.floor(box[o + 4] / G.cs) && !near; j++)
        for (let k = Math.floor(box[o + 2] / G.cs); k <= Math.floor(box[o + 5] / G.cs) && !near; k++)
          for (const u of G.cells.get(G.K(i, j, k)) || []) {
            if (triMesh[u] === own) continue;
            if (B[u * 6] > box[o + 3] || B[u * 6 + 3] < box[o] || B[u * 6 + 1] > box[o + 4] || B[u * 6 + 4] < box[o + 1] || B[u * 6 + 2] > box[o + 5] || B[u * 6 + 5] < box[o + 2]) continue;
            near = true; break;
          }
    if (!near) {
      const cx = (box[o] + box[o + 3]) / 2, cy = (box[o + 1] + box[o + 4]) / 2, cz = (box[o + 2] + box[o + 5]) / 2, [dx, dy, dz] = DIRS14[0];
      const h = raycast(P, H, cx, cy, cz, dx, dy, dz, 1e-4, T.deep * 4, triMesh, own);
      if (!h || !backOf(h.t, dx, dy, dz)) { for (const t of l) if (g.shown.length < 64) g.shown.push(t); continue; }
    }
    // the samples: S points spread over the skin by area (stratified along the summed area), each nudged in
    const nudge = Math.min(T.nudge, size * 0.05), solidOK = size >= T.minSize && size <= T.big;
    let acc = 0, ti = 0, inside = 0, under = 0, sx = 0, sy = 0, sz = 0;
    const tally = new Map(), shown = [];
    for (let s = 0; s < S; s++) {
      const want = ((s + 0.5) / S) * area[c];
      while (ti < l.length - 1 && acc + A[l[ti]] < want) acc += A[l[ti++]];
      const t = l[ti], q = t * 9, r1 = Math.sqrt(0.1 + 0.8 * halton(s + 1, 2)), r2 = 0.1 + 0.8 * halton(s + 1, 3); // spread over the face, off its edges
      const w0 = 1 - r1, w1 = r1 * (1 - r2), w2 = r1 * r2;
      const x = P[q] * w0 + P[q + 3] * w1 + P[q + 6] * w2 - N[t * 3] * nudge;
      const y = P[q + 1] * w0 + P[q + 4] * w1 + P[q + 7] * w2 - N[t * 3 + 1] * nudge;
      const z = P[q + 2] * w0 + P[q + 5] * w1 + P[q + 8] * w2 - N[t * 3 + 2] * nudge;
      const full = solidOK && inside + (S - s) >= T.frac * S; // inside a solid is still within reach
      const pi = probe(x, y, z, own, full);
      if (pi <= -2) { under++; g.sx += x; g.sy += y; g.sz += z; g.n++; g.with.set(-2 - pi, (g.with.get(-2 - pi) || 0) + 1); continue; }
      if (g.shown.length < 64) g.shown.push(t);
      if (pi >= 0) { inside++; sx += x; sy += y; sz += z; tally.set(pi, (tally.get(pi) || 0) + 1); } else shown.push(t);
    }
    g.under += (under / S) * area[c];
    if (!solidOK || inside < T.frac * S) continue;
    if (inside < T.whole * S && shownAligned(shown)) continue; // laid flush
    let w = -1, wn = 0; for (const [pi, k] of tally) if (k > wn) { wn = k; w = pi; }
    out.push({ part: pOf[c], with: w, at: [sx / inside, sy / inside, sz / inside], frac: inside / S, size, under: false, pieces: 1, tris: l.length });
  }
  for (const [gk, g] of grp) {
    if (!g.n || g.under < T.frac * g.area || leaves.has(gk)) continue;
    const size = Math.max(g.box[3] - g.box[0], g.box[4] - g.box[1], g.box[5] - g.box[2]);
    if (size < T.minSize || size > T.big) continue;
    if (g.under < T.whole * g.area && shownAligned(g.shown)) continue; // laid flush
    let w = -1, wn = 0; for (const [pi, k] of g.with) if (k > wn) { wn = k; w = pi; }
    out.push({ part: g.part, with: w, at: [g.sx / g.n, g.sy / g.n, g.sz / g.n], frac: g.under / g.area, size, under: true, pieces: g.pieces, tris: g.tris });
  }
  // gathered: by the part, what it is in, and a 2 m cell (a merged mesh's many pieces in one wall are one finding)
  const groups = new Map();
  for (const f of out) {
    const k = `${f.part}|${f.with}|${f.under ? 1 : 0}|${Math.floor(f.at[0] / 2)},${Math.floor(f.at[1] / 2)},${Math.floor(f.at[2] / 2)}`;
    const g = groups.get(k);
    if (!g) groups.set(k, { ...f });
    else { g.pieces += f.pieces; g.tris += f.tris; if (f.size * f.frac > g.size * g.frac) Object.assign(g, { at: f.at, frac: f.frac, size: f.size }); }
  }
  return [...groups.values()].sort((p, q) => q.size * q.frac - p.size * p.frac);
}
