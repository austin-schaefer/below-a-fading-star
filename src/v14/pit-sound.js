// The Pit's sounds (v14-D2): its own wind, and the sounding (v14/pit.js). All in D (palette.md).
//
//   the breath   a positional loop at the Nadir, built when the eye goes down into the Pit or the ground near it (its
//                level by how far under the moor the eye is: nothing at the lip, which sounds as it always has; full
//                on the floor and in a passage under the moor within 60 m): a low brown rumble, a hollow howl through
//                two narrow bands on A3 and D4 (the well's own note), a rush of air above; it breathes in slow surges
//                (11-16 s), sinks and darkens while the Pit draws its breath in after the lead, and swells with the gust
//   act-pit-pawl   the pawl knocked up off the ratchet: an iron clack and a short ring. Detail, 25 m
//   act-pit-run    the drum running out (opts.dur s): a wooden rattle quickening as the line pays out, a rope's hiss
//                  rising under it, gone at the line's end. Detail, 40 m
//   act-pit-taut   the bitter end: a heavy thump in the sheers and the line's thrum on D2, its partials a string's,
//                  ringing three seconds. Punctuation, 120 m (heard at the lip)
//   act-pit-breath the outer wind up the line (opts.dur s): a great swell of air brightening as it rises and the line
//                  singing on D4 and A4, two voices four cents apart. Punctuation, 150 m (heard at the lip and out on
//                  the moor round it)
//   act-pit-home   the lead come home: a glass ring, D5 with a crystal's upper partials. Detail, 30 m
import { softKit } from '../audio/cues-v2.js';

const D2 = 73.42, A3 = 220.0, D4 = 293.66, A4 = 440.0, D5 = 587.33;

