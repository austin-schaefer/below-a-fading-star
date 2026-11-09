# The harness

Tools live in `prototypes/wilderness/tools/`. They run against a served build (`tools/serve.sh PORT`, your own port from 8160 up; `B=http://localhost:PORT`). `nice -n 10` in front of every call, one browser at a time. Outputs go to `shots/wip/audio/` (gitignored). The tools are dependency-free beyond the Playwright already used by every other tool; no npm audio packages.

## Render: `tools/audio-render.mjs`

```
node tools/audio-render.mjs "$B/?q=low&pos=-60,20&yaw=1.9" shots/wip/audio/moor-01.wav --seconds=20
node tools/audio-render.mjs "$B/?q=low&only=audio" shots/wip/audio/cue-carillon.wav --cue=carillon --at=0.4,-1.6,0 --opts='{"note":0}' --seconds=6
node tools/audio-render.mjs "$B/?q=low&pos=-190,165" shots/wip/audio/wood-walk.wav --walk=1.4 --seconds=20
```

Loads the page headless, dispatches `begin`, resumes the AudioContext, waits for the master fade, then taps the post-limiter node (`fp.audio.vol`) with an AudioWorklet (ScriptProcessor fallback) into PCM and writes a 48 kHz stereo 16-bit WAV. Options: `--seconds` (default 20), `--cue=name[,name...]` fired at `--at=dx,dy,dz` from the camera 1 s in, with `--opts` JSON, `--every=s` to repeat; `--walk=speed` walks straight ahead (steps fire); `--steps=n` fires n steps standing; `--gutter` holds the sun's gutter (`fp.sky.flicker.hold`); `--seed=n`; `--mono`. Also writes `<out>.json` with the pose, the options and the page's cue log (every cue name fired during the render, with time and distance), so the picture can be read against what happened.

A render is reproducible: same URL, same options, same seed give the same metrics to within 0.2 dB.

## Measure: `tools/audio-metrics.mjs`

```
node tools/audio-metrics.mjs shots/wip/audio/moor-01.wav --spectrogram=shots/wip/audio/moor-01.png --json
node tools/audio-metrics.mjs after.wav --baseline=before.wav
```

Reports, and writes as JSON with `--json`:

| metric | meaning | good (bed at a quiet pose) | good (whole mix, moor walk) |
|---|---|---|---|
| `lufs_i` | integrated loudness, K-weighted (BS.1770-style) | −36 to −30 | −28 to −24 |
| `lufs_s_max` | loudest 3 s short-term | under −24 | under −14 |
| `lra` | loudness range (10th–95th percentile of short-term) | 2–6 | 6–14 |
| `peak_dbfs` | sample peak | under −12 | under −3 |
| `crest_db` | peak over RMS | 10–14 | 12–20 |
| `centroid_hz` | spectral centroid (mean over frames) | 300–900 | 400–1200 |
| `sharp_db` | energy 2–5 kHz over 100–8000 Hz, dB | under −14 | under −10 |
| `rough` | envelope modulation energy share in 15–300 Hz | under 0.15 | under 0.25 |
| `hf_db` | energy above 6 kHz over total, dB | under −20 | under −16 |
| `clicks` | count and times of sample discontinuities (a jump larger than 8 × the local RMS inside 1 ms, with no onset around it) | 0 | 0 |
| `seam_s` | the period, if any, at which clicks repeat (a loop seam) | none | none |
| `onsets_pm` | onsets per minute (spectral flux peaks over an adaptive threshold) | 0–3 | 2–12 |
| `gap_max_s` | the longest stretch with no onset | the whole render | ≥ 15 |
| `gap_min_s` | the shortest gap between onsets | — | ≥ 0.3 |
| `silence_pct` | share of frames under −60 LUFS momentary | 0 | 0 |

With `--baseline`, every metric is printed as before → after with the difference, and the spectrograms are written side by side.

The spectrogram: log-frequency 40 Hz–16 kHz, 20 s across 1600 px, dB colour from −90 (black) to −20 (white) with a fixed scale so two pictures compare, time ticks every second, the cue log's events marked along the top. Look at it: a seam click is a vertical hairline repeating at the loop period; sharpness is a bright band at 2–5 kHz; a resonant whistle is a thin horizontal line; pumping is the whole picture dimming after every transient; a static bed is a picture with no shape left to right.

## Survey: `tools/audio-survey.mjs`

```
node tools/audio-survey.mjs $B --out=shots/wip/audio/survey-<label> [--only=moor,fen] [--baseline=shots/wip/audio/survey-before]
```

Renders every pose in `tools/audio-survey.json` (a name, `pos`, `yaw`, seconds, options such as `walk` or `gutter`, and the metric bands that pose must sit in), measures each, writes the WAVs, PNGs and one `survey.md` table (pose × metric, each cell marked when out of its band), and `survey.json`. With `--baseline` the table shows both and the deltas. Exit 1 when a gated band fails. The poses are the listening stations of this world: open moor standing and walking, the wood, the fen edge, the tarn, the canyon rim, the keep's court, the Lattice, a gutter on the moor, the Leerie's row in a gutter, the Demesne in a gutter (the peafowl), and a hurry across the moor. Add a pose when you add a place with a sound.

## Gates (`tools/audio-quality-test.mjs`)

Run before every push, after `audio-test.mjs`:
- No clicks and no seam period in any survey render.
- Every pose inside its loudness band (`lufs_i`, `lufs_s_max`), sharpness and roughness caps.
- `gap_max_s ≥ 15` at every moor pose; `onsets_pm` inside the band at every pose.
- Limiter engagement: gain reduction over 1 dB for less than 1 % of frames (measured by rendering the pre-limiter tap alongside and comparing).
- Determinism: two renders of the first pose agree within 0.2 dB on `lufs_i`.

Zero checks reported is a failure.

## Listening log

Keep `shots/wip/audio/LOG.md` as you work, one line per render: pose or cue, what changed, before → after on the metrics that matter, keep or revert, and what a listener should hear. Your hand-back points at the renders worth the designer's ears, with that line for each.
