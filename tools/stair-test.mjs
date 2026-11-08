#!/usr/bin/env node
// Stair glide: walks the Great Span's west stair up and back down, and the Hypogeum's steps down and
// back up, at walking speed in 60 Hz ticks, and reports the largest per-frame change of the eye's height
// (the camera without its bob) and where the feet end. Usage: node tools/stair-test.mjs [url] [--json]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 120000 });
const R = await page.evaluate(() => {
  const fp = window.__fp, p = fp.player, DT = 1 / 60;
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const eyeY = () => (p.eyeY ?? p.pos.y); // the camera's height without the bob
  // walk the waypoints; record the eye per tick while the feet are inside [lo, hi] (the stair)
  const walk = (pts, lo, hi) => {
    p.keys.clear(); p.keys.add('KeyW');
    let i = 0, prev = eyeY(), maxDy = 0, fell = 0, ticks = 0;
    for (let t = 0; t < 20000 && i < pts.length; t++) {
      const [tx, tz] = pts[i], dx = tx - p.pos.x, dz = tz - p.pos.z;
      if (Math.hypot(dx, dz) < 0.5) { i++; continue; }
      p.yaw = Math.atan2(-dx, -dz);
      fp.controls.update(DT);
      const e = eyeY(), f = p.pos.y - p.eye;
      if (f > lo && f < hi) { maxDy = Math.max(maxDy, Math.abs(e - prev)); if (!p.onGround) fell++; ticks++; }
      prev = e;
    }
    p.keys.clear();
    for (let t = 0; t < 30; t++) fp.controls.update(DT); // settle
    return { done: i === pts.length, maxDy: +maxDy.toFixed(3), airTicks: fell, ticks, feet: { x: +p.pos.x.toFixed(2), y: +(p.pos.y - p.eye).toFixed(3), z: +p.pos.z.toFixed(2) } };
  };
  const out = {};
  if (fp.span) {
    const S = fp.span.stairs.west;
    const route = [[-205, 200], [-236, 200], [-239.5, 197], [-239.5, 193], [-236, 193], [-208, 193], [-204.5, 190], [-204.5, 186], [-208, 186], [-243, 186], [-246.5, 186], [-246.5, 207]];
    fp.controls.placeAt(S.foot.x + 3, S.foot.z); p.vel.set(0, 0, 0);
    const lo = S.foot.y + 0.1, hi = 55.9;
    out.spanUp = walk(route, lo, hi);
    out.spanDown = walk(route.slice().reverse().concat([[S.foot.x + 3, S.foot.z]]), lo, hi);
  }
  const L = fp.landmarks.hypogeum;
  fp.controls.placeAt(L.x - 9, L.z); p.vel.set(0, 0, 0);
  const top = p.pos.y - p.eye;
  out.hypDown = walk([[L.x - 6, L.z], [L.x + 3, L.z]], top - 4.2, top - 0.05);
  out.hypUp = walk([[L.x - 9, L.z]], top - 4.2, top - 0.05);
  return out;
});
await browser.close();
const pass = (r) => r && r.done && r.maxDy <= 0.08 && r.airTicks === 0;
const checks = [
  ['the Span\'s west stair, up: the eye moves at most 0.08 m a frame and the feet stay on the treads', pass(R.spanUp)],
  ['the Span\'s west stair, down: likewise', pass(R.spanDown)],
  ['the Hypogeum\'s steps, down: likewise', pass(R.hypDown)],
  ['the Hypogeum\'s steps, up: likewise', pass(R.hypUp)],
  ['no page errors', errors.length === 0],
];
let fail = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
console.log(JSON.stringify(R));
if (errors.length) console.log(errors.join('\n'));
process.exit(fail ? 1 : 0);
