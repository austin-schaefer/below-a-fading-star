# Brief v14-B4: stands that face a wall

Worktree `.claude/worktrees/issue-1412-stands`, branch `issue-1412-stands`, port 8164. Work only there. Read `briefs/v14/_common.md` first and do what it says.

The settings map (the gear) carries a visitor to every named place (`src/settings.js`'s place list and `teleport`, `src/world.js` LANDMARKS' `at`). Several stands put them down facing a wall, the grass or the dark, so arriving shows nothing: v12's critic said so ("Go-to stands face walls") and the orchestrator met it again on 2026-11-15 making pictures of the eighteen newly named places: **the Escalade** (black: a wall among trees), **the Tocsin** (the bell half out of frame, dim), **the Cols of Prime, Sext and Compline** (looking down at grass, the pass not in view).

- `FP_BASE=http://localhost:8164 node tools/goto-views.mjs > shots/wip/goto-views-b4.json`, then `node tools/views.mjs shots/wip/goto-views-b4.json shots/wip b4-before medium` renders every stand (82 of them; one load). Look at every picture. A stand passes when the thing the place is named for is in the frame, lit enough to read, and takes up a fair part of it; and the visitor stands on a floor, clear of colliders.
- Fix each that fails by moving the stand or its facing (and pitch, if the list carries one), not the place. Rerender (`b4-after`) and look again.
- Add a check to `tools/settings-test.mjs` that can fail on the kind: for every stand, the place's own centre (or its `at`) is within the view's horizontal field and not behind a collider within 3 m of the eye. Keep it cheap (no renders in the test).
- Another agent adds stands under the ground (the Coffin Road, a chamber, the Pit's floor): leave any stand with a `y` below the terrain alone.

Done when: the before and after sheets (make contact sheets, 3 by 3) and a list of which stands changed and why; `ONLY=settings,roads,walk tools/suite.sh 8164` with counts.
