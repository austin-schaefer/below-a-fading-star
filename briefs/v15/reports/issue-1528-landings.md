# v15-W4: a stair's own wall does not shut its landing (issue-1528-landings)

The owner, after W1: "still got walls blocking people from getting from stairs to their own door", "here too", "still got a staircase blocked by a little footbridge", "yet another one", "and another", "i thought we fixed all these?". Then: "the stair logic is just wild across the board", and "lacks a little coherence and navigability". Branch `issue-1528-landings`, port 8169.

## The plan, before and after

`node tools/ways-plan.mjs <base> <out>` draws the village's circulation from the live page: every registered way by kind, its ends' levels, the houses' own flights, every door, every collider at walking height, the floor shaded by height, and now the spine.

- Before: `shots/wip/v15-W4-plan-before.png`, `shots/wip/v15-W4-plan-before-core.png`. There were 21 registered ways and 6 house flights.
- After: `shots/wip/v15-W4-plan-after.png`, `shots/wip/v15-W4-plan-after-core.png`. There are 19 registered ways: 17 of the old ones, plus W2's two ladders merged from `next`. There are 3 house flights.

## The owner's five places

All five were walked on the keys with the pointer captured (`tools/landing-walk.mjs tools/landing-walk-owner.json`), before on `origin/next` and after on this branch. The frames are in `shots/wip/v15-W4-before-0NN-*` and `v15-W4-after-0NN-*`. Each pair sheet has the before frames on top and the after frames below.

1. **7.png is the Heliarch upper flight's foot on the Mid Rung.** Two things stood in the Mid lane at either side of the landing: the newel that stood 0.35 m out past the cheek's end, and the stump of the broken Heliarch cheek (a coursed block 1 m high and 1.3 m long). Neither had a collider. The walker walked through them, and the eye saw a wall between the landing and the next door (rungs-mid-3 to the west, rungs-mid-4 to the east). Pair sheet: `shots/wip/v15-W4-pair-7.png`.
2. **8.png is the bastion on the Low Rung,** at the timber patch's foot and the foot flight's head. The bastion's parapets wrapped both of its near corners onto the Low tread, and a second cheek stump stood in the gap. The door beyond is rungs-low-3's. Pair sheet: `shots/wip/v15-W4-pair-8.png`.
3. **9.png is the Gullet,** with the third Leads crossing (rungs-low-4 to rungs-low-5) over its head at 0.6 to 0.9 m over the top treads. This is the very one W1 was briefed on. W1's fix did not hold because its rows read the colliders, and the crossing's collider was low; W1 changed the crossing's walls, not the crossing. Pair sheet: `shots/wip/v15-W4-pair-9.png`.
4. **10.png is the Tenter's head deck on the Mid Rung.** A stretch of the Mid nosing's plastered wall stood between the planks and rungs-mid-6's doorstep: that is the block and its coping slab. The bones' nosing walls left gaps only for the ways V0 knew, and the Tenter is a quarter's own way. Pair sheet: `shots/wip/v15-W4-pair-10view.png` (the third column; the walked frames are in `v15-W4-pair-10.png`).
5. **11.png is the Stump,** a Heliarch flight east of the pier. Its head was crossed by the same Mid wall and its foot went into rungs-low-7's end wall. It was never a way, but it read as a blocked one. Pair sheet: `shots/wip/v15-W4-pair-11.png`.

After the fixes, all 22 stops of the five routes are reached. Before, 20 of 20 were reached. The walker got through in every place because what blocked it was drawn with no collider: the owner's walls were walls to the eye only. That is why the new turn row counts drawn meshes as well as colliders.

## The ways judged (keep, remove, re-route)

