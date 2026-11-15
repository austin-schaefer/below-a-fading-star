# Brief v13 P1: the frame yardstick

Worktree: `.claude/worktrees/issue-1301-frame-yardstick` (branch `issue-1301-frame-yardstick`, port 8162). Work only there. Read `briefs/v13/_common.md` first. Model: strong.

## Goal

The owner (#44): "Make startup, frame-time distribution, and memory usage easy to measure in representative runs. Keep subsystem boundaries clear enough that costs and responsibilities don't disappear into shared context." The tools exist and are scattered: `?perf=1` has CPU ms per module and callback, `?record` has the histogram and the worst frames, `heights-cost` has calls and triangles per module, `gpumem` has texture bytes, and the bench (`?bench`) has only an average and a 1% low over a route that never leaves the valley floor. Make the **bench** the one representative run that says all of it, and make it runnable on a phone. You change nothing about how fast the walk runs.

1. **The bench says how the frames were distributed.** Reuse `record`'s code: median, p95, p99, worst, counts over 2x and 3x the median, and a **hitch log**: every frame whose JS time is over 50 ms, or over 3x the median, with when and where on the route it fell, which module or callback was the largest in it, and what else happened that frame (a shadow redraw, a plant or rock repack, a `far.js` pack, a texture or buffer upload, a program compile).
2. **The route leaves the floor.** Add legs the valley has grown since the route was drawn: one top (the Span's deck or the gallery), and two teleports the way a visitor makes them (the settings map's Go to; the fall's waking), each followed by a few seconds standing. Keep the old route's samples comparable (the old legs first, unchanged, with their own summary) so earlier bench reports still compare.
3. **Memory.** JS heap where the browser gives it (`performance.memory`, or `measureUserAgentSpecificMemory` when isolated: say what works where), at the start and end of the run, and geometry bytes (attributes and indices, per module by the profiler's tagging) beside `gpumem`'s texture bytes. One `memory` object in `report()`.
4. **Draw cost per module in the bench**, by `heights-cost`'s method: calls and triangles per module, colour and shadow passes apart, at the route's stations.
5. **The unowned costs get rows.** `src/v12/far.js` packs inside `scene.onBeforeRender`, outside every timer: time it. Time the shadow pass's CPU and the composer's render CPU (three's traversal and sorting) as named rows, so `frame` and `core` stop being where cost hides. Say what share of a median frame's JS is still unattributed afterwards.
6. **A phone can run it.** One row in the settings menu ("Measure", worded in the piece's plain voice) that runs the bench and ends on a panel with the summary and a Copy button; the copied text is the JSON, small enough to paste into an issue. The owner uses this to get the first real-phone numbers this repository has had.
7. **`tools/bench-report.mjs`** prints the new summary as a table and can diff two saved reports (`--against=path`): the before and after of every later brief.
8. **The baseline.** Run it on low and medium on your port, three times each; save to `shots/wip/v13-P1-baseline-*.json`; report the tables, the hitch log's worst ten, and three to five lines on what the next briefs should aim at, each with the number behind it. Headless frame time is not trustworthy here; JS ms and counts are: build the summary so the trustworthy numbers are the ones it leads with.

## Not yours

Making anything faster. `src/main.js` beyond a line (P0 is in its startup beside you; it gives `perf.report()` a `startup` row through a function exported from `src/startup.js`: leave room). `tools/suite.sh`: no new `run` line; `perf-test` and `record-test` may gain rows that the new fields exist and agree with `renderer.info`.

## Done when

- `http://localhost:<port>/?bench=45&perf=1` ends on a panel with the histogram, the hitch log, memory and the per-module table; `node tools/bench-report.mjs` saves and prints it; `--against` diffs two.
- The overlay's and the bench's cost when not in use is nothing: with `?perf` absent no hook is installed (check with `alloc-audit` and say the number).
- The Measure row works on touch (`touch-test`, `settings-test` green; a frame of the panel on a phone-sized viewport).
- `ONLY=perf,record,pan,settings,touch,loading,heights tools/suite.sh <port>` green, with counts.
- `world-code/runtime.md` says how to run and read it, in a few lines, replacing what it says about the bench today.
