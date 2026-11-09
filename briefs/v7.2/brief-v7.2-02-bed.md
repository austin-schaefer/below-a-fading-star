# v7.2-02: the bed

Read `_common.md` first. You own `src/audio/bed.js` and `src/audio/synth.js`: the wind, the drone, the shimmer, the insects, and how they move with the gutter. Austin's words you answer: "too omnipresent", "unpleasant".

## The fault, in numbers (from the cold read; confirm with your baseline renders at the moor pose standing, the wood, and the moor in a gutter)

Wind: three bandpassed noise layers at 260/640/1500 Hz on fixed stereo panners that do not turn with the head; gusts from fbm on game time floored at 0.4, so it never rests; bus 0.55. Drone: sines at 41.2/55.1/48.6/82.9 Hz (a major second in the sub-bass, beating at 6.5 Hz), always on at 0.1, up to 0.5 and −260 cents in a gutter. Shimmer: sines at 1822/2417/3105 Hz (no relation to any key) at a floor of 0.004. Insects: white noise through a Q 9 bandpass at 3.6–6.1 kHz, square-gated at 17–31 Hz, scaled by grassiness; sharp and rough by construction, and on wherever there is grass. Expect the baseline to show `sharp_db` well over the cap, `rough` over 0.15, `gap_max_s` near zero, and a flat spectrogram.

## What to build (`craft.md` "Wind", "Scheduling", `palette.md` "The ground tone"; decisions 1 and 3 in `index.md`)

- **Wind that breathes.** Farnell's layers: a broadband bed (brown + pink, lowpass 1.5–3 kHz, no panner or a slow drifting pan ±0.3), one or two whistle layers (bandpass Q 2–4 swept 300–1200 Hz by the gust with a lag), turbulence only in strong gusts. Gusts shaped as events: rise 2–6 s, hold, slower fall, then a rest; between gusts the bed falls to −20 dB below the gust peak. Openness still drives the ceiling (the model in the current code is good); shelter (wood, enclosure via `ctx.regions`/landmarks) drops the bed and removes the whistles, leaving a high distant hiss. `?wind=` keeps scaling it. Hurrying may raise the bed's cutoff slightly (air past the ears), 1–2 dB at most.
- **Drone in the key.** D and A (D1 36.7 Hz and A1 55 Hz, or D2/A2; pick by render: the sub must be felt on headphones, not mud), sine, each a few cents out of true per the palette, beating under 1 Hz. Felt, not heard: at the quiet moor pose it should sit 10–14 dB under the wind's gust peak. In the gutter it comes up (as now) and sinks in pitch by 30–60 cents (not 260), over 2 s, with the wind ducked.
- **Shimmer: remove or re-tune.** Default remove; if a render of the gutter is poorer without it, re-tune it to D/A partials two to three octaves up at a level 20 dB under the drone, and only in the gutter.
- **Insects belong to the fen.** Not white noise through Q 9 gated by a square: a few narrow detuned sines or a bandpassed noise at Q 2–3 around 2–3 kHz, amplitude shaped by a smooth 0.3–1 Hz LFO and a slow bout envelope (30–90 s bouts, rests as long), with a lowpass at 5 kHz, only where the fen/marsh/saltings weight is over 0.3; gone on the moor and in the wood. Level: under −14 dB `sharp_db` at the fen pose.
- Every loop buffer seam-free (v7.2-01 fixed `makeNoiseBuffer`; verify with `clicks`), every level change via `setTargetAtTime` or ramps.

## Done when (at `?q=low` on your port, with the survey)

- Moor standing: `gap_max_s ≥ 15` is not your metric (the bed makes no onsets) but `lra` of the bed-only render is 6–12 (it breathes) where the baseline is under 3; `sharp_db` under −14; `rough` under 0.15; `clicks` 0.
- Wood: the bed 6 dB or more quieter than the moor, no whistle line in the spectrogram.
- Fen: insects present in bouts (visible as bands coming and going on the spectrogram), absent at the moor pose.
- Gutter on the moor: the drone's rise and the wind's dip visible, drone within 60 cents.
- Spectrogram of 20 s on the moor has shape left to right.
- Everything in `_common.md`.
