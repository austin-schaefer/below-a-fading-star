// Terrain: a single heightfield over the whole region, bounded by impassable mountains,
// with a glacier tongue coming down from the north. Everything else samples heightAt().
import * as THREE from 'three';
import { makeSimplex, mulberry32, clamp, lerp, smoothstep } from './noise.js';
import { WORLD, LANDMARKS, WATER, CAUSEWAY, PALETTE, SUN } from './world.js';
import { applyMountains, M_START } from './v4/mountains.js'; // v4 systems: the walls

const SX = makeSimplex(WORLD.seed);
const SY = makeSimplex(WORLD.seed + 77);

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  const x = ax + dx * t, z = az + dz * t;
  return Math.hypot(px - x, pz - z);
}
export function causewayDistance(x, z) {
  let d = Infinity;
  for (let i = 0; i < CAUSEWAY.length - 1; i++) {
    const a = CAUSEWAY[i], b = CAUSEWAY[i + 1];
    d = Math.min(d, distToSegment(x, z, a.x, a.z, b.x, b.z));
  }
  return d;
}

// Flatten toward a target height inside r, blending out over `fall` metres.
function flatten(h, x, z, cx, cz, r, fall, target) {
  const d = Math.hypot(x - cx, z - cz);
  const m = 1 - smoothstep(r, r + fall, d);
  return lerp(h, target, m);
}

// Glacier channel mask: a notch in the northern mountain wall, 0..1
export function glacierMask(x, z) {
  const L = LANDMARKS.moraine;
  const wobble = SX.fbm2(z * 0.004, 3.1, 3) * 40;
  const across = 1 - smoothstep(55, 95, Math.abs(x - L.x - wobble));
  const along = smoothstep(-200, -250, z);
  return across * along;
}

// ---------------------------------------------------------------- The Tumbling Water
// A stream comes down a ravine in the south-eastern wall, leaps a 20 m lip into a small round pool
// (The Speculum), runs swift north-west through a canyon cut in a raised spur, then slows, widens and
// spreads into Corpse-Candle Fen. All of it is carved here in heightAt(); water.js draws the water.
// s is arc length downstream from the pool's centre; d is signed distance across (+ = left bank looking
// downstream). The river is not a WATER disc: use waterLevelAt / waterDepthAt / riverAt.
const POOL = WATER.pool;
const POOL_R = 5;                    // the bowl; WATER.pool.r takes in the beach
const FALL_DROP = 20;
const LIP_Y = POOL.y + FALL_DROP;    // 23.5
const BACK = (() => { const l = Math.hypot(POOL.x, POOL.z); return { x: POOL.x / l, z: POOL.z / l }; })(); // into the wall
const LIP_RP = 10.1;                 // horizontal distance pool centre -> lip
const LIP = { x: POOL.x + BACK.x * LIP_RP, z: POOL.z + BACK.z * LIP_RP, y: LIP_Y };
const IMPACT = { x: POOL.x + BACK.x * 3.0, z: POOL.z + BACK.z * 3.0, y: POOL.y };
const RIVER_CTRL = [[208, 258], [203, 247], [193, 242], [181, 243], [169, 237], [161, 226], [151, 217], [139, 214], [128, 207], [116, 199], [104, 192]];
// the ravine above the lip, upstream order from the lip
const GULLY_CTRL = [[LIP.x, LIP.z], [LIP.x + 5, LIP.z + 7.5], [LIP.x + 9, LIP.z + 16], [LIP.x + 15, LIP.z + 24]];

// piecewise-linear tables over s
function tab(rows) {
  return (s) => {
    if (s <= rows[0][0]) return rows[0][1];
    for (let i = 1; i < rows.length; i++) if (s <= rows[i][0]) { const [s0, v0] = rows[i - 1], [s1, v1] = rows[i]; return v0 + (v1 - v0) * (s - s0) / (s1 - s0); }
    return rows[rows.length - 1][1];
  };
}
const R_W = tab([[0, POOL.y], [5, POOL.y], [12, 3.0], [30, 1.9], [33.5, 1.15], [55, 0.3], [58.5, -0.45], [80, -1.9], [95, -2.45], [400, -2.45]]); // water level
const R_HW = tab([[0, 3.0], [8, 3.2], [30, 3.8], [45, 3.4], [60, 4.0], [80, 6.0], [95, 9.0], [125, 11]]);   // water half-width
const R_D = tab([[0, 1.0], [30, 0.9], [60, 1.0], [90, 1.3], [125, 1.5]]);                                   // bed depth at the thread
const R_RIM = tab([[0, 17], [12, 13], [30, 11], [50, 10], [62, 8], [75, 5], [86, 1.5], [92, 0]]);          // canyon rim above the water
const R_K = tab([[0, 3.0], [60, 2.6], [78, 1.4], [92, 0.4], [125, 0.25]]);                                  // wall steepness (rise per metre)
const R_BANK = tab([[0, 2.6], [60, 3.4], [85, 5.0], [100, 8.0]]);
const GULLY_BED = tab([[0, LIP_Y], [5, LIP_Y + 0.6], [12, LIP_Y + 4], [22, LIP_Y + 12], [33, LIP_Y + 28]]);

