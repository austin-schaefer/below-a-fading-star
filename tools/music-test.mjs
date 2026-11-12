#!/usr/bin/env node
// The music glue on the live walk (v9-M2, v9-M6). Usage: node tools/music-test.mjs [base]   (default http://localhost:8123)
// 0. the default (v9-M6: off, experimental): a walk with no setting stored and the director's clock sped up 60x for
//    10 s of audio clock (ten simulated minutes) fetches none of the music's modules but its glue, builds nothing,
//    plays nothing and leaves the bus untouched; the panel's row shows off, and the music's level and frequencies dimmed.
// 1. a walk with the director's clock sped up (?musicspeed=60): the first track is the moor, the director's own clock
//    at 60-150 s, started with the sun whole and no gutter due in 20 s (a gutter is made due in 8 s before the walk
//    begins, so the start must wait for it to pass); the bus ducks to silence in a gutter (held at 0.2) and returns;
//    the setting in the panel (persisted as fp-music, applied at once, off stops the director); the debug panel lists
//    the tracks (the nine of catalog.js, which index.js names without loading it).
// 2. ?music=moor and ?music=keep play that track 3 s after the walk begins and the director stays out of it;
//    ?music=0 plays nothing and loads nothing.
// 3. the three level sliders: each moves its own gains (ramped), persisted as fp-level-<kind>; at 100 all are 1.
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const fetched = [];
  page.on('request', (r) => { const m = r.url().match(/\/src\/audio\/music\/(.+?\.js)/); if (m) fetched.push(m[1]); });
  await page.goto(`${base}/?${query}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  if (pre) await page.evaluate(pre);
  await page.evaluate(() => { try { window.__fp.events.dispatchEvent(new Event('begin')); } catch (e) { /* pointer lock refuses headless */ } });
  return { page, errors, fetched };
}

// ---- 0. off by default: nothing of the music is built
{
  const { page, errors, fetched } = await open('q=low&musicspeed=60', () => { localStorage.removeItem('fp-music'); });
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__fp.audio?.music, null, { timeout: 30000 });
  const c0 = await page.evaluate(() => window.__fp.audio.ctx.currentTime);
  await page.waitForFunction((c0) => window.__fp.audio.ctx.currentTime > c0 + 10, c0, { timeout: 60000 });
  const s = await page.evaluate(() => { const m = window.__fp.audio.music; return { setting: m.setting, built: m.built, director: !!m.director, played: m.log.length, playing: m.playing, bus: m.bus.gain.value }; });
  check(s.setting === 'off' && !s.built && !s.director && s.played === 0 && s.playing === null && s.bus === 1, `off by default: ten simulated minutes walking, nothing built or played (${JSON.stringify(s)})`);
  check(fetched.join() === 'index.js', `only the glue fetched (${fetched.join(', ')})`);
  await page.evaluate(() => window.__fp.settings.open());
  const row = await page.evaluate(() => ({ btns: [...document.querySelectorAll('#set-music button')].map((b) => b.textContent + ':' + b.getAttribute('aria-pressed') + (b.classList.contains('set-dim') ? ':dim' : '')).join(), level: document.getElementById('set-level-music').closest('.set-part').classList.contains('set-dim'), label: document.querySelector('label[for=set-level-music]').textContent }));
  check(row.btns === 'off:true,rare:false:dim,default:false:dim,frequent:false:dim' && row.level && /experimental/.test(row.label), `the panel: off pressed, the level and frequencies dimmed, "${row.label}" (${row.btns})`);
  // turning it on loads and builds it, and the dimming goes
  await page.click('#set-music button[data-music=default]');
  await page.waitForFunction(() => window.__fp.audio.music.built, null, { timeout: 20000 });
  const on = await page.evaluate(() => ({ dir: window.__fp.audio.music.director.state.setting, dim: document.querySelectorAll('#settings-panel .set-dim').length, bus: window.__fp.audio.music.bus.gain.value, mix: window.__fp.audio.music.mix }));
  check(on.dir === 'default' && on.dim === 0 && on.bus === on.mix, `turned on: the director built at default, nothing dimmed, the bus at the mix (${JSON.stringify(on)})`);
  const names = await page.evaluate(async () => { const c = await import('./src/audio/music/catalog.js'); return [c.CATALOG.map((x) => x.name + ':' + x.pool).join(), window.__fp.audio.music.tracks.join()]; });
  check(names[0] === 'moor:moor,wood:wood,wet:wet,cold:cold,garden:garden,dry:dry,span:span,keep:keep,gates:gates' && names[1] === names[0].split(',').map((x) => x.split(':')[0]).join(), `the catalog's nine and the glue's names agree (${names[0]})`);
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await page.close();
}

// ---- 1. the director on the walk
{
  const { page, errors } = await open('q=low&musicspeed=60', () => { localStorage.setItem('fp-music', 'default'); window.__fp.sky.flicker.next = 40; });
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
  // (the sped-up director may end the track meanwhile; with nothing sounding Chromium stops rendering the bus and its
  // gain's value freezes, so the return is read from the duck the glue last sent it, music.duck)
  const lo = await page.evaluate(() => [window.__fp.audio.music.bus.gain.value / window.__fp.audio.music.mix, window.__fp.audio.music.duck]);
  await page.evaluate(() => { window.__fp.sky.flicker.hold = null; });
  await sleep(9000);
  const hi = await page.evaluate(() => window.__fp.audio.music.duck);
  check(lo[0] < 0.1 && lo[1] < 0.05, `the bus ducks in a gutter (gain ${lo[0].toFixed(3)} of the mix, duck ${lo[1].toFixed(3)})`);
  check(hi > 0.9, `and returns on its tail (duck ${hi.toFixed(3)})`);
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
  check(dbg.length === 9 && dbg.includes('music moor') && dbg.includes('music gates'), `the debug panel lists the nine tracks (${dbg.join(', ')})`);
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await page.close();
}

// ---- 2. ?music=
for (const [q, expect] of [['moor', true], ['keep', true], ['0', false]]) {
  const { page, errors, fetched } = await open(`q=low&only=audio&music=${q}`, () => { localStorage.setItem('fp-music', 'frequent'); });
  await sleep(1500);
  const early = await page.evaluate(() => window.__fp.audio?.music?.log.length ?? -1);
  await sleep(4500);
  const r = await page.evaluate(() => { const m = window.__fp.audio.music; return { log: m.log.slice(), playing: m.playing, mode: m.director ? m.director.state.setting : 'none' }; });
  const log = r.log;
  check(expect ? early === 0 && log.length === 1 && log[0].name === q && r.playing === q : log.length === 0 && fetched.join() === 'index.js', `?music=${q}: ${expect ? `nothing at 1.5 s, ${q} playing by 6 s whatever the setting` : 'nothing played or loaded'} (${log.length} played, playing ${r.playing}; the director is ${r.mode}; fetched ${fetched.join(' ')})`);
  check((expect ? r.mode === 'off' : r.mode === 'none') && errors.length === 0, `?music=${q}: the director is out of it, no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await page.close();
}

