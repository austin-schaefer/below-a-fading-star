// The bell under the Span's sounds (v10-A3), reached through src/v10/sound.js like every act-* cue. The world's key is
// D: the bell is tuned on D2 the way a cast bell is (hum an octave down, prime, minor tierce, quint, nominal, and the
// upper partials), each partial a few fixed cents out of true and doubled a hair apart so it beats slowly as it dies
// (0.4-1.3 Hz, never a buzz): that beat is the old crack in its lip.
//
//   act-bell-haul     the rope drawn through the ring on the post and the ram's chains taking the strain: a creak in
//                     catches and a few chain-links, 1.4 s. Detail tier, 40 m
//   act-bell          the stroke: the iron-shod ram on the sound-bow (a dull thump and a short clang), then the bell, a
//                     minute's worth of tail of which thirty seconds are audible. The loudest thing a visitor can make:
//                     punctuation tier, heard across the bowl (900 m, a long air path, a stone room's share of reverb)
//   act-bell-candles  far off on the fen as the candles kindle: a thin glassy chord (D5, F5, A5) entering a note at a
//                     time, with a breath under each. Detail tier, but heard from the bell (300 m)
//   act-bell-hum      the candles passing under the mouth: the bell's prime, quint and nominal swelling back to them
//                     with no stroke, 7 s. Detail, 90 m
//   act-bell-rest     the ninth candle taking its place round the traveller: a low soft fifth (D3, A3) and a sigh. 60 m
import { softKit } from '../audio/cues-v2.js';

const D2 = 73.42;

export function startBellSound(a, ctx) {
  const { ac, voice, filt, chain, pink, brown } = a;
  const rng = ctx.makeRng(10045);
  const { sgrain, stone } = softKit({ ...a, rng });
  const cents = (c) => Math.pow(2, c / 1200);
  // the bell's partials: [ratio to D2, level, decay s, beat Hz]; their tuning fixed once (the bell is the same bell)
  // One strong partial an octave band from 125 Hz up (two in a band beat at 15-300 Hz, and that is roughness, not a
  // bell); the minor tierce sits with the prime in the 63 Hz octave, the quint is an octave up, the rest are small.
  const PART = [[0.5, 0.5, 70, 0.4], [1, 0.8, 55, 0.7], [1.2, 0.42, 34, 1.1], [2, 0.85, 40, 0.45], [3, 0.36, 24, 0.8],
    [6, 0.08, 9, 0], [12, 0.025, 4, 0]]
    .map(([r, l, d, b]) => ({ f: D2 * r * cents((rng() - 0.5) * 12), l, d, b }));

  function haul(pos) {
    const v = voice(pos, { ref: 2.5, roll: 1, range: 40, dur: 2.2, verb: 0.3, air: 60, gain: 3 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 2600, 0.6); out.connect(v.in);
    // the creak: the rope in the ring, catching and giving (stick-slip as ramped steps, never jumps)
    const g = ac.createGain(), bp = filt('bandpass', 340, 3.5);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.06);
    for (let t = t0 + 0.1; t < t0 + 1.3; t += 0.06 + rng() * 0.09) g.gain.linearRampToValueAtTime(0.015 + 0.05 * rng(), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.45); g.gain.linearRampToValueAtTime(0, t0 + 1.46);
    bp.frequency.setValueAtTime(380, t0); bp.frequency.linearRampToValueAtTime(260, t0 + 1.4);
    chain(a.vNoise(v, brown, t0, 1.5), bp, g, out);
    // the chains taking the strain, high overhead: a few links knocking
    for (let t = t0 + 0.15; t < t0 + 1.5; t += 0.12 + rng() * 0.25) sgrain(v, out, t, 1500 + rng() * 900, 4, 0.02 + 0.02 * rng(), 0.05, pink, 0.003);
  }

  function bell(pos, o = {}) {
    const v = voice(pos, { ref: 6, roll: 1, range: 900, dur: 72, verb: 0.55, air: 450, gain: 12 }); if (!v) return;
    const t0 = v.t0, A = 0.05;
    const body = filt('lowpass', 3800, 0.5); body.connect(v.in); // dark by default: the bell's top rolled off
    // the stroke: iron on bronze, a thump and a short clang
    { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32); g.gain.linearRampToValueAtTime(0, t0 + 0.33);
      chain(a.vNoise(v, brown, t0, 0.35), filt('lowpass', 220, 0.8), g, body); }
    sgrain(v, body, t0, 900, 1.4, 0.12, 0.06, pink, 0.003);
    stone(v, body, 'sine', D2 * 2 * 3.71, t0, A * 0.25, 0.01, 0.4); // the clang: one inharmonic partial, gone in a breath
    // the bell: each partial a pair a beat apart, a tonal attack, a long exponential tail
    for (const p of PART) {
      stone(v, body, 'sine', p.f, t0 + 0.004, A * p.l, 0.014, p.d);
      if (p.b) stone(v, body, 'sine', p.f + p.b, t0 + 0.004, A * p.l * 0.55, 0.02, p.d * 0.85);
    }
  }

  function candles(pos) {
    const v = voice(pos, { ref: 10, roll: 1, range: 300, dur: 16, verb: 0.5, air: 220, gain: 9 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 2000, 0.6); out.connect(v.in);
    const notes = [D2 * 8, D2 * 9.6, D2 * 12]; // D5, F5, A5
    for (let i = 0; i < 9; i++) {
      const at = t0 + i * 1.5, f = notes[i % 3] * cents((rng() - 0.5) * 8);
      stone(v, out, 'sine', f, at + 0.05, 0.012, 0.6, 4.5); // a glassy tone, slow to come
      stone(v, out, 'sine', f * 1.0035, at + 0.1, 0.006, 0.7, 4.0); // and its twin, a slow beat
      sgrain(v, out, at, 700 + rng() * 300, 0.9, 0.012, 0.5, pink, 0.25); // the breath as it kindles
    }
  }

  function hum(pos) {
    const v = voice(pos, { ref: 6, roll: 1, range: 90, dur: 8.5, verb: 0.45, air: 200, gain: 2 }); if (!v) return;
    const t0 = v.t0;
    for (const k of [1, 3, 4]) { const p = PART[k]; /* prime, nominal, quint */ stone(v, v.in, 'sine', p.f, t0, 0.02 * p.l, 2.2, 5); }
  }

  function rest(pos) {
    const v = voice(pos, { ref: 5, roll: 1, range: 60, dur: 7, verb: 0.4, air: 120, gain: 2 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 1800, 0.6); out.connect(v.in);
    stone(v, out, 'sine', D2 * 2, t0, 0.02, 0.9, 4.5);
    stone(v, out, 'sine', D2 * 3 * cents(3), t0 + 0.25, 0.012, 0.9, 4.0);
    sgrain(v, out, t0 + 0.1, 500, 0.8, 0.012, 1.2, pink, 0.4);
  }

  function cue(name, pos, opts) {
    if (name === 'act-bell') bell(pos, opts);
    else if (name === 'act-bell-haul') haul(pos);
    else if (name === 'act-bell-candles') candles(pos);
    else if (name === 'act-bell-hum') hum(pos);
    else if (name === 'act-bell-rest') rest(pos);
  }
  return { cue };
}
