---
name: world-code
description: For agents that write or review code in "Below a Fading Star" (a world module, a shader, a tool, a test), on top of `wilderness`. Covers the module contract and where `ctx` is described, the per-module budgets and point lights, the rules for code here, the tests to run before pushing, reviewing a branch, and the implementer's hand-back. References beside it: modules.md (what each file under src/ owns) and runtime.md (URL params, quality tiers, shadow cadence, settings, the profiler, what each tool checks).
---

# World code

The brief says what to build; this skill says how code here is shaped and checked. It assumes the `wilderness` skill (serving, renders) and `AGENTS.md`'s pace rules.

References beside this file:

- `modules.md`: what each module under `src/` owns. Add a row when you add a module; change your row when what it owns changes.
- `runtime.md`: every URL param, the quality tiers, the shadow cadence, the settings panel, the profiler, and what each tool checks. Add your flag to your milestone's group, one line.

## The module contract

A world module exports `async function build(ctx)` and has a line in `MODULES` in `src/main.js`. It:

- adds its objects to `ctx.scene`;
- registers per-frame work with `ctx.registerUpdate((dt, t) => ...)`, or `ctx.registerUpdate(fn, { pos | at(), near, hz, r })` to throttle by distance: every frame within `near` metres of the player, beyond it at `hz` with the skipped time as `dt`, held still when `hz` is 0;
- registers what the player should not walk through with `ctx.addCollider({ x, z, r })`. Give low things their true top with `y, h`: a capped top within a hop and a scramble (about 1.4 m) can be stood on. A wall is a capsule `{ x1, z1, x2, z2, r, y, h, dh }`; `stand: false` marks a top that is not a surface. The shapes and the standing rule are in the comment above `addCollider` in `src/controls.js`;
- touches no other module's files. In the shared ones (`src/main.js`, `src/world.js`, `modules.md`, `runtime.md`) keep your edit to a line or two and put new code in new files;
- is deterministic: `ctx.makeRng(salt)` or `ctx.noise`, never `Math.random()`, so the world is the same on every visit.

`ctx` is assembled in `src/main.js`, and the comment above `const ctx = {` lists its fields (the terrain's queries, the mountains, the regions, the kit, the lights, the sky's flicker, the player, the profiler). Read it before you reach for a field; it is the one list, so a module that adds a shared field adds its line there.

## Acts

An act (v10) is the one small thing a visitor can do at a place: they come close, face the thing, are offered a few words at the bottom of the view, and press `E`, click with the mouse captured, or tap the offer on touch. `src/v10/acts.js` owns the offer, the input, the memory (`localStorage` `fp-acts`, read before any module builds) and the settings row that forgets it; the place's own module owns what the act draws and does. Register from your `build(ctx)` with `ctx.acts.add(def)`:

- `id` (stable: it is the storage key); `at: { x, y, z }`, `reach` (m, level, default 2.5; offered out to `far`, below) and `rise` (m: the eye within this of `at.y`, default 3, so an act up a stair or under a deck is not offered from the wrong level); `face: { x, z }` (its front: offered only from that side); `cone` (radians the look may be off `at`, default 0.6) or `facing(player) → bool` for a wide thing;
- `words`: two or three, in the world's voice ("Chalk your stroke"); `every`: `'visit'` (the default: once a page load), `'once'` (ever) or `'free'`; `when() → bool`: offered only while it is true (one act opening another: `() => ctx.acts.count('x') > 0`);
- `do(n, data)`: what happens, with the count after this one. Return the seconds its answer takes (or a promise): until then the act is busy, neither offered nor done again, so a `'free'` act never fires twice on two fast presses. Cue its sound as `ctx.audio.cue('act-…')`, voiced in `src/v10/sound.js`, with a row in `tools/audio-test.mjs`;
- `show(n, data)`: draw the remembered marks; called at `add()` with the stored count, and with 0 when the visitor forgets them. Read the count here, not in `build`, so a forget redraws the place.

