// The Wellward Way's plan (v14-D1): the passage under the moor from the Foundered Nave's south door to the floor of
// the Pit, in world metres. Shared by v14/passage.js (draws it, its floors, its lights), v14/passage-sound.js and the
// tests. Everything is laid along one centreline, sampled every DS m: s is the distance along it from the door, d
// the signed distance across it (+ to the walker's right going toward the Pit), y(s) the floor.
//
//   the Line             s 0 .. LINE   the fourth people's tube going on south from the Nave: round, ribbed,
//                                         seamless milk-white resin, silted, crazed, two nodes (swellings where it
//                                         levels) with a stalled carrier in each, lit by what stored daylight is left
//                                         in its lenses; it ends broken where the wind's bore begins
//   the Flute            .. SUN - RC     not cut: a round bore the wind from under the world has scoured, fluted in
//                                         long spirals, a floor of pale grit in ripples, its walls rimed with points
//                                         of cold light (what the wind brings up); the sounder's lamps
//   the Laid Sun         SUN +- RC        a round domed room on the way: the Reckoner is laying a new sun in its floor
//                                         from the gold picked out of the others; his work-lamp, his basket, his wire
//   the Gulf             GULF0 .. GULF1   a short cut neck, then a crack across the way, black below and either side;
//                                         the old stair-bridge goes down over it on one arch; the sounder's lamps on
//                                         its posts; motes rise out of the dark
//   the Gate             .. L             square again, a stair down to the Pit's door: a portal standing out of the
//                                         Pit's wall at its floor on bearing MOUTH.b (D2's plan keeps it clear)
import { PIT, pitRim } from '../../v4/paths/ground.js';
import { DOOR } from '../coffin-road/plan.js';
import { makeFloor as pitFloor, FLOOR as PIT_FLOOR } from '../pit/plan.js'; // v14-D2: the Pit's bowl, whose edge the mouth meets

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const PASSAGE_OFF = !!Q && (Q.get('passage') === '0' || (Q.get('skip') || '').split(',').includes('passage') || (Q.get('only') !== null && !Q.get('only').split(',').includes('passage')));

export const DS = 0.4;               // the rings' spacing along the line
export const KA = 32, KF = 4;        // points round a ring's walls and vault; points across its floor strip
const C = { x: PIT.x, z: PIT.z };
const dirOf = (b) => { const a = (b * Math.PI) / 180; return [Math.sin(a), -Math.cos(a)]; };
// The mouth: where the passage's floor meets the Pit's, on bearing b, at the wall's foot (D2's v14/pit/plan.js FLOOR.out
// = 3.4 m in from the rim, where its bowl meets the terrain: there both floors are heightAt). The portal stands
// PORTAL m out from there on the Pit's floor. Change b (or out) and the last straight, the portal and the cuts follow.
export const MOUTH = { b: 20, out: PIT_FLOOR?.out ?? 3.4, portal: 1.9, straight: 12 }; // out: D2's FLOOR.out, the bowl's edge in from the rim
// the door: D0's passage behind the Nave's south door ends at z = DOOR.z + DOOR.depth + 2.5 (its walls and vault to
// there), its floor DOOR.treads below the sill
export const START = { x: DOOR.x, z: DOOR.z + DOOR.depth + 2.5, y: DOOR.sill - DOOR.rise * DOOR.treads, half: DOOR.half, h: DOOR.h + DOOR.rise * DOOR.treads };

// the line's control points; each list a smooth piece (Hermite, Catmull-Rom tangents), then straights
const U = (() => { const x = -0.46, z = 0.888, l = Math.hypot(x, z); return [x / l, z / l]; })(); // the room's axis
const SUNC = [223.6, 123.0], RC = 6.5, KH = 8.3; // the room's centre, its radius, its straight's half-length
const P1 = [[START.x, START.z], [START.x, 65.5], [246.0, 72.5], [244.0, 80.0], [241.4, 86.6], [237.6, 93.0], [236.6, 100.0], [232.6, 105.8], [230.0, 112.0], [SUNC[0] - U[0] * KH, SUNC[1] - U[1] * KH]];
const P3 = [[SUNC[0] + U[0] * KH, SUNC[1] + U[1] * KH], [216.6, 137.6], [213.4, 145.6], [210.8, 153.2]];

