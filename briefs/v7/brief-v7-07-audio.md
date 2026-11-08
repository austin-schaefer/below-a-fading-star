You are the audio pass agent for v7 ("the living") of "Below a Fading Star", a Three.js r170 first-person walk in `prototypes/wilderness/` of the Fading Planet repo (no build step, ES modules; all sound is procedural Web Audio in `src/audio.js`, no samples). Austin, the designer, has deferred the open calls to the orchestrator, who decides and logs for him. You run last and alone, after the six v7 figure agents have merged: they fired named cues at the right moments and wrote no sound; you write every one of those sounds, in one hand, so the living sound like one world. You own `src/audio.js` for the pass.

Worktree: /Users/user/dev/fading-planet/.claude/worktrees/v7-audio on branch `v7-audio` (`git fetch origin && git merge origin/claude/intelligent-mendel-ca020e` first thing; it must contain all six: `src/v7/walkers.js`, `workers.js`, `still.js`, `glyphs.js`, `small.js`, `canyon.js`; if any is missing, stop and say which). Work only there.

Read first:
- `AGENTS.md` (repo root): never invent game content.
- `.agents/skills/wilderness/SKILL.md` (with `runtime.md` and `modules.md`): the audio module's line, `tools/audio-test.mjs` (fires every one-shot cue in turn at a representative place and reports each sounds; the fall's loop; the voice cap at 12), the tone paragraph.
- `briefs/v7/index.md` "Austin's words for v7" ("then the audio pass over everything new").
- `wilderness-v5.md` "## v7, the living": every section's "cues fired" line (names, positions, opts, when they fire, which are loops with `start`/`stop`). Then `grep -rn "audio?.cue" src/v7` and reconcile: every cue name in the code gets a sound or a deliberate silence, and you list any the docs and the code disagree on.
- `IDEAS-v5.md` for each idea's sound, which is the spec (verbatim below), and "## Rules of the pass".
- `src/audio.js` end to end: the buses (master, cue bus with its analyser tap, dry bus, reverb send), `voice()` and the voice cap, `panner`/`setPos`, the noise buffers (`white`, `pink`, `brown`), `env`, `burst`, `swell`, `loopSrc`, the footsteps block (with v7-small's `echoStep` refactor: leave the echo alone), the region sounds (`regionSnd`), the hush (`ctx.hush`: the Occultation quiets the birds only; the people are not hushed), the existing figure cues as precedents of register: `greet` (the traveller), `heartbeat` (the guest), `glyphShift`, `pedlarPass`, `galleyDrum`, `keptFire` (a positional loop that swells with distance, with a flare), `hawserGroan`, and the v5 lights' `lamp-tick`.
- `tools/audio-test.mjs` (the `CUES` table: one row per firing, with an offset, opts, listen and settle ms).

The sounds, verbatim from the ideas, and the cue names the figure agents fire (check each against the code):
- BY the Taker of Altitudes: "Sound: the quadrant's click, a murmured number." (`taker-click`, `taker-murmur`)
- BZ the Coheirs: "Sound: a hum in thirds, and the net's knots pulled tight." (`coheirs-hum` start/stop, `coheirs-knot`)
- CB the Long Sleeper: "Sound: the breath, and a fruit dropping onto him now and then." (`sleeper-breath`, `sleeper-fruit`)
- CD the Little Thurifer: "Sound: the censer's chain, the robes' long hiss on the grass." (`thurifer-chain`, `thurifer-hiss` start/stop)
- CE the Bather: "Sound: from the rim, water poured from a cupped hand; from below, the river." (`bather-pour`; below, the river's existing sound: nothing new)
- CF the Sexton of No One: "Sound: the spade's bite, earth thrown." (`sexton-bite`, `sexton-throw`)
- CG the Leerie: "Sound: footsteps, the pole's click on the lamp-cage." (`leerie-step`, `leerie-click`)
- CI the Stylite: "Sound: the rope's creak." (`stylite-creak`)
- CL the Accrescent: "Sound: a faint tinkle like ice in a glass at each step." (`accrescent-step`, about once an hour)
- CT the Tesserine Moles: "... a click of stone on stone." (`moles-click`)
- CO the Repetend: done by v7-small (`echoStep`); do not touch it.
- DM the Link-Boy: the idea gives no sound ("He never speaks"); the walkers agent fires `linkboy-step`. Decided default (logged by the orchestrator, reversible): his footsteps by ground, quiet (they are physical, not content), and a faint flutter of the link's flame within 8 m; nothing else.
- CM, CP, CQ, CX, DP, the glyph motif: no sound in their ideas: silent.

Register: the sounds of people absorbed in a task nobody needs any more, heard in a dying world: dry, small, close, a little reverberant in the canyon and the court, never musical except where the idea says (the hum in thirds). **No words, ever:** the "murmured number" is a voice-like murmur with no intelligible syllables (a few formant-filtered pulses in a low register, the contour of a number said under the breath, not a number); the hum in thirds is two voices without words, a major or minor third apart (choose one and keep it: the twins never change it), stopping the instant they stop. Nothing cheerful, nothing cute (the moles' click is stone on stone, small and dry).

Build, in `src/audio.js` (one dispatch line per cue in `audio.cue`, the synthesis in a v7 block of its own, or in a new `src/audio/living.js` imported by `audio.js` if the block passes about 200 lines):
1. **Every cue above**, positional (`panner` at the cue's position), with a real distance law: the small ones (the click, the knot, the fruit, the tinkle, the moles' click, the creak) audible to 15–20 m; the spade and the censer's chain to 30 m; the Leerie's steps and click to 25 m; the hum to 25 m; the murmur to 12 m; the pour only from the rim (the Bather's agent fires it only there).
2. **The loops** (`coheirs-hum`, `thurifer-hiss`): started and stopped by the figures' `start`/`stop` opts, each one voice, swelling in and out over 0.3–0.6 s, never stacking (a second `start` while running is ignored), released when the figure is beyond its range or its module is toggled off (`ctx.perf.setModule`).
3. **The Leerie's and the Link-Boy's footsteps** by the ground they walk on, through the footstep synthesis (the refactored `stepSound` path that `echoStep` uses), quieter than the walker's own and positional.
4. **The voice cap holds at 12** with everything in the north-west at once (the Thurifer, the Link-Boy, the Repetend's echo and the walker's steps on P3 by the Lynchets' east wall: the worst cluster in v7) and at the Leerie's row in a gutter (his steps, the clicks, the lights' `lamp-tick` wave): measure both and report the peak voices.

Cost: no per-frame allocation in audio's update; loops reuse their nodes; one-shots disconnect after they end (as the footsteps do, `setTimeout(... disconnect)`); the audio thread's load at the two clusters above reported from `audio.voices` and a 10 s headless run.

Checks to listen to and record (the audio test's analyser and, if you can, a short WAV per cue written by a headless capture into `shots/wip/` as `v7-07-audio-<cue>.wav`, or say why not): each cue alone at its representative place; the two clusters; the hum's start and stop in sync with the Coheirs' heads turning (a test that fires the turn and checks the hum's gain falls within 0.1 s).

In `wilderness-v5.md` under `## v7, the living`, add `### The living's sounds (the v7 audio pass)`: one line per cue (what it is made of, its range), the loops' rule, the Link-Boy's default, the silent ones, the voice peaks at the two clusters. `runtime.md`: the audio-test sentence's count ("N firings") updated, and the audio module's line if it changed.

Rules (binding): never invent game content (no words, no music beyond the hum in thirds, no sound for a thing whose idea gives none, except the Link-Boy's default above); never touch `design/`; never `--no-verify`; never delete or overwrite a render or recording. Shared files: `src/audio.js` (yours for this pass), `tools/audio-test.mjs` (one row per new firing), `.agents/skills/wilderness/modules.md` and `runtime.md`, `wilderness-v5.md`. Do not edit any `src/v7/*` file except to fix a cue name the docs and the code disagree on (one line, said in the report), and do not touch v7-small's `echoStep`.

Setup and pace (Austin's laptop): serve with `cd prototypes/wilderness && nohup nice -n 10 tools/serve.sh PORT > /tmp/serve-PORT.log 2>&1 &`, port PORT for everything (8123, 8145 and the other agents' ports belong to others); Playwright is installed in `prototypes/wilderness/node_modules` (no package.json; keep it that way); prefix every `node tools/...` call with `SHOT_ANGLE=metal nice -n 10`; one headless browser at a time.

Tests before pushing: `audio-test.mjs "http://localhost:PORT/?q=low&only=audio"`: the count on the merged branch plus one firing per new cue (two for each loop: start, stop) and the two cluster checks, every one sounding, the voice cap at 12; then the same test without `only=audio` (`"http://localhost:PORT/?q=low"`) so the figures' own firings are heard in place; `walk-test.mjs "http://localhost:PORT/?q=low"` 9/9, `perf-test.mjs "http://localhost:PORT/?q=low&perf=1&bench=6"` 17/17, `loading-test.mjs "http://localhost:PORT/?q=low"` 7/7, and the six v7 tests (`walkers-test`, `workers-test`, `still-test`, `glyphs-test`, `small-test`, `canyon-test`) all passing as they did, `build-artifact.mjs` builds. The loading test writes its card renders into the gitignored `shots/wip/`. Before the final push: `git fetch origin && git merge origin/claude/intelligent-mendel-ca020e`; if the merge conflicts in more than a few lines, list them in your report instead.

Finish: commits (`feat(wilderness): the living's sounds, the v7 audio pass`, `test(wilderness): audio test: the v7 cues and the two clusters`, `docs(wilderness): v7 notes: the living's sounds`), `git push -u origin v7-audio`. No merge, no PR. Kill your server at the end (`lsof -ti:PORT | xargs kill`).

Report back in under 200 words: the cues built (one line each, grouped), the loops' rule, the Link-Boy's default as built, the silent ones, the voice peaks at the two clusters, any cue name mismatches fixed, exact test commands with pass counts, anything Austin should listen to first.
