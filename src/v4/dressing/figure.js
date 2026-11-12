// DG The Long Figure [Proposed] (plans/wilderness-v5.md; site in plans/wilderness-v4-placement.md): "on the lowest slope of the east
// wall, facing the sun, a figure 80 m long cut through the turf to pale stone: a standing person with too many arms, or a
// person with their arms in several places at once, as in a slow photograph." Above the Foundered Nave; seen best from the
// Span's deck and from the keep.
//
// A thin sheet laid on the rendered terrain's own triangles (a 1 m grid, lifted a hand's breadth), running up the slope along
// the wall's radial line from the site, its length measured along the ground so it is 80 m on the hill and not on the map.
// The figure is painted once into a canvas (the cut chalk, a dark lip of turf round it) and alpha-tested; no shadows.
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { meshGround } from '../regions/skin.js';

export const FIGURE = { length: 80, width: 64, foot: 288 }; // m along the slope, m across, radius from the bowl's centre where the feet stand

// The figure's shape in figure space (u across in metres from the centre line, s up the slope from the feet): limbs as
// strokes { a: [u, s], b: [u, s], w } with round caps, hands as discs { c: [u, s], r }, the head an ellipse { e: [u, s],
// rx, rs }. paint() draws it (padded by the turf's lip); onFigure() asks it (v9, #16: nothing grows or lies on him).
const SHAPE = (() => {
  const L = [], D = [];
  const limb = (x0, s0, x1, s1, w) => L.push({ a: [x0, s0], b: [x1, s1], w });
  // legs, a little apart, feet turned out
  limb(-1.2, 36, -4.5, 3, 4.0); limb(1.2, 36, 4.5, 3, 4.0);
  limb(-4.5, 3, -8.5, 1.8, 3.0); limb(4.5, 3, 8.5, 1.8, 3.0);
  // trunk and neck
  limb(0, 36, 0, 60, 5.4); limb(0, 58, 0, 63, 2.2);
  // the arms: the same two, caught in six places each, a slow photograph; each is a shoulder, a forearm, a hand
  const sh = 57.5, L1 = 14, L2 = 12;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = (14 + i * 27) * Math.PI / 180;            // from hanging straight down, round to overhead
      const bend = (0.55 - 0.1 * i) * (i % 2 ? 1 : 0.8);  // the elbow opens as the arm goes up
      const ex = side * Math.sin(a) * L1, es = sh - Math.cos(a) * L1;
      const a2 = a + bend, hx = ex + side * Math.sin(a2) * L2, hs = es - Math.cos(a2) * L2;
      limb(side * 1.8, sh, ex, es, 2.9); limb(ex, es, hx, hs, 2.4);
      D.push({ c: [hx, hs], r: 2.0 });
    }
  }
  return { limbs: L, discs: D, head: { e: [0, 69.5], rx: 3.6, rs: 5.6 } };
})();

function paint(noise) {
  const PPM = 8, W = FIGURE.width * PPM, H = FIGURE.length * PPM;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const X = (u) => (u + FIGURE.width / 2) * PPM, Y = (s) => H - s * PPM;
  const body = (pad) => {
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const l of SHAPE.limbs) { g.lineWidth = (l.w + pad) * PPM; g.beginPath(); g.moveTo(X(l.a[0]), Y(l.a[1])); g.lineTo(X(l.b[0]), Y(l.b[1])); g.stroke(); }
    const h = SHAPE.head;
    g.beginPath(); g.ellipse(X(h.e[0]), Y(h.e[1]), (h.rx + pad / 2) * PPM, (h.rs + pad / 2) * PPM, 0, 0, Math.PI * 2); g.fill();
    for (const d of SHAPE.discs) { g.beginPath(); g.arc(X(d.c[0]), Y(d.c[1]), (d.r + pad / 2) * PPM, 0, Math.PI * 2); g.fill(); }
  };
  g.clearRect(0, 0, W, H);
  // the lip: turf cut back, dark and a little raised, a metre round the chalk
  g.fillStyle = g.strokeStyle = '#2b2a1c'; body(1.8);
  g.fillStyle = g.strokeStyle = '#cdc5b0'; body(0);
  // chalk speckle, grass flecks on the cut's edge, a slow stain
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (d[i + 3] < 128) continue;
    const n = noise.fbm2(x * 0.03, y * 0.03, 3) * 0.5 + 0.5, f = noise.noise2(x * 0.5, y * 0.5) * 0.5 + 0.5;
    if (d[i] > 150) { const k = 0.82 + 0.28 * n + 0.1 * (f - 0.5); d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k * 0.99); d[i + 2] = Math.min(255, d[i + 2] * k * 0.94); }
    else { const k = 0.7 + 0.8 * f; d[i] = Math.min(255, d[i] * k * 0.9); d[i + 1] = Math.min(255, d[i + 1] * k * 1.1); d[i + 2] = d[i + 2] * k * 0.6; }
  }
  g.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// The figure's frame on the ground: its axes and r(s), the radius from the bowl's centre for each metre of length
