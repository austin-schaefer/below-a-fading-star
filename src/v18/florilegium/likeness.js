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
let FINE = true; // set by buildLikeness: more sides and segments off the low tier

// one petal or leaf: a sheet from `at` along `dir`, its face toward `nrm`; wid at its widest (at `vm` of its length),
// curl bends it toward nrm along its length, cup lifts its edges toward nrm; c0 at the foot to c1 at the tip
function petal(P, o) {
  const { at, dir, nrm, len, wid, curl = 0, cup = 0, vm = 0.45, tip = 1, foot = 0.12, c0, c1, emit = 0.3, rough = 0.7, nu = FINE ? 6 : 3, nv = FINE ? 9 : 5, vein = 0.3 } = o;
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
  const { sides = FINE ? 22 : 12, sx = 1, sz = 1, ribs = 0, amp = 0, cx = 0, cz = 0, col = null, capA = true, capB = true } = o, n = prof.length - 1;
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
  P.loft(pts, rad, FINE ? 9 : 6, 0, true);
  const e = pts[pts.length - 1], b = pts[pts.length - 2], d = norm(sub(e, b));
  petal(P, { at: e, dir: d, nrm: [0, 0.3, 1], len: 0.15, wid: 0.09, c0: B.green, c1: B.c1, emit: 0.2, nu: 2, nv: 3, cup: 0.3 });
}

