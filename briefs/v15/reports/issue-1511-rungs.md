# v15-Q2 the Rungs: report

Branch `issue-1511-rungs`, module `src/v15/quarters/rungs.js` (`?rungs=0`, `ctx.rungs`), its records in `src/v15/plan.js` `RUNGS`.

## What stands on which plot

- Mid Rung: `rungs-mid-1`, `-2`, `-3`, `-4`, `-6`, `-7`: six late houses through `makePlot`, each with a seed in `HOUSES`. Mid-1, -2, -3 and -7 have a front stair to their roof at the High Rung's level, each a registered ascent (`rungs-mid-N-stair`).
- `rungs-mid-5` is gone. In its place `rungs-cantle`, the Cantle: the one sherd vessel, a carrier plot 5.8 x 4.4 with its back 0.6 m in the High Rung's riser.
- Low Rung: `rungs-low-1`, `-2`, `-3`, `-4`, `-5`, `-7`: six houses, their roofs at the Mid Rung's level. Low-3 has a stair (`rungs-low-3-stair`).
- `rungs-low-6` is gone. In its place `rungs-dyers`, kind `yard`: the dyers' yard, nothing roofed.

## The set pieces

- **The Leads**, the roof walk: three crossings between Low Rung roofs (low-1 to low-2, low-2 to low-3, low-4 to low-5), a plank or a stile each, ascents `rungs-leads-1..3`. On the roofs: a dovecote, two drying racks, a loom, beside the kit's beds, jars and washing.
- **The Gullet**: a mud stair of sixteen risers in the slot between the two corner houses, its nosings limewashed, a plank over it.
- **The Tenter**: the dyers' timber flight from the Mid Rung into their yard: four poles with dyed cloth, two lines out from the Mid Rung over the stair, three vats, their runnels, a glazed gutter.
- **The Short Stair**: seven Heliarch treads east of the main's pier that end in low-7's end wall. Not walked.
- **The Slype**: the lane under the main: a plastered front with a horseshoe door and a lit niche.
- **The Squint**: a bench on low-7's roof. From it the Short Stair, the Tenter and the main are in one look.
- What the bones left: the ladder's poles stop a walker, a hand-rope, a lamp under the bridge's baulk, a worn stone at its foot.

## What changed outside the quarter

- `plan.js`: the two plots above, `RUNGS`, twelve geometry places. `lappet-lees` gained `near: true`.
- The houses' kit (`kit.js`, `late.js`), five small changes for geometry findings: a leaf's foot and a door's sill off a tread's plane, a side wall set in 40 mm, a front stair 0.3 m into its wall, fewer cloths on a short line. `village` stays 634 of 634.
- `tools/geometry/analyze.mjs`: a place may say `near: true`, and then a back met outside its region is not a finding (only faces reaching into the region are taken from the page, so a wall arrives without its top). Set on the three Leads places and `lappet-lees`. Tried on every place first: it dropped 83 baselined findings in v12 and v14 places, so it is opt-in.
- `tools/roads-test.mjs`: the Rungs' seven ways with a foot near the ground are in `FEET_OPEN` with the Lappet's reason.

## Counts

Low: 2 draws, 25,268 triangles (houses 18,424, ways 6,844). Budget 5 and 55,000. Medium: 2 draws, 29,724. Both meshes on `ctx.lappet.farHidden`. No point light: P9 and K1 hold the slots in reach, so every lamp and pane is emissive.

## Tests

- `ONLY=village,geometry,walk,hop,edges,heights,roads,paths,rocks,regions,strata,house,perf,loading,contrast tools/suite.sh 8162`: first run 12 of 15 (roads, heights, geometry failed). After the fixes those three and five the fixes touch were rerun: roads 62, village 634, house 20, walk 13, hop 25, edges 214, heights 194, geometry 126, all passing. paths 81, regions 56, contrast 3, strata 8, rocks 42, loading 28, perf 29 passed in the first run and were not rerun after the last fixes (a stair path point, the Gullet's walls and step-off, two place flags).
- `node tools/village-plan-test.mjs`: 7 passed, 0 failed.
- `node tools/village-walk.mjs http://localhost:8162 keys low 0 v15-Q2-walk`: walked: yes, the ladder taken twice.
- `node tools/village-walk.mjs http://localhost:8162 touch low 0 v15-Q2-walk`: **walked: no**. Stuck at (96.5, -25.9) on the Pennyworth ramp heading for the house wall at (101.0, -30.7). That is below this quarter, on merged `next` with the other quarters in; the touch walk never reached the Mid Rung.

## Frames, in the order a stranger should see them (all in `shots/wip/`)

1. `v15-Q2-e-far-lees.png` (far)
2. `v15-Q2-e-tenter-lees.png` (arriving under the Tenter)
3. `v15-Q2-e-leads-1.png` (the Leads)
4. `v15-Q2-e-gullet-foot.png` (the Gullet)
5. `v15-Q2-e-tenter-foot.png`, `v15-Q2-e-tenter-head.png` (the Tenter)
6. `v15-Q2-e-squint.png` (the Squint)
7. `v15-Q2-f-slype-door.png` (the Slype)
8. `v15-Q2-c-ladder.png` (the ladder)
9. Route sheets: `v15-Q2-route-lappet-rungs-{tenter,gullet,leads-1,leads-2,leads-3,squint,low-3-stair,mid-3-stair}-medium-sheet.png`

## Places left for people and contents

The Slype's door (what is behind it), `rungs-mid-6` (the room at the Tenter's top), the dyers' yard, the Squint's bench, the Cantle, the dovecote and the loom.

## What is weak or not done

- **My own routes are not walked on touch.** The heights test walks every ascent on simulated keys; the touch walk stopped before the quarter.
- **Route frames were read as contact sheets, not one by one at full size.** Sheets for tenter, gullet, leads-1 and squint were looked at; the other four sheets and the frames of `mid-1`, `mid-2`, `mid-7` stairs and the ladder were not taken or not opened.
- The Gullet has no step-off test (`offs: []`): in the wedge a hurry sideways slides a walker up the stair he is on.
- The three stairs of three ages are seen from a Low Rung roof at Mid level, not from the Mid Rung lane: the corner is convex and the Heliarch stair and the main cannot share a frame there. The Squint's view is crowded and the Short Stair is small in it.
- The Cantle's flanks behind the sherd are not packed with rubble; from the roof below it is a dark mass.
- The bridge's pier end and the timber patch's foot are still not seated on anything built.
- No gutter-tier or low-tier renders were looked at; low was only counted.
- **Renders named `v15-Q2-before-*` and `v15-Q2-a-*` are of port 8123, not this branch.** `tools/views.mjs` defaults to 8123 and I ran it twice without `FP_BASE`. Pages were fetched only; nothing there was changed.
- Two renders with broken names (`v15-Q2-d-find-1 100.0,...png` and two like it) are of the Carcanet Keep start, from a bad shell loop.
