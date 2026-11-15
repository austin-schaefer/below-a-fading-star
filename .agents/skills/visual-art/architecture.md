# Architecture: what is built

For anything made by hands: walls, gates, signs, waystones, furniture, ruins, props. The history behind it is `briefs/v8/index.md` ("The bible") and `plans/wilderness-v8.md` ("What a visitor should notice"); this file is how it is drawn.

## The hands so far

Four builders have been drawn to date. They are a starting vocabulary, not a closed set: the owner's worry is that agents "will feel constrained to exactly three ages rather than feeling free to extend and build on the system". Use one where it fits, bend one, or add another; what has mattered is that each is distinct, not that there are three.

The owner (v8, in session): "careful about one culture btw: the goal is still diversity, but with coherence. i like that the architecture today has both cyclopean bridges and arabesque tavernas." Earlier (v4, "Height, and which architecture works"): the pieces "with an architectural point of view of their own are far more compelling than the medieval towers and the Greco-Roman pillars", and "Layers, not a house style... make each one strong and distinct rather than blending them."

| Hand | Shape | Material and colour in code | Seen at its best |
|---|---|---|---|
| **Elder** | blocks 2 m and up, triangles, nothing at human scale, no ornament but the etch | `ctx.kit.masonry` (`src/v4/kit/masonry.js`: polygonal courses, `course` 2.4 m, optional `diminish`, bronze or black-glass `inlay`); the Span's etch `src/v4/span/etch.js`; `COLORS.elder.stone #86796a` | the Span from the spawn; the Thrones; `63-strata-span-east-after` |
| **Heliarchy** | coursed ashlar, round arches, columns, hexagons, formal and symmetrical, faces the sun | the structures' stone (`makeStoneMaterial` in `src/structures/materials.js`, built with the Builder in `src/structures/geo.js`); `COLORS.heliarch`: stone `#8c8592`, dark `#6e6878`, bronze `#3f6a5a`, ember glass | the keep's plain planes and deep slots (`69-repairs-roundel-keep-after`) |
| **Noonwrights** | made in one piece and round in section: tubes, ribs, bulbs, collars, lenses, beads, a swelling wherever a line was joined; and frames spun as filament, laced ring to ring; the ring; at a scale of their own (a tube you walk inside, a vessel taller than you) | `COLORS.noon` (`src/v8/strata/noon.js` `NOON`): milk glass `#d8d2bf`, clouded `#a9a593`, bone `#beb7a0`, bottle amber `#8a5418`, celadon `#8fb09c`, one band of ox-blood glaze `#701c16`, lime crust, silt; stored daylight `#ffedbd`; the glazed material `noonGlass()` in `src/v14/noon-road.js` (crazed, clouded, a lime line at the water) | the Noon Road on the Foundered Nave's water (`shots/wip/noonroad-*`) |
| **Late folk** | small, crooked, cheerful: lime plaster, horseshoe and ogee arches, pierced screens, tile, painted wood, awnings, lamps | `COLORS.late`: plaster cream `#e9dcc0`, rose, saffron, limewash; tile turquoise `#1f9a92`, pomegranate `#b3263a`, cobalt; paint green, ox-blood, ochre, blue; four lamp glasses | the Pomegranate House gate (`65-house-gate-after`) |

Each hand's parts are ready-made in `src/v8/strata/parts.js` (the fourth's in `noon.js` beside it) and reached through `ctx.strata` (`src/v8/strata.js`; its header lists the API): Elder `notch`, `block`; Heliarch `roundel`, `drum`, `capital`, `slab`; Late `sign`, `finial`, `wall`, `screen`, `bracket`, `lamp`, `awning`, `bench`, `tiles`; Noonwright `carrier`, `tube`, `collar`, `node`, `lens`, `band`, `mark`, `cell`. Each adds into a Builder, so a site that borrows from several hands is still one draw call. Start from these before writing a new arch or tile band.

