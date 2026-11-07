// A tileable fbm value-noise DataTexture (single channel in R) for the mist wisps.
import * as THREE from 'three';

export function makeMistTexture(rng, size = 128) {
  const lat = (p) => { const a = new Float32Array(p * p); for (let i = 0; i < a.length; i++) a[i] = rng(); return a; };
  const octs = [[8, lat(8), 0.5], [16, lat(16), 0.28], [32, lat(32), 0.15], [64, lat(64), 0.07]];
  const sample = (a, p, u, v) => {
    const x = u * p, y = v * p, xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    const A = a[y0 * p + x0], B = a[y0 * p + x1], Cc = a[y1 * p + x0], D = a[y1 * p + x1];
    return A + (B - A) * fx + (Cc - A) * fy + (A - B - Cc + D) * fx * fy;
  };
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const [p, a, w] of octs) v += sample(a, p, x / size, y / size) * w;
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.round(v * 255)); data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.colorSpace = THREE.NoColorSpace; tex.needsUpdate = true;
  return tex;
}
