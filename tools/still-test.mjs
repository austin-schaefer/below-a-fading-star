#!/usr/bin/env node
// v7 still-figures check (src/v7/still.js): CB the Long Sleeper, CI the Stylite, CL the Accrescent.
// The Sleeper lies within 4 m of a medlar trunk; his chest rises once in a 60 s window (a lift of 5 cm); his eyelids move
// only within 5 m (bursts of at most 2 mm); a fruit dropped lands within 1.5 m of him and stays. The Stylite sits on the
// tallest tor's down-cast top (within 0.2 m); the basket stays at the foot until the walker comes within 18 m of it, then
// rises to his hand and is back at the foot after the whole offer, with the creak cue while it moves. The Accrescent
// faces the keep within 3 degrees; the trail's first print is on the Lattice's crystal ground, its last at his rear
// foot, with no gap over 1.2 m; a forced hour step adds one print and moves him 0.75 m. stats() is within budget (8
// draws, 30k triangles on high), and the module adds no light.
// Usage: node tools/still-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
const errors = [];
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(900000);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`${base}/?q=high&perf=1&grain=0&pos=120,-60`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 900000 });
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); const f = window.__fp.sky.flicker; f.next = 1e9; f.phase = 0; f.hold = 1;
  window.__cues = []; const a = window.__fp.audio; if (a) { const orig = a.cue; a.cue = (n, p, o) => { window.__cues.push(n); try { return orig && orig(n, p, o); } catch (e) {} }; } });
const at = (x, z) => page.evaluate(([x, z]) => { const fp = window.__fp, p = fp.player; p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z); if (p.vel) p.vel.set(0, 0, 0); }, [x, z]);
const sleep = (ms) => page.waitForTimeout(ms);

// ---------------------------------------------------------------- the Sleeper
const S = await page.evaluate(() => { const s = window.__fp.still.sleeper; return { c: s.centre, t: s.trunk, medlar: !!s.medlar, ring: s.ring.length, beard: s.beardLength }; });
const dTrunk = Math.hypot(S.c.x - S.t.x, S.c.z - S.t.z);
check(S.medlar && dTrunk < 4, 'the Sleeper lies within 4 m of a medlar trunk', `${dTrunk.toFixed(2)} m, ring of ${S.ring} toadstools`);
check(S.ring >= 18 && S.ring <= 24 && S.beard > 1.1 && S.beard < 1.5, 'a ring of 18-24 toadstools, a beard 1.2 m long', `${S.ring}, ${S.beard.toFixed(2)} m`);
// near him (2 m): the breath for a full minute and the lids
await at(S.c.x + 2.2, S.c.z);
const near = await page.evaluate(async () => {
  const s = window.__fp.still.sleeper, out = { rises: 0, max: 0, lidMax: 0, lidSeen: 0, cues0: window.__cues.length }; let prev = 0;
  const t0 = performance.now();
  while (performance.now() - t0 < 61000) { const b = s.breath; if (b >= 0.5 && prev < 0.5) out.rises++; prev = b; out.max = Math.max(out.max, b); const l = Math.abs(s.lid); out.lidMax = Math.max(out.lidMax, l); if (l > 1e-5) out.lidSeen++; await new Promise((r) => setTimeout(r, 40)); }
  out.cues = window.__cues.filter((n) => n === 'sleeper-breath').length; return out; });
