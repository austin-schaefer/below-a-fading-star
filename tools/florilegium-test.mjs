#!/usr/bin/env node
// v18-F2: the Florilegium's likenesses turn their heads to whoever walks round the house (src/v18/florilegium.js,
// makeTurner). Checks, from the live page on low, with a turner of its own over the built heads (the walk is stepped
// here, not by the frame loop): after a half circle of the walk-round path, and after a circle and a half, every head
// is within its lag of the visitor (the bearing's rate times the head's pace, and a little); stood still 5 s, every
// head is on the visitor; no head's turn from rest ever leaves -pi..pi (nothing winds up); 8 s still and they are back
// on the flask.
// Usage: node tools/florilegium-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { launch } from './launch.mjs';
const base = (process.argv[2] || process.env.FP_BASE || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`${base}/?q=low&pos=-250,126`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const res = await page.evaluate(async () => {
  const F = window.__fp.florilegium;
  if (!F) return { missing: true };
  const { makeTurner } = await import('/src/v18/florilegium.js');
  const uTurn = Array.from({ length: 8 }, () => ({ set() {} }));
  const T = makeTurner(F.heads, F.flask, uTurn), R = 7.4, SPEED = 1.4, DT = 1 / 30, eyeY = F.floor + 1.7;
  const eye = { x: 0, y: eyeY, z: 0 };
  let a = 0, wound = 0;
  const step = (da) => { a += da; eye.x = F.centre.x + Math.cos(a) * R; eye.z = F.centre.z + Math.sin(a) * R; T.update(DT, eye, 0); for (const s of T.S) wound = Math.max(wound, Math.abs(s.yaw)); };
  const walk = (turns) => { for (let i = 0, n = Math.round((turns * 2 * Math.PI * R) / SPEED / DT); i < n; i++) step((SPEED * DT) / R); };
  const errs = () => T.S.map((s) => ({ slot: s.h.slot, err: +(s.err || 0).toFixed(3), lag: +((SPEED / (R - 3.4)) * s.tau + 0.12).toFixed(3) }));
  step(0); step(1e-3);
  walk(0.5); const half = { mode: T.mode, heads: errs() };
  walk(1); const more = { mode: T.mode, heads: errs() };
  // stood (a shuffle a second keeps them on the visitor)
  for (let i = 0; i < 150; i++) step(i % 30 === 0 ? 0.02 : 0);
  const stood = { mode: T.mode, heads: errs() };
  for (let i = 0; i < 300; i++) step(0);
  return { n: T.S.length, half, more, stood, wound: +wound.toFixed(3), after: T.mode };
});
await browser.close();
let pass = 0, fail = 0;
const check = (ok, name, note = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${note ? '  ' + note : ''}`); ok ? pass++ : fail++; };
check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
if (res.missing) check(false, 'the Florilegium is built (ctx.florilegium)');
else {
  const row = (r) => r.heads.map((h) => `${h.slot}:${h.err}/${h.lag}`).join(' ');
  check(res.n >= 7, 'the likenesses have heads to turn (six people, seven heads, and the sprout)', `${res.n} heads`);
  check(res.half.mode === 'visitor' && res.half.heads.every((h) => h.err <= h.lag), 'after a half circle of the walk-round, every head is within its lag of the visitor', row(res.half));
  check(res.more.mode === 'visitor' && res.more.heads.every((h) => h.err <= h.lag), 'after a circle and a half, the same (nothing has wound up)', row(res.more));
  check(res.stood.mode === 'visitor' && res.stood.heads.every((h) => h.err <= 0.12), 'stood 5 s, every head is on the visitor (within 0.12 rad)', row(res.stood));
  check(res.wound <= Math.PI + 1e-3, 'no head\'s turn from rest leaves -pi..pi', `worst ${res.wound} rad`);
  check(res.after === 'flask', 'left alone 10 s, they turn back to the flask', res.after);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
