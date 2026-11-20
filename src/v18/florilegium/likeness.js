// The Graffer's likenesses (v18-F2): six people of a rich house grown back as flowers, each in a stone tub, and a
// seventh tub with a sprout (stories/the-graffer.md; the order and the props are LIKENESSES in ../plan.js). Plants
// first: a bloom for a head with the face in its markings, petals for dress, leaves for arms, a stem for the body, a
// prop that is a leaf, a bud or a tendril. Each a different flower in a different colour.
//
// buildLikeness(id, opts) → { mesh, h, heads, tub }
//   id: an id of LIKENESSES ('fan' | 'sword' | 'hoop' | 'cup' | 'pair' | 'hawk' | 'graffer')
//   opts: { at: [x, y, z] = [0, 0, 0] the middle of the tub's foot (y: the floor it stands on); yaw: 0 (radians about
//     y; at 0 the figure faces +z); plant: true; tub: true (stone, r 0.62, 0.7 m high); roots: true (over the rim, and
//     down from the foot through the floor); rootDepth: 2.4 (how far below at.y they go); into: null (a Painter to paint
//     into instead of making a mesh); low: false (fewer sides) }
//   returns mesh (a THREE.Mesh with paintedMaterial; null when `into` is given), h (the plant's height over at.y),
//   heads ([{ slot, at: [x, y, z], yaw }]: each head's pivot in the world and the heading it rests at; two for the
//   pair), tub { r, h }.
//
// The heads turn (florilegium.js): a Painter made with TURN_ATTRS gets, per vertex, the head's slot (aId), how much of
// the head's turn the vertex takes (aTw: 1 the head, a little the shoulders, 0 the tub), whether it nods with the head
// (aN) and the pivot (aPx, aPy, aPz); likenessMaterial(uTurn) reads them. A plain Painter gets none of it and the
// figure stands still (the tubs' undersides in the Lower Beds).
import * as THREE from 'three';
import { Painter, paintedMaterial } from '../../fauna/uncanny/kit.js';

export const TUB = { r: 0.62, foot: 0.5, h: 0.7 };
export const TURN_ATTRS = ['aId', 'aTw', 'aN', 'aPx', 'aPy', 'aPz'];
export const SLOTS = { fan: [0], sword: [1], hoop: [2], cup: [3], pair: [4, 5], hawk: [6], graffer: [7] };
export const N_SLOTS = 8;

// the flowers' colours: one family a person (deep at the petal's foot, bright at its tip), the greens, stone and root
export const BLOOMS = {
  fan: { c0: '#6a1648', c1: '#e86aa6', face: '#f6dcc8', mark: '#3a0a2a', green: '#3f5a36' },    // a rose-madder iris
  sword: { c0: '#27306e', c1: '#8fa6ee', face: '#d8dcec', mark: '#141838', green: '#4a6470' },  // a sea-holly, steel blue
  hoop: { c0: '#b87a10', c1: '#f2d84a', face: '#fff0b0', mark: '#6a3a08', green: '#6f8a3c' },   // a primrose
  cup: { c0: '#5a0c16', c1: '#c8283a', face: '#f0c8a8', mark: '#2a0408', green: '#3a4a22' },    // a peony, pomegranate red
  pairA: { c0: '#8a8a6a', c1: '#f2ecd8', face: '#fff6e0', mark: '#4a4424', green: '#5a7a4a' },  // a lily, ivory
  pairB: { c0: '#8a2408', c1: '#f07a2a', face: '#fbd8a0', mark: '#3a0c04', green: '#4a6a34' },  // a tulip, vermilion
  hawk: { c0: '#2a1650', c1: '#9a6ae0', face: '#dcd0f0', mark: '#12082a', green: '#3a5244' },   // a monkshood, violet
  graffer: { c0: '#5a7a34', c1: '#a8c860', face: '#c8d890', mark: '#2a3a14', green: '#6a8a40' },
};
const STONE = '#77705f', STONE_D = '#4c4a40', MOSS = '#3d4f2c', SOIL = '#171210', ROOT = '#c2b392', ROOT_D = '#6e5c44';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lcg = (seed) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _a = new THREE.Color(), _b = new THREE.Color(), _t = new THREE.Color();

