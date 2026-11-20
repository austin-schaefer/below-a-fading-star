// The Florilegium's house (v18-F2): a hothouse shaped like a shut bud, the private folly of a rich house, later than the
// Heliarchy and the Noonwrights and owing neither anything. Twelve sides on a mossed stone plinth; iron ribs gone to
// rust that swell out over the eaves and close in like petals to a lantern, their tips curled back off it like sepals;
// gutters, cresting and the lantern's cap in verdigris. The glazing is fish-scale quarries (each pane a petal), leaded,
// many-coloured, a side a scheme: some cracked, some replaced in the wrong colour, some fallen.
// Everything here is in the house's own frame: the centre of the floor at the origin, +x out through the door.
//   buildFrame(o)  → a Painter's geometry: stone, iron, the floor, the door and its key, the paving and the grate, the flask
//   buildGlass(o)  → { geometry, material, uniforms }: every pane in one draw
//   buildCast(o)   → { mesh, uniforms }: the colour the panes throw on the ground, one additive draw
import * as THREE from 'three';
import { Painter } from '../../fauna/uncanny/kit.js';
import { NOON } from '../../v8/strata/noon.js';

export const N = 12, A = 5.6, RC = A / Math.cos(Math.PI / N);
export const SILL = 0.75, MID = 2.45, EAVE = 3.9, FLASK_Y = 4.8;
// the roof's line, [r at the corners, y]: out over the eave, then in to the lantern's foot
export const PROF = [[RC, EAVE], [5.96, 4.45], [5.86, 5.05], [5.42, 5.7], [4.6, 6.35], [3.6, 6.95], [2.7, 7.5], [2.05, 8.0], [1.75, 8.5]];
export const LANTERN = { r: 1.75, y0: 8.5, y1: 9.6, top: 12.6 };
export const DOOR = { half: 0.8, h: MID };
export const GRATE = { x: 7.0, z: 0, half: 0.6, top: 0.05, kerb: 0.2 };

const STONE = '#77705f', STONE_D = '#4c4a40', STONE_L = '#8c8672', MOSS = '#3d4f2c', EARTH = '#1b1612';
const RUST = '#5a2c18', RUST_L = '#7c4826', IRON = '#1c1714', VERD = '#3f6a5a', VERD_L = '#6f9c86', GILT = '#d8a440';
const corner = (j, r = RC) => { const a = (j + 0.5) * (Math.PI * 2 / N); return [Math.cos(a) * r, Math.sin(a) * r]; };
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const _c = new THREE.Color(), _d = new THREE.Color();
const mixc = (a, b, t) => _c.set(a).lerp(_d.set(b), t);

// a bar between two points, square in section
function bar(P, a, b, r, col, metal = 0.5, rough = 0.7) { P.paint(col, metal, rough, 0); P.loft([a, b], [r, r], 4, 0, true); }
// a box along a side's line: from (x1, z1) to (x2, z2), y0..y1, t thick, pushed `out` from the line
function wallBox(P, x1, z1, x2, z2, y0, y1, t, out = 0) {
  const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), nx = dz / L, nz = -dx / L, s = Math.sign(nx * (x1 + x2) + nz * (z1 + z2)) || 1;
  P.box((x1 + x2) / 2 + nx * s * out, (y0 + y1) / 2, (z1 + z2) / 2 + nz * s * out, L, y1 - y0, t, Math.atan2(-dz, dx));
}

