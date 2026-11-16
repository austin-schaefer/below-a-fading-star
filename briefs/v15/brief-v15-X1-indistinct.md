# Brief v15-X1: the Indistinct is removed, from the world and from the lore

Worktree `.claude/worktrees/issue-1530-indistinct`, branch `issue-1530-indistinct`, port 8171. Work only there. Read `briefs/v15/_common.md` first.

## The owner's words (2026-11-16, 11:38)

"please delete the indistinct guy", then "both from the wrold and from the lore so agents don't recreate him". Their screenshot: `/Users/austin/dev/below-a-fading-star/.claude/worktrees/deploy/shots/wip/owner-v15/13.png` (read only): a tall translucent pink lens with a blue core standing in the grass below the Lees' east wall.

## Goal

1. **Out of the world.** `src/v7/small/indistinct.js` deleted; its build, update, sound, act, card, map entry, settings row, debug switch and URL param gone from `src/v7/small.js`, `src/main.js`, `src/settings.js`, `src/world.js` (a LANDMARK or place of his, if any: `settings-test` hard-codes the place count), the audio (any cue or bed of his), `tools/small-test.mjs`, `tools/sites-v4.json`, `tools/views-v7-small.json` and any other test or tool (`grep -rIi indistinct src tools`). Keep each edit in a shared file to the lines that name him. Nothing else of `small.js` changes. What he left on the ground (a ditch, a clearing, a scatter exclusion) is made plain ground, or kept if it reads as plain ground: render and look.
2. **Out of the lore.** No mention in `stories/` (check the index and every file, also for him under another description: a blur, a figure that cannot be looked at), `plans/IDEAS*.md` (delete his entries and any idea that builds on him), the skills (`.agents/skills/**`: `modules.md`, `runtime.md`, `visual-art`, `storytelling`), `shots/README.md` captions are the curator's record of past renders: leave them, and leave `RELEASES.md` and past milestones' plans and briefs (`plans/wilderness-v4*.md` to `v14`, `briefs/v7*`): history is kept. In `plans/wilderness-v15.md` and `briefs/v15/` change only the line that offers him a place ("the Indistinct if it cannot be given a place...") to say he is removed.
3. **So nobody remakes him.** One line in the `storytelling` skill (or `stories/README.md`, wherever the next inventor reads first) and one in `visual-art`'s figures reference: the owner removed him (v15) as indistinct: no figure whose idea is that it cannot be made out (a blur, a shimmer, a translucent or glowing lens standing for a person); a figure here is a body doing something. Present tense, a line each.

## Done when

`grep -rIi indistinct src tools stories .agents plans/IDEAS*` returns only the two new lines. Before and after frames from the owner's stand (find it from the frame: the Lees' east wall, looking east) and of where he stood. `ONLY=small,settings,regions,village,geometry,audio,loading,perf,walk tools/suite.sh 8171` green (say the counts; `settings` is slow and fails under load: rerun it alone before believing a failure). Report `briefs/v15/reports/issue-1530-indistinct.md`; hand back in under 150 words.
