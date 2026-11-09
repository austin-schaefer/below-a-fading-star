# v7.2-03: the events

Read `_common.md` first. You own `src/audio/calls.js`, `src/audio/regions.js`, and the sound hooks inside `src/v4/regions/*.js` (adust, bletting, demesne, high-ling, lynchets, outwash, saltings, strandline), plus the position arguments at the fauna call sites that pass none (`src/fauna/small.js` crows, `src/fauna/wings.js`). Austin's words you answer: "feels random", "too rare".

## The fault (confirm with baseline renders at the moor standing, the fen edge, the keep's court, the Lynchets)

`distantCall`: every 8–22 s uniform, random bearing, 140–300 m, kind uniform from four, no emitter, no air lowpass, bypasses the voice cap; its comment says "so the quiet is never empty". Crows fire with no position and sound from (65, 34, 30) always. The fen's frogs (square waves) and bubbles every 0.2–1.65 s with no bouts. Rooks every 1.5–7.5 s within 170 m. The regions' hooks each run their own `base + rng() * span` timers (ticks every 0.12–0.47 s on the Outwash, 0.25–1.15 s on Adust, the gate every 14–36 s, the tor moan at Q 14/18 always on), through their own panners with no distance filtering. Expect `onsets_pm` high and even everywhere, `gap_max_s` under 15 at every pose, and far sounds in the spectrogram as bright as near ones.

## What to build (`craft.md` "Scheduling and pacing", "Distance"; `palette.md` "The emitters"; decision 4)

- **An emitter model** in `calls.js`: a small scheduler every caller uses: `{ pos | at(), kind, bout: { n: [2,5], gap: [1.5,4] }, rest: lognormal(median, spread), answer?: { partner, delay: [0.8,2], quieter: 3 dB }, range, when?: () => bool }`. Phrased, not uniform: a bout, then a long-tailed rest. Density is a design value per region (`palette.md`'s table): the moor one far call a minute or less, the wood close detail and no far calls, the fen loud with small life in bouts. The gutter (`ctx.sky.flicker`) may gate or trigger the few that belong to it, nothing else global.
- **`distantCall` replaced** by emitters at things that exist: the tors (the High Ling moan becomes an emitter's event, not an always-on Q 14 whistle), the wood's edge, the keep's rooks, the fen. Each far call goes through `graph.js`'s `voice()` so it gets the air lowpass, the reverb send by distance and the cap. If `voice()` lacks a parameter you need (a wet share by distance), add the one-line export per `_common.md` and tell the orchestrator; 05 is building the same model and will reconcile.
- **Crows and wings** get the real position of the bird that calls (the call site passes it; one argument each).
- **The regions' hooks** keep their sounds and their meaning but get the scheduler: bouts and rests, every panner replaced by a `voice()` or given the air lowpass, Q's over 5 brought to 2–4 unless the sound is a whistle on purpose (say which), square sources replaced by filtered ones (the frogs: a short sine chirp through a bandpass with a pitch fall; the gate: stick-slip noise through two formants). The sexton, the moles and the living are v7.2-04's; do not touch `living.js`.
- **Rests are measured.** At every moor pose `gap_max_s ≥ 15` and `onsets_pm` 0–3; at the fen `onsets_pm` 4–12 with bouts visible on the spectrogram and at least one gap over 8 s.

## Done when

- The survey's moor poses pass `gap_max_s` and `onsets_pm`; the fen pose's spectrogram shows bouts; the keep's court shows the rooks from the keep's position (render with `--cue` off and a 40 s length to catch one; the cue log in `<out>.json` names each event with its distance).
- No `Math.random`, no scheduler left as `base + rng() * span` without a rest.
- `audio-test.mjs` at its count; everything in `_common.md`.
