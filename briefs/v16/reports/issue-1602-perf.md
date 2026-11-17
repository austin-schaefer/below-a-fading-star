# v16 P1, performance: report

Branch `issue-1602-perf`. Served on port 8172, not 8162: 8162 (and 8173, 8182) were held by stale `http-server`s from finished worktrees (8162's cwd was the deleted `issue-1511-rungs`), left running; the orchestrator may want to kill them.

## What changed

1. **The walker's colliders get a broad phase** (`src/controls.js`). A 4 m grid of indices into `state.colliders`, each cell in list order, so a walk is bit-identical to the linear scan (a push of more than 0.3 m falls back to the whole list). Moves are seen by comparing `x, z, r` against typed arrays each frame; nothing is written on the collider objects (a first version kept its record on them and broke, because modules copy colliders with a spread and because a module splices the list mid-way during the build: both handled, the splice by re-indexing). `?collgrid=0` / `state.collGrid = false` is the scan. `hop-test` gains six rows: five walks (Lynchets, the crown, the Rungs, the Lees' square, the causeway), grid on and off, ending 0 m apart; its cheapness row prints both costs.
2. **The biomesh's creep keeps its ground test per 0.2 m cell** (`src/fauna/uncanny/biomesh.js`). `okG` (field height, water, slope) ran for every stepping tile every frame. A tile may now stand up to 0.14 m nearer a wet or steep edge than before; `?throttle=0` is the exact test.
3. **The Lonely Staircase's slab meshes are culled** (`src/v12/stair.js`). Its treads, landings and kerbs were `frustumCulled = false`: 10 draws and about 200k triangles (colour and shadow) from everywhere in the valley. Each is now bounded by every place its slabs can be, laid or lying on the turf, plus a slab's half-diagonal and 1 m.
4. **The tools draw on Metal by default** (agent issue #79, as it says): `tools/launch.mjs` is the one place (`ANGLE`, `ARGS`, `launch()`), 88 tools take it, `SHOT_ANGLE=swiftshader` is the software path. `touch-test`, `settings-test` and `gutter-wav` were pinned to SwiftShader; nothing in their history or headers needs it (they were written before `SHOT_ANGLE` existed), so they take the setting now. `suite.sh` no longer exports it; `AGENTS.md`'s pace rule and the `world-code`, `wilderness`, `critic`, `harness` lines say so.
5. **`tools/perf-views.mjs`** and `tools/views-perf-v16.json` (the ten perf views, four at the Lappet, one under the moor): what each view costs, medians over fresh browsers. Documented in `runtime.md`, "v16".

## Before (measured first, on `28dda87`, a quiet spell, 3 runs each)

JS ms is the profiler's per-frame JS; GPU ms is the timer query (noisy: it shares the GPU with other agents); "walker" is `controls.update` walking 300 ticks.

**low** (3 runs, medians; ready 5806 ms, 6560 colliders)

| view | calls | tris k | JS ms | render | controls | vegetation | fauna | GPU ms | walker ms |
|---|---|---|---|---|---|---|---|---|---|
| spawn | 288 | 2057 | 3.59 | 2.33 | 0.34 | 0.12 | 0.13 | 29.9 | 0.177 |
| causeway | 264 | 1904 | 3.90 | 2.15 | 0.32 | 0.39 | 0.36 | 29.6 | 0.188 |
| tarn | 236 | 1781 | 3.27 | 2.03 | 0.38 | 0.13 | 0.10 | 32.4 | 0.207 |
| fen | 269 | 1827 | 3.63 | 2.13 | 0.32 | 0.44 | 0.12 | 25.6 | 0.180 |
| wood | 200 | 1304 | 2.71 | 1.64 | 0.28 | 0.24 | 0.07 | 22.4 | 0.167 |
| sun | 246 | 1808 | 3.49 | 1.95 | 0.32 | 0.41 | 0.31 | 30.6 | 0.166 |
| lattice | 199 | 1311 | 4.56 | 1.75 | 0.31 | 0.22 | 1.36 | 13.9 | 0.184 |
| wrongcolour | 184 | 1099 | 3.22 | 1.87 | 0.43 | 0.27 | 0.04 | 13.1 | 0.296 |
| taverna | 294 | 2274 | 3.93 | 2.37 | 0.41 | 0.39 | 0.12 | 23.2 | 0.191 |
| herd | 284 | 1879 | 3.74 | 2.25 | 0.31 | 0.40 | 0.11 | 23.9 | 0.172 |
| lap-crown | 315 | 2383 | 3.94 | 2.53 | 0.33 | 0.43 | 0.12 | 24 | 0.195 |
| lap-rungs | 329 | 2405 | 3.91 | 2.66 | 0.34 | 0.22 | 0.11 | 22.8 | 0.204 |
| lap-lees | 328 | 2478 | 3.81 | 2.69 | 0.34 | 0.15 | 0.07 | 24.9 | 0.164 |
| lap-house-up | 335 | 2393 | 4.11 | 2.84 | 0.32 | 0.20 | 0.11 | 30.3 | 0.165 |
| underground | 168 | 1472 | 2.80 | 1.42 | 0.40 | 0.21 | 0.05 | 22.4 | 0.248 |

**medium** (3 runs, medians; ready 7427 ms, 7624 colliders)

| view | calls | tris k | JS ms | render | controls | vegetation | fauna | GPU ms | walker ms |
|---|---|---|---|---|---|---|---|---|---|
| spawn | 316 | 3549 | 3.54 | 2.20 | 0.37 | 0.12 | 0.12 | 22.1 | 0.203 |
| causeway | 287 | 3234 | 4.21 | 2.00 | 0.35 | 0.45 | 0.74 | 20.7 | 0.221 |
| tarn | 266 | 3115 | 3.02 | 1.88 | 0.34 | 0.13 | 0.09 | 23.2 | 0.224 |
| fen | 306 | 3473 | 3.57 | 2.02 | 0.34 | 0.50 | 0.10 | 19.0 | 0.206 |
| wood | 218 | 2507 | 3.14 | 1.77 | 0.40 | 0.31 | 0.08 | 28.9 | 0.195 |
| sun | 270 | 2958 | 4.27 | 2.01 | 0.40 | 0.49 | 0.75 | 26.2 | 0.187 |
| lattice | 209 | 2274 | 5.63 | 1.68 | 0.36 | 0.26 | 2.44 | 19.8 | 0.190 |
| wrongcolour | 197 | 2011 | 3.47 | 1.80 | 0.61 | 0.32 | 0.05 | 20.2 | 0.304 |
| taverna | 319 | 3588 | 3.71 | 2.05 | 0.44 | 0.48 | 0.12 | 24.6 | 0.208 |
| herd | 322 | 3301 | 3.81 | 2.21 | 0.36 | 0.45 | 0.11 | 23.9 | 0.199 |
| lap-crown | 355 | 3818 | 3.80 | 2.28 | 0.37 | 0.45 | 0.11 | 18.0 | 0.225 |
| lap-rungs | 361 | 3852 | 3.50 | 2.27 | 0.38 | 0.17 | 0.10 | 23.9 | 0.262 |
| lap-lees | 362 | 3974 | 3.82 | 2.45 | 0.40 | 0.13 | 0.06 | 23.6 | 0.220 |
| lap-house-up | 371 | 4057 | 4.16 | 2.68 | 0.39 | 0.19 | 0.10 | 29.0 | 0.215 |
| underground | 183 | 2575 | 2.55 | 1.28 | 0.34 | 0.18 | 0.04 | 15.8 | 0.290 |

The three largest costs found: `render` (three's traversal and draw calls, 2 to 2.8 ms, most at the Lappet, with 315 to 371 calls); `fauna` at the Lattice (1.4 ms low, 2.4 medium: the biomesh's `okG`); the walker's update (0.17 to 0.3 ms, everywhere; 0.67 in the suite under load). Of the colour pass's draws, 40 to 100 per view change no pixel (measured by hiding each module and diffing): about 95 of ~250 skip frustum culling (`frustumCulled = false`), most of them figures and particles placed in their shaders; the stair was the one large static set among them. Vegetation's 0.4 to 0.8 ms at some views is streaming after a teleport, not a standing cost. The Lappet's own meshes are not the draw cost there (3 to 4 calls for the bones, one a quarter): its higher count is the valley it overlooks.

## Before and after, interleaved (before `28dda87` served on 8192, after on 8172, alternating, 3 runs each)

The machine was heavily loaded by other agents during these runs (ready 9 to 10 s against 5.8 s quiet), so the JS and render ms swing up to 2x between runs of the same tree and are not evidence either way. The rows that do not depend on load: calls and triangles (exact), `fauna` at the Lattice, the walker's update and the `controls` row.

**low**, 3 runs before / 3 after, interleaved; ready 9412 / 8996 ms

| view | calls | tris k | JS ms | controls ms | fauna ms | render ms | walker update ms |
|---|---|---|---|---|---|---|---|
| spawn | 289 → 279 | 2058 → 1857 | 13.80 → 12.11 | 1.00 → 0.75 | 0.53 → 0.37 | 9.16 → 8.48 | 0.590 → 0.300 |
| causeway | 264 → 254 | 1904 → 1703 | 10.22 → 12.11 | 0.73 → 0.76 | 1.21 → 0.58 | 5.64 → 7.22 | 0.437 → 0.370 |
| tarn | 236 → 226 | 1781 → 1580 | 6.29 → 8.10 | 0.69 → 0.61 | 0.18 → 0.26 | 4.15 → 5.55 | 0.368 → 0.295 |
| fen | 269 → 260 | 1827 → 1629 | 5.14 → 4.70 | 0.51 → 0.33 | 0.18 → 0.17 | 3.11 → 2.96 | 0.291 → 0.171 |
| wood | 200 → 192 | 1304 → 1244 | 4.33 → 4.45 | 0.46 → 0.45 | 0.11 → 0.11 | 2.62 → 2.75 | 0.254 → 0.203 |
| sun | 246 → 236 | 1808 → 1607 | 5.19 → 7.22 | 0.46 → 0.49 | 0.55 → 0.25 | 3.06 → 4.47 | 0.277 → 0.271 |
| lattice | 199 → 189 | 1310 → 1110 | 5.99 → 5.48 | 0.43 → 0.42 | 1.76 → 0.34 | 2.64 → 2.99 | 0.226 → 0.174 |
| wrongcolour | 184 → 174 | 1099 → 898 | 4.58 → 4.04 | 0.56 → 0.46 | 0.04 → 0.06 | 2.82 → 2.30 | 0.365 → 0.258 |
| taverna | 294 → 293 | 2273 → 2270 | 12.12 → 5.73 | 1.07 → 0.41 | 0.33 → 0.14 | 7.61 → 3.67 | 0.455 → 0.204 |
| herd | 286 → 276 | 1879 → 1679 | 5.91 → 6.23 | 0.43 → 0.44 | 0.17 → 0.18 | 3.84 → 3.96 | 0.254 → 0.172 |
| lap-crown | 315 → 314 | 2383 → 2379 | 6.02 → 6.45 | 0.52 → 0.38 | 0.19 → 0.17 | 3.89 → 4.26 | 0.345 → 0.155 |
| lap-rungs | 330 → 328 | 2405 → 2401 | 7.05 → 5.64 | 0.57 → 0.38 | 0.17 → 0.16 | 4.83 → 4.02 | 0.427 → 0.171 |
| lap-lees | 327 → 326 | 2479 → 2474 | 8.22 → 4.95 | 0.69 → 0.35 | 0.12 → 0.09 | 6.06 → 3.59 | 0.440 → 0.160 |
| lap-house-up | 335 → 329 | 2393 → 2288 | 12.71 → 5.76 | 0.76 → 0.43 | 0.33 → 0.13 | 8.77 → 4.11 | 0.426 → 0.157 |
| underground | 168 → 165 | 1472 → 1451 | 3.35 → 3.50 | 0.48 → 0.39 | 0.07 → 0.06 | 1.63 → 1.81 | 0.316 → 0.117 |

**medium**, 3 runs before / 3 after, interleaved; ready 9606 / 9860 ms

| view | calls | tris k | JS ms | controls ms | fauna ms | render ms | walker update ms |
|---|---|---|---|---|---|---|---|
| spawn | 317 → 307 | 3551 → 3350 | 13.15 → 15.64 | 1.13 → 1.03 | 0.42 → 0.67 | 8.81 → 9.89 | 0.442 → 0.443 |
| causeway | 287 → 277 | 3234 → 3033 | 9.01 → 6.31 | 0.68 → 0.57 | 1.61 → 0.42 | 4.60 → 3.47 | 0.562 → 0.272 |
| tarn | 266 → 256 | 3117 → 2915 | 6.00 → 4.31 | 0.59 → 0.39 | 0.16 → 0.12 | 4.02 → 2.74 | 0.536 → 0.235 |
| fen | 306 → 297 | 3473 → 3276 | 9.56 → 8.01 | 0.87 → 0.51 | 0.29 → 0.24 | 5.72 → 4.95 | 0.510 → 0.273 |
| wood | 218 → 208 | 2507 → 2305 | 4.99 → 6.14 | 0.58 → 0.66 | 0.11 → 0.15 | 2.96 → 3.60 | 0.326 → 0.306 |
| sun | 270 → 260 | 2958 → 2758 | 7.73 → 5.87 | 0.59 → 0.45 | 1.41 → 0.27 | 3.87 → 3.42 | 0.365 → 0.309 |
| lattice | 209 → 199 | 2271 → 2070 | 9.48 → 5.29 | 0.54 → 0.46 | 3.74 → 0.41 | 3.16 → 2.72 | 0.321 → 0.178 |
| wrongcolour | 197 → 187 | 2011 → 1810 | 4.70 → 3.78 | 0.72 → 0.45 | 0.06 → 0.04 | 2.60 → 2.18 | 0.508 → 0.223 |
| taverna | 319 → 318 | 3584 → 3580 | 12.53 → 12.74 | 1.29 → 0.84 | 0.38 → 0.34 | 7.43 → 8.22 | 0.569 → 0.321 |
| herd | 322 → 312 | 3290 → 3089 | 6.50 → 11.07 | 0.61 → 0.83 | 0.18 → 0.27 | 3.98 → 7.08 | 0.389 → 0.248 |
| lap-crown | 353 → 354 | 3816 → 3812 | 11.81 → 14.26 | 0.90 → 0.77 | 0.25 → 0.31 | 7.88 → 9.51 | 0.873 → 0.422 |
| lap-rungs | 362 → 361 | 3851 → 3846 | 7.22 → 9.51 | 0.64 → 0.77 | 0.22 → 0.25 | 4.71 → 6.01 | 0.872 → 0.358 |
| lap-lees | 361 → 360 | 3973 → 3969 | 11.92 → 12.02 | 1.03 → 0.79 | 0.15 → 0.17 | 7.58 → 7.93 | 0.837 → 0.507 |
| lap-house-up | 369 → 363 | 4055 → 3950 | 17.00 → 13.72 | 0.87 → 0.98 | 0.30 → 0.28 | 11.89 → 9.72 | 0.872 → 0.413 |
| underground | 183 → 180 | 2571 → 2550 | 4.80 → 7.09 | 0.59 → 0.66 | 0.07 → 0.08 | 2.52 → 3.90 | 0.647 → 0.669 |

Per fix: the stair, 10 calls and ~200k triangles fewer wherever it is out of view (every standing view but the taverna and the Lappet, which face it; 1 to 6 there); the biomesh, `fauna` at the Lattice 1.76 → 0.34 ms (low) and 3.74 → 0.41 (medium), and at the causeway and sun about halved; the broad phase, `hop-test`'s timing 0.242 → 0.152 ms (suite run), 0.199 → 0.141 and 0.172 → 0.116 (alone), the walker column about halved on both tiers, the Lappet's views most (0.35–0.87 → 0.16–0.42).

## The tools, before and after (#79)

Interleaved, each test alone against 8172:

| test | SwiftShader (before) | Metal (after) |
|---|---|---|
| touch | 159, 222, 253 s (median 222) | 14, 16, 13 s (median 14) |
| settings | timed out at 89 s (the gear's click; the flake #79 names), 535, 365 s | 49, 54, 40 s (median 49) |
| hop (the suite already ran it on Metal) | 11 s | 11 s |

CPU while a suite runs is not measured.

## Tests

`ONLY=perf,hop,walk,loading,village,heights,settings,touch,stair tools/suite.sh 8172` (the brief's `load` is the suite's `loading`; `stair` added because `stair.js` changed): 9 tests, 0 failed, 10 min 15 s. settings 86 PASS, village 687, walk 13, hop 30, heights 203, loading 28, perf 29, touch 43, stair 5. Touch and settings passed twice more each alone (43, 86).

The colliders changed (the broad phase), so the Lappet was walked on the keys: `node tools/village-walk.mjs http://localhost:8172 keys low 0 v16-P1-walk`, the main stair from the crown down to the Lees' square and the ramp, the tube, the gangway, the Tenter, up to the crown and the ladder twice, "walked: yes", no page errors; feet on every named floor at its height (crown 18.00, high 14.00, mid 10.00, bastion 6.00, the square 3.1). Frames, in order: `shots/wip/v16-P1-walk-keys-low-001-*.png` to `-035-*.png`.

## What is still weak

- `render` (three's per-object work) stays the largest JS cost everywhere, and at the Lappet it is what a phone pays for. About 95 draws a view skip frustum culling (figures and particles placed in their shaders, `rocks`' and `far`'s self-packed sets, the sky's): a bound for each, as the stair now has, is the next large saving. From the surface the underground's places (`passage` 8, `coffinroad` 4, `nave` 2 at the Lappet) are drawn behind the ground: the seal in `src/v14/under.js` could run the other way while the eye is above ground.
- Height sampling (`src/height/*`, not mine): `heightAt`, `slopeAt` and `waterLevelAt` are the top functions in the biomesh and in the walker's floors. The fix I would make: a per-cell cache of the field's height and normal for movers (as `makeGround` does from the terrain mesh), read where exactness to the field is not needed.
- The JS and GPU timings in the after table are not clean evidence under this load: the orchestrator's batch run on a quieter machine should repeat `node tools/perf-views.mjs <base> low 3` and `medium 3`.
- `hop-test` honours `HOP_EXTRA` (extra URL params; used to run it with `&collgrid=0`).

## Defaults taken

- Port 8172 (8162 held by a stale server). The three fixes: the measured three largest that are mine (render as a whole is three's; the stair was its largest static share). Tools: the issue's whole plan, with `suite.sh` no longer exporting `SHOT_ANGLE`. The biomesh's 0.2 m cell is a visual change a blind reader would not name (a chip 14 cm nearer a puddle's edge, at most).
