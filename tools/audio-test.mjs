#!/usr/bin/env node
// Audio cue check: starts the audio module headlessly, fires every one-shot cue in turn and reports whether
// it threw and how much energy reached the one-shot bus's analyser in the second after it, against the
// silence just before (strike rings on the stones' own panners, so it is read from the master tap). Each cue is
// fired at a representative place (inside its range) with representative opts. Then: the fall's rumble loop rises
// with ctx.river.rumble = 1 and dies with 0, and a burst of carillon hits never holds more than 12 voices. Last, the
// Repetend's echo (v7): audio.echoStep replays a step 1.0 s after it at the bird's position, within the voice cap.
// v7's living (src/audio/living.js): each figure's one-shot in the table; the two loops (coheirs-hum, thurifer-hiss)
// started (sounding, a second start ignored) and stopped (the gain falling within 0.1 s); with the figures loaded, the
// hum stopping as the Coheirs' heads turn; the loops released past range and with their module off; and the voice cap
// at the two clusters (the north-west on P3 by the Lynchets' east wall, the Leerie's row in a gutter), 10 s each.
// A one-shot is measured on its own voices (an analyser on each new voice's gate, read on the audio clock) when it
// makes any, so a late poll or another sound on the bus cannot hide or fake it; its level is that added in power to
// the bus's bed, against the same +0.5 dB as before. The fall's two checks read the loop's own output the same way.
// The Occultation's hush is held off for the table; with the world loaded, riverlife's rumble is driven by moving the fall.
// Usage: node tools/audio-test.mjs [url]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low&only=audio';
// [name, offset from the camera {dx, dy, dz} or a number (strike), opts, listen ms, settle ms after]
const CUES = [
  ...['cry', 'crows', 'flush', 'plop'].map((n) => [n, { dx: 3, dz: -3 }]),
  ['strike', 1], ['rumble', { dx: 3, dz: -3 }, null, 1500, 6000],
  ...['farcry', 'skycreak', 'eyes-close', 'eyes-open', 'slinker-seen', 'slinker-gone', 'traveller-greet'].map((n) => [n, { dx: 3, dz: -3 }]),
  ['tarn-hum', { dx: 3, dz: -3 }, null, 1500, 6000], ['tarn-step', { dx: 3, dz: -3 }],
  ['carillon', { dx: 0.4, dy: -1.6, dz: 0 }, { note: 0 }, 800, 4500], ['carillon', { dx: 0.4, dy: -1.6, dz: 0 }, { note: 8 }, 800, 4000],
  ['carillon', { dx: 40, dy: -1.6, dz: -20 }, { note: 4, quiet: true }, 800, 4000],
  ['glyph-shift', { dx: 4, dy: 1, dz: -5 }, null, 1500, 2000],
  ['sward-close', { dx: 10, dy: -1.5, dz: -6 }, null, 1500, 2000], ['sward-open', { dx: 10, dy: -1.5, dz: -6 }, null, 2500, 3000],
  ['sward-whimper', { dx: 1, dy: -1, dz: -1 }],
  ['pedlar-pass', { dx: 2, dy: 0.5, dz: -2 }], ['wrong-colour-near', { dx: 4, dz: -3 }, null, 1500, 3000],
  ['procession', { dx: 120, dy: 260, dz: -100 }, null, 3000, 6000],
  ['guest-heartbeat', { dx: 30, dz: -40 }, { strength: 0.05 }], ['guest-heartbeat', { dx: 30, dz: -40 }, { strength: 1 }],
  ['galley-drum', { dx: 30, dy: -2, dz: -20 }, { distance: 36 }], ['galley-drum', { dx: 90, dy: -2, dz: -60 }, { distance: 108 }],
  ['lizard-skitter', { dx: 1.5, dy: -1.6, dz: -1.5 }],
  ['rooks-lift', { dx: 20, dy: 6, dz: -25 }, { count: 12 }, 1500, 2000], ['crows', { dx: 10, dy: 4, dz: -8 }, { count: 3 }],
  ['bats-out', { dx: 40, dy: 25, dz: -50 }, { count: 20 }, 2000, 3000],
  ['wader-gone', { dx: 6, dz: -8 }, { quiet: true }], ['biomesh-settle', { dx: 2, dy: -1.5, dz: -3 }, { quiet: true }],
  ['hawser-groan', { dx: 120, dy: 40, dz: -160 }, null, 1500, 6500],
  ['lamp-tick', { dx: 3, dy: 3.5, dz: -4 }],
  ['kept-fire', { dx: 6, dy: -1.2, dz: -8 }, { flare: true }, 1500, 3500],
  // v4 regions: the regions' own cues (src/v4/regions/<key>.js sound.cues)
  ['grouse-flush', { dx: 3, dy: -1.2, dz: -3 }], ['stonechat', { dx: 4, dy: -0.5, dz: -4 }],
  // the fall last: its loop is on the cue bus. enter must sound; leave must fade it (checked separately below)
  // v7, the living: one firing per one-shot cue, each well inside its range (src/audio/living.js)
  ['taker-click', { dx: 2, dy: -0.4, dz: -3 }], ['taker-murmur', { dx: 1.5, dy: -0.5, dz: -2 }, null, 1200, 1500],
  ['coheirs-knot', { dx: 3, dy: -0.9, dz: -3 }],
  ['sexton-bite', { dx: 5, dy: -2, dz: -6 }], ['sexton-throw', { dx: 5, dy: -2, dz: -6 }, null, 1000, 2000],
  ['sleeper-breath', { dx: 2, dy: -1.4, dz: -2 }, null, 4500, 1500], ['sleeper-fruit', { dx: 2, dy: -1.5, dz: -2 }],
  ['stylite-creak', { dx: 4, dy: 8, dz: -5 }], ['accrescent-step', { dx: 2, dy: -0.5, dz: -3 }, null, 1200, 2000],
  ['moles-click', { dx: 1.5, dy: -1.6, dz: -1.5 }],
  ['thurifer-chain', { dx: 3, dy: -0.8, dz: -4 }],
  ['leerie-step', { dx: 4, dy: -1.7, dz: -5 }], ['leerie-click', { dx: 4, dy: 1.5, dz: -5 }],
  ['linkboy-step', { dx: 3, dy: -1.7, dz: -4 }],
  ['bather-pour', { dx: 10, dy: -22, dz: -15 }, null, 2000, 2500],
  // v8-05 the Pomegranate House (src/v8/house/sound.js)
  ['house-murmur', { dx: 3, dy: -0.5, dz: -3 }, { voice: 0, n: 6 }, 1500, 1000], ['house-laugh', { dx: 3, dy: -0.5, dz: -3 }, { n: 5 }, 1500, 1000], ['house-laugh', { dx: 3, dy: -0.5, dz: -3 }, { nervous: true }], ['house-pluck', { dx: 2, dy: -1, dz: -2 }, { note: 3, v: 0.8 }, 1000, 2000], ['house-cup', { dx: 2, dy: -0.9, dz: -2 }], ['house-tick', { dx: 1, dy: 0.8, dz: -1 }],
  // v10 the acts (src/v10/sound.js)
  ['act-offer', { dx: 1.5, dy: -0.3, dz: -1.5 }, null, 1000, 1200], ['act-chalk', { dx: 1.5, dy: -0.3, dz: -1.5 }, null, 1000, 1000], ['act-chalk', { dx: 1.5, dy: -0.3, dz: -1.5 }, { bar: true }, 1000, 1000],
  // v10-A1 the crystal and the door (src/v10/sound-central.js)
  ['act-crystal', { dx: 1.5, dy: -0.3, dz: -1.5 }, { n: 1 }, 2500, 7000], ['act-crystal-ring', { dx: 3, dy: 18, dz: -6 }, { n: 1 }, 1500, 7000], ['act-crystal-ring', { dx: 3, dy: 18, dz: -6 }, { n: 2, back: true }, 3000, 5000],
  ['act-knock', { dx: 1, dy: -0.5, dz: -1 }, null, 800, 800], ['act-answer', { dx: 2, dy: -2, dz: -2 }, { near: 0 }, 1500, 1500], ['act-answer', { dx: 1, dy: -0.5, dz: -1 }, { near: 1 }, 1000, 1500], ['act-tessera', { dx: 0.6, dy: -1.6, dz: -0.6 }, null, 1200, 600],
  ['fall-rumble-enter', { dx: 8, dy: 2, dz: -10 }, null, 1500, 500],
];
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const res = await page.evaluate(async (CUES) => {
  const fp = window.__fp, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try { fp.events.dispatchEvent(new Event('begin')); } catch (e) { /* pointer lock refuses headless */ }
  const a = fp.audio; a.debug = true;
  await a.ctx.resume(); await sleep(4500); // master fades in over 4 s
  const buf = new Float32Array(a.analyser.fftSize);
  const rms = async (ms, an) => { let s = 0, n = 0; const t0 = performance.now(); while (performance.now() - t0 < ms) { an.getFloatTimeDomainData(buf); for (const v of buf) { s += v * v; n++; } await sleep(20); } return Math.sqrt(s / n); };
  // the audio-clock reading of one node's own output: an analyser on it whose 0.68 s buffer is read every ~40 ms, each
  // read taking only the samples that arrived since the last (by ac.currentTime), so a late poll loses nothing
  const ac = a.ctx, sr = ac.sampleRate;
  const tapOf = (node) => { const an = ac.createAnalyser(); an.fftSize = 32768; node.connect(an); return { an, node, b: new Float32Array(32768) }; };
  const untap = (t) => { try { t.node.disconnect(t.an); } catch (e) { /* retired */ } };
  const ownRms = async (taps, sec) => {
    let E = 0, N = 0, last = ac.currentTime; const end = last + sec;
    while (ac.currentTime < end) {
      await sleep(40); const now = ac.currentTime, n = Math.min(32768, Math.round((now - last) * sr)); last = now;
      if (n <= 0) continue;
      for (const t of taps) { t.an.getFloatTimeDomainData(t.b); for (let i = 32768 - n; i < 32768; i++) E += t.b[i] * t.b[i]; }
      N += n;
    }
    return N ? Math.sqrt(E / N) : 0;
  };
  const untilAudio = async (t, wallMs = 15000) => { const w0 = performance.now(); while (ac.currentTime < t && performance.now() - w0 < wallMs) await sleep(20); };
  const out = [];
  const cp = fp.camera.position;
  const at = (o) => (typeof o === 'number' ? o : { x: cp.x + (o.dx || 0), y: cp.y + (o.dy || 0), z: cp.z + (o.dz || 0) });
  // the Occultation's hush (v5) drops bird cues under its band when it passes; it is held off for the table, so a cue
  // fired while it happens to be overhead (with the world loaded) is still heard, then put back
  const hush = fp.hush; fp.hush = null;
  for (const [name, off, opts, listen = 800, settle = 2500] of CUES) {
    const label = name + (opts ? ' ' + JSON.stringify(opts) : '');
    const an = name === 'strike' ? a.analyser : a.cueAnalyser;
    let bed = 0, peak = 0, err = null;
    // a starved software renderer can run the audio thread late enough that a very short cue's envelope
    // has finished before it plays; try such a cue up to three times before calling it silent
    let own = false;
    for (let attempt = 0; attempt < 3 && !err; attempt++) {
      bed = await rms(250, an);
      const had = new Set(a.voices);
      try { a.cue(name, at(off), opts || undefined); } catch (e) { err = String(e); }
      const mine = a.voices.filter((v) => !had.has(v));
      own = mine.length > 0;
      if (own) { // its own voices, on the audio clock from their start, added in power to the bed
        const taps = mine.map((v) => tapOf(v.gate));
        await untilAudio(Math.min(...mine.map((v) => v.t0)));
        const vr = await ownRms(taps, listen / 1000); taps.forEach(untap);
        peak = Math.sqrt(bed * bed + vr * vr);
      } else peak = await rms(listen, an);
      if (peak > bed * 1.06 || name === 'strike') break;
      await sleep(1500);
    }
    out.push({ name: label, err, own, bed: +bed.toFixed(5), cue: +peak.toFixed(5), gainDb: +(20 * Math.log10(Math.max(peak, 1e-7) / Math.max(bed, 1e-6))).toFixed(1) });
    await sleep(settle); // let the tail die before the next
  }
  fp.hush = hush;
  const extra = [];
  // fall-rumble-leave: the loop that enter started fades out and is torn down within ~2.5 s
  // (read on the loop's own output, on the audio clock: 3 s of audio time after the cue, and the teardown awaited)
  {
    const tap = a.fall.parts ? tapOf(a.fall.parts.p) : null;
    const before = tap ? await ownRms([tap], 0.4) : 0;
    const t0 = ac.currentTime;
    let err = null; try { a.cue('fall-rumble-leave', at({ dx: 8, dy: 2, dz: -10 })); } catch (e) { err = String(e); }
    await untilAudio(t0 + 3.0);
    for (let w = 0; w < 100 && a.fall.running; w++) await sleep(50); // the teardown's wall-clock timer, late under load
    const after = tap ? await ownRms([tap], 0.4) : 0; if (tap) untap(tap);
    extra.push({ name: 'fall-rumble-leave', ok: !err && !!tap && before > 0 && after < before * 0.25 && !a.fall.running, info: `its own rms ${before.toFixed(5)} -> ${after.toFixed(5)} (3 s of audio time), running ${a.fall.running}`, err });
  }
  // the loop follows ctx.river.rumble with no cue at all. With the world loaded, riverlife writes rumble every frame from
  // the walker's distance to ctx.river.fall, so the test drives it both ways: rumble set, and the fall put at the walker
  // (rumble 1) or 5 km off (rumble 0); the real fall is put back after
  {
    const realFall = fp.river?.fall;
    const near = { x: cp.x, y: cp.y, z: cp.z, rumbleRadius: 70 }, far = { x: cp.x + 5000, y: cp.y, z: cp.z, rumbleRadius: 70 };
    fp.river = Object.assign(fp.river || {}, { fall: far, rumble: 0 });
    a.fall.pos = null; a.fall.left = false;
    await sleep(800);
    for (let w = 0; w < 100 && a.fall.running; w++) await sleep(50); // a fall already rumbling (the real one, at spawn) dies first
    const g0 = a.fall.gain ? a.fall.gain.gain.value : 0;
    // timed on the audio clock; the gain follows rumble at 10 Hz of frames (or the 100 ms fallback), so under load the
    // wait runs on until it has risen (up to 8 s of audio time) before it is read
    let t0 = ac.currentTime;
    fp.river.fall = near; fp.river.rumble = 1; await untilAudio(t0 + 2.0);
    for (let w = 0; w < 120 && !(a.fall.gain && a.fall.gain.gain.value > g0 + 0.1) && ac.currentTime < t0 + 8; w++) await sleep(50);
    const tap = a.fall.parts ? tapOf(a.fall.parts.p) : null;
    const g1 = a.fall.gain ? a.fall.gain.gain.value : 0, r1 = tap ? await ownRms([tap], 0.4) : 0;
    t0 = ac.currentTime;
    fp.river.fall = far; fp.river.rumble = 0; await untilAudio(t0 + 3.5);
    for (let w = 0; w < 100 && a.fall.running; w++) await sleep(50);
    const g2 = a.fall.gain ? a.fall.gain.gain.value : 0, r2 = tap ? await ownRms([tap], 0.4) : 0; if (tap) untap(tap);
    extra.push({ name: 'fall loop follows rumble', ok: g1 > g0 + 0.1 && g2 < g1 * 0.1 && r1 > r2, info: `gain ${g0.toFixed(4)} -> ${g1.toFixed(4)} (rumble 1) -> ${g2.toFixed(4)} (rumble 0); rms ${r1.toFixed(5)} -> ${r2.toFixed(5)}` });
    delete fp.river.rumble; a.fall.left = true; if (realFall) fp.river.fall = realFall; else delete fp.river.fall; // the loop left off the bus below (riverlife, with the world loaded, starts the real one again)
  }
  // voice cap: a running player across the carillon, twenty caps in under a second
  {
    let most = 0;
    const t0 = performance.now();
    for (let k = 0; k < 20; k++) { a.cue('carillon', at({ dx: 0.4, dy: -1.6, dz: k * 0.6 }), { note: k % 9 }); most = Math.max(most, a.voices.length); await sleep(40); }
    const took = performance.now() - t0;
    // the floor of 10 only holds if the twenty cues really landed inside about a second; under load the
    // sleeps stretch and early voices end before the late ones start, which says nothing about the cap
    const stretched = took > 1500;
    extra.push({ name: 'voice cap', ok: most <= 12 && (stretched || most >= 10), info: `most voices at once ${most} (cap 12)${stretched ? `, loop stretched to ${took.toFixed(0)} ms under load so the floor was not measured` : ''}` });
  }
  // the Repetend's echo (v7): a walker's step, replayed by audio.echoStep 1.0 s later through a panner at the bird (4 m off).
  // It must be scheduled 1.0 s after the step, sit at the bird's position, and be heard 1.0 +- 0.05 s after the step: read
  // off the echo's own voice (an analyser on its gate, so nothing else on the cue bus counts), as the first sample of its
  // onset in a 0.68 s buffer, timed from the audio clock, so a late poll on a loaded machine does not move it. Then hurrying
  // beside the bird (a step and its echo every 0.17 s for 3 s) must keep the voices within the cap of 12
  {
    await sleep(1500);
    const bird = at({ dx: 3, dy: -1.2, dz: -2.6 });
    fp.player.onStep(false);
    const rec = a.steps.ring[(a.steps.seq - 1) & 15], t0 = rec.t;
    const o = a.echoStep(rec, bird, 1.0), sched = o ? o.at - t0 : NaN;
    let heard = NaN, peak = 0, polls = 0;
    if (o) {
      const an = a.ctx.createAnalyser(); an.fftSize = 32768; o.voice.gate.connect(an);
      const eb = new Float32Array(an.fftSize), sr = a.ctx.sampleRate;
      while (a.ctx.currentTime < t0 + 2.5 && heard !== heard) {
        await sleep(50); polls++;
        if (a.ctx.currentTime < t0 + 1.1) continue;
        an.getFloatTimeDomainData(eb); const now = a.ctx.currentTime;
        let mx = 0; for (const v of eb) mx = Math.max(mx, Math.abs(v));
        peak = Math.max(peak, mx);
        if (mx < 1e-4) continue;
        const thr = mx * 0.05; let i = 0; while (i < eb.length && Math.abs(eb[i]) < thr) i++;
        if (i > 0) heard = now - (eb.length - i) / sr - t0; // the onset lies inside this buffer, after silence
      }
      try { o.voice.gate.disconnect(an); } catch (e) { /* already retired */ }
    }
    const p = o?.voice?.pan, px = p?.positionX ? [p.positionX.value, p.positionY.value, p.positionZ.value] : null;
    let most = 0;
    for (let k = 0; k < 18; k++) {
      fp.player.onStep(true); const r2 = a.steps.ring[(a.steps.seq - 1) & 15];
      setTimeout(() => { a.echoStep(r2, bird, 1.0); }, 850);
      most = Math.max(most, a.voices.length); await sleep(170);
    }
    for (let k = 0; k < 12; k++) { most = Math.max(most, a.voices.length); await sleep(100); }
    const placed = px && Math.hypot(px[0] - bird.x, px[1] - bird.y, px[2] - bird.z) < 0.01;
    extra.push({ name: 'repetend echo', ok: Math.abs(sched - 1) < 1e-6 && Math.abs(heard - 1) <= 0.05 && placed && most <= 12, info: `scheduled ${sched.toFixed(3)} s after the step, heard at ${heard.toFixed(3)} s (its voice's peak ${peak.toExponential(1)}, ${polls} polls), at the bird ${placed}, most voices hurrying beside it ${most} (cap 12)` });
  }

  // ---- v7, the living: the loops. Start: it sounds on its own output (as a one-shot is judged) and a second start is
  // ignored (one voice, no stacking). Stop: its gain is falling 0.1 s of audio time after the stop, and it is silent and
  // released by 0.6 s
  const L7 = a.living.loops;
  for (const name of ['coheirs-hum', 'thurifer-hiss']) {
    const L = L7[name], pos = at({ dx: 3, dy: -1, dz: -4 });
    const fx = L.follow; L.follow = null; // held where the test puts it (with the figures loaded the hiss follows the Thurifer)
    // the bed: the cue bus less the fall's loop where it is running (with the world loaded it rumbles at spawn)
    const fallTap = a.fall.parts ? tapOf(a.fall.parts.p) : null;
    const bus = await rms(250, a.cueAnalyser), fr = fallTap ? await ownRms([fallTap], 0.25) : 0; if (fallTap) untap(fallTap);
    const bed = Math.sqrt(Math.max(bus * bus - fr * fr, 0));
    let err = null; try { a.cue(name, pos, { start: true }); } catch (e) { err = String(e); }
    const opens = L.opens;
    try { a.cue(name, pos, { start: true }); } catch (e) { err = String(e); }
    const tap = L.pan ? tapOf(L.pan) : null;
    await untilAudio(ac.currentTime + 0.4);
    const vr = tap ? await ownRms([tap], 0.8) : 0, lvl = Math.sqrt(bed * bed + vr * vr), db = 20 * Math.log10(Math.max(lvl, 1e-7) / Math.max(bed, 1e-6));
    extra.push({ name: `${name} start`, ok: !err && L.on && L.opens === opens && db > 0.5, info: `its own rms ${vr.toFixed(5)} over bed ${bed.toFixed(5)} (the bus ${bus.toFixed(5)} less the fall ${fr.toFixed(5)}) (+${db.toFixed(1)} dB), opened ${L.opens}x after two starts`, err });
    const g = L.out.gain, gs = g.value, tS = ac.currentTime;
    try { a.cue(name, pos, { stop: true }); } catch (e) { err = String(e); }
    await untilAudio(tS + 0.1); const g1 = g.value, dt1 = ac.currentTime - tS;
    await untilAudio(tS + 0.6); const after = tap ? await ownRms([tap], 0.3) : 0; if (tap) untap(tap);
    L.follow = fx;
    extra.push({ name: `${name} stop`, ok: !err && !L.on && g1 < gs * 0.85 && after < vr * 0.1, info: `gain ${gs.toFixed(4)} -> ${g1.toFixed(4)} at +${dt1.toFixed(3)} s; its own rms ${after.toFixed(6)} after 0.6 s`, err });
  }
  // the hum stops as the Coheirs' heads turn (only with the figures loaded): stand 8 m off them, let the hum start, turn
  // their heads; the stop must come within 0.1 s of audio time of the turn (the figure's next update), its gain falling
  if (fp.workers?.coheirs) {
    const C = fp.workers.coheirs, s0 = C.seats[0], s1 = C.seats[1], A = C.axis, L = L7['coheirs-hum'];
    const home = { x: fp.player.pos.x, z: fp.player.pos.z };
    C.state.phase = 'work'; C.state.turn = 0; C.state.armed = false;
    fp.controls.placeAt((s0.x + s1.x) / 2 - A[1] * 8, (s0.z + s1.z) / 2 + A[0] * 8); // 8 m off the net's middle, square to it
    for (let w = 0; w < 200 && !L.on; w++) await sleep(50);
    await untilAudio(ac.currentTime + 0.6);
    const g = L.out?.gain, gs = g ? g.value : 0, c0 = L.closes, tT = ac.currentTime;
    C.turn(true);
    for (let w = 0; w < 100 && L.closes === c0; w++) await sleep(10);
    const tC = ac.currentTime - tT;
    await untilAudio(tT + 0.15); const g1 = g ? g.value : 0;
    extra.push({ name: 'coheirs-hum stops as heads turn', ok: L.closes > c0 && tC <= 0.1 && g1 < gs, info: `stopped ${tC.toFixed(3)} s after the turn, gain ${gs.toFixed(4)} -> ${g1.toFixed(4)} by +0.15 s` });
    C.release(); fp.controls.placeAt(home.x, home.z);
    await sleep(1000);
  }
  // released past range and with the module off, reopened when back while still wanted
  {
    const L = L7['thurifer-hiss'], pos = at({ dx: 3, dy: -1, dz: -4 });
    const fx = L.follow; L.follow = null; // hold it where the test puts it (with the figures loaded it follows the Thurifer)
    a.cue('thurifer-hiss', pos, { start: true }); await sleep(300);
    const on0 = L.on;
    L.x += 40; await sleep(400); const far = L.on;
    L.x -= 40; await sleep(400); const back = L.on;
    const T = fp.perf?.toggles?.['living-walkers'], fake = !T;
    if (fake) fp.perf.toggles['living-walkers'] = { get: () => false, set() {} }; else T.set(false);
    await sleep(400); const offOn = L.on;
    if (fake) delete fp.perf.toggles['living-walkers']; else T.set(true);
    await sleep(400); const again = L.on;
    a.cue('thurifer-hiss', pos, { stop: true }); L.follow = fx;
    extra.push({ name: 'loops release past range, module off', ok: on0 && !far && back && !offOn && again && !L.on, info: `on ${on0}, 40 m off ${far}, back ${back}, module off ${offOn}, on again ${again}${fake ? ' (the toggle faked: no walkers loaded)' : ''}` });
  }
  // ---- the voice cap at the two clusters, 10 s each, sampled every 50 ms; the cues at their real cadences round the walker.
  // NW: the Thurifer (its hiss, the chain every 0.9 s at 6 m), the Link-Boy walking ahead at 9 m (a step every 0.42 s,
  // the flutter if he is loaded), the walker hurrying on P3 by the Lynchets' east wall (a step every 0.17 s) and the
  // Repetend echoing each 1.0 s late at 4 m. The Leerie's row in a gutter: his step every 0.6 s at 5 m and a touch's click
  // twice, the lights' lamp-tick wave along twelve standards 10 m apart, and the walker walking (a step every 0.3 s)
  const cluster = async (label, plan) => {
    let most = 0, sum = 0, n = 0, cueMs = 0; const timers = [];
    const fire = (name, p, o) => { const t = performance.now(); try { a.cue(name, p, o); } catch (e) { /* counted below */ } cueMs += performance.now() - t; };
    plan(fire, timers);
    const t0 = ac.currentTime;
    while (ac.currentTime < t0 + 10) { const k = a.voices.length; most = Math.max(most, k); sum += k; n++; await sleep(50); }
    timers.forEach(clearInterval);
    await sleep(1500);
    extra.push({ name: label, ok: most <= 12 && most > 0, info: `peak voices ${most} (cap 12), mean ${(sum / n).toFixed(1)} over 10 s of audio time; ${cueMs.toFixed(0)} ms of main thread in the cue calls` });
  };
  await cluster('cluster NW (P3, the Lynchets wall)', (fire, T) => {
    const th = at({ dx: 5, dy: -1.5, dz: -3 }), lb = at({ dx: 0, dy: -1.7, dz: -9 }), bird = at({ dx: 3, dy: -1.2, dz: -2.6 });
    fire('thurifer-hiss', th, { start: true });
    T.push(setInterval(() => fire('thurifer-chain', th), 900));
    T.push(setInterval(() => fire('linkboy-step', lb), 420));
    T.push(setInterval(() => { fp.player.onStep(true); const r = a.steps.ring[(a.steps.seq - 1) & 15]; setTimeout(() => a.echoStep(r, bird, 1.0), 850); }, 170));
    T.push(setTimeout(() => fire('thurifer-hiss', th, { stop: true }), 9900));
  });
  await cluster('cluster at the Leerie\'s row (a gutter)', (fire, T) => {
    const le = at({ dx: 3, dy: -1.7, dz: -4 }), cage = at({ dx: 3, dy: 1.5, dz: -4 });
    T.push(setInterval(() => fire('leerie-step', le), 600));
    T.push(setTimeout(() => fire('leerie-click', cage), 1000), setTimeout(() => fire('leerie-click', cage), 8000));
    for (let i = 0; i < 12; i++) T.push(setTimeout(() => fire('lamp-tick', at({ dx: -20 + i * 10 * 0.6, dy: 2, dz: -6 - i * 10 * 0.8 })), 2000 + i * 280));
    T.push(setInterval(() => fp.player.onStep(false), 300));
  });

  return { state: a.ctx.state, out, extra };
}, CUES);
console.log('AudioContext', res.state);
let bad = 0;
// strike rings at the stones, far off: it is checked for errors only
for (const r of res.out) { const ok = !r.err && (r.gainDb > 0.5 || r.name === 'strike'); if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', r.name.padEnd(36), `bed ${r.bed} cue ${r.cue} (+${r.gainDb} dB)`, r.err || ''); }
for (const r of res.extra) { if (!r.ok) bad++; console.log(r.ok ? 'PASS' : 'FAIL', r.name.padEnd(36), r.info, r.err || ''); }
console.log(`${res.out.length + res.extra.length - bad} / ${res.out.length + res.extra.length} checks pass`);
if (errors.length) { console.log('page errors:', errors.join('\n')); bad++; }
console.log(bad ? `${bad} problem(s)` : 'all cues sound');
await browser.close();
process.exit(bad ? 1 : 0);
