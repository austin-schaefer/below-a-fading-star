#!/usr/bin/env node
// Run the bench headlessly and save ctx.perf.report() (bench summary and samples included) as JSON.
// Headless WebGL is software: frame and GPU numbers are noise, but CPU ms per module is real JS time.
//   node tools/bench-report.mjs <url> <out.json> [width=960] [height=540]
// e.g. node tools/bench-report.mjs "http://localhost:8123/?bench=12&q=low" shots/perf/headless-before.json
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const [url = 'http://localhost:8123/?bench=12&q=low', out, w = '960', h = '540'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.waitForFunction(() => window.__fp?.perf?.bench?.done, null, { timeout: 900000, polling: 1000 });
const rep = await page.evaluate(() => ({ headless: true, url: location.href, ...window.__fp.perf.report() }));
await browser.close();
if (out) writeFileSync(out, JSON.stringify(rep, null, 1));
const s = rep.bench.summary;
console.log(`frames ${s.frames} · avg ${s.avgFrameMs} ms · calls ${s.calls?.join('–')} · tris ${s.tris?.join('–')}`);
const cpu = s.cpuMs; let tot = 0;
for (const [k, v] of Object.entries(cpu).sort((a, b) => b[1] - a[1])) { tot += v; console.log(`  ${k.padEnd(14)} ${v.toFixed(2)} ms`); }
console.log(`  ${'total'.padEnd(14)} ${tot.toFixed(2)} ms`);
for (const [k, v] of Object.entries(s.cpuCallbacks || {})) console.log(`    ${k.padEnd(40)} ${v} ms`);
if (rep.firstBlock) console.log('first block:', JSON.stringify(rep.firstBlock));
if (errors.length) console.log(errors.join('\n'));
if (out) console.log('[saved]', out);
