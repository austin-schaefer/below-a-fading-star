# issue-1612-critic-fixes: the critic's three blockers

> Written by an automated implementation agent (Claude Code), 2026-11-17.

Branch `issue-1612-critic-fixes`, cut from `next` at 3c7e90d, port 8172.

## 1. The Hypogeum's knock

- **Reproduced.** The critic ran on `issue-1610-critic`, cut at b9f6d6e (02:15). With that commit's `src` in this worktree, the knock from (228.5, 2.9, -112.4), `E` and no other input, real time, default tier, did what the critic saw. From 8 s the ease back put the eye into a tree's crown, and a ray from the eye to the seam met `veg-trees` at 0.68 m. Frames: `shots/wip/v16-critfix-before-base-{pre,00s,04s,08s,10s,12s,15s,20s,30s}.png`.
- **Cause.** The tree was a moor copse tree at (227.68, y 0.38, -111.87), standing on the floor of the cut where the visitor is eased to. The v16 floor reshuffled the moor's trees, and nothing kept trees out of the Hypogeum. `rocks.js` keeps its stones out of r 12; the trees had no such rule. `?floor=v15` gives the old heights but does not change where the trees are placed. On `next` the copse had moved away by chance, so the current tip does not show the fault (`v16-critfix-before-critic-*`, `-before-gut-*` with a gutter falling during the knock, `-before-door219{m,h}-*`).
- **Fix.** `src/claims.js` adds a claim, `the Hypogeum`, a disc at `LANDMARKS.hypogeum` with r 12 that keeps `trees` out. A tree placed there is not drawn and not collided, so every other tree stays where it was. On b9f6d6e with the claim, the knock reads clean: `v16-critfix-after-base-*`.
- **Guard.** `tools/acts-central.mjs` has two door-world rows. They load the whole world at medium (low draws fewer copses and missed the tree), knock from 2.2 m and check at 8 s and at 15 s with no input:
  - the seam is in the middle third of the view;
  - no mesh lies within 1 m of the eye on the lines to the lintel, the seam or the sill.

  On b9f6d6e at medium and high the rows fail (`veg-trees` at 0.05 to 0.3 m). With the claim they pass.
- **The other acts.** I checked the lift lever, the bell, the crystal, the door, the tally and the Pit's lead the same way, at medium with `?floor=v15` off and on. At 8 s and 15 s after `E`, no mesh lies within 1 m of the eye, either toward the act's spot or along the view's centre. The plate's carry holds the visitor where the knock left them, which the door rows cover.
- `tools/door-frames.mjs` now takes `AT=` (knock from a given distance), `Q=`, `SECS=` and `EXTRA=`.

## 2. The audio gate (moor-gutter `rough`)

- **Cause.** Before the fix I rendered `moor-gutter` with each layer silenced. The `?mute=` switch was temporary and is not kept.

  | render | rough |
  |---|---|
  | as it is | 0.218 (0.247 in the survey) |
  | drone silent | 0.247 |
  | hush off | 0.088 |
  | relief gust off | 0.092 |

  The roughness sits in lines at 22 Hz in the 125 and 250 Hz octaves, where the hush and the gust meet. The hush let go at 0.3 a tick while the gust rose to full over 1.8 s, so the bed's gain climbed about 25 dB in half a second in the update's 10 Hz steps. The rooks and the Laid Sun do not reach this pose (no cue in the render's log).
- **Fix** (`src/audio/bed.js`). The hush now lets go at 0.06 a tick (about 1.7 s), and the relief gust rises over 3 s to 0.8 instead of 1.8 s to full. The gate is unchanged.
- **Survey** (`--poses=moor-gutter,leerie-gutter,demesne-gutter,moor-stand`; `shots/wip/audio/survey-critfix-{before,after}`):

  | pose | rough | lufs_i | s-max | sharp | 4 kHz swing |
  |---|---|---|---|---|---|
  | moor-gutter | 0.247 → 0.154 | -31.3 → -33.5 | -25.8 → -28.6 | -14.6 → -16.7 | 23.6 → 17.3 dB |
  | leerie-gutter | 0.117 → 0.080 | -30.7 → -32.7 | | | |
  | demesne-gutter | 0.191 → 0.097 | -30.4 → -32.6 | | | |
  | moor-stand | 0.001, unchanged | -30.7, unchanged | | | |

  Three more renders of moor-gutter after the fix read 0.153, 0.156 and 0.148. The gutters are about 2 dB quieter, because the relief gust is gentler. The `lufs_i` band of -28 to -24 is not gated, and moor-gutter was already outside it at -31.3.
- **To listen:** `shots/wip/audio/survey-critfix-after/moor-gutter.wav` from 14 s, where the gust comes in over the hush letting go.
- **act-bell-letters** (the orchestrator's note). In the whole suite on `next`, run beside two other browsers, this row failed: `bed 0.00713 cue 0.00758 (+0.5 dB)`. Here it passed both times, with no other browser of mine running:
  - in the subset run: bed 0.00325, cue 0.00419 (+2.2 dB);
  - in `ONLY=audio` on its own: bed 0.00326, cue 0.00416 (+2.1 dB).

  The cue is the same level in all three runs. The bed was twice as loud in the failing run. That points to the bed the row happens to sample, which depends on how loaded the machine is, rather than to a lost cue or a v16 change. The margin over the +0.5 dB line is about 1.6 dB.

## 3. Map stands that faced walls

- **The Bather.** The old stand (166.5, 218.5) stood on the Span's rubble and looked into a slab 1.98 m off. It is now on the rim at (163.8, 218.9), yaw 2.70, pitch -0.65, 12 m from her, with her whole length in the middle of the view.
- **The Toadstone.** The old stand (186, 232) faced the pier's footing. The toad is 0.16 m long and sits at (178.8, 231.5). The stand is now at (180.9, 234), 4.3 m off, yaw 0.698, pitch -0.73, with the toad on its ledge in the middle and the Bather's pool beyond.
- I found both by searching a ring round each thing for a stand with a clear line to it and nothing within 2 m along that line.
- **Frames:** `v16-critfix-before-stand-{bather,toadstone}.png` and `v16-critfix-after-stand-{bather,toadstone}.png`.
- **Guard.** A row in `tools/settings-test.mjs` checks all 81 stands: the view's centre ray (yaw and pitch, from the eye) meets no drawn mesh within 2 m. I used 2 m rather than the brief's 1.5 m because the Bather's slab was at 1.98 m. No other stand fails. The row would not catch a wall farther off: the Toadstone's pier was more than 8 m along the ray.

## Not done

- The sheer pier at the fen's east edge (120, 207.5) is not looked into. Doing it properly needs a browser, and the browser was busy with the tests.

## Tests

- `nice -n 10 env ONLY=acts,audio,regions,settings,touch,gutter tools/suite.sh 8172`, on the branch merged with `origin/next`: **6 tests, 0 failed**. The PASS lines were settings 87, regions 56, audio 106, touch 45, acts 176 and gutter 29 (18 min 53 s).
- `nice -n 10 env ONLY=audio tools/suite.sh 8172`, run alone a second time: 1 test, 0 failed, 106 PASS.
- I ran only these subsets, not the whole suite. `src/claims.js` is read by every placer of trees, so the orchestrator's whole run should cover the rest.
