#!/usr/bin/env node
// The terrain's build time and a fingerprint of what it builds, without loading the walk (v11 M4).
//   node tools/terrain-probe.mjs <base> [q=low] [runs=3] [out.json]
// Imports src/terrain.js in a bare page (the site's import map, nothing else) and calls buildTerrain runs times,
// printing each build's ms (the first carries the JIT's warm-up, as a visitor's load does). Then the fingerprint:
// heightAt at 5,000 wall samples (r 284 to 500, a golden-angle spiral) and a checksum of each baked attribute.
// With out.json it writes the samples and the attributes' sums, so two trees can be compared:
//   node tools/terrain-probe.mjs --diff a.json b.json   (max |dh| over the samples, each attribute's max |d|)
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2);
if (args[0] === '--diff') {
  const [a, b] = [JSON.parse(readFileSync(args[1], 'utf8')), JSON.parse(readFileSync(args[2], 'utf8'))];
  let dh = 0; a.h.forEach((v, i) => { dh = Math.max(dh, Math.abs(v - b.h[i])); });
  console.log(`heightAt over ${a.h.length} wall samples: max |dh| ${dh.toExponential(2)} m`);
  for (const k of Object.keys(a.attr)) {
    if (!b.attr[k]) { console.log(`${k}: only in the first`); continue; }
    let d = 0; const A = a.attr[k], B = b.attr[k]; A.forEach((v, i) => { d = Math.max(d, Math.abs(v - B[i])); });
    console.log(`${k}: max |d| ${d.toExponential(2)} over ${A.length} values (sum ${a.sum[k].toFixed(6)} vs ${b.sum[k].toFixed(6)})`);
  }
  process.exit(0);
}
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base, q = 'low', runs = '3', out] = args;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
await page.route(`${base}/__probe.html*`, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><script type="importmap">{ "imports": { "three": "./vendor/three/three.module.js", "three/addons/": "./vendor/three/" } }</script><body></body>' }));
await page.goto(`${base}/__probe.html?q=${q}`);
const r = await page.evaluate(async ({ q, runs }) => {
  const THREE = await import('three');
  const T = await import('/src/terrain.js');
  const ms = [];
  let t;
  for (let k = 0; k < runs; k++) {
    const t0 = performance.now();
    t = T.buildTerrain({ scene: new THREE.Scene(), quality: q });
    ms.push(Math.round(performance.now() - t0));
  }
  const h = [];
  for (let i = 0; i < 5000; i++) {
    const r = 284 + 216 * Math.sqrt((i + 0.5) / 5000), a = i * 2.39996323;
    h.push(t.heightAt(Math.cos(a) * r, Math.sin(a) * r));
  }
  const geo = t.mesh.geometry, attr = {}, sum = {};
  for (const k of ['position', 'color', 'aWall', 'aIce', 'aWet', 'aGlac']) {
    if (!geo.attributes[k]) continue;
    const a = geo.attributes[k].array;
    let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * ((i % 7) + 1);
    sum[k] = s;
    attr[k] = Array.from(a.filter((_, i) => i % 13 === 0)); // a fixed thinning, enough to catch a change anywhere
  }
  return { ms, h, attr, sum };
}, { q, runs: +runs });
console.log(`buildTerrain q=${q}: ${r.ms.join(', ')} ms`);
let hs = 0; r.h.forEach((v) => { hs += v; });
console.log(`heightAt sum over 5000 wall samples: ${hs.toFixed(6)}`);
for (const k of Object.keys(r.sum)) console.log(`${k} checksum ${r.sum[k].toFixed(6)}`);
if (out) writeFileSync(out, JSON.stringify(r));
await browser.close();
