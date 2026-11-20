#!/usr/bin/env node
// Frames of the settings panel's map (v17.1-Q1, src/v17_1/map.js), in order, as a visitor works it: at 1280x720 with
// the mouse (open, a mark pointed at, after the click) and the keyboard (a mark focused, arrowed on), and at 390x844 on
// touch (open, after the first tap, after the second). Writes shots/wip/<prefix>-<stage>-<view>.png and prints them.
//   node tools/map-frames.mjs [base=http://localhost:8123] [prefix=v17.1-Q1]
import { ANGLE } from './launch.mjs';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8123';
const prefix = process.argv[3] || 'v17.1-Q1';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const out = [];
async function load(opts) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.settings, null, { timeout: 300000 });
  await page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin')));
  await page.waitForTimeout(1500);
  return { context, page };
}
const shot = async (page, stage, view) => { const p = `shots/wip/${prefix}-${stage}-${view}.png`; await page.screenshot({ path: p }); out.push(p); };
const markBox = (page, name) => page.evaluate((n) => { const m = window.__fp.settings.marks.find((k) => k.name === n); const r = m.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, name);

{ // desktop, the mouse
  const { context, page } = await load({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.click('#gear');
  await page.evaluate(() => window.__fp.settings.mapReady()); await page.waitForTimeout(900);
  await shot(page, 'open', 'desktop');
  const b = await markBox(page, 'The Swallow');
  await page.mouse.move(b.x, b.y); await page.waitForTimeout(300);
  await shot(page, 'hover', 'desktop');
  await page.mouse.click(b.x, b.y); await page.waitForTimeout(2500);
  await shot(page, 'after', 'desktop');
  // the keyboard: open again, Tab into the map, arrows, Enter
  await page.click('#gear'); await page.waitForTimeout(400);
  await page.evaluate(() => window.__fp.settings.marks.find((k) => k.name === 'Carcanet Keep').el.focus());
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(300);
  await shot(page, 'keys', 'desktop');
  await page.keyboard.press('Enter'); await page.waitForTimeout(2500);
  await shot(page, 'keys-after', 'desktop');
  await context.close();
}
{ // phone, touch
  const { context, page } = await load({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const g = await page.evaluate(() => { const r = document.getElementById('gear').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.touchscreen.tap(g.x, g.y);
  await page.evaluate(() => window.__fp.settings.mapReady()); await page.waitForTimeout(900);
  await shot(page, 'open', 'phone');
  const b = await markBox(page, 'The Lattice');
  await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(300);
  await shot(page, 'tap1', 'phone');
  await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(2500);
  await shot(page, 'after', 'phone');
  await context.close();
}
await browser.close();
for (const p of out) console.log(p);
if (errors.length) { console.log('page errors:', errors.slice(0, 5)); process.exit(1); }
