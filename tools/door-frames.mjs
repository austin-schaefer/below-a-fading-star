#!/usr/bin/env node
// Frames through the knock at the Hypogeum's door (v10-A1, v10-F2), in order, the way a visitor who never touches the
// mouse sees them: stood where the knock is first offered on the way down the stair, looking level at the door, then
// E and nothing more. Time is the page's own, driven by Playwright's clock (as tools/tally-frames.mjs), so "2 s after
// E" is 2 s of the walk's time however slowly the headless browser draws. 1280 x 720 (PHONE=1: 390 x 844) into
// shots/wip/<prefix>-NN-<name>.png; the sun's guttering is held off.
// part: first (a fresh page: the approach, the offer, then 0, 0.5, 1, 2, 3, 4, 6, 8, 12, 20, 30 s after E), second (the
// plate's act after a first knock: offered, then the same seconds), return (a reload after both: what lies there).
// Usage: node tools/door-frames.mjs [base] [prefix=acts-door3] [part=all|first|second|return]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const prefix = process.argv[3] || 'acts-door3';
const part = process.argv[4] || 'all';
const phone = process.env.PHONE === '1';
const [W, H] = phone ? [390, 844] : [1280, 720];
const SECS = [0, 0.5, 1, 2, 3, 4, 6, 8, 12, 20, 30];
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctxB = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: phone });
const page = await ctxB.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 300)); });
await page.clock.install();
const load = async () => {
  for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !!window.__fp?.hypogeumAct)); i++) {
    await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 50));
  }
  await page.evaluate(() => {
    const fp = window.__fp;
    fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden');
    for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
    fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
  });
};
await page.goto(`${base}/?q=low&pos=215,-112`, { waitUntil: 'load', timeout: 120000 });
await load();
await page.evaluate(() => { try { localStorage.removeItem('fp-acts'); } catch (e) { /* */ } window.__fp.acts.forget?.(); });
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
let n = 0;
const run = (ms) => page.clock.runFor(ms);
const shot = async (name) => {
  const f = `shots/wip/${prefix}-${String(n++).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: f, timeout: 240000 });
  const s = await page.evaluate(() => { const fp = window.__fp, p = fp.player, s = fp.hypogeumAct.state(); return { offered: fp.acts.offered?.def.id || null, pos: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], yaw: +p.yaw.toFixed(2), pitch: +p.pitch.toFixed(2), t: +s.t.toFixed(2), strikes: s.strikes, plate: s.plate, reading: +(s.reading ?? -1).toFixed(2), carried: p.carried }; });
  console.log(`[saved] ${f}`, JSON.stringify(s));
};
// stand d metres from the door's face on the stair's line, looking level at it: the walker's own pose
const stand = (d) => page.evaluate((d) => { const fp = window.__fp, D = fp.hypogeum.door, p = fp.player; fp.controls.placeAt(D.x - d, D.z); p.yaw = -Math.PI / 2; p.pitch = 0; p.vel.set(0, 0, 0); }, d);
// walk toward the door until the act is offered (as a visitor walking down does), then wait for the offer
const approach = async (id) => {
  for (let d = 6; d > 1.2; d -= 0.3) {
    await stand(d); await run(250);
    if ((await page.evaluate(() => window.__fp.acts.offered?.def.id)) === id) return d;
  }
  return null;
};
const through = async (tag) => {
  let el = 0;
  for (const s of SECS) { await run(Math.max(1, (s - el) * 1000)); el = s; await shot(`${tag}-${String(s).replace('.', 'p')}s`); }
};
if (part === 'all' || part === 'first' || part === 'second') {
  await stand(7); await run(1500); await shot('approach');
  const d = await approach('hypogeum-door'); await run(800);
  console.log('[offered at]', d);
  await shot('offer');
  await page.keyboard.press('KeyE');
  await through('knock');
}
if (part === 'all' || part === 'second') {
  for (let i = 0; i < 80 && !(await page.evaluate(() => window.__fp.acts.offered?.def.id && window.__fp.acts.offered.def.id !== 'hypogeum-door')); i++) await run(500);
  await shot('plate-offer');
  await page.keyboard.press('KeyE');
  await through('plate');
}
if (part === 'all' || part === 'return') {
  await page.reload({ waitUntil: 'load' }); await load();
  await stand(7); await run(1500); await shot('return-stair');
  await approach('hypogeum-door'); await run(800); await shot('return-door');
}
await browser.close();
