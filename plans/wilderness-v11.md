# Wilderness v11: the mountains

The ring mountains are in almost every frame and have been the jankiest thing in every release. v11 makes them look like mountains that happen to stand round a valley, and makes them step back: a supporting character, not the star.

## What was chosen, and why

The owner's word, in session on 2026-11-12: "let's work on the mountains!". So no choosing: the milestone is the owner's **#5** (Better mountains), with the tweak **#6** (the two big square things on the west wall) which names it. From #5:

> The earliest releases looked like My First Fractal Mountains. Too low-poly, too cheap. They were also far too regular, creating an overly artificial feeling. Later releases have upped fidelity, but still suffer from weirdness. In the current release, for instance, mountains have an exaggerated striation effect that's again very distracting.
>
> 1. Mountains are a supporting character, not the star
> 2. Mountains need to look natural and are worth spending some budget on, because they're visible in practically every frame.

Passed over, still in the pool: #4 the Heights and Depths (#5 points at it; ways up into the mountains are a milestone of their own and want a wall worth climbing first), #18, #20, #23, #28, #30. #22 waits on the owner.

## The look before planning

Seventeen renders at medium, `shots/wip/v11-00-before-*.png`, from `tools/views-v11-mountains.json` (spawn, 70 m over the centre at six yaws, the High Ling, the foreland, the west). Every brief renders the same file before and after. What they show:

