# Brief v15-W7: from the keep's end, the way down is found; from below, the way up is seen

Worktree `.claude/worktrees/issue-1536-crown-ways`, branch `issue-1536-crown-ways`, port 8180. Work only there. Read `briefs/v15/_common.md` first, then `briefs/v15/reports/v15-critic.md` (the cold critic, today) and `briefs/v15/reports/issue-1528-landings.md` (W4: the ways' kit, the spine, `tools/ways-plan.mjs`, `tools/landing-walk.mjs`, the `turn`/`door`/`headroom` rows in `tools/ways-test.mjs`). Helpers that read images run on `haiku` or `sonnet`.

## Why

The owner on the village: "AWESOME in each individual element, but lacks a little coherence and navigability". W4 thinned the ways and marked a spine. A cold critic then walked it with no map and found the spine cannot be found at its top or from below. Both are release blockers:

1. **Down.** From the keep's east end, about (58, -6), walking straight out at yaw about 0.2 you step off the crown's edge and drop about 3 m onto the High Rung near (56.6, -13.2). No kerb, no stair, and you never meet the stair head at the top of the hill (the critic's `shots/wip/critic-v15-walk-007/008` in the deploy worktree).
2. **Up.** Coming back it walked into blank stone three times: at (59.5, -11.7); at the ladder at (57.2, -12.7), where the frame fills with flat violet and `E` offers nothing (`walk2-078/080`); and at (74, -8.3) (`walk2-092`). The west flight is plain from (66, -12.5) at yaw -2.27 (`walk3-004`), but walking toward it puts you on its side wall; only a sidestep got it up. "Every flight's foot is hidden behind its own side wall, and no light marks the stairs."

## Goal

- **The arrival from the keep leads to the stair head.** A visitor who comes along the causeway to the keep's end and keeps walking is led, by what is on the ground and what is lit, to the head of the spine: paving that runs to it, a kerb or low wall along the crown's edge where there is a drop and no way (a drawn one, with a collider; the owner dislikes unseen walls, not seen ones), the stair head framed (two posts, a lamp, a gap in the kerb) so it reads from 20 m. They must not be able to walk off the crown by accident on the line from the keep; a deliberate hop over a kerb is fine.
- **Every flight's foot is seen and entered head-on from the level it stands on.** Standing on a tread 8 m either side of a flight's foot, its first steps are visible (not hidden behind its own cheek wall) and walking at what you see takes you up it. Fix it in the kit (`src/v15/ways/stairs.js`: the cheek stops short at the foot or steps down with the treads; the foot widens or turns to face the lane where a flight runs along a wall), then check each flight. A lamp at every foot and head on the spine (the plan's LAMPS, `src/v15/lamps.js`: one draw, no point light), warm, so the spine reads as a chain of lights from the square and from the crown.
- **The ladders say they are ladders.** At each climbable ladder's foot the walker walking into it climbs (`climb()` in `src/v15/ways/ladder.js`); if that needs a key, an offer shows; the frame at its foot must not be flat wall: the ladder is seen against something lighter than it.
- **Guard it** in `tools/ways-test.mjs`: from each end of each way, from points on the level 6 to 8 m either side, a ray to the way's first tread is not blocked by the way's own walls (the foot is seen); a walker steered straight at the visible first tread from there reaches the way's other end; and from (58, -6) walking at every yaw within 40 degrees of the spine's bearing, no drop over 1.2 m is met before the stair head. Say what each row found before your fixes: the critic's four places must be among them.

Not yours: the Lees' turret at the main flight's foot (the owner's call), the Pennyworth ramp, names and cards (another agent, N2, is removing the quarters' cards now), `src/controls.js`. Keep every set piece where it is.

## Done when

The critic's walk redone on the keys with the pointer captured, no map: from (58, -6) to the Pomegranate House and back up, frames in order, with no wrong turn forced by geometry; a before/after `ways-plan`; `ONLY=ways,village,village-plan,geometry,roads,walk,hop,edges,seams,heights,perf tools/suite.sh 8180` green with counts (the walker's per-frame cost is near its budget: `hop`'s "the walker's update stays cheap" row, 0.5 ms; every collider you add counts, so make kerbs few and long, and report the row's number before and after). Report `briefs/v15/reports/issue-1536-crown-ways.md`; hand back in under 150 words.
