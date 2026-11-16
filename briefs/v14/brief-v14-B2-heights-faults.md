# Brief v14-B2: the heights' faults (#41, #47, #48, #49, #50, #51)

Worktree `.claude/worktrees/issue-1402-heights-faults`, branch `issue-1402-heights-faults`, port 8163. Work only there. Read `briefs/v14/_common.md` first and do what it says. Read `plans/wilderness-v12.md` for the places.

The owner walked v12 and wrote down what broke. Their words are the whole of each issue (read each: `gh issue view <n> --json title,body`). Most are only a title and a screenshot with no coordinates: the screenshots are linked in the bodies; fetch and look at them if you can, and find the place from what they show. If you cannot see a screenshot, find every candidate of the kind and check them all, and say in the report that the match is by kind, not by picture.

- **#50 "Elevator gyrates horribly / erratically as it ascendas"**: the lift on the west cliff (`src/v12/lift.js`). Ride it in a real browser with the pointer captured, record the eye's position and yaw every frame for the whole ride on low and medium (and under a 4x CPU throttle), and find what shakes: the carry against the walker's own floor, a frame-rate-dependent step, the look being eased against the visitor. A ride is smooth when the eye's path has no reversal a visitor did not ask for; add that to `lift-test`.
- **#47 "This crystal bridge has a rendering error where some faces are missing"**: winding, a single-sided material seen from behind, or culling by a wrong bound. Look at every crystal walkway from above, below and both ends.
- **#51 "These chain links aren't connected, and they clip thru floor"**.
- **#49 "Lighting bug on this lantern"** and **#41 "Interior textures on lamp flickers crazily"**: probably z-fighting of coincident faces or an emissive lining inside the glass; check every lamp kind at 1 m and 10 m, moving.
- **#48 "Path running thru boulders?"**: "We need better / more careful guards in general on this kinda thing." So the instance and the guard: a check (in `paths-test` or `rocks-test`) that no rock, boulder or tree collider stands on any walked way (roads, paths, the v12 ways up, the stands of the settings map), run over the whole map, and whatever it finds fixed by the rock moving, not the path.

Each is reproduced first (keep the before frames), fixed at its cause, its kind looked for elsewhere, and judged moving.

Done when: the six are fixed or named as not fixed with why; `ONLY=lift,heights,paths,roads,rocks,edges,walk,perf tools/suite.sh 8163` passes with counts, plus the checks you add. If a fix moves any scatter stream, say which modules `tools/build-check.mjs` reports as moved.
