// v8-05 the Pomegranate House's voice: one-shots fired by the house's figures and lamps (src/v8/house.js schedules
// them; audio/cues.js hands every `house-*` cue here). Diegetic, small and warm: people talking low, a laugh, a few
// plucked notes, a cup, the lamps' glass. No words (the formants move, nothing is a syllable), no tune: the oud's notes
// are the carillon's just minor pentatonic on D3 (cues-v2.js), halting, with long rests. Every voice is placed and
// capped (graph.js voice()), inverse from a few metres with the air's lowpass, and goes to the room's reverb.
//
//   house-murmur  ({ voice: 0 | 1 | 2, n }): a phrase of n 'syllables' through two moving formants, a breath under
//                 it, lowpassed so nothing is intelligible; voice 0 the loser (low), 1 the winner, 2 the host. 90 m
//   house-laugh   ({ n, nervous }): n breathy 'ha's falling in pitch, the winner's; nervous: two or three, higher,
//                 quicker, quieter (the first sound after a gutter). 110 m
//   house-pluck   ({ note: 0..5, v }): the oud: a plucked string's partials, each decaying at its own rate, a nail's
//                 tick, a body's warmth; note on D3 F3 G3 A3 C4 D4, each a few cents out of true. 60 m
//   house-cup     a clay cup set down on stone: a dull knock and a short ring. 35 m
//   house-tick    a lamp's glass ticking as it warms (and one at each relighting). 14 m
import { softKit } from '../../audio/cues-v2.js';

const PENT = [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5, 2], D3 = 146.83;

