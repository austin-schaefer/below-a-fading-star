# Architecture: what is built

For anything made by hands: walls, gates, signs, waystones, furniture, ruins, props. The history behind it is `briefs/v8/index.md` ("The bible") and `plans/wilderness-v8.md` ("What a visitor should notice"); this file is how it is drawn.

## The hands so far

Four builders have been drawn to date. They are a starting vocabulary, not a closed set: the owner's worry is that agents "will feel constrained to exactly three ages rather than feeling free to extend and build on the system". Use one where it fits, bend one, or add another; what has mattered is that each is distinct, not that there are three.

The owner (v8, in session): "careful about one culture btw: the goal is still diversity, but with coherence. i like that the architecture today has both cyclopean bridges and arabesque tavernas." Earlier (v4, "Height, and which architecture works"): the pieces "with an architectural point of view of their own are far more compelling than the medieval towers and the Greco-Roman pillars", and "Layers, not a house style... make each one strong and distinct rather than blending them."

| Hand | Shape | Material and colour in code | Seen at its best |
|---|---|---|---|
| **Elder** | blocks 2 m and up, triangles, nothing at human scale, no ornament but the etch | `ctx.kit.masonry` (`src/v4/kit/masonry.js`: polygonal courses, `course` 2.4 m, optional `diminish`, bronze or black-glass `inlay`); the Span's etch `src/v4/span/etch.js`; `COLORS.elder.stone #86796a` | the Span from the spawn; the Thrones; `63-strata-span-east-after` |
| **Heliarchy** | coursed ashlar, round arches, columns, hexagons, formal and symmetrical, faces the sun | the structures' stone (`makeStoneMaterial` in `src/structures/materials.js`, built with the Builder in `src/structures/geo.js`); `COLORS.heliarch`: stone `#8c8592`, dark `#6e6878`, bronze `#3f6a5a`, ember glass | the keep's plain planes and deep slots (`69-repairs-roundel-keep-after`) |
| **Noonwrights** | made in one piece and round in section (tubes, collars, bulbs, lenses, beads, a swelling where a line was joined) and spun filament laced ring to ring; the ring; a scale of their own (a tube you walk inside, a vessel taller than you) | `COLORS.noon` (`NOON` in `src/v8/strata/noon.js`): glaze fields of celadon `#8fb09c` / `#5d8a77` / `#a3bba7`, ox-blood `#701c16` / `#561510`, amber glass `#9a5c1a` / `#d9a04a`, over a milk body `#c9c3b0` (bone `#aaa48f`, clouded `#9a9685`); lime crust, silt; stored daylight `#ffedbd`; `GLAZES` the four schemes; the material `noonGlass()` in `src/v14/noon-road.js` | the Noon Road on the Foundered Nave's water |
| **Late folk** | small, crooked, cheerful: lime plaster, horseshoe and ogee arches, pierced screens, tile, painted wood, awnings, lamps | `COLORS.late`: plaster cream `#e9dcc0`, rose, saffron, limewash; tile turquoise `#1f9a92`, pomegranate `#b3263a`, cobalt; paint green, ox-blood, ochre, blue; four lamp glasses | the Pomegranate House gate (`65-house-gate-after`) |

Each hand's parts are ready-made in `src/v8/strata/parts.js` (the fourth's in `noon.js` beside it) and reached through `ctx.strata` (`src/v8/strata.js`; its header lists the API): Elder `notch`, `block`; Heliarch `roundel`, `drum`, `capital`, `slab`; Late `sign`, `finial`, `wall`, `screen`, `bracket`, `lamp`, `awning`, `bench`, `tiles`; Noonwright `carrier`, `tube`, `collar`, `node`, `lens`, `band`, `mark`, `cell`. Each adds into a Builder, so a site that borrows from several hands is still one draw call. Start from these before writing a new arch or tile band.

**The fourth hand: the Noonwrights** (v14-D3; the owner, 2026-11-15: "introduce a fourth culture... distinct visual style and era and nothing generic fantasy"; "great, i dig your new culture"). After the Heliarchy, before the folk here now: when the sun began to fail they stopped facing it and tried to **keep** it, gathering daylight above the haze, storing it in great blown vessels and sending it down tubes. Glass-blowers and potters, not engineers.

- **Made, not manufactured.** Nothing carved, coursed, jointed or nailed; every piece blown, thrown, cast or drawn whole, round in section, swelling like a gall where a line was joined. Their frames are spun filament laced ring to ring at a tangent (the `cell`), never a strut or a rivet. The ring is their motif and their mark (the empty ring, alone or in a row on a band); they have **no sign of the sun** (`ctx.strata.SIGNED` lists the three hands that drew it).
- **Glaze is the majority.** A thing is dipped in a field (celadon, ox-blood, amber glass), a band brushed round it, the foot left bare as a potter leaves it; the milk body shows only where the glaze broke thin over a rim or wore through. They were fired standing on their tails, so glaze edges run toward the tail in drips. Throwing rings on collars and tubes, a spiral of pulled amber glass on a carrier's shoulder, a pontil scar in its punt, a body that sagged a little before it set. `GLAZES` and the parts' `glaze` option paint it (`put`'s `paint`, in the part's own frame).
- **Their light is stored daylight**, white-gold, steady (it breathes, never flickers), rare. A lit vessel is a lantern of milk glass: lit through its wall, brightest low where the light pools, its bands dark shapes on it.
- **Parts** (`ctx.strata.parts.noon`, each `(B, M, o)` into a structures Builder or an `UnderBuilder`): `carrier`, `tube`, `collar` (with `cells`, a row of amber bull's-eyes round its faces), `node`, `lens`, `band`, `mark`, `cell`; `strand` is one filament.
- **What failed:** milk-white smooth hulls with thin ribs and dark slats read to a blind reader as "a wrecked spacecraft ... generic sci-fi" and "newer and cleaner than the stone". White curved panels with seams are a spaceship; colour, glaze and hand marks are what make it pottery. **Never:** riveted, plated, geared, brass (steampunk); panelled, seamed, vented, blinking (spaceship); faceted crystal or runes; square; new.
- **The sky is theirs** (the owner, 2026-11-15: "yes to all that, agree prison is its own thing"): the lattices are their collectors and the remnants their broken ones; the tender and the Leerie live off their stored light ("the same lamp oil"). The Galleries of Durance's riveted iron is not theirs (the Heliarchy's hard late end). The lattices are not yet re-dressed in this hand.

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
