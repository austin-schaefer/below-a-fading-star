#!/usr/bin/env node
// An act done the way a visitor does it (v14-B1): load, "Go out", the mouse captured by a click on the view, walk to
// the act on the keys from about 30 m (steering with the mouse toward it, as a visitor does), press E when the offer
// rises, then let go of everything and watch. Frames on the page's own clock (Playwright's, installed before the
// load), so "1 s after E" is a second of the walk's time however slowly the browser draws: on the way in at 30, 10
// and 2 m (the lure: quiet far off, plain close to), at the offer, and at each time in AFTER (seconds after E, with no
// look or key input at all). 1280 x 720 into shots/wip/<prefix>-NN-<name>.png, with a line per frame on stdout (the
// eye, the offer, the act's state). The sun's guttering is held off so before/after pairs match.
// Usage: node tools/act-walk.mjs [base] <act-id> [prefix] [from x,z] [via x,z;x,z...]
//   AFTER=0.3,1,2,5 (default) · Q=low · HOLD=1 keeps holding W through the frames · STOP=m stops walking that far out
//   even if no offer rose · NOE=1 never presses E (the lure on its own) · STILL_MARKS=1 stops for each distance frame
//   THEN=id AFTER2=... a second act the first brings (the Halt's seat), pressed where they stand once offered
import { ANGLE } from './launch.mjs';
import { chromium } from 'playwright'; // npm install --no-save playwright@1.63.0 in the worktree (the wilderness skill)
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const id = process.argv[3];
const prefix = process.argv[4] || `actwalk-${id}`;
const fromArg = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
const via = process.argv[6] ? process.argv[6].split(';').map((s) => s.split(',').map(Number)) : [];
const AFTER = (process.env.AFTER || '0.3,1,2,5').split(',').map(Number);
const Q = process.env.Q || 'low';
if (!id) { console.error('usage: node tools/act-walk.mjs base act-id [prefix] [x,z] [via]'); process.exit(2); }
const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chromium', args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
await page.clock.install();
// where the act is: from the page itself (one load at spawn); then the walk is loaded where it starts
const wait = async () => { for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !!window.__fp?.acts && !document.getElementById('begin').disabled)); i++) { await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 30)); } };
let start = fromArg;
if (!start) {
  await page.goto(`${base}/?q=${Q}`, { waitUntil: 'load', timeout: 120000 }); await wait();
  start = await page.evaluate((id) => { const d = window.__fp.acts.list.find((h) => h.def.id === id).def, f = d.face || { x: 0, z: 1 }; return [d.at.x + f.x * 30, d.at.z + f.z * 30]; }, id);
}
await page.goto(`${base}/?q=${Q}&pos=${start[0].toFixed(2)},${start[1].toFixed(2)}`, { waitUntil: 'load', timeout: 120000 });
await wait();
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; for (const k of ['place', 'hint']) { const e = document.getElementById(k); if (e) e.style.visibility = 'hidden'; } });
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
const run = (ms) => page.clock.runFor(ms);
await page.click('#begin'); await run(300);
await page.mouse.click(640, 360); await run(300); // the click that captures the mouse, as a visitor's first click does
const locked = await page.evaluate(() => window.__fp.player.locked);
console.log('[lock]', locked ? 'the mouse is captured' : 'NOT captured (headless refused it): the look is turned through the page instead');
let n = 0;
const info = () => page.evaluate((id) => {
  const fp = window.__fp, p = fp.player, h = fp.acts.list.find((q) => q.def.id === id), a = h.def.at;
  const L = fp.acts.lure?.state?.().find((q) => q.id === id);
  return { d: +Math.hypot(a.x - p.pos.x, a.z - p.pos.z).toFixed(2), eye: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3), offered: fp.acts.offered?.def.id || null, busy: h.busy, lure: L ? L.on : null, t: +fp.time.t.toFixed(2), carried: !!p.carried, paused: !document.getElementById('card').classList.contains('hidden'), panel: !!fp.settings?.shown };
}, id);
const shot = async (name) => {
  const f = `shots/wip/${prefix}-${String(n++).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: f, timeout: 240000 });
  console.log(`[saved] ${f}`, JSON.stringify(await info()));
};
// with the pointer captured, every mouse.move is a movement; move in steps from the centre and leave it where it ends
let mx0 = 640, my0 = 360;
async function turn(w, pitchTo) {
  const s = await page.evaluate(([w, pitchTo]) => { const p = window.__fp.player, dx = w.x - p.pos.x, dz = w.z - p.pos.z; let dy = Math.atan2(-dx, -dz) - p.yaw; dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI; const pt = pitchTo ?? (w.y != null ? Math.atan2(w.y - p.pos.y, Math.hypot(dx, dz)) : 0); return { dy, dp: Math.max(-0.6, Math.min(0.5, pt)) - p.pitch }; }, [w, pitchTo]);
  if (!locked) return page.evaluate(([dy, dp]) => { const p = window.__fp.player; p.yaw += dy; p.pitch += dp; }, [s.dy, s.dp]);
  const tx = mx0 - s.dy / 0.0021, ty = my0 - s.dp / 0.0021;
  await page.mouse.move(tx, ty, { steps: 3 }); mx0 = tx; my0 = ty;
}
const target = await page.evaluate((id) => { const a = window.__fp.acts.list.find((h) => h.def.id === id).def.at; return { x: a.x, y: a.y, z: a.z }; }, id);
const legs = [...via.map(([x, z]) => ({ x, z })), target];
await turn(legs[0], 0); await run(1500);
let s = await info();
console.log('[start]', JSON.stringify(s));
const marks = [30, 15, 10, 2].filter((m) => m <= s.d + 0.5);
await shot(`at-${Math.round(s.d)}m`); marks.shift();
const stopAt = +(process.env.STOP || 0);
await page.keyboard.down('KeyW');
let leg = 0, steps = 0;
while (steps++ < 900) {
  const L = legs[leg];
  if (leg < legs.length - 1) { const d = await page.evaluate((L) => Math.hypot(L.x - window.__fp.player.pos.x, L.z - window.__fp.player.pos.z), L); if (d < 1.5) { leg++; continue; } }
  const d0 = (await info()).d;
  await turn(L, leg === legs.length - 1 ? Math.max(-0.35, Math.min(0.3, Math.atan2((target.y ?? 0) - (s.eye[1]), Math.max(d0, 1)) * (d0 < 8 ? 1 : 0.3))) : 0);
  await run(100);
  s = await info();
  while (marks.length && s.d <= marks[0]) {
    if (marks[0] === 2 || process.env.STILL_MARKS === '1') { await page.keyboard.up('KeyW'); await run(400); await shot(`at-${marks[0]}m`); s = await info(); await page.keyboard.down('KeyW'); }
    else await shot(`at-${marks[0]}m`);
    marks.shift();
  }
  if (s.offered === id && leg === legs.length - 1 && !process.env.NOE) break;
  if (stopAt && s.d <= stopAt) break;
  if (s.d < 0.8) break;
}
if (process.env.HOLD !== '1') await page.keyboard.up('KeyW');
await run(300);
await shot('offer');
if (!process.env.NOE) {
  if ((await info()).offered !== id) console.log('[warn] not offered here; pressing E anyway');
  await page.keyboard.press('KeyE');
  let el = 0;
  for (const t of AFTER) { await run(Math.max(1, (t - el) * 1000)); el = t; await shot(`after-${String(t).replace('.', 'p')}s`); }
}
// THEN=id: a second act that the first one brings (the seat after the stroke): wait where they stand, with no input,
// until it is offered, press E, and frames at AFTER2 (default AFTER) seconds after that press
if (process.env.THEN) {
  const id2 = process.env.THEN;
  for (let i = 0; i < 120 && (await page.evaluate((id2) => window.__fp.acts.offered?.def.id, id2)) !== id2; i++) await run(500);
  await shot(`offer-${id2}`);
  await page.keyboard.press('KeyE');
  let el = 0;
  for (const t of (process.env.AFTER2 || process.env.AFTER || '0.3,1,2,5').split(',').map(Number)) { await run(Math.max(1, (t - el) * 1000)); el = t; await shot(`${id2}-after-${String(t).replace('.', 'p')}s`); }
}
await page.keyboard.up('KeyW');
await browser.close();
