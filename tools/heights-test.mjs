#!/usr/bin/env node
// The heights' footing (v12 H0): stacked floors, held edges, the edge-guard, corridors through the walk limit, every
// registered ascent walked and fallen from, and the fall's blackout. Simulated at 60 Hz through controls.update in
// the page, on the keys (state.keys: W, Shift, Space as the keyboard sets them) with the yaw steered at each point,
// as edges-test does; the frame times are real frames. Loads ?heights=test (the test floors, src/v12/heights.js),
// then a second page with &fall=1 for the blackout.
//   - stacked floors: the bridge leaves the ground, rises 6 m and comes back down to it; a deck under a beam keeps the
//     walker at the deck's height and the beam over it at the beam's; stepping off the beam over the deck lands on
//     the deck; the cut takes the walker 3 m under the ground and out again;
//   - held edges: hurrying sideways off the bridge or out of the cut, the walker stays on;
//   - corridors: walked out past r 348 along one; a step sideways there stops at its side, not back at the circle;
//     placeAt honours it; outside it the circle holds; the saddle's wedge is as it was (372 at its axis);
//   - the edge-guard, on the beam 0.9 m wide 7 m up and on a parapet's top on the Great Span: a walk or a hurry that
//     drifts 0.25 rad stays on to the end; a slow walk straight at the lip stops at it, and goes over after pressing
//     on (the dwell); a hurry straight at it goes over at once; a hop goes over;
//   - each ascent in ctx.ascents (every module's, and the test ones): walked point to point (feet within 0.3 m of each
//     point's y, never falling), stepped off at each `off` with a hurry and landing sane (on a floor, not under the
//     ground, inside the limit or a corridor, not inside a collider, able to walk away), the frame time at the top
//     no worse than 1.5x the floor's plus 4 ms;
//   - ?fall=1: a fall from the perch (18 m) closes the view, holds it dark and wakes the walker at the keep's gate,
//     lying and getting up; a 7 m drop does not.
// Usage: node tools/heights-test.mjs [base=http://localhost:8123]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0, pass = 0;
const check = (ok, name, info) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : ''}`); if (ok) pass++; else fail++; };
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

async function open(q) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`${base}/?q=low&shadows=0&bloom=0&cap=0&heights=test${q}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.heightsTest, null, { timeout: 180000 });
  await page.evaluate(HELPERS);
  return { page, errors };
}
// the in-page walker: window.H
const HELPERS = `(() => {
  const fp = window.__fp, p = fp.player, T = fp.terrain, DT = 1 / 60;
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const feet = () => p.pos.y - p.eye;
  const yawTo = (tx, tz) => Math.atan2(-(tx - p.pos.x), -(tz - p.pos.z));
  const H = window.H = { fp, p, T, feet, yawTo,
    place(x, z, y) { fp.controls.placeAt(x, z, y); p.vel.set(0, 0, 0); p.keys.clear(); for (let i = 0; i < 3; i++) fp.controls.update(DT); },
    // n ticks with these keys (and the yaw held, or steered by steer() each tick); log the lowest feet and air time
    run(n, keys, steer, hopAt) {
      p.keys.clear(); for (const k of keys) p.keys.add(k);
      let minF = Infinity, maxF = -Infinity, air = 0, maxAir = 0;
      for (let i = 0; i < n; i++) {
        if (steer) p.yaw = steer();
        if (hopAt !== undefined && i === hopAt) fp.controls.hop();
        fp.controls.update(DT);
        const f = feet(); minF = Math.min(minF, f); maxF = Math.max(maxF, f);
        if (!p.onGround) { air += DT; maxAir = Math.max(maxAir, air); } else air = 0;
      }
      p.keys.clear();
      return { minF, maxF, maxAir, x: p.pos.x, z: p.pos.z, f: feet(), on: p.onGround };
    },
    // walk to (tx, tz), steering; at most secs
    walkTo(tx, tz, secs = 20, keys = ['KeyW']) {
      let minF = Infinity, maxAir = 0, air = 0, n = 0;
      p.keys.clear(); for (const k of keys) p.keys.add(k);
      while (n++ < secs * 60 && Math.hypot(tx - p.pos.x, tz - p.pos.z) > 0.5) {
        p.yaw = yawTo(tx, tz); fp.controls.update(DT);
        minF = Math.min(minF, feet()); if (!p.onGround) { air += DT; maxAir = Math.max(maxAir, air); } else air = 0;
      }
      p.keys.clear();
      for (let i = 0; i < 20; i++) fp.controls.update(DT);
      return { reached: Math.hypot(tx - p.pos.x, tz - p.pos.z) <= 0.75, minF, maxAir, f: feet(), x: p.pos.x, z: p.pos.z };
    },
    settle(secs = 8) { let n = 0; do { fp.controls.update(DT); } while (!p.onGround && n++ < secs * 60); for (let i = 0; i < 10; i++) fp.controls.update(DT); return p.onGround; },
    // a landing is sane: standing, not under the ground (unless a stacked floor holds them), inside the limit or a
    // corridor, inside no collider, and able to walk off (one of four directions moves them a metre)
    sane() {
      const x = p.pos.x, z = p.pos.z, ft = feet(), g = T.heightAt(x, z);
      const inside = fp.mountains.inWalk(x, z) || Math.hypot(x, z) <= fp.mountains.walkLimit(x, z) + 0.01;
      const under = !p.onStack && ft < g - 0.15;
      let inCol = null;
      for (const c of p.colliders) {
        let px = c.x, pz = c.z;
        if (c.len !== undefined) { let t = (x - c.x1) * c.ux + (z - c.z1) * c.uz; t = Math.max(0, Math.min(c.len, t)); px = c.x1 + c.ux * t; pz = c.z1 + c.uz * t; }
        if (Math.hypot(x - px, z - pz) >= c.r + 0.4) continue;
        if (c.h !== undefined && (ft >= c.y + c.h - 0.13 || ft + 1.7 < c.y)) continue;
        inCol = { x: c.x, z: c.z, r: c.r }; break;
      }
      let moves = false;
      const s = { x, y: p.pos.y, z, yaw: p.yaw, vy: p.vy, on: p.onGround, st: p.onStack };
      for (const a of [0, 1.57, 3.14, 4.71]) {
        p.pos.set(s.x, s.y, s.z); p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true; p.onStack = s.st; p.yaw = a;
        const r = H.run(120, ['KeyW', 'ShiftLeft']);
        if (Math.hypot(r.x - x, r.z - z) > 1) { moves = true; break; }
      }
      p.pos.set(s.x, s.y, s.z); p.vel.set(0, 0, 0); p.vy = 0; p.onGround = s.on; p.onStack = s.st; p.yaw = s.yaw;
      return { ok: p.onGround && !under && inside && !inCol && moves, on: p.onGround, under, inside, inCol, moves, x, z, feet: ft, ground: g };
    },
    async frames(n = 90) {
      for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r));
      const ts = [];
      for (let i = 0; i < n; i++) ts.push(await new Promise((r) => requestAnimationFrame(r)));
      const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
      return d[Math.floor(d.length / 2)];
    },
  };
})()`;

