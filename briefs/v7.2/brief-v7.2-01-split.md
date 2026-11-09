# v7.2-01: split `audio.js`, fix the seam

You split a 1235-line module into files by concern so four agents can voice the sound in parallel without merging one file, and you fix the one bug every bed shares. Repo: Fading Planet; prototype `prototypes/wilderness/`. Read first: `AGENTS.md`, `.agents/skills/wilderness/SKILL.md` (with `runtime.md`, `modules.md`), `.agents/skills/sound-design/SKILL.md` and `craft.md` "Envelopes" (the loop-seam rule). Then read all of `src/audio.js`, `src/audio/synth.js`, `src/audio/living.js`, and `src/v4/regions.js` lines 270–300 (how the regions' sound hooks are started) before you move anything.

Worktree, branch and port: in the dispatch message. Work only there. `nice -n 10` and `SHOT_ANGLE=metal` on every `node tools/...`.

## The split (behaviour-preserving; the sound must be identical)

`src/audio.js` becomes the entry: the header comment (the cue table stays here, it is the index other agents grep), `build(ctx)`, the mute button, the exported `ctx.audio` surface, and the wiring that calls the parts. The parts, each `export function start<Part>(a, ctx)` or similar taking the shared audio object (`a`: `ac`, buses, `voice`, `rng`, helpers) so nothing reaches into another file's locals:

- `src/audio/graph.js`: the AudioContext, master, limiter, mute, vol, the analysers, the reverb convolver and its send, the buses, the listener update, `voice()` and the voice cap, `oneShotPanner`, the clamp/smoothstep helpers. This file is v7.2-05's after you; keep its exports named and documented at the top.
- `src/audio/bed.js`: wind (layers, openness, gusts), drone, shimmer, insects, the gutter's dip and swell, and their per-frame update. v7.2-02's.
- `src/audio/steps.js`: footsteps (`onStep`, the kinds by ground, `stepSynth`, the step record and `echoStep`). v7.2-04's.
- `src/audio/calls.js`: `distantCall` and every scheduled random call that is not a region hook or a named cue (the fen's frogs and bubbles, the deodand click, the grouse, the tarn lap if it is scheduled here). v7.2-03's.
- `src/audio/cues.js`: the `cue(name, pos, opts)` dispatcher and every named one-shot's synth (the long table from `cry` to `hawser-groan`), and the fall loop. `living.js` stays as it is and is called from here. v7.2-04's.
- `src/audio/regions.js`: `startSounds` for the regions' hooks and the kit passed to them. v7.2-03's.

Rules: no behaviour change in this brief except the seam fix below; keep every `rng` stream's order of draws where you can (the sound is deterministic by pose and time; a reordered draw changes it, which is acceptable only if unavoidable, and you say so); keep `ctx.audio`'s surface identical (`audio-test.mjs` and `settings.js` use it); every file starts with a comment saying what it owns and which v7.2 brief voices it next.

## The seam fix

`src/audio/synth.js` `makeNoiseBuffer`: the loop crossfade multiplies the tail by `* 0`, so each looped buffer wraps from full amplitude to a faded start and thumps at its period. Make it a real crossfade: the first `f` samples become `d[i] * k + tail[i] * (1 - k)` where `tail` is a copy of the last `f` samples taken before the overwrite (equal-power weights are fine), `f` ≥ 4096 at 48 kHz. Then the same for any other looped buffer built elsewhere (grep `loop = true` and `createBuffer`). Prove it: with the harness if v7.2-00 has landed on the working branch by the time you get here (`git fetch origin && git merge origin/<working branch>`; `node tools/audio-metrics.mjs` on a 20 s moor render must show `clicks: 0`, `seam_s: none`), otherwise with a small Node script that builds the same buffer with the same function (import `synth.js` with a stub `ac`) and checks the max sample-to-sample jump across the seam is under 4 × the buffer's RMS jump elsewhere. Report which proof you used.

## Done when

- `node tools/audio-test.mjs "$B/?q=low&only=audio"` passes at the same count as before your change (run it before and after; both counts in the report). With the figures loaded (`$B/?q=low`) too.
- `walk-test`, `perf-test`, `loading-test`, `grass-flicker-test`, `build-artifact` pass.
- `modules.md`'s `audio.js` row lists the new files in one row; `src/audio.js`'s header says where each part lives.
- No file in `src/audio/` is over 500 lines; `audio.js` is under 200.

## Finish

Commit by part (`refactor(wilderness): audio graph into src/audio/graph.js (v7.2-01)`, …, `fix(wilderness): loop-seam crossfade in makeNoiseBuffer (v7.2-01)`). Push the branch. No merge, no PR. Kill your server. Report in under 200 words: the file map with line counts, the test commands and counts before and after, the seam proof, any draw order you had to change.
