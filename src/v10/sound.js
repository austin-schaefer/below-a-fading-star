// The acts' sounds (v10, #24): audio/cues.js hands every `act-*` cue here. Small, close and dry-ish: things done
// with a hand at arm's length, heard within a few metres and gone by twenty. A later act adds its cue here (or its
// own file, reached the same way) and a row in tools/audio-test.mjs.
//
//   act-offer   the offer rising (src/v10/acts.js), at the act's place: a soft knock of stone on stone (the chalk
//               lifted, a hand on the wall) and under it a low hum on D4 that is gone in a second. Detail tier, 20 m
//   act-chalk   the tally's stroke (src/v10/tally.js): chalk dragged down rough stone for as long as the stub draws
//               (opts.dur, s; 1.3 by default), a bite where it first touches, a grain that rasps and thins to the
//               lift; opts.bar: the bar across a gate of five, a longer, heavier drag. Bandpassed pink grains centred low (900-1600 Hz) and
//               lowpassed at 3.2 kHz, so the rasp stays out of the ear's sharpest band. Detail tier, 25 m
//   act-winch   the Halt's winch turning by itself (src/v10/halt-seat.js): the pawl's clack on each tooth of its
//               ratchet, as fast as the rope runs (opts.rate, m/s, over opts.dur, s: slow, quick, slow, as the seat
//               starts and stops), a dry wooden knock under an iron tick, and now and then the rope's creak over the
//               pulley. Detail tier, 30 m, so it is heard from the seat at the hatch
//   act-murmur  the sleeper answering a visitor at the hatch: two sleepy syllables, "mm-hm", a low voiced hum on A2
//               through a moving vowel, with breath. Detail tier, 12 m
import { softKit } from '../audio/cues-v2.js';
import { startCentralSound } from './sound-central.js'; // v10-A1: act-crystal, act-crystal-ring, act-knock, act-answer, act-plate
import { startStoriesSound } from './sound-stories.js'; // v10-A2: act-glasses, act-pinch, act-tribute
import { startBellSound } from './bell-sound.js'; // v10-A3: the bell under the Span (act-bell*)

export function startActsSound(a, ctx) {
  const { ac, voice, filt, chain, pink } = a;
  const rng = ctx.makeRng(1010);
  const { sgrain, stone, jit } = softKit({ ...a, rng }); // its jitter from this module's own stream, not the shared one
  const D4 = 293.66;
  const stories = startStoriesSound(a, ctx);

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
    const len = (o.dur > 0 ? Math.min(3, o.dur) : 1.3) * (o.bar && !(o.dur > 0) ? 1.2 : 1);
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
    drag(v.t0, len, o.bar ? 0.06 : 0.05);
  }

  // the pawl: one clack a tooth, eight teeth a turn of a 0.2 m drum; the times follow the seat's eased travel
  function winch(pos, o = {}) {
    const dur = Math.min(14, Math.max(0.5, o.dur || 6)), rate = Math.max(0.05, o.rate || 1.4);
    const v = voice(pos, { ref: 3, roll: 1, range: 30, dur: dur + 0.5, verb: 0.3, air: 60, gain: 7 }); if (!v) return;
    const out = filt('lowpass', 3600, 0.6); out.connect(v.in);
    const n = Math.min(160, Math.round((rate * dur) / (2 * Math.PI * 0.2) * 8));
    const ease = (u) => u * u * (3 - 2 * u);
    for (let k = 1; k <= n; k++) {
      let lo = 0, hi = 1; const want = k / (n + 1);
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (ease(m) < want) lo = m; else hi = m; }
      const at = v.t0 + lo * dur, pk = 0.05 * jit(1, 0.12);
      sgrain(v, out, at, jit(420, 0.05), 2.2, pk, 0.03, pink, 0.003); // the knock of the pawl's wood
      sgrain(v, out, at + 0.004, jit(1700, 0.05), 3.5, pk * 0.45, 0.018, pink, 0.003); // its iron tooth
      if (rng() < 0.06) sgrain(v, out, at + 0.02, jit(240, 0.08), 6, pk * 0.5, 0.25, pink, 0.06); // the rope's creak
    }
  }

  // a sleeper's "mm-hm": a voiced hum through a vowel that opens and closes, and a breath before it
  function murmur(pos) {
    const v = voice(pos, { ref: 1.5, roll: 1, range: 12, dur: 1.4, verb: 0.15, air: 40, gain: 5 }); if (!v) return;
    const t0 = v.t0, A2 = 110;
    sgrain(v, v.in, t0, jit(700, 0.05), 0.8, 0.012, 0.2, pink, 0.08); // the breath in
    for (const [d, len, f0, f1, pk] of [[0.28, 0.24, 1, 1.06, 0.05], [0.6, 0.42, 1.08, 0.94, 0.045]]) {
      const at = t0 + d, bp = filt('bandpass', 420, 2.2), lp = filt('lowpass', 900, 0.6);
      bp.frequency.setValueAtTime(380, at); bp.frequency.linearRampToValueAtTime(620, at + len * 0.5); bp.frequency.linearRampToValueAtTime(400, at + len);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(pk, at + 0.06);
      g.gain.setTargetAtTime(pk * 0.6, at + 0.08, len * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, at + len + 0.08); g.gain.linearRampToValueAtTime(0, at + len + 0.09);
      const os = a.vOsc(v, 'triangle', A2 * f0 * jit(1, 0.01), at, at + len + 0.12);
      os.frequency.setValueAtTime(os.frequency.value, at); os.frequency.linearRampToValueAtTime(A2 * f1, at + len);
      chain(os, bp, lp, g, v.in);
    }
  }

  const bell = startBellSound(a, ctx); // its own rng
  const central = startCentralSound(a, ctx); // v10-A1
  function cue(name, pos, opts) {
    if (central.cue(name, pos, opts)) return; // v10-A1
    if (name.startsWith('act-bell')) bell.cue(name, pos, opts);
    else if (name === 'act-offer') offer(pos);
    else if (name === 'act-chalk') chalk(pos, opts);
    else if (name === 'act-winch') winch(pos, opts);
    else if (name === 'act-murmur') murmur(pos);
    else stories.cue(name, pos, opts);
  }
  return { cue };
}
