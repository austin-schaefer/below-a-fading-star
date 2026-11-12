#!/usr/bin/env node
// Frames through the tally at the Lantern Halt (v10-A4), in order, the way a visitor sees them: the approach, the
// offer, the stroke being made, the chalk swinging, the seat coming down, the ride up, the top, and set down again.
// Time is the page's own, driven by Playwright's clock once the scene is up, so a frame "0.8 s after E" is 0.8 s of
// the walk's time however slowly the headless browser draws. Each frame is 1280 x 720 (PHONE=1: 390 x 844, a few
// frames) into shots/wip/<prefix>-NN-<name>.png. The sun's guttering is held off.
// Usage: node tools/tally-frames.mjs [base] [prefix=acts-tally2] [part=all|chalk|ride]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const prefix = process.argv[3] || 'acts-tally2';
const part = process.argv[4] || 'all';
const phone = process.env.PHONE === '1';
const [W, H] = phone ? [390, 844] : [1280, 720];
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctxB = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: phone });
const page = await ctxB.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
await page.clock.install(); // before the load: the walk's clock is Playwright's from its first frame
await page.goto(`${base}/?q=low&pos=-50,12`, { waitUntil: 'load', timeout: 120000 });
for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !!window.__fp?.tally)); i++) {
  await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 50)); // the build's fetches are real; its timers are the clock's
}
await page.evaluate(() => {
  const fp = window.__fp;
  fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden');
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
});
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 20)); // from here the walk's time moves only by runFor
let n = 0;
const run = (ms) => page.clock.runFor(ms);
const shot = async (name) => {
  const f = `shots/wip/${prefix}-${String(n++).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: f, timeout: 240000 });
  const s = await page.evaluate(() => { const fp = window.__fp, p = fp.player; return { offered: fp.acts.offered?.def.id || null, pos: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], ride: fp.tally.ride?.phase ?? null, t: +fp.time.t.toFixed(2), drawing: fp.tally.drawing, swing: fp.tally.chalk?.swinging }; });
  console.log(`[saved] ${f}`, JSON.stringify(s));
};
const look = (o) => page.evaluate((o) => {
  const fp = window.__fp, t = fp.tally, p = fp.player;
  if (o.stand) { const s = t.stand(o.stand); fp.controls.placeAt(s.x, s.z); p.yaw = s.yaw + (o.turn || 0); p.pitch = s.pitch + (o.dp || 0); p.vel.set(0, 0, 0); }
  if (o.yaw != null) p.yaw = o.yaw;
  if (o.pitch != null) p.pitch = o.pitch;
}, o);

const toward = (w, pitch) => page.evaluate(([w, pitch]) => { const p = window.__fp.player; p.yaw = Math.atan2(-(w.x - p.pos.x), -(w.z - p.pos.z)); p.pitch = pitch ?? Math.atan2(w.y - p.pos.y, Math.hypot(w.x - p.pos.x, w.z - p.pos.z)); }, [w, pitch]);
if (part === 'all' || part === 'chalk') {
  await look({ stand: 9, dp: 0.12 }); await run(2500); await shot('approach');
  await look({ stand: 2.4 }); await run(1500); await shot('offer');
  await page.keyboard.press('KeyE');
  for (const [ms, name] of [[300, 'stroke-0.3s'], [500, 'stroke-0.8s'], [700, 'stroke-1.5s'], [2500, 'stroke-4s']]) { await run(ms); await shot(name); }
}
if (part === 'all' || part === 'ride') {
  if (part === 'ride') { await look({ stand: 2.4 }); await run(1200); await page.keyboard.press('KeyE'); await run(4000); }
  // the seat: heard first (the winch), then seen coming down at the right of the view; the visitor turns a little to it
  await look({ yaw: (await page.evaluate(() => window.__fp.player.yaw)) - 0.35, pitch: 0.25 });
  await run(2600); await shot('seat-coming');
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__fp.tally.seat.down)); i++) await run(500);
  await toward(await page.evaluate(() => window.__fp.tally.seat.at)); await run(600); await shot('seat-arrived');
  await page.evaluate(() => { const fp = window.__fp, p = fp.player, s = fp.tally.seat.stand(); fp.controls.placeAt(s.x, s.z); p.yaw = s.yaw; p.pitch = s.pitch; p.vel.set(0, 0, 0); });
  await run(1500); await shot('seat-offer');
  await page.keyboard.press('KeyE');
  const T = await page.evaluate(() => window.__fp.tally.ride.up);
  await look({ pitch: -0.5 });
  await run(1500 + T * 1000 / 3); await shot('ride-third');
  await page.evaluate(() => { const p = window.__fp.player; p.yaw += 2.2; p.pitch = -0.15; }); await run(T * 1000 / 3); await shot('ride-two-thirds');
  await run(T * 1000 / 3 + 300);
  await toward(await page.evaluate(() => window.__fp.tally.ride.sleeper)); await run(300); await shot('top');
  await run(1800); await shot('top-sleeper-turns');
  await run(1300); await shot('top-sleeper-pats');
  await page.evaluate(() => { const p = window.__fp.player; p.yaw += Math.PI * 0.9; p.pitch = -0.1; });
  await run(800); await shot('top-outward');
  await page.evaluate(() => { const p = window.__fp.player; p.yaw -= Math.PI * 0.9; p.pitch = -1.0; });
  await run(800); await shot('top-down');
  for (let i = 0; i < 80 && (await page.evaluate(() => !!window.__fp.tally.ride.phase)); i++) await run(500);
  await toward(await page.evaluate(() => window.__fp.tally.next)); await run(800); await shot('set-down');
}
await browser.close();
