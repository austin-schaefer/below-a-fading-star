// The Lappet's sound (v15-L1): the village under Carcanet Keep heard by quarter, beside the valley's bed (which goes on
// over it: the wind is sheltered under the main, in the Gullet and in the Slype). Started from src/v10/sound.js with
// the other places' sounds; its own rng (15240), so nothing it does moves another part's draws. Every emitter stands
// where the plan or a quarter put the thing it is the sound of; nothing is placed by bearing from the walker. All
// pitched things sit in D (palette.md). No cues: each sound is the place's, scheduled here by where the listener is.
//
//   the Quarrels   the kiln's draw     the Smoking Saint's fire breathing at his stoke hole: a low roar under 300 Hz
//                                      that surges with the gusts (a kiln draws harder in wind). Bed, 35 m
//                  the kiln's tick     hot limestone settling: one to four dry ticks a breath apart, then 4-14 s of
//                                      nothing. Detail, 18 m
//                  the chisel          a mason dressing the new house's stone, far off: three to seven blows of a
//                                      mallet on a chisel at uneven spacing (0.5-1.2 s: a hand, never a rhythm), then a
//                                      rest of 14-70 s (lognormal). Detail, 75 m: heard faintly from the Lees
//   the Rungs      the Tenter's cloth  the dyers' lengths on their poles: a soft rustle that follows the gusts, and at a
//                                      gust's crest one or two slow flaps. Detail, 28 m
//                  the vats            a drip from a hung length into a dye vat in phrases (one to three, a breath
//                                      apart, then 6-28 s), pitched on A4, D5 and F5 a little out of true, deeper and
//                                      rounder than the Wellward Way's. Detail, 22 m
//   the Lees       the Fountain of Noon stored daylight: three narrow bands of noise on D5, A5 and D6 (never a tone),
//                                      each wandering in level on its own 9-23 s, so the chord is always there and never
//                                      the same; it brightens at the gutter, when it is the light that is left. Under it
//                                      a slow welling (soft swells on the world's noise, never on a period). Bed, 30 m
//                  the spout, the gutter a trickle (pink noise whose level babbles under a 30 Hz random envelope) and
//                                      the overflow's gurgle in the stone gutter, lower and sparser. Bed, 22 m
//   the Pennyworth the market          small things, nobody shouting: the salt-weigher's brass pan set on its beam (a
//                                      small inharmonic ring on D6), a weight or a pot put down on a plank, the well's
//                                      sweep creaking and its bucket's knock. Each its own caller, sparse. Detail, 35 m
//                  the beans' poles    dry poles knocking together in the garden when a gust comes. Detail, 30 m
//                  the south door      the house's court leaking through the door in its south wall: warm room air,
//                                      dull, heard within 14 m of the door (the court's own voices are the house's,
//                                      src/v8/house/sound.js, heard as far as they carry). Bed
//
// And for the walker: lappetSound.step(x, y, z, on) -> 'timber' (planks: a timber flight, a bridge, the Leads'
// crossings, the gangway and the plank stair inside the main) | 'click' (the Elder treads, the Heliarch stairs, the
// squares' flags, the Gullet's packed treads) | null (the valley's own step: the Pennyworth's earth, the ramp);
// steps.js plays 'timber' with timberStep below. lappetSound.sheltered(x, y, z) 0..1 (bed.js: the wind) and
// lappetSound.stone(x, y, z) 0..1 (graph.js: the stone room) for the main walked inside, the Gullet and the Slype.
// ctx.lappetSound = { step, sheltered, stone, timberStep, emitters, state }. ?lappetsound=0 leaves the village silent of
// itself (and the steps the valley's).
import { caller } from '../audio/calls.js';

const D5 = 587.33, F5 = 698.46, A4 = 440.0, A5 = 880.0, D6 = 1174.66;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const ss = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

const TIMBER = /timber|bridge|lees-stair|tenter|leads|noon-main|stage|gangway|plank|scaffold|deck/;

