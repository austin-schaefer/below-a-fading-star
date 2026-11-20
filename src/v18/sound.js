// The wood heard (v18-F5): what the Deodand Wood's new things sound like. Started from src/v10/sound.js beside the other
// places' sounds; its own rng (18050), so nothing it does moves another part's draws. Every emitter stands where the plan
// or a module put the thing it is the sound of (the Florilegium's ctx.florilegium, the Lower Beds' plan rows, the
// stilters' 'stilter' events); the owl's roosts are fixed in the wood, and the litter's creature keeps to the walker's
// side because it is a thing that follows. Pitched things sit in D (palette.md). Culled by distance and by the walker's
// height (under the ground only the Beds' sounds, and the glass dully); the low tier gets the same sounds with shorter bouts.
//
//   the Florilegium  the glass     thin high ticking and ringing as panes cool and moths strike them: a dry tick, now and
//                                  then a small ring on D6, F6 or A6 (an inharmonic partial over it), a moth's soft knock.
//                                  Bouts of one to four a breath apart, then 3-22 s. Detail, 56 m: heard from about 40 m
//                  the petals      the faint dry rustle of big petals when the heads turn: a bed of pink noise whose level
//                                  follows how fast the heads are turning (ctx.florilegium.turn); at the gutter, when they
//                                  all turn west, one soft concerted rustle. Bed, 32 m
//                  the flask       the stored noon's hum, very low: D2 and its octave 0.7 Hz sharp (a slow beat; a fifth beside it rendered rough at 37 Hz). Bed, 24 m
//   the Lower Beds   the vault      a drip into a puddle, one to three, deeper and rounder than the Wellward Way's, then
//                                  6-32 s. Detail, in the vault and its stair
//                  the roots       along the way under the wood, from the roof some metres off: a slow creak and a wet
//                                  tick after it, as of something drinking. Detail, 30 m, 12-80 s apart
//                  the chamber     the glass's ticking heard dully through the grate overhead (a lowpass at 900 Hz,
//                                  from the grate): the glasshouse's own sounds, under the ground, are only this
//   the stilters     a step         a deep creak of green wood and a soft heavy set-down, where the stilter stands (the
//                                  'stilter' event's place), heard and not seen: not every move, never twice within 5 s;
//                                  at the gutter's ring a few seconds of them from all round, then nothing. The grove is a
//                                  little quieter than the wood (ctx.woodSound.grove, read by the canopy in bed.js)
//   the wood         the owl        a far hoot from a roost inside the wood, 60-140 m off, muffled and wet, sometimes
//                                  answered; on the far calls' shared clock
//                  the litter      something small in the leaf-litter near the walker that runs while they walk and stops
//                                  when they stop: a dry grain scuttle, now and then, in the wood
//
// Cues, for the tests and any caller that wants one by hand: act-wood-glass (opts.ring, opts.moth, opts.dull),
// act-wood-petals, act-wood-step, act-wood-ring (the gutter's five), act-wood-drip, act-wood-root, act-wood-owl, act-wood-litter. ?woodsound=0 leaves it silent.
// ctx.woodSound = { grove, state }.
import { caller } from '../audio/calls.js';
import { GLASSHOUSE, FLORILEGIUM, GROVE, BEDS } from './plan.js';

const D2 = 73.42, D4 = 293.66, A4 = 440.0, D5 = 587.33, F5 = 698.46, D6 = 1174.66, F6 = 1396.91, A6 = 1760.0;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const ss = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const tgt = (param, v, t, k) => { if (Number.isFinite(v) && Number.isFinite(t) && Number.isFinite(k)) param.setTargetAtTime(v, t, k); };

// the Lower Beds' rows (src/v18/plan.js BEDS), with the plan's numbers as F3 wrote them where this branch's plan has not
// got them yet
const VAULT = BEDS.vault || { x0: -262.5, x1: -256.5, z0: 158.5, z1: 168.5, y: -8.4 };
const WAY = BEDS.way || { pts: [[-259.5, 158.5], [-259.5, 155.2], [-258.6, 151.5], [-261.5, 145.5], [-267, 141], [-269, 136.5], [-266.2, 130.2]], half: 0.85, height: 2.7 };
const CHAMBER = BEDS.chamber || { x: -265, z: 126, r: 4.5, y: -9.0 };
const GRATE = BEDS.grate || { x: -258.0, z: 126.0, top: -3.25 };

