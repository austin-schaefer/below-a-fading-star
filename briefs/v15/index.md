# v15, the Lappet: dispatch plan

The milestone doc is `plans/wilderness-v15.md`. Briefs are written in full only for the next batch. Shared rules: `_common.md`. Reports: `reports/`.

## Batch 1 (out 2026-11-15)

| Brief | Owns | Shared files it may touch |
|---|---|---|
| **V0** the bones: plan, ground, ways | `src/v15/plan.js`, `src/v15/ground.js`, `src/v15/ways/` (stairs, ladder, tube, bridge kit), `src/v15/bones.js`; the Demesne's height hook and yews; clearings | `src/height/*` and the Demesne hook for the terraces; a line or two each in `src/main.js` (MODULES), `src/world.js`, `src/settings.js`, `src/vegetation/ground.js`, `src/v8/clearings.js`, `src/controls.js` only if the ladder needs it |
| **V1** the houses: the kit and one finished row | `src/v15/houses/` (the makers), `src/v15/row.js` (the one row) | one line in `src/main.js` (MODULES); nothing in the height field |
| **H1** the geometry check and the walk (#64) | `tools/geometry-test.mjs`, `tools/route-frames.mjs`, `tools/suite.sh` (one `run` line), the skills' lines on it | fixes it finds in `src/v14/`, `src/v12/` only where F1 does not own them (F1 owns the Pit, the passage and the causeway's end) |
| **F1** the faults after v14 (#59 #60 #61 #63) | `src/v14/` (the Pit, the passage), the causeway's east end, the Span's stairs as ascents | `tools/roads-test.mjs` |

V0 and V1 meet only at `src/v15/plan.js`: V0 writes it and pushes it first (within its first hour); until then V1 builds its row on the bench as it stands today (y 3.1, about r 70 on bearing 20 from the keep), which V0 keeps.

## Batch 2 (after V0 and V1 are judged): the four quarters, one agent each

- **Q1 the Quarrels** (crown): the masons' yard in the keep's fallen corner, the new house half built, the upper square, the Heliarch stair's head and the aqueduct stub.
- **Q2 the Rungs** (scarp): the stacked houses on the three steps, roofs as yards, ladders, the bridge, the three stairs of three ages side by side, the tube lane.
- **Q3 the Lees** (bench): the main square, the fountain of noon, the shops in the undercrofts.
- **Q4 the Pennyworth** (foot): the lower market and gardens, the ha-ha's stair, the lanes round the house, the house's south door.

## Batch 3

- **P1 the people and their stories:** villagers at work, the shops' contents, four or more plain stories with files, the merchant's route brought through the village.
- **P2 light and sound:** lamps, lit windows, smoke, the gutter and after dark; the village's bed and cues (`sound-design`).
- **P3 names, cards, the map, the far view** (from the spawn road and the east kerb), and the budget pass on low.
- Whatever batches 1 and 2 hand back unfixed.

## Then

The critic (with a floor on its time: #64), the curator and the gate together; the release.
