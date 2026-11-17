# v15-W7: the crown's ways (issue-1536-crown-ways)

The cold critic's two blockers: from the keep's end a walker steps off the crown without meeting the stair's head, and
coming back up walks into blank stone because each flight's foot hides behind its own cheek. Branch
`issue-1536-crown-ways`, port 8180.

## The critic's places, reproduced first

On `24585c3` (the tree before this branch), on the keys with the pointer captured (the critic's own driver,
`shots/wip/v15-W7-before-walk-*`):

1. **Off the crown (58, -6) at yaw 0.2.** Walked straight off the rim beside the rim's ladder and dropped 4 m onto
   the High Rung (`before-walk-002`, `003`, `005`).
2. **(59.5, -11.7) and 3. the ladder at (57.2, -12.7).** Coming along the riser to the ladder and standing beside it
   facing the wall, nothing takes hold: the take was a 0.8 m circle in front of the rungs, and the critic stood 0.84 m
   off, a hand behind and beside the poles. Head on, it climbs (`before-walk-006`, `007`). The frame at its foot was
   flat violet: the rungs against bare stone darker than them (`006`).
4. **(74, -8.3), the head's bastion.** Coming up the upper flight on the spine's axis, the causeway ends 5 m on at the
   bastion's 4 m face; the two head flights rise either side behind their cheeks (`before-walk-012`, `014`). The west
   flight is plain from (66, -12.5) at yaw -2.27, and walking at it puts you on its cheek (`015`, `017`).

## What changed, in the kit

- `ways/stairs.js stoneFlight`: the cheek and its newel stop where the treads are `open` (1.0 m) over the floor
  below; the open treads splay `flare` (0.5 m) past the cheek's line on each cheeked side (their own blocks, a finger
  under the treads), and the flight's floor and its side walls go out with them. Every stone flight obeys: the head's
  twin flights, the upper flight, the foot flight.
- `ways/index.js`: `P.RIM`, the crown's kerb. Elder kerb blocks (the High Rung's, unbroken, 0.76 m) along the rim
  wherever the drop is over 1.2 m and no way goes down, walled by one capsule a run. Gaps: the rim's ladder
  (a metre either side) and the stair's head, framed by two lamp posts. It stops for the three heads on the brink and
  the copyist. The head's far kerb is 0.75 m and walled (at 0.3 m a walker on the line kept on over it and dropped 4 m).
- `ways/ladder.js`: taken hold of from in front of the rungs (0.8 m), beside them (0.95 m either side, a firmer push
  past 0.6) or in behind them against the wall; from the top, anywhere in its kerb's gap (`gap`). `lime: true`
  limewashes the wall behind it (laid on the riser's batter, holding a little light as the houses' limewash does).
- `plan.js`: `SPINE.arrive` (the critic's start, the keep's end); `RIM`; `QUARRELS.brink`, the square's hexagons run
  west along the brink inside the kerb to where the crown is come onto; lamps: two posts framing the head's gap, the
  ladder's head, a bracket on the rim over the head's west foot, a post past its east foot, a bracket on the bastion's
  face, brackets on the Rungs' end walls over the upper flight's foot and the timber patch's foot (8 lamps more, one
  draw as before, no point light); `stair-foot-post` moved 0.3 m off the foot flight's splay.
- **The Brow House stands 1.4 m further in** (`plan.js`, quarrels-house-2, D -7.5 to -8.9). Its doorstep was 0.5 m
  from a 4 m drop; with the kerb along the brink before it, the `door` row found it shut in. Now a walker's way runs
  between its door and the kerb.

## The rows (`tools/ways-test.mjs`)

A walker driven on the controls' own update, W held and the look steered, nothing teleported once placed:

- `seen`: from points on the level 4 and 7 m out at 45, 90 and 135 degrees either side of each way's foot, a ray from
  the eye to the first tread (anywhere across the way) is not stopped by anything drawn within 2.4 m of the way's line
  (not a house the view is behind).
