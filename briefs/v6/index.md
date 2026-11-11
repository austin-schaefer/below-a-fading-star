# v6, nothing pops: the briefs

## The current plan

v6 runs slim: three batches, then release. The plan, its state and what is deferred are in `plans/wilderness-v6.md` "Status"; the rest of this file is the full dispatch catalogue it draws on.

Written 2026-11-08 from `plans/wilderness-v6.md` (the survey, 35 pictures in `shots/wip/v6-00-survey-*`, targets, six stages, rules, open questions), Austin's instruction ("i want to share with folks but currently performance is too poor to share"; open calls at the defaults), `plans/wilderness-v3.md`, the `wilderness` skill, the laptop samples in `shots/perf/laptop-wood-*.json`, and the code at `aaa42e1` (deploy worktree) plus `fix-dpr-steps` at `0a5a739`. Ordered so what Austin feels most on his laptop lands first: the post chain (bloom 6.5 + grade 3.1 + output 3.2 = 12.8 of 26.7 ms GPU), the shadow pass during turns, the LOD and chunk pops, then the rest.

## What is already done and not re-briefed

- **Stage 5, nearly all:** uploads and compiles behind the title card (`src/warmup.js`, the precompile, every caster's depth variant), the late `basic` pair (the fish rings), `pan-test`'s second station (−195, 128). Left: the one dt (→ v6-07). CI does not run browser tests here, so "the counts in CI" becomes pop-test's `uploads` group in the orchestrator's per-batch suite.
- **Stage 4, the pixel-ratio policy:** `fix-dpr-steps` `0a5a739` (integrated GPUs start at 1.0, no step during motion, 20 s holds, stalls left out, the step on a steady frame after a redraw). **Also landed in it:** the shadow map's turning cadence yields to the frame budget. Left: the step without reallocation (→ v6-08), the box, the slots, AA.
- **`?record=<s>`** merged (15:10): the laptop measurement is one URL.
- Before v6: the tree LOD turning fix, the stair hop, the wood hitch's compiles.

## The briefs, in dispatch order

| # | Brief | Worktree / branch | Model | Owns (catalogue) | Main files | Bar? |
|---|---|---|---|---|---|---|
| v6-01 | `brief-v6-01-harness.md` | `v6-harness` | Sonnet | stage 1: counters, `pop-test`, `pair-diff`, alloc burst window, before numbers | `src/perf.js`, one line in each counted module, `tools/pop-test.mjs`, `tools/pair-diff.mjs`, `tools/alloc-audit.mjs` | measures it |
| v6-02 | `brief-v6-02-finish.md` | `v6-finish` | Opus | the post chain's cost (not in the catalogue: from the laptop sample); `src/fade.js` for batch 3 | `src/post.js`, `src/perf.js` (labels), `src/fade.js` (new) | **yes** |
| v6-03 | `brief-v6-03-shadow.md` | `v6-shadow` | Opus | 12 shadow box and cadence (turn rule, edge fade, clock, creature shadows) | `src/shadows.js`, `src/main.js` `frame()` 314–322 | **yes** |
| v6-04 | `brief-v6-04-trees.md` | `v6-trees` | Opus | 1 tree LOD, 4 fungi | `src/vegetation/trees.js`, `batch.js`, `tools/tree-lod-test.mjs` | **yes** |
| v6-05 | `brief-v6-05-ground.md` | `v6-ground` | Opus | 2 plant chunks, 3 rocks, 8, 9, 21 (bursts) | `src/vegetation/plants.js`, `src/rocks.js` | **yes** |
| v6-06 | `brief-v6-06-fauna.md` | `v6-fauna` | Opus | 5 far 5 Hz motion, 6 fauna hides | `src/fauna/*`, `src/main.js` `runUpdates` | polish |
| v6-07 | `brief-v6-07-slots.md` | `v6-slots` | Sonnet | 11 light slots, 18 dt | `src/lights.js`, `src/controls.js`, `src/main.js` line 308 | polish |
| v6-08 | `brief-v6-08-image.md` | `v6-image` | Opus | 13 AA, 14 the step's reallocation, 16 bloom shimmer, 17 banding | `src/post.js`, `src/tier.js`, `src/perf.js` | polish |
| v6-09 | `brief-v6-09-table.md` | `v6-table` | Sonnet | stage 6 table and Austin's pairs | `plans/wilderness-v6.md` only | reports it |

How the six stages map: stage 1 → v6-01; stage 2 → v6-04 (trees, fungi, silhouettes), v6-05 (plants, rocks), v6-06 (fauna); stage 3 → v6-05 (packs, sort, budget), v6-06 (frustum hide), v6-01 (burst window); stage 4 → v6-03 (box), v6-07 (slots), v6-08 (pixel-ratio step, AA); stage 5 → done but v6-07 (dt); stage 6 → v6-09. v6-02 is new: the laptop sample showed the post chain as half the GPU, which no stage planned.

## Batches (four agents at most; the post chain alone)

0. **Before anything:** `fix-dpr-steps` merged with both commits. Austin's clean baseline (below), taken in the 30-minute hold after the v5 notification, with no agent browser on his GPU.
1. **Batch 1: v6-01 alone.** Every later brief reads its counters, sequences and `pair-diff`; it touches one line in a dozen modules.
2. **Batch 2: v6-02 alone** (`src/post.js`, `src/perf.js`, the post chain). It also writes `src/fade.js`, which batch 3's three agents all need, so they can run at once.
3. **Batch 3: v6-03, v6-04, v6-05** (three Opus). Disjoint files apart from `src/main.js` (v6-03 only, the lead lines) and pop-test rows. **The share-ready bar should be met here**: the orchestrator flips the `pacing` row to gated, asks Austin for the laptop runs, and if the bar holds, ships what has landed to `main` early so he can share it.
4. **Batch 4: v6-06, v6-07** (Opus + Sonnet). Both touch `src/main.js`: `runUpdates` (v6-06) and the dt line in `frame()` (v6-07), separate hunks.
5. **Batch 5: v6-08 alone** (the post chain again: `post.js`, `tier.js`, `perf.js`).
6. **v6-09** (read-only, no browser) after the last laptop run; then curate, `RELEASES.md`, release **v6**.

Dependencies: everything after v6-01 needs `pop-test`/`pair-diff`; v6-03, v6-04, v6-05, v6-06 need `fade.js` (v6-02); v6-03 needs `fix-dpr-steps`' cadence commit; v6-06 needs v6-03 (creature shadows are faded in `shadows.js`, not by v6-06); v6-08 needs v6-02 (the finish pass it extends) and `fix-dpr-steps`; v6-09 needs all and Austin's files.

## Shared-file hot spots

- `src/post.js`: v6-02, then v6-08; never in a batch with anyone else.
- `src/perf.js`: v6-01 (counters, recorder), v6-02 (GPU labels, `post` sum), v6-08 (none expected; labels only if FXAA needs one). One owner per batch.
- `src/main.js`: v6-03 (`frame()` 314–322, the shadow lead), v6-06 (`runUpdates` 254–267), v6-07 (`frame()` 308, the dt). The post chain's call sites stay v6-02/v6-08's.
- `src/shadows.js`: v6-01 (one counter line), v6-03 (everything). v6-06 must not edit it.
- `src/fade.js`: written by v6-02; v6-04 and v6-05 may each add a missing helper in a separate commit in the same batch: on merge, keep both, then run pop-test `--only=fade`.
- `tools/pop-test.mjs`: every brief flips its own rows to `gate: true` and may add checks in its group; keep-both merges, then run `pop-test --only=uploads` once to see the table parses.
- Shader program keys: v6-03's shadow-chunk patch changes every lit program; v6-04, v6-05, v6-06 add fade variants. Each runs pop-test `uploads` and `pan-test` (zero compiles while turning); the orchestrator runs both after merging the batch, since two agents' variants can collide in `customProgramCacheKey`.
- The "The v6 switches" group in `.agents/skills/wilderness/runtime.md`'s URL params (started by v6-01, appended by every brief): keep-both merges doubled 18 segments of the URL-params line once already; resolve by hand and grep for duplicates after each merge.
- `plans/wilderness-v6.md` `## Results` (one subsection per brief, appended in brief order) and the catalogue's `[done in v6]` marks.
- `src/vegetation/trees.js`: v6-01 (two counter lines), v6-04 (everything, fungi included).
- `src/vegetation/plants.js`, `src/rocks.js`: v6-01 (counter lines), v6-05.
- `src/tier.js`: `fix-dpr-steps`, v6-01 (one line), v6-08.
- `tools/tree-lod-test.mjs` placement digest: v6-04 and v6-05 must both leave it unchanged.

## The share-ready bar

On Austin's laptop, Chrome, medium tier, 1365×1117 at pixel ratio 1.0, no agent browser on the GPU:

1. **Bench** (`?q=medium&bench=1&adapt=1`): 1% low ≤ 33 ms (medium's budget), 0 pixel-ratio steps, frames over 2× the median ≤ 1 per minute.
2. **Wood pan** (`?record=25` at (−190, 165)): p99 ≤ 33 ms, worst frame ≤ 50 ms, 0 pixel-ratio steps, shadow redraws while turning ≤ 4 per second.
3. **GPU standing at (−190, 165)**: ≤ 21 ms a frame (today 26.7), of which the post chain ≤ 6.5 ms (today 12.8).
4. **Headless, gated in pop-test**: 0 programs, geometries and first-sight textures created after the title card on the bench, the wood route and a 360° pan; every switch inside 60 m (the tree near switch at 24–36 m, grass at 60 m, reeds at 50 m) with its largest consecutive-frame change ≤ 2× the baseline.

Needed to reach it: **v6-01** (measures 4), **v6-02** (3, and most of 1 and 2), **v6-03** (2's redraws and lows), **v6-04** (4's trees), **v6-05** (4's grass and reeds), on top of `fix-dpr-steps` (the steps in 1 and 2) and the warm-up (4's uploads), both landed or landing. Polish, after the bar: v6-06 (far creatures, fauna fades), v6-07 (slots, dt), v6-08 (AA, the smooth step, bloom shimmer, banding), v6-09 (the table). If the bar is missed after batch 3, the gap's line says where: post (3), shadow (2), or something new, and v6-09's method (the record's worst frames with their samples) names it before anyone guesses.

## Open questions decided at the defaults (Austin can reverse each)

| Question | Default taken | Brief | Reverse with |
|---|---|---|---|
| Antialiasing (Q1) | FXAA folded into the finish pass (no new pass or target), medium and high; off at low. SMAA would cost about what v6-02 saves; MSAA + alpha-to-coverage about 4× the scene target's memory. | v6-08 | `?aa=off` |
| Fades or pushed-out switches (Q2) | A 0.4 s dithered cross-fade at every tree switch inside 120 m (the giants' 158 m far switch stays hard); plants over an 8 m band; rocks over their reach's last 15%; no switch distance moved, so no triangles added at rest. | v6-04, v6-05 | `?xfade=0`, `?plantfade=0`, `?rockfade=0` |
| The shadow box (Q3) | Ahead of you as now (same size, reach, texels), its lead moving in 45° steps with 10° hysteresis, the far edge faded over 15 m; not centred (that needs 270 m for today's reach: 42% coarser texels or a 4096² map). The "slides, never jumps" target is met by the fade. | v6-03 | `?shadowlead=v3`, `?shadowfade=0` |
| The pixel ratio (Q4) | Answered by the laptop pan (it stepped four times): policy fixed in `fix-dpr-steps`; the step itself becomes a 1 s viewport scale with no reallocation. | v6-08 | `?dprsmooth=0` |
| The stall's mouse look (stage 5's "capped") | Carried over the next frames at the steady look rate, not capped, so no hand travel is lost and nothing jumps. | v6-07 | `?dt=v3` |
| Bloom's mips on integrated GPUs | Not lowered unless the finish pass and the low-res rays miss the post target; then four mips or `bloomres` 0.375 inside a 1% tolerance, flagged for Austin's eye. | v6-02 | `?bloommips=5`, `?bloomres=0.5` |

Each default is written into the commit message that carries it.

## What needs Austin's laptop

Before batch 1 (the clean baseline, in the post-v5 hold) and after batches 2, 3, 4 and 5 (batch 1 changes no cost or picture, so it needs none), with no agent rendering. The one line to send him:

> Two runs on the laptop, about 2 minutes, nothing else open: (1) http://localhost:8123/?q=medium&bench=1&adapt=1&machine=laptop — hands off for the 45 s flight, then Download JSON; (2) http://localhost:8123/?q=medium&record=25&pos=-190,165&yaw=0&machine=laptop — Go out, stand still 3 s, then turn slowly left (about one full turn every 5 s) until the panel shows, then Download JSON. Send both files.

The orchestrator holds every rendering agent from the moment it asks until both files arrive, saves them in `shots/perf/` as `laptop-v6-<batch>-{bench,pan}.json`, and reads from them the four bar lines above: the bench's 1% low, steps and over-2× count; the pan's p99, worst, steps and `shadowRedraws` per second while turning; the first 3 s of the pan's samples for the standing GPU (`gpu.total`, `gpu.shadow`, `gpu.post`, or bloom + grade + output before v6-02).
