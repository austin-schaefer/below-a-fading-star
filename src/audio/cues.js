// Named one-shots (v7.2-01 split out of src/audio.js; v7.2-04 voices it next): the cue(name, pos, opts) dispatcher
// (the table is in src/audio.js's header), the older one-shots on bare panners (cry, crows, flush, plop, rumble,
// farcry, skycreak, the lids, the slinker's rattle, the traveller's greeting, the tarn's hum and slosh), the Cardinal
// Stones' bells (struck by the `strike` cue and as the walker comes near) and the fall's positional loop. The v2 and
// v5 one-shots are in cues-v2.js; v7's living in living.js; the regions' own cues in regions.js; all are reached
// from here. startCues(a) returns { cue, fallTick, update(f) } and sets a.fall (= audio.fall); cue reads a.living
// and a.regionSnd when it is called, so it is handed to ctx.audio.cue once they have started.
import { hyp } from '../noise.js';
import { startCuesV2 } from './cues-v2.js';

export function startCues(a) {
  const { ac, rng, ctx, audio, camera, terrain, landmarks, master, cueBus, verbIn, send, panner, setPos, loopSrc, burst,
    brown, pink, white, env, filt, gainOf, chain, oneShotPanner, later, near, nTick, clamp } = a;

  // ================================================================ Cardinal Stones: a low bell on each, struck as you come near
  const S = landmarks.stones, H = 7;
  const stones = [
    { name: 'pride', f: 73.42, x: S.x + H, z: S.z - H }, { name: 'sloth', f: 87.31, x: S.x + H, z: S.z + H },
    { name: 'avarice', f: 110.0, x: S.x - H, z: S.z + H }, { name: 'spite', f: 130.81, x: S.x - H, z: S.z - H },
  ];
  for (const s of stones) { s.armed = true; s.cool = 0; s.pan = panner('HRTF', 8, 0.8); setPos(s.pan, s.x, terrain.heightAt(s.x, s.z) + 1.6, s.z); s.pan.connect(master); send(s.pan, 0.55); }
  const bellPartials = [[1, 1, 9], [2.0, 0.55, 7], [2.41, 0.4, 6], [3.0, 0.3, 5], [4.2, 0.18, 3.5], [5.43, 0.1, 2.5]];
  function strike(s, soft = 1) {
    const t0 = ac.currentTime + a.lead;
    for (const [r, a, d] of bellPartials) {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = s.f * r * (1 + (rng() - 0.5) * 0.002);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.2 * a * soft, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(s.pan); o.start(t0); o.stop(t0 + d + 0.1);
    }
  }

  // ================================================================ calls (one-shots)
  function cry(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos, 50, 1.1);
    send(p, 0.9);
    const n = 1 + ((rng() * 2) | 0);
    let at = t0;
    for (let k = 0; k < n; k++) {
      const dur = 0.6 + rng() * 0.7, f0 = 700 + rng() * 500;
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + rng() * 0.6), at + dur * 0.35); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, at + dur);
      const vib = ac.createOscillator(); vib.frequency.value = 22 + rng() * 14; const vg = ac.createGain(); vg.gain.value = 40; vib.connect(vg); vg.connect(o.frequency);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.6;
      const g = ac.createGain(); env(g, at, 0.09, 0.1, dur);
      o.connect(bp); bp.connect(g); g.connect(p);
      const ns = burst(pink, dur), nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 1.0;
      const ng = ac.createGain(); env(ng, at, 0.05, 0.1, dur); ns.connect(nf); nf.connect(ng); ng.connect(p);
      o.start(at); vib.start(at); o.stop(at + dur + 0.1); vib.stop(at + dur + 0.1);
      at += dur * 0.7 + 0.1 + rng() * 0.2;
    }
    later(p, at - t0 + 4);
  }
  function crows(pos) {
    const c = landmarks.castle;
    const pp = pos || { x: 65, y: 34, z: 30 };
    const p = oneShotPanner(pp, 12, 1); send(p, 0.5);
    let at = ac.currentTime + a.lead;
    const n = 5 + ((rng() * 4) | 0);
    for (let k = 0; k < n; k++) {
      const f0 = 380 + rng() * 220, dur = 0.16 + rng() * 0.12;
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 1.25, at); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, at + dur);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + rng() * 300; bp.Q.value = 2;
      const g = ac.createGain(); env(g, at, 0.13, 0.015, dur);
      o.connect(bp); bp.connect(g); g.connect(p); o.start(at); o.stop(at + dur + 0.05);
      const ns = burst(white, dur), nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1500; nf.Q.value = 1;
      const ng = ac.createGain(); env(ng, at, 0.04, 0.01, dur); ns.connect(nf); nf.connect(ng); ng.connect(p);
      at += 0.12 + rng() * 0.3;
    }
    // wing-clatter as they leave
    const w = burst(white, 1.4), wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = 0.8;
    const wg = ac.createGain(); env(wg, ac.currentTime + a.lead, 0.08, 0.2, 1.1); w.connect(wf); wf.connect(wg); wg.connect(p);
    later(p, at - ac.currentTime + 5);
  }
  function plop(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos, 6, 1.2); send(p, 0.35);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(820, t0); o.frequency.exponentialRampToValueAtTime(190, t0 + 0.11);
    const g = ac.createGain(); env(g, t0, 0.13, 0.004, 0.13); o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + 0.2);
    const s = burst(pink, 0.1), f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const ng = ac.createGain(); env(ng, t0, 0.04, 0.002, 0.08);
    s.connect(f); f.connect(ng); ng.connect(p);
    later(p, 3);
  }
  // ---- sky and uncanny cues: all quiet, all placed where they happen
  // a fireball's report, arriving late: a long low roll that grumbles away
  function rumble(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos || { x: camera.position.x + 200, y: 80, z: camera.position.z }, 120, 1); send(p, 0.7);
    const s = burst(brown, 6), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, t0); lp.frequency.exponentialRampToValueAtTime(70, t0 + 5.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.35);
    for (let k = 1; k < 7; k++) g.gain.linearRampToValueAtTime(0.5 * (1 - k / 7) * (0.55 + 0.45 * rng()), t0 + 0.35 + k * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 6);
    s.connect(lp); lp.connect(g); g.connect(p); later(p, 9);
  }
  // the four-winged flier, very far: one long falling call, half of it reverb
  function farcry(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos || { x: camera.position.x - 200, y: 120, z: camera.position.z - 200 }, 90, 1); send(p, 1.3);
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(520, t0); o.frequency.linearRampToValueAtTime(610, t0 + 0.5); o.frequency.exponentialRampToValueAtTime(260, t0 + 2.4);
    const v = ac.createOscillator(); v.frequency.value = 6.5; const vg = ac.createGain(); vg.gain.value = 9; v.connect(vg); vg.connect(o.frequency);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.9;
    const g = ac.createGain(); env(g, t0, 0.07, 0.35, 2.1);
    o.connect(bp); bp.connect(g); g.connect(p); o.start(t0); v.start(t0); o.stop(t0 + 2.6); v.stop(t0 + 2.6); later(p, 7);
  }
  // the iron worm flexing in the sky: an iron groan, slow-beating partials and a grinding edge
  function skycreak(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos || { x: camera.position.x, y: 200, z: camera.position.z - 250 }, 90, 1); send(p, 1.0);
    const dur = 2.2 + rng() * 1.2, f0 = 48 + rng() * 20;
    for (const [r, a] of [[1, 1], [2.03, 0.5], [3.11, 0.3]]) {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * r, t0); o.frequency.linearRampToValueAtTime(f0 * r * 1.12, t0 + dur * 0.6); o.frequency.linearRampToValueAtTime(f0 * r * 0.94, t0 + dur);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 340 * r; bp.Q.value = 6;
      const g = ac.createGain(); env(g, t0, 0.09 * a, 0.4, dur);
      o.connect(bp); bp.connect(g); g.connect(p); o.start(t0); o.stop(t0 + dur + 0.6);
    }
    // stick-slip grinding: ticks clustered in bursts
    for (let k = 0, at = t0 + 0.2; at < t0 + dur; k++) { nTick(p, at, 700 + rng() * 500, 4, 0.05, 0.03); at += 0.02 + rng() * rng() * 0.25; }
    later(p, dur + 6);
  }
  // a cloak of eyes closing all at once: many wet lid-clicks in a crowded rush; opening is slower and stickier
  function lids(pos, opening) {
    const p = oneShotPanner(near(pos), 3, 1.4); send(p, 0.25);
    const n = opening ? 46 : 60, span = opening ? 0.9 : 0.32;
    const t0 = ac.currentTime + a.lead;
    for (let k = 0; k < n; k++) {
      const at = t0 + Math.pow(rng(), opening ? 1.0 : 1.6) * span;
      nTick(p, at, 1500 + rng() * 2200, 3 + rng() * 4, 0.035 + rng() * 0.03, 0.012 + rng() * 0.02);
      // the wet part: a tiny falling pop under each click
      const o = ac.createOscillator(); o.type = 'sine'; const f = 600 + rng() * 700;
      o.frequency.setValueAtTime(opening ? f * 0.7 : f, at); o.frequency.exponentialRampToValueAtTime(opening ? f : f * 0.55, at + 0.025);
      const g = ac.createGain(); env(g, at, 0.02, 0.002, 0.03); o.connect(g); g.connect(p); o.start(at); o.stop(at + 0.05);
    }
    later(p, span + 3);
  }
  // the slinker noticed: a dry rattle of many fingertips on stone, close and unreverberant
  function rattle(pos, leaving) {
    const p = oneShotPanner(near(pos), 4, 1.3); send(p, leaving ? 0.12 : 0.05);
    const t0 = ac.currentTime + a.lead, span = leaving ? 1.4 : 0.6;
    let at = t0;
    while (at < t0 + span) {
      const fade = leaving ? 1 - (at - t0) / span : 1 - 0.4 * (at - t0) / span;
      nTick(p, at, 2600 + rng() * 2400, 6 + rng() * 6, 0.13 * fade + 0.01, 0.006 + rng() * 0.006);
      at += (leaving ? 0.025 + (at - t0) * 0.08 : 0.008) + rng() * 0.022;
    }
    later(p, span + 2);
  }
  // the traveller lifts his hand: a small cracked bell on the wagon, and a warm two-note hum
  function greet(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(near(pos, 6), 6, 1.1); send(p, 0.4);
    [[880, 0.025, 1.6], [1318.5, 0.015, 1.2], [2213, 0.006, 0.7]].forEach(([f, a, d], i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * (1 + (rng() - 0.5) * 0.004);
      const g = ac.createGain(); env(g, t0 + i * 0.004, a, 0.004, d); o.connect(g); g.connect(p); o.start(t0); o.stop(t0 + d + 0.2);
    });
    [[146.8, 0.35], [196, 0.75]].forEach(([f, at]) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t0 + at); o.frequency.linearRampToValueAtTime(f, t0 + at + 0.12);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 2;
      const g = ac.createGain(); env(g, t0 + at, 0.025, 0.06, 0.45); o.connect(lp); lp.connect(g); g.connect(p); o.start(t0 + at); o.stop(t0 + at + 0.6);
    });
    later(p, 4);
  }
  // the woman in the tarn: a wordless low hum through closed lips, drifting between two notes
  function tarnHum(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos || { x: -90, y: -3, z: 72 }, 10, 1.1); send(p, 0.8);
    const dur = 4.5 + rng() * 2, f0 = 196 * (rng() < 0.5 ? 1 : 0.89);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * 1.122, t0 + dur * 0.4); o.frequency.linearRampToValueAtTime(f0 * 0.944, t0 + dur);
    const v = ac.createOscillator(); v.frequency.value = 4.8; const vg = ac.createGain(); vg.gain.value = 1.6; v.connect(vg); vg.connect(o.frequency);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 1.0); g.gain.linearRampToValueAtTime(0.035, t0 + dur - 1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    for (const [f, q, a] of [[260, 5, 1], [1100, 8, 0.25]]) { // nasal "mm" formants
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const ag = ac.createGain(); ag.gain.value = a;
      o.connect(bp); bp.connect(ag); ag.connect(lp);
    }
    lp.connect(g); g.connect(p); o.start(t0); v.start(t0); o.stop(t0 + dur + 0.1); v.stop(t0 + dur + 0.1);
    later(p, dur + 5);
  }
  // she has moved: one soft slosh of water round a body
  function slosh(pos) {
    const t0 = ac.currentTime + a.lead, p = oneShotPanner(pos || { x: -90, y: -4.6, z: 80 }, 6, 1.2); send(p, 0.4);
    const s = burst(pink, 0.8), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(900, t0); bp.frequency.exponentialRampToValueAtTime(260, t0 + 0.6);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.11, t0 + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
    s.connect(bp); bp.connect(g); g.connect(p);
    for (let k = 0; k < 4; k++) nTick(p, t0 + 0.25 + rng() * 0.4, 1800 + rng() * 1500, 5, 0.012, 0.03, pink); // drips
    later(p, 3);
  }
  function flush(pos) {
    const p = oneShotPanner(pos, 6, 1.1); const t0 = ac.currentTime + a.lead;
    const s = burst(white, 0.6), f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
    const g = ac.createGain(); env(g, t0, 0.14, 0.02, 0.5);
    // a rattle of wingbeats
    const am = ac.createOscillator(); am.frequency.value = 22; const ag = ac.createGain(); ag.gain.value = 0.5; const base = ac.createGain(); base.gain.value = 0.5; am.connect(ag); ag.connect(base.gain);
    s.connect(f); f.connect(base); base.connect(g); g.connect(p); am.start(t0); am.stop(t0 + 0.7);
    for (let k = 0; k < 3; k++) { const o = ac.createOscillator(); o.type = 'sawtooth'; const tt = t0 + 0.1 + k * 0.12 + rng() * 0.06; o.frequency.setValueAtTime(3000, tt); o.frequency.exponentialRampToValueAtTime(2200, tt + 0.05); const og = ac.createGain(); env(og, tt, 0.02, 0.003, 0.05); o.connect(og); og.connect(p); o.start(tt); o.stop(tt + 0.08); }
    later(p, 3);
  }

  // ---- the fall: a positional loop, not a one-shot. Built on entering the rumble zone (or whenever
  // ctx.river.rumble is above zero), its gain follows that rumble at 10 Hz; on leaving it fades over 2 s and
  // is torn down. Low brown rumble, a mid roar, a hiss of spray, a slow wander in all three.
  const fall = audio.fall = { running: false, gain: null, pos: null, left: false, quietSince: -1, parts: null, leaveTimer: null };
  function fallLevel() {
    const R = ctx.river;
    if (R && typeof R.rumble === 'number') { if (R.rumble > 0) fall.left = false; return R.rumble; }
    const F = fall.pos || R?.fall;
    if (!F || fall.left) return 0;
    const cp = camera.position;
    return clamp(1 - Math.hypot(cp.x - F.x, cp.y - (F.y ?? cp.y), cp.z - F.z) / (F.rumbleRadius || 70), 0, 1);
  }
  function fallStart() {
    const F = fall.pos || ctx.river?.fall;
    if (fall.running || !F) return;
    const out = ac.createGain(); out.gain.value = 0.0001;
    const p = panner('equalpower', 14, 0.5, 500); setPos(p, F.x, F.y ?? terrain.heightAt(F.x, F.z), F.z);
    const low = filt('lowpass', 150, 0.7), mid = filt('bandpass', 420, 0.8), hiss = filt('bandpass', 2600, 0.5);
    const lowG = gainOf(1), midG = gainOf(0.35), hissG = gainOf(0.1);
    const srcs = [loopSrc(brown, rng()), loopSrc(brown, rng()), loopSrc(pink, rng())];
    chain(srcs[0], low, lowG, out); chain(srcs[1], mid, midG, out); chain(srcs[2], filt('highpass', 1200), hiss, hissG, out);
    chain(out, p, cueBus);
    const vs = gainOf(0.22); p.connect(vs); vs.connect(verbIn);
    fall.parts = { srcs, p, out, low, lowG, midG, hissG, vs };
    fall.gain = out; fall.running = true; fall.quietSince = -1;
  }
  function fallStop() {
    const P = fall.parts; if (!P) return;
    const now = ac.currentTime;
    for (const s of P.srcs) { try { s.stop(now + 0.05); } catch (e) { /* stopped */ } }
    setTimeout(() => { try { P.p.disconnect(); P.out.disconnect(); P.vs.disconnect(); } catch (e) { /* gone */ } }, 200);
    fall.parts = null; fall.gain = null; fall.running = false;
  }
  function fallTick(step, t, now) {
    const lvl = fallLevel();
    if (lvl > 0.001 && !fall.running) fallStart();
    if (!fall.running) return;
    const P = fall.parts;
    const w1 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.23, 7.1), w2 = 0.5 + 0.5 * ctx.noise.noise2(t * 0.61, 3.3);
    P.out.gain.setTargetAtTime(0.0001 + 0.5 * Math.pow(lvl, 1.3) * (0.75 + 0.25 * w1), now, fall.left ? 0.5 : 0.3);
    P.low.frequency.setTargetAtTime(120 + 60 * w2, now, 0.4);
    P.midG.gain.setTargetAtTime(0.25 + 0.2 * w2, now, 0.4);
    P.hissG.gain.setTargetAtTime(0.06 + 0.08 * w1 * lvl, now, 0.4);
    // timed on the audio clock: game time can run slow when frames are clamped
    if (lvl > 0.001) fall.quietSince = -1; else if (fall.quietSince < 0) fall.quietSince = now;
    if (fall.quietSince >= 0 && now - fall.quietSince > 2.2) fallStop();
  }
  function fallCue(pos, entering) {
    if (pos && typeof pos.x === 'number') fall.pos = pos;
    fall.left = !entering;
    if (fall.leaveTimer) { clearTimeout(fall.leaveTimer); fall.leaveTimer = null; }
    if (entering) { fall.quietSince = -1; fallStart(); return; }
    // leaving: fallLevel() reads zero from here. The fade starts now on the audio clock and a timer
    // stops the loop at 2.2 s, so neither waits for a frame (frames can be seconds apart under load).
    if (!fall.running || !fall.parts) return;
    const now = ac.currentTime;
    fall.parts.out.gain.setTargetAtTime(0.0001, now, 0.5);
    if (fall.quietSince < 0) fall.quietSince = now;
    fall.leaveTimer = setTimeout(() => { fall.leaveTimer = null; if (fall.running && fall.left && fallLevel() <= 0.001) fallStop(); }, 2200);
  }

  const c2 = startCuesV2(a);
  function cue(name, position, opts) {
    if (ac.state === 'closed') return;
    if (ctx.hush?.cue(name, position || camera.position)) return; // v5: AR the Occultation hushes the birds under its band
    try {
      if (name === 'cry') cry(position || { x: camera.position.x + 120, y: 80, z: camera.position.z - 100 });
      else if (name === 'crows') crows(position);
      else if (name === 'flush') flush(position || camera.position);
      else if (name === 'plop') plop(position || { x: -90, y: -4.6, z: 110 });
      else if (name === 'strike') strike(stones[(position | 0) % 4]);
      else if (name === 'rumble') rumble(position);
      else if (name === 'farcry') farcry(position);
      else if (name === 'skycreak') skycreak(position);
      else if (name === 'eyes-close') lids(position, false);
      else if (name === 'eyes-open') lids(position, true);
      else if (name === 'slinker-seen') rattle(position, false);
      else if (name === 'slinker-gone') rattle(position, true);
      else if (name === 'traveller-greet') greet(position);
      else if (name === 'tarn-hum') tarnHum(position);
      else if (name === 'tarn-step') slosh(position);
      else if (name === 'carillon') c2.carillon(position, opts);
      else if (name === 'glyph-shift') c2.glyphShift(position);
      else if (name === 'sward-close') c2.rustle(position, { dur: 1.5, peakAt: 0.4, n: 90, band: 4200, gain: 0.075 });
      else if (name === 'sward-open') c2.rustle(position, { dur: 4, peakAt: 0.5, n: 70, band: 3000, gain: 0.035 });
      else if (name === 'sward-whimper') c2.whimper(position);
      else if (name === 'pedlar-pass') c2.pedlarPass(position);
      else if (name === 'wrong-colour-near') c2.wrongColour(position);
      else if (name === 'fall-rumble-enter') fallCue(position, true);
      else if (name === 'fall-rumble-leave') fallCue(position, false);
      else if (name === 'procession') c2.procession(position);
      else if (name === 'guest-heartbeat') c2.heartbeat(opts);
      else if (name === 'galley-drum') c2.galleyDrum(position, opts);
      else if (name === 'lizard-skitter') c2.skitter(position);
      else if (name === 'rooks-lift') c2.rooksLift(position, opts);
      else if (name === 'bats-out') c2.batsOut(position, opts);
      else if (name === 'wader-gone') c2.waderGone(position);
      else if (name === 'biomesh-settle') c2.biomeshSettle(position);
      else if (name === 'hawser-groan') c2.hawserGroan(position);
      else if (name === 'lamp-tick') c2.lampTick(position);
      else if (name === 'kept-fire') c2.keptFire(position, opts);
      else if (name === 'taker-click') a.living.takerClick(position);
      else if (name === 'taker-murmur') a.living.takerMurmur(position);
      else if (name === 'coheirs-knot') a.living.coheirsKnot(position);
      else if (name === 'coheirs-hum') a.living.hum(position, opts);
      else if (name === 'sexton-bite') a.living.sextonBite(position);
      else if (name === 'sexton-throw') a.living.sextonThrow(position);
      else if (name === 'sleeper-breath') a.living.sleeperBreath(position);
      else if (name === 'sleeper-fruit') a.living.sleeperFruit(position);
      else if (name === 'stylite-creak') a.living.styliteCreak(position);
      else if (name === 'accrescent-step') a.living.accrescentStep(position);
      else if (name === 'moles-click') a.living.molesClick(position);
      else if (name === 'thurifer-chain') a.living.thuriferChain(position);
      else if (name === 'thurifer-hiss') a.living.hiss(position, opts);
      else if (name === 'leerie-step') a.living.leerieStep(position);
      else if (name === 'leerie-click') a.living.leerieClick(position);
      else if (name === 'linkboy-step') a.living.linkboyStep(position);
      else if (name === 'bather-pour') a.living.batherPour(position);
      else a.regionSnd?.cue(name, position, opts);
    } catch (e) { if (audio.debug) throw e; }
  }
  // --- stones, struck as you come near
  function update(f) {
    const { step, px, pz } = f;
    for (const s of stones) {
      const d = hyp(px - s.x, pz - s.z);
      s.cool -= step;
      if (s.armed && d < 20 && s.cool <= 0) { strike(s, 0.5 + 0.5 * (1 - d / 20)); s.armed = false; s.cool = 20; }
      if (!s.armed && d > 28) s.armed = true;
    }
  }
  return { cue, fallTick, update };
}
