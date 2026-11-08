#!/usr/bin/env node
// Screenshot the scene headlessly with software WebGL and report console errors.
//   node tools/shot.mjs <url> <out.png> [width] [height] [settleMs]
// e.g. node tools/shot.mjs "http://localhost:8123/?pos=-90,60&yaw=1.2" /tmp/a.png 1280 720
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
// FP_BROWSER=chromium|firefox|webkit picks the engine (default chromium); the ANGLE flags are Chromium's
const engine = process.env.FP_BROWSER || 'chromium';
const chromium = pw[engine];

const [url, out, w = '1280', h = '720', settle = '2500'] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node tools/shot.mjs <url> <out.png> [w] [h] [settleMs]'); process.exit(2); }
const browser = await chromium.launch(engine !== 'chromium' ? {} : { args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.SHOT_DPR || 1) }); // SHOT_DPR=2 renders as a retina Mac does
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
