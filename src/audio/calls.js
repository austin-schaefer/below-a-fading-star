// Place sounds and scheduled calls (v7.2-01 split out of src/audio.js; v7.2-03 voiced it): the tarn's lapping and
// the Lattice's hum (positional loops), the fen's bubbles and frogs, the far call from the wood's edge, and the
// deodand's counting click. Nothing here is a named cue or a region hook. startPlaces(a) builds the lap, hum and
// bubbles; startCalls(a) builds the frogs, the far calls and the click. Each returns { update(f) }, called at 10 Hz
// from audio.js with the frame f = { now, t, step, px, pz, b }.
//
// The phrasing every scheduled sound here and in the regions' hooks uses (craft.md "Scheduling and pacing"):
//   lognormal(rng, median, spread): a long-tailed draw (median * e^(spread * z), z normal)
//   caller(rng, o, fire): an emitter's clock. o = { bout: [n0, n1], gap: [s0, s1], rest: [median, spread, min?, max?],
//     first?: [s0, s1], answer?: { p, delay: [s0, s1], gain }, when?: () => bool }. A bout of n0..n1 calls gap apart,
//     then a rest; when() false at a bout's start skips it (the emitter keeps its own time whether you hear it or
//     not). fire(i, n, gain, answer) per call; an answer (p per bout) is one call from the partner, delay after the
//     bout's last, at gain (0.71: 3 dB under).
//   placed(a, o): a continuous source with a place: in -> air lowpass -> panner -> master, a reverb send; at(x, y, z)
//     moves it and sets the lowpass by its distance (o = { ref, roll, range, air, verb })
//   a.far: the far calls' shared clock ({ last }): no far call starts within FAR_GAP s of another
// Pitched things sit in D (palette.md): the hum on A (the fifth), the hoot D4 to A3, the frogs on D pentatonic notes.
import { hyp } from '../noise.js';
import { smoothstep, clamp } from './graph.js';

