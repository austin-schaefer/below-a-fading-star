#!/usr/bin/env node
// Profiler and bench check: loads the scene with the profiler on and a short bench, waits for the bench to
// finish, then checks the report against renderer.info, the toggles and the composer. Numbers are ignored
// (headless WebGL is software). Usage: node tools/perf-test.mjs [url]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low&perf=1&bench=6';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 240000 });
await page.waitForFunction(() => window.__fp?.perf?.bench?.done, null, { timeout: 600000, polling: 1000 });
const r = await page.evaluate(() => {
  const fp = window.__fp, out = {};
  const rep = fp.perf.report(), info = fp.renderer.info.render; // same moment: between two frames
  out.report = rep;
  out.infoCalls = info.calls; out.infoTris = info.triangles;
  out.summaryShown = !!document.getElementById('perf-bench');
  out.overlayText = document.getElementById('perf').textContent;
  out.toggleRows = [...document.querySelectorAll('#dbg-list [data-toggle]')].map((b) => b.dataset.toggle);
  const bloom = fp.post.bloom;
  out.bloomBefore = bloom.enabled;
  fp.perf.toggles.bloom.set(false); out.bloomOff = bloom.enabled;
  fp.perf.toggles.bloom.set(true); out.bloomOn = bloom.enabled;
  // a module toggle hides its objects and restores them
  const name = Object.keys(rep.modules).find((k) => rep.modules[k].world && rep.modules[k].objects > 0);
  out.modName = name;
  fp.perf.setModule(name, false);
  out.modOffEnabled = fp.perf.report().modules[name].enabled;
  fp.perf.setModule(name, true);
  out.modOnEnabled = fp.perf.report().modules[name].enabled;
  fp.perf.setShadows(false); out.shadowsOff = fp.perf.toggles.shadows.get(); fp.perf.setShadows(true); out.shadowsOn = fp.perf.toggles.shadows.get();
  return out;
});
await page.waitForTimeout(1500);
await browser.close();
const rep = r.report, bench = rep.bench || {};
const worldMods = Object.keys(rep.modules).filter((k) => rep.modules[k].world);
const checks = [
  ['no page errors', errors.length === 0],
  ['bench finished with samples', Array.isArray(bench.samples) && bench.samples.length > 0 && !!bench.summary],
  ['report has frame samples', rep.frame && rep.frame.frames > 0],
  ['bench JSON has ua, quality, dpr, size, date', !!(bench.userAgent && bench.quality && bench.dpr && bench.renderSize && bench.date)],
  ['report calls == renderer.info.render.calls', rep.render.calls === r.infoCalls && r.infoCalls > 0],
  ['report tris == renderer.info.render.triangles', rep.render.triangles === r.infoTris && r.infoTris > 0],
  ['gpu degrades to n/a without the timer extension', rep.gpuTimer || rep.gpu.available === false],
  ['cpu split by module', Object.keys(rep.cpu.modules).length > 1],
  ['a toggle row for every loaded module', worldMods.length > 0 && worldMods.every((m) => r.toggleRows.includes(m))],
  ['bloom, shadows, profiler rows', ['bloom', 'shadows', 'profiler'].every((m) => r.toggleRows.includes(m))],
  ['bloom toggle flips the composer pass', r.bloomBefore === true && r.bloomOff === false && r.bloomOn === true],
  ['module toggle off and on', r.modOffEnabled === false && r.modOnEnabled === true],
  ['shadows toggle off and on', r.shadowsOff === false && r.shadowsOn === true],
  ['summary overlay shown', r.summaryShown],
];
let fail = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
console.log(`${checks.length - fail}/${checks.length} passed`);
console.log(JSON.stringify({ calls: r.infoCalls, tris: r.infoTris, modules: worldMods, frame: rep.frame, gpu: rep.gpu, cpu: rep.cpu, samples: bench.samples?.length, benchSummary: bench.summary, lights: rep.lights, memory: rep.memory, size: rep.size }));
console.log(r.overlayText);
if (errors.length) console.log(errors.join('\n'));
process.exit(fail ? 1 : 0);
