# Wilderness modules

What each module under `prototypes/wilderness/src/` owns. Every agent that adds a module extends this table by one row; a module that changes what it owns updates its row.

`src/world.js` is the map: `LANDMARKS` (each with a centre, radius, placeholder name and a line of flavour; one may have an `axis`, a line it is the distance to, and `at`, where the debug panel lands you), the `CAUSEWAY` polyline, `WATER` bodies, `SPAWN`, `SUN` (fixed direction) and `PALETTE`; and for v4, `PEAKS` (the named peaks on the walls), `REGIONS` (the bioregions' shapes), `SITES` (every reserved v4-v6 site, not yet landmarks) and `CAUSEWAY_V4` (the road from the colossi's feet to the pit: `ctx.causeway` and `causewayDistance` use it; `CAUSEWAY` stays v3's stretch for the bench and the things placed by it). Names are **[Proposed]** placeholders in the game's register; Austin decides names, per `design/naming.md`.

| Module | Owns |
|---|---|
| `main.js` | renderer, lights, shadow camera, frame loop, module loading |
| `terrain.js` | heightfield, biomes, water levels, terrain material |
| `atmosphere.js` | global fog patch: height fog + sun in-scatter on every fogged material |
| `sky.js` | sky dome, sun, moon, stars, high cloud, the sun's guttering |
| `controls.js` | first-person movement, colliders, touch stick, look and hop |
| `post.js` | bloom, crepuscular rays, grade, vignette, grain |
| `hud.js` | title card, landmark names, the title card's loading bar (fed by `ctx.progress(label, fraction)`; "Go out" enables on `body.ready`) |
| `vegetation.js` | grass, heather, reeds, trees, fungi, crystal lattice and its mother crystal (`vegetation/mother.js`) |
| `structures.js` | keep, tower, stones, causeway paving, court ruins, byre, cairns; `structures/keep.js` the v5 recast of Carcanet Keep, `structures/keep/v2.js` the v4 keep (`?keep=v2`); `structures/court.js` the v5 recast of the Sunken Court, `structures/court/v2.js` the v4 court (`?court=v2`); `structures/arches.js` the v5 recast of the Arcature (a stone armillary), `structures/arches/v2.js` the earlier arch-nest (`?arcature=v2`) |
| `water.js` | tarn and fen surfaces |
| `particles.js` | dust, ash, corpse-candles, fireflies, mist wisps |
| `fauna.js` | things that move: wings, the deodand, lesser creatures |
| `audio.js` | procedural wind, drone, footsteps, calls; the mute button |
| `skylife.js` | sky events: the Parhelion City, the Vigilant, omens (procession, shard belt, still star) |
| `rocks.js` | pebbles, stones, boulders, tors |
| `debug.js` | teleport panel, live position, on/off rows |
| `perf.js` | profiler overlay, bench path, runtime toggles, `ctx.perf` |
| `lights.js` | point-light slots: the nearest sources copied into 3 fixed lights |
| `shadows.js` | shadow-map cadence and the far cut-off for creatures' shadows |
| `tier.js` | quality tier choice, the adaptive pixel ratio, the debug panel's quality rows |
| `gpumem.js` | texture and render-target bytes and per-frame uploads, for the profiler |
| `fade.js` | the fade kit for cross-fades: `FADE_GLSL` (`fpFadeKeep(f, side)`, a still screen-space dither: side 0 keeps a share f of the pixels, side 1 the rest), `withFade(material, { key, attribute \| vertex \| fadeExpr })`, `fadeDepthMaterial(opts)` for the shadow pass; `node tools/fade-test.mjs <base>` checks it |
| `v2/flora.js` | the Heliotrope Sward; grey reeds at the Wrong Colour |
| `v2/ruins.js` | the Hypogeum, the Gradine, the Cutting, the Carillon Flags |
| `v2/inhabitants.js` | the Wimpled Guest, the Sable Galley, the Menology and its lizards |
| `v2/riverlife.js` | the Salt-Pedlars, the Wrong Colour, the fall's spray and rumble |
| `v4/mountains.js` | the walls (called from `terrain.js`'s marked block): front range, main wall, buttresses, bench, bedding, talus, named peaks, the sun's saddle with its walkable wedge and AM's seats, AP's battlemented ridge on the north-east crest; the two far ranges; `ctx.mountains` |
| `v4/kit/` | the shared kit on `ctx.kit`: cyclopean masonry, stairs, measure figures, rook wheels, fog tiers (`fog.js`, used by `atmosphere.js`); `?only=kit` loads its test scene |
| `v4/regions.js` | the eight bioregions' shapes and weights, their hooks into terrain, vegetation, rocks, air and audio; `ctx.regions` |
| `v4/regions/<key>.js` | one bioregion each (world modules `region-<key>`), filled by the region agents; `common.js` their shared helpers |
| `v4/regions/outwash.js` | BQ the Outwash: gravel plain, braided channels, the moraine, erratics, moss-campion, meltwater ticking; the white grouse |
| `v4/glacier.js` | the glacier's tongue, snout and ice (flow lines, crevasses, the snout's face), through `terrain.js` |
| `v4/regions/bletting.js` | BO the Bletting: rank grass, medlar thickets and the blackthorn hedge (planted by `trees.js`), honey-stone walls, windfalls, wasps, fruit dropping; the pomace snails |
| `v4/regions/high-ling.js` | BR the High Ling: the shelf and its scarp, deep ling, granite tors and clitter, gorse, grasshoppers and the tors' moan; the stonechats |
| `v4/regions/saltings.js` | BP the Saltings: the step down, the crust (plates, gypsum, runnels), glasswort, grey reeds, stumps, the crust creaking; the halite crabs |
| `v4/regions/strandline.js` | the Strandline: black flint shingle sorted in bands (a ground skin), the lap and the moonless tide, horsetail, bogbean and quillwort, midge columns, the sandpipers |
| `v4/regions/adust.js` | the Adust: crazed clay and red drifts (a ground skin), varnished sandstone pavements you can stand on, leaning rosettes and cushions, red dust, ticking stones, the head-standing beetles |
| `v4/regions/lynchets.js` | the Lynchets: terraces and ridge-and-furrow, drystone walls on every edge, docks, nettles and thistles, thistle-down, the creaking gate, the half-moult stoats |
| `v4/regions/demesne.js` | the Demesne: the eased lawn, parterre ridges, the ha-ha (a ground skin and a coursed wall), topiary yews, the fallen blocks, rooks, the white peafowl |
| `v4/regions/skin.js` | shared by those four: the fine ground skin over the coarse terrain, mesh-height sampling, instancing, stats |
| `v4/tarn.js` | Lees Tarn's new shore: the south bay to z 200 and the shingle spit, `tarnWet()` for `waterLevelAt`, the tide and the lap |
| `v4/span.js` | W the Great Span (landmark `bridge`): deck, piers, arches, the shut and the blocked gate in their crags, the two stairs, the fallen bays and the crack, the rockfall, BG the Postern; `span/plan.js` (every measure, the marked blocks' `spanGround` called last in `terrain.js`, `deckAt`, the vegetation's `spanClear`), `span/etch.js` (the triangles); `ctx.span` (`deckAt`, `floorAt`, `stats()`); `?skip=span` |
| `v4/paths.js`, `v4/paths/` | the map structure: the leads P1-P17, K1, R1-R5 (`routes.js`: traced from the plan, each worn in its region's material; vegetation wears the cover off them), the pit and the taller fall's face and the runnels' cuts (`ground.js`, called last in `heightAt`), the pit's lip and the road's end, the fall's mist column; `ctx.paths` (`stats()`, `leadAt(x, z)`); `node tools/paths-test.mjs <base>` checks them |
| `v4/tinctures.js` | the Tinctures (DI): each region's air hue turns the haze colour and the hemisphere light at the same luminance, from `regions.airAt` at the camera (`ctx.tinctures`; `?tinct=0` off) |
| `v4/dressing.js` | terrain set-dressing (`ctx.dressing`; `?skip=dressing`): `dressing/figure.js` DG the Long Figure on the east wall, `dressing/track.js` DC the Discontinued Track's footprints in the Saltings, `dressing/pegs.js` DH the Surveyor's Pegs along x = -80; `node tools/dressing-test.mjs <base>` checks them |
| `v5/thrones.js` | AM the Acephalous Thrones: two headless colossi crawling out of the west wall on the saddle's seats, one surface-nets mesh in the terrain's material with a gutter rim on the shoulders (`ctx.thrones`; `?thrones=0` leaves them out) |
| `v5/galleries.js` | AL the Galleries of Durance on the west wall: tiers of galleries, booms, gantry towers, a lift, chains, wheels and lamps, all moved on the GPU from one clock; `ctx.galleries` (`stats()`, `offset`); `?galleries=0` |
| `v5/lamps.js` | AO the Escarpment Lamps: 432 window-lights in rows on the west massif's face (bearings 300-318, 60-220 m up), one Points draw, each with its own flicker; one goes out for good at every gutter; `ctx.lamps` (`stats()`, `gutter()`, `order`); `?lamps=0`, `?lamps=dark=N` |
| `v5/plinths.js` | AW the Plinth Road: twelve pairs of 20 m plinths in the kit's masonry from the Bletting's hedge to the north-east wall's foot, the paving, the robed figures' feet (one surface-nets mesh), the fallen and broken plinths; `plinthsClear`/`plinthsPaved` (read by `rocks.js` and `vegetation/ground.js`); `ctx.plinths` (`stats()`); `?plinths=0` |
| `v5/hawser.js` | BA the Hawser: one chain of 15 m stud links from a bronze hawse collar on the north wall into the Sunken Court's paving, its rare one-link shift (the jerk, the `hawser-groan` cue in `audio.js`, the dust); `ctx.hawser` (`shift(at)`, `stats()`); `?hawser=0` |
| `v5/annals.js` | AK the Annals: a worn frieze of 40 m figures in a band 110–130 m up round the main wall, in the terrain's fragment shader (terrain.js calls `injectAnnals`), read in raking light, its light swung while the sun gutters (`ctx.annals`: `uniforms`, `flipHold`; `?annals=0`) |
| `v5/cincture.js` | AQ the Cincture: a broken hoop round the world seen from inside, from the south-east horizon over the east (55° up at bearing 65) to the north; a chunk of `sky.js`'s dome shader (`cinctureGLSL()`, no draw calls, no uniforms of its own), its sunward rim lit red, brightening while the sun gutters; `RING` (the solved geometry); `?cincture=0` |
| `v5/occultation.js` | AR the Occultation: 3–7 minutes after the last, a band of shadow 400 m long, 200 m up, crosses the bowl west to east at 2 m/s (about six minutes); chunks in the fog (atmosphere.js calls `injectOccultFog`), the terrain (`injectOccultation`) and the sky (`injectOccultSky`) darken the haze, the walls and the disc's eastern limb by its sun-projection; `ctx.hush` quiets the birds under it (`ctx.occultation`: `pass(at)`, `uniform`; `?occult=0`, `?occult=now`) |
| `v5/keptfire.js` | DN the Kept Fire: a hearth on the Outwash beside P6 with a ring of stones, pot on a tripod, driftwood pile that grows a piece per visit, one warm point light, one Points for flames and smoke, a flare when you come within 12 m (the erratics' shadows swing out); `ctx.keptFire` (`flare`, `visit`, `stats`); `?keptfire=0` |
| `v5/dressing.js` | the story set-dressing, `v5/dressing/<part>.js`: CY the Collation (an 11 m table laid for twelve in a clearing in Medlar Close), DE the Slipper (one brocade slipper on the causeway's first slabs), DF the Unfinished Prospect (an easel at the High Ling's brow with a baked, repainted canvas of the view, `prospect-canvas.png`, the one image the prototype loads); static, 4 draw calls, 8k triangles; `ctx.dressing5` (`stats()`); `?dressing5=0` |
| `v5/nave.js` | BD the Foundered Nave: a ragged hole in the east moor's turf (the terrain's triangles over it taken out, the heightfield untouched) over a buried hall of octagonal columns running east-west under the moor into the dark, black water 14 m down with three indistinct shapes in it (splashes, rings, one surfacing when you stand still), the rim's colliders; `nave/ground.js` the plan and the clearances (`naveClear`, `naveHole`, read by `rocks.js`, `vegetation/ground.js` and `structures/scatter.js`); `ctx.nave` (`stats()`, test hooks `splash`, `surface`, `place`, `hold`); `?nave=0` |
| `v5/lights.js` | the local lights: bioluminescent moss in the Deodand Wood's hollow, the embers under the Arcature, a guttering lamp on a post by the causeway, the lens mount's door ajar and lit, the Leerie's twelve standards beside K1, unlit except while the sun gutters, when all twelve light in a wave and go out together at its end; one solids mesh, one glows mesh, five point lights (the Leerie's two only in a gutter); `ctx.localLights` (`stats()`, `mothLamps`), `ctx.leerie` (`light(true | false | null)`, `lit`); `?locallights=0` |
