#!/usr/bin/env node
// Acts (v10, #24): the offer, the input and the memory (src/v10/acts.js), checked on the first act, the tally at the
// Lantern Halt (src/v10/tally.js), and on test acts registered in the page for the contract's parts. Desktop: the act
// is not offered from the road, 30 m off, facing away, or facing the wall far from where the next stroke goes; is
// offered in front of it; E does it (the stroke, the count, the stored mark) and the stroke is drawn on screen; a
// second E or a click does nothing (once a visit); Ctrl+E does nothing; nothing is offered or done behind the paused
// card or the settings panel; after a reload the stroke is there and the act offered again; the settings row forgets
// it. The contract: busy (a 'free' act whose do returns seconds cannot fire twice), when(), at.y (another level),
// data kept beside the count. Memory: corrupt JSON, a tampered count (clamped), storage that throws; ?acts=0. Touch:
// the offer clear of the stick and the hop button, a tap does the act and reaches neither. Each check prints PASS or
// FAIL. Renders (1280 x 720, the phone 390 x 844) into shots/wip/acts-halt2-*.png; SHOTS=0 skips them.
// Usage: node tools/acts-test.mjs [base]
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
const watch = (page, tag) => { page.on('pageerror', (e) => errors.push(`${tag} pageerror: ${e.message}`)); page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag} console: ${m.text().slice(0, 300)}`); }); };
const begin = (page) => page.evaluate(() => { window.__fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden'); });
const ready = async (page, url) => {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.tally && window.__fp.acts, null, { timeout: 300000 });
  await begin(page);
};
// stand d metres out from where the next stroke goes, looking at it (turn: radians off that, side: metres along)
const atStroke = (page, d = 2.1, turn = 0, side = 0) => page.evaluate(([d, turn, side]) => {
  const fp = window.__fp, t = fp.tally, n = t.normal, p = fp.player, s = t.stand(d);
  fp.controls.placeAt(s.x + side * n.z, s.z - side * n.x);
  p.yaw = s.yaw + turn; p.pitch = s.pitch; p.vel.set(0, 0, 0);
}, [d, turn, side]);
// stand d metres out from the wall's centre (side: metres along it), looking square at it
const stand = (page, d, side = 0, pitch = 0) => page.evaluate(([d, side, pitch]) => {
  const fp = window.__fp, t = fp.tally, c = t.centre, n = t.normal, p = fp.player;
  fp.controls.placeAt(c.x + n.x * d + side * n.z, c.z + n.z * d - side * n.x);
  p.yaw = Math.atan2(n.x, n.z); p.pitch = pitch; p.vel.set(0, 0, 0);
}, [d, side, pitch]);
const state = (page) => page.evaluate(() => {
  const fp = window.__fp, el = document.getElementById('act'), cs = getComputedStyle(el);
  let stored = null; try { stored = localStorage.getItem('fp-acts'); } catch (e) { stored = 'throws'; }
  return { offered: fp.acts.offered?.def.id || null, shown: el.classList.contains('shown'), visible: cs.visibility !== 'hidden' && +cs.opacity > 0.05,
    words: document.getElementById('act-words').textContent, count: fp.acts.count('halt-tally'), visitor: fp.tally.visitor, strokes: fp.tally.strokes(),
    wall: fp.tally.wall, drawing: fp.tally.drawing, stored, pos: [+fp.player.pos.x.toFixed(2), +fp.player.pos.z.toFixed(2)], yaw: +fp.player.yaw.toFixed(3), pitch: +fp.player.pitch.toFixed(3) };
});
const waitOffer = async (page, want, ms = 4000) => { const t0 = Date.now(); let s; do { s = await state(page); if ((s.offered === 'halt-tally') === want) return s; await sleep(150); } while (Date.now() - t0 < ms); return s; };
const shot = async (page, name) => { if (!shots) return; await page.screenshot({ path: `shots/wip/${name}.png`, timeout: 240000 }); console.log(`[saved] shots/wip/${name}.png`); };
// is a world point inside the view (the camera's frustum)?
const onScreen = (page, w) => page.evaluate((w) => { const fp = window.__fp, v = new fp.THREE.Vector3(w.x, w.y, w.z).project(fp.camera); return Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.9 && v.z < 1; }, w);

// ------------------------------------------------------------------ desktop
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctxA.newPage();
watch(page, 'desktop');
await ready(page, `${base}/?q=low&pos=-50,12`);
let s = await state(page);
check('the tally is registered as an act, nothing remembered on a fresh page', s.count === 0 && s.visitor === 0 && s.wall > 100 && s.stored === null, s);
const btn = await page.evaluate(() => { const b = document.getElementById('act'); return { tab: b.tabIndex, ariaHidden: b.getAttribute('aria-hidden') }; });
check('the offer is never focused (tabindex -1) and carries no aria-hidden', btn.tab === -1 && btn.ariaHidden === null, btn);

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
await sleep(1200); await shot(page, 'acts-halt2-road');
await stand(page, 8, -1, 0.02);
s = await waitOffer(page, true, 1500);
check('8 m out, facing the wall: not offered', s.offered === null && !s.shown, s);
await shot(page, 'acts-halt2-near');
await page.evaluate(() => { document.getElementById('place').style.visibility = ''; });
await stand(page, 30);
s = await waitOffer(page, true, 2000);
check('30 m out, facing the wall: not offered', s.offered === null && !s.shown, s);

await atStroke(page);
s = await waitOffer(page, true);
check('in front of where the next stroke goes, facing it: offered, shown, with its words', s.offered === 'halt-tally' && s.shown && s.visible && s.words === 'Chalk your stroke', s);
check('the next stroke\'s place is in view', await onScreen(page, await page.evaluate(() => ({ ...window.__fp.tally.next }))));
await sleep(1300); await shot(page, 'acts-halt2-offer');
await atStroke(page, 2.1, Math.PI);
s = await waitOffer(page, false);
check('there, facing away: not offered', s.offered === null, s);
await atStroke(page, 2.1, 1.3);
s = await waitOffer(page, false);
check('there, looking along the road: not offered', s.offered === null, s);
await atStroke(page, 2.1, 0, 3.2);
s = await waitOffer(page, false);
check('at the wall 3 m along from the row\'s end: not offered (the stroke would land out of sight)', s.offered === null, s);

// the paused card and the settings panel
await atStroke(page);
await waitOffer(page, true);
await page.evaluate(() => { const c = document.getElementById('card'); c.classList.remove('hidden'); c.classList.add('paused'); }); // what Esc does
await sleep(250);
s = await state(page);
check('behind the paused card: the offer gone at once', s.offered === null && !s.visible, s);
await page.keyboard.press('KeyE'); await sleep(150);
s = await state(page);
check('behind the paused card: E does nothing', s.visitor === 0 && s.count === 0, s);
await shot(page, 'acts-halt2-paused');
await page.evaluate(() => document.getElementById('card').classList.add('hidden'));
s = await waitOffer(page, true);
check('the card gone: offered again', s.offered === 'halt-tally', s);
await page.evaluate(() => window.__fp.settings.open());
await sleep(100);
s = await state(page);
check('with the settings panel open: the offer gone at once, not showing through', s.offered === null && !s.visible, s);
await page.evaluate(() => { const fp = window.__fp, b = document.getElementById('act'); b.click(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); });
s = await state(page);
check('with the settings panel open: E and a click do nothing', s.visitor === 0, s);
await page.evaluate(() => window.__fp.settings.close());

// doing it
await atStroke(page);
await waitOffer(page, true);
await page.keyboard.press('Control+KeyE'); await sleep(150);
s = await state(page);
check('Ctrl+E does nothing', s.visitor === 0, s);
const before = await state(page);
const target = await page.evaluate(() => ({ ...window.__fp.tally.next }));
await page.keyboard.press('KeyE');
await sleep(100);
s = await state(page);
check('E does it: one stroke more, counted and kept', s.visitor === 1 && s.count === 1 && s.strokes === before.strokes + 1 && JSON.parse(s.stored || '{}').marks?.['halt-tally']?.n === 1, { before, s });
check('the stroke is being drawn, on screen where the visitor looks', s.drawing === true && await onScreen(page, target), s);
await sleep(1500);
s = await state(page);
check('the stroke finished drawing; the offer has gone (once a visit)', !s.drawing && s.offered === null, s);
await shot(page, 'acts-halt2-stroke');
await page.keyboard.press('KeyE');
await page.mouse.click(640, 360);
await sleep(300);
s = await state(page);
check('a second E (and a click) in the same visit does nothing', s.visitor === 1 && s.count === 1 && s.strokes === before.strokes + 1, s);

// the contract, on test acts beside the player
const contract = await page.evaluate(async () => {
  const fp = window.__fp, A = fp.acts, p = fp.player, out = {};
  const here = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
  const facing = () => true;
  let fired = 0;
  const free = A.add({ id: 'test-free', at: here, reach: 5, facing, words: 'test', every: 'free', do: () => { fired++; return 0.6; } });
  out.first = A.act(free); out.second = A.act(free); out.fired = fired; out.busy = free.busy;
  await new Promise((r) => setTimeout(r, 750));
  out.third = A.act(free); out.fired2 = fired;
  let open = false;
  const gated = A.add({ id: 'test-when', at: here, reach: 5, facing, words: 'test', every: 'free', when: () => open, do: () => {} });
  out.whenShut = A.may(gated); open = true; out.whenOpen = A.may(gated);
  const high = A.add({ id: 'test-high', at: { x: here.x, y: here.y + 8, z: here.z }, reach: 5, facing, words: 'test high', every: 'free', do: () => {} });
  out.highMay = A.may(high);
  free.setData({ seen: ['halt'], n: 2 });
  out.data = free.data; out.storedData = JSON.parse(localStorage.getItem('fp-acts')).marks['test-free'].data;
  return out;
});
check('busy: a free act whose do returns 0.6 s fires once on two fast presses, and again after', contract.first && !contract.second && contract.fired === 1 && contract.busy && contract.third && contract.fired2 === 2, contract);
check('when(): may only while it returns true', contract.whenShut === false && contract.whenOpen === true, contract);
check('data: kept beside the count, read back through the handle and stored', contract.data?.n === 2 && contract.storedData?.seen?.[0] === 'halt', contract);
await page.evaluate(() => { const A = window.__fp.acts; for (const id of ['test-free', 'test-when']) { const i = A.list.findIndex((h) => h.def.id === id); A.list.splice(i, 1); } });
await sleep(1200);
const hi = await page.evaluate(() => window.__fp.acts.offered?.def.id || null);
check('at.y: an act 8 m overhead (a deck, a stair), in reach and faced, is not offered from below', hi !== 'test-high', hi);
await page.evaluate(() => { const A = window.__fp.acts; A.list.splice(A.list.findIndex((h) => h.def.id === 'test-high'), 1); });

// a reload: a new visit, the stroke still there
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.tally, null, { timeout: 300000 });
await begin(page);
s = await state(page);
check('after a reload the stroke is there: the wall\'s own count plus one', s.visitor === 1 && s.count === 1 && s.strokes === s.wall + 1, s);
await atStroke(page);
s = await waitOffer(page, true);
check('after a reload the act is offered again (a new visit)', s.offered === 'halt-tally', s);
await sleep(800); await shot(page, 'acts-halt2-reload');

// the settings row forgets it
await page.evaluate(() => window.__fp.settings.open());
await page.evaluate(() => document.getElementById('set-forget').scrollIntoView({ block: 'center' }));
await sleep(500);
const row = await page.evaluate(() => { const b = document.getElementById('set-forget'), r = b.getBoundingClientRect(); return { text: b.textContent, disabled: b.disabled, visible: r.width > 0 && r.height > 0 }; });
check('the settings menu has the forget row, live while there are marks', row.visible && !row.disabled && /forget/i.test(row.text), row);
await shot(page, 'acts-halt2-settings');
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

// ------------------------------------------------------------------ a return visit with three strokes; bad memory
const seeded = async (tag, init, url, fn) => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await c.addInitScript(init);
  const p = await c.newPage(); watch(p, tag);
  const t0 = Date.now();
  await ready(p, url);
  await fn(p, Date.now() - t0);
  await c.close();
};
await seeded('return', () => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('fp-acts', JSON.stringify({ v: 1, marks: { 'halt-tally': { n: 3, last: 1 } } })); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } },
  `${base}/?q=low&pos=-50,12`, async (p) => {
    s = await state(p);
    check('a return visit: three of the visitor\'s strokes on the wall', s.visitor === 3 && s.strokes === s.wall + 3, s);
    // two metres out in front of the middle one, looking at it
    await p.evaluate(() => {
      const fp = window.__fp, t = fp.tally, c = t.centre, n = t.normal, ex = { x: n.z, z: -n.x }, m = t.strokeAt(1), pl = fp.player;
      const wx = c.x + ex.x * m.along, wz = c.z + ex.z * m.along; // along: local +x, which is (n.z, -n.x) in the world
      fp.controls.placeAt(wx + n.x * 2, wz + n.z * 2);
      pl.yaw = Math.atan2(n.x, n.z); pl.pitch = -0.12;
    });
    await sleep(1500); await shot(p, 'acts-halt2-return');
  });
await seeded('corrupt', () => { try { localStorage.setItem('fp-acts', '{"v":1,"marks":{oops'); } catch (e) { /* */ } },
  `${base}/?q=low&only=waystation,acts&render=0&pos=-50,12`, async (p) => {
    s = await state(p);
    check('corrupt JSON in storage: read as nothing, the wall as it is', s.count === 0 && s.visitor === 0 && s.strokes === s.wall, s);
  });
await seeded('tampered', () => { try { localStorage.setItem('fp-acts', JSON.stringify({ v: 1, marks: { 'halt-tally': { n: 1e12 }, other: { n: -5 } } })); } catch (e) { /* */ } },
  `${base}/?q=low&only=waystation,acts&render=0&pos=-50,12`, async (p, ms) => {
    s = await state(p);
    const other = await p.evaluate(() => window.__fp.acts.count('other'));
    check('a tampered count is clamped (to 9999, and 0 for a negative) and the build does not hang', s.count === 9999 && other === 0 && ms < 240000, { count: s.count, other, ms });
  });
await seeded('throws', () => { for (const k of ['getItem', 'setItem', 'removeItem']) Storage.prototype[k] = () => { throw new Error('storage refused'); }; },
  `${base}/?q=low&only=waystation,acts&pos=-50,12`, async (p) => {
    await atStroke(p);
    s = await waitOffer(p, true);
    await p.keyboard.press('KeyE'); await sleep(200);
    s = await state(p);
    const stored = await p.evaluate(() => window.__fp.acts.stored);
    check('storage that throws: offered and done all the same, kept for the visit only', s.visitor === 1 && s.count === 1 && stored === false, { s, stored });
  });

// ------------------------------------------------------------------ ?acts=0
{
  const c = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const p = await c.newPage(); watch(p, 'acts0');
  await ready(p, `${base}/?q=low&acts=0&only=waystation,acts&render=0&pos=-50,12`);
  await atStroke(p);
  await sleep(2000);
  s = await state(p);
  check('?acts=0: no act registered, nothing offered, the wall as it is', s.offered === null && !s.shown && s.strokes === s.wall && (await p.evaluate(() => window.__fp.acts.list.length)) === 0, s);
  await c.close();
}

// ------------------------------------------------------------------ touch
{
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const p = await c.newPage(); watch(p, 'touch');
  await ready(p, `${base}/?q=low&pos=-50,12`);
  await atStroke(p, 2.3);
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
  await sleep(1000); await shot(p, 'acts-halt2-phone');
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

// ------------------------------------------------------------------ v10-A1: the crystal and the door (tools/acts-central.mjs)
if (process.env.CENTRAL !== '0') await (await import('./acts-central.mjs')).centralRows({ browser, base, check, watch });

check('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
