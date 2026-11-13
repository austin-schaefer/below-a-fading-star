#!/usr/bin/env node
// The icefall climbed by hand (v12-H2): a judge's tool, not a gate. One page: press "Go out", click the view so the
// mouse is captured (headless Chromium refuses the capture: then the page's own fallback, drag to look, which this uses
// and says so), then hold W and steer with the mouse alone from the mother crystal's side, through the slot's cleft,
// up the slot, across T1, up the block, over the bridge, along T2, up the stair and over the shelf to the lip of the
// last crevasse (the route is the ascent the module registers, `__fp.icefall.path`, filled in every metre and a half).
// At checkpoints it stops, looks (ahead, up, down, back) and writes a frame. Then it falls on purpose from three places
// (the block's side low down and near its head, the stair's upper flight near the top, the shelf's front) and says where the walker lands.
// With `touch` it does the climb on a phone-sized touch page with the stick only (one finger holds it up, a second
// drags to steer), and takes its frames, without the falls.
//   node tools/icefall-walk.mjs [base=http://localhost:8123] [keys|touch] [prefix=h2-walk] [extra query, e.g. &fall=1]   (Q=medium for another tier)
// Frames go to shots/wip/<prefix>-NN-<what>.png in order. Prints progress, each frame, the falls and a last line
// `climbed: yes|no`.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', prefix = 'h2-walk', extra = ''] = process.argv.slice(2);
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${process.env.Q || 'low'}&pos=58,-279&yaw=-1.2${extra}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.icefall, null, { timeout: 300000 });
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
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
const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, ground: p.onGround, stack: p.onStack?.name || '', locked: !!document.pointerLockElement }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${s0.locked}${s0.locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
// the route: the registered ascent, filled in every 1.5 m, its checkpoints tagged by the nearest plan point
const route = await page.evaluate(() => {
  const P = window.__fp.icefall.path, R = [];
  const tags = { 3: 'mouth', 6: 'slot-pinch', 7: 'slot-chock', 8: 'slot-crystal', 9: 'slot-mid', 10: 'slot-end', 14: 't1', 17: 'block-foot', 19: 'block-top', 21: 'bridge-end', 23: 't2', 24: 'stair-foot', 26: 'landing', 28: 'stair-top', 31: 'shelf', 33: 'lip' };
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 1.5));
    for (let k = 1; k <= n; k++) R.push({ x: a[0] + (b[0] - a[0]) * k / n, z: a[1] + (b[1] - a[1]) * k / n, tag: k === n ? tags[i] || null : (k === Math.ceil(n / 2) && i === 21 ? 'bridge-mid' : null) });
  }
  return R;
});
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
async function lookTouch(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, was = stickDown, sx = 195, sy = 300, n = 6;
  if (was) await walkOn(false);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPts([[7, sx, sy]]) });
  for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPts([[7, sx + px * i / n, sy + py * i / n]]) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (was) await walkOn(true);
}
const turn = touch ? lookTouch : lookKeys;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let frame = 0;
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(2, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st();
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} ${s.stack}`);
}
async function pause(fn) { await walkOn(false); await sleep(400); await fn(); await walkOn(true); }
// what to look at, as turns from the walking direction (yaw) and a pitch
const LOOKS = {
  mouth: [['ahead', 0, 0.25]],
  'slot-pinch': [['ahead', 0, 0.05]],
  'slot-chock': [['up', 0, 0.85], ['ahead', 0, 0.1]],
  'slot-crystal': [['back', Math.PI, 0.05]],
  'slot-mid': [['ahead', 0, 0.1], ['up', 0.2, 0.9]],
  'slot-end': [['back', Math.PI, -0.35]],
  t1: [['ahead', 0, 0.05], ['down-slot', 1.3, -0.6]],
  'block-foot': [['ramp', 0, 0.25]],
  'block-top': [['bridge', 1.4, -0.05], ['down', -1.4, -0.9]],
  'bridge-mid': [['ahead', 0, 0.0], ['down', 0.5, -1.1]],
  'bridge-end': [['back', Math.PI, -0.4]],
  t2: [['ahead', 0, 0.05]],
  'stair-foot': [['stair', 0, 0.25]],
  landing: [['out', -1.4, -0.3], ['down', -1.4, -0.9]],
  'stair-top': [['out', 1.8, -0.15]],
  shelf: [['south', Math.PI, -0.1], ['plummet', 0.9, 0.5]],
  lip: [['down', 0.8, -0.95], ['plummet', 0.8, 0.55], ['find', 2.4, -0.45], ['valley', -2.25, -0.25]],
};
await shot('start');
await walkOn(true);
let i = 0, lastIdx = -1, stuck = 0, last = null;
const t0 = Date.now();
while (i < route.length && Date.now() - t0 < 30 * 60 * 1000) {
  const s = await st();
  const w = route[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (d < 0.6) {
    if (w.tag && LOOKS[w.tag]) for (const [what, dy, dp] of LOOKS[w.tag]) await pause(async () => { await turn(dy, dp - (await st()).pitch); await sleep(1100); await shot(`${w.tag}-${what}`); await turn(-dy, -(await st()).pitch); await sleep(200); });
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dyaw = wrap(want - s.yaw);
  if (Math.abs(dyaw) > (touch ? 0.06 : 0.02)) await turn(dyaw, -s.pitch * 0.5);
  await sleep(d < 2 ? 60 : 120);
  if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} heading for ${i} (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`); break; } } else stuck = 0;
  last = s;
  if (i !== lastIdx && i % 15 === 0) { console.log(`  waypoint ${i}/${route.length} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} ${s.stack}`); lastIdx = i; }
}
await walkOn(false);
const climbed = i >= route.length;
// the falls: stand at a place, face off its side, walk off on the keys (Shift held: at once), and see where they land
const falls = [];
if (climbed && !touch) {
  const spots = await page.evaluate(() => {
    const I = window.__fp.icefall;
    return [
      { name: 'bottom: off the block\'s side', at: I.falls.block },
      { name: 'middle: off the block near its head', at: I.falls.bridge },
      { name: 'top: off the stair\'s upper flight', at: I.falls.stair },
      { name: 'top: off the shelf\'s front', at: I.falls.shelf },
      { name: 'middle: off the bridge over R2 (held)', at: I.falls.bridgeMid },
    ];
  });
  for (const f of spots) {
    await page.evaluate((a) => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(a.x, a.z, a.y); p.vel.set(0, 0, 0); p.yaw = a.yaw; p.pitch = -0.3; }, f.at);
    await sleep(900);
    const from = await st();
    await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); await sleep(1500); await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
    let s = await st(), n = 0, blackout = false;
    while (n++ < 60 && !s.ground) { await sleep(150); s = await st(); if (await page.evaluate(() => (window.__fp.fall?.falls || 0))) blackout = true; }
    await sleep(600);
    // with ?fall=1 a long fall shuts the view and wakes the walker at the keep's gate: wait for the waking
    const fell = await page.evaluate(() => window.__fp.fall?.falls || 0);
    if (fell) { blackout = true; let m = 0; while (m++ < 80 && (await page.evaluate(() => window.__fp.fall.phase)) !== 'idle') await sleep(200); await sleep(500); await page.evaluate(() => { window.__fp.fall.falls = 0; }); }
    s = await st();
    await shot(`fall-${f.name.split(':')[0]}-landed`);
    s = await st();
    const info = await page.evaluate(([x, z]) => ({ g: window.__fp.terrain.heightAt(x, z), inWalk: window.__fp.mountains.inWalk(x, z) || Math.hypot(x, z) <= window.__fp.mountains.walkLimit(x, z) }), [s.x, s.z]);
    // and back: can they walk away (a metre in some direction)?
    let moves = false;
    for (const a of [0, 1.57, 3.14, 4.71]) {
      await page.evaluate((a) => { window.__fp.player.yaw = a; }, a);
      const b = await st(); await page.keyboard.down('KeyW'); await sleep(700); await page.keyboard.up('KeyW'); await sleep(200);
      const c = await st(); if (Math.hypot(c.x - b.x, c.z - b.z) > 1) { moves = true; break; }
    }
    falls.push({ where: f.name, blackout, from: +from.feet.toFixed(1), x: +s.x.toFixed(1), z: +s.z.toFixed(1), feet: +s.feet.toFixed(2), ground: +info.g.toFixed(2), inside: info.inWalk, onGround: s.ground, stack: s.stack, walksAway: moves });
  }
}
for (const f of falls) console.log(`fall ${f.where}: ${f.blackout ? 'BLACKOUT, woke ' : ''}from feet ${f.from} landed at (${f.x}, ${f.z}) feet ${f.feet} (terrain ${f.ground}) ${f.stack || 'on the ground'}; inside ${f.inside}, walks away ${f.walksAway}`);
if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
console.log(`climbed: ${climbed ? 'yes' : 'no'}`);
await browser.close();
process.exit(climbed ? 0 : 1);