// ---------------------------------------------------------------- the unit checks, on ?heights=test
{
  const { page, errors } = await open('');
  const U = await page.evaluate(() => {
    const { fp, p, T, feet, place, run, walkTo, settle, sane } = window.H, S = fp.heightsTest, out = {};
    // 1. the bridge: on from the ground, up 6 m, down to the ground again
    {
      const B = S.bridge;
      place(B.x0 - 4, B.z);
      const g0 = feet(); let top = -Infinity;
      for (const x of [B.x0 + 6, B.x0 + 18, B.x0 + 30, B.x1 + 4]) { const r = walkTo(x, B.z); top = Math.max(top, feet(), r.minF); }
      out.bridge = { g0, x1: B.x1, top: S.bridge.top, peak: top, end: feet(), endGround: T.heightAt(p.pos.x, p.pos.z), x: p.pos.x };
      place(B.x0 + 18, B.z, B.top);
      p.yaw = Math.PI; const r = run(180, ['KeyW', 'ShiftLeft']); // +z, a hurry at the held side
      const r2 = (place(B.x0 + 18, B.z, B.top), p.yaw = 0, run(180, ['KeyW']));
      out.bridgeHeld = { south: { f: r.f, z: r.z }, north: { f: r2.f, z: r2.z }, top: B.top, z0: B.z - 1, z1: B.z + 1 };
    }
    // 2. a floor under a floor: the deck under the beam; the beam over the deck; off the beam onto the deck
    {
      const D = S.deck, Bm = S.beam;
      place(D.x0 + 1, (D.z0 + D.z1) / 2, D.y);
      const a = walkTo(D.x1 - 1, (D.z0 + D.z1) / 2); // under the beam (it crosses at x S.x)
      place(Bm.x, D.z0 + 1, Bm.y);
      const b = walkTo(Bm.x, D.z1 - 1);
      place(Bm.x, (D.z0 + D.z1) / 2, Bm.y);
      p.yaw = -Math.PI / 2; run(30, ['KeyW', 'ShiftLeft']); settle();
      out.stack = { deckY: D.y, beamY: Bm.y, under: { f: a.f, min: a.minF, reached: a.reached }, over: { f: b.f, min: b.minF, reached: b.reached }, offOnto: { f: feet(), on: p.onGround, stack: p.onStack?.name } };
    }
    // 3. the cut: down 3 m under the ground and out; sideways in it, held
    {
      const C = S.cut;
      place(C.x0 - 4, C.z);
      walkTo(C.x0 + 1, C.z); const r = walkTo(C.x0 + 20, C.z);
      const inCut = { f: feet(), lo: C.lo, ground: T.heightAt(p.pos.x, p.pos.z), stack: p.onStack?.name };
      p.yaw = Math.PI; const side = run(150, ['KeyW', 'ShiftLeft']);
      const held = { f: side.f, z: side.z, zc: C.z };
      walkTo(C.x0 + 20, C.z); walkTo(C.x1 - 1, C.z); const e = walkTo(C.x1 + 4, C.z);
      out.cut = { inCut, held, out: { f: feet(), ground: T.heightAt(p.pos.x, p.pos.z), reached: e.reached }, minF: r.minF };
    }
    // 4. the corridor: out along it past r 348; a step sideways stops at its side; placeAt honours it
    {
      const K = S.corridor, at = (r, s = 0) => [K.ux * r + K.vx * s, K.uz * r + K.vz * s];
      place(...at(320));
      walkTo(...at(330)); const w = walkTo(...at(368));
      const rOut = Math.hypot(p.pos.x, p.pos.z);
      place(...at(362), K.y);
      p.yaw = Math.atan2(-K.vx, -K.vz); const side = run(120, ['KeyW', 'ShiftLeft']);
      const sOff = side.x * K.vx + side.z * K.vz, rSide = Math.hypot(side.x, side.z);
      const pl = fp.controls.placeAt(...at(364), K.y);
      const plOut = fp.controls.placeAt(...at(364, 30));
      const sad = fp.mountains.saddle, ax = Math.cos(sad.azimuth), az = Math.sin(sad.azimuth);
      out.corridor = { reached: w.reached, rOut, rSide, sOff, half: K.half, placed: Math.hypot(pl.x, pl.z), placedOut: Math.hypot(plOut.x, plOut.z), saddle: fp.mountains.walkLimit(ax * 360, az * 360), saddleEdge: fp.mountains.walkLimit(Math.cos(sad.azimuth + 0.2) * 360, Math.sin(sad.azimuth + 0.2) * 360) };
    }
    // 5. the edge-guard on the beam's spur (0.9 m wide, west along z S.beam.z0 - 0.45 from x S.x - 25 to S.x)
    {
      const Bm = S.beam, zc = Bm.z0 - 0.45, x0 = S.x - 2, y = Bm.y, end = S.x - 24;
      const along = (keys, drift) => { place(x0, zc, y); return run(Math.ceil((22 / (keys.includes('ShiftLeft') ? 6.6 : 3.6)) * 60), keys, () => Math.PI / 2 + drift); };
      const walkDrift = along(['KeyW'], 0.25), hurryDrift = along(['KeyW', 'ShiftLeft'], -0.25);
      const atLip = (keys, n, hopAt) => { place(x0 - 5, zc, y); return run(n, keys, () => 0, hopAt); }; // yaw 0 faces -z: straight at the north lip
      const stop = atLip(['KeyW'], 21);   // 0.35 s: at the lip, pressing
      const press = atLip(['KeyW'], 72);  // 1.2 s: past the dwell
      const hurry = atLip(['KeyW', 'ShiftLeft'], 18); // 0.3 s
      const hop = atLip(['KeyW'], 90, 12);
      // coming at the lip at a slant and letting go: momentum does not carry them over
      place(x0 - 5, zc, y); p.yaw = 0.6; run(12, ['KeyW']); const coast = run(60, []);
      out.guard = { y, end, walkDrift, hurryDrift, stop, press, hurry, hop, coast };
    }
    // 6. the edge-guard on the Great Span's parapet (south side, x -200): along it drifting out; straight out
    {
      const Y = 56, zp = 215 + 7.4;
      place(-200, zp, Y + 1.05);
      const top = feet();
      const along = run(240, ['KeyW'], () => -Math.PI / 2 - 0.2); // east, drifting south (out)
      place(-200, zp, Y + 1.05); const outStop = run(30, ['KeyW'], () => Math.PI);
      place(-200, zp, Y + 1.05); const outPress = run(90, ['KeyW'], () => Math.PI);
      const landed = settle(); const s = sane();
      // the slip the owner felt: hurrying along the deck, drifting 0.15 rad toward the parapet, hopping every 1.5 s
      // (each hop scrambles onto the parapet's top; the next carried them off it, 56 m down)
      let hopFalls = 0, hopUp = 0;
      for (const z0 of [212, 214, 216, 218]) {
        fp.controls.placeAt(-230, z0, Y); p.vel.set(0, 0, 0); p.yaw = -Math.PI / 2 - 0.15; p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft');
        let up = false, fell = false;
        for (let i = 0; i < 60 * 20 && p.pos.x < -125; i++) { if (i % 90 === 89) fp.controls.hop(); fp.controls.update(1 / 60); if (feet() > Y + 0.3 && p.onGround) up = true; if (feet() < Y - 3) { fell = true; break; } }
        p.keys.clear(); hopFalls += fell; hopUp += up;
      }
      out.parapet = { top, along, outStop, outPress, landed, sane: s, hopFalls, hopUp };
    }
    // 7. hops the guard must not touch: off the 1 m step (keys let go at the edge, and strafing off it), and down a
    // steep bank with no keys or strafing (the drop over a hop's length is far more than 1.5 m, but the floor is unbroken)
    {
      const St = S.step, zc = (St.z0 + St.z1) / 2, yawE = -Math.PI / 2; // facing +x
      const offStep = () => ({ x: p.pos.x, f: feet(), ground: T.heightAt(p.pos.x, p.pos.z), on: p.onGround, stack: p.onStack?.name || null });
      place(St.x1 - 1.6, zc, St.y); p.yaw = yawE; run(20, ['KeyW']); run(90, [], undefined, 0); const a = offStep();
      place(St.x1 - 1.0, zc, St.y); p.yaw = 0; run(90, ['KeyD'], undefined, 3); // yaw 0 faces -z; right (D) is +x
      const b = offStep();
      // a bank: the steepest ground between 0.45 and 0.8 rad within 120 m of the site, downhill
      let bank = null;
      for (let dx = -120; dx <= 120 && !bank; dx += 6) for (let dz = -120; dz <= 120; dz += 6) {
        const x = S.x + dx, z = S.z + dz, sl = T.slopeAt(x, z);
        if (sl > 0.45 && sl < 0.8 && T.waterLevelAt(x, z) === null && Math.hypot(x, z) < 330) { bank = { x, z, sl }; break; }
      }
      const res = { off: { ...a, edge: St.x1, y: St.y }, strafe: { ...b, edge: St.x1, y: St.y }, bank };
      if (bank) {
        const n = T.normalAt(bank.x, bank.z), hl = Math.hypot(n.x, n.z), dx = n.x / hl, dz = n.z / hl; // downhill
        place(bank.x, bank.z); p.yaw = Math.atan2(-dx, -dz);
        p.vel.set(dx * 3, 0, dz * 3); fp.controls.hop(); const x0 = p.pos.x, z0 = p.pos.z;
        run(40, []); res.bankFree = Math.hypot(p.pos.x - x0, p.pos.z - z0);
        place(bank.x, bank.z); p.yaw = Math.atan2(-dz, dx); // facing across the slope, so strafing right goes downhill
        const s0x = p.pos.x, s0z = p.pos.z; run(1, ['KeyD']); fp.controls.hop(); run(40, ['KeyD']);
        res.bankStrafe = Math.hypot(p.pos.x - s0x, p.pos.z - s0z);
      }
      out.hops = res;
    }
    out.noFall = !fp.fall && !document.getElementById('fall');
    return out;
  });
  // the view from above, on the page's own frames: at walking height and on the Span's deck nothing changes; held
  // 120 m up the box grows and the eye stays inside it; turning in place there redraws the map no more than on the ground
  const V = await page.evaluate(async () => {
    const { fp, p } = window.H, sc = fp.sun.light.shadow.camera, tgt = fp.sun.light.target.position, cad = fp.shadowCadence.stats;
    const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const at = async (x, z, y, held) => {
      let rel = null;
      fp.controls.placeAt(x, z, y);
      if (held) { const Y = fp.terrain.heightAt(x, z) + held + p.eye; rel = fp.controls.carry({ step(pos) { pos.set(x, Y, z); } }); }
      p.pitch = -0.3; await frames(20);
      const turn0 = cad.redraws;
      for (let i = 0; i < 90; i++) { p.yaw += (Math.PI * 2) / 90; await frames(1); }
      const r = { box: sc.right, density: fp.scene.fog.density, redraws: cad.redraws - turn0, eyeToCentre: Math.hypot(tgt.x - p.pos.x, tgt.z - p.pos.z) };
      rel?.();
      return r;
    };
    return { ground: await at(0, 60), deck: await at(-200, 215, 56), high: await at(0, 0, undefined, 120) };
  });
  const B = U.bridge;
  check(Math.abs(B.peak - B.top) < 0.15, 'stacked: the bridge carries the walker up off the ground to its top', `peak ${f2(B.peak)}, top ${f2(B.top)}`);
  check(Math.abs(B.end - B.endGround) < 0.1 && B.x > B.x1, 'stacked: and back down onto the ground beyond', `feet ${f2(B.end)}, ground ${f2(B.endGround)}`);
  const BH = U.bridgeHeld;
  check(Math.abs(BH.south.f - BH.top) < 0.05 && Math.abs(BH.north.f - BH.top) < 0.05, 'held edges: a hurry and a walk sideways off the bridge stay on it', BH);
  const St = U.stack;
  check(St.under.reached && Math.abs(St.under.f - St.deckY) < 0.05 && Math.abs(St.under.min - St.deckY) < 0.05, 'stacked: on the deck under the beam, the walker stays at the deck', St.under);
  check(St.over.reached && Math.abs(St.over.f - St.beamY) < 0.05 && St.over.min > St.beamY - 0.05, 'stacked: on the beam over the deck, the walker stays on the beam', St.over);
  check(St.offOnto.on && Math.abs(St.offOnto.f - St.deckY) < 0.05, 'stacked: off the beam over the deck lands on the deck', St.offOnto);
  const C = U.cut;
  check(Math.abs(C.inCut.f - C.inCut.lo) < 0.05 && C.inCut.ground - C.inCut.f > 2, 'stacked: the cut holds the walker under the ground', C.inCut);
  check(Math.abs(C.held.f - C.inCut.lo) < 0.05 && Math.abs(C.held.z - C.held.zc) <= 1.01, 'held edges: a hurry at the cut\'s side stays in it', C.held);
  check(C.out.reached && Math.abs(C.out.f - C.out.ground) < 0.1, 'stacked: up out of the cut onto the ground', C.out);
  const K = U.corridor;
  check(K.reached && K.rOut > 360, 'corridor: walked out along it past the circle', `r ${f2(K.rOut)}`);
  check(K.rSide > 355 && Math.abs(K.sOff) <= K.half + 0.01, 'corridor: a step sideways out of it stops at its side, not at the circle', `r ${f2(K.rSide)}, ${f2(K.sOff)} m off its line`);
  check(Math.abs(K.placed - 364) < 0.05 && K.placedOut <= 348.01, 'corridor: placeAt honours it, and the circle outside it', `in ${f2(K.placed)}, out ${f2(K.placedOut)}`);
  check(Math.abs(K.saddle - 372) < 0.01 && Math.abs(K.saddleEdge - 348) < 0.01, 'corridor: the saddle\'s wedge is as it was', `axis ${f2(K.saddle)}, off it ${f2(K.saddleEdge)}`);
  const G = U.guard;
  check(G.walkDrift.minF > G.y - 0.05 && G.walkDrift.x < G.end + 1.5, 'edge-guard: a walk drifting 0.25 rad along the 0.9 m beam stays on it to the end', `x ${f2(G.walkDrift.x)} (end ${f2(G.end)}), lowest ${f2(G.walkDrift.minF)}`);
  check(G.hurryDrift.minF > G.y - 0.05 && G.hurryDrift.x < G.end + 1.5, 'edge-guard: a hurry drifting 0.25 rad along it stays on it', `x ${f2(G.hurryDrift.x)}, lowest ${f2(G.hurryDrift.minF)}`);
  check(G.stop.minF > G.y - 0.05, 'edge-guard: a slow walk straight at the lip stops at it', `feet ${f2(G.stop.f)}`);
  check(G.press.f < G.y - 1, 'edge-guard: pressing on at the lip for a moment goes over', `feet ${f2(G.press.f)}`);
  check(G.hurry.f < G.y - 0.3 || !G.hurry.on, 'edge-guard: a hurry straight at the lip goes over at once', `feet ${f2(G.hurry.f)} after 0.3 s`);
  check(G.hop.f < G.y - 1, 'edge-guard: a hop goes over', `feet ${f2(G.hop.f)}`);
  check(G.coast.minF > G.y - 0.05, 'edge-guard: coming at the lip on a slant and letting go, momentum does not carry them over', `lowest ${f2(G.coast.minF)}`);
  const P = U.parapet;
  check(P.top > 56.3 && P.top < 57.1, 'the Span: placeAt with a height stands the walker on a parapet\'s top', `feet ${f2(P.top)}`);
  check(P.along.minF > 56.2, 'the Span: walking along the parapet drifting outward stays on it', `lowest ${f2(P.along.minF)}`);
  check(P.outStop.minF > 56.2, 'the Span: a slow walk straight out stops at the parapet\'s outer lip', `lowest ${f2(P.outStop.minF)}`);
  check(P.hopFalls === 0, 'the Span: hurrying along the deck drifting toward the parapet and hopping, nobody goes over', `${P.hopUp} of 4 scrambled onto the parapet, ${P.hopFalls} fell`);
  check(P.sane.feet < 50 && P.landed && P.sane.ok, 'the Span: pressing on goes over, and lands sane', P.sane);
  const Hp = U.hops;
  check(Hp.off.x > Hp.off.edge && Hp.off.on && !Hp.off.stack && Math.abs(Hp.off.f - Hp.off.ground) < 0.05, 'hops: off the 1 m step with the keys let go, the hop carries on off it', Hp.off);
  check(Hp.strafe.x > Hp.strafe.edge && Hp.strafe.on && !Hp.strafe.stack && Math.abs(Hp.strafe.f - Hp.strafe.ground) < 0.05, 'hops: strafing off the 1 m step, untouched', Hp.strafe);
  check(!!Hp.bank && Hp.bankFree > 0.75, 'hops: down a steep bank with no keys, untouched (3 m/s downhill, air drag alone: 0.86 m)', Hp.bank ? `slope ${f2(Hp.bank.sl)} rad, carried ${f2(Hp.bankFree)} m` : 'no bank found');
  check(!!Hp.bank && Hp.bankStrafe > 1.2, 'hops: strafing down a steep bank, untouched', `moved ${f2(Hp.bankStrafe)} m`);
  check(U.noFall, 'fall: without ?fall=1 nothing is installed');
  check(V.ground.box === 95 && Math.abs(V.ground.density - 0.0022) < 1e-7, 'from above: at walking height the shadow box and the haze are as before', V.ground);
  check(V.deck.box === 95 && Math.abs(V.deck.density - 0.0022) < 1e-7, 'from above: on the Span\'s deck (56 m over the valley) too', V.deck);
  check(V.high.box >= 200 && V.high.eyeToCentre <= V.high.box - 30, 'from above: held 120 m up the box grows and the eye stays well inside it', V.high);
  check(V.high.redraws <= Math.max(V.ground.redraws, 4), 'from above: turning in place 120 m up redraws the shadow map no more than on the ground', `120 m ${V.high.redraws}, deck ${V.deck.redraws}, ground ${V.ground.redraws} redraws in a 3 s turn`);
  check(errors.length === 0, 'no page errors (test floors)', errors.slice(0, 3).join(' | '));

  // ---------------------------------------------------------------- the ground the feet use is the ground drawn
  // (v12-H2: nothing a module does after the terrain is baked may move heightAt; sampled over the icefall's notch)
  const GB = await page.evaluate(() => {
    const T = window.__fp.terrain, m = T.mesh, pos = m.geometry.attributes.position, v = new window.__fp.THREE.Vector3();
    let n = 0, worst = 0, at = null;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.x < -15 || v.x > 115 || v.z > -285 || v.z < -420) continue;
      const d = Math.abs(T.heightAt(v.x, v.z) - v.y); n++;
      if (d > worst) { worst = d; at = [+v.x.toFixed(1), +v.z.toFixed(1)]; }
    }
    return { n, worst, at };
  });
  check(GB.n > 500 && GB.worst < 0.02, 'the icefall\'s heightAt after load equals the baked mesh at its vertices', `${GB.n} vertices, worst ${f2(GB.worst)} m${GB.at ? ' at ' + GB.at.join(', ') : ''}`);

  // ---------------------------------------------------------------- every registered ascent
  const A = await page.evaluate(async () => {
    const { fp, p, T, feet, place, run, walkTo, settle, sane } = window.H, res = [];
    for (const a of fp.ascents.list) {
      const pts = a.path.map(([x, z, y]) => ({ x, z, y }));
      const r = { id: a.id, test: !!a.test, pts: [], fell: false, offs: [] };
      place(pts[0].x, pts[0].z, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const q = pts[i], w = walkTo(q.x, q.z, 60);
        r.pts.push({ i, reached: w.reached, f: w.f, want: q.y, ok: w.reached && (q.y === undefined || Math.abs(w.f - q.y) < 0.3) });
        if (w.maxAir > 0.45) r.fell = true;
      }
      const top = pts[pts.length - 1];
      // the frame time on the floor (the first point) and at the top
      const hold = (q) => { place(q.x, q.z, q.y); const at = p.pos.clone(); return fp.controls.carry({ step(pos) { pos.copy(at); } }); };
      let rel = hold(pts[0]); r.msFloor = await window.H.frames(); rel();
      rel = hold(top); r.msTop = await window.H.frames(); rel();
      // step off at each off: the point that far along the path, a hurry at right angles to it (both sides tried)
      const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); L.push(d); tot += d; }
      for (const off of a.offs || [0.3, 0.6, 0.95]) {
        let s = off * tot, i = 0; while (i < L.length - 1 && s > L[i]) { s -= L[i]; i++; }
        const k = Math.min(1, s / (L[i] || 1)), A0 = pts[i], A1 = pts[i + 1];
        // walk the path up to that point (so the walker is on the floor that holds it there)
        place(pts[0].x, pts[0].z, pts[0].y);
        for (let j = 1; j <= i; j++) walkTo(pts[j].x, pts[j].z, 60);
        const tx = A0.x + (A1.x - A0.x) * k, tz = A0.z + (A1.z - A0.z) * k;
        walkTo(tx, tz, 60);
        const f0 = feet(), dir = Math.atan2(-(A1.x - A0.x), -(A1.z - A0.z));
        let o = null;
        for (const side of [1, -1]) {
          const sx = p.pos.x, sz = p.pos.z, sy = p.pos.y, st = p.onStack;
          p.yaw = dir + side * Math.PI / 2;
          run(150, ['KeyW', 'ShiftLeft']); settle();
          const dropped = f0 - feet();
          o = { off, side, from: f0, feet: feet(), dropped, sane: sane() };
          if (dropped > 0.5 || a.held) break;
          p.pos.set(sx, sy, sz); p.onStack = st; p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true;
        }
        r.offs.push(o);
      }
      res.push(r);
    }
    return res;
  });
  const ids = A.map((a) => a.id);
  check(['test-bridge', 'test-beam', 'test-cut', 'test-corridor'].every((id) => ids.includes(id)), 'ascents: the test ascents are registered', ids.join(', '));
  for (const a of A) {
    check(a.pts.every((q) => q.ok) && !a.fell, `ascent ${a.id}: walked point to point, the feet on it`, a.pts.filter((q) => !q.ok).map((q) => `point ${q.i}: ${q.reached ? '' : 'not reached, '}feet ${f2(q.f)}${q.want !== undefined ? ' want ' + f2(q.want) : ''}`).join('; ') || `${a.pts.length} points`);
    for (const o of a.offs) check(o && o.sane.ok, `ascent ${a.id}: stepped off at ${o?.off}, a sane landing`, o && `dropped ${f2(o.dropped)} m to ${f2(o.feet)}; ${o.sane.ok ? 'standing, inside, free' : JSON.stringify(o.sane)}`);
    check(a.msTop <= a.msFloor * 1.5 + 4, `ascent ${a.id}: the frame time at the top is not much worse than on the floor`, `floor ${f2(a.msFloor)} ms, top ${f2(a.msTop)} ms`);
  }
  check(errors.length === 0, 'no page errors (ascents)', errors.slice(0, 3).join(' | '));
  await page.close();
}

