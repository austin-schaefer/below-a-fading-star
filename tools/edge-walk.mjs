#!/usr/bin/env node
// An edge done the way a visitor does it (v15-W3, the owner: "allow you to go up to edge and fall in and jump"): load
// where a way's floor is, "Go out", the mouse captured by a click (MODE=keys) or the touch stick and a look drag
// (MODE=touch), walk at a lip on a slant (a plain walk, along its line: the edge-guard holds them there), look down,
// turn square to it and push on (over at once), and let the walk's own clock run through the fall, the landing and
// the waking (a long fall) or the walk on below. Frames on the page's own clock (Playwright's, installed before the
// load), 1280 x 720 into shots/wip/<prefix>-NN-<name>.png, a line per frame on stdout (the feet, the floor, the lip,
// the fall's phase). The lip is found from the page: the nearest drop of more than 1.5 m round the start.
// Usage: node tools/edge-walk.mjs [base] <place> [prefix]    MODE=keys|touch (default keys) · Q=low · HOP=1 hops over
//   places: lappet, leads, span, pit, nave, icefall, stair, gallery (or x,z,y)
import { chromium } from 'playwright'; // npm install --no-save playwright@1.63.0 in the worktree (the wilderness skill)
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const placeArg = process.argv[3];
const LOOK_SENS = 0.005; // src/controls.js: rad per css px of a touch drag
const MODE = process.env.MODE || 'keys', Q = process.env.Q || 'low';
const prefix = process.argv[4] || `edge-${placeArg}-${MODE}`;
// where each walk starts: on the floor of the way, a few metres from a lip (feet y); `dir`: look for the lip this way first
const PLACES = {
  lappet: { at: [62, -12, 18], name: 'the Lappet\'s top step (the crown over the High Rung)' },
  leads: { at: [60, -28.2, 10], name: 'a roof on the Leads' },
  span: { at: [-30, 213, 56], name: 'the Great Span, the crack' , dir: [-1, 0] },
  pit: { at: null, name: 'the Pit\'s lip', hole: 'pit' },
  nave: { at: null, name: 'the Foundered Nave\'s sinkhole', hole: 'nave' },
  icefall: { at: null, name: 'the icefall', ascent: ['icefall', 0.55] },
  stair: { at: null, name: 'the Lonely Staircase\'s deck', ascent: ['stair', 1] },
  gallery: { at: [-375.2, -23.6, 135.2], name: 'the lift\'s gallery (the heights)' },
};
const P = PLACES[placeArg] || (placeArg && placeArg.includes(',') ? { at: placeArg.split(',').map(Number), name: placeArg } : null);
if (!P) { console.error('usage: node tools/edge-walk.mjs base <' + Object.keys(PLACES).join('|') + '|x,z,y> [prefix]'); process.exit(2); }
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: MODE === 'touch' });
const page = await ctxB.newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.clock.install();
const ready = async () => { for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !document.getElementById('begin')?.disabled)); i++) { await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 20)); } };
// the start: given, or a hole's turf, or a point along an ascent (read from a first load)
let at = P.at;
if (!at) {
  await page.goto(`${base}/?q=${Q}`, { waitUntil: 'load', timeout: 120000 }); await ready();
  at = await page.evaluate(async (P) => {
    const fp = window.__fp;
    if (P.hole) {
      const G = P.hole === 'pit' ? await import('/src/v4/paths/ground.js') : await import('/src/v5/nave/ground.js');
      const H = P.hole === 'pit' ? G.PIT : G.NAVE, edge = P.hole === 'pit' ? G.pitEdge : G.naveEdge, a = 200 * Math.PI / 180;
      let x = H.x + Math.sin(a) * 40, z = H.z - Math.cos(a) * 40;
      for (let k = 0; k < 400 && edge(x, z) > 5; k++) { x += (H.x - x) * 0.02; z += (H.z - z) * 0.02; }
      return [x, z, fp.terrain.heightAt(x, z)];
    }
    const A = fp.ascents.list.find((q) => q.id === P.ascent[0]), pts = A.path, i = Math.min(pts.length - 1, Math.round(P.ascent[1] * (pts.length - 1)));
    const q = pts[i]; return [q[0], q[1], q[2] ?? fp.terrain.heightAt(q[0], q[1])];
  }, P);
}
await page.goto(`${base}/?q=${Q}&pos=${at[0].toFixed(2)},${at[1].toFixed(2)},${at[2].toFixed(2)}`, { waitUntil: 'load', timeout: 120000 });
await ready();
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; for (const k of ['place', 'hint']) { const e = document.getElementById(k); if (e) e.style.visibility = 'hidden'; } });
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
const run = (ms) => page.clock.runFor(ms);
await page.click('#begin'); await run(400);
// the lip: of 32 bearings, the nearest drop of more than 1.5 m (marching 0.2 m at a time over the floor that holds the
// feet), and its outward normal: the mean of the bearings within 1 m of the nearest
const lip = await page.evaluate((dir) => {
  const fp = window.__fp, p = fp.player, x0 = p.pos.x, z0 = p.pos.z, f0 = p.pos.y - p.eye, hits = [];
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
    let feet = f0;
    for (let d = 0.2; d < 16; d += 0.2) {
      const fl = fp.controls.floorAt(x0 + dx * d, z0 + dz * d, feet);
      if (fl.y < feet - 1.5) { hits.push({ d, dx, dz, x: x0 + dx * (d - 0.2), z: z0 + dz * (d - 0.2), y: feet }); break; }
      if (fl.y > feet + 0.7) break; // a wall
      feet = fl.y;
    }
  }
  if (!hits.length) return null;
  let best = hits.reduce((a, b) => (b.d < a.d ? b : a));
  if (dir) { const pref = hits.filter((h) => h.dx * dir[0] + h.dz * dir[1] > 0.7); if (pref.length) best = pref.reduce((a, b) => (b.d < a.d ? b : a)); }
  let nx = 0, nz = 0; for (const h of hits) if (h.d < best.d + 1 && h.dx * best.dx + h.dz * best.dz > 0.5) { nx += h.dx; nz += h.dz; }
  const l = Math.hypot(nx, nz) || 1;
  return { x: best.x, z: best.z, y: best.y, d: best.d, nx: nx / l, nz: nz / l };
}, P.dir || null);
if (!lip) { console.log('[lip] none found within 16 m of', at); await browser.close(); process.exit(1); }
console.log('[place]', P.name, 'start', at.map((v) => +v.toFixed(2)), 'lip', JSON.stringify({ x: +lip.x.toFixed(2), z: +lip.z.toFixed(2), d: +lip.d.toFixed(1), n: [+lip.nx.toFixed(2), +lip.nz.toFixed(2)] }));
// the controls: keys and the captured mouse, or the stick and a look drag
let locked = false, cdp = null, home = null, mx0 = 640, my0 = 360;
if (MODE === 'keys') {
  await page.mouse.click(640, 360); await run(300);
  locked = await page.evaluate(() => window.__fp.player.locked);
  console.log('[lock]', locked ? 'the mouse is captured' : 'NOT captured');
} else {
  cdp = await ctxB.newCDPSession(page);
  home = await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, shown: getComputedStyle(document.getElementById('stick')).display !== 'none' }; });
  console.log('[touch] the stick at', JSON.stringify(home));
}
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
let stick = null; // [dx, dy] while held
// turn the look to (yaw, pitch): the mouse with the pointer captured, or a look drag on touch; closed loop on the page's yaw
async function look(yaw, pitch) {
  for (let it = 0; it < 6; it++) {
    const s = await page.evaluate(([yaw, pitch]) => { const p = window.__fp.player; let dy = yaw - p.yaw; dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI; return { dy, dp: pitch - p.pitch }; }, [yaw, pitch]);
    if (Math.abs(s.dy) < 0.02 && Math.abs(s.dp) < 0.02) return;
    if (MODE === 'keys') {
      if (!locked) { await page.evaluate(([dy, dp]) => { const p = window.__fp.player; p.yaw += dy; p.pitch += dp; }, [s.dy, s.dp]); return; }
      const tx = mx0 - s.dy / 0.0021, ty = my0 - s.dp / 0.0021;
      await page.mouse.move(tx, ty, { steps: 4 }); mx0 = tx; my0 = ty;
    } else {
      // a drag on the right of the view; the stick's finger stays where it is
      const k = LOOK_SENS, px = -s.dy / k, py = -s.dp / k, sx = 900, sy = 300, n = 6;
      const held = stick ? [[1, home.x + stick[0], home.y + stick[1]]] : [];
      await touch('touchStart', [...held, [2, sx, sy]]);
      for (let i = 1; i <= n; i++) { await touch('touchMove', [...held, [2, sx + (px * i) / n, sy + (py * i) / n]]); await run(16); }
      await run(150); await touch('touchEnd', held); await run(100); // (held still before lifting: no fling)
    }
    await run(60);
  }
}
async function walk(on, hurry = false) {
  if (MODE === 'keys') {
    if (on) { await page.keyboard.down('KeyW'); if (hurry) await page.keyboard.down('ShiftLeft'); } else { await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); }
  } else if (on) { stick = [0, hurry ? -60 : -32]; await touch(stick ? 'touchStart' : 'touchMove', [[1, home.x, home.y]]); await touch('touchMove', [[1, home.x + stick[0], home.y + stick[1]]]); }
  else { stick = null; await touch('touchEnd', []); }
}
async function hop() {
  if (MODE === 'keys') { await page.keyboard.down('Space'); await run(60); await page.keyboard.up('Space'); }
  else { const j = await page.evaluate(() => { const r = document.getElementById('jump').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); const held = stick ? [[1, home.x + stick[0], home.y + stick[1]]] : []; await touch('touchStart', [...held, [3, j[0], j[1]]]); await run(60); await touch('touchEnd', held); }
}
const info = () => page.evaluate((lip) => {
  const fp = window.__fp, p = fp.player, f = p.pos.y - p.eye, fl = fp.controls.floorAt(p.pos.x, p.pos.z, f);
  return { pos: [+p.pos.x.toFixed(2), +p.pos.z.toFixed(2)], feet: +f.toFixed(2), floor: +fl.y.toFixed(2), on: p.onGround, stack: p.onStack?.name || null, atLip: +p.atLip.toFixed(2), past: +((p.pos.x - lip.x) * lip.nx + (p.pos.z - lip.z) * lip.nz).toFixed(2), fall: fp.fall?.phase, lids: +(fp.fall?.amount ?? 0).toFixed(2), yaw: +p.yaw.toFixed(2), pitch: +p.pitch.toFixed(2), locked: p.locked };
}, lip);
let n = 0;
const shot = async (name) => {
  const f = `shots/wip/${prefix}-${String(n++).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: f, timeout: 240000 });
  const s = await info();
  console.log(`[saved] ${f}`, JSON.stringify(s));
  return s;
};
// 1. walk at the lip on a slant: 65 degrees off square (a plain walk along its line), level look
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);
const sq = yawOf(lip.nx, lip.nz), side = 1.13; // 65 degrees
const slant = yawOf(lip.nx * Math.cos(side) - lip.nz * Math.sin(side), lip.nz * Math.cos(side) + lip.nx * Math.sin(side));
await look(slant, -0.12); await run(300);
await shot('walking-to-the-lip');
await walk(true);
let s = await info(), t = 0;
while (t < 12000 && s.atLip < 0.5 && s.on) { await run(200); t += 200; s = await info(); if (t === 1000) await shot('walking-along'); }
await run(400);
await shot(s.on ? 'held-at-the-lip' : 'off-before-the-lip');
// 2. look down over it (still held: the plain walk along its line keeps them on)
await look(slant + (sq - slant) * 0.6, -0.75); await run(500);
await shot('at-the-lip-looking-down');
// 3. turn square to it and push on: over at once (or a hop with HOP=1)
await look(sq, -0.35);
if (process.env.HOP) await hop();
await run(150); await shot('going-over');
for (const [ms, name] of [[250, 'over-0.4s'], [400, 'falling-0.8s']]) { await run(ms); await shot(name); }
await walk(false);
// 4. the landing: until standing again (or the fall's dark), then on through any waking
for (t = 0; t < 8000; t += 100) { s = await info(); if (s.on && s.fall !== 'falling' && t > 200) break; if (s.fall === 'dark') break; await run(100); }
await shot(s.fall === 'dark' ? 'dark' : 'landed');
if (s.fall === 'dark' || s.fall === 'waking') {
  for (const [ms, name] of [[1500, 'waking-1'], [1500, 'waking-2'], [1500, 'woken']]) { await run(ms); await shot(name); }
  for (t = 0; t < 6000 && (await info()).fall !== 'idle'; t += 200) await run(200);
}
// 5. walk on from where they are
await look((await info()).yaw, -0.1);
await walk(true); await run(1500); await walk(false); await run(300);
await shot('walking-on');
await browser.close();
