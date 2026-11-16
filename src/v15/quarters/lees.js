// The Lees (v15-Q3): the Lappet's quarter on the bench, the village's main square. Builds after the bones
// (ctx.lappet: the plan, the vaults behind the shop plots) with the houses' kit (src/v15/houses/). ?lees=0 turns it off.
//
//   lees/fountain.js  the fountain of noon: a vessel's broken foot with stored daylight welling in it, its kerb,
//                     flasks, the Swape, the Leerie's slate, a bench against the warm glass, a vine
//   lees/square.js    the floor (the Heliarchs' way of hexagons, robbed and made good in cobble; Late flags; earth),
//                     the gutter the light runs off in and its spout, the Wanting Arch at the old way's head, the
//                     worn line of flags along the shops
//   lees/shops.js     the Lagan, the Ullage and the Welt in the Low Rung's vaults, the Tare on the square, the Rebate
//   lees/light.js     how the light is drawn: the quarter's own instance of the stone shader, the bake, the haze
//
// Two draws: `lees` (everything of stone, plaster, timber and glass) and `lees-noon` (the light as light, additive).
// No point light (light.js says why). Both meshes are on ctx.lappet.farHidden (low does not draw them from far off).
// ctx.lees = { fountain, arch, records, places (what is left for people and goods: batch 3), stats() }.
import * as THREE from 'three';
import { registerAll } from '../houses/index.js';
import { hangLamp } from '../houses/kit.js';
import { leesStone, noonGlow, bakeNoon } from './lees/light.js';
import { fountain, YS } from './lees/fountain.js';
import { ground, arch } from './lees/square.js';
import { shops } from './lees/shops.js';
import { bakeLamps } from './lees/goods.js';

export async function build(ctx) {
  if (new URL(location.href).searchParams.get('lees') === '0') { ctx.lees = { off: true }; return; }
  if (ctx.built) await Promise.all([ctx.built('lappet'), ctx.built('villagerow')]); // (the bones' vaults; the row's kerb, which the square's floor is laid up to)
  if (!ctx.lappet || ctx.lappet.on === false || !ctx.strata?.on) { ctx.lees = { off: true }; return; }
  const plan = ctx.lappet.plan, low = ctx.quality === 'low', fp = plan.plot('fountain');
  const B = ctx.strata.builder(), G = noonGlow();
  const Q = { ctx, plan, B, G, low, Y: plan.LEVEL.bench.y + 0.06, places: [], records: [], lampSrc: [], extraLamps: [] };
  const f = fountain(Q, fp), F = { ...f, s: fp.s, D: fp.D };
  Q.records.push(f.R);
  const floor = ground(Q, F), gate = arch(Q, F);
  shops(Q);
  for (const R of Q.records) R.lamps.forEach((lamp, i) => hangLamp(B, lamp, ['amber', 'ruby', 'amber', 'emerald'][(R.seed + i) % 4], 0.5));
  bakeNoon(B, 0, B.count, { x: f.x, z: f.z, y: Q.Y, ys: Q.Y + YS, r: 13 }, { heavy: 0.42, pool: 0.4 });
  for (const l of Q.extraLamps) { hangLamp(B, l, l.glass, 0.6); Q.lampSrc.push({ x: l.x, y: l.y - 0.28, z: l.z, r: 5.5, k: 0.8, col: [1, 0.74, 0.42] }); }
  for (const R of Q.records) for (const l of R.lamps) Q.lampSrc.push({ x: l.x, y: l.y - 0.28, z: l.z, r: 4.2, k: 0.6, col: [1, 0.74, 0.42] });
  bakeLamps(B, 0, B.count, Q.lampSrc); // (no point light: each shop's lamp and lit room are baked onto its own goods, board and flags)
  registerAll(ctx, Q.records, 'lees');
  const stone = leesStone(ctx, f.x, f.z), tris = B.triangles + G.triangles;
  const mesh = new THREE.Mesh(B.build(), stone.mat); mesh.name = 'lees'; mesh.castShadow = !low; mesh.receiveShadow = true;
  const glow = G.mesh('lees-noon');
  ctx.scene.add(mesh, glow);
  ctx.lappet.farHidden?.push(mesh, glow);
  ctx.registerUpdate((dt, t) => { stone.tick(t, ctx.sky?.flicker?.value ?? 1); glow.tick(t); });
  for (const s of f.seats) Q.places.push({ what: 'the bench against the fountain\'s warm side (a seat)', ...s });
  Q.places.push({ what: 'the fountain\'s kerb: where someone kneels to dip', x: f.notch.x, y: Q.Y + 0.2, z: f.notch.z }, { what: 'the Leerie\'s slate, on the Swape\'s post', x: f.post.x, y: Q.Y + 1.3, z: f.post.z });
  ctx.lees = { fountain: { x: f.x, z: f.z, y: Q.Y, tip: f.tipY, swape: { x: f.post.x, z: f.post.z } }, arch: gate, gutter: floor.gut, records: Q.records, places: Q.places, meshes: [mesh, glow], stats: () => ({ draws: 2, triangles: tris, stone: B.triangles, glow: G.triangles, lights: 0 }) };
  ctx.log?.(`lees: ${tris} triangles in 2 draws, no point light`);
}
