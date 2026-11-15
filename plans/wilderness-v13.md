# Wilderness v13: a quicker door, a steadier step

Twelve releases added things to the valley; this one adds nothing to find. It makes the walk start sooner, start almost at once the second time, and stay smooth while it is walked, and it leaves behind a way to see where the time goes that the next twelve releases can use.

## What was chosen, and why

The owner's word, in session on 2026-11-14: "tackle #44 and #34: two closely related milestones i suspect are best worked on at the same time", "take your milestone all the way to shipped". So no choosing: v13 is the owner's **#44** (performance audit and performance harness) and **#34** (loading performance spike), as one milestone.

From #44:

> As the world grows, expensive work is becoming harder to reason about and increasingly likely to compete with rendering. We need to keep performance predictable without turning the architecture or release process into a science project.
>
> * Make startup, frame-time distribution, and memory usage easy to measure in representative runs.
> * Keep subsystem boundaries clear enough that costs and responsibilities don't disappear into shared context.
> * Address avoidable repeated work in terrain generation and other hot paths.
> * Keep substantial CPU work from disrupting the frame loop. Use workers or WASM where the measured benefit justifies the complexity.
>
> Each implementing agent should identify a concrete performance target, measure the relevant baseline, and report the result. Targets should reflect actual player experience, not just isolated microbenchmarks.
>
> Prefer improvements to the existing profiling and benchmark workflow over a new verification layer. This should not add another release gate or materially expand final review time. No broad rewrite or new framework for its own sake.

From #34: "A spike to improve initial load time, which can be quite long. Also perhaps to cache/local store after first load, since right now a refresh needs to you to load everything anew."

It also fits the run's own rule (alternate reach and depth): v10 to v12 were reach; v12's note already says the high views "may run slowly on an older" phone.

Passed over, still in the pool: #18, #20, #23, #28, #30, #33, #36; the six small faults #38 to #43 (a fix release of their own; any that this milestone's agents are already standing in get fixed in passing and said so); #22 waits on the owner.

## What a visitor should notice

- **The first visit:** the title card is up at once and "Go out" is offered much sooner than today.
- **The second visit, or a refresh:** it is there almost as soon as the page is. Today a refresh fetches about 280 files again and rebuilds the whole valley.
- **Walking:** no catch in the step when a place comes into view, on arriving somewhere by the map, or on waking after a fall.
- Nothing looks or sounds different. A render pair that differs is a bug in this milestone.

## What is known before any measurement (two read-only surveys, 2026-11-14)

- **Nobody has ever measured the load.** No navigation-to-ready time is recorded anywhere in the repository, on any machine. The only startup figures are console lines, and the per-module ones overlap (all ~60 modules build under one `Promise.allSettled`).
- A cold load is about 280 unbundled module requests (`src/` 285 files, 4.0 MB raw; three 692 KB; about 1.7 MB gzipped in all). The ~60 dynamic module imports do not start until `buildTerrain` has finished (`src/main.js:200`, `:243`).
- `buildTerrain` is synchronous on the main thread: 1.93 s on low and 3.76 s on medium on the owner's Mac (v11's figure), 231k vertices each paying one analytic `heightAt` (15+ noise octaves, no cache) plus four more through `slopeAt`. It is deterministic from the seed, the tier and a few URL params.
- Then every module builds, every program compiles (`compileAsync`), and a warm-up draw uploads everything, all before "Go out".
- Nothing is cached: no `Cache-Control`, no fingerprinted URLs, no service worker, no IndexedDB. `_site/commit.json` already carries the commit, a ready cache key.
- There is no Worker, OffscreenCanvas, WASM or idle callback anywhere.
- The frame loop has throttling by distance but no time budget; module budgets are documentation. Costs nobody owns: the shadow pass, the post chain, `src/v12/far.js` (which packs inside `scene.onBeforeRender`, outside every timer), `above.js`, compile and warm-up, the terrain bake. `shadows.js` and `far.js` read the profiler's private `ctx.perf._mods`, so the profiler's tagging is load-bearing for drawing.
- The measuring tools are good and scattered: `?perf=1`, `?bench`, `?record`, `pan-test`, `alloc-audit`, `heights-cost`, `pop-probe`, `terrain-probe`. Missing: startup, JS heap and geometry bytes, a frame-time histogram and hitch log in the bench, per-module draw cost in the bench, any route that leaves the floor or teleports, and any easy way to get numbers off a real phone. There is no real-phone number in the repository.
- Headless frame and GPU times are not trustworthy (software or ANGLE WebGL); JS CPU ms, counts, ratios and wall-clock load phases with a CPU throttle are.

## Calls made, each reversible