export function buildFrame({ low = false, tubs = [] } = {}) {
  const P = new Painter();
  const rustOf = (i) => mixc(RUST, i % 3 === 0 ? VERD : RUST_L, hash(i) * 0.8).clone();
  // ---- the plinth: a course a side, a coping gone to moss; the door's side keeps only its ends
  for (let k = 0; k < N; k++) {
    const [x1, z1] = corner(k - 1, RC + 0.06), [x2, z2] = corner(k, RC + 0.06);
    const cuts = k === 0 ? [[0, 0.5 - (DOOR.half + 0.24) / Math.hypot(x2 - x1, z2 - z1)], [0.5 + (DOOR.half + 0.24) / Math.hypot(x2 - x1, z2 - z1), 1]] : [[0, 1]]; // (one stone a side: the joints between blocks in one plane flickered; the weathering is the material's)
    cuts.forEach(([t0, t1], i) => {
      const h = hash(k * 7 + i);
      P.paint(mixc(STONE, h > 0.5 ? STONE_L : STONE_D, Math.abs(h - 0.5) * 1.3), 0, 0.95, 0);
      wallBox(P, x1 + (x2 - x1) * (t0 + 0.004), z1 + (z2 - z1) * (t0 + 0.004), x1 + (x2 - x1) * (t1 - 0.004), z1 + (z2 - z1) * (t1 - 0.004), -0.7 - 0.02 * (k % 2), SILL - 0.09 + 0.015 * (k % 2), 0.5 - 0.016 * (k % 2));
      P.paint(mixc(STONE_L, MOSS, 0.45 + 0.5 * hash(k * 13 + i)), 0, 1, 0);
      wallBox(P, x1 + (x2 - x1) * (t0 + 0.012), z1 + (z2 - z1) * (t0 + 0.012), x1 + (x2 - x1) * (t1 - 0.012), z1 + (z2 - z1) * (t1 - 0.012), SILL - 0.13 - 0.01 * (k % 2), SILL - 0.006 * i - 0.02 * (k % 2), 0.62, 0.02);
    });
  }
  // ---- the floor: flags, mottled, cracked where the roots go down
  P.grid(24, 4, (u, v, out) => {
    const r = [A - 0.2, 4.3, 2.9, 1.5, 0.02][Math.round(v * 4)], a = u * Math.PI * 2, h = hash(Math.round(u * 24) * 5 + Math.round(v * 4) * 31);
    P.paint(mixc(STONE_D, h > 0.6 ? STONE : '#3a3830', h), 0, 0.9, 0);
    out[0] = Math.cos(a) * r; out[1] = 0.03; out[2] = Math.sin(a) * r;
  });
  P.paint('#050403', 0, 1, 0);
  tubs.forEach(([tx, tz], i) => {
    for (let c = 0; c < 4; c++) {
      const a = hash(i * 9 + c) * 6.28, L = 0.75 + hash(i * 5 + c * 3) * 0.9, b = a + (hash(i + c * 11) - 0.5) * 0.9, w = 0.035 + 0.03 * hash(i * 3 + c);
      const p0 = [tx + Math.cos(a) * 0.5, tz + Math.sin(a) * 0.5], p1 = [tx + Math.cos(a) * (0.5 + L * 0.5) + Math.cos(b) * 0, tz + Math.sin(a) * (0.5 + L * 0.5)], p2 = [p1[0] + Math.cos(b) * L * 0.5, p1[1] + Math.sin(b) * L * 0.5];
      const nx = -Math.sin(a) * w, nz = Math.cos(a) * w;
      const v0 = P.v(p0[0] - nx, 0.04, p0[1] - nz), v1 = P.v(p0[0] + nx, 0.04, p0[1] + nz), v2 = P.v(p1[0] + nx * 0.7, 0.04, p1[1] + nz * 0.7), v3 = P.v(p1[0] - nx * 0.7, 0.04, p1[1] - nz * 0.7), v4 = P.v(p2[0], 0.04, p2[1]);
      P.quad(v0, v1, v2, v3); P.tri(v3, v2, v4);
    }
  });
  // ---- the iron: posts, the sill bar, the transom, the ribs up the roof and their curled tips, the purlins
  for (let j = 0; j < N; j++) {
    const [x, z] = corner(j), a = (j + 0.5) * (Math.PI * 2 / N), ca = Math.cos(a), sa = Math.sin(a);
    bar(P, [x, SILL - 0.05, z], [x, MID, z], 0.07, rustOf(j)); bar(P, [x, MID, z], [x, EAVE, z], 0.065, rustOf(j + 40));
    P.paint(IRON, 0.5, 0.7, 0); P.box(x, MID, z, 0.2, 0.09, 0.2, -a);
    const rib = PROF.map(([r, y]) => [ca * r, y, sa * r]), half = 4;
    P.paint(rustOf(j + 80), 0.5, 0.75, 0); P.loft(rib.slice(0, half + 1), rib.slice(0, half + 1).map(() => 0.06), 4, 0, false);
    P.paint(mixc(RUST, VERD, 0.35 + 0.5 * hash(j + 5)), 0.5, 0.75, 0); P.loft(rib.slice(half), rib.slice(half).map((_, i) => 0.055 - i * 0.003), 4, 0, false);
    // the sepal: the rib's tip turned back off the lantern
    P.paint(mixc(VERD, VERD_L, hash(j + 9)), 0.4, 0.7, 0);
    P.loft([[1.75, 8.5], [1.98, 8.86], [2.32, 9.08], [2.62, 9.02], [2.74, 8.8], [2.66, 8.62]].map(([r, y]) => [ca * r, y, sa * r]), [0.05, 0.045, 0.04, 0.032, 0.022, 0.008], 4, 0, true);
    bar(P, [ca * LANTERN.r, LANTERN.y0, sa * LANTERN.r], [ca * LANTERN.r, LANTERN.y1, sa * LANTERN.r], 0.03, IRON);
  }
  for (let k = 0; k < N; k++) {
    const rings = [[RC, SILL + 0.03, 0.05, IRON], [RC, MID, 0.04, RUST], [RC + 0.04, EAVE, 0.085, VERD], [PROF[2][0], PROF[2][1], 0.035, RUST], [PROF[4][0], PROF[4][1], 0.035, RUST_L], [PROF[6][0], PROF[6][1], 0.03, RUST], [LANTERN.r, LANTERN.y0, 0.05, VERD], [LANTERN.r, LANTERN.y1, 0.045, VERD]];
    for (const [r, y, t, col] of rings) {
      if (k === 0 && y < MID - 0.1) continue;
      const [x1, z1] = corner(k - 1, r), [x2, z2] = corner(k, r);
      bar(P, [x1, y, z1], [x2, y, z2], t, mixc(col, col === VERD ? VERD_L : IRON, hash(k * 3 + y) * 0.6).clone());
    }
    // the cresting on the gutter: little leaves, some gone
    const [x1, z1] = corner(k - 1, RC + 0.06), [x2, z2] = corner(k, RC + 0.06);
    for (let i = 0; i < 6; i++) { if (hash(k * 17 + i) < 0.22) continue; const t = (i + 0.5) / 6, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t; P.paint(VERD_L, 0.4, 0.7, 0); P.loft([[x, EAVE + 0.05, z], [x * 1.012, EAVE + 0.2, z * 1.012], [x * 1.004, EAVE + 0.34, z * 1.004]], [[0.05, 0.012], [0.04, 0.01], [0.004, 0.004]], 4, 0, true); }
  }
  // ---- the lantern's cap and its finial: copper gone green, a shut bud on a spike
  {
    const prof = [[1.98, 9.56], [1.94, 9.66], [1.5, 9.98], [0.85, 10.5], [0.34, 11.1], [0.1, 11.8], [0.035, 12.45]];
    P.grid(N * 2, prof.length - 1, (u, v, out) => { const k = Math.round(v * (prof.length - 1)), a = u * Math.PI * 2 + Math.PI / N, h = hash(Math.round(u * N * 2) * 3 + k); P.paint(mixc(VERD, h > 0.5 ? VERD_L : '#2a3a34', h * 0.8), 0.4, 0.75, 0); out[0] = Math.cos(a) * prof[k][0]; out[1] = prof[k][1]; out[2] = Math.sin(a) * prof[k][0]; }, true, true);
    P.paint(VERD_L, 0.4, 0.7, 0); P.lathe(0, 12.4, 0, [[0.02, 0], [0.1, 0.1], [0.12, 0.22], [0.07, 0.38], [0.01, 0.5]], 8);
  }
  // ---- the door: a stone case, an iron leaf shut in it, its lock, and the key on a nail inside
  {
    const x = A, h = DOOR.h, w = DOOR.half;
    for (const s of [-1, 1]) { P.paint(mixc(STONE, STONE_L, 0.3 + 0.3 * s), 0, 0.95, 0); P.box(x + 0.02, h / 2 - 0.1, s * (w + 0.15), 0.5, h + 0.2, 0.3); }
    P.paint(STONE_L, 0, 0.95, 0); P.box(x + 0.04, h + 0.14, 0, 0.56, 0.3, w * 2 + 0.66);
    P.paint(mixc(STONE_L, MOSS, 0.6), 0, 1, 0); P.box(x + 0.04, h + 0.3, 0, 0.6, 0.04, w * 2 + 0.7);
    const leaf = x + 0.03, iron = mixc(IRON, RUST, 0.45).clone();
    for (const s of [-1, 1]) { P.paint(iron, 0.6, 0.6, 0); P.box(leaf, h / 2, s * (w - 0.06), 0.07, h - 0.04, 0.12); }
    for (const y of [0.1, 1.0, 1.9, h - 0.08]) { P.paint(iron, 0.6, 0.6, 0); P.box(leaf, y, 0, 0.07, y < 0.5 ? 0.2 : 0.1, w * 2 - 0.2); }
    P.paint(iron, 0.6, 0.6, 0); P.box(leaf, 0.55, 0, 0.05, 0.8, w * 2 - 0.2); // the kick plate
    for (const y of [0.4, 1.3, 2.1]) { P.paint(IRON, 0.6, 0.6, 0); P.box(leaf + 0.04, y, -(w - 0.06), 0.05, 0.16, 0.2); } // hinges
    P.paint(IRON, 0.6, 0.5, 0); P.box(leaf + 0.06, 1.08, w - 0.22, 0.06, 0.24, 0.2); // the lock
    P.paint('#000000', 0, 1, 0); P.box(leaf + 0.092, 1.05, w - 0.22, 0.004, 0.07, 0.025);
    { const pts = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; pts.push([leaf + 0.1, 1.3 + Math.cos(a) * 0.075 - 0.075, w - 0.22 + Math.sin(a) * 0.075]); } P.paint(mixc(IRON, RUST_L, 0.5), 0.6, 0.5, 0); P.loft(pts, pts.map(() => 0.014), 5, 0, false); }
    // the key: brass, a hand long, on a nail in the middle rail's inner face, hanging behind the clear pane
    const kx = x - 0.07, kz = 0.12, ky = 1.82;
    P.paint(IRON, 0.5, 0.6, 0); P.loft([[x - 0.01, 1.9, kz], [kx - 0.03, 1.91, kz]], [0.008, 0.008], 4, 0, true);
    P.paint(GILT, 0.7, 0.35, 1.6);
    { const pts = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; pts.push([kx, ky + Math.cos(a) * 0.075, kz + Math.sin(a) * 0.06]); } P.loft(pts, pts.map(() => 0.016), 5, 0, false); }
    P.loft([[kx, ky - 0.075, kz], [kx, ky - 0.42, kz]], [0.018, 0.018], 5, 0, true);
    P.box(kx, ky - 0.34, kz + 0.05, 0.016, 0.06, 0.09); P.box(kx, ky - 0.4, kz + 0.04, 0.016, 0.04, 0.07); P.box(kx, ky - 0.1, kz, 0.03, 0.02, 0.03);
  }
  // ---- outside the door: a step, the paving, and in it the grate over the dark
  {
    P.paint(STONE_L, 0, 0.95, 0); P.box(A + 0.36, 0.0, 0, 0.5, 0.24, 2.3);
    const G = GRATE, g0 = G.x - G.half - G.kerb, g1 = G.x + G.half + G.kerb, zs = [-2.25, -1.5, -(G.half + G.kerb), 0, G.half + G.kerb, 1.5, 2.25];
    const slab = (x0, x1, z0, z1, i) => { const h = hash(i * 3.7 + x0); P.paint(mixc(STONE, h > 0.5 ? MOSS : STONE_D, Math.abs(h - 0.5) * 0.9), 0, 0.95, 0); P.box((x0 + x1) / 2, G.top - 0.09 - 0.012 * h, (z0 + z1) / 2, x1 - x0 - 0.03, 0.18, z1 - z0 - 0.03, (h - 0.5) * 0.02); };
    let i = 0;
    for (let r = 0; r < zs.length - 1; r++) {
      const mid = r === 2 || r === 3;
      if (!mid) { slab(g0, G.x, zs[r], zs[r + 1], i++); slab(G.x, g1, zs[r], zs[r + 1], i++); }
      slab(g1, g1 + 0.85, zs[r], zs[r + 1], i++);
      if (r % 2 === 0) slab(g1 + 0.85, g1 + 1.6, zs[r], zs[r + 2] ?? zs[r + 1], i++);
    }
    // the kerb round the opening, and the bars: close-set, rusted
    P.paint(STONE_L, 0, 0.9, 0);
    P.box(G.x, G.top - 0.1, -(G.half + G.kerb / 2), 2 * (G.half + G.kerb), 0.22, G.kerb); P.box(G.x, G.top - 0.1, G.half + G.kerb / 2, 2 * (G.half + G.kerb), 0.22, G.kerb);
    P.box(G.x - G.half - G.kerb / 2, G.top - 0.1, 0, G.kerb, 0.22, 2 * G.half); P.box(G.x + G.half + G.kerb / 2, G.top - 0.1, 0, G.kerb, 0.22, 2 * G.half);
    for (let b = 0; b < 9; b++) { P.paint(mixc(IRON, RUST, hash(b + 3) * 0.7), 0.6, 0.6, 0); P.box(G.x, G.top - 0.03, -0.48 + b * 0.12, 2 * G.half, 0.06, 0.04); }
    for (const dx of [-0.2, 0.2]) { P.paint(IRON, 0.6, 0.6, 0); P.box(G.x + dx, G.top - 0.04, 0, 0.035, 0.05, 2 * G.half); }
  }
  // ---- the path worn round the glass: trodden earth, and flags sunk in it
  P.grid(48, 2, (u, v, out) => {
    const a = u * Math.PI * 2, r = [RC + 0.3, 7.1, 8.05][Math.round(v * 2)] + 0.25 * Math.sin(a * 5 + v * 4), h = hash(Math.round(u * 48) + v * 9);
    P.paint(mixc(EARTH, '#2a2219', h), 0, 1, 0);
    out[0] = Math.cos(a) * r; out[1] = v === 0.5 ? 0.05 : 0.025; out[2] = Math.sin(a) * r;
  });
  for (let i = 0; i < 20; i++) {
    const a = 0.42 + (i / 20) * (Math.PI * 2 - 0.84) + (hash(i) - 0.5) * 0.1, r = 6.95 + (hash(i + 30) - 0.5) * 0.5, h = hash(i + 60);
    if (h < 0.12) continue;
    P.paint(mixc(STONE_D, h > 0.5 ? STONE : MOSS, Math.abs(h - 0.5) * 1.2), 0, 0.95, 0);
    P.box(Math.cos(a) * r, 0.0, Math.sin(a) * r, 0.6 + 0.3 * hash(i + 90), 0.11, 0.85, -a + (h - 0.5) * 0.3);
  }
  // ---- the flask of stored noon, hung from the lantern on a chain in an iron cage (the Nave's make: coffin-road.js)
  {
    bar(P, [-LANTERN.r, LANTERN.y0, 0], [LANTERN.r, LANTERN.y0, 0], 0.03, IRON); bar(P, [0, LANTERN.y0, -LANTERN.r], [0, LANTERN.y0, LANTERN.r], 0.03, IRON);
    bar(P, [0, LANTERN.y0, 0], [0, FLASK_Y + 0.42, 0], 0.014, IRON);
    const y = FLASK_Y;
    for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bar(P, [cx * 0.19, y - 0.3, cz * 0.19], [cx * 0.14, y + 0.34, cz * 0.14], 0.012, IRON);
    P.paint(IRON, 0.5, 0.6, 0); P.box(0, y - 0.31, 0, 0.42, 0.03, 0.42); P.box(0, y + 0.35, 0, 0.32, 0.03, 0.32);
    P.lathe(0, y + 0.36, 0, [[0.16, 0], [0.02, 0.1]], 4);
    P.paint(NOON.honey, 0, 0.3, 7); P.lathe(0, y - 0.27, 0, [[0.03, 0], [0.13, 0.06], [0.17, 0.2], [0.16, 0.34], [0.08, 0.46], [0.045, 0.52], [0.05, 0.58]], low ? 8 : 12);
  }
  return P.geometry();
}