function catmull(ctrl, step) {
  const pts = [];
  const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < 16; k++) {
      const t = k / 16, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(ctrl[ctrl.length - 1]);
  // resample by arc length
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const l = Math.hypot(bx - ax, bz - az);
    let rem = l;
    while (acc + rem >= step) {
      const f = (step - acc) / l, last = out[out.length - 1];
      const px = bx - (bx - ax) * (rem - (step - acc)) / l, pz = bz - (bz - az) * (rem - (step - acc)) / l;
      out.push([px, pz]); rem -= step - acc; acc = 0; void f; void last;
    }
    acc += rem;
  }
  if (acc > 0.3) out.push(ctrl[ctrl.length - 1]);
  return makePolyline(out);
}
function makePolyline(pts) {
  const n = pts.length;
  const X = new Float64Array(n), Z = new Float64Array(n), S = new Float64Array(n);
  for (let i = 0; i < n; i++) { X[i] = pts[i][0]; Z[i] = pts[i][1]; if (i) S[i] = S[i - 1] + Math.hypot(X[i] - X[i - 1], Z[i] - Z[i - 1]); }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); z0 = Math.min(z0, Z[i]); z1 = Math.max(z1, Z[i]); }
  return { X, Z, S, n, length: S[n - 1], box: [x0, x1, z0, z1] };
}
const RIVER_LINE = catmull(RIVER_CTRL, 1.5);
const GULLY_LINE = catmull(GULLY_CTRL, 1.0);

// Nearest point on a polyline: writes s, d (signed), tangent, and whether it falls off either end.
function project(line, x, z, pad, out) {
  const [x0, x1, z0, z1] = line.box;
  if (x < x0 - pad || x > x1 + pad || z < z0 - pad || z > z1 + pad) { out.hit = false; return out; }
  const { X, Z, S, n } = line;
  let best = Infinity, bi = 0, bt = 0;
  for (let i = 0; i < n - 1; i++) {
    const ax = X[i], az = Z[i], dx = X[i + 1] - ax, dz = Z[i + 1] - az;
    const l2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - x, ez = az + dz * t - z;
    const e = ex * ex + ez * ez;
    if (e < best) { best = e; bi = i; bt = t; }
  }
  const dx = X[bi + 1] - X[bi], dz = Z[bi + 1] - Z[bi], l = Math.hypot(dx, dz);
  const tx = dx / l, tz = dz / l;
  const px = x - X[bi], pz = z - Z[bi];
  const along = (px * tx + pz * tz);
  out.hit = Math.sqrt(best) < pad;
  out.s = S[bi] + bt * l;
  out.before = bi === 0 && along < 0;
  out.after = bi === n - 2 && along > l;
  // + to the left looking downstream (x east, z south: left of (tx,tz) is (tz,-tx))
  const cross = px * tz - pz * tx;
  out.d = out.before || out.after ? Math.sign(cross || 1) * Math.abs(cross) : Math.sign(cross || 1) * Math.sqrt(best);
  out.tx = tx; out.tz = tz;
  return out;
}

// Bank widths on either side: the walkable side swaps at the bends, both pinch out at two narrows.
function bankWidths(s, out) {
  const base = R_BANK(s);
  const bias = Math.sin(s * 0.055 + 0.8);
  const pinch = 1 - 0.97 * Math.exp(-(((s - 40) / 3.2) ** 2)) - 0.97 * Math.exp(-(((s - 67) / 3.2) ** 2));
  const open = smoothstep(80, 95, s); // the slow reach has broad banks both sides
  out.bl = Math.max(0, base * lerp(0.55 + 0.7 * bias, 1, open) * pinch);
  out.br = Math.max(0, base * lerp(0.55 - 0.7 * bias, 1, open) * pinch);
  return out;
}

