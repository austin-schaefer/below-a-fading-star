# Brief v10-T1: walk to the edge and look down

Read first: `AGENTS.md`; the `wilderness` and `world-code` skills; `plans/wilderness-v10.md`.

## The owner's issue (#15), whole

"Let me walk all the way to the edges of chasms/pits so I can peer down into their murky depths kthx"

## Goal

Today something stops a walker short of the lip of the map's holes, so the best view at each (straight down into the dark) cannot be had. Find every pit, chasm, shaft and drop a visitor is kept back from, find what keeps them back (a collider ring, a blocked cell, a slope limit, a clamp in `src/controls.js`; it may differ from hole to hole), and let them stand at the very lip and look down. Candidates to start from, not a full list: the Foundered Nave's hole in the east moor (`src/v5/nave.js`), the Sunken Court, the crack and the fallen bays on the Great Span (`src/v4/span.js`), the stair down to the Hypogeum's door (`src/v2/ruins.js`), the ha-ha, any crevasse on the glacier, the river's canyon (`src/v7/canyon.js`). Walk the map's named places and list what you find.

What "the lip" means: the walker's eye can be over the edge enough that, looking down (pitch about -1.2), the hole fills most of the frame and its near wall drops away under them. They do not fall in, unless the hole already has a floor meant to be reached; they never fall through the world or get stuck. The camera's near plane does not cut into the rim.

And when they look down, there should be something to see: murky depths, not a flat black polygon or the world's underside. Where a hole's inside is bare or broken when seen from its lip, give it the cheapest thing that makes it a depth: darkening with depth, fog, a wet glint, a far floor. Say what each hole got. Nothing grand: one small thing a hole, and none where it already reads.

## Shared files

Another agent (A0) is adding a key and a touch button to the input side of `src/controls.js` right now. Keep your edits there to the collision and movement side, and small; if a hole's stop lives in its own module, fix it there.

## Pace rules that bind you

One headless browser at a time; `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...` call; no `--trace`. Your port is **8162**. Your worktree is `.claude/worktrees/issue-1001-edges`; work only there, and `git merge origin/next` before you start (the worktree is cut from `main`).

## Done when

- A table in your report and in the commit message: each hole, what stopped the walker, how close they get now.
- Before and after renders in `shots/wip/` for each hole, from the nearest standing point looking down: `edges-<hole>-before.png`, `edges-<hole>-after.png`. Look at each; a black frame is not a depth.
- A row or a small test (`tools/edges-test.mjs`, with a `run edges` line in `tools/suite.sh`, tried with `ONLY=edges tools/suite.sh 8162`) that walks a scripted walker at each lip from outside and asserts they reach within the distance you state, do not pass it, and are never below the hole's floor or the terrain.
- `walk-test`, `hop-test`, `stair-test`, `paths-test`, `touch-test`, `perf-test`, `loading-test` and `build-artifact` pass on your port; say the counts.

Finish as the `world-code` skill's Hand-back says. Report in under 250 words: the table, the commands and counts, the render paths, a URL (position, yaw, pitch) at the best lip for the owner to try, anything surprising, any default you took.
