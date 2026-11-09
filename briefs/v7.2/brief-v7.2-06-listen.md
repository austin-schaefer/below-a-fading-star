# v7.2-06: the listening review

Read-only. You are the ears the four voicing agents did not have. Repo: Fading Planet; prototype `prototypes/wilderness/`. Read first: `AGENTS.md`, `.agents/skills/wilderness/SKILL.md`, all of `.agents/skills/sound-design/`, `briefs/v7.2/index.md` and the four voicing briefs (02–05). You review the merged working branch (given in the dispatch message, served on your port) against `briefs/v7.2/audio/baseline/`.

## Do

1. Run `node tools/audio-quality-test.mjs $B` and `node tools/audio-survey.mjs $B --out=shots/wip/audio/survey-after --baseline=<the baseline dir the orchestrator names>`. Record every red cell and whether the owning brief promised it green.
2. Look at every spectrogram, before and after, side by side. For each pose write three lines: what the picture shows changed, whether it matches the brief's intent, and anything the metrics did not catch (a whistle line, a periodic hairline, a flat picture, a dim-after-transient).
3. Render the cue table (`--cue` on `?only=audio`, every cue once, 6 s each) and run metrics; flag any cue with `clicks`, `rough` over 0.3, `sharp_db` over −6, or `peak_dbfs` over −3.
4. Read the diff of `src/audio/` and `src/v4/regions/*.js` against the merge base cold, against the briefs: scope creep, invented content (a new creature, place or name), `Math.random`, bare oscillators to a bus, `setValueAtTime` on audible params, any band loosened in `audio-survey.json`, any level lowered to pass a gate.
5. Choose **ten renders for Austin**, each 15–25 s, that together show the before/after and the breadth of the world: the moor standing (before and after as two files), the moor walk, the wood, the fen, the keep's court with a peal, the canyon rim, a gutter on the moor, the Leerie's row in a gutter, the Lynchets with the living, the hawser. For each, one line: where it is, what to listen for, which numbers moved. Render them with `audio-render.mjs` into `shots/wip/audio/samples/` as `NN-<place>[-before|after].wav` with their `.json` beside, and run `ffmpeg -i x.wav -c:a libmp3lame -q:a 2 x.mp3` on each if `ffmpeg` is present (the WAVs are the record either way).

## Report (under 400 words)

Blockers (a red gate a brief promised green, invented content, a seam, a bare oscillator) with the owning brief; the survey table's headline before → after; three things that got better and three that are still weak, with the pose and the metric; the ten samples with their lines. No edits, no commits.
