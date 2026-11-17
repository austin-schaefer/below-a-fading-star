# Brief v15-F1: the faults after v14 (#59, #60, #61, #63)

Worktree `.claude/worktrees/issue-1503-faults`, branch `issue-1503-faults`, port 8164. Work only there. Read `briefs/v15/_common.md` first. The owner filed these within the hour after v14 shipped; read each issue's body (`gh issue view <n> --json title,body`; the screenshots are the evidence: fetch and look at each image with `gh api` or `curl -L` on its URL, into `shots/wip/`), and `plans/wilderness-v14.md`'s Status for how the places were built.

## The faults

- **#60 visual glitches in the passage's entry from the Pit.** Reproduce it on the keys from the Pit's floor (the `nadir` stand), on medium and high; keep the before frames.
- **#61 glitchy stairs in the new underground.** Find which stair from the screenshot (the Pit's wall stair, the Nave's hung stair or the passage's steps), reproduce moving: flicker needs motion, so take frame pairs a step apart.
- **#63 supports attached to nothing: "they just float".** Find them from the screenshot; every strut, chain, bracket and prop in `src/v14/` is then checked for the same (what does each end touch?).
- **The landing's flicker**, fixed in v14-F1 without a frame that showed it fixed: take that frame now, or fix it properly.
- **#59 the causeway's end.** The owner's first choice: the old hexagon causeway leads to the foot of the Cyclopean Stairs up to the Great Span and comes away again from the stairs' other end; a small dirt trail, plainly newer, is what goes to the Pit's landing. Read the issue for the second choice and the context (`tools/roads-test.mjs`, `FEET_OPEN`; the Span's stairs are not yet registered as ascents: register them so the test can see them). Check which stairs and which end the owner means against the map (`tools/map.mjs`) before moving a road, and say what you chose.

Each is one case of a class (`_common.md`): fix it at its cause, look for the others of its kind in `src/v14/`, say what you looked for and found. Brief H1 is building `tools/geometry-test.mjs` beside you to detect these; do not wait for it, but if it lands on `origin/next` before you hand back, merge and run it on your places.

## Done when

- Each fault has a before and an after frame from the same stand, and the moving ones a short sequence; the places walked in a real browser on the keys, on medium.
- #59: the causeway ends at something on both sides; `roads-test` and `paths-test` say so.
- Tests: `ONLY=roads,paths,rocks,edges,heights,walk,settings,perf,loading tools/suite.sh 8164` and what you add.

Report as `_common.md` says, a line a fault: cause, fix, frames.
