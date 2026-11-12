# v9, the music: design and briefs

Written 2026-11-11 from Austin's issue #2 (`plans/wilderness-v9.md`) and a research agent's read of `src/audio/`, the `sound-design` skill and its tools, and the web. Sources are listed at the end; a brief that leans on one opens it first.

## What exists (facts to build on)

- **The graph** (`src/audio/graph.js`): `master` (0.25) → `busComp` → `limiter` → `mute` → `vol`. Into `master`: `cueBus`, `dryBus`, `verbOut` (three convolvers: open, wood, stone), and the bed's `windBus` and `droneBus` (`src/audio/bed.js`). `startGraph(ctx, audio, AC)` takes the context constructor as an argument.
- **The key is D.** Bed drone D1 and D2 sines (`bed.js` ~94); the carillon is a just minor pentatonic on D3 = 146.83 Hz (1, 6/5, 4/3, 3/2, 9/5; `src/audio/cues-v2.js` ~38); the Cardinal Stones D2 F2 A2 C3; the Lattice hum A4; the Coheirs A3 with a 6:5 C. D Aeolian, Dorian and Phrygian all hold the pentatonic. Music keeps its sustained pitches at D3 or above and leaves the sub to the bed.
- **The gutter** comes every 60–110 s and lasts 12–16 s (`src/sky.js` ~12), and the bed drone sinks 45 cents in it, so any held D would beat. `f.swellSm` (0..1, written by `bed.update`) follows it; `ctx.sky.flicker.next` is the seconds until the next. Every track will meet a gutter: music fades to silence in about 1.5 s and comes back on its tail.
- **`palette.md`** in the `sound-design` skill says "Not musical: no melody, no chord progression, no pulse". That stays true of the world's sounds; the `music` skill says what is different about music.
- **Why the sound harness is slow**: each render launches headless Chromium, loads the whole world, waits about 10 s, then captures in real time for 20–40 s (the audio is driven by frame updates on the live clock); the survey does that for 14 poses with a fresh page each; the quality gate adds two more renders, about 16 minutes, before every push; and the skill's loop has the agent read two spectrogram images per change.

## The design

**Music is data and arithmetic first, sound second.** A track is a small data file; a pure composer turns it into a note list; everything an agent needs to judge is computed from the note list in plain Node in milliseconds and printed as text. Sound is rendered once a track is green on paper, offline, on a blank page, faster than real time.

`src/audio/music/`:
- `score.js`, pure JS (no Web Audio, no DOM): `compose(track, seed)` → events `{ t, dur, voice, ratio, vel }`. A track: a mode (just ratios from D), a tempo (50–80 BPM or free), voices (a patch, a register, a phrase generator: a drone, a loop of prime-ish length that never realigns with the others, a constrained walk in the mode with a motif that returns), a seeded rng so a track is the same on every visit. 90–180 s long.
- `tracks/<name>.js`: one file a track.
- `patches.js`: pad (two or three saws or squares detuned 5–12 cents into a lowpass at 2–4× the fundamental), organ (sines at 1–4×), flute (triangle and breath noise, slow vibrato), choir (saw through two formant bandpasses), bell; a tape character over the stem (wow ±4 cents at 0.3–0.6 Hz, lowpass about 3 kHz, faint hiss). A fixed pool of 4–6 persistent voices, no node made per note, built from `(ac, dest)` so any `BaseAudioContext` works.
- `player.js`: schedules events on the audio clock about 2 s ahead.
- `director.js`: a pure state machine `step(dt, { weights, place, swellSm, gutterIn, moving })` → actions. First track 60–150 s in; silences 4–9 minutes (lognormal); a setting "Music: off / rare / default / frequent". Pools by region: moor (default); wood; wet (fen, Saltings, Strandline, tarn); cold (Lattice, High Ling, Outwash); garden (Demesne, Bletting); dry (Adust, Lynchets). Specials after 15 s in the place, once a visit: the Span, the keep, the sun's gates (the saddle between the Thrones). Leaving a place: finish the phrase, fade over 8 s. Never start during a gutter or with one less than 20 s off. Fade out on `visibilitychange`.
- The bus: `musicBus` → `master`, its reverb sent straight into the stone room's convolver (music is not in the world; its room does not change as you walk; no fourth convolver), ducked by `swellSm`.

