// The sounds of the crystal and the door (v10-A1), reached through src/v10/sound.js like every act-* cue.
//
//   act-crystal       the hand on the mother crystal (src/v10/crystal.js), at the hand: a soft glass touch, the Lattice's
//                     own A4 swelling out of the glass, then the harmonic series of A entering one partial at a time
//                     (2, 3, 4, 5, 6) as the band climbs, each ringing on. Nothing new: the Lattice's hum, opened up.
//                     Punctuation, 120 m
//   act-crystal-ring  the ring through the field, from the crystal: A2-A3-E4-A4 beating slowly (1-3 Hz apart, as the hum
//                     does), swelling over a second and dying over six, much of it in the room. opts.back: the field
//                     sending it back, a swell that grows toward the end instead. Punctuation, 400 m
//   act-knock         the great ring dropped on its stud (src/v10/door.js): a heavy bronze clank (a bell's inharmonic
//                     partials on 196 Hz, gone in 0.7 s), a click of metal on metal, and the leaf's deep thump. Detail, 50 m
//   act-answer        a knock from inside: a thump in the dark, lowpassed by the stone and the distance it comes from;
//                     opts.near 0..1 (0: far below, quiet, dark, two late echoes off a great depth; 1: just behind the
//                     bronze, loud and close, the door rattling in its frame). Detail, 60 m
//   act-plate         his bronze plate pushed out under the door: a long low scrape of metal over stone, a knock as it
//                     drops off the threshold's lip, and a dull settle. Detail, 20 m
import { softKit } from '../audio/cues-v2.js';

