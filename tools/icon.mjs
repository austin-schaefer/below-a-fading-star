#!/usr/bin/env node
// Render the site's icons from the scene itself: the swollen sun between the Acephalous Thrones'
// shoulders, seen from the gate at spawn through a 30° lens, held half-way into a gutter so the
// disc reads and its light rims the shoulders. One high-quality 1024² frame, then stepwise halving
// in the browser down to apple-touch-icon.png (180², Apple applies its own mask) and favicon-32.png
// (a tighter crop on the sun, rounded like an app tile).
//   node tools/icon.mjs [base=http://localhost:8123] [master.png]
// Pass a path as the second argument to keep the 1024² master as well.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const [base = 'http://localhost:8123', masterOut] = process.argv.slice(2);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIEW = { x: 6, z: 36, yaw: 1.902, pitch: 0.26, fov: 30, flicker: 0.55 };
const SIZE = 1024;

const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
page.setDefaultTimeout(600000);
let failed = false;
page.on('pageerror', (e) => { failed = true; console.log('[pageerror]', e.message); });
await page.goto(`${base}/?q=high&pos=${VIEW.x},${VIEW.z}&yaw=${VIEW.yaw}&pitch=${VIEW.pitch}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate((v) => {
  document.getElementById('card')?.classList.add('hidden');
  const fp = window.__fp, p = fp.player;
  p.pos.set(v.x, fp.terrain.heightAt(v.x, v.z) + p.eye, v.z);
  p.yaw = v.yaw; p.pitch = v.pitch; if (p.vel) p.vel.set(0, 0, 0);
  fp.camera.fov = v.fov; fp.camera.updateProjectionMatrix();
  fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.hold = v.flicker; // half-way into a gutter, held
}, VIEW);
await page.waitForTimeout(4000); // the tier settles and the lights ease to the held flicker

const out = await page.evaluate(async ({ size }) => {
  const fp = window.__fp;
  fp.renderer.shadowMap.needsUpdate = true;
  fp.renderer.info.reset(); fp.post.composer.render();
  const scene = document.getElementById('scene');
  const master = document.createElement('canvas'); master.width = master.height = size;
  master.getContext('2d').drawImage(scene, 0, 0, size, size);
  // halve until within 2× of the target, then one last resample: each step averages 2×2 texels, so no shimmer
  const shrink = (src, sx, sy, sw, sh, target) => {
    let c = document.createElement('canvas'); c.width = c.height = sw;
    c.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sw);
    while (c.width / 2 >= target) {
      const n = document.createElement('canvas'); n.width = n.height = c.width / 2;
      const g = n.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height);
      c = n;
    }
    const n = document.createElement('canvas'); n.width = n.height = target;
    const g = n.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, target, target);
    return n;
  };
  const rounded = (c, r) => { // an app-tile mask, for the tab icon
    const n = document.createElement('canvas'); n.width = n.height = c.width;
    const g = n.getContext('2d');
    g.beginPath(); g.roundRect(0, 0, c.width, c.height, r); g.clip(); g.drawImage(c, 0, 0);
    return n;
  };
  const apple = shrink(master, 0, 0, size, size, 180);
  const crop = Math.round(size * 0.44), cx = Math.round(size * 0.48 - crop / 2), cy = Math.round(size * 0.57 - crop / 2); // the disc, the left shoulder lit under it
  const fav = rounded(shrink(master, cx, cy, crop, crop, 32), 7);
  const i = fp.renderer.info.render;
  return { calls: i.calls, tris: i.triangles, master: master.toDataURL('image/png'), apple: apple.toDataURL('image/png'), fav: fav.toDataURL('image/png') };
}, { size: SIZE });
await browser.close();
const save = (path, url) => { writeFileSync(path, Buffer.from(url.split(',')[1], 'base64')); console.log('[saved]', path); };
save(resolve(root, 'apple-touch-icon.png'), out.apple);
save(resolve(root, 'favicon-32.png'), out.fav);
if (masterOut) save(masterOut, out.master);
console.log(`[render info] calls=${out.calls} tris=${out.tris}`);
process.exit(failed ? 1 : 0);
