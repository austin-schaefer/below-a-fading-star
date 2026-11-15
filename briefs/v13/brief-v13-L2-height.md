# Brief v13 L2: the height core

Worktree: `.claude/worktrees/issue-1303-height-core` (branch `issue-1303-height-core`, port 8163; it carries P0's and P2's branches, so `tools/load-probe.mjs` and its `--profile` are there). Work only there. Read `briefs/v13/_common.md` first. Model: strong.

## Goal

A visitor waits 8.1 s on low and 12.2 s on medium for "Go out" on the owner's Mac, and 32 to 48 s with the 4x CPU throttle that stands in for a phone (`plans/wilderness-v13.md`, Status). P2's profile (`shots/wip/v13-P2-low.txt` in `.claude/worktrees/issue-1302-load-profile`, and the P2 entry in Status) says why: **`heightAt` and what it calls is 42% of the whole load's CPU**: 63% of the terrain bake and about half of the module builds. 399k calls in the bake (278k of them from 69.5k `slopeAt` calls of four samples each), 737k in the module builds at about 6 µs each. Inside it: `regionsHeight`/`regionAt` (`src/v4/regions.js:132`, the largest self time of any function in the load, 14.7%), `applyMountains` (36% of the bake's height time), `noise2` (`src/noise.js:42`, 11.9% of the load), the fen's `warped2`, the causeway and river distances.

Make height sampling cheap **without changing one bit of what it returns**, and leave the height path importable by a Worker.

1. **Exact first.** Bounding boxes and early outs (a region's polygon is nowhere near most samples; the mountains do nothing inside some radius; the river, causeway, tarn, span and icefall each have a box), the keyed `out[k]` loop in `regionAt`, flat typed gradient tables in the noise, hoisted constants, no allocation per call (`slopeAt` makes a `THREE.Vector3`, `terrain.js:600`). Each change is checked bit-for-bit: write `tools/height-check.mjs` (node only, no browser, if the height path can be imported in node; else in the probe's page) that samples `heightAt`, `slopeAt`, `normalAt`, `biomeAt` and `regionAt` at a few hundred thousand fixed points (a grid, plus points along every road, shore, wall and region edge) and compares against a file recorded from the tree before your first change: **identical, not close**. `tools/terrain-probe.mjs`'s fingerprint stays identical too. This check is what lets you move fast; build it first.
2. **Count the repeats.** P2 added a repeat counter and never ran it: how many of the module builds' 737k calls ask for a point already asked for (the same x, z to the bit)? If the share is large, an exact memo (a hash on the two float64s, bounded) is worth more than anything else; if small, say the number and drop it.
3. **The bake's slope.** 278k of the bake's 399k samples are `slopeAt`'s four neighbours. If the bake can take slope from samples it already has **and the baked attributes come out identical**, do it; if they differ at all, measure how (pair renders at the bench stations with `tools/pair-diff.mjs`, on low and medium, and the count and size of changed attribute values) and leave it **off**, behind a note in your report with the seconds it would save. The orchestrator decides that one, not you.
4. **Worker-ready.** After you, another brief runs the terrain bake in a Worker beside the module builds and stores it in IndexedDB. Leave the height path so that it can be imported there: no bare `'three'` import in the modules the pure maths needs (an import map does not reach a worker; `THREE.Color` in the bake's colour loop can be plain arithmetic or stay on the main side), no `location`/`document`/`window` read at module top (the URL params `mountains=`, `bands`, `ridge`, `regions`, `cols`, `fall` and the like become an options object read once on the main side and passed in), and the side channels named (the `WALL_SAMPLE` one the survey found, the ten `vN` modules `terrain.js` imports, the region hooks). You do not write the worker. If full separation is more than a day's work, do the split that lets `heightAt` and the bake's arrays be computed off-thread and list what is left.
5. **No bilinear grid.** A shared height grid sampled bilinearly would save about 3 s on low and move things by centimetres on steep ground; "nothing may look different" rules it out for this milestone. Do not build it.

## Target, in a visitor's terms

Seconds to "Go out" on low and medium, cold, unthrottled and at 4x (`node tools/load-probe.mjs http://localhost:8163 --q=low --runs=3 [--throttle=4]`). P2's ceilings for the exact changes: about 1.2 s (low) and 1.5 s (medium) from `regionAt`, about 0.5 s from the noise, more from the boxes. Aim for the terrain bake's and the module builds' height time **halved**: low cold from 8.1 s to 6.0 s or under, with identical output. Other agents' browsers are running beside you (the machine's load average has been over 20): lead with the numbers that do not depend on the machine (call counts, `--profile` shares, µs per call from a node microbench of `height-check`'s points), and take the wall-clock runs three times.

## Not yours

The worker and the cache (the next brief). Modules whose build is not height (`src/v5/plinths.js`, `src/v5/thrones.js`, `src/structures.js`, `src/water/textures.js`, the waystation, `src/v7/canyon.js`): L5 is in them beside you. `src/main.js` beyond a line. P0 is finishing a second round in `tools/load-probe.mjs` and `src/startup.js`: do not edit those.

## Done when

- `tools/height-check.mjs` passes against the recording from before your changes, and says how many points and what it compared; `terrain-probe`'s fingerprint identical on low and medium.
- Before and after: the probe's table (low and medium, 1x; low 4x), `--profile`'s inclusive `heightAt` share and call counts, µs per call.
- Render pairs at `tools/views-perf.json` on low: identical or within run-to-run noise (take a no-change pair first to learn the noise).
- The whole suite (`tools/suite.sh 8163`), since terrain is shared code, with the counts.
- `world-code` (`modules.md`, `runtime.md`) says what the height path's files are, what may be imported in a worker, and how to run `height-check`.
