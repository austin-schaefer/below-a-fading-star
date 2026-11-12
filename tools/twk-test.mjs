#!/usr/bin/env node
// v8-07, the Twk-men (src/v8/twk.js): ten to fourteen riders at their stations, the gnomons' on gnomons and the rest on or
// near a track; the inspection comes out at 12 m, holds about a metre from the eye (never under 0.8 m), ends, and does not
// come again in the same visit; the quarrel circles and splits; the salute rises as the Thurifer comes up P3 and drops
// when he is past; the salt line stops and watches within 14 m and goes back to work; every rider near you lands in a
// gutter and they take off again a beat late; the salt spill lies within 3 m of a track and the pile within 15 m; four
// draws. Then ?twk=0 leaves them all out.
// Usage: node tools/twk-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };

async function open(q) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
  await page.goto(`${base}/?q=low${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
  await page.evaluate(() => {
    document.getElementById('card')?.classList.add('hidden');
    const f = window.__fp.sky.flicker; f.next = 1e9; f.hold = 1;
    window.__fp.events.dispatchEvent(new Event('begin')); // their manners start with the walk
    // the walker set down at (x, z) looking at (tx, tz), level; and a log of every rider's distance from the eye, taken
    // after the riders' own update each frame
    window.__place = (x, z, tx, tz) => { const fp = window.__fp, p = fp.player; p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z); p.vel?.set(0, 0, 0); p.keys?.clear(); p.yaw = Math.atan2(-(tx - x), -(tz - z)); p.pitch = 0; };
    window.__rs = (id) => window.__fp.twk.riders.filter((r) => r.st.id === id);
    window.__near = Infinity;
    window.__fp.registerUpdate(() => { const c = window.__fp.camera.position; for (const r of window.__fp.twk?.riders || []) window.__near = Math.min(window.__near, r.pos.distanceTo(c)); });
  });
  await page.waitForTimeout(1000);
  return { page, errors };
}
const poll = async (page, fn, ms, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await page.evaluate(fn, arg); if (v) return v; await page.waitForTimeout(100); } return null; };

// ---------------------------------------------------------------- the map
const { page, errors } = await open('');
const info = await page.evaluate(async () => {
  const fp = window.__fp, w = fp.twk;
  if (!w) return null;
  const { tracks, nearestOn } = await import('/src/v8/roads/place.js');
  const T = tracks(), trackD = (x, z) => Math.min(...T.map((t) => nearestOn(t, x, z).d));
  const G = (fp.roads?.gnomons || []).filter((g) => g.state === 'stand');
  const gD = (x, z) => Math.min(Infinity, ...G.map((g) => Math.hypot(g.x - x, g.z - z)));
  const S = w.salt, fanX = w.riders.find((r) => r.st.id === 'spill')?.st.A;
  const names = new Set(), calls = [];
  fp.scene.traverse((o) => { if (/^twk-/.test(o.name) && (o.isMesh || o.isInstancedMesh)) { names.add(o.name); calls.push(o.name); } });
  return {
    stats: w.stats(), stations: w.stations.map((s) => ({ id: s.id, kind: s.kind, n: s.n, gD: +gD(s.x, s.z).toFixed(2), tD: +trackD(s.x, s.z).toFixed(2), perchY: s.perches[0]?.y, gTop: s.gnomon?.top })),
    spillD: fanX ? +trackD(fanX.x, fanX.z).toFixed(2) : null, pileD: +trackD(S.pile.x, S.pile.z).toFixed(2), calls: calls.length, roads: G.length,
  };
});
ok(!!info, 'ctx.twk is built');
if (info) {
  console.log('  stats', JSON.stringify(info.stats));
  ok(info.stats.riders >= 8 && info.stats.riders <= 14, `riders on the map at low: ${info.stats.riders} (8-14; 14 at high)`);
  for (const id of ['spawn', 'p3', 'keptfire', 'river', 'house', 'spill']) ok(info.stations.some((s) => s.id === id), `a station: ${id}`);
  for (const s of info.stations.filter((s) => s.kind === 'gnomon')) ok(s.gD < 0.5 && s.perchY > s.gTop - 0.1, `${s.id} is on a gnomon (${s.gD} m off its foot; perched at ${s.perchY?.toFixed(2)}, head ${s.gTop?.toFixed(2)})`);
  for (const s of info.stations.filter((s) => s.kind === 'lead')) ok(s.tD < 3, `${s.id} is on a lead (${s.tD} m)`);
  for (const s of info.stations.filter((s) => s.kind !== 'gnomon' && s.kind !== 'lead')) ok(s.tD < 15, `${s.id} is within 15 m of a track (${s.tD} m)`);
  ok(info.roads > 0, `gnomons registered (${info.roads} standing)`);
  ok(info.spillD != null && info.spillD < 3, `the salt spill lies within 3 m of a track (${info.spillD} m)`);
  ok(info.pileD < 15, `the pile at the house lies within 15 m of a track (${info.pileD} m)`);
  ok(info.calls <= 6 && info.stats.calls <= 6, `draw calls: ${info.calls} meshes (budget 6)`);
}

// ---------------------------------------------------------------- the inspection
await page.evaluate(() => { const st = window.__rs('spawn')[0].st; window.__place(st.x + 11.3, st.z + 2, st.x, st.z); window.__near = Infinity; });
const look = await poll(page, () => { const r = window.__rs('spawn').find((x) => x.mode === 'inspect-look'); return r && r.t > 0.6 ? { i: r.i, d: +r.pos.distanceTo(window.__fp.camera.position).toFixed(3) } : null; }, 12000);
ok(!!look, 'at 11 m from the spawn\'s gnomon a rider comes out and hovers in front of the eye');
if (look) {
  ok(look.d >= 0.8 && look.d <= 1.3, `the inspection holds its metre (${look.d} m)`);
  const end = await poll(page, (i) => { const r = window.__fp.twk.riders[i]; return !/^inspect/.test(r.mode) ? r.mode : null; }, 10000, look.i);
  ok(!!end, `the inspection ends (then: ${end})`);
  const nearest = await page.evaluate(() => window.__near);
  ok(nearest >= 0.8, `no rider came nearer the eye than 0.8 m (${nearest.toFixed(3)} m)`);
  await page.waitForTimeout(3000);
  const again = await page.evaluate(() => window.__rs('spawn').some((r) => /^inspect/.test(r.mode)));
  ok(!again, 'once per station per visit: no second inspection while you stay');
}

// ---------------------------------------------------------------- the quarrel
await page.evaluate(() => { const st = window.__rs('spawn')[0].st; window.__place(st.x + 6, st.z + 3, st.x, st.z); for (const r of window.__rs('spawn')) if (!/eye|perch/.test(r.mode)) { r.mode = 'return'; r.goal.copy(r.home); } });
await poll(page, () => window.__rs('spawn').every((r) => /eye|perch/.test(r.mode)), 10000);
await page.evaluate(() => { window.__rs('spawn')[0].st.qNext = 0; });
const circ = await poll(page, () => { const [a, b] = window.__rs('spawn'); return a.mode === 'q-circle' && b.mode === 'q-circle' && a.t > 1 ? +a.pos.distanceTo(b.pos).toFixed(2) : null; }, 10000);
ok(circ != null && circ < 0.7, `the quarrel: the pair circle each other tightly (${circ} m apart)`);
const split = await poll(page, () => window.__rs('spawn').every((r) => r.mode === 'q-split' || r.mode === 'return' || r.mode === 'eye'), 8000);
ok(!!split, 'the quarrel ends and they split');

// ---------------------------------------------------------------- the salt line
const sl = await page.evaluate(() => { const st = window.__rs('spill')[0].st; window.__place(st.A.x + 8, st.A.z + 6, st.A.x, st.A.z); return window.__rs('spill').map((r) => r.mode).join(','); });
const watching = await poll(page, () => window.__rs('spill').every((r) => r.mode === 'watch'), 4000);
ok(!!watching, `the salt line stops dead and watches you within 14 m (was ${sl})`);
await page.evaluate(() => { const st = window.__rs('spill')[0].st; window.__place(st.A.x + 30, st.A.z + 20, st.A.x, st.A.z); });
const back = await poll(page, () => window.__rs('spill').every((r) => /^ferry/.test(r.mode)), 4000);
ok(!!back, 'when you have gone by they go back to ferrying');

// ---------------------------------------------------------------- the guard
await page.evaluate(() => { const p = window.__fp.twk.salt.pile; window.__place(p.x - 1.5, p.z - 2.6, p.x, p.z); });
const guard = await poll(page, () => { const r = window.__rs('house')[0]; return r.mode === 'guard-up' && r.t > 1.2 ? +r.pos.distanceTo(r.home).toFixed(2) : null; }, 6000);
ok(guard != null && guard < 1.6, `the guard rises between you and his pile and stays by it (${guard} m from it)`);

// ---------------------------------------------------------------- the salute
const sal = await page.evaluate(() => {
  const fp = window.__fp, T = fp.walkers?.thurifer; if (!T) return null;
  const st = window.__rs('p3')[0].st, tr = T.track, o = {};
  let bs = 0, bd = Infinity; for (let s = 0; s < tr.length; s += 0.5) { tr.at(s, o); const d = Math.hypot(o.x - st.x, o.z - st.z); if (d < bd) { bd = d; bs = s; } }
  const dir = bs > 18 ? 1 : -1, s0 = bs - dir * 16;
  T.place(s0, dir);
  window.__place(st.x + 9, st.z - 6, st.x, st.z);
  return { bs: +bs.toFixed(1), bd: +bd.toFixed(1), s0: +s0.toFixed(1), dir };
});
if (!sal) ok(false, 'the Thurifer is there to be saluted');
else {
  console.log('  salute', JSON.stringify(sal));
  const up = await poll(page, () => window.__rs('p3').every((r) => r.mode === 'salute') && window.__rs('p3')[0].st.saluting, 20000);
  ok(!!up, `the salute: P3's riders rise in a rank as the Thurifer comes up (his track passes ${sal.bd} m from them)`);
  // they rise at slightly different moments, so the rank is read once it has settled
  await poll(page, () => { const R = window.__rs('p3'); return Math.max(...R.map((r) => Math.abs(r.pos.y - R[0].pos.y))) < 0.15; }, 4000);
  const rank = await page.evaluate(() => { const R = window.__rs('p3'); return Math.max(...R.map((r) => Math.abs(r.pos.y - R[0].pos.y))); });
  ok(rank < 0.15, `in a rank: level within ${rank.toFixed(2)} m`);
  const down = await poll(page, () => !window.__rs('p3')[0].st.saluting && window.__rs('p3').every((r) => r.mode !== 'salute'), 60000);
  ok(!!down, 'and they drop the moment his back is turned');
}

