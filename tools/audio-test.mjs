#!/usr/bin/env node
// Audio cue check: starts the audio module headlessly, fires every one-shot cue in turn and reports whether
// it threw and how much energy reached the one-shot bus's analyser in the second after it, against the
// silence just before (strike rings on the stones' own panners, so it is read from the master tap). Each cue is
// fired at a representative place (inside its range) with representative opts. Then: the fall's rumble loop rises
// with ctx.river.rumble = 1 and dies with 0, and a burst of carillon hits never holds more than 12 voices.
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
  // v4 regions: the regions' own cues (src/v4/regions/<key>.js sound.cues)
  ['grouse-flush', { dx: 3, dy: -1.2, dz: -3 }], ['stonechat', { dx: 4, dy: -0.5, dz: -4 }],
  // the fall last: its loop is on the cue bus. enter must sound; leave must fade it (checked separately below)
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
  const out = [];
  const cp = fp.camera.position;
  const at = (o) => (typeof o === 'number' ? o : { x: cp.x + (o.dx || 0), y: cp.y + (o.dy || 0), z: cp.z + (o.dz || 0) });
  for (const [name, off, opts, listen = 800, settle = 2500] of CUES) {
    const label = name + (opts ? ' ' + JSON.stringify(opts) : '');
    const an = name === 'strike' ? a.analyser : a.cueAnalyser;
    let bed = 0, peak = 0, err = null;
    // a starved software renderer can run the audio thread late enough that a very short cue's envelope
    // has finished before it plays; try such a cue up to three times before calling it silent
    for (let attempt = 0; attempt < 3 && !err; attempt++) {
      bed = await rms(250, an);
      try { a.cue(name, at(off), opts || undefined); } catch (e) { err = String(e); }
      peak = await rms(listen, an);
      if (peak > bed * 1.06 || name === 'strike') break;
      await sleep(1500);
    }
    out.push({ name: label, err, bed: +bed.toFixed(5), cue: +peak.toFixed(5), gainDb: +(20 * Math.log10(Math.max(peak, 1e-7) / Math.max(bed, 1e-6))).toFixed(1) });
    await sleep(settle); // let the tail die before the next
  }
  const extra = [];
  // fall-rumble-leave: the loop that enter started fades out and is torn down within ~2.5 s
  {
    const before = await rms(400, a.cueAnalyser);
    let err = null; try { a.cue('fall-rumble-leave', at({ dx: 8, dy: 2, dz: -10 })); } catch (e) { err = String(e); }
    await sleep(3000);
    const after = await rms(400, a.cueAnalyser);
    extra.push({ name: 'fall-rumble-leave', ok: !err && after < before * 0.25 && !a.fall.running, info: `rms ${before.toFixed(5)} -> ${after.toFixed(5)}, running ${a.fall.running}`, err });
  }
  // the loop follows ctx.river.rumble with no cue at all
  {
    fp.river = Object.assign(fp.river || {}, { fall: { x: cp.x + 15, y: cp.y, z: cp.z - 20, rumbleRadius: 70 }, rumble: 0 });
    a.fall.pos = null; a.fall.left = false;
    await sleep(800);
    const g0 = a.fall.gain ? a.fall.gain.gain.value : 0;
    fp.river.rumble = 1; await sleep(2000);
    const g1 = a.fall.gain ? a.fall.gain.gain.value : 0, r1 = await rms(400, a.cueAnalyser);
    fp.river.rumble = 0; await sleep(3500);
    const g2 = a.fall.gain ? a.fall.gain.gain.value : 0, r2 = await rms(400, a.cueAnalyser);
    extra.push({ name: 'fall loop follows rumble', ok: g1 > g0 + 0.1 && g2 < g1 * 0.1 && r1 > r2, info: `gain ${g0.toFixed(4)} -> ${g1.toFixed(4)} (rumble 1) -> ${g2.toFixed(4)} (rumble 0); rms ${r1.toFixed(5)} -> ${r2.toFixed(5)}` });
    delete fp.river.rumble;
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
