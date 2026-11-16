# v15-V1 the houses: report (branch `issue-1501-houses`, round 2 written 2026-11-15 22:40)

## What changed

- **The makers** (`src/v15/houses/`): `makePlot(B, plot, { plan, built, seed, low, E })` builds one plot of `src/v15/plan.js` from its `kind`, `hand`, `against` and `roof`; `registerAll(ctx, records, name)` registers a quarter's colliders and one walkable function. Each kind has its forms (`FORMS`): late `yard`, `tower`, `step`, `long`, `stall`; elder `lean`, `overhang`, `stack`; undercroft `single`, `double`, `riser`; carrier `standing`, `broken`, `lying`; new `footing`, `rising`, `roofing`. A maker throws with the plot's name when the plot is too small or the kind has no maker.
- **The Strake** (`src/v15/row.js`): with the Lappet's bones built it reads `ctx.lappet.plan.STRAKE` and the five `strake-*` plots and builds each through `makePlot` at the plan's level; nothing in the file names a coordinate then. Without the bones (this branch: V0's branch is not merged here, the orchestrator merges) it stands at `ROW` as in round 1.
- **The geometry check**: the row is place `strake` in `tools/geometry/places.mjs` (a route the page holds, `ctx.village.row.route`: `tools/geometry/extract.js` takes `route: 'a.b.c'`), held at zero.
- **The look**: limewash carries a faint light on the lit-window channel (`limeGlow`) so a front in shade stays pale; the carrier is a vessel the height of three houses, leaning and shored, broken or lying, its scar a soft thinning to the milk body with the light through it; the new house's old faces carry pieces of cut friezes; awnings are one faded cloth; the painted door frame is mostly gone into its wash.
- **Shared code touched**: `src/v8/strata/parts.js` (the Heliarch roundel's notch band stands 7 mm proud of its block: the two shared faces and flickered wherever a roundel stands).

## The review's points

1. **The row on V0's plan**: done in code and tested against a stub of V0's `STRAKE` as pushed (`origin/issue-1500-bones` 1e748a2: five 6.8 x 5.2 plots against the Low Rung); not seen on the real bones, which are not on this branch. When the two meet: the row's flags and drain are laid 2.3 m out from the fronts over `lees-street`, 4 cm above the bench.
2. **Makers at the plan's sizes**: every plot size the plan has builds (`sheet.js PLAN_PLOTS`, in the test and on the sheet's `plan` and `plan2` rows). A shop whose vault the bones built (`built[plot.name]`) gets only the Late fitting; the Strake's shop, whose riser is at its plot's back, is a forecourt: yard walls, the counter at the street under a cloth, a gate, jars.
3. **`makePlot`**: above.
4. **`modules.md`**: the recipe is `makePlot` / `registerAll` with `low: ctx.quality === 'low'`.
5. **Flicker and floaters**: 35 findings to 0 (24 coplanar, 9 floating, 2 backs), then 3 more under the stair to 0. The causes, each fixed at its cause: overlapping wall patches in one plane; frieze strokes 1.5 mm off their plate; the new house's side walls running through its corners; its footing in the plane of its floor and the flags; bunks overlapping at one height; the carrier's floor in the plane of its door sill; cracks laid on the true curve off the drawn skin; shelves, pegs and what hangs on them clear of a wall that bellies; an awning's hem at eye height (a walker's head went through the cloth); a capital turned over, open underneath; the lamp bracket hung where an unbattered wall would be; the plumb stick over a course that was not there; things on the Elder rack with no cord; the flags flush with the drain's walls; the roundel (above).
- Should-fixes: `registerAll`; the test at the plan's sizes with a doorway check both ways; a Late `step`'s ladder to nowhere is gone; a front stair's foot clears the door frame; the new house's colliders are as high as its stones and its footing is under its floor; the carrier is rewritten, its door and windows cut in the skin as it leans.

## Tests (port 8162, `SHOT_ANGLE=metal nice -n 10`)

