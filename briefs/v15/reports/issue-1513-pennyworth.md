# v15-Q4 the Pennyworth: report (branch `issue-1513-pennyworth`, written 2026-11-16 03:41)

## What stands where

- **The Pomegranate House's south door** (`src/structures/taverna.js`, plan `HOUSE.door` at 92.8, -32): a ragged cut in the south wall dressed with a horseshoe arch in newer plaster, a worn step, flags before it. It opens into the south gallery and the court. The north gate is as it was.
- **The Thumbway** (`wall-lane`) under the house's south wall: two booths (`pennyworth-stall-1`, `-2`, kit `stall`) with their backs to the ramp; a three-cornered cloth on poles in the pocket by the door (a mat and a low board); the salt-weigher's plank on two Heliarch drums (a balance, the Twk-men's perch a thumb high, a thimble's measure, a post with three pegs, one bare: the pedlar's); a block of the keep for the news-seller's counter (a roundel on its back, a cloth, a plank bench).
- **The Slip** (`ramp-cut`, new): the straight way from the ramp's foot to the Thumbway between the booths' end and the garden's wall.
- **The Grudge** (`pennyworth-garden`, 4.7 x 6.2 m): a mud wall with a coping, three beds, beans on crossed poles, pot herbs, a well under a bored Heliarch drum with a sweep; the Tesserine Moles' heaps are in the beds (`molesMay`), a pair of poles leans where a heap came up under it, and the gardener's picked tesserae stand in a row on the coping.
- **The Spilt Measure** (`carrier-house`, kit `wreck`): the vessel fallen along the old kerb, a door in its sound half, beans in pots at its broken mouth.
- **The Skirts** (the lowest riser east of the wreck): a Heliarch ashlar repair with a walled-up arch, a roundel and a lit lamp niche; a Late raked buttress; two lean-tos under plank roofs (lamp oil, lit; slippers), counters on a capital and a drum, bare shelves on the giants' face.
- **The Leave** (where the kerb K1 leaves): two posts of stacked Heliarch drums, the east one with a capital, an arm and the last lamp; the west one's upper drums lie where they fell.
- **The Hitch** (`gate-lane`, round the stable's back to the gate): two Late houses (`pennyworth-house-1` a `step`, `-2` a `tower` on the bank) with steps down the bank and washing across the lane.

## Counts

- On low: 1 draw, 13,252 triangles (budget 5 / 45k), 0 point lights, 4 lamps of emissive glass, meshes on `ctx.lappet.farHidden`. 26 places left bare (`ctx.pennyworth.places`).
- Geometry: the five places `lappet-pennyworth`, `-market`, `-foot`, `-skirts`, `-hitch` at 0 findings; `house` 88 (next: 106); `strake` 0.

## Changed outside the module (say so to whoever merges)

- **V0's plan**: the gate lane ran through the house's stable and both houses stood on its walls; the lane goes round the stable's back and the houses stand north of it. The garden, stalls and fixtures placed (`FIXTURES`, `fixture`), `molesMay`, `footLaneDist`, `villageClear` true on the Hitch and its two houses beyond the 22 m ring.
- **The bones** (`src/v15/ways/misc.js`): a ramp's edge holds only where it stands more than 0.6 m over its own foot. Measured: the ground just outside the ramp's outer edge is -1.1 against the foot's -0.8, so the controls' rule (held where the drop is over 0.6 m) held the edge to within about 1.4 m of the foot. A keys walk on this branch stuck there at (101.4, -20.5); Q2's touch walk at (96.5, -25.9). The reviewers' reading (the tool steering across a held edge) is right about the tool; the cause of the invisible wall is the sunk ground beside the ramp. For a visitor on a phone: higher up, the held edge is fair (a revetment a metre and more over the turf, the way down plain ahead); in the last 2.5 m it was not, and is open now.
- **The kit** (V1's): a stall's niche inside its walls and its floor under the niche's; the `step` house's pergola cloth lies flat (beam's t and t2 were crossed).
- **The house**: its lanterns' material is double-sided (18 backs gone).
- **The moles**: slots pack closer (1.4, 1.2, 1.0, 0.8 m) only if the free earth will not hold thirty.
- **`tools/village-walk.mjs`**: leaves the ramp by the Slip; `route=pennyworth` (sixth argument) walks the quarter.

## Tests (port 8164, `SHOT_ANGLE=metal nice -n 10`)

- `ONLY=house,twk,strata,dressing,village,geometry,walk,hop,edges,heights,roads,paths,rocks,regions,perf,loading,contrast tools/suite.sh 8164` (at the last source commit): 17 tests, 0 failed. PASS lines: dressing 24, paths 81, roads 62, twk 35, regions 56, contrast 3, strata 8, village 640, house 20, rocks 42, walk 13, hop 25, edges 214, heights 165, geometry 105, loading 28, perf 29. The whole suite was not run.
- `node tools/geometry-test.mjs http://localhost:8164 lappet-pennyworth,lappet-pennyworth-market,lappet-pennyworth-foot,lappet-pennyworth-skirts,lappet-pennyworth-hitch,house,strake`: 30 passed, 0 failed.
- `node tools/glyphs-test.mjs http://localhost:8164`: 13 passed, 0 failed (run before the last garden move; not rerun after).
- `node tools/village-plan-test.mjs`: 7 passed, 0 failed.
- The whole village, crown to foot and back to the crown in one run: `node tools/village-walk.mjs http://localhost:8164 keys low 0 pennyworth-vwalk`: walked yes, ladder 2; `... touch low 0 pennyworth-vwalk`: walked yes, ladder 2, 35 frames (after the ramp fix). Before the fix the keys walk stuck twice (99.7, -23.2 behind the booths: my layout; 101.4, -20.5 on the ramp's held edge).
- The quarter: `node tools/village-walk.mjs http://localhost:8164 keys medium 0 pennyworth-walk pennyworth` and `... touch low 0 pennyworth-walk pennyworth`: walked yes both (ramp's foot, the Slip, the kerb, the market, the south door, the court, the north gate, the Hitch, the Leave, the Skirts). These two ran before the ramp's edge was opened and the block's cloth changed; not rerun after.
- Route frames: `node tools/route-frames.mjs http://localhost:8164 <place> medium pw-route` for the five places: 126, 216, 66, 72, 252 frames.

## Frames (in the order to look)

- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-fin-aerial.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-walk-keys-medium-012-in-the-door-court.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-fin-door-lane.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-fin-market.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-walk-keys-medium-010-thumbway-stalls.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-fin-garden.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-fin-wreck-kerb.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-fin-skirts.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-walk-keys-medium-026-lean-tos-lean-tos.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-walk-keys-medium-024-leave-back.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-fin-hitch-north.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-far-far-p11.png (from the heather track P11, 141 m east)
- low: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pennyworth-finlow-market.png
- route sheets: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1513-pennyworth/shots/wip/pw-route-lappet-pennyworth-medium-sheet.png, `-market-`, `-foot-`, `-skirts-`, `-hitch-`

## What is weak

- **From 150 m east the quarter does not read as a village's edge.** From P11 the house and the foot are a few pale marks in haze under the keep's hill; the wreck's bulk is lost against the riser. Not met.
- **The route frames were not read one by one.** 732 frames were made; I read the five contact sheets' worth only in part (the Thumbway's and the market's sheets) and about twenty single frames. Somebody should read the Hitch's and the Skirts'.
- The booths' lit back walls are still the loudest thing on the Thumbway at medium (halved once).
- The west way round the house is the old path P9; nothing of mine stands on it and it was not walked.
- The two Hitch houses are plain kit houses in grass; the bean bines are single leaf columns.
- The gutter (`flicker.hold = 0.3`) was not rendered.
- No keeper WebP was curated; everything is in `shots/wip/`.

## Defaults taken

Names (`[Proposed]`): the Thumbway, the Hitch, the Slip, the Grudge, the Spilt Measure, the Skirts, the Leave, the Afterdoor. No point light. The wreck stands 15 mm proud of its pad (a board of its yard lay in the pad's plane).
