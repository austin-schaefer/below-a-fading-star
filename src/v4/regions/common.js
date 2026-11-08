// Shared pieces for the region modules (v4 regions): ground sampling on the rendered terrain, rounded stone
// geometry, instanced meshes from plain lists, a stone material with grain and lichen, the region's air motes, and
// the stats each module registers on ctx.regions.stats. Not a world module (main.js loads only REGION_FILES).
import * as THREE from 'three';
import { smoothstep } from '../../noise.js';

// Height and normal on the terrain's rendered triangles (as vegetation/ground.js), so small things sit on the
// ground the GPU draws rather than the analytic heightfield between its vertices.
export function groundOf(terrain) {
  const geo = terrain.mesh.geometry, prm = geo.parameters;
  const segs = prm.widthSegments, size = prm.width, step = size / segs, half = size / 2, row = segs + 1;
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  function heightAt(x, z) {
    const gx = cl((x + half) / step, 0, segs - 1e-4), gz = cl((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
    if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
    return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
  }
  function normalAt(x, z, out) {
    const gx = cl((x + half) / step, 0, segs - 1e-4), gz = cl((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const i00 = (iz * row + ix) * 3, i10 = i00 + 3, i01 = i00 + row * 3, i11 = i01 + 3;
    const w00 = (1 - fx) * (1 - fz), w10 = fx * (1 - fz), w01 = (1 - fx) * fz, w11 = fx * fz;
    const nx = N[i00] * w00 + N[i10] * w10 + N[i01] * w01 + N[i11] * w11;
    const ny = N[i00 + 1] * w00 + N[i10 + 1] * w10 + N[i01 + 1] * w01 + N[i11 + 1] * w11;
    const nz = N[i00 + 2] * w00 + N[i10 + 2] * w10 + N[i01 + 2] * w01 + N[i11 + 2] * w11;
    const l = Math.hypot(nx, ny, nz) || 1;
    out.x = nx / l; out.y = ny / l; out.z = nz / l;
    return out;
  }
  return { heightAt, normalAt, step, segs, half, row, P, N };
}

// A rounded, worn stone: an icosphere pushed about by low noise and squashed. round 0..1: 1 is water-worn, 0 broken.
export function stoneGeo(rng, noise, detail, { sx = 1, sy = 0.7, sz = 1, round = 0.5, flatBase = true, seed = 1 } = {}) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  const ox = seed * 13.7 + rng() * 50, oz = seed * 7.3 + rng() * 50;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n1 = noise.fbm2(v.x * 1.2 + ox, v.z * 1.2 + v.y * 0.9 + oz, 3);
    const n2 = noise.noise2(v.x * 3.7 + ox, v.y * 3.7 + v.z * 3 + oz);
    v.multiplyScalar(1 + n1 * (0.34 - 0.2 * round) + n2 * 0.09 * (1 - round));
    v.x *= sx; v.y *= sy; v.z *= sz;
    if (flatBase && v.y < -0.3 * sy) v.y = -0.3 * sy + (v.y + 0.3 * sy) * 0.25;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  if (round > 0.5) return weld(geo);
  geo.computeVertexNormals();
  return geo;
}

// Weld an indexless geometry by position so its normals smooth (rounded stones, cushions, bodies).
export function weld(geo, tol = 1e-4) {
  const pos = geo.attributes.position, map = new Map(), idx = [], P = [];
  const k = (x) => Math.round(x / tol);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), key = `${k(x)},${k(y)},${k(z)}`;
    let j = map.get(key);
    if (j === undefined) { j = P.length / 3; map.set(key, j); P.push(x, y, z); }
    idx.push(j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Merge plain geometries (position, normal, optional color) into one.
export function merge(list) {
  let n = 0, ni = 0;
  for (const g of list) { n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), I = new Uint32Array(ni);
  let o = 0, oi = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.color) C.set(g.attributes.color.array, o * 3); else C.fill(1, o * 3, (o + c) * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) I[oi + i] = g.index.array[i] + o;
    else for (let i = 0; i < c; i++) I[oi + i] = i + o;
    oi += g.index ? g.index.count : c; o += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  m.setAttribute('color', new THREE.BufferAttribute(C, 3));
  m.setIndex(new THREE.BufferAttribute(I, 1));
  return m;
}
export function paint(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}

// An InstancedMesh from a list of { x, y, z, s | sx sy sz, rx, ry, rz, c: THREE.Color? }.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
export function compose(it, m = _m) {
  _e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'); _q.setFromEuler(_e);
  _p.set(it.x, it.y, it.z); _s.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
  return m.compose(_p, _q, _s);
}
export function instanced(geo, mat, items, { name, shadow = false, receive = true, colors = false } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  mesh.count = items.length;
  items.forEach((it, i) => { mesh.setMatrixAt(i, compose(it)); if (colors) mesh.setColorAt(i, it.c || new THREE.Color(1, 1, 1)); });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadow; mesh.receiveShadow = receive;
  mesh.name = name || 'region-instanced';
  mesh.computeBoundingSphere?.();
  return mesh;
}

// Stone: grain, a little strata, and lichen. lichen: [{ color: [r,g,b], scale, cover (0..1), up (0..1 bias to upper
// faces), rim (0..1 a darker edge round each patch: map lichen's continents) }]
export function stoneMaterial({ color = '#6a6a66', rough = 0.9, lichen = [], grain = 1, strata = 0.15, warm = null } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: 0 });
  // the shader text differs by these options, so each set compiles its own program (three keys programs by the
  // onBeforeCompile source, which is the same function for every stone material)
  const key = 'fp-stone:' + JSON.stringify({ lichen, grain, strata, warm });
  mat.customProgramCacheKey = () => key;
  const lic = lichen.map((l, i) => `
    {
      float n = rfbm(vRPos * ${l.scale.toFixed(3)} + ${(11 + i * 17).toFixed(1)});
      float edge = ${(1 - l.cover).toFixed(3)};
      float m = smoothstep(edge, edge + 0.03, n) * (${(1 - l.up).toFixed(3)} + ${l.up.toFixed(3)} * clamp(vRN.y * 0.5 + 0.6, 0.0, 1.0));
      float rim = ${(l.rim || 0).toFixed(3)} * (smoothstep(edge - 0.015, edge + 0.01, n) - smoothstep(edge + 0.01, edge + 0.035, n));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${l.color.map((v) => v.toFixed(3)).join(', ')}) * (0.85 + 0.3 * g2), m * 0.9);
      diffuseColor.rgb *= 1.0 - rim * 0.55;
    }`).join('');
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRPos; varying vec3 vRN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vRPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz; vRN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        #else
          vRPos = (modelMatrix * vec4(position, 1.0)).xyz; vRN = normalize(mat3(modelMatrix) * normal);
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vRPos; varying vec3 vRN;
        float rhash(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }
        float rnoise(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(rhash(i), rhash(i + vec3(1,0,0)), f.x), mix(rhash(i + vec3(0,1,0)), rhash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(rhash(i + vec3(0,0,1)), rhash(i + vec3(1,0,1)), f.x), mix(rhash(i + vec3(0,1,1)), rhash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float rfbm(vec3 p) { return rnoise(p) * 0.5 + rnoise(p * 2.1 + 3.0) * 0.3 + rnoise(p * 4.3 + 7.0) * 0.2; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float g = rfbm(vRPos * 1.7), g2 = rfbm(vRPos * 7.0);
          diffuseColor.rgb *= 1.0 + ${grain.toFixed(3)} * (-0.22 + 0.45 * g + 0.12 * (g2 - 0.5));
          float strata = smoothstep(0.42, 0.5, abs(fract(vRPos.y * 0.9 + g * 1.5) - 0.5));
          diffuseColor.rgb *= 1.0 - strata * ${strata.toFixed(3)};
          ${warm ? `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${warm.map((v) => v.toFixed(3)).join(', ')}), smoothstep(0.55, 0.8, rfbm(vRPos * 0.6 + 5.0)) * 0.35);` : ''}
          ${lic}
          diffuseColor.rgb *= 1.0 - smoothstep(0.1, -0.25, vRN.y) * 0.3;
        }`);
  };
  return mat;
}
export const rgb = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

// The region's air: a few hundred slow motes in a box round the camera, shown where the region's weight is
// (pollen, salt, wasps' haze, the cold breath). drift: [vx, vy, vz] m/s; one draw call.
export function airMotes(ctx, key, { count = 300, color = '#ffffff', size = 0.05, box = 26, drift = [0.3, 0, 0], sway = 0.4, opacity = 0.55, low = 0.2, high = 6 } = {}) {
  const { THREE: T, camera, regions } = ctx;
  const rng = ctx.makeRng(7700 + key.length * 31 + key.charCodeAt(0));
  const n = ctx.quality === 'low' ? count >> 1 : count;
  const base = new Float32Array(n * 4), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { base[i * 4] = rng() * box; base[i * 4 + 1] = low + rng() * (high - low); base[i * 4 + 2] = rng() * box; base[i * 4 + 3] = rng() * 6.283; }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
  const mat = new T.PointsMaterial({ color: new T.Color(color), size, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: true, map: dotTexture(T) });
  const pts = new T.Points(geo, mat);
  pts.frustumCulled = false; pts.name = `region-${key}-air`;
  ctx.scene.add(pts);
  const w = {};
  ctx.registerUpdate((dt, t) => {
    const cp = camera.position;
    regions.regionAt(cp.x, cp.z, w, 2);
    const k = w[key] || 0;
    pts.visible = k > 0.02;
    if (!pts.visible) return;
    mat.opacity = opacity * k;
    const gy = ctx.terrain.heightAt(cp.x, cp.z);
    for (let i = 0; i < n; i++) {
      const b = i * 4, ph = base[b + 3];
      let x = base[b] + drift[0] * t + Math.sin(t * 0.7 + ph) * sway, z = base[b + 2] + drift[2] * t + Math.cos(t * 0.53 + ph * 1.3) * sway;
      x = ((x - cp.x + box * 0.5) % box + box) % box + cp.x - box * 0.5;
      z = ((z - cp.z + box * 0.5) % box + box) % box + cp.z - box * 0.5;
      pos[i * 3] = x; pos[i * 3 + 1] = gy + base[b + 1] + drift[1] * Math.sin(t * 0.3 + ph) + Math.sin(t * 1.1 + ph * 2) * sway * 0.3; pos[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

// a soft round dot for the motes (shared)
let _dot = null;
function dotTexture(T) {
  if (_dot) return _dot;
  const n = 32, d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const r = Math.hypot(i + 0.5 - n / 2, j + 0.5 - n / 2) / (n / 2), a = Math.max(0, 1 - r) ** 1.6;
    const k = (j * n + i) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = Math.round(a * 255);
  }
  _dot = new T.DataTexture(d, n, n); _dot.needsUpdate = true; _dot.magFilter = T.LinearFilter; _dot.minFilter = T.LinearFilter;
  return _dot;
}

// Triangles and draw calls of a module's meshes (instances included; shadow casters count a second call).
export function meshStats(meshes) {
  let calls = 0, tris = 0, instances = 0;
  for (const m of meshes) {
    if (!m) continue;
    const g = m.geometry, per = (g.index ? g.index.count : g.attributes.position.count) / 3;
    const n = m.isInstancedMesh ? m.count : 1;
    calls += 1 + (m.castShadow ? 1 : 0);
    tris += m.isPoints ? 0 : per * n;
    if (m.isInstancedMesh) instances += n;
  }
  return { calls, tris: Math.round(tris), instances };
}

// The vegetation module's trees, once it has built them (modules build in parallel); null if it is not loaded.
export async function vegetationTrees(timeoutMs = 120000) {
  const q = new URL(location.href).searchParams, only = q.get('only'), skip = (q.get('skip') || '').split(',');
  if ((only && !only.split(',').includes('vegetation')) || skip.includes('vegetation')) return null;
  const t0 = performance.now();
  while (!window.__vegParts?.trees && performance.now() - t0 < timeoutMs) await new Promise((r) => setTimeout(r, 40));
  return window.__vegParts?.trees?.trees || null;
}

export { smoothstep };
