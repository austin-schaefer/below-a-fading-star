#!/usr/bin/env node
// Acts (v10, #24): the offer, the input and the memory (src/v10/acts.js), checked on the first act, the tally at the
// Lantern Halt (src/v10/tally.js), and on test acts registered in the page for the contract's parts. Desktop: the act
// is not offered from the road, 30 m off, facing away, or facing the wall far from where the next stroke goes; is
// offered in front of it; E does it (the stroke, the count, the stored mark) and the stroke is drawn on screen; a
// second E or a click does nothing (once a visit); Ctrl+E does nothing; nothing is offered or done behind the paused
// card or the settings panel; after a reload the stroke is there and the act offered again; the settings row forgets
// it. The contract: busy (a 'free' act whose do returns seconds cannot fire twice), when(), at.y (another level),
// data kept beside the count. Memory: corrupt JSON, a tampered count (clamped), storage that throws; ?acts=0. Touch:
// the offer clear of the stick and the hop button, a tap does the act and reaches neither. v10-A4, the Halt's second half: the
// chalk hangs over the next stroke and moves on with the count; the seat is not offered before the stroke, comes down
// after it and is offered; the ride carries the visitor (no hop), holds while paused or the panel is open, goes on in a
// gutter, reaches the sleeper, who answers; pushing to walk lets them down exactly where they got on; a teleport
// mid-ride; the second pillow on a return visit after a ride. Each check prints PASS or
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
{ const t0 = Date.now(); do { await sleep(200); s = await state(page); } while (s.drawing && Date.now() - t0 < 20000); } // the chalk lifts, draws and is let go (on state: robust at a few fps)
await sleep(300);
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

