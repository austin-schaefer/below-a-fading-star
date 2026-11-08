#!/usr/bin/env node
// Touch controls on a phone-sized viewport: the thumbstick, the hop button, the mute button (tap
// and the long-press debug reveal), and the Safari stale-identifier bug, where a reused touch id
// made the stick leap to the panning finger. Usage: node tools/touch-test.mjs [url]
// SHOTS=1 also writes shots/wip/mobile-15-phone-begun.png and mobile-15-phone-muted-pressed.png.
// Real touches go through CDP; the stale-id cases dispatch synthetic TouchEvents, because CDP
// keeps its own touch book-keeping and will not send a touchstart for an id that is still down.
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low&shadows=0&bloom=0';
const shots = process.env.SHOTS === '1';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => { localStorage.removeItem('fp-muted'); window.__fp.events.dispatchEvent(new CustomEvent('begin')); });
await page.waitForTimeout(1500);

const cdp = await context.newCDPSession(page);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, x, y]) => ({ id, x, y })) });
const read = () => page.evaluate(() => {
  const fp = window.__fp, t = fp.controls.touch, r = document.getElementById('stick').getBoundingClientRect();
  return { mag: t.moveVec.mag, ring: t.ring, el: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, moveId: t.moveId, lookId: t.lookId,
    knob: document.getElementById('stick-knob').style.transform, yaw: fp.player.yaw, vy: fp.player.vy, onGround: fp.player.onGround, hops: fp.player.hops };
});
const centre = (sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? [r.left + r.width / 2, r.top + r.height / 2] : null; }, sel);
const near = (a, b, tol = 1) => Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
const checks = [];
const check = (name, ok, info) => { checks.push([name, !!ok]); if (!ok && info !== undefined) console.log('  ', name, JSON.stringify(info)); };

const visible = await page.evaluate(() => ['stick', 'jump', 'mute'].map((id) => getComputedStyle(document.getElementById(id) || document.body).display !== 'none' && !!document.getElementById(id)));
check('stick, jump and mute shown on touch', visible.every(Boolean), visible);
const home = (await read()).ring;

// 1. the stick
await touch('touchStart', [[1, home.x, home.y]]);
await touch('touchMove', [[1, home.x, home.y - 40]]);
let s = await read();
check('stick: 40 px up walks (mag > 0.5)', s.mag > 0.5 && s.moveId !== null, s);
check('stick: knob moved', /translate\(0px, -40px\)/.test(s.knob), s.knob);
await touch('touchEnd', []);
s = await read();
check('stick: release zeroes it and sends the ring home', s.mag === 0 && s.moveId === null && near(s.ring, home) && near(s.el, home, 1.5) && /translate\(0px, 0px\)/.test(s.knob), s);

// 2. the hop button
const jc = await centre('#jump');
if (jc) {
  const before = await read();
  await touch('touchStart', [[2, jc[0], jc[1]]]); await touch('touchEnd', []);
  s = await read();
  check('jump: a tap hops', before.onGround && s.hops === before.hops + 1 && !s.onGround && s.vy > 0, { before, s });
  check('jump: the tap did not reach the stick or look', s.moveId === null && s.lookId === null && s.mag === 0, s);
  await touch('touchStart', [[2, jc[0], jc[1]]]); await touch('touchEnd', []);
  const s2 = await read();
  check('jump: no second hop while airborne', s2.hops === s.hops, s2);
  check('jump: right of the left edge, left of and below the stick centre', jc[0] < home.x - 60 && jc[1] > home.y, { jc, home });
} else check('jump: button exists', false);

// 3. the mute button
const mc = await centre('#mute');
const audioState = () => page.evaluate(() => { const a = window.__fp.audio, b = document.getElementById('mute');
  let stored = null; try { stored = localStorage.getItem('fp-muted'); } catch (e) { /* */ }
  return { muted: a.muted, pressed: b?.getAttribute('aria-pressed'), stored, hasNode: !!a.mute, gain: a.mute ? a.mute.gain.value : null, acState: a.ctx ? a.ctx.state : null, debug: !!window.__fp.debug?.enabled }; });
