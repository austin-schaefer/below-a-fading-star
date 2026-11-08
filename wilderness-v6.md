# Wilderness v6: performance and visible artefacts

Austin, 2026-11-08: a v6 milestone "that focuses on performance optimization and reducing weird pop-in, LOD swaps, and other visible artefacts." v6 comes straight after v5 ships; v7, the living, follows (Austin, 2026-11-08: "i want to share with folks but currently performance is too poor to share"). Like v3 it adds nothing to the world; anything that looks different is a deliberate, reviewed trade. v3 made the scene run cooler. v6 makes it hold still: nothing should swap, pop, step or stall where the eye can catch it.

## Status

**Landed** (before v6 opened, all on `main` with v5): the pixel-ratio and shadow-cadence fix (`fix-dpr-steps`: integrated GPUs at 1.0, steps only on steady frames, the shadow cap while turning), the tree LOD turning fix (`tools/tree-lod-test.mjs`), the stair hop (`tools/stair-test.mjs`), the Deodand Wood's first-sight compiles and uploads (`compileAsync` and `src/warmup.js` behind the title card, `tools/pan-test.mjs`), and `?record=<s>`.

**The measurement that cut v6 short.** Austin's clean wood pan after v5 shipped (`shots/perf/laptop-wood-pan-clean-2026-11-08.json`: medium, 1920×1117, pixel ratio 1.0, no agent on the GPU) holds a steady 60 fps: median 16.7 ms, p99 17.5, worst 33.3, 0 pixel-ratio steps, 3 dynamic shadow redraws in 25 s; the phone runs fine in production. The hitching v6 was opened for is gone, so bar items 1 and 2 of `briefs/v6/index.md` are met. The GPU pass timers in that run sum to 29.8 ms at a 16.7 ms frame, so they are shares, not costs (the output pass likely carries the vsync wait); the post chain's real cost is unknown until v6-01 measures it with the cap off. Austin: "i don't wanna have a gigantic long milestone if performance is basically fine".

**v6-00 square lights: not reproduced, cause unknown.** Headless Firefox runs on the Mac's real GPU through Apple's OpenGL (point sizes clamp at 64, round), WebKit on Metal with an iPhone viewport at low, both through the live loop at the moss hollow (−205, 146), the Leerie row and the lamp on the post (−125, −17); every light draws round, and the scene target holds no NaN, Inf or value over 2.2. The glow and point shaders have no unwritten varying or local, no float texture, no mediump and no derivative; `src/v5/lights.js`, `particles.js`, `post.js` and the fog chunk match production v5 (8e3d799). Overlapping soft squares of several sizes is the shape of bloom's separable blur around one extreme pixel, so Austin's check on the phone: does `?bloom=0` at the moss hollow or the post lamp remove them? Orchestrator's sharper reading: bloom's five mips, each upsampled bilinearly from a tiny target, composite as soft squares of five sizes when the separable blur between them does not run, so if `?bloom=0` clears it the next agent starts at `UnrealBloomPass`'s blur passes on those browsers. Austin confirmed on the iPhone (2026-11-08, about 12:40 PST): with `?bloom=0` there are no squares, so the fault is in the bloom chain on WebKit and Firefox (the scene's own lights draw round). Third attempt follows v6-02, on its rebuilt post chain: the bloom mips' blur and composite on those browsers.

**Next: three batches, then release.**

| Batch | Briefs | Model | What and why |
|---|---|---|---|
| 1 | v6-00 square lights (worktree `v6-square-lights`, port 8173), v6-01 harness trimmed (worktree `v6-harness`, port 8172) | Sonnet each; v6-00 to Opus if it fails once | Light sources draw as flat squares in Firefox, Safari and iOS Safari (Chrome is clean): the one thing wrong on a shared link. v6-01 builds only `pop-test`'s switch gate, `pair-diff` and the wood pan with the frame cap off. |
| 2 | v6-04 trees, v6-05 ground | Opus, together | The near switches a walker sees in the first minute (trees at 24–36 m, grass at 60 m, reeds at 50 m), time-boxed to bar item 4. |
| 3, earned | v6-02 finish pass | Opus | v6-01's uncapped wood pan (`shots/perf/v6-01-uncapped-medium.json`) puts bloom + grade + output at 43% of the GPU timer sum (57% in the vsynced run), over the 40% line, so it runs. The timers still sum to about 4× the real frame, so the share, not the milliseconds, is what v6-02 is measured against. |
| release | curate `shots/wip`, `RELEASES.md` v6 entry, merge to `main` | | Then v7, the living. |

**Deferred, briefs on disk:** v6-03 shadow box, v6-06 fauna, v6-07 slots and dt, v6-08 AA and the image (antialiasing is not wanted before v7 is out), v6-09 the hardware table. They come back as a polish batch after v7, or sooner if a visitor names one. The survey and catalogue below stay as the record for that.

**Known rough edges** from v5, none blocking: `wilderness-v5.md` "Known rough edges".

## How the survey was done

