# issue-1712-shadow-glow: the owner's two faults on live

## 1. Shadows jumping on the east shore (-21, 104, facing SE)

**Reproduced.** A walk of 12 steps of 0.75 m (teleported and on the keys, medium and high) did not flip, because walking straight keeps the box's depth window in place relative to the ground ahead. Turning does not: at the stand, holding the view and turning the look by 1.2 rad changes the lower half's luminance by 11.9 of 255 (`?shadowdepth=v16`, `shore` box row). Switching off each caster group at the stand: only `span-stairs` moves it (12.6).

**Cause.** The sun's shadow camera sat 260 m up-sun of a point 40 m ahead of the eye, 420 m deep. The Great Span's west stair is about 330 m up-sun of the east shore, and its shadow at 13.5 degrees is about 230 m long. It sat on the near plane, so as the walker stepped and turned (the box moves 40 m with the look) it was cut in and out, and its shadow came and went over most of the ground in view. Ruled out: the galley's 40 m cull (it flips at 40 m but its shadow falls north, out of this view), the tree LOD (`xfade=0` changes nothing), and the `above` box steps (alt 1.7 throughout).

**Fix** (`src/shadows.js` `shadowDepth`, a few lines in `src/main.js`, `src/v12/above.js` takes the light distance as a parameter). Across the light the box is texel-snapped as before. Along the light it is now fixed to the world: its centre lies on the plane through the origin square to the sun, the light is 500 m up-sun, and the window is 1000 m deep (every point within 420 m of the bowl's centre, up to 300 m high). The bias is scaled to keep its 0.25 m. `?shadowdepth=v16` restores the old window. Only at walking height (box 95 m): a box grown from a top (`above.js`) keeps v12's window, because the full window cost the stair's and the gallery's tops 375 and 373 calls, over heights' 364 (first suite run). The east shore is now always in the stair's shadow, as it already was when facing S. The other five views compared (fen, spawn, stones, orchard, east shore facing S) are unchanged. Cost: the shadow pass draws about 10 to 26 more calls in the views (calls 291 to 306 at the east shore; 333 to 351 at the spawn).

**Guard.** `tools/shore-walk-test.mjs` (gate: `shore`). At three stands (the east shore, the pool's north shore, the fen's west shore), a box row holds the view while the look turns, and the lower half may change by at most 1.0 of 255. Then a 12-step walk out and back, where no step may exceed 3 times the median step, nor 3 of 255. On v16 the box row fails by 11.9.

Frames:
- Before and after, the stand: `shots/wip/v17-1712-shadow-v16-east-shore.png` and `shots/wip/v17-1712-shadow-fixed-east-shore.png`.
- The six-view comparison: `shots/wip/v17-1712-shadow-compare-sheet.png`.
- The walk: `shots/wip/before/shore-east-shore-medium-*.png` and `shots/wip/keys/`.

## 2. The village's lights as bright as the sun (from 269, -20 facing W)

**Cause** (as diagnosed). Far specks were held at 3 px and lit at 3.2 times their own light from 150 m, and up to 2.4 times more in a gutter. The brightest speck measured 5.1 linear lit and 13.8 in a held gutter. The sun's disc measured 1.17 lit and 0.42 held at 0.3. Bloom's threshold is 0.88.

**Fix** (`src/v15/far.js`):
- `FAR_GLOW` is 2.0.
- A speck's light is divided by the square root of its enlargement. Dividing by the whole enlargement left only grey dots (`after-*` frames).
- The cap is 0.3 lit, rising to 0.37 as the lamps answer a gutter.

Measured: 0.21 lit and 0.26 in a held gutter. The near lamps are untouched: the square's frames are identical.

**Guard.** Three rows in `village-test` via `tools/far-glow.mjs`. In each, the brightest light a speck adds must be at most 0.9 of the sun's disc, lit and guttered, and against the frame's median the specks must stand 1.2 times higher in a gutter than lit. The old `far.js` fails the first two by 5.07 and 13.8.

Frames, before and after (`after3` is final): `shots/wip/v17-1712-glow-{before,after3}-{stair,deck,moor,square}-{lit,gutter}.png`; sheet `shots/wip/v17-1712-glow-sheet-after3.png`.

**Weak.**
- In a gutter the specks read pale rather than warm: post's gutter grade cools them.
- The fountain's additive noon sheet (`lees-noon`) and the haze over the skyline are about 0.45 to 0.5 in a held gutter, above the dimmed sun's 0.42. Neither belongs to the specks, and neither is changed here.
- The test row's limit for the gutter is the gutter's own sun, not the lit one.

## Tests

- `ONLY=village,gutter,perf,heights,shore,treelod,rocks,walk,loading tools/suite.sh 8172`:
  - Passed: village 690 PASS, rocks 38, walk 13, loading 28, perf 29, gutter 29, treelod 71.
  - Failed: heights and shore.
- Rerun after the walking-height-only change and the shore walk's two-frame read: shore 6/6.
- heights is still at 2 failures in 208. Both fail at the same rate with `shadowdepth` forced to v16, so on origin/next as merged here:
  - `no page errors (ascents)`: an AudioParam `setTargetAtTime` non-finite error. Not shadows; likely v17 A1's water sound, just merged.
  - `cost: top stair on low`: 371 calls against 364, the same 371 at v16.
- `cost: top gallery on low` failed with my change (373 against 364) and passed at v16. That is mine, about 9 calls: the gallery's top is at walking height, so it takes the deeper window. Open: either shorten the window's up-sun reach or accept the cost.
- The `from above` row (box centre against the eye on the Span's deck) failed under the first version and passes now.

Owner's link: http://localhost:8123/?pos=-21,104&yaw=-2.356
