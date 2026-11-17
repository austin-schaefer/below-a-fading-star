// The water heard (v17-A1): the chain's sound, from the tarn's outflow to the garden under the mountain. Started from
// src/v10/sound.js beside the other places' sounds; its own rng (17070), so nothing it does moves another part's
// draws. Every emitter stands where src/v17/plan.js puts the thing it is the sound of (the brook's line and its steps,
// the leat's weirs once W2 lists them, the mere's edge, the Swallow's fall, the tube's line, the Garth's rills); nothing
// is placed by bearing from the walker. Pitched things sit in D (palette.md). The beds are made when the walker comes
// within reach and let go when they leave; nothing is a loop a visitor can hear repeat (each band is its own source at
// its own offset, its rate wandering a little, its level wandering on the world's noise, never on a period).
//
//   the brook   the babble   a quick small run of water along the brook's line, at the nearest point of it to the
//                            listener: three bands of pink noise, one source each, whose centres and pace follow where
//                            the water is (quick between the blocks, slow and low in the pool, brighter on the runs).
//                            Bed, 70 m
//   the steps   the rush     a short white rush at each step in a line's levels (a brook's, the leat's weirs): one
//                            band of pink noise whose weight follows the step's drop (a bigger drop: lower and fuller)
//                            and whose place is the step's. Bed, 55 m. Read from plan.js, so the leat's weirs have
//                            theirs the day W2 lists them (`LEAT.steps`: [x, z, drop, y])
//   the mere    the lap      the still water's edge: a soft knock of water on the bank in twos and threes with long
//                            rests, the quietest water in the chain. Detail, 30 m
//   the Swallow the roar     the water going into the hill, at the portal's fall: brown noise under 140 Hz, a body at
//                            320 Hz, a breath of spray; a deep steady sound that grows as the walker comes south (heard
//                            from the brook, 100 m north) and, as the water closes over the walker in the tube, goes
//                            under a lowpass until only its weight is left. Bed, 230 m
//   the tube    the press    inside the Noonwrights' tube under the water: D2 and a brown pressure in the walls, a
//                            muffled pressing hum with the current's hiss along the glass at the right hand. Bed
//   the Garth   the rills    the garden's two rills (outer and inner ring) at their nearest points to the walker, a
//                            soft trickle each, and now and then a drop from the can onto the water in phrases. No
//                            roar, no hum: the stillness the walk has nowhere else. Bed, 30 m
//
// Cues, for the tests and for any caller that wants one by hand: act-water-lap (a lap at a position), act-water-drop (a drop
// from the can at a position). ?watersound=0 leaves it silent.
import { caller, placed } from '../audio/calls.js';
import { BROOK, MERE, SWALLOW, GARTH, LEAT } from './plan.js';
import { near as lineNear, at as lineAt, LEN as TUBE_LEN } from './swallow/line.js';
import { RILL, CAN, at as garthAt } from './garth/plan.js';

const D2 = 73.42, A4 = 440.0, D5 = 587.33, F5 = 698.46;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const ss = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// every scheduled value goes through this: a non-finite one is dropped, never thrown in the frame loop (issue-1710: the
// tube's hiss threw on every tick, which crashed geometry-test's clock and reddened heights)
const tgt = (param, v, t, k) => { if (Number.isFinite(v) && Number.isFinite(t) && Number.isFinite(k)) param.setTargetAtTime(v, t, k); };