- `walked`: from each end's points where the tread is seen, steered at it and then along the way, the walker comes out
  at the other end. Held up by the ways' kit near its line is a fault; by another module's wall or post (a house corner,
  a chimney, the Last Arch's pier) a note.
- `ladder`: every climbable ladder anywhere is taken when walked into from 3 m (straight, 35 and 70 degrees off) and
  when pushed into from beside its foot or in behind it.
- `crown`: from `SPINE.arrive` at every yaw within 40 degrees of the stair head (9 rows) and the critic's own line, no
  drop over 1.2 m before the head; and walked straight at the rim from 3 m in, every 1.5 m along both runs, nobody goes
  over but onto the ladder.

**Before** (the final test run against `origin/next` at `e0aeb8a`, with only `SPINE.arrive` added to its plan): 269
passed, 12 failed. The critic's places are among them:
- crown: from the keep's end at -10, +20, +30 and +40 degrees the walker fell 3 to 15.5 m; the rim of run 1 lets a
  walker over at 15 points, among them s 15.0 by the ladder (the critic's line), and the rim of run 2 at 9.
- ladder: rungs-ladder, pushed into from beside its foot at (57.3, -12.6) (the critic's spot, to 0.1 m) and from the
  other side, is never taken. new-house-ladder and strake-new-ladder fail the same way.
- seen: the head's west and east feet from 90 and 135 degrees on the causeway side, from (73.8, -11.8) and (74.7, -11.5),
  the bastion's front where the critic stood at (74, -8.3): each is hidden by its own cheek. The foot flight's foot from
  the Lees' street, east (87.7, -26.4), is hidden by its cheek.
- The critic's own line (yaw 0.2) passes on the old tree in the simulation: the driven walker happens to step into the
  ladder's 1.2 m gap and is taken down it. On the keys in a real browser it fell beside the ladder
  (`before-walk-003` to `005`). The rim row is the one that catches it.

While the rows were being made, they first failed on things that were not faults, and were changed:
- a ladder outside the village was never ticked in the drive;
- "fell" was counted for walking down a flight;
- a house the view stood behind was counted as the way's wall;
- a chimney or a house corner on the straight line from the view stopped the walker.

**After:** `ways: 281 passed, 0 failed`.

## Tests

`ONLY=ways,village,village-plan,geometry,roads,walk,hop,edges,seams,heights,perf tools/suite.sh 8180` (with
`SHOT_ANGLE=metal nice -n 10`): 11 tests, 0 failed. The PASS lines: roads 64, village-plan 7, village 687, ways 281,
walk 13, hop 25, edges 214, heights 203, seams 3, geometry 137, perf 29.

- The first run failed `geometry` and `seams`. The coplanar faces at every stone flight were the splay's and the
  newel's undersides, now offset. The peafowl were buried in the kerb and now perch on it. A kerb block floated at the
  east run's end and now follows the ground.
- Two findings of the Brow House's own are under the crown's floor and unseen, so they went into the baseline with
  their reason (`shots/wip/v15-W7-geom-brow.png`). One baseline entry was lowered: the bones seen over the brink are
  behind the kerb now.
- `seams` off went from 343 to 344: a 0.9 m dip of the coarse ground mesh at (45.25, -13). It is the same on `next`
  (`SEAMS_PROBE` on both trees) and is counted on its own since the Brow House moved. The ceiling is raised; the dip
  is not fixed.
- **hop's "the walker's update stays cheap":** before, 0.275 ms with 6551 colliders (on `24585c3`); after, 0.163 ms
  with 6560 (both runs on this machine; the number is noisy, and the kerb adds 9 colliders).
- `ways-plan`: before `shots/wip/v15-W7-plan-before.png`, `-before-core.png`; after `-after.png`, `-after-core.png`.
  The kerb is the black line along the crown's rim, with its gaps at the ladder and the head.

## The walk, redone

On the keys with the pointer captured, no map, the critic's own driver (`shots/wip/v15-W7-walk-NNN-*`, in order):

- **001-003** the critic's line at yaw 0.2. The kerb stops the walker, who slides into the ladder's gap and is taken
  down the ladder; no fall.
- **004-009** down the ladder and back up it. In 005 the ladder stands on its limewash.
- **010-016** from the keep's end along the brink. In 010 the walker is held by the keep's fallen face; steering left
  finds the hexagon tongue along the kerb. In 014 the head's two posts are lit ahead.
- **017** on the head's bastion. **018-020** down the west flight; its foot's lamp is seen below.
- **021-023** along the causeway to the upper flight's head.
- **024-031** down the spine, ending against the house's turret (031, the owner's call).
- **032-039** east and down the ramp. In 036 the walker is held by a lamp post beside the ramp's head.
- **040-043** the Slip and the Thumbway to the south door.
- **044-045** back. In 045 there is a wrong turn into the market stalls; that was my dead reckoning, not the geometry.
- **049-052** up the ramp. **053-054** the foot flight seen from the Lees' street: splayed and lit.
- **055-060** up the flight: timber patch, upper flight. In 059 and 060 the walker meets the bastion's face.
- **061-062** backing off and looking west. **063-064** along the cheek to the splayed west foot and its lamp.
  **065-066** up to the head between its posts.
- **Re-take after the bastion's lamp:** `v15-W7-walk-retake-001` to `005`.

## Still awkward

- **The bastion, coming up the spine's axis.** The upper flight lets out 5 m before a 4 m face, and walking straight on
  still ends nose to stone (`walk-059`, `060`, `retake-002`). The two head flights rise either side behind their
  cheeks, and their feet are 6 m off to the sides, at about 60 degrees from the axis. The lamps at both feet and on
  the bastion are seen once you turn (`retake-005`), not before. A visitor has to stop and look left or right. The cure
  is the head's form (a single flight on the axis, or feet turned to face the causeway), and I did not attempt it.
- From before the bastion the splay is seen, but not well: the upper half of each cheek still hides the flight.
- At the keep's end itself, (58, -6) to the brink path, the keep's fallen face holds a walker who heads straight at the
  head (010); they must bear left onto the paving.
- The rim's ladder takes anyone who walks into its 2 m gap from the crown: by design, but it is a ride down, not a stop.
- The `walked` row's simple steering excuses hold-ups by other modules' walls: the chimney on rungs-mid-1's roof yard,
  rungs-mid-7's house corner, the Tenter's post and the Last Arch's pier (notes in the row). The houses' own front
  stairs are not in the kit and keep their own form.
- The ladder takes no `E`; walking into it is the way.
