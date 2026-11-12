// The patches: the music's instruments, built from (ac, dest) so any BaseAudioContext serves (live or offline).
// makeVoices(ac, dest, { quality, plan }) builds a fixed pool of persistent voices (plan: { patch: count }) over one
// tape stage into dest and returns { pool, start(t), stop(t), tail(patch, dur) }. No node is made per note: a voice
// is retuned while its envelope is at zero and its envelope is gated by automation curves. The player decides which
// voice takes which note (player.js), so a voice is never asked to sound two notes at once.
//
// PATCHES[name] = { attack(dur), release(dur), make(ac, out, o) → { note(t, f, dur, vel, end?), start(t), stop(t) } }
//   (end: the time the note must be silent by, when its voice is taken by a later note; cut() below)
//   pad    three saws (two on low) detuned +-7 cents into two lowpasses at 2.5x the fundamental; a swell over seconds
//   organ  one PeriodicWave of sines at 1-3x (a soft flue stop), a lowpass at 900 Hz; a short swell
//   flute  a triangle, breath (pink noise through a bandpass at the pitch), vibrato of 5 cents at 4.6 Hz that enters late
//   choir  saws through two formant bandpasses ('oh': 450 and 800 Hz), slow
//   bell   a struck sine and two quiet partials (2x, 3x; nothing inharmonic, so the partials do not beat), each with its
//          own decay over the note's length
// Every envelope rises over at least 30 ms (a raised cosine) and falls to true zero (an exponential-like curve
// ending at 0), so nothing clicks; a note at least as long as a drone (30 s) swells over seconds.
// The tape over the stem: wow (+-4 cents from a modulated delay, two incommensurate LFOs at 0.31 and 0.53 Hz),
// a lowpass at 3 kHz (two poles of it), faint hiss (pink noise about 50 dB under the music, lowpassed with the rest; it also keeps the
// click meter's linear predictor from reading the corners of a near-noiseless sum of tones as clicks).
// quality 'low': pad and choir with fewer oscillators. Deterministic: noise from mulberry32, no Math.random.
// PATCHES is a plain object so a test fixture can swap one patch for a broken one (tools/music-fixtures/).
import { mulberry32 } from '../../noise.js';
import { makeNoiseBuffer } from '../synth.js';

export const MIN_ATTACK = 0.03;
const CURVE_N = 64;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// the curves, made once: rise 0 → 1 (raised cosine), fall 1 → 0 (exp-like, ending exactly at 0)
const RISE = Float32Array.from({ length: CURVE_N }, (_, i) => 0.5 - 0.5 * Math.cos(Math.PI * i / (CURVE_N - 1)));
const FALL = Float32Array.from({ length: CURVE_N }, (_, i) => { const x = i / (CURVE_N - 1); return (Math.exp(-4 * x) - Math.exp(-4)) / (1 - Math.exp(-4)); });
const scaled = (curve, k) => { const c = new Float32Array(curve.length); for (let i = 0; i < c.length; i++) c[i] = curve[i] * k; return c; };

// a gated envelope on g.gain: 0 → peak over att from t, held, then peak → 0 over rel from t + hold.
// The previous note on this voice ended at zero before t (the player's allocation guarantees it).
export function envelope(g, t, hold, peak, att, rel) {
  att = Math.max(MIN_ATTACK, Math.min(att, hold * 0.8));
  g.gain.setValueCurveAtTime(scaled(RISE, peak), t, att);
  g.gain.setValueCurveAtTime(scaled(FALL, peak), t + Math.max(hold, att + 0.001), rel);
}

// a note that must be silent by `end` (its voice is taken by a later note: player.js steals the voice whose note ends
// soonest when the pool is full): its release shortened to 40 ms or more, its hold to what is left → [hold, rel]
export function cut(t, hold, rel, end = Infinity) {
  if (t + hold + rel <= end) return [hold, rel];
  const r = clamp((end - t) * 0.3, 0.04, rel);
  return [Math.max(MIN_ATTACK + 0.002, end - t - r), r];
}

