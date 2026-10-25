# Skills

Skills live here, one folder per skill with a `SKILL.md`, in the [Agent Skills](https://agentskills.io) format so any harness can read them. Claude Code only looks in `.claude/skills/`, so each skill is mirrored there as a per-skill symlink. After adding or renaming a skill, run `tools/link-skills.sh` and commit the symlink.

| Skill | Who loads it |
|---|---|
| `orchestrator` | The main session, at the start of every session |
| `design-partner` | Anyone discussing design with Austin or writing a question for him |
| `wiki-maintenance` | Anyone changing code under `wiki/` |

Phase 1 adds vendored Godot skills; their sources go in `SOURCES.md` here.