// per path sample: the spur's top height and how far out from the thread the canyon wall reaches it
const RIM_TOP = new Float64Array(RIVER_LINE.n), RIM_DW = new Float64Array(RIVER_LINE.n);
for (let i = 0; i < RIVER_LINE.n; i++) {
  const s = RIVER_LINE.S[i], rim = R_RIM(s);
  RIM_TOP[i] = R_W(s) + rim;
  RIM_DW[i] = R_HW(s) + R_BANK(s) + rim / R_K(s);
}
const _rq = { hit: false }, _gq = { hit: false }, _bw = { bl: 0, br: 0 };
const FEN = LANDMARKS.fen;
// The river's cross-section at a point: carved height of the channel (Infinity where nothing is cut)
// and the raised spur the canyon runs through (-Infinity where nothing is raised).
const _cs = { cut: Infinity, raise: -Infinity, s: 0, d: 0, W: 0, hw: 0, bank: 0, inRiver: false, gully: false, shingle: 0, slow: 0 };
function riverSection(x, z, out = _cs) {
  out.cut = Infinity; out.raise = -Infinity; out.inRiver = false; out.gully = false; out.shingle = 0; out.slow = 0;
  const q = project(RIVER_LINE, x, z, 70, _rq);
  if (q.hit && !q.before && !q.after) {
    const s = q.s, d = q.d, dd = Math.abs(d);
    const W = R_W(s), hw = R_HW(s), D = R_D(s), rim = R_RIM(s), k = R_K(s);
    bankWidths(s, _bw);
    const B = (d > 0 ? _bw.bl : _bw.br) + SX.noise2(s * 0.12, d > 0 ? 3.1 : 7.7) * 0.6 * (1 - smoothstep(70, 90, s));
    const Bc = Math.max(0, B);
    const bedN = SX.noise2(x * 0.35, z * 0.35) * 0.18;
    let c;
    if (dd < hw) c = W - 0.1 - D * (1 - (dd / hw) ** 2) + bedN;
    else if (dd < hw + Bc) c = W - 0.1 + (dd - hw) * 0.15 + bedN * 0.5;
    else {
      // the wall: buttresses and gullies along it, and ledges of harder rock across it
      const into = dd - hw - Bc + SX.noise2(x * 0.11, z * 0.11) * 1.3 + SX.noise2(x * 0.37 + 5, z * 0.37) * 0.45;
      c = W - 0.1 + Bc * 0.15 + Math.max(0, into) * k * (1 + SX.noise2(x * 0.09, z * 0.09) * 0.3);
      const above = c - W;
      c += Math.sin(above * 1.3 + SX.noise2(x * 0.05, z * 0.05) * 2) * 0.35 * smoothstep(1, 3, above);
    }
    out.cut = c;
    out.s = s; out.d = d; out.W = W; out.hw = hw; out.bank = hw + Bc;
    out.inRiver = dd < hw + Bc + 0.6;
    out.shingle = (1 - smoothstep(hw + Bc - 0.2, hw + Bc + 0.8, dd)) * (1 - smoothstep(85, 100, s));
    out.slow = smoothstep(70, 92, s) * (1 - smoothstep(hw + Bc, hw + Bc + 4, dd));
    // deep in the fen the fen's own shaping holds
    const mf = smoothstep(52, 66, Math.hypot(x - FEN.x, z - FEN.z));
    if (mf < 1) out.cut += (1 - mf) * 40;
  }
  // the raised spur the canyon cuts through: its top is a distance-weighted blend of the rim heights
  // along the path (not the nearest point's), so the medial lines inside the bends carry no step
  {
    const [bx0, bx1, bz0, bz1] = RIVER_LINE.box;
    if (x > bx0 - 70 && x < bx1 + 70 && z > bz0 - 70 && z < bz1 + 70) {
      const { X, Z, n } = RIVER_LINE;
      let wsum = 0, tsum = 0, dsum = 0, dmin2 = Infinity;
      for (let i = 0; i < n; i++) {
        const e = (x - X[i]) ** 2 + (z - Z[i]) ** 2;
        if (e < dmin2) dmin2 = e;
        const w = Math.exp(-e / 200) + 1e-30;
        wsum += w; tsum += w * RIM_TOP[i]; dsum += w * RIM_DW[i];
      }
      const top = tsum / wsum, dw = dsum / wsum, dmin = Math.sqrt(dmin2);
      out.raise = top + SX.fbm2(x * 0.03 + 9, z * 0.03, 3) * 1.6 - Math.max(0, dmin - dw) * 0.34;
    }
  }
  // the pool's bowl, its beach, and the cirque wall behind it
  const px = x - POOL.x, pz = z - POOL.z, rp = Math.hypot(px, pz);
  if (rp < 60) {
    const back = rp > 1e-3 ? Math.max(0, (px * BACK.x + pz * BACK.z) / rp) : 0;
    const kp = lerp(2.4, 6.0, back);
    let c;
    if (rp < POOL_R) c = POOL.y - 0.1 - 2.4 * Math.pow(1 - (rp / POOL_R) ** 2, 0.6) + SX.noise2(x * 0.5, z * 0.5) * 0.08;
    else if (rp < 6.8) c = POOL.y - 0.1 + (rp - POOL_R) * 0.2;
    else c = POOL.y + 0.26 + (rp - 6.8) * kp * (1 + SX.noise2(x * 0.12, z * 0.12) * 0.2);
    out.cut = Math.min(out.cut, c);
    // the canyon's mouth faces downstream (toward the first bend), so the cirque stands lower there
    const fx = RIVER_CTRL[1][0] - POOL.x, fz = RIVER_CTRL[1][1] - POOL.z, fl = Math.hypot(fx, fz);
    const front = rp > 1e-3 ? Math.max(0, (px * fx + pz * fz) / (rp * fl)) : 0;
    const top = LIP_Y + 3.5 + SX.fbm2(x * 0.05, z * 0.05 + 4, 3) * 2.5 - front * 9;
    out.raise = Math.max(out.raise, top - Math.max(0, rp - 14) * 0.8);
    if (rp < 6.8) out.shingle = Math.max(out.shingle, 1);
  }
  // the ravine above the lip
  const g = project(GULLY_LINE, x, z, 30, _gq);
  if (g.hit && !g.before && !g.after) {
    const dd = Math.abs(g.d), bed = GULLY_BED(g.s);
    const c = dd < 1.7 ? bed - 0.55 * (1 - (dd / 1.7) ** 2) : bed + (dd - 1.7) * 1.9 * (1 + SX.noise2(x * 0.15, z * 0.15) * 0.25);
    out.cut = Math.min(out.cut, c);
    if (dd < 2.2) { out.gully = true; out.gs = g.s; }
  }
  return out;
}

