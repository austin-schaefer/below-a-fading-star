#!/usr/bin/env node
// v7 canyon check (src/v7/canyon.js, src/v7/reach.js): DP the Luminous Reach, CE the Bather, CX the Toadstone.
// The Reach's glow profile is zero above its first source and falls monotonically below its last; its gain at the gutter's
// floor is at least 3x daylight; its fen plume reaches 50-70 m and the tarn shows none (mask frames from above); with
// ?reach=0 the river and the fen draw exactly as with the chunks at zero strength (a frame of the water alone, pixel
// for pixel) and their shaders carry no chunk. The Bather (v7.1) is shown from the rim and from the canyon's floor, the
// stones only within 4 m of her and her again from 6 m; in view the swap is the 1.2 s cross-fade, begun at once, never a
// pop; the 'bather-pour' cue from the rim; the toad's glow is 0 at flicker 1 and over 0.5 at the floor, its sprite drawn only while the sun
// gutters; it sits within 2 m of its site on ground under 20 degrees; stats() within budget, no lights; and, as
// information, the GPU per frame at the rim with and without the canyon (?perf=1, where the browser has a timer).
// Usage: node tools/canyon-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = 640, H = 360;
let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
const errors = [];

async function open(q) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.setDefaultTimeout(600000);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(`${base}/?q=high&perf=1&grain=0${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
  await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); const f = window.__fp.sky.flicker; f.next = 1e9; f.phase = 0; f.hold = 1; });
  return page;
}
// place the walker, face (tx, tz) or away from it
const place = (page, x, z, tx, tz, away = false) => page.evaluate(([x, z, tx, tz, away]) => {
  const fp = window.__fp, p = fp.player;
  p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z); if (p.vel) p.vel.set(0, 0, 0);
  const yaw = Math.atan2(-(tx - x), -(tz - z)); p.yaw = away ? yaw + Math.PI : yaw; p.pitch = away ? 0.2 : -0.4;
}, [x, z, tx, tz, away]);
// a frame of the terrain and the water alone, the water's clock pinned: data URL
const waterFrame = (page, dry = false) => page.evaluate((dry) => {
  const fp = window.__fp, keep = new Set(dry ? ['sky'] : ['water-river', 'water-fen', 'water-tarn', 'sky']);
  const saved = [];
  fp.scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o !== fp.terrain.mesh && !keep.has(o.name) && o.visible) { saved.push(o); o.visible = false; } });
  fp.scene.traverse((o) => { const u = o.material?.uniforms; if (u?.uTime) u.uTime.value = 50; if (u?.uFlicker) u.uFlicker.value = 1; if (u?.uRipples) for (const v of u.uRipples.value) v.w = 0; }); // the discs' ripple rings start at random times
  const lit = []; fp.scene.traverse((o) => { if (o.isPointLight || o.isSpotLight) { lit.push([o, o.intensity]); o.intensity = 0; } }); // the light slots follow moving wisps
  const cam = fp.camera; cam.position.set(185, 48, 250); cam.lookAt(118, -2, 200); cam.updateMatrixWorld(); // the canyon's lower reach, the mouth and the fen's edge
  fp.renderer.shadowMap.needsUpdate = true; fp.post.composer.render();
  const url = document.getElementById('scene').toDataURL('image/png');
  for (const o of saved) o.visible = true;
  for (const [o, i] of lit) o.intensity = i;
  return url;
}, dry);
const gpuAtRim = (page) => page.evaluate(async () => {
  const fp = window.__fp, p = fp.player;
  p.pos.set(166.5, fp.terrain.heightAt(166.5, 218.5) + p.eye, 218.5); p.yaw = 2.43; p.pitch = -0.45;
  await new Promise((r) => setTimeout(r, 2500));
  const before = fp.perf.report();
  await new Promise((r) => setTimeout(r, 4000));
  const r = fp.perf.report();
  return { gpu: r.gpu, frame: r.frame?.avgMs ?? r.frame, calls: r.render?.calls, cpu: r.cpu?.modules?.['living-canyon'] ?? null, stale: before === r };
});

// ---------------------------------------------------------------- page A: everything
const A = await open('');
const a = await A.evaluate(async () => {
  const fp = window.__fp, out = {}, R = fp.reach, C = fp.canyon;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // the profile
  const P = R.profile, G = P.G;
  out.prof = { first: P.sFirst, last: P.sLast, aboveZero: true, mono: true, atLast: G[P.last], atEnd: G[G.length - 1] };
  for (let i = 0; i < P.first; i++) if (G[i] !== 0) out.prof.aboveZero = false;
  for (let i = P.last + 1; i < G.length; i++) if (G[i] > G[i - 1] + 1e-7) out.prof.mono = false;
  out.gain = { day: R.gainAt(1), floor: R.gainAt(0.2), uniform: R.uniforms.uReachGain.value, mats: R.materials.length };
  // the plume: where it falls under 1% of its strength at the mouth
  let end = null; const p0 = R.plumeAt(2); for (let u = 2; u < 120; u += 0.5) if (R.plumeAt(u) < 0.01 * p0) { end = u; break; }
  out.plume = { end, mouth: R.mouth };
  // mask frames from above: the fen's plume (red pixels) and the tarn (none)
  R.mask(true);
  const red = (x, y, z, rx, look) => {
    const cam = fp.camera; cam.position.set(x, y, z); cam.lookAt(look[0], look[1], look[2]); cam.updateMatrixWorld();
    fp.post.composer.render();
    const c = document.getElementById('scene'), g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
    const k = g.getContext('2d'); k.drawImage(c, 0, 0); const d = k.getImageData(0, 0, g.width, g.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 70 && d[i + 2] < 70) n++;
    return n;
  };
  fp.controls.state.enabled = false;
  const m = R.mouth;
  out.plume.red = red(m.x + m.tx * 25, 70, m.z + m.tz * 25 + 0.01, 0, [m.x + m.tx * 25, -2.4, m.z + m.tz * 25]);
  const tarn = fp.water.tarn;
  out.tarnRed = red(tarn.x, 90, tarn.z + 0.01, 0, [tarn.x, tarn.y, tarn.z]);
  R.mask(false);
  out.fenUFen = R.materials.map((mm) => mm.uniforms.uFen ? mm.uniforms.uFen.value : 'river');
  // the toad
  const T = C.toad, site = { x: 180, z: 230 };
  out.toad = { off: Math.hypot(T.spot.x - site.x, T.spot.z - site.z), slope: T.spot.slope * 180 / Math.PI, g1: T.glowAt(1), g0: T.glowAt(0.2), seen: T.spot.seen, bare: T.spot.bare };
  fp.sky.flicker.hold = 1; await sleep(400); out.toad.spriteDay = T.glow.visible;
  fp.sky.flicker.hold = 0.2; await sleep(400); out.toad.spriteGutter = T.glow.visible;
  fp.sky.flicker.hold = 1; await sleep(300);
  // lights in the canyon's objects
  let lights = 0; for (const o of [C.bather.mesh, C.bather.stones, T.mesh, T.glow]) o.traverse((q) => { if (q.isLight) lights++; });
  out.lights = lights;
  fp.controls.state.enabled = true;
  return out;
});
check(a.prof.aboveZero, 'Reach: the glow profile is zero above the first source', `first source s ${a.prof.first.toFixed(1)}`);
check(a.prof.mono, 'Reach: the profile falls monotonically below the last source', `last source s ${a.prof.last.toFixed(1)}, G ${a.prof.atLast.toFixed(3)} -> ${a.prof.atEnd.toFixed(3)} at s 104`);
check(a.gain.floor >= 3 * a.gain.day - 1e-9 && a.gain.uniform === 2.5, 'Reach: the gain at the gutter\'s floor is at least 3x daylight', `day ${a.gain.day}, floor (flicker 0.2) ${a.gain.floor.toFixed(2)}, chunks in ${a.gain.mats} materials`);
check(a.plume.end >= 50 && a.plume.end <= 70 && a.plume.red > 200, 'Reach: the fen plume reaches 50-70 m (and shows in the mask)', `ends at ${a.plume.end} m, ${a.plume.red} red px from above`);
check(a.tarnRed === 0 && a.fenUFen.includes(0), 'Reach: the tarn shows none', `${a.tarnRed} red px over the tarn (uFen ${JSON.stringify(a.fenUFen)})`);

// the swap (v7.1): her from every distance and height until within 4 m of her masses, the stones then, her again from 6 m
// (points along her across-line on the far bank, found by her own distance function)
const spot = (page, d) => page.evaluate((d) => {
  const B = window.__fp.canyon.bather, c = B.centre, V = B.frame.V;
  let lo = 0, hi = 20; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (B.herD(c.x - V[0] * m, c.z - V[1] * m) < d) lo = m; else hi = m; }
  return [c.x - V[0] * lo, c.z - V[1] * lo];
}, d);
const C0 = [159.3, 226.7], P3m = await spot(A, 3), P5m = await spot(A, 5.3), P8m = await spot(A, 8);
const fAt = async (x, z, away, ms = 2000) => { await place(A, x, z, C0[0], C0[1], away); await A.waitForTimeout(ms); return A.evaluate(() => { const s = window.__fp.canyon.bather.state; return { f: s.f, rise: s.rise, d: s.dist }; }); };
const sw = [await fAt(166.5, 218.5, true), await fAt(167, 223, true), await fAt(...P8m, true), await fAt(...P3m, true), await fAt(...P5m, true), await fAt(...P8m, true)];
check(sw[0].f === 1 && sw[1].f === 1 && sw[2].f === 1 && sw[3].f === 0 && sw[4].f === 0 && sw[5].f === 1, 'Bather: her from the rim and the floor, the stones within 4 m, her again from 6 m',
  sw.map((o, i) => `${['rim', 'floor', 'bank 8 m', 'bank 3 m', 'bank 4-6 m (held)', 'bank 8 m'][i]} f ${o.f} (${o.d.toFixed(1)} m, rise ${o.rise.toFixed(1)} m)`).join('; '));
// in view: from 8 m step to 3 m facing her: the cross-fade starts at once and takes 1.2 s, never a pop; at 5 m the stones
// hold; back at 8 m she fades in again
await fAt(...P8m, false, 1500);
const seq = await A.evaluate(async ([p3, p5, p8]) => {
  const fp = window.__fp, B = fp.canyon.bather, st = B.state, p = fp.player, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const C = B.centre, put = ([x, z]) => { p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z); p.yaw = Math.atan2(-(C.x - x), -(C.z - z)); p.pitch = -0.4; };
  const swaps0 = st.swaps, fades0 = st.fades, samples = [], t0 = performance.now();
  const run = async (tag, ms) => { const t1 = performance.now(); while (performance.now() - t1 < ms) { await sleep(100); samples.push([tag, +((performance.now() - t0) / 1000).toFixed(1), +st.f.toFixed(3), B.inView()]); } };
  put(p3); await run('in', 2600); put(p5); await run('hold', 2000); put(p8); await run('out', 2600);
  return { samples, swaps: st.swaps - swaps0, fades: st.fades - fades0 };
}, [P3m, P5m, P8m]);
const s = seq.samples, ins = s.filter((x) => x[0] === 'in'), outs = s.filter((x) => x[0] === 'out'), mid = s.filter(([, , f]) => f > 0 && f < 1);
const steps = s.slice(1).map((x, i) => Math.abs(x[2] - s[i][2])), big = Math.max(...steps);
const firstMid = ins.find(([, , f]) => f < 1), inDone = ins.find(([, , f]) => f === 0);
check(firstMid && firstMid[1] <= 0.5 && inDone && inDone[1] - ins[0][1] >= 0.8 && mid.length >= 6 && big <= 0.35 && s.filter((x) => x[0] === 'hold').every(([, , f]) => f === 0) && outs[outs.length - 1][2] === 1 && seq.swaps === 0 && seq.fades === 2 && s.every(([, , , v]) => v),
  'Bather: in view, the stones cross-fade in at 4 m (1.2 s, never a pop) and she fades back at 6 m', `fade begins ${firstMid?.[1]} s after the step in, stones at ${inDone?.[1]} s; ${mid.length} samples mid-fade, biggest step ${big.toFixed(2)}; held at 5 m; her again at the end ${outs[outs.length - 1][2]}; out-of-view swaps ${seq.swaps}, fades ${seq.fades}`);
// from the rim: the stroke's cue at its far turn (every 8 s)
const cues = await A.evaluate(async () => {
  const fp = window.__fp, p = fp.player, got = [], real = fp.audio.cue;
  fp.audio.cue = (n, pos, o) => { got.push(n); return real?.(n, pos, o); };
  p.pos.set(166.5, fp.terrain.heightAt(166.5, 218.5) + p.eye, 218.5); p.yaw = 2.43; p.pitch = -0.45;
  await new Promise((r) => setTimeout(r, 12000));
  fp.audio.cue = real;
  return got.filter((n) => n === 'bather-pour').length;
});
check(cues >= 1, 'Bather: \'bather-pour\' fires from the rim at the stroke\'s turn', `${cues} in 12 s`);
check(a.toad.g1 === 0 && a.toad.g0 > 0.5 && !a.toad.spriteDay && a.toad.spriteGutter, 'Toadstone: glow 0 at flicker 1, over 0.5 at the floor; its sprite only in the gutter', `glow(1) ${a.toad.g1}, glow(0.2) ${a.toad.g0.toFixed(2)}, sprite day ${a.toad.spriteDay}, gutter ${a.toad.spriteGutter}`);
check(a.toad.off <= 2 && a.toad.slope < 20, 'Toadstone: on a ledge within 2 m of its site, under 20 degrees', `${a.toad.off.toFixed(2)} m off, ${a.toad.slope.toFixed(1)} deg, seen from ${a.toad.seen} P13 points, bare ${a.toad.bare}`);
const st = await A.evaluate(async () => { const fp = window.__fp, C = fp.canyon; C.bather.hold(0.5); fp.sky.flicker.hold = 0.2; await new Promise((r) => setTimeout(r, 400)); const s = C.stats(); C.bather.hold(null); fp.sky.flicker.hold = 1; return { s }; });
check(st.s.calls <= 5 && st.s.tris <= 30000 && st.s.lights === 0 && a.lights === 0, 'stats() within budget (mid-fade, sprite on: the most there is)', JSON.stringify(st.s));
const gA = await gpuAtRim(A);
const frameA = await waterFrameReset(A), dryA = await waterFrame(A, true);
const shaderA = await A.evaluate(() => window.__fp.reach.materials.map((m) => m.fragmentShader.includes('uReachCol')));
await A.close();

// ---------------------------------------------------------------- page B: ?canyon=0&reach=0
const B = await open('&canyon=0&reach=0');
const gB = await gpuAtRim(B);
const frameB = await waterFrame(B), dryB = await waterFrame(B, true);
const shaderB = await B.evaluate(() => { const fp = window.__fp, n = []; fp.scene.traverse((o) => { if (/^water-(river|fen|tarn)$/.test(o.name)) n.push(o.material.fragmentShader.includes('uReach')); }); return { n, reach: fp.reach }; });
await B.close();
async function waterFrameReset(page) { await page.evaluate(() => window.__fp.reach.strength(0)); const u = await waterFrame(page); await page.evaluate(() => window.__fp.reach.strength(1)); return u; }

if (process.env.FP_DUMP) { const { writeFileSync } = await import('node:fs'); writeFileSync(`${process.env.FP_DUMP}/wa.png`, Buffer.from(frameA.split(',')[1], 'base64')); writeFileSync(`${process.env.FP_DUMP}/wb.png`, Buffer.from(frameB.split(',')[1], 'base64')); }
// compare the two water frames: a pixel counts against the chunks where the frames differ with the water drawn and
// not without it (the dry pair takes out what differs between two loads for other reasons)
const cmp = await browser.newPage();
const diff = await cmp.evaluate(async (urls) => {
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  const imgs = await Promise.all(urls.map(load));
  const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const k = c.getContext('2d'); k.drawImage(i, 0, 0); return k.getImageData(0, 0, c.width, c.height).data; };
  const [a, b, da, db] = imgs.map(px);
  const d = (x, y, i) => Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]));
  let max = 0, n = 0, wet = 0, dry = 0;
  for (let i = 0; i < a.length; i += 4) { const w = d(a, b, i), q = d(da, db, i); if (w) wet++; if (q) dry++; if (w && !q) { n++; if (w > max) max = w; } }
  return { max, n, wet, dry, w: imgs[0].width, h: imgs[0].height };
}, [frameA, frameB, dryA, dryB]);
// ?reach=0 is the hosts' own shaders, so it is the old picture by construction; against the chunks at zero strength a
// frame differs only by the compiler's rounding in a differently compiled program (a few levels at far, grazing water)
check(diff.n <= diff.w * diff.h * 0.002 && diff.max <= 4 && shaderA.every(Boolean) && shaderB.n.length === 3 && shaderB.n.every((x) => !x), '?reach=0 leaves the river\'s and the fen\'s colours as before', `water frame ${diff.w}x${diff.h}: ${diff.n} water px differ (max ${diff.max}) against the chunks at zero (${diff.wet} px differ in all, ${diff.dry} of them without the water too); with ?reach=0 no chunk in ${shaderB.n.length} water shaders`);
const gpuMs = (g) => (g.gpu && g.gpu.available && g.gpu.frames ? JSON.stringify(Object.fromEntries(Object.entries(g.gpu).filter(([k]) => !['available', 'frames'].includes(k)))) : 'n/a');
console.log(`INFO  GPU at the rim, after: ${gpuMs(gA)} (frame ${JSON.stringify(gA.frame)} ms, ${gA.calls} calls, living-canyon CPU ${gA.cpu} ms)`);
console.log(`INFO  GPU at the rim, before (?canyon=0&reach=0): ${gpuMs(gB)} (frame ${JSON.stringify(gB.frame)} ms, ${gB.calls} calls)`);
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
await browser.close();
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
