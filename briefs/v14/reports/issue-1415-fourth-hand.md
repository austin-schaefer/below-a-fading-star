# v14-D3 report: the fourth hand, and the Noon Road (2026-11-15)

Branch `issue-1415-fourth-hand`, port 8161.

## The people and their hand

Names considered: the Meridiate (the brief's placeholder), the Garnerers, **the Noonwrights** (chosen: a trade name in plain words, like the Leerie, the Sexton, the Reckoner). The place card is **The Noon Road**.

- **Blown and cast, and spun.** Everything made in one piece and round in section (carriers, tubes, collars, nodes, lenses, beads, galls where a thing was joined or closed), in milk glass, bottle amber, celadon and one band of ox-blood glaze, now crazed, worn through to a dull body, streaked, chipped, weeded and limed at the waterline. Beside it a spun register: filament laced ring to ring at a tangent (the `cell`, the net round a carrier, the stays of the elbow's cradle).
- **The empty ring** is their mark (on every band, a row of them; every collar; every lens rim). They have no sign of the sun: `ctx.strata.SIGNED` is the three hands that drew it.
- **Stored daylight** `#ffedbd`: steady (it breathes, never flickers), lying low in a vessel's belly, seen through the black water under a lit hull, sent out over the water in slow rings.

Written into `visual-art/architecture.md` (the table's fourth row, "The fourth hand", what it must never be, and the owner's attribution of 2026-11-15: the sky's lattices and remnants are theirs, the Galleries' iron is not, the tender and the Leerie live off what they left; the lattices are not yet re-dressed). Parts: `src/v8/strata/noon.js`, reached as `ctx.strata.parts.noon` (`carrier` in four forms, `tube`, `collar`, `node`, `lens`, `band`, `mark`, `cell`; `put`, `strand`), adding into a structures Builder or an `UnderBuilder`; `noonGlass()` in `src/v14/noon-road.js`. `world-code/runtime.md` ("The fourth hand under the ground") and `modules.md` say how to use them.

## What the road is now

The shears, the hung stair, the hall, the water, the Heliarchs' sun and the south door stay. The coffins, the candles and their stands, the waiting coffin and the Sexton are gone.

- **The string:** seven carriers 6.9 m long and 4.6 m through, nose to tail on z 42, riding a third out of the water, no two alike (long and waisted bodies, rolled, two cracked and black inside, two netted in filament); three hold their light (the second faintly, the fourth and the last fully). The Late folk's planks are lashed over each coupling.
- **The line they ran in:** six of its collars stand as hoops 6.7 m across down the nave, a hand clear of the colonnade (one a horn under the hole, one a horn by the sun), a bay of wall still up between two (the road goes through it), shards on three more.
- **Where it came down from:** west of the second hoop the line turns up in an elbow toward the hole, torn open underneath, its mouth to the sky; over the mouth a spun collector's cell on the line it took, stayed with filaments to the capitals; a smaller cell hangs fallen.
- **Adrift:** a gourd stood on its tail and alight in the north aisle where the column fell, a gourd rolled over under the hole, a lesser one alight in the south aisle, one alight at the west end, one nose-down, one sunk to its back.
- **The stage:** the stair lands on planks lashed to the back of the junction node (dimly alight under the boards); flasks of drawn light on its corner; a gangway north to the string; south, boards and cleats down a lesser carrier pitched to the door.
- **The head:** on the trestles a glass bulb in a rope cradle with a carrying pole, a third full of light; in the shears' cage a flask of the same (the point of white-gold seen from the moor).
- **The floor** is 1.3 m over the water (it was 0.26): `ROAD_Y = NAVE.water + 1.3`. The door's sill is unchanged (y -16.78, x 246.7); the door spur slopes down to it (`spurY`). The rescue from the water and the held edges are as they were.
- **The story:** `stories/the-noon-road.md` (renamed from the-coffin-road); the index, the twelfth chair (the Sexton's forty graves open again) and the tender of the lattices touched. The card and the settings stand read "The Noon Road"; the tool is `tools/noon-walk.mjs`.

Names kept, because the passage (D1) reads them: `src/v14/coffin-road.js`, `src/v14/coffin-road/plan.js` (`DOOR`, `ROAD_Y`), `ctx.coffinRoad`, the module key `coffinroad`, the mesh `coffin-road`.

**For D1 at the merge:** `passage.js`'s ascent path starts `[DOOR.x, DOOR.z - 1.6, ROAD_Y]`; that point is now on the door spur's slope, so take its y from `ctx.coffinRoad.floor(x, z)`. The Bearers' Flight's story (the old people carrying their dead in) and its Sexton's candles no longer have the coffins to lead to.

## Tests

Run on the working tree that became `07ea3de` (plus the walk tool's door-spur checkpoint and this report, which touch no test): `ONLY=edges,heights,strata,settings tools/suite.sh 8161`: **4 tests, 0 failed, 13 min 5 s**: settings 85, strata 8, edges 136, heights 111 PASS lines. edges-test's water trial now measures from the water (the floor line moved); strata-test counts signs over `SIGNED` and wants the eight noon parts.

**Not run** (the run was called in before they started): `walk, hop, audio, perf, loading, regions, paths, roads` from the brief's list.

## Frames (`shots/wip/`), all on low unless named

1. The one vessel, step 1 (before ageing; the coffins still there): `noon-one-low-*` and `noon-one-high-*` (`lit-30m`, `lit-8m`, `lit-2m`, `lit-top`, `dark-30m`, `dark-8m`, `dark-2m`, `dark-top`, `pair-stair`, `up-12m`).
2. The road, first full build: `noonroad-a-low-pair-30m`, `-pair-8m`, `-stair`, `-elbow`, `-top-lit`, `-back-west`, `-sun`, `-stage`, `-north`, `-door`. These predate three small changes that are in the commit and have not been rendered: the last carrier fully alight, the hoop by the sun cut to a north horn, the water's meniscus line and slow rings round each hull.

## Not done

- **The three sets of frames the brief asks for** (the descent on three tiers, the walks on keys and touch, the around sheet): none taken. `tools/noon-walk.mjs` was started twice and stopped before its first frame; the road has not been walked by hand, only stood on in free-camera poses and walked by edges-test and heights-test.
- Medium and high tiers of the finished road: not rendered. The low tier's histogram: not measured.
- JS a frame on the hall floor against `next`: not measured (the per-frame flame sort is gone; nothing was added per frame but the lights' breathing).
- The blind reader's other notes: the columns' plaster patches are quietened (`v5/nave.js`); the pillar tops at the rim and the orange bar in the sky from the stair were not looked at.
- Sound: no audio hook was changed; the step on glass is still the hard step.

## What a stranger would call them (my own read of the frames above, not a blind reader's)

- The road: a line of great pale glazed vessels afloat nose to tail through a row of huge standing rings in a flooded hall, planks between them, one or two glowing.
- The people: makers of giant glass and ceramic pipework; not medieval, classical or elvish. The clean step-1 vessels read as a capsule or thermos; the aged ones less so, but a pill is still the nearest wrong word for a single carrier seen alone.

## Still weak

- The planks over the couplings are the first thing the eye meets at 8 m; the carriers' backs between them are short.
- The water away from a lit hull is still a flat dark plane.
- The sun on the east wall lost its warm candles and is dim in `-sun`; the fix (the last carrier fully alight, its lamp raised) is unrendered.
- The door is still the Heliarchs' square frame with nothing of the lesser line round it.
- The spun register is thin: one cell over the elbow, one fallen, two netted carriers.

## Defaults taken

- The Noonwrights; The Noon Road.
- The floor raised to water + 1.3 m so the carriers stand out of the water as vessels (at + 0.26 they were a glowing pool with a disc in it).
- The line's torn mouth is an elbow rising to the hole, not a mouth in a wall: it came down from the sky.
- The hoops stand on z 40.1, the only line a 5.7 m tube fits between the column rows; the string lies against their south limbs.
- File names, `ctx.coffinRoad` and the key `coffinroad` kept for the passage.
- `HANDS` has four; the sign test counts the three that drew the sun.
