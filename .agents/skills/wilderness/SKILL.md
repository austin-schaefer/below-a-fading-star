---
name: wilderness
description: How to work on "Below a Fading Star", the Three.js first-person walk this repository holds. Load it before any work here, as implementer, reviewer, curator or orchestrator. Covers serving it, the module contract, the tools and tests, the pace rules that keep the owner's computer usable, hand-backs, the binding rules, how decisions are recorded, and autonomous runs.
---

# Wilderness

This repository is a static Three.js r170 site with no build step and no package.json; the site is the repository root. The milestone docs (`plans/wilderness-v<N>.md`) and their briefs (`briefs/v<N>/`) say what to build; this skill says how to work. References: `runtime.md` (URL params, quality tiers, shadow cadence, the profiler, what each test checks) and `modules.md` (the module table, which every agent that adds a module extends by one row).

## Run and serve

- Ports: 8123 is the orchestrator's live server (the owner's view). Every other agent takes its own port from 8160 up, in its own worktree, never in the deploy worktree.
- In a fresh worktree: `npm install --no-save --silent playwright@1.63.0` (keep it without a package.json).
- Serve: `nohup nice -n 10 tools/serve.sh PORT > /tmp/serve-PORT.log 2>&1 &`. Kill it when you hand back.
- Controls: WASD walk, mouse look, Shift hurry, Space hop; on touch, the stick bottom right, the hop ring left of it, drag to look; holding the speaker 1.2 s opens the debug panel. `?debug=1`, `?perf=1`, `?q=low` and the rest are in `runtime.md`.

## Module contract

Each world module exports `async function build(ctx)`. It adds its objects to `ctx.scene`, registers per-frame work with `ctx.registerUpdate((dt, t) => ...)` (optionally `ctx.registerUpdate(fn, { pos | at(), near, hz, r })`: every frame within `near` metres of the player, beyond it at `hz` with the skipped time as `dt`, or held still when `hz` is 0), and registers anything the player should not walk through with `ctx.addCollider({ x, z, r })` (optionally `y, h` to cap the height: a capped top within a hop and a scramble, about 1.4 m, can be stood on, so give low things their true top; a wall is a capsule `{ x1, z1, x2, z2, r, y, h, dh }`; `stand: false` for a top that is not a surface; the rule is at `addCollider` in `src/controls.js`). It must not touch other modules' files. Keep everything deterministic from `ctx.makeRng(salt)` or `ctx.noise`, never `Math.random()`, so the world is the same on every visit.

`ctx` fields:

- `THREE`, `scene`, `renderer`, `camera`, `quality` (`'high'|'medium'|'low'`; medium builds as high, so test `=== 'low'` or `!== 'low'`), `tier` (tier.js: `stats()`, `state`), `events` (EventTarget: `begin`, `lock`)
- `terrain`: `heightAt(x,z)`, `normalAt(x,z,out?)`, `slopeAt(x,z)` (radians), `biomeAt(x,z)` → `{ moor, heath, wood, marsh, shore, rock, ice, orchard, crystal, slope, h }` (weights 0..1), `waterLevelAt(x,z)` (y or null), `isUnderwater(x,z)`, `causewayDistance(x,z)`, `glacierMask(x,z)`, `regionRadius`, `mesh`
- `landmarks`, `causeway`, `water`, `palette`, `spawn`, `world`, `sun` (`dir` {x,y,z} toward the sun, `vec` Vector3, `light` the DirectionalLight)
- `lights`: `{ sun, hemi, ambient, sunDir, rig }` (`rig`: the light rig's exposure and base intensities; `?light=v3` restores v3's); `sky`: `{ flicker: { value } }` (1 normally; dips toward 0.2 while the sun gutters, every minute or so: tie emissives and point lights to it where that reads well)
- `player`: `{ pos: Vector3 (eye position), yaw, pitch, speed, moving, onGround, enabled }`; `controls.state.onStep` is a hook `(hurrying) => void` for footsteps
- `perf`: the profiler (`report()`, `toggles`, `setModule(name, on)`, `count(key, n = 1)`: a per-frame counter, free when the profiler is off, read by `pop-test`); each module's `ctx` is a Proxy of the shared one that tags its `registerUpdate` callbacks and `scene.add` objects, and writes fields through to the shared ctx
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
- `node tools/loading-test.mjs "$B/?q=low"` (7/7); its card renders go to the gitignored `shots/wip/`
- `node tools/grass-flicker-test.mjs low $B` (3/3)
- `node tools/build-artifact.mjs` (builds the single-file artifact and `commit.json`)
- `node tools/pop-test.mjs http://localhost:PORT --label=<name>` (v6; `--only=<group,...>`; exits 1 only on gated rows) and `node tools/pair-diff.mjs a.png b.png [diff.png]` (picture difference in the survey's numbers)
- `node tools/bloom-test.mjs $B medium` (6/6; `FP_BROWSER=webkit|firefox` too): bloom's response to a small light is round and to a thin line is a line, measured on the page's own bloom pass
- `node tools/pan-test.mjs "$B/?q=medium&perf=1&adapt=0"`: no compile or upload while turning
- `node tools/record-test.mjs "$B/?q=medium&record=6&pos=-190,165"`
- Renders: `node tools/shot.mjs "$B/?q=low&pos=-60,20&yaw=1.9" shots/wip/<name>.png 1280 720`; several views from one load: `node tools/views.mjs views.json shots/wip <prefix> low` (holds the sun's guttering so pairs match)
- `tools/suite.sh [port]` (default 8123): the release gate. Every test in sequence, a summary line per test, exit 0 only if all passed. The orchestrator runs it once per batch and before every release. A new test earns a `run` line in it.
- `tools/curate-shots.md`: the curation brief, dispatched before each merge to `main`

The rest (stair, audio, gutter, tree-lod, regions, touch, paths, dressing, bench-report, alloc-audit) and what each checks are in `runtime.md`.

## Pace (binding, whoever dispatches you)

These protect the owner's computer, which they are using while you run, so they are not yours to loosen.

- **At most four implementation agents at once**, each in its own worktree on its own port. A read-only planning, review or curation agent with no browser does not count.
- **One headless browser per agent at a time**; renders and tests run in sequence, never fanned out. `nice -n 10` and `SHOT_ANGLE=metal` on every `node tools/...` call. No `--trace` on Playwright runs.
- **Wip renders at 1280×720** into `shots/wip/`, named `<module>-<stage>-<view>.png`. `shots/wip/` is gitignored and never committed: only the curator commits, as WebP keepers into `shots/`, and a pre-commit hook rejects any staged PNG under `shots/` (so `git add -f` fails) and any image over 1.25 MB. Ignored files die with their worktree, so `tools/worktree.sh rm` first moves a worktree's `shots/wip/` files into the deploy worktree's (`.claude/worktrees/deploy`), which is where the curator reads them; it refuses if the deploy worktree is missing. Never delete or overwrite a render; the curator decides.
- **Tests before pushing:** the test for what you touched plus `walk-test`, `perf-test`, `loading-test`, `grass-flicker-test` and `build-artifact`.

## Hand-back

- **Implementer:** commit by part with conventional messages (`feat(wilderness): …`); `git fetch origin && git merge origin/next`; push your branch; no merge, no PR; kill your server. Report in under 200 words: what changed, the exact test commands and their counts, the renders to look at, any default you took.
- **Orchestrator:** a second agent reviews `git diff HEAD...origin/<branch>` cold and read-only against the brief; blockers go back to the author. Merge into the deploy worktree with `git merge --no-edit origin/<branch>`, push, remove the agent's worktree. Run `tools/suite.sh` once per batch. Before each merge to `main`: the suite green, the critic's blocking findings fixed (`autonomous-run` skill, `critic.md`), curate the deploy worktree's `shots/wip/` into WebP keepers in `shots/` (`tools/curate-shots.md`), add the `RELEASES.md` entry in the same PR (for a visitor who has never seen the walk: what they will find or notice, and known issues; the `orchestrator` skill's `release-notes.md` has the model), then `gh pr merge --merge` (the repository has no CI: the suite on the working branch is the gate), run `tools/gh-release.sh <version>` to publish the entry as the GitHub release, and merge `origin/main` back into the working branch.

## House style

Where the piece stands today, and why. These are yours to move (`AGENTS.md`): keep one while its reason holds, change it deliberately when it doesn't, and say so in the commit. An implementer follows them unless its brief says otherwise.

- **Tone.** Vance's Dying Earth over a HoMM overworld; baroque and worn, never cartoon or generic fantasy. Colour comes from the sun (ember, crimson, blood-orange) against a violet-slate sky, cold starlight, moss and rust on the ground, and a few unnatural lights (corpse-candles, the lattice's glacial blue, the four stones: Pride amber, Sloth lichen green, Avarice verdigris, Spite violet). Things are old and were once rich. Nothing is new. This is what makes the place one place; a new region or mood earns its difference rather than drifting into it.
- **Names and content are yours.** The walk borrowed its world from Fading Planet, whose canon lives in its own repository. Nothing decided here binds that game and nothing there binds you: name things, invent places, creatures and histories, and rename what you inherit (many current names are marked `[Proposed]`). Keep the names in one voice.
- **A brief binds its implementer.** Budgets and tone notes in a brief are the orchestrator's decisions; when a brief and a render disagree, the implementer redoes the render. The orchestrator can rewrite the brief.
- **Fix a pop with a transition,** not by lowering a quality setting (draw distance, counts, shadow map, pixel ratio). The settings are what the visitor chose; a lowered one hides the fault from the test and not from them.
- **The budgets above** are what keeps the walk smooth on a laptop and usable on a phone. Spend more where you have measured that you can.
- Comments and docs in the present tense. Delete what no longer holds; git keeps history.

## Decisions

An open call is decided by whoever meets it, at the brief's default if it has one, and written into the commit message that carries it. No decision log, no morning file, no continuance file: state lives in the current milestone doc's "Status" section, history in git and `RELEASES.md`. A fresh session reads the current milestone's doc (the highest-numbered `plans/wilderness-v<N>.md`) → its `briefs/<v>/index.md`, and starts.

Nothing here waits on the owner's approval. The `autonomous-run` skill covers the few things that do need them and how to keep going around them.

## The working branch

- Working branch `next`, in the worktree `.claude/worktrees/deploy` (`git worktree add .claude/worktrees/deploy next`, creating `next` from `origin/main` if it is gone), served on 8123 with `nohup nice -n 10 tools/serve.sh 8123` from there (restart it the same way if `lsof -ti:8123` is empty). Files update live; merge there, never run agents there.
- `main` is the live site: every push that touches what the site serves starts a Netlify build (`DEPLOY.md`). Work reaches it only as a release PR from the working branch.
- Long unattended runs: the `autonomous-run` skill (what each wake does, choosing the next milestone, the critic, when to pause).
- Timestamps come from `date`, never from an estimated clock.
