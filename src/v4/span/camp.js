// The find on the Span's middle deck (v12 H1; stories/the-wait-on-the-span.md): a camp on the run between the fen's
// way and the river's, against the north parapet at x 86 to 92, left as it was. Somebody crossed the thin ways and sat
// here to wait for the traveller who stopped at the first lip (the-traveller-on-the-span.md): a lean-to of his people's
// cloth (saffron, cream lining, madder border: cloth.js) over a rope between two poles against a fallen coping stone,
// with a torn valance and a wind-break, guyed to stones; a bedroll and a blanket of the same cloth, his tin cup's twin,
// the other volume of his book face down, a cold hearth, forty-one days of chalk on the stone; and twenty metres west,
// at the deck's west end where the fen's way arrives, a staff with a streamer of the cloth flying. Stone goes into the
// span's masonry mesh; cloth, the streamer, dark things, pale things and tin are five small meshes.
import * as THREE from 'three';
import { SPAN } from './plan.js';
import { box, clean } from './geo.js';
import { mergeGeometries } from '../kit/merge.js';
import { travellerCloth, swayingCloth, sheet } from './cloth.js';

const Y = SPAN.deckY;

export const CAMP = { x: 88.5, z: 210.3, block: [86.0, 91.6], days: 41 };

export function buildCamp(K) {
  const { ctx, rng, jit, body, addCol, hi } = K;
  const cloth = [], dark = [], pale = [], tin = [];
  const cyl = (list, x, y, z, r, h, rot = [0, 0, 0], seg = 8) => { const g = new THREE.CylinderGeometry(r, r, h, seg); g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(x, y, z); list.push(clean(g)); };

  // the coping stone against the parapet, in two pieces; its south face carries the days
  body.push(box(86.0, 89.0, Y, Y + 0.92, 208.35, 209.2), box(89.05, 91.6, Y, Y + 0.76, 208.35, 209.15));
  addCol({ x1: 86.4, z1: 208.8, x2: 91.2, z2: 208.8, r: 0.45, y: Y - 0.3, h: 1.2 });
  // forty-one strokes, in fives with the fifth across; the second row begins under the first
  for (let d = 0; d < CAMP.days; d++) {
    const gi = Math.floor(d / 5), k = d % 5, row = gi < 5 ? 0 : 1, gx = 86.3 + (gi % 5) * 0.64, y = Y + (row ? 0.28 : 0.56);
    if (k < 4) { const g = new THREE.BoxGeometry(0.018, 0.2 + jit(0.015), 0.012); g.rotateZ(jit(0.05)); g.translate(gx + k * 0.1, y, 209.205); pale.push(clean(g)); }
    else { const g = new THREE.BoxGeometry(0.46, 0.018, 0.012); g.rotateZ(-0.5); g.translate(gx + 0.15, y, 209.208); pale.push(clean(g)); }
  }
  // the lean-to: two poles forward with a rope between their tops, the sheet thrown over the rope and pegged back on the
  // stone, bellied between the poles; in front of the rope a hand of it hangs down as a valance, its hem torn. At the
  // west end a second, narrower piece is tied to the pole and hangs to the deck as a wind-break, gathered and torn.
  const P0 = 86.4, P1 = 90.8, RZ = 212.0, RY = Y + 1.95;
  for (const px of [P0, P1]) cyl(dark, px, Y + RY - Y - 0.78 + 0.02, RZ, 0.035, RY - Y + 0.06, [0, 0, jit(0.04)]);
  const ridge = (u) => RY - 0.16 * Math.sin(Math.PI * u); // the rope sags between the poles
  cloth.push(sheet((u, v) => { // v 0: the valance's torn hem; 0.22: the rope; 1: pegged on the stone's top
    const x = P0 - 0.15 + (P1 - P0 + 0.3) * u;
    if (v <= 0.22) { const d = (0.22 - v) / 0.22; return [x + 0.02 * Math.sin(u * 17), ridge(u) - 0.5 * d, RZ + 0.06 + 0.06 * d * Math.sin(u * 9 + 1)]; }
    const w = (v - 0.22) / 0.78, belly = 0.24 * Math.sin(Math.PI * u) * Math.sin(Math.PI * w) + 0.05 * Math.sin(u * 23) * Math.sin(Math.PI * w);
    return [x, ridge(u) * (1 - w) + (Y + 0.95) * w - belly, RZ + (208.95 - RZ) * w];
  }, 18, 10));
  cloth.push(sheet((u, v) => { // the wind-break, tied high at the west pole and pulled back to the stone's end
    // hung from the rope's end and the stone's corner, it falls in deep vertical folds and gathers where it is tied
    const d = 1 - v, fold = (0.16 + 0.1 * d) * Math.sin(u * 19) * (0.3 + 0.7 * Math.sin(Math.PI * u));
    const x = P0 - 0.12 + fold - 0.15 * d * d, z = RZ - 0.1 - 2.5 * u * (0.6 + 0.4 * v) + 0.06 * Math.sin(u * 19 + 1.5);
    return [x, RY - 0.08 - 1.6 * d * (1 - 0.3 * u * u) - 0.1 * Math.sin(Math.PI * u) * v, z];
  }, 24, 8));
  // guy ropes from the pole tops forward to stones on the deck
  for (const [px, gx] of [[P0, 85.7], [P1, 91.6]]) {
    const A = new THREE.Vector3(px, RY, RZ), B = new THREE.Vector3(gx, Y + 0.1, RZ + 1.5), L = A.distanceTo(B);
    const g = new THREE.CylinderGeometry(0.01, 0.01, L, 4); g.translate(0, L / 2, 0);
    g.applyMatrix4(new THREE.Matrix4().lookAt(B, A, new THREE.Vector3(0, 1, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)));
    g.translate(B.x, B.y, B.z); dark.push(clean(g));
    const st = new THREE.BoxGeometry(0.3, 0.2, 0.26); st.rotateY(rng()); st.translate(gx, Y + 0.1, RZ + 1.55); body.push(clean(st));
    // a walker does not pass through the rope, its stone or the pole: a low line along the rope's foot, the stone, the pole
    addCol({ x1: px, z1: RZ, x2: gx, z2: RZ + 1.5, r: 0.08, y: Y - 0.3, h: 1.2, stand: false });
    addCol({ x: px, z: RZ, r: 0.1, y: Y - 0.3, h: RY - Y + 0.3, stand: false });
  }
  // the bedroll (rolled, grey-brown), a blanket across it, the book, the cup
  cyl(dark, 88.3, Y + 0.19, 210.0, 0.19, 1.7, [0, 0, Math.PI / 2], 10);
  cloth.push(sheet((u, v) => { // a blanket of the same cloth, lining up, thrown back off the bedroll in folds
    const x = 90.0 - 1.4 * u, z = 210.25 + 0.95 * v; // (wound so the saffron is up)
    return [x + 0.05 * Math.sin(v * 7), Y + 0.025 + 0.06 * Math.max(0, Math.sin(u * 9 + v * 2)) + (v < 0.2 ? 0.2 * (0.2 - v) : 0), z];
  }, 10, 6));
  { const g = new THREE.BoxGeometry(0.18, 0.035, 0.26); g.rotateY(0.35); g.translate(89.5, Y + 0.075, 210.75); dark.push(clean(g)); // face down: the cover up
    const h = new THREE.BoxGeometry(0.17, 0.03, 0.25); h.rotateY(0.35); h.translate(89.5, Y + 0.052, 210.75); pale.push(clean(h)); }
  cyl(tin, 88.95, Y + 0.05, 211.1, 0.055, 0.1, [0, 0, 0], 10);
  // a cold hearth: seven stones round a disc of ash, two burnt ends
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3, g = new THREE.BoxGeometry(0.2 + rng() * 0.08, 0.14, 0.2 + rng() * 0.06); g.rotateY(rng() * 3); g.translate(88.0 + Math.cos(a) * 0.42, Y + 0.06, 213.4 + Math.sin(a) * 0.42); body.push(clean(g)); }
  cyl(dark, 88.0, Y + 0.012, 213.4, 0.33, 0.024, [0, 0, 0], 12);
  cyl(dark, 87.9, Y + 0.05, 213.45, 0.02, 0.4, [0, 0, 1.45]); cyl(dark, 88.15, Y + 0.05, 213.3, 0.018, 0.34, [0, 0.8, 1.5]);
  // the staff with its streamer, at the west end of the deck where the fen's way comes up, so that he would see it from
  // the far lip: a strip of the cloth two and a half metres long, tied at the top, flying out over the deck on the air
  // off the canyon; it moves by the swaying cloth's shader (cloth.js), no work a frame. From the camp it is twenty metres
  // back west.
  const SX = 66.6, SY = Y + 3.4, SZ = 210.9, SL = 2.5, SW = 0.3, NU = 2, NV = 16;
  cyl(dark, SX, Y + 1.75, SZ, 0.03, 3.5, [0.02, 0, -0.03]);
  const streamAt = (u, v) => { // v 1 at the knot, 0 the torn tail; it streams east and a little south, sagging, in waves
    const d = 1 - v, gust = 0.82;
    const wave = 0.16 * d * Math.sin(d * 7) + 0.05 * d * Math.sin(d * 15 + 1);
    const out = SL * d * gust, droop = SL * d * d * (1.05 - gust) * 0.9;
    return [SX + out * 0.92, SY - droop + (u - 0.5) * SW * (1 - 0.3 * d) * 0.85 + wave * 0.5, SZ + out * 0.38 + wave + (u - 0.5) * SW * 0.5];
  };
  const streamer = sheet(streamAt, NU, NV);
  addCol({ x: SX, z: SZ, r: 0.12, y: Y - 0.3, h: 3.4 });
  // the lean-to is not a floor and not a doorway
  addCol({ x1: 87.0, z1: 210.4, x2: 90.2, z2: 210.4, r: 0.55, y: Y - 0.3, h: 1.1, stand: false });

  const meshes = [];
  const add = (geos, mat, name) => {
    if (!geos.length) return;
    const g = mergeGeometries(geos); for (const q of geos) q.dispose();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = hi && name !== 'camp-pale'; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix(); ctx.scene.add(m); meshes.push(m);
  };
  add(cloth, travellerCloth(), 'camp-cloth');
  {
    const m = new THREE.Mesh(streamer, swayingCloth()); m.name = 'camp-streamer'; m.castShadow = hi; m.receiveShadow = true;
    streamer.computeBoundingSphere(); streamer.boundingSphere.radius += 0.6; // (the sway moves it up to half a metre)
    m.matrixAutoUpdate = false; ctx.scene.add(m); meshes.push(m);
  }
  add(dark, new THREE.MeshStandardMaterial({ color: '#40342b', roughness: 0.95 }), 'camp-dark');
  add(pale, new THREE.MeshStandardMaterial({ color: '#c9bfa6', roughness: 1 }), 'camp-pale');
  add(tin, new THREE.MeshStandardMaterial({ color: '#8c8f8d', roughness: 0.45, metalness: 0.7 }), 'camp-tin');
  K.campMeshes = meshes;
}
