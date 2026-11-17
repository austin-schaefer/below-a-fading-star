// The heightfield (v13 L2; terrain.js holds the bake, the material and the shaders): heightAt and what
// it is made of (the moor, the landmarks' shaping, the tarn, the fen, the orchard, the causeway, the regions' hooks, the
// walls, the glacier, the Tumbling Water and its ravine, the Span's blocks, the map's pit and fall), slopeAt, normalAt,
// biomeAt, the water and the river. Pure: no three, no page globals, so a worker can import it (src/height/params.js
// carries the URL's switches). terrain.js re-exports all of it; import from there unless you are in a worker.
// Everything here is checked bit for bit by tools/height-check.mjs.
import { makeSimplex, clamp, lerp, smoothstep, hyp } from '../noise.js';
import { tarnHeight, tarnWet, tarnBasin, tarnShoreDistance, tarnShoreAbove, tarnShelf, TARN_REACH } from '../v4/tarn.js'; // v4 regions: Lees Tarn's south bay and spit; v16 L2: its basin on the edge
import { WORLD, LANDMARKS, WATER, CAUSEWAY_V4 } from '../world.js';
import { mapHeight } from '../v4/paths/ground.js'; // v4 map: the pit, the taller fall's face, the runnels' cuts
import { applyMountains, M_START, WALL_SAMPLE } from '../v4/mountains.js'; // v4 systems: the walls
import { regionsHeight, regionsCoarse, woodRag } from './regions.js'; // v4 systems: the regions' hooks
import { lappetGround } from '../v15/plan.js'; // v15: the Lappet's crown and foot
import { spanGround } from '../v4/span/plan.js'; // v4: the Great Span's marked blocks
import { glacierTongue, glacierIce, glacierBedH, glacierCarve } from '../v4/glacier.js'; // v4 regions: the glacier rebuilt
import { padGround } from './pads.js';
import { fenHeight, fenWet, fenMarsh, fenRiverKeep, fenShoreDistance, fenGroundFrom, FEN_EDGE } from './fen.js'; // v16 L3: the fen on the edge
import { HEIGHT_PARAMS } from './params.js';
import { floorGround, floorCharacter, POOLS } from './floor.js'; // v16: the floor's fall, its forms, its pools and its character

