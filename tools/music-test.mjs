#!/usr/bin/env node
// The music glue on the live walk (v9-M2). Usage: node tools/music-test.mjs [base]   (default http://localhost:8123)
// 1. a walk with the director's clock sped up (?musicspeed=60): the first track is the moor, the director's own clock
//    at 60-150 s, started with the sun whole and no gutter due in 20 s (a gutter is made due in 8 s before the walk
//    begins, so the start must wait for it to pass); the bus ducks to silence in a gutter (held at 0.2) and returns;
//    the setting in the panel (persisted as fp-music, applied at once, off stops the director); the debug panel lists
//    the tracks.
// 2. ?music=moor plays the moor 3 s after the walk begins and the director stays out of it; ?music=0 plays nothing.
// The player is music/player.js where it exists, else the glue's silent stand-in; either way the calls are the same.
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(query, pre) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const missing = [];
  page.on('response', (r) => { if (r.status() === 404) missing.push(r.url()); });
  // a missing music/player.js is the stand-in's case (the console line carries no url, so it is matched by the response)
  page.on('console', (m) => { if (m.type() === 'error' && !(/404/.test(m.text()) && missing.length && missing.every((u) => /music\/player\.js/.test(u)))) errors.push(m.text()); });
  await page.goto(`${base}/?${query}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  if (pre) await page.evaluate(pre);
  await page.evaluate(() => { try { window.__fp.events.dispatchEvent(new Event('begin')); } catch (e) { /* pointer lock refuses headless */ } });
  return { page, errors };
}

// ---- 1. the director on the walk
{
  const { page, errors } = await open('q=low&musicspeed=60', () => { localStorage.removeItem('fp-music'); window.__fp.sky.flicker.next = 40; });
  await page.keyboard.down('KeyW'); // moving
  await page.waitForFunction(() => window.__fp.audio?.music, null, { timeout: 30000 });
  const t0 = Date.now();
  let log = [];
  while (Date.now() - t0 < 60000) { log = await page.evaluate(() => window.__fp.audio.music.log.slice()); if (log.length) break; await sleep(250); }
  const waited = (Date.now() - t0) / 1000;
  check(log.length > 0 && log[0].name === 'moor', `the director starts the moor (${log[0] ? 'after ' + waited.toFixed(1) + ' s' : 'nothing'}; the player is ${await page.evaluate(() => window.__fp.audio.music.player)})`);
  if (log[0]) {
    check(log[0].t >= 60 && log[0].t <= 150.5, `its clock at the start: ${log[0].t.toFixed(0)} s (60-150 s)`);
    check(log[0].gutterIn >= 20 && log[0].swellSm < 0.05, `no gutter running or due in 20 s at the start (next in ${log[0].gutterIn.toFixed(0)} s, swell ${log[0].swellSm.toFixed(2)})`);
  }
  // the next silence ends with a gutter due in 5 s: the start waits for it to pass
  const t1 = Date.now();
  await page.evaluate(() => { const m = window.__fp.audio.music; m.stop(0.1); m.director.interrupt(0.1); window.__fp.sky.flicker.next = 5; });
  while (Date.now() - t1 < 60000) { log = await page.evaluate(() => window.__fp.audio.music.log.slice()); if (log.length > 1) break; await sleep(250); }
  const waited2 = (Date.now() - t1) / 1000;
  check(log.length > 1 && log[1].gutterIn >= 20 && log[1].swellSm < 0.05 && waited2 > 14, `a gutter due in 5 s holds the next start back until it has passed (started after ${waited2.toFixed(0)} s, next gutter in ${log[1]?.gutterIn.toFixed(0)} s)`);
  // the duck: hold the sun at 0.2 (the bed's swell follows), the bus falls to silence; release, it returns
  await page.evaluate(() => { window.__fp.sky.flicker.hold = 0.2; });
  await sleep(4000);
  const lo = await page.evaluate(() => window.__fp.audio.music.bus.gain.value);
  await page.evaluate(() => { window.__fp.sky.flicker.hold = null; });
  await sleep(9000);
  const hi = await page.evaluate(() => window.__fp.audio.music.bus.gain.value);
  check(lo < 0.1, `the bus ducks in a gutter (gain ${lo.toFixed(3)})`);
  check(hi > 0.9, `and returns on its tail (gain ${hi.toFixed(3)})`);
  // the setting
  await page.evaluate(() => window.__fp.settings.open());
  const btns = await page.evaluate(() => [...document.querySelectorAll('#set-music button')].map((b) => b.textContent + ':' + b.getAttribute('aria-pressed')));
  check(btns.join() === 'off:false,rare:false,default:true,frequent:false', `the panel's music row: ${btns.join(' ')}`);
  await page.click('#set-music button[data-music=rare]');
  const st = await page.evaluate(() => [localStorage.getItem('fp-music'), window.__fp.audio.music.setting, window.__fp.audio.music.director.state.setting]);
  check(st.join() === 'rare,rare,rare', `choosing rare persists and applies (${st.join(' ')})`);
  await page.click('#set-music button[data-music=off]');
  await sleep(500);
  const off = await page.evaluate(() => [window.__fp.audio.music.director.state.mode, window.__fp.audio.music.playing]);
  check(off[0] === 'wait' && off[1] === null, `off stops what plays (${off.join(' ')})`);
  await page.evaluate(() => window.__fp.settings.close());
  const dbg = await page.evaluate(() => [...document.querySelectorAll('#dbg-list [data-toggle]')].map((b) => b.dataset.toggle).filter((n) => n.startsWith('music ')));
  check(dbg.includes('music moor'), `the debug panel lists the tracks (${dbg.join(', ')})`);
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await page.close();
}

// ---- 2. ?music=
for (const [q, expect] of [['moor', true], ['0', false]]) {
  const { page, errors } = await open(`q=low&only=audio&music=${q}`);
  await sleep(1500);
  const early = await page.evaluate(() => window.__fp.audio?.music?.log.length ?? -1);
  await sleep(4500);
  const log = await page.evaluate(() => window.__fp.audio.music.log.slice());
  const mode = await page.evaluate(() => window.__fp.audio.music.director.state.setting);
  check(expect ? early === 0 && log.length === 1 && log[0].name === 'moor' : log.length === 0, `?music=${q}: ${expect ? 'nothing at 1.5 s, the moor by 6 s' : 'nothing played'} (${log.length} played; the director is ${mode})`);
  check(mode === 'off' && errors.length === 0, `?music=${q}: the director is out of it, no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await page.close();
}
await browser.close();
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
