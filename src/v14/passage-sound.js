// The Wellward Way's sounds (v14-D1): the passage's own, beside what the kit gives every place under the ground (the
// stone room sized by the volume the listener is in, the wind sheltered, the hard step) and the Pit's breath ahead
// (v14/pit-sound.js, heard in the passage within ~60 m of the Pit). All in D (palette.md). No cues: both are the
// place's, started and scheduled here by where the listener is.
//
//   the drip    at the foot of the door's three steps, where the Nave's water seeps through the old stair's broken vault: drops into a
//               puddle in phrases (one to three, a breath apart, then 7-17 s of nothing), pitched on A5, D6 and F6 a
//               little out of true, a small tick of water under each, through the stone room. Detail, 22 m: heard
//               in the Line as far as its first node, gone by the second
//   the draught the wind from under the world going up the way: a soft rush of air and, in it, the Flute's two hollow
//               notes (A2 and D3, narrow bands of noise, never a tone), at the nearest point of the Flute or the Gulf
//               a few metres toward the Pit (in the Gulf, from below the bridge). It breathes in slow surges (10-16
//               s). Its level by where the listener is: nothing in the Line's first half and above the ground, a
//               little where the Line breaks into the bore, most in the Flute, less in the room, all of it over the Gulf, and fading
//               out down the Gate as the Pit's own breath comes up. Bed, under the steps
//   the Laid Sun (v16-S1, #78) while the sun gutters and the gold in the room's floor wakes (ctx.passage.sunWake): a low
//               warm hum out of the floor, D2 and D4 2.6 cents flat, sines through a lowpass at 900 Hz (kept out of
//               the octave of the draught's A2 and D3: a D3 or an A3 there beat against them, rough 0.5-0.64 in the harness), swelling in over three seconds and gone over six with the
//               light. The one thing under the moor that answers the gutter, heard in the room and the way either
//               side of it (16 m). Bed
const D2 = 73.42, A2 = 110.0, D3 = 146.83, D4 = 293.66, A5 = 880.0, D6 = 1174.66, F6 = 1396.91;

