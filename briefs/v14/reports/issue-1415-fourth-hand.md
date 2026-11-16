# v14-D3 report: the fourth hand, and the Noon Road (2026-11-15)

Branch `issue-1415-fourth-hand`, port 8161.

## The people and their hand

Names considered: the Meridiate (the brief's placeholder), the Garnerers, **the Noonwrights** (chosen: a trade name in plain words, like the Leerie, the Sexton, the Reckoner). The place card is **The Noon Road**.

- **Blown and cast, and spun.** Everything made in one piece and round in section (carriers, tubes, collars, nodes, lenses, beads, galls where a thing was joined or closed). **Glaze is the majority** (`GLAZES`, `put`'s `paint` in the part's own frame): each thing dipped in a field of celadon, ox-blood or amber glass, a broad band brushed round it, edges run toward the tail in drips (fired standing on their tails), the foot left bare milk as a potter leaves it, throwing rings on collars and tubes, a spiral of pulled amber glass on each carrier's shoulder, the body slumped a little narrow and never twice the same. Then crazed, worn through to the milk body, streaked, chipped, weeded and limed at the waterline, and a ragged lime crust at an old waterline 1.5-1.8 m up. Beside it a spun register: filament laced ring to ring at a tangent (the `cell`, the net round a carrier, the stays of the elbow's cradle).
- **The empty ring** is their mark (on every band, a row of them; every collar; every lens rim). They have no sign of the sun: `ctx.strata.SIGNED` is the three hands that drew it.
- **Stored daylight** `#ffedbd`: steady (it breathes, never flickers); a lit carrier is warm milk glass lit through its whole wall, brightest low in the belly, seen through the black water under a lit hull, sent out over the water in slow rings.

Written into `visual-art/architecture.md` (the table's fourth row, "The fourth hand", what it must never be, and the owner's attribution of 2026-11-15: the sky's lattices and remnants are theirs, the Galleries' iron is not, the tender and the Leerie live off what they left; the lattices are not yet re-dressed). Parts: `src/v8/strata/noon.js`, reached as `ctx.strata.parts.noon` (`carrier` in four forms, `tube`, `collar`, `node`, `lens`, `band`, `mark`, `cell`; `put`, `strand`), adding into a structures Builder or an `UnderBuilder`; `noonGlass()` in `src/v14/noon-road.js`. `world-code/runtime.md` ("The fourth hand under the ground") and `modules.md` say how to use them.

## What the road is now

The shears, the hung stair, the hall, the water, the Heliarchs' sun and the south door stay. The coffins, the candles and their stands, the waiting coffin and the Sexton are gone.

- **The string:** seven carriers 6.9 m long and 4.6 m through, nose to tail on z 42, riding a third out of the water, no two alike (long and waisted bodies, rolled, two cracked and black inside, two netted in filament); three hold their light (the second faintly, the fourth and the last fully). The Late folk's boards, two pale silvered planks a patch 0.96 m across (`PATCH` in `coffin-road/plan.js`), odd lengths, one bowed proud, are bound with cord at each end over each coupling and at the string's two ends. Over a coupling the walked floor is as wide as the planks (0.55 m each side of the line) and widens back to the road's 0.8 m over 0.85 m of the carriers' backs (`roadHalf`), so no foot stands over the gap between two noses; it narrows the same way beside each standing hoop's south limb and through the bay of the line's wall, so the eye keeps 0.3 m clear of the glaze (the near plane is 0.08 m). The north spur's gangway comes in at the west end as before.
- **The line they ran in:** six of its collars stand as hoops 6.7 m across down the nave, each glazed in its own scheme with a row of hand-set amber cells round both faces (a fifth fallen out, dark sockets), and a seventh fallen off its line, tipped half under the water between two columns north of the road's west end; a hand clear of the colonnade (one a horn under the hole, one a horn by the sun), a bay of wall still up between two (the road goes through it), shards on three more.
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

After the look pass (`54787a9`, 2026-11-15), port 8161, in sequence:

- `ONLY=edges,heights,strata,perf,settings,audio nice -n 10 env SHOT_ANGLE=metal tools/suite.sh 8161`: **6 tests, 0 failed, 14 min 25 s**: settings 85, strata 8, edges 136, heights 111, audio 101, perf 29 PASS lines.
- The touch walk, `node tools/noon-walk.mjs http://localhost:8161 touch low noonroad-walk-touch-low`: **walked: yes**, no page errors, in through the south door (feet -16.78 at z 56.6), never in the water.
- After merging `origin/next` with the Pit (`d329003`; conflicts in main.js, settings.js, the docs, edges- and settings-test resolved by keeping both sides): `ONLY=edges,strata,roads,paths,settings`: 4 ok (settings 86, paths 79, strata 8, edges 159), **roads fails one row**, `pit-stair`: "causeway ends 12.6 m from (187.6, 187.2)", the Pit's own way up (D2's), which nothing on this branch touches. Not confirmed on `origin/next` alone (my run of that failed to start).
- Before the look pass: `ONLY=edges,heights,strata,walk,hop,regions,paths,roads`: 8 tests, 0 failed (paths 76, roads 56, regions 56, strata 8, walk 13, hop 25, edges 136, heights 111); `ONLY=perf,loading,settings,audio`: 4 tests, 0 failed (settings 85, audio 101, loading 28, perf 29); after merging `origin/next` (`a5b4d86`) paths 79, roads 59, strata 8, edges 136; the keys walk at medium (`noonroad-walk2`): walked: yes, in through the door.
- JS a frame (`?perf=1&q=low`, standing on the road at (262, 42)): the module's update reads 0.00 ms, the Nave 0.02 ms. Triangles on low in the road view went from 1.21 M to 1.26 M with the glaze pass (the hoops' cells are the most of it).

## Frames (`shots/wip/`)

- The road after the look pass: `noonroad-j-high-{pair-8m,top-lit,elbow,stair,door}` and `noonroad-j-low-*` (the same five).
- Before it, the same poses: `noonroad-c-{low,medium,high}-*`.
- The review's checks: `noonroad-f-low-{hoop-s,wall-s,col-249,col-277}` (before the floor narrowed by the hoops), `noonroad-g-low-{hoop-s,col-249}` (after), `noonroad-i-low-fallen-road` (the fallen hoop, barely seen).
- The walks: `noonroad-walk2-keys-medium-01..20`, `noonroad-walk-touch-low-touch-low-01..20`.

## Not done

- A blind reader of the glazed frames. The around sheet and the descent on three tiers.
- The pillar tops at the rim and the orange bar in the sky from the stair: not looked at.
- Sound: a step on the glass is still the hard step.

## What a stranger would call them (my own read)

- Glazed: great celadon and ox-blood rings with amber cells round them, and a string of mottled glazed vessels afloat through them, one or two glowing. Much nearer "huge glazed pottery" than before. A row of round amber cells on a ring can still read as lights or portholes, so the sci-fi reading is weaker, not gone.

## Still weak

- The hoops' amber cells. Hand-set and some fallen out, but still a row of round lights. If a blind reader says "portholes", drop them for a band of amber glass.
- The lit carriers read as warm pale glass from beside them. Looked down on from the crown, they are still a pale back with a light.
- Where the field is broken, the worn milk patches on the glaze can read as camouflage blotches at 8 m.
- The fallen hoop lies in the dark north of the road's west end and is barely seen.
- The carriers still meet the south arcade's column bases at the waterline (narrowed about 0.2 m, not cleared): they read as jammed against the colonnade.
- The water away from a lit hull is a flat dark plane; the sun on the east wall is dim; the south door opens onto black (the passage is D1's).

## Defaults taken

- The Noonwrights; The Noon Road.
- The floor raised to water + 1.3 m so the carriers stand out of the water as vessels (at + 0.26 they were a glowing pool with a disc in it).
- The line's torn mouth is an elbow rising to the hole, not a mouth in a wall: it came down from the sky.
- The hoops stand on z 40.1, the only line a 5.7 m tube fits between the column rows; the string lies against their south limbs.
- File names, `ctx.coffinRoad` and the key `coffinroad` kept for the passage.
- `HANDS` has four; the sign test counts the three that drew the sun.
