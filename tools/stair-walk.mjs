#!/usr/bin/env node
// The Diffident Stair climbed by hand (v12-H3): a judge's tool, not a gate. One page on Playwright's clock (so "0.3 s"
// is 0.3 s of the walk's time however slowly the headless browser draws): press "Go out", then hold W (keys) or push
// the touch stick (touch, a phone-sized page) and steer with the mouse or a finger's drag alone, along the stair's
// registered ascent (ctx.ascents 'stair': the turf east of the stub, each flight's ends, each landing, the top, the
// deck and the lattice's member). Frames, in order, to shots/wip/<prefix>-NN-<what>.png:
//   - from the turf, the stub; then, on the first flight and again on the fourth, a frame every 0.3 s for 4.2 s while
//     walking, looking up the stair (the slabs coming);
//   - at landings: ahead, straight down, back; at the switchback, what is ahead before the next flight comes;
//   - at the top: the landing, the deck, the view west.
// It says where the walker waited at the stair's end (held), and the time of the climb. With `falls` it then puts the
// walker on the stair at three heights and steps off sideways with a hurry, and says where they land (run it once
// with base ...?fall=1 too: then the view blacks out and they wake at the keep's gate).
//   node tools/stair-walk.mjs [base=http://localhost:8162] [keys|touch|falls] [prefix=h3-walk] [extra query, e.g. &fall=1]
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base0 = 'http://localhost:8162', mode = 'keys', prefix = 'h3-walk', extra = ''] = process.argv.slice(2);
const base = base0.replace(/\/?(\?.*)?$/, '');
const touch = mode === 'touch', falls = mode === 'falls';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.clock.install();
await page.goto(`${base}/?q=low&pos=292,-12&yaw=1.571${extra}`, { waitUntil: 'load', timeout: 120000 });
for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !!window.__fp?.stair)); i++) {
  await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 50));
}
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
const run = (ms) => page.clock.runFor(ms);
const W = touch ? 390 : 1280, H = touch ? 844 : 720;
let cdp = null;
if (touch) {
  cdp = await context.newCDPSession(page);
  await page.evaluate(() => { const b = document.getElementById('begin'); if (b) b.click(); else window.__fp.events.dispatchEvent(new CustomEvent('begin')); });
} else {
  await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
  await run(500);
  await page.mouse.click(W / 2, H / 2);
}
await run(1200);
const st = () => page.evaluate(() => { const fp = window.__fp, p = fp.player; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, ground: p.onGround, locked: !!document.pointerLockElement, el: fp.stair.el(), stack: p.onStack?.name || null, t: fp.time.t }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${locked}${locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
// ---------------------------------------------------------------- input
const SENS = touch ? 0.005 : 0.0021;
let stickDown = false, stickHome = null;
async function walkOn(on, hurry = false) {
  if (!touch) { if (on) { await page.keyboard.down('KeyW'); if (hurry) await page.keyboard.down('ShiftLeft'); } else { await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); } return; }
  if (on && !stickDown) {
    stickHome = await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y - 40 }] });
    stickDown = true;
  } else if (!on && stickDown) {
    stickDown = false;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
}
// turn the view by (dyaw, dpitch) radians: a finger's drag on touch (the thumb off the stick meanwhile), the mouse with
// the pointer captured, or a drag with the button held (the page's fallback when the capture is refused)
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
let frame = 0;
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(2, '0')}-${what}.png`;
  await page.screenshot({ path: f, timeout: 240000 });
  const s = await st();
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} el ${s.el} t ${s.t.toFixed(1)}`);
}
async function lookAt(dyaw, pitch) { const s = await st(); await turn(dyaw, pitch - s.pitch); await run(250); }

if (falls) {
  // ---------------------------------------------------------------- falls from three heights
  const res = [];
  for (const frac of [0.12, 0.5, 0.92]) {
    const p0 = await page.evaluate((frac) => {
      const fp = window.__fp, S = fp.stair, E = S.plan.els;
      // a tread in a flight about that far up, its flight's direction
      let i = Math.round(frac * (E.length - 1)); while (E[i].kind !== 0) i--;
      S.all(true); fp.controls.placeAt(E[i].cx, E[i].cz, E[i].y); const p = fp.player; p.vel.set(0, 0, 0); p.vy = 0;
      p.yaw = Math.atan2(-E[i].ux, -E[i].uz); p.pitch = -0.2;
      return { i, x: E[i].cx, z: E[i].cz, y: E[i].y, ground: fp.terrain.heightAt(E[i].cx, E[i].cz) };
    }, frac);
    await run(1500);
    await shot(`fall-${Math.round(frac * 100)}-before`);
    // step off to the left with a hurry, then look down as they go
    await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyA'); await run(900); await page.keyboard.up('KeyA'); await page.keyboard.up('ShiftLeft');
    await lookAt(0, -1.1);
    await shot(`fall-${Math.round(frac * 100)}-falling`);
    let s = await st(), n = 0, dark = 0;
    while (n++ < 120 && !(s.ground && s.feet < p0.y - 3)) { await run(250); s = await st(); dark = Math.max(dark, await page.evaluate(() => window.__fp.fall?.dark ?? 0)); }
    await run(4000);
    s = await st();
    await shot(`fall-${Math.round(frac * 100)}-landed`);
    const g = await page.evaluate(([x, z]) => ({ g: window.__fp.terrain.heightAt(x, z), inWalk: window.__fp.mountains.inWalk(x, z) }), [s.x, s.z]);
    res.push({ from: p0, landed: { x: +s.x.toFixed(1), z: +s.z.toFixed(1), feet: +s.feet.toFixed(2), ground: +g.g.toFixed(2), inWalk: g.inWalk, onGround: s.ground }, dark });
    console.log(`fall from tread ${p0.i} (${(p0.y - p0.ground).toFixed(0)} m over the turf): landed at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} (turf ${g.g.toFixed(2)}), inside ${g.inWalk}, standing ${s.ground}`);
  }
  if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
  await browser.close();
  process.exit(0);
}