- **Contour lines.** Every face away from the sun is ruled with evenly spaced horizontal lines (ledges cut in the geometry every 13 to 17 m, then outlined by the curvature bake, brightened by the shader's ledge lines, which never fade with distance, and stacked with three more height bands). Crossing them, rows of vertical fins like a picket fence. Together: a quarry face, or a topographic map (`high-y0`, `high-y4`).
- **Bell curves.** Each massif is one smooth hump, nearly symmetric; no ridgeline, no shoulder that leads the eye, no spur, no valley cut by water (`foreland-y2`, `high-y2`).
- **Cardboard behind.** The far ranges are flat lilac cut-outs with no light or structure on them.
- **No recession.** In the cold light the near wall is as contrasty at 400 m as the ground at 40 m, so it competes with everything in front of it. Toward the sun the haze already does this well: the walls there are the best the mountains look (`spawn-y1`).
- **#6:** the Galleries of Durance (`src/v5/galleries.js`, bearings 268 to 296) and the Escarpment Lamps (`src/v5/lamps.js`, 300 to 318) are two rectangles of the same size side by side on one massif (`highling-y1`).

## What a visitor should notice

Nothing, at first: the mountains stop catching the eye. Then, looking at them: rock that water and frost have worked, with gullies running down it, ribs and spurs, fans of scree at the foot, ridgelines that lead somewhere, ranges behind ranges going pale. No ruled lines. And on the west wall one great thing, not two.

## Calls made, each reversible

- **The massifs stay.** The owner chose C's five massifs and deep cols (the study); v11 keeps that plan, the sun's saddle as lowest col, `crestAt` / `faceAt` / `walkLimit` / `seats` as an API. It changes what the massifs are made of and how their outlines run.
- **The ledges go.** Bedding survives only as broken, tilted, irregular structure seen here and there, never as rules across a face.
- **Erosion is the organising idea.** What makes rock read as natural is that everything on it runs downhill: drainage first, bedding second.
- **Budget may be spent** (#5): more triangles in the far rings, more shader work on the wall, within the perf test's gates on low.
- **The Lamps move** away from the Galleries (#6 suggests it); where to is M3's call.
- **One before nine** does not split this further: three briefs, each a different part, judged on the same views. The judge is a blind reader and, when they are back, the owner: `http://localhost:8123/?pos=0,0` and look round.

## Done when

- The seventeen views show no ruled horizontal lines and no picket fins at any distance, on low, medium and high.
- A fresh agent shown the after frames alone, asked what is odd or artificial in them, does not name the mountains first.
- Everything hung on the wall (Galleries, Lamps, Hawser, Annals, Vigilant, Gradine, Thrones, Long Figure, Ridge, Span abutments, the fall) sits on it properly in a render.
- `tools/suite.sh` green; the walk no slower on low (`perf-test`).
- #6: no frame has the two squares side by side.

## Status

**2026-11-12, 09:48 PST. M4 is merged: every brief is in; the release's tail has begun.** `issue-1104-fitting` at `366d82b` (its counts: paths 75, roads 44, contrast 3, walk 10, hop 25, edges 101, mountains 4, loading 7, perf 17). **Load time:** the bake called `biomeAt` (five `heightAt`) per vertex; it now passes the height it has. First build on this machine: low 2866 to 1925 ms, medium 5598 to 3762 ms (before M1: 2403 and 4852), output identical to one float32 step (`tools/terrain-probe.mjs`). **`mountains-test` is in the gate**: stepping (autocorrelation 0.020 today, 0.173 with v10's bedding, limit 0.08), folds (0.03 against 0.68, limit 0.10), and horizontal-line share in two pictures (0.063 / 0.050 today, 0.125 / 0.155 on the before frames, limit 0.10); `--self-check` proves it fails the old wall. Its picture boxes are fixed: move them if the outline moves. **Weak spots:** the sunward haze keeps a little more detail (the rest of that smoothness is the backlit faces' own flat light: still weak, `v11-M4-r1-high-y3`); scree no longer climbs to the crests; the Span's east abutment was looked at and left. Merged on the agent's numbers and two frames, with no cold review of its diff: the full gate is its check. Worktree removed; no implementation agent is in flight.

Running now: the **critic** (opus, on 8123, renders `critic-v11-*`) and the **curator** (sonnet, `v11-*` only, 16 to 22 keepers). The `RELEASES.md` entry ("v11: Better mountains") and the `README.md` line are written and **uncommitted** in the deploy worktree, with a `PICTURES` placeholder line to replace by four keepers. Then: the critic's blocking fixes, the curator's work committed, **one full `tools/suite.sh 8123`** (shared code changed: `src/terrain.js`, `src/atmosphere.js`, `src/main.js` a comment), `tools/release-check.sh`, the release PR, `tools/gh-release.sh v11`, close #5 and #6 from the release, merge `origin/main` back, the look back.

**2026-11-12, 09:47 PST. M3 (#6, the two squares) is merged after three rounds.** `issue-1103-squares` at `e29e4cf` (its counts: settings 67, paths 75, roads 44, walk 10, hop 25, edges 101, loading 7, perf 17). **The Lamps** are on the south massif (bearings 190 to 218, about (-171, 384)), a city of lit rectangular windows in terraces up a real couloir over the Great Span's arches, with a stair to the left, a ledge string to the right, outliers above and one great arch (a quad); 227 windows on high, 114 on low, one draw call; points capped at 60 px (the 64 px clamp), checked in Firefox. The sun test is relaxed to normal·sun > 0.2. **The Galleries** are a ragged prow with one long arm, alone on the west massif. The orchestrator looked at each round's frames (`v11-03-r3-lamps-400`, `-lamps-span`, `v11-03-r2-highling-y1`, now in the deploy worktree's `shots/wip/`): from 400 m the Lamps read as a city, which round one's sparks did not. A cold review (sonnet): no blockers; the point-size cap and stale references to the old site were its should-fixes, done in round three. Weak: the ledge string reads as a bead necklace; the Span hides the city's foot from the causeway; the windows are flat lit squares up close. No blind read of the final frames: the critic's job. Worktree removed. In flight: M4 (8164).

**2026-11-12, 09:18 PST. M1 (the rock) is merged after round two; M4 and M3's round two are out.** `issue-1101-rock` at `3b2e20b` is on `next` (its counts: paths 75, roads 44, regions 56, contrast 3, walk 10, hop 25, edges 101, loading 7, perf 17 at 16.67 ms on low, gutter 11). Round two gave each face three values (damp couloirs and basalt; slate and rust masses; pale broken beds, scree and fans), two families of couloirs thinned and clustered by sector, crag steps at 8 to 40 m, the haze compressing values and not washing them out (0.16 mix, ramped 180 to 560 m), the new relief at the hung bearings with its mean subtracted (`T_FIX`), and the review's fixes. The orchestrator's look (`v11-M1-s8-medium-*`, now in the deploy worktree's `shots/wip/`): at walking height the walls read as mountains and sit back (`-foreland-y2`, `-highling-y1`); from 70 m the cold faces are rust and slate rock with couloirs (`-high-y0`, `-high-y4`). Merged on that look, with no second blind read and no second cold review: the critic gets it before release. Weak: the southern massifs toward the sun are still smooth (`-high-y3`); upper faces pale; smooth at 100 m (the mesh's limit); the Span's east abutment (130) lost 10 to 20 m of wall above it. **Cost: the terrain build is slower, 2.33 to 2.80 s on low and 4.30 to 5.37 s on medium** (M1's numbers); M4 is to win it back.

In flight:

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| M4 load time, `mountains-test` in the gate, M1's weak spots (`brief-v11-M4-fitting.md`) | `issue-1104-fitting` | 8164 | opus |
| M3 round two: the Lamps as a city on the new wall; the Galleries re-rendered (same agent, by message) | `issue-1103-squares` | 8163 | sonnet |

Next: judge and merge both; then the critic (first job: does a cold visitor name the mountains as odd; second, left from v10: does the lure lead a cold visitor to the acts) with the curator beside it, the release entry, one full `tools/suite.sh 8123` (shared code changed: `src/terrain.js`, `src/atmosphere.js`), release as v11, close #5 and #6 from it.

**2026-11-12, 08:49 PST. M1 (the rock) reported; the lines are gone and the faces read as clay; back for round two, not merged.** `issue-1101-rock` at `6778167` (M2 merged into it; its counts: paths 75, roads 44, walk 10, hop 25, edges 101, loading 7, perf 17; 16.68 ms on low). What it did: the ledges out of the geometry; a `drainage()` of couloirs, feeder gullies and scree cones; the wall's bake by rock mass and water (`aWall`), the strata, bands and ledge lines off the wall; streaks and a derivative bump in an arc-and-height chart. It found what made the fins (v10's ribs-and-bays noise pushed the face further than its own vertical wavelength, so the heightfield folded) and the fur (slope classes read over 0.6 m flipped vertex to vertex). The orchestrator's look (`v11-M1-m1-medium-*` in that worktree's `shots/wip/`): no ruled line anywhere, and the wall sits back; but smooth and one colour. A blind reader (13 frames, no context): "smooth plasticine or wax, not weathered rock... fog banks wrapped around a clay mass... no strata, no scree, no gullies and no rock colour variation, just one lavender value", and "vertical fluting... evenly spaced, like a curtain" from the air; at eye level they "sit well behind the foreground". It also named, ahead of the mountains, the speckle on rocks and the Lamps (for the idea bank). A cold review (opus): no blockers; the couloir floor jumps 2 to 8 m at its thalweg, fan cones can step the apron inside the walk limit, a derivative inside a branch; every hung thing re-fits at build, so nothing floats. Round two, to the same agent: three readable values on a face and two or three rock masses a massif; M2's haze (now M1's to tune) compressing contrast, not erasing it; irregular couloirs; crag at 8 to 40 m; the new relief at the hung bearings too (the old fins remain there); the review's items. In flight: M1 round two (8161). M3's round two (the Lamps as a city) waits for it.

**2026-11-12, 08:37 PST. M2 (the form) is merged, ahead of M1.** `issue-1102-form`, two rounds. What is on `next`: summits, notches and a steep and a long side on each massif (`FORM`), spurs and valleys outside r 352 (`SPURS_M`), far ranges rebuilt as ridged ranges with the sun's side baked in (134k triangles a ring on medium and high, 43k on low; build 46 to 88 ms on medium, 18 to 38 on low, in node), and a cool haze over what lies past r 300 away from the sun, sparing bright pixels (`src/atmosphere.js`). The orchestrator looked at round seven's and eight's frames: at walking height the wall reads as a range and sits back (`v11-M2-r8-highling-y1`, `-r7-foreland-y2`); from 70 m up it is a little milky. A cold review (opus) found no blockers and three should-fixes, all done in round two: the valleys had lowered ground inside the walk limit (now a probe of `heightAt` over r 280 to 348 against `next` gives 0 m difference), a step at the valleys' cutoff, the haze greying the Galleries' windows. Its counts: paths 75, roads 44, contrast 3, walk 10, edges 101, loading 7, perf 17 (16.66 to 16.67 ms on low), gutter 11, hop 25. `tools/hop-test.mjs` changed: its boulder pick took a rock beyond the walk limit; it now picks only reachable ones (the test was wrong, not loosened). Weak, by the agent's word: the north-east wall is still one flat face (the Ridge, Gradine and Vigilant hold it); the Horn is finger-like; the far range in the col at 180 is crimson. The ruled lines are still there: they are M1's. Worktree removed. In flight: M1 (8161), which must merge `next` and re-render (its gullies key on the radius M2 now warps). M3 waits for M1.

**2026-11-12, 08:11 PST. M3 reported; judged from its frames; held for a second round on the new wall.** `issue-1103-squares` at `ad230d4` (its counts: settings 67, paths 75, roads 44, walk 10, hop 25, edges 101, loading 7, perf 17). The orchestrator looked at `v11-03-after-*.png` (in that worktree's `shots/wip/`). **The Galleries** are right: a ragged prow with one long arm along the rock, no longer a rectangle, and alone on the west wall (`-highling-y1`, `-gal-400`). **The Lamps** moved to the south massif (bearings 190 to 218, over the Span's arches) and follow a cleft: no longer square, but from 400 m they are a thin scatter of sparks and from the foot a trickle; the owner asked for "more impact" and this has less than the square did. Not merged: both follow the ground by code and M1 and M2 are reshaping it, so the round two goes to the same agent after they merge: the Lamps as a city seen from 400 m (a dense lit quarter, windows that read as windows, the outline kept). No cold review or blind read yet; do both on round two. In flight: M1 (8161), M2 (8162).

**2026-11-12, 07:52 PST. Opened and dispatched.** State at opening: `main` is v10 (released 04:59 today); nothing was in flight; `next` holds `main` plus v10's look back. #5 and #6 are labelled `in-progress`, `v11`, with a marked comment each. A read-only survey of the mountain code is summarised in `briefs/v11/index.md` ("Where things are").

In flight (three implementation agents, told of each other):

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| M1 the rock: faces and shading (`brief-v11-M1-rock.md`) | `issue-1101-rock` | 8161 | opus |
| M2 the form: outlines, far ranges, recession (`brief-v11-M2-form.md`) | `issue-1102-form` | 8162 | opus |
| M3 #6, the two squares (`brief-v11-M3-squares.md`) | `issue-1103-squares` | 8163 | sonnet |

Next: judge each on its before/after frames (look, then a blind reader, then a cold review of the diff), merge M1 first, then M2 onto it, then M3; then a fitting pass for whatever hung thing the new wall has disturbed (M4, written then), the critic, the curator, one full gate (shared code changes: `src/terrain.js`), release.

**Waiting on the owner:** #22 (Umami tracking) needs them to create the Umami site and paste its snippet; agents may not create accounts.
