// The workers' rig (v7, living-workers): one mesh a figure, its parts moved in the vertex shader by a small array
// of bone matrices (uB), each vertex carrying the index of its bone (aBone). The matrices hold the figure's place
// in the world as well as each part's pose, so the mesh itself stays at the origin and every pose is a uniform
// write: no upload, no allocation. The shadow pass gets the same transform (a depth material of its own), and a
// pose change nudges the mesh's matrix by a part in a million so the shadow cadence (shadows.js), which reads
// only matrices, redraws the map at its turning cadence while a figure moves.
import * as THREE from 'three';
import { Painter } from '../../fauna/uncanny/kit.js';

export const BONES = 16;

const VERT_DECL = `attribute float aBone; uniform mat4 uB[${BONES}];`;
const VERT_POSE = `
  mat4 fpBone = uB[int(aBone + 0.5)];
  transformed = (fpBone * vec4(transformed, 1.0)).xyz;`;

// a Painter whose vertices carry aBone (set with .bone(k)) and, optionally, other scalars
export function rigPainter(extra = []) {
  const P = new Painter(['aBone', ...extra]);
  P.bone = (k) => P.set('aBone', k);
  return P;
}

// The painted material (vertex colour, metal, rough, emission per vertex, as the uncanny kit's) with the bones.
// `bones` is an array of BONES Matrix4s shared by the material and its depth twin.
export function rigMaterial(bones, { side = THREE.DoubleSide, key = 'fp-rig', sheen = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, side });
  const uB = { value: bones };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uB = uB;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec3 aMRE; varying vec3 vMRE; ${VERT_DECL}`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\nobjectNormal = mat3(uB[int(aBone + 0.5)]) * objectNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvMRE = aMRE;${VERT_POSE}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMRE;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMRE.y;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMRE.x;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vMRE.z;');
    // silk: a little light at the folds' grazing edges, more where the cloth is smoother (the Coheirs' dull sheen)
    if (sheen) sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      { float fr = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        reflectedLight.indirectDiffuse += diffuseColor.rgb * fr * 0.35 * (1.0 - vMRE.y); }`);
  };
  m.customProgramCacheKey = () => key + (sheen ? '-sheen' : '');
  return m;
}

export function rigDepthMaterial(bones, key = 'fp-rig-depth') {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const uB = { value: bones };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uB = uB;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>${VERT_POSE}`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// The mesh: at the origin, never culled by its (unposed) bounds, casting and receiving.
export function rigMesh(geo, bones, name, opts = {}) {
  const mesh = new THREE.Mesh(geo, rigMaterial(bones, opts));
  mesh.customDepthMaterial = rigDepthMaterial(bones);
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  let flip = 0;
  // tell the shadow cadence the pose moved (see the head of this file)
  mesh.userData.posed = () => { flip ^= 1; mesh.scale.x = 1 + flip * 1e-6; };
  return mesh;
}

export const makeBones = () => Array.from({ length: BONES }, () => new THREE.Matrix4());
export const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

// a pivot's pose: world = place * T(pivot) * R(rx, ry, rz) * T(-pivot), written into out (no allocation)
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _t = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
export function pivot(out, place, px, py, pz, rx, ry, rz, order = 'YXZ') {
  _e.set(rx, ry, rz, order); _q.setFromEuler(_e);
  _m.compose(_p.set(px, py, pz), _q, _one);
  _t.makeTranslation(-px, -py, -pz);
  return out.multiplyMatrices(place, _m).multiply(_t);
}
// a rigid part built from the origin along `rest` (a unit axis), set at `o` pointing along `dir`:
// out = parent * T(o) * R(rest -> dir)
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
export const DOWN = new THREE.Vector3(0, -1, 0), UP = new THREE.Vector3(0, 1, 0);
export function limb(out, parent, o, dir, rest = DOWN) {
  _b.copy(dir).normalize(); _q.setFromUnitVectors(rest, _b);
  _m.compose(o, _q, _one);
  return out.multiplyMatrices(parent, _m);
}
// A two-bone arm reaching from the shoulder S to the hand H (figure-local Vector3s), the elbow bowed toward
// `pole`: the upper arm (length a) and forearm (length b) are each built from their own origin along -y.
// The reach is clamped, so a hand too far away stops short along the same line.
const _d = new THREE.Vector3(), _E = new THREE.Vector3(), _pl = new THREE.Vector3(), _u = new THREE.Vector3(), _h = new THREE.Vector3();
export function arm2(outU, outF, parent, S, H, a, b, pole) {
  _d.subVectors(H, S);
  const d = _d.length() || 1e-6;
  _d.multiplyScalar(1 / d);
  const dn = Math.min(Math.max(d, Math.abs(a - b) + 1e-3), a + b - 1e-3);
  const x = (a * a - b * b + dn * dn) / (2 * dn), h = Math.sqrt(Math.max(0, a * a - x * x));
  _pl.copy(pole).addScaledVector(_d, -pole.dot(_d)).normalize();
  _E.copy(S).addScaledVector(_d, x).addScaledVector(_pl, h);
  limb(outU, parent, S, _u.subVectors(_E, S));
  _h.copy(S).addScaledVector(_d, dn);
  limb(outF, parent, _E, _u.subVectors(_h, _E));
  return _h; // where the hand ended up
}
// the figure's place: at (x, y, z) facing yaw (local +z forward)
export function placeMatrix(out, x, y, z, yaw) { return out.makeRotationY(yaw).setPosition(x, y, z); }
// wait for something another module builds (modules build in parallel); null after the timeout
export async function waitFor(fn, ms = 20000) {
  const t0 = performance.now();
  let v = fn();
  while (!v && performance.now() - t0 < ms) { await new Promise((r) => setTimeout(r, 50)); v = fn(); }
  return v || null;
}
// a module another flag leaves out: ?only= without it, or ?skip= with it
export function loaded(name) {
  const q = new URLSearchParams(location.search), only = q.get('only'), skip = (q.get('skip') || '').split(',');
  return !(only && !only.split(',').includes(name)) && !skip.includes(name);
}
export const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const ramp = (cur, target, rate, dt) => (cur < target ? Math.min(target, cur + rate * dt) : Math.max(target, cur - rate * dt));
