# Brief v15-W2: a ladder that looks climbable is climbable

Worktree `.claude/worktrees/issue-1526-ladders`, branch `issue-1526-ladders`, port 8165. Work only there. Read `briefs/v15/_common.md` first. Helpers that read images run on `haiku` or `sonnet`.

## The owner's rule (2026-11-16)

"ladders that are in a place that could read as climable, should be climable consistently. it's fine if they don't read that way (like a ladder leaning against a wall) but if they do look climable, they should always be"

## Where things stand

One ladder in the whole walk can be climbed: `rungs-ladder` (`src/v15/ways/ladder.js`: "the first in the walk"; walk into its foot, hold forward; registered as an ascent, walked by `heights-test` and `village-walk`). Every other ladder is drawn and is a post or a wall: the houses kit's `ladder()` (`src/v15/houses/kit.js:278`) used by the new house's scaffold (`newhouse.js:143`) and by the Elder houses' huts (`elder.js:104`, which already knows whether there is a hut to climb to); the Pennyworth's Spilt Measure; any a quarter drew for itself; outside the village the Pomegranate House's kitchen ladder (`src/v8/house/kept.js:199`, a wall on purpose) and the iron rungs at the Lonely Staircase's top (`src/v12/stair/top.js`, the tender's, running up into the lattice), and whatever the cliff works, the galleries and the lift draw.

## Goal

1. **List every ladder a visitor can walk up to** in the whole walk (grep `ladder`, `rung`, and look: the village's frames are full of them), with a frame of each from where a visitor meets it. For each decide by the owner's rule, looking at the frame, not the code: does it read as a way up (it stands on ground a walker reaches, leads to a place a person could be, foot clear)? Put the table in your report.
2. **Each one that reads as climbable becomes climbable** with the existing ladder (`ways/ladder.js`: generalise it so the kit and other modules can register one from a foot, a head and a facing; one behaviour everywhere, keys and touch), and arrives somewhere worth the climb: a floor to stand on with an edge that holds, something to see or find (a hut's door, a roof with a view, a scaffold deck), and the same way down. Registered as an ascent so `ways-test`, `heights-test` and the HUD's names cover it.
3. **Each one that stays scenery is made not to read as a way up:** leaning shallow against a wall with its foot blocked or its head against blank wall, lying down, lashed flat, drawn up out of reach, broken off above head height. No invisible wall at the foot of something that invites.
4. **Guard the rule:** a row in `tools/ways-test.mjs` (or the kit's own check) that every drawn ladder in the village is either registered climbable or flagged `scenery` with a reason, so the next one somebody draws must choose. A line in `world-code` (`runtime.md` or the skill) stating the rule and how to register one.

Three agents work beside you (people; sound and light; names, the map and low-tier thinning, who may gate some props on quality: a climbable ladder must exist on every tier). Keep edits to the quarters' files small and in their own commits; merge `origin/next` before your last test run.

## Done when

The table; every climbable ladder climbed in a real browser with the pointer captured, on keys and on touch, up and down, frames at the foot, halfway, the head and back down; every scenery ladder's before/after frame; `ONLY=ways,village,village-plan,geometry,walk,hop,edges,heights,house,settings,touch tools/suite.sh 8165` green; both whole-village walks. Report `briefs/v15/reports/issue-1526-ladders.md`; hand back in under 250 words.