// Taps on #mute are dispatched as a synthetic touchstart and touchend in one task: under software GL a
// frame can outlast the 1.2 s hold, so a CDP tap's touchend may arrive after the long-press timer.
const tapMute = () => page.evaluate(() => {
  const b = document.getElementById('mute'), r = b.getBoundingClientRect();
  const t = new Touch({ identifier: 30, target: b, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
  b.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], cancelable: true, bubbles: true }));
  b.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], cancelable: true, bubbles: true }));
});
let gainChecked = false;
if (mc) {
  check('mute: on top at its centre', await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('#mute') !== null, mc));
  await tapMute();
  await page.waitForTimeout(500);
  let a = await audioState();
  check('mute: a tap mutes, aria-pressed and fp-muted follow', a.muted === true && a.pressed === 'true' && a.stored === '1', a);
  if (a.hasNode && a.acState === 'running') { gainChecked = true; check('mute: the mute gain ramps to 0', a.gain < 0.01, a); }
  await tapMute();
  await page.waitForTimeout(500);
  a = await audioState();
  check('mute: a second tap unmutes', a.muted === false && a.pressed === 'false' && a.stored === '0', a);
  if (gainChecked) check('mute: the mute gain ramps back to 1', a.gain > 0.99, a);
  console.log(`audio: context ${a.acState}, mute node ${a.hasNode ? 'present' : 'absent'}; gain ${gainChecked ? 'checked' : 'not checked (flag only)'}`);
} else check('mute: button exists', false);

// 4. the stale identifier (mobile Safari): synthetic TouchEvents with full control of the lists
const stale = await page.evaluate(() => {
  const fp = window.__fp, t = fp.controls.touch, cv = fp.renderer.domElement;
  const T = (id, x, y) => new Touch({ identifier: id, target: cv, clientX: x, clientY: y });
  const fire = (type, touches, changed) => cv.dispatchEvent(new TouchEvent(type, { touches, changedTouches: changed, cancelable: true, bubbles: true }));
  const snap = () => ({ mag: t.moveVec.mag, ring: { ...t.ring }, moveId: t.moveId, lookId: t.lookId, yaw: fp.player.yaw });
  const home = { ...t.ring }, out = {};
  // a: id 1 walks; then, with no touchend, a touchstart for id 1 lands top-left and drags
  let a = T(1, home.x, home.y); fire('touchstart', [a], [a]);
  a = T(1, home.x, home.y - 30); fire('touchmove', [a], [a]);
  out.aWalking = snap();
  let b = T(1, 60, 150); fire('touchstart', [b], [b]);
  b = T(1, 130, 160); fire('touchmove', [b], [b]);
  out.aAfter = snap();
  fire('touchend', [], [b]);
  out.aEnd = snap();
  // b: id 2 walks, id 3 looks; then a touchmove whose list no longer holds id 2
  const w = T(2, home.x, home.y); fire('touchstart', [w], [w]);
  fire('touchmove', [T(2, home.x + 25, home.y)], [T(2, home.x + 25, home.y)]);
  const l = T(3, 80, 300); fire('touchstart', [T(2, home.x + 25, home.y), l], [l]);
  out.bBoth = snap();
  const l2 = T(3, 110, 300); fire('touchmove', [l2], [l2]);
  out.bAfter = snap();
  fire('touchend', [], [l2]);
  out.home = home;
  return out;
});
check('stale id: walking before the reuse', stale.aWalking.mag > 0.4 && stale.aWalking.moveId === 1, stale.aWalking);
check('stale id: the reused id releases the stick (mag 0)', stale.aAfter.mag === 0 && stale.aAfter.moveId === null, stale.aAfter);
check('stale id: the ring stays home, not under the other finger', near(stale.aAfter.ring, stale.home), stale.aAfter);
check('stale id: the reused touch looks (yaw changed)', stale.aAfter.lookId === 1 && Math.abs(stale.aAfter.yaw - stale.aWalking.yaw) > 0.1, stale.aAfter);
check('stale id: its end clears it', stale.aEnd.lookId === null && stale.aEnd.moveId === null, stale.aEnd);
check('missing id: walking and looking together', stale.bBoth.moveId === 2 && stale.bBoth.lookId === 3 && stale.bBoth.mag > 0.3, stale.bBoth);
check('missing id: a touchmove without the stick id releases the stick', stale.bAfter.mag === 0 && stale.bAfter.moveId === null && stale.bAfter.lookId === 3 && near(stale.bAfter.ring, stale.home), stale.bAfter);