// one petal or leaf: a sheet from `at` along `dir`, its face toward `nrm`; wid at its widest (at `vm` of its length),
// curl bends it toward nrm along its length, cup lifts its edges toward nrm; c0 at the foot to c1 at the tip
function petal(P, o) {
  const { at, dir, nrm, len, wid, curl = 0, cup = 0, vm = 0.45, tip = 1, foot = 0.12, c0, c1, emit = 0.3, rough = 0.7, nu = 4, nv = 6, vein = 0.3 } = o;
  const d = norm(dir), n0 = norm(sub(nrm, mul(d, dot(nrm, d)))), s = cross(d, n0);
  _a.set(c0); _b.set(c1);
  P.sheet(nu, nv, (u, v, out) => {
    const x = u * 2 - 1;
    const w = wid * 0.5 * (v < vm ? Math.pow(Math.sin((Math.PI / 2) * (foot + (1 - foot) * (v / vm))), 0.8) : Math.pow(Math.max(0, Math.cos((Math.PI / 2) * ((v - vm) / (1 - vm)))), tip));
    const k = curl * len * v * v + cup * w * x * x;
    _t.copy(_a).lerp(_b, v).multiplyScalar(1 - vein * Math.max(0, 1 - Math.abs(x) * 2.5) * (1 - v * 0.6));
    P.paint(_t, 0, rough, emit * (0.6 + 0.4 * v));
    out[0] = at[0] + d[0] * len * v + n0[0] * k + s[0] * x * w;
    out[1] = at[1] + d[1] * len * v + n0[1] * k + s[1] * x * w;
    out[2] = at[2] + d[2] * len * v + n0[2] * k + s[2] * x * w;
  });
}
// an ellipsoid
function ball(P, c, rx, ry, rz, col, emit = 0, sides = 10, rings = 6, rough = 0.75) {
  P.paint(col, 0, rough, emit);
  P.grid(sides, rings, (u, v, out) => {
    const a = u * Math.PI * 2, ph = (0.02 + 0.96 * v) * Math.PI, s = Math.sin(ph);
    out[0] = c[0] + Math.cos(a) * s * rx; out[1] = c[1] - Math.cos(ph) * ry; out[2] = c[2] + Math.sin(a) * s * rz;
  }, true, true);
}
// a body of revolution about the figure's axis: prof [[r, y], ...]; ribs flute it; col(t, a) may paint each vertex
function turned(P, prof, o = {}) {
  const { sides = 14, sx = 1, sz = 1, ribs = 0, amp = 0, cx = 0, cz = 0, col = null, capA = true, capB = true } = o, n = prof.length - 1;
  P.grid(sides, n, (u, v, out) => {
    const k = Math.round(v * n), a = u * Math.PI * 2, r = prof[k][0] * (1 + amp * Math.cos(a * ribs));
    if (col) col(k / n, a, Math.cos(a * ribs));
    out[0] = cx + Math.cos(a) * r * sx; out[1] = prof[k][1]; out[2] = cz + Math.sin(a) * r * sz;
  }, capA, capB);
}
// a ring of petals hanging from a waist: a skirt, a coat, a ruff
function skirt(P, o) {
  const { y, r0 = 0.12, n = 8, len, wid, flare = 0.4, phase = 0, cx = 0, cz = 0, gap = 0, sz = 1, up = 0, ...rest } = o;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    if (gap && Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < gap) continue; // open down the front (+z)
    const c = Math.cos(a), s = Math.sin(a) * sz;
    petal(P, { at: [cx + c * r0, y, cz + s * r0], dir: [c * flare, up - 1, s * flare], nrm: [c, flare, s], len: len * (0.92 + 0.16 * ((i * 7) % 5) / 4), wid, ...rest });
  }
}
// a leaf for an arm: a blade along pts, widest at the elbow, with a small hand of a leaf at its end
function arm(P, pts, r, B, emit = 0.12) {
  P.paint(B.green, 0, 0.8, emit);
  const rad = pts.map((p, i) => { const t = i / (pts.length - 1), k = r * (0.75 + 0.5 * Math.sin(t * Math.PI)) * (1 - 0.35 * t); return [k, k * 0.62]; });
  P.loft(pts, rad, 6, 0, true);
  const e = pts[pts.length - 1], b = pts[pts.length - 2], d = norm(sub(e, b));
  petal(P, { at: e, dir: d, nrm: [0, 0.3, 1], len: 0.15, wid: 0.09, c0: B.green, c1: B.c1, emit: 0.2, nu: 2, nv: 3, cup: 0.3 });
}

// the head: a bloom facing +z round a face, on a neck from the pivot (the origin of the head's own frame)
function bloomHead(P, B, h, low) {
  const fy = h.fy ?? 0.19, fr = h.fr ?? 0.105, F = [0, fy, 0.045];
  P.paint(B.green, 0, 0.8, 0.06);
  P.loft([[0, -0.05, 0], [0, 0.04, -0.012], [0, fy - 0.04, -0.05]], [0.05, 0.042, 0.06], 6, 0, false);
  ball(P, [0, fy, -0.045], fr * 1.05, fr * 1.15, 0.075, B.green, 0.05, 8, 4);
  for (const L of h.layers) {
    const n = L.n, open = L.open ?? 0.25;
    for (let i = 0; i < n; i++) {
      const a = L.arc ? L.arc[0] + (n > 1 ? i / (n - 1) : 0.5) * (L.arc[1] - L.arc[0]) : (L.phase ?? 0) + (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), co = Math.cos(open), so = Math.sin(open);
      const k = L.lenAt ? L.lenAt(a) : 1;
      if (k <= 0) continue;
      petal(P, { at: [F[0] + c * fr * (L.r0 ?? 0.7), F[1] + s * fr * (L.r0 ?? 0.7) * 1.15, (L.z ?? 0) + 0.01], dir: [c * co, s * co, so], nrm: [-c * so, -s * so, co], len: L.len * k, wid: L.wid * (L.widAt ? L.widAt(a) : 1),
        curl: L.curl ?? 0, cup: L.cup ?? 0.25, tip: L.tip ?? 1, vm: L.vm ?? 0.5, c0: L.c0 ?? B.c0, c1: L.c1 ?? B.c1, emit: L.emit ?? 0.55, nu: low ? 2 : 4, nv: low ? 4 : 6 });
    }
  }
  // the face: pale, lit from within like any petal, and its markings: two long eye-blotches and the throat's streak
  ball(P, F, fr * (h.fw ?? 1), fr * 1.18, 0.06, B.face, 0.6, low ? 8 : 12, 6, 0.6);
  const ex = fr * 0.4 * (h.fw ?? 1), ey = fy + fr * 0.2;
  for (const sgn of [-1, 1]) {
    P.paint(B.mark, 0, 0.9, 0);
    P.grid(8, 1, (u, v, out) => { const a = u * Math.PI * 2, r = v; const px = Math.cos(a) * 0.021 * r, py = Math.sin(a) * 0.036 * r; out[0] = sgn * (ex + px * 0.9 - py * 0.35); out[1] = ey + py + px * 0.3 * sgn * sgn; out[2] = F[2] + 0.06 * Math.sqrt(Math.max(0.02, 1 - Math.pow((sgn * out[0]) / (fr * (h.fw ?? 1)), 2) - Math.pow((out[1] - fy) / (fr * 1.18), 2))) + 0.004; });
  }
  P.paint(B.mark, 0, 0.9, 0);
  P.grid(6, 1, (u, v, out) => { const a = u * Math.PI * 2; out[0] = Math.cos(a) * 0.011 * v; out[1] = fy - fr * 0.42 + Math.sin(a) * 0.04 * v; out[2] = F[2] + 0.06 * Math.sqrt(Math.max(0.02, 1 - Math.pow((out[1] - fy) / (fr * 1.18), 2))) + 0.004; });
  if (h.extra) h.extra(P, F, fr);
}

