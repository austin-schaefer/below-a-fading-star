# v13, a quicker door, a steadier step: dispatch plan

The milestone doc is `plans/wilderness-v13.md`. Briefs are written in full only for the next batch; batch 2 is coarse on purpose and is written from batch 1's numbers.

**The hold is over:** v12 reached `main` on 2026-11-14 at 21:23 PST (`8a9c7f3`); batch 1 went out then.

## Briefs

| Brief | What it gives | Owns | Model | Batch |
|---|---|---|---|---|
| **P0** the load yardstick | phase marks from navigation to ready; `tools/load-probe.mjs` (cold, repeat, throttled; requests, bytes, long tasks, each module's own build time); the baseline table | a new `src/startup.js`, the startup lines of `src/main.js`, one row in `perf.report()`, `tools/load-probe.mjs` | strong | 1 |
| **P1** the frame yardstick | the bench gains a histogram, a hitch log, JS heap, geometry bytes and per-module calls and triangles; its route gains a top and a teleport; the unowned costs (`far.js`, the shadow pass's CPU, render CPU) get rows; a "Measure" row in the settings menu a phone can run and copy from; the baseline table | `src/perf.js`, `src/gpumem.js`, the bench route, `src/settings.js` (one row), `tools/bench-report.mjs` | strong | 1 |
| **L2** the height core (`brief-v13-L2-height.md`, batch 2a, out) | `heightAt` and what it calls made cheap with bit-identical results, and importable by a Worker | `src/terrain.js`, `src/noise.js`, `src/v4/regions.js`, `src/v4/mountains.js`, `tools/height-check.mjs` | strong | 2a |
| **L5** the builders that are not height (`brief-v13-L5-builders.md`, batch 2a, out) | plinths, thrones, structures, the water texture, vegetation's own part, compile polling; `tools/build-check.mjs` (a fingerprint per module) | those modules | strong | 2a |
| **L3** the bake off-thread and stored (after L2) | the terrain bake in a Worker beside the module builds; stored in IndexedDB keyed by commit, tier and params; a small cache helper the heaviest modules can use for their arrays | `src/terrain.js`'s bake, `main.js` startup, a new worker and cache module | strong | 2b |
| **L1** the network | from P0's numbers: imports started before the terrain bake, `modulepreload`, the font made non-blocking; then either a bundle at deploy or a service worker keyed by the commit, whichever the cold and repeat numbers ask for; cache headers | `index.html`, `netlify.toml`, `DEPLOY.md`, a `sw.js`, the import order in `main.js` | strong | 2 |
| **L2** the terrain bake | a height core free of THREE and `location`; the bake in a Worker beside the fetches, and stored in IndexedDB keyed by commit, tier and params; `heightAt`'s repeated work (`slopeAt`'s four extra calls, noise recomputed) | `src/terrain.js` and what it imports, `src/v4/mountains.js`'s rings | strong | 2 |
| **L3** ready sooner | from P0's per-module times: what can be built, compiled and uploaded after "Go out" is offered without a first-sight stall (far places, by distance from the spawn), or sliced so the title card never stalls | `main.js`'s module build, `src/warmup.js` | strong | 2, only if the numbers ask |
| **F1** the hitches | from P1's hitch log: the teleport burst (plants' jump, far repack and shadow redraw in one frame), per-frame `heightAt` callers, `far.js` packing, whatever the log names worst | the modules named by the log | strong | 2 |
| **F2** the owners | the profiler's private `_mods` table replaced by a small registry `shadows.js` and `far.js` read; a budget line per module printed by the bench (calls, triangles, CPU ms against the documented budget) so an overrun has a name; `modules.md` says who owns each shared cost | `src/perf.js`, `shadows.js`, `far.js`, `world-code` | mid | 2 or 3 |

Shared files: `src/main.js` is P0's in batch 1 (P1 adds no more than a line); `src/perf.js` is P1's (P0 adds one row to `report()` through a function it exports from `src/startup.js`).

## Order, and what the owner can see when each lands

1. **Batch 1: P0 and P1 together.** Seen: `node tools/load-probe.mjs http://localhost:8123` printing the phases; `http://localhost:8123/?bench=45&perf=1` ending in a histogram and a hitch log; the settings menu's Measure row. The baseline goes into the milestone doc's Status as two tables. Then the orchestrator writes batch 2 from the numbers, cutting whichever of L1 to F2 the numbers do not support.
2. **Batch 2: up to four of L1, L2, L3, F1, F2.** L1 and L2 both touch `main.js`'s startup: L2 owns the terrain lines, L1 the imports, and each is told so. Seen: the same two commands, with smaller numbers; a refresh of 8123.
3. **Tail:** before and after tables in Status; render pairs; the critic (one job: find any difference from v12); the curator has little to do (keep the charts or tables as pictures only if they tell the story); the gate; the release.