- **One milestone, two halves, one yardstick first.** Batch 1 only measures: it builds the load and frame yardsticks and writes the baseline here. Batch 2's briefs are written from those numbers, each with its own target. This is "one before nine" for a milestone whose risk is optimising what was never slow.
- **Targets are a visitor's:** seconds from navigation to "Go out" (cold and repeat, at desktop speed and with a 4x CPU throttle standing in for a phone), the longest stall of the title card while loading, the worst frames on a walked route, the worst frame after a teleport. Triangle counts and microbenchmarks are evidence, not targets.
- **No new gate.** The suite gains at most the existing tests' new rows; the yardsticks are tools a person or agent runs (`tools/load-probe.mjs`, the bench), and the suite's wall time before and after is written in Status. The cold critic for this release is given one job: walk it and find anything that looks, sounds or behaves differently from v12.
- **Workers only where the baseline says so.** The terrain bake is the candidate; nothing else moves off the main thread without a number.
- **"No build step" is a description, not a fixed thing** (`AGENTS.md` lists the fixed things; `DEPLOY.md` describes a `cp`). A bundle at deploy is allowed if the baseline shows the 280 requests are a real share of a cold load, it stays inside Netlify's first build minute, and local serving and the tests keep running the unbundled source. Otherwise a service worker keyed by the commit does the repeat load and the source stays as it is.
- **Stale code is the worst outcome of caching.** Whatever caches (a service worker, IndexedDB) is keyed by the commit, falls back to the network and to computing, and has a test that a new commit replaces it. A visitor must never be stuck on an old release.
- **Boundaries get clearer only where a cost is hiding.** No general refactor of `ctx`. The unowned costs get names in the profiler, and the profiler's private table stops being something drawing code reads.

## Done when

- One command prints a cold and a repeat load, phase by phase, on any tier, with and without a CPU throttle; the bench prints a frame-time histogram, a hitch log, JS heap and per-module draw cost over a route that includes a top and a teleport; a phone can run it and copy the result from the settings menu. `world-code/runtime.md` says how in a few lines.
- The baseline and the after numbers are in this doc, from the same machine and commands.
- Provisional targets, replaced by measured ones when batch 1 lands: a repeat load to "Go out" in at most 40% of today's time; a cold load in at most 70%; no stall of the title card over 200 ms while loading; no frame's JS over 50 ms on the bench route on low, a teleport included.
- Render pairs at the bench's stations and `terrain-probe`'s fingerprint are unchanged.
- `tools/suite.sh` green and no slower than it was.

## Status

**2026-11-14, 19:20 to 21:25 PST. Opened; batch 1 is dispatched.** The owner started this session beside the one finishing v12 and said to plan, watch for v12's merge, then carry #44 and #34 to shipped. While v12's tail ran: two read-only surveys (the load path; the frame loop and its tools), summarised above; this doc, the dispatch plan and batch 1's two briefs, held out of `next` until v12 was on `main` (`8a9c7f3`, 21:23 PST; the other session's Status says released, nothing in flight). #44 and #34 are `in-progress`, `v13`. No browser was used before the merge, so there is no number yet: the baseline is batch 1's job.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| P0 the load yardstick (`brief-v13-P0-load-yardstick.md`) | `issue-1300-load-yardstick` | 8161 | opus |
| P1 the frame yardstick (`brief-v13-P1-frame-yardstick.md`) | `issue-1301-frame-yardstick` | 8162 | opus |

Next: when each reports, run its tool myself on 8123 after the merge (the probe's table; a bench in a real browser), a cold review of each diff, merge, the whole suite once for the batch (both touch shared code), write the two baseline tables here, then write batch 2 from the numbers (`briefs/v13/index.md` lists the candidates; cut what the numbers do not support). The owner can help with one thing nobody else can: run the Measure row on a real phone once P1 is in and paste what it copies into an issue.

**2026-11-14, 22:21 PST. The owner has left for the night: "remember, pursue your goal until it hits main! i'll be afk overnight."** So every call from here to the release is the orchestrator's, written here.

**The first load numbers this repository has had** (P0's own runs on its branch, not yet rerun by the orchestrator; the owner's Mac, headless Chromium, another agent's browser beside it; `node tools/load-probe.mjs <base> --q=<q> [--throttle=4] --runs=3`, medians):

| | low | low, 4x CPU | medium | medium, 4x CPU | live site, low |
|---|---|---|---|---|---|
| navigation to "Go out", cold | 8.1 s | 31.6 s | 12.2 s | 48.4 s | 9.0 s |
| the same, repeat | 7.7 s | 30.5 s | 11.9 s | 47.3 s | 8.0 s |
| terrain bake (one freeze) | 2.0 s | 8.3 s | 3.9 s | 16.3 s | |
| module builds | 5.4 s | 21.9 s | 7.4 s | 30.4 s | |
| compile and warm-up | 0.5 s | 0.9 s | 0.65 s | 1.0 s | |

287 requests, 1.85 MB over the wire live; a live repeat is 281 revalidations. What this says: **the load is compute, not network.** Fetching is about a second of nine on the live site; a bundle or a service worker alone could not get a repeat load under about 7 s. The title card is frozen for 6.6 of 8.1 s. With the 4x throttle that stands in for a phone, a visitor waits half a minute on low. Ten modules are most of the build time (vegetation, rocks, plinths, galleries, water, the Adust, thrones, structures, the outwash, inhabitants2). Compile and warm-up are not worth a brief.

So the plan's weight moves: L1 (the network) shrinks to the cheap things (cache headers, imports started early, perhaps a service worker late); the milestone is won or lost on the terrain bake and the module builds, cold and repeat. Before batch 2 is written, one more measurement is out: **P2** (`issue-1302-load-profile`, port 8163, opus, on top of P0's branch) adds `--profile` to the probe and answers why the builds cost what they do, above all whether the analytic `heightAt` (no cache, 15+ octaves, about 300 call sites) is most of both the bake and the builds. If it is, one change shortens everything.

In flight: P0 (8161, its whole suite running, the last step before its report), P1 (8162, baseline bench runs), P2 (8163).
