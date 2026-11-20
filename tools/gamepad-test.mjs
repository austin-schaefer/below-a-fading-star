#!/usr/bin/env node
// A gamepad (v17.1, #72; src/gamepad.js) through a faked navigator.getGamepads and a dispatched gamepadconnected:
// with no pad nothing is fetched or polled; a standard pad goes out from the title (no mouse capture asked), walks and
// turns in proportion to the sticks, hops, hurries, does the act on offer (the Lantern Halt's tally), opens the panel,
// moves the focus, goes to a place and shuts the panel; the hints say the pad's buttons and go back on a key; a
// non-standard pad walks on axes 0 and 1; a disconnect stops the polling.
// Usage: node tools/gamepad-test.mjs [base]   (base: http://localhost:8123)
// SHOTS=1 writes the hint's frames in order to shots/wip/v17.1-Q2-hint-<n>-<what>-<desktop|phone>.png.
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || process.env.FP_BASE || 'http://localhost:8123').replace(/\/$/, '');
const shots = process.env.SHOTS === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const checks = [];
const check = (name, ok, info) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && info !== undefined ? ' ' + JSON.stringify(info) : ''}`); };
const errors = [];

// the fake: getGamepads counts its calls and lists window.__pad; __mkPad connects one, __unPad takes it away
const FAKE = () => {
  window.__padCalls = 0; window.__pad = null;
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => { window.__padCalls++; return window.__pad ? [window.__pad] : []; } });
  window.__mkPad = (mapping = 'standard', id = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)') => {
    window.__pad = { id, index: 0, connected: true, mapping, timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    const e = new Event('gamepadconnected'); e.gamepad = window.__pad; window.dispatchEvent(e);
  };
  window.__unPad = () => { const g = window.__pad; window.__pad = null; const e = new Event('gamepaddisconnected'); e.gamepad = g; window.dispatchEvent(e); };
  window.__btn = (i, on) => { const b = window.__pad.buttons[i]; b.pressed = on; b.touched = on; b.value = on ? 1 : 0; };
};

async function open(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(FAKE);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`${base}/?q=low&shadows=0&bloom=0&pos=-50,12`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.tally && window.__fp.acts, null, { timeout: 300000 });
  return { context, page };
}
const press = async (page, i, ms = 140) => { await page.evaluate((i) => window.__btn(i, true), i); await sleep(ms); await page.evaluate((i) => window.__btn(i, false), i); await sleep(ms); };
const axes = (page, a) => page.evaluate((a) => { window.__pad.axes = a; }, a);
const shot = async (page, n, what, view) => {
  if (!shots) return;
  await sleep(300);
  const path = `shots/wip/v17.1-Q2-hint-${n}-${what}-${view}.png`;
  await page.screenshot({ path, timeout: 240000 });
  console.log(`[saved] ${path}`);
};
const hints = (page) => page.evaluate(() => ({ keys: document.querySelector('#card .keys')?.textContent || '', act: document.querySelector('#act kbd')?.textContent || '', set: document.querySelector('#settings-panel .set-keys')?.textContent || '' }));
// stand d metres out from where the tally's next stroke goes, looking at it (as tools/acts-test.mjs does)
const atStroke = (page, d = 2.1) => page.evaluate((d) => { const fp = window.__fp, s = fp.tally.stand(d); fp.controls.placeAt(s.x, s.z); fp.player.yaw = s.yaw; fp.player.pitch = s.pitch; fp.player.vel.set(0, 0, 0); }, d);
const waitFor = async (page, fn, arg, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await sleep(100); } return false; };

// ------------------------------------------------------------------ desktop
{
  const { context, page } = await open({ width: 1280, height: 720 });
  await sleep(2000);
  let s = await page.evaluate(() => ({ calls: window.__padCalls, fetched: performance.getEntriesByType('resource').some((e) => /gamepad\.js/.test(e.name)), mod: !!window.__fp.gamepad }));
  check('no pad: getGamepads asked at most once (the load\'s one check), gamepad.js not fetched', s.calls <= 1 && !s.fetched && !s.mod, s);
  const keysBefore = await hints(page);
  await shot(page, 1, 'title-keys', 'desktop');

  await page.evaluate(() => window.__mkPad());
  const loaded = await waitFor(page, () => !!window.__fp.gamepad?.pads);
  check('a pad connects: gamepad.js loads and polls', loaded);
  // a nudge of the stick on the title: the hints turn to the pad's
  await axes(page, [0.6, 0, 0, 0]); await sleep(250); await axes(page, [0, 0, 0, 0]); await sleep(200);
  let h = await hints(page);
  check('first use: the title\'s keys line says the pad\'s buttons', /stick/.test(h.keys) && /Start/.test(h.keys) && !/Space/.test(h.keys), { before: keysBefore.keys, after: h.keys });
  check('first use: the act\'s key says X', h.act === 'X', h.act);
  check('the title is still up after a stick nudge (only a button goes out)', await page.evaluate(() => !window.__fp.player.enabled));
  await shot(page, 2, 'title-pad', 'desktop');

  // go out with A
  await press(page, 0);
  await sleep(400);
  s = await page.evaluate(() => { const p = window.__fp.player, a = window.__fp.audio; return { enabled: p.enabled, hidden: document.getElementById('card').classList.contains('hidden'), locked: p.locked, lockFailed: p.lockFailed, started: !!a?.started, ac: a?.ctx?.state ?? null }; });
  check('A on the title goes out, asking for no mouse capture (no drag-look fallback)', s.enabled && s.hidden && !s.locked && !s.lockFailed, s);
  check('the sound starts on going out from the pad', s.started, s);
  console.log(`  audio context after the pad's begin: ${s.ac} (this browser runs with autoplay allowed; a real Chromium may wait for a key or click, and the hint says so)`);
  await sleep(1500); // the drop-to-ground and the start settle

  // walk: full and half forward, in proportion
  const speedAt = async (y) => {
    await page.evaluate(() => { const fp = window.__fp; fp.controls.placeAt(-40, 20); fp.player.yaw = 0.3; fp.player.pitch = 0; });
    await axes(page, [0, y, 0, 0]); await sleep(1100);
    const v = await page.evaluate(() => ({ speed: window.__fp.player.speed, hurry: window.__fp.player.hurrying, pad: window.__fp.gamepad.state() }));
    await axes(page, [0, 0, 0, 0]); await sleep(400);
    return v;
  };
  const full = await speedAt(-1), half = await speedAt(-0.58);
  check('left stick full forward walks (about 3.6 m/s)', full.speed > 2.5 && full.speed < 4.2 && !full.hurry, full);
  check('left stick half pushed walks about half as fast', half.speed / full.speed > 0.35 && half.speed / full.speed < 0.65, { full: full.speed, half: half.speed });
  // look: right stick full and half right, a curve
  const yawRate = (x) => page.evaluate(async (x) => {
    const p = window.__fp.player; window.__pad.axes = [0, 0, 0, 0]; await new Promise((r) => setTimeout(r, 150));
    const y0 = p.yaw, t0 = performance.now(); window.__pad.axes = [0, 0, x, 0];
    await new Promise((r) => setTimeout(r, 600));
    const y1 = p.yaw, t1 = performance.now(); window.__pad.axes = [0, 0, 0, 0];
    return (y1 - y0) / ((t1 - t0) / 1000);
  }, x);
  const lf = await yawRate(1), lh = await yawRate(0.56);
  check('right stick right turns right (yaw falls), up to about 2.4 rad/s', lf < -1.4 && lf > -2.8, lf);
  check('right stick half right turns less than half as fast (the curve)', lh / lf > 0.15 && lh / lf < 0.45, { full: lf, half: lh });
  const pitch0 = await page.evaluate(() => window.__fp.player.pitch);
  await axes(page, [0, 0, 0, -1]); await sleep(300); await axes(page, [0, 0, 0, 0]);
  const pitch1 = await page.evaluate(() => window.__fp.player.pitch);
  check('right stick up looks up', pitch1 > pitch0 + 0.2, { pitch0, pitch1 });
  await page.evaluate(() => { window.__fp.player.pitch = 0; });

  // hop
  const hops0 = await page.evaluate(() => window.__fp.player.hops);
  await press(page, 0);
  const hops1 = await page.evaluate(() => window.__fp.player.hops);
  check('A hops', hops1 === hops0 + 1, { hops0, hops1 });
  await sleep(600);
  // hurry: the right trigger held, and the left stick's click (until the stick rests)
  await page.evaluate(() => { const fp = window.__fp; fp.controls.placeAt(-40, 20); fp.player.yaw = 0.3; const b = window.__pad.buttons[7]; b.value = 1; b.pressed = true; window.__pad.axes = [0, -1, 0, 0]; });
  await sleep(1100);
  s = await page.evaluate(() => ({ speed: window.__fp.player.speed, hurry: window.__fp.player.hurrying }));
  await page.evaluate(() => { const b = window.__pad.buttons[7]; b.value = 0; b.pressed = false; });
  check('RT held with the stick forward hurries (over 5 m/s)', s.hurry && s.speed > 5, s);
  await press(page, 10); await sleep(500);
  s = await page.evaluate(() => ({ speed: window.__fp.player.speed, hurry: window.__fp.player.hurrying }));
  check('a click of the left stick hurries while it is pushed', s.hurry, s);
  await axes(page, [0, 0, 0, 0]); await sleep(300);
  s = await page.evaluate(() => ({ hurry: window.__fp.gamepad.state().hurry }));
  check('the stick at rest ends the click\'s hurry', !s.hurry, s);

  // the act: the tally at the Lantern Halt
  await atStroke(page);
  const offered = await waitFor(page, () => window.__fp.acts.offered?.def.id === 'halt-tally', null, 6000);
  check('the tally is offered at its stroke', offered);
  h = await hints(page);
  check('the offer shows X, not E', h.act === 'X', h.act);
  await shot(page, 3, 'offer-pad', 'desktop');
  const n0 = await page.evaluate(() => window.__fp.acts.count('halt-tally'));
  await press(page, 2);
  const n1 = await page.evaluate(() => window.__fp.acts.count('halt-tally'));
  check('X does the act on offer', n1 === n0 + 1, { n0, n1 });
  await sleep(1200);

  // the panel
  await press(page, 9); await sleep(300);
  s = await page.evaluate(() => { const a = document.activeElement, r = document.getElementById('settings-panel'); return { shown: !!window.__fp.settings?.shown, inPanel: !!a && r.contains(a) && a !== r, el: a?.id || a?.textContent?.slice(0, 30) }; });
  check('Start opens the panel, a control in it focused', s.shown && s.inPanel, s);
  h = await hints(page);
  check('the panel\'s keys line says the pad\'s buttons', /d-pad/.test(h.set), h.set);
  await shot(page, 4, 'panel-focus', 'desktop');
  const f0 = await page.evaluate(() => document.activeElement?.textContent);
  await press(page, 13);
  const f1 = await page.evaluate(() => document.activeElement?.textContent);
  check('d-pad down moves the focus', f1 !== f0, { f0, f1 });
  // a slider: left and right step it
  const vol = await page.evaluate(() => { const el = document.getElementById('set-volume'); el.focus(); return Number(el.value); });
  await press(page, 14);
  const vol1 = await page.evaluate(() => Number(document.getElementById('set-volume').value));
  check('d-pad left on the volume slider steps it down', vol1 < vol || vol === 0, { vol, vol1 });
  await press(page, 15);
  // down to a place (the map's marks, or the list's buttons), then A goes there
  const isPlace = () => { const a = document.activeElement; return !!a && !!a.closest('#set-places, #set-map, .set-map, [data-place], svg'); }; // the list's buttons, or the map's marks (v17.1 Q1)
  let steps = 0;
  while (steps < 80 && !(await page.evaluate(isPlace))) { await press(page, 13, 70); steps++; }
  const placeName = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 60));
  check('d-pad down reaches a place', await page.evaluate(isPlace), { steps, placeName });
  await press(page, 15, 90); // and across, to another
  await shot(page, 5, 'panel-place', 'desktop');
  const before = await page.evaluate(() => [window.__fp.player.pos.x, window.__fp.player.pos.z]);
  await press(page, 0); await sleep(400);
  s = await page.evaluate(() => ({ shown: !!window.__fp.settings?.shown, pos: [window.__fp.player.pos.x, window.__fp.player.pos.z], lockFailed: window.__fp.player.lockFailed }));
  check('A on a place goes there and shuts the panel', !s.shown && Math.hypot(s.pos[0] - before[0], s.pos[1] - before[1]) > 5, { ...s, before, placeName });
  // reopen; B shuts it
  await press(page, 9); await sleep(250);
  const re = await page.evaluate(() => !!window.__fp.settings?.shown);
  await press(page, 1); await sleep(250);
  s = await page.evaluate(() => ({ shown: !!window.__fp.settings?.shown, lockFailed: window.__fp.player.lockFailed, dragLook: window.__fp.player.dragLook }));
  check('B shuts the panel, and nothing fell back to drag-look', re && !s.shown && !s.lockFailed && !s.dragLook, { re, ...s });
  // the panel's own focus api, when it has one (v17.1 Q1: focusNext(dx, dy), activate()): asked first
  await press(page, 9); await sleep(250);
  await page.evaluate(() => { const st = window.__fp.settings; window.__api = []; st.focusNext = (dx, dy) => { window.__api.push(['move', dx, dy]); return true; }; st.activate = () => { window.__api.push(['act']); return true; }; document.getElementById('set-copypos').focus(); });
  await press(page, 13); await press(page, 14); await press(page, 0);
  s = await page.evaluate(() => { const st = window.__fp.settings, r = window.__api; delete st.focusNext; delete st.activate; return { calls: r, shown: st.shown }; });
  check('the panel\'s focusNext(dx, dy) and activate() are asked when present', JSON.stringify(s.calls) === JSON.stringify([['move', 0, 1], ['move', -1, 0], ['act']]) && s.shown, s);
  await press(page, 1); await sleep(250);
  // "Back to the moor" pressed with A: shut, with no capture asked
  await press(page, 9); await sleep(250);
  await page.evaluate(() => document.getElementById('set-close').focus());
  await press(page, 0); await sleep(1800);
  s = await page.evaluate(() => ({ shown: !!window.__fp.settings?.shown, lockFailed: window.__fp.player.lockFailed }));
  check('A on "Back to the moor" shuts the panel with no drag-look fallback', !s.shown && !s.lockFailed, s);

  // a key: the hints go back
  await atStroke(page);
  await page.evaluate(() => { const fp = window.__fp; for (const h of fp.acts.list || []) if (h.def.id === 'halt-tally') h.done = false; });
  await page.keyboard.press('KeyQ');
  await sleep(300);
  h = await hints(page);
  check('a key puts the keys back (title line, act\'s E)', /Space/.test(h.keys) && h.act === 'E', h);
  await waitFor(page, () => !!window.__fp.acts.offered, null, 4000);
  await shot(page, 6, 'offer-keys', 'desktop');

  // a non-standard pad: axes 0 and 1 walk, button 0 hops
  await page.evaluate(() => window.__unPad()); await sleep(300);
  await page.evaluate(() => window.__mkPad('', 'USB Joystick (Vendor: 0079 Product: 0006)'));
  await sleep(300);
  await page.evaluate(() => { const fp = window.__fp; fp.controls.placeAt(-40, 20); fp.player.yaw = 0.3; window.__pad.axes = [0, -1, 0, 0]; });
  await sleep(1000);
  s = await page.evaluate(() => ({ speed: window.__fp.player.speed }));
  await axes(page, [0, 0, 0, 0]); await sleep(500);
  const hn0 = await page.evaluate(() => window.__fp.player.hops);
  await press(page, 0);
  const hn1 = await page.evaluate(() => window.__fp.player.hops);
  check('a non-standard pad walks on axes 0 and 1 and hops on button 0', s.speed > 2.5 && hn1 === hn0 + 1, { ...s, hn0, hn1 });

  // disconnect: the polling stops
  await page.evaluate(() => window.__unPad()); await sleep(300);
  const p0 = await page.evaluate(() => window.__fp.gamepad.polls); await sleep(1000);
  s = await page.evaluate(() => ({ polls: window.__fp.gamepad.polls, polling: window.__fp.gamepad.pads, pad: window.__fp.gamepad.state() }));
  check('a disconnect stops the polling and lets go of the stick', s.polls === p0 && !s.polling && s.pad.x === 0 && s.pad.z === 0, { p0, ...s });
  await context.close();
}

