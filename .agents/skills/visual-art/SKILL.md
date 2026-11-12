---
name: visual-art
description: How to think about the look of "Below a Fading Star" when making or changing anything a visitor sees (a building, a figure, a creature, a plant, ground, rock, water, light), as maker, reviewer or critic, on top of `wilderness`. A tool in the toolbox, not a hard constraint. Covers the visual thesis, how to think about a new thing, the render loop, sharp edges and anti-patterns, all taken from what has worked and failed here; references beside it for architecture, the land, figures and creatures, and light and colour, each with the kit, palette and numbers that already exist.
---

# Visual art

The walk is a landscape seen against the light. A swollen red sun sits 13.5° up in the saddle of the western wall (`SUN` in `src/world.js`), so most of what a visitor sees is either a shape standing black against that glow or a violet-dark mass with its sunward edge lit. The pictures that have worked best here are shapes before they are surfaces: the two headless Thrones either side of the disc from the spawn, the deodand alone on a ridge, the painter's back with the keep and the sun behind him. Into that dusk the world sets a few things that are bright on purpose (the Lattice's blue, the corpse-candles, the Pomegranate House's cream walls and turquoise domes under coloured lamps), and they work because the dark round them stays dark. And it is a country of peoples and ages layered on one another, each with its own look and each reusing what the last left, so that a block or a stole tells a visitor who made it. Three builders and two liveries exist so far; they are what has been made, not the list of what may be. The tone itself (Vance, worn, once rich, never cartoon) is in `AGENTS.md`; this skill is how that has turned into pictures.

Everything here comes from something real: code that looks good, a render in `shots/`, a critic's finding or the owner's words, and each claim says which. None of it is a rule. It is what tends to pay off; break any of it on purpose and say why in the commit. Where nothing has been tried yet, this skill says nothing, and you are the one who finds out. Keep it lean: when something is learned, replace or sharpen a line rather than adding one, and cut what the work has outgrown.

## Strange first, then fitting

Agents default to the familiar, and a skill that describes what already exists can make that worse: it is easy to read it as "make more of that". So before shaping anything:

1. **Write the first idea down and set it aside.** It is the one any fantasy game would have.
2. **Write two more: one stranger, one much bigger** than feels safe (a thing a visitor sees from 200 m and walks toward to find out what it is). Ask what only this world would have here: old, once rich, baroque, a little absurd, made by people with odd reasons.
3. **Build the strangest one that still belongs.** Belonging comes second and is the easier half: the rest of this skill is for that.
4. **Then make it read up close.** A bold shape with a muddy surface and a confused door is half done; the builders' ready-made parts give clean detail cheaply. Small human marks, the trace of someone having been there, carry more world than ornament.

## What the owner has seen, across milestones

These outrank anything below that disagrees.

