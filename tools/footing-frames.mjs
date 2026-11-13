#!/usr/bin/env node
// Frames of the footing (v12 H0, part 7), in order, on the page's own clock (Playwright's, as tally-frames.mjs):
//   lip:    on the Great Span's south parapet top at x -200, facing out over the drop: a slow walk straight at the lip
//           (W held), every 0.15 s for 1.2 s: it stops at the lip, the eye leans out, then goes over;
//   tap:    the same, W held 0.4 s and let go: stopped at the lip, it stays;
//   hurry:  Shift and W: over at once;
//   drift:  along the parapet's top, 0.25 rad outward of its line, W for 3 s: it slides along the lip;
//   touch:  PHONE viewport, the stick held 70% up (no hurry) straight at the lip, then pushed full (a hurry): the
//           thumb's walk stops, the push goes over;
//   fall:   ?fall=1, off the parapet with a hurry: the view closing, the dark, the waking at the keep's gate, every
//           0.3 s for 8 s.
// Each frame 1280 x 720 (touch: 390 x 844) into shots/wip/<prefix>-<part>-NN-<t>.png. The sun's guttering held off.
// Usage: node tools/footing-frames.mjs [base] [prefix=h0-footing] [part=lip,tap,hurry,drift,touch,fall]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const prefix = process.argv[3] || 'h0-footing';
const parts = (process.argv[4] || 'lip,tap,hurry,drift,touch,fall').split(',');
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const PAR = { x: -200, z: 215 + 7.4, y: 57.05 }; // the south parapet's top
async function open(q, phone) {
  const [W, H] = phone ? [390, 844] : [1280, 720];
  const ctxB = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: !!phone, isMobile: !!phone });
  const page = await ctxB.newPage();
  page.setDefaultTimeout(600000);
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.clock.install();
  await page.goto(`${base}/?q=low&pos=${PAR.x},${PAR.z - 10}${q}`, { waitUntil: 'load', timeout: 120000 });
  for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready'))); i++) { await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 50)); }
  await page.evaluate(() => {
    const fp = window.__fp;
    fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card').classList.add('hidden');
    for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
    fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
  });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  return { page, ctxB, cdp: phone ? await ctxB.newCDPSession(page) : null };
}
async function stand(page, yaw, pitch = -0.35, at = PAR) {
  await page.evaluate(([at, yaw, pitch]) => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(at.x, at.z, at.y); p.yaw = yaw; p.pitch = pitch; }, [at, yaw, pitch]);
  await page.clock.runFor(1200);
}
function shooter(page, part) {
  let n = 0;
  return async (t) => {
    const f = `shots/wip/${prefix}-${part}-${String(n++).padStart(2, '0')}-${t}.png`;
    await page.screenshot({ path: f, timeout: 240000 });
    const s = await page.evaluate(() => { const p = window.__fp.player, F = window.__fp.fall; return { x: +p.pos.x.toFixed(2), z: +p.pos.z.toFixed(2), feet: +(p.pos.y - p.eye).toFixed(2), dwell: +p.edgeDwell.toFixed(2), fall: F ? F.phase : null }; });
    console.log(`[saved] ${f}`, JSON.stringify(s));
  };
}
// hold keys (or a stick) and take a frame every `step` s up to `secs`
async function sequence(page, part, down, up, step, secs, letGoAt = Infinity) {
  const shot = shooter(page, part);
  await shot('0.00s');
  await down();
  let t = 0, held = true;
  while (t < secs - 1e-6) {
    const next = Math.min(t + step, secs);
    if (held && letGoAt <= next) { await page.clock.runFor(Math.max(1, (letGoAt - t) * 1000)); await up(); held = false; await page.clock.runFor(Math.max(1, (next - letGoAt) * 1000)); }
    else await page.clock.runFor(step * 1000);
    t = next;
    await shot(`${t.toFixed(2)}s`);
  }
  if (held) await up();
}
const OUT = Math.PI; // yaw facing +z: out over the south side

if (parts.some((p) => ['lip', 'tap', 'hurry', 'drift'].includes(p))) {
  const { page, ctxB } = await open('');
  const K = page.keyboard;
  if (parts.includes('lip')) { await stand(page, OUT); await sequence(page, 'lip', () => K.down('KeyW'), () => K.up('KeyW'), 0.15, 1.2); }
  if (parts.includes('tap')) { await stand(page, OUT); await sequence(page, 'tap', () => K.down('KeyW'), () => K.up('KeyW'), 0.2, 1.4, 0.4); }
  if (parts.includes('hurry')) { await stand(page, OUT); await sequence(page, 'hurry', async () => { await K.down('ShiftLeft'); await K.down('KeyW'); }, async () => { await K.up('KeyW'); await K.up('ShiftLeft'); }, 0.15, 0.9); }
  if (parts.includes('drift')) { await stand(page, -Math.PI / 2 - 0.25, -0.3); await sequence(page, 'drift', () => K.down('KeyW'), () => K.up('KeyW'), 0.5, 3); }
  await ctxB.close();
}
if (parts.includes('touch')) {
  const { page, ctxB, cdp } = await open('', true);
  await stand(page, OUT);
  const home = await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
  // the thumb 70% of the ring up (a walk), then pushed full (a hurry, past 0.8)
  await sequence(page, 'touch', async () => { await touch('touchStart', [[1, home[0], home[1]]]); await touch('touchMove', [[1, home[0], home[1] - 42]]); }, async () => { await touch('touchMove', [[1, home[0], home[1] - 60]]); }, 0.2, 1.0, 0.8);
  const shot = shooter(page, 'touch-full');
  for (const t of [0.15, 0.3, 0.6]) { await page.clock.runFor(150); await shot(`${t.toFixed(2)}s`); }
  await touch('touchEnd', []);
  await ctxB.close();
}
if (parts.includes('fall')) {
  const { page, ctxB } = await open('&fall=1');
  await stand(page, OUT, -0.2);
  const K = page.keyboard;
  await sequence(page, 'fall', async () => { await K.down('ShiftLeft'); await K.down('KeyW'); }, async () => { await K.up('KeyW'); await K.up('ShiftLeft'); }, 0.3, 8.4, 0.6);
  await ctxB.close();
}
await browser.close();
