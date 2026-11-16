// The underground's geometry, checked (v15-F1, the owner's #60, #61, #63; brief H1's tools/geometry-test.mjs is the
// general check, this is what edges-test asks of the places v14 built). Page functions: pass them to page.evaluate.
//   membersBear(rx): every member drawn by v14/under.js's UnderBuilder.beam in a mesh whose name matches rx, sloping
//     more than 15 degrees from level, has its lower end within its half-width and 6 cm of a face not its own, or
//     inside a solid (straight up 1.5 m it meets an odd number of faces, or first meets one from behind). A post's
//     top, a bearer's overhang, a shard's broken end may stand free; a level member is not asked (look at those).
//     -> { ends, faces, floating: ['mesh#i (x, y, z) len w nearest', ...] }
//   facesApart(rx): two faces facing the same way within 1.2 mm of one plane that overlap, in or across the meshes whose
//     names match rx, are a flicker (the portal's soffits, #60; the landing's boards and slab). Not counted: two
//     members' faces where they meet (a rope's links, two legs lashed), and one colour laid over the same colour.
//     -> { faces, meshes, pairs: [{ k: 'meshA/meshB', n, at }] }
export function membersBear(rx) {
  const fp = window.__fp, RX = new RegExp(rx);
  const meshes = [];
  fp.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry?.attributes?.position) meshes.push(o); });
  // every member drawn by the underground's builder (UnderBuilder.beam) sloping more than 15 degrees: its lower end
  // bears on something, within its half-width and 6 cm of a face not its own, or inside a solid (a post's top, a
  // bearer's overhang, a shard's broken end may stand free; a level member is not asked)
  const ends = [];
  meshes.forEach((m, mi) => {
    const B = m.geometry.userData.beams; if (!B || !RX.test(m.name)) return;
    for (let i = 0; i < B.length; i += 9) {
      const dy = B[i + 4] - B[i + 1], L = Math.hypot(B[i + 3] - B[i], dy, B[i + 5] - B[i + 2]);
      if (Math.abs(dy) / L < 0.26) continue;
      const lo = dy > 0 ? i : i + 3;
      ends.push([B[lo], B[lo + 1], B[lo + 2], B[i + 6], mi, B[i + 7], B[i + 8], m.name, i / 9, L]);
    }
  });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const e of ends) { x0 = Math.min(x0, e[0]); x1 = Math.max(x1, e[0]); y0 = Math.min(y0, e[1]); y1 = Math.max(y1, e[1]); z0 = Math.min(z0, e[2]); z1 = Math.max(z1, e[2]); }
  // every face near them, in a 0.5 m hash
  const G = 0.5, grid = new Map(), key = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
  const tri = []; // flat: 9 coords, mesh index, triangle index
  const v = [0, 0, 0];
  meshes.forEach((m, mi) => {
    const g = m.geometry, P = g.attributes.position.array, I = g.index?.array, n = I ? I.length / 3 : P.length / 9, E = m.matrixWorld.elements;
    const tx = (k) => { const x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2]; return [E[0] * x + E[4] * y + E[8] * z + E[12], E[1] * x + E[5] * y + E[9] * z + E[13], E[2] * x + E[6] * y + E[10] * z + E[14]]; };
    const bs = g.boundingSphere; if (bs) { const c = bs.center; if (c.x + E[12] + bs.radius < x0 - 1 || c.x + E[12] - bs.radius > x1 + 1 || c.z + E[14] + bs.radius < z0 - 1 || c.z + E[14] - bs.radius > z1 + 1) return; }
    for (let t = 0; t < n; t++) {
      const a = I ? I[t * 3] : t * 3, b = I ? I[t * 3 + 1] : t * 3 + 1, c = I ? I[t * 3 + 2] : t * 3 + 2;
      if (a === b || b === c || a === c) continue;
      if (!I) { const x = P[a * 3], z = P[a * 3 + 2]; if (x < x0 - 30 || x > x1 + 30 || z < z0 - 30 || z > z1 + 30) continue; }
      const A = tx(a), Bv = tx(b), C = tx(c);
      const mnx = Math.min(A[0], Bv[0], C[0]), mxx = Math.max(A[0], Bv[0], C[0]), mny = Math.min(A[1], Bv[1], C[1]), mxy = Math.max(A[1], Bv[1], C[1]), mnz = Math.min(A[2], Bv[2], C[2]), mxz = Math.max(A[2], Bv[2], C[2]);
      if (mxx < x0 - 1 || mnx > x1 + 1 || mxy < y0 - 1 || mny > y1 + 2 || mxz < z0 - 1 || mnz > z1 + 1) continue;
      if ((mxx - mnx + G) * (mxy - mny + G) * (mxz - mnz + G) / (G * G * G) > 8000) continue; // the sky, the far ranges
      const id = tri.length / 11; tri.push(...A, ...Bv, ...C, mi, t);
      for (let i = Math.floor(mnx / G); i <= Math.floor(mxx / G); i++) for (let j = Math.floor(mny / G); j <= Math.floor(mxy / G); j++) for (let k = Math.floor(mnz / G); k <= Math.floor(mxz / G); k++) { const h = key(i, j, k); let L = grid.get(h); if (!L) grid.set(h, L = []); L.push(id); }
    }
  });
  const own = (o, mi, t0, t1) => tri[o + 9] === mi && tri[o + 10] >= t0 && tri[o + 10] < t1;
  // the closest distance from p to a triangle (Ericson)
  const dist = (px, py, pz, o) => {
    const ax = tri[o], ay = tri[o + 1], az = tri[o + 2], bx = tri[o + 3], by = tri[o + 4], bz = tri[o + 5], cx = tri[o + 6], cy = tri[o + 7], cz = tri[o + 8];
    const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = px - ax, apy = py - ay, apz = pz - az;
    const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
    const bpx = px - bx, bpy = py - by, bpz = pz - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    const cpx = px - cx, cpy = py - cy, cpz = pz - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
    const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
    let qx, qy, qz;
    if (d1 <= 0 && d2 <= 0) { qx = ax; qy = ay; qz = az; }
    else if (d3 >= 0 && d4 <= d3) { qx = bx; qy = by; qz = bz; }
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); qx = ax + abx * t; qy = ay + aby * t; qz = az + abz * t; }
    else if (d6 >= 0 && d5 <= d6) { qx = cx; qy = cy; qz = cz; }
    else if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); qx = ax + acx * t; qy = ay + acy * t; qz = az + acz * t; }
    else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); qx = bx + (cx - bx) * t; qy = by + (cy - by) * t; qz = bz + (cz - bz) * t; }
    else { const dn = 1 / (va + vb + vc), s = vb * dn, t = vc * dn; qx = ax + abx * s + acx * t; qy = ay + aby * s + acy * t; qz = az + abz * s + acz * t; }
    return Math.hypot(px - qx, py - qy, pz - qz);
  };
  const floating = [];
  for (const e of ends) {
    const [px, py, pz, w, mi, t0, t1] = e, R = w + 0.06;
    let best = Infinity; const seen = new Set();
    for (let i = Math.floor((px - R) / G); i <= Math.floor((px + R) / G); i++) for (let j = Math.floor((py - R) / G); j <= Math.floor((py + R) / G); j++) for (let k = Math.floor((pz - R) / G); k <= Math.floor((pz + R) / G); k++) {
      const L = grid.get(key(i, j, k)); if (!L) continue;
      for (const id of L) { if (seen.has(id)) continue; seen.add(id); const o = id * 11; if (own(o, mi, t0, t1)) continue; const d = dist(px, py, pz, o); if (d < best) best = d; }
    }
    if (best > R) {
      // inside something (buried, or in a closed solid): straight up 1.5 m, the faces met are odd in number, or the first faces up
      let tmin = Infinity, ny = 0, hits = 0; const seen2 = new Set();
      for (let j = Math.floor(py / G); j <= Math.floor((py + 1.5) / G); j++) {
        const L = grid.get(key(Math.floor(px / G), j, Math.floor(pz / G))); if (!L) continue;
        for (const id of L) {
          if (seen2.has(id)) continue; seen2.add(id); const o = id * 11; if (own(o, mi, t0, t1)) continue;
          const ax = tri[o], ay = tri[o + 1], az = tri[o + 2], e1x = tri[o + 3] - ax, e1y = tri[o + 4] - ay, e1z = tri[o + 5] - az, e2x = tri[o + 6] - ax, e2y = tri[o + 7] - ay, e2z = tri[o + 8] - az;
          const hx = e2z, hz = -e2x, det = e1x * hx + e1z * hz; if (Math.abs(det) < 1e-12) continue; // Moller-Trumbore, d = +y
          const f = 1 / det, sx = px - ax, sy = py - ay, sz = pz - az, u = f * (sx * hx + sz * hz); if (u < 0 || u > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, vv = f * qy; if (vv < 0 || u + vv > 1) continue;
          const t = f * (e2x * qx + e2y * qy + e2z * qz); if (t < 0 || t > 1.5) continue;
          hits++; if (t < tmin) { tmin = t; ny = e1z * e2x - e1x * e2z; }
        }
      }
      if ((tmin < Infinity && ny > 0) || hits % 2 === 1) best = 0;
    }
    if (best > R) floating.push(`${e[7]}#${e[8]} (${px.toFixed(2)},${py.toFixed(2)},${pz.toFixed(2)}) len ${e[9].toFixed(2)} w${w.toFixed(3)} nearest ${best === Infinity ? '>0.5' : best.toFixed(2)}`);
  }
  return { ends: ends.length, faces: tri.length / 11, floating };
}

