// The liveries (v8-06): who the living belong to, as colours and three small pieces of geometry every figure rig can
// add into its own Painter (src/fauna/uncanny/kit.js), so each figure stays one mesh. The bible is briefs/v8/index.md
// ("The living"). ?livery=0 restores v7's costumes and leaves out the dealings' props (src/v8/livery/props.js).
//
// Two peoples, never the same rendering:
//   the Heliarchy's officers   the ember stole (LIVERY.stole, #c8501e, faded and frayed, darker where it is dirty), the
//                              formal sign in brass (a disc in a V notch, the bible's proportions: `badge`), and one shared
//                              cut, the tall stiff collar edged in brass (`collar`). Their coats are a dark blue-grey
//                              (LIVERY.coat), lifted from v7's near-black so they stand off the grazed common.
//   the Late folk              patched colour, two or three cloths a garment (LIVERY.late: pomegranate, saffron, turquoise,
//                              undyed; `patch`), and the sign sewn on wrong, small (`wrongSign`: the notch a crescent, the
//                              disc a pomegranate). Brief 05's house people take the same: import this file.
//
// Every helper writes vertices into a Painter P through P.v (so a rig's own per-vertex attributes, its part or bone or
// hem weight, are whatever the caller set before the call; `each(t)` lets a stole set them per ring), and records the
// vertex range it wrote into P.livery = { people, stole: [[v0, v1]...], badge: [...], cloths: Set of hex } for the
// livery test (tools/livery-test.mjs reads it from the mesh's geometry.userData.livery).
import * as THREE from 'three';
import { hash2 } from '../noise.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
export const ON = Q.get('livery') !== '0';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
export const LIVERY = {
  on: ON,
  // the stole: ember, faded where the sun has had it, near-brown where it has been in the dirt
  // stoleEmit: a little of its own colour given back (a tenth), so the stroke of ember still reads in the wood's shade
  // and at 30 m in the low sun; it does not glow
  stoleEmit: 0.12,
  stole: '#c8501e', stoleFade: '#b4583a', stoleDirt: '#6a2c14', stoleDeep: '#9a3816',
  // the formal sign's brass, and the collar's rim
  brass: '#b08a3e', brassD: '#5e4622',
  // the officers' coats: a readable dark blue-grey (v7: #14110f..#17141a)
  coat: '#2a303b', coatHi: '#3a4250', coatD: '#1c2029',
  // the Late folk's cloths
  late: { pom: '#a3262c', saffron: '#c99030', turq: '#24857c', undyed: '#b9aa8c', rose: '#b86a5c' },
};
export const lv = (v7, v8) => (ON ? v8 : v7); // a v7 value under ?livery=0, else the livery's

const S0 = C(LIVERY.stole), SF = C(LIVERY.stoleFade), SD = C(LIVERY.stoleDirt), SK = C(LIVERY.stoleDeep);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rec = (P, key, v0) => {
  const L = P.livery || (P.livery = { people: null, stole: [], badge: [], sign: [], cloths: new Set() });
  if (key) L[key].push([v0, P.n]);
  return L;
};
const col = (P, rgb, rough = 0.9, metal = 0, emit = 0) => { P.col = [rgb[0], rgb[1], rgb[2]]; P.mre = [metal, rough, emit]; };

// The stole's colour at t along it (0..1) and k across it (0..1): faded in long patches, the folds deeper, dirtier
// toward `dirt` (0..1, how much of the end is in the dirt), with an optional tint (moss, crystal) mixed in by `tint(t,k)`.
export function stoleTone(t, k, { seed = 0, dirt = 0.25, tint = null } = {}) {
  const f = hash2(Math.floor(t * 7 + seed * 13), Math.floor(k * 2 + seed * 5));
  let c = mix(S0, SF, 0.1 + 0.45 * f);
  if (Math.abs(k - 0.5) > 0.42) c = mix(c, SK, 0.5);            // the edges, rolled and darker
  if (dirt > 0) c = mix(c, SD, Math.min(1, Math.max(0, (t - (1 - dirt)) / Math.max(1e-3, dirt))) * 0.75);
  if (tint) { const [tc, w] = tint(t, k); if (w > 0) c = mix(c, tc, Math.min(1, w)); }
  return c;
}

