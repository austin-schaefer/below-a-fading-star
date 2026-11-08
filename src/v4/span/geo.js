// Geometry helpers for the Great Span: every part comes out non-indexed with position and normal only, so the
// kit's mergeGeometries can fold a whole material's worth into one mesh.
import * as THREE from 'three';

// strip a geometry to non-indexed position + normal
export function clean(g) {
  const n = g.index ? g.toNonIndexed() : g;
  if (n !== g) g.dispose();
  for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
}

// an axis-aligned box from its bounds
export function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return clean(g);
}

// an elevation polygon [[x, y], ...] in the x-y plane extruded along z from z0 to z1
export function extrudeXY(pts, z0, z1) {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1, steps: 1 });
  g.translate(0, 0, z0);
  return clean(g);
}
// the same in the z-y plane (a polygon [[z, y], ...]) extruded along x from x0 to x1
export function extrudeZY(pts, x0, x1) {
  const g = extrudeXY(pts, x0, x1);
  // (x, y, z) -> (z, y, x): swap x and z, which mirrors, so flip the winding back
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setX(i, p.getZ(i)); p.setZ(i, x); const nx = n.getX(i); n.setX(i, n.getZ(i)); n.setZ(i, nx); }
  flipWinding(g);
  return g;
}
export function flipWinding(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 9) for (let c = 0; c < 3; c++) {
    let t = p[i + 3 + c]; p[i + 3 + c] = p[i + 6 + c]; p[i + 6 + c] = t;
    t = n[i + 3 + c]; n[i + 3 + c] = n[i + 6 + c]; n[i + 6 + c] = t;
  }
}

// a solid lofted through convex rings of equal vertex count: rings [{ y, pts: [[x, z], ...] }] bottom to top,
// each ring's points counter-clockwise seen from above (x east, z south: i.e. clockwise on the map)
export function loft(rings) {
  const pos = [];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  const n = rings[0].pts.length;
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a0 = [A.pts[i][0], A.y, A.pts[i][1]], a1 = [A.pts[j][0], A.y, A.pts[j][1]];
      const b0 = [B.pts[i][0], B.y, B.pts[i][1]], b1 = [B.pts[j][0], B.y, B.pts[j][1]];
      tri(a0, a1, b1); tri(a0, b1, b0);
    }
  }
  const cap = (R, up) => {
    const c = R.pts.map((q) => [q[0], R.y, q[1]]);
    for (let i = 1; i < n - 1; i++) up ? tri(c[0], c[i], c[i + 1]) : tri(c[0], c[i + 1], c[i]);
  };
  cap(rings[0], false); cap(rings[rings.length - 1], true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // make the faces point outward whatever the rings' winding: test one side face against the centroid
  const p = g.attributes.position.array, nn = g.attributes.normal.array;
  let cx = 0, cy = 0, cz = 0; for (let i = 0; i < p.length; i += 3) { cx += p[i]; cy += p[i + 1]; cz += p[i + 2]; }
  const k = p.length / 3; cx /= k; cy /= k; cz /= k;
  const mx = (p[0] + p[3] + p[6]) / 3 - cx, my = (p[1] + p[4] + p[7]) / 3 - cy, mz = (p[2] + p[5] + p[8]) / 3 - cz;
  if (mx * nn[0] + my * nn[1] + mz * nn[2] < 0) { flipWinding(g); g.computeVertexNormals(); }
  return g;
}

// a triangular prism (the relieving triangle over a lintel): base from zA to zB at y0, apex at y1, x0..x1 deep
export function triPrism(x0, x1, zA, zB, y0, y1) {
  return extrudeZY([[zA, y0], [zB, y0], [(zA + zB) / 2, y1]], x0, x1);
}

// apply a matrix to a clean geometry (positions and normals)
export function place(g, m) { g.applyMatrix4(m); return g; }
