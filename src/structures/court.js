// The Sunken Court (v5 recast, the awe audit): the floor of something vast, in the age of weight. A grid of
// octagonal piers 6.6 m thick at the foot, battered straight, on 12 m centres, each face cut by one broad channel,
// each foot shod in bronze to a door's height; all but two are stumps a few courses high. Those two stand to 35 m,
// each with a springer leaning out along the nave toward the other, the arch they began gone: the north one broken
// across its top, the south one capped with an empty bronze socket for a beam that was never set. A third lies where
// it fell, in four lengths down the east aisle over the stumps it crushed. On the west rim an empty bronze shoe
// stands on its footing with no pier in it. The flooded shaft stays in the nave, its stair opening north toward the
// paving where the Hawser (BA) comes to ground (COURT.hawser). `?court=v2` builds the colonnades and the fallen
// crowned head instead (court/v2.js); only one of the two is ever built.
// Draws: the masonry (kit stone, courses diminishing as they rise), the bronze, the shaft's interior quad, and the
// measure figures; none in the structures' merged stone mesh.
import * as THREE from 'three';
import { mergeGeometries } from '../v4/kit/merge.js';
import { LANDMARKS } from '../world.js';
import { colliderChain } from './common.js';
import { makePitMaterial } from './materials.js';
import { buildCourtV2 } from './court/v2.js';

const V2 = typeof location !== 'undefined' && new URLSearchParams(location.search).get('court') === 'v2';

const L = LANDMARKS.court;
// a pier: apothem a0 at the floor narrowing straight to a1 at 35 m (no entasis); the channel's width (fraction of
// the face) and depth (fraction of the apothem); the bronze shoe's height and how far it stands proud
const PIER = { a0: 3.3, a1: 2.2, H: 35, chW: 0.46, chD: 0.13, shoe: 3.2, proud: 0.16 };
// the plan, in metres from the court's centre: the nave at x ±10.5, the aisles at x ±22.5, rows 12 m apart.
// h is a stump's height; 'tall' the two uprights; 'fell' the base of the fallen one; 'shoe' the empty shoe;
// 'torn' a shoe torn down to its plinth band (the rest are torn or not by the site's rng).
const PLAN = [
  [-10.5, -18, 2.6], [-10.5, -6, 'tall'], [-10.5, 6, 4.4], [-10.5, 18, 1.7], [-10.5, 30, 3.3],
  [10.5, -18, 3.9], [10.5, -6, 1.4], [10.5, 6, 5.6], [10.5, 18, 'tall'], [10.5, 30, 2.2],
  [-22.5, -18, 1.1], [-22.5, -6, 0.6, 'torn'], [-22.5, 6, 0.9], [-22.5, 18, 4.8],
  [22.5, -18, 'fell'], [22.5, -6, 0.5, 'torn'], [22.5, 6, 0.7, 'torn'], [22.5, 18, 0.6, 'torn'],
  [-34.5, -6, 'shoe'], [-34.5, 6, 0.7],
];
// the shaft in the nave (as v2's), and the point on the nave's axis where the Hawser's cable meets the paving: its
// corridor runs from here north-north-west to (-120, -380), clear of every pier (the nave's z -30 row is left out)
export const COURT = {
  pier: PIER,
  pit: { x0: L.x - 5, x1: L.x + 5, z0: L.z - 11, z1: L.z + 9 },
  hawser: { x: L.x, z: L.z - 24 },
};

export function buildCourt(ctx, B, env) {
  return V2 ? buildCourtV2(ctx, B, env) : buildCourtV5(ctx, B, env);
}

const apothem = (y) => PIER.a0 + (PIER.a1 - PIER.a0) * Math.min(1, Math.max(0, y) / PIER.H);
const RC = 1 / Math.cos(Math.PI / 8); // an octagon's corner radius over its apothem

