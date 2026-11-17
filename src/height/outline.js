// The edge (v16 L2): the one way a natural outline is drawn here, so nothing seen from above has a ruled shore. Pure
// and worker-safe (no three, no page globals). Two kinds:
//
//   radialOutline(o): a closed shore round a centre, for a body of water or a patch that has one (Lees Tarn; the fen).
//     R(θ) = r·(1 + W(θ)·Σ_{k=2..K}(a_k cos kθ + b_k sin kθ)), the coefficients seeded and scaled so the sum's RMS is
//     amp (k = 1 would only move the centre; falloff is the power the k-th harmonic's size falls by). W(θ) is the
//     product of the windows: on a sector (a compass bearing ± half, easing out over ramp degrees) the wobble is
//     scaled down to min, so a shore can be held where something is laid along it. sd = (ρ − R)/√(1 + (R′/max(ρ, R))²), the
//     distance to the curve to first order (inside, the slope is taken at the shore's radius, so the centre is deep), plus an optional warp (three seeded plane waves, warp metres at warpFreq
//     radians a metre; keep warp·warpFreq under about 0.2 or the gradient strays), then the lobes, each a disc or a
//     tapered capsule joined by a smooth min of width k: a water lobe (a bay, an inlet) adds to the inside, a land
//     lobe (a point, a headland) takes from it. Negative inside (in the water), positive outside, metres.
//     θ is atan2(z − cz, x − cx) (x east, z south); windows and lobes are placed by compass bearing in degrees
//     (0 north, toward −z; 90 east) and distance from the centre, or by x, z.
//     Returns { R(θ), dR(θ), sd(x, z), box: [x0, x1, z0, z1], rMax, rMin, centre, glsl(name), uniforms() }.
//     Past rMax + far (default 48 m) sd returns ρ − rMax at once, a lower bound of the distance: read the outline
//     only within far of it. glsl(name) is GLSL ES source for `float name(vec2 p)` (p = (x, z)) with every constant
//     baked in, in scalar arithmetic the same as sd's; uniforms() is {} (kept for an outline that moves).
//
//   polyOutline(ctrl, o): a closed Catmull-Rom through control points [[x, z], ...], each sample pushed along its
//     normal by seeded noise (amp metres at freq), for a shape that is not round round anything (the glacier, #75).
//     Returns { sd(x, z), box, pts }; sd < 0 inside. No shader form.
//
// tools/outline-test.mjs holds both to their word: |∇sd| near 1 on the shore, the GLSL's arithmetic against sd,
// the same seed the same shore, and the cost a call. How to put a body of water or a patch on one: modules.md.
import { mulberry32, makeSimplex, clamp } from '../noise.js';

const DEG = Math.PI / 180;
// compass bearing (degrees) to a unit (x, z)
export const bearingDir = (b) => [Math.sin(b * DEG), -Math.cos(b * DEG)];
export function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
}

// A sector's weight at (x, z) seen from (cx, cz): 1 within half degrees of the bearing, easing to 0 over ramp more.
// For what a shore does on one side only (a steep bank, a shallows); the windows above are the same curve.
export function sectorWeight(cx, cz, { bearing, half, ramp = 20 }) {
  const [sx, sz] = bearingDir(bearing), c0 = Math.cos(Math.min(180, half + ramp) * DEG), c1 = Math.cos(half * DEG), iw = 1 / (c1 - c0);
  return (x, z) => {
    const dx = x - cx, dz = z - cz, rho = Math.sqrt(dx * dx + dz * dz);
    if (rho < 1e-6) return 0;
    const t = clamp(((dx * sx + dz * sz) / rho - c0) * iw, 0, 1);
    return t * t * (3 - 2 * t);
  };
}

function place(o, cx, cz) {
  if (o.bearing === undefined) return [o.x, o.z];
  const [ux, uz] = bearingDir(o.bearing);
  return [cx + ux * o.d, cz + uz * o.d];
}

