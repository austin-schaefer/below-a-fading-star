// The bed (v7.2-01 split out of src/audio.js; v7.2-02 voices it): the wind (three bandpassed noise layers, their
// gusts and the ground's openness), the low drone on D that comes up while the sun gutters, the wind's dip and
// darkening under it, and the insects by ground. The gutter is a darkening and a thinning, not a swell: the high
// shimmer (sines at 1822/2417/3105 Hz, in no key) is gone. startBed(a) builds the wind and drone;
// startInsects(a) builds the insects, later, where they were in the shared stream's order of draws. Each returns
// { update(f) }, called at 10 Hz from audio.js with the frame f = { now, t, step, px, pz, b (biomeAt) }; the bed's
// update writes f.wood, f.inKeep and f.swellSm for the parts after it.
import { hyp } from '../noise.js';
import { clamp, smoothstep } from './graph.js';

export function startBed(a) {
  const { ac, rng, ctx, master, send, loopSrc, brown, pink, landmarks } = a;
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
  // v7.2-02: the drone is in the key (D, decision 1): D1, D2 and A2 as plain sines, each a few cents out of true and
  // fixed (worn, per the palette), so nothing in it beats faster than about 0.2 Hz. It was four detuned sines and
  // triangles at 41/49/55/83 Hz whose harmonics beat at 6.5 Hz and ~78 Hz, swelling 14 dB and sinking 260 cents in a
  // gutter: the noise Austin muted for. Now it sits low, felt more than heard, and in a gutter comes up DRONE_SWELL
  // (+7 dB) over about 2 s and sinks GUTTER_CENTS, then returns over the gutter's tail.
  const DRONE_BASE = 0.02, DRONE_SWELL = 2.24, GUTTER_CENTS = -45;
  const droneBus = ac.createGain(); droneBus.gain.value = 0;
  const droneLP = ac.createBiquadFilter(); droneLP.type = 'lowpass'; droneLP.frequency.value = 240; droneLP.Q.value = 0.5;
  droneBus.connect(droneLP); droneLP.connect(master); send(droneLP, 0.2);
  const droneOsc = [];
  [[36.71, 0.6, 2], [73.42, 0.7, -3]].forEach(([f, g, cents]) => {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = cents;
    const gn = ac.createGain(); gn.gain.value = g;
    o.connect(gn); gn.connect(droneBus); o.start(); droneOsc.push({ o, cents });
  });

  let swellSm = 0, wood = 0;
  function update(f) {
    const { now, t, px, pz, b } = f, cam = a.camera.position;
    // --- wind
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
      const fr = w.f * (0.85 + 0.4 * gust) * (1 + 0.1 * high) * (1 - 0.3 * swellSm); // darker in a gutter
      for (const fl of w.filters) fl.frequency.setTargetAtTime(fr, now, 0.3);
    }
    windBus.gain.setTargetAtTime(WIND_BUS, now, 1.5);
    // --- drone swell with the guttering sun
    const fl = ctx.sky?.flicker?.value ?? 1;
    const target = clamp((1 - fl) / 0.78, 0, 1);
    swellSm += (target - swellSm) * (target > swellSm ? 0.25 : 0.04);
    droneBus.gain.setTargetAtTime(DRONE_BASE * (1 + (DRONE_SWELL - 1) * swellSm), now, 0.7);
    for (const d of droneOsc) d.o.detune.setTargetAtTime(d.cents + GUTTER_CENTS * swellSm, now, 0.7);
    // the wind is ducked (-6 dB) and darkened under the drone: the gutter is a dip, not a swell
    windBus.gain.setTargetAtTime(WIND_BUS * (1 - 0.5 * swellSm), now, 0.5);
    f.wood = wood; f.inKeep = inKeep; f.swellSm = swellSm;
  }
  return { update };
}

// ================================================================ insects
export function startInsects(a) {
  const { ac, rng, master, send, loopSrc, white } = a;
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
  // --- insects by ground
  function update(f) {
    const { b, wood, inKeep, swellSm, now } = f;
    const grassy = clamp(b.moor + b.heath * 0.6 + b.orchard * 0.5, 0, 1) * (1 - 0.8 * wood) * (1 - b.rock) * (1 - 0.8 * inKeep) * (1 - swellSm * 0.9);
    insBus.gain.setTargetAtTime(0.045 * grassy, now, 0.6);
  }
  return { update };
}
