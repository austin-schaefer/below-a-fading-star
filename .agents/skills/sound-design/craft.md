# Craft: why synthesised sound turns unpleasant, and what to do

Numbers here are working rules for Web Audio at 44.1/48 kHz, not laws. When a rule and a render disagree, trust the render's metrics and say so.

## Three complaints and their usual causes

**"Feels random."** Events with no cause: a cry from a random bearing at a random distance of a random kind, every 8–22 s, wherever you stand. Memoryless uniform schedulers (`base + rng() * span`) have no phrasing: no bursts, no rests, no answer. Pitched things in unrelated keys. Footsteps whose pitch wanders ±17 %. Fixes: bind every event to an emitter that exists at a place; phrase schedulers (below); one tonal centre; small jitter.

**"Unpleasant on the ear."** In rough order of how often it is the cause:
1. *Clicks and seams.* A looped noise buffer whose end does not match its start thumps once per loop; a gain `setValueAtTime` jump or a square-wave gate is a click every edge. A high-Q filter rings each click into a tone.
2. *Raw waveforms.* A sawtooth has every harmonic at 1/n; a square every odd one. Unfiltered, the energy above 2 kHz dominates perceived sharpness. Oscillators in Web Audio are band-limited (no aliasing), but that does not make them pleasant.
3. *Sharpness.* Sustained energy in 2–5 kHz, where the ear canal resonates and hearing is most sensitive. Insects at 3.6–6.1 kHz with a Q of 9, gated at 17–31 Hz, are both sharp and rough.
4. *Roughness.* Amplitude modulation at 15–300 Hz (beating between close tones, fast tremolo, square gating) reads as harsh. Beating at 1–3 Hz is slow and can be beautiful; at 20–70 Hz it is a buzz.
5. *Resonance.* Bandpass Q above about 5 on noise gives a whistle; Q 14–18 is a siren. Use Q 1–4 for coloured noise, and if you want a whistle, want it on purpose, briefly.
6. *Mud.* Several sub-bass tones a major second apart (48.6 and 55.1 Hz) beat at 6.5 Hz and swing −260 cents in a gutter. Low end is one note, or an octave or fifth.
7. *Pumping.* A limiter with ratio 8 and 5 ms attack on the master, hit by 0.35–0.5 gain transients, ducks the whole world for 300 ms on every crack. Transients should be scaled so the limiter is a safety net the metrics show engaging rarely (gain reduction under 1 dB for 99 % of the render).
8. *One reverb for everything.* A 3.2 s wash on a moor and in a stone keep alike makes everything equally far away and equally fake.

**"Too omnipresent and too rare."** Beds that never pause (wind, drone, shimmer, insects at fixed floors) against distinctive cues ranged at 5–15 m and gained at 0.01–0.03, gated to one gutter per 60–110 s. The world hums all the time and says nothing. Fix both ends: let beds breathe to near silence; give the meaningful things range and level; cut the generic filler.

## Envelopes

- Attack ≥ 3 ms for noise, ≥ 10 ms for tones, ≥ 30 ms for anything soft or distant. Release ≥ 40 ms; for a bell-like tail use `setTargetAtTime` with a time constant, not a linear ramp to 0 (a linear ramp to exactly 0 is fine only if it ends after the sound is inaudible).
- Never `setValueAtTime` an audible gain or frequency to a different value. `setTargetAtTime(v, t, 0.005)` is a 5 ms glide and is almost always what you meant.
- Start a buffer source at a zero crossing or under a fade-in. Stop it under a fade-out, `stop(t + release + 0.05)`.
- Loop buffers: a true crossfade of the last N samples into the first N (equal-power or linear with both halves weighted), N ≥ 2048 at 48 kHz for noise, and check with the click metric over at least three loop lengths.

## Waveforms and filters

