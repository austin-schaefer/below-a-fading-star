// Procedural, tileable water textures. One RGBA DataTexture:
//   R,G: slope (dh/du, dh/dv) of a sum of integer-frequency waves (perfectly tileable, ocean-ish)
//   B:   the wave height itself
//   A:   a tileable value-noise fbm used as a mask (scum, duckweed, sheen)
import * as THREE from 'three';

function tileValueNoise(rng, period) {
  const lat = new Float32Array(period * period);
  for (let i = 0; i < lat.length; i++) lat[i] = rng();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const a = lat[y0 * period + x0], b = lat[y0 * period + x1], c = lat[y1 * period + x0], d = lat[y1 * period + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

export function makeWaterTexture(rng, size = 256) {
  // waves: integer wave vectors so the tile wraps exactly
  const waves = [];
  for (let i = 0; i < 48; i++) {
    const mag = 2 + Math.pow(rng(), 1.6) * 22;
    const ang = rng() * Math.PI * 2;
    const kx = Math.round(Math.cos(ang) * mag), ky = Math.round(Math.sin(ang) * mag);
    if (kx === 0 && ky === 0) continue;
    const k = Math.hypot(kx, ky);
    waves.push({ kx, ky, a: 1 / Math.pow(k, 1.5), ph: rng() * Math.PI * 2 });
  }
  const n = size * size;
  const gx = new Float32Array(n), gy = new Float32Array(n), hh = new Float32Array(n);
  let gmax = 1e-6, hmax = 1e-6;
  const TAU = Math.PI * 2;
  // A wave's phase at a pixel depends only on the integer m = kx * x + ky * y: u = x / size is exact for a power-of-two
  // size, so kx * u + ky * v is exactly m / size and the argument below is the same double for every pixel with the
  // same m. Each wave's sines and cosines are taken once per m (a table over its range of m), not once per pixel:
  // the same values bit for bit, about a tenth of the calls (v13-L5).
  const exact = (size & (size - 1)) === 0;
  for (const w of waves) {
    const lo = (Math.min(0, w.kx) + Math.min(0, w.ky)) * (size - 1), hi = (Math.max(0, w.kx) + Math.max(0, w.ky)) * (size - 1);
    if (!exact) continue;
    w.lo = lo; w.sin = new Float64Array(hi - lo + 1); w.cos = new Float64Array(hi - lo + 1);
    for (let m = lo; m <= hi; m++) { const arg = TAU * (m / size) + w.ph; w.sin[m - lo] = Math.sin(arg); w.cos[m - lo] = Math.cos(arg); }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let h = 0, sx = 0, sy = 0;
    for (const w of waves) {
      let s, c;
      if (exact) { const m = w.kx * x + w.ky * y - w.lo; s = w.sin[m]; c = w.cos[m]; }
      else { const arg = TAU * (w.kx * u + w.ky * v) + w.ph; s = Math.sin(arg); c = Math.cos(arg); }
      // a slightly peaked wave (sharper crests) reads more like water than pure sines
      h += w.a * s;
      sx += w.a * c * TAU * w.kx; sy += w.a * c * TAU * w.ky;
    }
    const i = y * size + x;
    gx[i] = sx; gy[i] = sy; hh[i] = h;
    gmax = Math.max(gmax, Math.abs(sx), Math.abs(sy)); hmax = Math.max(hmax, Math.abs(h));
  }
  const vn = tileValueNoise(rng, 16), vn2 = tileValueNoise(rng, 32), vn3 = tileValueNoise(rng, 64);
  const data = new Uint8Array(n * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const u = x / size, v = y / size;
    const m = vn(u * 16, v * 16) * 0.55 + vn2(u * 32, v * 32) * 0.3 + vn3(u * 64, v * 64) * 0.15;
    data[i * 4] = Math.round((gx[i] / gmax * 0.5 + 0.5) * 255);
    data[i * 4 + 1] = Math.round((gy[i] / gmax * 0.5 + 0.5) * 255);
    data[i * 4 + 2] = Math.round((hh[i] / hmax * 0.5 + 0.5) * 255);
    data[i * 4 + 3] = Math.round(m * 255);
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}
