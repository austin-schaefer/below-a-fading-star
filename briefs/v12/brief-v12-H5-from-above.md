# Brief v12 H5: the valley from above

Worktree: `.claude/worktrees/issue-1206-from-above` (branch `issue-1206-from-above`, port 8162). Work only there. Read `briefs/v12/_common.md` first (its rules about a climb do not apply: you build no climb). Model: strong.

## Goal

v12 gives the visitor four high places: the Span's deck and its thin ways (56 m), the top of the Diffident Stair (about 100 m, at (225,-57), both on `next`), the glacier's shelf (y 95, at about (40,-390)) and a gallery on the west cliff (y 135, near (-320,-60)); the last two are merging as you work. From each, the whole valley is in view for the first time, and it was built to be seen from the ground. Two things are wrong with it from up there, and you fix both.

1. **It costs twice as much.** On the low tier (phones) the floor draws 150 to 260 calls and 1.1 to 2.1M triangles; from the tops it is 360 to 420 calls and 2.3 to 3.2M (the stair's top 3.0 to 3.2M, the gallery looking east 2.6M, the shelf looking south 2.28M). Headless frames are vsync-capped at 16.7 ms and show nothing; a phone will. Find where the triangles and calls go when the eye is high (`ctx.perf`'s per-module counts from each top; `?perf=1`; the perf test's bench) and bring the tops on low to no more than about 1.3 times the floor's worst (2.1M triangles, 260 calls), without anything popping as the visitor climbs: far ground-cover and small dressing that cannot be resolved from 100 m and 300 m away drawn cheaper or not at all (by true distance, eased), instanced things culled in blocks, shadows casters trimmed for the high box, modules that update for a walker "near" them in plan but 100 m above. Medium and high may keep more. Measure before and after from all four tops and three floor places, low and medium, and put the table in your report.
2. **It looks flatter and emptier than it is.** Reported from the tops so far: the valley reads violet and flat from above; the glacier was a ruled pale sheet (H2 is rebuilding it); a flat red stain near the Galleries; roofs, crowns and water never meant to be seen from over them. Render `tools/views-v12-heights.json` and a look down and out from each of the four tops (low, medium, high), look at every frame, and list what is wrong in order of how much it spoils the view. Fix the worst five or so that are the world's: e.g. ground that needs larger-scale colour and light variation to read as country from above (the roads, the fen's water, the wood's mass, the moor's rises should each be legible as themselves), a thing with no top, water that goes flat, a stain. Keep the floor's look unchanged: pairs at walking height for everything you touch.
3. **Each top points at another.** From each high place a visitor should be able to pick out at least one of the other ways up and want to go there (the stair's posts and the lattice foot from the Span; the Span's ragged ways from the stair's top; the icefall and the Plummet from everywhere; the lift's lamp crawling on the west cliff). Where one cannot be seen for a reason you can fix cheaply (a lamp, a glint, a line of sight), fix it; otherwise list it.

## Not yours

The four ascents themselves (`src/v4/span/`, `src/v12/stair*`, `src/v12/icefall*`, `src/v5/galleries.js`): tell the orchestrator what you would change in them. `src/terrain.js`'s glacier block (H2 is in it). You may edit shared code (`src/main.js`, vegetation, dressing, `src/v12/above.js`), so run the whole suite before handing back.

## Done when

- The cost table, before and after, four tops and three floor places, low and medium; `perf-test` green; a check added to `heights-test` (or `perf-test`) that fails if a top on low exceeds the bound.
- Frames climbing the stair and riding (or walking) to each top at 5 m steps of height over one stretch, showing nothing pops.
- The list of what was wrong from above, the five fixed with before and after from the top and from the floor, the rest for the idea bank.
- `tools/suite.sh 8162`, with the counts.
