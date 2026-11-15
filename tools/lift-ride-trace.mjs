#!/usr/bin/env node
// The lift's ride traced frame by frame in a real browser (#50, "Elevator gyrates horribly / erratically as it
// ascends"): a judge's tool, not a gate. One page at the given tier: "Go out", the view clicked (the mouse captured
// where the browser allows it), the carriage put at the foot with its grille open, the visitor walked into it on W
// and turned to the lever with the mouse, E pressed, and the whole ride up recorded with no input, every rendered
// frame, at the moment it is drawn (the composer's render is wrapped): the page's dt, the eye, the yaw and pitch, the
// cage's drawn floor, the carriage's s. Optionally under a CPU throttle (Chrome's DevTools rate).
// Prints, for the ride:
//   - frames and the dt spread;
//   - rel: how far the eye moves against the cage it stands in, frame to frame (the bars and floor jumping round the
//     visitor's head) — max and 95th percentile, cm;
//   - rev: reversals of the eye's height (its rise between frames changing sign by more than 1 mm) the visitor did not
//     ask for, and the largest drop in one frame;
//   - yaw: the largest turn of the look in one frame and in total (the carrier turns it at the beats).
// Frames: shots/wip/<prefix>-NN-<what>.png at the press and every `every` seconds of the page's clock.
//   node tools/lift-ride-trace.mjs [base=http://localhost:8123] [q=low] [prefix=lift-trace] [throttle=1] [every=8]
// Writes the trace to shots/wip/<prefix>-trace.json.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', q = 'low', prefix = 'lift-trace', throttle = '1', every = '8'] = process.argv.slice(2);
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base.replace(/\/?(\?.*)?$/, '')}/?q=${q}&pos=-264,-18&yaw=1.57`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp, null, { timeout: 300000 });
if (!(await page.evaluate(() => !!window.__fp.lift))) { console.log('FAIL no lift', errors.join(' | ')); await browser.close(); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
await sleep(500);
await page.mouse.click(640, 360);
await sleep(800);
const locked = await page.evaluate(() => !!document.pointerLockElement);
console.log(`pointer captured: ${locked}`);
// the carriage at the foot, its east grille open; the visitor on the platform before its door
const plan = await page.evaluate(() => {
  const fp = window.__fp, L = fp.lift, C0 = L.C0, S = L.station, io = L.io, al = L.al;
  L.jump(L.S0, { e: 1, w: 0 });
  const toW = (x, z) => ({ x: C0.x + al.x * x + io.x * z, z: C0.z + al.z * x + io.z * z });
  const plat = toW(0, S.PLAT.z0 + 1.6);
  fp.controls.placeAt(plat.x, plat.z, S.floorY0);
  return { plat, cageIn: toW(0.2, -0.2) };
});
const st = () => page.evaluate(() => { const fp = window.__fp, p = fp.player, L = fp.lift; return { x: p.pos.x, z: p.pos.z, y: p.pos.y, yaw: p.yaw, pitch: p.pitch, t: L.t, s: L.s, ridden: L.ridden, where: L.where(), offered: fp.acts.offered?.def?.id || null }; });
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const yawTo = (s, x, z) => Math.atan2(-(x - s.x), -(z - s.z));
let mx = 640, my = 360;
async function turn(dyaw, dpitch) { // the mouse: captured, or the page's drag-to-look fallback
  const SENS = 0.0021, px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (!locked) { mx = 640; my = 360; await page.mouse.move(mx, my); await page.mouse.down(); }
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  if (!locked) await page.mouse.up();
}
async function face(x, z, y) { for (let k = 0; k < 3; k++) { const s = await st(); const dy = wrap(yawTo(s, x, z) - s.yaw), dp = Math.atan2(y - s.y, Math.hypot(x - s.x, z - s.z)) - s.pitch; if (Math.abs(dy) < 0.05 && Math.abs(dp) < 0.05) return; await turn(dy, dp); await sleep(80); } }
async function walkTo(x, z, tol = 0.35) {
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 400; i++) { const s = await st(); if (Math.hypot(x - s.x, z - s.z) < tol) break; const dy = wrap(yawTo(s, x, z) - s.yaw); if (Math.abs(dy) > 0.03) await turn(dy, -s.pitch * 0.5); await sleep(60); }
  await page.keyboard.up('KeyW'); await sleep(300);
}
await walkTo(plan.cageIn.x, plan.cageIn.z);
const lv = await page.evaluate(() => { const v = window.__fp.lift.lever(); return { x: v.x, y: v.y, z: v.z }; });
await face(lv.x, lv.z, lv.y);
for (let i = 0; i < 80 && (await st()).offered !== 'lift-lever'; i++) await sleep(100);
console.log(`lever offered: ${(await st()).offered === 'lift-lever'}`);
if (+throttle > 1) { const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +throttle }); }
// the recorder: every rendered frame, at the moment it is drawn
await page.evaluate(() => {
  const fp = window.__fp, cam = fp.camera, L = fp.lift, comp = fp.post.composer, r0 = comp.render.bind(comp);
  const rec = window.__trace = [];
  comp.render = (...a) => { const c = L.cage.group.matrix.elements; rec.push([fp.time.dt, cam.position.x, cam.position.y, cam.position.z, fp.player.yaw, fp.player.pitch, c[12], c[13], c[14], L.s, L.ridden ? 1 : 0, fp.player.lookQuiet]); return r0(...a); };
});
let frame = 0;
async function shot(what) { frame++; const f = `shots/wip/${prefix}-${String(frame).padStart(2, '0')}-${what}.png`; await page.screenshot({ path: f }); const s = await st(); console.log(`[frame] ${f} t ${s.t.toFixed(1)} s ${s.s.toFixed(1)} yaw ${s.yaw.toFixed(2)} pitch ${s.pitch.toFixed(2)}`); }
await page.keyboard.press('KeyE');
await shot('pressed');
const t0 = (await st()).t;
let next = +every;
for (;;) {
  const s = await st();
  if (s.t - t0 > 2 && !s.ridden) break;
  if (s.t - t0 > 150) { console.log('the ride did not end in 150 s'); break; }
  if (s.t - t0 >= next) { next += +every; await shot(`ride-${Math.round(s.t - t0)}s`); }
  await sleep(100);
}
await shot('top');
const tr = await page.evaluate(() => { const fp = window.__fp; fp.post.composer.render = Object.getPrototypeOf(fp.post.composer).render.bind(fp.post.composer); return window.__trace; });
writeFileSync(`shots/wip/${prefix}-trace.json`, JSON.stringify(tr));
// the ride's frames only
const R = tr.filter((r) => r[10]);
const dts = R.map((r) => r[0]).sort((a, b) => a - b);
const rel = [], dys = [];
let yawMax = 0, yawTot = 0;
for (let i = 1; i < R.length; i++) {
  const a = R[i - 1], b = R[i];
  const ra = [a[1] - a[6], a[2] - a[7], a[3] - a[8]], rb = [b[1] - b[6], b[2] - b[7], b[3] - b[8]];
  rel.push(Math.hypot(rb[0] - ra[0], rb[1] - ra[1], rb[2] - ra[2]));
  dys.push(b[2] - a[2]);
  const dyaw = Math.abs(wrap(b[4] - a[4])); yawMax = Math.max(yawMax, dyaw); yawTot += dyaw;
}
let rev = 0, maxDrop = 0;
for (let i = 1; i < dys.length; i++) if (Math.sign(dys[i]) !== Math.sign(dys[i - 1]) && Math.abs(dys[i] - dys[i - 1]) > 0.001) rev++;
for (const d of dys) maxDrop = Math.min(maxDrop, d);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))] || 0; };
console.log(`ride: ${R.length} frames, dt ${(dts[0] * 1000).toFixed(0)}..${(dts[dts.length - 1] * 1000).toFixed(0)} ms (median ${(pct(dts, 0.5) * 1000).toFixed(0)})`);
console.log(`rel: the eye against its cage, frame to frame: max ${(Math.max(...rel) * 100).toFixed(1)} cm, p95 ${(pct(rel, 0.95) * 100).toFixed(1)} cm`);
console.log(`rev: the eye's height reversed ${rev} times; the largest drop in a frame ${(maxDrop * 100).toFixed(1)} cm`);
console.log(`yaw: the largest turn in a frame ${(yawMax * 180 / Math.PI).toFixed(1)}°, in all ${(yawTot * 180 / Math.PI).toFixed(0)}°`);
if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
await browser.close();
