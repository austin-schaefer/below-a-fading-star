#!/usr/bin/env node
// Every climbable ladder climbed by hand (v15-W2): a judge's tool, not a gate (the model: tools/village-walk.mjs). One
// page: press "Go out", click the view so the mouse is captured (if headless Chromium refuses, the page's drag-to-look
// fallback, and it says so). For each ladder in ctx.ladders that is climbable (or the ids given): the walker is set
// down on the floor 2.7 m out from its foot (the ascent's first point: the one teleport, between ladders), then holds
// W and steers with the mouse alone into its foot, holds W up it, is set on the floor at its head, turns round with the
// mouse, walks off the head (W) and holds W down it to the foot. Frames: at the foot, halfway up, at the head, on the
// floor at the top looking out, halfway down, back at the foot. With `touch` the same on a phone-sized touch page with
// the stick only: one finger holds the stick up, a second drags to steer.
//   node tools/ladder-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [prefix=v15-W2-ladders] [ids=all|a,b]
// Frames go to shots/wip/<prefix>-<mode>-<q>-<ladder>-NN-<what>.png in order. Prints each ladder's climb as it goes and
// a last line `climbed: n of m`; exits 1 unless every ladder went up and came down.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', q = 'low', prefix0 = 'v15-W2-ladders', ids0 = 'all'] = process.argv.slice(2);
const prefix = `${prefix0}-${mode}-${q}`, touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&music=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = touch ? 390 : 1280, H = touch ? 844 : 720;
let cdp = null;
if (touch) { cdp = await context.newCDPSession(page); await page.evaluate(() => { const b = document.getElementById('begin'); if (b) b.click(); }); }
else { await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin')))); await sleep(500); await page.mouse.click(W / 2, H / 2); }
await sleep(1200);
// (a capture asked for within about a second of the last let-go is refused: ask again once, after it)
if (!touch && !(await page.evaluate(() => !!document.pointerLockElement))) { await sleep(1700); await page.mouse.click(W / 2, H / 2); await sleep(800); }
const locked = await page.evaluate(() => !!document.pointerLockElement);
console.log(touch ? 'touch page' : `pointer captured: ${locked}${locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
const list = await page.evaluate(() => (window.__fp.ladders?.list || []).filter((d) => d.climb).map((d) => ({ id: d.id, foot: d.foot, top: d.top, head: d.head, n: d.n, take: d.take, path: window.__fp.ascents.list.find((a) => a.id === d.id)?.path })));
const want = ids0 === 'all' ? list : list.filter((d) => ids0.split(',').includes(d.id));
const st = (id) => page.evaluate((id) => { const p = window.__fp.player, L = window.__fp.ladders.get(id).state(); return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', carried: !!p.carried, ...L, locked: !!document.pointerLockElement }; }, id);

// ---- input: W or the stick; the look by the captured mouse or a drag
const SENS = touch ? 0.005 : 0.0021;
let stickDown = false;
async function walkOn(on, back = false) {
  if (!touch) { const k = back ? 'KeyS' : 'KeyW'; if (on) await page.keyboard.down(k); else { await page.keyboard.up('KeyW'); await page.keyboard.up('KeyS'); } return; }
  if (on && !stickDown) {
    const c = await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, x: c.x, y: c.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 3, x: c.x, y: c.y + (back ? 55 : -55) }] });
    stickDown = true;
  } else if (!on && stickDown) { stickDown = false; await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
}
let mx = W / 2, my = H / 2;
async function turn(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS;
  if (touch) {
    const was = stickDown, sx = 195, sy = 300, n = 6;
    if (was) await walkOn(false);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 7, x: sx, y: sy }] });
    for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 7, x: sx + px * i / n, y: sy + py * i / n }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (was) await walkOn(true);
    return;
  }
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (locked) { for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); } return; }
  mx = W / 2; my = H / 2; await page.mouse.move(mx, my); await page.mouse.down();
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  await page.mouse.up();
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let frame = 0, cur = '';
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${cur}-${String(frame).padStart(2, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st(cur);
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} ${s.carried ? `on the ladder t ${s.t.toFixed(2)}` : `on ${s.floor}`}`);
}
// walk (W, steering by the look) to (x, z); stop within r; give up after ms
async function walkTo(x, z, r = 0.35, ms = 25000, stop = null) {
  await walkOn(true); const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await st(cur);
    if (stop && stop(s)) break;
    const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz);
    if (d < r) break;
    const dy = wrap(Math.atan2(-dx, -dz) - s.yaw);
    if (Math.abs(dy) > 0.03) await turn(dy, -s.pitch * 0.5);
    await sleep(80);
  }
  await walkOn(false);
}
// hold the key until fn(state) (or ms), framing once at the halfway rung
async function hold(back, until, ms, half, halfWhat) {
  await walkOn(true, back); const t0 = Date.now(); let framed = false, s;
  while (Date.now() - t0 < ms) {
    s = await st(cur);
    if (!framed && half(s)) { framed = true; await walkOn(false); await sleep(300); await shot(halfWhat); await walkOn(true, back); }
    if (until(s)) break;
    await sleep(60);
  }
  await walkOn(false);
  return s;
}

