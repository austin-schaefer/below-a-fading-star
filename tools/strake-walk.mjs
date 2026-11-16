#!/usr/bin/env node
// The Strake walked the way a visitor walks it (v15-V1): load on the flags, "Go out", the mouse captured by a click,
// then each route on the keys (W held, steering with the mouse), a frame every metre looking where they walk and one
// with the head turned (left and right by turns), 960 x 540 into shots/wip/<prefix>-<route>-NN-<a|l|r>.png. Routes
// are read from the row's own records (ctx.village.row), never typed in: `roof` (up the Late house's stair, across its
// landing and round its roof yard), `carrier`, `elder`, `new` (in at each door that can be entered, to the back of
// the room, and out again), `street` (the flags from end to end). A line a frame: the eye, the floor under it, and
// STUCK where three seconds of walking moved them less than 0.2 m (a finding, not a crash). Frames on the page's own
// clock. Exits 1 when a route did not reach its end.
// Usage: node tools/strake-walk.mjs [base] [routes=roof,carrier,elder,new,street] [prefix=v15-walk]   Q=medium
import { chromium } from 'playwright'; // npm install --no-save playwright@1.63.0 in the worktree (the wilderness skill)
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const routes = (process.argv[3] || 'roof,carrier,elder,new,street').split(',');
const prefix = process.argv[4] || 'v15-walk';
const Q = process.env.Q || 'medium';
const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chromium', args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
await page.clock.install();
const wait = async () => { for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !!window.__fp?.village && !document.getElementById('begin').disabled)); i++) await page.clock.runFor(200); };
await page.goto(`${base}/?q=${Q}${process.env.EXTRA || ''}`, { waitUntil: 'load', timeout: 120000 }); await wait();
// the routes, from the records: [[x, z, y?], ...] (y: the floor the walker should be on when they get there)
const plan = await page.evaluate(() => {
  const V = window.__fp.village.row, F = V.frame, out = {}, f = F.face, t = [f[1], -f[0]]; // t: along the street (to the right of someone facing the fronts)
  const by = (k) => V.records.find((r) => r.kind === k);
  if (by('late').floors.some((q) => q.steps)) { const R = by('late'), fl = R.floors.find((q) => q.steps), roof = R.floors.filter((q) => q.layer === 1 && !q.steps).sort((a, b) => b.w * b.d - a.w * a.d), dir = [Math.sin(fl.yaw), Math.cos(fl.yaw)];
    const foot = [fl.x - dir[0] * (fl.d / 2 + 0.3), fl.z - dir[1] * (fl.d / 2 + 0.3)], top = [fl.x + dir[0] * (fl.d / 2 + 0.5), fl.z + dir[1] * (fl.d / 2 + 0.5)], Rf = roof[0], c = Math.cos(Rf.yaw), s = Math.sin(Rf.yaw), P = (lx, lz) => [Rf.x + lx * c + lz * s, Rf.z - lx * s + lz * c, Rf.y];
    const inYard = P(Rf.w * 0.3 * Math.sign((top[0] - Rf.x) * c - (top[1] - Rf.z) * s), Rf.d * 0.3); // (the first step off the landing, over the wall's head)
    out.roof = [[foot[0] + f[0] * 1.2 - dir[0] * 1.5, foot[1] + f[1] * 1.2 - dir[1] * 1.5], foot, [...top, fl.y1], inYard, ...(V.frame.viaPlan ? [P(0, -Rf.d * 0.28), P(-Rf.w * 0.36, -Rf.d * 0.3), P(Rf.w * 0.3, -Rf.d * 0.3), P(0, -Rf.d * 0.1), inYard] /* (against the riser the bed and the line are along the front: round the back) */ : [P(0, Rf.d * 0.3), P(-Rf.w * 0.38, Rf.d * 0.3), P(-Rf.w * 0.38, -Rf.d * 0.05), P(Rf.w * 0.3, Rf.d * 0.32)]), [...top, fl.y1], foot];
    // and from the roof on over its back edge onto the tread behind, where the house stands against a riser
    if (window.__fp.lappet && window.__fp.lappet.on !== false && V.frame.viaPlan) out.tread = [[foot[0] + f[0] * 1.2 - dir[0] * 1.5, foot[1] + f[1] * 1.2 - dir[1] * 1.5], foot, [...top, fl.y1], inYard, P(0, -Rf.d * 0.1), P(0, -Rf.d / 2 - 1.8).slice(0, 2), P(Rf.w * 0.6, -Rf.d / 2 - 2.2).slice(0, 2)]; /* (the tread's own height is the plan's to say: no floor asked for there) */ }
  for (const k of ['carrier', 'elder', 'new', 'undercroft']) { const R = by(k), d = R && R.doors.find((q) => q.enter), room0 = R && R.floors.filter((q) => q.layer === 0).sort((a, b) => (b.r ? b.r * b.r * 3 : b.w * b.d) - (a.r ? a.r * a.r * 3 : a.w * a.d))[0]; if (!d) continue; /* (a form with no way in has no route) */ const room = room0 || { x: d.x - d.face[0] * 2.4, z: d.z - d.face[1] * 2.4, y: d.y, d: 2.8 }; /* (a shop fitted into V0's vault: the floor is the vault's) */ const back = room.r ? room.r - 1.7 : room.d / 2 - (k === 'new' ? 2.4 : 1.3); // (short of what stands at the back: the bed, the hearth, the masons' trestle)
    out[k] = [[d.x + d.face[0] * 1.3, d.z + d.face[1] * 1.3], [d.x - d.face[0] * 0.2, d.z - d.face[1] * 0.2], [room.x, room.z, room.y], [room.x - d.face[0] * back, room.z - d.face[1] * back, room.y], [room.x, room.z, room.y], [d.x + d.face[0] * 1.3, d.z + d.face[1] * 1.3]]; }
  const L = F.len / 2 - 1, at = (a, b) => [F.x + t[0] * a + f[0] * b, F.z + t[1] * a + f[1] * b];
  out.street = [at(-L, 2), at(-L / 2, 0.9), at(0, 2.1), at(L / 2, 0.8), at(L, 2)];
  return out;
});
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; for (const k of ['place', 'hint']) { const e = document.getElementById(k); if (e) e.style.display = 'none'; } });
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
const run = (ms) => page.clock.runFor(ms);
await page.click('#begin'); await run(300);
await page.mouse.click(480, 270); await run(300);
const locked = await page.evaluate(() => window.__fp.player.locked);
console.log('[lock]', locked ? 'the mouse is captured' : 'NOT captured: the look is turned through the page instead');
let mx0 = 480, my0 = 270;
const turnBy = async (dy, dp = 0) => {
  if (!locked) return page.evaluate(([dy, dp]) => { const p = window.__fp.player; p.yaw += dy; p.pitch += dp; }, [dy, dp]);
  const tx = mx0 - dy / 0.0021, ty = my0 - dp / 0.0021; await page.mouse.move(tx, ty, { steps: 3 }); mx0 = tx; my0 = ty;
};
const turnTo = async (w, pitch = -0.08) => { const s = await page.evaluate(([w, pitch]) => { const p = window.__fp.player; let dy = Math.atan2(-(w[0] - p.pos.x), -(w[1] - p.pos.z)) - p.yaw; dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI; return { dy, dp: pitch - p.pitch }; }, [w, pitch]); await turnBy(s.dy, s.dp); };
const info = () => page.evaluate(() => { const p = window.__fp.player; return { x: +p.pos.x.toFixed(2), y: +(p.pos.y - p.eye).toFixed(2), z: +p.pos.z.toFixed(2) }; });
let bad = 0;
for (const name of routes) {
  const pts = plan[name]; if (!pts) { console.log(`[skip] no route ${name}${name === 'roof' ? " (the Late house has no stair: against a riser its roof is walked from the tread behind)" : ""}`); continue; }
  await page.evaluate(([x, z]) => window.__fp.controls.placeAt(x, z), pts[0]); await run(400);
  await turnTo(pts[1]); await run(300);
  let n = 0, gone = 0, last = await info(), side = 1, reached = true;
  const shot = async (tag) => { const f = `shots/wip/${prefix}-${name}-${String(n).padStart(2, '0')}-${tag}.png`; await page.screenshot({ path: f, timeout: 240000 }); console.log(`[saved] ${f}`, JSON.stringify(await info())); };
  await shot('a'); n++;
  for (let leg = 1; leg < pts.length; leg++) {
    const W = pts[leg]; let still = 0, ticks = 0;
    await page.keyboard.down('KeyW');
    for (;;) {
      await turnTo(W); await run(100); ticks++;
      const s = await info(), step = Math.hypot(s.x - last.x, s.z - last.z);
      gone += step; still = step < 0.007 ? still + 1 : 0; last = s;
      if (gone >= 1) { gone = 0; await page.keyboard.up('KeyW'); await run(200); await shot('a'); await turnBy(side * 1.15, 0.05); await run(150); await shot(side > 0 ? 'l' : 'r'); await turnBy(-side * 1.15, -0.05); side = -side; n++; await page.keyboard.down('KeyW'); }
      if (Math.hypot(W[0] - s.x, W[1] - s.z) < 0.35) break;
      if (still >= 30 || ticks > 400) { console.log(`STUCK on ${name}, leg ${leg}, at ${JSON.stringify(s)} making for ${W.map((v) => v.toFixed(2))}`); reached = false; break; }
    }
    await page.keyboard.up('KeyW'); await run(150);
    const s = await info();
    if (W[2] !== undefined && Math.abs(s.y - W[2]) > 0.2) { console.log(`OFF its floor on ${name}, leg ${leg}: feet at ${s.y}, the floor at ${W[2].toFixed(2)}`); reached = false; }
    if (!reached) break;
  }
  await shot('end');
  console.log(`${reached ? 'PASS' : 'FAIL'} ${name}: walked on the keys to its end (${n} metres of frames)`);
  if (!reached) bad++;
}
await browser.close();
process.exit(bad ? 1 : 0);
