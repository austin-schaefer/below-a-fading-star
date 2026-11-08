#!/usr/bin/env node
// Top-down map of the region from the live terrain: hillshade, water, landmarks, causeway, river,
// and any extra sites passed as JSON (for placement planning).
//   node tools/map.mjs <out.png> [sites.json]   (sites: [{key, x, z, r, label}])
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const [out, sitesPath] = process.argv.slice(2);
const sites = sitesPath ? JSON.parse(readFileSync(sitesPath, 'utf8')) : [];
const b = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: 900, height: 900 } });
await p.goto(`${process.env.FP_BASE || 'http://localhost:8123'}/?q=low&skip=rocks,vegetation,structures,water,particles,fauna,audio,skylife`, { waitUntil: 'load' });
await p.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 180000 });
const res = await p.evaluate(async (sites) => {
  const ctx = window.__fp, T = ctx.terrain;
  const W = await import('./src/world.js');
  const { LANDMARKS, CAUSEWAY, SUN } = W;
  const S = 1800, half = 360, px = S / (2 * half), step = 2;
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const toPx = (x, z) => [(x + half) * px, (z + half) * px];
  // hillshade lit from the sun's side
  const img = g.createImageData(S, S); const d = img.data;
  const H = (x, z) => T.heightAt(x, z);
  for (let j = 0; j < S; j += 1) for (let i = 0; i < S; i += 1) {
    const x = i / px - half, z = j / px - half;
    const h = H(x, z), hx = H(x + step, z), hz = H(x, z + step);
    const nx = -(hx - h) / step, nz = -(hz - h) / step; const l = Math.hypot(nx, 1, nz);
    const lit = Math.max(0, (nx * SUN.dir.x + 1 * 0.55 + nz * SUN.dir.z) / l);
    const r2 = x * x + z * z;
    let R, G, B;
    if (r2 > 345 * 345) { R = 38; G = 34; B = 44; }
    else { const base = 70 + lit * 120; R = base * 0.78; G = base * 0.82; B = base * 0.7; }
    const dep = T.waterDepthAt ? T.waterDepthAt(x, z) : -Infinity;
    if (dep > 0.02) { R = 50; G = 90 + Math.min(60, dep * 15); B = 150 + Math.min(80, dep * 10); }
    const k = (j * S + i) * 4; d[k] = R; d[k + 1] = G; d[k + 2] = B; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.arc(S / 2, S / 2, 300 * px, 0, 7); g.stroke();
  // causeway
  g.strokeStyle = 'rgba(230,210,170,0.9)'; g.lineWidth = 4; g.beginPath();
  CAUSEWAY.forEach((q, i) => { const [a, bb] = toPx(q.x, q.z); i ? g.lineTo(a, bb) : g.moveTo(a, bb); }); g.stroke();
  // river path
  if (ctx.river?.pathPoints) { g.strokeStyle = 'rgba(120,190,255,0.95)'; g.lineWidth = 3; g.beginPath();
    ctx.river.pathPoints.forEach((q, i) => { const [a, bb] = toPx(q.x, q.z); i ? g.lineTo(a, bb) : g.moveTo(a, bb); }); g.stroke(); }
  g.font = '22px Alegreya, Georgia, serif'; g.textAlign = 'center';
  const circle = (x, z, r, col, label, dash) => { const [a, bb] = toPx(x, z); g.setLineDash(dash ? [8, 6] : []); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(a, bb, Math.max(6, r * px), 0, 7); g.stroke(); g.setLineDash([]);
    g.fillStyle = col; g.shadowColor = '#000'; g.shadowBlur = 6; g.fillText(label, a, bb - Math.max(6, r * px) - 6); g.shadowBlur = 0; };
  for (const [k, L] of Object.entries(LANDMARKS)) circle(L.x, L.z, L.r, 'rgba(240,228,200,0.95)', L.name, false);
  for (const s of sites) circle(s.x, s.z, s.r, '#ff9a5c', s.label, true);
  // sun arrow
  const [sx, sz] = toPx(-300, 0); g.fillStyle = '#ff9a5c'; g.font = 'bold 26px Alegreya, serif'; g.fillText('☉ sun (west, low)', 190, S / 2 - 30);
  // spawn
  const [spx, spz] = toPx(W.SPAWN.x, W.SPAWN.z); g.fillStyle = '#fff'; g.beginPath(); g.arc(spx, spz, 7, 0, 7); g.fill(); g.font = '20px Alegreya, serif'; g.fillText('spawn', spx, spz + 26);
  // aspect checks for sites
  const info = sites.map((s) => { const h = H(s.x, s.z), nx = -(H(s.x + 2, s.z) - h) / 2, nz = -(H(s.x, s.z + 2) - h) / 2; const l = Math.hypot(nx, 1, nz); return { key: s.key, y: +h.toFixed(1), slope: +(Math.acos(1 / l)).toFixed(2), facesSun: +((nx * SUN.dir.x + nz * SUN.dir.z) / l).toFixed(2), water: T.waterDepthAt ? +T.waterDepthAt(s.x, s.z).toFixed(1) : null }; });
  return { url: c.toDataURL('image/png'), info };
}, sites);
writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64'));
console.log(JSON.stringify(res.info, null, 0));
console.log('[saved]', out);
await b.close();
