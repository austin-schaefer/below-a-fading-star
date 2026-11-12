# Skills

Skills live here, one folder per skill with a `SKILL.md`, in the [Agent Skills](https://agentskills.io) format so any harness can read them. Claude Code only looks in `.claude/skills/`, so each skill is mirrored there as a per-skill symlink. After adding or renaming a skill, run `tools/link-skills.sh` and commit the symlink.

What every agent needs (the fixed things, the pace rules, the tone, where state lives) is in `AGENTS.md`, not in a skill.

| Skill | Who loads it |
|---|---|
| `wilderness` | Everyone, first: implementer, reviewer, critic, curator, composer, orchestrator. Serving the walk, the render tools and where renders go, which skill next |
| `world-code` | Anyone writing or reviewing code under `src/` or `tools/`, on top of `wilderness`: the module contract, `ctx`, budgets, tests, reviewing, the implementer's hand-back; `modules.md` and `runtime.md` beside it |
| `sound-design` | Anyone touching the procedural audio, on top of `world-code` |
| `music` | Anyone writing or judging the music (`src/audio/music/`, `tools/music-*`), on top of `sound-design` |
| `storytelling` | Anyone planning, briefing, building or reviewing something a visitor finds (a place, prop, figure, creature, sound); the library is `stories/` |
| `orchestrator` | The main session, at the start of every session: the working branch, briefing, merging, releasing |
| `autonomous-run` | The main session on a loop or told to keep going |

Briefs that are not skills: `autonomous-run/critic.md` (the critic), `tools/curate-shots.md` (the curator), `orchestrator/release-notes.md` (the release entry).
