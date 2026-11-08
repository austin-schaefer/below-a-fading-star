# Handoff: the overnight run moves to Austin's Mac

Written 2026-11-08 by the cloud orchestrator. The cloud container (4 CPUs, software WebGL, load 10–15) made every render take minutes and every hand-back one to two hours, so the run continues on Austin's Mac in a local Claude Code session. This file is what that session needs; `wilderness-run.md` is the running order and the standing decisions; `MORNING.md` is the log for Austin. The cloud session has stood down: its scheduled check-in is disabled and its agents were told to push and stop.

## State at handoff

- **`main` moved after this handoff was written:** v2.2 (merge `1e884f5`, PR #92) adds a touch hop button, a faint mute button top right, and the mobile Safari thumbstick fix, with `tools/touch-test.mjs` (25 checks) and stage 15 renders. Merge `origin/main` into the working branch before anything else; `controls.js`, `audio.js`, `index.html`, `README.md` and `RELEASES.md` are the files it touched. Run touch-test with the other suites from now on.
- Branch `claude/intelligent-mendel-ca020e` is the working branch, ahead of `main` (v2.1, merge `631683e`) with: favicon, slower walking, the WebGL context-loss guard, the quieter wind mix, the fall-loop audio fixes, the v4/v5 notes, `IDEAS-v5.md`, the v5 picks, the re-cut sequence, and this file. All of it ships with the next release.
- **v3 stage 2** (the cheap wins) is on branch `v3-stage2`, pushed, **all six changes done**, one commit each from the frame cap (`1f7ce07`) to distance throttling (`276dd56`), plus two fixes found from Austin's bench numbers: Firefox has no `WEBGL_multi_draw`, so trees were drawn one call each; an instanced fallback takes 3992 draw calls to 538 (`671b039`); and the fauna first-frame spike was the perch raycasts, now deterministic (`414f61c`). Trades: throttling skips wings, gutter bats, `life.js` and fish rings (they cost almost nothing and 5 Hz motion would show against the sky); hard PCF was tried and rejected (saves no fetches, bands the wood's dappled light); pausing particle systems on the GPU was not started. Verified by the agent: perf-test 15/15, walk 6/6. **Not yet run on it:** audio, loading, grass-flicker, the artifact build and a final perf-test; the Mac session runs those, then merges `v3-stage2` into the working branch. For Austin's eye: `shots/wip/perf-02-bloom-sun-*` (the sun's rim slightly wider and brighter at half-res bloom) and `perf-02-dpr-spawn-*`. Its note is `HANDOFF-stage2.md` on that branch.
- **The flickering spars** (Austin's screenshot `shots/wip/austin-01-wood-spars-flicker.webp`: tall thin spars popping in and out) is on branch `v3-flicker`, pushed (`9268ed6`), **cause not found, nothing changed in `src/`**. Its note `HANDOFF-flicker.md` has the detail. In short: Austin's spot is the fen's east edge about 9 m north of the dead hollow snag at (143, 158), looking south-south-west (`shots/wip/flicker-01-before-yaw00.png` matches his frame); the spars are probably reed seed heads (`src/vegetation/plants.js` around lines 135 to 152) within a metre of the eye, unconfirmed; frustum culling of the tree batch and plant-chunk culling and packing were ruled out by measurement. Leads left: the near, mid and far tree meshes are built differently and jump when a tree switches between them; the shadow box; the exact position. The Mac session restarts this with those leads, on an Opus agent, at `?q=high` and device pixel ratio 2, which is what Austin sees and the cloud did not render.
- The audio suite was last run on the cloud at 37/39 with two load-induced failures, then fixed (`91ea16c`); the re-run had not finished. Run it first on the Mac; expect 39/39.
- Austin's bench JSON from Firefox/macOS is in `shots/perf/`; stage 4's table in `wilderness-v3.md` is filled from a second run after stage 3, when Austin is awake.

## Set up (Austin, once)

Not the live wiki checkout at `~/dev/fading-planet` (the login service runs the built wiki from it; never pull, build or run agents there). A fresh clone beside it:

```sh
cd ~/dev && git clone git@github.com:austin-schaefer/fading-planet.git fading-planet-night
cd fading-planet-night && git checkout claude/intelligent-mendel-ca020e && tools/ensure-hooks.sh
cd prototypes/wilderness && npm install --no-save playwright@1.63.0 && npx playwright install chromium
caffeinate -dims &            # keep the Mac awake for the night; kill it in the morning
claude --dangerously-skip-permissions
```

The `--no-save` install puts Playwright in a git-ignored `node_modules` without adding a `package.json` (one there would change what Netlify does). The permissions flag is what makes an unattended night possible; the repo's hooks still block commits to `design/` and `--no-verify` is forbidden.

## Rendering on the Mac

Every tool launches Chromium with `--use-angle=swiftshader` (software) unless `SHOT_ANGLE` is set. The first thing the Mac session does is try the GPU:

```sh
SHOT_ANGLE=metal node tools/shot.mjs 'http://localhost:8123/?q=high' /tmp/gpu-test.png 1280 720
```

If the render is a real picture, export `SHOT_ANGLE=metal` for every tool call from then on (renders in seconds, tests in a minute or two). If it is black or errors, leave the default; software rendering on Apple silicon is still many times faster than the cloud was.

## Not torching the Mac

Austin: "ensure it doesn't torch my computer doing too many things at once." Binding:

- **At most two implementation agents at once**, each told it is one of two and that the other is rendering too.
- **One headless browser per agent at a time**; renders and tests run in sequence, never fanned out. The orchestrator runs no renders or suites while two agents are rendering.
- **Wip renders at half size** (1280×720); full size only for the few that go into `shots/`. No `--trace` on Playwright runs.
- **`nice -n 10`** in front of every `node tools/...` call, so the Mac stays usable if Austin wakes early.
- Curation and review agents are Sonnet and render nothing new.
- If the fan is the problem in the morning, the fix is one agent at a time, not fewer renders.

## What changes from the cloud run

- No phone notifications: the stop-and-notify rule writes to `MORNING.md` under a **Needs you** heading and stops that line of work.
- The artifact publish step is skipped if the local session has no Artifact tool; Netlify deploying `main` is the live build.
- Check-ins: there is no server-side scheduled task; the local session keeps itself moving with `/loop 1h` (or the Cron tools if present) on the check-in text in `wilderness-run.md`, and compacts at 350k (`/autocompact 350k`).
- GitHub via `gh`: PRs with `gh pr create`, CI with `gh pr checks --watch`, merges with `gh pr merge --merge` after green (merge commits, not squash, as the v2 and v2.1 releases did).

## Order of work on the Mac, first hour (after merging `origin/main`, see above)

1. Audio suite, walk, loading, perf, grass-flicker, artifact build on the working branch: the baseline.
2. `git fetch origin v3-stage2 v3-flicker`; read the two `HANDOFF-*.md` notes. Stage 2 is complete: run the remaining checks on `v3-stage2`, look at the bloom and dpr renders, merge it into the working branch, copy the best renders into `shots/` (stage 15). The flicker is unsolved: dispatch an Opus agent on it in a worktree from `v3-flicker`, with the leads in its note, rendering at `?q=high` and device pixel ratio 2.
3. From there, `wilderness-run.md` from step 1 (v3) onward.
