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

## Round 2 (the owner: "yes, it was slab line that i followed to stair")

Merged `origin/next` first.

- **At the cause** (`src/v12/stair/plan.js`, pure, the same in every tool; the pose in `src/v12/stair.js`): a slab lying in the turf was flat and 15 cm proud, so the line read as paving. Now 147 of them lie under the turf altogether, bed and all, in runs of about a metre. The rest are sunk to a lip and canted (0.1 to 0.26 rad across, up to 0.25 rad askew), like fallen treads. Everything near the stub's back is under: the flight past the stub and its first landing. The nearest slab in sight is 6 m from the back. The last 5 m of the top flight is under too, because it came within a step of P10. No slab joins a path. Called, they still tear up out of the ground, with the dust at the turf.
- **P53**, a trod off P22 at (247, -15), crosses the sunk slabs, passes behind the stub and runs down its west side to the foot, where it meets P51. From the back, the way round is a worn trod. P51 stays.
- **roads-test**: an ascent may name its `back` (the stair does). Within 4 m of it there may be no track end and no slab lying in sight. The Sexton's stair into the Nave (`coffin-road`, which came in from next) has no track to its head, 42 m from P22. It is listed in `FEET_OPEN` for the Nave's brief and not fixed here.

### Tests

`ONLY=roads,paths,stair,heights,settings,walk,rocks tools/suite.sh 8164`: paths 79, roads 58, rocks 42, walk 13, heights 111 (the stair's ascent climbed), stair 5, all ok. **settings fails** at its first `page.click('#gear')`, a 30 s timeout, both times. It fails the same way with next's own `stair.js`, `plan.js` and `routes.js` in place of mine, so it comes from next (after D0's merge), not from this branch. In my own probe page the gear clicked at once.

### Scatter (instance and collider positions dumped with and without P51 to P53, diffed; the dump is deterministic)

- roads (gnomon beads, colliders): 9 to 12 moved, all within 34 m of the new trods.
- High Ling (clitter 128, gorse 42 + 7 far, stonechats 10, colliders 32): moved up to 89 m off, over the region. Its stream re-rolls.
- rocks: 86 of 825 colliders and about 90 instances moved **across the whole map**, as far as (-220, 219). A changed lead shifts the rocks' one stream. That is wider than the trods.
- vegetation: 3 of 408 build-check entries.

### Frames (shots/wip/)

- From the slab line's west end at P10: `b6r2-slabs-00-0m` to `-12-end`, plan `b6r2-slabs-plan`.
- From P22 along P53: `b6r2-p22-00-0m` to `-07-end`, plan `b6r2-p22-plan`.
- Views: `b6r2-after-plan-above`, `b6r2-after-slabs-close`, `b6r2-after-oblique`.
- The icefall's P52: `b6r2-icefall-02-20m`, `b6r2-icefall-05-end`.
- The plans outline the buried slabs and fill the ones in sight.

### Weak

- My walks follow a script; no one walked them without knowing the place.
- The canted slabs overlap one another where two cant into each other.

## Round 3 (the cold review)

- **Blocker fixed:** the bed lies flat on the turf, following its slope but not the slab's cant or skew, 1 cm up. A lying slab's top centre is 6 cm up (a tread) or 7 cm up (a landing), so the stone shows. A risen slab leaves a flat dark patch with no raised edge. Frames: `shots/wip/b6r3-slabs-lying.png` and `b6r3-beds-risen.png` (every slab called with `stair.all(true)`).
- A buried slab's top is 0.45 m down, with only a little skew and no cant. A slab stacked on a buried one is buried with it.
- The comments in `plan.js`, `routes.js` (P51, P52) and `roads-test` are in the present tense.
- `FEET_OPEN`: the exempted ways up are now checked too. The check fails once a track reaches the foot of one, so the exemption has to be dropped then.
- `ONLY=stair,roads,paths`: stair 5, roads 59, paths 79, all ok. `ONLY=heights`: 111, ok.
