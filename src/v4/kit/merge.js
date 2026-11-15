// Merge geometries into one non-indexed BufferGeometry: positions and normals (and any other attribute every
// part carries). The prototype vendors no BufferGeometryUtils.
// An indexed part is read through its index straight into the merged array, as toNonIndexed() would have unrolled it
// (every entry of the index array, an interleaved attribute by its stride and offset), without the copy between
// (v13-L5: the same arrays, value for value).
import * as THREE from 'three';

export function mergeGeometries(geos) {
  const names = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n]));
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const size = geos[0].attributes[n].itemSize;
    const arr = new Float32Array(geos.reduce((s, g) => s + (g.index ? g.index.array.length : g.attributes[n].count) * size, 0));
    let o = 0;
    for (const g of geos) {
      let a = g.attributes[n], src = a.array, index = g.index;
      if (index && a.itemSize !== size) { a = g.toNonIndexed().attributes[n]; src = a.array; index = null; } // a part whose item size differs from the first's: unrolled, then read at the first's item size
      if (index) {
        const ix = index.array, il = a.isInterleavedBufferAttribute;
        const stride = il ? a.data.stride : size, off = il ? a.offset : 0;
        for (let t = 0; t < ix.length; t++) { let k = ix[t] * stride + off; for (let c = 0; c < size; c++) arr[o++] = src[k++]; }
      } else for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) arr[o++] = src[i * size + c];
    }
    out.setAttribute(n, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
