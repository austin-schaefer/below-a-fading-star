# v16 L1, the tilt: report (branch `issue-1603-tilt`)

## What changed

- `src/height/floor.js` (new): `floorLift(x, z)`, added in heightAt beside the old tilt (`field.js`: one line and an import). Never negative, exactly 0 at the waters (u = 0.45x - 0.89z at or under -100; the tarn, the fen and the river held too). The forms: the fall (4.2 m at the top, wandering ±1.2 by two long crossed waves, not a noise: heightAt is hot), the old strand (a 2 m bank at u -22 that wanders 13 m; the Cardinal Stones stand on its lip), six whalebacks streamlined toward the northern notch (2.6-5.2 m; one under the Lynchets, whose terraces climb its flank), two kettles. Max lift 9.7 m (a whaleback on the top of the fall).
- `floorMask`: boxes and circles with a skirt S (20-50 m) whose inner edge a noise pulls out by up to W (no ruled line or circle from above): the keep/Demesne/village circle (r 95), the Lappet box, High Ling (split from the survey's one box: High Ling, the Staircase, the Croft, the Hypogeum to z 15; the Nave and the Noon Road apart), the Pit, the fall, both Span blocks, the tarn, the fen, 25 m round the river, r 260-300. Inside: bit-identical.
- `?floor=v15` (`params.js`, in `HEIGHT_PARAMS_KEY`); the Outwash's plane adds `floorLift` (`outwash.js:61`).
- Faults found and fixed at the cause: R2's second part sat in the dip at High Ling's skirt and traced a one-point line that crashed `paths` (and with it `roads`, `dressing`, `strata`): it starts 4 m west (`[210, 78]`; the old start under `floor=v15`), and a lead line under two points is dropped (`routes.js`), guarded by a new `paths-test` row. The heights rig's beam (186-210, z -12) and the Medlar Close terraces (seams' `off`) lost the whalebacks over them. `hop-test` picks a straight Lynchets run and a fallen gnomon whose top is a stop (0.38 m): the floor gave both picks new, worse candidates (the things themselves follow the ground).
- Docs: `modules.md` (what floor.js is, how to protect a place), `runtime.md` v16 (`floor=v15`). Views: `tools/views-v16-L1.json` (five ground views).

## Tests (port 8163, `SHOT_ANGLE=metal nice -n 10`)

