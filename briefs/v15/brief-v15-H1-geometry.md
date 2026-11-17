# Brief v15-H1: the geometry check and the walk (#64)

Worktree `.claude/worktrees/issue-1502-geometry`, branch `issue-1502-geometry`, port 8163. Work only there. Read `briefs/v15/_common.md` first; then `gh issue view 64 --json body --jq .body` (the body only: it is the orchestrator's assessment on the owner's question) and `plans/wilderness-v15.md`.

## Goal

The last three releases each shipped about five visual glitches the owner found within the hour: faces flickering in one plane, supports and chain ends attached to nothing, faces missing or seen from behind on stairs and in passages. No test looks for any of it, and v15 is a whole village at arm's length. Build the two tools that would have caught them, prove each on a fault that is live on `next` today (#60, #61, #63 are not yet fixed: brief F1 fixes them, you only detect them), and put them where every agent meets them.

## What to build

1. **`tools/geometry-test.mjs`**, in the suite. It loads the scene (as the other tests do; see `tools/coplanar.js` and how `tools/dressing-test.mjs` or `strata-test` read meshes from the page), and for the meshes within a radius of each listed place reports:
   - **coplanar overlap**: triangles of different meshes (or of one mesh, facing the same way) lying in one plane within a tolerance and overlapping by more than a small area: the cause of flicker;
   - **floating parts**: connected components of a mesh (by welded position) that touch neither the ground, a walkable floor, nor any other component or mesh within a tolerance: a strut or chain end attached to nothing. Things meant to hang in air (a lamp's halo, particles, flames, the sky's furniture, carried things) are exempted by name, with the reason beside each;
   - **backs showing**: at sampled standing points on every walkable floor in the place, rays cast round the head that first hit the back of a single-sided face (or escape to the sky from a place marked sealed).
   Places are a list in the tool (v14's descent, passage, Pit stair and landings; v12's stairs, lift stations and bridge; the Span's stairs; the house) that a brief extends in one line; `src/v15/plan.js` will add the village (leave the hook, and say how in `world-code/runtime.md`). It prints each finding with mesh name, world position and a `?pos=` URL to stand there. It must run in a few minutes and fit the pace rules (one browser; do the heavy work in node from extracted buffers if the page is slow).
   Tolerances are the craft: tune them until it finds #60, #61 and #63 (reproduce each in a render first, keep the frame) and is quiet on what is sound. What it finds besides: list it in your report with a frame each; fix what is plainly a one-line fault outside F1's files, leave the rest listed for the orchestrator. If the count on `next` is not zero when you hand back, the test takes a baseline file of known findings and fails on any new one: say which, and keep the baseline short.
2. **`tools/route-frames.mjs`**: given a named route (a polyline with y, from a list in the tool or a place's walkable), it stands every metre along it on medium, turns the head through four or more yaws and a look down and up, and writes numbered frames and one contact sheet a route into `shots/wip/`. This is the walk a reader who did not build the place looks at before a merge. Prove it on the Pit stair and the passage's entry.
3. **The words.** `world-code/SKILL.md` (tests before pushing; reviewing a branch) and `orchestrator` ("Checking and merging") each get the line that makes this happen: new walkable geometry is checked by `geometry` and its route frames are read by an agent that did not build it before it merges; no visual fix ships without the frame that shows it fixed; the critic's time has a floor in proportion to new walkable metres. Sharpen, do not append: these skills are read on every run. `critic.md` gets its floor.

## Done when

- `ONLY=geometry tools/suite.sh 8163` runs, reports its counts, fails on a planted fault of each of the three kinds (plant them in a test fixture, not in the world) and finds the three live issues.
- The suite's whole-run time grows by under four minutes; say the figure.
- The report lists every finding on `next` by kind, with frames for the ten worst.

Report as `_common.md` says.
