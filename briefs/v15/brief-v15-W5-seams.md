# Brief v15-W5: the ground does not jump under the walker

Worktree `.claude/worktrees/issue-1529-seams`, branch `issue-1529-seams`, port 8170. Work only there. Read `briefs/v15/_common.md` first. Helpers that read images run on `haiku` or `sonnet`.

## The owner's words (2026-11-16, 11:37)

"this little dip here is full of some really strange terrain transitions that cause the walker to hang, and sort of teleport up and down a bit as it walks"

Their screenshot: `/Users/austin/dev/below-a-fading-star/.claude/worktrees/deploy/shots/wip/owner-v15/12.png` (read only). A grassy dip at the village's edge: a red lamp-post with a lit lantern in the middle (one of `src/v15/lamps.js`'s posts, or a street lamp), a dark agave-like plant at its foot, a big pale slab or hull leaning in from the right with a rust-red one behind it (the Spilt Measure's wreck, or a Noonwright sherd), a small plastered house with an arched lit window and awnings beyond, a bare tree on the left. The address bar is where they started, not where they stood: find the place from the picture (the Pennyworth's foot and the Lees' east end are the likely ones).

## Goal

1. **Reproduce it** in a real browser on the keys: walk through the dip in several directions, logging the walker's y every frame; keep the trace and frames. "Hang" is the walker stopped by something unseen; "teleport" is y changing by more than a step between frames.
2. **Find the cause.** Likely: the village's terrain benches and blends (`src/v15/bones.js`, the plan's levels) meeting `ctx.addWalkable` floors (`stack`, `replace`, `keep` edges) that overlap or disagree by a few decimetres; a collider with no drawn thing; a held edge in open ground. Fix at the cause, in the data (the walkable, the blend, the collider), not in `src/controls.js` (another agent, W3, changes that file next).
3. **It is a class: sweep for it.** A test (`tools/seams-test.mjs`, in the suite, or rows in an existing one) that steps over the whole village's footprint and a 30 m skirt on a 0.25 m grid with `ctx.controls.floorAt` and the colliders, and reports: a floor height change over a step's rise (take the walker's step limit from controls) between neighbours where nothing drawn explains it (no registered way, stair tread, kerb or wall there); a floor that differs from the drawn ground by more than 0.15 m (ray down against the meshes); a collider or held edge standing in open ground with no mesh within 0.3 m. Print the count and the worst places; the owner's dip must be among them before your fix, or the sweep is wrong. Then fix what it finds, worst first; say what you left and why.
4. Walk the owner's dip again, same traces: y changes smoothly, nothing stops the walker.

Others at work: W4 (`issue-1528-landings`: the ways' kit, stairs, parapets, the plan's ways) and soon W3 (`src/controls.js`). Leave stairs and their walls to W4: if your sweep finds a fault that is a stair's, list it in your report for W4 and do not fix it. Merge `origin/next` before you start and before your last run.

## Done when

The trace before and after at the owner's dip; the sweep's count before and after; frames of each place changed. `ONLY=seams,ways,village,village-plan,geometry,roads,walk,hop,edges,heights,strata tools/suite.sh 8170` green (name the new test as you made it); `tools/village-walk.mjs` both routes. Report `briefs/v15/reports/issue-1529-seams.md`; hand back in under 200 words, saying plainly if you could not find or reproduce the place.
