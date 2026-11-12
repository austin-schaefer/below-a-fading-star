// v8-07 thread 6, salt for news: the props, one merged mesh. At the spill (on the Salt-Pedlars' road between the
// Saltings and the house): a sack split along its seam, lying on its side, a fan of white salt run out of it across the
// track and grains scattered; a few metres off in the grass the Twk-men's own little heap of what they have carried.
// At the house, outside the gate: a neat cone of the same salt on a square of tile, which a rider guards.
import * as THREE from 'three';
import { Mesher } from '../../fauna/geo.js';

const SALT = new THREE.Color('#eeeae2'), SALT2 = new THREE.Color('#d8d2c6'), SACK = new THREE.Color('#b89a68'), SACK2 = new THREE.Color('#8a6e44'), TILE = new THREE.Color('#2f8a86'), TILE2 = new THREE.Color('#b4402c');

function push(out, g, m, colour) {
  const G = g.index ? g.toNonIndexed() : g;
  G.applyMatrix4(m);
  if (!G.attributes.normal) G.computeVertexNormals();
  const P = G.attributes.position, N = G.attributes.normal;
  for (let i = 0; i < P.count; i++) {
    out.p.push(P.getX(i), P.getY(i), P.getZ(i)); out.n.push(N.getX(i), N.getY(i), N.getZ(i));
    const c = typeof colour === 'function' ? colour(P.getX(i), P.getY(i), P.getZ(i)) : colour;
    out.c.push(c.r, c.g, c.b);
  }
}
const mat = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));

// a low mound of salt: a disc lofted from rim to crown, its rim wandering
function mound(rng, r, h, n = 14) {
  const g = new THREE.CircleGeometry(1, n, 0, Math.PI * 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), d = Math.hypot(x, y), a = Math.atan2(y, x);
    const wob = 1 + 0.18 * Math.sin(a * 3 + rng() * 0.3) + 0.1 * Math.sin(a * 7);
    p.setXYZ(i, x * r * wob, h * Math.pow(Math.max(0, 1 - d), 1.4), -y * r * wob);
  }
  g.computeVertexNormals();
  return g;
}

export function buildSalt(ctx, { spill, cache, pile }) {
  const { terrain } = ctx, rng = ctx.makeRng(80741), low = ctx.quality === 'low';
  const out = { p: [], n: [], c: [] };
  const gy = (x, z) => terrain.heightAt(x, z);
  const vary = (c, k = 0.06) => c.clone().multiplyScalar(1 - k + rng() * 2 * k);
  if (spill) {
    const { x, z, yaw } = spill, y = gy(x, z);
    // the sack: a fat lumpy bolster on its side, its mouth tied, the seam split along the top toward the track
    const M = new Mesher();
    M.loft([[0, 0.17, -0.34], [0, 0.2, -0.18], [0, 0.19, 0.05], [0, 0.15, 0.22], [0, 0.11, 0.3]], [[0.2, 0.18], [0.25, 0.2], [0.24, 0.19], [0.2, 0.15], [0.07, 0.06]], low ? 7 : 10);
    M.loft([[0, 0.11, 0.3], [0, 0.13, 0.38], [0.02, 0.17, 0.43]], [0.05, 0.08, 0.04], 6); // the tied neck and its ears
    const sack = M.geometry();
    push(out, sack, mat(x, y, z, 0, yaw, 0.12, 1.45), (px, py, pz) => (Math.abs(Math.sin((px + pz) * 9)) > 0.93 || py > y + 0.42 ? SACK2 : SACK)); // a big sack, patched
    // the split: a pale tongue of salt where the seam has burst
    push(out, mound(rng, 0.26, 0.07, 10), mat(x + Math.sin(yaw + 1.57) * 0.3, y + 0.33, z + Math.cos(yaw + 1.57) * 0.3, 0.5, yaw, 0), SALT);
    // the fan of salt run out across the way, and a second thinner lobe
    const fx = x + Math.sin(yaw + 1.57) * 0.95, fz = z + Math.cos(yaw + 1.57) * 0.95;
    push(out, mound(rng, 0.7, 0.07, low ? 14 : 22), mat(fx, gy(fx, fz) + 0.01, fz, 0, yaw + 0.3, 0), SALT);
    push(out, mound(rng, 0.42, 0.04, 12), mat(fx + Math.sin(yaw + 2.2) * 0.75, gy(fx, fz) + 0.005, fz + Math.cos(yaw + 2.2) * 0.75, 0, yaw - 0.4, 0), SALT2);
    // grains scattered farther, and a trail of them toward the Twk-men's heap
    const grain = new THREE.IcosahedronGeometry(0.018, 0);
    const n = low ? 22 : 40;
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.28, d = 0.6 + Math.pow(rng(), 0.7) * 1.4, gx = fx + Math.cos(a) * d, gz = fz + Math.sin(a) * d;
      push(out, grain, mat(gx, gy(gx, gz) + 0.01, gz, rng() * 3, rng() * 3, 0, 0.7 + rng() * 0.8), vary(SALT));
    }
    if (cache) {
      const m = low ? 10 : 18;
      for (let i = 0; i < m; i++) {
        const t = (i + rng() * 0.6) / m, gx = fx + (cache.x - fx) * t + (rng() - 0.5) * 0.3, gz = fz + (cache.z - fz) * t + (rng() - 0.5) * 0.3;
        push(out, grain, mat(gx, gy(gx, gz) + 0.01, gz, rng() * 3, rng() * 3, 0, 0.6 + rng() * 0.5), vary(SALT));
      }
      push(out, mound(rng, 0.2, 0.09, 10), mat(cache.x, gy(cache.x, cache.z) + 0.01, cache.z, 0, rng() * 6, 0), SALT);
    }
  }
  if (pile) {
    // a neat cone on a square of patched tile, turquoise and pomegranate-red, the cone's top pinched to a point
    const { x, z } = pile, y = Math.max(gy(x, z), gy(x + 0.4, z), gy(x - 0.4, z), gy(x, z + 0.4), gy(x, z - 0.4));
    for (let i = 0; i < 4; i++) {
      const a = (i % 2) * 0.36 - 0.18, b = (i >> 1) * 0.36 - 0.18;
      push(out, new THREE.BoxGeometry(0.34, 0.04, 0.34), mat(x + a, y + 0.02, z + b, 0, 0.35, 0), i === 1 || i === 2 ? TILE2 : TILE);
    }
    push(out, new THREE.ConeGeometry(0.3, 0.42, low ? 10 : 16, 2), mat(x, y + 0.04 + 0.21, z, 0, 0.35, 0), (px, py) => (py < y + 0.12 ? SALT2 : SALT));
    pile.top = y + 0.04 + 0.42;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(out.c, 3));
  g.computeBoundingSphere();
  // salt holds a little of the light: it reads white at dusk against the turf
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, emissive: '#3a3832', emissiveIntensity: 0.6 });
  const mesh = new THREE.Mesh(g, m);
  mesh.name = 'twk-salt'; mesh.receiveShadow = true; mesh.castShadow = false;
  return { mesh, tris: out.p.length / 9 };
}
