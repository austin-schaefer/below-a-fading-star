# Wilderness runtime reference

The URL params, the quality tiers, the shadow cadence, the profiler and what each test checks. Paths are relative to the repository root. Every agent that adds a flag appends it to its milestone's group here (v6: "The v6 switches"; v7: "The v7 living"); keep-both merges have doubled whole groups before, so grep for duplicates after a merge.

## URL params

### General

- `pos=x,z`
- `yaw=`
- `pitch=` (radians; yaw 0 looks north along -z, π/2 looks west along -x)
- `q=high|medium|low` (or `tier=`; pins the tier for this load)
- `only=vegetation,water` to load only some modules
- `skip=audio`
- `wind=0.5` to scale the wind (the audio and the plants' sway; `wind=0` holds the plants still)
- `perf=1` (profiler)
- `bench=1|<seconds>`
- `machine=<name>`
- `bloom=0`
- `shadows=0`
- `gpu=0` (profile as if the GPU timer were missing)
- `debug=1`
- `tinct=0` (no regional tint on the haze and the light)
- `placegrade=0` (no per-place exposure, saturation, contrast and warmth in the finish, v8-02); `shafts=0` (no ember shafts in the wood)
- `gutter=<len>,<every>` (seconds; pins the sun-gutter's length and interval and starts the first one within one interval; `gutter=v3` restores the old 6.5-9 s every 70-150 s; the default is 12-16 s every 60-110 s, timings exported from `src/sky.js`)

### v3 stage 2 switches (each defaults to the new behaviour; see `plans/wilderness-v3.md`)

- `cap=60` (frames per second; `0` uncapped)
- `idle=0` (full rate under the cards and when unfocused)
- `dpr=` (pixel ratio; default high 1.25, low 0.85)
- `shadowhz=2` (`0` redraws the shadow map every frame)
- `shadowdyn=15` (box-move redraws a second while turning, and creature-pose redraws; default 10 on integrated GPUs)
- `shadowcull=0` (far creatures keep their shadows)
- `pcf=soft|hard`
- `bloomres=0.5` (`1` full size)
- `bloomtune=strength,radius,threshold`
- `bloomcap=16`: the ceiling on bloom's bright pass (brightest channel; NaN and Inf drop to black), `src/bloomfix.js`; `0` is three's bright pass entirely (no ceiling, one tap per texel)
- `lights=3` (slot count; `off` keeps every point light live)
- `throttle=0` (every update every frame)
- `light=v3` (v3's light rig)
- `regions=1` (the regions tinted on the ground)
- `batch=instanced|batched`
- `multidraw=0` (hide `WEBGL_multi_draw`, as Firefox does)

### v3 stage 3 switches

- `adapt=0` (hold the pixel ratio; `1` adapts even during the bench)
- `budget=<ms>` (the adaptive step's 1%-low budget; `1` forces a step down)
- `smap=` (shadow map size)
- `precompile=0` (compile each shader program at its first draw, not all of them behind the title card)
- `warmup=0` (upload each geometry and texture at its first draw, not all of them behind the title card: `src/warmup.js` draws the scene once, every object shown and unculled, into a 4×4 corner of the scene buffer with the shadow map, then `initTexture`s every material's textures; `?perf=1` logs what it uploaded and its time)
- `lean=0` (the canvas's MSAA at high and depth buffer, and depth buffers on every composer and bloom target, as before stage 3)

### v3 stage 3 vegetation and material switches (each on by default)

- `vegscan=0` (repack every plant kind whenever its chunks change, generate a chunk in one frame)
- `fargrass=0`
- `reedlod=0` (full clumps at every distance)
- `grasstier=0` (high's grass distance at every tier)
- `sort=0` (trees in build order)
- `bands=0` (terrain bump and fine detail at every distance)
- `waterfar=0` (the tarn's and fen's fine ripples at every distance)

Tree LOD (`vegetation/trees.js`): near, mid and far at 24 and 72 m (18 and 55 at low), scaled by kind, with 4 m of hysteresis. A switch closer than 120 m cross-fades for 0.4 s: one of 48 spare instances holds the old level while both dither with `fade.js` (the fade rides in the BatchedMesh's colour-texture alpha, or the instanced stand-in's `aFade`); out of spares a switch is hard (`trees.fadeOverflow`; `trees.fades` counts fades in flight).

### v5 recasts

- `tower=v2` (the Armiger's Tower as it stood to v4, from `src/structures/tower/v2.js`, instead of the lens mount in `src/structures/tower.js`)
- `keep=v2` (Carcanet Keep as it stood through v4, built instead of the recast, to compare in the page)
- `court=v2` (the Sunken Court's colonnades and fallen head, from `src/structures/court/v2.js`, instead of the piers in `src/structures/court.js`)
- `arcature=v2` (the Arcature's earlier arch-nest, from `src/structures/arches/v2.js`, instead of the armillary in `src/structures/arches.js`)
- `arcature=h<m>` (the armillary with its top at `<m>` metres instead of `ARCATURE_TOP`'s 40, e.g. `arcature=h62`, to compare heights in the page)
- `lattice=v2` (the Lattice as it stood to v4, without the mother crystal of `src/vegetation/mother.js`)
- `gradine=v2` (the Gradine as it stood through v4, 112 treads to 58 m, from `src/v2/ruins/gradine/v2.js`, instead of the flight to 165 m in `src/v2/ruins/gradine.js`)

### v5 wonders

- `lamps=0` (the north-west wall without AO's Escarpment Lamps; `lamps=dark=N` starts with N already out)
- `thrones=0` (the sun's saddle without AM's two crawling colossi of `src/v5/thrones.js`; their seats stay, empty)
- `galleries=0` (the west wall without the Galleries of Durance, `src/v5/galleries.js`)
- `hawser=0` (leaves out BA the Hawser, `src/v5/hawser.js`)
- `hawser=shift` (forces one of its shifts 3 s after the frames start; `__fp.hawser.shift()` forces one from the console)
- `plinths=0` (the north-east without AW's Plinth Road of `src/v5/plinths.js`, its clearances in the rocks and the trees included)
- `ridge=0` (the north-east crest without AP's merlons, in `src/v4/mountains.js`; the heightfield is built once, so reload)
- `annals=0` (the wall without AK's frieze, compiled out of the terrain's shader; `annals=mask` paints the relief red, `annals=shade` its raking term)
- `cincture=0` (the sky without AQ the Cincture, the broken ring of `src/v5/cincture.js`)
- `occult=0` (no AR Occultation: its band of shadow, `src/v5/occultation.js`, is compiled out of the fog, terrain and sky shaders)
- `keptfire=0` (the Outwash without DN's Kept Fire of `src/v5/keptfire.js`; `keptfire=visits=4` starts as if four visits had been made; `__fp.keptFire.flare(s)` poses a flare)
- `occult=now` (starts a pass 3 s after the frames start; `__fp.occultation.pass(at)` poses one `at` seconds in and holds it, `pass(null)` clears it; `occult=mask` puts every term at full strength, `occult=paint` paints the wall term red, the air green and the sky blue)
- `nave=0` (the east moor without BD the Foundered Nave of `src/v5/nave.js`: the terrain keeps its triangles over the hole, and the clearances in the rocks, the trees, the ground cover and the scatter are off)
- `locallights=0` (none of the five local lights of `src/v5/lights.js`; `locallights=moss,embers,post,door,leerie` builds only those named; the Leerie's standards light only in the sun's gutter, `__fp.leerie.light(true)` poses them)
- `dressing5=0` (leaves out the Collation, the Slipper and the Unfinished Prospect of `src/v5/dressing.js`; `collation=0`, `slipper=0` and `prospect=0` each its own; the ground cover's clearings go with them)
- `threads=0` (leaves out v8-04's story threads, `src/v8/threads.js`; `traveller=0`, `chair=0` (the Collation keeps its twelfth chair), `gold=0` and `painter=0` (v8-08) each its own; their ground-cover clearings go with them)

### The v6 switches

v6-01 adds only the counters and `pop-test`. Later v6 agents append their `?param=` here, one line each.

- `post=v3` restores the three passes after the scene (bloom's full-size blend, the grade, OutputPass) in place of the finish pass (v6-02)
- `rays=full` marches the crepuscular rays at every pixel in the finish (or the grade), not in their quarter-size pass (v6-02)
- `postclock=0` pins post's clock, so the grain and the rays' jitter are the same between loads (render pairs) (v6-02)
- `bloommips=1..5` blurs only the first n of bloom's five mips (default 5; the finish chain only) (v6-02)
- `aa=off` draws without the FXAA folded into the finish pass (on at every tier) (v6-02, v6-08 Q1)
- `grain=<multiplier>` scales the film grain (0.6 = the default, the owner's pick from the v6-02 compare set; 1 = the old 0.02; 0 = none) (v6-02)
- `plantfade=0` (grass and reed chunks switch to the far clumps at once at 60 m and 50 m, instead of crossing over 8 m: a chunk within 4 m of the switch, plus 2 m slack, is packed into both meshes and the two dither by the chunk's nearest-edge distance, `src/fade.js`) (v6-05)
- `rockfade=0` (pebbles and stones cut at their reach, and fine boulders swap to their coarse twin at 140 m, instead of fading over the reach's last 15% and over 132-140 m; low: 51-60, 127.5-150, 102-110) (v6-05)
- `packstep=6` (rocks repack every mesh on one frame once the camera has moved 6 m and upload whole buffers; plant packs sort with a closure, copy with subarrays and ignore the frame's pack token, `ctx.packToken`) (v6-05)
- `xfade=0` (v6-04: trees switch LOD hard, with no spare instances, and build v5's far mesh)
- `fungifade=0` (v6-04: toadstools and pods cull by 100 m group at 90 m, with no distance fade)
- `bloomkernel=box` (v6.2: bloom's mips blur with three's near-box kernel, sigma equal to the radius and cut at it, instead of a Gaussian of the same variance taken to 3 sigma; the box is what draws a bright glint or light as nested soft squares)
- `bloomprefilter=0` (v6.2: bloom's bright pass reads the scene with one bilinear tap per texel, 2×2 of the 4×4 pixels under it, instead of four taps over all of them; one tap turns a line one pixel wide into dots). `?bloomkernel=box&bloomprefilter=0` is v6's bloom

### The v7 living

(each v7 module's flag; see plans/wilderness-v5.md, "## v7, the living")

- `canyon=0` (no `living-canyon`: no Bather, stones or Toadstone); `bather=0` and `toadstone=0` leave out each alone (v7-06)
- `reach=0` (DP the Luminous Reach's chunks compiled out of the river's and the fen's shaders, which are then exactly as before); `reach=mask` paints the glow red, to check where it lies (v7-06)
- `still=0` leaves out all of `living-still` (and the grass and stone clearances that go with it); `sleeper=0`, `stylite=0` and `accrescent=0` leave out each alone (v7-03)
- `glyphs=0` leaves out all of `living-glyphs` (the caps stay plain); `scriveners=0` the shoal, `moles=0` the heaps and their tesserae, `glyphmotif=0` the caps' glyphs, the tessera's and the erratic's (v7-04)
- `walkers=0` (v7-01: no Thurifer, Leerie or Link-Boy); `thurifer=0`, `leerie=0`, `linkboy=0` each its own
- `roads=0` (v8-01: no gnomons, and the causeway gets its v3 waymarkers back)
- `rockcut=0` (v8-11: the rocks as v8-10 left them: every boulder, no cleared-ground table, the pale high-contrast lichen, uncapped region lichen; `node tools/rocks-test.mjs <base> [low,high]` checks every stone's and boulder's footprint against the walkers' lines, the roads and the built places, every rock's and drawn tree's against the Long Figure (v9), the common's boulder count, the boulders' share of the uncut count, and the lichen's contrast)
- `twk=0` (v8-07: no Twk-men, no salt at the spill or the house; `node tools/twk-test.mjs <base>` pins their stations, the inspection's metre, the quarrel, the salute, the salt line, the guard and the gutter)
- `workers=0` leaves out the workers (`src/v7/workers.js`): `taker=0`, `coheirs=0`, `sexton=0` each one
- `small=0` leaves out all of `living-small`; `indistinct=0` the blur on the ha-ha, `repetend=0` the bird and its echo, `simulacrum=0` the gnat columns; `simulacrum=face` forces the face on and `simulacrum=noface` off (v7-05)

### v9 music

- `music=<track>`: plays that track (any of the nine) 3 s after the walk begins, whatever the setting, and nothing else (the director is out of the load); `music=0` is no music. Unknown names warn in the console.
- `musicspeed=N`: the director's waits run N times faster (tests). The setting "Music (experimental): off / rare / default / frequent" is in the settings panel's Sound group (`fp-music` in localStorage), **off by default** (v9-M6): with it off nothing of the music but its glue is fetched, built or ticked. The debug panel lists the tracks as rows (playing one loads the music).
- The Sound group's three level sliders (v9-M6): Sound effects (`fxBus`: the dry and cue buses, and `fxVerb`, their reverb sends), Ambience (`ambBus`: the wind, drone, insects, place sounds, stones and region beds, and `ambVerb`), Music (`musicLevel`, after `musicBus`); `audio.levels`, `audio.setLevel(kind, v)`, `fp-level-<kind>` in localStorage; at 100 each gain is 1, the mix as made.

### v9

- `waystation=0` leaves out the Lantern Halt on the causeway (`src/v9/waystation.js`; its rock clearing stays)

### v10

- `salt=1`: the salt-for-news act (`src/v10/salt.js`, with the house station's two far riders and the `'script'` rider mode in `src/v8/twk.js`) is written and shelved: off unless asked for, and with it off nothing of it is registered, drawn or updated. `SALT=1 node tools/acts-test.mjs` and `SALT=1 node tools/audio-test.mjs` include its rows.
- `acts=0`: no acts (`src/v10/acts.js`): nothing offered, nothing read from or written to `fp-acts`, and each place draws as it did before (the tally its own strokes only). The settings panel's Marks row ("Forget my marks") clears `fp-acts` and redraws every act's place. `node tools/acts-test.mjs <base>` checks the offer (not from the road, 30 m off, facing away or away from the row's end; offered in front of it, nothing behind the paused card or the settings panel), `E` and not Ctrl+E, the stored mark, the stroke drawn in view, once a visit, busy, `when()`, `at.y`, `data`, the stroke after a reload, the forget row, corrupt, tampered and refused storage, `?acts=0` and the tap on a touch page, and renders `shots/wip/acts-halt2-*.png`; v10-A4 adds the chalk over the next stroke and moving with the count, the seat not offered before the stroke, coming down after it, the ride (carried, no hop; held while paused or the panel is open; on through a gutter; the sleeper answering; pushing to walk lets them down exactly where they got on; a teleport mid-ride) and the second pillow on a return visit. `node tools/tally-frames.mjs <base> [prefix] [all|chalk|ride]` renders the act in order on Playwright's clock (the walk's own time, however slow the browser): the approach, the offer, the view from the chalking spot at 0, 0.4, 1, 1.6, 3, 5, 7, 9 and 12 s after E without moving the look (the stroke, then the seat coming down into it), the seat's offer, the ride, the top at 0, 2, 5 and 8 s, outward, set down, the winch; `return` a return visit's top; `PHONE=1` at 390 x 844. acts-test also checks the seat in that view within a metre of the stroke and offered there, the salt, the seat going back up when the visitor walks away, and a carrier that throws
- v10-A1: `tools/acts-central.mjs` adds the crystal's and the door's rows to `acts-test` (offered at each, not from far or facing away, done and the answer run through, remembered after a reload, forgotten; the door's third knock; `?acts=0` leaves the door as it was); `CENTRAL=0` skips them. With `?acts=0` neither is offered and there is no ember, thread, blue lintel, great ring or plate
- `bell=0`: no bell under the Span (`src/v10/bell.js`), nor its ram, post, candles or acts (the traveller's letters stay where they lie). acts-test's `bell:` rows check the offer at the post and not from 28 m, facing away or from beyond it, the ram and the bell in view, `E` hauling the ram metres, the stroke, the swing, the candles kindling, gathering in the bell's mouth to wait while the visitor is away, going on to stand round the traveller when they come, `Gather his letters` (offered only then; the letters on his chest, the candles going up but one), all of it after a reload, and the forget row (`ctx.bell.ff` runs the minutes on); renders `shots/wip/acts-bell-offer.png`, `acts-bell-struck.png`

### v8

- `strata=0` (v8-03: no `strata` module, no signs or spolia, and the Pomegranate House, the byre, the shrine and the Leaning Yard as in v7)
- `house=0` (v8-05: the Pomegranate House unlit and empty: no lamps, strings, poles, people, voice or swept court, and the court's lantern keeps its own light)

### The walls

- `mountains=v4` builds the v4 wall and its far ranges (a steep face to a fractal crest, a front range) instead of the massifs (`src/v4/mountains.js`; `plans/wilderness-v5.md`, "The massifs"), to compare

## Quality tiers

Quality tiers (`src/tier.js`). Without `q=`, the tier pinned in the debug panel's quality rows (kept in localStorage), else the device: a phone or 4 cores or fewer is low; a discrete GPU (by its WebGL renderer name, or WebGPU's adapter info) high; an integrated one medium; a software renderer low; anything else (Apple silicon, a masked name) starts high and drops to medium if the first 3 s of full-rate frames average over 1.15 frame intervals. Medium builds what high builds; it differs only in this table, so high and medium switch live and low reloads:

| tier | pixel ratio | adaptive floor | shadow map | 1%-low budget | builds as |
|---|---|---|---|---|---|
| high | 1.25 | 1.0 | 4096² | 20 ms | high |
| medium | 1.0 | 0.75 | 2048² | 33 ms | high |
| low | 0.85 | 0.6 | 2048² | 33 ms | low |

The pixel ratio is never above the display's, and never above 1.0 at medium or high on a GPU without its own memory (an integrated GPU or Apple silicon, by its renderer name; the floors stay). The adaptive ratio measures steady frames: the view turning under 0.35 rad/s and moving under 4.5 m/s for 250 ms. When their 1% low has been over the budget for 5 s of steady time (turning pauses the count), the ratio steps down 0.1 toward the floor; if the view has not held still for 20 s and every frame's 1% low has been over budget all that time, it steps instead. After 45 s with every frame's 1% low under 0.6 of the budget it steps back up 0.05, never to a ratio that failed in the last minute. After a step, a tier change or the tier probe, nothing steps for 20 s. Stalls (over 50 ms and twice the running mean) are left out. A due step waits for a steady frame right after a shadow redraw, so the composer's reallocation never lands mid-turn or on a redraw; `report().tier.steps` records each step's reason and wait. `?dpr=` sets the ratio and holds it.

Shadow cadence (`src/shadows.js`): the map is redrawn on a 2 Hz clock, at once when a creature within 40 m moves a texel, and when the box (40 m ahead of you, texel-snapped) has moved 3 m, which turning does constantly. While the view turns (over 0.35 rad/s), those box moves come at most 15 times a second (`shadowdyn=`), 10 by default on a GPU without its own memory, and only after a frame within the tier's budget; after an over-budget frame the redraw waits a frame, never more than 0.12 s (8 a second). Walking moves the box at once. Texel snapping keeps the shadows still between redraws (`shots/wip/fix-dpr-shadow-cadence-*`).

## Settings

The gear in the top-right corner (beside the speaker on touch, always visible, also under the title card) opens the settings panel (`src/settings.js`; markup and CSS in `index.html`; `ctx.settings`). Opening releases pointer lock; the gear, Close or Escape closes it, and the view is clicked again to take the mouse back. Escape while the mouse is captured is the browser's and does not open it. It holds the volume slider (0-100 on `audio.vol`, a squared taper, 100 the mix's own level, `fp-volume` in localStorage), the mute toggle (the same `audio.setMuted` as the speaker button, `fp-muted`), the quality tier (low / medium / high, the current one marked; choosing another navigates to `?q=<tier>`, replacing only `q`, `pos`, `yaw` and `pitch` and keeping every other parameter, with `debug=1` added if the debug panel is shown, so the world reloads where they stood), the mouse capture choice (capture on click, or drag to look through `controls.setDragLook`, `fp-draglook`; hidden on touch-only devices) a live position line at its top (`x 12  z −34  facing E`, 4 Hz while the panel is open and not at all while closed) with a "Show position" option (`fp-showpos`, off by default) that puts the same line bottom-left, and the whole map to teleport to under small headings: Spawn, Places (every named `LANDMARKS` entry: hand-picked stand points where they exist, else a point `r + 6` m from the centre toward spawn, plus the region cards), The living (the eighteen v7 figures from their `tools/views-v7-*.json` poses); via `controls.placeAt`, facing the thing or the sun; no cue. A teleport from either panel leaves the debug panel as it was. Region cards (`REGION_CARDS` in `world.js`: Taker of Altitudes for the Adust, Sleeper's Orchard, the Lynchets, Kenching Flats) show in the HUD where the region's weight is 0.5 or more and no `LANDMARKS` card is up. With the panel closed nothing runs. Frame pacing (`main.js`): the idle cap (10 fps under the title or pause card, or after 3 s unfocused) reads `document.hasFocus()` each frame and never applies while the pointer is locked, a movement key is down or a touch is active; opening the panel does not raise the pause card; the `#fps` readout appends "idle" while the cap is active. `node tools/settings-test.mjs "http://localhost:PORT/?q=low&shadows=0&bloom=0"` checks all of it on a desktop and a phone viewport (`SHOTS=1` writes `shots/wip/settings-01-{desktop,touch}.png`).

## The profiler

Measuring (`src/perf.js`): `?perf=1`, or the debug panel's `profiler` row, shows an overlay top-left with frame time (2 s rolling average and 1% low, the mean of the slowest 1% of frames), CPU ms per module inside the update loop (`frame` is main.js's own work, `core` updates registered outside a module), GPU ms per pass (render including the shadow map, the shadow map alone, bloom, rays, finish, and `post`, their sum; `grade` and `output` with `?post=v3`, null otherwise) where the browser has `EXT_disjoint_timer_query_webgl2` and `n/a` where it does not, draw calls, triangles, geometry, texture and program counts, lights by type (visible/total), pixel ratio and render size. `?bench=1` flies a fixed 45 s path (spawn, the causeway, the tarn's shore, the fen's edge, home) with controls off and the gutter held, samples every 500 ms, then shows a summary with the JSON to download; `?bench=<seconds>` runs the same path faster. `?record=<seconds>` (it implies `?perf=1`; `__fp.perf.record(seconds)` starts one from the console) records a pan: once the walker is out (card hidden, pointer locked, drag-look or touch) it keeps every frame's duration, timestamp and view yaw, and every 250 ms a sample (GPU passes, draw calls, triangles, pixel ratio and buffer, tier steps, shadow redraws total and dynamic, camera position and yaw, geometry, texture and program counts, uploads, CPU per module), skips idle time, and at the end releases the pointer lock and shows the bench's panel with the median, 95th, 99th and worst frame, the counts over 2× and 3× the median, the worst ten with the sample around each, and the whole record to download as `record-<date>-<commit>-<quality>-<machine>.json` (`__fp.perf.lastRecord()` returns it). The owner types `?q=medium&record=10`, clicks Go out, pans for ten seconds and sends the file. `__fp.perf.report()` returns everything as a plain object; the owner's bench files go in `shots/perf/`. The debug panel's `measure` rows switch each world module (its scene objects hidden, its updates skipped; objects it parents elsewhere, colliders and running sounds stay), bloom and shadows on and off at runtime. `node tools/perf-test.mjs` runs a short bench headlessly and checks the report against `renderer.info`, the toggles and the `n/a` path. `node tools/record-test.mjs ["<url>?q=medium&record=6&pos=-190,165"] [shot.png]` clicks Go out, turns for the recording and checks the record (frame count, samples, GPU rows or `n/a`, worst ten sorted with yaws, the file name). `node tools/pan-test.mjs "<url>?q=medium&perf=1&adapt=0" [max]` runs two stations in one browser: A at (−190, 165) stands still 4 s, then turns the view 360° twice over 6 s each; B in the Deodand Wood at (−195, 128) stands still, then turns from north at 1.2 rad/s to yaw 3.9, and reports yaw 3.5–3.9 apart, where the Great Span and its kit enter the view. It prints the worst frames with each one's modules, shadow redraw and new programs, geometries and textures; it fails if a shader program compiles or a geometry or texture uploads while turning (`renderer.info` before and after the turn), or a turning frame's CPU passes `max` (default 3) times the still median. With `pos=` in the url it runs that spot alone as station A.

`node tools/pop-test.mjs [base] [--label=before] [--only=uploads,trees,...] [--q=medium]` (v6) counts what pops, swaps and uploads and measures pops in pictures, in one browser, with `perf=1&adapt=0&wind=0`. Routes: the bench (`?bench=30`), then in one page the wood walk, a 360°-and-more pan at (−195, 128) at 1.2 rad/s, and (full run, or `--only=routes`) the lattice, keep, span and causeway walks at 3 m/s of simulated time; per rendered frame it keeps the interval, CPU, calls, triangles and the `ctx.perf` counters. Pinned sequences (`tree-near`, `tree-far`, `tree-wood`, `grass-far`, `reeds-far`, `rocks`, `fungi`, `aliasing`) freeze the render camera at the pose before a switch (the sky dome and the sun's screen position pinned with it), step the player across the switch, grab 24 game frames and report the largest changed-pixel count between consecutive frames (`pair-diff`'s method) against a baseline grabbed the same way with nothing changing; a hard pop is one big step, a fade many small ones. Each check is a row `{ id, owner, target, value, pass, gate }`; the table prints in full and the process exits 1 only when a gated row fails. Groups for `--only`: `uploads` (v6-01: programs, geometries and first-sight textures created after the card = 0 on the bench, the wood walk and the pan; **gated**), `pacing` (the bench's frames over 2× the median, all in the first second), `trees`, `fungi` (v6-04), `plants`, `rocks` (v6-05), `shadow` (a turn's redraws per second), `aliasing` (a 5 cm step). Rows are `gate: false` until the owner of a group flips its rows in `pop-test.mjs` when it lands; `uploads`, `plants` and `rocks` are gated. The JSON, `shots/perf/v6-pop-<label>.json`, carries the rows, each route's summary (frames, median interval and CPU, frames over 2×, calls, triangles, the counter deltas, the data textures uploaded per size) and each sequence's per-frame step lists. `--only=uploads` takes about two minutes, the full run about ten. `node tools/pair-diff.mjs a.png b.png [diff.png] [--baseline=<n>]` prints `{ changed, ratio, meanAbs, pct }` by the survey's method (both frames blurred 1.5 px, 5% fuzz, red marks in the diff picture; ImageMagick); every v6 brief states its picture tolerance in these numbers (the noise floor, `shots/wip/v6-00-survey-baseline-{a,b}.png`, is 69 changed pixels; the High Ling's rock repack, `v6-00-survey-rocks-{a,b}.png`, 4086). The counters: `ctx.perf.count(key, n = 1)` (one boolean test when the profiler is off, allocation-free after a key's first use), `report().counters` (`totals`, `lastFrame`), each 250 ms record sample's `counters` (deltas); keys `trees.lodSwitches`, `fungi.groupFlips`, `plants.repacks`, `plants.farSwitches`, `rocks.packs`, `shadow.redraws.move|clock|dynamic|turn`, `lights.handovers`, `tier.steps`, `uploads.programs|geometries|textures` and `uploads.texFirst|texData` (gpumem's uploads split by whether the texture had been uploaded before).

The profiler also times each update callback on its own, labelled by the file:line that registered it (`report().cpu.callbacks`, the bench's `cpuCallbacks`, and `report().firstBlock` for the first half second). A bench run names its machine (`?machine=`, remembered per browser) and, on the deployed site or the artifact, its commit (`commit.json`, written by the Netlify build and `tools/build-artifact.mjs`). `node tools/bench-report.mjs "<url>?bench=12&q=low" out.json` runs the bench headlessly and saves the report; only its CPU numbers mean anything. `node tools/alloc-audit.mjs "<url>?bench=30&q=medium" out.json` runs the bench and counts, per rendered frame, the THREE math objects `src/` constructs (by file:line and caller, through a counting wrapper of `three`) and every JS allocation by the `src/` function that made it (V8's sampling heap profiler). In per-frame code use `hyp(x, z)` from `noise.js`, not `Math.hypot`: V8's `Math.hypot` allocates on every call and is ~20× slower.

The profiler's `gpu memory` line counts the bytes held by textures, renderbuffers and the canvas, and texture uploads per frame (`src/gpumem.js`; `report().memory.gpu`). Its GL hooks go in only with `?perf=1` or `?bench`, or when the profiler row is turned on, in which case it counts only what is allocated from then on.

## What each tool checks

Renders (`shot.mjs`, `views.mjs`, `FP_BROWSER`) are in the `wilderness` skill. Every tool's header comment says how to call it; the `run` lines in `tools/suite.sh` are the gate's calls.

Icons: `node tools/icon.mjs [base] [master.png]` renders the site's icons from the scene itself (the sun between the Acephalous Thrones' shoulders from the gate through a 30° lens, the gutter held half-way so the disc reads), one 1024² frame at `q=high` halved stepwise in the browser to `apple-touch-icon.png` (180², opaque; Apple masks it) and `favicon-32.png` (a tighter crop on the disc, rounded like a tile); the optional second argument keeps the master. Run it after anything that changes that view.

`node tools/walk-test.mjs` checks walking, colliders and the HUD, climbs the Great Span's west stair to the deck, jumps its crack, and walks the deck's west half to the gate on three lines with no step cut short by a collider (a block names the collider's module, `c.mod`); `node tools/hop-test.mjs <base>` (v8-10, #7) finds six sites (a Lynchets wall, a boulder, the Span's south parapet, the Sunken Court's kerb, a house bench, a fallen gnomon) and at each checks that walking into it stops the walker, a running hop lands on top, three steps along it stay on it where it is long, and stepping off lands on the ground (off the parapet, 56 m down), and times the walker's update; `node tools/edges-test.mjs <base>` (v10-T1, #15) walks a scripted walker at a walk and at a hurry at each hole a collider ring keeps a walker back from (the Foundered Nave and the Pit from five bearings, the Great Span's crack and three fallen bays' broken edges on the deck, the Sunken Court's kerb after a hop) and checks they reach within 1.0 m (the Span 0.5 m) of the lip, never pass it, are never under the floor, and that a running hop still clears the crack; `node tools/stair-test.mjs` walks the Span's west stair and the Hypogeum's steps up and down at 60 Hz and checks the eye (`player.eyeY`, the camera's height without the bob) moves at most 0.08 m a frame, prints its lag behind the feet (mean and peak) and the vertical speed, and checks the walker never leaves the treads; `node tools/audio-test.mjs` starts the audio headlessly, fires every one-shot cue (the regions' and v7's living included) and reports that each one sounds (on its own voices, an analyser on each new voice's gate read on the audio clock, when it makes any; else on the cue bus), then checks the fall's positional loop follows `ctx.river.rumble`, that the voice cap holds at 12, and that the Repetend's echo (`audio.echoStep`) is scheduled 1.0 s after a step, is heard on its own voice within 1.0 ± 0.05 s (the onset's first sample, timed from the audio clock) at the bird's position, and keeps the cap while hurrying beside it; then v7's two loops (`coheirs-hum`, `thurifer-hiss`) start (sounding, a second start ignored) and stop (the gain falling within 0.1 s), with the figures loaded the hum stops within 0.1 s of the Coheirs' heads turning, the loops are released past range and with their module off, and the voice cap holds at the two clusters (the north-west on P3 by the Lynchets' east wall, the Leerie's row in a gutter), 10 s each. `node tools/grass-flicker-test.mjs` turns the camera at three spots and checks no nearby plant chunk is culled (`FP_BASE=http://localhost:<port>` to test another server). `node tools/fade-test.mjs <base>` draws the fade kit's two sides over black at f = 0.25, 0.5 and 0.75 (by uniform, per-instance attribute and vertex expression) and checks no pixel is a hole or an overlap, and that `fadeDepthMaterial` covers the colour pass's pixels (a clone of it too) and an alpha-tested caster shades a share f of a receiver in a real shadow pass; pop-test's `fade` group calls it. `node tools/gutter-test.mjs <base>` samples the sun's flicker for 60 s at `?gutter=12,20` and checks the gutters recur, their length, the time held at the floor and the ramps. `node tools/tree-lod-test.mjs <base>` switches one tree of every variant through its three LODs in both batch paths and checks each is drawn with the same matrix and keeps its heading (the azimuth profile's best turn and the lean's direction), and prints a placement digest; in each path it also checks one switch's cross-fade (the old level shown as a spare, done in 0.4 s of world time, the spare hidden after), a 200 m jump and a step back mid-fade (the fade ends far, or turns round), and that a 3 m/s wood walk leaves no spare shown and runs none out. `node tools/regions-test.mjs <base>` checks every region in `ctx.regions.keys` (module loaded, `regionAt` at its centre, its Tincture, and at high its `stats()`: at most 12 draw calls and 150k triangles, and its creature), and that the Demesne's peafowl are one piece: the parts each geometry lists in `userData.parts` touch (boxes overlapping, vertices within 2 cm) and every train's coverts meet its body, and that the Demesne's yews have at least 1000 triangles a yew, alpha-tested sprig cards, and a mass of near-black green (mean vertex colour in sRGB, luma under 0.3). `node tools/contrast-survey.mjs <base> [--q=medium] [--out=<label>] [--shots=<stage>]` (v8-02) renders an eye-height and a 30° downward frame at a fixed pose in each place and at six landmarks, measures the lower half (mean luma, mean saturation, dominant hue, the share the low plants cover) and gates: at least 4 regions apart from the grazed common in two numbers (L 0.035, S 0.05, hue 20°, blades 0.15) and at most one pair of places no number tells apart; tables in `briefs/v8/contrast/`. `node tools/touch-test.mjs` drives a 390×844 touch viewport: the stick, the hop and mute buttons, the long-press debug reveal, and Safari's stale touch identifiers (a reused or vanished id releases the stick instead of dragging it to another finger); `SHOTS=1` also writes its two phone renders.

The audio harness (v7.2, `.agents/skills/sound-design/harness.md` is its contract) judges how the sound sounds, where `audio-test` checks that it sounds, and is read as text. `node tools/audio-render.mjs "<url>" out.wav [--seconds=20] [--cue=name --at=dx,dy,dz --opts=json --every=s] [--walk=m/s] [--steps=n] [--gutter] [--pre] [--mono]` renders the page's post-limiter output to a WAV and its cue log (cue calls, voices, steps, the gutter) to `out.json`; it loads with `render=0`, settles 6 s after `body.ready` (headless Chromium starves the main thread if the audio starts sooner) and holds the gutter off unless `--gutter` starts a real one 1 s in. `node tools/audio-metrics.mjs out.wav [--baseline=before.wav] [--spectrogram[=out.png]]` measures it (loudness per BS.1770, peak, crest, centroid, sharpness, roughness, clicks, seam and repeat periods, onsets and gaps) and prints an octave-band energy table in dB over slices of the render (`tools/audio-bands.mjs`); a spectrogram image only with `--spectrogram`. `node tools/audio-metrics-selftest.mjs` checks the metrics on synthetic signals. `node tools/audio-survey.mjs $B --poses=moor-walk,wood-stand --out=shots/wip/audio/survey-<label> [--baseline=<dir>] [--images]` renders the named poses of `tools/audio-survey.json` (a fresh page each, about 40 s a pose) into `survey.md` (metrics, bands, band tables) and `survey.json` and exits 1 on a gated band; without `--poses` it is the sixteen stations (12 min), the orchestrator's once per batch; `--one-page` loads the world once but gives different numbers (a scan only, never against a baseline or a band). `node tools/audio-quality-test.mjs $B` runs the survey, the limiter-engagement check (the moor walk's pre-limiter render is the survey's own) and the determinism check as PASS/FAIL lines (about 12 min, the orchestrator's before a push). Renders go to `shots/wip/audio/` (gitignored); the baseline table is `briefs/v7.2/audio/baseline/survey.md`.

