# W5 the seams (issue-1529-seams): report

## The place, found

The owner's screenshot (`deploy/shots/wip/owner-v15/12.png`) is the grassy dip south-east of the Pomegranate House's gate, by the painted pole at (111, -61.5): the frame `shots/wip/v15-W5-find8-i3.png` (stood at 108, -63.5, yaw -1.9) matches it (the red pole, the dark plant at its foot, a house's wall on the right, a plastered house beyond, a bare medlar on the left). The place lies inside Medlar Close's terraces; the walk's title card says "Medlar Close" there.

## Reproduced, on the keys

`tools/dip-walk.mjs` (new): "Go out", the mouse captured, W held, steered with the mouse through eight points across the dip in four directions, the feet's and the eye's height logged every frame.

- Before: 6 jumps over a step in one frame, every one +0.84 m (e.g. (115.20, -61.02) feet -1.24 -> -0.40), 3 hangs of 0.30 to 0.53 s, worst one-frame dy 0.846 m. Trace `shots/wip/v15-W5-dip-before-trace.json`, frames `v15-W5-dip-before-001..009.png`.
- After: 0 jumps, 0 hangs, worst one-frame dy 0.048 m. Trace `shots/wip/v15-W5-dip-after-trace.json`, frames `v15-W5-dip-after-001..012.png`.
- Both traces drawn: `shots/wip/v15-W5-dip-traces.png` (before: square cliffs and a fall-and-back; after: smooth curves).

## The cause

`src/height/field.js`, Medlar Close's terraces: `Math.floor((h + 100) / 1.2) * 1.2 - 100` lerped at 0.7, a 0.84 m cliff in `heightAt` at every 1.2 m of the moor's rise, which the 2-3 m terrain mesh draws as a slope. The walker stands on `heightAt`, so it jumped the cliff in one frame going up and dropped off it going down. Fixed at the cause: a continuous wave of 0.3 of the rise round the same mean lowering (0.42 m), so things placed at a fixed y stay put. 0.3, because a deeper wave bends the ground more than medium's 2.1 m cells follow (0.25 gave 0 cells over 0.15 m in the dip on medium, 0.3 gave 0, 0.5 gave 21; on low the ground's own relief already misses by 0.21 m with no terraces at all). Shared code: the whole suite on `next`.

Four plots on that ground declare the fall they now have (`plan.js`: pennyworth-house-1 slope 0.8, house-2 0.75, hitch-4 1.4, gate-1 1.0; y unchanged).

## The sweep

`tools/seams-test.mjs` (new; in the suite as `seams`, about 3 min): the village and a 30 m skirt on a 0.25 m grid at q=medium, `controls.floorAt` against the drawn surfaces; kinds seam / off / ghost (header comment and `runtime.md`). Measured with its final version on the old ground and the new: seam 953 -> 64, off 1912 -> 344, ghost 228 -> 239, the owner's dip 185 clusters -> 0 (it was the largest group before the fix). The ghosts' +11 are a line of the Collation's colliders east of the gate whose drawn stones now sit 0.25 to 0.33 m off them, at the tolerance. Baseline `tools/seams-baseline.json`, a ratchet.

## What is left, and why

- The worst left are the Elder stair's faded ends (run 1 at s 1.5 to 4, run 2 at s 28): the coarse pass lowers the mesh by a riser (4 m) there with no slab drawn over it, so a walker can stand up to 3.8 m above the drawn ground (e.g. (46, -14.5) feet 17.70, drawn 13.88; (49.25, -23); (100, 13.25); (105.25, 10.5)). It is the bones' design (V0's `stepsYCoarse` in `demesne.js village()` and `plan.js lappetGround`): fixing it is a bank where the steps die into the turf, a change a visitor sees; for the orchestrator to brief.
- The Pennyworth ramp's foot (88, -30.88): a 0.93 m seam where ground meets the bench edge (W4's ramp).
- The new house's ladder (88.5, 19.5) on the crown: floor 2.55 m over the drawn (W4's ways: listed for it, not fixed).
- Stair faults for W4: none of the sweep's findings is on a stair's tread; at ways' ends only the two above, and small offs (0.18 to 0.26 m) at quarrels-stage (76.75, 14.5), rungs-gullet (92, -19.25), lees-stair (105, 4.5).
- Ghosts: mostly old colliders outside the village (trees' r 1 colliders north of the keep, wider than their trunks; the Collation's line), not judged here.
- Geometry: the Pomegranate House's findings reshuffle with its south-east ground (84 found, 15 old ones gone, 11 moved, the baseline re-recorded for `house`); two stall poles at (93.6, -29) and (95.6, -29) that end short of the flags were masked on next by a flag the shared rng put there (frames `v15-W5-geom-pole.png` and `-pole-old.png`: the same poles), recorded with that reason for the Pennyworth's owner.
- On low the terrain's 3.1 m cells miss the moor's own relief by up to 0.25 m (`SEAMS_Q=low` shows it): feet a hand off the drawn grass, everywhere, smoothly. Not this fault.

## Tests

`ONLY=seams,ways,village,village-plan,geometry,roads,walk,hop,edges,heights,strata tools/suite.sh 8170` (before the plan and baseline fixes): 9 ok, village-plan and geometry failed (above); after them `village-plan-test` 7 PASS 0 FAIL, `geometry-test` 144 passed 0 failed, `seams` 3 PASS. The others: roads 67, strata 8, village 687, ways 157, walk 13, hop 25, edges 214, heights 210 PASS lines. `village-walk` route pennyworth: walked yes; route village: the first run stopped at the ramp's foot (102.3, -15.7) on the bench edge; the same route on the old ground walked, and rerun on the new ground it walked yes (`v15-W5-vwalk2-*`): a steering flake at a ground the change does not touch (79 m from Medlar Close's centre, past its 65 m reach), said here in case it recurs.
