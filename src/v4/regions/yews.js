// The Demesne's yews (demesne.js places them): "yew shapes clipped long ago into cones and urns and now grown
// shapeless". Each yew is its own mesh baked into one geometry (one draw call, one shadow call for the set): the
// clipped mass is a lathe of the gardener's profile, roughened by noise seeded per yew so no two match, mottled
// near-black green with a needle texture and a few rusty dead patches; over it a shaggy layer of sprig cards escapes
// the clipped line, denser toward the top and the sunward side, with a few long whips sagging out of it.
// Colours are authored as sRGB hex and converted to linear by THREE.Color, as the vertex colours are read linear.
import * as THREE from 'three';
import { makeSimplex, smoothstep, clamp, lerp } from '../../noise.js';
import { unflipNormals } from '../../vegetation/util.js';

const N = makeSimplex(20261107 + 1011);
const lin = (hex) => new THREE.Color(hex);
const C_MASS = lin('#22331c'), C_MASS2 = lin('#2c4023'), C_DEEP = lin('#111a0f'), C_DEAD = lin('#4e3219');
const C_SPRIG = lin('#2a3d20'), C_TIP = lin('#465a2b'), C_SPRIG_DEAD = lin('#5a3a1c');

// The gardener's profiles: [radius, height] from the foot up (as v4 drew them).
export const PROFILES = {
  cone: [[0.01, 0], [0.45, 0], [0.45, 0.5], [1.5, 0.7], [1.35, 1.8], [1.0, 2.9], [0.55, 3.8], [0.15, 4.5], [0.01, 4.7]],
  urn: [[0.01, 0], [0.9, 0], [1.0, 0.6], [0.7, 0.9], [0.4, 1.3], [0.45, 1.7], [1.3, 2.2], [1.45, 2.9], [1.1, 3.5], [0.4, 3.75], [0.55, 4.1], [0.3, 4.5], [0.01, 4.6]],
};

