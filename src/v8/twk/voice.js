// v8-07 the Twk-men's voice (briefs/v8/brief-v8-07-twk.md, the sound-design skill). Short, quiet and near: one-shot
// voices through the shared voice system (k.voice, the cap of 12; audio/living.js is the pattern), heard to 22-25 m.
//   twk-buzz     a wing flutter as one takes off or comes at you: pink noise in a soft band round 500 Hz under a
//                lowpass, its level fluttered at 27-31 Hz (depth 0.2, the rate sliding so it is no fixed line), with a
//                breath of D3 under it; 0.6 s, swelled in over 70 ms
//   twk-chirrup  a thin chirrup of speech, never a word: tiny gliding syllables on the D minor pentatonic in the fifth
//                and sixth octaves (D5 587, F5 698, G5 784, A5 880, C6 1047, D6 1175), triangles under a 1.9 kHz
//                lowpass so nothing sits in 2-5 kHz; each rider a few cents off true, by its index. Moods:
//                  sniff      'hm - hmph': a nasal puff, a short A5, a long fall from C6 to F5 (the inspection's end,
//                             the escort's, the salute's drop)
//                  indignant  four fast rising syllables and a squeak with a tremble (the guard)
//   twk-quarrel  two thin angry voices at once, either side of the pair, cutting in on each other for 1.8 s
import { softKit } from '../../audio/cues-v2.js';

const D = { D5: 587.33, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66 };

export function startTwk(k) {
  const { ac, voice, vOsc, vNoise, filt, gainOf, chain, swell, pink } = k;
  const rng = k.ctx.makeRng(80791);
  const { shape } = softKit(k);
  const near = (range, dur, ref = 1.2) => ({ ref, roll: 1, range, dur, verb: 0.07, air: 40 });
  const cents = (i) => Math.pow(2, (((i * 37) % 11) - 5) / 1200); // -5..+5 cents, fixed per rider

  function buzz(pos, opts) {
    const v = voice(pos, { ...near(22, 0.8), gain: 1 }); if (!v) return;
    const t0 = v.t0, Dur = 0.55 + rng() * 0.15;
    const bp = filt('bandpass', 480 + rng() * 80, 1.1), lp = filt('lowpass', 1600, 0.6);
    const am = gainOf(0.8), lfo = vOsc(v, 'sine', 31, t0, t0 + Dur + 0.05);
    lfo.frequency.setValueAtTime(30 + rng() * 2, t0); lfo.frequency.linearRampToValueAtTime(26 + rng() * 2, t0 + Dur);
    chain(lfo, gainOf(0.2), am.gain);
    const eg = ac.createGain(); swell(eg, t0, 0.15, 0.07, t0 + Dur);
    chain(vNoise(v, pink, t0, Dur + 0.05), bp, lp, am, eg, v.in);
    const h = vOsc(v, 'triangle', 146.83 * cents(opts?.voice | 0), t0, t0 + Dur + 0.05), hg = ac.createGain();
    swell(hg, t0, 0.02, 0.09, t0 + Dur * 0.9); chain(h, filt('lowpass', 380, 0.6), hg, am);
  }

  // one syllable: a triangle gliding f0 -> f1 over len, a 12 ms attack and a 45 ms or longer release
  function syl(v, dest, at, f0, f1, len, peak) {
    const o = vOsc(v, 'triangle', f0, at, at + len + 0.12);
    o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + len);
    const g = ac.createGain(); shape(g, at, peak, 0.012, Math.max(0.045, len * 0.8));
    chain(o, g, dest);
  }
  function mouth(v) { const lp = filt('lowpass', 1900, 0.6), bp = filt('peaking', 1300, 1.2); bp.gain.value = 4; chain(bp, lp, v.in); return bp; }

  function chirrup(pos, opts) {
    const mood = opts?.mood || 'sniff', c = cents(opts?.voice | 0);
    const v = voice(pos, near(25, 1.4, 2)); if (!v) return;
    const t0 = v.t0, m = mouth(v), j = () => 1 + (rng() * 2 - 1) * 0.03;
    if (mood === 'indignant') {
      const notes = [D.D5, D.F5, D.G5, D.A5];
      let at = t0;
      for (const f of notes) { syl(v, m, at, f * c * j(), f * c * 1.04, 0.06, 0.08); at += 0.085 + rng() * 0.02; }
      const o = vOsc(v, 'triangle', D.C6 * c, at, at + 0.4), g = ac.createGain();
      const tr = vOsc(v, 'sine', 11, at, at + 0.4); chain(tr, gainOf(18), o.frequency);
      shape(g, at, 0.085, 0.015, 0.22); chain(o, g, m);
    } else {
      // the sniff: a puff through the nose, then 'hm', then the long 'hmph' falling away
      const ng = ac.createGain(); shape(ng, t0, 0.05, 0.01, 0.07);
      chain(vNoise(v, pink, t0, 0.12), filt('bandpass', 1200, 1.4), ng, v.in);
      syl(v, m, t0 + 0.1, D.A5 * c * j(), D.A5 * c * 1.02, 0.07, 0.07);
      syl(v, m, t0 + 0.24, D.C6 * c * j(), D.F5 * c, 0.24, 0.08);
    }
  }

  function quarrel(pos, opts) {
    const base = opts?.voice | 0;
    for (const [side, hi] of [[1, true], [-1, false]]) {
      const p = { x: pos.x + 0.25 * side, y: pos.y, z: pos.z };
      const v = voice(p, near(30, 2.2, 3)); if (!v) continue; // heard from where you would watch it
      const c = cents(base + (hi ? 0 : 1)), m = mouth(v);
      const notes = hi ? [D.D6, D.C6, D.A5] : [D.A5, D.G5, D.F5];
      let at = v.t0 + (hi ? 0 : 0.11);
      while (at < v.t0 + 1.8) {
        const f = notes[(rng() * 3) | 0] * c, up = rng() < 0.5;
        const len = 0.05 + rng() * 0.05;
        syl(v, m, at, f, f * (up ? 1.12 : 0.9), len, 0.06 + rng() * 0.02);
        at += len + 0.08 + rng() * 0.12; // they cut in on each other: the gaps of one are the other's syllables
      }
    }
  }

  return { buzz, chirrup, quarrel, cue(name, pos, opts) { if (name === 'twk-buzz') buzz(pos, opts); else if (name === 'twk-chirrup') chirrup(pos, opts); else if (name === 'twk-quarrel') quarrel(pos, opts); } };
}