// ------------------------------------------------------------------ v10-A2: pour for the twelfth (src/v10/chair.js); salt for news (src/v10/salt.js) is shelved behind ?salt=1, its rows run with SALT=1
const SALT = process.env.SALT === '1', SQ = SALT ? '&salt=1' : '';
if (!SALT) console.log('salt for news is off (?salt=1): its rows are skipped; run with SALT=1 to include them');
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await c.newPage(); watch(p, 'stories');
  await ready(p, `${base}/?q=low&pos=0,0${SQ}`);
  await p.waitForFunction(() => window.__fp.storyActs?.chair, null, { timeout: 120000 });
  const put = (w, f, a) => p.evaluate(([w, f, a]) => { const fp = window.__fp, S = fp.storyActs[w], st = S[f](...(a || [])), pl = fp.player; pl.pos.set(st.x, fp.terrain.heightAt(st.x, st.z) + pl.eye, st.z); pl.yaw = st.yaw; pl.pitch = st.pitch; if (pl.vel) pl.vel.set(0, 0, 0); }, [w, f, a]);
  const off = () => p.evaluate(() => window.__fp.acts.offered?.def.id || null);
  const want = async (id, ms = 4000) => { const t0 = Date.now(); let o; do { o = await off(); if (o === id) return o; await sleep(150); } while (Date.now() - t0 < ms); return o; };
  const turn = (d) => p.evaluate((d) => { window.__fp.player.yaw += d; }, d);
  // the twelfth place
  await put('chair', 'stand', [8]); await sleep(1500);
  check('the twelfth place: not offered from 8 m', (await off()) === null);
  await put('chair', 'stand'); await sleep(200); await turn(2.2); await sleep(1500);
  check('the twelfth place: not offered looking away', (await off()) !== 'collation-twelfth');
  await turn(-2.2);
  check('the twelfth place: offered at it, "Pour for him"', (await want('collation-twelfth')) === 'collation-twelfth' && (await p.evaluate(() => document.getElementById('act-words').textContent)) === 'Pour for him');
  await put('chair', 'stand', [-1.5]); await sleep(1500);
  check('the twelfth place: not offered from the table\'s far side', (await off()) !== 'collation-twelfth');
  await put('chair', 'stand'); await want('collation-twelfth');
  const lvl0 = await p.evaluate(() => window.__fp.storyActs.chair.wine.scale.y);
  await p.keyboard.press('KeyE'); await sleep(50);
  check('E pours: counted, kept, the bottle is moving', await p.evaluate(() => { const A = window.__fp.acts; return A.count('collation-twelfth') === 1 && window.__fp.storyActs.chair.running && JSON.parse(localStorage.getItem('fp-acts')).marks['collation-twelfth'].n === 1; }));
  await sleep(1500);
  const mid = await p.evaluate(() => { const c = window.__fp.storyActs.chair; return { bottleTilted: Math.abs(c.bottle.quaternion.z) + Math.abs(c.bottle.quaternion.x) > 0.3, y: c.bottle.position.y }; });
  check('1.5 s in: the bottle has tilted over the goblet', mid.bottleTilted, mid);
  await sleep(3000);
  const mid2 = await p.evaluate(() => { const c = window.__fp.storyActs.chair; return { wine: c.wine.scale.y, eleven: c.eleven.visible, flares: c.flares.filter((f) => f.visible).length }; });
  check('4.5 s in: the goblet is full and the eleven answer (their glasses flare)', mid2.wine > lvl0 * 1.8 && mid2.eleven && mid2.flares >= 1, { lvl0, mid2 });
  await p.waitForFunction(() => !window.__fp.storyActs.chair.running, null, { timeout: 60000 });
  const end = await p.evaluate(() => { const c = window.__fp.storyActs.chair; return { rest0: c.rests[0].visible, rest1: c.rests[1].visible, bottleHome: Math.abs(c.bottle.quaternion.x) + Math.abs(c.bottle.quaternion.z) < 0.01, offered: window.__fp.acts.offered?.def.id || null }; });
  check('after it: a glass stands at the first rest, none at the second, the bottle is set down, not offered again this visit', end.rest0 && !end.rest1 && end.bottleHome && end.offered !== 'collation-twelfth', end);
  await c.close();
}
{
  // a return visit: the pour once before, the pinch carried
  const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await c.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('fp-acts', JSON.stringify({ v: 1, marks: { 'collation-twelfth': { n: 1, last: 1 }, 'salt-pinch': { n: 2, last: 1, data: { held: 1 } }, 'salt-news': { n: 1, last: 1 } } })); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } });
  const p = await c.newPage(); watch(p, 'stories2');
  await ready(p, `${base}/?q=low&pos=0,0${SQ}`);
  await p.waitForFunction(() => window.__fp.storyActs?.chair, null, { timeout: 120000 });
  const put = (w, f, a) => p.evaluate(([w, f, a]) => { const fp = window.__fp, S = fp.storyActs[w], st = S[f](...(a || [])), pl = fp.player; pl.pos.set(st.x, fp.terrain.heightAt(st.x, st.z) + pl.eye, st.z); pl.yaw = st.yaw; pl.pitch = st.pitch; if (pl.vel) pl.vel.set(0, 0, 0); }, [w, f, a]);
  const off = () => p.evaluate(() => window.__fp.acts.offered?.def.id || null);
  const want = async (id, ms = 4000) => { const t0 = Date.now(); let o; do { o = await off(); if (o === id) return o; await sleep(150); } while (Date.now() - t0 < ms); return o; };
  const r = await p.evaluate(() => { const c = window.__fp.storyActs.chair, s = window.__fp.storyActs.salt; return { rest0: c.rests[0].visible, rest1: c.rests[1].visible, eleven: c.eleven.visible, again: c.again.visible, level: c.level, thing0: s?.things[0].m.visible, thing1: s?.things[1].m.visible, held: s?.take.data.held, stain: window.__fp.scene.getObjectByName('collation-twelfth-stain').visible }; });
  check('a return visit: the stain, the eleven\'s wine, the candle and flowers, the goblet drunk down, the first rest\'s row of glasses are there, the second is not', r.rest0 && !r.rest1 && r.eleven && r.again && r.stain && Math.abs(r.level - 0.55) < 1e-6, r);
  if (SALT) check('a return visit: the first of the news is there, the second is not, the carried pinch is still carried', r.thing0 && !r.thing1 && r.held === 1, r);
  await put('chair', 'stand'); await sleep(1200);
  check('a return visit: offered again at the twelfth place (a new visit)', (await want('collation-twelfth')) === 'collation-twelfth');
  // a second pour starts from the remembered state, not from empty
  await put('chair', 'stand'); await want('collation-twelfth');
  await p.keyboard.press('KeyE'); await sleep(300);
  const sp = await p.evaluate(() => { const c = window.__fp.storyActs.chair; return { level: c.level, stain: window.__fp.scene.getObjectByName('collation-twelfth-stain').visible, n: window.__fp.acts.count('collation-twelfth') }; });
  check('a second pour: counted, and the goblet and the stain are as the eleven left them (0.55), not reset to empty', sp.n === 2 && Math.abs(sp.level - 0.55) < 0.02 && sp.stain, sp);
  await sleep(4000);
  check('a second pour: the goblet fills from there', (await p.evaluate(() => window.__fp.storyActs.chair.level)) > 0.9);
  await p.waitForFunction(() => !window.__fp.storyActs.chair.running, null, { timeout: 90000 });
  check('a second pour: the second rest has its glasses (eight), the third not', await p.evaluate(() => { const c = window.__fp.storyActs.chair; return c.rests[1].visible && !c.rests[2].visible; }));
  if (SALT) {
  // salt: at the sack carrying a pinch it is not offered; at the pile "Pay in salt"
  await put('salt', 'standSack'); await sleep(1500);
  check('salt: not offered at the sack while a pinch is carried', (await off()) !== 'salt-pinch');
  await put('salt', 'standPile', [9]); await sleep(1500);
  check('salt: not offered at the pile from 9 m', (await off()) === null);
  await put('salt', 'standPile'); await sleep(200); await p.evaluate(() => { window.__fp.player.yaw += 2.5; }); await sleep(1500);
  check('salt: not offered at the pile looking away', (await off()) !== 'salt-news');
  await p.evaluate(() => { window.__fp.player.yaw -= 2.5; });
  check('salt: carrying a pinch, at the pile: "Pay in salt"', (await want('salt-news')) === 'salt-news' && (await p.evaluate(() => document.getElementById('act-words').textContent)) === 'Pay in salt');
  await p.keyboard.press('KeyE'); await sleep(200);
  const a = await p.evaluate(() => { const fp = window.__fp, s = fp.storyActs.salt; return { n: fp.acts.count('salt-news'), held: s.take.data.held || 0, tossing: s.tossing, scripts: fp.twk.riders.filter((q) => q.mode === 'script').length }; });
  check('E pays: counted, the pinch spent, grains in the air, three riders sent on the errand', a.n === 2 && a.held === 0 && a.tossing && a.scripts === 3, a);
  await sleep(3500);
  const b = await p.evaluate(() => { const s = window.__fp.storyActs.salt; return { thing1: s.things[1].m.visible }; });
  check('3.7 s in: the second thing of news has been dropped by the guard', b.thing1, b);
  await p.waitForFunction(() => window.__fp.twk.riders.every((q) => q.mode !== 'script'), null, { timeout: 60000 });
  const d = await p.evaluate(() => ({ modes: window.__fp.twk.stats().modes }));
  check('the riders are home again after (none still on the errand)', !d.modes.script, d);
  await sleep(300);
  check('salt: not offered at the pile with no pinch', (await off()) !== 'salt-news');
  await put('salt', 'standSack'); await sleep(200);
  check('salt: at the sack with none carried: "Take a pinch"', (await want('salt-pinch')) === 'salt-pinch');
  await p.keyboard.press('KeyE'); await sleep(250);
  const g = await p.evaluate(() => { const s = window.__fp.storyActs.salt; return { held: s.take.data.held, tossing: s.tossing }; });
  check('E takes a pinch: carried (kept), grains lift into the hand', g.held === 1 && g.tossing, g);
  await sleep(1500);
  }
  await p.evaluate(() => window.__fp.acts.forget());
  const h = await p.evaluate(() => { const c = window.__fp.storyActs.chair, s = window.__fp.storyActs.salt; return { rest0: c.rests[0].visible, eleven: c.eleven.visible, again: c.again.visible, level: c.level, thing0: s?.things[0].m.visible, held: s?.take.data.held || 0 }; });
  check('forget: no glasses at the rests, no candle or flowers, the goblet back to its first level, nothing of the salt kept', !h.rest0 && !h.eleven && !h.again && Math.abs(h.level - 0.45) < 1e-6 && !h.thing0 && h.held === 0, h);
  await c.close();
}

