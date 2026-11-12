---
name: sound-design
description: How an agent designs, changes and judges sound it cannot hear. Load before touching any procedural audio in this repo (src/audio*, the regions' sound hooks, any `ctx.audio.cue` site), as implementer or reviewer. Covers the render-measure-look loop, the harness tools, the craft rules that keep synthesised sound pleasant, the pacing rules that keep a soundscape from feeling random, and the world's sound palette.
---

# Sound design

You cannot hear. You can still do good sound work the way a deaf mastering engineer would: render, measure, look at the picture, change one thing, render again, and keep a listening log that a hearing person can check. A change you have not rendered and measured is a guess; a guess does not get pushed.

Companion files: `craft.md` (why things sound bad and what to do instead, with numbers), `harness.md` (the tools, what each number means, what good looks like), `palette.md` (this world's sounds and tone), `SOURCES.md` (the research behind the rules).

## The loop

You judge from text. A change costs minutes, not a quarter of an hour: the numbers and a band-energy table (octave bands in dB over slices of the render) tell you what the spectrogram would, and you open an image only when the text leaves a question (`--images`, `harness.md`).

1. **Baseline first.** Before any edit, render the poses you are about to change: `node tools/audio-survey.mjs $B --poses=<yours> --out=shots/wip/audio/survey-before` (or `tools/audio-render.mjs` for a cue or one-off). The WAVs, metrics JSON and tables stay in `shots/wip/audio/` (gitignored, never committed). Everything you do is judged against it.
2. **Name the fault in the metrics' terms** before touching code: "seam click every 7.0 s", "sharpness ratio −6 dB, cap is −12", "onsets 9/min uniform, no rest longer than 22 s", "bed at −21 LUFS, target −30", "the 250 Hz octave 8 dB over its neighbours". If the metrics and the table do not show the fault the designer hears, add a metric (in `tools/audio-metrics.mjs`) that does, and say so in your report.
3. **Change one thing.** Render again, same poses: `--poses=<yours> --out=shots/wip/audio/survey-after --baseline=shots/wip/audio/survey-before`. The table shows before → after in every cell and each pose's band table the change by band; the `swing` row says which bands move over the render. Write one line in your log: what changed, the before and after numbers, keep or revert. A picture is for a question the text cannot answer (`--images`).
4. **Run your poses, not the survey.** While you iterate, `--poses=` names only the poses your change touches (and one that must not move, as a control). The full survey and the quality gate are the orchestrator's, once a batch, not yours after every edit. Before you hand back: your poses inside their bands, `tools/audio-test.mjs` at its full count and the `world-code` skill's standard tests. Run `tools/audio-quality-test.mjs` only if your brief says to.
5. **Report for a listener.** Your hand-back names the renders to listen to, in order, and for each what to listen for and what the numbers say. The designer listens; you do not.

## Rules that bind every edit

- **Nothing raw.** No unfiltered white noise, no bare sawtooth or square to the bus. A waveform is a starting point for a filter and an envelope. Square-wave gating and `setValueAtTime` jumps on an audible parameter are clicks by construction; use `setTargetAtTime` or ramps of 5 ms or more.
- **Attack and release are never zero.** One-shots: attack ≥ 3 ms (≥ 10 ms for anything tonal), release ≥ 40 ms. Beds fade over seconds. Every loop buffer is seam-free (`tools/audio-metrics.mjs --clicks` on 20 s of it shows none).
- **Dark by default.** The sun is dying; the air is thick. Lowpass everything by distance (air absorption), roll the bed off above 4–6 kHz, keep sustained energy out of 2–5 kHz (the ear's most sensitive band; `craft.md` "Sharpness").
- **Space is one thing per place.** Open moor, dense wood, stone enclosure and water each have their own reverb; a sound's wet share rises with distance and its dry level falls. One global reverb at one length is a fault.
- **Events have intention.** A call comes from a thing that exists, at its place, when the player could plausibly hear it, and it answers or is answered. Schedulers are phrased (bursts and rests), not memoryless uniform draws. Nothing fires "so the quiet is never empty"; quiet is the point.
- **Three tiers, three levels.** Bed (always, far below), detail (near, place-bound, intermittent), punctuation (rare, meaningful, the loudest thing you hear). The bed never competes with detail; punctuation is heard once and remembered.
- **One tonal centre per scene.** Pitched sounds share a key or a pentatonic in it (`palette.md`). Detune for beating is a decision, in cents, written down, never an accident of unrelated frequencies.
- **Jitter is small.** Footsteps ±3–5 % pitch and ±2 dB; a call's repeat ±8 %. ±17 % pitch makes a step sound like a different foot.
- **Range matches meaning.** The thing the designer is meant to notice is audible from where they are meant to notice it. A unique cue heard within 5 m is a cue nobody hears.
- **Deterministic.** `ctx.makeRng(salt)` or `ctx.noise`, never `Math.random`, so a render at a pose and seed is reproducible and a before/after pair is a fair pair.
- **Never fix by muting.** Lowering a level is a mix decision made with the whole survey in view, not a way to pass a gate.

## Working here

- Load the `wilderness` and `world-code` skills too (serving and ports, the module contract, the tests before pushing, the hand-back); `AGENTS.md`'s pace rules apply.
- Audio renders are WAVs (and PNGs, when you ask for them) in `shots/wip/audio/`, gitignored. Only metrics JSON and the survey's markdown table may be committed, under `briefs/<version>/audio/`.
- `tools/audio-test.mjs` checks that cues sound; the harness checks how they sound. Both must pass.
- *What* a thing sounds like and *how* it sounds are both yours; the milestone doc records what you settled.
