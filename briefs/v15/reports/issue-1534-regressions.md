# v15-R1 report: the Pit's rim and the stair jitter

Branch `issue-1534-regressions`. Served on 8187 (8177, the brief's port, was held by another agent's server, `issue-1540-critic`). `origin/main` (e4bf434) was served from a second worktree, `.claude/worktrees/issue-1534-oldmain`, on 8178.

## 1. The rim peeled: reproduced, the commit found, fixed

- **Reproduced** on `next` in a fresh browser (no store involved) from four stands 3 m outside the rim, looking down along the lip (`rim-next-fresh-b{0,90,180,270}.png`). The same stands on `origin/main` draw a broken lip of clods over the join (`rim-main-fresh-*`).
- **Commit:** `fb778dc` (v14 review round, "the lip's clods on the drawn lip"). In `src/v4/paths.js` the line that builds each clod ended in a `//` comment that swallowed `tilt` and `yaw`. Every instance of `paths-pit-lip` got a NaN rotation and drew nothing, so the Pit's wall stood bare against the turf with the dark seam between them showing. That is the owner's 18.png and 21.png.
- **Fix:** the comment now sits on its own line (`rim-fixed-b0.png` and `rim-fixed-b90.png` show the clods back; compare `rim-next-fresh-*` and `rim-main-fresh-*`). The rng stream still differs from main because of #59's slab removal, so the clods are not the same ones.
- **Guard:** `geometry-test` has two new rows. A planted instanced mesh with one NaN instance must be found, and every drawn mesh and instance in the scene must have a finite placement. I looked for other comments that swallow code: none found in the diff since main.
- The owner's views: `?pos=200,169.3&yaw=3.84&pitch=-0.5` and `?pos=217.9,185&yaw=2.27&pitch=-0.5`.

## 2. The stair jitter: reproduced only as frame-time dependence, older than v15

- **Real keys, real frames** (W held, yaw steered, frames logged at each `composer.render`): Diffident Stair, Pit, Span west, Heliarch foot and Lees stair on next and main. Eye-height plots: `plot-stair-a.png`, `plot-pit-a.png`, `plot-village-a.png`. On these traces I saw no sawtooth, no one-frame snap and no double step, and main and next look alike.
- **Store:** a persistent profile visited main and then next on the same origin (8188). Every kept record missed with "scripts changed", as it should, so the store is not in play.
- **Deterministic A/B:** I drove `controls.update` synchronously on a seeded uneven clock (8 to 55 ms frames) and on an even 60 Hz clock. The Diffident Stair, Span west and the Pit give **bit-for-bit the same eye on main and next**. So no commit brought it.
- **Cause:** the eye's lag ran out by the clock alone, starting from the frame in which a riser was met. Under uneven frames that put the eye 12 to 19 mm rms (up to 113 mm) away from where an even clock puts it at the same place on the stair. v15 added many short stacked flights and a heavier scene (the owner saw 46 to 60 fps). The fault is older than v15; v15 made it show.
- **Fix** (`src/controls.js`, `finish`): the lag now runs out by `EYE_RUN` (0.36 m of the way walked) and `EYE_REST` (0.4 s of the clock). Together these come to about the old 80 ms at a walk. Each step is also placed within its frame by four `floorAt` halvings, which only run on frames that have a step. Village flights went from 12–17 to 3–5 mm rms, the Span from 19 to 11, the Pit from 9 to 6 (`plot-eye-heliarch-before-after.png`).
- **Guard:** `heights-test`, rows `eye (R1)`. Each of five stairs is walked on both clocks, with a limit of 10 mm rms (14 on the Span, whose landings turn). With the old eye, 4 of the 5 rows fail: Heliarch 16.1, Lees 13.8, Noon 16.9, Span 19.5 mm.
- **Still weak:** I compared the two clocks numerically and as plots. I did not judge the change by eye on a real GPU at 46–60 fps. The Span's residual comes from where the two walkers take the turns on its landings, not from the eye.

## Tests

`SHOT_ANGLE=metal ONLY=seams,heights,walk,hop,edges,geometry,paths,stair,loading,perf tools/suite.sh 8187`: 10 tests, 2 failed, on the first run (22 min).
- paths 81, walk 13, edges 214, heights 203 (with the five new eye rows), seams 3, loading 28, perf 29, stair 5: all passed.
- **hop** failed one row, "the walker's update stays cheap": 0.520 ms against a 0.5 ms limit. That run shared the machine with other agents' browsers.
- **geometry** failed on `v14-pit-stair`: 12 new findings, all of them the restored clods (6 floating, 6 buried-hidden). I tried dropping the clods that hang over the throat or sink out of sight. That cleared the check but peeled the rim again (`rim-fixed2-b0.png`), so I reverted it. Instead the two groups go into `tools/geometry-baseline.json` with the reason: these are the clods as they are on main, and they hang by an edge to cover the seam.
- Rerun `ONLY=hop,geometry tools/suite.sh 8187`: **2 tests, 0 failed** (hop 25, geometry 137, which includes the two new placement rows).

Frames and plots are in `shots/wip/r1/`; the walk logs are in `shots/wip/r1/walk/` and `shots/wip/r1/sim/`.
