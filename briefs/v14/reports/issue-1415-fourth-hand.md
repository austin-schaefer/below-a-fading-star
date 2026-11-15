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

- **The string:** seven carriers 6.9 m long and 4.6 m through, nose to tail on z 42, riding a third out of the water, no two alike (long and waisted bodies, rolled, two cracked and black inside, two netted in filament); three hold their light (the second faintly, the fourth and the last fully). The Late folk's planks, three dark boards 0.96 m wide (`PATCH` in `coffin-road/plan.js`), are lashed over each coupling and at the string's two ends. Over a coupling the walked floor is as wide as the planks (0.55 m each side of the line) and widens back to the road's 0.8 m over 0.85 m of the carriers' backs (`roadHalf`), so no foot stands over the gap between two noses; the north spur's gangway comes in at the west end as before.
- **The line they ran in:** six of its collars stand as hoops 6.7 m across down the nave, a hand clear of the colonnade (one a horn under the hole, one a horn by the sun), a bay of wall still up between two (the road goes through it), shards on three more.
- **Where it came down from:** west of the second hoop the line turns up in an elbow toward the hole, torn open underneath, its mouth to the sky; over the mouth a spun collector's cell on the line it took, stayed with filaments to the capitals; a smaller cell hangs fallen.
- **Adrift:** a gourd stood on its tail and alight in the north aisle where the column fell, a gourd rolled over under the hole, a lesser one alight in the south aisle, one alight at the west end, one nose-down, one sunk to its back.
- **The stage:** the stair lands on planks lashed to the back of the junction node (dimly alight under the boards); flasks of drawn light on its corner; a gangway north to the string; south, boards and cleats down a lesser carrier pitched to the door.
- **The door:** the lesser line's collar (r 2.9, with its ox-blood band) stands free 0.8 m out from the Heliarchs' square frame, its bore clear of the lintel's corners, its lower arc under the water outside the pitched carrier's nose and the boards.
- **The head:** on the trestles a glass bulb in a rope cradle with a carrying pole, a third full of light; in the shears' cage a flask of the same (the point of white-gold seen from the moor).
- **The floor** is 1.3 m over the water (it was 0.26): `ROAD_Y = NAVE.water + 1.3`. The door's sill is unchanged (y -16.78, x 246.7); the door spur slopes down to it (`spurY`). The rescue from the water and the held edges are as they were.
- **The story:** `stories/the-noon-road.md` (renamed from the-coffin-road); the index, the twelfth chair (the Sexton's forty graves open again) and the tender of the lattices touched. The card and the settings stand read "The Noon Road"; the tool is `tools/noon-walk.mjs`.

Names kept, because the passage (D1) reads them: `src/v14/coffin-road.js`, `src/v14/coffin-road/plan.js` (`DOOR`, `ROAD_Y`), `ctx.coffinRoad`, the module key `coffinroad`, the mesh `coffin-road`.

**For D1 at the merge:** `passage.js`'s ascent path starts `[DOOR.x, DOOR.z - 1.6, ROAD_Y]`; that point is now on the door spur's slope, so take its y from `ctx.coffinRoad.floor(x, z)`. The Bearers' Flight's story (the old people carrying their dead in) and its Sexton's candles no longer have the coffins to lead to.

## Tests

On `10817e0` plus the walk tool's door leg (2026-11-15), port 8161, in sequence; after merging `origin/next` (`a5b4d86`) `ONLY=paths,roads,strata,edges` again: 4 tests, 0 failed (paths 79, roads 59, strata 8, edges 136):

- `ONLY=edges,heights,strata,walk,hop,regions,paths,roads nice -n 10 env SHOT_ANGLE=metal tools/suite.sh 8161`: **8 tests, 0 failed, 3 min 34 s**: paths 76, roads 56, regions 56, strata 8, walk 13, hop 25, edges 136, heights 111 PASS lines.
- `ONLY=perf,loading,settings,audio ...`: **4 tests, 0 failed, 16 min 19 s**: settings 85, audio 101, loading 28, perf 29 PASS lines.
- The walk by hand: `nice -n 10 env SHOT_ANGLE=metal node tools/noon-walk.mjs http://localhost:8161 keys medium noonroad-walk2`: **walked: yes**, no page errors. From the trod to the shears, down the stair, the north spur, the road to the sun and back, down the pitched carrier to the sill (feet -16.58 at z 53.3) and in through the south door (feet -16.78, the sill, at z 56.2), back, up the stair and out. Never in the water. The touch stick was not walked.
- A ray survey (a scratch script, not kept) of the road band every 0.2 m: before the fix the walked floor's outer 0.3 m over each coupling had nothing drawn within 0.5 m under it; after it, only single samples between boards.
- JS a frame (`?perf=1&q=low`, 8 s standing on the road at (262, 42)): the module's update `coffinroad` reads 0.00 ms, the Nave 0.02 ms; render 1.54 ms (1.64 on the moor at the spawn side).

## Frames (`shots/wip/`)

- The finished road on low, after the fixes: `noonroad-c-low-{pair-8m,pair-30m,stair,top-lit,elbow,back-west,sun,stage,north,door}`; before them `noonroad-b-low-*` (the same poses; `-door` shows the old collar crowding the lintel).
- Medium and high: `noonroad-c-{medium,high}-{pair-8m,stair,elbow,top-lit}`.
- The walk: `noonroad-walk2-keys-medium-01..20` (`16-sill-door`, `17-inside-fall`, `18-inside-back` are the door). An earlier pass without the door leg: `noonroad-walk-keys-medium-keys-medium-*`.
- Step 1's vessel and the first build: `noon-one-{low,high}-*`, `noonroad-a-low-*`.

## Not done

- The touch walk, the around sheet and the descent on three tiers (the brief's three sets of frames): only the keys walk at medium and the four views at medium and high are taken. The low tier's histogram is not measured, though no low frame is black.
- A blind reader has not described the renders.
- The pillar tops at the rim and the orange bar in the sky from the stair: not looked at.
- Sound: no audio hook is changed; a step on the glass is the hard step.

## What a stranger would call them (my own read, not a blind reader's)

- The road: a line of great pale glazed vessels afloat nose to tail through a row of huge standing rings in a flooded hall, planks between them, one or two glowing.
- The people: makers of giant glass and ceramic pipework; not medieval, classical or elvish. A single carrier alone still reads nearest to a pill or capsule.

## Still weak

- The three dark planks over each coupling are the first thing the eye meets at 8 m; the carriers' backs between them are short.
- The water away from a lit hull is a flat dark plane.
- The sun on the east wall is dim (`-sun`): a mosaic in the dark with one lamp's glow under it.
- Looking into the south door from the sill is a black hole (the passage beyond is D1's).
- At the road's edges over a carrier's back the floor stands 0.25-0.5 m over the curved surface for the outer 0.2 m; a visitor sees no feet, but a low look down there shows the boards' level, not the hull's.
- The spun register is thin: one cell over the elbow, one fallen, two netted carriers.

## Defaults taken

- The Noonwrights; The Noon Road.
- The floor raised to water + 1.3 m so the carriers stand out of the water as vessels (at + 0.26 they were a glowing pool with a disc in it).
- The line's torn mouth is an elbow rising to the hole, not a mouth in a wall: it came down from the sky.
- The hoops stand on z 40.1, the only line a 5.7 m tube fits between the column rows; the string lies against their south limbs.
- File names, `ctx.coffinRoad` and the key `coffinroad` kept for the passage.
- `HANDS` has four; the sign test counts the three that drew the sun.