// ---------------------------------------------------------------- the glass
// The colours of the panes (linear): ruby, amber, verdigris, cobalt, violet, rose, straw, teal. A side's scheme is two
// of them, the first low and the second high; a tenth of the panes are some other colour (replaced), a few are gone.
export const PANES = [[0.74, 0.04, 0.06], [0.92, 0.46, 0.05], [0.06, 0.46, 0.22], [0.06, 0.15, 0.72], [0.36, 0.1, 0.62], [0.72, 0.13, 0.33], [0.88, 0.76, 0.44], [0.04, 0.4, 0.5]];
export const SCHEME_A = [0, 3, 5, 2, 4, 1, 7, 0, 6, 3, 2, 5], SCHEME_B = [1, 7, 6, 1, 5, 0, 2, 4, 1, 4, 6, 0];
const GLSL_PANES = `
  const vec3 PANES[8] = vec3[8](${PANES.map((c) => `vec3(${c.join(', ')})`).join(', ')});
  const int SA[12] = int[12](${SCHEME_A.join(', ')});
  const int SB[12] = int[12](${SCHEME_B.join(', ')});
  vec2 cd0(float h) { return vec2(cos(h * 40.0), sin(h * 40.0)); }
  float flH(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`;

export function buildGlass({ low = false } = {}) {
  const pos = [], uv = [], bay = [], lit = [], idx = [];
  const litAt = (p) => 1 / (1 + (p[0] * p[0] + (p[1] - FLASK_Y) * (p[1] - FLASK_Y) + p[2] * p[2]) / 10);
  // a quad a, b (bottom), c, d (top, d over a), its uv in metres, its side's schemes, a seed and a kind
  const quad = (a, b, c, d, u0, u1, u2, u3, v0, v1, side, kind, glow = 1) => {
    const n = pos.length / 3;
    for (const [p, u, v] of [[a, u0, v0], [b, u1, v0], [c, u2, v1], [d, u3, v1]]) { pos.push(p[0], p[1], p[2]); uv.push(u, v); bay.push(SCHEME_A[side % 12], SCHEME_B[side % 12], side * 7.31 + kind * 1.7, kind); lit.push(litAt(p) * glow); }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  for (let k = 0; k < N; k++) {
    const [x1, z1] = corner(k - 1), [x2, z2] = corner(k), w = Math.hypot(x2 - x1, z2 - z1) / 2;
    const at = (t, y, r = 1) => [(x1 + (x2 - x1) * t) * r, y, (z1 + (z2 - z1) * t) * r];
    // the walls: two tiers; the door's side has a strip either side of the case
    if (k === 0) for (const [t0, t1] of [[0, 0.5 - (DOOR.half + 0.26) / (2 * w)], [0.5 + (DOOR.half + 0.26) / (2 * w), 1]]) quad(at(t0, SILL), at(t1, SILL), at(t1, MID), at(t0, MID), (t0 * 2 - 1) * w, (t1 * 2 - 1) * w, (t1 * 2 - 1) * w, (t0 * 2 - 1) * w, 0, MID - SILL, k, 0);
    else quad(at(0, SILL), at(1, SILL), at(1, MID), at(0, MID), -w, w, w, -w, 0, MID - SILL, k, 0);
    quad(at(0, MID), at(1, MID), at(1, EAVE), at(0, EAVE), -w, w, w, -w, MID - SILL, EAVE - SILL, k, 1);
    // the roof, eave to lantern
    let v = EAVE - SILL;
    for (let i = 0; i < PROF.length - 1; i++) {
      const [r0, y0] = PROF[i], [r1, y1] = PROF[i + 1], s0 = r0 / RC, s1 = r1 / RC, dv = Math.hypot(r1 - r0, y1 - y0);
      quad(at(0, y0, s0), at(1, y0, s0), at(1, y1, s1), at(0, y1, s1), -w * s0, w * s0, w * s1, -w * s1, v, v + dv, k, 1);
      v += dv;
    }
    const sl = LANTERN.r / RC;
    quad(at(0, LANTERN.y0, sl), at(1, LANTERN.y0, sl), at(1, LANTERN.y1, sl), at(0, LANTERN.y1, sl), -w * sl, w * sl, w * sl, -w * sl, 0, LANTERN.y1 - LANTERN.y0, k, 2);
  }
  // the door's panes: pale, small-leaded
  { const x = A + 0.03, w = DOOR.half - 0.12; for (const [y0, y1] of [[1.05, 1.85], [1.95, DOOR.h - 0.13]]) quad([x, y0, -w], [x, y0, w], [x, y1, w], [x, y1, -w], -w, w, w, -w, y0, y1, 0, 2); }
  // fallen panes: in the leaf litter under the walls they dropped from, still catching the light
  for (let i = 0; i < (low ? 7 : 11); i++) {
    const a = 0.5 + hash(i * 3 + 1) * 5.3, r = RC + 0.45 + hash(i * 5 + 2) * 1.5, s = 0.2 + hash(i + 7) * 0.22, rot = hash(i * 11) * 6.28, lean = hash(i * 13) > 0.72;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, side = Math.round(a / (Math.PI * 2 / N)) % N;
    const p = [0, 1, 2, 3].map((q) => { const b = rot + q * 1.57 + (hash(i * 4 + q) - 0.5) * 0.7, d = s * (0.7 + 0.6 * hash(i * 6 + q)); return [cx + Math.cos(b) * d, 0.07 + (lean ? 0.16 * (1 + Math.cos(b - rot)) : 0.012 * q), cz + Math.sin(b) * d]; });
    quad(p[0], p[1], p[2], p[3], 0, s * 2, s * 2, 0, i * 0.37, i * 0.37 + s * 2, side, 3, 0.9);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('aBay', new THREE.Float32BufferAttribute(bay, 4));
  geometry.setAttribute('aLit', new THREE.Float32BufferAttribute(lit, 1));
  geometry.setIndex(idx);
  geometry.computeBoundingSphere();
  const uniforms = { uGlow: { value: 2.3 }, uBreath: { value: 1 } };
  // A pane is a filter and a lamp: what is behind it is multiplied by its colour, and its own colour is added by how
  // much of the flask's light reaches it (blend: src * alpha + dst * src). Leads and iron are near black both ways.
  const material = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), ...uniforms },
    vertexShader: `attribute vec4 aBay; attribute float aLit; varying vec2 vUv; varying vec4 vBay; varying float vLit; varying float vY;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv; vBay = aBay; vLit = aLit; vY = position.y;
        vec3 transformed = position;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uGlow, uBreath; varying vec2 vUv; varying vec4 vBay; varying float vLit; varying float vY;
      #include <fog_pars_fragment>
      ${GLSL_PANES}
      void main() {
        float kind = vBay.w, seed = vBay.z;
        vec3 tint; float lead = 0.0, glow = 1.0;
        if (kind > 1.5 && kind < 2.5) {
          // the lantern and the door: small square quarries, pale straw, a few amber
          vec2 q = vUv / vec2(0.2, 0.26); vec2 c = floor(q), f = abs(fract(q) - 0.5);
          float h = flH(c + seed);
          tint = mix(vec3(0.9, 0.86, 0.62), PANES[1], step(0.86, h)) * (0.72 + 0.28 * flH(c * 1.7 + seed));
          lead = smoothstep(0.42, 0.455, max(f.x, f.y));
          if (vY > 5.0) { glow = 0.5; tint *= vec3(1.0, 0.86, 0.6); } else { glow = 0.07; tint = mix(tint, vec3(0.86, 0.9, 0.84), 0.5); }   // the door's: nearly clear, to see the key by
        } else {
          // fish-scale quarries: each pane a disc lapped by the row above, so what shows is a petal hanging down
          // (the lower wall is a vitrine: inside a border of the side's colours its panes are large and nearly clear, so
          // what stands in the tubs is seen)
          bool clear = kind < 1.5 && abs(vUv.x) < ${(RC * Math.sin(Math.PI / N) - 0.36).toFixed(3)} && vUv.y < ${(MID - SILL + 0.62).toFixed(3)};   // (to a little over the transom: the tallest heads and what they hold up)
          vec2 q = vUv / (clear ? vec2(0.62, 0.56) : vec2(0.37, 0.33)); float jb = floor(q.y * 2.0), R = 0.72, od = 9.0; vec2 oc = vec2(0.0);
          for (int i = 2; i >= -2; i--) {
            float j = jb + float(i), off = 0.5 * mod(j, 2.0), cx = floor(q.x - off + 0.5) + off; vec2 c = vec2(cx, j * 0.5); float d = distance(q, c);
            if (d < R) { oc = c; od = d; break; }
          }
          float lw = clamp(fwidth(q.y) * 1.3, 0.055, 0.2);
          lead = smoothstep(R - lw - 0.02, R - lw, od);
          float h = flH(oc * 3.1 + seed), h2 = flH(oc * 5.7 + seed + 3.0), h3 = flH(oc * 1.3 + seed + 9.0);
          if (h3 > 0.953 && kind < 1.5) discard;                                   // a pane gone: the hole looks in
          float up = smoothstep(0.6, 6.6, vY + (h2 - 0.5) * 3.2);
          int ci = h < 0.11 ? int(h * 72.0) : (h2 < up ? int(vBay.y + 0.5) : int(vBay.x + 0.5));
          tint = PANES[ci] * (0.62 + 0.38 * h2);
          glow = 0.3 + 0.7 * flH(oc * 7.3 + seed + 1.0); if (flH(oc * 2.9 + seed + 4.0) > 0.84) { glow *= 0.22; tint *= 0.5; }   // some gone dull with soot
          if (clear && h > 0.07) { tint = mix(vec3(0.8, 0.86, 0.76), PANES[ci], 0.16) * (0.78 + 0.22 * h2); glow = 0.1; }
          // hand-made glass: thicker and darker toward the lead, streaked
          tint *= (1.0 - 0.3 * smoothstep(0.25, 0.72, od)) * (0.93 + 0.07 * sin(dot(q - oc, cd0(h)) * 11.0));
          // a crack across some: a dark line where it was leaded up again
          vec2 cd = vec2(cos(h * 40.0), sin(h * 40.0));
          if (h3 < 0.1) lead = max(lead, 1.0 - smoothstep(0.02, 0.05, abs(dot(q - oc, cd) - 0.12)));
          // green slime low on the walls, soot and dust everywhere
          float low = kind < 0.5 ? exp(-vUv.y * 1.6) : 0.0;
          tint = mix(tint, tint * vec3(0.5, 0.78, 0.42), low * 0.8) * (1.0 - 0.3 * low);
          if (kind > 2.5) glow = 0.42;
        }
        tint = mix(tint, vec3(0.012), lead);
        float a = clamp(uGlow * uBreath * vLit * glow, 0.0, 1.0) * (1.0 - lead);
        #ifdef USE_FOG
          float f = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          tint = mix(tint, vec3(1.0), f * 0.85); a *= 1.0 - f * 0.6;
        #endif
        gl_FragColor = vec4(tint, a);
      }`,
    fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.SrcColorFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  material.uniforms.uGlow = uniforms.uGlow; material.uniforms.uBreath = uniforms.uBreath;
  return { geometry, material, uniforms, quads: idx.length / 6 };
}