// ---- 3. the level sliders
{
  const { page, errors } = await open('q=low&only=audio', () => { for (const k of ['music', 'effects', 'ambience']) localStorage.removeItem('fp-level-' + k); });
  await page.waitForFunction(() => window.__fp.audio?.levelGains, null, { timeout: 30000 });
  const g = () => page.evaluate(() => { const L = window.__fp.audio.levelGains; return Object.fromEntries(Object.entries(L).map(([k, ns]) => [k, ns.map((n) => +n.gain.value.toFixed(3))])); });
  const g0 = await g();
  check(Object.values(g0).flat().every((v) => v === 1), `at 100 every level gain is 1, the mix as made (${JSON.stringify(g0)})`);
  await page.evaluate(() => window.__fp.settings.open());
  await page.locator('#set-level-effects').fill('50');
  await page.locator('#set-level-ambience').fill('20');
  await page.locator('#set-level-music').fill('0');
  await sleep(300);
  const g1 = await g();
  const ls = await page.evaluate(() => ['music', 'effects', 'ambience'].map((k) => localStorage.getItem('fp-level-' + k)).join());
  check(g1.effects.every((v) => Math.abs(v - 0.25) < 0.01) && g1.ambience.every((v) => Math.abs(v - 0.04) < 0.01) && g1.music.every((v) => v < 0.001), `each slider moves its own gains with the volume's taper (50 -> 0.25, 20 -> 0.04, 0 -> 0: ${JSON.stringify(g1)})`);
  check(ls === '0,0.5,0.2', `persisted (${ls})`);
  check(await page.evaluate(() => document.querySelector('#set-level-effects + output').textContent) === '50', 'the readout follows');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  await page.evaluate(() => window.__fp.events.dispatchEvent(new Event('begin')));
  await page.waitForFunction(() => window.__fp.audio?.levelGains, null, { timeout: 30000 });
  await page.evaluate(() => window.__fp.settings.open());
  const back = await page.evaluate(() => [window.__fp.audio.levels.effects, window.__fp.audio.levelGains.ambience[1].gain.value.toFixed(3), document.getElementById('set-level-music').value]);
  check(back.join() === '0.5,0.040,0', `and restored on the next visit (${back.join(' ')})`);
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await page.close();
}
await browser.close();
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