function carveRiver(h, x, z) {
  const r = riverSection(x, z);
  if (r.raise > h) {
    // soft max so the spur's toe meets the moor without a crease
    const k = 1.5, dh = r.raise - h;
    h = dh > k ? r.raise : h + (dh + k) * (dh + k) / (4 * k);
  }
  if (r.cut < h) h = r.cut;
  h = carveEddy(h, x, z); // v2 riverlife: the eddy basin (hook)
  return h;
}

// --- v2 riverlife: the eddy basin (begin)
// The Wrong Colour's basin: a still bowl 4 m across scooped into the bank beside LANDMARKS.eddy, on the side
// the landmark lies, open to the channel along its river edge so the river feeds it but does not run through
// it. Its water stands at the river's level there; waterLevelAt, waterDepthAt and riverAt report it as water.
const EDDY = (() => {
  const E = LANDMARKS.eddy, q = project(RIVER_LINE, E.x, E.z, 40, { hit: false });
  const side = Math.sign(q.d) || 1, d = side * (R_HW(q.s) + 1.6); // centre 1.6 m into the bank
  // (ox, oz): from the basin's centre toward the channel; the bowl is drawn out that way into a mouth
  return { x: E.x + q.tz * (d - q.d), z: E.z - q.tx * (d - q.d), y: R_W(q.s), r: 2.0, depth: 1.3, s: q.s, ox: -q.tz * side, oz: q.tx * side };
})();
function eddyR(x, z) { return Math.hypot(x - EDDY.x, z - EDDY.z); }
function carveEddy(h, x, z) {
  const dx = x - EDDY.x, dz = z - EDDY.z;
  if (dx * dx + dz * dz > 81) return h;
  const along = dx * EDDY.ox + dz * EDDY.oz, across = dx * EDDY.oz - dz * EDDY.ox;
  const R = EDDY.r, r = Math.hypot(along > 0 ? along * 0.6 : along, across) + SX.noise2(x * 0.7, z * 0.7) * 0.18;
  // the bowl, then a narrow wet shelf, then the cut face of the bank climbing back into the wall
  const bowl = EDDY.y - 0.1 - EDDY.depth * Math.pow(Math.max(0, 1 - (r / R) ** 2), 0.7);
  const rim = EDDY.y - 0.1 + smoothstep(R, R + 0.8, r) * 0.3 + Math.max(0, r - R - 0.8) * 2.4;
  return Math.min(h, r < R ? bowl : rim);
}
function inEddy(x, z) { return eddyR(x, z) < EDDY.r; }
// --- v2 riverlife: the eddy basin (end)

// Water level of the river or the ravine at a point (null when off it).
function riverLevelAt(x, z) {
  if (inEddy(x, z)) return EDDY.y; // v2 riverlife: the eddy basin (hook)
  const r = riverSection(x, z, _cs2);
  if (r.gully) return GULLY_BED(r.gs) + 0.25;
  if (r.inRiver && !(Math.hypot(x - POOL.x, z - POOL.z) < 6.8)) return r.W;
  return null;
}
const _cs2 = { ..._cs }, _csb = { ..._cs };

// Downstream info at a point: arc length, cross distance, level, half-width, flow speed and direction.
const _ri = { s: 0, d: 0, y: 0, hw: 0, speed: 0, tx: 0, tz: 0, inWater: false };
export function riverAt(x, z, out = _ri) {
  const q = project(RIVER_LINE, x, z, 40, { hit: false });
  if (!q.hit || q.before || q.after) return null;
  out.s = q.s; out.d = q.d; out.y = R_W(q.s); out.hw = R_HW(q.s); out.tx = q.tx; out.tz = q.tz;
  out.speed = riverSpeed(q.s);
  out.inWater = Math.abs(q.d) < out.hw;
  if (inEddy(x, z)) { out.y = EDDY.y; out.speed = 0; out.inWater = true; } // v2 riverlife: the eddy basin (hook)
  return out;
}
export function riverSpeed(s) {
  const g = (R_W(s - 1.5) - R_W(s + 1.5)) / 3; // water-surface gradient
  return clamp(0.25 + g * 42, 0.2, 4.2) * (s < 4 ? 0.15 : 1);
}

// Everything water.js needs to lay the river out.
export const RIVER = {
  line: RIVER_LINE, gully: GULLY_LINE, pool: POOL, poolR: POOL_R, lip: LIP, lipR: LIP_RP, impact: IMPACT, back: BACK, fallDrop: FALL_DROP,
  levelAt: R_W, speedAt: riverSpeed, halfWidthAt: R_HW, rimAt: R_RIM, gullyLevelAt: (u) => GULLY_BED(u) + 0.25, bankWidths: (s) => bankWidths(s, { bl: 0, br: 0 }),
  section: (x, z) => ({ ...riverSection(x, z, { ..._cs }) }),
  eddy: EDDY, // v2 riverlife: the eddy basin (hook)
  fenEnter: 95,
};

