#!/usr/bin/env node
// The settings panel (v7-08), which is also the pause (v14-B1): the gear, open and close, Escape, volume, mute, quality, mouse capture and the map's marks (v17.1), on a
// desktop viewport; then the gear and a finger-sized panel on a phone, and (v13) its Measure row's reload. Usage: node tools/settings-test.mjs [url]
// SHOTS=1 also writes shots/wip/settings-01-desktop.png (1280x720, panel open) and settings-01-touch.png (390x844);
// SHOTS_TAG=v9-M6 names them v9-M6-desktop.png and v9-M6-touch.png.
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low&shadows=0&bloom=0';
const shots = process.env.SHOTS === '1', shotTag = process.env.SHOTS_TAG || 'settings-01';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
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
  // v17.1-Q1 (#70): nothing fetched or built for the map until the panel first opens
  const fetchedMap = () => page.evaluate(() => performance.getEntriesByType('resource').some((e) => /\/v17_1\/map\.js/.test(e.name)));
  const pre = { fetched: await fetchedMap(), built: await page.evaluate(() => document.getElementById('set-places').childElementCount) };
  check('map: nothing fetched or built for it before the panel first opens', !pre.fetched && pre.built === 0, pre);

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
  // v14-B1 (#46): Escape opens the one panel (the pause is the settings panel): in drag-look mode the key itself, with the
  // mouse captured the capture let go (what the browser does on Escape); never the old paused card. Escape again shuts it
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  let esc = await page.evaluate(() => ({ panel: window.__fp.settings.shown, card: !document.getElementById('card').classList.contains('hidden') }));
  check('pause: Escape in drag-look mode opens the settings panel, and no paused card', esc.panel && !esc.card, esc);
  await page.waitForTimeout(400); await page.keyboard.press('Escape');
  check('pause: Escape again shuts it', !(await shown(page)));
  await page.evaluate(() => window.__fp.controls.setDragLook(false));
  await page.evaluate(() => { const P = window.__fp.player; P.everLocked = true; window.__fp.events.dispatchEvent(new CustomEvent('lock', { detail: false })); });
  esc = await page.evaluate(() => ({ panel: window.__fp.settings.shown, card: !document.getElementById('card').classList.contains('hidden'), keys: !!document.querySelector('#settings-panel .set-keys')?.offsetParent, back: document.getElementById('set-close').textContent }));
  check('pause: the mouse let go (Escape) opens the settings panel, with the keys and "Back to the moor", and no paused card', esc.panel && !esc.card && esc.keys && esc.back === 'Back to the moor', esc);
  await page.keyboard.press('Escape'); // within a moment of opening: the same Escape, not a second one
  check('pause: the Escape that opened it does not also shut it', await shown(page));
  await page.click('#set-close');
  check('pause: "Back to the moor" shuts it', !(await shown(page)));
  // a key held as Escape is pressed is let go inside the panel: the walker stops, and nothing is still held after it shuts
  await page.evaluate(() => { const fp = window.__fp, s = fp.settings.places[0]; fp.controls.placeAt(s.x, s.z); });
  await page.keyboard.down('KeyW'); await page.waitForTimeout(400);
  await page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('lock', { detail: false })));
  const held0 = await page.evaluate(() => { const q = window.__fp.player.pos; return [q.x, q.z]; });
  await page.keyboard.up('KeyW'); await page.waitForTimeout(600);
  const held1 = await page.evaluate(() => { const q = window.__fp.player.pos; return [q.x, q.z]; });
  await page.click('#set-close'); await page.waitForTimeout(800);
  const held2 = await page.evaluate(() => { const q = window.__fp.player.pos; return { p: [q.x, q.z], keys: [...window.__fp.player.keys] }; });
  const mv = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  check('pause: W held through Escape and let go in the panel: the walker stands still in it and after it, no key held', mv(held0, held1) < 0.05 && mv(held1, held2.p) < 0.05 && held2.keys.length === 0, { held0, held1, held2 });

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

  // v17.1-Q1 (#70): the panel's places are a drawn map: seventeen marks or fewer, each a stand from PLACES (the whole list
  // stays for the debug panel and the tools) with a plain line and its name; the rows below check every mark's stand
  // as they checked every entry of the old list
  await page.evaluate(() => window.__fp.settings.open());
  const mapInfo = await page.evaluate(async () => {
    const S = window.__fp.settings, map = await S.mapReady(), c = document.querySelector('#set-places canvas');
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0, sum = 0;
    for (let i = 0; i < px.length; i += 4 * 97) { const v = px[i] + px[i + 1] + px[i + 2]; sum++; if (v > 60) lit++; }
    return { n: S.marks.length, ms: map.ms, inPlaces: S.marks.every((m) => S.places.includes(m.place)), lines: S.marks.map((m) => m.line), names: S.marks.map((m) => m.name), buttons: document.querySelectorAll('#set-places .map-mark').length, w: c.width, lit: +(lit / sum).toFixed(2), fetched: performance.getEntriesByType('resource').some((e) => /\/v17_1\/map\.js/.test(e.name)) };
  });
  const n = mapInfo.n;
  check(`map: fetched and drawn on the first open (${mapInfo.ms} ms), a chart with something on it`, mapInfo.fetched && mapInfo.w >= 400 && mapInfo.lit > 0.5, mapInfo);
  check('map: seventeen marks (twelve at the least), each a button, each a stand in the whole list (PLACES)', n >= 12 && n <= 17 && n === (await page.evaluate(async () => (await import('./src/v17_1/map.js')).MARKS.length)) && mapInfo.buttons === n && mapInfo.inPlaces, mapInfo);
  check('map: each mark has a plain line (short, not a quotation) and a name', mapInfo.lines.every((l) => l.length >= 12 && l.length <= 64 && !/[\u201c\u201d"]/.test(l)) && new Set(mapInfo.names).size === n, mapInfo.lines);
  check('map: the whole list (PLACES) still holds every place, the cut ones too (the Bitter End, the Long Wait, the living, the story ends)', await page.evaluate(() => { const P = window.__fp.settings.places; return P.length > 70 && ['The Bitter End', 'The Long Wait', 'The Hanging Croft'].every((k) => P.some((p) => p.name === k)) && P.filter((p) => p.group === 'Stories').length === 8 && P.filter((p) => p.group === 'The living').length === 17; }));
  // the mouse: pointing at a mark says what it is, its name second; leaving it puts the line back
  {
    const m = await page.evaluate(() => { const k = window.__fp.settings.marks.find((q) => q.name === 'The Swallow'), r = k.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, line: k.line }; });
    await page.mouse.move(m.x, m.y); await page.waitForTimeout(150);
    const say = await page.evaluate(() => ({ line: document.querySelector('.map-line').textContent, name: document.querySelector('.map-name').textContent }));
    await page.mouse.move(5, 5); await page.waitForTimeout(150);
    const off = await page.evaluate(() => document.querySelector('.map-name').textContent);
    check('map: the mouse on a mark says its plain line, then its name; off it, not', say.line.toLowerCase().startsWith(m.line.slice(0, 12).toLowerCase()) && say.name === 'The Swallow' && off === '', { say, off });
  }
  // the player's mark: where they stand on the chart
  {
    const y = await page.evaluate(() => { const fp = window.__fp, you = document.querySelector('.map-you'), f = document.querySelector('.map-frame').getBoundingClientRect(), r = you.getBoundingClientRect(); return { u: (r.left - f.left) / f.width, v: (r.top - f.top) / f.height, x: fp.player.pos.x, z: fp.player.pos.z }; });
    check('map: "you are here" sits where the walker stands', Math.abs(y.u - (y.x + 370) / 740) < 0.02 && Math.abs(y.v - (y.z + 355) / 740) < 0.02, y);
  }
  // the keyboard: a mark focused, an arrow moves to the nearest mark that way, Enter goes there
  {
    const k = await page.evaluate(() => { const S = window.__fp.settings, m = S.marks.find((q) => q.name === 'Carcanet Keep'); m.el.focus(); return { x: m.px, y: m.py }; });
    await page.keyboard.press('ArrowUp');
    const up = await page.evaluate(() => { const S = window.__fp.settings, m = S.marks.find((q) => q.el === document.activeElement); return m && { name: m.name, x: m.px, y: m.py, say: document.querySelector('.map-name').textContent }; });
    await page.keyboard.press('ArrowLeft');
    const left = await page.evaluate(() => { const m = window.__fp.settings.marks.find((q) => q.el === document.activeElement); return m && { name: m.name, x: m.px, y: m.py }; });
    check('keys: on the map an arrow moves to the nearest mark that way, and the line says it', up && up.y < k.y && up.say === up.name && left && left.x < up.x, { k, up, left });
    await page.keyboard.press('Enter');
    const went = await page.evaluate((name) => { const fp = window.__fp, pl = fp.settings.places.find((p) => p.name === name), p = fp.player.pos; return { shut: !fp.settings.shown, d: Math.hypot(p.x - pl.x, p.z - pl.z) }; }, left?.name);
    check('keys: Enter on a mark goes there and shuts the panel', went.shut && went.d < 1, went);
  }
  // the panel's focus api (for a gamepad): focusNext(dx, dy) moves by direction, on a slider dx steps it, activate() does it
  {
    const r = await page.evaluate(() => {
      const S = window.__fp.settings; S.open();
      const out = {};
      out.first = S.focusNext(0, 1) && !!S.marks.find((m) => m.el === S.focused());
      const a = S.focused(); out.moved = S.focusNext(1, 0) && S.focused() !== a && !!S.marks.find((m) => m.el === S.focused());
      document.getElementById('set-volume').focus(); const v0 = +document.getElementById('set-volume').value;
      S.focusNext(-1, 0); out.slider = +document.getElementById('set-volume').value < v0 && window.__fp.audio.volume < v0 / 100 + 1e-6;
      S.focusNext(0, 1); out.down = S.focused() && S.focused().id !== 'set-volume';
      const pl = S.marks[2]; pl.el.focus(); out.act = S.activate();
      const p = window.__fp.player.pos; out.d = Math.hypot(p.x - pl.place.x, p.z - pl.place.z); out.shut = !S.shown;
      S.open(); out.back = S.back() && !S.shown;
      return out;
    });
    check('api: focusNext(dx, dy) moves among the marks and the controls, steps a slider; activate() goes; back() shuts', r.first && r.moved && r.slider && r.down && r.act && r.d < 1 && r.shut && r.back, r);
    await page.evaluate(() => window.__fp.audio.setVolume(0.6));
  }
  // (round two) a slider at its end stop: a further press sideways moves focus on; moving up from a narrow button onto a
  // wide slider above it is not skipped; a touch press cancelled by a scroll leaves the next Enter a key's (it goes)
  {
    const r = await page.evaluate(() => {
      const S = window.__fp.settings, out = {}; S.open();
      const v = document.getElementById('set-level-ambience'); v.value = v.max; v.dispatchEvent(new Event('input', { bubbles: true })); v.focus();
      out.endStop = S.focusNext(1, 0) && S.focused() !== v && +v.value === +v.max;
      document.querySelector('#set-music button').focus(); S.focusNext(0, -1); out.up = S.focused()?.id;
      return out;
    });
    check('focus: past a slider\'s end stop a sideways press moves focus on; up from the music buttons reaches the music slider', r.endStop && r.up === 'set-level-music', r);
    const pre = await page.evaluate(() => { const S = window.__fp.settings, m = S.marks[4]; m.el.focus(); m.el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })); m.el.dispatchEvent(new PointerEvent('pointercancel', { pointerType: 'touch', bubbles: true })); return m.name; });
    await page.keyboard.press('Enter');
    const went = await page.evaluate(() => { const fp = window.__fp, pl = fp.settings.marks[4].place, p = fp.player.pos; return { shut: !fp.settings.shown, d: Math.hypot(p.x - pl.x, p.z - pl.z) }; });
    check('touch: a press on a mark cancelled by a scroll, then Enter: it goes (the stale touch is forgotten)', went.shut && went.d < 1, { pre, went });
    // off the chart (the lift's gallery, 135 m up on the west wall) "you are here" is an arrow on the edge, pointing out
    const off = await page.evaluate(() => { const fp = window.__fp; fp.controls.placeAt(-377, -50, 135.2); fp.settings.open(); return new Promise((res) => setTimeout(() => { const y = document.querySelector('.map-you'), f = document.querySelector('.map-frame').getBoundingClientRect(), r = y.getBoundingClientRect(); res({ off: y.classList.contains('map-you-off'), u: +((r.left - f.left) / f.width).toFixed(3), x: fp.player.pos.x }); }, 400)); });
    check('map: off the chart "you are here" is an arrow at the edge pointing out', off.off && off.u < 0.05, off);
    await page.evaluate(() => { window.__fp.settings.close(); window.__fp.controls.placeAt(2, 35); });
  }
  let allNear = true, allClosed = true, allGround = true, noCue = true, facing = true;
  const detail = [];
  // every stand in PLACES (the map's seventeen by a click on their mark, the rest by settings.teleport, as cards-walk, perf and the tools go)
  const nAll = await page.evaluate(() => window.__fp.settings.places.length);
  for (let i = 0; i < nAll; i++) {
    const r = await page.evaluate((i) => {
      const fp = window.__fp, pl = fp.settings.places[i], mk = fp.settings.marks.find((m) => m.place === pl);
      if (!fp.settings.shown) fp.settings.open();
      let cues = 0; const orig = fp.audio.cue; fp.audio.cue = (...a) => { cues++; return orig.apply(fp.audio, a); };
      if (pl.thread && !fp.threads?.[pl.thread]) return null; // a story's end only when its thread was built
      if (mk) mk.el.click(); else fp.settings.teleport(i); // a click on a mark (no touch): goes
      fp.audio.cue = orig; // restored in the same task: the click handler is synchronous
      const p = fp.player, T = fp.terrain;
      const sa = 160 * Math.PI / 180, sun = { x: Math.cos(sa), z: Math.sin(sa) }; // SUN.azimuth: from +x toward +z
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      if (pl.pitch !== undefined && Math.abs(p.pitch - pl.pitch) > 1e-6) return { name: pl.name, d: 99, above: 2, closed: true, cues: 0, dot: 1, pitchBad: true };
      const tx = pl.look === 'sun' ? sun.x : pl.look ? pl.look.x - p.pos.x : Math.sin(pl.yaw) * -1;
      const tz = pl.look === 'sun' ? sun.z : pl.look ? pl.look.z - p.pos.z : Math.cos(pl.yaw) * -1;
      const l = Math.hypot(tx, tz) || 1;
      const wl = T.waterLevelAt(p.pos.x, p.pos.z), inCol = fp.player.colliders.some((c) => Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r + 0.3 && !(c.h !== undefined && c.y + c.h < Math.max(T.heightAt(p.pos.x, p.pos.z), p.pos.y - p.eye - 0.1))); // (a collider under the deck is not one you stand in)
      // v11-F2: never stand in a hole: the mean of the ground in a 30 m ring against the ground underfoot (the Pit's old entry stood 29 m down)
      let ring = 0; for (let k = 0; k < 16; k++) ring += T.heightAt(p.pos.x + 30 * Math.cos(k * Math.PI / 8), p.pos.z + 30 * Math.sin(k * Math.PI / 8)); const basin = ring / 16 - T.heightAt(p.pos.x, p.pos.z);
      const under = pl.y !== undefined && (pl.y < T.heightAt(p.pos.x, p.pos.z) - 3 || pl.name === 'The Nadir'); // v14-D0: a stand under the ground (the Noon Road) is measured from its own floor; v14-D2: so is the Nadir's, on the Pit's bowl, a little under the old ground
      return { name: pl.name, under, basin: +basin.toFixed(2), q: fp.quality, wet: wl !== null && wl - T.heightAt(p.pos.x, p.pos.z) > 1.15, inCol, d: Math.hypot(p.pos.x - pl.x, p.pos.z - pl.z), above: p.pos.y - (fp.span?.deckAt(p.pos.x, p.pos.z) ?? (pl.y !== undefined && (Math.abs(pl.y - T.heightAt(p.pos.x, p.pos.z)) > 3 || pl.name === 'The Nadir') ? pl.y : T.heightAt(p.pos.x, p.pos.z))) /* v8-04: a story end on the deck; v12-H3: a place in the air (the tender's deck) measured from its own y */, closed: !fp.settings.shown, cues, dot: (fx * tx + fz * tz) / l, pitch: p.pitch };
    }, i);
    if (!r) continue;
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
  check('teleport: none stands in a hole (the mean ground in a 30 m ring is not more than 6 m above the stand point: the old Pit entry was 29 m), eye never under the terrain', detail.every((r) => (r.basin <= 6 || r.under || ['The Speculum', 'The Cutting'].includes(r.name)) && r.above > 0.5), detail.filter((r) => (r.basin > 6 && !r.under && !['The Speculum', 'The Cutting'].includes(r.name)) || r.above <= 0.5)); // (the Cutting stands in its gorge, the one place the slot is seen from; the Speculum stands on the canyon's floor, 17 m under its rim, which is walkable ground; the fen, the lynchets and the rest sit in shallow bowls)
  check('teleport: each faces its thing (or the sun)', facing, bad);
  check('teleport: closes the panel', allClosed, bad);
  // (v17 critic) no stand inside a building: nothing drawn within 1.5 m over the eye, either face (the Lamplighter's old
  // stand, (110, -12), was inside a Lappet house since v15, its ceiling 0.8 m over the eye: the ground, the ring and
  // the colliders above all passed it, and the frame was flat fog)
  const roofed = await page.evaluate(async () => {
    const T = await import('three'), fp = window.__fp, rc = new T.Raycaster(), out = [];
    rc.layers.enableAll(); rc.far = 1.5;
    const sides = new Map(); fp.scene.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material)) { sides.set(o.material, o.material.side); o.material.side = T.DoubleSide; } });
    try {
      for (const pl of fp.settings.places) {
        fp.settings.teleport(pl); fp.scene.updateMatrixWorld(true);
        rc.set(fp.player.pos.clone(), new T.Vector3(0, 1, 0));
        const h = rc.intersectObjects(fp.scene.children, true).find((h) => h.object.visible && h.object.isMesh && !h.object.isPoints && !/sky|meteor/.test(h.object.name));
        if (h) out.push({ name: pl.name, over: h.object.name, d: +h.distance.toFixed(2) });
      }
    } finally { for (const [m, sd] of sides) m.side = sd; }
    if (fp.settings.shown) fp.settings.close();
    return out;
  });
  check('teleport: no stand inside a building (nothing drawn within 1.5 m over the eye)', roofed.length === 0, roofed);
  check('teleport: fires no cue', noCue, bad);
  // v14-B4 (#52): the stand shows the place. Each named landmark's own centre (its `at`, for the places that stand on a line) lies within 40
  // degrees of the view's centre line (the horizontal field is about 100 degrees across) and no collider shuts the view within 3 m of the eye
  // (v12's critic: "Go-to stands face walls"; a stand that looks into a trunk or a wall at arm's length shows nothing). Stands whose y is below the terrain
  // (a chamber, the Pit's floor) are left alone; so are the places with no landmark of their own (the living, the stories, the region cards).
  const view = await page.evaluate(() => {
    const fp = window.__fp, T = fp.terrain, out = [];
    const marks = Object.values(fp.landmarks).filter((L) => L.name);
    fp.settings.places.forEach((pl, i) => {
      const L = marks.find((m) => m.name === pl.name || 'The moss light, ' + m.name === pl.name) || (pl.thing && { name: pl.name, x: pl.thing.x, z: pl.thing.z, r: 3 }); // (v15-N1: the village's three things with no card of their own)
      if (!L || pl.look === 'sun') { out.push(null); return; }
      if (pl.y !== undefined && pl.y < T.heightAt(pl.x, pl.z) - 1) { out.push(null); return; }
      fp.settings.teleport(pl);
      const p = fp.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), c = L.at || L;
      const tx = c.x - p.pos.x, tz = c.z - p.pos.z, d = Math.hypot(tx, tz) || 1;
      const deg = Math.acos(Math.max(-1, Math.min(1, (fx * tx + fz * tz) / d))) * 180 / Math.PI;
      let hit = null; const floor = Math.max(T.heightAt(p.pos.x, p.pos.z), p.pos.y - p.eye - 0.1);
      for (const k of fp.player.colliders) {
        if (k.h !== undefined && k.y + k.h < floor) continue;
        if (k.unseen) continue; // (v14-F1) a collider with nothing drawn, the Nave's lip posts: it shuts no view
        const ox = k.x - p.pos.x, oz = k.z - p.pos.z, t = ox * fx + oz * fz; // along the look
        if (t < 0 || t > 3 + k.r) continue;
        const off = Math.abs(ox * fz - oz * fx); // across it
        if (off < k.r + 0.3 && t - Math.sqrt(Math.max(0, (k.r + 0.3) ** 2 - off * off)) < 3) { hit = { x: k.x, z: k.z, r: k.r }; break; }
      }
      // a place that is a line (an axis) or wider than the view, or that the stand stands in, is seen by its look point lying on it
      const lk = pl.look && pl.look !== 'sun' ? Math.hypot(pl.look.x - c.x, pl.look.z - c.z) : 1e9, wide = !!L.axis || d < 2 || L.name === 'The Tumbling Water' /* its centre is the river's mid-reach; the stand shows the fall, 55 m off in the canyon wall */ || lk <= Math.max(L.r, 12) + 5;
      out.push({ name: pl.name, deg: wide ? 0 : Math.round(deg), hit });
    });
    return out.filter(Boolean);
  });
  const badView = view.filter((r) => r.deg > 40 || r.hit); // (v14-B5: more than 35 checked)
  check('teleport: every named place\'s centre is in view (within 40 degrees of the look) and no collider shuts the view within 3 m of the eye (every stand in PLACES, the map\'s among them)', view.length > 35 && badView.length === 0, { checked: view.length, badView });
  // v16 critic: every stand on the map, the living and the stories too: the view's centre (the stand's yaw and pitch, from the
  // eye) meets no drawn mesh within 2 m (the Bather's old stand on the Span's rubble looked into a slab 1.98 m off; the
  // collider check above sees only colliders, and skips the living)
  const blind = await page.evaluate(() => {
    const fp = window.__fp, T = fp.THREE, rc = new T.Raycaster(), out = [];
    const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    for (const pl of fp.settings.places) {
      fp.settings.teleport(pl);
      const P = fp.player, cp = Math.cos(P.pitch), dir = new T.Vector3(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp);
      rc.set(P.pos, dir); rc.near = 0.05; rc.far = 2;
      const h = rc.intersectObjects(fp.scene.children, true).find((h) => h.object.isMesh && shown(h.object) && !/^sky/.test(h.object.name + (h.object.parent?.name || '')));
      if (h) out.push({ name: pl.name, hit: h.object.name || h.object.parent?.name, d: +h.distance.toFixed(2) });
    }
    return { n: fp.settings.places.length, out };
  });
  check('teleport: from every stand in PLACES (the map\'s among them) the view\'s centre meets nothing drawn within 2 m of the eye', blind.n > 70 && blind.out.length === 0, blind);
  // v10-F1: the five places with an act land 8 to 11 m from it, facing it (the act's spot within 25 degrees of the look)
  const actLand = await page.evaluate(() => {
    const fp = window.__fp, out = {};
    for (const [name, id] of [['The Lantern Halt', 'halt-tally'], ['The Tocsin', 'span-bell'], ['The Lattice', 'mother-hand'], ['The Hypogeum', 'hypogeum-door'], ['The Collation', 'collation-twelfth']]) {
      const pl = fp.settings.places.find((q) => q.name === name), h = fp.acts?.list.find((q) => q.def.id === id);
      if (!pl || !h) { out[name] = null; continue; }
      fp.settings.teleport(pl);
      const p = fp.player, L = fp.acts.lure.state().find((q) => q.id === id).at, tx = L.x - p.pos.x, tz = L.z - p.pos.z, d = Math.hypot(tx, tz);
      out[name] = { d: +d.toFixed(1), deg: Math.round(Math.acos(Math.max(-1, Math.min(1, (-Math.sin(p.yaw) * tx - Math.cos(p.yaw) * tz) / d))) * 180 / Math.PI) };
    }
    return out;
  });
  check('teleport: the Lantern Halt, the bell (the Tocsin), the Lattice, the Hypogeum and the Collation land 8 to 11 m from their act\'s lure, facing it', Object.values(actLand).every((r) => r && r.d >= 8 && r.d <= 11 && r.deg <= 25), actLand);

  // v14-B3 (#52, the class: a way up whose top has no name): stood where each ascent ends (its last point, on the floor
  // that holds the walk there: the path's y, or the floor nearest its highest y when the point has none), the HUD shows a
  // name card; and both ends of the walked gallery (its first point too) show Final Refuge (v14-B5: the owner's one name at
  // the top of the lift); and the top of each of the Span's stairs (its last flight's last tread, and its top landing)
  // shows Titan's Causeway
  const tB = Date.now();
  const tops = await page.evaluate(() => {
    const fp = window.__fp, p = fp.player, out = [];
    const card = (q, hi) => {
      fp.controls.placeAt(0, 0); fp.hud.update(0.1); // off any card, so the next one is new
      fp.controls.placeAt(q[0], q[1], q[2] ?? hi);
      fp.hud.update(0.1);
      const shown = document.getElementById('place').classList.contains('shown');
      return { at: [q[0], q[1], +(p.pos.y - p.eye).toFixed(1)].map((v) => +(+v).toFixed(1)), name: shown ? document.getElementById('place-name').textContent : null };
    };
    for (const a of fp.ascents.list.filter((a) => !a.test)) {
      const hi = Math.max(...a.path.filter((q) => q[2] !== undefined).map((q) => q[2]));
      out.push({ id: a.id, end: 'last', ...card(a.path[a.path.length - 1], hi) });
      if (a.id === 'lift-gallery') out.push({ id: a.id, end: 'first', ...card(a.path[0], hi) });
    }
    for (const [key, S] of Object.entries(fp.span?.stairs ?? {})) {
      const f = S.flights[S.flights.length - 1], L = S.landings[S.landings.length - 1], run = f.steps * f.run;
      out.push({ id: 'span-' + key, end: 'last tread', ...card([f.x + f.dir[0] * (run - 0.3), f.z + f.dir[1] * (run - 0.3), f.y1], f.y1) });
      out.push({ id: 'span-' + key, end: 'top landing', ...card([(L.rect[0] + L.rect[1]) / 2, (L.rect[2] + L.rect[3]) / 2, L.y], L.y) });
    }
    return out;
  });
  const want = { stair: 'The Hanging Croft', icefall: 'The Bitter End', 'lift-gallery': 'Final Refuge', 'span-west': 'Titan\u2019s Causeway', 'span-east': 'Titan\u2019s Causeway' };
  check('names: stood at the end of every way up the HUD names it (the icefall, Lonely Staircase, the lift\'s gallery at both ends, the Span\'s two stairs); a new way up with no name fails', tops.length >= 8 && tops.every((t) => t.name && (!want[t.id] || t.name === want[t.id])), tops);
  console.log(`   (the names checks: ${((Date.now() - tB) / 1000).toFixed(1)} s)`);

  // coordinates: the panel's line (4 Hz, only while open) and the optional always-on readout
  await page.evaluate(() => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(12.4, -33.6); p.vel?.set(0, 0, 0); p.yaw = -Math.PI / 2; p.pitch = -0.12; }); // (placed on the floor: a walker left in the air falls, and the 4 Hz line runs behind)
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__fp.settings.open()); await page.waitForTimeout(600);
  { // (the feet's height is wherever the floor put them: read with the line)
    const r = await page.evaluate(() => { const p = window.__fp.player; return { t: document.getElementById('set-pos').textContent, y: (p.pos.y - p.eye).toFixed(1).replace(/-(\d)/, '\u2212$1') }; });
    check('coords: the panel shows x, z, the feet\'s height, facing with the yaw in radians, and the pitch', r.t === `x 12  z \u221234  y ${r.y}  facing E \u22121.57  pitch \u22120.12`, r);
  }
  { // (v17, the owner: a bug 24 m under the ground could not be given as a link) one click copies it as a ?pos= link that lands there
    await page.click('#set-copypos'); await page.waitForTimeout(100);
    const { link, fy } = await page.evaluate(() => ({ link: document.getElementById('set-copypos').dataset.link || '', fy: window.__fp.player.pos.y - window.__fp.player.eye }));
    const u = new URL(link), pos = (u.searchParams.get('pos') || '').split(',').map(Number);
    check('coords: Copy link gives ?pos=x,z,y&yaw&pitch for here', pos.length === 3 && Math.abs(pos[0] - 12.4) < 0.06 && Math.abs(pos[1] + 33.6) < 0.06 && Math.abs(pos[2] - fy) < 0.1 && Math.abs(+u.searchParams.get('yaw') + Math.PI / 2) < 0.006 && Math.abs(+u.searchParams.get('pitch') + 0.12) < 0.006, link);
    check('coords: the line and its button fit a 390 px panel', await page.evaluate(() => { const r = document.getElementById('set-copypos').getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth; }));
  }
  await page.evaluate(() => { window.__fp.player.pos.x = 40; window.__fp.player.yaw = 0; window.__fp.player.pitch = 0; }); await page.waitForTimeout(600);
  check('coords: it follows at 4 Hz', (await page.textContent('#set-pos')).startsWith('x 40') && (await page.textContent('#set-pos')).includes('facing N 0.00'));
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
  // a long fall costs (v12): off by default, a click turns it on live and remembers it, a click turns it off
  check('fall: off by default, the row says so', await page.evaluate(() => { const b = document.getElementById('set-fall'); return !!b && b.getAttribute('aria-pressed') === 'false' && b.textContent === 'Off' && localStorage.getItem('fp-fall') === null && !window.__fp.fall.enabled; }));
  await page.click('#set-fall');
  check('fall: a click turns it on at once and remembers it', await page.evaluate(() => { const b = document.getElementById('set-fall'); return b.getAttribute('aria-pressed') === 'true' && b.textContent === 'On' && localStorage.getItem('fp-fall') === '1' && window.__fp.fall.enabled; }));
  await page.evaluate(() => { window.__fp.settings.close(); window.__fp.settings.open(); });
  check('fall: reopening the panel still shows it on', (await page.getAttribute('#set-fall', 'aria-pressed')) === 'true');
  await page.click('#set-fall');
  check('fall: and off again', await page.evaluate(() => localStorage.getItem('fp-fall') === '0' && !window.__fp.fall.enabled && document.getElementById('set-fall').textContent === 'Off'));
  await page.evaluate(() => { localStorage.removeItem('fp-fall'); window.__fp.settings.close(); });

  // the debug panel survives a teleport from either panel, and the quality reload keeps every parameter
  await page.evaluate(() => { window.__fp.debug.toggle(true); window.__fp.settings.open(); });
  await page.locator('#set-places .map-mark').nth(3).click();
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
  for (const [x, z, want] of [[-275, -15, 'The Taker of Altitudes'], [130, -60, 'Medlar Close'], [-195, -113, 'The Lynchets'], [60, 250, 'Kenching Flats'], [55, 274, 'Rest in Starlight'], [185, -70, 'Sleeper\u2019s Orchard'], [195, -100, 'Sleeper\u2019s Orchard'], [194.2, 201, 'The Pit'], [203.08, 176.54, 'The Nadir']] /* v14-D2: the Pit's card is the lip's; its floor is the Nadir's */) {
    await page.evaluate(([x, z]) => { const p = window.__fp.player; p.pos.set(x, window.__fp.terrain.heightAt(x, z) + p.eye, z); window.__fp.hud.update(0.1); }, [x, z]);
    const got = await page.textContent('#place-name');
    check(`cards: (${x}, ${z}) shows ${want}`, got === want, got);
  }
  await page.evaluate(() => { const p = window.__fp.player; p.pos.set(128, window.__fp.terrain.heightAt(128, 5) + p.eye, 5); window.__fp.hud.update(0.1); });
  const lee = await page.evaluate(() => { const l = document.getElementById('place-line'); return { name: document.getElementById('place-name').textContent, lines: Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight)), text: l.textContent }; });
  check('cards: (128, 5) A Lamplighter\u2019s Standards, the line on two lines', lee.name === 'A Lamplighter\u2019s Standards' && lee.lines === 2 && lee.text.includes('\n'), lee);
  // v14-B3: a card on a deck shows on the deck and not on the floor under it; a name with no line shows the name alone
  const at = (x, z, y) => page.evaluate(([x, z, y]) => { const fp = window.__fp, p = fp.player; p.pos.set(x, (y ?? fp.terrain.heightAt(x, z)) + p.eye, z); fp.hud.update(0.1); const l = document.getElementById('place-line'); return { name: document.getElementById('place').classList.contains('shown') ? document.getElementById('place-name').textContent : null, line: l.style.display === 'none' ? '' : l.textContent }; }, [x, z, y]);
  await at(0, 0); const deck = await at(88, 211, 56);
  const waitLines = await page.evaluate(() => { const l = document.getElementById('place-line'); return Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight)); });
  await at(0, 0); const under = await at(88, 211);
  check('cards: on the Span\u2019s middle deck (56 m) The Long Wait, its two lines one above the other, each in its own quotation marks (v14-B5, #52); on the ground under it not', deck.name === 'The Long Wait' && deck.line === '\u201cA bitter night for travelers.\u201d\n\u201cA bitter night for musing on the stars.\u201d' && waitLines === 2 && under.name !== 'The Long Wait', { deck, waitLines, under });
  // v14-B5: the deck is Titan's Causeway between the places on it, and the places on it win inside it; not on the ground
  await at(0, 0); const mid = await at(-160, 215, 56); await at(0, 0); const splice = await at(145, 215, 56); await at(0, 0); const floor = await at(-160, 200);
  check('cards: the deck between its places is Titan\u2019s Causeway; the Shaky Splice wins on its spar; the ground under the deck is not the Causeway', mid.name === 'Titan\u2019s Causeway' && mid.line.startsWith('\u201cNever shall') && splice.name === 'Shaky Splice' && floor.name !== 'Titan\u2019s Causeway', { mid, splice, floor });
  await at(0, 0); const croft = await at(226, -55, 107.9); await at(0, 0); const moor = await at(226, -55);
  check('cards: on the tender\u2019s deck (108 m) The Hanging Croft; on the moor under it not', croft.name === 'The Hanging Croft' && moor.name !== 'The Hanging Croft', { croft, moor });
  await context.close();
}

