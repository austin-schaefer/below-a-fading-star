#!/usr/bin/env node
// Screenshot the scene headlessly with software WebGL and report console errors.
//   node tools/shot.mjs <url> <out.png> [width] [height] [settleMs]
// e.g. node tools/shot.mjs "http://localhost:8123/?pos=-90,60&yaw=1.2" /tmp/a.png 1280 720
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const [url, out, w = '1280', h = '720', settle = '2500'] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node tools/shot.mjs <url> <out.png> [w] [h] [settleMs]'); process.exit(2); }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
let failed = false;
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || /\[fp\]/.test(m.text())) console.log(`[console.${m.type()}]`, m.text().slice(0, 600)); });
page.on('pageerror', (e) => { failed = true; console.log('[pageerror]', e.message); });
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));
page.on('response', (r) => { if (r.status() >= 400 && !/fonts\.g/.test(r.url())) console.log(`[http ${r.status()}]`, r.url()); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch((e) => { failed = true; console.log('[goto]', e.message); });
try { await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 90000 }); }
catch (e) { failed = true; console.log('[not ready]', e.message); }
// hide the title card so the scene itself is visible
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); });
await page.waitForTimeout(+settle);
const err = await page.evaluate(() => document.getElementById('error')?.textContent || '');
if (err) { failed = true; console.log('[error el]', err.slice(0, 800)); }
const stats = await page.evaluate(() => { const r = window.__fp?.renderer?.info; return r ? { calls: r.render.calls, tris: r.render.triangles, geoms: r.memory.geometries, tex: r.memory.textures, programs: r.programs?.length } : null; });
console.log('[render info]', JSON.stringify(stats));
await page.screenshot({ path: out, timeout: 180000 });
console.log('[saved]', out);
await browser.close();
process.exit(failed ? 1 : 0);
