#!/usr/bin/env node
// The Lappet's plan, top-down, from src/v15/plan.js alone (no server): the risers' lines, the levels tinted, the
// lanes, the squares, the ways and every named plot with its front marked, over the keep, the Pomegranate House and
// the causeway. For looking at the plan as a plan: is it a village or a grid?
//   node tools/village-plan.mjs [out.png]     (default shots/wip/v15-plan-village.png; an .svg beside it)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = await import(pathToFileURL(`${ROOT}/src/v15/plan.js`).href);
const out = resolve(process.argv[2] || `${ROOT}/shots/wip/v15-plan-village.png`);
const X0 = 34, X1 = 126, Z0 = -68, Z1 = 34, S = 14; // metres shown, px per metre
const W = (X1 - X0) * S, H = (Z1 - Z0) * S;
const px = (x, z) => `${((x - X0) * S).toFixed(1)},${((z - Z0) * S).toFixed(1)}`;
const poly = (pts, attr) => `<polygon points="${pts.map((p) => px(p[0], p[1])).join(' ')}" ${attr}/>`;
const line = (pts, attr) => `<polyline points="${pts.map((p) => px(p[0], p[1])).join(' ')}" fill="none" ${attr}/>`;
const text = (x, z, s, attr = '') => `<text x="${(x - X0) * S}" y="${(z - Z0) * S}" ${attr}>${s}</text>`;
const TINT = { crown: '#b9ad94', high: '#9c9282', mid: '#857c70', low: '#6f685f', bench: '#8d8a6a', foot: '#6d7257' };
let g = `<rect width="${W}" height="${H}" fill="#4d5440"/>`;
// the levels, as a raster of 0.5 m cells
for (let z = Z0; z < Z1; z += 0.5) for (let x = X0; x < X1; x += 0.5) {
  const l = P.levelAt(x + 0.25, z + 0.25); if (!l) continue;
  const a = l.key === 'bench' || l.key === 'foot' ? 1 : Math.max(0.15, P.villageAmt(x, z));
  g += `<rect x="${(x - X0) * S}" y="${(z - Z0) * S}" width="${S / 2 + 0.3}" height="${S / 2 + 0.3}" fill="${TINT[l.key]}" opacity="${a.toFixed(2)}"/>`;
}
// the keep (its court, roughly) and the house
g += `<rect x="${(16 - X0) * S}" y="${(6 - Z0) * S}" width="${48 * S}" height="${48 * S}" fill="none" stroke="#2b2620" stroke-width="5"/>` + text(37, 31, 'Carcanet Keep', 'font-size="22" fill="#2b2620"');
g += poly([[P.HOUSE.x0, P.HOUSE.z0], [P.HOUSE.x1, P.HOUSE.z0], [P.HOUSE.x1, P.HOUSE.z1], [P.HOUSE.x0, P.HOUSE.z1]], 'fill="#d8c9a8" stroke="#5a2a22" stroke-width="4"') + text(86, -44, 'the Pomegranate House', 'font-size="20" fill="#5a2a22"');
g += `<circle cx="${(P.HOUSE.gate[0] - X0) * S}" cy="${(P.HOUSE.gate[1] - Z0) * S}" r="9" fill="#5a2a22"/>`;
for (const [k, pts] of Object.entries(P.OUTLINES)) g += line(pts, `stroke="#1d1a17" stroke-width="${k === 'haha' ? 5 : 4}"`);
for (const sq of P.SQUARES) g += poly(sq.pts, 'fill="#e6d7a8" fill-opacity="0.35" stroke="#e6d7a8" stroke-dasharray="8 6" stroke-width="2"') + text(sq.pts[0][0] + 1, sq.pts[0][1] + 2.2, sq.name, 'font-size="15" fill="#fff3c8"');
for (const l of P.LANES) g += line(l.pts, `stroke="#f0e2b6" stroke-opacity="0.75" stroke-width="${l.width * S}" stroke-linejoin="round" stroke-linecap="round"`) + line(l.pts, 'stroke="#7a6a44" stroke-width="1.5" stroke-dasharray="6 5"');
const HAND = { late: '#e9b78a', heliarch: '#c9c2b2', noon: '#bfe6dc', new: '#f4efe2', elder: '#777' };
for (const p of P.PLOTS) {
  const c = P.plotCorners(p);
  g += poly(c, `fill="${HAND[p.hand] || '#ccc'}" fill-opacity="${p.kind === 'tube' ? 0.45 : 0.9}" stroke="#2a211a" stroke-width="1.5"`);
  g += line([c[0], c[1]], 'stroke="#a3271d" stroke-width="4"'); // its front
  g += text(p.x, p.z + 0.4, p.name.replace(/^(rungs|lees|pennyworth|quarrels)-/, ''), 'font-size="11" text-anchor="middle" fill="#1b1410"');
}
for (const w of P.WAYS) {
  let a, b;
  if (w.run) { a = P.at(w.run, w.s, w.D0); b = P.at(w.run, w.s, w.D1 === w.D0 ? w.D0 + 0.8 : w.D1); } else { a = P.polar(w.b0, P.HAHA); b = P.polar(w.b1, P.HAHA + 2.4); }
  g += line([a, b], `stroke="${w.kind === 'tube' ? '#39d0c0' : w.kind === 'ladder' ? '#ff4d3d' : '#ffd23d'}" stroke-width="${w.kind === 'tube' ? 10 : 7}" stroke-opacity="0.85"`);
  g += text(b[0] + 0.6, b[1] + 0.2, w.name, 'font-size="12" fill="#fff"');
}
g += text(X0 + 1, Z0 + 3, 'The Lappet: src/v15/plan.js (north up; 1 m = 14 px). Red edge: a plot\'s front. Yellow: stairs and ramps; red: ladder; teal: the tube.', 'font-size="18" fill="#fff"');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Georgia, serif">${g}</svg>`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out.replace(/\.png$/, '.svg'), svg);
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<body style="margin:0">${svg}</body>`); await page.screenshot({ path: out }); await b.close();
console.log(`plan: ${P.PLOTS.length} plots, ${P.WAYS.length} ways, ${P.LANES.length} lanes -> ${out}`);
