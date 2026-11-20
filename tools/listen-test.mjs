#!/usr/bin/env node
// listen.html in use (v17.1, issue #23): the page of music sketches, at desktop size and on a phone (390 by 844, touch).
//   node tools/listen-test.mjs [base] [--frames=<stage>]     (default http://localhost:8123)
// At each size: the page loads none of the walk (no three.js, no src/main.js) and no sample until a button is pressed;
// it shows the four sketches and the A/B pair, each with a line and a button, and does not scroll sideways; every
// button, pressed, plays (the page's analyser shows signal within 5 s and the bar moves) and, pressed again, stops;
// pressing another while one plays leaves one playing; no console error, no 404.
// Then, as a visitor who has walked before: a copy of the site stamped as Netlify stamps it (tools/sw-site.mjs, served
// from this checkout on the base's port + 1100, with the real sw.js and index.html's own registration script on a
// page that stands in for the walk); `/` is visited until the worker has proven itself, then listen.html, which the
// worker now controls, must load its script, fonts and samples and play a sketch (the worker once refused them all).
// --frames=<stage> writes shots/wip/v17.1-Q4-listen-<stage>-<view>.png (the page idle, playing, and its foot).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './launch.mjs';
import { serveSite } from './sw-site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), base = (args.find((a) => !a.startsWith('--')) || 'http://localhost:8123').replace(/\/$/, '');
const stage = (args.find((a) => a.startsWith('--frames=')) || '').slice(9);
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (page, view, full = false) => { if (!stage) return; const f = path.join(ROOT, 'shots/wip', `v17.1-Q4-listen-${stage}-${view}.png`); fs.mkdirSync(path.dirname(f), { recursive: true }); await page.screenshot({ path: f, fullPage: full }); console.log(`  frame: ${f}`); };