export function radialOutline(o) {
  const { x: cx, z: cz, r, seed = 1, K = 7, amp = 0.1, falloff = 1.2, window = [], lobes = [], warp = 0, warpFreq = 0.08, far = 48 } = o;
  // the Fourier coefficients: seeded, k^-falloff, scaled to RMS amp
  const rng = mulberry32(seed >>> 0);
  const gauss = () => { const u = Math.max(rng(), 1e-12), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const A = new Float64Array(K + 1), B = new Float64Array(K + 1);
  let ms = 0;
  for (let k = 2; k <= K; k++) { const w = Math.pow(k, -falloff); A[k] = gauss() * w; B[k] = gauss() * w; ms += (A[k] * A[k] + B[k] * B[k]) / 2; }
  const sc = ms > 0 ? amp / Math.sqrt(ms) : 0;
  for (let k = 2; k <= K; k++) { A[k] *= sc; B[k] *= sc; }
  // the windows: direction, the cosines that bound the ramp, how much of the wobble is taken away
  const WIN = window.map((w) => {
    const [sx, sz] = bearingDir(w.bearing), c0 = Math.cos(Math.min(180, w.half + (w.ramp ?? 20)) * DEG), c1 = Math.cos(w.half * DEG);
    return { sx, sz, c0, c1, m: 1 - (w.min ?? 0) };
  });
  // the warp: three plane waves
  const WARP = [0, 1, 2].map((j) => { const a = rng() * Math.PI + j * Math.PI / 3; return { kx: Math.cos(a) * warpFreq, kz: Math.sin(a) * warpFreq, p: rng() * 2 * Math.PI }; });
  const wq = warp / 3;
  // the lobes: discs or tapered capsules; land takes from the inside
  const LOBES = lobes.map((l) => {
    const [x, z] = place(l, cx, cz);
    const L = { x, z, r: l.r, k: l.k ?? l.r * 0.6, land: !!l.land, cap: false, x2: 0, z2: 0, r2: l.r, ex: 0, ez: 0, l2: 1 };
    if (l.to) { // a capsule from (x, z) to `to` (bearing/d or x/z), its radius r there tapering to `to.r`
      const [x2, z2] = place(l.to, cx, cz);
      L.cap = true; L.x2 = x2; L.z2 = z2; L.r2 = l.to.r ?? l.r; L.ex = x2 - x; L.ez = z2 - z; L.l2 = L.ex * L.ex + L.ez * L.ez;
    }
    return L;
  });

  // F, F', W, W' at the unit direction (c, s): written out so the GLSL below is the same arithmetic
  const _fw = { F: 0, Fp: 0, W: 1, Wp: 0 };
  function fw(c, s) {
    let c0 = 1, s0 = 0, c1 = c, s1 = s, F = 0, Fp = 0;
    for (let k = 2; k <= K; k++) {
      const cn = 2 * c * c1 - c0, sn = 2 * c * s1 - s0;
      F += A[k] * cn + B[k] * sn; Fp += k * (B[k] * cn - A[k] * sn);
      c0 = c1; s0 = s1; c1 = cn; s1 = sn;
    }
    let W = 1, Wp = 0;
    for (let i = 0; i < WIN.length; i++) {
      const w = WIN[i], q = c * w.sx + s * w.sz;
      const t = clamp((q - w.c0) / (w.c1 - w.c0), 0, 1);
      const f = 1 - w.m * t * t * (3 - 2 * t), fp = -w.m * 6 * t * (1 - t) / (w.c1 - w.c0) * (c * w.sz - s * w.sx);
      Wp = Wp * f + W * fp; W *= f;
    }
    _fw.F = F; _fw.Fp = Fp; _fw.W = W; _fw.Wp = Wp;
    return _fw;
  }
  const R = (th) => { const q = fw(Math.cos(th), Math.sin(th)); return r * (1 + q.W * q.F); };
  const dR = (th) => { const q = fw(Math.cos(th), Math.sin(th)); return r * (q.Wp * q.F + q.W * q.Fp); };

  let rMax = 0, rMin = Infinity;
  for (let i = 0; i < 1440; i++) { const v = R((i / 1440) * 2 * Math.PI); rMax = Math.max(rMax, v); rMin = Math.min(rMin, v); }
  for (const L of LOBES) if (!L.land) {
    rMax = Math.max(rMax, Math.hypot(L.x - cx, L.z - cz) + L.r + L.k * 0.25);
    if (L.cap) rMax = Math.max(rMax, Math.hypot(L.x2 - cx, L.z2 - cz) + L.r2 + L.k * 0.25);
  }
  rMax += Math.abs(warp) + 0.5;
  const FAR = rMax + far, FAR2 = FAR * FAR;

  function sd(x, z) {
    const dx = x - cx, dz = z - cz, r2 = dx * dx + dz * dz;
    if (r2 > FAR2) return Math.sqrt(r2) - rMax;
    const rho = Math.max(Math.sqrt(r2), 1e-6), c = dx / rho, s = dz / rho;
    const q = fw(c, s);
    const Rv = r * (1 + q.W * q.F), Rp = r * (q.Wp * q.F + q.W * q.Fp);
    const rr = rho > Rv ? rho : Rv; // inside, the slope is taken on the shore's radius: near the centre R′/ρ is no measure
    let d = (rho - Rv) / Math.sqrt(1 + (Rp / rr) * (Rp / rr));
    if (wq !== 0) d += wq * (Math.sin(WARP[0].kx * dx + WARP[0].kz * dz + WARP[0].p) + Math.sin(WARP[1].kx * dx + WARP[1].kz * dz + WARP[1].p) + Math.sin(WARP[2].kx * dx + WARP[2].kz * dz + WARP[2].p));
    for (let i = 0; i < LOBES.length; i++) {
      const L = LOBES[i];
      let px = x - L.x, pz = z - L.z, rr = L.r;
      if (L.cap) {
        const t = clamp((px * L.ex + pz * L.ez) / L.l2, 0, 1);
        px -= L.ex * t; pz -= L.ez * t; rr = L.r + (L.r2 - L.r) * t;
      }
      const e = Math.sqrt(px * px + pz * pz) - rr;
      d = L.land ? -smin(-d, e, L.k) : smin(d, e, L.k);
    }
    return d;
  }

  // GLSL: the same arithmetic, every constant baked in, scalars only
  const f = (v) => { const t = Number(v).toPrecision(10); return '(' + (/[.e]/.test(t) ? t : t + '.0') + ')'; };
  function glsl(name) {
    const L = [];
    L.push(`float ${name}(vec2 p) {`);
    L.push(`  float dx = p.x - ${f(cx)}, dz = p.y - ${f(cz)};`);
    L.push(`  float r2 = dx * dx + dz * dz;`);
    L.push(`  if (r2 > ${f(FAR2)}) return sqrt(r2) - ${f(rMax)};`);
    L.push(`  float rho = max(sqrt(r2), 1e-6), c = dx / rho, s = dz / rho;`);
    L.push(`  float c0 = 1.0, s0 = 0.0, c1 = c, s1 = s, cn = 0.0, sn = 0.0, F = 0.0, Fp = 0.0;`);
    for (let k = 2; k <= K; k++) {
      L.push(`  cn = 2.0 * c * c1 - c0; sn = 2.0 * c * s1 - s0; F += ${f(A[k])} * cn + ${f(B[k])} * sn; Fp += ${f(k)} * (${f(B[k])} * cn - ${f(A[k])} * sn); c0 = c1; s0 = s1; c1 = cn; s1 = sn;`);
    }
    L.push(`  float W = 1.0, Wp = 0.0, t = 0.0, g = 0.0, gp = 0.0;`);
    for (const w of WIN) {
      L.push(`  t = clamp((c * ${f(w.sx)} + s * ${f(w.sz)} - ${f(w.c0)}) / ${f(w.c1 - w.c0)}, 0.0, 1.0); g = 1.0 - ${f(w.m)} * t * t * (3.0 - 2.0 * t); gp = -${f(w.m)} * 6.0 * t * (1.0 - t) / ${f(w.c1 - w.c0)} * (c * ${f(w.sz)} - s * ${f(w.sx)}); Wp = Wp * g + W * gp; W *= g;`);
    }
    L.push(`  float Rv = ${f(r)} * (1.0 + W * F), Rp = ${f(r)} * (Wp * F + W * Fp);`);
    L.push(`  float rr = max(rho, Rv);`);
    L.push(`  float d = (rho - Rv) / sqrt(1.0 + (Rp / rr) * (Rp / rr));`);
    if (wq !== 0) L.push(`  d += ${f(wq)} * (${WARP.map((w) => `sin(${f(w.kx)} * dx + ${f(w.kz)} * dz + ${f(w.p)})`).join(' + ')});`);
    if (LOBES.length) L.push(`  float px = 0.0, pz = 0.0, e = 0.0, h = 0.0, u = 0.0;`);
    for (const B2 of LOBES) {
      L.push(`  px = p.x - ${f(B2.x)}; pz = p.y - ${f(B2.z)};`);
      let rr = f(B2.r);
      if (B2.cap) {
        L.push(`  u = clamp((px * ${f(B2.ex)} + pz * ${f(B2.ez)}) / ${f(B2.l2)}, 0.0, 1.0); px -= ${f(B2.ex)} * u; pz -= ${f(B2.ez)} * u;`);
        rr = `(${f(B2.r)} + ${f(B2.r2 - B2.r)} * u)`;
      }
      L.push(`  e = sqrt(px * px + pz * pz) - ${rr};`);
      // smin(a, b, k) = b + (a - b) h - k h (1 - h), h = clamp(0.5 + 0.5 (b - a) / k, 0, 1); land: -smin(-d, e, k)
      if (B2.land) L.push(`  h = clamp(0.5 + 0.5 * (e + d) / ${f(B2.k)}, 0.0, 1.0); d = -(e + (-d - e) * h - ${f(B2.k)} * h * (1.0 - h));`);
      else L.push(`  h = clamp(0.5 + 0.5 * (e - d) / ${f(B2.k)}, 0.0, 1.0); d = e + (d - e) * h - ${f(B2.k)} * h * (1.0 - h);`);
    }
    L.push(`  return d;`);
    L.push(`}`);
    return L.join('\n');
  }

  return {
    R, dR, sd, glsl, uniforms: () => ({}),
    rMax, rMin, centre: { x: cx, z: cz }, box: [cx - rMax, cx + rMax, cz - rMax, cz + rMax], far,
    coeffs: { A, B }, lobes: LOBES,
  };
}

// A closed Catmull-Rom through ctrl, its samples pushed along their normals by seeded noise.
export function polyOutline(ctrl, o = {}) {
  const { seed = 1, amp = 0, freq = 0.05, per = 12, far = 40 } = o;
  const N = makeSimplex(seed);
  const n = ctrl.length, raw = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      raw.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const m = raw.length, X = new Float64Array(m), Z = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const a = raw[(i - 1 + m) % m], b = raw[(i + 1) % m], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
    const push = amp * N.noise2(raw[i][0] * freq, raw[i][1] * freq);
    X[i] = raw[i][0] + (tz / tl) * push; Z[i] = raw[i][1] - (tx / tl) * push;
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < m; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); z0 = Math.min(z0, Z[i]); z1 = Math.max(z1, Z[i]); }
  function sd(x, z) {
    const ex = x < x0 ? x0 - x : x > x1 ? x - x1 : 0, ez = z < z0 ? z0 - z : z > z1 ? z - z1 : 0;
    if (ex > far || ez > far) return Math.hypot(ex, ez);
    let best = Infinity, inside = false;
    for (let i = 0, j = m - 1; i < m; j = i++) {
      const ax = X[j], az = Z[j], bx = X[i], bz = Z[i], dx = bx - ax, dz = bz - az;
      const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const qx = ax + dx * t - x, qz = az + dz * t - z, e = qx * qx + qz * qz;
      if (e < best) best = e;
      if ((az > z) !== (bz > z) && x < ax + ((z - az) * dx) / dz) inside = !inside;
    }
    return inside ? -Math.sqrt(best) : Math.sqrt(best);
  }
  return { sd, box: [x0, x1, z0, z1], pts: { X, Z, n: m } };
}