// A stole: a flat band of cloth `w` wide and `th` thick laid along pts (figure-local [x, y, z], at least two), its face
// turned toward out(t, p) (a function of t and the point, or a fixed [x, y, z]: the side away from the body). Optional: w as a function of t;
// fray (the strands' length at the far end, 0 for none); tone (t, k) -> rgb, else stoleTone(o); each(t) before each ring
// (set a part or a hem weight); weight(p), the Mesher's own per-vertex weight (aW: the Sleeper's breath). Front, back and both edges, eight vertices a ring. Returns [v0, v1].
const _t = new THREE.Vector3(), _n = new THREE.Vector3(), _s = new THREE.Vector3(), _o = new THREE.Vector3();
export function stole(P, pts, o = {}) {
  const v0 = P.n, n = pts.length, th = o.th ?? 0.012, fray = o.fray ?? 0.05, rough = o.rough ?? 0.93, E = o.emit ?? LIVERY.stoleEmit;
  const W = typeof o.w === 'function' ? o.w : () => o.w ?? 0.14;
  const out = typeof o.out === 'function' ? o.out : () => o.out || [0, 0, 1];
  const tone = o.tone || ((t, k) => stoleTone(t, k, o));
  const rings = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    _t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    _o.fromArray(out(t, pts[i]));
    _s.crossVectors(_t, _o).normalize();
    _n.crossVectors(_s, _t).normalize();
    const w = W(t) / 2, p = pts[i];
    o.each?.(t);
    const corner = (sx, sz) => [p[0] + _s.x * w * sx + _n.x * th * sz, p[1] + _s.y * w * sx + _n.y * th * sz, p[2] + _s.z * w * sx + _n.z * th * sz];
    const FL = corner(-1, 0.5), FR = corner(1, 0.5), BL = corner(-1, -0.5), BR = corner(1, -0.5), wt = o.weight ? o.weight(p) : 0;
    const r = {};
    col(P, tone(t, 0.04), rough, 0, E); r.fl = P.v(...FL, wt); r.bl = P.v(...BL, wt); r.el0 = P.v(...FL, wt); r.el1 = P.v(...BL, wt);
    col(P, tone(t, 0.96), rough, 0, E); r.fr = P.v(...FR, wt); r.br = P.v(...BR, wt); r.er0 = P.v(...FR, wt); r.er1 = P.v(...BR, wt);
    // the middle of the face: a third vertex across, so the fade reads as a stripe and not a smear
    col(P, tone(t, 0.5), rough, 0, E);
    const mid = [p[0] + _n.x * th * 0.5, p[1] + _n.y * th * 0.5, p[2] + _n.z * th * 0.5], midB = [p[0] - _n.x * th * 0.5, p[1] - _n.y * th * 0.5, p[2] - _n.z * th * 0.5];
    r.fm = P.v(...mid, wt); r.bm = P.v(...midB, wt);
    r.p = p; r.s = _s.clone(); r.nn = _n.clone(); r.w = w;
    rings.push(r);
  }
  for (let i = 0; i < n - 1; i++) {
    const A = rings[i], B = rings[i + 1];
    P.quad(A.fl, A.fm, B.fm, B.fl); P.quad(A.fm, A.fr, B.fr, B.fm);   // the face, toward out
    P.quad(A.bm, A.bl, B.bl, B.bm); P.quad(A.br, A.bm, B.bm, B.br);   // the back
    P.quad(A.el1, A.el0, B.el0, B.el1); P.quad(A.er0, A.er1, B.er1, B.er0); // the edges
  }
  // the frayed end: a few strands of thread off the last ring, a little ragged
  if (fray > 0) {
    const E = rings[n - 1], dn = [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1], pts[n - 1][2] - pts[n - 2][2]];
    const dl = Math.hypot(dn[0], dn[1], dn[2]) || 1;
    const k = 5;
    for (let j = 0; j < k; j++) {
      const u = (j + 0.5) / k * 2 - 1, L = fray * (0.5 + 0.8 * hash2(j * 7 + 3, n));
      const a = [E.p[0] + E.s.x * E.w * u, E.p[1] + E.s.y * E.w * u, E.p[2] + E.s.z * E.w * u];
      const b = [a[0] + dn[0] / dl * L, a[1] + dn[1] / dl * L, a[2] + dn[2] / dl * L];
      o.each?.(1);
      col(P, mix(tone(1, (j + 0.5) / k), SD, 0.3), rough);
      P.loft([a, b], [Math.min(0.008, E.w * 0.25), 0.003], 3, o.weight ? o.weight(E.p) : 0, false);
    }
  }
  rec(P, 'stole', v0);
  return [v0, P.n];
}

