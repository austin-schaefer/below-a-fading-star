// Shared forms and helpers for the still figures (v7-03): an ellipsoid along x, a flat-shaded crystal prism, a strand
// of colours, the conforming of a figure to the drawn ground, and the zeroed matrix an instanced slot rests on.
import * as THREE from 'three';
import { Painter, paintedMaterial } from '../../fauna/uncanny/kit.js';
export { Painter, paintedMaterial };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

// An ellipsoid with its poles at both ends of the x axis (nu around, nv along).
export function ell(P, cx, cy, cz, rx, ry, rz, nu = 8, nv = 5) {
  P.grid(nu, nv, (u, v, o) => {
    const a = u * Math.PI * 2, ph = v * Math.PI, s = Math.sin(ph);
    o[0] = cx - Math.cos(ph) * rx; o[1] = cy + Math.sin(a) * ry * s; o[2] = cz + Math.cos(a) * rz * s;
  }, true, true);
}

// A four-sided prism with a pointed tip, every face its own vertices (flat). b: base, a: unit axis, L length, r radius.
const _u = new THREE.Vector3(), _v = new THREE.Vector3(), _a = new THREE.Vector3();
export function prism(P, bx, by, bz, ax, ay, az, L, r, base, tip, mre) {
  _a.set(ax, ay, az).normalize();
  _u.set(0, 1, 0); if (Math.abs(_a.y) > 0.92) _u.set(1, 0, 0);
  _u.cross(_a).normalize(); _v.crossVectors(_a, _u);
  const ring = (h, k) => { // 4 corners at height h*L, radius r*k, turned an eighth
    const o = [];
    for (let i = 0; i < 4; i++) { const an = Math.PI / 4 + i * Math.PI / 2, c = Math.cos(an) * r * k, s = Math.sin(an) * r * k; o.push([bx + _a.x * h * L + _u.x * c + _v.x * s, by + _a.y * h * L + _u.y * c + _v.y * s, bz + _a.z * h * L + _u.z * c + _v.z * s]); }
    return o;
  };
  const B = ring(0, 1), M = ring(0.72, 0.9), T = [bx + _a.x * L, by + _a.y * L, bz + _a.z * L];
  const [m, e, t] = mre;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    P.paint(base, m, e, t[0]); const q0 = P.v(...B[i]), q1 = P.v(...B[j]);
    P.paint(tip, m, e, t[1]); const q2 = P.v(...M[j]), q3 = P.v(...M[i]);
    P.quad(q0, q1, q2, q3);
    const p0 = P.v(...M[i]), p1 = P.v(...M[j]); P.paint(tip, m, e, t[2]); const p2 = P.v(...T);
    P.tri(p0, p1, p2);
  }
}

// A run of short tubes along pts, each segment painted by colorAt(k / segments), radii r0 -> r1.
export function strand(P, pts, r0, r1, colorAt, sides = 4, rough = 0.9) {
  const n = pts.length - 1;
  for (let k = 0; k < n; k++) {
    P.paint(colorAt(k / n), 0, rough, 0);
    const ra = lerp(r0, r1, k / n), rb = lerp(r0, r1, (k + 1) / n);
    P.loft([pts[k], pts[k + 1]], [ra, rb], sides, 0, false);
  }
}

// Seat a built geometry on the ground: each vertex rises by the drawn ground under it less the ground at the origin.
// The geometry is in a local frame turned by yaw about y (three's rotation.y) and placed at (ox, oz).
export function conform(geo, ox, oz, yaw, groundAt, baseY, weightAt = null) {
  const p = geo.attributes.position, c = Math.cos(yaw), s = Math.sin(yaw);
  for (let i = 0; i < p.count; i++) {
    const lx = p.getX(i), lz = p.getZ(i), wx = ox + lx * c + lz * s, wz = oz - lx * s + lz * c;
    const w = weightAt ? weightAt(i, p.getY(i)) : 1;
    p.setY(i, p.getY(i) + (groundAt(wx, wz) - baseY) * w);
  }
  p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.computeBoundingBox();
}

export const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// A deterministic 0..1 hash of three numbers
export const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };

// An ellipsoid with its poles at both ends of the z axis.
export function ellZ(P, cx, cy, cz, rx, ry, rz, nu = 8, nv = 5) {
  P.grid(nu, nv, (u, v, o) => {
    const a = u * Math.PI * 2, ph = v * Math.PI, s = Math.sin(ph);
    o[2] = cz - Math.cos(ph) * rz; o[1] = cy + Math.sin(a) * ry * s; o[0] = cx + Math.cos(a) * rx * s;
  }, true, true);
}