check(near.rises === 1 && near.max > 0.97, 'his chest rises once in a 60 s window, to the full 5 cm', `rises ${near.rises}, peak ${near.max.toFixed(2)}`);
check(near.lidSeen > 3 && near.lidMax <= 0.0021 && near.lidMax > 0.001, 'within 5 m his eyelids move in bursts of at most 2 mm', `${near.lidSeen} samples, max ${(near.lidMax * 1000).toFixed(2)} mm`);
check(near.cues >= 1, "the 'sleeper-breath' cue fires at the inhale within 12 m", `${near.cues}`);
await at(S.c.x + 20, S.c.z + 3);
const far = await page.evaluate(async () => { const s = window.__fp.still.sleeper, b0 = s.lidBursts; let seen = 0, max = 0; const t0 = performance.now(); while (performance.now() - t0 < 22000) { const l = Math.abs(s.lid); max = Math.max(max, l); if (l > 0) seen++; await new Promise((r) => setTimeout(r, 40)); } return { seen, max, bursts: s.lidBursts - b0 }; });
check(far.seen === 0 && far.bursts >= 1, 'beyond 5 m the eyelids never show (the bursts run on regardless)', `${far.seen} samples, ${far.bursts} bursts passed`);
await at(S.c.x + 8, S.c.z + 2);
const fruit = await page.evaluate(async () => { const s = window.__fp.still.sleeper; s.landed.length = 0; const ok = s.drop(); await new Promise((r) => setTimeout(r, 3500)); const L = s.landed[s.landed.length - 1];
  return { ok, L, d: L ? Math.hypot(L.x - s.centre.x, L.z - s.centre.z) : null, stays: s.fruitOnGround(), cue: window.__cues.includes('sleeper-fruit') }; });
check(fruit.ok && fruit.d != null && fruit.d <= 1.5 && fruit.stays >= 1, 'a fruit lands within 1.5 m of him and stays', `${fruit.d?.toFixed(2)} m, ${fruit.stays} on the ground`);
check(fruit.cue, "the 'sleeper-fruit' cue fires at the landing");
const keep12 = await page.evaluate(async () => { const s = window.__fp.still.sleeper; for (let i = 0; i < 30; i++) { s.drop(); await new Promise((r) => setTimeout(r, 1500)); } return s.fruitOnGround(); });
check(keep12 <= 12, 'at most 12 fruit stay', `${keep12}`);

// ---------------------------------------------------------------- the Stylite
const Y = await page.evaluate(async () => {
  const fp = window.__fp, s = fp.still.stylite, { makeDownCaster } = await import('/src/fauna/geo.js');
  const tors = fp.scene.getObjectByName('highling-tors'); tors.updateWorldMatrix(true, true); const cast = makeDownCaster([tors]); const y = cast(s.seat.x, s.seat.z, 60, 80);
  return { seat: s.seat, cast: y, foot: s.foot, ground: fp.terrain.heightAt(s.foot.x, s.foot.z), len: s.length, face: s.face, sun: fp.sun.dir };
});
check(Y.cast != null && Math.abs(Y.cast - Y.seat.y) < 0.2, 'the Stylite sits on the tallest tor\'s top (within 0.2 m of the down-cast)', `seat ${Y.seat.y.toFixed(2)} cast ${Y.cast?.toFixed(2)}`);
const fl = Math.hypot(Y.sun.x, Y.sun.z), dot = (Y.face[0] * Y.sun.x + Y.face[1] * Y.sun.z) / fl;
check(dot > 0.999 && Math.abs(Y.foot.y - Y.ground - 0.42) < 0.05, 'he faces the sun\'s azimuth; the basket hangs at the foot on the turf', `cos ${dot.toFixed(4)}`);
await at(Y.foot.x - 70, Y.foot.z + 10);
await sleep(2500);
const idle = await page.evaluate(() => { const s = window.__fp.still.stylite; return { state: s.state, sb: s.sb, len: s.length }; });
check(idle.state === 'idle' && Math.abs(idle.sb - idle.len) < 0.01, 'beyond 18 m the basket stays at the foot', `${idle.state}`);
await at(Y.foot.x - 12, Y.foot.z + 2);
const offer = await page.evaluate(async () => {
  const s = window.__fp.still.stylite, c0 = window.__cues.filter((n) => n === 'stylite-creak').length; let min = 1e9, started = false, back = false; const t0 = performance.now();
  while (performance.now() - t0 < 36000) { if (s.state === 'offer') started = true; min = Math.min(min, s.sb); if (started && s.state === 'idle' && Math.abs(s.sb - s.length) < 0.01) { back = true; break; } await new Promise((r) => setTimeout(r, 50)); }
  return { started, min, back, len: s.length, creaks: window.__cues.filter((n) => n === 'stylite-creak').length - c0, offers: s.offers };
});
check(offer.started && offer.min < 0.5, 'within 18 m the basket rises to his hand', `rope ${offer.len.toFixed(1)} m, closest ${offer.min.toFixed(2)} m from the hand`);
check(offer.back && offer.offers === 1, 'and comes back down to the foot (one offer)', `offers ${offer.offers}`);
check(offer.creaks >= 20, "the 'stylite-creak' cue fires every 0.8-1.2 s while the rope moves", `${offer.creaks} creaks in about 31 s`);

