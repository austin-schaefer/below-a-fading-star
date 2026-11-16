#!/usr/bin/env node
// The Quarrels walked by hand (v15-Q1): tools/village-walk.mjs with the crown's own route (the plan's QUARRELS_ROUTE:
// the causeway's end, the strip past the slab's toe, the square, the quarry, the Drag, the hand, the new house; back to
// the stair's head; back to the causeway's end). Hold W and steer with the mouse, or with `touch` one finger on the
// stick and a second dragging to look. A judge's tool, not a gate.
//   node tools/quarrels-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [every=0] [prefix=v15-Q1-walk]
// Frames go to shots/wip/<prefix>-<mode>-<q>-NNN-<what>.png. Prints a last line `walked: yes|no`.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', q = 'low', every0 = '0', prefix0 = 'v15-Q1-walk'] = process.argv.slice(2);
const every = +every0;
const prefix = `${prefix0}-${mode}-${q}`;
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&pos=44.5,-9.6&yaw=-1.5`, { waitUntil: 'load', timeout: 120000 });
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
const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', carried: !!p.carried, climbs: window.__fp.lappet.built['rungs-ladder'].state().climbs, locked: !!document.pointerLockElement }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${s0.locked}${s0.locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
// the route: the plan's own QUARRELS_ROUTE from the causeway's end to the new house, back to the stair's head, and
// back to the causeway's end
const route = await page.evaluate(async () => {
  const P = await import('/src/v15/plan.js'), R = P.QUARRELS_ROUTE.map(([x, z], i) => ({ x, z, tag: i === 0 ? 'causeway-end' : i === P.QUARRELS_ROUTE.length - 1 ? 'new-house' : undefined }));
  const back = P.QUARRELS_ROUTE.slice(0, -1).reverse(), head = P.at(1, P.STAIR.s, -5.6), k = back.findIndex(([x, z]) => Math.hypot(x - head[0], z - head[1]) < 6.5);
  back.forEach(([x, z], i) => { R.push({ x, z }); if (i === k) { R.push({ x: head[0], z: head[1], tag: 'stair-head' }); R.push({ x, z }); } });
  R[R.length - 1].tag = 'causeway-end-back';
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
  const f = `shots/wip/${prefix}-${String(frame).padStart(3, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st();
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.carried ? 'the ladder' : s.floor}`);
}
async function pause(fn) { await walkOn(false); await sleep(400); await fn(); await walkOn(true); }
// at a checkpoint: what to look at, as turns from the walking direction (yaw, pitch)
const LOOKS = {
  'new-house': [['back', Math.PI, 0.1]], 'stair-head': [['saint', Math.PI, 0.2], ['down-the-notch', 0, -0.3]], 'causeway-end-back': [['back', Math.PI, 0.1]],
};
const LOOKS_VILLAGE = {
  court: [['down-the-stair', 0, -0.25]], head: [['over', 0, -0.5]], 'head-flight': [['ahead', 0, -0.3]], slot: [['down', 0, -0.45]], 'upper-flight': [['ahead', 0, -0.35]],
  landing: [['timber', 0, -0.4], ['back', Math.PI, 0.5]], timber: [['ahead', 0, -0.4]], bastion: [['square', 0, -0.25], ['back', Math.PI, 0.45]], 'foot-flight': [['ahead', 0, -0.2]], square: [['back', Math.PI, 0.35]],
  'ramp-head': [['down', 0, -0.2]], ramp: [['ahead', 0, -0.1]], 'ramp-foot': [['back', Math.PI, 0.15]], 'house-wall': [['wall', 0, 0.1], ['back', Math.PI, 0.3]], bench: [['tube', 1.2, 0.2]],
  'tube-foot': [['mouth', 0, 0.35]], 'tube-low': [['up', 0, 0.5]], 'tube-mid': [['up', 0, 0.5], ['back', Math.PI, -0.5]], breach: [['out', -1.4, 0]], gangway: [['along', 0, 0], ['back', Math.PI, 0]],
  'mid-rung': [['ladder', 0, 0]], 'ladder-foot': [['back', Math.PI, 0.6]], 'ladder-top': [['back', Math.PI, -0.5]], 'tube-high': [['up', 0, 0.5]], 'tube-top': [['back', Math.PI, -0.5], ['ahead', 0, 0]],
  'head-flight-up': [['ahead', 0, 0.3]], crown: [['house', Math.PI, -0.3]], corner: [['back', Math.PI, -0.1]],
};
await shot('start');
await walkOn(true);
let i = 0, stuck = 0, last = null, since = 0, side = 1, climbs = 0;
const t0 = Date.now();
const onWay = (s) => s.carried || (s.floor !== 'ground' && !/^lappet-(crown|high|mid|low|bench)/.test(s.floor));
while (i < route.length && Date.now() - t0 < 30 * 60 * 1000) {
  const s = await st();
  const w = route[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (s.climbs !== climbs) { climbs = s.climbs; console.log(`took hold of the ladder at feet ${s.feet.toFixed(2)} (${climbs})`); }
  if (last && onWay(s)) since += Math.hypot(s.x - last.x, s.feet - last.feet, s.z - last.z);
  if (every > 0 && since >= every) {
    since = 0; side = -side;
    await pause(async () => { const p0 = (await st()).pitch; await turn(side * 0.55, 0); await sleep(700); await shot(`m-${s.carried ? 'ladder' : s.floor}`); await turn(-side * 0.55, p0 - (await st()).pitch); await sleep(150); });
  }
  if (d < 0.6) {
    if (w.tag && LOOKS[w.tag]) for (const [what, dy, dp] of LOOKS[w.tag]) await pause(async () => { await turn(dy, dp - (await st()).pitch); await sleep(1100); await shot(`${w.tag}-${what}`); await turn(-dy, -(await st()).pitch); await sleep(200); });
    else if (w.tag) console.log(`[at] ${w.tag} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.carried ? 'the ladder' : s.floor}`);
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dy = wrap(want - s.yaw);
  if (Math.abs(dy) > (touch ? 0.06 : 0.02)) await turn(dy, -s.pitch * 0.5);
  await sleep(d < 2 ? 60 : 120);
  if (last && Math.hypot(s.x - last.x, s.z - last.z, s.feet - last.feet) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor} heading for ${i} ${w.tag || ''} (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`); break; } } else stuck = 0;
  last = s;
}
await walkOn(false);
const walked = i >= route.length;
console.log(`ladder taken ${climbs} times; page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
console.log(`walked: ${walked ? 'yes' : 'no'}`);
await browser.close();
process.exit(walked && !errors.length ? 0 : 1);
