// Named one-shots (v7.2-01 split out of src/audio.js; v7.2-04 voices it next): the cue(name, pos, opts) dispatcher
// (the table is in src/audio.js's header), the older one-shots on bare panners (cry, crows, flush, plop, rumble,
// farcry, skycreak, the lids, the slinker's rattle, the traveller's greeting, the tarn's hum and slosh), the Cardinal
// Stones' bells (struck by the `strike` cue and as the walker comes near) and the fall's positional loop. The v2 and
// v5 one-shots are in cues-v2.js; v7's living in living.js; the regions' own cues in regions.js; all are reached
// from here. startCues(a) returns { cue, fallTick, update(f) } and sets a.fall (= audio.fall); cue reads a.living
// and a.regionSnd when it is called, so it is handed to ctx.audio.cue once they have started.
import { hyp } from '../noise.js';
import { startCuesV2, softKit } from './cues-v2.js';

export function startCues(a) {
  // the stones ring on the Ambience slider's bus (place sounds); the fall's rumble is a cue, its send the Effects one
  const { ac, rng, ctx, audio, camera, terrain, landmarks, ambBus: master, cueBus, fxVerb: verbIn, send, panner, setPos, loopSrc, burst,
    brown, pink, white, env, filt, gainOf, chain, oneShotPanner, later, near, nTick, clamp, voice, vOsc, vNoise } = a;
  const { shape, sgrain, stone, jit } = softKit(a);

  // ================================================================ Cardinal Stones: a low bell on each, struck as you come near
  const S = landmarks.stones, H = 7;
  const stones = [
    { name: 'pride', f: 73.42, x: S.x + H, z: S.z - H }, { name: 'sloth', f: 87.31, x: S.x + H, z: S.z + H },
    { name: 'avarice', f: 110.0, x: S.x - H, z: S.z + H }, { name: 'spite', f: 130.81, x: S.x - H, z: S.z - H },
  ];
  for (const s of stones) { s.armed = true; s.cool = 0; s.pan = panner('HRTF', 8, 0.8); setPos(s.pan, s.x, terrain.heightAt(s.x, s.z) + 1.6, s.z); s.pan.connect(master); send(s.pan, 0.55); }
  const bellPartials = [[1, 1, 9], [2.0, 0.55, 7], [2.41, 0.4, 6], [3.0, 0.3, 5], [4.2, 0.18, 3.5], [5.43, 0.1, 2.5]];
  function strike(s, soft = 1) {
    const t0 = ac.currentTime + a.lead;
    for (const [r, a, d] of bellPartials) {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = s.f * r * (1 + (rng() - 0.5) * 0.002);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5 * a * soft, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(s.pan); o.start(t0); o.stop(t0 + d + 0.1);
    }
  }

  // ================================================================ calls (one-shots)
  // the generic far cry (v7.2-04): a formant call, not a bare saw. A darkened buzz through two bandpasses and a
  // breath, rising a fifth and falling a fourth in D minor pentatonic (D5/F5/G5 up to A5/C6/D6, down to A4/C5/D5),
  // a slow vibrato (5-7 Hz, never in the rough band). A punctuation cue (v7.2-07): about -5 dBFS on the cue bus within
  // 40 m, falling slowly past it (rolloff 0.6) under the air's lowpass (120 m), about -14 dBFS at 110 m.
  const CRY_ROOT = [587.33, 698.46, 783.99];
  function cry(pos) {
    const v = voice(pos, { ref: 40, roll: 0.6, range: 400, verb: 0.9, dur: 3.2, air: 120, gain: 30 });
    if (!v) return;
    v.in.gain.value *= Math.pow(10, -0.15 * Math.max(0, v.d - 120) / 20); // v7.2-07: past 120 m a further 0.15 dB a metre: a far bird is a breath
    const t0 = v.t0, n = 1 + ((rng() * 2) | 0), f0 = CRY_ROOT[(rng() * 3) | 0] * jit(1, 0.01);
    const out = filt('lowpass', 2400, 0.6); out.connect(v.in);
    let at = t0;
    for (let k = 0; k < n; k++) {
      const dur = 0.6 + rng() * 0.7;
      const o = vOsc(v, 'sawtooth', f0, at, at + dur + 0.1);
      o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f0 * 1.5, at + dur * 0.35); o.frequency.exponentialRampToValueAtTime(f0 * 0.75, at + dur);
      chain(vOsc(v, 'sine', 5 + rng() * 2, at, at + dur + 0.1), gainOf(18), o.detune);
      const g = ac.createGain(); env(g, at, 0.06, 0.15, dur);
      const pre = filt('lowpass', f0 * 3, 0.7);
      chain(o, pre); chain(pre, filt('bandpass', 1100, 3), g); chain(pre, filt('bandpass', 1700, 4), gainOf(0.4), g); g.connect(out);
      const ng = ac.createGain(); env(ng, at, 0.02, 0.15, dur); chain(vNoise(v, pink, at, dur), filt('bandpass', 1400, 1.0), ng, out);
      at += dur * 0.7 + 0.1 + rng() * 0.2;
    }
  }
  // crows: a few hoarse caws and the wing-clatter as they leave (v7.2-04): a darkened buzz through a nasal formant
  // pair, a breath of pink noise for the hoarseness; 6 dB under their old level, through a voice with the air
  function crows(pos) {
    const pp = pos || { x: 65, y: 34, z: 30 };
    const v = voice(pp, { ref: 12, roll: 1, range: 400, verb: 0.5, dur: 4.5, air: 140, gain: 10 }); // v7.2.1: 8 dB down (was 25)
    if (!v) return;
    const out = filt('lowpass', 2400, 0.6); out.connect(v.in);
    let at = v.t0;
    const n = 5 + ((rng() * 4) | 0);
    for (let k = 0; k < n; k++) {
      const f0 = 380 + rng() * 220, dur = 0.16 + rng() * 0.12;
      const o = vOsc(v, 'sawtooth', f0 * 1.25, at, at + dur + 0.05); o.frequency.setValueAtTime(f0 * 1.25, at); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, at + dur);
      const g = ac.createGain(); env(g, at, 0.065, 0.015, Math.max(0.05, dur));
      chain(o, filt('lowpass', f0 * 3.5, 0.7), filt('bandpass', 900 + rng() * 300, 2), g, out);
      const ng = ac.createGain(); env(ng, at, 0.02, 0.01, Math.max(0.05, dur)); chain(vNoise(v, pink, at, dur), filt('bandpass', 1300, 1), ng, out);
      at += 0.12 + rng() * 0.3;
    }
    // wing-clatter as they leave
    const wg = ac.createGain(); env(wg, v.t0, 0.05, 0.2, 1.1); chain(vNoise(v, pink, v.t0, 1.4), filt('bandpass', 500, 0.8), wg, out);
  }
  // a fish rising: a small thing, heard at the water's edge and gone by 30 m (inverse from 3 m, the air's lowpass)
  function plop(pos) {
    const v = voice(pos, { ref: 3, roll: 1.3, range: 30, verb: 0.35, dur: 0.4, air: 40 }); if (!v) return;
    const t0 = v.t0;
    const o = vOsc(v, 'sine', 820, t0, t0 + 0.25); o.frequency.setValueAtTime(820, t0); o.frequency.exponentialRampToValueAtTime(190, t0 + 0.11);
    const g = ac.createGain(); shape(g, t0, 0.13, 0.004, 0.13); chain(o, g, v.in);
    sgrain(v, v.in, t0, 1900, 1, 0.04, 0.06, pink, 0.003);
  }
  // ---- sky and uncanny cues: all quiet, all placed where they happen
  // a fireball's report, arriving late: a long low roll that grumbles away
  function rumble(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos || { x: camera.position.x + 200, y: 80, z: camera.position.z }, 120, 1); send(p, 0.7);
    const s = burst(brown, 6), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, t0); lp.frequency.exponentialRampToValueAtTime(70, t0 + 5.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.35);
    for (let k = 1; k < 7; k++) g.gain.linearRampToValueAtTime(0.5 * (1 - k / 7) * (0.55 + 0.45 * rng()), t0 + 0.35 + k * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 6);
    s.connect(lp); lp.connect(g); g.connect(p); later(p, 9);
  }
  // the four-winged flier, very far: one long falling call, half of it reverb (C5 up to D5, down to C4)
  function farcry(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos || { x: camera.position.x - 200, y: 120, z: camera.position.z - 200 }, 90, 1); send(p, 1.3);
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(523.25, t0); o.frequency.linearRampToValueAtTime(587.33, t0 + 0.5); o.frequency.exponentialRampToValueAtTime(261.63, t0 + 2.4);
    const v = ac.createOscillator(); v.frequency.value = 6.5; const vg = ac.createGain(); vg.gain.value = 9; v.connect(vg); vg.connect(o.frequency);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.9;
    const g = ac.createGain(); env(g, t0, 0.07, 0.35, 2.1);
    o.connect(bp); bp.connect(g); g.connect(p); o.start(t0); v.start(t0); o.stop(t0 + 2.6); v.stop(t0 + 2.6); later(p, 7);
  }
  // the iron worm flexing in the sky: an iron groan, slow-beating partials and a grinding edge (v7.2-04: each saw
  // darkened under a lowpass at five times its pitch before its bandpass, Q 3 not 6; the grind's ticks soft)
  function skycreak(pos) {
    const v = voice(pos || { x: camera.position.x, y: 200, z: camera.position.z - 250 }, { ref: 90, roll: 1, range: 900, verb: 1.0, dur: 4.2, air: 200 });
    if (!v) return;
    const t0 = v.t0, dur = 2.2 + rng() * 1.2, f0 = 48 + rng() * 20, out = filt('lowpass', 1800, 0.6); out.connect(v.in);
    for (const [r, amp] of [[1, 1], [2.03, 0.5], [3.11, 0.3]]) {
      const o = vOsc(v, 'sawtooth', f0 * r, t0, t0 + dur + 0.6);
      o.frequency.setValueAtTime(f0 * r, t0); o.frequency.linearRampToValueAtTime(f0 * r * 1.12, t0 + dur * 0.6); o.frequency.linearRampToValueAtTime(f0 * r * 0.94, t0 + dur);
      const g = ac.createGain(); env(g, t0, 0.09 * amp, 0.4, dur);
      chain(o, filt('lowpass', f0 * r * 5, 0.7), filt('bandpass', 340 * r, 3), g, out);
    }
    // stick-slip grinding: soft ticks clustered in bursts
    for (let at = t0 + 0.2; at < t0 + dur;) { sgrain(v, out, at, 700 + rng() * 500, 3, 0.05, 0.04, white, 0.003); at += 0.02 + rng() * rng() * 0.25; }
  }
  // a cloak of eyes closing all at once: many wet lid-closings in a crowded rush; opening is slower and stickier
  // (v7.2-04). Each lid is a soft dark tick (pink noise at 0.6-1.6 kHz, 3 ms in, 40 ms out) and every third a tiny
  // falling wet pop (a sine, 10 ms in); under them one breath of lowpassed noise, so the rush is one gesture, not a
  // train of clicks. A voice: inverse from 4 m, the air's lowpass, heard to 70 m from the cloak.
  function lids(pos, opening) {
    const v = voice(near(pos), { ref: 4, roll: 1, range: 70, verb: 0.25, dur: (opening ? 0.9 : 0.32) + 0.5, air: 60, gain: 22 });
    if (!v) return;
    const n = opening ? 40 : 52, span = opening ? 0.9 : 0.32, t0 = v.t0;
    const out = filt('lowpass', 2200, 0.6); out.connect(v.in);
    const bg = ac.createGain(); bg.gain.setValueAtTime(0.0001, t0); bg.gain.linearRampToValueAtTime(0.03, t0 + span * 0.4); bg.gain.exponentialRampToValueAtTime(0.0001, t0 + span + 0.15);
    chain(vNoise(v, pink, t0, span + 0.2), filt('bandpass', 700, 0.8), bg, out);
    for (let k = 0; k < n; k++) {
      const at = t0 + Math.pow(rng(), opening ? 1.0 : 1.6) * span;
      sgrain(v, out, at, 600 + rng() * 1000, 2 + rng() * 1.5, 0.04 + rng() * 0.035, 0.04, pink, 0.003);
      if (k % 3) continue;
      // the wet part: a tiny falling pop under the tick
      const f = 380 + rng() * 360, o = stone(v, out, 'sine', opening ? f * 0.75 : f, at, 0.012, 0.01, 0.04);
      o.frequency.setValueAtTime(opening ? f * 0.75 : f, at); o.frequency.exponentialRampToValueAtTime(opening ? f : f * 0.6, at + 0.04);
    }
  }
  // the slinker noticed: a dry rattle of many fingertips on stone, close and unreverberant (v7.2-04: the taps at
  // 0.9-1.8 kHz, 3 ms in, under a lowpass at 2.2 kHz; heard to 30 m)
  function rattle(pos, leaving) {
    const span = leaving ? 1.4 : 0.6;
    const v = voice(near(pos), { ref: 4, roll: 1, range: 30, verb: leaving ? 0.12 : 0.05, dur: span + 0.2, air: 60 });
    if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 2200, 0.6); out.connect(v.in);
    let at = t0;
    while (at < t0 + span) {
      const fade = leaving ? 1 - (at - t0) / span : 1 - 0.4 * (at - t0) / span;
      sgrain(v, out, at, 900 + rng() * 900, 3 + rng() * 2, 0.11 * fade + 0.01, 0.04, white, 0.003);
      at += (leaving ? 0.025 + (at - t0) * 0.08 : 0.008) + rng() * 0.022;
    }
  }
  // the traveller lifts his hand: a small cracked bell on the wagon (A5 and its partials), and a warm two-note hum,
  // D3 then G3, through closed lips (v7.2-04: a darkened buzz through an "mm" formant pair, not a bare saw)
  function greet(pos) {
    const v = voice(near(pos, 6), { ref: 6, roll: 1.1, range: 60, verb: 0.4, dur: 2.0, air: 80 }); if (!v) return;
    const t0 = v.t0;
    [[880, 0.025, 1.6], [1318.5, 0.015, 1.2], [2213, 0.006, 0.7]].forEach(([f, amp, d], i) => {
      stone(v, v.in, 'sine', f * (1 + (rng() - 0.5) * 0.004), t0 + i * 0.004, amp, 0.004, d);
    });
    [[146.83, 0.35], [196, 0.75]].forEach(([f, at]) => {
      const o = vOsc(v, 'sawtooth', f * 0.97, t0 + at, t0 + at + 0.6); o.frequency.setValueAtTime(f * 0.97, t0 + at); o.frequency.linearRampToValueAtTime(f, t0 + at + 0.12);
      const g = ac.createGain(); env(g, t0 + at, 0.03, 0.06, 0.45);
      const pre = filt('lowpass', f * 3, 0.7);
      chain(o, pre); chain(pre, filt('bandpass', 280, 3), g); chain(pre, filt('bandpass', 900, 4), gainOf(0.3), g); g.connect(v.in);
    });
  }
  // the woman in the tarn: a wordless low hum through closed lips, drifting between two notes of the key (G3 to A3
  // and back, or F3 to G3 and back; v7.2-04: the buzz darkened before its "mm" formants, Q 5 and 4)
  function tarnHum(pos) {
    const v = voice(pos || { x: -90, y: -3, z: 72 }, { ref: 10, roll: 1.1, range: 140, verb: 0.8, dur: 7, air: 120 }); if (!v) return;
    const t0 = v.t0, dur = 4.5 + rng() * 2, lowSide = rng() < 0.5, f0 = lowSide ? 174.61 : 196, f1 = lowSide ? 196 : 220;
    const o = vOsc(v, 'sawtooth', f0, t0, t0 + dur + 0.1);
    o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f1, t0 + dur * 0.4); o.frequency.linearRampToValueAtTime(f0, t0 + dur);
    chain(vOsc(v, 'sine', 4.8, t0, t0 + dur + 0.1), gainOf(1.6), o.frequency);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 1.0); g.gain.linearRampToValueAtTime(0.035, t0 + dur - 1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const lp = filt('lowpass', 700), pre = filt('lowpass', 650, 0.7); o.connect(pre);
    for (const [f, q, amp] of [[260, 5, 1], [1100, 4, 0.2]]) chain(pre, filt('bandpass', f, q), gainOf(amp), lp); // nasal "mm" formants
    chain(lp, g, v.in);
  }
  // she has moved: one soft slosh of water round a body, and a few drips
  function slosh(pos) {
    const v = voice(pos || { x: -90, y: -4.6, z: 80 }, { ref: 6, roll: 1.2, range: 60, verb: 0.4, dur: 1.2, air: 80 }); if (!v) return;
    const t0 = v.t0, bp = filt('bandpass', 900, 1.2);
    bp.frequency.setValueAtTime(900, t0); bp.frequency.exponentialRampToValueAtTime(260, t0 + 0.6);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.11, t0 + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
    chain(vNoise(v, pink, t0, 0.8), bp, g, v.in);
    for (let k = 0; k < 4; k++) sgrain(v, v.in, t0 + 0.25 + rng() * 0.4, 1500 + rng() * 1000, 4, 0.012, 0.04, pink); // drips
  }
  // a bird flushed from the heather (v7.2-04): wingbeats as soft pink grains slowing as it climbs (irregular, so no
  // buzz), the rush under a lowpass, and three short alarm chips, falling, 10 ms in
  function flush(pos) {
    // v7.2.1 (the owner: "like shotgun blasts"): 12 dB down (gain 65 -> 16), the rush eased in over 90 ms instead of 20, darker
    const v = voice(pos, { ref: 6, roll: 1.1, range: 80, verb: 0.2, dur: 0.9, air: 80, gain: 16 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 1500, 0.6); out.connect(v.in);
    const g = ac.createGain(); env(g, t0, 0.06, 0.09, 0.5); chain(vNoise(v, pink, t0, 0.6), filt('bandpass', 1000, 0.8), g, out);
    for (let at = t0, k = 0; at < t0 + 0.6; k++) { sgrain(v, out, at, jit(1000, 0.1), 1.2, 0.08 * (1 - (at - t0) / 0.7), 0.04, pink, 0.004); at += 0.045 * (1 + k * 0.06) * jit(1, 0.25); }
    for (let k = 0; k < 3; k++) {
      const tt = t0 + 0.1 + k * 0.12 + rng() * 0.06, o = stone(v, out, 'triangle', 1600, tt, 0.01, 0.01, 0.05);
      o.frequency.setValueAtTime(1600, tt); o.frequency.exponentialRampToValueAtTime(1200, tt + 0.06);
    }
  }

  // ---- the fall: a positional loop, not a one-shot. Built on entering the rumble zone (or whenever
  // ctx.river.rumble is above zero), its gain follows that rumble at 10 Hz; on leaving it fades over 2 s and
  // is torn down. Low brown rumble, a mid roar, a hiss of spray, a slow wander in all three.
  const fall = audio.fall = { running: false, gain: null, pos: null, left: false, quietSince: -1, parts: null, leaveTimer: null };
  function fallLevel() {
    const R = ctx.river;
    if (R && typeof R.rumble === 'number') { if (R.rumble > 0) fall.left = false; return R.rumble; }
    const F = fall.pos || R?.fall;
    if (!F || fall.left) return 0;
    const cp = camera.position;
    return clamp(1 - Math.hypot(cp.x - F.x, cp.y - (F.y ?? cp.y), cp.z - F.z) / (F.rumbleRadius || 70), 0, 1);
  }
  function fallStart() {
    const F = fall.pos || ctx.river?.fall;
    if (fall.running || !F) return;
    const out = ac.createGain(); out.gain.value = 0.0001;
    const p = panner('equalpower', 14, 0.5, 500); setPos(p, F.x, F.y ?? terrain.heightAt(F.x, F.z), F.z);
    const low = filt('lowpass', 150, 0.7), mid = filt('bandpass', 420, 0.8), hiss = filt('bandpass', 2600, 0.5);
    const lowG = gainOf(1), midG = gainOf(0.35), hissG = gainOf(0.1);
    const srcs = [loopSrc(brown, rng()), loopSrc(brown, rng()), loopSrc(pink, rng())];
    chain(srcs[0], low, lowG, out); chain(srcs[1], mid, midG, out); chain(srcs[2], filt('highpass', 1200), hiss, hissG, out);
    chain(out, p, cueBus);
    const vs = gainOf(0.22); p.connect(vs); vs.connect(verbIn);
    fall.parts = { srcs, p, out, low, lowG, midG, hissG, vs };
    fall.gain = out; fall.running = true; fall.quietSince = -1;
  }
  function fallStop() {
    const P = fall.parts; if (!P) return;
    const now = ac.currentTime;
    for (const s of P.srcs) { try { s.stop(now + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { P.p.disconnect(); P.out.disconnect(); P.vs.disconnect(); } catch (e) { /* gone */ } }, 200);
    fall.parts = null; fall.gain = null; fall.running = false;
  }
  function fallTick(step, t, now) {
    const lvl = fallLevel();
    if (lvl > 0.001 && !fall.running) fallStart();
    if (!fall.running) return;
    const P = fall.parts;
    const w1 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.23, 7.1), w2 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.61, 3.3);
    P.out.gain.setTargetAtTime(0.0001 + 0.5 * Math.pow(lvl, 1.3) * (0.75 + 0.25 * w1), now, fall.left ? 0.5 : 0.3);
    P.low.frequency.setTargetAtTime(120 + 60 * w2, now, 0.4);
    P.midG.gain.setTargetAtTime(0.25 + 0.2 * w2, now, 0.4);
    P.hissG.gain.setTargetAtTime(0.06 + 0.08 * w1 * lvl, now, 0.4);
    // timed on the audio clock: game time can run slow when frames are clamped
    if (lvl > 0.001) fall.quietSince = -1; else if (fall.quietSince < 0) fall.quietSince = now;
    if (fall.quietSince >= 0 && now - fall.quietSince > 2.2) fallStop();
  }
  function fallCue(pos, entering) {
    if (pos && typeof pos.x === 'number') fall.pos = pos;
    fall.left = !entering;
    if (fall.leaveTimer) { clearTimeout(fall.leaveTimer); fall.leaveTimer = null; }
    if (entering) { fall.quietSince = -1; fallStart(); return; }
    // leaving: fallLevel() reads zero from here. The fade starts now on the audio clock and a timer
    // stops the loop at 2.2 s, so neither waits for a frame (frames can be seconds apart under load).
    if (!fall.running || !fall.parts) return;
    const now = ac.currentTime;
    fall.parts.out.gain.setTargetAtTime(0.0001, now, 0.5);
    if (fall.quietSince < 0) fall.quietSince = now;
    fall.leaveTimer = setTimeout(() => { fall.leaveTimer = null; if (fall.running && fall.left && fallLevel() <= 0.001) fallStop(); }, 2200);
  }

  const c2 = startCuesV2(a);
  function cue(name, position, opts) {
    if (ac.state === 'closed') return;
    if (ctx.hush?.cue(name, position || camera.position)) return; // v5: AR the Occultation hushes the birds under its band
    try {
      if (name === 'cry') cry(position || { x: camera.position.x + 120, y: 80, z: camera.position.z - 100 });
      else if (name === 'crows') crows(position);
      else if (name === 'flush') flush(position || camera.position);
      else if (name === 'plop') plop(position || { x: -90, y: -4.6, z: 110 });
      else if (name === 'strike') strike(stones[(position | 0) % 4]);
      else if (name === 'rumble') rumble(position);
      else if (name === 'farcry') farcry(position);
      else if (name === 'skycreak') skycreak(position);
      else if (name === 'eyes-close') lids(position, false);
      else if (name === 'eyes-open') lids(position, true);
      else if (name === 'slinker-seen') rattle(position, false);
      else if (name === 'slinker-gone') rattle(position, true);
      else if (name === 'traveller-greet') greet(position);
      else if (name === 'tarn-hum') tarnHum(position);
      else if (name === 'tarn-step') slosh(position);
      else if (name === 'carillon') c2.carillon(position, opts);
      else if (name === 'glyph-shift') c2.glyphShift(position);
      else if (name === 'sward-close') c2.rustle(position, { dur: 1.5, peakAt: 0.4, n: 90, band: 1400, gain: 0.09 });
      else if (name === 'sward-open') c2.rustle(position, { dur: 4, peakAt: 0.5, n: 70, band: 1100, gain: 0.045 });
      else if (name === 'sward-whimper') c2.whimper(position);
      else if (name === 'pedlar-pass') c2.pedlarPass(position);
      else if (name === 'wrong-colour-near') c2.wrongColour(position);
      else if (name === 'fall-rumble-enter') fallCue(position, true);
      else if (name === 'fall-rumble-leave') fallCue(position, false);
      else if (name === 'procession') c2.procession(position);
      else if (name === 'guest-heartbeat') c2.heartbeat(opts);
      else if (name === 'galley-drum') c2.galleyDrum(position, opts);
      else if (name === 'lizard-skitter') c2.skitter(position);
      else if (name === 'rooks-lift') c2.rooksLift(position, opts);
      else if (name === 'bats-out') c2.batsOut(position, opts);
      else if (name === 'wader-gone') c2.waderGone(position);
      else if (name === 'biomesh-settle') c2.biomeshSettle(position);
      else if (name === 'hawser-groan') c2.hawserGroan(position);
      else if (name === 'lamp-tick') c2.lampTick(position);
      else if (name === 'kept-fire') c2.keptFire(position, opts);
      else if (name === 'taker-click') a.living.takerClick(position);
      else if (name === 'taker-murmur') a.living.takerMurmur(position);
      else if (name === 'coheirs-knot') a.living.coheirsKnot(position);
      else if (name === 'coheirs-hum') a.living.hum(position, opts);
      else if (name === 'sexton-bite') a.living.sextonBite(position);
      else if (name === 'sexton-throw') a.living.sextonThrow(position);
      else if (name === 'sleeper-breath') a.living.sleeperBreath(position);
      else if (name === 'sleeper-fruit') a.living.sleeperFruit(position);
      else if (name === 'stylite-creak') a.living.styliteCreak(position);
      else if (name === 'accrescent-step') a.living.accrescentStep(position);
      else if (name === 'moles-click') a.living.molesClick(position);
      else if (name === 'thurifer-chain') a.living.thuriferChain(position);
      else if (name === 'thurifer-hiss') a.living.hiss(position, opts);
      else if (name === 'leerie-step') a.living.leerieStep(position);
      else if (name === 'leerie-click') a.living.leerieClick(position);
      else if (name === 'linkboy-step') a.living.linkboyStep(position);
      else if (name === 'bather-pour') a.living.batherPour(position);
      else if (name.startsWith('house-')) a.house?.cue(name, position, opts); // v8-05
      else if (name.startsWith('twk-')) a.twk?.cue(name, position, opts); // v8-07
      else if (name.startsWith('act-')) a.acts?.cue(name, position, opts); // v10: the acts (src/v10/sound.js)
      else a.regionSnd?.cue(name, position, opts);
    } catch (e) { if (audio.debug) throw e; }
  }
  // --- stones, struck as you come near
  function update(f) {
    const { step, px, pz } = f;
    for (const s of stones) {
      const d = hyp(px - s.x, pz - s.z);
      s.cool -= step;
      if (s.armed && d < 20 && s.cool <= 0) { strike(s, 0.5 + 0.5 * (1 - d / 20)); s.armed = false; s.cool = 20; }
      if (!s.armed && d > 28) s.armed = true;
    }
  }
  return { cue, fallTick, update };
}
