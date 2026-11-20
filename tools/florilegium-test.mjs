#!/usr/bin/env node
// v18-F2: the Florilegium's likenesses turn their heads to whoever walks round the house (src/v18/florilegium.js,
// makeTurner). Checks, from the live page on low, with a turner of its own over the built heads (the walk is stepped
// here, not by the frame loop): after a half circle of the walk-round path, and after a circle and a half, every head
// is within its lag of the visitor (the bearing's rate times the head's pace, and a little); stood still 5 s, every
// head is on the visitor; no head's turn from rest ever leaves -pi..pi (nothing winds up); 8 s still and they are back
// on the flask. Then the same through the page's own update and the material's uniform, the distance cull, and the
// fallen panes along the spur.
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
// through the page's own update: the visitor is set down round a half circle of the walk-round, a step every 150 ms,
// then stands 6 s (shuffling); the heading each head is drawn at is read from the Vector4s the material was built over (uTurn[slot]:
// x the turn from rest, z the rest heading) on the likenesses' mesh, and held against the bearing from that head to the
// camera. Then the distance cull: from 260 m nothing of the house is visible; back at the door, all of it.
const live = res.missing ? null : await page.evaluate(async () => {
  const fp = window.__fp, F = fp.florilegium, wait = (ms) => new Promise((r) => setTimeout(r, ms)), R = 7.4;
  const U = F.uTurn; // (the Vector4s the likenesses' material was built over: likenessMaterial(uTurn))
  for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI; fp.controls.placeAt(F.centre.x + Math.cos(a) * R, F.centre.z + Math.sin(a) * R); await wait(150); }
  for (let i = 0; i < 12; i++) { fp.controls.placeAt(F.centre.x - R + (i % 2) * 0.3, F.centre.z); await wait(500); }
  const c = fp.camera.position, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const heads = F.heads.map((h) => ({ slot: h.slot, err: +Math.abs(wrap(U[h.slot].z + U[h.slot].x - Math.atan2(c.x - h.at[0], c.z - h.at[2]))).toFixed(3) }));
  const mode = F.turn.mode;
  fp.controls.placeAt(F.centre.x + 260, F.centre.z); await wait(700);
  const far = Object.entries(F.meshes).filter(([k, m]) => k !== 'shards' && m.visible).map(([k]) => k), farLights = F.lights.filter((l) => l.visible).length;
  fp.controls.placeAt(F.centre.x + 9, F.centre.z); await wait(700);
  const near = Object.entries(F.meshes).filter(([k, m]) => !m.visible).map(([k]) => k), nearLights = F.lights.filter((l) => l.visible).length;
  const culled = [F.meshes.halo, F.meshes.haze].every((m) => m.frustumCulled && m.geometry.boundingSphere && m.geometry.boundingSphere.radius > 5);
  return { heads, mode, far, farLights, near, nearLights, lights: F.lights.length, culled, shards: F.shards.map((s) => ({ ...s, x: +s.x.toFixed(1), z: +s.z.toFixed(1), y: +s.y.toFixed(2) })) };
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
  check(live.mode === 'visitor' && live.heads.every((h) => h.err <= 0.2), 'through the page\'s update: after a half circle and 6 s stood, every head is drawn within 0.2 rad of the camera (uTurn[slot] against the bearing)', `${live.mode} ${live.heads.map((h) => `${h.slot}:${h.err}`).join(' ')}`);
  check(!live.far.length && !live.farLights, 'from 260 m nothing of the house is drawn and no light of its is lit', `visible: ${live.far.join(' ') || 'none'}; lights ${live.farLights}`);
  check(!live.near.length && live.nearLights === live.lights && live.lights <= 3, 'at the door all of it is drawn, with at most three lights', `hidden: ${live.near.join(' ') || 'none'}; lights ${live.nearLights} of ${live.lights}`);
  check(live.culled, 'the halo and the haze are frustum-culled with real bounds');
  check(live.shards.length >= 3 && new Set(live.shards.map((s) => s.pane)).size === live.shards.length, 'fallen panes lie along the spur from the road, each a different colour', JSON.stringify(live.shards));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
