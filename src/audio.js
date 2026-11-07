// Audio: everything synthesised with WebAudio, started on the first click (the `begin` event).
// Wind, a low drone that swells when the sun gutters, footsteps by ground, place sounds (tarn, fen, Lattice,
// Cardinal Stones), calls (wings, crows, fish) and a faint counting click near the deodand.
// Exposes ctx.audio = { cue(name, position?), ctx: AudioContext, master, analyser }. A no-op without AudioContext.
import { makeNoiseBuffer, makeImpulse } from './audio/synth.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export async function build(ctx) {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  const audio = ctx.audio = { ctx: null, master: null, analyser: null, started: false, cue: () => {} };
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

    // ---- master chain: master -> limiter -> out, with a tap for tests
    const master = ac.createGain(); master.gain.value = 0;
    master.gain.setValueAtTime(0, now0);
    master.gain.linearRampToValueAtTime(0.25, now0 + 4); // about -12 dB
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 8; limiter.attack.value = 0.005; limiter.release.value = 0.3;
    const analyser = ac.createAnalyser(); analyser.fftSize = 2048;
    master.connect(limiter); limiter.connect(ac.destination); master.connect(analyser);
    audio.master = master; audio.analyser = analyser;

    // ---- reverb send
    const verb = ac.createConvolver(); verb.buffer = makeImpulse(ac, 3.2, 3.2, rng);
    const verbIn = ac.createGain(); verbIn.gain.value = 1;
    const verbOut = ac.createGain(); verbOut.gain.value = 0.55;
    verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(master);

    // ---- noise sources
    const brown = makeNoiseBuffer(ac, 7, 'brown', rng), pink = makeNoiseBuffer(ac, 5, 'pink', rng), white = makeNoiseBuffer(ac, 3, 'white', rng);
    const loopSrc = (buf, off) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off * buf.duration); return s; };
    const burst = (buf, dur, off = rng()) => { const s = ac.createBufferSource(); s.buffer = buf; s.start(ac.currentTime, off * (buf.duration - dur - 0.1), dur + 0.05); return s; };

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
    const send = (node, amt) => { const g = ac.createGain(); g.gain.value = amt; node.connect(g); g.connect(verbIn); return g; };

    // ================================================================ wind
    const windBus = ac.createGain(); windBus.gain.value = 0; windBus.connect(master); send(windBus, 0.12);
    const windLayers = [];
    [[260, 0.9, 1.0], [640, 1.3, 0.7], [1500, 1.8, 0.32]].forEach(([f, q, lvl], i) => {
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
      const t0 = ac.currentTime + 0.005;
      const vol = (hurrying ? 1.35 : 1) * (0.8 + rng() * 0.4);
      const pitch = 0.85 + rng() * 0.35;
      const out = ac.createGain(); out.gain.value = 1;
      let kind = 'grass';
      if (player.wading > 0.05) kind = 'splash';
      else if (b.ice > 0.35 || (b.crystal > 0.55 && b.h > 0 && terrain.glacierMask(p.x, p.z) > 0.2)) kind = 'crunch';
      else if (terrain.causewayDistance(p.x, p.z) < 2.5 || nearCastle || inCourt) kind = 'click';
      else if (b.marsh > 0.5) kind = 'squelch';
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
      const t0 = ac.currentTime + 0.01;
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
      const t0 = ac.currentTime + 0.01, f = 180 + rng() * 380;
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * (1.8 + rng()), t0 + 0.07);
      const g = ac.createGain(); env(g, t0, 0.07 * (0.5 + rng()), 0.004, 0.08);
      o.connect(g); g.connect(bubPan); o.start(t0); o.stop(t0 + 0.14);
    }

    // ================================================================ calls (one-shots)
    function oneShotPanner(position, ref = 10, roll = 1) {
      const p = panner('equalpower', ref, roll); setPos(p, position.x, position.y, position.z);
      p.connect(master); return p;
    }
    function cry(pos) {
      const t0 = ac.currentTime + 0.02, p = oneShotPanner(pos, 50, 1.1);
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
      setTimeout(() => p.disconnect(), (at - t0 + 4) * 1000);
    }
    function crows(pos) {
      const c = landmarks.castle;
      const pp = pos || { x: 65, y: 34, z: 30 };
      const p = oneShotPanner(pp, 12, 1); send(p, 0.5);
      let at = ac.currentTime + 0.03;
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
      const wg = ac.createGain(); env(wg, ac.currentTime + 0.05, 0.08, 0.2, 1.1); w.connect(wf); wf.connect(wg); wg.connect(p);
      setTimeout(() => p.disconnect(), (at - ac.currentTime + 5) * 1000);
    }
    function plop(pos) {
      const t0 = ac.currentTime + 0.01, p = oneShotPanner(pos, 6, 1.2); send(p, 0.35);
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(820, t0); o.frequency.exponentialRampToValueAtTime(190, t0 + 0.11);
      const g = ac.createGain(); env(g, t0, 0.13, 0.004, 0.13); o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + 0.2);
      const s = burst(pink, 0.1), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const ng = ac.createGain(); env(ng, t0, 0.04, 0.002, 0.08);
      s.connect(f); f.connect(ng); ng.connect(p);
      setTimeout(() => p.disconnect(), 3000);
    }
    audio.cue = (name, position) => {
      if (ac.state === 'closed') return;
      try {
        if (name === 'cry') cry(position || { x: camera.position.x + 120, y: 80, z: camera.position.z - 100 });
        else if (name === 'crows') crows(position);
        else if (name === 'flush') flush(position || camera.position);
        else if (name === 'plop') plop(position || { x: -90, y: -4.6, z: 110 });
        else if (name === 'strike') strike(stones[(position | 0) % 4]);
      } catch (e) { /* ignore */ }
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
      const t0 = ac.currentTime + 0.01, base = rng() < 0.6 ? 150 + rng() * 80 : 1700 + rng() * 500;
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
      let at = ac.currentTime + 0.02;
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
      const p = oneShotPanner(pos, 6, 1.1); const t0 = ac.currentTime + 0.01;
      const s = burst(white, 0.6), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
      const g = ac.createGain(); env(g, t0, 0.14, 0.02, 0.5);
      // a rattle of wingbeats
      const am = ac.createOscillator(); am.frequency.value = 22; const ag = ac.createGain(); ag.gain.value = 0.5; const base = ac.createGain(); base.gain.value = 0.5; am.connect(ag); ag.connect(base.gain);
      s.connect(f); f.connect(base); base.connect(g); g.connect(p); am.start(t0); am.stop(t0 + 0.7);
      for (let k = 0; k < 3; k++) { const o = ac.createOscillator(); o.type = 'sawtooth'; const tt = t0 + 0.1 + k * 0.12 + rng() * 0.06; o.frequency.setValueAtTime(3000, tt); o.frequency.exponentialRampToValueAtTime(2200, tt + 0.05); const og = ac.createGain(); env(og, tt, 0.02, 0.003, 0.05); o.connect(og); og.connect(p); o.start(tt); o.stop(tt + 0.08); }
      setTimeout(() => p.disconnect(), 3000);
    }

    // ================================================================ deodand click
    const clickPan = panner('HRTF', 3, 1.4);
    clickPan.connect(master);
    let clickT = 0, clickN = 0;
    function click(vol) {
      const t0 = ac.currentTime + 0.005, pitch = 1 + clickN * 0.05;
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
    function update(dt, t) {
      if (ac.state === 'suspended') ac.resume?.();
      setListener();
      const now = ac.currentTime;
      tick -= dt;
      if (tick > 0) return;
      const step = 0.1 - tick; tick = 0.1;
      const px = cam.x, pz = cam.z;
      // --- wind
      const b = terrain.biomeAt(px, pz);
      wood += (b.wood - wood) * 0.25;
      const c = landmarks.castle, ground = cam.y - 1.72;
      const inKeep = Math.hypot(px - c.x, pz - c.z) < 40 && ground < 20 ? 1 : 0;
      const high = smoothstep(6, 30, b.h);
      const openness = (0.55 + 0.45 * clamp(b.moor + b.heath * 0.5, 0, 1)) * (1 + 0.7 * high) * (1 - 0.7 * wood) * (1 - 0.6 * inKeep);
      for (let i = 0; i < windLayers.length; i++) {
        const w = windLayers[i];
        const gust = 0.5 + 0.5 * ctx.noise.fbm2(t * 0.09 + w.ph, i * 3.7, 2);
        const gust2 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.31 + w.ph * 2, i);
        const lvl = w.lvl * openness * (0.25 + 0.75 * clamp(gust * 1.3, 0, 1)) * (0.8 + 0.4 * gust2);
        w.g.gain.setTargetAtTime(lvl * 0.9, now, 0.25);
        const fr = w.f * (0.75 + 0.7 * gust) * (1 + 0.15 * high);
        for (const f of w.filters) f.frequency.setTargetAtTime(fr, now, 0.3);
      }
      windBus.gain.setTargetAtTime(1, now, 1.5);
      // --- drone swell with the guttering sun
      const fl = ctx.sky?.flicker?.value ?? 1;
      const target = clamp((1 - fl) / 0.78, 0, 1);
      swellSm += (target - swellSm) * (target > swellSm ? 0.25 : 0.04);
      droneBus.gain.setTargetAtTime(0.1 + 0.4 * swellSm, now, 0.4);
      for (const o of droneOsc) o.detune.setTargetAtTime(-260 * swellSm, now, 0.6);
      shim.gain.setTargetAtTime(0.004 + 0.016 * swellSm, now, 0.5);
      droneLP.frequency.setTargetAtTime(360 + 500 * swellSm, now, 0.5);
      windBus.gain.setTargetAtTime(1 - 0.35 * swellSm, now, 0.5);
      // --- tarn lapping
      const T = landmarks.tarn, td = Math.hypot(px - T.x, pz - T.z), edge = 52;
      const toEdge = Math.abs(td - edge);
      const lapGain = (1 - smoothstep(3, 75, toEdge)) * (td > 20 ? 1 : 0.6);
      if (td > 1) { const k = td > edge ? edge / td : 1; const ex = T.x + (px - T.x) * (td > edge ? k : 1), ez = T.z + (pz - T.z) * (td > edge ? k : 1); setPos(lapPan, ex, T.h ?? -4.6, ez); }
      const lap = 0.5 + 0.5 * Math.sin(t * 1.1) * (0.6 + 0.4 * Math.sin(t * 0.37 + 1));
      lapBus.gain.setTargetAtTime(lapGain * (0.1 + 0.22 * lap), now, 0.15);
      lapLP.frequency.setTargetAtTime(300 + 250 * lap, now, 0.2);
      // --- fen bubbles
      const F = landmarks.fen, fd = Math.hypot(px - F.x, pz - F.z);
      if (fd < F.r + 25) {
        bubT -= step;
        if (bubT <= 0) {
          bubT = 0.25 + rng() * 1.4;
          for (let k = 0; k < 6; k++) {
            const a = rng() * 6.283, r = 5 + rng() * 25, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
            if (Math.hypot(x - F.x, z - F.z) < F.r) { setPos(bubPan, x, -2.5, z); bubble(); break; }
          }
        }
      }
      // --- lattice
      const md = Math.hypot(px - L0.x, pz - L0.z);
      humBus.gain.setTargetAtTime(1 - smoothstep(30, 130, md), now, 0.5);
      // --- stones
      for (const s of stones) {
        const d = Math.hypot(px - s.x, pz - s.z);
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
          if (Math.hypot(x - F.x, z - F.z) < F.r) { setPos(frogPan, x, -2.3, z); frog(); }
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
        const dd = Math.hypot(px - D.position.x, pz - D.position.z);
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
