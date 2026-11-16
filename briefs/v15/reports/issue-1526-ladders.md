# v15-W2 report: a ladder that looks climbable is climbable

Branch `issue-1526-ladders`, port 8165.

## The table

Found by grepping `src/` for ladder, rung, staple, foothold, stile and cleat, and looking at each from where a visitor meets it.

| Ladder | Where | Reads as a way up? | Now | Leads to |
|---|---|---|---|---|
| `rungs-ladder` (`src/v15/ways`) | the High Rung up the rim to the crown, by the Brow House | yes | climbable (as before, now through the shared `climb()`) | the crown |
| `strake-new-ladder` (kit, `newhouse.js`) | the Strake's new house, the masons' scaffold, the Lees' bench | yes: on the flags, leaning on the stage | **made climbable** | the masons' stage (a floor 0.9 m deep with held edges, the mortar board, the work at eye height, the street over the ledger) |
| `new-house-ladder` (kit, `newhouse.js`) | the Unroofed House on the crown | yes | **made climbable** | its stage, the same, with a view out over the moor |
| `stair-lattice-ladder` (`src/v12/stair/top.js`) | the Lonely Staircase's top, the tender's deck | yes: iron rungs up the strut from the deck | **made climbable** | the next node's top, 42 m up (140 m over the moor), cleared of the strut that rose from it; the two members that never fell are walked from it, north and west, to the next nodes |
| stack hut ladder (kit, `elder.js`, the `stack` form) | only on the makers' contact sheet (`?v15=kit`): no plot in the walk uses the stack form | yes | **made climbable** | a 0.9 m ledge before the hut, which now stands back from the brink with a door (a window where the hut is under 1.5 m wide) |
| `pomegranate-ladder` (`src/v8/house/kept.js`) | the Pomegranate House's court, against the south gallery's roof | yes: foot on the court, head at a roof | **made scenery**: laid down along the gallery, the limewash bucket at its foot; its 5 m wall collider removed | |
| the Spilt Measure's (`pennyworth.js`) | | | left alone: none is drawn; the header comment promised one and no longer does | |

Counts: 7 looked at; 5 drawn in the walk (plus the contact sheet's); 3 made climbable in the walk (4 with the sheet's stack hut), 1 already climbable, 1 made scenery, 1 left alone (not drawn).

## What changed

- `src/v15/ways/ladder.js`: `climb(ctx, { name, mod, foot, top, n, head?, back?, from?, away?, perch? })` is the one behaviour (keys and touch, the carry, the ascent, the register); `ladder(K, ...)` draws and calls it. `ladders(ctx)` is the register of every ladder drawn (`ctx.ladders.list`: climbable with `state()`, or scenery with a reason). At the top, where `placeAt`'s 0.6 m clearance does not fit a narrow floor (the stage), the climber is set on the floor at the head directly. The throttle counts the climb's own height (high up it measured from the eye and froze the tick at the lattice's top).
- Houses kit: `climbLadder(B, M, R, foot, top, w, o, { y1, head, away, perch })` records one; `registerAll` climbs it. The new house's stage is a floor; the waiting block stands at its far end only where the stage is long enough to pass it; the ladder's foot collider is a capsule along it.
- The lattice ladder: rungs cranked out round the next node's soffit and up its face, rails hooped over; floors up there; the lamp's round follows the rails and comes over that node's lip.
- The guard: `tools/ways-test.mjs` fails a drawn ladder that is neither climbable (with its ascent) nor scenery with a reason, and a file under `src/` that speaks of a ladder and neither registers one nor is listed as drawing none. A ladder whose head is a place to stand, not a way on (`perch`), is asked no landing or way on. `runtime.md` states the rule and how to register one. `tools/ladder-walk.mjs` climbs every climbable ladder by hand.
- Story: `stories/the-tender-of-the-lattices.md` beat 4a; `stories/the-copyist.md` (he moved).
- The lattice's course is named on arrival: a card, the Tender's Round, `map: false` (no settings-map entry: the owner's #70), no `line` (the owner sources quotations); its row is in `v15-names-for-the-owner.md`. Shared files touched: `src/world.js` (that one line), `src/settings.js` (none in the end), `src/v15/people/folk.js` (the copyist sat in the new house's ladder's mouth: moved to the house's west end), `tools/geometry-baseline.json` (the stair's lattice: 3 coplanar findings gone with the strut). `src/controls.js` untouched.
- The lean-to's lapped sheets at the Croft are laid every other one 4 cm over (seen from the node above, they were coplanar).

## Tests

After merging `origin/next` (9437415): `ONLY=ways,village,village-plan,geometry,walk,hop,edges,heights,house,settings,touch tools/suite.sh 8165`: village 687/0, village-plan 7/0, house 20/20, touch 43/43, walk, hop, edges green; settings, ways, heights and geometry failed there and were fixed and rerun (`ONLY=ways,heights,geometry,settings`, then `ONLY=ways`): settings 86/86, heights 210/210, ways 157/0, geometry 143/1. The one geometry failure: a new `backs` finding in the quarrels mesh at (75.1, 23.5, 18.5), seen from a stand on the crown's ground at (72.1, 3.6), 9 m from anything this branch changed; not traced (first seen after merging next). The whole suite is the orchestrator's: `src/world.js`, `src/settings.js` (net nothing) and `src/v15/people/folk.js` were touched.
Walks: `node tools/village-walk.mjs http://localhost:8165 keys low 0 v15-W2-village`: walked yes, ladder taken 2, 0 errors; `... touch ...`: walked yes, ladder taken 2, 0 errors. `node tools/ladder-walk.mjs http://localhost:8165 keys|touch low v15-W2-ladders-c`: 4 of 4 up and down on each (rerun on keys after the last fixes, `-d`: 4 of 4). Headless Chromium refused the pointer capture on every keys run (the page's drag-to-look fallback steered), as in village-walk.

## Frames

Per ladder, in order (01 start, 02 foot, 03 half up, 04 head, 05 the view from the top, 06 half down, 07 back at the foot): `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1526-ladders/shots/wip/v15-W2-ladders-c-keys-low-<id>-NN-*.png` and `...-c-touch-low-...`, ids `stair-lattice-ladder`, `rungs-ladder`, `strake-new-ladder`, `new-house-ladder`. To look at first: `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1526-ladders/shots/wip/v15-W2-ladders-c-keys-low-stair-lattice-ladder-04-head.png` (the course 140 m up), `...-new-house-ladder-01-start.png`, `...-strake-new-ladder-04-head.png`.
Scenery, before and after: `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1526-ladders/shots/wip/ladders-w2-a-kept.png`, `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1526-ladders/shots/wip/ladders-w2-after-kept.png`, `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1526-ladders/shots/wip/ladders-w2-after-kept-near.png`.

## Still wrong

- The climb up the lattice's 42 m faces dark metal for 28 s; the half-up frame is near black.
- The pointer was never captured headless; every keys frame steered by drag.
- The quarrels `backs` finding above.
- The stack hut ladder lives only on the contact sheet; its door can be left out on a hut under 1.5 m wide (it keeps its window then).
- The tender's lamp still rises out of sight through the lattice above the second node (it now appears over that node's lip).
