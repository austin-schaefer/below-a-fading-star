# v16-L2 report: the edge, and Lees Tarn's shore (2026-11-16)

## What changed

- **`src/height/outline.js`** (pushed first, `feat(v16-L2): the edge`): `radialOutline` and `polyOutline` as the survey designed them, plus `sectorWeight` and `bearingDir`. I made one change to the design: inside the shore the slope term divides by R, not ρ. Near the centre R′/ρ blows up, so sd went to about 0 there and the middle read as shore, which would have put an island in the lake.
- **The tarn** (`src/v4/tarn.js`): `TARN_EDGE` is a seeded wobble plus four lobes: the west bay (a capsule), the Byre's point (a land capsule), the north-east inlet (a tapered capsule) and the shallows' bay to the north. `tarnBasin` keys the profile on sd. On the shallows sector there is a shelf about 0.3 m deep for 15 m, and the steep west bank drops to deep water within 8 m, with a lip where the moor comes back. Windows hold the wobble down at the Strandline and the spit (0.85), at the Scriveners, and at the galley's western turn. `tarnShoreDistance` is the edge with the south bay smoothed in as before; the spit stays.
- **Readers moved to sd:**
  - `field.js`: the tarn block, the shore paint (wider over the shallows), and `waterLevelAt`, which now walks `WATER_BODIES`, a list where each body has its own `wet` and `sd`; the fen is a plain disc row for L3 to replace.
  - `waterShore()`, re-exported by `terrain.js`, now drives the reeds in `vegetation/ground.js`.
  - The mists, midges and leaf litter (`particles.js`) and the flora's keep-off (`v2/flora.js`).
  - The bench's arc in `perf.js` now runs 4 m off the edge.
  - `modules.md` says how to put a new body of water on an edge.

## Tests

`ONLY=outline,dressing,strata,geometry,heights,walk,regions,audio,threads,contrast tools/suite.sh 8164` ran 10 tests and 8 passed:

| Test | PASS lines |
|---|---|
| outline | 15 |
| dressing | 22 |
| threads | 25 |
| regions | 56 |
| contrast | 3 |
| strata | 8 |
| walk | 13 |
| heights | 203 |

The two failures:
- **audio:** `act-bell-letters` came in at +0.5 dB. On a rerun (`ONLY=audio`) it passed with 106 PASS lines (+0.7 dB). The v14 report saw the same margin flake on `next`.
- **geometry:** the faults are in the rock scatter. `rocks.js` draws positions and rejections from one random sequence and reads `biomeAt`, and the shore paint changed near the tarn. So the pebbles are reshuffled across the whole valley, far from any ground that moved. Three rows changed: 1 new and 2 fixed.

**heightAt is no slower.** Over 1e6 calls in node, measured back to back under the same load, the before took 3201 ms and the after 3060 ms. An earlier quiet pair was 2098 and 2113 ms.

## Frames, in order

All in `.../issue-1604-edge/shots/wip/`:
1. `v16-L2-before-tarn-above.png`
2. `v16-L2-r1-tarn-above.png`
3. `v16-L2-r1-gallery-tarn.png`
4. `v16-L2-r1-walk-{steep,shallows,inlet,westbay}-0..5.png` (medium)
5. `v16-L2-r1-walklow-{shallows,inlet}-0..5.png` (low)

A blind reader (sonnet) shown the after frames named no circle, rectangle or ruled line, and could not place the centre.

## Still weak

- The tarn's lap sound (`src/audio/calls.js:114`) still reads a circle (r 52). That is outside this brief and needs `sound-design`.
- The steep bank and the west bay sit in the wood's darkness, so they hardly read in frames.
- The galley's east hull clears the bottom by only 2.12 m (the test's floor is 2 m).
- The fixed views from the Span and the stair do not show the tarn well.

## Defaults and decisions

- The survey's API was taken as written, apart from the change above.
- The Strandline was held in place with a window rather than moved; its spine stays within 1.4 to 5.8 m of the shore.
- `uniforms()` returns `{}`, because every constant is baked into the GLSL.
- A height-check record/check audit was not run (about 0.6 GB); `heights` covers it.

## Baseline rows to re-record (geometry, those rows only)

- `v12-lift-lower`: new `buried rocks-pebble-6` at (-305.5, -15.3)
- `v12-icefall`: fixed `rocks-pebble-5` at (58.5, -315)
- `span-east-stairs`: fixed `rocks-stone-4` at (229.5, 166.5)
