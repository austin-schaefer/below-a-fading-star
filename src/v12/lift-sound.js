// The lift's sounds (v12-H4, src/v12/lift.js): old iron, chain and a slow counterweight, in D (the acts' centre, D4 for
// the station's bell, A4 the carriage's little answering bell). Routed from src/v10/sound.js's cue(); each a one-shot
// voice placed where the thing is (the running is cued again every 1.2 s at the carriage, so it travels with it).
//   act-lift-bell    the station's (or the gallery's) bell rung by its pull: a bronze strike on D4, church-bell partials,
//                    long tail. Punctuation, heard 140 m (the carriage hears it up the face)
//   act-lift-answer  the carriage's little bell answering, A4, short: heard from the floor (260 m) as it sets off
//   act-lift-run     1.3 s of the carriage running (opts.speed m/s): the pawl's clack on the head's ratchet, one a 0.6 m
//                    of cable, a low hum of the cable on its sheaves (D2) that rises a little with speed, now and then a
//                    link's rattle. Detail tier, heard 220 m, so its approach is heard before it is seen clearly
//   act-lift-clank   a jolt (opts.amp, 0.02..0.1): a dull iron thump and a short ring of the cage. The start, a judder,
//                    the stop, the slip, the arrival
//   act-lift-door    a grille sliding (opts.open): a rasp of iron on iron for a second and a clack at the end
//   act-lift-lever   the brass lever thrown: a ratchet click and a clunk
//   act-lift-creak   the stop: the whole cage and cable under strain, a long low groan of iron
import { softKit } from '../audio/cues-v2.js';

