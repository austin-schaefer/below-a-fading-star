// The Lees' goods and trade boards (v15-Q3 round 2): what each shop sells, seen. A shop here is known from across
// the square by a board cut to the shape of its trade (hung askew from an iron arm, so it reads both along the
// street and across it) and by its goods in the mouth, dark against the lit room or lit by the shop's own lamp.
import * as THREE from 'three';
import { L, H, V, ch, worn, beam } from '../../houses/kit.js';

const poly = (pts, k) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x * k, y * k) : s.moveTo(x * k, y * k))); s.closePath(); return s; };
const BOTTLE = [[-0.18, 0], [0.18, 0], [0.19, 0.52], [0.07, 0.72], [0.07, 0.93], [0.1, 0.93], [0.1, 1], [-0.1, 1], [-0.1, 0.93], [-0.07, 0.93], [-0.07, 0.72], [-0.19, 0.52]];
const SLIPPER = [[0, 0.02], [0.2, 0], [0.92, 0], [1.1, 0.1], [1.2, 0.3], [1.1, 0.44], [1.04, 0.3], [0.86, 0.2], [0.6, 0.27], [0.38, 0.42], [0.04, 0.4]];
const LAST = [[0, 0], [1, 0], [1.08, 0.12], [0.9, 0.24], [0.5, 0.3], [0.34, 0.62], [0.06, 0.62]];
const CONE = [[-0.5, 0], [0.5, 0], [0.08, 1], [-0.08, 1]];

// a board cut to a shape and hung from an arm out of the wall. M: the arm's root on the wall's face, +z out.
// kind: 'bottle' | 'slipper' | 'letter' | 'cone' | 'frame'
export function tradeBoard(B, M, kind, rng, o = {}) {
  const g0 = M.elements[13] - 3, reach = o.reach ?? 0.78, s = o.size ?? 0.62, iron = { color: L.iron, iron: 0.8, moss: 0, ground: g0 };
  beam(B, M, [0, 0, -0.03], [0, 0.05, reach], 0.04, iron);
  beam(B, M, [0, -0.32, -0.03], [0, 0.02, reach * 0.7], 0.025, iron);
  const m = ch(M, 0, -0.14 - s, reach * 0.6, 0, (o.turn ?? 0.75) + (rng() - 0.5) * 0.2, (rng() - 0.5) * 0.06), t = 0.05;
  const hang = (xa, xb, top) => { for (const x of [xa, xb]) beam(B, m, [x, top - 0.01, 0], [0, s + 0.155, 0], 0.012, { ...iron, iron: 1 }); }; // (both chains to one ring on the arm: the board is turned, so only its middle is under it)
  const put = (shape, col, z = 0, d = t) => B.add(B.extrude(shape, d, 4), ch(m, 0, 0, z), { color: col, moss: 0.04, ground: g0 });
  if (kind === 'bottle') { put(poly(BOTTLE, s), worn(new THREE.Color('#6f9a6a'), rng, 0.2)); B.add(B.box(s * 0.3, s * 0.2, t + 0.012, { seg: 9 }), ch(m, 0, s * 0.3, 0), { color: worn(V.linen, rng, 0.3), moss: 0, ground: g0 }); hang(-s * 0.06, s * 0.06, s); }
  else if (kind === 'slipper') { const k = s * 0.9; B.add(B.extrude(poly(SLIPPER, k), t, 4), ch(m, -k * 0.6, s * 0.3, 0), { color: worn(V.madder, rng, 0.2), moss: 0.04, ground: g0 }); B.add(B.box(k * 0.5, 0.03, t + 0.012, { seg: 9 }), ch(m, -k * 0.25, s * 0.3 + 0.02, 0), { color: worn(V.saffron, rng, 0.3), moss: 0, ground: g0 }); hang(-k * 0.45, k * 0.38, s * 0.3 + k * 0.36); }
  else if (kind === 'letter') { const w = s * 1.1, h = s * 0.72, y = s * 0.2; B.add(B.box(w, h, t, { seg: 9 }), ch(m, 0, y + h / 2, 0), { color: worn(V.linen, rng, 0.2), moss: 0.03, ground: g0 });
    for (const sd of [-1, 1]) for (const f of [-1, 1]) { B.add(B.box(w * 0.58, 0.016, 0.008, { seg: 9 }), ch(m, sd * w * 0.25, y + h * 0.72, f * (t / 2 + 0.004), 0, 0, -sd * f * 0.62 * (f > 0 ? 1 : 1)), { color: V.soot, moss: 0, ground: g0 }); }
    for (const f of [-1, 1]) B.add(B.cyl(s * 0.11, s * 0.11, 0.02, 7, 1), ch(m, 0, y + h * 0.46, f * (t / 2 + 0.008), Math.PI / 2, 0, 0), { color: worn(new THREE.Color('#8e2318'), rng, 0.15), moss: 0, ground: g0 });
    hang(-w * 0.4, w * 0.4, y + h); }
  else if (kind === 'cone') { put(poly(CONE, s), worn(V.lime, rng, 0.12)); B.add(B.box(s * 0.7, s * 0.09, t + 0.012, { seg: 9 }), ch(m, 0, s * 0.24, 0), { color: worn(new THREE.Color('#3d5f8c'), rng, 0.3), moss: 0, ground: g0 }); hang(-s * 0.05, s * 0.05, s); }
  else { const w = s * 0.9, h = s, b = s * 0.13, g = { color: worn(L.gilt, rng, 0.4, 0.15), moss: 0.03, ground: g0 };
    for (const sd of [-1, 1]) { B.add(B.box(b, h, t, { seg: 9 }), ch(m, sd * (w / 2 - b / 2), h / 2, 0), g); B.add(B.box(w - 2 * b + 0.02, b, t * 0.8, { seg: 9 }), ch(m, 0, sd > 0 ? h - b / 2 : b / 2, 0), g); }
    hang(-w * 0.4, w * 0.4, h); }
}

