#!/usr/bin/env node
// The Noon Road walked by hand (v14-D0, D3): a judge's tool, not a gate (the model: tools/span-walk.mjs). One page:
// press "Go out", click the view so the mouse is captured (headless Chromium refuses the capture: then the page's own
// fallback, drag to look, which this uses and says so), then hold W and steer with the mouse alone (moves read back
// from the page only to aim the next) from the trod north of the Foundered Nave (262, 6) to the shears,
// over the landing, down the stair, across the raft and the north spur, east along the road to the sun on the east
// wall, back west, down the pitched carrier to the south door's sill and in through it, up the stair and out onto the moor again. At checkpoints it stops, looks and writes a frame. With
// `touch` it does the same on a phone-sized touch page with the stick only: one finger holds the stick up, a second
// drags to steer.
//   node tools/noon-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [prefix=noonroad-walk]
// Frames go to shots/wip/<prefix>-<mode>-<q>-NN-<what>.png in order. Prints each frame with where the feet are and
// on what floor, the lowest the feet went, and a last line `walked: yes|no`.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', q = 'low', prefix0 = 'noonroad-walk'] = process.argv.slice(2);
const prefix = `${prefix0}-${mode}-${q}`;
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', below: window.__fp.below?.here ?? 0, locked: !!document.pointerLockElement }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${s0.locked}${s0.locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
// the route, from the road's own plan (read only)
const route = await page.evaluate(async () => {
  const P = await import('/src/v14/coffin-road/plan.js'), h = window.__fp.coffinRoad.head, R = [];
  const push = (x, z, tag) => R.push({ x, z, tag });
  push(270, 22, 'shears-seen'); push(281, 40); push(h.xLand + 6, P.SZ, 'shears'); push(h.xLand + 0.5, P.SZ); push(h.xHead + 0.3, P.SZ, 'head');
  push((h.xHead + P.FOOT_X) / 2, P.SZ, 'stair-mid'); push(P.FOOT_X - 0.6, P.SZ, 'foot'); push(246.7, 45, 'spur'); push(246.7, 42);
  push(262, 42, 'under-hole'); push(278, 42, 'under-roof'); push(P.ROAD.x1 - 0.6, 42, 'sun');
  push(250, 42, 'back'); push(246.7, 45); push(246.7, 47.75); push(246.7, 53.6, 'sill'); push(246.7, 56.3, 'inside'); push(246.7, 53.2); push(246.7, 48); push(P.FOOT_X + 0.5, P.SZ, 'up'); push(h.xHead - 2, P.SZ); push(h.xLand + 4, P.SZ, 'out');
  return R;
});
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
let frame = 0;
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(2, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st();
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor}, below ${s.below.toFixed(2)}`);
}
async function pause(fn) { await walkOn(false); await sleep(400); await fn(); await walkOn(true); }
// at a checkpoint: what to look at, as turns from the walking direction (yaw, pitch)
const LOOKS = {
  'shears-seen': [['shears', 0, 0.05]], shears: [['landing', 0, -0.15]], head: [['down', 0, -0.6]],
  'stair-mid': [['hall', 0, -0.3], ['up', Math.PI, 0.6]], foot: [['raft', 0, -0.2], ['door', -1.57, 0]],
  spur: [['road', 0, -0.05]], 'under-hole': [['ahead', 0, 0], ['up', 0, 0.8]], 'under-roof': [['ahead', 0, 0.05], ['back', Math.PI, 0.05]],
  sun: [['sun', 0, 0.35]], sill: [['door', 0, 0.05]], inside: [['fall', 0, 0], ['back', Math.PI, 0.05]], back: [['door', Math.PI / 2, 0]], up: [['stair', 0, 0.45]], out: [['moor', 0, 0]],
};
await shot('start');
await walkOn(true);
let i = 0, lowest = 99, stuck = 0, last = null;
const t0 = Date.now();
while (i < route.length && Date.now() - t0 < 25 * 60 * 1000) {
  const s = await st();
  const w = route[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (s.feet < lowest) lowest = s.feet;
  if (s.floor === 'nave-water') console.log(`in the water at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for ${i}`);
  if (d < 0.6) {
    if (w.tag && LOOKS[w.tag]) for (const [what, dy, dp] of LOOKS[w.tag]) await pause(async () => { await turn(dy, dp - (await st()).pitch); await sleep(1100); await shot(`${w.tag}-${what}`); await turn(-dy, -(await st()).pitch); await sleep(200); });
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dy = wrap(want - s.yaw);
  if (Math.abs(dy) > (touch ? 0.06 : 0.02)) await turn(dy, -s.pitch * 0.5);
  await sleep(d < 2 ? 60 : 120);
  if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for ${i} (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`); break; } } else stuck = 0;
  last = s;
}
await walkOn(false);
const walked = i >= route.length;
console.log(`lowest feet: ${lowest.toFixed(2)}; page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
console.log(`walked: ${walked ? 'yes' : 'no'}`);
await browser.close();
process.exit(walked && !errors.length ? 0 : 1);
