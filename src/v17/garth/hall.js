// The Garth's hall (v17-U2): the Heliarchs' round cistern-hall cut in the rock, in their coursed ashlar: a drum of
// seven metres with a plinth and a cornice, a segmental dome in courses with sixteen ribs, an oculus in the crown
// ringed in bronze; the west door a round arch through the drum to U1's tube; the paved walk round the wall in their
// hexagons. Into one UnderBuilder (one draw), faces in.
import { COLORS } from '../../v8/strata/parts.js';
import { GARTH_DOOR } from '../plan.js';
import { CX, CZ, FLOOR, R, DRUM, OCULUS, domeY, DOOR_A, WALK, INLET, RILL } from './plan.js';

const H = COLORS.heliarch;
const rgb = (c, k = 1) => [c.r * k, c.g * k, c.b * k];
const STONE = rgb(H.stone), DARK = rgb(H.dark), BRONZE = rgb(H.bronzeDull), BRONZE_G = rgb(H.bronze, 0.9), CUT = rgb(H.cut);
const hsh = (a) => { const v = Math.sin(a * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function buildHall(B, low) {
  const N = low ? 72 : 112; // blocks round the drum's course
  const TH = GARTH_DOOR.half / R + 0.004; // the door's half-angle at the inner face
  const W = (a, r) => [CX + Math.cos(a) * r, CZ + Math.sin(a) * r];
  const d = GARTH_DOOR, ux = d.dir[0], uz = d.dir[1], vx = -uz, vz = ux, spring = FLOOR + d.h - d.half;
  // the arch's top over the sill at lateral offset v (null outside the opening)
  const archTop = (v) => (Math.abs(v) >= d.half ? null : Math.abs(v) <= 0 ? spring + d.half : spring + Math.sqrt(d.half * d.half - v * v));
  const near = (a) => Math.abs(((a - DOOR_A) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) < TH + 0.12;
  const toC = (x, z) => [CX - x, 0, CZ - z];
  // ---- the drum: courses of ashlar, each block its own shade, the courses staggered
  const course = 0.62, nc = Math.round((DRUM - FLOOR) / course);
  for (let c = 0; c < nc; c++) {
    const y0 = FLOOR + c * (DRUM - FLOOR) / nc, y1 = FLOOR + (c + 1) * (DRUM - FLOOR) / nc, off = (c % 2) * 0.5;
    for (let i = 0; i < N; i++) {
      const a0 = ((i + off) / N) * Math.PI * 2, a1 = ((i + 1 + off) / N) * Math.PI * 2;
      const k = 0.88 + 0.16 * hsh(i * 13 + c * 7.1) - (c === 0 ? 0.12 : 0), col = rgb(H.stone, k);
      // by the door the block is drawn in slices, each cut to the opening's arch
      const ns = near(a0) || near(a1) ? 40 : 2; // (at least two: a course's edge then has a vertex wherever the next course's has one, so no sliver opens between staggered courses)
      for (let q = 0; q < ns; q++) {
        const b0 = a0 + (a1 - a0) * q / ns, b1 = a0 + (a1 - a0) * (q + 1) / ns;
        // the slice is cut to the lower of the arch's heights at its two edges, so no sliver opens between the drum and
        // the arch's soffit behind it (the soffit stands a little proud and takes the overlap)
        const tAt = (b) => (Math.cos(b - DOOR_A) > 0 ? archTop(R * Math.sin(b - DOOR_A)) : null) ?? -Infinity;
        const top = Math.min(tAt(b0), tAt(b1));
        let ya = y0;
        if (top > y0) { if (y1 <= top) continue; ya = top; }
        const [x0, z0] = W(b0, R), [x1, z1] = W(b1, R);
        // the joint: a block's face stands a few millimetres proud of the next course, a darker line at its foot
        B.quad([x0, ya + (ya === y0 ? 0.025 : 0), z0], [x1, ya + (ya === y0 ? 0.025 : 0), z1], [x1, y1, z1], [x0, y1, z0], col, toC((x0 + x1) / 2, (z0 + z1) / 2), 0.03);
        if (ya === y0) B.quad([x0, y0, z0], [x1, y0, z1], [x1, y0 + 0.025, z1], [x0, y0 + 0.025, z0], CUT, toC((x0 + x1) / 2, (z0 + z1) / 2), 0);
      }
    }
  }
  // ---- the plinth (a step at the wall's foot) and the cornice (a band at the drum's top)
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    const vm = R * Math.sin((a0 + a1) / 2 - DOOR_A);
    if (!(Math.cos((a0 + a1) / 2 - DOOR_A) > 0 && Math.abs(vm) < d.half + 0.5)) {
      const [x0, z0] = W(a0, R - 0.3), [x1, z1] = W(a1, R - 0.3), [X0, Z0] = W(a0, R), [X1, Z1] = W(a1, R);
      B.quad([x0, FLOOR + 0.42, z0], [x1, FLOOR + 0.42, z1], [X1, FLOOR + 0.42, Z1], [X0, FLOOR + 0.42, Z0], rgb(H.stone, 0.95), [0, 1, 0], 0.04);
      B.quad([x0, FLOOR, z0], [x1, FLOOR, z1], [x1, FLOOR + 0.42, z1], [x0, FLOOR + 0.42, z0], DARK, toC(x0, z0), 0.04);
    }
    const [c0x, c0z] = W(a0, R - 0.45), [c1x, c1z] = W(a1, R - 0.45), [d0x, d0z] = W(a0, R), [d1x, d1z] = W(a1, R);
    B.quad([c0x, DRUM - 0.55, c0z], [c1x, DRUM - 0.55, c1z], [c1x, DRUM, c1z], [c0x, DRUM, c0z], rgb(H.dark, 1.05), toC(c0x, c0z), 0.03);
    B.quad([c0x, DRUM - 0.55, c0z], [c1x, DRUM - 0.55, c1z], [d1x, DRUM - 0.7, d1z], [d0x, DRUM - 0.7, d0z], CUT, [0, -1, 0], 0);
    B.quad([c0x, DRUM, c0z], [c1x, DRUM, c1z], [d1x, DRUM, d1z], [d0x, DRUM, d0z], DARK, [0, 1, 0], 0);
  }
  // ---- the dome: courses inward to the oculus, a rib every sixteenth of the round
  const nd = low ? 16 : 22, ND = low ? 64 : 96;
  for (let c = 0; c < nd; c++) {
    const r0 = R - (R - OCULUS) * (c / nd), r1 = R - (R - OCULUS) * ((c + 1) / nd);
    const y0 = c === 0 ? DRUM : domeY(r0), y1 = domeY(r1), off = (c % 2) * 0.5;
    for (let i = 0; i < ND; i++) {
      const a0 = ((i + off) / ND) * Math.PI * 2, a1 = ((i + 1 + off) / ND) * Math.PI * 2;
      const k = 0.9 + 0.12 * hsh(i * 3.3 + c * 17.7), col = rgb(H.stone, k * (0.92 + 0.08 * (c / nd)));
      // (in two halves: a course's edge then has a vertex wherever the staggered next course's has one, no sliver between)
      for (const [b0, b1] of [[a0, (a0 + a1) / 2], [(a0 + a1) / 2, a1]]) {
        const [x0, z0] = W(b0, r0), [x1, z1] = W(b1, r0), [x2, z2] = W(b1, r1), [x3, z3] = W(b0, r1);
        const hint = [CX - (x0 + x2) / 2, -((y0 + y1) / 2 - FLOOR) * 0.4 - 1, CZ - (z0 + z2) / 2];
        B.quad([x0, y0, z0], [x1, y0, z1], [x2, y1, z2], [x3, y1, z3], col, hint, 0.03);
      }
    }
  }
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + DOOR_A, w = 0.24 / R;
    for (let c = 0; c < nd; c++) {
      const r0 = R - (R - OCULUS) * (c / nd) - 0.02, r1 = R - (R - OCULUS) * ((c + 1) / nd) - 0.02, dw0 = w * R / r0 * r0, dw1 = w * R / r1 * Math.max(r1, 4);
      const y0 = (c === 0 ? DRUM : domeY(r0)) - 0.22, y1 = domeY(r1) - 0.22;
      const P = (r, y, s, dw) => { const aa = a + s * dw / r; return [CX + Math.cos(aa) * r, y, CZ + Math.sin(aa) * r]; };
      const hint = [CX - (CX + Math.cos(a) * r0), -1, CZ - (CZ + Math.sin(a) * r0)];
      B.quad(P(r0, y0, -1, dw0), P(r0, y0, 1, dw0), P(r1, y1, 1, dw1), P(r1, y1, -1, dw1), rgb(H.dark, 0.95), hint, 0.02);
      for (const s of [-1, 1]) B.quad(P(r0, y0, s, dw0), P(r1, y1, s, dw1), P(r1, y1 + 0.22, s, dw1), P(r0, y0 + 0.22, s, dw0), rgb(H.dark, 0.8), [-Math.sin(a) * s, 0, Math.cos(a) * s], 0.02);
    }
  }
  // ---- the oculus: a bronze ring round the hole in the crown, and the hole's throat going up into the dark
  const yo = domeY(OCULUS);
  for (let i = 0; i < 48; i++) {
    const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2;
    const [x0, z0] = W(a0, OCULUS), [x1, z1] = W(a1, OCULUS), [X0, Z0] = W(a0, OCULUS + 0.55), [X1, Z1] = W(a1, OCULUS + 0.55);
    B.quad([x0, yo - 0.3, z0], [x1, yo - 0.3, z1], [X1, domeY(OCULUS + 0.55) - 0.3, Z1], [X0, domeY(OCULUS + 0.55) - 0.3, Z0], BRONZE, [0, -1, 0], 0.05);
    B.quad([x0, yo - 0.3, z0], [x1, yo - 0.3, z1], [x1, yo + 1.6, z1], [x0, yo + 1.6, z0], BRONZE_G, [CX - x0, 0, CZ - z0], 0.05);
    B.tri([CX, yo + 1.6, CZ], [x0, yo + 1.6, z0], [x1, yo + 1.6, z1], CUT, [0, -1, 0], 0);
  }
  // ---- the door: a round arch through the drum; its jambs and soffit, voussoirs round it, a bronze-shod sill
  {
    const P = (u, v, y) => [CX + ux * u + vx * v, y, CZ + uz * u + vz * v];
    const ui = Math.sqrt(R * R - d.half * d.half) - 0.03, uo = d.outer;
    for (const s of [-1, 1]) {
      const v = s * d.half;
      for (let c = 0; c < 6; c++) { const y0 = FLOOR + c * (spring - FLOOR) / 6, y1 = FLOOR + (c + 1) * (spring - FLOOR) / 6; B.quad(P(ui, v, y0), P(uo, v, y0), P(uo, v, y1), P(ui, v, y1), rgb(H.stone, 0.85 + 0.2 * hsh(c + s * 9)), [-vx * s, 0, -vz * s], 0.03); }
    }
    const NA = 14;
    for (let i = 0; i < NA; i++) {
      const t0 = Math.PI * i / NA, t1 = Math.PI * (i + 1) / NA, tm = (t0 + t1) / 2;
      const v0 = Math.cos(t0) * d.half, y0 = spring + Math.sin(t0) * d.half, v1 = Math.cos(t1) * d.half, y1 = spring + Math.sin(t1) * d.half;
      B.quad(P(ui, v0, y0), P(uo, v0, y0), P(uo, v1, y1), P(ui, v1, y1), rgb(H.stone, i % 2 ? 0.9 : 1.02), [-vx * Math.cos(tm), -Math.sin(tm), -vz * Math.cos(tm)], 0.03);
      // the voussoirs' faces round the arch on the hall's side, standing a hand proud of the drum
      const R0 = d.half, R1 = d.half + 0.55;
      const Q = (t, rr) => { const v = Math.cos(t) * rr; return P(Math.sqrt(R * R - v * v) - 0.07, v, spring + Math.sin(t) * rr); };
      B.quad(Q(t0, R0), Q(t1, R0), Q(t1, R1), Q(t0, R1), rgb(H.stone, i % 2 ? 0.78 : 1.05), [-ux, 0, -uz], 0.02);
      B.quad(Q(t0, R1), Q(t1, R1), P(Math.sqrt(R * R - (Math.cos(t1) * R1) ** 2) + 0.01, Math.cos(t1) * R1, spring + Math.sin(t1) * R1), P(Math.sqrt(R * R - (Math.cos(t0) * R1) ** 2) + 0.01, Math.cos(t0) * R1, spring + Math.sin(t0) * R1), CUT, [-ux * 0.2 - Math.cos(tm) * vx, Math.sin(tm), -uz * 0.2 - Math.cos(tm) * vz], 0);
    }
    // the sill, bronze-shod, worn bright in the middle
    B.quad(P(ui - 0.3, -d.half, FLOOR + 0.012), P(ui - 0.3, d.half, FLOOR + 0.012), P(uo, d.half, FLOOR + 0.012), P(uo, -d.half, FLOOR + 0.012), BRONZE, [0, 1, 0], 0.08);
  }
  // ---- the walk round the wall: Heliarch hexagons, the joints dark between them
  const hr = 0.36, dxh = hr * Math.sqrt(3), dzh = hr * 1.5;
  for (let j = -Math.ceil(R / dzh); j <= Math.ceil(R / dzh); j++) for (let i = -Math.ceil(R / dxh) - 1; i <= Math.ceil(R / dxh) + 1; i++) {
    const x = CX + i * dxh + (j % 2 ? dxh / 2 : 0), z = CZ + j * dzh, r = Math.hypot(x - CX, z - CZ);
    if (r < WALK.r0 + hr * 0.4 || r > R - 0.3 - hr * 0.6) continue;
    if (Math.abs(Math.sin(Math.atan2(z - CZ, x - CX) - DOOR_A - INLET) * r) < RILL.w / 2 + RILL.kerb + hr && Math.cos(Math.atan2(z - CZ, x - CX) - DOOR_A - INLET) > 0) continue; // (the spout's channel crosses the walk)
    const k = 0.78 + 0.3 * hsh(i * 31 + j * 7), col = hsh(i * 5 + j * 11) > 0.86 ? rgb(H.dark, k) : rgb(H.stone, k * 0.95);
    for (let e = 0; e < 6; e++) {
      const a0 = (e / 6) * Math.PI * 2 + Math.PI / 6, a1 = ((e + 1) / 6) * Math.PI * 2 + Math.PI / 6, s = hr * 0.9;
      B.tri([x, FLOOR + 0.02, z], [x + Math.cos(a0) * s, FLOOR + 0.02, z + Math.sin(a0) * s], [x + Math.cos(a1) * s, FLOOR + 0.02, z + Math.sin(a1) * s], col, [0, 1, 0], 0.04);
    }
  }
  // the bed the hexes lie in (their joints): a dark ring of floor from the walk's inner edge to the plinth
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, [x0, z0] = W(a0, WALK.r0), [x1, z1] = W(a1, WALK.r0), [X0, Z0] = W(a0, R), [X1, Z1] = W(a1, R);
    B.quad([x0, FLOOR + 0.002, z0], [x1, FLOOR + 0.002, z1], [X1, FLOOR + 0.002, Z1], [X0, FLOOR + 0.002, Z0], rgb(H.cut, 1.6), [0, 1, 0], 0);
  }
}
