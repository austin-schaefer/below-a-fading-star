# F3, the Lower Beds: report (`issue-1803-beds`)

## What is built

`src/v18/beds.js` (world module `beds`, `?beds=0`), with its parts in `src/v18/beds/`. All the numbers are in `BEDS` (`src/v18/plan.js`, F3's rows).

- **The door** at (-251, 172), facing the spur's end. It is a pale dressed block set into the south-west rise, with pilasters, a cornice, a pediment and a worn blank cartouche. Damp streaks run down it. A great tree stands on the bank over it, and its roots run down over the block to the forecourt's wing walls. The bronze leaf stands 68 degrees open. Foxfire grows on two rotten root-stubs at the door's foot, with one faint green PointLight. The ground over the forecourt and the doorway is opened by a new kit, `openBox` (`ground.js`; runtime.md, v18). It cuts the terrain's triangles clean to a box and redraws the remainder in the terrain's own material, so the ground has no ragged cell.
- **The stair** goes 22 treads west under a stepped ceiling, to a landing. Eight steps then lead north into the vault.
- **The vault** is a low barrel vault (spring 1.7 m, crown 3.0 m) with ribs. It holds six tombs in `LIKENESSES` order:
  - the west row, south to north: fan, sword, hoop;
  - the east row: cup, pair, hawk.

  Each lid is an effigy with its prop made big. Each lid is split across, its foot half sunk. A pale root about as thick as an arm comes down out of the barrel into each crack, tinted with one of the panes' colours.
- **The way under** runs 33 m (not 45) on an S-bend, so neither end is seen from the other. It has plank lagging, iron columns with capitals and T-bars, and the six roots along its roof.
- **The chamber** (-265, 126) is round, r 4.5, with an east bay out to F2's grate (-258, 126) and a shaft up to y -3.25. Overhead are seven tub bowls on F2's numbers, with root masses hanging from six of them. Coloured light falls through the grate in bars. The seventh tomb, open and empty, sits under the sprout's tub. Its lid leans half carved, with chips, a chisel and a mallet beside it, and a can stands on the rim. A thin root has just reached the tomb's floor.
- **Cost and the seal.** Seven draws, plus one for the ground cut over the grate. The vault, the way and the chamber are sealed; the stair is not (the door is seen up it). The uncapped colliders over the rooms are capped. The card "The Lower Beds" (an empty `line`) shows in the vault.

## Tests (port 8183)

- **`ONLY=edges,geometry,heights,walk,seams,gutter,dressing,strata,threads,perf tools/suite.sh 8183`:**
  - dressing 22, threads 25, strata 8, walk 13, heights 213 (the ascent `beds` included), seams 3, perf 29, gutter 29.
  - edges and geometry failed once, on a bay pilaster in the seventh tomb's plinth. After the fix: edges 247 PASS 0 FAIL; geometry `v18-beds` 17/0. Rerun `ONLY=edges,geometry`: edges 247 PASS, geometry 149 PASS, 0 failed.
- **`tools/beds-walk.mjs`:**
  - medium, both ways: PASS (47 frames);
  - low, both ways: PASS (46 frames). An earlier low run, without the pointer captured, steered wide over the bank and was counted off the floor. The tool now counts only underground.
- **The geometry baseline** holds 5 groups of rocks.js's own stones on the ground over the way, with that reason.

## Frames

These are in `shots/wip/`, in order:

1. `v18-F3-before-door15.png`, `v18-F3-r3-door15.png`, `v18-F3-r2-door6.png`
2. `v18-F3-r4-perf-stair.png`
3. `v18-F3-r5-vault-in.png`, `v18-F3-r1-vault.png`
4. `v18-F3-r4-lid1..5.png`, `v18-F3-r5-lid6.png`
5. `v18-F3-r6-way-mid.png`
6. `v18-F3-r6-chamberin.png`, `v18-F3-r3-grateup.png`
7. `v18-F3-r5-phone-door.png`, `v18-F3-r5-phone-vault.png`
8. The walk: `beds-walk-r4-low-*`
9. The route sheet: `v18-F3-route-v18-beds-medium-sheet.png`

## Blind readers (sonnet)

- **The lids:** fan, sword, hoop, cup, two figures, and a bird or figure on a raised arm. That is four or more props named. It called the props held aloft "floating" and the figures "blocky mannequins".
- **The route:** it read the place as "a crypt, two rows of slabs with reclining figures", then a long pillared corridor, then a round chamber with a kettle on a slab. It found no see-through holes. Its "frame split in two" at m004.4 is the doorway's jamb seen close.
- **The roots:** it read them as a "silk canopy". They are now spread apart and thinner, with less glow (`r6-way-mid`), and still read as smooth tubes.

## Weak

- The roots are smooth and pale, and in the chamber the thick ones hang like great arms.
- The effigies are blocky, with no faces.
- The way is 33 m, not 45.
- The chamber's ceiling is under only about 0.6 m of ground until F2's level court (-3.2) is in.
- Perf (draw calls on low): vault 143–145, chamber 183, way 133, against the Laid Sun's 182–185. The stair looking out is 351, the same as the doorstep looking east (the wood).

## Defaults and notes for merge

- F2's roots go 2.4 m below its floor. They will meet my chamber's air below -4.8; the seal hides them, but geometry may flag them after the merge.
- `rocks.js` gets one condition, for pebbles off the door's claim.
- `claims.js` gets two rows.
