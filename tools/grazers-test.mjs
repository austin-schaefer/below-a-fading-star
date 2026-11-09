#!/usr/bin/env node
// v7.1 the grazers respect collision (src/fauna/grazers.js): each herd is driven through its own update hook
// (ctx.herds[i].update), accelerated, in one synchronous page call so the frame loop cannot interleave. First, set
// runs: the herd placed 7 m short of a collider near its home with the camera 10 m behind it, so it bolts straight
// at the collider; then 60 s of simulated time with the camera far (grazing and ambling) and coming in every 10 s
// from a new side (bolting). Every step, no grazer's centre may lie inside a collider (the same list controls.js
// reads, capped ones only where the grazer's ground is within their height). Also: the herd's update stays cheap.
// Usage: node tools/grazers-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`); };
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
await page.waitForTimeout(1500);

const out = await page.evaluate(() => {
  const fp = window.__fp, C = fp.controls.state.colliders, cam = fp.camera.position, H = fp.herds || [];
  const inside = (x, z) => {
    const gy = fp.terrain.heightAt(x, z);
    for (const c of C) {
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz >= c.r * c.r) continue;
      if (c.h !== undefined && (gy > c.y + c.h || gy < c.y - 0.5)) continue;
      return c;
    }
    return null;
  };
  const res = { herds: H.length, hooks: H.every((h) => typeof h.update === 'function'), runs: [], watch: [] };
  if (!res.hooks) return res;
  let t = 1000;
  const hits = [];
  const stepAll = (h, n, dt, label, camAt) => {
    let bad = 0;
    for (let k = 0; k < n; k++) {
      if (camAt) camAt(k);
      h.update(dt, (t += dt));
      for (const a of h.animals) {
        const c = inside(a.x, a.z);
        if (c) { bad++; if (hits.length < 8) hits.push({ label, x: +a.x.toFixed(2), z: +a.z.toFixed(2), c: [+c.x.toFixed(1), +c.z.toFixed(1), +c.r.toFixed(2)], mod: c.mod }); }
      }
    }
    return bad;
  };
  for (let hi = 0; hi < H.length; hi++) {
    const h = H[hi], [HX, HZ] = h.home || [h.herd.x, h.herd.z];
    // the set runs: up to 10 solid colliders 8-60 m from home, nearest first
    const cand = C.filter((c) => c.r >= 0.4 && c.r <= 6 && c.h === undefined)
      .map((c) => ({ c, d: Math.hypot(c.x - HX, c.z - HZ) })).filter((o) => o.d > 8 && o.d < 60).sort((a, b) => a.d - b.d);
    let runs = 0;
    for (const { c } of cand) {
      if (runs >= 10) break;
      const ux = (HX - c.x) / Math.hypot(HX - c.x, HZ - c.z), uz = (HZ - c.z) / Math.hypot(HX - c.x, HZ - c.z), px = -uz, pz = ux;
      const R = c.r + 7, spots = [];
      for (let i = 0; i < h.animals.length; i++) { const s = (i - (h.animals.length - 1) / 2) * 0.6; spots.push([c.x + ux * R + px * s, c.z + uz * R + pz * s]); }
      if (spots.some(([x, z]) => inside(x, z))) continue;
      h.animals.forEach((a, i) => { a.x = spots[i][0]; a.z = spots[i][1]; a.yaw = Math.atan2(-ux, -uz); a.speed = 0; a.state = 'graze'; a.timer = 5; a.flee = 0; });
      h.herd.mode = 'graze';
      cam.set(c.x + ux * (R + 10), fp.terrain.heightAt(c.x + ux * (R + 10), c.z + uz * (R + 10)) + 1.7, c.z + uz * (R + 10));
      const bad = stepAll(h, 100, 0.05, `herd ${hi} at (${c.x.toFixed(1)}, ${c.z.toFixed(1)})`);
      res.runs.push({ herd: hi, at: [+c.x.toFixed(1), +c.z.toFixed(1)], r: +c.r.toFixed(2), mod: c.mod, bad });
      runs++;
    }
    // the watch: put the herd home, 60 s at 20 Hz; the camera far, but coming in from a new side every 10 s
    h.animals.forEach((a, i) => { const ang = i * 1.3; a.x = HX + Math.cos(ang) * 4; a.z = HZ + Math.sin(ang) * 4; a.state = 'graze'; a.timer = 1; a.speed = 0; });
    h.herd.mode = 'graze';
    const bad = stepAll(h, 1200, 0.05, `herd ${hi} watch`, (k) => {
      const seg = Math.floor(k / 200), local = k % 200;
      if (local < 40) { const ang = seg * 2.1, x = h.herd.x + Math.cos(ang) * 10, z = h.herd.z + Math.sin(ang) * 10; cam.set(x, fp.terrain.heightAt(x, z) + 1.7, z); }
      else cam.set(HX + 400, 200, HZ + 400);
    });
    res.watch.push({ herd: hi, bad, end: h.animals.map((a) => [+a.x.toFixed(1), +a.z.toFixed(1)]) });
  }
  res.hits = hits;
  // the cost: 2000 steps per herd timed as a block (the page's clock is coarse), half of them bolting
  let total = 0, steps = 0;
  for (const h of H) {
    const [HX, HZ] = h.home;
    for (let k = 0; k < 2000; k++) {
      if (k % 200 === 0) { const near = (k / 200) % 2 === 0, ang = k * 0.01; const x = near ? h.herd.x + Math.cos(ang) * 10 : HX + 400, z = near ? h.herd.z + Math.sin(ang) * 10 : HZ + 400; cam.set(x, 50, z); }
      const t0 = performance.now();
      h.update(0.05, (t += 0.05));
      total += performance.now() - t0; steps++;
    }
  }
  res.msMean = total / steps;
  return res;
});
await browser.close();

check('two herds, each with its update hook', out.herds === 2 && out.hooks, { herds: out.herds, hooks: out.hooks });
if (out.hooks) {
  const runBad = out.runs.reduce((s, r) => s + r.bad, 0);
  check('set runs: a herd bolting at a collider never has a centre inside one', out.runs.length >= 10 && runBad === 0, { runs: out.runs.length, badSteps: runBad, blocked: out.runs.filter((r) => r.bad).map((r) => `${r.mod}@${r.at}`).slice(0, 6) });
  const watchBad = out.watch.reduce((s, r) => s + r.bad, 0);
  check('60 s watch per herd (grazing, ambling, four bolts): no centre inside a collider', watchBad === 0, { badSteps: out.watch.map((w) => w.bad) });
  // v7's update (no steering) measured 0.092 ms a step here; the steering's budget is 0.05 ms on top
check('the herd\'s update stays cheap (mean < 0.14 ms a step, headless: v7 0.092 + the 0.05 budget)', out.msMean < 0.14, { meanMs: +out.msMean.toFixed(4) });
  if (out.hits.length) console.log('first hits', JSON.stringify(out.hits));
}
check('no page errors', errors.length === 0, errors.slice(0, 3));
const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
