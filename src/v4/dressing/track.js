// DC The Discontinued Track [Proposed] (plans/wilderness-v5.md): "a line of bare footprints crossing the Saltings' crust from
// the reed margin toward the middle, firm and evenly spaced, that stops. No turn, no stumble, nothing beyond." From (170, 150)
// east to (215, 160), a 2 m strip. Left and right, one stride apart, each a slight hollow with a darker floor; where the
// line crosses the causeway the slabs have no prints on them, and the line goes on in the same step on the far side.
//
// Two instanced quads (left feet, right feet) laid on the rendered terrain's triangles, the crust's own surface, each
// carrying a baked normal map of the hollow so the low sun lights its bank and shades its floor. No shadows.
import * as THREE from 'three';
import { CAUSEWAY_V4 } from '../../world.js';
import { groundOf } from '../regions/common.js';

export const TRACK = { from: [170, 150], to: [215, 160], stride: 0.78, half: 0.17, clear: 4.6 };

// a foot's silhouette on a 64 x 128 grid (toes up): heel, arch, ball and five toes; left foot (the right is its mirror)
function footMask(W, H) {
  const m = new Float32Array(W * H);
  const blob = (cx, cy, rx, ry) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d < 1) m[y * W + x] = Math.max(m[y * W + x], 1 - d * d * 0.25); } };
  blob(32, 100, 13, 15);   // heel
  blob(31, 78, 11, 14);    // arch (narrow)
  blob(33, 50, 17, 18);    // ball
  blob(24, 22, 6.5, 8.5);  // big toe
  blob(36, 20, 4.2, 6); blob(44, 25, 3.8, 5.5); blob(50, 33, 3.4, 5); blob(54, 42, 3, 4.5); // the rest
  return m;
}
function blur(a, W, H, r, passes = 2) {
  const t = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += a[y * W + xx]; n++; } } t[y * W + x] = s / n; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) { s += t[yy * W + x]; n++; } } a[y * W + x] = s / n; }
  }
  return a;
}
// colour (the darker floor, alpha from the hollow) and normal map (the hollow's bank), for the left foot or its mirror
function footTextures(mirror) {
  const W = 64, H = 128;
  let m = footMask(W, H);
  if (mirror) { const r = new Float32Array(m.length); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) r[y * W + x] = m[y * W + (W - 1 - x)]; m = r; }
  const hf = blur(Float32Array.from(m), W, H, 2, 2); // the hollow's depth: soft edged
  const col = new Uint8Array(W * H * 4), nor = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, h = hf[i];
    const xl = hf[y * W + Math.max(0, x - 1)], xr = hf[y * W + Math.min(W - 1, x + 1)], yu = hf[Math.max(0, y - 1) * W + x], yd = hf[Math.min(H - 1, y + 1) * W + x];
    // texture row 0 is the top of the quad: v grows toward the toes, so the slope in v is -(yu - yd)
    let nx = -(xr - xl) * 5.5, ny = (yu - yd) * 5.5, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    nor[i * 4] = (nx * 0.5 + 0.5) * 255; nor[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; nor[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; nor[i * 4 + 3] = 255;
    const floor = Math.min(1, Math.max(0, (h - 0.12) / 0.5));
    col[i * 4] = 70; col[i * 4 + 1] = 60; col[i * 4 + 2] = 61; col[i * 4 + 3] = Math.round(floor * 215);
  }
  const mk = (data, srgb) => { const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.flipY = false; t.needsUpdate = true; return t; };
  return { map: mk(col, true), normalMap: mk(nor, false) };
}

const segDist = (x, z, a, b) => { const fx = b.x - a.x, fz = b.z - a.z, u = Math.max(0, Math.min(1, ((x - a.x) * fx + (z - a.z) * fz) / (fx * fx + fz * fz))); return Math.hypot(x - a.x - fx * u, z - a.z - fz * u); };

export function buildTrack(ctx) {
  const { terrain, scene } = ctx;
  const G = groundOf(terrain), rng = ctx.makeRng(8731);
  const [x0, z0] = TRACK.from, [x1, z1] = TRACK.to;
  const len = Math.hypot(x1 - x0, z1 - z0), dx = (x1 - x0) / len, dz = (z1 - z0) / len, px = -dz, pz = dx;
  const n = Math.round(len / TRACK.stride) + 1, stride = len / (n - 1);
  const onRoad = (x, z) => {
    if (terrain.causewayDistance(x, z) < TRACK.clear) return true;
    for (let i = 0; i < CAUSEWAY_V4.length - 1; i++) if (segDist(x, z, CAUSEWAY_V4[i], CAUSEWAY_V4[i + 1]) < TRACK.clear) return true;
    return false;
  };
  const prints = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, t = i * stride, x = x0 + dx * t + px * side * TRACK.half, z = z0 + dz * t + pz * side * TRACK.half;
    if (onRoad(x, z) || terrain.isUnderwater(x, z)) continue;
    prints.push({ x, z, left: side < 0, yaw: Math.atan2(dx, dz) + (rng() - 0.5) * 0.04 });
  }
  const geo = new THREE.PlaneGeometry(0.27, 0.68); geo.rotateX(-Math.PI / 2); // lies flat, the toes toward +z
  const meshes = [], up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), qa = new THREE.Quaternion(), qy = new THREE.Quaternion(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), M = new THREE.Matrix4();
  for (const left of [true, false]) {
    const list = prints.filter((p) => p.left === left), tex = footTextures(!left);
    const mat = new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 1, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((p, i) => {
      G.normalAt(p.x, p.z, nrm); qa.setFromUnitVectors(up, nrm);
      qy.setFromAxisAngle(up, p.yaw); qa.multiply(qy); // toes (the texture's +z) along the way the walker goes
      pos.set(p.x, G.heightAt(p.x, p.z) + 0.015, p.z);
      mesh.setMatrixAt(i, M.compose(pos, qa, one));
    });
    mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.name = `discontinued-track-${left ? 'left' : 'right'}`;
    mesh.computeBoundingSphere(); mesh.frustumCulled = true;
    scene.add(mesh); meshes.push(mesh);
  }
  const last = prints[prints.length - 1];
  return { prints, count: prints.length, stride, from: TRACK.from, to: TRACK.to, last: { x: last.x, z: last.z }, meshes };
}
