// The v2 and v5 one-shots (v7.2-01 split out of src/audio.js; v7.2-04 voices them next): the Carillon Flags, the
// Hypogeum's lintel, the Heliotrope Sward, the Salt-Pedlars, the Wrong Colour, the procession, the Wimpled Guest's
// heartbeat, the Sable Galley's drum, the Menology's lizards, the rooks, the bats, the wader, the biomesh, the
// Leerie's lamps, the Hawser and the Kept Fire. All are voices (a.voice: the cap counts them). startCuesV2(a)
// draws the carillon's tuning from the shared stream and returns the synths by name for cues.js's dispatcher.
export function startCuesV2(a) {
  const { ac, rng, camera, voice, vOsc, vNoise, grain, filt, gainOf, chain, env, swell, clamp, white, pink, brown } = a;
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
  function lampTick(pos) { const v = voice(pos, { ref: 6, roll: 1.2, range: 70, verb: 0.35, dur: 0.6, air: 400 }); if (!v) return; grain(v, v.in, v.t0, 3400, 7, 0.16, 0.022); grain(v, v.in, v.t0 + 0.014, 1500, 3, 0.07, 0.05); const g = ac.createGain(); swell(g, v.t0 + 0.03, 0.05, 0.07, v.t0 + 0.75); chain(vNoise(v, pink, v.t0 + 0.03, 0.75), filt('lowpass', 560, 0.7), g, v.in); }
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
  return {
    carillon, glyphShift, rustle, whimper, pedlarPass, wrongColour, procession, heartbeat, galleyDrum, skitter,
    rooksLift, batsOut, waderGone, biomeshSettle, lampTick, hawserGroan, keptFire,
  };
}
