#!/usr/bin/env node
// The settings panel (v7-08): the gear, open and close, volume, mute, quality, mouse capture and teleport, on a
// desktop viewport; then the gear and a finger-sized panel on a phone. Usage: node tools/settings-test.mjs [url]
// SHOTS=1 also writes shots/wip/settings-01-desktop.png (1280x720, panel open) and settings-01-touch.png (390x844);
// SHOTS_TAG=v9-M6 names them v9-M6-desktop.png and v9-M6-touch.png.
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low&shadows=0&bloom=0';
const shots = process.env.SHOTS === '1', shotTag = process.env.SHOTS_TAG || 'settings-01';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const checks = [];
const check = (name, ok, info) => { checks.push([name, !!ok]); if (!ok && info !== undefined) console.log('  ', name, JSON.stringify(info)); };
async function open(opts) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp.settings, null, { timeout: 300000 });
  await page.evaluate(() => { for (const k of ['fp-muted', 'fp-volume', 'fp-draglook']) localStorage.removeItem(k); window.__fp.events.dispatchEvent(new CustomEvent('begin')); });
  await page.waitForTimeout(1500);
  return { context, page };
}
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; }, sel);
const hit = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const shown = (page) => page.evaluate(() => document.getElementById('settings').classList.contains('shown'));