export function startPitSound(a, ctx) {
  const { ac, voice, filt, chain, pink, brown, loopSrc, panner, setPos, cueBus, verbIn, gainOf } = a;
  const rng = ctx.makeRng(14202);
  const { sgrain, stone, jit } = softKit({ ...a, rng });
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // ---- the breath
  const B = { on: false, parts: null, quiet: -1 };
  function start(P) {
    const out = ac.createGain(); out.gain.value = 0.0001;
    const p = panner('equalpower', 8, 1, 400); setPos(p, P.apex[0], P.yHole + 1, P.apex[2]);
    const low = filt('lowpass', 150, 0.7), lowG = gainOf(0.9);
    const howlA = filt('bandpass', A3, 9), howlD = filt('bandpass', D4 * 1.003, 9), howlG = gainOf(2.4);
    const rush = filt('bandpass', 700, 0.8), rushG = gainOf(0.16), top = filt('lowpass', 2400, 0.6);
    const srcs = [loopSrc(brown, rng()), loopSrc(pink, rng()), loopSrc(pink, rng())];
    chain(srcs[0], low, lowG, out);
    chain(srcs[1], howlA, howlG); chain(srcs[1], howlD, howlG); howlG.connect(out);
    chain(srcs[2], rush, top, rushG, out);
    chain(out, p, cueBus);
    const vs = gainOf(0.35); p.connect(vs); vs.connect(verbIn);
    B.parts = { srcs, p, out, low, howlA, howlD, howlG, rush, rushG, vs };
    B.on = true; B.quiet = -1;
  }
  function stop() {
    const P = B.parts; if (!P) return;
    const now = ac.currentTime;
    for (const s of P.srcs) { try { s.stop(now + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { P.p.disconnect(); P.out.disconnect(); P.vs.disconnect(); } catch (e) { /* gone */ } }, 200);
    B.parts = null; B.on = false;
  }
  let acc = 0;
  ctx.registerUpdate((dt, t) => {
    acc += dt; if (acc < 0.1) return; acc = 0;
    const P = ctx.pit; if (!P || P.off || ac.state === 'closed') return;
    const cam = ctx.camera.position, d = Math.hypot(cam.x - P.reel.x, cam.z - P.reel.z);
    // how far under the moor: nothing at the lip, all of it from 12 m down; and by the horizontal distance
    const deep = clamp((P.lipY - 4 - cam.y) / 12, 0, 1) * clamp((90 - d) / 30, 0, 1);
    const S = P.state, gust = S.gust || 0, drawing = clamp(-S.flow, 0, 1.6) / 1.6;
    const lvl = deep * (1 - 0.75 * drawing + 0.5 * gust);
    const now = ac.currentTime;
    if (lvl > 0.001 && !B.on) start(P);
    if (!B.on) return;
    const Pp = B.parts;
    const w1 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.075, 21.3), w2 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.19, 4.4);
    const surge = 0.45 + 0.55 * w1 * w1;
    Pp.out.gain.setTargetAtTime(0.0001 + 0.42 * lvl * surge, now, 0.6);
    Pp.howlG.gain.setTargetAtTime((1.6 + 2.2 * w1) * (1 - 0.6 * drawing), now, 0.8);
    Pp.howlA.frequency.setTargetAtTime(A3 * (1 + 0.004 * (w2 - 0.5)), now, 1.2);
    Pp.low.frequency.setTargetAtTime(110 + 70 * w2 - 50 * drawing, now, 0.6);
    Pp.rush.frequency.setTargetAtTime(500 + 500 * w1 - 200 * drawing, now, 0.8);
    Pp.rushG.gain.setTargetAtTime(0.08 + 0.14 * w1, now, 0.6);
    if (lvl > 0.001) B.quiet = -1; else if (B.quiet < 0) B.quiet = now;
    if (B.quiet >= 0 && now - B.quiet > 2.5) stop();
  });

  // ---- the sounding's cues
  function pawl(pos) {
    const v = voice(pos, { ref: 2, roll: 1, range: 25, dur: 1.2, verb: 0.3, air: 60, gain: 6 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 3000, 0.6); out.connect(v.in);
    sgrain(v, out, t0, jit(1400), 2.5, 0.09, 0.03, pink, 0.003); // iron on iron
    sgrain(v, out, t0 + 0.005, jit(600), 1.5, 0.06, 0.05, pink, 0.003);
    stone(v, out, 'sine', D5 * 1.5 * jit(1, 0.004), t0 + 0.004, 0.012, 0.012, 0.35); // the pawl's short ring
    stone(v, out, 'sine', D5 * 2.76 * jit(1, 0.004), t0 + 0.004, 0.005, 0.012, 0.2);
  }
  function run(pos, o = {}) {
    const dur = clamp(o.dur || 6.8, 1, 10);
    const v = voice(pos, { ref: 3, roll: 1, range: 40, dur: dur + 0.6, verb: 0.35, air: 70, gain: 7 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 2600, 0.6); out.connect(v.in);
    // the drum's rattle: the line's turns slapping the flange, quickening as the lead falls faster
    let t = t0 + 0.05;
    while (t < t0 + dur) {
      const u = (t - t0) / dur, rate = 6 + 26 * Math.pow(u, 0.7);
      sgrain(v, out, t, jit(520 + 300 * u, 0.08), 1.8, 0.03 * (0.5 + 0.5 * u) * (0.75 + 0.25 * rng()), 0.025, pink, 0.003);
      t += (1 / rate) * (0.85 + 0.3 * rng());
    }
    // the rope's hiss through the sheave, rising
    const g = a.ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.03, t0 + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.05); g.gain.linearRampToValueAtTime(0, t0 + dur + 0.06);
    const bp = filt('bandpass', 900, 0.9);
    bp.frequency.setValueAtTime(600, t0); bp.frequency.linearRampToValueAtTime(1300, t0 + dur);
    chain(a.vNoise(v, pink, t0, dur + 0.1), bp, g, out);
  }
  function taut(pos) {
    const v = voice(pos, { ref: 5, roll: 1, range: 120, dur: 4.2, verb: 0.5, air: 120, gain: 9 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 1800, 0.6); out.connect(v.in);
    // the thump in the sheers' head
    sgrain(v, out, t0, 140, 0.9, 0.12, 0.18, pink, 0.006);
    stone(v, out, 'sine', D2 * 1.5, t0, 0.05, 0.012, 0.35);
    // the line's thrum: a string's partials on D2, slightly stretched, beating as it dies
    const P = [[1, 0.05, 3.0], [2.003, 0.03, 2.4], [3.01, 0.018, 1.8], [4.02, 0.01, 1.2], [1.004, 0.02, 3.0]];
    for (const [r, amp, d] of P) stone(v, out, 'sine', D2 * r, t0 + 0.01, amp, 0.015, d);
    // a timber's creak as the sheers take it
    sgrain(v, out, t0 + 0.12, 380, 6, 0.02, 0.4, pink, 0.08);
  }
  function breath(pos, o = {}) {
    const dur = clamp(o.dur || 12, 4, 16);
    const v = voice(pos, { ref: 8, roll: 0.8, range: 150, dur: dur + 1, verb: 0.55, air: 150, gain: 0.5 }); if (!v) return; // (the brown noise's body is loud: at gain 8 it rendered 3.1 rms against the bell's 0.29)
    const t0 = v.t0, out = filt('lowpass', 3200, 0.6); out.connect(v.in);
    // the air: a swell over a second, held, falling away; brightening as it comes up
    const g = a.ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.11, t0 + 1.2); g.gain.linearRampToValueAtTime(0.08, t0 + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); g.gain.linearRampToValueAtTime(0, t0 + dur + 0.02);
    const bp = filt('bandpass', 300, 0.7); bp.frequency.setValueAtTime(220, t0); bp.frequency.linearRampToValueAtTime(900, t0 + 1.6); bp.frequency.linearRampToValueAtTime(420, t0 + dur);
    chain(a.vNoise(v, pink, t0, dur + 0.1), bp, g, out);
    const gl = a.ac.createGain(); gl.gain.setValueAtTime(0.0001, t0); gl.gain.linearRampToValueAtTime(0.16, t0 + 0.9); gl.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.8); gl.gain.linearRampToValueAtTime(0, t0 + dur * 0.8 + 0.02);
    chain(a.vNoise(v, brown, t0, dur + 0.1), filt('lowpass', 140, 0.7), gl, out);
    // the line singing in it: D4 and A4, each with a twin four cents up (a slow beat), swelling after the air
    for (const [f, amp] of [[D4, 0.016], [D4 * 1.0023, 0.012], [A4, 0.009], [A4 * 1.0023, 0.007]]) {
      const sg = a.ac.createGain(); sg.gain.setValueAtTime(0.0001, t0 + 0.6); sg.gain.linearRampToValueAtTime(amp, t0 + 2.2); sg.gain.linearRampToValueAtTime(amp * 0.7, t0 + dur * 0.6); sg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); sg.gain.linearRampToValueAtTime(0, t0 + dur + 0.02);
      chain(a.vOsc(v, 'sine', f, t0 + 0.55, t0 + dur + 0.05), sg, out);
    }
  }
  function home(pos) {
    const v = voice(pos, { ref: 2, roll: 1, range: 30, dur: 3, verb: 0.5, air: 80, gain: 5 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 4000, 0.6); out.connect(v.in);
    sgrain(v, out, t0, 2600, 3, 0.02, 0.02, pink, 0.003);
    for (const [r, amp, d] of [[1, 0.02, 2.4], [2.76, 0.008, 1.4], [5.4, 0.003, 0.7]]) stone(v, out, 'sine', D5 * r * jit(1, 0.002), t0 + 0.003, amp, 0.012, d);
  }
  function cue(name, pos, opts) {
    if (name === 'act-pit-pawl') pawl(pos);
    else if (name === 'act-pit-run') run(pos, opts);
    else if (name === 'act-pit-taut') taut(pos);
    else if (name === 'act-pit-breath') breath(pos, opts);
    else if (name === 'act-pit-home') home(pos);
    else return false;
    return true;
  }
  return { cue, breath: B };
}
