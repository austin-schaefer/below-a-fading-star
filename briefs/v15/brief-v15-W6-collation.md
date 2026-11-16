# Brief v15-W6: the Collation's table stands level again

Worktree `.claude/worktrees/issue-1533-collation`, branch `issue-1533-collation`, port 8175. Work only there. Read `briefs/v15/_common.md` first, then `briefs/v15/reports/issue-1529-seams.md`.

## What happened

v15-W5 replaced Medlar Close's terraces in `src/height/field.js` (hard `floor()` steps of 0.84 m that the mesh drew as a slope, so the walker jumped) with a continuous wave. That fixed the owner's complaint and is kept. But the Collation (`src/v5/dressing/collation.js`: an 11 m table laid for twelve at (141, -66), angle -0.4) stood on one of those flat terraces, and `dressing-test` now fails on `next`: "fall 0.56 m" along the table where it must be level. W5 did not run `dressing`; the orchestrator merged without it.

## Goal

The table, its chairs, plates and the fallen chair stand on level ground again, with no step a walker can feel anywhere round it. A level pad in the height field under the Collation's footprint (its length plus the chairs, about 13 by 4 m on its axis), eased into the wave over a few metres on every side with a smooth blend (no `floor()`, no discontinuity in height or a sharp one in slope: `seams-test` must stay green and `tools/dip-walk.mjs` at the owner's dip must still show no jump). Then look for the same kind: anything else in Medlar Close or the Pomegranate House's gardens that was built for a flat terrace and now stands on a slope (a bench, a bed, a stall, a wall's foot, the house's own steps, the gate): render the close from four stands and from above, list what tilts or floats or is buried, and give each a pad or re-seat it on the drawn ground. Do not bring the steps back.

Shared terrain: keep the change in `src/height/field.js` to the pad(s). Others at work: W3 (`src/controls.js`), X2 (the peafowl, the new house's arch), G1 (the geometry test, `src/claims.js`).

## Done when

`ONLY=dressing,seams,geometry,house,village,village-plan,heights,walk,regions,paths tools/suite.sh 8175` green with counts; before/after frames of the table from 6 m along its length and across it, and of anything else you re-seated; the dip-walk trace unchanged. Report `briefs/v15/reports/issue-1533-collation.md`; hand back in under 120 words.
