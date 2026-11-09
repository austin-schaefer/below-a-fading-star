#!/usr/bin/env node
// v7 the workers (src/v7/workers.js, world module living-workers): BY the Taker of Altitudes, BZ the Coheirs, CF the
// Sexton of No One. Checks: the Taker sits on an Adust pavement within his site's r 4, facing the sun's azimuth within
// 2 deg; a walker on his line 25 m out lowers the staff within 3 s and, moved off, he starts again; the Coheirs' heads
// start turning on the same frame within 20 m, and not again until the walker has been beyond 30 m; the Sexton stands
// at the current grave; 40 graves open at load; a forced gutter opens one more and he walks to the next; every open
// grave has its colliders; the terrain triangles cut over his block are counted and the Nave's cut still holds; no
// boulder lies on an open slot; the cues fire; stats() within budget (9 calls, 30k triangles; low two thirds).
// Usage: node tools/workers-test.mjs [base=http://localhost:8123] [q=high]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const q = process.argv[3] || 'high';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ` (${info})` : ''}`); ok ? pass++ : fail++; };
await page.goto(`${base}/?q=${q}&pos=0,0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
await page.evaluate(() => {
  document.getElementById('card')?.classList.add('hidden');
  const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0;
  window.__cues = [];
  const a = fp.audio; a.cue = (name, pos, opts) => { window.__cues.push(name + (opts?.start ? ':start' : opts?.stop ? ':stop' : '')); };
  window.__go = (x, z) => { const p = fp.player; p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z); if (p.vel) p.vel.set(0, 0, 0); };
});
const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, arg) => page.evaluate(fn, arg);

// ---- the Taker
const tk = await ev(() => { const t = window.__fp.workers.taker; const d = Math.abs(((t.yaw - t.sunYaw + 3 * Math.PI) % (2 * Math.PI)) - Math.PI); return { seat: t.seat, dyaw: d * 180 / Math.PI }; });
check(!!tk.seat.slab && tk.seat.d <= 4, 'the Taker sits on an Adust pavement slab within r 4 of his site', `slab ${JSON.stringify(tk.seat.slab)} ${tk.seat.d.toFixed(2)} m, ${tk.seat.beetles} beetles on it`);
check(tk.dyaw < 2, 'the Taker faces the sun\'s azimuth within 2 deg', `${tk.dyaw.toFixed(3)} deg`);
await ev(() => { const t = window.__fp.workers.taker; window.__go(t.seat.x + 12, t.seat.z - 12); t.sight(); });
await wait(400);
await ev(() => { const t = window.__fp.workers.taker, p = t.onLine(25); window.__go(p.x, p.z); window.__t0 = performance.now(); });
const lowered = await page.waitForFunction(() => { const S = window.__fp.workers.taker.state; return S.phase === 'wait' && S.staff <= 0.001 ? (performance.now() - window.__t0) / 1000 : false; }, null, { timeout: 8000, polling: 50 }).then((h) => h.jsonValue()).catch(() => null);
check(lowered !== null && lowered <= 3.2, 'on his line 25 m out, the staff is lowered within 3 s (and his hands on the book)', lowered === null ? 'never' : `${lowered.toFixed(2)} s`);
const off = await ev(async () => { const t = window.__fp.workers.taker, p = t.onLine(25); window.__go(p.x + 6, p.z + 16); const t0 = performance.now(); while (performance.now() - t0 < 7000) { await new Promise((r) => setTimeout(r, 50)); if (t.state.phase === 'raise' || t.state.phase === 'sight') return { s: (performance.now() - t0) / 1000, phase: t.state.phase }; } return null; });
check(off && off.s >= 2.8 && off.s <= 4.5, 'moved off the line, he starts again from the raise about 3 s later', off ? `${off.s.toFixed(2)} s` : 'never');

// ---- the Coheirs
await ev(() => { const c = window.__fp.workers.coheirs, s = c.seats[0]; window.__go(s.x + 40, s.z); });
await wait(1500);
const ch = await ev(async () => {
  const c = window.__fp.workers.coheirs, S = c.state, s = c.seats[0], t0 = S.turns;
  window.__go(s.x + 15, s.z - 3);
  let first = null; const tStart = performance.now();
  while (performance.now() - tStart < 3000) { await new Promise((r) => requestAnimationFrame(r)); if (S.phase !== 'work' && first === null) first = { frame: S.frames, turnedAt: S.turnedAt, head: S.head.slice(), turn: S.turn }; if (first && S.frames > first.frame) break; }
  const after = { head: S.head.slice(), frame: S.frames };
  // stay within 20 m through the hold and back: no second turn
  await new Promise((r) => setTimeout(r, 6000));
  const stay = S.turns - t0;
  window.__go(s.x + 36, s.z); await new Promise((r) => setTimeout(r, 1200));
  window.__go(s.x + 15, s.z - 3); await new Promise((r) => setTimeout(r, 1200));
  return { first, after, stay, again: S.turns - t0, knots: S.knots };
});
check(ch.first && ch.after.head[0] !== 0 && ch.after.head[1] !== 0 && Math.sign(ch.after.head[0]) !== 0, 'within 20 m both heads start turning on the same frame (one clock)', ch.first ? `turned at frame ${ch.first.turnedAt}, heads ${ch.after.head.map((h) => (h * 57.3).toFixed(1)).join(', ')} deg on frame ${ch.after.frame}` : 'no turn');
check(ch.stay === 1 && ch.again === 2, 'they turn once per approach: not again within 20 m, again after the walker has been beyond 30 m', `turns ${ch.stay} then ${ch.again}`);

// ---- the Sexton
const sx = await ev(() => {
  const fp = window.__fp, X = fp.workers.sexton, S = X.state, cur = X.current();
  const stand = { x: cur.x + cur.dir * 1.45, z: cur.z };
  const cols = fp.player.colliders;
  const has = (x, z, r) => cols.some((c) => Math.abs(c.x - x) < 1e-3 && Math.abs(c.z - z) < 1e-3 && Math.abs(c.r - r) < 1e-3);
  let missing = 0; const open = X.order.filter((s) => X.ground.uD[s.n] >= 0);
  for (const s of open) if (!has(s.x - 0.5, s.z, 0.55) || !has(s.x + 0.5, s.z, 0.55)) missing++;
  // the terrain's degenerate triangles: the Nave's and ours, and no other change
  const g = fp.terrain.mesh.geometry, idx = g.index.array, P = g.attributes.position.array, R = X.ground.rect, N = fp.sites?.nave || { x: 255, z: 40 };
  let degen = 0, inNave = 0;
  for (let t = 0; t < idx.length; t += 3) if (idx[t + 1] === idx[t] && idx[t + 2] === idx[t]) {
    const x = P[idx[t] * 3], z = P[idx[t] * 3 + 2];
    if (x > R[0] - 1e-3 && x < R[1] + 1e-3 && z > R[2] - 1e-3 && z < R[3] + 1e-3) degen++;
    if (Math.abs(x - N.x) < 24 && Math.abs(z - N.z) < 24) inNave++;
  }
  return { open: X.openCount(), dist: Math.hypot(S.x - stand.x, S.z - stand.z), slot: cur.n, openSlots: open.length, missing, cut: X.ground.cut, nave: fp.nave?.stats?.().terrainCut ?? 0, degen, inNave, cell: g.parameters.width / g.parameters.widthSegments, rect: X.ground.rect, order: X.order.length, blocked: 60 - X.order.length };
});
check(sx.open === 40, '40 graves open at load', `${sx.open} open, the 41st in his order (slot ${sx.slot + 1} of the plan) being dug, ${sx.blocked} slot(s) left unopened under a boulder`);
check(sx.dist < 0.05, 'the Sexton stands at the end of the grave he is digging', `${sx.dist.toFixed(3)} m off`);
check(sx.missing === 0, 'every open grave (and the one being dug) has its two colliders', `${sx.openSlots} graves, ${sx.missing} missing`);
const cells = Math.round((sx.rect[1] - sx.rect[0]) / sx.cell) * Math.round((sx.rect[3] - sx.rect[2]) / sx.cell) * 2;
check(sx.cut === cells && sx.degen === sx.cut && sx.inNave === sx.nave, 'the terrain triangles over the block are taken out and counted; the Nave\'s cut still holds', `${sx.cut} cut (${cells} from the cells), ${sx.degen} out in the block; the Nave's ${sx.nave}, ${sx.inNave} out round it`);
const gt = await ev(async () => {
  const X = window.__fp.workers.sexton, S = X.state, n0 = X.openCount(), c0 = X.current().n;
  window.__go(S.x + 30, S.z - 25);
  X.gutter();
  const t0 = performance.now(); while (performance.now() - t0 < 12000 && S.phase !== 'dig') await new Promise((r) => setTimeout(r, 100));
  const cur = X.current(), stand = { x: cur.x + cur.dir * 1.45, z: cur.z };
  return { n0, n1: X.openCount(), c0, c1: cur.n, dist: Math.hypot(S.x - stand.x, S.z - stand.z), s: (performance.now() - t0) / 1000, gutters: S.gutters };
});
check(gt.n1 === gt.n0 + 1 && gt.c1 !== gt.c0 && gt.dist < 0.05, 'a forced gutter adds one open grave and he walks on to the next slot', `${gt.n0} -> ${gt.n1} open, slot ${gt.c0 + 1} -> ${gt.c1 + 1}, there in ${gt.s.toFixed(1)} s`);
const rk = await ev(() => {
  const fp = window.__fp, X = fp.workers.sexton, m = new fp.THREE.Matrix4(), p = new fp.THREE.Vector3(), qq = new fp.THREE.Quaternion(), s = new fp.THREE.Vector3(), on = [];
  fp.scene.traverse((o) => { if (o.isInstancedMesh && /^rocks-(boulder|stone)-\d+$/.test(o.name)) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.decompose(p, qq, s); for (const sl of X.order) if (X.ground.uD[sl.n] >= 0 && Math.abs(p.x - sl.x) < 1.0 && Math.abs(p.z - sl.z) < 0.4) on.push([o.name, +p.x.toFixed(1), +p.z.toFixed(1)]); } });
  return on;
});
check(rk.length === 0, 'no boulder or stone lies in an open grave (a boulder on a slot leaves it unopened)', rk.length ? JSON.stringify(rk) : '');
// cues: wait a full Taker cycle near enough, the Coheirs at work within 25 m, the Sexton digging
const cues = await ev(async () => {
  const W = window.__fp.workers; window.__cues.length = 0;
  const c = W.coheirs.seats[0]; window.__go(c.x + 40, c.z); await new Promise((r) => setTimeout(r, 800)); window.__go(c.x + 22, c.z + 3); await new Promise((r) => setTimeout(r, 6500));
  window.__go(W.sexton.state.x + 30, W.sexton.state.z - 25); await new Promise((r) => setTimeout(r, 3500));
  const t = W.taker; window.__go(t.seat.x + 10, t.seat.z - 20); t.sight(); await new Promise((r) => setTimeout(r, 9500));
  return [...new Set(window.__cues)];
});
const want = ['taker-click', 'taker-murmur', 'coheirs-hum:start', 'coheirs-hum:stop', 'coheirs-knot', 'sexton-bite', 'sexton-throw'];
check(want.every((w) => cues.includes(w)), 'the cues fire: ' + want.join(', '), cues.join(' '));
const st = await ev(() => window.__fp.workers.stats());
const capT = q === 'low' ? 20000 : 30000;
check(st.calls <= 9 && st.tris <= capT, `stats() within budget (9 calls, ${capT} triangles at ${q})`, `${st.calls} calls, ${st.tris} tris: Taker ${st.taker.tris}, Coheirs ${st.coheirs.tris}, Sexton ${st.sexton.figure} + turf ${st.sexton.turf} + graves ${st.sexton.pits}`);
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
console.log(`${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
