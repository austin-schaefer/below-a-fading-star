// The heightfield (v13 L2; terrain.js holds the bake, the material and the shaders): heightAt and what
// it is made of (the moor, the landmarks' shaping, the tarn, the fen, the orchard, the causeway, the regions' hooks, the
// walls, the glacier, the Tumbling Water and its ravine, the Span's blocks, the map's pit and fall), slopeAt, normalAt,
// biomeAt, the water and the river. Pure: no three, no page globals, so a worker can import it (src/height/params.js
// carries the URL's switches). terrain.js re-exports all of it; import from there unless you are in a worker.
// Everything here is checked bit for bit by tools/height-check.mjs.
import { makeSimplex, clamp, lerp, smoothstep } from '../noise.js';
import { tarnHeight, tarnWet } from '../v4/tarn.js'; // v4 regions: Lees Tarn's south bay and spit
import { WORLD, LANDMARKS, WATER, CAUSEWAY_V4 } from '../world.js';
import { mapHeight } from '../v4/paths/ground.js'; // v4 map: the pit, the taller fall's face, the runnels' cuts
import { applyMountains, M_START } from '../v4/mountains.js'; // v4 systems: the walls
import { regionsHeight, regionsCoarse } from './regions.js'; // v4 systems: the regions' hooks
import { lappetGround } from '../v15/plan.js'; // v15: the Lappet's crown and foot
import { spanGround } from '../v4/span/plan.js'; // v4: the Great Span's marked blocks
import { glacierTongue, glacierIce, glacierBedH, glacierCarve } from '../v4/glacier.js'; // v4 regions: the glacier rebuilt

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
// v4 map: the road is CAUSEWAY_V4 (the saddle to the pit); each segment's box skips the far ones
const ROAD = CAUSEWAY_V4.slice(1).map((b, i) => { const a = CAUSEWAY_V4[i]; return [a.x, a.z, b.x, b.z, Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.z, b.z), Math.max(a.z, b.z)]; });
export function causewayDistance(x, z) {
  let d = Infinity;
  for (const [ax, az, bx, bz, x0, x1, z0, z1] of ROAD) {
    const ex = x < x0 ? x0 - x : x > x1 ? x - x1 : 0, ez = z < z0 ? z0 - z : z > z1 ? z - z1 : 0;
    if (ex * ex + ez * ez >= d * d) continue;
    d = Math.min(d, distToSegment(x, z, ax, az, bx, bz));
  }
  return d;
}
// causewayDistance where that is under lim: the same number; elsewhere lim. A segment whose box is lim or
// more away is never measured, so far from the road this is a few box tests (heightAt's road bed reads under 7.5).
function causewayNear(x, z, lim) {
  let d = lim;
  for (let i = 0; i < ROAD.length; i++) {
    const S = ROAD[i], x0 = S[4], x1 = S[5], z0 = S[6], z1 = S[7];
    const ex = x < x0 ? x0 - x : x > x1 ? x - x1 : 0, ez = z < z0 ? z0 - z : z > z1 ? z - z1 : 0;
    if (ex * ex + ez * ez >= d * d) continue;
    d = Math.min(d, distToSegment(x, z, S[0], S[1], S[2], S[3]));
  }
  return d;
}

// Flatten toward a target height inside r, blending out over `fall` metres.
function flatten(h, x, z, cx, cz, r, fall, target) {
  const d = Math.hypot(x - cx, z - cz);
  const m = 1 - smoothstep(r, r + fall, d);
  return lerp(h, target, m);
}
// Whether (x, z) lies certainly beyond reach R of (cx, cz), and h is not ±0: there a block whose every term is
// weighted by smoothsteps that are 0 past R leaves h exactly as it was (h + 0 is h for any h but -0), so heightAt
// skips its noise. The squared test keeps a margin, so a point the hypot would put within R is never skipped.
const beyond = (h, x, z, cx, cz, R) => { const dx = x - cx, dz = z - cz; return dx * dx + dz * dz > R * R * 1.0001 + 1 && h !== 0; };

