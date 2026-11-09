// The audio graph (v7.2-01 split out of src/audio.js; v7.2-05 voices it next): the AudioContext, the master chain,
// the reverb send, the shared buses and noise buffers, the listener, the voice cap and the small helpers every
// other part builds with. startGraph(ctx, audio) makes it and returns the shared audio object `a` that every part
// takes as its first argument, so no part reaches into another file's locals.
//
// a = {
//   ac, rng (ctx.makeRng(909): the shared stream; its order of draws is the sound), ctx, audio (ctx.audio), camera,
//   terrain, landmarks, player,
//   lead: how far ahead one-shots are scheduled (s; updateLead(dt, now) keeps it a little over the audio clock's staleness),
//   master -> limiter -> mute -> vol -> out, analyser (master tap), verbIn (the reverb send's input),
//   cueBus (one-shots, with cueAnalyser), dryBus (footsteps), brown / pink / white (looped noise buffers),
//   loopSrc(buf, off), burst(buf, dur, off?), burstAt(buf, at, dur), panner(model, ref, roll, maxD?), setPos(p, x, y, z),
//   send(node, amt) (a reverb send; off a one-shot's voice gate when node._v), setListener(),
//   voices (the live ones), MAX_VOICES (12), voice(pos, o), retire(v), oneShotPanner(pos, ref?, roll?), later(p, sec),
//   near(pos, d?), vOsc(v, type, f, at, end), vNoise(v, buf, at, dur), filt(type, f, q?), gainOf(x), chain(...nodes),
//   grain(v, dest, at, f, q, peak, dec, buf?), swell(g, t0, peak, att, end), env(g, t0, peak, att, dec),
//   nTick(out, at, f, q, peak, dec, buf?), clamp, smoothstep, updateLead(dt, now)
// }
// Parts add their own handles to `a` as they start (a.tap, a.figureStep, a.regionSnd, a.living, a.fall, ...).
import { makeNoiseBuffer, makeImpulse } from './synth.js';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function startGraph(ctx, audio, AC) {
  const ac = new AC();
  audio.ctx = ac;
  ac.resume?.();
  const rng = ctx.makeRng(909);
  const { terrain, landmarks, player, camera } = ctx;
  const now0 = ac.currentTime;
  const a = { ac, rng, ctx, audio, camera, terrain, landmarks, player, clamp, smoothstep };
  // how far ahead one-shots are scheduled: a little more than the audio clock's staleness as JS sees it
  // (offset of performance.now() against ac.currentTime above its best), so a short envelope never lands in
  // the past on a starved machine
  a.lead = 0.03;
  let offMin = Infinity, staleMax = 0;
  a.updateLead = (dt, now) => {
    const off = performance.now() / 1000 - now;
    offMin = Math.min(offMin + dt * 0.002, off); // let the floor creep, for clock drift
    staleMax = Math.max(staleMax * 0.995, off - offMin);
    a.lead = clamp(staleMax + 0.02, 0.03, 0.3);
  };

  // ---- master chain: master -> limiter -> out, with a tap for tests
  const master = ac.createGain(); master.gain.value = 0;
  master.gain.setValueAtTime(0, now0);
  master.gain.linearRampToValueAtTime(0.25, now0 + 4); // about -12 dB
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 8; limiter.attack.value = 0.005; limiter.release.value = 0.3;
  const analyser = ac.createAnalyser(); analyser.fftSize = 2048;
  const mute = ac.createGain(); mute.gain.value = audio.muted ? 0 : 1;
  const vol = ac.createGain(); vol.gain.value = audio.volume * audio.volume;
  master.connect(limiter); limiter.connect(mute); mute.connect(vol); vol.connect(ac.destination); master.connect(analyser);
  audio.master = master; audio.analyser = analyser; audio.mute = mute; audio.vol = vol;
  Object.assign(a, { master, limiter, analyser, mute, vol });

  // ---- reverb send
  const verb = ac.createConvolver(); verb.buffer = makeImpulse(ac, 3.2, 3.2, rng);
  const verbIn = ac.createGain(); verbIn.gain.value = 1;
  const verbOut = ac.createGain(); verbOut.gain.value = 0.55;
  verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);
  Object.assign(a, { verb, verbIn, verbOut });

  // ---- noise sources
  const brown = makeNoiseBuffer(ac, 7, 'brown', rng), pink = makeNoiseBuffer(ac, 5, 'pink', rng), white = makeNoiseBuffer(ac, 3, 'white', rng);
  const loopSrc = (buf, off) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off * buf.duration); return s; };
  const burst = (buf, dur, off = rng()) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(ac.currentTime + a.lead, off * (buf.duration - dur - 0.1), dur + 0.05); return s; };
  // a short band of noise: the stuff of clicks, ticks and sloshes
  const burstAt = (buf, at, dur) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(at, rng() * (buf.duration - dur - 0.1), dur + 0.05); return s; };
  Object.assign(a, { brown, pink, white, loopSrc, burst, burstAt });

  // ---- listener follows the camera
  const L = ac.listener;
  const dirV = camera.getWorldDirection.bind(camera);
  const _d = camera.position.clone();
  a.setListener = function setListener() {
    dirV(_d);
    const p = camera.position;
    if (L.positionX) {
      L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
      L.forwardX.value = _d.x; L.forwardY.value = _d.y; L.forwardZ.value = _d.z;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(_d.x, _d.y, _d.z, 0, 1, 0); }
  };

  const panner = (model, ref, roll, maxD = 600) => {
    const p = ac.createPanner(); p.panningModel = model; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = maxD;
    return p;
  };
  const setPos = (p, x, y, z) => { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); };
  // a one-shot's reverb send leaves from its voice gate, so a stolen voice falls silent in the reverb too
  const send = (node, amt) => { const g = ac.createGain(); g.gain.value = amt; (node._v ? node._v.gate : node).connect(g); g.connect(verbIn); return g; };
  function env(g, t0, peak, att, dec) {
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + att + dec);
  }
  Object.assign(a, { panner, setPos, send, env });

  // ---- buses: footsteps (dry) and one-shots (with their own analyser tap, so tests can hear a cue apart from the
  // wind and drone)
  const dryBus = ac.createGain(); dryBus.gain.value = 1; dryBus.connect(master);
  const cueBus = ac.createGain(); cueBus.connect(master);
  const cueAnalyser = ac.createAnalyser(); cueAnalyser.fftSize = 2048; cueBus.connect(cueAnalyser);
  audio.cueAnalyser = cueAnalyser;
  Object.assign(a, { dryBus, cueBus, cueAnalyser });

  // ---- voices: a hard cap on simultaneous one-shots, the oldest stolen
  // A voice is sources -> in -> [air lowpass] -> [panner] -> gate -> cue bus, with any reverb send off the gate.
  // Past MAX_VOICES the oldest is stolen: its gate fades in 40 ms, its sources stop and it is disconnected.
  const MAX_VOICES = 12, NO_SRCS = [];
  const voices = [];
  audio.voices = voices;
  function retire(v) {
    if (v.done) return;
    v.done = true;
    const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1);
    try { v.in.disconnect(); v.gate.disconnect(); } catch (e) { /* already gone */ }
  }
  function steal(v) {
    const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1);
    const now = ac.currentTime, g = v.gate.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.04);
    for (const s of v.srcs) { try { s.stop(now + 0.06); } catch (e) { /* not started yet or already stopped */ } }
    setTimeout(() => retire(v), 150);
  }
  function admit(v) {
    const now = ac.currentTime;
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].until < now) retire(voices[i]);
    while (voices.length >= MAX_VOICES) steal(voices[0]);
    voices.push(v);
  }
  // o: { ref, roll, range (m: nothing is built past it), model ('inverse' | 'linear', which reaches silence at
  // range), verb (send), dur (s), air (m: a distance lowpass, e-folding length), centre (no panner) }
  function voice(pos, o) {
    const cp = camera.position;
    if (!o.centre && !pos) pos = { x: cp.x + 4, y: cp.y, z: cp.z }; // a cue fired with no place: just beside you
    const d = o.centre ? 0 : Math.hypot(pos.x - cp.x, pos.y - cp.y, pos.z - cp.z);
    if (d > o.range) return null;
    const v = { in: ac.createGain(), gate: ac.createGain(), srcs: [], until: 0, done: false, d, t0: ac.currentTime + a.lead, pan: null };
    let tail = v.in;
    if (o.air) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = clamp(20000 * Math.exp(-d / o.air), 900, 20000); tail.connect(lp); tail = lp; }
    if (!o.centre) {
      const p = ac.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = o.model || 'inverse';
      p.refDistance = o.ref; p.rolloffFactor = o.roll ?? 1; p.maxDistance = o.range;
      setPos(p, pos.x, pos.y, pos.z); tail.connect(p); tail = p; v.pan = p;
    }
    tail.connect(v.gate); v.gate.connect(cueBus);
    if (o.verb) { const g = ac.createGain(); g.gain.value = o.verb; v.gate.connect(g); g.connect(verbIn); }
    v.until = v.t0 + o.dur;
    admit(v);
    setTimeout(() => retire(v), (v.until - ac.currentTime + 0.3) * 1000);
    return v;
  }
  // sources owned by a voice (so a steal can stop them), and the small pieces cues are made of
  const vOsc = (v, type, f, at, end) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.start(at); o.stop(end); v.srcs.push(o); return o; };
  const vNoise = (v, buf, at, dur) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(at, rng() * Math.max(0, buf.duration - dur - 0.1), dur + 0.05); v.srcs.push(s); return s; };
  const filt = (type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const gainOf = (x) => { const g = ac.createGain(); g.gain.value = x; return g; };
  const chain = (...n) => { for (let i = 1; i < n.length; i++) n[i - 1].connect(n[i]); return n[n.length - 1]; };
  // a grain of filtered noise: claws, petals, wingbeats, grit
  function grain(v, dest, at, f, q, peak, dec, buf = white) {
    const g = ac.createGain(); env(g, at, peak, 0.001, dec);
    chain(vNoise(v, buf, at, dec + 0.02), filt('bandpass', f, q), g, dest);
  }
  // swell: 0 -> peak over att, hold-ish, gone by end (exponential tail)
  function swell(g, t0, peak, att, end) { g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, end); }
  // the older cues build on a bare panner; it is registered as a voice (sources -> panner -> gate -> cue bus)
  // so the cap counts it, and later(p, sec) sets when it ends
  function oneShotPanner(position, ref = 10, roll = 1) {
    const p = panner('equalpower', ref, roll); setPos(p, position.x, position.y, position.z);
    const v = { in: p, gate: ac.createGain(), srcs: NO_SRCS, until: ac.currentTime + 6, done: false };
    p.connect(v.gate); v.gate.connect(cueBus); p._v = v; admit(v);
    return p;
  }
  const later = (p, sec) => {
    const v = p._v;
    if (!v) { setTimeout(() => p.disconnect(), sec * 1000); return; }
    v.until = ac.currentTime + sec; setTimeout(() => retire(v), sec * 1000);
  };
  const near = (pos, d = 4) => pos || { x: camera.position.x + d, y: camera.position.y, z: camera.position.z };
  function nTick(out, at, f, q, peak, dec, buf = white) {
    const s = burstAt(buf, at, dec + 0.02), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = ac.createGain(); env(g, at, peak, 0.001, dec); s.connect(bp); bp.connect(g); g.connect(out);
  }
  Object.assign(a, { voices, MAX_VOICES, voice, retire, oneShotPanner, later, near, vOsc, vNoise, filt, gainOf, chain, grain, swell, nTick });
  return a;
}
