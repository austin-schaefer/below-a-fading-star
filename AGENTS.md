# AGENTS.md

## Project

Fading Planet: a roguelike card battler. Slay the Spire's combat and run length, Heroes of Might and Magic's overworld and growing-sorcerer fantasy, Jack Vance's Dying Earth for the fiction. The designer is Austin; he calls himself "I" in `design/`.

**Current phase: Phase 0, harness + design wiki.** No game code, no Godot project, no `game/` or `art/` folders yet.

## Where things live

- `design/`: the design canon. Austin's. Every rule carries a status tag (`[Decided]`, `[Working]`, `[Proposed]`, `[Open]`), defined in `design/index.md`.
- `inbox/`: raw ideas, one file each, `YYYY-MM-DD-slug.md`. Anyone writes here.
- `proposals/`: agent speculation, analyses, sim findings, and questions for Austin. Agents write here.
- `wiki/`: the local web app that browses and edits the three folders above. Markdown on disk is the only source of truth; the wiki is a view and an editor, never a store.
- GitHub Issues: everything agents build. Epics carry the `epic` label; work hangs off them as native sub-issues.
- `.agents/skills/`: skills, in the Agent Skills format. `.claude/skills/` holds per-skill symlinks into it (run `tools/link-skills.sh` after adding one).
- `tools/`: repo scripts. `docs/archive/`: retired docs.
- `game/`, `art/`: Phase 1. Don't create them.

Frontmatter on `inbox/` and `proposals/` files:

```yaml
type: idea | proposal | question
author: me | agent
status: new | triaged | accepted | rejected | answered
related: ["[[combat-rules]]"]
blocks: [14]          # optional: issue numbers waiting on this question
```

## Roles

- **Orchestrator:** the session Austin talks to, on a top-tier model (e.g. Fable). Load the `orchestrator` skill at the start of every session. It doesn't implement unless asked. It works with Austin on design, keeps the wiki and issues in sync, breaks epics into sub-issues, briefs and dispatches subagents, checks and merges their work, and keeps its own context lean by delegating reads.
- **Subagents:** all implementation: code, data, tests, art, sims, playtests. Mid-tier model by default (e.g. Sonnet); a stronger one (e.g. Opus) for architecture, the rules engine, and cross-cutting bugs. One issue each, briefed with the issue number, design refs, acceptance criteria, and likely files.

## Workflow

- One worktree and branch per issue: `tools/worktree.sh new <n> <slug>` creates `.claude/worktrees/issue-<n>-<slug>` on branch `issue-<n>-<slug>` from `origin/main`.
- Implementation work never lands on `main` directly. The subagent pushes its branch; the orchestrator opens a PR whose body starts with `Closes #<n>`, waits for CI, squash-merges, and removes the worktree. Bookkeeping commits by the orchestrator (`.orchestrator/last-sync`, inbox files Austin dictated) may go straight to `main`.
- Conventional commits that reference the issue: `feat(wiki): inbox quick-add (#12)`.
- Issues describe outcomes. Acceptance criteria are the contract; the description is context. Close each issue with a two- or three-line summary. File discovered work as new sub-issues. An issue whose approach is abandoned is closed with "superseded by #n", not left open as an umbrella.
- Design gap? Don't guess and don't open an issue. Write a `type: question` file in `proposals/` (see the `design-partner` skill), note it on the blocked issue, and move on.
- Sync: at session start the orchestrator diffs `design/` and `proposals/` since the commit in `.orchestrator/last-sync` and updates issues to match. In Phase 0 there is nothing downstream of the design yet, so the sync is a read and a report.

## Hard rules

- `design/` is Austin's. Edit it when he asks, and only then. When he asks, commit with `DESIGN_EDIT=1`; the pre-commit hook rejects agent commits to `design/` without it. Never use `--no-verify`.
- Never invent game content. Build only `[Decided]` and `[Working]` rules. `[Proposed]` and `[Open]` are not buildable.
- Any design discussion goes through the `design-partner` skill. Austin decides; agents widen options and recommend.
- "Inbox this" means a new file in `inbox/`, in Austin's words, with `author: me`.
- This repo has no `CLAUDE.md`. Don't add one, and don't add `CLAUDE.local.md`: either would stop Claude Code from reading this file.
- Verify by running things, not by reading. A test command that reports zero tests is a failure to investigate. For anything visual, look at it: the Playwright MCP server in `.mcp.json` (headless, screenshots to the gitignored `.playwright-mcp/`) or `npx playwright screenshot`. Austin doesn't use the Chrome extension.
- Keep docs in the present tense. Describe what is, delete what no longer holds; git keeps the history.

## Architecture (Phase 1, decided now)

- Godot 4.x, GDScript with static typing. Pin the exact version at Godot setup.
- `game/core/` is pure logic: no Node, no SceneTree. The UI is a thin layer over it.
- Content pipeline: prose specs in `design/content/` → JSON in `game/data/` → typed `Resource` classes. Agents transcribe; they never author entries.
- Headless Godot tests in CI. Test framework (GUT or gdUnit4) is chosen at Godot setup.

## Commands

- Start the wiki: `tools/wiki.sh`
- Wiki tests: `cd wiki && npm test`
- Worktrees: `tools/worktree.sh new <n> <slug>` · `tools/worktree.sh rm <n>` · `tools/worktree.sh list`
- After a fresh clone: `tools/ensure-hooks.sh` (Claude Code runs it on session start)
- After adding a skill: `tools/link-skills.sh`
