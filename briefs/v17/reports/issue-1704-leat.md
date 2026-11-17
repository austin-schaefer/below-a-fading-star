# v17 W2, the leat: report

Branch `issue-1704-leat`, 2026-11-17, origin/next merged (with A1's sound).

## What changed

- `src/v17/plan.js` `LEAT`: the table's line, but its third corner is at (6.6, 252.6), not (9, 252), so the meeting of P14 and P38 is dry ground at the bridge's east foot (the owner's stand `?pos=9,252` was in the water). Five ponds stepping down over five weirs (z 241, 247.5, 255.6, 259.5, 264.5; 0.87 m each, -2.45 to -6.8), the fourth `breached`, then level on a raised bank over the dry hollow at (-5, 279) (ground -8.7) and in a cut into the mere's east lobe. `steps` for the sound in the brook's shape. **3.2 m between kerbs, not 2.4**: at 2.4 the drawn ground's cells span lip to lip and no water was drawn.
- `src/v17/stream.js`: a built stream's options (`rag`, `wob`, `lipW`, `lipFall`, `minSpeed`, `speedWin`, `shade`). The brook's defaults are unchanged, except for one fix.
- **The bright strip at a step's lip, traced.** I drew the fan, lip and edge-line terms in false colour from 12 m upstream. It is the **fan**: ROUGH read DROP's centred difference, which put foam on the level water a metre before every lip. ROUGH now reads the fall into each sample from the sample above it. This fix moves the brook's white about a metre downstream.
- `src/v17/water.js`: `aShade` (the leat's glass darker, 0.5). Also fixed: a backtick in a shader comment broke the whole water module for one round (rounds 2 and 3 have no water).
- `src/v17/leat.js` (module `leat`, one draw): kerbs, weir sills under copings with cheek stones, the headwall, a fallen kerb stone, the breach's stone, and the slab bridge (a raise-only floor, steps, hexagonal posts, ascent `leat-bridge`).
- `src/rocks.js`: no rock on the kerbs. `src/v4/paths/routes.js`: P38 gets a point at the bridge's west foot (3.2, 251.2). That file belongs to N1.
- Tests: `outline` (4 leat rows); `roads-test` counts a deck over water as dry; `geometry` place `v17-leat-bridge`, with 2 sunk stones held in the baseline (they are sunk by design); `stream-frames` has an `up` mode and stands on decks.

## Tests

The full list in one run on port 8164: `ONLY=outline,threads,seams,geometry,roads,paths,regions,rocks,dressing,strata,walk,edges,heights,audio tools/suite.sh 8164`. Results: outline 77/0, threads 25, paths 86, regions 56, strata 8, rocks 38, walk 13, edges 214, seams PASS (61/414/225), audio 108, dressing ok.

Three tests were red in that run:

- **roads.** After the fixes, rerun with `ONLY=roads,paths`. paths is ok. roads has one red left: the `swallow` ascent's foot (P15 ends 72.6 m away). That is U1's ascent, not the leat's.
- **heights.** `leat-bridge` passes. Two rows are red:
  - "no page errors": `src/v17/sound.js:122` `put()` gets a non-finite value from the tube emitter (line 275) under the test's clock.
  - "cost: top stair on low": 371 calls against 364. Not traced. The leat adds 1 draw.
- **geometry.** It crashed after `strake` on the same sound.js error. Run on its own, `v17-leat-bridge` passes.

Run separately:

- `walkers-test`: 19/20 (P12 pit-lamps, which is red on main too).
- `height-speed --base=origin/next`, run twice: valley 0.990, then 0.977; fen 1.46 on the loaded first run, 0.990 on the quiet second.
- `route-frames v17-leat-bridge`: looked at, nothing broken.

## Blind readers (sonnet)

- Round 1: "a narrow canal-like stone leat ... milky water or glaze", static.
- Round 5: "a stone-lined leat ... stepped weirs ... water: yes, it looks like it is running; the weirs show white, streaky, directional cascades". Faults it named:
  - Looking upstream along the level reach, the water reads as "a dead near-black slab".
  - On low, the low sun on the ground blooms to white. This is the sky's, not the leat's.

## Frames, in order

`shots/wip/v17-W2-r5-up-medium-sheet-1..8.png`, `v17-W2-r5-across-medium-sheet-1..2.png`, `v17-W2-r5-down-low-sheet-1..8.png`, `route-v17-leat-bridge-medium-sheet.png`, views `v17-W2-r6-*.png`, the strip traced in `w2-dbg0-leat-weir-up12.png` (before), `w2-dbg1-leat-weir-up12.png` (false colour) and `w2-dbg0b-leat-weir-up12.png` (after).

## Still weak

- The level reach looks dead from upstream.
- No silt or reeds in the channel (N1's dressing).
- `span-deck-leat` frames a deck, not the leat (the view's stand needs changing).