export function facesApart(rx) {
  // two faces facing the same way in one plane that overlap: they fight for the same pixels (the portal's soffits,
  // #60; the landing's planks and slab, v14-F1). Over the named meshes, within each and across them.
  const fp = window.__fp, RX = new RegExp(rx);
  const meshes = []; fp.scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && RX.test(o.name)) meshes.push(o); });
  const buckets = new Map(), T = [];
  const QN = 200, QD = 100; // normal to 1/200, plane offset to 1 cm
  meshes.forEach((m, mi) => {
    const g = m.geometry, P = g.attributes.position.array, I = g.index?.array, n = I ? I.length / 3 : P.length / 9, E = m.matrixWorld.elements;
    const tx = (k) => { const x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2]; return [E[0] * x + E[4] * y + E[8] * z + E[12], E[1] * x + E[5] * y + E[9] * z + E[13], E[2] * x + E[6] * y + E[10] * z + E[14]]; };
    for (let t = 0; t < n; t++) {
      const a = I ? I[t * 3] : t * 3, b = I ? I[t * 3 + 1] : t * 3 + 1, c = I ? I[t * 3 + 2] : t * 3 + 2;
      if (a === b || b === c || a === c) continue;
      const A = tx(a), B = tx(b), C = tx(c);
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz);
      if (l < 2e-4) continue; // under 1 cm square: too small to see fight
      nx /= l; ny /= l; nz /= l;
      const d = nx * A[0] + ny * A[1] + nz * A[2];
      const Cc = g.attributes.color?.array, col = Cc ? [(Cc[a * 3] + Cc[b * 3] + Cc[c * 3]) / 3, (Cc[a * 3 + 1] + Cc[b * 3 + 1] + Cc[c * 3 + 1]) / 3, (Cc[a * 3 + 2] + Cc[b * 3 + 2] + Cc[c * 3 + 2]) / 3] : [1, 1, 1];
      const BM = g.userData.beams; let inBeam = false; if (BM) for (let q = 0; q < BM.length; q += 9) if (t >= BM[q + 7] && t < BM[q + 8]) { inBeam = true; break; }
      const id = T.length; T.push([A, B, C, nx, ny, nz, d, mi, t, col, inBeam]);
      const k = `${Math.round(nx * QN)},${Math.round(ny * QN)},${Math.round(nz * QN)},${Math.round(d * QD)}`;
      let L = buckets.get(k); if (!L) buckets.set(k, L = []); L.push(id);
    }
  });
  // in the plane's two largest axes: a point inside a triangle by more than 1% of each barycentric weight
  const inside = (p, t, ax) => {
    const [i, j] = ax, [A, B, C] = t;
    const s = (P, Q, R) => (Q[i] - P[i]) * (R[j] - P[j]) - (Q[j] - P[j]) * (R[i] - P[i]);
    const ar = s(A, B, C);
    const w0 = s(B, C, p) / ar, w1 = s(C, A, p) / ar, w2 = s(A, B, p) / ar;
    return w0 > 0.01 && w1 > 0.01 && w2 > 0.01;
  };
  const probes = (t) => { const [A, B, C] = t, c = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3]; return [c, ...[A, B, C].map((v) => [c[0] + (v[0] - c[0]) * 0.85, c[1] + (v[1] - c[1]) * 0.85, c[2] + (v[2] - c[2]) * 0.85])]; };
  const out = new Map();
  for (const [k, L] of buckets) {
    // the neighbouring offset bins too (a plane on a bin's edge)
    const [a, b, c, d] = k.split(',').map(Number), all = [...L];
    for (const dd of [d - 1, d + 1]) { const M = buckets.get(`${a},${b},${c},${dd}`); if (M) all.push(...M); }
    if (all.length < 2) continue;
    for (const i of L) for (const j of all) {
      if (j <= i && L.includes(j)) continue;
      const t = T[i], u = T[j];
      if (Math.abs(t[6] - u[6]) > 0.0012 || t[3] * u[3] + t[4] * u[4] + t[5] * u[5] < 0.9995) continue;
      if (t[10] && u[10]) continue; // two members' faces where they meet (a rope's links, two legs lashed): one paint, never seen to fight
      { const a = t[9], b = u[9], m = Math.max(a[0], a[1], a[2], b[0], b[1], b[2], 1e-3); if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 0.15 * m) continue; } // one colour over the other: nothing to see
      const n = [Math.abs(t[3]), Math.abs(t[4]), Math.abs(t[5])], drop = n.indexOf(Math.max(...n)), ax = [0, 1, 2].filter((q) => q !== drop);
      if (probes(t).some((p) => inside(p, u, ax)) || probes(u).some((p) => inside(p, t, ax))) {
        const key = `${meshes[t[7]].name}/${meshes[u[7]].name}`, c = probes(t)[0];
        const o = out.get(key) || { n: 0, at: [] }; o.n++; if (o.at.length < 4) o.at.push(c.map((v) => v.toFixed(2)).join(', ')); out.set(key, o);
      }
    }
  }
  return { faces: T.length, meshes: meshes.length, pairs: [...out].map(([k, o]) => ({ k, n: o.n, at: o.at })) };
}