**The fourth hand: the Noonwrights** (v14-D3; the owner, 2026-11-15: "introduce a fourth culture... distinct visual style and era and nothing generic fantasy"; "great, i dig your new culture"). They came after the Heliarchy and before the folk here now. The Heliarchs faced the sun and built to it; when it began to fail, these people stopped facing it and tried to **keep** it: gathered daylight above the haze, stored it, and sent it where it was wanted. Their work is the "science" half of this science-fantasy, and it is not machinery.

- **Two registers, and how they meet.** The *blown and cast*: nothing carved, coursed, jointed or nailed; nothing of stone, timber or iron; every piece made whole (blown, cast, spun on a wheel, drawn, grown), round in section, swelling like a kelp bladder or a gall wherever a line was joined or a vessel was closed. The *spun*: frames drawn out as filament and laced ring to ring at a tangent, as a wheel is laced (the `cell`); never a strut, a rivet, a plate or a right angle. They meet at rings: a collar, a hub, a lens in its rim.
- **The ring is theirs** as the triangle is the Elder's, the hexagon the Heliarchy's and the crescent the Late folk's: the collar on a line, the rim of a lens, and their mark, the *empty* ring, alone or counted in a row on a band of glaze (`mark`, `band`). They have **no sign of the sun**: it was to be kept, not looked at (`ctx.strata.SIGNED` lists the three hands that drew it).
- **Colour and light.** Milk white, bottle amber, celadon, and one band of ox-blood where a thing was marked; all of it now crazed, clouded, chipped, silted, crusted with lime at any waterline. Their one light is **stored daylight**, the white-gold of a noon nobody alive has seen (`NOON.light`); it is steady (it breathes; it never flickers), it lies in a vessel like something poured, deep in the belly and thin at the crown, and it is rare: most of what they left is dark. It is the Speculum's blue sky's cousin, and as scarce.
- **Parts** (`ctx.strata.parts.noon`, each `(B, M, o)`, the origin on the thing's axis and the axis along +z; they add into a structures Builder or, under the ground, an `UnderBuilder`): `carrier` (a great sealed vessel: punt, belly, shoulder, rolled lip, ribs, its band and bull's-eye, galls, the coupling ring at its nose; `lit`, `roll`, `crack`), `tube` (a length of line with its collar and ribs; `a0`/`a1` the arc of wall left, `ragged`), `collar`, `node` (the gall where lines met, a port for each), `lens`, `band`, `mark`, `cell` (the spun frame's unit); `strand(B, M, a, b)` in `noon.js` is one filament.
- **What it must never be:** riveted, plated, geared, piped in brass (steampunk); panelled, chamfered, antennaed, blinking (a spaceship); faceted crystal or runes (generic fantasy); flat, square or symmetrical about anything but an axis; new. If a part needs a fixing, it is a ring; if it needs a corner, it is a swelling.
- **The sky is theirs** (the owner, 2026-11-15: "yes to all that, agree prison is its own thing"). The lattices that hang over the world are where the daylight was gathered, above the haze; the remnants are their broken collectors; the tubes brought the noon down and sent it on. The tender who oils the lattices and the Leerie who lights the valley's lamps "with the same lamp oil" are the two who still live off what this people left. The Galleries of Durance's iron cells, grilles and chains are **not** theirs: riveted, jointed iron is the opposite of this hand; they are the Heliarchy's hard late end, a sun-cult that sentenced people "until the sun goes out".
- The lattices and remnants have not yet been re-dressed in this hand (rings, lenses, collector cells); that is a later milestone's work.

The hexagon is the Heliarchy's everyday motif (hex pavers, waymarkers, the roundel's shoulders); the triangle is the Elder's; the crescent and the pomegranate are the Late folk's. A new Heliarch thing that wants an ornament has one already.

