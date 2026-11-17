// The Swallow's head (v17-U1): the Heliarchs' portal in the face across the cut's end, the water over its sill and
// down into the dark, the drowned hall behind it, the quay and the ledge the tube's end lies on, and the pool's
// surface (seen from the quay above it, and from the tube under it). Built into the stone and wood builders that
// parts.js makes into meshes; returns the meshes of its own (the surface, the fall, the spray), the floors and the
// volume. The numbers: src/v17/plan.js SWALLOW.
import * as THREE from 'three';
import { SWALLOW as SP, AQUEDUCT as A } from '../plan.js';
import { SW, SW_GLSL } from './water.js';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
// the face is dressed limestone, paler than the slope so it is found from the mere's far shore in the mountain's
// shadow; the voussoirs paler still, the lime run white down it from the old water's line
export const FACE = C('#b4ab9c'), VOUSS = C('#cbc2b0'), FACE_D = C('#8f877b'), HELIO = C('#a79a82'), BRONZE = C('#3f6a5a'), SOCKET = C('#2a2722');
const HEAD_WALL = C('#77706a'), SILT = C('#2f2d25');
const hash = (a) => { const v = Math.sin(a * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

// a wall in a plane with a hole: `inner` (the hole's outline, 2D, in order round) and `outer` (a convex outline, 2D)
// both star-shaped about `c`; to3(u, v) puts a 2D point in the world; each piece faces `hint`
function wallWithHole(B, inner, outer, c, to3, col, hint, jit = 0.08) {
  const ang = (p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  // where the ray from c through p leaves the outer outline
  const proj = (p) => {
    const dx = p[0] - c[0], dy = p[1] - c[1]; let best = Infinity, hit = null;
    for (let i = 0; i < outer.length; i++) {
      const a = outer[i], b = outer[(i + 1) % outer.length], ex = b[0] - a[0], ey = b[1] - a[1];
      const den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
      const t = ((a[0] - c[0]) * ey - (a[1] - c[1]) * ex) / den, u = ((a[0] - c[0]) * dy - (a[1] - c[1]) * dx) / den;
      if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6 && t < best) { best = t; hit = [c[0] + dx * t, c[1] + dy * t]; }
    }
    return hit;
  };
  const n = inner.length, P = inner.map(proj);
  const between = (a0, a1) => { // outer corners strictly between two bearings (going the way inner goes)
    const out = [];
    for (const q of outer) { let a = ang(q); let d1 = a1 - a0; while (d1 <= -Math.PI) d1 += 2 * Math.PI; while (d1 > Math.PI) d1 -= 2 * Math.PI; let d = a - a0; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI; if (d1 > 0 ? d > 1e-6 && d < d1 - 1e-6 : d < -1e-6 && d > d1 + 1e-6) out.push([Math.abs(d), q]); }
    return out.sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  };
  for (let k = 0; k < n; k++) {
    const a = inner[k], b = inner[(k + 1) % n], pa = P[k], pb = P[(k + 1) % n];
    if (!pa || !pb) continue;
    const poly = [pa, ...between(ang(a), ang(b)), pb];
    for (let i = 0; i < poly.length - 1; i++) B.tri(to3(...a), to3(...poly[i]), to3(...poly[i + 1]), col, hint, jit);
    B.tri(to3(...a), to3(...pb), to3(...b), col, hint, jit);
  }
}

// the arch's outline, from its west foot round over its crown to its east foot (2D: x, y), bottoms per side
function archOutline(x0, x1, yb0, yb1, spring, n) {
  const cx = (x0 + x1) / 2, R = (x1 - x0) / 2, pts = [];
  pts.push([x1, yb1]);
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; pts.push([cx + Math.cos(a) * R, spring + Math.sin(a) * R]); }
  pts.push([x0, yb0]);
  return pts; // (counter-clockwise seen from -z... the hole's order; the closing edge is the sill)
}

export function buildHead(env) {
  const { ctx, L, S, K, frameAt, rng, low } = env;
  const T = ctx.terrain, H = SP.head, W = SP.pool, Z0 = SP.face, ZI = Z0 + 2; // the face's front; the head's north wall (inside)
  const [ox0, ox1] = SP.open, ocx = (ox0 + ox1) / 2, oR = (ox1 - ox0) / 2, spring = SP.spring, crownA = spring + oR;
  const QX = SP.quay.x, QY = SP.quay.y, LEDGE = -6.6, FALLX1 = QX[0]; // the fall's water from ox0 to the ledge
  const FX0 = -107, FX1 = -82, FTOP = 9.5, FBOT = -9.0;
  const BAY = -7.5; // the arch's east bay's floor, a step under the water the tube goes down over
  const arch = archOutline(ox0, ox1, SP.sill - 0.6, BAY, spring, low ? 14 : 22);

  // ---- the face: dressed courses round the arch, a cornice, the voussoirs and the keystone, the hexagon in raised
  // stone with a roundel at each upper corner, the sun over the keystone, its gold long prised out of its sockets
  {
    const outer = [[FX0, FBOT], [FX1, FBOT], [FX1, FTOP], [FX0, FTOP]];
    const to3 = (x, y) => [x, y, Z0];
    // by courses: each course a band of the face, so each can take its own shade (wallWithHole per band is too fiddly;
    // the course shade is a vertex colour by height, applied after)
    const t0 = S.p.length;
    wallWithHole(S, arch, outer, [ocx, spring], to3, FACE, [0, 0, -1], 0.05);
    for (let i = t0; i < S.p.length; i += 9) { // a course every 0.75 m, each a shade; lime down from the old line at +1.5
      const yc = (S.p[i + 1] + S.p[i + 4] + S.p[i + 7]) / 3, xc = (S.p[i] + S.p[i + 3] + S.p[i + 6]) / 3, k = 0.9 + 0.16 * hash(Math.floor(yc / 0.75) * 3.7 + Math.floor((xc + (Math.floor(yc / 0.75) % 2) * 0.8) / 1.6));
      for (let v = 0; v < 3; v++) { const j = i + v * 3; S.c[j] *= k; S.c[j + 1] *= k; S.c[j + 2] *= k; }
    }
    // the top and the ends (where the slope does not cover them)
    S.quad([FX0, FTOP, Z0], [FX1, FTOP, Z0], [FX1, FTOP, ZI + 1], [FX0, FTOP, ZI + 1], FACE_D, [0, 1, 0], 0.08);
    // its back, where the slope behind it stands lower than its top (seen from the hillside over it)
    S.quad([FX0, H.crown + 0.4, ZI + 1], [FX1, H.crown + 0.4, ZI + 1], [FX1, FTOP, ZI + 1], [FX0, FTOP, ZI + 1], FACE_D, [0, 0, 1], 0.08); // (over the head's vault)
    // the cornice: a projecting band under the top, and a plinth course at the water
    S.box((FX0 + FX1) / 2, FTOP - 0.35, Z0 - 0.25, (FX1 - FX0) / 2 + 0.3, 0.35, 0.25, 0, VOUSS, FACE, 0.05);
    // the arch's reveal through the face's depth (facing into the opening)
    for (let i = 1; i < arch.length - 2; i++) {
      const a = arch[i], b = arch[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      S.quad([a[0], a[1], Z0], [b[0], b[1], Z0], [b[0], b[1], ZI], [a[0], a[1], ZI], FACE_D, [ocx - mx, spring - my, 0], 0.06);
    }
    { const a = arch[0], b = arch[1]; S.quad([a[0], a[1], Z0], [b[0], b[1], Z0], [b[0], b[1], ZI], [a[0], a[1], ZI], FACE_D, [-1, 0, 0], 0.06); }
    { const a = arch[arch.length - 2], b = arch[arch.length - 1]; S.quad([a[0], a[1], Z0], [b[0], b[1], Z0], [b[0], b[1], ZI], [a[0], a[1], ZI], FACE_D, [1, 0, 0], 0.06); }
    // the voussoirs: wedges round the arch, proud of the face, the keystone taller
    const NVo = 17;
    for (let i = 0; i < NVo; i++) {
      const a0 = (i / NVo) * Math.PI + 0.004, a1 = ((i + 1) / NVo) * Math.PI - 0.004, key = i === (NVo >> 1), r0 = oR + 0.01, r1 = oR + (key ? 1.75 : 1.25);
      const P = (a, r, z) => [ocx + Math.cos(a) * r, spring + Math.sin(a) * r, z];
      const col = VOUSS.map((v) => v * (0.93 + 0.1 * hash(i * 7.1)));
      const z0 = Z0 - 0.18 - (i % 2) * 0.004;
      S.quad(P(a0, r0, z0), P(a1, r0, z0), P(a1, r1, z0), P(a0, r1, z0), col, [0, 0, -1], 0.04);
      S.quad(P(a0, r1, z0), P(a1, r1, z0), P(a1, r1, Z0 - 0.002), P(a0, r1, Z0 - 0.002), col, [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0], 0.04);
      S.quad(P(a0, r0, z0), P(a0, r1, z0), P(a0, r1, Z0 - 0.002), P(a0, r0, Z0 - 0.002), col, [-Math.sin(a0), Math.cos(a0), 0], 0.04);
      S.quad(P(a1, r0, z0), P(a1, r1, z0), P(a1, r1, Z0 - 0.002), P(a1, r0, Z0 - 0.002), col, [Math.sin(a1), -Math.cos(a1), 0], 0.04);
    }
    // the imposts and pilasters: a pier either side of the arch, to the water
    for (const sd of [-1, 1]) {
      const x = sd < 0 ? ox0 - 0.75 : ox1 + 0.75;
      S.box(x, (FBOT + spring) / 2, Z0 - 0.155, 0.73, (spring - FBOT) / 2, 0.145, 0, VOUSS, VOUSS, 0.05); // (its back 1 cm off the face, its side off the reveal)
      S.box(x, spring + 0.2, Z0 - 0.3, 0.95, 0.2, 0.3, 0, VOUSS, VOUSS, 0.04); // the impost's moulding
    }
    // the hexagon: flat-topped, its foot under the water, in raised warm stone; a roundel at each upper corner
    const hc = [ocx, 0.2], hr = 10.4;
    const HX = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return [hc[0] + Math.cos(a) * hr, hc[1] + Math.sin(a) * hr * 0.95]; });
    for (let k = 0; k < 6; k++) {
      const a = HX[k], b = HX[(k + 1) % 6];
      if (a[1] < FBOT + 0.5 && b[1] < FBOT + 0.5) continue;
      const clip = (p) => [p[0], Math.max(FBOT + 0.3, Math.min(FTOP - 1.4, p[1]))];
      const pa = clip(a), pb = clip(b);
      S.beam([pa[0], pa[1], Z0 - 0.19], [pb[0], pb[1], Z0 - 0.19], 0.16, HELIO, 0.04);
    }
    const face = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
    for (const p of HX) {
      if (p[1] < -2 || p[1] > FTOP - 1) continue;
      const m = face.clone().setPosition(p[0], p[1], Z0 - 0.3);
      S.geo(new THREE.CylinderGeometry(0.62, 0.7, 0.26, low ? 14 : 22), m, HELIO, 0.04);
      S.geo(new THREE.CylinderGeometry(0.34, 0.36, 0.36, low ? 10 : 16), m, BRONZE, 0.04);
    }
    // the sun over the keystone, carved: a boss, rays, every socket of its gold empty
    const sx = ocx, sy = crownA + 2.4, sz = Z0 - 0.004, R = 0.85; // (the boss's rim on the face, its middle 0.18 proud)
    const P3 = (r, a, dz = 0) => [sx + Math.cos(a) * r, sy + Math.sin(a) * r, sz - dz];
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
      S.tri([sx, sy, sz - 0.18], P3(R, a0), P3(R, a1), HELIO, [0, 0, -1], 0.1);
      if (i % 2 === 0) S.tri(P3(R + 0.05, a0, 0.004), P3(R + 0.05, a1, 0.004), P3(R * 2.1, (a0 + a1) / 2, 0.004), HELIO, [0, 0, -1], 0.1); // (rays cut 8 mm proud of the face)
    }
    // (each socket sunk into the boss's cone where it stands: the cone is 0.18 proud at its middle, flush at its rim)
    for (let i = 0; i < 16; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.85, p = P3(r, a, 0.18 * (1 - r / R) - 0.012 - i * 0.0017); S.box(p[0], p[1], p[2], 0.06, 0.06, 0.03, 0, SOCKET, SOCKET, 0.02); }
  }

  // ---- the sill and the channel through the arch (under the cut's water), the lip at the head's wall
  // (with an apron under the water in front, down to the cut's bed: the ground's wall across the arch is opened)
  S.box((ox0 + FALLX1) / 2, (SP.sill - 0.18 + FBOT) / 2, (Z0 - 2.4 + ZI + 0.3) / 2, (FALLX1 - ox0) / 2, (SP.sill - 0.18 - FBOT) / 2 - 0.01, (ZI + 2.7 - Z0) / 2, 0, FACE_D, SILT, 0.05);
  S.box((FALLX1 + ox1) / 2, (BAY + FBOT) / 2, (Z0 + 0.4 + ZI - 0.03) / 2, (ox1 - FALLX1) / 2 - 0.006, (BAY - FBOT) / 2 - 0.003, (ZI - 0.03 - Z0 - 0.4) / 2, 0, FACE_D, SILT, 0.05);
  // ---- the ledge (the tube's end lies on it, its top a hand over the water) and the quay north of it
  const QZ0 = SP.quay.z[0], LIPZ = L.at(0).z;
  S.box((QX[0] + QX[1]) / 2, (LEDGE - 9.4) / 2, (LIPZ + Z0 + 0.4) / 2, (QX[1] - QX[0]) / 2 - 0.004, (LEDGE + 9.4) / 2, (Z0 + 0.4 - LIPZ) / 2, 0, FACE_D, FACE_D, 0.06); // (to just inside the arch: past it the tube goes down off its end over the water)
  S.box((QX[0] + QX[1]) / 2, (QY - 9.3) / 2, (QZ0 + LIPZ) / 2, (QX[1] - QX[0]) / 2, (QY + 9.3) / 2, (LIPZ - QZ0) / 2, 0, FACE_D, FACE, 0.06);
  // the quay's paving: slabs (a shade each), and its kerb on the water side
  for (let z = QZ0; z < LIPZ - 0.01; z += 1.05) for (let x = QX[0]; x < QX[1] - 0.01; x += 1.4) {
    const z1 = Math.min(LIPZ, z + 1.05), x1 = Math.min(QX[1], x + 1.4), k = 0.85 + 0.25 * hash(x * 3.1 + z * 1.7);
    S.quad([x + 0.02, QY + 0.012, z + 0.02], [x1 - 0.02, QY + 0.012, z + 0.02], [x1 - 0.02, QY + 0.012, z1 - 0.02], [x + 0.02, QY + 0.012, z1 - 0.02], FACE.map((v) => v * k), [0, 1, 0], 0.04);
  }
  // the bank's revetment on the quay's east side, up to the ground behind it (the ground under the quay is opened)
  const REV = 2.2;
  // (a battered wall with a coping that runs up with the bank, in 1.5 m lengths: whole courses read as a stair)
  const revTop = (z) => Math.max(QY + 0.3, Math.max(T.heightAt(QX[1] + REV + 0.3, z), T.heightAt(QX[1] + 0.5, z), T.heightAt(QX[1] + REV * 0.5, z)) + 0.25);
  const RZ0 = QZ0 - 2.5, RZ1 = Z0 - 0.05, RX0 = QX[1], RX1 = QX[1] + REV;
  for (let z = RZ0; z < RZ1 - 0.01; z += 1.5) {
    const z1 = Math.min(RZ1, z + 1.5), ta = revTop(z), tb = revTop(z1), col = FACE_D.map((v) => v * (0.9 + 0.15 * hash(z))), bot = QY - 0.6;
    S.quad([RX0, bot, z], [RX0, bot, z1], [RX0, tb, z1], [RX0, ta, z], col, [-1, 0, 0], 0.06); // its face to the quay
    S.quad([RX0, ta, z], [RX0, tb, z1], [RX1, tb + 0.15, z1], [RX1, ta + 0.15, z], FACE, [0, 1, 0], 0.05); // the coping
  }
  { const t0 = revTop(RZ0); S.quad([RX0, QY - 0.6, RZ0], [RX1, QY - 0.6, RZ0], [RX1, t0 + 0.15, RZ0], [RX0, t0, RZ0], FACE_D, [0, 0, -1], 0.06); }
  // steps up from the quay's north end to the shore
  const shoreY = T.heightAt((QX[0] + QX[1]) / 2, QZ0 - 1.2);
  // (up or down: the shore is wherever W1's mere left it)
  const nSteps = Math.max(1, Math.ceil(Math.abs(shoreY - QY) / 0.18)), rise = (shoreY - QY) / nSteps;
  for (let i = 0; i < nSteps; i++) { const y = QY + (i + 1) * rise, yb = Math.min(y, shoreY) - 0.6; S.box((QX[0] + QX[1]) / 2, (y + yb) / 2, QZ0 - 0.16 - i * 0.32, (QX[1] - QX[0]) / 2, (y - yb) / 2, 0.16, 0, FACE, FACE_D, 0.05); }

  // ---- the head: a drowned hall behind the face, its floor far under the pool, a barrel vault over it
  const [hx0, hx1] = H.x, hz1 = H.z[1], hfl = H.floor, hcx = (hx0 + hx1) / 2, hR = (hx1 - hx0) / 2, hsp = H.crown - hR;
  const hcol = (y) => (y < W + 0.2 ? HEAD_WALL.map((v, i) => v * 0.7 + [0.03, 0.05, 0.035][i]) : HEAD_WALL);
  // the long walls and the vault (along z), the south wall, the floor, all facing in
  const DZ = 1.5;
  for (let z = ZI; z < hz1 - 1e-6; z += DZ) {
    const z1 = Math.min(hz1, z + DZ);
    // west wall (east wall below: it has the conduit's mouth)
    for (let y = hfl; y < hsp - 1e-6; y += 1.5) { const y1 = Math.min(hsp, y + 1.5); S.quad([hx0, y, z], [hx0, y1, z], [hx0, y1, z1], [hx0, y, z1], hcol(y), [1, 0, 0], 0.07); }
    const NV = low ? 10 : 16;
    for (let i = 0; i < NV; i++) {
      const a0 = Math.PI - (i / NV) * Math.PI, a1 = Math.PI - ((i + 1) / NV) * Math.PI, P = (a, zz) => [hcx + Math.cos(a) * hR, hsp + Math.sin(a) * hR, zz];
      S.quad(P(a0, z), P(a1, z), P(a1, z1), P(a0, z1), HEAD_WALL.map((v) => v * (0.9 + 0.12 * hash(i + z))), [hcx - P((a0 + a1) / 2, z)[0], hsp - P((a0 + a1) / 2, z)[1], 0], 0.07);
    }
    S.quad([hx0, hfl, z], [hx1, hfl, z], [hx1, hfl, z1], [hx0, hfl, z1], SILT, [0, 1, 0], 0.05);
  }
  // the south wall (a flat end and the vault's lunette over it)
  const lunette = [[hx0, hfl], [hx1, hfl], [hx1, hsp]];
  for (let i = 1; i < 16; i++) { const a = (i / 16) * Math.PI; lunette.push([hcx + Math.cos(a) * hR, hsp + Math.sin(a) * hR]); }
  lunette.push([hx0, hsp]);
  for (let i = 1; i < lunette.length - 1; i++) S.tri([hcx, hfl, hz1], [lunette[i][0], lunette[i][1], hz1], [lunette[i + 1][0], lunette[i + 1][1], hz1], HEAD_WALL, [0, 0, -1], 0.07);
  S.tri([hcx, hfl, hz1], [lunette[lunette.length - 1][0], lunette[lunette.length - 1][1], hz1], [lunette[0][0], lunette[0][1], hz1], HEAD_WALL, [0, 0, -1], 0.07);
  // the north wall, inside: the lunette with the arch through it
  {
    const outer = [[hx0, hfl], [hx1, hfl], [hx1, hsp]];
    for (let i = 1; i < 16; i++) { const a = (i / 16) * Math.PI; outer.push([hcx + Math.cos(a) * hR, hsp + Math.sin(a) * hR]); }
    outer.push([hx0, hsp]);
    wallWithHole(S, arch, outer, [ocx, spring], (x, y) => [x, y, ZI], HEAD_WALL, [0, 0, 1], 0.07);
  }
  // the east wall: the conduit's mouth through it (its section where the line crosses x = hx1)
  let sE = 14; for (let i = 0; i < 60; i++) { const s = 14 + i * 0.1; if (L.at(s).x >= hx1) { sE = s; break; } }
  {
    const f = frameAt(sE), CH = A.conduit, fy = f.y - CH.below, cz = f.z;
    const ring = [];
    for (let i = 0; i <= 3; i++) ring.push([CH.half - (2 * CH.half * i) / 3, 0]);
    for (let i = 1; i <= 3; i++) ring.push([-CH.half, (CH.spring * i) / 3]);
    for (let i = 1; i < env.KV; i++) { const a = Math.PI - (Math.PI * i) / env.KV; ring.push([CH.half * Math.cos(a), CH.spring + CH.half * Math.sin(a)]); }
    for (let i = 0; i < 3; i++) ring.push([CH.half, CH.spring - (CH.spring * i) / 3]);
    // in the wall's plane (u: z, v: y); the line's right (f.r) points south here, so u = cz + r.z * across
    const inner = ring.map(([u, v]) => [cz + f.r.z * u, fy + v]).reverse();
    const outer = [[ZI, hfl], [hz1, hfl], [hz1, hsp], [ZI, hsp]];
    wallWithHole(S, inner, outer, [cz, fy + CH.spring], (z, y) => [hx1, y, z], HEAD_WALL, [-1, 0, 0], 0.07);
    env.conduitStart = sE; env.headWallX = hx1;
  }
  // stone piers under the tube's steep run down the head, standing from the floor (all under the pool)
  for (const s of [8.5, 12.0]) {
    const f = frameAt(s), top = f.ax - A.outer - 0.03, yaw = Math.atan2(f.tx, f.tz);
    S.box(f.x, (hfl + top) / 2, f.z, 1.1, (top - hfl) / 2, 0.55, yaw, HEAD_WALL, HEAD_WALL, 0.08);
  }

  // ---- the terrain opened: under the quay and the ledge, in the arch, and wherever the ground stands into the head
  // (its triangles made degenerate after the bake, never heightAt)
  let cut = 0;
  {
    const g = T.mesh?.geometry, idx = g?.index?.array, Pp = g?.attributes.position.array;
    if (idx) {
      const inQuay = (x, z) => x > QX[0] - 0.2 && x < QX[1] + 0.4 && z > QZ0 + 0.3 && z < ZI;
      const inHead = (x, y, z) => x > hx0 - 0.5 && x < hx1 + 0.5 && z > Z0 + 0.2 && z < hz1 + 0.5 && y < H.crown + 0.4;
      const inArch = (x, y, z) => x > ox0 - 0.3 && x < ox1 + 0.3 && z > Z0 - 0.4 && z < ZI + 0.5 && y < crownA + 0.5;
      // the ground's wall where the cut ends square at the face: any triangle in the arch's width reaching from the bed
      // up past the sill into the opening (its upper corner past the face may stand higher than the arch's crown)
      const across = (P3, a, b, c) => { let zx = -1e9, yx = -1e9, xm = 0; for (const i of [a, b, c]) { zx = Math.max(zx, P3[i * 3 + 2]); yx = Math.max(yx, P3[i * 3 + 1]); xm += P3[i * 3] / 3; } return xm > ox0 - 0.5 && xm < ox1 + 0.5 && zx > Z0 - 0.4 && zx < ZI + 2 && yx > SP.sill - 0.3; };
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (a === b && b === c) continue;
        const xa = Pp[a * 3], za = Pp[a * 3 + 2]; if (xa < -112 || xa > -78 || za < 292 || za > 330) continue;
        const cx = (Pp[a * 3] + Pp[b * 3] + Pp[c * 3]) / 3, cy = (Pp[a * 3 + 1] + Pp[b * 3 + 1] + Pp[c * 3 + 1]) / 3, cz = (Pp[a * 3 + 2] + Pp[b * 3 + 2] + Pp[c * 3 + 2]) / 3;
        let k = inQuay(cx, cz) || inHead(cx, cy, cz) || inArch(cx, cy, cz) || across(Pp, a, b, c);
        if (!k) for (const i of [a, b, c]) if (inHead(Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2]) || inArch(Pp[i * 3], Pp[i * 3 + 1], Pp[i * 3 + 2])) { k = true; break; }
        if (k) { idx[t + 1] = a; idx[t + 2] = a; cut++; }
      }
      g.index.needsUpdate = true;
    }
    if (!cut) console.warn('[fp] swallow: the ground\'s cut at the portal removed nothing: the terrain\'s mesh has moved');
  }

  // ---- the pool's surface: the head's and the conduit's while its vault is over the water; cut where the tube is
  const tubeSegs = [];
  for (let s = 3; s < 31; s += 2) { const a = frameAt(s), b = frameAt(s + 2); tubeSegs.push(new THREE.Vector4(a.x, a.ax, a.z, 0), new THREE.Vector4(b.x, b.ax, b.z, 0)); }
  const spos = [], sidx = [];
  { // the head's rectangle in cells, then a strip along the conduit
    const nx = 18, nz = 12;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) spos.push(hx0 + ((hx1 - hx0) * i) / nx, W, ZI - 0.02 + ((hz1 - ZI + 0.02) * j) / nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i; sidx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
    const base = spos.length / 3, CH = A.conduit; let rows = 0;
    for (let s = sE - 0.3; s < 30; s += 0.8) {
      const f = frameAt(s), v = W - (f.y - CH.below);
      const hw = v < CH.spring ? CH.half : CH.half * Math.sqrt(Math.max(0, 1 - ((v - CH.spring) / CH.half) ** 2));
      if (hw < 0.05) break;
      spos.push(f.x - f.r.x * (hw - 0.12), W, f.z - f.r.z * (hw - 0.12), f.x + f.r.x * (hw - 0.12), W, f.z + f.r.z * (hw - 0.12)); rows++; // (in from the vault's facets)
    }
    for (let r = 0; r < rows - 1; r++) { const a = base + r * 2; sidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(spos, 3)); sg.setIndex(sidx); sg.computeBoundingSphere();
  const surfMat = new THREE.ShaderMaterial({
    uniforms: { ...SW, uSeg: { value: tubeSegs }, uRo: { value: A.outer + 0.02 }, uFoam: { value: new THREE.Vector4(ox0, FALLX1, ZI, ZI + 3.5) }, uDay: { value: new THREE.Color(0.32, 0.2, 0.22) } },
    vertexShader: /* glsl */`varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${SW_GLSL}
      uniform vec4 uSeg[${tubeSegs.length}]; uniform float uRo; uniform vec4 uFoam; uniform vec3 uDay;
      varying vec3 vW;
      float segD(vec3 p, vec3 a, vec3 b) { vec3 ab = b - a; float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0); return length(p - a - ab * t); }
      void main() {
        for (int i = 0; i < ${tubeSegs.length}; i += 2) if (segD(vW, uSeg[i].xyz, uSeg[i + 1].xyz) < uRo) discard;
        // the ripples: running away from the fall and down the conduit
        float t = uSwT;
        vec2 q = vW.xz;
        float fall = (1.0 - smoothstep(0.0, 4.0, max(0.0, vW.z - uFoam.z))) * (1.0 - smoothstep(uFoam.y - 0.5, uFoam.y + 1.5, vW.x));
        // (small and many, out of step: a regular wave here reads as cloth)
        vec2 g = vec2(swN(vec3(q * 1.7, t * 0.9)) - swN(vec3(q * 1.7 + 3.1, t * 0.9)), swN(vec3(q * 1.9 + 7.0, t * 1.1)) - swN(vec3(q * 1.9 + 1.3, t * 1.1))) * 0.35
                + vec2(swN(vec3(q * 4.3 - vec2(t * 0.8, 0.0), t)) - 0.5, swN(vec3(q * 4.1 + 9.0, t * 1.3)) - 0.5) * 0.25;
        g *= 0.35 + 0.9 * fall;
        vec3 n = normalize(vec3(g.x, 1.0, g.y));
        vec3 V = normalize(vW - cameraPosition);
        // the daylight that comes in at the portal, falling off into the head and down the conduit
        float day = exp(-max(0.0, vW.z - uFoam.z) / 5.0) * exp(-max(0.0, vW.x - uFoam.y) / 6.0);
        vec3 col; float a;
        if (cameraPosition.y > uSwPool) {
          float fr = 0.03 + 0.6 * pow(1.0 - abs(dot(V, n)), 5.0);
          col = mix(uSwDeep * 3.0, uDay * (0.3 + 0.8 * day), fr) + swLight(vW) * 2.0;
          // foam where the fall comes down, drifting off
          float fo = fall * smoothstep(0.5, 0.8, swN(vec3(q.x * 2.3, q.y * 2.3 - t * 1.1, t * 0.7)) * 0.7 + swN(vec3(q * 6.0 - vec2(0.0, t * 1.6), t)) * 0.4);
          col += vec3(0.5, 0.52, 0.5) * fo * (0.25 + day);
          a = clamp(0.72 + 0.25 * fr + fo, 0.0, 1.0);
        } else {
          // from under it: a bright window straight up, a dark mirror of the water at a slant
          float up = -V.y; float win = smoothstep(0.55, 0.75, dot(-V, n) * up / max(up, 1e-3) * up + 0.0);
          vec3 sky = uDay * (0.35 + 1.2 * day) + swLight(vW) * 4.0; // (dim: a bright underside read as a slab)
          col = mix(swLight(vW) * 1.5 + uSwDeep, sky, win) * (0.85 + 0.3 * sin(q.x * 6.0 + q.y * 5.0 - t * 2.5) * (1.0 - win));
          col = swWater(col, vW);
          a = 0.96;
        }
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const surface = new THREE.Mesh(sg, surfMat); surface.name = 'swallow-pool'; surface.renderOrder = 3;

  // ---- the fall: a sheet from the lip at the end of the arch down to the pool, white where it breaks, streaming
  const NFX = low ? 12 : 20, NFY = 10, fpos = [], fuv = [], fidx = [];
  for (let j = 0; j <= NFY; j++) {
    const v = j / NFY, tt = v * 0.72; // seconds of fall: out at 1.6 m/s, down by g
    const dz = 0.45 + 1.6 * tt, dy = 4.9 * tt * tt;
    for (let i = 0; i <= NFX; i++) { const u = i / NFX, x = ox0 + 0.05 + (FALLX1 - ox0 - 0.1) * u; fpos.push(x, SP.sill - 0.02 - Math.min(dy, SP.sill - W + 0.2), j ? ZI + dz - 0.45 : ZI - 0.6); fuv.push(u, v); }
  }
  for (let j = 0; j < NFY; j++) for (let i = 0; i < NFX; i++) { const a = j * (NFX + 1) + i; fidx.push(a, a + NFX + 1, a + 1, a + 1, a + NFX + 1, a + NFX + 2); }
  const fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fgeo.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2)); fgeo.setIndex(fidx); fgeo.computeVertexNormals(); fgeo.computeBoundingSphere();
  const fallMat = new THREE.ShaderMaterial({
    uniforms: { uSwT: SW.uSwT, uLit: { value: new THREE.Color(0.62, 0.6, 0.62) } },
    vertexShader: /* glsl */`uniform float uSwT; varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vec3 p = position; p.z += sin(p.x * 3.0 + uSwT * 5.0) * 0.03 * uv.y; vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uSwT; uniform vec3 uLit; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        // streaks running down it fast, the sheet glassy at the lip and broken white below
        float s = n(vec2(vW.x * 5.0, vUv.y * 3.0 - uSwT * 4.5)) * 0.6 + n(vec2(vW.x * 13.0, vUv.y * 6.0 - uSwT * 7.0)) * 0.4;
        float white = smoothstep(0.15, 0.75, vUv.y) * (0.5 + 0.7 * s);
        vec3 glassy = vec3(0.16, 0.2, 0.17) + vec3(0.25) * smoothstep(0.6, 0.9, s);
        vec3 col = mix(glassy, vec3(0.78, 0.8, 0.78), white) * uLit * (1.0 - 0.55 * vUv.y);
        float a = (0.85 - 0.25 * vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y) * (0.6 + 0.4 * s));
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const fall = new THREE.Mesh(fgeo, fallMat); fall.name = 'swallow-fall'; fall.renderOrder = 3;

  // ---- the spray: motes thrown up off the foot and drifting away, catching the portal's light
  const NSp = low ? 90 : 180, ppos = new Float32Array(NSp * 3), pA = new Float32Array(NSp * 4);
  for (let i = 0; i < NSp; i++) { ppos.set([ox0 + 0.3 + rng() * (FALLX1 - ox0 - 0.6), W, ZI + 0.9 + rng() * 1.0], i * 3); pA.set([rng(), 0.4 + rng() * 0.6, rng() * 6.28, 0.6 + rng() * 0.8], i * 4); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(ppos, 3)); pg.setAttribute('aP', new THREE.Float32BufferAttribute(pA, 4));
  const sprayMat = new THREE.ShaderMaterial({
    uniforms: { uSwT: SW.uSwT, uPx: env.uPx },
    vertexShader: /* glsl */`uniform float uSwT, uPx; attribute vec4 aP; varying float vA;
      void main() { float f = fract(uSwT * 0.35 * aP.y + aP.x); vec3 w = position + vec3(sin(aP.z + uSwT) * 0.4 * f, 1.8 * f * (1.2 - f), 1.6 * f);
        vA = sin(f * 3.1416) * 0.5; vec4 mv = viewMatrix * vec4(w, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uPx * 0.09 * aP.w / -mv.z, 1.0, 14.0); }`,
    fragmentShader: /* glsl */`varying float vA; void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard; gl_FragColor = vec4(vec3(0.62, 0.64, 0.64), vA * (1.0 - d * 4.0)); }`,
    transparent: true, depthWrite: false,
  });
  pg.boundingSphere = new THREE.Sphere(new THREE.Vector3((ox0 + FALLX1) / 2, W + 1, ZI + 2.5), 7); // (moved in its shader: bounded by where it can go)
  const spray = new THREE.Points(pg, sprayMat); spray.name = 'swallow-spray'; spray.renderOrder = 4;

  // ---- the floors: the quay (its north end open onto the shore, its sides held); the tube's own is swallow.js's
  const stepRun = nSteps * 0.32;
  const quayFloor = (x, z) => (x >= QX[0] + 0.15 && x <= QX[1] - 0.1 && z >= QZ0 - stepRun && z <= LIPZ + 0.02 ? (z < QZ0 ? QY + Math.min(1, (QZ0 - z) / stepRun) * (shoreY - QY) : QY) : null);
  // (the ground under the quay and the ledge is opened; heightAt there is the bank's, higher than the paving in places:
  // this replaces it, so the walker is never lifted onto ground that is not drawn)
  const quayGround = (x, z) => (x >= QX[0] && x <= QX[1] && z >= QZ0 - stepRun && z <= ZI ? (z < QZ0 ? QY + Math.min(1, (QZ0 - z) / stepRun) * (shoreY - QY) : z <= LIPZ ? QY : LEDGE) : null);
  const quayKeep = (x, z) => z > QZ0 - stepRun + 0.3; // held on its sides and at the ledge; open at the steps
  const quayPath = [[(QX[0] + QX[1]) / 2, QZ0 - 3], [(QX[0] + QX[1]) / 2, QZ0 + 0.5, QY], [(QX[0] + QX[1]) / 2, LIPZ - 1.5, QY]];
  // ---- the volume: the head and the arch, stone-sounding, sheltered, never sealed (the portal is seen from all of it)
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const headVolume = (x, y, z) => {
    if (x < hx0 - 1 || x > hx1 + 1 || z < Z0 - 1 || z > hz1 + 1) return 0;
    const h = Math.min(ss(hx0 - 1, hx0, x), 1 - ss(hx1, hx1 + 1, x), ss(Z0, ZI + 1, z), 1 - ss(hz1, hz1 + 1, z));
    return 0.95 * h * (1 - ss(H.crown - 1, H.crown, y));
  };
  return { meshes: [surface, fall, spray], quayGround, quayFloor, quayKeep, quayPath, headVolume, cut, shoreY };
}
