// v7, the living: the sounds of the figures (wilderness-v5.md, "### The living's sounds (the v7 audio pass)"). The
// figure modules fire named cues (ctx.audio.cue) and audio/cues.js hands each to one function here. Register: people
// absorbed in a task nobody needs any more, heard in a dying world: dry, small, close, a little reverberant, never
// musical except the Coheirs' hum in thirds, and no words, ever.
//
// One-shots are voices (k.voice: the cap of 12 counts them), inverse distance from a reference of a few metres with
// the air's lowpass (v7.2-04: heard from where a walker would notice the figure, 20-60 m, not linear to silence):
//   taker-click 40 m, taker-murmur 25 m, coheirs-knot 40 m, sexton-bite / sexton-throw 60 m, sleeper-breath 25 m,
//   sleeper-fruit 30 m, stylite-creak 50 m (it sounds at the tor's lip, 9-10 m above the basket), accrescent-step 40 m,
//   moles-click 30 m, thurifer-chain 50 m, leerie-click 50 m, bather-pour 80 m (fired only from the rim, 20-40 m
//   above her); leerie-step 16 m and linkboy-step 12 m are footsteps by ground through audio/steps.js's stepSynth (k.figureStep).
// Every grain and partial has a real attack and a 40 ms or longer release (the soft kit, cues-v2.js).
// Loops (one voice each, outside the cap, as the fall's is): coheirs-hum and thurifer-hiss, started and stopped by the
// figures' { start } / { stop }; the link's flutter, run by distance alone (within 8 m of the Link-Boy's flame). Each
// swells in over 0.4 s and out over 0.3 s; a second start while running is ignored; each is released when its figure
// is past its range or its module is switched off (ctx.perf toggles), and opens again on return while still wanted.
// Their filters, panner and gain are built once; only the sources are made at each opening.

