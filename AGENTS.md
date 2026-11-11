# AGENTS.md

Below a Fading Star: a first-person walk through a wilderness under a dying sun. Three.js, no build step, live at https://below-a-fading-star.netlify.app. It began as a mood piece for Fading Planet, Austin's card battler in Jack Vance's Dying Earth, and now stands on its own.

This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.

Austin is the only human here. He walks the build and tells you what he sees.

## Where things live

- The site is the repository root: `index.html`, `src/`, `vendor/`. `netlify.toml` and `DEPLOY.md` cover the deploy.
- `README.md`: the milestones. `wilderness-v<N>.md`: each milestone's doc, with its Status. `briefs/`: per-agent briefs. `IDEAS*.md`: the idea banks. `RELEASES.md`: one entry per merge to `main`.
- `tools/`: serve, tests, renders, the audio harness, and the repo scripts (`worktree.sh`, `ensure-hooks.sh`, `link-skills.sh`, `hooks/`).
- `shots/`: the curated renders. `shots/wip/` is gitignored.
- `.agents/skills/`: skills (mirrored into `.claude/skills/`). Load `wilderness` before any work here, `sound-design` before touching audio, `orchestrator` if you are the session Austin talks to.

## Roles

- **Orchestrator:** the session Austin talks to. Coordinates and reviews; implements when asked or when the change is small.
- **Subagents:** implementation, one brief each, in their own worktree. Mid-tier model by default, stronger for architecture and cross-cutting bugs.

## Workflow

- `tools/worktree.sh new <n> <slug>` gives you a worktree on branch `issue-<n>-<slug>`. Work gathers on the working branch `next` and reaches `main` as a release PR; `main` is the live site.
- Conventional commits: `feat(wilderness): the heron's wingbeat`.

## Hard rules

- Verify by running things. Zero tests reported is a failure. Anything visual: `node tools/shot.mjs <url> shots/wip/<name>.png 1280 720`, and look at the picture; Austin doesn't use the Chrome extension.
- Docs in the present tense. Delete what no longer holds; git keeps history.
- Renders never enter the repository except curated WebP keepers under `shots/`, committed by the curator. The pre-commit hook enforces it. Never `--no-verify`; never force-push.
- Never write to Claude Code's auto-memory (the per-user memory folder). Everything an agent needs to remember lives in this repo: README, the milestone docs, the skills, git history.
- No `CLAUDE.md` or `CLAUDE.local.md` in this repo; either would stop Claude Code reading this file.

## Commands

- Serve: `tools/serve.sh [port]` · tests and renders: the `wilderness` skill · worktrees: `tools/worktree.sh new|rm|list` · fresh clone: `tools/ensure-hooks.sh` · new skill: `tools/link-skills.sh`
