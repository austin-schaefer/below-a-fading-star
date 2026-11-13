#!/usr/bin/env node
// Writes a views.mjs file for every Go-to entry in the settings map, at the pose teleport() gives it (v11-F2); reads
// the entries from a loaded page. Usage: FP_BASE=http://localhost:PORT node tools/goto-views.mjs > shots/wip/goto-views.json
// then: node tools/views.mjs shots/wip/goto-views.json shots/wip v11-F2-goto low. An entry with a y (the Span's deck) carries dy.
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp.settings, null, { timeout: 300000 });
const out = await page.evaluate(() => {
  const fp = window.__fp;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const yawToward = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  return fp.settings.places.map((pl, i) => {
    // teleport() itself sets the pose; read it back
    const ok = fp.settings.teleport(pl); const p = fp.player;
    const g = fp.terrain.heightAt(p.pos.x, p.pos.z);
    return { name: `${String(i).padStart(2, '0')}-${slug(pl.name)}`, x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3), dy: +(p.pos.y - p.eye - g).toFixed(2), skip: !ok };
  }).filter((v) => !v.skip).map(({ skip, ...v }) => (v.dy ? v : { ...v, dy: undefined }));
});
await browser.close();
console.log(JSON.stringify(out, null, 1));
