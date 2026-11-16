// The Lappet's bones (v15-V0): the Elder stair under Carcanet Keep, uncovered. Three giant steps of cyclopean block
// (and the crown's rim above them, the half-buried fourth below), built over the terraces the Demesne's height hook
// cuts (src/v4/regions/height/demesne.js) from the one plan (src/v15/plan.js). One merged mesh in the Elder stone
// (`lappet-bones`); each tread a stacked floor whose edges hold; a wall along each riser's foot. Then the ways
// (src/v15/ways/): the Heliarch stair, the Late flights, the ladder, the tube, the ramp, the bridge and roof kit.
// ctx.lappet = { plan, elderMat, floors, openings, ways: { ...the kit }, built: { ...what V0 placed } } for the quarters.
// ?lappet=0 leaves the masonry and the ways out (the ground stays cut: the height field has no switch).
import * as THREE from 'three';
import * as PLAN from './plan.js';
import { etch } from '../v4/span/etch.js';
import { buildWays } from './ways/index.js';

const { RISERS, LEVEL, FADE, APRON, at, cornerS, frameOf, RUN } = PLAN;
const S1 = FADE.s1[1], S2 = FADE.s2[0]; // the steps are whole from run 1's S1 to run 2's S2
export const NOSE = 0.22; // the nosing's worn bevel
const BATTER = 0.2; // a riser's foot stands this far out from its head

