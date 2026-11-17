// The floor's pools (v16 L4, src/height/floor.js POOLS): still water standing in the kettles and behind the old strand,
// seen from the heights as glints that say which way the ground falls. One mesh for all of them, a disc a pool, in the
// tarn's own material (the same program and uniforms: no new shader, one draw call while any is in view). Vertices are
// in world space at each pool's level; `depth` (level minus ground, -0.5 where the edge says dry) is the shore's fade,
// as the tarn's. None under ?floor=v15.
import * as THREE from 'three';
import { POOLS } from '../height/floor.js';
import { HEIGHT_PARAMS } from '../height/params.js';

export function buildPools(ctx, material, low) {
  const pools = HEIGHT_PARAMS.floor === 'v15' ? [] : POOLS.filter((p) => p.y !== null);
  if (!pools.length || !material) return null;
  const rings = low ? 14 : 22, segs = low ? 40 : 64;
  const per = 1 + rings * segs, pos = new Float32Array(per * pools.length * 3), depth = new Float32Array(per * pools.length), idx = [];
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  pools.forEach((p, n) => {
    const R = p.rMax + 1.5, base = n * per;
    const put = (i, x, z) => {
      const k = base + i;
      pos[k * 3] = x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = z;
      depth[k] = p.sd(x, z) < 0 ? p.y - ctx.terrain.heightAt(x, z) : Math.min(-0.5, p.y - ctx.terrain.heightAt(x, z));
    };
    put(0, p.x, p.z);
    for (let r = 1; r <= rings; r++) for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2, rad = R * (r / rings);
      put(1 + (r - 1) * segs + s, p.x + Math.cos(a) * rad, p.z + Math.sin(a) * rad);
    }
    const at = (r, s) => base + (r === 0 ? 0 : 1 + (r - 1) * segs + (s % segs));
    for (let s = 0; s < segs; s++) idx.push(at(0, 0), at(1, s + 1), at(1, s));
    for (let r = 1; r < rings; r++) for (let s = 0; s < segs; s++) idx.push(at(r, s), at(r, s + 1), at(r + 1, s), at(r, s + 1), at(r + 1, s + 1), at(r + 1, s));
    x0 = Math.min(x0, p.x - R); x1 = Math.max(x1, p.x + R); z0 = Math.min(z0, p.z - R); z1 = Math.max(z1, p.z + R);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
  g.setIndex(idx);
  const cy = pools.reduce((a, p) => a + p.y, 0) / pools.length;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, cy, (z0 + z1) / 2), Math.hypot(x1 - x0, z1 - z0) / 2 + 4);
  const mesh = new THREE.Mesh(g, material);
  mesh.name = 'water-pools';
  mesh.renderOrder = 10;
  ctx.scene.add(mesh);
  return { mesh, pools: pools.map((p) => ({ name: p.name, x: p.x, z: p.z, y: p.y, r: p.rMax })) };
}