// ---------------------------------------------------------------- the seven. Each paints its body in the figure's frame
// (the tub's foot at the origin, facing +z) and returns its heads: { slot, pivot: [x, y, z], bodyW, head(P) }.

function lady(P, low) {
  const B = BLOOMS.fan;
  P.paint('#8aa860', 0, 0.8, 0.08); P.loft([[0, 0.6, 0], [0.02, 1.1, 0.01], [0, 1.6, 0]], [0.05, 0.045, 0.05], 6, 0, false);
  skirt(P, { y: 1.62, r0: 0.11, n: 8, len: 1.02, wid: 0.46, flare: 0.5, cup: -0.5, curl: 0.2, vm: 0.62, c0: B.c0, c1: B.c1, emit: 0.42, nv: low ? 4 : 7 });
  skirt(P, { y: 1.64, r0: 0.12, n: 7, len: 0.5, wid: 0.36, flare: 0.75, cup: -0.4, curl: 0.3, vm: 0.6, phase: 0.4, c0: B.c1, c1: '#f8b4d2', emit: 0.5 });
  turned(P, [[0.11, 1.58], [0.095, 1.68], [0.12, 1.8], [0.155, 1.94], [0.15, 2.0], [0.06, 2.06], [0.045, 2.12]], { sz: 0.75, ribs: 5, amp: 0.06, col: (t, a, rb) => P.paint(rb > 0.3 ? '#4a6a3c' : B.green, 0, 0.8, 0.08) });
  for (const s of [-1, 1]) petal(P, { at: [s * 0.13, 2.02, 0], dir: [s, -0.25, 0], nrm: [0, 1, 0.2], len: 0.2, wid: 0.2, cup: -0.5, curl: -0.6, c0: B.c1, c1: '#f8b4d2', emit: 0.45 });
  // the fan: a pleated leaf held open and high, in her right hand
  const hand = [0.44, 2.16, 0.14];
  arm(P, [[0.15, 1.99, 0], [0.36, 1.84, 0.1], hand], 0.05, B);
  arm(P, [[-0.15, 1.99, 0], [-0.3, 1.72, 0.06], [-0.26, 1.46, 0.16]], 0.05, B);
  const R = 0.46, a0 = 0.18, a1 = 2.3;
  P.sheet(low ? 14 : 22, 3, (u, v, out) => {
    const a = a0 + (a1 - a0) * u, pl = Math.cos(u * Math.PI * 11), r = (0.05 + 0.95 * v) * R * (1 - 0.07 * Math.abs(pl) * v);
    P.paint(pl > 0 ? '#a9c462' : '#6f9440', 0, 0.7, 0.42 * (0.5 + 0.5 * v));
    out[0] = hand[0] + Math.cos(a) * r; out[1] = hand[1] + Math.sin(a) * r; out[2] = hand[2] + 0.02 * pl * v + 0.1 * v * v;
  });
  return [{ slot: 0, pivot: [0, 2.12, 0], bodyW: 0.3, head: (P) => bloomHead(P, B, { layers: [
    { n: 6, len: 0.2, wid: 0.2, open: 0.3, curl: -0.35, phase: Math.PI / 6, lenAt: (a) => (Math.sin(a) > 0.3 ? 0 : 1) },                       // the falls
    { n: 3, arc: [Math.PI / 2 - 0.62, Math.PI / 2 + 0.62], len: 0.36, wid: 0.2, open: 0.45, curl: 0.5, cup: 0.5, c1: '#f8b4d2', r0: 0.6, lenAt: (a) => (Math.abs(a - Math.PI / 2) < 0.1 ? 1.15 : 0.9) }, // the standards: her hair, dressed high
  ] }, low) }];
}
function armiger(P, low) {
  const B = BLOOMS.sword, steel = '#6f8a96', steelD = '#3c5260';
  for (const s of [-1, 1]) { P.paint(steelD, 0, 0.7, 0.06); P.loft([[s * 0.1, 0.6, 0], [s * 0.11, 0.9, 0.01], [s * 0.1, 1.2, 0]], [0.075, 0.07, 0.085], 7, 0, false); }
  skirt(P, { y: 1.3, r0: 0.17, n: 11, len: 0.52, wid: 0.15, flare: 0.3, cup: -0.3, vm: 0.3, tip: 0.6, c0: steelD, c1: steel, emit: 0.2, nu: 2, nv: 4 }); // tassets: stiff bracts
  turned(P, [[0.17, 1.12], [0.2, 1.3], [0.19, 1.5], [0.245, 1.8], [0.275, 1.98], [0.2, 2.07], [0.075, 2.11], [0.055, 2.17]], { sz: 0.72, ribs: 8, amp: 0.05, col: (t, a, rb) => P.paint(rb > 0 ? steel : steelD, 0.2, 0.55, 0.1) });
  // the gorget and the pauldrons: spined bracts
  skirt(P, { y: 2.09, r0: 0.07, n: 9, len: 0.25, wid: 0.09, flare: 2.6, vm: 0.25, tip: 0.5, c0: B.c0, c1: B.c1, emit: 0.4, nu: 2, nv: 3 });
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI - Math.PI / 2; petal(P, { at: [s * 0.25, 1.99, 0], dir: [s * (0.8 + 0.2 * Math.cos(a)), 0.25 - 0.5 * Math.abs(Math.sin(a)), Math.sin(a)], nrm: [0, 1, 0], len: 0.2, wid: 0.11, vm: 0.3, tip: 0.5, cup: -0.6, c0: steelD, c1: B.c1, emit: 0.3, nu: 2, nv: 3 }); }
  // both hands on the sword: a bud spike, point down on the tub's rim before him
  const top = [0, 1.47, 0.37], point = [0, 0.71, 0.5];
  for (const s of [-1, 1]) arm(P, [[s * 0.27, 1.97, 0], [s * 0.36, 1.62, 0.17], [s * 0.05, 1.47, 0.35]], 0.065, { ...B, green: steelD });
  P.paint('#c9d6c0', 0.1, 0.5, 0.5);
  P.loft([top, [0, 1.2, 0.41], [0, 0.95, 0.455], [0, 0.78, 0.487], point], [[0.058, 0.02], [0.062, 0.02], [0.05, 0.018], [0.03, 0.012], [0.004, 0.004]], 6, 0, true);
  for (let i = 0; i < 6; i++) { const t = 0.12 + i * 0.13, s = i % 2 ? 1 : -1; ball(P, [s * 0.05, top[1] + (point[1] - top[1]) * t, top[2] + (point[2] - top[2]) * t], 0.022, 0.045, 0.018, '#dfe8cf', 0.5, 6, 4); } // the spike's buds, alternate
  P.paint(B.c1, 0.1, 0.5, 0.35); P.loft([[-0.24, 1.5, 0.37], [0, 1.47, 0.37], [0.24, 1.5, 0.37]], [[0.012, 0.03], [0.03, 0.035], [0.012, 0.03]], 6, 0, true); // the quillons: two leaves
  P.paint('#c9d6c0', 0.1, 0.5, 0.4); P.loft([[0, 1.47, 0.37], [0, 1.66, 0.345]], [0.022, 0.02], 6, 0, true);
  ball(P, [0, 1.7, 0.34], 0.045, 0.055, 0.045, B.c1, 0.5, 8, 5);
  return [{ slot: 1, pivot: [0, 2.17, 0], bodyW: 0.22, head: (P) => bloomHead(P, B, { fr: 0.1, layers: [
    { n: 16, len: 0.17, wid: 0.06, open: 0.35, vm: 0.3, tip: 0.5, cup: 0.1, lenAt: (a) => 1 + 1.6 * Math.pow(Math.max(0, Math.sin(a)), 4) }, // a thistle's spines, the crest longest
    { n: 11, len: 0.11, wid: 0.07, open: 0.7, vm: 0.3, tip: 0.6, phase: 0.3, c0: steelD, c1: steel, emit: 0.25 },
  ] }, low) }];
}

