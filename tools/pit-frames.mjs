#!/usr/bin/env node
// Frames through the sounding at the bottom of the Pit (v14-D2), in order, on the page's own clock (the model:
// tools/tally-frames.mjs): Playwright's clock installed before the load, paused once the scene is up, moved only by
// runFor, so "1 s after E" is a second of the walk's time however slowly the headless browser draws. No look input
// after the press. Frames 1280 x 720 (PHONE=1: 390 x 844) into shots/wip/<prefix>-<part>-NN-<name>.png.
//   floor: stood at the down-reel facing the Nadir (the offer comes on its own), E, then 0.3, 1, 2, 5, 8, 9, 11, 15,
//          22 and 26 s
//   lip:   stood at the south lookout looking in and down; the sounding started below (as another visitor would),
//          then 0.3, 1, 2, 5, 8, 9, 11, 15 and 22 s
//   fall:  placed over the Nadir: 0.3, 1, 2, 3.5 s (the night under the world, the veil) and 5.5 s (the Bitter End)
// Usage: node tools/pit-frames.mjs [base] [prefix=pit-act] [part=all|floor|lip|fall] [q=low]
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const prefix = process.argv[3] || 'pit-act';
const part = process.argv[4] || 'all';
const q = process.argv[5] || 'low';
const phone = process.env.PHONE === '1';
const [W, H] = phone ? [390, 844] : [1280, 720];
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctxB = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: phone });
const page = await ctxB.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
await page.clock.install();
await page.goto(`${base}/?q=${q}&pos=194.2,201`, { waitUntil: 'load', timeout: 120000 });
for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !!window.__fp?.pit)); i++) {
  await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 50));
}
await page.evaluate(() => {
  const fp = window.__fp;
  fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden');
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
});
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
const run = (ms) => page.clock.runFor(ms);
const shot = async (tag, n, name) => {
  const f = `shots/wip/${prefix}-${tag}-${String(n).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: f, timeout: 240000 });
  const s = await page.evaluate(() => { const fp = window.__fp, p = fp.player, S = fp.pit.state; return { offered: fp.acts.offered?.def.id || null, t: +S.t.toFixed(2), lead: +S.leadY.toFixed(1), flow: +S.flow.toFixed(2), gust: +S.gust.toFixed(2), feet: +(p.pos.y - p.eye).toFixed(2) }; });
  console.log(`[saved] ${f}`, JSON.stringify(s));
};
const TIMES_FLOOR = [0.3, 1, 2, 5, 8, 9, 11, 15, 22, 26], TIMES_LIP = [0.3, 1, 2, 5, 8, 9, 11, 15, 22];
async function through(tag, times, press) {
  let n = 0;
  await shot(tag, n++, 'before');
  await press();
  let el = 0;
  for (const s of times) { await run(Math.max(1, (s - el) * 1000)); el = s; await shot(tag, n++, `after-${s}s`); }
  for (let i = 0; i < 80 && (await page.evaluate(() => window.__fp.pit.state.t >= 0)); i++) await run(500);
}
if (part === 'all' || part === 'floor') {
  // a step back from the reel on the passage's side, facing the Nadir over the reel
  await page.evaluate(() => {
    // beside the drum's crank end, a little toward the Nadir, looking at the hole with the reel's end at the right
    const fp = window.__fp, P = fp.pit, p = fp.player, dx = (P.reel.x - 200) / 5.6, dz = (P.reel.z - 185) / 5.6, ax = -dz, az = dx;
    const x = P.reel.x + ax * 1.7 - dx * 0.4, z = P.reel.z + az * 1.7 - dz * 0.4;
    fp.controls.placeAt(x, z); p.vel.set(0, 0, 0);
    p.yaw = Math.atan2(-(200 - x), -(185 - z)) - 0.3; p.pitch = -0.12;
  });
  await run(2500);
  await through('floor', TIMES_FLOOR, () => page.keyboard.press('KeyE'));
}
if (part === 'all' || part === 'lip') {
  await page.evaluate(() => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(194.2, 201); p.vel.set(0, 0, 0); p.yaw = Math.atan2(-(200 - 194.2), -(185 - 201)); p.pitch = -0.3; });
  await run(2500);
  await through('lip', TIMES_LIP, () => page.evaluate(() => { const h = window.__fp.acts.list.find((x) => x.def.id === 'pit-lead'); h.def.do(h.count + 1); }));
}
if (part === 'all' || part === 'fall') {
  // a step over the Nadir's edge: placed over the hole (as a carry or a fall from the lip would leave them), then
  // frames at 0.3, 1, 2 and 3.5 s (the veil, the night under the world) and 5.5 s (waking at the Bitter End)
  await page.evaluate(() => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(200.6, 184.2); p.vel.set(0, 0, 0); p.yaw = 2.8; p.pitch = -0.6; });
  let el = 0, n = 0;
  for (const t of [0.3, 1, 2, 3.5, 5.5]) {
    await run(Math.max(1, (t - el) * 1000)); el = t;
    const f = `shots/wip/${prefix}-fall-${String(n++).padStart(2, '0')}-${t}s.png`;
    await page.screenshot({ path: f, timeout: 240000 });
    console.log('[saved]', f, JSON.stringify(await page.evaluate(() => { const fp = window.__fp, p = fp.player; return { feet: +(p.pos.y - p.eye).toFixed(1), at: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)], fall: +fp.pit.sky.t.toFixed(2) }; })));
  }
}
await browser.close();