// ---- the plan's numbers, read once
// a line's steps: two consecutive level stations under 4 m apart that fall 0.12 m or more
function stepsOf(levels) {
  const out = [];
  for (let i = 1; i < levels.length; i++) {
    const [x0, z0, y0] = levels[i - 1], [x1, z1, y1] = levels[i];
    if (Math.hypot(x1 - x0, z1 - z0) < 4 && y0 - y1 >= 0.12) out.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, drop: y0 - y1, y: (y0 + y1) / 2 });
  }
  return out;
}
const STEPS = [...stepsOf(BROOK.levels), ...(LEAT.steps || []).map(([x, z, drop, y]) => ({ x, z, drop, y: y ?? -3 }))];
const BP = BROOK.pts, BL = BROOK.levels;
// the brook's level at z (the levels run north to south)
function brookY(z) {
  if (z <= BL[0][1]) return BL[0][2];
  for (let i = 1; i < BL.length; i++) if (z <= BL[i][1]) { const [, za, ya] = BL[i - 1], [, zb, yb] = BL[i]; return lerp(ya, yb, zb > za ? (z - za) / (zb - za) : 1); }
  return BL[BL.length - 1][2];
}
// the nearest point of the brook's line to (x, z)
const _n = { x: 0, z: 0, d: 0 };
function brookNear(x, z) {
  let bd = Infinity;
  for (let i = 1; i < BP.length; i++) {
    const ax = BP[i - 1][0], az = BP[i - 1][1], bx = BP[i][0], bz = BP[i][1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < bd) { bd = d; _n.x = px; _n.z = pz; }
  }
  _n.d = bd; return _n;
}
// the babble's character by z along the brook: [z, pace 0..1, centre of its middle band (Hz)]. Out of the tarn
// slow, quick between the blocks, a lower, slower run under the first step, the pool near still, the cut's quick
// run, the last run into the mere: the steps (their own rush) change it each time.
const CHAR = [[191, 0.3, 520], [205, 0.65, 700], [216, 1, 820], [221, 0.85, 640], [232, 0.6, 520], [239, 0.3, 380], [246, 0.45, 430], [250, 0.85, 700], [259, 0.95, 780], [262, 0.4, 480], [271, 0.2, 400]];
function charAt(z) {
  if (z <= CHAR[0][0]) return CHAR[0];
  for (let i = 1; i < CHAR.length; i++) if (z <= CHAR[i][0]) { const a = CHAR[i - 1], b = CHAR[i], t = (z - a[0]) / (b[0] - a[0]); return [z, lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  return CHAR[CHAR.length - 1];
}
const HEAD = { x: SWALLOW.portal[0], y: SWALLOW.pool + 1.5, z: SWALLOW.portal[1] + 2.5 }; // the fall, behind the face
const MC = { x: MERE.outline.x, z: MERE.outline.z, r: 17 };                                // the mere, about
const [GX, GZ] = GARTH.c;

export function startWaterSound(a, ctx) {
  const off = { cue: () => false };
  if (new URL(location.href).searchParams.get('watersound') === '0') return off;
  const { ac, filt, gainOf, chain, pink, brown, loopSrc } = a;
  if (!loopSrc || !a.panner) return off;
  const rng = ctx.makeRng(17070), cam = ctx.camera.position;
  const jit = (x, k = 0.03) => x * (1 + (rng() * 2 - 1) * k);
  const span = (lo, hi) => lo + rng() * (hi - lo);
  const noise = (t, k) => 0.5 + 0.5 * ctx.noise.noise2(t, k);

  // ---- a held emitter: built when wanted, torn down after three quiet seconds
  function bed(build) {
    let P = null, quiet = -1;
    return {
      get P() { return P; },
      tick(want, now) {
        if (want && !P) { P = build(); quiet = -1; }
        if (!P) return null;
        if (want) quiet = -1; else if (quiet < 0) quiet = now;
        if (quiet >= 0 && now - quiet > 3) {
          const Q = P; P = null;
          for (const s of Q.srcs) { try { s.stop(now + 0.05); } catch (e) { /* stopped */ } }
          setTimeout(() => { for (const n of Q.nodes) { try { n.disconnect(); } catch (e) { /* gone */ } } }, 300);
          return null;
        }
        return P;
      },
    };
  }
  // sources on a loop, each its own offset; their rates wander a little apart (tick) so no buffer's length comes round as a beat
  const wander = (P, t, now, k = 0.035) => { for (let i = 0; i < P.srcs.length; i++) tgt(P.srcs[i].playbackRate, 1 + k * ctx.noise.noise2(t * 0.11 + i * 7.3, 3.7 + i), now, 1.5); };
  const mkSrc = (buf, P) => { const s = loopSrc(buf, rng()); P.srcs.push(s); return s; };
  const mkPlaced = (P, o) => { const p = placed(a, o); p.airM = o.air ?? 60; P.nodes.push(p.in, p.pan); return p; };
  // a placed source moved to (x, y, z): glided over 0.12 s (a position set outright is a zipper in the panner) and its
  // air lowpass kept to the distance (placed.at sets both, once, outright)
  function put(p, x, y, z, now) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
    const pan = p.pan;
    if (pan.positionX) for (const [k, v] of [['positionX', x], ['positionY', y], ['positionZ', z]]) { const q = pan[k]; q.cancelScheduledValues(now); q.setValueAtTime(q.value, now); q.linearRampToValueAtTime(v, now + 0.12); }
    else a.setPos(pan, x, y, z);
    tgt(p.in.frequency, clamp(20000 * Math.exp(-Math.hypot(x - cam.x, y - cam.y, z - cam.z) / p.airM), 900, 20000), now, 0.1);
  }

  // ---- the brook's babble: three bands at the nearest point of the line
  const babble = bed(() => {
    const P = { srcs: [], nodes: [], bands: [] };
    const p = mkPlaced(P, { ref: 6, roll: 1, range: 90, air: 70 }), out = gainOf(0.0001); out.connect(p.in); P.nodes.push(out);
    for (const [f, q, g0] of [[0.7, 0.9, 1], [1, 1.0, 0.8], [1.9, 1.2, 0.35]]) {
      const bp = filt('bandpass', 700 * f, q), lp = filt('lowpass', 2600, 0.6), gg = gainOf(0.0001);
      chain(mkSrc(pink, P), bp, lp, gg, out); P.bands.push({ bp, gg, f, g0 }); P.nodes.push(bp, lp, gg);
    }
    P.p = p; P.out = out; return P;
  });

  // ---- a step's rush: one band, its weight by the drop
  const rushes = STEPS.map((s) => bed(() => {
    const P = { srcs: [], nodes: [] };
    const p = mkPlaced(P, { ref: 2.5, roll: 1.3, range: 70, air: 55 }); p.at(s.x, s.y + 0.15, s.z);
    const f = clamp(1500 - 2000 * s.drop, 420, 1250), out = gainOf(0.0001); out.connect(p.in);
    const bp = filt('bandpass', f, 0.55), hp = filt('highpass', 260, 0.6), lp = filt('lowpass', 2500, 0.6), low = filt('lowpass', 220, 0.6), lg = gainOf(0.5);
    const src = mkSrc(pink, P), src2 = mkSrc(brown, P);
    chain(src, bp, hp, lp, out); chain(src2, low, lg, out);
    P.nodes.push(out, bp, hp, lp, low, lg); P.out = out; P.bp = bp; P.p = p; return P;
  }));

  // ---- the Swallow's roar, and the tube's press and hiss
  const roar = bed(() => {
    const P = { srcs: [], nodes: [] };
    const p = mkPlaced(P, { ref: 12, roll: 0.7, range: 260, air: 160 }); p.at(HEAD.x, HEAD.y, HEAD.z);
    const out = gainOf(0.0001), mf = filt('lowpass', 1700, 0.5); chain(mf, out, p.in); P.nodes.push(out, mf);
    const low = filt('lowpass', 140, 0.7), body = filt('bandpass', 320, 0.6), air = filt('bandpass', 1500, 0.5), lp = filt('lowpass', 2400, 0.6);
    const lg = gainOf(1), bg = gainOf(0.5), ag = gainOf(0.07);
    chain(mkSrc(brown, P), low, lg, mf); chain(mkSrc(brown, P), body, bg, mf); chain(mkSrc(pink, P), air, lp, ag, mf);
    P.nodes.push(low, body, air, lp, lg, bg, ag); P.out = out; P.mf = mf; P.bg = bg; P.ag = ag; P.p = p; return P;
  });
  const tube = bed(() => {
    const P = { srcs: [], nodes: [] };
    const out = gainOf(0.0001); out.connect(a.ambBus); P.nodes.push(out);
    // the press: D2 and its octave as narrow bands of noise (never a tone: two sines in one octave band read as a
    // 73 Hz roughness in the harness), and a brown pressure under them
    for (const [f, g] of [[D2, 3.2], [D2 * 2, 1.2]]) { const b = filt('bandpass', f, 9), bg = gainOf(g); chain(mkSrc(brown, P), b, bg, out); P.nodes.push(b, bg); }
    const pl = filt('lowpass', 110, 0.6), pg = gainOf(0.5); chain(mkSrc(brown, P), pl, pg, out); P.nodes.push(pl, pg);
    // the current's hiss along the glass, at the right hand
    const hp = placed(a, { ref: 1.2, roll: 1, range: 20, air: 60 }); hp.airM = 60; P.nodes.push(hp.in, hp.pan); // (put() reads airM: unset, the air lowpass was exp(-d / undefined), NaN, and threw every tick in the tube)
    const hb = filt('bandpass', 1700, 0.7), hl = filt('lowpass', 2800, 0.6), hg2 = gainOf(0.0001); chain(mkSrc(pink, P), hb, hl, hg2, hp.in); P.nodes.push(hb, hl, hg2);
    P.out = out; P.hg2 = hg2; P.hp = hp; P.hb = hb; return P;
  });

  // ---- the Garth's rills (the outer and the inner ring, each at the point of it nearest the walker)
  const rills = bed(() => {
    const P = { srcs: [], nodes: [], rings: [] };
    for (const [R, f] of [[RILL.outer - 0.2, 900], [RILL.inner + 0.2, 1100]]) {
      const p = mkPlaced(P, { ref: 2.2, roll: 1.2, range: 40, air: 50 }), out = gainOf(0.0001); out.connect(p.in);
      const bp = filt('bandpass', f, 0.9), lp = filt('lowpass', 1800, 0.6), lo = filt('bandpass', 520, 0.8), lg = gainOf(0.3);
      const src = mkSrc(pink, P); chain(src, bp, lp, out); chain(src, lo, lg, out);
      P.nodes.push(out, bp, lp, lo, lg); P.rings.push({ R, p, out, bp, f });
    }
    return P;
  });

  // ---- the one-shots: a lap, a drop from the can
  function say(pos, o) { return a.voice(pos, { roll: 1, air: 60, ...o }); }
  function lap(pos) {
    const v = say(pos, { ref: 2.5, range: 30, dur: 1.2, verb: 0.3, gain: 8 }); if (!v) return;
    const t0 = v.t0, out = filt('lowpass', 900, 0.6); out.connect(v.in);
    const pk = 0.03 * jit(1, 0.25), g = ac.createGain(), dec = jit(0.45, 0.3);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(pk, t0 + 0.09); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09 + dec); g.gain.linearRampToValueAtTime(0, t0 + 0.1 + dec);
    const n = a.vNoise(v, brown, t0, dec + 0.2);
    if (n) chain(n, filt('bandpass', jit(330, 0.1), 0.9), g, out);
    const g2 = ac.createGain(); g2.gain.setValueAtTime(0.0001, t0 + 0.02); g2.gain.linearRampToValueAtTime(pk * 0.25, t0 + 0.07); g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3); g2.gain.linearRampToValueAtTime(0, t0 + 0.31);
    const n2 = a.vNoise(v, pink, t0 + 0.02, 0.4);
    if (n2) chain(n2, filt('bandpass', jit(780, 0.1), 1.3), g2, out);
  }
  function drop(pos) {
    const v = say(pos, { ref: 2, range: 28, dur: 1.2, verb: 0.55, air: 45, gain: 8 }); if (!v) return;
    const t0 = v.t0, f = [A4, D5, F5][Math.floor(rng() * 3)] * (1 + (rng() - 0.5) * 0.012), out = filt('lowpass', 2200, 0.6); out.connect(v.in);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(jit(0.028, 0.2), t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28); g.gain.linearRampToValueAtTime(0, t0 + 0.29);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 0.8, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.08);
    chain(o, g, out); o.start(t0); o.stop(t0 + 0.32); v.srcs?.push(o);
    const n = a.vNoise(v, pink, t0, 0.1);
    if (n) { const tg = ac.createGain(); tg.gain.setValueAtTime(0.0001, t0); tg.gain.linearRampToValueAtTime(0.008, t0 + 0.005); tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06); tg.gain.linearRampToValueAtTime(0, t0 + 0.07); chain(n, filt('bandpass', jit(900, 0.1), 2), tg, out); }
  }
  const canPos = (() => { const [x, z] = garthAt(CAN.r, CAN.b); return { x, y: RILL.y + 0.9, z }; })();
  let hall = 0, acc = 0, tubeK = 0;
  let lapPos = { x: MC.x, y: MERE.level, z: MC.z };
  const callers = [
    caller(rng, { bout: [1, 3], gap: [0.9, 2], rest: [9, 0.55, 3, 26], first: [1, 5], when: () => Math.hypot(cam.x - MC.x, cam.z - MC.z) < 48 && cam.y > -12 }, () => lap(lapPos)),
    caller(rng, { bout: [1, 3], gap: [0.5, 1.4], rest: [11, 0.5, 5, 28], first: [2, 8], when: () => hall > 0.5 }, () => drop(canPos)),
  ];

  // ---- the schedule: every 0.1 s, by where the walker is
  const _l = {}, _h = {};
  ctx.registerUpdate((dt, t) => {
    acc += dt; if (acc < 0.1) return; const step = acc; acc = 0;
    if (ac.state === 'closed') return;
    const now = ac.currentTime, below = cam.y < ctx.terrain.heightAt(cam.x, cam.z) - 3;
    // where the walker is: in the hall, in the tube (the water over them), neither
    const gr = Math.hypot(cam.x - GX, cam.z - GZ);
    hall = below && cam.y < GARTH.floor + 12 ? ss(22.5, 19.5, gr) : 0;
    lineNear(cam.x, cam.z, _l);
    tubeK = below && _l.s > 0 && _l.s < TUBE_LEN + 2 ? ss(-8.2, -11, cam.y) * (1 - ss(1.6, 3.4, Math.abs(_l.d))) * (1 - hall) : 0;
    const dm = Math.hypot(cam.x - MC.x, cam.z - MC.z);
    if (dm > MC.r) { lapPos = { x: MC.x + (cam.x - MC.x) / dm * MC.r, y: MERE.level, z: MC.z + (cam.z - MC.z) / dm * MC.r }; } else lapPos = { x: cam.x + 2, y: MERE.level, z: cam.z + 2 };
    for (const c of callers) c.tick(step);

    // the brook (above the ground only)
    const bn = brookNear(cam.x, cam.z), dB = Math.hypot(bn.d, Math.min(8, Math.abs(cam.y - brookY(bn.z))));
    const bP = babble.tick(!below && bn.d < 80 && cam.z < 275, now);
    if (bP) {
      const [, pace, fc] = charAt(bn.z);
      put(bP.p, bn.x, brookY(bn.z) + 0.2, bn.z, now);
      const wob = noise(t * 0.8, 11.3), lvl = 0.9 * (1 - ss(40, 80, dB));
      tgt(bP.out.gain, 0.0001 + 0.6 * lvl * (0.35 + 0.65 * pace) * (0.85 + 0.3 * wob), now, 0.25);
      bP.bands.forEach((B, i) => {
        const w = noise(t * (0.9 + 0.5 * i), 5.1 + i * 3.7);
        tgt(B.bp.frequency, fc * B.f * (0.94 + 0.12 * w), now, 0.3);
        tgt(B.gg.gain, B.g0 * (0.5 + 0.5 * w) * (i === 2 ? 0.3 + 0.7 * pace : 1), now, 0.3);
      });
      wander(bP, t, now);
    }
    // the steps
    for (let i = 0; i < STEPS.length; i++) {
      const s = STEPS[i], d = Math.hypot(cam.x - s.x, cam.y - s.y, cam.z - s.z);
      const R = rushes[i].tick(!below && d < 60, now);
      if (R) {
        const w = noise(t * 0.7, 21 + i * 4.1);
        put(R.p, s.x, s.y + 0.15, s.z, now);
        tgt(R.out.gain, 0.0001 + 0.3 * Math.sqrt(s.drop / 0.4) * (0.85 + 0.3 * w) * (1 - ss(35, 60, d)), now, 0.3);
        tgt(R.bp.frequency, clamp(1500 - 2000 * s.drop, 420, 1250) * (0.95 + 0.1 * w), now, 0.4);
        wander(R, t, now);
      }
    }
    // the Swallow's roar: by the distance to the fall (the panner gives the rest), under a lowpass as the water closes over
    const dH = Math.hypot(cam.x - HEAD.x, cam.y - HEAD.y, cam.z - HEAD.z), muffle = Math.max(tubeK, hall);
    const rP = roar.tick(dH < 240 && hall < 0.95, now);
    if (rP) {
      const w1 = noise(t * 0.19, 31.7), w2 = noise(t * 0.43, 8.9);
      put(rP.p, HEAD.x, HEAD.y, HEAD.z, now);
      tgt(rP.out.gain, 0.0001 + 0.8 * lerp(1, 0.3, muffle) * (0.88 + 0.12 * w1) * (1 - ss(0.4, 1, hall)), now, 0.4);
      tgt(rP.mf.frequency, lerp(1700, 190, muffle), now, 0.5);
      tgt(rP.bg.gain, (0.4 + 0.2 * w2) * lerp(1, 0.6, muffle), now, 0.5);
      tgt(rP.ag.gain, (0.06 + 0.03 * w1) * (1 - muffle), now, 0.5);
      wander(rP, t, now);
    }
    // the tube
    const tP = tube.tick(tubeK > 0.02, now);
    if (tP) {
      const w = noise(t * 0.13, 17.9);
      tgt(tP.out.gain, 0.0001 + 0.12 * tubeK * tubeK * (0.9 + 0.1 * w), now, 0.6);
      tgt(tP.hg2.gain, 0.0001 + 0.03 * tubeK * (0.7 + 0.5 * noise(t * 0.5, 2.2)), now, 0.4);
      tgt(tP.hb.frequency, 1700 * (0.92 + 0.16 * noise(t * 0.21, 12.4)), now, 0.5);
      // at the right hand of the line's heading (x east, z south: right of south is west)
      lineAt(clamp(_l.s, 0, TUBE_LEN), _h);
      put(tP.hp, cam.x - _h.tz * 1.3, cam.y, cam.z + _h.tx * 1.3, now);
      wander(tP, t, now);
    }
    // the Garth's rills
    const rP2 = rills.tick(hall > 0.3, now);
    if (rP2) {
      const dx = cam.x - GX, dz = cam.z - GZ, dl = Math.hypot(dx, dz) || 1;
      rP2.rings.forEach((r, i) => {
        const px = GX + (dx / dl) * r.R, pz = GZ + (dz / dl) * r.R;
        put(r.p, px, RILL.y + 0.3, pz, now);
        const w = noise(t * 0.6, 40 + i * 9.7);
        tgt(r.out.gain, 0.0001 + 0.07 * hall * (0.8 + 0.4 * w), now, 0.4);
        tgt(r.bp.frequency, r.f * (0.93 + 0.14 * noise(t * 0.4, 61 + i)), now, 0.5);
      });
      wander(rP2, t, now);
    }
  });

  function cue(name, pos) {
    if (name === 'act-water-lap') { lap(pos || lapPos); return true; }
    if (name === 'act-water-drop') { drop(pos || canPos); return true; }
    return false;
  }
  return { cue, state: () => ({ hall, tubeK }) };
}