function child(P, low) {
  const B = BLOOMS.hoop;
  P.paint('#9ab85a', 0, 0.8, 0.08); P.loft([[0, 0.6, 0], [-0.015, 0.9, 0.01], [0, 1.2, 0]], [0.04, 0.036, 0.04], 6, 0, false);
  skirt(P, { y: 1.2, r0: 0.09, n: 6, len: 0.5, wid: 0.4, flare: 0.75, cup: -0.5, curl: 0.3, vm: 0.6, c0: B.c0, c1: B.c1, emit: 0.5 });
  turned(P, [[0.09, 1.17], [0.085, 1.26], [0.115, 1.38], [0.105, 1.44], [0.05, 1.48], [0.04, 1.53]], { sz: 0.8, ribs: 5, amp: 0.06, sides: 10, col: () => P.paint(B.green, 0, 0.8, 0.1) });
  // the hoop: a tendril grown round into a ring as tall as the child, standing on the rim beside it
  const hc = [0.5, 1.25, 0.12], HR = 0.55, nx = Math.cos(0.9), nz = -Math.sin(0.9); // the ring's plane: turned so it is a ring from the front and from the side
  const at = (a, r = HR) => [hc[0] + Math.cos(a) * r * nx, hc[1] + Math.sin(a) * r, hc[2] + Math.cos(a) * r * nz];
  const ring = []; for (let k = 0; k <= 28; k++) ring.push(at((k / 28) * Math.PI * 2));
  P.paint('#b4d05a', 0, 0.6, 0.55); P.loft(ring, ring.map(() => 0.03), 5, 0, false);
  P.loft([[0.12, 0.62, 0.1], [0.3, 0.72, 0.12], at(-Math.PI / 2 - 0.25), at(-Math.PI / 2 + 0.2)], [0.03, 0.03, 0.03, 0.03], 5, 0, false); // where it comes out of the soil
  for (let k = 0; k < 7; k++) { const a = 0.5 + k * 0.9, p = at(a), q = at(a, HR + 0.1); petal(P, { at: p, dir: sub(q, p), nrm: [nz, 0, -nx], len: 0.13, wid: 0.075, c0: '#6f8a3c', c1: '#b4d05a', emit: 0.35, nu: 2, nv: 3 }); }
  { const p = at(Math.PI * 0.62), sp = []; for (let k = 0; k <= 10; k++) { const t = k / 10, a = t * 7; sp.push([p[0] + 0.04 + Math.cos(a) * 0.05 * (1 - t), p[1] + 0.05 + t * 0.16, p[2] + Math.sin(a) * 0.05 * (1 - t)]); } P.loft(sp, sp.map((_, k) => 0.012 * (1 - k / 14)), 4, 0, true); } // a curl where the ring closes
  const hold = at(Math.PI * 0.92);
  arm(P, [[0.1, 1.42, 0], [0.19, 1.36, 0.05], hold], 0.04, B);
  arm(P, [[-0.1, 1.42, 0], [-0.24, 1.3, 0.04], [-0.3, 1.14, 0.1]], 0.04, B);
  return [{ slot: 2, pivot: [0, 1.53, 0], bodyW: 0.3, head: (P) => bloomHead(P, B, { fr: 0.1, fy: 0.17, layers: [
    { n: 13, len: 0.19, wid: 0.1, open: 0.12, vm: 0.6, tip: 0.7, cup: 0.15 },
    { n: 9, len: 0.11, wid: 0.09, open: 0.5, phase: 0.2, c0: B.c1, c1: '#fff0a0', emit: 0.6 },
  ] }, low) }];
}

