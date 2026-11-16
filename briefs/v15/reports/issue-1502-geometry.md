# v15-H1: the geometry check and the walk (#64): report

Branch `issue-1502-geometry`, port 8163. 2026-11-15.

## What changed

- **`tools/geometry-test.mjs`** (in the suite as `geometry`, after `heights`). One page load on low. For each place in `tools/geometry/places.mjs` it stands the walker in the place, takes every drawn face in the place's region from the page in world space (`tools/geometry/extract.js`), and judges them in node (`tools/geometry/analyze.mjs`). It looks for four things:
  - **coplanar**: faces in one plane, overlapping, and shading differently;
  - **floating**: groups of pieces held by nothing, and **loose ends**, where a support is held at its top and its lower end touches nothing;
  - **backs**: the back of a one-sided face is the first thing a ray from a standing eye meets;
  - **sky**: a ray from a sealed stretch meets nothing.
- **The fixture.** It is planted in the air over the spawn, never in the world's files. It holds one fault of each kind (a plate laid in a plinth's top, a strut in air, a stay ending in air, a one-sided wall seen from behind) and a sound twin of each. Every fault must be found, and no twin.
- **`tools/geometry-baseline.json`** holds the 667 findings on `next`, counted in 75 groups (kind, place, mesh), with a reason or issue beside each. A group that grows, or a new group, fails its place.
- **`tools/route-frames.mjs`** takes frames every metre along a route (ahead, right, back, left, down, up) and makes a contact sheet. It also has a `findings` mode that frames the worst findings.
- **The skills.** `world-code` (tests before pushing, reviewing a branch), `orchestrator` (step 2 of checking and merging) and `critic.md` (its floor: 30 min plus 10 per 25 m of new walkable route, and a walk a metre at a time) are sharpened. `runtime.md` describes both tools and the v15 hook.
- **The v15 hook.** `src/v15/plan.js` exports `GEOMETRY_PLACES`, in the same shape as `places.mjs`. Both tools read it when the file exists.

## Tests

`ONLY=geometry tools/suite.sh 8163`: **18 PASS, 0 FAIL, 27 s.** The suite's whole run grows by about 30 s, well under the four minutes allowed.

## The three live issues: found, reproduced, in the baseline (F1 fixes them)

- **#60** is in groups `coplanar|*|passage-portal` (12 findings), `backs|*|passage-portal` and the loose faces at y -26. The portal's ceiling faces at y -28.2 overlap in one plane over 3.4 m².
  - Frames from the same stand a step apart, with the stripes changing: `shots/wip/geometry-60-before-a.png` and `geometry-60-before-b.png`.
  - Close frame: `geom-b-findings-medium-06-coplanar-v14-passage.png`.
- **#61** is in group `backs|v14-passage|coffin-road` (12 rays from 6 stands at 247.3, -17.0, 57.2). The stair down from the Nave's door into the passage has its risers facing up the stair (normal -z, in `coffin-road`'s mesh). From the passage you see through them to the lit carrier.
  - Frame: `route-v14-passage-medium-m007-3back.png`, the owner's picture.
- **#63** is in group `floating-end|v14-descent|coffin-road` (27 findings). The stays under the planks laid on the carriers are held at the plank and end in air, 0.5 to 1 m long.
  - Frame: `own2-findings-medium-01-own63-a.png`, the owner's view.

## Every finding on `next`, by kind (group, count)

These are the 75 groups in `tools/geometry-baseline.json`. Besides the three issues, none has been judged. The ones looked at in a frame:

- **Stands inside closed walls.** House taverna backs: some are the walker set inside a closed gallery. The test now leaves out stands where a quarter of the rays hit a back within 1.5 m.
- **Lift-gallery deck.** The deck slabs and gratings float relative to one another. Their joints are under 5 cm, and the gallery's hangers or the cliff are not in the faces taken, so they read as sound but unproven.
- **Lift lower station.** Its stands are now a path in.
- **Gulf sky.** The findings were the region being too low, and are fixed by `half: 16`.

