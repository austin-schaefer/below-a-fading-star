#!/usr/bin/env node
// Loading bar test: the card shows a partly filled bar, a step label and a disabled button mid-load;
// once body.ready the button enables; the fill width never decreases. Usage: node tools/loading-test.mjs [url]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.addInitScript(() => {
  window.__samples = [];
  setInterval(() => {
    const f = document.querySelector('#load .fill'), s = document.querySelector('#load .step'), b = document.getElementById('begin');
    if (f && b) window.__samples.push({ w: parseFloat(f.style.width) || 0, label: s.textContent, disabled: b.disabled, ready: document.body.classList.contains('ready') });
  }, 50);
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
const mid = await page.evaluate(() => ({ w: document.querySelector('#load .fill').style.width, label: document.querySelector('#load .step').textContent, disabled: document.getElementById('begin').disabled, ready: document.body.classList.contains('ready') }));
await page.screenshot({ path: 'shots/wip/loading-01-card-midload.png', timeout: 240000 });
console.log('mid', mid);
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.waitForFunction(() => parseFloat(getComputedStyle(document.getElementById('load')).opacity) < 0.05, null, { timeout: 120000 });
const end = await page.evaluate(() => ({ disabled: document.getElementById('begin').disabled, opacity: getComputedStyle(document.getElementById('load')).opacity }));
await page.screenshot({ path: 'shots/wip/loading-01-card-ready.png', timeout: 240000 });
console.log('end', end);
const samples = await page.evaluate(() => window.__samples);
let mono = true; for (let i = 1; i < samples.length; i++) if (samples[i].w < samples[i - 1].w) mono = false;
console.log('labels', [...new Set(samples.map((s) => s.label))]);
const checks = [
  ['mid-load bar partly filled', parseFloat(mid.w) > 0 && parseFloat(mid.w) < 100 && !mid.ready],
  ['mid-load button disabled', mid.disabled === true],
  ['mid-load label visible', mid.label.length > 0],
  ['ready: button enabled', end.disabled === false],
  ['ready: bar faded', parseFloat(end.opacity) < 0.05],
  ['fill never decreased (' + samples.length + ' samples)', mono],
  ['button disabled in every pre-ready sample', samples.filter((s) => !s.ready).every((s) => s.disabled)],
];
for (const [n, ok] of checks) console.log(ok ? 'PASS' : 'FAIL', n);
await browser.close();
process.exit(checks.every((c) => c[1]) ? 0 : 1);