**Gaps:** figures too low-poly and stiff; anything that moves (water, animation) is the weakest work here; plants and structures too small, with too little range of size for contrast and "occasional awe"; mountains and large natural features look bad (issue #5); and the biggest pitfall, generic fantasy ("bullrushes! tall grass! gray stone tower!").

**Works:** the Great Span, the Pomegranate House, the Arcature, and the little walking men, whose personality outweighs their jank.

**Open, not fenced:** the three builders' ages fixed "generically medieval"; agents should feel "free to extend and build on the system", not held to exactly three.

## The references

Open the one your work touches; each lists what exists and where its code is, what read well and what failed, and the render checks worth doing.

| File | Open it for |
|---|---|
| `architecture.md` | anything built: the builders' hands so far (`ctx.strata`), the sign of the sun in its notch, spolia, the cyclopean and Heliarch stone, the Pomegranate House, props and ruins |
| `land.md` | ground, cover and plants by place, rocks, water, the mountains, the sky; the places' table and the clearings |
| `figures.md` | people and creatures: the liveries, the figure rigs and their Painter, scale against the eye, finding a figure at 10 and 30 m, the Twk-men |
| `light-and-colour.md` | the palette and where colours live, the per-place grade, lamps and emissives, the gutter, bloom and blow-out, shafts of light |

## How to think about a new thing

1. **Silhouette against the west first.** Ask what it looks like as a black shape against the sun's glow, and from the side the sun lights. The Thrones, the deodand and the Span's arches read from hundreds of metres as outline alone (`30-thrones-gutter-spawn-after`, `03-fauna-deodand-standard`). A thing with a weak outline is not saved by its surface.
2. **Value before detail.** The world is mostly dark violet; a thing reads when it stands a step lighter or darker than what is behind it, not when it is busy. The officers' coats went from near-black to a blue-grey `#2a303b` so they stand off the turf (`src/v8/livery.js`); the Late folk still vanished at 30 m in dark patched cloth. Check the value in a render before adding a single trim.
3. **Scale to the eye and to the work.** Decide the distance a visitor first meets it and how big it must be there. The Elder work is 2 m blocks and up with nothing at human size; a story prop meant to be found has to be more than a few pixels at the distance the visitor stands (the traveller's body, 40 px wide from the deck 80 m off, is not found within a second).
4. **Whose is it?** A thing tends to look more like part of this world when it belongs to someone or somewhere: one of the builders or peoples already here (Elder, Heliarch, Late folk; the Twk-men, who are nobody's), a place's own ground, or someone new that you invent. If it is one of the existing ones, their parts and colours are ready-made (`architecture.md`, `figures.md`, `land.md`). If it is someone new (another age, a sect, a machine, a people nobody has met), give them a look as much their own as the others have, and write down what makes it so for the next agent. The owner: "diversity, but with coherence".
5. **Reuse the palette and the kit.** `PALETTE` in `src/world.js`, the hands' `COLORS` in `src/v8/strata/parts.js`, `LIVERY` in `src/v8/livery.js`, the place table in `src/v8/places.js`, the cyclopean stone (`ctx.kit.masonry`), the structures' Builder and stone shader, the figures' Painter. A new literal colour beside an existing one is usually the same colour slightly wrong.
6. **Vary the shape, not only the trim.** Rows of the same icosahedron along the Lynchets "look machine-made" (critic); the yews became good when each sagged out of its clipped cone differently ("no two alike", v6.3). Vary footprint, lean, height, breakage and spacing, then colour.
7. **Light and humour where the dark needs them.** The owner asked for contrast in palette, density and tone, "cuteness or humor to give the dark things punch". The house, the Twk-men and the painter's failed suns do that. A light or funny thing earns its place next to something grim.
8. **Fewer, stronger.** Small markers scattered for their own sake were cut on the owner's word ("cut all the pawns, they are too much random noise"); 857 boulders became 297 in outcrops. One thing placed where it reads beats ten that each nearly read.

## Working

- **Look at the baseline first.** The stage table in `shots/README.md` and the keepers for your place or kind (`63-strata-*` for building, `66-liveries-*` for figures, `71-rocks-*` for stone, `62-ground-*` for ground). Render the spot as it is before you change it.
- **Render from where a visitor stands**, at the walker's height, at two or three distances: close (2–4 m), the distance it is meant to be noticed from (10–30 m for a figure or prop, 60–200 m for a building), and the farthest point it can be seen from. One load renders them all: `tools/views.mjs` with a views list (`tools/views-v8-livery-{4,10,30}.json` are a model of the three-distance sheet).
- **Render it into the sun and away from it,** in a gutter (`"js": "window.__fp.sky.flicker.hold = 0.3"` in a view; `views.mjs` otherwise holds the gutter off), at `?q=low`, and once on a phone (`tools/shot.mjs <url> <out.png> 390 844`).
- **Open every image** you make before you judge or name it, at full size; a downscaled sheet hides a figure.
- **Read the picture, not the plan.** Whoever wrote the idea sees it in any render: the maker falls in love with the story in words and stops noticing it is not on screen. Before calling a thing done, crop the part that carries the idea, enlarge it, and write one sentence a stranger would say on seeing only that ("a paper lantern on chains"). If the sentence is not your idea ("a bed you winch yourself up into"), it is not built yet. Better still, hand the render with no description to a fresh agent and ask what it is.
- **Before and after from the same view** (`-before` / `-after`, the same pose), so the curator and the next agent can see the change; `tools/pair-diff.mjs` measures a difference when a number helps.
- **Say what is weaker than asked.** Each v8 Status entry ends with it ("the roundels read as a glowing dot beyond about 10 m"); the next agent starts from that line.

## Sharp edges

- **The sun is low and in the west, so the near side of most things faces away from it.** A thing seen from the east is lit; from the spawn or the causeway looking west it is a silhouette, and its surface detail is gone. Judge from both.
- **Bright patterns read from very far.** The boulders' pale lichen at about eleven times the stone's luminance drew the eye at 400 m (owner, issue #12); it is now capped near 1.3x (`tools/rocks-test.mjs`). A high-contrast pattern on anything common is visible across the map.
- **Dark grades go black on a phone.** The fen graded to exposure 0.74 was the v8 critic's one blocking fault (near-black, darker still on a phone); it is 1.0 now (`src/v8/places.js`). Darkness comes from the ground and fog, not from pulling exposure down.
- **Additive light blows out.** The house's lamps blew the court to white in one round (`65-house-court-blown-out`) and glared from 15 m in the next (`69-repairs-house-near-*`). Every new emissive gets a near render.
- **Haze is depth.** The Galleries' ironwork at 45% haze hold read "pasted in front" of the wall it hangs on; 25% sat it in (`plans/wilderness-v5-coherence.md`). Keep far things in the fog.
- **Plain untextured boxes read as placeholders** (the grey `demesne-blocks`; the old taverna as "plain boxes and a cylinder"). Every surface takes a material from the kit.

## Where it tends to help

None of this is required. Reach for it when it makes the work better.

- **Writing a brief:** naming the hand or people a thing belongs to, the distance it must read at, and the keepers to look at gives the implementer the look in three lines.
- **Making:** the reference for your kind, the baseline renders, then the loop above.
- **Reviewing and the critic:** walk as a stranger and ask what reads from where you stand: whose is this building, can I find that figure, where does that light come from, does this place look like the last one.
- **Curating:** a before and after from the same pose is what lets the next agent learn from a change.

## Anti-patterns

- A literal colour in a recipe where the palette, `COLORS` or `LIVERY` already has one.
- A Victorian lamp post, a battlement, a Doric column or a castle: the shapes the owner and the coherence pass found off-register (`plans/wilderness-v4.md`, "Height, and which architecture works").
- Blurring two distinct looks into one house style without meaning to. (Borrowing on purpose, and adding a new hand, are not this.)
- Light from nowhere: a shaft, glow or pool with no visible source (the owner on the wood's first shafts; fixed so each falls from a crown, `src/v8/shafts.js`).
- Rows of identical copies; variety by trim alone.
- Lifting a thing's visibility with a new hue outside its palette; lift value and saturation along its own colour (v7.1's visibility pass, stage 60).
- Judging from a downscaled sheet, or from one distance, or only with the sun behind you.
