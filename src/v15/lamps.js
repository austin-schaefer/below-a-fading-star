// The Lappet's walking lamps (v15-L1): light to walk by where readers found "nothing lit to walk toward" (the Drag on
// the crown, the Lees' street past the last shop, the Slype, the Skirts, the Pennyworth's foot; the Hitch's far end has the
// house's lamp pole and the gate houses' lamps, and needed none).
// Each stands where src/v15/plan.js LAMPS says, made of what the quarters already have: a lamp post of stacked
// Heliarch drums with a timber arm lashed to it (as the Leave's), an iron bracket on a wall, or a lantern hung from
// something overhead (the Stage's scaffold, the main's belly over the Slype). Every lamp is glass in the village's
// stone shader, lit on the lamps' channel (emissive, baked in the vertex: it flutters with the others and holds when
// the sun gutters, so in a gutter it is what is left). (A pale disc of limewash under each was tried and dropped: from
// the lane it read as a plate laid on the flags.) No PointLight: the village keeps to three
// in view anywhere (tools/house-test.mjs). One draw (`lappet-lamps`), hidden from beyond 150 m on low with the rest.
// ctx.lappetLamps = { lamps: [{ name, x, y, z }], stats() }. ?lappetlamps=0.
import * as THREE from 'three';
import { mat } from '../structures/geo.js';
import { L, V, PARTS, ch, worn, hangLamp, beam, rngOf } from './houses/kit.js';

export async function build(ctx) {
  if (!ctx.strata?.on || new URL(location.href).searchParams.get('lappetlamps') === '0') return;
  if (ctx.built) await ctx.built('lappet');
  if (!ctx.lappet || ctx.lappet.on === false || !ctx.lappet.plan?.LAMPS) return;
  const P = ctx.lappet.plan, T = ctx.terrain, low = ctx.quality === 'low', rng = rngOf(1524, 3), B = ctx.strata.builder();
  const lamps = [];
  const world = (M, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const wood = () => ({ color: worn(L.wood, rng, 0.25), moss: 0.12, ground: -3 });
  const hang = (p, glass, k, name) => { hangLamp(B, p, glass, k); lamps.push({ name, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }); };
  for (const Lp of P.LAMPS) {
    const y = Lp.y ?? T.heightAt(Lp.x, Lp.z), face = Lp.face || [0, 1], M = mat(Lp.x, y, Lp.z, 0, Math.atan2(face[0], face[1]), 0);
    if (Lp.kind === 'post') {
      // stacked Heliarch drums, a capital, and an arm lashed to it out along +z (face), the lamp at its tip
      let yy = -0.25, lx = 0, lz = 0;
      for (let i = 0, n = Lp.n || 3; i < n; i++) { const h = 0.76 + rng() * 0.1; PARTS.heliarch.drum(B, ch(M, lx, yy, lz, 0, rng() * 3, 0), { r: 0.32 - i * 0.012, h, moss: 0.5 - i * 0.08 }); yy += h - 0.005; lx += (rng() - 0.5) * 0.04; lz += (rng() - 0.5) * 0.04; }
      PARTS.heliarch.capital(B, ch(M, lx, yy, lz, 0, 0.5, 0), { r: 0.3 });
      ctx.addCollider({ x: Lp.x, z: Lp.z, r: 0.38, y: y - 0.3, h: yy + 0.5, stand: false });
      const ya = yy - 0.4, reach = Lp.reach ?? 1.05, tip = [0.02, ya + 0.2, reach];
      beam(B, M, [0.02, ya - 0.08, -0.38], tip, 0.055, wood()); beam(B, M, [0, ya - 0.7, 0.2], [0.02, ya + 0.08, reach * 0.62], 0.04, wood());
      for (const yr of [ya - 0.02, ya + 0.1]) B.add(new THREE.TorusGeometry(0.34, 0.02, 4, 10), ch(M, lx, yr, lz, Math.PI / 2, 0, 0), { color: V.rope, moss: 0, ground: y - 3 });
      const lp = world(M, tip[0], tip[1] - 0.025, tip[2] + 0.04);
      hang(lp, Lp.glass || 'amber', Lp.k ?? 1, Lp.name);
      ctx.strata.place?.({ hand: 'late', from: 'heliarch', kind: 'spolia', name: `Heliarch drums stacked for a lamp post (${Lp.name})`, x: Lp.x, y: y - 0.25, z: Lp.z, mount: 'ground', r: 0.32 });
    } else if (Lp.kind === 'bracket') {
      // an iron arm out of a wall (M at the wall's face, z out of it, at the bracket's height), the lamp at its hook
      const h = Lp.h ?? 2.5, reach = Lp.reach ?? 0.6;
      beam(B, M, [0, h, -0.06], [0, h + 0.04, reach], 0.03, { color: L.iron, iron: 0.8, moss: 0, ground: y - 3 });
      beam(B, M, [0, h - 0.32, -0.06], [0, h + 0.01, reach * 0.7], 0.02, { color: L.iron, iron: 0.8, moss: 0, ground: y - 3 });
      B.add(B.box(0.14, 0.2, 0.06, { seg: 9 }), ch(M, 0, h - 0.12, -0.03), { color: L.iron, iron: 0.8, moss: 0.1, ground: y - 3 });
      const lp = world(M, 0, h + 0.02, reach);
      hang(lp, Lp.glass || 'amber', Lp.k ?? 1, Lp.name);
    } else { // 'hang': a lantern on a cord from something overhead at Lp.top
      const top = Lp.top, lp = { x: Lp.x, y: Lp.yLamp, z: Lp.z };
      beam(B, mat(Lp.x, 0, Lp.z), [0, lp.y + 0.05, 0], [0, top, 0], 0.008, { color: V.rope, moss: 0, ground: y - 3 });
      hang(lp, Lp.glass || 'amber', Lp.k ?? 1, Lp.name);
    }
  }
  if (!B.count) return;
  const mesh = ctx.strata.mesh(B, 'late', 'lappet-lamps'); mesh.castShadow = false;
  ctx.scene.add(mesh); ctx.lappet.farHidden?.push(mesh);
  const tris = B.triangles;
  ctx.lappetLamps = { lamps, mesh, stats: () => ({ draws: 1, triangles: tris, lights: 0, lamps: lamps.length }) };
  ctx.log?.(`lappet lamps: ${lamps.length} lamps, ${tris} triangles in one draw${low ? ' (low)' : ''}`);
}