// a bottle standing (or hung by its neck when `hung`: y is then the neck's top)
export function bottle(B, M, x, y, z, h, col, o = {}) {
  const n = o.n ?? 6, g0 = M.elements[13] - 3, r = h * 0.2, q = { color: col, moss: 0, wet: 0.5, ground: g0, emit: o.emit }, y0 = o.hung ? y - h : y;
  B.add(B.cyl(r, r * 1.04, h * 0.55, n, 1), ch(M, x, y0 + h * 0.275, z), q);
  B.add(B.cyl(r * 0.36, r, h * 0.2, n, 1), ch(M, x, y0 + h * 0.65, z), q);
  B.add(B.cyl(r * 0.36, r * 0.36, h * 0.25, n, 1), ch(M, x, y0 + h * 0.875, z), q);
}
// a slipper (toe along +x, turned by yaw), a wooden last
export function slipper(B, M, x, y, z, len, col, yaw = 0, tilt = 0) {
  B.add(B.extrude(poly(SLIPPER, len / 1.2), len * 0.36, 3), ch(M, x, y, z, 0, yaw, tilt), { color: col, moss: 0, ground: M.elements[13] - 3 });
}
export function last(B, M, x, y, z, len, yaw = 0) {
  B.add(B.extrude(poly(LAST, len / 1.08), len * 0.3, 3), ch(M, x, y, z, 0, yaw, 0), { color: L.wood, moss: 0, ground: M.elements[13] - 3 });
}
// a cask on its side, its head to +z
export function cask(B, M, x, y, z, r, len, rng) {
  const g0 = M.elements[13] - 3, w = worn(L.wood, rng, 0.25, 0.15);
  B.add(B.cyl(r, r, len, 8, 1), ch(M, x, y + r, z, Math.PI / 2, 0, 0), { color: w, moss: 0.05, ground: g0 });
  for (const k of [-0.3, 0.3]) B.add(B.cyl(r + 0.012, r + 0.012, 0.03, 8, 1), ch(M, x, y + r, z + len * k, Math.PI / 2, 0, 0), { color: L.iron, iron: 0.7, moss: 0, ground: g0 });
}
// a loaf of salt; a sack
export function saltCone(B, M, x, y, z, h, rng) { B.add(B.cyl(h * 0.07, h * 0.3, h, 7, 1), ch(M, x, y + h / 2, z, 0, rng() * 3, 0), { color: worn(V.lime, rng, 0.1, 0.05), moss: 0, ground: M.elements[13] - 3 }); }
export function sack(B, M, x, y, z, w, h, rng) {
  const g0 = M.elements[13] - 1, col = worn(V.linen, rng, 0.3, 0.12).lerp(V.dirt, 0.45).multiplyScalar(0.8); // (hemp gone grey-brown: a clean linen sack read as a blank cream block)
  B.add(new THREE.IcosahedronGeometry(1, 1), ch(M, x, y + h * 0.46, z, 0, rng() * 3, (rng() - 0.5) * 0.12, w * 0.56, h * 0.54, w * 0.46), { color: col, moss: 0.05, ground: g0 }); // (slumped, round-shouldered: a sack, not a block)
  B.add(B.cyl(w * 0.1, w * 0.2, w * 0.2, 5, 1), ch(M, x, y + h * 0.98, z), { color: col.clone().multiplyScalar(0.8), moss: 0, ground: g0 });
}

// A shop's own lamp on what stands by it: baked into every vertex of B in [from, to) that has no light of its own,
// on the lamps' channel (so it flutters with them and goes down a little in the gutter). src: [{ x, y, z, r, k, col }].
export function bakeLamps(B, from, to, src) {
  const P = B.P, N = B.Nn, C = B.C, E = B.E;
  for (let i = from; i < to; i++) {
    const q = i * 4; if (E[q] + E[q + 1] + E[q + 2] > 0) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; let r = 0, g = 0, b = 0;
    for (const s of src) { const dx = s.x - x, dy = s.y - y, dz = s.z - z, d = Math.hypot(dx, dy, dz); if (d > s.r) continue;
      const nl = d > 0.01 ? (N[i * 3] * dx + N[i * 3 + 1] * dy + N[i * 3 + 2] * dz) / d : 1, e = s.k * Math.max(0.22, nl) / (1 + (d / (s.r * 0.36)) ** 2) * (1 - (d / s.r) ** 2);
      r += s.col[0] * e; g += s.col[1] * e; b += s.col[2] * e; }
    if (r + g + b < 0.004) continue;
    E[q] = C[i * 3] * r; E[q + 1] = C[i * 3 + 1] * g; E[q + 2] = C[i * 3 + 2] * b; E[q + 3] = 1;
  }
}
