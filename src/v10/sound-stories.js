// The story acts' sounds (v10-A2), reached from src/v10/sound.js. Close and dry, heard within a few metres.
//
//   act-glasses  drinking to the twelfth (src/v10/chair.js): the wine poured (1 to 2.6 s, rising in pitch as the glass fills), then the eleven glasses
//                answering one after another round the table, each a thin glass ping (a sine pair a little out of
//                true, 0.25 s apart, from 3 s in) with a breath of wind-chime shimmer, and
//                last his, lower and fuller, with a long fade. 7 s. Detail tier, 30 m
//   act-pinch    a pinch of salt taken up from the split sack (src/v10/salt.js): a dry rasp of grains between finger
//                and thumb, 0.35 s. 12 m
//   act-tribute  the pinch paid at the pile: grains pattering onto salt, a dry scrap of cloth drawn out, then two thin
//                glassy chirps (a Twk-man's thanks, the second lower). 1.8 s. 20 m
import { softKit } from '../audio/cues-v2.js';

export function startStoriesSound(a, ctx) {
  const { voice, filt, pink, white } = a;
  const rng = ctx.makeRng(1011);
  const { sgrain, stone, jit } = softKit({ ...a, rng });
  // eleven pitches round the table: a pentatonic on D, the order scrambled so neighbours are not a scale
  const RING = [1, 1.5, 1.125, 1.78, 1.335, 2, 1.19, 1.68, 1.5, 2.25, 1.335];

  function glasses(pos) {
    const v = voice(pos, { ref: 2.5, roll: 1, range: 30, dur: 7.5, verb: 0.35, air: 60, gain: 5 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 5200, 0.6); out.connect(v.in);
    // the wine, poured: a short bright trickle
    for (let t = t0 + 1.0; t < t0 + 2.6; t += 0.012 + rng() * 0.02) sgrain(v, out, t, jit(1800 + 900 * (t - t0 - 1) / 1.6, 0.2), 3, 0.014, 0.03, pink, 0.003); // the pour, its pitch rising as the glass fills
    for (let i = 0; i < 11; i++) {
      const at = t0 + 3.0 + i * 0.25, f = 1175 * RING[i] * jit(1, 0.004), pk = 0.032 * (1 - i * 0.025);
      stone(v, out, 'sine', f, at, pk, 0.003, 1.1);
      stone(v, out, 'sine', f * 2.76 * jit(1, 0.01), at, pk * 0.35, 0.003, 0.5); // glass's inharmonic partial
      stone(v, out, 'sine', f * 1.004, at, pk * 0.5, 0.003, 1.4); // beating twin
      sgrain(v, out, at, jit(4200, 0.1), 2, 0.012, 0.012, white, 0.002); // the touch of rim on rim
    }
    const at = t0 + 3.0 + 11 * 0.25 + 0.1; // his: deeper, and longer, and last
    stone(v, out, 'sine', 587, at, 0.05, 0.004, 2.2);
    stone(v, out, 'sine', 587 * 1.004, at, 0.03, 0.004, 2.6);
    stone(v, out, 'sine', 587 * 2.76, at, 0.012, 0.003, 0.9);
    sgrain(v, out, at, 3600, 2, 0.015, 0.014, white, 0.002);
  }

  function pinch(pos) {
    const v = voice(pos, { ref: 1.5, roll: 1, range: 12, dur: 0.8, verb: 0.1, air: 60, gain: 6 }); if (!v) return;
    const out = filt('highpass', 2200, 0.5); out.connect(v.in);
    for (let t = v.t0, k = 0; k < 26; k++) { sgrain(v, out, t, jit(4800, 0.25), 2.5, 0.014 * (1 - k / 40), 0.01 + rng() * 0.012, white, 0.002); t += 0.006 + rng() * 0.016; }
  }

  function tribute(pos) {
    const v = voice(pos, { ref: 2, roll: 1, range: 20, dur: 2.4, verb: 0.25, air: 60, gain: 6 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 6500, 0.6); out.connect(v.in);
    for (let k = 0; k < 18; k++) sgrain(v, out, t0 + 0.05 + k * (0.02 + rng() * 0.025), jit(4200, 0.25), 2.5, 0.016 * (1 - k / 30), 0.012, white, 0.002);
    sgrain(v, out, t0 + 1.0, 900, 1.2, 0.02, 0.18, pink, 0.04); // a scrap of cloth drawn over tile
    for (const [dt, f0, f1] of [[1.25, 3300, 2900], [1.5, 2500, 2200]]) { // two thin chirps
      const o = stone(v, out, 'sine', f0, t0 + dt, 0.026, 0.01, 0.14);
      o.frequency.setValueAtTime(f0, t0 + dt); o.frequency.exponentialRampToValueAtTime(f1, t0 + dt + 0.14);
    }
  }

  function cue(name, pos) {
    if (name === 'act-glasses') glasses(pos);
    else if (name === 'act-pinch') pinch(pos);
    else if (name === 'act-tribute') tribute(pos);
    else return false;
    return true;
  }
  return { cue };
}
