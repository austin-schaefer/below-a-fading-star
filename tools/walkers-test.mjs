#!/usr/bin/env node
// v7-01 the walkers (src/v7/walkers.js): the Little Thurifer keeps to P3, turns at the stones and clear of the man in the
// cloak of eyes, bows when you close on it and walks on once you have passed; the Leerie stops at each standard and puts
// the pole's flame to the mantle, no lamp lights at his touch, and he turns once when a gutter ends; the Link-Boy is at
// his post at load, meets a scripted walk on P2, holds 10 +- 2 m ahead, stands aside at the end and walks back, and is
// never moved while in view; the scene has one more point-light source than with ?walkers=0; stats() within budget.
// Usage: node tools/walkers-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`); };
async function open(q) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(`${base}/?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
  await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); const f = window.__fp.sky.flicker; f.next = 1e9; f.phase = 0; f.value = 1; });
  return { page, errors };
}

const { page, errors } = await open('q=high');
await page.waitForTimeout(1500);

// ---- at load
const load = await page.evaluate(() => {
  const fp = window.__fp, w = fp.walkers, B = w.linkBoy.state, post = w.linkBoy.post;
  return { mode: B.mode, d: Math.hypot(B.x - post.x, B.z - post.z), light: B.light, stats: w.stats(), q: fp.quality, sources: fp.lightSlots.sources.length,
    mine: fp.lightSlots.sources.filter((s) => s.name === 'walkers-link-light').length };
});
check('the Link-Boy is at his post at load, his link burning', load.mode === 'post' && load.d < 0.5 && load.light > 5, { mode: load.mode, d: +load.d.toFixed(2), light: +load.light.toFixed(1) });
const budget = load.q === 'low' ? 12500 : 25000;
check('stats() within budget (main-pass calls <= 7, triangles, one light)', load.stats.calls <= 7 && load.stats.tris <= budget && load.stats.lights === 1, load.stats);

// ---- the Thurifer
const th = await page.evaluate(() => {
  const fp = window.__fp, T = fp.walkers.thurifer, out = {};
  fp.camera.position.set(150, 30, 150); // far off: no bow
  const L = fp.paths.leads.find((l) => l.id === 'P3').lines[0];
  const dist = (x, z) => { let b = 1e9; for (let i = 0; i < L.length - 1; i++) { const [ax, az] = L[i], [bx, bz] = L[i + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)); b = Math.min(b, Math.hypot(ax + ex * t - x, az + ez * t - z)); } return b; };
  // end to end: from 5 m short of the stones, through the turn and pause, back past the middle, to the shrine end's turn
  let st = T.place(T.track.length - 5, 1), maxOff = 0, modes = new Set(), stoneTurn = null, shrineTurn = null;
  for (let k = 0; k < 600; k++) {
    st = T.sim(0.5, 0.1); modes.add(st.mode);
    if (st.mode === 'walk') maxOff = Math.max(maxOff, dist(st.x, st.z));
    if (st.mode === 'turn' && !stoneTurn && st.s > T.track.length - 1) stoneTurn = { s: st.s, x: st.x, z: st.z };
    if (st.mode === 'turn' && st.s < 20 && !shrineTurn) shrineTurn = { s: st.s, x: st.x, z: st.z };
    if (shrineTurn && st.mode === 'walk' && st.dir > 0) break;
  }
  const c = fp.uncanny?.cloak?.position;
  out.maxOff = maxOff; out.modes = [...modes]; out.stoneTurn = stoneTurn; out.shrineTurn = shrineTurn; out.length = T.track.length;
  out.cloakD = c && shrineTurn ? Math.hypot(shrineTurn.x - c.x, shrineTurn.z - c.z) : null;
  out.backOut = st.mode === 'walk' && st.dir > 0;
  // the bow: you walk up the track toward it at 1.4 m/s from 16 m
  T.place(70, 1);
  const p0 = T.state, tr = T.track, at = (s) => tr.at(s, {});
  let ws = 70 + 16, seen = [], bowed = null, collider = null;
  const cam = fp.camera.position;
  for (let k = 0; k < 400; k++) {
    const a = at(ws); cam.set(a.x, fp.terrain.heightAt(a.x, a.z) + 1.7, a.z);
    st = T.sim(0.1, 0.1);
    const d = Math.hypot(a.x - st.x, a.z - st.z);
    if (st.mode === 'stepOff' && !out.trigger) out.trigger = { d: +d.toFixed(2), off: +st.off.toFixed(2) };
    seen.push(st.mode);
    if (st.mode === 'bow' && !bowed) { bowed = { d, off: st.off, bowK: st.bowK, ws }; collider = { x: T.collider.x - st.x, z: T.collider.z - st.z }; }
    // walk on down the track past it, slowing while it bows
    ws -= st.mode === 'bow' ? 0.14 : (st.mode === 'stepOff' || st.mode === 'bowDown') ? 0.05 : 0.14;
    if (ws < st.s - 25) break;
  }
  out.bowed = bowed; out.collider = collider;
  out.after = T.sim(8, 0.1);
  out.seq = [...new Set(seen)];
  return out;
});
check('the Thurifer stays within 0.5 m of P3 while it walks', th.maxOff < 0.5, { maxOff: +th.maxOff.toFixed(3) });
check('it turns at the stones (P3\'s last sample) and walks back', !!th.stoneTurn && th.stoneTurn.s > th.length - 0.5 && th.backOut, { stoneTurn: th.stoneTurn?.s, length: th.length });
check('at the shrine it turns at least 8 m from the man in the cloak of eyes', th.cloakD !== null && th.cloakD >= 8, { cloakD: th.cloakD && +th.cloakD.toFixed(2), s: th.shrineTurn?.s });
check('it bows within 10 m of you, 1.6 m off the track, 75 degrees, with its collider on it', !!th.bowed && th.trigger.d <= 10.5 && Math.abs(th.bowed.off - 1.6) < 0.05 && th.bowed.bowK > 0.99 && Math.hypot(th.collider.x, th.collider.z) < 0.01, { trigger: th.trigger, bowed: th.bowed });
check('it rises and walks on after you have passed', th.after.mode === 'walk' && th.after.off === 0 && th.seq.includes('rise') && th.seq.includes('stepBack'), { seq: th.seq, after: th.after.mode });

// ---- the Leerie
const le = await page.evaluate(async () => {
  const fp = window.__fp, Le = fp.walkers.leerie, out = { touches: [], litAtTouch: [] };
  fp.camera.position.set(150, 30, 150);
  fp.sky.flicker.hold = 1;
  Le.at(null);
  let st = Le.at(2, 0, 1); Le.at(null);
  const t0 = st.touches;
  for (let k = 0; k < 450; k++) {
    const before = Le.state.touches;
    st = Le.sim(0.1, 0.1);
    if (st.touches > before) {
      const h = Le.heads[st.lastTouch], tip = st.tip;
      out.touches.push({ j: st.lastTouch, d: Math.hypot(tip[0] - h.x, tip[1] - h.y, tip[2] - h.z) });
      out.litAtTouch.push(fp.leerie ? fp.leerie.lit : null);
    }
  }
  out.dir0 = st.dir; out.turns0 = st.turns; out.j = st.j;
  return out;
});
check('the Leerie stops at each standard and raises the flame to the mantle', le.touches.length >= 3 && le.touches.every((t) => t.d < 0.1) && le.touches.map((t) => t.j).join() === [2, 3, 4, 5].slice(0, le.touches.length).join(), le.touches.map((t) => [t.j, +t.d.toFixed(3)]));
check('no lamp lights at his touch outside a gutter', le.litAtTouch.length > 0 && le.litAtTouch.every((l) => l === false), le.litAtTouch);
// a gutter: the row lights; he goes on; it ends, the row goes out; he turns once and walks the row the other way
const g1 = await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.hold = 0.3; return fp.walkers.leerie.state; });
await page.waitForTimeout(2500);
const g2 = await page.evaluate(() => { const fp = window.__fp; const s = fp.walkers.leerie.state; return { lit: fp.leerie.lit, turns: s.turns, dir: s.dir }; });
await page.evaluate(() => { window.__fp.sky.flicker.hold = 1; });
await page.waitForTimeout(2000);
const g3 = await page.evaluate(() => { const fp = window.__fp, Le = fp.walkers.leerie; const lit = fp.leerie.lit; let s = Le.sim(12, 0.1); return { lit, turns: s.turns, dir: s.dir, mode: s.mode, u: s.u, more: Le.sim(30, 0.1).turns }; });
check('the gutter lights the row and he does not turn in it', g2.lit === true && g2.turns === g1.turns && g2.dir === g1.dir, { g1: [g1.turns, g1.dir], g2 });
check('at the gutter\'s end he turns once and walks the other way', g3.lit === false && g3.turns === g1.turns + 1 && g3.dir === -g1.dir && g3.more === g3.turns, { g3 });

// ---- the Link-Boy on P2: walk up to its south end looking at the ground, then along it
await page.evaluate(() => {
  const fp = window.__fp, B = fp.walkers.linkBoy, p = fp.player;
  fp.sky.flicker.hold = null; fp.sky.flicker.value = 1;
  B.reset(); fp.walkers.leerie.at(null);
  const L = fp.paths.leads.find((l) => l.id === 'P2').lines[0];
  const [sx, sz] = L[0], [nx, nz] = L[4];
  const ux = sx - nx, uz = sz - nz, ul = Math.hypot(ux, uz);
  const x0 = sx + (ux / ul) * 58, z0 = sz + (uz / ul) * 58;
  p.pos.set(x0, fp.terrain.heightAt(x0, z0) + p.eye, z0); p.vel.set(0, 0, 0);
  p.enabled = true; p.keys.clear(); p.keys.add('KeyW'); p.pitch = -1.3;
  const W = window.__walk = { L, k: 0, phase: 'approach', log: [], t0: fp.time.t };
  fp.registerUpdate(() => {
    if (!window.__walk) return;
    const st = B.state, P = p.pos;
    // steer: toward the lead's start, then toward a point 6 m ahead along it
    let tx, tz;
    if (W.phase === 'pass' || W.phase === 'end') { W.log.push({ t: fp.time.t - W.t0, mode: st.mode, id: st.id, s: st.s, dir: st.dir, x: P.x, z: P.z, bx: st.x, bz: st.z, k: W.k }); return; }
    if (W.phase === 'approach') { [tx, tz] = L[0]; if (Math.hypot(P.x - tx, P.z - tz) < 3) W.phase = 'lead'; }
    else { while (W.k < L.length - 1 && Math.hypot(L[W.k][0] - P.x, L[W.k][1] - P.z) < 6) W.k++; [tx, tz] = L[W.k]; }
    p.yaw = Math.atan2(-(tx - P.x), -(tz - P.z));
    if (st.mode !== 'post' && st.mode !== 'free') p.pitch = -0.05; // he has been placed: look up
    W.log.push({ t: fp.time.t - W.t0, mode: st.mode, id: st.id, s: st.s, dir: st.dir, x: P.x, z: P.z, bx: st.x, bz: st.z, k: W.k });
    if (W.k >= L.length - 1 && Math.hypot(L[L.length - 1][0] - P.x, L[L.length - 1][1] - P.z) < 1.5) { p.keys.clear(); W.phase = 'end'; }
  });
});
// walk until he is aside at the end, then a little past him, then wait for him to walk back
let lb = null;
for (let i = 0; i < 160; i++) {
  await page.waitForTimeout(1000);
  lb = await page.evaluate(() => { const W = window.__walk, l = W.log[W.log.length - 1]; return { phase: W.phase, mode: l.mode, t: l.t, n: W.log.length }; });
  if (lb.phase === 'end' && (lb.mode === 'aside' || lb.mode === 'back')) break;
}
// pass him: walk 4 m on beyond the end toward him, then away
await page.evaluate(() => {
  const fp = window.__fp, B = fp.walkers.linkBoy, p = fp.player, st = B.state;
  window.__walk.phase = 'pass';
  p.yaw = Math.atan2(-(st.x - p.pos.x), -(st.z - p.pos.z)); p.keys.clear(); p.keys.add('KeyW');
});
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(500);
  const near = await page.evaluate(() => { const fp = window.__fp, st = fp.walkers.linkBoy.state, p = fp.player.pos; return Math.hypot(st.x - p.x, st.z - p.z); });
  if (near < 3) break;
}
await page.evaluate(() => { const p = window.__fp.player; p.keys.clear(); p.yaw += Math.PI; p.keys.add('KeyW'); });
await page.waitForTimeout(3000);
await page.evaluate(() => { window.__fp.player.keys.clear(); });
await page.waitForTimeout(6000);
const walk = await page.evaluate(() => {
  const fp = window.__fp, W = window.__walk, B = fp.walkers.linkBoy, tr = B.leads.find((l) => l.id === 'P2');
  const log = W.log, st = B.state;
  // the gap: his arc length less yours along P2 (projected), while he leads
  const L = W.L, proj = (x, z) => { let b = 1e9, bs = 0, s = 0; for (let i = 0; i < L.length - 1; i++) { const [ax, az] = L[i], [bx, bz] = L[i + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1, sl = Math.sqrt(l2), t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)), d = Math.hypot(ax + ex * t - x, az + ez * t - z); if (d < b) { b = d; bs = s + sl * t; } s += sl; } return bs; };
  const lead = log.filter((l) => l.mode === 'lead' && l.id === 'P2');
  const t0 = lead.length ? lead[0].t : 0;
  const gaps = lead.filter((l) => l.t > t0 + 6 && l.t < lead[lead.length - 1].t - 3).map((l) => (l.s - proj(l.x, l.z)) * l.dir);
  gaps.sort((a, b) => a - b);
  const q = (f) => gaps.length ? gaps[Math.floor(f * (gaps.length - 1))] : NaN;
  const modes = []; for (const l of log) if (modes[modes.length - 1] !== l.mode) modes.push(l.mode);
  return { modes, gapN: gaps.length, g05: q(0.05), g50: q(0.5), g95: q(0.95), placed: st.placed, final: { mode: st.mode, s: st.s, len: tr.length }, leads: st.leads,
    asideOff: Math.max(0, ...log.filter((l) => l.mode === 'aside').map(() => 0)), backS: log.filter((l) => l.mode === 'back').map((l) => l.s) };
});
await page.evaluate(() => { window.__walk = null; });
check('a walk up P2 starts a lead there', walk.modes.includes('wait') && walk.modes.includes('lead') && walk.leads >= 1, { modes: walk.modes });
check('he holds 10 +- 2 m ahead while you walk', walk.gapN > 20 && walk.g05 >= 8 && walk.g95 <= 12, { n: walk.gapN, p05: +walk.g05.toFixed(2), p50: +walk.g50.toFixed(2), p95: +walk.g95.toFixed(2) });
check('he stands aside at the end and walks back', walk.modes.includes('aside') && walk.modes.includes('back') && walk.backS.length > 3 && walk.backS[walk.backS.length - 1] < walk.backS[0] - 1, { modes: walk.modes, back: walk.backS.length && [+walk.backS[0].toFixed(1), +walk.backS[walk.backS.length - 1].toFixed(1)] });
check('every relocation happens out of view (and 40 m off at a lead\'s end)', walk.placed.length > 0 && walk.placed.every((p) => !p.seen && !p.seenFrom && (!/end/.test(p.why) || p.d >= 40)), walk.placed.map((p) => [p.why, +p.d.toFixed(1), p.seen, p.seenFrom]));

// ---- the slots: his light anywhere on P1-P17 and every other point light on; at most three within reach + 20 m on a 4 m grid along every path
const slots = await page.evaluate(() => {
  const fp = window.__fp, src = fp.lightSlots.sources.filter((s) => s.name !== 'walkers-link-light'), V = new fp.THREE.Vector3();
  const pos = src.map((s) => { s.updateWorldMatrix(true, false); V.setFromMatrixPosition(s.matrixWorld); return { x: V.x, y: V.y, z: V.z, r: s.distance + 20, name: s.name }; });
  let worst = { n: 0 };
  for (const L of fp.paths.leads) {
    if (L.kind !== 'path') continue;
    for (const line of L.lines) {
      let acc = 0;
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, az, ay] = line[i], [bx, bz] = line[i + 1], sl = Math.hypot(bx - ax, bz - az);
        for (let s = acc > 0 ? 4 - acc : 0; s < sl; s += 4) {
          const x = ax + (bx - ax) * s / sl, z = az + (bz - az) * s / sl, y = fp.terrain.heightAt(x, z) + 1.7;
          const near = pos.filter((p) => Math.hypot(p.x - x, p.y - y, p.z - z) < p.r);
          const n = near.length + 1; // and the link, which is on this path
          if (n > worst.n) worst = { n, id: L.id, x: +x.toFixed(1), z: +z.toFixed(1), near: near.map((p) => [p.name || '?', +p.x.toFixed(0), +p.z.toFixed(0), p.r - 20]) };
        }
        acc = (acc + sl) % 4;
      }
    }
  }
  return worst;
});
check('with the link anywhere on a path, no point on the paths has more than three live sources within reach + 20 m', slots.n <= 3, slots);
check('no errors on the page', errors.length === 0, errors.slice(0, 3));
await page.close();

// ---- one more point-light source than with ?walkers=0
const off = await open('q=high&walkers=0');
const n0 = await off.page.evaluate(() => ({ n: window.__fp.lightSlots.sources.length, w: window.__fp.walkers }));
check('the scene has exactly one more point-light source than with ?walkers=0', load.sources === n0.n + 1 && load.mine === 1 && n0.w === null, { with: load.sources, without: n0.n });
await off.page.close();
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
