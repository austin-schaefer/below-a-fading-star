// Footsteps (v7.2-01 split out of src/audio.js; v7.2-04 voices it next): the walker's step by the ground under him
// (grass, click on stone, splash, squelch, crunch on ice; a v4 region's own step where it is the ground), the step
// record and its replay (audio.steps, audio.echoStep: the Repetend's echo) and the figures' footsteps (figureStep).
// startSteps(a) hooks player.onStep and sets a.tap (the recording stream wrapper the regions' kit uses),
// a.stepSynth and a.figureStep. A region's step is reached through a.regionSnd, set once the regions start.
import { hyp } from '../noise.js';

export function startSteps(a) {
  const { ac, rng, ctx, audio, player, terrain, landmarks, dryBus, white, pink, env, send, voice } = a;
  // Each of the walker's steps is recorded as it plays, { seq, t (its audio time), hurrying, kind, regionKind, x, z, vol,
  // pitch, verb, d (its random draws) }, in a ring of 16 (audio.steps), so audio.echoStep(rec, pos) can play the same
  // synthesis again through a panner at pos: the Repetend's echo (v7, src/v7/small/repetend.js). The walker's own step
  // draws from rng in the same order as before, so it sounds as it did.
  const stepRing = [];
  for (let i = 0; i < 16; i++) stepRing.push({ seq: -1, t: 0, hurrying: false, kind: 'grass', regionKind: null, x: 0, z: 0, vol: 1, pitch: 1, verb: false, d: new Float64Array(64) });
  audio.steps = { ring: stepRing, seq: 0 };
  // tap(src): a random stream that, while a step is being made (capturing), writes each draw into the step's record, and
  // while it is replayed (replaying) hands the recorded draws back without touching src. The step's own draws go through
  // tap(rng); the regions' streams (their makeRng and the shared rng in their kit) are tapped too, so a region's own step
  // is recorded and replayed the same way and the stream behind the walker's later steps is left as it was
  let rec = stepRing[0], recN = 0, replaying = false, capturing = false;
  const tap = a.tap = (src) => () => { if (replaying) return rec.d[recN++ & 63]; const v = src(); if (capturing) rec.d[recN++ & 63] = v; return v; };
  const draw = tap(rng);
  const stepBurst = (buf, dur, off, at) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(at ?? ac.currentTime + a.lead, off * (buf.duration - dur - 0.1), dur + 0.05); return s; };
  const _rw = {};
  // v7.2-04: small jitter (pitch +-4 %, level +-2 dB), the first step after standing a little louder (+2 dB), and
  // when hurrying a heel-toe pair: the toe 60-120 ms after the heel, softer and duller
  let lastStepAt = -1e9;
  // the walker's steps stand over the quieter v7.2 bed: +12 dB at the dry bus (the echo and the figures' steps keep their own levels)
  const STEP_GAIN = 4;
  function stepSound(hurrying) {
    const regionSnd = a.regionSnd;
    const p = player.pos;
    const ground = p.y - 1.72;
    const b = terrain.biomeAt(p.x, p.z);
    const c = landmarks.castle, ct = landmarks.court;
    const nearCastle = Math.hypot(p.x - c.x, p.z - c.z) < 40 && ground < 20;
    const inCourt = Math.hypot(p.x - ct.x, p.z - ct.z) < 34;
    const t0 = ac.currentTime + a.lead;
    const first = t0 - lastStepAt > 1.5; lastStepAt = t0;
    const vol = (hurrying ? 1.35 : 1) * (first ? 1.26 : 1) * Math.pow(10, (rng() * 4 - 2) / 20);
    const pitch = 0.96 + rng() * 0.08;
    const out = ac.createGain(); out.gain.value = STEP_GAIN;
    let kind = 'grass';
    if (player.wading > 0.05) kind = 'splash';
    else if (b.ice > 0.35 || (b.crystal > 0.55 && b.h > 0 && terrain.glacierMask(p.x, p.z) > 0.2)) kind = 'crunch';
    else if (terrain.causewayDistance(p.x, p.z) < 2.5 || nearCastle || inCourt) kind = 'click';
    else if (b.marsh > 0.5) kind = 'squelch';
    rec = stepRing[audio.steps.seq & 15]; recN = 0; replaying = false; capturing = true;
    rec.t = t0; rec.hurrying = !!hurrying; rec.kind = kind; rec.regionKind = null; rec.x = p.x; rec.z = p.z; rec.vol = vol; rec.pitch = pitch; rec.verb = nearCastle || inCourt;
    if (kind !== 'splash' && regionSnd?.step(p.x, p.z, t0, vol, pitch, out)) { // v4 regions
      capturing = false;
      rec.regionKind = ctx.regions?.regionAt?.(p.x, p.z, _rw)?.primary || 'region'; rec.seq = audio.steps.seq++;
      out.connect(dryBus); setTimeout(() => out.disconnect(), 1200); return;
    }
    try { stepSynth(rec, t0, null, out); if (hurrying) toe(rec, t0, out); } finally { capturing = false; }
    rec.seq = audio.steps.seq++;
    out.connect(dryBus);
    setTimeout(() => out.disconnect(), 1200);
  }
  // a step's synthesis from its record, into out at t0 (sAt: when its noise bursts start; null for now + lead)
  function stepSynth(r, t0, sAt, out) {
    const kind = r.kind, vol = r.vol, pitch = r.pitch;
    if (kind === 'grass') { // three variants by colour (the bandpass's centre and width), dull: a lowpass at 1.3 kHz
      const s = stepBurst(pink, 0.22, draw(), sAt), f = ac.createBiquadFilter(), vr = GRASS[(draw() * 3) | 0]; f.type = 'bandpass'; f.frequency.value = vr[0] * pitch; f.Q.value = vr[1];
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300 * pitch;
      const g = ac.createGain(); env(g, t0, 0.2 * vol, 0.02, 0.16);
      s.connect(f); f.connect(lp); lp.connect(g); g.connect(out);
    } else if (kind === 'click') {
      // stone: brighter than grass but not a tick: pink at 1.4-2.1 kHz (three variants), 3 ms in, 50 ms out
      const s = stepBurst(pink, 0.08, draw(), sAt), hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = CLICK[(draw() * 3) | 0] * pitch; hp.Q.value = 1.6;
      const g = ac.createGain(); env(g, t0, 0.26 * vol, 0.003, 0.05);
      s.connect(hp); hp.connect(g); g.connect(out);
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(190 * pitch, t0); o.frequency.exponentialRampToValueAtTime(90, t0 + 0.05);
      const og = ac.createGain(); env(og, t0, 0.14 * vol, 0.004, 0.06); o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + 0.12);
      if (r.verb) send(out, 0.35);
    } else if (kind === 'splash' || kind === 'squelch') {
      const dur = kind === 'splash' ? 0.5 : 0.25;
      const s = stepBurst(pink, dur, draw(), sAt), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
      f.frequency.setValueAtTime((kind === 'splash' ? 450 : 260) * pitch, t0); f.frequency.exponentialRampToValueAtTime((kind === 'splash' ? 1700 : 600) * pitch, t0 + dur * 0.8);
      const g = ac.createGain(); env(g, t0, 0.26 * vol, 0.04, dur * 0.8);
      s.connect(f); f.connect(g); g.connect(out);
      if (kind === 'splash') for (let k = 0; k < 3; k++) {
        const o = ac.createOscillator(); const tt = t0 + 0.08 + draw() * 0.3; o.frequency.setValueAtTime((700 + draw() * 900) * pitch, tt); o.frequency.exponentialRampToValueAtTime(1800, tt + 0.05);
        const og = ac.createGain(); env(og, tt, 0.04 * vol, 0.004, 0.06); o.connect(og); og.connect(out); o.start(tt); o.stop(tt + 0.1);
      }
      send(out, 0.2);
    } else { // crunch
      for (let k = 0; k < 4; k++) {
        const tt = t0 + k * (0.012 + draw() * 0.018);
        const s = ac.createBufferSource(); s.buffer = white; s.start(tt, draw() * 2, 0.09);
        const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.Q.value = 1.4; hp.frequency.value = (1500 + draw() * 1200) * pitch; // ice: 1.5-2.7 kHz, 3 ms in
        const g = ac.createGain(); env(g, tt, 0.1 * vol, 0.003, 0.04 + draw() * 0.02);
        s.connect(hp); hp.connect(g); g.connect(out);
      }
      send(out, 0.25);
    }
  }
  const GRASS = [[520, 0.6], [440, 0.8], [600, 0.5]], CLICK = [1400, 1750, 2100];
  // the toe of a hurried step: the same ground, softer and duller, 60-120 ms after the heel
  function toe(r, t0, out) {
    const tt = t0 + 0.06 + draw() * 0.06, s = stepBurst(pink, 0.12, draw(), tt), f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 0.8; f.frequency.value = (r.kind === 'click' ? 1100 : r.kind === 'crunch' ? 1300 : 420) * r.pitch;
    const g = ac.createGain(); env(g, tt, 0.09 * r.vol, 0.005, 0.07);
    s.connect(f); f.connect(g); g.connect(out);
  }
  a.stepSynth = stepSynth;
  // the echo: rec played again `delay` s after it was, through a voice's panner at pos (so the voice cap counts it);
  // the same kind, hurry, pitch, volume and draws (a region's own step too: its draws were recorded through tap). Returns
  // { at, voice } or null (too late, or out of range)
  audio.echoStep = (r, pos, delay = 1.0) => {
    if (!r || r.seq < 0) return null;
    const at = r.t + delay, now = ac.currentTime;
    if (at < now) return null;
    const v = voice(pos, { ref: 2.5, roll: 1.1, range: 70, dur: at - v0(now) + 0.7, air: 60 });
    if (!v) return null;
    const out = ac.createGain(); out.gain.value = 1; out.connect(v.in);
    const keep = rec, keepN = recN;
    rec = r; recN = 0; replaying = true;
    try { if (r.regionKind) a.regionSnd?.step(r.x, r.z, at, r.vol, r.pitch, out); else stepSynth(r, at, at, out); }
    finally { replaying = false; rec = keep; recN = keepN; }
    setTimeout(() => out.disconnect(), (at - now + 1.2) * 1000);
    return { at, voice: v };
  };
  const v0 = (now) => now + a.lead; // a voice's own start (voice() sets until from it)
  // a figure's footstep (v7: the Leerie, the Link-Boy): the walker's synthesis for the ground under pos, through a voice's
  // panner there (linear to silence at o.range), at o.vol of a walker's step. Its draws come from a private stream through
  // a record of its own (replayed as the echo is), so neither the walker's ring nor his stream is touched
  const figRng = ctx.makeRng(9171);
  const figRec = { seq: 0, t: 0, hurrying: false, kind: 'grass', regionKind: null, x: 0, z: 0, vol: 1, pitch: 1, verb: false, d: new Float64Array(64) };
  a.figureStep = function figureStep(pos, o) {
    const v = voice(pos, { model: 'linear', ref: o.ref, roll: 1, range: o.range, dur: 0.6, air: 60, gain: o.gain ?? 1 });
    if (!v) return null;
    const r = figRec, x = pos.x, z = pos.z, b = terrain.biomeAt(x, z), wl = terrain.waterLevelAt?.(x, z);
    const c = landmarks.castle, ct = landmarks.court, nearCastle = hyp(x - c.x, z - c.z) < 40 && pos.y < 20, inCourt = hyp(x - ct.x, z - ct.z) < 34;
    let kind = 'grass';
    if (wl != null && wl > pos.y + 0.05) kind = 'splash';
    else if (b.ice > 0.35 || (b.crystal > 0.55 && b.h > 0 && terrain.glacierMask(x, z) > 0.2)) kind = 'crunch';
    else if (terrain.causewayDistance(x, z) < 2.5 || nearCastle || inCourt) kind = 'click';
    else if (b.marsh > 0.5) kind = 'squelch';
    r.t = v.t0; r.kind = kind; r.x = x; r.z = z; r.vol = o.vol * Math.pow(10, (figRng() * 4 - 2) / 20); r.pitch = 0.96 + figRng() * 0.08; r.verb = nearCastle || inCourt;
    for (let i = 0; i < 64; i++) r.d[i] = figRng();
    const out = ac.createGain(); out.gain.value = 1; out.connect(v.in);
    const keep = rec, keepN = recN;
    rec = r; recN = 0; replaying = true;
    try { if (kind === 'splash' || !a.regionSnd?.step(x, z, v.t0, r.vol, r.pitch, out)) stepSynth(r, v.t0, v.t0, out); }
    finally { replaying = false; rec = keep; recN = keepN; }
    setTimeout(() => out.disconnect(), 1200);
    return v;
  };
  const prevStep = player.onStep;
  player.onStep = (hurrying) => { try { stepSound(hurrying); } catch (e) { /* never break the frame loop */ } prevStep?.(hurrying); };
}
