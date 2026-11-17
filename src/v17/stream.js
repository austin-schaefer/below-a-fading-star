// The kit for water on a line, and for still water on an edge (v17 W1). Pure, three-free, worker-safe: the height path
// (src/height/field.js) calls it behind one box test (plan.js BOX), and src/v17/water.js draws what it says.
//
// A stream (makeStream) is a polyline of control points [x, z, hw] (hw the half-width of the water there), smoothed
// through a Catmull-Rom and sampled every 0.5 m, with a level profile given as stations [x, z, y] that only falls
// downstream (a step is two stations close together: the water drops between them; a pool is two stations at one level).
// From that it gives:
//   ground(h, x, z): the bed cut under the level inside the water (a shallow dish, D deep), the bank cut down to the level
//     beside it (rising at `bank` a metre out), and a lip raised to hold it where the ground beside it lies under the
//     level (LIP over the water from the edge to LIP_W out, falling at LIP_FALL beyond), as height/floor.js's pools do;
//     the lip is held only between `hold` (two points on the line: where it leaves one body and enters the next), so the
//     stream does not raise banks inside the tarn or the mere it runs out of and into;
//   wet(x, z) / level(x, z): inside the water's edge (|d| under the half-width, the edge wobbled by a noise so no ruled
//     line shows), and its level there;
//   paint(x, z, out): a gravel bed under the water, a pale margin of wet stones along the edge, the wet ground beyond;
//   the samples (X, Z, S, Y, HW, ...) for the ribbon (src/v17/water.js).
// A still (makeStill) is a body on an edge (height/outline.js radialOutline): its level, a bowl under it, the bank cut
// down to it and the lip raised all round (the floor's pools' arithmetic).
// Every query first asks the stream's own box, then a 4 m grid of which samples lie within reach of the cell, so a call
// away from the water costs a box test and a call near it a handful of segment distances.
import { smoothstep, makeSimplex } from '../noise.js';
import { radialOutline } from '../height/outline.js';

const SN = makeSimplex(17017);
const STEP = 0.5, CELL = 4;
export const LIP = 0.25, LIP_W = 3, LIP_FALL = 0.3;

const _p = { i: 0, f: 0, s: 0, d: 0, dist: 0, hw: 0, ok: false };

