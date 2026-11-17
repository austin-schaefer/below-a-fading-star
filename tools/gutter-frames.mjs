#!/usr/bin/env node
// Frames through one real sun-gutter, in order (v16-S1): loads the walk at a stand, lets the visitor go out, starts a
// gutter at once (flicker.next = 0) and reads the canvas at the given seconds after its onset on the page's own clock,
// so what answers late (the Lappet's lamps, the folk, the Laid Sun) and what comes back slowly is seen as it moves.
// Usage: node tools/gutter-frames.mjs <base> <name> <x> <z> <yaw> <pitch> [y] [q=low]
//   frames: shots/wip/v16-S1-seq-<name>-<tt>s.png at 0, 1, 2, 3, 4.5, 6, 9, 12, 14, 16, 19, 24 s; one line each with the
//   flicker's value, dark and lamps.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const [base, name, x, z, yaw, pitch, y = '', q = 'low'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=${q}&pos=${x},${z}&yaw=${yaw}&pitch=${pitch}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(([x, z, y, yaw, pitch]) => {
  const fp = window.__fp; fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card')?.classList.add('hidden');
  for (const k of ['place', 'hint']) { const e = document.getElementById(k); if (e) e.style.visibility = 'hidden'; }
  fp.sky.flicker.next = 1e9;
  if (y !== '') fp.controls.placeAt(+x, +z, +y);
  fp.player.yaw = +yaw; fp.player.pitch = +pitch;
}, [x, z, y, yaw, pitch]);
await page.waitForTimeout(4000);
await page.evaluate(([yaw, pitch]) => { const fp = window.__fp; fp.player.yaw = +yaw; fp.player.pitch = +pitch; fp.sky.flicker.next = 0; window.__g0 = fp.time.t; }, [yaw, pitch]);
const at = [0, 1, 2, 3, 4.5, 6, 9, 12, 14, 16, 19, 24];
for (const s of at) {
  await page.waitForFunction((s) => window.__fp.time.t - window.__g0 >= s, s, { timeout: 120000 });
  const r = await page.evaluate(() => { const fp = window.__fp, f = fp.sky.flicker; fp.post.composer.render(); return { url: document.getElementById('scene').toDataURL('image/png'), t: fp.time.t - window.__g0, v: f.value, d: f.dark, l: f.lamps }; });
  const out = `shots/wip/v16-S1-seq-${name}-${String(s.toFixed(1)).padStart(4, '0')}s.png`;
  writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(`${out}  t ${r.t.toFixed(2)}  flicker ${r.v.toFixed(2)}  dark ${r.d.toFixed(2)}  lamps ${r.l.toFixed(2)}`);
}
await browser.close();
