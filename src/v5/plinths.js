// AW The Plinth Road [Proposed] (IDEAS-v4.md AW; wilderness-v4.md: "with no human feet: bird feet, pigs' hooves,
// reptilian feet, all emerging from robes, so it reads as a row of robed half-human figures that are gone"; site in
// wilderness-v4-placement.md section 5, key `plinths`, from (130, -150) to (165, -290), corridor 30 m).
// A processional way runs north-north-east from the Bletting's hedge, at the gap P7 comes through, toward the wall:
// twelve pairs of plinths 11 m apart, the first pair 22 m up the line, the last at the plan's end (165, -290) on the
// talus, each plinth 20 m of the kit's coursed masonry (a footing, a step, a battered die, a cornice, a crown slab),
// the two of a pair 22 m apart across a paved band 13 m wide. The paving runs on past the last pair up the talus and
// stops 158 m up the line, under the wall's foot, where the rock goes up sheer: as if the road once went on into it.
// On every plinth only the feet of a robed figure remain, broken off above the hem; the figures faced each other
// across the road. No two alike and none human: raptors' talons hooked over the crown's edge, a wader's long toes, a
// ratite's two, webbed toes, a parrot's two-forward-two-back, pigs' cloven trotters with their dewclaws, a solid
// hoof, a lizard's splayed claws, a crocodile's webbed feet, a tortoise's columns with their nails, a beast's clawed
// paws; most in the plinths' stone, some in black bronze gone to verdigris. Feet 2-4 m long: figures of about 40 m.
// Six plinths are down: three fell (their footings stand, the die lies in the grass in four blocks with the cornice
// beyond, one of them across the west half of the road) and three are broken off at 5-13 m; each one's feet lie in
// the grass beside it.
//
// Draws: the masonry (plinths, paving, fallen blocks: one merged mesh in the kit's stone, casting shadows), the feet
// (one merged mesh, each figure one signed-distance field polygonised once at build by surface nets, casting
// shadows). Nothing moves. Colliders on every plinth, footing, fallen block and fallen pair of
// feet. Rocks and trees keep off the corridor and the fallen blocks (plinthsClear, read by rocks.js and
// vegetation/ground.js) and ground cover off the paving (plinthsPaved). ?plinths=0 leaves the whole thing out, the
// clearances too. ctx.plinths = { stats() }.
import * as THREE from 'three';
import { SITES } from '../world.js';
import { mergeGeometries } from '../v4/kit/merge.js';
import { makeSimplex, clamp, lerp, smoothstep } from '../noise.js';

const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('plinths') === '0';

// ---------------------------------------------------------------- the line (s along it from the foot, d across, east +)
const SITE = SITES.plinths;
const [AX, AZ] = SITE.from, [BX, BZ] = SITE.to;
const LEN = Math.hypot(BX - AX, BZ - AZ);
const UX = (BX - AX) / LEN, UZ = (BZ - AZ) / LEN; // along, north-north-east
const PX = -UZ, PZ = UX; // across, toward the east row
export const PLINTHS = {
  first: 22,       // the first pair stands 22 m up the line from the foot (130, -150): (124.7, -174.0) and (146.0, -168.7)
  spacing: 11,     // between pairs, along the line
  pairs: 12,       // the twelfth at s 143, the plan's end
  across: 11,      // each plinth's centre off the line
  height: 20,
  pave: 6.5,       // the paving's half-width
  paveFrom: 1.5,   // the paving's foot, just north of the hedge's gap
  paveEnd: 158,    // where it runs in under the wall's foot
  clear: SITE.r,   // rocks and trees keep this far off the line (15 m: the corridor's half-width)
};
const at = (s, d) => [AX + UX * s + PX * d, AZ + UZ * s + PZ * d];
const local = (x, z) => { const dx = x - AX, dz = z - AZ; return [dx * UX + dz * UZ, dx * PX + dz * PZ]; };

// What happened to each plinth: [pair, side (-1 west, +1 east)] -> fate. A fallen one carries its fall's direction
// in (along, across-outward) terms, how many blocks of the die lie along it, and where its feet lie (metres out along
// the fall, metres to its side); a broken one the height it stands to.
const FATES = {
  '2:1': { fate: 'fallen', dir: [0.34, 0.94], pieces: 4, feet: [15, 4.5], lie: 'back' },
  '4:-1': { fate: 'broken', h: 9, lie: 'side' },
  '6:1': { fate: 'broken', h: 13, lie: 'side' },
  '7:-1': { fate: 'fallen', dir: [0.62, -0.78], pieces: 3, feet: [11, -5], lie: 'back' }, // inward: across the west half of the road
  '9:1': { fate: 'fallen', dir: [-0.26, 0.96], pieces: 4, feet: [14, -4.5], lie: 'side' },
  '10:-1': { fate: 'broken', h: 5.5, lie: 'back' },
};
const PIECE = 1.75, GAP = 0.9; // a fallen die's blocks: half-length, mean gap
const reachOf = (f) => 4 + f.pieces * (2 * PIECE + GAP) + 3; // to the cornice's far side
const FALLS = [];
for (const [k, f] of Object.entries(FATES)) {
  const [i, side] = k.split(':').map(Number);
  const s = PLINTHS.first + i * PLINTHS.spacing, d = side * PLINTHS.across;
  const ds = f.dir ? f.dir[0] : 0, dd = f.dir ? f.dir[1] * side : side; // broken: the feet lie outward
  FALLS.push({ s, d, ds, dd, len: f.fate === 'fallen' ? reachOf(f) : 11, r: f.fate === 'fallen' ? 5.5 : 7 });
  if (f.feet) FALLS.push({ s: s + ds * f.feet[0] + dd * f.feet[1], d: d + dd * f.feet[0] - ds * f.feet[1], ds: 0, dd: 0, len: 0, r: 5.5 });
}

