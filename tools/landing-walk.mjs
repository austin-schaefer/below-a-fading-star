#!/usr/bin/env node
// A short walk on the keys with the pointer captured, to reproduce a place a visitor reported and to see it fixed
// (v15-W4: the owner's stair heads). One page: "Go out", click the view (the mouse captured), then for each point hold
// W and steer with the mouse alone; at a point with `looks` stop, turn the head and write a frame. Where the walker
// stops moving for 4 s short of a point it writes a `stuck` frame looking where it was going and goes on to the next.
//   node tools/landing-walk.mjs <route.json> [base=http://localhost:8123] [prefix=v15-W4-walk] [q=low]
// route.json: { "start": [x, z, yaw], "pts": [{ "x", "z", "tag", "looks": [[name, dyaw, pitch], ...] }, ...] }, or a list
// of them (walked one after another, each from its own start: a reload between). tools/landing-walk-owner.json is the
// owner's five stair heads of 2026-11-16 (7.png to 11.png), each from below or above to the door
// or level beyond. Prints each frame with where the feet are, each stop, and `reached: n of m`.
import fs from 'node:fs';
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [file, base = 'http://localhost:8123', prefix = 'v15-W4-walk', q = 'low'] = process.argv.slice(2);
const routes = [].concat(JSON.parse(fs.readFileSync(file, 'utf8')));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1280, H = 720, SENS = 0.0021, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const browser = await pw.chromium.launch({ channel: process.env.CHANNEL || 'chromium' /* (the new headless: it grants the pointer capture) */, args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let reached = 0, total = 0, frame = 0;
for (const [ri, R] of routes.entries()) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const [sx, sz, syaw] = R.start;
  await page.goto(`${base}/?q=${q}&music=0&pos=${sx},${sz}&yaw=${syaw}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
  await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
  await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
  await sleep(500);
  await page.mouse.click(W / 2, H / 2);
  await sleep(1200);
  const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', locked: !!document.pointerLockElement }; });
  const s0 = await st();
  console.log(`route ${ri + 1} (${R.name || ''}): pointer captured: ${s0.locked}`);
  let mx = W / 2, my = H / 2;
  const turn = async (dyaw, dpitch = 0) => {
    const px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
    if (s0.locked) { for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); } return; }
    mx = W / 2; my = H / 2; await page.mouse.move(mx, my); await page.mouse.down();
    for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
    await page.mouse.up();
  };
  const shot = async (what) => {
    frame++;
    const f = `shots/wip/${prefix}-${String(frame).padStart(3, '0')}-${what}.png`;
    await page.screenshot({ path: f });
    const s = await st();
    console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor}`);
  };
  const look = async (name, dy, pitch) => { await turn(dy, pitch - (await st()).pitch); await sleep(1100); await shot(name); await turn(-dy, -(await st()).pitch); await sleep(200); };
  await shot(`${R.name || ri}-start`);
  for (const p of R.pts) {
    total++;
    await page.keyboard.down('KeyW');
    let last = null, still = 0, ok = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const s = await st(), dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz);
      if (d < 0.5) { ok = true; break; }
      const dy = wrap(Math.atan2(-dx, -dz) - s.yaw);
      if (Math.abs(dy) > 0.02) await turn(dy, -s.pitch * 0.5);
      await sleep(d < 2 ? 60 : 120);
      if (last && Math.hypot(s.x - last.x, s.z - last.z, s.feet - last.feet) < 0.01) { if ((still += d < 2 ? 60 : 120) > 4000) break; } else still = 0;
      last = s;
    }
    await page.keyboard.up('KeyW');
    await sleep(300);
    const s = await st();
    if (ok) { reached++; console.log(`[at] ${p.tag || ''} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor}`); }
    else { console.log(`[stuck] short of ${p.tag || ''} (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor}, ${Math.hypot(p.x - s.x, p.z - s.z).toFixed(1)} m off`); await look(`${R.name || ri}-stuck-${p.tag || ''}`, 0, -0.2); }
    for (const [name, dy, pitch] of p.looks || []) await look(`${R.name || ri}-${p.tag || ''}-${name}`, dy, pitch);
  }
  if (errors.length) console.log(`page errors: ${errors.slice(0, 2).join(' | ')}`);
  await page.close();
}
console.log(`reached: ${reached} of ${total}`);
await browser.close();
process.exit(reached === total ? 0 : 1);
