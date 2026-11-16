# v15-W1: the ways put right (issue-1520-ways)

The owner's words: "bugginess/goofiness in the stair areas; walls right next to stairs, stairs and ladders right by each other, dead-ends". Branch `issue-1520-ways`, port 8165.

## The table: 21 registered ways in the village

From `tools/ways-test.mjs` (every `ctx.ascents` entry inside x 40..130, z -75..40; ends are the path's first and last level points):

| way | built by | from | to |
|---|---|---|---|
| heliarch-head-east, -west | bones (`ways/index.js`) | High Rung 14 | crown 18 |
| heliarch-upper | bones | Mid 10 | High 14 |
| timber-patch | bones | Low 6 (the bastion) | Mid 10 |
| heliarch-foot | bones | bench 3.1 | Low 6 (the bastion) |
| noon-main | bones | bench | High (breach on the Mid by the gangway) |
| rungs-ladder | bones, dressed by the Rungs | High 14 | crown 18 (moved: was Low to Mid) |
| lane-bridge | bones | Mid | Mid (the pier, a lookout) |
| lees-stair | bones | bench | Low |
| pennyworth-ramp | bones | foot -0.8 | bench |
| rungs-mid-1, -2, -3, -7-stair | Rungs (house front stairs) | Mid | the house's roof at High |
| rungs-low-3-stair | Rungs | Low | roof at Mid |
| rungs-leads-1, -2, -3 | Rungs | roof to roof at Mid | |
| rungs-gullet, rungs-tenter | Rungs | Low | Mid |
| quarrels-stage | Quarrels | crown | the Stage 20.5 |

Not registered (not walkable, so not ways): the Short Stair and the Pier Stair (rungs.js: walled, seen not walked), the Strake's Late house front stair, the Spilt Measure's ladder, the old way's bank (P9).

## The check (`tools/ways-test.mjs`, `run ways` in the suite)

Rows per way end: mouth (no collider but the way's own or a flank within 0.8 m of its middle), landing (1.2 m from the last tread, level and a body clear), dead end (a flood of the level meets another way or a plan place); and one row for doubled ways (same two levels, both ends within 6 m). Needs `ctx.controls.floorAt` (a read-only probe added to `src/controls.js`).

- **Before: 106 passed, 23 failed.** Real: the Heliarch foot into the house's tower (mouth, landing, dead end); the Leads' three stiles landing among jars, washing poles and the dovecote (6 rows); the Stage, a lookout the plan did not know (dead end); the ladder doubling the Tenter. Ten were the check's own first-draft errors, fixed in the rule, not the world: a house stair's own front wall counted as a wall in its mouth (5), its head measured straight past its turn onto the roof (5), and the Stage's run on a 1-in-3 hill (1).
- **After: 129 passed, 0 failed.**

## The owner's four places

1. **`2.png`, the stone stair squeezed between its cheek, a tan pier with a lamp and a house wall.** The Heliarch foot flight ran straight out into the Pomegranate House's north-west turret: 0.3 m between its foot and the tower, and the Lees' street could not get past the stair at all. The bastion is now 1.6 m deep (was 2.4) and the foot flight is as steep as the head's (run 0.26). Its foot lands 1.7 m from the tower with 1.2 m of landing, and the street passes between them. A version turned 25 degrees toward the square was built, walked and dropped: a turned head can't lie on the bastion's straight edge, and its first treads sat a knee below the bastion's top, so the keys walk stuck there.
2. **`3.png`, the timber stair onto a tread strewn with blocks, a door, a post and a floating polygon.** That is the timber flight's foot on the Low Rung. Its three fallen Heliarch blocks lay in the Low lane where it ducks under the flight. Two now sit at the riser's foot against the houses' end walls, and one is under the flight's barred low end. The dark polygon is the mud patch the Rungs put on end walls (`kit.js patch()`): a 3 cm plate that stood clear of a battered wall. It is now a 0.16 m slab bedded 0.13 into the wall, in the kit, so every house with a patch is covered (the Rungs are the only caller, on fronts and on end walls).
3. **`4.png`, a stair's head with a newel, a low wall, flags and blocks, a floating polygon, a blue bar.** I read this as the Heliarch upper flight's foot and the hexagon landing on the Mid Rung, with the Leads' rope rails beyond. The polygon is the same patch, now bedded. The landing's own pieces (the broken cheek stumps, the Mid lane's flags) are as they were. I couldn't place the blue bar round a shutter and did not change it.
4. **`6.png`, pale flat triangles against the riser beside a stair's foot.** These were the terrain mesh, not heaps. The crown's ground (`plan.js lappetGround`) never took the coarse pass's lower envelope, so the mesh's crown vertices next to the rim made triangles lean out over the High Rung, in front of the riser at the head flights' feet. `lappetGround` now takes the cell size (`regions.js regionsCoarse()`, `field.js`), and crown vertices within a cell of the rim drop to the tread under the crown's slab.

Also: **the ladder** stood 1.6 m from the Tenter's head, and both joined the Low Rung to the Mid. It now climbs the rim from the High Rung to the crown's west end by the Brow House, which is the only way to the crown besides the Heliarch head. Its knotted rope hangs from a stake on the rim. **The map's stand for the Pomegranate House**, the orchestrator's `settings` finding, landed inside the Strake's new house (its stair collider was in front of the eye). It now stands on the west way, facing the house's west wall (`settings.js HAND.taverna`).

Two more from the orchestrator, both mine to fix. The **settings** stand is fixed as above. **geometry** on `next` after P3 showed a scaffold standard of the Strake's new house floating, in three places. It was a check artefact. The far mesh's block round the house (an exempt stand-in) counted as holding the pole's head, so the pole was judged held at one end and loose at the other: its foot is sunk 0.2 m in the ground, but the ground's face lies in the grid cell above the foot, so it didn't count as touching. Before the far mesh it was held at neither end and was skipped. Now a part named `lappet-far` holds nothing in the loose-end test (`tools/geometry/analyze.mjs`). I tried two wider fixes, letting no exempt part hold, or following the end's edge through the cells. Each moved about 20 baseline findings across the map, and I reverted both. Separately, a first version of my rim band (1.45 cells) left three of the masons' poles at the Brow House floating, so the band is now 1.2 cells. And the ladder's rope hung 0.27 m off its stake; it is now tied to it.

## Tests (`SHOT_ANGLE=metal nice -n 10`, port 8165)

- `node tools/ways-test.mjs http://localhost:8165`: before 106 passed / 23 failed; after **129 passed, 0 failed**.
- `ONLY=village-plan,village,ways,geometry,roads,walk,hop,edges,heights,strata,house,paths,regions,rocks,settings tools/suite.sh 8165`: see the last line of this report.
- The walks (`tools/village-walk.mjs`):
  - keys (`v15-W1-walk7`): walked, the ladder taken twice.
  - touch: walked, the ladder twice.
  - `ROUTE=rungs` (`v15-W1-rungs2`): walked, 11 of 11 ways.
  - `route=pennyworth` (`v15-W1-penny2`): walked.
  - `tools/lees-walk.mjs`: walked.
  - `tools/quarrels-walk.mjs`: walked.
- The keys walk failed three times before it passed. The first was the salt stall's poles in the Slip (fixed). The second was the turned foot flight (now dropped). The third stuck at the start or in the main, steering by drag-look, because headless Chromium refused the pointer capture; it went through on the next run unchanged.

## Frames (before, then after; the views stand at each way's two ends, `-in` looking at the way, `-out` looking off it)

- 2: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-before-heliarch-foot-foot-out.png (the tower in the face), /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-after-heliarch-foot-foot-out.png
- 3: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-before-heliarch-foot-top-out.png (the blocks and the patches), /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-after-heliarch-foot-top-out.png
- 4: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-before-timber-patch-top-out.png (the polygon at left), /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-after-timber-patch-top-out.png
- 6: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-before-heliarch-head-east-foot-in.png (the pale triangle), /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-after-heliarch-head-east-foot-in.png
- the Leads: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-before-rungs-leads-2-top-out.png, /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-after-rungs-leads-2-top-out.png
- the ladder: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-walk5-keys-low-033-ladder-foot-back.png, /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1520-ways/shots/wip/v15-W1-walk5-keys-low-034-ladder-top-back.png
- every way's two ends: `v15-W1-before-*` and `v15-W1-after-*` (84 each)

## Still wrong

- At the Heliarch foot, the house's tower still fills the view straight ahead. The mouth is clear and the way into the square opens to the right, but the stair still points at a tower. The real cure is the house or the stair moving, which is a redesign.
- I read 4.png's place from the frames, not from the owner's own position. Its blue bar round a shutter is not traced.
- The dead-end row counts any plot's front as a place, so a lane that ends at a house wall passes. It finds pockets, not every lane that leads nowhere.
- Not registered, so not checked: the Strake's Late house front stair, the Spilt Measure's ladder, the P9 bank.
- `lees-street` in the plan still runs through the tower's footprint at s 31. It is data only (the walks pass between the foot and the tower), but the next lane-reader should move it.
- Shared files touched: `src/controls.js` (the read-only `floorAt`), `src/height/field.js` and `regions.js` (one line each), `src/settings.js` (one stand), `tools/geometry/analyze.mjs`. The terrain change means the whole suite should run on `next`.

## The last run (after merging `origin/next` with S1 and P3)

`ONLY=village-plan,village,ways,geometry,roads,walk,hop,edges,heights,strata,house,paths,regions,rocks,settings tools/suite.sh 8165`: 14 of 15 pass.

| test | PASS lines |
|---|---|
| settings | 86 |
| paths | 81 |
| roads | 62 |
| village-plan | 7 |
| regions | 56 |
| strata | 8 |
| village | 687 |
| ways | 129 |
| rocks | 42 |
| walk | 13 |
| hop | 25 |
| edges | 214 |
| heights | 198 |
| geometry | 144 |

**house fails, 19 of 20:** "at most three live point-light sources within reach + 20 m of any point on K1 and P9": P9 at (80, -33) has 4 (`quarrels-kiln-light`, the S1 saint's fire, `quarrels.js:283`, with the gate lantern, the court light and the Link-Boy). It passed on this branch before S1 was merged (the first run: house 20 of 20). It is S1's, not this brief's, and I did not change it.