// ---------------------------------------------------------------- the Accrescent
const C = await page.evaluate(() => {
  const fp = window.__fp, a = fp.still.accrescent, P = a.prints, T = fp.terrain; let gap = 0; for (let i = 1; i < a.N; i++) gap = Math.max(gap, Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z));
  const hx = a.heading[0], hz = a.heading[1], rf = [a.site.x + hx * -0.4 + hz * 0.18, a.site.z + hz * -0.4 - hx * 0.18];
  const bearing = Math.atan2(a.keep.x - a.pos.x, a.keep.z - a.pos.z), rot = a.man.rotation.y, d = Math.abs(Math.atan2(Math.sin(bearing - rot), Math.cos(bearing - rot))) * 180 / Math.PI;
  return { N: a.N, gap, crystal: T.biomeAt(P[0].x, P[0].z).crystal, first: [P[0].x, P[0].z], lastd: Math.hypot(P[a.N - 1].x - rf[0], P[a.N - 1].z - rf[1]), face: d, done: a.state.done, uN: a.uN.value, x: a.pos.x, z: a.pos.z };
});
check(C.face < 3, 'the Accrescent faces the keep within 3 degrees', `${C.face.toFixed(2)} deg`);
check(C.crystal > 0.3 && Math.hypot(C.first[0] - 40, C.first[1] + 265) < 3, "the trail's first print is on the Lattice's crystal ground, at its edge", `crystal ${C.crystal.toFixed(2)}, ${C.N} prints`);
check(C.lastd < 0.3 && C.gap <= 1.2, "its last print is at his rear foot, with no gap over 1.2 m", `${C.lastd.toFixed(2)} m, widest ${C.gap.toFixed(2)} m`);
await at(C.x + 6, C.z - 8);
await page.evaluate(() => window.__fp.still.accrescent.step());
await sleep(23000);
const C2 = await page.evaluate(() => { const a = window.__fp.still.accrescent; return { done: a.state.done, uN: a.uN.value, N: a.N, x: a.pos.x, z: a.pos.z, sw: a.UB.uSwing.value, cues: window.__cues.filter((n) => n === 'accrescent-step').length }; });
check(C2.done === 1 && Math.abs(C2.uN - (C2.N + 1)) < 1e-6, 'a forced hour step adds one print', `prints ${C2.N} -> ${Math.round(C2.uN)}`);
check(Math.abs(Math.hypot(C2.x - C.x, C2.z - C.z) - 0.75) < 0.02 && C2.sw === 1, 'and moves him one pace (0.75 m), the legs changed over', `${Math.hypot(C2.x - C.x, C2.z - C.z).toFixed(3)} m`);
check(C2.cues >= 1, "the 'accrescent-step' cue fires at the step");

// ---------------------------------------------------------------- cost
const st = await page.evaluate(() => { const fp = window.__fp, s = fp.still.stats(); let lights = 0; for (const k of ['sleeper', 'stylite', 'accrescent']) for (const o of [fp.still[k]?.man, fp.still[k]?.medlar, fp.still[k]?.rope, fp.still[k]?.trail]) o?.traverse((q) => { if (q.isLight) lights++; }); return { ...s, lights }; });
check(st.calls <= 8 && st.tris <= 30000 && st.lights === 0, 'stats() within budget: at most 8 draws, 30k triangles, no lights', `${st.calls} draws, ${st.tris} triangles, ${st.lights} lights`);
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
console.log(`${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
