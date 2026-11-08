# Wilderness v3: performance and heat

Austin's note after walking v2: "my PC runs HOT running this thing." v3 is a dedicated performance stage after the v2 content passes land. Goal: the same picture at a fraction of the power, and a scene that scales down gracefully on laptops and phones instead of burning. Nothing new is added in v3; anything that looks different must be a deliberate, reviewed trade.

## Why it runs hot today

Measured or read from the code; the perf stage confirms the numbers on real hardware before touching anything.

- **Uncapped frame rate.** `requestAnimationFrame` renders every vsync. On a 144 Hz monitor that is 144 full frames a second of a scene tuned to look right at 60. There is no cap, no idle throttle, and the scene keeps rendering at full rate under the title card and the paused card.
- **Full-cost post chain every frame.** UnrealBloom at render resolution (five mip levels, separable blurs each), then the grade pass, then OutputPass. Bloom alone is several full-screen passes.
- **Shadows re-rendered every frame.** A 4096² PCFSoft shadow map (2048 at q=low) is redrawn each frame though the sun never moves and most casters are static. Soft PCF is also the most expensive filter.
- **Point lights in every fragment.** Two wisp lights, taverna, tower, lantern, plus the Wrong Colour's one: every lit fragment of every MeshStandardMaterial evaluates all of them, wherever the player stands.
- **Overdraw from vegetation.** Hundreds of thousands of alpha-tested grass, reed and flower quads; near the camera several layers deep. Alpha test with `discard` defeats early-z on many GPUs.
- **Per-frame CPU.** 225 tracked eyes, 1500 biomesh tiles, instanced matrix uploads, fauna steering, particle systems and the sky all tick every frame regardless of distance. CPU heat is real heat.
- **Triangle count** is moderate (q=low 1.4M, q=high 2.0M from spawn, up to 2.5M at the fen) and not the main problem, but the fen and wood views are the heaviest and should get distance LOD.
- **Pixel ratio** is capped at 1.5 (high) and 1 (low) already; on a 4K display 1.5 is still 2880×1620 of post-processed pixels.

## Targets

