// The glyph motif on the Outwash (v7): one of the Hypogeum's forms scratched on the sun-facing face of the erratic the
// region keeps at (75, -200) for it, about 35 cm tall, pale scratches lighter than the lichened granite, uneven and
// weathered. A thin decal: each stroke a ribbon of quads laid on the rock by casting onto the erratic's own triangles
// (its instance in `outwash-erratics`, the first the region places), 3 mm proud of it, no shadow.
import * as THREE from 'three';
import { prims } from './forms.js';

const AT = { x: 75, z: -200 }, TALL = 0.35, LIFT = 0.003, STEP = 0.012;

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
  const H = hit.p, s = TALL / 0.25; // the forms stand about 0.25 units tall
  const rng = ctx.makeRng(7404);
  const P = [], C = [], I = [], Nn = [];
  const onRock = (gx, gy) => {
    o.copy(H).addScaledVector(R, gx * s).addScaledVector(U, gy * s).addScaledVector(N, 0.6);
    return cast(o, d.copy(N).negate());
  };
  const pale = new THREE.Color('#cfc6b0');
  const put = (h, side, w, a) => {
    const v = h.p.clone().addScaledVector(side, w).addScaledVector(h.n, LIFT);
    P.push(v.x, v.y, v.z); Nn.push(h.n.x, h.n.y, h.n.z);
    C.push(pale.r * (0.85 + 0.15 * a), pale.g * (0.85 + 0.15 * a), pale.b * (0.85 + 0.15 * a), a);
  };
  const { segs, dots } = prims(form);
  for (const [ax, ay, bx, by] of segs) {
    const L = Math.hypot(bx - ax, by - ay) * s, n = Math.max(2, Math.ceil(L / STEP) + 1);
    const tx = (bx - ax) / (L / s), ty = (by - ay) / (L / s);
    let prev = -1;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1), h = onRock(ax + (bx - ax) * u, ay + (by - ay) * u);
      if (!h) { prev = -1; continue; }
      // the scratch: about 12 mm wide, wavering, and in places worn almost away
      const t = new THREE.Vector3().addScaledVector(R, tx).addScaledVector(U, ty), side = new THREE.Vector3().crossVectors(h.n, t).normalize();
      const w = 0.006 * (0.7 + 0.6 * rng()), a = Math.max(0.2, 0.85 * (0.55 + 0.45 * Math.sin(u * 23 + ax * 91 + rng() * 2)) * (0.75 + 0.25 * rng()));
      const base = P.length / 3;
      put(h, side, w, a); put(h, side, -w, a);
      if (prev >= 0) I.push(prev, prev + 1, base, prev + 1, base + 1, base);
      prev = base;
    }
  }
  for (const [x, y] of dots) {
    const h = onRock(x, y); if (!h) continue;
    const t = new THREE.Vector3().crossVectors(h.n, U).normalize(), b = new THREE.Vector3().crossVectors(h.n, t).normalize(), c0 = P.length / 3;
    put(h, t, 0, 0.8);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.2832, r = 0.012 * (0.8 + 0.4 * rng());
      const side = t.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
      put(h, side, r, 0.55 + 0.25 * rng());
    }
    for (let k = 0; k < 7; k++) I.push(c0, c0 + 1 + k, c0 + 1 + ((k + 1) % 7));
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
