# v15, for the four quarter briefs (batch 2)

Read `_common.md` first; this adds to it. Then `plans/wilderness-v15.md` whole, `briefs/v15/reports/issue-1500-bones.md` ("What each quarter's agent most needs to know") and `issue-1501-houses.md`, and `world-code/runtime.md`, "Building on the Lappet".

**What exists.** The bones (`src/v15/plan.js`, `bones.js`, `ways/`): the Elder steps, the Heliarch stair, the daylight main, the ladder, a bridge, a ramp, vaults behind the shop plots. The houses' kit (`src/v15/houses/`: `makePlot(B, plot, o)`, `registerAll`, Late houses, undercroft shops, Elder slab-houses, the vessel forms `sherd`, `sunk`, `wreck`, the new house) and one finished row, the Strake, on the Low Rung's riser. Your quarter's module is a stub in `src/v15/quarters/<name>.js`, already in `MODULES`: fill it; do not edit `src/main.js`.

**What you make.** Your quarter, finished: every plot the plan gives your quarter built with the kit, and then the half of the work the kit cannot do: the ground between (paving, steps, drains, a worn line where feet go), the things that join building to building (a wall, an arch over a lane, a plank from roof to roof, washing, a vine), the one or two set pieces your brief names, and lamps and lit windows enough that your quarter reads from 100 m at the gutter. People, shop contents and sound come in batch 3: leave them a place (a counter with a bare shelf, a bench, a doorway) and list those places in your report.

**Rules of the village, learned in batch 1:**
- **Five ages, and the join is the point.** The best thing a blind reader found was "one age built on another, and clearly in use" (a plaster room on a Heliarch arch). Every building should lean on, sit in, or reuse something older. Never five ages in a row again as a showcase: the Strake did that once.
- **Late plaster carries the village; vessels are rare.** A reader said thirty vessel-houses "would make it a toy shop". At most one vessel form a quarter, never whole, never the same form as its neighbour quarter's (your brief says which).
- **Walls say who lives there, not props:** stain, patch, sag, a fallen corner. No clean boxes.
- **It is in the keep's shadow**, never sunlit: it reads by value in shade and by its own lamps. Look at a frame in normal light and one at the gutter for every view.
- **No toy colours, no iron railings, no lamp-posts, no striped awnings.** Rails are stone, plaster, rope or plank.
- **Nothing floats, flickers or shows its back, and the check does not catch everything**: it passed awnings with loose triangles, a door leaf standing free, a ladder to nothing, a plank in the air. So: add your quarter's places to `GEOMETRY_PLACES` and hold them to zero, **and** render every walkable metre with `tools/route-frames.mjs` on medium and look at each frame at full size, one by one. Batch 1's authors looked at half-size sheets and missed all of those.
- **The plan is V0's.** If a plot, lane or opening is wrong for you, change `plan.js` in one small commit that says why, keep `village-test`'s plan check green, and say so in your report: three other agents read that file.
- **Budget, yours alone:** 5 draw calls and 45k triangles at low (55k for the Rungs), three point lights at most in the nearest-three slots at once. Say your counts.
- **From far off on low your quarter is not drawn.** The view from the Hanging Croft's deck is at its triangle limit (`heights-test`, "cost: top stair on low": 2.73M, and it stood at 2.72M before the village). Push every mesh you add onto `ctx.lappet.farHidden` (`src/v15/bones.js`: on low they are hidden beyond 150 m from the village's middle); the bones stay. Batch 3 gives the village one cheap far mesh. `ONLY=heights` must stay green.
- **Names** are yours to give inside your quarter (a lane, a shop, a stair), in the valley's voice; put them in the plan as `name`, marked `[Proposed]` in a comment.

**Tests before handing back:** `ONLY=village,geometry,walk,hop,edges,heights,roads,paths,rocks,regions,strata,house,perf,loading,contrast tools/suite.sh <port>` and `node tools/village-walk.mjs` through your quarter on keys and touch. Never the whole suite.

**Report** (`briefs/v15/reports/<branch>.md`, and under 250 words back): what stands on which plot; the set pieces; your counts; the frames in the order a stranger should see them (far, arriving, each set piece, the route sheets); the places left for people and contents; what is weak.
