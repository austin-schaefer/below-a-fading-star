// Faces that fight for the pixel (#41): two triangles of a mesh in one plane, facing the same way, overlapping, so the
// depth test cannot choose and they flicker in turn as the view moves (a lining laid exactly on a face). A browser
// module for the tests (imported in the page as /tools/coplanar.js): coplanar(mesh, centre, radius) → [{ a, b, at }]
// for the triangles whose centroids lie within `radius` of `centre` (world space; an instanced mesh is read through
// its first instance near `centre`, or not at all). Tolerances: normals within 1.8°, planes within 1.5 mm, overlap past
// 2 mm inside both.
export function coplanar(mesh, centre, radius) {
  const g = mesh.geometry, P = g.attributes.position, I = g.index;
  mesh.updateWorldMatrix(true, false);
  const M = mesh.matrixWorld.elements;
  const tw = (i, o) => { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); o[0] = M[0] * x + M[4] * y + M[8] * z + M[12]; o[1] = M[1] * x + M[5] * y + M[9] * z + M[13]; o[2] = M[2] * x + M[6] * y + M[10] * z + M[14]; return o; };
  const n = I ? I.count / 3 : P.count / 3, tris = [];
  const r2 = radius * radius;
  for (let t = 0; t < n; t++) {
    const ia = I ? I.getX(t * 3) : t * 3, ib = I ? I.getX(t * 3 + 1) : t * 3 + 1, ic = I ? I.getX(t * 3 + 2) : t * 3 + 2;
    const a = tw(ia, [0, 0, 0]), b = tw(ib, [0, 0, 0]), c = tw(ic, [0, 0, 0]);
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
    if ((cx - centre.x) ** 2 + (cy - centre.y) ** 2 + (cz - centre.z) ** 2 > r2) continue;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-7) continue;
    nx /= l; ny /= l; nz /= l;
    tris.push({ t, a, b, c, n: [nx, ny, nz], d: nx * a[0] + ny * a[1] + nz * a[2], cen: [cx, cy, cz] });
  }
  // a point strictly inside a triangle (2 mm in from each edge), in the triangle's own plane
  const inside = (T, p) => {
    const e = [[T.a, T.b], [T.b, T.c], [T.c, T.a]];
    for (const [u, v] of e) {
      const ex = v[0] - u[0], ey = v[1] - u[1], ez = v[2] - u[2];
      // the edge's inward normal in the plane: n x e
      let ix = T.n[1] * ez - T.n[2] * ey, iy = T.n[2] * ex - T.n[0] * ez, iz = T.n[0] * ey - T.n[1] * ex;
      const il = Math.hypot(ix, iy, iz) || 1; ix /= il; iy /= il; iz /= il;
      if ((p[0] - u[0]) * ix + (p[1] - u[1]) * iy + (p[2] - u[2]) * iz < 0.002) return false;
    }
    return true;
  };
  const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
  const probes = (T) => [T.cen, mix(T.a, T.cen, 0.3), mix(T.b, T.cen, 0.3), mix(T.c, T.cen, 0.3)];
  const out = [];
  for (let i = 0; i < tris.length; i++) for (let j = i + 1; j < tris.length; j++) {
    const A = tris[i], B = tris[j];
    if (A.n[0] * B.n[0] + A.n[1] * B.n[1] + A.n[2] * B.n[2] < 0.9995) continue;
    if (Math.abs(A.d - (A.n[0] * B.cen[0] + A.n[1] * B.cen[1] + A.n[2] * B.cen[2])) > 0.0015) continue;
    if (probes(A).some((p) => inside(B, p)) || probes(B).some((p) => inside(A, p))) out.push({ a: A.t, b: B.t, at: A.cen.map((v) => +v.toFixed(2)) });
  }
  return out;
}
