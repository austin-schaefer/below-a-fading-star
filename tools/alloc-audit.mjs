#!/usr/bin/env node
// Per-frame allocation audit (v3 stage 3). Runs the bench path headlessly and measures, over two windows of
// rendered frames:
//  1. THREE math objects constructed per frame (Vector2/3/4, Color, Matrix3/4, Quaternion, Euler, Box3, Sphere,
//     Ray, Plane, ...), each attributed to the first src/ file:line on its stack. 'three' is served through a
//     wrapper module that re-exports it with counting subclasses, so `new THREE.Vector3()` in src/ counts and
//     three's own internal allocations do not (they never go through the namespace).
//  2. Every JS allocation (arrays, closures, objects, strings) per frame, from V8's sampling heap profiler with
//     collected objects included, summed by the src/ function that allocated it.
//   node tools/alloc-audit.mjs "<url with ?bench=>" [out.json] [windowSeconds=10]
// e.g. node tools/alloc-audit.mjs "http://localhost:8131/?bench=30&q=medium" shots/perf/stage3-tier-alloc-after.json
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const [url = 'http://localhost:8123/?bench=30&q=medium', out, winS = '10'] = process.argv.slice(2);
const WIN = +winS * 1000;
const real = readFileSync(fileURLToPath(new URL('../vendor/three/three.module.js', import.meta.url)), 'utf8');
const CLASSES = ['Vector2', 'Vector3', 'Vector4', 'Color', 'Matrix3', 'Matrix4', 'Quaternion', 'Euler', 'Box2', 'Box3', 'Sphere', 'Ray', 'Plane', 'Frustum', 'Line3', 'Triangle', 'Spherical', 'Raycaster'];
const wrapper = `import * as R from './three.real.js';
export * from './three.real.js';
const A = globalThis.__fpAlloc = { on: false, counts: {}, sites: {} };
function hit(name) {
  if (!A.on) return;
  A.counts[name] = (A.counts[name] || 0) + 1;
  const st = new Error().stack.split('\\n');
  // the first src/ frame, and the first caller in another src/ file (who asked terrain.js for a normal)
  let site = '(three or other)', file = null;
  for (const l of st) {
    const m = l.match(/\\/src\\/([^?#)]+?\\.js)(?:\\?[^:)]*)?:(\\d+)/);
    if (!m) continue;
    if (!file) { file = m[1]; site = m[1] + ':' + m[2]; } else if (m[1] !== file) { site += ' < ' + m[1] + ':' + m[2]; break; }
  }
  const k = name + ' ' + site; A.sites[k] = (A.sites[k] || 0) + 1;
}
${CLASSES.map((c) => `export class ${c} extends R.${c} { constructor(...a) { super(...a); hit('${c}'); } }`).join('\n')}
`;
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.route('**/vendor/three/three.module.js', (r) => r.fulfill({ contentType: 'text/javascript', body: wrapper }));
await page.route('**/vendor/three/three.real.js', (r) => r.fulfill({ contentType: 'text/javascript', body: real }));
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.waitForFunction(() => window.__fp?.perf?.bench?.phase === 'run', null, { timeout: 120000, polling: 100 });
// count rendered frames: main.js calls ctx.perf.frameEnd() once per frame
await page.evaluate(() => { const p = window.__fp.perf, f = p.frameEnd; window.__frames = 0; p.frameEnd = () => { window.__frames++; f(); }; });
await page.waitForTimeout(1000);

// window 1: THREE constructors by call site
const c = await page.evaluate(async (ms) => {
  const A = window.__fpAlloc; A.counts = {}; A.sites = {};
  const f0 = window.__frames; A.on = true;
  await new Promise((r) => setTimeout(r, ms));
  A.on = false;
  return { frames: window.__frames - f0, counts: A.counts, sites: A.sites };
}, WIN);

// window 2: all JS allocation by src/ function (sampling heap profiler, collected objects included)
const cdp = await page.context().newCDPSession(page);
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.collectGarbage');
const h0 = await page.evaluate(() => window.__frames);
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 256, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await page.waitForTimeout(WIN);
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const hFrames = (await page.evaluate(() => window.__frames)) - h0;
const benchDone = await page.evaluate(() => window.__fp.perf.bench.phase);
await browser.close();

const byFn = {}, byKind = { src: 0, three: 0, other: 0 };
(function walk(n) {
  const cf = n.callFrame, u = cf.url || '';
  const m = u.match(/\/src\/(.+\.js)/);
  const kind = m ? 'src' : /three\.(real|module)\.js|\/vendor\//.test(u) ? 'three' : 'other';
  byKind[kind] += n.selfSize;
  if (m && n.selfSize) { const k = `${m[1]}:${cf.lineNumber + 1} ${cf.functionName || '(anonymous)'}`; byFn[k] = (byFn[k] || 0) + n.selfSize; }
  for (const ch of n.children) walk(ch);
})(profile.head);

const per = (v, n) => Math.round((v / Math.max(1, n)) * 100) / 100;
const sorted = (o, n, k = 40) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k).map(([key, v]) => [key, per(v, n)]));
const total = Object.values(c.counts).reduce((a, b) => a + b, 0);
const rep = {
  kind: 'fading-planet-alloc-audit', date: new Date().toISOString(), url, windowSeconds: +winS, benchPhaseAtEnd: benchDone,
  three: { frames: c.frames, perFrame: per(total, c.frames), byClass: sorted(c.counts, c.frames), bySite: sorted(c.sites, c.frames, 60) },
  heap: { frames: hFrames, bytesPerFrame: { src: per(byKind.src, hFrames), three: per(byKind.three, hFrames), other: per(byKind.other, hFrames) }, srcByFunction: sorted(byFn, hFrames, 80) },
  errors,
};
if (out) writeFileSync(out, JSON.stringify(rep, null, 1));
console.log(`THREE objects per frame: ${rep.three.perFrame} over ${c.frames} frames`);
for (const [k, v] of Object.entries(rep.three.bySite)) console.log(`  ${String(v).padStart(8)}  ${k}`);
console.log(`heap bytes per frame over ${hFrames} frames: src ${rep.heap.bytesPerFrame.src} · three ${rep.heap.bytesPerFrame.three} · other ${rep.heap.bytesPerFrame.other}`);
for (const [k, v] of Object.entries(rep.heap.srcByFunction)) console.log(`  ${String(v).padStart(8)} B  ${k}`);
if (errors.length) console.log('errors:', errors.join('\n'));
if (out) console.log('[saved]', out);