{
  const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await c.newPage(); watch(p, 'stories-acts0');
  await ready(p, `${base}/?q=low&acts=0&pos=0,0`);
  await p.waitForFunction(() => window.__fp.storyActs?.chair, null, { timeout: 120000 });
  await p.evaluate(() => { const fp = window.__fp, st = fp.storyActs.chair.stand(), pl = fp.player; pl.pos.set(st.x, fp.terrain.heightAt(st.x, st.z) + pl.eye, st.z); pl.yaw = st.yaw; pl.pitch = st.pitch; });
  await sleep(2000);
  const z = await p.evaluate(() => { const fp = window.__fp, c = fp.storyActs.chair; return { n: fp.acts.list.length, offered: fp.acts.offered?.def.id || null, place: c.place.visible, again: c.again.visible, eleven: c.eleven.visible, rest0: c.rests[0].visible }; });
  check('?acts=0: his place is there as laid, nothing registered or offered, no candle, no row of glasses at the rests', z.n === 0 && z.offered === null && z.place && !z.again && !z.eleven && !z.rest0, z);
  await c.close();
}
// ------------------------------------------------------------------ v10-A4: the chalk's place, the seat, the ride
{
  const c = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const p = await c.newPage(); watch(p, 'seat');
  await ready(p, `${base}/?q=low&pos=-50,12`);
  const until = async (fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(200); } return false; };
  const seatH = () => window.__fp.acts.list.find((h) => h.def.id === 'halt-seat');
  const chalk = await p.evaluate(() => {
    const fp = window.__fp, t = fp.tally, h = fp.acts.list.find((x) => x.def.id === 'halt-tally');
    const st0 = t.chalk.staple(), n0 = { ...t.next };
    h.def.show(5); const st5 = t.chalk.staple(); h.def.show(0);
    return { st0, st5, n0, d0: Math.hypot(st0.x - n0.x, st0.z - n0.z), up0: st0.y - n0.y, moved: Math.hypot(st5.x - st0.x, st5.z - st0.z) };
  });
  check('the chalk hangs over where the next stroke goes (staple within 0.5 m along, above it), and moves on with the count', chalk.d0 < 0.5 && chalk.up0 > 0.1 && chalk.moved > 0.4, chalk);
  // the seat is not offered before the stroke
  await p.evaluate(() => { const fp = window.__fp, s = fp.tally.seat.stand(); fp.controls.placeAt(s.x, s.z); fp.player.yaw = s.yaw; fp.player.pitch = s.pitch; });
  await sleep(1500);
  let r = await p.evaluate(() => ({ offered: window.__fp.acts.offered?.def.id || null, may: window.__fp.acts.may(window.__fp.acts.list.find((h) => h.def.id === 'halt-seat')), mode: window.__fp.tally.seat.mode }));
  check('the seat is not offered before the stroke is chalked (it hangs at the hatch)', r.offered !== 'halt-seat' && !r.may && r.mode === 'up', r);
  await atStroke(p); await waitOffer(p, true);
  const sx = await p.evaluate(() => { const t = window.__fp.tally, s = t.strokeAt(0), c = t.centre, n = t.normal; return { x: c.x + n.z * s.along, z: c.z - n.x * s.along }; });
  await p.keyboard.press('KeyE');
  await until(() => { const t = window.__fp.tally; return t.drawing; }, 4000);
  await sleep(300);
  r = await p.evaluate((sx) => { const t = window.__fp.tally; return { drawing: t.drawing, stub: t.chalk.stub(), next: sx }; }, sx);
  check('the chalk itself is at the stone while the stroke is drawn', r.drawing && Math.hypot(r.stub.x - r.next.x, r.stub.z - r.next.z) < 0.6, r);
  const down = await until(() => window.__fp.tally.seat.down, 20000);
  check('after the stroke the seat comes down to sitting height', down && (await p.evaluate(() => { const fp = window.__fp, s = fp.tally.seat; return s.y - fp.terrain.heightAt(s.at.x, s.at.z) < 1; })));
  r = await p.evaluate((sx) => { // from where they chalked, looking where they chalked: the seat is in the view, within reach of the stroke
    const fp = window.__fp, t = fp.tally, s = t.stand(2.4), pl = fp.player, w = t.seat.world();
    fp.controls.placeAt(s.x, s.z); pl.yaw = s.yaw; pl.pitch = -0.1; fp.camera.position.copy(pl.pos); fp.camera.rotation.set(-0.1, s.yaw, 0, 'YXZ'); fp.camera.updateMatrixWorld();
    const v = w.clone().project(fp.camera), u = w.clone().setY(w.y + 1.6).project(fp.camera);
    return { plank: [+v.x.toFixed(2), +v.y.toFixed(2)], cords: [+u.x.toFixed(2), +u.y.toFixed(2)], fromStroke: +Math.hypot(w.x - sx.x, w.z - sx.z).toFixed(2), offered: fp.acts.offered?.def.id || null };
  }, sx);
  check('from where they chalked, not moving the look: the seat and its cords are in the view, within a metre of the stroke', Math.abs(r.plank[0]) < 0.9 && Math.abs(r.plank[1]) < 0.95 && Math.abs(r.cords[1]) < 0.95 && r.fromStroke < 1.0, r);
  r = { offered: await until(() => window.__fp.acts.offered?.def.id === 'halt-seat', 4000) };
  check('and "Take the seat" is offered there, without turning to look for it', r.offered, r);
  await p.evaluate(() => { const fp = window.__fp, s = fp.tally.seat.stand(); fp.controls.placeAt(s.x, s.z); fp.player.yaw = s.yaw; fp.player.pitch = s.pitch; fp.player.vel.set(0, 0, 0); });
  r = { offered: await until(() => window.__fp.acts.offered?.def.id === 'halt-seat', 4000), words: await p.evaluate(() => document.getElementById('act-words').textContent) };
  check('then the seat is offered, with its words', r.offered && r.words === 'Take the seat', r);
  const start = await p.evaluate(() => { const q = window.__fp.player.pos; return { x: q.x, y: q.y, z: q.z, yaw: window.__fp.player.yaw }; });
  await p.keyboard.press('KeyE');
  await until(() => window.__fp.tally.ride.phase === 'rising', 4000);
  r = await p.evaluate(() => { const fp = window.__fp, h0 = fp.player.hops, hopped = fp.controls.hop(); return { carried: fp.player.carried, hopped, hops: fp.player.hops - h0, phase: fp.tally.ride.phase }; });
  check('E takes the seat: the visitor is carried and cannot hop off', r.carried && r.phase === 'rising' && !r.hopped && r.hops === 0, r);
  // pause and the settings panel hold the ride; the sun's gutter does not
  await p.evaluate(() => { const c2 = document.getElementById('card'); c2.classList.remove('hidden'); c2.classList.add('paused'); });
  const y0 = await p.evaluate(() => window.__fp.player.pos.y); await sleep(1200); const y1 = await p.evaluate(() => window.__fp.player.pos.y);
  await p.evaluate(() => document.getElementById('card').classList.add('hidden'));
  await p.evaluate(() => window.__fp.settings.open()); await sleep(1000); const y2 = await p.evaluate(() => window.__fp.player.pos.y);
  await p.evaluate(() => window.__fp.settings.close());
  check('paused, and with the settings panel open, the ride holds where it is', Math.abs(y1 - y0) < 0.02 && Math.abs(y2 - y1) < 0.02, { y0, y1, y2 });
  await until((sy) => window.__fp.player.pos.y - sy > 3, 20000, start.y);
  r = await p.evaluate(() => { const fp = window.__fp, pl = fp.player, n = fp.tally.normal; return { out: +(-Math.sin(pl.yaw) * n.x - Math.cos(pl.yaw) * n.z).toFixed(2), lookQuiet: +pl.lookQuiet.toFixed(1) }; });
  check('with no look input, mid-climb the seat has turned them to face out from the slab (forward . the face\'s normal > 0.5)', r.out > 0.5, r);
  await p.evaluate(() => { window.__fp.sky.flicker.hold = 0.25; });
  const top = await until(() => window.__fp.tally.ride.phase === 'top', 20000);
  r = await p.evaluate(() => { const fp = window.__fp, q = fp.player.pos, g = fp.tally.ride.sleeper; return { y: q.y, d: Math.hypot(q.x - g.x, q.y - g.y, q.z - g.z) }; });
  await p.evaluate(() => { window.__fp.sky.flicker.hold = null; });
  check('in a gutter the ride goes on, to the top: seven metres or more up, within 2 m of the sleeper', top && r.y - start.y > 7 && r.d < 2, { top, r, start });
  const salt = await until(() => window.__fp.tally.ride.salt > 0, 15000);
  r = await p.evaluate(() => { const fp = window.__fp, v = fp.tally.ride.sleeper.project(fp.camera); return { answering: fp.tally.ride.answering, salt: fp.tally.ride.salt, head: [+v.x.toFixed(2), +v.y.toFixed(2)] }; });
  check('at the top the sleeper answers: he holds out his hand and salt runs from it', r.answering && salt, r);
  check('with no look input, his head is in the middle third of the view while he answers', Math.abs(r.head[0]) < 1 / 3 && Math.abs(r.head[1]) < 1 / 3, r);
  await p.keyboard.down('KeyW'); await until(() => window.__fp.tally.ride.phase === 'down', 8000); await p.keyboard.up('KeyW'); // pushing to walk: the seat lets them down
  const back = await until(() => !window.__fp.player.carried && window.__fp.tally.ride.phase === null, 20000);
  r = await p.evaluate(() => { const q = window.__fp.player.pos; return { x: q.x, y: q.y, z: q.z, carried: window.__fp.player.carried }; });
  check('pushing to walk lets them down, and the ride ends exactly where it began', back && Math.hypot(r.x - start.x, r.z - start.z) < 0.01 && Math.abs(r.y - start.y) < 0.05, { r, start });
  await sleep(500);
  r = await p.evaluate(() => { const q = window.__fp.player; return { x: q.pos.x, z: q.pos.z, onGround: q.onGround }; });
  check('set down, they stand there and can walk', Math.hypot(r.x - start.x, r.z - start.z) < 0.05 && r.onGround, r);
  r = await p.evaluate(() => ({ yaw: window.__fp.player.yaw }));
  check('set down looking where they looked when they took the seat (yaw as at the press)', Math.abs(Math.atan2(Math.sin(r.yaw - start.yaw), Math.cos(r.yaw - start.yaw))) < 0.01, { r, start });
  // a teleport from the settings map in mid-ride: they arrive there, and the seat goes back up empty
  await p.evaluate(() => { for (const h of window.__fp.acts.list) h.done = false; window.__fp.acts.act(window.__fp.acts.list.find((h) => h.def.id === 'halt-tally')); });
  await until(() => window.__fp.tally.seat.down, 25000);
  await p.evaluate(() => window.__fp.acts.act(window.__fp.acts.list.find((h) => h.def.id === 'halt-seat')));
  await until(() => window.__fp.tally.ride.phase === 'rising', 4000); await sleep(2000);
  await p.evaluate(() => window.__fp.settings.teleport(0)); await sleep(800);
  r = await p.evaluate(() => { const fp = window.__fp, q = fp.player.pos, pl = fp.settings.places[0]; return { carried: fp.player.carried, d: Math.hypot(q.x - pl.x, q.z - pl.z), mode: fp.tally.seat.mode, g: q.y - fp.terrain.heightAt(q.x, q.z) }; });
  check('a teleport in mid-ride: the visitor is at the place, on the ground, not carried; the seat goes back up', !r.carried && r.d < 6 && r.g < 3 && r.mode === 'hauling', r);
  // chalked and walked away: the seat waits, then goes back up
  await until(() => window.__fp.tally.seat.mode === 'up', 30000);
  await p.evaluate(() => { for (const h of window.__fp.acts.list) h.done = false; window.__fp.acts.act(window.__fp.acts.list.find((h) => h.def.id === 'halt-tally')); });
  const waitDown = await until(() => window.__fp.tally.seat.down, 30000);
  await p.evaluate(() => { const fp = window.__fp, a = fp.tally.seat.at; fp.controls.placeAt(a.x + 40, a.z + 10); });
  const gone = await until(() => window.__fp.tally.seat.mode === 'hauling' || window.__fp.tally.seat.mode === 'up', 60000);
  check('chalked and walked away: the seat comes down, waits, and goes back up', waitDown && gone, await p.evaluate(() => window.__fp.tally.seat.mode));
  // a carrier that throws: the carry ends and the player is put back where it began
  r = await p.evaluate(async () => {
    const fp = window.__fp, p0 = fp.player.pos.clone();
    fp.controls.carry({ step(pos) { pos.y += 5; throw new Error('test carrier'); } });
    await new Promise((res) => setTimeout(res, 600));
    return { carried: fp.player.carried, d: Math.hypot(fp.player.pos.x - p0.x, fp.player.pos.z - p0.z) };
  });
  for (let i = errors.length - 1; i >= 0; i--) if (/carry step failed|test carrier/.test(errors[i])) errors.splice(i, 1); // the throw it logs is the test's own
  check('a carrier that throws: the carry ends and the player stands where it began', !r.carried && r.d < 0.6, r);
  await c.close();
}
// a return visit after a ride: the second pillow is on the sill
await seeded('ridden', () => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('fp-acts', JSON.stringify({ v: 1, marks: { 'halt-tally': { n: 1, last: 1 }, 'halt-seat': { n: 1, last: 1 } } })); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } },
  `${base}/?q=low&only=waystation,acts&render=0&pos=-50,12`, async (pg) => {
    const v = await pg.evaluate(() => { let vis = null; window.__fp.scene.traverse((o) => { if (o.name === 'waystation-pillow') vis = o.visible; }); return vis; });
    check('a return visit after a ride: a second pillow lies on the sill beside him', v === true, v);
  });
