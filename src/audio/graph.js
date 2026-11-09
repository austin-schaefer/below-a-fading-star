// The audio graph (v7.2-01 split out of src/audio.js; v7.2-05 voiced it): the AudioContext, the master chain, the
// three rooms and the water's slap, the shared buses and noise buffers, the listener, the one distance model, the voice
// cap and the small helpers every other part builds with. startGraph(ctx, audio) makes it and returns the shared audio
// object `a` that every part takes as its first argument, so no part reaches into another file's locals.
//
// a = {
//   ac, rng (ctx.makeRng(909): the shared stream; its order of draws is the sound), ctx, audio (ctx.audio), camera,
//   terrain, landmarks, player,
//   lead: how far ahead one-shots are scheduled (s; updateLead(dt, now) keeps it a little over the audio clock's staleness),
//   master -> busComp (gentle glue) -> limiter (the net) -> mute -> vol -> out; analyser (master tap, pre-compressor),
//   postAnalyser (after the net),
//   verbIn (the reverb send's input: split by place into the three rooms, and from the open room's share into the
//   water's slap), verb (alias of space.rooms.open's convolver), verbOut (the rooms' sum, into master),
//   space = { open, wood, stone, water (the listener's place now, 0..1; open + wood + stone = 1), at(x, z, out?) (the
//   same weights anywhere), rooms: { open, wood, stone } ({ conv, send }) },
//   cueBus (one-shots, with cueAnalyser), dryBus (footsteps), brown / pink / white (looped noise buffers),
//   loopSrc(buf, off), burst(buf, dur, off?), burstAt(buf, at, dur), panner(model, ref, roll, maxD?), setPos(p, x, y, z),
//   send(node, amt) (a reverb send; off a one-shot's voice when node._v, shaped by its distance), setListener(),
//   distance: { air(d) (the air lowpass's cutoff, Hz), dry(d, o) (the dry gain), wet(d, o) (the send's gain) },
//   voices (the live ones), MAX_VOICES (12), voice(pos, o), retire(v), oneShotPanner(pos, ref?, roll?), later(p, sec),
//   panned(pos, o) (a held, placed source for beds and hooks: the same distance model, kept current as you move),
//   near(pos, d?), vOsc(v, type, f, at, end), vNoise(v, buf, at, dur), filt(type, f, q?), gainOf(x), chain(...nodes),
//   grain(v, dest, at, f, q, peak, dec, buf?), swell(g, t0, peak, att, end), env(g, t0, peak, att, dec),
//   nTick(out, at, f, q, peak, dec, buf?), clamp, smoothstep, updateLead(dt, now)
// }
// Parts add their own handles to `a` as they start (a.tap, a.figureStep, a.regionSnd, a.living, a.fall, ...).
//
// The distance model (craft.md "Distance"), one for every placed sound: dry gain inverse from `ref` (2 m unless the
// caller says; linear to silence at the range only when it asks, model: 'linear'); air absorption always, a lowpass at
// 18000 e^(-d/60) Hz floored at 700 (a caller's `air` sets its own length in place of 60); the reverb send taken before the distance gain and falling at a third of its rate
// in dB, so a far thing is mostly room (wet share about 15 % near, 50-70 % at 200 m) where a near one is mostly itself;
// nothing built past the range (maxDistance); HRTF only for a source flagged near: true, equal-power otherwise.
//
// The rooms (craft.md "Space"; SPACES below): open (1.2 s, dark, a few sparse reflections), wood (0.8 s, dense, very
// dark, early-heavy), stone (3.2 s, brighter, a 28 ms gap before the walls answer). Three convolvers; the sends follow
// the listener's place (space.at: the regions' weights, the wood's biome, the keep, the Sunken Court, the Hypogeum and
// the Demesne by distance, walls of ground round you for the canyon, water round you for the slap), blended over about
// 2 s as you walk. The water's slap is two short bright delays on the open room's share, not a fourth convolver.
//
// The master chain (decision 6): master 0.25 -> busComp (threshold -18, knee 20, ratio 2, attack 20 ms, release 0.5 s)
// -> limiter (threshold -6, knee 0, ratio 4, attack 10 ms, release 0.25 s), a net that catches only the loudest
// transients -> mute -> vol.
import { makeNoiseBuffer, makeSpace } from './synth.js';

