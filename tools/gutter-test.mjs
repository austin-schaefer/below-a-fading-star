#!/usr/bin/env node
// Sun-gutter timing test: loads ?q=low&only=sky&gutter=12,20, runs 60 s of the sky's update synchronously at dt 1/60
// from the state at ready, samples __fp.sky.flicker.value every 0.1 s, and checks that gutters recur, last 12-16 s (first dip under 0.9 to recovery above 0.9), hold the
// floor (under 0.35) for 6.5-9 s (a pinned 12 s gutter holds about 7), and keep the unchanged ramps (floor within ~1.4 s of the dip, ~2.5 s back);
// then 4 s on the real frame loop: a gutter started there falls on the page's clock (the countdown at real time, the dip and the floor).
// v16-S1 (#78): then an unpinned load (?q=low&only=sky): the first gutter's countdown is held behind the title card, and after
// 'begin' the first gutter comes 60-120 s on (none in the first 60 s, one by 120 s), the same second on every visit.
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
// The statistics: 60 s of the sky's own update (sky.js's update, the function the frame loop calls each frame), run
// synchronously at dt = 1/60 from the state the page reached at ready, sampled every sixth step (0.1 s). dt stays
// 1/60: the value eases with min(1, dt * 6). The frame loop cannot run in between: this is one task.
const samples = await page.evaluate(() => {
  const sky = window.__fp.sky, f = sky.flicker, out = [], DT = 1 / 60;
  let t = window.__fp.time.t;
  for (let i = 1; i <= 3600; i++) { t += DT; sky.update(DT, t); if (i % 6 === 0) out.push([i * DT, f.value]); }
  return out;
});
// Then the real loop: the frame loop feeds the sky real time. Start a gutter now and sample the value on the page's own
// clock every 100 ms for 4 s: the countdown to the next falls as the clock does, and the value leaves 1, reaches the
// floor within about 1.4 s and holds it, as the 60 s above say it should.
const live = await page.evaluate(() => new Promise((resolve) => {
  const sky = window.__fp.sky, f = sky.flicker, out = [];
  // let a gutter still running at the end of the 60 s finish first (the same update, synchronously, unsampled)
  let t = window.__fp.time.t;
  while (f.phase > 0) { t += 1 / 60; sky.update(1 / 60, t); }
  const t0 = performance.now();
  f.next = 0;
  let next0 = null;
  const id = setInterval(() => {
    const t = (performance.now() - t0) / 1000;
    if (next0 === null && f.phase > 0) next0 = [t, f.next];
    out.push([t, f.value]);
    if (t >= 4) { clearInterval(id); resolve({ out, next0, next1: [t, f.next], phase: f.phase }); }
  }, 100);
}));
// v16-S1: the unpinned first gutter
await page.goto(`${base}/?q=low&only=sky`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const first = await page.evaluate(() => {
  const fp = window.__fp, sky = fp.sky, f = sky.flicker, DT = 1 / 60;
  let t = fp.time.t;
  const run = (secs) => { let min = 1, dipAt = null; for (let i = 0; i < secs * 60; i++) { t += DT; sky.update(DT, t); if (f.value < min) min = f.value; if (dipAt == null && f.value < 0.9) dipAt = i * DT; } return { min, dipAt }; };
  const next0 = f.next, out0 = f.out;
  const card = run(30); // 30 s on the title card
  const nextCard = f.next;
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const nextBegin = f.next;
  const early = run(59.5);
  const late = run(61);
  return { next0, out0, nextCard, nextBegin, cardMin: card.min, earlyMin: early.min, lateDip: late.dipAt, lateMin: late.min };
});
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
// the real-time segment
{
  const firstDip = live.out.find(([, v]) => v < 0.9), firstFloor = live.out.find(([, v]) => v < 0.35);
  const real = live.next1[0] - live.next0[0], fed = live.next0[1] - live.next1[1];
  console.log(`      live: dip at ${firstDip?.[0].toFixed(2)} s, floor at ${firstFloor?.[0].toFixed(2)} s; the countdown fell ${fed.toFixed(2)} s in ${real.toFixed(2)} s of the page's clock`);
  check(!!live.next0 && Math.abs(fed - real) <= 0.2 * real, `under the frame loop the sky runs on real time (its countdown fell ${fed.toFixed(2)} s in ${real.toFixed(2)} s)`);
  check(!!firstDip && !!firstFloor && firstFloor[0] - firstDip[0] <= 1.6 && live.out.filter(([t]) => t >= firstFloor[0]).every(([, v]) => v < 0.5), `under the frame loop a gutter dips, reaches the floor within about 1.4 s and stays down (under 0.5: the floor shudders to about 0.41) (${firstDip?.[0].toFixed(2)} s to ${firstFloor?.[0].toFixed(2)} s)`);
}
{
  console.log(`      first gutter (unpinned): countdown ${first.next0.toFixed(2)} s at ready; ${first.nextCard.toFixed(2)} after 30 s on the card; dip ${first.lateDip == null ? 'none' : (59.5 + first.lateDip).toFixed(1) + ' s'} after begin`);
  check(first.out0 === false && first.nextCard === first.next0 && first.cardMin >= 0.99, `the first gutter's countdown waits behind the title card (${first.next0.toFixed(2)} s before and after 30 s there)`);
  check(first.nextBegin >= 60 && first.nextBegin <= 120, `the first gutter is set 60-120 s after begin (${first.nextBegin.toFixed(2)})`);
  check(first.earlyMin >= 0.9, `no gutter in the first 59.5 s after begin (min ${first.earlyMin.toFixed(2)})`);
  check(first.lateDip != null && first.lateMin < 0.35, `the first gutter comes by 120 s after begin and reaches the floor (min ${first.lateMin.toFixed(2)})`);
  check(Math.abs(first.next0 - 87.47) < 0.01, `the first gutter's second is the same every visit (the gutter's own stream: ${first.next0.toFixed(2)})`);
}
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
console.log(fails ? `FAIL: ${fails} check(s) failed` : 'PASS: all checks');
process.exit(fails ? 1 : 0);
