#!/usr/bin/env node
// The lift ridden by hand (v12-H4): a judge's tool, not a gate. One page, real input only after the load: press "Go out",
// click the view so the mouse is captured (headless Chromium refuses the capture: then the page's own fallback, drag to
// look), then walk with W and steer with the mouse alone from the path below the lower station, up its stair to the
// bell, ring it (E), and watch the carriage come down the cliff (the look turned up to it by the mouse, as a visitor
// would follow it); walk into the cage, throw the lever (E), and ride up with no look input (the carrier turns the view);
// walk out over the gangway and along the gallery to the odd cell and the ragged end; walk back, ride down, step out.
// Frames at 0.3, 1, 2 and 5 s after each press and every 5 s after, on the page's own clock, and at the places that
// matter. With `touch` the same on a phone-sized touch page: the stick to walk, a drag to look, a tap on the offer.
//   node tools/lift-walk.mjs [base=http://localhost:8123] [keys|touch] [prefix=h4-10] [q=low]
// Frames go to shots/wip/<prefix>-NN-<what>.png in order. Prints each frame with the page time, the carriage's s and
// state, and a last line `rode: yes|no`.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', prefix = 'h4-10', q = 'low'] = process.argv.slice(2);
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
// the start: on the path 22 m east of the station's stair, looking west at it (the frame is read from a first load's plan)
await page.goto(`${base}/?q=${q}&pos=-264,-18&yaw=1.57`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.lift, null, { timeout: 300000 });
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
const st = () => page.evaluate(() => { const fp = window.__fp, p = fp.player, L = fp.lift; return { x: p.pos.x, z: p.pos.z, y: p.pos.y, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, ground: p.onGround, carried: p.carried, locked: !!document.pointerLockElement, t: L.t, s: L.s, where: L.where(), ridden: L.ridden, moving: L.moving, offered: fp.acts.offered?.def?.id || null }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${locked}${locked ? '' : " (refused: steering by the page's drag-to-look fallback)"}`);
const plan = await page.evaluate(() => {
  const L = window.__fp.lift, C0 = L.C0, S = L.station, io = L.io, al = L.al;
  const toW = (x, z) => ({ x: C0.x + al.x * x + io.x * z, z: C0.z + al.z * x + io.z * z });
  const odd = L.gal.odd;
  return {
    stairFoot: toW(0, S.STAIR.z1 + 2), stairTop: toW(0, S.PLAT.z1 - 0.8), plat: toW(0, S.PLAT.z0 + 1.6), cageIn: toW(0.2, -0.2),
    bell: L.stand.foot(), bellTop: L.stand.top(), cg: { x: L.CG.x, z: L.CG.z },
    gangWest: (() => { const g = L.gal.landing; return { x: g.x - 1.2 * io.x, z: g.z - 1.2 * io.z }; })(), io: { x: io.x, z: io.z },
    gal: L.gal.path.map(([x, z]) => ({ x, z })),
    oddFront: { x: odd.c.x + odd.n.x * 3.6 + odd.u.x * 1.4, z: odd.c.z + odd.n.z * 3.6 + odd.u.z * 1.4 }, oddC: { x: odd.bore.x, z: odd.bore.z, y: odd.bore.y }, coin: { x: odd.coin.x, z: odd.coin.z },
    end: L.gal.end,
  };
});
// ---- input
const SENS = touch ? 0.005 : 0.0021;
let mx = W / 2, my = H / 2;
async function lookKeys(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (locked) { for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); } return; }
  mx = W / 2; my = H / 2; await page.mouse.move(mx, my); await page.mouse.down();
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  await page.mouse.up();
}
let stickDown = false, stickHome = null;
async function lookTouch(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, was = stickDown, sx = 195, sy = 300, n = 6;
  if (was) await walkOn(false);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 7, x: sx, y: sy }] });
  for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 7, x: sx + px * i / n, y: sy + py * i / n }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (was) await walkOn(true);
}
const turn = touch ? lookTouch : lookKeys;
async function walkOn(on) {
  if (!touch) { if (on) await page.keyboard.down('KeyW'); else await page.keyboard.up('KeyW'); return; }
  if (on && !stickDown) {
    stickHome = await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y - 40 }] });
    stickDown = true;
  } else if (!on && stickDown) { stickDown = false; await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
}
async function press() { // E, a click with the mouse captured, or a tap on the offer
  if (touch) { const r = await page.evaluate(() => { const e = document.getElementById('act'); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }); if (r) await page.touchscreen.tap(r.x, r.y); return; }
  await page.keyboard.press('KeyE');
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const yawTo = (s, x, z) => Math.atan2(-(x - s.x), -(z - s.z));
async function face(x, z, pitch = null, y = null) {
  const s = await st();
  const dy = wrap(yawTo(s, x, z) - s.yaw);
  const want = pitch !== null ? pitch : y !== null ? Math.atan2(y - s.y, Math.hypot(x - s.x, z - s.z)) : s.pitch;
  await turn(dy, want - s.pitch);
}
let frame = 0;
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(2, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st();
  console.log(`[frame] ${f} t ${s.t.toFixed(1)} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)}  carriage s ${s.s.toFixed(1)} ${s.where || (s.moving ? 'moving' : 'stopped')}${s.ridden ? ' ridden' : ''}${s.offered ? ' offer ' + s.offered : ''}`);
}
async function walkTo(x, z, tol = 0.5, maxMs = 120000) {
  const t0 = Date.now(); let last = null, stuck = 0;
  await walkOn(true);
  while (Date.now() - t0 < maxMs) {
    const s = await st(), d = Math.hypot(x - s.x, z - s.z);
    if (d < tol) break;
    const dy = wrap(yawTo(s, x, z) - s.yaw);
    if (Math.abs(dy) > (touch ? 0.08 : 0.03)) await turn(dy, -s.pitch * 0.5);
    await sleep(d < 2 ? 50 : 110);
    if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.005) { if (++stuck > 60) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for (${x.toFixed(1)}, ${z.toFixed(1)})`); await walkOn(false); return false; } } else stuck = 0;
    last = s;
  }
  await walkOn(false);
  await sleep(250);
  return true;
}
// frames on the page clock after a press: 0.3, 1, 2, 5 s, then every 5 s while `until` is false; aim() before each
async function timed(tag, until, aim, maxT = 120) {
  const t0 = (await st()).t;
  const marks = [0.3, 1, 2, 5]; for (let k = 10; k <= maxT; k += 5) marks.push(k);
  for (const m of marks) {
    let s = await st();
    while (s.t - t0 < m) { if (await until(s)) return; await sleep(40); s = await st(); }
    if (aim) await aim(s);
    await shot(`${tag}-${String(m).replace('.', '_')}s`);
    if (await until(await st())) return;
  }
}
const aimAtCage = async () => { const c = await page.evaluate(() => { const L = window.__fp.lift, c = L.cageCentre(); return { x: c.x, y: c.y + 1.6, z: c.z }; }); await face(c.x, c.z, null, c.y); };
const waitFor = async (fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn(await st())) return true; await sleep(100); } return false; };

