#!/usr/bin/env node
// The Lees walked by hand (v15-Q3), a judge's tool, not a gate (the models: tools/act-walk.mjs, tools/village-walk.mjs):
// load, "Go out", click the view so the mouse is captured, then hold W and steer with the mouse alone from the
// Strake's street across the square to the fountain, round it, out under the Wanting Arch and back, to the Tare, and
// east along the shops to the Rebate's great frame. With `touch`: a phone-sized touch page, one finger on the stick,
// a second dragging to steer. A frame every 1.5 s of walking and at each waypoint, in order; prints where the feet
// are, and a last line `walked: yes|no` (no: it stood still for 4 s short of a waypoint, and where).
//   node tools/lees-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [prefix=lees-walk]
import { createRequire } from 'node:module';
let pw; try { pw = await import('playwright'); } catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', q = 'low', prefix0 = 'lees-walk'] = process.argv.slice(2);
const touch = mode === 'touch', prefix = `${prefix0}-${mode}-${q}`;
const P = await import(new URL('../src/v15/plan.js', import.meta.url));
const A = (run, s, D, name) => { const [x, z] = P.at(run, s, D); return { x, z, name }; };
const WAY = [A(1, 12, 22.2, 'street'), A(1, 16.6, 22.4, 'to-fountain'), A(1, 17.2, 25.2, 'kerb-west'), A(1, 18.4, 27.6, 'north-side'), A(1, 21.6, 27.4, 'north-east'), A(1, 22.6, 24.6, 'east-side'), A(1, 21.6, 22.6, 'south-side'), A(1, 17.2, 22.6, 'round-again'),
  A(1, 15.4, 27.6, 'to-arch'), A(1, 13.6, 30.4, 'under-arch'), A(1, 14.8, 27.8, 'back-in'), A(1, 12.2, 23.4, 'the-tare'), A(1, 17.4, 22.4, 'street-east'), A(1, 24.6, 23.6, 'the-way'), A(1, 30.4, 21.6, 'stair-foot'), A(1, 36.4, 19.4, 'shops'), A(1, 39.5, 18.6, 'lagan'), A(2, 3, 18.6, 'ullage'), A(2, 15, 18.6, 'welt'), A(2, 24.2, 20.4, 'rebate')];
const start = A(1, 6.5, 22.2);
const browser = await pw.chromium.launch({ channel: process.env.CHANNEL || 'chromium', args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage(); page.setDefaultTimeout(600000);
let errors = 0; page.on('pageerror', (e) => { errors++; console.log('[pageerror]', e.message); });
await page.goto(`${base}/?q=${q}&pos=${start.x.toFixed(2)},${start.z.toFixed(2)}&yaw=-1.2`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && !document.getElementById('begin').disabled, null, { timeout: 300000 });
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (touch) await page.tap('#begin'); else await page.click('#begin');
await sleep(600);
let locked = false, cdp = null, mx = 640, my = 360;
if (!touch) { await page.mouse.click(640, 360); await sleep(400); locked = await page.evaluate(() => !!window.__fp.player.locked || !!document.pointerLockElement); }
else cdp = await context.newCDPSession(page);
console.log(touch ? '[touch] the stick and a second finger' : `[lock] ${locked ? 'the mouse is captured' : 'NOT captured (headless refused it): steering by the page\'s drag-to-look'}`);
const state = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, pitch: p.pitch }; });
let n = 0;
const shot = async (what) => { const s = await state(), f = `shots/wip/${prefix}-${String(n++).padStart(3, '0')}-${what}.png`; await page.screenshot({ path: f, timeout: 240000 }); console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) eye ${s.y.toFixed(2)}`); };
// the stick: bottom right on touch (its element's centre), pushed up
let stick = null;
if (touch) stick = await page.evaluate(() => { const e = document.querySelector('#stick, .stick, [data-stick]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 }; });
if (touch && !stick) { console.log('no stick element found'); console.log('walked: no'); await browser.close(); process.exit(0); }
const fingers = (pts) => cdp.send('Input.dispatchTouchEvent', { type: pts.length ? 'touchMove' : 'touchEnd', touchPoints: pts });
async function steer(dyaw) { // turn by dyaw (rad) with the mouse, or a second finger's drag
  if (Math.abs(dyaw) < 0.01) return;
  if (touch) { const px = Math.max(-120, Math.min(120, -dyaw / 0.005)), y = 300;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x, y: stick.y - stick.r * 0.9, id: 1 }, { x: 150, y, id: 2 }] });
    for (let i = 1; i <= 4; i++) await fingers([{ x: stick.x, y: stick.y - stick.r * 0.9, id: 1 }, { x: 150 + (px * i) / 4, y, id: 2 }]);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: stick.x, y: stick.y - stick.r * 0.9, id: 1 }] });
  } else if (locked) { const tx = mx - dyaw / 0.0021; await page.mouse.move(tx, my, { steps: 3 }); mx = tx; }
  else { const px = Math.max(-300, Math.min(300, -dyaw / 0.004)); await page.mouse.move(640, 360); await page.mouse.down(); await page.mouse.move(640 + px, 360, { steps: 4 }); await page.mouse.up(); }
}
const walkOn = async () => { if (touch) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: stick.x, y: stick.y, id: 1 }] }); await fingers([{ x: stick.x, y: stick.y - stick.r * 0.9, id: 1 }]); } else await page.keyboard.down('KeyW'); };
const walkOff = async () => { if (touch) await fingers([]); else await page.keyboard.up('KeyW'); };
await shot('start');
let ok = true;
for (const w of WAY) {
  await walkOn();
  let still = 0, last = await state(), t0 = Date.now(), tShot = Date.now();
  for (;;) {
    const s = await state(), d = Math.hypot(w.x - s.x, w.z - s.z);
    if (d < 0.7) break;
    let dy = Math.atan2(-(w.x - s.x), -(w.z - s.z)) - s.yaw; dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI;
    await steer(dy);
    if (touch) await walkOn();
    await sleep(120);
    still = Math.hypot(s.x - last.x, s.z - last.z) < 0.02 ? still + 1 : 0; last = s;
    if (Date.now() - tShot > 1500) { await shot(`toward-${w.name}`); tShot = Date.now(); }
    if (still > 30 || Date.now() - t0 > 60000) { ok = false; console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) ${d.toFixed(1)} m short of ${w.name} (${w.x.toFixed(1)}, ${w.z.toFixed(1)}), yaw ${s.yaw.toFixed(2)}, wanted turn ${dy.toFixed(2)}`); break; }
  }
  await walkOff(); await sleep(250);
  if (!ok) { await shot(`stuck-${w.name}`); break; }
  await shot(`at-${w.name}`);
}
console.log(`page errors: ${errors}`); console.log(`walked: ${ok ? 'yes' : 'no'}`);
await browser.close();
