#!/usr/bin/env node
// Records the master output of a full gutter to a WAV (7.1): 5 s of bed, the sun held at 0.2 for 9 s, back to 1 for 6 s.
// Real-time through a script processor on the master bus; prints peak and RMS of the whole take, of the gutter window,
// and of the gutter window above 2 kHz (one-pole high-pass pair). Usage: node tools/gutter-wav.mjs <url> <out.wav>
import { createRequire } from 'node:module';
import fs from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const [url, out] = [process.argv[2] || 'http://localhost:8123/?q=low&only=audio', process.argv[3] || 'shots/wip/gutter.wav'];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => { window.__fp.events.dispatchEvent(new CustomEvent('begin')); });
await page.waitForFunction(() => window.__fp.audio && window.__fp.audio.ctx, null, { timeout: 60000 });
const r = await page.evaluate(async () => {
  const a = window.__fp.audio, ac = a.ctx, fl = window.__fp.sky.flicker;
  await ac.resume(); fl.hold = 1;
  await new Promise((r) => setTimeout(r, 5000)); // the master fades in over 4 s
  const sp = ac.createScriptProcessor(4096, 2, 2), chunks = [], t0 = ac.currentTime;
  sp.onaudioprocess = (e) => chunks.push([new Float32Array(e.inputBuffer.getChannelData(0)), new Float32Array(e.inputBuffer.getChannelData(1))]);
  a.master.connect(sp); const z = ac.createGain(); z.gain.value = 0; sp.connect(z); z.connect(ac.destination);
  await new Promise((r) => setTimeout(r, 3000));
  const g0 = ac.currentTime - t0; fl.hold = 0.2;
  await new Promise((r) => setTimeout(r, 9000));
  const g1 = ac.currentTime - t0; fl.hold = 1;
  await new Promise((r) => setTimeout(r, 6000));
  a.master.disconnect(sp);
  const n = chunks.length * 4096, L = new Float32Array(n), R = new Float32Array(n);
  chunks.forEach((c, i) => { L.set(c[0], i * 4096); R.set(c[1], i * 4096); });
  return { sr: ac.sampleRate, g0, g1, L: Array.from(L), R: Array.from(R) };
});
await browser.close();
const { sr, L, R } = r, n = L.length;
const buf = Buffer.alloc(44 + n * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
fs.writeFileSync(out, buf);
const stat = (x, a, b) => { let pk = 0, s = 0; const i0 = Math.floor(a * sr), i1 = Math.min(x.length, Math.floor(b * sr)); for (let i = i0; i < i1; i++) { const v = Math.abs(x[i]); if (v > pk) pk = v; s += x[i] * x[i]; } return { peak: +pk.toFixed(4), rms: +Math.sqrt(s / (i1 - i0)).toFixed(5) }; };
const hp = (x) => { const o = new Float32Array(x.length), k = Math.exp(-2 * Math.PI * 2000 / sr); let y1 = 0, x1 = 0; for (let i = 0; i < x.length; i++) { const y = k * (y1 + x[i] - x1); o[i] = y; y1 = y; x1 = x[i]; } return o; };
const H = hp(hp(L));
console.log(out, 'seconds', (n / sr).toFixed(1), 'gutter window', r.g0.toFixed(1), '-', r.g1.toFixed(1));
console.log('all     ', JSON.stringify(stat(L, 0, n / sr)));
console.log('bed     ', JSON.stringify(stat(L, 0.5, r.g0)));
console.log('gutter  ', JSON.stringify(stat(L, r.g0 + 1.5, r.g1)));
console.log('gutter >2k', JSON.stringify(stat(H, r.g0 + 1.5, r.g1)), 'bed >2k', JSON.stringify(stat(H, 0.5, r.g0)));
