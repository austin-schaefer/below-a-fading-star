# v17.1 Q4, music v2 round one: report (issue #23)

Branch `issue-1754-music-sketches`. What the owner can hear: `http://localhost:8123/listen.html` once merged (on this branch: port 8164).

## What changed

- **`listen.html`**: four 30-second sketches and an A/B pair, each a line and a play button. Played **live** through the real `player.js` (not pre-rendered): the notes are deterministic, the offline render is the same code path, and 1 MB of samples is smaller than six rendered files. Nothing of the walk is loaded; no sample is fetched before a press. Linked from nowhere.
- **`src/audio/music/sketches/`**: a text notation (`notation.js`: `D4:1 Bb3+D4:2 -:.5 | `, each barline checked against the metre), the four sketches, the page's room and gain (`room.js`), `playSketch` / `renderSketch` (`index.js`), the page's script (`listen.js`).
- **`src/audio/music/sampler.js`**: eleven sampled instruments as patches (`s-harp` ...), the nearest recorded note played at the rate that puts it in tune.
- **`player.js`, `patches.js`**: two optional arguments (`pool`, `tapeLp`); defaults unchanged, the nine tracks untouched. Music in the walk is as it was.
- **Tools**: `tools/sketch-render.mjs` (offline render and tripwires), `tools/listen-test.mjs` (the page in use); both in `tools/suite.sh` (`sketches`, `listen`).
- **Outside my files**: `netlify.toml` (two lines: `listen.html` in the copy and the ignore list, or the page would never be published) and three phrases in `DEPLOY.md`. Docs: `modules.md`, `runtime.md`, the `music` skill.

## The samples

- Source: VS Chamber Orchestra: Community Edition, https://github.com/sgossner/VSCO-2-CE, **CC0 1.0** (the repository's `LICENSE`, read on the day), recorded by Sam Gossner and Simon Dalzell, cut by Elan Hickler/Soundemote. Fetched with plain `curl` from raw.githubusercontent.com; no account, key or payment, nothing about the owner or the project sent.
- Shipped: **56 files, 1,057,630 bytes (1.06 MB)** under `vendor/samples/vsco2/`, mono MP3, 0.2 to 3.6 s each: harp 10, cello pizzicato 8, flute 5, cello section 5, solo violin 5, marimba 5, drum 5, oboe 4, viola section 4, glockenspiel 3, shaker 2. Every file's source path, length and size: `vendor/samples/LICENCES.md`.
- A page plays one sketch's instruments only: moor 0.37 MB, keep 0.41, garden 0.12, dry 0.30.

## The four sketches

Each: a line (as on the page), the tune as note names and lengths in beats, bar by bar, where the theme returns and what changes, and the check against the harmony.

### The moor: "A walking song: a flute tune over a harp that keeps step, plain enough to whistle on a long road."
D Dorian, 4 in a bar at 84; flute and harp. Opens with the harp alone for a bar.

```
 2: D4 1, A4 1.5, G4 .5, F4 1      a    (Dm)
 3: E4 1, G4 1, E4 2                    (C)
 4: D4 1, A4 1.5, G4 .5, F4 1      a'   (Dm)
 5: E4 1, G4 1, A4 2                    (C, Am)
 6: F4 1, A4 1, C5 1.5, A4 .5      b    (F)
 7: B4 1, D5 1.5, C5 .5, B4 1           (G)
 8: D4 1, A4 1.5, G4 .5, F4 1      a''  (Dm)
 9: E4 1, C4 1, D4 2                    (C, Dm)
```
The head (D up a fifth to A, held, down by step) is heard three times: bars 2, 4, 8. Its answers change: E (asking), A (open), then home by E C D. Bars 6-7 lift to the top note D5 on the head's own rhythm (long-short-long). Against the harmony every note on a beat is a chord tone; the only passing notes are the eighths G (bars 2, 4, 8) and C (bar 7).

### Carcanet Keep: "A slow court dance for a few strings, grave and a little grand, that ends in the major as if remembering better days."
G minor, 3 in a bar at 72, weight on the second beat; solo violin, violas, cellos. Opens with all three at once.

