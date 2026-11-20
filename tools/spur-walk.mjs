#!/usr/bin/env node
// v18-F1: walk each of the wood's spurs (routes.js P57-P59) on the keys, end to end and back, as a visitor does: "Go
// out", the view clicked so the mouse is captured, set down once on the wood way 6 m short of the spur's head, then W
// held, steered (the look turned toward a point 3 m on along the spur's line, as a mouse would) to its end and back to
// its head. Fails on a console error, on a stall (under 1 m made good in 3 s) or on not reaching an end within the time.
// A frame every FRAME_M metres (shots/wip/<prefix>-<q>-<spur>-<leg>-NN.png) and one at each end.
//   node tools/spur-walk.mjs <base> [q=low] [prefix=v18-spurwalk] [spurs=P57,P58,P59] [FRAME_M=12]
import { launch } from './launch.mjs';
const [base0, q = 'low', prefix = 'v18-spurwalk', only = 'P57,P58,P59', fm = '12'] = process.argv.slice(2);
const base = (base0 || process.env.FP_BASE || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const FRAME_M = +fm;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`${base}/?q=${q}&pos=-195,120`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (t) => new Promise((r) => setTimeout(r, t));
await page.click('#begin').catch(() => {});
await sleep(500);
await page.mouse.click(640, 360);
await sleep(800);
await page.evaluate(() => { const s = window.__fp.sky.flicker; s.next = 1e9; s.value = 1; });
const shot = async (name) => {
  const path = `shots/wip/${prefix}-${q}-${name}.png`;
  await page.screenshot({ path });
  return path;
};
let pass = 0, fail = 0;
const check = (ok, label, detail = '') => { if (ok) pass++; else fail++; console.log(ok ? 'PASS' : 'FAIL', label.padEnd(58), detail); };
for (const id of only.split(',')) {
  const line = await page.evaluate((id) => { const L = window.__fp.paths.leads.find((l) => l.id === id); return L ? L.lines[0].map((s) => [s[0], s[1]]) : null; }, id);
  if (!line) { check(false, `${id}: traced`); continue; }
  // stand on the wood way 6 m short of the head, facing it
  const P32 = await page.evaluate(() => window.__fp.paths.leads.find((l) => l.id === 'P32').lines[0].map((s) => [s[0], s[1]]));
  const [hx, hz] = line[0];
  let bi = 0, bd = Infinity; P32.forEach(([x, z], i) => { const d = Math.hypot(x - hx, z - hz); if (d < bd) { bd = d; bi = i; } });
  let si = bi; for (let s = 0; si > 0 && s < 6; si--) s += Math.hypot(P32[si][0] - P32[si - 1][0], P32[si][1] - P32[si - 1][1]);
  const start = P32[si];
  for (const [leg, pts] of [['in', [start, ...line]], ['out', [...line].reverse()]]) {
    if (leg === 'in') await page.evaluate(([x, z, tx, tz]) => { const fp = window.__fp; fp.controls.placeAt(x, z); fp.player.yaw = Math.atan2(-(tx - x), -(tz - z)); fp.player.pitch = -0.04; }, [start[0], start[1], hx, hz]);
    await sleep(300);
    const t0 = Date.now();
    let k = 0, lastFrameS = -1e9, made = 0, stall = 0, lastPos = null, lastGood = Date.now(), reached = false, frames = 0;
    // arc length along pts, and the point `ahead` m on from the nearest
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const len = cum[cum.length - 1];
    const onLine = (x, z) => { let b = Infinity, bs = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)), d = Math.hypot(x - ax - ex * t, z - az - ez * t); if (d < b) { b = d; bs = cum[i] + t * Math.sqrt(l2); } } return { d: b, s: bs }; };
    const at = (s) => { s = Math.min(len, s); let i = 0; while (i < cum.length - 2 && cum[i + 1] < s) i++; const t = (s - cum[i]) / Math.max(1e-6, cum[i + 1] - cum[i]); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; };
    await page.keyboard.down('KeyW');
    let maxOff = 0;
    while (Date.now() - t0 < 120000) {
      const p = await page.evaluate(() => { const p = window.__fp.player.pos; return [p.x, p.z]; });
      const o = onLine(p[0], p[1]);
      maxOff = Math.max(maxOff, o.d);
      if (len - o.s < 1.5) { reached = true; break; }
      const [tx, tz] = at(o.s + 3);
      await page.evaluate(([x, z, tx, tz]) => { const pl = window.__fp.player, a = Math.atan2(-(tx - x), -(tz - z)); let d = a - pl.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); pl.yaw += d * 0.6; }, [p[0], p[1], tx, tz]);
      if (lastPos) { made += Math.hypot(p[0] - lastPos[0], p[1] - lastPos[1]); }
      lastPos = p;
      if (made >= 1) { made = 0; lastGood = Date.now(); }
      stall = Math.max(stall, Date.now() - lastGood);
      if (Date.now() - lastGood > 3000) break;
      if (o.s - lastFrameS >= FRAME_M) { lastFrameS = o.s; await shot(`${id}-${leg}-${String(frames++).padStart(2, '0')}`); }
      await sleep(100);
      k++;
    }
    await page.keyboard.up('KeyW');
    await sleep(200);
    const endShot = await shot(`${id}-${leg}-end`);
    check(reached && stall <= 3000, `${id} ${leg}: walked on the keys to its ${leg === 'in' ? 'doorstep' : 'head'}`, `${((Date.now() - t0) / 1000).toFixed(1)} s, ${len.toFixed(0)} m, longest stall ${(stall / 1000).toFixed(1)} s, ${maxOff.toFixed(2)} m off the line at most, ${frames} frames + ${endShot}`);
  }
}
check(!errors.length, 'no console error', errors[0] || '');
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
