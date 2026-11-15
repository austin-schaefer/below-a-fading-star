# v13 L4, the heavy builders, kept: report (2026-11-15, 03:58 to 06:30 PST; round two from the review at 05:05)

**Target:** a repeat visit to "Go out" on low at or under 3.1 s (`load-probe --q=low --runs=3`, the repeat column, base and after back to back), medium in proportion; a first visit no slower.
**Baseline:** `SHOT_ANGLE=metal nice -n 10 node tools/load-probe.mjs http://localhost:8170/ --q=low --runs=3 --params=kept=commit`: the base tree (`7661a70`, a `git archive` with a `commit.json`) served as Netlify serves it by `tools/sw-site.mjs`; no other browser on the machine, load average 2.0 to 3.2. Repeat 3364 ms [3347–3366], cold 4241 [4219–4261].
**Result:** the same command against this branch (`git archive` of the round-two tree, served the same way on 8171), interleaved with the base, 05:37 to 05:42: repeat **2255 ms [2237–2369]** (−33%), cold 4259 [4238–4266] (+18 ms, within the spread). Every repeat gain is many times its spread.

| ready, ms, median [min–max] of 3 | base cold | after cold | base repeat | after repeat |
|---|---|---|---|---|
| low 1x | 4241 [4219–4261] | 4259 [4238–4266] | 3364 [3347–3366] | **2255** [2237–2369] (−33%) |
| medium 1x | 5622 [5603–5643] | 5585 [5582–5602] | 4611 [4598–4613] | **2946** [2939–3064] (−36%) |
| low 4x (CPU throttle, a phone's stand-in) | 14051 [14039–14102] | 14085 [14074–14095] | 12264 [12195–12273] | **7762** [7754–7775] (−37%) |

Files: `shots/wip/v13-L4-probe4-{base,after}-{low,medium}-{1x,4x}.{txt,json}`. The repeat's longest stall is the shader compile (`programs`, 213 [213–590] on low; the base's was 280, in `imports`), never a builder. At 4x it fell from 1126 to 927 ms.

`load-probe` now waits for `__fp.keptDone` before its repeat (both trees set it): a repeat is a later visit. Without that, the round-two tree's 31 small writes (one an idle slot, to 730 ms after ready) were still going when the probe reloaded 300 ms after ready, and its "repeat" recomputed what was missing (3348 ms, `probe3`). The writes now share an idle slot while it has over 8 ms left: all done 375 ms after ready on low.

## How: two ways to keep

