# Brief v14-B6: the path to the Lonely Staircase ends at its back (#54)

Worktree `.claude/worktrees/issue-1414-stair-approach`, branch `issue-1414-stair-approach`, port 8164. Work only there. Read `briefs/v14/_common.md` first and do what it says.

The owner, in session, 2026-11-15: "the disappearing staircase starts on the wrong side relative to path? path terminates on the _back_ of the staircase".

The Lonely Staircase (the Diffident Stair until v14's rename: `src/v12/stair.js`, `src/v12/stair/`; the stub of thirty steps at about (286, -14) whose slabs rise ahead of a climber; `plans/wilderness-v12.md` Status, H3: "the stub turned side-on to the Nave and the road's south end") is reached by a path (`src/v4/paths/routes.js`, or the slabs the stair itself lays) that brings a visitor to the back of the steps: they must walk round to find the first tread.

- Reproduce it first: walk the path to the stair on the keys in a real browser with the pointer captured, frames every 10 m, and from above (a plan view) so the path's end and the stair's first tread are both in one picture. Say which path it is, where it ends, where the first tread is and which way the stair faces. Keep the before frames.
- Fix it so a visitor who follows the path arrives at the foot of the first step, facing up it, with the stair's climb ahead of them. Move or extend the path's last stretch if that does it honestly (a path that swings round to the foot, worn as its region's paths are); turn the stair only if the path cannot be made right, because its facing was chosen for how it reads from the Nave and the road, and its top, the slabs' rise and the Hanging Croft above all hang off it (`tools/stair-test`, `heights-test`'s ascent). Say which you did and why.
- `tools/roads-test.mjs` exempts this place by name from "a track comes near it" (EXEMPT `diffident`, max 25 m): once a track reaches the foot, remove the exemption and add a check of the kind: for each way up with a ground-level foot (`ctx.ascents`), the nearest track's end is within a few metres of the ascent's first point and on the side its second point is not (a path never ends behind the thing it leads to). Run it over every ascent and say what else it finds; fix what is small, list what is not.
- The stand in the settings map for this place still shows it (settings-test's view check).

Done when: the before and after walks and plan views; `ONLY=roads,paths,stair,heights,settings,walk,rocks tools/suite.sh 8164` with counts; if a path moved, `tools/build-check.mjs` says which modules' scatter moved.
