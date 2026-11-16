# v15-G1: one answer to "an old thing stands inside a new thing"

Branch `issue-1532-buried`. Two parts: the check (`buried`, a fourth kind in the geometry test) and the cause (claimed ground, `src/claims.js`).

## Part A: `buried`

`tools/geometry/analyze.mjs` `buried(soup)`, called from `tools/geometry-test.mjs` beside coplanar, floating and backs, with the same baseline, record and report (each finding prints both meshes, a position and a `?pos=` URL).

**How it decides.** It needs no knowledge of what anything is.

- *Solid*: faces of a piece (faces joined through shared vertices) that is not flat, not exempt, not a ghost and not see-through (glass, water), and not the `lappet-far` stand-in.
- *A point is inside* when, of 14 rays from it, at least 11 first meet a solid face from its back. Inside a closed thing every way out is a back. An open shell's missing floor costs a ray or three, which the margin allows. A point is *under the ground* when the ray straight up first meets the back of an anchor (the terrain, a skin, a pit floor). The mesh's own faces are never counted: its material groups, and an instanced mesh's instances, count as one thing.
- *Inside another*: judged a piece at a time. In a merged quarter a piece is one house, one prop or one beam. The piece is buried when 42% of its skin is inside, from 24 points spread over its skin by area and nudged 1 cm in.
- *Under the ground*: judged a group at a time (the pieces of one mesh that touch each other), when 42% of the group's skin is under the ground. A wall's footing below the turf belongs to a wall that stands, so it is not found. A prop the new ground was raised over is found.
- *Exempt, by rule*:
  - anchors;
  - flat pieces (cards, decals, sheets);
  - pieces or groups that leave the place's region (only part of them was taken), or a group with one such piece;
  - anything smaller than 0.12 m or bigger than 12 m;
  - what shows only one flat face, unless 90% of it is inside (a flag or a tread laid in the ground, a panel set in a wall).

  What is let in by its end (a post rooted, a beam's end, a plant's base) is a small share of its skin and stays under 42% without a rule of its own.
- Exempt parts are judged too, but never taken as solid. An exempt reason is about hanging in air or hiding, not about standing in a wall: the plan's `BURIED` exemptions (old drums and ashlars under new treads) and the peafowl's trains (exempt as floating) are now judged.
- The ray cast takes a `skip` (the own mesh) and, on a tie at one distance, prefers the back. A box's floor on a slab's top is met at the slab's top too, and the point is inside the box either way.

Measured before it was chosen: ray parity lies on open shells (most meshes here); "nearest exit depth" as the rooted test lost the owner's bird (its body is in a thin wall, 3 cm from a face); judging ground burial a piece at a time found every footing of every house (1400 findings, mostly foundations). The group rule and the flush rule took those out.

**The fixture** (planted over the spawn with the others): a box 53% in a wall, a box wholly inside a block, and a ball sunk to its middle in a ground sheet are each found (46%, 100%, 50%). A post rooted 0.2 m (8%), a beam let into the wall by 0.3 m (8%), a shrub's sunk base (17%), a bracket in a post (29%) and a box standing on a parapet (0%) are quiet. All PASS.