let ok = true;
// 1. the approach and the stair
await face(plan.plat.x, plan.plat.z, 0.12);
await shot('approach');
ok = ok && await walkTo(plan.stairFoot.x, plan.stairFoot.z);
await face(plan.plat.x, plan.plat.z, 0.35); await sleep(600); await shot('stair-foot');
ok = ok && await walkTo(plan.stairTop.x, plan.stairTop.z);
ok = ok && await walkTo(plan.bell.x, plan.bell.z, 0.4);
await face(plan.cageIn.x, plan.cageIn.z, 0.5); await sleep(600); await shot('platform-looking-up');
// 2. the bell
const bellH = await page.evaluate(() => { const h = window.__fp.lift.acts.callFoot.def.at; return { x: h.x, y: h.y, z: h.z }; });
await face(bellH.x, bellH.z, null, bellH.y);
await waitFor((s) => s.offered === 'lift-call', 8000);
await shot('bell-offered');
await press();
await timed('called', (s) => s.where === 'foot', aimAtCage);
await sleep(1500);
await face(plan.cageIn.x, plan.cageIn.z, -0.1); await shot('arrived');
// 3. in, and the lever
ok = ok && await walkTo(plan.plat.x, plan.plat.z, 0.4);
ok = ok && await walkTo(plan.cageIn.x, plan.cageIn.z, 0.35);
const lv = await page.evaluate(() => window.__fp.lift.lever());
await face(lv.x, lv.z, null, lv.y);
await waitFor((s) => s.offered === 'lift-lever', 8000);
await shot('lever-offered');
await press();
await timed('ride-up', (s) => !s.ridden && s.where === 'gallery', null, 90);
await sleep(800);
await shot('top-doors-open');
// 4. the gallery: out over the gangway, along to the odd cell, on to the ragged end
ok = ok && await walkTo(plan.gangWest.x, plan.gangWest.z, 0.45);
const g = plan.gal;
await face(g[3].x, g[3].z, -0.05); await sleep(500); await shot('gallery-first');
await face(g[3].x + 50 * plan.io.x, g[3].z + 50 * plan.io.z, -0.35); await sleep(500); await shot('gallery-east');
await face(g[3].x, g[3].z, -0.05);
let lastLook = 0;
for (let i = 1; i < g.length; i++) {
  const d2coin = Math.hypot(g[i].x - plan.coin.x, g[i].z - plan.coin.z);
  if (d2coin < 6) break;
  ok = ok && await walkTo(g[i].x, g[i].z, 0.6);
  if (i - lastLook >= 6) { lastLook = i; await shot(`gallery-walk-${i}`); }
}
await face(plan.coin.x, plan.coin.z, -0.25); await sleep(500); await shot('odd-coin-ahead');
ok = ok && await walkTo(plan.oddFront.x, plan.oddFront.z, 0.4);
await face(plan.oddC.x, plan.oddC.z, null, plan.oddC.y); await sleep(600); await shot('odd-cell');
await face(plan.coin.x, plan.coin.z, -0.6); await sleep(400); await shot('odd-coin');
// on to the end
ok = ok && await walkTo(g[g.length - 1].x, g[g.length - 1].z, 0.6);
await face(plan.end.x + (plan.end.x - g[g.length - 2].x) * 3 + plan.io.x * 6, plan.end.z + (plan.end.z - g[g.length - 2].z) * 3 + plan.io.z * 6, -0.12); await sleep(500); await shot('ragged-end');
await turn(0, -0.75); await sleep(400); await shot('ragged-down');
await face(plan.end.x + (plan.end.x - g[g.length - 2].x) * 4, plan.end.z + (plan.end.z - g[g.length - 2].z) * 4, -0.18); await sleep(400); await shot('ragged-ahead');
await face(g[0].x, g[0].z, -0.05); await sleep(400); await shot('ragged-back');
// 5. back to the cage and down
for (let i = g.length - 2; i >= 0; i--) { if (Math.hypot(g[i].x - plan.coin.x, g[i].z - plan.coin.z) < 1.2) continue; ok = ok && await walkTo(g[i].x, g[i].z, 0.7); }
ok = ok && await walkTo(plan.gangWest.x, plan.gangWest.z, 0.45);
ok = ok && await walkTo(plan.cg.x, plan.cg.z, 0.35);
const lv2 = await page.evaluate(() => window.__fp.lift.lever());
await face(lv2.x, lv2.z, null, lv2.y);
await waitFor((s) => s.offered === 'lift-lever', 8000);
await shot('lever-top-offered');
await press();
await timed('ride-down', (s) => !s.ridden && s.where === 'foot', null, 90);
await sleep(800);
ok = ok && await walkTo(plan.plat.x, plan.plat.z, 0.4);
await face(plan.stairFoot.x, plan.stairFoot.z, -0.1); await shot('out-at-foot');
const end = await st();
const rode = ok && end.where === 'foot' && Math.abs(end.feet - (await page.evaluate(() => window.__fp.lift.floorY0))) < 0.3;
if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
console.log(`rode: ${rode ? 'yes' : 'no'}`);
await browser.close();
process.exit(rode ? 0 : 1);