// the way's polyline: the nearest point to (x, z), { x, z, d, s, len } (s: the length along), and the point at length s
function wayNearest(x, z) {
  const P = WAY.pts; let best = { x: P[0][0], z: P[0][1], d: Infinity, s: 0 }, run = 0;
  for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1;
    const u = clamp(((x - ax) * dx + (z - az) * dz) / (L * L), 0, 1), px = ax + dx * u, pz = az + dz * u, d = Math.hypot(x - px, z - pz);
    if (d < best.d) best = { x: px, z: pz, d, s: run + L * u };
    run += L;
  }
  best.len = run; return best;
}
function wayAt(s) {
  const P = WAY.pts; let run = 0;
  for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], L = Math.hypot(bx - ax, bz - az) || 1;
    if (s <= run + L || i === P.length - 1) { const u = clamp((s - run) / L, 0, 1); return [ax + (bx - ax) * u, az + (bz - az) * u]; }
    run += L;
  }
  return P[P.length - 1];
}

export function startWoodSound(a, ctx) {
  const off = { cue: () => false };
  if (new URL(location.href).searchParams.get('woodsound') === '0') return off;
  const { ac, voice, filt, chain, pink, brown, loopSrc, panned, gainOf } = a;
  if (!voice || !loopSrc || !panned) return off;
  const rng = ctx.makeRng(18050), low = ctx.quality === 'low';
  const jit = (x, k = 0.03) => x * (1 + (rng() * 2 - 1) * k);
  const span = (lo, hi) => lo + rng() * (hi - lo);
  const cam = ctx.camera.position, W = a.landmarks.wood;
  const dist = (p) => Math.hypot(p.x - cam.x, p.y - cam.y, p.z - cam.z);
  const dxz = (x, z) => Math.hypot(x - cam.x, z - cam.z);

  // ---- where things are
  const G = GLASSHOUSE, floor = FLORILEGIUM.floor;
  const glassC = () => ctx.florilegium?.centre || G;
  const grate = { x: GRATE.x, y: GRATE.top - 0.15, z: GRATE.z };
  const flaskAt = () => { const f = ctx.florilegium?.flask; return f ? { x: f[0], y: f[1], z: f[2] } : { x: G.x, y: floor + 2.2, z: G.z }; };
  const vaultDrip = { x: (VAULT.x0 + VAULT.x1) / 2 + 1.1, y: VAULT.y + 0.05, z: VAULT.z0 + 2.2 };
  const roosts = [-2.6, -1.9, -1.2, -0.5, 0.2, 0.9, 1.6, 2.3].map((ang, i) => { const r = W.r * (0.35 + 0.15 * (i % 3)); const x = W.x + Math.cos(ang) * r, z = W.z + Math.sin(ang) * r; return { x, y: (ctx.terrain.heightAt(x, z) || 0) + 11, z }; });
  // under the ground: the feet more than 2.2 m below the ground over them (the wood's ground itself lies low, near -4 by
  // the glasshouse, so the eye's height alone says nothing); read once a tick
  let isUnder = false;
  const under = () => isUnder;
  const surface = () => !isUnder;
  const inWood = () => dxz(W.x, W.z) < W.r - 5 && (ctx.terrain.biomeAt(cam.x, cam.z)?.wood ?? 1) > 0.3;

  // ---- the one-shot kit: placed voices, grains of noise from this module's own stream
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
  const say = (pos, o) => voice(pos, { roll: 1, air: 60, ...o });

  // ---- the glass: ticks, rings, a moth's knock. dull: heard through the grate from under the ground
  function glassAt(dull) {
    if (dull) return { x: grate.x + span(-0.4, 0.4), y: grate.y, z: grate.z + span(-0.4, 0.4) };
    const c = glassC(), toV = Math.atan2(cam.z - c.z, cam.x - c.x), ang = toV + span(-1.3, 1.3), r = 9.5; // the panes on the visitor's side
    return { x: c.x + Math.cos(ang) * r, y: floor + span(1.4, 4.2), z: c.z + Math.sin(ang) * r };
  }
  function glass(kind, dull = false, pos = null) {
    const p = pos || glassAt(dull);
    const v = say(p, { ref: dull ? 2.5 : 4, range: dull ? 40 : 56, dur: kind === 'ring' ? 2.2 : 0.5, verb: dull ? 0.7 : 0.3, air: dull ? 30 : 75, gain: dull ? 9 : 12 }); if (!v) return;
    const out = filt('lowpass', dull ? 900 : 3600, 0.6); out.connect(v.in);
    const t0 = v.t0, k = dull ? 1.1 : 1;
    if (kind === 'ring') {
      // a pane settling: a small bell of glass on D minor's top (D6, F6, A6), a faint inharmonic partial over it, gone in a second
      const f = [D6, F6, A6][Math.floor(rng() * 3)] * jit(1, 0.003), pk = 0.026 * jit(1, 0.2) * k;
      grain(v, out, t0, jit(2600, 0.1), 3, pk * 1.1, 0.003, 0.02);
      tone(v, out, f, t0 + 0.002, pk, 0.012, jit(0.9, 0.3));
      tone(v, out, f * 2.76, t0 + 0.002, pk * 0.22, 0.012, 0.35);
      tone(v, out, f * 1.505, t0 + 0.004, pk * 0.1, 0.012, 0.5);
    } else if (kind === 'moth') {
      grain(v, out, t0, jit(1500, 0.15), 2, 0.012 * k * jit(1, 0.3), 0.004, 0.03);
      grain(v, out, t0 + 0.003, jit(520, 0.1), 1.5, 0.008 * k, 0.004, 0.04);
    } else {
      grain(v, out, t0, jit(2900, 0.12), 4, 0.03 * k * jit(1, 0.25), 0.003, 0.014);
      grain(v, out, t0 + 0.002, jit(1250, 0.1), 2, 0.01 * k, 0.003, 0.03);
    }
  }
  const pickKind = () => { const u = rng(); return u < 0.55 ? 'tick' : u < 0.8 ? (low ? 'tick' : 'moth') : 'ring'; };

  // ---- the gutter's concerted rustle: every head turning west at once
  function concerted(pos) {
    const c = glassC(), v = say(pos || { x: c.x, y: floor + 2.2, z: c.z }, { ref: 5, range: 90, dur: 4.5, verb: 0.35, air: 60, gain: 12 }); if (!v) return;
    const out = filt('lowpass', 2800, 0.6); out.connect(v.in);
    const t0 = v.t0, g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.9); g.gain.linearRampToValueAtTime(0.03, t0 + 1.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.0); g.gain.linearRampToValueAtTime(0, t0 + 4.02);
    chain(nsrc(v, pink, t0, 4.1), filt('bandpass', 1500, 0.8), g, out);
    for (let i = 0; i < 6; i++) grain(v, out, t0 + span(0.1, 2.2), jit(1100, 0.3), 1.2, 0.012 * jit(1, 0.4), 0.05, 0.2);
  }

  // ---- the vault's drip and the roots' drinking
  function drip(pos) {
    const v = say(pos || vaultDrip, { ref: 2, range: 26, dur: 1.8, verb: 0.5, air: 40, gain: 6 }); if (!v) return;
    const t0 = v.t0, f = [A4, D5, F5][Math.floor(rng() * 3)] * (1 + (rng() - 0.5) * 0.012);
    const out = filt('lowpass', 2200, 0.6); out.connect(v.in);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(jit(0.018, 0.2), t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22); g.gain.linearRampToValueAtTime(0, t0 + 0.23);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 0.9, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.1);
    chain(o, g, out); o.start(t0); o.stop(t0 + 0.26); v.srcs.push(o);
    grain(v, out, t0, jit(850, 0.1), 2.2, 0.01, 0.004, 0.05);
  }
  // a point on the roof of the way, 5-14 m along it from where the walker is nearest (either side); the way's floor
  // falls from the vault's y to the chamber's along its length
  function rootAt() {
    const n = wayNearest(cam.x, cam.z), s = clamp(n.s + (rng() < 0.5 ? -1 : 1) * span(5, 14), 0, n.len), [x, z] = wayAt(s);
    return { x, y: VAULT.y + (CHAMBER.y - VAULT.y) * (s / n.len) + WAY.height * 0.85, z };
  }
  // a root drinking: a slow creak (stick-slip grains at an easing rate near 190 Hz, lowpassed) and, after it, a wet tick
  function root(pos) {
    const p = pos || rootAt();
    const v = say(p, { ref: 2.5, range: 30, dur: 3.4, verb: 0.7, air: 40, gain: 14 }); if (!v) return;
    const out = filt('lowpass', 900, 0.6); out.connect(v.in);
    const t0 = v.t0, len = span(1.0, 1.8), f0 = jit(190, 0.1);
    for (let t = t0; t < t0 + len; ) {
      const u = (t - t0) / len;
      grain(v, out, t, f0 * (1 + 0.25 * u) * jit(1, 0.04), 7, 0.026 * Math.sin(Math.PI * Math.min(1, u * 1.08)) + 0.003, 0.006, 0.035);
      t += 0.07 + 0.08 * u + rng() * 0.04;
    }
    const wt = t0 + len + span(0.5, 1.1);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, wt); g.gain.linearRampToValueAtTime(0.03, wt + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, wt + 0.14); g.gain.linearRampToValueAtTime(0, wt + 0.15);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(jit(210, 0.1), wt); o.frequency.exponentialRampToValueAtTime(140, wt + 0.12);
    chain(o, g, out); o.start(wt); o.stop(wt + 0.17); v.srcs.push(o);
    grain(v, out, wt, jit(520, 0.1), 2.5, 0.014, 0.004, 0.06);
  }

  // ---- the stilters: a creak of green wood and the set-down, where the event put it
  const S = { last: -99, ring: 0, queue: [] };
  function stilterStep(p, k = 1, h = 11) {
    const v = say({ x: p.x, y: p.y + 1.6, z: p.z }, { ref: 4, range: 50, dur: 3.2, verb: 0.45, air: 45, gain: 9 }); if (!v) return;
    const out = filt('lowpass', 800, 0.6); out.connect(v.in);
    const t0 = v.t0, len = span(0.8, 1.4), f0 = jit(150, 0.12), hi = (h || 11) / 11;
    // the creak: a long green bough taking weight, stick-slip grains slowing, 130-200 Hz
    for (let t = t0 + 0.05; t < t0 + len; ) {
      const u = (t - t0) / len;
      grain(v, out, t, f0 * (1 + 0.3 * u) * jit(1, 0.05), 1.8, (0.09 * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 0.01) * k * jit(1, 0.4), 0.02, 0.11);
      t += 0.09 + 0.1 * u + rng() * 0.08;
    }
    // the set-down: a soft heavy thud, the root-feet taking the ground, a little earth under it
    const dt = t0 + len + span(0.15, 0.4), pk = 0.2 * k * jit(1, 0.15);
    grain(v, out, dt, jit(95 / hi, 0.08), 1.4, pk, 0.012, 0.22, brown);
    grain(v, out, dt + 0.01, jit(260, 0.1), 1.6, pk * 0.35, 0.01, 0.1);
    grain(v, out, dt + 0.12, jit(900, 0.2), 1.0, 0.007 * k, 0.04, 0.5); // a little shed bark and leaf after it, from the arms
  }
  function stilterTurn(p) { // only a creak: it turned where it stood
    const v = say({ x: p.x, y: p.y + 4, z: p.z }, { ref: 4, range: 40, dur: 1.4, verb: 0.45, air: 45, gain: 9 }); if (!v) return;
    const out = filt('lowpass', 700, 0.6); out.connect(v.in);
    const t0 = v.t0, len = span(0.5, 0.8), f0 = jit(170, 0.1);
    for (let t = t0 + 0.04; t < t0 + len; ) { const u = (t - t0) / len; grain(v, out, t, f0 * (1 - 0.15 * u), 1.8, 0.034 * Math.sin(Math.PI * Math.min(1, u * 1.1)) + 0.006, 0.008, 0.04); t += 0.08 + 0.07 * u + rng() * 0.04; }
  }
  const onStilter = (e) => {
    const d = e.detail; if (!d || !Number.isFinite(d.x) || under()) return;
    if (dxz(d.x, d.z) > 48) return;
    const now = ac.currentTime;
    if (d.kind === 'ring') {
      // at the gutter they all move: each its own set-downs spread over some seconds (3.4 at most), then nothing
      const n = low ? 1 : 2;
      for (let i = 0; i < n; i++) S.queue.push({ at: now + span(0.1, 3.4), p: d, k: 0.6 * jit(1, 0.2) });
      S.ring = now + 8;
    } else if (d.kind === 'step') {
      if (now - S.last < 5 || now < S.ring || rng() > 0.62) return;
      S.last = now; S.queue.push({ at: now + span(0, 0.15), p: d, k: 1 });
    } else if (d.kind === 'turn') {
      if (now - S.last < 5 || now < S.ring || rng() > 0.25) return;
      S.last = now; S.queue.push({ at: now, p: d, k: 1, turn: true });
    }
  };
  ctx.events?.addEventListener('stilter', onStilter);

  // ---- the owl, far, inside the wood
  let roost = -1;
  function hoot(p, gain) {
    const v = voice(p, { ref: 22, roll: 1, range: 220, air: 40, verb: 0.65, dur: 2.8 }); if (!v) return;
    for (let k = 0; k < 2; k++) {
      const at = v.t0 + k * 1.0, o = a.vOsc(v, 'sine', D4, at, at + 0.9);
      o.frequency.setValueAtTime(D4, at); o.frequency.exponentialRampToValueAtTime(220, at + 0.7);
      const g = gainOf(0); a.env(g, at, 0.085 * gain * (k ? 0.8 : 1), 0.14, 0.7);
      chain(o, g, filt('lowpass', 700, 0.5), v.in);
    }
  }
  function owlRoost() { // a roost 60-140 m off, not the last
    const ok = roosts.map((r, i) => ({ i, d: dist(r) })).filter((o) => o.d > 60 && o.d < 140 && o.i !== roost);
    return ok.length ? ok[Math.floor(rng() * ok.length)] : null;
  }

  // ---- the litter: a small thing that runs while the walker runs and stops when they stop
  const L = { until: 0, next: 0, x: 0, z: 0, wait: span(20, 60), still: 0 };
  function scuttle(pos) {
    const v = say(pos, { ref: 1.5, range: 18, dur: 0.9, verb: 0.2, air: 35, gain: 10 }); if (!v) return;
    const out = filt('lowpass', 2600, 0.6); out.connect(v.in);
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0, t = v.t0; i < n; i++, t += span(0.035, 0.1)) grain(v, out, t, jit(1500, 0.25), 2, 0.016 * jit(1, 0.35), 0.003, 0.025);
  }

  // ---- the beds: the petals' rustle and the flask's hum, made when the walker comes within reach, let go when they leave
  const B = { on: false, parts: null, quiet: -1 };
  function startBeds() {
    const parts = { srcs: [], held: [] };
    const hold = (pos, o) => { const h = panned(pos, o); parts.held.push(h); return h; };
    const c = glassC();
    const pe = hold({ x: c.x, y: floor + 2.3, z: c.z }, { ref: 3, range: 32, verb: 0.2, air: 50 });
    const pS = loopSrc(pink, rng()), pB = filt('bandpass', 1700, 0.8), pL = filt('lowpass', 2800, 0.6), pG = gainOf(0);
    chain(pS, pB, pL, pG, pe.in); parts.srcs.push(pS);
    const fk = hold(flaskAt(), { ref: 3, range: 24, verb: 0.35, air: 70 });
    const fL = filt('lowpass', 420, 0.5), fG = gainOf(0); fL.connect(fG); fG.connect(fk.in);
    const os = [[D2, 1], [D2 * 2.0 + 0.7, 0.5]].map(([f, w]) => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; chain(o, gainOf(w), fL); o.start(); return o; });
    Object.assign(parts, { pG, pB, fG, os });
    B.parts = parts; B.on = true; B.quiet = -1;
  }
  function stopBeds() {
    const P = B.parts; if (!P) return;
    const now = ac.currentTime;
    for (const s of P.srcs) { try { s.stop(now + 0.05); } catch (e) { /* stopped */ } }
    for (const o of P.os) { try { o.stop(now + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { for (const h of P.held) h.release(); }, 200);
    B.parts = null; B.on = false;
  }

  // ---- the schedulers: phrased callers, each keeping its own time whether it is heard or not
  const nearGlass = () => surface() && dxz(glassC().x, glassC().z) < 56;
  const underGlass = () => under() && dxz(G.x, G.z) < 14;
  const inVault = () => under() && cam.x > VAULT.x0 - 6 && cam.x < VAULT.x1 + 6 && cam.z > VAULT.z0 - 4 && cam.z < VAULT.z1 + 8;
  const inWay = () => under() && wayNearest(cam.x, cam.z).d < 6 && dxz(G.x, G.z) > 7;
  const callers = [
    caller(rng, { bout: [1, low ? 2 : 4], gap: [0.12, 1.1], rest: [6, 0.6, 2.5, 22], first: [1, 4], when: () => nearGlass() || underGlass() }, () => glass(pickKind(), underGlass() && !nearGlass())),
    caller(rng, { bout: [1, 3], gap: [0.5, 1.6], rest: [12, 0.5, 6, 32], first: [1, 6], when: () => inVault() }, () => drip()),
    caller(rng, { bout: [1, 1], gap: [1, 1], rest: [30, 0.5, 12, 80], first: [3, 12], when: () => inWay() }, () => root()),
    caller(rng, { bout: [1, 2], gap: [2.8, 5], rest: [150, 0.6, 60, 420], first: [25, 90], answer: { p: 0.4, delay: [1.5, 3], gain: 0.71 },
      when: () => surface() && inWood() && ac.currentTime - (a.far?.last ?? -99) > 20 && !!owlRoost() },
    (k, n, gain, ans) => {
      if (a.far) a.far.last = ac.currentTime;
      if (!ans || roost < 0) { const o = owlRoost(); if (!o) return; roost = o.i; }
      else roost = (roost + 1 + Math.floor(rng() * 3)) % roosts.length;
      hoot(roosts[roost], gain);
    }),
  ];

  const state = ctx.woodSound = { grove: 0, state: B, S };
  let acc = 0, prevMode = 'flask', turnSm = 0;
  const prevYaw = [];
  ctx.registerUpdate((dt, t) => {
    acc += dt; if (acc < 0.1) return; const step = acc; acc = 0;
    if (ac.state === 'closed') return;
    const now = ac.currentTime, fl = ctx.sky?.flicker?.value ?? 1;
    isUnder = cam.y - 1.72 < ctx.terrain.heightAt(cam.x, cam.z) - 2.2;
    // the grove's hush: the canopy is a little quieter among the stilters (bed.js)
    state.grove = under() ? 0 : 1 - ss(GROVE.r * 0.7, GROVE.r * 1.4, dxz(GROVE.x, GROVE.z));
    for (const c of callers) c.tick(step);
    // the stilters' queue: what the events asked for, when it is time
    for (let i = S.queue.length - 1; i >= 0; i--) {
      const q = S.queue[i]; if (now < q.at) continue;
      S.queue.splice(i, 1);
      if (!under()) { if (q.turn) stilterTurn(q.p); else stilterStep(q.p, q.k, q.p.h); }
    }
    // the litter: a thing near the walker that runs while they run
    const speed = ctx.player?.speed || 0, inW = surface() && inWood() && dxz(G.x, G.z) > 16;
    if (!inW) L.until = 0;
    else {
      L.still = speed < 0.4 ? L.still + step : 0;
      if (L.until <= 0) {
        if (speed > 1) L.wait -= step;
        if (L.wait <= 0 && speed > 1.2) { const ang = rng() * Math.PI * 2, r = span(4, 8); L.x = cam.x + Math.cos(ang) * r; L.z = cam.z + Math.sin(ang) * r; L.until = now + span(6, 14); L.next = now + 0.3; L.wait = span(35, 110); }
      } else if (L.still > 0.35 || now > L.until) L.until = 0;
      else if (now >= L.next) {
        const ang = rng() * 6.28; L.x += Math.cos(ang) * 0.5 + (cam.x - L.x) * 0.02; L.z += Math.sin(ang) * 0.5 + (cam.z - L.z) * 0.02;
        scuttle({ x: L.x, y: cam.y - 1.7, z: L.z }); L.next = now + span(0.35, 1.1);
      }
    }
    // the Florilegium's beds
    const c = glassC(), dG = surface() ? dxz(c.x, c.z) : 99, awake = dG < 36;
    if (awake && !B.on) startBeds();
    const T = ctx.florilegium?.turn;
    if (T) { if (T.mode === 'west' && prevMode !== 'west' && dG < 80 && surface()) concerted(); prevMode = T.mode; }
    if (B.on) {
      if (awake) B.quiet = -1; else if (B.quiet < 0) B.quiet = now;
      if (B.quiet >= 0 && now - B.quiet > 4) { stopBeds(); return; }
      const P = B.parts, wake = awake ? 1 : 0;
      // how fast the heads are turning, their mean (the turn's own state): the rustle's level
      let rate = 0;
      if (T?.S) { T.S.forEach((s, i) => { const dy = prevYaw[i] === undefined ? 0 : Math.abs(Math.atan2(Math.sin(s.yaw - prevYaw[i]), Math.cos(s.yaw - prevYaw[i]))); prevYaw[i] = s.yaw; rate += dy / step; }); rate /= Math.max(1, T.S.length); }
      turnSm += (rate - turnSm) * 0.25;
      const w = 0.5 + 0.5 * ctx.noise.noise2(t * 0.7, 18.2);
      tgt(P.pG.gain, wake * 0.13 * ss(0.03, 0.45, turnSm) * (0.6 + 0.4 * w), now, 0.25);
      tgt(P.pB.frequency, 1400 + 600 * ss(0.05, 0.6, turnSm), now, 0.3);
      // the flask: a hum that is always there and never the same, near the house only
      const hum = 0.5 + 0.5 * ctx.noise.noise2(t * 0.09, 6.6);
      tgt(P.fG.gain, wake * 0.1 * (0.65 + 0.35 * hum) * (1 - 0.3 * (1 - fl)), now, 0.9);
      P.srcs[0].playbackRate.setTargetAtTime(1 + 0.03 * ctx.noise.noise2(t * 0.11, 15.2), now, 1.5);
    }
  });

  function cue(name, pos, opts) {
    if (name === 'act-wood-glass') { glass(opts?.ring ? 'ring' : opts?.moth ? 'moth' : 'tick', !!opts?.dull, pos); return true; }
    if (name === 'act-wood-petals') { concerted(pos); return true; }
    if (name === 'act-wood-step') { stilterStep(pos || { x: cam.x + 3, y: cam.y - 1.7, z: cam.z - 4 }, 1, 11); return true; }
    if (name === 'act-wood-ring') { // the gutter's ring, as the stilters send it: five round the walker, 7-13 m off
      for (let i = 0; i < 5; i++) { const ang = i * 1.257 + 0.4, r = 7 + 1.5 * i; onStilter({ detail: { kind: 'ring', i, x: cam.x + Math.cos(ang) * r, y: cam.y - 1.7, z: cam.z + Math.sin(ang) * r, h: 11 } }); }
      return true;
    }
    if (name === 'act-wood-drip') { drip(pos); return true; }
    if (name === 'act-wood-root') { root(pos || { x: cam.x + 4, y: cam.y + 0.7, z: cam.z - 6 }); return true; }
    if (name === 'act-wood-owl') { hoot(pos || { x: cam.x + 60, y: cam.y + 8, z: cam.z - 60 }, 1); return true; }
    if (name === 'act-wood-litter') { scuttle(pos || { x: cam.x + 2, y: cam.y - 1.7, z: cam.z - 3 }); return true; }
    return false;
  }
  return { cue, state: () => ({ B, S, L }) };
}