**Each uses the last (spolia).** Elder blocks in Heliarch footings; Heliarch drums, capitals and a bronze door in Late walls and furniture (the sleeper's table at the house is a Heliarch door). Late things lean on, hang from and are propped against older ones. Record a reuse with `ctx.strata.place({ kind: 'spolia', from })`; `tools/strata-test.mjs` reads it.

## The sign: the sun in the saddle

A disc in a V notch, the spawn view made into an emblem. Proportions in `SIGN` (`parts.js`): half-angle 35°, the disc 0.6 of the notch's width at its centre, its lower third below the shoulders; for a notch of depth S the disc's centre is 0.163 S above the shoulders, radius 0.488 S. Same sign, never the same rendering:

- **Elder:** the bare notch cut giant-size, its apex worn into a seat for a disc that is not there (`elderNotch`; on the Span's west gate and the Plinth Road's crown).
- **Heliarch:** an exact roundel in a notched head with a bronze or ember-glass disc (`heliRoundel`).
- **Late:** painted, tiled or sewn, the notch rounded into a crescent, the disc a pomegranate, a little off true (`lateSign`, `lateFinial`; on clothes, `wrongSign` in `livery.js`).

What it took to read: the first roundels were "a glowing dot beyond about 10 m" (v8 Status). The fix (`69-repairs-roundel-keep-*`) deepened the notch to half the head's width, lined its flanks with a dark cut that stands proud of the face, set a darker tablet behind it "so the notch reads against any wall", and made the ember disc dull bronze by day, glowing only as the sun gutters. The lesson generalises: an emblem reads by its shape in value, not by its glow.

## What has read well, and why

- **The Pomegranate House** is "the one thing on the map that is plainly not a ruin" (v8 Status) and since v8 the best thing on the map, because it contrasts with the dark round it. Its hand (horseshoe arches, an alfiz, lattice screens) was already right in grey stone `#9a8266`; re-colouring it cream and rose with turquoise domes and tile bands is what made it (`72-walk-house-before` / `-after`, `63-strata-house-far-*`). It works because it is the one warm, pale, saturated thing in a violet country.
- **Monumental plainness.** The keep's vast plain planes with deep slots, the Span's piers, the Thrones: big simple masses that hold up as silhouettes. The v4 note asked for "vast plain planes, deep-set openings, a few enormous details" and those frames are the ones the curator keeps.
- **Vast and human in one frame.** The Hawser's links bigger than a person with the small Kept Fire at their foot (`plans/wilderness-v5-coherence.md`, "Better than their brief"). A human-sized thing beside a giant one gives scale better than a marker does.
- **The gnomons as leaning pale stone** with a notched head and a red bead, each in sight of the last, throwing long shadows away from the sun (`69-repairs-gnomon-spawn-after`). The first version, a blue post with a bright ball, read cruder (`61-roads-gnomon-junction`).

## What failed, and why

- **Off-register shapes.** The Leerie's standards (cross-arm, capped lantern, in a ruled line) read as "a street of 19th-century lamp posts" (`38-coh-leerie-victorian-before`); rebuilt as lamp-cages. The Battlemented Ridge's even stubs read as castle merlons at 450 m. The v4 tone note: "nothing medieval... no Gothic tracery, no heraldry", nothing with crenellations or a Doric column. (Its "no timber beams" predates the Late folk, whose painted wood is now theirs.)
- **Placeholders.** Plain grey boxes read as unfinished: the old taverna's "plain boxes and a cylinder", the `demesne-blocks` at about (72, -4) in the best approach to the house (critic; visible in `48-peafowl-10m`).
- **Machine repetition.** The Lynchets' walls as rows of identical icosahedra; the hillside's spike rows (critic).
- **Overspending on small things.** The house cost 76k triangles at low before its frontage props were gated on quality (56.5k after). Budgets are in `world-code`.

## Checks worth a render

- From the place a visitor first sees it (for the house, 60 m and the road at 200 m), and from the spawn and the causeway if it can be seen from there: does the outline say whose it is?
- Its sign or emblem from the road (10 m and beyond), not only at arm's length.
- Into the sun (silhouette) and from the east (lit face); in a gutter if it has glass or a lamp.
- Beside its neighbours: does it make its hand more itself, or blur two hands?
