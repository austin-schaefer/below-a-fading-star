// Shared pieces for the Strandline, the Adust, the Lynchets and the Demesne (v4 regions): a fine ground skin, height
// on the rendered terrain, instanced meshes from plain lists, and the stats each module registers. Not a world
// module (main.js loads only REGION_FILES).
//
// The skin: the terrain mesh is a 2-3 m grid, too coarse for a ha-ha's drop, a shingle berm or crazed clay. A region
// with relief or a surface finer than that draws its own patch of ground over the terrain: a grid at its own step,
// heights from the exact heightAt(), in the terrain's own material (so the grain, bump, wet band, shadows and fog
// match), plus the region's colour and an optional fragment of its own (pebbles, cracks). Its height hook returns
// the lower envelope during the terrain's coarse pass (regions.js, setRegionsCoarse), so the terrain never pokes
// through; polygon offset keeps the two from fighting where they coincide.
import * as THREE from 'three';

// Height and normal on the rendered terrain's triangles (as vegetation/ground.js), for things outside a skin.
export function meshGround(terrain) {
  const geo = terrain.mesh.geometry, prm = geo.parameters;
  const segs = prm.widthSegments, size = prm.width, step = size / segs, half = size / 2, row = segs + 1;
  const P = geo.attributes.position.array;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  return function heightAt(x, z) {
    const gx = cl((x + half) / step, 0, segs - 1e-4), gz = cl((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
    if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
    return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
  };
}

// opts: { name, box: [x0, x1, z0, z1], step, keep(x, z) -> bool (a quad is drawn when its four corners keep),
//   color(x, z, y, col) (sets the THREE.Color), attr(x, z, y) -> [a, b, c, d] (a vec4 the fragment reads as vSkin),
//   wet(x, z, y) -> 0..1 (the terrain's wet band), lift (m), frag: GLSL run after the vertex colour (diffuseColor,
//   vSkin, vTPos, vTNormal in scope), rough: GLSL after the roughness, normal: GLSL after the terrain's normal
//   (view-space `normal` in scope), post: GLSL just before lighting (the last word on diffuseColor and
//   roughnessFactor, after the terrain's own grain), decl: GLSL declarations, uniforms: { name: { value } } }
export function buildSkin(ctx, o) {
  const { terrain } = ctx;
  const [x0, x1, z0, z1] = o.box, st = o.step;
  const nx = Math.ceil((x1 - x0) / st) + 1, nz = Math.ceil((z1 - z0) / st) + 1;
  const keep = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) keep[j * nx + i] = o.keep(x0 + i * st, z0 + j * st) ? 1 : 0;
  // only the vertices some kept quad uses
  const map = new Int32Array(nx * nz).fill(-1), idx = [];
  let n = 0;
  const use = (k) => (map[k] < 0 ? (map[k] = n++) : map[k]);
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    if (!(keep[a] && keep[b] && keep[c] && keep[d])) continue;
    const A = use(a), B = use(b), C = use(c), D = use(d);
    idx.push(A, C, B, B, C, D);
  }
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), skin = new Float32Array(n * 4), wet = new Float32Array(n), ice = new Float32Array(n);
  const c = new THREE.Color(), lift = o.lift ?? 0.02;
  for (let k = 0; k < nx * nz; k++) {
    const v = map[k]; if (v < 0) continue;
    const x = x0 + (k % nx) * st, z = z0 + Math.floor(k / nx) * st, y = terrain.heightAt(x, z);
    pos[v * 3] = x; pos[v * 3 + 1] = y + lift; pos[v * 3 + 2] = z;
    c.setRGB(0.3, 0.3, 0.3); o.color(x, z, y, c);
    col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
    if (o.attr) { const a = o.attr(x, z, y); skin[v * 4] = a[0]; skin[v * 4 + 1] = a[1]; skin[v * 4 + 2] = a[2]; skin[v * 4 + 3] = a[3]; }
    if (o.wet) wet[v] = o.wet(x, z, y);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSkin', new THREE.BufferAttribute(skin, 4));
  geo.setAttribute('aWet', new THREE.BufferAttribute(wet, 1));
  geo.setAttribute('aIce', new THREE.BufferAttribute(ice, 1));
  geo.setAttribute('aGlac', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); // the glacier's coords, if the terrain reads them
  geo.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const base = terrain.mesh.material;
  const mat = base.clone();
  mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -4;
  const name = o.name;
  mat.onBeforeCompile = (sh, r) => {
    Object.assign(sh.uniforms, o.uniforms || {});
    const kept = base.userData.shader;
    base.onBeforeCompile(sh, r);
    base.userData.shader = kept; // the terrain's own uniforms stay the console's handle
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSkin; varying vec4 vSkin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkin = aSkin;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec4 vSkin;\n${o.decl || ''}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${o.frag || ''}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${o.rough || ''}`)
      .replace('#include <normal_fragment_maps>', `${o.normal || ''}\n#include <normal_fragment_maps>`)
      .replace('#include <lights_physical_fragment>', `${o.post || ''}\n#include <lights_physical_fragment>`);
  };
  mat.customProgramCacheKey = () => 'region-skin-' + name;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'skin-' + name;
  mesh.receiveShadow = true; mesh.castShadow = false;
  ctx.scene.add(mesh);
  return mesh;
}

// An instanced mesh from a list of { x, y, z, ry, s (or sx, sy, sz), rx, rz } and optional colours.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function instanced(ctx, geo, mat, list, { name, shadow = false, color = null } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  list.forEach((it, i) => {
    _e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'); _q.setFromEuler(_e);
    _s.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
    _p.set(it.x, it.y, it.z);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    if (color) mesh.setColorAt(i, color(it, i));
  });
  mesh.count = list.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  mesh.name = name;
  mesh.computeBoundingSphere();
  ctx.scene.add(mesh);
  return mesh;
}

// Draw calls and triangles a region's meshes cost when all are in view (an instanced mesh is one call), and the
// instance count; for ctx.regions.stats[key].
export function meshStats(meshes) {
  let calls = 0, tris = 0, instances = 0;
  for (const m of meshes) {
    if (!m || !m.geometry) continue;
    const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3;
    const n = m.isInstancedMesh ? m.count : 1;
    calls += m.isPoints ? 1 : 1; tris += m.isPoints ? 0 : t * n; instances += m.isInstancedMesh ? n : 0;
  }
  return { calls, tris: Math.round(tris), instances };
}

// Bend a material's vertices east (+x) by height, as a plant leans from the heat (the Adust) or the wind.
// In an instanced mesh with a yaw and a uniform scale, east in the instance's own frame is transpose(R) * +x.
export function leanShader(mat, amount) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        vec3 eastL = vec3(1.0, 0.0, 0.0);
        #ifdef USE_INSTANCING
          eastL = normalize(transpose(mat3(instanceMatrix)) * eastL);
        #endif
        float hy = max(transformed.y, 0.0);
        transformed.xz += eastL.xz * hy * hy * ${amount.toFixed(3)};
      }`);
  };
  return mat;
}