// The formal sign, as a brass badge (or a staff head, or a buckle): a plate `s` wide at the notch's shoulders, the V cut
// to the bible's proportions (half-angle 35 degrees: depth S = s / 1.4), and the disc in it (diameter 0.6 of the notch's
// width at the disc's centre, its lower third below the shoulders; parts.js SIGN: centre 0.163 S over the shoulders,
// radius 0.488 S). c: the centre of the plate's top edge; up and out: unit vectors (the plate faces out). th: thickness.
// o.disc: the disc's colour (brass, or ember glass with o.glow), o.plate the plate's.
export function badge(P, c, up, out, s, o = {}) {
  const v0 = P.n;
  const U = new THREE.Vector3(...up).normalize(), O = new THREE.Vector3(...out).normalize(), R = new THREE.Vector3().crossVectors(U, O).normalize();
  O.crossVectors(R, U).normalize();
  const th = o.th ?? Math.max(0.004, s * 0.12), S = s / 1.4, h = o.h ?? S * 1.25;
  const wt = o.weight || 0;
  const at = (x, y, z) => [c[0] + R.x * x + U.x * y + O.x * z, c[1] + R.y * x + U.y * y + O.y * z, c[2] + R.z * x + U.z * y + O.z * z, wt];
  // the plate's outline (x, y), from the shoulders' line at y 0: a notched head over a short square foot
  const half = s / 2, outline = [[-half, -h], [half, -h], [half, 0], [0, -S], [-half, 0]];
  const plate = C(o.plate || LIVERY.brassD), disc = C(o.disc || LIVERY.brass);
  const slab = (pts, z0, z1, rgb, metal, rough, emit = 0) => {
    col(P, rgb, rough, metal, emit);
    const mb = [0, (pts[0][1] - S) / 2]; // a point every edge is seen from: under the notch's apex, over the foot
    const front = pts.map((p) => P.v(...at(p[0], p[1], z1))), back = pts.map((p) => P.v(...at(p[0], p[1], z0)));
    const cf = P.v(...at(mb[0], mb[1], z1)), cb = P.v(...at(mb[0], mb[1], z0));
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      P.tri(cf, front[i], front[j]); P.tri(cb, back[j], back[i]);
      const e0 = P.v(...at(pts[i][0], pts[i][1], z1)), e1 = P.v(...at(pts[j][0], pts[j][1], z1)), e2 = P.v(...at(pts[j][0], pts[j][1], z0)), e3 = P.v(...at(pts[i][0], pts[i][1], z0));
      P.quad(e0, e3, e2, e1);
    }
  };
  slab(outline, -th / 2, th / 2, plate, 0.7, 0.5);
  // the disc, a little proud of the plate, sitting in the V
  const r = 0.488 * S, cy = 0.163 * S, N = o.sides ?? 12, ring = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; ring.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
  const mid = [0, cy];
  col(P, disc, o.glow ? 0.5 : 0.35, o.glow ? 0 : 0.85, o.glow || 0);
  const z0 = -th * 0.7, z1 = th * 0.9;
  const fc = P.v(...at(mid[0], mid[1], z1)), bc = P.v(...at(mid[0], mid[1], z0));
  const F = ring.map((p) => P.v(...at(p[0], p[1], z1))), B = ring.map((p) => P.v(...at(p[0], p[1], z0)));
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; P.tri(fc, F[i], F[j]); P.tri(bc, B[j], B[i]); P.quad(F[j], F[i], B[i], B[j]); }
  rec(P, 'badge', v0);
  return [v0, P.n];
}

// The staff head the Taker and the Sexton share (one maker's, one pattern): the sign on a knop, ember glass in the
// disc, at the top of a staff or a spade's handle. (x, y, z): the staff's top; the head faces +z; s its width.
export function staffHead(P, x, y, z, s = 0.12) {
  col(P, C(LIVERY.brassD), 0.5, 0.7);
  P.blob(x, y + s * 0.08, z, s * 0.16, s * 0.16, s * 0.16, 6, 4);
  return badge(P, [x, y + s * 0.15 + (s / 1.4) * 1.25, z], [0, 1, 0], [0, 0, 1], s, { th: s * 0.2, disc: '#c8501e', glow: 0.45 });
}