const SX = makeSimplex(WORLD.seed);
const SY = makeSimplex(WORLD.seed + 77);

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  const x = ax + dx * t, z = az + dz * t;
  return hyp(px - x, pz - z);
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
// (v16 L5: an 8 m grid marks the cells no segment comes within 8 m of: there the answer is lim, for lim <= 8)
const CW = (() => {
  const C = 8, g0 = -320, n = 80, F = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x0 = g0 + i * C, x1 = x0 + C, z0 = g0 + j * C, z1 = z0 + C;
    F[j * n + i] = ROAD.every((S) => distToSegment(x0 + C / 2, z0 + C / 2, S[0], S[1], S[2], S[3]) - C * Math.SQRT1_2 > 8.01) ? 1 : 0;
  }
  return { C, g0, n, F };
})();
function causewayNear(x, z, lim) {
  if (lim <= 8) { const i = Math.floor((x - CW.g0) / CW.C), j = Math.floor((z - CW.g0) / CW.C); if (i >= 0 && j >= 0 && i < CW.n && j < CW.n && CW.F[j * CW.n + i]) return lim; }
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
  const d = hyp(x - cx, z - cz);
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
  // v16 L5: chunks of CH segments (points CH·c .. CH·c + CH), each with its box, so a search skips the far ones
  const nc = Math.ceil((n - 1) / CH), CB = new Float64Array(nc * 4);
  for (let c = 0; c < nc; c++) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (let i = c * CH; i <= Math.min(c * CH + CH, n - 1); i++) { a0 = Math.min(a0, X[i]); a1 = Math.max(a1, X[i]); b0 = Math.min(b0, Z[i]); b1 = Math.max(b1, Z[i]); }
    CB[4 * c] = a0; CB[4 * c + 1] = a1; CB[4 * c + 2] = b0; CB[4 * c + 3] = b1;
  }
  // and a 4 m grid over the box and 72 m round it: the segment nearest each cell's middle, which seeds the search
  const G = 4, gx0 = x0 - 72, gz0 = z0 - 72, gnx = Math.ceil((x1 - x0 + 144) / G), gnz = Math.ceil((z1 - z0 + 144) / G), GI = new Int16Array(gnx * gnz), GM = new Int32Array(gnx * gnz), GD = new Float32Array(gnx * gnz);
  if (nc > 31) throw new Error('makePolyline: more than 31 chunks for the cells\' masks');
  for (let j = 0; j < gnz; j++) for (let i = 0; i < gnx; i++) {
    const px = gx0 + (i + 0.5) * G, pz = gz0 + (j + 0.5) * G;
    let b = Infinity, bi = 0;
    for (let k = 0; k < n - 1; k++) { const e = segD2(X, Z, k, px, pz); if (e < b) { b = e; bi = k; } }
    GI[j * gnx + i] = bi;
    // the chunks that can hold the nearest segment of any point in the cell: those whose box comes within the
    // centre's nearest distance plus the cell's half-diagonal (and a hair) of the cell
    const U = Math.sqrt(b) + G * Math.SQRT1_2 + 1e-6, cx0 = px - G / 2, cx1 = px + G / 2, cz0 = pz - G / 2, cz1 = pz + G / 2;
    let mask = 0;
    for (let c = 0; c < nc; c++) {
      const ex = CB[4 * c] > cx1 ? CB[4 * c] - cx1 : cx0 > CB[4 * c + 1] ? cx0 - CB[4 * c + 1] : 0, ez = CB[4 * c + 2] > cz1 ? CB[4 * c + 2] - cz1 : cz0 > CB[4 * c + 3] ? cz0 - CB[4 * c + 3] : 0;
      if (ex * ex + ez * ez <= U * U) mask |= 1 << c;
    }
    GM[j * gnx + i] = mask;
    GD[j * gnx + i] = Math.max(0, Math.sqrt(b) - G * Math.SQRT1_2 - 1e-3); // no point in the cell is nearer the line
  }
  return { X, Z, S, n, length: S[n - 1], box: [x0, x1, z0, z1], nc, CB, grid: { gx0, gz0, gnx, gnz, iG: 1 / G, GI, GM, GD }, mx: NaN, mz: NaN, mi: 0, mt: 0, me: 0 };
}
// the squared distance from (x, z) to segment i
function segD2(X, Z, i, x, z) {
  const ax = X[i], az = Z[i], dx = X[i + 1] - ax, dz = Z[i + 1] - az;
  let t = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = ax + dx * t - x, ez = az + dz * t - z;
  return ex * ex + ez * ez;
}
const CH = 8;
// the squared distance from (x, z) to chunk c's box
function chunkD2(CB, c, x, z) {
  const ex = x < CB[4 * c] ? CB[4 * c] - x : x > CB[4 * c + 1] ? x - CB[4 * c + 1] : 0, ez = z < CB[4 * c + 2] ? CB[4 * c + 2] - z : z > CB[4 * c + 3] ? z - CB[4 * c + 3] : 0;
  return ex * ex + ez * ez;
}
const RIVER_LINE = catmull(RIVER_CTRL, 1.5);
const GULLY_LINE = catmull(GULLY_CTRL, 1.0);