// 4c. the same through CDP: the stick's id teleports to the top-left in one move (the guard)
await touch('touchStart', [[4, home.x, home.y]]);
await touch('touchMove', [[4, home.x, home.y - 20]]);
const g0 = await read();
await touch('touchMove', [[4, 70, 160]]);
await touch('touchMove', [[4, 110, 170]]);
const g1 = await read();
await touch('touchEnd', []);
check('jump guard: a 160+ px leap in one move releases the stick, the finger looks', g0.mag > 0.2 && g1.mag === 0 && g1.moveId === null && g1.lookId === 4 && near(g1.ring, home) && g1.yaw !== g0.yaw, { g0, g1 });
// and an ordinary fast flick inside the stick's reach still walks
await touch('touchStart', [[5, home.x, home.y]]);
await touch('touchMove', [[5, home.x, home.y - 70]]);
await touch('touchMove', [[5, home.x + 60, home.y - 140]]);
const f1 = await read();
await touch('touchEnd', []);
check('jump guard: a fast flick still walks', f1.moveId === 5 && f1.mag === 1, f1);

// renders
if (shots) {
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/wip/mobile-15-phone-begun.png', timeout: 240000 });
  console.log('[saved] shots/wip/mobile-15-phone-begun.png');
  if (mc) await tapMute();
  if (jc) await touch('touchStart', [[7, jc[0], jc[1]]]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/wip/mobile-15-phone-muted-pressed.png', timeout: 240000 });
  console.log('[saved] shots/wip/mobile-15-phone-muted-pressed.png');
  await touch('touchEnd', []);
  if (mc) await tapMute();
}

// 5. a long press on the mute button reveals debug and leaves the sound alone
if (mc) {
  const before = await audioState();
  await touch('touchStart', [[8, mc[0], mc[1]]]);
  await page.waitForTimeout(1300);
  await touch('touchEnd', []);
  await page.waitForTimeout(200);
  const a = await audioState();
  const shifted = await centre('#mute');
  check('mute long-press: debug revealed, mute unchanged', !before.debug && a.debug && a.muted === before.muted, { before, a });
  check('mute long-press: the mute button moves left of the debug button', shifted && shifted[0] < mc[0] - 30, { mc, shifted });
}

// 6. the stick stays home (#100): on an iPhone the ring sat mid-screen with the knob pulled away.
// A touch that starts well away from the stick looks; a gesture the browser never ends (no
// touchend, as when iOS takes the page away mid-drag) sends the ring home once the page loses
// focus or is hidden; a viewport change mid-drag re-homes the ring.
// SHOTS100=<label> also writes shots/wip/touch-100-<label>-{midscreen,interrupted}.png at 402×874.
{
  const r = await page.evaluate(() => {
    const fp = window.__fp, t = fp.controls.touch, cv = fp.renderer.domElement;
    const T = (id, x, y) => new Touch({ identifier: id, target: cv, clientX: x, clientY: y });
    const fire = (type, touches, changed) => cv.dispatchEvent(new TouchEvent(type, { touches, changedTouches: changed, cancelable: true, bubbles: true }));
    const snap = () => ({ mag: t.moveVec.mag, ring: { ...t.ring }, moveId: t.moveId, lookId: t.lookId, knob: document.getElementById('stick-knob').style.transform });
    const home = { ...t.ring }, out = { home };
    // a: a thumb lands mid-screen, right of centre (where Austin's ring sat), and drags left
    const mx = innerWidth * 0.6 + 2, my = innerHeight * 0.58;
    let a = T(40, mx, my); fire('touchstart', [a], [a]);
    a = T(40, mx - 70, my + 10); fire('touchmove', [a], [a]);
    out.mid = snap();
    fire('touchend', [], [a]);
    // b: a thumb lands just outside the ring, near home: it walks, and the ring follows only a little
    let b = T(41, home.x - 75, home.y - 30); fire('touchstart', [b], [b]);
    b = T(41, home.x - 75, home.y - 60); fire('touchmove', [b], [b]);
    out.near = snap();
    fire('touchend', [], [b]);
    out.nearEnd = snap();
    // c: walking, then the touchend never comes and the window loses focus
    let c = T(42, home.x - 40, home.y - 60); fire('touchstart', [c], [c]);
    c = T(42, home.x - 100, home.y - 50); fire('touchmove', [c], [c]);
    out.cHeld = snap();
    dispatchEvent(new Event('blur'));
    out.cBlur = snap();
    // d: the same, and the page is hidden (app switch, lock, notification pull)
    let d = T(43, home.x, home.y); fire('touchstart', [d], [d]);
    d = T(43, home.x - 50, home.y); fire('touchmove', [d], [d]);
    out.dHeld = snap();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    delete document.visibilityState;
    out.dHidden = snap();
    // e: pagehide (Safari's back-forward cache) mid-drag
    let e = T(44, home.x, home.y); fire('touchstart', [e], [e]);
    e = T(44, home.x, home.y - 50); fire('touchmove', [e], [e]);
    out.eHeld = snap();
    dispatchEvent(new Event('pagehide'));
    out.eHidden = snap();
    return out;
  });
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  check('#100 mid-screen touch: looks, not walks', r.mid.moveId === null && r.mid.lookId === 40 && r.mid.mag === 0, r.mid);
  check('#100 mid-screen touch: the ring stays home', near(r.mid.ring, r.home), r.mid);
  check('#100 near-home touch: walks, the ring follows within reach of home', r.near.moveId === 41 && r.near.mag > 0.3 && dist(r.near.ring, r.home) <= 120, r.near);
  check('#100 near-home touch: release sends the ring home', near(r.nearEnd.ring, r.home) && r.nearEnd.mag === 0, r.nearEnd);
  check('#100 lost touchend + blur: walking before', r.cHeld.moveId === 42 && r.cHeld.mag > 0.5, r.cHeld);
  check('#100 lost touchend + blur: stick released, ring home, knob centred', r.cBlur.moveId === null && r.cBlur.mag === 0 && near(r.cBlur.ring, r.home) && /translate\(0px, 0px\)/.test(r.cBlur.knob), r.cBlur);
  check('#100 lost touchend + hidden: stick released, ring home', r.dHeld.mag > 0.5 && r.dHidden.moveId === null && r.dHidden.mag === 0 && near(r.dHidden.ring, r.home), { held: r.dHeld, hidden: r.dHidden });
  check('#100 lost touchend + pagehide: stick released, ring home', r.eHeld.mag > 0.5 && r.eHidden.moveId === null && r.eHidden.mag === 0 && near(r.eHidden.ring, r.home), { held: r.eHeld, hidden: r.eHidden });
  // the element really sits at home too
  let s6 = await read();
  check('#100 after the interruptions the ring element is at home', near(s6.el, r.home, 1.5) && s6.moveId === null, s6);

  // f: the viewport turns to landscape mid-drag, then back
  await touch('touchStart', [[45, r.home.x, r.home.y]]);
  await touch('touchMove', [[45, r.home.x - 30, r.home.y - 30]]);
  const fHeld = await read();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  const fTurned = await read();
  const landHome = await page.evaluate(() => { const el = document.getElementById('stick');
    const keep = [el.style.left, el.style.top, el.style.bottom]; el.style.left = el.style.top = el.style.bottom = '';
    const b = el.getBoundingClientRect(); [el.style.left, el.style.top, el.style.bottom] = keep; return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
  await touch('touchEnd', []);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const fBack = await read();
  check('#100 resize mid-drag: walking before', fHeld.moveId === 45 && fHeld.mag > 0.5, fHeld);
  check('#100 resize mid-drag: the ring moves to the landscape home, on screen', near(fTurned.ring, landHome, 1.5) && near(fTurned.el, landHome, 1.5) && fTurned.mag === 0, { fTurned, landHome });
  check('#100 resize back: the ring is home again', near(fBack.ring, r.home, 1.5) && near(fBack.el, r.home, 1.5) && fBack.moveId === null, fBack);
  if (process.env.SHOTS100) {
    // before/after renders (#100): Austin's gesture, a thumb landing mid-screen and dragging left, held
    await page.setViewportSize({ width: 402, height: 874 });
    await page.waitForTimeout(600);
    const h = (await read()).ring;
    const mx = Math.round(402 * 0.6 + 2), my = Math.round(874 * 0.58);
    await touch('touchStart', [[46, mx, my]]);
    await touch('touchMove', [[46, mx - 70, my + 12]]);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `shots/wip/touch-100-${process.env.SHOTS100}-midscreen.png`, timeout: 240000 });
    await touch('touchEnd', []);
    // a drag interrupted with no touchend, then the page hidden and shown again
    await touch('touchStart', [[47, h.x - 30, h.y - 20]]);
    await touch('touchMove', [[47, h.x - 110, h.y - 40]]);
    await page.evaluate(() => { dispatchEvent(new Event('blur')); dispatchEvent(new Event('focus')); });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `shots/wip/touch-100-${process.env.SHOTS100}-interrupted.png`, timeout: 240000 });
    console.log(`[saved] shots/wip/touch-100-${process.env.SHOTS100}-{midscreen,interrupted}.png`);
    await touch('touchEnd', []);
  }
}

check('no page errors', errors.length === 0, errors);
await browser.close();
let fail = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
console.log(`${checks.length - fail}/${checks.length} passed`);
process.exit(fail ? 1 : 0);
