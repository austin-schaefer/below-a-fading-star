// The kit's test scene (?only=kit, never loaded otherwise): one of each piece on the open moor north of the
// keep, so the kit can be rendered and walked before any wonder uses it. A diminishing stair (BL) climbs a
// cyclopean platform; behind it a pier in courses that shrink as they rise, with a bronze channel gone to
// verdigris; a block set with black glass; three robed figures for measure; rooks wheeling round the pier.
import * as THREE from 'three';
import { mergeGeometries } from './merge.js';

export const KIT_DEMO = { x: -20, z: -50 };

export async function build(ctx) {
  const { scene, terrain, kit } = ctx;
  const X = KIT_DEMO.x, Z = KIT_DEMO.z, y0 = terrain.heightAt(X, Z);
  // the stair: 26 steps climbing north, each 3% smaller than the last, a landing after 13, two treads broken
  const stair = kit.stair({ x: X, z: Z, y: y0, heading: 0, width: 5, steps: 26, rise: 0.34, run: 0.62, diminish: 0.97,
    landingEvery: 13, landing: 2.4, wear: 0.8, broken: [5, 19], rng: ctx.makeRng(7101) }, ctx);
  const top = stair.top;
  const stone = kit.masonry({ color: '#7d7166', course: 1.1, base: y0, diminish: 0.97, wear: 0.8, moss: 0.6 });
  // the platform the stair arrives on, and the pier behind it
  const box = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1); g.translate(x, y, z); return g.toNonIndexed(); };
  const platform = box(16, top.y - y0 + 3, 12, X, (top.y + y0 - 3) / 2, top.z - 6);
  const stairMesh = new THREE.Mesh(mergeGeometries([stair.geometry, platform]), stone.mat);
  stairMesh.castShadow = true; stairMesh.receiveShadow = true; stairMesh.name = 'kit-demo-stair';
  scene.add(stairMesh);
  const pierMat = kit.masonry({ color: '#6f675f', course: 2.6, base: top.y, diminish: 0.94, wear: 0.6, moss: 0.3, inlay: 'bronze', inlayEvery: 0.3 });
  const pier = new THREE.Mesh(box(7, 30, 7, X, top.y + 15, top.z - 8), pierMat.mat);
  pier.castShadow = true; pier.receiveShadow = true; pier.name = 'kit-demo-pier';
  scene.add(pier);
  const glassMat = kit.masonry({ color: '#857a6c', course: 1.8, base: y0, wear: 0.5, inlay: 'glass', inlayEvery: 0.35 });
  const glass = new THREE.Mesh(box(9, 5.4, 4, X + 12, y0 + 2.2, Z - 4), glassMat.mat);
  glass.castShadow = true; glass.receiveShadow = true; glass.name = 'kit-demo-glass';
  scene.add(glass);
  // walk it: the stair and the platform's top
  ctx.addWalkable(stair.walkable);
  ctx.addWalkable((x, z) => (Math.abs(x - X) < 8 && z < top.z && z > top.z - 12 ? top.y : null));
  ctx.addCollider({ x: X, z: top.z - 8, r: 4.6 });
  ctx.addCollider({ x: X + 12, z: Z - 4, r: 4.2, y: y0 - 1, h: 6.4 });
  // measure: one at the foot, one on the landing, one on the platform
  const land = stair.steps[13];
  scene.add(kit.measureFigures([
    { x: X - 1.2, z: Z + 1.6, yaw: 0.3 },
    { x: X + 1, z: Z - (land.s0 + 0.8), y: land.y, yaw: 2.6 },
    { x: X + 4.5, z: top.z - 3, y: top.y, yaw: -0.4 },
  ], {}, ctx));
  const rooks = kit.rookWheel({ x: X, z: top.z - 8, y: top.y + 26, r: 22, count: 12 }, ctx);
  scene.add(rooks.mesh);
  ctx.kitDemo = { stair, top, rooks };
}
