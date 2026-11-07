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

## Stage 3: the structural work (one or two agents, Opus)

1. **A medium quality tier** between high and low, chosen by default on laptops (no discrete GPU hint: `navigator.gpu`/`WEBGL_debug_renderer_info` where available, else by the first 3 s of measured frame time), and an **adaptive step**: if the 1%-low frame time stays above budget for 5 s, step pixel ratio down by 0.1 to a floor; step back up slowly when there is headroom. The quality menu in the debug panel shows which tier is active and lets Austin pin one; the choice persists in localStorage.
2. **Vegetation LOD and overdraw.** Grass draw distance by tier; a cheaper far grass (cross-quads without alpha test, or just vertex-coloured ground) past 60 m; sort instanced alpha-tested batches front-to-back; reduce the fen's reed count at a distance; replace `discard` with alpha-to-coverage where it looks the same.
3. **Material simplification at a distance.** Terrain triplanar detail and bump already fade with distance; make sure the shader branches away (uniform-driven `if` blocks on distance bands are cheap) rather than computing then lerping. Same for water: the reflection band and fresnel at full cost only within 120 m.
4. **Texture and target hygiene.** Render targets at the right size after resize (no leftover full-size targets), half-float only where needed, mipmaps on the procedural textures, no `needsUpdate` on static textures.
5. **GC and allocation audit.** A 60-second allocation profile in a desktop Chrome session (Austin runs it, or the agent uses the profiler's per-module CPU numbers): zero per-frame `new Vector3`/`Color`/arrays in update paths; pool what is left.

## Stage 4: verify on hardware and write it down

- Austin runs `?bench=1` on his PC at high, his laptop (if any) at medium, and his phone at low, before stage 2 and after stage 3. The agent records the JSON in `shots/perf/` with dates and the commit hash, and a short table in this file.
- Acceptance for v3: PC at high holds the 60 fps cap with GPU time per frame under 8 ms on the bench; medium on an iGPU laptop over 30 fps; phone over 30 fps for five minutes; and every before/after render pair is indistinguishable at a glance (Austin judges the pairs).

## Rules for the v3 agents

- Measure before and after every change, on the bench, and keep the JSON.
- No look changes without a before/after render pair in `shots/wip/perf-*`; Austin decides on any trade.
- Flags for everything (`?cap=`, `?dpr=`, `?shadows=`, `?bloom=`), so a regression can be bisected from the URL.
- The walk test and the audio test still pass; the artifact bundle still builds.
