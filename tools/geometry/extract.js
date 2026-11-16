// The page's half of the geometry check (#64): a browser module, imported in the page by tools/geometry-test.mjs and
// tools/route-frames.mjs as /tools/geometry/extract.js.
//
//   route(fp, place) → { pts: [[x, y, z], ...] feet along the route every metre, L }   (place: tools/geometry/places.mjs)
//   stand(fp, place) → { ok, stands } stands the walker in the place and holds them (run the page's clock after it)
//   extract(fp, place, opts) → { P (base64 Float32 world triangles), part (base64 Uint32), parts, spheres, stands }
//
// The walker is stood in the place first (so what hides itself above or below ground, far away or near, is as a visitor
// there sees it), then every drawn mesh's triangles within the place's region are taken in world space: an
// InstancedMesh instance by instance (each its own part), a mesh with several materials group by group. Not taken:
// what is not drawn (hidden, or a hidden parent), BatchedMesh (the far trees: far.js and vegetation), skinned meshes,
// points, lines and sprites (no faces).

const b64 = (arr) => {
  const u8 = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};

// the route's points in order with what y they carry (null where the path leaves it to the floor)
function routePoints(fp, place) {
  if (place.ascent) {
    const a = fp.ascents.list.find((d) => d.id === place.ascent);
    if (!a) return null;
    return a.path.map((p) => [p[0], p[1], p.length > 2 ? p[2] : null]);
  }
  if (place.span) {
    const S = fp.span?.stairs?.[place.span];
    if (!S) return null;
    const out = [];
    for (const f of S.flights) {
      const L = f.steps * f.run;
      out.push([f.x, f.z, f.y0], [f.x + f.dir[0] * L, f.z + f.dir[1] * L, f.y1]);
    }
    return out;
  }
  if (place.pts) return place.pts.map((p) => [p[0], p[1], p.length > 2 ? p[2] : null]);
  if (place.route) { // a route the page holds: a path of names from the context to [[x, z, y?], ...]
    const pts = place.route.split('.').reduce((o, k) => (o == null ? o : o[k]), fp);
    return Array.isArray(pts) && pts.length > 1 ? pts.map((p) => [p[0], p[1], p.length > 2 ? p[2] : null]) : null;
  }
  return null;
}

// feet every metre along the route, found as a walker finds them: on the floor that holds feet a little over the last
// floor (or over the route's own y where it gives one), through placeAt (which also steps them out of colliders)
export function route(fp, place, step = 1) {
  const R = routePoints(fp, place);
  if (!R) return null;
  const C = fp.controls, out = [];
  let last = R[0][2] ?? null, s = 0, next = 0;
  for (let i = 0; i < R.length - 1; i++) {
    const [ax, az, ay] = R[i], [bx, bz, by] = R[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    if (ay !== null) last = ay;
    const n = Math.max(1, Math.ceil(L / 0.5));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const f = k / n, x = ax + (bx - ax) * f, z = az + (bz - az) * f;
      let hint = ay !== null && by !== null ? ay + (by - ay) * f : last;
      const r = hint === null ? C.placeAt(x, z) : C.placeAt(x, z, hint + 0.45);
      last = r.y;
      const d = s + L * f;
      if (d >= next - 1e-6) { out.push([r.x, r.y, r.z, d]); next += step; }
    }
    s += L;
  }
  return { pts: out, L: s };
}

function discStands(fp, place) {
  const C = fp.controls, out = [], st = place.step || 2;
  for (let x = -place.r; x <= place.r; x += st) for (let z = -place.r; z <= place.r; z += st) {
    if (x * x + z * z > place.r * place.r) continue;
    const r = C.placeAt(place.c[0] + x, place.c[1] + z);
    out.push([r.x, r.y, r.z, 0]);
  }
  return out;
}

// the place's stands and region, and the walker stood in its middle and held there (a carry). The caller then lets the
// page run (on Playwright's clock, so every run sees the same frames) before extract() takes the faces
export function stand(fp, place) {
  const p = fp.player;
  window.__geomHold?.(); window.__geomHold = null;
  let feet, L = 0;
  if (place.stands) feet = place.stands.map((s) => [s[0], s[1], s[2], 0, !!s[3]]);
  else if (place.c) feet = discStands(fp, place);
  else { const r = route(fp, place); if (!r) return { missing: true }; feet = r.pts; L = r.L; }
  if (!feet.length) return { missing: true };
  // the region: spheres along the route every 4 m (or the disc's), `half` round
  const spheres = [];
  if (place.region) spheres.push(...place.region);
  else if (place.c) { const y = feet.reduce((a, f) => a + f[1], 0) / feet.length; spheres.push([place.c[0], y, place.c[1], place.r + 4]); }
  else { for (let i = 0; i < feet.length; i += 4) spheres.push([feet[i][0], feet[i][1] + 1, feet[i][2], place.half]); const f = feet[feet.length - 1]; spheres.push([f[0], f[1] + 1, f[2], place.half]); }
  if (!place.stands) {
    const mid = feet[Math.floor(feet.length / 2)];
    fp.controls.placeAt(mid[0], mid[2], mid[1] + 0.1);
    const at = p.pos.clone();
    window.__geomHold = fp.controls.carry({ step(pos) { pos.copy(at); } });
  }
  window.__geomPrep = { name: place.name, feet, L, spheres };
  return { ok: true, stands: feet.length };
}