**The owner's peafowl.** In the first count, on `next` at 39c68f5 before X2, the check found two of the three birds. Bird 2's body (and in some runs its train) is in `lappet-ways-stone`, the low ochre wall on the Mid Rung, at (90.1, 10.2, -9.5): the owner's frame. Bird 0's body is in `lappet-bones`, the Elder riser, at (70.7, 14.3, -16.2), with only its neck showing. Bird 1 on the crown stands on an edge and is not found; its frame shows it standing clear. Before frames, from 2.6 m: `shots/wip/g1-peafowl-before-b0{a,b,c}.png`, `-b1*`, `-b2*` (b2b is the owner's view).

**Today's findings**: 560 on `next` at 39c68f5 in 45 places, 76 inside another mesh and 484 under the ground. After merging W4's landings, 556 in 41 places. All are in `tools/geometry-baseline.json` as "found by v15-G1 (2026-11-16), not yet judged". Every other group is exactly as `next` has it. By place:

| place | inside another | under the ground |
|---|---|---|
| v12-stair | 21 | 292 |
| v12-icefall | 1 | 39 |
| lappet-pennyworth-market | 0 | 32 |
| v12-lift-lower | 1 | 25 |
| lappet-pennyworth-skirts | 3 | 16 |
| house | 1 | 15 |
| lappet-pennyworth-foot | 0 | 15 |
| v14-descent | 12 | 0 |
| lappet-low | 8 | 1 |
| lappet-lees | 4 | 5 |
| lappet-pennyworth | 0 | 8 |
| strake | 1 | 7 |
| lappet-pennyworth-hitch | 0 | 7 |
| lappet-mid | 6 | 0 |
| lappet-pennyworth-ramp | 0 | 6 |
| lappet-rungs-gullet, lappet-rungs-leads-3 | 4 each | 0 |
| v14-passage | 1 | 3 |
| v14-pit-floor, v14-pit-stair | 0 | 3 each |
| lappet-noon-main | 2 | 1 |
| lappet-lees-stair, quarrels, span-east-stairs | 2 / 0 / 0 | 0 / 2 / 2 |
| lappet-high, lane-bridge, rungs-squint, rungs-tenter, v12-lift-gallery | 1 each | 0 |
| lappet-lees-square, span-west-stairs | 0 | 1 each |

By pair of modules (the thing, then what it is in; the same thing seen from two places counts twice):

| pair | n | where |
|---|---|---|
| stair-treads in terrain (ground) | 280 | v12-stair: the Diffident Stair's slabs asleep in their beds, wholly under the low tier's turf until called: by design, I think; the orchestrator's to judge |
| rocks-pebble in terrain (ground) | 50 | v12-icefall 35, house 5, the village 7, others 3 |
| paths-kerb in terrain (ground) | 39 | the Pennyworth's places |
| pennyworth in terrain / skin-demesne (ground) | 36 | the Pennyworth's places |
| stair-kerbs in stair-landings, and the reverse | 21 | v12-stair: the landings' kerbs half sunk in the slabs |
| rungs-ways-stone in rungs-houses | 15 | lappet-mid, -low, -rungs-gullet, -rungs-leads-3: a way's stones through a house wall (pegs show in the plaster) |
| rungs-ways-stone in lappet-ways-stone | 9 | six Lappet places: the Rungs' stairs and the bones' ways one inside the other |
| structures-taverna in skin-demesne / terrain (ground) | 11 | house, strake, lappet-lees |
| living-moles in skin-demesne (ground) | 8 | the Pennyworth: the Tesserine Moles under the levelled foot |
| noon-road-glass in nave-hall; coffin-road in nave-hall or noon-road-glass; nave-hall in noon-road-glass | 13 | v14-descent, v14-passage |
| adust-rosettes, -cushions, -pavements (ground) | 17 | v12-lift-lower |
| paths-pit-slabs in pit-floor (ground) | 6 | v14-passage, v14-pit-floor |
| highling-clitter in terrain (ground) | 5 | v12-stair |
| pennyworth in lappet-bones | 5 | lappet-lees, lappet-pennyworth-skirts |
| lappet-ways-stone in lappet-ways-glass | 4 | the tube's stone in its glass |
| demesne-peafowl in lappet-ways-stone / lappet-bones | 3 | lappet-mid, lappet-noon-main, lappet-high |
| structures-drums (ground), structures-ashlars in rungs-ways-stone, village-row in structures-ashlars | 4 | the causeway's old fallen pieces under or through the village's new floors: the class the owner named |
| the rest (lift in lift, icefall crystal in ice, house props, the slipper's mate under the pavers, chair marks, span rubble, quarrels, lappet-bones, lappet-ways-glass, rocks-stone) | 22 | one to four each |

**Worst first, inside another mesh** (for the orchestrator; the URL stands you there on medium):

1. v12-stair, `stair-landings-*` and `stair-kerbs`: 21 findings. The landings' kerbs are half sunk in the slabs, and the landing-1 slab is wholly inside its kerbs (`?pos=265.6,-9.3,4.51&yaw=2.48&pitch=-0.50`).
2. v14-descent, `noon-road-glass` in `nave-hall`: 5.6 m of the Noon Road's glass inside the hall's masonry (`?pos=263.1,42.0,-15.53&yaw=-0.04&pitch=-0.31`), plus four more.
3. v14-descent, `coffin-road` in `nave-hall`: 96% inside (`?pos=265.0,47.8,-0.06&yaw=-2.87&pitch=-1.14`).
4. v12-icefall, a crystal 71% inside the ice (`?pos=35.7,-310.5,37.04&yaw=-0.11&pitch=1.03`).
5. lappet-low, an old causeway ashlar through the Rungs' stair stone (`?pos=100.8,5.0,6.17&yaw=2.12&pitch=-0.88`).
6. lappet-mid, -low, -rungs-gullet, -rungs-leads-3: `rungs-ways-stone` in `rungs-houses`, a stair's stones through a house (frame `shots/wip/g1-buried-lappet-rungs-gullet-rungs-ways-stone.png`: pegs out of the plaster).
7. The peafowl (X2 is re-perching them).
8. lappet-*, `rungs-ways-stone` in `lappet-ways-stone`, and `lappet-ways-stone` in `lappet-ways-glass`.
9. v12-lift-gallery: the gangway in the deck. v12-lift-lower: the station's iron in the station.
10. house: a prop 79% in the taverna (`shots/wip/g1-buried-house-house-props.png`). strake: a `village-row` piece in an old ashlar.

The frames of findings 1 to 10, looked at, are a sheet of ten: `shots/wip/g1-buried-*.png`, one view each from 2.2 m. Some are plain faults (the gullet's pegs, the bird in the wall); some are hard to read from one still (the kerbs). None has been judged beyond that.

**Time.** On a quiet machine the `buried` phase costs 10.9 s over the 45 places; the whole check was 88 s before (`ONLY=geometry`, 144 passed). The same check ran 86 s (unloaded) and 192 s (`ONLY=geometry` at load average 18, while other agents ran; the browser's take alone went from 45 to 83 s). The part this adds is about 12%, under the third allowed.

## Part B: claimed ground

**Survey: the mechanisms that keep a placer off built ground, 2026-11-16.**

- *The one shared table, now claims*: `src/v8/clearings.js` `CLEARINGS` (16 places, the leads, the causeway), read by `rocks.js` alone.
- *Hubs with their own inline lists*:
  - `rocks.js`: an `avoid` list of nine discs and `allowed()` (water, causeway, worn leads). After the draws: the court, the tower, the arcature, the mother crystal, then `plinthsClear`, `naveClear`, `stairClear`, `stillRockClear` and `sextonClear`, a boulder's lead, and the tors.
  - `vegetation/ground.js` `excluded()`: its own three discs, the keep, tower, stones, byre and court, then `spanClear`, slope, water, causeway and worn ground. For cover (margin < 0): `collationClear`, `prospectClear`, `plinthsPaved`, `naveHole`, the Pit's throat, `stairClear`, `houseClear`, `sextonClear`, `threadsClear`, `twkClear` and the village. `hiddenAt` (trees placed but not drawn): court, tower, arcature, mother crystal, `plinthsClear`, `naveClear`, `stairClear` and the village.
- *Each place's own clear function, 15*: `stairClear`, `mouthClear`, `villageClear`, `spanClear`, `collationClear`, `prospectClear`, `naveClear`, `naveHole`, `plinthsClear`, `plinthsPaved`, `stillRockClear`, `sextonClear`, `houseClear`, `threadsClear`, `twkClear`. Each is imported by two to five placers.
- *Region-local keep-outs*:
  - `v2/flora.js` `keepOut` and `v4/regions/saltings.js` `keepOut`;
  - the Demesne's yews (`lappetYew`, by bearing) and blocks (`villageClear`);
  - `v4/paths.js` trods (`villageClear`);
  - `v4/dressing/pegs.js` and `v7/canyon.js` (`spanClear`), `v4/regions/high-ling.js` (`stairClear`), `v14/pit.js` (`mouthClear`), `structures/scatter.js` (`naveClear`);
  - `v8/threads/plan.js`'s clearances.
- *No clearance at all*: the peafowl's perches (from the blocks, and since v15 three points hard-coded in `demesne.js`). That is how the owner's birds got into the walls.

In all: about 20 separate mechanisms over some 12 placers. A new place had to be added by hand to each placer that mattered: the village did it in five files.

**What was built.** `src/claims.js`:

- `CLAIMS` is one table. Each claim has a shape (disc, box, strip, region or `fn`), the placers it `keeps` off (`rocks`, `blocks`, `trees`, `cover`, `trods`) and an optional height range.
- `claimedBy(x, z, r, who, ctx)` is the one question. `ctx.claims` (`at`, `add`, `list`) carries the same on the page (`src/main.js`, two lines).
- v8-11's clearings, the leads and the causeway are claims for `rocks`. The Lappet's ground is one claim for every placer.

**Order.** The placers build before most regions (rocks and the vegetation early; the trods at the terrain's bake), so a region claims with a line in the table, from its own three-free plan, read at import. A call from `build()` would come too late. `ctx.claims.add()` reaches only what places after it (a perch, a lure).

**Moved onto it**, one line each: `rocks.js` (`clearedBy` is gone; the cut statistics keep their names), the Demesne's fallen blocks, `vegetation/ground.js`'s cover and hidden trees, and `v4/paths.js`'s trods.

**Nothing moved**: `node tools/build-check.mjs http://localhost:8174 --against=<recorded before Part B>` printed 68 identical, 0 moved (6035 entries, colliders included).

**Not done (the rest, as a list)**:

- `rocks.js`'s `avoid` list and its after-draw clearances. Each has its own radius rule (size times 0.6 plus 0.4 for the stair, size for the still figures, special arguments for the Sexton). They become claims once `r` is passed as the placer means it.
- `vegetation/ground.js` `excluded`'s other checks, where trees' `margin` is a claim's `r`, and `hiddenAt`'s.
- The region-local keep-outs above.
- The peafowl's perches. X2 owns them now; once moved, they should ask `claimedBy` for `blocks`, or `ctx.claims.at` with a height.
- No claim uses `y0`/`y1` yet.

## Tests

- `ONLY=geometry tools/suite.sh 8174` before any change: 144 passed, 0 failed, 88 s.
- After Part A and the record: 147 passed, 0 failed (192 s under load).
- `node tools/build-check.mjs ... --against=...`: PASS, 68 identical, 0 moved.
- `ONLY=geometry,regions,village,rocks,dressing,paths tools/suite.sh 8174` after Part B (4 min 24 s):
  - paths 81 PASS, regions 56, village 687 and rocks 38, all green.
  - dressing: 20 passed, 1 failed. The Collation row fails the same way with Part B reverted (run on this branch at 2df8af9's sources), so the failure is on `next` and not from this branch.
  - geometry: 132 passed, 1 failed. The failure is a flake: bird 2's train (`demesne-peafowl-trains[2]` in `lappet-ways-stone`, 46%, at the 42% line) was found new in lappet-mid. Two runs of lappet-mid and lappet-noon-main alone did not find it in lappet-mid, and lost the one the baseline holds in lappet-noon-main.
  - The birds turn on their own clock, and the page time at "ready" depends on how long the load took in real time (the test steps the fake clock until ready). So a bird's pose differs run to run, and a train that hangs by an edge through the wall crosses the threshold. X2's re-perch (trains over the rim) should end it. If it does not, the trains' place exemption should hold for buried too, or the test should hold creatures still.

## What is weak

- `buried` cannot see what a merged mesh does to itself. A beam of the Rungs' houses through another of the Rungs' houses is one mesh, and so is an instanced mesh's instances (a rock in a rock). It is blind to skinned meshes (the people), as the whole check is.
- The ground rule reads the low tier's coarse terrain: a pebble set on `heightAt` under a coarse triangle is found. That is true of what a low visitor sees, but it is most of the 50 pebbles.
- Birds move. The test's clock is fixed, so a run repeats, but a bird turning on its perch can carry its train in or out of a wall between X2's fix and a later perch.
- 42% is a tuned number. A box exactly half in a wall reads 46%.
