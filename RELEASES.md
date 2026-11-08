# Releases

One entry per merge to `main`, newest first. Short: what a visitor to [below-a-fading-star.netlify.app](https://below-a-fading-star.netlify.app/) will notice, and what changed underneath. The screenshot archive in `shots/` carries the pictures; stage numbers refer to its table.

## v2.2 (2026-11-08) — a hop and a hush for phones

Stage 15. Nothing in the world changed; renders `mobile-15-*`.

- **A hop button** on phones: a small hairline ring left of and below the thumbstick hops, as Space does.
- **A mute button** on phones, faint, top right: a tap silences or restores the sound and is remembered; a long hold still opens the debug panel.
- **The thumbstick no longer leaps** to the other finger in mobile Safari when walking and looking change hands quickly: a touch identifier the browser reuses or stops listing now releases the stick. `tools/touch-test.mjs` checks it.

## v2.1 (2026-11-08) — a loading bar, and the instruments for the heat

Stage 14. Spec: `wilderness-v3.md`, stage 1 and the loading bar. Nothing in the world changed.

- **A loading bar** on the title card: a hairline that fills as the world builds, with the step's name under it ("shaping the moor", "growing the wood", "raising the keep"). "Go out" waits until the scene is ready.
- **A profiler**, `?perf=1` or the debug panel: frame time with the 1% low, CPU per module, GPU time per pass, calls, triangles, memory, lights, render size.
- **A bench**, `?bench=1`: a fixed 45-second walk from the gate along the causeway to the tarn and the fen and back, sun held steady, that ends with a summary and a JSON to download. Austin's runs go in `shots/perf/`.
- **Toggles** in the debug panel: every module, bloom and shadows, on and off without a reload; `?bloom=0`, `?shadows=0`.
- **Under the hood**: modules are built against a tagged view of the context so their updates and objects can be timed and hidden; a headless `tools/perf-test.mjs` and `tools/loading-test.mjs`.

## v2 (2026-11-08) — the river's people, and more life everywhere

Stages 12–13. Spec: `wilderness-v2.md`, sites in `wilderness-v2-placement.md`.

- **The Tumbling Water**: a fall from the eastern wall into the Speculum, a pool that reflects a young sun and never you; a canyon river that slows into the fen. Wading, a bridge, a walkable Trigon Span deck.
- **New places**: the Heliotrope Sward (flowers that face the sun, close when it gutters, turn to you up close), the Menology (36 menhirs, lizards), the Hypogeum (a bronze door, glyphs that shift after a gutter), the Gradine (steps up the wall into haze), the Cutting (strata of stone, black glass and lattice), the Carillon Flags (bronze caps that ring underfoot), the Wrong Colour (a pool whose hue will not settle, grey reeds round it).
- **New inhabitants**: the Salt-Pedlars on dragonflies over the slow water; the Wimpled Guest at the taverna's fountain, whose gaze costs you a heartbeat; the Sable Galley crossing Lees Tarn behind the woman in the water; a stilted wader that is gone when you look.
- **More life, tied to places**: the cloak of eyes at the Wayside Shrine, the slinker at the Court, the Lattice and the Wood, two grazer herds, rooks at the Yard, moths at the lamps, bats out of the tower at every gutter, beetles on the bronze door, biomesh at 2.5× with runners you can watch spread.
- **Sky**: the Parhelion City in the sun's saddle, solid only while the sun gutters; the Vigilant crouched on the east wall, head turning when unwatched; a procession of lights, a shard belt, a still star that creeps while you stand.
- **Sound**: twenty new procedural cues, all positional, and a waterfall loop that swells as you approach.
- **Controls**: faster walking, a thumbstick at bottom right on phones, a debug teleport panel (`?debug=1`), a slower sun gutter, pointer-lock fixes for Firefox and a drag-look fallback.
- **Under the hood**: light-space texel snapping for the shadow camera, grass chunk culling fixed (with a headless test), stones kept off steep wet walls, shrine and graveyard pinned to their landmarks, an artifact build that rewrites bare imports.

## v1 (2026-11-07) — the moor, the keep, the things between

Stages 00–11. First release of the wilderness: terrain, sky and the guttering sun, the keep and causeway, the Cardinal Stones, Lees Tarn, Corpse-Candle Fen, the Deodand Wood and Byre, Medlar Close, the Sunken Court, the Lattice, the Armiger's Tower, the Arcature, the Pomegranate House, the Trigon Span, the Wayside Shrine, the Leaning Yard. Vegetation, water, particles, fauna (crows, grazers, the deodand, the woman in the tarn, the traveller and wagon, the man in the cloak of eyes, the slinker, the biomesh), sky life, procedural audio, first-person controls with touch, and the headless render, walk and audio tools. Deployed to Netlify and as a claude.ai artifact.
