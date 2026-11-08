#!/usr/bin/env node
// Render several views from one page load (saves the 1-2 minute scene build per shot).
//   node tools/views.mjs <views.json> <outDir> <prefix> [q=low] [w=1280] [h=720]
// views.json: [{ "name": "causeway", "x": -40, "z": 22, "yaw": 1.9, "pitch": 0, "dy": 0, "js": "page code after placing", "pre": "page code just before the frame", "settle": 1500 }]
// The sun's guttering is held off so before/after pairs are comparable. Frames are read from the canvas
// right after a synchronous composer.render(), so no preserveDrawingBuffer is needed.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const [vf, outDir, prefix, q = 'low', w = '1280', h = '720', extra = ''] = process.argv.slice(2);
const views = JSON.parse(readFileSync(vf, 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// FP_BASE picks the server (default the main tree's port); FP_DSF sets devicePixelRatio (pixel-ratio pairs);
// FP_SUFFIX goes after the view's name (perf-02-bloom-sun-before.png)
const base = process.env.FP_BASE || 'http://localhost:8123';
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.FP_DSF || 1) });
page.setDefaultTimeout(600000);
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const v0 = views[0];
await page.goto(`${base}/?q=${q}&pos=${v0.x},${v0.z}&yaw=${v0.yaw}${extra}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); document.getElementById('place').style.display = 'none'; document.getElementById('hint').style.display = 'none'; const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
for (const v of views) {
  await page.evaluate((v) => {
    const fp = window.__fp, p = fp.player;
    p.pos.set(v.x, fp.terrain.heightAt(v.x, v.z) + p.eye + (v.dy || 0), v.z);
    p.yaw = v.yaw; p.pitch = v.pitch || 0; if (p.vel) p.vel.set(0, 0, 0);
    if (v.fly) { p.flyY = p.pos.y; }
    if (v.js) (0, eval)(v.js);
  }, v);
  await page.waitForTimeout(v.settle ?? 2500);
  const r = await page.evaluate((v) => {
    const fp = window.__fp;
    if (v.pre) (0, eval)(v.pre);
    if (v.dy) { fp.player.pos.y = fp.terrain.heightAt(v.x, v.z) + fp.player.eye + v.dy; fp.camera.position.y = fp.player.pos.y; }
    fp.renderer.shadowMap.needsUpdate = true; // a fresh shadow map at the exact view, whatever its cadence
    fp.renderer.info.reset(); fp.post.composer.render();
    const i = fp.renderer.info.render;
    return { url: document.getElementById('scene').toDataURL('image/png'), calls: i.calls, tris: i.triangles };
  }, v);
  const out = `${outDir}/${prefix}-${v.name}${process.env.FP_SUFFIX || ''}.png`; // FP_SUFFIX: e.g. -before
  writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(`[saved] ${out} calls=${r.calls} tris=${r.tris}`);
}
await browser.close();
