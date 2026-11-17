Brief: v17 A1, the water heard (after every builder's merge)
Worktree: `.claude/worktrees/issue-1707-sound`, branch `issue-1707-sound`, port 8167. Model: sonnet. Work only there. `briefs/v17/_common.md` first; load `sound-design` (all of it: the render-measure-look loop, the craft rules, the palette) before touching anything; the builders' reports in `briefs/v17/reports/`.

Goal. The chain is heard before it is seen, and each stretch sounds like what it is: the brook a quick small babble that changes at each step, the weirs a short white rush each, the mere nearly silent (a lap), the Swallow a deep steady roar from the portal that grows as you walk south and closes over you in the tube to a muffled, pressing hum with the current's hiss along the glass, and in the Garth only the rills, and a stillness the walk has nowhere else. The tube and the Garth are under the ground: the stone room's tail (`below.inside`, `audio/graph.js`) already does part of it. Do not loop anything a visitor can hear repeat; nothing synthesised harsh (the v16 gate failed on `moor-gutter`'s roughness).

Read: `modules.md` rows `audio.js`, `audio/` and `v14/passage-sound.js` (the drip and the draught under the moor: the model for a place's emitters started from `v10/sound.js`), `src/audio/regions.js` (the river's and the fen's beds), `tools/audio-survey.json` and `tools/audio-survey.mjs`.

Do: emitters along `src/v17/plan.js`'s lines (the brook, the weirs, the Swallow's sill) and in the tube and the Garth; poses for each added to the audio survey; a row each in `tools/audio-test.mjs` where it checks one.

Done when: `ONLY=audio` and the audio survey at the new poses, measured as `sound-design` says (loudness against the moor's and the Lees', roughness under the gate's limit, no band swinging more than the gate allows), with the numbers in your report; the walk from the mere into the Garth rendered as audio and looked at as `sound-design` says.

What the owner can hear: `?pos=-95,297&yaw=3.14`, walking south.

Finish and report as `_common.md` says.
