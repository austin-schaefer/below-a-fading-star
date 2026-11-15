# v13 P1, the frame yardstick: report (2026-11-14, 22:30 PST)

**Target:** a yardstick, not a speed-up: the worst frame's JS on the bench route, a top and two teleports included (provisional milestone target: none over 50 ms on low). **Baseline** (`SHOT_ANGLE=metal nice -n 10 node tools/bench-report.mjs "http://localhost:8162/?bench=45&perf=1&q=<q>" shots/wip/v13-P1-baseline-<q>[-x4]-<n>.json [--throttle=4]`, owner's M3 on battery, cap 30 on low, three runs each, median (range)):

| | JS median ms | p99 | worst | hitches |
|---|---|---|---|---|
| low, route / top / wake | 3.6 (3.3–3.7) / 3.5 / 2.9 | 7.2 (7–8.3) | 8.6 (8–11) | 0 (0–1) |
| medium, route / top / wake | 3.6 (3.5–3.7) / 3.1 / 3.3 | 5.0 | 6.3 (6–6.5) | 0 |
| low with 4x CPU throttle (phone stand-in) | 13.6 / 10.9 / 12.8 | 18.6 | 22.2 (20.3–22.8) | 0 |

**Result:** no frame over 50 ms anywhere headless, the teleports included; the worst ten are render-heavy frames that also carry a far.js pack (~10k instances, 200–400 KB of buffer sent) and a plant or rock repack; at 4x the teleport onto the deck is the #1 or #7 frame (20 ms: teleport, shadow, plants, far 11k, 309 KB). Unattributed JS: 1.0–1.1% of all JS.

Route rows, ms a frame, low (x4): render 2.06 (7.54) · vegetation 0.34 (1.16) · controls 0.31 (0.91) · fauna 0.23 (0.86) · shadow.pass 0.17 (0.63) · far 0.13 (0.49). Memory, low / medium: geometry 100.1 / 155.7 MB (structures 20.4, core 12.3, vegetation 7.6 on low), textures 37.2 / 42.4 MB, JS heap ~300–390 / 460–560 MB. Draws: route 150–210 colour calls, 1.2–1.7M tris; the deck 170 / 1.21M on low, 197 / 2.6M on medium.

## What changed
- `src/perf-frames.js` (new): dist (shared with the recorder), the per-frame log, hitch log (+ the ten slowest whatever the rule), draw cost per module (heights-cost's hooks, on station frames only), geometry bytes, JS heap, the panel's lines and the short copy.
- `src/perf.js`: the bench's legs (Go to the Span's deck; the fall's waking via `controls.carry` as fall.js does), seven stations, memory at start and end, `version: 2` fields beside the unchanged `summary`; unowned rows (render, shadow.pass, far, controls, sky, hud, post.update, shadow.cadence, lights.slots, bench.drive, perf) wrapped at the first profiler frame only (the GPU-timer wraps moved there too); `report().memory` gains geometry and jsHeap; `brief()`.
- `src/gpumem.js`: buffer uploads. `src/v12/far.js`: counts `far.instances`. `src/settings.js` + `index.html`: the Measure row; the bench panel opaque, scrolling, buttons sticky and 44 px; the overlay steps aside for it.
- `tools/bench-report.mjs`: prints the panel's lines, reads saved files, `--against=`, `--throttle=`. `tools/alloc-audit.mjs`: runs without `?bench`. perf-test +11 rows, settings-test +1.

## Checks
- `ONLY=perf,record,pan,settings,touch,loading,heights,walk tools/suite.sh 8162`: settings 73/73, walk 13 PASS, heights 102/102, loading 7 PASS, perf 28/28, touch 43/43, record 16/16; **pan FAIL**: station A also fails on `origin/next` (extracted to the scratchpad and served on 8163, same minute: still median 11.1 ms, worst-turn ratio over 3); B passed on next and failed here. Pan's ratio is noise on this machine tonight; pan's CPU is frameBegin to frameEnd wall time, which my rows do not change.
- alloc-audit with `?perf` absent (`?q=low&idle=0`, 6 s): hooks not installed; src 567.5 KB/frame vs 565.4 before (+0.4%, noise), THREE objects 0.01 both. With `?bench=30`: src 751.7 vs 738.1 KB/frame, all of it in the 500 ms block close (more rows); nothing per frame from the new code.
- Render pairs at `tools/views-perf.json` on low and medium: all 20 within noise (≤ 21 px) except low tarn (the first "after" run 18059 px; a second after vs before: 10 px) and wrongcolour (515 / 2570 px; after vs after2 664 px: a moving thing). terrain-probe fingerprint: max |dh| 0.
- Phone (390x844, touch): the Measure URL ran, the panel rendered (`shots/wip/v13-P1-measure-phone-3.png`), Copy put a 6.3 KB brief on the clipboard, the URL was cleaned, Close gave the card back. The row: `shots/wip/v13-P1-measure-row-phone.png`.

## For the next briefs
- **render is 57% of a median frame's JS** (2.06 of 3.6 ms low; 7.5 of 13.6 at 4x): three's traversal, sort and GL calls. The biggest lever is fewer draws or objects per frame, not module updates.
- **far.js's round-robin packs ~10k instances and sends 200–400 KB every few frames**; it is in 9 of the worst 10 frames at 4x. Smaller batches or packing only what moved would flatten the worst frames.
- **controls 0.31 ms (0.91 at 4x) a frame** while walking (0.03 carried): third row, larger than any world module but vegetation. Worth a look (collider loop).
- The **teleport is not a hitch headless** (20 ms at 4x, top-ten). F1 should wait for a real-phone number from the Measure row before spending on it.
- Run-to-run spread on low is wide (p99 7–8.3, worst 8–11): a later brief claims a gain only beyond that, from three runs.

## Defaults taken
Legs stand 15% of the round (1.5–8 s; 6.75 s at 45); stations at 10/30/50/70/90% of the route plus one per leg; the top is the settings entry "The middle of the Span"; the waking is fall.js's placement and look copied into the bench (fall.js exports no wake); the hitch rule min(50 ms, 3x median); Copy gives the brief, Download everything; `measure=1` cleans the URL when done.
