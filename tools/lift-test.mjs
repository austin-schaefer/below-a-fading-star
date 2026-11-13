#!/usr/bin/env node
// The lift of the Galleries of Durance (v12-H4, src/v12/lift.js): the station, the call, the ride, the gallery, the way
// down, and that nobody is trapped. Simulated at 60 Hz in the page: controls.update on the keys (state.keys, the yaw
// steered at each point, as heights-test does) in lockstep with the carriage's own tick (ctx.lift.manual), so a 45 s
// ride takes a few seconds. Checks:
//   - built: the carriage at the gallery on load, the wedge through the walk limit, the module within its budget;
//   - the station: the path's end walked up the stair onto the platform; its held edges (a hurry at the platform's west
//     lip with the carriage away stays on); the bell's act done brings the carriage down to the foot, its east grille open;
//   - boarding: walked in through the door (not through the glass); the lever is offered inside and not from the
//     platform; thrown, the rider is carried, stays inside the cage's floor all the way, the eye never jumps more than
//     0.25 m a frame, the ride takes 30 to 50 s, rises at least 100 m, holds still for 3 s once on the way, and sets them
//     down on the cage's floor at the gallery with the west grille open; pushing to walk mid-ride does nothing;
//   - the gallery: walked out over the gangway and along the deck to the ragged end, the feet on the deck; a hurry at the
//     rail where it stands stays on, at the rear (the rock) stays on; the cells' walls hold; the odd cell's grille holds;
//   - no trap: with the carriage gone from the gallery the gangway's end holds, and the gallery's bell is offered and
//     brings it back; a fall off the ragged end (and off a gap in the rail) lands on the ground inside the walk limit or
//     the wedge, standing, and able to walk; ?fall=1: a fall from the gallery blacks out and wakes at the keep;
//   - the ride down: the lever at the top takes them to the foot and sets them down on the floor; a teleport mid-ride
//     drops the carry and the carriage goes on to its landing; a reload mid-ride starts the visitor on the ground;
//   - ?lift=0: no lift, and the Galleries draw their carriage in the shader as before.
// Usage: node tools/lift-test.mjs [base=http://localhost:8123]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0, pass = 0;
const check = (ok, name, info) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`); if (ok) pass++; else fail++; };
const errors = [];
async function open(q = '') {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`${base}/?q=low&shadows=0&bloom=0&cap=0${q}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp && 'lift' in window.__fp, null, { timeout: 300000 });
  await page.evaluate(HELPERS);
  return page;
}
const HELPERS = `(() => {
  const fp = window.__fp, p = fp.player, L = fp.lift, DT = 1 / 60;
  fp.events.dispatchEvent(new CustomEvent('begin'));
  document.getElementById('card')?.classList.add('hidden');
  if (L) L.manual = true;
  const feet = () => p.pos.y - p.eye;
  const yawTo = (x, z) => Math.atan2(-(x - p.pos.x), -(z - p.pos.z));
  const tick = () => { fp.controls.update(DT); if (L) L.tick(DT); };
  const H = window.H = { fp, p, L, feet, yawTo, tick,
    place(x, z, y) { fp.controls.placeAt(x, z, y); p.vel.set(0, 0, 0); p.keys.clear(); for (let i = 0; i < 3; i++) tick(); },
    run(n, keys, steer) { p.keys.clear(); for (const k of keys) p.keys.add(k); let air = 0, maxAir = 0, minF = Infinity; for (let i = 0; i < n; i++) { if (steer) p.yaw = steer(); tick(); const f = feet(); minF = Math.min(minF, f); if (!p.onGround) { air += DT; maxAir = Math.max(maxAir, air); } else air = 0; } p.keys.clear(); return { x: p.pos.x, z: p.pos.z, f: feet(), maxAir, minF }; },
    walkTo(x, z, n = 1200, tol = 0.35) { p.keys.clear(); p.keys.add('KeyW'); let i = 0, maxAir = 0, air = 0; for (; i < n; i++) { if (Math.hypot(x - p.pos.x, z - p.pos.z) < tol) break; p.yaw = yawTo(x, z); tick(); if (!p.onGround) { air += DT; maxAir = Math.max(maxAir, air); } else air = 0; } p.keys.clear(); for (let k = 0; k < 10; k++) tick(); return { reached: i < n, f: feet(), x: p.pos.x, z: p.pos.z, maxAir }; },
    ticks(n) { for (let i = 0; i < n; i++) tick(); },
    // until fn() (or n ticks); returns the ticks taken
    until(fn, n = 60 * 120) { for (let i = 0; i < n; i++) { if (fn()) return i; tick(); } return -1; },
    // a sane landing: standing, not under the ground, inside the walk limit or a corridor, free to walk a metre
    sane() {
      for (let i = 0; i < 600 && !p.onGround; i++) tick();
      for (let i = 0; i < 60; i++) tick();
      const x = p.pos.x, z = p.pos.z, ft = feet(), g = fp.terrain.heightAt(x, z);
      const under = ft < g - 0.3, inside = fp.mountains.inWalk(x, z);
      const s = { x, y: p.pos.y, z, st: p.onStack }; let moves = false;
      for (const a of [0, 1.57, 3.14, 4.71]) { p.pos.set(s.x, s.y, s.z); p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true; p.onStack = s.st; p.yaw = a; const r = H.run(120, ['KeyW', 'ShiftLeft']); if (Math.hypot(r.x - x, r.z - z) > 1) { moves = true; break; } }
      p.pos.set(s.x, s.y, s.z); p.vel.set(0, 0, 0); p.vy = 0;
      return { ok: p.onGround && !under && inside && moves, on: p.onGround, under, inside, moves, x: +x.toFixed(1), z: +z.toFixed(1), feet: +ft.toFixed(2), ground: +g.toFixed(2) };
    },
    offered() { fp.acts.offered = null; for (let i = 0; i < 30; i++) tick(); return null; },
  };
})()`;
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

