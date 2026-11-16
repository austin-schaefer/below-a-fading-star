# Brief v15-R1: two regressions the owner sees on `next`: the Pit's rim peeled from the ground, and the jitter climbing stairs

Worktree `.claude/worktrees/issue-1534-regressions`, branch `issue-1534-regressions`, port 8177. Work only there. Read `briefs/v15/_common.md` first.

## The owner's words (2026-11-16, on `next` at 05b7696 or later, WITHOUT the edges branch)

1. "something in all this seems to have peeled the pit's edges away from surrounding terrain", "actually the edge of the pit has gotten separated from terrain all around it", and after a reload without the edges work: "rims peeled: yes". Screenshots (deploy worktree, read only): `shots/wip/owner-v15/18.png` (from the rim looking down: the cracked ground ends in a lip that stands clear of the Pit's wall, darkness between) and `21.png` (from just inside the rim: the lit orange wall of the Pit stands apart from a pale-violet sheet of ground, a dark gap all along between them).
2. "visual jitter is back ascending stairs; it was gone for a long time", and after the reload: "stair jitter: also yes". Which stair is not said: try the village's Heliarch flight (the spine, from the Lees' square up to the crown), the Diffident Stair by the Pomegranate House, the Pit's stair and the Lonely Staircase.

Both are release blockers for v15. Neither is the edges branch's doing (`origin/issue-1527-edges` is not merged; do not merge it).

## Goal

For each, **find the commit**, then fix at the cause.

- Reproduce on `next` in a real browser: for the rim, stands on the rim all round the Pit (centre about (200, 185); `?pos=x,z` puts you on the floor at that x,z, so stand OUTSIDE the hole, 2 to 4 m back from the lip, and look down and along it; a `?pos` inside the hole lands you on the Pit's floor, 60 m down: the orchestrator's own renders made that mistake); for the stairs, walk up each on the keys with the pointer captured, logging the eye's height and pitch every frame, and plot it: jitter is the eye's height not rising smoothly (a sawtooth, a one-frame snap, a step applied twice).
- Then the same stands and the same walks on the live site's code (`origin/main`: `git worktree add` a second folder beside yours, or `git stash`-free: check files out into a scratch folder with `git archive origin/main | tar -x -C <scratch>` and serve that on 8178). If `main` shows it too, it is older than v15: say so with the frames and still fix it. If not, `git bisect` between `origin/main` and `next` with your reproduction as the test (it is about 400 commits: nine steps; merge commits are fine to land on).
- Suspects, to check first, not to believe: for the rim, `src/v14/pit.js` and `src/v14/under.js` (changed in `b2da36ea` "fix(v14): #60 #61 #63"), the terrain's bake and its store (`src/v13/bake.js` takes a stored bake when one answers first: is the store's key blind to `src/height/pads.js`, a new file, or to today's `field.js` changes, so a browser that has walked before draws an old terrain under new rims? The owner's browser has a store; your headless one starts without: reproduce with a store kept from `origin/main`), `src/height/field.js` and `ground.js`; for the stairs, `src/controls.js` (7 lines changed since `main`), `src/main.js` (15), the village's treads as walkables (`src/v15/ways/`, `src/v15/bones.js`: a stair made of `stack` floors whose risers the walker snaps up, where the old stairs were ramps under drawn treads), and the eye's smoothing (v13 "a steadier step").
- Fix each at its cause, and guard its kind where a row fits (`seams-test`, `heights-test`, `walk-test`): for the stairs, a row that walks up a stair of each make and fails on a frame-to-frame eye jump over a few centimetres; for the rim, a row that a rim's mesh meets the drawn ground within a few centimetres all round (the Pit, the Nave, the Hypogeum).

## Done when

The commit named for each (or "older than v15", shown); before and after frames at the owner's two views and the eye-height plots before and after; `ONLY=seams,heights,walk,hop,edges,geometry,paths,stair,loading,perf tools/suite.sh 8177` green with counts. Report `briefs/v15/reports/issue-1534-regressions.md`; hand back in under 200 words, saying plainly what you could not reproduce.
