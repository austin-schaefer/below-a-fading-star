#!/usr/bin/env node
// Frames through the bell's stroke (v11-F2), no look input after the press: 0.3, 1, 2, 4, 6 s after E, from a stand
// point and yaw. Time is Playwright's clock. Usage: node tools/bell-frames.mjs [base] [prefix=v11-F2-bell] [x z yaw]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const prefix = process.argv[3] || 'v11-F2-bell';
const [sx, sz, syaw] = [process.argv[4] ?? -60.6, process.argv[5] ?? 199.3, process.argv[6] ?? -3.14].map(Number);
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.clock.install();
await page.goto(`${base}/?q=low&pos=${sx},${sz}`, { waitUntil: 'load', timeout: 120000 });
for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !!window.__fp?.bell)); i++) { await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 50)); }
await page.evaluate(([x, z, yaw]) => {
  const fp = window.__fp, p = fp.player;
  fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden');
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
  const s = fp.bell.stand(0); fp.controls.placeAt(s.x, s.z); p.yaw = s.yaw; p.pitch = s.pitch; p.vel.set(0, 0, 0);
  if (!Number.isNaN(x)) { fp.controls.placeAt(x, z); p.yaw = yaw; p.pitch = 0; }
}, [sx, sz, syaw]);
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
await page.clock.runFor(1500);
await page.keyboard.press('KeyE');
// the stroke lands some seconds after E; frames are taken from the strike, as the critic's were from the press
let el = 0;
for (const s of [0.3, 1, 2, 4, 6]) {
  await page.clock.runFor(Math.max(1, (s - el) * 1000)); el = s;
  const f = `shots/wip/${prefix}-${s}s.png`;
  await page.screenshot({ path: f, timeout: 240000 });
  console.log('[saved]', f, JSON.stringify(await page.evaluate(() => { const b = window.__fp.bell.state; return { t: +b.t.toFixed(2), rang: b.rang, waveR: +window.__fp.bell.waveR().toFixed(1) }; })));
}
await browser.close();
