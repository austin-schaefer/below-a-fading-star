# v7.2-04: the cues

Read `_common.md` first. You own `src/audio/cues.js` (every named one-shot from `cry` to `hawser-groan` and the fall loop), `src/audio/living.js` (the v7 figures' sounds) and `src/audio/steps.js` (footsteps, the step record, the Repetend's echo). Austin's words you answer: "unpleasant", "too rare".

## First: the gutter

Austin: "the worse noise is the one when sun gutters." The sounds the gutter fires are yours to re-voice before any other: the peafowl cry (raw sawtooth, `setValueAtTime` 820 → 980), `bats-out`, `eyes-close`/`eyes-open`, `lamp-tick`. Render each with `--cue` first; after re-voicing, none shows `clicks`, `rough` over 0.3 or `sharp_db` over −6, and the peafowl is a formant cry in the key with a glide, not a jump.

## The fault (confirm with `--cue` renders on `?only=audio`; render every cue once at its audio-test offset into `shots/wip/audio/cues-before/` and run metrics on each; the table is your baseline)

Raw sawtooth with little filtering: cry, crows, yelps, tarn hum, traveller-greet, caws, peafowl, the coheirs hum. Square sources: the deodand click (1500 Hz), pedlar, caw rough. `setValueAtTime` jumps on pitch (peafowl 820→980) and on gains. Transients at 0.35–0.5 gain that pump the limiter (grouse crack 0.5, mole click 0.35, hawser thud 0.36, the flare). Footstep pitch 0.85–1.2 and level 0.8–1.2 per step. The distinctive cues ranged and gained below meaning: sward-whimper 5 m at 0.012–0.03, lizard-skitter 6 m, biomesh-settle 10 m, glyph-shift 15 m, wrong-colour-near 0.02, procession 0.02, bats' chirps 0.006; the living's one-shots mostly linear-to-silence at 15–30 m. Meanwhile cry at 0.09 and crows at 0.13 carry.

## What to build (`craft.md` "Waveforms and filters", "Envelopes", "Footsteps"; `palette.md`; decisions 1, 5, 6)

- **Every voice a voice.** Each cry, caw, hum and greet becomes a formant structure (one or two bandpasses, Q 2–6, over a buzzy or breathy source) with a pitch contour and an envelope that breathes; the key is D minor pentatonic where a sound is pitched (the tarn hum drifts between two of its notes; the Lattice and coheirs hums on A or D). Nothing bare reaches a bus. Every parameter change is a ramp or `setTargetAtTime`; attack ≥ 3 ms (noise) / 10 ms (tones); release ≥ 40 ms.
- **Transients scaled at the source** so the master's gain reduction over 1 dB is under 1 % of blocks on the keep's court render with a carillon peal and the hawser (the `--pre` comparison in `audio-quality-test`). Loud still means loud: the hawser is the loudest thing on the walk, but at −14 LUFS short-term, not clipping into the net.
- **Range and level by meaning.** The living's signatures (`living.js`) audible from 20–60 m with inverse rolloff and the air lowpass, not linear-to-silence at 15; sward-whimper, skitter, biomesh, glyph-shift, wrong-colour, procession, bats raised to where a walker who looks at the thing hears it (`palette.md`'s table says which tier each is). The generic cry and crows come down 6–9 dB and get the air lowpass (if `voice()` already applies it, make sure they go through it). Update `tools/audio-test.mjs`'s offsets only where a range moved and the old offset is now outside it (the count must not fall).
- **Footsteps:** per ground kind two or three timbral variants (filter and noise colour, not pitch), ±3–5 % pitch, ±2 dB, a heel–toe pair 60–120 ms apart when hurrying, a lowpass by ground (grass dull, stone bright), the first step after standing a little louder; `echoStep` keeps its 1.0 s and the audio-test's timing check. Level: 8–12 dB over the bed on the moor walk.
- **The keepers** (`index.md` "Keep") stay as they are in character: the carillon, the stones, the glyph and hawser grinds, the heartbeat, the lap. Re-check their envelopes for jumps and their transients for pumping; nothing else.

## Done when

- Every cue rendered after into `shots/wip/audio/cues-after/`; a table (cue × `sharp_db`, `rough`, `peak_dbfs`, `clicks`, before → after) in your log and in the report's summary: no cue with `clicks`, none with `rough` over 0.3, none with `sharp_db` over −6 unless it is a deliberate bright transient under 300 ms (say which).
- The survey's moor-walk pose: steps 8–12 dB over the bed; `lufs_s_max` under −14.
- `audio-test.mjs` at its full count on both URLs; everything in `_common.md`.