The survey was read from the code at `c6acb9d`, which includes the three fixes, and measured with `tools/pop-probe.mjs`. The probe loads the scene at `q=medium` (1280×720, headless Chrome on ANGLE Metal), walks a route at 3 m/s of simulated time, and records for every rendered frame:

- the frame interval and the frame's own CPU time;
- draw calls and triangles;
- programs compiled so far, and new geometries and textures;
- tree LOD switches;
- instanced buffers re-uploaded (plant repacks, rock repacks);
- objects whose `visible` flipped;
- shadow-map redraws;
- light-slot handovers.

It has seven scenarios:

| Scenario | What it does |
|---|---|
| `bench` | the `?bench=30` path |
| `wood` | the tarn's spit into the Deodand Wood |
| `lattice` | the Outwash to the Lattice |
| `keep` | spawn past the keep |
| `span` | the west floor toward the Great Span's west stair |
| `causeway` | spawn to (−140, −30) |
| `woodpan` | standing at (−195, 128), turning at 1.2 rad/s |

`woodpan`, `bench` and `wood` were run twice: once before `fix-wood-hitch` and once with it. The survey pictures come from a pair script that walks a line in small steps until a watched state changes (a tree's geometry id, a buffer version, a visibility mask, the shadow redraw count), then saves the frame before and the frame after with the camera pinned at the before pose, so the pair differs only by the pop. Each `-diff` picture marks in red what changed (both frames blurred 1.5 px to remove the film grain, 5% fuzz). `v6-00-survey-baseline-*` is the noise floor: the same pose grabbed twice, 69 changed pixels.

The sky dome follows the camera, so pinned pairs also show a changed sun disc and sky. That red blob near the sun is a side effect of the method, not an artefact.

Headless Metal timings are not Austin's laptop's. Every number below is a count or a ratio to the run's own median.

## Why it shows seams today

Each artefact is tagged:

- **[done in v5]**, **[done in v6]**: a fix branch is merged;
- **[cheap]**: a few lines and a test;
- **[structural]**: a new mechanism;
- **[needs Austin's eye]**: whether it is visible at all, or the fix's trade, is his call.

Places are given as `pos=` and `yaw=` URL params. Ranked by how often a normal walk meets them, the first five are 1, 2, 5, 13 and 12.

### LOD and distance bands

1. **Tree LOD swaps are hard switches.** **[structural]**
   - *What:* each tree jumps from near detail to mid detail at 24 m and from mid to far at 72 m, scaled by kind: lone and dead trees ×1.5, giants ×2.2, thorns and mounds ×0.6. Approaching, the swap happens at the threshold. Leaving, it happens 4 m further out (hysteresis), so nothing oscillates. The swap also changes the tree's shadow caster, so the leaf pattern of the shadow changes too.
   - *Where:* every walk passes them: 588 switches on the 148 m wood route, up to 3 in one frame; 126 on the bench; 271 on the Span approach.
   - *Cause:* `vegetation/trees.js` `update()` → `batch.setGeometryIdAt`. Since the tree LOD fix the levels share one skeleton, so a swap changes card density, not shape.
   - *Measured:* the lone tree at (−125.8, −44) switches to near detail at 36.5 m and to mid at 109 m. The wood tree at (−142, 141) switches at 24.4 m.
   - *Pictures:* `v6-00-survey-tree-near-{a,b,diff}` (`pos=-89.3,-44&yaw=1.571`: the crown's leaf cards rearrange), `v6-00-survey-tree-far-*`, `v6-00-survey-tree-wood-*` (the tree's shadow on the water shifts).
2. **Plant chunks change mesh in 24 m blocks.** **[structural]**
   - *What:* past 60 m (grass) and 50 m (reeds) a chunk is packed into the cheap far mesh: fewer blades, wider, one-triangle stems. The vertex shader thins and fades every instance smoothly, but the switch between meshes is per chunk and instant.
   - *Where:* the repacks themselves are frequent. Lazy packing keeps them to 15–20% of frames on the bench (798 repacks in 430 of 2147 frames) and 162 of 3592 frames on the wood route.
   - *Cause:* `vegetation/plants.js` `lazyUpdate` and `pack`, with `FAR_GRASS` and `FAR_REEDS`.
   - *Pictures:* `v6-00-survey-grass-far-*` (`pos=-22,17.8&yaw=1.571`, one repack: the marks in the diff are blades changing in the mid-ground).
3. **Rocks pop in rings every 6 m.** **[cheap]**
   - *What:* pebbles are cut at 75 m and stones at 170 m, with no fade. Each class is repacked only after the camera has moved 6 m, so a whole ring of stones appears or vanishes at once on that step. Fine boulders swap to their coarse twin at 140 m and stop casting there.
   - *Cause:* `rocks.js` `pack`, `REACH` and `BOULDER_NEAR`.
   - *Measured:* 4086 changed pixels against a baseline of 69.
   - *Pictures:* `v6-00-survey-rocks-*` (`pos=234,-24&yaw=2.4`, the High Ling).
   - *Also:* `pack` calls `P.all.subarray()` once per instance in reach, an allocation burst every 6 m of walking (see 14).
4. **Fungi and pods switch whole 100 m groups at 90 m.** **[cheap]**
   - *Cause:* `vegetation/trees.js` `buildToadstools` `update()`, `VIS = 90`, by the group's rectangle.
   - *Measured:* 6–16 group flips per route. At 90 m the toadstools are a few pixels: from the spit the flip did not show above the noise.
   - *Pictures:* `v6-00-survey-fungi-*` (`pos=-68,142&yaw=1.571`). Low priority, but the glowing pods at dusk may show it.
5. **Far creatures move at 5 Hz.** **[cheap]**
   - *What:* beyond 120 m, herds, rooks, the slinker, the wader, the traveller, the deodand and the moths update at 5 Hz with the skipped time as their dt. On open ground, a grazer or the wagon 120–260 m away visibly steps five times a second.
   - *Cause:* `main.js` `runUpdates` and each module's `{ near: 120, hz: 5 }`.
   - Not caught in a still frame. The test is a per-creature position trace.
6. **Fauna hidden by distance with no fade.** **[cheap]**
   - *Cause:* `visible = !far` at fixed distances: beetles 80 m (`fauna/beetles.js`), lamp moths 140 m (`fauna/lamps.js`), crows and moths 260 m (`fauna/small.js`), rooks 260 m (`fauna/rooks.js`), gutter bats 420 m (`fauna/gutterbats.js`), the traveller's rope 60 m (`fauna/uncanny/traveller.js`).
   - *Measured:* the probe counts 26–53 visibility flips per route. Most are sub-pixel, but the rope and the rooks are not.
   - The deodand's appear and vanish (`fauna/deodand.js`) is the creature's design and stays.
7. **Structures, the wall-hung wonders, terrain, water, the Lattice and the mountains have no hard bands.** Their distance bands are shader `smoothstep`s:
   - the masonry's near detail, 18–70 m;
   - the terrain's bump at 60 m and fine detail at 90–120 m;
   - the strata fade, 60–160 m;
   - the water's near band;
   - the Lattice's fade, 50–150 m;
   - the fall's spray, faded out over 45–85 m before it is hidden at 100 m.

   Nothing to do. They are the pattern the others should follow.

### Chunk and streaming

8. **Plant chunk generation and repacks.** **[cheap]**
   - Chunks generate on demand and are sliced (v3 stage 3). Repack frames cost about the median: CPU on repack frames 1.9–3.9 ms against 1.8–8.1 ms otherwise.
   - Their visible part is item 2. Their cost part is the `order.sort` closure and the per-chunk `subarray` in `vegetation/plants.js` `pack`.
9. **Rock repacks.** Same as item 3: all classes on one frame every 6 m. **[cheap]**
10. **Terrain and water have no streaming seams.** The terrain is one mesh with no LOD and skirts. The fine ground skins (`v4/regions/skin.js`) are built once. Nothing to plan.

### Lighting

11. **Light slots: no pop measured today.** Only 8 point-light sources exist, and nowhere on a 4 m grid of the bowl are more than three within reach + 20 m. The slots copy a source's own `distance`, so one entering at reach + 20 m adds nothing yet. The probe saw 0–12 handovers per route, all the fen's wisps, which already hand over through a fade (`particles.js`).
    - **Risk:** v5's local lights (the Leerie's standards, the Kept Fire, the Galleries' lamps if they become point lights) will put four or more in reach. The fourth then switches on and off as the ranking changes (`lights.js` `update`). **[cheap]** now, before it is visible.
12. **Shadow box and cadence.** **[structural]**
    - *The box:* one 190 m square shadow box, centred 40 m ahead of you, texel-snapped (`main.js` `frame`, `shadows.js`). Static casters past its edge (about 135 m ahead and 55 m behind) have no shadow. The box moves only on a redraw, by at least 3 m, so the edge jumps rather than slides.
    - *Turning:* a turn moves the centre, which is 40 m ahead. Turning at 1.2 rad/s redraws the map 15 times a second (`woodpan`: 177 redraws in 12 s).
    - *Redraw rates:* standing near the banners or a moving creature, 2–11 per second (measured standing still: (−40, 22) 10.9/s, of which 10.5/s from dynamic casters). Walking: 21.7/s on the wood route, 25/s on the bench. The CPU cost of a redraw frame headless is +10–20% over the median. The GPU cost is the open number: it needs Austin's timer query.
    - *Creature shadows:* they stop at 40 m, so a creature's shadow appears when it comes within 40 m.
    - *Pictures:* `v6-00-survey-shadow-edge-*` (`pos=-150,128&yaw=1.571`, a 3.3 m move redraw). In the dark wood the edge itself did not show above the noise. On open ground at dusk it is a case for Austin's eye.
13. **No antialiasing.** **[structural]** **[needs Austin's eye]** There has been none since the post chain went in (v3's release notes). Three kinds of thin thing crawl when you move: alpha-tested leaf cards and their sky holes, chains, and spars and grass blades.
    - *Measured:* a 5 cm sideways step in the wood changes 467 pixels, against the baseline's 69.
    - *Pictures:* `v6-00-survey-aliasing-{a,b,diff}` and the ×3 crops `v6-00-survey-aliasing-crop-{a,b}` (`pos=-160,140&yaw=1.571&pitch=0.25`). The leaf holes flick on and off.
    - The most visible artefact on any walk after the tree swaps.
14. **The adaptive pixel ratio steps.** **[cheap]**
    - *What:* at medium, after 5 s over budget, the ratio drops 0.1 in one frame: the whole image softens at once. `EffectComposer.setPixelRatio` reallocates every target (`tier.js` `step` → `setPixelRatio`), which is a hitch of its own. It steps back up 0.05 after 20 s.
    - The hysteresis is already sound. The step itself is not smooth.
    - *Pictures:* `v6-00-survey-dpr-step-{a,b}` (1.0 → 0.9 at `pos=-40,22&yaw=1.9`; b is 1152×648).
    - Never seen headless (the probe's ratio held at 1.0 in every run). Austin's laptop is where it happens.

### Temporal artefacts

15. **Grass flicker at your feet.** Fixed in v3 (commits `7bcafe7` and `b4d8318`, `tools/grass-flicker-test.mjs`) and still green. Nothing to plan.
16. **Bloom shimmer on small bright points.** **[needs Austin's eye]** Bloom runs at half resolution (`post.js`, `bloomres` 0.5). Sub-pixel bright points crawl and pulse in the bloom as they move across half-size texels: the candles, the Galleries' 32 lamps, the lamps at the Pomegranate House, the deodand's eyes. Not measured headless.
17. **Fog and sky banding.** **[needs Austin's eye]** The height fog and the haze are 8-bit gradients after the grade. The film grain dithers them, so banding shows only where the grade lifts the shadows. Not measured.
18. **The dt clamps disagree.** **[cheap]** `main.js` clamps dt at 0.1 s and `controls.js` at 0.05 s. A 100 ms stall therefore advances the world 100 ms but the walker 50 ms, while the mouse look integrates the whole stall's travel. Since the shader fix this needs a real stall to show.

### Hitches

19. **First-sight shader compiles.** **[done in v5]**
    - *Before the fix:* 46 programs compiled during the bench and 35 in one 12 s wood pan, at 10–25 ms each headless. A cold run showed one 482 ms frame at (−10, 25).
    - *With the fix:* 2 programs in the bench, 5 on the wood route, 3 in the pan.
    - **Left over:** the shadow pass's `depth` programs, compiled when a caster first enters the shadow box (wood route, causeway, Span, keep), and a pair of `basic` programs created by something that appears a few seconds after load in every run.
    - The fix's `compileAsync` compiles the main pass only. **[cheap]**
20. **First-sight geometry and texture uploads.** **[done in v6]**
    - *Done:* `src/warmup.js` draws the scene once behind the title card, every object shown and unculled, into a 4×4 corner of the scene buffer with the shadow map, and `initTexture`s every material's textures (≈260 geometries, 22 textures and 10 shadow-depth programs, each caster's own depth variant, since three's shared depth material otherwise builds a variant by draw order; 100–160 ms headless); the fish rings' per-ring colour exists from the build (`fauna/small.js`), which was the late pair of `basic` programs. `pan-test` runs a second station at (−195, 128) through yaw 3.5–3.9 and fails on any compile or upload while turning. `?warmup=0` turns it off.
    - **This is the hitch the shader fix did not remove.** In the same 12 s pan, 74 geometries and 7 textures are uploaded on first draw (159 → 233, 26 → 33).
    - The worst frames of the pan with the fix are 44–88 ms, ×20–40 the median CPU, all at yaw 3.5–3.9, where the Great Span and its kit textures enter the view. The bench has 84 first-sight geometries and 6 textures.
    - Three uploads a buffer or a texture only when it is first drawn.
    - *Pictures:* `v6-00-survey-wood-pan-{a,b}` (`pos=-195,128`, yaw 3.4 → 3.7: what comes into view).
    - `tools/pan-test.mjs` stands at (−190, 165), facing north, and misses it.
21. **Allocation bursts.** **[cheap]** The steady state is 2.2 THREE objects a frame (v3 stage 3). The bursts are what is left:
    - the rocks' per-instance `subarray` every 6 m;
    - the plant pack's sort closure;
    - `lights.js`'s `near.sort` (no closure, fine).
    - The alloc audit samples steady windows and does not see bursts.
22. **The loading screen's hand-off.** The first frames after "Go out" cost ×6–28 the median: 38 and 17 ms of CPU on the bench's first two frames, at spawn. That is buffers and textures for the spawn view uploaded on the first full-rate frame. Item 20's fix covers it.

## Targets

| What | Target | Measured by |
|---|---|---|
| LOD switch, trees | no hard swap closer than 120 m (a dithered cross-fade at every switch, or the near band pushed out); hysteresis kept | `tools/pop-test.mjs`: the pinned-pair diff at each tree threshold is at the baseline (≤ 2× its changed pixels) |
| LOD switch, plants | no per-chunk mesh change inside 80 m that differs above the baseline | pop-test pinned pair across a chunk's far switch |
| Rocks | stones and pebbles fade over their last 15% of reach; repacks in steps of ≤ 2 m or spread over frames | pop-test pinned pair on the High Ling |
| Fauna | nothing visible hidden by a hard distance test closer than 300 m; far creatures interpolated so motion is continuous at 60 fps | pop-test visibility flips by name within 300 m = 0; position trace of a grazer at 150 m has no step > 2× its mean |
| Frame pacing | no frame over 2× the median interval on the bench at medium (headless: ≤ 2 frames per run, all in the first second); `pan-test` at three spots including (−195, 128) | `pop-probe` `over2x`, `pan-test` |
| Allocation | zero JS allocations in the steady state and no burst over 100 objects in any frame | `alloc-audit` with a burst window |
| Compiles and uploads | 0 programs, 0 geometries and 0 textures created after the title card on the bench, the wood route and a 360° pan | `pop-probe` `programs`, `geo`, `tex` first = last |
| Shadow | the box's edge moves at most one texel per frame (slides, never jumps); a 360° turn at 1.2 rad/s redraws ≤ 4 times a second; creature shadows fade in rather than appear at 40 m | pop-test shadow counters; pinned pair at the box edge on open ground |
| Light slots | a fourth light in reach hands over through a fade (≥ 0.3 s), never a jump | pop-test with `?lights=2` at the Pomegranate House (two sources at 12 m) |
| Pixel ratio | a step changes the ratio over ≥ 1 s (or happens only behind a still frame) and allocates no targets on the step | `?budget=1` forced step: the probe sees no frame over 2× and no new targets |
| Aliasing | the 5 cm sideways pair in the wood changes ≤ 2× the baseline's pixels (today 6.8×) | pop-test `aliasing` pair |

## Stage 1: the measurement harness (one agent, Sonnet, small) (done, trimmed: `### v6-01 harness` in Results)

`tools/pop-probe.mjs` exists (it made this survey). Stage 1 turns it into a gate.

**What:**
- `tools/pop-test.mjs`: the probe's routes and the pair script's pinned pairs, with each target above asserted and a JSON report. The pair method is in this note's survey section; the scratch script is described there and should be rewritten into the test, not copied.
- Per-frame counters exposed by the modules, so the test stops monkey-patching. Each module reports, through `ctx.perf.counters`:
  - `trees.lodSwitches`
  - `plants.repacks` and `plants.farSwitches`
  - `rocks.packs`
  - `fauna.hides` by name
  - `shadow.redraws` by reason (move, clock, dynamic, turn)
  - `lights.handovers`
  - `tier.steps`
  - `uploads`: programs, geometries and textures created
- The test also records a baseline pair, so every diff is read against the noise.

**Where:** `tools/pop-test.mjs`, `src/perf.js` (the counters), a line in each module listed.

**Tests it adds:** `pop-test` (failing on today's build: it records the before numbers in `shots/perf/v6-before.json`).

**Risks:** pinned pairs pick up the sky dome (it follows the camera) and the sun's rays. The test must mask them or pin the dome as well.

## Stage 2: LOD transitions (one agent, Opus, large)

**What:**
- **Dithered cross-fades for trees.** For about 0.4 s after a switch, both levels draw, and each fragment discards by a screen-space Bayer or blue-noise threshold against the fade. Three's `BatchedMesh` draws one geometry per instance, so the fading instance needs a second slot: an instance added for the incoming level, faded in while the old one fades out, then removed.
- **Stones and pebbles fade** over their reach's last 15% (a per-instance scale or dither, in the rock shader through `onBeforeCompile`).
- **Plant chunks** cross the far switch with the same dither over 8 m of distance, not at an instant.
- **Fungi groups** by instance distance in the shader, not by group.
- **Far meshes matched to near silhouettes:** check each tree variant's far crown outline against its near one (the `tree-lod-test` sheet already renders them side by side) and fix any that differ, so the dither hides a fade, not a shape change.
- **Fauna:** fade by distance where they hide today, and interpolate the far creatures between their 5 Hz steps (keep the cheap step; draw at the interpolated pose).

**Where:** `vegetation/trees.js`, `vegetation/batch.js`, `vegetation/plants.js`, `rocks.js`, `fauna/*.js`.

**Measured by:** pop-test pairs at each threshold; probe `over2x` unchanged.

**Tests it adds:** the cross-fade pairs in pop-test, `tree-lod-test` extended to fades.

**Risks:**
- Overdraw during fades: both levels draw at once. On the bench at most 3 trees switch in a frame, so the extra is small, but in the wood it should be measured on the GPU timer.
- Dither reads as noise without AA. Stage 4's AA decision changes how it looks.
- No quality setting goes down to pay for it.

## Stage 3: streaming and chunking (one agent, Sonnet, medium)

**What:**
- Rock packs in 2 m steps, spread over frames (one class per frame), with no `subarray`: index arithmetic and `copyWithin`.
- The plant pack's sort without a closure.
- A per-frame budget for chunk generation and repacks, so no frame does two kinds' repacks at once.
- Fauna hidden only where they are out of view (frustum test before the distance test).
- A burst window in `alloc-audit`: the worst single frame, not only the mean.

**Where:** `rocks.js`, `vegetation/plants.js`, `fauna/*.js`, `tools/alloc-audit.mjs`.

**Measured by:** probe repack frames' CPU at the median; alloc-audit's burst ≤ 100 objects.

**Tests it adds:** alloc-audit burst gate.

**Risks:** rocks packed more often re-upload more. Keep the upload range to what changed.

## Stage 4: lighting, shadow and image stability (one agent, Opus, large)

**What:**
- **Shadow box.**
  - Slide the box instead of jumping it: redraw on a 1 m move, but only the moved part. Or simpler: centre it on you, not 40 m ahead, so turning does not move it, and enlarge it to keep the forward reach.
  - Put the far edge in the fog: fade the received shadow over the last 15 m of the box (in the shadow chunk), so the edge is never a line.
  - Creature shadows fade over 35–45 m (shadow intensity per caster via a custom depth material's alpha dither).
  - Measure the redraw's GPU cost on Austin's machine with `?perf=1`'s shadow pass.
- **Light slots.** Hand over through a fade, as the wisps do. Keep 3 slots; a source leaving the top three fades out over 0.3 s while the incoming fades in.
- **Adaptive pixel ratio.** Steps happen over 1 s, by resizing only the canvas's drawing buffer or by rendering the scene pass at a scaled viewport inside fixed-size targets, so no target is reallocated. Hysteresis stays.
- *Done ahead of stage 4 (`fix-dpr-steps`, after Austin's laptop pan of 2026-11-08, `shots/perf/laptop-wood-pan-2026-11-08.json`):* the adaptive ratio steps only on steady frames, holds 20 s after any step, steps up after 45 s under 0.6 of the budget, ignores stalls, and takes its step on a steady frame right after a shadow redraw; integrated GPUs and Apple silicon start at 1.0 (the laptop had run at high's 1.25 and 20 ms budget until the tier probe finished); box-move shadow redraws while turning come at most 15/s (10 by default on integrated GPUs) and wait out over-budget frames, never past 0.12 s. Still open here: the reallocation itself (a fixed-size target with a scaled viewport touches the bloom mip chain, grade and output, so it is not a contained change) and the box centred on you. Bisect of the 100–146 ms frames, `pan-test` at medium `adapt=0&dpr=1`, headless Metal on the laptop with no other browser: the worst turning interval is 18.6–18.9 ms (×1.11–1.13 the still median, no frame over 2×) at both stations as is, with `shadows=0`, `bloom=0` and `skip=fauna`; worst CPU ×2.17, ×1.70, ×2.48, ×1.78. Nothing beyond the ratchet and the shadow cadence reproduces, so the laptop's long frames read as the reallocations, the turning redraws and the three headless browsers sharing the GPU; Austin's next walk is the check.
- **Antialiasing.** Per Austin's answer (open question 1): an SMAA or FXAA pass at the end of the post chain, or alpha-to-coverage on the leaf and grass materials with MSAA on the composer's scene target (v3 could not have alpha-to-coverage without that MSAA). Before/after pairs of the wood, the Galleries' chains and the Span.

**Where:** `main.js` (`frame`, the shadow box), `shadows.js`, `lights.js`, `tier.js`, `post.js`, the plant and tree materials.

**Measured by:** pop-test shadow and slot and pixel-ratio checks, the aliasing pair, GPU timer on hardware.

**Tests it adds:** shadow-edge pair on open ground, `?lights=2` handover check, forced pixel-ratio step check.

**Risks:**
- AA costs. SMAA is three passes at full size; MSAA on the scene target is memory on retina. This is where the trade is.
- A centred shadow box loses some forward reach unless it grows. A larger box loses resolution, or costs a bigger map.

## Stage 5: temporal cleanliness (one agent, Sonnet, small)

**What:**
- **Uploads at load.** Behind the title card, after the compile, every texture goes through `renderer.initTexture`, and every geometry gets one draw. That means one render of the scene with frustum culling off into a 1×1 target, or `renderer.compile` plus binding each geometry's attributes.
- **Compile at load.** The shadow pass's depth programs too: a `compileAsync` with the shadow camera, or one forced shadow-map draw with every caster in the box.
- **Late materials.** Find what creates the late pair of `basic` programs and build it at load.
- **One dt.** A single clamp in `main.js`, which `controls.js` uses, and the mouse-look travel accumulated during a stall capped to what one frame at 60 fps could have moved.
- **CI.** The probe's compile and upload counts in CI, with `pan-test` run at (−195, 128) as well.

**Where:** `main.js`, `controls.js`, the module that creates the late `basic` materials, `tools/pan-test.mjs`.

**Measured by:** probe `programs`, `geo`, `tex` constant after the card; `pan-test` at two spots; the hand-off's first frames ≤ 2× median.

**Tests it adds:** the upload gate, `pan-test`'s second spot.

**Risks:** GPU memory at load rises by what is already allocated later (no new bytes, only earlier). Load time rises by a draw.

## Stage 6: verify on hardware and write the table (Austin plus one agent, Sonnet)

Austin runs `?bench=1&perf=1` and walks the four routes on his laptop (medium) and his PC (high), before stage 2 and after stage 5. The agent writes a table into this file:

- frames over 2× median per minute;
- the GPU shadow pass's share;
- pixel-ratio steps seen;
- and Austin's own judgement on each of the before/after pairs: trees, rocks, shadow edge, aliasing, the pixel-ratio step.

Acceptance: every target above green in `pop-test`, the hardware frames-over-2× at most one a minute, and Austin sees no swap on a ten-minute walk.

## Rules for the v6 agents

- **Pace:** the `wilderness` skill's pace rules, and `pan-test` and `pop-test` join the tests run before pushing.
- **Never lower a quality setting as a fix.** No shorter draw distances, fewer trees, a smaller shadow map or a lower pixel ratio to hide a pop. A pop is fixed by a transition, not by removing what pops.
- **A pinned before/after pair for every change** in `shots/wip/v6-NN-<artefact>-<view>-{before,after}.png`, with its diff. Austin judges the pairs.
- **A flag for every change** (`?xfade=0`, `?shadowslide=0`, `?aa=off`, …), so a regression bisects from the URL. This follows v3's rule.
- **Counts and ratios, not headless milliseconds.** Absolute times come from Austin's machines.
- **Nothing new is added to the world.** No game content, nothing touched in `design/`.

## Open questions for Austin

Only the questions that change which work gets done.

1. **Antialiasing.** The leaf holes and chains crawl (`v6-00-survey-aliasing-crop-{a,b}`). Do you want it fixed, and at what cost?
   - (a) FXAA: one cheap pass, slightly soft;
   - (b) SMAA: sharper, three passes;
   - (c) MSAA on the scene target with alpha-to-coverage on leaves and grass: the cleanest foliage, the most memory, and medium may not afford it;
   - (d) leave it.

   Stage 4's size depends on this.
2. **LOD transitions.**
   - A dithered cross-fade costs overdraw for 0.4 s per swap, and reads as a brief stipple without AA.
   - Pushing the hard switches out to 120 m or more costs triangles: the near meshes carry several times the mid ones' cards (`__vegStats().trees.trisHiLoFar` gives each variant's three counts).

   Which do you prefer, or the fade only at the near switch and a hard switch at the horizon? Is a soft, visible change at the horizon acceptable?
3. **The shadow box.**
   - Centred on you and bigger: stable when turning, but shadows end sooner ahead.
   - Ahead of you as now, but sliding with a faded edge: more work.

   Have you noticed the shadow edge on open ground at all? If not, stage 4 keeps only the fade and the turn rule.
4. **The adaptive pixel ratio.** Has it ever stepped on your laptop (the profiler shows the ratio)? If not, its smoothing waits.

## What the survey could not measure headless

- GPU cost of anything (the shadow redraw, the fades, AA). Headless has the timer query only on some runs, and Metal headless is not the laptop.
- Whether the pixel ratio ever steps on real hardware.
- Bloom shimmer and banding, which need a real display and Austin's eye.
- The far creatures' 5 Hz stepping as motion. It needs a position trace or a video.
- The shadow box's edge on open ground at dusk. In the dark wood it did not show above the noise.

## Results

### v6-01 harness

**Built (trimmed brief):** `tools/pop-test.mjs` with its switch gate, `tools/pair-diff.mjs`, the counters, and one measurement. Not built, by the trim: the per-module fauna counters, `alloc-audit`'s burst window and the `alloc-burst` row, the `shadow-edge`, `creature-shadow`, `dpr-step`, `lights` and `grazer-trace` sequences. Their groups (`fauna`, `lights`, `dpr`) are absent from `pop-test` until their owners bring them back; the counters `lights.handovers`, `tier.steps` and `shadow.redraws.*` exist.

**Counters** (`ctx.perf.count(key, n)`; `report().counters`; every 250 ms record sample's `counters`): `trees.lodSwitches`, `fungi.groupFlips`, `plants.repacks`, `plants.farSwitches` (a packed chunk crossing the far switch at a repack), `rocks.packs`, `shadow.redraws.move|clock|dynamic|turn`, `lights.handovers` (a slot whose source changes), `tier.steps`, `uploads.programs|geometries|textures` (`renderer.info` growth per frame) and `uploads.texFirst|texData` (`gpumem.js`: texture uploads by whether that texture was uploaded before).

**Checks** (`pop-test`; owner flips its rows to gated when it lands; `uploads` is gated now):

| Row | Owner | Target | Gate |
|---|---|---|---|
| `uploads.bench`, `uploads.wood`, `uploads.pan` | v6-01 | programs, geometries, first-sight textures after the card = 0 | yes |
| `pacing.bench` | orchestrator | frames over 2x the median <= 2, all in the first second | no |
| `trees.tree-near`, `tree-far`, `tree-wood`; `fungi.fungi` | v6-04 | largest consecutive-frame change <= 2x baseline | no |
| `plants.grass-far`, `plants.reeds-far`, `rocks.rocks` | v6-05 | the same | no |
| `plants.bench-repack-spread`, `plants.wood-repack-spread` | v6-05 | no frame packs two kinds | no |
| `shadow.pan-redraws` | v6-03 | a turn at 1.2 rad/s redraws <= 4/s | no |
| `aliasing.step-5cm` | v6-08 | a 5 cm sideways step <= 2x baseline | no |
| `trees.wood-switches` | v6-04 | reported only | no |

**Before numbers** (`shots/perf/v6-before.json`, medium, headless Metal, 550 s for the full run, about two minutes for `--only=uploads`):

| Row | Value |
|---|---|
| `uploads.*` (all three) | 0 programs, 0 geometries, 0 textures, 0 first-sight uploads: the warm-up holds |
| `pacing.bench` | 2 frames over 2x the median, 1 of them after the first second (max 3.6x) |
| `plants.bench-repack-spread` | 611 repacks, 113 frames with two or more |
| `plants.wood-repack-spread` | 177 repacks in 164 frames, 7 with two or more |
| `trees.wood-switches` | 602 switches on the wood walk, at most 4 in a frame |
| `shadow.pan-redraws` | 9.3/s (111 move, 1 clock) |
| `trees.tree-near` | the switch's largest step 36 changed pixels against a baseline of 197 |
| `trees.tree-far` | 87 against 348 |
| `trees.tree-wood` | 8 against 2 |
| `plants.grass-far` | 7 against 16 |
| `plants.reeds-far` | 90 against 52 |
| `rocks.rocks` | 8 against 9 |
| `fungi.fungi` | 12 against 3 |
| `aliasing.step-5cm` | 137 against 30 |

The picture rows are noise-limited headless: with the sky pinned, the baseline of the same pose still moves by 2 to 350 changed pixels between runs (creatures, drifting motes, the sky's events), so a ratio near 1 means the pop is under the scene's own motion and a ratio above 2 on a baseline of a few pixels (`tree-wood`, `fungi`) is a few pixels. Read the absolute step and run twice. The survey's 4086 for the rocks pair was the sky dome and the sun's rays following the camera (the diff picture is one red cloud over the sun), not rocks: with the dome and the rays pinned the repack is 8 changed pixels. The survey's lone tree at (-125.8, -44) is gone (v5 moved the trees); `pop-test` finds the nearest `lone` tree to that spot (now at (-97.4, -92.7)) and walks a line toward it. `shots/wip/v6-01-baseline-{a,b,diff}.png` is the noise floor through the pinned path (first and last of 24 frames, 785 changed; consecutive frames are 2 to 200).

**Against the survey** (`v6-survey-probe.json`; the survey counted with monkey-patches, `pop-test` with counters): tree switches 602 wood (588), 81 bench (126; the bench walks 30 s here, the survey's 36), 262 span (271); plant repacks 611 bench (798, counted as buffer version bumps, far buffers included), 177 wood (232); fungi group flips 24 bench (the survey's 53 visibility flips counted every object); shadow redraws 22.9/s wood walk (21.7), 9.3/s wood pan (14.9; the pan here turns 12 s of simulated time in one browser, the survey's in a fresh one), bench about 20/s (25); handovers 12 bench, 0 wood, 1 lattice, 0 keep, 1 causeway (survey 12, 0, 0, 0 to 1, 2).

**Uploads while panning:** no first-sight upload is left. The textures that upload every frame are BatchedMesh data textures: `veg-trees._colorsTexture` (33x33) every frame the tree batch draws (about 4000 on the 50 s wood walk), and `veg-lattice._colorsTexture` (52x52) near the Lattice; the matrices and indirect textures upload far less. Expected today; `pop-test` reports them as `texData` with their sizes (`dataTextures`, named in the JSON's `dataTextureNames`).

**The uncapped wood pan** (`shots/perf/v6-01-uncapped-medium.json`: `?q=medium&record=6&pos=-190,165&cap=0&adapt=0`, headless Chrome with `--disable-frame-rate-limit --disable-gpu-vsync`, 189 fps): GPU timers per frame render 13.0 ms (shadow 0.4), bloom 3.5, grade 3.0, output 3.1, total 22.7, so the post chain is 9.7 of 22.7 = 43%. The timers sum to four times the 5.3 ms frame: they overlap on this GPU and are shares, not costs. The vsync-held run (`v6-01-uncapped-medium-vsynced.json`, `?cap=0` alone, 60 fps) reads bloom 5.2, grade 5.3, output 5.4 of 28.0 = 57%. Both are over the 40% line for v6-02; Austin's laptop numbers are what settle it.
