// The Swallow's one centreline (v17-U1): the tube's and the conduit's, from the lip on the quay to the Garth's wall.
// Plan points from src/v17/plan.js (AQUEDUCT.tube: straight, a quarter turn of radius AQUEDUCT.turn about the corner,
// straight), resampled every DS metres; the planks' level along it from AQUEDUCT.profile, eased between its stations.
// Three-free, so the tests can import it in node.
// (plan points: straights, each corner rounded to its radius in AQUEDUCT.turn)
//   at(s) -> { x, z, tx, tz }   the line's point and its unit heading at s (m from the lip)
//   floorY(s)                    the planks' level (where the feet are inside the tube)
//   slope(s)                     d floorY / ds (negative going down)
//   near(x, z, out)              { s, d } of the nearest point: s along, d to the right of the heading (signed)
import { AQUEDUCT } from '../plan.js';

export const DS = 0.4;
const A = AQUEDUCT;
const PTS = A.tube, RADII = Array.isArray(A.turn) ? A.turn : [A.turn];

function norm(x, z) { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; }
// pieces: straights { kind: 0, s0, len, p, u } and arcs { kind: 1, s0, len, c, R, a0, da }, end to end
const PIECES = [];
{
  let cur = PTS[0], s = 0;
  for (let i = 1; i < PTS.length; i++) {
    const p = PTS[i], u = norm(p[0] - cur[0], p[1] - cur[1]);
    if (i === PTS.length - 1) { const len = Math.hypot(p[0] - cur[0], p[1] - cur[1]); PIECES.push({ kind: 0, s0: s, len, p: cur, u }); s += len; break; }
    const n = PTS[i + 1], u1 = norm(n[0] - p[0], n[1] - p[1]), R = RADII[Math.min(i - 1, RADII.length - 1)];
    const half = Math.acos(Math.max(-1, Math.min(1, u[0] * u1[0] + u[1] * u1[1]))) / 2, cut = R * Math.tan(half);
    const tA = [p[0] - u[0] * cut, p[1] - u[1] * cut], tB = [p[0] + u1[0] * cut, p[1] + u1[1] * cut];
    const len0 = Math.hypot(tA[0] - cur[0], tA[1] - cur[1]);
    PIECES.push({ kind: 0, s0: s, len: len0, p: cur, u }); s += len0;
    const sg = Math.sign(u[0] * u1[1] - u[1] * u1[0]) || 1, side = [-u[1] * sg, u[0] * sg], c = [tA[0] + side[0] * R, tA[1] + side[1] * R];
    const a0 = Math.atan2(tA[1] - c[1], tA[0] - c[0]), a1 = Math.atan2(tB[1] - c[1], tB[0] - c[0]);
    let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    PIECES.push({ kind: 1, s0: s, len: R * half * 2, c, R, a0, da }); s += R * half * 2;
    cur = tB;
  }
}
export const LEN = PIECES.reduce((m, P) => m + P.len, 0);
export const S_TURN = [PIECES[1].s0, PIECES[1].s0 + PIECES[1].len]; // the head's turn

export function at(s, out = {}) {
  let P = PIECES[0];
  for (const Q of PIECES) if (s >= Q.s0) P = Q;
  if (P.kind === 0) {
    const q = s - P.s0; // (before the lip and past the end: on along the straight)
    out.x = P.p[0] + P.u[0] * q; out.z = P.p[1] + P.u[1] * q; out.tx = P.u[0]; out.tz = P.u[1]; return out;
  }
  const f = Math.min(1, (s - P.s0) / P.len), a = P.a0 + P.da * f, sg = Math.sign(P.da);
  out.x = P.c[0] + Math.cos(a) * P.R; out.z = P.c[1] + Math.sin(a) * P.R;
  out.tx = -Math.sin(a) * sg; out.tz = Math.cos(a) * sg;
  if (s > P.s0 + P.len) { const q = s - P.s0 - P.len; out.x += out.tx * q; out.z += out.tz * q; }
  return out;
}

// the planks' level: piecewise linear between the profile's stations, the corners rounded over 3 m (a stair's head
// and foot eased, so the floor's slope never jumps)
const PR = A.profile, EASE = 1.5;
function lin(s) {
  if (s <= PR[0][0]) return PR[0][1];
  for (let i = 1; i < PR.length; i++) if (s <= PR[i][0]) { const [sa, ya] = PR[i - 1], [sb, yb] = PR[i]; return ya + (yb - ya) * (s - sa) / (sb - sa); }
  return PR[PR.length - 1][1];
}
export function floorY(s) {
  // the mean of the line over ±EASE: a corner of the profile becomes a parabola, the straights stay straight
  const n = 6; let y = 0;
  for (let k = 0; k <= n; k++) y += lin(s - EASE + (2 * EASE * k) / n);
  return y / (n + 1);
}
export const slope = (s) => (floorY(s + 0.05) - floorY(s - 0.05)) / 0.1;

// samples for near(): every DS
const NS = Math.ceil(LEN / DS) + 1, SX = new Float64Array(NS), SZ = new Float64Array(NS);
{ const o = {}; for (let i = 0; i < NS; i++) { at(Math.min(LEN, i * DS), o); SX[i] = o.x; SZ[i] = o.z; } }
export const BBOX = (() => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < NS; i++) { x0 = Math.min(x0, SX[i]); x1 = Math.max(x1, SX[i]); z0 = Math.min(z0, SZ[i]); z1 = Math.max(z1, SZ[i]); } return { x0, x1, z0, z1 }; })();
const _a = {};
export function near(x, z, out = {}) {
  // the nearest sample, then refined on its segment (both ends past the line's ends extend it straight)
  let bi = 0, bd = Infinity;
  for (let i = 0; i < NS; i += 4) { const dx = SX[i] - x, dz = SZ[i] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } }
  for (let i = Math.max(0, bi - 4); i <= Math.min(NS - 1, bi + 4); i++) { const dx = SX[i] - x, dz = SZ[i] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = i; } }
  let s = bi * DS;
  at(Math.min(LEN, s), _a);
  const along = (x - _a.x) * _a.tx + (z - _a.z) * _a.tz;
  s += along;
  if (s > 0 && s < LEN) { at(s, _a); }
  else at(Math.max(0, Math.min(LEN, s)), _a);
  const ex = s < 0 ? s : s > LEN ? s - LEN : 0;
  const px = _a.x + _a.tx * ex, pz = _a.z + _a.tz * ex;
  out.s = s; out.d = (x - px) * -_a.tz + (z - pz) * _a.tx; // right of the heading (x east, z south: right of south is west)
  return out;
}
