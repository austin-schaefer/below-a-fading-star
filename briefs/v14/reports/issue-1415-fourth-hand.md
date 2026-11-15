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

RESULTS
