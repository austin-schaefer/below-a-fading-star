#!/usr/bin/env node
// A walk on the keys with a per-frame trace of the walker's height (v15-W5, the owner's "the walker hangs, and sort of
// teleports up and down a bit as it walks"): a judge's tool, not a gate. One page: "Go out", the view clicked so the
// mouse is captured, then W held and the walker steered with the mouse alone through the points given, in order. Every
// animation frame the page records where the feet are (x, z, feet y, the eye's drawn y, the floor underfoot) and
// every STEP_S seconds (default 1.5) the view is written as a frame.
//   node tools/dip-walk.mjs <base> <prefix> <x,z[,yaw]> <x,z;x,z;...> [q=low]
// The first point is where the walk starts (?pos, with the yaw if given); the walker then walks to each of the rest.
// Writes shots/wip/<prefix>-NNN.png in order and shots/wip/<prefix>-trace.json, and prints:
//   jumps   frames where the feet moved more than a step (0.12 m) up or down while walking on the ground, with where
//   hangs   spans of 0.25 s or more with W held where the walker moved under a third of its median pace (a turn on
//           the spot to the next point counts: read them against the frames)
//   the worst |dy| in one frame, and a last line `walked: yes|no` (every point reached).
import { ANGLE } from './launch.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', prefix = 'dip-walk', start = '0,0', pts0 = '', q = 'low'] = process.argv.slice(2);
const STEP_S = +(process.env.STEP_S || 1.5);
const [sx, sz, syaw = 0] = start.split(',').map(Number);
const pts = pts0.split(';').filter(Boolean).map((p) => p.split(',').map(Number));
const browser = await pw.chromium.launch({ channel: process.env.CHANNEL || 'chromium', args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&pos=${sx},${sz}&yaw=${syaw}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
await sleep(500);
await page.mouse.click(640, 360);
await sleep(1500);
const locked = await page.evaluate(() => !!document.pointerLockElement);
console.log(`pointer captured: ${locked}`);
// the trace: one row a frame, kept in the page
await page.evaluate(() => {
  const fp = window.__fp, p = fp.player, T = (window.__trace = []);
  const tick = () => { T.push([performance.now(), p.pos.x, p.pos.z, p.pos.y - p.eye, fp.camera.position.y, p.onStack?.name || (p.onTop ? 'top' : 'ground'), !!p.hopping, window.__walking ? 1 : 0]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, yaw: p.yaw, pitch: p.pitch }; });
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
let frame = 0, lastShot = 0;
async function shot() {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(3, '0')}.png`;
  await page.screenshot({ path: f });
  lastShot = Date.now();
}
await shot();
await page.evaluate(() => { window.__walking = true; });
await page.keyboard.down('KeyW');
let i = 0, stuck = 0, last = null;
const t0 = Date.now();
while (i < pts.length && Date.now() - t0 < 5 * 60 * 1000) {
  const s = await st(), [wx, wz] = pts[i], dx = wx - s.x, dz = wz - s.z, d = Math.hypot(dx, dz);
  if (d < 0.6) { console.log(`[at] point ${i + 1} (${wx}, ${wz})`); i++; continue; }
  const dy = wrap(Math.atan2(-dx, -dz) - s.yaw);
  if (Math.abs(dy) > 0.02) await turn(dy, -s.pitch * 0.5 - 0.12);
  if (Date.now() - lastShot > STEP_S * 1000) await shot();
  await sleep(80);
  if (last && Math.hypot(s.x - last.x, s.z - last.z) < 0.01) { if (++stuck > 60) { console.log(`stuck at (${s.x.toFixed(2)}, ${s.z.toFixed(2)}) heading for point ${i + 1}`); break; } } else stuck = 0;
  last = s;
}
await page.keyboard.up('KeyW');
await page.evaluate(() => { window.__walking = false; });
await sleep(400);
await shot();
const trace = await page.evaluate(() => window.__trace);
await browser.close();
fs.writeFileSync(`shots/wip/${prefix}-trace.json`, JSON.stringify({ base, start, pts, trace }));
// the reading
const W = trace.filter((r) => r[7]);
let worst = 0;
const jumps = [], hangs = [];
for (let k = 1; k < W.length; k++) {
  const a = W[k - 1], b = W[k], dyf = b[3] - a[3];
  if (!a[6] && !b[6] && Math.abs(dyf) > Math.abs(worst)) worst = dyf;
  if (!a[6] && !b[6] && Math.abs(dyf) > 0.12) jumps.push(`  (${b[1].toFixed(2)}, ${b[2].toFixed(2)}) feet ${a[3].toFixed(2)} -> ${b[3].toFixed(2)} (${dyf > 0 ? '+' : ''}${dyf.toFixed(2)}) on ${a[5]} -> ${b[5]}`);
}
// pace: the median horizontal speed while walking; a hang is a span over 0.25 s under a third of it
// (the page may draw a frame without a step of the walk between, so the pace is read over a quarter second)
const sp = new Array(W.length).fill(Infinity);
for (let k = 0, j = 0; k < W.length; k++) {
  while (j < W.length && W[j][0] - W[k][0] < 250) j++;
  if (j < W.length) sp[k] = Math.hypot(W[j][1] - W[k][1], W[j][2] - W[k][2]) / ((W[j][0] - W[k][0]) / 1000);
}
const fin = sp.filter(Number.isFinite), med = [...fin].sort((a, b) => a - b)[fin.length >> 1] || 0;
for (let k = 1, h0 = -1; k < W.length; k++) {
  const slow = sp[k] < med / 3;
  if (slow && h0 < 0) h0 = k;
  if ((!slow || k === W.length - 1) && h0 >= 0) { const dur = (W[k][0] - W[h0][0]) / 1000 + 0.25; if (h0 > 3) hangs.push(`  (${W[h0][1].toFixed(2)}, ${W[h0][2].toFixed(2)}) for ${dur.toFixed(2)} s, feet ${W[h0][3].toFixed(2)} on ${W[h0][5]}`); h0 = -1; }
}
console.log(`frames traced: ${W.length} walking (${trace.length} in all), median pace ${med.toFixed(2)} m/s`);
console.log(`jumps over a step in one frame: ${jumps.length}`); for (const j of jumps) console.log(j);
console.log(`hangs: ${hangs.length}`); for (const h of hangs) console.log(h);
console.log(`worst one-frame dy on the ground: ${worst.toFixed(3)} m`);
console.log(`frames: shots/wip/${prefix}-001.png .. ${String(frame).padStart(3, '0')}; trace shots/wip/${prefix}-trace.json`);
if (errors.length) console.log(`page errors: ${errors.slice(0, 3).join(' | ')}`);
console.log(`walked: ${i >= pts.length ? 'yes' : 'no'}`);
