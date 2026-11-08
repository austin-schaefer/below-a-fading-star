// Audio: everything synthesised with WebAudio, started on the first click (the `begin` event).
// Wind, a low drone that swells when the sun gutters, footsteps by ground, place sounds (tarn, fen, Lattice,
// Cardinal Stones), calls (wings, crows, fish) and a faint counting click near the deodand.
// Exposes ctx.audio = { cue(name, position?, opts?), ctx: AudioContext, master, analyser, cueAnalyser, voices, fall,
// muted, setMuted(bool), mute (the GainNode after the limiter) }. Chain: master -> limiter -> mute -> out.
// A no-op without AudioContext. One-shots share the cue bus (with its own analyser tap for tools/audio-test.mjs)
// and a hard cap of 12 voices, the oldest stolen. Positions are {x,y,z}, copied at the call.
//
// Cues: name (position, opts): range
//   cry, crows, flush, plop, rumble, farcry, skycreak, eyes-close, eyes-open, slinker-seen, slinker-gone,
//   traveller-greet, tarn-hum, tarn-step (pos): as they were; strike (stone index 0..3) rings on the stones' own panners
//   carillon (cap pos, { note: 0..8, quiet? }): a worn bronze bell, 2.5-4 s; quiet = a third the gain: ~260 m
//   glyph-shift (lintel pos): a low stone grind, sinking then rising, and a grit tail, 2 s: 15 m (linear to silence)
//   sward-close (centre): a dry petal rustle swelling and fading as a wave across the sward, 1.5 s: ~240 m
//   sward-open (centre): the same, slower and softer, 4 s: ~240 m
//   sward-whimper (head pos): one tiny breathy pitched sigh, 0.3-0.6 s: 5 m (linear)
//   pedlar-pass (pos): a dragonfly wing-whirr sliding down in pitch as it passes, and a salt-goad tink, 0.4 s: 30 m
//   wrong-colour-near (pos): nearly a chord, beating, sagging, 3 s, quiet: 60 m
//   fall-rumble-enter / fall-rumble-leave (fall {x,y,z}): start / fade (2 s) the fall's positional rumble loop,
//     whose gain follows ctx.river.rumble (0..1), read at 10 Hz whether or not the cues arrive
//   procession (pos, ~300 m off): nine faint high whistles under a slow tremolo, 6-8 s: anywhere
//   guest-heartbeat (pos ignored, { strength: 0.05..1 }): lub-dub, centre, no rolloff; louder, brighter with strength
//   galley-drum (hull pos, { distance }): one deep damped boom, more muffled with distance: 130 m
//   lizard-skitter (pos): a few dry claw grains on stone, 0.2-0.3 s: 6 m (linear)
//   rooks-lift (centroid, { count }): wing clatter of the flock and two or three caws, 1.5 s: ~260 m
//   bats-out (tower window pos, { count }): a soft high fluttering rush and many tiny chirps, 3-4 s: 160 m
//   wader-gone (pos, { quiet }): a breath of air and one soft plip: 20 m (linear)
//   biomesh-settle (tile pos, { quiet }): a tiny glassy tick, 60-120 ms, at most one per 0.6 s: 10 m (linear)
//   lamp-tick (a Leerie standard lighting, v5/lights.js): a click and the flame's breath, 0.8 s
//   kept-fire (hearth pos, { flare?, strength? }): a fire's crackle, 1.8 s, pops and a hiss: 70 m; flare: a roar swelling under thick crackle and a low whump, 3.4 s: 130 m
//   hawser-groan (the chain's midpoint): iron dragged one link through the paving, a sagging groan, the grind, a long ring, 7.4 s: the whole bowl
import { makeNoiseBuffer, makeImpulse } from './audio/synth.js';
import { hyp } from './noise.js';