// a small body turned about the head's z (a pod, a boss): prof [[r, z], ...]
function turnedZ(P, F, prof, c0, c1) {
  P.grid(10, prof.length - 1, (u, v, out) => { const k = Math.round(v * (prof.length - 1)), a = u * Math.PI * 2; P.paint(Math.cos(a * 5) > 0 ? c0 : c1, 0, 0.6, 0.25); out[0] = Math.cos(a) * prof[k][0]; out[1] = F[1] + Math.sin(a) * prof[k][0]; out[2] = prof[k][1]; }, false, true);
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
      petal(P, { at: [F[0] + c * fr * (L.r0 ?? 0.45), F[1] + s * fr * (L.r0 ?? 0.45) * 1.15, (L.z ?? 0) + 0.01], dir: [c * co, s * co, so], nrm: [-c * so, -s * so, co], len: L.len * k, wid: L.wid * (L.widAt ? L.widAt(a) : 1),
        curl: L.curl ?? 0, cup: L.cup ?? 0.25, tip: L.tip ?? 1, vm: L.vm ?? 0.5, c0: L.c0 ?? B.c0, c1: L.c1 ?? B.c1, emit: L.emit ?? 0.55, nu: low ? 2 : 5, nv: low ? 4 : 8 });
    }
  }
  // the heart of the bloom. No face is drawn: a dark throat, and the flower's own markings lying on the petals round
  // it (h.marks: [{ a, r, sx, sy, rot, c, z }]), unequal and off the middle, so that a visitor decides which are eyes
  const markC = new THREE.Color(B.mark).lerp(new THREE.Color(B.c0), 0.4), deep = new THREE.Color(B.c0).multiplyScalar(0.5), fw = h.fw ?? 1, TH = h.throat ?? {};
  P.grid(low ? 8 : 12, 2, (u, v, out) => { const a = u * Math.PI * 2, r = (TH.r ?? fr * 0.6) * (1 - v * 0.8); P.paint(v > 0.4 ? (TH.c ?? markC) : deep, 0, 0.9, 0.08); out[0] = Math.cos(a) * r * fw; out[1] = fy + Math.sin(a) * r * 1.15; out[2] = 0.035 - v * (TH.d ?? 0.07); }, false, true);
  for (const m of h.marks || []) {
    const cx = Math.cos(m.a) * m.r * fw, cy = fy + Math.sin(m.a) * m.r * 1.15, cz = m.z ?? 0.04 + Math.max(0, m.r - fr * 0.4) * Math.sin(h.markOpen ?? 0.3), cr = Math.cos(m.rot ?? m.a), sr = Math.sin(m.rot ?? m.a);
    P.paint(m.c ?? markC, 0, 0.9, m.e ?? 0.1);
    P.grid(7, 1, (u, v, out) => { const t = u * Math.PI * 2, px = Math.cos(t) * m.sx * v * (1 + 0.25 * Math.sin(t * 3 + m.a * 5)), py = Math.sin(t) * m.sy * v; out[0] = cx + px * cr - py * sr; out[1] = cy + px * sr + py * cr; out[2] = cz; });
  }
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
  return [{ slot: 0, pivot: [0, 2.12, 0], bodyW: 0.3, scale: 1.15, head: (P) => bloomHead(P, B, { marks: [{ a: -1.57, r: 0.115, sx: 0.016, sy: 0.075, rot: 0, c: '#f2c84a', e: 0.6 }, { a: 2.55, r: 0.085, sx: 0.034, sy: 0.02 }, { a: 0.8, r: 0.07, sx: 0.015, sy: 0.011 }, { a: -2.2, r: 0.13, sx: 0.05, sy: 0.006 }, { a: -0.9, r: 0.14, sx: 0.04, sy: 0.005 }], layers: [
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
  return [{ slot: 1, pivot: [0, 2.17, 0], bodyW: 0.22, scale: 1.15, head: (P) => bloomHead(P, B, { fr: 0.1, throat: { r: 0.012, d: 0.01 }, marks: [{ a: 2.3, r: 0.04, sx: 0.014, sy: 0.02, c: '#c8d4f4', z: 0.125, e: 0.5 }, { a: 0.5, r: 0.05, sx: 0.008, sy: 0.011, c: '#c8d4f4', z: 0.115, e: 0.5 }], extra: (P, F, fr) => { P.grid(12, 5, (u, v, out) => { const a = u * 6.283, ph = v * 1.5, k = 1 + 0.12 * Math.cos(a * 6 + v * 9); P.paint(v > 0.5 ? B.c0 : '#141838', 0.1, 0.7, 0.15); out[0] = Math.cos(a) * Math.cos(ph) * fr * 0.85 * k; out[1] = F[1] + Math.sin(a) * Math.cos(ph) * fr * 0.95 * k; out[2] = 0.02 + Math.sin(ph) * 0.11; }, false, true); }, layers: [
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
  return [{ slot: 2, pivot: [0, 1.53, 0], bodyW: 0.3, head: (P) => bloomHead(P, B, { fr: 0.085, fy: 0.15, throat: { r: 0.022, d: 0.04, c: '#7a4a08' }, marks: [0, 1, 2, 3, 4].map((i) => ({ a: 0.5 + i * 1.2566, r: 0.045, sx: 0.022, sy: 0.011, c: '#e8861a', e: 0.6 })), layers: [
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
  const hand = [0.72, 2.62, 0.2];
  arm(P, [[0.33, 1.9, 0.02], [0.66, 2.0, 0.14], hand], 0.085, B);
  arm(P, [[-0.33, 1.9, 0.02], [-0.6, 1.58, 0.2], [-0.42, 1.36, 0.46]], 0.085, B);
  P.paint('#8a6a1e', 0.2, 0.5, 0.3); P.loft([hand, [hand[0], hand[1] + 0.14, hand[2]]], [0.03, 0.026], 6, 0, false);
  turned(P, [[0.03, hand[1] + 0.13], [0.13, hand[1] + 0.2], [0.185, hand[1] + 0.36], [0.2, hand[1] + 0.5]], { cx: hand[0], cz: hand[2], sides: 10, capA: false, capB: false, col: (t) => P.paint(t > 0.5 ? '#f0b83a' : '#b8801e', 0.2, 0.4, 0.9) });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); petal(P, { at: [hand[0] + c * 0.19, hand[1] + 0.48, hand[2] + s * 0.19], dir: [c * 0.5, 1, s * 0.5], nrm: [c, -0.3, s], len: 0.2, wid: 0.2, curl: 0.5, c0: '#d89a2a', c1: '#ffd870', emit: 0.95, nu: 2, nv: 3 }); }
  return [{ slot: 3, pivot: [0, 2.1, 0], bodyW: 0.16, scale: 1.1, head: (P) => bloomHead(P, B, { fr: 0.115, fw: 1.15, fy: 0.2, throat: { r: 0.02, d: 0.02 }, marks: [{ a: 0.5, r: 0.085, sx: 0.05, sy: 0.034, c: '#12040a' }, { a: 2.2, r: 0.08, sx: 0.034, sy: 0.024, c: '#12040a' }, { a: 3.9, r: 0.09, sx: 0.055, sy: 0.03, c: '#12040a' }, { a: 5.3, r: 0.085, sx: 0.03, sy: 0.04, c: '#12040a' }], extra: (P, F) => { turnedZ(P, F, [[0.045, 0.02], [0.05, 0.07], [0.058, 0.1], [0.02, 0.115]], '#9aa860', '#5a6a30'); }, layers: [
    { n: 4, len: 0.3, wid: 0.36, open: 0.3, curl: 0.3, cup: 0.5, vm: 0.62, tip: 0.45, phase: 0.6 },
    { n: 3, len: 0.24, wid: 0.3, open: 0.5, curl: 0.4, cup: 0.5, phase: 1.5, vm: 0.6, tip: 0.5, c0: B.c0, c1: '#e0444a' },
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
    { slot: 4, pivot: oa.pivot, bodyW: 0, roll: -0.36, head: (P) => bloomHead(P, A, { fr: 0.095, throat: { r: 0.05, d: 0.12, c: '#6a7a30' }, marks: [[-1.2, 0.1, 0.012], [-1.9, 0.13, 0.009], [-0.6, 0.14, 0.014], [-2.6, 0.11, 0.008], [-1.5, 0.17, 0.01], [0.2, 0.12, 0.007], [2.9, 0.15, 0.011], [-0.9, 0.2, 0.008], [-2.2, 0.19, 0.012]].map(([a, r, k]) => ({ a, r, sx: k, sy: k * 1.5, c: '#7a2a1c' })), layers: [
      { n: 6, len: 0.26, wid: 0.15, open: 0.5, curl: -0.5, cup: 0.3, vm: 0.4, tip: 0.8 },                                 // a lily's six, thrown back
      { n: 6, len: 0.1, wid: 0.03, open: 1.0, phase: 0.5, c0: '#8a8a40', c1: '#e8a020', emit: 0.7, nu: 2, nv: 2, cup: 0 }, // the anthers
    ] }, low) },
    { slot: 5, pivot: ob.pivot, bodyW: 0, roll: 0.4, head: (P) => bloomHead(P, Bc, { fr: 0.1, throat: { r: 0.045, d: 0.05, c: '#f0c020' }, marks: [{ a: 1.2, r: 0.07, sx: 0.045, sy: 0.022, c: '#1a0810' }, { a: 3.4, r: 0.065, sx: 0.03, sy: 0.02, c: '#1a0810' }, { a: 5.4, r: 0.075, sx: 0.05, sy: 0.018, c: '#1a0810' }], layers: [
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
  const wrist = [-1.02, 2.08, 0.14];
  arm(P, [[-0.16, 2.08, 0], [-0.58, 1.98, 0.08], wrist], 0.055, B);
  arm(P, [[0.16, 2.08, 0], [0.3, 1.8, 0.05], [0.27, 1.52, 0.12]], 0.05, B);
  P.paint('#a89050', 0, 0.8, 0.2); P.loft([[-0.72, 2.0, 0.1], [-0.88, 2.04, 0.12], [-1.05, 2.09, 0.14]], [0.08, 0.075, 0.065], 7, 0, true);
  // (its back to the falconer, its head turned out: a hooked beak, a dark cap, folded wings, a tail hanging below the fist)
  const by = wrist[1] + 0.05, bx = wrist[0] - 0.02, bz = 0.14, P0 = P.m;
  P.xf(P0.clone().multiply(new THREE.Matrix4().makeTranslation(bx, by, bz)).multiply(new THREE.Matrix4().makeRotationY(-0.9)).multiply(new THREE.Matrix4().makeScale(1.45, 1.45, 1.45)).multiply(new THREE.Matrix4().makeTranslation(-bx, -by, -bz)));
  ball(P, [bx, by + 0.2, bz], 0.1, 0.2, 0.11, '#d8c49a', 0.45, 10, 7);
  for (const s of [-1, 1]) ball(P, [bx + 0.03, by + 0.19, bz + s * 0.095], 0.07, 0.17, 0.03, '#4a3c5c', 0.25, 8, 5);
  ball(P, [bx - 0.03, by + 0.43, bz], 0.07, 0.07, 0.07, '#d8c49a', 0.45, 8, 6);
  ball(P, [bx - 0.02, by + 0.47, bz], 0.066, 0.045, 0.066, '#2e2240', 0.2, 8, 4);
  P.paint('#e8b040', 0, 0.5, 0.7); P.loft([[bx - 0.085, by + 0.43, bz], [bx - 0.15, by + 0.41, bz], [bx - 0.165, by + 0.36, bz]], [0.028, 0.018, 0.003], 5, 0, true);
  for (const s of [-1, 1]) ball(P, [bx - 0.075, by + 0.45, bz + s * 0.045], 0.012, 0.012, 0.01, '#100808', 0, 5, 3);
  petal(P, { at: [bx + 0.06, by + 0.08, bz], dir: [0.35, -1, 0], nrm: [1, 0.35, 0], len: 0.34, wid: 0.13, vm: 0.6, tip: 0.4, c0: '#4a3c5c', c1: '#8a7a9a', emit: 0.3, nu: 2, nv: 3 });
  P.xf(P0);
  return [{ slot: 6, pivot: [0, 2.22, 0], bodyW: 0.28, scale: 1.15, head: (P) => bloomHead(P, B, { fr: 0.095, throat: { r: 0.07, d: 0.1, c: '#0c0618' }, marks: [{ a: -2.0, r: 0.07, sx: 0.014, sy: 0.009, c: '#e8dcf8', e: 0.6 }, { a: -0.7, r: 0.085, sx: 0.008, sy: 0.006, c: '#e8dcf8', e: 0.6 }, { a: -1.5, r: 0.13, sx: 0.006, sy: 0.03, rot: 0, c: '#e8dcf8', e: 0.4 }], layers: [
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
    const a = rnd() * 6.28, k = 0.042 + rnd() * 0.02, w = (rnd() - 0.5) * 0.9, out = 0.7 + rnd() * 0.2, f = rnd() * 6, pts = [], rad = [];
    const path = [[0.16, 0.6], [0.4, 0.67], [0.6, 0.735], [0.69, 0.66], [0.665, 0.5], [0.63, 0.34], [0.6, 0.2], [0.62, 0.08], [out, 0.02], [out + 0.1, -0.12]];
    path.forEach(([r, y], j) => { const t = j / (path.length - 1), b = a + w * t * t + 0.06 * Math.sin(t * 9 + f); pts.push([Math.cos(b) * r, y, Math.sin(b) * r]); rad.push(k * (0.75 + 0.35 * Math.sin(t * 3.1)) * (1 + 0.12 * Math.sin(t * 23 + f))); });
    _t.set(ROOT).lerp(_a.set(ROOT_D), 0.35 + rnd() * 0.35); P.paint(_t, 0, 0.85, 0.08);
    P.loft(pts, rad, sides, 0, false);
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
  FINE = !low;
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
    const G = id === 'graffer' ? 1 : 1.17, Mp = M.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.62, 0)).multiply(new THREE.Matrix4().makeScale(G, G, G)).multiply(new THREE.Matrix4().makeTranslation(0, -0.62, 0));
    P.xf(Mp);
    const a = P.n, parts = make(P, low), b = P.n;
    // (a body's vertices take their own head's slot: for the pair, by the side of the tub they stand on)
    for (const part of parts) {
      const pv = new THREE.Vector3(...part.pivot).applyMatrix4(Mp);
      if (turning) for (let i = a; i < b; i++) {
        if (parts.length > 1 && (P.p[i * 3] - at[0]) * Math.cos(yaw) - (P.p[i * 3 + 2] - at[2]) * Math.sin(yaw) > 0 !== part.pivot[0] > 0) continue;
        fill(i, i + 1, part.slot, pv, (y) => part.bodyW * smooth(TUB.h + 0.2, pv.y - at[1], y));
      }
      const Mh = Mp.clone().multiply(new THREE.Matrix4().makeTranslation(...part.pivot)).multiply(new THREE.Matrix4().makeRotationZ(part.roll || 0)).multiply(new THREE.Matrix4().makeScale(part.scale || 1, part.scale || 1, part.scale || 1));
      P.xf(Mh);
      const c = P.n; part.head(P);
      fill(c, P.n, part.slot, pv, 1);
      for (let i = c; i < P.n; i++) h = Math.max(h, P.p[i * 3 + 1] - at[1]);
      P.xf(Mp);
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
      float a = aN > 0.5 ? tq.x : tq.w * aTw, c2 = cos(a), s2 = sin(a);
      QQ = pv * PV + vec3(q.x * c2 + q.z * s2, q.y, -q.x * s2 + q.z * c2); }`;
  const m = paintedMaterial({ side: THREE.DoubleSide }, (sh) => {
    sh.uniforms.uTurn = { value: uTurn };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aId, aTw, aN, aPx, aPy, aPz; uniform vec4 uTurn[${N_SLOTS}];`)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + rot.replaceAll('QQ', 'objectNormal').replaceAll('PV', '0.0'))
      .replace('vMRE = aMRE;', 'vMRE = aMRE;\n' + rot.replaceAll('QQ', 'transformed').replaceAll('PV', '1.0'));
  });
  // lit from behind by the flask, a leaf or a petal shows the light through it: every surface gives back a share of its own colour
  const obc = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { obc(sh, r); sh.fragmentShader = sh.fragmentShader.replace('vMRE.z * uEmit', '(vMRE.z + 0.16) * uEmit'); };
  m.userData.uEmit.value = 1.7;
  m.customProgramCacheKey = () => 'fp-likeness';
  return m;
}