export function makeStream(def) {
  const { name, pts, levels, bank = 0.45, wob = 0.14, reach = 8 } = def;
  // ---- the line: a centripetal-free (uniform) Catmull-Rom through the control points, resampled every STEP metres
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.25));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      dense.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * (t2 * (3 - 2 * t))]);
    }
  }
  dense.push(pts[pts.length - 1].slice());
  // arc length along the dense line, then resample at STEP
  const dS = [0];
  for (let i = 1; i < dense.length; i++) dS.push(dS[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = dS[dS.length - 1], n = Math.floor(L / STEP) + 1;
  const X = new Float64Array(n), Z = new Float64Array(n), S = new Float64Array(n), HW = new Float64Array(n);
  for (let k = 0, j = 0; k < n; k++) {
    const s = k * STEP;
    while (j < dense.length - 2 && dS[j + 1] < s) j++;
    const f = Math.min(1, Math.max(0, (s - dS[j]) / ((dS[j + 1] - dS[j]) || 1)));
    X[k] = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f; Z[k] = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f;
    HW[k] = dense[j][2] + (dense[j + 1][2] - dense[j][2]) * f; S[k] = s;
  }
  // tangent (smoothed over 2 m)
  const TX = new Float64Array(n), TZ = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const a = Math.max(0, k - 4), b = Math.min(n - 1, k + 4), tx = X[b] - X[a], tz = Z[b] - Z[a], l = Math.hypot(tx, tz) || 1;
    TX[k] = tx / l; TZ[k] = tz / l;
  }
  // nearest sample to a point (build time only)
  const sOf = (x, z) => { let best = 0, bd = Infinity; for (let k = 0; k < n; k++) { const d = (X[k] - x) ** 2 + (Z[k] - z) ** 2; if (d < bd) { bd = d; best = k; } } return S[best]; };
  // ---- the level profile: stations projected onto the line, linear between, falling only downstream
  const st = levels.map(([x, z, y]) => [sOf(x, z), y]).sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < st.length; i++) if (st[i][1] > st[i - 1][1] + 1e-9) throw new Error(`stream ${name}: its level rises downstream at s ${st[i][0].toFixed(1)}`);
  const levelOfS = (s) => {
    if (s <= st[0][0]) return st[0][1];
    for (let i = 1; i < st.length; i++) if (s <= st[i][0]) { const [s0, y0] = st[i - 1], [s1, y1] = st[i]; return y0 + (y1 - y0) * ((s - s0) / ((s1 - s0) || 1)); }
    return st[st.length - 1][1];
  };
  const Y = new Float64Array(n), D = new Float64Array(n), DROP = new Float64Array(n), ROUGH = new Float64Array(n), SPEED = new Float64Array(n);
  const HWL = new Float64Array(n), HWR = new Float64Array(n), HOLD = new Float64Array(n);
  for (let k = 0; k < n; k++) Y[k] = levelOfS(S[k]);
  // the drop a metre (how steep the water runs), white below a step for a few metres, the speed (steeper and narrower
  // runs faster), the bed's depth (deeper in a pool, shallow over a lip)
  for (let k = 0; k < n; k++) DROP[k] = (Y[Math.max(0, k - 2)] - Y[Math.min(n - 1, k + 2)]) / (Math.min(n - 1, k + 2) - Math.max(0, k - 2) || 1) / STEP;
  for (let k = 0; k < n; k++) {
    let r = 0;
    for (let j = 0; j <= 12; j++) { const i = k - j; if (i < 0) break; r = Math.max(r, Math.min(1, (DROP[i] - 0.06) * 5) * Math.exp(-j * STEP / 2.2)); }
    ROUGH[k] = Math.max(0, r);
    let g = 0; for (let j = -8; j <= 8; j++) g += DROP[Math.min(n - 1, Math.max(0, k + j))] / 17;
    SPEED[k] = Math.min(3.2, Math.max(0.12, (0.1 + g * 32) * Math.min(2, 1.3 / HW[k])));
    D[k] = Math.min(1.1, 0.3 + 0.09 * HW[k] + (g < 0.004 ? 0.25 : 0));
    // the edge wobbled on each side, slow along the stream
    HWL[k] = HW[k] * (1 + wob * SN.noise2(S[k] * 0.11, 3.7)) + 0.25 * SN.noise2(S[k] * 0.45, 11.1);
    HWR[k] = HW[k] * (1 + wob * SN.noise2(S[k] * 0.11, -5.3)) + 0.25 * SN.noise2(S[k] * 0.45, -8.9);
  }
  // where the lip is held: between the two `hold` points, eased in and out over 4 m
  const h0 = def.hold ? sOf(...def.hold[0]) : 0, h1 = def.hold ? sOf(...def.hold[1]) : L;
  for (let k = 0; k < n; k++) HOLD[k] = smoothstep(h0, h0 + 4, S[k]) * (1 - smoothstep(h1 - 4, h1, S[k]));
  // ---- the box and the grid: per 4 m cell, the run of samples within reach of it
  let maxHW = 0; for (let k = 0; k < n; k++) maxHW = Math.max(maxHW, HWL[k], HWR[k]);
  const R = maxHW + reach;
  let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
  for (let k = 0; k < n; k++) { bx0 = Math.min(bx0, X[k]); bx1 = Math.max(bx1, X[k]); bz0 = Math.min(bz0, Z[k]); bz1 = Math.max(bz1, Z[k]); }
  bx0 -= R; bx1 += R; bz0 -= R; bz1 += R;
  const gw = Math.ceil((bx1 - bx0) / CELL), gh = Math.ceil((bz1 - bz0) / CELL);
  const G0 = new Int32Array(gw * gh).fill(-1), G1 = new Int32Array(gw * gh).fill(-1);
  const rr = (R + CELL * 0.75 + STEP) ** 2;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const cx = bx0 + (i + 0.5) * CELL, cz = bz0 + (j + 0.5) * CELL;
    let a = -1, b = -1;
    for (let k = 0; k < n; k++) if ((X[k] - cx) ** 2 + (Z[k] - cz) ** 2 < rr) { if (a < 0) a = k; b = k; }
    G0[j * gw + i] = a; G1[j * gw + i] = b;
  }

  // the nearest point of the line: s, d (signed, + to the left of downstream), dist; the sample i and fraction f
  function project(x, z, out = _p) {
    out.ok = false;
    if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return out;
    const c = ((z - bz0) / CELL | 0) * gw + ((x - bx0) / CELL | 0), a = G0[c];
    if (a < 0) return out;
    const b = Math.min(G1[c], n - 2);
    let best = Infinity, bi = a, bf = 0;
    for (let k = Math.max(0, a - 1); k <= b; k++) {
      const ex = X[k + 1] - X[k], ez = Z[k + 1] - Z[k], l2 = ex * ex + ez * ez;
      let f = ((x - X[k]) * ex + (z - Z[k]) * ez) / l2; f = f < 0 ? 0 : f > 1 ? 1 : f;
      const dx = x - X[k] - ex * f, dz = z - Z[k] - ez * f, d2 = dx * dx + dz * dz;
      if (d2 < best) { best = d2; bi = k; bf = f; }
    }
    const dist = Math.sqrt(best);
    if (dist > R) return out;
    const tx = TX[bi] + (TX[bi + 1] - TX[bi]) * bf, tz = TZ[bi] + (TZ[bi + 1] - TZ[bi]) * bf;
    const px = X[bi] + (X[bi + 1] - X[bi]) * bf, pz = Z[bi] + (Z[bi + 1] - Z[bi]) * bf;
    // left of the downstream direction (tx, tz) is (tz, -tx)
    const side = (x - px) * tz - (z - pz) * tx;
    out.i = bi; out.f = bf; out.s = S[bi] + STEP * bf; out.d = side; out.dist = dist;
    out.hw = side >= 0 ? HWL[bi] + (HWL[bi + 1] - HWL[bi]) * bf : HWR[bi] + (HWR[bi + 1] - HWR[bi]) * bf;
    out.ok = true;
    return out;
  }
  const at = (A, p) => A[p.i] + (A[p.i + 1] - A[p.i]) * p.f;

  function ground(h, x, z) {
    const p = project(x, z);
    if (!p.ok) return h;
    const W = at(Y, p), e = p.dist - p.hw, hold = at(HOLD, p);
    // the lip, where the stream holds its own water
    if (hold > 0 && e >= 0) {
      const lo = W + LIP - LIP_FALL * (e > LIP_W ? e - LIP_W : 0);
      if (h < lo) h += (lo - h) * hold;
    }
    // the bed under the water (a dish, its edge at the level) and the bank cut down to it
    let hi;
    if (e < 0) { const q = p.dist / p.hw; hi = W - at(D, p) * (1 - q * q); }
    else hi = W + bank * e;
    return h > hi ? hi : h;
  }
  function wet(x, z) { const p = project(x, z); return p.ok && p.dist < p.hw; }
  function level(x, z) { const p = project(x, z); return p.ok && p.dist < p.hw ? at(Y, p) : null; }
  // a signed distance to the water's edge (< 0 in the water) within reach, a bound past it
  function sd(x, z) {
    const p = project(x, z);
    if (p.ok) return p.dist - p.hw;
    const dx = x < bx0 ? bx0 - x : x > bx1 ? x - bx1 : 0, dz = z < bz0 ? bz0 - z : z > bz1 ? z - bz1 : 0;
    return Math.max(R - maxHW, Math.hypot(dx, dz) + reach);
  }
  // the paint: the bed's gravel under the water, a pale margin of stones along the edge, wet ground beyond
  function paint(x, z, out) {
    const p = project(x, z);
    if (!p.ok) return false;
    const e = p.dist - p.hw, n2 = SN.noise2(x * 0.21 + 1.7, z * 0.21 - 4.4);
    const hold = Math.max(at(HOLD, p), 0.35);
    out.shore = Math.max(out.shore, (1 - smoothstep(-0.6, 0.4, e)) * 0.9);
    out.strand = Math.max(out.strand, smoothstep(-1.0, -0.3, e) * (1 - smoothstep(0.3, 1.3 + 0.9 * n2, e)) * (0.55 + 0.25 * n2) * hold);
    out.wet = Math.max(out.wet, (1 - smoothstep(0.5, 5 + 2 * n2, e)));
    return true;
  }
  return { name, kind: 'stream', X, Z, S, TX, TZ, Y, HW, HWL, HWR, D, SPEED, ROUGH, HOLD, n, length: L, box: [bx0, bx1, bz0, bz1], reach: R,
    project, ground, wet, level, sd, paint, levelOfS, sOf };
}

