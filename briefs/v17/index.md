# v17, the water goes under: dispatch plan

The milestone doc is `plans/wilderness-v17.md` (its survey has the numbers and where they came from). Shared rules: `_common.md`. Reports: `reports/`. Stories: `stories/the-meridian-garth.md` (the chain, the tube, the garden), `stories/the-man-at-the-wheel.md` (the sphere).

## The plan's numbers (W1 writes them into `src/v17/plan.js` in its first push)

Measured on `next` at `f8f62b6` with `heightAt` in node (`tools/height-speed.mjs` shows how to import the height path; `src/v4/paths/ground.js` `prepareMap()` first). x east, z south; levels in world metres.

| Row | What | Numbers |
|---|---|---|
| `BOX` | every new height, paint and water term's box | x -125..25, z 195..335 |
| `MERE` | the Slake [Proposed], still water in the trough's west hollow (floor -10 at (-87, 283)) | an outline (`radialOutline`) round about (-87, 280), r about 22, drawn out by lobes toward the brook's mouth (-85, 262), the leat's mouth (-68, 288) and the cut (-95, 295); level **y -6.8** (W1 measures it on the ground round it, as `floor.js` measures its pools, and may move it by 0.4 m; it is the Swallow's sill) |
| `BROOK` | the tarn's outflow, natural, the first running water | line (-90, 197), (-92, 210), (-97, 222), (-90, 238), (-84, 252), (-85, 264); level -4.6 (the tarn's) to z 205, down to about -5.3 by the Span's line (z 216), -6.0 by z 240, the mere's level at its mouth; 1.5 to 3 m wide; among the Span's fallen crown pieces (`src/v4/span/plan.js` `SLABS` bay 0: (-108, 224), (-94, 211), (-100, 197), (-83, 230), (-84, 213) against pier -70's west face) |
| `LEAT` | the fen's outflow, built: a stone-kerbed channel with stepped weirs | line (12, 228), (11, 245), (9, 252), (4, 266), (-8, 282), (-35, 290), (-62, 288); level -2.45 (the fen's) at its head, down by four or five weirs between (11, 245) and (-8, 282) to the mere's level, then level to the mere; about 2.4 m between kerbs; a slab bridge where P14 and P38 meet at (9, 252) |
| `SWALLOW` | the cut from the mere into the slope, and the portal where the water goes under | the cut from the mere's south shore at (-95, 294) to the portal's face at (-95, 311) (ground there +7.5), its water at the mere's level; the sill at the mere's level; the portal at least 8 m wide and 9 m clear; a ledge beside the fall where the tube's end comes out of the water, about (-91, 309) |
| `AQUEDUCT` | the Heliarchs' vaulted conduit under the apron, flooded, and the Noonwrights' tube laid down it | from the portal east under the apron (z 311 to 318, 10 to 30 m under the ground) about 70 m to the Garth's west door at (-30, 318); its floor falls from the sill to -24 |
| `GARTH` | the Meridian Garth [Proposed], the round hall | centre (-10, 322), floor y -24, radius 20 (its walkable floor stays inside the walk limit, r 346), a dome to about y -4 at the crown, 10 to 14 m of ground over it; the lens in the crown, fed by a tube coming in through the rock from the west |
| `SPHERE` | the man at the wheel | centre (-322, 22), radius 15, centre y 8 to 10; a line of hoops leaving its south-east side toward the Garth |

## Who owns what