const osc = (ac, type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
const lp = (ac, f, q = 0.5) => { const b = ac.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q; return b; };
const bp = (ac, f, q) => { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; return b; };
// stop a source at t; a second stop (a track stopped early) moves it on engines that allow it and is ignored elsewhere
export const halt = (x, t) => { try { x.stop(t); } catch { /* stopped already */ } };
const gain = (ac, v) => { const g = ac.createGain(); g.gain.value = v; return g; };

// The balance (v9-M1, set by tools/music-render.mjs on the moor): pad and organ about 8 dB under the flute (each solo
// about -43 LUFS against the flute's -35), so the pad is heard as a pad. PAD_TILT: higher pad notes softer,
// (147 / f) ** tilt.
export const PAD_LP = 2.5, PAD_GAIN = 1.56, PAD_TILT = 1, ORGAN_GAIN = 0.46, CHOIR_GAIN = 5.3, BELL_GAIN = 0.5;
export const PATCHES = {
  pad: {
    attack: (d) => clamp(d * 0.12, 0.4, 4), release: (d) => clamp(d * 0.08, 0.6, 3),
    make(ac, out, o) {
      const det = o.quality === 'low' ? [-7, 7] : [-7, 0, 7];
      const env = gain(ac, 0), f1 = lp(ac, 400, 0.4), f2 = lp(ac, 400, 0.4), mix = gain(ac, 0.29 / Math.sqrt(det.length));
      const oscs = det.map((c) => { const x = osc(ac, 'sawtooth', 147); x.detune.value = c; x.connect(mix); return x; });
      mix.connect(f1).connect(f2).connect(env).connect(out);
      return {
        note(t, f, dur, vel, end) {
          for (const x of oscs) x.frequency.setValueAtTime(f, t);
          for (const b of [f1, f2]) b.frequency.setValueAtTime(f * PAD_LP, t);
          const [h, r] = cut(t, dur, PATCHES.pad.release(dur), end);
          envelope(env, t, h, vel * PAD_GAIN * (147 / f) ** PAD_TILT, PATCHES.pad.attack(dur), r);
        },
        start(t) { for (const x of oscs) x.start(t); }, stop(t) { for (const x of oscs) halt(x, t); },
      };
    },
  },
  organ: {
    attack: () => 0.08, release: () => 0.35,
    make(ac, out) {
      const wave = ac.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.3, 0.06, 0]));
      const x = osc(ac, 'sine', 147); x.setPeriodicWave(wave);
      const env = gain(ac, 0), f = lp(ac, 900, 0.4);
      x.connect(f).connect(env).connect(out);
      return {
        note(t, fr, dur, vel, end) { x.frequency.setValueAtTime(fr, t); const [h, r] = cut(t, dur, 0.35, end); envelope(env, t, h, vel * ORGAN_GAIN, 0.08, r); },
        start(t) { x.start(t); }, stop(t) { halt(x, t); },
      };
    },
  },
  flute: {
    attack: () => 0.07, release: () => 0.3,
    make(ac, out, o) {
      const x = osc(ac, 'triangle', 294), env = gain(ac, 0), f = lp(ac, 1200, 0.5);
      const vib = osc(ac, 'sine', 4.6), vibDepth = gain(ac, 0);
      vib.connect(vibDepth).connect(x.detune);
      const breath = ac.createBufferSource(); breath.buffer = o.noise; breath.loop = true;
      const bf = bp(ac, 294, 6), bg = gain(ac, 0.18);
      breath.connect(bf).connect(bg).connect(env);
      x.connect(f).connect(env).connect(out);
      return {
        note(t, fr, dur, vel, end) {
          x.frequency.setValueAtTime(fr, t); bf.frequency.setValueAtTime(fr, t); f.frequency.setValueAtTime(fr * 4, t);
          const [h, r] = cut(t, dur, 0.3, end);
          // vibrato enters after 0.4 s on a long note and is gone before the next
          if (h > 0.8) { vibDepth.gain.setValueCurveAtTime(scaled(RISE, 5), t + 0.4, Math.min(0.8, h - 0.41)); vibDepth.gain.setValueCurveAtTime(scaled(FALL, 5), t + h, r); }
          envelope(env, t, h, vel * 0.5, 0.07, r);
        },
        start(t) { x.start(t); vib.start(t); breath.start(t, (o.index * 1.37) % 3); }, stop(t) { halt(x, t); halt(vib, t); halt(breath, t); },
      };
    },
  },
  choir: {
    attack: (d) => clamp(d * 0.2, 0.25, 2), release: (d) => clamp(d * 0.15, 0.6, 2),
    make(ac, out, o) {
      const det = o.quality === 'low' ? [0] : [-5, 5];
      const env = gain(ac, 0), mix = gain(ac, 0.29 / Math.sqrt(det.length)), pre = lp(ac, 1400, 0.4);
      const fa = bp(ac, 450, 5), fb = bp(ac, 800, 6), ga = gain(ac, 1), gb = gain(ac, 0.5);
      const oscs = det.map((c) => { const x = osc(ac, 'sawtooth', 220); x.detune.value = c; x.connect(mix); return x; });
      mix.connect(pre); pre.connect(fa).connect(ga).connect(env); pre.connect(fb).connect(gb).connect(env); env.connect(out);
      return {
        note(t, fr, dur, vel, end) {
          for (const x of oscs) x.frequency.setValueAtTime(fr, t);
          const [h, r] = cut(t, dur, PATCHES.choir.release(dur), end);
          envelope(env, t, h, vel * CHOIR_GAIN, PATCHES.choir.attack(dur), r);
        },
        start(t) { for (const x of oscs) x.start(t); }, stop(t) { for (const x of oscs) halt(x, t); },
      };
    },
  },
  bell: {
    // struck: the note's length is its ring; the release is the last of it
    attack: () => MIN_ATTACK, release: () => 0.4,
    make(ac, out) {
      const parts = [[1, 1, 1], [2, 0.22, 0.45], [3, 0.06, 0.2]].map(([m, a, d]) => {
        const x = osc(ac, 'sine', 440 * m), g = gain(ac, 0); x.connect(g).connect(out); return { x, g, m, a, d };
      });
      return {
        note(t, fr, dur, vel, end = Infinity) {
          for (const p of parts) {
            // partials above 2 kHz (the ear's sharpest band) are left out
            const f = fr * p.m, a = f < 2000 ? p.a : 0;
            p.x.frequency.setValueAtTime(f, t);
            if (a > 0) envelope(p.g, t, MIN_ATTACK + 0.001, vel * BELL_GAIN * a, MIN_ATTACK, Math.max(0.04, Math.min((dur + 0.4) * p.d, end - t - MIN_ATTACK - 0.002)));
          }
        },
        start(t) { for (const p of parts) p.x.start(t); }, stop(t) { for (const p of parts) halt(p.x, t); },
      };
    },
  },
};

