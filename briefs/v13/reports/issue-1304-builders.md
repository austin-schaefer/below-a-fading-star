# v13 L5, the builders that are not height: report (2026-11-14, PST)

**Target:** the time to "Go out", from cutting the non-height half of the module builds by a third (the brief: about 0.8 s on low, 1.2 s on medium, 3 to 4 s at 4x), with output that is the same bit for bit.

**Baseline and result:** `SHOT_ANGLE=metal nice -n 10 node tools/load-probe.mjs <base> --q=<q> [--throttle=4] --runs=3`. The baseline is `origin/next` at `56ccff9`, served from an archive copy on port 8165. The result is this branch merged with that commit, on port 8164. Each pair ran back to back on the same machine (load average about 4 to 5). Figures are medians, with the range of three runs in brackets:

| | baseline | after |
|---|---|---|
| low, cold ready | 8515 [8400–8639] | 8486 [8444–8540] (gain unproven) |
| low, serial module builds | 5303 [5227–5336] | 5080 [5052–5082] |
| medium, cold ready | 12934 [12848–12995] | 12586 [12476–12615] |
| medium, serial module builds | 7372 [7352–7411] | 6978 [6934–7036] |
| low at 4x (phone stand-in), cold ready | 31386 [30898–31472] | 30096 [29676–30206] |
| low at 4x, serial module builds | 20608 [20384–20617] | 19280 [19205–19587] |

The touched modules' serial builds, summed: 1412 → 1201 ms on low, 2262 → 1879 on medium, 5284 → 4445 at 4x. That is about a quarter of the brief's target at 1x and a third of it at 4x. What is left of the non-height time is mostly region code (`regionAt` called by `coverAt`, `sdStrip`, `sdPoly`, all in L2's `regions.js`) and three's geometry. Neither can move without changing bits, or without moving into files that are not mine.

## What changed, module by module (serial build, median ms: low / medium / low 4x, before → after)
- **plinths** 319→200 / 649→371 / 1246→753. The feet's field is evaluated on the grid only where its value is read. A node the two cutting planes already put outside keeps the planes' value unless a neighbour is inside, and only its sign is read. Each part's constants are worked out once, and the web's distance no longer allocates.
- **thrones** 220→197 / 437→391 / 811→722. Each capsule's constants are worked out once.
- **water** 252→214 / 466→432 / 964→825. In `makeWaterTexture`, each wave's sines and cosines come from a table indexed by the integer phase m = kx·x + ky·y. The argument is exactly the same double either way. The texture took 56 → 26 ms cold, and its bytes are identical.
- **living-canyon** 84→78 / 135→118 / 250→223. The Bather's parts field is indexed instead of destructured.
- **kit `mergeGeometries`**: indexed parts are read straight through the index, with no `toNonIndexed` copy. span 75→63 on low, stair 57→53.
- **structures** 362→353 / 390→385 / 1393→1319. `Builder.add` works on the typed arrays instead of `getX` and `setXYZ`. The ranges do not overlap, but the gain is small.

## Fingerprints and pairs
`tools/build-check.mjs` (new; documented in `runtime.md`) was recorded with `--runs=3` on the baseline before any change. On low and medium, all 55 modules are IDENTICAL after the merge.

Two modules moved between loads of the same tree. Both are build-order races that predate this branch:
- **fauna's cloak** takes its first spot from whether structures has built yet. It moves to that spot 2 s into the walk anyway.
- **region-bletting** builds without vegetation's trees if they are not ready within 15 s. This happened on medium on a loaded machine: no windfalls under trees, no snails. **A slow phone could hit this.** It belongs to whoever owns bletting, and I have not fixed it.

Render pairs at `tools/views-perf.json`'s ten stations, on low and medium (`shots/wip/v13-L5-{base,after}-<q>-<view>.png`):
- Medium: at most 2729 changed pixels (wrongcolour). Base against base differs by similar amounts.
- Low: the first set of pairs showed 20k to 35k changed pixels at lattice, wrongcolour and taverna. A second render of the same branch differed from that first one by the same amounts. The second set matches a second render of the baseline: at most 258 changed pixels across the five stations rerendered (`v13-L5-{base2,after2}-low-*`).

## isReady
In Chromium, `isReady` is `getProgramParameter(COMPLETION_STATUS_KHR)`, a synchronous round trip to the GPU process while it links programs. I tried a poll that stops at the first program not yet ready. The programs phase was no faster: 577 [451–653] ms against 517 [349–576] ms with three's poll. No long task over 50 ms fell in that phase either way. So the 8% in the profile is the main thread waiting on the GPU process, made larger by the profiler. I reverted the change.

## Not done
- **Vegetation:** its own code is about a quarter of its build (plants.js `cell`, `keepOff`, `mixInto`, `add`; the ground.js wrappers). The rest is height and `coverAt`. `coverAt`'s tint keeps state from the previous call, so skipping or reordering calls changes bits.
- **Waystation:** about 50 ms, under the brief's threshold.

## Tests
`tools/suite.sh 8164`, the whole suite, because the kit changed: 35 of 36 tests ok, 1528 PASS lines. The one failure is `releases`, which fails on any feature branch: HEAD is not `next`, and the commits are not yet on `origin/next`.

Round two (review): build-check now:
- skips only the recording's unstable entries, so newly unstable entries count as MOVED;
- keys children by type, name, vertex count and order among those that share them, instead of by index;
- fails a module with over 10% of its entries unstable (unless `--allowunstable`);
- fails when nothing was compared, and refuses a recording made with a different q or params;
- hashes instanceCount, mesh flags, attribute types, texture parameters and typed-array uniforms.

I re-recorded on origin/next (`8a52c8e`) with `--runs=3`. This branch is still 55/55 IDENTICAL on low (5631 entries) and on medium (5719). `--only=<typo>` and a params mismatch both FAIL.
