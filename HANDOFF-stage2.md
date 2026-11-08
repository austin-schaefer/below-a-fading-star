# v3 stage 2 handoff

Branch `v3-stage2`. Results, flags and pairs are written up in `wilderness-v3.md` (stage 2 sections).

## The cheap wins

| change | state | commit | flag |
|---|---|---|---|
| frame cap and idle | done | 1f7ce07 | `cap=`, `idle=0` |
| pixel ratio by quality | done | a0b8235 | `dpr=` |
| shadow cadence, far creatures stop casting | done | 2ab4ce7 | `shadowhz=`, `shadowdyn=`, `shadowcull=0`, `pcf=` |
| bloom at half size, retuned | done | 2d33ed9 | `bloomres=`, `bloomtune=` |
| point lights in 3 slots | done | 610b9c0 | `lights=` |
| update throttling by distance | done (main consumers; wings, gutter bats, life.js, fish not throttled: cheap, and stutter would show in the sky) | 276dd56 | `throttle=0` |
| Firefox draw calls (trees' BatchedMesh without WEBGL_multi_draw) | done: 3992 -> 538 calls | 671b039 | `batch=`, `multidraw=0` |
| fauna first-frame spike (perch raycasts) | done, perches identical | 414f61c | – |
| profiler: per-callback CPU, bench machine + commit.json, `render=0` | done | final wip commit | `machine=`, `render=0` |

PCF hard at q=low: tried and rejected (same 17 taps; bands the wood's dappled light).
GPU pausing of particle systems: not started (their CPU is already throttled; the rest is shader time, stage 3).

## Verified

- `node tools/perf-test.mjs "http://localhost:8130/?q=low&perf=1&bench=6"`: 15/15 (before the changes and after them, mid-run).
- `node tools/walk-test.mjs "http://localhost:8130/?q=low"`: 6/6 on the final code.
- Not run on the final code (container too slow, stopped): audio-test, loading-test, grass-flicker-test (`node tools/grass-flicker-test.mjs low <base>`), build-artifact, and perf-test once more. Run these on the Mac.
- Headless CPU, `?bench=12&q=low&render=0`, 4 runs before (`throttle=0`) / 3 after: fauna 0.53 -> 0.24 ms/frame, biomesh 0.225 -> 0.003; the causeway stretch 0.76-1.11 -> 0.21-0.29 ms. Total unchanged within vegetation's noise.
- Light slots checked in the page at the taverna (both lanterns carried).

## Look trades for Austin

- Bloom at half size: sun's rim a touch wider/brighter (`shots/wip/perf-02-bloom-sun-before/after.png`), Wrong Colour and Lattice glow slightly less crisp.
- Pixel ratio 1.25 at high: `perf-02-dpr-spawn-before/after.png` (near identical).
- Creatures beyond 40 m cast no shadow (`perf-02-shadows-*`).

## Renders that matter (shots/wip/)

`perf-02-bloom-sun-*`, `perf-02-bloom-wrongcolour-*`, `perf-02-dpr-spawn-*`, `perf-02-pcf-wood-*` (the rejected trade), `perf-02-all-*-before` (untouched tree, 806f909). `perf-02-all-*-after` is incomplete (spawn and causeway only).

## Left

Run the remaining suites; Austin's real bench at high on Firefox (expect ~500 calls where it was 3900); Austin's eye on the bloom pair; stage 3: vegetation's per-frame chunk scan dominates update CPU.
