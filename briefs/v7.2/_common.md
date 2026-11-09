# Common to every v7.2 voicing brief (02–05)

Repo: Fading Planet; prototype `prototypes/wilderness/` ("Below a Fading Star"). Read first, in this order: `AGENTS.md` (repo root; never invent game content), `.agents/skills/wilderness/SKILL.md` (pace rules bind you), all of `.agents/skills/sound-design/` (`SKILL.md` is the method, `craft.md` the rules with numbers, `harness.md` the tools, `palette.md` the tone), `briefs/v7.2/index.md` ("What is wrong", the decisions), then the files you own and `src/audio.js`'s header (the cue index).

Worktree, branch and port: in the dispatch message. Work only there. `nice -n 10` and `SHOT_ANGLE=metal` on every `node tools/...`; one browser at a time; renders into `shots/wip/audio/` (gitignored); your log at `shots/wip/audio/LOG.md`.

The loop, binding: baseline render of what you change before you change it; name the fault in metric terms; one change, render, compare with `--baseline`, look at both spectrograms, one log line; keep or revert. Nothing pushed that was not rendered and measured. Never lower a level to pass a gate; never loosen a band in `audio-survey.json`. You may add a pose to the survey for a place you voice.

Shared files: `src/audio/graph.js` is v7.2-05's. Call its exports; if you need one it lacks, add one exported line with a `// v7.2-0n:` comment and name it in your report. `src/audio.js` (the entry) should not need you; one line if it does. `tools/audio-test.mjs`'s cue table must stay inside every cue's range and its count must not fall. Nothing under `design/`. No new creature, place or name: a sound with no emitter is removed, not given one.

Before pushing: `node tools/audio-test.mjs "$B/?q=low&only=audio"` and `"$B/?q=low"` at their counts; `node tools/audio-quality-test.mjs $B` (report which gates you turned green and which remain red with the reason); `walk-test`, `perf-test`, `loading-test`, `grass-flicker-test`, `build-artifact`. Then `git fetch origin && git merge origin/<working branch>` (resolve by hand, keep both), rerun `audio-test`, push (`git push -u origin <branch>`). No merge into the working branch, no PR. Kill your server.

Report in under 250 words: what changed (by sound), the before → after numbers that matter from your log, the exact test commands and counts, the three renders a listener should hear first and what to listen for in each, any default you took, any question file you wrote in `proposals/`.