// Atlas 512 x 256: the needle mass on the left half (opaque, tiles across u), two sprays of flat two-ranked yew
// needles on the right (hard alpha for the alpha test). Greyscale: the vertex colour gives the hue.
function makeAtlas(rng) {
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgb(185,185,185)'; g.fillRect(0, 0, 256, 256);
  g.save(); g.beginPath(); g.rect(0, 0, 256, 256); g.clip();
  for (let i = 0; i < 2600; i++) { // needles in every direction, dark gaps and lit tips
    const x = rng() * 256, y = rng() * 256, a = rng() * Math.PI * 2, l = 3 + rng() * 6, v = rng() < 0.35 ? 70 + rng() * 50 : 180 + rng() * 75;
    g.strokeStyle = `rgb(${v | 0},${v | 0},${v | 0})`; g.lineWidth = 1 + rng() * 1.2;
    for (const ox of [-256, 0, 256]) { g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }
  g.restore();
  for (let t = 0; t < 2; t++) {
    const ox = 256 + t * 128;
    g.save(); g.beginPath(); g.rect(ox, 0, 128, 256); g.clip();
    // a spray from the foot (bottom) to the tip: a main stem bending a little, side shoots, needles in two ranks
    const stems = [{ x0: ox + 64, y0: 254, x1: ox + 64 + (rng() - 0.5) * 30, y1: 8, w: 2.4 }];
    for (let k = 0; k < 5; k++) {
      const y0 = 200 - k * 36 - rng() * 12, s = k % 2 ? 1 : -1;
      stems.push({ x0: ox + 64 + (rng() - 0.5) * 6, y0, x1: ox + 64 + s * (30 + rng() * 22), y1: y0 - 40 - rng() * 30, w: 1.4 });
    }
    for (const S of stems) {
      g.strokeStyle = 'rgb(80,70,60)'; g.lineWidth = S.w; g.beginPath(); g.moveTo(S.x0, S.y0); g.lineTo(S.x1, S.y1); g.stroke();
      const len = Math.hypot(S.x1 - S.x0, S.y1 - S.y0), ux = (S.x1 - S.x0) / len, uy = (S.y1 - S.y0) / len;
      for (let d = 4; d < len; d += 2.2) {
        const px = S.x0 + ux * d, py = S.y0 + uy * d, nl = (6 + rng() * 5) * (1 - 0.45 * d / len) * (S.w > 2 ? 1.25 : 1);
        for (const s of [-1, 1]) {
          const v = 170 + rng() * 85, ax = -uy * s + ux * 0.45, ay = ux * s + uy * 0.45;
          g.strokeStyle = `rgb(${v | 0},${v | 0},${v | 0})`; g.lineWidth = 1.6 + rng() * 0.8;
          g.beginPath(); g.moveTo(px, py); g.lineTo(px + ax * nl, py + ay * nl); g.stroke();
        }
      }
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
const SPRIG_UV = [[0.505, 0.745], [0.755, 0.995]];

// Resample a profile to `rings` rings evenly by arc length, so the noise has vertices to move.
function resample(prof, rings) {
  const L = [0];
  for (let i = 1; i < prof.length; i++) L.push(L[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const out = [];
  for (let k = 0; k < rings; k++) {
    const s = (k / (rings - 1)) * L[L.length - 1];
    let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const t = clamp((s - L[i - 1]) / (L[i] - L[i - 1] || 1), 0, 1);
    out.push([lerp(prof[i - 1][0], prof[i][0], t), lerp(prof[i - 1][1], prof[i][1], t)]);
  }
  return out;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _w = new THREE.Vector3();
const _nm = new THREE.Matrix3();

// yews: [{ x, y, z, s, ry, rx, rz, kind: 'cone'|'urn' }]; returns { mesh, tris, sprigs }
export function buildYewMesh(ctx, yews, { low = false, name = 'demesne-yews' } = {}) {
  const rng = ctx.makeRng(6611);
  const rings = low ? 18 : 24, seg = low ? 14 : 22;
  const sprigN = low ? 150 : 300, whipN = low ? 4 : 7;
  const sun = ctx.sun?.dir || { x: -1, y: 0.2, z: 0 }, sl = Math.hypot(sun.x, sun.z) || 1, sx = sun.x / sl, sz = sun.z / sl;
  const P = [], Nn = [], C = [], U = [], I = [];
  const vert = (p, n, c, u, v) => { P.push(p.x, p.y, p.z); Nn.push(n.x, n.y, n.z); C.push(c.r, c.g, c.b); U.push(u, v); return P.length / 3 - 1; };
  const col = new THREE.Color();
  let sprigs = 0;

  for (const Y of yews) {
    const seed = rng() * 100, prof = resample(PROFILES[Y.kind], rings);
    const H = prof[prof.length - 1][1];
    _e.set(Y.rx || 0, Y.ry || 0, Y.rz || 0, 'YXZ'); _q.setFromEuler(_e); _s.setScalar(Y.s); _p.set(Y.x, Y.y, Y.z);
    _m.compose(_p, _q, _s); _nm.getNormalMatrix(_m);
    // the grown-out radius: the clipped line pushed out in lumps (more toward the top, where it grows fastest)
    const lean = { x: (rng() - 0.5) * 0.35, z: (rng() - 0.5) * 0.35 };
    const radius = (r, y, a) => {
      if (r < 0.02) return r;
      const ca = Math.cos(a), sa = Math.sin(a), up = clamp(y / H, 0, 1);
      const k = 1 + 0.2 * N.noise2(ca * 1.4 + seed, y * 0.8 + sa * 1.4) + 0.12 * N.noise2(ca * 3.1 + seed * 2, y * 2.2 + sa * 3.1)
        + 0.05 * N.noise2(ca * 7 + seed, y * 5 + sa * 7) + 0.1 * up * Math.max(0, ca * sx + sa * sz);
      return r * k;
    };
    // the mass: a local grid (rings x seg+1, the seam duplicated), normals from the grid, then baked to world
    const loc = [];
    for (let j = 0; j < rings; j++) {
      const [r0, y0] = prof[j], row = [];
      for (let i = 0; i <= seg; i++) {
        const a = ((i % seg) / seg) * Math.PI * 2, r = radius(r0, y0, a), up = clamp(y0 / H, 0, 1);
        const y = y0 + (r0 > 0.02 ? 0.1 * N.noise2(Math.cos(a) * 2 + seed, y0 + Math.sin(a) * 2) : 0);
        row.push({ x: Math.cos(a) * r + lean.x * up * up, y, z: Math.sin(a) * r + lean.z * up * up, a, r0 });
      }
      loc.push(row);
    }
    const base = P.length / 3;
    for (let j = 0; j < rings; j++) for (let i = 0; i <= seg; i++) {
      const q = loc[j][i], jp = loc[Math.min(rings - 1, j + 1)][i], jm = loc[Math.max(0, j - 1)][i];
      const ip = loc[j][(i + 1) % seg], im = loc[j][(i + seg - 1) % seg];
      _a.set(jp.x - jm.x, jp.y - jm.y, jp.z - jm.z); _b.set(ip.x - im.x, ip.y - im.y, ip.z - im.z);
      _n.crossVectors(_a, _b);
      if (_n.lengthSq() < 1e-10 || j === rings - 1) _n.set(0, 1, 0);
      if (j === 0) _n.set(0, -1, 0);
      _n.normalize().applyMatrix3(_nm).normalize();
      _v.set(q.x, q.y, q.z).applyMatrix4(_m);
      // colour: near-black green, deeper in the hollows (where the lump noise pulls in), dead patches rusty
      const hollow = q.r0 > 0.02 ? clamp(1 - Math.hypot(q.x, q.z) / q.r0, -0.3, 0.3) : 0;
      const dead = smoothstep(0.55, 0.72, N.noise2(Math.cos(q.a) * 1.3 + seed * 3, q.y * 0.7 + Math.sin(q.a))) * 0.75;
      col.copy(C_MASS).lerp(C_MASS2, 0.5 + 0.5 * N.noise2(q.a * 4 + seed, q.y * 3)).lerp(C_DEEP, clamp(hollow * 2.5 + 0.15, 0, 0.8)).lerp(C_DEAD, dead);
      col.multiplyScalar(0.8 + 0.35 * clamp(q.y / H, 0, 1));
      vert(_v, _n, col, (i / seg) * 0.48 + 0.01, clamp(q.y / 4.7, 0, 1) * 0.98 + 0.01);
    }
    for (let j = 0; j < rings - 1; j++) for (let i = 0; i < seg; i++) {
      const a = base + j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
      I.push(a, c, b, b, c, d);
    }
    // the shaggy layer: sprig cards rooted just inside the mass, pointing out and up, crossed pairs
    const card = (root, dir, side, len, wid, sag, c, tile, segs) => {
      const [u0, u1] = SPRIG_UV[tile];
      let prev = null;
      _w.copy(dir);
      const pt = new THREE.Vector3().copy(root);
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        if (k > 0) { _w.y -= sag / segs; _w.normalize(); pt.addScaledVector(_w, len / segs); }
        const w = wid * (k === segs ? 0.55 : 1), nUp = _n.clone().lerp(_w, 0.2).normalize();
        const ia = vert(_a.copy(pt).addScaledVector(side, -w / 2), nUp, c, u0, t * 0.98 + 0.01);
        const ib = vert(_a.copy(pt).addScaledVector(side, w / 2), nUp, c, u1, t * 0.98 + 0.01);
        if (prev) I.push(prev[0], prev[1], ib, prev[0], ib, ia);
        prev = [ia, ib];
      }
      return 2 * segs;
    };
    const tryN = sprigN * 3;
    for (let k = 0, made = 0; k < tryN && made < sprigN; k++) {
      const j = 1 + Math.floor(rng() * (rings - 2)), i = Math.floor(rng() * seg), q = loc[j][i];
      if (q.r0 < 0.12 && j < rings - 2) continue;
      const up = clamp(q.y / H, 0, 1), ca = Math.cos(q.a), sa = Math.sin(q.a);
      const w = (0.35 + 0.65 * up) * (0.7 + 0.3 * Math.max(0, ca * sx + sa * sz));
      if (rng() > w) continue;
      made++;
      // outward normal in world from the vertex already written
      const vi = base + j * (seg + 1) + i;
      _n.set(Nn[vi * 3], Nn[vi * 3 + 1], Nn[vi * 3 + 2]);
      const root = new THREE.Vector3(P[vi * 3], P[vi * 3 + 1], P[vi * 3 + 2]).addScaledVector(_n, -0.12 * Y.s);
      const dir = new THREE.Vector3().copy(_n).add(new THREE.Vector3((rng() - 0.5) * 0.9, 0.55 + rng() * 0.5, (rng() - 0.5) * 0.9)).normalize();
      const side = new THREE.Vector3().crossVectors(dir, _n.y > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize();
      const len = (0.35 + rng() * 0.45) * Y.s * (0.85 + 0.4 * up), wid = len * (0.45 + rng() * 0.2);
      const dead = rng() < 0.05;
      col.copy(dead ? C_SPRIG_DEAD : C_SPRIG).lerp(C_TIP, dead ? 0 : rng() * 0.7 * up);
      const tile = (rng() * 2) | 0;
      sprigs += card(root, dir, side, len, wid, 0.12, col, tile, 1);
      side.applyAxisAngle(dir, Math.PI / 2);
      sprigs += card(root, dir, side, len, wid, 0.12, col, tile, 1);
    }
    // whips: a few long leaders out of the upper half, sagging under their own weight
    for (let k = 0; k < whipN; k++) {
      const j = Math.floor(rings * (0.4 + rng() * 0.45)), i = Math.floor(rng() * seg), vi = base + j * (seg + 1) + i;
      _n.set(Nn[vi * 3], Nn[vi * 3 + 1], Nn[vi * 3 + 2]);
      const root = new THREE.Vector3(P[vi * 3], P[vi * 3 + 1], P[vi * 3 + 2]).addScaledVector(_n, -0.15 * Y.s);
      const dir = new THREE.Vector3().copy(_n).add(new THREE.Vector3(0, 0.5 + rng() * 0.6, 0)).normalize();
      const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
      if (side.lengthSq() < 0.01) side.set(1, 0, 0);
      col.copy(C_SPRIG).lerp(C_TIP, 0.5 + rng() * 0.5);
      const len = (1.0 + rng() * 0.9) * Y.s, sag = 0.6 + rng() * 0.6, tile = (rng() * 2) | 0;
      sprigs += card(root, dir, side, len, 0.32 * Y.s, sag, col, tile, 3);
      side.applyAxisAngle(dir, Math.PI / 2);
      sprigs += card(root, dir, side, len, 0.32 * Y.s, sag, col, tile, 3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.setIndex(I);
  geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: makeAtlas(ctx.makeRng(6612)), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.95, metalness: 0 });
  mat.onBeforeCompile = (shader) => unflipNormals(shader);
  mat.customProgramCacheKey = () => 'fp-demesne-yew';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.yews = yews.length; // regions-test reads it
  ctx.scene.add(mesh);
  return { mesh, tris: I.length / 3, sprigTris: sprigs };
}
