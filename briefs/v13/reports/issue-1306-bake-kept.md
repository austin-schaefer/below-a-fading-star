# v13 L3, the bake beside the builds and kept: report (2026-11-15, 00:55 to 03:40 PST; round two from 02:50)

**Target:** seconds to "Go out", cold and repeat, low and medium, 1x and 4x CPU (the phone stand-in), and the title card's longest stall: the bake off a cold load's wall clock, no bake at all on a repeat, every module bit for bit.
**Baseline:** `SHOT_ANGLE=metal nice -n 10 node tools/load-probe.mjs <base> --q=<q> [--throttle=4] --runs=3`, the base tree (`9ca6842`) served from a scratch archive with a `commit.json` (as Netlify serves it) on 8170, interleaved with the result on 8171 (`_site/`, this branch, with a `commit.json`), back to back; load average 2 to 5; medians [min–max].
**Result:**

| ready, ms (cold / repeat) | base | after | longest stall, base / after |
|---|---|---|---|
| low 1x | 5185 [5167–5201] / 4630 [4621–4634] | 4258 [4257–4267] / 3456 [3327–3467] | 1225 / 443 (cold); 323 after the task split |
| medium 1x | 8253 [7997–8476] / 7622 [7600–7675] | 6392 [6329–6667] / 5432 [5399–5669] | 2546 / 780 |
| low 4x | 18680 [18513–19666] / 17566 | 14475 [14186–14905] / 13232 | 4948 / 1526 |
| medium 4x | 28094 [27913–28376] / 27038 | 19362 [19352–19391] / 18183 | 9585 / 2408 |

Low 1x is the last pair (`v13-L3-probe-{base2,after2}-low-1x`); the other rows are the first pass (`v13-L3-probe-{base,after}-*`), before rocks' record was written at once and the mesh modules' task split (both only help). Cold −18% (low) and −23% (medium); repeat −25% and −29%; every gain is many times its spread. The bake is gone from the repeat (the terrain whole 62 ms after it starts on low, 118 on medium, from the store) and from the cold load's stalls (it falls in `imports`/`modules`/`warmup` now, never `terrain`).

**Honesty about 4x:** Chromium's CPU throttle slows the page's main thread, not the worker: the worker's bake took 1.04 s at "4x" and 1.14 s at 1x on low (2.1 s / 2.6 s medium). On a real phone the worker would be ~4x slower too. Serial build sums say how much main-thread work there is to hide it behind: the modules that do not read the mesh are 1.4 s of main work on low and 1.9 s on medium at 1x (5.4 s and 7.1 s at 4x), against the bake's 1.2 s and 2.4 s (4.8 s and 9.2 s on the main thread at 4x). So on low the bake is wholly hidden at both speeds; on medium about 1.9 of 2.4 s (1x) and ~7 of 9 s (a real 4x phone, estimated). `hardwareConcurrency` 2: not measurable here (no way to limit cores); with one core for the page and one for the worker the bake still leaves the main thread, but the GPU process shares them: unproven.

## What waits for the mesh and what does not

26 modules read the mesh's heights or colours (found with `?bakehold=20000`: the geometry's `attributes` throw until baked, so a module that reads them fails loudly): rocks, vegetation, water, fauna, inhabitants2, riverlife2, ruins2, paths, nave, dressing, lamps, livery, locallights, threads, every `region-*`, living-canyon, -glyphs, -still, -walkers. They are `M` in `MODULES` and build after the bake. The other 29 (structures, galleries, plinths, thrones, annals, span, waystation, icefall, lift, house, ...) build beside it. Only the leads (traced first in the worker, 0.23 s) are awaited before the scaffold.

## The store

IndexedDB `fp-kept`, one record a slot (`bake:<segs>`, `kept:<name>:<tier>`), key = the tier and every URL switch but the view-only ones; tree = `commit:<sha>` from `commit.json`, else (`tools/serve.sh`) `src`: the record lists every script its context loaded with a hash of its text and holds only while all still hash the same (refetched once a load); a checksum of all it holds; format number. A put replaces its slot; `prune()` deletes other trees. Any miss, error or 2.5 s timeout computes. The suite relies on Playwright's fresh context per test (an empty store) and, within a test, on the `src` keying (a store written by another tree misses). Broken on purpose in `loading-test` (12 new checks): a new key replaces the old (the old then misses), another tree's record pruned, a changed height (`corrupt`), another format, a record cut short, a changed script hash (`scripts changed`): each refused and baked again; `?kept=0`, `?worker=0&kept=0`.

## ctx.kept: rocks

`ctx.kept('rocks.place', place)`: the placements (draws, clearances, tors). Serial on low: rocks 315 ms computed, 45 ms from the store (get 8.8 ms). `build-check --repeat` (a reload built from the store): IDENTICAL. Worth converting next (serial low 1x, estimates of what is computed rather than built): vegetation 456 ms (placement and cover; `coverAt`'s stateful tint means keeping its outputs, not re-calling it; ~60%), galleries 274 (95% heightAt: nearly all), plinths 180 (the feet's field: most), structures 281 (geometry: keeping attribute arrays, larger records), thrones 179, region-adust 149. Together perhaps 0.9 s on low, 3.5 s at 4x, on a repeat only.

## The races

