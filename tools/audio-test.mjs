#!/usr/bin/env node
// Audio cue check: starts the audio module headlessly, fires every one-shot cue in turn and reports whether
// it threw and how much energy reached the one-shot bus's analyser in the second after it, against the
// silence just before (strike rings on the stones' own panners, so it is read from the master tap).
// Usage: node tools/audio-test.mjs [url]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low&only=audio';
const CUES = ['cry', 'crows', 'flush', 'plop', 'strike', 'rumble', 'farcry', 'skycreak', 'eyes-close', 'eyes-open', 'slinker-seen', 'slinker-gone', 'traveller-greet', 'tarn-hum', 'tarn-step'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
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
  const pos = { x: fp.camera.position.x + 3, y: fp.camera.position.y, z: fp.camera.position.z - 3 };
  for (const name of CUES) {
    const an = name === 'strike' ? a.analyser : a.cueAnalyser;
    let bed = 0, peak = 0, err = null;
    // a starved software renderer can run the audio thread late enough that a very short cue's envelope
    // has finished before it plays; try such a cue up to three times before calling it silent
    for (let attempt = 0; attempt < 3 && !err; attempt++) {
      bed = await rms(250, an);
      try { a.cue(name, name === 'strike' ? 1 : pos); } catch (e) { err = String(e); }
      peak = await rms(name === 'tarn-hum' || name === 'rumble' ? 1500 : 800, an);
      if (peak > bed * 1.06 || name === 'strike') break;
      await sleep(1500);
    }
    out.push({ name, err, bed: +bed.toFixed(5), cue: +peak.toFixed(5), gainDb: +(20 * Math.log10(Math.max(peak, 1e-7) / Math.max(bed, 1e-6))).toFixed(1) });
    await sleep(name === 'tarn-hum' || name === 'rumble' ? 6000 : 2500); // let the tail die before the next
  }
  return { state: a.ctx.state, out };
}, CUES);
console.log('AudioContext', res.state);
let bad = 0;
// strike rings at the stones, far off: it is checked for errors only
for (const r of res.out) { const ok = !r.err && (r.gainDb > 0.5 || r.name === 'strike'); if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', r.name.padEnd(16), `bed ${r.bed} cue ${r.cue} (+${r.gainDb} dB)`, r.err || ''); }
if (errors.length) { console.log('page errors:', errors.join('\n')); bad++; }
console.log(bad ? `${bad} problem(s)` : 'all cues sound');
await browser.close();
process.exit(bad ? 1 : 0);