// ---------------------------------------------------------------- the climb
const route = await page.evaluate(() => {
  const a = window.__fp.ascents.list.find((q) => q.id === 'stair'), E = window.__fp.stair.plan.els;
  const land = new Set(E.filter((e) => e.kind === 1).map((e) => `${e.cx.toFixed(2)},${e.cz.toFixed(2)}`));
  return a.path.map(([x, z, y], i) => ({ x, z, y, landing: land.has(`${x.toFixed(2)},${z.toFixed(2)}`), i }));
});
const landings = route.filter((r) => r.landing);
const SEQ = new Set([1, 10]); // waypoints at which the arriving sequence runs (the stub's foot; the fourth flight's foot)
const LOOKS = { 0: [['ahead', 0, 0.12], ['down', 0.5, -1.25], ['back', Math.PI, -0.15]], 2: [['ahead', 0, 0.05], ['back', Math.PI, -0.35]], 3: [['ahead', 0, 0.0], ['down', -0.9, -1.25], ['back', Math.PI, -0.2]], 5: [['ahead', 0, 0.05], ['down', 0.4, -1.3]] };
await shot('from-the-turf');
await walkOn(true);
let i = 1, held = 0, heldAt = [], stuck = 0, last = null, fell = false;
const tStart = (await st()).t;
let hiFeet = -99;
while (i < route.length) {
  const s = await st();
  hiFeet = Math.max(hiFeet, s.feet);
  if (hiFeet > 12 && s.feet < hiFeet - 6) { console.log(`fell at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(1)}, heading for ${i}`); fell = true; break; }
  const w = route[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (d < 0.6) {
    const li = landings.indexOf(w);
    if (li >= 0 && LOOKS[li]) {
      await walkOn(false); await run(300);
      for (const [what, dyw, p] of LOOKS[li]) { await lookAt(dyw, p); await run(700); await shot(`landing${li}-${what}`); await lookAt(-dyw, 0); }
      await walkOn(true);
    }
    if (SEQ.has(i)) {
      // the arriving: look up the stair and walk on, a frame every 0.3 s for 4.2 s
      const nx = route[i + 1];
      const sy = await st();
      await turn(wrap(Math.atan2(-(nx.x - sy.x), -(nx.z - sy.z)) - sy.yaw), 0.18 - sy.pitch);
      for (let k = 0; k <= 14; k++) { await shot(`arrive-${String(k * 3).padStart(2, '0')}`); await run(300); }
      await turn(0, -0.18);
    }
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dyw = wrap(want - s.yaw);
  if (Math.abs(dyw) > (touch ? 0.06 : 0.025)) await turn(dyw, -s.pitch * 0.5);
  await run(d < 2 ? 60 : 120);
  if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.005) {
    held++; if (!heldAt.length || Math.hypot(heldAt[heldAt.length - 1][0] - s.x, heldAt[heldAt.length - 1][1] - s.z) > 1) heldAt.push([+s.x.toFixed(1), +s.z.toFixed(1), s.el]);
    if (++stuck > 120) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for ${i} (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`); break; }
  } else stuck = 0;
  last = s;
  if (w.landing && d < 1 && i % 3 === 0) console.log(`  waypoint ${i}/${route.length} feet ${s.feet.toFixed(2)} t ${(s.t - tStart).toFixed(1)} s`);
}
await walkOn(false);
const top = i >= route.length;
if (top) {
  await run(500);
  const s = await st();
  for (const [what, dyw, p] of [['top-north', 0, -0.1], ['top-west', -Math.PI / 2, 0.02], ['top-down', -Math.PI / 2, -1.2], ['home', Math.PI * 0.75, -0.15]]) { await lookAt(wrap(s.yaw + dyw - (await st()).yaw), p); await run(600); await shot(what); }
}
console.log(`held at the stair's end: ${held} steps, at ${JSON.stringify(heldAt.slice(0, 12))}`);
console.log(`climb time ${((await st()).t - tStart).toFixed(1)} s (walk time, with the stops for frames)`);
if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
console.log(`top: ${top ? 'yes' : 'no'}${fell ? ' (fell)' : ''}`);
await browser.close();
process.exit(top ? 0 : 1);
