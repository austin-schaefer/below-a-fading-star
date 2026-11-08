// Merge geometries into one non-indexed BufferGeometry: positions and normals (and any other attribute every
// part carries). The prototype vendors no BufferGeometryUtils.
import * as THREE from 'three';

export function mergeGeometries(geos) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(parts[0].attributes).filter((n) => parts.every((g) => g.attributes[n]));
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = parts[0].attributes[n].itemSize;
    const arr = new Float32Array(parts.reduce((s, g) => s + g.attributes[n].count * size, 0));
    let o = 0;
    for (const g of parts) { const a = g.attributes[n]; for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) arr[o++] = a.array[i * size + c]; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