// Still water on an edge: the floor's pools' arithmetic (height/floor.js poolGround) on an outline of its own.
export function makeStill(def) {
  const { name, y, D = 1.6, bank = 0.45, reach = 20 } = def;
  const o = radialOutline({ far: 40, ...def.outline });
  const R = o.rMax + reach, c = o.centre;
  const box = [c.x - R, c.x + R, c.z - R, c.z + R], wbox = [c.x - o.rMax, c.x + o.rMax, c.z - o.rMax, c.z + o.rMax];
  function ground(h, x, z) {
    if (x < box[0] || x > box[1] || z < box[2] || z > box[3]) return h;
    const s = o.sd(x, z);
    if (s > reach) return h;
    const lo = s < 0 ? y + LIP + 0.6 * s : y + LIP - LIP_FALL * (s > LIP_W ? s - LIP_W : 0);
    const hi = s < 0 ? y - 0.5 * smoothstep(0, -3, s) - D * smoothstep(-1.5, -10, s) : y + bank * s;
    if (h < lo) h = lo;
    return h > hi ? hi : h;
  }
  const wet = (x, z) => x > wbox[0] && x < wbox[1] && z > wbox[2] && z < wbox[3] && o.sd(x, z) < 0;
  const level = (x, z) => (wet(x, z) ? y : null);
  const sd = (x, z) => (x < box[0] || x > box[1] || z < box[2] || z > box[3] ? reach + 1 : o.sd(x, z));
  function paint(x, z, out) {
    if (x < box[0] || x > box[1] || z < box[2] || z > box[3]) return false;
    const s = o.sd(x, z);
    if (s > 14) return false;
    const n2 = SN.noise2(x * 0.17 - 2.3, z * 0.17 + 6.1);
    out.shore = Math.max(out.shore, (1 - smoothstep(-1, 0.6, s)) * 0.9);
    out.strand = Math.max(out.strand, smoothstep(-1.6, -0.4, s) * (1 - smoothstep(0.4, 1.6 + 1.2 * n2, s)) * (0.5 + 0.3 * n2));
    out.wet = Math.max(out.wet, 1 - smoothstep(1, 9 + 3 * n2, s));
    return true;
  }
  return { name, kind: 'still', y, outline: o, sd, box, wbox, rMax: o.rMax, centre: c, ground, wet, level, paint };
}
