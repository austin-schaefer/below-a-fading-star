// The threads' small kit, over v5's accumulator (src/v5/dressing/kit.js Acc): a placed frame on the ground, a limb
// between two points, ellipsoids, and where a prop's underside meets what is under it (ground, paving or a deck).
import * as THREE from 'three';
import { Acc, mat } from '../../v5/dressing/kit.js';
export { Acc, mat };

const _q = new THREE.Quaternion(), _u = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const SPH = new THREE.SphereGeometry(1, 10, 7), SPH_LO = new THREE.SphereGeometry(1, 7, 5), CYL = new THREE.CylinderGeometry(1, 1, 1, 8, 1);

// a frame at (x, y, z) turned by yaw about the up axis and then tilted so its up is n (the ground's normal)
export function frame(x, y, z, yaw = 0, n = null) {
  const m = new THREE.Matrix4().makeRotationY(yaw);
  if (n) m.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(_q.setFromUnitVectors(_u, _v.set(n.x, n.y, n.z).normalize())));
  return m.setPosition(x, y, z);
}
// a matrix in a parent frame: local translate, rotate (YXZ), scale (a number or [sx, sy, sz])
export function local(parent, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  const m = mat(x, y, z, rx, ry, rz, 1);
  if (Array.isArray(s)) m.scale(_s.set(s[0], s[1], s[2])); else if (s !== 1) m.scale(_s.set(s, s, s));
  return parent ? parent.clone().multiply(m) : m;
}
export function ellipsoid(acc, parent, x, y, z, rx, ry, rz, color, o = {}) {
  acc.add(o.low ? SPH_LO : SPH, local(parent, x, y, z, o.ax || 0, o.ay || 0, o.az || 0, [rx, ry, rz]), color, o.jitter ?? 0.06);
}
// a round rod from a to b (local points [x, y, z]) of radius r0 at a and r1 at b
export function rod(acc, parent, a, b, r0, color, r1 = r0, jitter = 0.06, sides = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  if (L < 1e-5) return;
  const g = sides === 8 && r0 === r1 ? CYL : new THREE.CylinderGeometry(r1 / r0, 1, 1, sides, 1);
  const m = new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_u, d.normalize()), _s.set(r0, L, r0));
  acc.add(g, parent ? parent.clone().multiply(m) : m, color, jitter);
}
export function boxAt(acc, parent, w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0, jitter = 0.06) {
  acc.add(new THREE.BoxGeometry(w, h, d), local(parent, x, y, z, rx, ry, rz), color, jitter);
}

// the highest surface under (x, z) among `objs` (raycast from above), else the drawn terrain's (meshGround)
const _ray = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3(0, -1, 0);
export function surfaceAt(x, z, objs, fallback, from = 400) {
  _o.set(x, from, z); _ray.set(_o, _d); _ray.far = from + 200;
  let best = -Infinity;
  for (const o of objs) { if (!o) continue; const h = _ray.intersectObject(o, false)[0]; if (h && h.point.y > best) best = h.point.y; }
  return best > -Infinity ? best : fallback(x, z);
}

export function finish(ctx, acc, name, o = {}) {
  const mesh = new THREE.Mesh(acc.geometry(), o.material || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.88, metalness: o.metal ?? 0, side: THREE.DoubleSide }));
  mesh.name = name; mesh.castShadow = o.cast ?? true; mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  return mesh;
}
