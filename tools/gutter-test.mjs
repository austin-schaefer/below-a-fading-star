#!/usr/bin/env node
// Sun-gutter timing test: loads ?q=low&only=sky&gutter=12,20, samples __fp.sky.flicker.value every 100 ms
// for 60 s and checks that gutters recur, last 12-16 s (first dip under 0.9 to recovery above 0.9), hold the
// floor (under 0.35) for 6.5-9 s (a pinned 12 s gutter holds about 7), and keep the unchanged ramps (floor within ~1.4 s of the dip, ~2.5 s back).
// Usage: node tools/gutter-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=low&only=sky&gutter=12,20`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
// sample on the page's own clock so a slow headless frame rate cannot skew the timing
const samples = await page.evaluate(() => new Promise((resolve) => {
  const out = [], t0 = performance.now();
  const id = setInterval(() => {
    const t = (performance.now() - t0) / 1000;
    out.push([t, window.__fp.sky.flicker.value]);
    if (t >= 60) { clearInterval(id); resolve(out); }
  }, 100);
}));
await browser.close();
// carve out gutters: from first dip under 0.9 to the first recovery above 0.9 afterwards
const gutters = [];
let cur = null;
for (const [t, v] of samples) {
  if (!cur && v < 0.9) cur = { start: t, min: v, floorT: 0, firstFloor: null, lastFloor: null, recover: null };
  if (cur) {
    cur.min = Math.min(cur.min, v);
    if (v < 0.35) { if (cur.firstFloor == null) cur.firstFloor = t; cur.lastFloor = t; cur.floorT += 0.1; }
    if (cur.firstFloor != null && v > 0.9) { cur.end = t; gutters.push(cur); cur = null; }
  }
}
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails++; };
check(gutters.length >= 2, `at least two gutters in 60 s (saw ${gutters.length})`);
gutters.forEach((g, i) => {
  const len = g.end - g.start, down = g.firstFloor - g.start, up = g.end - g.lastFloor;
  console.log(`      #${i + 1}: start ${g.start.toFixed(1)} s, length ${len.toFixed(2)} s, floor held ${g.floorT.toFixed(2)} s (under 0.35), min ${g.min.toFixed(2)}, down ${down.toFixed(2)} s, up ${up.toFixed(2)} s`);
  // ?gutter=12,20 pins the nominal length at 12 s; dip-to-recovery at the 0.9 crossings reads about a second less (the ramps start and end soft)
  check(len >= 10.5 && len <= 16, `gutter ${i + 1} lasts 12 s nominal, 10.5-16 s measured at 0.9 (${len.toFixed(2)})`);
  check(g.floorT >= 6.5 && g.floorT <= 9, `gutter ${i + 1} floor held 6.5-9 s (${g.floorT.toFixed(2)})`);
  check(down <= 1.6, `gutter ${i + 1} reaches the floor within about 1.4 s of the dip (${down.toFixed(2)})`);
  check(up >= 0.5 && up <= 3.0, `gutter ${i + 1} recovers over about 2.5 s (${up.toFixed(2)})`);
});
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
console.log(fails ? `FAIL: ${fails} check(s) failed` : 'PASS: all checks');
process.exit(fails ? 1 : 0);