let ok = 0;
for (const L of want) {
  cur = L.id; frame = 0;
  const [fx, fz, fy] = L.path[0], Hh = L.top[2] - L.foot[2];
  const yaw = Math.atan2(-L.n[0], -L.n[1]);
  await page.evaluate(([x, z, y, yaw]) => { const fp = window.__fp; fp.controls.placeAt(x, z, y); fp.player.yaw = yaw; fp.player.pitch = 0; }, [fx, fz, fy, yaw]);
  await sleep(1500);
  await shot('start');
  const c0 = (await st(cur)).climbs;
  // into its foot, and up: W held until set down at the top
  await walkTo(L.take[0], L.take[1], 0.05, 12000, (s) => s.carried);
  let s = await st(cur);
  if (!s.carried) { await walkOn(true); await sleep(800); await walkOn(false); s = await st(cur); }
  const took = s.climbs > c0;
  console.log(`${L.id}: ${took ? 'took hold at the foot' : 'did NOT take hold'} (feet ${s.feet.toFixed(2)})`);
  if (took) await shot('foot');
  s = await hold(false, (q) => !q.carried && q.feet > L.top[2] - 0.3, 20000 + Hh * 1200, (q) => q.carried && q.t > Hh / 2, 'half-up');
  const up = !s.carried && Math.abs(s.feet - L.top[2]) < 0.3;
  console.log(`${L.id}: ${up ? 'up' : 'NOT up'}, feet ${s.feet.toFixed(2)} on ${s.floor} (want ${L.top[2].toFixed(2)})`);
  await sleep(600); await shot('head');
  // look out from the top: turn round, a little down
  await turn(Math.PI * 0.8, -0.25); await sleep(900); await shot('top-view');
  // and down: walk off the head the way the ladder is (facing out), W held
  const back = await st(cur), wantYaw = Math.atan2(L.n[0], L.n[1]); // facing away from the wall
  await turn(wrap(wantYaw - back.yaw), -back.pitch); await sleep(300);
  const c1 = (await st(cur)).climbs;
  await walkTo(L.head[0] - L.n[0] * 0.6, L.head[1] - L.n[1] * 0.6, 0.05, 6000, (q) => q.carried);
  s = await st(cur);
  const tookDown = s.climbs > c1;
  console.log(`${L.id}: ${tookDown ? 'took hold at the head' : 'did NOT take hold at the head'}`);
  s = await hold(false, (q) => !q.carried && Math.abs(q.feet - L.foot[2]) < 0.4, 20000 + Hh * 1200, (q) => q.carried && q.t < Hh / 2, 'half-down');
  const down = !s.carried && Math.abs(s.feet - L.foot[2]) < 0.4;
  console.log(`${L.id}: ${down ? 'down' : 'NOT down'}, feet ${s.feet.toFixed(2)} on ${s.floor}`);
  await sleep(600); await turn(Math.PI, 0.15); await sleep(800); await shot('foot-again');
  if (took && up && tookDown && down) ok++;
}
console.log(`page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
console.log(`climbed: ${ok} of ${want.length}`);
await browser.close();
process.exit(ok === want.length && want.length > 0 && !errors.length ? 0 : 1);