export function startLappetSound(a, ctx) {
  const off = { cue: () => false };
  const lap = ctx.lappet;
  if (!lap || lap.on === false || new URL(location.href).searchParams.get('lappetsound') === '0') return off;
  const { ac, filt, gainOf, chain, pink, brown, loopSrc, panned } = a;
  if (!loopSrc || !panned) return off;
  const P = lap.plan, rng = ctx.makeRng(15240);
  const jit = (x, k = 0.03) => x * (1 + (rng() * 2 - 1) * k);
  const span = (lo, hi) => lo + rng() * (hi - lo);

  // ---- where things are (the plan's, or the quarters' when they built it elsewhere)
  const Q = P.QUARRELS, K = Q.kiln, crown = P.LEVEL.crown.y;
  const stoke = { x: K.x + K.stoke[0] * 2.2, y: crown + 0.5, z: K.z + K.stoke[1] * 2.2 };
  const nh = P.plot('new-house') || { x: Q.split.x, z: Q.split.z };
  const chisel = { x: nh.x, y: crown + 1.2, z: nh.z };
  const tenterXZ = P.at(P.RUNGS.tenter.run, P.RUNGS.tenter.s - 1.5, P.RISERS[2].D + 1.2), mid = P.LEVEL.mid.y, low = P.LEVEL.low.y;
  const tenter = { x: tenterXZ[0], y: low + 3.2, z: tenterXZ[1] };
  const dy = P.plot('rungs-dyers'), vats = dy ? { x: dy.x, y: low + 0.7, z: dy.z } : { x: tenter.x, y: low + 0.7, z: tenter.z };
  const fp = P.plot('fountain'), bench = P.LEVEL.bench.y;
  const fountain = { x: ctx.lees?.fountain?.x ?? fp.x, y: (ctx.lees?.fountain?.y ?? bench) + 1.0, z: ctx.lees?.fountain?.z ?? fp.z };
  const spout = { x: fountain.x, y: fountain.y - 0.6, z: fountain.z };
  const foot = P.LEVEL.foot.y, fx = (n) => P.fixture(n) || null;
  const salt = fx('salt-stall'), well = fx('well'), cloth = fx('cloth-stall'), garden = P.plot('pennyworth-garden'), door = P.HOUSE.door;
  const at3 = (o, y) => (o ? { x: o.x, y, z: o.z } : null);
  const E = {
    stoke, chisel, tenter, vats, fountain, spout,
    salt: at3(salt, foot + 1.0), well: at3(well, foot + 0.8), stall: at3(cloth, foot + 0.9), beans: at3(garden, foot + 1.8),
    door: { x: door.x, y: foot + 1.2, z: door.z - 0.6 },
  };
  const C = { x: 88, z: -18 }; // the village's middle, for waking it
  const cam = ctx.camera.position;
  const dist = (p) => Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z);

  // ---- the one-shot kit: placed voices, grains of noise drawn from this module's own stream
  const nsrc = (v, buf, at, dur) => { const s = ac.createBufferSource(); s.buffer = a.mono(buf); s.start(at, rng() * Math.max(0, buf.duration - dur - 0.1), dur + 0.05); v.srcs.push(s); return s; };
  function shape(g, at, peak, att, dec) {
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + att);
    const end = at + att + Math.max(0.04, dec);
    g.gain.exponentialRampToValueAtTime(0.0001, end); g.gain.linearRampToValueAtTime(0, end + 0.01);
    return end + 0.01;
  }
  function grain(v, dest, at, f, q, peak, att, dec, buf = pink) {
    const g = ac.createGain(), end = shape(g, at, peak, Math.max(0.003, att), dec);
    chain(nsrc(v, buf, at, end - at + 0.02), filt('bandpass', f, q), g, dest);
  }
  function tone(v, dest, f, at, peak, att, dec, type = 'sine') {
    const g = ac.createGain(), end = shape(g, at, peak, Math.max(0.01, att), dec);
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.start(at); o.stop(end + 0.03); v.srcs.push(o); chain(o, g, dest); return o;
  }
  const say = (pos, o) => a.voice(pos, { roll: 1, air: 60, ...o });

  // the kiln's tick: limestone settling in the heat, a dry small crack, dull (lowpassed under 3 kHz)
  function kilnTick() {
    const v = say(stoke, { ref: 2, range: 18, dur: 0.4, verb: 0.2, gain: 14 }); if (!v) return;
    const out = filt('lowpass', 2800, 0.6); out.connect(v.in);
    grain(v, out, v.t0, jit(1500, 0.15), 3, 0.05 * jit(1, 0.25), 0.003, 0.03);
    grain(v, out, v.t0 + 0.006, jit(620, 0.1), 2, 0.025, 0.003, 0.05);
  }
  // the chisel: the mallet's dull knock on the chisel's head, the edge biting the stone (a short bright grain, kept under
  // 3.5 kHz), and the chisel's own small ring on F6 and an inharmonic partial, gone in a fifth of a second
  function blow(k) {
    const v = say(chisel, { ref: 3, range: 75, dur: 0.6, verb: 0.45, air: 45, gain: 5 }); if (!v) return;
    const out = filt('lowpass', 3400, 0.6); out.connect(v.in);
    const pk = 0.06 * (k === 0 ? 0.8 : 1) * jit(1, 0.12), t0 = v.t0;
    grain(v, out, t0, jit(330, 0.06), 1.6, pk, 0.003, 0.06); // the mallet
    grain(v, out, t0 + 0.002, jit(2100, 0.08), 2.5, pk * 0.55, 0.003, 0.035); // the bite
    tone(v, out, 1396.91 * jit(1, 0.004), t0 + 0.003, pk * 0.12, 0.01, 0.18);
    tone(v, out, 1396.91 * 2.76 * jit(1, 0.004), t0 + 0.003, pk * 0.05, 0.01, 0.08);
    if (rng() < 0.35) grain(v, out, t0 + span(0.08, 0.16), jit(1300, 0.2), 1.5, pk * 0.12, 0.004, 0.09); // a chip falling
  }
  // the cloth's flap: a length lifting and dropping back against the pole, a soft low whump
  function flap(k) {
    const v = say(tenter, { ref: 3, range: 28, dur: 0.6, verb: 0.2, gain: 24 }); if (!v) return;
    const out = filt('lowpass', 1400, 0.6); out.connect(v.in);
    const t0 = v.t0, pk = 0.05 * jit(1, 0.2) * (k ? 0.8 : 1);
    grain(v, out, t0, jit(230, 0.1), 1.2, pk, 0.025, 0.12);
    grain(v, out, t0 + 0.02, jit(700, 0.15), 1.4, pk * 0.35, 0.02, 0.09);
  }
  // a drop into a vat: a round plink (deeper than the passage's: the vat is wide), a small splash
  function vatDrop() {
    const v = say(vats, { ref: 2, range: 22, dur: 0.8, verb: 0.3, air: 40, gain: 24 }); if (!v) return;
    const t0 = v.t0, f = [A4, D5, F5][Math.floor(rng() * 3)] * (1 + (rng() - 0.5) * 0.012);
    const out = filt('lowpass', 2200, 0.6); out.connect(v.in);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(jit(0.032, 0.2), t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26); g.gain.linearRampToValueAtTime(0, t0 + 0.27);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 0.78, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.09);
    chain(o, g, out); o.start(t0); o.stop(t0 + 0.3); v.srcs.push(o);
    grain(v, out, t0, jit(800, 0.1), 2.2, 0.01, 0.004, 0.05);
  }
  // the salt-weigher's pan set on the beam: a small brass ring (D6 and its inharmonic partials) over a wooden tick
  function pan() {
    const v = say(E.salt, { ref: 2, range: 35, dur: 1.4, verb: 0.25, gain: 14 }); if (!v) return;
    const out = filt('lowpass', 3200, 0.6); out.connect(v.in);
    const t0 = v.t0, pk = 0.03 * jit(1, 0.15);
    grain(v, out, t0, jit(900, 0.08), 2, pk * 0.8, 0.003, 0.03);
    for (const [r, g, d] of [[1, 1, 0.9], [2.32, 0.35, 0.5], [3.9, 0.12, 0.25]]) tone(v, out, D6 * r * jit(1, 0.003), t0 + 0.003, pk * 0.35 * g, 0.012, d);
  }
  // a weight or a pot put down on a plank: a dull knock and a short second one as it settles
  function setDown(pos) {
    const v = say(pos, { ref: 2, range: 30, dur: 0.5, verb: 0.2, gain: 16 }); if (!v) return;
    const out = filt('lowpass', 1800, 0.6); out.connect(v.in);
    const t0 = v.t0, pk = 0.05 * jit(1, 0.2);
    grain(v, out, t0, jit(260, 0.1), 1.8, pk, 0.004, 0.07);
    grain(v, out, t0 + span(0.07, 0.13), jit(380, 0.1), 2, pk * 0.35, 0.004, 0.05);
  }
  // the well's sweep: the pole's pivot creaking as it tips (stick-slip grains at an easing rate), then the bucket's knock
  function sweep() {
    const v = say(E.well, { ref: 2.5, range: 35, dur: 2.6, verb: 0.25, gain: 16 }); if (!v) return;
    const out = filt('lowpass', 2000, 0.6); out.connect(v.in);
    const t0 = v.t0, len = span(0.5, 0.8);
    let t = t0, i = 0;
    while (t < t0 + len) { const u = (t - t0) / len; grain(v, out, t, jit(560, 0.04) * (1 - 0.15 * u), 6, 0.012 * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 0.002, 0.004, 0.025); t += 0.03 + 0.05 * u + rng() * 0.012; i++; }
    const kt = t0 + len + span(0.6, 1.1);
    grain(v, out, kt, jit(300, 0.08), 1.6, 0.04, 0.005, 0.09);
    grain(v, out, kt + 0.25, jit(450, 0.1), 1.2, 0.012, 0.03, 0.2); // the water in it
  }
  // the beans' poles: two dry canes knocking, hollow, a quick pair or three
  function poles() {
    const v = say(E.beans, { ref: 2, range: 30, dur: 0.6, verb: 0.2, gain: 16 }); if (!v) return;
    const out = filt('lowpass', 2400, 0.6); out.connect(v.in);
    const t0 = v.t0, n = 2 + Math.floor(rng() * 2);
    for (let i = 0, t = t0; i < n; i++, t += span(0.06, 0.16)) { grain(v, out, t, jit(720, 0.1), 5, 0.03 * jit(1, 0.25) * (i ? 0.7 : 1), 0.003, 0.05); grain(v, out, t, jit(1450, 0.1), 4, 0.008, 0.003, 0.03); }
  }

  // ---- the schedulers: phrased callers, each keeping its own time whether it is heard or not
  const near = (p, r) => p && dist(p) < r;
  const callers = [
    caller(rng, { bout: [1, 4], gap: [0.15, 0.7], rest: [7, 0.5, 3, 16], first: [1, 5], when: () => near(stoke, 20) }, () => kilnTick()),
    caller(rng, { bout: [3, 7], gap: [0.5, 1.2], rest: [26, 0.5, 14, 70], first: [2, 8], when: () => near(chisel, 75) }, (i) => blow(i)),
    caller(rng, { bout: [1, 3], gap: [0.4, 1.4], rest: [13, 0.45, 6, 28], first: [1, 6], when: () => near(vats, 24) }, () => vatDrop()),
  ];
  if (E.salt) callers.push(caller(rng, { bout: [1, 2], gap: [0.8, 2], rest: [40, 0.5, 18, 90], first: [3, 10], when: () => near(E.salt, 36) }, () => pan()));
  if (E.stall) callers.push(caller(rng, { bout: [1, 2], gap: [0.6, 1.8], rest: [50, 0.5, 20, 110], first: [6, 14], when: () => near(E.stall, 32) }, () => setDown(E.stall)));
  if (E.well) callers.push(caller(rng, { bout: [1, 1], gap: [1, 1], rest: [45, 0.4, 25, 90], first: [8, 20], when: () => near(E.well, 36) }, () => sweep()));

  // ---- the beds: started when the walker comes within reach of the village, let go when they leave
  const B = { on: false, parts: null, quiet: -1 };
  function start() {
    const mk = (buf) => { const s = loopSrc(buf, rng()); return s; };
    const parts = { srcs: [], held: [] };
    const hold = (pos, o) => { const h = panned(pos, o); parts.held.push(h); return h; };
    // the kiln's draw
    const kiln = hold(stoke, { ref: 3, range: 60, verb: 0.3 });
    const kS = mk(brown), kL = filt('lowpass', 260, 0.7), kB = filt('bandpass', 140, 0.9), kG = gainOf(0);
    chain(kS, kB, kL, kG, kiln.in); parts.srcs.push(kS);
    // the cloth's rustle
    const cl = hold(tenter, { ref: 3, range: 45, verb: 0.2 });
    const cS = mk(pink), cB = filt('bandpass', 650, 0.8), cL = filt('lowpass', 1600, 0.6), cG = gainOf(0);
    chain(cS, cB, cL, cG, cl.in); parts.srcs.push(cS);
    // the fountain's light: three narrow bands, each its own gain
    const ft = hold(fountain, { ref: 4, range: 40, verb: 0.35 });
    const lightBus = gainOf(0), lL = filt('lowpass', 2600, 0.5); chain(lightBus, lL, ft.in);
    const bands = [D5 * 1.002, A5 * 0.998, D6 * 1.003].map((f, i) => { const s = mk(pink), b1 = filt('bandpass', f, 28), b2 = filt('bandpass', f, 28), g = gainOf(0); chain(s, b1, b2, g, lightBus); parts.srcs.push(s); return { g, f, ph: rng() * 100, w: [0.043, 0.061, 0.071][i] * jit(1, 0.1), lvl: [0.6, 0.75, 0.45][i] }; });
    // ... and its welling, low
    const wS = mk(brown), wL = filt('lowpass', 180, 0.6), wG = gainOf(0); chain(wS, wL, wG, ft.in); parts.srcs.push(wS);
    // the spout and the gutter: a trickle whose level babbles under a slow random envelope (brown noise under 30 Hz)
    const sp = hold(spout, { ref: 2, range: 26, verb: 0.25 });
    const tS = mk(pink), tB = filt('bandpass', 1150, 0.9), tL = filt('lowpass', 2400, 0.6), tG = gainOf(0), tAM = gainOf(0);
    const mS = mk(brown), mL = filt('lowpass', 28, 0.5), mK = gainOf(0.9); chain(mS, mL, mK, tAM.gain); tAM.gain.value = 0.6;
    chain(tS, tB, tL, tAM, tG, sp.in); parts.srcs.push(tS, mS);
    const gS = mk(brown), gB = filt('bandpass', 420, 1.4), gG = gainOf(0), gAM = gainOf(0.5);
    const g2S = mk(brown), g2L = filt('lowpass', 9, 0.5), g2K = gainOf(1.2); chain(g2S, g2L, g2K, gAM.gain);
    chain(gS, gB, gAM, gG, sp.in); parts.srcs.push(gS, g2S);
    // the court through the south door
    const dr = hold(E.door, { ref: 2, range: 16, verb: 0.15 });
    const dS = mk(brown), dB = filt('bandpass', 300, 0.8), dL = filt('lowpass', 650, 0.6), dG = gainOf(0); chain(dS, dB, dL, dG, dr.in); parts.srcs.push(dS);
    Object.assign(parts, { kG, kB, cG, cB, lightBus, bands, wG, tG, gG, dG });
    B.parts = parts; B.on = true; B.quiet = -1;
  }
  function stop() {
    const Pp = B.parts; if (!Pp) return;
    const now = ac.currentTime;
    for (const s of Pp.srcs) { try { s.stop(now + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { for (const h of Pp.held) h.release(); }, 200);
    B.parts = null; B.on = false;
  }

  // ---- the walker: what the floor underfoot is, and where the wind cannot reach
  const fr = { run: 0, s: 0, D: 0 };
  const onFloor = (name, x, y, z, tol = 0.35) => { const fn = lap.floors[name]; if (!fn) return false; const h = fn(x, z); return h !== null && h !== undefined && Math.abs(y - h) < tol; };
  function inSlype(x, y, z) {
    const S = P.RUNGS.slype; P.frameOf(x, z, fr);
    if (fr.run !== S.run || fr.s < S.s0 - 0.4 || fr.s > S.s1 + 0.4 || Math.abs(fr.D - S.D) > 1.6) return 0;
    return Math.abs(y - low) < 0.8 ? 1 : 0;
  }
  // y: the feet's height
  function shelterAt(x, y, z) {
    if (x < 40 || x > 125 || z < -55 || z > 40) return 0;
    if (onFloor('noon-main', x, y, z)) return 0.85;
    if (onFloor(P.RUNGS.gullet.id, x, y, z, 0.6)) return 0.6;
    return 0.7 * inSlype(x, y, z);
  }
  const lappetSound = ctx.lappetSound = {
    emitters: E, state: B,
    // y: the listener's (camera's) height
    sheltered: (x, y, z) => shelterAt(x, y - 1.72, z),
    stone: (x, y, z) => { const s = shelterAt(x, y - 1.72, z); return s > 0 ? 0.45 + 0.4 * s : 0; },
    // the walker's step on the floor `on` (controls' stacked floor underfoot, or null) at the feet (x, y, z)
    step(x, y, z, on) {
      if (x < 40 || x > 125 || z < -72 || z > 40) return null;
      const n = on?.name || '';
      if (n && TIMBER.test(n) && !/pier/.test(n)) return 'timber'; // (the bridge's pier is the aqueduct's stone)
      if (n.startsWith('lappet-') || n.startsWith('heliarch') || n === P.RUNGS.gullet.id || /-stair$/.test(n)) return 'click';
      if (n) return null;
      const lv = P.levelAt(x, z);
      return lv && lv.key !== 'foot' && P.villageAmt(x, z) > 0.5 ? 'click' : null;
    },
    // a plank underfoot: a hollow board's knock (bandpassed at 300-420 Hz, three boards), its thud under it, and now
    // and then a nail's small creak. draw: the step's recorded stream; burst(buf, dur, off, sAt): steps.js's noise.
    timberStep(r, t0, sAt, out, draw, burst) {
      const vol = r.vol, pitch = r.pitch, board = [300, 360, 420][(draw() * 3) | 0] * pitch;
      const s = burst(pink, 0.12, draw(), sAt), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = board; bp.Q.value = 3.2;
      const g = ac.createGain(); a.env(g, t0, 0.3 * vol, 0.004, 0.08); s.connect(bp); bp.connect(g); g.connect(out);
      const th = burst(pink, 0.12, draw(), sAt), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220 * pitch; lp.Q.value = 0.6;
      const tg = ac.createGain(); a.env(tg, t0, 0.32 * vol, 0.005, 0.09); th.connect(lp); lp.connect(tg); tg.connect(out);
      const sc = burst(pink, 0.06, draw(), sAt), sb = ac.createBiquadFilter(); sb.type = 'bandpass'; sb.frequency.value = 1300 * pitch; sb.Q.value = 1.4;
      const sg = ac.createGain(); a.env(sg, t0, 0.05 * vol, 0.003, 0.035); sc.connect(sb); sb.connect(sg); sg.connect(out); // the sole's scuff on the grain
      if (draw() < 0.12) { const c = burst(pink, 0.25, draw(), sAt), cb = ac.createBiquadFilter(); cb.type = 'bandpass'; cb.frequency.value = 760 * pitch; cb.Q.value = 9; const cg = ac.createGain(); a.env(cg, t0 + 0.05, 0.05 * vol, 0.03, 0.14); c.connect(cb); cb.connect(cg); cg.connect(out); }
    },
  };

  // ---- the tick: 10 Hz
  let acc = 0, gustSm = 0, prevG = 0, flaps = 0, flapNext = 0, poleNext = 0;
  ctx.registerUpdate((dt, t) => {
    acc += dt; if (acc < 0.1) return; const step = acc; acc = 0;
    if (ac.state === 'closed') return;
    const now = ac.currentTime, dC = Math.hypot(cam.x - C.x, cam.z - C.z);
    const awake = dC < 95;
    for (const c of callers) c.tick(step);
    if (awake && !B.on) start();
    if (!B.on) return;
    if (awake) B.quiet = -1; else if (B.quiet < 0) B.quiet = now;
    if (B.quiet >= 0 && now - B.quiet > 4) { stop(); return; }
    const Pp = B.parts, fl = ctx.sky?.flicker?.value ?? 1, gut = clamp((1 - fl) / 0.78, 0, 1), wake = awake ? 1 : 0;
    // the gust: the wind's slow surges, its own (two octaves of the world's noise)
    const g0 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.085, 15.24), g1 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.23, 3.9);
    const gust = clamp(g0 * 0.8 + g1 * 0.3 - 0.1, 0, 1); gustSm += (gust - gustSm) * 0.3;
    // the kiln breathes with the gusts and a slower swell of its own; a little hushed in the gutter (the wind drops)
    const draw = 0.55 + 0.45 * gustSm, sw = 0.75 + 0.25 * ctx.noise.noise2(t * 0.05, 61.3);
    Pp.kG.gain.setTargetAtTime(wake * 0.9 * draw * sw * (1 - 0.3 * gut), now, 0.6);
    Pp.kB.frequency.setTargetAtTime(110 + 60 * gustSm, now, 0.8);
    // the cloth: a rustle on the gust, and a few flaps at its crest
    const rust = ss(0.5, 0.95, gustSm) * (0.6 + 0.4 * ctx.noise.noise2(t * 0.31, 44.1));
    Pp.cG.gain.setTargetAtTime(wake * 0.4 * rust * (1 - 0.6 * gut), now, 0.35);
    Pp.cB.frequency.setTargetAtTime(520 + 300 * gustSm, now, 0.5);
    if (gust > 0.72 && prevG <= 0.72 && flaps <= 0 && dist(tenter) < 28) { flaps = 1 + Math.floor(rng() * 2); flapNext = now; }
    if (flaps > 0 && now >= flapNext) { flap(flaps & 1); flaps--; flapNext = now + span(0.35, 0.8); }
    // the beans' poles knock on a gust's rise
    if (E.beans && gust > 0.62 && prevG <= 0.62 && now >= poleNext && dist(E.beans) < 30) { poles(); poleNext = now + span(4, 9); }
    prevG = gust;
    // the loops' rates wander a little apart, so no buffer's length comes round as a period (the pink loop is 5 s: the survey heard it at the fountain)
    for (let k = 0; k < Pp.srcs.length; k++) Pp.srcs[k].playbackRate.setTargetAtTime(1 + 0.035 * ctx.noise.noise2(t * 0.11 + k * 7.3, 15.2 + k), now, 1.5);
    // the fountain: each band wanders on its own; the chord brightens at the gutter
    Pp.lightBus.gain.setTargetAtTime(wake * 2.0 * (1 + 0.8 * gut), now, 1.2);
    for (const b of Pp.bands) { const w = 0.5 + 0.5 * ctx.noise.noise2(t * b.w, b.ph); b.g.gain.setTargetAtTime(b.lvl * (0.25 + 0.75 * w * w), now, 1.5); }
    const well = Math.max(0, ctx.noise.noise2(t * 0.17, 7.7) + 0.2 * ctx.noise.noise2(t * 0.41, 2.9)) ** 2 * 1.6; // (a sine here came round every 9 s: the survey's repeat_s 5)
    Pp.wG.gain.setTargetAtTime(wake * (0.12 + 0.24 * well), now, 0.8);
    Pp.tG.gain.setTargetAtTime(wake * 0.12, now, 1);
    Pp.gG.gain.setTargetAtTime(wake * 0.12, now, 1);
    Pp.dG.gain.setTargetAtTime(wake * 0.12, now, 1);
  });
  return { cue: () => false, lappetSound };
}
