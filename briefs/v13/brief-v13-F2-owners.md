# Brief v13 F2: the owners

Worktree: `.claude/worktrees/issue-1308-owners` (branch `issue-1308-owners`, port 8164). Work only there. Read `briefs/v13/_common.md` first. Model: mid.

## Goal

The owner (#44): "Keep subsystem boundaries clear enough that costs and responsibilities don't disappear into shared context." Two small things make that true where today it is not. Nothing a visitor sees changes.

1. **Drawing code reads the profiler's private table.** `src/shadows.js:36` and `src/v12/far.js:58` read `ctx.perf._mods` (the map of each module's objects that the profiler keeps for its own switches), so the profiler's tagging is load-bearing for the shadow pass and the far stand-ins, and nobody would guess it. Give the world a small registry of its own: which module made which root objects, filled where modules are built (`src/main.js`, a line or two: another agent is reworking that file's startup right now, so touch only the place a built module's objects are tagged, and expect a small merge), exposed as `ctx.modules` (or a name that fits `ctx`'s others: read `world-code/SKILL.md`'s `ctx` section), read by `shadows.js`, `far.js` and `perf.js` alike. `_mods` goes away. Same objects, same order, same behaviour: `tools/build-check.mjs` identical for all 55 modules against a recording on `origin/next`, and the shadow and far behaviour unchanged (`ONLY=heights,pan,perf,treelod,grass tools/suite.sh 8164`, and before and after render pairs at `tools/views-perf.json` on low and medium with `tools/pair-diff.mjs`; take a no-change pair first to learn the noise).
2. **A budget that prints.** `world-code/SKILL.md` ("Light and budgets") gives each module a budget (about 25 draw calls and 400k triangles at high; read the exact words) that nothing checks except `regions-test` for regions. The bench now knows each module's calls and triangles at seven stations (P1's work: `src/perf-frames.js`, `tools/bench-report.mjs`). Make `bench-report` print, after its tables, one line for every module over its documented budget at any station (module, station, calls, triangles, the budget), and nothing when none is. No test, no gate: a name for an overrun. Run it on low, medium and high and put the list in your report: that list is this milestone's audit of who is over.
3. **`world-code/modules.md` says who owns each shared cost**, in a short table: the shadow pass, the post chain, `far.js`, `above.js`, light slots, compile and warm-up, the terrain bake, the height path, the kept store, the service worker: the file, what it costs and where that number is read (which row of `?perf=1`, which phase of `tools/load-probe.mjs`). Present tense, a line each.

## Target

No visitor-facing number: this brief's target is that the answer to "what does X cost and whose is it" is one lookup for every shared cost, and that an overrun has a name. Say in the report how many modules are over budget today and by how much.

## Not yours

Making anything faster; fixing an overrun (list it). `src/main.js` beyond the tagging lines. `sw.js`, `src/height/`, `src/v13/`.

## Done when

- `grep -rn "_mods" src` finds nothing; build-check identical; the subset above green with counts; the pairs within noise.
- The over-budget list on three tiers; `modules.md`'s table.