// The touch mute button (#mute, top right; shown on touch devices only). A short tap toggles
// ctx.audio.setMuted; a 1.2 s hold without moving reveals the debug panel instead, as the
// corner long-press on the canvas does.
let syncMuteButton = () => {};
function wireMuteButton(ctx, audio) {
  const btn = typeof document !== 'undefined' && document.getElementById('mute');
  if (!btn) return;
  syncMuteButton = () => {
    btn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
    btn.setAttribute('aria-label', audio.muted ? 'unmute sound' : 'mute sound');
  };
  syncMuteButton();
  let id = null, sx = 0, sy = 0, timer = 0, armed = false;
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (id !== null) return;
    const t = e.changedTouches[0];
    id = t.identifier; sx = t.clientX; sy = t.clientY; armed = true;
    btn.classList.add('held');
    clearTimeout(timer);
    timer = setTimeout(() => { if (armed) { armed = false; ctx.debug?.reveal(); } }, 1200);
  }, { passive: false });
  btn.addEventListener('touchmove', (e) => {
    e.preventDefault(); e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === id && Math.hypot(t.clientX - sx, t.clientY - sy) > 14) { armed = false; clearTimeout(timer); }
    }
  }, { passive: false });
  const end = (e) => {
    e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier !== id) continue;
      clearTimeout(timer);
      if (armed && e.type === 'touchend') audio.setMuted(!audio.muted);
      armed = false; id = null; btn.classList.remove('held');
    }
  };
  btn.addEventListener('touchend', end); btn.addEventListener('touchcancel', end);
  btn.addEventListener('click', () => audio.setMuted(!audio.muted)); // assistive tech; touch taps preventDefault the click
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export async function build(ctx) {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  const audio = ctx.audio = { ctx: null, master: null, analyser: null, started: false, cue: () => {}, muted: false, mute: null, setMuted };
  // Mute: a gain after the limiter, ramped rather than suspending the context (other code reads
  // ac.currentTime, which suspend freezes). Remembered in localStorage; settable before start().
  try { audio.muted = localStorage.getItem('fp-muted') === '1'; } catch (e) { /* private mode */ }
  function setMuted(on) {
    audio.muted = !!on;
    try { localStorage.setItem('fp-muted', audio.muted ? '1' : '0'); } catch (e) { /* private mode */ }
    const g = audio.mute && audio.mute.gain;
    if (g) {
      const t = audio.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(audio.muted ? 0 : 1, t + 0.15);
    }
    syncMuteButton();
  }
  wireMuteButton(ctx, audio);
  if (!AC) { ctx.log('audio: no AudioContext, silent'); return; }
  ctx.events.addEventListener('begin', () => {
    if (audio.started) return;
    audio.started = true;
    try { start(); } catch (e) { console.error('[fp] audio failed to start:', e); audio.cue = () => {}; }
  });

  function start() {
    const ac = new AC();
    audio.ctx = ac;
    ac.resume?.();
    const rng = ctx.makeRng(909);
    const { terrain, landmarks, player, camera } = ctx;
    const now0 = ac.currentTime;
    // how far ahead one-shots are scheduled: a little more than the audio clock's staleness as JS sees it
    // (offset of performance.now() against ac.currentTime above its best), so a short envelope never lands in
    // the past on a starved machine
    let lead = 0.03, offMin = Infinity, staleMax = 0;

    // ---- master chain: master -> limiter -> out, with a tap for tests
    const master = ac.createGain(); master.gain.value = 0;
    master.gain.setValueAtTime(0, now0);
    master.gain.linearRampToValueAtTime(0.25, now0 + 4); // about -12 dB
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 8; limiter.attack.value = 0.005; limiter.release.value = 0.3;
    const analyser = ac.createAnalyser(); analyser.fftSize = 2048;
    const mute = ac.createGain(); mute.gain.value = audio.muted ? 0 : 1;
    master.connect(limiter); limiter.connect(mute); mute.connect(ac.destination); master.connect(analyser);
    audio.master = master; audio.analyser = analyser; audio.mute = mute;

    // ---- reverb send
    const verb = ac.createConvolver(); verb.buffer = makeImpulse(ac, 3.2, 3.2, rng);
    const verbIn = ac.createGain(); verbIn.gain.value = 1;
    const verbOut = ac.createGain(); verbOut.gain.value = 0.55;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);

    // ---- noise sources
    const brown = makeNoiseBuffer(ac, 7, 'brown', rng), pink = makeNoiseBuffer(ac, 5, 'pink', rng), white = makeNoiseBuffer(ac, 3, 'white', rng);
    const loopSrc = (buf, off) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off * buf.duration); return s; };
    const burst = (buf, dur, off = rng()) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(ac.currentTime + lead, off * (buf.duration - dur - 0.1), dur + 0.05); return s; };

    // ---- listener follows the camera
    const L = ac.listener, fwd = { x: 0, y: 0, z: -1 };
    const dirV = camera.getWorldDirection.bind(camera);
    const _d = camera.position.clone();
    function setListener() {
      dirV(_d);
      const p = camera.position;
      if (L.positionX) {
        L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
        L.forwardX.value = _d.x; L.forwardY.value = _d.y; L.forwardZ.value = _d.z;
        L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
      } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(_d.x, _d.y, _d.z, 0, 1, 0); }
    }

    const panner = (model, ref, roll, maxD = 600) => {
      const p = ac.createPanner(); p.panningModel = model; p.distanceModel = 'inverse';
      p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = maxD;
      return p;
    };
    const setPos = (p, x, y, z) => { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); };
    // a one-shot's reverb send leaves from its voice gate, so a stolen voice falls silent in the reverb too
    const send = (node, amt) => { const g = ac.createGain(); g.gain.value = amt; (node._v ? node._v.gate : node).connect(g); g.connect(verbIn); return g; };

    // ================================================================ wind
    // Austin found the first mix over the top: the bus now sits at 0.55 (was 1), the hiss layer is quieter, gusts
    // swing less and the filters sweep less, so it reads as weather rather than a gale. ?wind=0.3 scales it for tuning.
    const windMul = (() => { try { const v = Number(new URL(location.href).searchParams.get('wind')); return v > 0 ? v : 1; } catch (e) { return 1; } })();
    const WIND_BUS = 0.55 * windMul;
    const windBus = ac.createGain(); windBus.gain.value = 0; windBus.connect(master); send(windBus, 0.12);
    const windLayers = [];
    [[260, 0.9, 1.0], [640, 1.3, 0.6], [1500, 1.8, 0.18]].forEach(([f, q, lvl], i) => {
      const g = ac.createGain(); g.gain.value = 0; g.connect(windBus);
      const filters = [];
      for (const side of [-1, 1]) {
        const src = loopSrc(i === 0 ? brown : pink, rng());
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
        const pan = ac.createStereoPanner(); pan.pan.value = side * (0.55 + 0.15 * i);
        src.connect(bp); bp.connect(pan); pan.connect(g); filters.push(bp);
      }
      windLayers.push({ g, filters, f, lvl, ph: rng() * 100 });
    });

    // ================================================================ drone
    const droneBus = ac.createGain(); droneBus.gain.value = 0; 
    const droneLP = ac.createBiquadFilter(); droneLP.type = 'lowpass'; droneLP.frequency.value = 420;
    droneBus.connect(droneLP); droneLP.connect(master); send(droneLP, 0.2);
    const droneOsc = [];
    [['sine', 41.2, 0.5], ['triangle', 55.1, 0.3], ['sine', 48.6, 0.35], ['triangle', 82.9, 0.08]].forEach(([type, f, g], i) => {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f; const gn = ac.createGain(); gn.gain.value = g;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.04 + i * 0.023; const lg = ac.createGain(); lg.gain.value = 0.15 + i * 0.04; lfo.connect(lg); lg.connect(o.frequency); lfo.start();
      o.connect(gn); gn.connect(droneBus); o.start(); droneOsc.push(o);
    });
    const shim = ac.createGain(); shim.gain.value = 0.0; shim.connect(master); send(shim, 0.5);
    const shimOsc = [];
    [1822, 2417, 3105].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const t = ac.createGain(); t.gain.value = 0.3;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.07 + 0.05 * i; const lg = ac.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(t.gain); lfo.start();
      o.connect(t); t.connect(shim); o.start(); shimOsc.push(o);
    });

    // ================================================================ footsteps
    const dryBus = ac.createGain(); dryBus.gain.value = 1; dryBus.connect(master);
    function env(g, t0, peak, att, dec) {
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + att + dec);
    }
    function stepSound(hurrying) {
      const p = player.pos;
      const ground = p.y - 1.72;
      const b = terrain.biomeAt(p.x, p.z);
      const c = landmarks.castle, ct = landmarks.court;
      const nearCastle = Math.hypot(p.x - c.x, p.z - c.z) < 40 && ground < 20;
      const inCourt = Math.hypot(p.x - ct.x, p.z - ct.z) < 34;
      const t0 = ac.currentTime + lead;
      const vol = (hurrying ? 1.35 : 1) * (0.8 + rng() * 0.4);
      const pitch = 0.85 + rng() * 0.35;
      const out = ac.createGain(); out.gain.value = 1;
      let kind = 'grass';
      if (player.wading > 0.05) kind = 'splash';
      else if (b.ice > 0.35 || (b.crystal > 0.55 && b.h > 0 && terrain.glacierMask(p.x, p.z) > 0.2)) kind = 'crunch';
      else if (terrain.causewayDistance(p.x, p.z) < 2.5 || nearCastle || inCourt) kind = 'click';
      else if (b.marsh > 0.5) kind = 'squelch';
      if (kind !== 'splash' && regionSnd?.step(p.x, p.z, t0, vol, pitch, out)) { out.connect(dryBus); setTimeout(() => out.disconnect(), 1200); return; } // v4 regions
      if (kind === 'grass') {
        const s = burst(pink, 0.22), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520 * pitch; f.Q.value = 0.6;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500 * pitch;
        const g = ac.createGain(); env(g, t0, 0.2 * vol, 0.02, 0.16);
        s.connect(f); f.connect(lp); lp.connect(g); g.connect(out);
      } else if (kind === 'click') {
        const s = burst(white, 0.06), hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2300 * pitch; hp.Q.value = 2.2;
        const g = ac.createGain(); env(g, t0, 0.22 * vol, 0.002, 0.045);
        s.connect(hp); hp.connect(g); g.connect(out);
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(190 * pitch, t0); o.frequency.exponentialRampToValueAtTime(90, t0 + 0.05);
        const og = ac.createGain(); env(og, t0, 0.14 * vol, 0.002, 0.06); o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + 0.12);
        if (nearCastle || inCourt) send(out, 0.35);
      } else if (kind === 'splash' || kind === 'squelch') {
        const dur = kind === 'splash' ? 0.5 : 0.25;
        const s = burst(pink, dur), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
        f.frequency.setValueAtTime((kind === 'splash' ? 450 : 260) * pitch, t0); f.frequency.exponentialRampToValueAtTime((kind === 'splash' ? 1700 : 600) * pitch, t0 + dur * 0.8);
        const g = ac.createGain(); env(g, t0, 0.26 * vol, 0.04, dur * 0.8);
        s.connect(f); f.connect(g); g.connect(out);
        if (kind === 'splash') for (let k = 0; k < 3; k++) {
          const o = ac.createOscillator(); const tt = t0 + 0.08 + rng() * 0.3; o.frequency.setValueAtTime((700 + rng() * 900) * pitch, tt); o.frequency.exponentialRampToValueAtTime(1800, tt + 0.05);
          const og = ac.createGain(); env(og, tt, 0.04 * vol, 0.004, 0.06); o.connect(og); og.connect(out); o.start(tt); o.stop(tt + 0.1);
        }
        send(out, 0.2);
      } else { // crunch
        for (let k = 0; k < 4; k++) {
          const tt = t0 + k * (0.012 + rng() * 0.018);
          const s = ac.createBufferSource(); s.buffer = white; s.start(tt, rng() * 2, 0.05);
          const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = (2200 + rng() * 1800) * pitch;
          const g = ac.createGain(); env(g, tt, 0.1 * vol, 0.001, 0.03 + rng() * 0.02);
          s.connect(hp); hp.connect(g); g.connect(out);
        }
        send(out, 0.25);
      }
      out.connect(dryBus);
      setTimeout(() => out.disconnect(), 1200);
    }
    const prevStep = player.onStep;
    player.onStep = (hurrying) => { try { stepSound(hurrying); } catch (e) { /* never break the frame loop */ } prevStep?.(hurrying); };

    // ================================================================ place sounds
    // tarn lapping
    const lapBus = ac.createGain(); lapBus.gain.value = 0;
    const lapPan = panner('equalpower', 8, 1.2);
    const lapSrc = loopSrc(brown, rng()), lapLP = ac.createBiquadFilter(); lapLP.type = 'bandpass'; lapLP.frequency.value = 380; lapLP.Q.value = 0.7;
    const lapSrc2 = loopSrc(pink, rng()), lapHP = ac.createBiquadFilter(); lapHP.type = 'bandpass'; lapHP.frequency.value = 1100; lapHP.Q.value = 1.2;
    const lapHg = ac.createGain(); lapHg.gain.value = 0.25;
    lapSrc.connect(lapLP); lapLP.connect(lapBus); lapSrc2.connect(lapHP); lapHP.connect(lapHg); lapHg.connect(lapBus);
    lapBus.connect(lapPan); lapPan.connect(master); send(lapPan, 0.1);

    // lattice hum: sine partials, slightly apart so they shimmer
    const humBus = ac.createGain(); humBus.gain.value = 0;
    const humPan = panner('HRTF', 30, 0.9);
    const L0 = landmarks.moraine;
    setPos(humPan, L0.x, terrain.heightAt(L0.x, L0.z) + 12, L0.z);
    [[392, 1], [393.1, 0.8], [588.4, 0.6], [783.2, 0.45], [1177.6, 0.3], [1569, 0.18], [1571.4, 0.15]].forEach(([f, a], i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = a * 0.1;
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.11 + 0.07 * i; const lg = ac.createGain(); lg.gain.value = a * 0.07; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      o.connect(g); g.connect(humBus); o.start();
    });
    humBus.connect(humPan); humPan.connect(master); send(humPan, 0.4);

    // Cardinal Stones: a low bell on each, struck as you come near
    const S = landmarks.stones, H = 7;
    const stones = [
      { name: 'pride', f: 73.42, x: S.x + H, z: S.z - H }, { name: 'sloth', f: 87.31, x: S.x + H, z: S.z + H },
      { name: 'avarice', f: 110.0, x: S.x - H, z: S.z + H }, { name: 'spite', f: 130.81, x: S.x - H, z: S.z - H },
    ];
    for (const s of stones) { s.armed = true; s.cool = 0; s.pan = panner('HRTF', 8, 0.8); setPos(s.pan, s.x, terrain.heightAt(s.x, s.z) + 1.6, s.z); s.pan.connect(master); send(s.pan, 0.55); }
    const bellPartials = [[1, 1, 9], [2.0, 0.55, 7], [2.41, 0.4, 6], [3.0, 0.3, 5], [4.2, 0.18, 3.5], [5.43, 0.1, 2.5]];
    function strike(s, soft = 1) {
      const t0 = ac.currentTime + lead;
      for (const [r, a, d] of bellPartials) {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = s.f * r * (1 + (rng() - 0.5) * 0.002);
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.2 * a * soft, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g); g.connect(s.pan); o.start(t0); o.stop(t0 + d + 0.1);
      }
    }

    // fen bubbles
    const bubPan = panner('equalpower', 6, 1.3);
    const bubG = ac.createGain(); bubG.gain.value = 1; bubPan.connect(bubG); bubG.connect(master); send(bubG, 0.2);
    let bubT = 0;
    function bubble() {
      const t0 = ac.currentTime + lead, f = 180 + rng() * 380;
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * (1.8 + rng()), t0 + 0.07);
      const g = ac.createGain(); env(g, t0, 0.07 * (0.5 + rng()), 0.004, 0.08);
      o.connect(g); g.connect(bubPan); o.start(t0); o.stop(t0 + 0.14);
    }

    // ================================================================ calls (one-shots)
    // one-shots share a bus with its own analyser tap, so tests can hear a cue apart from the wind and drone
    const cueBus = ac.createGain(); cueBus.connect(master);
    const cueAnalyser = ac.createAnalyser(); cueAnalyser.fftSize = 2048; cueBus.connect(cueAnalyser);
    audio.cueAnalyser = cueAnalyser;

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
      const v = { in: ac.createGain(), gate: ac.createGain(), srcs: [], until: 0, done: false, d, t0: ac.currentTime + lead, pan: null };
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
    // so the cap counts it, and later(p, sec) below sets when it ends
    function oneShotPanner(position, ref = 10, roll = 1) {
      const p = panner('equalpower', ref, roll); setPos(p, position.x, position.y, position.z);
      const v = { in: p, gate: ac.createGain(), srcs: NO_SRCS, until: ac.currentTime + 6, done: false };
      p.connect(v.gate); v.gate.connect(cueBus); p._v = v; admit(v);
      return p;
    }
    function cry(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(pos, 50, 1.1);
      send(p, 0.9);
      const n = 1 + ((rng() * 2) | 0);
      let at = t0;
      for (let k = 0; k < n; k++) {
        const dur = 0.6 + rng() * 0.7, f0 = 700 + rng() * 500;
        const o = ac.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + rng() * 0.6), at + dur * 0.35); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + dur);
        const vib = ac.createOscillator(); vib.frequency.value = 22 + rng() * 14; const vg = ac.createGain(); vg.gain.value = 40; vib.connect(vg); vg.connect(o.frequency);
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.6;
        const g = ac.createGain(); env(g, at, 0.09, 0.1, dur);
        o.connect(bp); bp.connect(g); g.connect(p);
        const ns = burst(pink, dur), nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 1.0;
        const ng = ac.createGain(); env(ng, at, 0.05, 0.1, dur); ns.connect(nf); nf.connect(ng); ng.connect(p);
        o.start(at); vib.start(at); o.stop(at + dur + 0.1); vib.stop(at + dur + 0.1);
        at += dur * 0.7 + 0.1 + rng() * 0.2;
      }
      later(p, at - t0 + 4);
    }
    function crows(pos) {
      const c = landmarks.castle;
      const pp = pos || { x: 65, y: 34, z: 30 };
      const p = oneShotPanner(pp, 12, 1); send(p, 0.5);
      let at = ac.currentTime + lead;
      const n = 5 + ((rng() * 4) | 0);
      for (let k = 0; k < n; k++) {
        const f0 = 380 + rng() * 220, dur = 0.16 + rng() * 0.12;
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 1.25, at); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, at + dur);
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + rng() * 300; bp.Q.value = 2;
        const g = ac.createGain(); env(g, at, 0.13, 0.015, dur);
        o.connect(bp); bp.connect(g); g.connect(p); o.start(at); o.stop(at + dur + 0.05);
        const ns = burst(white, dur), nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1500; nf.Q.value = 1;
        const ng = ac.createGain(); env(ng, at, 0.04, 0.01, dur); ns.connect(nf); nf.connect(ng); ng.connect(p);
        at += 0.12 + rng() * 0.3;
      }
      // wing-clatter as they leave
      const w = burst(white, 1.4), wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.8;
      const wg = ac.createGain(); env(wg, ac.currentTime + lead, 0.08, 0.2, 1.1); w.connect(wf); wf.connect(wg); wg.connect(p);
      later(p, at - ac.currentTime + 5);
    }
    function plop(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(pos, 6, 1.2); send(p, 0.35);
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(820, t0); o.frequency.exponentialRampToValueAtTime(190, t0 + 0.11);
      const g = ac.createGain(); env(g, t0, 0.13, 0.004, 0.13); o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + 0.2);
      const s = burst(pink, 0.1), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const ng = ac.createGain(); env(ng, t0, 0.04, 0.002, 0.08);
      s.connect(f); f.connect(ng); ng.connect(p);
      later(p, 3);
    }
    // ---- sky and uncanny cues: all quiet, all placed where they happen
    const later = (p, sec) => {
      const v = p._v;
      if (!v) { setTimeout(() => p.disconnect(), sec * 1000); return; }
      v.until = ac.currentTime + sec; setTimeout(() => retire(v), sec * 1000);
    };
    const near = (pos, d = 4) => pos || { x: camera.position.x + d, y: camera.position.y, z: camera.position.z };
    // a short band of noise: the stuff of clicks, ticks and sloshes
    const burstAt = (buf, at, dur) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(at, rng() * (buf.duration - dur - 0.1), dur + 0.05); return s; };
    function nTick(out, at, f, q, peak, dec, buf = white) {
      const s = burstAt(buf, at, dec + 0.02), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = ac.createGain(); env(g, at, peak, 0.001, dec); s.connect(bp); bp.connect(g); g.connect(out);
    }
    // a fireball's report, arriving late: a long low roll that grumbles away
    function rumble(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(pos || { x: camera.position.x + 200, y: 80, z: camera.position.z }, 120, 1); send(p, 0.7);
      const s = burst(brown, 6), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, t0); lp.frequency.exponentialRampToValueAtTime(70, t0 + 5.5);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.35);
      for (let k = 1; k < 7; k++) g.gain.linearRampToValueAtTime(0.5 * (1 - k / 7) * (0.55 + 0.45 * rng()), t0 + 0.35 + k * 0.75);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 6);
      s.connect(lp); lp.connect(g); g.connect(p); later(p, 9);
    }
    // the four-winged flier, very far: one long falling call, half of it reverb
    function farcry(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(pos || { x: camera.position.x - 200, y: 120, z: camera.position.z - 200 }, 90, 1); send(p, 1.3);
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(520, t0); o.frequency.linearRampToValueAtTime(610, t0 + 0.5); o.frequency.exponentialRampToValueAtTime(260, t0 + 2.4);
      const v = ac.createOscillator(); v.frequency.value = 6.5; const vg = ac.createGain(); vg.gain.value = 9; v.connect(vg); vg.connect(o.frequency);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.9;
      const g = ac.createGain(); env(g, t0, 0.07, 0.35, 2.1);
      o.connect(bp); bp.connect(g); g.connect(p); o.start(t0); v.start(t0); o.stop(t0 + 2.6); v.stop(t0 + 2.6); later(p, 7);
    }
    // the iron worm flexing in the sky: an iron groan, slow-beating partials and a grinding edge
    function skycreak(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(pos || { x: camera.position.x, y: 200, z: camera.position.z - 250 }, 90, 1); send(p, 1.0);
      const dur = 2.2 + rng() * 1.2, f0 = 48 + rng() * 20;
      for (const [r, a] of [[1, 1], [2.03, 0.5], [3.11, 0.3]]) {
        const o = ac.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * r, t0); o.frequency.linearRampToValueAtTime(f0 * r * 1.12, t0 + dur * 0.6); o.frequency.linearRampToValueAtTime(f0 * r * 0.94, t0 + dur);
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 340 * r; bp.Q.value = 6;
        const g = ac.createGain(); env(g, t0, 0.09 * a, 0.4, dur);
        o.connect(bp); bp.connect(g); g.connect(p); o.start(t0); o.stop(t0 + dur + 0.6);
      }
      // stick-slip grinding: ticks clustered in bursts
      for (let k = 0, at = t0 + 0.2; at < t0 + dur; k++) { nTick(p, at, 700 + rng() * 500, 4, 0.05, 0.03); at += 0.02 + rng() * rng() * 0.25; }
      later(p, dur + 6);
    }
    // a cloak of eyes closing all at once: many wet lid-clicks in a crowded rush; opening is slower and stickier
    function lids(pos, opening) {
      const p = oneShotPanner(near(pos), 3, 1.4); send(p, 0.25);
      const n = opening ? 46 : 60, span = opening ? 0.9 : 0.32;
      const t0 = ac.currentTime + lead;
      for (let k = 0; k < n; k++) {
        const at = t0 + Math.pow(rng(), opening ? 1.0 : 1.6) * span;
        nTick(p, at, 1500 + rng() * 2200, 3 + rng() * 4, 0.035 + rng() * 0.03, 0.012 + rng() * 0.02);
        // the wet part: a tiny falling pop under each click
        const o = ac.createOscillator(); o.type = 'sine'; const f = 600 + rng() * 700;
        o.frequency.setValueAtTime(opening ? f * 0.7 : f, at); o.frequency.exponentialRampToValueAtTime(opening ? f : f * 0.55, at + 0.025);
        const g = ac.createGain(); env(g, at, 0.02, 0.002, 0.03); o.connect(g); g.connect(p); o.start(at); o.stop(at + 0.05);
      }
      later(p, span + 3);
    }
    // the slinker noticed: a dry rattle of many fingertips on stone, close and unreverberant
    function rattle(pos, leaving) {
      const p = oneShotPanner(near(pos), 4, 1.3); send(p, leaving ? 0.12 : 0.05);
      const t0 = ac.currentTime + lead, span = leaving ? 1.4 : 0.6;
      let at = t0;
      while (at < t0 + span) {
        const fade = leaving ? 1 - (at - t0) / span : 1 - 0.4 * (at - t0) / span;
        nTick(p, at, 2600 + rng() * 2400, 6 + rng() * 6, 0.13 * fade + 0.01, 0.006 + rng() * 0.006);
        at += (leaving ? 0.025 + (at - t0) * 0.08 : 0.008) + rng() * 0.022;
      }
      later(p, span + 2);
    }
    // the traveller lifts his hand: a small cracked bell on the wagon, and a warm two-note hum
    function greet(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(near(pos, 6), 6, 1.1); send(p, 0.4);
      [[880, 0.025, 1.6], [1318.5, 0.015, 1.2], [2213, 0.006, 0.7]].forEach(([f, a, d], i) => {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + (rng() - 0.5) * 0.004);
        const g = ac.createGain(); env(g, t0 + i * 0.004, a, 0.004, d); o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + d + 0.2);
      });
      [[146.8, 0.35], [196, 0.75]].forEach(([f, at]) => {
        const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t0 + at); o.frequency.linearRampToValueAtTime(f, t0 + at + 0.12);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 2;
        const g = ac.createGain(); env(g, t0 + at, 0.025, 0.06, 0.45); o.connect(lp); lp.connect(g); g.connect(p); o.start(t0 + at); o.stop(t0 + at + 0.6);
      });
      later(p, 4);
    }
    // the woman in the tarn: a wordless low hum through closed lips, drifting between two notes
    function tarnHum(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(pos || { x: -90, y: -3, z: 72 }, 10, 1.1); send(p, 0.8);
      const dur = 4.5 + rng() * 2, f0 = 196 * (rng() < 0.5 ? 1 : 0.89);
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * 1.122, t0 + dur * 0.4); o.frequency.linearRampToValueAtTime(f0 * 0.944, t0 + dur);
      const v = ac.createOscillator(); v.frequency.value = 4.8; const vg = ac.createGain(); vg.gain.value = 1.6; v.connect(vg); vg.connect(o.frequency);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 1.0); g.gain.linearRampToValueAtTime(0.035, t0 + dur - 1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      for (const [f, q, a] of [[260, 5, 1], [1100, 8, 0.25]]) { // nasal "mm" formants
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const ag = ac.createGain(); ag.gain.value = a;
        o.connect(bp); bp.connect(ag); ag.connect(lp);
      }
      lp.connect(g); g.connect(p); o.start(t0); v.start(t0); o.stop(t0 + dur + 0.1); v.stop(t0 + dur + 0.1);
      later(p, dur + 5);
    }
    // she has moved: one soft slosh of water round a body
    function slosh(pos) {
      const t0 = ac.currentTime + lead, p = oneShotPanner(pos || { x: -90, y: -4.6, z: 80 }, 6, 1.2); send(p, 0.4);
      const s = burst(pink, 0.8), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(900, t0); bp.frequency.exponentialRampToValueAtTime(260, t0 + 0.6);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.11, t0 + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
      s.connect(bp); bp.connect(g); g.connect(p);
      for (let k = 0; k < 4; k++) nTick(p, t0 + 0.25 + rng() * 0.4, 1800 + rng() * 1500, 5, 0.012, 0.03, pink); // drips
      later(p, 3);
    }

    // ================================================================ v2 cues: ruins, flora, river, sky, inhabitants, life
    // ---- the Carillon Flags: nine worn bronze caps. A just minor pentatonic (so a running player makes a peal,
    // not a cluster) on D3, each cap a little out of true; partials after a church bell's (hum, prime, tierce,
    // quint, nominal and the inharmonic upper ones), the prime doubled a hair sharp so it beats as it dies.
    const NOTE_RATIO = [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5, 2, 12 / 5, 8 / 3, 3];
    const NOTE_TRUE = NOTE_RATIO.map(() => 1 + (rng() - 0.5) * 0.014);
    const BELL = [[0.5, 0.55, 3.6], [1, 1, 3.0], [1.0042, 0.4, 2.7], [1.183, 0.42, 2.2], [1.506, 0.28, 1.8], [2.0, 0.32, 1.5], [2.74, 0.14, 1.0], [3.01, 0.1, 0.8], [4.17, 0.06, 0.5]];
    function carillon(pos, o) {
      const k = clamp((o?.note ?? 0) | 0, 0, 8), soft = o?.quiet ? 1 / 3 : 1;
      const v = voice(pos, { ref: 4, roll: 1, range: 260, verb: 0.4, dur: 4.4, air: 140 });
      if (!v) return;
      const t0 = v.t0, f = 146.83 * NOTE_RATIO[k] * NOTE_TRUE[k], amp = 0.065 * soft * (1 - k * 0.035), life = 1.15 - k * 0.04;
      for (const [r, a, d] of BELL) {
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(amp * a, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d * life);
        chain(vOsc(v, 'sine', f * r * (1 + (rng() - 0.5) * 0.003), t0, t0 + d * life + 0.05), g, v.in);
      }
      grain(v, v.in, t0, 700 + k * 110, 1.3, 0.06 * soft, 0.035, pink); // the foot on the cap: metal seating in stone
    }
    // ---- the Hypogeum lintel: one glyph sinks (the grind falls), a breath, the next rises (it climbs), then
    // grit runs off the stone. Stick-slip: the gain catches and gives in uneven steps.
    function glyphShift(pos) {
      const v = voice(pos, { model: 'linear', ref: 2, roll: 1, range: 15, verb: 0.35, dur: 2.1 });
      if (!v) return;
      const t0 = v.t0;
      for (const [at, len, f0, f1] of [[0, 0.56, 260, 120], [0.66, 0.54, 120, 240]]) {
        const a = t0 + at, bp = filt('bandpass', f0, 1.6), g = ac.createGain();
        bp.frequency.setValueAtTime(f0, a); bp.frequency.exponentialRampToValueAtTime(f1, a + len);
        g.gain.setValueAtTime(0.0001, a); g.gain.linearRampToValueAtTime(0.24, a + 0.05);
        for (let tt = a + 0.09; tt < a + len - 0.06; tt += 0.035 + rng() * 0.05) g.gain.linearRampToValueAtTime(0.08 + 0.16 * rng(), tt);
        g.gain.exponentialRampToValueAtTime(0.0001, a + len + 0.08);
        chain(vNoise(v, brown, a, len + 0.1), bp, g, v.in);
        const eg = ac.createGain(); swell(eg, a, 0.01, 0.05, a + len + 0.05); // the harder edge of it
        chain(vNoise(v, white, a, len + 0.1), filt('bandpass', 1300 + rng() * 400, 1.2), eg, v.in);
      }
      for (let at = t0 + 1.12; at < t0 + 1.9;) { const k = (at - t0 - 1.12) / 0.78; grain(v, v.in, at, 2200 + rng() * 2800, 3, 0.012 * (1 - k) + 0.002, 0.01 + rng() * 0.01); at += 0.02 + rng() * rng() * 0.12; }
    }
    // ---- the Heliotrope Sward: a thousand heads turning shut, or open. A dry bed of high noise and a crowd of
    // petal-grains whose density follows the swell, with the panner sliding across the sward so it comes as a wave.
    function rustle(centre, o) {
      const v = voice(centre, { ref: 14, roll: 1, range: 240, verb: 0.15, dur: o.dur + 0.4, air: 160 });
      if (!v) return;
      const t0 = v.t0, D = o.dur, a = rng() * 6.283, span = 14, cx = Math.cos(a) * span, cz = Math.sin(a) * span;
      if (v.pan.positionX) {
        v.pan.positionX.setValueAtTime(centre.x - cx, t0); v.pan.positionX.linearRampToValueAtTime(centre.x + cx, t0 + D);
        v.pan.positionZ.setValueAtTime(centre.z - cz, t0); v.pan.positionZ.linearRampToValueAtTime(centre.z + cz, t0 + D);
      }
      const bed = ac.createGain(); swell(bed, t0, o.gain * 0.5, D * o.peakAt, t0 + D);
      chain(vNoise(v, pink, t0, D), filt('highpass', o.band * 0.45), filt('bandpass', o.band, 0.6), bed, v.in);
      for (let k = 0; k < o.n; k++) {
        const u = (rng() + rng() + rng()) / 3, at = t0 + D * (u < 0.5 ? u * 2 * o.peakAt : o.peakAt + (u - 0.5) * 2 * (1 - o.peakAt)) * 0.95;
        grain(v, v.in, at, o.band * (0.6 + rng() * 1.1), 2 + rng() * 2, o.gain * (0.25 + 0.5 * rng()), 0.008 + rng() * 0.018);
      }
    }
    // one turned flower: a breathy little falling sigh, pitched, a hair of vibrato, nothing past 5 m
    function whimper(pos) {
      const v = voice(pos, { model: 'linear', ref: 0.6, roll: 1, range: 5, verb: 0.05, dur: 0.9 });
      if (!v) return;
      const t0 = v.t0, D = 0.3 + rng() * 0.3, f = 620 + rng() * 140;
      const o = vOsc(v, 'triangle', f, t0, t0 + D + 0.05);
      o.frequency.setValueAtTime(f * 1.03, t0); o.frequency.linearRampToValueAtTime(f * 1.07, t0 + D * 0.25); o.frequency.exponentialRampToValueAtTime(f * 0.78, t0 + D);
      const vib = vOsc(v, 'sine', 6 + rng() * 2, t0, t0 + D + 0.05); chain(vib, gainOf(f * 0.012), o.frequency);
      const tg = ac.createGain(); swell(tg, t0, 0.012, D * 0.3, t0 + D); chain(o, filt('lowpass', 1500), tg, v.in);
      const bg = ac.createGain(); swell(bg, t0, 0.03, D * 0.2, t0 + D); chain(vNoise(v, pink, t0, D), filt('bandpass', f * 2.2, 2.5), bg, v.in);
    }
    // ---- the Salt-Pedlars: a papery wing-whirr chopped at the wingbeat, its rate and pitch sliding down as it
    // passes, a low body hum, and the rider's salt goad: one tiny tink.
    function pedlarPass(pos) {
      const v = voice(pos, { ref: 2, roll: 1.4, range: 30, verb: 0.08, dur: 0.9 });
      if (!v) return;
      const t0 = v.t0, D = 0.4, up = 1.09, dn = 0.9;
      const bp = filt('bandpass', 1100 * up, 0.9); bp.frequency.setValueAtTime(1100 * up, t0); bp.frequency.exponentialRampToValueAtTime(1100 * dn, t0 + D);
      const chop = gainOf(0.5), am = vOsc(v, 'square', 38 * up, t0, t0 + D + 0.05);
      am.frequency.setValueAtTime(38 * up, t0); am.frequency.exponentialRampToValueAtTime(38 * dn, t0 + D); chain(am, gainOf(0.5), chop.gain);
      const eg = ac.createGain(); swell(eg, t0, 0.13, D * 0.45, t0 + D);
      chain(vNoise(v, pink, t0, D), bp, chop, eg, v.in);
      const h = vOsc(v, 'sawtooth', 76 * up, t0, t0 + D + 0.05); h.frequency.setValueAtTime(76 * up, t0); h.frequency.exponentialRampToValueAtTime(76 * dn, t0 + D);
      const hg = ac.createGain(); swell(hg, t0, 0.03, D * 0.45, t0 + D); chain(h, filt('lowpass', 420), hg, v.in);
      const tt = t0 + 0.1 + rng() * 0.12, p = tt < t0 + D * 0.45 ? up : dn;
      for (const [f, a, d] of [[3520, 1, 0.3], [5390, 0.4, 0.18], [8030, 0.2, 0.1]]) {
        const g = ac.createGain(); env(g, tt, 0.008 * a, 0.001, d); chain(vOsc(v, 'sine', f * p, tt, tt + d + 0.05), g, v.in);
      }
    }
    // ---- the Wrong Colour: nearly a chord, every interval a little off true, two of them doubled a hair apart
    // so they beat; it sags a fraction as it fades.
    function wrongColour(pos) {
      const v = voice(pos, { ref: 5, roll: 1, range: 60, verb: 0.7, dur: 3.4 });
      if (!v) return;
      const t0 = v.t0, D = 3.0, f = 98, sum = gainOf(1), lp = filt('lowpass', 900);
      for (const [r, a, beat] of [[1, 1, 0.55], [1.287, 0.6, 0], [1.468, 0.5, 1.3], [1.94, 0.3, 0], [2.61, 0.12, 0]]) {
        for (const df of beat ? [0, beat] : [0]) {
          const o = vOsc(v, 'triangle', f * r + df, t0, t0 + D + 0.1);
          o.frequency.setValueAtTime(f * r + df, t0); o.frequency.linearRampToValueAtTime((f * r + df) * 0.992, t0 + D);
          chain(o, gainOf(a * (beat ? 0.6 : 1)), sum);
        }
      }
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.02, t0 + 1.3); g.gain.linearRampToValueAtTime(0.015, t0 + 2.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
      chain(sum, lp, g, v.in);
    }
    // ---- the procession: nine lights, nine faint high whistles entering one by one, drifting apart, under one
    // slow tremolo; most of it reverb. Barely there.
    function procession(pos) {
      const v = voice(pos, { ref: 250, roll: 1, range: 3000, verb: 1.2, dur: 8.6 });
      if (!v) return;
      const t0 = v.t0, D = 6.5 + rng() * 1.5, bus = gainOf(0.65), m = ac.createGain();
      chain(vOsc(v, 'sine', 0.37, t0, t0 + D + 0.1), gainOf(0.35), bus.gain);
      for (let k = 0; k < 9; k++) {
        const f = 2900 * (1 + k * 0.021 + (rng() - 0.5) * 0.006), at = t0 + k * 0.22 + rng() * 0.1;
        const o = vOsc(v, 'sine', f, at, t0 + D + 0.05);
        o.frequency.setValueAtTime(f, at); o.frequency.linearRampToValueAtTime(f * (1 + (k % 2 ? 0.012 : -0.009)), t0 + D);
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.11, at + 1.6); g.gain.linearRampToValueAtTime(0.09, t0 + D - 2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
        chain(o, g, bus);
      }
      const ng = ac.createGain(); swell(ng, t0, 0.04, 2.5, t0 + D); chain(vNoise(v, pink, t0, Math.min(D, 4.8)), filt('bandpass', 3100, 8), ng, bus);
      m.gain.setValueAtTime(0.0001, t0); m.gain.linearRampToValueAtTime(0.02, t0 + 2.5); m.gain.linearRampToValueAtTime(0.018, t0 + D - 2); m.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
      chain(bus, m, v.in);
    }
    // ---- the Wimpled Guest: the player's own heart, centre, no distance. Lub-dub: two falling low sines with
    // a soft click; louder and brighter (the lowpass opens) as the gaze holds.
    function heartbeat(o) {
      const st = clamp(o?.strength ?? 0.5, 0.05, 1);
      const v = voice(null, { centre: true, dur: 0.75 });
      const t0 = v.t0, amp = 0.04 + 0.28 * st, lp = filt('lowpass', 140 + 1100 * Math.pow(st, 1.5), 0.5);
      lp.connect(v.in);
      for (const [at, f0, a] of [[0, 60, 1], [0.26, 66, 0.7]]) {
        const o2 = vOsc(v, 'sine', f0 * 1.2, t0 + at, t0 + at + 0.3);
        o2.frequency.setValueAtTime(f0 * 1.2, t0 + at); o2.frequency.exponentialRampToValueAtTime(f0 * 0.8, t0 + at + 0.11);
        const g = ac.createGain(); env(g, t0 + at, amp * a, 0.006, 0.2); chain(o2, g, lp);
        grain(v, lp, t0 + at, 600, 0.8, amp * a * 0.2, 0.012, pink);
      }
    }
    // ---- the Sable Galley: a deep damped boom, muffled more (and fainter) the farther off you are
    function galleyDrum(pos, o) {
      const cp = camera.position, d = o?.distance ?? Math.hypot(pos.x - cp.x, pos.z - cp.z);
      const v = voice(pos, { ref: 12, roll: 0.9, range: 130, verb: 0.45, dur: 1.2 });
      if (!v) return;
      const t0 = v.t0, far = clamp(d / 120, 0, 1);
      const bus = gainOf(1 - 0.6 * far); bus.connect(v.in);
      drumInto(v, t0, far, bus);
    }
    function drumInto(v, t0, far, out) {
      const lp = filt('lowpass', 110 + 1000 * Math.exp(-far * 4), 0.7); lp.connect(out);
      const body = vOsc(v, 'sine', 64, t0, t0 + 0.7); body.frequency.setValueAtTime(64, t0); body.frequency.exponentialRampToValueAtTime(52, t0 + 0.18);
      const bg = ac.createGain(); env(bg, t0, 0.2, 0.006, 0.55); chain(body, bg, lp);
      const mode = vOsc(v, 'sine', 101, t0, t0 + 0.3); const mg = ac.createGain(); env(mg, t0, 0.06, 0.004, 0.2); chain(mode, mg, lp);
      const sg = ac.createGain(); env(sg, t0, 0.12, 0.003, 0.12); chain(vNoise(v, brown, t0, 0.2), filt('bandpass', 180, 1), sg, lp);
      if (far < 0.5) grain(v, lp, t0, 1500, 1, 0.06 * (1 - 2 * far), 0.04);
    }
    // ---- the Menology's lizards: a few quick dry grains of claw on stone
    function skitter(pos) {
      const v = voice(pos, { model: 'linear', ref: 0.8, roll: 1, range: 6, dur: 0.6 });
      if (!v) return;
      const t0 = v.t0, span = 0.2 + rng() * 0.1;
      for (let at = t0; at < t0 + span;) { const k = (at - t0) / span; grain(v, v.in, at, 3000 + rng() * 3500, 5 + rng() * 5, 0.06 * (1 - 0.6 * k), 0.004 + rng() * 0.005); at += 0.012 + rng() * 0.03; }
      const sg = ac.createGain(); swell(sg, t0, 0.008, 0.03, t0 + span); chain(vNoise(v, pink, t0, span), filt('bandpass', 2000, 1.5), sg, v.in);
    }
    // ---- rooks: each bird its own labouring wingbeat (pink grains, thinning as they climb) and two or three caws
    function caw(v, at) {
      const dur = 0.2 + rng() * 0.1, f0 = 330 + rng() * 90;
      const o = vOsc(v, 'sawtooth', f0 * 1.12, at, at + dur + 0.05);
      o.frequency.setValueAtTime(f0 * 1.12, at); o.frequency.linearRampToValueAtTime(f0, at + dur * 0.3); o.frequency.exponentialRampToValueAtTime(f0 * 0.82, at + dur);
      const rough = gainOf(0.6); chain(vOsc(v, 'square', 60 + rng() * 25, at, at + dur + 0.05), gainOf(0.4), rough.gain);
      const g = ac.createGain(); env(g, at, 0.12, 0.02, dur); g.connect(v.in);
      o.connect(rough);
      chain(rough, filt('bandpass', 1150, 4), g); chain(rough, filt('bandpass', 1800, 5), gainOf(0.5), g);
      const ng = ac.createGain(); env(ng, at, 0.03, 0.02, dur); chain(vNoise(v, white, at, dur), filt('bandpass', 2000, 1), ng, v.in);
    }
    function rooksLift(pos, o) {
      const n = clamp(o?.count ?? 12, 3, 24);
      const v = voice(pos, { ref: 12, roll: 1, range: 260, verb: 0.4, dur: 2.0, air: 200 });
      if (!v) return;
      const t0 = v.t0;
      for (let b = 0; b < n; b++) {
        let at = t0 + rng() * 0.25; const rate = 0.11 + rng() * 0.05, beats = 4 + ((rng() * 4) | 0);
        for (let k = 0; k < beats && at < t0 + 1.4; k++) { grain(v, v.in, at, 500 + rng() * 700, 1.2, 0.07 * (1 - (at - t0) / 1.5), 0.035 + rng() * 0.02, pink); at += rate * (1 + k * 0.08); }
      }
      const nc = 2 + (rng() < 0.5 ? 1 : 0);
      for (let c = 0, at = t0 + 0.1; c < nc; c++) { caw(v, at); at += 0.3 + rng() * 0.2; }
    }
    // ---- the tower's bats: a soft high fluttering rush and a hundred tiny falling chirps, densest early
    function batsOut(pos, o) {
      const v = voice(pos, { ref: 20, roll: 1, range: 160, verb: 0.35, dur: 4.4, air: 90 });
      if (!v) return;
      const t0 = v.t0, D = 3.2 + rng() * 0.6, n = Math.round(clamp(o?.count ?? 34, 10, 60) * 2.8);
      const fl = gainOf(0.6);
      chain(vOsc(v, 'sine', 13, t0, t0 + D), gainOf(0.25), fl.gain); chain(vOsc(v, 'sine', 9.3, t0, t0 + D), gainOf(0.15), fl.gain);
      const rg = ac.createGain(); rg.gain.setValueAtTime(0.0001, t0); rg.gain.linearRampToValueAtTime(0.05, t0 + 0.6); rg.gain.linearRampToValueAtTime(0.04, t0 + D * 0.6); rg.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
      chain(vNoise(v, pink, t0, D), filt('highpass', 2500), filt('bandpass', 5200, 0.7), fl, rg, v.in);
      for (let k = 0; k < n; k++) {
        const at = t0 + Math.pow(rng(), 1.5) * D * 0.9, f = 6500 + rng() * 3500;
        const c = vOsc(v, 'sine', f, at, at + 0.03); c.frequency.setValueAtTime(f, at); c.frequency.exponentialRampToValueAtTime(f * 0.6, at + 0.008);
        const g = ac.createGain(); env(g, at, 0.006 + 0.008 * rng(), 0.001, 0.01); chain(c, g, v.in);
      }
    }
    // ---- the wader, gone: a breath of air and one soft plip, then a smaller drop falling back
    function waderGone(pos) {
      const v = voice(pos, { model: 'linear', ref: 2, roll: 1, range: 20, verb: 0.25, dur: 1.2 });
      if (!v) return;
      const t0 = v.t0;
      const bg = ac.createGain(); env(bg, t0, 0.05, 0.12, 0.7); chain(vNoise(v, pink, t0, 0.85), filt('bandpass', 650, 0.8), bg, v.in);
      for (const [at, f, a] of [[0.06, 900, 0.03], [0.21, 1300, 0.012]]) {
        const p = vOsc(v, 'sine', f, t0 + at, t0 + at + 0.08); p.frequency.setValueAtTime(f, t0 + at); p.frequency.exponentialRampToValueAtTime(f * 2.1, t0 + at + 0.035);
        const g = ac.createGain(); env(g, t0 + at, a, 0.002, 0.05); chain(p, g, v.in);
      }
    }
    // ---- a biomesh runner's tile settling: a tiny glassy tick, two high inharmonic partials and a click.
    // Thinned: at most one every 0.6 s, and none while the last is still sounding.
    let settleNext = 0;
    function biomeshSettle(pos) {
      const now = ac.currentTime;
      if (now < settleNext) return;
      const v = voice(pos, { model: 'linear', ref: 1.5, roll: 1, range: 10, verb: 0.2, dur: 0.16 });
      if (!v) return;
      const t0 = v.t0, f = 3800 + rng() * 1400, D = 0.06 + rng() * 0.06;
      settleNext = t0 + Math.max(0.6, D + 0.05);
      for (const [r, a, d] of [[1, 1, D], [2.76, 0.4, D * 0.6]]) {
        const g = ac.createGain(); env(g, t0, 0.01 * a, 0.001, d); chain(vOsc(v, 'sine', f * r, t0, t0 + d + 0.03), g, v.in);
      }
      grain(v, v.in, t0, 7000, 3, 0.008, 0.006);
    }

    // ---- the Hawser (src/v5/hawser.js): the chain drawn one link toward the court. Three low saws a fifth apart
    // sag in pitch and catch (stick-slip in their gain) as the links drag, under a brown grind; the settle's thud at
    // the end of the jerk; then the iron rings out on a few inharmonic partials. Inverse falloff from a 160 m
    // reference: still a third its level 500 m off, so the whole bowl hears it.
    // the Leerie's standards (v5/lights.js): a lantern catching, a small click and the soft breath of the flame
    function lampTick(pos) { const v = voice(pos, { ref: 6, roll: 1.2, range: 70, verb: 0.35, dur: 0.9, air: 400 }); if (!v) return; grain(v, v.in, v.t0, 3400, 7, 0.16, 0.022); grain(v, v.in, v.t0 + 0.014, 1500, 3, 0.07, 0.05); const g = ac.createGain(); swell(g, v.t0 + 0.03, 0.05, 0.07, v.t0 + 0.75); chain(vNoise(v, pink, v.t0 + 0.03, 0.75), filt('lowpass', 560, 0.7), g, v.in); }
    function hawserGroan(pos) {
      const v = voice(pos, { ref: 160, roll: 1, range: 3000, verb: 1.1, dur: 7.4, air: 700 });
      if (!v) return;
      const t0 = v.t0, lp = filt('lowpass', 700, 0.6); lp.connect(v.in);
      for (const [f, a] of [[38, 0.2], [57, 0.12], [76.5, 0.06]]) {
        const o = vOsc(v, 'sawtooth', f * 1.05, t0, t0 + 4.8);
        o.frequency.setValueAtTime(f * 1.05, t0); o.frequency.exponentialRampToValueAtTime(f * 0.84, t0 + 1.2);
        o.frequency.linearRampToValueAtTime(f * 0.92, t0 + 2.0); o.frequency.exponentialRampToValueAtTime(f * 0.78, t0 + 4.6);
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(a, t0 + 0.2);
        for (let tt = t0 + 0.32; tt < t0 + 3.8; tt += 0.05 + rng() * 0.13) g.gain.linearRampToValueAtTime(a * (0.4 + 0.6 * rng()), tt);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.7);
        chain(o, filt('lowpass', f * 4, 0.9), g, lp);
      }
      const gg = ac.createGain(); swell(gg, t0, 0.22, 0.3, t0 + 3.6);
      const gb = filt('bandpass', 190, 1.1); gb.frequency.setValueAtTime(190, t0); gb.frequency.exponentialRampToValueAtTime(85, t0 + 3.2);
      chain(vNoise(v, brown, t0, 3.6), gb, gg, lp);
      const th = vOsc(v, 'sine', 52, t0 + 0.42, t0 + 1.6), tg = ac.createGain();
      th.frequency.setValueAtTime(52, t0 + 0.42); th.frequency.exponentialRampToValueAtTime(27, t0 + 1.4);
      env(tg, t0 + 0.42, 0.36, 0.01, 1.0); chain(th, tg, v.in);
      for (const [f, a, d] of [[113, 0.05, 5.5], [271, 0.035, 4.2], [489, 0.02, 3.0], [747, 0.012, 2.2]]) {
        const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0 + 0.45); g.gain.linearRampToValueAtTime(a, t0 + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45 + d);
        chain(vOsc(v, 'sine', f * (1 + (rng() - 0.5) * 0.01), t0 + 0.45, t0 + 0.5 + d), g, v.in);
      }
    }

    // ---- the Kept Fire (src/v5/keptfire.js): flames are a hiss of pink noise under sparse dry pops (grains of high
    // bandpassed noise, a few with a wooden knock); the flare is a roar swelling in brown noise with a low whump.
    function keptFire(pos, opts) {
      const flare = !!opts?.flare, k = opts?.strength ?? 1;
      const v = voice(pos, { ref: flare ? 5 : 2.5, roll: 1.1, range: flare ? 130 : 70, dur: flare ? 3.4 : 1.8, verb: 0.2, air: 160 });
      if (!v) return;
      const t0 = v.t0, dur = flare ? 3.0 : 1.5, hg = ac.createGain();
      swell(hg, t0, (flare ? 0.05 : 0.014) * k, flare ? 0.3 : 0.4, t0 + dur);
      chain(vNoise(v, pink, t0, dur), filt('bandpass', 1500, 0.6), hg, v.in);
      if (flare) {
        const rg = ac.createGain(); swell(rg, t0, 0.2, 0.3, t0 + 2.8);
        chain(vNoise(v, brown, t0, 2.8), filt('lowpass', 300, 0.7), rg, v.in);
        const th = vOsc(v, 'sine', 80, t0, t0 + 0.7), tg = ac.createGain(); th.frequency.exponentialRampToValueAtTime(42, t0 + 0.6); env(tg, t0, 0.2, 0.03, 0.55); chain(th, tg, v.in);
      }
      const n = flare ? 46 : 5 + ((rng() * 5) | 0);
      for (let i = 0; i < n; i++) {
        const at = t0 + Math.pow(rng(), flare ? 1.6 : 1) * dur;
        grain(v, v.in, at, 1800 + rng() * 4200, 2 + rng() * 6, (flare ? 0.1 : 0.07) * k * (0.3 + rng() * 0.7), 0.003 + rng() * 0.015);
        if (rng() < 0.25) grain(v, v.in, at, 420 + rng() * 300, 5, 0.06 * k, 0.03);
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

    // v4 regions: each region's sound hook (src/v4/regions/<key>.js), its bed ticked below, its cues in the table
    const regionSnd = ctx.regions?.startSounds({ ac, rng, master, cueBus, verbIn, dryBus, white, pink, brown, voice, vOsc, vNoise, grain, filt, gainOf, chain, env, swell, send, panner, setPos, loopSrc, lead: () => lead, camera, terrain, noise: ctx.noise, sky: ctx.sky, makeRng: ctx.makeRng, hush: (p) => ctx.hush?.level(p.x, p.z) ?? 0 });
    audio.regionCues = regionSnd?.cueNames || [];
    audio.cue = (name, position, opts) => {
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
        else if (name === 'carillon') carillon(position, opts);
        else if (name === 'glyph-shift') glyphShift(position);
        else if (name === 'sward-close') rustle(position, { dur: 1.5, peakAt: 0.4, n: 90, band: 4200, gain: 0.075 });
        else if (name === 'sward-open') rustle(position, { dur: 4, peakAt: 0.5, n: 70, band: 3000, gain: 0.035 });
        else if (name === 'sward-whimper') whimper(position);
        else if (name === 'pedlar-pass') pedlarPass(position);
        else if (name === 'wrong-colour-near') wrongColour(position);
        else if (name === 'fall-rumble-enter') fallCue(position, true);
        else if (name === 'fall-rumble-leave') fallCue(position, false);
        else if (name === 'procession') procession(position);
        else if (name === 'guest-heartbeat') heartbeat(opts);
        else if (name === 'galley-drum') galleyDrum(position, opts);
        else if (name === 'lizard-skitter') skitter(position);
        else if (name === 'rooks-lift') rooksLift(position, opts);
        else if (name === 'bats-out') batsOut(position, opts);
        else if (name === 'wader-gone') waderGone(position);
        else if (name === 'biomesh-settle') biomeshSettle(position);
        else if (name === 'hawser-groan') hawserGroan(position);
        else if (name === 'lamp-tick') lampTick(position);
        else if (name === 'kept-fire') keptFire(position, opts);
        else regionSnd?.cue(name, position, opts);
      } catch (e) { if (audio.debug) throw e; }
    };


    // ================================================================ insects, frogs, distant calls
    const insBus = ac.createGain(); insBus.gain.value = 0; insBus.connect(master); send(insBus, 0.08);
    [[4700, 24, -0.6, 0.5], [6100, 31, 0.6, 0.4], [3600, 17, 0.1, 0.35]].forEach(([f, rate, pan, lvl], i) => {
      const src = loopSrc(white, rng()), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 9;
      const g = ac.createGain(); g.gain.value = 0.5;
      const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rate; const lg = ac.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      const slow = ac.createOscillator(); slow.frequency.value = 0.2 + 0.13 * i; const sg = ac.createGain(); sg.gain.value = 0.0; slow.start();
      const out = ac.createGain(); out.gain.value = lvl * 0.5;
      const gate = ac.createOscillator(); gate.type = 'sine'; gate.frequency.value = 0.35 + 0.17 * i; const gg = ac.createGain(); gg.gain.value = lvl * 0.45; gate.connect(gg); gg.connect(out.gain); gate.start();
      const pn = ac.createStereoPanner(); pn.pan.value = pan;
      src.connect(bp); bp.connect(g); g.connect(out); out.connect(pn); pn.connect(insBus);
    });
    const frogBus = ac.createGain(); frogBus.gain.value = 1; frogBus.connect(master); send(frogBus, 0.3);
    const frogPan = panner('equalpower', 6, 1.2); frogPan.connect(frogBus);
    let frogT = 0;
    function frog() {
      const t0 = ac.currentTime + lead, base = rng() < 0.6 ? 150 + rng() * 80 : 1700 + rng() * 500;
      const pulses = base > 1000 ? 2 : 3 + ((rng() * 3) | 0), gap = base > 1000 ? 0.09 : 0.07;
      for (let k = 0; k < pulses; k++) {
        const tt = t0 + k * gap;
        const o = ac.createOscillator(); o.type = base > 1000 ? 'sine' : 'square'; o.frequency.setValueAtTime(base, tt); o.frequency.exponentialRampToValueAtTime(base * (base > 1000 ? 1.25 : 0.8), tt + 0.05);
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = base * 2; bp.Q.value = 2;
        const g = ac.createGain(); env(g, tt, base > 1000 ? 0.025 : 0.05, 0.005, 0.045);
        o.connect(bp); bp.connect(g); g.connect(frogPan); o.start(tt); o.stop(tt + 0.08);
      }
    }
    let callT = 6 + rng() * 6;
    function distantCall(kind, x, z) {
      const p = panner('equalpower', 40, 1.0); setPos(p, x, camera.position.y + 10, z); p.connect(master); send(p, 0.9);
      let at = ac.currentTime + lead;
      if (kind === 0) { // hoot
        for (let k = 0; k < 2; k++) {
          const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(330, at); o.frequency.exponentialRampToValueAtTime(250, at + 0.7);
          const g = ac.createGain(); env(g, at, 0.1, 0.12, 0.7); o.connect(g); g.connect(p); o.start(at); o.stop(at + 0.9); at += 1.0;
        }
      } else if (kind === 1) { // yelps
        for (let k = 0; k < 3; k++) {
          const f = 800 + rng() * 300; const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 0.55, at + 0.16);
          const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.5;
          const g = ac.createGain(); env(g, at, 0.1, 0.01, 0.15); o.connect(bp); bp.connect(g); g.connect(p); o.start(at); o.stop(at + 0.25); at += 0.22 + rng() * 0.1;
        }
      } else { // a long wavering moan
        const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(180, at); o.frequency.linearRampToValueAtTime(240, at + 1.2); o.frequency.linearRampToValueAtTime(140, at + 2.8);
        const v = ac.createOscillator(); v.frequency.value = 5; const vg = ac.createGain(); vg.gain.value = 8; v.connect(vg); vg.connect(o.frequency);
        const g = ac.createGain(); env(g, at, 0.09, 0.8, 2.2); o.connect(g); g.connect(p); o.start(at); v.start(at); o.stop(at + 3.2); v.stop(at + 3.2); at += 3;
      }
      setTimeout(() => p.disconnect(), (at - ac.currentTime + 5) * 1000);
    }
    function flush(pos) {
      const p = oneShotPanner(pos, 6, 1.1); const t0 = ac.currentTime + lead;
      const s = burst(white, 0.6), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
      const g = ac.createGain(); env(g, t0, 0.14, 0.02, 0.5);
      // a rattle of wingbeats
      const am = ac.createOscillator(); am.frequency.value = 22; const ag = ac.createGain(); ag.gain.value = 0.5; const base = ac.createGain(); base.gain.value = 0.5; am.connect(ag); ag.connect(base.gain);
      s.connect(f); f.connect(base); base.connect(g); g.connect(p); am.start(t0); am.stop(t0 + 0.7);
      for (let k = 0; k < 3; k++) { const o = ac.createOscillator(); o.type = 'sawtooth'; const tt = t0 + 0.1 + k * 0.12 + rng() * 0.06; o.frequency.setValueAtTime(3000, tt); o.frequency.exponentialRampToValueAtTime(2200, tt + 0.05); const og = ac.createGain(); env(og, tt, 0.02, 0.003, 0.05); o.connect(og); og.connect(p); o.start(tt); o.stop(tt + 0.08); }
      later(p, 3);
    }

    // ================================================================ deodand click
    const clickPan = panner('HRTF', 3, 1.4);
    clickPan.connect(master);
    let clickT = 0, clickN = 0;
    function click(vol) {
      const t0 = ac.currentTime + lead, pitch = 1 + clickN * 0.05;
      const s = burst(white, 0.04), hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200 * pitch; hp.Q.value = 4;
      const g = ac.createGain(); env(g, t0, vol, 0.001, 0.025);
      s.connect(hp); hp.connect(g); g.connect(clickPan);
      const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 1500 * pitch; const og = ac.createGain(); env(og, t0, vol * 0.2, 0.001, 0.012); o.connect(og); og.connect(clickPan); o.start(t0); o.stop(t0 + 0.04);
    }

    // ================================================================ per-frame control
    const cam = camera.position, fwdV = camera.position.clone();
    let tick = 0, windSm = 0.5, swellSm = 0, wood = 0, rockH = 0;
    let gustT = 0;
    const g1 = { v: 0 };
    // The fall follows the river on its own clock as well as on frames: under load frames can be
    // seconds apart, and a loop that waits for one starts late or stays up after the player has left.
    let lastFrame = performance.now();
    const fallTimer = setInterval(() => {
      if (ac.state === 'closed') { clearInterval(fallTimer); return; }
      if (performance.now() - lastFrame > 250) fallTick(0.1, performance.now() / 1000, ac.currentTime);
    }, 100);
    function update(dt, t) {
      lastFrame = performance.now();
      if (ac.state === 'suspended') ac.resume?.();
      setListener();
      const now = ac.currentTime;
      const off = performance.now() / 1000 - now;
      offMin = Math.min(offMin + dt * 0.002, off); // let the floor creep, for clock drift
      staleMax = Math.max(staleMax * 0.995, off - offMin);
      lead = clamp(staleMax + 0.02, 0.03, 0.3);
      tick -= dt;
      if (tick > 0) return;
      const step = 0.1 - tick; tick = 0.1;
      const px = cam.x, pz = cam.z;
      fallTick(step, t, now);
      regionSnd?.tick(px, pz, step, t, now); // v4 regions
      // --- wind
      const b = terrain.biomeAt(px, pz);
      wood += (b.wood - wood) * 0.25;
      const c = landmarks.castle, ground = cam.y - 1.72;
      const inKeep = hyp(px - c.x, pz - c.z) < 40 && ground < 20 ? 1 : 0;
      const high = smoothstep(6, 30, b.h);
      const openness = (0.55 + 0.45 * clamp(b.moor + b.heath * 0.5, 0, 1)) * (1 + 0.4 * high) * (1 - 0.7 * wood) * (1 - 0.6 * inKeep);
      for (let i = 0; i < windLayers.length; i++) {
        const w = windLayers[i];
        const gust = 0.5 + 0.5 * ctx.noise.fbm2(t * 0.09 + w.ph, i * 3.7, 2);
        const gust2 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.31 + w.ph * 2, i);
        const lvl = w.lvl * openness * (0.4 + 0.6 * clamp(gust * 1.3, 0, 1)) * (0.85 + 0.3 * gust2);
        w.g.gain.setTargetAtTime(lvl * 0.9, now, 0.25);
        const fr = w.f * (0.85 + 0.4 * gust) * (1 + 0.1 * high);
        for (const f of w.filters) f.frequency.setTargetAtTime(fr, now, 0.3);
      }
      windBus.gain.setTargetAtTime(WIND_BUS, now, 1.5);
      // --- drone swell with the guttering sun
      const fl = ctx.sky?.flicker?.value ?? 1;
      const target = clamp((1 - fl) / 0.78, 0, 1);
      swellSm += (target - swellSm) * (target > swellSm ? 0.25 : 0.04);
      droneBus.gain.setTargetAtTime(0.1 + 0.4 * swellSm, now, 0.4);
      for (const o of droneOsc) o.detune.setTargetAtTime(-260 * swellSm, now, 0.6);
      shim.gain.setTargetAtTime(0.004 + 0.016 * swellSm, now, 0.5);
      droneLP.frequency.setTargetAtTime(360 + 500 * swellSm, now, 0.5);
      windBus.gain.setTargetAtTime(WIND_BUS * (1 - 0.35 * swellSm), now, 0.5);
      // --- tarn lapping
      const T = landmarks.tarn, td = hyp(px - T.x, pz - T.z), edge = 52;
      const toEdge = Math.abs(td - edge);
      const lapGain = (1 - smoothstep(3, 75, toEdge)) * (td > 20 ? 1 : 0.6);
      if (td > 1) { const k = td > edge ? edge / td : 1; const ex = T.x + (px - T.x) * (td > edge ? k : 1), ez = T.z + (pz - T.z) * (td > edge ? k : 1); setPos(lapPan, ex, T.h ?? -4.6, ez); }
      const lap = 0.5 + 0.5 * Math.sin(t * 1.1) * (0.6 + 0.4 * Math.sin(t * 0.37 + 1));
      lapBus.gain.setTargetAtTime(lapGain * (0.1 + 0.22 * lap), now, 0.15);
      lapLP.frequency.setTargetAtTime(300 + 250 * lap, now, 0.2);
      // --- fen bubbles
      const F = landmarks.fen, fd = hyp(px - F.x, pz - F.z);
      if (fd < F.r + 25) {
        bubT -= step;
        if (bubT <= 0) {
          bubT = 0.25 + rng() * 1.4;
          for (let k = 0; k < 6; k++) {
            const a = rng() * 6.283, r = 5 + rng() * 25, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
            if (hyp(x - F.x, z - F.z) < F.r) { setPos(bubPan, x, -2.5, z); bubble(); break; }
          }
        }
      }
      // --- lattice
      const md = hyp(px - L0.x, pz - L0.z);
      humBus.gain.setTargetAtTime(1 - smoothstep(30, 130, md), now, 0.5);
      // --- stones
      for (const s of stones) {
        const d = hyp(px - s.x, pz - s.z);
        s.cool -= step;
        if (s.armed && d < 20 && s.cool <= 0) { strike(s, 0.5 + 0.5 * (1 - d / 20)); s.armed = false; s.cool = 20; }
        if (!s.armed && d > 28) s.armed = true;
      }

      // --- insects by ground
      const grassy = clamp(b.moor + b.heath * 0.6 + b.orchard * 0.5, 0, 1) * (1 - 0.8 * wood) * (1 - b.rock) * (1 - 0.8 * inKeep) * (1 - swellSm * 0.9);
      insBus.gain.setTargetAtTime(0.045 * grassy, now, 0.6);
      // --- frogs
      if (fd < F.r + 30) {
        frogT -= step;
        if (frogT <= 0) {
          frogT = 0.2 + rng() * 1.3;
          const a = rng() * 6.283, r = 4 + rng() * 40, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
          if (hyp(x - F.x, z - F.z) < F.r) { setPos(frogPan, x, -2.3, z); frog(); }
        }
      }
      // --- distant calls from all around, so the quiet is never empty
      callT -= step;
      if (callT <= 0) {
        callT = 8 + rng() * 14;
        const a = rng() * 6.283, r = 140 + rng() * 160, kind = (rng() * 4) | 0;
        if (kind === 3) audio.cue('cry', { x: px + Math.cos(a) * r, y: 70, z: pz + Math.sin(a) * r });
        else distantCall(kind, px + Math.cos(a) * r, pz + Math.sin(a) * r);
      }
      // --- deodand click
      const D = ctx.deodand;
      if (D && D.visible) {
        const dd = hyp(px - D.position.x, pz - D.position.z);
        let seen = D.inView;
        if (seen === undefined) { camera.getWorldDirection(fwdV); const dx = D.position.x - px, dz = D.position.z - pz; seen = (fwdV.x * dx + fwdV.z * dz) / (dd || 1) > 0.7; }
        if (dd < 30 && !seen) {
          setPos(clickPan, D.position.x, D.position.y + 1.2, D.position.z);
          clickT -= step;
          if (clickT <= 0) {
            click(0.09 * (1 - smoothstep(6, 30, dd)) + 0.02);
            clickN++;
            clickT = (clickN % 4 === 0) ? 1.1 + rng() * 0.5 : 0.52 + rng() * 0.05;   // counting: groups of four
            if (clickN % 12 === 0) clickN = 0;
          }
        } else clickN = 0;
      }
    }
    ctx.registerUpdate(update);
    ctx.log('audio: started');
  }
}
