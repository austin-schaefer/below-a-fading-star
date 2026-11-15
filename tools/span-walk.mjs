#!/usr/bin/env node
// The Span crossed by hand (v12-H1): a judge's tool, not a gate. One page: press "Go out", click the view so the mouse
// is captured (headless Chromium refuses the capture: then the page's own fallback, drag to look, which this uses and
// says so), then hold W and steer with the mouse alone (mouse moves, read back from the page only to aim the next
// one) from the west stair's foot (-205, 200) up the stair, along the deck, over the three fallen bays on their ways
// and the crack on its coping, to the east stair's foot. At checkpoints it stops, looks (ahead, down, back) and writes a
// frame; then it steps off each way once (strafing) and says where the walker lands. With `touch` it does the same
// crossing on a phone-sized touch page with the stick only: one finger holds the stick up, a second drags to steer.
//   node tools/span-walk.mjs [base=http://localhost:8123] [keys|touch] [prefix=h1r2-06]
// Frames go to shots/wip/<prefix>-NN-<what>.png in order. Prints the route's progress, each frame, the falls and a
// last line `crossed: yes|no`.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', prefix = 'h1r2-06'] = process.argv.slice(2);
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=low&pos=-205,200&yaw=1.57`, { waitUntil: 'load', timeout: 120000 });
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
const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, ground: p.onGround, locked: !!document.pointerLockElement }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${s0.locked}${s0.locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
// the route, built from the page's own plan (read only)
const route = await page.evaluate(() => {
  const S = window.__fp.span, ways = S.vestiges, C = S.crackWay, R = [];
  const push = (x, z, tag) => R.push({ x, z, tag });
  for (const [x, z] of [[-205, 200], [-236, 200], [-239.5, 197], [-239.5, 193], [-236, 193], [-208, 193], [-204.5, 190], [-204.5, 186], [-208, 186], [-243, 186], [-246.5, 186], [-246.5, 207], [-246.5, 212]]) push(x, z);
  const way = (v, tag) => { push(v.a - 12, v.zc(v.a)); push(v.a - 2, v.zc(v.a), tag + '-lip'); for (let x = v.a; x <= v.b; x += 2) push(x, v.zc(x), Math.abs(x - (v.a + v.b) / 2) < 1 ? tag + '-mid' : null); push(v.b + 4, v.zc(v.b), tag + '-over'); };
  push(-200, 213, 'deck-west'); way(ways[0], 'west');
  push(C.x0 - 8, C.zc(C.x0)); push(C.x0 - 1, C.zc(C.x0), 'crack-lip'); for (let x = C.x0; x <= C.x1; x += 1) push(x, C.zc(x), Math.abs(x - (C.x0 + C.x1) / 2) < 0.5 ? 'crack-mid' : null); push(C.x1 + 3, C.zc(C.x1));
  push(-10, 215); way(ways[1], 'fen');
  push(75, 214, 'streamer'); push(84, 214.5, 'camp'); push(100, 214, 'view-west');
  way(ways[2], 'river');
  for (const [x, z] of [[200, 214], [243, 213], [243, 209], [239, 206], [239, 201], [239, 170], [235, 165], [232, 166], [232, 198], [228, 202], [225, 200], [225, 167], [225, 161]]) push(x, z);
  R[R.length - 1].tag = 'east-foot';
  return R;
});
// look: turn the view by (dyaw, dpitch) radians with the mouse (or a drag on touch)
const SENS = touch ? 0.005 : 0.0021;
async function look(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS;
  if (touch) { // the thumb comes off the stick, the finger drags the look, the thumb goes back on (one finger at a time)
    const was = stickDown, sx = 195, sy = 300, n = 6;
    if (was) await walkOn(false);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPts([[7, sx, sy]]) });
    for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPts([[7, sx + px * i / n, sy + py * i / n]]) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (was) await walkOn(true);
    return;
  }
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 200));
  for (let i = 0; i < n; i++) await page.mouse.move(W / 2 + px / n * (i + 1), H / 2 + py / n * (i + 1));
  await page.mouse.move(W / 2, H / 2); // (back to centre: the move back is read as a look too, so undo it below)
}
// with the pointer captured a move back to centre turns the view back; so keys mode moves from a running position
let mx = W / 2, my = H / 2;
async function lookKeys(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (locked) { for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); } return; }
  // the capture was refused (headless Chromium refuses it): the page's own fallback, drag to look with the button held
  mx = W / 2; my = H / 2; await page.mouse.move(mx, my); await page.mouse.down();
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  await page.mouse.up();
}
// the stick held (touch): one finger down at the ring's home, pushed straight up
let stickDown = false, stickHome = null, held = [];
const touchPts = (pts) => pts.map(([id, x, y]) => ({ id, x, y }));
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
const turn = touch ? look : lookKeys;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let frame = 0;
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(2, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st();
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)}`);
}
async function pause(fn) { await walkOn(false); await sleep(400); await fn(); await walkOn(true); }
// checkpoints: what to look at, as turns from the walking direction (yaw, pitch), then back
const LOOKS = {
  'deck-west': [['ahead', 0, 0]],
  'west-lip': [['first-sight', 0, -0.3]],
  'west-mid': [['ahead', 0, -0.15], ['down', 0.5, -1.1], ['back', Math.PI, -0.1]],
  'crack-lip': [['coping', 0, -0.4]],
  'crack-mid': [['down', -0.6, -1.0]],
  'fen-lip': [['first-sight', 0, -0.3]],
  'fen-mid': [['ahead', 0, -0.3], ['down', -0.5, -1.1], ['back', Math.PI, -0.1]],
  'streamer': [['streamer', -0.5, 0.05]],
  'camp': [['camp', 0.6, -0.25]],
  'view-west': [['view-west', Math.PI, 0.02]],
  'river-lip': [['first-sight', 0, -0.35]],
  'river-mid': [['ahead', 0, -0.2], ['down', 0.3, -1.15], ['back', Math.PI, -0.15], ['stub', -0.7, 0.1]],
  'river-over': [['over', Math.PI, -0.2]],
  'east-foot': [['east-foot', 0, 0]],
};
await shot('west-foot');
await walkOn(true);
let i = 0, ticks = 0, lowest = 99, lastIdx = -1, stuck = 0, last = null;
const t0 = Date.now();
while (i < route.length && Date.now() - t0 < 25 * 60 * 1000) {
  const s = await st();
  const w = route[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (s.feet < lowest && s.x > -240 && s.x < 240) lowest = s.feet;
  if (Math.abs(s.x) < 200 && s.feet < 50) { console.log(`fell at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for ${i}`); break; }
  if (d < 0.6) {
    if (w.tag && LOOKS[w.tag]) for (const [what, dy, dp] of LOOKS[w.tag]) await pause(async () => { await turn(dy, dp - (await st()).pitch); await sleep(900); await shot(`${w.tag.split('-')[0]}-${what}`); await turn(-dy, -(await st()).pitch); await sleep(200); });
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dy = wrap(want - s.yaw);
  if (Math.abs(dy) > (touch ? 0.06 : 0.02)) await turn(dy, -s.pitch * 0.5);
  // slow the walk near a lip and on the ways: short presses (a careful visitor), so the steering keeps up
  await sleep(d < 2 ? 60 : 120);
  if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for ${i} (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`); break; } } else stuck = 0;
  last = s; ticks++;
  if (i !== lastIdx && i % 10 === 0) { console.log(`  waypoint ${i}/${route.length} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)}`); lastIdx = i; }
}
await walkOn(false);
const crossed = i >= route.length;
console.log(`lowest feet on the deck and the ways: ${lowest.toFixed(2)}`);
// the falls: from the middle of each way, strafe off its side (A), and see where the walker lands
const falls = [];
if (crossed && !touch) {
  const ways = await page.evaluate(() => window.__fp.span.vestiges.map((v) => ({ name: v.name, x: (v.a + v.b) / 2 })).concat([{ name: 'crack', x: window.__fp.span.crackWay.x0 + 1.5 }]));
  for (const v of ways) {
    await page.evaluate((v) => { const S = window.__fp.span, w = v.name === 'crack' ? S.crackWay : S.vestiges.find((q) => q.name === v.name); window.__fp.controls.placeAt(v.x, w.zc(v.x)); const p = window.__fp.player; p.pos.y = w.y(v.x) + p.eye; p.vy = 0; p.yaw = -Math.PI / 2; p.pitch = 0; }, v);
    await sleep(800);
    await page.keyboard.down('KeyA'); await sleep(700); await page.keyboard.up('KeyA'); // north, off the side
    await lookKeys(0, -1.0);
    let s = await st(), n = 0;
    while (n++ < 60 && !(s.ground && s.feet < 50)) { await sleep(150); s = await st(); }
    await sleep(500);
    await shot(`fall-${v.name}-landed`);
    s = await st();
    const g = await page.evaluate(([x, z]) => window.__fp.terrain.heightAt(x, z), [s.x, s.z]);
    falls.push({ way: v.name, x: +s.x.toFixed(1), z: +s.z.toFixed(1), feet: +s.feet.toFixed(2), ground: +g.toFixed(2), onGround: s.ground });
    await lookKeys(0, 1.0);
  }
}
for (const f of falls) console.log(`fall from the ${f.way} way: landed at (${f.x}, ${f.z}), feet ${f.feet} (terrain ${f.ground}), on the ground ${f.onGround}`);
if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
console.log(`crossed: ${crossed ? 'yes' : 'no'}`);
await browser.close();
process.exit(crossed ? 0 : 1);
