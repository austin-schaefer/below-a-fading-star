# Brief v13 P0: the load yardstick

Worktree: `.claude/worktrees/issue-1300-load-yardstick` (branch `issue-1300-load-yardstick`, port 8161). Work only there. Read `briefs/v13/_common.md` first. Model: strong.

## Goal

Nobody has ever measured how long this walk takes to load: there is no navigation-to-ready number in the repository, on any machine. The owner says it "can be quite long" and that "a refresh needs you to load everything anew" (#34). Three agents after you will try to shorten it; build the thing they measure with, and write down today's numbers. You change nothing about how fast it loads.

1. **Phase marks.** A small `src/startup.js` (no THREE import) that `main.js` calls at each boundary: navigation start, first module executed, tier chosen, renderer made, terrain built, mountains built, module imports resolved, modules built, post built, programs compiled (with the count), warm-up drawn, ready ("Go out" enabled). `performance.mark`/`measure` so they show in a browser's own profiler, and one object, `startup.report()`, that `perf.report()` and the bench's JSON carry as `startup`. Cheap enough to be always on.
2. **Each module's own time.** Today's "ready in N ms" lines overlap, since every module builds under one `Promise.allSettled`. Find a way to say what each module's build costs the main thread by itself (for example a `?serial=1` switch that builds them one after another in the probe's runs, or timing between yields); say which you chose and how far its sum is from the parallel wall time.
3. **Long tasks.** While loading, record every main-thread block over 50 ms (a `PerformanceObserver` for `longtask` where the browser has it, else gaps in a timer), with the phase it fell in. The longest is "the longest stall of the title card".
4. **`tools/load-probe.mjs`** (Playwright, as the other tools; read `tools/terrain-probe.mjs` and `tools/bench-report.mjs` for the house style): `node tools/load-probe.mjs <base> [--q=low|medium|high] [--runs=3] [--throttle=4] [--net=fast4g] [--json=path]`. For each run it does a **cold** load (new context, empty cache) and then a **repeat** load (same context, a reload), and prints one table: each phase's ms, time to ready, the longest stall, requests made and bytes transferred, requests served from cache on the repeat, and the top ten modules by own build time. Median and spread over the runs. `--throttle` uses CDP's CPU throttling; `--net` its network emulation. Say in its header comment what a local server hides (no latency, no gzip, no HTTP/2: `tools/serve.sh` is not Netlify) and give the probe a way to be pointed at the live site, used once, by hand, for the baseline: `node tools/load-probe.mjs https://below-a-fading-star.netlify.app --runs=3` reads only, and is the one honest network number.
5. **The baseline.** Run it on low and medium, unthrottled and at 4x, against your own port, and once against the live site; put the tables in your report and in `shots/wip/v13-P0-baseline.json`. Then say, in a visitor's terms, where the time goes: what share is fetching, what the terrain, what the modules (and which five), what compile and warm-up; and what a repeat load saves today (probably only what the browser's revalidation saves).
6. **Say what the next briefs should aim at**: three to five lines, each a target with the number behind it.

## Not yours

Making anything faster. The frame loop and `src/perf.js` beyond one `startup` row in `report()` (P1 is in `perf.js` beside you). `tools/suite.sh`: no new `run` line; `loading-test` may gain one row that the marks exist and are in order.

## Done when

- `node tools/load-probe.mjs http://localhost:<port> --q=low --runs=3` prints the table, and three runs agree within a spread you state.
- `startup.report()` is in `?bench`'s JSON; the marks show in `performance.getEntriesByType('measure')`.
- Render pairs unchanged is trivially true here; `ONLY=loading,perf,settings,record,pan tools/suite.sh <port>` green, with counts. You touched `main.js`: the whole suite once, with the counts.
- `world-code/runtime.md` says how to run the probe and read it, in a few lines.
