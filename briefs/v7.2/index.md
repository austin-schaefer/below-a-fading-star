# v7.2, the sound: the briefs

Written 2026-11-09 from Austin's words (`wilderness-v7.2.md`), a cold read of `src/audio.js`, `src/audio/synth.js`, `src/audio/living.js` and the regions' sound hooks at `38d9106` (main after v7), and the research in `.agents/skills/sound-design/SOURCES.md`. Seven briefs: two foundations, four voicing passes, one listening review.

## Austin's second note (2026-11-09)

"I forgot to mention the worse noise is the one when sun gutters. I end up playing muted because every time it triggers I have to mute, it's so unpleasant."

So the gutter is the first thing to fix and the first thing to listen to. Today it stacks everything at once: the drone bus rises 0.1 → 0.5 (14 dB) and detunes −260 cents over the gutter, the shimmer sines (1822/2417/3105 Hz, unrelated to any key) come up five-fold, every peafowl in the Demesne cries on a raw sawtooth with a `setValueAtTime` pitch jump, bypassing the voice cap, the bats leave, the eyes close, the lamps tick, the wind ducks and comes back. Every brief that touches a gutter-locked sound treats it as its first render and its first fix; the survey's gutter poses (moor in a gutter, the Leerie's row, the Demesne) are gated on `sharp_db`, `rough`, `lufs_s_max` and `clicks` from the start. The target, in words: the gutter is felt as a dip in everything, the drone comes up as a floor you feel more than hear, and the few living that react do so from their places, not as a chorus. If the baseline render of the gutter is the worst picture in the survey, that is expected.

## What is wrong (the cold read, in the designer's three words)

**Random.** `distantCall` (audio.js ~1207) fires every 8–22 s, uniform, at a random bearing 140–300 m off, one of four kinds drawn uniformly, with no emitter ("so the quiet is never empty"). Every scheduler in the file is `base + rng() * span`: memoryless, unphrased, no rests, no answer. Crows fire with no position and always sound from (65, 34, 30) (~496). Footstep pitch wanders 0.85–1.2 (~248). The pitched sounds have no shared key (drone E/G/A, shimmer at 1822/2417/3105 Hz, carillon D pentatonic, hums on G). The gutter uses `Math.random` (sky.js:173,178).

**Unpleasant.** `makeNoiseBuffer` (synth.js:16) multiplies its crossfade tail by `* 0`, so every looped noise bed thumps at its loop period (7 s brown, 5 s pink) and the Q 14/18 tor moan and Q 9 insects ring each thump into a tone. Raw sawtooth with little filtering on cry, crows, yelps, tarn hum, greet, caws, peafowl, the gate, the wasp, the coheirs hum. Square-wave gating on the insects (17–31 Hz), frogs, the deodand click, pedlar and caw. Dense ticking beds at 3.6–6.5 kHz (adust, outwash, grasshoppers, insects). Sub-bass drone at a major second (48.6/55.1 Hz) swinging −260 cents. `setValueAtTime` pitch jumps (peafowl 820→980). Transients of 0.35–0.5 gain pumping a ratio-8 limiter. One 3.2 s reverb for moor, wood and keep alike.

**Omnipresent and rare.** Wind (gusts floored at 0.4), drone (0.1), shimmer (0.004) and insects never pause. The distinctive cues are tiny: whimper 5 m at 0.012–0.03, skitter 6 m, biomesh 10 m, glyph 15 m, wrong-colour 0.02, procession 0.02, bat chirps 0.006; and gated to a gutter every 60–110 s. Meanwhile the generic cry (0.09) and crows (0.13) recur everywhere.

**Keep:** the voice system with its air lowpass and steal fade (~409–452), lead-time scheduling against clock staleness, the carillon's bell partials on a just minor pentatonic, the stones' partials and approach hysteresis, the Lattice hum, the stick-slip grind (glyph, hawser), the heartbeat tied to gaze, the strandline lap locked to the waves, the gutter drone tied to world state, `living.js`'s loop lifecycle, the step record and replay (Repetend), the wind-by-openness model.

## The briefs

