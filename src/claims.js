// Claimed ground (v15-G1): one table of the ground a place builds on, and one question every placer of old things asks
// before it puts something down. The owner, 2026-11-16: "don't we need some more generalized answer to 'existing things
// clipping inside new things'?" Things end up inside new things because each old module places from its own list and
// each new place clears what it knows of by hand; here a place claims its ground once and the placers ask.
//
//   claimedBy(x, z, r, who, ctx) → the name of the claim that keeps a footprint of radius r at (x, z) clear of `who`,
//                                  or null. ctx (for the terrain and the regions) may be left out: the claims that need
//                                  it are skipped.
//   ctx.claims = { at(x, z, r, who), add(claim) → remover, list }   the same, on the page (src/main.js)
//
// who, the placers that ask:
//   'rocks'   the stones and boulders (src/rocks.js), by the stone's whole footprint, after their draws
//   'blocks'  the Demesne's fallen blocks round the keep (src/v4/regions/demesne.js)
//   'trees'   trees and shrubs: placed but neither drawn nor collided (src/vegetation/ground.js hiddenAt), by the collider's r
//   'cover'   ground cover: grass, flowers, reeds (src/vegetation/ground.js excluded, margin < 0)
//   'trods'   the walked trods worn across the grass between the leads (src/v4/paths.js)
//
// A claim: { name, keeps: [who, ...], kind, ...shape, y0?, y1? }
//   disc   { x, z, r }                    box  { x0, x1, z0, z1 }      strip { a: [x, z], b: [x, z], half }
//   region { key, w }                      wherever ctx.regions gives that region more than w (needs ctx)
//   fn     { test(x, z, r, ctx) }          true, or a string that names the claim (the leads say which lead)
// y0, y1: the heights it holds (a gallery's floor, a bridge's span); a placer that asks with a height (`at(..., y)`) is
// let through outside them. No claim gives them yet: every placer here puts things on the ground.
//
// Order: the placers run early (rocks and the vegetation build before most regions; the trods are worn at the terrain's
// bake), so a claim made from a region's build() comes too late for them. A region claims its ground here, in this
// table, from its own plan (a three-free file the placers can import: src/v15/plan.js is the model), so it is claimed
// before anything is placed, however late the region builds. ctx.claims.add() is for what places after the build (a
// creature's perch, an act's lure): it reaches only placers that ask after it is added.
//
// Placers ask after their draws, never instead of them: a cleared draw is skipped, so every rng stream and every other
// thing stays where it was. A placer whose clearances are not here yet keeps its own and says so beside them; the
// survey of them all is briefs/v15/reports/issue-1532-buried.md.
import { CLEARINGS, inEntry, leadUnder, CAUSEWAY_CLEAR } from './v8/clearings.js';
import { villageClear } from './v15/plan.js';
import { LANDMARKS as L } from './world.js';

export const CLAIMS = [
  // v8-11's table, kept clear of stones and boulders (see src/v8/clearings.js for each place's reasons)
  ...CLEARINGS.map((C) => ({ ...C, keeps: ['rocks'] })),
  // v15: the Lappet's ground, every placer (src/v15/plan.js villageClear: the levelled steps, the bench, the foot's plots and lanes)
  { name: 'the Lappet', keeps: ['rocks', 'blocks', 'trees', 'cover', 'trods'], kind: 'fn', test: (x, z, r) => villageClear(x, z) || (r > 0.6 && (villageClear(x + r, z) || villageClear(x - r, z) || villageClear(x, z + r) || villageClear(x, z - r))) },
  // the roads: every lead's tread and the causeway, by the footprint (v8-11)
  // (v16 L5: and of trees and shrubs, by the collider's footprint: L3's reshuffle stood bushes on P3 and P8, whose
  // centres were off the tread)
  { name: 'the leads', keeps: ['rocks', 'trees'], kind: 'fn', test: (x, z, r) => { const id = leadUnder(x, z, r); return id ? `the lead ${id}` : false; } },
  // the Hypogeum's cut, its stair and its kerb (v16 critic): trees as rocks.js keeps its stones (r 12). Nothing kept the
  // moor's copses out of it, so a reshuffle of the floor could stand one in the cut where the knock eases the visitor back
  { name: 'the Hypogeum', keeps: ['trees'], kind: 'disc', x: L.hypogeum.x, z: L.hypogeum.z, r: L.hypogeum.r },
  // v17-U1: the Swallow's quay and the ground over its head (the portal's face, the arch, the drowned hall: the ground
  // there is opened, so a stone or a stem placed on it would stand in the hall's air)
  { name: 'the Swallow\'s quay', keeps: ['rocks', 'trees', 'cover', 'trods'], kind: 'box', x0: -93.2, x1: -86, z0: 295.5, z1: 311 },
  { name: 'the Swallow\'s head', keeps: ['rocks', 'trees', 'cover', 'trods'], kind: 'box', x0: -107.5, x1: -81.5, z0: 310.5, z1: 325.5 },
  { name: 'the causeway', keeps: ['rocks'], kind: 'fn', test: (x, z, r, ctx) => !!ctx?.terrain && ctx.terrain.causewayDistance(x, z) < CAUSEWAY_CLEAR + r },
];

function hit(C, x, z, r, ctx, y) {
  if (y != null && C.y0 != null && (y < C.y0 || y > C.y1)) return null;
  const t = C.kind === 'fn' ? C.test(x, z, r, ctx) : inEntry(C, x, z, r, ctx);
  return t ? (typeof t === 'string' ? t : C.name) : null;
}
export function claimedBy(x, z, r, who, ctx, y = null, extra = null) {
  for (const C of CLAIMS) if (C.keeps.includes(who)) { const n = hit(C, x, z, r, ctx, y); if (n) return n; }
  if (extra) for (const C of extra) if (C.keeps.includes(who)) { const n = hit(C, x, z, r, ctx, y); if (n) return n; }
  return null;
}

// ctx.claims: the table and what is added at build, for what places after the build
export function makeClaims(ctx) {
  const added = [];
  return {
    list: CLAIMS,
    added,
    at: (x, z, r = 0, who = 'rocks', y = null) => claimedBy(x, z, r, who, ctx, y, added),
    add(C) { const c = { kind: 'disc', keeps: ['rocks', 'blocks', 'trees', 'cover'], ...C }; added.push(c); return () => { const i = added.indexOf(c); if (i >= 0) added.splice(i, 1); }; },
  };
}