// A lower bound of the distance from (x, z) to the line: 0 off the grid (v16 L5: waterLevelAt skips the search where
// the channel cannot reach)
function lineFloor(line, x, z) {
  const g = line.grid, u = (x - g.gx0) * g.iG, v = (z - g.gz0) * g.iG;
  return u >= 0 && v >= 0 && u < g.gnx && v < g.gnz ? g.GD[(v | 0) * g.gnx + (u | 0)] : 0;
}
// Nearest point on a polyline: writes s, d (signed), tangent, and whether it falls off either end.
function project(line, x, z, pad, out) {
  const [x0, x1, z0, z1] = line.box;
  if (x < x0 - pad || x > x1 + pad || z < z0 - pad || z > z1 + pad) { out.hit = false; out.e2 = Infinity; return out; }
  const { X, Z, S, n, CB } = line;
  let best = Infinity, bi = 0, bt = 0;
  // (v16 L5: the last point's search is kept, the river being asked at one point by heightAt and waterLevelAt; and a
  // chunk whose box is no nearer than the best so far is skipped: the same segment wins, to the bit)
  if (x === line.mx && z === line.mz) { best = line.me; bi = line.mi; bt = line.mt; }
  else {
    // the grid's segment for this cell seeds the best, a hair over its distance, so that a segment before it at the
    // same distance still wins, as in a plain scan from the start
    // and the cell's mask names the only chunks that can hold the nearest segment
    const g = line.grid, u = (x - g.gx0) * g.iG, v = (z - g.gz0) * g.iG;
    let mask = -1;
    if (u >= 0 && v >= 0 && u < g.gnx && v < g.gnz) { const k = (v | 0) * g.gnx + (u | 0); best = segD2(X, Z, g.GI[k], x, z) * (1 + 1e-9) + 1e-12; mask = g.GM[k]; }
    for (let c = 0; c < line.nc; c++) {
      if (!(mask & (1 << c)) || chunkD2(CB, c, x, z) >= best) continue;
      for (let i = c * CH, i1 = Math.min(c * CH + CH, n - 1); i < i1; i++) {
        const ax = X[i], az = Z[i], dx = X[i + 1] - ax, dz = Z[i + 1] - az;
        const l2 = dx * dx + dz * dz;
        let t = ((x - ax) * dx + (z - az) * dz) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = ax + dx * t - x, ez = az + dz * t - z;
        const e = ex * ex + ez * ez;
        if (e < best) { best = e; bi = i; bt = t; }
      }
    }
    line.mx = x; line.mz = z; line.me = best; line.mi = bi; line.mt = bt;
  }
  out.e2 = best;
  const dx = X[bi + 1] - X[bi], dz = Z[bi + 1] - Z[bi], l = hyp(dx, dz);
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
const sAtFen = (rad) => { const F = LANDMARKS.fen; for (let i = 0; i < RIVER_LINE.n; i++) if (Math.hypot(RIVER_LINE.X[i] - F.x, RIVER_LINE.Z[i] - F.z) < rad) return RIVER_LINE.S[i]; return RIVER_LINE.length; };
const S_FEN66 = sAtFen(66), S_FEN52 = sAtFen(52);
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
    // deep in the fen the fen's own shaping holds (v16 L3: by the fen's edge, src/height/fen.js)
    // (v16 L5: and given up along the channel where it was before L3, between the arc lengths at which the line comes
    // within 66 and 52 m of the fen's centre: kept to sd -11 alone, the channel ran 20 m on under P14's reed gap)
    const mf = Math.min(fenRiverKeep(x, z), 1 - smoothstep(S_FEN66, S_FEN52, s));
    if (mf < 1) out.cut += (1 - mf) * 40;
  }
  // the raised spur the canyon cuts through: its top is a distance-weighted blend of the rim heights
  // along the path (not the nearest point's), so the medial lines inside the bends carry no step
  {
    const [bx0, bx1, bz0, bz1] = RIVER_LINE.box;
    if (x > bx0 - 70 && x < bx1 + 70 && z > bz0 - 70 && z < bz1 + 70) {
      // (v16 L5: the weights are taken relative to the line's nearest distance, q.e2, which the projection above found
      // (inside this box it always runs); a point or a chunk of them more than 5000 m² further off weighs under 1e-10
      // of the nearest and is skipped)
      const { X, Z, n, CB } = RIVER_LINE, e0 = q.e2, far = e0 + 5000;
      let wsum = 0, tsum = 0, dsum = 0, dmin2 = Infinity;
      for (let c = 0; c < RIVER_LINE.nc; c++) {
        if (chunkD2(CB, c, x, z) > far) continue;
        for (let i = c * CH, i1 = c === RIVER_LINE.nc - 1 ? n : c * CH + CH; i < i1; i++) {
          const e = (x - X[i]) ** 2 + (z - Z[i]) ** 2;
          if (e > far) continue;
          if (e < dmin2) dmin2 = e;
          const w = Math.exp((e0 - e) / 200);
          wsum += w; tsum += w * RIM_TOP[i]; dsum += w * RIM_DW[i];
        }
      }
      const top = tsum / wsum, dw = dsum / wsum, dmin = Math.sqrt(dmin2);
      out.raise = top + SX.fbm2(x * 0.03 + 9, z * 0.03, 3) * 1.6 - Math.max(0, dmin - dw) * 0.34;
    }
  }
  // the pool's bowl, its beach, and the cirque wall behind it
  const px = x - POOL.x, pz = z - POOL.z, rp = hyp(px, pz);
  if (rp < 60) {
    const back = rp > 1e-3 ? Math.max(0, (px * BACK.x + pz * BACK.z) / rp) : 0;
    const kp = lerp(2.4, 6.0, back);
    let c;
    if (rp < POOL_R) c = POOL.y - 0.1 - 2.4 * Math.pow(1 - (rp / POOL_R) ** 2, 0.6) + SX.noise2(x * 0.5, z * 0.5) * 0.08;
    else if (rp < 6.8) c = POOL.y - 0.1 + (rp - POOL_R) * 0.2;
    else c = POOL.y + 0.26 + (rp - 6.8) * kp * (1 + SX.noise2(x * 0.12, z * 0.12) * 0.2);
    out.cut = Math.min(out.cut, c);
    // the canyon's mouth faces downstream (toward the first bend), so the cirque stands lower there
    const fx = RIVER_CTRL[1][0] - POOL.x, fz = RIVER_CTRL[1][1] - POOL.z, fl = hyp(fx, fz);
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
function eddyR(x, z) { return hyp(x - EDDY.x, z - EDDY.z); }
function carveEddy(h, x, z) {
  const dx = x - EDDY.x, dz = z - EDDY.z;
  if (dx * dx + dz * dz > 81) return h;
  const along = dx * EDDY.ox + dz * EDDY.oz, across = dx * EDDY.oz - dz * EDDY.ox;
  const R = EDDY.r, r = hyp(along > 0 ? along * 0.6 : along, across) + SX.noise2(x * 0.7, z * 0.7) * 0.18;
  // the bowl, then a narrow wet shelf, then the cut face of the bank climbing back into the wall
  const bowl = EDDY.y - 0.1 - EDDY.depth * Math.pow(Math.max(0, 1 - (r / R) ** 2), 0.7);
  const rim = EDDY.y - 0.1 + smoothstep(R, R + 0.8, r) * 0.3 + Math.max(0, r - R - 0.8) * 2.4;
  return Math.min(h, r < R ? bowl : rim);
}
function inEddy(x, z) { return eddyR(x, z) < EDDY.r; }
// --- v2 riverlife: the eddy basin (end)

// Water level of the river or the ravine at a point (null when off it). (v16 L5: only what riverSection says of the
// water, not the cut: the channel's width at the nearest point, then the ravine, the same numbers to the bit.) Inside
// the fen's edge the fen's own test holds: the river's channel there is water only where its ground is under the
// level (its banks there, the Span's bed among them, are the fen's dry ground, not the river's).
function riverLevelAt(x, z) {
  if (inEddy(x, z)) return EDDY.y; // v2 riverlife: the eddy basin (hook)
  const g = project(GULLY_LINE, x, z, 30, _gq);
  if (g.hit && !g.before && !g.after && Math.abs(g.d) < 2.2) return GULLY_BED(g.s) + 0.25;
  if (lineFloor(RIVER_LINE, x, z) > RIVER_WET_MAX) return null; // further from the line than the channel ever reaches
  const q = project(RIVER_LINE, x, z, 70, _rq);
  if (!q.hit || q.before || q.after) return null;
  const s = q.s, d = q.d;
  bankWidths(s, _bw);
  const B = (d > 0 ? _bw.bl : _bw.br) + SX.noise2(s * 0.12, d > 0 ? 3.1 : 7.7) * 0.6 * (1 - smoothstep(70, 90, s));
  if (!(Math.abs(d) < R_HW(s) + Math.max(0, B) + 0.6) || hyp(x - POOL.x, z - POOL.z) < 6.8) return null;
  const W = R_W(s);
  if (FEN_EDGE.sdFloor(x, z) < 0 && fenShoreDistance(x, z) < 0 && heightAt(x, z) > W) return null;
  return W;
}
const _csb = { ..._cs };

// the widest the channel's water reaches from its line: the half-width, the bank at its widest (x 1.25 of R_BANK), the
// bank's noise (0.6 x 1.1) and riverLevelAt's 0.6, sampled every 0.25 m of s, with a metre to spare
const RIVER_WET_MAX = (() => { let m = 0; for (let s = 0; s <= RIVER_LINE.length + 1; s += 0.25) m = Math.max(m, R_HW(s) + 1.25 * R_BANK(s)); return m + 0.66 + 0.6 + 1; })();
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

// v16 L5: the last point's height is kept (biomeAt, the walker and waterLevelAt ask one point again and again); the
// coarse pass changes the answer, so it is part of the key, and what the walls leave in WALL_SAMPLE is kept with it
let _hx = NaN, _hz = NaN, _hc = -1, _hh = 0;
const _hw = { water: 0, mouth: 0, hard: 0, step: 0 };
export function heightAt(x, z) {
  const W = WALL_SAMPLE;
  if (x === _hx && z === _hz && regionsCoarse() === _hc) { W.water = _hw.water; W.mouth = _hw.mouth; W.hard = _hw.hard; W.step = _hw.step; return _hh; }
  const h = heightRaw(x, z);
  _hx = x; _hz = z; _hc = regionsCoarse(); _hh = h;
  _hw.water = W.water; _hw.mouth = W.mouth; _hw.hard = W.hard; _hw.step = W.step;
  return h;
}
function heightRaw(x, z) {
  let h = beforeFen(x, z);
  // Fen: broad, flat, pocked with pools; v16 L3: on its edge, ragged, fingered, islanded (src/height/fen.js)
  h = fenHeight(h, x, z);
  return afterFen(h, x, z);
}
// the moor and the landmarks' shaping before the fen (v16 L5: the fen's wet test reads the ground its pools dig into)
function beforeFen(x, z) {
  // Rolling moorland
  let h = SX.fbm2(x * 0.0035, z * 0.0035, 5) * 11;
  h += SX.fbm2(x * 0.012 + 5, z * 0.012 - 3, 4) * 3.2;
  h += SX.noise2(x * 0.06, z * 0.06) * 0.35;
  // Gentle rise toward the north-east so the castle sees the region laid out below
  h += (z * -0.012) + (x * 0.006);
  h = floorGround(h, x, z); // v16: the floor falls to the west and south, with the ice's leavings and their pools on the high side (src/height/floor.js)

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
  // (v16 L2: a shelving shore keyed on the edge's sd, src/v4/tarn.js: bays, a point, an inlet, a shallows, a steep bank)
  if (!beyond(h, x, z, L.tarn.x, L.tarn.z, TARN_REACH)) h = tarnBasin(h, x, z, SX);
  return tarnHeight(h, x, z); // v4 regions: the south bay and the shingle spit (src/v4/tarn.js)
}
fenGroundFrom(beforeFen);
function afterFen(h, x, z) {
  const L = LANDMARKS;
  // Orchard terraces: faint steps, soft ones. Every 1.2 m of the moor's rise lies flatter (a tread) then steeper (a
  // bank): a wave of 0.3 of the rise, continuous, so the walker's feet follow the drawn ground (v15-W5: a floor() here
  // stood a 0.84 m cliff in heightAt every 1.2 m of rise that the 2-3 m mesh drew as a slope, and the walker jumped it
  // in one frame: the owner's "teleport up and down" in the dip by the Pomegranate House's gate). A deeper wave bends
  // the ground more than the mesh's triangles follow (0.3: within 0.15 m of heightAt on medium's 2.1 m cells; the
  // ground's own relief already misses by 0.2 on low's 3.1 m). The 0.42 m keeps the old mean lowering, so what stands
  // on it by a fixed y stays put.
  if (!beyond(h, x, z, L.orchard.x, L.orchard.z, 65)) {
    const d = hyp(x - L.orchard.x, z - L.orchard.z);
    const m = 1 - smoothstep(40, 65, d);
    const u = (h + 100) / 1.2;
    h -= m * (0.42 + 0.3 * 1.2 * Math.sin(2 * Math.PI * u) / (2 * Math.PI));
  }
  h = padGround(h, x, z, heightAt); // v15-W6: level pads under what the old treads held (the Collation's table), eased into the wave (src/height/pads.js)
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
  const r = hyp(x, z);
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
const marshN = (x, z) => SX.noise2(x * 0.07 + 3, z * 0.07 - 9);
function biomeWith(x, z, h, slope, rv) {
  const L = LANDMARKS;
  const r = hyp(x, z);
  const rock = smoothstep(0.55, 0.95, slope) + smoothstep(WORLD.regionRadius, WORLD.regionRadius + 60, r) * 0.6;
  const ice = glacierIce(x, z); // v4 regions: the tongue's width, cut sharp at the snout
  // v16 L3: the wood's circle broken, as its place's (height/regions.js); v16 L5: its noise only where the paint can reach
  // (the rag is 12 m at most), the moraine's and the marsh's likewise (fen.js's fenMarsh asks for its noise)
  const dW0 = Math.sqrt((x - L.wood.x) ** 2 + (z - L.wood.z) ** 2), dWood = dW0 < L.wood.r + 15 + 14 ? dW0 + woodRag(x, z) : dW0;
  // (v13 L2: a weight of +0 times the positive blotch is +0, so the blotch's noise is skipped there; |warped2| < 1)
  const wIn = 1 - smoothstep(L.wood.r - 25, L.wood.r + 15, dWood), wood = wIn === 0 ? 0 : wIn * (0.6 + 0.4 * SX.warped2(x * 0.02, z * 0.02, 3));
  const marsh = fenMarsh(x, z, marshN); // v16 L3: the fen's edge, out in tongues
  const sTarn = tarnShoreAbove(x, z, 14) ? 15 : tarnShoreDistance(x, z); // v16 L2: the shore's paint follows the edge (v16 L5: not asked where it is certainly over 14, where the paint is 0)
  const shore = (sTarn > 14 || sTarn < -30 ? 0 : (1 - smoothstep(0, 14, sTarn)) * smoothstep(-8 - 16 * tarnShelf(x, z), 0, sTarn)) + (marsh * smoothstep(-2.6, -2.2, h) * (1 - smoothstep(-1.8, -1.2, h)));
  const dOrch = hyp(x - L.orchard.x, z - L.orchard.z);
  const orchard = 1 - smoothstep(L.orchard.r - 10, L.orchard.r + 10, dOrch);
  const dM0 = Math.sqrt((x - L.moraine.x) ** 2 + (z - L.moraine.z) ** 2), dMor = dM0 < 64 + 10 ? dM0 + SX.noise2(x * 0.04 - 2.1, z * 0.04 + 5.3) * 9 : dM0; // v16 L3: no ruled ring
  // v4 regions: the Outwash takes the crystal ground past 50 m (placement plan, 11)
  const cIn = 1 - smoothstep(42, 64, dMor), crystal = cIn === 0 ? 0 : cIn * (0.5 + 0.5 * SX.warped2(x * 0.03 + 4, z * 0.03, 3));
  const heath = smoothstep(-0.2, 0.5, SX.warped2(x * 0.008 + 20, z * 0.008 + 9, 4));
  // the river: bare shingle along the canyon floor, a reedy margin where it slows toward the fen
  const rockR = clamp(rock + rv.shingle * 0.75, 0, 1.6);
  const shoreR = shore + rv.slow * (1 - smoothstep(0.2, 1.5, h - rv.W)) * 0.8;
  const moor = clamp(1 - rockR - ice - marsh - wood * 0.5, 0, 1);
  // v16 L4: what the floor's forms make of the ground (src/height/floor.js floorCharacter; all 0 under ?floor=v15)
  const fc = floorCharacter(x, z);
  return { moor, heath, wood, marsh, shore: fc.shore > 0 ? Math.max(shoreR, fc.shore) : shoreR, rock: rockR, ice, orchard, crystal, slope, h,
    wet: fc.wet, bleak: fc.bleak, lee: fc.lee, stone: fc.stone, strand: fc.strand };
}

// The still waters, each with its own wet test and its shore's signed distance (metres, < 0 in the water), in the
// order waterLevelAt asks them. A body drawn on an edge (src/height/outline.js) gives its own; a plain disc is a disc.
// v16 L2: the tarn is on its edge; v16 L3: the fen on its own (src/height/fen.js), wet only where its pools hold water.
const disc = (w) => ({ wet: (x, z) => hyp(x - w.x, z - w.z) < w.r, sd: (x, z) => hyp(x - w.x, z - w.z) - w.r });
const FEN_HIGH = 0.3; // how far above the fen's water a wet cell's ground may stand (the shore's fade)
export const WATER_BODIES = [
  { name: 'tarn', w: WATER.tarn, wet: (x, z) => tarnWet(x, z, heightAt), sd: tarnShoreDistance },
  // (v16 L5: what the fen calls wet is held to the whole ground: the river's spur, its soft max, lifts the fen's ground
  // near the river's mouth, and the Span's blocks stand in it)
  // (only within 35 m of the river's line: the spur lifts nothing further out, 20 m at most measured, and nothing else
  // after the fen's block reaches its water)
  { name: 'fen', w: WATER.fen, wet: (x, z) => fenWet(x, z) && (lineFloor(RIVER_LINE, x, z) > 35 || project(RIVER_LINE, x, z, 70, _rq).e2 > 35 * 35 || heightAt(x, z) < WATER.fen.y + FEN_HIGH), sd: fenShoreDistance },
  { name: 'pool', w: WATER.pool, ...disc(WATER.pool) },
  // v16 L4: the floor's pools (src/height/floor.js POOLS), each on its edge, a box test first (none under ?floor=v15)
  ...POOLS.filter((p) => p.y !== null && HEIGHT_PARAMS.floor !== 'v15').map((p) => {
    const [x0, x1, z0, z1] = p.wetBox;
    return { name: p.name, w: { x: p.x, z: p.z, r: p.rMax + 1, y: p.y }, wet: (x, z) => x > x0 && x < x1 && z > z0 && z < z1 && p.sd(x, z) < 0, sd: p.sd };
  }),
];
// Water height at a point, or null when there is no water body here.
// (v16 L5: the floor's pools, after the first three, are asked only inside the box round all of them)
const N_BIG = 3, SMALL_BOX = WATER_BODIES.slice(N_BIG).reduce((b, B) => [Math.min(b[0], B.w.x - B.w.r), Math.max(b[1], B.w.x + B.w.r), Math.min(b[2], B.w.z - B.w.r), Math.max(b[3], B.w.z + B.w.r)], [Infinity, -Infinity, Infinity, -Infinity]);
export function waterLevelAt(x, z) {
  for (let i = 0; i < N_BIG; i++) if (WATER_BODIES[i].wet(x, z)) return WATER_BODIES[i].w.y;
  if (x > SMALL_BOX[0] && x < SMALL_BOX[1] && z > SMALL_BOX[2] && z < SMALL_BOX[3]) for (let i = N_BIG; i < WATER_BODIES.length; i++) if (WATER_BODIES[i].wet(x, z)) return WATER_BODIES[i].w.y;
  return riverLevelAt(x, z);
}
// The first still water whose shore lies within `extra` metres: { name, y, sd } (sd < 0 inside), or null.
const _ws = { name: '', y: 0, sd: 0 };
export function waterShore(x, z, extra = 0, out = _ws) {
  for (const b of WATER_BODIES) {
    const d = b.sd(x, z);
    if (d < extra) { out.name = b.name; out.y = b.w.y; out.sd = d; return out; }
  }
  return null;
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
