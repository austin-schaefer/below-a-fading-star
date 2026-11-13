// The find on the Span's middle deck (v12 H1; stories/the-wait-on-the-span.md): a camp on the run between the fen's
// way and the river's, against the north parapet at x 86 to 92, left as it was. Somebody crossed the thin ways and sat
// here to wait for the traveller who stopped at the first lip (the-traveller-on-the-span.md): a lean-to of saffron cloth
// on two poles against a fallen coping stone, a bedroll, his tin cup's twin, the other volume of his book face down,
// a cold hearth, a staff with a streamer toward the west, and forty-one days of chalk on the stone. Stone goes
// into the span's masonry mesh; cloth, dark things, pale things and tin are four small meshes.
import * as THREE from 'three';
import { SPAN } from './plan.js';
import { box, clean } from './geo.js';
import { mergeGeometries } from '../kit/merge.js';
import { saffronMaterial } from './vestige.js';

const Y = SPAN.deckY;

export const CAMP = { x: 88.5, z: 210.3, block: [86.0, 91.6], days: 41 };

export function buildCamp(K) {
  const { ctx, rng, jit, body, addCol } = K;
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
  // the lean-to: two poles forward, the cloth falling back to the stone, bellied; a second, smaller cloth under it
  for (const px of [86.5, 90.7]) cyl(dark, px, Y + 0.78, 211.75, 0.03, 1.56, [0.08, 0, jit(0.04)]);
  {
    const g = new THREE.PlaneGeometry(1, 1, 8, 3), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;
      const sag = 0.2 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) + (u > 0.85 && v < 0.35 ? -0.12 * (u - 0.85) * 6 : 0);
      p.setXYZ(i, 86.3 + 4.6 * u, Y + 1.54 - 0.62 * v - sag + jit(0.01), 211.8 - 2.7 * v);
    }
    g.computeVertexNormals(); cloth.push(g.toNonIndexed());
  }
  // the bedroll (rolled, grey-brown), a blanket across it, the book, the cup
  cyl(dark, 88.3, Y + 0.19, 210.0, 0.19, 1.7, [0, 0, Math.PI / 2], 10);
  { const g = new THREE.BoxGeometry(1.3, 0.05, 0.7); g.rotateY(0.15); g.translate(89.3, Y + 0.03, 210.7); cloth.push(clean(g)); }
  { const g = new THREE.BoxGeometry(0.18, 0.035, 0.26); g.rotateY(0.35); g.translate(89.5, Y + 0.075, 210.75); dark.push(clean(g)); // face down: the cover up
    const h = new THREE.BoxGeometry(0.17, 0.03, 0.25); h.rotateY(0.35); h.translate(89.5, Y + 0.052, 210.75); pale.push(clean(h)); }
  cyl(tin, 88.95, Y + 0.05, 211.1, 0.055, 0.1, [0, 0, 0], 10);
  // a cold hearth: seven stones round a disc of ash, two burnt ends
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3, g = new THREE.BoxGeometry(0.2 + rng() * 0.08, 0.14, 0.2 + rng() * 0.06); g.rotateY(rng() * 3); g.translate(88.0 + Math.cos(a) * 0.42, Y + 0.06, 213.4 + Math.sin(a) * 0.42); body.push(clean(g)); }
  cyl(dark, 88.0, Y + 0.012, 213.4, 0.33, 0.024, [0, 0, 0], 12);
  cyl(dark, 87.9, Y + 0.05, 213.45, 0.02, 0.4, [0, 0, 1.45]); cyl(dark, 88.15, Y + 0.05, 213.3, 0.018, 0.34, [0, 0.8, 1.5]);
  // the staff with its streamer, pointing the way he should have come: it hangs toward the west
  cyl(dark, 85.2, Y + 1.25, 211.4, 0.025, 2.5, [0, 0, -0.03]);
  { const g = new THREE.PlaneGeometry(0.8, 0.18, 4, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.4; p.setZ(i, Math.sin(u * 5) * 0.06); p.setY(i, p.getY(i) * (1 - 0.35 * u)); }
    g.translate(-0.4, 0, 0); g.computeVertexNormals(); g.rotateY(0.08); g.translate(85.19, Y + 2.28, 211.4); cloth.push(g.toNonIndexed()); }
  addCol({ x: 85.2, z: 211.4, r: 0.12, y: Y - 0.3, h: 2.4 });
  // the lean-to is not a floor and not a doorway
  addCol({ x1: 87.0, z1: 210.4, x2: 90.2, z2: 210.4, r: 0.55, y: Y - 0.3, h: 1.1, stand: false });

  const meshes = [];
  const add = (geos, mat, name) => {
    if (!geos.length) return;
    const g = mergeGeometries(geos); for (const q of geos) q.dispose();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = name !== 'camp-pale'; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix(); ctx.scene.add(m); meshes.push(m);
  };
  add(cloth, saffronMaterial(), 'camp-cloth');
  add(dark, new THREE.MeshStandardMaterial({ color: '#40342b', roughness: 0.95 }), 'camp-dark');
  add(pale, new THREE.MeshStandardMaterial({ color: '#c9bfa6', roughness: 1 }), 'camp-pale');
  add(tin, new THREE.MeshStandardMaterial({ color: '#8c8f8d', roughness: 0.45, metalness: 0.7 }), 'camp-tin');
  K.campMeshes = meshes;
}
