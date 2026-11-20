#!/usr/bin/env node
// The Lower Beds walked (v18-F3): a judge's tool and a check (the model: tools/swallow-walk.mjs). One page: "Go out" on
// the spur's end 9 m east of the door, the view clicked so the mouse is captured, then W held and the mouse alone
// steering (moves read back from the page only to aim the next): up the forecourt, through the door past the bronze
// leaf, down the stair, the landing, the steps into the vault, up its aisle between the tombs, along the way under the
// wood to the chamber under the glasshouse; then back the whole way to the spur. A frame every `step` metres walked
// (default 2), looking where the walker goes.
//   node tools/beds-walk.mjs [base=http://localhost:8123] [q=low] [prefix=beds-walk] [there|both] [step=2]
// Frames: shots/wip/<prefix>-<q>-NNN.png in order. Prints each frame with where the feet are and on what floor. Fails
// (exit 1) if the walker stalls, is off the Beds' floor on any leg between two route points below the stair's head (feet
// on anything but the stacked floor 'beds', or 0.3 m off its level), never stands in the chamber at its level, or the page
// throws or logs an error (the sound is started by "Go out", so the rooms' audio runs the whole walk).
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', q = 'low', prefix0 = 'beds-walk', legs = 'both', stepArg = '2'] = process.argv.slice(2);
const prefix = `${prefix0}-${q}`, STEP = +stepArg;
const browser = await pw.chromium.launch({ channel: 'chromium', args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push('console: ' + m.text()); });
const START = [-240, 172];
await page.goto(`${base}/?q=${q}&pos=${START.join(',')}&yaw=1.5708`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
await sleep(500);
await page.mouse.click(640, 360);
await sleep(1200);
await page.evaluate(([x, z]) => {
  const fp = window.__fp; fp.controls.placeAt(x, z); fp.player.yaw = Math.PI / 2; fp.player.pitch = 0;
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
}, START);
await sleep(1500);
const st = () => page.evaluate(() => {
  const fp = window.__fp, p = fp.player, B = fp.beds, f = B.floor(p.pos.x, p.pos.z), plan = f;
  return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', below: fp.below?.here ?? 0, locked: !!document.pointerLockElement, plan, draws: fp.renderer?.info?.render?.calls ?? null };
});
const s0 = await st();
console.log(`pointer captured: ${s0.locked}; sound: ${await page.evaluate(() => { const a = window.__fp.audio; return a.started ? a.ctx?.state : 'not started'; })}`);
const locked = s0.locked;
const route = await page.evaluate(([x, z]) => [{ x, z, y: null, tag: 'spur' }, ...window.__fp.beds.line.ROUTE.map((p, i, A) => ({ x: p[0], z: p[1], y: p[2], inside: i >= 3, tag: i === A.length - 1 ? 'chamber' : `r${String(i).padStart(2, '0')}` }))], START);
const full = legs === 'there' ? route : [...route, ...route.slice(0, -1).reverse().map((r) => ({ ...r, tag: r.tag + '-back' }))];
const SENS = 0.0021;
let mx = 640, my = 360;
async function turn(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (locked) { for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); } return; }
  mx = 640; my = 360; await page.mouse.move(mx, my); await page.mouse.down();
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  await page.mouse.up();
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let frame = 0, lowest = 0, left = 0, walkedSince = 0, lastP = null, reached = false;
async function shot(s, tag) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(3, '0')}.png`;
  await page.screenshot({ path: f });
  console.log(`[frame] ${f} ${tag} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor}, below ${s.below.toFixed(2)}`);
}
await page.keyboard.down('KeyW');
let i = 0, stuck = 0;
const t0 = Date.now();
while (i < full.length && Date.now() - t0 < 30 * 60 * 1000) {
  const s = await st();
  if (lastP) walkedSince += Math.hypot(s.x - lastP.x, s.z - lastP.z);
  // on every leg between two of the route's points below the stair's head, the walker is on the Beds' floor (the
  // stacked floor 'beds') at its level, whatever the ground over them does: a walker who left it (pushed up onto the
  // bank, or never down) fails
  if (i > 0 && full[i].inside && full[i - 1].inside) {
    const off = s.floor !== 'beds' || s.plan === null || s.plan === undefined || Math.abs(s.feet - s.plan) > 0.3;
    if (off) { left++; if (left < 6) console.log(`OFF the Beds' floor at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) (on ${s.floor}, feet ${s.feet.toFixed(2)}, plan ${s.plan === null || s.plan === undefined ? 'none' : s.plan.toFixed(2)})`); }
    else lowest = Math.min(lowest, s.feet - s.plan);
  }
  const w = full[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (walkedSince >= STEP) {
    walkedSince = 0;
    await page.keyboard.up('KeyW'); await sleep(250);
    await turn(0, -s.pitch); await sleep(150);
    await shot(await st(), w.tag);
    await page.keyboard.down('KeyW');
  }
  if (d < 0.45) {
    // the chamber is reached standing on its floor at its level, not over it on the bank
    if (w.tag === 'chamber') { if (s.floor !== 'beds' || Math.abs(s.feet - w.y) > 0.2) { console.log(`at the chamber's x and z but not in it (on ${s.floor}, feet ${s.feet.toFixed(2)})`); break; } reached = true; }
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dy = wrap(want - s.yaw);
  if (Math.abs(dy) > 0.02) await turn(dy, -s.pitch * 0.5);
  await sleep(d < 2 ? 50 : 90);
  if (lastP && Math.hypot(s.x - lastP.x, s.z - lastP.z) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor}, heading for ${i} (${w.tag})`); break; } } else stuck = 0;
  lastP = s;
}
await page.keyboard.up('KeyW');
const walked = i >= full.length;
console.log(`lowest feet under the floor: ${lowest.toFixed(2)}; ticks off the floor: ${left}; reached the chamber: ${reached}; page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
const ok = walked && reached && !errors.length && left === 0 && lowest > -0.3;
console.log(`${ok ? 'PASS' : 'FAIL'} beds-walk (${q}): walked ${walked ? (legs === 'there' ? 'there' : 'there and back') : 'no'}, ${frame} frames`);
await browser.close();
process.exit(ok ? 0 : 1);