**The harness:**
- `tools/music-score.mjs <track|all>`: Node, text. Gates, to be tuned by M0 against its reference track and written into the skill: every pitch in the mode; pentatonic share ≥ 0.6; phrase endings on D or A ≥ 80%; steps ≥ 60% of melodic intervals, no leap over an octave, range within a twelfth; 4–20 melody notes a minute; rests 30–60% of the melody's time; phrases of 4–9 notes then ≥ 4 s of rest; no two sounding notes 8–70 Hz apart (roughness and mud, by arithmetic); nothing held under 140 Hz; a motif returns (rate 0.2–0.6) and no 16-note run repeats exactly; polyphony ≤ 6; the same seed gives the same list; each pair of tracks differs by a stated distance. `--roll` prints an ASCII piano roll.
- `tools/music-director-sim.mjs`: ten simulated hours of a walker's regions and gutters through `director.js`. Gates: silent ≥ 70% of the time, no start in a gutter, every pool reached.
- `tools/music-render.mjs <track>`: the one audio check. A blank headless page, the modules served by `page.route` (no server, no world), an `OfflineAudioContext`. The stem's loudness −38 to −32 LUFS (at or under the bed), peak, clicks 0, `sharp_db` < −16, `rough` < 0.15 (the meters in `tools/audio-metrics.mjs`), and a WAV for the owner.
- An agent's loop: edit the track's data, run the score tool, read text; render once when green. No image is opened.
- The owner's ear: `?music=<track>` plays a track now; the debug panel lists them; WAVs go to him before release.

## Briefs

| Brief | Scope | Model | Order |
|---|---|---|---|
| **M0** (`brief-v9-M0-score.md`) | `score.js`, `tools/music-score.mjs` and its self-test, the moor reference track, the `music` skill | strong | first, alone |
| **M1** | patches, player, `tools/music-render.mjs` | strong | after M0 |
| **M2** | director, simulator, the bus and ducking, the setting, `?music=` | mid | after M0, beside M1 |
| **M3** | five more region tracks | mid | after M1, beside M4 |
| **M4** | three special tracks (the Span, the keep, the sun's gates) | mid | after M1, beside M3 |
| **M5** | the sound harness made cheaper: spectrograms off by default with a text band-energy table instead, one page for all poses, the extra renders folded in, agents run only their poses and the orchestrator the full gate once a batch; the `sound-design` skill updated | mid | any time |

## Risks

Music nobody has heard that turns out unpleasant: hard gates on the score, the arithmetic roughness check, the owner's WAVs and `?music=` before release, and a first release that leans rare. Mud against the wind: nothing under D3, pads lowpassed, the stem under the bed's level, silence in gutters. Phones: a fixed voice pool, no new convolver, fewer detuned oscillators on the low tier. Autoplay: music uses the context already started on "Go out".

## Sources

ComposerX (arxiv.org/html/2404.18081v1) and CoComposer (arxiv.org/html/2509.00132v1): agents writing symbolic music with theory-based review. MusPy's metrics (muspy.readthedocs.io/en/latest/metrics.html). Eno's incommensurate loops (reverbmachine.com/blog/deconstructing-brian-eno-music-for-airports/). Dungeon synth (en.wikipedia.org/wiki/Dungeon_synth; dungeon-synth.neocities.org/music-making-guide; melodigging.com/genre/winter-synth). Minecraft's music scheduling (minecraft.wiki/w/Music; its delay figures are marked unverified there). Not determined by the research: the offline render's real speed, iOS behaviour, whether the modes and parallel fifths claimed for dungeon synth hold beyond general knowledge.
