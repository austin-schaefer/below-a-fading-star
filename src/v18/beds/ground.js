// The ground opened to a box, cut clean (v18-F3). The way the Nave and the Swallow open the ground takes whole
// triangles (a cell of 3.1 m on low): the hole's edge is ragged and a stone edge has to stand over it. Here every
// triangle of the terrain's mesh that reaches into the box { x0, x1, z0, z1 } is made degenerate (after the bake,
// never heightAt) and what of it lies outside the box is drawn again in a mesh of the terrain's own material and
// attributes, each attribute carried linearly to the cut, so the ground runs exactly to the box's edge with no seam:
// the forecourt's wing walls stand on that edge.
//   openBox(T, box) -> { mesh, cut, tris } (mesh null when nothing was cut; add it to the scene yourself)
import * as THREE from 'three';

// clip a convex polygon of vertices { p: [x, y, z], a: Float32Array of every attribute } by the half-plane
// k * (v[axis] - c) >= 0 (axis 0 x, 2 z)
function clip(poly, axis, c, k) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length], da = k * (A.p[axis] - c), db = k * (B.p[axis] - c);
    if (da >= 0) out.push(A);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db), a = new Float32Array(A.a.length);
      for (let j = 0; j < a.length; j++) a[j] = A.a[j] + (B.a[j] - A.a[j]) * t;
      out.push({ p: [A.p[0] + (B.p[0] - A.p[0]) * t, A.p[1] + (B.p[1] - A.p[1]) * t, A.p[2] + (B.p[2] - A.p[2]) * t], a });
    }
  }
  return out;
}

export function openBox(T, box) {
  const mesh0 = T.mesh, g = mesh0?.geometry, idx = g?.index?.array;
  if (!idx) return { mesh: null, cut: 0, tris: 0 };
  const names = Object.keys(g.attributes).filter((k) => k !== 'position');
  const A = names.map((k) => g.attributes[k]), P = g.attributes.position.array, W = A.reduce((m, a) => m + a.itemSize, 0);
  const vert = (i) => {
    const a = new Float32Array(W); let o = 0;
    for (const at of A) { for (let j = 0; j < at.itemSize; j++) a[o + j] = at.array[i * at.itemSize + j]; o += at.itemSize; }
    return { p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], a };
  };
  const pos = [], att = names.map(() => []);
  const emit = (v) => { pos.push(v.p[0], v.p[1], v.p[2]); let o = 0; A.forEach((at, k) => { for (let j = 0; j < at.itemSize; j++) att[k].push(v.a[o + j]); o += at.itemSize; }); };
  let cut = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (a === b || b === c || a === c) continue;
    const xa = P[a * 3], za = P[a * 3 + 2], xb = P[b * 3], zb = P[b * 3 + 2], xc = P[c * 3], zc = P[c * 3 + 2];
    if (Math.max(xa, xb, xc) <= box.x0 || Math.min(xa, xb, xc) >= box.x1 || Math.max(za, zb, zc) <= box.z0 || Math.min(za, zb, zc) >= box.z1) continue;
    // does any of it lie inside? (a triangle whose box overlaps but which misses the box's corner region keeps whole)
    const tri = [vert(a), vert(b), vert(c)];
    let inside = clip(clip(clip(clip(tri, 0, box.x0, 1), 0, box.x1, -1), 2, box.z0, 1), 2, box.z1, -1);
    if (inside.length < 3) continue;
    let area = 0; for (let i = 1; i < inside.length - 1; i++) { const p = inside[0].p, q = inside[i].p, r = inside[i + 1].p; area += Math.abs((q[0] - p[0]) * (r[2] - p[2]) - (q[2] - p[2]) * (r[0] - p[0])) / 2; }
    if (area < 1e-5) continue;
    idx[t + 1] = a; idx[t + 2] = a; cut++;
    // what is outside the box, as four convex pieces: west of x0, east of x1, and between them north of z0 and south of z1
    const pieces = [clip(tri, 0, box.x0, -1), clip(tri, 0, box.x1, 1), clip(clip(clip(tri, 0, box.x0, 1), 0, box.x1, -1), 2, box.z0, -1), clip(clip(clip(tri, 0, box.x0, 1), 0, box.x1, -1), 2, box.z1, 1)];
    for (const poly of pieces) for (let i = 1; i < poly.length - 1; i++) { emit(poly[0]); emit(poly[i]); emit(poly[i + 1]); }
  }
  if (!cut) return { mesh: null, cut: 0, tris: 0 };
  g.index.needsUpdate = true;
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  names.forEach((k, i) => ng.setAttribute(k, new THREE.BufferAttribute(new Float32Array(att[i]), A[i].itemSize, A[i].normalized)));
  ng.computeBoundingSphere();
  const mesh = new THREE.Mesh(ng, mesh0.material);
  mesh.receiveShadow = true; mesh.castShadow = false;
  return { mesh, cut, tris: pos.length / 9 };
}
