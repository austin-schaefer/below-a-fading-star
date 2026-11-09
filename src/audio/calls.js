// Place sounds and scheduled calls (v7.2-01 split out of src/audio.js; v7.2-03 voices it next): the tarn's lapping
// and the Lattice's hum (positional loops), the fen's bubbles and frogs, the distant calls from all around (a hoot,
// yelps, a moan, or a `cry` cue) and the deodand's counting click. Nothing here is a named cue or a region hook.
// startPlaces(a) builds the lap, hum and bubbles; startCalls(a) builds the frogs, calls and click, later, where they
// were in the shared stream's order of draws. Each returns { update(f) }, called at 10 Hz from audio.js with the
// frame f = { now, t, step, px, pz, b }.
import { hyp } from '../noise.js';
import { smoothstep } from './graph.js';

export function startPlaces(a) {
  const { ac, rng, master, send, panner, setPos, loopSrc, brown, pink, env, landmarks, terrain } = a;
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
  [[392, 1], [393.1, 0.8], [588.4, 0.6], [783.2, 0.45], [1177.6, 0.3], [1569, 0.18], [1571.4, 0.15]].forEach(([f, amp], i) => {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = amp * 0.1;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.11 + 0.07 * i; const lg = ac.createGain(); lg.gain.value = amp * 0.07; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    o.connect(g); g.connect(humBus); o.start();
  });
  humBus.connect(humPan); humPan.connect(master); send(humPan, 0.4);

  // fen bubbles
  const bubPan = panner('equalpower', 6, 1.3);
  const bubG = ac.createGain(); bubG.gain.value = 1; bubPan.connect(bubG); bubG.connect(master); send(bubG, 0.2);
  let bubT = 0;
  function bubble() {
    const t0 = ac.currentTime + a.lead, f = 180 + rng() * 380;
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * (1.8 + rng()), t0 + 0.07);
    const g = ac.createGain(); env(g, t0, 0.07 * (0.5 + rng()), 0.004, 0.08);
    o.connect(g); g.connect(bubPan); o.start(t0); o.stop(t0 + 0.14);
  }

  function update(f) {
    const { now, t, step, px, pz } = f;
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
          const ang = rng() * 6.283, r = 5 + rng() * 25, x = px + Math.cos(ang) * r, z = pz + Math.sin(ang) * r;
          if (hyp(x - F.x, z - F.z) < F.r) { setPos(bubPan, x, -2.5, z); bubble(); break; }
        }
      }
    }
    // --- lattice
    const md = hyp(px - L0.x, pz - L0.z);
    humBus.gain.setTargetAtTime(1 - smoothstep(30, 130, md), now, 0.5);
  }
  return { update };
}

export function startCalls(a) {
  const { ac, rng, ctx, master, send, panner, setPos, env, burst, white, camera } = a;
  // ================================================================ frogs
  const frogBus = ac.createGain(); frogBus.gain.value = 1; frogBus.connect(master); send(frogBus, 0.3);
  const frogPan = panner('equalpower', 6, 1.2); frogPan.connect(frogBus);
  let frogT = 0;
  function frog() {
    const t0 = ac.currentTime + a.lead, base = rng() < 0.6 ? 150 + rng() * 80 : 1700 + rng() * 500;
    const pulses = base > 1000 ? 2 : 3 + ((rng() * 3) | 0), gap = base > 1000 ? 0.09 : 0.07;
    for (let k = 0; k < pulses; k++) {
      const tt = t0 + k * gap;
      const o = ac.createOscillator(); o.type = base > 1000 ? 'sine' : 'square'; o.frequency.setValueAtTime(base, tt); o.frequency.exponentialRampToValueAtTime(base * (base > 1000 ? 1.25 : 0.8), tt + 0.05);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = base * 2; bp.Q.value = 2;
      const g = ac.createGain(); env(g, tt, base > 1000 ? 0.025 : 0.05, 0.005, 0.045);
      o.connect(bp); bp.connect(g); g.connect(frogPan); o.start(tt); o.stop(tt + 0.08);
    }
  }
  // ================================================================ distant calls
  let callT = 6 + rng() * 6;
  function distantCall(kind, x, z) {
    const p = panner('equalpower', 40, 1.0); setPos(p, x, camera.position.y + 10, z); p.connect(master); send(p, 0.9);
    let at = ac.currentTime + a.lead;
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
  // ================================================================ deodand click
  const clickPan = panner('HRTF', 3, 1.4);
  clickPan.connect(master);
  let clickT = 0, clickN = 0;
  function click(vol) {
    const t0 = ac.currentTime + a.lead, pitch = 1 + clickN * 0.05;
    const s = burst(white, 0.04), hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200 * pitch; hp.Q.value = 4;
    const g = ac.createGain(); env(g, t0, vol, 0.001, 0.025);
    s.connect(hp); hp.connect(g); g.connect(clickPan);
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 1500 * pitch; const og = ac.createGain(); env(og, t0, vol * 0.2, 0.001, 0.012); o.connect(og); og.connect(clickPan); o.start(t0); o.stop(t0 + 0.04);
  }

  const fwdV = camera.position.clone();
  function update(f) {
    const { step, px, pz } = f, F = a.landmarks.fen, fd = hyp(px - F.x, pz - F.z);
    // --- frogs
    if (fd < F.r + 30) {
      frogT -= step;
      if (frogT <= 0) {
        frogT = 0.2 + rng() * 1.3;
        const ang = rng() * 6.283, r = 4 + rng() * 40, x = px + Math.cos(ang) * r, z = pz + Math.sin(ang) * r;
        if (hyp(x - F.x, z - F.z) < F.r) { setPos(frogPan, x, -2.3, z); frog(); }
      }
    }
    // --- distant calls from all around, so the quiet is never empty
    callT -= step;
    if (callT <= 0) {
      callT = 8 + rng() * 14;
      const ang = rng() * 6.283, r = 140 + rng() * 160, kind = (rng() * 4) | 0;
      if (kind === 3) a.audio.cue('cry', { x: px + Math.cos(ang) * r, y: 70, z: pz + Math.sin(ang) * r });
      else distantCall(kind, px + Math.cos(ang) * r, pz + Math.sin(ang) * r);
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
  return { update };
}