// ---------------------------------------------------------------- the whole way, on one page
{
  const page = await open();
  const R = await page.evaluate(async () => {
    const { fp, p, L, feet, place, run, walkTo, ticks, until, sane } = window.H, out = {};
    const settle = () => new Promise((r) => setTimeout(r, 250)); // an act's promise settles (it is busy until then, and 0.1 s after)
    const st = L.stats();
    out.built = { where: L.where(), S0: L.S0, SG: L.SG, rise: L.gal.y - L.floorY0, calls: st.calls, tris: st.tris, wedge: fp.mountains.corridors.some((c) => c.name === 'lift') };
    // the station: from the path, up the stair, onto the platform
    const C0 = L.C0, al = L.al, io = L.io, S = L.station;
    const W = (x, z) => ({ x: C0.x + al.x * x + io.x * z, z: C0.z + al.z * x + io.z * z });
    const foot = W(0, S.STAIR.z1 + 6), top = W(0, S.PLAT.z0 + 1.2);
    place(foot.x, foot.z);
    const w1 = walkTo(top.x, top.z);
    out.stair = { reached: w1.reached, f: w1.f, want: L.floorY0, maxAir: w1.maxAir };
    // the platform's west lip, the carriage away: a hurry at it (beside the door) stays on
    const lip = W(2.4, S.PLAT.z0 + 0.6);
    place(lip.x, lip.z, L.floorY0);
    p.yaw = Math.atan2(io.x, io.z); // west, toward the rails
    const r1 = run(150, ['KeyW', 'ShiftLeft']);
    out.platLip = { f: r1.f, want: L.floorY0 };
    // the bell: done (its act's do), the carriage answers and comes down
    const bell = L.stand.foot();
    place(bell.x, bell.z, L.floorY0); p.yaw = bell.yaw;
    const hb = fp.acts.list.find((h) => h.def.id === 'lift-call');
    out.bellMay = fp.acts.may(hb);
    fp.acts.act(hb);
    const tCome = until(() => L.where() === 'foot' && L.doors.e === 1, 60 * 120) / 60;
    out.come = { t: tCome, doors: L.doors, where: L.where() };
    // in through the door, not through the glass: walk at the glass beside the door first
    const glass = W(-1.2, S.PLAT.z0 + 0.4);
    place(glass.x, glass.z, L.floorY0); p.yaw = Math.atan2(io.x, io.z);
    run(120, ['KeyW']);
    const c0 = L.cageCentre();
    const lzIn = (p.pos.x - c0.x) * io.x + (p.pos.z - c0.z) * io.z;
    out.glass = { lz: lzIn, d2: 1.5, f: feet() };
    // the lever is not offered from the platform, and is inside
    const hl = fp.acts.list.find((h) => h.def.id === 'lift-lever');
    out.leverFromPlat = fp.acts.may(hl);
    const door = W(0, S.PLAT.z0 + 1.0);
    place(door.x, door.z, L.floorY0);
    const w2 = walkTo(c0.x + al.x * 0.3, c0.z + al.z * 0.3, 600, 0.3);
    out.inCage = { reached: w2.reached, inCage: L.inCage(), may: fp.acts.may(hl), f: feet(), floor: L.floorY0 };
    // the ride up
    fp.acts.act(hl);
    const startY = p.pos.y, track = { maxJump: 0, outside: 0, stillMax: 0, n: 0, minY: Infinity, maxY: -Infinity, pushes: 0 };
    let prev = p.pos.clone(), still = 0, t = 0;
    for (let i = 0; i < 60 * 90 && (L.ridden || i < 5); i++) {
      if (i > 600 && i < 700) p.keys.add('KeyW'); else p.keys.delete('KeyW'); // pushing to walk mid-ride
      window.H.tick(); t += 1 / 60;
      const d = p.pos.distanceTo(prev); track.maxJump = Math.max(track.maxJump, d);
      if (d < 0.004 && L.ridden && t > 3) { still += 1 / 60; track.stillMax = Math.max(track.stillMax, still); } else still = 0;
      const c = L.cageCentre(), lx = (p.pos.x - c.x) * al.x + (p.pos.z - c.z) * al.z, lz = (p.pos.x - c.x) * io.x + (p.pos.z - c.z) * io.z;
      if (Math.abs(lx) > 1.7 || Math.abs(lz) > 1.5 || Math.abs(feet() - c.y) > 0.25) track.outside++;
      track.minY = Math.min(track.minY, p.pos.y); track.maxY = Math.max(track.maxY, p.pos.y);
      prev.copy(p.pos);
    }
    p.keys.clear(); await settle();
    out.rideUp = { t, ...track, rise: p.pos.y - startY, ridden: L.ridden, carried: p.carried, where: L.where(), doors: L.doors, f: feet(), want: L.gal.y };
    ticks(20);
    // out over the gangway and along the gallery to the ragged end
    const path = L.gal.path, res = [];
    let fellAt = null;
    for (let i = 0; i < path.length; i++) { const w = walkTo(path[i][0], path[i][1], 900, 0.5); res.push(w.reached); if (Math.abs(w.f - L.gal.y) > 0.3 && fellAt === null) fellAt = i; }
    out.gallery = { points: path.length, reached: res.filter(Boolean).length, fellAt, f: feet(), want: L.gal.y };
    // the rail where it stands (bay 2) and the rear: a hurry at each stays on
    const at = (k, f, d) => L.gal.at(k, f, d);
    const hurryAt = (k, f, d, dir) => { const q = at(k, f, d); place(q.x, q.z, L.gal.y); p.yaw = dir; const r = run(150, ['KeyW', 'ShiftLeft']); return r.f; };
    const outY = Math.atan2(-io.x, -io.z), inY = Math.atan2(io.x, io.z);
    out.held = { rail: hurryAt(2, 0.4, 4.0, outY), rear: hurryAt(3, 0.5, 2.2, inY), want: L.gal.y };
    // the odd cell's grille holds: walk at it from outside
    const o = L.gal.odd, og = o.c.clone().addScaledVector(o.n, 3.6).addScaledVector(o.u, o.door ?? 0.8);
    place(og.x, og.z, L.gal.y); p.yaw = Math.atan2(o.n.x, o.n.z);
    run(150, ['KeyW']);
    const dep = (p.pos.x - o.c.x) * o.n.x + (p.pos.z - o.c.z) * o.n.z;
    out.grille = { depth: dep, front: 2.5 };
    // no trap: the carriage gone from the gallery; the gangway's end holds; the gallery's bell brings it back
    L.jump(L.S0);
    const gw = L.CG.clone().addScaledVector(io, -2.9);
    place(gw.x, gw.z, L.gal.y); p.yaw = outY;
    const r2 = run(180, ['KeyW', 'ShiftLeft']);
    out.gangEnd = { f: r2.f, want: L.gal.y };
    const bt = L.stand.top();
    place(bt.x, bt.z, L.gal.y); p.yaw = bt.yaw;
    const ht = fp.acts.list.find((h) => h.def.id === 'lift-call-top');
    out.topBell = { may: fp.acts.may(ht) };
    fp.acts.act(ht);
    out.topBell.t = until(() => L.where() === 'gallery' && L.doors.w === 1, 60 * 120) / 60; await settle();
    // the ride down
    const cg = L.cageCentre();
    place(L.gal.landing.x - io.x * 1.0, L.gal.landing.z - io.z * 1.0, L.gal.y);
    walkTo(cg.x + al.x * 0.3, cg.z + al.z * 0.3, 900, 0.3);
    out.inTop = { inCage: L.inCage(), may: fp.acts.may(hl) };
    fp.acts.act(hl);
    let td = 0; for (let i = 0; i < 60 * 90 && (L.ridden || i < 5); i++) { window.H.tick(); td += 1 / 60; }
    ticks(30); await settle();
    out.rideDown = { t: td, where: L.where(), f: feet(), want: L.floorY0, carried: p.carried };
    const back = W(0, S.PLAT.z0 + 1.5);
    const w3 = walkTo(back.x, back.z, 600, 0.4);
    out.offAtFoot = { reached: w3.reached, f: feet() };
    // a teleport mid-ride: the carry ends, the carriage goes on to the gallery and waits
    await settle();
    const wt = walkTo(c0.x, c0.z, 600, 0.3);
    const why = { reached: wt.reached, inCage: L.inCage(), may: fp.acts.may(hl), where: L.where() };
    fp.acts.act(hl);
    ticks(60 * 12);
    const midS = L.s;
    fp.controls.placeAt(-200, -40);
    ticks(5);
    out.teleport = { carried: p.carried, ridden: L.ridden, midS, why };
    until(() => L.where() === 'gallery', 60 * 90);
    out.teleport.where = L.where();
    return out;
  });
  const B = R.built;
  check(B.where === 'gallery', 'built: the carriage rests at the gallery on load', B);
  check(B.wedge, 'built: a wedge through the walk limit over the gallery');
  check(B.rise >= 100, 'built: the gallery stands 100 m and more over the station', `${f2(B.rise)} m`);
  check(B.calls <= 25 && B.tris < 400000, 'built: within the module budget (25 draws, 400k triangles)', `${B.calls} draws, ${Math.round(B.tris / 1000)}k tris`);
  check(R.stair.reached && Math.abs(R.stair.f - R.stair.want) < 0.05 && R.stair.maxAir < 0.3, 'station: walked up the stair from the path onto the platform', R.stair);
  check(Math.abs(R.platLip.f - R.platLip.want) < 0.05, 'station: a hurry at the platform\'s west lip with the carriage away stays on', R.platLip);
  check(R.bellMay && R.come.where === 'foot' && R.come.t > 20 && R.come.t < 75 && R.come.doors.e === 1, 'station: the bell brings the carriage down to the foot, taking its time, its east grille opened', R.come);
  check(R.glass.lz > 1.45 && Math.abs(R.glass.f - 8.24) < 1, 'boarding: walking at the glass beside the door does not go through it', R.glass);
  check(!R.leverFromPlat && R.inCage.reached && R.inCage.inCage && R.inCage.may, 'boarding: in through the door; the lever offered inside, not from the platform', { plat: R.leverFromPlat, ...R.inCage });
  const U = R.rideUp;
  check(U.t >= 30 && U.t <= 50, 'ride up: 30 to 50 s from the lever to stepping off', `${f2(U.t)} s`);
  check(U.rise >= 100, 'ride up: rises 100 m and more', `${f2(U.rise)} m`);
  check(U.outside === 0, 'ride up: the rider stays inside the cage, on its floor, all the way', `${U.outside} frames outside`);
  check(U.maxJump < 0.25, 'ride up: the eye never jumps more than 0.25 m a frame (a jolt, not a teleport)', `${f2(U.maxJump)} m`);
  check(U.stillMax >= 3, 'ride up: it stops once on the way for 3 s and more', `${f2(U.stillMax)} s still`);
  check(!U.ridden && !U.carried && U.where === 'gallery' && U.doors.w === 1 && Math.abs(U.f - U.want) < 0.05, 'ride up: set down on the cage floor at the gallery, the west grille open, pushing to walk mid-ride did nothing', U);
  check(R.gallery.reached === R.gallery.points && R.gallery.fellAt === null, 'gallery: walked out over the gangway and along the deck to the ragged end, the feet on it', R.gallery);
  check(Math.abs(R.held.rail - R.held.want) < 0.05 && Math.abs(R.held.rear - R.held.want) < 0.05, 'gallery: a hurry at the rail where it stands, and at the rock, stays on', R.held);
  check(R.grille.depth > 2.5 + 0.3, 'gallery: the odd cell\'s locked grille holds the walker outside', R.grille);
  check(Math.abs(R.gangEnd.f - R.gangEnd.want) < 0.05, 'no trap: with the carriage gone the gangway\'s end holds', R.gangEnd);
  check(R.topBell.may && R.topBell.t > 0, 'no trap: the gallery\'s bell is offered and brings the carriage back up', R.topBell);
  check(R.inTop.inCage && R.inTop.may, 'ride down: the lever offered in the cage at the gallery', R.inTop);
  check(R.rideDown.where === 'foot' && !R.rideDown.carried && Math.abs(R.rideDown.f - R.rideDown.want) < 0.05 && R.rideDown.t <= 50, 'ride down: the lever takes them to the foot and sets them down on the cage floor', R.rideDown);
  check(R.offAtFoot.reached, 'ride down: walked out onto the platform', R.offAtFoot);
  check(!R.teleport.carried && !R.teleport.ridden && R.teleport.where === 'gallery', 'a teleport mid-ride drops the carry; the carriage goes on to the gallery and waits there', R.teleport);
  await page.close();
}

