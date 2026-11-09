// Surface nets for the canyon's smooth forms (the Bather and her stones): the thrones' method (src/v5/thrones.js),
// here as a small helper. A signed-distance field is sampled on a grid, one vertex per cell the surface crosses (the
// mean of its edge crossings), one quad per crossed edge; then each vertex is pulled onto the surface by one Newton
// step and given the field's gradient as its normal, so the form is smooth without a smoothing pass.
// Faces are only made between cells inside the box: a surface that leaves the box is left open there (the Bather's
// box stops under the river's bed).

export const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k)); return b + (a - b) * h - k * h * (1 - h); };

// A tapered capsule from A to B (radii ra, rb), its cross-section squashed in y by fy (fy < 1: flat, as the hair).
export function capsule(x, y, z, A, B, ra, rb, fy = 1) {
  const px = x - A[0], py = (y - A[1]) / fy, pz = z - A[2];
  const bx = B[0] - A[0], by = (B[1] - A[1]) / fy, bz = B[2] - A[2];
  let h = (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz + 1e-9);
  h = h < 0 ? 0 : h > 1 ? 1 : h;
  const dx = px - bx * h, dy = py - by * h, dz = pz - bz * h;
  return (Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * h)) * Math.min(1, fy);
}

// field(x, y, z) -> signed distance (negative inside); box { x0, x1, y0, y1, z0, z1 }; cell in metres.
// Returns { position: Float32Array, normal: Float32Array, index: Uint32Array, count }.
export function surfaceNets(field, box, cell) {
  const nx = Math.ceil((box.x1 - box.x0) / cell), ny = Math.ceil((box.y1 - box.y0) / cell), nz = Math.ceil((box.z1 - box.z0) / cell);
  const sx = nx + 1, sxy = (nx + 1) * (ny + 1);
  const F = new Float32Array(sxy * (nz + 1));
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[k * sxy + j * sx + i] = field(box.x0 + i * cell, box.y0 + j * cell, box.z0 + k * cell);
  const cellV = new Int32Array(nx * ny * nz).fill(-1);
  const verts = [];
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { val[c] = F[(k + C[c][2]) * sxy + (j + C[c][1]) * sx + i + C[c][0]]; if (val[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let ax = 0, ay = 0, az = 0, n = 0;
    for (const [a, b] of E) {
      const fa = val[a], fb = val[b];
      if ((fa < 0) === (fb < 0)) continue;
      const t = fa / (fa - fb);
      ax += C[a][0] + (C[b][0] - C[a][0]) * t; ay += C[a][1] + (C[b][1] - C[a][1]) * t; az += C[a][2] + (C[b][2] - C[a][2]) * t;
      n++;
    }
    cellV[(k * ny + j) * nx + i] = verts.length / 3;
    verts.push(box.x0 + (i + ax / n) * cell, box.y0 + (j + ay / n) * cell, box.z0 + (k + az / n) * cell);
  }
  const idx = [];
  const cv = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : cellV[(k * ny + j) * nx + i]);
  const quad = (neg, a, b, c, d) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (neg) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const f0 = F[k * sxy + j * sx + i], n0 = f0 < 0;
    if (i < nx && n0 !== (F[k * sxy + j * sx + i + 1] < 0)) quad(n0, cv(i, j - 1, k - 1), cv(i, j, k - 1), cv(i, j, k), cv(i, j - 1, k));
    if (j < ny && n0 !== (F[k * sxy + (j + 1) * sx + i] < 0)) quad(n0, cv(i - 1, j, k - 1), cv(i - 1, j, k), cv(i, j, k), cv(i, j, k - 1));
    if (k < nz && n0 !== (F[(k + 1) * sxy + j * sx + i] < 0)) quad(n0, cv(i - 1, j - 1, k), cv(i, j - 1, k), cv(i, j, k), cv(i - 1, j, k));
  }
  // onto the surface, and the gradient's normal
  const nv = verts.length / 3, position = new Float32Array(verts), normal = new Float32Array(nv * 3), e = cell * 0.25;
  for (let v = 0; v < nv; v++) {
    let x = position[v * 3], y = position[v * 3 + 1], z = position[v * 3 + 2];
    for (let it = 0; it < 2; it++) {
      const f = field(x, y, z);
      const gx = (field(x + e, y, z) - field(x - e, y, z)) / (2 * e), gy = (field(x, y + e, z) - field(x, y - e, z)) / (2 * e), gz = (field(x, y, z + e) - field(x, y, z - e)) / (2 * e);
      const g2 = gx * gx + gy * gy + gz * gz || 1, gl = Math.sqrt(g2);
      if (it === 0) { const step = Math.max(-cell * 0.5, Math.min(cell * 0.5, f / g2)); x -= gx * step; y -= gy * step; z -= gz * step; }
      else { normal[v * 3] = gx / gl; normal[v * 3 + 1] = gy / gl; normal[v * 3 + 2] = gz / gl; }
    }
    position[v * 3] = x; position[v * 3 + 1] = y; position[v * 3 + 2] = z;
  }
  return { position, normal, index: new Uint32Array(idx), count: nv };
}
