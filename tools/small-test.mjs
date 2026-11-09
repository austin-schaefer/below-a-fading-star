#!/usr/bin/env node
// v7 living-small check (src/v7/small.js): CM the Indistinct, CO the Repetend, CQ the Simulacrum.
// The Indistinct, over a scripted walk along the ha-ha's lawn edge (the walker's own acceleration, as controls.js has it) at
// walking and at hurrying pace: whenever the walker is within 7 m of the ditch line its distance is 7.0 +- 0.3 m and never
// under 6.7 m; it does not move while the walker stands; it stays on the ditch line (r 78.2 from the keep, the drawn floor)
// within 0.3 m. The Repetend, over a walk in to the Lynchets' east wall, along it and away: it sits or hops within 0.1 m of a
// wall-top's height and inside the Lynchets; it follows only within 18 m, and goes home beyond; each step near it is echoed
// 1.0 s later, and (v7.1) it perches within 6 m of P3 or P4 and flicks its tail and hops as each echo sounds and every 6-10 s on its own. The Simulacrum: the face forms only after flicker has been under 0.5 for 1 s, and comes apart when it rises
// past 0.85; 240 gnats a column at high and 120 at low (v7.1; 180 and 90 before). Cost: stats() within 5 draws and 5k triangles, no lights, and the
// module's CPU.
// Usage: node tools/small-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
await page.goto(`${base}/?q=high&perf=1&pos=55,-40`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.hold = 1; });
const r = {};

