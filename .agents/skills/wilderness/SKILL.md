---
name: wilderness
description: How to work in prototypes/wilderness/ ("Below a Fading Star", the Three.js first-person walk). Load it before any work there, as implementer, reviewer, curator or orchestrator. Covers serving it, the module contract, the tools and tests, the pace rules that keep Austin's Mac usable, hand-backs, the binding rules, how decisions are recorded, and autonomous runs.
---

# Wilderness

`prototypes/wilderness/` is a static Three.js r170 site with no build step and no package.json. Paths below are relative to it. The milestone docs (`wilderness-v<N>.md`) and their briefs (`briefs/v<N>/`) say what to build; this skill says how to work. References: `runtime.md` (URL params, quality tiers, shadow cadence, the profiler, what each test checks) and `modules.md` (the module table, which every agent that adds a module extends by one row).

## Run and serve

- Ports: 8123 is the orchestrator's live server (Austin's view). Every other agent takes its own port from 8160 up, in its own worktree, never in the deploy worktree or the main checkout.
- In a fresh worktree: `cd prototypes/wilderness && npm install --no-save --silent playwright@1.63.0` (keep it without a package.json).
- Serve: `cd prototypes/wilderness && nohup nice -n 10 tools/serve.sh PORT > /tmp/serve-PORT.log 2>&1 &`. Kill it when you hand back.
- Controls: WASD walk, mouse look, Shift hurry, Space hop; on touch, the stick bottom right, the hop ring left of it, drag to look; holding the speaker 1.2 s opens the debug panel. `?debug=1`, `?perf=1`, `?q=low` and the rest are in `runtime.md`.

## Module contract

Each world module exports `async function build(ctx)`. It adds its objects to `ctx.scene`, registers per-frame work with `ctx.registerUpdate((dt, t) => ...)` (optionally `ctx.registerUpdate(fn, { pos | at(), near, hz, r })`: every frame within `near` metres of the player, beyond it at `hz` with the skipped time as `dt`, or held still when `hz` is 0), and registers anything the player should not walk through with `ctx.addCollider({ x, z, r })` (optionally `y, h` to cap the height). It must not touch other modules' files. Keep everything deterministic from `ctx.makeRng(salt)` or `ctx.noise`, never `Math.random()`, so the world is the same on every visit.

`ctx` fields:

- `THREE`, `scene`, `renderer`, `camera`, `quality` (`'high'|'medium'|'low'`; medium builds as high, so test `=== 'low'` or `!== 'low'`), `tier` (tier.js: `stats()`, `state`), `events` (EventTarget: `begin`, `lock`)
- `terrain`: `heightAt(x,z)`, `normalAt(x,z,out?)`, `slopeAt(x,z)` (radians), `biomeAt(x,z)` → `{ moor, heath, wood, marsh, shore, rock, ice, orchard, crystal, slope, h }` (weights 0..1), `waterLevelAt(x,z)` (y or null), `isUnderwater(x,z)`, `causewayDistance(x,z)`, `glacierMask(x,z)`, `regionRadius`, `mesh`
- `landmarks`, `causeway`, `water`, `palette`, `spawn`, `world`, `sun` (`dir` {x,y,z} toward the sun, `vec` Vector3, `light` the DirectionalLight)
- `lights`: `{ sun, hemi, ambient, sunDir, rig }` (`rig`: the light rig's exposure and base intensities; `?light=v3` restores v3's); `sky`: `{ flicker: { value } }` (1 normally; dips toward 0.2 while the sun gutters, every minute or so: tie emissives and point lights to it where that reads well)
- `player`: `{ pos: Vector3 (eye position), yaw, pitch, speed, moving, onGround, enabled }`; `controls.state.onStep` is a hook `(hurrying) => void` for footsteps
- `perf`: the profiler (`report()`, `toggles`, `setModule(name, on)`); each module's `ctx` is a Proxy of the shared one that tags its `registerUpdate` callbacks and `scene.add` objects, and writes fields through to the shared ctx
- `mountains` (v4): `crestAt(bearing)` → `{x, z, r, y}` the main crest, `faceAt(bearing, y)` → the first point on the inner face at height y (for things hung on the wall), `farHeightAt(tier, bearing, r)`, `saddle` (azimuth, bearing, widths, the walkable wedge), `seats` (AM's two flat benches), `peaks`, `ranges` (the far-range meshes), `walkLimit(x, z)`
- `kit` (v4): `masonry(opts)` → `{ mat, uniforms, set }` cyclopean stone, `stair(opts, ctx)` → `{ geometry, walkable, top, steps }`, `measureFigures(spots, opts, ctx)`, `rookWheel(opts, ctx)` → `{ mesh, scatter }`, `SCALE`, `fogTierAt(x, z)`, `fogTierAmount(r)`, `FOG_TIERS`, `FOG_CAP`, `CYCLOPEAN_GLSL`; pass your module's ctx as the last argument so its updates are tagged
- `regions` (v4): `regionAt(x, z, out?, blend?)` → weights for each region, `wood`, `fen`, `lattice` and `moor` (summing to 1) and `primary`; `airAt(x, z)` → the blended Tincture `{ color, strength }`; `soundAt(x, z)`; `distance(key, x, z)`; `hooks[key]` (each region module's `height`, `ground`, `cover`, `stone`, `air`, `sound`); `setRegionsCoarse(cell)` (terrain.js) passes the cell size to height hooks so fine relief returns its lower envelope under a region's ground skin (`v4/regions/skin.js`)
- `noise`: `{ noise2, fbm2, ridged2, warped2 }` seeded simplex; `rng()` shared; `makeRng(salt)` for a private stream; `time: { t, dt }`; `log()`

Point lights: add and animate `PointLight`s freely; after the build `lights.js` copies the nearest sources into three fixed slot lights each frame, so a light costs nothing away from it. Give each a real `distance`.

Budgets, per module, at `quality: 'high'`: about 25 draw calls and 400k triangles in view; one or two instanced meshes per kind of thing; no per-frame allocation in hot loops (use `hyp(x, z)` from `noise.js`, not `Math.hypot`, which allocates); no textures from the network (`DataTexture` or `CanvasTexture`). Custom `ShaderMaterial`s include the fog chunks (`fog_pars_vertex`, `fog_vertex`, `fog_pars_fragment`, `fog_fragment`) and set `fog: true`. Cast shadows from anything taller than a person; receive on everything. The sun is low in the west: silhouettes matter more than texture.

## Tools and tests

Put `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...` call. `B=http://localhost:PORT`. Current pass counts in brackets.

- `node tools/walk-test.mjs "$B/?q=low"` (9/9)
- `node tools/perf-test.mjs "$B/?q=low&perf=1&bench=6"` (17/17)
- `node tools/loading-test.mjs "$B/?q=low"` (7/7); it rewrites `shots/wip/loading-01-card-*.png`, so `git checkout -- shots/wip/loading-01-card-*.png` after
- `node tools/grass-flicker-test.mjs low $B` (3/3)
- `node tools/build-artifact.mjs` (builds the single-file artifact and `commit.json`)
- `node tools/pan-test.mjs "$B/?q=medium&perf=1&adapt=0"`: no compile or upload while turning
- `node tools/record-test.mjs "$B/?q=medium&record=6&pos=-190,165"`
- Renders: `node tools/shot.mjs "$B/?q=low&pos=-60,20&yaw=1.9" shots/wip/<name>.png 1280 720`; several views from one load: `node tools/views.mjs views.json shots/wip <prefix> low` (holds the sun's guttering so pairs match)
- `briefs/suite-batch.sh` (zsh, on 8123): the orchestrator's full suite, once per batch; summarise with `grep -c '^PASS'` and `grep -i fail | grep -v '0 failed'`
- `tools/curate-shots.md`: the curation brief, dispatched before each merge to `main`

The rest (stair, audio, gutter, tree-lod, regions, touch, paths, dressing, bench-report, alloc-audit) and what each checks are in `runtime.md`.

## Pace (binding, whoever dispatches you)

- **At most four implementation agents at once**, each in its own worktree on its own port. A read-only planning, review or curation agent with no browser does not count.
- **One headless browser per agent at a time**; renders and tests run in sequence, never fanned out. `nice -n 10` and `SHOT_ANGLE=metal` on every `node tools/...` call. No `--trace` on Playwright runs.
- **Wip renders at 1280×720** into `shots/wip/`, named `<module>-<stage>-<view>.png`; full size only for renders that go into `shots/`. Never delete or overwrite a render; the curator decides.
- **Tests before pushing:** the test for what you touched plus `walk-test`, `perf-test`, `loading-test` (then restore the card renders), `grass-flicker-test` and `build-artifact`.

## Hand-back

- **Implementer:** commit by part with conventional messages (`feat(wilderness): …`); `git fetch origin && git merge origin/claude/intelligent-mendel-ca020e`; push your branch; no merge, no PR; kill your server. Report in under 200 words: what changed, the exact test commands and their counts, the renders to look at, any default you took.
- **Orchestrator:** a second agent reviews `git diff HEAD...origin/<branch>` cold and read-only against the brief; blockers go back to the author. Merge into the deploy worktree with `git merge --no-edit origin/<branch>`, push, remove the agent's worktree. Run the suite once per batch. Before each merge to `main`: curate `shots/wip/` (`tools/curate-shots.md`), add the `RELEASES.md` entry (what a visitor notices, what changed underneath, which shot stages) in the same PR, `gh pr checks` until nothing is pending or failing ("no checks reported" means wait), then `gh pr merge --merge`, and merge `origin/main` back into the working branch.

## Rules

- Never invent game content; build only what the milestone doc and briefs source. Names are `[Proposed]` placeholders; Austin decides names. Nothing touches `design/`.
- A brief's budgets and tone notes are binding. When a brief and a render disagree, redo the render, not the brief.
- No quality setting lowered as a fix (draw distance, counts, shadow map, pixel ratio): fix a pop with a transition.
- Tone: Vance's Dying Earth over a HoMM overworld; baroque and worn, never cartoon or generic fantasy. Colour comes from the sun (ember, crimson, blood-orange) against a violet-slate sky, cold starlight, moss and rust on the ground, and a few unnatural lights (corpse-candles, the lattice's glacial blue, the four stones: Pride amber, Sloth lichen green, Avarice verdigris, Spite violet). Things are old and were once rich. Nothing is new.
- Comments and docs in the present tense. Never `--no-verify`; never force-push.

## Decisions

An open call in a brief is decided at the brief's default and written into the commit message that carries it. Nothing else: no decision log, no morning file, no continuance file. State lives in the current milestone doc's "Status" section; history lives in git and `RELEASES.md`. A fresh session reads `README.md` → the current milestone's doc → its `briefs/<v>/index.md`, and starts.

Stop and tell Austin only when an agent fails the same task twice, CI is red for a reason outside the diff, something would rewrite history, or the live site breaks after a merge (roll forward with a fix).

## Autonomous runs

- Working branch `claude/intelligent-mendel-ca020e`, in the worktree `.claude/worktrees/wilderness-deploy`, served on 8123 with `nohup nice -n 10 tools/serve.sh 8123` from its `prototypes/wilderness` (restart it the same way if `lsof -ti:8123` is empty). Files update live; merge there, never run agents there.
- The main checkout `/Users/user/dev/fading-planet` is Austin's live wiki: never pull, build, commit or run agents in it.
- Hourly check-in (`/loop 1h`): "Below a Fading Star run, working branch claude/intelligent-mendel-ca020e in .claude/worktrees/wilderness-deploy; load the wilderness skill. If agents run and nothing is blocked, do nothing. If nothing is in flight, dispatch the next batch of the current milestone. If blocked, note it in the milestone doc's Status and continue with what is not blocked. Stop when the milestone is on main."
- Timestamps come from `date`, never from an estimated clock.