// ---------------------------------------------------------------- the gutter
await page.evaluate(() => { const st = window.__rs('spawn')[0].st; window.__place(st.x + 7, st.z + 2, st.x, st.z); for (const r of window.__rs('spawn')) { r.mode = 'hop'; r.darts = 3; r.goal.set(r.home.x + 1, r.home.y + 0.8, r.home.z); r.wantFlap = 1; } });
await page.waitForTimeout(800);
await page.evaluate(() => { window.__fp.sky.flicker.hold = 0.3; });
const landed = await poll(page, () => { const c = window.__fp.camera.position, R = window.__fp.twk.riders.filter((r) => Math.hypot(r.pos.x - c.x, r.pos.z - c.z) < 60); return R.length && R.every((r) => r.flap < 0.15 && (r.mode === 'perch' || r.landed)) ? R.length : null; }, 4000);
ok(!!landed, `in a gutter every rider near you lands and holds on (${landed})`);
await page.evaluate(() => { window.__fp.sky.flicker.hold = 1; });
await page.waitForTimeout(300);
const early = await page.evaluate(() => window.__rs('spawn').filter((r) => r.flap > 0.5).length);
const late = await poll(page, () => window.__rs('spawn').some((r) => r.flap > 0.5), 4000);
ok(early === 0 && !!late, `they take off again a beat late (${early} up at 0.3 s, up by 4 s: ${!!late})`);

ok(errors.length === 0, `no page errors (${errors.length}${errors.length ? ': ' + errors[0] : ''})`);
await page.close();

// ---------------------------------------------------------------- ?twk=0
const off = await open('&twk=0');
const none = await off.page.evaluate(() => { let n = 0; window.__fp.scene.traverse((o) => { if (/^twk-/.test(o.name)) n++; }); return { n, api: !!window.__fp.twk }; });
ok(none.n === 0 && !none.api, `?twk=0 leaves them out (${none.n} objects)`);
await off.page.close();
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail || !pass ? 1 : 0);
