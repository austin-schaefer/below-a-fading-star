// DF The Unfinished Prospect [Decided, time-boxed] (IDEAS-v5.md DF; Hubert Robert): at the brow of the High Ling, looking
// west over the bowl, an easel with a canvas of that exact view, carefully painted, except that the painted sun is small
// and white and the sky blue. A stool, a small table with dishes of paint dried hard, a palette with a brush across it.
//
// The canvas is a baked render (prospect-canvas.png, 512 x 384, 66 KB beside this file): the real view from (238, -30) at eye
// height, yaw 1.74 (10 degrees south of west, so the sun is in frame), a 40 degree field, rendered headless from the build
// without this module, its sky masked from a second render (sky hidden, everything else black on white), then repainted:
// sky a daylight blue with a few soft clouds, a small white sun with a halo where the red one stands, the land cooled and
// lightened, painted over (`-paint 2`) and softened. It is the only image the prototype loads, on the canvas plane only;
// if it fails to load, the plane is a flat dull ground and the rest stands.
//
// Two meshes: the furniture (one merged vertex-coloured mesh, casting shadows) and the canvas plane. One collider, on the
// easel. Static.
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { Acc, mat } from './kit.js';

const OFF = typeof location !== 'undefined' && (() => { const q = new URLSearchParams(location.search); return q.get('dressing5') === '0' || q.get('prospect') === '0'; })();
const YAW = 1.74; // the painter looks along (-sin, -cos) = west, a little south
export const PROSPECT = { x: SITES.prospect.x, z: SITES.prospect.z, yaw: YAW, canvas: [1.44, 1.08] };
const FX = -Math.sin(YAW), FZ = -Math.cos(YAW); // forward, the way the painter looks
const RX = Math.cos(YAW), RZ = -Math.sin(YAW);  // the painter's right
// b metres behind the easel (toward the painter), r to the painter's right
export const prospectAt = (b, r) => [PROSPECT.x - FX * b + RX * r, PROSPECT.z - FZ * b + RZ * r];
// the ground cover keeps off the easel, the stool and the table
export function prospectClear(x, z) {
  if (OFF) return false;
  const dx = x - PROSPECT.x, dz = z - PROSPECT.z, b = -(dx * FX + dz * FZ), r = dx * RX + dz * RZ;
  return b > -1.2 && b < 2.2 && r > -1.2 && r < 2.0;
}

const strut = (acc, a, b, t, color, j) => { // a box of thickness t from a to b
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  acc.box(t, len, t, new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), color, j);
};