export function heightAt(x, z) {
  // Rolling moorland
  let h = SX.fbm2(x * 0.0035, z * 0.0035, 5) * 11;
  h += SX.fbm2(x * 0.012 + 5, z * 0.012 - 3, 4) * 3.2;
  h += SX.noise2(x * 0.06, z * 0.06) * 0.35;
  // Gentle rise toward the north-east so the castle sees the region laid out below
  h += (z * -0.012) + (x * 0.006);

  // Landmark shaping
  const L = LANDMARKS;
  // Castle hill: flat crown, steep-ish sides
  h = flatten(h, x, z, L.castle.x, L.castle.z, 40, 55, L.castle.y + SX.noise2(x * 0.05, z * 0.05) * 0.4);
  // Tower hill
  h = flatten(h, x, z, L.tower.x, L.tower.z, 18, 48, L.tower.y + SX.noise2(x * 0.07, z * 0.07) * 0.5);
  // Stones shelf
  h = flatten(h, x, z, L.stones.x, L.stones.z, 30, 28, L.stones.y + SX.noise2(x * 0.08, z * 0.08) * 0.25);
  // Sunken court
  h = flatten(h, x, z, L.court.x, L.court.z, 34, 26, L.court.y + SX.noise2(x * 0.1, z * 0.1) * 0.2);
  // Tarn basin: flatten then dish
  {
    // A shelving shore: the floor crosses the water level (-4.6) at about r 58, then deepens to -12.5
    const d = Math.hypot(x - L.tarn.x, z - L.tarn.z);
    h = flatten(h, x, z, L.tarn.x, L.tarn.z, 62, 34, -4.0 + SX.noise2(x * 0.05, z * 0.05) * 0.25);
    const bowl = 1 - smoothstep(36, 60, d);
    h -= bowl * 8.5 + SX.noise2(x * 0.03, z * 0.03) * 0.5 * (1 - smoothstep(40, 70, d));
  }
  // Fen: broad, flat, pocked with pools
  {
    const d = Math.hypot(x - L.fen.x, z - L.fen.z);
    h = flatten(h, x, z, L.fen.x, L.fen.z, 70, 45, L.fen.y);
    const inFen = 1 - smoothstep(60, 85, d);
    const pools = SX.warped2(x * 0.03 + 11, z * 0.03 - 7, 4, 0.9);
    h -= inFen * (smoothstep(0.05, 0.45, pools) * 2.2 + 0.3);
  }
  // Orchard terraces: faint steps
  {
    const d = Math.hypot(x - L.orchard.x, z - L.orchard.z);
    const m = 1 - smoothstep(40, 65, d);
    const terraced = Math.floor((h + 100) / 1.2) * 1.2 - 100;
    h = lerp(h, terraced, m * 0.7);
  }
  // Causeway: a raised, level-ish bed
  {
    const cd = causewayDistance(x, z);
    const m = 1 - smoothstep(3.2, 7.5, cd);
    if (m > 0) {
      // level across the road by sampling base height at the nearest road axis is expensive; approximate with a mild lift
      h = lerp(h, h + 0.35 - SX.noise2(x * 0.02, z * 0.02) * 0.1, m);
    }
  }

  // --- v4 systems: the mountains (BI) (begin). The walls are src/v4/mountains.js: layered ranges, buttresses,
  // talus, bedding ledges, named peaks, the sun's saddle with its walkable wedge and AM's seats. The glacier's
  // notch cuts through them as before.
  const r = Math.hypot(x, z);
  const ramp = smoothstep(WORLD.regionRadius - 10, WORLD.mountainRadius, r);
  if (r > M_START) {
    const g = glacierMask(x, z);
    const glacierH = g > 0 ? ramp * ramp * 60 + ramp * 20 + SX.fbm2(x * 0.02, z * 0.02, 3) * 2.5 * ramp : 0;
    h = applyMountains(h, x, z, r, g, glacierH);
  }
  // --- v4 systems: the mountains (end)
  // Glacier tongue below the ramp too: ice spills a little way onto the moor
  {
    const g = glacierMask(x, z) * smoothstep(-215, -265, z) * (1 - ramp);
    h = lerp(h, h + 2.5 + SX.fbm2(x * 0.03, z * 0.03, 3) * 1.2, g);
  }
  return carveRiver(h, x, z);
}

// Analytic-ish normal by central differences.
const _n = new THREE.Vector3();
export function normalAt(x, z, out = _n, eps = 0.6) {
  const hl = heightAt(x - eps, z), hr = heightAt(x + eps, z);
  const hd = heightAt(x, z - eps), hu = heightAt(x, z + eps);
  out.set(hl - hr, 2 * eps, hd - hu).normalize();
  return out;
}
export function slopeAt(x, z) {
  const n = normalAt(x, z, new THREE.Vector3());
  return Math.acos(clamp(n.y, -1, 1)); // radians from vertical
}