`add()` returns a handle `{ def, count, done, busy, data, setData(obj) }`: `data` is a small JSON object (up to 2 KB) kept beside the count, for state one place leaves for another. `ctx.acts.count(id)` reads any act's count; `ctx.events` carries `'act'` (`{ id, count }`) after each act and `'actsforget'`. Stored counts are clamped to 0..9999 and a store that is corrupt or refused reads as empty. Nothing is offered or done behind the title or paused card or the settings panel. `?acts=0` makes `add()` a handle with count 0, so the place builds as it did before acts. Only the nearest act in reach and faced is offered, after a quarter of a second; the check is a squared distance per act, so keep acts rare (five to seven on the map) and do no per-frame work yourself while no act of yours is being done. The example is the tally at the Lantern Halt, `src/v10/tally.js` (registered from `src/v9/waystation.js`): `at` is where the next stroke goes, a `facing` that keeps that spot in view, `show` redraws the strokes from the count, `do` draws the next one over half a second on a small overlay and returns its length. Add your act's checks to `tools/acts-test.mjs`: offered at its place, not from far off or facing away, done, found again after a reload. Judge an act from frames taken through it in order on the page's own clock (`tools/tally-frames.mjs` is the model: Playwright's `clock.install` before the load, `pauseAt`, then `runFor`), never from a still of the finished state.

**Finding it** (v10-F1). Two things in `acts.js` bring a visitor to an act without its file doing anything. *The lure* (`src/v10/lure.js`): over every act that can be done now (`may()`: not busy, its `every` not spent, its `when()` true) and is not already on offer, a thread of saffron motes, the tally's chalk-dust, rises slowly in a loose spiral, about 4.6 m, from 0.4 m under `at` (0.45 m out in front of a `face`), and higher, up to 9 m, where the ground round the thing stands over it (a sunken stair) so it clears the lip by 3 m. It is seen from 40 m against grass, stone and snow, fades out beyond 80 m, comes and goes over 1.2 s, and is gone while the act is offered, busy or done; a later visit brings it back. All the lures are one `Points` draw and no light; per frame, a vec4 per act and the time. A def moves it with `lure: { x, y, z, h }` (world coordinates; `h` the rise) or drops it with `lure: false`: the mother crystal's stands at its foot on the path's side, not inside the glass. *The easier offer:* an act is offered out to `far` (default `reach` plus half of it, at most 3 m more), from a stand-in for the visitor moved in along the line to `reach` and turned toward the thing by up to 0.35 rad (and up or down toward `at.y` by up to 0.3), so a visitor walking toward it and looking roughly where they walk is offered it a few metres out; `rise` and `face` are always the real visitor's, so the wider offer never reaches round a door, through the slab or down from a stair's lip. `ease: false` keeps a def to its own reach and look. `acts-test`'s `find:` rows walk at each act three ways from 30 m and say how far out the offer rose.

**Carrying the player** (`ctx.controls.carry`, v10-A4): an act that moves the visitor (a seat on a rope, a boat, a lift) holds them with `const release = ctx.controls.carry({ step(pos, dt), drop() })`. While carried, each frame `step` sets `pos` (the eye) and nothing else moves the player: no walking, hop, gravity or colliders; the look stays free; `ctx.player.carried` is true and `ctx.player.intent` (0..1) says how hard they push to walk, for the carrier to read (to let them off). Give them back with `release()` and then place them (`placeAt`, or `pos` itself: the Halt sets them down exactly where they got on). A teleport (`placeAt`, or `pos` moved more than 1.5 m by anyone else) ends the carry and calls `drop()`; so does a `step` that throws, and the player is put back where the carry began. A carrier that moves the visitor somewhere worth seeing also turns their view, because most visitors never move the mouse: give it `look(dt, quiet) → null | { yaw, pitch, rate }` (`quiet`: seconds since the visitor last moved the look themselves, also `ctx.player.lookQuiet`); the look eases toward that yaw and pitch at `rate` (1/s) and the visitor's own mouse or drag still adds to it. Stop steering once they take the look, and come back only for the beats that matter. The Halt faces them out from the slab for the climb, round to the sleeper for his answer, out again, and sets them down looking where they looked when they sat. Judge a carrier from frames with no look input after the press (`tools/tally-frames.mjs ... still`). Hold your ride's clock while the paused card or the settings panel is up. The example: `src/v10/halt-seat.js`.