function magnate(P, low) {
  const B = BLOOMS.cup, pod = '#5a5a22', podD = '#3a2a14';
  turned(P, [[0.2, 0.6], [0.4, 0.82], [0.56, 1.2], [0.55, 1.55], [0.44, 1.82], [0.33, 1.98], [0.13, 2.05], [0.075, 2.1]], { sz: 0.86, ribs: 9, amp: 0.07, sides: low ? 18 : 27, col: (t, a, rb) => P.paint(rb > 0.2 ? (t > 0.55 ? '#7a2a26' : pod) : podD, 0, 0.6, 0.12) });
  skirt(P, { y: 1.98, r0: 0.2, n: 9, len: 0.62, wid: 0.44, flare: 1.1, cup: -0.45, curl: -0.35, vm: 0.6, sz: 0.86, c0: B.c0, c1: B.c1, emit: 0.42 }); // a cape of petals over the shoulders
  skirt(P, { y: 2.04, r0: 0.1, n: 8, len: 0.26, wid: 0.24, flare: 2.2, cup: -0.3, curl: -0.4, phase: 0.3, c0: '#2a4a20', c1: '#5a7a34', emit: 0.15 }); // the collar
  // the cup: a goblet of a bloom, raised in his right hand
  const hand = [0.6, 2.2, 0.22];
  arm(P, [[0.33, 1.9, 0.02], [0.6, 1.84, 0.16], hand], 0.085, B);
  arm(P, [[-0.33, 1.9, 0.02], [-0.6, 1.58, 0.2], [-0.42, 1.36, 0.46]], 0.085, B);
  P.paint('#8a6a1e', 0.2, 0.5, 0.3); P.loft([hand, [hand[0], hand[1] + 0.12, hand[2]]], [0.022, 0.02], 6, 0, false);
  turned(P, [[0.02, 2.31], [0.085, 2.37], [0.12, 2.48], [0.13, 2.58]], { cx: hand[0], cz: hand[2], sides: 10, capA: false, capB: false, col: (t) => P.paint(t > 0.5 ? '#f0b83a' : '#b8801e', 0.2, 0.4, 0.9) });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); petal(P, { at: [hand[0] + c * 0.12, 2.56, hand[2] + s * 0.12], dir: [c * 0.45, 1, s * 0.45], nrm: [c, -0.3, s], len: 0.13, wid: 0.13, curl: 0.5, c0: '#d89a2a', c1: '#ffd870', emit: 0.95, nu: 2, nv: 3 }); }
  return [{ slot: 3, pivot: [0, 2.1, 0], bodyW: 0.16, head: (P) => bloomHead(P, B, { fr: 0.115, fw: 1.2, fy: 0.2, layers: [
    { n: 10, len: 0.2, wid: 0.22, open: 0.2, curl: 0.25, cup: 0.4, vm: 0.6, tip: 0.6 },
    { n: 8, len: 0.15, wid: 0.2, open: 0.55, curl: 0.5, cup: 0.5, phase: 0.35, vm: 0.6, tip: 0.6, c0: B.c1, c1: '#f07a80' },
    { n: 3, arc: [-Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62], len: 0.13, wid: 0.2, open: -0.1, curl: 0.2, vm: 0.6, tip: 0.5, c0: B.face, c1: '#f0a8a0', r0: 0.8, emit: 0.5 }, // the jowls
  ] }, low) }];
}

