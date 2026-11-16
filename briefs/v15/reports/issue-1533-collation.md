# W6 the Collation (issue-1533-collation): report

## What changed

- `src/height/pads.js` (new, one line in `src/height/field.js` just after Medlar Close's wave): level pads. A pad is a rectangle held at one height with a smoothstep skirt back to the land (C1: no step, no kink). Its height is a plot's `y`, or the mean of the ground under it with no pads, measured once on first use. Pads blend where their skirts overlap (w / (1 - w): inside a pad, its own y), and an `off` rectangle fades a pad out within 3 m of walls it must not move. Documented in `modules.md` (the `height/` row).
- **The Collation**: a pad 13.2 by 4.2 m on the table's axis at 0.92 (the ground's mean there), with a 6 m skirt. Along the table it fell 0.56 m; table, chairs and footprint now fall 0.000. Round the pad the slope (0.42) and the curvature (0.25) are no worse than the land's own.
- **The same kind, looked for.** I compared the plots in Medlar Close's reach on the old treads and on the wave (heightAt at each plot's corners), and rendered the close from four stands and from above, and the Pomegranate House's south side and gate. Two things were built for a flat tread and now stood on a slope: `pennyworth-house-1` (fall 0.23 -> 0.79 m) and `pennyworth-house-2` (0.25 -> 0.93). The other Pennyworth plots in reach already declared a slope on next and stand on footings (`stand`). In the renders, the wicket, the graveyard and the orchard's things sit on their ground (each samples heightAt per part).
  - `pennyworth-house-2`: a pad at its plan floor out to its walls, with a 6 m skirt that fades before the stable. Its slope comes off the plan, so `village-plan-test` holds it to 0.35 m again. Before, the turf climbed its front wall's foot and a footing slab stuck out over the lane; now both meet level ground (frames below).
  - `pennyworth-house-1`: not padded. It stands 2 m from the house's east wall and 1.4 m from the stable, and every pad I tried there either moved the ground under those walls (up to +0.47 m under the stable, which geometry-test flagged) or folded the alley and the lane's bank sharper than medium's 2.1 m cells (seams-test: 18 `off` clusters in the owner's dip). A sweep of margin, skirt and fade, checked against the mesh's own grid, gave 28 to 187 cells over 0.15 m with both houses padded and 0 with house-2 alone. So house-1 now stands the way the round-2 houses do (`stand: true` in `pennyworth.js`): its floor at the ground before its door (-0.09), with an ashlar footing where the ground falls away. Before, it had been dropped 0.5 m to its lowest corner, with the turf over its uphill foot. It declares its 0.8 m fall again.
- `dressing-test`: a new check that the pad is at the table's place and angle, and that the 13 by 4 m under the table and chairs falls under 5 cm.

## Tests

`ONLY=dressing,seams,geometry,house,village,village-plan,heights,walk,regions,paths tools/suite.sh 8175`, after merging `origin/next` with G1: dressing 22, paths 81, village-plan 7, regions 56, village 687, house 20, walk 13, heights 198, seams 3 PASS lines, all ok. Geometry then failed with 2 new findings (see "Geometry and G1"); after the revert, `ONLY=geometry` passed 132, 0 failed.

- seams: off 343 (was 344), ghosts 228 (was 239: the Collation's line of colliders east of the gate now meets its stones), seams 64, owner-dip clean. Ratchet lowered to that with `SEAMS_RECORD=1`.
- `tools/dip-walk.mjs` at the owner's dip with W5's eight points, on low: 0 jumps, 0 hangs, worst one-frame dy 0.065 m (W5's after: 0.048; the worst is at (115.75, -57.4), on house-2's new bank down to the lane). Walked: yes. Trace `shots/wip/v15-W6-dip-trace.json`, frames `v15-W6-dip-001..011`.

## Geometry and G1

Merged `origin/next` with G1's `buried` kind and ran `ONLY=geometry`.

- First version (both houses padded): 3 new findings in `house` (2 backs and 1 coplanar at the stable's south foot, where the skirt had lifted the ground 0.47 m) and 4 gone. I fixed them at the cause by keeping the pads off the house, the stable and the alley between them.
- Second version: 0 new findings, and 2 coplanar gone at the south-east turret's foot (107.5, -57), buried 1 to 8 cm by house-1's skirt. I recorded them with that reason, then reverted the record when house-1 lost its pad. The two findings are back as they were on next (the same pairs).
- Final: 0 new, 0 gone, 0 re-recorded, the baseline as on next.

## Frames (shots/wip/, medium)

- The table: `v15-W6-before-table-across.png` and `v15-W6-after-table-across.png` (6 m across: before, long legs on the near side; after, level and even). Also `-table-across-n`, `-table-above`, and `-table-along` / `-table-end` (6 m off each end; grass fills the near view, the across frames show it).
- House 2: `v15-W6-before-h2-front.png` against `v15-W6-a4-h2-front.png`; `v15-W6-b2-lane.png` against `v15-W6-a4-lane.png` (house-1 stood on its plan floor, house-2's footing slab gone, the washing and the bank steps in place).
- House 1 on its footing: `v15-W6-a4-h1-south.png`, `v15-W6-a4-h1-front.png` (before: `v15-W6-b2-h1-*`).
- The close: `v15-W6-{before,after}-close-{n,e,s,w,above}.png`, `-house-se`, `-house-s`, `-gate-dip`. Nothing else tilted or floated in them.
- The `a3-*` frames show a fault of my own: an edit commented out house-2's OPTS entry, so it was not built. It was caught from those frames and fixed before any test run; read `a4`, not `a3`.

## What is left

- House 1 stands on a footing on its slope rather than on level turf. That is a choice, said above. A pad would need the house's or the stable's ground moved with it.
- A visitor walking the lane meets house-2's new bank as a gentle slope (the worst one-frame dy of the dip walk is 0.065 m there, under a step).
