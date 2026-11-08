# Releases

One entry per merge to `main`, newest first. Short: what a visitor to [below-a-fading-star.netlify.app](https://below-a-fading-star.netlify.app/) will notice, and what changed underneath. The screenshot archive in `shots/` carries the pictures; stage numbers refer to its table.

## v4 (2026-11-08) — the land and the Great Span

Stages 21–26. Spec: `wilderness-v4.md` (the Span, the map structure, the light) and `wilderness-v5.md` (the bioregions, the Tinctures, the terrain set-dressing), placed by `wilderness-v4-placement.md`. The wonders, the awe-audit recasts and the local lights wait for v5.

- **What a visitor notices**: the bowl is no longer one moor. Eight bioregions, each with its own ground, stone, plants, air, sound and one creature: the Outwash's gravel foreland and white grouse under the rebuilt glacier; the Bletting's medlar thickets, honey-stone walls and pomace snails; the High Ling's heather shelf, granite tors and stonechats; the Saltings' cracked white crust and halite crabs along the fen; the Strandline's black shingle and sandpipers on the tarn's new south bay and spit; the Adust's crazed red clay, varnished pavements and head-standing beetles; the Lynchets' terraces, drystone walls and stoats; the Demesne's lawn, ha-ha and white peafowl round the keep. The air takes a faint colour from each (`?tinct=0` to compare). The walls are four ranges deep with the sun in a flat-floored saddle, and the whole scene is brighter at the floor (`?light=v3` for the old rig). The sun's gutter lasts 12–16 s.
- **The Great Span** replaces the Trigon Span: a straight span on ten piers along the bowl's south, deck at 56 m, a shut west gate and a rockfall-blocked east gate, three fallen bays with their pieces in the hollow, the fen and on the canyon's rim, a crack you can hop, two switchback stairs you can climb to the deck, and the Postern, a small door ajar at the foot of the west gate. From the parapet the whole bowl shows.
- **The map**: the causeway now runs from between the colossi's feet on the saddle floor, round the keep and out across the Saltings to a ragged pit that has swallowed its end; 17 paths, a kerb and 5 rivulets lead between places in each region's own material; the Tumbling Water is 2.5× taller with a wider mist and a rumble that carries 140 m. On the ground: the Long Figure cut through the east wall's turf, the Discontinued Track of footprints in the salt that stop, and the Surveyor's Pegs in a dead straight line wall to wall.
- **Under the hood**: `ctx.mountains` (crest, face, saddle, walk limit), `ctx.kit` (cyclopean masonry, worn stairs, measure figures, fog tiers), `ctx.regions` (region weights, cover, stone, air and sound hooks that each region module fills), a finer ground skin over the coarse terrain where a region needs relief the heightfield cannot give, a tarn with a tide, the landmark `bridge` as a line. New tests: `regions-test` 48, `paths-test` 43, `dressing-test` 20; `walk-test` climbs the west stair and hops the crack. A polish pass (stage 26) closed the reviews' findings: the ground skin's edges, the salt crust and glasswort, the road on the crust, the bay's shore, a second collider ring at the pit. Bench pinned to the v3 road so its numbers stay comparable; at `?q=low` on the laptop the bench's GPU time went from 16 to about 19 ms with all of v4, still inside budget.
- **Not in v4**: the fall is not visible from the causeway at (−40, 22) (the keep hill's skirt is in the way); the Saltings' heat shimmer; the awe audit beyond the Span's sightlines; the Span's gates read as flat fronts and its west deck lies in the west crag's shadow; the pegs are hard to find except close up. Open calls for Austin are in `MORNING.md`.

## v3 (2026-11-08) — the same picture, running cooler, and a medium tier

Stages 15–19. Spec: `wilderness-v3.md`, stages 2 and 3, and the flickering spars. Also in this merge: the plan for the next three releases, `wilderness-v4-placement.md`, with its maps at stage 18.

- **What a visitor notices**: little, on purpose. The frame rate is capped at 60 and the render loop idles under the title card and in a hidden tab, so fans stay quiet; walking is slower; the fall's rumble keeps time when frames stall; the wind mix is quieter; a favicon; the page survives a lost WebGL context. The tall thin spars that popped in and out at the fen's edge were reed seed heads (and grass heads and flower florets) scaled apart from their own stems by the wind shader; they sit on them now.
- **A medium tier** for laptops, between high and low: picked from the GPU's name or the first three seconds of frame times, with the same scene as high at a lower pixel ratio and a smaller shadow map. An adaptive step lowers the pixel ratio when the 1% low stays over budget and raises it back with headroom. The debug panel's quality rows show the tier and pin one (`?q=medium`, `?tier=`, `?adapt=0`).
- **Under the hood, stage 2**: pixel ratio by tier, the shadow map redrawn every other frame and far creatures without shadows, bloom at half size, point lights in three slots nearest you, update throttling by distance, instanced trees and Lattice where `WEBGL_multi_draw` is missing (Firefox: 3992 draw calls to 538), binned down-casts for the perch searches.
- **Under the hood, stage 3**: a lean canvas (no unused MSAA or depth buffers; high 256 → 184 MB of GPU memory on a retina laptop), per-frame allocations 5.9 → 2.2 THREE objects (`Math.hypot` was the culprit), the plant chunk repack only when a chunk in view is short (worst frames 8–11 → 2–3 ms), terrain bump and fine detail skipped past 60 and 120 m, water ripples dropped past 120 m, far grass and reeds as single triangles, grass distance by tier. Every change has a `?flag=0` listed in `README.md`.
- **Not in v3**: stage 4's hardware table waits for Austin's bench runs; real antialiasing at high (there has been none since the post chain went in) is a decision for later; alpha-to-coverage was not possible without MSAA on the composer's target.

## v2.2 (2026-11-08) — a hop and a hush for phones

Stage 20 (renumbered from 15 when v3 merged). Nothing in the world changed; renders `20-touch-*`.

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
