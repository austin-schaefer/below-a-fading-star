#!/usr/bin/env node
// Sun-gutter timing test: loads ?q=low&only=sky&gutter=12,20, runs 60 s of the sky's update synchronously at dt 1/60
// from the state at ready, samples __fp.sky.flicker.value every 0.1 s, and checks that gutters recur, last 12-16 s (first dip under 0.9 to recovery above 0.9), hold the
// floor (under 0.35) for 6.5-9 s (a pinned 12 s gutter holds about 7), and keep the unchanged ramps (floor within ~1.4 s of the dip, ~2.5 s back);
// then 4 s on the real frame loop: a gutter started there falls on the page's clock (the countdown at real time, the dip and the floor).
// v16-S1 (#78): then an unpinned load (?q=low&only=sky): the first gutter's countdown is held behind the title card, and after
// 'begin' the first gutter comes 60-120 s on (none in the first 60 s, one by 120 s), the same second on every visit.
// v16-S2: the readings soon, slow, after and lampsAt (the wave outward from the eye); a gutter brought forward before
// 'begin' comes; ?gutter=v3 runs from ready.
// Usage: node tools/gutter-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
  // the readings the answers use (v16-S1): dark at once, lamps a hand's lag behind it and slow to go back
  while (f.phase > 0) run(1 / 60);
  f.next = 0; run(1 / 60);
  const len = f.len, at = (s) => { run(s); return { dark: f.dark, lamps: f.lamps }; };
  const r1 = at(1.0), r2 = at(0.5), r45 = at(3.0), rCatch = (run(Math.max(0, len - 4.5 + 0.2)), { dark: f.dark, lamps: f.lamps }), rAfter = at(2), rLate = at(20);
  // v16-S2: the readings of the second round: soon (the air holds its breath before the onset), slow (the stored
  // warmth), after (the relief), and lampsAt (the lights answer outward from the eye: near before far)
  run(30);
  const cam = fp.camera.position, near = [cam.x + 10, cam.z], far = [cam.x + 250, cam.z];
  f.next = 5; const soon0 = (run(0.5), f.soon); run(2.5); const soon3 = f.soon; run(2.2); const soonOn = f.soon, slow0 = f.slow;
  run(3); const slow3 = f.slow, wave = []; for (let i = 0; i < 90; i++) { run(0.1); wave.push([f.lampsAt(...near), f.lampsAt(...far)]); }
  const nearUp = wave.findIndex((w) => w[0] > 0.5), farUp = wave.findIndex((w) => w[1] > 0.5);
  while (f.phase > 0) run(1 / 60);
  run(0.3); const after0 = f.after, soonGone = f.soon; run(6); const after6 = f.after;
  // v16-S3: the warm flush on the screen never steps: its change per frame stays small at 60 and at 20 fps, it peaks
  // near 1 and is gone after
  const flushRun = (fps) => {
    const d = 1 / fps; let prev = f.flush, maxStep = 0, peak = 0; f.next = 0;
    for (let i = 0; i < 40 * fps; i++) { t += d; sky.update(d, t); maxStep = Math.max(maxStep, Math.abs(f.flush - prev)); prev = f.flush; peak = Math.max(peak, f.flush); }
    return { maxStep, peak, end: f.flush };
  };
  while (f.phase > 0) run(1 / 60);
  const fl60 = flushRun(60), fl20 = flushRun(20);
  return { fl60, fl20, next0, out0, nextCard, nextBegin, cardMin: card.min, earlyMin: early.min, lateDip: late.dipAt, lateMin: late.min, lamps: { r1, r2, r45, rCatch, rAfter, rLate },
    s2: { soon0, soon3, soonOn, slow0, slow3, nearUp, farUp, after0, soonGone, after6 } };
});
// v16-S2: a gutter brought forward without 'begin' (an act, a test) comes: setting next lower sets out
await page.goto(`${base}/?q=low&only=sky`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const fwd = await page.evaluate(() => {
  const fp = window.__fp, sky = fp.sky, f = sky.flicker; let t = fp.time.t, min = 1;
  const out0 = f.out; f.next = 2;
  for (let i = 0; i < 6 * 60; i++) { t += 1 / 60; sky.update(1 / 60, t); min = Math.min(min, f.value); }
  return { out0, out1: f.out, min };
});
// and ?gutter=v3 restores the old: it runs from ready, its first one of its own intervals (70-150 s) on
await page.goto(`${base}/?q=low&only=sky&gutter=v3`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const v3 = await page.evaluate(() => { const f = window.__fp.sky.flicker; return { out: f.out, next: f.next, len: f.timing.len }; });
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
{
  const L = first.lamps, n = (r) => `dark ${r.dark.toFixed(2)} lamps ${r.lamps.toFixed(2)}`;
  console.log(`      readings: 1 s ${n(L.r1)}; 4.5 s ${n(L.r45)}; caught ${n(L.rCatch)}; 2 s after ${n(L.rAfter)}; 22 s after ${n(L.rLate)}`);
  check(L.r1.dark > 0.2 && L.r1.lamps < 0.05, `the lamps are not yet turned up 1 s into a gutter, while the dark has come (${n(L.r1)})`);
  check(L.r45.dark > 0.9 && L.r45.lamps > 0.85, `4.5 s in, the dark is full and the lamps are turned up (${n(L.r45)})`);
  check(L.rAfter.dark === 0 && L.rAfter.lamps > 0.3, `2 s after the sun has caught the lamps are still up, going down slowly (${n(L.rAfter)})`);
  check(L.rLate.lamps < 0.02, `and are down by 22 s after (${n(L.rLate)})`);
}
{
  const S = first.s2;
  console.log(`      v16-S2 readings: soon ${S.soon0.toFixed(2)} 4.5 s before, ${S.soon3.toFixed(2)} 2 s before, ${S.soonOn.toFixed(2)} in; slow ${S.slow0.toFixed(2)} at 0.2 s, ${S.slow3.toFixed(2)} at 3.2 s; lamps up at 10 m after ${S.nearUp} and at 250 m after ${S.farUp} tenths; after ${S.after0.toFixed(2)} at the catch, ${S.after6.toFixed(2)} 6 s on`);
  check(S.soon0 < 0.05 && S.soon3 > 0.3 && S.soon3 < 0.8 && S.soonOn === 1, `the air holds its breath over the four seconds before the onset (soon ${S.soon0.toFixed(2)}, ${S.soon3.toFixed(2)}, ${S.soonOn.toFixed(2)})`);
  check(S.slow0 < 0.1 && S.slow3 > 0.6, `the stored warmth comes up over about three seconds (slow ${S.slow0.toFixed(2)} to ${S.slow3.toFixed(2)})`);
  check(S.nearUp >= 0 && S.farUp > S.nearUp + 20, `the lights answer outward from the eye: 10 m off up ${S.nearUp / 10} s before 250 m off (${S.farUp / 10} s)`);
  check(S.after0 > 0.4 && S.after6 === 0 && S.soonGone === 0, `the relief: after is up as the sun catches (from dark under 0.5; 0.3 s after the gutter ends), gone 6 s on, and soon gone with the gutter (${S.after0.toFixed(2)}, ${S.after6.toFixed(2)}, soon ${S.soonGone})`);
  console.log(`      flush: max step ${first.fl60.maxStep.toFixed(4)} at 60 fps, ${first.fl20.maxStep.toFixed(4)} at 20 fps; peak ${first.fl60.peak.toFixed(2)}, ${first.fl20.peak.toFixed(2)}`);
  check(first.fl60.maxStep <= 0.02 && first.fl20.maxStep <= 0.06 && first.fl60.peak > 0.95 && first.fl20.peak > 0.95 && first.fl60.end === 0 && first.fl20.end === 0, `the warm flush rises over about a second and never steps: max change per frame ${first.fl60.maxStep.toFixed(3)} at 60 fps, ${first.fl20.maxStep.toFixed(3)} at 20 fps, peak ${first.fl60.peak.toFixed(2)}, gone after`);
  check(fwd.out0 === false && fwd.out1 === true && fwd.min < 0.4, `a gutter brought forward before 'begin' (an act) comes: out ${fwd.out0} to ${fwd.out1}, min ${fwd.min.toFixed(2)}`);
  check(v3.out === true && v3.next >= 70 && v3.next <= 150 && v3.len[0] === 6.5, `?gutter=v3 runs from ready, its first ${v3.next.toFixed(1)} s on (70-150), 6.5-9 s long`);
}
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
console.log(fails ? `FAIL: ${fails} check(s) failed` : 'PASS: all checks');
process.exit(fails ? 1 : 0);