- `node tools/height-check.mjs check --params=floor=v15` against a recording at 666d92a: 28 PASS 0 FAIL; `pure` 11 PASS; `purebake` 16 PASS (at 40d12a9, before merging L2).
- `ONLY=village-plan,paths,roads,dressing,strata,hop,walk,geometry,seams`: village-plan 7, paths 86, roads 64, dressing 22, strata 8, walk 13, hop 25 PASS lines; seams and geometry FAIL (below). Earlier on this branch (before the last whaleback moves, which only take relief away): village 687, house 20, rocks 38, lift 45, acts 163, stair 5; heights 203 PASS, exit 0, after the Bletting whaleback moved.
- `seams`: ceiling {seam 65, off 398, ghost 234} against {64, 344, 228}; under `floor=v15` it is {64, 343, 235}, so ghost is already over before this branch. The extra `off` are 0.15-0.28 m, on lifted ground inside its box (Medlar Close and the Lappet's skirt east of x 128).
- `geometry`: new findings in v14-passage (1), v12-stair (1 tread), v12-icefall (6 new, 5 fixed: terrain backs at z -305), house (2 new, 6 fixed, the taverna); "no looser" in strake, lappet-lees, lappet-pennyworth, lappet-pennyworth-market. Under `floor=v15` only v12-icefall fails (1 new). All of them are at places the mask holds bit-identical or past r 300, so they are the bake's triangles at a skirt's edge or shifted ratchet positions, not anything floating or buried.
- Bench (`height-check bench`, a busy machine): heightAt 2.89-3.77 µs vs 2.80-3.60 µs under `floor=v15`; bake low 1237-1535 ms vs 1208-1522 ms. That is within the noise; my 1e6-call bench is noisier still (1.7-9 s a run).

## Frames (`shots/wip/`)

`v16-L1-r2-*` (the fixed views at medium; before = the deploy worktree's `v16-before-*`), `v16-L1-r2-g-*` against `v16-L1-v15b-g-*` (the ground views, the same tree under `floor=v15`). Look first at `crown-north-glacier`, `stair-top-ne-floor`, `g-whaleback-flank`, `g-whaleback-tail`.

Blind helper (sonnet, six unlabelled pairs): 5 of 6 right. It got `crown-north-glacier` wrong and was guessing on `span-deck-tarn` and `air-floor-west`. What it saw: "soft, low-amplitude swells, hummocks and banks with no ruled lines, circles, sharp edges or noise"; "the effect is subtle".

## What is still weak

- From the high stands the change is subtle: the moor's own relief (±11 m) and the dusk light swamp 4 m. Above all it shows looking north from the crown, and at ground level on a whaleback's flank.
- Where a protected box meets lifted ground, its skirt is a dip at its foot (High Ling's west foot, the Lappet's north-east). R2 found one.
- One fail is open: `hop`'s Lynchets wall walked off the top until the straightness filter. It passes, but the wall it chose before still exists and I have not read why the first pick failed.

## Defaults taken

The survey's plan, with these changes: the High Ling box split in two; skirts wander; a fall of 4.2 m, not 3; the forms are whalebacks, kettles and a strand, and no dry channel (the Outwash already has its channels).

## Baseline rows I would re-record (after L2 and the fen)

`seams` ceiling; `geometry` rows for v14-passage, v12-stair, v12-icefall, house, strake, lappet-lees, lappet-pennyworth, lappet-pennyworth-market.

## Round two (L4, the floor reads; and the cold review's findings), 2026-11-17

### What changed

- `src/height/floor.js`: heightAt calls `floorGround(h, x, z)` (the lift, then the pools; one line in `field.js`).
  - **Pools** (`POOLS`, on `radialOutline`): the kettle (-68, -82, r 16, level 1.6), the west kettle (-118, -104, r 12, 5.6), and a pond 40 m long ponded behind the old strand's ridge (-94, -42.5, 5.6). Each has a bowl, a bank cut down to it and a lip raised to hold it; levels measured on the ground with the pool off. Rows in `WATER_BODIES` (waterLevelAt, the reeds, wading); drawn by `src/water/pools.js` as one mesh in the tarn's own material (no new program; +1 draw call only while a pool is in view; 3 x 561 vertices on low).
  - **`floorCharacter(x, z)`**: wet (the low west and south, the strand's foot, the kettles, the pools' margins), bleak (the whole fall pales toward its top; the whalebacks' crests), lee (their down-ice tails: ling), stone (the high north-east), strand (a pale shingle band 15 m wide on the bank), shore (the pools). `biomeWith` returns it; the bake paints it and puts the wet into `aWet` (darker, a sheen); the cover reads it (rushes on wet, ling on lees, thin bleached grass on crests); the rocks read it after their draws (no other rock moves: wet ground loses its stones, stony ground's grow); the height tape keeps the five new fields. No new attribute, texture or draw call for the paint.
  - **Bolder:** the strand's bank 3 m where nothing protected is within 60 m. A bolder rise by the north-east wall (to 8 m) was tried and dropped: that ground is the Bletting's, which rode 8 m up and broke roads-test (P7, a Bletting collider on its tread).
- **The review's findings:**
  1. (blocking) The Wellward Way is a protected line (`LINES`, R 14, the Nave's door to the Pit, the Laid Sun on it); `v14-passage` is now clean. Its one new row in round one was an ashlar the scatter laid half into the hall at the Nave's south door (ground there bit-identical); `structures/scatter.js` now clears the door after its draws.
  2. The Sunken Court is a protected circle (r 58).
  3. The skirts' closed hollows: each now has its old drain, a protected line laid along the v15 drainage from the hollow (court, below High Ling and the Nave, the Lappet's east and north-east feet, High Ling's south foot, the Lynchets' feet, the keep's west skirt). From above they are dry channels between the lifted ground. Guarded: `outline-test` runs a priority flood (`tools/floor-flood.mjs`) of v16 against `floor=v15` and fails on any hollow 0.3 m deeper at a skirt. R2's start is back at (214, 76) (the dip is gone at its cause); the `dropped` guard in `routes.js`/`paths.js` and its paths-test row stay (two lines each).
  4. The Nave's box starts at x 215: no lifted strip between it and High Ling's.
  5. and part 4, the Lynchets: the floor's bank and the whaleback under them bent their terraces' wave (read off the height) and so the walls; hop's first pick walked off a wall that bent. The Lynchets are protected now and their whaleback is gone; L1's two hop-test filters are reverted, and hop passes on its original picks.
  6. `routes.js`: the dropped-rivulet guard only; `paths.js`: one field.
- Also: the heights rig's site (210, 0) is protected (its beam's edge-guard row failed on the new ground); a tree no longer grows through the Collation's table end (`collationTreeClear` in `hiddenAt`, after the draws).
- Docs: `modules.md` (floorGround, LINES, POOLS, floorCharacter, how to protect a place and fix the hollow it leaves; `water/pools.js`), `runtime.md` (what `floor=v15` takes back). Views: `tools/views-v16-L4.json`.

### Tests (port 8163, `SHOT_ANGLE=metal nice -n 10`, at the tip)

- `ONLY=outline,village-plan,village,paths,roads,dressing,strata,hop,walk,heights,regions,rocks,perf,geometry,seams tools/suite.sh 8163`: outline 26, village-plan 7, village 687, paths 86, dressing 22, strata 8, hop 25, walk 13, heights 203, regions 56, rocks 38, perf 29 PASS lines, all ok. roads 62 PASS / 2 FAIL: P17 at (-30, 84) and P23 at (-160, 118..123) wet and steep at the tarn's new shore; `waterLevelAt` and `heightAt` there are identical under `floor=v15`, so it is L2's shore (on `next`), not the floor. seams FAIL ceiling {seam 64, off 415, ghost 227} vs {64, 344, 228}. geometry 120 PASS, rows below.
- `node tools/height-check.mjs check shots/wip/hc-L4-floor_v15.bin --params=floor=v15` (recorded at 0a45810, this branch before round two): 28 PASS 0 FAIL; `pure` 11, `purebake` 16 PASS (at 553b6a1).
- Bench (`height-check bench`, while a suite ran: noise): heightAt 11.1 µs v16 vs 8.6-65 µs v15 in the same minutes; no claim either way. Perf (low): 173-315 calls over the route, as the gate's own limits pass.
- Geometry's new rows, one by one: every one is at ground bit-identical to v15 (mask 0) except the Pit stair's, 0.006 m off. None is a thing floating or buried because the floor moved: they are scatter, rock and pebble draws that the whole-map rng moved (the ground changed slopes elsewhere): `v14-pit-stair` a `structures-wide` piece sunk at (174.3, 179.9); `v12-stair` a `structures-wide` piece's back and a tread under it at (259.8, -38.8 / -30.4) (High Ling, mask 0); `v12-lift-lower` a pebble at (-305.5, -15.3); `v12-icefall` a pebble and five terrain backs at (58-66, -305) (past r 300); `house` two taverna backs (89, -35 / 92, -54); `lappet-lees`, `lappet-pennyworth-skirts` an ashlar and a drum by (111, 3). `v14-passage` is clean.
- **Rows to re-record** (the orchestrator, once): `seams` ceiling; `geometry` for v14-pit-stair, v12-stair, v12-lift-lower, v12-icefall, span-east-stairs, house, strake, lappet-lees, lappet-pennyworth, lappet-pennyworth-market, lappet-pennyworth-skirts.

### Frames (`shots/wip/`)

Before: the deploy worktree's `v16-before-*`. After: `v16-L4-r3-{stair-top-ne-floor,stair-top-tarn,crown-north-glacier,air-floor-west,air-floor-northeast,air-valley-down}.png` (r3 is the paint and pools as they stand; later rounds changed only protection and drains). Ground and low air at a low sun: `v16-L4-r4-{g-kettle,g-strand-pond,g-whaleback-crest,g-drain,air-pools}.png`, and the same stands under `floor=v15`: `v16-L4-v15-*`. Look first at `v16-L4-r3-air-floor-west`, then `v16-L4-r4-air-pools`.

Blind helpers (sonnet, unlabelled, shuffled): round r2, 2 of 6 right (it picked "B" every time); round r3, 2 of 6 right. Only `air-floor-west` was picked with confidence, for "an irregular pond plus several smaller pools, ridged relief with banding". **The brief's done-condition is not met.**

### What is still weak

- From the high stands the paint barely reads: haze and dusk light flatten mid-tones, and most of the high north-east is the Bletting, High Ling and the Outwash, whose own paint wins. The pools read from the low air (`air-pools`, `air-floor-west`); from the stair's top they are out of frame or too small.
- The strand's pond sits behind its ridge: from the ground below the strand it cannot be seen (`g-strand-pond`).
- One dry kettle hole on open floor, 1.9 m deep at (138, -202), by the Plinth Road: allowed by the new outline-test row (under 2.5 m), not given water.
- The kettle's lip on its north side stands about 1 m over the ground beyond it (a perched pond).

### Defaults taken

Pools carved in `floorGround` with absolute levels, not by raising the kettles' rims; drains as protected lines along v15's drainage, not new channels; no new baked attribute (`aWet` and the colour carry the paint); the bolder north-east rise dropped; the Lynchets, the court and the heights rig protected rather than reshaped.

## Round three (L6, the cold review's leftovers)

1. hop: the gnomon filter is gone. The failing pick (roads gnomon at (61.2, -257), top 0.34 m) was not half-buried: the capsule's top is 0.41 m over its own ground and the check measured the walker's feet against the ground 3 m out, where the lifted floor's approach climbs 0.33 m. `tools/hop-test.mjs` now measures feet over the ground under the walker. A collider fix in `src/v8/roads.js` was tried and reverted (it was not the cause).
2. P4 (`routes.js`): waypoint (-128, -113) replaced by (-122, -127), (-136, -119): the path passes the west kettle's pool 5.5 m clear (probed with `waterLevelAt` rings along it).
3. The dip at (138, -202): a meltwater channel (`CHAN`, `chanCut` in `floor.js`) takes the lift out along the dip's north exit and west to ground that is lower (a fill was tried: it only moved the deepest cell to (124, -216)). The outline row passes; the flood finds no hollow there. One v16-over-v15 hollow remains at (36..64, -84..-80), 0.3 m deeper, not at a skirt, not new.
4. `collation.js`: each comment on its own function.
5. `floor.js` header and kettle comment: the lift never goes under the old ground; the pools' bowls (up to 4.6 m) do.
6. Reeds: the pools were already in `WATER_BODIES`; the reeds' stand gate in `plants.js` did not open for them (`b.marsh`/`b.shore`). It now also asks `nearPool(x, z, 4)` (`floor.js`). Mist and ripples are still the tarn's alone (not done).

Tests (port 8163): `ONLY=outline,hop,walk,paths,roads,dressing,strata,heights,village-plan tools/suite.sh 8163`: outline 26, hop 30 PASS lines 0 FAIL, walk ok, paths 86, roads 62 passed 2 failed (P17, P23, the known ones), dressing 22, strata 8, heights 200/200, village-plan 7.
Frames: `shots/wip/v16-L6-g-kettle-reeds.png`, `v16-L6-g-dip-channel.png` (views: `tools/views-v16-L6.json`); the channel is not readable from the ground in the second.
