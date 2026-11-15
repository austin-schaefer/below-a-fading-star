# Brief v13 L5: the builders that are not height

Worktree: `.claude/worktrees/issue-1304-builders` (branch `issue-1304-builders`, port 8164; it carries P0's and P2's branches, so `tools/load-probe.mjs` and its `--profile` are there). Work only there. Read `briefs/v13/_common.md` first. Model: strong.

## Goal

A visitor waits 8.1 s on low and 12.2 s on medium for "Go out" (32 to 48 s with the 4x CPU throttle that stands in for a phone). The module builds are 5.4 s and 7.4 s of that. About half of the build time is terrain height sampling, which L2 is making cheaper beside you. **The other half is yours:** the modules whose build is their own code. From P2's profile (`shots/wip/v13-P2-low.txt` in `.claude/worktrees/issue-1302-load-profile`; P0's per-module times are in `plans/wilderness-v13.md`, Status, and `shots/wip/v13-P0-baseline.log` in `.claude/worktrees/issue-1300-load-yardstick`):

- **plinths** (`src/v5/plinths.js`; 308 ms low, 607 medium, 2.5 s at medium 4x): 2% height; its own `field` (`:270`) and `capD` (`:103`).
- **thrones** (`src/v5/thrones.js`; 419 ms medium, 1.65 s at 4x): 9% height; `buildOne` (`:182`), its `cap` and `body`.
- **structures** (`src/structures.js`; 340 low, 368 medium): 20% height; `addPaver` (`:39`), `src/structures/arches.js` `wp` (`:160`), `src/structures/geo.js`, and three's own geometry work (`toNonIndexed`, `mergeGeometries` in `src/v4/kit/merge.js`, the `getX/getY/getZ` accessors, 2.5% of the load between them).
- **water** (435 medium): a quarter is `makeWaterTexture` (`src/water/textures.js:21`).
- **the waystation**: canvas drawing. **The living canyon** (`src/v7/canyon.js`): surface nets.
- **vegetation** (the largest module: 858 ms low, 1001 medium, 4.3 s at 4x): find out with `--profile` how much is height (L2's) and how much is its own (the atlas canvas, `buildTrees`, `buildPlants`, `waterDepth` in `src/vegetation/ground.js:102`, `src/vegetation/util.js`); the part that is its own is yours.
- **Compile polling**: `isReady` in three is 8% of the profiled load's CPU (2.4 s of self time under the profiler). Find out what that is: if `compileAsync`'s polling is burning the main thread while 218 programs link, a slower poll or one await costs nothing to fix; if it is an artefact of the profiler or the minifier's names, say so.

For each: profile it alone first (`?serial=1`, `node tools/load-probe.mjs http://localhost:8164 --profile --q=low`, and DevTools on the saved `.cpuprofile` if you want), then make it cheaper with **identical output**: the same geometry, to the bit where you can check it. Typical wins here: per-vertex work through `BufferAttribute.getX/setXYZ` rewritten onto the typed array; `toNonIndexed` and merges of many small geometries replaced by writing into one preallocated array; fields and distance functions evaluated over a box when the caller only needs a few cells; canvases drawn at build that could be drawn smaller, once, or shared; work done for the high tier and thrown away on low. Do the largest first and stop when what is left is under about 50 ms a module.

## The check that lets you move fast

Write `tools/build-check.mjs` (extend `terrain-probe`'s idea): in the page, after ready, hash every mesh's geometry attributes and instance matrices and each canvas texture's pixels, grouped by the module that made them (the profiler's tagging knows), and print one fingerprint per module; `--record` and `--against`. Record it on your tree before your first change. A module whose fingerprint moved is a module whose look may have moved: either make it identical, or show with render pairs (`tools/pair-diff.mjs`, the module seen close and far, low and medium) that it has not, and say which modules those are. Other agents will use this tool after you; document it in `runtime.md`.

## Target, in a visitor's terms

Seconds to "Go out": the non-height half of the module builds cut by a third, which is about 0.8 s on low and 1.2 s on medium at 1x, 3 to 4 s at 4x, with identical output. Other agents' browsers are running beside you (the machine's load average has been over 20): lead with `--profile` shares and each module's own serial build time, three runs.

## Not yours

`src/terrain.js`, `src/noise.js`, `src/v4/regions.js`, `src/v4/mountains.js`, `src/v4/tarn.js` (L2's: the height path). Modules that are mostly height (galleries, annals, inhabitants2, rocks, the outwash, the Adust): they get faster when L2 lands. `src/main.js` beyond a line (the `compileAsync` call excepted, if that is where the polling fix lives). `tools/load-probe.mjs` and `src/startup.js` (P0 is finishing a second round there).

## Done when

- `build-check` identical for every module you touched, or the pairs shown for those that are not.
- Before and after: each touched module's serial build time (three runs), the probe's table on low and medium at 1x and low at 4x.
- `ONLY=settings,loading,perf,dressing,regions,strata,house,livery,rocks,treelod,walk,edges,paths,roads tools/suite.sh 8164` green with counts; the whole suite if you changed anything in `src/v4/kit/` or other shared code.