// Glacier channel mask: a notch in the northern mountain wall, 0..1
export function glacierMask(x, z) {
  const L = LANDMARKS.moraine;
  if (z >= -200) return 0; // along is 0 (v13 L2)
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
const FALL_DROP = 50;                // v4 map: 2.5 times taller (was 20); the face is raised in v4/paths/ground.js
const LIP_Y = POOL.y + FALL_DROP;    // 53.5
const CIRQUE_Y = POOL.y + 20;        // v4 map: the cirque round the pool keeps its old height outside the slot
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
    const top = CIRQUE_Y + 3.5 + SX.fbm2(x * 0.05, z * 0.05 + 4, 3) * 2.5 - front * 9;
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
  // (each block is skipped where it is certainly out of reach: beyond(), above)
  // Castle hill: flat crown, steep-ish sides
  if (!beyond(h, x, z, L.castle.x, L.castle.z, 95)) h = flatten(h, x, z, L.castle.x, L.castle.z, 40, 55, L.castle.y + SX.noise2(x * 0.05, z * 0.05) * 0.4);
  // Tower hill
  if (!beyond(h, x, z, L.tower.x, L.tower.z, 66)) h = flatten(h, x, z, L.tower.x, L.tower.z, 18, 48, L.tower.y + SX.noise2(x * 0.07, z * 0.07) * 0.5);
  // Stones shelf
  if (!beyond(h, x, z, L.stones.x, L.stones.z, 58)) h = flatten(h, x, z, L.stones.x, L.stones.z, 30, 28, L.stones.y + SX.noise2(x * 0.08, z * 0.08) * 0.25);
  // Sunken court
  if (!beyond(h, x, z, L.court.x, L.court.z, 60)) h = flatten(h, x, z, L.court.x, L.court.z, 34, 26, L.court.y + SX.noise2(x * 0.1, z * 0.1) * 0.2);
  // Tarn basin: flatten then dish
  if (!beyond(h, x, z, L.tarn.x, L.tarn.z, 96)) {
    // A shelving shore: the floor crosses the water level (-4.6) at about r 58, then deepens to -12.5
    const d = Math.hypot(x - L.tarn.x, z - L.tarn.z);
    h = flatten(h, x, z, L.tarn.x, L.tarn.z, 62, 34, -4.0 + SX.noise2(x * 0.05, z * 0.05) * 0.25);
    const bowl = 1 - smoothstep(36, 60, d);
    h -= bowl * 8.5 + SX.noise2(x * 0.03, z * 0.03) * 0.5 * (1 - smoothstep(40, 70, d));
  }
  h = tarnHeight(h, x, z); // v4 regions: the south bay and the shingle spit (src/v4/tarn.js)
  // Fen: broad, flat, pocked with pools
  if (!beyond(h, x, z, L.fen.x, L.fen.z, 115)) {
    const d = Math.hypot(x - L.fen.x, z - L.fen.z);
    h = flatten(h, x, z, L.fen.x, L.fen.z, 70, 45, L.fen.y);
    const inFen = 1 - smoothstep(60, 85, d);
    if (inFen !== 0 || h === 0) {
      const pools = SX.warped2(x * 0.03 + 11, z * 0.03 - 7, 4, 0.9);
      h -= inFen * (smoothstep(0.05, 0.45, pools) * 2.2 + 0.3);
    }
  }
  // Orchard terraces: faint steps, soft ones. Every 1.2 m of the moor's rise lies flatter (a tread) then steeper (a
  // bank): a wave of 0.3 of the rise, continuous, so the walker's feet follow the drawn ground (v15-W5: a floor() here
  // stood a 0.84 m cliff in heightAt every 1.2 m of rise that the 2-3 m mesh drew as a slope, and the walker jumped it
  // in one frame: the owner's "teleport up and down" in the dip by the Pomegranate House's gate). A deeper wave bends
  // the ground more than the mesh's triangles follow (0.3: within 0.15 m of heightAt on medium's 2.1 m cells; the
  // ground's own relief already misses by 0.2 on low's 3.1 m). The 0.42 m keeps the old mean lowering, so what stands
  // on it by a fixed y stays put.
  if (!beyond(h, x, z, L.orchard.x, L.orchard.z, 65)) {
    const d = Math.hypot(x - L.orchard.x, z - L.orchard.z);
    const m = 1 - smoothstep(40, 65, d);
    const u = (h + 100) / 1.2;
    h -= m * (0.42 + 0.3 * 1.2 * Math.sin(2 * Math.PI * u) / (2 * Math.PI));
  }
  // Causeway: a raised, level-ish bed
  {
    const cd = causewayNear(x, z, 8); // the exact distance where it is under 7.5 (all the bed reads), else 8 or more
    const m = 1 - smoothstep(3.2, 7.5, cd);
    if (m > 0) {
      // level across the road by sampling base height at the nearest road axis is expensive; approximate with a mild lift
      h = lerp(h, h + 0.35 - SX.noise2(x * 0.02, z * 0.02) * 0.1, m);
    }
  }

  // --- v4 systems: the regions' heightfield hooks (one line; each region's block is its own module's height())
  h = regionsHeight(h, x, z);
  h = lappetGround(h, x, z, regionsCoarse()); // v15: the Lappet's crown and foot, where they lie outside the Demesne's reach (src/v15/plan.js)
  // --- v4 systems: the mountains (BI) (begin). The walls are src/v4/mountains.js: the massifs, their couloirs,
  // ribs and fans, named peaks, the sun's saddle with its walkable wedge and AM's seats. The glacier's
  // notch cuts through them as before.
  const r = Math.hypot(x, z);
  const ramp = smoothstep(WORLD.regionRadius - 10, WORLD.mountainRadius, r);
  if (r > M_START) {
    const g = glacierMask(x, z);
    const glacierH = g > 0 ? glacierBedH(x, z, h, ramp, ramp * ramp * 60 + ramp * 20 + SX.fbm2(x * 0.02, z * 0.02, 3) * 2.5 * ramp) : 0; // v12-H2: the icefall (src/v12/icefall/plan.js)
    h = applyMountains(h, x, z, r, g, glacierH);
  }
  // --- v4 systems: the mountains (end)
  // Glacier tongue below the ramp too: its snout on the moor (v4 regions: src/v4/glacier.js); v12-H2: the slot and the stair carved
  h = glacierCarve(x, z, glacierTongue(h, x, z, ramp));
  return mapHeight(spanGround(carveRiver(h, x, z), x, z), x, z, RIVER); // v4: the Great Span's marked blocks (src/v4/span/plan.js), then the map's pit and the fall's face
}

