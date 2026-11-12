---
name: music
description: How an agent writes and judges the walk's music, which it cannot hear. Load before touching src/audio/music/ (the score, the tracks, later the patches, player and director) or tools/music-*, as composer or reviewer, on top of `wilderness` and `sound-design`. Covers what good music is here, the track format, the text loop with tools/music-score.mjs, each gate and what it protects against, and what the gates cannot tell you.
---

# Music

You cannot hear, and the owner will. So the music is written as data, judged as arithmetic, and kept plain enough that what the arithmetic cannot see is unlikely to be wrong. A track you have not run through `tools/music-score.mjs` is a guess; the owner's WAV and `?music=<track>` are the only real listening, and come last.

Why it is built this way: the sound harness (`sound-design`) renders in a browser in real time and costs minutes a change; the owner asked that music not repeat that (`plans/wilderness-v9.md`). Here the loop is a Node command that answers in milliseconds, in text. No image is opened, no browser runs, until a track is green on paper and is rendered once (`tools/music-render.mjs`, v9-M1).

## What good is here

- **The genre: dungeon synth, not high fantasy.** Slow (50-80 BPM, the moor at 52), modal, plain. A pad of open fifths, a monophonic melody of few notes with long rests, perhaps a second voice moving in parallel fourths or fifths under it (the old organum sound), a bell or two far off. Old, a little sad, never sweet: no major thirds over the tonic, no runs, no ornament, no build to a climax, no drums or pulse you could tap to. A phrase is a breath: four to nine notes, then silence you notice.
- **The key is D, because the world is already in it.** The bed's drone is D1 and D2; the carillon is a just minor pentatonic on D3 (D F G A C); the stones are D2 F2 A2 C3; the Lattice hums A4. Music in D Aeolian (or Dorian, or Phrygian for something darker) agrees with all of it and beats against none of it. Just ratios, not equal temperament, so a held fifth against the drone is still.
- **The pentatonic is the spine.** E and Bb (or B in Dorian) are passing colour; D and A are home; phrases end there.
- **What the world occupies.** The sub (under ~140 Hz) is the bed's drone; the 300-1200 Hz band holds the wind's whistles; 2-5 kHz is the ear's sharpest band and stays empty (`sound-design/craft.md`). So the music lives D3 to about A5, sustained notes at D3 or above, pads dark.
- **Intermittency.** Music is not omnipresent: a track plays 90-180 s, then minutes of only the land (the director, v9-M2). Inside a track the same: the first 15 s is the pad alone, the lead rests 30-60 % of its time, the last 20 s is the pad alone again. Silence is the material.
- **The gutter.** Every 60-110 s the sun gutters for 12-16 s and the drone sinks 45 cents; the player fades the music out for it. Never write a moment that depends on not being interrupted.

## The format (`src/audio/music/score.js`, its header has the full reference and a complete small example)

- A track is one file in `src/audio/music/tracks/<name>.js` exporting `{ name, length, bpm, mode, seed, voices: [...] }`.
- A voice is `{ id, patch, mark, gen, from, to, role, ...params }`; pitches are scale degrees (0 = D3, 7 = D4, 11 = A4), times in beats.
- Generators: `drone` (held chords), `loop` (a figure on a prime-ish period; two loops never realign), `walk` (the melody: phrases, rests, a motif that returns and closes), `follow` (a fifth or fourth under another voice), `notes` (by hand).
- Order is a decision: each voice keeps clear of roughness against the voices listed before it, by choosing another pitch, falling back to the first chord, or resting. List what must not move first (bells, then the lead, then the pad, then voices that follow).
- `compose(track, seed)` → `[{ t, dur, voice, ratio, vel }]`, sorted, seconds, ratio from D3 = 146.83 Hz. Each voice has its own random stream, so editing one leaves the rest as they were.

## The loop

