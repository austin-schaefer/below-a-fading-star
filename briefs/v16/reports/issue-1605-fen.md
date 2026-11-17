# v16-L3 report: the fen on the edge, and the other ruled outlines (2026-11-17)

## What changed

- **`src/height/fen.js`** (new). `FEN_EDGE` is a `radialOutline` (K 12, no warp) with:
  - six fingers running out along the low lines (west toward the tarn, north-west, north-east, east, south under the Span, south-west);
  - the broad open side toward the river's mouth;
  - six pools that stand apart from the main water;
  - five islets as land lobes.

  `fenHeight` keeps the old broad bowl, so what stands round the fen stays where it was. On top of it:
  - the flat is drawn further down along the fingers, never up;
  - the pools come from the old noise, keyed on sd: every hollow holds water deep in, and only the deepest cores do out through the fringe;
  - the fringe is tight toward the keep's slope (about 3 m of water past the shore) and open toward the river (about 14 m);
  - the islets are lifted dry.

  The other exports:
  - `fenWet`: wet only where the pools dig below the water. The Span's bed at (98, 209.5) is dry.
  - `fenMarsh`, `fenRiverKeep`.
  - `fenAt` and `fenIn`: placement that keeps each caller's own random draws.
- **Readers moved onto the edge:** heightAt, the river's cut, the marsh paint, the `WATER_BODIES` row, `PLACES.fen`, the Saltings' yield and its height clamp, the ribbon's fade (`glsl()`), the reach's mouth, the water disc (r 90; past the edge it draws only the pools), and the scattered things: candles, mists, midges, bubbles, the wind, dead trunks, toadstools, pods, both waders, the frogs and bubbles in the sound, and the bench's arc.
- **Other outlines:**
  - The Saltings and the Outwash take `ragged` (the Saltings' hem stays put within 26 m of the Pit).
  - The wood's place and its paint share one ragged line.
  - The crystal's ring and the clearings' rims wander.
  - **Left as they are:** the Bletting's circle and its z −150 cut (a hedge, a bank and walls stand on them, so the line is a built boundary), and the glacier (#75).
- **L2's leftovers:**
  - `tarnWet` has no margin on the steep bank, 0.5 m in the bay, and none on the spit's back.
  - The lap sound sits at the nearest point of the shore.
  - `edge` marks the discs that sit on an edge. The stale circle readers and the past-tense comments are fixed.
  - P17 now goes round the inlet's head and P23 behind the west bay. Both had run into the water, which made `roads` fail on `next`.
  - **Not done:** deepening the galley's turn.

## Tests

The first run was `ONLY=outline,dressing,strata,regions,paths,roads,walk,heights,seams,geometry,rocks,audio tools/suite.sh 8165`; FINAL-RUN gives the second run's counts.

### The second run (after merging `origin/next`)

`ONLY=outline,regions,dressing,strata,roads,paths,rocks,walk,geometry,heights tools/suite.sh 8165` ran 10 tests and 8 passed.

| Test | PASS | FAIL |
|---|---|---|
| outline | 30 | 0 |
| regions | 56 | 0 |
| dressing | 22 | 0 |
| strata | 8 | 0 |
| roads | 64 | 0 |
| paths | 81 | 0 |
| walk | 13 | 0 |
| heights | 203 | 0 |
| rocks | 36 | 2 |
| geometry | 127 | 8 |

- **rocks:** bushes are reshuffled onto P3 and P8, and near two map stands (the Laid Sun, the Collation's gap). The same check also fails on `next` (37 PASS, other spots).
- **geometry:** the rows are listed below.
- **audio:** 106 PASS, 0 FAIL, from the first run (`calls.js` has not changed since).
- **seams:** the first run failed only on the ceiling (seam 66 against 64, off 356 against 344). heightAt and biomeAt are identical to `next`'s, to the bit, across the whole swept village box, so I put that down to `next` or to the reshuffle of the scatter. Do not re-record seams from this branch.
- **canyon** (the reach): 12 PASS. Its one FAIL, `?reach=0` (294 px, max 6), also fails on `next` (280 px, max 7).
- **walkers:** 18 PASS, the same as `next`.
- **Audio survey** (fen-edge, tarn and the control moor-stand): no gates fail.
  - fen-edge: −30.6 → −30.4 LUFS, onsets 3 → 9 a minute. The bubbles now fire at the edge, where the pose stands.
  - tarn: unchanged.

## Frames, in order (`shots/wip/`)

1. `v16-L3-r2-air-fen-down.png`, against the deploy worktree's `v16-before-air-fen-down.png`
2. `v16-L3-r3-air-fen-down.png` (the edge with no warp)
3. `v16-L3-r2-air-valley-down.png`, `-air-tarn-down.png`, `-air-tarn-oblique.png`, `-span-deck-fen.png`
4. `v16-L3-r2-walk-{north,west,east}-0..5.png` (medium), then `v16-L3-r2-walklow-*` (low)

A blind sonnet reader of the five air frames named no circle or ruled line on natural ground. It gave two low-confidence candidates: a shadow edge, and a track's arc.

## Low tier and heightAt

**Draw calls** on low (four views, against `next`): 354/350, 282/284, 353/355, 406/410. That is within ±4, from the scatter in view; nothing new is drawn.

**heightAt:** the machine was loaded, so the numbers swing two to three times between runs.
- The best of five process pairs: `next` 6192 ms over 1e6 valley calls and 825 ms over 2e5 fen calls; this branch 4242 and 727.
- An earlier quieter pair, before I dropped the warp and added the lobe skip: +6% over the valley and +20% over the fen's box.
- So it is not shown to be slower, and not proven equal either. It needs a quiet re-measure.

## Still weak

- The Saltings' crust still reads as large, flat and pale from above. Its hem is ragged now, but the flat is still one sheet.
- The bay and fen-finger tips that poke into the salt are round, at about 10 m.
- The galley's turn was not deepened (2.12 m against its 2 m floor).
- `waterLevelAt` at (98, 209.5) still gives −2.45, from the river's line (`riverLevelAt`, which runs on to s 130 inside the fen), not from the fen.

## Defaults and decisions

- The fen keeps the old radial bowl in the height and is ragged above it, so the heights round it and what stands on them do not move.
- The Bletting stays as it is.
- WATER.fen.r is now 90.
- Wet is the pools' dig above 0.42 m.

## Baseline rows to re-record

**geometry**, these rows only:
- `v12-lift-lower`: four new and four fixed, all heather or pebbles.
- `v12-icefall`: one fixed pebble.
- `span-east-stairs`: two fixed.
- `house`: one fixed backs row.
- `lappet-lees` and `lappet-pennyworth-skirts`: an ashlar and a drum from the ruins' scatter at (111, 3).
- `lappet-pennyworth-hitch`: one pebble.

**seams:** none from this branch.