export function startPassageSound(a, ctx) {
  const { ac, voice, filt, chain, pink, brown, loopSrc, panner, setPos, cueBus, verbIn, gainOf } = a;
  if (!loopSrc || !panner) return { cue: () => false };
  const rng = ctx.makeRng(14102);
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const ss = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const jit = (x, k = 0.03) => x * (1 + (rng() * 2 - 1) * k);
  const q = { i: 0, s: 0, d: 0, e: 0, t: 0 };

  // ---- the drip
  const DRIP = { next: 0, left: 0 };
  function drop(pos) {
    const v = voice(pos, { ref: 2, roll: 1, range: 22, dur: 1.4, verb: 0.75, air: 40, gain: 5 }); if (!v) return;
    const t0 = v.t0, f = [A5, D6, F6][Math.floor(rng() * 3)] * (1 + (rng() - 0.5) * 0.012);
    const out = filt('lowpass', 2600, 0.6); out.connect(v.in);
    // the drop: a sine bending up a little as the bubble closes (the plink), tonal so a 12 ms attack
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(jit(0.03, 0.2), t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2); g.gain.linearRampToValueAtTime(0, t0 + 0.21);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 0.82, t0); o.frequency.exponentialRampToValueAtTime(f, t0 + 0.07);
    chain(o, g, out); o.start(t0); o.stop(t0 + 0.25);
    // the water's small tick under it
    const n = a.vNoise ? a.vNoise(v, pink, t0, 0.08) : null;
    if (n) { const tg = ac.createGain(); tg.gain.setValueAtTime(0.0001, t0); tg.gain.linearRampToValueAtTime(0.012, t0 + 0.004); tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05); tg.gain.linearRampToValueAtTime(0, t0 + 0.06); chain(n, filt('bandpass', jit(900, 0.1), 2.2), tg, out); }
  }

  // ---- the draught
  const B = { on: false, parts: null, quiet: -1 };
  function start() {
    const out = ac.createGain(); out.gain.value = 0.0001;
    const p = panner('equalpower', 6, 1, 300);
    const rush = filt('bandpass', 420, 0.6), rushTop = filt('lowpass', 1500, 0.6), rushG = gainOf(0.5);
    const low = filt('lowpass', 120, 0.7), lowG = gainOf(0.35);
    const hA = filt('bandpass', A2, 14), hD = filt('bandpass', D3 * 1.004, 14), hG = gainOf(2.2);
    const srcs = [loopSrc(pink, rng()), loopSrc(brown, rng()), loopSrc(pink, rng())];
    chain(srcs[0], rush, rushTop, rushG, out);
    chain(srcs[1], low, lowG, out);
    chain(srcs[2], hA, hG); chain(srcs[2], hD, hG); hG.connect(out);
    chain(out, p, cueBus);
    const vs = gainOf(0.45); p.connect(vs); vs.connect(verbIn);
    B.parts = { srcs, p, out, rush, rushG, hG, hA, vs };
    B.on = true; B.quiet = -1;
  }
  function stop() {
    const P = B.parts; if (!P) return;
    const now = ac.currentTime;
    for (const s of P.srcs) { try { s.stop(now + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { P.p.disconnect(); P.out.disconnect(); P.vs.disconnect(); } catch (e) { /* gone */ } }, 200);
    B.parts = null; B.on = false;
  }

  // ---- the Laid Sun's hum
  const H = { parts: null, quiet: -1 };
  function hum(on, P, now, wake, cam) {
    if (on && !H.parts) {
      const out = ac.createGain(); out.gain.value = 0.0001;
      const p = panner('equalpower', 3, 1.2, 60), lp = filt('lowpass', 900, 0.5);
      const osc = [[D2, 1], [D4 * 0.9985, 0.35]].map(([f, gn]) => { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = gainOf(gn); chain(o, g, lp); o.start(); return o; });
      chain(lp, out, p, cueBus);
      const vs = gainOf(0.6); p.connect(vs); vs.connect(verbIn);
      setPos(p, P.sun.x, P.sun.y + 0.3, P.sun.z);
      H.parts = { out, p, vs, osc }; H.quiet = -1;
    }
    if (!H.parts) return;
    H.parts.out.gain.setTargetAtTime(0.0001 + 0.05 * wake * wake, now, 0.6);
    if (on && wake > 0.01) H.quiet = -1; else if (H.quiet < 0) H.quiet = now;
    if (H.quiet >= 0 && now - H.quiet > 8) {
      const Q = H.parts; H.parts = null;
      for (const o of Q.osc) { try { o.stop(now + 0.1); } catch (e) { /* stopped */ } }
      setTimeout(() => { try { Q.p.disconnect(); Q.out.disconnect(); Q.vs.disconnect(); } catch (e) { /* gone */ } }, 300);
    }
  }

  let acc = 0;
  ctx.registerUpdate((dt, t) => {
    acc += dt; if (acc < 0.1) return; acc = 0;
    const PS = ctx.passage; if (!PS || PS.off || ac.state === 'closed') return;
    const P = PS.plan, SP = P.SP, cam = ctx.camera.position, now = ac.currentTime;
    // where the listener is along the way (nothing above the ground or far off)
    const g = ctx.terrain.heightAt(cam.x, cam.z), under = cam.y < g - 4;
    let s = -1, lvl = 0;
    if (under) {
      P.near(cam.x, cam.z, q);
      if (q.e < 16) {
        s = q.s;
        lvl = s < SP.LINE ? 0.35 * ss(SP.LINE * 0.5, SP.LINE, s)
          : s < SP.SUN - SP.RC ? 0.55 + 0.25 * ss(SP.LINE, SP.SUN - SP.RC, s)
          : s < SP.GULF0 ? 0.5
          : s < SP.GULF1 ? 1.0
          : 1 - 0.75 * ss(SP.GULF1, P.L, s);
      }
    }
    // the drip: phrases at the door's foot while the listener is in reach of it
    if (s >= 0 && s < 18) {
      if (now >= DRIP.next) {
        const pos = { x: P.X[0], y: P.yAt(0) + 0.02, z: P.Z[0] - 1.8 };
        drop(pos);
        if (DRIP.left > 0) { DRIP.left--; DRIP.next = now + 0.5 + rng() * 1.1; }
        else { DRIP.left = Math.floor(rng() * 3); DRIP.next = now + 7 + rng() * 10; }
      }
    } else DRIP.next = Math.max(DRIP.next, now + 1 + rng() * 3);
    // the Laid Sun: while it is awake and the listener is in the room or the way within 16 m of it
    { const wake = PS.sunWake || 0, near = s >= 0 && Math.abs(s - SP.SUN) < 16; hum(near && wake > 0.01, P, now, wake, cam); }
    // the draught
    if (lvl > 0.001 && !B.on) start();
    if (!B.on) return;
    const Pp = B.parts;
    const ssrc = clamp(s + 6, SP.LINE, SP.GULF1), a0 = P.at(ssrc), inGulf = ssrc > SP.GULF0 && ssrc < SP.GULF1;
    setPos(Pp.p, a0.x, P.yAt(ssrc) + (inGulf ? -9 : 1.6), a0.z);
    const w1 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.07, 41.7), w2 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.17, 9.1);
    const surge = 0.4 + 0.6 * w1 * w1;
    Pp.out.gain.setTargetAtTime(0.0001 + 0.3 * lvl * surge, now, 0.7);
    Pp.hG.gain.setTargetAtTime((1.4 + 1.8 * w1) * (s > SP.LINE && s < SP.SUN - SP.RC ? 1.3 : 0.8), now, 0.9);
    Pp.hA.frequency.setTargetAtTime(A2 * (1 + 0.005 * (w2 - 0.5)), now, 1.5);
    Pp.rush.frequency.setTargetAtTime(330 + 260 * w1, now, 0.8);
    Pp.rushG.gain.setTargetAtTime(0.35 + 0.3 * w2, now, 0.7);
    // the loops' rates wander a little apart, so their buffers' length never comes round as a beat
    for (let k = 0; k < Pp.srcs.length; k++) Pp.srcs[k].playbackRate.setTargetAtTime(1 + 0.035 * ctx.noise.noise2(t * 0.11 + k * 7.3, 3.7 + k), now, 1.5);
    if (lvl > 0.001) B.quiet = -1; else if (B.quiet < 0) B.quiet = now;
    if (B.quiet >= 0 && now - B.quiet > 3) stop();
  });
  return { cue: () => false, draught: B, drip: DRIP };
}