// ------------------------------------------------------------------ v10-A1: the crystal and the door (tools/acts-central.mjs)
if (process.env.CENTRAL !== '0') await (await import('./acts-central.mjs')).centralRows({ browser, base, check, watch });
// ------------------------------------------------------------------ v10-A3 the bell under the Span (src/v10/bell.js)
{
  const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await c.newPage(); watch(p, 'bell');
  await p.goto(`${base}/?q=low&pos=-33,204`, { waitUntil: 'load', timeout: 60000 });
  await p.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.bell && window.__fp.acts, null, { timeout: 300000 });
  await begin(p);
  const bs = () => p.evaluate(() => { const fp = window.__fp; let stored = null; try { stored = JSON.parse(localStorage.getItem('fp-acts') || 'null')?.marks?.['span-bell']?.n ?? null; } catch (e) { stored = 'throws'; }
    return { offered: fp.acts.offered?.def.id || null, words: document.getElementById('act-words').textContent, count: fp.acts.count('span-bell'), stored, ...fp.bell.state, lit: fp.bell.candles().length }; });
  const bstand = (o = {}) => p.evaluate((o) => { const fp = window.__fp, s = fp.bell.stand(o.back || 0), pl = fp.player; fp.controls.placeAt(o.x ?? s.x, o.z ?? s.z); pl.yaw = s.yaw + (o.turn || 0); pl.pitch = s.pitch; pl.vel.set(0, 0, 0); }, o);
  const bwait = async (want, ms = 4000) => { const t0 = Date.now(); let s; do { s = await bs(); if ((s.offered === 'span-bell') === want) return s; await sleep(150); } while (Date.now() - t0 < ms); return s; };
  let b = await bs();
  check('bell: registered as an act, nothing remembered, no candles round him', b.count === 0 && b.standing === 0 && b.lit === 0 && b.stones === 0, b);
  await bstand({ back: 28 }); b = await bwait(false, 2000);
  check('bell: not offered from 28 m up the track', b.offered !== 'span-bell', b);
  await bstand({ turn: Math.PI }); b = await bwait(false, 2000);
  check('bell: not offered at the post facing away from the bell', b.offered !== 'span-bell', b);
  await p.evaluate(() => { const fp = window.__fp, pl = fp.player; fp.controls.placeAt(fp.bell.site.x + 2, fp.bell.site.z + 9); pl.yaw = 0; pl.pitch = 0.3; });
  b = await bwait(false, 2000);
  check('bell: not offered from beyond the bell, south of it, looking back', b.offered !== 'span-bell', b);
  await bstand(); b = await bwait(true);
  check('bell: at the post, looking at the ram and the bell: offered, "Ring the bell"', b.offered === 'span-bell' && b.words === 'Ring the bell', b);
  check('bell: the ram\'s head and the bell are in view from there', await onScreen(p, await p.evaluate(() => ({ x: window.__fp.bell.headX, y: window.__fp.bell.ramY, z: window.__fp.bell.site.z }))) && await onScreen(p, await p.evaluate(() => ({ x: window.__fp.bell.site.x, y: window.__fp.bell.lip + 4, z: window.__fp.bell.site.z }))));
  if (shots) await shot(p, 'acts-bell-offer');
  const bt = (cond, ms = 30000) => p.waitForFunction(cond, null, { timeout: ms, polling: 50 }).then(() => true, () => false); // state-based waits
  await p.keyboard.press('KeyE');
  await bt('window.__fp.bell.state.ram > 1.5', 8000);
  b = await bs();
  check('bell: E does it: counted and kept, the ram hauled back metres on its rope', b.count === 1 && b.stored === 1 && b.active && b.ram > 1.5, b);
  await bt('window.__fp.bell.state.rang'); await bt('window.__fp.bell.state.t > window.__fp.bell.strike + 0.5');
  b = await bs();
  check('bell: the ram comes in and strikes: dust falls, a fresh stone or two from the crack', b.rang && b.dust && b.stones === 2, b);
  if (shots) await shot(p, 'acts-bell-struck');
  await bt('window.__fp.bell.state.t > window.__fp.bell.strike + 6');
  b = await bs();
  check('bell: knocked off plumb, it swings (over half a degree six seconds on)', b.sway > 0.009, b);
  await p.evaluate(() => window.__fp.bell.ff(window.__fp.bell.call + 4 - window.__fp.bell.state.t));
  b = await bs();
  const onFen = await p.evaluate(() => window.__fp.bell.candles().filter((q) => q.x > 15).length);
  check('bell: a few seconds on, candles kindle out on the fen', onFen >= 1, { onFen, b });
  await p.keyboard.press('KeyE'); await sleep(300);
  check('bell: a second E while it rings does nothing', (await bs()).count === 1);
  // the visitor walks off: the candles gather in the bell's mouth and wait for them
  await p.evaluate(() => { const fp = window.__fp; fp.controls.placeAt(fp.bell.site.x, fp.bell.site.z - 80); });
  await p.evaluate(() => window.__fp.bell.ff(70));
  b = await bs();
  check('bell: with the visitor gone off, the nine gather in the bell\'s mouth and wait', b.active && b.waiting === 9 && !b.going && b.glow > 0.2, b);
  await bstand(); await sleep(200);
  await p.evaluate(() => window.__fp.bell.ff(120));
  b = await bs();
  const round = await p.evaluate(() => { const fp = window.__fp, bd = fp.bell.body; return fp.bell.candles().map((q) => Math.hypot(q.x - bd.x, q.z - bd.z)); });
  check('bell: with the visitor back, they go on and stand round the traveller: nine in a ring, the ringing done', !b.active && b.standing === 9 && round.length === 9 && round.every((d) => d > 1.4 && d < 3.5), { b, round });
  // the last beat, at him
  const lp = () => p.evaluate(() => { const L = window.__fp.bell.letters(), m = new window.__fp.THREE.Matrix4(), v = new window.__fp.THREE.Vector3(); let near = 0; for (let k = 0; k < L.count; k++) { L.getMatrixAt(k, m); v.setFromMatrixPosition(m); if (v.distanceTo(L.userData.chest) < 0.4) near++; } return { n: L.count, near }; });
  await p.evaluate(() => { const fp = window.__fp, s = fp.bell.standBody(); fp.controls.placeAt(s.x, s.z); fp.player.yaw = s.yaw; fp.player.pitch = s.pitch; });
  b = await (async () => { const t0 = Date.now(); let r; do { r = await bs(); if (r.offered === 'span-letters') break; await sleep(150); } while (Date.now() - t0 < 4000); return r; })();
  check('bell: at the traveller, the candles round him: offered "Gather his letters"', b.offered === 'span-letters' && b.words === 'Gather his letters', b);
  await p.keyboard.press('KeyE');
  await bt('window.__fp.bell.state.gathered', 20000);
  let lt = await lp(); b = await bs();
  check('bell: E gathers them: every letter laid on his chest, and the candles go up', lt.near === lt.n && b.gathered && b.ascending, { lt, b });
  await bt('!window.__fp.bell.state.ascending', 60000);
  b = await bs();
  check('bell: gone up, all but the one that keeps watch over his head', b.lit === 1, b);
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.bell, null, { timeout: 300000 });
  await begin(p); await bt('window.__fp.threads?.traveller?.letters', 20000); await sleep(500);
  b = await bs(); lt = await lp();
  check('bell: after a reload: one candle over him, his letters on his chest, the stones under the crack', b.count === 1 && b.gathered && b.lit === 1 && lt.near === lt.n && b.stones === 2, { b, lt });
  await bstand(); b = await bwait(true);
  check('bell: after a reload it is offered again (a new visit); the letters are not (once)', b.offered === 'span-bell' && await p.evaluate(() => !window.__fp.acts.may(window.__fp.acts.list.find((h) => h.def.id === 'span-letters'))), b);
  await p.evaluate(() => { window.__fp.settings.open(); document.getElementById('set-forget').scrollIntoView({ block: 'center' }); }); await sleep(500);
  await p.click('#set-forget'); await sleep(300);
  await p.evaluate(() => window.__fp.settings.close());
  b = await bs(); lt = await lp();
  check('bell: forgetting puts out the candles, clears the stones and scatters his letters again', b.count === 0 && b.standing === 0 && b.lit === 0 && b.stones === 0 && !b.gathered && lt.near === 0, { b, lt });
  await c.close();
}

check('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close();
console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
