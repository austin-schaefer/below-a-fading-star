# Brief v15-W1: the ways put right (stairs, ladders, dead ends)

Worktree `.claude/worktrees/issue-1520-ways`, branch `issue-1520-ways`, port 8165. Work only there. Read `briefs/v15/_common.md` and `_quarter.md` first and do what they say. Helpers that read images run on `haiku` or `sonnet`.

## The owner's words (2026-11-16, walking `next` on the keys)

"village looks quite good! there's some bugginess/goofiness in the stair areas; walls right next to stairs, stairs and ladders right by each other, dead-ends, etc. here are some examples"

Their five screenshots are in the deploy worktree's `shots/wip/owner-v15/` (`2.png`, `3.png`, `4.png`, `6.png`; read them from `/Users/austin/dev/below-a-fading-star/.claude/worktrees/deploy/shots/wip/owner-v15/`). What they show, as the orchestrator reads them (find each place yourself; the URL in the screenshots is the page's start, not where they stood):

- `2.png`: a stone stair's foot squeezed into a slot between its own flank wall, a tan pier with a lamp and a plaster house wall: the way onto it is a gap a person turns sideways for.
- `3.png`: a timber open-tread stair coming down onto a tread strewn with loose blocks, a house door and a post in the same two metres; a dark polygon floats off the plaster wall.
- `4.png`: a stair's head on a roof or tread: a newel and a low wall across the landing, flags and blocks scattered between it and a door; another dark polygon floating off a wall; a blue bar bent round a shutter.
- `6.png`: the upper square: pale flat triangles (heaps) lying against the Elder riser beside a stair's foot, reading as raw polygons.

Four quarters were built at once by four agents on one plan; each made its own ways without seeing the others'. That is the cause. This brief is the pass that makes the ways one system.

## Goal

Every way up or down in the Lappet (every registered ascent, stair, ladder, ramp, roof crossing, lane and passage in `src/v15/`: the bones' ways, the Strake, the four quarters) is one a person would use without thinking: room to walk onto it at both ends, nothing built or dropped in its mouth, it goes somewhere, and it is not doubled by another way two metres off doing the same job.

1. **List them.** From `ctx.ascents`, `src/v15/plan.js` (lanes, plots, `RUNGS`), `src/v15/ways/` and each quarter: every way, its two ends, the levels it joins, who built it. Put the table in your report.
2. **Find the faults by measuring, then by walking.** Write the check first (below), then walk every way on the keys in a real browser with the pointer captured (Playwright), both directions, a frame at each end looking along it and one looking back; read every frame at full size (helpers on a small model may read them: give each the owner's sentence and ask for exactly those faults).
3. **Fix each at its cause:**
   - *A wall, pier, house or prop within a walker's width of a stair's foot, head or flank where it is not the stair's own wall:* move the thing, move the way, or turn the stair; a mouth is at least 1.6 m clear, a landing at least 1.2 m deep.
   - *Two ways within about 6 m joining the same two levels:* keep the better, and give the other a different job (a different level, a roof, a house's own door) or take it out. A ladder beside a stair is only right when the ladder goes somewhere the stair does not.
   - *Dead ends:* a lane, landing, roof or passage a walker can enter and only turn round in: open it to the next way, or end it at something worth arriving at (a door, a view with a rail, a seat, a shop) so it reads as a place, not a mistake.
   - *Litter in the way:* loose blocks, flags and props on a landing or a tread's walked line go to the side.
   - *Floating shapes on walls* (the dark polygons in `3.png` and `4.png`: probably the houses kit's plaster patch or stain standing off the wall, `src/v15/houses/`): fix in the kit so it lies in the wall; check every house in the village.
   - *Raw heaps* (`6.png`): a heap of sand, lime or spoil is rounded, small, and against something that explains it; or it goes.
4. **Guard the kind.** Add rows to `tools/village-test.mjs` (or a small `tools/ways-test.mjs` with a `run` line in `tools/suite.sh`) that fail on: a collider not the way's own within 0.8 m of the middle of a way's mouth at either end; a landing shorter than 1.2 m; two registered ways whose ends are both within 6 m of each other's and join the same levels; a walkable region in the village with one way in and nothing registered at its end (a `place` in the plan counts as something). Say what each row found before your fixes.

The plan (`src/v15/plan.js`) is yours to change where a way moves; keep `village-plan` passing. Keep the quarters' character: this is a pass on how the ways work, not a redesign.

## Done when

- The table, the check's rows red before and green after, and before/after frames of each of the owner's four places and every other fault found.
- Both whole-village walks pass (`tools/village-walk.mjs` keys and touch), and `ROUTE=rungs`, `route=pennyworth`, `tools/lees-walk.mjs`, `tools/quarrels-walk.mjs`.
- `ONLY=village-plan,village,geometry,roads,walk,hop,edges,heights,strata,house,paths,regions,rocks tools/suite.sh 8165` green; never the whole suite.
- Report to `briefs/v15/reports/issue-1520-ways.md`; hand back in under 250 words.