- Noise: white → shape it. Brown for wind body, pink for air, white only through a bandpass. Lowpass at 4–6 kHz for anything "outdoors far".
- Tones: sine and triangle for anything sustained; sawtooth or square only into a lowpass at 2–6 × the fundamental (or a bandpass), or as a short transient. A "voice" (bird, animal, human) is a formant structure: one or two bandpasses (Q 2–6) over a buzzy source, with a pitch contour (a glide, a fall) and an amplitude envelope that breathes.
- Metal, bells: inharmonic partials (ratios like 1, 2.0, 2.76, 4.07, 5.4 for a bell; 1, 1.59, 2.14 for a plate), each with its own decay, highest decaying fastest. The carillon and the stones already do this; copy them.
- Water: lowpassed noise with slow amplitude modulation (0.1–0.5 Hz) and occasional short bandpass blips (a "plop" is a sine sweep down over 60 ms plus a noise tick).
- Wind (Farnell's model): a broadband bed (brown + pink, lowpass 1.5–3 kHz) whose level follows a slow gust envelope; one or two bandpass "whistle" layers (Q 2–4, centre swept 300–1200 Hz by the gust envelope with a lag); turbulence as a faster, lower-level modulation (0.5–3 Hz) only when the gust is strong. Gusts are shaped: slow rise (2–6 s), hold, slower fall, then a rest. Between gusts the bed can fall to −20 dB below its gust peak. In shelter (wood, enclosure) the bed drops and the whistles vanish; what remains is high and distant.

## Distance

For a source at distance d from the listener:
- Dry gain: inverse with a reference distance (ref 1–3 m, rolloff 1) is usually right; linear-to-silence only for things meant to vanish at a range.
- Air absorption: a lowpass whose cutoff falls with distance, roughly `cutoff = 18000 * exp(-d / 60)` floored at 600–900 Hz, so at 60 m the top octave is gone, at 180 m everything above 1 kHz.
- Reverb send: wet share rises with distance (near: 10–20 %, far: 60–80 %) while dry falls, so far sounds are diffuse rather than quiet copies of near ones.
- Panning: equal-power pans by bearing; HRTF for a few important near sources (it is costly). Fixed stereo panners that do not turn with the head are a fault for anything that is supposed to have a place; the ambient bed may stay unpanned.
- Caps: per-source `maxDistance`; anything beyond is not built (the voice helper already does this).

## Space

Three impulses, generated: *open* (0.9–1.4 s, dark, sparse early reflections), *wood* (0.6–1.0 s, dense, very dark, early-heavy), *stone* (2.5–4 s, brighter, a clear onset gap). Blend the sends by the region's enclosure (`ctx.regions`, landmark proximity) over a couple of seconds as you walk. Water adds a short, bright slap. The convolver count stays at three; sends are cheap, convolvers are not.

## Scheduling and pacing

- **Three tiers.** Bed (continuous, −30 LUFS or quieter, the floor the rest stands on, allowed to breathe to near-silence), detail (place-bound intermittent sounds, −24 to −18 LUFS momentary when they happen, with rests), punctuation (rare, −16 to −12 LUFS momentary, never two within 20 s, always from a thing you could look at).
- **Phrased, not uniform.** Model a caller: a bout of 2–5 calls at 1.5–4 s spacing, then a rest of 20–90 s drawn from a long-tailed distribution (lognormal or `base * exp(rng * k)`), not uniform. Two callers of a kind answer each other across a bearing, the second a little quieter and delayed 0.8–2 s.
- **Place-bound.** A call has an emitter with a position from the world (a tree, a tor, a fauna object), not a bearing from the player. Density per region is a design value: the fen is loud with small life; the moor is empty with one far call a minute; the wood has close detail and no far calls.
- **Rests are measured.** The event-density metric should show gaps of 20 s or more at every moor pose, and bursts in the fen. A soundscape with no gap over 15 s is a fault at any pose that is not water or a crowd.
- **The player is a cause.** Hurrying raises the step level and lowers the bed's audibility; standing still for 20 s lets detail come forward (ducking the bed 2–3 dB); turning toward a source should not change it (that is the panner's job).
- **The world's clock is a cause.** The gutter (the sun's dip) is the scene's one shared downbeat: the bed sinks, the drone comes up, the living react. Keep it the only global event. Nothing else is tied to a global timer.

## Levels and metering

- Work in LUFS (K-weighted; `harness.md`). The whole mix at volume 100 on a calm moor walk integrates near −28 to −24 LUFS; the loudest 3 s anywhere stays under −14 LUFS short-term; true peak under −3 dBFS so the limiter is a net, not a compressor.
- Relative levels matter more than absolutes: footsteps 8–12 dB over the bed; near detail 6–10 dB over; punctuation 12–18 dB over.
- Sharpness proxy: energy 2–5 kHz ÷ energy 100–8000 Hz, in dB, over a 20 s render. For a bed, under −14 dB; for the whole mix at a pose, under −10 dB; a single bright transient may exceed it briefly.
- Roughness proxy: the share of the envelope's modulation energy in 15–300 Hz. Under 0.15 for beds.
- Crest factor: beds 10–14 dB (natural noise), cues 12–20 dB. A bed at 6 dB crest is over-compressed or gated.

## Footsteps

One sound per ground kind, two or three variants each (timbre, not pitch), ±3–5 % pitch, ±2 dB level, a heel–toe pair 60–120 ms apart when hurrying, a lowpass that follows the ground (grass dull, stone bright, gravel mid), and a short dry early reflection in enclosures. Level: audible over the bed, under speech level. The first step after standing is a little louder.