// ---------------------------------------------------------------- falls, without and with ?fall=1
for (const q of ['', '&fall=1']) {
  const page = await open(q);
  const F = await page.evaluate(async (blackout) => {
    const { fp, p, L, place, run, sane } = window.H, out = [];
    const io = L.io, outY = Math.atan2(-io.x, -io.z);
    const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    // off a gap in the rail (bay 5, bay 9) and off the ragged end
    const spots = [[5, 0.5, 4.2, outY, 'gap-5'], [9, 0.5, 4.2, outY, 'gap-9'], [12, 0.25, 2.6, null, 'ragged-end']];
    for (const [k, f, d, yaw, name] of spots) {
      const q = L.gal.at(k, f, d);
      place(q.x, q.z, L.gal.y);
      if (yaw === null) { const e = L.gal.end; p.yaw = Math.atan2(-(e.x - q.x), -(e.z - q.z)); } else p.yaw = yaw;
      const fromY = p.pos.y;
      if (!blackout) { run(240, ['KeyW', 'ShiftLeft']); const s = sane(); out.push({ name, dropped: +(fromY - p.pos.y).toFixed(1), ...s }); continue; }
      // with the blackout, on the page's own frames (the fall's module runs there)
      p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft');
      await wait(1500); p.keys.clear();
      await wait(9000); await frames(5);
      out.push({ name, dropped: +(fromY - p.pos.y).toFixed(1), keep: +Math.hypot(p.pos.x - fp.spawn.x, p.pos.z - fp.spawn.z).toFixed(1), on: p.onGround, carried: p.carried });
    }
    return out;
  }, !!q);
  for (const f of F) {
    if (!q) check(f.ok && f.dropped > 20, `fall (no ?fall): off the gallery at the ${f.name}, a sane landing`, f);
    else check(f.keep < 12 && f.on, `fall (?fall=1): off the gallery at the ${f.name}: blacked out and woken at the keep's gate`, f);
  }
  await page.close();
}

