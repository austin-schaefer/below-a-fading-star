# Light and colour

For colour choices, grades, lamps, glows and anything emissive. The tone paragraph in `AGENTS.md` names the colours (ember, crimson, blood-orange against violet-slate; cold starlight; moss and rust; a few unnatural lights); this file is where they live in code and what has happened when they moved.

## Where colours live

- **`PALETTE`** (`src/world.js`): the sun (`sunCore #ff7030`, `sunLight #ffa868`), the sky (`skyHorizonSun #8a2a16`, `skyHorizonAway #3c3456`, `skyZenith #0e0c22`, `haze #4a3c52`), the moor, rock, water, bark and leaf, `bone`, `stone`, `ember #e8591a`, `crystal #7ad7ff`, `wisp`, and the four stones (`pride #ffb347`, `sloth #6a8a6a`, `avarice #5fb89a`, `spite #b06ad4`). On `ctx.palette`.
- **The hands' colours:** `COLORS` in `src/v8/strata/parts.js` (Elder stone; Heliarch stone, bronze, ember glass; Late plaster, tile, paint, glass).
- **The peoples' colours:** `LIVERY` in `src/v8/livery.js`.
- **The places' ground and grade:** `src/v8/places.js`.

A new colour usually belongs in one of these, named, beside its kin.

## The grade

`src/post.js`'s finish pass grades the whole frame (a violet lift in the shadows, vignette, grain, bloom, the sun's rays). Since v8 it also applies a per-place grade, `GRADE` in `src/v8/places.js` (exposure, saturation, contrast, warmth), read at the camera and blended over 25 m (`uPlace`; `?placegrade=0` holds it neutral). The house is the warmest and most saturated (1.18, 1.38, 1.04, +0.08), the Demesne the palest, the wood the darkest and ember-warm (0.8, 0.95, 1.1, +0.1). `tools/contrast-survey.mjs` measures places against the moor (in the suite).

What the history says:

- **One hue everywhere flattens the world.** The early grade was all red and magenta ("Mars", `04-colour-mars-before`); moving the ground to olive and ochre (`04-colour-olive-after`) is what let the sun's red be the sun's. Keep the red for the sun, the stole and things that matter.
- **Do not make a place dark through exposure.** The fen at exposure 0.74 was near-black and worse on a phone (the v8 critic's blocker); it is 1.0 now, "cold, not dark (it is black mud and fog already)" (`places.js`).
- **Haze holds things in their distance.** The Galleries' haze hold went 0.45 → 0.25 because the ironwork read pasted in front of its wall (`plans/wilderness-v5-coherence.md`).

## Lights and glows

Point lights are cheap away from you (`src/lights.js` copies the nearest into three slots; budgets are in `world-code`). What has worked:

- **Warm lights stay amber, not white.** The Leerie's mantles at `#ffd690` were the whitest light in the bowl and off the dusk's palette; at `#ffbc72` they sit with the post lamp `#ff8a3a` and the lit doorway `#ffae5c` (coherence pass).
- **Coloured lamps against a dark ground.** The house's 199 lamps in four colours are emissive glass with a halo that never shrinks under about two pixels, so at 200 m they read as separate coloured points (`src/v8/house/lamps.js`; `65-house-far-glow`), and only two real point lights. Their first round blew the court to white (`65-house-court-blown-out`), the second glared from 15 m (`69-repairs-house-near-before`); quieter, the wall reads (`-after`).
- **An emblem glows only in the gutter.** The Heliarch roundel's ember disc is dull bronze in full sun and lights as the sun gutters (`src/v8/strata.js` tick). By day the shape carries it.
- **Light has a source.** The Deodand Wood's ember shafts are loved, but "in some places they too obviously originate from nowhere" (owner, #19); now each falls from a gap in a tree's crown down the sun's line, its top ending among leaves (`src/v8/shafts.js`). A glow, pool or shaft wants something visible it comes from.
- **A few unnatural lights, kept few.** The Lattice's blue (`crystal`, `crystalDeep`), the corpse-candles, the moss light `#46e8c8`, the four stones: each reads because it is the only one of its colour in its frame. The Prospect's daylight-blue canvas is "the brightest colour in the frame, on purpose" (coherence pass).

## The gutter

Every minute or so the sun gutters: `ctx.sky.flicker` dips toward 0.2. Tie emissives and point lights to it where it reads well. What exists: the house's lamps dim to a nervous flutter, some sputter out and are relit one by one; the Leerie's row lights in a wave; the roundels glow. A known oddity: the Cincture's rim outshines the failing sun in a gutter (coherence pass; left as briefed). Render with the gutter held (`"js": "window.__fp.sky.flicker.hold = 0.3"` in a `views.mjs` view) as well as without.

## Checks worth a render

- Any new emissive at its nearest likely distance (blow-out) and its farthest (does it still read as a point, or vanish).
- Bloom on small bright lights in Firefox and WebKit too (`FP_BROWSER=firefox|webkit`): v6 found lights drawn as squares there (stage 42).
- The place's grade on a phone at `?q=low` when it is darker or paler than the moor.
- With the sun in frame and with it behind you: crepuscular rays and the haze change what reads.
