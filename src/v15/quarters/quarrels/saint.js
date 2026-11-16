// The Quarrels' saint (v15-Q1): the colossus that stood on Carcanet Keep's north-east corner and came down with it,
// put to work by the masons. His head stopped on the brink of the crown: they hollowed it and it is their lime kiln
// (the Smoking Saint): fed through a hole broken in the crown of his skull, fired through a stoke hole of robbed
// ashlar let in at the nape, where his neck broke, smoke out of the broken crown of his skull. What they
// burn in him for lime is the rest of the Heliarchs' statuary (the valley's broken hands and crowned heads:
// src/structures/scatter.js): three lesser heads wait in a row on the brink. One of his hands lies palm up under the
// broken end of the aqueduct and takes its drip (the Almoner): a kerb of clay on the palm makes it the masons' trough.
//
// Each maker is (B, M, o) into a structures Builder, M at the ground with +z the way the thing faces, and returns
// what the quarter's module needs (points in world space, colliders in the engine's own shapes).
import * as THREE from 'three';
import { H, V, L, ch, worn, beam, addPainted, quad } from '../../houses/kit.js';
import { mat } from '../../../structures/geo.js';

const gs = (a, b, sa, sb) => Math.exp(-(a * a) / (sa * sa) - (b * b) / (sb * sb));
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const W = (M, x, y, z) => { _v.set(x, y, z).applyMatrix4(M); return [_v.x, _v.y, _v.z]; };

// The Heliarchs' crowned head, as the scatter cuts it: a unit sphere drawn into a long face looking along +z (brow,
// sockets, nose, lips, chin), about 1.6 wide, 2.24 high and 1.9 deep. ws, hs: the sphere's segments.
function headGeo(N2, ws, hs, deep = 1) {
  const g = new THREE.SphereGeometry(1, ws, hs), pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const jaw = y < -0.2 ? 1 - 0.25 * Math.min(1, (-0.2 - y) / 0.8) : 1;
    x *= 0.8 * jaw; y *= 1.12; z *= 0.9;
    if (z > 0) {
      z += (0.26 + 0.07 * (deep - 1) * 4) * gs(x, y + 0.12, 0.1, 0.25) * z + (0.08 + 0.03 * (deep - 1) * 4) * gs(0, y - 0.22, 1, 0.07) - 0.13 * deep * gs(Math.abs(x) - 0.28, y - 0.08, 0.13, 0.09);
      z += 0.05 * gs(x, y + 0.53, 0.2, 0.05) - 0.05 * gs(x, y + 0.585, 0.24, 0.025) + 0.06 * gs(x, y + 0.86, 0.17, 0.09);
    }
    const w = N2(x * 3 + 1, y * 3 + z * 2) * 0.03;
    pos.setXYZ(i, x * (1 + w), y * (1 + w), z * (1 + w));
  }
  return g;
}
// a solid ring about the y axis (a circlet, a kerb): inner and outer radius, y0 to y1
const ring = (B, ri, ro, y0, y1, n) => B.lathe([[ri, y0], [ro, y0], [ro * 0.985, y1], [ri, y1], [ri, y0]], n);

// ---------------------------------------------------------------- the colossus's head, sculpted
// One continuous surface: a face defined as smooth fields (signed distances: the skull, the face and jaw, cheekbones,
// the brow, eye hollows with the lids shut, the nose and its wings, the philtrum, the lips closed, the chin, the ears,
// the neck), the fillet round his brow with its one roundel and empty socket, the hair in carved locks above it and
// down the back; then weathered (pitted, a crack down his left cheek, the nose's tip and his left lobe broken off, the
// neck broken across where it was built of drums) and the crown broken open where the kiln is charged. A grid of rays
// from inside the skull (dense across the face, sparse at the crown and the neck) finds that surface; each triangle
// keeps its own normal, so it is faceted as the walk is. Head units: about 2 from chin to crown, +z the way he looks,
// +x his left.
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
function ell(px, py, pz, cx, cy, cz, rx, ry, rz) { // an ellipsoid's distance (iq's bound)
  const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz, k0 = Math.sqrt(x * x + y * y + z * z), k1 = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
  return (k0 * (k0 - 1)) / (k1 || 1e-6);
}
function cone(px, py, pz, ax, ay, az, bx, by, bz, ra, rb) { // a rod from a (radius ra) to b (radius rb)
  const ux = bx - ax, uy = by - ay, uz = bz - az, l2 = ux * ux + uy * uy + uz * uz;
  const t = Math.max(0, Math.min(1, ((px - ax) * ux + (py - ay) * uy + (pz - az) * uz) / l2));
  return Math.hypot(px - ax - ux * t, py - ay - uy * t, pz - az - uz * t) - (ra + (rb - ra) * t);
}
const CRACK = [[0.33, 0.0], [0.4, -0.18], [0.35, -0.4], [0.43, -0.62], [0.4, -0.8]]; // down his left cheek, the one uppermost (x, y)
const crackD = (x, y) => { let m = 9; for (let k = 0; k < CRACK.length - 1; k++) { const [ax, ay] = CRACK[k], [bx, by] = CRACK[k + 1], vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy))); m = Math.min(m, Math.hypot(x - ax - vx * t, y - ay - vy * t)); } return m; };
const BAND = (y, z) => ((y - 0.6) - 0.17 * (z - 0.62)) / 1.014; // the fillet's plane: high over the brow, low over the nape
const breakY = (z) => -1.16 + 0.14 * (z + 0.2); // where the neck broke (a plane, raked)