// Rocks and trees keep off the corridor (15 m either side of the line, from just north of the hedge to past the
// paving's end) and off every fall. Off with ?plinths=0, so the scene without the road is the scene as it was.
export function plinthsClear(x, z) {
  if (OFF) return false;
  const [s, d] = local(x, z);
  if (s > 3 && s < PLINTHS.paveEnd + 6 && Math.abs(d) < PLINTHS.clear) return true;
  for (const F of FALLS) {
    const t = clamp((s - F.s) * F.ds + (d - F.d) * F.dd, 0, F.len);
    if (Math.hypot(s - F.s - F.ds * t, d - F.d - F.dd * t) < F.r) return true;
  }
  return false;
}
// Ground cover keeps off the paving's middle (its edges stay frayed into the grass).
export function plinthsPaved(x, z) {
  if (OFF) return false;
  const [s, d] = local(x, z);
  return s > PLINTHS.paveFrom + 2 && s < PLINTHS.paveEnd && Math.abs(d) < PLINTHS.pave - 1;
}

// ---------------------------------------------------------------- the feet: one distance field per figure
// Local frame: u forward (the way the figure faced), v to its side, y up from the crown's top; the crown's edge is
// EDGE from its centre, and what reaches past it droops over.
const EDGE = 2.95;
const CELL_HI = 0.3, CELL_LO = 0.4;
// Eleven kinds (raptor, wader, ratite, webbed, parrot, pig, hoof, lizard, croc, tortoise, paw), dealt pair by pair,
// west then east, so neither row repeats a kind next to itself; each kind comes two or three times, every figure with
// its own measures. Those lying in the grass are two ratites, a raptor, a lizard, a webbed bird and a crocodile.
const DEAL = ['raptor', 'pig', 'wader', 'lizard', 'hoof', 'ratite', 'paw', 'webbed', 'raptor', 'tortoise', 'croc', 'parrot',
  'pig', 'lizard', 'webbed', 'hoof', 'tortoise', 'wader', 'parrot', 'croc', 'ratite', 'paw', 'lizard', 'raptor'];

