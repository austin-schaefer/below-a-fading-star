// The bed (v7.2-01 split out of src/audio.js; v7.2-02 voices it): the wind (three bandpassed noise layers, their
// gusts and the ground's openness), the low drone on D that comes up while the sun gutters, the wind's dip and
// darkening under it, and the insects by ground. The gutter is a darkening and a thinning, not a swell: the high
// shimmer (sines at 1822/2417/3105 Hz, in no key) is gone. startBed(a) builds the wind and drone;
// startInsects(a) builds the insects, later, where they were in the shared stream's order of draws. Each returns
// { update(f) }, called at 10 Hz from audio.js with the frame f = { now, t, step, px, pz, b (biomeAt) }; the bed's
// update writes f.wood, f.inKeep and f.swellSm for the parts after it.
import { hyp } from '../noise.js';
import { clamp, smoothstep } from './graph.js';
import { makeNoiseBuffer } from './synth.js';

export function startBed(a) {
  const { ac, rng, ctx, master, send, landmarks } = a;
  // the bed's own noise, on its own streams so the shared stream's order of draws is the same as before for the
  // parts after it: 17 s of brown and 19 s of pink, stereo (each channel its own noise, so the bed is wide without a
  // panner), about 13 MB at 48 kHz. Every reader drifts in rate (+-2.5 %, 40-70 s periods) so no stretch of the bed
  // comes back the same inside a minute (the old 7 s buffers read as a 7.0 s repeat).
  const bedBrown = makeNoiseBuffer(ac, 17, 'brown', ctx.makeRng(7202));
  const bedPink = makeNoiseBuffer(ac, 19, 'pink', ctx.makeRng(7203));
  const gustRng = ctx.makeRng(7204);
  const shared = []; for (let i = 0; i < 9; i++) shared.push(rng()); // the nine draws the bed always took
  const readers = [];
  const reader = (buf, off, drift) => {
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off * buf.duration);
    readers.push({ s, ph: off * 6.283, w: drift }); return s;
  };
  a.bedNoise = { brown: bedBrown, pink: bedPink, reader }; // the insects read the same pink
  // ================================================================ wind
  // Farnell's layered wind (craft.md "Wind"): a broadband bed (brown + pink, lowpassed 1.3-2.7 kHz by the gust at 24 dB an octave), two
  // whistles (pink through bandpasses at Q 3 swept 300-1200 Hz by the gust with a lag) that sound only in strong
  // gusts, and turbulence (a 0.5-3 Hz flutter) only near a gust's top. Gusts are events, drawn from their own
  // stream: a rise of 2-6 s, a hold, a slower fall, then a rest; between gusts the bed sits 7-12 dB under the gust's
  // peak and the whistles are gone, so the whole wind falls 12-16 dB. Openness sets the ceiling (moor and heath full, high ground more); shelter (the wood, the keep) takes the
  // bed down 14 dB and the whistles away, leaving the canopy's high hiss. ?wind=0.3 scales it for tuning.
  const windMul = (() => { try { const v = Number(new URL(location.href).searchParams.get('wind')); return v > 0 ? v : 1; } catch (e) { return 1; } })();
  const WIND_BUS = 0.55 * windMul;
  const windBus = ac.createGain(); windBus.gain.value = 0; windBus.connect(master); send(windBus, 0.12);
  const bedG = ac.createGain(); bedG.gain.value = 0;
  const bedLP = ac.createBiquadFilter(); bedLP.type = 'lowpass'; bedLP.frequency.value = 1500; bedLP.Q.value = 0.5;
  const bedHP = ac.createBiquadFilter(); bedHP.type = 'highpass'; bedHP.frequency.value = 70; bedHP.Q.value = 0.5;
  const bB = ac.createGain(); bB.gain.value = 1.0; reader(bedBrown, shared[0], 0.021).connect(bB); bB.connect(bedHP);
  const bP = ac.createGain(); bP.gain.value = 0.12; reader(bedPink, shared[1], 0.017).connect(bP); bP.connect(bedHP);
  const bedLP2 = ac.createBiquadFilter(); bedLP2.type = 'lowpass'; bedLP2.frequency.value = 1500; bedLP2.Q.value = 0.5;
  bedHP.connect(bedLP); bedLP.connect(bedLP2); bedLP2.connect(bedG); bedG.connect(windBus); // 24 dB an octave above
  const whistles = [[1, 0.16, shared[2], -0.3], [1.62, 0.08, shared[3], 0.3]].map(([ratio, lvl, off, pan], i) => {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.value = 300 * ratio;
    const g = ac.createGain(); g.gain.value = 0;
    const pn = ac.createStereoPanner(); pn.pan.value = pan;
    reader(bedPink, off, 0.025 + 0.006 * i).connect(bp); bp.connect(g); g.connect(pn); pn.connect(windBus);
    return { bp, g, pn, ratio, lvl, pan, lag: 0, k: 0.06 - 0.02 * i, ph: shared[4 + i] * 100 };
  });
  // the canopy: what is left of the wind in the wood, high and far (pink, 700 Hz-2.2 kHz, kept under the 2-5 kHz band)
  const canG = ac.createGain(); canG.gain.value = 0;
  const canHP = ac.createBiquadFilter(); canHP.type = 'highpass'; canHP.frequency.value = 700; canHP.Q.value = 0.5;
  const canLP = ac.createBiquadFilter(); canLP.type = 'lowpass'; canLP.frequency.value = 2200; canLP.Q.value = 0.5;
  reader(bedPink, shared[6], 0.019).connect(canHP); canHP.connect(canLP); canLP.connect(canG); canG.connect(windBus);
  const turbPh = shared[7] * 100, panPh = shared[8] * 100;
  // the gust: its phase, how long it lasts, where it started and its peak (0..1); g is the envelope, 0.1 at rest
  const FLOOR = 0.25;
  const gust = { phase: 'rest', t: 0, dur: 2 + 3 * gustRng(), from: FLOOR, peak: 1, g: FLOOR };
  function nextGust() {
    const G = gust, r = gustRng;
    if (G.phase === 'rest') { G.phase = 'rise'; G.dur = 2 + 4 * r(); G.from = G.g; G.peak = 0.55 + 0.45 * r(); }
    else if (G.phase === 'rise') { G.phase = 'hold'; G.dur = 0.8 + 3 * r(); }
    else if (G.phase === 'hold') { G.phase = 'fall'; G.dur = (3 + 5 * r()); G.from = G.g; }
    else { // a rest, long-tailed: mostly 3-9 s, now and then much longer, and sometimes a gust follows at once
      G.phase = 'rest'; G.dur = r() < 0.2 ? 0.5 + r() : 3 * Math.exp(1.6 * r() * r() + 0.4 * r());
    }
    G.t = 0;
  }
  function stepGust(dt) {
    const G = gust; G.t += dt;
    while (G.t >= G.dur) { const over = G.t - G.dur; nextGust(); G.t = over; }
    const u = smoothstep(0, 1, G.t / G.dur);
    if (G.phase === 'rise') G.g = G.from + (G.peak - G.from) * u;
    else if (G.phase === 'hold') G.g = G.peak;
    else if (G.phase === 'fall') G.g = G.from + (FLOOR - G.from) * u;
    else G.g = FLOOR;
    return G.g;
  }

  // ================================================================ drone
  // v7.2-02: the drone is in the key (D, decision 1): D1, D2 and A2 as plain sines, each a few cents out of true and
  // fixed (worn, per the palette), so nothing in it beats faster than about 0.2 Hz. It was four detuned sines and
  // triangles at 41/49/55/83 Hz whose harmonics beat at 6.5 Hz and ~78 Hz, swelling 14 dB and sinking 260 cents in a
  // gutter: the noise Austin muted for. Now it sits low, felt more than heard, and in a gutter comes up DRONE_SWELL
  // (+7 dB) over about 2 s and sinks GUTTER_CENTS, then returns over the gutter's tail.
  const BED_LVL = 0.9, CANOPY_LVL = 0.14;
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

  let swellSm = 0, wood = 0, hurrySm = 0;
  function update(f) {
    const { now, t, px, pz, b, step } = f, cam = a.camera.position;
    // --- the gutter: the drone comes up under a wind that thins and darkens
    const fl = ctx.sky?.flicker?.value ?? 1;
    const target = clamp((1 - fl) / 0.78, 0, 1);
    swellSm += (target - swellSm) * (target > swellSm ? 0.25 : 0.04);
    droneBus.gain.setTargetAtTime(DRONE_BASE * (1 + (DRONE_SWELL - 1) * swellSm), now, 0.7);
    for (const d of droneOsc) d.o.detune.setTargetAtTime(d.cents + GUTTER_CENTS * swellSm, now, 0.7);
    // --- the readers' slow drift in rate
    for (const r of readers) r.s.playbackRate.setTargetAtTime(1 + 0.025 * Math.sin(t * r.w + r.ph), now, 0.5);
    // --- wind
    wood += (b.wood - wood) * 0.25;
    const c = landmarks.castle, ground = cam.y - 1.72;
    const inKeep = hyp(px - c.x, pz - c.z) < 40 && ground < 20 ? 1 : 0;
    const high = smoothstep(6, 30, b.h);
    const openness = (0.55 + 0.45 * clamp(b.moor + b.heath * 0.5, 0, 1)) * (1 + 0.4 * high);
    const shelter = clamp(wood + 0.6 * inKeep, 0, 1);
    hurrySm += (smoothstep(4, 6.5, a.player?.speed || 0) - hurrySm) * 0.1; // air past the ears: +1 dB, a little brighter
    const g = stepGust(step || 0.1);
    const turb = smoothstep(0.6, 1, g) * 0.35 * ctx.noise.noise2(t * 1.6 + turbPh, 0.5);
    const duck = 1 - 0.5 * swellSm, dark = 1 - 0.3 * swellSm;
    bedG.gain.setTargetAtTime(BED_LVL * openness * g * (1 + turb) * (1 - 0.8 * shelter) * (1 + 0.12 * hurrySm) * duck, now, 0.3);
    const cut = (1300 + 1400 * g) * (1 + 0.1 * high) * (1 + 0.12 * hurrySm) * dark;
    bedLP.frequency.setTargetAtTime(cut, now, 0.4); bedLP2.frequency.setTargetAtTime(cut * 1.2, now, 0.4);
    const open2 = (1 - shelter) * (1 - shelter);
    for (const w of whistles) {
      w.lag += (g - w.lag) * w.k; // the whistle trails the gust
      const on = smoothstep(0.4, 0.9, w.lag);
      w.g.gain.setTargetAtTime(BED_LVL * w.lvl * openness * on * open2 * (1 + 0.6 * turb) * (1 - swellSm), now, 0.3);
      w.bp.frequency.setTargetAtTime((300 + 900 * w.lag) * w.ratio * dark, now, 0.4);
      w.pn.pan.setTargetAtTime(clamp(w.pan + 0.25 * ctx.noise.noise2(t * 0.05 + w.ph, 2.5), -0.6, 0.6), now, 1);
    }
    canG.gain.setTargetAtTime(BED_LVL * CANOPY_LVL * wood * (0.25 + 0.75 * g) * duck, now, 0.4);
    windBus.gain.setTargetAtTime(WIND_BUS, now, 1.5);
    f.wood = wood; f.inKeep = inKeep; f.swellSm = swellSm; f.gust = g;
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
