// The acts' sounds (v10, #24): audio/cues.js hands every `act-*` cue here. Small, close and dry-ish: things done
// with a hand at arm's length, heard within a few metres and gone by twenty. A later act adds its cue here (or its
// own file, reached the same way) and a row in tools/audio-test.mjs.
//
//   act-offer   the offer rising (src/v10/acts.js), at the act's place: a soft knock of stone on stone (the chalk
//               lifted, a hand on the wall) and under it a low hum on D4 that is gone in a second. Detail tier, 20 m
//   act-chalk   the tally's stroke (src/v10/tally.js): chalk dragged down rough stone for half a second, a bite where
//               it first touches, a grain that rasps and thins to the lift; opts.bar: the bar across a gate of five,
//               a longer drag. Bandpassed pink grains centred low (900-1600 Hz) and
//               lowpassed at 3.2 kHz, so the rasp stays out of the ear's sharpest band. Detail tier, 25 m
import { softKit } from '../audio/cues-v2.js';

export function startActsSound(a, ctx) {
  const { ac, voice, filt, chain, pink } = a;
  const rng = ctx.makeRng(1010);
  const { sgrain, stone, jit } = softKit(a);
  const D4 = 293.66;

  function offer(pos) {
    const v = voice(pos, { ref: 2.5, roll: 1, range: 20, dur: 1.6, verb: 0.3, air: 60, gain: 4 }); if (!v) return;
    const t0 = v.t0;
    sgrain(v, v.in, t0, jit(520, 0.05), 1.6, 0.05, 0.05, pink, 0.004); // the knock
    sgrain(v, v.in, t0 + 0.012, jit(1100, 0.05), 2.2, 0.018, 0.03, pink, 0.003);
    const lp = filt('lowpass', 900, 0.6); lp.connect(v.in);
    stone(v, lp, 'sine', D4 * jit(1, 0.003), t0 + 0.02, 0.022, 0.06, 0.9); // the hum: tonal, so a 60 ms attack
    stone(v, lp, 'sine', D4 * 1.5 * jit(1, 0.003), t0 + 0.05, 0.007, 0.08, 0.6); // its fifth, faint
  }

  function chalk(pos, o = {}) {
    const len = o.bar ? 0.62 : 0.5;
    const v = voice(pos, { ref: 2, roll: 1, range: 25, dur: len + 0.4, verb: 0.2, air: 60, gain: 12 }); if (!v) return;
    const out = filt('lowpass', 3200, 0.6); out.connect(v.in);
    const drag = (at, dur, peak) => {
      // the bite: a short dull tick as the chalk meets the stone
      sgrain(v, out, at, jit(700, 0.06), 1.4, peak * 0.9, 0.03, pink, 0.003);
      // the rasp: grains at an uneven rate (the stone's grain), louder in the middle of the stroke, thinning to the lift
      let t = at + 0.015;
      while (t < at + dur) {
        const u = (t - at) / dur, env = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - 0.5 * u);
        sgrain(v, out, t, 900 + rng() * 700, 2.5 + rng() * 2, peak * (0.35 + 0.65 * env) * (0.6 + 0.4 * rng()), 0.012 + rng() * 0.012, pink, 0.003);
        t += 0.009 + rng() * 0.014;
      }
      // the body of the drag under the grains: a breath of low noise
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak * 0.25, at + 0.05);
      g.gain.linearRampToValueAtTime(peak * 0.18, at + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.06); g.gain.linearRampToValueAtTime(0, at + dur + 0.07);
      chain(a.vNoise(v, pink, at, dur + 0.1), filt('bandpass', 520, 1.2), g, out);
    };
    drag(v.t0, len, 0.05);
  }

  function cue(name, pos, opts) {
    if (name === 'act-offer') offer(pos);
    else if (name === 'act-chalk') chalk(pos, opts);
  }
  return { cue };
}
