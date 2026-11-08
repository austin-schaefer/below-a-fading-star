# Handoff: the overnight run moves to Austin's Mac

Written 2026-11-08 by the cloud orchestrator. The cloud container (4 CPUs, software WebGL, load 10–15) made every render take minutes and every hand-back one to two hours, so the run continues on Austin's Mac in a local Claude Code session. This file is what that session needs; `wilderness-run.md` is the running order and the standing decisions; `MORNING.md` is the log for Austin. The cloud session has stood down: its scheduled check-in is disabled and its agents were told to push and stop.

## State at handoff

- Branch `claude/intelligent-mendel-ca020e` is the working branch, ahead of `main` (v2.1, merge `631683e`) with: favicon, slower walking, the WebGL context-loss guard, the quieter wind mix, the fall-loop audio fixes, the v4/v5 notes, `IDEAS-v5.md`, the v5 picks, the re-cut sequence, and this file. All of it ships with the next release.
- **v3 stage 2** (cheap wins: pixel-ratio tiers, shadow cadence, half-res bloom, light slots, frame cap, distance throttling) was in flight in the cloud, on branch `v3-stage2`. The agent was told to commit, push and leave `HANDOFF-stage2.md` at `prototypes/wilderness/` on that branch saying what is done, what is verified and what is left. If the branch or the note is missing, the work was lost with the container and stage 2 restarts from `wilderness-v3.md` and `wilderness-v3-survey.md`.
- **The flickering spars** (Austin's screenshot `shots/wip/austin-01-wood-spars-flicker.webp`: tall thin trees in the Deodand Wood popping in and out) was in flight on branch `v3-flicker`, same arrangement, note `HANDOFF-flicker.md`. The suspects were bounding-sphere culling and the LOD swap on the batched trees.
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

## Order of work on the Mac, first hour

1. Audio suite, walk, loading, perf, grass-flicker, artifact build on the working branch: the baseline.
2. `git fetch origin v3-stage2 v3-flicker`; read the two `HANDOFF-*.md` notes; dispatch an Opus agent per branch in its own worktree to finish from where the note says, with the pace rules above. If a branch is missing, wait up to 30 minutes (fetch every five) before restarting that work from scratch.
3. From there, `wilderness-run.md` from step 1 (v3) onward.
