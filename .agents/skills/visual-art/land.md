# The land: ground, plants, rock, water, mountains, sky

For anything that is the country itself rather than something built on it. The owner's v8 complaint is the reason this file exists: "almost all areas of the world have similar dark palette, similarly dense vegetation, similarly somber tone." Places that differ are what fixed it.

## Places

`src/v8/places.js` holds each place's ground, cover and light as one table (its header; the same table with colours is in `plans/wilderness-v8.md`, "Places (v8-02)"). Read a place with `ctx.places.placeAt(x, z, cd)`, the grazed common with `commonAt`, the house's surroundings with `houseAt`. A new place or region adds a row; a thing set on the ground takes its colour from the row it stands in rather than a constant.

| place | ground | cover |
|---|---|---|
| the common (keep, causeway, stones) | pale sage turf `#7c8a56`–`#969a68`, trodden earth `#7c6a52` | ankle turf, rare tussocks |
| the Bletting | rank green `#4c6a2a` | grass to the head in patches, the most flowers |
| the Demesne | shaven lawn `#6f8c3a`–`#7c9444`, a crisp edge | turf a few cm high |
| the Lynchets | 7 m strips: stubble, ley, plough, fallow | each strip its own crop |
| the Deodand Wood | leaf litter `#3a2414`–`#1c140e` | almost none; shafts of ember light |
| the Adust | red clay `#94523a`–`#b05a36` | none |
| the Saltings | white crust `#f0ebe8` | none |
| the Outwash | grey-blue gravel `#6e7c8a`–`#9eaab6` | sparse ankle grass |

**What read.** The spawn's knee-high violet grass became pale grazed turf, and the first view went from violet-dark to "ankle turf under the sun" (`62-ground-spawn-before` / `-after`): the single biggest change a visitor sees in v8. Cover height is as strong a difference as colour; bare ground (salt, clay, the wood's floor) reads as a place. Worn roads pale against the turf, coloured against the ground under them (`61-roads-spawn-after`), lead the eye better than any marker.

**What did not.** Haze flattens far patches: from the keep's top the map still reads mostly lawn and salt. The Lynchets' strips read only from a distance. At the Collation and in the orchard, eye-height grass fills the frame (critic). The fen, graded dark on black mud, was unreadable (the v8 critic's one blocker; exposure 0.74 → 1.0). The wood is "very dark away from its shafts" (v8 Known issues).

## Plants

Trees and plants are `src/vegetation/` (`trees.js`, `plants.js`, `ground.js`, `lattice.js`); density and cover per place come from the places' table.

- **The yews** (v6.3, stage 47) are the model of a plant made well: smooth green cones that "block the view" (`47-yews-first-find`) became near-black, needled, "with sprigs and long shoots sagging out of their old clipped shapes, and no two alike" (RELEASES), still showing the gardener's cones up close (`47-yews-far-after`). A plant with a history in its shape.
- **Far crowns must keep the near silhouette.** v6 found far meshes that had dropped their limbs, so the switch showed as a shape change; the fix matched outlines at the switch distance (`plans/wilderness-v6.md`).
- **The owner on v7:** "a lot of the color / embellishments are slightly too subtle esp on the creature / fauna / flora side. don't go crazy but just a bit of visibility would help them to not simply be missed." The pass that answered it lifted each quiet thing a step along its own colour (stage 60; method in `figures.md`).

## Rock

`src/rocks.js` (boulders, tors, scree, pebbles, instanced in size classes) and the regions' shared stone (`src/v4/regions/common.js`). What the owner found: white-blotched "dalmatian" boulders "visually too arresting (you can see 'em 400 meters away)" and far too common (issues #11, #12; `71-rocks-boulder-east-before`). Now (`71-rocks-*-after`):

- a third as many, in outcrops with bare ground between (857 → 297 at high), few on the grazed common;
- lichen made from the stone's own luminance, a hue shift more than a brightness one (`LICHEN` in `rocks.js`; `LICHEN_CAP` 1.4 in the shared stone; `tools/rocks-test.mjs` holds a full patch under 1.3x the stone, where it was about 11x);
- nothing bigger than a pebble on a road, a walked line or a built place: one table, `src/v8/clearings.js`. A new place adds its entry there.