| Brief | Branch / worktree | Model | Owns | Shared files (a line or two at most) |
|---|---|---|---|---|
| `brief-v7.2-00-harness.md` | `v72-harness` | Opus | `tools/audio-render.mjs`, `audio-metrics.mjs`, `audio-survey.mjs`, `audio-survey.json`, `audio-quality-test.mjs`; the baseline survey; `.agents/skills/sound-design/harness.md` numbers | `.agents/skills/wilderness/runtime.md` (one paragraph), `README.md` |
| `brief-v7.2-01-split.md` | `v72-split` | Opus | the split of `src/audio.js` into `src/audio/{graph,bed,steps,calls,cues,regions}.js`, behaviour-preserving; the loop-seam fix in `synth.js` | `src/audio.js` (becomes the thin entry), `.agents/skills/wilderness/modules.md` (one row) |
| `brief-v7.2-02-bed.md` | `v72-bed` | Opus | `src/audio/bed.js`, `synth.js`: wind, drone, shimmer, insects, the gutter's dip | `src/audio/graph.js` (bus names only) |
| `brief-v7.2-03-events.md` | `v72-events` | Opus | `src/audio/calls.js`, `src/audio/regions.js`, the sound hooks in `src/v4/regions/*.js`, the fauna call sites that pass no position | `src/fauna/small.js`, `src/fauna/wings.js` (position args only) |
| `brief-v7.2-04-cues.md` | `v72-cues` | Opus | `src/audio/cues.js`, `src/audio/living.js`, `src/audio/steps.js`: every one-shot's voicing, range and level; footsteps | `tools/audio-test.mjs` (ranges in the table, if a range moves) |
| `brief-v7.2-05-space.md` | `v72-space` | Opus | `src/audio/graph.js`: master chain, limiter staging, three reverbs and their sends, the distance model (`voice()`), listener; the `sky.js` `Math.random` | `src/sky.js` (two lines) |
| `brief-v7.2-06-listen.md` | read-only | Opus | the listening review: the survey before and after, every render looked at, the ten samples for Austin chosen | none |

## Order

0. **Foundations, two at once:** 00 harness and 01 split. Disjoint files. The harness's baseline survey runs on the unsplit code (the sound is identical either way; the split is behaviour-preserving and `audio-test` proves it).
1. **Voicing, four at once:** 02 bed, 03 events, 04 cues, 05 space, each in its own worktree branched from the working branch after 00 and 01 are merged. Each owns its files above; `graph.js` is 05's, and 02–04 read its bus names and ask (a comment in the brief) rather than edit. Every agent runs the survey before and after and attaches its `LOG.md` lines.
2. **Listen:** 06 runs the survey on the merged result against the baseline, looks at every spectrogram, reports, and names the ten renders for Austin with a line each. Blockers go back to the owning agent.
3. **Release:** `RELEASES.md` v7.2 entry, the suite, the ten samples to Austin.

## Shared-file hot spots

- `src/audio.js` after the split is the entry (`build(ctx)`, the exported surface, the mute button) and should not need a voicing agent's edit; if it does, one line.
- `src/audio/graph.js` is 05's: buses, master, limiter, reverbs, `voice()`, listener. 02–04 may call what it exports; if an export is missing, add a one-line export with a `// v7.2-0n:` comment and tell the orchestrator in the report.
- `tools/audio-test.mjs`: the cue table's offsets must stay inside each cue's range; 04 updates the table when it moves a range. The check count must not fall.
- `tools/audio-survey.json`: 00 writes it; voicing agents may add a pose for a place they voice, never change a band to pass.
- `.agents/skills/wilderness/runtime.md` and `modules.md`: one paragraph (00) and one row (01); keep-both merges.
- `README.md`: 00 adds the harness to "Also here" in one line.

## Decisions (defaults the briefs build; the carrying commit says so)

1. **Tonal centre D** (the carillon's just minor pentatonic on D3: D F G A C). The drone moves to D and A; the shimmer and the Lattice hum to the fifth or octave; the stones stay (Dm7 fits). Beating stays slow (0.5–3 Hz).
2. **Three reverbs** (open, wood, stone), blended by region and enclosure; water adds a slap. Convolver count three.
3. **The bed breathes.** Between gusts the wind falls to −20 dB below its gust peak; the insects stop outside the fen and the Saltings; the shimmer goes; the drone sits at D, felt, and comes up only in the gutter.
4. **`distantCall` is replaced**, not retuned: far calls come from emitters (the tor moans, the wood's edge, the rooks' keep) in phrased bouts with long rests; the moor's density is one far call a minute or less.
5. **Ranges and levels** of the living and the small cues rise to where their meaning is (20–60 m), the generic cry and crows fall, and the mix integrates near −26 LUFS on a moor walk at volume 100.
6. **The limiter stays** as a net (threshold −6, ratio 4, 10 ms attack) behind a gentler bus compressor; transients are scaled at the source so gain reduction over 1 dB happens under 1 % of the time.
7. **Nothing new is added to the world.** No new creature, no new place, no new name. A sound with no emitter is removed, not given one.

## Design gaps

None that block. If a brief's agent finds a sound whose meaning is unclear (what should the Accrescent's step sound like?), it keeps the current meaning, voices it by the palette, and writes a `type: question` file in `proposals/` for Austin.
