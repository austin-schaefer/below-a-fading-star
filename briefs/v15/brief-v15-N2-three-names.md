# Brief v15-N2: the village has three names

Worktree `.claude/worktrees/issue-1535-three-names`, branch `issue-1535-three-names`, port 8179. Work only there. Read `briefs/v15/_common.md` first.

## The owner's words (2026-11-16, 16:15)

"forty things in #76 is crazy. i don't want to wade thru all that, and the village should have, like, 3–5 named things TOPS"

## Goal

A visitor meets exactly three names in the village: **the Lappet** (the village's own card on arriving), **the Smoking Saint** and **the Fountain of Noon** (a card on arriving at each, and their two entries in the settings map as now). Nothing else in the village is named to a visitor.

- Remove the four quarters' title cards (the Quarrels, the Rungs, the Lees, the Pennyworth): their `LANDMARKS` entries or card records in `src/world.js` / `src/v15/plan.js`, however N1 made them. If the Saint and the Fountain have a map entry but no card, give each a card (level-gated as the quarters' were, so a walker on the tread above does not get it).
- Remove the Tender's Round card at the lattice's lowest course (`src/world.js`, W2's): the owner did not ask for it.
- Find every other place a village name reaches a visitor and take it out: painted shop signs with words, an act's offer text, a debug-free tooltip, the settings panel, a title on a story an act shows. (`grep` the names in `briefs/v15/reports/v15-names-for-the-owner.md` across `src/`.) Names stay as identifiers, comments and the plan's own words: do not rename code. A sign may keep a picture.
- The three keep no `line` until the owner gives one (never write a quotation).
- Fix the tests that count places or cards (`settings-test`, `regions-test`, `village-test`, `village-plan`): counts change because the cards are gone, not because a check is loosened.
- Rewrite `briefs/v15/reports/v15-names-for-the-owner.md` as the three-row table now in issue #76 (read it with `gh issue view 76 --json body --jq .body`), with one line under it listing what was dropped.
- `world-code/modules.md`: one line where `LANDMARKS` is described: a new region gets three to five names a visitor meets, no more (the owner, v15); everything else is unnamed to them.

## Done when

Walk into the village from the keep's end and from the house's end on the keys: frames of each card that rises (three, each once). `ONLY=settings,regions,village,village-plan,walk,loading tools/suite.sh 8179` green with counts (`settings` is slow and fails under load: rerun it alone before believing a failure). Report `briefs/v15/reports/issue-1535-three-names.md`; hand back in under 120 words.