| Device class | Quality | Target | Measured with |
|---|---|---|---|
| Desktop with a discrete GPU (Austin's PC) | high | 60 fps capped, GPU well under full load (fans quiet) | the in-page profiler, 60 s stand at spawn and a benchmark walk |
| Laptop with an integrated GPU | medium (new) | 30 fps or better at 1080p | same |
| Phone | low | 30 fps, no thermal throttling in a 5-minute walk | same, plus the device's own frame counter |
| Any | paused, hidden tab or title card | near-zero GPU | profiler shows the render loop idle |

## Stage 1: measure first (one agent, Sonnet)

Headless swiftshader timings are meaningless, so measurement happens on Austin's machines. Build the instruments, nothing else:

- **In-page profiler**, `?perf=1` or a toggle in the debug panel: frame time (ms, rolling average and 1% low), CPU time inside the update loop split by module (each `registerUpdate` callback timed), GPU time per pass through `EXT_disjoint_timer_query_webgl2` when available (shadow pass, main pass, bloom, grade), draw calls, triangles, texture memory, lights in scene, pixel ratio and render size. Overlay in the HUD's font, small, top-left under the hint.
- **Benchmark mode**, `?bench=1`: a fixed 45-second camera path (spawn → causeway → tarn shore → fen edge → back), gutter held off for repeatability, that records the profiler's numbers every 500 ms and at the end shows a summary and offers it as a JSON download, plus `ctx.perf.report()` for pasting. Austin runs it on his PC (and phone) and pastes the JSON into the issue; the agent records results in `shots/perf/`.
- **Module toggles at runtime** in the debug panel (each module visible on/off, bloom on/off, shadows on/off), so Austin can see what a given cost buys without reloading.
- Acceptance: the profiler agrees with `renderer.info` on calls and tris; the bench runs headlessly without errors (numbers ignored); README documents both.

## Stage 2: the cheap wins (one agent, Opus, after stage 1 numbers are in)

Each change behind a flag until measured; renders before and after at the same views to prove the look is unchanged.

1. **Frame cap and idle.** Cap at 60 fps (optionally 30 at q=low and on battery via `navigator.getBattery` where available). Render at 10 fps under the title and paused cards, stop entirely on `visibilitychange` hidden, and skip rendering when the window is not focused for more than a few seconds (still simulate audio and time).
2. **Shadow cadence.** Static sun: render the shadow map only when the player has moved more than ~3 m or every 0.5 s, and keep dynamic casters (traveller, deodand, grazers, uncanny) in a second, small shadow camera or let them stop casting beyond 40 m. Try PCF instead of PCFSoft at q=low and medium; compare renders.
3. **Bloom at half resolution** (UnrealBloom's `resolution` argument) with the threshold retuned so the sun and the lantern read the same; test on the sun-in-saddle view, the Lattice, the Wrong Colour.
4. **Lights that only exist near you.** Keep every PointLight's object but set `intensity` to 0 and `visible` false beyond its reach plus 20 m, and cap the number of simultaneously visible point lights at 3 (the nearest). Three.js recompiles shaders when the light count changes, so pre-warm by keeping the count constant: 3 light slots that re-target the nearest sources, rather than toggling objects.
5. **Pixel ratio by quality**: high 1.25 (was 1.5), medium 1, low 0.85 with the HUD crisp (HUD is DOM, unaffected). Add a `?dpr=` override.
6. **Update throttling by distance.** Each `registerUpdate` consumer declares a position and a tick rate; far things update at 10 Hz or less, near things every frame. Eyes track only within 40 m (already partly true), biomesh tiles beyond 60 m hold still, fauna beyond 120 m steer at 5 Hz, particle systems beyond their visible range pause.

### Stage 2: what each flag does

Every switch defaults to the new behaviour; the old one is one URL parameter away, so a regression bisects from the URL.

- `?cap=` frames per second, default 60 (30 at q=low on battery where `navigator.getBattery` exists; Firefox has none); `0` is uncapped, as before. Paced with `requestAnimationFrame` and a due time, never `setTimeout`. `?idle=0` turns off the rest: about 10 fps under the title and paused cards and after 3 s unfocused, and nothing while the tab is hidden. Time and every update run once per rendered frame with the real dt, clamped to 0.1 s as before, so the world and the audio mix carry on at the slower rate. The bench ignores the idle rules but keeps the cap.
- `?dpr=` pixel ratio, default high 1.25 (was 1.5), medium 1, low 0.85 (was 1). The HUD is DOM and stays sharp.
- `?shadowhz=` (default 2): the shadow map is no longer drawn every frame (`shadowMap.autoUpdate` off). It is redrawn when the texel-snapped shadow camera has moved 3 m (walking, or turning, since it sits 40 m ahead of you; the light only moves on a redraw, so the old map stays right meanwhile), twice a second regardless, at once when a creature within 40 m has moved more than one shadow texel (4.6 cm at high, 9.3 at low) since the last redraw, and at `?shadowdyn=` (default 15 Hz) when a near one has only turned or changed pose. The texel rule is the one that keeps creature shadows smooth: a shadow never lags its caster by more than a texel, so an ambling grazer (0.75 m/s) redraws ~16 times a second at high and a fleeing one (6.8 m/s) every frame, while a fixed rate either lagged a running animal or redrew for an idle one. `?shadowhz=0` redraws every frame. `?shadowcull=0` keeps far creatures' shadows: by default the fauna's and inhabitants' casters (grazers, the deodand, the heron, the uncanny, the traveller and wagon, the galley, the guest) stop casting beyond 40 m, so none of them steps at the slow clock. The banners count as always moving within 40 m.
- `?pcf=soft|hard` the shadow filter. PCFSoft and PCF both take 17 compare taps in three r170; soft adds a bilinear weight per tap, so hard saves arithmetic, not fetches. Soft stays the default everywhere: hard (with the light's radius of 2) bands and reshapes the dappled light on the wood's floor (`perf-02-pcf-wood-before.png` soft against `-after.png` hard), which is not worth a few multiplies a tap.
- `?bloomres=` bloom size as a fraction of the render, default 0.5 (UnrealBloom halves again inside, so its bright pass is a quarter of the render: a quarter of the bloom's fill). `1` is as before. Its blurs are fixed in texels, so at half size each mip spreads twice as far and the tightest glow is gone; the half-size settings are strength 0.52, radius 0.15, threshold 0.88 (were 0.38, 0.55, 0.9), chosen against full-size renders of the sun, the Lattice, the Wrong Colour and the taverna lantern. `?bloomtune=strength,radius,threshold` tries others.
- `?lights=` point-light slots, default 3. After the modules build, every PointLight becomes a source on a layer the camera does not see (three skips such lights, and their world matrices still update, so the wagon's lantern keeps tracking); 3 slot lights copy position, colour, intensity, distance and decay from the nearest live sources within distance + 20 m each frame, intensity 0 when there are none. The scene's light count never changes, so nothing recompiles, and every lit fragment evaluates 3 point lights instead of 7. `?lights=off` leaves every light as it was.
- `?throttle=0` runs every update every frame. Otherwise `ctx.registerUpdate(fn, { pos | at(), near, hz, r })` runs a callback every frame within `near` m of the player and at `hz` beyond (held still at 0), handing it the skipped time as dt so motion covers the same ground. Applied: grazers, deodand, slinker, wader, the tarn woman, the traveller, rooks and gibbet crows, the keep's crows, the tower moths and the corpse-candles at 5 Hz beyond 120 m; the cloak at 5 Hz beyond 40 m, so its 225 eyes track every frame only within 40 m; the Menology's lizards held still beyond R + 140 m (their 48 matrices are no longer rewritten there). Inside modules: biomesh tiles more than 60 m away hold still and a colony beyond radius + 70 m is skipped (was + 110); the galley's wake strip is rebuilt only within 160 m; the traveller's 3 cm rope is hidden and not rebuilt beyond 60 m, where it is under a pixel.
- `?batch=instanced|batched` and `?multidraw=0`: see the draw calls below.

### Stage 2: draw calls on Firefox

Austin's Firefox/Mac bench (`shots/perf/2026-11-08-631683e-austin-firefox-mac-high.json`) drew 522 to 3948 calls, against ~160 headless. Firefox has no `WEBGL_multi_draw`, and without it three.js draws a `BatchedMesh` once per visible instance: the trees (and the Lattice's crystals) are one `BatchedMesh`, so every tree in view and every tree in the shadow camera's box cost a call. Reproduced headlessly with `?multidraw=0`, which hides the extension: 3992 calls at q=high at (1, 112) looking north, 162 with it. Where the extension is missing, `vegetation/batch.js` now draws the same geometry, matrices and colours as one `InstancedMesh` per geometry per 100 m cell: 538 calls at the same spot (the trees are ~470 of them, about half in the shadow pass). Cells are frustum-culled as wholes, so a few more tree triangles reach the GPU than with per-instance culling. For stage 3: the trees have ~70 geometries (variants × 3 LODs), so the fallback's cost is geometries × visible cells; fewer variants per LOD, larger far cells or the far LOD as impostors would bring it nearer to the 160 the multi-draw path gets.

Austin's first bench sample also showed 11.8 ms of fauna CPU per frame. It was the perch searches: the gibbet crows cast 900 rays straight down onto the merged structure meshes, and the keep's crows and the rooks a few dozen more, each testing every triangle; headless the first half second spent 3 s in it. `fauna/geo.js` `makeDownCaster` bins the triangles by xz once and runs three's own triangle test on the few under each ray: the perches found are identical (checked against the old code), and the first half second's fauna time is 70 ms headless instead of 3.2 s.

### Stage 2 results (headless CPU)

CPU per frame inside the update loop, by module, over `?bench=12&q=low` (spawn, the causeway, the tarn's shore, the fen's edge, home), from `ctx.perf.report()`. JS time is real even under SwiftShader; frame and GPU numbers are not.

The spec'd run renders, and headless a rendered frame takes 0.5–1.9 s, so a 12 s bench is 9–28 frames and the CPU numbers are dominated by one-off setup (the biomesh's first placement, the perch searches) and by whatever else the shared machine was rendering: `shots/perf/headless-before.json` (untouched tree, 806f909, alone on the machine) and `headless-after.json` (contended: 9 frames) are kept, but not compared. The comparison is the same bench with `?render=0` (a measuring switch: the updates run, the composer does not), capped at 60 fps, so ~680 frames per run: before is `?throttle=0` on the new tree (every update every frame, the modules' own distance gates off), after the defaults. Means of 4 runs before and 3 after (`headless-cpu-before.json`, `headless-cpu-after.json` are one of each).

| module | before ms/frame | after | change | rendered run before | after (contended) |
|---|---:|---:|---:|---:|---:|
| vegetation | 0.73 | 0.90 | noise (0.67–0.78 before, 0.77–1.10 after) | 2.56 | 2.79 |
| fauna | 0.53 | 0.24 | −54% | 4.06 | 16.94 |
| frame (main.js) | 0.28 | 0.30 | +0.02 (light slots, shadow scan) | 0.45 | 1.01 |
| particles | 0.07 | 0.09 | noise | 0.13 | 0.11 |
| inhabitants2 | 0.07 | 0.04 | −48% | 0.22 | 0.33 |
| skylife | 0.04 | 0.05 | – | 0.14 | 0.14 |
| riverlife2 | 0.03 | 0.11 | one run at 0.27, others 0.03–0.04 | 0.09 | 0.07 |
| structures, water, rocks, ruins2, flora2 | 0.05 | 0.05 | – | 0.14 | 1.33 |
| **total** | **1.80** | **1.78** | vegetation's noise hides the rest | 7.79 | 22.72 |

By callback: the biomesh 0.225 → 0.003 ms, the Menology 0.050 → 0.027, the grazers 0.163 → 0.130, the traveller 0.033 → 0.020, the rooks 0.013 → 0. On the causeway stretch where Austin's bench showed 1.4–1.8 ms of fauna (x −26 → −55), fauna is 0.76–1.11 ms per frame before and 0.21–0.29 after. What is left is vegetation's own callback (the plant-chunk scan over all 729 chunks every frame, tree LOD, fungi): stage 3's vegetation work.

The first half second (`report().firstBlock`): the perch searches cost 3032 ms (rooks and gibbet crows) and 162 ms (keep crows) headless before, 70–87 ms and 12–22 ms after.

### Stage 2 render pairs

All in `shots/wip/`, rendered with `tools/views.mjs` (gutter held) at q=low, 1280×720, `?dpr=1` unless noted, views in `tools/views-perf.json`. Each pair changes one switch; grain, wind, the corpse-candles, the Wrong Colour's pulse and the lanterns' flicker move between any two renders, so a pair is judged on what the switch could touch.

- `perf-02-all-<view>-before/after` (10 views): the untouched tree (806f909) against every default (pcf soft). The whole of stage 2 at once.
- `perf-02-bloom-<view>-before/after` (10 views): `?bloomres=1` against half size. **For Austin's eye:** the sun's bright rim is a touch wider and ~3 levels brighter at half size (`perf-02-bloom-sun-*`); the Wrong Colour's close glow and the Lattice filaments' tight glow lose a little crispness. The others read the same.
- `perf-02-pcf-<view>-before/after` (wood, spawn, herd): soft against hard. Hard bands the dappled light on the wood's floor; rejected, soft stays the default.
- `perf-02-shadows-<view>-before/after` (herd, spawn, wood): every-frame shadows, far creatures casting, against the cadence and the 40 m cut. Static shadows are identical (the map is redrawn before each render by the tool, so this pair shows the cut, not the cadence).
- `perf-02-lights-<view>-before/after` (taverna, fen, Wrong Colour): every light live against 3 slots. Same within the lights' own flicker; the slots were checked in the page to carry the two taverna lanterns at the courtyard.
- `perf-02-throttle-<view>-before/after` (herd, Lattice): `?throttle=0` against throttling. Same picture.
- `perf-02-batch-<view>-after` (wood, Lattice, sun) against `perf-02-all-<view>-after`: the instanced fallback against the BatchedMesh. Same picture.
- `perf-02-dpr-spawn-before/after`: q=high at a 2× display, pixel ratio 1.5 (1920×1080) against 1.25 (1600×900). **For Austin's eye:** slightly softer edges on foliage and the keep's silhouette at high; the HUD is unaffected.

## Stage 3: the structural work (one or two agents, Opus)

1. **A medium quality tier** between high and low, chosen by default on laptops (no discrete GPU hint: `navigator.gpu`/`WEBGL_debug_renderer_info` where available, else by the first 3 s of measured frame time), and an **adaptive step**: if the 1%-low frame time stays above budget for 5 s, step pixel ratio down by 0.1 to a floor; step back up slowly when there is headroom. The quality menu in the debug panel shows which tier is active and lets Austin pin one; the choice persists in localStorage.
2. **Vegetation LOD and overdraw.** Grass draw distance by tier; a cheaper far grass (cross-quads without alpha test, or just vertex-coloured ground) past 60 m; sort instanced alpha-tested batches front-to-back; reduce the fen's reed count at a distance; replace `discard` with alpha-to-coverage where it looks the same.
3. **Material simplification at a distance.** Terrain triplanar detail and bump already fade with distance; make sure the shader branches away (uniform-driven `if` blocks on distance bands are cheap) rather than computing then lerping. Same for water: the reflection band and fresnel at full cost only within 120 m.
4. **Texture and target hygiene.** Render targets at the right size after resize (no leftover full-size targets), half-float only where needed, mipmaps on the procedural textures, no `needsUpdate` on static textures.
5. **GC and allocation audit.** A 60-second allocation profile in a desktop Chrome session (Austin runs it, or the agent uses the profiler's per-module CPU numbers): zero per-frame `new Vector3`/`Color`/arrays in update paths; pool what is left.

### Stage 3: tiers, targets and allocations

Items 1, 4 and 5 (one agent; items 2 and 3 are the vegetation and material agent's). Benches are `tools/bench-report.mjs "…/?bench=12&q=medium"` on Austin's laptop, headless with ANGLE on Metal (`SHOT_ANGLE=metal`): frames are real GPU frames there but the machine is shared, so CPU per module and the counts are what compare. Files in `shots/perf/stage3-tier-*.json`.

**Tiers** (`src/tier.js`; the table is in `README.md`). `ctx.quality` is `'high'|'medium'|'low'`. Medium builds exactly what high builds: the twelve `quality === 'high'` tests in ten files (particles, water, river, flora, riverlife, omens, meteors, parhelion, vigilant, lattices) now read `!== 'low'`, so nothing silently drops to low. Medium is high with a pixel ratio of 1 and a 2048² shadow map (texel 9.3 cm, as low; high's is 4.6 cm). Without `?q=` the tier comes from the debug panel's pin, else the device: phones and ≤ 4 cores stay low; the WebGL renderer name (or WebGPU's adapter info when WebGL masks it) says discrete → high, integrated → medium, software → low; Apple silicon, Safari's "Apple GPU" and masked names start high and the first 3 s of full-rate frames decide (an average over 1.15 frame intervals of the cap drops to medium, live). Headless on the laptop the name is "ANGLE Metal Renderer: Apple Silicon", the probe measured 18.9 ms against 19.2 and stayed high.

Pinning: the debug panel's `quality` heading shows the tier, how it was chosen and the live pixel ratio; rows `auto`, `high`, `medium`, `low` pin one (localStorage `fp-tier`). High and medium switch live (pixel ratio, shadow map re-created at its new size, the cadence's texel rule follows); to or from low reloads, since low builds fewer things.

Adaptive step: the 1% low over the last 2 s (as the profiler computes it, from a fixed ring of frame times, no allocation) is checked every 500 ms against the tier's budget (or 1.25 frame intervals of the cap if that is longer: 30 fps on battery is not "slow"). Over budget for 5 s: pixel ratio −0.1, down to the floor, and the window starts afresh at the new size. Under 0.6 of the budget for 20 s: +0.05, back toward the tier's ratio, never to a ratio that failed in the last 60 s. Cards, hidden tabs, stalls over 1 s and the bench (unless `?adapt=1`) are not counted. `?budget=1` forces it: in `perf-test.mjs` the ratio stepped 1 → 0.9 after 5 s, and the canvas and the composer's targets were 576 px wide at 640 css; left running, 1 → 0.9 → 0.8 → 0.75 (the floor), 5 s apart.

Bench, `?q=medium` (`stage3-tier-medium-before.json` is the old tree, where medium was an unlisted mix of high and low builds; `-after` builds as high): CPU in the update loop 1.27 → 1.16 ms/frame (noise: vegetation 0.64 → 0.60), triangles 1.35–2.64M → 1.45–2.80M (medium now builds high's counts).

Render pairs `shots/wip/perf-03-tier-<view>-before.png` (q=high) against `-after.png` (q=medium), all ten views of `tools/views-perf.json`, 1280×720, device pixel ratio 1 (so both render at ratio 1 and the pair shows the shadow map; medium's lower ratio is stage 2's `perf-02-dpr-*` pair). Mean absolute difference per pixel against a second q=high render (`perf-03-noise-<view>-again.png`, the grain, wind and particles alone): spawn 5.80 vs 5.73, wood 7.63 vs 7.62, sun 6.92 vs 6.85, lattice 8.78 vs 8.31 (the largest), the rest within 0.15. Medium is high at a glance at spawn, the wood and the sun.

**Targets and textures.** `src/gpumem.js` wraps the WebGL calls that allocate texture and renderbuffer storage and keeps each one's bytes (mip chains included), so the profiler reports megabytes, not just `renderer.info.memory`'s counts; the canvas's drawing buffer is estimated from its context attributes. What it found, at q=high and 1280×720:

- The canvas had MSAA at high, but the scene is drawn into the composer's targets (no MSAA) and the canvas only takes OutputPass's full-screen triangle: a 4× multisampled colour and depth buffer that changed no pixel (31.6 MB at 1280×720, 69.5 MB at a 1440×900 retina window). The canvas now has no antialias and no depth buffer. If high should be antialiased, it needs MSAA samples on the composer's scene target or an FXAA/SMAA pass: a look decision for Austin, not made here.
- All eleven bloom targets and the composer's second target carried depth renderbuffers for full-screen quads. Only the scene target (the composer's readBuffer, where RenderPass draws) keeps one; post.js restores depth on both composer targets if a future pass list ever hands RenderPass the other one. Renderbuffers 14 → 2.
- Half float stays where it is needed: the composer pair and the bloom chain carry HDR values (the sun, lanterns, the Lattice) into OutputPass's tone mapping. The shadow map is RGBA8 with a depth renderbuffer, three r170's packing (4096²: 128 MB at high; 2048²: 32 MB at medium and low, which is most of medium's saving).
- Resizing is clean: after a window resize from 1280×720 to 800×600, and after the adaptive step to 0.75, every target matches a fresh load at that size byte for byte (50.3 MB and 51.3 MB at medium); bloom's chain follows (240, 120, 60, 30, 15 px wide at 960 px).
- The procedural textures (terrain, water, mist, the trees' atlas, the Hypogeum's walls, the Parhelion City) are all mipmapped with trilinear minification, and none is re-uploaded: over 60 frames no texture's version moved except three's own BatchedMesh indirect texture (4 KB, rewritten per draw for its per-camera culling), which is the 1–3 uploads a frame the profiler shows.

GPU memory (textures + renderbuffers + canvas), before → after the target changes:

| tier | 1280×720, device ratio 1 | 1440×900, device ratio 2 (a 13" retina laptop) |
|---|---:|---:|
| high | 189.7 → 157.2 MB | 255.7 → 184.4 MB |
| medium | 69.0 → 61.2 MB | 81.5 → 70.4 MB |
| low | 60.6 → 54.9 MB | 69.5 → 61.6 MB |

So a laptop that drops from high to medium goes from 256 to 70 MB of render memory. Bench pair `stage3-tier-targets-before.json` (`&lean=0`) and `-after.json`: same frames, calls and triangles; CPU 1.43 vs 1.25 ms (noise). Render pair `shots/wip/perf-03-tier-lean-<spawn|wood|sun>-before|after.png` at q=high: differences below the noise floor (spawn 5.71 against 5.73 between two identical renders, wood 7.53 against 7.62, sun 6.09 against 6.85).

## Stage 4: verify on hardware and write it down

- Austin runs `?bench=1` on his PC at high, his laptop (if any) at medium, and his phone at low, before stage 2 and after stage 3. The agent records the JSON in `shots/perf/` with dates and the commit hash, and a short table in this file.
- Acceptance for v3: PC at high holds the 60 fps cap with GPU time per frame under 8 ms on the bench; medium on an iGPU laptop over 30 fps; phone over 30 fps for five minutes; and every before/after render pair is indistinguishable at a glance (Austin judges the pairs).

## Rules for the v3 agents

- Measure before and after every change, on the bench, and keep the JSON.
- No look changes without a before/after render pair in `shots/wip/perf-*`; Austin decides on any trade.
- Flags for everything (`?cap=`, `?dpr=`, `?shadows=`, `?bloom=`), so a regression can be bisected from the URL.
- The walk test and the audio test still pass; the artifact bundle still builds.

## Also in v3 (Austin, after the merge)

- **A loading bar on first entry.** The title card shows a thin bar that fills as modules land (main.js knows the module list and uses Promise.allSettled; emit progress per settled module and per big build step inside the slow ones: terrain, vegetation, structures), with the current module's name in small type under it ("growing the wood", "raising the keep"), so the wait reads as something happening. The "Go out" button stays disabled until the scene is ready; the line under it becomes the bar. Belongs to stage 1 with the profiler, since both are about telling the player what the machine is doing.
