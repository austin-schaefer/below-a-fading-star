# v15: the Lappet (the village under Carcanet Keep)

## What was chosen, and why

The owner named it, in session, 2026-11-15: "time for a truly ambitious milestone! let's build out #20", the keep and the Pomegranate House joined by a village. Their bounds, in their words:

- "integrate multiple eras of the world's history into the architecture, to give the feeling parts of this place are new-built and parts carved out of the rubble of much more ancient (and more advanced) civilizations"
- "cohesive and widespread: for space, it should run all the way from the citadel up/down the hillside to the current pom house. i am fine losing the yews, and the little spooky circle guy if needed"
- "integrate stairs, maybe even ladders, and other verticality"
- "a mix of things: little houses, a square or two, a fountain perhaps, some possible shops"
- "treat these as rough bounding boxes for a WIDE brief. knock my socks off, be ambitious, really build something inspired."

Riding along, because they are the owner's and they fit: the faults found in the hour after v14 (#59 the causeway's end, #60, #61, #63) and the harness issue #64 (nothing checks geometry; the looking got shorter). A village is geometry at arm's length from end to end, so #64's check and its walk-before-merge are built first and used on every brief here.

Passed over for now, and why: #20's second inn at the gates by the setting sun (the owner's bounds this time are keep to house; it is the natural next beat, and the merchant's reason to travel); #62, #56, #57, #18, #23, #30, #22 and the agents' #28 and #33 stay in the pool.

## The idea

**The hill is a stair nobody alive could climb.** The scarp under the keep (13 m in 15, bearing 36 from the keep to the house) is uncovered as what it always was: an Elder revetment, three giant steps of cyclopean block, each riser four metres, made for no human leg. Every people since has had to get up and down it, and each cut its own way in its own hand. So the village is read as strata, bottom to top and side by side:

- **Elder** (the bones): the three steps and their risers, triangles etched in them, a socket or two whose purpose nobody knows. Everything else sits on, in or against these.
- **Heliarch** (the order): a processional stair cut straight through the steps on the line from the keep's fallen corner to the house, exact and symmetrical, hexagon landings, and now broken in the middle; an aqueduct stub from the keep's hill; vaulted undercrofts let into the risers, their round arches now shopfronts and byres.
- **Noonwright** (the advanced ones, and the strangest): a daylight main, a glazed tube big enough to walk in, laid down the hill beside the stair and cracked open in places, so that a stretch of it is a covered lane; stalled carriers taller than a house, one lying on its side with a door cut in its belly and a chimney through its shoulder; the fountain in the square is a carrier's broken punt that still wells a little stored daylight in place of water.
- **Late folk** (the living): crooked lime-plaster houses stacked up the steps so that one house's roof is the next one's yard; ladders, plank bridges, outside stairs, washing, awnings, shops in the old arches. Saffron, cream and rose, worn (the critics called the house's first colours "toy town": dirt, patches and limewash over everything).
- **New** (this year): at the top, masons quarrying the keep's own fallen corner for a house that is half built: fresh-cut ashlar still pale, raw timber scaffold, a lime pit, a sledge on rollers. The only new thing in the valley, and it is made of the oldest thing they could reach.

A visitor should be able to stand in one spot on the middle step and see three stairs of three ages side by side, only the newest and meanest of them whole.

### The ground (the bones every brief builds on)

Polar from the keep's centre (37, 31), bearing 0 = -z, 90 = +x. The village takes the hill's north-east sector, bearings about 0 to 90, from the keep's wall to the house and round the house's east and west sides to its gate.

| Quarter | Where | Ground | What it is |
|---|---|---|---|
| **The Quarrels** | the crown, r 42 to 52, round the fallen north-east corner | y 18 | the masons' yard and the new house; the upper square; the stair's head. A quarrel is a squared stone. |
| **The Rungs** | the scarp, r 52 to 66 | three steps, y about 14, 10 and 6, each 4 to 5 m deep | stacked houses, roofs as yards, ladders, bridges, the three stairs, the tube lane |
| **The Lees** | the bench, r 66 to 77 | y 3.1 | the main square, the fountain of noon, the shops in the undercrofts |
| **The Pennyworth** | below the ha-ha, r 77 to the house and round it | y -0.8 | the lower market, gardens and stalls, the lane to the house's gate, and a door let into the house's south wall so the village arrives at it |

Names are `[Proposed]` and the lead brief's to bend, in the valley's voice (a definite article and one rare, exact noun; people are offices, never names). The village is **the Lappet**: the keep is a carcanet, a collar, and this is the piece that hangs from it.

Lost, on the owner's word: the Demesne's yews on the scarp and ring between bearings 0 and 100, the ashlar `demesne-blocks` in the corridor (reused as the quarry's stock), and the Indistinct if it cannot be given a place (first choice: it keeps its ditch west of the village, bearings 300 to 360; second: it is the thing at the end of one lane after dark).

### Who is there

Plain stories, each a someone with a petty want (`storytelling`), and each answering a thread the library already has open: the fountain that runs on noon and the Leerie's flasks beside it (who draws the noon); the dead-letter counter in a Heliarch doorway with one pigeonhole stuffed full (the traveller's sealed letters); the slipper-maker's window with one left slipper alone on the last (the slipper's mate); the vintner with twelve hooks and eleven bottles (the eleven); the salt-weigher's stall with a Twk perch and the pedlar's empty peg; the dyer's stair, saffron cloth down the steps and a bedroll in an upper window (she who waited on the Span); the picture-framer with a frame sized for the Prospect. Batch 3 chooses among these and adds its own.

