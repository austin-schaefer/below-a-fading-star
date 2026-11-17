# v16: The valley floor gets a shape

Opened 2026-11-16, 23:05 PST, by the orchestrator on an autonomous run. The owner's words at the start of the run: "Pick a new milestone (or two?) off the backlog, plus maybe some performance/bugfixes. You are the orchestrator, and this is your repo. Exercise your own best judgment!"

## What was chosen, and why

**The owner's #73**, the first of their four notes on the land (#73 the floor, #74 the water, #75 the ice, #33 the wall's foot). v15 was reach (a village); this is depth: it makes what exists hold up when seen from the heights v11 to v15 let a visitor climb to. It is also the one of the four the others stand on: "every placed thing rides on the floor, and it is cheapest to move before more is put on it". With it ride:

- **#78, the sun's gutter** (the owner, 2026-11-16): it comes too early, and most of the world built since v4 ignores it.
- **Performance and faults**: the walk's cost after the village, and what v15 left open (the spine's head, the critic's list).

**Passed over for now:** #74 (the water runs downhill; wants this milestone's low west and south, and is the natural next one), #75 (the ice; uses the edge this milestone makes), #18 the forest, #62 the underground hub, #56 the sky, #30 the way out, #72 a controller, #23 music, #70 the teleport menu, #22 traffic counting. W3 (the open edges at the pits, `issue-1527-edges`) stays paused: it changes how the walker meets the ground, and the ground moves in this milestone; it is taken up again once the floor is in.

## What a visitor should notice

- From the Lonely Staircase, the icefall, the Span or the keep, the floor reads as ground that water and weather made: it falls to the west and south where the water lies and stands higher in the north and east, with swells and hollows between.
- Lees Tarn has a shore: bays, points, a shallows, not a circle. The fen likewise. No natural thing seen from above has a ruled outline.
- They are let alone for a minute or two, and then the sun gutters, and the whole valley answers: the village's lamps, the folk, the creatures, the water, the underground, not only the oldest parts.
- The walk is no slower than v15, and on a phone it is faster.

## Done when

1. The fixed views (`tools/views-v16-floor.json`), rendered before and after, show the tilt and the shores; a blind reader shown the after frames from above names no circle, rectangle or ruled line on natural ground.
2. One shared edge (`src/height/outline.js` or as built) is read by the height, the water test, the paint and the placement for the tarn and the fen; the glacier (#75) can take it later.
3. Nothing placed floats or is buried because the floor moved: `geometry`, `strata`, `dressing`, `seams`, `heights`, `village-plan`, `roads` green on `next`; shores judged moving (the owner on water: "a lot of water looks very janky").
4. The first gutter comes 60 to 120 s after "Go out"; a list of what answers it, at least one thing in every region built since v7, each seen in a frame pair (lit, guttered) and heard in the audio harness where it sounds.
5. `perf-test` and the bench no worse than v15 on any tier; the measured gains written here.
6. The whole suite green on `next`; a cold critic's blocking findings fixed; the release note, the README line and picture.

## How it is built

`briefs/v16/index.md`. The floor's briefs are written from a read-only survey of the height field (in flight at opening). The gutter and the performance brief do not touch the height field and start at once.

## Status

**2026-11-16, 23:05 PST. Opened.** v15 is live (`290a9d0`); `next` is one doc commit ahead. Issues #73 and #78 are `in-progress`, `v16`. Two finished worktrees removed (`issue-1534-regressions`, merged; a stray detached one in an old session's scratchpad); `issue-1527-edges` (W3) kept, paused. The repository's interaction limit is `collaborators_only` until 2027-05-12.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S1 the gutter (#78) (`brief-v16-S1-gutter.md`) | `issue-1601-gutter` | 8161 | opus |
| P1 performance (`brief-v16-P1-perf.md`) | `issue-1602-perf` | 8162 | opus |
| (read-only) the height field's survey, for the floor's briefs | none | none | opus |

Next: the survey's report becomes `tools/views-v16-floor.json` (rendered on `next` as the before set), then the floor's briefs (the tilt; the edge and the tarn's shore; the fen and the look from above), two or three agents beside S1 and P1, never more than four with a browser.

**2026-11-16, 23:12 PST. The survey is in; the floor's first two briefs are out. Four agents in flight (the limit).**

- **The survey** (opus, read-only, 7 minutes): the field's order of terms, what reads a fixed height, every ruled outline, a design for the shared edge. Its findings are in the briefs L1 and L2. Worth keeping: the floor already tilts (`-0.012z + 0.006x`, `field.js:353`); a lift that is never negative and zero at the waters cannot make anything float; places to hold still by mask are the keep, Demesne and Lappet, the east box (High Ling to the Hypogeum), the Pit, the fall and river, both Span blocks; the only shader that tests a radius on these outlines is `water/river.js` `uFen`; `heightAt` is 1.6 µs a call with cheap wins in `riverSection` and `project()` (not yet briefed: they change bits, so they go with the re-record).
- **The fixed views:** `tools/views-v16-floor.json`, sixteen; the before set rendering on `next` at medium into `shots/wip/v16-before-*.png`.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| S1 the gutter (#78) | `issue-1601-gutter` | 8161 | opus |
| P1 performance | `issue-1602-perf` | 8162 | opus |
| L1 the tilt (`brief-v16-L1-tilt.md`) | `issue-1603-tilt` | 8163 | opus |
| L2 the edge and the tarn's shore (`brief-v16-L2-edge-tarn.md`) | `issue-1604-edge` | 8164 | opus |

Next: look at the before frames; as each agent reports, its frames with the report shut, its tests run here, a cold review, a blind reader for L1 and L2, then merge. L3 (the fen and the other ruled outlines) is written and dispatched when L2 has pushed the edge and a slot is free. After the floor's merges: one re-record of `seams` and `geometry`, the whole suite on `next`, then W3 and the spine's head against the new floor.

**Waiting on the owner** (carried from v15, none of it blocks): three quotations (#76); the Lees' turret on the main stair's axis; the stray branch `v15-briefs-tmp` on origin.
