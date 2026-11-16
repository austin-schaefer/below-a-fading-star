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
// Where a riser's face is left open for a way or an undercroft: { riser, run, s0, s1 }. A way's kit adds its own
// before the bones are built (buildWays' `claim` pass), so a quarter's stair cuts its slot the same way.
function planOpenings() {
  const out = [];
  for (const p of PLAN.PLOTS) if (p.kind === 'shop' && p.against) out.push({ riser: p.against, run: p.run, s0: p.s - p.w / 2 + 0.5, s1: p.s + p.w / 2 - 0.5, why: p.name, vault: true });
  return out;
}

export async function build(ctx) {
  const off = new URL(location.href).searchParams.get('lappet') === '0';
  const low = ctx.quality === 'low';
  const T = ctx.terrain, N2 = ctx.noise.noise2;
  const lappet = (ctx.lappet = { plan: PLAN, on: !off, floors: {}, openings: planOpenings(), holes: [], colliders: 0, ways: {}, built: {}, Mesher });
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
    let k = 0.9 + 0.16 * n;
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
  // a battered face from below the lower tread to the nosing's bevel, in 2 m stations; left open where the plan or a
  // way opens it; a socket here and there in the top course (a triangle let 0.7 m into the block, its purpose gone)
  const SOCKETS = [{ riser: 'rim', run: 1, s: 11 }, { riser: 'rim', run: 2, s: 20 }, { riser: 'high', run: 2, s: 17.5 }, { riser: 'mid', run: 1, s: 12 }];
  const walls = []; // { riser, run, s0, s1 } the stretches of face that stand, for the colliders
  for (const R of RISERS.slice(0, 4)) for (const run of [1, 2]) {
    const sa = run === 1 ? S1 : cornerS(2, R.D), sb = run === 1 ? cornerS(1, R.D) : S2, n = Math.ceil((sb - sa) / 2), ds = (sb - sa) / n;
    const yb = R.foot - 0.6, yt = R.top - NOSE, dark = R.key === 'low' ? 0.8 : 0.92;
    let start = null;
    // stations every 2 m, and one at each edge of an opening, so a gap is exactly as wide as what is let into it
    const cutsAt = [];
    for (let i = 0; i <= n; i++) cutsAt.push(sa + i * ds);
    for (const o of lappet.openings) if (o.riser === R.key && o.run === run) for (const e of [o.s0, o.s1]) if (e > sa + 0.05 && e < sb - 0.05) cutsAt.push(e);
    cutsAt.sort((p, q) => p - q);
    for (let i = 0; i < cutsAt.length - 1; i++) {
      const s0 = cutsAt[i], s1 = cutsAt[i + 1], sm = (s0 + s1) / 2;
      if (s1 - s0 < 0.02) continue;
      if (openAt(R.key, run, sm)) { if (start !== null) { walls.push({ riser: R, run, s0: start, s1: s0 }); start = null; } continue; }
      if (start === null) start = s0;
      const f = (s, y, out) => { const [x, z] = at(run, s, R.D + out); return [x, y, z]; };
      const nn = [RUN[run].n[0], 0.05, RUN[run].n[1]];
      const cb = shade(dark * 0.74, 0.02), ct = shade(dark * (0.95 + 0.1 * hash(i + R.D)), 0.02);
      const sock = SOCKETS.find((k) => k.riser === R.key && k.run === run && k.s >= s0 && k.s < s1);
      if (sock) {
        // the face round a triangle, point down, in the top course, and the niche behind it
        const ym = yt - 1.75, a = 0.72, h1 = yt - 0.32, h0 = yt - 1.5, om = mix(BATTER, 0.02, (ym - yb) / (yt - yb));
        M.quadW(nn, f(s0, yb, BATTER), f(s1, yb, BATTER), f(s1, ym, om), f(s0, ym, om), cb, cb, ct, ct);
        const BL = f(s0, ym, om), BR = f(s1, ym, om), TR = f(s1, yt, 0.02), TL = f(s0, yt, 0.02);
        const o1 = mix(BATTER, 0.02, (h1 - yb) / (yt - yb)), o0 = mix(BATTER, 0.02, (h0 - yb) / (yt - yb));
        const T1 = f(sm - a, h1, o1), T2 = f(sm + a, h1, o1), T3 = f(sm, h0, o0);
        for (const t of [[BL, BR, T3], [BL, T3, T1], [BL, T1, TL], [TL, T1, T2], [TL, T2, TR], [TR, T2, BR], [T2, T3, BR]]) M.triW(nn, t[0], t[1], t[2], ct);
        const dk = shade(0.3, 0.05), b1 = f(sm - a * 0.8, h1 - 0.05, -0.7), b2 = f(sm + a * 0.8, h1 - 0.05, -0.7), b3 = f(sm, h0 + 0.15, -0.7);
        const ctr = [(T1[0] + T2[0] + T3[0]) / 3, (T1[1] + T2[1] + T3[1]) / 3, (T1[2] + T2[2] + T3[2]) / 3];
        for (const [p, q, r, u] of [[T1, T3, b3, b1], [T3, T2, b2, b3], [T2, T1, b1, b2]]) M.quadW([ctr[0] - (p[0] + q[0]) / 2, ctr[1] - (p[1] + q[1]) / 2, ctr[2] - (p[2] + q[2]) / 2], p, q, r, u, ct, ct, dk, dk);
        M.triW(nn, b1, b3, b2, dk);
      } else M.quadW(nn, f(s0, yb, BATTER), f(s1, yb, BATTER), f(s1, yt, 0.02), f(s0, yt, 0.02), cb, cb, ct, ct);
      // the nosing: worn off at a slope, then the tread
      const cn = shade(1.04, 0.02);
      M.quadW([nn[0], 1, nn[2]], f(s0, yt, 0.02), f(s1, yt, 0.02), f(s1, R.top, -NOSE), f(s0, R.top, -NOSE), ct, ct, cn, cn);
    }
    if (start !== null) walls.push({ riser: R, run, s0: start, s1: sb });
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
        M.block(x, y + hb * 0.45, z, 1 + rng() * 0.6, hb, 0.7 + rng() * 0.4, rng() * 6.28, (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.4, shade(0.8 + 0.1 * rng(), 0.02), 0.2, s + 3);
        ctx.addCollider({ x, z, r: 1.0, y: y - 1, h: hb * 1.2 + 1 }); lappet.colliders++;
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

  // ---------------------------------------------------------------- the stone
  const stone = ctx.kit.masonry({ color: '#8f8272', course: 2, base: -2, joint: 0.02, slab: 4.6, wear: 0.85, moss: 0.5 });
  etch(stone.mat, { size: 1.9, amount: 0.5 });
  stone.mat.vertexColors = true;
  lappet.elderMat = stone.mat;
  const mesh = new THREE.Mesh(M.geometry(), stone.mat);
  mesh.name = 'lappet-bones'; mesh.castShadow = true; mesh.receiveShadow = true;
  ctx.scene.add(mesh);

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
      return b > 33 && b < 74 ? y : null;
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
  lappet.stats = () => ({ bones: M.triangles, ...w.stats() });
  ctx.log(`lappet: the bones ${M.triangles} tris, ${walls.length} walls, ${endBlocks.length} end blocks, ${lappet.colliders} colliders; the ways ${JSON.stringify(w.stats())}`);
}
