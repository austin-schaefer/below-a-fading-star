# Brief v11 M4: fitting, load time, and a test for ruled lines

Worktree: `.claude/worktrees/issue-1104-fitting` (branch `issue-1104-fitting`, port 8164). Work only there. Read `briefs/v11/_common.md` first, then `plans/wilderness-v11.md`'s Status (M1 and M2 are merged; read what each did and what each left weak).

## Goal

The new wall is on `next`: outlines by M2, eroded rock in three values by M1. Three things are left before it ships.

1. **Load time.** The terrain build went from 2.33 s to 2.80 s on low and from 4.30 s to 5.37 s on medium (M1's numbers, this machine), on top of M2's far rings (+20 ms low, +42 ms medium). A phone pays several times that. Get low back to within about 0.15 s of 2.33 s and medium within about 0.4 s of 4.30 s without changing what is seen: the review found `biomeAt` calls `heightAt` five more times per wall vertex for a slope the wall now discards (about 4 `heightAt` a vertex to save), `drainage()` and the relief run ~13 noise calls per wall sample, and the bake adds a `warped2` and an `fbm2` per vertex past r 300. Cache per-vertex results, skip discarded work, share noise between terms. Prove "unchanged" with a probe: `heightAt` at 5,000 wall samples and the baked colours' checksum, before and after.
2. **A test that would have caught v10's wall**, in the gate (`tools/suite.sh`, a `run` line; `world-code`'s `runtime.md` says what each tool checks). Two parts, both cheap and with no screenshot judging by eye:
   - geometry: along radial profiles up each massif's face (say 72 bearings), no periodic stepping: the autocorrelation of the detrended profile's slope has no peak above a threshold at any 8 to 25 m lag shared across bearings; and no heightfield fold (the fin cause): radial slope bounded;
   - picture: render two of the cold views (`high-y0`, `high-y4` from `tools/views-v11-mountains.json`) on low, take the wall's region, and measure the share of horizontal-line energy (row-mean luminance spectrum, or a horizontal-edge to vertical-edge ratio). Calibrate against v10: check out nothing; `git show v10:src/...` is not servable, so calibrate the picture part against the before frames in the deploy worktree's `shots/wip/v11-00-before-high-y0.png` and `-y4.png` (the test must fail those and pass today's).
   Name it `mountains-test`. It must fail on v10's frames and geometry constants if fed them, and say so in its own output when run with a `--self-check` flag.
3. **What M1 left weak**, as far as a day allows, in this order: the south massifs seen toward the sun are smooth under the warm glow (`high-y3`: the sunward haze erases the relief there as the cool haze once did; let it compress, not erase); upper faces near the crests stay pale and plain; the Span's east abutment (bearing 130) lost 10 to 20 m of wall above it: render it from the deck and the ground and fix the face there if it looks cut away. Same views, before and after; the blind reader's words to beat are in Status.

## Not yours

`src/v5/lamps.js`, `src/v5/galleries.js` (M3 is in them now).

## Done when

The build times are back (say the four numbers); `mountains-test` is in the gate, passes on `next`, fails on the before frames; the tests in `_common.md` plus `mountains` pass; frames of `high-y3`, `spawn-y1`, `highling-y1`, and the Span's east abutment before and after.
