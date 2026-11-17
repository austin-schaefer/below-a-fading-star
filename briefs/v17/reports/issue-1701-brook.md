# v17 W1, the brook and the mere: report

Branch `issue-1701-brook`. 2026-11-17.

## What changed

- `src/v17/plan.js` (first push, 05:18): the index's table as data, a section per brief. W1's rows are live:
  - `MERE`: level **-6.8** kept (the natural rim 3 m outside its edge, with the mere off, holds it all round: least -6.80); its outline fitted to the natural -6.8 contour (centre (-88, 279), lobes into the west and east hollows, to the brook's mouth, the leat's mouth (-68, 288) and the Swallow's cut); `bank` 0.8 steepening to 2.2 toward the apron (`bankSouth`), `end` z 311.5 (U1), a bar under the pegs' survey line at x -80 (`shoals`).
  - `BROOK`: rerouted from the table's line through the 3 m gap between crown pieces 1 and 4 (the colliders: piece 1 x -98.7..-90.5, piece 4 x -87.7..-78), west of piece 3, into a broad pool in the hollow at (-92, 241), out over its lip in a cut, down a step into the mere. Levels: -4.6 to z 204, -4.75 / -4.95 in the run between the blocks, a step to -5.45 at z 220, -5.95 into the pool (-6.05), a step to -6.35 off the pool, -6.48, a step to -6.8 into the mere. 3.2 m wide at its narrowest (low's cells are 3.1 m), 15 m across in the pool.
  - `SWALLOW_CUT`: (-95, 290) to the face, 8 m of water at -6.8, banks 1.3 steepening to 4 by z 309, nothing past z 311.5 (U1's word). heightAt at x -95: z 311 -7.82, z 316 +8.46, z 320 +11.0, z 326 +16.1; at the face x -106 +10.6, x -84 +4.4; at z 310 x -102 +5.35, x -88 +4.34.
- `src/v17/stream.js`: the kit (a stream on a line, a still on an edge), `src/v17/bodies.js`: the bodies and the three calls `field.js` makes behind one box test, `src/v17/water.js`: the streams' ribbon (own program, one draw) and the stills' grid (tarn's material, one draw). `modules.md` says how to put a stream on the kit.
- `src/height/field.js`: the box's lines in `heightRaw`, `biomeWith`, `waterLevelAt`, `WATER_BODIES`; `waterLevelBeforeV17`, `isUnderwaterBeforeV17`, `inV17Water`.
- `src/rocks.js`, `src/vegetation/ground.js`: refuse on the water as it was before the draws, drop or hide what lands in v17's after (else every later rock and tree moved: geometry's span-east-stairs and seams' ghost ceiling found it).
- `src/water.js`: one line to build v17's surfaces.
- `tools/stream-frames.mjs`: frames in order down a stream, across it, or held, with contact sheets. `tools/outline-test.mjs`: the v17 section, and a stream's own level in the generic still-water checks.

## Tests (on 2fd2b66, origin/next merged)

- `ONLY=outline,threads,seams,geometry,roads,paths,regions,rocks,dressing,strata,walk,edges,heights tools/suite.sh 8161`: 13 tests, 0 failed (outline 70/0, threads 25/0, paths 86/0, roads 64/0, regions 56/56, strata 8/0, rocks 38/0, dressing 22/0, heights 200/200, geometry 134/0, seams ceiling PASS {seam 61, off 414, ghost 225} against {63, 414, 226}, walk and edges green). No row re-recorded.
- Before the rocks/trees fix the same run had 3 red: geometry span-east-stairs (a rock moved by the rock stream's shift, now back), seams ghost 230 > 226 (trees' stream, now 225), dressing's pegs ending at z 268.8 (the mere; now a bar).
- `node tools/walkers-test.mjs`: 19/20, the one red is P12's pit-lamps, red on main too (as the brief says).
- `node tools/canyon-test.mjs`: 13/13 (the river's shader untouched; the brook has its own program).
- `height-speed --base=origin/next --sets=valley,fen`: heightAt valley 1.001, 1.005, 1.132, 1.000, 1.020 over five runs on a machine the suite and other agents were loading (the 1.132 ran beside the suite's browsers); the fen's box swings 0.84..1.23 the same way. Every term is behind one box test.

## Frames (look in this order)

- `shots/wip/v17-W1-r9-down-medium-sheet-1..5.png`, `-across-medium-sheet-1..2.png`, `-down-low-sheet-1..5.png`, `-across-low-sheet-1..2.png` (60 and 24 frames, 1.4 m and 1 s a frame, `tools/stream-frames.mjs`).
- Fixed views at medium: `shots/wip/v17-W1-r9-{air-chain-down,air-brook,air-mere-swallow,span-deck-brook,walk-tarn-outflow,walk-brook-bay,walk-brook-traveller,walk-mere-north,walk-swallow-front}.png`.

## The blind reader (sonnet, frames only)

Round 7: the pools read as water; the running stretch "white confetti or gravel, a sparkle texture on a slope". Round 9 (after riffles became sky-coloured ridges and the water took a floor of the sky's colour): "a narrow stream/channel downhill between rocks ... white rapids ... a wide still pool"; Walk B "crosses a shallow rippled stream ... the best water, reads as moving"; still faulted: the quick run between the blocks "reads as orange scattered flakes, like gravel or fur, not clearly water"; a thin bright straight line at a step's far lip (the white water seen edge-on); foam streaks motion-blurred at the mere's mouth; one flat dark patch with a straight edge (sheet 4, 47-48). Not yet "running water, nothing wrong": it wants a second round.

## Still weak

- The quick runs: the riffle pattern from walking height reads as flakes, not a surface; the white at each step shows as a ruled line from upstream. Next: fewer, longer, softer highlights carried by the flow; the step's white feathered across its width.
- In the south trough's shade everything is dark; the brook from the deck reads as a pale thread (its stony margin), the mere from above as the tarn does (flat grey-green).
- On low the stream's core rides the drawn ground where the 3.1 m cells stand over it, up to 0.5 m over the true level: the walker's feet go under its surface there.
- The Swallow's cut is drawn as straight still water to the face (by design: a cut).

## Defaults taken

The brook rerouted from the table's line (it ran through crown piece 1); its pool level -6.05 (the hollow's core); the mere's level kept at -6.8; a bar under the pegs' line in the mere; no `?v17water` switch (a height param would change the bake's key).