Stones on a near-vertical face read as black ovals (`13-flora-ovals-before`); keep scatter off steep and spray-wet faces.

## Water

Lees Tarn's sun path is part of the strongest frame on the map (`62-ground-spawn-after`). The owner on v7: "a lot of water looks very janky"; check water in motion, not in a still. The Speculum's pool, the one daylight-blue sky in the world, is a deliberate exception (`13-flora-ovals-after`), and so is the Prospect's canvas.

## Mountains

The owner: what visitors see most, and the jankiest thing in every release. Before the massifs: "aggressively vertical wall; random-ass fractals above that... what i want is a feeling of an organic mountain barrier. undulating, stooping almost to valley floor perhaps in places... not 'this is a videogame wall to keep you in' but 'this valley happens to be surrounded by mountains'" (`plans/wilderness-mountains-study.md`). He chose C, five massifs with deep cols; `src/v4/mountains.js` (`crestAt`, `faceAt`, `saddle`, `farHeightAt`).

- The sun's saddle stays the lowest col (22 m); the far rings are ranges of their own (a ridged field in plan under an envelope of lobes, the sun's side baked into the colour), lower and paler, showing through the cols. As the near crest smoothed they read as an echo, flat lilac cardboard (`v11-00-before-high-y0`).
- What made the outlines read (v11): each summit with a steep side and a long side (half-widths unequal), notches narrower than the tops beside them, and a serration from the abs of noise (sharp nicks, rounded tops) at ~40 and ~110 m along the arc. A summit added only to the top third of the face reads as a tower on a hill; let it run down the whole face where nothing hangs there.
- Spurs and valleys in plan (the face pushed toward the bowl or pulled back into the mass, `SPURS_M`) do not show where the face meets the sun square (the north-east wall): only grazing light or the face's shading shows them. The outline carries the form from the bowl.
- Recession in the cold light is a cool, mid-value air over the wall by distance from the eye (`atmosphere.js`, `FP_WALL_AIR`); at 0.42 and a paler colour the wall read as fog, at 0.3 and a value near the rock's own it reads as rock further off.
- v11 (M1), what made the rulers and fins: ledges cut every 13-17 m then outlined three more times (a one-cell curvature bake, shader tread lines, three height bands); face relief whose noise ran on the face's *height* while pushing the face out by more than that noise's vertical wavelength, so the heightfield folded into pointed fins (drive radial relief by the radius, in a polar chart); gully heads all at one height up the face (a row of tips); and colour classes read from a 0.6 m slope on a face near the scree angle, flipping vertex to vertex (herringbone fur): read the wall's slope over 4 cells.
- What made it read as rock (two rounds): water organising the face (`drainage()`: two families of couloirs, thinned in some sectors and gathered in others, one steep flank each, heads at noisy heights, fans at the mouths), then three values a face in the colour bake (dark couloirs, basalt and crag risers; slate and rust masses; pale hard beds in pieces, scree and fans), noise for colour and crags in the face's own chart (`faceNoise`: arc and height; xz noise hangs in vertical smears on a steep face), and the wall's haze compressing values instead of erasing them (a light air and a cool cast by multiplication; at 0.3 of plain mix it was one lavender, "plasticine"). Round one, with relief but one value, read as clay.
- Things hung on the wall (the Galleries, the Gradine, the Annals) follow the face by code; check them in a render after any change to the wall.

## Sky

The sky's colours are `PALETTE.skyHorizonSun`, `skyHorizonAway`, `skyZenith`, `haze` (`src/world.js`), drawn by `src/sky.js` and `src/atmosphere.js`. Built things in the sky crowd each other: the v2 sky lattices beside the Cincture (coherence pass), and an orange bar above the southern crest in every southward frame, older than v8, that reads as a stray plank (critic; visible in `47-yews-far-after`). Look at the sky in your frame too.