export function startCentralSound(a, ctx) {
  const { ac, voice, filt, chain, pink, vOsc } = a;
  const rng = ctx.makeRng(1012);
  const { shape, sgrain, stone, jit } = softKit({ ...a, rng });
  const A4 = 440;

  function crystal(pos) {
    const v = voice(pos, { ref: 4, roll: 1, range: 120, dur: 9, verb: 0.55, air: 120, gain: 1.4 }); if (!v) return;
    const t0 = v.t0;
    const lp = filt('lowpass', 3800, 0.6); lp.connect(v.in);
    sgrain(v, lp, t0, jit(1900, 0.03), 2.5, 0.02, 0.08, pink, 0.006); // the palm on glass
    // the Lattice's A4 swelling out of the glass under the hand, beating 1.2 Hz as the hum does
    for (const [f, amp] of [[A4 * 1.001, 0.05], [A4 * 1.0037, 0.035]]) {
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(amp, t0 + 0.5);
      g.gain.setTargetAtTime(amp * 0.5, t0 + 1.2, 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 8.5); g.gain.linearRampToValueAtTime(0, t0 + 8.55);
      chain(vOsc(v, 'sine', f, t0, t0 + 8.6), g, lp);
    }
    // the harmonic series entering as the band climbs (1.6 to 5.6 s), each partial ringing on and dying
    const parts = [[2, 0.03], [3, 0.022], [4, 0.016], [5, 0.011], [6, 0.008]];
    parts.forEach(([h, amp], i) => {
      const at = t0 + 1.6 + i * 0.85;
      stone(v, lp, 'sine', A4 * h * jit(1, 0.0015), at, amp, 0.08, 3.2 - i * 0.3);
    });
  }

  function crystalRing(pos, o = {}) {
    const back = !!o.back;
    const v = voice(pos, { ref: 30, roll: 0.8, range: 400, dur: 8, verb: 0.8, air: 200, gain: 1.6 }); if (!v) return;
    const t0 = v.t0, lp = filt('lowpass', 2400, 0.5); lp.connect(v.in);
    for (const [f, amp] of [[110, 0.03], [110.9, 0.022], [220.4, 0.04], [329.6, 0.026], [331.2, 0.02], [440.5, 0.03], [441.7, 0.02]]) {
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      if (back) { g.gain.linearRampToValueAtTime(amp * 0.3, t0 + 2); g.gain.linearRampToValueAtTime(amp, t0 + 5.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.5); }
      else { g.gain.linearRampToValueAtTime(amp, t0 + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 7.5); }
      g.gain.linearRampToValueAtTime(0, t0 + 7.55);
      chain(vOsc(v, 'sine', f, t0, t0 + 7.6), g, lp);
    }
  }

  const BRONZE = [[1, 1, 0.35], [2.32, 0.5, 0.22], [3.7, 0.28, 0.14], [5.1, 0.12, 0.08]];
  function knock(pos) {
    const v = voice(pos, { ref: 2.5, roll: 1, range: 50, dur: 1.4, verb: 0.4, air: 60, gain: 2.4 }); if (!v) return;
    const t0 = v.t0, lp = filt('lowpass', 3600, 0.6); lp.connect(v.in);
    const f0 = jit(196, 0.01);
    for (const [r, amp, d] of BRONZE) stone(v, lp, 'sine', f0 * r, t0, 0.035 * amp, 0.01, d * 2);
    sgrain(v, lp, t0, jit(1300, 0.04), 1.6, 0.06, 0.035, pink, 0.003); // metal on metal
    const th = stone(v, lp, 'sine', 80, t0, 0.09, 0.01, 0.3); // the leaf's thump
    th.frequency.setValueAtTime(80, t0); th.frequency.exponentialRampToValueAtTime(52, t0 + 0.25);
  }

  function answer(pos, o = {}) {
    const near = Math.max(0, Math.min(1, o.near ?? 0));
    const v = voice(pos, { ref: 3, roll: 1, range: 60, dur: 2.4, verb: 0.3 + 0.6 * (1 - near), air: 60, gain: 1.6 + 2.6 * near }); if (!v) return;
    const t0 = v.t0, lp = filt('lowpass', 260 + 1100 * near, 0.7); lp.connect(v.in);
    const hit = (at, k) => {
      const th = stone(v, lp, 'sine', 88, at, 0.09 * k, 0.008, 0.3 + 0.2 * (1 - near));
      th.frequency.setValueAtTime(88, at); th.frequency.exponentialRampToValueAtTime(55, at + 0.25);
      sgrain(v, lp, at, jit(420, 0.05), 1.2, 0.07 * k, 0.06, pink, 0.004);
    };
    hit(t0, 1);
    // from far below the knock comes back off a great depth, twice
    if (near < 0.6) { hit(t0 + 0.42, 0.35 * (1 - near)); hit(t0 + 0.97, 0.18 * (1 - near)); }
    // just behind the bronze: the door rattles in its frame
    if (near > 0.5) {
      const r = filt('bandpass', 760, 2.2); r.connect(v.in);
      for (let k = 0; k < 9; k++) sgrain(v, r, t0 + 0.02 + k * 0.028 + rng() * 0.01, jit(760, 0.08), 3, 0.035 * near * (1 - k / 10), 0.02, pink, 0.003);
      for (const [rr, amp, d] of BRONZE) stone(v, lp, 'sine', 330 * 0.8 * rr, t0 + 0.01, 0.012 * amp * near, 0.01, d * 1.5);
    }
  }

  function plate(pos) {
    const v = voice(pos, { ref: 2, roll: 1, range: 20, dur: 1.8, verb: 0.3, air: 40, gain: 3 }); if (!v) return;
    const t0 = v.t0, lp = filt('lowpass', 3000, 0.6); lp.connect(v.in);
    let t = t0;
    while (t < t0 + 1.1) { const u = (t - t0) / 1.1; sgrain(v, lp, t, 900 + rng() * 700, 2.5, 0.016 * (1 - u * 0.6), 0.016, pink, 0.003); t += 0.016 + rng() * 0.02; }
    const drop = t0 + 0.45; // off the threshold's lip
    stone(v, lp, 'sine', jit(520, 0.01), drop, 0.02, 0.01, 0.25);
    sgrain(v, lp, drop, 700, 1.5, 0.03, 0.03, pink, 0.003);
    const end = t0 + 1.15;
    stone(v, lp, 'sine', jit(410, 0.01), end, 0.014, 0.01, 0.3); // the settle
    stone(v, lp, 'sine', jit(980, 0.01), end, 0.005, 0.01, 0.2);
  }
  void shape;
  function cue(name, pos, opts) {
    if (name === 'act-crystal') crystal(pos, opts);
    else if (name === 'act-crystal-ring') crystalRing(pos, opts);
    else if (name === 'act-knock') knock(pos);
    else if (name === 'act-answer') answer(pos, opts);
    else if (name === 'act-plate') plate(pos);
    else return false;
    return true;
  }
  return { cue };
}
