# Brief v15-W4: a stair's own wall does not shut its landing

Worktree `.claude/worktrees/issue-1528-landings`, branch `issue-1528-landings`, port 8169. Work only there. Read `briefs/v15/_common.md` first, then `briefs/v15/brief-v15-W1-ways.md` and its report (`briefs/v15/reports/issue-1520-ways.md`). Helpers that read images run on `haiku` or `sonnet`.

## The owner's words (2026-11-16, 11:34, after W1 was merged)

"still got walls blocking people from getting from stairs to their own door"

Their screenshot: `/Users/austin/dev/below-a-fading-star/.claude/worktrees/deploy/shots/wip/owner-v15/7.png` (read only; `4.png` beside it is the same place before W1). It shows a Heliarch stone stair arriving at a tread: at the stair's head a newel and a low coursed parapet run on along the landing's side, between the landing and the tread's paving; three metres beyond the parapet is a house's blue door with a lamp, on the same level. A person coming up the stair cannot turn to that door: the stair's own flank wall is in the way.

## Why W1 missed it

`tools/ways-test.mjs` asks for a clear mouth and excludes "the way's own wall" from what may stand in it. So a stair whose own parapet fences its landing off from the level it arrives at passes. The rule was wrong, not only the place.

## Goal

1. **Find the place** in the owner's frame (a Heliarch flight: `heliarch-upper`, `heliarch-head-east` or `-west`, or a quarter's own; the kit is `src/v15/ways/`), stand there in a browser, and reproduce it: from the stair's top step try to walk to that door. Keep the before frame.
2. **The rule:** where a stair, ramp or ladder arrives at a level, its own walls, parapets, newels and rails end at the arrival, or open, on every side where the level goes on: a walker at the head can turn and walk onto the tread in each direction it runs, and reach every door, lane and way on that level within 8 m without leaving and coming back. A parapet stays only on a side with a drop. The same at the foot. Fix it in the ways' kit so every flight obeys (drawn mesh and collider together; a parapet cut short gets a proper end: a newel or a return, not a sawn-off block), then each quarter's own stairs.
3. **Every door is reached.** For every house plot in the plan: from the nearest registered way's end on its level, can a walker reach its door (the plot's declared opening) on foot? List those that cannot and fix each (move the thing in the way, the door, or the way). The owner's phrase is the test: from stairs to their own door.
4. **Guard it:** rows in `tools/ways-test.mjs`: at each end of each way, the walker can step at least 2 m onto the level in each direction the level's walkable runs (a walk-probe with `ctx.controls.floorAt` and the colliders, own walls included); every plot's door is reachable from a way's end on its level (a coarse flood fill over walkable ground and colliders at 0.25 m is enough). Say what each row found before your fixes; zero found is a failure of the row, since the owner's place must be among them.

Other agents: W2 (ladders, `src/v15/ways/ladder.js`, the houses kit's `ladder()`) is finishing; W3 (edges, `src/controls.js`) starts after it. Keep to the ways' stairs and walls, the plan and the quarters' few lines; merge `origin/next` before you start and before your last run.

## Done when

Before/after frames of the owner's place from their stand, and of every other arrival you changed; the door list; the new rows red before, green after; walked on keys with the pointer captured: up the owner's stair and to that door. `ONLY=ways,village,village-plan,geometry,roads,walk,hop,edges,heights,house,strata tools/suite.sh 8169` green; both whole-village walks and `ROUTE=rungs`. Report `briefs/v15/reports/issue-1528-landings.md`; hand back in under 200 words.
