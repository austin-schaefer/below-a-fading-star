#!/usr/bin/env node
// Acts (v10, #24): the offer, the input and the memory (src/v10/acts.js), checked on the first act, the tally at the
// Lantern Halt (src/v10/tally.js). On a desktop page: the act is not offered 30 m off; is offered at the wall's foot,
// facing it, with the offer's element shown; is not offered facing away; E does it (the visitor's stroke, the count
// and the stored mark); a second E in the same visit does nothing; after a reload the stroke is there, the count is the
// wall's own plus one and the act is offered again (a new visit); the settings row forgets it. On a phone-sized touch
// page: the offer is shown clear of the stick and the hop button, a tap on it does the act and reaches neither the
// stick nor the look. Each check prints PASS or FAIL. Renders (1280 x 720, the phone 390 x 844) into shots/wip/:
// acts-halt-road, acts-halt-near, acts-halt-offer, acts-halt-stroke, acts-halt-reload, acts-settings, acts-halt-phone.
// SHOTS=0 skips them. Usage: node tools/acts-test.mjs [base]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const shots = process.env.SHOTS !== '0';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
let fails = 0, passes = 0;
const check = (name, ok, info) => { if (ok) passes++; else fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok || info === undefined ? '' : JSON.stringify(info)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watch = (page) => { page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); }); };
const ready = async (page, url) => {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.tally && window.__fp.acts, null, { timeout: 300000 });
  await page.evaluate(() => { window.__fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden'); });
};
// stand d metres out from the wall's centre (side: metres along it), looking at it (turn: radians off that)
const stand = (page, d, side = 0, turn = 0, pitch = -0.04) => page.evaluate(([d, side, turn, pitch]) => {
  const fp = window.__fp, t = fp.tally, c = t.centre, n = t.normal, p = fp.player;
  fp.controls.placeAt(c.x + n.x * d + side * n.z, c.z + n.z * d - side * n.x);
  p.yaw = Math.atan2(n.x, n.z) + turn; p.pitch = pitch; p.vel.set(0, 0, 0);
}, [d, side, turn, pitch]);
// stand d metres out from the face in front of where the next visitor's stroke goes, looking at it
const atStroke = (page, d = 2.1, pitch = -0.1) => page.evaluate(([d, pitch]) => {
  const fp = window.__fp, t = fp.tally, n = t.normal, p = fp.player, s = t.stand();
  fp.controls.placeAt(s.x + n.x * (d - 1.6), s.z + n.z * (d - 1.6));
  p.yaw = s.yaw; p.pitch = pitch; p.vel.set(0, 0, 0);
}, [d, pitch]);
const state = (page) => page.evaluate(() => {
  const fp = window.__fp, el = document.getElementById('act');
  let stored = null; try { stored = localStorage.getItem('fp-acts'); } catch (e) { /* */ }
  return { offered: fp.acts.offered?.def.id || null, shown: el.classList.contains('shown'), words: document.getElementById('act-words').textContent,
    count: fp.acts.count('halt-tally'), visitor: fp.tally.visitor, strokes: fp.tally.strokes(), wall: fp.tally.wall, drawing: fp.tally.drawing, stored,
    pos: [+fp.player.pos.x.toFixed(2), +fp.player.pos.z.toFixed(2)], yaw: +fp.player.yaw.toFixed(3), pitch: +fp.player.pitch.toFixed(3) };
});
// wait up to ms for the offer to be (or not be) up
const waitOffer = async (page, want, ms = 4000) => { const t0 = Date.now(); let s; do { s = await state(page); if ((s.offered === 'halt-tally') === want) return s; await sleep(150); } while (Date.now() - t0 < ms); return s; };
const shot = async (page, name) => { if (!shots) return; await page.screenshot({ path: `shots/wip/${name}.png`, timeout: 240000 }); console.log(`[saved] shots/wip/${name}.png`); };

// ------------------------------------------------------------------ desktop
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctxA.newPage();
watch(page);
await ready(page, `${base}/?q=low&pos=-50,12`);
let s = await state(page);
check('the tally is registered as an act, nothing remembered on a fresh page', s.count === 0 && s.visitor === 0 && s.wall > 100 && s.stored === null, s);

// from the road: the causeway where it comes from the keep, about 24 m off, looking at the wall
await page.evaluate(() => {
  const fp = window.__fp, c = fp.tally.centre, T = fp.terrain, p = fp.player;
  let best = null, bd = Infinity;
  for (let a = -1; a <= 1; a += 0.25) for (let b = -2; b <= 2; b += 0.25) { const d = T.causewayDistance(-45 + a, 20 + b); if (d < bd) { bd = d; best = { x: -45 + a, z: 20 + b }; } }
  fp.controls.placeAt(best.x, best.z);
  p.yaw = Math.atan2(-(c.x - p.pos.x), -(c.z - p.pos.z)); p.pitch = 0.05;
  document.getElementById('place').style.visibility = 'hidden'; // the region's name card, for the picture
});
s = await waitOffer(page, true, 1500);
check('from the causeway (about 24 m): not offered', s.offered === null && !s.shown, s);
await sleep(1200); await shot(page, 'acts-halt-road');
await stand(page, 8, -1, 0, 0.02);
s = await waitOffer(page, true, 1500);
check('8 m out, facing the wall: not offered', s.offered === null && !s.shown, s);
await shot(page, 'acts-halt-near');
await page.evaluate(() => { document.getElementById('place').style.visibility = ''; });

await stand(page, 30);
s = await waitOffer(page, true, 2000);
check('30 m out, facing the wall: not offered', s.offered === null && !s.shown, s);

await stand(page, 1.9, 0.6);
s = await waitOffer(page, true);
check('at the foot, facing the wall: offered, the offer shown with its words', s.offered === 'halt-tally' && s.shown && s.words === 'Chalk your stroke', s);
await atStroke(page);
s = await waitOffer(page, true);
check('in front of the last row\'s end: offered', s.offered === 'halt-tally', s);
await sleep(1300); await shot(page, 'acts-halt-offer');

await stand(page, 1.9, 0.6, Math.PI);
s = await waitOffer(page, false);
check('at the foot, facing away: not offered', s.offered === null, s);
await stand(page, 1.9, 0.6, 1.3);
s = await waitOffer(page, false);
check('at the foot, looking along the road: not offered', s.offered === null, s);

await atStroke(page);
await waitOffer(page, true);
const before = await state(page);
await page.keyboard.press('KeyE');
await sleep(100);
s = await state(page);
check('E does it: one stroke more, counted and kept', s.visitor === 1 && s.count === 1 && s.strokes === before.strokes + 1 && JSON.parse(s.stored || '{}').marks?.['halt-tally']?.n === 1, { before, s });
check('the stroke is being drawn, not stamped', s.drawing === true, s);
await sleep(1500);
s = await state(page);
check('the stroke finished drawing; the offer has gone (once a visit)', !s.drawing && s.offered === null, s);
await shot(page, 'acts-halt-stroke');
await page.keyboard.press('KeyE');
await page.mouse.click(640, 360);
await sleep(300);
s = await state(page);
check('a second E (and a click) in the same visit does nothing', s.visitor === 1 && s.count === 1 && s.strokes === before.strokes + 1, s);

// a reload: a new visit, the stroke still there
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.tally, null, { timeout: 300000 });
await page.evaluate(() => { window.__fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden'); });
s = await state(page);
check('after a reload the stroke is there: the wall\'s own count plus one', s.visitor === 1 && s.count === 1 && s.strokes === s.wall + 1, s);
await atStroke(page);
s = await waitOffer(page, true);
check('after a reload the act is offered again (a new visit)', s.offered === 'halt-tally', s);
await sleep(800); await shot(page, 'acts-halt-reload');

// the settings row forgets it
await page.evaluate(() => window.__fp.settings.open());
await page.evaluate(() => document.getElementById('set-forget').scrollIntoView({ block: 'center' }));
await sleep(500);
const row = await page.evaluate(() => { const b = document.getElementById('set-forget'), r = b.getBoundingClientRect(); return { text: b.textContent, disabled: b.disabled, visible: r.width > 0 && r.height > 0 }; });
check('the settings menu has the forget row, live while there are marks', row.visible && !row.disabled && /forget/i.test(row.text), row);
s = await state(page);
check('no offer while the settings panel is open', !s.shown || s.offered === null, s);
await shot(page, 'acts-settings');
await page.click('#set-forget');
await sleep(300);
s = await state(page);
const after = await page.evaluate(() => ({ text: document.getElementById('set-forget').textContent, disabled: document.getElementById('set-forget').disabled }));
check('forgetting clears the stroke, the count and the stored mark', s.visitor === 0 && s.count === 0 && s.strokes === s.wall && s.stored === null && after.disabled, { s, after });
await page.evaluate(() => window.__fp.settings.close());
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.tally, null, { timeout: 300000 });
s = await state(page);
check('and it stays forgotten after a reload', s.visitor === 0 && s.strokes === s.wall, s);
await ctxA.close();

// ------------------------------------------------------------------ ?acts=0
{
  const c = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const p = await c.newPage(); watch(p);
  await ready(p, `${base}/?q=low&acts=0&pos=-50,12&render=0`);
  await stand(p, 1.9, 0.6);
  await sleep(2000);
  s = await state(p);
  check('?acts=0: no act registered, nothing offered, the wall as it is', s.offered === null && !s.shown && s.strokes === s.wall && (await p.evaluate(() => window.__fp.acts.list.length)) === 0, s);
  await c.close();
}

// ------------------------------------------------------------------ touch
{
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const p = await c.newPage(); watch(p);
  await ready(p, `${base}/?q=low&pos=-50,12`);
  await stand(p, 1.9, 0.6, 0, 0.02);
  s = await waitOffer(p, true);
  const geo = await p.evaluate(() => {
    const r = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    const a = r('act'), j = r('jump'), st = r('stick'), ring = window.__fp.controls.touch.ring;
    const hit = document.elementFromPoint((a.l + a.r) / 2, (a.t + a.b) / 2)?.closest('#act') !== null;
    return { a, j, st, ring, hit };
  });
  const apart = (u, v) => u.r <= v.l || v.r <= u.l || u.b <= v.t || v.b <= u.t;
  const cx = (geo.a.l + geo.a.r) / 2, cy = (geo.a.t + geo.a.b) / 2;
  check('touch: offered, shown, on top where it is', s.offered === 'halt-tally' && s.shown && geo.hit, { s, geo });
  check('touch: the offer is clear of the hop button, the stick and the stick\'s reach (110 px)', apart(geo.a, geo.j) && apart(geo.a, geo.st) && Math.hypot(cx - geo.ring.x, cy - geo.ring.y) > 110 + 40 && geo.a.t > 0 && geo.a.l >= 0 && geo.a.r <= 390, geo);
  await sleep(1000); await shot(p, 'acts-halt-phone');
  const cdp = await c.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 7, x: cx, y: cy }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(200);
  s = await state(p);
  const tch = await p.evaluate(() => ({ moveId: window.__fp.controls.touch.moveId, lookId: window.__fp.controls.touch.lookId, mag: window.__fp.controls.touch.moveVec.mag }));
  check('touch: a tap on the offer does the act', s.visitor === 1 && s.count === 1, s);
  check('touch: the tap reached neither the stick nor the look', tch.moveId === null && tch.lookId === null && tch.mag === 0, tch);
  await c.close();
}

check('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