```
 1: D5 1, Bb4 1.5, C5 .5     (Gm)        7: F5 1, D5 1.5, Eb5 .5    (Bb)
 2: D5 1, A4 2               (Dm/F)      8: F5 1, D5 2              (G7/B)
 3: Eb5 1, C5 1.5, D5 .5     (Cm/Eb)     9: Eb5 1, G5 1.5, F5 .5    (Cm)
 4: D5 1, C5 1, A4 1         (D7)       10: D5 1, Bb4 1.5, C5 .5    (Gm/D)
 5: D5 1, Bb4 1.5, C5 .5     (Gm)       11: A4 1.5, G4 .5, F#4 1    (D7)
 6: C5 1, F5 2               (F)        12: G4 3                    (G major)
```
Bar 1 is the theme; it returns exactly at bar 5 (then turns up, C to F, where bar 2 went down) and at bar 10 over a new bass, before the close. Bar 3 is bar 1 a step higher; bar 9 is its shape at the top (G5). The bass walks down G F Eb D under bars 1-4 and climbs Bb B C under 7-9. Non-chord notes: the eighths only, plus the C in bar 4 (the seventh of D7) and F in bar 8 (the seventh of G7, which falls to Eb as it should). The last chord has B natural after a piece of B flats: intended.

### The gardens: "A music box left running: a lullaby on bells over plucked strings, sweet with one shadow in it, winding down at the end."
G major, a rocking 6 (the eighth at 180), slowing to 104 over the last two bars; glockenspiel over pizzicato cellos. Opens with two bars of plucking.

```
 3: D5 2, G5 1, B5 2, G5 1   (G)         9: D6 2, C6 1, B5 2, A5 1   (C, D)
 4: A5 2, G5 1, E5 3         (Em)       10: G5 3, rest 3             (G)
 5: C5 2, E5 1, G5 2, E5 1   (C)        11: D5 2, G5 1, B5 2, G5 1   (G)
 6: F#5 2, E5 1, D5 3        (D)        12: Eb5 2, G5 1, C6 3        (C minor)
 7: D5 2, G5 1, B5 2, G5 1   (G)        13: B5 2, A5 1, F#5 3        (D7)
 8: A5 2, G5 1, E6 3         (Em)       14: G5 6                     (G)
```
Bar 3 (up the chord and back) returns at 7 and 11. Second time its answer's last note leaps an octave to E6, the top, and comes down by step; third time it is answered in C minor (the E flat is the shadow) and runs down. Leaning notes on the beat that resolve by step: A in bars 4 and 8, D and B in bar 9, B in bar 13.

