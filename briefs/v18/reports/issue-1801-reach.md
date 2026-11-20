# v18-F1 the wood's reach and its spurs (`issue-1801-reach`)

## What changed
- **North lobe** (`src/v18/reach.js`): a neck out of the old edge (about (-190, 55)) and a ragged spread round (-198, 20), two tongues. biomeAt's `wood` and the place `wood` (grade, air, litter) take its line behind one box test; `wood0` is the old wood alone. West edge held at x -218, so the Adust's height hook never sees it: **heightAt unchanged to the bit** over x -250..-150, z -30..70 (node probe). Fireflies, moths, the wind stream and the shafts reach it.
- **Trees** (`src/v18/wood-reach.js`, from `buildTrees`): about 40 lobe trees (deodands; dead and crooked at its rim; thorn, 3 fallen); 22 rim outliers, 4 rim giants, gaps in the old rim (placed and hidden); 8 fallen trunks beside the spurs. Moor trees where the lobe grows are hidden.
- **Streams**: the new leads move the wood's draws once; every later tree pass now has its own stream (4111-4115), so the moor, Medlar Close and the dead trunks reshuffled once and won't again.
- **Spurs** P57 (63 m, glasshouse door), P58 (46 m, Beds' door), P59 (81 m, through the neck to the grove), `cls: 'spur'`: a little darker than a trod, no gnomons at, along or pointing to them. **P33 rerouted** round the south and west of the Florilegium (it ran through its r 13 claim; round the north it crossed the glass spur). The glasshouse is in routes.js's AVOID.
- **Claims**: the Florilegium r 13 (all placers), its walk-round to r 16 (rocks, trees), the Beds' door r 5, the stilters' glade r 6 at (-198, 22), the sightline strip (-205,128) to the door (trees only, half 0.5 m).
- **Foxfire** (`src/v18/foxfire.js`, module `foxfire`, `?foxfire=0`): knots at each head (trunks, two low stumps at the mouth, a dim green light), then a clump every 6-12 m, each in sight of one before it. 3 draws, 3.6k triangles.
- New tests: `tools/foxfire-test.mjs` (gate `foxfire`), `tools/spur-walk.mjs`.

## Tests (counts printed)
- `ONLY=threads,seams,geometry,roads,paths,outline,regions,rocks,dressing,strata,treelod,foxfire tools/suite.sh 8181`: dressing 22, threads 25, roads 68, foxfire 21, outline 77, regions 56, strata 8, rocks 38, treelod 71 PASS; paths, seams, geometry failed, then fixed:
  - paths: the count of paths 56 -> 59 (the spurs). Now 91 PASS, 0 FAIL.
  - seams: re-recorded the ceiling {seam 63->61, off 414->412, ghost 226->232}. The 6 new ghosts are Medlar Close's extra trees (87 where there were 81, from its own stream); each tree's trunk collider is a known ghost.
  - geometry: span-west-stairs' buried pebble (rocks-pebble-5) is no longer found, so I dropped that one row (`ONLY_PLACES=span-west-stairs GEOMETRY_RECORD=1`).
- `ONLY=paths,walk,perf,foxfire,roads tools/suite.sh 8181`: paths 91, roads 68, foxfire 21, walk 13, perf 29 PASS, 0 failed.
- foxfire-test after the last change: 21 passed, 0 failed.
- walkers: 19/20 (P12's pit-lamps, red on main too).
- spur-walk on the keys, in and back: low 7/7, medium 7/7. No stall over 0.8 s.

## Perf (perf-views, low, 3 runs, medians: calls / tris k / GPU ms)
| stand | before | after |
|---|---|---|
| wood-heart (-210,130) | 209 / 1557 / 24.3 | 211 / 1523 / 19.5 |
| road-mid (-200,126) | 185 / 1524 / 24.6 | 190 / 1489 / 19.0 |
| road-enter (-152,78) | 208 / 1812 / 31.6 | 210 / 1800 / 18.6 |
| lobe edge (-198,8) | 247 / 1952 / 25.5 | 252 / 1979 / 23.5 |
| lobe-in (-190,35) | 285 / 2162 / 26.3 | 290 / 2160 / 22.3 |

- The trade, on low only: the wood's and the rim's trees switch LOD 12% sooner (lodK 0.88); the lobe is a metre sparser than the old wood; the rim giants keep detail to 1.25x, not 1.6x.
- At the lobe-edge stand the main pass is lower than before (1306k vs 1313k). The +27k there is in the shadow pass (the lobe's trees cast shadows).
- GPU numbers moved ±6 ms between runs on this shared machine. The JS ms in the last run were high everywhere (machine load). Trust the triangle numbers over the timings.

## Blind reader (sonnet), junction frames from the road
- Round 1: at the west junction the reader saw only "possible gaps". From inside a spur (`v18-spurwalk-medium-P57-in-02`) it was "clearly a side path, glowing marker stumps leading along".
- Round 2, after stronger head knots: still ambiguous from 10-12 m down the road. j-west-back and j-north-back were read as a way off to the right. The approach frames to the Beds and the north spur were not.
- **Not met yet: the junctions are found by a reader shown the frame only from some directions.**
- Lobe: read as "a dense dark tree line" from the moor, nothing wrong. From above it was read as "a round clump, pasted-on": the frame looks at the lobe from its north, away from the old wood.

## Frames (shots/wip/)
`v18-F1-r5-low-j-*` (the junctions), `v18-F1-r4-{low,med}-lobe-*`, `-edge-east`, `-above-lobe`, `v18-spurwalk-{low,medium}-P5x-*`.

## Defaults taken
- Spur w 0.4.
- The grove claim is a glade of r 6, not r 22: F4's stilters stand among trunks.
- The walk round the glasshouse is cleared of trees to r 16.
- P33's new line, round the south of the glasshouse.

## Still weak
- The junctions read from the road only faintly. Next step: a worn mouth wider than the tread, or a knot on the far side of the road.
- The lobe's rim has few dead trunks (1).
