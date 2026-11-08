#!/usr/bin/env node
// Pan test: stands at a station, holds still for a baseline, then turns the view (the yaw set from the clock
// each frame, as a steady mouse would) and records every frame: its interval, its CPU time in main.js's
// frame(), each module's CPU, whether the shadow map was drawn and that draw's CPU, and the programs,
// geometries and textures renderer.info gained. Prints the worst frames of the turn with what ran in them,
// and asserts, per station, that no turning frame's CPU is over MAX× the median of the still frames' CPU
// (headless timings are not a laptop's; the ratio is what holds), that no shader program is compiled and no
// geometry or texture uploaded while turning (main.js compiles every program and warmup.js uploads every
// buffer and texture behind the title card; a first-draw compile or upload held a frame for tens of ms), and,
// with the adaptive pixel ratio on (no adapt=0 in the url), that the ratio does not step while turning
// (tier.js holds a step for a steady frame: a reallocation mid-turn is the worst-placed hitch).
// Two stations, in one browser, one after the other:
//   A  (-190, 165) facing north, two 360° turns over 6 s each;
//   B  (-195, 128) in the Deodand Wood facing north, turning at 1.2 rad/s to yaw 3.9: the Great Span and
//      its kit enter the view at yaw 3.5-3.9 (the v7 survey's worst frames), reported apart.
// Usage: node tools/pan-test.mjs "<url>" [max ratio, default 3] [json out]
// With pos= in the url it runs that one spot as station A; without, both stations at the url's other params
// (default ?q=medium&perf=1&adapt=0).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const arg = process.argv[2] || 'http://localhost:8123/?q=medium&perf=1&adapt=0';
const MAX = +(process.argv[3] || 3);
const at = (pos, yaw) => { const u = new URL(arg); u.searchParams.set('pos', pos); u.searchParams.set('yaw', yaw); return u.href; };
const STATIONS = new URL(arg).searchParams.has('pos')
  ? [{ name: 'A', url: arg, turns: [{ by: 2 * Math.PI, ms: 6000 }, { by: 2 * Math.PI, ms: 6000 }] }]
  : [
    { name: 'A', url: at('-190,165', 0), turns: [{ by: 2 * Math.PI, ms: 6000 }, { by: 2 * Math.PI, ms: 6000 }] },
    { name: 'B', url: at('-195,128', 0), turns: [{ by: 3.9, ms: 3250 }], window: [3.5, 3.9] },
  ];
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };
const dump = [];
let allOk = true;
for (const st of STATIONS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (/programs compiled|warm-up/.test(m.text())) console.log(m.text()); });
  await page.goto(st.url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  const out = await page.evaluate(async (turns) => {
    const fp = window.__fp, mods = fp.perf._mods, sm = fp.renderer.shadowMap;
    document.getElementById('card')?.classList.add('hidden'); // full rate, as when walking
    const rec = [];
    let cur = null, prev = new Map(), mode = 'settle', yaw0 = fp.player.yaw, t0 = 0, turn = null;
    const smRender = sm.render;
    sm.render = function (...a) { const on = sm.needsUpdate || sm.autoUpdate; const s = performance.now(); const r = smRender.apply(this, a); if (cur && on) { cur.shadowMs += performance.now() - s; cur.shadow = true; } return r; };
    const comp = fp.post.composer, compRender = comp.render;
    comp.render = function (...a) { const s = performance.now(); const r = compRender.apply(this, a); if (cur) cur.renderMs = performance.now() - s; return r; };
    const info = fp.renderer.info;
    const ctlUpdate = fp.controls.update;
    fp.controls.update = function (dt) {
      if (turn) fp.player.yaw = yaw0 + turn.by * Math.min(1, (performance.now() - t0) / turn.ms);
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
        cur.yaw = fp.player.yaw;
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
    const snap = () => ({ geo: info.memory.geometries, tex: info.memory.textures, prog: info.programs.length });
    const gpu = {}, mem = {};
    await wait(3000); mode = 'still'; await wait(4000); gpu.still = fp.perf.report().gpu;
    mem.before = snap();
    const panAt = [];
    for (let i = 0; i < turns.length; i++) {
      mode = i ? 'pan' + (i + 1) : 'pan'; turn = turns[i]; t0 = performance.now(); yaw0 = fp.player.yaw;
      await wait(turn.ms + 200); gpu[mode] = fp.perf.report().gpu;
      panAt.push([t0, t0 + turn.ms]);
    }
    const tier = fp.tier.stats();
    const stepsInTurn = tier.steps.filter((s) => panAt.some(([a, b]) => s.at >= a && s.at <= b));
    turn = null; mode = 'done';
    mem.after = snap();
    return { rec, gpu, mem, timer: fp.perf.gpuTimer, warmup: fp.warmup || null, tier: { adapt: tier.adapt, dpr: tier.dpr, base: tier.base, steps: tier.steps, stalls: tier.stalls }, stepsInTurn };
  }, st.turns);
  await page.close();
  const { rec: res, gpu, mem, timer, warmup, tier, stepsInTurn } = out;
  const still = res.filter((f) => f.mode === 'still'), turning = res.filter((f) => f.mode.startsWith('pan')), pan = res.filter((f) => f.mode === 'pan'), pan2 = res.filter((f) => f.mode === 'pan2');
  const m = { stillCpu: med(still.map((f) => f.cpu)), panCpu: med(pan.map((f) => f.cpu)), stillIv: med(still.map((f) => f.interval)), panIv: med(pan.map((f) => f.interval)) };
  const shadowFrac = (a) => (a.filter((f) => f.shadow).length / Math.max(1, a.length)).toFixed(2);
  console.log(`\nstation ${st.name}: ${st.url}`);
  console.log(`warm-up: ${warmup ? JSON.stringify(warmup) : 'off'}; gpu timer: ${timer}; gpu ms (last 2 s) ${JSON.stringify(gpu)}`);
  console.log(`still: ${still.length} frames, median cpu ${m.stillCpu.toFixed(1)} ms, interval ${m.stillIv.toFixed(1)} ms, shadow drawn in ${shadowFrac(still)}`);
  console.log(`pan:   ${pan.length} frames, median cpu ${m.panCpu.toFixed(1)} ms, interval ${m.panIv.toFixed(1)} ms, shadow drawn in ${shadowFrac(pan)}`);
  if (pan2.length) console.log(`pan 2: ${pan2.length} frames, median cpu ${med(pan2.map((f) => f.cpu)).toFixed(1)} ms, worst ${Math.max(0, ...pan2.map((f) => f.cpu)).toFixed(1)} ms, shadow drawn in ${shadowFrac(pan2)}`);
  const worst = [...turning].sort((a, b) => b.cpu - a.cpu).slice(0, 10);
  console.log('worst 10 turning frames (cpu ms, ×still median, yaw, interval, shadow ms, modules):');
  for (const f of worst) console.log(`  ${f.cpu.toFixed(1).padStart(6)}  ×${(f.cpu / m.stillCpu).toFixed(2)}  yaw ${f.yaw.toFixed(2)}  iv ${f.interval.toFixed(1).padStart(6)}  render ${f.renderMs.toFixed(1)}  ${f.shadow ? 'shadow ' + f.shadowMs.toFixed(1) : 'no shadow'}  +prog ${f.progs} +geo ${f.geos} +tex ${f.texs}  tris ${f.tris}  ${JSON.stringify(f.mods)}`);
  if (st.window) {
    const w = turning.filter((f) => f.yaw >= st.window[0] && f.yaw <= st.window[1]);
    const wr = w.length ? Math.max(...w.map((f) => f.cpu)) / m.stillCpu : 0;
    console.log(`yaw ${st.window[0]}-${st.window[1]}: ${w.length} frames, worst ×${wr.toFixed(2)} the still median, +geo ${w.reduce((s, f) => s + f.geos, 0)} +tex ${w.reduce((s, f) => s + f.texs, 0)} +prog ${w.reduce((s, f) => s + f.progs, 0)}`);
  }
  const compiled = turning.filter((f) => f.newProgs?.length).flatMap((f) => f.newProgs);
  const up = { geo: mem.after.geo - mem.before.geo, tex: mem.after.tex - mem.before.tex, prog: mem.after.prog - mem.before.prog };
  console.log(`while turning: ${up.prog} programs compiled (${[...new Set(compiled)].join(', ')}), ${up.geo} geometries and ${up.tex} textures uploaded (renderer.info ${JSON.stringify(mem.before)} → ${JSON.stringify(mem.after)})`);
  const worstRatio = worst.length ? worst[0].cpu / m.stillCpu : 0;
  console.log(`worst turning frame ×${worstRatio.toFixed(2)} the still median (max ×${MAX}); pan median ×${(m.panCpu / m.stillCpu).toFixed(2)}`);
  console.log(`pixel ratio: adaptive ${tier.adapt}, ${tier.base} -> ${tier.dpr}, steps ${JSON.stringify(tier.steps)}, stalls left out ${tier.stalls}; steps while turning: ${stepsInTurn.length}`);
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
  const over2 = pan.filter((f) => f.cpu > 2 * m.panCpu).length;
  console.log(`pan frames over 2× the pan median: ${over2} of ${pan.length}`);
  const ok = turning.length > 30 && worstRatio <= MAX && !up.prog && !up.geo && !up.tex && !compiled.length && !errors.length && !stepsInTurn.length;
  console.log(`station ${st.name}: ${ok ? 'PASS' : 'FAIL'}`);
  allOk &&= ok;
  dump.push({ station: st.name, url: st.url, m, mem, warmup, res });
}
await browser.close();
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(dump, null, 1));
console.log(allOk ? 'PASS' : 'FAIL');
process.exit(allOk ? 0 : 1);