// Analytic-ish normal by central differences. The arithmetic is three's Vector3 set().normalize() written out (x, y, z
// times 1 / (length || 1)), so out may be any { x, y, z } (terrain.js's normalAt defaults it to a Vector3); slopeAt
// takes the same y without an object.
const _n = { x: 0, y: 1, z: 0 };
export function normalAt(x, z, out = _n, eps = 0.6) {
  const hl = heightAt(x - eps, z), hr = heightAt(x + eps, z);
  const hd = heightAt(x, z - eps), hu = heightAt(x, z + eps);
  const nx = hl - hr, ny = 2 * eps, nz = hd - hu, k = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
  out.x = nx * k; out.y = ny * k; out.z = nz * k;
  return out;
}
export function slopeAt(x, z) {
  const hl = heightAt(x - 0.6, z), hr = heightAt(x + 0.6, z);
  const hd = heightAt(x, z - 0.6), hu = heightAt(x, z + 0.6);
  const nx = hl - hr, ny = 2 * 0.6, nz = hd - hu;
  return Math.acos(clamp(ny * (1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1)), -1, 1)); // radians from vertical
}

// Biome weights at a point. Not normalised; each is 0..1.
export function biomeAt(x, z) {
  return biomeWith(x, z, heightAt(x, z), slopeAt(x, z), riverSection(x, z, _csb));
}
// biomeAt with its height, slope and river section given: the build has the height already, shares the river's
// section with its own shading, and skips the slope (four heightAt) where nothing it bakes reads one (buildTerrain)
function biomeWith(x, z, h, slope, rv) {
  const L = LANDMARKS;
  const r = Math.hypot(x, z);
  const rock = smoothstep(0.55, 0.95, slope) + smoothstep(WORLD.regionRadius, WORLD.regionRadius + 60, r) * 0.6;
  const ice = glacierIce(x, z); // v4 regions: the tongue's width, cut sharp at the snout
  const dWood = Math.hypot(x - L.wood.x, z - L.wood.z);
  // (v13 L2: a weight of +0 times the positive blotch is +0, so the blotch's noise is skipped there; |warped2| < 1)
  const wIn = 1 - smoothstep(L.wood.r - 25, L.wood.r + 15, dWood), wood = wIn === 0 ? 0 : wIn * (0.6 + 0.4 * SX.warped2(x * 0.02, z * 0.02, 3));
  const dFen = Math.hypot(x - L.fen.x, z - L.fen.z);
  const marsh = 1 - smoothstep(L.fen.r - 15, L.fen.r + 25, dFen);
  const dTarn = Math.hypot(x - L.tarn.x, z - L.tarn.z);
  const shore = (1 - smoothstep(58, 72, dTarn)) * smoothstep(50, 58, dTarn) + (marsh * smoothstep(-2.6, -2.2, h) * (1 - smoothstep(-1.8, -1.2, h)));
  const dOrch = Math.hypot(x - L.orchard.x, z - L.orchard.z);
  const orchard = 1 - smoothstep(L.orchard.r - 10, L.orchard.r + 10, dOrch);
  const dMor = Math.hypot(x - L.moraine.x, z - L.moraine.z);
  // v4 regions: the Outwash takes the crystal ground past 50 m (placement plan, 11)
  const cIn = 1 - smoothstep(42, 64, dMor), crystal = cIn === 0 ? 0 : cIn * (0.5 + 0.5 * SX.warped2(x * 0.03 + 4, z * 0.03, 3));
  const heath = smoothstep(-0.2, 0.5, SX.warped2(x * 0.008 + 20, z * 0.008 + 9, 4));
  // the river: bare shingle along the canyon floor, a reedy margin where it slows toward the fen
  const rockR = clamp(rock + rv.shingle * 0.75, 0, 1.6);
  const shoreR = shore + rv.slow * (1 - smoothstep(0.2, 1.5, h - rv.W)) * 0.8;
  const moor = clamp(1 - rockR - ice - marsh - wood * 0.5, 0, 1);
  return { moor, heath, wood, marsh, shore: shoreR, rock: rockR, ice, orchard, crystal, slope, h };
}

// Water height at a point, or null when there is no water body here.
const WATER_DISCS = Object.values(WATER);
export function waterLevelAt(x, z) {
  for (const w of WATER_DISCS) {
    if (Math.hypot(x - w.x, z - w.z) < w.r && (w !== WATER.tarn || tarnWet(x, z))) return w.y; // v4: the tarn's own shore
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


// What terrain.js's bake reads of the insides: the noise, the river's section and its scratch template (copied at the
// bake, as it always was), the biome with its inputs given, the pool, the ravine's bed, the fall's impact
export const BAKE_KIT = { SX, riverSection, cs: _cs, biomeWith, POOL, POOL_R, GULLY_BED, IMPACT };
