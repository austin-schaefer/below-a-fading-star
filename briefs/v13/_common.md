# v13, for every agent

Read `AGENTS.md`, then load `wilderness` and `world-code` (with `runtime.md` and `modules.md`). Read `plans/wilderness-v13.md` (all of it, it is short) and `briefs/v13/index.md`.

The owner, in #44: "Each implementing agent should identify a concrete performance target, measure the relevant baseline, and report the result. Targets should reflect actual player experience, not just isolated microbenchmarks." "Prefer improvements to the existing profiling and benchmark workflow over a new verification layer. This should not add another release gate or materially expand final review time. No broad rewrite or new framework for its own sake."

Rules for this milestone:

- **Target, baseline, result.** Your report opens with three lines: the target in a visitor's terms (seconds to "Go out", the longest stall, the worst frame on a route), the baseline you measured before changing anything (command, machine state, the number, three runs and their spread), and the result from the same command. A change with no measured gain is reverted, not kept "for cleanliness"; say so.
- **Measure honestly.** Headless WebGL here is software or ANGLE: frame time and GPU time are not trustworthy; JS CPU ms, counts, ratios and wall-clock load phases are. Other agents share this machine: take a number three times, report the median and the spread, and if the spread is wider than the gain, say the gain is unproven. Use the CPU throttle (4x) as the stand-in for a phone and say that it is a stand-in.
- **Nothing may look, sound or behave differently.** Before and after render pairs at the bench's stations (`tools/views-perf.json`) on low and medium with `tools/pair-diff.mjs`, and `tools/terrain-probe.mjs`'s fingerprint, unchanged. If a pair differs, that is your bug.
- **Extend what exists.** `src/perf.js`, `?bench`, `?record`, `tools/bench-report.mjs`, `pan-test`, `alloc-audit`, `heights-cost`, `pop-probe`, `terrain-probe`. A new tool needs a reason the old ones cannot be stretched to; no new `run` line in `tools/suite.sh` unless your brief says so, and then say what it adds to the suite's wall time.
- **Stale is worse than slow.** Anything cached is keyed by the commit (`commit.json`) and by what it was computed from, falls back to computing or the network on any miss or error, and has a check that a new key replaces the old.
- **Say what you could not move.** A finding that something is not worth doing (a worker that saves nothing, a bundle that the network did not need) is a result: write the number.
- **Others are at work beside you** (the index says who owns what). Keep edits to `src/main.js`, `src/world.js`, `src/perf.js` and the skill references to the lines your brief names; new code goes in new files.
- One headless browser at a time; `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...`; no `--trace`; never delete a render.
- Tests before handing back, at least: `ONLY=settings,loading,perf,pan,record,walk,touch tools/suite.sh <port>` (say the counts), plus any your change touches. Shared code (`main.js`, `world.js`, terrain, controls, post) means the whole suite.
- Document in `world-code/runtime.md`, in the present tense, in a few lines, whatever the next agent needs to use what you built.
- Hand back as `world-code` says, in under 250 words: target, baseline, result; what changed; the commands and counts; what is still slow and why; any default you took.