1. `node tools/music-score.mjs <track> --roll` (or `all`, or a path). Read the header line (phrases and their sizes, the shortest rest, the motif found), the gate table, and the roll.
2. Read the roll as a musician reads a page: is there a shape (a rise and fall in each phrase, a middle where something changes, an ending that comes home)? Do the rests look like rests? Does the lead stay in a narrow band and step? Does the pad move rarely? `--from=40 --to=80` to look closer, `--res=1` to see the whole piece at once.
3. Change one thing in the track's data, run again (milliseconds), compare. Try a few seeds (`--seed=n`) to see whether a pass is the track or luck; the moor passes at 94 of seeds 1-100 and the shipped seed is fixed, so the visitor always hears the one you judged.
4. Green, and the roll reads, then render once (`tools/music-render.mjs`, below) and meet the audio gates. `--json` gives everything to another tool.
5. Hand-back: the table, the first 40 s of the roll, what you listened for in your head and why, and what the owner should listen for in the WAV.

`node tools/music-score-selftest.mjs` checks the tool itself (60 checks); both are in `tools/suite.sh`.

## The gates (as tuned in v9-M0 against the moor and two bad fixtures)

`tools/music-fixtures/noodle.js` (constant eighth notes, random leaps, no rests) fails eight gates; `tools/music-fixtures/drone.js` (one fifth for 150 s, nothing else) fails seven; the moor passes all nineteen. Moor's values in brackets.

| gate | band | protects against |
|---|---|---|
| events well formed, same seed same list | 0 bad, equal | a broken generator; a track that differs between visits |
| length | 90-180 s [156] | a loop that never ends; a fragment |
| pitches out of mode | 0 | a note that belongs to no key here and beats against the bells and drone |
| lead pentatonic share | >= 0.60 [0.93] | a melody that sounds like a scale exercise rather than an old tune |
| phrase ends on D or A | >= 0.80 [1.00] | phrases that never come home; aimlessness |
| lead steps share (<= a minor third) | >= 0.60 [0.82] | the noodle: leaping about, no line to follow |
| widest leap | <= 1200 c [702] | a jump that breaks the line |
| lead range | <= a 12th [1200 c] | a melody that sprawls into the wind's band or the sub |
| lead notes a minute | 4-20 [10.8] | busy ornament (high) or nothing happening (low) |
| lead rest share | 0.30-0.60 [0.43] | music without breath; or a melody too thin to exist |
| phrases outside 4-9 notes; lead phrases >= 4 | 0; [6] | runs without end; a piece with no phrasing |
| rests 2-4 s (blurred) | 0 | rests too short to read as rests and too long to read as breaths |
| rough pairs | 0 | two notes 8-70 Hz apart sounding together 0.25 s or more: beating as buzz or mud, by arithmetic on fundamentals |
| held under 140 Hz | 0 | mud against the bed's drone and the wind's body |
| motif return rate | 0.20-0.60 [0.50] | no memory (nothing returns) or a jingle (it never stops returning). The 4-note figure, exact pitches, in the most phrases |
| 16-note runs repeated | 0 | a loop pasted as a melody |
| polyphony | 1-6 [5] | a crowd; the player's fixed pool of voices |
| pair distance (`all`) | >= 0.20 | two tracks that are the same piece. Mean of six 0..1 terms: pitch-class and interval histograms, motif, tempo, mode, register. Two seeds of the moor sit near 0.1, moor and the noodle at 0.58 |

Changed from the index's first design: phrase rests are judged as a band (a silence of 2 s or more ends a phrase; none may fall 2-4 s), the rough check needs 0.25 s of overlap (a release brushing the next note is not a chord), "held" means 0.5 s or more, and the motif is found from the notes rather than declared, so a hand-written track is judged the same way.

## The render (v9-M1)

`nice -n 10 node tools/music-render.mjs <track|all> [--wav] [--q=low] [--solo=voice,...] [--patches=fixture.js]` composes the track, plays it through the real `patches.js` and `player.js` into an `OfflineAudioContext` on a blank headless page (no server, no world; about 40x real time, the moor in under 10 s with its checks), and prints text: the stem's loudness, peak, a band-energy table, roughness by octave band, and PASS/FAIL lines. `--wav` writes `shots/wip/music-<track>.wav` (gitignored) at the stem's own level, for the owner. `--solo` renders only some voices, to find which one a number comes from. It is in `tools/suite.sh`.

