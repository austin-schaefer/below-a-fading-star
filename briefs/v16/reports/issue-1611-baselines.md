# issue-1611-baselines: the four red tests on next, and threads

Main (`290a9d0`) served beside the branch on 8191 from a scratch worktree, as the reference for every judgement; ground
compared with `heightAt` in node at every new finding (main against this branch).

## geometry

All new findings were judged by kind, mesh and position against main. The cause of nearly all: v16's floor, pools
and fen (`WATER.fen` r 80 to 90, new slopes and heights) change which spots the scatter's `findSpot` rejects, so every
later draw moves. Ruins, rocks and heather now stand elsewhere on ground that has not changed.

- **Fixed (b), 1:** an ashlar at the Strake (48.4, -47.6) hung 1 m in the air against a terrace's retaining wall.
  The structures' 3 m grid ground (`groundAt`) lies over the real ground at a riser's foot. `put()` in
  `src/structures/scatter.js` now drops a piece where the grid ground and `heightAt` differ by more than 0.35 m. It drops
  the piece after its draws, so nothing else moves. Frames, from the same stands:
  `shots/wip/v16-1611-geom-before2-strake-ashlar-low.png` and `v16-1611-geom-after-strake-ashlar-low.png`.
- **Recorded (a), 19 new across 8 places:**
  - v12-stair 3: two scattered foundation walls, bedded into the slope by design. One buried tread, whose position is
    the same on main.
  - v12-lift-lower 4: dead heather floating, and a pebble sunk.
  - v12-icefall 6: a pebble floating, and five terrain backs that moved a metre.
  - house 2: taverna backs, seen from stands that moved.
  - Pennyworth market and foot, 2: the same two ashlars, each half bedded.
  - Pennyworth skirts 1: an ashlar.
  - Pennyworth hitch 1: a pebble.
- **No longer found, lowered:** 35 findings in 9 places.
- **Reasons:** each new group's reason is in `tools/geometry-baseline.json`.

## seams

A scan of `heightAt` and `floorLift` every 0.25 m found three steps that v16 introduced:

- **The fen ring.** `fenProt` in `floor.js` reads the fen edge's sd out to 72 m, but the outline is exact only to 48 m.
  Past that it returns a lower bound, so the lift stepped by up to 0.8 m on a ring at r 130. This is where the ten worst
  seams were, at (155-160, 62-67). Fix: `FEN_EDGE` `far: 72`.
- **The Saltings cliff.** The Saltings' hard switch at 30 m from the fen's edge left a 1 m cliff, 64 m long, at x
  164-177. The switch is now eased in over 8 m.
- **The channel bend.** The meltwater channel had a 0.3 m step at its bend. The cut is now the deepest of the
  segments' faded cuts.

After the fixes, `floorLift` has no jump anywhere.

Recorded ceiling: seam 63 (was 64), off 414 (was 344), ghost 226. The causes of the new `off` clusters:

- 70 are Medlar Close's terraces, where the lift packs the riser lips closer than medium's mesh draws (0.15 to 0.25 m).
- 12 are of the same kind on the keep's lifted skirt.
- 5 are at V1's head flight (72, -6). The rim's opening is 0.1 m wider than the flight, under the flight's cheeks, and
  no face is missing in the frames (`shots/wip/v16-1611-seam-head-*`).

The steps that `heightAt` has and main does not are the fen fringe's dug pools (L3, outside the seams box). They are
left as L3 drew them.

## threads (added by the orchestrator)

- **The shrine was not built.** The Wayside Shrine is pinned to its landmark only on a slope under 0.3. The first
  whaleback tilts its spot to 0.31 (0.16 with `?floor=v15`), so no shrine was built and the hoard hung over empty
  ground. The pinned spot now takes `pinSlope: 0.4`, and the shrine follows the ground. Protecting the site in the mask
  was rejected: it would have reached the west kettle's pool. Frame: `shots/wip/v16-1611-threads-after-shrine.png`.
- **The chair's third mark was under the fen's water as drawn**, after L5 bent P14. It is moved beside P14's new bend.
- **Other landmarks:** each was checked for the same kind of fault. The shrine was the only pin that failed.

## walkers and canyon (not in `suite.sh`)

- **canyon:** main passes 13 of 13; this branch had 12. The `?reach=0` row first fails at merge `7610b40`, the edge
  merged into the fen, found by a first-parent bisect over `origin/main..origin/next`. The difference is rounding:
  ~295 scattered single pixels, 3 of them at 6 or 7, against 259 pixels at a maximum of 4 on main. The row now holds
  at most 8 pixels over 4 levels and none over 12, with the 0.2% count ceiling unchanged. Now 13 of 13.
- **walkers:** main has 19 of 20; this branch had 18.
  - "He holds 10 ± 2 m ahead" (p05 6.62): the tarn's new edge drowned P2's end, and the line, drawn dry, kinked at
    the shore. P2 gets new waypoints that stay 0.4 m dry. Now 19 of 20.
  - The light-slots row (the Pit's nine lamps on P12, from v14) is red on main too. It is left as it is.

## rocks (red in the final run)

On high the run counted 11 boulders on the grazed common, against a limit of 10. The cause is the keep's tor at
(90, 60). The tors draw from the same stream as the scattered rocks, after all of them, so every change to the ground
upstream reshapes them. This tor had four boulders on main, one on next, and seven on this branch. Each tor now draws
from its own stream, `ctx.makeRng(4100 + i)`. Result: 38 PASS, with 5 boulders on the common on both low and high.

## Commands and counts

The runs that the counts in this section come from:

- `geometry`: 134 PASS.
- `seams`: 3 of 3.
- `threads`: 25 of 25.
- `canyon`: 13 of 13.
- `walkers`: 19 of 20.

Each was run as `SHOT_ANGLE=metal nice -n 10 node tools/<test>.mjs http://localhost:8169`. The final run was `ONLY=geometry,seams,threads,roads,rocks,paths,regions,outline,dressing,strata tools/suite.sh 8169`,
with 0 failed:

| Test | PASS |
|---|---|
| dressing | 22 |
| threads | 25 |
| paths | 86 |
| roads | 64 |
| outline | 55 |
| regions | 56 |
| strata | 8 |
| rocks | 38 |
| seams | 3 |
| geometry | 134 |

`walkers` and `canyon` are not in `suite.sh`, so `ONLY=` skips them. They were run on their own after the final run:
`walkers` 19 of 20 (the Pit's light-slots row, red on main) and `canyon` 13 of 13.