// measured on the surface. Cached per terrain.
let FRAME = null;
function frame(terrain) {
  if (FRAME && FRAME.terrain === terrain) return FRAME;
  const G = meshGround(terrain);
  const site = SITES.longFigure, a = Math.atan2(site.z, site.x), cx = Math.cos(a), sz = Math.sin(a); // up the slope: out from the centre
  const L = FIGURE.length, R = new Float32Array(L + 1);
  { let r = FIGURE.foot, s = 0, h0 = G(cx * r, sz * r), k = 1; R[0] = r;
    while (k <= L && r < 600) { r += 0.25; const h1 = G(cx * r, sz * r); s += Math.hypot(0.25, h1 - h0); h0 = h1; while (k <= L && s >= k) R[k++] = r; } }
  return (FRAME = { terrain, G, cx, sz, tx: -sz, tz: cx, R });
}

// Whether a footprint of radius pad at (x, z) reaches the cut chalk (the lip of turf round it is 0.9 m, inside a pad of 1).
// Rocks (rocks.js, through clearings.js), ground cover (plants.js), trees (vegetation/ground.js hiddenAt) keep off him.
export function onFigure(x, z, pad, terrain) {
  const F = frame(terrain), R = F.R, L = FIGURE.length;
  const u = x * F.tx + z * F.tz, r = x * F.cx + z * F.sz;
  if (Math.abs(u) > FIGURE.width / 2 + pad || r < R[0] - pad - 1 || r > R[L] + pad + 1) return false;
  // r to s: R is increasing in s, a metre a step; beyond either end, along the radius
  let s;
  if (r <= R[0]) s = r - R[0];
  else if (r >= R[L]) s = L + (r - R[L]);
  else { let k = 0; while (R[k + 1] < r) k++; s = k + (r - R[k]) / Math.max(1e-3, R[k + 1] - R[k]); }
  for (const l of SHAPE.limbs) {
    const ex = l.b[0] - l.a[0], es = l.b[1] - l.a[1], q = Math.max(0, Math.min(1, ((u - l.a[0]) * ex + (s - l.a[1]) * es) / (ex * ex + es * es || 1)));
    if (Math.hypot(u - l.a[0] - ex * q, s - l.a[1] - es * q) < l.w / 2 + pad) return true;
  }
  for (const d of SHAPE.discs) if (Math.hypot(u - d.c[0], s - d.c[1]) < d.r + pad) return true;
  const h = SHAPE.head;
  return ((u - h.e[0]) / (h.rx + pad)) ** 2 + ((s - h.e[1]) / (h.rs + pad)) ** 2 < 1;
}

export function buildFigure(ctx) {
  const { terrain, scene } = ctx;
  const { G, cx, sz, tx, tz, R } = frame(terrain);
  const L = FIGURE.length;
  const cols = FIGURE.width + 1, rows = L + 1, lift = 0.22;
  const pos = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2), idx = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const u = i - FIGURE.width / 2, r = R[j], x = cx * r + tx * u, z = sz * r + tz * u, v = j * cols + i;
    pos[v * 3] = x; pos[v * 3 + 1] = G(x, z) + lift; pos[v * 3 + 2] = z;
    uv[v * 2] = i / (cols - 1); uv[v * 2 + 1] = j / (rows - 1);
    if (i < cols - 1 && j < rows - 1) idx.push(v, v + cols, v + 1, v + 1, v + cols, v + cols + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ map: paint(ctx.noise), roughness: 0.95, metalness: 0, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'long-figure'; mesh.castShadow = false; mesh.receiveShadow = true;
  scene.add(mesh);
  const mid = { x: cx * R[40], z: sz * R[40] };
  mid.y = G(mid.x, mid.z);
  return { mesh, centre: mid, foot: { x: cx * R[0], z: sz * R[0] }, head: { x: cx * R[L], z: sz * R[L] }, radii: [R[0], R[L]], meshes: [mesh] };
}
