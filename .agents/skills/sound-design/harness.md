# The harness

Tools live in `tools/`; run them from the repository root. They run against a served build (`tools/serve.sh PORT`, your own port from 8160 up; `B=http://localhost:PORT`). `nice -n 10` and `SHOT_ANGLE=metal` in front of every call, one browser at a time. Outputs go to `shots/wip/audio/` (gitignored; never commit a WAV or PNG). The tools print text first: every metric and a band-energy table. Images are drawn only when asked for (`--images` on the survey, `--spectrogram` on the metrics tool). The tools are dependency-free beyond the Playwright already used by every other tool; no npm audio packages.

## Render: `tools/audio-render.mjs`

```
node tools/audio-render.mjs "$B/?q=low&pos=-60,20&yaw=1.9" shots/wip/audio/moor-01.wav --seconds=20
node tools/audio-render.mjs "$B/?q=low&only=audio" shots/wip/audio/cue-carillon.wav --cue=carillon --at=0.4,-1.6,0 --opts='{"note":0}' --seconds=6
node tools/audio-render.mjs "$B/?q=low&pos=-190,165" shots/wip/audio/wood-walk.wav --walk=1.4 --seconds=20
node tools/audio-render.mjs "$B/?q=low&pos=-60,20&yaw=1.9" shots/wip/audio/moor-gutter.wav --gutter
```