export function startHouseSound(a, ctx) {
  const { ac, voice, vOsc, vNoise, filt, gainOf, chain, white, pink, brown } = a;
  const rng = ctx.makeRng(8053);
  const { shape, sgrain, stone } = softKit(a);
  const TRUE = PENT.map(() => 1 + (rng() - 0.5) * 0.008); // each course a few cents off, fixed
  const VOICES = [{ f0: 112, f1: [320, 640], f2: [900, 1500], g: 1 }, { f0: 131, f1: [360, 700], f2: [950, 1600], g: 1 }, { f0: 98, f1: [300, 600], f2: [850, 1400], g: 0.8 }];
  const at = (pos, o) => voice(pos, { ref: o.ref, roll: 1, range: o.range, dur: o.dur, verb: o.verb ?? 0.25, air: o.air ?? 70, gain: o.gain ?? 1 });

  // a phrase of murmured syllables (the Taker's murmur, made conversational: longer, with a contour and a stress)
  function murmur(pos, o = {}) {
    const V = VOICES[(o.voice | 0) % 3], n = Math.max(3, o.n | 0 || 5);
    const lens = []; let D = 0;
    for (let i = 0; i < n; i++) { const l = 0.09 + rng() * 0.11; lens.push(l); D += l + 0.02 + rng() * 0.05; }
    const v = at(pos, { ref: 4, range: 90, dur: D + 0.3, verb: 0.3, gain: 10 }); if (!v) return;
    const t0 = v.t0;
    const f1 = filt('bandpass', V.f1[0], 3.5), f2 = filt('bandpass', V.f2[0], 5), lp = filt('lowpass', 1500, 0.5), sum = gainOf(1), g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    let t = t0;
    const stress = Math.floor(rng() * n);
    for (let i = 0; i < n; i++) {
      const len = lens[i], amp = 0.055 * V.g * (i === stress ? 1.25 : 0.85 + rng() * 0.2) * (i === n - 1 ? 0.6 : 1);
      f1.frequency.linearRampToValueAtTime(V.f1[0] + rng() * (V.f1[1] - V.f1[0]), t + 0.03);
      f2.frequency.linearRampToValueAtTime(V.f2[0] + rng() * (V.f2[1] - V.f2[0]), t + 0.04);
      g.gain.linearRampToValueAtTime(amp, t + 0.025); g.gain.linearRampToValueAtTime(amp * 0.55, t + len * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + len);
      t += len + 0.02 + rng() * 0.05;
    }
    g.gain.linearRampToValueAtTime(0, t + 0.02);
    const f0 = V.f0 * (0.95 + rng() * 0.1), o0 = vOsc(v, 'sawtooth', f0, t0, t + 0.08);
    // a statement falls; now and then a question rises at the end
    const q = rng() < 0.25;
    o0.frequency.setValueAtTime(f0 * 1.02, t0); o0.frequency.linearRampToValueAtTime(f0 * 1.1, t0 + D * 0.3);
    o0.frequency.linearRampToValueAtTime(q ? f0 * 0.98 : f0 * 0.9, t - 0.15); o0.frequency.linearRampToValueAtTime(q ? f0 * 1.22 : f0 * 0.82, t);
    chain(o0, gainOf(0.45), sum); chain(vNoise(v, pink, t0, D + 0.1), gainOf(0.8), sum);
    sum.connect(f1); sum.connect(f2); chain(f1, lp); chain(f2, gainOf(0.4), lp); chain(lp, g, v.in);
  }

  // a laugh: breathy 'ha's on the vowel of 'father', each lower and breathier than the last
  function laugh(pos, o = {}) {
    const nervous = !!o.nervous, n = nervous ? 2 + ((rng() * 2) | 0) : Math.max(3, o.n | 0 || 5);
    const per = nervous ? 0.17 : 0.21 + rng() * 0.03;
    const v = at(pos, { ref: 4, range: 110, dur: n * per + 0.5, verb: 0.35, gain: nervous ? 5 : 8 }); if (!v) return;
    const t0 = v.t0, f1 = filt('bandpass', 760, 3), f2 = filt('bandpass', 1220, 4), lp = filt('lowpass', 2000, 0.5), sum = gainOf(1), g = ac.createGain();
    const f0 = (nervous ? 170 : 150) * (0.96 + rng() * 0.08), o0 = vOsc(v, 'sawtooth', f0, t0, t0 + n * per + 0.2);
    g.gain.setValueAtTime(0.0001, t0); o0.frequency.setValueAtTime(f0 * 1.15, t0);
    for (let i = 0; i < n; i++) {
      const tt = t0 + i * per * (1 + i * 0.06), amp = 0.08 * (1 - i / (n + 2)), on = per * 0.55;
      g.gain.linearRampToValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(amp, tt + 0.022); g.gain.linearRampToValueAtTime(amp * 0.4, tt + on * 0.7); g.gain.linearRampToValueAtTime(0.0001, tt + on);
      o0.frequency.linearRampToValueAtTime(f0 * (1.12 - i * 0.05), tt + 0.03);
    }
    const end = t0 + n * per * (1 + n * 0.06);
    g.gain.linearRampToValueAtTime(0, end + 0.05);
    const breath = gainOf(0.5); chain(vNoise(v, pink, t0, end - t0 + 0.1), breath, sum);
    breath.gain.setValueAtTime(0.4, t0); breath.gain.linearRampToValueAtTime(1.1, end);
    chain(o0, gainOf(0.5), sum); sum.connect(f1); sum.connect(f2); chain(f1, lp); chain(f2, gainOf(0.55), lp); chain(lp, g, v.in);
  }

  // the oud: a few partials, the higher dying faster; a nail's soft tick; a little body (a low resonance) under it
  function pluck(pos, o = {}) {
    const k = Math.max(0, Math.min(5, o.note | 0)), vel = o.v ?? 0.8, f = D3 * PENT[k] * TRUE[k];
    const v = at(pos, { ref: 3, range: 60, dur: 2.6, verb: 0.35, gain: 3 }); if (!v) return;
    const t0 = v.t0, lp = filt('lowpass', 2600, 0.6); lp.connect(v.in);
    for (let n = 1; n <= 6; n++) {
      const amp = 0.05 * vel * Math.pow(n, -1.15) * (n === 2 ? 1.2 : 1), dec = 1.6 / Math.pow(n, 0.75);
      stone(v, lp, 'sine', f * n * (1 + (n - 1) * 0.0015), t0, amp, 0.01, dec);
    }
    sgrain(v, lp, t0, Math.min(2200, f * 6), 2.5, 0.025 * vel, 0.03, pink, 0.003);
    stone(v, lp, 'sine', 196 * 0.5, t0 + 0.004, 0.012 * vel, 0.012, 0.18); // the bowl's thump
  }

  // a clay cup on stone: a dull knock (falling), two short inharmonic rings, a scrape of grit
  function cup(pos) {
    const v = at(pos, { ref: 2, range: 35, dur: 0.5, verb: 0.2, gain: 2.5 }); if (!v) return;
    const t0 = v.t0, o = vOsc(v, 'sine', 210, t0, t0 + 0.14), g = ac.createGain();
    o.frequency.setValueAtTime(210, t0); o.frequency.exponentialRampToValueAtTime(120, t0 + 0.06); shape(g, t0, 0.07, 0.004, 0.08); chain(o, g, v.in);
    for (const [f, a0, d] of [[1130, 0.012, 0.09], [1710, 0.006, 0.06]]) stone(v, v.in, 'sine', f * (0.98 + rng() * 0.04), t0 + 0.002, a0, 0.01, d);
    sgrain(v, v.in, t0, 1400, 1.5, 0.03, 0.04, pink, 0.003);
    sgrain(v, v.in, t0 + 0.05, 900, 1.2, 0.012, 0.06, brown, 0.006);
  }

  // the lamp's glass: a tiny dry tick and a faint ring, low in the bright band
  function tick(pos) {
    const v = at(pos, { ref: 1.5, range: 14, dur: 0.25, verb: 0.15, gain: 1.5 }); if (!v) return;
    const t0 = v.t0, lp = filt('lowpass', 2600, 0.6); lp.connect(v.in);
    sgrain(v, lp, t0, 1900 + rng() * 400, 4, 0.03, 0.03, white, 0.003);
    stone(v, lp, 'sine', 1500 + rng() * 300, t0, 0.004, 0.01, 0.07);
  }

  const cue = (name, pos, opts) => {
    if (name === 'house-murmur') murmur(pos, opts);
    else if (name === 'house-laugh') laugh(pos, opts);
    else if (name === 'house-pluck') pluck(pos, opts);
    else if (name === 'house-cup') cup(pos);
    else if (name === 'house-tick') tick(pos);
  };
  return { cue };
}
