# AGENTS.md

Fading Planet: a roguelike card battler. Slay the Spire's combat, Heroes of Might and Magic's overworld, Jack Vance's Dying Earth. Austin is the designer and the only human here. Status lives in GitHub Issues (epics and milestones), not in this file.

## Where things live

- `design/`: the canon, Austin's. Status tags (`[Decided]`, `[Working]`, `[Proposed]`, `[Open]`) are defined in `design/index.md`.
- `inbox/`: raw ideas, one file each. `proposals/`: agent speculation and questions for Austin. Frontmatter schema in the `design-partner` skill.
- `wiki/`: the local app that browses and edits those folders. Load the `wiki-maintenance` skill before changing it.
- GitHub Issues: everything agents build. `.agents/skills/`: skills (mirrored into `.claude/skills/`). `tools/`: repo scripts. `docs/`: architecture notes and archived docs.

## Roles

- **Orchestrator:** the session Austin talks to. Loads the `orchestrator` skill at session start. Coordinates and reviews; implements only when asked.
- **Subagents:** all implementation, one issue each, in their own worktree. Mid-tier model by default, stronger for architecture and cross-cutting bugs.

## Workflow

- `tools/worktree.sh new <n> <slug>` gives you a worktree on branch `issue-<n>-<slug>`. Implementation never lands on `main` directly; the orchestrator opens the PR (`Closes #<n>`) and merges after CI.
- Conventional commits referencing the issue: `feat(wiki): inbox quick-add (#12)`.
- Design gap? Don't guess. Write a `type: question` file in `proposals/` (see `design-partner`), note it on the issue, move on.

## Hard rules

- `design/` is Austin's. Edit it when he asks (an instruction in the design chat counts), and only then; commit with `DESIGN_EDIT=1` (the pre-commit hook rejects agent commits to `design/` without it). Never `--no-verify`.
- Never invent game content. Build only `[Decided]` and `[Working]` rules.
- Design discussion goes through the `design-partner` skill. Austin decides.
- Verify by running things. Zero tests reported is a failure. Anything visual: `cd wiki && npm run shot -- <url> <out.png>`; Austin doesn't use the Chrome extension.
- Docs in the present tense. Delete what no longer holds; git keeps history.
- No `CLAUDE.md` or `CLAUDE.local.md` in this repo; either would stop Claude Code reading this file.

## Commands

- Wiki: `tools/wiki.sh` (or as a login service: `tools/wiki-service.sh install|status|promote|restart|logs`) · tests: `cd wiki && npm test` · worktrees: `tools/worktree.sh new|rm|list` · fresh clone: `tools/ensure-hooks.sh` · new skill: `tools/link-skills.sh` · game tests: see `game/README.md`