| Brief | Owns | Shared files it may touch |
|---|---|---|
| **W1** the brook and the mere (`brief-v17-W1-brook.md`) | `src/v17/plan.js` (writes it), `src/v17/stream.js` (the kit for running water on a line: its ground cut, level and paint, behind `BOX`), `src/v17/water.js` (their surfaces), the brook, the mere, the Swallow's cut in the ground | `src/height/field.js` (one call behind the box in `heightRaw`, one in `biomeWith`, rows in `WATER_BODIES`/`waterLevelAt` behind the box), `src/water.js` or `src/water/pools.js` (the mere as a pool), `tools/outline-test.mjs` (a section) |
| **U1** the Swallow, the aqueduct and the tube (`brief-v17-U1-swallow.md`) | `src/v17/swallow.js`, `src/v17/swallow/` (the portal, the fall into the dark, the aqueduct, the tube walked under the water, its floor and its ascent), its rows in `plan.js` | `src/main.js` (one line to load the module), `world-code` docs; nothing in `src/height/*` (the cut in the ground is W1's: ask in your report if it is wrong) |
| **U2** the Meridian Garth (`brief-v17-U2-garth.md`) | `src/v17/garth.js`, `src/v17/garth/` (the hall, the lens and its light, the garden and its rings, the rills, the can), its rows in `plan.js` | `src/main.js` (one line), `src/v14/under.js` (only if the hall's grade needs a hook: a few lines), `src/v8/places.js` (a grade row) |
| **W2** the leat (`brief-v17-W2-leat.md`, after W1 is judged) | the leat and its weirs on W1's kit, the slab bridge at (9, 252), its rows in `plan.js` | as W1, in W1's files, its own section |
| **S1** the sphere (`brief-v17-S1-sphere.md`, when a slot is free) | `src/v17/sphere.js`, `src/v17/sphere/`, a claim in `src/claims.js`, a corridor in `v4/mountains.js` only if it needs one | `src/main.js` (one line) |
| **N1** the crossings, the dressing and the names (`brief-v17-N1-dress.md`, last) | where leads meet water, the claims, reeds and banks, the cards and map entries, `briefs/v17/reports/v17-names-for-the-owner.md`, the story files' State | `src/claims.js`, `src/world.js` (`LANDMARKS` rows), `src/v4/paths/routes.js` |
| **A1** the water heard (`brief-v17-A1-sound.md`, last) | the brook's and the weirs' sound, the Swallow's roar, the tube's muffle, the Garth's rills | `src/audio/*` as `sound-design` says, `src/v10/sound.js` (a start line) |

## Order

**Batch 1 (at once): W1, U1, U2.** Three agents, three browsers in sequence each; the orchestrator renders the before set and reviews. U1 and U2 do not wait on W1: they build below the ground from the table's numbers, and read `src/v17/plan.js` when W1 has pushed it (merge `issue-1701-brook` into your branch then; your own rows go in a section of your own). U1 and U2 meet at the Garth's west door (-30, 318) at y -24: U1 brings the tube to the door's sill, U2 builds the door in the hall's wall and the floor inside it; each pushes its half of the door's numbers to `plan.js` in its first hour.

**One before nine:** W1's brook is the first running water. It is judged moving (the orchestrator's blind reader, frames in order) and merged before W2 starts the leat on the same kit. If the brook reads as janky, W1 gets a second round; nothing else of the water is built until it does not.

**Batch 2 (as slots free): W2, then S1.** W2 when W1 is merged. S1 when a slot is free and before the batch's last merge; if it would hold the release, it is left, and Status says so.

**Batch 3: N1 and A1**, after every builder's merge, beside the whole suite's run on `next`.

**Then** (the orchestrator's): the critic, the curator, the gate, the release.

| Brief | Worktree / branch | Port | Model |
|---|---|---|---|
| W1 the brook and the mere | `issue-1701-brook` | 8161 | opus |
| U1 the Swallow, the aqueduct and the tube | `issue-1702-swallow` | 8162 | opus |
| U2 the Meridian Garth | `issue-1703-garth` | 8163 | opus |
| W2 the leat | `issue-1704-leat` | 8164 | opus |
| S1 the sphere | `issue-1705-sphere` | 8165 | opus |
| N1 the crossings, the dressing and the names | `issue-1706-dress` | 8166 | sonnet |
| A1 the water heard | `issue-1707-sound` | 8167 | sonnet |

## What the owner can see as each lands

On the working branch's server (8123):

- W1: the brook from the Span's deck, `?pos=-128,215,56&yaw=3.77&pitch=-0.45` (feet on the deck); on the ground, `?pos=-98,203&yaw=3.0` and the mere, `?pos=-85,262&yaw=3.14`.
- U1: the portal, `?pos=-95,297&yaw=3.14`; walk south onto the ledge and into the tube.
- U2: the Garth from its door, `?pos=-26,319,-24&yaw=1.4` (feet on the hall's floor; U2's report gives the stand as built).
- W2: the leat at the crossing, `?pos=9,252&yaw=2.74`.
- S1: the sphere from the Taker's pavements, `?pos=-255,10&yaw=1.71`, and from the spawn.
