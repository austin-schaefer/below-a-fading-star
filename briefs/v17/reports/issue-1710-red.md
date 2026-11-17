# issue-1710-red: the red tests on next after v17's builders

Served on 8170 (this worktree) and, as the reference for every judgement, `origin/main` on 8178 from a scratch worktree
of its own (`.claude/worktrees/scratch-1710`, removed at the end). One browser at a time throughout.

## geometry

- **`v17-swallow`, 44 coplanar in `water-v17-still`: fixed.** The still water is a grid over each still body; the mere
  and the Swallow's cut (a level stream, drawn by the stills' mesh) are both at -6.8, and their two grids overlapped in
  one plane from z 287 to 299. `src/v17/water.js` now joins bodies at one level into one grid (their wet tests or'd,
  their boxes merged). The shader is untouched.
- **5 buried pebbles in the cut: fixed.** `rocks.js` reads the claims only for stones and boulders; pebbles never were.
  The pebbles sat 63 to 75% inside the cut's dug banks (1.3 in 1, 4 at the face), which the drawn ground's 2.1 to 3.1 m
  cells cannot follow. A claim for the cut and its banks (`src/claims.js`, "the Swallow's cut", x -109..-80.5,
  z 288..311.5), and `rocks.js` reads it for pebbles too in that box (after the draws, so no other rock moves). The
  mere's bed needed nothing: `isUnderwater` already clears it.
- **3 backs of the Swallow's masonry: fixed.** (1) and (2): the arch's voussoirs (`swallow/head.js`): each wedge's
  two side faces were turned into the wedge (the hint pointed the wrong way round the arch), and the wedge had no
  soffit, so from the quay under the arch a ray went up into it. The sides now face out into their joints and each wedge
  has its soffit. (3): the plank stair in the tube (`swallow/parts.js`): from the conduit a ray found the 1.2 cm joint
  under a riser and met the back of the board above; each stepped board has an underside 5 cm down. Frames, same stands:
  `shots/wip/v17-1710-before-back{1,2,3}.png`, `v17-1710-after-back{1,3}.png`.
- **The whole tube is under `geometry`.** `v17-swallow` was sealed only to 26 m short of the Garth's door. Sealed to
  the end, the last three stands' rays meet nothing: they run through the open door into the hall, past the place's
  14 m (frame `shots/wip/v17-1710-after-door-sky3.png`: the door and the hall's floor beyond, no hole). The place is now
  sealed to 8 m short of the door; `v17-garth` judges the hall, door included. Backs, coplanar, floating and buried
  were always judged to the end of the route. 0 findings.
- **`v17-sphere` added** (`tools/geometry/places.mjs`): round it at 20 m from its centre, then round its glass at
  16 m, over the hill behind it. It found 82:
  - 52 backs of `sphere-earth`: the earth skin S1 pressed against the glass faced only in; from 1 m outside the glass,
    where the opened ground falls short of the bulging glass, a visitor looked through its back into the sphere. The
    skin is now faced both ways, the outer face 1.5 cm out (0.6k more faces on medium). 3 groups of 2 rays remain, into
    the 1.5 cm between the two faces at the skin's top edge: recorded.
  - pebbles inside the opened ground and on the hill behind the glass: cleared (`rocks.js` reads the sphere's claim for
    pebbles too, in a box round it).
  - the moor's scatter on the east foot (x -295..-301): 15 floating dead-heather tufts, 3 rosettes and a pebble hidden,
    a cushion sunk. The same are found there on main before the sphere: recorded as (a).
  - a 2.8 m stone half bedded south-east of the glass (-310, 3) and a pebble in the adust skin at (-299, 20), outside
    the sphere's claim, not on main's list: recorded, not traced further.
- **`v17-garth`** already had a place: 0 findings.
- **`span-east-stairs` (229, 166):** 0 findings on this branch, alone and in the whole run's order (the place before it
  and after it run as the gate runs them). Not bisected: nothing to bisect on this branch, and my changes do not reach
  (229, 166) (the pebble rows are boxed to the cut and the sphere).

## seams

Run on 8170 (this branch before the merge of A1's sound) and on main: both `ghost 225`, `seam 61`, `off 414` against
the ceiling 63/414/226, 3 of 3 PASS. The ghost 230 in Status (at U1's merge, 06:41) is not on `next` now; no new ghost
to bisect. The ceiling is left where it is (the count moves with the build; lowering it to 225 would ratchet on noise).

## The deck views

`span-deck-brook` stood 15 m back on the deck and framed it. It now leans over the south parapet at the west deck's
broken end (-115, 222.8, the eye held over 57.6 by a carry) and looks south-east down over the brook's line between the
crown's pieces to the mere and the Swallow's portal (`shots/wip/v17-1710-deck3-brook-lean.png`). `span-deck-leat` had
the same fault (the deck and the horizon) and now leans out at (3, 222.8) down the leat's line
(`v17-1710-deck3-leat-lean.png`; the leat is not on `next` yet).

## roads (found by this run)

`every way up with its foot on the ground` failed on `swallow`: the quay's foot (-90.5, 294) is 72.6 m from any track's
end. A trod there is N1's (`brief-v17-N1-dress.md`, item 1). The ascent goes into `FEET_OPEN` with that reason; the
test's next row fails once a track reaches it, which tells N1 to drop it.

## Found red after merging `origin/next` (A1's sound): not fixed here

- **`src/v17/sound.js` throws on every tick in the tube** ("Failed to execute 'setTargetAtTime' on 'AudioParam': The
  provided float value is non-finite", `put` at line 122 from line 275). The tube's hiss is made with `placed(...)`
  directly (line 165), not `mkPlaced`, so `hp.airM` is unset and `put()`'s air lowpass is `exp(-d / undefined)`, NaN.
  The fix is one assignment, `hp.airM = 60;` after that `placed(...)` (or `p.airM ?? 60` in `put`). Not made: this brief
  keeps `sound.js` to its owner. It fails `heights` (no page errors, ascents) and **crashes `geometry` at `v17-swallow`**
  (the page's clock run throws as the walker is stood in the tube), so neither can be green on `next` until it is in.
- **`heights` cost: the Lonely Staircase's top on low, 369 calls against 364** (main 356 at the same station and heading,
  yaw 1.57, west). v17's draws there, by `tools/heights-cost.mjs --only=stair`: the sphere 8 calls (556 m off), the Swallow
  3, the water. Not changed: what to drop from 500 m (the sphere's parts, earth and lip are sub-pixel there, its glass, eye
  and shaft are what read from the spawn) changes what a visitor sees, so it is the orchestrator's call; the triangles
  (2.67M) are inside the bound.

## Commands and counts

RESULTS