// ---------------------------------------------------------------- the colour on the ground
// One additive ring on the turf from the plinth out to 19 m: each side throws its own scheme outward in soft patches
// (the panes' image, stretched as it goes), the ribs' shadows dark between them. groundAt(x, z) → the drawn ground's y
// in the house's frame.
export function buildCast({ groundAt, low = false, r1 = 19 }) {
  const NA = low ? 48 : 72, NR = low ? 6 : 9, pos = [], pol = [], idx = [];
  for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
    const a = (i / NA) * Math.PI * 2, r = RC + 0.25 + (r1 - RC - 0.25) * Math.pow(j / NR, 1.4), x = Math.cos(a) * r, z = Math.sin(a) * r;
    pos.push(x, groundAt(x, z) + 0.07, z); pol.push(a, r);
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const p = j * (NA + 1) + i; idx.push(p, p + NA + 1, p + 1, p + 1, p + NA + 1, p + NA + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aPol', new THREE.Float32BufferAttribute(pol, 2));
  g.setIndex(idx); g.computeBoundingSphere();
  const uniforms = { uCast: { value: 1.5 }, uBreath: { value: 1 }, uT: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), ...uniforms },
    vertexShader: `attribute vec2 aPol; varying vec2 vPol;
      #include <fog_pars_vertex>
      void main() { vPol = aPol; vec3 transformed = position; vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uCast, uBreath, uT; varying vec2 vPol;
      #include <fog_pars_fragment>
      ${GLSL_PANES}
      void main() {
        float st = ${(Math.PI * 2 / N).toFixed(6)}, side = floor(vPol.x / st + 0.5), la = (vPol.x - side * st) / st;   // -0.5..0.5 across the side
        float r = vPol.y * (1.0 + 0.014 * sin(uT * 0.7));                                                                // the flask breathes: the patches move a little
        int si = int(mod(side, 12.0));
        vec2 q = vec2(la * 6.0, log(r) * 7.5); float row = floor(q.y); q.x += 0.5 * mod(row, 2.0); vec2 c = floor(q), f = fract(q) - 0.5;
        float h = flH(c * 2.3 + side * 7.31), h2 = flH(c * 4.1 + side * 3.3 + 5.0);
        int ci = h < 0.12 ? int(h * 66.0) : (h2 < smoothstep(6.0, 15.0, r) ? SB[si] : SA[si]);
        float blot = smoothstep(0.7, 0.12, length(f * vec2(1.0, 1.2))) * (0.35 + 0.65 * h2);
        float rib = smoothstep(0.5, 0.4, abs(la));
        float fall = pow(${RC.toFixed(3)} / r, 1.7) * smoothstep(${r1.toFixed(1)}, ${(r1 * 0.6).toFixed(1)}, r) * smoothstep(${(RC + 0.25).toFixed(2)}, ${(RC + 0.9).toFixed(2)}, r);
        vec3 col = PANES[ci] * blot * rib * fall * uCast * uBreath;
        #ifdef USE_FOG
          col *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
        #endif
        gl_FragColor = vec4(col, 1.0);
      }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  for (const k in uniforms) material.uniforms[k] = uniforms[k];
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'florilegium-cast'; mesh.renderOrder = 2;
  return { mesh, uniforms };
}
