#!/usr/bin/env node
// Frames through the tally at the Lantern Halt (v10-A4), in order, the way a visitor sees them: the approach, the
// offer, the stroke being made, the chalk swinging, the seat coming down, the ride up, the top, and set down again.
// Time is the page's own, driven by Playwright's clock once the scene is up, so a frame "0.8 s after E" is 0.8 s of
// the walk's time however slowly the headless browser draws. Each frame is 1280 x 720 (PHONE=1: 390 x 844, a few
// frames) into shots/wip/<prefix>-NN-<name>.png. The sun's guttering is held off.
// Usage: node tools/tally-frames.mjs [base] [prefix=acts-tally3] [part=all|chalk|ride|return|still]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const prefix = process.argv[3] || 'acts-tally3';
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
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); // from here the walk's time moves only by runFor
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
if (part === 'all' || part === 'chalk' || part === 'ride') {
  await look({ stand: 9, dp: 0.12 }); await run(2500); await shot('approach');
  await look({ stand: 2.4 }); await run(1500); await shot('offer');
  // E, then the visitor does not touch the mouse: what changes in the view they already have
  await page.keyboard.press('KeyE');
  let el = 0;
  for (const s2 of [0, 0.4, 1, 1.6, 3, 5, 7, 9, 12]) { await run(Math.max(1, (s2 - el) * 1000)); el = s2; await shot(`after-${s2}s`); }
}
if (part === 'all' || part === 'ride') {
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__fp.tally.seat.down)); i++) await run(500);
  await run(1200); await shot('seat-offer'); // from where they chalked: is the seat offered without looking for it?
  await page.keyboard.press('KeyE');
  const T = await page.evaluate(() => window.__fp.tally.ride.up);
  await run(1800); await shot('ride-board');
  await page.evaluate(() => { const p = window.__fp.player; p.yaw += 1.0; p.pitch = -0.35; }); await run(T * 1000 / 3); await shot('ride-third');
  await page.evaluate(() => { const p = window.__fp.player; p.yaw += 2.2; p.pitch = -0.15; }); await run(T * 1000 / 3); await shot('ride-two-thirds');
  for (let i = 0; i < 300 && (await page.evaluate(() => window.__fp.tally.ride.phase)) !== 'top'; i++) await run(100);
  await toward(await page.evaluate(() => window.__fp.tally.ride.sleeper));
  await page.evaluate(() => { window.__fp.player.pitch -= 0.12; });
  let e2 = 0;
  for (const s2 of [0, 2, 5, 8]) { await run(Math.max(1, (s2 - e2) * 1000)); e2 = s2; await shot(`top-${s2}s`); }
  await page.evaluate(() => { const p = window.__fp.player; p.yaw += Math.PI * 0.9; p.pitch = -0.1; });
  await run(800); await shot('top-outward');
  for (let i = 0; i < 80 && (await page.evaluate(() => !!window.__fp.tally.ride.phase)); i++) await run(500);
  await toward(await page.evaluate(() => window.__fp.tally.next)); await run(800); await shot('set-down');
  await page.evaluate(() => { const fp = window.__fp, w = fp.tally.seat.winch, p = fp.player; fp.controls.placeAt(w.x + 1.6, w.z + 1.4); });
  await toward(await page.evaluate(() => window.__fp.tally.seat.winch), -0.35); await run(800); await shot('winch');
}
if (part === 'still') { // the whole chain with no look input after the first press: what a visitor who never moves the mouse sees
  await look({ stand: 2.4 }); await run(1500); await page.keyboard.press('KeyE');
  for (let i = 0; i < 60 && (await page.evaluate(() => window.__fp.acts.offered?.def.id)) !== 'halt-seat'; i++) await run(500);
  await shot('seat-offer');
  await page.keyboard.press('KeyE');
  let k = 0, after = -1;
  while (k < 40) {
    await run(2000); k++;
    const ph = await page.evaluate(() => window.__fp.tally.ride.phase);
    if (ph === null && after < 0) after = 0;
    await shot(`t${String(k * 2).padStart(2, '0')}s${ph ? '-' + ph : ''}`);
    if (after >= 0 && (after += 2) > 6) break;
  }
}
if (part === 'return') { // a return visit after rides: what is new at the top
  await page.evaluate(() => { const fp = window.__fp; fp.acts.list.find((h) => h.def.id === 'halt-seat').def.show(3); });
  await look({ stand: 2.4 }); await run(1500); await page.keyboard.press('KeyE');
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__fp.tally.seat.down)); i++) await run(500);
  await run(1200); await page.keyboard.press('KeyE');
  for (let i = 0; i < 200 && (await page.evaluate(() => window.__fp.tally.ride.phase)) !== 'top'; i++) await run(100);
  await toward(await page.evaluate(() => window.__fp.tally.ride.sleeper)); await page.evaluate(() => { window.__fp.player.pitch -= 0.12; });
  await run(300); await shot('return-top');
}
await browser.close();