// ---- idle cap and the pause card, on a desktop viewport
{
  const { context, page } = await open({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.evaluate(() => window.__fp.settings.open()); await page.waitForTimeout(800);
  const o = await page.evaluate(() => ({ idle: window.__fp.pacing.idle, hidden: document.getElementById('card').classList.contains('hidden') }));
  check('panel: opening it does not raise the pause card', o.hidden, o);
  // v14-B1: the panel is the pause, so the frame idles under it as it did under the card; for a moment after a change in
  // it (a slider's preview) it does not
  await page.waitForTimeout(1200);
  const idleNow = () => page.evaluate(() => { const P = window.__fp.pacing; P.targetFps(performance.now()); return { idle: P.idle }; }); // asked now, not at the last drawn frame (a software GL frame can take seconds)
  const o2 = await idleNow();
  await page.locator('#set-volume').fill('70'); await page.waitForTimeout(150);
  const o3 = await idleNow();
  check('panel: the frame idles under it, and not just after a change in it', o2.idle === true && o3.idle === false, { o2, o3 });
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
  // v17.1-Q1: the map on a phone: every mark a thumb's width (44 px), inside the chart and the screen, none on another
  const lay = await page.evaluate(async () => {
    const S = window.__fp.settings; await S.mapReady();
    const f = document.querySelector('.map-frame').getBoundingClientRect(), R = S.marks.map((m) => m.el.getBoundingClientRect());
    let close = 1e9; for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) close = Math.min(close, Math.hypot(R[a].left - R[b].left, R[a].top - R[b].top)); // the marks are round: centre to centre
    return { frame: [Math.round(f.width), Math.round(f.height)], small: R.filter((r) => r.width < 43.9 || r.height < 43.9).length, out: R.filter((r) => r.left < f.left - 1 || r.right > f.right + 1 || r.top < f.top - 1 || r.bottom > f.bottom + 1 || r.right > innerWidth).length, overlap: +(44 - close).toFixed(1) };
  });
  check('touch: the map\'s marks are 44 px, inside the chart and the screen, none over another by more than 4 px', lay.small === 0 && lay.out === 0 && lay.overlap <= 4 && lay.frame[0] >= 280, lay);
  const mk = await page.evaluate(() => { const m = window.__fp.settings.marks[5], r = m.el.getBoundingClientRect(); return { i: 5, name: m.name, line: m.line, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const pos0 = await page.evaluate(() => { const p = window.__fp.player.pos; return [p.x, p.z]; });
  await page.touchscreen.tap(mk.x, mk.y); await page.waitForTimeout(200);
  const t1st = await page.evaluate(() => { const p = window.__fp.player.pos; return { pos: [p.x, p.z], name: document.querySelector('.map-name').textContent, go: !document.querySelector('.map-go').hidden, open: window.__fp.settings.shown }; });
  check('touch: a first tap on a mark says what it is (its line, its name, "Go there") and goes nowhere', t1st.open && t1st.name === mk.name && t1st.go && Math.hypot(t1st.pos[0] - pos0[0], t1st.pos[1] - pos0[1]) < 0.05, { mk, t1st });
  await page.touchscreen.tap(mk.x, mk.y); await page.waitForTimeout(200);
  const near = await page.evaluate((i) => { const pl = window.__fp.settings.marks[i].place, p = window.__fp.player.pos; return Math.hypot(p.x - pl.x, p.z - pl.z); }, mk.i);
  check('touch: a second tap on it goes there and closes', !(await shown(page)) && near < 1, near);
  await page.touchscreen.tap(g.l + g.w / 2, g.t + g.h / 2);
  const mk2 = await page.evaluate(() => { const m = window.__fp.settings.marks[9], r = m.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.touchscreen.tap(mk2.x, mk2.y); await page.waitForTimeout(150);
  await page.locator('.map-go').tap(); await page.waitForTimeout(150);
  const near2 = await page.evaluate(() => { const pl = window.__fp.settings.marks[9].place, p = window.__fp.player.pos; return Math.hypot(p.x - pl.x, p.z - pl.z); });
  check('touch: or a tap and "Go there"', !(await shown(page)) && near2 < 1, near2);
  await page.touchscreen.tap(g.l + g.w / 2, g.t + g.h / 2);
  // v13: Measure reloads into the bench at the tier in use, its params taken off again when it is done (src/perf.js)
  await page.evaluate(() => { window.__nav = null; window.__fp.settings.navigate = (u) => { window.__nav = u; }; });
  await page.locator('#set-measure').tap();
  const mu = await page.evaluate(() => { const u = window.__nav && new URL(window.__nav); return u && Object.fromEntries(u.searchParams); });
  check('touch: Measure reloads into the bench (bench=45, perf=1, measure=q: q was in the URL; the tier kept, no pos)', mu && mu.bench === '45' && mu.perf === '1' && mu.measure === 'q' && mu.q === 'low' && !('pos' in mu), mu);
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
