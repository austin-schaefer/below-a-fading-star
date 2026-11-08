#!/usr/bin/env node
// Grass-flicker regression test: stand still at a few spots, turn the camera through 360° in 5° steps,
// run the low-plant store's pick/pack each step, and check that the chunk underfoot and its nearest
// neighbour keep exactly the same number of packed instances of every kind (a chunk that drops out or
// changes its prefix while you only turn your head is grass popping in and out at your feet).
// Also reports what the old per-chunk test (box against the frustum, no 3x3 keep) would have done.
// Usage: node tools/grass-flicker-test.mjs [q=low|high]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const q = process.argv[2] || 'low';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:8123/?q=${q}&only=vegetation`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const res = await page.evaluate(() => {
  const fp = window.__fp, P = window.__vegPlants, cam = fp.camera, T = fp.THREE;
  const CHUNK = 24, CMIN = -324, CN = 27;
  const frustum = new T.Frustum(), pv = new T.Matrix4();
  const spots = { spawn: [fp.spawn.x, fp.spawn.z], 'wood-edge': [-128, 150], 'chunk-corner': [-36, 12] };
  const out = {};
  for (const [name, [x, z]] of Object.entries(spots)) {
    const y = fp.terrain.heightAt(x, z) + 1.6;
    cam.position.set(x, y, z);
    // the chunk underfoot and the nearest neighbour (by distance to its rectangle)
    const ci = Math.floor((x - CMIN) / CHUNK), cj = Math.floor((z - CMIN) / CHUNK);
    const here = cj * CN + ci;
    let best = -1, bd = Infinity;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const k = (cj + dj) * CN + ci + di, x0 = CMIN + (ci + di) * CHUNK, z0 = CMIN + (cj + dj) * CHUNK;
      const d = Math.hypot(Math.max(x0 - x, 0, x - x0 - CHUNK), Math.max(z0 - z, 0, z - z0 - CHUNK));
      if (d < bd) { bd = d; best = k; }
    }
    const watch = [here, best];
    const inChunk = (k, px, pz) => { const x0 = CMIN + (k % CN) * CHUNK, z0 = CMIN + Math.floor(k / CN) * CHUNK; return px >= x0 && px < x0 + CHUNK && pz >= z0 && pz < z0 + CHUNK; };
    const seen = {}; let oldDrops = 0; const oldHere = new Set();
    for (let deg = 0; deg < 360; deg += 5) {
      cam.rotation.order = 'YXZ'; cam.rotation.set(-0.05, deg * Math.PI / 180, 0);
      cam.updateMatrixWorld();
      pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pv);
      P.update(x, z, frustum);
      for (const kd of P.kinds) {
        const a = kd.aPos.array, n = kd.geo.instanceCount;
        for (const k of watch) {
          let c = 0;
          for (let i = 0; i < n; i++) if (inChunk(k, a[i * 4], a[i * 4 + 2])) c++;
          const key = kd.name + '@' + k;
          (seen[key] = seen[key] || new Set()).add(c);
        }
        for (const k of watch) { const ch = kd.chunks[k]; if (ch && ch.n && !frustum.intersectsBox(ch.box)) { oldDrops++; if (k === here) oldHere.add(kd.name + '@' + deg); } }
      }
    }
    const unstable = Object.entries(seen).filter(([, s]) => s.size > 1).map(([k, s]) => `${k}: ${[...s].join('/')}`);
    const counts = Object.fromEntries(Object.entries(seen).map(([k, s]) => [k, [...s][0]]));
    out[name] = { watch, unstable, counts, oldBoxTestDrops: oldDrops, oldHere: [...oldHere].slice(0, 12) };
  }
  return out;
});
let fail = errors.length > 0;
for (const [name, r] of Object.entries(res)) {
  const ok = r.unstable.length === 0;
  if (!ok) fail = true;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: chunks ${r.watch.join(',')} counts ${JSON.stringify(r.counts)}${ok ? '' : ' UNSTABLE ' + r.unstable.join('; ')}; old box test would have dropped a watched chunk ${r.oldBoxTestDrops} times (underfoot: ${r.oldHere.join(' ') || 'never'})`);
}
for (const e of errors) console.log('[pageerror]', e);
await browser.close();
process.exit(fail ? 1 : 0);
