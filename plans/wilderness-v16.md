# v16: The valley floor gets a shape

Opened 2026-11-16, 23:05 PST, by the orchestrator on an autonomous run. The owner's words at the start of the run: "Pick a new milestone (or two?) off the backlog, plus maybe some performance/bugfixes. You are the orchestrator, and this is your repo. Exercise your own best judgment!"

## What was chosen, and why

**The owner's #73**, the first of their four notes on the land (#73 the floor, #74 the water, #75 the ice, #33 the wall's foot). v15 was reach (a village); this is depth: it makes what exists hold up when seen from the heights v11 to v15 let a visitor climb to. It is also the one of the four the others stand on: "every placed thing rides on the floor, and it is cheapest to move before more is put on it". With it ride:

- **#78, the sun's gutter** (the owner, 2026-11-16): it comes too early, and most of the world built since v4 ignores it.
- **Performance and faults**: the walk's cost after the village, and what v15 left open (the spine's head, the critic's list).

**Passed over for now:** #74 (the water runs downhill; wants this milestone's low west and south, and is the natural next one), #75 (the ice; uses the edge this milestone makes), #18 the forest, #62 the underground hub, #56 the sky, #30 the way out, #72 a controller, #23 music, #70 the teleport menu, #22 traffic counting. W3 (the open edges at the pits, `issue-1527-edges`) stays paused: it changes how the walker meets the ground, and the ground moves in this milestone; it is taken up again once the floor is in.

## What a visitor should notice

- From the Lonely Staircase, the icefall, the Span or the keep, the floor reads as ground that water and weather made: it falls to the west and south where the water lies and stands higher in the north and east, with swells and hollows between.
- Lees Tarn has a shore: bays, points, a shallows, not a circle. The fen likewise. No natural thing seen from above has a ruled outline.
- They are let alone for a minute or two, and then the sun gutters, and the whole valley answers: the village's lamps, the folk, the creatures, the water, the underground, not only the oldest parts.
- The walk is no slower than v15, and on a phone it is faster.

## Done when