1. **The height tape** (`src/v13/tape.js`, new). Most of these builds is the ground's pure queries (heightAt, slopeAt, causewayDistance, biomeAt: pure functions of (x, z) in `field.js`). A first visit records every call (x, z, answer, float64), one slot a query in parts of at most 1.5 MB. A repeat answers a call from the tape only when its (x, z) are bit for bit those of the next entry or one of the 8 after it (resync), else from the terrain without moving on. So the module's own code runs exactly as before (every rng draw, clearance, collider, registration, `coverAt`'s stateful tint) and every answer is the number a first visit gets, whatever the tape holds. `tape.run(fn)` swaps `ctx.terrain`'s four for one synchronous stretch (no await inside: no other module's code can run), so helpers that read `ctx.terrain` (faceAt, the skins, `makeGround`) are taped too; restored in `finally`.
2. **Kept results** (`ctx.kept`, and the new `ctx.kept.open(name)` for data whole only later): the thrones' whole mesh; the plinths' feet only.

## Per module

Serial build ms on low (`?serial=1`, the probe's method; base: a repeat load of `7661a70`; after: a repeat load of this branch, the store preloaded). The record is every part of the module's slots, low / medium.

| module | how | base build | after, repeat | saved | record low / medium | what the compute touches besides its result |
|---|---|---|---|---|---|---|
| vegetation | tape (4 stretches) | 468 | 245 | 223 | 4.70 / 5.71 MB | ctx.woodTrees, packToken, its rng streams, `coverAt`'s state: all still run; only the answers come from the tape |
| galleries | tape (`tape.terrain`) | 275 | 9 | 266 | 2.98 / 2.98 | its rng(8121), faceCache: still run |
| thrones | `ctx.kept('thrones.mesh')` | 177 | 3 | 174 | 0.56 / 1.11 | its own fresh `makeRng(8810+7·side)` and `makeSimplex`, heightAt (pure): nothing shared, so skipping it moves no other stream |
| plinths | `kept.open('plinths.feet')` | 180 | 74 | 106 | 0.70 / 1.29 | emitFigure draws no rng, registers nothing, writes only `feet`: it alone is skipped; every draw, box and collider still made (lying()'s offset loops run over none) |
| region-adust | tape (whole build) | 144 | 49 | 95 | 0.64 / 0.97 | rng(8300), R.stats, R.creatures, colliders: still run |
| annals | tape (the notch loop) | 80 | 1 | 79 | 0.74 / 0.74 | none |
| water | tape (disc, river, pool) | 94 | 33 | 61 | 1.15 / 2.53 | its rngs, ctx.river: still run |
| inhabitants2 | tape (each site) | 67 | 12 | 55 | 1.66 / 1.66 | still run |
| structures | tape: **reverted** | 285 | 277 | 8 | (3.98) | its 4 MB tape's read ate the gain |

**Is replaying faster than computing, now that heightAt is ~1.7 µs?** Yes for each kept module: the smallest saving is inhabitants2's 55 ms (69,317 calls); every one is over the brief's 40 ms line, so every tape stays. Structures (166k calls, but cheap ones: 0.9 µs) saved 8 ms and was dropped; plinths' stone boxes kept as well saved 4 ms and were dropped. Medium, first visit / repeat: vegetation 667/349, galleries 281/20, thrones 350/5, plinths 334/73, adust 216/75, annals 84/4, water 176/49, inhabitants2 77/26 (round one's numbers; round two only moved the get to the preload).

**The store's size:** with the bake and rocks, low 19.8 MB (13.5 MB of it L4's), medium 31.7 MB (17.7 MB L4's): under 40 MB a tier, so nothing is quantised. A visitor who has loaded both tiers holds both (~51 MB); prune removes only other trees.

## The review's items (round two)

1. **The snapshots** are dropped as each is written (`keepLater[i] = null`).
2. **A replayed tape** lets its arrays go at `done()`; a recorded one already did.
3. **The puts on the main thread** (checksum + IndexedDB's clone, timed in `keptStats.putMs`, printed by `bench-report`): whole, vegetation's was 15.3 ms at 1x (18.7 medium, 64 at 4x). Split into parts of at most 1.5 MB, the largest L4 put is galleries' first part, **6.2 ms at 1x on low, 6.0 medium, 21.9 at 4x**; the largest of all is L3's `rocks.place`, 7.2 low / 12.5 medium / 25.4 at 4x (left whole: L3's record, at the line). All writes are done 375 ms after ready on low (484 medium, 1580 at 4x), 53 ms of main thread in all on low. The bench on a first visit, the walk driven from ready while they are written (`tools/bench-report.mjs "<B>/?bench=20&perf=1&q=<q>&kept=commit" [--throttle=4]`, `shots/wip/v13-L4-bench4-*.txt`): **hitch log 0** on low, medium and low at 4x; the worst frame's JS over the whole run (so also during the writes) 6.8 ms low, 7.0 medium, 18.0 at 4x (base low 7.3). The puts run in idle callbacks between frames, so they cannot land inside a frame's JS. Safari has no `requestIdleCallback`: the drain falls back to `setTimeout(0)`, one put a task (each ≤ ~6 ms at 1x).
4. **`build-check --repeat`** now fails unless every `ctx.kept` record hit and every tape answered all its calls (none missed or skipped), and prints each record's counts. `loading-test` forges the Galleries' tape out of order (call 0 changed, call 100 dropped, a stray entry added at 200, its checksum made again): on the reload `fromTape 124090, missed 2, skipped 2` of 124092, and the Galleries' vertices hash the same (341036160:16695) with the same stats.
5. **Resync:** done (look 8 entries ahead), as above.
6. **Order:** `ctx.kept.preload()` (main.js starts it with the store; each build awaits it after its own import, before `build`) reads and checks this tier's records before any build, so a build's own `kept`/`open` waits only a microtask, never IndexedDB: the order builds register updates and colliders in is import order again, as before L4 (it was never fixed across modules: the builds start as their imports resolve). The preload is 24 ms on a first visit, 159 ms on a repeat on low, overlapping the terrain's and the mountains' build. `build-check --runs=3` cold and `--runs=3 --repeat` on low: 56 of 56 IDENTICAL, colliders included, all 31 records hit with 0 missed in each of the three repeats (`v13-L4-bc2-low-runs3*.txt`); build-check does not see update order.
7. **Docs:** runtime.md ("The bake and the store": `ctx.kept`'s writes, `kept.open`, `preload`, the tape, `putMs`; build-check's colliders and `--repeat`'s new failure), kept.js's comments, modules.md's row for `src/v13/tape.js`, adust's imports above its consts.

## Proof

- `node tools/build-check.mjs http://localhost:8163 --q=<q> [--repeat] --against=<base recording, --runs=3 at 7661a70>`: round two, low `--runs=3` cold and `--runs=3 --repeat`, medium cold and `--repeat`, low `--throttle=4 --repeat`: **56 of 56 IDENTICAL** each, colliders included (5881 on low, 6934 on medium); every repeat printed every record hit and every tape 100% from the tape. Round one, before the review: the same, plus low cold at 4x.
- Render pairs, `tools/views-perf.json`, low and medium, base twice and after (`shots/wip/v13-L4-{base-a,base-b,after}-<q>-*.png`, `v13-L4-pairs.txt`, round one): every station within the base renders' own spread except medium tarn (base/base 48, base-a/after 115, base-b/after 407), the reeds' sway phase (`v13-L4-diff-medium-tarn.png`); the scene is bit-identical by build-check.

## Found on the way

- The lift read `ctx.galleries` synchronously at its build's start; the Galleries now await their tape first, so the lift awaits `ctx.built('galleries')` (found by reading the readers of each converted module's ctx fields).
- `load-probe --profile` crashed (a null browser since L3's browser a run): fixed.

## Checks run

- The whole suite, round one (`SHOT_ANGLE=metal tools/suite.sh 8163`, next merged): 37 tests, 36 ok, 1627 PASS lines; `releases` fails only on "HEAD is not next" and "commits not on origin/next", as on any branch. Round two (`7c95a3b`, next merged, nothing new on it): 37 tests, 36 ok, 1627 PASS lines (loading 28, settings 73, walk 13, perf 28, touch 43, pan 1, lift 37, rocks 32, sw 50; record ok with its own output, 0 PASS lines as on the base), `releases` failing only on the branch checks.
- `loading-test` alone after round two: 28 PASS, 0 FAIL.

## Defaults taken

- Taped, not kept, wherever the cost is the ground's queries: the module's side effects then need no replaying.
- Stop line: structures saved 8 ms; living-canyon (78 ms, surface nets) and region-strandline (68 ms, sdStrip in regionAt, not a terrain query) were left.
- Every `ctx.kept` record (rocks' too) is written after ready in idle slots; L3 wrote them at once.
- `rocks.place` (L3's) is not split: 12.5 ms at 1x on medium, at the review's line.
