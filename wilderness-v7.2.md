# Wilderness v7.2: the sound

Austin, 2026-11-09: "The sound in the wilderness prototype is pretty lousy. Feels random. Often unpleasant on the ear. At once too omnipresent and too rare. Can you research SotA for agentic coding sound design, add a skill or two if needed, then do a level up of the sound having subagents use that new harness? Plan to call this version 7.2 because another agent is already working on 7.1. When done you should share 10 audio samples with me."

v7.2 adds nothing to the world. Every sound that exists keeps its meaning; how it sounds, when it sounds, from where, and how loud against the rest changes. Like v3 and v6 it is a quality milestone, and like v6 it starts with a harness, because an agent that cannot hear needs numbers and pictures before it may touch a sound. Plan and briefs: `briefs/v7.2/index.md`. The method: the `sound-design` skill (`.agents/skills/sound-design/`).

## Status

**Opened 2026-11-09** on branch `claude/focused-heisenberg-vtkzad` (v7.1 is in flight on another branch; v7.2 does not depend on it and touches no figure file). The cold read of `src/audio.js` that the briefs build on is summarised in `briefs/v7.2/index.md` "What is wrong"; the measured baseline is in "The baseline, in numbers" there and in `briefs/v7.2/audio/baseline/`.

**2026-11-09, evening.** Briefs 00–05 are merged on the working branch. The gutter, Austin's worst noise, measures as fixed: on the moor its roughness fell from 0.35 to 0.03 and its level from −24 to −31 LUFS; in the Demesne one peafowl answers it instead of the flock. The beds sit at −31 to −37 LUFS and no longer repeat; the far calls are phrased emitters; every one-shot is a voice with an attack and a release; the space has three rooms and one distance model. Left open by the agents: the bus levels and `panned()` (05), the moor walk reading −30 LUFS under its −28…−24 band, the LRA band for the moor (the survey's 2…6 against the brief's 6…12), and `audio-test` and `perf-test`, which have not completed on the cloud host used for this work (one headless page saturates its four cores). Brief 06, the listening review, is in flight. Then the release.

**2026-11-09, the listening review (brief 06).** The gutter is fixed at all three gutter poses (`rough` 0.35/0.34/0.29 → 0.06/0.06/0.05, about −24 → −33 LUFS, the 78 Hz beat and the shimmer lines gone), the 7 s repeat is gone everywhere, the peafowl went from about eight at once to two staggered. Three blockers, in a fix round (v7.2-07) on the working branch: most short cues are inaudible (a lamp tick at 4 m peaks at −39 dBFS against a bed peaking at −17: the per-cue levels of 04 and the distance model of 05 stacked); a click 0.1 s after each carillon note, on the hawser's tail and after hurrying steps (the heel-toe); the keep's rooks are silent. Still weak after that, for a later pass: the places sound alike (court, tarn and canyon all about −31 LUFS and the same sharpness as the moor), the Lynchets gate is a broadband burst, the fen's insect bouts do not show in 20 s.

**Done when** the survey (`tools/audio-survey.mjs`) is green at every pose, the designer has ten renders to listen to with a line each on what changed, and `RELEASES.md` carries the v7.2 entry.

## What a visitor should notice

Standing on the moor, the wind gusts and rests, and in the rests the land is nearly silent. Far calls come from somewhere, rarely, and sound far. Nothing clicks, buzzes or whistles. Walking into the fen, the small life comes up in bouts and falls quiet. In the keep's court a struck thing rings in stone; in the wood it is swallowed. The living are heard before they are seen. The gutter is felt as a dip in everything. The whole is quieter than before and says more.