export async function extract(fp, place, opts = {}) {
  const THREE = fp.THREE, p = fp.player;
  const eye = p.eye ?? 1.6;
  if (window.__geomPrep?.name !== place.name) { const r = stand(fp, place); if (r.missing) return r; }
  const { feet, L, spheres } = window.__geomPrep;
  window.__geomHold?.(); window.__geomHold = null;
  fp.scene.updateMatrixWorld(true);
  const sealed = place.sealed ? [place.sealed[0], place.sealed[1] < 0 ? L + place.sealed[1] : place.sealed[1]] : null;
  const stands = feet.map((f) => ({ x: f[0], y: f[1] + eye, z: f[2], s: f[3], sealed: !!(f[4] || (sealed && f[3] >= sealed[0] && f[3] <= sealed[1])) }));
  window.__geomPrep = null;

  const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const nameOf = (o) => { const bits = []; for (let q = o; q && q !== fp.scene && bits.length < 3; q = q.parent) if (q.name) bits.unshift(q.name); return bits.join('/') || `(unnamed ${o.type} ${o.id})`; };
  const sphereHit = (x, y, z, r) => spheres.some(([sx, sy, sz, sr]) => (x - sx) ** 2 + (y - sy) ** 2 + (z - sz) ** 2 < (r + sr) ** 2);
  const boxHit = (x0, y0, z0, x1, y1, z1) => spheres.some(([sx, sy, sz, sr]) => {
    const dx = Math.max(x0 - sx, 0, sx - x1), dy = Math.max(y0 - sy, 0, sy - y1), dz = Math.max(z0 - sz, 0, sz - z1);
    return dx * dx + dy * dy + dz * dz < sr * sr;
  });
  const parts = [], Pout = [], partOut = [], Sout = [];
  let tris = 0, skipped = { batched: 0, skinned: 0 };
  const max = opts.maxTris ?? 2500000;
  const M = new THREE.Matrix4(), IM = new THREE.Matrix4(), S = new THREE.Sphere(), v = new THREE.Vector3();
  const meshes = [];
  fp.scene.traverse((o) => {
    if (o.isBatchedMesh) { if (shown(o)) skipped.batched++; return; }
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    if (o.isSkinnedMesh) { skipped.skinned++; return; }
    if (!shown(o)) return;
    meshes.push(o);
  });
  for (const o of meshes) {
    const g = o.geometry, pos = g.attributes.position, idx = g.index, col = g.attributes.color, nor = g.attributes.normal, uv = g.attributes.uv;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const groups = Array.isArray(o.material) && g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
    const n = o.isInstancedMesh ? o.count : 1;
    const name = nameOf(o);
    for (let inst = 0; inst < n; inst++) {
      M.copy(o.matrixWorld);
      if (o.isInstancedMesh) { o.getMatrixAt(inst, IM); M.multiply(IM); }
      S.copy(g.boundingSphere).applyMatrix4(M);
      if (!sphereHit(S.center.x, S.center.y, S.center.z, S.radius)) continue;
      const e = M.elements;
      for (const gr of groups) {
        const mat = mats[gr.materialIndex ?? 0];
        if (!mat || mat.visible === false || mat.colorWrite === false) continue;
        const pi = parts.length;
        let any = false;
        const end = Math.min(gr.start + gr.count, idx ? idx.count : pos.count);
        for (let k = gr.start; k + 2 < end + 0; k += 3) {
          const i0 = idx ? idx.getX(k) : k, i1 = idx ? idx.getX(k + 1) : k + 1, i2 = idx ? idx.getX(k + 2) : k + 2;
          const c = [];
          for (const i of [i0, i1, i2]) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            c.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
          }
          if (!boxHit(Math.min(c[0], c[3], c[6]), Math.min(c[1], c[4], c[7]), Math.min(c[2], c[5], c[8]), Math.max(c[0], c[3], c[6]), Math.max(c[1], c[4], c[7]), Math.max(c[2], c[5], c[8]))) continue;
          if (tris >= max) break;
          for (const q of c) Pout.push(q);
          // how it shades: the mean vertex colour (or -1), the mean vertex normal in world space, the mean uv (or 0):
          // two coplanar faces that shade the same are a fight nobody sees
          let r = -1, gg = -1, b = -1, nx = 0, ny = 0, nz = 0, u = 0, w = 0;
          if (col) { r = 0; gg = 0; b = 0; for (const i of [i0, i1, i2]) { r += col.getX(i) / 3; gg += col.getY(i) / 3; b += col.getZ(i) / 3; } }
          if (nor) for (const i of [i0, i1, i2]) { const x = nor.getX(i), y = nor.getY(i), z = nor.getZ(i); nx += e[0] * x + e[4] * y + e[8] * z; ny += e[1] * x + e[5] * y + e[9] * z; nz += e[2] * x + e[6] * y + e[10] * z; }
          const nl = Math.hypot(nx, ny, nz) || 1;
          if (uv && mat.map) for (const i of [i0, i1, i2]) { u += uv.getX(i) / 3; w += uv.getY(i) / 3; }
          Sout.push(r, gg, b, nx / nl, ny / nl, nz / nl, u, w);
          partOut.push(pi); tris++; any = true;
        }
        if (any) parts.push({
          name: name + (mats.length > 1 ? `#${gr.materialIndex}` : ''), mesh: o.name || '', inst: o.isInstancedMesh ? inst : -1,
          side: mat.side ?? 0, ghost: !!(mat.transparent && mat.depthWrite === false) || mat.depthTest === false,
          offset: !!mat.polygonOffset, matName: mat.name || mat.type, mat: mat.uuid, instanced: !!o.isInstancedMesh,
        });
      }
    }
  }
  return {
    P: b64(new Float32Array(Pout)), part: b64(new Uint32Array(partOut)), S: b64(new Float32Array(Sout)), parts, spheres, stands, L, tris, truncated: tris >= max, skipped,
    meshes: meshes.length,
  };
}
