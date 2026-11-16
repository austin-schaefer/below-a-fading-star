# Brief v15-L1: the village heard, and lit to walk by

Worktree `.claude/worktrees/issue-1524-sound`, branch `issue-1524-sound`, port 8167. Work only there. Read `briefs/v15/_common.md` first; load `sound-design` (and its harness) before anything. Helpers that read images run on `haiku` or `sonnet`.

## Goal

1. **Sound.** The village is silent of itself: a visitor hears the valley's bed and their own steps. Give it its own sound by quarter, in the walk's procedural audio (`src/audio/`, `ctx.audio.cue`, the regions' sound hooks; `src/v10/sound*.js` for how places sound): the Quarrels (the kiln's draw and tick, a chisel far off, never a rhythm), the Rungs (cloth on the Tenter's poles, a drip in the dye vats, planks on the Leads under the walker's own feet: the step sound for timber and for stone flags), the Lees (the fountain of noon: stored daylight has a sound, decide what, steady, never a hum that tires; the spout and gutter), the Pennyworth (the market's small noises with nobody shouting, the beans' poles in wind, the south door's court beyond). Shelter from the wind under the tube and in the Gullet and the Slype (the precedent: `ctx.house.sheltered`, `ctx.below.inside`). All of it quiet, sparse and spatial: the pacing rules in `sound-design`. Music is on by default this release (`plans/wilderness-v15.md`): check the village's bed sits under it.
2. **Light to walk by.** Readers found stretches with "nothing lit to walk toward": the Quarrels' route 23 to 49 m, east of the Lees' shops, the Slype, the Hitch's far end, the Skirts, the Pennyworth's foot. Walk every lane and way with `tools/contrast-survey.mjs` and by render; where a walker has no lit thing ahead, add a lamp, a lit window or a pale surface from what the quarters already have (baked light in vertex colour or emissive; the village has at most three point lights in view: `world-code`, point lights). The gutter too: when the sun gutters the village's lamps should be what is left.

Merge `origin/next` first (brief W1 moved some ways). Keep edits to the quarters' files small and in their own commits.

## Done when

`audio-survey` rows before and after at one stand in each quarter and on the causeway (unchanged outside the village); the audio gates in `sound-design` pass; `ONLY=audio,village,ways,geometry,contrast,perf,house tools/suite.sh 8167` green; before/after frames of each dark stretch in normal light and a gutter. `runtime.md` says in a few lines how a new place in the village gets its sound. Report `briefs/v15/reports/issue-1524-sound.md`; hand back in under 250 words.
