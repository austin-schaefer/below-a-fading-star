#!/usr/bin/env node
// Record test: loads ?q=medium&record=6&pos=-190,165, clicks "Go out", turns the view for the whole recording
// (the yaw set from the clock each frame, as pan-test does), waits for the panel, then reads the record through
// __fp.perf.lastRecord() and checks it: about 6 s of frames, one sample per 250 ms with GPU rows (or n/a without
// the timer query), the worst ten sorted and carrying yaws, the idle time before "Go out" not counted, the
// download's file name. Optionally saves the panel: node tools/record-test.mjs [url] [shot.png]
// Usage: node tools/record-test.mjs ["http://localhost:8123/?q=medium&record=6&pos=-190,165"] [out.png]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=medium&record=6&pos=-190,165';
const shot = process.argv[3];
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.waitForTimeout(2500); // idle under the title card: must not be recorded
const idleFrames = await page.evaluate(() => window.__fp.perf.recording && !window.__fp.perf.lastRecord());
await page.evaluate(() => {
  const fp = window.__fp, ctl = fp.controls.update, yaw0 = fp.player.yaw;
  let t0 = 0;
  fp.controls.update = function (dt) { if (!t0) t0 = performance.now(); fp.player.yaw = yaw0 + 2 * Math.PI * ((performance.now() - t0) / 6000); return ctl.call(this, dt); };
});
await page.click('#begin');
await page.waitForSelector('#perf-bench', { timeout: 120000 });
const r = await page.evaluate(() => window.__fp.perf.lastRecord());
const name = await page.evaluate(async () => {
  let n = null; const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { n = this.download; };
  document.querySelector('#perf-bench [data-a=dl]').click();
  HTMLAnchorElement.prototype.click = orig; return n;
});
const text = await page.evaluate(() => document.querySelector('#perf-bench pre').textContent);
if (shot) await page.screenshot({ path: shot });
await browser.close();
console.log(text);
const s = r.summary, fps = s.fps;
let pass = 0, fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); c ? pass++ : fail++; };
ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
ok(idleFrames, 'armed and waiting while idle under the card');
ok(Math.abs(r.recordedSeconds - 6) < 0.5, `recorded ${r.recordedSeconds} s of 6`);
ok(r.idleSeconds < 1.5, `idle ${r.idleSeconds} s is not counted (the 2.5 s under the card is not in it)`);
ok(s.frames > 6 * 5 && Math.abs(s.frames - fps * r.recordedSeconds) < 3, `${s.frames} frames at ${fps} fps`);
ok(r.frames.ms.length === s.frames && r.frames.t.length === s.frames && r.frames.yaw.length === s.frames, 'frame arrays match the count');
ok(r.frames.t.every((v, i) => i === 0 || v >= r.frames.t[i - 1]), 'timestamps rise');
ok(Math.abs(r.samples.length - 24) <= 2, `${r.samples.length} samples (24 expected)`);
ok(r.samples.every((x) => x.dpr > 0 && x.buffer[0] > 0 && x.calls > 0 && x.tris > 0 && x.geometries > 0 && x.textures > 0 && x.programs > 0 && 'tierSteps' in x && 'yaw' in x && Object.keys(x.cpuMs).length), 'samples carry dpr, buffer, draw calls, triangles, counts, tier steps, yaw, cpu per module');
ok(r.samples.every((x) => x.gpu === 'n/a' || x.gpu === null || (x.gpu.total > 0 && x.gpu.render > 0)), 'samples have GPU rows' + (r.gpuTimer ? '' : ' (n/a: no timer query)'));
ok(r.gpuTimer ? r.samples.filter((x) => x.gpu && x.gpu !== 'n/a').length >= r.samples.length - 3 : r.samples.every((x) => x.gpu === 'n/a'), 'GPU rows present on the samples, or n/a throughout');
ok(r.samples.every((x) => x.shadowRedraws != null && x.shadowDynamic != null && x.uploads >= 0), 'shadow redraw counters and uploads');
ok(s.worst.length === 10 && s.worst.every((w, i) => i === 0 || w.ms <= s.worst[i - 1].ms) && s.worst.every((w) => typeof w.yaw === 'number' && w.t > 0 && w.around), 'worst ten sorted, with yaws, timestamps and their sample');
ok(s.worst[0].ms === s.worstMs && s.medianMs <= s.p95Ms && s.p95Ms <= s.p99Ms && s.p99Ms <= s.worstMs, 'median <= 95th <= 99th <= worst');
ok(/^record-\d{4}-\d\d-\d\d-medium\.json$/.test(name), `download name ${name}`);
ok(/recorded .* s of 6 s/.test(text) && /worst ten/.test(text), 'panel text');
console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