Loads the page headless (autoplay allowed), waits for `body.ready` and then 6 s more (`--settle=<s>`: headless Chromium starves the page's main thread for several seconds if the audio starts sooner, so walks crawl and cues fire late), sets volume 100 and unmuted, dispatches `begin`, resumes the AudioContext, waits out the master's 4 s fade, then taps the post-limiter node (`fp.audio.vol`) with an AudioWorklet (a Blob-URL module; ScriptProcessor if the worklet will not load) and writes a stereo 16-bit WAV at the context's own rate (44.1 kHz in the cloud container; whatever the machine's output runs at elsewhere). The page loads with `?render=0` (every frame's updates, no draw: the picture is not looked at, and software GL would starve the clock); `--draw` keeps the picture.

Options: `--seconds` (default 20); `--cue=name[,name...]` fired 1 s in at the camera plus `--at=dx,dy,dz` (world axes, as `tools/audio-test.mjs`'s offsets), with `--opts` JSON, `--every=s` to repeat; `--walk=m/s` holds W from the first sample (3.6 is the walk; above 3.6 it hurries with Shift, 6.6 the hurry; other speeds through `?speed=`), steps fire; `--steps=n` fires n of the walker's steps standing, 0.59 s apart from 1 s; `--gutter` starts a real gutter 1 s in (the sun's own course, `fp.sky.flicker.next = 0`, its length pinned at 14 s by adding `gutter=14,600` to the url, since `sky.js` draws it from `Math.random`); `--gutter-hold=v` pins the flicker at v instead; `--pre` taps the master (pre-limiter) as 32-bit float and writes the post-limiter tap of the same render, sample-aligned, to `<out>.post.wav`; `--mono`. Without `--gutter` the gutter is held off for the render (it is drawn from `Math.random` in `sky.js`), so two renders of a pose are a fair pair.

The render loads the world for itself, so it costs a world load (about 25 s) on top of the settle, the fade and the capture. A run of many poses should go through the survey, which loads the world once (`openSession` in `tools/audio-render.mjs`: one page, `capture()` for each pose, the player moved to the pose with `pos`/`yaw` as the url would set them, the gutter held off, the bed given `--between` seconds to settle).

Also writes `<out>.json`: the url, the options, the rate, the frame rate during the fade and the render (a note when under 30 fps), the pose at start and end and the distance walked, the region, the gutter's start, floor and end, and the cue log: every `audio.cue` call (name, time, distance from the camera, opts), every new one-shot voice (with the cue that made it, and its distance), every step, the gutter, in seconds from the WAV's first sample.

**Seed.** The page has no seed parameter (`WORLD.seed` is fixed); `--seed` is recorded and ignored. A render is reproducible by url, options and length: two renders of a standing pose agree on `lufs_i` within 0.2 dB (the quality test checks it).

## Measure: `tools/audio-metrics.mjs`

```
node tools/audio-metrics.mjs shots/wip/audio/moor-01.wav --json
node tools/audio-metrics.mjs after.wav --baseline=before.wav
node tools/audio-metrics.mjs shots/wip/audio/moor-01.wav --spectrogram=shots/wip/audio/moor-01.png   # only when text leaves a question
node tools/audio-bands.mjs shots/wip/audio/moor-01.wav [--slices=4] [--baseline=before.wav]
node tools/audio-metrics.mjs shots/wip/audio/moor-01.wav --clicks
node tools/audio-metrics-selftest.mjs
```

Reads 16/24/32-bit PCM and float WAVs. Prints every metric and then the band-energy table (below); `--json` writes `<wav>.metrics.json` (with a `detail` block: click times, seams, the repeat correlation, onset times, how many onsets were steps); `--clicks` lists every click. When `<wav>.json` (the render's cue log) sits beside the WAV it is used: the walker's steps are left out of onsets, a logged sound's own attack is not a click, and the spectrogram marks the events. `audio-metrics-selftest.mjs` checks every metric on synthetic signals made in Node (40 checks; exit 1 on a failure).

| metric | meaning | good (bed at a quiet pose) | good (whole mix, moor walk) |
|---|---|---|---|
| `lufs_i` | integrated loudness per BS.1770: K-weighting (shelf and RLB high-pass), 400 ms blocks every 100 ms, gated at −70 LUFS and −10 LU | −36 to −30 | −28 to −24 |
| `lufs_s_max` | loudest 3 s short-term (every 100 ms) | under −24 | under −14 |
| `lra` | loudness range per EBU Tech 3342 (short-term, gated −70 and −20 LU, 95th less 10th percentile) | 2–6 | 6–14 |
| `peak_dbfs` | sample peak | under −12 | under −3 |
| `crest_db` | peak over RMS | 10–14 | 12–20 |
| `centroid_hz` | spectral centroid, mean over 2048-sample frames above −90 dBFS | 300–900 | 400–1200 |
| `sharp_db` | energy 2–5 kHz over 100–8000 Hz, dB (white noise reads −4.2, pink −6.8) | under −14 | under −10 |
| `rough` | periodic envelope modulation at 15–300 Hz: in each octave band 125 Hz–8 kHz the power envelope's modulation spectrum (3 s segments averaged), the energy of its lines (bins over 3× the local median, less that floor) over the envelope's mean squared, weighted by the bands' energy. Noise of any colour reads ~0; a tone AM'd at 70 Hz at full depth 0.9; noise square-gated at 25 Hz 0.8 | under 0.15 | under 0.25 |
| `hf_db` | energy above 6 kHz over total, dB | under −20 | under −16 |
| `clicks` | discontinuities: in an order-16 linear-prediction residual (which whitens a filtered bed so a jump stands out even after a filter), a sample over 8× the residual's RMS in the 20 ms round it, above −90 dBFS, with no onset round it (the 20 ms after within 10 dB of the 20 ms before) and not within a logged sound's attack; plus weaker ones (over 5×) that repeat at a seam period | 0 | 0 |
| `seam_s` | the period at which discontinuities repeat (three or more agreeing within 1.5 ms) | none | none |
| `repeat_s` | the period at which the sound repeats itself (a looped buffer, seam or not): the self-correlation of the band levels (gusts taken out, logged sounds masked) at lags 1–15 s, reported from 0.2 | none | none |
| `onsets_pm` | onsets per minute: spectral flux in ~20 bands, each band's rise over its own 35–140 ms past divided by that rise's robust spread, peaks over 10 and over the local median plus 3 MAD; the walker's logged steps left out | 0–3 | 2–12 |
| `gap_max_s` | the longest stretch with no onset, the render's ends included | the whole render (≥ 19 of 20 s) | ≥ 15 |
| `gap_min_s` | the shortest gap between onsets | — | ≥ 0.3 |
| `silence_pct` | share of 400 ms blocks under −60 LUFS | 0 | 0 |

A loop seam is mostly not a click. The baseline found no measurable discontinuity at the zeroed crossfade of `makeNoiseBuffer`, even in a wind layer rendered alone: in brown and pink noise a jump to zero is no larger than the noise's own increments, and the 46 ms fade-in after it is masked by the other layers. What does show is the loop itself: the moor's bed repeats every 7.00 s (`repeat_s`, correlation 0.43 standing). A crossfade fix alone leaves `repeat_s` at 7; longer, staggered or re-offset buffers move it.

With `--baseline`, every metric prints as before → after with the difference and the band table shows the whole-render change; with `--spectrogram` as well, the two spectrograms are stacked in one PNG, before above (default `<after>.compare.png`).

**The band-energy table** (`tools/audio-bands.mjs`, printed by the metrics tool, the survey and the quality gate) is the spectrogram as numbers: octave bands 63 Hz to 16 kHz in dB (0 = a full-scale sine's power, so a bed at −40 in a band is a sine of amplitude 0.01 there), a row a quarter of the render, a `whole` row, and a `swing` row (loudest slice less quietest, per band). Read it as the picture: balance is a row (the bed's weight is in 63–500 Hz; sharpness is 2k and 4k standing proud of 1k; a bright hiss is 8k and 16k near 4k); change over time is a column (a gust is a swing of 6–10 dB in 125–500 Hz; a constant bed under 2 dB; a one-shot is a single slice 10 dB over the rest in its own bands; a seam or a loop is not visible here, `seam_s` and `repeat_s` carry it). The table shows level, so a tone and a noise of the same band energy look alike; a whistle is the one thing the picture shows and the table does not (a band 15 dB over both neighbours at a pose that has no business having one is the table's version of it, and `--images` settles it).

The spectrogram: log-frequency 40 Hz–16 kHz on 512 rows, 80 px a second (1600 px for 20 s), dB colour from −90 (black) through purple and orange to −20 (white) on a fixed scale so two pictures compare (a full-scale sine is 0 dB), the 2 kHz and 5 kHz rows dotted (the sharpness band), ticks every second along the bottom, and along the top: the gutter as a magenta bar, each voice as a labelled tick (cue name and metres), a cue call that made no voice as a short dim tick, steps as grey ticks. Look at it: a seam click is a vertical hairline repeating at the loop period; sharpness is a bright band between the dotted rows; a resonant whistle is a thin horizontal line; beating sub-bass is vertical striping under 80 Hz; pumping is the whole picture dimming after every transient; a static bed is a picture with no shape left to right.

## Survey: `tools/audio-survey.mjs`

```
node tools/audio-survey.mjs $B --poses=moor-walk,wood-stand --out=shots/wip/audio/survey-<label> [--baseline=shots/wip/audio/survey-before]
node tools/audio-survey.mjs $B --out=shots/wip/audio/survey-<label>      # the whole survey: the orchestrator's, once a batch
```

Renders every pose in `tools/audio-survey.json` (a name, the place in words, url `params` added to `$B/?q=low&`, seconds, render options such as `walk` or `gutter`, and the bands that pose must sit in: `min`/`max`, `none: true` for a metric that must be absent, `gated: true` for one that fails the survey) in sequence, one browser and a fresh page a pose (about 40 s each: 8 s to load the world, 6 s settling, 4.5 s of fade, 20 s of tap), measures each, and writes the WAVs, cue logs, metrics JSON, one `survey.md` (pose × metric, `!` when out of band, `!!` when out of a gated band, then the poses, the bands, and **each pose's band-energy table**) and `survey.json`. The log prints each pose's metrics line, and for four poses or fewer its band table too: that is what you read. **No images** unless `--images` (a spectrogram `<pose>.png`, and with `--baseline` a `<pose>.compare.png`).

`--poses=a,b` (alias `--only`) takes names or prefixes (`--poses=moor` is the three moor poses and the gutter); a partial run into a directory that already holds a survey replaces those poses and keeps the rest. An implementing agent runs its own poses (and one it must not move); the whole survey, and the quality gate, are the orchestrator's once per batch. `--remeasure` measures the WAVs already there again (after a change to the metrics) without rendering. With `--baseline` the table shows before → after in every cell and each pose's band table the whole-render change. Exit 1 only when a gated band fails.

**`--one-page`** loads the world once and moves the player from pose to pose (`--between=s`, default 8, for the bed to settle), about 29 s a pose instead of 40 (the whole survey in 9 minutes instead of 11.7). It does not give the numbers a fresh page gives, and that is not a bug to fix in the tool: the audio's gusts, its schedulers and the world's creatures all run on one clock from `begin`, so the nth pose of a page meets a different stretch of that clock. Against the fresh survey, the 16 poses: `lufs_i` within 0.5 dB on 7, 0.8 to 4.1 dB off on the other 9 (the Lynchets −24.8 → −28.9, the Sunken Court −30.5 → −33.6, the Demesne gutter −32.0 → −34.8), `rough` 0.02 → 0.26 at the wood (a call landed in the window; 1.7 in another run of a shorter list), clicks 69 → 238 at the house court. The first pose of a page is identical to the fresh one. Two `--one-page` runs of the same `--poses` list agree (`lufs_i` within 0.3 dB, three poses compared; `rough`, which is event-driven, does not). So use it for a scan and compare it only with another `--one-page` run of the same list in the same order; never with the baselines, never against a band, never as a gate.

The poses are the listening stations of this world: the open moor standing, walking and hurrying (−60, 20), the Deodand Wood at the moss light, the fen's south edge, the tarn's north shore, the canyon rim, the Sunken Court, the Lattice's north foot, and three gutters: on the moor, at the Leerie's row, and at the Demesne by the peafowl (who cry at every gutter). Bands are the table's: the quiet-pose column for the standing moor and the wood, the whole-mix column elsewhere (`gap_max_s` left out at the fen, the tarn and the canyon, which are water and life). Add a pose when you add a place with a sound; never loosen a band to pass.

Gated now: on the moor poses `clicks`, `seam_s`, `lufs_s_max`, `sharp_db`, `gap_max_s`; on the three gutter poses `sharp_db`, `rough`, `lufs_s_max`, `clicks`. A voicing agent gates the rest of its own metrics as it turns them green. The baseline, the sound before v7.2 (taken after the split and its loop-seam fix, at 22d0ff0), is `briefs/v7.2/audio/baseline/survey.md`. What it says: the gutters are the roughest thing in the world (`rough` 0.29–0.35, nearly all from a 78 Hz beat in the 125 Hz octave, which holds 44–52 % of a gutter's energy) and the loudest (−24 LUFS against the moor's −27); the moor's bed alone integrates at −27.4, 3 dB over the quiet-pose band, and dominates the court, the tarn and the canyon alike (−27.1 to −27.4); every centroid sits at 116–350 Hz, under both centroid bands, because the sub-bass carries the mix; loudness range is 1.8–3.9 LU everywhere (nothing breathes); and every standing bed repeats at 7.0 s, the seam fix notwithstanding. Sharpness is green at every pose (−14.8 to −21.6 dB): the insects' ticking is real but small in the whole mix; judge it on a cue or region render.

## Gates: `tools/audio-quality-test.mjs`

```
node tools/audio-quality-test.mjs $B
```

Run before every push, after `audio-test.mjs`; the orchestrator's, once per batch, not an implementing agent's after each edit. About 12 minutes in one browser, into `shots/wip/audio/quality-<timestamp>/`:
- The survey: one check a pose that it rendered, one a gated band.
- Limiter engagement: the moor walk is rendered once with `--pre` as part of the survey (its survey numbers are those of the post-limiter tap of that same render, so this check costs no render of its own); the post tap lined up on the pre tap past the compressor's look-ahead (6 ms in Chromium, found by correlation), then per 50 ms block the post/pre level difference less its median (the compressor's fixed makeup gain, +4.6 dB at the baseline) is the gain reduction; reduction over 1 dB in under 1 % of the blocks above −70 dBFS. `--rescore=<pre.wav>` scores an existing `--pre` render. At the baseline the limiter never acts on the moor walk (worst block 0.0 dB).
- Determinism: the first pose rendered again, last, agrees with the survey's render within 0.2 dB on `lufs_i`.

Prints `PASS`/`FAIL` lines and a count; exit 1 on any failure; zero checks is a failure. `--only=<pose,...>` runs a subset for a quick look (the walk is added for the limiter check; not for a push).

## Listening log

Keep `shots/wip/audio/LOG.md` as you work, one line per render: pose or cue, what changed, before → after on the metrics that matter, keep or revert, and what a listener should hear. Your hand-back points at the renders worth the designer's ears, with that line for each.
