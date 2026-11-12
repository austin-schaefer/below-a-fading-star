# Figures and creatures

For people, creatures and anything with a body. Who the people are is in `briefs/v8/index.md` ("The living") and `stories/`; this file is how they are drawn and what it takes to find one.

## What exists

- **The Painter** (`src/fauna/uncanny/kit.js`): the mesh builder every figure rig shares. It writes colour and (metal, rough, emit) per vertex, so a whole figure is one mesh and one material. Three figure families build on it.
- **The v7 workers' rig** (`src/v7/workers/body.js`, `rig.js`): cloth bodies of revolution with folds darker and hems worn, sleeves, heads, bones posed per frame. The Pomegranate House's people use it (`src/v8/house/folk.js`); start a new person here.
- **The liveries** (`src/v8/livery.js`): `LIVERY` colours and helpers that write into a Painter: `stole`, `badge` (the sign in brass, to the bible's proportions), `collar`, `staffHead`, `patch`, `wrongSign`, `tag` (records the livery for `tools/livery-test.mjs`). `?livery=0` shows v7's costumes for a before.
- **Story props and small figures** (`src/v8/threads/kit.js` over v5's accumulator): frames on the ground, limbs between two points, ellipsoids.
- **Creatures:** `src/fauna/` (the deodand, grazers, rooks, beetles, wings, gutterbats, lamps' moths, and the uncanny), the Twk-men (`src/v8/twk/model.js`), the peafowl.
- `SCALE` in `src/v4/kit/scale.js`: person 1.8 m, door 3.2 m, tread 0.32 m, rook 0.45 m.

## The peoples so far

Two liveries and the Twk-men exist to date; new peoples, sects and creatures are welcome and need not fit either.

| | Body | Colours in code | Mark |
|---|---|---|---|
| **Heliarch officers** (Leerie, Thurifer, Link-Boy, Taker, Stylite, Sexton) | one shared cut: a tall stiff collar rimmed in brass | coat `#2a303b` (lifted from v7's near-black so they stand off the turf), the ember stole `#c8501e` faded and dirtied (`stoleTone`), brass `#b08a3e` | the formal sign as a brass badge |
| **Late folk** (Coheirs, Salt-Pedlars, the Guest, the house's people) | crooked, comfortable: the host's paunch and red felt cap | patched cloth, two or three a garment from `LIVERY.late`: pomegranate `#a3262c`, saffron `#c99030`, turquoise `#24857c`, undyed `#b9aa8c`, rose | the sign sewn on wrong (`wrongSign`) |
| **Twk-men** | 7–8 cm riders on dragonflies 35 cm across | green skin, red cap, saffron pennon | none; they mock both |

The stole gives back a tenth of its own colour (`stoleEmit` 0.12) "so the stroke of ember still reads in the wood's shade and at 30 m in the low sun; it does not glow." That is the right size of trick: a figure's one identifying colour held readable, not lit.

## What has read well, and why

- **The deodand** set the standard (`03-fauna-deodand-standard`): black, man-shaped, 2.3 m, alone on a ridge against the sun, and it moves only when unseen. Silhouette, a clear place on the skyline, and one behaviour.
- **The painter** (`68-painter-man-approach`) is the best frame v8 made: a red hat and a smock patched with every colour he has used, his back to you, the keep and the sun behind him. One saturated accent on a figure, placed where the background is plain.
- **A light carried in the dark.** The Link-Boy's torch is what makes him findable on the dim moor (`50-walkers-sheet`); a figure with a light finds itself.
- **Behaviour that reads at a glance:** the host bows you in, the patrons stare back, the musician turns his back in offence (`65-house-*`). A pose change is visible further off than a face.
- **The reworks.** The first human was a red hover-pot waving a torch (`09-uncanny-humans-derpy-before`); it became a canopied traveller with a lantern (`09-uncanny-traveller-after`). The first peafowl was "oval parts, stick legs and a thin tail" (`48-peafowl-front-first`); it became good with a real neck, wing and crest (`48-peafowl-front`). Joined forms, not a stack of primitives.

## What failed, and why

- **Too dark to find.** The Late folk "still read as dark figures" at 30 m (v8 Status; `66-liveries-latefolk-sheet`); the Long Sleeper's stole cannot be read at 10 or 30 m (grass and shade); the Stylite and the Taker are marginal at 30 m. The officers' sheet at 10 m shows how small a 1.8 m figure is in the frame (`66-liveries-officers-sheet`).
- **Too small to find.** The traveller's body was 40 px wide from the deck's lip, 80 m off, and nothing pointed down at it (v8 Status; a pale cloth, a circling bird or a lamp below were the critic's ideas). A Twk-man is about 10 px at 15 m; their salt sack read as a grey lump.
- **Blocky.** The painter up close is boxes and cylinders (`68-painter-man-close`), and his colours were hard-coded instead of taken from `livery.js`.
- **Noise.** The v4 measure figures, dark hooded pawns placed for scale, were all cut on the owner's word: "cut all the pawns, they are too much random noise" (v7.1). A figure needs a reason to be where it is.

## Lifting a quiet thing

The v7.1 visibility pass (brief `briefs/v7.1/brief-v7.1-05-visibility.md`, stage 60) is the method that worked for "too subtle": render each thing at the distance a visitor meets it (fauna 10–25 m, ground flora 3–8 m), in daylight and in a gutter; measure its luminance and chroma against a ring of background; rank; lift the bottom of the ranking toward the middle by the smallest change along the palette it already has (a warmer flank, a highlight that takes the low sun, at most a 15% size step for insects and flowers). The grazers in the gutter went from lost to a warm grey body against the grass (`60-grazers-gutter-*`).

## Checks worth a render

- The three-distance sheet: 4, 10 and 30 m (`tools/views-v8-livery-{4,10,30}.json`), at full size, not only as a sheet.
- In the grass it actually stands in, in shade, and in a gutter.
- Against the sky and against the ground: a figure that reads only on the skyline is lost when the visitor stands above it.
- For a figure that is a story beat: from where the visitor stands when the beat should land, can it be found within a second?