function capD(u, v, y, p) {
  const pu = u - p.a[0], pv = v - p.a[1], py = y - p.a[2];
  const bu = p.b[0] - p.a[0], bv = p.b[1] - p.a[1], by = p.b[2] - p.a[2];
  const h = clamp((pu * bu + pv * bv + py * by) / (bu * bu + bv * bv + by * by + 1e-9), 0, 1);
  const du = pu - bu * h, dv = pv - bv * h, dy = py - by * h;
  return Math.sqrt(du * du + dv * dv + dy * dy) - (p.ra + (p.rb - p.ra) * h);
}
function ellD(u, v, y, p) {
  const qu = (u - p.c[0]) / p.r[0], qv = (v - p.c[1]) / p.r[1], qy = (y - p.c[2]) / p.r[2];
  return (Math.sqrt(qu * qu + qv * qv + qy * qy) - 1) * Math.min(p.r[0], p.r[1], p.r[2]);
}
function boxD(u, v, y, p) {
  const ca = Math.cos(p.yaw), sa = Math.sin(p.yaw);
  const lu = (u - p.c[0]) * ca + (v - p.c[1]) * sa, lv = -(u - p.c[0]) * sa + (v - p.c[1]) * ca;
  const qu = Math.abs(lu) - p.h[0] + p.rr, qv = Math.abs(lv) - p.h[1] + p.rr, qy = Math.abs(y - p.c[2]) - p.h[2] + p.rr;
  return Math.hypot(Math.max(qu, 0), Math.max(qv, 0), Math.max(qy, 0)) + Math.min(Math.max(qu, qv, qy), 0) - p.rr;
}
// a web: a plate between two toes, from the foot's root to most of the way along each
function webD(u, v, y, p) {
  const [A, B, C] = p.tri;
  // signed distance to the triangle in the uv plane (negative inside), then thickened about its plane's height
  const e = (P, Q) => { const ex = Q[0] - P[0], ev = Q[1] - P[1], wx = u - P[0], wv = v - P[1]; const t = clamp((wx * ex + wv * ev) / (ex * ex + ev * ev), 0, 1); return [Math.hypot(wx - ex * t, wv - ev * t), ex * wv - ev * wx]; };
  const [d0, s0] = e(A, B), [d1, s1] = e(B, C), [d2, s2] = e(C, A);
  const inside = (s0 >= 0 && s1 >= 0 && s2 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0);
  const dp = (inside ? -1 : 1) * Math.min(d0, d1, d2);
  const yc = p.y + Math.max(0, u - EDGE) * -1.3;
  return Math.hypot(Math.max(dp, 0), Math.max(Math.abs(y - yc) - p.th, 0)) + Math.min(Math.max(dp, Math.abs(y - yc) - p.th), 0);
}
const PART_D = { cap: capD, ell: ellD, box: boxD, web: webD };
const sminK = (a, b, k) => { const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
const droop = (u) => Math.max(0, u - EDGE) * 1.3; // over the crown's edge a toe goes down

// One figure: the robe's hem and the feet and legs coming out from under it. tags: 0 robe, 1 skin, 2 horn (claws,
// hooves, nails: darker, polished)
function figure(kind, rng, j) {
  const R = (a, b) => a + (b - a) * rng();
  const parts = [];
  const cap = (a, b, ra, rb, tag = 1) => parts.push({ t: 'cap', a, b, ra, rb, tag });
  const ell = (c, r, tag = 1) => parts.push({ t: 'ell', c, r, tag });
  const box = (c, h, yaw, rr, tag = 2) => parts.push({ t: 'box', c, h, yaw, rr, tag });
  const web = (tri, y, th) => parts.push({ t: 'web', tri, y, th, tag: 1 });
  // toes along the plinth's top: from root [u, v, y], heading a, n segments to length L, radii r0 -> r1, a claw
  const toe = (root, a, L, r0, r1, n = 3, arch = 0.06, claw = null) => {
    const cu = Math.cos(a), cv = Math.sin(a);
    let prev = root, rp = r0;
    for (let k = 1; k <= n; k++) {
      const t = k / n, r = lerp(r0, r1, t);
      const u = root[0] + cu * L * t, v = root[1] + cv * L * t;
      const p = [u, v, lerp(root[2], r1 + 0.02, Math.min(1, t * 1.6)) + arch * Math.sin(Math.PI * t) - droop(u)];
      cap(prev, p, rp, r); prev = p; rp = r;
    }
    if (claw) { // forward and curling down
      const [cl, cr, curl] = claw;
      const m = [prev[0] + cu * cl * 0.55, prev[1] + cv * cl * 0.55, prev[2] + cl * 0.08];
      m[2] -= droop(m[0]) * 0.6;
      const e = [m[0] + cu * cl * 0.45 * (1 - 0.5 * curl), m[1] + cv * cl * 0.45 * (1 - 0.5 * curl), m[2] - cl * (0.25 + 0.5 * curl)];
      e[2] -= droop(e[0]) * 0.6;
      cap(prev, m, cr, cr * 0.65, 2); cap(m, e, cr * 0.65, 0.05, 2);
    }
    return prev;
  };
  const S = R(1.15, 1.5); // the figure's size
  const robe = {
    cu: R(-0.45, -0.25), ru: R(1.8, 2.05), rv: R(2.05, 2.35), H: R(1.7, 2.5), lift: 0.7, folds: 5 + Math.floor(rng() * 5),
    fa: R(0.12, 0.22), ph: rng() * 6.28, tu: R(-0.3, 0.3), tv: R(-0.3, 0.3), wave: R(0.06, 0.16),
  };
  const sep = R(0.72, 0.95) * S, step = R(-0.2, 0.3) * S, out = R(0.06, 0.32);
  for (const sg of [-1, 1]) {
    const u0 = R(0.85, 1.15) + (sg > 0 ? step : 0), v0 = sg * sep, a0 = sg * out; // root of the foot, toe-out
    const up = (h) => [u0 - 0.35, v0 * 0.85, h]; // where a leg goes up into the robe
    if (kind === 'raptor' || kind === 'wader' || kind === 'ratite' || kind === 'webbed' || kind === 'parrot') {
      const wd = kind === 'wader', ra = kind === 'ratite';
      const shank = wd ? 0.17 : ra ? 0.34 : kind === 'webbed' ? 0.21 : 0.27;
      const ank = [u0, v0, (wd ? 0.62 : 0.5) * S];
      cap(up(2.2), ank, shank * 1.15 * S, shank * S);
      ell([u0 + 0.05, v0, 0.3 * S], [0.36 * S, 0.3 * S, 0.27 * S]); // the pad under the ankle
      const root = [u0 + 0.12 * S, v0, 0.26 * S];
      if (kind === 'raptor') {
        const L = R(1.1, 1.45) * S, tr = R(0.18, 0.23) * S;
        [-0.48, 0, 0.42].forEach((da, i) => toe(root, a0 + da * sg, L * [0.85, 1, 0.8][i], tr, tr * 0.72, 3, 0.1 * S, [R(0.5, 0.7) * S, tr * 0.75, R(0.7, 1)]));
        toe(root, Math.PI + a0 * 0.3, L * 0.48, tr, tr * 0.75, 2, 0.05, [R(0.5, 0.65) * S, tr * 0.8, 0.9]); // the hallux
      } else if (wd) {
        const L = R(1.6, 2.0) * S, tr = R(0.1, 0.13) * S;
        [-0.62, 0, 0.6].forEach((da) => toe(root, a0 + da * sg, L * R(0.85, 1), tr, tr * 0.7, 4, 0.05, [0.24 * S, tr * 0.8, 0.4]));
        toe(root, Math.PI + a0 * 0.3, L * 0.5, tr, tr * 0.7, 2, 0.03, [0.2 * S, tr * 0.8, 0.4]);
      } else if (ra) {
        toe(root, a0 - 0.12 * sg, R(1.35, 1.6) * S, 0.3 * S, 0.21 * S, 3, 0.1 * S, [R(0.45, 0.6) * S, 0.17 * S, 0.7]);
        toe(root, a0 + 0.38 * sg, R(0.9, 1.1) * S, 0.22 * S, 0.15 * S, 2, 0.08 * S, [0.25 * S, 0.1 * S, 0.5]);
      } else if (kind === 'webbed') {
        const L = R(1.15, 1.4) * S, tr = R(0.13, 0.16) * S, tips = [];
        [-0.58, 0, 0.56].forEach((da) => tips.push(toe(root, a0 + da * sg, L, tr, tr * 0.72, 3, 0.04, [0.22 * S, tr * 0.7, 0.4])));
        for (let k = 0; k < 2; k++) {
          const A = [root[0], root[1]], B = tips[k], C = tips[k + 1];
          const B2 = [lerp(root[0], B[0], 0.95), lerp(root[1], B[1], 0.95)], C2 = [lerp(root[0], C[0], 0.95), lerp(root[1], C[1], 0.95)];
          web([A, B2, C2], 0.13 * S, 0.09);
        }
      } else { // parrot: two forward, two back
        const L = R(0.95, 1.2) * S, tr = R(0.19, 0.23) * S;
        for (const da of [-0.32, 0.3]) toe(root, a0 + da, L, tr, tr * 0.75, 3, 0.12 * S, [R(0.45, 0.6) * S, tr * 0.7, 1]);
        for (const da of [-0.4, 0.4]) toe(root, Math.PI + da, L * 0.72, tr, tr * 0.75, 2, 0.1 * S, [0.4 * S, tr * 0.7, 1]);
      }
    } else if (kind === 'pig') {
      const fet = [u0, v0, 0.78 * S], past = [u0 + 0.28 * S, v0, 0.42 * S];
      cap(up(2.4), fet, 0.42 * S, 0.33 * S); cap(fet, past, 0.31 * S, 0.27 * S);
      for (const k of [-1, 1]) { // the two halves of the cloven hoof, toed apart, and a dewclaw behind each
        const ya = a0 + k * 0.13;
        box([u0 + 0.62 * S + Math.cos(ya) * 0.05, v0 + k * 0.19 * S, 0.24 * S], [0.42 * S, 0.15 * S, 0.24 * S], ya, 0.1 * S);
        cap([u0 - 0.02, v0 + k * 0.3 * S, 0.6 * S], [u0 - 0.22 * S, v0 + k * 0.36 * S, 0.3 * S], 0.13 * S, 0.1 * S, 2);
      }
    } else if (kind === 'hoof') {
      const fet = [u0, v0, 0.92 * S], past = [u0 + 0.32 * S, v0, 0.5 * S];
      cap(up(2.4), fet, 0.36 * S, 0.33 * S); ell(fet, [0.44 * S, 0.4 * S, 0.4 * S]); // the fetlock
      cap(fet, past, 0.32 * S, 0.3 * S);
      cap([u0 + 0.42 * S, v0, 0.46 * S], [u0 + 0.55 * S, v0, 0.16 * S], 0.4 * S, 0.56 * S, 2); // the hoof, flaring to the ground
    } else if (kind === 'lizard' || kind === 'croc') {
      const cr = kind === 'croc';
      const ank = [u0, v0 + sg * 0.25 * S, 0.42 * S];
      cap([u0 - 0.5, v0 * 0.7, 1.4], [u0 - 0.15, v0 + sg * 0.55 * S, 0.85 * S], 0.36 * S, 0.3 * S); // the leg, sprawled
      cap([u0 - 0.15, v0 + sg * 0.55 * S, 0.85 * S], ank, 0.3 * S, 0.26 * S);
      ell([u0 + 0.25 * S, ank[1], 0.22 * S], [0.58 * S, (cr ? 0.55 : 0.46) * S, 0.22 * S]); // the palm
      const root = [u0 + 0.45 * S, ank[1], 0.18 * S];
      const fan = cr ? [-0.6, -0.2, 0.2, 0.6] : [-0.95, -0.47, 0, 0.42, 0.85], lens = cr ? [0.8, 1, 1, 0.85] : [0.55, 0.9, 1.15, 0.95, 0.65];
      const L = (cr ? R(0.85, 1.05) : R(0.9, 1.2)) * S, tr = (cr ? 0.17 : 0.12) * S, tips = [];
      fan.forEach((da, i) => tips.push(toe(root, a0 + da * sg, L * lens[i], tr, tr * 0.7, 3, 0.05, cr ? [0.22 * S, tr * 0.7, 0.5] : [R(0.28, 0.38) * S, tr * 0.7, 0.85])));
      if (cr) for (let k = 0; k < 3; k++) {
        const B = tips[k], C = tips[k + 1];
        web([[root[0], root[1]], [lerp(root[0], B[0], 0.7), lerp(root[1], B[1], 0.7)], [lerp(root[0], C[0], 0.7), lerp(root[1], C[1], 0.7)]], 0.12 * S, 0.09);
      }
    } else if (kind === 'tortoise') {
      cap(up(2.0), [u0 + 0.05, v0, 0.5 * S], 0.62 * S, 0.68 * S); // a column of a foot, flat on the stone
      ell([u0 + 0.1, v0, 0.32 * S], [0.75 * S, 0.7 * S, 0.34 * S]);
      for (let k = 0; k < 5; k++) { // the nails round its front
        const a = a0 + (k - 2) * 0.34, c = [u0 + 0.1 + Math.cos(a) * 0.68 * S, v0 + Math.sin(a) * 0.68 * S, 0.24 * S];
        cap(c, [c[0] + Math.cos(a) * 0.25 * S, c[1] + Math.sin(a) * 0.25 * S, 0.08], 0.15 * S, 0.08 * S, 2);
      }
    } else { // paw: a beast's, its claws out over the crown's edge
      cap(up(2.2), [u0, v0, 0.62 * S], 0.5 * S, 0.44 * S);
      ell([u0 + 0.3 * S, v0, 0.36 * S], [0.78 * S, 0.62 * S, 0.37 * S]);
      for (let k = 0; k < 4; k++) {
        const vv = v0 + (k - 1.5) * 0.31 * S, c = [u0 + (0.95 - Math.abs(k - 1.5) * 0.12) * S, vv, 0.26 * S];
        ell(c, [0.27 * S, 0.17 * S, 0.24 * S]); // the toe
        const a = a0 + (k - 1.5) * 0.12, cl = R(0.42, 0.55) * S;
        const tip = [c[0] + Math.cos(a) * 0.2 * S, vv + Math.sin(a) * 0.2 * S, 0.3 * S];
        const m = [tip[0] + Math.cos(a) * cl * 0.6, tip[1] + Math.sin(a) * cl * 0.6, 0.28 * S], e = [m[0] + Math.cos(a) * cl * 0.4, m[1] + Math.sin(a) * cl * 0.4, 0.04];
        m[2] -= droop(m[0]); e[2] -= droop(e[0]) * 1.2;
        cap(tip, m, 0.1 * S, 0.075 * S, 2); cap(m, e, 0.075 * S, 0.04, 2);
      }
    }
  }
  // the hem: higher in front where the legs come out; trotters, hooves and shanks show more leg
  robe.lift = { raptor: 0.95, wader: 1.2, ratite: 1.15, webbed: 0.75, parrot: 0.8, pig: 1.45, hoof: 1.5, lizard: 1.0, croc: 0.95, tortoise: 0.55, paw: 0.85 }[kind] * R(1.05, 1.35);
  robe.H = Math.max(robe.H, robe.lift + 0.7);
  return { kind, parts, robe, S, bronze: false };
}

function makeField(F, noise) {
  const R = F.robe, N2 = noise.noise2;
  function robeD(u, v, y) {
    const cu = u - R.cu, q = Math.hypot(cu / R.ru, v / R.rv), th = Math.atan2(v, cu);
    const flare = 1 + 0.12 * (1 - clamp(y / R.H, 0, 1));
    const fold = R.fa * Math.sin(R.folds * th + R.ph) * (0.6 + 0.4 * clamp(y / R.H, 0, 1));
    const dr = (q - flare) * Math.min(R.ru, R.rv) - fold;
    const hem = R.lift * smoothstep(-0.15, 0.85, Math.cos(th)) + R.wave * Math.sin(th * 9 + R.ph) - 0.15;
    return Math.max(dr, hem - y);
  }
  // the break: a rough plane above the hem, through the robe and the legs inside it
  const cutY = (u, v) => R.H + R.tu * (u - R.cu) + R.tv * v + 0.22 * N2(u * 0.9 + R.ph, v * 0.9) + 0.1 * N2(u * 2.7, v * 2.7 + R.ph);
  function field(u, v, y) {
    let d = robeD(u, v, y);
    for (const p of F.parts) d = sminK(d, PART_D[p.t](u, v, y, p), p.tag === 2 ? 0.06 : 0.16);
    // the soles flat on the crown; past its edge the plane falls away so what hangs over is kept
    return Math.max(d, y - cutY(u, v), -(y + 0.1) - Math.max(0, u - EDGE) * 4);
  }
  function tagAt(u, v, y) {
    let best = robeD(u, v, y), tag = 0;
    const cut = y > cutY(u, v) - 0.3;
    for (const p of F.parts) { const d = PART_D[p.t](u, v, y, p); if (d < best - 0.02) { best = d; tag = p.tag; } }
    return { tag, cut: cut && tag === 0 };
  }
  return { field, tagAt };
}

// surface nets on a grid of n cells from o (u, v, y), cell c
function polygonise(f, o, n, c) {
  const [nx, ny, nz] = n; // u, y, v
  const idx = (i, j, k) => (k * (ny + 1) + j) * (nx + 1) + i;
  const F = new Float32Array((nx + 1) * (ny + 1) * (nz + 1));
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[idx(i, j, k)] = f(o[0] + i * c, o[1] + k * c, o[2] + j * c);
  const cellV = new Int32Array(nx * ny * nz).fill(-1), verts = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let neg = 0;
    for (let q = 0; q < 8; q++) { val[q] = F[idx(i + C[q][0], j + C[q][1], k + C[q][2])]; if (val[q] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, m = 0;
    for (const [a, b] of E) {
      const fa = val[a], fb = val[b];
      if ((fa < 0) === (fb < 0)) continue;
      const t = fa / (fa - fb);
      sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; m++;
    }
    cellV[(k * ny + j) * nx + i] = verts.length / 3;
    verts.push(o[0] + (i + sx / m) * c, o[1] + (k + sz / m) * c, o[2] + (j + sy / m) * c); // as (u, v, y)
  }
  const quads = [];
  const cv = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : cellV[(k * ny + j) * nx + i]);
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const f0 = F[idx(i, j, k)];
    if (i < nx && (f0 < 0) !== (F[idx(i + 1, j, k)] < 0)) { const q = [cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k)]; if (q.every((x) => x >= 0)) quads.push(q); }
    if (j < ny && (f0 < 0) !== (F[idx(i, j + 1, k)] < 0)) { const q = [cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1)]; if (q.every((x) => x >= 0)) quads.push(q); }
    if (k < nz && (f0 < 0) !== (F[idx(i, j, k + 1)] < 0)) { const q = [cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k)]; if (q.every((x) => x >= 0)) quads.push(q); }
  }
  return { verts, quads };
}

