# Skills

Skills live here, one folder per skill with a `SKILL.md`, in the [Agent Skills](https://agentskills.io) format so any harness can read them. Claude Code only looks in `.claude/skills/`, so each skill is mirrored there as a per-skill symlink. After adding or renaming a skill, run `tools/link-skills.sh` and commit the symlink.

| Skill | Who loads it |
|---|---|
| `orchestrator` | The main session, at the start of every session |
| `design-partner` | Anyone discussing design with Austin or writing a question for him |
| `namer` | Anyone naming a mechanic, card, unit, or place; `design-partner` loads it when a name comes up |
| `wiki-maintenance` | Anyone changing code under `wiki/` |
| `godot-gdscript` | Anyone writing or editing `.gd` files: Godot 4.7 idioms, static typing, `game/core/` purity |
| `godot-gdscript-headless-testing` | Anyone writing or running Godot tests, or touching the test step in CI |

Vendored skills record their upstream repo, commit, license, and local changes in [`SOURCES.md`](SOURCES.md).