**Before you hand an act back** (v10 learned each of these by failing it): take frames through it from the press with **no look input** (most visitors never touch the mouse once they have pressed), at 0, 0.5, 1, 2, 4, 8, 15 and 30 s, and read them in order as a stranger with the sound off. The thing used is seen to move, in the middle of the view, for a second or more. Cause sits beside effect. Something happens next that can be followed, and no two frames after the press are the same picture (a minute of nothing reads as "it didn't work"). Anything that carries or turns the visitor frames a picture at every second. And walk up to it from 30 m without aiming: the lure is in view and the offer comes on its own. Frames taken with the look turned by hand to the right thing have passed work that then failed every one of these.

## Floors, corridors and edges (v12)

What a way up stands on. The rules are in comments in `src/controls.js` (above `addWalkable` and `addCollider`) and `src/v4/mountains.js` (above `walkLimit`); the test floors in `src/v12/heights.js` (`?heights=test`) use all of it.

- **Stacked floors:** `ctx.addWalkable(fn, { stack: true, keep, name })`. The floor is chosen by where the feet are: of the stacked floors at or under the feet (up to 0.6 m over them), the highest holds the walker, and the ground beats it only where the ground is higher and the walker is not already on it. A walker steps onto one where it is level with the ground or above it (or up to 0.15 m under it) and it holds them until it ends, so a walkway can run under higher ground (a ledge cut in a face, a crevasse's floor, a cut), one floor under another, a stair up off the ground and back down. Stacked floors are level (no slope push) and never wade. The default raise-only walkables (`addWalkable(fn)`) and `{ replace: true }` behave as before. `addWalkable` returns a remover.
- **Edges:** `keep: true` holds every edge of a stacked floor (`keep(x, z) → bool` holds where it returns true, at the point just past the edge). A held edge stops the walker like a wall and they slide along it; an edge onto a floor or the ground within a step is always open (a stair's foot). Cost: one call of the floor's `fn` per frame, none per tread.
- **The edge-guard** (every floor, every collider top): a walker on the ground who is not hopping does not go over a drop of more than 1.5 m they are not steering at (within about 45° of straight at it): they stop at the lip and slide along it. Steering at it, they go over after pressing on for 0.5 s (the eye leans out meanwhile), at once with a hurry squarely at it (Shift, or the touch stick pushed past 0.8 of its throw). In a hop the same: a hop drifting along a lip lands back on its floor, one aimed at the lip goes over; the drop is measured from the floor under the last position, so a hop off a 1 m step or down a bank is untouched. It holds on a walkway 0.9 m wide. Cost: about 0.15 ms a frame while sliding along a lip on low, nothing elsewhere. So a narrow way needs no kerb or rail to be fair; give it one only to say something.
- **Corridors through the walk limit:** `ctx.mountains.addCorridor({ pts: [[x, z], ...], half, name })` (a polyline band, round at its ends) or `{ wedge: { az, half, taper, r } }` returns a remover. Inside one the walker may pass the circle at r 348; stepping out of it sideways beyond the circle stops them at its side; `placeAt` and the first frame after a carry honour it. The saddle's wedge is the first. `walkLimit(x, z)` is the open ground (the circle and wedges, not bands): what a module spreading things over the floor means by inside (paving, grazers), so they stay off the ways up. `ctx.mountains.inWalk(x, z)` says whether a walker may stand there, bands included.
- **`ctx.controls.placeAt(x, z, y)`:** with `y`, onto the floor that holds feet at `y` there (a deck, a gallery, a stacked floor, a collider's top), colliders at that height only; without it, the ground, as before. The settings map's entries with a `y` go through it.
- **Ascents:** register each way up from its module, `ctx.ascents.add({ id, path: [[x, z] | [x, z, y], ...], offs: [0.3, 0.6, 0.95] })` (the first point's `y` places the walker, a point's `y` is where the feet must be there). `tools/heights-test.mjs` (in the gate as `heights`) walks it on the keys, steps off at each `off` with a hurry and checks the landing, and compares the frame time at the top with the floor's.
- **A fall that costs:** `src/v12/fall.js`, behind `?fall=1` (one line, `FALL_DEFAULT`, makes it the default): a fall of more than 12 m shuts the view before the ground and wakes the walker at the keep's gate. The controls keep `player.fallTop` (the highest the feet have been since they stood), `player.floorBelow` and send `'land'` (`{ drop, x, y, z }`) on `ctx.events` after any drop over 2 m.
- **From above:** `src/v12/above.js` grows the sun's shadow box with the eye's height over the floor underfoot (over the terrain only while carried), moves it toward the ground looked at with the eye always well inside, and thins the haze and the wall's cool air for a high eye; on a deck or a stair the walker is at walking height and nothing changes (`?above=0` for the old). Throttled updates count a thing's own `y` (or the eye's height) when the eye is high. Render a top with `tools/views-v12-heights.json`'s pattern: hold the eye with a carry in the view's `js` (a `dy` alone lets the walker fall during the settle and leaves the shadow box where they fell).

## Light and budgets

- **Point lights:** add and animate `PointLight`s freely. After the build, `lights.js` copies the nearest sources into three fixed slot lights each frame, so a light costs nothing away from it. Give each a real `distance`.
- **Budgets,** per module at `quality: 'high'`: about 25 draw calls and 400k triangles in view; one or two instanced meshes per kind of thing; no per-frame allocation in hot loops (`hyp(x, z)` from `noise.js`, not `Math.hypot`, which allocates); no textures from the network (`DataTexture` or `CanvasTexture`). They keep the walk smooth on a laptop and usable on a phone; spend more only where you have measured that you can.
- Custom `ShaderMaterial`s include the fog chunks (`fog_pars_vertex`, `fog_vertex`, `fog_pars_fragment`, `fog_fragment`) and set `fog: true`.
- Cast shadows from anything taller than a person; receive on everything. The sun is low in the west: silhouettes matter more than texture.
- For how a thing should look (the palette, the three hands' parts, the liveries, what has read and failed in renders), the `visual-art` skill and its references.

## Rules for code here

- **A brief binds its implementer.** Its budgets and tone notes are the orchestrator's decisions. When a brief and a render disagree, the implementer redoes the render; only the orchestrator rewrites the brief.
- **Fix a pop with a transition,** never by lowering a quality setting (draw distance, counts, shadow map, pixel ratio). The settings are what the visitor chose; a lowered one hides the fault from the test and not from them.
- A new test earns a `run` line in `tools/suite.sh`; a new URL param, a line in `runtime.md`.

## Tests

Every tool under `tools/` says what it checks and how to call it in its header comment; the `run` lines in `tools/suite.sh` are the exact calls the gate makes, and `runtime.md` ("The profiler", "What each tool checks") has the longer accounts. Each test prints a `PASS` or `FAIL` line per check: report the counts it printed, never a remembered number. Zero checks reported is a failure.

Before you push, run, in sequence, with `B=http://localhost:PORT` and `SHOT_ANGLE=metal nice -n 10` in front of each `node`:

- the test for what you touched (and its render, if it is something a visitor sees);
- `node tools/walk-test.mjs "$B/?q=low"`
- `node tools/perf-test.mjs "$B/?q=low&perf=1&bench=6"`
- `node tools/loading-test.mjs "$B/?q=low"` (its card renders go to `shots/wip/`)
- `node tools/grass-flicker-test.mjs low $B`
- `node tools/build-artifact.mjs` (the single-file artifact and `commit.json`)

Outside the gate, for the work that needs them: `tools/pop-test.mjs` (what pops, swaps and uploads; exits 1 only on gated rows) with `tools/pair-diff.mjs` (a picture difference in the survey's numbers, the unit briefs state tolerances in), and `tools/bloom-test.mjs` (bloom's shape). `tools/suite.sh` itself is the orchestrator's, once a batch.

## Reviewing a branch

A reviewer reads `git diff HEAD...origin/<branch>` cold and read-only against the brief, runs the tests it names, and looks at the renders it lists. Report blockers (the brief not met, a broken contract or budget, a test that fails or was not run) apart from the rest.

## Hand-back

A change to a surface's shader (ground, rock, water) is also rendered close and at a grazing angle, at pixel ratio 1 and 2 (`FP_DSF=2`), and the frames zoomed into: v11's wall passed every view from the bowl and broke into moiré rings for a visitor standing at its foot.

An implementer, when done:

1. Commits by part with conventional messages (`feat(wilderness): …`).
2. `git fetch origin && git merge origin/next`, then pushes the branch. No merge into `next`, no PR.
3. Kills its server.
4. Reports in under 200 words (or what the brief says): what changed, the exact test commands and the counts they printed, the renders to look at (paths in `shots/wip/`), any default it took.