// ---------------------------------------------------------------- a reload mid-ride
{
  const page = await open();
  const r = await page.evaluate(() => {
    const { fp, p, L, place, walkTo, ticks } = window.H;
    L.jump(L.S0);
    place(L.C0.x + L.io.x * 3, L.C0.z + L.io.z * 3, L.floorY0);
    walkTo(L.C0.x, L.C0.z, 600, 0.3);
    fp.acts.act(fp.acts.list.find((h) => h.def.id === 'lift-lever'));
    ticks(60 * 15);
    return { carried: p.carried, y: p.pos.y };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.lift, null, { timeout: 300000 });
  await page.evaluate(HELPERS);
  const a = await page.evaluate(() => { const { p, fp, ticks } = window.H; ticks(60); return { carried: p.carried, on: p.onGround, feet: p.pos.y - p.eye, ground: fp.terrain.heightAt(p.pos.x, p.pos.z), inside: fp.mountains.inWalk(p.pos.x, p.pos.z), where: fp.lift.where() }; });
  check(r.carried && !a.carried && a.on && Math.abs(a.feet - a.ground) < 1.5 && a.inside, 'a reload mid-ride: the visitor starts on the ground, not in the air', { before: r, after: a });
  await page.close();
}

// ---------------------------------------------------------------- ?lift=0
{
  const page = await open('&lift=0');
  const r = await page.evaluate(() => ({ lift: window.__fp.lift, acts: window.__fp.acts.list.filter((h) => h.def.id.startsWith('lift')).length, wedge: window.__fp.mountains.corridors.some((c) => c.name === 'lift') }));
  check(r.lift === null && r.acts === 0 && !r.wedge, '?lift=0: no lift, no acts, no wedge', r);
  await page.close();
}

check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