const browser = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const [view, opts] of [['desktop', { viewport: { width: 1280, height: 800 } }], ['phone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]]) {
    const ctx = await browser.newContext(opts), page = await ctx.newPage();
    const errors = [], urls = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('response', (r) => { urls.push(r.url()); if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    await page.goto(`${base}/listen.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const n = await page.evaluate(() => ({ sketches: document.querySelectorAll('#sketches .play').length, pair: document.querySelectorAll('#pair .play').length, lines: [...document.querySelectorAll('#sketches li p')].filter((p) => p.textContent.length > 40).length, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [...document.querySelectorAll('.play')].filter((b) => b.getBoundingClientRect().height < 44).length }));
    check(n.sketches === 4 && n.pair === 2 && n.lines === 4, `${view}: four sketches each with a line and a button, and the A/B pair (${n.sketches} + ${n.pair} buttons, ${n.lines} lines)`);
    check(n.wide <= 0 && n.small === 0, `${view}: no sideways scroll (${n.wide} px over), every button 44 px tall or more (${n.small} smaller)`);
    check(!urls.some((u) => /three|src\/main\.js|src\/world|\.mp3/.test(u)), `${view}: before a press, nothing of the walk and no sample is fetched (${urls.length} requests)`);
    await shot(page, `${view}-1-idle`);
    const press = (i) => (opts.hasTouch ? page.locator('.play').nth(i).tap() : page.locator('.play').nth(i).click());
    const level = () => page.evaluate(() => { const L = window.__listen; if (!L.tap) return 0; const d = new Float32Array(L.tap.fftSize); L.tap.getFloatTimeDomainData(d); let e = 0; for (const v of d) e += v * v; return Math.sqrt(e / d.length); });
    for (let i = 0; i < 6; i++) {
      await page.locator('.play').nth(i).scrollIntoViewIfNeeded();
      await press(i);
      let peak = 0, name = null;
      for (const t0 = Date.now(); Date.now() - t0 < 5000 && peak < 0.005;) { await sleep(120); peak = Math.max(peak, await level()); name = await page.evaluate(() => window.__listen.playing); }
      await sleep(900);
      for (let k = 0; k < 6; k++) { peak = Math.max(peak, await level()); await sleep(60); }
      const s = await page.evaluate((i) => { const b = document.querySelectorAll('.play')[i]; return { on: b.classList.contains('on'), word: b.querySelector('.word').textContent, bar: parseFloat(b.querySelector('i').style.width) || 0, state: window.__listen.ac.state, others: document.querySelectorAll('.play.on').length - 1 }; }, i);
      check(peak > 0.005 && s.on && s.word === 'stop' && s.bar > 0 && s.state === 'running' && s.others === 0, `${view}: button ${i + 1} plays ${name}: signal ${peak.toFixed(3)} rms at the page's output, the bar at ${s.bar.toFixed(1)} %, context ${s.state}`);
      if (i === 0) await shot(page, `${view}-2-playing`);
      if (i === 1 || i === 4) { // pressed again: it stops
        await press(i); await sleep(1300);
        const q = await page.evaluate(() => ({ on: document.querySelectorAll('.play.on').length, playing: window.__listen.playing })), after = await level();
        check(q.on === 0 && q.playing === null && after < 0.002, `${view}: button ${i + 1} pressed again stops it (signal ${after.toFixed(4)} rms)`);
      }
    }
    await press(5); await sleep(300); // stop the last
    const fetched = urls.filter((u) => u.endsWith('.mp3')).length;
    check(fetched > 0 && !urls.some((u) => /three|src\/main\.js/.test(u)), `${view}: samples came only with the presses (${fetched} files), and nothing of the walk`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(200);
    await shot(page, `${view}-3-foot`);
    if (view === 'phone') await shot(page, `${view}-4-whole`, true);
    check(errors.length === 0, `${view}: no console error, warning or failed request${errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''}`);
    await ctx.close();
  }
  // --- after the walk: under the walk's service worker
  {
    const port = +(new URL(base).port || 80) + 1100, S = `http://localhost:${port}`, COMMIT = 'abc1234';
    const register = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<script id="sw-register">[\s\S]*?<\/script>/)?.[0];
    const walk = `<!doctype html><meta charset="utf-8"><title>the walk's stand-in</title>${register}<body>`;
    const srv = await serveSite({ port, commit: () => COMMIT, files: (p) => {
      if (p === '/index.html') return walk;
      if (p === '/commit.json') return JSON.stringify({ commit: COMMIT });
      if (!/^\/(listen\.html|sw\.js|favicon-32\.png|src\/|vendor\/)/.test(p) || p.includes('..')) return null;
      const f = path.join(ROOT, p); return fs.existsSync(f) && fs.statSync(f).isFile() ? fs.readFileSync(f) : null;
    } });
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('requestfailed', (r) => errors.push('failed ' + new URL(r.url()).pathname));
      await page.goto(`${S}/?sw=1`);
      let sw = null;
      for (let i = 0; i < 100 && !(sw = await page.evaluate(() => window.__fp_sw).catch(() => null))?.proven; i++) await sleep(100);
      check(register && sw?.proven === true, `after the walk: the walk's worker is registered and proven (${JSON.stringify(sw)})`);
      errors.length = 0; // the probe's own sub-request on the walk's page is answered by the worker and reads as failed
      await page.goto(`${S}/listen.html`, { waitUntil: 'networkidle' });
      const st = await page.evaluate(async () => { await document.fonts.ready; return { controlled: !!navigator.serviceWorker.controller, buttons: document.querySelectorAll('.play').length, font: document.fonts.check("16px 'Fell English'") }; });
      check(st.controlled && st.buttons === 6 && st.font, `after the walk: listen.html, under the worker, has its script and type (controlled ${st.controlled}, ${st.buttons} buttons, the display face loaded ${st.font})`);
      await page.locator('.play').nth(0).tap();
      let peak = 0;
      for (const t0 = Date.now(); Date.now() - t0 < 6000 && peak < 0.005;) { await sleep(120); peak = Math.max(peak, await page.evaluate(() => { const L = window.__listen; if (!L.tap) return 0; const d = new Float32Array(L.tap.fftSize); L.tap.getFloatTimeDomainData(d); let e = 0; for (const v of d) e += v * v; return Math.sqrt(e / d.length); })); }
      const q = await page.evaluate(() => ({ playing: window.__listen.playing, error: window.__listen.error }));
      check(peak > 0.005 && q.playing === 'moor/sampled' && !q.error && errors.length === 0, `after the walk: a sketch plays under the worker (signal ${peak.toFixed(3)} rms, ${q.playing}; ${errors.length} failed requests or errors${errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''})`);
      await shot(page, 'worker-playing');
      await ctx.close();
    } finally { await srv.close(); }
  }
} finally { await browser.close(); }
console.log(fails ? `listen-test: ${fails} FAIL` : 'listen-test: all PASS');
process.exit(fails ? 1 : 0);
