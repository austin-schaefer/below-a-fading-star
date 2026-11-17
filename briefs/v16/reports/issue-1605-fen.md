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

# Round two (v16-L5, the review's fixes, 2026-11-17 03:05)

Merged `origin/next` with the floor (L1+L4). Everything below is measured on the merged tree.

## The brief's items

1. **Cost: not fully met on the valley.** The fix is `tools/height-speed.mjs` (1e6 calls on a fixed pseudo-random set, 5 interleaved runs, medians; it prints the four numbers against a ref). The final run had a quiet spread.

   | query | set | vs `origin/main` | vs the branch before me |
   |---|---|---|---|
   | heightAt | valley | 1.432 → 1.551 µs (**1.08**) | 0.98 |
   | heightAt | fen box | 0.95 | 0.78 |
   | biomeAt | valley | 7.73 → 8.28 µs (**1.07**) | 0.96 |
   | biomeAt | fen box | 0.91 | 0.80 |
   | regionAt | valley | 0.89 | 0.74 |
   | regionAt | fen box | 0.78 | 0.55 |
   | waterLevelAt | valley | 0.71 | 0.54 |
   | waterLevelAt | fen box | 0.434 → 0.443 µs (**1.02**, inside the spread) | 0.48 |

   - The valley's excess is the floor's block: `floorGround` costs 0.10 µs a call over the valley, down from 0.16 after my cells. Before the merge, the valley was 0.84 to 1.0 of main.
   - **Done:**
     - the river's projection: chunks, a 4 m grid seed, a per-cell chunk mask, a last-point memo, and a floor of the distance so `waterLevelAt` skips the channel far off;
     - the spur's weights taken relative to the nearest distance (skipping e − e0 > 5000);
     - `waterLevelAt` reads only the channel's width;
     - a `heightAt` last-point memo (the coarse pass and `WALL_SAMPLE` are in the key);
     - the fen: sectors from one ρ, the islets' box, the gated marsh noise;
     - `biomeWith`'s wood and moraine noise gated;
     - regions: compiled strips with a box skip, the rag gated by lim, the places' far bound by blend, the wood place's rag gated;
     - a causeway grid;
     - floor.js: per-cell masks with FREE, CLEAR and ZERO, the mask and skirt-noise memos, and segment boxes;
     - `hypot` → `sqrt`.
   - Every change except the spur weights and `hypot` is bit for bit: heightAt, regionAt, biomeAt, waterLevelAt and waterDepthAt, checked at 200k random points.
   - **Tried and dropped:**
     - a 1 m table of the fen's sd. A quarter of its cells miss by 2 cm, and a random read costs about what sd does.
     - a table of the pools' noise: a metre of error.
     - per-sector sd floors: within 2% either way in an A/B.
2. **Water held by nothing: fixed.**
   - The pools dig only where the ground before the fen stands above the water.
   - The fen's wet test is its own ground under the level (5 cm given), and the whole ground within 0.3 m near the river.
   - The tarn is wet only where its ground is within 0.45 m of the water. Past the line its basin keeps the ground over the water, which fills hollows of up to 0.8 m behind the bay and under the wood.
   - New `outline` row for every body: a dry cell more than 0.1 m under the level beside a wet one fails. 0 cells.
3. **Fixed.** The river inside the fen's edge is water only where its ground is under W. (98, 209.5) and (110, 191) are dry, and a row is added.
4. **Fixed.** Wet cells more than 0.5 m above the level: tarn 0 (was 523), fen 0 (was 21).
5. **Fixed.**
   - The leads' claim keeps `trees` by the collider's r.
   - The Bletting's walls break at leads (P7 and P8), after the draws.
   - No tree stands within 0.6 m of a map stand.
   - `rocks` 38/0, not re-baselined.
6. **Fixed.** The clearings wander outward only.
7. **Fixed.**
   - The river's cut gives way along its line where it did before L3 (66 to 52 m from the fen's centre).
   - P14's turn moved (92, 236) → (90, 233), off a fringe pool.
   - P14's first 5 m lie in the river at 1.5 m, as on main.
8. **Fixed.** The river shader skips the edge past rMax + 3. Row added: sd ≥ 3 there (least 5.5).
9. **Meant, except one place.**
   - The Saltings' and the Outwash's rags are L3's purpose (#73).
   - P44 now runs on the crust its brief names.
   - Held still: the Outwash's hem at P21. With the floor, it made a 1.22 grade (world.js `still`).
   - The tarn's floor is new height outside the fen (above).
   - Merge: floor.js protects the fen by min(ρ − 85, sd − 36). Merged = this branch + the floor's lift at every metre (0 off).

## Tests (merged tree)

- `ONLY=outline,regions,dressing,strata,roads,paths,walk,heights,rocks,audio,geometry,seams tools/suite.sh 8165`:

  | test | PASS | FAIL |
  |---|---|---|
  | outline | 55 | 0 |
  | regions | 56 | 0 |
  | dressing | 22 | 0 |
  | strata | 8 | 0 |
  | paths | 86 | 0 |
  | walk | 13 | 0 |
  | heights | 200 | 0 |
  | rocks | 38 | 0 |
  | audio | 106 | 0 |
  | roads | 63 | 1 |

  The roads FAIL was P21; after the fix, `ONLY=roads,regions,outline` gives roads 64/0.
- walkers 18/20 and canyon 12/13: the same failures as `next` (pit lamps on P12, the lead's spacing, `?reach=0`).
- **geometry** 116/18: re-record `v12-stair`, `v12-lift-lower`, `v12-icefall`, `span-east-stairs`, `house`, `strake`, `lappet-lees`, `lappet-pennyworth`, `-market`, `-foot`, `-skirts`, `-hitch`.
- **seams**: the ceiling (79/425/224 against 64/344/228). Re-record.

## Frames

- `shots/wip/v16-L5-air-fen-down.png`: like L3's r2.
- `shots/wip/v16-L5-walk-south-0..5.png`: P14's reach, from the river's bank into the fen's south water.
