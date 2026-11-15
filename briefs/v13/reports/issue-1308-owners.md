# v13-F2 report: the owners

Target, baseline, result: no visitor-facing number. Target: "what does X cost and whose is it" is one lookup, and an overrun has a name. Baseline: drawing code read the profiler private `ctx.perf._mods`; budgets were checked only for regions. Result: `ctx.modules`, the over-budget lines, the owners table.

## What changed
- `src/module-registry.js` (new): `ctx.modules`, name -> Set of root objects, filled by `perf.forModule`'s `scene.add` (so `src/main.js` is untouched: perf.js creates the registry if absent). Read by `shadows.js`, `v12/far.js`, `perf.js`; `_mods` is gone (`grep -rn "_mods" src` empty). `perf.moduleCpu()` replaces the one other use (pan-test). Tools updated: build-check (falls back to `_mods` to record an older tree), heights-cost, pan-test.
- `bench-report` prints `over budget:` lines (`overBudget`, `MODULE_BUDGET` in `src/perf-frames.js`); the saved report keeps every module over budget, not only the top six per station.
- `world-code/modules.md`: "Who owns each shared cost" table (the kept store row says L3, not in the tree yet); `runtime.md` two lines.

## Checks
- `build-check` low, recorded on a clean `origin/next` copy (port 8264, `--runs=3`), then this branch: `55 identical, 0 moved, 5634 entries compared`.
- `ONLY=heights,pan,perf,treelod,grass tools/suite.sh 8164`: heights 102, perf 28, grass 3, treelod 71, pan 1 PASS lines, 5 tests 0 failed (a first run failed on a null row set, fixed). After the last perf-frames edit: `ONLY=perf` 28 PASS.
- Pairs (`tools/views-perf.json`, ten stations, `shots/wip/f2-*`, changed pixels): low base-a vs base-b (noise) / base-a vs after: causeway 0/0, fen 9/7, herd 847/850, lattice 10/1, spawn 0/0, sun 2/1, tarn 98/0, taverna 34983/34900, wood 12/6, wrongcolour 891/983. Medium base vs after: causeway 9, fen 6, herd 0, lattice 0, spawn 0, sun 0, tarn 170, taverna 5, wood 1, wrongcolour 355. All within the low noise.

## Over budget today (`node tools/bench-report.mjs "<base>/?bench=45&perf=1&q=<tier>"`, `shots/wip/f2-bench-<tier>.json`)
Two modules, fauna (calls) and vegetation (triangles); nothing else at any tier.
- low: fauna 26 calls at route 1; vegetation 455,003 tris at route 4 (1.14x).
- medium: fauna 28 calls (route 1), 26 (wake: the keep gate); vegetation 434,696 (route 1), 491,116 (3), 836,405 (4, 2.1x), 575,895 (5), 568,924 (the Span deck), 423,098 (wake).
- high: fauna 30 calls (route 1), 28 (route 5, 100,728 tris), 30 (wake); vegetation 448,702 (1), 485,345 (3), 838,188 (4, 2.1x), 581,810 (5), 572,236 (deck), 424,694 (wake).
Terrain (460,800 tris, one call at medium) shows as `core:terrain` and is not counted: a shared cost.

## Defaults taken
Budget compared on the colour pass only. `core:` rows excluded. Registry created in perf.js, not main.js, so the L3 merge has no overlap. The pan-test PASS count of 1 is the test own.