// one figure into the shared arrays, through the matrix M (local x = u, y = y, z = v)
function emitFigure(F, M, out, cell, noise, colors) {
  const { field, tagAt } = makeField(F, noise);
  const o = [-3.4, -3.6, -2.6], n = [Math.ceil(8.8 / cell), Math.ceil(6.6 / cell), Math.ceil(7.2 / cell)];
  const { verts, quads } = polygonise(field, o, n, cell);
  const nv = verts.length / 3, base = out.pos.length / 3;
  const nm = new THREE.Matrix3().getNormalMatrix(M), p = new THREE.Vector3(), nn = new THREE.Vector3(), c = new THREE.Color();
  const e = 0.12, NRM = new Float32Array(nv * 3);
  for (let q = 0; q < nv; q++) {
    const u = verts[q * 3], v = verts[q * 3 + 1], y = verts[q * 3 + 2];
    const gu = field(u + e, v, y) - field(u - e, v, y), gv = field(u, v + e, y) - field(u, v - e, y), gy = field(u, v, y + e) - field(u, v, y - e);
    const l = Math.hypot(gu, gv, gy) || 1;
    NRM[q * 3] = gu / l; NRM[q * 3 + 1] = gy / l; NRM[q * 3 + 2] = gv / l;
    p.set(u, y, v).applyMatrix4(M); nn.set(gu / l, gy / l, gv / l).applyMatrix3(nm).normalize();
    out.pos.push(p.x, p.y, p.z); out.nrm.push(nn.x, nn.y, nn.z);
    // colour: the figure's stone or bronze, horn darker, the break paler, lichen on what faces up, the joins shaded
    const { tag, cut } = tagAt(u, v, y);
    c.copy(tag === 2 ? colors.horn : tag === 1 ? colors.skin : colors.robe);
    if (cut) c.lerp(colors.cut, 0.55);
    const ao = clamp(field(u + NRM[q * 3] * 0.45, v + NRM[q * 3 + 2] * 0.45, y + NRM[q * 3 + 1] * 0.45) / 0.45, 0, 1);
    const g = 0.9 + 0.2 * noise.noise2(u * 1.7 + v, y * 1.9 - v * 0.7);
    if (colors.green) c.lerp(colors.green, smoothstep(0.1, 0.6, noise.noise2(u * 0.8 + 11, v * 0.8 + y * 0.6)) * 0.7 * (1 - (tag === 2 ? 0.7 : 0)));
    if (NRM[q * 3 + 1] > 0.45 && !colors.green) c.lerp(colors.lichen, smoothstep(0.35, 0.7, noise.noise2(u * 1.3 - 4, v * 1.3 + 2)) * 0.5);
    const k = (0.5 + 0.5 * ao) * g;
    out.col.push(c.r * k, c.g * k, c.b * k);
  }
  for (const qd of quads) {
    // wind each quad against the field's normal
    const a = qd[0] * 3, b = qd[1] * 3, d = qd[2] * 3;
    const ax = verts[b] - verts[a], ay = verts[b + 2] - verts[a + 2], az = verts[b + 1] - verts[a + 1];
    const bx = verts[d] - verts[a], by = verts[d + 2] - verts[a + 2], bz = verts[d + 1] - verts[a + 1];
    const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx;
    const s = (NRM[a] + NRM[b] + NRM[d]) * fx + (NRM[a + 1] + NRM[b + 1] + NRM[d + 1]) * fy + (NRM[a + 2] + NRM[b + 2] + NRM[d + 2]) * fz;
    const w = s >= 0 ? qd : [qd[0], qd[3], qd[2], qd[1]];
    out.idx.push(base + w[0], base + w[1], base + w[2], base + w[0], base + w[2], base + w[3]);
  }
  return { verts: nv, tris: quads.length * 2 };
}