export function lognormal(rng, median, spread) {
  const u = Math.max(1e-6, rng()), v = rng();
  return median * Math.exp(spread * Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v));
}
const span = (rng, r) => r[0] + rng() * (r[1] - r[0]);
export function caller(rng, o, fire) {
  const rest = () => clamp(lognormal(rng, o.rest[0], o.rest[1]), o.rest[2] ?? 0, o.rest[3] ?? Infinity);
  let t = o.first ? span(rng, o.first) : rest(), left = 0, n = 0, ans = -1;
  return {
    tick(step) {
      if (ans >= 0) { ans -= step; if (ans < 0) fire(n, n + 1, o.answer.gain ?? 0.71, true); }
      t -= step;
      if (t > 0) return;
      if (left === 0) {
        if (o.when && !o.when()) { t = rest(); return; }
        n = left = o.bout[0] + Math.floor(rng() * (o.bout[1] - o.bout[0] + 1));
      }
      fire(n - left, n, 1, false); left--;
      if (left > 0) t = span(rng, o.gap);
      else { t = rest(); if (o.answer && rng() < o.answer.p) ans = span(rng, o.answer.delay); }
    },
    get busy() { return left > 0 || ans >= 0; },
  };
}
export function placed(a, o) {
  const { ac, panner, setPos, send, camera, master } = a;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = 20000;
  const p = panner('equalpower', o.ref ?? 5, o.roll ?? 1, o.range ?? 200);
  lp.connect(p); p.connect(o.dest || master); if (o.verb) send(p, o.verb);
  const air = o.air ?? 60;
  return {
    in: lp, pan: p,
    at(x, y, z) {
      setPos(p, x, y, z);
      const c = camera.position, d = Math.hypot(x - c.x, y - c.y, z - c.z);
      lp.frequency.setTargetAtTime(clamp(20000 * Math.exp(-d / air), 900, 20000), ac.currentTime, 0.03);
      return d;
    },
  };
}
export const FAR_GAP = 20;
// a far sound's reverb share: more of it the further off (10-20 % near, 60-80 % far)
export const wetBy = (d) => 0.15 + 0.6 * smoothstep(10, 220, d);

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

  // lattice hum: sine partials on A4 (the fifth of D), two pairs slightly apart so they beat slowly (1.2 and 2.6 Hz)
  const humBus = ac.createGain(); humBus.gain.value = 0;
  const humPan = panner('HRTF', 30, 0.9);
  const L0 = landmarks.moraine;
  setPos(humPan, L0.x, terrain.heightAt(L0.x, L0.z) + 12, L0.z);
  [[440.5, 1], [441.7, 0.8], [660.75, 0.6], [881, 0.45], [1321.5, 0.3], [1762, 0.18], [1764.6, 0.15]].forEach(([f, amp], i) => {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = amp * 0.1;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.11 + 0.07 * i; const lg = ac.createGain(); lg.gain.value = amp * 0.07; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    o.connect(g); g.connect(humBus); o.start();
  });
  humBus.connect(humPan); humPan.connect(master); send(humPan, 0.4);

  // fen bubbles: gas rising from the mud near you, in runs with rests between
  a.far = { last: -1e9 }; // the far calls' shared clock (startCalls, the regions' hooks)
  const prng = a.ctx.makeRng(9093), F = landmarks.fen;
  const spot = { x: 0, y: -2.5, z: 0 };
  function findSpot(px, pz) {
    for (let k = 0; k < 8; k++) {
      const ang = prng() * 6.283, r = 5 + prng() * 25, x = px + Math.cos(ang) * r, z = pz + Math.sin(ang) * r;
      if (hyp(x - F.x, z - F.z) < F.r) { spot.x = x; spot.z = z; return spot; }
    }
    return null;
  }
  let fpx = 0, fpz = 0;
  const bubbles = caller(prng, { bout: [2, 6], gap: [0.15, 0.6], rest: [7, 0.7, 2, 45], first: [1, 6], when: () => hyp(fpx - F.x, fpz - F.z) < F.r + 25 }, () => {
    const s = findSpot(fpx, fpz); if (!s) return;
    const cp = a.camera.position, d = Math.hypot(s.x - cp.x, s.y - cp.y, s.z - cp.z);
    const v = a.voice(s, { ref: 6, roll: 1.3, range: 60, air: 60, verb: 0.5 * wetBy(d), dur: 0.2 });
    if (!v) return;
    const t0 = v.t0, f0 = 180 + prng() * 380;
    const o = a.vOsc(v, 'sine', f0, t0, t0 + 0.14); o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (1.8 + prng()), t0 + 0.07);
    const g = ac.createGain(); env(g, t0, 0.3 * (0.6 + 0.8 * prng()), 0.004, 0.08);
    o.connect(g); g.connect(v.in);
  });

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
    fpx = px; fpz = pz; bubbles.tick(step);
    // --- lattice
    const md = hyp(px - L0.x, pz - L0.z);
    humBus.gain.setTargetAtTime(1 - smoothstep(30, 130, md), now, 0.5);
  }
  return { update };
}

