#!/usr/bin/env node
// Mean colour shift of before/after render pairs (the Tinctures): node tools/tinct-measure.mjs shots/wip/v4-05-dress-tinct-*-before.png
// Prints, per pair, the mean RGB (0-255) before and after, the luminance change and the hue shift in degrees and as a share of the wheel.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire(process.cwd() + '/node_modules/')('playwright')); }
const files = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
const mean = async (f) => p.evaluate(async (src) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0, gg = 0, bb = 0; const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; }
  return [r / n, gg / n, bb / n];
}, 'data:image/png;base64,' + readFileSync(f).toString('base64'));
const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return { h: h * 60, s: d / (1 - Math.abs(mx + mn - 1) || 1), l: (mx + mn) / 2 }; };
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
for (const f0 of files) {
  const f1 = f0.replace('-before', '-after'), a = await mean(f0), c = await mean(f1);
  const ha = hsl(a), hc = hsl(c); let dh = hc.h - ha.h; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
  const rel = Math.hypot(...a.map((v, i) => (c[i] - v))) / Math.hypot(...a);
  console.log(f0.split('/').pop().replace('-before.png', ''), 'before', a.map((v) => v.toFixed(1)).join(','), 'after', c.map((v) => v.toFixed(1)).join(','),
    `| luminance ${(100 * (lum(c) / lum(a) - 1)).toFixed(1)}% | hue ${dh.toFixed(1)} deg (${(Math.abs(dh) / 3.6).toFixed(1)}% of the wheel) | colour shift ${(100 * rel).toFixed(1)}%`);
}
await b.close();