// Biome weights at a point. Not normalised; each is 0..1.
export function biomeAt(x, z) {
  const L = LANDMARKS;
  const h = heightAt(x, z);
  const slope = slopeAt(x, z);
  const r = Math.hypot(x, z);
  const rock = smoothstep(0.55, 0.95, slope) + smoothstep(WORLD.regionRadius, WORLD.regionRadius + 60, r) * 0.6;
  const ice = glacierMask(x, z) * smoothstep(-200, -240, z);
  const dWood = Math.hypot(x - L.wood.x, z - L.wood.z);
  const wood = (1 - smoothstep(L.wood.r - 25, L.wood.r + 15, dWood)) * (0.6 + 0.4 * SX.warped2(x * 0.02, z * 0.02, 3));
  const dFen = Math.hypot(x - L.fen.x, z - L.fen.z);
  const marsh = 1 - smoothstep(L.fen.r - 15, L.fen.r + 25, dFen);
  const dTarn = Math.hypot(x - L.tarn.x, z - L.tarn.z);
  const shore = (1 - smoothstep(58, 72, dTarn)) * smoothstep(50, 58, dTarn) + (marsh * smoothstep(-2.6, -2.2, h) * (1 - smoothstep(-1.8, -1.2, h)));
  const dOrch = Math.hypot(x - L.orchard.x, z - L.orchard.z);
  const orchard = 1 - smoothstep(L.orchard.r - 10, L.orchard.r + 10, dOrch);
  const dMor = Math.hypot(x - L.moraine.x, z - L.moraine.z);
  const crystal = (1 - smoothstep(40, 110, dMor)) * (0.5 + 0.5 * SX.warped2(x * 0.03 + 4, z * 0.03, 3));
  const heath = smoothstep(-0.2, 0.5, SX.warped2(x * 0.008 + 20, z * 0.008 + 9, 4));
  // the river: bare shingle along the canyon floor, a reedy margin where it slows toward the fen
  const rv = riverSection(x, z, _csb);
  const rockR = clamp(rock + rv.shingle * 0.75, 0, 1.6);
  const shoreR = shore + rv.slow * (1 - smoothstep(0.2, 1.5, h - rv.W)) * 0.8;
  const moor = clamp(1 - rockR - ice - marsh - wood * 0.5, 0, 1);
  return { moor, heath, wood, marsh, shore: shoreR, rock: rockR, ice, orchard, crystal, slope, h };
}

// Water height at a point, or null when there is no water body here.
const WATER_DISCS = Object.values(WATER);
export function waterLevelAt(x, z) {
  for (const w of WATER_DISCS) {
    if (Math.hypot(x - w.x, z - w.z) < w.r) return w.y;
  }
  return riverLevelAt(x, z);
}
// Water level minus ground: > 0 under water, -Infinity off every water body (discs, river, ravine).
export function waterDepthAt(x, z, ground = null) {
  const w = waterLevelAt(x, z);
  return w === null ? -Infinity : w - (ground ?? heightAt(x, z));
}
export function isUnderwater(x, z) {
  const w = waterLevelAt(x, z);
  return w !== null && heightAt(x, z) < w;
}

