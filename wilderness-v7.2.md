# Wilderness v7.2: the sound

Austin, 2026-11-09: "The sound in the wilderness prototype is pretty lousy. Feels random. Often unpleasant on the ear. At once too omnipresent and too rare. Can you research SotA for agentic coding sound design, add a skill or two if needed, then do a level up of the sound having subagents use that new harness? Plan to call this version 7.2 because another agent is already working on 7.1. When done you should share 10 audio samples with me."

v7.2 adds nothing to the world. Every sound that exists keeps its meaning; how it sounds, when it sounds, from where, and how loud against the rest changes. Like v3 and v6 it is a quality milestone, and like v6 it starts with a harness, because an agent that cannot hear needs numbers and pictures before it may touch a sound. Plan and briefs: `briefs/v7.2/index.md`. The method: the `sound-design` skill (`.agents/skills/sound-design/`).

## Status

**Opened 2026-11-09** on branch `claude/focused-heisenberg-vtkzad` (v7.1 is in flight on another branch; v7.2 does not depend on it and touches no figure file). The cold read of `src/audio.js` that the briefs build on is summarised in `briefs/v7.2/index.md` "What is wrong". Order: the harness and the split together, then four voicing agents in parallel, then a listening review, then release.

**Done when** the survey (`tools/audio-survey.mjs`) is green at every pose, the designer has ten renders to listen to with a line each on what changed, and `RELEASES.md` carries the v7.2 entry.

## What a visitor should notice

Standing on the moor, the wind gusts and rests, and in the rests the land is nearly silent. Far calls come from somewhere, rarely, and sound far. Nothing clicks, buzzes or whistles. Walking into the fen, the small life comes up in bouts and falls quiet. In the keep's court a struck thing rings in stone; in the wood it is swallowed. The living are heard before they are seen. The gutter is felt as a dip in everything. The whole is quieter than before and says more.