// the head unweathered: the sculptor's surface
function carved(x, y, z) {
  const ax = Math.abs(x);
  let d = ell(x, y, z, 0, 0.16, -0.16, 0.7, 0.8, 0.86); // the skull
  d = smin(d, ell(x, y, z, 0, -0.34, 0.16, 0.57, 0.62, 0.52), 0.22); // the face and the jaw
  d = smin(d, ell(ax, y, z, 0.45, -0.5, -0.03, 0.15, 0.25, 0.25), 0.14); // the jaw's angle
  d = smin(d, ell(x, y, z, 0, -0.76, 0.43, 0.21, 0.17, 0.17), 0.12); // the chin
  d = smin(d, ell(ax, y, z, 0.37, -0.05, 0.42, 0.2, 0.13, 0.2), 0.1); // the cheekbone
  d = smin(d, ell(x, y, z, 0, 0.21, 0.55, 0.48, 0.085, 0.15), 0.09); // the brow
  d = smax(d, -ell(ax, y, z, 0.25, 0.07, 0.7, 0.17, 0.11, 0.17), 0.05); // the eye's hollow
  d = smin(d, ell(ax, y, z, 0.25, 0.055, 0.52, 0.145, 0.085, 0.125), 0.035); // the eye, shut under its lids
  d = smax(d, -ell(ax, y, z, 0.25, 0.03 + 0.25 * (ax - 0.25) ** 2, 0.655, 0.13, 0.011, 0.04), 0.012); // where the lids meet
  d = smax(d, -ell(ax, y, z, 0.25, 0.125, 0.62, 0.14, 0.014, 0.05), 0.015); // the upper lid's fold
  d = smin(d, cone(x * 1.3, y, z, 0, 0.15, 0.63, 0, -0.27, 0.84, 0.045, 0.085), 0.06); // the nose
  d = smin(d, ell(ax, y, z, 0.085, -0.28, 0.72, 0.07, 0.06, 0.07), 0.035); // its wings
  d = smax(d, -ell(ax, y, z, 0.05, -0.335, 0.765, 0.03, 0.018, 0.035), 0.012); // the nostrils
  d = smax(d, -ell(x, y, z, 0, -0.4, 0.69, 0.035, 0.05, 0.03), 0.02); // the philtrum
  d = smin(d, ell(x, y, z, 0, -0.465, 0.61, 0.17, 0.05, 0.09), 0.03); // the upper lip
  d = smin(d, ell(x, y, z, 0, -0.575, 0.6, 0.145, 0.055, 0.09), 0.03); // the lower
  d = smax(d, -ell(x, y, z, 0, -0.52, 0.67, 0.18, 0.018, 0.08), 0.01); // the lips closed
  d = smax(d, -ell(ax, y, z, 0.18, -0.52, 0.6, 0.04, 0.04, 0.05), 0.02); // the mouth's corners
  d = smax(d, -ell(x, y, z, 0, -0.665, 0.62, 0.12, 0.025, 0.05), 0.03); // under the lip
  d = smin(d, ell(ax, y, z, 0.7, -0.12, -0.1, 0.1, 0.36, 0.16), 0.05); // the ear, its lobe long
  d = smax(d, -ell(ax, y, z, 0.8, -0.04, -0.07, 0.05, 0.22, 0.095), 0.02); // its bowl
  d = smin(d, ell(x, y, z, 0, -0.95, -0.22, 0.5, 0.62, 0.48), 0.16); // the neck
  // the fillet, raised round his brow; the hair above it and down the back, in carved locks combed back
  const s = BAND(y, z), band = sstep(0.09, 0.05, Math.abs(s));
  const back = sstep(-0.05, -0.35, z) * sstep(-0.62, -0.45, y), hair = Math.max(sstep(0.05, 0.08, s), back) * (1 - band);
  const lock = Math.sqrt(0.5 + 0.5 * Math.cos(x * 34 + 0.7 * Math.sin(z * 6 + y * 3))); // (combed back from the brow in waves: no two meet)
  d -= 0.08 * band + hair * (0.014 + 0.03 * lock);
  // the roundel on the fillet over his brow: a boss, and the socket its stone was prised out of
  d = smin(d, ell(x, y, z, 0, 0.6, 0.56, 0.13, 0.12, 0.07), 0.02);
  d = smax(d, -ell(x, y, z, 0, 0.6, 0.64, 0.07, 0.065, 0.05), 0.015);
  return d;
}
// the head as it is: weathered, broken, and (vent: the charging hole's middle and its way out, or null) opened
function stone(n3, x, y, z, vent) {
  let d = carved(x, y, z);
  d += 0.009 * n3(x * 6, y * 6, z * 6) + 0.022 * Math.max(0, n3(x * 2.3 + 4, y * 2.3, z * 2.3) - 0.3); // pitted, and worn back in patches
  if (z > 0.3) d += 0.03 * Math.exp(-((crackD(x, y) / 0.022) ** 2)) * sstep(0.3, 0.45, z); // the crack down his cheek
  if (y > -0.38 && Math.abs(x) < 0.2) d = smax(d, ((z - 0.79) - 0.3 * (y + 0.2)) / 1.044 + 0.012 * n3(x * 14, y * 14, 3), 0.01); // the nose's end, broken
  d = smax(d, -(Math.hypot(x - 0.72, y + 0.48, z + 0.1) - 0.13), 0.02); // his left lobe, broken off
  d = smax(d, -(Math.hypot(x - 0.12, y + 0.9, z - 0.6) - 0.07), 0.02); // a chip off his chin
  d = smax(d, breakY(z) - y + 0.03 * n3(x * 5, z * 5, 7), 0.01); // the neck, broken across
  if (vent) d = smax(d, -(Math.hypot(x - vent[0], y - vent[1], z - vent[2]) - 0.3 - 0.07 * n3(x * 6, y * 6, z * 6) - 0.03 * n3(x * 15, y * 15, z * 15)), 0.01); // the crown broken open
  return d;
}
// the surface: nu rays round, nv down; up: the world's up in head units (the charging hole is broken through his
// highest point). Returns { g (non-indexed: one normal a facet), shade, glow, soot, lime (a vertex each), vent }.
export function sculpt(N2, nu, nv, up) { // (exported for the turntable preview)
  const n3 = (x, y, z) => 0.5 * (N2(x + 0.37 * z, y - 0.53 * z) + N2(z + 0.61 * y + 17.3, x - 0.29 * y - 5.1));
  const O = [0, -0.08, -0.08];
  const cast = (dx, dy, dz, vent) => { // the first surface along a ray from O
    const f = (r) => stone(n3, O[0] + dx * r, O[1] + dy * r, O[2] + dz * r, vent);
    let r0 = 0.1, r1 = 0.1, d = f(r1);
    while (d < 0 && r1 < 2.4) { r0 = r1; r1 += Math.max(0.006, -d * 0.8); d = f(r1); }
    for (let k = 0; k < 12; k++) { const m = (r0 + r1) / 2; if (f(m) < 0) r0 = m; else r1 = m; }
    return (r0 + r1) / 2;
  };
  const ul = Math.hypot(...up), u = up.map((c) => c / ul), rv = cast(...u, null) - 0.16;
  const vent = [O[0] + u[0] * rv, O[1] + u[1] * rv, O[2] + u[2] * rv];
  const nV = nu * (nv + 1), P = new Float32Array(nV * 3), NR = new Float32Array(nV * 3), shade = new Float32Array(nV), glow = new Float32Array(nV), soot = new Float32Array(nV), lime = new Float32Array(nV);
  const f = (x, y, z) => stone(n3, x, y, z, vent), e = 0.006;
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, th = Math.PI * (v + (0.62 * Math.sin(2 * Math.PI * v)) / (2 * Math.PI)); // (dense across the face)
    for (let i = 0; i < nu; i++) {
      const t = -1 + (2 * i) / nu, ph = Math.PI * (0.22 * t + 0.78 * t * t * t); // (dense to the front)
      const dx = Math.sin(th) * Math.sin(ph), dy = Math.cos(th), dz = Math.sin(th) * Math.cos(ph), r = cast(dx, dy, dz, vent);
      const x = O[0] + dx * r, y = O[1] + dy * r, z = O[2] + dz * r, k = j * nu + i;
      P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
      // the light that gets into a hollow: the field a little way out along the normal
      let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl; NR[k * 3] = gx; NR[k * 3 + 1] = gy; NR[k * 3 + 2] = gz;
      let occ = 0; for (const [h, w] of [[0.03, 1], [0.07, 0.6], [0.15, 0.35]]) occ += w * Math.max(0, h - f(x + gx * h, y + gy * h, z + gz * h)) / h;
      const cr = z > 0.3 ? Math.exp(-((crackD(x, y) / 0.02) ** 2)) * sstep(0.3, 0.45, z) : 0;
      const dv = Math.hypot(x - vent[0], y - vent[1], z - vent[2]), inVent = sstep(0.36, 0.26, dv) * sstep(0.0, -0.08, (x - vent[0]) * u[0] + (y - vent[1]) * u[1] + (z - vent[2]) * u[2]);
      const yb = breakY(z), onBreak = sstep(yb + 0.06, yb + 0.02, y), drum = y < -0.82 && z < 0.2 ? Math.exp(-((((((y - yb) / 0.21) % 1) - 0.5) / 0.07) ** 2)) * (1 - onBreak) : 0; // the neck's drums
      shade[k] = Math.max(0.3, Math.min(1.15, 1.08 - 0.42 * occ - 0.5 * cr - 0.35 * drum));
      glow[k] = inVent * sstep(0.0, 0.2, (vent[0] - x) * u[0] + (vent[1] - y) * u[1] + (vent[2] - z) * u[2]);
      const below = (x - vent[0]) * u[0] + (y - vent[1]) * u[1] + (z - vent[2]) * u[2]; // (how far below the hole, along the world's up)
      soot[k] = Math.min(1, Math.max(inVent, 0.9 * Math.exp(-((dv / 0.55) ** 2)) * sstep(-0.6, -0.1, below), 0.8 * onBreak, 0.3 * cr));
      lime[k] = (1 - inVent) * sstep(0.85, 0.45, dv) * sstep(0.25, 0.4, dv) * (0.55 + 0.45 * n3(x * 8, y * 8, z * 8));
    }
  }
  // two triangles a quad (one at a pole), each with its own corners
  const tri = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * nu + i, b = j * nu + ((i + 1) % nu), c = b + nu, d = a + nu;
    if (j > 0) tri.push(a, c, b);
    if (j < nv - 1) tri.push(a, d, c);
  }
  const pos = new Float32Array(tri.length * 3), nrm = new Float32Array(tri.length * 3), S = { shade: new Float32Array(tri.length), glow: new Float32Array(tri.length), soot: new Float32Array(tri.length), lime: new Float32Array(tri.length) };
  tri.forEach((k, m) => { for (let c = 0; c < 3; c++) nrm[m * 3 + c] = NR[k * 3 + c]; pos[m * 3] = P[k * 3]; pos[m * 3 + 1] = P[k * 3 + 1]; pos[m * 3 + 2] = P[k * 3 + 2]; S.shade[m] = shade[k]; S.glow[m] = glow[k]; S.soot[m] = soot[k]; S.lime[m] = lime[k]; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return { g, nrm, ...S, vent, up: u };
}

// The Smoking Saint's head and nothing else, posed and sunk. M: the ground under the head's middle, +z the way he
// looks. o: { S (head units to metres: 1.7 is 3.9 m from the neck's break to the crown), roll (over onto his right
// cheek, positive), pitch (forward, face down), sink (m his lowest point is under the ground), N2, low, stoke: [x, z]
// (in M: the fire's side, for the soot) }. Returns { HM, mouth (the charging hole, where the smoke leaves), pts (the
// posed surface in M's frame: x, y, z each), tris }.
export function saintHead(B, M, o) {
  const S = o.S ?? 1.7, low = !!o.low, g0 = M.elements[13], rng = o.rng;
  const roll = o.roll ?? 0.7, pitch = o.pitch ?? 0.2, sink = o.sink ?? 0.45;
  const R = mat(0, 0, 0, pitch, 0, roll), Ri = R.clone().invert(), up = new THREE.Vector3(0, 1, 0).applyMatrix4(Ri);
  const C = sculpt(o.N2, low ? 60 : 120, low ? 44 : 88, [up.x, up.y, up.z]);
  const lp = C.g.attributes.position.array, n = lp.length / 3;
  let minY = 1e9; for (let i = 0; i < n; i++) { _v.set(lp[i * 3], lp[i * 3 + 1], lp[i * 3 + 2]).applyMatrix4(R); if (_v.y < minY) minY = _v.y; }
  const HM = ch(M, 0, -sink - S * minY, 0, pitch, 0, roll, S, S, S), HMl = mat(0, -sink - S * minY, 0, pitch, 0, roll, S, S, S);
  const pts = new Float32Array(n * 3); for (let i = 0; i < n; i++) { _v.set(lp[i * 3], lp[i * 3 + 1], lp[i * 3 + 2]).applyMatrix4(HMl); pts[i * 3] = _v.x; pts[i * 3 + 1] = _v.y; pts[i * 3 + 2] = _v.z; }
  const stone = worn(H.stone, rng, 0.06, 0.04).multiplyScalar(1.1), sootC = V.soot.clone().lerp(stone, 0.12), limeC = V.newDust.clone().lerp(stone, 0.35), fireC = new THREE.Color('#3a1206');
  const st = o.stoke || [0, -1], sl = Math.hypot(st[0], st[1]) || 1;
  let vi = 0; const base = B.count;
  addPainted(B, C.g, HM, { color: stone, moss: 0.35, ground: g0, course: 0 }, (x, y, z, out) => {
    const k = vi++, px = pts[k * 3], py = pts[k * 3 + 1], pz = pts[k * 3 + 2];
    const fireSide = sstep(0.3, 0.9, (px * st[0] + pz * st[1]) / sl / (Math.hypot(px, pz) || 1)) * sstep(1.6, 0.2, py); // the stoke hole's side, low: smoked
    const soot = Math.min(0.95, Math.max(C.soot[k], 0.7 * fireSide)), lime = C.lime[k], sh = C.shade[k], gl = C.glow[k];
    let r = stone.r + (sootC.r - stone.r) * soot, g = stone.g + (sootC.g - stone.g) * soot, b = stone.b + (sootC.b - stone.b) * soot;
    r += (limeC.r - r) * lime; g += (limeC.g - g) * lime; b += (limeC.b - b) * lime;
    r += (fireC.r - r) * gl; g += (fireC.g - g) * gl; b += (fireC.b - b) * gl;
    out.r = r * sh; out.g = g * sh; out.b = b * sh; out.e = gl * 0.5;
  }, V.ember);
  // the carved surface's own normal, a little of each facet's kept (faceted lightly, as the walk is)
  const NM = new THREE.Matrix3().getNormalMatrix(HM), Nn = B.Nn, facet = 0.22;
  for (let i = 0; i < n; i++) {
    _v.set(C.nrm[i * 3], C.nrm[i * 3 + 1], C.nrm[i * 3 + 2]).applyMatrix3(NM).normalize();
    const k = (base + i) * 3; _v2.set(Nn[k], Nn[k + 1], Nn[k + 2]).multiplyScalar(facet).addScaledVector(_v, 1 - facet).normalize();
    Nn[k] = _v2.x; Nn[k + 1] = _v2.y; Nn[k + 2] = _v2.z;
  }
  _v.set(...C.vent).addScaledVector(_v2.set(...C.up), 0.1).applyMatrix4(HM);
  return { HM, mouth: [_v.x, _v.y, _v.z], pts, tris: n / 3 };
}

// The Smoking Saint: the head (saintHead), his stoke hole and its fire, the fuel. M: the ground under the head's
// middle, +z the way he looks. o: saintHead's, and stoke: [lx, lz] (the stoke hole's side, in M's frame), rng.
// He lies where he fell: over on his right cheek and forward, sunk to the jaw, the stoke hole let in behind.
// Returns { mouth (the broken crown, where the smoke leaves), fire (the stoke hole's mouth), stand (where the burner
// stands to feed it), colliders, r, tris (the head's) }.
export function saint(B, M, o) {
  const S = o.S ?? 1.7, low = !!o.low, rng = o.rng, g0 = M.elements[13];
  const sl = Math.hypot(o.stoke[0], o.stoke[1]) || 1, sx = o.stoke[0] / sl, sz = o.stoke[1] / sl;
  const head = saintHead(B, M, { ...o, stoke: [sx, sz] }), pts = head.pts, n = pts.length / 3;
  const sootC = V.soot.clone().lerp(H.stone, 0.15);
  // where he meets the ground: his outline above it, in M's frame (the collider; how far in the stoke hole is let)
  let x0 = 1e9, x1 = -1e9, z0h = 1e9, z1h = -1e9, reach = 0;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2]; if (y < 0) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0h) z0h = z; if (z > z1h) z1h = z;
    if (y < 1.3) reach = Math.max(reach, x * sx + z * sz);
  }

  // the stoke hole, let into his nape where the neck broke in robbed ashlar: two jambs, a lintel, a relieving block, the fire
  const PM = ch(M, 0, 0, 0, 0, Math.atan2(sx, sz), 0), z0 = reach - 0.55, z1 = z0 + 1.28, zm = (z0 + z1) / 2; // (+z out of the hole)
  const ash = (k) => worn(H.stone, rng, 0.1, 0.1).lerp(sootC, k);
  for (const s of [-1, 1]) B.add(B.box(0.36, 1.2, z1 - z0, { seg: 9, chip: 0.035, seed: s + 3 }), ch(PM, s * 0.51, 0.47, zm, 0, 0, s * 0.02), { color: ash(0.35), moss: 0.1, ground: g0, course: 0 });
  B.add(B.box(1.56, 0.34, z1 - z0 + 0.1, { seg: 9, chip: 0.04, seed: 9 }), ch(PM, 0.02, 1.22, zm - 0.02, 0, 0.02, 0), { color: ash(0.6), moss: 0.05, ground: g0, course: 0 });
  B.add(B.box(1.05, 0.34, 0.8, { seg: 9, chip: 0.05, seed: 11 }), ch(PM, -0.05, 1.54, zm - 0.3, 0, -0.04, 0), { color: ash(0.7), moss: 0.05, ground: g0, course: 0 });
  quad(B, PM, [-0.33, 0.03, z0 + 0.5], [0.33, 0.03, z0 + 0.5], [0.33, 1.06, z0 + 0.5], [-0.33, 1.06, z0 + 0.5], { color: new THREE.Color('#3a1206'), moss: 0, ground: g0 - 9, emit: [V.ember[0] * 0.42, V.ember[1] * 0.42, V.ember[2] * 0.42, 1] });
  B.add(B.box(0.74, 0.09, z1 - z0 + 0.5, { seg: 0.5 }), ch(PM, 0, 0.03, zm + 0.25), { color: V.newDust.clone().lerp(V.soot, 0.45), moss: 0, ground: g0 - 9, disp: 0.02, dispScale: 4 }); // the ash raked out
  for (let i = 0; i < (low ? 3 : 6); i++) B.add(B.rock(0.07 + rng() * 0.05, 0, 1, 0.6, 1), ch(PM, (rng() - 0.5) * 0.5, 0.1, z0 + 0.62 + rng() * 0.5, 0, rng() * 3, 0), { color: new THREE.Color('#2a0a04'), moss: 0, ground: g0 - 9, emit: [V.ember[0] * 0.7, V.ember[1] * 0.5, V.ember[2] * 0.4, 1] });
  // the rake left leaning by it, and the fuel: split thorn, stacked
  beam(B, PM, [0.86, 0, z1 + 0.5], [0.72, 1.7, z1 - 0.35], 0.035, { color: L.iron, iron: 0.9, moss: 0, ground: g0, round: 5 });
  B.add(B.box(0.3, 0.03, 0.12, { seg: 9 }), ch(PM, 0.86, 0.02, z1 + 0.5, 0, 0.3, 0), { color: L.iron, iron: 0.9, moss: 0, ground: g0 });
  const stack = [-1.28, z1 - 0.55];
  for (let i = 0; i < (low ? 7 : 11); i++) { const row = i < 5 ? 0 : i < 9 ? 1 : 2, k = i < 5 ? i : i < 9 ? i - 5 + 0.5 : i - 9 + 1; B.add(B.cyl(0.075, 0.085, 0.8 + rng() * 0.12, 5, 1), ch(PM, stack[0] + (rng() - 0.5) * 0.04, 0.08 + row * 0.15, stack[1] + k * 0.17, 0, (rng() - 0.5) * 0.12, Math.PI / 2), { color: worn(L.wood, rng, 0.2, 0.3), moss: 0.1, ground: g0 }); }

  const fire = W(PM, 0, 0.6, z1 - 0.1), stand = W(PM, 0, 0, z1 + 1.0);
  const a = W(PM, 0, 0, z0 + 0.2), b = W(PM, 0, 0, z1 - 0.2), st = W(PM, stack[0], 0, stack[1] + 0.35);
  // his body: a capsule along his length on the ground (he lies across the way he looks)
  const rr = Math.max(0.5, (z1h - z0h) / 2 - 0.05), zc = (z0h + z1h) / 2, hx0 = Math.min((x0 + x1) / 2, x0 + rr), hx1 = Math.max((x0 + x1) / 2, x1 - rr);
  const h0 = W(M, hx0, 0, zc), h1 = W(M, hx1, 0, zc);
  return { mouth: head.mouth, fire, stand, r: Math.max(rr, (x1 - x0) / 2), tris: head.tris, extent: { x0, x1, z0: z0h, z1: z1h },
    colliders: [{ x1: h0[0], z1: h0[2], x2: h1[0], z2: h1[2], r: rr, y: g0 - 0.5, h: 2.6 * S }, { x1: a[0], z1: a[2], x2: b[0], z2: b[2], r: 0.66, y: g0 - 0.5, h: 2.2, stand: false }, { x: st[0], z: st[2], r: 0.5, y: g0 - 0.5, h: 0.95 }] };
}
// A lesser crowned head, waiting for the fire: r its size (m, about its half-width). M: the ground under it, +z its face.
export function lesserHead(B, M, o) {
  const r = o.r, rng = o.rng, g0 = M.elements[13], k = r / 0.8;
  const HM = ch(M, 0, 1.12 * k * 0.86, 0, o.rx ?? 0, 0, o.rz ?? 0, k, k, k), stone = worn(H.stone, rng, 0.12, 0.12);
  B.add(headGeo(o.N2, o.low ? 12 : 18, o.low ? 9 : 13), HM, { color: stone, moss: 0.6, ground: g0, course: 0 });
  B.add(ring(B, 0.6, 0.83, 0.62, 0.86, o.low ? 8 : 12), HM, { color: stone.clone().multiplyScalar(0.85), moss: 0.5, ground: g0 });
  const c = W(M, 0, 0, 0);
  return { colliders: [{ x: c[0], z: c[2], r: r * 0.9, y: g0 - 0.5, h: 2 * k + 0.5 }] };
}

