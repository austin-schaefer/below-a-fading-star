# Brief v15-V0: the bones (the plan, the ground, the ways up and down)

Worktree `.claude/worktrees/issue-1500-bones`, branch `issue-1500-bones`, port 8161. Work only there. Read `briefs/v15/_common.md` first and do what it says; then `plans/wilderness-v15.md` whole (it is the design) and `briefs/v15/index.md`.

## Goal

The hillside between Carcanet Keep and the Pomegranate House becomes the ground a village stands on, and you are the one who decides exactly where everything goes. Uncover the scarp as what the milestone doc says it always was: **an Elder stair nobody alive could climb**, three giant steps of cyclopean block with four-metre risers, running round the hill's north-east sector. Then give it the ways people of four later ages made to get up and down it, each in its own hand. Four agents will build the quarters on your plan next, in parallel, without talking to each other: the plan is how they agree.

Everything a visitor sees of yours should already look like a place and not a grey-box: the Elder steps finished (their masonry, etch, wear, moss, a socket or two for something that is gone), the ways finished. The house plots stay empty ground (paved, earth, a rubble footing) for the quarters to fill.

Not the first idea, and large: the steps are for giants and should feel it from below (a human stair cut into a riser is a slot in a cliff). Something a visitor would walk 200 m to look at and could find in no other game.

## What to build

1. **`src/v15/plan.js`, pushed within your first hour** (V1 is waiting on it; say so in a commit message). Three-free, importable by node tests. The levels (crown y 18, three steps at about y 14, 10, 6, the bench y 3.1, the foot y -0.8: bend the numbers to the ground, keep the idea), each step's outline as a polyline, the lanes, the two squares, the ways between levels, and **named plots** (at least 26: about 14 houses, 7 shops, the new house, the fountain, the tube's line, the stalled carrier-house, the masons' yard), each with a centre, a facing, a footprint, its level, which quarter owns it (`quarrels`, `rungs`, `lees`, `pennyworth`) and which hand it is meant for. Helpers: `levelAt(x, z)`, `plot(name)`, `quarterOf(x, z)`, `villageClear(x, z)`. Render the plan top-down (extend `tools/map.mjs` or a small script) into `shots/wip/v15-plan-*.png` and look at it: is it a village (lanes that bend, a square you arrive in, a long view down the stair to the house) or a grid?
2. **The ground.** The terraces in the height field through the Demesne's hook (cells are 2 to 3 m: the terrain is a ramp under each riser and the riser is built masonry with walkables, never a step in the mesh); the bench and the foot kept; the ha-ha's wall in the sector rebuilt as the lowest riser with a way through. Clear what is in the way, on the owner's word: the yews between bearings 0 and 100, the `demesne-blocks` in the sector (the masons' stock: leave a few stacked at the Quarrels plot), grass, rocks and scatter inside `villageClear`. The Indistinct: first choice it keeps its ditch west of the sector (bearings 300 to 360); say what you did. The causeway, P41, P9, P49, K1 and R3 still arrive somewhere sensible: re-lay what crosses the sector as village lanes and keep `roads-test` and `paths-test` true. Ground colour: paving, trodden earth, not lawn.
3. **The ways** (`src/v15/ways/`), each a kit function the quarters can call again and each used at least once by you:
   - **The Heliarch stair**: straight down the line from the keep's fallen corner toward the house, exact, hexagon landings, broken in the middle step where a Late timber flight patches it.
   - **A Late way** of your own: outside stairs, ramps of rammed earth and plank.
   - **A climbable ladder.** None exists here. The visitor walks into it and holds forward to go up, back or forward off the top to come down; it must work on the touch stick, must not trap, and must be registered as an ascent. Your call how (a steep stacked floor, or a carry as the lift does: `src/v12/lift/`); prove it by doing it in a real browser, both directions, and add it to `heights-test`.
   - **The tube**: a Noonwright daylight main laid down the hill (`ctx.strata.parts.noon`, `src/v14/noon-road.js` for the glass), walked inside for at least 12 m as a covered way between two levels, cracked open where light gets in. Glazed, round, hand-made: never a pipe, never a spaceship (`visual-art/architecture.md`).
   - **A bridge and a roof walk**: the kit only (a plank bridge over a lane, a flat roof with a parapet as a `stack` floor), with one bridge placed.
4. **Views.** Commit `tools/views-v15-village.json`: the far views (start from `/tmp`-free coordinates: (135, 5) looking at (65, -8); the spawn road; the east kerb K1; from the house's roof line; from the crown looking down the stair) and a street-level view at each level and each way. Every later brief renders this list before and after. Render it now as `v15-V0-*`.

## What the survey found (check it, do not trust it)

`plans/wilderness-v15.md`, "How it is built", and: keep centre (37, 31), crown flat at 18 to r 45 to 50; scarp 13 m between r 50 and 65 on bearing 36 (`slopeAt` 0.91 rad: the walker is slowed above 0.55 and pushed back above 0.95); bench y 3.1 at r 67 to 75; ha-ha drop at r 77; house x 82..108, z -58..-32, ground -0.8, gate north at (95, -58). The keep's fallen corner: walkable slab at bearing 30 (r 27 to 44), blocks on bearings 30 to 60 to r 47 (`src/structures/keep.js`). Yews: `src/v4/regions/demesne.js:264-283`. Exclusions: `src/vegetation/ground.js:122-157`, `src/v8/clearings.js`, `env.taken`. Stacked floors and the edge guard: `world-code`, "Floors, corridors and edges". `tools/height-check.mjs` record/check after the height change; `regions-test` counts the Demesne's yews and caps.

## Done when

- On the keys and on the touch stick, from the keep's fallen corner to the house's wall and back, by the stair, by the ladder and by the tube; nowhere to be stuck, no drop over the guard without a parapet, on low, medium and high.
- The plan is the only place a village coordinate lives; `world-code/modules.md` and `runtime.md` say in a few lines how a quarter uses the plan and each way.
- Frames: the view list, plus each way walked a metre at a time on medium (`_common.md`). From below, the steps read as giant and old; from the crown, the line of the stair leads the eye to the house.
- Your share of the budget: 8 draw calls, 70k triangles at low.
- Tests: `ONLY=roads,paths,rocks,regions,walk,hop,edges,heights,settings,perf,loading,strata,house tools/suite.sh 8161`, `tools/height-check.mjs`, and what you add. (The whole suite runs on `next` after the merge: you change the height field.)

Report as `_common.md` says, plus: the plan picture, what you moved from the milestone doc's table and why, and what each quarter's agent most needs to know.