// A small procedural detail texture: periodic value-noise fbm so it tiles with no seam or banding.
function makeDetailTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry32(991);
  const lat = new Float32Array(64 * 64);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const pv = (x, y, period) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const idx = (xx, yy) => lat[((yy * 7 + xx * 13) % 4096 + 4096) % 4096];
    const a = idx(x0, y0), b = idx(x1, y0), c = idx(x0, y1), d = idx(x1, y1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const fbm = (u, v, base, oct) => {
    let sum = 0, amp = 0.5, norm = 0, per = base;
    for (let o = 0; o < oct; o++) { sum += amp * pv(u * per, v * per, per); norm += amp; amp *= 0.5; per *= 2; }
    return sum / norm;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const f = fbm(u, v, 4, 5);
    const g = fbm(u + 0.37, v + 0.11, 8, 4);
    const h = fbm(u + 0.71, v + 0.53, 16, 3);
    const i = (y * size + x) * 4;
    data[i] = f * 255; data[i + 1] = g * 255; data[i + 2] = h * 255; data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

const C = (hex) => new THREE.Color(hex);

export function buildTerrain(ctx) {
  const { scene } = ctx;
  const size = WORLD.size, segs = ctx.quality === 'low' ? 320 : 480;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const iceArr = new Float32Array(pos.count);
  const wetArr = new Float32Array(pos.count);
  const rsec = { ..._cs };
  const cShingle = C('#48443e'), cPale = C('#8a8274'), cSilt = C('#2c2a24');
  const col = new THREE.Color();
  // Ground reads olive, peat and moss under the red sun, not rust dust: the dry grass is dun-olive, not tan,
  // and the mountain rock is cool slate so the haze can layer the ridges against each other.
  const cMoor = C('#4a5329'), cDry = C('#6b6a3c'), cHeath = C(PALETTE.heather), cMud = C(PALETTE.mud);
  const cRock = C('#3c3838'), cRockD = C('#1f1c20'), cScree = C('#4a4644'), cIce = C(PALETTE.ice);
  const cWood = C('#2a3220'), cShore = C('#3a3832'), cOrch = C('#544a2c'), cCrys = C('#56727e'), cRoad = C('#5e5650'), cPeat = C('#1c1a16'), cMoss = C('#38542c');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const b = biomeAt(x, z);
    // base: moor grass to dry grass by noise, heather patches
    const dry = SX.warped2(x * 0.01 + 3, z * 0.01 + 1, 3) * 0.5 + 0.5;
    col.copy(cMoor).lerp(cDry, dry);
    col.lerp(cHeath, b.heath * 0.55 * b.moor);
    // peat hags and moss cushions break up the moor
    const peat = smoothstep(0.35, 0.6, SX.warped2(x * 0.02 + 70, z * 0.02 + 33, 3));
    col.lerp(cPeat, peat * 0.7 * b.moor);
    const moss = smoothstep(0.3, 0.55, SX.warped2(x * 0.05 - 40, z * 0.05 + 12, 3)) * smoothstep(2, -2, y);
    col.lerp(cMoss, moss * 0.5);
    col.lerp(cWood, b.wood * 0.8);
    col.lerp(cOrch, b.orchard * 0.5);
    col.lerp(cMud, b.marsh * 0.85);
    col.lerp(cShore, b.shore * 0.8);
    col.lerp(cCrys, b.crystal * 0.5);
    // slope → rock; height → scree then dark rock
    const rockMix = clamp(b.rock, 0, 1);
    tmp.copy(cScree).lerp(cRock, smoothstep(10, 60, y)).lerp(cRockD, smoothstep(60, 160, y));
    col.lerp(tmp, rockMix);
    // ice lies on the glacier floor, not plastered up the notch's cliff walls
    const ice = b.ice * (1 - smoothstep(0.35, 0.75, b.slope));
    col.lerp(cIce, ice);
    iceArr[i] = ice;
    // the river: shingle banks and bed, pale stones in the pool, a wet band along the water and spray-soaked
    // rock round the fall
    {
      const r = riverSection(x, z, rsec);
      let wet = 0;
      if (r.cut < Infinity || r.gully) {
        const prp = Math.hypot(x - POOL.x, z - POOL.z);
        const lvl = r.gully ? GULLY_BED(r.gs) + 0.25 : prp < 8 ? POOL.y : r.W;
        const above = y - lvl;
        const near = r.gully ? 1 : prp < 9 ? 1 : 1 - smoothstep(r.bank + 1, r.bank + 4, Math.abs(r.d));
        wet = (1 - smoothstep(0.05, 1.3 + SX.noise2(x * 0.3, z * 0.3) * 0.5, above)) * near;
        const sh = r.shingle * (1 - smoothstep(0.6, 0.95, b.slope));
        col.lerp(cShingle, sh * 0.85);
        col.lerp(cSilt, r.slow * 0.5);
        if (prp < POOL_R + 0.6) col.lerp(cPale, (1 - smoothstep(POOL_R - 1.5, POOL_R + 0.6, prp)) * (0.6 + 0.4 * SX.noise2(x * 1.3, z * 1.3)));
      }
      // spray from the fall soaks the cirque walls
      const spray = 1 - smoothstep(5, 19, Math.hypot(x - IMPACT.x, z - IMPACT.z, (y - POOL.y) * 0.5));
      wetArr[i] = Math.max(wet, spray);
    }
    // causeway paving colour
    const cd = causewayDistance(x, z);
    col.lerp(cRoad, 1 - smoothstep(2.6, 4.2, cd));
    // a little per-vertex variation so the moor isn't flat
    const v = SX.noise2(x * 0.11, z * 0.11) * 0.06;
    col.r = clamp(col.r + v, 0, 1); col.g = clamp(col.g + v, 0, 1); col.b = clamp(col.b + v, 0, 1);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  // Crevices and ridges on the mountains: grid curvature darkens gullies and lifts crests, so the wall
  // reads as folded rock from a distance instead of a smooth dune.
  {
    const n = segs + 1, cell = size / segs;
    for (let j = 1; j < segs; j++) for (let i = 1; i < segs; i++) {
      const k = j * n + i;
      const x = pos.getX(k), z = pos.getZ(k);
      const r = Math.hypot(x, z);
      const m = smoothstep(WORLD.regionRadius - 20, WORLD.regionRadius + 40, r) * (1 - iceArr[k]);
      if (m <= 0) continue;
      const lap = (pos.getY(k - 1) + pos.getY(k + 1) + pos.getY(k - n) + pos.getY(k + n) - 4 * pos.getY(k)) / (cell * cell);
      // lap > 0: concave (gully), < 0: convex (crest)
      const crev = clamp(lap * 1.6, -0.6, 1);
      const f = crev > 0 ? 1 - 0.72 * crev * m : 1 - crev * 0.45 * m;
      colors[k * 3] *= f; colors[k * 3 + 1] *= f; colors[k * 3 + 2] *= f;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aIce', new THREE.BufferAttribute(iceArr, 1));
  geo.setAttribute('aWet', new THREE.BufferAttribute(wetArr, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const detail = makeDetailTexture();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aIce; attribute float aWet; varying vec3 vTPos; varying vec3 vTNormal; varying float vIce; varying float vWet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTPos = (modelMatrix * vec4(position,1.0)).xyz; vTNormal = normalize(mat3(modelMatrix) * normal); vIce = aIce; vWet = aWet;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uDetail; varying vec3 vTPos; varying vec3 vTNormal; varying float vIce; varying float vWet;
        vec3 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
          vec3 w = abs(n); w = pow(w, vec3(4.0)); w /= (w.x + w.y + w.z);
          return texture2D(t, p.yz * s).rgb * w.x + texture2D(t, p.xz * s).rgb * w.y + texture2D(t, p.xy * s).rgb * w.z;
        }
        float fpHeight(vec3 p, vec3 n) {
          vec3 a = triplanar(uDetail, p, n, 0.3);
          vec3 b = triplanar(uDetail, p, n, 1.6);
          return a.r * 0.3 + b.g * 0.6 + a.b * 0.2;
        }
        // Perturb the world-space normal from the detail height so grazing light picks out the ground
        vec3 fpBumpWorld(vec3 p, vec3 n, float strength) {
          float e = 0.12;
          float h0 = fpHeight(p, n);
          vec3 g = vec3(fpHeight(p + vec3(e, 0.0, 0.0), n) - h0, fpHeight(p + vec3(0.0, e, 0.0), n) - h0, fpHeight(p + vec3(0.0, 0.0, e), n) - h0) / e;
          g -= n * dot(g, n);
          return normalize(n - g * strength);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 d1 = triplanar(uDetail, vTPos, vTNormal, 0.35);
          vec3 d2 = triplanar(uDetail, vTPos, vTNormal, 0.045);
          vec3 d3 = triplanar(uDetail, vTPos, vTNormal, 2.1);
          float grain = (d1.r - 0.5) * 0.55 + (d2.g - 0.5) * 0.4 + (d3.b - 0.4) * 0.25;
          // bare earth patches where the detail noise is low on flat ground
          float bare = smoothstep(0.62, 0.78, d2.r) * smoothstep(0.6, 0.9, vTNormal.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.64, 0.56), bare * 0.6);
          // rock faces get stratified streaks
          float rocky = smoothstep(0.75, 0.45, vTNormal.y);
          // strata bands alias into streaks at distance, so fade them out past 80 m
          float strataFade = 1.0 - smoothstep(60.0, 160.0, length(vTPos - cameraPosition));
          // sheer faces (cliffs, canyon walls) show their bedding harder
          float sheer = smoothstep(0.5, 0.15, vTNormal.y);
          float strata = (sin(vTPos.y * 1.7 + d2.r * 4.0) * 0.5 + 0.5) * (0.12 + 0.2 * sheer) * rocky * strataFade
                       + smoothstep(0.42, 0.5, abs(fract(vTPos.y * 0.55 + d1.g * 0.8) - 0.5)) * 0.25 * sheer * strataFade;
          diffuseColor.rgb *= 1.0 + grain - strata;
          // far strata: broad bedding planes on the mountain walls, anti-aliased by their own screen
          // derivative so they fade instead of shimmering, plus darker bands of harder rock
          float camDist = length(vTPos - cameraPosition);
          float mtn = smoothstep(280.0, 340.0, length(vTPos.xz)) * (1.0 - vIce);
          float sy = vTPos.y * 0.14 + d2.r * 2.5 + vTPos.x * 0.01;
          float aa = clamp(fwidth(sy) * 1.5, 0.0, 1.0);
          float bed = (smoothstep(0.35, 0.5, abs(fract(sy) - 0.5)) - 0.5) * (1.0 - aa);
          float hard = smoothstep(0.55, 0.75, sin(vTPos.y * 0.035 + d2.g * 3.0) * 0.5 + 0.5);
          diffuseColor.rgb *= 1.0 - mtn * (bed * 0.4 + hard * 0.4 * rocky);
          // snow and rime on the high ground, holding on ledges and shadowed north-facing faces
          float snowH = smoothstep(90.0, 160.0, vTPos.y + (d2.r - 0.5) * 50.0);
          float holds = smoothstep(0.42, 0.7, vTNormal.y + max(-vTNormal.z, 0.0) * 0.35);
          float snow = snowH * holds * mtn * smoothstep(0.35, 0.55, d1.g + 0.2 * snowH);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.58, 0.6, 0.68) * (0.85 + 0.15 * d3.b), snow * 0.85);
          // dampness darkens low ground
          float wet = max(smoothstep(-1.0, -3.2, vTPos.y), vWet * (0.75 + 0.5 * d1.g));
          diffuseColor.rgb *= 1.0 - clamp(wet, 0.0, 1.0) * 0.38;
          // glacier ice: pale, faintly blue from within, with dark crevasse lines
          float crev = smoothstep(0.48, 0.5, abs(fract(vTPos.x * 0.07 + d2.r * 3.0 + vTPos.z * 0.015) - 0.5));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.4, 0.46, 0.55) * (0.7 + 0.3 * d1.g) * (1.0 - crev * 0.7), vIce * 0.9);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.6, smoothstep(-1.0, -3.2, vTPos.y));
        roughnessFactor = mix(roughnessFactor, 0.38, clamp(vWet, 0.0, 1.0));
        roughnessFactor = mix(roughnessFactor, 0.45, vIce);`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          float camD = length(vTPos - cameraPosition);
          float bumpStrength = 0.07 * (1.0 - smoothstep(10.0, 60.0, camD));
          vec3 nW = fpBumpWorld(vTPos, normalize(vTNormal), bumpStrength);
          normal = normalize(mat3(viewMatrix) * nW);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.02, 0.04, 0.07) * vIce;`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'terrain';
  scene.add(mesh);

  return {
    mesh, heightAt, normalAt, slopeAt, biomeAt, waterLevelAt, waterDepthAt, isUnderwater, causewayDistance, glacierMask,
    riverAt, river: RIVER,
    size, regionRadius: WORLD.regionRadius,
  };
}
