#!/usr/bin/env node
// The Wellward Way walked (v14-D1): a judge's tool, not a gate (the model: tools/coffin-walk.mjs). One page: press
// "Go out" on the hall's road by the Nave's south door, click the view so the mouse is captured (new headless
// Chromium grants it; if refused, the page's drag-to-look fallback, and it says so), then hold W and steer with the
// mouse alone (moves read back from the page only to aim the next) through the door, down the Line, the Flute,
// across the Laid Sun, over the Gulf, down the Gate and out onto the Pit's floor; then back the whole way to the door.
// A frame about every 10 m looking where the walker goes, and at five points a look back and up. With `touch`, the
// same on a phone-sized touch page with the stick only: one finger holds the stick up, a second drags to steer.
//   node tools/passage-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [prefix=passage-walk] [there|both]
// Frames go to shots/wip/<prefix>-<mode>-<q>-NN-<what>.png in order. Prints each frame with where the feet are, on
// what floor and how far below; the lowest the feet went under the plan's floor; and a last line `walked: yes|no`.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', q = 'low', prefix0 = 'passage-walk', legs = 'both'] = process.argv.slice(2);
const prefix = `${prefix0}-${mode}-${q}`;
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ channel: 'chromium', args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&pos=262,6&yaw=3.0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = touch ? 390 : 1280, H = touch ? 844 : 720;
let cdp = null;
if (touch) {
  cdp = await context.newCDPSession(page);
  await page.evaluate(() => { const b = document.getElementById('begin'); if (b) b.click(); });
} else {
  await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
  await sleep(500);
  await page.mouse.click(W / 2, H / 2);
}
await sleep(1200);
// stand on the hall's road by the south door, facing the door (a teleport to the start only: the walk itself is on the input)
await page.evaluate(async () => { const fp = window.__fp, CR = await import('/src/v14/coffin-road/plan.js'); fp.controls.placeAt(CR.DOOR.x, CR.DOOR.z - 2.2, CR.ROAD_Y + 0.02); fp.player.yaw = Math.PI; fp.player.pitch = 0; });
await sleep(1500);
const st = () => page.evaluate(() => { const fp = window.__fp, p = fp.player, P = fp.passage.plan, f = P.floor(p.pos.x, p.pos.z); return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', below: fp.below?.here ?? 0, locked: !!document.pointerLockElement, plan: f, s: P.near(p.pos.x, p.pos.z, { i: 0, s: 0, d: 0, e: 0, t: 0 }).s }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${s0.locked}${s0.locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
// the route from the plan (read only): the door, every 10 m, the room's middle, the bridge's ends, out onto the floor
const route = await page.evaluate(() => {
  const P = window.__fp.passage.plan, SP = P.SP, R = [];
  const push = (s, tag, look) => { const a = P.at(Math.min(P.L, s)); R.push({ x: a.x, z: a.z, s, tag, look }); };
  R.push({ x: P.X[0], z: 56.4, s: -5, tag: 'door' });
  for (let s = 0; s <= P.L - 1; s += 10) push(s, `s${String(Math.round(s)).padStart(3, '0')}`);
  for (const [s, tag] of [[SP.LINE + 0.5, 'flute-begins'], [SP.SUN - SP.RC + 0.5, 'room-in'], [SP.SUN, 'room'], [SP.GULF0 + 0.5, 'bridge'], [SP.GULF1 + 0.3, 'bridge-end'], [P.L - 0.5, 'mouth']]) push(s, tag);
  R.sort((a, b) => a.s - b.s);
  const out = { x: P.M[0] + P.IN[0] * 4, z: P.M[1] + P.IN[1] * 4, s: P.L + 4, tag: 'pit-floor' };
  R.push(out);
  // looks: back and up at five points
  for (const r of R) if (['s010', 'flute-begins', 'room', 'bridge-end', 'pit-floor'].includes(r.tag)) r.look = true;
  return R;
});
const full = legs === 'there' ? route : [...route, ...route.slice(0, -1).reverse().map((r) => ({ ...r, tag: r.tag + '-back', look: false }))];
const SENS = touch ? 0.005 : 0.0021;
const touchPts = (pts) => pts.map(([id, x, y]) => ({ id, x, y }));
let stickDown = false, stickHome = null;
async function walkOn(on) {
  if (!touch) { if (on) await page.keyboard.down('KeyW'); else await page.keyboard.up('KeyW'); return; }
  if (on && !stickDown) {
    stickHome = await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y - 55 }] });
    stickDown = true;
  } else if (!on && stickDown) {
    stickDown = false;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
}
async function lookTouch(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, was = stickDown, sx = 195, sy = 300, n = 6;
  if (was) await walkOn(false);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPts([[7, sx, sy]]) });
  for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPts([[7, sx + px * i / n, sy + py * i / n]]) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (was) await walkOn(true);
}
let mx = W / 2, my = H / 2;
async function lookKeys(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (locked) { for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); } return; }
  mx = W / 2; my = H / 2; await page.mouse.move(mx, my); await page.mouse.down();
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  await page.mouse.up();
}
const turn = touch ? lookTouch : lookKeys;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let frame = 0, lowest = 0;
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(2, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st();
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) s ${s.s.toFixed(1)} feet ${s.feet.toFixed(2)} on ${s.floor}, below ${s.below.toFixed(2)}`);
}
async function pause(fn) { await walkOn(false); await sleep(400); await fn(); await walkOn(true); }
await shot('start');
await walkOn(true);
let i = 0, stuck = 0, last = null;
const t0 = Date.now();
while (i < full.length && Date.now() - t0 < 30 * 60 * 1000) {
  const s = await st();
  const w = full[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (s.plan !== null && s.floor === 'passage') lowest = Math.min(lowest, s.feet - s.plan);
  if (d < 0.7) {
    // the frame where the walker is going: face the next point first
    const nx = full[Math.min(full.length - 1, i + 1)], fy = wrap(Math.atan2(-(nx.x - s.x), -(nx.z - s.z)) - s.yaw);
    await pause(async () => {
      if (i + 1 < full.length) await turn(fy, -(await st()).pitch);
      await sleep(900); await shot(w.tag);
      if (w.look) { await turn(Math.PI, 0.5 - (await st()).pitch); await sleep(1000); await shot(`${w.tag}-backup`); await turn(-Math.PI, -(await st()).pitch); await sleep(300); }
    });
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dy = wrap(want - s.yaw);
  if (Math.abs(dy) > (touch ? 0.06 : 0.02)) await turn(dy, -s.pitch * 0.5);
  await sleep(d < 2 ? 60 : 120);
  if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for ${i} (${w.tag})`); break; } } else stuck = 0;
  last = s;
}
await walkOn(false);
const walked = i >= full.length;
console.log(`lowest feet under the plan's floor: ${lowest.toFixed(2)}; page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
console.log(`walked: ${walked ? 'yes' : 'no'}`);
await browser.close();
process.exit(walked && !errors.length ? 0 : 1);
