#!/usr/bin/env node
// Functional smoke test: load the scene headlessly, simulate walking, check movement, boundaries,
// colliders, landmark HUD and that no errors fire. Usage: node tools/walk-test.mjs [url]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 120000 });
const results = await page.evaluate(() => {
  const fp = window.__fp, out = {};
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const p = fp.player;
  const start = { x: p.pos.x, z: p.pos.z };
  // walk west for 10 simulated seconds
  p.yaw = Math.PI / 2; p.keys.add('KeyW');
  for (let i = 0; i < 200; i++) fp.controls.update(0.05);
  out.walked = Math.hypot(p.pos.x - start.x, p.pos.z - start.z);
  out.onGround = p.onGround;
  out.feetAboveGround = p.pos.y - p.eye - fp.terrain.heightAt(p.pos.x, p.pos.z);
  // run at the region boundary: should stop near regionRadius + 48
  p.pos.set(-330, fp.terrain.heightAt(-330, 0) + p.eye, 0); p.yaw = Math.PI / 2; p.keys.add('ShiftLeft');
  for (let i = 0; i < 400; i++) fp.controls.update(0.05);
  out.boundaryRadius = Math.hypot(p.pos.x, p.pos.z);
  p.keys.delete('ShiftLeft');
  // colliders: walk into a test collider
  fp.addCollider({ x: -100, z: 0, r: 2 });
  p.pos.set(-90, fp.terrain.heightAt(-90, 0) + p.eye, 0); p.yaw = Math.PI / 2; p.vel.set(0, 0, 0);
  for (let i = 0; i < 200; i++) fp.controls.update(0.05);
  out.colliderStop = Math.hypot(p.pos.x + 100, p.pos.z);
  p.keys.clear();
  // HUD landmark detection
  p.pos.set(-170, fp.terrain.heightAt(-170, -50) + p.eye, -50);
  fp.controls.update(0.016); fp.hud.update(0.016, 0);
  out.placeShown = document.getElementById('place').classList.contains('shown');
  out.placeName = document.getElementById('place-name').textContent;
  out.colliders = fp.controls.state.colliders.length;
  out.calls = fp.renderer.info.render.calls; out.tris = fp.renderer.info.render.triangles;
  return out;
});
await page.waitForTimeout(1500);
await browser.close();
const checks = [
  ['walked 32-40m in 10s (3.6 m/s)', results.walked > 32 && results.walked < 40],
  ['stays on the ground', results.onGround && Math.abs(results.feetAboveGround) < 0.05],
  ['boundary holds (< 352m)', results.boundaryRadius < 352],
  ['collider stops the player (~2.45m)', results.colliderStop > 2.3 && results.colliderStop < 2.7],
  ['landmark card shows at the stones', results.placeShown && /Cardinal/.test(results.placeName)],
  ['no page errors', errors.length === 0],
];
let fail = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
console.log(JSON.stringify(results));
if (errors.length) console.log(errors.join('\n'));
process.exit(fail ? 1 : 0);
