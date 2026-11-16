# Brief v15-G1: one answer to "an old thing stands inside a new thing"

Worktree `.claude/worktrees/issue-1532-buried`, branch `issue-1532-buried`, port 8174. Work only there. Read `briefs/v15/_common.md` first, then `tools/geometry-test.mjs`'s header and `tools/geometry/analyze.mjs`. Helpers that read images run on `haiku` or `sonnet`.

## The owner's words (2026-11-16, 13:35)

After a white peafowl was found standing through a village wall, and the orchestrator proposed a test for the birds: "don't we need some more generalized answer to 'existing things clipping inside new things'? seems like a perennial problem and a hodge-podge of tests seems like wrong fix?"

They are right. It has two halves, a cause and a check, and each should exist once.

## Part A, the check: a fourth kind in the geometry test, `buried`

`tools/geometry-test.mjs` (#64) already takes every drawn face in every walkable place and judges coplanar, floating and backs. Add **buried**: a connected group of faces (the test already groups touching pieces) of one mesh that lies mostly inside something solid belonging to another mesh or module, or mostly under the drawn ground, where nothing about it says it should. It needs no knowledge of what the thing is: a bird in a wall, a lamp in a roof, a yew through a house, a rock through a stair, a figure in a parapet are all the same finding.

- Inside what: decide by measuring what works on this scene (meshes here are often open shells, so ray parity alone will lie): candidates are parity against closed groups, "between two opposing faces of one mesh within a wall's thickness", and the colliders the page registers. Use the fixture the test plants over the spawn: add buried cases (a box half in a wall, a small thing wholly inside a block, a thing sunk to its middle in the ground) beside sound ones that must not be found (a post rooted 0.2 m in the ground, a beam let into a wall by its end, a plant's base, a thing standing on a parapet), and tune until each fault is found and no sound part is.
- What is exempt, once and by rule, not by name where possible: the last few decimetres of anything rooted or let in (a fraction of its own size); things under water; particles and cards. Instanced meshes are judged an instance at a time.
- The same baseline, record and report as the other kinds (a finding prints its meshes, position and `?pos=` URL). Run it on every place. **Report what it finds on `next` today** as a table by place and by pair of modules: the owner's peafowl must be in it before agent X2's fix lands (X2, `issue-1531-arch-peafowl`, is re-perching the birds now: take your first count before merging it), or the check is wrong.
- Fix nothing in the world yourself beyond what is trivially a single misplaced thing: list the rest, worst first, for the orchestrator. New findings fail the test from now on; today's go in the baseline as "found by v15-G1, not yet judged" with the list in your report.

## Part B, the cause: one place where ground is claimed, and every placer asks it

Things end up inside new things because each old module places from its own list or its own rng and each new region clears what it knows of by hand (`rocks.js`, `vegetation/ground.js`, `structures/scatter.js` each have their own clearances; the Demesne's peafowl perches had none). Survey how many such mechanisms exist (grep the clearings: `clear`, `exclude`, `keepOut`, `lappet`, the Nave's and the village's edits in other modules) and write down what you find. Then the smallest thing that makes it one: a registry on `ctx` (a region declares the footprints it builds on, as boxes or discs with a height range, before the placers run) and one question every placer asks (`ctx.claims.at(x, z, r)` or the like), with the existing hand-made clearances moved onto it where that is a line each, and left with a note where it is not. Order matters (modules build in a sequence; some after the terrain bake): say how a region that builds late still claims early (a static table beside the plan is fine). Do not move a single thing in the world in this part: with the same claims as today's clearances, `tools/build-check.mjs` should report nothing moved.

If Part B turns out to be more than a day's careful work, do the survey and the registry with two placers moved onto it, and write the rest as a list: say so plainly.

## Done when

The fixture's buried faults found and its sound parts not; the table of today's findings; `ONLY=geometry,regions,village,rocks,dressing,build tools/suite.sh 8174` green (name the tests as they are; `geometry`'s time before and after: it must not grow by more than a third); `world-code/runtime.md` says in a few lines what `buried` is and how a new region claims its ground. Report `briefs/v15/reports/issue-1532-buried.md`; hand back in under 200 words.