export function startCalls(a) {
  const { ac, ctx, master, env, burst, white, camera, panner, setPos, voice, vOsc, gainOf, filt, chain } = a;
  const rng = ctx.makeRng(9095), cp = camera.position;
  const dist = (p) => Math.hypot(p.x - cp.x, p.y - cp.y, p.z - cp.z);
  let px = 0, pz = 0;
  // ================================================================ frogs: five at their places in the fen, each
  // croaking in bouts with long rests, and the nearest other answering now and then
  const F = a.landmarks.fen, NOTES = [146.8, 195.8, 220, 176.2, 1760]; // D3 G3 A3 F3 and one peeper on A6
  const frogs = NOTES.map((f, i) => {
    const ang = rng() * 6.283, r = F.r * (0.65 + 0.3 * rng()), fr = { x: F.x + Math.cos(ang) * r, y: -2.3, z: F.z + Math.sin(ang) * r, f: f * (1 + (rng() - 0.5) * 0.01), c: null };
    return fr;
  });
  function croak(fr, gain) {
    const d = dist(fr);
    const v = voice(fr, { ref: 15, roll: 1.2, range: 90, air: 60, verb: wetBy(d) * 0.6, dur: 0.6 });
    if (!v) return;
    const hi = fr.f > 1000, pulses = hi ? 2 : 3 + Math.floor(rng() * 3), gap = hi ? 0.09 : 0.085;
    for (let k = 0; k < pulses; k++) {
      const tt = v.t0 + k * gap, f = fr.f * (1 + (rng() - 0.5) * 0.03);
      const o = vOsc(v, 'sine', f, tt, tt + 0.08); o.frequency.setValueAtTime(f, tt); o.frequency.exponentialRampToValueAtTime(f * (hi ? 1.25 : 0.8), tt + 0.05);
      const g = gainOf(0); env(g, tt, (hi ? 0.12 : 0.35) * gain, 0.006, 0.045);
      if (!hi) { const o2 = vOsc(v, 'sine', f * 2, tt, tt + 0.08), g2 = gainOf(0.35); o2.frequency.setValueAtTime(f * 2, tt); o2.frequency.exponentialRampToValueAtTime(f * 1.6, tt + 0.05); o2.connect(g2); g2.connect(g); }
      chain(o, g, filt('bandpass', fr.f * 1.5, 0.8), v.in);
    }
  }
  frogs.forEach((fr, i) => {
    const partner = frogs.map((o, j) => j).filter((j) => j !== i).sort((p, q) => hyp(frogs[p].x - fr.x, frogs[p].z - fr.z) - hyp(frogs[q].x - fr.x, frogs[q].z - fr.z))[0];
    fr.c = caller(rng, { bout: [2, 6], gap: [0.4, 1.1], rest: [16, 0.6, 5, 70], first: [1, 12], answer: { p: 0.5, delay: [0.8, 2], gain: 0.71 }, when: () => hyp(px - fr.x, pz - fr.z) < 90 },
      (k, n, gain, ans) => croak(ans ? frogs[partner] : fr, gain));
  });
  // ================================================================ the far call: a hoot from the wood's edge, heard
  // across the moor and never from inside the wood; a pair of falling notes (D4 to A3), answered now and then from
  // further along the edge. It keeps to the far calls' shared clock (a.far).
  const W = a.landmarks.wood;
  const edge = [-1.1, -0.45, 0.2].map((ang) => { const x = W.x + Math.cos(ang) * W.r * 0.95, z = W.z + Math.sin(ang) * W.r * 0.95; return { x, y: (a.terrain.heightAt(x, z) || 0) + 12, z }; });
  let hootAt = edge[0];
  function hoot(pos, gain) {
    const d = dist(pos);
    const v = voice(pos, { ref: 40, roll: 1, range: 420, air: 60, verb: wetBy(d), dur: 2.6 });
    if (!v) return;
    for (let k = 0; k < 2; k++) {
      const at = v.t0 + k * 1.0, o = vOsc(v, 'sine', 293.7, at, at + 0.9);
      o.frequency.setValueAtTime(293.7, at); o.frequency.exponentialRampToValueAtTime(220, at + 0.7);
      const g = gainOf(0); env(g, at, 0.1 * gain * (k ? 0.8 : 1), 0.12, 0.7); o.connect(g); g.connect(v.in);
    }
  }
  const owl = caller(rng, { bout: [1, 2], gap: [3, 6], rest: [120, 0.6, 40, 400], first: [20, 90], answer: { p: 0.4, delay: [1.5, 3], gain: 0.71 },
    when: () => {
      if (hyp(px - W.x, pz - W.z) < W.r + 15 || ac.currentTime - a.far.last < FAR_GAP) return false;
      let bd = Infinity; for (const e of edge) { const d = hyp(e.x - px, e.z - pz); if (d < bd) { bd = d; hootAt = e; } }
      return bd < 380;
    } }, (k, n, gain, ans) => {
    a.far.last = ac.currentTime;
    hoot(ans ? edge[(edge.indexOf(hootAt) + 1) % edge.length] : hootAt, gain);
  });
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
    const { step } = f;
    px = f.px; pz = f.pz;
    for (const fr of frogs) fr.c.tick(step);
    owl.tick(step);
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
