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

**2026-11-14, 22:50 PST. The frame loop is already lean; the load is the height function. Batch 2a is out.**

- **P1 reported** (`issue-1301-frame-yardstick`, not merged; its own runs): on the bench route with new legs onto the Span's deck and two teleports, no frame's JS over 50 ms anywhere, headless. Low: JS median 3.6 ms, 99th 7.2, worst 8.6; at 4x CPU 13.6, 18.6, 22.2. `render` (three's own drawing) is 57% of a median frame; `far.js` packs are in 9 of the 10 worst frames at 4x; 1% of JS is unattributed. Memory on low: geometry 100 MB, textures 37 MB, JS heap 300 to 390 MB. `pan` failed on its branch (it says one station fails on `next` too under load: unconfirmed). So #44's "keep CPU work from disrupting the frame loop" is, on this evidence, already true while walking; what disrupts is the load. No real-phone number exists yet: the Measure row in the settings menu is how the owner can get one. Frame-side work in this milestone shrinks to the yardstick itself and, if time, `far.js`'s packs.
- **Cold reviews of P0 and P1:** no blockers in either. P0's should-fixes (the longest stall can miss the warm-up task; "imports" row is mostly build time; cold loads share one browser; no failure handling; `?serial=1` order) and P1's (the wake leg is an unfaithful copy of `fall.js`; Close leaves the profiler on; draw hooks on for the whole run; `--against` with an old report misleads; legs cut mid-block) are with their authors, round two, in flight (8161, 8162).
- **P2 handed back early** (`issue-1302-load-profile` at `882a0a8`, pushed): `load-probe --profile` works (a cold and a serial load under the CDP profiler; call counts by rewriting three files in the probe's page only). The low tables are in that worktree's `shots/wip/v13-P2-low.txt`; the medium run timed out under the machine's load (load average 24) and is not done; no report file; its tests not run. Its finding on low: **`heightAt` and what it calls is 42% of the load's CPU**: 63% of the terrain bake, about half the module builds. 399k calls in the bake (278k from `slopeAt`'s four neighbours), 737k in the builds at about 6 µs. `regionAt` has the largest self time of any function (14.7%); `noise2` 11.9%. Mostly their own code, not height: plinths, thrones, structures, the water texture, the waystation, the living canyon. Compile polling (`isReady`) shows as 8%, unexplained.

Calls: (1) no bilinear height grid (about 3 s on low, but it moves things by centimetres on steep ground: "nothing may look different" outranks it); (2) exactness is checked by fingerprint, not by eye: L2 builds `tools/height-check.mjs`, L5 `tools/build-check.mjs`; (3) the 40% repeat-load target needs the builds' results stored, not the files: after L2, a brief (L3) puts the bake in a Worker beside the builds and in IndexedDB, with a cache helper the heaviest modules can use; (4) the network brief shrinks to cache headers and early imports, late.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| P0 round two | `issue-1300-load-yardstick` | 8161 | opus |
| P1 round two | `issue-1301-frame-yardstick` | 8162 | opus |
| L2 the height core (`brief-v13-L2-height.md`) | `issue-1303-height-core` | 8163 | opus |
| L5 the builders that are not height (`brief-v13-L5-builders.md`) | `issue-1304-builders` | 8164 | opus |

Four implementation agents: the limit. Next: merge P0 and P1 when round two reports (then P2's branch, finishing its tests on `next`), the whole suite once with as little else running as can be had; L3 when L2 is in; the orchestrator reruns the probe's table on a quiet machine before any number goes into a release note.

**2026-11-14, 23:26 PST. Batch 1 is merged: the two yardsticks and the profile are on `next`.**

- **P0 merged** (the load yardstick; round two fixed the review's points: the stall counts the warm-up task, a browser per run, one "imports+modules" row, a non-zero exit on a timeout or page error; `?serial=1` is for timing only, since a serial load differs by 85 pixels on one figure at the spawn). Its whole suite on its branch before round two: 36 tests, 34 ok (`releases` off `next`; `audio` one check at +0.5 dB once, 101 on rerun). **P2's tool merged** with it (`load-probe --profile`, `tools/load-profile.mjs`); P2 never ran its tests or wrote a report file; its tables are `shots/wip/v13-P2-low.txt` and `-medium.txt` in the deploy worktree.
- **The orchestrator's own run on `next`** (`node tools/load-probe.mjs http://localhost:8123 --q=low --runs=1`, load average about 3): cold 8.9 s, repeat 8.2 s, terrain 2.27 s, imports+modules 5.48 s, programs 0.52 s, warm-up 0.23 s; longest stall 2.33 s; 287 requests. It agrees with P0's table.
- **P1 merged** (the frame yardstick; round two: the wake leg calls `ctx.fall.wake()`, Close after Measure reloads the clean URL with the profiler off, draw hooks only at a station and those frames left out of the distributions, `--against` warns on mismatched runs, a block straddling two legs counts in neither). It pushed conflict markers in `src/perf.js` once (`523e2b9`) and fixed forward (`0cd9bcb`); none are in `next` (grepped). The orchestrator looked at `v13-P1-measure-phone-4.png`: the Measured panel on a phone view, percentiles per leg, the ten slowest frames each with its largest cost, Download, Copy and Close in reach. It reads as a diagnostic, which it is.
- **On `next` after both merges**, `ONLY=perf,record,pan,settings,loading,touch tools/suite.sh 8123` with two agents' browsers beside it: 6 of 6; settings 73, loading 8, perf 28, touch 43, pan 1, record 16 of 16 (it prints `ok`, not `PASS`, so the summary line says 0). So P1's `pan` failure was the machine's load. The whole suite has not run on `next` yet in v13: it runs once when L2 and L5 are in (both change what is built).

**For the owner, when back:** the settings menu has a Measure row. Run it on a phone, press Copy, paste into an issue: that would be the first real-phone number here. Everything in this doc about phones is a 4x CPU throttle on a Mac.

In flight: L2 (`issue-1303-height-core`, 8163), L5 (`issue-1304-builders`, 8164). No other worktree. Next: each of them (their fingerprints, a cold review, the pairs), the whole suite, then L3 (the bake in a Worker and stored).

**2026-11-15, 00:33 PST. L5 is merged; L1 is out; L2 is in its second round.**

- **L5 merged** (the builders that are not height; `issue-1304-builders`, a fast-forward). Honest and small: the touched modules' serial builds, summed, 1412 to 1201 ms on low, 2262 to 1879 on medium, 5284 to 4445 at 4x (plinths 319 to 200, thrones 220 to 197, water 252 to 214, the kit's merge, structures barely). Cold ready on low 8.52 to 8.49 s (unproven: inside the spread), medium 12.93 to 12.59 s, low at 4x 31.4 to 30.1 s. About a quarter of the brief's target at 1x. What is left of the non-height time is region code (L2's) and three's geometry. Compile polling (`isReady`, 8% in the profile) is the main thread waiting on the GPU process, enlarged by the profiler: nothing to fix; its trial was reverted. Its whole suite on its branch: 36 tests, 35 ok (`releases` off `next`), 1528 PASS lines. A cold review found no blockers and agreed by reading that the outputs are identical; its should-fixes were all in the new tool and are done.
- **`tools/build-check.mjs`** (new): a fingerprint per module of everything it built (attributes, indices, instance matrices, canvas pixels, mesh flags, texture parameters), `--record` and `--against`, `--runs=3` to mark what differs between loads of the same tree. After round two it fails on newly unstable entries, on zero entries compared, and on a recording from other params. All 55 modules identical before and after L5, low and medium, against a recording made on `origin/next`.
- **What the fingerprints found that nobody was looking for: two build-order races, both older than v13.** `region-bletting` builds without vegetation's trees if they are not ready within 15 s (no windfalls, no snails): it happened on medium on a loaded machine, so **a slow phone may be getting a slightly different world today**. And fauna's cloak takes its first spot from whether structures has built yet. Both are in L3's brief to end (startup order is L3's).
- **L2's cold review:** no blockers; every early-out, table and file move read and found the same by reading. Not accepted: the proof. The reference recording is gitignored and predates the tool's commit; the check compared a 32-bit hash a point; no samples aimed at the new skip boundaries; param variants only at a fifth of the points; `src/height/params.js` fails silently in a worker without params. Round two (in flight, 8163) makes the proof auditable: record at the base commit with the tip's tool, compare raw bits, boundary samples.
- **L1 dispatched** (`issue-1305-kept-files`, 8165, opus; `brief-v13-L1-network.md`): a service worker keyed by the commit (`commit.json`): the same commit serves everything from its cache, a new one drops it; never a mixed module graph; `?sw=0` the way out; registered only where `commit.json` exists, so never under the tests. Plus the font off the critical path and imports started before the bake. Call: **no bundle step** (287 requests cost about a second once, and the worker removes them afterwards; a bundle would change how every test loads the site). If it cannot make a mixed graph impossible it ships switched off.
- **L3's brief is written** (`brief-v13-L3-bake-kept.md`: the bake in a Worker beside the builds, kept in IndexedDB, a helper for the heavy modules, the two races), waiting on L2's merge.

In flight: L2 round two (8163), L1 (8165). Next: L2's merge when the stronger check passes, then the whole suite on `next` (L5 and L2 both change what builds), then L3.

**2026-11-15, 01:02 PST. L2 is merged: the load is nearly halved, and the terrain is the same to the bit. L3 is out; the whole suite is running on `next`.**

- **L2 merged** (the height core; `issue-1303-height-core`). Exact speed-ups only: boxes and early outs on every block of `heightAt`, `regionAt` without its keyed loop and with tight boxes, flat gradient tables in the noise, the mountains skipped where they add nothing, no allocation in `slopeAt`; and the height path moved to `src/height/`, free of THREE and of `location`, its params explicit (`globalThis.FP_HEIGHT_PARAMS` must be set before a worker or node imports it, or the import throws; `HEIGHT_PARAMS_KEY` for a cache key). Its numbers, base and tip run alternately, three runs, on a loaded machine (so the base reads 11.1 s where the quiet baseline was 8.1): **cold to "Go out" on low 11.06 to 6.08 s; medium 14.09 to 8.69 s; low at 4x CPU 32.1 to 20.2 s.** The bake on low 2.66 to 1.43 s; the module builds' `heightAt` 4235 to 1244 ms for the same 736,928 calls. Its whole suite on its branch: 36 tests, 35 ok (`releases` off `next`).
- **The proof, run by the orchestrator:** the tip's `tools/height-check.mjs` recorded **v12's released tree** (`8a9c7f3`, in a scratch worktree, `src/` clean) and `next` was checked against it: **1,427,272 points x 58 values (heightAt exact and coarse, slopeAt, normalAt, biomeAt, regionAt and the air's blend, water, causeway, river) and both bakes' 8 attributes: 0 points differ**, in check mode and in pure mode (the height path alone, three refused, no `location`). 90 s to record, 54 s to check, node only. The points include both sides of, and exactly on, every skip boundary. A cold review read every early-out and found no blocker; its doubts were about the proof, and round two answered them.
- **Call: `?bakeslope=mesh` stays off.** Taking the bake's slope from the mesh would save another 0.5 s on low and 1.3 s on medium, and changes 34,377 of 309,123 colour values on low (4,819 by more than 1/255); the lattice's render pair differs by 3.1%. That is a visible change to the ground, and this milestone's promise is none. It stays in the tree as a trial for a milestone that is allowed to repaint the ground.
- **L3 dispatched** (`issue-1306-bake-kept`, 8163, opus): the bake in a Worker beside the builds, kept in IndexedDB keyed by commit, tier and the height params; a helper for the heavy modules with one model module; the two build-order races.
- **The whole suite on `next`** (L5 and L2 in; log `/tmp/suite-v13-a.log`) started 01:00 with two agents' browsers beside it.

In flight: L1 (8165), L3 (8163), the suite (8123). Next: read the suite; L1's report and a cold review of it; L3's; then the orchestrator's own table on a quiet machine, the tail.