// ---------------------------------------------------------------- the module
export async function build(ctx) {
  if (OFF) { ctx.plinths = { stats: () => ({ calls: 0, tris: 0 }), off: true }; return; }
  const { scene, terrain } = ctx;
  const T = terrain, low = ctx.quality === 'low';
  const rng = ctx.makeRng(9151);
  const noise = makeSimplex(9152);
  const t0 = performance.now();
  await ctx.progress?.('raising the plinths', 0);

  const yawRoad = Math.atan2(-PZ, PX); // a plinth's local x runs across the road, its z down it
  const stoneG = [], cols = (r) => ctx.addCollider(r);
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3(), M = new THREE.Matrix4();
  // a box (half sizes hx, hy, hz) at (x, y, z) turned (rx, ry, rz); taper narrows its top
  const box = (x, y, z, hx, hy, hz, ry, rx = 0, rz = 0, taper = 1) => {
    const g = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2);
    if (taper !== 1) { const a = g.attributes.position; for (let i = 0; i < a.count; i++) if (a.getY(i) > 0) a.setXYZ(i, a.getX(i) * taper, a.getY(i), a.getZ(i) * taper); g.computeVertexNormals(); }
    g.deleteAttribute('uv');
    g.applyMatrix4(M.compose(pv.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz, 'YXZ')), sc));
    stoneG.push(g);
  };
  const gMin = (x, z, r) => { let m = Infinity; for (const [ox, oz] of [[0, 0], [r, r], [r, -r], [-r, r], [-r, -r]]) m = Math.min(m, T.heightAt(x + ox, z + oz)); return m; };
  const ring = (x, z, half, yaw) => { // colliders over a square footprint
    cols({ x, z, r: half * 0.98 });
    const c = Math.cos(yaw), s = Math.sin(yaw), k = half - 0.95;
    for (const [a, b] of [[k, k], [k, -k], [-k, k], [-k, -k]]) cols({ x: x + a * c + b * s, z: z - a * s + b * c, r: 1.05 });
  };

  // ---- the figures: kinds dealt so no pair repeats and neighbours differ; a few in bronze
  const figs = DEAL.map((kind, j) => { const f = figure(kind, rng, j); f.bronze = rng() < 0.28; return f; });
  const C = (h) => new THREE.Color(h);
  const PAL = {
    stone: { robe: C('#776d63'), skin: C('#574f48'), horn: C('#1f1b18'), cut: C('#a89e90'), lichen: C('#8b8762') },
    bronze: { robe: C('#262a22'), skin: C('#22251e'), horn: C('#0f0e0c'), cut: C('#4a4033'), lichen: C('#8b8762'), green: C('#3d6553') },
  };
  const feet = { pos: [], nrm: [], col: [], idx: [] };
  const cell = low ? CELL_LO : CELL_HI;
  const placeFigure = (F, mat) => emitFigure(F, mat, feet, cell, noise, F.bronze ? PAL.bronze : PAL.stone);
  const FM = new THREE.Matrix4(), RQ = new THREE.Quaternion();
  const facingYaw = (fx, fz) => Math.atan2(-fz, fx); // three's Y rotation taking local +x to (fx, 0, fz)

  // ---- the plinths
  const list = [];
  let standing = 0, broken = 0, fallen = 0, fj = 0;
  for (let i = 0; i < PLINTHS.pairs; i++) for (const side of [-1, 1]) {
    const s = PLINTHS.first + i * PLINTHS.spacing, d = side * PLINTHS.across;
    const [x, z] = at(s, d);
    const fate = FATES[`${i}:${side}`] || { fate: 'standing' };
    const F = figs[fj++];
    const g = T.heightAt(x, z), b = g, bottom = gMin(x, z, 3.4) - 0.9;
    const yaw = yawRoad;
    // the footing and the step
    box(x, (bottom + b + 1.0) / 2, z, 3.5, (b + 1.0 - bottom) / 2, 3.5, yaw);
    box(x, b + 1.35, z, 3.15, 0.35, 3.15, yaw);
    ring(x, z, 3.5, yaw);
    const fx = -side * PX, fz = -side * PZ; // the figure faced across the road
    if (fate.fate === 'standing') {
      box(x, b + 1.7 + 7.95, z, 2.72, 7.95, 2.72, yaw, 0, 0, 0.92); // the die, battered
      box(x, b + 17.6 + 0.5, z, 2.62, 0.5, 2.62, yaw, 0, 0, 1.14); // the cornice, flaring
      box(x, b + 18.6 + 0.7, z, 3.0, 0.7, 3.0, yaw); // the crown slab
      FM.compose(pv.set(x, b + PLINTHS.height, z), RQ.setFromEuler(e.set(0, facingYaw(fx, fz), 0)), sc);
      placeFigure(F, FM);
      standing++;
      list.push({ i, side, x, z, fate: 'standing', kind: F.kind, top: b + PLINTHS.height });
    } else if (fate.fate === 'broken') {
      // the die to a little below where it broke, then what is left of its top course, block by block
      const h = fate.h, hb = h - 1.5;
      box(x, b + 1.7 + (hb - 1.7) / 2, z, 2.72, (hb - 1.7) / 2, 2.72, yaw, 0, 0, 1 - 0.08 * (hb - 1.7) / 15.9);
      const w = 2.72 * (1 - 0.08 * (hb - 1.7) / 15.9);
      for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (rng() < 0.3) continue;
        const bh = 0.4 + rng() * 1.3;
        const ca = Math.cos(yaw), sa = Math.sin(yaw), lx = a * w / 2, lz = c * w / 2;
        box(x + lx * ca + lz * sa, b + hb + bh / 2, z - lx * sa + lz * ca, w / 2 - 0.05, bh / 2, w / 2 - 0.05, yaw + (rng() - 0.5) * 0.04);
      }
      // the upper courses fell outward: blocks at its foot, and the feet among them
      const ox = side * PX, oz = side * PZ, ax = UX, az = UZ;
      for (let k = 0; k < 5; k++) {
        const r = 4.5 + rng() * 2.2, t = (rng() - 0.5) * 8, bx = x + ox * r + ax * t, bz = z + oz * r + az * t, hs = 0.7 + rng() * 0.8;
        box(bx, T.heightAt(bx, bz) + hs * 0.55, bz, hs * (1.2 + rng() * 0.6), hs, hs * (0.9 + rng() * 0.5), rng() * 6.28, (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.5);
        if (hs > 1) cols({ x: bx, z: bz, r: hs * 1.1 });
      }
      const lx = x + ox * 10.5 + ax * 3, lz = z + oz * 10.5 + az * 3;
      lying(F, lx, lz, fate.lie, side);
      broken++;
      list.push({ i, side, x, z, fate: 'broken', h, kind: F.kind, feet: [lx, lz] });
    } else {
      // fallen: the die lies in four blocks along its fall, the cornice and the crown beyond, the feet past them
      const ds = fate.dir[0], dd = fate.dir[1] * side; // in (along, across) terms
      const dx = UX * ds + PX * dd, dz = UZ * ds + PZ * dd, fy = Math.atan2(-dz, dx);
      let r = 4.0;
      for (let k = 0; k < fate.pieces; k++) {
        const len = PIECE + (rng() - 0.5) * 0.3, bx = x + dx * (r + len), bz = z + dz * (r + len);
        const gy = Math.min(T.heightAt(bx, bz), T.heightAt(bx + dx * len, bz + dz * len), T.heightAt(bx - dx * len, bz - dz * len));
        box(bx, gy + 2.6 - 0.7 - rng() * 0.5, bz, len, 2.6, 2.62, fy + (rng() - 0.5) * 0.35, (rng() - 0.5) * 0.18, (rng() - 0.5) * 0.12);
        for (const t of [-len * 0.6, 0, len * 0.6]) cols({ x: bx + dx * t, z: bz + dz * t, r: 2.55 });
        r += len * 2 + GAP * (0.5 + rng());
      }
      const cx = x + dx * (r + 1.5), cz = z + dz * (r + 1.5);
      box(cx, T.heightAt(cx, cz) + 1.2, cz, 1.2, 3.0, 3.0, fy + (rng() - 0.5) * 0.4, 0, 0.35 + rng() * 0.5);
      cols({ x: cx, z: cz, r: 3.0 });
      // the feet: out along the fall and to its side ((dz, -dx) is the fall's right hand in (along, across) terms)
      const [fr, fo] = fate.feet, ox = UX * dd - PX * ds, oz = UZ * dd - PZ * ds;
      const lx = x + dx * fr + ox * fo, lz = z + dz * fr + oz * fo;
      lying(F, lx, lz, fate.lie, side);
      fallen++;
      list.push({ i, side, x, z, fate: 'fallen', kind: F.kind, reach: +(r + 4.5).toFixed(1), feet: [lx, lz] });
    }
    if (fj % 6 === 0) await ctx.progress?.('raising the plinths', fj / (PLINTHS.pairs * 2));
  }
  // a fallen pair of feet: toppled onto its back, toes in the air and the robe lying along the road, so from across it
  // they show in profile; or onto its side, toes along the road and the soles turned away from it
  function lying(F, x, z, lie, side) {
    const back = lie === 'back';
    const roll = back ? (rng() - 0.5) * 0.4 : side * -(1.3 + rng() * 0.3), pitch = back ? 1.3 + rng() * 0.3 : (rng() - 0.5) * 0.3;
    FM.compose(pv.set(0, 0, 0), RQ.setFromEuler(e.set(roll, facingYaw(UX, UZ) + (rng() - 0.5) * 0.4, pitch, 'YXZ')), sc);
    const start = feet.pos.length;
    placeFigure(F, FM);
    let minY = Infinity;
    for (let k = start + 1; k < feet.pos.length; k += 3) minY = Math.min(minY, feet.pos[k]);
    const y = Math.min(T.heightAt(x, z), T.heightAt(x + 2, z), T.heightAt(x - 2, z), T.heightAt(x, z + 2), T.heightAt(x, z - 2)) - minY - 0.55;
    for (let k = start; k < feet.pos.length; k += 3) { feet.pos[k] += x; feet.pos[k + 1] += y; feet.pos[k + 2] += z; }
    cols({ x, z, r: 2.3 });
  }

  // ---- the paving: slabs on the line's grid, worn through and grassed over in patches, frayed at the edges
  const PS = 2.2, nAcross = Math.round((PLINTHS.pave * 2) / PS), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), qy = new THREE.Quaternion();
  let slabs = 0;
  for (let s = PLINTHS.paveFrom + PS / 2; s < PLINTHS.paveEnd; s += PS) for (let k = 0; k < nAcross; k++) {
    const d = -PLINTHS.pave + PS * (k + 0.5);
    const edge = Math.abs(d) / PLINTHS.pave, patch = noise.noise2(s * 0.07, d * 0.11) * 0.5 + 0.5;
    const foot = smoothstep(PLINTHS.paveFrom, PLINTHS.paveFrom + 9, s); // frayed out toward the hedge
    const keep = 0.95 - 0.55 * smoothstep(0.6, 1, edge) - 0.6 * smoothstep(0.55, 0.8, patch) - 0.6 * (1 - foot);
    const jitter = rng(), rot = rng(), tlt = rng();
    if (jitter > keep) continue;
    const [x, z] = at(s + (rot - 0.5) * 0.12, d);
    if (Math.hypot(x, z) > ctx.mountains.walkLimit(x, z) - 1.6) continue; // the paving stops inside the walk limit
    T.normalAt(x, z, nrm);
    const yaw = yawRoad + (rot - 0.5) * 0.06;
    q.setFromUnitVectors(up, nrm).multiply(qy.setFromAxisAngle(up, yaw));
    q.multiply(new THREE.Quaternion().setFromEuler(e.set((tlt - 0.5) * 0.05, 0, (jitter - 0.5) * 0.05)));
    const g = new THREE.BoxGeometry(PS - 0.16, 0.38, PS - 0.16);
    g.deleteAttribute('uv');
    g.applyMatrix4(M.compose(pv.set(x, T.heightAt(x, z) + 0.04 - smoothstep(PLINTHS.paveEnd - 14, PLINTHS.paveEnd, s) * 0.3, z), q, sc));
    stoneG.push(g); slabs++;
  }
  await ctx.progress?.('raising the plinths', 0.9);

  // ---- meshes
  const stone = ctx.kit.masonry({ color: '#857a6e', course: 2.2, base: 0, diminish: 1, slab: 4.6, joint: 0.025, wear: 0.85, moss: 0.6, inlay: 'bronze', inlayEvery: 0.08 });
  const sGeo = mergeGeometries(stoneG);
  for (const g of stoneG) g.dispose();
  sGeo.computeBoundingSphere();
  const sMesh = new THREE.Mesh(sGeo, stone.mat);
  sMesh.name = 'plinths-stone'; sMesh.castShadow = true; sMesh.receiveShadow = true;
  sMesh.matrixAutoUpdate = false; sMesh.updateMatrix();
  scene.add(sMesh);

  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.Float32BufferAttribute(feet.pos, 3));
  fGeo.setAttribute('normal', new THREE.Float32BufferAttribute(feet.nrm, 3));
  fGeo.setAttribute('color', new THREE.Float32BufferAttribute(feet.col, 3));
  fGeo.setIndex(feet.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(feet.idx, 1) : new THREE.Uint16BufferAttribute(feet.idx, 1));
  fGeo.computeBoundingSphere();
  const fMesh = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.08 }));
  fMesh.name = 'plinths-feet'; fMesh.castShadow = true; fMesh.receiveShadow = true;
  fMesh.matrixAutoUpdate = false; fMesh.updateMatrix();
  scene.add(fMesh);

  const t1 = performance.now();
  const tris = sGeo.attributes.position.count / 3 + fGeo.index.count / 3;
  const kinds = [...new Set(figs.map((f) => f.kind))];
  ctx.plinths = {
    list, figures: figs.map((f) => ({ kind: f.kind, bronze: f.bronze, S: +f.S.toFixed(2) })),
    stats: () => ({ calls: 2, tris: Math.round(tris), stoneTris: sGeo.attributes.position.count / 3, feetTris: fGeo.index.count / 3, pairs: PLINTHS.pairs, spacing: PLINTHS.spacing, standing, broken, fallen, slabs, kinds: kinds.length, buildMs: Math.round(t1 - t0) }),
  };
  ctx.log?.(`plinths: ${PLINTHS.pairs} pairs every ${PLINTHS.spacing} m (${standing} standing, ${broken} broken, ${fallen} fallen), ${slabs} slabs, ${kinds.length} kinds of feet; ${Math.round(tris / 1000)}k tris, ${Math.round(t1 - t0)} ms`);
}
