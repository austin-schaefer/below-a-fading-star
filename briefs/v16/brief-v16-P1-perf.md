Brief: v16 P1, performance: the walk after the village, and the tools
Worktree: `.claude/worktrees/issue-1602-perf`, branch `issue-1602-perf`, port 8162. Work only there. `briefs/v16/_common.md` first.

Goal. v15 put a village on the hill and the walk got heavier: the suite's `hop` test saw the walker's update at 0.670 ms with 6551 colliders; `load` failed once under load; nobody has measured the frame at the Lappet against the rest. Find where the time goes now and take the largest costs out, so a phone walks the village as easily as the moor.

1. **Measure first**, on this branch as it stands: `perf-test`, the bench and the profiler (`world-code/runtime.md`: `?perf=1`, the tiers, `tools/views-perf.json`) at the standing perf views plus four in and round the Lappet (the crown, the Rungs' lane, the Lees' square, from the house looking up) and one underground; low and medium. Draw calls, triangles, frame ms by module, the walker's update, scene build time. Write the table into your report before changing anything.
2. **Fix the three largest costs you find**, largest first, each measured before and after. Likely places, not orders: the collider count and how the walker queries them (a grid or a broad phase if it scans); per-frame work in modules far from the visitor (update culling by distance); draw calls in the village on low; anything rebuilt every frame. No change to what a visitor sees at medium and high; on low a change must be one a blind reader would not name.
3. **The tools.** Agent issue #79 (read its body: `gh issue view 79 --json body --jq .body`) proposes Metal as the default WebGL backend for `tools/*` on this Mac instead of a flag every agent must remember. Do it if it is what the issue says it is: the default in one place, the software path still selectable (`SHOT_ANGLE=swiftshader`), `AGENTS.md`'s pace rule and the skills' lines made to match, and the suite's time for three tests before and after.

Not yours: `src/height/*` (three agents are reshaping the floor; if height sampling is a top cost, write what you measured and the fix you would make into your report and stop there), `src/sky.js` and the gutter's answers (S1).

Files likely involved: `src/controls.js` and the walker's collision code, `src/perf.js`, `src/main.js` (the update loop; keep edits tight), `src/v15/*` (colliders, merges), `tools/shot.mjs`, `tools/views.mjs`, the test runners' launch options, `tools/suite.sh`.

Done when: the before and after table (each view, each tier) is in your report and the after is no worse anywhere and better at the Lappet; `ONLY=perf,hop,walk,load,village,heights,settings,touch` green (use the suite's real names for these; say the counts); if colliders changed, a walk on the keys through the Lappet's main stair top to bottom in frames, feet where the drawing says; the tools' default as above or a plain reason why not.

Finish and report as `_common.md` says.