// ---------------------------------------------------------------- the fall, with ?fall=1
{
  const { page, errors } = await open('&fall=1');
  const F = await page.evaluate(async () => {
    const { fp, p, feet, place, run } = window.H, S = fp.heightsTest, out = {};
    out.has = !!fp.fall;
    // a 7 m drop: off the beam's spur, nothing
    place(S.x - 10, S.beam.z0 - 0.45, S.beam.y); p.yaw = 0; run(150, ['KeyW', 'ShiftLeft']);
    out.small = { phase: fp.fall.phase, falls: fp.fall.falls, f: feet() };
    // 18 m: off the perch, on the page's own frames
    place(S.perch.x, S.perch.z, S.perch.y); p.yaw = Math.PI; p.keys.add('KeyW'); p.keys.add('ShiftLeft'); // south, away from the beam under its north edge
    const seen = []; const el = document.getElementById('fall'); const t0 = performance.now();
    while (performance.now() - t0 < 9000) {
      await new Promise((r) => requestAnimationFrame(r));
      if (performance.now() - t0 > 1200) p.keys.clear();
      seen.push({ t: performance.now() - t0, phase: fp.fall.phase, amt: fp.fall.amount, op: +getComputedStyle(el).opacity, y: p.pos.y - p.eye, carried: p.carried });
    }
    const first = (ph) => seen.find((s) => s.phase === ph);
    out.falling = first('falling'); out.dark = first('dark'); out.waking = first('waking');
    out.end = seen[seen.length - 1];
    out.at = { x: p.pos.x, z: p.pos.z, spawn: fp.spawn, on: p.onGround, carried: p.carried, yaw: p.yaw };
    out.lowestWhileOpen = Math.min(...seen.filter((s) => s.phase === 'falling' && s.amt < 0.999).map((s) => s.y));
    out.ground = fp.terrain.heightAt(S.perch.x, S.perch.z + 2);
    return out;
  });
  check(F.has, 'fall: ?fall=1 installs the blackout');
  check(F.small.phase === 'idle' && F.small.falls === 0, 'fall: a 7 m drop does not black out', F.small);
  check(!!F.falling && !!F.dark && F.dark.amt === 1, 'fall: an 18 m fall closes the view and goes dark', { falling: F.falling, dark: F.dark });
  check(F.lowestWhileOpen > F.ground + 0.5, 'fall: the view is shut before the ground (no impact shown)', `lowest feet with the view still open ${f2(F.lowestWhileOpen)}, ground ${f2(F.ground)}`);
  check(!!F.waking && F.end.phase === 'idle' && F.end.op === 0, 'fall: the walker wakes and the view opens again', { waking: F.waking, end: F.end });
  check(Math.hypot(F.at.x - F.at.spawn.x, F.at.z - F.at.spawn.z) < 2 && F.at.on && !F.at.carried, 'fall: they wake at the keep\'s gate (the spawn), standing and free', F.at);
  check(errors.length === 0, 'no page errors (fall)', errors.slice(0, 3).join(' | '));
  await page.close();
}
await browser.close();
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
