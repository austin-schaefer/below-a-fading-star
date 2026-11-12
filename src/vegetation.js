// Vegetation: grass, heather, bracken, flower spikes, fleshy leaves, reeds and sedge (chunked,
// one draw call per kind); every tree, thicket, fallen trunk and lichen mound (one BatchedMesh with
// distance LOD); toadstools and glowing seed-pods; and the Lattice, F9AC's crystal growth below
// the glacier. Fungi, pods and crystals glow brighter as the sun gutters.
import * as THREE from 'three';
import { makeGround } from './vegetation/ground.js';
import { buildPlants } from './vegetation/plants.js';
import { buildTrees, buildToadstools, makeAtlas, makeTreeMaterials } from './vegetation/trees.js';
import { buildLattice } from './vegetation/lattice.js';

export async function build(ctx) {
  const T = [performance.now()];
  const lap = () => { T.push(performance.now()); return (T[T.length - 1] - T[T.length - 2]).toFixed(0); };
  const shared = { time: { value: 0 } };

  await ctx.progress?.('combing the grass', 0.1);
  const ground = makeGround(ctx);
  const tGround = lap();
  await ctx.progress?.('growing the wood', 0.3);
  const mats = makeTreeMaterials(ctx, makeAtlas(ctx.makeRng(4001)));
  const trees = buildTrees(ctx, ground, mats);
  const fungi = buildToadstools(ctx, ground, mats, trees);
  ctx.woodTrees = trees.trees.filter((t) => t.kind === 'wood' && !t.hidden); // the Deodand Wood's trees, { x, y, z, h }: the shafts fall from their crowns (v8/shafts.js)
  const tTrees = lap();
  await ctx.progress?.('sowing the heather and the reeds', 0.6);
  const plants = buildPlants(ctx, ground, shared);
  const tPlants = lap();
  await ctx.progress?.('seeding the Lattice', 0.85);
  const lattice = buildLattice(ctx, ground, shared);
  const tLattice = lap();

  // Per frame: wind time, chunk packing against the view frustum, tree LOD, flicker-driven glow.
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4();
  const cam = ctx.camera;
  ctx.registerUpdate((dt, t) => {
    shared.time.value = t;
    cam.updateMatrixWorld();
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const px = ctx.player.pos.x, pz = ctx.player.pos.z;
    plants.update(px, pz, frustum);
    trees.update(px, pz);
    fungi.update(px, pz);
    const f = ctx.sky.flicker.value;
    mats.glow.value = 0.08 + 1.5 * Math.max(0, 1 - f);
    lattice.update(f);
  });
  // Prime the buffers so the first frame is already filled.
  {
    cam.updateMatrixWorld();
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    plants.update(ctx.player.pos.x, ctx.player.pos.z, frustum);
    trees.update(ctx.player.pos.x, ctx.player.pos.z);
    fungi.update(ctx.player.pos.x, ctx.player.pos.z);
  }

  const total = (T[T.length - 1] - T[0]).toFixed(0);
  ctx.log(`vegetation: built in ${total}ms (ground ${tGround}, trees+fungi ${tTrees}, plants ${tPlants} [gen ${plants.genMs.toFixed(0)}], lattice ${tLattice})`);
  ctx.log('vegetation trees:', JSON.stringify(trees.stats));
  ctx.log('vegetation fungi:', JSON.stringify({ toadstools: fungi.count, pods: fungi.pods, tris: fungi.tris }));
  ctx.log('vegetation lattice:', JSON.stringify(lattice.stats));
  ctx.log('vegetation plants:', JSON.stringify(plants.stats()));
  // for the screenshot tool and the console
  window.__vegParts = { plants, trees, fungi, lattice };
  window.__vegStats = () => ({ plants: plants.stats(), trees: trees.stats, lattice: lattice.stats, fungi: { toadstools: fungi.count, pods: fungi.pods } });
}
