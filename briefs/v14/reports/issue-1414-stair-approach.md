# v14-B6 report: the path to the Lonely Staircase (#54)

Branch `issue-1414-stair-approach`, port 8164.

## What it was

No track in `src/v4/paths/routes.js` reached the stair: the nearest, P22 (the Nave way), passes 38 m west, and `roads-test` exempted the place (`diffident`, 25 m). The "path" a visitor follows is the stair's own line of slabs lying in the turf: from beside P22 at the switchback landing (267, -8) it runs north, east and south to the stub's **top** end (288, -14). The first tread is at (288, -4.2) and the stair climbs north, so the slabs bring a walker to the stub's blank back. Reproduced on the keys with the mouse captured (`tools/approach-walk.mjs`, new): from (248.5, -10) along the slabs, 50.6 m, ending at (288, -15.5) facing the masonry.

The stair's ascent (`ctx.ascents` 'stair') also started on its first tread: `FOOTX` stepped "east" of a stub that no longer climbs west, so `path[0]` equalled `path[1]`.

## What changed

- **The path, not the stair.** The stair's facing (side-on to the road and the Nave) stays. **P51**, a heather trod, leaves the P22/P11 fork at (251, 4), swings south round the High Ling tor at (258, -2) (three boulders, r 2.6 to 3.2, that a straight line runs into), and comes up from the south to (288, -2.6), 1.4 m before the first riser. The walk along it ends at (287.9, -2.3) looking straight up the thirty steps. The slabs still meet the stub's top, because that is where the stair goes on.
- `src/v12/stair.js`: the ascent starts a step before the first tread, on the side away from the climb.
- `tools/roads-test.mjs`: the `diffident` exemption is gone (the stair is reached by P51). New check: for every ascent whose foot is on the ground, the nearest track end is within 4 m of `path[0]` and not on the climb's side.
- **What the check found:** the icefall. No track came within 74 m of its foot (58, -279). Fixed with **P52**, a 48 m trod off P19 across the Lattice's flat floor (8 to 14 m, no colliders) that comes to the foot from the north (1.5 m from it, behind). The lift's gallery ascent starts at its top, so the check skips it. The Span's stairs (the Cyclopean Stairs, still exempt in roads-test, 15.4 m) do not register in `ctx.ascents`, so the check cannot see them. **Not fixed:** register them and give them tracks.
- `tools/paths-test.mjs` counts 52 paths. Docs: `world-code/runtime.md` (the tool, the check); the tender's story log.

## Tests

`ONLY=roads,paths,stair,heights,settings,walk,rocks tools/suite.sh 8164`: settings 85, roads 56, rocks 42, walk 13, heights 105, stair 5 PASS lines, all ok. paths failed on its lead count (50, now 52). After that fix, `ONLY=paths,roads`: roads 56/56, then `ONLY=paths`: 78/78. The settings view check passes: the stand at (275, 0) still shows the stub.

`tools/build-check.mjs` (before, P51 and P52 removed, against after) MOVED: paths, roads (gnomons), rocks, vegetation, region-highLing, core, colliders. Everything else is IDENTICAL.

## Frames (shots/wip/)

- Before: `stair-approach-before-plan-above.png` (render from above), `b6-before-00-0m` … `b6-before-06-end` (along the slabs to the stub's back), `b6-before-plan.png`.
- After: `b6-after-00-0m` … `b6-after-05-end` (P51 from P22 to the foot, the stair ahead), `b6-after-plan.png`.

## Weak

- The trod is a 0.5 m trod like its region's. Seen from the fork it is a faint worn strip beside the tor. The slab line is still the brighter line, and someone who follows it still reaches the back.
- P52 to the icefall is checked by roads-test (walkable, unblocked, gnomons in sight) but was not walked in a browser.

## Defaults taken

- I moved the path, not the stair, as the brief preferred.
- The check uses 4 m and "not more than 0.3 m up the climb's side".
- Following the brief, I fixed the icefall's missing trod because it was small.
