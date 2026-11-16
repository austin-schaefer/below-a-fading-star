# v15-V1 the houses: report (branch `issue-1501-houses`, written 2026-11-15 20:28)

## What changed

- `src/v15/houses/`: five makers, one a kind (`elder`, `undercroft`, `carrier`, `late`, `new`), each `make(kind, B, plot, o)` into a structures Builder, returning a record (colliders, floors, lamps, lit windows, doors, counters, shelves, lights asked for). Variation by seed: a Late house has four forms (yard with a walked roof and stair, tower, step, long), heights from 4.9 to 8.2 m, lean, patches, openings; `shop: true` gives a shopfront. Entered: the carrier (round room, bed, flask), the Elder cleft (hearth), the new house (open to the sky).
- `src/v15/row.js` (world module `villagerow`, `ctx.village`): the Strake [Proposed], five buildings of five ages on the Lees' bench at (59.6, -38.8), fronts bearing 15, with flags, a step and a drain of split Noonwright line. `?v15=0` off; `?v15=kit` a contact sheet of every maker at ten seeds (`src/v15/sheet.js`).
- `tools/village-test.mjs` (in the gate as `village`), `tools/village-walk.mjs` (the row walked on the keys), `tools/views-v15-row.mjs`, `tools/views-v15-kit.mjs`.
- `world-code/modules.md` (the row and how a quarter calls a maker), `runtime.md` (`?v15`, the two tools).

## Tests (all on port 8162, `SHOT_ANGLE=metal nice -n 10`)

- `ONLY=village,walk,hop,edges,perf,loading,strata,contrast,regions tools/suite.sh 8162`: 9 tests, 0 failed. PASS lines: regions 56, contrast 3, strata 8, village 147, walk 13, hop 25, edges 209, loading 28, perf 29; no FAIL lines.
- `node tools/village-test.mjs http://localhost:8162`: 147 passed, 0 failed. Row on low: 2 draw calls, 18,252 triangles (budget 3 and 45,000). Late house on low at ten seeds: 968 to 1,706 triangles (budget 2,500).
- `Q=medium node tools/village-walk.mjs http://localhost:8162 <routes> v15-walk`: PASS roof (22 m of frames), carrier (10), elder (7), new (7), street (33). Run in three calls as faults were fixed between them; not rerun as one after the last fix (the lamps' dimming, which moves no collider).
- `tools/geometry-test.mjs` is not on `origin/next` (it is on `origin/issue-1502-geometry`): not run.

What the tests found and was fixed at the cause: the Elder front drawn with no door on every mirrored seed (a clockwise outline cuts no holes: `wallPoly` now winds its own outline); a pane let into the slot on narrow clefts; the new house's centering at eye height; no sill under the carrier's door. What the walk found that the test's static checks passed: the parapet's round end blocking the roof stair's top treads; the carrier's doorstep and the Elder slot's drum standing in their doors as colliders.

## Renders (in order; all under `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1501-houses/shots/wip/`)

1. `v15-row-low-front-60.png`, `v15-row-high-front-60.png`: the row from 60 m.
2. `v15-row-high-front-14.png`, `v15-row-low-front-22.png`: the whole row from the street's far side.
3. `v15-row-high-from-west.png`, `v15-row-high-from-east.png` (and `-low-`): along the row, sun-lit end and silhouette.
4. `v15-row-high-six-{late,undercroft,carrier,elder,new}.png` (and `-low-`), `v15-row-low-close-*.png`: each building at 6 m and closer.
5. `v15-row-high-gutter-front.png`, `v15-row-low-gutter-{front,street,from-west}.png`: the sun guttered, windows lit.
6. `v15-row-low-back-above.png`, `v15-row-low-west-end.png`.
7. The walk, a metre apart on medium: `v15-walk-{roof,carrier,elder,new,street}-NN-{a,l,r}.png`; six to a page in `sheets/v15-walk-<route>-sheet-N.png`. The carrier and Elder walk frames predate the lamps' dimming.
8. The contact sheet: `v15-kit-c-{late,undercroft,carrier,elder,new}-{a,b,c,near-1,near-2}.png`.

## What is weak

- The fronts face NNE and the sun is WSW: the row's faces are never sun-lit. From the street it is a violet mass with lit windows and lamps; only the west end and the roof yard catch the light. The brief fixed the facing.
- The bench today is about 8 m of flat at this bearing, so the plots are shallow (4.8 to 7.2 m) and the Elder blocks stand back into the bank.
- No carrier lying on its side (the plan wants one, 14 x 5): only the standing kind is made.
- The row is not read from V0's `plan.js` (it has no plot for it): `ROW` in `row.js` is the one constant. V0's plots are smaller than these (houses 5 to 6 by 3.7 to 4.6): a 'yard' with a front stair needs a width of 6.3 or more, so on those plots take `stair: 'side'` or another form.
- Inside the carrier the wall is a plain plastered curve: little to look at beyond the bed, cupboard and flask. The Late house's roof yard is bare but for a bed and a jar.
- The door lamps were blowing out at arm's length; they are dimmed to 0.42 and not re-walked.
- The new house's back wall and the green bank behind the row read as flat planes from the roof.

## Defaults taken

- The name "the Strake" [Proposed]. The row's place and bearing (the widest flat of the bench that clears the Pomegranate House and the ha-ha).
- Lights are asked for in the record and made by the quarter; the row makes three.
- The test's tolerances: 0.6 m past a plot's sides (eaves, a lean), 2 m over the street (awnings), 0.6% of rays may meet a back face.

## For four agents about to build thirty of these

- One `ctx.strata.builder()` for the whole quarter (and one more for Elder blocks), `make(kind, B, plot, { seed, low })` per house, `register(ctx, R)`, one `ctx.strata.mesh` at the end: do not make a mesh a house.
- Vary by seed and form, never by scaling the plot; check the form you got (`R.form`).
- Hang lamps and make lights from the record yourself, few of them; keep emissives low and render one at 2 m.
- After placing, run `village-walk`'s pattern on every door that can be entered: static checks do not find a collider standing in a doorway.
- A plot's `y` is the ground at the door; on a slope the makers bury a 0.4 to 0.5 m skirt and no more.
