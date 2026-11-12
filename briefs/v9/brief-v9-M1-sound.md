# Brief v9-M1: the patches, the player, the one audio check

**Goal.** The moor track becomes sound: a visitor would hear a slow, plain, old piece under the wind, and the owner gets a WAV of it. An agent still judges by text: one offline render, numbers, no image.

Read first: `AGENTS.md`, the `wilderness`, `sound-design` and `music` skills, `plans/wilderness-v9.md`, `briefs/v9/index.md` (the design: patches, the bus, the harness), `src/audio/music/score.js` (the event format: `{ t, dur, voice, ratio, vel }`, ratio from D3 = 146.83 Hz; a voice's `patch` names its instrument), `src/audio/graph.js`, `tools/audio-metrics.mjs`.

**Build.**
1. `src/audio/music/patches.js`: `makeVoices(ac, dest, opts)` for any `BaseAudioContext` (live or offline). Patches pad, organ, flute, choir, bell as the index describes; a fixed pool of persistent voices (no node made per note; a patch is retuned and its envelope gated), every note with an attack of at least 30 ms and a release, no clicks; a tape character over the stem (wow ±4 cents at 0.3–0.6 Hz, lowpass about 3 kHz, faint hiss); on the low tier fewer detuned oscillators. Deterministic: no `Math.random`.
2. `src/audio/music/player.js`: `play(events, { ac, dest, at })` schedules on the audio clock about 2 s ahead with one timer, `stop(fade)` fades in about 1.5 s, `fadeTo(gain, s)` for ducking; it reports `playing`, `t`, `ended`. It owns no bus and reads nothing from the world: M2 (running beside you) builds `director.js`, the `musicBus`, the setting and `?music=`, and will call `play` and `stop`. Agree the interface by writing it at the top of `player.js` first and committing that early.
3. `tools/music-render.mjs <track|all> [--wav]`: a blank headless page, the modules served by `page.route` (no server, no world), an `OfflineAudioContext` rendering the whole track faster than real time. Prints loudness (LUFS, target −38 to −32, at or under the bed), peak, clicks (0), `sharp_db` (< −16), `rough` (< 0.15) from the meters in `tools/audio-metrics.mjs`, a text band-energy table, PASS/FAIL lines; writes `shots/wip/music-<track>.wav` (gitignored) for the owner. A `run` line in `tools/suite.sh`.
4. The `music` skill: add the render step and what its numbers mean.

**Not yours:** `director.js`, the bus in `graph.js`, the settings menu, `?music=`, more tracks. `tools/audio-*.mjs` are being changed by M5: import the meters, do not edit them.

**Done when.** `node tools/music-render.mjs moor --wav` passes its gates and writes the WAV; `node tools/music-score.mjs all` and its self-test still pass; a deliberately bad patch (a click, a harsh saw) fails the render gates and you say which; `walk-test`, `perf-test`, `loading-test`, `grass-flicker-test`, `build-artifact` pass (nothing loads the music yet, so they should be untouched).

Finish and report as the `wilderness` skill's Hand-back says, under 200 words, with the render's text output for moor.