| way | joins | verdict |
|---|---|---|
| heliarch-head-east / -west | crown to High | Keep. It is the spine's head, and the twin flights are its form. |
| heliarch-upper, timber-patch, heliarch-foot | High to Mid to Low to bench | Keep, as the spine. The stumps go, the cheeks end at the last tread and the bastion opens to the Low. |
| noon-main | High to bench, through the Mid | Keep untouched (the owner). Its mouths are clear: turn, mouth and landing rows pass. |
| rungs-ladder, new-house-ladder, strake-new-ladder | ladders | Keep (W2's). |
| rungs-mid-1-stair | Mid to High, at the west end | Keep. It is the only way between those treads within 15 m. |
| rungs-mid-2-stair | Mid to High | Remove. Its foot was 4.4 m from rungs-mid-1's. |
| rungs-mid-3-stair | Mid to High | Remove. It was 7 m from the upper flight. |
| rungs-low-3-stair | Low to Mid | Remove. It was 6 m from the timber patch. |
| rungs-mid-7-stair | Mid to High, on the east run | Keep. |
| rungs-leads-1, -2 | roof to roof | Keep (a pleasure). |
| rungs-leads-3 | roof to roof, over the Gullet's head | Remove. The Gullet's head joins those two roofs already. |
| rungs-gullet | Low to Mid, at the corner | Keep. |
| rungs-tenter | Low to Mid | Keep (a pleasure). Its head is opened. |
| lane-bridge | Mid to the pier | Keep: it ends at a lookout. |
| lees-stair | bench to Low | Keep. |
| pennyworth-ramp | bench to foot | Keep, as the spine. |
| quarrels-stage | crown to the Hustings | Keep: it ends at a lookout. |
| the Stump (not registered) | none | Remove (11.png). |

The three removed house stairs leave their houses standing, each without its outside stair. Each roof is still walked onto from the tread at its back.

## The spine

`src/v15/plan.js SPINE` is the one main way through the village:

1. the masons' court on the crown;
2. the head's west flight;
3. out onto the causeway, to the upper flight;
4. the upper flight, the timber patch and the foot flight;
5. the Lees' street east;
6. the ramp;
7. the Slip and the Thumbway, to the Pomegranate House's south door.

The spine is drawn yellow on the plan. ways-test checks that it is joined, lit and 1.5 m wide. It had two dark stretches, so two lamp posts are added in `LAMPS`: one on the causeway's edge by the upper flight's head, and one on the bench beside the foot flight. I walked it top to bottom and bottom to top on the keys with no map: 66 of 66 stops reached. The frames are `shots/wip/v15-W4-spine-0NN-*`, with sheets `v15-W4-spine-down-sheet.png` and `v15-W4-spine-up-sheet.png`.

## The kit, at the cause

- `ways/stairs.js stoneFlight`: the cheeks and newels end at the last tread.
- `ways/stairs.js hexLanding`: a parapet stands only where the ground outside falls from the landing. It is left down within 0.9 m of the tread the landing stands out from, gets a newel at the cut, and has a collider where it stands.
- `ways/index.js gaps`: the nosing wall leaves the Tenter's head open.
- `houses/late.js`: a front-stair house hangs its lamp on the far side of its door. Half of them had hung it over the stair's lowest treads at 1.6 m, which the headroom row found.
- `quarters/pennyworth.js`: any door over a fall within 2 m gets slabs down to the ground. pennyworth-hitch-4's doorstep stood 0.7 m over the Hitch with no step, which the door row found.

## The new rows (`tools/ways-test.mjs`)

- `turn`: from each end, in every direction the level runs, a body reaches 2 m out. Colliders and drawn meshes are both counted.
- `door`: every house door's step is reached on foot from each way's end within 8 m.
- `headroom`: a ray up the way's line, against the drawn meshes, finds nothing from 0.6 to 2.1 m.
- `spine`: as above.

Run on the before tree (origin/next before this branch), the final test gives 220 passed and 16 failed. The new rows' failures:

- turn: 4. heliarch-upper foot (7.png), heliarch-foot top, which is the bastion (8.png), lane-bridge foot (the Mid wall at the Tenter, 10.png), and rungs-leads-2 top.
- door: 1. pennyworth-hitch-4.
- headroom: 5. rungs-gullet (9.png), and four house stairs under their own lamps.
- spine: no rows, because the before tree has no `SPINE`.

The other six failures were W2's ladders' tops on that snapshot, fixed on `next` since.

After the fixes: 219 passed, 0 failed.

The rows did not fail on their first draft; they were tuned to drop false findings. The first draft of `turn` used straight lines and flagged a chimney beside a stile. It now floods around things. It also excludes a direction where no body stands (a slot between two houses, inside a tower) or where the walker would be under a deck. `headroom` starts at 0.6 m, so a knee-high parapet's top on a path is the turn row's business, not this one's.

## Tests

The commands (`SHOT_ANGLE=metal nice -n 10`, port 8169) and their counts:

- `node tools/ways-test.mjs`: 219 passed, 0 failed.
- `ONLY=ways,village,village-plan,geometry,roads,walk,hop,edges,heights,house,strata tools/suite.sh 8169`: 10 of 11 green (by PASS lines):

  | test | PASS lines |
  |---|---|
  | roads | 67 |
  | village-plan | 7 |
  | strata | 8 |
  | village | 687 |
  | ways | 219 |
  | house | 20 |
  | walk | 13 |
  | hop | 25 |
  | edges | 214 |
  | heights | 198 |

- geometry failed, 131 passed and 1 failed. The failure is new: one `backs` finding at `lappet-heliarch-upper`, at (71.4, 9.7, -24.9). It is the underside of rungs-low-3's roof slab, seen through the slab's top: the top lies in the Mid Rung's tread plane and the check does not take it, and it shows since rungs-low-3's stair went. I judged it a check artefact and recorded it in `tools/geometry-baseline.json` with that reason. I did not prove it by a render: a frame from the stand shows the roof's top. The place then gives 18 passed, 0 failed, run with the Tenter's and the Gullet's places.
- The whole-village walks (`tools/village-walk.mjs`):
  - keys: walked: yes, the ladder taken twice. One run first stuck at the ladder's foot, where W2 works; the rerun passed unchanged.
  - touch: walked: yes, the ladder taken twice. The first run went over the Mid Rung's lip at the gangway, along a strip my first, wider Tenter gap left outside the wall. The gap is now the deck's span.
  - `ROUTE=rungs`: walked: yes, 9 of 9 ways. Its tail, rungs-mid-7, sat inside a comment before and is walked again.
- The owner's five places (`tools/landing-walk.mjs tools/landing-walk-owner.json`): 22 of 22 stops reached, pointer captured.
- The spine (`tools/landing-walk.mjs tools/landing-walk-spine.json`): 66 of 66 stops, down and up.

## Still weak

- The foot flight still lands facing the Pomegranate House's turret, 1.7 m off (W1's note). The spine passes between them at about 1.5 m.
- The ramp, the Slip and the Thumbway are a 35 m switchback to a door 2 m from the ramp's head and 3.9 m below it. It is the only way down the ha-ha.
- The Pennyworth's houses are open ground from its ramp. The door row passes them, but none is on a way of its own.
- The turn and door rows use flood fills on a 0.25 m grid. They find shut landings and pockets, but they do not judge a squeeze a body fits through.
- The Stump was a named place on the owner's list (#76): it is gone. The Pier Stair stands in for the Heliarch hand at the Squint.