// a small mesher: position, normal, colour; flat-shaded quads and triangles, wound counter-clockwise seen from outside
export class Mesher {
  constructor() { this.P = []; this.N = []; this.C = []; this.I = []; this.n = 0; }
  tri(a, b, c, col = WHITE, cb = col, cc = col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); this.N.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    this.C.push(col[0], col[1], col[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]); this.I.push(this.n, this.n + 1, this.n + 2); this.n += 3;
  }
  // a quad a-b-c-d (counter-clockwise from outside), one colour a corner
  quad(a, b, c, d, ca = WHITE, cb = ca, cc = ca, cd = ca) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    this.P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
    for (let i = 0; i < 4; i++) this.N.push(nx, ny, nz);
    this.C.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2], cd[0], cd[1], cd[2]);
    this.I.push(this.n, this.n + 1, this.n + 2, this.n, this.n + 2, this.n + 3); this.n += 4;
  }
  // the same, turned so that they face `want` (a direction, not unit): no winding to get wrong
  quadW(want, a, b, c, d, ca = WHITE, cb = ca, cc = ca, cd = ca) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    if ((uy * vz - uz * vy) * want[0] + (uz * vx - ux * vz) * want[1] + (ux * vy - uy * vx) * want[2] < 0) this.quad(d, c, b, a, cd, cc, cb, ca);
    else this.quad(a, b, c, d, ca, cb, cc, cd);
  }
  triW(want, a, b, c, col = WHITE) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    if ((uy * vz - uz * vy) * want[0] + (uz * vx - ux * vz) * want[1] + (ux * vy - uy * vx) * want[2] < 0) this.tri(a, c, b, col); else this.tri(a, b, c, col);
  }
  // a block: centre (x, y, z), half sizes along its own axes, yaw, and a lean (rx, rz); every face closed. chip: its
  // top corners knocked in by that much (per corner, from the hash h)
  block(x, y, z, hx, hy, hz, yaw, rx = 0, rz = 0, col = WHITE, chip = 0, h = 0) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cxr = Math.cos(rx), sxr = Math.sin(rx), czr = Math.cos(rz), szr = Math.sin(rz);
    const v = [];
    for (let k = 0; k < 8; k++) {
      let px = (k & 1 ? 1 : -1) * hx, py = (k & 2 ? 1 : -1) * hy, pz = (k & 4 ? 1 : -1) * hz;
      if (chip && (k & 2)) { const q = hash(h + k * 7.31); px -= Math.sign(px) * chip * q; pz -= Math.sign(pz) * chip * (1 - q); py -= chip * 0.6 * hash(h + k * 3.7); }
      let t = py * cxr - pz * sxr; pz = py * sxr + pz * cxr; py = t; // lean about x
      t = px * czr - py * szr; py = px * szr + py * czr; px = t; // lean about z
      v.push([x + px * cy + pz * sy, y + py, z - px * sy + pz * cy]);
    }
    const f = (a, b, c, d) => this.quadW([(v[a][0] + v[c][0]) / 2 - x, (v[a][1] + v[c][1]) / 2 - y, (v[a][2] + v[c][2]) / 2 - z], v[a], v[b], v[c], v[d], col);
    f(2, 6, 7, 3); f(0, 1, 5, 4); f(4, 5, 7, 6); f(1, 0, 2, 3); f(5, 1, 3, 7); f(0, 4, 6, 2);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.P), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.N), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.C), 3));
    g.setIndex(new THREE.BufferAttribute(this.n > 65535 ? new Uint32Array(this.I) : new Uint16Array(this.I), 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  get triangles() { return this.I.length / 3; }
}
const WHITE = [1, 1, 1], UP = [0, 1, 0];
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const mix = (a, b, t) => a + (b - a) * t;
const shade = (k, warm = 0) => [k * (1 + warm), k, k * (1 - warm * 1.4)];

// ---------------------------------------------------------------- openings and holes (from the plan)
// Where a riser's face is left open for a way or an undercroft: { riser, run, s0, s1 }. A plot declares its own in
// the plan (`opening`), so a quarter never edits this file; V0's own ways add theirs in buildWays' `claim` pass.
function planOpenings() {
  const out = [];
  for (const p of PLAN.PLOTS) if (p.opening) out.push({ riser: p.opening.riser, run: p.run, s0: p.s - p.opening.width / 2, s1: p.s + p.opening.width / 2, why: p.name, vault: p.kind === 'shop' });
  return out;
}

export async function build(ctx) {
  const off = new URL(location.href).searchParams.get('lappet') === '0';
  const low = ctx.quality === 'low';
  const T = ctx.terrain, N2 = ctx.noise.noise2;
  const lappet = (ctx.lappet = { plan: PLAN, on: !off, floors: {}, openings: planOpenings(), holes: [], kerbs: [], colliders: 0, ways: {}, built: {}, Mesher });
  if (off) { ctx.log('lappet: off (?lappet=0)'); return; }

  // the ways claim their openings (a gap in a riser's face) and holes (a slot cut in a tread) before the stone is laid
  const ways = buildWays(ctx, lappet);
  ways.claim();

  const M = new Mesher();
  const openAt = (riser, run, s) => lappet.openings.some((o) => o.riser === riser && o.run === run && s > o.s0 && s < o.s1);
  const inHole = (level, run, s, D) => lappet.holes.some((h) => h.level === level && h.run === run && s > h.s0 && s < h.s1 && D > h.D0 && D < h.D1);

  // ---------------------------------------------------------------- the treads
  // each a strip between two riser lines along both runs, mitred at the corner, in cells of about 1.3 m; the vertex
  // colour carries the wear: damp and dark under the riser behind, pale where feet go, blotched
  const bands = [
    { level: 'crown', y: LEVEL.crown.y, D0: RISERS[0].D - APRON, D1: RISERS[0].D },
    { level: 'high', y: LEVEL.high.y, D0: RISERS[0].D, D1: RISERS[1].D },
    { level: 'mid', y: LEVEL.mid.y, D0: RISERS[1].D, D1: RISERS[2].D },
    { level: 'low', y: LEVEL.low.y, D0: RISERS[2].D, D1: RISERS[3].D },
  ];
  const lanes = { crown: null, high: 0, mid: 9.1, low: 14.5 };
  const tone = (level, x, z, D, D0) => {
    const n = N2(x * 0.11, z * 0.11) * 0.5 + N2(x * 0.43 + 7, z * 0.43) * 0.25;
    let k = 1.04 + 0.16 * n; // (paler than the risers: the whole sector is in the keep's shadow, and the steps read by value)
    if (level !== 'crown') k *= mix(0.66, 1, Math.min(1, (D - D0) / 1.6)); // the riser's foot: damp, mossed
    const ln = lanes[level];
    if (ln !== null) k *= 1 + 0.2 * Math.max(0, 1 - Math.abs(D - ln) / (level === 'high' ? 2.6 : 1)); // the trodden line
    else k *= 1.06; // the masons' ground, dusted with lime
    return shade(k, level === 'crown' ? 0.02 : 0.035 * (N2(x * 0.07 + 3, z * 0.07) + 0.4));
  };
  for (const b of bands) for (const run of [1, 2]) {
    const nD = Math.max(2, Math.round((b.D1 - b.D0) / 1.35)), inner = b.level === 'crown' ? 0 : NOSE * 0;
    const Dv = (j) => mix(b.D0 + inner, b.D1 - NOSE, j / nD);
    const sRange = (D) => (run === 1 ? [S1, cornerS(1, D)] : [cornerS(2, D), S2]);
    const len = RUN[run].len, nS = Math.round((run === 1 ? len - S1 : S2) / 1.4);
    const P = (i, j) => { const D = Dv(j), [a, e] = sRange(D), s = mix(a, e, i / nS), [x, z] = at(run, s, D); const sag = lanes[b.level] !== null ? 0.035 * Math.max(0, 1 - Math.abs(D - lanes[b.level]) / 1.2) : 0; return { p: [x, b.y - sag, z], c: tone(b.level, x, z, D, b.D0), s, D }; };
    for (let j = 0; j < nD; j++) for (let i = 0; i < nS; i++) {
      const a = P(i, j), q = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      // a cell a hole reaches into is laid in ninths of a ninth, less those in the hole (a way's cheeks cover the saw edge)
      if (lappet.holes.some((h) => h.level === b.level && h.run === run && Math.max(a.s, q.s, c.s, d.s) > h.s0 && Math.min(a.s, q.s, c.s, d.s) < h.s1 && Math.max(a.D, d.D) > h.D0 && Math.min(a.D, d.D) < h.D1)) {
        const K = 9, L3 = (u, v, k) => mix(mix(a.p[k], q.p[k], u), mix(d.p[k], c.p[k], u), v), pt = (u, v) => [L3(u, v, 0), L3(u, v, 1), L3(u, v, 2)];
        for (let v = 0; v < K; v++) for (let u = 0; u < K; u++) {
          const um = (u + 0.5) / K, vm = (v + 0.5) / K;
          if (inHole(b.level, run, mix(mix(a.s, q.s, um), mix(d.s, c.s, um), vm), mix(a.D, d.D, vm))) continue;
          M.quadW(UP, pt(u / K, v / K), pt(u / K, (v + 1) / K), pt((u + 1) / K, (v + 1) / K), pt((u + 1) / K, v / K), a.c);
        }
        continue;
      }
      M.quadW(UP, a.p, d.p, c.p, q.p, a.c, d.c, c.c, q.c);
    }
  }

  // ---------------------------------------------------------------- the risers
  // Cyclopean, and not for us: each face is a few polygonal blocks 2.6 to 5.4 m long, one or two to the riser's
  // height, their joints leaning and kinked, no two alike. Every block's face stands a hand proud of its joints, so
  // the joints are grooves cut in the geometry and read in the keep's shadow and on low. Left open where the plan or
  // a way opens the face.
  const walls = []; // { riser, run, s0, s1 } the stretches of face that stand, for the colliders
  const PROUD = 0.13, GROOVE = 0.15, grooveC = shade(0.3, 0.02);
  // one face: o = { sa, sb (along it), yb, yt, f(s, y, proud) -> [x, y, z], want(s) -> the way it looks, seedA,
  // seedB, dark, stretches: [[s0, s1], ...] that stand, top(sA, sB, lean...) optional }
  const face = (o) => {
    const { yb, yt, f, want, dark } = o, H = yt - yb;
    const hs = (k) => hash(o.seedA * 3.17 + o.seedB * 17.3 + k * 5.71);
    const panel = (poly, k) => {
      let cs = 0, cy = 0; for (const [ps, py] of poly) { cs += ps; cy += py; } cs /= poly.length; cy /= poly.length;
      const nn = want(cs), tone = dark * (0.82 + 0.24 * hs(k + 0.5)), warm = 0.015 + 0.03 * hs(k + 0.9);
      const col = (y) => shade(tone * mix(0.72, 1.02, (y - yb) / H), warm);
      const inner = poly.map(([ps, py]) => { const d = Math.hypot(cs - ps, cy - py) || 1, t = Math.min(0.3, GROOVE * 1.5 / d); return [ps + (cs - ps) * t, py + (cy - py) * t]; });
      const O = poly.map(([ps, py]) => f(ps, py, 0)), I = inner.map(([ps, py]) => f(ps, py, PROUD)), C = f(cs, cy, PROUD * 1.5);
      for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length, ci = col(inner[i][1]), cj = col(inner[j][1]);
        M.quadW(nn, O[i], O[j], I[j], I[i], grooveC, grooveC, cj, ci);
        M.triW(nn, I[i], I[j], C, col((inner[i][1] + inner[j][1] + cy) / 3));
      }
    };
    let k = 0;
    for (const [a, b] of o.stretches) {
      const cols = [a];
      while (b - cols[cols.length - 1] > 6.4) cols.push(cols[cols.length - 1] + 2.6 + 2.8 * hs(k++ + a));
      const rem = b - cols[cols.length - 1];
      if (rem > 5.4) cols.push(cols[cols.length - 1] + rem * (0.4 + 0.2 * hs(k++)));
      else if (rem < 1.5 && cols.length > 1) cols.pop();
      cols.push(b);
      const lean = cols.map((c, i) => (i === 0 || i === cols.length - 1 ? 0 : (hs(c) - 0.5) * 0.8)); // a joint's foot stands this far along from its head
      for (let i = 0; i < cols.length - 1; i++, k++) {
        const s0 = cols[i], s1 = cols[i + 1], l0 = lean[i], l1 = lean[i + 1];
        const L = (y) => s0 + l0 * (1 - 2 * (y - yb) / H) * 0.5, Rr = (y) => s1 + l1 * (1 - 2 * (y - yb) / H) * 0.5;
        const two = H > 3.6 ? hs(k + 0.2) < 0.72 : hs(k + 0.2) < 0.3;
        if (!two || s1 - s0 < 1.6) panel([[L(yb), yb], [Rr(yb), yb], [Rr(yt), yt], [L(yt), yt]], k);
        else {
          // two courses, the bed joint stepped: it lies at one height from the left, drops or climbs at a kink, and runs on
          const hl = yb + H * (0.36 + 0.3 * hs(k + 0.3)), hr = yb + H * (0.36 + 0.3 * hs(k + 0.4)), sm = mix(s0, s1, 0.3 + 0.4 * hs(k + 0.6)), kk = 0.25 * (hs(k + 0.7) - 0.5);
          panel([[L(yb), yb], [Rr(yb), yb], [Rr(hr), hr], [sm + kk, hr], [sm - kk, hl], [L(hl), hl]], k);
          panel([[L(hl), hl], [sm - kk, hl], [sm + kk, hr], [Rr(hr), hr], [Rr(yt), yt], [L(yt), yt]], k + 0.45);
        }
        o.top?.(L(yt), Rr(yt));
      }
    }
  };
  for (const R of RISERS.slice(0, 4)) for (const run of [1, 2]) {
    const sa = run === 1 ? S1 : cornerS(2, R.D), sb = run === 1 ? cornerS(1, R.D) : S2;
    const yb = R.foot - 0.6, yt = R.top - NOSE, H = yt - yb, dark = R.key === 'low' ? 0.8 : 0.92;
    const nn = [RUN[run].n[0], 0.05, RUN[run].n[1]];
    // the standing stretches between the openings
    const ops = lappet.openings.filter((o) => o.riser === R.key && o.run === run).map((o) => [Math.max(sa, o.s0), Math.min(sb, o.s1)]).filter((o) => o[1] > o[0]).sort((p, q) => p[0] - q[0]);
    const stretches = []; let sAt = sa;
    for (const [o0, o1] of ops) { if (o0 - sAt > 0.05) stretches.push([sAt, o0]); sAt = Math.max(sAt, o1); }
    if (sb - sAt > 0.05) stretches.push([sAt, sb]);
    for (const [a, b] of stretches) walls.push({ riser: R, run, s0: a, s1: b });
    const cn = shade(1.04, 0.02), ct = shade(dark, 0.02), g = (s, y, out) => { const [x, z] = at(run, s, R.D + out); return [x, y, z]; };
    face({ yb, yt, dark, seedA: R.D, seedB: run, stretches, want: () => nn,
      f: (s, y, proud = 0) => { const [x, z] = at(run, s, R.D + mix(BATTER, 0.02, (y - yb) / H) + proud); return [x, y, z]; },
      // the nosing: worn off at a slope, then the tread
      top: (sA, sB) => M.quadW([nn[0], 1, nn[2]], g(sA, yt, 0.02), g(sB, yt, 0.02), g(sB, R.top, -NOSE), g(sA, R.top, -NOSE), ct, ct, cn, cn) });
  }
  // the lowest riser, over the Pennyworth: the same hand. It stands a hand in front of the Demesne's sunk wall (the
  // Heliarchy's small coursed work, which runs on west of the house's corner as the lawn's ha-ha): here the turf is
  // dug away to the foot and the giants' face is bare, bearings 38.5 to 72, from under the foot's ground to the bench.
  {
    const HR = RISERS[4], r0 = PLAN.HAHA + 0.06, yb = HR.foot - 0.8, yt = HR.top - 0.04, H = yt - yb, k = Math.PI / 180;
    const pos = (b, rr, y) => { const [x, z] = PLAN.polar(b, rr); return [x, y, z]; }, bOf = (s) => 38.5 + s / (r0 * k);
    const len = (72 - 38.5) * r0 * k, cn = shade(1.0, 0.02), ct = shade(0.8, 0.02);
    face({ yb, yt, dark: 0.8, seedA: 7.7, seedB: 5, stretches: [[0, len]], want: (s) => { const b = bOf(s) * k; return [Math.sin(b), 0.05, -Math.cos(b)]; },
      f: (s, y, proud = 0) => pos(bOf(s), r0 + mix(BATTER, 0.02, (y - yb) / H) + proud, y),
      top: (sA, sB) => M.quadW(UP, pos(bOf(sA), r0 + 0.02, yt), pos(bOf(sB), r0 + 0.02, yt), pos(bOf(sB), r0 - 0.5, HR.top + 0.01), pos(bOf(sA), r0 - 0.5, HR.top + 0.01), ct, ct, cn, cn) });
  }
  // the cheeks of each opening: the step's own mass, seen where a way is cut through it (1.2 m back; a way's lining goes deeper)
  for (const o of lappet.openings) {
    const R = RISERS.find((r) => r.key === o.riser), yb = R.foot - 0.6, dk = shade(0.5, 0.03);
    for (const [s, sg] of [[o.s0, 1], [o.s1, -1]]) {
      const p = (D, y) => { const [x, z] = at(o.run, s, D); return [x, y, z]; };
      const q = [p(R.D + BATTER, yb), p(R.D - 1.2, yb), p(R.D - 1.2, R.top), p(R.D - NOSE, R.top)];
      M.quadW([RUN[o.run].dir[0] * sg, 0, RUN[o.run].dir[1] * sg], q[0], q[1], q[2], q[3], dk);
    }
  }

  // ---------------------------------------------------------------- the ends: the steps going back under the turf
  // Past each end the hill is still the buried stair: the risers run on as single blocks, each as tall as the ground
  // still steps there, canted and sunk as the turf took them, with a few thrown down the slope.
  const endBlocks = [];
  const rng = ctx.makeRng(15001);
  for (const R of RISERS.slice(0, 4)) for (const [run, sFrom, sTo] of [[1, S1, FADE.s1[0] - 2], [2, S2, FADE.s2[1] + 2]]) {
    const dir = Math.sign(sTo - sFrom), yaw = Math.atan2(RUN[run].dir[0], RUN[run].dir[1]) - Math.PI / 2;
    let s = sFrom;
    while ((sTo - s) * dir > 0.5) {
      const L = 2.3 + rng() * 1.5, sm = s + dir * L / 2, t = Math.abs(sm - sFrom) / Math.abs(sTo - sFrom);
      const [xi, zi] = at(run, sm, R.D - 0.9), [xo, zo] = at(run, sm, R.D + 0.9), yU = T.heightAt(xi, zi), yL = T.heightAt(xo, zo);
      const top = Math.min(R.top, yU + 0.15 + 0.5 * (1 - t) * rng()), bot = Math.min(yL, yU) - 0.9, h = top - bot;
      const gone = rng() < t * 0.35;
      if (h > 1.0 && !gone) {
        const [x, z] = at(run, sm, R.D - 0.75 + t * (rng() - 0.3) * 0.9);
        const b = { x, z, y: bot + h / 2, hx: L / 2 - 0.04, hy: h / 2, hz: 0.95, yaw: yaw + (rng() - 0.5) * 0.22 * t, rx: (rng() - 0.5) * 0.16 * t, rz: (rng() - 0.5) * 0.1 * t, top, bot, face: yU - yL };
        endBlocks.push(b);
        M.block(b.x, b.y, b.z, b.hx, b.hy, b.hz, b.yaw, b.rx, b.rz, shade(0.84 + 0.12 * rng(), 0.02), 0.16, s);
      } else rng();
      // one thrown down the slope now and then
      if (rng() < 0.3 * t + (gone ? 0.5 : 0)) {
        const [x, z] = at(run, sm + (rng() - 0.5) * 2, R.D + 2 + rng() * 3.5), y = T.heightAt(x, z), hb = 0.5 + rng() * 0.5;
        // (never onto a plot: one lay across the Strake's Late door, v15-V1 round 4. The dice are thrown all the same,
        // so every other block lies where it lay.)
        const bw = 1 + rng() * 0.6, bd = 0.7 + rng() * 0.4, ry = rng() * 6.28, rx = (rng() - 0.5) * 0.5, rz = (rng() - 0.5) * 0.4, sh = shade(0.8 + 0.1 * rng(), 0.02);
        if (!PLAN.PLOTS.some((p) => PLAN.inPlot(p, x, z, 1.4))) {
          M.block(x, y + hb * 0.45, z, bw, hb, bd, ry, rx, rz, sh, 0.2, s + 3);
          ctx.addCollider({ x, z, r: 1.0, y: y - 1, h: hb * 1.2 + 1 }); lappet.colliders++;
        }
      }
      s += dir * L;
    }
  }
  // the slab zone's own ends: each tread's end face, down into the turf (the ground there is the tread's level or a
  // little under it; this closes the slab's edge)
  for (const b of bands) for (const [run, s, sg] of [[1, S1, 1], [2, S2, -1]]) {
    const p = (D, y) => { const [x, z] = at(run, s, D); return [x, y, z]; }, dk = shade(0.6, 0.03);
    const q = [p(b.D0, b.y), p(b.D1 - NOSE, b.y), p(b.D1 - NOSE, b.y - 1.6), p(b.D0, b.y - 1.6)];
    M.quadW([-RUN[run].dir[0] * sg, 0, -RUN[run].dir[1] * sg], q[0], q[1], q[2], q[3], dk);
  }

  // ---------------------------------------------------------------- the floors: each tread a stacked floor, its edges held
  const fr = { run: 0, s: 0, D: 0 };
  for (const b of bands) {
    const fn = (x, z) => {
      if (x < 40 || x > 122 || z < -50 || z > 36) return null;
      frameOf(x, z, fr);
      if (fr.D < b.D0 || fr.D >= b.D1) return null;
      if (fr.run === 1 ? fr.s < S1 : fr.s > S2) return null;
      for (const h of lappet.holes) if (h.level === b.level && h.run === fr.run && fr.s > h.s0 && fr.s < h.s1 && fr.D > h.D0 && fr.D < h.D1) return null;
      return b.y;
    };
    lappet.floors[b.level] = fn;
    ctx.addWalkable(fn, { stack: true, keep: true, name: `lappet-${b.level}` });
  }
  // the bench's edge over the lowest riser (the old ha-ha), where the foot is the Pennyworth: held as the treads are
  {
    const y = LEVEL.bench.y;
    const fn = (x, z) => {
      const dx = x - PLAN.KEEP.x, dz = z - PLAN.KEEP.z, r2 = dx * dx + dz * dz;
      if (r2 < 73.5 * 73.5 || r2 >= PLAN.HAHA * PLAN.HAHA) return null;
      const b = PLAN.bearingOf(x, z);
      return b > 37.5 && b < 74 ? y : null; // (west of 37.5 the house's own corner stands on the edge)
    };
    lappet.floors.bench = fn;
    ctx.addWalkable(fn, { stack: true, keep: true, name: 'lappet-bench-edge' });
  }

  // ---------------------------------------------------------------- the walls: nobody walks into a riser from below
  for (const w of walls) {
    const R = w.riser, n = Math.max(1, Math.round((w.s1 - w.s0) / 9));
    for (let i = 0; i < n; i++) {
      const a = at(w.run, mix(w.s0, w.s1, i / n), R.D - 0.3), b = at(w.run, mix(w.s0, w.s1, (i + 1) / n), R.D - 0.3);
      ctx.addCollider({ x1: a[0], z1: a[1], x2: b[0], z2: b[1], r: 0.3, y: R.foot - 1.2, h: R.top - R.foot + 1.2 }); lappet.colliders++;
    }
  }
  for (const b of endBlocks) {
    if (b.face < 0.9) continue;
    const dx = Math.cos(b.yaw) * b.hx, dz = -Math.sin(b.yaw) * b.hx;
    ctx.addCollider({ x1: b.x - dx, z1: b.z - dz, x2: b.x + dx, z2: b.z + dz, r: 0.75, y: b.bot, h: b.top - b.bot }); lappet.colliders++;
  }

  // ---------------------------------------------------------------- the ways
  const w = ways.build();

  // the Elder kerb along the High Rung's nosing (the ways' plan says where: lappet.kerbs), of the steps' own block
  for (const b of lappet.kerbs) M.block(b.x, b.y, b.z, b.hx, b.hy, b.hz, b.yaw, 0, 0, shade(0.86 + 0.14 * hash(b.seed), 0.02), 0.07, b.seed);

  // ---------------------------------------------------------------- the stone
  // (no courses drawn on a face: the blocks and their joints are geometry; the treads keep their great slabs)
  const stone = ctx.kit.masonry({ color: '#8f8272', course: 60, base: -40, joint: 0.02, slab: 4.6, wear: 0.85, moss: 0.5 });
  etch(stone.mat, { size: 3.8, amount: 0.3 });
  stone.mat.vertexColors = true;
  lappet.elderMat = stone.mat;
  const mesh = new THREE.Mesh(M.geometry(), stone.mat);
  mesh.name = 'lappet-bones'; mesh.castShadow = !low; // (on low nothing of the village throws a shadow: the whole sector lies in the keep's, and the valley's cost from above is at its limit)
  mesh.receiveShadow = true;
  ctx.scene.add(mesh);

  // On low, from more than 330 m off (the west gallery and the Stair's deck look down the whole valley, and its cost
  // from above is at its limit: tools/heights-cost.mjs), the village is drawn as its steps alone: the ways' timber
  // and the main's ware, and the masons' twelve blocks on the crown, are too small to see from there.
  if (low) {
    let small = null, far = false;
    ctx.registerUpdate(() => {
      if (!small) small = ['lappet-ways-stone', 'lappet-ways-glass', 'demesne-blocks'].map((n) => ctx.scene.getObjectByName(n)).filter(Boolean);
      const c = ctx.camera.position, f = Math.hypot(c.x - 80, c.z + 12) > 330;
      if (f !== far) { far = f; for (const m of small) m.visible = !f; }
    }); // (every frame, unthrottled: a distance and a compare)
  }
  lappet.stats = () => ({ bones: M.triangles, ...w.stats() });
  ctx.log(`lappet: the bones ${M.triangles} tris, ${walls.length} walls, ${endBlocks.length} end blocks, ${lappet.colliders} colliders; the ways ${JSON.stringify(w.stats())}`);
}