## What a visitor should notice

1. From the spawn road and the east kerb: where there was a dark lawn with yews, a hillside of lit windows, stairs and smoke between the keep and the house, and it is plainly old at the bottom and new at the top.
2. They can walk in at either end and go up or down by at least three different ways (a stair, a ladder, the tube), cross a roof, cross a bridge over a lane they walked a minute ago, and stand in a square with a fountain that gives light.
3. Each age is told from the next without a card: giant blocks, exact ashlar, glazed round things, crooked plaster, pale new stone.
4. People live there: figures at work, shops with something in them, things that connect to what they have met elsewhere on the walk.
5. Nothing flickers, floats or shows its back (#64), and the walk is no slower on a phone outside the village and not badly slower inside it.

## Done when

- The four quarters are built on one plan, joined, walkable end to end both ways on the keys and on the touch stick, on low, medium and high; every way up is registered (`ctx.ascents.add`) and has a lamp or a worn foot.
- All five strata are present and a blind reader, given renders alone, names at least four distinct builders and says which is oldest and which is new.
- At least: two squares, the fountain, six shops with contents, twelve houses, three ways between each pair of adjoining levels somewhere in the village, one climbable ladder, one roof walk, one bridge over a lane, one stretch walked inside the tube.
- At least eight villagers and four plain stories with story files; cards and map stands for the village and its quarters; the house's south door.
- The village has a sound (a bed and at least three cues) and reads at the gutter and after dark by its own lamps.
- `tools/geometry-test.mjs` (#64) is in the suite and green on the village and on v14's underground; every walkable place new in v15 has been walked frame by frame by an agent that did not build it.
- #59, #60, #61, #63 are fixed, each with a frame that shows it.
- The whole suite is green on `next`; `perf` and `load-probe` on low are within the milestone's budget: the village in view costs at most 30 draw calls and 250k triangles at low in total, and a frame at the spawn costs no more than it does on v14.

## How it is built

Two surveys (2026-11-15, read-only) are summarised here; check, do not trust.

- **Ground.** `heightAt` (`src/height/field.js:345`) is shared; the Demesne's height hook (`src/v4/regions/height/`) already cuts the ha-ha and the keep crown is `flatten(..., 40, 55, 18)`. Terrain cells are 2.08 m (high) to 3.1 m (low), so a four-metre riser is built masonry with walkables over a terrain ramp underneath, never a step in the mesh. A height change reruns the whole suite and `tools/height-check.mjs`.
- **Walking.** `ctx.addWalkable` in three kinds (raise-only; `{replace:true}`; `{stack:true, keep}` for one floor over another), a 0.6 m riser, the edge guard at 1.5 m drops, capped colliders stood on. A roof over a lane works today. No ladder is climbable yet.
- **Building.** One merged mesh per site through the structures `Builder` (`src/structures/geo.js`) in the shared stone shader; hands' parts from `ctx.strata.parts` (`src/v8/strata.js`); Elder masonry `ctx.kit.masonry`; flights `ctx.kit.stair`. The models: `src/structures/taverna.js` with `src/v8/house/` (lamps, folk, props, sound), and the Lantern Halt (`src/v9/waystation.js`) for a small mixed-hand site. No occlusion culling above ground: the village is a few big merged meshes by quarter, far things dropped by `src/v12/far.js`.
- **In the way.** The causeway crosses the corridor at about d 53 (y 13 to 16) and rings the hill; leads P41, P9, P49, K1 and rivulet R3; the ha-ha at r 77; peafowl round (75, -15); the Tesserine Moles at (75, 0); the Leerie's standards beside K1; the house's 54 lamps. The house's only gate is in its north wall at (95, -58).
- **Code lives in `src/v15/`**: `plan.js` (the one source of the village's levels, plots, lanes and ways, three-free so tests can read it), a module a quarter, the kits.

## Status

**2026-11-15, 20:05 PST. Opened; batch 1 is dispatched.** The owner started the run at 19:17 with the words quoted above and `/loop 30m` to check on it. Issues #20, #59, #60, #61, #63, #64 are `in-progress`, `v15`. Two read-only surveys (the hillside's geography and code; the story library) and six frames of the hillside today (`shots/wip/v15-before-*.png`, `v15-plan-map.png`) made the plan above.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| V0 the bones: plan, ground, ways (`brief-v15-V0-bones.md`) | `issue-1500-bones` | 8161 | fable |
| V1 the houses: the kit and one finished row (`brief-v15-V1-houses.md`) | `issue-1501-houses` | 8162 | fable |
| H1 the geometry check and the walk (#64) (`brief-v15-H1-geometry.md`) | `issue-1502-geometry` | 8163 | opus |
| F1 the faults after v14 (#59 #60 #61 #63) (`brief-v15-F1-faults.md`) | `issue-1503-faults` | 8164 | opus |

Next: as each reports, look at its frames with the report shut, run its tests, a cold review, merge into `next`; the whole suite once on `next` for the batch (V0 changes the height field). V1's row is the "one before nine": a blind reader on its frames, and the paths left here for the owner, before batch 2 (the four quarters, one agent each, `briefs/v15/index.md`) is written from what V0 and V1 taught.