function lover(P, low, B, sgn, o) {
  // sgn: which side of the tub (-1 or +1); the two stems cross once above the soil and lean their heads together
  const x = sgn * 0.21, w = o.waist, sh = o.shoulder, pv = o.pivot;
  P.paint('#8aa860', 0, 0.8, 0.08);
  P.loft([[-sgn * 0.06, 0.6, 0.03 * sgn], [-sgn * 0.02, 0.8, -0.05 * sgn], [sgn * 0.08, 1.0, 0.03 * sgn], [x, 1.3, 0], [x, w, 0]], [0.045, 0.04, 0.04, 0.04, 0.045], 6, 0, false);
  if (o.bell) { skirt(P, { y: w + 0.02, r0: 0.09, n: 6, len: 0.92, wid: 0.36, flare: 0.36, cup: -0.5, curl: 0.35, vm: 0.7, cx: x, c0: B.c0, c1: B.c1, emit: 0.5 }); }
  else { skirt(P, { y: w + 0.02, r0: 0.09, n: 5, len: 0.8, wid: 0.2, flare: 0.16, cup: -0.6, vm: 0.4, cx: x, c0: B.c0, c1: B.c1, emit: 0.45 }); skirt(P, { y: w + 0.03, r0: 0.1, n: 4, len: 0.3, wid: 0.2, flare: 0.5, cup: -0.5, phase: 0.5, cx: x, c0: B.c1, c1: '#ffb060', emit: 0.5 }); }
  turned(P, [[0.095, w - 0.03], [0.085, w + 0.08], [0.11, w + 0.2], [o.bell ? 0.13 : 0.16, sh - 0.04], [o.bell ? 0.125 : 0.15, sh + 0.02], [0.055, sh + 0.07], [0.042, pv[1]]], { cx: x, sz: 0.75, ribs: 5, amp: 0.05, sides: 10, col: () => P.paint(B.green, 0, 0.8, 0.08) });
  // the inner hands joined between them, low; the outer arm down
  arm(P, [[x - sgn * 0.11, sh, 0.02], [sgn * 0.06, sh - 0.3, 0.12], [sgn * 0.012, 1.4, 0.2]], 0.045, B);
  arm(P, [[x + sgn * 0.13, sh, 0], [x + sgn * 0.24, sh - 0.28, 0.05], [x + sgn * 0.2, sh - 0.52, 0.12]], 0.045, B);
}
function lovers(P, low) {
  const A = BLOOMS.pairA, Bc = BLOOMS.pairB;
  const oa = { waist: 1.52, shoulder: 1.9, pivot: [-0.2, 2.01, 0], bell: true }, ob = { waist: 1.6, shoulder: 2.0, pivot: [0.2, 2.11, 0], bell: false };
  lover(P, low, A, -1, oa); lover(P, low, Bc, 1, ob);
  ball(P, [0, 1.39, 0.21], 0.045, 0.04, 0.04, '#b8d078', 0.3, 8, 4); // the clasp: two leaf-tips twined
  return [
    { slot: 4, pivot: oa.pivot, bodyW: 0, roll: -0.36, head: (P) => bloomHead(P, A, { fr: 0.095, layers: [
      { n: 6, len: 0.26, wid: 0.15, open: 0.5, curl: -0.5, cup: 0.3, vm: 0.4, tip: 0.8 },                                 // a lily's six, thrown back
      { n: 6, len: 0.1, wid: 0.03, open: 1.0, phase: 0.5, c0: '#8a8a40', c1: '#e8a020', emit: 0.7, nu: 2, nv: 2, cup: 0 }, // the anthers
    ] }, low) },
    { slot: 5, pivot: ob.pivot, bodyW: 0, roll: 0.4, head: (P) => bloomHead(P, Bc, { fr: 0.1, layers: [
      { n: 6, len: 0.24, wid: 0.2, open: 0.75, curl: 0.3, cup: 0.5, vm: 0.55, tip: 0.6 },                                // a tulip's cup
    ] }, low) },
  ];
}

function falconer(P, low) {
  const B = BLOOMS.hawk;
  P.paint('#7a9a5a', 0, 0.8, 0.08); P.loft([[0, 0.6, 0], [0.02, 1.2, -0.01], [0, 1.68, 0]], [0.05, 0.045, 0.05], 6, 0, false);
  skirt(P, { y: 1.7, r0: 0.11, n: 8, len: 1.08, wid: 0.22, flare: 0.2, cup: -0.5, curl: 0.1, vm: 0.35, tip: 0.7, gap: 0.3, c0: B.c0, c1: B.c1, emit: 0.42 }); // a long coat, open down the front
  turned(P, [[0.105, 1.66], [0.1, 1.78], [0.13, 1.92], [0.17, 2.06], [0.16, 2.11], [0.06, 2.16], [0.045, 2.22]], { sz: 0.72, ribs: 6, amp: 0.05, sides: 12, col: (t, a, rb) => P.paint(rb > 0.2 ? '#4a6a50' : B.green, 0, 0.8, 0.08) });
  skirt(P, { y: 2.13, r0: 0.08, n: 5, len: 0.34, wid: 0.2, flare: 1.4, cup: -0.5, curl: -0.3, c0: B.c0, c1: B.c1, emit: 0.4 }); // a shoulder cape
  // the lifted wrist, its glove a sheathing bract, and the bird: a fat bud with a beak, two sepals for wings, a leaf for a tail
  const wrist = [-0.76, 2.12, 0.12];
  arm(P, [[-0.16, 2.08, 0], [-0.44, 1.96, 0.07], wrist], 0.05, B);
  arm(P, [[0.16, 2.08, 0], [0.3, 1.8, 0.05], [0.27, 1.52, 0.12]], 0.05, B);
  P.paint('#a89050', 0, 0.8, 0.2); P.loft([[-0.5, 2.0, 0.085], [-0.62, 2.06, 0.1], [-0.78, 2.13, 0.12]], [0.075, 0.07, 0.06], 7, 0, true);
  const by = wrist[1] + 0.06, bx = wrist[0];
  P.paint('#d8c8a0', 0, 0.6, 0.5);
  P.loft([[bx + 0.035, by, 0.12], [bx + 0.02, by + 0.1, 0.12], [bx - 0.015, by + 0.22, 0.12], [bx - 0.03, by + 0.3, 0.12], [bx - 0.04, by + 0.345, 0.12]], [[0.035, 0.035], [0.085, 0.075], [0.075, 0.07], [0.05, 0.05], [0.03, 0.03]], 8, 0, true);
  P.paint('#e8b040', 0, 0.5, 0.6); P.loft([[bx - 0.055, by + 0.325, 0.12], [bx - 0.115, by + 0.3, 0.12], [bx - 0.135, by + 0.265, 0.12]], [0.02, 0.012, 0.002], 5, 0, true); // the beak, hooked
  for (const s of [-1, 1]) petal(P, { at: [bx - 0.01, by + 0.25, 0.12 + s * 0.07], dir: [0.3, -1, s * 0.12], nrm: [0, 0, s], len: 0.27, wid: 0.12, cup: -0.5, vm: 0.35, tip: 0.7, c0: '#8a6a9a', c1: '#5a4a3a', emit: 0.3, nu: 2, nv: 4 });
  petal(P, { at: [bx + 0.05, by + 0.06, 0.12], dir: [0.45, -1, 0], nrm: [1, 0.4, 0], len: 0.24, wid: 0.09, vm: 0.6, tip: 0.4, c0: '#5a4a3a', c1: '#8a6a9a', emit: 0.3, nu: 2, nv: 3 });
  for (const s of [-1, 1]) ball(P, [bx - 0.06, by + 0.315, 0.12 + s * 0.026], 0.008, 0.008, 0.006, '#100808', 0, 5, 3);
  return [{ slot: 6, pivot: [0, 2.22, 0], bodyW: 0.28, head: (P) => bloomHead(P, B, { fr: 0.095, layers: [
    { n: 2, len: 0.2, wid: 0.2, open: 0.3, curl: 0.2, cup: 0.4, phase: Math.PI }, // the side petals
    { n: 2, arc: [-Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45], len: 0.16, wid: 0.12, open: 0.2 },
  ], extra: (P, F, fr) => {
    // the hood: one great helmet of a petal over the crown, curled forward over the face
    petal(P, { at: [0, F[1] + fr * 0.2, -0.09], dir: [0, 1, 0.1], nrm: [0, 0.1, 1], len: 0.46, wid: 0.44, curl: 0.75, cup: 1.0, vm: 0.5, tip: 0.55, c0: B.c0, c1: B.c1, emit: 0.5, nu: low ? 4 : 6, nv: low ? 5 : 8 });
  } }, low) }];
}