// The Almoner: the saint's hand, palm up, fingers along +z, three times the scatter's hand (its palm 1.26 by 1.5 m),
// a kerb of clay on the palm and the water standing in it. M: the ground under the palm's middle.
// Returns { pool: the water's middle (world), colliders }.
export function almoner(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], k = o.k ?? 3, low = !!o.low;
  const HM = ch(M, 0, -0.05 * k, 0, 0.1, 0, -0.04, k, k, k), stone = worn(H.stone, rng, 0.1, 0.06).multiplyScalar(1.08);
  const st = { color: stone, moss: 0.5, ground: g0, course: 0, wet: 0.1 }, seg = low ? 6 : 8, ball = (r, x, y, z, sx = 1, sy = 1, sz = 1) => B.add(new THREE.IcosahedronGeometry(r, 1), ch(HM, x, y, z, 0, 0, 0, sx, sy, sz), st);
  B.add(B.box(0.46, 0.14, 0.5, { seg: 0.09, chip: 0.035 }), ch(HM, 0, 0.09, 0), { ...st, disp: 0.012, dispScale: 5 });
  ball(0.1, 0.15, 0.13, -0.12, 1.0, 0.55, 1.5); ball(0.085, -0.17, 0.13, -0.08, 0.8, 0.5, 1.9); // the heel of the thumb, the heel of the hand
  B.add(B.cyl(0.17, 0.2, 0.36, low ? 8 : 10, 1), ch(HM, 0, 0.09, -0.41, Math.PI / 2, 0, 0, 1.2, 1, 0.72), st); // the wrist, broken off
  // four fingers of three joints, lying out and curling up at the ends (the third's last two joints are gone)
  const fingers = [[-0.172, 0.86, 1.0], [-0.058, 1.0, 0.6], [0.058, 0.95, 0.8], [0.172, 0.76, 1.25]];
  for (let i = 0; i < 4; i++) {
    const [x, len, curl] = fingers[i], r0 = 0.052 - (i === 3 ? 0.006 : 0);
    let p = [x, 0.1, 0.2], ang = 0.06 * curl;
    for (let j = 0; j < 3; j++) {
      if (i === 2 && j > 0) break;
      const r = r0 - j * 0.006, l = [0.27, 0.19, 0.13][j] * len, q = [p[0] + (j ? 0 : x * 0.3), p[1] + Math.sin(ang) * l, p[2] + Math.cos(ang) * l];
      beam(B, HM, p, q, r * 2, { ...st, round: seg }, (r - 0.004) * 2);
      ball(r - 0.002, q[0], q[1], q[2]);
      p = q; ang += [0.5, 0.7, 0][j] * curl;
    }
  }
  { const a = [0.2, 0.1, -0.1], b = [0.35, 0.14, 0.1], c = [0.38, 0.27, 0.27];
    beam(B, HM, a, b, 0.125, { ...st, round: seg }, 0.11); beam(B, HM, b, c, 0.105, { ...st, round: seg }, 0.085);
    ball(0.055, ...b); ball(0.043, ...c); }
  B.add(new THREE.TorusGeometry(0.062, 0.016, 5, 12), ch(HM, -0.072, 0.115, 0.36, 0.1, 0, 0), { color: H.bronze, moss: 0.1, ground: g0 - 9, wet: 0.2 }); // his ring: nobody has got it off
  // the hollow of the palm, kerbed with a ring of clay and lime to hold more: the water in it dark, showing the sky
  const yw = 0.178, rw = 0.135;
  B.add(new THREE.TorusGeometry(rw + 0.012, 0.024, 5, low ? 10 : 14), ch(HM, 0, 0.168, 0.0, Math.PI / 2, 0, 0, 1, 1.25, 1), { color: worn(V.mud, rng, 0.15).lerp(V.lime, 0.25), moss: 0.2, ground: g0 - 9, wet: 0.3, disp: 0.004, dispScale: 14 });
  B.add(B.cyl(rw, rw, 0.02, low ? 10 : 14, 1), ch(HM, 0, yw - 0.01, 0, 0, 0, 0, 1, 1, 1.25), { color: new THREE.Color('#141d27'), moss: 0, ground: g0 - 9, wet: 1, emit: [0.02, 0.026, 0.04, 2] });
  // where it runs over, between the fingers: a dark wet tongue on the stone, and a jar set to catch it
  B.add(B.box(0.05, 0.012, 0.34, { seg: 9 }), ch(HM, 0.0, 0.163, 0.33, -0.06, 0, 0), { color: new THREE.Color('#1c242a'), moss: 0.5, ground: g0 - 9, wet: 1 });
  const pool = W(HM, 0, yw, 0), c = W(M, 0, 0, 0), f = W(M, 0, 0, 0.5 * k), wr = W(M, 0, 0, -0.42 * k);
  return { pool, jar: W(M, 0.0, 0, 0.92 * k), colliders: [{ x1: wr[0], z1: wr[2], x2: f[0], z2: f[2], r: 0.25 * k, y: g0 - 0.5, h: 0.5 + 0.22 * k }], c };
}

// the masons' bench: a plank on two robbed capitals. M: its middle on the ground, +z the way a sitter looks
export function bench(B, M, o) {
  const rng = o.rng, g0 = M.elements[13], w = o.w ?? 1.5;
  for (const s of [-1, 1]) B.add(B.box(0.3, 0.42, 0.32, { seg: 9, chip: 0.03, seed: s + 5 }), ch(M, s * (w / 2 - 0.26), 0.19, 0, 0, (rng() - 0.5) * 0.3, 0), { color: worn(H.stone, rng, 0.1, 0.1), moss: 0.4, ground: g0, course: 0 });
  B.add(B.box(w, 0.055, 0.36, { seg: 9 }), ch(M, 0, 0.425, 0.02, 0, (rng() - 0.5) * 0.04, 0), { color: worn(V.rawWood, rng, 0.3, 0.1), moss: 0.05, ground: g0 });
  const a = W(M, -w / 2 + 0.15, 0, 0), b = W(M, w / 2 - 0.15, 0, 0);
  return { seat: W(M, 0, 0.45, 0.02), colliders: [{ x1: a[0], z1: a[2], x2: b[0], z2: b[2], r: 0.2, y: g0 - 0.5, h: 0.95 }] };
}
