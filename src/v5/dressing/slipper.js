// DE The Slipper [Decided] (plans/IDEAS-v5.md DE): a single brocade slipper on the causeway, the toe curled, the gold thread
// rubbed through, lying on its side as if dropped from something moving; on the first walk out. 25 cm long, one mesh of
// about 700 triangles, no collider, no light, no emissive: the gold is thread in the brocade's texture (a small canvas drawn
// at build from a private rng: peacock-green ground, a lattice of lozenges each with a dot in it in gold, a faint weave; the
// gold is worn away toward the heel and the toe until the weave shows).
import * as THREE from 'three';
import { SITES } from '../../world.js';

// the plan's point is (-20, 26) r 1; the slab that point falls in a crack of is 0.7 m west-south-west of it, so it lies there
export const SLIPPER = { x: -20.6, z: 25.74, length: 0.25, site: SITES.slipper };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function brocade(rng) {
  const W = 384, Hh = 192, c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const g = c.getContext('2d');
  g.fillStyle = '#25a085'; g.fillRect(0, 0, W, Hh);
  // the weave under it: warp and weft, a thread every two pixels, a little uneven
  for (let x = 0; x < W; x += 2) { g.fillStyle = `rgba(8,${40 + rng() * 30},44,${0.18 + rng() * 0.12})`; g.fillRect(x, 0, 1, Hh); }
  for (let y = 0; y < Hh; y += 2) { g.fillStyle = `rgba(60,${150 + rng() * 40},150,${0.07 + rng() * 0.08})`; g.fillRect(0, y, W, 1); }
  // x is along the slipper (0 heel to 1 toe), y round it; the gold wears off at both ends and along the ball
  const wear = (x, y) => Math.max(sm(0.2, 0.0, x / W), sm(0.78, 0.97, x / W), 0.35 * sm(0.45, 0.8, x / W) * (0.5 + 0.5 * Math.sin(y * 0.09 + x * 0.03)));
  const dx = 22, dy = 26;
  for (let row = -1; row * dy < Hh + dy; row++) for (let col = -1; col * dx < W + dx; col++) {
    const cx = col * dx + (row & 1 ? dx / 2 : 0), cy = row * dy;
    const w = wear(cx, cy), keep = 1 - w * (0.55 + 0.7 * rng());
    if (keep <= 0.08) { // rubbed through: a pale dull weft showing where the gold was
      g.fillStyle = `rgba(90,80,50,${0.3 * w})`; g.fillRect(cx - 5, cy - 6, 10, 12); continue;
    }
    g.globalAlpha = Math.min(1, keep);
    g.strokeStyle = '#d8b258'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx + 8, cy); g.lineTo(cx, cy + 10); g.lineTo(cx - 8, cy); g.closePath(); g.stroke();
    g.fillStyle = '#e4c36a'; g.beginPath(); g.arc(cx, cy, 3, 0, 6.3); g.fill();
    g.strokeStyle = '#a98438'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 4, cy - 5); g.lineTo(cx, cy - 8); g.lineTo(cx + 4, cy - 5); g.stroke();
    g.globalAlpha = 1;
  }
  // the dull, rubbed ends: the ground itself paler and browner where it was handled
  for (const [a, b] of [[0, 0.14], [0.86, 1]]) {
    const gr = g.createLinearGradient(a * W, 0, b * W, 0); const flip = a === 0;
    gr.addColorStop(flip ? 0 : 1, 'rgba(70,60,40,0.55)'); gr.addColorStop(flip ? 1 : 0, 'rgba(70,60,40,0)');
    g.fillStyle = gr; g.fillRect(a * W, 0, (b - a) * W, Hh);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// x along the length from the heel, y up from the sole's plane, z across. N rings along, M segments round the arch.
function shape() {
  const L = SLIPPER.length, N = 22, M = 14, pos = [], uv = [], idx = [];
  const half = (s) => { // half-width: a rounded heel, a waist, the ball at 0.6, the pointed toe
    const heel = Math.sqrt(Math.min(1, s / 0.07)), body = 0.6 + 0.4 * sm(0.12, 0.6, s);
    const tip = s < 0.6 ? 1 : 1 - Math.pow((s - 0.6) / 0.4, 1.6);
    return 0.037 * heel * body * Math.max(0, tip);
  };
  const high = (s) => { // the wall's height above the sole: heel counter, low sides at the throat, the vamp, the toe box
    const counter = 0.062 * (1 - sm(0.06, 0.28, s)), vamp = 0.046 * sm(0.42, 0.62, s) * (1 - sm(0.72, 1.0, s) * 0.8);
    return Math.max(0.02 + 0.012 * sm(0, 0.04, s), counter, vamp) * (s > 0.97 ? 1 - (s - 0.97) / 0.03 * 0.85 : 1);
  };
  const sole = (s) => 0.03 * (1 - sm(0.12, 0.42, s)) + 0.07 * Math.pow(Math.max(0, (s - 0.74) / 0.26), 2.2); // a small heel; the toe curled up
  for (let i = 0; i <= N; i++) {
    const s = Math.pow(i / N, 0.92), w = half(s), h = high(s), y0 = sole(s);
    for (let j = 0; j <= M; j++) {
      const phi = (j / M) * Math.PI, throat = s > 0.2 && s < 0.5; // the top of the arch is open from the heel's counter to the vamp
      const squash = throat ? 0.55 + 0.45 * Math.abs(Math.cos(phi)) : 1;
      pos.push(s * L, y0 + h * Math.sin(phi) * (throat ? Math.min(1, 0.35 + 0.65 * Math.abs(Math.cos(phi))) : 1) * (throat ? squash : 1) + 0.001, w * Math.cos(phi));
      uv.push(s, j / M);
    }
  }
  const row = M + 1;
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1, s = (i + 0.5) / N, mid = Math.abs(j + 0.5 - M / 2) < 2.1;
    if (s > 0.22 && s < 0.5 && mid) continue; // the opening
    idx.push(a, c, b, b, c, d);
  }
  // the sole: a flat strip under the arch's two edges
  const base = pos.length / 3;
  for (let i = 0; i <= N; i++) { const s = Math.pow(i / N, 0.92), w = half(s), y0 = sole(s); pos.push(s * L, y0, w, s * L, y0, -w); uv.push(s, 0, s, 1); }
  for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export { shape as slipperShape, brocade }; // v8-05: the house's sleeper wears the mate

export function buildSlipper(ctx) {
  const rng = ctx.makeRng(5402), g = shape();
  g.translate(-SLIPPER.length * 0.5, 0, 0);
  // on its side: rolled most of the way over about its length, toe a little skewed toward the road's west, its throat toward the walker
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 1.57 + 0.45, 0, 'YXZ')).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -1.0));
  // the slab is tilted to the road's grade (16 degrees falling west): tilt it the same and rest the lowest point on the slab's plane
  const n = new THREE.Vector3(); ctx.terrain.normalAt(SLIPPER.x, SLIPPER.z, n); n.normalize();
  q.premultiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
  g.applyQuaternion(q);
  const P = new THREE.Vector3(SLIPPER.x, ctx.terrain.heightAt(SLIPPER.x, SLIPPER.z) + 0.014, SLIPPER.z); // the slab's top is 1.4 cm over the ground here, the paver sunk
  const pos = g.attributes.position, v = new THREE.Vector3();
  let lo = Infinity;
  for (let i = 0; i < pos.count; i++) lo = Math.min(lo, v.fromBufferAttribute(pos, i).dot(n));
  g.translate(P.x - n.x * lo, P.y - n.y * lo, P.z - n.z * lo);
  g.computeBoundingSphere(); g.computeBoundingBox();
  const map = brocade(rng);
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0.0, side: THREE.DoubleSide }));
  mesh.name = 'slipper'; mesh.castShadow = true; mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  return { mesh, meshes: [mesh] };
}