function sprout(P) {
  const B = BLOOMS.graffer;
  P.paint(B.c1, 0, 0.7, 0.35); P.loft([[0, 0.62, 0], [0.002, 0.68, 0.002], [0, 0.72, 0.006]], [0.012, 0.011, 0.01], 5, 0, false);
  for (const s of [-1, 1]) petal(P, { at: [0, 0.685, 0], dir: [s, 0.5, 0.1], nrm: [0, 1, 0], len: 0.06, wid: 0.035, cup: 0.3, c0: B.c0, c1: B.c1, emit: 0.4, nu: 2, nv: 3 });
  return [{ slot: 7, pivot: [0, 0.72, 0], bodyW: 0.2, head: (P) => {
    // already stooped: the stem bowed over, a shut bud hanging from it
    P.paint(B.c1, 0, 0.7, 0.35); P.loft([[0, -0.005, 0.006], [0, 0.05, 0.016], [0, 0.085, 0.04], [0, 0.09, 0.07], [0, 0.07, 0.092]], [0.01, 0.009, 0.008, 0.008, 0.008], 5, 0, false);
    ball(P, [0, 0.052, 0.098], 0.014, 0.024, 0.014, B.face, 0.5, 6, 4);
  } }];
}

const MAKERS = { fan: lady, sword: armiger, hoop: child, cup: magnate, pair: lovers, hawk: falconer, graffer: sprout };

// ---------------------------------------------------------------- the tub and the roots
function tub(P, low, rnd) {
  const ph = rnd() * 6.28;
  turned(P, [[0.5, 0], [0.53, 0.05], [0.5, 0.09], [0.55, 0.38], [0.6, 0.6], [0.66, 0.635], [0.66, 0.7], [0.57, 0.7], [0.55, 0.62]], { sides: low ? 12 : 18, col: (t, a) => {
    const m = smooth(0.35, 1, t + 0.25 * Math.sin(a * 3 + ph) + 0.15 * Math.sin(a * 7 + ph * 2));
    _t.set(t < 0.15 ? STONE_D : STONE).lerp(_a.set(MOSS), m * 0.85); P.paint(_t, 0, 0.95, 0);
  }, capB: false });
  P.paint(SOIL, 0, 1, 0); turned(P, [[0.55, 0.62], [0.3, 0.635], [0.02, 0.645]], { sides: low ? 12 : 18, capA: false });
}
function roots(P, low, rnd, depth, thin) {
  const sides = low ? 5 : 7, n = thin ? 1 : 3;
  // over the rim and down the tub's side into the floor
  if (!thin) for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, c = Math.cos(a), s = Math.sin(a), k = 0.05 + rnd() * 0.02, w = (rnd() - 0.5) * 0.5, out = 0.78 + rnd() * 0.35;
    const cw = Math.cos(a + w), sw = Math.sin(a + w);
    P.paint(ROOT, 0, 0.8, 0.14);
    P.loft([[c * 0.18, 0.6, s * 0.18], [c * 0.45, 0.68, s * 0.45], [c * 0.63, 0.74, s * 0.63], [c * 0.71, 0.6, s * 0.71], [cw * 0.69, 0.3, sw * 0.69], [cw * out, 0.05, sw * out], [cw * (out + 0.12), -0.12, sw * (out + 0.12)]], [k * 0.7, k, k * 1.05, k, k * 0.95, k * 1.1, k * 0.9], sides, 0, false);
  }
  // down from the foot: one as thick as an arm, the rest lesser, wandering, ending ragged
  if (depth > 0) for (let i = 0; i < (thin ? 1 : low ? 3 : 5); i++) {
    const a = rnd() * 6.28, r0 = i === 0 ? 0.05 : 0.15 + rnd() * 0.25, k = thin ? 0.012 : i === 0 ? 0.085 : 0.03 + rnd() * 0.03, L = thin ? Math.min(depth, 0.5) : depth * (i === 0 ? 1 : 0.5 + rnd() * 0.45);
    const pts = [], rad = [], m = low ? 5 : 8, dx = (rnd() - 0.5) * 0.5, dz = (rnd() - 0.5) * 0.5, f1 = 2 + rnd() * 3, f2 = rnd() * 6;
    for (let j = 0; j <= m; j++) { const t = j / m; pts.push([Math.cos(a) * r0 + dx * t + 0.07 * Math.sin(t * f1 * 3 + f2) * t, 0.02 - L * t, Math.sin(a) * r0 + dz * t + 0.07 * Math.cos(t * f1 * 2.3 + f2) * t]); rad.push(k * (1 - 0.72 * t) * (1 + 0.15 * Math.sin(t * 19 + f2))); }
    _t.set(ROOT).lerp(_a.set(ROOT_D), 0.25 + rnd() * 0.3); P.paint(_t, 0, 0.8, 0.14);
    P.loft(pts, rad, sides, 0, true);
  }
}

