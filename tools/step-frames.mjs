#!/usr/bin/env node
// Frames a step apart, walked on the keys (v15-F1): a judge's tool for flicker, which needs motion. One page: "Go out",
// the view clicked so the mouse is captured, the walker set down once at the start (the only teleport), then W held
// for `ms` at a time with the look held where it is, a frame after each pulse. Read the frames in order: a face that
// changes between two frames while nothing in front of it moved is a flicker.
//   node tools/step-frames.mjs <base> <q> <x,z[,y]> <yaw> <pitch> [n=8] [ms=180] [prefix=step] [key=KeyW]
// y, when given, is the feet's height (placeAt onto the floor there); else the highest underground way's floor there. Frames: shots/wip/<prefix>-<q>-NN.png; prints
// where the feet are at each.
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base, q = 'medium', at, yaw = '0', pitch = '0', n = '8', ms = '180', prefix = 'step', key = 'KeyW'] = process.argv.slice(2);
if (!base || !at) { console.log('usage: step-frames.mjs <base> <q> <x,z[,y]> <yaw> <pitch> [n] [ms] [prefix] [key]'); process.exit(2); }
const [x, z, y] = at.split(',').map(Number);
const browser = await pw.chromium.launch({ channel: 'chromium', args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=${q}&pos=${x},${z}&yaw=${yaw}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (t) => new Promise((r) => setTimeout(r, t));
await page.click('#begin').catch(() => {});
await sleep(500);
await page.mouse.click(640, 360);
await sleep(800);
await page.evaluate(([x, z, y, yaw, pitch]) => {
  const fp = window.__fp, p = fp.player;
  // no y: the highest of the underground ways' floors there (the Noon Road, the passage, the Pit's stair and bowl), else the ground
  if (!Number.isFinite(y)) { const fl = [fp.coffinRoad?.floor, fp.passage?.floor, fp.pit?.floor, fp.pit?.bowl].map((f) => f?.(x, z)).filter((v) => Number.isFinite(v)); if (fl.length) y = Math.max(...fl) + 0.02; }
  if (Number.isFinite(y)) fp.controls.placeAt(x, z, y); else fp.controls.placeAt(x, z);
  p.yaw = yaw; p.pitch = pitch; p.vel?.set(0, 0, 0);
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
}, [x, z, y, +yaw, +pitch]);
await sleep(2500);
const locked = await page.evaluate(() => !!document.pointerLockElement);
console.log(`pointer captured: ${locked}`);
for (let i = 0; i <= +n; i++) {
  if (i > 0) { await page.keyboard.down(key); await sleep(+ms); await page.keyboard.up(key); await sleep(350); }
  const s = await page.evaluate(([yaw, pitch]) => { const fp = window.__fp, p = fp.player; p.yaw = yaw; p.pitch = pitch; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, floor: p.onStack?.name || 'ground' }; }, [+yaw, +pitch]);
  await sleep(120);
  const f = `shots/wip/${prefix}-${q}-${String(i).padStart(2, '0')}.png`;
  await page.screenshot({ path: f });
  console.log(`${f} x ${s.x.toFixed(2)} z ${s.z.toFixed(2)} feet ${s.feet.toFixed(2)} on ${s.floor}`);
}
await browser.close();