| kind | groups and counts (worst position) |
|---|---|
| coplanar | v12-stair: stair-kerbs 86 (252,4,-51), stair-stub 24, landings-0/1/2 12/3/4, stair-lattice 3 (219,106,-48); v12-lift-gallery cells 24 (-375,135,-81), cage iron/parts 1/1; v12-lift-lower station 2; v14-descent noon-road-glass 20, coffin-road 8 (247,-17,55: the Nave door's stair); v14-passage coffin-road 7, noon-road-glass 2; passage-portal 12 ×3 places (#60); house taverna 4, props 1 |
| floating (group) | v12-icefall crystals 23 (74,22,-298), ice 8, pebbles 4+2; v12-lift-gallery deck 7, cells 3, cage iron 3, cage parts 1, gangway 1; v12-lift-lower adust-dead-heather 8; v12-stair stair-beds 8 (241,2,-50), stair-home 1; v14-passage passage-line 8 (244,-18,72), flute 2; v14-pit-stair paths-pit-lip 4, pit-slabs 3, pebble 1; v14-descent coffin-road 2 (270,4,48), nave-hall 2; house taverna 15 (101,2,-59), props 5, lamps 4 |
| floating (loose end) | v14-descent coffin-road 27 and v14-passage coffin-road 4 (#63); v12-lift-gallery deck 13; house taverna 7, props 6; pit-lead 1 (200,-32,185) ×2 places; stair-home 1 (225,105,-53); icefall crystal 1; noon-road-glass 1 |
| backs | v12-icefall terrain 66 (26,94,-372), crystals 6, bronze 3; span-west-stairs span-body 41 (-204,19,211); v12-lift-gallery deck 19; house taverna 45, lamps 17, props 1, demesne-blocks 1; v12-stair terrain 9, stair-home 1, stub 1, gorse 1; v14-descent terrain 10 (279,0,39: the moor seen from below at the hole's rim), nave-hall 1; v14-passage coffin-road 4 (#61), passage-gulf 6 (212,-30,152), line 1; passage-portal 4 ×2 (#60); v14-pit-stair terrain 5, pit-floor 3, pit-slabs 1 |
| sky | v14-passage 2 (245,-19,62; 208,-29,164), two rays each: probably seams |

The frames for the ten worst of each kind, as the check measured them, are in `shots/wip/geom-final-findings-medium-*.png`, sheet `geom-final-findings-medium-sheet.png`.

## Route frames (the proof of the walk)

- The Pit stair: 67 m and 402 frames. Sheets `shots/wip/route-v14-pit-stair-medium-sheet.png` and `-sheet2.png`; frames `route-v14-pit-stair-medium-m###-*.png`.
- The passage's entry from the Pit (place `v14-pit-floor`): `route-v14-pit-floor-medium-sheet.png`. Metres 20 to 23 walk through #60: the purple slab and the striped ceiling at the mouth.
- On medium, the Pit stair's frames are mostly dark violet: the walk shows the light there as it is, and the lamps read only near.
- Also the Nave's hung stair (`route-v14-descent-medium-sheet.png`, 0 to 30 m) and the passage's first 10 m (`route-v14-passage-medium-sheet.png`), where #61 was found.

## Fixes made

None in the world. No finding outside F1's files was plainly a one-line fault without a closer look. The v12 stair-kerbs and icefall groups are the next to judge.

## Defaults taken (also in the commits)

- **Tolerances:**
  - touching within 5 cm (a deck's joints are not gaps);
  - coplanar within 4 mm, 1.8°, over 0.02 m², and only faces that shade differently (one material, the same vertex colour, normal and uv cannot be seen to fight);
  - a decal (a flat sheet within 8 cm of a parallel face) is not floating;
  - a loose end counts only when the free end is a third of the length lower than the held end (a level arm is a bracket, an upright tip a finial);
  - backs need at least 2 of 320 rays.
- **Exemptions** go by whole word of the mesh name. The first cut matched 'rain' inside 'terrain'.
- **The baseline counts groups**, not single positions, so it stays at 75 lines.
- **`?pos=` takes only x,z.** For a floor off the ground the check prints the console line `__fp.controls.placeAt(x, z, y)`. Adding `pos=x,z,y` would be one line in `src/controls.js`, which is shared code, so it is left for the orchestrator.

## Still weak

- **What it cannot see:**
  - a face missing with nothing behind it (only a back or an escape to the sky is seen);
  - a part held by a wall drawn only in a shader;
  - BatchedMesh trees;
  - skinned figures.
- **Disc places** (the house) put stands in rooms a visitor cannot reach. Routes are better.
- **Only low is checked.** Medium and high may build other faces.
- **Most of the baseline is unjudged.** Its 75 groups are a list for the orchestrator, not a verdict.

## Round 2 (after the cold review)

- **Empty places fail.** A place fails when it has fewer than 100 faces beyond the ground and the exempt, no usable stand, or a TRUNCATED take (one check line a place).
- **The village hook fails closed.**
  - If `src/v15/plan.js` exists but will not import in node, or exports no `GEOMETRY_PLACES`, `geometry` fails and `route-frames` exits 1.
  - V0's first cut (`origin/issue-1500-bones:src/v15/plan.js`) imports cleanly in node: 42 exports, no imports. It has no `GEOMETRY_PLACES` yet, so **merging it as it stands fails `geometry` until the export is added.**
  - The shape needed: `export const GEOMETRY_PLACES = [ { name: 'v15-…', pts: [[x, z, y?], …], half: 8, sealed?: [s0, s1] } | { name, c: [x, z], r } | { name, ascent: '<ctx.ascents id>', half } ]`, optional `exempt` and `anchor` (`{ meshName: reason }`) a place. `runtime.md` says plan.js must import nothing.
- **The baseline ratchets.** It holds each finding's position, rounded to 0.5 m, by group. A finding it does not hold fails; a held finding no longer found fails too, until `GEOMETRY_RECORD=1` rewrites the baseline (keeping the reasons). Matching is exact first, then within a metre.
- **The scene is frozen.** The page runs on Playwright's clock, paused after load and moved only by `runFor`. The lift and everything else that moves on its own repeat run to run.
- **The name lists are narrowed.** `EXEMPT` and `ANCHOR` are now exact mesh names or `prefix*`, each with its reason. `lift-cage-floor` and `icefall-leads` (a bridge) are no longer anchors.
- **The sky check is proved.** The fixture has an open room and a roofed room, each with a sealed stand.
- **Small fixes.** `route-frames` names frames by metres to 0.1, so `STEP<1` overwrites nothing. The suite line and `runtime.md` both say about 30 s.
- **`pos=x,z,y`.** One line in `src/controls.js`: the feet at y, on the floor there. Findings print it. Example, #61 from a URL: `?q=medium&pos=246.7,62,-17.4&yaw=0` (frame `shots/wip/geometry-pos-y-check.png`).
- **Tests.** `ONLY=geometry tools/suite.sh 8163`, three times: 41 PASS each (95 s, 48 s, 42 s, with other agents rendering), and identical per-place output (75 groups; 0 new, 0 fixed).
- **The hook, proved.** With V0's plan copied in, it fails ("exports no GEOMETRY_PLACES"). With a plan that imports a missing file, it fails ("will not import"). The file was removed after each try.