export function buildLikeness(id, opts = {}) {
  const { at = [0, 0, 0], yaw = 0, plant = true, tub: withTub = true, roots: withRoots = true, rootDepth = 2.4, into = null, low = false } = opts;
  const make = MAKERS[id];
  if (!make) throw new Error(`buildLikeness: no likeness '${id}'`);
  const P = into || new Painter();
  const turning = P.extraNames.includes('aTw');
  const M = new THREE.Matrix4().makeRotationY(yaw).setPosition(at[0], at[1], at[2]), keep = P.m;
  const rnd = lcg(0x9e37 + Object.keys(MAKERS).indexOf(id) * 7919);
  const fill = (a, b, slot, pv, w) => { // the turning attributes for vertices a..b: w a number, or a function of the height over the floor
    if (!turning) return;
    for (let i = a; i < b; i++) { const E = P.extra; E.aId[i] = slot; E.aTw[i] = typeof w === 'function' ? w(P.p[i * 3 + 1] - at[1]) : w; E.aN[i] = w === 1 ? 1 : 0; E.aPx[i] = pv.x; E.aPy[i] = pv.y; E.aPz[i] = pv.z; }
  };
  P.xf(M);
  const n0 = P.n;
  if (withTub) tub(P, low, rnd);
  if (withRoots) roots(P, low, rnd, rootDepth, id === 'graffer');
  fill(n0, P.n, 0, new THREE.Vector3(), 0);
  const heads = [];
  let h = TUB.h;
  if (plant) {
    const a = P.n, parts = make(P, low), b = P.n;
    // (a body's vertices take their own head's slot: for the pair, by the side of the tub they stand on)
    for (const part of parts) {
      const pv = new THREE.Vector3(...part.pivot).applyMatrix4(M);
      if (turning) for (let i = a; i < b; i++) {
        if (parts.length > 1 && (P.p[i * 3] - at[0]) * Math.cos(yaw) - (P.p[i * 3 + 2] - at[2]) * Math.sin(yaw) > 0 !== part.pivot[0] > 0) continue;
        fill(i, i + 1, part.slot, pv, (y) => part.bodyW * smooth(TUB.h + 0.2, part.pivot[1], y));
      }
      const Mh = M.clone().multiply(new THREE.Matrix4().makeTranslation(...part.pivot)).multiply(new THREE.Matrix4().makeRotationZ(part.roll || 0));
      P.xf(Mh);
      const c = P.n; part.head(P);
      fill(c, P.n, part.slot, pv, 1);
      for (let i = c; i < P.n; i++) h = Math.max(h, P.p[i * 3 + 1] - at[1]);
      P.xf(M);
      heads.push({ slot: part.slot, at: [pv.x, pv.y, pv.z], yaw });
    }
  }
  P.xf(keep);
  let mesh = null;
  if (!into) { mesh = new THREE.Mesh(P.geometry(), paintedMaterial({ side: THREE.DoubleSide })); mesh.name = `likeness-${id}`; mesh.receiveShadow = true; }
  return { mesh, h, heads, tub: { r: TUB.r, h: TUB.h } };
}

// The material of the likenesses that turn. uTurn: N_SLOTS Vector4s (the head's turn from its rest in radians about y,
// its nod (+ up), the heading it rests at, unused).
export function likenessMaterial(uTurn) {
  const rot = `
    { vec4 tq = uTurn[int(aId + 0.5)]; vec3 pv = vec3(aPx, aPy, aPz); vec3 q = QQ - pv * PV;
      if (aN > 0.5) { vec3 k = vec3(cos(tq.z), 0.0, -sin(tq.z)); float c = cos(-tq.y), s = sin(-tq.y); q = q * c + cross(k, q) * s + k * dot(k, q) * (1.0 - c); }
      float a = tq.x * aTw, c2 = cos(a), s2 = sin(a);
      QQ = pv * PV + vec3(q.x * c2 + q.z * s2, q.y, -q.x * s2 + q.z * c2); }`;
  const m = paintedMaterial({ side: THREE.DoubleSide }, (sh) => {
    sh.uniforms.uTurn = { value: uTurn };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aId, aTw, aN, aPx, aPy, aPz; uniform vec4 uTurn[${N_SLOTS}];`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + rot.replaceAll('QQ', 'objectNormal').replaceAll('PV', '0.0'))
      .replace('vMRE = aMRE;', 'vMRE = aMRE;\n' + rot.replaceAll('QQ', 'transformed').replaceAll('PV', '1.0'));
  });
  m.customProgramCacheKey = () => 'fp-likeness';
  return m;
}
