# v15-S1: the saint's face (issue-1521-saint)

## What changed

- `src/v15/quarters/quarrels/saint.js`: the head is one sculpted surface. `carved()` is the face as signed-distance fields (skull, face and jaw, the jaw's angles, chin, cheekbones, brow, eye hollows with the lids shut and their seam and fold, the nose and its wings, nostrils, philtrum, both lips and the line between them, the mouth's corners, ears with bowls and long lobes, the neck), with a raised fillet, one roundel with its socket empty, and the hair in carved locks combed back in waves. `stone()` weathers it: pitting, worn-back patches, a crack down the cheek that is uppermost, the nose's tip broken off, the left lobe broken off, a chip off the chin, the neck broken across, and the crown broken open at the head's highest point once it is posed. `sculpt()` casts a grid of rays from inside the skull onto that surface. The grid is dense across the face and sparse at the crown and the neck. It paints the hollows dark from the field (an SDF occlusion) and keeps the field's own normal mixed with 22% of each facet's normal. Soot is painted round the hole and on the fire's side, lime dust round the hole, and the fire shows inside it. There are no boxes, bolts, plates or courses on the face. `saintHead()` is the head alone, posed and sunk. `saint()` adds the stoke hole, which is let in as far as the head's outline reaches on that side, and a capsule collider fitted to the head's outline on the ground.
- Pose (plan `kiln`: `roll: 0.7, pitch: 0.2, sink: 0.45`): he lies over on his right cheek and tipped forward, with his face to the stair's head. The first pose, on his left cheek, showed the square his combed back (`v15-S1-d-square-west.png`), which read as the beehive again, so the roll was reversed. A face turned north-west (`[-0.45, -0.89]`) moved the stoke hole behind the masons' stock, so the face went back to `[-0.15, -0.99]`.
- `quarrels.js`: passes the pose, adds `?saint=sheet&saintAt=x,z` (the head alone on bare ground; `-190,-90` is flat), and `stats().saint`.
- The story and the bench: he lies on his cheek, and the bench is by his crown under the smoking hole. `modules.md` and `runtime.md` are updated.

## Counts

The head is 5,160 triangles on low and 20,880 on high. The Quarrels on low is 25,122 triangles in 2 draws (budget 28k; it was 15,134).

## Cold reads (sonnet, told nothing)

- Turntable sheet: "a giant, weathered stone head of a face, lying on its side." From the back and sides: "a smooth purple-blue lump or boulder … a rock, a bean or a pot."
- Placed frames: "a giant carved stone head, a fallen statue (apparently a saint's face) lying on its side in a town square." The reader did **not** see it as a kiln. From the square: "a featureless blob". It also said "looks like it is floating."

## Tests (port 8166, `SHOT_ANGLE=metal nice -n 10`)

- `ONLY=village,geometry,walk,edges,heights,strata tools/suite.sh 8166`: 6 tests, 0 failed (strata 8, village 683, walk 13, edges 214, heights 198, geometry 144 PASS lines).
- `node tools/quarrels-walk.mjs http://localhost:8166 keys low 0 v15-S1-qwalk`: `walked: yes`, 0 page errors; touch: `walked: yes`, 0 page errors.

## Frames (`shots/wip/`)

Sheet: `v15-S1-c-sheet.png`, `v15-S1-c-gutter-sheet.png`, `v15-S1-c-3m-front.png`. Placed: `v15-S1-g-stair-head.png`, `-front-3m.png`, `-square-west.png`, `-causeway-end.png`, `-behind.png`, `v15-S1-g-gutter-*.png`, `v15-S1-g-phone-*.png` (low, 390x844).

## Still weak

- From behind, from the sides and from the square's west it reads as a boulder; the face reads only from the north.
- Nothing says "kiln" in one look: the smoke and the hole's glow read, but the stoke door behind does not join the head visibly.
- His lowest cheek may look as if it floats (no contact shadow; sink 0.45 m).
- On low and on a phone the features are soft.
- The tint is the stone shader's violet in shade.

# Round 2 (the coordinator's three points)

- **Seated.** Sink 0.7 m. A dark ash apron lies under his outline. Round his edge, in fourteen bearings, rubble and lime are packed at the contact line. Two robbed blocks and pairs of timber wedges chock him. From 3 m in front and from behind, no light shows under him (`v15-S1-h2b-front-3m.png`, `-behind.png`). The paving under him is not cracked or dished; the apron covers it.
- **Back and crown.** The locks are deeper (0.02 + 0.065 head units) and the fillet is raised 0.1. Three drum joints are cut round the neck, with a dowel hole in the break. A turn of 0.3 rad showed the square more crown, not more face, so it stays at 0.
- **Kiln.** The stoke hole now faces the square from the break of his neck (plan `stoke: [-0.97, 0.3]`; the bench is on the far side). Its raked ash glows faintly, lime is spilt pale beside it, and the fire light falls on the paving. The glow inside the broken crown is doubled, and soot spreads further over the lip. The fuel stack and rake stand on the brink side: on the walk's first try the stack blocked the way at (71.2, -2.4), and `walked: no` was its catch.
- **Colour.** His stone is now the keep's ashlar, `#8c7f70` (src/v8/strata.js), not `COLORS.heliarch.stone`.
- **Cold read (sonnet) of h-square-west and h-stair-head:** "a colossal carved stone head (a fallen statue of a face, lying on its side, eyes closed…)… a hearth or brazier burns at its foot with smoke rising"; from the west, "a lumpy boulder or pumpkin-like mass with smoke venting from its crown". It saw fire at his foot and smoke from his head, but did not say "kiln". It also thought the head was being winched, because of the shears.
- **Geometry.** The first rerun found three new coplanar pairs (the paired wedges, the lime and the apron at paver height). The wedges were then turned apart and the low pieces offset; `ONLY=geometry` passed.
- **Frames:** `v15-S1-h2b-{stair-head,square-west,front-3m,behind,bench-side,causeway-end}.png`, `v15-S1-h2b-gutter-*.png`, `v15-S1-h2b-phone-*.png`, and the turntable `v15-S1-h-turntable.png`. The `v15-S1-h-*` placed set was taken before the fuel stack moved, so it is superseded, not overwritten.
- **Tests (round 2):** `ONLY=village,geometry,walk,edges,heights,strata tools/suite.sh 8166`: 6 tests, 0 failed (strata 8, village 683, walk 13, edges 214, heights 198, geometry 144). `quarrels-walk.mjs` keys and touch: `walked: yes`, 0 page errors. Low tier: the head is 5,160 triangles; the quarter adds the rubble and the apron.
