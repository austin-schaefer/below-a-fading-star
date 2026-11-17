#!/usr/bin/env node
// What each view costs (v16-P1): one load a run, then at each view the walker stands, the profiler's 2 s window is
// read (JS ms a frame and per module, draw calls, triangles, GPU ms where the browser has the timer), and the
// walker's own update is timed walking forward for 300 ticks at 60 Hz (synchronous, in the page: the number that
// holds headless). Runs repeat in fresh browsers and every number is reported as the median over the runs.
//   node tools/perf-views.mjs <base> [q=low] [runs=3] [views.json=tools/views-perf-v16.json] [--json=out.json]
// The views: { name, x, z, yaw, pitch, y? (the feet: placeAt on the floor there), floor? (page code giving the
// feet's y) }. The sun's guttering is held, the pixel ratio held (adapt=0), the frame not idled (idle=0).
import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './launch.mjs';
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const jsonOut = process.argv.find((a) => a.startsWith('--json='))?.slice(7);
const base = (args[0] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const q = args[1] || 'low', runs = +(args[2] || 3);
const views = JSON.parse(readFileSync(args[3] || new URL('./views-perf-v16.json', import.meta.url), 'utf8'));
const all = [];
for (let run = 0; run < runs; run++) {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const v0 = views[0];
  await page.goto(`${base}/?q=${q}&perf=1&adapt=0&idle=0&pos=${v0.x},${v0.z}&yaw=${v0.yaw}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  const build = await page.evaluate(() => {
    const fp = window.__fp;
    fp.events.dispatchEvent(new CustomEvent('begin'));
    document.getElementById('card')?.classList.add('hidden');
    fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
    const m = performance.getEntriesByName('fp:ready')[0];
    return { readyMs: m ? Math.round(m.startTime) : null, colliders: fp.controls.state.colliders.length };
  });
  const res = { run, build, views: {} };
  for (const v of views) {
    await page.evaluate((v) => {
      const fp = window.__fp, p = fp.player;
      const y = v.floor ? (0, eval)(v.floor) : v.y;
      fp.controls.placeAt(v.x, v.z, y);
      p.yaw = v.yaw; p.pitch = v.pitch || 0; p.keys.clear();
    }, v);
    await page.waitForTimeout(4200); // the profiler's window is the last 2 s: all of it at the view
    const r = await page.evaluate((v) => {
      const fp = window.__fp, p = fp.player, rep = fp.perf.report();
      const w = rep;
      // the walker's own update: 300 ticks walking forward from the stand, turning slowly, then back to the stand
      const x0 = p.pos.x, z0 = p.pos.z, y0 = p.pos.y - p.eye, yaw0 = p.yaw;
      p.keys.add('KeyW');
      const t0 = performance.now();
      for (let i = 0; i < 300; i++) { p.yaw += 0.004; fp.controls.update(1 / 60); }
      const walkMs = (performance.now() - t0) / 300;
      p.keys.clear(); fp.controls.placeAt(x0, z0, y0); p.yaw = yaw0; p.pitch = v.pitch || 0;
      return { w, walkMs, feet: +(y0).toFixed(2) };
    }, v);
    const w = r.w;
    res.views[v.name] = {
      js: w.cpu?.totalMs ?? null, frame: w.frame?.avgMs ?? null, calls: w.calls ? w.calls[1] : null, tris: w.tris ? w.tris[1] : null,
      gpu: w.gpu?.frames ? +((w.gpu.render || 0) + (w.gpu.post || 0)).toFixed(2) : null, mods: w.cpu?.modules || {}, walk: +r.walkMs.toFixed(3), feet: r.feet,
    };
  }
  res.errors = errors;
  all.push(res);
  await browser.close();
  console.log(`run ${run + 1}/${runs}: ready ${build.readyMs} ms, ${build.colliders} colliders${errors.length ? `, ${errors.length} page errors: ${errors[0]}` : ''}`);
}
const med = (a) => { const s = a.filter((x) => x !== null && x !== undefined).sort((x, y) => x - y); return s.length ? s[(s.length - 1) >> 1] + (s.length % 2 ? 0 : (s[s.length >> 1] - s[(s.length - 1) >> 1]) / 2) : null; };
const f = (x, d = 2) => (x === null ? 'n/a' : x.toFixed(d));
console.log(`\nq=${q}, ${runs} runs, medians. ready ${f(med(all.map((r) => r.build.readyMs)), 0)} ms; colliders ${all[0].build.colliders}`);
console.log('view'.padEnd(14) + 'calls'.padStart(7) + 'tris k'.padStart(8) + 'JS ms'.padStart(8) + 'frame'.padStart(8) + 'GPU'.padStart(7) + 'walk ms'.padStart(9) + '  top modules (ms)');
const out = { q, runs, readyMs: med(all.map((r) => r.build.readyMs)), colliders: all[0].build.colliders, views: {} };
for (const v of views) {
  const rs = all.map((r) => r.views[v.name]);
  const mods = {};
  for (const r of rs) for (const k in r.mods) (mods[k] ||= []).push(r.mods[k]);
  const mm = Object.fromEntries(Object.entries(mods).map(([k, a]) => [k, med(a)]).sort((a, b) => b[1] - a[1]));
  const o = { gpu: med(rs.map((r) => r.gpu)), calls: med(rs.map((r) => r.calls)), tris: med(rs.map((r) => r.tris)), js: med(rs.map((r) => r.js)), frame: med(rs.map((r) => r.frame)), walk: med(rs.map((r) => r.walk)), mods: mm };
  out.views[v.name] = o;
  console.log(v.name.padEnd(14) + String(o.calls).padStart(7) + f(o.tris / 1000, 0).padStart(8) + f(o.js).padStart(8) + f(o.frame, 1).padStart(8) + f(o.gpu).padStart(7) + f(o.walk, 3).padStart(9) + '  ' + Object.entries(mm).slice(0, 5).map(([k, x]) => `${k} ${f(x)}`).join(', '));
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ summary: out, runs: all }, null, 1));