// ------------------------------------------------------------------ phone size: the hints
{
  const { context, page } = await open({ width: 390, height: 844 });
  await sleep(1000);
  await page.evaluate(() => window.__mkPad());
  await waitFor(page, () => !!window.__fp.gamepad?.pads);
  await shot(page, 1, 'title-keys', 'phone');
  await axes(page, [0.6, 0, 0, 0]); await sleep(250); await axes(page, [0, 0, 0, 0]); await sleep(200);
  const h = await hints(page);
  check('phone size: the title\'s keys line turns to the pad\'s', /stick/.test(h.keys), h.keys);
  await shot(page, 2, 'title-pad', 'phone');
  await press(page, 9); await sleep(1500);
  await atStroke(page);
  await waitFor(page, () => !!window.__fp.acts.offered, null, 6000);
  await shot(page, 3, 'offer-pad', 'phone');
  await press(page, 9); await sleep(400);
  await press(page, 13); await press(page, 13);
  await shot(page, 4, 'panel-focus', 'phone');
  await context.close();
}

await browser.close();
const bad = errors.filter((e) => !/favicon|404/.test(e));
check('no page errors', bad.length === 0, bad.slice(0, 5));
const passed = checks.filter((c) => c[1]).length;
console.log(`\n${passed}/${checks.length} passed`);
process.exit(checks.length && passed === checks.length ? 0 : 1);
