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

## Parts 2 and 3 (second agent, 2026-11-17)

Scope from the orchestrator: part 3, then from part 2 only the folk from 20 m and the leaver's door. The white panels and the sounder at the wreck as a separate item were not done.

### Part 3, the act: "Take his letter" (`lagan-letter`, `src/v15/people/letter.js`)
- **Choice:** the critic's suggestion, taken as the clerk's own open thread in `stories/the-dead-letters.md` ("an act: take his letter").
- **What happens:** E, a captured click or a tap at the Lagan's counter, in front of the hatch. His arm goes out. The letter leaves his hand and comes up into the view, cream with a red seal. It is put away below the view by 2.1 s. He bends to the ledger lying open in the hatch, strikes one entry through in red and adds a tick (1.6 to 3.6 s). He looks up and nods, then reaches into the pigeonholes and has a letter again (5.5 s).
- **The mark that stays:** the red strokes in the ledger, one per letter taken. They are drawn from the count at every load and cleared by "Forget my marks".
- **Defaults taken:**
  - `every: 'visit'`.
  - Once you have taken his letter, he holds no more out for the rest of the visit.
  - No sound of its own, because the audio graph is shared. The `act-offer` cue still plays.
- **Code:**
  - The act is registered from the clerk's `init`, so `index.js` is untouched.
  - His letter moves to the prop bone, which follows his forearm; when he gives it, the bone is scaled to nothing.
  - `shops.js` hands over the hatch and ledger spots. The two hatch holes on the counter are kept clear of loose letters, which reshuffles the Lagan's random letters.
- **Tests:** `ONLY=touch,acts tools/suite.sh 8167` gave touch 45/45 and acts 173/0. That includes 10 new `lagan:` rows and a touch row for the offer and the tap.
- **Frames:** taken in a real browser with the pointer captured (`tools/act-walk.mjs ... lagan-letter v16-V1-act-e 88.7,-25.0`), at the offer and 0.3, 1, 2 and 5 s after: `shots/wip/v16-V1-act-e-01..05`, sheet `v16-V1-act-e-sheet.png`; close-up `v16-V1-act-d-*`.
- **Weak:**
  - The 0.3 s frame still shows the letter in his raised hand. It leaves at 0.1 s by the act's clock, so the frame lags.
  - From 3.5 m the red strike is small.

### Part 2
- **The leaver's door** is now a whole door, 0.84 by 2.02 m, standing half a metre over her hat. It has strap hinges and a top rail on the side toward her, and a lantern on a stick off its top corner. From the front it reads as a door in silhouette.
- **Folk from 20 m:** `tools/folk-frames.mjs` (new) raycasts from every 20 m standpoint on every floor and frames the best one. With an honest occluder list, 7 of 8 have a clear line from some standpoint both before and after; the clerk has none, being behind the rack. Nobody was moved.
  - The trouble is size at dusk, not walls, so added "tells": an ember lantern (emissive, no light) for the copyist, the sounder and the leaver, and three saffron hanks on a drying pole over the dyer.
  - Tell seen from: copyist 8, sounder 0 at the chosen standpoint, leaver 31.
  - Before and after, centre crops: `shots/wip/v16-V1-folk-zoom2-before-after.png` (full frames `v16-V1-folk-before2-*`, `-after2-*`). The sounder and the leaver carry now.
- **Weak:** the dyer, the child and the copyist are still hard to make out at 20 m, and the dyer's hanks were not confirmed in a frame. The burner, the noon-drawer and the clerk rely on what already glows: the kiln, the jug and the lit vault.
- **Test:** village 687/0.

### Leftovers from the part 1 review
`tools/village-walk.mjs` walks the head flight on the axis, and `plan.js` exports `HEAD_POST`, used by both the posts and the kerb (commit 3fa1625). The walk itself was not rerun.
