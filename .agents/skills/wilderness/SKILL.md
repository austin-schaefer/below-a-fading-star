---
name: wilderness
description: Start here, for any work on "Below a Fading Star", the Three.js first-person walk this repository holds, whatever the role (implementer, reviewer, critic, curator, composer, orchestrator). Says which other skills a role loads, how to serve the walk on your own port and walk it, and how to take renders and where they go. Agents that write or review code load `world-code` as well.
---

# Wilderness

The repository is a static Three.js r170 site with no build step and no package.json; the site is the repository root. `AGENTS.md` holds the fixed things (the pace rules among them), the tone and where state lives; the current milestone doc (`plans/wilderness-v<N>.md`) and its briefs (`briefs/v<N>/`) say what to build. This skill is what every agent that runs the walk shares.

## The other skills

`.agents/skills/README.md` says who loads which. In short: writing or reviewing code under `src/` or `tools/` is `world-code`, now; audio adds `sound-design` (and `music` for the score); the main session loads `orchestrator`. A critic's brief is `autonomous-run/critic.md`, a curator's `tools/curate-shots.md`.

## Serve and walk

- **Ports:** 8123 is the working branch's server, the owner's view (the `orchestrator` skill keeps it up). Every other agent takes its own port from 8160 up and serves its own worktree, never the deploy worktree.
- In a fresh worktree: `npm install --no-save --silent playwright@1.63.0` (keep it without a package.json).
- Serve: `nohup nice -n 10 tools/serve.sh PORT > /tmp/serve-PORT.log 2>&1 &`. Kill it when you hand back. Below, `B=http://localhost:PORT`.
- **Controls:** WASD walk, mouse look, Shift hurry, Space hop; on touch, the stick bottom right, the hop ring left of it, drag to look; holding the speaker 1.2 s opens the debug panel. Where an act is offered (v10), `E`, a click with the mouse captured, or a tap on the offer does it. The gear opens the settings panel, whose map teleports to every named place.
- **URL params:** `?pos=x,z&yaw=&pitch=` to stand somewhere, `?q=low|medium|high`, `?debug=1`, `?perf=1`, and every module's switch: `world-code/runtime.md`.

## Renders

- One view: `node tools/shot.mjs "$B/?q=low&pos=-60,20&yaw=1.9" shots/wip/<name>.png 1280 720` (headless software WebGL, slow but faithful; `SHOT_DPR=2` renders at a retina pixel ratio).
- Several views from one load (the scene build is the slow part): `node tools/views.mjs views.json shots/wip <prefix> low`, where `views.json` lists `{ name, x, z, yaw, pitch, dy, js, pre }`. It holds the sun's guttering off so before/after pairs match.
- `FP_BROWSER=chromium|firefox|webkit` picks the engine for both (default chromium; the ANGLE flags are Chromium's). Headless Firefox and WebKit on this Mac draw on the real GPU (Firefox through Apple's OpenGL, points clamped at 64 px), so they are the Firefox and Safari GPU paths, not software.
- **Where they go:** 1280×720 into `shots/wip/`, named `<module>-<stage>-<view>.png`. `shots/wip/` is gitignored and never committed; only the curator commits, as WebP keepers into `shots/`, and the pre-commit hook rejects any staged PNG under `shots/` (so `git add -f` fails) and any image over 1.25 MB. Ignored files die with their worktree, so `tools/worktree.sh rm` first moves a worktree's `shots/wip/` into the deploy worktree's (`.claude/worktrees/deploy`), where the curator reads them; it refuses if the deploy worktree is missing.
- Never delete or overwrite a render, yours or anyone's; the curator decides.
- Look at every render you take (the Read tool shows images) before you name it in a report.

## Hand-back

A brief that says "as the `wilderness` skill's Hand-back says" means the implementer's hand-back in the `world-code` skill. A critic or a curator hands back as its brief says.