export function startLiftSound(a, ctx) {
  const { ac, voice, filt, chain, pink, vOsc } = a;
  const rng = ctx.makeRng(1208);
  const { sgrain, stone, jit } = softKit({ ...a, rng });
  const D2 = 73.42, D4 = 293.66, A4 = 440;
  const BELL = [[0.5, 0.5, 3.2], [1, 1, 2.6], [1.0045, 0.38, 2.3], [1.183, 0.4, 1.9], [1.506, 0.26, 1.5], [2.0, 0.28, 1.3], [2.74, 0.12, 0.9], [3.01, 0.08, 0.7]];
  function bellStrike(v, f, amp, life) {
    const t0 = v.t0;
    for (const [r, k, d] of BELL) {
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(amp * k, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d * life); g.gain.linearRampToValueAtTime(0, t0 + d * life + 0.01);
      chain(vOsc(v, 'sine', f * r * (1 + (rng() - 0.5) * 0.003), t0, t0 + d * life + 0.05), g, v.in);
    }
    sgrain(v, v.in, t0, 900, 1.4, amp * 0.6, 0.03, pink, 0.004); // the clapper on the bronze
  }
  function bell(pos) {
    const v = voice(pos, { ref: 4, roll: 1, range: 140, dur: 5.2, verb: 0.45, air: 120, gain: 1 }); if (!v) return;
    bellStrike(v, D4 * jit(1, 0.004), 0.055, 1.7);
  }
  function answer(pos) {
    const v = voice(pos, { ref: 6, roll: 0.8, range: 260, dur: 2.6, verb: 0.5, air: 160, gain: 1 }); if (!v) return;
    bellStrike(v, A4 * jit(1, 0.004), 0.05, 0.7);
  }
  function run(pos, o = {}) {
    const dur = 1.3, sp = Math.max(0.3, o.speed || 3);
    const v = voice(pos, { ref: 5, roll: 1, range: 220, dur: dur + 0.3, verb: 0.35, air: 140, gain: 6 }); if (!v) return;
    const out = filt('lowpass', 2600, 0.6); out.connect(v.in);
    const t0 = v.t0, n = Math.min(22, Math.round((sp * dur) / 0.6));
    for (let k = 0; k < n; k++) { // the pawl on the head's ratchet: dry, iron, a tooth each 0.6 m of cable
      const at = t0 + 0.05 + (k + rng() * 0.15) * (dur - 0.1) / Math.max(1, n), pk = 0.03 * jit(1, 0.15);
      sgrain(v, out, at, jit(1300, 0.05), 3.2, pk, 0.02, pink, 0.003);
      sgrain(v, out, at + 0.003, jit(380, 0.05), 2.0, pk * 0.8, 0.035, pink, 0.003);
    }
    if (rng() < 0.45) sgrain(v, out, t0 + rng() * dur, jit(620, 0.1), 1.6, 0.025, 0.18, pink, 0.02); // a link's rattle
    // the cable's hum on the sheaves: a soft low tone that fades in and out across the segment (they overlap 0.1 s)
    const f = D2 * (1 + 0.06 * Math.min(1, sp / 5));
    for (const [r, amp] of [[1, 0.05], [2, 0.022], [3, 0.008]]) {
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(amp * Math.min(1, sp / 3), t0 + 0.15);
      g.gain.setValueAtTime(amp * Math.min(1, sp / 3), t0 + dur - 0.15); g.gain.linearRampToValueAtTime(0.0001, t0 + dur); g.gain.linearRampToValueAtTime(0, t0 + dur + 0.01);
      chain(vOsc(v, 'triangle', f * r, t0, t0 + dur + 0.05), filt('lowpass', 420, 0.7), g, v.in);
    }
  }
  function clank(pos, o = {}) {
    const k = Math.min(1, Math.max(0.2, (o.amp || 0.05) / 0.07));
    const v = voice(pos, { ref: 4, roll: 1, range: 160, dur: 1.4, verb: 0.35, air: 120, gain: 4 }); if (!v) return;
    const t0 = v.t0;
    sgrain(v, v.in, t0, jit(150, 0.06), 1.1, 0.09 * k, 0.12, pink, 0.004); // the thump
    sgrain(v, v.in, t0 + 0.005, jit(820, 0.06), 2.4, 0.04 * k, 0.06, pink, 0.003);
    stone(v, v.in, 'sine', D4 * 0.75 * jit(1, 0.01), t0 + 0.01, 0.012 * k, 0.012, 0.7); // the cage rings, A3, short
    stone(v, v.in, 'sine', D4 * 1.12 * jit(1, 0.01), t0 + 0.012, 0.006 * k, 0.012, 0.45);
  }
  function door(pos, o = {}) {
    const v = voice(pos, { ref: 2.5, roll: 1, range: 40, dur: 1.8, verb: 0.25, air: 60, gain: 5 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 2800, 0.7); out.connect(v.in);
    let t = t0;
    while (t < t0 + 1.15) { sgrain(v, out, t, 700 + rng() * 500, 3, 0.012 + rng() * 0.01, 0.03, pink, 0.004); t += 0.035 + rng() * 0.04; }
    sgrain(v, out, t0 + 1.25, jit(520, 0.05), 1.8, o.open ? 0.04 : 0.06, 0.08, pink, 0.003); // the stop, shut harder
  }
  function lever(pos) {
    const v = voice(pos, { ref: 2, roll: 1, range: 25, dur: 0.8, verb: 0.2, air: 40, gain: 5 }); if (!v) return;
    const t0 = v.t0;
    for (let k = 0; k < 3; k++) sgrain(v, v.in, t0 + k * 0.05, jit(1500, 0.05), 3.5, 0.025, 0.015, pink, 0.003);
    sgrain(v, v.in, t0 + 0.2, jit(260, 0.05), 1.5, 0.06, 0.1, pink, 0.004);
  }
  function creak(pos) {
    const v = voice(pos, { ref: 4, roll: 1, range: 120, dur: 2.4, verb: 0.4, air: 100, gain: 5 }); if (!v) return;
    const t0 = v.t0, bp = filt('bandpass', 180, 6), lp = filt('lowpass', 700, 0.6);
    bp.frequency.setValueAtTime(150, t0); bp.frequency.linearRampToValueAtTime(230, t0 + 0.9); bp.frequency.linearRampToValueAtTime(170, t0 + 1.9);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 0.35);
    g.gain.setValueAtTime(0.06, t0 + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.0); g.gain.linearRampToValueAtTime(0, t0 + 2.01);
    chain(a.vNoise(v, pink, t0, 2.1), bp, lp, g, v.in);
    // the stick-slip in it: soft ticks at an uneven rate
    let t = t0 + 0.2;
    while (t < t0 + 1.8) { sgrain(v, lp, t, 240 + rng() * 120, 5, 0.012, 0.05, pink, 0.006); t += 0.08 + rng() * 0.12; }
  }
  function cue(name, pos, opts) {
    if (name === 'act-lift-bell') bell(pos);
    else if (name === 'act-lift-answer') answer(pos);
    else if (name === 'act-lift-run') run(pos, opts);
    else if (name === 'act-lift-clank') clank(pos, opts);
    else if (name === 'act-lift-door') door(pos, opts);
    else if (name === 'act-lift-lever') lever(pos);
    else if (name === 'act-lift-creak') creak(pos);
    else return false;
    return true;
  }
  return { cue };
}