| gate | band | protects against |
|---|---|---|
| loudness | -38 to -32 LUFS [moor -35.3] | a stem louder than the bed it sits under, or lost in it. The balance between patches is set in `patches.js` (`STEM_LEVEL`, the patch gains) |
| peak | <= -12 dBFS [-27.7] | a struck note or a stacked chord that will hit the limiter |
| clicks | 0 [0] | a gated envelope, a jump on an audible parameter, a voice retuned while sounding. Judged on a copy raised to a -6 dBFS peak (the detector has an absolute floor) |
| sharp_db | < -16 [-32.1] | energy in 2-5 kHz: bright partials, bare saws, hiss |
| rough | < 0.15 [0.12] | buzz: bare saws, beating partials |
| notes without a voice | 0 | a track that needs more than the pool's 10 voices at once |
| ducked and stopped mid-note | clicks 0, silent after, ended | a track that cannot be interrupted (the director fades it out for every gutter) |
| live | the clock moving after 3 s, stop(0.5) ends | the AudioContext path: the one timer, the 2 s lookahead |

What the numbers mean here, learned on the moor:
- **The roughness meter reads harmony as rough.** It was built for noise beds: any two tones 15-300 Hz apart in one octave band show as envelope modulation (a pure D4-A4 fifth reads 0.36), and a lone tone under 150 Hz (D3 itself: the 1 ms power envelope keeps its 2f ripple) reads 0.43. So `rough` is mostly the share of the stem's energy that is chords. The moor passes with the pad and organ about 16 dB under the flute (pad solo -51 LUFS, flute solo -35); louder, and it fails. A new track with a busier pad will meet this first: keep the chord-bearing voices under a monophonic lead, or fix the meter (a partial-based dissonance measure) rather than thin the harmony to pass.
- **The click detector sees a near-noiseless sum of tones as clicky.** Without a noise floor its linear predictor flags the curve corners of envelopes at 5x as candidates, and a long file finds chance "seams" among them. The tape's hiss (about 50 dB under the music) is what keeps it honest; real clicks read far higher (the click fixture: 161 clicks, ratios to 20x). The tape fades its hiss over the last 0.3 s: a stem that ends on a step in its noise floor reads as one click at x16 in the last half second.
- **The bad patches** (`tools/music-fixtures/patches-click.js`, a flute gated with setValueAtTime; `patches-saw.js`, a pad of bare saws at the lead's level): the click flute fails clicks (161), rough and loudness; the saw pad fails clicks (1444, the saw's own wrap), sharp_db (-15.4) and rough (0.46). Run them after changing a meter or a gate: both must still fail.

## What the gates cannot tell you, so be conservative there

- **Timbre and level.** The score says nothing about how the flute sounds, whether the pad's saws are harsh, or whether the stem sits under the bed. That is the render's job (above). Keep patches dark and soft; the stem goes under the wind.
- **Partials.** Roughness is checked on fundamentals. Two pad notes a fifth apart are clean; their upper harmonics can still beat. Prefer open fifths and octaves in the pad, nothing denser than a triad in the low register, and do not stack thirds below D4.
- **Taste.** A green track can still be dull, or sweet. Read the roll for shape; keep the moor's restraint as the reference; ask yourself whether it sounds old. When unsure, take a note out.
- **The world's moment.** The gates do not know the gutter, the walker or the other sounds playing. Keep tracks interruptible and quiet; leave the timing to the director.
- **Variety over hours.** The pair distance is a floor, not a guarantee that six tracks feel different. Give each region its own mode or tempo or register and its own motif.
- **Generated is not good.** The `walk` generator passes its own gates by construction (it avoids roughness, ends on D or A). Judge the music, not the generator's obedience.