// ---- desktop
{
  const { context, page } = await open({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const g = await rect(page, '#gear');
  check('gear: visible, in the corner', g && g.w > 0 && g.r <= 1280 && g.t >= 0 && g.l > 1200 && g.t < 40, g);
  check('gear: panel starts closed', !(await shown(page)));

  await page.click('#gear');
  check('open: the gear opens the panel', await shown(page));
  check('open: aria-expanded', (await page.getAttribute('#gear', 'aria-expanded')) === 'true');
  check('open: pointer lock released', await page.evaluate(() => !document.pointerLockElement && !window.__fp.player.locked));
  if (shots) await page.screenshot({ path: `shots/wip/${shotTag}-desktop.png` });
  await page.click('#set-close');
  check('close: the Close button', !(await shown(page)));
  await page.click('#gear'); await page.click('#gear');
  check('close: the gear again', !(await shown(page)));
  await page.click('#gear'); await page.keyboard.press('Escape');
  check('close: Escape', !(await shown(page)));
  // Escape in drag-look mode closes the panel and does not also toggle the pause card
  const pausedBefore = await page.evaluate(() => { window.__fp.controls.setDragLook(true); return !document.getElementById('card').classList.contains('hidden'); });
  await page.click('#gear'); await page.keyboard.press('Escape');
  check('close: Escape in drag-look mode does not pause', !pausedBefore && !(await shown(page)) && await page.evaluate(() => document.getElementById('card').classList.contains('hidden')), pausedBefore);
  await page.evaluate(() => window.__fp.controls.setDragLook(false));

  // volume and mute, on the output gain after the mute gain
  await page.click('#gear');
  const gain = () => page.evaluate(() => ({ vol: window.__fp.audio.vol.gain.value, mute: window.__fp.audio.mute.gain.value, muted: window.__fp.audio.muted, volume: window.__fp.audio.volume }));
  const setVol = async (v) => { await page.locator('#set-volume').fill(String(v)); await page.waitForTimeout(400); };
  await setVol(40);
  let a = await gain();
  check('volume: 40 gives gain 0.16', Math.abs(a.vol - 0.16) < 0.02 && a.volume === 0.4, a);
  check('volume: the readout follows', (await page.textContent('#set-volume-out')) === '40');
  check('volume: remembered in localStorage', (await page.evaluate(() => localStorage.getItem('fp-volume'))) === '0.4');
  await setVol(0);
  a = await gain();
  check('volume: 0 is silent', a.vol < 0.005, a);
  await setVol(100);
  a = await gain();
  check('volume: 100 is the mix level (gain 1)', Math.abs(a.vol - 1) < 0.02, a);
  await setVol(60);
  await page.click('#set-mute'); await page.waitForTimeout(400);
  a = await gain();
  const pressed = await page.evaluate(() => [document.getElementById('set-mute').getAttribute('aria-pressed'), document.getElementById('mute').getAttribute('aria-pressed')]);
  check('mute: silences the output, keeps the slider', a.muted && a.mute < 0.01 && a.volume === 0.6 && (await page.inputValue('#set-volume')) === '60', a);
  check('mute: the speaker button shows the same state', pressed[0] === 'true' && pressed[1] === 'true', pressed);
  await page.evaluate(() => window.__fp.audio.setMuted(false)); // from the speaker's side
  check('mute: the toggle follows the speaker button', (await page.getAttribute('#set-mute', 'aria-pressed')) === 'false');
  await page.click('#set-mute'); await page.waitForTimeout(100); await page.click('#set-mute'); await page.waitForTimeout(400);
  a = await gain();
  check('mute: unmute restores the level', !a.muted && a.mute > 0.99 && Math.abs(a.vol - 0.36) < 0.02, a);

  // keys typed in the panel are the panel's: the arrows move the slider, not the player
  const p0 = await page.evaluate(() => ({ x: window.__fp.player.pos.x, z: window.__fp.player.pos.z, enabled: window.__fp.player.enabled }));
  await page.focus('#set-volume');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');
  const p1 = await page.evaluate(() => ({ x: window.__fp.player.pos.x, z: window.__fp.player.pos.z }));
  check('keys: arrows in the panel do not walk', p0.enabled && Math.hypot(p1.x - p0.x, p1.z - p0.z) < 0.01, { p0, p1 });

  // mouse capture
  await page.click('[data-capture="drag"]');
  let c = await page.evaluate(() => ({ drag: window.__fp.player.dragLook, ls: localStorage.getItem('fp-draglook'), pressed: document.querySelector('[data-capture="drag"]').getAttribute('aria-pressed') }));
  check('capture: drag to look switches the mode on', c.drag && c.ls === '1' && c.pressed === 'true', c);
  await page.click('[data-capture="lock"]');
  c = await page.evaluate(() => ({ drag: window.__fp.player.dragLook, failed: window.__fp.player.lockFailed, ls: localStorage.getItem('fp-draglook'), pressed: document.querySelector('[data-capture="lock"]').getAttribute('aria-pressed') }));
  check('capture: capture on click switches it back', !c.drag && !c.failed && c.ls === '0' && c.pressed === 'true', c);

  // quality: the URL
  await page.evaluate(() => { window.__nav = null; window.__fp.settings.navigate = (u) => { window.__nav = u; }; });
  const q = await page.evaluate(() => ({ tier: window.__fp.quality, marked: [...document.querySelectorAll('#set-quality button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.tier) }));
  check('quality: the current tier is marked', q.marked.length === 1 && q.marked[0] === q.tier, q);
  await page.click('#set-quality [data-tier="low"]');
  check('quality: choosing the current tier does nothing', (await page.evaluate(() => window.__nav)) === null);
  await page.click('#set-quality [data-tier="high"]');
  const nav = await page.evaluate(() => ({ nav: window.__nav, x: window.__fp.player.pos.x, z: window.__fp.player.pos.z, yaw: window.__fp.player.yaw }));
  const nu = nav.nav && new URL(nav.nav);
  const [nx, nz] = nu ? nu.searchParams.get('pos').split(',').map(Number) : [NaN, NaN];
  check('quality: writes ?q=high', nu && nu.searchParams.get('q') === 'high' && !nu.searchParams.has('tier'), nav.nav);
  check('quality: carries pos and yaw', nu && Math.abs(nx - nav.x) < 0.06 && Math.abs(nz - nav.z) < 0.06 && Math.abs(Number(nu.searchParams.get('yaw')) - nav.yaw) < 0.001, nav);
  check('quality: keeps the other params', nu && nu.searchParams.get('shadows') === '0' && nu.searchParams.get('bloom') === '0', nav.nav);

  // teleport: every place, within 1 m of its stand point, on the ground, facing, no cue, panel closed
  const n = await page.evaluate(() => window.__fp.settings.places.length);
  check('teleport: the whole map (spawn, every named landmark, the three region cards, the Taker standing for the Adust, the eighteen living, the eight story ends)', n === 1 + (await page.evaluate(() => Object.values(window.__fp.landmarks).filter((L) => L.name).length)) + 3 + 18 - 1 + 8, n);
  check('teleport: Places, The living and Stories headings', await page.evaluate(() => [...document.querySelectorAll('#set-places h4')].map((h) => h.textContent).join('|')) === 'Places|The living|Stories');
  check('teleport: a button for each place', await page.evaluate(() => document.querySelectorAll('#set-places button').length) === n);
  let allNear = true, allClosed = true, allGround = true, noCue = true, facing = true;
  const detail = [];
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate((i) => {
      const fp = window.__fp, pl = fp.settings.places[i];
      if (!fp.settings.shown) fp.settings.open();
      let cues = 0; const orig = fp.audio.cue; fp.audio.cue = (...a) => { cues++; return orig.apply(fp.audio, a); };
      document.querySelectorAll('#set-places button')[i].click();
      fp.audio.cue = orig; // restored in the same task: the click handler is synchronous
      const p = fp.player, T = fp.terrain;
      const sa = 160 * Math.PI / 180, sun = { x: Math.cos(sa), z: Math.sin(sa) }; // SUN.azimuth: from +x toward +z
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      if (pl.pitch !== undefined && Math.abs(p.pitch - pl.pitch) > 1e-6) return { name: pl.name, d: 99, above: 2, closed: true, cues: 0, dot: 1, pitchBad: true };
      const tx = pl.look === 'sun' ? sun.x : pl.look ? pl.look.x - p.pos.x : Math.sin(pl.yaw) * -1;
      const tz = pl.look === 'sun' ? sun.z : pl.look ? pl.look.z - p.pos.z : Math.cos(pl.yaw) * -1;
      const l = Math.hypot(tx, tz) || 1;
      const wl = T.waterLevelAt(p.pos.x, p.pos.z), inCol = fp.player.colliders.some((c) => Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r + 0.3 && !(c.h !== undefined && c.y + c.h < Math.max(T.heightAt(p.pos.x, p.pos.z), p.pos.y - p.eye - 0.1))); // (a collider under the deck is not one you stand in)
      return { name: pl.name, q: fp.quality, wet: wl !== null && wl - T.heightAt(p.pos.x, p.pos.z) > 1.15, inCol, d: Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z), above: p.pos.y - (fp.span?.deckAt(p.pos.x, p.pos.z) ?? T.heightAt(p.pos.x, p.pos.z)) /* v8-04: a story end on the deck */, closed: !fp.settings.shown, cues, dot: (fx * tx + fz * tz) / l, pitch: p.pitch };
    }, i);
    detail.push(r);
    if (r.d > 1) allNear = false;
    if (!r.closed) allClosed = false;
    if (r.above < 1.5 || r.above > 2.5) allGround = false;
    if (r.cues) noCue = false;
    if (r.dot < 0.999) facing = false;
  }
  const bad = detail.filter((r) => r.wet || r.inCol || r.d > 1 || !r.closed || r.above < 1.5 || r.above > 2.5 || r.cues || r.dot < 0.999);
  check('teleport: none inside a collider or under water', detail.every((r) => !r.wet && !r.inCol), bad);
  check('teleport: all land within 1 m of their stand point', allNear, bad);
  check('teleport: eye on the ground (heightAt + eye)', allGround, bad);
  check('teleport: each faces its thing (or the sun)', facing, bad);
  check('teleport: closes the panel', allClosed, bad);
  check('teleport: fires no cue', noCue, bad);

  // coordinates: the panel's line (4 Hz, only while open) and the optional always-on readout
  await page.evaluate(() => { const p = window.__fp.player; p.pos.x = 12.4; p.pos.z = -33.6; p.yaw = -Math.PI / 2; });
  await page.evaluate(() => window.__fp.settings.open()); await page.waitForTimeout(600);
  check('coords: the panel shows x, z and facing', (await page.textContent('#set-pos')) === 'x 12  z \u221234  facing E', await page.textContent('#set-pos'));
  await page.evaluate(() => { window.__fp.player.pos.x = 40; window.__fp.player.yaw = 0; }); await page.waitForTimeout(600);
  check('coords: it follows at 4 Hz', (await page.textContent('#set-pos')).startsWith('x 40') && (await page.textContent('#set-pos')).endsWith('facing N'));
  const dirs = await page.evaluate(async () => { const m = await import('./src/settings.js'); return [0, -Math.PI / 4, -Math.PI / 2, Math.PI, Math.PI / 2, 3 * Math.PI / 4].map((y) => m.facing(y)).join(); });
  check('coords: yaw 0 is N, -pi/2 E, pi S... (NE, E, S, W, SW)', dirs === 'N,NE,E,S,W,SW', dirs);
  await page.evaluate(() => window.__fp.settings.close()); await page.waitForTimeout(100);
  await page.evaluate(() => { document.getElementById('set-pos').textContent = 'stale'; window.__fp.player.pos.x = 90; }); await page.waitForTimeout(600);
  check('coords: nothing updates while closed', (await page.textContent('#set-pos')) === 'stale' && !(await page.evaluate(() => document.getElementById('posline').classList.contains('shown'))));
  await page.evaluate(() => window.__fp.settings.open());
  await page.click('#set-showpos'); await page.waitForTimeout(600);
  check('coords: Show position puts the line bottom-left and remembers it', await page.evaluate(() => { const e = document.getElementById('posline'), r = e.getBoundingClientRect(); return e.classList.contains('shown') && r.left < 40 && r.bottom > 690 && /^x 90/.test(e.textContent) && localStorage.getItem('fp-showpos') === '1'; }));
  await page.click('#set-showpos');
  check('coords: and off again, off by default', await page.evaluate(() => !document.getElementById('posline').classList.contains('shown') && localStorage.getItem('fp-showpos') === '0'));
  await page.evaluate(() => window.__fp.settings.close());

  // the debug panel survives a teleport from either panel, and the quality reload keeps every parameter
  await page.evaluate(() => { window.__fp.debug.toggle(true); window.__fp.settings.open(); });
  await page.locator('#set-places button').nth(3).click();
  check('debug: stays shown through a teleport from the settings panel', await page.evaluate(() => window.__fp.debug.shown && document.getElementById('dbg').classList.contains('shown')));
  await page.evaluate(() => window.__fp.debug.teleport('castle'));
  check('debug: stays shown through its own teleport', await page.evaluate(() => window.__fp.debug.shown));
  await page.evaluate(() => window.__fp.debug.teleport('bridge'));
  check('debug: stays shown through the Span teleport', await page.evaluate(() => window.__fp.debug.shown));
  await page.evaluate(() => { window.__nav = null; window.__fp.settings.navigate = (u) => { window.__nav = u; }; });
  await page.click('#gear'); await page.click('#set-quality [data-tier="high"]');
  const nu2 = new URL(await page.evaluate(() => window.__nav));
  check('quality: carries the debug panel and every parameter', nu2.searchParams.get('debug') === '1' && nu2.searchParams.get('shadows') === '0' && nu2.searchParams.get('bloom') === '0' && nu2.searchParams.get('q') === 'high', nu2.href);
  await page.evaluate(() => { window.__fp.debug.toggle(false); window.__fp.settings.close(); });
  await context.close();
}

// ---- region cards (v7.1): the bottom-of-screen card for the Adust, the Lynchets and Kenching Flats, and Medlar Close beating the Bletting
{
  const { context, page } = await open({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  for (const [x, z, want] of [[-275, -15, 'The Taker of Altitudes'], [130, -60, 'Medlar Close'], [-195, -113, 'The Lynchets'], [60, 250, 'Kenching Flats'], [55, 274, 'Rest in Starlight'], [185, -70, 'Sleeper\u2019s Orchard'], [195, -100, 'Sleeper\u2019s Orchard'], [200, 185, 'The Pit']]) {
    await page.evaluate(([x, z]) => { const p = window.__fp.player; p.pos.set(x, window.__fp.terrain.heightAt(x, z) + p.eye, z); window.__fp.hud.update(0.1); }, [x, z]);
    const got = await page.textContent('#place-name');
    check(`cards: (${x}, ${z}) shows ${want}`, got === want, got);
  }
  await page.evaluate(() => { const p = window.__fp.player; p.pos.set(128, window.__fp.terrain.heightAt(128, 5) + p.eye, 5); window.__fp.hud.update(0.1); });
  const lee = await page.evaluate(() => { const l = document.getElementById('place-line'); return { name: document.getElementById('place-name').textContent, lines: Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight)), text: l.textContent }; });
  check('cards: (128, 5) A Lamplighter\u2019s Standards, the line on two lines', lee.name === 'A Lamplighter\u2019s Standards' && lee.lines === 2 && lee.text.includes('\n'), lee);
  await context.close();
}

// ---- idle cap and the pause card, on a desktop viewport
{
  const { context, page } = await open({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.evaluate(() => window.__fp.settings.open()); await page.waitForTimeout(800);
  const o = await page.evaluate(() => ({ idle: window.__fp.pacing.idle, hidden: document.getElementById('card').classList.contains('hidden') }));
  check('panel: opening it does not raise the pause card or idle the frame', o.hidden && o.idle === false, o);
  await page.evaluate(() => window.__fp.settings.close());
  const t = await page.evaluate(() => {
    const fp = window.__fp, P = fp.pacing; let r = {};
    const hf = document.hasFocus; document.hasFocus = () => true;
    window.dispatchEvent(new Event('blur'));
    r.focusedAfterBlur = P.targetFps(performance.now() + 60000) === P.cap && !P.idle;
    document.hasFocus = () => false;
    const t0 = performance.now(); P.targetFps(t0);
    r.unfocused = P.targetFps(t0 + 3500) === 10 && P.idle;
    fp.player.keys.add('KeyW');
    r.keyDown = P.targetFps(t0 + 3600) === P.cap && !P.idle;
    fp.player.keys.delete('KeyW');
    r.idleAgain = P.targetFps(t0 + 3700) === 10;
    document.hasFocus = () => true;
    r.refocused = P.targetFps(t0 + 3800) === P.cap;
    document.hasFocus = hf;
    fp.hud.setFps(60); r.label = document.getElementById('fps').textContent;
    return r;
  });
  check('idle: a synthetic blur while hasFocus() is true keeps the cap', t.focusedAfterBlur, t);
  check('idle: unfocused 3 s drops to 10, a key held does not, refocus restores', t.unfocused && t.keyDown && t.idleAgain && t.refocused, t);
  await context.close();
}

// ---- phone
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const g = await rect(page, '#gear'), s = await rect(page, '#stick'), j = await rect(page, '#jump'), m = await rect(page, '#mute');
  check('touch: gear visible', g && g.w > 0 && g.r <= 390 && g.t >= 0 && g.t < 40, g);
  check('touch: gear clear of the stick, hop ring and speaker', !hit(g, s) && !hit(g, j) && !hit(g, m), { g, s, j, m });
  await page.touchscreen.tap(g.l + g.w / 2, g.t + g.h / 2);
  check('touch: a tap opens the panel', await shown(page));
  if (shots) await page.screenshot({ path: `shots/wip/${shotTag}-touch.png` });
  const sizes = await page.evaluate(() => [...document.querySelectorAll('#settings-panel button, #settings-panel input[type=range]')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().height));
  check('touch: rows are finger-sized (44 px or more)', sizes.length > 10 && sizes.every((h) => h >= 43.9), sizes.filter((h) => h < 43.9));
  check('touch: no mouse row', await page.evaluate(() => getComputedStyle(document.getElementById('set-capture')).display === 'none'));
  const y0 = await page.evaluate(() => window.__fp.player.yaw);
  await page.touchscreen.tap(8, 400);
  const t1 = await page.evaluate(() => ({ yaw: window.__fp.player.yaw, move: window.__fp.controls.touch.moveId, look: window.__fp.controls.touch.lookId }));
  check('touch: the scrim keeps taps off the canvas', await shown(page) && t1.yaw === y0 && t1.move === null && t1.look === null, t1);
  await page.locator('#set-places button').nth(5).tap();
  const near = await page.evaluate(() => { const pl = window.__fp.settings.places[5], p = window.__fp.player.pos; return Math.hypot(p.x - pl.x, p.z - pl.z); });
  check('touch: a tap on a place teleports and closes', !(await shown(page)) && near < 1, near);
  await page.touchscreen.tap(g.l + g.w / 2, g.t + g.h / 2);
  await page.locator('#set-close').tap();
  check('touch: Close closes', !(await shown(page)));
  await context.close();
}
await browser.close();

check('no page errors', errors.length === 0, errors.slice(0, 3));
const pass = checks.filter(([, ok]) => ok).length;
for (const [name, ok] of checks) console.log((ok ? 'PASS ' : 'FAIL ') + name);
console.log(`${pass}/${checks.length} passed`);
process.exit(pass === checks.length ? 0 : 1);