// a scripted walk in the page: legs of { to: [x, z] | bearing arc, speed } with the controls' acceleration (v += (v* - v) * 14 dt),
// sampling a probe every frame
const walk = (legs, probe) => page.evaluate(async ([legs, probe]) => {
  const fp = window.__fp, p = fp.player, K = { x: 40, z: 30 };
  const f = (0, eval)(probe);
  const at = (L, u) => {
    if (L.arc) { const b = (L.arc[0] + (L.arc[1] - L.arc[0]) * u) * Math.PI / 180; return [K.x + Math.sin(b) * L.r, K.z - Math.cos(b) * L.r]; }
    return [L.from[0] + (L.to[0] - L.from[0]) * u, L.from[1] + (L.to[1] - L.from[1]) * u];
  };
  const len = (L) => (L.arc ? Math.abs(L.arc[1] - L.arc[0]) * Math.PI / 180 * L.r : Math.hypot(L.to[0] - L.from[0], L.to[1] - L.from[1]));
  const out = [];
  for (const L of legs) {
    const D = len(L);
    let s = 0, v = 0, t0 = performance.now(), last = t0;
    const [x0, z0] = at(L, 0); p.pos.set(x0, fp.terrain.heightAt(x0, z0) + p.eye, z0);
    await new Promise((res) => {
      const step = () => {
        const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
        if (L.stand) { if ((now - t0) / 1000 >= L.stand) return res(); }
        else {
          v += ((s < D ? L.speed : 0) - v) * Math.min(1, 14 * dt);
          s = Math.min(D, s + v * dt);
          const [x, z] = at(L, D > 0 ? s / D : 1); p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z);
          if (s >= D && v < 0.05) return res();
        }
        out.push(f(L));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  return out;
}, [legs, probe]);

// ---- the Indistinct: along the lawn's edge (r 76.6, the walker within 7 m of the line) and back, a stand between
const indProbe = `(L) => { const s = window.__fp.small.indistinct.state(); const K = { x: 40, z: 30 }; return { leg: L.name, d: s.dist, lineD: s.lineD, phase: s.phase, held: s.held, moved: s.moved, wv: s.walkerV, r: Math.hypot(s.x - K.x, s.z - K.z), dy: s.y - window.__fp.terrain.heightAt(s.x, s.z) - 0.02 }; }`;
const ind = await walk([
  { name: 'settle', stand: 1.5, arc: [12, 12], r: 76.6 },
  { name: 'walk', arc: [12, 46], r: 76.6, speed: 3.6 },
  { name: 'stand', stand: 3, arc: [46, 46], r: 76.6 },
  { name: 'hurry', arc: [46, 14], r: 76.6, speed: 6.6 },
  { name: 'ditch', arc: [14, 40], r: 78.2, speed: 3.6 },
], indProbe);
const stat = (leg) => {
  const s = ind.filter((o) => o.leg === leg && o.lineD <= 7 && o.phase === 'shown');
  return { n: s.length, err: Math.max(0, ...s.map((o) => Math.abs(o.d - 7))), min: Math.min(...s.map((o) => o.d)) };
};
r.indWalk = stat('walk'); r.indHurry = stat('hurry'); r.indDitch = stat('ditch');
{
  const st = ind.filter((o) => o.leg === 'stand');
  const tail = st.slice(Math.min(st.length - 1, 5)); // after the walker's last frame of motion has settled
  r.indStand = { n: tail.length, moved: tail.length ? tail[tail.length - 1].moved - tail[0].moved : NaN, held: tail.every((o) => o.held) };
  const shown = ind.filter((o) => o.phase === 'shown');
  r.indLine = { n: shown.length, dr: Math.max(...shown.map((o) => Math.abs(o.r - 78.2))), dy: Math.max(...shown.map((o) => Math.abs(o.dy))) };
}

// ---- the Repetend: start the audio, walk in to the east wall, along it, and away; a step every 0.42 s near it
await page.evaluate(async () => { const fp = window.__fp; try { fp.events.dispatchEvent(new Event('begin')); } catch (e) { /* headless */ } for (let k = 0; k < 40 && !fp.audio.ctx; k++) await new Promise((res) => setTimeout(res, 100)); await fp.audio.ctx?.resume(); });
const birdProbe = `(L) => { const fp = window.__fp, b = fp.small.repetend.state(), now = performance.now();
  if (L.steps && (!window.__lastStep || now - window.__lastStep > 420)) { window.__lastStep = now; fp.player.onStep?.(L.speed > 5); }
  const a = fp.audio, S = a.steps;
  return { leg: L.name, ...b, voices: a.voices?.length || 0, seq: S ? S.seq : 0 }; }`;
const birdHome = await page.evaluate(() => { const r = window.__fp.small.repetend, w = r.walls.find((x) => x.i === r.home.w); return { x: w.ax + w.dx * r.home.i * 0.1, z: w.az + w.dz * r.home.i * 0.1 }; });
const bird = await walk([
  { name: 'far', stand: 2, from: [-135, -100], to: [-135, -100] },
  { name: 'in', from: [-135, -100], to: [-166.5, -96.5], speed: 3.6, steps: true },
  { name: 'along', from: [-166.5, -96.5], to: [-177, -81], speed: 3.6, steps: true },
  { name: 'hurry', from: [-177, -81], to: [-163, -104], speed: 6.6, steps: true },
  { name: 'stop', stand: 3, from: [-163, -104], to: [-163, -104] },
  { name: 'away', from: [-163, -104], to: [-130, -100], speed: 6.6 },
  { name: 'gone', stand: 14, from: [-130, -100], to: [-130, -100] },
], birdProbe);
{
  const onTop = bird.filter((o) => o.state !== 'fly' && o.top === o.top);
  r.birdTop = { n: onTop.length, err: Math.max(0, ...onTop.map((o) => o.y - o.top < 0 ? o.top - o.y : Math.max(0, o.y - o.top - 0.06))), out: bird.filter((o) => !o.inPoly && o.polyD > 1).length };
  const wrong = bird.filter((o) => o.following !== (o.wallD < 18));
  const near = bird.filter((o) => ['in', 'along', 'hurry', 'stop'].includes(o.leg) && o.wallD < 18);
  const last = bird[bird.length - 1];
  r.birdFollow = { wrong: wrong.length, nearN: near.length, inBand: near.filter((o) => o.walkerD <= 6.5).length, flits: last.flits, hops: last.hops, home: Math.hypot(last.x - birdHome.x, last.z - birdHome.z), farFollowing: bird.filter((o) => o.leg === 'gone' && o.following).length };
  r.birdEcho = { echoes: last.echoes, steps: last.seq, maxVoices: Math.max(...bird.map((o) => o.voices)) };
  r.birdMove = { echoes: last.echoes, flicks: last.flicks, echoHops: last.echoHops, idleHops: last.idleHops };
}
// v7.1: its perch lies within 6 m of P3 or P4 (it is found from the lead)
r.perch = await page.evaluate(async () => {
  const R = await import('/src/v4/paths/routes.js'), rp = window.__fp.small.repetend, w = rp.walls.find((x) => x.i === rp.home.w);
  const x = w.ax + w.dx * rp.home.i * 0.1, z = w.az + w.dz * rp.home.i * 0.1;
  let d = Infinity;
  for (const L of R.leads().list) if (L.id === 'P3' || L.id === 'P4') for (const S of L.lines) for (const q of S) d = Math.min(d, Math.hypot(q.x - x, q.z - z));
  return { x, z, d, tall: w.top[rp.home.i] - window.__fp.terrain.heightAt(x, z) };
});
// the echo's timing: a step recorded now is replayed by the bird exactly 1.0 s after it (audio.echoStep's scheduled time)
r.echoTiming = await page.evaluate(async () => {
  const fp = window.__fp, a = fp.audio, p = fp.player, b = fp.small.repetend.at();
  p.pos.set(b.x + 3, fp.terrain.heightAt(b.x + 3, b.z) + p.eye, b.z + 1);
  await new Promise((res) => setTimeout(res, 600));
  const orig = a.echoStep, got = [];
  a.echoStep = (rec, pos, d) => { const o = orig(rec, pos, d); if (o) got.push({ dt: o.at - rec.t, x: pos.x, z: pos.z, bx: b.x, bz: b.z }); return o; };
  for (let k = 0; k < 3; k++) { p.onStep(false); await new Promise((res) => setTimeout(res, 500)); }
  await new Promise((res) => setTimeout(res, 1500));
  a.echoStep = orig;
  return got;
});

// ---- the Simulacrum: stand 4 m from a column, looking at it
await page.evaluate(() => { const fp = window.__fp, p = fp.player; fp.small.simulacrum.face(null); p.pos.set(12.7, fp.terrain.heightAt(12.7, -202.5) + p.eye, -202.5); p.yaw = -1.53; p.pitch = 0; });
r.face = await page.evaluate(async () => {
  const fp = window.__fp, s = fp.small.simulacrum, w = (ms) => new Promise((res) => setTimeout(res, ms)), fl = fp.sky.flicker;
  const log = [];
  const sample = (tag) => { const q = s.state(); log.push({ tag, phase: q.phase, u: q.u, f: fl.value, lowT: q.lowT }); };
  await w(800);
  fl.hold = 0.6; for (let k = 0; k < 6; k++) { await w(250); sample('dim0.6'); }      // dim but not under 0.5: nothing
  fl.hold = 0.3; for (let k = 0; k < 6; k++) { await w(250); sample('gutter'); }      // the first second under 0.5: nothing yet; then forming
  for (let k = 0; k < 10; k++) { await w(300); sample('hold'); }
  fl.hold = 0.7; for (let k = 0; k < 4; k++) { await w(250); sample('rise0.7'); }    // rising but not past 0.85: it holds
  fl.hold = 1; for (let k = 0; k < 8; k++) { await w(300); sample('back'); }
  return log;
});
{
  const L = r.face;
  const early = L.filter((o) => o.tag === 'dim0.6' || (o.tag === 'gutter' && o.lowT < 0.95)).filter((o) => o.u > 0).length;
  const formed = Math.max(...L.filter((o) => o.tag === 'hold').map((o) => o.u));
  const rise = L.filter((o) => o.tag === 'rise0.7').every((o) => o.phase !== 'unravel');
  const end = L[L.length - 1];
  r.faceRule = { early, formed, held: L.some((o) => o.phase === 'held'), rise, end: end.phase, endU: end.u };
}
r.stats = await page.evaluate(() => window.__fp.small.stats());
r.per = await page.evaluate(() => ({ per: window.__fp.small.simulacrum.per, N: window.__fp.small.simulacrum.N, q: window.__fp.quality }));
// the module's CPU, at the ditch while it keeps its distance, and while the bird follows
await page.evaluate(() => { const fp = window.__fp, p = fp.player, b = 26 * Math.PI / 180; p.pos.set(40 + Math.sin(b) * 76.6, 0, 30 - Math.cos(b) * 76.6); p.pos.y = fp.terrain.heightAt(p.pos.x, p.pos.z) + p.eye; });
await page.waitForTimeout(3000);
r.cpu = await page.evaluate(() => window.__fp.perf.report().cpu.modules['living-small'] ?? null);
await browser.close();

// ---- low: the gnat count (a second load of the module alone)
const b2 = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p2 = await b2.newPage({ viewport: { width: 640, height: 360 } });
p2.setDefaultTimeout(600000);
p2.on('pageerror', (e) => errors.push(e.message));
await p2.goto(`${base}/?q=low&only=living-small&pos=15,-200`, { waitUntil: 'load', timeout: 120000 });
await p2.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
r.low = await p2.evaluate(() => ({ per: window.__fp.small.simulacrum.per, N: window.__fp.small.simulacrum.N, q: window.__fp.quality, stats: window.__fp.small.stats() }));
await b2.close();

// ---- verdicts
const checks = [
  ['Indistinct: 7.0 +- 0.3 m at walking pace', r.indWalk.n > 30 && r.indWalk.err <= 0.3, `${r.indWalk.n} frames within 7 m of the line, max error ${r.indWalk.err.toFixed(3)} m`],
  ['Indistinct: 7.0 +- 0.3 m hurrying', r.indHurry.n > 15 && r.indHurry.err <= 0.3, `${r.indHurry.n} frames, max error ${r.indHurry.err.toFixed(3)} m`],
  ['Indistinct: 7.0 +- 0.3 m walking in the ditch', r.indDitch.n > 30 && r.indDitch.err <= 0.3, `${r.indDitch.n} frames, max error ${r.indDitch.err.toFixed(3)} m`],
  ['Indistinct: never under 6.7 m', Math.min(r.indWalk.min, r.indHurry.min, r.indDitch.min) >= 6.7, `nearest ${Math.min(r.indWalk.min, r.indHurry.min, r.indDitch.min).toFixed(3)} m`],
  ['Indistinct: holds while the walker stands', r.indStand.n > 5 && r.indStand.moved === 0 && r.indStand.held, `${r.indStand.n} frames standing, moved ${r.indStand.moved} m, held ${r.indStand.held}`],
  ['Indistinct: on the ditch line within 0.3 m', r.indLine.dr <= 0.3 && r.indLine.dy <= 0.3, `${r.indLine.n} frames, |r - 78.2| <= ${r.indLine.dr.toFixed(3)} m, |y - floor| <= ${r.indLine.dy.toFixed(3)} m`],
  ['Repetend: on wall-tops (0.1 m) inside the Lynchets', r.birdTop.n > 50 && r.birdTop.err <= 0.1 && r.birdTop.out === 0, `${r.birdTop.n} frames on a top, worst ${r.birdTop.err.toFixed(3)} m off it, ${r.birdTop.out} outside`],
  ['Repetend: follows only within 18 m, home beyond', r.birdFollow.wrong === 0 && r.birdFollow.farFollowing === 0 && r.birdFollow.home < 1 && r.birdFollow.hops + r.birdFollow.flits > 3, `${r.birdFollow.wrong} frames following wrongly; ${r.birdFollow.hops} hops, ${r.birdFollow.flits} flits; ${r.birdFollow.inBand}/${r.birdFollow.nearN} near frames within 6.5 m; ends ${r.birdFollow.home.toFixed(2)} m from home`],
  ['Repetend: echoes each step 1.0 s late, at the bird', r.echoTiming.length >= 2 && r.echoTiming.every((e) => Math.abs(e.dt - 1) <= 0.05 && Math.hypot(e.x - e.bx, e.z - e.bz) < 0.5) && r.birdEcho.echoes > 3, `${r.echoTiming.length} timed: dt ${r.echoTiming.map((e) => e.dt.toFixed(3)).join(', ')} s; ${r.birdEcho.echoes} echoes over the walk (${r.birdEcho.steps} steps), most voices ${r.birdEcho.maxVoices}`],
  ['Repetend (v7.1): perched by the lead; it flicks and hops at each echo and on its own', r.perch.d <= 6.5 && r.birdMove.flicks >= r.birdMove.echoes - 2 && r.birdMove.flicks > 3 && r.birdMove.echoHops > 0 && r.birdMove.idleHops > 0, `perch (${r.perch.x.toFixed(1)}, ${r.perch.z.toFixed(1)}) ${r.perch.d.toFixed(1)} m from P3/P4, its top ${r.perch.tall.toFixed(2)} m over the ground; ${r.birdMove.flicks} flicks for ${r.birdMove.echoes} echoes, ${r.birdMove.echoHops} hops at an echo, ${r.birdMove.idleHops} on its own`],
  ['Simulacrum: the face forms after 1 s under 0.5, unravels past 0.85', r.faceRule.early === 0 && r.faceRule.formed >= 0.99 && r.faceRule.held && r.faceRule.rise && r.faceRule.end === 'columns' && r.faceRule.endU === 0, JSON.stringify(r.faceRule)],
  ['Simulacrum: 240 gnats a column at high, 120 at low', r.per.per === 240 && r.per.N === 960 && r.low.per === 120 && r.low.N === 480, `high ${r.per.N} (${r.per.per} a column), low ${r.low.N} (${r.low.per})`],
  ['Cost: within 5 draws, 5k triangles, no lights', r.stats.calls <= 5 && r.stats.tris <= 5000 && r.stats.lights === 0, JSON.stringify(r.stats)],
  ['Cost: CPU under 0.05 ms at the ditch', r.cpu != null && r.cpu < 0.05, `living-small ${r.cpu == null ? 'n/a' : r.cpu.toFixed(4)} ms`],
];
let bad = 0;
for (const [name, ok, info] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', name.padEnd(62), info); }
console.log(`${checks.length - bad} / ${checks.length} checks pass`);
if (errors.length) { console.log('page errors:', errors.join('\n')); bad++; }
process.exit(bad ? 1 : 0);
