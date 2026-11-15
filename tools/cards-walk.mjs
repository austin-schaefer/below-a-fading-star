#!/usr/bin/env node
// The place cards walked into (v14-B5, #52): a judge's tool, not a gate. One page, "Go out", the view clicked; for each
// named place: the settings map's go-to button clicked, then walked on W toward the card's place (steering with the
// mouse) until the card comes up, and a frame of the whole screen once it has faded in. With `phone` the page is a
// touch phone (390 by 844, the stick on screen) and the walk is the touch stick held forward. For Titan's Causeway the
// walk starts on the west stair's last flight, below the card's height, and climbs to the top.
// Frames: shots/wip/<prefix>-<desk|phone>-NN-<place>.png.
//   node tools/cards-walk.mjs [base=http://localhost:8123] [prefix=cards] [desk|phone] [q=low] [only=name,name]
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', prefix = 'cards', mode = 'desk', q = 'low', onlyArg = ''] = process.argv.slice(2);
const phone = mode === 'phone';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base.replace(/\/?(\?.*)?$/, '')}/?q=${q}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp, null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (phone) await page.tap('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
else { await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin')))); await sleep(500); await page.mouse.click(640, 360); }
await sleep(800);
console.log(`pointer captured: ${await page.evaluate(() => !!document.pointerLockElement)}; touch: ${await page.evaluate(() => document.body.classList.contains('touch'))}`);
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// the turn: the page's own yaw (a mouse move on the desk is the same thing; on a phone the look is a drag, kept off the stick)
const face = (t) => page.evaluate((t) => { const p = window.__fp.player; p.yaw = Math.atan2(-(t.x - p.pos.x), -(t.z - p.pos.z)); p.pitch = t.pitch ?? 0; }, t);
// the stick held forward (touch), or W (desk)
const stick = phone ? await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }) : null;
async function goDown() {
  if (!phone) return page.keyboard.down('KeyW');
  const c = await page.context().newCDPSession(page);
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x, y: stick.y, id: 7 }] });
  await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: stick.x, y: stick.y - 50, id: 7 }] });
  goDown.c = c;
}
async function goUp() {
  if (!phone) return page.keyboard.up('KeyW');
  await goDown.c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const shown = () => page.evaluate(() => document.getElementById('place').classList.contains('shown') ? document.getElementById('place-name').textContent : null);
// [go-to name, the card's name, where to walk (x, z), and an optional start put on the floor before the walk]
const PLACES = [
  ['The Lantern Halt', 'The Lantern Halt', { x: -63, z: 1 }],
  ['The Tocsin', 'The Tocsin', { x: -52, z: 207 }],
  ['The Cyclopean Stairs', 'The Cyclopean Stairs', { x: -236, z: 200 }],
  ['Titan’s Causeway', 'Titan’s Causeway', { x: -246, z: 186 }, 'west-last-flight'],
  ['The Long Wait', 'The Long Wait', { x: 88, z: 211 }],
  ['Shaky Splice', 'Shaky Splice', { x: 160, z: 215 }],
  ['The Bitter End', 'The Bitter End', { x: 44, z: -390 }],
  ['Lonely Staircase', 'Lonely Staircase', { x: 286, z: -14 }],
  ['The Hanging Croft', 'The Hanging Croft', { x: 226, z: -50 }],
  ['Final Refuge', 'Final Refuge', { x: -372, z: -90 }],
];
const only = onlyArg ? onlyArg.split(',') : null;
let n = 0;
for (const [goto, want, to, start] of PLACES) {
  if (only && !only.some((o) => want.toLowerCase().includes(o.toLowerCase()))) continue;
  n++;
  await page.evaluate(() => { window.__fp.controls.placeAt(0, 0); window.__fp.hud.update(0.1); });
  await page.evaluate(() => window.__fp.settings.open()); await sleep(300);
  const btn = page.locator('#set-places button', { hasText: goto }).first();
  if (!(await btn.count())) { console.log(`MISSING go-to: ${goto}`); continue; }
  if (phone) await btn.tap(); else await btn.click();
  await sleep(400);
  if (!phone) await page.mouse.click(640, 360).catch(() => {});
  if (start === 'west-last-flight') { // the last flight's foot, 14 m below the deck: climbed from there on the stair
    await page.evaluate(() => { const S = window.__fp.span.stairs.west, f = S.flights[S.flights.length - 1]; window.__fp.controls.placeAt(f.x - 12, f.z, f.y0 + 12 * (f.y1 - f.y0) / (f.steps * f.run)); });
    await sleep(300);
  }
  let got = await shown(), t0 = Date.now();
  const from = await page.evaluate(() => { const p = window.__fp.player; return [+p.pos.x.toFixed(1), +(p.pos.y - p.eye).toFixed(1), +p.pos.z.toFixed(1)]; });
  if (got !== want) {
    await face(to); await goDown();
    while (Date.now() - t0 < 60000) { await sleep(150); await face(to); got = await shown(); if (got === want) break; }
    await goUp();
  }
  await sleep(2000); // the card's fade
  got = await shown();
  const at = await page.evaluate(() => { const p = window.__fp.player; return [+p.pos.x.toFixed(1), +(p.pos.y - p.eye).toFixed(1), +p.pos.z.toFixed(1)]; });
  const box = await page.evaluate(() => { const r = document.getElementById('place-line').getBoundingClientRect(), n = document.getElementById('place-name').getBoundingClientRect(), s = document.getElementById('stick').getBoundingClientRect(); return { top: Math.round(n.top), bottom: Math.round(r.bottom), left: Math.round(Math.min(r.left, n.left)), right: Math.round(Math.max(r.right, n.right)), stickTop: Math.round(s.top), stickShown: getComputedStyle(document.getElementById('stick')).display !== 'none' }; });
  const f = `shots/wip/${prefix}-${mode}-${String(n).padStart(2, '0')}-${want.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}.png`;
  await page.screenshot({ path: f });
  console.log(`${got === want ? 'SHOWN' : 'NOT SHOWN'} ${want} (got ${got}) from ${from} walked to ${at}; card ${JSON.stringify(box)}${box.stickShown && box.bottom > box.stickTop ? ' UNDER THE STICK' : ''} -> ${f}`);
}
await browser.close();