// The three rooms' impulses (makeSpace's parameters). Each has its own private stream, so the shared one is untouched.
export const SPACES = {
  open: { rt60: 1.2, pre: 0.008, early: [5, 0.004, 0.09, 0.45], fade: 0.02, bright: 4200, dark: 700, low: 150 },
  wood: { rt60: 0.8, pre: 0.002, early: [40, 0.001, 0.045, 0.55], fade: 0.003, bright: 2400, dark: 450, low: 180 },
  stone: { rt60: 3.4, len: 3.6, pre: 0.028, early: [12, 0.0, 0.11, 0.7], fade: 0.03, bright: 8000, dark: 1600, low: 110 },
};
// the room's tail level into master, each (the impulses are normalised by the convolver to one RMS, so a longer room
// carries more energy, as a bigger one does)
const ROOM_OUT = { open: 0.55, wood: 0.55, stone: 0.55 };
// the air: e-folding length (m) and floor (Hz) of the distance lowpass
const AIR_M = 60, AIR_FLOOR = 700, AIR_TOP = 18000;
// the send's fall with distance, as a power of the dry gain (0.8: 80 % of the dry's fall in dB), and a placed voice's
// send gain over its caller's amount, so that at 0.4 a near voice is about 10 % room (in energy, in the open room) and
// at 200 m about 70 % (measured in Chromium's own convolver; the rooms' impulses are normalised to one RMS)
const WET_POW = 0.8, VOICE_WET = 5.6;
// the air lowpass's Q: Web Audio's lowpass Q is in dB; -3.01 dB is Butterworth, flat to the cutoff with no peak
const AIR_Q = -3.01;

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

  // ---- master chain: master -> busComp -> limiter (the net) -> mute -> vol -> out, with taps for tests
  const master = ac.createGain(); master.gain.value = 0;
  master.gain.setValueAtTime(0, now0);
  master.gain.linearRampToValueAtTime(0.25, now0 + 4); // about -12 dB
  const dyn = (thr, knee, ratio, att, rel) => {
    const c = ac.createDynamicsCompressor();
    c.threshold.value = thr; c.knee.value = knee; c.ratio.value = ratio; c.attack.value = att; c.release.value = rel;
    return c;
  };
  const busComp = dyn(-18, 20, 2, 0.02, 0.5); // glue: a dB or two on the loudest moments, never pumping
  const limiter = dyn(-6, 0, 4, 0.01, 0.25); // the net: only a transient that would clip
  const analyser = ac.createAnalyser(); analyser.fftSize = 2048;
  const postAnalyser = ac.createAnalyser(); postAnalyser.fftSize = 2048;
  const mute = ac.createGain(); mute.gain.value = audio.muted ? 0 : 1;
  const vol = ac.createGain(); vol.gain.value = audio.volume * audio.volume;
  master.connect(busComp); busComp.connect(limiter); limiter.connect(mute); mute.connect(vol); vol.connect(ac.destination);
  master.connect(analyser); limiter.connect(postAnalyser);
  audio.master = master; audio.analyser = analyser; audio.postAnalyser = postAnalyser; audio.mute = mute; audio.vol = vol;
  Object.assign(a, { master, busComp, limiter, analyser, postAnalyser, mute, vol });

  // ---- the rooms: verbIn -> one send a room (its gain the place's weight) -> convolver -> verbOut -> master; the
  // open room's share also feeds the water's slap. The impulses draw from private streams; the shared stream still
  // gives the draws the old single impulse took (3.2 s, two channels), so every part after this hears the same noise.
  for (let i = 2 * Math.floor(ac.sampleRate * 3.2); i > 0; i--) rng();
  const verbIn = ac.createGain(); verbIn.gain.value = 1;
  const verbOut = ac.createGain(); verbOut.gain.value = 1; verbOut.connect(master);
  const rooms = {};
  let salt = 0;
  for (const k of ['open', 'wood', 'stone']) {
    const conv = ac.createConvolver(); conv.buffer = makeSpace(ac, SPACES[k], ctx.makeRng(931 + salt++));
    const send = ac.createGain(); send.gain.value = k === 'open' ? 1 : 0;
    const out = ac.createGain(); out.gain.value = ROOM_OUT[k];
    verbIn.connect(send); send.connect(conv); conv.connect(out); out.connect(verbOut);
    rooms[k] = { conv, send, out };
  }
  // the water's slap: off the open room's send, high-passed, two short delays (one a side), bright and quick
  const slapIn = ac.createGain(); slapIn.gain.value = 0;
  const slapHP = ac.createBiquadFilter(); slapHP.type = 'highpass'; slapHP.frequency.value = 1400; slapHP.Q.value = 0.6;
  const slapLP = ac.createBiquadFilter(); slapLP.type = 'lowpass'; slapLP.frequency.value = 7000; slapLP.Q.value = 0.5;
  const slapM = ac.createChannelMerger(2);
  rooms.open.send.connect(slapIn); slapIn.connect(slapHP); slapHP.connect(slapLP);
  [[0.023, 0.5, 0], [0.041, 0.38, 1]].forEach(([t, g, ch]) => {
    const dl = ac.createDelay(0.1); dl.delayTime.value = t; const gg = ac.createGain(); gg.gain.value = g;
    slapLP.connect(dl); dl.connect(gg); gg.connect(slapM, 0, ch);
  });
  slapM.connect(master);
  rooms.slap = { in: slapIn };
  const verb = rooms.open.conv; // the old single convolver's name: the open room
  Object.assign(a, { verb, verbIn, verbOut });

  // ---- the place: where the listener stands, as room weights. Read from the regions' weights, the wood's biome, the
  // stone places by distance (the keep below its wall-walk, the Sunken Court, the Hypogeum; the Demesne and the Lattice
  // a little), walls of ground round you (eight bearings at 12 and 24 m standing 6 m over your feet: the canyon), and
  // water round you (eight bearings at 14 m and your feet).
  const L = landmarks, hy = (x, z) => Math.hypot(x, z);
  const ring = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
  const near1 = (d, r0, r1) => 1 - smoothstep(r0, r1, d);
  function at(x, z, out = {}) {
    const w = ctx.regions?.soundAt?.(x, z), b = terrain.biomeAt(x, z), g = terrain.heightAt(x, z);
    let stone = 0;
    if (L.castle) stone = Math.max(stone, near1(hy(x - L.castle.x, z - L.castle.z), L.castle.r - 6, L.castle.r + 4) * (g < 20 ? 1 : 0));
    if (L.court) stone = Math.max(stone, near1(hy(x - L.court.x, z - L.court.z), L.court.r * 0.75, L.court.r * 1.1));
    if (L.hypogeum) stone = Math.max(stone, near1(hy(x - L.hypogeum.x, z - L.hypogeum.z), L.hypogeum.r, L.hypogeum.r + 12));
    let walls = 0, wet = 0;
    for (const [cx, cz] of ring) {
      const h = Math.max(terrain.heightAt(x + cx * 12, z + cz * 12), terrain.heightAt(x + cx * 24, z + cz * 24));
      if (h - g > 6) walls++;
      const wx = x + cx * 14, wz = z + cz * 14, wl = terrain.waterLevelAt(wx, wz);
      if (wl !== null && wl > terrain.heightAt(wx, wz)) wet++;
    }
    const wl0 = terrain.waterLevelAt(x, z);
    if (wl0 !== null && wl0 > g - 0.5) wet += 2;
    stone = Math.max(stone, smoothstep(4.5, 7, walls), 0.35 * (w?.demesne || 0), 0.2 * (w?.lattice || 0));
    const wood = clamp(Math.max(w?.wood || 0, b.wood), 0, 1) * (1 - stone);
    out.stone = stone; out.wood = wood; out.open = Math.max(0, 1 - stone - wood);
    out.water = clamp(Math.max(wet / 6, (w?.fen || 0) * 0.6, (w?.saltings || 0) * 0.7, (w?.strandline || 0) * 0.7, b.shore * 0.7), 0, 1);
    return out;
  }
  const held = []; // panned() sources, kept current by tickSpace
  const space = a.space = audio.space = { open: 1, wood: 0, stone: 0, water: 0, at, rooms };
  const _sp = {};
  let spaceNext = 0;
  // every 0.25 s: the place's weights, glided over ~2 s (time constant 0.6 s)
  function tickSpace(now) {
    if (now < spaceNext) return;
    const first = spaceNext === 0; spaceNext = now + 0.25;
    const p = camera.position; at(p.x, p.z, _sp);
    for (const k of ['open', 'wood', 'stone', 'water']) space[k] = _sp[k];
    const glide = (prm, v) => { if (first) prm.setValueAtTime(v, now); else prm.setTargetAtTime(v, now, 0.6); };
    glide(rooms.open.send.gain, _sp.open); glide(rooms.wood.send.gain, _sp.wood); glide(rooms.stone.send.gain, _sp.stone);
    glide(slapIn.gain, _sp.water * 0.9);
    for (const h of held) h.update(now);
  }

  // ---- noise sources
  const brown = makeNoiseBuffer(ac, 7, 'brown', rng), pink = makeNoiseBuffer(ac, 5, 'pink', rng), white = makeNoiseBuffer(ac, 3, 'white', rng);
  const loopSrc = (buf, off) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off * buf.duration); return s; };
  const burst = (buf, dur, off = rng()) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(ac.currentTime + a.lead, off * (buf.duration - dur - 0.1), dur + 0.05); return s; };
  // a short band of noise: the stuff of clicks, ticks and sloshes
  const burstAt = (buf, at, dur) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(at, rng() * (buf.duration - dur - 0.1), dur + 0.05); return s; };
  Object.assign(a, { brown, pink, white, loopSrc, burst, burstAt });

  // ---- listener follows the camera: position, forward and up (so looking down at your feet does not swap left and
  // right), glided over 15 ms where the API has AudioParams; and the place, every 0.25 s
  const Ls = ac.listener;
  const dirV = camera.getWorldDirection.bind(camera);
  const _d = camera.position.clone(), _u = camera.position.clone();
  const lset = (prm, v, t) => prm.setTargetAtTime(v, t, 0.015);
  a.setListener = function setListener() {
    dirV(_d); _u.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const p = camera.position, t = ac.currentTime;
    if (Ls.positionX) {
      lset(Ls.positionX, p.x, t); lset(Ls.positionY, p.y, t); lset(Ls.positionZ, p.z, t);
      lset(Ls.forwardX, _d.x, t); lset(Ls.forwardY, _d.y, t); lset(Ls.forwardZ, _d.z, t);
      lset(Ls.upX, _u.x, t); lset(Ls.upY, _u.y, t); lset(Ls.upZ, _u.z, t);
    } else { Ls.setPosition(p.x, p.y, p.z); Ls.setOrientation(_d.x, _d.y, _d.z, _u.x, _u.y, _u.z); }
    tickSpace(t);
  };

  const panner = (model, ref, roll, maxD = 600) => {
    const p = ac.createPanner(); p.panningModel = model; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = maxD;
    return p;
  };
  const setPos = (p, x, y, z) => { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); };
  // ---- the distance model (header): the air's cutoff, the dry gain as the panner gives it, and the send's gain
  const airAt = (d, m = AIR_M) => clamp(AIR_TOP * Math.exp(-d / m), AIR_FLOOR, AIR_TOP);
  function dryAt(d, o = {}) {
    const ref = o.ref ?? 2, roll = o.roll ?? 1, max = o.range ?? o.maxDistance ?? 600;
    if (o.model === 'linear') return clamp(1 - roll * (clamp(d, ref, max) - ref) / Math.max(1e-3, max - ref), 0, 1);
    return ref / (ref + roll * (Math.max(d, ref) - ref));
  }
  const wetAt = (d, o) => VOICE_WET * Math.pow(dryAt(d, o), WET_POW);
  a.distance = { air: airAt, dry: dryAt, wet: wetAt };
  // a reverb send. Off a one-shot's voice (node._v) it leaves before the distance gain, through the voice's own wet
  // gate (so a stolen voice falls silent in the room too), at amt times the distance's wet gain; off anything else it
  // leaves from the node itself, as it always has
  const send = (node, amt) => {
    const g = ac.createGain(), v = node._v;
    if (v && v.wet) { g.gain.value = amt * v.wetK; v.wetTap.connect(g); g.connect(v.wet); return g; }
    g.gain.value = amt; (v ? v.gate : node).connect(g); g.connect(verbIn); return g;
  };
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
    try { v.in.disconnect(); v.gate.disconnect(); v.wet?.disconnect(); } catch (e) { /* already gone */ }
  }
  function steal(v) {
    const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1);
    const now = ac.currentTime;
    for (const gn of v.wet ? [v.gate, v.wet] : [v.gate]) {
      const g = gn.gain; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.04);
    }
    for (const s of v.srcs) { try { s.stop(now + 0.06); } catch (e) { /* not started yet or already stopped */ } }
    setTimeout(() => retire(v), 150);
  }
  function admit(v) {
    const now = ac.currentTime;
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].until < now) retire(voices[i]);
    while (voices.length >= MAX_VOICES) steal(voices[0]);
    voices.push(v);
  }
  // A placed voice's path (the distance model): in -> air lowpass -> panner -> gate -> bus, and from the lowpass a
  // wet tap for its sends, through the voice's wet gate to the rooms. v.wetK is the distance's wet gain.
  function placed(v, pos, d, o, bus) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = AIR_Q; lp.frequency.value = airAt(d, o.air || AIR_M);
    const p = ac.createPanner(); p.panningModel = o.near ? 'HRTF' : 'equalpower'; p.distanceModel = o.model === 'linear' ? 'linear' : 'inverse';
    p.refDistance = o.ref ?? 2; p.rolloffFactor = o.roll ?? 1; p.maxDistance = o.range ?? o.maxDistance ?? 600;
    setPos(p, pos.x, pos.y, pos.z);
    v.in.connect(lp); lp.connect(p); p.connect(v.gate); v.gate.connect(bus);
    v.pan = p; v.lp = lp; v.wetTap = lp; v.wet = ac.createGain(); v.wet.connect(verbIn); v.wetK = wetAt(d, o);
  }
  // o: { ref (2 m by default), roll (1), range or maxDistance (m: nothing is built past it), model ('inverse' |
  // 'linear', which reaches silence at range), verb (the send at the source: the distance shapes it), dur (s), near
  // (HRTF), centre (no panner, no distance), air (m: the air lowpass's e-folding length, 60 unless given; the lowpass is
  // always there) }.
  function voice(pos, o) {
    const cp = camera.position;
    if (!o.centre && !pos) pos = { x: cp.x + 4, y: cp.y, z: cp.z }; // a cue fired with no place: just beside you
    const d = o.centre ? 0 : Math.hypot(pos.x - cp.x, pos.y - cp.y, pos.z - cp.z);
    if (d > (o.range ?? o.maxDistance ?? Infinity)) return null;
    const v = { in: ac.createGain(), gate: ac.createGain(), srcs: [], until: 0, done: false, d, t0: ac.currentTime + a.lead, pan: null };
    if (!o.centre) placed(v, pos, d, o, cueBus);
    else { v.in.connect(v.gate); v.gate.connect(cueBus); v.wetTap = v.in; v.wet = ac.createGain(); v.wet.connect(verbIn); v.wetK = VOICE_WET; }
    if (o.verb) { const g = ac.createGain(); g.gain.value = o.verb * v.wetK; v.wetTap.connect(g); g.connect(v.wet); }
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
  // the older cues build on what looks like a bare panner: it is the input of a placed voice (the same distance model:
  // air lowpass, panner, gate, cue bus; send() off it is shaped by distance), registered so the cap counts it, and
  // later(p, sec) sets when it ends
  function oneShotPanner(position, ref = 10, roll = 1) {
    const cp = camera.position, d = Math.hypot(position.x - cp.x, position.y - cp.y, position.z - cp.z);
    const v = { in: ac.createGain(), gate: ac.createGain(), srcs: NO_SRCS, until: ac.currentTime + 6, done: false, d };
    placed(v, position, d, { ref, roll }, cueBus);
    v.in._v = v; admit(v);
    return v.in;
  }
  // a held, placed source for beds and region hooks (not a one-shot, not capped): in -> air lowpass -> panner -> out
  // (gain 1) -> o.bus (master by default), a send of o.verb into the rooms, both kept current with the distance as you
  // move (every 0.25 s, glided). o: { ref, roll, model, range / maxDistance, verb, bus, near }. Returns { in, out, pan,
  // lp, wet, set(x, y, z), update(now), release() }.
  function panned(pos, o = {}) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = AIR_Q;
    const pan = ac.createPanner(); pan.panningModel = o.near ? 'HRTF' : 'equalpower'; pan.distanceModel = o.model === 'linear' ? 'linear' : 'inverse';
    pan.refDistance = o.ref ?? 2; pan.rolloffFactor = o.roll ?? 1; pan.maxDistance = o.range ?? o.maxDistance ?? 600;
    const inp = ac.createGain(), out = ac.createGain(), wet = ac.createGain(); wet.gain.value = 0;
    inp.connect(lp); lp.connect(pan); pan.connect(out); out.connect(o.bus || master);
    if (o.verb) { lp.connect(wet); wet.connect(verbIn); }
    const P = { x: pos.x, y: pos.y, z: pos.z };
    const h = {
      in: inp, out, pan, lp, wet,
      set(x, y, z) { P.x = x; P.y = y; P.z = z; setPos(pan, x, y, z); },
      update(now, first) {
        const cp = camera.position, d = Math.hypot(P.x - cp.x, P.y - cp.y, P.z - cp.z);
        if (first) { lp.frequency.value = airAt(d, o.air || AIR_M); wet.gain.value = (o.verb || 0) * wetAt(d, o); return; }
        lp.frequency.setTargetAtTime(airAt(d, o.air || AIR_M), now, 0.15);
        if (o.verb) wet.gain.setTargetAtTime(o.verb * wetAt(d, o), now, 0.15);
      },
      release() { const i = held.indexOf(h); if (i >= 0) held.splice(i, 1); try { out.disconnect(); wet.disconnect(); } catch (e) { /* gone */ } },
    };
    h.set(P.x, P.y, P.z); h.update(ac.currentTime, true); held.push(h);
    return h;
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
  Object.assign(a, { voices, MAX_VOICES, voice, retire, oneShotPanner, panned, later, near, vOsc, vNoise, filt, gainOf, chain, grain, swell, nTick });
  return a;
}
