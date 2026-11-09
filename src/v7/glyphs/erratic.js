// The glyph motif on the Outwash (v7): one of the Hypogeum's forms scratched on the sun-facing face of the erratic the
// region keeps at (75, -200) for it, 35 cm tall, uneven and weathered. A thin decal: each stroke a ribbon of quads laid
// on the rock by casting onto the erratic's own triangles (its instance in `outwash-erratics`, the first the region
// places), a few mm proud of it, no shadow. v7.1, cut to read from 10 m: each stroke a deep incision, a dark band (the
// groove's shaded wall, set a little below and away from the sun) under a pale fill, as if salt or lichen had taken the
// scratch; the form scaled to the brief's 35 cm from its own height.
import * as THREE from 'three';
import { prims } from './forms.js';

const AT = { x: 75, z: -200 }, TALL = 0.35, LIFT = 0.003, LIFT_FILL = 0.005, STEP = 0.012;
const FILL_W = 0.011, CUT_W = 0.02, CUT_DROP = 0.007; // half-widths (m) and the dark band's drop

export function buildErraticGlyph(ctx, errMesh, form) {
  const { scene } = ctx;
  // the first instance is the one at (75, -200); check, in case the region's list ever changes
  const M = new THREE.Matrix4(), p = new THREE.Vector3();
  let idx = -1;
  for (let i = 0; i < errMesh.count; i++) { errMesh.getMatrixAt(i, M); p.setFromMatrixPosition(M); if (Math.hypot(p.x - AT.x, p.z - AT.z) < 1.5) { idx = i; break; } }
  if (idx < 0) return null;
  errMesh.getMatrixAt(idx, M);
  const rock = new THREE.Mesh(errMesh.geometry, new THREE.MeshBasicMaterial());
  rock.matrixAutoUpdate = false; rock.matrix.copy(errMesh.matrixWorld).multiply(M); rock.matrixWorld.copy(rock.matrix);
  const centre = new THREE.Vector3().setFromMatrixPosition(M);
  const ray = new THREE.Raycaster(), o = new THREE.Vector3(), d = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(rock.matrixWorld);
  const cast = (from, dir) => { ray.set(from, dir); ray.far = 8; const h = ray.intersectObject(rock, false)[0]; if (!h) return null; return { p: h.point.clone(), n: h.face.normal.clone().applyMatrix3(nm).normalize() }; };

  // the face: toward the sun along the ground, at a standing man's chest
  const sd = ctx.sun?.dir || { x: -0.91, y: 0.23, z: 0.33 };
  const sh = new THREE.Vector3(sd.x, 0, sd.z).normalize();
  const y0 = centre.y + 1.25;
  const hit = cast(o.set(centre.x + sh.x * 6, y0, centre.z + sh.z * 6), d.copy(sh).negate());
  if (!hit) return null;
  // the decal's frame: its normal the face's (leaned toward the sun's horizontal), up the world's up off it
  const N = hit.n.clone().lerp(sh, 0.4).normalize(), U = new THREE.Vector3(0, 1, 0).addScaledVector(N, -N.y).normalize(), R = new THREE.Vector3().crossVectors(U, N).normalize();
  // the form's own height in glyph units, so it stands TALL whatever its proportions
  const pr = prims(form);
  let y0u = Infinity, y1u = -Infinity;
  for (const [, ay, , by] of pr.segs) { y0u = Math.min(y0u, ay, by); y1u = Math.max(y1u, ay, by); }
  for (const [, y] of pr.dots) { y0u = Math.min(y0u, y); y1u = Math.max(y1u, y); }
  const H = hit.p, s = TALL / Math.max(0.05, y1u - y0u);
  const rng = ctx.makeRng(7404);
  const P = [], C = [], I = [], Nn = [];
  const onRock = (gx, gy) => {
    o.copy(H).addScaledVector(R, gx * s).addScaledVector(U, gy * s).addScaledVector(N, 0.6);
    return cast(o, d.copy(N).negate());
  };
  // salt and lichen in the scratch (pale, a little warm), and the groove's shaded wall (near-black, the granite's brown)
  const pale = new THREE.Color('#e6dfcc'), dark = new THREE.Color('#14100c');
  const down = new THREE.Vector3();
  // put(h, side, w, a, cut): a vertex w along side from the hit; the cut band sits a hand lower (down the face, the way
  // the light does not reach), the fill a little prouder so it draws over it
  const put = (h, side, w, a, cut) => {
    const v = h.p.clone().addScaledVector(side, w).addScaledVector(h.n, cut ? LIFT : LIFT_FILL);
    if (cut) v.addScaledVector(down.copy(U).addScaledVector(h.n, -U.dot(h.n)).normalize(), -CUT_DROP);
    P.push(v.x, v.y, v.z); Nn.push(h.n.x, h.n.y, h.n.z);
    if (cut) C.push(dark.r, dark.g, dark.b, 0.8 * a);
    else C.push(pale.r * (0.88 + 0.12 * a), pale.g * (0.88 + 0.12 * a), pale.b * (0.88 + 0.12 * a), Math.min(1, 0.35 + a));
  };
  const { segs, dots } = pr;
  // the strokes' samples first (both layers use the same hits and the same wear), then the layers: cut, then fill
  const strokes = [];
  for (const [ax, ay, bx, by] of segs) {
    const L = Math.hypot(bx - ax, by - ay) * s, n = Math.max(2, Math.ceil(L / STEP) + 1);
    const tx = (bx - ax) / (L / s), ty = (by - ay) / (L / s);
    const row = [];
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1), h = onRock(ax + (bx - ax) * u, ay + (by - ay) * u);
      if (!h) { row.push(null); continue; }
      // the scratch wavers, and in places is worn shallower
      const t = new THREE.Vector3().addScaledVector(R, tx).addScaledVector(U, ty), side = new THREE.Vector3().crossVectors(h.n, t).normalize();
      const ww = 0.8 + 0.4 * rng(), a = Math.max(0.35, 0.9 * (0.6 + 0.4 * Math.sin(u * 23 + ax * 91 + rng() * 2)) * (0.8 + 0.2 * rng()));
      row.push({ h, side, ww, a });
    }
    strokes.push(row);
  }
  for (const cut of [true, false]) {
    for (const row of strokes) {
      let prev = -1;
      for (const o of row) {
        if (!o) { prev = -1; continue; }
        const w = (cut ? CUT_W : FILL_W) * o.ww, base = P.length / 3;
        put(o.h, o.side, w, o.a, cut); put(o.h, o.side, -w, o.a, cut);
        if (prev >= 0) I.push(prev, prev + 1, base, prev + 1, base + 1, base);
        prev = base;
      }
    }
    for (const [x, y] of dots) {
      const h = onRock(x, y); if (!h) continue;
      const t = new THREE.Vector3().crossVectors(h.n, U).normalize(), b = new THREE.Vector3().crossVectors(h.n, t).normalize(), c0 = P.length / 3;
      put(h, t, 0, 0.9, cut);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * 6.2832, r = (cut ? 0.03 : 0.019) * (0.85 + 0.3 * rng());
        const side = t.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
        put(h, side, r, 0.7 + 0.2 * rng(), cut);
      }
      for (let k = 0; k < 9; k++) I.push(c0, c0 + 1 + k, c0 + 1 + ((k + 1) % 9));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 4));
  g.setIndex(I); g.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, transparent: true, depthWrite: false, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'living-glyph-erratic'; mesh.castShadow = false; mesh.receiveShadow = true; mesh.renderOrder = 2;
  scene.add(mesh);

  // how far the decal lies off the rock: every vertex cast back onto it along its normal
  function offRock() {
    const pa = g.attributes.position, na = g.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
    let w = 0, miss = 0;
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i); n.fromBufferAttribute(na, i);
      const h = cast(o.copy(v).addScaledVector(n, 0.1), d.copy(n).negate());
      if (!h) { miss++; continue; }
      w = Math.max(w, Math.abs(h.p.distanceTo(v)));
    }
    return { worst: w, miss, n: pa.count };
  }
  return { mesh, form, at: { x: H.x, y: H.y, z: H.z }, normal: { x: N.x, y: N.y, z: N.z }, offRock, tris: I.length / 3 };
}