// The officers' one shared cut: a tall stiff collar standing round the neck, flaring a little, a brass rim at its top.
// Centred on (cx, cy, cz) at its foot, radius r, height h; open a little at the front (gap, radians).
export function collar(P, cx, cy, cz, r, h, coat = LIVERY.coat, o = {}) {
  const N = o.sides ?? 14, gap = o.gap ?? 0.5, rx = o.rx ?? 1, rz = o.rz ?? 0.92, F = o.front ?? Math.PI / 2; // the gap faces F (from +x toward +z)
  col(P, C(coat), 0.9);
  P.sheet(N, 2, (u, v, out) => {
    const a = F + gap / 2 + u * (Math.PI * 2 - gap), rr = r * (1 + 0.22 * v);
    out[0] = cx + Math.cos(a) * rr * rx; out[1] = cy + v * h; out[2] = cz + Math.sin(a) * rr * rz;
  });
  // the sheet is one-sided: an inner face, wound the other way
  P.sheet(N, 1, (u, v, out) => {
    const a = F + gap / 2 + (1 - u) * (Math.PI * 2 - gap), rr = r * (1 + 0.22 * v) * 0.96;
    out[0] = cx + Math.cos(a) * rr * rx; out[1] = cy + v * h; out[2] = cz + Math.sin(a) * rr * rz;
  });
  col(P, C(o.rim || LIVERY.brass), 0.5, 0.7);
  const pts = [];
  for (let i = 0; i <= N; i++) { const a = F + gap / 2 + (i / N) * (Math.PI * 2 - gap); pts.push([cx + Math.cos(a) * r * 1.22 * rx, cy + h, cz + Math.sin(a) * r * 1.22 * rz]); }
  P.loft(pts, pts.map(() => o.rimR ?? 0.006), 3, 0, false);
}

// The Late folk's patched cloth: the colour at (u, v) of a garment (both 0..1) from `cloths` (rgb arrays), in cells of
// nu x nv, the same garment the same every visit (seed). Mark the cloths on P for the test.
export function patch(P, cloths, u, v, { nu = 4, nv = 3, seed = 0 } = {}) {
  const L = rec(P, null, 0);
  for (const c of cloths) L.cloths.add(c.hex || c.join(','));
  const k = Math.floor(hash2(Math.floor(u * nu) + seed * 31, Math.floor(v * nv) + seed * 17) * cloths.length);
  return cloths[Math.min(cloths.length - 1, k)];
}
// Put P's record on the geometry, for the livery test.
export function tag(geo, P, people) {
  if (P.livery) geo.userData.livery = { people, stole: P.livery.stole, badge: P.livery.badge, sign: P.livery.sign, cloths: [...P.livery.cloths] };
  return geo;
}
export const lateCloth = (name) => C(LIVERY.late[name]);

// The sign sewn on wrong, Late folk fashion: the notch gone round into a crescent (horns up), the disc a pomegranate
// sitting off true in its horns. c: its centre; up, out: unit vectors; s: the crescent's width. Small.
export function wrongSign(P, c, up, out, s, o = {}) {
  const v0 = P.n;
  const U = new THREE.Vector3(...up).normalize(), O = new THREE.Vector3(...out).normalize(), R = new THREE.Vector3().crossVectors(U, O).normalize();
  const at = (x, y, z) => [c[0] + R.x * x + U.x * y + O.x * z, c[1] + R.y * x + U.y * y + O.y * z, c[2] + R.z * x + U.z * y + O.z * z];
  const Rr = s / 2, k = 0.62, N = 10, lift = o.lift ?? 0.004, tilt = o.tilt ?? 0.18;
  col(P, C(o.crescent || LIVERY.late.saffron), 0.8);
  // a crescent as a band: the outer arc's lower half and the inner arc raised, joined at the horns
  const A = [], B = [];
  for (let i = 0; i <= N; i++) {
    const a = Math.PI + tilt + (i / N) * Math.PI;
    A.push(at(Math.cos(a) * Rr, Math.sin(a) * Rr, lift));
    const f = Math.sin((i / N) * Math.PI);
    B.push(at(Math.cos(a) * Rr * (1 - (1 - k) * f), Math.sin(a) * Rr * (1 - (1 - k) * f) + Rr * 0.32 * f, lift));
  }
  const ia = A.map((p) => P.v(...p)), ib = B.map((p) => P.v(...p));
  for (let i = 0; i < N; i++) P.quad(ia[i], ia[i + 1], ib[i + 1], ib[i]);
  // the pomegranate: a red bead with a crown, a little to one side
  col(P, C(o.pom || LIVERY.late.pom), 0.7);
  const pc = at(Rr * 0.12, Rr * 0.2, lift + Rr * 0.12);
  P.blob(pc[0], pc[1], pc[2], Rr * 0.3, Rr * 0.3, Rr * 0.3, 6, 4);
  rec(P, 'sign', v0);
  return [v0, P.n];
}