### The dry country: "A drum song for a road through dust: a hand drum and wooden bars under a reed pipe, on a bent scale that sounds far from home."
D with a flat second and a raised third (D Eb F# G A Bb C), 4 in a bar at 100; oboe, hand drum, shaker, marimba, a low cello drone. Opens with the drum alone, then the marimba, then the pipe.

```
 3: A4 1.5, Bb4 .5, A4 .5, G4 .5, F#4 1               a    (D)
 4: G4 .5, F#4 .5, Eb4 1, D4 2
 5: A4 1.5, Bb4 .5, A4 .5, G4 .5, F#4 1               a'
 6: G4 .5, A4 .5, Bb4 1, A4 2
 7: D5 1.5, C5 .5, Bb4 .5, C5 .5, D5 1                b    (Gm)
 8: C5 .5, Bb4 .5, A4 1, G4 2
 9: A4 .75, Bb4 .25, A4 .5, Bb4 .5, A4 .5, G4 .5, F#4 1   a''  (D)
10: G4 .5, F#4 .5, Eb4 1, D4 2
```
The sigh from A down to D (bars 3-4) returns at 5 (turned back up to wait on A) and at 9 with a turn on its long note; bar 8 is bar 4's cadence a fourth higher. Deliberate dissonances, both the scale's own: E flat over the D drone in bars 4 and 10 (a ninth, never a second: the marimba's pattern rests there), B flat over A in bar 6.

## Tests

- `nice -n 10 node tools/sketch-render.mjs all`: 44 PASS, 0 FAIL. Per sketch it reports the mix the page plays: moor -18.1 LUFS, peak -6.7 dBFS, sharp_db -16.7; moor through oscillators -19.1, -9.5, -39.1, clicks 0; keep -17.9, -5.8, -15.2; garden -18.2, -4.4, -17.7; dry -18.5, -3.6, -19.1. Every tune sounds its written pitches (worst: flute 18 cents, violin 20, both vibrato; bells 4; oboe 8).
- `nice -n 10 node tools/listen-test.mjs http://localhost:8164`: 26 PASS, 0 FAIL, three runs: at 1280 by 800 and 390 by 844 (touch), every one of the six buttons plays (0.047 to 0.136 rms at the page's analyser, context running, the bar moving), a second press stops it, no console error or failed request.
- `ONLY=music,music-selftest,music-render,music-director,music-live,audio,loading,sketches,listen tools/suite.sh 8164`: **9 tests, 0 failed**, 14 min 52 s. PASS lines: music 207, music-selftest 61, music-render 96, music-director 17, music-live 32, sketches 44, listen 26, audio 108, loading 28. The nine tracks are untouched.

## Frames, in order

`shots/wip/v17.1-Q4-listen-b-desktop-1-idle.png`, `-b-desktop-2-playing.png`, `-b-desktop-3-foot.png`, `-b-phone-1-idle.png`, `-b-phone-2-playing.png`, `-b-phone-3-foot.png`, `-b-phone-4-whole.png` (the `-a-` set is before the blind reader's notes). Spectrograms: `shots/wip/audio/v17.1-sketch-{moor-sampled,moor-osc,keep-sampled,garden-sampled,dry-sampled}.png`. The owner can also play `shots/wip/music/v17.1-sketch-*.wav`.

A blind reader (haiku, frames only) named the page, the six things to play and the question correctly. Its complaints, acted on: buttons too faint (more contrast, a time left readout), nowhere to answer (a line says to answer in the session), a wrapped heading on the phone, empty gaps.

## What I could not judge, and what is weak

- **I cannot hear.** Whether any tune is good, whether the four feel as different as they are on paper, and whether the recorded instruments sound like instruments or like a cheap keyboard: only the owner can say. The pitches, levels and bar arithmetic are checked; taste is not.
- **Pitch-shifted samples.** Each note is the nearest of a few recordings moved up to four semitones (the bells up to seven, down). Moved notes carry the source's vibrato speed and attack with them; a run across a sample boundary may change colour audibly.
- **No note transitions.** A real flute slurs; here every note is a fresh recording with a 0.2 s release under the next. Fast notes (the dry country's turn in bar 9) are the likeliest to sound mechanical.
- **Tone.** The violin was the harshest thing measured (2-5 kHz share -3 dB alone) and is now behind two lowpasses at 1.6 kHz (-15): it may have gone from piercing to muffled. The bells and marimba are filtered the same way.
- **Roughness reads high** on every sampled sketch (0.37 to 0.85 against the tracks' gate of 0.15): string sections and vibrato beat by nature and the meter was built for oscillators. Shown, not gated; I cannot tell real mud from that. The dry country's low end (drum, drone, room) is the densest in the spectrogram.
- **The click meter** counts recorded plucks and drum hits as clicks (dry: about 120), so it gates only the oscillator variant (0).
- **Mixing into the walk is not addressed**: the cellos and drum sit under 140 Hz, where v9 kept the music out of the bed's way; the sketches are mixed for a page, 17 dB over the walk's stem, with a room the walk does not have.
- **Form**: moor and dry are both a, a, b, a in two-bar phrases. Metre, key, tempo and instruments differ, but the owner may hear the kinship.
- The A/B's oscillator side maps the harp to the v9 `bell` patch (there is no plucked oscillator patch) and is level-matched to the sampled side (-3.7 dB).

## Defaults I took

- Four sketches, all through sampled instruments; the A/B on the moor only.
- Live playback, no limiter (peak held under -3 dBFS by the gate).
- The tape's lowpass at 5 kHz for sketches (the walk's tracks keep 3 kHz) and a made room on the page's bus.
- `listen.html` added to the Netlify copy, so it reaches the live site unlinked; drop the two lines in `netlify.toml` to keep it local.
- Recorded instruments are gated at `sharp_db` < -10 per voice, not the tracks' -16.