- region-bletting: awaits `ctx.built('vegetation')` (no timeout). The base at 6x built it without 332 windfalls (`v13-L3-bc-base-low-6x.txt`); this branch at 4x and 6x: IDENTICAL.
- the cloak: placed once every module has built, where the base moved it 2 s into the walk (-98.16, 2.26, -128.85 in both). The only MOVED in every build-check below, by design.
- found and ended the same way (polls of 20–60 s on another module's output): v7 small (Lynchets' walls), glyphs and the Accrescent (the erratics; its cleared cobbles moved at 4x and 6x), the Stylite (tors), the workers (pavements, shingle skin, boulders), v8 threads, house, twk, shafts. The Thurifer's first turn is taken again after all builds (it read the cloak mid-load).
- found by the reordering: the Parhelion's canvas atlas, rastered on the GPU beside other modules' canvases, differed by ~26 edge pixels in 2 of 5 loads; a 1-pixel readback at the end of its paint: 7 of 7 equal to the base.
- left (runtime, self-correcting): gutterbats' exits (redone at each pour), rooks' and crows' perches (retried in updates), beetles (`ctx.hypogeum`), twk's Thurifer, the icefall's anchor thread.

## Round two (the review)

- **The blocker, a stale record:** the tree is now the running code's own `X-Fp-Commit` (force-cache fetches of `kept.js` and `bake.js`: the copy that ran, from the HTTP cache or `sw.js`'s bound release), and must equal `commit.json`'s; off localhost any absence or disagreement turns the store off for the load (no read, write or prune). Records are keyed `<tree>|<slot>`. loading-test, on this tree served with stamps (`sw-site`): a record made under commit A is not read under B and is pruned; a load whose `commit.json` (C) disagrees with its code's stamp (B) reads, writes and prunes nothing.
- The worker URL has no query (the page's goes in its first message); started at once and raced with the store; its height params' key checked against the page's; its fetched files handed to `sw.js`'s fill (`window.__fp_fill_extra`). `tools/bake-sw-check.mjs` (a stamped site, `sw.js` active, four loads): Chromium and WebKit 5/5 PASS: first visit worker+kept, controlled repeats from the store with 0 `src/` requests, a controlled `?kept=0` repeat with a query baked in the worker (not the fallback) with every file from the service worker. Firefox 4/5: its controlled repeat fetched `v8/strips.js` and `v8/roads/crossings.js` from the network (the first-visit fill missed them; the next visit has them): `sw.js`'s fill in Firefox, for L1.
- `prune()` by keys alone: 4.4 ms for two stale 12 MB records (medium), no long task after ready from it. `put` reports its own timeout; `onversionchange` closes; fallback timers cleared; resource timing buffer 2000.
- The Thurifer awaits `ctx.cloakPlaced`. A module that fails is on the title card's error line and in `extra.failed`; loading-test asserts none failed, also with `?bakehold=3000`. `?bakehold=20000` swept on low, medium and high: no failure.
- runtime.md: a short list; `purebake`, `--repeat`, `--throttle`, `bake-sw-check` named as outside the suite, with when to run them.

**The probe once more** (round two's tree, both served as Netlify serves them by `tools/sw-site.mjs`, `--params=kept=commit`, back to back, 03:20–03:39, load 2.6–3.2), ready ms cold / repeat, longest stall cold:

| | base | after |
|---|---|---|
| low | 5173 [5160–5382] / 4749 [4641–4765], stall 1225 | 4267 [4226–4326] / 3473 [3349–3492], stall 322 |
| medium | 7499 [7491–7812] / 6975 [6942–7003], stall 2353 | 5638 [5608–5641] / 4624 [4618–4631], stall 501 |

Cold −18% / −25%, repeat −27% / −34%. The longest stall now falls in the warm-up or one module's build step (vegetation's, structures', galleries': ~300 ms on low, ~500 on medium), never the terrain.

## Checks

- `node tools/height-check.mjs check <rec>` against a recording at `9ca6842`: all PASS (1,427,272 points × 58, 2 bakes). New `purebake` (three refused, no location, nothing sampled first): every position and baked attribute, low and medium, 0 differ (14 PASS).
- `node tools/build-check.mjs <B> --against=<base rec>`: low and medium, 1x (`--runs=3`, no unstable entry), 4x, 6x (low), and `--repeat`: 54 of 55 IDENTICAL, the one MOVED the cloak.
- Firefox and WebKit: a cold load bakes in the module worker and keeps; the reload takes the bake and rocks from the store.
- `loading-test`: 26 PASS.
- Render pairs at `tools/views-perf.json`, low and medium (`shots/wip/v13-L3-{base-a,base-b,after}-<q>-*.png`, `v13-L3-pairs.txt`): every station within two base renders' spread except low wrongcolour (98 vs 58 px; the diff is the fall's spray and water) and medium tarn (139 vs 46; after against the second base render: 11).
- The whole suite, `SHOT_ANGLE=metal tools/suite.sh 8163`, next merged (L1's sw.js round three included): 37 tests, 36 ok, 1596 PASS lines; `releases` fails only on "HEAD is not next" and "commits not on origin/next", as on any branch. After a last merge of `next` (perf.js, shadows.js, far.js from another brief): `ONLY=loading,perf,pan,walk,settings,touch,record`: 7 of 7 ok (settings 73, walk 13, loading 26, perf 28, touch 43, pan 1, record 16 ok lines).

## Defaults taken

- Local tree key: the scripts' text hashes (not "no caching"), so the suite exercises the store.
- Writes: the worker's at once, a module's at once, prune after ready.
- `load-probe` prints the bake's rows; `build-check` gains `--repeat` and `--throttle`.
