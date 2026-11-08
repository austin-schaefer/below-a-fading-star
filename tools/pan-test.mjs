#!/usr/bin/env node
// Pan test: stands at one spot, holds still for a baseline, then turns the view 360° over 6 s twice (the yaw set
// from the clock each frame, as a steady mouse would) and records every frame: its interval, its CPU time
// in main.js's frame(), each module's CPU, whether the shadow map was drawn and that draw's CPU. Prints the
// worst frames of the pan with what ran in them, and asserts that no pan frame's CPU is over MAX× the
// median of the still frames' CPU (headless timings are not a laptop's; the ratio is what holds) and that
// no shader program is compiled while turning (main.js compiles them all behind the title card; a program
// compiled at first draw held a frame for 10-25 ms headless, longer on a laptop's Metal).
// Usage: node tools/pan-test.mjs "<url with pos= and yaw=>" [max ratio, default 3] [json out]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=medium&perf=1&adapt=0&pos=-190,165&yaw=0';
const MAX = +(process.argv[3] || 3);
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (/programs compiled/.test(m.text())) console.log(m.text()); });
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const out = await page.evaluate(async () => {
  const fp = window.__fp, mods = fp.perf._mods, sm = fp.renderer.shadowMap;
  document.getElementById('card')?.classList.add('hidden'); // full rate, as when walking
  const rec = [];
  let cur = null, prev = new Map(), mode = 'settle', yaw0 = fp.player.yaw, t0 = 0;
  const smRender = sm.render;
  sm.render = function (...a) { const on = sm.needsUpdate || sm.autoUpdate; const s = performance.now(); const r = smRender.apply(this, a); if (cur && on) { cur.shadowMs += performance.now() - s; cur.shadow = true; } return r; };
  const comp = fp.post.composer, compRender = comp.render;
  comp.render = function (...a) { const s = performance.now(); const r = compRender.apply(this, a); if (cur) cur.renderMs = performance.now() - s; return r; };
  const info = fp.renderer.info;
  const ctlUpdate = fp.controls.update;
  fp.controls.update = function (dt) {
    if (mode === 'pan') fp.player.yaw = yaw0 + 2 * Math.PI * Math.min(1, (performance.now() - t0) / 6000);
    return ctlUpdate.call(this, dt);
  };
  const begin = fp.perf.frameBegin, end = fp.perf.frameEnd;
  let lastBegin = 0;
  fp.perf.frameBegin = function () {
    const now = performance.now();
    cur = { mode, at: now, interval: lastBegin ? now - lastBegin : 0, cpu: 0, shadow: false, shadowMs: 0, renderMs: 0, mods: {}, progs: info.programs.length, geos: info.memory.geometries, texs: info.memory.textures };
    lastBegin = now;
    return begin.call(this);
  };
  fp.perf.frameEnd = function () {
    const r = end.call(this);
    if (cur) {
      cur.cpu = performance.now() - cur.at;
      for (const m of mods.values()) {
        const p = prev.get(m.name) || 0;
        const d = m.cpu >= p ? m.cpu - p : m.cpu; // the block closed (reset) inside frameEnd
        if (d > 0.05) cur.mods[m.name] = +d.toFixed(2);
        prev.set(m.name, m.cpu);
      }
      cur.newProgs = info.programs.slice(cur.progs).map((q) => q.name || q.cacheKey?.slice(0, 40)); cur.progs = info.programs.length - cur.progs; cur.geos = info.memory.geometries - cur.geos; cur.texs = info.memory.textures - cur.texs;
      cur.tris = fp.renderer.info.render.triangles; cur.calls = fp.renderer.info.render.calls;
      if (mode !== 'settle') rec.push(cur);
      cur = null;
    }
    return r;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gpu = {};
  await wait(3000); mode = 'still'; await wait(4000); gpu.still = fp.perf.report().gpu;
  mode = 'pan'; t0 = performance.now(); yaw0 = fp.player.yaw; await wait(6200); gpu.pan = fp.perf.report().gpu;
  mode = 'pan2'; t0 = performance.now(); yaw0 = fp.player.yaw; await wait(6200); gpu.pan2 = fp.perf.report().gpu;
  mode = 'done';
  return { rec, gpu, timer: fp.perf.gpuTimer };
});
await browser.close();
const { rec: res, gpu, timer } = out;
console.log(`gpu timer: ${timer}; gpu ms (last 2 s) still ${JSON.stringify(gpu.still)} pan ${JSON.stringify(gpu.pan)} pan2 ${JSON.stringify(gpu.pan2)}`);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
const still = res.filter((f) => f.mode === 'still'), pan = res.filter((f) => f.mode === 'pan'), pan2 = res.filter((f) => f.mode === 'pan2');
const m = { stillCpu: med(still.map((f) => f.cpu)), panCpu: med(pan.map((f) => f.cpu)), stillIv: med(still.map((f) => f.interval)), panIv: med(pan.map((f) => f.interval)) };
const shadowFrac = (a) => (a.filter((f) => f.shadow).length / Math.max(1, a.length)).toFixed(2);
console.log(`${url}`);
console.log(`still: ${still.length} frames, median cpu ${m.stillCpu.toFixed(1)} ms, interval ${m.stillIv.toFixed(1)} ms, shadow drawn in ${shadowFrac(still)}`);
console.log(`pan:   ${pan.length} frames, median cpu ${m.panCpu.toFixed(1)} ms, interval ${m.panIv.toFixed(1)} ms, shadow drawn in ${shadowFrac(pan)}`);
console.log(`pan 2: ${pan2.length} frames, median cpu ${med(pan2.map((f) => f.cpu)).toFixed(1)} ms, worst ${Math.max(0, ...pan2.map((f) => f.cpu)).toFixed(1)} ms, shadow drawn in ${shadowFrac(pan2)}`);
const worst = [...pan].sort((a, b) => b.cpu - a.cpu).slice(0, 10);
console.log('worst 10 pan frames (cpu ms, ×still median, interval, shadow ms, modules):');
for (const f of worst) console.log(`  ${f.cpu.toFixed(1).padStart(6)}  ×${(f.cpu / m.stillCpu).toFixed(2)}  iv ${f.interval.toFixed(1).padStart(6)}  render ${f.renderMs.toFixed(1)}  ${f.shadow ? 'shadow ' + f.shadowMs.toFixed(1) : 'no shadow'}  +prog ${f.progs} +geo ${f.geos} +tex ${f.texs}  tris ${f.tris}  ${JSON.stringify(f.mods)}`);
const compiled = res.filter((f) => f.mode !== 'still' && f.newProgs?.length).flatMap((f) => f.newProgs);
console.log(`programs compiled while turning: ${compiled.length} (${[...new Set(compiled)].join(', ')})`);
const worstRatio = worst.length ? worst[0].cpu / m.stillCpu : 0;
console.log(`worst pan frame ×${worstRatio.toFixed(2)} the still median (max ×${MAX}); pan median ×${(m.panCpu / m.stillCpu).toFixed(2)}`);
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify({ url, m, res }, null, 1));
if (errors.length) console.log('page errors:', errors.slice(0, 5));
const over2 = pan.filter((f) => f.cpu > 2 * m.panCpu).length;
console.log(`pan frames over 2× the pan median: ${over2} of ${pan.length}`);
const ok = pan.length > 30 && worstRatio <= MAX && !compiled.length && !errors.length;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
