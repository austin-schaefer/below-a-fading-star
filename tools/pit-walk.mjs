#!/usr/bin/env node
// The Pit walked by hand (v14-D2): a judge's tool, not a gate (the model: tools/coffin-walk.mjs). One page: press
// "Go out", click the view so the mouse is captured (headless Chromium refuses the capture: then the page's own
// fallback, drag to look, which this uses and says so), then hold W and steer with the mouse alone (moves read back
// from the page only to aim the next). `up`: from the floor where the passage comes in (bearing 20, by the wall), to
// the down-reel, round the Nadir to the stair's foot, up the road's slabs round the wall, over the landing and out
// onto the moor. `down`: from the moor at the road's end with no map, to the landing, down the slabs to the floor and
// the reel. At checkpoints it stops, looks and writes a frame. With `touch` it does the same on a phone-sized touch
// page with the stick only: one finger holds the stick up, a second drags to steer.
//   node tools/pit-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [up|down] [prefix=pit-walk]
// Frames go to shots/wip/<prefix>-<way>-<mode>-<q>-NN-<what>.png in order. Prints each frame with where the feet are and
// on what floor, the lowest the feet went, and a last line `walked: yes|no`.
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', q = 'low', way = 'up', prefix0 = 'pit-walk'] = process.argv.slice(2);
const prefix = `${prefix0}-${way}-${mode}-${q}`;
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&pos=${way === 'up' ? '203.2,176.2' : '176,170'}&yaw=${way === 'up' ? 2.8 : -0.9}`, { waitUntil: 'load', timeout: 120000 });
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
// the route, from the Pit's own plan (read only)
const route = await page.evaluate(async (way) => {
  const fp = window.__fp, P = fp.pit, S = P.stair, R = [], C = { x: 200, z: 185 };
  const push = (x, z, tag) => R.push({ x, z, tag });
  const dir = (b) => [Math.sin(b * Math.PI / 180), -Math.cos(b * Math.PI / 180)];
  const at = (b, r) => { const [dx, dz] = dir(b); return [C.x + dx * r, C.z + dz * r]; };
  const L = S.land, out = [C.x + L.dx * (L.r1 + 3), C.z + L.dz * (L.r1 + 3)], landEnd = [C.x + L.dx * (L.r1 - 0.3), C.z + L.dz * (L.r1 - 0.3)];
  const foot = S.point(1), footOff = at(S.footB + 4, S.at(1).r);
  const stairPts = []; for (let i = 1; i <= 19; i++) { const p = S.point(i / 20); stairPts.push([p[0], p[2], i]); }
  if (way === 'up') {
    { const [x, z] = at(26, 7.6); push(x, z, 'reel'); }
    { const [x, z] = at(330, 6.4); push(x, z); }
    { const [x, z] = at(285, 6.6); push(x, z, 'nadir'); }
    push(footOff[0], footOff[1]); push(foot[0], foot[2], 'foot');
    for (let i = stairPts.length - 1; i >= 0; i--) { const [x, z, k] = stairPts[i]; push(x, z, k === 14 ? 'stair-low' : k === 7 ? 'stair-mid' : k === 2 ? 'stair-high' : undefined); }
    { const p = S.point(0); push(p[0], p[2], 'head'); }
    push(landEnd[0], landEnd[1]); push(out[0], out[1], 'out');
  } else {
    push(C.x + L.dx * (L.r1 + 9) + 4, C.z + L.dz * (L.r1 + 9) - 2, 'moor'); push(out[0], out[1], 'landing-seen'); push(landEnd[0], landEnd[1]);
    { const p = S.point(0); push(p[0], p[2], 'head'); }
    for (const [x, z, k] of stairPts) push(x, z, k === 3 ? 'stair-high' : k === 10 ? 'stair-mid' : k === 17 ? 'stair-low' : undefined);
    push(foot[0], foot[2], 'foot'); push(footOff[0], footOff[1]);
    { const [x, z] = at(300, 6.6); push(x, z, 'nadir'); }
    { const [x, z] = at(345, 6.6); push(x, z); }
    { const [x, z] = at(40, 7.4); push(x, z, 'reel'); }
  }
  return R;
}, way);
const FOOT = await page.evaluate(() => { const p = window.__fp.pit.stair.point(0.97); return { x: p[0], z: p[2] }; });
if (way === 'up') await page.evaluate(() => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(203.2, 176.2); p.yaw = 2.8; p.pitch = 0; });
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
  reel: [['reel', 0, -0.1], ['up', 0, 0.9]], nadir: [['hole', 'C', -0.6], ['stair', 'F', 0.35]], foot: [['up', 0, 0.45]], // 'C': turn to the Nadir; 'F': to the stair's foot
  'stair-low': [['floor', -1.4, -0.45]], 'stair-mid': [['ahead', 0, 0.1], ['down', -1.5, -0.6]], 'stair-high': [['ahead', 0, 0.1]],
  head: [['landing', 0, 0]], out: [['moor', 0, 0], ['back', Math.PI, -0.35]], moor: [['pit', 0, -0.2]], 'landing-seen': [['landing', 0, -0.3]],
};
await shot('start');
await walkOn(true);
let i = 0, lowest = 99, stuck = 0, last = null;
const t0 = Date.now();
while (i < route.length && Date.now() - t0 < 25 * 60 * 1000) {
  const s = await st();
  const w = route[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (s.feet < lowest) lowest = s.feet;
  if (d < 0.6) {
    if (w.tag && LOOKS[w.tag]) for (const [what, dy0, dp] of LOOKS[w.tag]) await pause(async () => {
      const here = await st(), tgt = dy0 === 'C' ? { x: 200, z: 185 } : dy0 === 'F' ? FOOT : null;
      const dy = tgt ? wrap(Math.atan2(-(tgt.x - here.x), -(tgt.z - here.z)) - here.yaw) : dy0; await turn(dy, dp - (await st()).pitch); await sleep(1100); await shot(`${w.tag}-${what}`); await turn(-dy, -(await st()).pitch); await sleep(200); });
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
