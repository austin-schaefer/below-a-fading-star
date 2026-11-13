# v12, the Heights: design and briefs

The milestone doc is `plans/wilderness-v12.md`. This file is the dispatch plan. Briefs are written in full only for the next batch; the rest are coarse on purpose and are written against the code as it stands when they go out.

**Hold:** no implementation agent goes out until v11.1 is on `main` (the owner, 2026-11-12).

## What the engine allows (from a read of `next`, 2026-11-12)

Coordinates: +x east, +z south, y up; bearing clockwise from north (x = r sin b, z = -r cos b); yaw = -bearing.

- **The floor under the walker** (`src/controls.js`, about 282 to 546): `ctx.addWalkable(fn(x,z) -> y|null, {replace})`. A `replace` floor stands in for the terrain; a raise-only one counts only from 1.2 m below the feet to 0.6 m above them, and takes the max with the terrain. `ctx.addCollider` for round, capped and capsule shapes, all scanned every frame. Gravity 12 m/s², hop 0.74 m, step-up 0.12 m (0.65 m rising in a hop), no terminal speed, no fall damage. Slope slows from 0.55 rad and pushes back above 0.95 rad; a floor more than 1 m over the terrain counts as level.
- **The walk limit** (`src/v4/mountains.js:52`): a circle at r 348, with the saddle's wedge (±4.5° about bearing 250) out to r 372. Clamped radially every step and in `placeAt`. `walk-test`, `roads-test`, `paths-test` and `hop-test` depend on it. It is the first obstacle: anything high on or over the wall is clamped back.
- **The ground past r 300** is mostly steeper than the push-back slope (the cols and the saddle excepted), the mesh is 2.1 m a cell (3.1 m on low) with no LOD, and physics follows the analytic `heightAt`, not the mesh: on crags feet may float or sink, unmeasured.
- **Being carried:** `ctx.controls.carry({step(pos,dt), drop(), look()})` returns `release` (`controls.js:365`). No walking, gravity, colliders or limit while carried; the look stays free; ends if `pos` jumps more than 1.5 m. Examples: `src/v10/halt-seat.js`, `src/v10/door.js`. After `release` the module sets `pos` onto its walkable. A lift fits this as it is.
- **Acts:** `ctx.acts.add({id, at, reach, rise, face, words, every, when, do, show, lure})` (`src/v10/acts.js`; `world-code`, "Acts").
- **The Span** (`src/v4/span/plan.js`, `deck.js`): along z 215 from x -257 to 257, deck at y 56, walk 6.8 m either side of the centreline. Deck runs [-257,-113], [-63,32], [77,122], [169,257]; fallen bays -120..-70, 25..70, 115..176; a 3.6 m crack at x -45. Stairs at (-205,200) and (225,165). The two middle runs cannot be reached on foot; `walk-test` teleports onto them. A kerb (a capsule 0.14 m over the deck, `stand:false`) stops a walk at each broken edge; a running hop clears it.
- **The glacier:** `glacierMask` in `src/terrain.js:48` (x about 40, z < -200), ice at `60·ramp² + 20·ramp` with `ramp = smoothstep(290,440,r)`: only about 15 m up at the walk limit. Tongue and snout in `src/v4/glacier.js`. The mother crystal is at (40,-265), 60 m tall.
- **The Galleries** (`src/v5/galleries.js`): bearings 266 to 319, tiers from y 68 to 247, an inclined lift up the face (`:455`, decoration, animated in the shader by `uRail`).
- **The sky:** five lattices and the remnants (`src/skylife/`), drawn as sky, not as world geometry.
- **Assumptions that break with height:** the shadow box is ±95 m about a point 40 m ahead of the eye, so ground more than about 95 m below gets no sun shadow (`src/main.js:210`); fog is by depth with a cap; a cool "wall air" over r > 300 by eye distance is what made v11's frames from 70 m milky (`src/atmosphere.js:104`); update throttling and plant fades use horizontal distance only; settings teleports go to ground unless the entry carries a `y`.
- **`?cols=high`** (`mountains.js:152`): the three cols as passes at about 133, 152 and 150 m; with it on, ground inside the walk limit rises up to 9 m near each pass, so everything placed there needs a look.

## Briefs

| Brief | What a visitor gets | Owns | Model | Batch |
|---|---|---|---|---|
| **H0** the footing | nothing to see alone: the things the four ascents stand on | `controls.js` (stacked floors: a walkway over higher ground, a floor chosen by the feet's height; `placeAt` with a height), the walk limit as a circle plus registered corridors, the view from above (shadow box, wall air, what pops at 100 m), `?cols=high` as the default with a fitting pass, a `heights-test` (walk a registered ascent; fall from it; land sane), Go-to entries with a `y` | strong | 1 |
| **H1** the Span, end to end | the vestige across the three fallen bays; the whole deck on foot; a find on the middle runs | `src/v4/span/` (new files beside `deck.js`), `walk-test`'s teleports replaced by a walk | mid, strong if the vestige's look fails once | 1 |
| **H2** the glacier | ice that is ice, crevasses, the crystals climbing, a climb to a shelf, the high crystal and the thread's foot beyond reach | `terrain.js` (`glacierMask`, the ice), `src/v4/glacier.js`, the Lattice's upper field, a corridor from H0 | strong | 2 |
| **H3** the stair that appears | steps that are there only as you reach them, up into the air to a lattice; the tender's landing | a new module, `skylife/lattices.js` only to bring one lattice's foot into the world | mid | 2 |
| **H4** the lift | the Galleries' lift as a ride; one gallery to walk; what is in the cells | `src/v5/galleries.js` (the carriage out of the shader and into the world where it is ridden), a corridor from H0 | strong | 2 |
| **H5** the valley from above | whatever the first three tops show to be wrong with the floor seen from height (roofs, tree crowns, the water, bare patches), and each top pointing at another | written after batch 2 | | 3 |

Shared files, to be told to every agent: `src/controls.js`, `src/v4/mountains.js` and `src/terrain.js` are H0's (and H2's for the glacier's block); the others add a line or two there at most and put new code in new files.

## Order, and what the owner can see when each lands

1. **Batch 1: H0 and H1 together.** H1 needs nothing of H0's (the deck's walkable already works 56 m up). Seen: `http://localhost:8123/?pos=-205,200` and walk up the west stair and east along the deck to the far gate. This is the one before the rest: it is walked in a real browser by the orchestrator, shown to a blind reader, and put to the owner, and what is learnt about being high (vertigo, the kerb, the fall, the view) goes into the briefs for batch 2.
2. **Batch 2: H2, H3, H4 together** (three implementation agents). Seen: the glacier from the Lattice, the stair from the east moor, the lift from the Armiger's Tower.
3. **Batch 3: H5**, then the critic, the curator, the gate, the release.

## Open, for the briefs to settle

- **Where the stair stands.** Default: the bare plain in the east at about (330,-20), which two critics called empty, climbing west so the visitor climbs toward the sun with the valley opening under them.
- **How thin the vestige is.** Default: a single line of stone about 1.2 m wide, off the centreline, different in each bay (a surviving arch rib, a run of kerb stones on corbels, one bay bridged by something that is not stone).
- **How high the glacier's shelf is.** Default: 80 to 110 m, inside a corridor no wider than the notch.
- **What the passes are for.** With the cols raised the passes are places nobody can reach; a footpath to one is in the idea bank, not in v12.
