Brief: v17 N1, the crossings, the dressing and the names (after every builder's merge)
Worktree: `.claude/worktrees/issue-1706-dress`, branch `issue-1706-dress`, port 8166. Model: sonnet. Work only there. `briefs/v17/_common.md` first; the builders' reports in `briefs/v17/reports/`; `visual-art/land.md`; `stories/the-meridian-garth.md`, `stories/the-man-at-the-wheel.md`.

Goal. Make the new water belong to the ground round it, and finish the record. The chain is built (W1 the brook and the mere, W2 the leat, U1 the Swallow and the tube, U2 the Garth, S1 the sphere if it landed); this brief tidies where it meets what was there.

Do:

1. **Where people meet the water:** every lead that crosses or ends at the new water crosses on slabs or the bridge and stays on the network (`paths`, `roads`, `walkers-test`); a trod down to the Swallow's ledge from P15 or P38 if a visitor has no way there; the map's and the debug panel's teleports for the Swallow and the Garth (and the sphere), a few entries, not one per corner (issue #70).
2. **The claims and the cover:** the brook's and the leat's banks and the mere's shore claimed against trees and boulders (`src/claims.js`, from `src/v17/plan.js`); reeds and wet cover on the margins (`floorCharacter`'s `wet`, or the reeds' test on `waterShore`), none standing in running water or on dry slope; the bulrushes the v16 critic called "could be anywhere" not added.
3. **The names:** three to five a visitor meets (the plan proposes the Slake for the mere, the Swallow for the portal, the Meridian Garth for the hall, and a name for the sphere; the brook and the leat stay unnamed), each a `LANDMARKS` row with its `line` empty and a card where it is met; `briefs/v17/reports/v17-names-for-the-owner.md`: one short table (name; what it is in a plain sentence; a `?pos=` link; what the word means; card or map entry, so wanting a quotation; any rename with the old name), as `orchestrator`'s "Working with the owner" says.
4. **The record:** the two story files' State and Beats true to what was built (and what falls short); `stories/README.md`'s rows.

Done when: `ONLY=paths,roads,threads,regions,rocks,dressing,settings,outline` and `walkers-test` with counts; the views `walk-brook-traveller`, `walk-mere-north`, `walk-leat-crossing`, `walk-swallow-front` at medium (`v17-N1-<view>.png`) with no tree, rock or reed in the water or across a way; the names list pushed.

What the owner can see: the settings panel's map, the new entries.

Finish and report as `_common.md` says.
