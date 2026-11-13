// The Span's thin way over its three fallen bays (v12 H1; the plan is vestige-plan.js). Each is a ruin, not a
// repair, and each is a different thing:
//   west: the north side's footing course (two rows of dressed stone, a few of the lower row gone) still standing
//         on three spandrel stubs and the arch's own rib, which is all of the bay that is left
//   fen:  the cornice and kerb stones of the south side, a dozen slabs hung from an iron tie-bar by straps, daylight
//         between them, two corbel arms out of the piers meeting crooked
//   river: not stone: a strut of the Lattice come down out of the sky, bowed, slung from pier to pier and lashed
//         with bronze, rags of saffron on the lashings (the Late folk's work)
// The stone goes into the span's own masonry mesh (K.body), the iron into its metal mesh (K.metals); the strut and the
// rags are two meshes of their own and one cold light. The walkable is vestigeAt (vestige-plan.js).
import * as THREE from 'three';
import { SPAN, bayArch, intrados, RING } from './plan.js';
import { VESTIGES, vestigeAt } from './vestige-plan.js';
import { box, extrudeXY, clean } from './geo.js';
import { mergeGeometries } from '../kit/merge.js';

const Y = SPAN.deckY;

// a slab whose top face centre is at (xc, yTop, zc), pitched to the way's slope and yawed to its jog
function slab(v, xc, len, wid, th, drop = 0.03, dy = 0, dzr = 0) {
  const g = new THREE.BoxGeometry(len, th, wid);
  g.translate(0, -th / 2, 0);
  const s = (v.y(xc + 0.5) - v.y(xc - 0.5)), jz = (v.zc(xc + 0.5) - v.zc(xc - 0.5));
  g.rotateZ(Math.atan(s)); g.rotateY(-Math.atan(jz) + dzr);
  g.translate(xc, v.y(xc) - drop + dy, v.zc(xc));
  return clean(g);
}
const cloth = { mat: null };
// the Late folk's saffron, faded; shared with the camp
export function saffronMaterial() {
  return cloth.mat || (cloth.mat = new THREE.MeshStandardMaterial({ color: '#a87a38', emissive: new THREE.Color('#3a2410'), emissiveIntensity: 0.5, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
}
// the pointed arch's ring between intrados and extrados, as one outline in x-y
function ringOutline(A) {
  const pts = [], n = 14, m = A.m;
  const top = (x) => { const xr = x <= m ? x : 2 * m - x, Rr = A.R + RING; return A.ys + Math.sqrt(Math.max(0, Rr * Rr - (xr - A.cl) ** 2)); };
  for (let i = 0; i <= n * 2; i++) { const x = A.fl + (A.fr - A.fl) * (i / (n * 2)); pts.push([x, intrados(A, x)]); }
  pts.push([A.fr + RING, A.ys]);
  for (let i = n * 2; i >= 0; i--) { const x = (A.fl - RING) + (A.fr - A.fl + 2 * RING) * (i / (n * 2)); pts.push([x, i === 0 || i === n * 2 ? A.ys : top(x)]); }
  return pts;
}

export function buildVestige(K) {
  const { ctx, hi, rng, jit, body, metals, paint, addCol } = K;
  const [W, F, R] = VESTIGES;
  const metalParts = [];
  const iron = (g, hex = '#4a3a30') => metals.push(paint(g, hex));

  // ---------------------------------------------------------------- west: the footing on its rib
  {
    const A = bayArch(-120, -70), zr = 211.0;
    body.push(extrudeXY(ringOutline(A), zr - 0.75, zr + 0.75)); // the rib, all of the bay's arch that is left
    // three stubs of the spandrel wall from the rib up to the footing: leaning, ragged
    for (const [xc, w] of [[-107.2, 2.8], [-95.3, 2.2], [-83.6, 3.0]]) {
      const yb = intrados(A, xc) + RING * 0.6, yt = W.y(xc) - 1.35;
      const pts = [[xc - w / 2 - jit(0.3), yb], [xc + w / 2, yb], [xc + w / 2 - 0.5 + jit(0.4), yt], [xc - w / 2 + 0.4 + jit(0.4), yt]];
      body.push(extrudeXY(pts, W.zc(xc) - 0.7, W.zc(xc) + 0.7));
    }
    // the footing: an upper row of long stones, a lower row set back and broken, two stones of it fallen away
    for (let x = W.x0, i = 0; x < W.x1 - 0.5; i++) {
      const len = Math.min(W.x1 - x, 2.6 + rng() * 1.3), xc = x + len / 2;
      body.push(slab(W, xc, len - 0.05, 1.5, 0.82, 0.03 + rng() * 0.02, 0, jit(0.03)));
      if (!(i === 4 || i === 7)) body.push(slab(W, xc + 1.1, len - 0.1, 1.34, 0.6, 0.85 + rng() * 0.04, 0, jit(0.04)));
      x += len;
    }
  }

  // ---------------------------------------------------------------- fen: the cornice and kerb stones on their iron
  {
    const gap = 0.24, pitch = 2.7 + gap;
    const n = Math.round((F.x1 - F.x0 + gap) / pitch);
    const len = (F.x1 - F.x0 + gap) / n - gap;
    for (let i = 0; i < n; i++) {
      const xc = F.x0 + len / 2 + i * (len + gap);
      body.push(slab(F, xc, len, 1.5, 0.55, 0.03 + rng() * 0.04, 0, jit(0.05)));
      // the strap from the tie-bar up to the stone's underside, and the tie-bar between straps
      const yb = F.y(xc) - 1.55, zc = F.zc(xc);
      iron(box(xc - 0.07, xc + 0.07, yb, F.y(xc) - 0.5, zc - 0.7, zc + 0.7), '#5a3a26');
      const x2 = xc + len / 2 + gap / 2, cx = xc + (len + gap) / 2, s = F.y(cx + 1) - F.y(cx - 1);
      const bar = new THREE.BoxGeometry(len + gap + 0.1, 0.16, 0.16); bar.rotateZ(Math.atan(s / 2));
      bar.translate(cx, F.y(cx) - 1.61, F.zc(cx));
      iron(clean(bar), '#4d3626');
      // a bronze cramp across the joint on the upper face
      if (i < n - 1) iron(box(x2 - 0.3, x2 + 0.3, F.y(x2) - 0.01, F.y(x2) + 0.035, zc - 0.32, zc + 0.32), '#6b5a2e');
    }
    // two corbel arms out of each pier face, the first three courses stepping out under the first stones
    for (const [dir, x] of [[1, F.a], [-1, F.b]]) for (let c = 0; c < 3; c++) {
      const out = 0.9 * (c + 1), x0 = dir > 0 ? x : x - out, x1 = dir > 0 ? x + out : x;
      const zc = F.zc(x);
      body.push(box(x0, x1, F.y(x) - 0.55 - 0.6 * (c + 1), F.y(x) - 0.55 - 0.6 * c, zc - 0.7, zc + 0.7));
    }
  }

  // ---------------------------------------------------------------- river: the Lattice's strut
  const strutMeshes = [];
  {
    const prof = [[-0.62, 0], [0.62, 0], [0.84, -0.3], [0.7, -0.86], [0, -1.14], [-0.7, -0.86], [-0.84, -0.3]];
    const st = [];
    const n = Math.round((R.x1 - R.x0) / 1.6);
    for (let i = 0; i <= n; i++) {
      const x = R.x0 + (R.x1 - R.x0) * (i / n);
      const sw = 1 + 0.07 * Math.sin(i * 1.7) + 0.05 * Math.sin(i * 0.6 + 1);
      const ends = i === 0 || i === n ? 1.25 : 1; // the ends are thicker, where the lashings take them
      st.push({ x, y: R.y(x), z: R.zc(x), sw: Math.max(1, sw) * ends, sh: (0.92 + 0.12 * Math.sin(i * 2.1)) * ends });
    }
    const pos = [], col = [];
    const dust = new THREE.Color('#7b7664'), lichen = new THREE.Color('#66714f'), glass = new THREE.Color('#6f98b8'), deep = new THREE.Color('#4a679a'), rust = new THREE.Color('#6a4a38'), c = new THREE.Color();
    // chips: every vertex of every station is a little off its profile, so no edge runs straight; the top is held near level
    const jt = st.map(() => prof.map((q, j) => [jit(j < 2 ? 0.03 : 0.07), j < 2 ? jit(0.02) : jit(0.09)]));
    const P = (s, j) => { const i = st.indexOf(s); return [s.x, s.y + prof[j][1] * s.sh + jt[i][j][1], s.z + prof[j][0] * s.sw + jt[i][j][0]]; };
    const tri = (a, b, d, ca, cb, cd) => { pos.push(...a, ...b, ...d); col.push(...ca, ...cb, ...cd); };
    // worn: dust and lichen across the top in patches, glass showing at the flanks, rust under the lashings, the lower side dark
    const hue = (j, i) => {
      const x = st[i].x, w = 0.5 + 0.5 * Math.sin(x * 0.83 + j * 1.9) * Math.sin(x * 0.29 + 1.3), l = 0.5 + 0.5 * Math.sin(x * 0.47 + j * 3.1);
      if (j === 0 || j === 1) c.copy(dust).lerp(lichen, l * 0.7).lerp(glass, 0.12 * (1 - w));
      else if (j === 2 || j === 6) c.copy(glass).lerp(dust, 0.1 + 0.3 * w);
      else c.copy(deep).lerp(rust, 0.25 * w);
      return c.toArray();
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < prof.length; j++) {
      const k = (j + 1) % prof.length;
      const a = P(st[i], j), b = P(st[i], k), d = P(st[i + 1], k), e = P(st[i + 1], j);
      const cj = hue(j, i), cj2 = hue(j, i + 1);
      tri(a, e, d, cj, cj2, cj2); tri(a, d, b, cj, cj2, cj);
    }
    for (const [s, flip] of [[st[0], true], [st[n], false]]) for (let j = 1; j < prof.length - 1; j++) {
      const a = P(s, 0), b = P(s, j), d = P(s, j + 1), cc = glass.toArray();
      flip ? tri(a, d, b, cc, cc, cc) : tri(a, b, d, cc, cc, cc);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    // (winding fixed by the top face: its normal must point up)
    const nr = g.attributes.normal; if (nr.getY(0) < 0) { for (let i = 0; i < pos.length; i += 9) for (let q = 0; q < 3; q++) { const a = pos[i + 3 + q]; pos[i + 3 + q] = pos[i + 6 + q]; pos[i + 6 + q] = a; const b = col[i + 3 + q]; col[i + 3 + q] = col[i + 6 + q]; col[i + 6 + q] = b; } g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); }
    g.computeBoundingSphere();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.15, emissive: new THREE.Color('#2f5a86'), emissiveIntensity: 0.14, flatShading: true });
    const m = new THREE.Mesh(g, mat); m.name = 'span-strut'; m.castShadow = true; m.receiveShadow = true;
    ctx.scene.add(m); strutMeshes.push(m);
    // bronze lashings (a flat band over the top, two cheek plates) and the rags tied to them
    const rags = [], bands = [-1, 0.14, 0.27, 0.5, 0.62, 0.78, 1.1].filter((u) => u > 0 && u < 1);
    for (const u of bands) {
      const x = R.x0 + 0.6 + (R.x1 - R.x0 - 1.2) * u, y = R.y(x), z = R.zc(x), sl = Math.atan((R.y(x + 0.5) - R.y(x - 0.5)));
      for (const [bx, by, bz, sx, sy, sz] of [[0, 0.03, 0, 0.34, 0.07, 1.62], [0, -0.55, 0.86, 0.34, 0.9, 0.07], [0, -0.55, -0.86, 0.34, 0.9, 0.07]]) {
        const bg = new THREE.BoxGeometry(sx, sy, sz); bg.rotateZ(sl); bg.translate(x + bx, y + by, z + bz); iron(clean(bg), '#6a5a34');
      }
      for (const side of [1, -1]) if (rng() < 0.7) { // a rag, hung from the cheek plate, ragged at the foot
        const w = 0.22 + rng() * 0.12, h = 0.5 + rng() * 0.5;
        const pg = new THREE.PlaneGeometry(w, h, 1, 2);
        const pp = pg.attributes.position; for (let q = 0; q < pp.count; q++) if (pp.getY(q) < 0) pp.setX(q, pp.getX(q) + jit(0.06));
        pg.rotateY(Math.PI / 2 + jit(0.4)); pg.rotateZ(jit(0.2)); pg.translate(x, y - 0.4 - h / 2, z + side * 0.9);
        rags.push(clean(pg));
      }
    }
    // the slings at each end: an iron eye in the pier's face and a chain down to the strut's end
    for (const [x, dir] of [[R.a, 1], [R.b, -1]]) {
      const y = R.y(x), z = R.zc(x);
      iron(box(x - 0.5 * dir - 0.25, x - 0.5 * dir + 0.25, y - 1.0, y - 0.4, z - 0.4, z + 0.4), '#3e3a36');
      for (let k = 0; k < 5; k++) iron(box(x + dir * (0.4 + k * 0.5) - 0.1, x + dir * (0.4 + k * 0.5) + 0.1, y - 1.1 - k * 0.45, y - 0.9 - k * 0.45, z - 0.07, z + 0.07), '#3a3430');
    }
    if (rags.length) {
      const rg = mergeGeometries(rags); for (const q of rags) q.dispose();
      const rm = new THREE.Mesh(rg, saffronMaterial()); rm.name = 'span-rags'; rm.castShadow = false; rm.receiveShadow = true;
      ctx.scene.add(rm); strutMeshes.push(rm);
    }
    // the cold light of it: the strut glows enough to see by at the middle
    const light = new THREE.PointLight(new THREE.Color('#6f9fd0'), 3, 20, 2);
    light.position.set(145.5, R.y(145.5) - 0.9, R.zc(145.5)); ctx.scene.add(light);
  }
  void metalParts; void hi; void addCol;
  K.vestigeMeshes = strutMeshes;
  return { at: vestigeAt, ways: VESTIGES };
}