## Round two (the orchestrator, on the spine)

1. **The foot flight still faces the turret: not fixed.** The turret is the Pomegranate House's north-west corner. Its middle is at run 1, s 30.6, D 23, on the stair's own axis (s 31), and its face is 2.0 m from the last tread.
   - I tried moving the bastion 1.2 m in onto the Low Rung's edge, which steepens the timber patch to 0.244 m of going. The frames before and after barely differ: `shots/wip/v15-W4r2-pair-foot.png` (top row next, bottom row the move). The turret still fills the view down, and the patch became a 45-degree stair, so I reverted it.
   - Turning the flight toward the fountain needs about 30 degrees west. The Strake's new house (s 21.2 to 28, out to D 20.8) stands in that line. Turning east opens onto the ramp, not the square.
   - What would open it: move the turret (a v8 set piece), or narrow the Strake's five slots from 6.8 m to 6.4 m. Narrowing frees 2 m, but the fountain is placed on the sherd's line and would move with it. Both are the owner's call.
2. **The ramp stays the spine.** A direct stair from the bench to the south door would have to run down the revetment through the cloth booth. Its poles lean on the revetment's own line, and it fills the door's pocket. The ramp is the Pennyworth's market street, with two stalls and the booth under it, the garden, the well and the Slip, and the switchback passes them. It is lit at both ends, and the spine walk takes it both ways. I did not show it reads as the obvious way: the Slip back to the door is still a turn a stranger has to find.
3. **The Gullet's head:** the two dark blocks were the head deck's baulks, run on 0.35 m past its planks over the top tread, and the bar was the planks' edge between them. The baulks now stop under the planks (`bridge(..., over: [a, b])`). What is left is the top step's plank edge, at the level of the top step. Before: `deploy/shots/wip/v15-W4-orch-011-9-gullet-mid-up.png`. After: `shots/wip/v15-W4r2-gullet-003-9-gullet-mid-up.png`.

`tools/landing-walk-owner.json` no longer has the stop where the Stump was.

Spine walk (`tools/landing-walk-spine.json`): 66 of 66 stops, down and up. After plan: `shots/wip/v15-W4r2-plan-after.png`.

Tests: `ONLY=ways,village,village-plan,geometry,roads,walk,edges,seams,heights tools/suite.sh 8169` gives 9 of 9 green:

| test | PASS lines |
|---|---|
| ways | 219 |
| village | 687 |
| geometry | 132 |
| edges | 214 |
| heights | 198 |
| roads | 67 |
| walk | 13 |
| village-plan | 7 |
| seams | 3 |