import { softKit } from './cues-v2.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function startLiving(k) {
  const { ac, voice, vOsc, vNoise, grain, filt, gainOf, chain, env, swell, white, pink, brown, camera, ctx } = k;
  const rng = ctx.makeRng(9170);
  const { sgrain, stone, shape } = softKit(k);
  // inverse from ref (the level at ref is the old linear law's near level), the air's lowpass (e-folding 60 m unless given)
  const lin = (range, ref, dur, verb, air = 60) => ({ ref, roll: 1, range, dur, verb, air });

  // ---------------------------------------------------------------- BY the Taker of Altitudes
  // the quadrant's click: the index arm seating in its detent (two dry ticks) and a little brass ring
  function takerClick(pos) {
    const v = voice(pos, { ...lin(40, 3, 0.4, 0.15), gain: 32 }); if (!v) return;
    const t0 = v.t0;
    sgrain(v, v.in, t0, 2400, 4, 0.12, 0.04, white, 0.003);
    sgrain(v, v.in, t0 + 0.017, 1800, 4, 0.06, 0.04, white, 0.003);
    for (const [f, a, d] of [[1760, 0.012, 0.14], [2870, 0.005, 0.08]]) stone(v, v.in, 'sine', f, t0 + 0.017, a, 0.01, d);
  }
  // a murmured number: no syllable is a syllable. A low breathy pulse (a saw under pink noise) through two formants that
  // step to a new vowel-like place on each of 3-5 pulses, the pitch falling as a figure said under the breath falls,
  // the whole lowpassed so nothing in it is intelligible
  function takerMurmur(pos) {
    const v = voice(pos, lin(25, 2.5, 1.5, 0.08)); if (!v) return;
    const t0 = v.t0, n = 3 + ((rng() * 3) | 0);
    const f1 = filt('bandpass', 450, 4), f2 = filt('bandpass', 1200, 6), lp = filt('lowpass', 1300, 0.5), sum = gainOf(1), g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    let at = t0;
    for (let i = 0; i < n; i++) {
      const len = 0.09 + rng() * 0.08, a = 0.05 * (i === n - 1 ? 0.6 : 1) * (0.8 + rng() * 0.3);
      f1.frequency.linearRampToValueAtTime(330 + rng() * 300, at + 0.03); f2.frequency.linearRampToValueAtTime(950 + rng() * 650, at + 0.04);
      g.gain.linearRampToValueAtTime(a, at + 0.025); g.gain.linearRampToValueAtTime(a * 0.5, at + len * 0.7); g.gain.linearRampToValueAtTime(0.0001, at + len);
      at += len + 0.025 + rng() * 0.04;
    }
    const D = at - t0, f0 = 104 + rng() * 10, o = vOsc(v, 'sawtooth', f0, t0, at + 0.05);
    o.frequency.setValueAtTime(f0 * 1.04, t0); o.frequency.linearRampToValueAtTime(f0 * 1.08, t0 + D * 0.3); o.frequency.exponentialRampToValueAtTime(f0 * 0.84, at);
    chain(o, gainOf(0.5), sum); chain(vNoise(v, pink, t0, D + 0.05), gainOf(0.9), sum);
    sum.connect(f1); sum.connect(f2); chain(f1, lp); chain(f2, gainOf(0.45), lp); chain(lp, g, v.in);
  }

  // ---------------------------------------------------------------- BZ the Coheirs
  // a knot drawn tight: the cord's short rising squeak through the mesh, and the knot seating
  function coheirsKnot(pos) {
    const v = voice(pos, lin(40, 4, 0.45, 0.08)); if (!v) return;
    const t0 = v.t0, bp = filt('bandpass', 700, 4), g = ac.createGain();
    bp.frequency.setValueAtTime(650 + rng() * 150, t0); bp.frequency.exponentialRampToValueAtTime(1500 + rng() * 300, t0 + 0.08);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    chain(vNoise(v, white, t0, 0.12), bp, g, v.in);
    sgrain(v, v.in, t0 + 0.09, 1900, 3, 0.05, 0.04, white, 0.003);
    const o = stone(v, v.in, 'sine', 190, t0 + 0.09, 0.03, 0.01, 0.04); o.frequency.setValueAtTime(190, t0 + 0.09); o.frequency.exponentialRampToValueAtTime(120, t0 + 0.13);
  }

  // ---------------------------------------------------------------- CF the Sexton of No One
  // the spade's bite: the blade into turf and soil (a low dull crunch), grit, and the iron's faint edge
  function sextonBite(pos) {
    const v = voice(pos, lin(60, 4, 0.5, 0.12, 120)); if (!v) return;
    const t0 = v.t0;
    const bg = ac.createGain(); env(bg, t0, 0.2, 0.004, 0.1); chain(vNoise(v, brown, t0, 0.14), filt('bandpass', 260, 1), bg, v.in);
    sgrain(v, v.in, t0, 1900, 1.2, 0.05, 0.06, pink, 0.003);
    const pg = ac.createGain(); swell(pg, t0 + 0.03, 0.035, 0.05, t0 + 0.2); chain(vNoise(v, pink, t0 + 0.03, 0.18), filt('bandpass', 850, 1.1), pg, v.in);
    stone(v, v.in, 'sine', 880, t0, 0.006, 0.01, 0.06);
  }
  // earth thrown: the swing's soft swish, then the clod lands on the heap and its crumbs patter down
  function sextonThrow(pos) {
    const v = voice(pos, lin(60, 4, 1.0, 0.12, 120)); if (!v) return;
    const t0 = v.t0, land = t0 + 0.22;
    const sg = ac.createGain(); swell(sg, t0, 0.025, 0.12, land); chain(vNoise(v, pink, t0, 0.25), filt('bandpass', 700, 0.8), sg, v.in);
    const tg = ac.createGain(); env(tg, land, 0.12, 0.004, 0.12); chain(vNoise(v, brown, land, 0.16), filt('lowpass', 320, 0.7), tg, v.in);
    const m = 14 + ((rng() * 10) | 0);
    for (let i = 0; i < m; i++) { const u = Math.pow(rng(), 1.4); sgrain(v, v.in, land + 0.01 + u * 0.45, 500 + rng() * 1700, 2 + rng() * 2, 0.045 * (1 - 0.7 * u), 0.04, pink, 0.003); }
  }

  // ---------------------------------------------------------------- CB the Long Sleeper
  // one deep breath a minute: the long inhale through the nose (a band of noise rising), the slow exhale lower
  function sleeperBreath(pos) {
    const v = voice(pos, lin(25, 3, 4.8, 0.05)); if (!v) return;
    const t0 = v.t0;
    const ib = filt('bandpass', 850, 0.8), ig = ac.createGain();
    ib.frequency.setValueAtTime(800, t0); ib.frequency.linearRampToValueAtTime(1250, t0 + 1.8);
    ig.gain.setValueAtTime(0.0001, t0); ig.gain.linearRampToValueAtTime(0.03, t0 + 1.5); ig.gain.linearRampToValueAtTime(0.0001, t0 + 2.0);
    chain(vNoise(v, pink, t0, 2.05), ib, ig, v.in);
    const e0 = t0 + 2.3, eb = filt('bandpass', 520, 0.9), eg = ac.createGain();
    eb.frequency.setValueAtTime(560, e0); eb.frequency.exponentialRampToValueAtTime(330, e0 + 2.0);
    eg.gain.setValueAtTime(0.0001, e0); eg.gain.linearRampToValueAtTime(0.04, e0 + 0.35); eg.gain.exponentialRampToValueAtTime(0.0001, e0 + 2.2);
    chain(vNoise(v, pink, e0, 2.25), eb, eg, v.in);
    const lg = ac.createGain(); swell(lg, e0, 0.03, 0.3, e0 + 1.6); chain(vNoise(v, brown, e0, 1.65), filt('lowpass', 240, 0.7), lg, v.in);
  }
  // a medlar landing: a soft dull thud on cloth or turf, and the leaves' brush as it passed
  function sleeperFruit(pos) {
    const v = voice(pos, lin(30, 3, 0.4, 0.05)); if (!v) return;
    const t0 = v.t0, o = vOsc(v, 'sine', 150, t0, t0 + 0.16), og = ac.createGain();
    o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(68, t0 + 0.07); env(og, t0, 0.09, 0.005, 0.08); chain(o, og, v.in);
    const ng = ac.createGain(); env(ng, t0, 0.05, 0.003, 0.05); chain(vNoise(v, pink, t0, 0.09), filt('lowpass', 900, 0.7), ng, v.in);
    sgrain(v, v.in, t0, 1800, 1.5, 0.01, 0.04, pink, 0.003);
  }

  // ---------------------------------------------------------------- CI the Stylite
  // the rope's creak through his hand and over the lip: stick-slip, a train of pulses through two resonances, its
  // rate wandering and its grip catching in uneven steps
  function styliteCreak(pos) {
    const v = voice(pos, lin(50, 6, 0.8, 0.25)); if (!v) return;
    const t0 = v.t0, D = 0.3 + rng() * 0.25, f0 = 50 + rng() * 25;
    const o = vOsc(v, 'sawtooth', f0, t0, t0 + D + 0.05), soft = filt('lowpass', 1400, 0.7);
    o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * (1.5 + rng() * 0.5), t0 + D * 0.55); o.frequency.linearRampToValueAtTime(f0 * 1.15, t0 + D);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.03, t0 + 0.03);
    for (let tt = t0 + 0.05; tt < t0 + D - 0.04; tt += 0.03 + rng() * 0.05) g.gain.linearRampToValueAtTime(0.008 + 0.03 * rng(), tt);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
    // v7.2-04: the pulse train's resonances at Q 3 and 4 (not 5 and 6), the upper one an octave lower, under 2.4 kHz
    const sum = gainOf(1); chain(o, soft, sum); chain(sum, filt('bandpass', 1050, 3), g); chain(sum, filt('bandpass', 1600, 4), gainOf(0.5), g); chain(g, filt('lowpass', 2400, 0.6), v.in);
    sgrain(v, v.in, t0, 1600, 2, 0.015, 0.04, pink, 0.003);
  }

  // ---------------------------------------------------------------- CL the Accrescent
  // ice in a glass: a few small clinks of high inharmonic partials, and a crackle of crystal taking the step
  function accrescentStep(pos) {
    // v7.2-04: the clinks lower (1.2-1.8 kHz, the top partial gone), 10 ms in; the crackle at 1.5-2.4 kHz
    const v = voice(pos, lin(40, 3, 1.4, 0.35)); if (!v) return;
    const t0 = v.t0, n = 3 + ((rng() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const at = t0 + Math.pow(rng(), 1.3) * 0.55, f = 1200 + rng() * 600, a = 0.012 * (0.5 + rng() * 0.5);
      for (const [r, ra, d] of [[1, 1, 0.28], [2.32, 0.25, 0.16]]) stone(v, v.in, 'sine', f * r, at, a * ra, 0.01, d);
    }
    for (let i = 0; i < 6; i++) sgrain(v, v.in, t0 + rng() * 0.4, 1500 + rng() * 900, 3, 0.006, 0.04, white, 0.003);
  }

  // ---------------------------------------------------------------- CT the Tesserine Moles
  // a tessera turned against another: stone on stone, small and dry
  function molesClick(pos) {
    // v7.2-04: scaled at the source (0.35 -> 0.16), 3 ms in, the tick at 1.8-2.6 kHz; heard to 30 m
    const v = voice(pos, lin(30, 2, 0.2, 0.03)); if (!v) return;
    sgrain(v, v.in, v.t0, 1800 + rng() * 800, 3, 0.16, 0.04, white, 0.003);
    sgrain(v, v.in, v.t0, 900 + rng() * 300, 1.5, 0.12, 0.05, pink, 0.003);
  }

  // ---------------------------------------------------------------- CD the Little Thurifer
  // the censer's chain at each end of the swing: links settling (a few tiny metal grains) and the bowl's small ring
  function thuriferChain(pos) {
    const v = voice(pos, lin(50, 4, 0.6, 0.2)); if (!v) return;
    const t0 = v.t0, n = 4 + ((rng() * 4) | 0);
    for (let i = 0; i < n; i++) sgrain(v, v.in, t0 + Math.pow(rng(), 1.5) * 0.09, 1200 + rng() * 1000, 4, 0.03 + rng() * 0.03, 0.04, white, 0.003);
    for (const [f, a, d] of [[1650, 0.006, 0.3], [2730, 0.0015, 0.2]]) stone(v, v.in, 'sine', f * (1 + (rng() - 0.5) * 0.01), t0 + 0.02, a, 0.01, d);
  }

  // ---------------------------------------------------------------- CG the Leerie
  // the pole's hook on the lamp-cage: a hard little tap, the iron cage's ring, the door's rattle
  function leerieClick(pos) {
    const v = voice(pos, lin(50, 4, 0.7, 0.25)); if (!v) return;
    const t0 = v.t0;
    sgrain(v, v.in, t0, 2200, 4, 0.1, 0.04, white, 0.003);
    for (const [f, a, d] of [[1870, 0.012, 0.35], [3020, 0.006, 0.22]]) stone(v, v.in, 'sine', f, t0, a, 0.01, d);
    sgrain(v, v.in, t0 + 0.06, 1900, 4, 0.03, 0.04, white, 0.003); sgrain(v, v.in, t0 + 0.085, 1700, 4, 0.018, 0.04, white, 0.003);
  }

  // ---------------------------------------------------------------- CE the Bather
  // water poured from a cupped hand eight metres tall: a falling band of water, bubbling, and the splash back into the pool
  function batherPour(pos) {
    const v = voice(pos, lin(80, 12, 2.4, 0.5, 120)); if (!v) return;
    const t0 = v.t0, D = 1.4;
    const wg = ac.createGain(); wg.gain.setValueAtTime(0.0001, t0); wg.gain.linearRampToValueAtTime(0.06, t0 + 0.25); wg.gain.linearRampToValueAtTime(0.045, t0 + D - 0.3); wg.gain.exponentialRampToValueAtTime(0.0001, t0 + D);
    chain(vNoise(v, pink, t0, D), filt('bandpass', 1400, 0.8), wg, v.in);
    const n = 18 + ((rng() * 10) | 0);
    for (let i = 0; i < n; i++) {
      const at = t0 + 0.1 + rng() * (D - 0.25), f = 500 + rng() * 900, o = vOsc(v, 'sine', f, at, at + 0.06), g = ac.createGain();
      o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 1.6, at + 0.03); shape(g, at, 0.012 + rng() * 0.018, 0.005, 0.04); chain(o, g, v.in);
    }
    const sg = ac.createGain(); swell(sg, t0 + 0.3, 0.05, 0.4, t0 + D + 0.6); chain(vNoise(v, pink, t0 + 0.3, D + 0.3), filt('bandpass', 600, 0.7), sg, v.in);
  }

  // ---------------------------------------------------------------- loops
  const loops = {};
  const modOff = (m) => { const t = ctx.perf?.toggles?.[m]; return t ? !t.get() : false; };
  function makeLoop(name, o) {
    const L = loops[name] = { name, want: false, on: false, range: o.range, mod: o.mod, follow: o.follow || null, x: 0, y: 0, z: 0, srcs: [], out: null, pan: null, into: null, opens: 0, closes: 0 };
    return L;
  }
  function built(L, o) { // the persistent part: into -> ... -> out -> panner -> cue bus (and a reverb send)
    if (L.out) return;
    L.out = gainOf(0.0001);
    L.pan = ac.createPanner(); L.pan.panningModel = 'equalpower'; L.pan.distanceModel = 'linear'; L.pan.refDistance = o.ref; L.pan.rolloffFactor = 1; L.pan.maxDistance = L.range;
    chain(L.out, L.pan, k.cueBus); if (o.verb) chain(L.pan, gainOf(o.verb), k.verbIn);
    L.into = o.build(L.out);
  }
  function open(L) {
    if (L.on) return;
    L.on = true; L.opens++;
    const now = ac.currentTime, g = L.out.gain;
    L.make(L, now);
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, 0.0001), now); g.linearRampToValueAtTime(L.level, now + 0.4);
  }
  function close(L) {
    if (!L.on) return;
    L.on = false; L.closes++;
    const now = ac.currentTime, g = L.out.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, 0.0001), now); g.linearRampToValueAtTime(0.0001, now + 0.3);
    const s = L.srcs; L.srcs = [];
    for (const n of s) { if (n.stop) { try { n.stop(now + 0.35); } catch (e) { /* not started */ } } }
    setTimeout(() => { for (const n of s) { try { n.disconnect(); } catch (e) { /* gone */ } } }, 600);
  }
  const dist = (L) => { const c = camera.position, dx = L.x - c.x, dy = L.y - c.y, dz = L.z - c.z; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  function place(L, p) { if (!p) return; L.x = p.x; L.y = p.y; L.z = p.z; if (L.pan) k.setPos(L.pan, L.x, L.y, L.z); }
  function loopCue(L, pos, opts, def) {
    if (opts?.stop) { L.want = false; close(L); return; }
    if (L.want && L.on) return; // a second start while running: ignored
    L.want = true; built(L, def); place(L, pos);
    if (dist(L) <= L.range && !modOff(L.mod)) open(L);
  }
  // the Coheirs' hum (design gap 10: a minor third, 6:5, for good): two wordless voices through closed lips, one
  // drift moving both together so the interval never changes, each its own slight vibrato
  // v7.2-04: on A3 and the C above (still 6:5), the buzz darkened under a lowpass before its formants (Q 5 and 4)
  const HUM = { ref: 3, verb: 0.25, build(out) { const lp = filt('lowpass', 750, 0.6), sum = filt('lowpass', 700, 0.7), f1 = filt('bandpass', 260, 5), f2 = filt('bandpass', 1100, 4); chain(sum, f1, lp); chain(sum, f2, gainOf(0.2), lp); lp.connect(out); return sum; } };
  const hum = makeLoop('coheirs-hum', { range: 25, mod: 'living-workers' }); hum.level = 0.06;
  hum.make = (L, now) => {
    const drift = vSrc(L, ac.createOscillator(), now); drift.frequency.value = 0.045; const dg = held(L, gainOf(70)); drift.connect(dg);
    for (const [f, vib] of [[220, 4.7], [220 * 6 / 5, 5.3]]) { // A3 and the C a minor third above: two women humming low
      const o = vSrc(L, ac.createOscillator(), now); o.type = 'sawtooth'; o.frequency.value = f; dg.connect(o.detune);
      const lv = vSrc(L, ac.createOscillator(), now); lv.frequency.value = vib; chain(lv, held(L, gainOf(9)), o.detune);
      o.connect(L.into);
    }
  };
  // the Thurifer's robes: a long hiss of cloth over grass while it walks, wandering a little; it follows the figure
  // v7.2-04: the cloth's hiss lower and darker (900 Hz up, centred at 1.8 kHz, under 3.5 kHz), out of the ear's sharpest band
  const HISS = { ref: 2, verb: 0.1, build(out) { const hp = filt('highpass', 900, 0.7), am = gainOf(0.75); chain(hp, filt('bandpass', 1800, 0.6), filt('lowpass', 3500, 0.6), am, out); HISS.am = am; return hp; } };
  const hiss = makeLoop('thurifer-hiss', { range: 20, mod: 'living-walkers', follow: () => ctx.walkers?.thurifer?.root?.position }); hiss.level = 0.05;
  hiss.make = (L, now) => {
    const s = vSrc(L, ac.createBufferSource(), now, pink); s.connect(L.into);
    const lfo = vSrc(L, ac.createOscillator(), now); lfo.frequency.value = 0.3 + rng() * 0.2; chain(lfo, held(L, gainOf(0.25)), HISS.am.gain);
  };
  // the link's flame: a faint low flutter, within 8 m of it, while he and it are there
  const FLUT = { ref: 1, build(out) { const am = gainOf(0.5), bp = filt('bandpass', 420, 0.7); chain(bp, am, filt('lowpass', 900, 0.7), out); FLUT.am = am; return bp; } };
  const flutter = makeLoop('link-flutter', { range: 8, mod: 'living-walkers', follow: () => ctx.walkers?.linkBoy?.light?.position }); flutter.level = 0.035;
  flutter.make = (L, now) => {
    const s = vSrc(L, ac.createBufferSource(), now, pink); s.connect(L.into);
    for (const [f, a] of [[9.1, 0.3], [13.7, 0.2]]) { const lfo = vSrc(L, ac.createOscillator(), now); lfo.frequency.value = f; chain(lfo, held(L, gainOf(a)), FLUT.am.gain); }
  };
  const held = (L, n) => { L.srcs.push(n); return n; }; // a node made at an opening, disconnected at its closing
  function vSrc(L, s, now, buf) { if (buf) { s.buffer = buf; s.loop = true; s.start(now, rng() * buf.duration); } else s.start(now); L.srcs.push(s); return s; }

  // 10 Hz from audio.js's tick (and its clock-driven fallback): follow, release past range or with the module off, reopen
  function tick() {
    for (let i = 0; i < LOOPS.length; i++) {
      const L = LOOPS[i];
      if (L.follow) { const p = L.follow(); if (p) place(L, p); }
      if (L === flutter) { const B = ctx.walkers?.linkBoy; const lit = !!(B && B.root?.visible && B.light?.intensity > 0); if (lit !== L.want) { L.want = lit; if (lit) built(L, FLUT); else close(L); } }
      if (!L.out) continue;
      const ok = dist(L) <= L.range && !modOff(L.mod);
      if (L.on && !ok) close(L); else if (!L.on && L.want && ok) open(L);
    }
  }
  const LOOPS = [hum, hiss, flutter];

  // v7.2-04: a figure's steps are near detail, under the walker's own: the Leerie's at 0.4 to 16 m, the Link-Boy's at 0.3 to 12 m
  const LEERIE_STEP = { vol: 0.4, range: 16, ref: 1.5, gain: 2.5 }, LINKBOY_STEP = { vol: 0.3, range: 12, ref: 1, gain: 10 };
  return {
    loops, tick,
    takerClick, takerMurmur, coheirsKnot, sextonBite, sextonThrow, sleeperBreath, sleeperFruit, styliteCreak, accrescentStep,
    molesClick, thuriferChain, leerieClick, batherPour,
    leerieStep: (pos) => k.figureStep(pos, LEERIE_STEP), linkboyStep: (pos) => k.figureStep(pos, LINKBOY_STEP),
    hum: (pos, opts) => loopCue(hum, pos, opts, HUM), hiss: (pos, opts) => loopCue(hiss, pos, opts, HISS),
  };
}
