# Brief v13 L3: the bake, beside the builds and kept

Worktree and port: set at dispatch (after L2 is merged). Read `briefs/v13/_common.md` first. Model: strong.

## Goal

After L2 the height path (`src/height/`) is free of THREE and of `location`, takes its params explicitly, and `tools/height-check.mjs` proves it bit for bit. The terrain bake is still one freeze of the title card (2.0 s on low, 3.9 s on medium, 8 to 16 s with the 4x CPU throttle that stands in for a phone, before L2), done on the main thread before the ~54 module builds start, and done again on every visit.

1. **The bake in a Worker, beside the builds.** The worker computes the bake's arrays (heights and the baked attributes; colour arithmetic may need to come off `THREE.Color` to the bit, checked by `height-check`'s bake comparison) and transfers them; the main thread makes the geometry from them. Meanwhile the main thread does what does not need the mesh: imports, and the builds of modules that only need the analytic `heightAt`. Find which modules read the terrain **mesh** or anything made from it (the survey says placement samples the mesh and a coarse biome grid in `src/vegetation/ground.js`) and order the startup so those wait and the rest do not. On a machine with one core to spare this should take the bake's whole time off the wall clock; say what it does at `--throttle=4` and on `hardwareConcurrency` 2.
2. **The bake kept.** IndexedDB, keyed by the commit (`commit.json`; on a local server with none, a hash of the height path's source text or no caching at all: say which), the tier, and the height params' stable string from `src/height/params.js`. A hit skips the worker entirely. Any miss, error, quota refusal, private window or version skew falls back to computing. Old keys are deleted. A check that a new key replaces the old, and that a corrupted record is ignored.
3. **A helper the heavy modules can use.** `ctx.kept(key, compute)` (name it in the piece's voice or plainly): the same store for a module's own typed arrays. Use it for one module end to end as the model, the one where compute and construct are already apart (rocks' placement arrays or vegetation's), prove with `tools/build-check.mjs` that a load from the store builds the identical module, and measure. Do not convert the rest: say which modules would be worth it and what each would save.
4. **The title card never freezes for long.** With the bake off-thread, the longest stall becomes the largest module build. Report the new longest stall and which module it is.

## Target, in a visitor's terms

Seconds to "Go out", cold and repeat, low and medium, 1x and 4x, and the longest stall: the bake's time off a cold load's wall clock, and a repeat load without the bake at all. Bit-identical terrain (`height-check`, `terrain-probe`, `build-check`).

## Not yours

The service worker and the files (L1). Making builds cheaper (L5).

## Two build-order races, found by L5's `build-check --runs=3`: yours to end

Startup order is yours in this brief, so these are too. Both are in `next` today and predate v13.

- **region-bletting builds without vegetation's trees if they are not ready within 15 s** (it waits on a timer, then goes on): no windfalls under the trees, no snails. It happened on medium on a loaded Mac; a slow phone, where vegetation alone takes 4 s at a 4x throttle and everything else is queued beside it, can hit it. A visitor on the slowest device gets a different world: make the dependency explicit (bletting awaits the trees, with no timeout that changes what is built) and check with `build-check --throttle`-style runs (a 4x and a 6x CPU throttle) that the module's fingerprint is the same as unthrottled.
- **fauna's cloak takes its first spot from whether structures has built yet** (it moves to the right one 2 s into the walk). Make it deterministic.

Then look for others of the same kind: any `setTimeout`, polling or "if it exists yet" in a module's build that reads another module's output (`grep -n "setTimeout\|ctx\.[a-zA-Z]*\?\." src` is a start), and list what you find even where you leave it.