- `node tools/village-test.mjs http://localhost:8162`: 449 passed, 0 failed.
- `node tools/geometry-test.mjs http://localhost:8162 strake`: 11 passed, 0 failed; coplanar 0, floating 0, backs 0, sky 0 (the check loads on low).
- `Q=medium node tools/village-walk.mjs http://localhost:8162 roof,carrier,elder,new,street v15-walk-r2`: five PASS, after the lamp changes. The street walk first stuck between the shop's capital seat and its wall (the seat now stands in under the pier).
- `ONLY=village,geometry,walk,hop,edges,perf,loading,strata,contrast,regions tools/suite.sh 8162` (after merging `origin/next` a832819): nine passed and `geometry` failed on three coplanar groups under the Late house's front stair (its treads' undersides in one plane, below ground; the stair had come back after the last single run of the check). Fixed in `kit.js flight`; then `ONLY=village,geometry tools/suite.sh 8162`: both ok (village 449, geometry 44 PASS lines), and the roof walk again: PASS. `walk`, `hop`, `edges`, `perf`, `loading`, `strata`, `contrast`, `regions` were not rerun after that one-line fix.
- The whole suite was started on this branch by mistake and stopped part way (it is the orchestrator's, on `next`). Its partial log showed `roads`, `dressing` and `twk` failing; the orchestrator has them. `roads`: the row's colliders stand on P9 and P41 as they run on `next`. Whether `dressing` and `twk` fail with `?v15=0` was not checked: those tests take no URL parameters.
- `src/v8/strata/parts.js` is shared code and has had only the ten tests above.

## Renders (all under `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1501-houses/shots/wip/`; low, 1280 x 720)

Looked at: every one of the 20 row frames, 48 kit frames and 165 walk frames, as sheets of six (rows and kit: `m-row-aa..ad.png`, `m-kit-<row>.png`) and of twenty-four (walks: `m-walk-<route>-*.png`); four row frames and five kit frames also at full size. A sheet of six shows a frame at half size: flicker and anything under about 5 cm would not show in it.

1. `v15-row-r2-front-22.png`, `-front-14.png`, `-front-60.png`: the row from the meadow.
2. `v15-row-r2-gutter-front.png`, `-gutter-street.png`, `-gutter-from-west.png`: with the sun guttered; the plaster holds its value.
3. `v15-row-r2-close-late.png`, `-close-undercroft.png`, `-close-carrier.png`, `-close-elder.png`, `-close-new.png`, and `-six-*`: each from the street.
4. `v15-row-r2-from-east.png`, `-from-west.png`, `-west-end.png`, `-back-above.png`.
5. `v15-kit-r2b-<row>-a|b|c.png` and `-near-1|2|3.png`, rows `elder`, `undercroft`, `late`, `new`, `plan`, `plan2` (the Strake's five at the plan's sizes), `lying`, `carrier`.
6. `v15-walk-r2-<route>-NN-a|l.png`.

## What is weak

- **Not seen on the bones.** The plan path is tested on a stub, not rendered: the forecourt shop against V0's own vault, the Late house's roof meeting the Low Rung's tread, and the flags over `lees-street` have not been looked at together. The forecourt shop appears only from above on the `plan2` sheet; no near frame shows it.
- **The carrier is still a bottle.** It is big, old and lit through, and broken or lying it reads as wreckage; standing whole it is a recognisable flask with a ring at its mouth. That is what a carrier is here, but a critic who wanted "a ruin of something vast" may still see a vessel.
- **Plaster's held light is a cheat**: emissive, 8.5% of the wash's colour. In a guttered frame the Late house is the brightest unlit thing in the row. If it reads as glowing, lower `limeGlow`'s `k` in `kit.js`.
- **The patches** on Late walls are flat plates of another tone; near to, a low `bare` patch is a grey polygon.
- **The thin red line** in round 1's `front-14`, `six-new` and `gutter-front` was mine: the mason's line on the new house, drawn with an emissive. It is dull twine now, with no glow.
- **The dark red wedge on a post** at the right of `from-east` and `gutter-street` is not from this branch's files (a marker of another module standing by the camera); I did not trace it.
- The kit sheet's overhead frames for `lying` are taken from among the standing carriers and are half hidden by them.
- Triangles on low: carrier about 4,100, undercroft and new about 4,000 a building; thirty of those is 120,000.

## Defaults taken

- The row's Late house is 2.85 m high (thirteen risers) so its front stair's foot clears the door on a 6.6 m plot.
- The Strake's Elder plot is built `overhang`, its carrier `standing`, `long`; seeds in `row.js STRAKE_OPTS`.
- With the plan, the row's level is the plan's `STRAKE.y` plus 4 cm (the flags' thickness above the turf).
- The test's tolerances: 0.6 m past a plot's sides, 2 m over the street, 0.6% of rays may meet a back face; a shop before its riser may reach 3.3 m into the vault behind its plot.
- The name "the Strake" stands (V0's plan uses it).

## For four agents about to build thirty of these

- One `ctx.strata.builder()` a quarter (and one for Elder blocks), `makePlot(B, plan.plot(name), { plan, built: ctx.lappet.built, seed, low: ctx.quality === 'low', E })` a plot, `registerAll(ctx, records, name)`, one `ctx.strata.mesh` each at the end.
- Vary by seed and form, never by scaling a plot; check `R.form`. `makePlot` throws on a plot it cannot build: catch nothing, fix the plot or ask for the maker.
- Hang lamps and make lights from the record yourself, few of them.
- Add your quarter as a place in `tools/geometry/places.mjs` and hold it at zero; walk every door marked `enter`. Things fixed to a Late wall after `room()` must follow its batter (`R.front`), and anything drawn in one plane with a neighbour needs 5 mm or more between them.

## Round 3 (written 2026-11-15 23:29)

**Vessels** (`src/v15/houses/vessel.js`; `carrier.js` and the standing flask are deleted). A carrier is never whole: `sherd` (a third of a vessel's wall, 10 to 15 m across and 8.5 to 11.5 m high, behind a Late plaster house whose roof poles and planks run to it), `sunk` (a dome buried to its shoulder, the stub of its neck, a lens, a plank frame knocked into a ragged cut with the leaf hung in it; entered), `wreck` (lying, caved in on top, a breach walled up in plaster with a framed door, the neck lying apart, shards; 8 m of front and more). The wall is 36 cm thick and shows a milk section at every break. The surface is painted per vertex (glaze dulled, a sheared patch of milk body, lime from the top, soot over the flue, damp at the foot) and crazed through the shader's mortar net on a skewed, warped masonry uv. 800 to 1,600 triangles on low. Not done: the sunk dome has no steps down (the terrain is not cut; a sill board and a bank of earth instead). The crazing is bold on the palest glaze and reads nearer cracked tile than hairline craze.

**Plaster**: stains are `tint()` sheets with the wall's own surface whose colour fades to the wall at their edges: rain under every sill's ends and from the parapet, damp along the foot, limewash and mud patches, one patch of bare mud brick with stones in it; a sagging parapet; a reused ashlar in a corner on about half; door leaves with plank joints and a worn foot. The outlined plates (the grey wedges) are gone. Two things found on the way: the lime glow rode the lamp channel and lit a stain as brightly as the wall, so stains were invisible until the glow was scaled with the tint; and a sheet laid over another hides it with its clean edge, so no two may overlap.

**Variety**: undercroft `key` roundel / blank / fallen (the stone at the pier's foot), a slender or a broad arch, `close` mouth / shutter / infill / gate / planks with a wicket / rubble half built, `top` stumps / hut / a standing length of wall (ten seeds: nine distinct). Elder hut: height, window shape, a dome, chimney or pole on its roof. Arch count is still one or two.

**Faults, and why the geometry check passed each** (it knows three things: coplanar faces, pieces touching nothing, backs):
- pale triangles under awnings: five separate strips each rolled a different amount, and a loose patch; each touched the bar, none coplanar, all two-sided. Now one sewn cloth, the patch painted in.
- grey wedges at wall feet, white sheets by the lime pit: plates 3 cm proud, touching what they lay on. Now paint, and lumps.
- black quad, white sheets and the floating plank at the carriers: the kit sheet is no place of the check, and the row's flask is not traced (its maker is deleted).
- centring closing the door, ladder to a bare block, narrow doors: sound geometry, wrong design. The centring is an open rib; a ladder is only built to a hut, which stands at the block's edge; doors are 0.92 to 1.12 m.
- orange and blue rectangles over the roofs: mine, the washing. Now thrown over a thicker line in two leaves, washed dull.
- Tightening: the strake's place has no exemptions to remove. `village-test` now fails a door under 0.9 m (it found the infill's 0.72 m door) and an entered doorway with anything drawn on its line. The first run of the ten found four floating pieces in the row that the new forms brought (the sherd's planks off their poles, the sign's arm past the wall's end, shelf feet over a vault with no floor of its own, the lamp chain to no soffit): fixed, strake back at zero.

**The second review**: (a) `makePlot` packs the gap behind an elder, carrier or new house standing against a riser with rubble to the tread and a parapet (`R.packed`, a collider, a layer 1 floor); modules.md says which kinds carry a roof (late, undercroft). Not seen on V0's real plan here (its branch is not merged into this one): only through the sheet's `plan2` row. (b) a plan's `stair` is honoured. (c) the row warns when the plan has no usable `STRAKE`. (d) `limeGlow` is emission channel 2, a new `uLime` in the shared stone shader (three touched lines in `src/structures/materials.js`, one in `src/v8/strata.js`): steady, 0.85 by day, 0.26 at the gutter. `src/structures.js`'s own stone never sets it and keeps the default. (e) vessels under 3k; the new house is now the dearest (`roofing` 5,100 on low), not reduced.

**Tests**: `ONLY=village,geometry,walk,hop,edges,perf,loading,strata,contrast,regions tools/suite.sh 8162` after the last fix: 10 of 10, 5 min 59 s (village 441, geometry strake 0). `tools/village-walk.mjs` not rerun this round.

**Renders**: `shots/wip/v15-row-r3-*.png` (20) and `shots/wip/v15-kit-r3-*.png` (48). Read at full size: 10 of the 68 final frames (row front-22, close-late, close-undercroft, close-carrier, close-elder, six-carrier, back-above; kit carrier-near-3, undercroft-near-3, plan-a) and about 25 working frames of the same views during the round. The other 58 final frames are not looked at. `back-above` looks away from the row (the view, not the row).
