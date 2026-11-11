# Skills

Skills live here, one folder per skill with a `SKILL.md`, in the [Agent Skills](https://agentskills.io) format so any harness can read them. Claude Code only looks in `.claude/skills/`, so each skill is mirrored there as a per-skill symlink. After adding or renaming a skill, run `tools/link-skills.sh` and commit the symlink.

| Skill | Who loads it |
|---|---|
| `wilderness` | Anyone working in this repository: implementer, reviewer, curator or orchestrator |
| `sound-design` | Anyone touching the procedural audio, on top of `wilderness` |
| `orchestrator` | The main session, at the start of every session |
| `autonomous-run` | The main session on a loop or told to keep going; `critic.md` beside it is the brief for the cold critic |