export function makePlan(T) {
  const rf = pitRim(MOUTH.b) - MOUTH.out, [ox, oz] = dirOf(MOUTH.b), IN = [-ox, -oz];
  const M = [C.x + ox * rf, C.z + oz * rf];
  const R0 = [C.x + ox * (rf + MOUTH.straight), C.z + oz * (rf + MOUTH.straight)];
  // ---- the centreline: dense points, then resampled every DS
  const dense = [];
  const herm = (pts, t0, t1) => {
    const n = pts.length, tan = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      tan.push([(b[0] - a[0]) * 0.5, (b[1] - a[1]) * 0.5]);
    }
    const L0 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), L1 = Math.hypot(pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]);
    if (t0) tan[0] = [t0[0] * L0, t0[1] * L0];
    if (t1) tan[n - 1] = [t1[0] * L1, t1[1] * L1];
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], m0 = tan[i], m1 = tan[i + 1];
      for (let k = 0; k < 40; k++) {
        const t = k / 40, t2 = t * t, t3 = t2 * t, h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
        dense.push([h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0], h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1]]);
      }
    }
  };
  const line = (a, b) => { for (let k = 0; k < 40; k++) dense.push([a[0] + (b[0] - a[0]) * k / 40, a[1] + (b[1] - a[1]) * k / 40]); };
  herm(P1, [0, 1], U);
  line(P1[P1.length - 1], P3[0]);
  herm([...P3, R0], U, IN);
  line(R0, M); dense.push(M);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = cum[cum.length - 1], N = Math.ceil(L / DS) + 1;
  const X = new Float64Array(N), Z = new Float64Array(N), TX = new Float64Array(N), TZ = new Float64Array(N), S = new Float64Array(N);
  for (let i = 0, j = 0; i < N; i++) {
    const s = Math.min(L, i * (L / (N - 1)));
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    X[i] = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f; Z[i] = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f; S[i] = s;
  }
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1), dx = X[b] - X[a], dz = Z[b] - Z[a], l = Math.hypot(dx, dz) || 1;
    TX[i] = dx / l; TZ[i] = dz / l;
  }
  const step = L / (N - 1);
  // s of the nearest sample to a point
  const sAt = (x, z) => { let bi = 0, bd = Infinity; for (let i = 0; i < N; i++) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } return S[bi]; };

  // ---- the spaces along s
  const LINE = sAt(P1[4][0], P1[4][1]), SUN = sAt(SUNC[0], SUNC[1]);
  const NECK0 = SUN + RC, GULF0 = SUN + RC + 2.4, GULF1 = GULF0 + 22, GATE_STAIR = [GULF1 + 2.2, GULF1 + 12.2];
  const SP = { LINE, SUN, RC, NECK0, GULF0, GULF1, L, RF: rf };
  // ---- the floor: knots (s, y); stairs where `stair` says (treads drawn over the slope)
  const Y0 = START.y, YF = -21.4, YS = -28.0, YB = -30.4;
  // the Pit's floor at the mouth: D2's bowl at its edge on the mouth's bearing (its FLOOR.edge), read from its own floor
  // a hand inside the edge; the terrain only if the bowl has nothing there
  const YM = (() => { const r = rf - 0.02; try { const y = pitFloor(T, null).y(C.x + ox * r, C.z + oz * r); if (y !== null && y !== undefined && isFinite(y)) return y; } catch (e) { /* no Pit */ } return T.heightAt(M[0], M[1]); })();
  const fl = LINE;
  // the Line: level at the door's end and at its two nodes (NODES), a slope of silt between (no stair: a tube has none)
  const land = [[0, Y0], [2.0, Y0]];
  { const a = 2.0, n = 3, lw = 3.2, run = (fl - a - lw * (n - 1)) / n, dy = (YF - Y0) / n; let s = a, y = Y0;
    for (let k = 0; k < n; k++) { s += run; y += dy; land.push([s, y]); if (k < n - 1) { s += lw; land.push([s, y]); } } }
  const KN = [...land, [SUN - RC - 0.5, YS], [GULF0 + 0.4, YS], [GULF1 - 0.4, YB], [GATE_STAIR[0], YB], [GATE_STAIR[1], YM], [L, YM]];
  const STAIRS = [[GULF0 + 0.4, GULF1 - 0.4, 0.92], [GATE_STAIR[0], GATE_STAIR[1], 0.48]]; // [s0, s1, tread]
  const yAt = (s) => {
    if (s <= KN[0][0]) return KN[0][1];
    for (let i = 1; i < KN.length; i++) if (s <= KN[i][0]) { const [a, ya] = KN[i - 1], [b, yb] = KN[i]; return ya + (yb - ya) * (s - a) / Math.max(1e-9, b - a); }
    return KN[KN.length - 1][1];
  };
  const stairAt = (s) => { for (const st of STAIRS) if (s >= st[0] && s <= st[1]) return st; return null; };
  const kindAt = (s) => (s < LINE ? 'line' : s < SUN - RC ? 'flute' : s < NECK0 ? 'sun' : s < GULF0 ? 'neck' : s < GULF1 ? 'gulf' : 'gate');

  // ---- the sections: KA points round the walls and vault, right floor end (u > 0) over the top to the left, as [u, v]
  // from the floor at y(s), and v0, the floor strip's v (the floor strip runs between the two ends)
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hsh = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const nz = (s, f, k) => { const a = s * f + k, i = Math.floor(a), t = a - i, w = t * t * (3 - 2 * t); return (hsh(i + k * 17) * (1 - w) + hsh(i + 1 + k * 17) * w) * 2 - 1; };
  const NODES = [[land[2][0], land[3][0]], [land[4][0], land[5][0]]]; // the Line's swellings, [s0, s1]
  const nodeAt = (s) => { for (const [a, b] of NODES) { const m = 1.2; if (s > a - m && s < b + m) return Math.sin(Math.PI * Math.min(1, Math.max(0, (s - a + m) / (b - a + 2 * m)))); } return 0; };
  // the Line's tube: a circle round a centre over its silt, seamless; ribs standing in every 1.2 m, a collar every
  // 7.2 m, swelling to a bulb at a node
  const tube = (s) => {
    const rib = (s % 1.2) < 0.41 ? 1 : 0, collar = (s % 7.2) < 0.41 ? 1 : 0, bulb = nodeAt(s);
    const R = 1.95 + 0.95 * bulb - 0.09 * rib - 0.2 * collar, c = 1.35 + 0.35 * bulb, w = Math.sqrt(Math.max(0.5, R * R - c * c));
    const th0 = Math.atan2(-c, w), pts = [];
    for (let k = 0; k < KA; k++) { const th = th0 + (k / (KA - 1)) * (Math.PI - 2 * th0); pts.push([Math.cos(th) * R, c + Math.sin(th) * R]); }
    pts[0] = [w, 0]; pts[KA - 1] = [-w, 0];
    return { pts, v0: 0, w };
  };
  // the dressed stone: walls to `wall`, a pointed vault to `crown`, half-width w
  const rect = (w, wall, crown, v0) => {
    const pts = [], per = [(wall - v0), Math.hypot(w, crown - wall), Math.hypot(w, crown - wall), (wall - v0)], tot = per[0] + per[1] + per[2] + per[3];
    for (let k = 0; k < KA; k++) {
      let t = (k / (KA - 1)) * tot, u, v;
      if (t <= per[0]) { u = w; v = v0 + t; }
      else if ((t -= per[0]) <= per[1]) { const f = t / per[1]; u = w * (1 - f); v = wall + (crown - wall) * f; }
      else if ((t -= per[1]) <= per[2]) { const f = t / per[2]; u = -w * f; v = crown - (crown - wall) * f; }
      else { t -= per[2]; u = -w; v = wall - t; }
      pts.push([u, v]);
    }
    return { pts, v0, w };
  };
  // the Flute: a circle of radius R round a centre c over the floor, the floor its chord; fluted in spirals
  const flute = (s, v0) => {
    const R = 2.25 * (1 + 0.07 * nz(s, 0.11, 3) + 0.04 * nz(s, 0.37, 5)), c = 1.35 + 0.15 * nz(s, 0.09, 8), w = Math.sqrt(Math.max(0.5, R * R - (c - v0) * (c - v0)));
    const th0 = Math.atan2(v0 - c, w), pts = [];
    for (let k = 0; k < KA; k++) {
      const t = k / (KA - 1), th = th0 + t * (Math.PI - 2 * th0), edge = Math.min(1, Math.min(t, 1 - t) * 8);
      const r = R * (1 + edge * (0.075 * Math.sin(th * 9 + s * 0.55) + 0.03 * Math.sin(th * 23 - s * 1.3)));
      pts.push([Math.cos(th) * r, c + Math.sin(th) * r]);
    }
    pts[0] = [w, v0]; pts[KA - 1] = [-w, v0];
    return { pts, v0, w };
  };
  // the Laid Sun: a drum to `drum`, a dome over it to drum + 0.82 w (a sphere's section, as the room is a circle)
  const room = (w) => {
    const drum = 3.1, pts = [], k0 = Math.round(KA * 0.16);
    for (let k = 0; k < KA; k++) {
      let u, v;
      if (k <= k0) { u = w; v = (k / k0) * drum; }
      else if (k >= KA - 1 - k0) { u = -w; v = ((KA - 1 - k) / k0) * drum; }
      else { const a = ((k - k0) / (KA - 1 - 2 * k0)) * Math.PI; u = Math.cos(a) * w; v = drum + Math.sin(a) * w * 0.82; }
      pts.push([u, v]);
    }
    return { pts, v0: 0, w };
  };
  // the Gulf: a crack across the way, HW m either side, black far below, a ragged roof over it
  const gulf = (s) => {
    const hw = 13 + 2.5 * nz(s, 0.2, 11), deep = -19 + 2 * nz(s, 0.3, 12), top = 9 + 1.5 * nz(s, 0.25, 13), pts = [];
    const ring = [[2.5, deep], [5.5, deep + 5], [hw * 0.82, deep + 11], [hw, -3], [hw * 0.97, 2], [hw * 0.8, 5.5], [hw * 0.5, top - 1.5], [hw * 0.18, top]];
    const full = [...ring, ...ring.slice().reverse().map(([u, v]) => [-u, v])];
    // resample the outline evenly to KA points
    const segL = []; let tot = 0; for (let i = 0; i < full.length - 1; i++) { const l = Math.hypot(full[i + 1][0] - full[i][0], full[i + 1][1] - full[i][1]); segL.push(l); tot += l; }
    for (let k = 0; k < KA; k++) {
      let t = (k / (KA - 1)) * tot, i = 0; while (i < segL.length - 1 && t > segL[i]) { t -= segL[i]; i++; }
      const f = t / segL[i], a = full[i], b = full[i + 1], j = k > 0 && k < KA - 1 ? 0.6 * nz(s * 0.7 + k * 3.1, 1, 14) : 0;
      pts.push([a[0] + (b[0] - a[0]) * f + j, a[1] + (b[1] - a[1]) * f + j * 0.6]);
    }
    return { pts, v0: deep, w: 2.5 };
  };
  const lerpSec = (A, B, k) => ({ pts: A.pts.map((p, i) => [p[0] + (B.pts[i][0] - p[0]) * k, p[1] + (B.pts[i][1] - p[1]) * k]), v0: A.v0 + (B.v0 - A.v0) * k, w: A.w + (B.w - A.w) * k });
  const TREAD_DROP = 0.3; // the floor strip under a stair, below its treads
  const roomW = (s) => { const d = s - SUN; return Math.abs(d) < RC ? Math.sqrt(RC * RC - d * d) : 0; };
  // a stair's rings stand their walls TREAD_DROP lower and draw no floor strip (its treads are its floor)
  function section(s) {
    const st = stairAt(s), sec = section0(s, st ? -TREAD_DROP : 0);
    sec.stair = !!st && sec.v0 < 0;
    return sec;
  }
  function section0(s, v0) {
    if (s < 1.6) return lerpSec(rect(START.half, START.h, START.h, v0), tube(s), ss(0, 1.6, s)); // the door opens into the tube
    if (s < LINE - 1.5) return tube(s);
    if (s < LINE + 2.5) return lerpSec(tube(s), flute(s, 0), ss(LINE - 1.5, LINE + 2.5, s)); // the tube broken where the bore begins
    if (s < SUN - RC) return flute(s, 0);
    if (s < NECK0) return lerpSec(flute(s, 0), room(roomW(s)), ss(1.85, 2.9, roomW(s)));
    if (s < GULF0) { const neck = rect(1.05, 2.7, 3.4, 0); return s < NECK0 + 0.5 ? lerpSec(room(Math.max(1.05, roomW(s))), neck, ss(NECK0 - 0.1, NECK0 + 0.5, s)) : neck; }
    if (s < GULF1) return gulf(s);
    // the Gate, its vault coming down at the mouth under the portal's lintel
    return lerpSec(rect(1.15, 2.9, 3.6, v0), rect(1.15, 2.9, 3.2, v0), ss(L - 4, L - 1.2, s));
  }
  // how far across a walker is held: the floor's half-width less the room for the eye (the bridge's deck in the Gulf)
  const BRIDGE = 0.85;
  function walkHalf(s) {
    if (s < 0 || s > L) return -1;
    if (s < LINE - 1) return s < 1.6 ? 0.78 : 0.95 + 1.05 * nodeAt(s);
    if (s < SUN - RC) return 1.25;
    if (s < NECK0) return Math.max(1.25, roomW(s) - 0.9); // off the bench round the drum
    if (s < GULF0) return 0.72;
    if (s < GULF1) return BRIDGE - 0.15;
    return 0.8;
  }
  // the vault over (s, d): the lowest a hop's eye may go (for the tests)
  function ceilAt(s, d) {
    const sec = section(s), y = yAt(s);
    if (s >= GULF0 && s < GULF1) return y + 8;
    let best = Infinity;
    for (let k = 1; k < KA - 1; k++) { const a = sec.pts[k], b = sec.pts[k + 1]; if ((a[0] - d) * (b[0] - d) <= 0 && Math.max(a[1], b[1]) > 1) { const f = (d - a[0]) / ((b[0] - a[0]) || 1e-9); best = Math.min(best, a[1] + (b[1] - a[1]) * f); } }
    return y + best;
  }

  // ---- where a point is: the nearest sample (a window round the last answer first), and the offset across
  let hint = 0;
  const near = (x, z, out) => {
    let bi = -1, bd = Infinity;
    const lo = Math.max(0, hint - 30), hi = Math.min(N - 1, hint + 30);
    for (let i = lo; i <= hi; i++) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
    if (bd > 9 || bi === lo || bi === hi) for (let i = 0; i < N; i++) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
    hint = bi;
    // refine along the tangent
    const ax = x - X[bi], az = z - Z[bi], t = ax * TX[bi] + az * TZ[bi];
    // d: + to the right going toward the Pit (facing along (tx, tz), x east and z south, the right is (-tz, tx)); t: how
    // far past the sample along the line (beyond either end, the ends' own)
    out.i = bi; out.t = t; out.s = Math.max(0, Math.min(L, S[bi] + t)); out.d = ax * -TZ[bi] + az * TX[bi]; out.e = Math.sqrt(bd);
    return out;
  };
  const _n = { i: 0, s: 0, d: 0, e: 0 };
  const box = (() => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < N; i++) { x0 = Math.min(x0, X[i]); x1 = Math.max(x1, X[i]); z0 = Math.min(z0, Z[i]); z1 = Math.max(z1, Z[i]); } return { x0: x0 - 15, x1: x1 + 15, z0: z0 - 15, z1: z1 + 15 }; })();
  // the floor walked: the passage's (the bridge in the Gulf), from the door's foot to the wall's foot in the Pit
  function floor(x, z) {
    if (x < box.x0 || x > box.x1 || z < box.z0 || z > box.z1) return null;
    near(x, z, _n);
    // behind the start: D0's passage from its last tread (its floor ends at DOOR.fall, where its fall of blocks was)
    if (_n.i === 0 && _n.t < 0) return z >= DOOR.fall - 0.1 && Math.abs(x - START.x) <= walkHalf(0) ? START.y : null;
    if (_n.i === N - 1 && _n.t > 0) return null; // past the wall's foot: the Pit's floor
    const h = walkHalf(_n.s);
    if (Math.abs(_n.d) > h) return null;
    return yAt(_n.s);
  }
  // the catch at the bottom of the Gulf (a walker is never meant to reach it: the bridge's edges hold)
  function catchFloor(x, z) {
    if (x < box.x0 || x > box.x1 || z < box.z0 || z > box.z1) return null;
    near(x, z, _n);
    if (_n.s < GULF0 + 0.3 || _n.s > GULF1 - 0.3 || Math.abs(_n.d) > 12) return null;
    return yAt(_n.s) - 16;
  }
  // the frame at s: centre, tangent, right
  const at = (s) => {
    const f = Math.max(0, Math.min(N - 1, s / step)), i = Math.min(N - 2, Math.floor(f)), k = f - i;
    return { x: X[i] + (X[i + 1] - X[i]) * k, z: Z[i] + (Z[i + 1] - Z[i]) * k, tx: TX[i] + (TX[i + 1] - TX[i]) * k, tz: TZ[i] + (TZ[i + 1] - TZ[i]) * k, y: yAt(s) };
  };
  const world = (s, d, v) => { const p = at(s), l = Math.hypot(p.tx, p.tz) || 1, tx = p.tx / l, tz = p.tz / l; return [p.x - tz * d, p.y + v, p.z + tx * d]; };

  // ---- the lights, with their owners: [s, d, v, kind]; kinds: 0 a lens of the Line still holding stored daylight
  // (the fourth people's, failing), 1 the sounder's cold lamp, 2 the Reckoner's work-lamp (warm)
  const n1 = (NODES[0][0] + NODES[0][1]) / 2, n2 = (NODES[1][0] + NODES[1][1]) / 2;
  const LAMPS = [
    [2.2, 1.05, 2.45, 0], [n1, -2.35, 2.5, 0], [n2, 2.35, 2.5, 0], [(n1 + n2) / 2, -1.25, 2.6, 0],
    [LINE + 5.0, -1.55, 2.0, 1], [LINE + 14.5, 1.6, 2.0, 1], [LINE + 24.5, -1.6, 2.0, 1], [LINE + 34.5, 1.55, 2.0, 1],
    [SUN + 0.9, 3.1, 0.62, 2],
    [GULF0 + 0.7, 0.95, 1.45, 1], [GULF0 + 11.0, -0.95, 1.45, 1], [GULF1 - 0.7, 0.95, 1.45, 1],
    [GULF1 + 5.0, -1.0, 2.1, 1], [L - 5.5, 1.0, 2.1, 1],
  ];
  // the Line's last lens, where it is broken, dark
  const DARK_LENS = [LINE - 2.2, 1.3, 2.4];
  const lamps = LAMPS.map(([s, d, v, k]) => { const [x, y, z] = world(s, d, v); return { s, d, v, kind: k, x, y, z }; });
  // the Reckoner's lamp outside, warm, on a bracket off the portal's right pier (looking out of the passage): the way
  // he comes; it is what finds the door from across the Pit's floor
  { const al = -MOUTH.portal - 0.75, lat = 2.0, rx = -oz, rz = ox; lamps.push({ s: L - al, d: -lat, v: 2.5, kind: 2, outside: true, x: M[0] + ox * al + rx * lat, y: YM + 2.5, z: M[1] + oz * al + rz * lat }); }

  // ---- the Laid Sun: the room's centre, its axis, the sun's radius in the floor, where the work stands
  const sun = { x: SUNC[0], z: SUNC[1], y: YS, ux: U[0], uz: U[1], r: 3.3, rc: RC };
  return {
    L, N, step, X, Z, TX, TZ, S, M, YM, rf, IN, SP, kindAt, yAt, stairAt, STAIRS, section, walkHalf, ceilAt, near, floor, catchFloor, at, world,
    lamps, DARK_LENS, NODES, nodeAt, sun, TREAD_DROP, BRIDGE, roomW, nz, hsh,
  };
}