export async function buildProspect(ctx) {
  const rng = ctx.makeRng(5404), H = (x, z) => ctx.terrain.heightAt(x, z);
  const acc = new Acc(rng);
  // an object frame at (b, r): local +z toward the painter, +x to the painter's right, y up from the ground there
  const frame = (b, r, lift = 0) => { const [x, z] = prospectAt(b, r); return new THREE.Matrix4().compose(new THREE.Vector3(x, H(x, z) + lift, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), YAW), new THREE.Vector3(1, 1, 1)); };
  const wood = '#5b4838', dark = '#3f3228', pale = '#7a6650';
  const part = (F) => (p, q, t, c, j) => strut(acc, new THREE.Vector3(...p).applyMatrix4(F).toArray(), new THREE.Vector3(...q).applyMatrix4(F).toArray(), t, c, j);
  const on = (F, w, h, d, p, c, j, rot) => acc.box(w, h, d, F.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(1, 1, 1))), c, j);

  // the easel: an A-frame leaning a little back toward the view, a shelf, a head clamp, a rear leg
  const E = frame(0, 0, 0), ep = part(E);
  ep([-0.72, -0.06, 0.2], [-0.08, 2.2, -0.12], 0.06, wood, 0.1);
  ep([0.72, -0.06, 0.2], [0.08, 2.2, -0.12], 0.06, wood, 0.1);
  ep([0, 2.15, -0.14], [0, -0.06, -1.0], 0.055, dark, 0.1);
  ep([-0.66, 0.5, 0.15], [0.66, 0.5, 0.15], 0.045, dark, 0.1); // the cross-bar
  on(E, 1.6, 0.045, 0.2, [0, 0.8, 0.2], wood, 0.08, [-0.1, 0, 0]); // the shelf the canvas rests on
  on(E, 0.09, 0.06, 0.12, [0, 2.12, 0.0], dark, 0.1);          // the clamp at the head
  // the canvas: a stretcher frame and a back, leaning with the legs and standing proud of them; the painted plane goes in front
  const [cw, ch] = PROSPECT.canvas, lean = -0.1, cy = 0.83 + ch / 2 + 0.03;
  const C = E.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, cy, 0.1), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lean), new THREE.Vector3(1, 1, 1)));
  on(C, cw + 0.03, ch + 0.03, 0.02, [0, 0, 0], '#8a7a62', 0.04);
  for (const s of [-1, 1]) { on(C, 0.04, ch + 0.04, 0.045, [s * (cw / 2 + 0.01), 0, 0.012], pale, 0.08); on(C, cw + 0.04, 0.04, 0.045, [0, s * (ch / 2 + 0.01), 0.012], pale, 0.08); }
  // the stool: a round seat on three splayed legs, behind the easel, to the painter's left
  { const [sx, sz] = prospectAt(1.5, -0.1), g = H(sx, sz), S = frame(1.5, -0.1), sp = part(S);
    acc.add(new THREE.CylinderGeometry(0.19, 0.19, 0.045, 12), S.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0)), wood, 0.08);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.4; sp([Math.cos(a) * 0.12, 0.5, Math.sin(a) * 0.12], [Math.cos(a) * 0.26, -0.06, Math.sin(a) * 0.26], 0.04, dark, 0.1); }
    void g; }
  // the small table, to the painter's right: dishes of paint dried hard, a palette, a brush laid across it
  { const T = frame(0.9, 1.35), tp = part(T), ty = 0.7, top = ty + 0.0175;
    on(T, 0.9, 0.035, 0.55, [0, ty, 0], wood, 0.08);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) tp([sx * 0.38, ty - 0.02, sz * 0.22], [sx * 0.43, -0.07, sz * 0.25], 0.04, dark, 0.1);
    const dish = new THREE.CylinderGeometry(0.052, 0.04, 0.022, 10), pigment = new THREE.CylinderGeometry(0.043, 0.043, 0.006, 10);
    const dull = ['#8a6a32', '#4b3425', '#47586a', '#5b6847', '#6d3b34'];
    const at = (x, y, z, ry = 0) => T.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1)));
    for (let i = 0; i < 5; i++) {
      acc.add(dish, at(-0.37 + i * 0.105, top + 0.011, -0.14), '#716b62', 0.08);
      acc.add(pigment, at(-0.37 + i * 0.105, top + 0.021, -0.14), dull[i], 0.1);
    }
    // the palette: a flat board, kidney-ish, with six dabs gone hard round its edge
    const pal = at(0.2, top + 0.006, 0.1, 0.5).multiply(new THREE.Matrix4().makeScale(1, 1, 0.7));
    acc.add(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 14), pal, '#5d4634', 0.06);
    for (let i = 0; i < 6; i++) { const a = 1.0 + i * 0.75; acc.add(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 7), at(0.2 + Math.cos(a + 0.5) * 0.1, top + 0.015, 0.1 + Math.sin(a + 0.5) * 0.07), dull[(i + 2) % 5], 0.12); }
    const bp = (x, z, y) => new THREE.Vector3(x, y, z).applyMatrix4(T).toArray(), by = top + 0.026;
    strut(acc, bp(0.1, 0.24, by), bp(0.37, 0.0, by), 0.009, '#4a3a2c', 0.08); // the handle
    strut(acc, bp(0.0, 0.17, by), bp(0.1, 0.24, by), 0.0125, '#7d8084', 0.05); // the ferrule
    strut(acc, bp(-0.06, 0.13, by), bp(0.0, 0.17, by), 0.011, '#8a6a32', 0.1); // the bristles, dried stiff
  }
  const furniture = new THREE.Mesh(acc.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  furniture.name = 'prospect'; furniture.castShadow = true; furniture.receiveShadow = true;
  ctx.scene.add(furniture);

  // the painted view, on the canvas plane only
  let map = null;
  try { map = await new THREE.TextureLoader().loadAsync(new URL('./prospect-canvas.png', import.meta.url).href); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; }
  catch (e) { console.warn('[fp] prospect canvas not loaded:', e?.message || e); }
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.04, ch - 0.04), new THREE.MeshBasicMaterial(map ? { map, color: 0xa8a8a8 } : { color: 0x55545c }));
  plane.applyMatrix4(C.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.0235)));
  plane.name = 'prospect-canvas'; plane.receiveShadow = false;
  ctx.scene.add(plane);
  const [ex, ez] = prospectAt(0.0, 0);
  const collider = { x: ex, z: ez, r: 0.55, y: H(ex, ez) - 0.3, h: 2.4 };
  ctx.addCollider(collider);
  return { furniture, plane, meshes: [furniture, plane], map, collider };
}
