# Wilderness runtime reference

The URL params, the quality tiers, the shadow cadence, the profiler and what each test checks, for `prototypes/wilderness/`. Paths are relative to it. Every agent that adds a flag appends it to its milestone's group here (v6: "The v6 switches"; v7: "The v7 living"); keep-both merges have doubled whole groups before, so grep for duplicates after a merge.

## URL params

### General

- `pos=x,z`
- `yaw=`
- `pitch=` (radians; yaw 0 looks north along -z, π/2 looks west along -x)
- `q=high|medium|low` (or `tier=`; pins the tier for this load)
- `only=vegetation,water` to load only some modules
- `skip=audio`
- `wind=0.5` to scale the wind
- `perf=1` (profiler)
- `bench=1|<seconds>`
- `machine=<name>`
- `bloom=0`
- `shadows=0`
- `gpu=0` (profile as if the GPU timer were missing)
- `debug=1`
- `tinct=0` (no regional tint on the haze and the light)
- `gutter=<len>,<every>` (seconds; pins the sun-gutter's length and interval and starts the first one within one interval; `gutter=v3` restores the old 6.5-9 s every 70-150 s; the default is 12-16 s every 60-110 s, timings exported from `src/sky.js`)

### v3 stage 2 switches (each defaults to the new behaviour; see `wilderness-v3.md`)

- `cap=60` (frames per second; `0` uncapped)
- `idle=0` (full rate under the cards and when unfocused)
- `dpr=` (pixel ratio; default high 1.25, low 0.85)
- `shadowhz=2` (`0` redraws the shadow map every frame)
- `shadowdyn=15` (box-move redraws a second while turning, and creature-pose redraws; default 10 on integrated GPUs)
- `shadowcull=0` (far creatures keep their shadows)
- `pcf=soft|hard`
- `bloomres=0.5` (`1` full size)
- `bloomtune=strength,radius,threshold`
- `bloomcap=16`: the ceiling on bloom's bright pass (brightest channel; NaN and Inf drop to black), `src/bloomfix.js`; `0` is three's uncapped pass, which turns one extreme pixel into nested squares
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

### The v6 switches

v6-01 adds only the counters and `pop-test`. Later v6 agents append their `?param=` here, one line each.

- `post=v3` restores the three passes after the scene (bloom's full-size blend, the grade, OutputPass) in place of the finish pass (v6-02)
- `rays=full` marches the crepuscular rays at every pixel in the finish (or the grade), not in their quarter-size pass (v6-02)
- `postclock=0` pins post's clock, so the grain and the rays' jitter are the same between loads (render pairs) (v6-02)
- `bloommips=1..5` blurs only the first n of bloom's five mips (default 5; the finish chain only) (v6-02)
- `aa=off` draws without the FXAA folded into the finish pass (on at every tier) (v6-02, v6-08 Q1)
- `grain=<multiplier>` scales the film grain (0.6 = the default, Austin's pick from the v6-02 compare set; 1 = the old 0.02; 0 = none) (v6-02)

### The walls

- `mountains=v4` builds the v4 wall and its far ranges (a steep face to a fractal crest, a front range) instead of the massifs (`src/v4/mountains.js`; `wilderness-v5.md`, "The massifs"), to compare

## Quality tiers

Quality tiers (`src/tier.js`). Without `q=`, the tier pinned in the debug panel's quality rows (kept in localStorage), else the device: a phone or 4 cores or fewer is low; a discrete GPU (by its WebGL renderer name, or WebGPU's adapter info) high; an integrated one medium; a software renderer low; anything else (Apple silicon, a masked name) starts high and drops to medium if the first 3 s of full-rate frames average over 1.15 frame intervals. Medium builds what high builds; it differs only in this table, so high and medium switch live and low reloads:

| tier | pixel ratio | adaptive floor | shadow map | 1%-low budget | builds as |
|---|---|---|---|---|---|
| high | 1.25 | 1.0 | 4096² | 20 ms | high |
| medium | 1.0 | 0.75 | 2048² | 33 ms | high |
| low | 0.85 | 0.6 | 2048² | 33 ms | low |

The pixel ratio is never above the display's, and never above 1.0 at medium or high on a GPU without its own memory (an integrated GPU or Apple silicon, by its renderer name; the floors stay). The adaptive ratio measures steady frames: the view turning under 0.35 rad/s and moving under 4.5 m/s for 250 ms. When their 1% low has been over the budget for 5 s of steady time (turning pauses the count), the ratio steps down 0.1 toward the floor; if the view has not held still for 20 s and every frame's 1% low has been over budget all that time, it steps instead. After 45 s with every frame's 1% low under 0.6 of the budget it steps back up 0.05, never to a ratio that failed in the last minute. After a step, a tier change or the tier probe, nothing steps for 20 s. Stalls (over 50 ms and twice the running mean) are left out. A due step waits for a steady frame right after a shadow redraw, so the composer's reallocation never lands mid-turn or on a redraw; `report().tier.steps` records each step's reason and wait. `?dpr=` sets the ratio and holds it.

Shadow cadence (`src/shadows.js`): the map is redrawn on a 2 Hz clock, at once when a creature within 40 m moves a texel, and when the box (40 m ahead of you, texel-snapped) has moved 3 m, which turning does constantly. While the view turns (over 0.35 rad/s), those box moves come at most 15 times a second (`shadowdyn=`), 10 by default on a GPU without its own memory, and only after a frame within the tier's budget; after an over-budget frame the redraw waits a frame, never more than 0.12 s (8 a second). Walking moves the box at once. Texel snapping keeps the shadows still between redraws (`shots/wip/fix-dpr-shadow-cadence-*`).

## The profiler

Measuring (`src/perf.js`): `?perf=1`, or the debug panel's `profiler` row, shows an overlay top-left with frame time (2 s rolling average and 1% low, the mean of the slowest 1% of frames), CPU ms per module inside the update loop (`frame` is main.js's own work, `core` updates registered outside a module), GPU ms per pass (render including the shadow map, the shadow map alone, bloom, rays, finish, and `post`, their sum; `grade` and `output` with `?post=v3`, null otherwise) where the browser has `EXT_disjoint_timer_query_webgl2` and `n/a` where it does not, draw calls, triangles, geometry, texture and program counts, lights by type (visible/total), pixel ratio and render size. `?bench=1` flies a fixed 45 s path (spawn, the causeway, the tarn's shore, the fen's edge, home) with controls off and the gutter held, samples every 500 ms, then shows a summary with the JSON to download; `?bench=<seconds>` runs the same path faster. `?record=<seconds>` (it implies `?perf=1`; `__fp.perf.record(seconds)` starts one from the console) records a pan: once the walker is out (card hidden, pointer locked, drag-look or touch) it keeps every frame's duration, timestamp and view yaw, and every 250 ms a sample (GPU passes, draw calls, triangles, pixel ratio and buffer, tier steps, shadow redraws total and dynamic, camera position and yaw, geometry, texture and program counts, uploads, CPU per module), skips idle time, and at the end releases the pointer lock and shows the bench's panel with the median, 95th, 99th and worst frame, the counts over 2× and 3× the median, the worst ten with the sample around each, and the whole record to download as `record-<date>-<commit>-<quality>-<machine>.json` (`__fp.perf.lastRecord()` returns it). Austin types `?q=medium&record=10`, clicks Go out, pans for ten seconds and sends the file. `__fp.perf.report()` returns everything as a plain object; Austin's bench files go in `shots/perf/`. The debug panel's `measure` rows switch each world module (its scene objects hidden, its updates skipped; objects it parents elsewhere, colliders and running sounds stay), bloom and shadows on and off at runtime. `node tools/perf-test.mjs` runs a short bench headlessly and checks the report against `renderer.info`, the toggles and the `n/a` path. `node tools/record-test.mjs ["<url>?q=medium&record=6&pos=-190,165"] [shot.png]` clicks Go out, turns for the recording and checks the record (frame count, samples, GPU rows or `n/a`, worst ten sorted with yaws, the file name). `node tools/pan-test.mjs "<url>?q=medium&perf=1&adapt=0" [max]` runs two stations in one browser: A at (−190, 165) stands still 4 s, then turns the view 360° twice over 6 s each; B in the Deodand Wood at (−195, 128) stands still, then turns from north at 1.2 rad/s to yaw 3.9, and reports yaw 3.5–3.9 apart, where the Great Span and its kit enter the view. It prints the worst frames with each one's modules, shadow redraw and new programs, geometries and textures; it fails if a shader program compiles or a geometry or texture uploads while turning (`renderer.info` before and after the turn), or a turning frame's CPU passes `max` (default 3) times the still median. With `pos=` in the url it runs that spot alone as station A.

`node tools/pop-test.mjs [base] [--label=before] [--only=uploads,trees,...] [--q=medium]` (v6) counts what pops, swaps and uploads and measures pops in pictures, in one browser, with `perf=1&adapt=0&wind=0`. Routes: the bench (`?bench=30`), then in one page the wood walk, a 360°-and-more pan at (−195, 128) at 1.2 rad/s, and (full run, or `--only=routes`) the lattice, keep, span and causeway walks at 3 m/s of simulated time; per rendered frame it keeps the interval, CPU, calls, triangles and the `ctx.perf` counters. Pinned sequences (`tree-near`, `tree-far`, `tree-wood`, `grass-far`, `reeds-far`, `rocks`, `fungi`, `aliasing`) freeze the render camera at the pose before a switch (the sky dome and the sun's screen position pinned with it), step the player across the switch, grab 24 game frames and report the largest changed-pixel count between consecutive frames (`pair-diff`'s method) against a baseline grabbed the same way with nothing changing; a hard pop is one big step, a fade many small ones. Each check is a row `{ id, owner, target, value, pass, gate }`; the table prints in full and the process exits 1 only when a gated row fails. Groups for `--only`: `uploads` (v6-01: programs, geometries and first-sight textures created after the card = 0 on the bench, the wood walk and the pan; **gated**), `pacing` (the bench's frames over 2× the median, all in the first second), `trees`, `fungi` (v6-04), `plants`, `rocks` (v6-05), `shadow` (a turn's redraws per second), `aliasing` (a 5 cm step). Every row except `uploads` is `gate: false`; the owner of a group flips its rows in `pop-test.mjs` when it lands. The JSON, `shots/perf/v6-pop-<label>.json`, carries the rows, each route's summary (frames, median interval and CPU, frames over 2×, calls, triangles, the counter deltas, the data textures uploaded per size) and each sequence's per-frame step lists. `--only=uploads` takes about two minutes, the full run about ten. `node tools/pair-diff.mjs a.png b.png [diff.png] [--baseline=<n>]` prints `{ changed, ratio, meanAbs, pct }` by the survey's method (both frames blurred 1.5 px, 5% fuzz, red marks in the diff picture; ImageMagick); every v6 brief states its picture tolerance in these numbers (the noise floor, `shots/wip/v6-00-survey-baseline-{a,b}.png`, is 69 changed pixels; the High Ling's rock repack, `v6-00-survey-rocks-{a,b}.png`, 4086). The counters: `ctx.perf.count(key, n = 1)` (one boolean test when the profiler is off, allocation-free after a key's first use), `report().counters` (`totals`, `lastFrame`), each 250 ms record sample's `counters` (deltas); keys `trees.lodSwitches`, `fungi.groupFlips`, `plants.repacks`, `plants.farSwitches`, `rocks.packs`, `shadow.redraws.move|clock|dynamic|turn`, `lights.handovers`, `tier.steps`, `uploads.programs|geometries|textures` and `uploads.texFirst|texData` (gpumem's uploads split by whether the texture had been uploaded before).

The profiler also times each update callback on its own, labelled by the file:line that registered it (`report().cpu.callbacks`, the bench's `cpuCallbacks`, and `report().firstBlock` for the first half second). A bench run names its machine (`?machine=`, remembered per browser) and, on the deployed site or the artifact, its commit (`commit.json`, written by the Netlify build and `tools/build-artifact.mjs`). `node tools/bench-report.mjs "<url>?bench=12&q=low" out.json` runs the bench headlessly and saves the report; only its CPU numbers mean anything. `node tools/alloc-audit.mjs "<url>?bench=30&q=medium" out.json` runs the bench and counts, per rendered frame, the THREE math objects `src/` constructs (by file:line and caller, through a counting wrapper of `three`) and every JS allocation by the `src/` function that made it (V8's sampling heap profiler). In per-frame code use `hyp(x, z)` from `noise.js`, not `Math.hypot`: V8's `Math.hypot` allocates on every call and is ~20× slower.

The profiler's `gpu memory` line counts the bytes held by textures, renderbuffers and the canvas, and texture uploads per frame (`src/gpumem.js`; `report().memory.gpu`). Its GL hooks go in only with `?perf=1` or `?bench`, or when the profiler row is turned on, in which case it counts only what is allocated from then on.

## What each tool checks

Screenshot headlessly (software WebGL, slow but faithful): `node tools/shot.mjs "http://localhost:8123/?q=low&pos=-60,20&yaw=1.9" out.png 1280 720`; `SHOT_DPR=2` renders at a retina device pixel ratio.

`FP_BROWSER=chromium|firefox|webkit` picks the engine for `shot.mjs` and `views.mjs` (default chromium; the ANGLE flags are Chromium's). Headless Firefox and WebKit on this Mac draw on the real GPU (Firefox through Apple's OpenGL, points clamped at 64 px), so they are the Firefox and Safari GPU paths, not software.

Icons: `node tools/icon.mjs [base] [master.png]` renders the site's icons from the scene itself (the sun between the Acephalous Thrones' shoulders from the gate through a 30° lens, the gutter held half-way so the disc reads), one 1024² frame at `q=high` halved stepwise in the browser to `apple-touch-icon.png` (180², opaque; Apple masks it) and `favicon-32.png` (a tighter crop on the disc, rounded like a tile); the optional second argument keeps the master. Run it after anything that changes that view.

Several views from one page load (the scene build is the slow part): `node tools/views.mjs views.json shots/wip <prefix> low`, where `views.json` lists `{ name, x, z, yaw, pitch, dy, js, pre }`; it holds the sun's guttering off so before/after pairs match. `node tools/walk-test.mjs` checks walking, colliders and the HUD, climbs the Great Span's west stair to the deck and jumps its crack; `node tools/stair-test.mjs` walks the Span's west stair and the Hypogeum's steps up and down at 60 Hz and checks the eye (`player.eyeY`, the camera's height without the bob) moves at most 0.08 m a frame, prints its lag behind the feet (mean and peak) and the vertical speed, and checks the walker never leaves the treads; `node tools/audio-test.mjs` starts the audio headlessly, fires every one-shot cue (39 firings, the regions' own included) and reports that each one sounds, then checks the fall's positional loop follows `ctx.river.rumble` and that the voice cap holds at 12. `node tools/grass-flicker-test.mjs` turns the camera at three spots and checks no nearby plant chunk is culled (`FP_BASE=http://localhost:<port>` to test another server). `node tools/fade-test.mjs <base>` draws the fade kit's two sides over black at f = 0.25, 0.5 and 0.75 (by uniform, per-instance attribute and vertex expression) and checks no pixel is a hole or an overlap, and that `fadeDepthMaterial` covers the colour pass's pixels (a clone of it too) and an alpha-tested caster shades a share f of a receiver in a real shadow pass; pop-test's `fade` group calls it. `node tools/gutter-test.mjs <base>` samples the sun's flicker for 60 s at `?gutter=12,20` and checks the gutters recur, their length, the time held at the floor and the ramps. `node tools/tree-lod-test.mjs <base>` switches one tree of every variant through its three LODs in both batch paths and checks each is drawn with the same matrix and keeps its heading (the azimuth profile's best turn and the lean's direction), and prints a placement digest. `node tools/regions-test.mjs <base>` checks every region in `ctx.regions.keys` (module loaded, `regionAt` at its centre, its Tincture, and at high its `stats()`: at most 12 draw calls and 150k triangles, and its creature). `node tools/touch-test.mjs` drives a 390×844 touch viewport: the stick, the hop and mute buttons, the long-press debug reveal, and Safari's stale touch identifiers (a reused or vanished id releases the stick instead of dragging it to another finger); `SHOTS=1` also writes its two phone renders.

