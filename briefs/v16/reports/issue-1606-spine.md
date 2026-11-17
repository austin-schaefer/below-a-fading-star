# v16 V1, the spine's head (issue-1606-spine)

> 🤖 Written by an automated implementation agent, 2026-11-17.

**Done: part 1. Not done: parts 2 and 3** (one finding for part 2 is below; the session ran short of room. The brief's order puts part 1 first).

## Part 1, the spine's head
- The bastion and its two flights along the riser are gone. Now **one Heliarch flight runs straight down the crown's rim on the stair's axis** (`heliarch-head`, 16 risers of 0.25 m over 4.4 m) onto the causeway. Its foot is 3.1 m short of the upper flight's head, and the High Lane passes between them. The rim's face is opened behind the flight (`claim`: riser `rim`): the face was a wall to the flight's upper treads. Pale nosings (`stoneFlight` `nosing: true`) make the steep flight read as steps from under it. The kerb gap is ±2.6 m and its posts are at ±2.1 m. Two new lamp posts stand at the foot (`head-foot-west`, `head-foot-east`) in place of `head-west-foot`, `head-bastion` and `head-east-foot`. SPINE, GEOMETRY_PLACES and roads-test FEET_OPEN now name the one ascent.
- Guard: `ways-test` `axis` rows walk the axis up (from the upper flight's foot onto the crown) and down (to the Mid Rung's landing) with W held and the look never turned. Both failed on v15's form. The rim row skips where a way leaves the rim.
- The walk on the keys: `tools/landing-walk-head.json`. Before: 9 of 17 points reached, stuck at the bastion both ways. After: 17 of 17.

## Tests (port 8196: 8166 was taken by another session's server)
- Before merging origin/next: ways 271/0, geometry (lappet-heliarch-head, -upper, -high, -crown, quarrels) 29/0. The one row that is mine is the new place's `backs|lappet-heliarch-head|rungs-houses`, a Mid Rung roof's underside, recorded with its reason. In the full run, v12-lift-lower (a pebble), v12-icefall and span-east-stairs were not mine. strata 8, village-plan 7, village 687, dressing 22, walk 13, hop 25, heights 200.
- After merging origin/next: ways 271/0, walk 13, hop 30. roads fails 3 rows (P23 grade, P17/P23 dry-shod, P7 Bletting collider). origin/next fails the same three.
- acts and touch were not run: nothing of theirs was touched.

## Frames (shots/wip)
- Before: `v16-V1-before-walk-005-head-up-u4-ahead.png`.
- After, up: `v16-V1-r4-walk-001` to `009`.
- After, down: `v16-V1-r5-walk-010` to `019`. These look down the axis.
- Route sheet: `route-lappet-heliarch-head-medium-sheet.png`.
- Blind reader (sonnet) on the r4 frames:
  - Up the stair: "Wall: no" at every frame.
  - Down: the stair is found at the head. Before the head, the r4 frames looked along the crown, not down, and were retaken as r5. r5 was not read by a helper.

## Part 2 finding
The critic's "blank white panels" are not cloths. They are plain limewashed end walls:
- `lees-house-3` (the Rebate) at (107.7, 5.3);
- the plaster house in `rungs-cantle`'s lap at (87.2, -7.2).

Frames: `v16-V1-before-mid52-back-b.png` and `v16-V1-before-lees72-ahead-b.png`. Weathering the sides of `room()` (`late.js`) by vertex colour was tried. It was too faint to see, and it is reverted.