function buildCourtV5(ctx, B, env) {
  const { rng, ground } = env;
  const N2 = ctx.noise.noise2;
  const low = ctx.quality === 'low';
  const cx = L.x, cz = L.z;
  const floor = ground.groundAt(cx, cz);
  const stone = [], bronze = [];

  // ---- geometry helpers: every piece is built non-indexed in world space, then merged per material
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();
  function soup() {
    const P = [], Nn = [];
    return {
      P, Nn,
      // a flat quad wound to face `o`
      quad(a, b, c, d, o) {
        _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
        _n.crossVectors(_a, _b);
        if (_n.x * o[0] + _n.y * o[1] + _n.z * o[2] < 0) P.push(...a, ...c, ...b, ...a, ...d, ...c); else P.push(...a, ...b, ...c, ...a, ...c, ...d);
      },
      geo(list) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        if (Nn.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); else g.computeVertexNormals();
        list.push(g);
        return g;
      },
    };
  }
  const box = (list, w, h, d, m) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.applyMatrix4(m); list.push(g); };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), V = new THREE.Vector3();
  const place = (x, y, z, rx = 0, ry = 0, rz = 0) => M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(1, 1, 1));

  // the pier's section at apothem 1: eight faces (normals on the axes and diagonals), each a flat run, a channel and
  // a flat run, so the arrises stay sharp and only the channel is smooth. Points are [x, z, nx, nz]; runs go
  // counter-clockwise seen from above.
  const CHS = low ? 4 : 7;
  const section = (() => {
    const runs = [], hs = Math.tan(Math.PI / 8), cw = hs * 2 * PIER.chW / 2, dep = PIER.chD;
    for (let k = 0; k < 8; k++) {
      const f = (k * Math.PI) / 4, nx = Math.cos(f), nz = Math.sin(f), tx = -nz, tz = nx;
      const at = (u, d) => [nx * (1 - d) + tx * u, nz * (1 - d) + tz * u];
      runs.push([[...at(-hs, 0), nx, nz], [...at(-cw, 0), nx, nz]]);
      const ch = [];
      for (let i = 0; i <= CHS; i++) {
        const th = -Math.PI / 2 + (Math.PI * i) / CHS, u = cw * Math.sin(th), d = dep * Math.cos(th);
        // the channel's normal: back toward the face's own normal at the bottom, toward the sides at the edges
        const sx = -Math.sin(th), mx = nx * Math.cos(th) + tx * sx * 0.9, mz = nz * Math.cos(th) + tz * sx * 0.9, l = Math.hypot(mx, mz);
        ch.push([...at(u, d), mx / l, mz / l]);
      }
      runs.push(ch);
      runs.push([[...at(cw, 0), nx, nz], [...at(hs, 0), nx, nz]]);
    }
    return runs;
  })();
  // a length of pier between heights s0 and s1 along its own axis (s from the floor), its apothem tapering with s.
  // top(i, n) / bot(i, n) give each section point's own end (for broken ends); caps close the ends as fans.
  // `frame` maps (local x, s, local z) to world; for an upright pier it is a translation.
  function pierPiece(frame, s0, s1, opts = {}) {
    const out = soup(), P = out.P, Nn = out.Nn;
    const top = opts.top || (() => s1), bot = opts.bot || (() => s0);
    const ring = (s, x, z) => { const a = apothem(s); return frame(x * a, s, z * a); };
    let idx = 0;
    const ends = []; // per section point: [bottom s, top s]
    for (const run of section) {
      for (let i = 0; i < run.length - 1; i++) {
        const p = run[i], q = run[i + 1];
        const pb = bot(idx + i, p), pt = top(idx + i, p), qb = bot(idx + i + 1, q), qt = top(idx + i + 1, q);
        const A = ring(pb, p[0], p[1]), Bq = ring(qb, q[0], q[1]), Cq = ring(qt, q[0], q[1]), D = ring(pt, p[0], p[1]);
        const nA = frame.n(p[2], p[3]), nB = frame.n(q[2], q[3]);
        P.push(...A, ...Cq, ...Bq, ...A, ...D, ...Cq);
        Nn.push(...nA, ...nB, ...nB, ...nA, ...nA, ...nB);
      }
      for (let i = 0; i < run.length; i++) ends.push([bot(idx + i, run[i]), top(idx + i, run[i]), run[i]]);
      idx += run.length;
    }
    const g = out.geo(stone);
    // caps: fans from the axis, flat-shaded on their own so a broken end reads as broken
    const cap = (which, sMid) => {
      const c = soup(), o = frame.axis(which);
      const ctr = frame(0, sMid, 0);
      for (let i = 0; i < ends.length; i++) {
        const e0 = ends[i], e1 = ends[(i + 1) % ends.length];
        const s0e = e0[which], s1e = e1[which];
        const p0 = ring(s0e, e0[2][0], e0[2][1]), p1 = ring(s1e, e1[2][0], e1[2][1]);
        _a.set(p0[0] - ctr[0], p0[1] - ctr[1], p0[2] - ctr[2]); _b.set(p1[0] - ctr[0], p1[1] - ctr[1], p1[2] - ctr[2]);
        _n.crossVectors(_a, _b);
        if (_n.x * o[0] + _n.y * o[1] + _n.z * o[2] < 0) c.P.push(...ctr, ...p1, ...p0); else c.P.push(...ctr, ...p0, ...p1);
      }
      c.geo(stone);
    };
    if (opts.capTop !== false) cap(1, opts.topMid ?? s1);
    if (opts.capBot) cap(0, opts.botMid ?? s0);
    return g;
  }
  const upright = (x, y0, z) => {
    const f = (lx, s, lz) => [x + lx, y0 + s, z + lz];
    f.n = (nx, nz) => [nx, (PIER.a0 - PIER.a1) / PIER.H, nz];
    f.axis = (which) => (which ? [0, 1, 0] : [0, -1, 0]);
    return f;
  };
  // a broken end: the courses come away in steps, highest on one side
  const breaker = (s, amp, side, seed) => (i, p) => {
    const a = Math.atan2(p[1], p[0]);
    const lift = amp * Math.max(0, 0.5 + 0.5 * Math.cos(a - side) + 0.12 * N2(a * 1.7 + seed, seed));
    return s + Math.round(lift / 0.55) * 0.55;
  };
  // an octagonal ring (the shoes): apothem aB at y0 to aT at y1, flat faces, optionally a flat top
  function octRing(list, x, z, aB, aT, y0, y1, topCap = false, inner = 0, inward = false) {
    const o = soup(), c = (a, k, y) => { const t = (k * Math.PI) / 4 + Math.PI / 8, r = a * RC; return [x + Math.cos(t) * r, y, z + Math.sin(t) * r]; };
    for (let k = 0; k < 8; k++) {
      const f = ((k + 1) * Math.PI) / 4, sg = inward ? -1 : 1, n = [sg * Math.cos(f), 0.1 * sg, sg * Math.sin(f)];
      o.quad(c(aB, k, y0), c(aB, k + 1, y0), c(aT, k + 1, y1), c(aT, k, y1), n);
      if (topCap) {
        if (inner > 0) o.quad(c(aT, k, y1), c(aT, k + 1, y1), c(inner, k + 1, y1), c(inner, k, y1), [0, 1, 0]);
        else { const C0 = [x, y1, z]; o.P.push(...C0, ...c(aT, k + 1, y1), ...c(aT, k, y1)); }
      }
    }
    o.geo(list);
  }
  // the shoe: a plinth band, the casing to a door's height, a chamfered top edge
  function shoe(x, z, gb, top = PIER.shoe, torn = 0) {
    const a = PIER.a0 + PIER.proud;
    octRing(bronze, x, z, a + 0.2, a + 0.2, gb, floor + 0.55, true);
    octRing(bronze, x, z, a, a, floor + 0.5, floor + top - torn - 0.2);
    octRing(bronze, x, z, a, a - PIER.proud - 0.02, floor + top - torn - 0.2, floor + top - torn, true, a - PIER.proud - 0.05);
  }
  // a springer on the pier at (x, z) toward dz (+1 south, -1 north): its underside a quarter-ellipse from the face at
  // ys up to yc, L out; its top flat at yt; its end cut off, the cut leaning by `lean` (m per m of height)
  function springer(x, z, dz, ys, yc, yt, L, lean) {
    const o = soup(), w = 3.6, n = low ? 8 : 14;
    const f0 = apothem(ys) - 0.4;
    const W = (u, y, sx) => [x + sx * w / 2, floor + y, z + dz * (f0 + u)];
    const arc = [];
    for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI / 2; arc.push([L * (1 - Math.cos(t)), ys + (yc - ys) * Math.sin(t)]); }
    const endU = (y) => L + (y - yc) * lean;
    const ring = [...arc, [endU(yt), yt], [-0.6, yt], [-0.6, ys]]; // the side's outline, counter to the arc
    for (const sx of [-1, 1]) {
      const c = [-0.6, yt]; // a fan from the top inner corner (the outline is star-shaped from it)
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i], b = ring[i + 1];
        const A = W(a[0], a[1], sx), Bp = W(b[0], b[1], sx), Cc = W(c[0], c[1], sx);
        o.quad(A, Bp, Cc, Cc, [sx, 0, 0]);
      }
    }
    for (let i = 0; i < n; i++) {
      const a = arc[i], b = arc[i + 1];
      o.quad(W(a[0], a[1], -1), W(b[0], b[1], -1), W(b[0], b[1], 1), W(a[0], a[1], 1), [0, -(b[0] - a[0]), dz * (b[1] - a[1])]);
    }
    o.quad(W(L, yc, -1), W(endU(yt), yt, -1), W(endU(yt), yt, 1), W(L, yc, 1), [0, -lean * 0.2, dz]);
    o.quad(W(-0.6, yt, -1), W(endU(yt), yt, -1), W(endU(yt), yt, 1), W(-0.6, yt, 1), [0, 1, 0]);
    o.geo(stone);
  }
  const col = (x, z, r, y, h) => ctx.addCollider(h === undefined ? { x, z, r } : { x, z, r, y, h });

  // ---- the piers
  const piers = [], climb = [];
  let tallN = 0;
  for (const [rx, rz, kind, mark] of PLAN) {
    const x = cx + rx, z = cz + rz;
    const gb = ground.minGround(x, z, PIER.a0 * RC + 0.4) - 0.6;
    const seed = rx * 0.37 + rz * 0.11;
    if (kind === 'shoe') {
      // the shoe with nothing in it: its footing's top shows inside
      octRing(stone, x, z, PIER.a0, PIER.a0, gb, floor + 0.3, true);
      shoe(x, z, gb, PIER.shoe, 0);
      col(x, z, PIER.a0 + 0.35);
      piers.push({ x, z, kind });
      continue;
    }
    let h;
    if (kind === 'tall') {
      const broken = tallN++ === 0; // the north one ends broken; the south one carries the socket
      h = broken ? PIER.H - 2.2 : PIER.H - 2.6;
      pierPiece(upright(x, floor, z), gb - floor, h, broken ? { top: breaker(h, 2.6, 0.8 + rng(), seed), topMid: h + 1.2 } : {});
      if (!broken) {
        // the empty socket: a bronze collar with a dark well where the beam would sit
        const a = apothem(h) + 0.12;
        octRing(bronze, x, z, a, a + 0.25, floor + h - 0.4, floor + h + 1.6);
        octRing(bronze, x, z, a + 0.25, a + 0.25, floor + h + 1.6, floor + PIER.H, true, a - 0.6);
        octRing(bronze, x, z, a - 0.6, a - 0.6, floor + PIER.H - 1.8, floor + PIER.H, false, 0, true);
        octRing(bronze, x, z, a - 0.6, a - 0.6, floor + PIER.H - 1.85, floor + PIER.H - 1.8, true);
      }
      // the springer: the first courses of an arch along the nave toward a pier that is now a stump, rising from
      // the face and leaning out to the horizontal, cut off where the rest of it is not. The north upright's leans
      // south, the south one's north, so the two reach toward each other past the shaft.
      if (broken) springer(x, z, 1, 20.5, 29.5, h - 0.4, 6.2, 0.35);
      else springer(x, z, -1, 19.5, 30.2, h, 10.5, 0.15);
      climb.push({ x, z, top: floor + (broken ? h : PIER.H) });
    } else if (kind === 'fell') {
      h = 2.4;
      pierPiece(upright(x, floor, z), gb - floor, h, { top: breaker(h, 2.2, Math.PI / 2, seed), topMid: h + 1.0 });
    } else {
      h = kind;
      const amp = Math.min(1.8, h * 0.6);
      pierPiece(upright(x, floor, z), gb - floor, h, { top: breaker(h, amp, rng() * 6.28, seed), topMid: h + amp * 0.45 });
    }
    // the shoes: the low stumps' shoes stand above their broken stone; a few are torn down to the plinth band
    const torn = kind === 'tall' ? 0 : mark === 'torn' ? PIER.shoe - 1.0 : rng() < 0.25 ? PIER.shoe - 1.0 : rng() < 0.3 ? 0.8 + rng() : 0;
    shoe(x, z, gb, PIER.shoe, torn);
    col(x, z, PIER.a0 + 0.35);
    piers.push({ x, z, kind, h });
  }

  // ---- the fallen one: four lengths down the east aisle, lying on a face, over the stumps it broke
  {
    const bx = cx + 22.5, bz = cz - 18;
    const lengths = [[3.4, 11.6], [12.6, 20.4], [21.5, 29.8], [31.0, PIER.H - 1.2]];
    lengths.forEach(([s0, s1], i) => {
      const yaw = (rng() - 0.5) * 0.09 + i * 0.012, roll = (rng() - 0.5) * 0.25 + (i % 2 ? Math.PI / 8 : 0);
      const dx = Math.sin(yaw), dz = Math.cos(yaw), ox = bx + dx * 0.6 * i * 0.4;
      const mid = (s0 + s1) / 2, mx = ox + dx * mid, mz = bz + dz * mid;
      const a = apothem(mid), gy = ground.minGround(mx, mz, 3) - 0.45 + (i === 1 ? 0.5 : 0); // the second rides a stump
      // local x across, s along the fall (south), local z up
      const cr = Math.cos(roll), sr = Math.sin(roll);
      const f = (lx, s, lz) => {
        const ux = lx * cr - lz * sr, uz = lx * sr + lz * cr; // rolled about the axis
        return [ox + dx * s - dz * ux, gy + a + uz, bz + dz * s + dx * ux];
      };
      f.n = (nx, nz) => { const ux = nx * cr - nz * sr, uz = nx * sr + nz * cr; return [-dz * ux, uz, dx * ux]; };
      f.axis = (which) => (which ? [dx, 0, dz] : [-dx, 0, -dz]);
      const brk = (s, amp, sd) => (k, p) => s + amp * (0.5 + 0.5 * Math.sin(Math.atan2(p[1], p[0]) * 2 + sd));
      pierPiece(f, s0, s1, { bot: brk(s0, -1.1, i * 2.1), top: i === 3 ? brk(s1, 0.9, 1.3) : brk(s1, 1.1, i * 1.7 + 4), capBot: true, botMid: s0 - 0.3, topMid: s1 + 0.3 });
      for (let s = s0 + 1.5; s < s1; s += 2.6) col(ox + dx * s, bz + dz * s, a + 0.1);
    });
    // the bronze shoe of its foot, torn open and thrown clear of the stump
    {
      const a = PIER.a0 + PIER.proud, px = bx - 6.4, pz = bz + 3.5, gy = ground.groundAt(px, pz);
      const o = soup(), m = place(px, gy + 0.3, pz, 1.25, 0.6, 0.15);
      for (let k = 0; k < 5; k++) {
        const t0 = (k * Math.PI) / 4 + Math.PI / 8, t1 = t0 + Math.PI / 4, r = a * RC;
        const v = (t, y) => _a.set(Math.cos(t) * r, y, Math.sin(t) * r).applyMatrix4(m).toArray();
        o.quad(v(t0, -1.4), v(t1, -1.4), v(t1, 1.4), v(t0, 1.4), _b.set(Math.cos(t0 + 0.39), 0, Math.sin(t0 + 0.39)).transformDirection(m).toArray());
      }
      o.geo(bronze);
      col(px, pz, 2.4, gy - 1, 2.0);
    }
  }

  // ---- the floor: slabs 4 m square and half a metre thick, sunk and tilted, many lifted away; the paving where
  // the Hawser comes to ground is whole, and so is the nave's approach to the stair
  const pit = COURT.pit;
  const H = COURT.hawser;
  for (let fx = -32; fx < 32; fx += 4) for (let fz = -32; fz < 34; fz += 4) {
    const x = cx + fx + 2, z = cz + fz + 2, rr = Math.hypot(x - cx, z - cz);
    if (rr > 31.5) continue;
    if (x > pit.x0 - 1.4 && x < pit.x1 + 1.4 && z > pit.z0 - 2.2 && z < pit.z1 + 1.4) continue;
    if (piers.some((p) => Math.abs(p.x - x) < 2.2 && Math.abs(p.z - z) < 2.2)) continue;
    const kept = Math.hypot(x - H.x, z - H.z) < 7 || (Math.abs(x - cx) < 5 && z < pit.z0 && z > H.z);
    if (!kept && (rng() < 0.2 + rr / 160 || N2(x * 0.07, z * 0.07) > 0.3)) continue;
    const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 2.6) - 0.2;
    const top = gm + 0.12 - (kept ? 0 : rng() * 0.12);
    const t = kept ? 0.008 : 0.03;
    box(stone, 3.94, top - gb, 3.94, place(x, (top + gb) / 2, z, (rng() - 0.5) * t, (rng() - 0.5) * 0.02, (rng() - 0.5) * t));
  }

  // ---- rubble: blocks of the courses, the size of the courses, round the stumps and along the fall
  for (let k = 0; k < (low ? 30 : 60); k++) {
    const p = k < 24 ? piers[k % piers.length] : { x: cx + 22.5 + (rng() - 0.5) * 9, z: cz - 14 + rng() * 34 };
    if (p.kind === 'shoe') continue;
    const a = rng() * 6.28, d = (p.kind ? 3.8 : 3.4) + rng() * 4.5, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    if (x > pit.x0 - 1.5 && x < pit.x1 + 1.5 && z > pit.z0 - 1.5 && z < pit.z1 + 1.5) continue;
    if (Math.hypot(x - H.x, z - H.z) < 6) continue;
    const w = 0.9 + rng() * 1.8, h = 0.55 * (1 + Math.floor(rng() * 2)), dd = 0.8 + rng() * 1.4, gy = ground.groundAt(x, z);
    box(stone, w, h, dd, place(x, gy + h / 2 - 0.15, z, (rng() - 0.5) * 0.4, rng() * 6.28, (rng() - 0.5) * 0.4));
    if (w > 1.6) col(x, z, Math.max(w, dd) * 0.45, gy - 0.5, h + 0.4);
  }

  // ---- the flooded shaft (the interior-mapped quad and its stair, as v2's), its kerb of heavy coping blocks
  let top = -Infinity;
  for (let x = pit.x0 - 1; x <= pit.x1 + 1; x += 1) for (let z = pit.z0 - 1; z <= pit.z1 + 1; z += 1) top = Math.max(top, ground.groundAt(x, z));
  top += 0.12;
  const pitBox = { x0: pit.x0, x1: pit.x1, z0: pit.z0, z1: pit.z1, top, water: top - 3.5, rise: 0.34, tread: 0.62, sx0: pit.x0, sx1: pit.x1 };
  {
    const pm = makePitMaterial(ctx, pitBox);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(pit.x1 - pit.x0, pit.z1 - pit.z0).rotateX(-Math.PI / 2), pm.mat);
    quad.position.set((pit.x0 + pit.x1) / 2, top, (pit.z0 + pit.z1) / 2);
    quad.name = 'structures-court-pit';
    quad.receiveShadow = false; quad.castShadow = false;
    (env.extraMeshes ||= []).push({ mesh: quad, tris: 2 });
    (env.updates ||= []).push((dt, t) => pm.update(dt, t));
  }
  const kw = 1.2, kh = 0.55;
  const kerb = (x, z, w, d) => { const gb = ground.minGround(x, z, 1) - 0.25; box(stone, w, top + kh - gb, d, place(x, (top + kh + gb) / 2, z, 0, (rng() - 0.5) * 0.02, 0)); };
  for (let x = pit.x0 - kw; x < pit.x1 + kw - 0.01; x += 2.2) kerb(x + 1.1, pit.z1 + kw / 2, 2.18, kw);
  for (let z = pit.z0; z < pit.z1 - 0.01; z += 2.0) {
    const len = Math.min(1.98, pit.z1 - z);
    kerb(pit.x0 - kw / 2, z + len / 2, kw, len);
    kerb(pit.x1 + kw / 2, z + len / 2, kw, len);
  }
  // the stair's lip: one threshold slab the stair's width, level with the floor; newel blocks chest-high at its ends
  {
    const gb = ground.minGround(cx, pit.z0 - 0.8, 1) - 0.2;
    box(stone, pit.x1 - pit.x0, top + 0.02 - gb, 1.6, place(cx, (top + 0.02 + gb) / 2, pit.z0 - 0.8));
    for (const sx of [pit.x0 - kw / 2, pit.x1 + kw / 2]) {
      const g2 = ground.minGround(sx, pit.z0 - 0.8, 1) - 0.2;
      box(stone, kw + 0.3, top + 1.4 - g2, 1.6, place(sx, (top + 1.4 + g2) / 2, pit.z0 - 0.8));
    }
  }
  colliderChain(ctx, pit.x0 + 0.2, pit.z0 + 0.2, pit.x1 - 0.2, pit.z0 + 0.2, 0.45, 1.0);
  colliderChain(ctx, pit.x0 + 0.2, pit.z0 + 0.2, pit.x0 + 0.2, pit.z1 + 0.1, 0.45, 1.0);
  colliderChain(ctx, pit.x1 - 0.2, pit.z0 + 0.2, pit.x1 - 0.2, pit.z1 + 0.1, 0.45, 1.0);
  colliderChain(ctx, pit.x0 + 0.2, pit.z1 - 0.1, pit.x1 - 0.2, pit.z1 - 0.1, 0.45, 1.0);

  // ---- materials and meshes
  const extra = (env.extraMeshes ||= []);
  const add = (geos, material, name) => {
    for (const g of geos) if (!g.attributes.normal) g.computeVertexNormals();
    const g = mergeGeometries(geos.map((q) => { for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k); return q; }));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.name = name; m.castShadow = true; m.receiveShadow = true;
    extra.push({ mesh: m, tris: g.attributes.position.count / 3 });
    return g;
  };
  const masonry = ctx.kit.masonry({ color: '#6a6157', course: 2.2, base: floor, diminish: 0.975, slab: 3.9, joint: 0.028, wear: 0.75, moss: 0.6, inlay: 'bronze', inlayEvery: 0.06 });
  add(stone, masonry.mat, 'structures-court-masonry');
  // bronze, gone to verdigris where the rain runs and black where it does not
  const bg = add(bronze, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.5 }), 'structures-court-bronze');
  {
    const p = bg.attributes.position, n = bg.attributes.normal, cols = new Float32Array(p.count * 3);
    const dark = new THREE.Color('#2a1e13'), verd = new THREE.Color('#3b6655'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const v = 0.5 + 0.5 * N2(p.getX(i) * 0.5 + p.getY(i) * 0.35, p.getZ(i) * 0.5 - p.getY(i) * 0.25);
      const w = Math.min(1, Math.max(0, (v - 0.42) * 2.2 + Math.max(0, n.getY(i)) * 0.6 + (p.getY(i) - floor < 1 ? 0.25 : 0)));
      c.copy(dark).lerp(verd, w).multiplyScalar(0.85 + 0.3 * rng());
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    bg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  }
  // measures: one at the north upright's foot, one at the stair's head, one at the fallen one's broken end
  const T1 = piers.find((p) => p.kind === 'tall');
  const fig = ctx.kit.measureFigures([
    { x: T1.x - 4.0, z: T1.z - 5.0, yaw: -1.3 },
    { x: cx + 2.2, z: pit.z0 - 2.4, yaw: 0.2 },
    { x: cx + 26.8, z: cz + 17.2, yaw: -1.1 },
  ], { name: 'structures-court-measure' }, ctx);
  extra.push({ mesh: fig, tris: fig.geometry.attributes.position.count / 3 });

  // what the biomesh climbs (fauna/uncanny/biomesh.js): the two uprights' stone above their shoes, as octagons
  // (r the apothem there, sides, rot the first face's normal), with the floor pool kept outside half and reach
  const shoeTop = floor + PIER.shoe + 0.05;
  env.notes.court = {
    pit: pitBox,
    hawser: { x: H.x, z: H.z, y: ground.groundAt(H.x, H.z) + 0.12 },
    piers: climb.map((c) => ({ x: c.x, z: c.z, r: apothem(PIER.shoe + 0.05), sides: 8, rot: 0, base: shoeTop, top: c.top, half: PIER.a0 + PIER.proud + 0.35, reach: (PIER.a0 + PIER.proud + 0.2) * RC + 0.3 })),
  };
}