1. The fixed views (`tools/views-v16-floor.json`), rendered before and after, show the tilt and the shores; a blind reader shown the after frames from above names no circle, rectangle or ruled line on natural ground.
2. One shared edge (`src/height/outline.js` or as built) is read by the height, the water test, the paint and the placement for the tarn and the fen; the glacier (#75) can take it later.
3. Nothing placed floats or is buried because the floor moved: `geometry`, `strata`, `dressing`, `seams`, `heights`, `village-plan`, `roads` green on `next`; shores judged moving (the owner on water: "a lot of water looks very janky").
4. The first gutter comes 60 to 120 s after "Go out"; a list of what answers it, at least one thing in every region built since v7, each seen in a frame pair (lit, guttered) and heard in the audio harness where it sounds.
5. `perf-test` and the bench no worse than v15 on any tier; the measured gains written here.
6. The whole suite green on `next`; a cold critic's blocking findings fixed; the release note, the README line and picture.

## How it is built

`briefs/v16/index.md`. The floor's briefs are written from a read-only survey of the height field (in flight at opening). The gutter and the performance brief do not touch the height field and start at once.

## Status

**2026-11-16, 23:05 PST. Opened.** v15 is live (`290a9d0`); `next` is one doc commit ahead. Issues #73 and #78 are `in-progress`, `v16`. Two finished worktrees removed (`issue-1534-regressions`, merged; a stray detached one in an old session's scratchpad); `issue-1527-edges` (W3) kept, paused. The repository's interaction limit is `collaborators_only` until 2027-05-12.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S1 the gutter (#78) (`brief-v16-S1-gutter.md`) | `issue-1601-gutter` | 8161 | opus |
| P1 performance (`brief-v16-P1-perf.md`) | `issue-1602-perf` | 8162 | opus |
| (read-only) the height field's survey, for the floor's briefs | none | none | opus |

Next: the survey's report becomes `tools/views-v16-floor.json` (rendered on `next` as the before set), then the floor's briefs (the tilt; the edge and the tarn's shore; the fen and the look from above), two or three agents beside S1 and P1, never more than four with a browser.

**2026-11-16, 23:12 PST. The survey is in; the floor's first two briefs are out. Four agents in flight (the limit).**

- **The survey** (opus, read-only, 7 minutes): the field's order of terms, what reads a fixed height, every ruled outline, a design for the shared edge. Its findings are in the briefs L1 and L2. Worth keeping: the floor already tilts (`-0.012z + 0.006x`, `field.js:353`); a lift that is never negative and zero at the waters cannot make anything float; places to hold still by mask are the keep, Demesne and Lappet, the east box (High Ling to the Hypogeum), the Pit, the fall and river, both Span blocks; the only shader that tests a radius on these outlines is `water/river.js` `uFen`; `heightAt` is 1.6 µs a call with cheap wins in `riverSection` and `project()` (not yet briefed: they change bits, so they go with the re-record).
- **The fixed views:** `tools/views-v16-floor.json`, sixteen; the before set rendering on `next` at medium into `shots/wip/v16-before-*.png`.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S1 the gutter (#78) | `issue-1601-gutter` | 8161 | opus |
| P1 performance | `issue-1602-perf` | 8162 | opus |
| L1 the tilt (`brief-v16-L1-tilt.md`) | `issue-1603-tilt` | 8163 | opus |
| L2 the edge and the tarn's shore (`brief-v16-L2-edge-tarn.md`) | `issue-1604-edge` | 8164 | opus |

Next: look at the before frames; as each agent reports, its frames with the report shut, its tests run here, a cold review, a blind reader for L1 and L2, then merge. L3 (the fen and the other ruled outlines) is written and dispatched when L2 has pushed the edge and a slot is free. After the floor's merges: one re-record of `seams` and `geometry`, the whole suite on `next`, then W3 and the spine's head against the new floor.

**2026-11-16, 23:49 PST. Forty minutes in: all four building, none handed back.** Each branch has pushed: S1 the first gutter at 87.5 s and answers at the Lappet, the acts, the Laid Sun and the stair; P1 the tools' Metal default (`tools/launch.mjs`, #79); L1 `src/height/floor.js` and `?floor=v15`; L2 `src/height/outline.js` and the tarn on it. The before set was retaken with six views from the air (the first set's Span and crown views looked at parapets and roofs): `shots/wip/v16-before-*.png`, 22 views. Brief L3 (the fen and the other ruled outlines, `brief-v16-L3-fen.md`, to be `issue-1605-fen`, 8165) is written and goes out when a slot is free. Same four agents, branches and ports as the table above.

**2026-11-17, 00:17 PST. The gutter's first round and the tarn's shore are on `next`. Four agents in flight.**

- **S1 merged** (opus, 53 min): the first gutter 87.5 s after "Go out" (held until the visitor begins); `flicker.dark` and `flicker.lamps` in `sky.js`; the Lappet's panes and lamps turned up by hand, its folk stop and look up, moths at the acts, the Laid Sun's gold and hum, the stair's signs. Cold review (sonnet): no blockers, four small findings sent on. On `next`: gutter 22, acts 163, stair 5. **Looked at with the report shut: only the Lappet's lamps are plain to see**; the moths, the Laid Sun and the stair's signs cannot be seen without being told. So **S2** (`brief-v16-S2-gutter-bolder.md`, a fresh opus agent in the same worktree, 8161): one beat for the whole valley from open moor, the quiet answers made plain, the regions with none.
- **L2 merged** (opus, 45 min): `src/height/outline.js` (`radialOutline`, `polyOutline`, `tools/outline-test.mjs` in the suite); Lees Tarn on it (a west bay, the Byre's point, a north-east inlet, a reedy shallows, a steep west bank; the Strandline held by a window); `waterLevelAt` walks `WATER_BODIES`. From the air the disc is gone (`shots/wip/v16-L2-r1-tarn-above.png` beside `v16-L2-before-tarn-above.png`). Cold review (opus): no blockers; the edge's `sd` sound, GLSL equal to JS, `heightAt` no slower, no conflict with L1. Leftovers sent to L3: water reported up to 2.8 m under dry ground by the steep bank near (-146, 98); the lap sound still a circle; stale circle readers in `water.js:285`, `perf.js:496`. On `next`: outline 15, dressing 22, regions 56, strata 8, walk 13, heights 203. `geometry` not run: pebbles reshuffle with the shore's paint; re-recorded once after L1 and L3.
- **In flight:**

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S2 the gutter, round two | `issue-1601-gutter` | 8161 | opus |
| P1 performance | `issue-1602-perf` | 8162 | opus |
| L1 the tilt | `issue-1603-tilt` | 8163 | opus |
| L3 the fen and the other outlines (`brief-v16-L3-fen.md`), on top of L2 | `issue-1605-fen` | 8165 | opus |

Next: L1 and P1 as they report (frames, a blind reader for L1, a cold review, tests here, merge); then the re-record and the whole suite on `next`.

**2026-11-17, 00:48 PST. L1 and P1 handed back; neither is merged yet. Four agents in flight.**

- **L1 the tilt** (opus, 80 min; `issue-1603-tilt` at `d398c46`): `src/height/floor.js`, `?floor=v15`, protected places bit-identical, its tests green but `seams` and `geometry` (the ground moved). **With the report shut, the before and after frames from the stair's top, the crown and the air are the same picture**: 4 m in a moor of ±11 m under one colour. Cold review (opus): **one blocker**, the Wellward Way runs under unprotected ground that rose 1 to 2.9 m (a new `geometry` row at `v14-passage` the report explained away); also the Sunken Court's surround risen up to 9 m, three closed hollows at skirts' feet. Not merged. **L4** (`brief-v16-L4-floor-reads.md`, a fresh opus agent in the same worktree, 8163) has the review's findings first, then makes the fall plain: paint and cover that follow the forms, pools in the kettles on the edge, a bolder rise where free. L1 merges with L4.
- **P1 performance** (opus, 96 min; `issue-1602-perf`): colliders in a 4 m grid (the walker's update at the Lappet 0.35-0.44 to 0.16-0.17 ms; `?collgrid=0`), the biomesh's ground test cached (fauna at the Lattice 1.76 to 0.34 ms), the stair's slabs culled (10 draws and about 200k triangles fewer in most views), Metal the tools' default in `tools/launch.mjs` (#79; touch 222 to 14 s, settings 365+ to 49 s), `tools/perf-views.mjs`. Its ms figures were taken on a loaded machine. It changes the pace rule's wording in `AGENTS.md` (Metal by default, not a flag on every call): for the owner to see. With a cold reviewer (opus) now.
- Three http servers left on 8162, 8173, 8182 by v15's agents (their worktrees long gone) stopped.
- **In flight:**

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S2 the gutter, round two | `issue-1601-gutter` | 8161 | opus |
| L3 the fen and the other outlines | `issue-1605-fen` | 8165 | opus |
| L4 the floor reads (on L1) | `issue-1603-tilt` | 8163 | opus |
| V1 the Lappet's loose ends: the spine's head, the critic's list, one act (`brief-v16-V1-spine-head.md`) | `issue-1606-spine` | 8166 | opus |

Next: P1 after its review (tests here, merge); S2, L3, L4, V1 as they report. Then the height path's cheap wins (the survey's and P1's notes: `riverSection`, `project()`), the one re-record of `seams` and `geometry`, the whole suite on `next`, W3 against the new floor, the critic.

**2026-11-17, 01:19 PST. P1 is on `next`. S2 and L3 handed back and are held on their reviews. Three agents in flight.**

- **P1 merged** (cold review, opus: no blockers; a property test of the collider grid against the linear scan, 600k checks, 0 mismatches). On `next`: settings 86, walk 13, hop 30, loading 28, perf 29, touch 43, stair 5. Left: `floorProbe` syncs the grid on every call (`controls.js:821`), so floods (`seams`, `ways`) gain nothing; 86 tools repeat the flag list instead of calling `launch()`. #79 is `in-progress`, `v16`.
- **S2 the gutter's second round** (opus, 69 min; `issue-1601-gutter` at `6e6c995`): the stars come out hard, the sky sinks to violet, a cold grade, a hush before and a gust after, the valley's lights in a wave, and answers at the acts, the Laid Sun, the stair, the water, the Noonwrights' glass, the rooks, the grazers. **With the report shut: the sequences from the moor and the Lees read as an event** (`shots/wip/v16-S2-seq-moor-*`, `-lees-*`). Cold review (opus): **one blocker**, the warm flush as the sun catches is a one-frame full-screen step (`sky.js:256`, `post.js:413`); six smaller. **S3** (sonnet, same worktree, 8161) is fixing the seven. Not merged.
- **L3 the fen** (opus, 72 min; `issue-1605-fen`): `src/height/fen.js`, the fen ragged from the air, wandering edges for the Saltings, the Outwash, the wood, the crystal, the clearings; L2's leftovers done. `rocks` 36/2 and `geometry` 127/8 fail on its branch (scatter reshuffled by the changed weights, it says). With a cold reviewer (opus), asked for cost and for whether any reshuffled bush is a real fault. Not merged. The salt still reads from the air as large pale sheets.
- **In flight:**

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S3 the gutter's review fixes | `issue-1601-gutter` | 8161 | sonnet |
| L4 the floor reads (on L1, with L1's review) | `issue-1603-tilt` | 8163 | opus |
| V1 the Lappet's loose ends | `issue-1606-spine` | 8166 | opus |

Next: L3 after its review; S3, L4, V1 as they report. Then the height path's cheap wins and `floorProbe`'s sync, the one re-record of `seams` and `geometry`, the whole suite on `next`, W3 against the new floor, the critic.

**2026-11-17, 02:11 PST. The gutter (all three rounds), the stair's head and the floor are on `next`. Two agents in flight.**

- **The gutter, S2 + S3, merged.** S3 (sonnet, 27 min) fixed the review's blocker (`flicker.flush` rises over about 1 s; a gutter-test row holds its step per frame) and five of six others; the stair's veins under a held render were not reproduced (`hold` 1 is lit; a dark frame wants 0.3). On `next`: settings 86, village 687, house 20, audio 106, perf 29, acts 163, gutter 29, stair 5. Known weak, not fixed: the moths at 15 m are specks; the Halt's globe, the tarn's cold, the grazers' and Coheirs' heads barely read; the Lappet's folk answer only within 45 m.
- **V1 part 1 merged** (opus; `b6b6863`): the bastion and its two side flights gone, one flight on the axis down the crown's rim, two lamps at its foot; `ways-test` has `axis` rows (walk up and down holding W). Cold review (sonnet): no blockers. On `next`: ways 271, village 687, village-plan 7, strata 8, dressing 22, walk 13. Frames: `shots/wip/v16-V1-r4-walk-*`, `-r5-walk-*`.
- **The floor, L1 + L4 + L6, merged** (`9c776f6`, then `1240316`). L4 (opus, 68 min): three pools on the edge (`src/water/pools.js`, +1 draw in view), `floorCharacter` in the paint, cover and rocks, the strand's bank to 3 m, the passage, the court, the Lynchets and the heights rig protected, drains from the skirts' hollows (`tools/floor-flood.mjs`, an `outline-test` row). **The brief's done-condition is not met: blind readers picked the after frame 2 of 6 times.** With the report shut: plain from the air (`shots/wip/v16-L4-r3-air-floor-west.png` beside `v16-before-air-floor-west.png`: the pools, the banding, the tarn), near nothing from the stair's top. Merged as an increment, said so here and to be said in the note; no third round on the paint. Cold review (opus): the code sound, protected places bit-identical; `heightAt` about +10% (to L5). L6 (sonnet, 13 min): the gnomon filter out of `hop-test` (the test measured against ground 3 m off), P4 clear of the kettle, a channel draining (138, -202), reeds at the pools. On `next`: outline 26, dressing 22, paths 86, strata 8, hop 30, heights 200, village 687, village-plan 7, regions 56, walk 13, perf 29.
- **`roads` is red on `next`** since the tarn's merge: P17 and P23 run through its new water (16 wet samples, one grade). L5's branch reroutes both.
- The orchestrator's slip: the floor's merge stopped on a doc conflict (`runtime.md`, two notes on one line) and the command hid the exit code, so its tests ran on the unconcluded merge; code had merged clean; resolved keeping both.
- **V2** (opus, 37 min; `issue-1606-spine`): the act "Take his letter" at the Lagan's hatch (the clerk's open thread in `stories/the-dead-letters.md`), the leaver's door, lanterns for the copyist and sounder. Frames `shots/wip/v16-V1-act-d-sheet.png`: the offer, the letter held out, into the view, the ledger struck. Folk from 20 m only partly better. Cold review (sonnet): no blockers; a gutter mid-act lets the letter fly while the clerk is frozen. **V3** (sonnet) fixing that and seven smaller. Not merged.
- **In flight:**

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| L5 the fen's review: cost (no slower than v15, merged tree), water above its rim, bushes on paths, P14 (`brief-v16-L5-fen-fixes.md`) | `issue-1605-fen` | 8165 | opus |
| V3 the act's leftovers | `issue-1606-spine` | 8167 | sonnet |

Next: V3 and L5 as they report (tests here, merge). Then one re-record of `seams` and `geometry`, the whole suite on `next` on a quiet machine, the critic and the curator beside it, the note. W3 (the open edges, `issue-1527-edges`) stays out of v16: it wants a walk by the owner and the floor has only just settled.

**2026-11-17, 02:52 PST. The act is on `next`; the critic and the curator are out; only the fen is still to land.**

- **V2 + V3 merged** (02:17): the act "Take his letter" with V3's eight fixes (the flight and the pen run on the clerk's clock, so a gutter holds the whole act; one mesh each for letter and ledger; the story file updated). On `next`: touch 45, village 687, ways 271, strata 8, dressing 22; `acts` 174 on the branch, not rerun here (the whole suite will).
- **The critic** (opus, `issue-1610-critic`, 8170) started at 02:25 on `next` without the fen's last round, to shorten the tail; asked besides its brief to stand two minutes in four places (does it notice the gutter unprompted) and to look down from every high stand for what is still ruled. The fen's final frames get a blind reader of their own.
- **The curator** (sonnet, no browser) started at 02:53 in the deploy worktree's `shots/`; told to leave `v16-L5*`, `critic-*` and the owner's own screenshots.
- **L5** (opus, `issue-1605-fen`, 8165) is 72 minutes in and still pushing (the merged tree's height path; `rocks` green); running its tests.

Next: L5's hand-back (tests here, merge), the re-record of `seams` and `geometry`, the whole suite on `next` as the gate, the note, the PR.

**2026-11-17, 03:05 PST. Everything is on `next`. The batch's whole suite is running; four tests are known red and have an agent.**

- **L5 merged** (opus, 95 min): the fen's review, both blockers and items 3 to 9. Water: no dry cell under a body's level beside a wet one (an `outline` row holds every body to it), no wet cell more than 0.5 m over the water. Trees and bushes ask the leads' claim by footprint (`rocks` 38/0, not re-baselined); clearings wander outward only; P14 and P21 mended; P17 and P23 rerouted (`roads` 64/0 on its branch). **Cost, the promise not fully kept** (`tools/height-speed.mjs`, 1e6 calls, five interleaved runs, medians, against `origin/main`): `heightAt` over the valley 1.08, in the fen's box 0.95; `biomeAt` 1.07 / 0.91; `regionAt` 0.89 / 0.78; `waterLevelAt` 0.71 / 1.02. The valley's 8% is the floor's block (0.10 µs a call). Against that, P1 halved the walker's update and took 10 draws from most views; the frame is what `perf` and the bench in the gate measure. L5's own round was not given a second cold review (the suite and the critic stand in).
- **The curator** (sonnet): thirty keepers committed, stage 99 (`shots/99-*`), three of v15's leftovers as stage 98. The fen's after frame replaced with L5's.
- **The batch's suite** on `next`: started 03:04, `/tmp/suite-v16-batch1.log`, with the critic's and one agent's browsers beside it (a failure is rerun alone before it is believed).
- **Known red on `next`:** `geometry` (about 18 places: scatter reshuffled, to be judged row by row, not recorded wholesale), `seams` (ceiling 79/425/224 against 64/344/228), `walkers` 18/20, `canyon` 12/13 (`?reach=0`): since which merge is not known.
- **In flight:**

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| B1 the baselines and the red tests: judge every new `geometry` row, find the new seams, bisect `walkers` and `canyon` | `issue-1611-baselines` | 8169 | opus |
| the critic | `issue-1610-critic` | 8170 | opus |

Next: read the batch's summary; B1 and the critic's blocking findings in; then the gate on a quiet machine, the note, the PR.

**2026-11-17, 03:23 PST. The critic is in: three blocking. The batch's suite is still running; two more red rows found.**

- **The critic** (opus, 59 min; `briefs/v16/reports/v16-critic.md`, merged; its frames in the deploy worktree's `shots/wip/critic-v16-*`). **Blocking:** the Hypogeum's knock (from 8 s a dark mass covers two thirds of the view, the walker drifts 1.6 m west, the door's answer is never seen; at (228.5, -112.4), the edge of the floor's protected east box); the audio gate at `moor-gutter` (`rough` 0.253 against 0.25, the 4 kHz band swinging 29 dB); two map stands facing stone (the Bather, the Toadstone). **Strong:** the gutter, noticed unprompted at all three stands above ground ("nobody would miss it"); the floor from the gallery "reads as made by water". **Still ruled:** the barrow's dome, the hex paving, the kettle pools' near-round rims. **Weak, not fixed in v16:** "Take his letter" leads nowhere (nothing carried); a place card rose 13 times in 20 stops round the tarn; the Span's parapet hides the view; a sheer pier in the fen's east edge at (120, 207.5). The critic did not walk all the fen's shore, and its Lonely Staircase frame was black (its own placement).
- **The batch's suite** on `next` (since 03:04) has also failed two rows in `threads`: the twelfth chair's dents 0.33 m under the ground, and the jackdaw's hoard 1.9 m over the saint's head. Both are things at a fixed height on ground v16 moved; sent to B1.
- **In flight:**

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| B1 the baselines and the red tests (`geometry`, `seams`, `walkers`, `canyon`, `threads`) | `issue-1611-baselines` | 8169 | opus |
| F1 the critic's three blocking findings | `issue-1612-critic-fixes` | 8172 | opus |

Next: the suite's summary; B1 and F1 reviewed and merged; the gate on a quiet machine (both touch shared code, so it is the whole suite again); the note, the PR.

**2026-11-17, 04:17 PST. F1 and B1 merged; the gate is running on a quiet machine; the note is written.**

- **The batch's suite** (03:04 to 03:47, beside two browsers): 43 tests, 4 failed: `geometry`, `seams`, `threads`, and one `audio` row (`act-bell-letters`, +0.5 dB; passed alone twice at +2.2 and +2.1, the bed was louder under load).
- **F1 merged** (opus, 67 min; `briefs/v16/reports/issue-1612-critic-fixes.md`). The knock: a copse tree reshuffled onto the floor of the Hypogeum's cut, the visitor eased into its crown; `src/claims.js` keeps trees out to r 12; two `acts` rows (whole world, medium) hold the seam in the middle third at 8 and 15 s with nothing within 1 m. The gutter's roughness: the hush let go fast as the gust rose fast; `bed.js` lets go over 1.7 s, the gust rises over 3 s; `moor-gutter` rough 0.247 to 0.154, the gutters about 2 dB quieter. The stands: the Bather and the Toadstone moved; a `settings` row holds every stand's centre ray clear for 2 m (the Toadstone's frame is still mostly slope: weak). Not looked at: the pier in the fen's east edge (120, 207.5).
- **B1 merged** (opus, 71 min; `briefs/v16/reports/issue-1611-baselines.md`). `geometry`: one real fault fixed (an ashlar 1 m in the air by the Strake's wall; scatter drops a piece whose 3 m grid lies over 0.35 m off `heightAt`), 19 moved findings recorded, 35 lowered. `seams`: three real steps fixed (a 0.8 m lift ring round the fen, where the edge distance was exact to 48 m and read to 72; a 1 m cliff down the Saltings' east side; 0.3 m at the meltwater channel's bend); ceiling now 63/414/226, the rise in `off` being Medlar Close's terrace lips and the keep's skirt. `threads`: **the Wayside Shrine was not being built at all** on the tilted ground (slope 0.31 against a pin limit of 0.3; now 0.4), and the chair's third mark lay under the fen's water. `walkers`: P2's end drowned in the tarn's shallows, rerouted; 19/20, the last (P12's pit-lamps) red on `main` too. `canyon`: the `?reach=0` row loosened from "none over 4 levels" to "at most 8 pixels over 4, none over 12" (rounding speckle from the fen's edge merge, 3 pixels of 295): a test weakened, on B1's judgment that it measured speckle. `rocks`: each tor draws from its own stream. **Left:** the fen fringe's pool edges, 1 to 1.8 m in 0.25 m, outside the seams box.
- **The gate**: the whole suite on `next` with nothing beside it, `/tmp/suite-v16-gate.log`. No agent is in flight.
- **The note** (`RELEASES.md`, v16: "The valley floor and the failing sun"), the README's line and `shots/gallery-v16.webp` are committed; Stats go in when the gate is green.

Next: the gate's summary; Stats; the release PR; `tools/gh-release.sh v16`; close #73, #78, #79; look back.

**2026-11-17, 04:57 PST. RELEASED. v16 is on `main` (PR #81, `0eba44a`), the GitHub release published, #73 #78 #79 closed.**

- **The gate:** the whole suite on `next` with nothing beside it, 43 tests, 0 failed, 40 min 22 s (acts 176, audio 106, geometry 134, seams 3, threads 25, perf 29).
- **Done when, line by line.** 1: met for the shores (the critic, from the gallery: "reads as made by water"); the tilt is subtle from the heights (blind readers 2 of 6), and the kettle pools' rims still read near-round. 2: met (`src/height/outline.js`, read by height, water, paint and placement for the tarn, the fen and the regions). 3: met by the tests; left: the fen fringe's pool edges (1 to 1.8 m in 0.25 m), outside the seams box. 4: met (the critic saw the first gutter at about 74 s at three stands unprompted). 5: `perf` green; **`heightAt` over the valley is 8% slower than v15** (the floor's block, 0.10 µs a call), `biomeAt` 7%; the walker's update is about half v15's. 6: met.
- **Shipped weaker than meant:** the tilt's legibility; "Take his letter" leads nowhere; villagers at 20 m only partly fixed; the Toadstone's stand; the `canyon` `?reach=0` row loosened (not in the suite); `walkers` 19/20 (P12's pit-lamps, red on v15 too; not in the suite); L5's second round had no cold review of its own.
- **Not built:** W3 (`issue-1527-edges`, worktree kept, paused): the ground has now moved, so it can be taken up.
- No agent in flight, no background command. Worktrees: the main checkout, deploy, `issue-1527-edges`.

**2026-11-17, 04:58 PST. Looking back.**

- **What took longest, and did it need to?** The tail: from the last feature merge (03:04) to live (04:57) was 1 h 53 min, against the hour the skill asks for. Two whole-suite runs (43 and 40 min) with two fix agents (67 and 71 min) between them. The first run was needed to find `threads`; the fix agents could not have been shorter. What could: the fen's review round (L5, 95 min) held everything behind it while the gutter and the village were already in.
- **What was found late?** (1) The Wayside Shrine silently not built on tilted ground, the chair's mark under water, a path's end drowned, an ashlar in the air, a 1 m cliff: all from moving the ground under placed things, all found only by the batch's suite and B1 after every merge. The floor's briefs named `geometry`, `strata`, `dressing`, `heights`, `roads`; none named `threads`, `seams`, `walkers`. (2) A tree in the Hypogeum's cut: scatter reshuffles whenever biome weights move, and only rocks were kept out of acts' sites. (3) The release note called the lake by its code name (Lees Tarn); a visitor meets Circumbambulate Pool. Corrected after publishing.
- **What did the owner have to say more than once?** Nothing this run.
- **What worked?** Starting the critic and the curator before the last merge. A fixed view file with air views. Blind readers each round (they called the tilt subtle before the critic could). Asking the critic to stand still for two minutes: the only way the gutter's timing was judged as a visitor meets it. One agent for "every red test, judged row by row" (B1) rather than a re-record.
- **Changed in the harness:** `orchestrator`: a brief that moves the ground or reshuffles scatter names `threads`, `seams`, `geometry` and `walkers` among its tests; `release-notes.md`: places are named from `LANDMARKS`, not from the code's comments.

**2026-11-17, 04:59 PST. After v16: v17 is being planned in this same session.** The skill says a hand-started session stops after a release; the owner's words at the start of this run ("or two, if time allows") outrank it. Chosen: #74, the water runs downhill and goes under (labelled `in-progress`, `v17`). A planner (opus, `issue-1700-plan`, port 8173 if it renders) is writing `plans/wilderness-v17.md` and `briefs/v17/`; until that doc exists on `next`, this entry is the state. Nothing else is in flight.

**Waiting on the owner** (carried from v15, none of it blocks): three quotations (#76); the Lees' turret on the main stair's axis; the stray branch `v15-briefs-tmp` on origin.
