# Sources

Research done 2026-11-09 for the v7.2 sound pass. Three strands: how practitioners design ambiences, why synthesised sound reads as harsh, and how a text-only agent can judge audio. Nothing found describes an agent harness for sound design end to end; the loop in `SKILL.md` (render, measure, look, change one thing, log for a listener) is this repo's synthesis of the parts below.

## Ambience craft

- Three tiers (bed, detail, punctuation), with equal loudness across layers named as the common fault that makes a mix muddy; events spaced in time rather than filled; per-layer randomisation by probability, start offset and delay; a few variants per component multiply into many outcomes. Wayline, "Adaptive Ambient Audio" (wayline.io/blog/adaptive-ambient-audio-game-atmosphere); Berklee Online, "How to Make Your Interactive Game Soundscapes Come Alive"; A Sound Effect, "Why Procedural Game Sound Design is so useful".
- Wind as layers (bed, gusts, turbulence, whistles) with wind speed mapped to their relative levels and filter parameters; static loops read as noise the brain tunes out. Kääriä, "Designing Immersive and Adaptive Wind Soundscapes for Interactive Media" (Theseus, 2025). Farnell, *Designing Sound* (MIT Press, 2010): sound as a process built from analysis; the wind, water, fire and bird models the craft file paraphrases.
- Silence as structure: gaps give a piece its shape; a sound after stillness hits harder; a texture that never stops flattens the mix; "silence" is low-level room tone, the negative space foreground is defined against. Designing Sound, "The Negative Space of Sound" (2014) and "Creating the Spaces of Ambience" (2012).
- Open-world practice: ambient generators placed automatically across a map and balanced against time and resources (Dying Light 2, GDC 2023); adaptive ambience by time, weather and region (Ghost of Tsushima, GDC 2021); ambience and acoustic systems (Hellblade II, GDC 2024); frequency range, density, loudness and balance as the levers on feeling (GDC 2024 Audio Summit, "How Sound Can Make You Feel").

## Why it sounds harsh

- Psychoacoustic *sharpness* (acum, DIN 45692) weights spectral energy above about 1 kHz and grows steeply through 2–5 kHz; *roughness* (asper) is amplitude modulation at 15–300 Hz, heard as harshness or beating; Zwicker & Fastl's annoyance model combines loudness, sharpness, roughness and fluctuation strength, and sensory pleasantness runs inverse to sharpness. Zwicker & Fastl, *Psychoacoustics: Facts and Models*; metricgate.com "Psychoacoustic Annoyance"; the `math-dsp` crate's psychoacoustics module as a compact reference implementation.
- Clicks come from envelopes that retrigger or jump and from filter modulation clipping; the fixes are a short attack (a few ms), a declick ramp and a floor above zero. KVR, Beepstreet and Elektronauts threads on synth clicks. Web Audio guidance: a filter Q of 2–5 for focus without harshness, 15 "too resonant, harsh" (the `generating-sounds-with-ai` skill, raphaelsalaja).

## How an agent judges audio

- Loudness: ITU-R BS.1770 K-weighting (two biquads, mean square, gating) is implementable in a few dozen lines and in the browser (needles, domchristie; a DEV Community walk-through on an OfflineAudioContext). Reference levels: streaming −14 LUFS, broadcast −23 LUFS; this repo's targets in `harness.md` are relative to those.
- Spectrograms and features for comparing renders: L1/RMSE between log-mel spectrograms, DTW over MFCCs; CLAP text–audio similarity on windows under 30 s (useful but contested as a judge; loudness must be measured directly since many embeddings discard it). "Evaluating Prompt Robustness in Text-to-Audio Systems" (arXiv 2603.13824); "Probing Low-Level Acoustic Attribute Encoding in CLAP" (arXiv 2607.03806); BRACE (arXiv 2512.10403); "Towards Evaluating Generative Audio: Neural Audio Codec Embedding Distances" (arXiv 2509.18823).
- Offline rendering as the test substrate: Spotify's Web Audio Bench runs its tests in an OfflineAudioContext with an AudioBufferSourceNode as the source. This build's audio is driven by per-frame updates on the live clock, so the harness taps the live graph in a headless page instead.
- Existing agent skills for Web Audio synthesis (ui-sound-design-skill, dannyjpwilliams; game-audio, opusgamelabs; sound-engineer, erichowens) generate code from descriptions and preview it; none renders, measures and gates. That gap is what `tools/audio-render.mjs`, `audio-metrics.mjs`, `audio-survey.mjs` and `audio-quality-test.mjs` fill.

Not reachable from this session's network (worth reading on a machine that can): the Kääriä thesis PDF, the two Designing Sound essays, Game Developer's "Deep Dive: Sound design for the living world in Avatar: Frontiers of Pandora".