// seconds a note of this patch sounds after its dur ends (the player frees the voice after it)
export const tail = (patch, dur) => (patch === 'bell' ? 0.4 : PATCHES[patch].release(dur));

// the tape: in → wow (a modulated delay) → two lowpass poles at 3 kHz → dest, with hiss mixed in before the lowpass
// the stem's level: a track at the player's gain 1 measures about -35 LUFS (tools/music-render.mjs)
export const STEM_LEVEL = 0.1;

function makeTape(ac, dest, noise) {
  const input = gain(ac, STEM_LEVEL), wow = ac.createDelay(0.05);
  wow.delayTime.value = 0.012;
  // a sine LFO of amplitude A s on the delay bends pitch by up to 2 pi f A: +-4 cents (0.00231) shared over two LFOs
  const lfos = [0.31, 0.53].map((f) => { const l = osc(ac, 'sine', f), d = gain(ac, 0.00231 / 2 / (2 * Math.PI * f)); l.connect(d).connect(wow.delayTime); return l; });
  const l1 = lp(ac, 3000, 0.6), l2 = lp(ac, 3000, 0.6);
  const hiss = ac.createBufferSource(); hiss.buffer = noise; hiss.loop = true;
  const hg = gain(ac, 0.01 * STEM_LEVEL), hh = ac.createBiquadFilter(); hh.type = 'highpass'; hh.frequency.value = 400;
  input.connect(wow).connect(l1).connect(l2).connect(dest);
  hiss.connect(hh).connect(hg).connect(l1);
  const level = hg.gain.value;
  return {
    input,
    start(t) { for (const l of lfos) l.start(t); hiss.start(t); hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(level, t + 0.3); },
    // the hiss fades over the last 0.3 s, so the stem does not end on a step in its noise floor
    stop(t) { hg.gain.setValueAtTime(level, t - 0.32); hg.gain.linearRampToValueAtTime(0, t - 0.02); for (const l of lfos) halt(l, t); halt(hiss, t); },
  };
}

export function makeVoices(ac, dest, { quality = 'high', plan = {} } = {}) {
  const noise = makeNoiseBuffer(ac, 4, 'pink', mulberry32(9091));
  const tape = makeTape(ac, dest, noise);
  const pool = {}, all = [];
  let index = 0;
  for (const [patch, n] of Object.entries(plan)) {
    const def = PATCHES[patch];
    if (!def) throw new Error(`music: no patch '${patch}'`);
    pool[patch] = [];
    for (let i = 0; i < n; i++) {
      const pan = ac.createStereoPanner(); pan.pan.value = 0; pan.connect(tape.input);
      const v = def.make(ac, pan, { quality, noise, index: index++ });
      v.pan = pan;
      pool[patch].push(v); all.push(v);
    }
  }
  return {
    pool, tail,
    // a voice's place in the stereo field, set at a note's start (its envelope is at zero then)
    place(v, t, p) { v.pan.pan.setValueAtTime(clamp(p, -1, 1), t); },
    start(t) { tape.start(t); for (const v of all) v.start(t); },
    stop(t) { tape.stop(t); for (const v of all) v.stop(t); },
  };
}
