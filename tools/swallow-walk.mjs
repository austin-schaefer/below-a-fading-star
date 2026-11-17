#!/usr/bin/env node
// The Swallow walked (v17-U1): a judge's tool and a check (the model: tools/passage-walk.mjs). One page: "Go out" on the
// mere's shore north of the quay, the view clicked so the mouse is captured, then W held and the mouse alone steering
// (moves read back from the page only to aim the next): down the quay's steps, along it, into the tube's broken lip,
// down the stair in the head as the water closes over the glass, along the conduit to the Garth's door; then back the
// whole way to the shore. A frame every `step` metres walked (default 1.4), looking where the walker goes.
//   node tools/swallow-walk.mjs [base=http://localhost:8123] [q=low] [prefix=swallow-walk] [there|both] [step=1.4]
// Frames: shots/wip/<prefix>-<q>-NNN.png in order. Prints each frame with where the feet are and on what floor. Fails
// (exit 1) if the walker stalls, leaves the tube between its lip and the door (feet on anything but the tube's floor
// while the plan has them inside it), goes more than 0.3 m under the planks, or the page throws.
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', q = 'low', prefix0 = 'swallow-walk', legs = 'both', stepArg = '1.4'] = process.argv.slice(2);
const prefix = `${prefix0}-${q}`, STEP = +stepArg;
const browser = await pw.chromium.launch({ channel: 'chromium', args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&pos=-90.5,292&yaw=3.14`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
await sleep(500);
await page.mouse.click(640, 360);
await sleep(1200);
await page.evaluate(() => {
  const fp = window.__fp; fp.controls.placeAt(-90.5, 292); fp.player.yaw = Math.PI; fp.player.pitch = 0;
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
});
await sleep(1500);
const st = () => page.evaluate(() => {
  const fp = window.__fp, p = fp.player, L = fp.swallow.line, n = L.near(p.pos.x, p.pos.z, {});
  const inTube = n.s > 0.6 && n.s < L.LEN - 0.6 && Math.abs(n.d) < 1.2;
  return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', below: fp.below?.here ?? 0, locked: !!document.pointerLockElement, s: n.s, d: n.d, inTube, plan: inTube ? L.floorY(n.s) : null };
});
const s0 = await st();
console.log(`pointer captured: ${s0.locked}`);
const locked = s0.locked;
// the route: the shore, the quay's foot and length, the lip, along the tube every 4 m, the door
const route = await page.evaluate(() => {
  const L = window.__fp.swallow.line, R = [{ x: -90.5, z: 295.5, tag: 'shore' }, { x: -90.5, z: 299, tag: 'quay' }, { x: -90.5, z: 305.2, tag: 'quay-end' }];
  for (let s = 0.6; s < L.LEN - 1; s += 4) { const a = L.at(s); R.push({ x: a.x, z: a.z, tag: `s${String(Math.round(s)).padStart(2, '0')}` }); }
  const e = L.at(L.LEN - 0.6); R.push({ x: e.x, z: e.z, tag: 'door' });
  return R;
});
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
let frame = 0, lowest = 0, left = 0, walkedSince = 0, lastP = null;
async function shot(s, tag) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(3, '0')}.png`;
  await page.screenshot({ path: f });
  console.log(`[frame] ${f} ${tag} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) s ${s.s.toFixed(1)} feet ${s.feet.toFixed(2)} on ${s.floor}, below ${s.below.toFixed(2)}`);
}
await page.keyboard.down('KeyW');
let i = 0, stuck = 0;
const t0 = Date.now();
while (i < full.length && Date.now() - t0 < 30 * 60 * 1000) {
  const s = await st();
  if (lastP) walkedSince += Math.hypot(s.x - lastP.x, s.z - lastP.z);
  if (s.inTube) {
    if (s.floor !== 'swallow') { left++; console.log(`OFF the tube's floor at s ${s.s.toFixed(1)} (on ${s.floor}, feet ${s.feet.toFixed(2)})`); }
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
  if (d < 0.7) { i++; continue; }
  const want = Math.atan2(-dx, -dz), dy = wrap(want - s.yaw);
  if (Math.abs(dy) > 0.02) await turn(dy, -s.pitch * 0.5);
  await sleep(d < 2 ? 50 : 90);
  if (lastP && Math.hypot(s.x - lastP.x, s.z - lastP.z) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) heading for ${i} (${w.tag})`); break; } } else stuck = 0;
  lastP = s;
}
await page.keyboard.up('KeyW');
const walked = i >= full.length;
console.log(`lowest feet under the planks: ${lowest.toFixed(2)}; off the tube's floor: ${left}; page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
const ok = walked && !errors.length && left === 0 && lowest > -0.3;
console.log(`${ok ? 'PASS' : 'FAIL'} swallow-walk: walked ${walked ? 'yes' : 'no'}, ${frame} frames`);
await browser.close();
process.exit(ok ? 0 : 1);
