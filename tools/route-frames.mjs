#!/usr/bin/env node
// The walk before a merge (#64): a route stood on every metre with the head turning, for a reader who did not build
// the place. One page load; at each metre the walker is stood on the floor there (found as a walker finds it, through
// placeAt: tools/geometry/extract.js's route()) and held, and the view is taken ahead (along the route), right, back,
// left (YAWS=n turns the head through n yaws instead of four), then down and up. Frames 960 x 540 go to
// shots/wip/<prefix>-<route>-<q>-m<metres, 012.0>-<k><view>.png in order, and one contact sheet a route (a row a metre, at most
// 50 rows a sheet: longer routes get -sheet2 and on) to shots/wip/<prefix>-<route>-<q>-sheet.png. Read the sheet first,
// then open the frames it sends you to: a face that flickers shows as stripes that change between neighbouring metres,
// a missing face as a hole onto something that should be behind a wall, a floating part as a strut whose end you can
// see past.
//   node tools/route-frames.mjs [base=http://localhost:8123] <route> [q=medium] [prefix=route]
//     route: a place's name in tools/geometry/places.mjs (or src/v15/plan.js's GEOMETRY_PLACES) with a route (an
//            ascent, a stair or pts); a disc place has no route.
//     FROM=m TO=m: only that stretch (metres along the route); STEP=m (default 1).
//   node tools/route-frames.mjs [base] findings <geometry.json> [q=medium] [prefix=geom] [n=10]
//     one frame of each of the n worst findings of each kind in a GEOM_JSON file from tools/geometry-test.mjs, from
//     the stand it names, looking at the fault, and a sheet of them.
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { PLACES } from './geometry/places.mjs';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const base = (args[0] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const mode = args[1] === 'findings' ? 'findings' : 'route';
const routeName = args[1];
const [q, prefix, nWorst] = mode === 'findings' ? [args[3] || 'medium', args[4] || 'geom', +(args[5] || 10)] : [args[2] || 'medium', args[3] || 'route'];
if (!routeName) { console.log('usage: node tools/route-frames.mjs <base> <route> [q] [prefix]   |   <base> findings <json> [q] [prefix] [n]'); process.exit(2); }
mkdirSync('shots/wip', { recursive: true });

const places = PLACES.slice();
const v15 = join(here, '..', 'src', 'v15', 'plan.js');
if (existsSync(v15)) { // absent: no village yet; present but broken: say so and stop (the village must not go unwalked quietly)
  try { const m = await import(pathToFileURL(v15).href); places.push(...(m.GEOMETRY_PLACES || [])); }
  catch (e) { console.log(`src/v15/plan.js will not import in node (it must import nothing): ${e.message}`); process.exit(1); }
}

let views = [];
let place = null;
if (mode === 'route') {
  place = places.find((p) => p.name === routeName);
  if (!place || place.c) { console.log(`no route called ${routeName}: ${places.filter((p) => !p.c).map((p) => p.name).join(', ')}`); process.exit(2); }
}

const W = 960, H = 540, TW = 192, TH = 108;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=${q}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => {
  document.getElementById('card')?.classList.add('hidden');
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; fp.events.dispatchEvent(new CustomEvent('begin'));
});

const yaws = Math.max(4, +(process.env.YAWS || 4));
if (mode === 'route') {
  const step = +(process.env.STEP || 1);
  const R = await page.evaluate(async ([place, step]) => (await import('/tools/geometry/extract.js')).route(window.__fp, place, step), [place, step]);
  if (!R) { console.log(`the route ${routeName} is not registered in this build`); process.exit(1); }
  const from = +(process.env.FROM || 0), to = +(process.env.TO || 1e9);
  const pts = R.pts;
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z, s] = pts[i];
    if (s < from - 1e-6 || s > to + 1e-6) continue;
    // ahead: toward the next point (or from the last)
    const a = pts[Math.min(i + 1, pts.length - 1)], b = pts[Math.max(i - 1, 0)];
    const dx = i + 1 < pts.length ? a[0] - x : x - b[0], dz = i + 1 < pts.length ? a[2] - z : z - b[2];
    const ahead = Math.atan2(-dx, -dz);
    const row = [];
    for (let k = 0; k < yaws; k++) row.push({ name: k === 0 ? 'ahead' : k * 4 === yaws ? 'right' : k * 2 === yaws ? 'back' : k * 4 === yaws * 3 ? 'left' : `y${Math.round((k * 360) / yaws)}`, yaw: ahead - (k * 2 * Math.PI) / yaws, pitch: 0 });
    row.push({ name: 'down', yaw: ahead, pitch: -1.15 }, { name: 'up', yaw: ahead, pitch: 1.2 });
    views.push({ m: s, x, y, z, row });
  }
  console.log(`${routeName}: ${R.L.toFixed(0)} m, ${views.length} stands, ${views.length * (yaws + 2)} frames`);
} else {
  const all = JSON.parse(readFileSync(args[2], 'utf8'));
  const kinds = {};
  for (const f of all) (kinds[f.kind] ||= []).push(f);
  let i = 0;
  for (const [k, list] of Object.entries(kinds)) for (const f of list.sort((p, q2) => q2.score - p.score).slice(0, nWorst)) {
    if (!f.stand) continue;
    views.push({ m: i++, x: f.stand.x, y: f.stand.y, z: f.stand.z, row: [{ name: `${k}-${f.place}`, yaw: f.stand.yaw, pitch: f.stand.pitch, note: `${f.names.join(' + ')} at ${f.at.map((v) => v.toFixed(1)).join(', ')}` }] });
  }
}

const tag = mode === 'route' ? `${prefix}-${routeName}-${q}` : `${prefix}-findings-${q}`;
const sheets = [];
let sheetRows = [];
const perRow = mode === 'route' ? yaws + 2 : 1;
const flush = async () => {
  if (!sheetRows.length) return;
  const n = sheets.length + 1;
  const cols = mode === 'route' ? perRow : 5;
  const items = mode === 'route' ? sheetRows : sheetRows.flat().map((t) => [t]);
  const rows = mode === 'route' ? items.length : Math.ceil(items.length / cols);
  const url = await page.evaluate(async ([items, cols, rows, TW, TH, route]) => {
    const c = document.createElement('canvas'); c.width = cols * TW + 70; c.height = rows * (TH + 4) + 4;
    const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, c.width, c.height); g.font = '12px monospace'; g.fillStyle = '#ddd';
    const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = src; });
    let r = 0, k = 0;
    for (const row of items) {
      if (route) {
        g.fillStyle = '#ddd'; g.fillText(row.label, 4, r * (TH + 4) + 20);
        for (let i = 0; i < row.thumbs.length; i++) g.drawImage(await load(row.thumbs[i]), 70 + i * TW, r * (TH + 4) + 4, TW, TH);
        r++;
      } else {
        const t = row[0], cx = k % cols, cy = Math.floor(k / cols);
        g.drawImage(await load(t.thumb), 70 + cx * TW, cy * (TH + 4) + 4, TW, TH); g.fillStyle = '#ff0'; g.fillText(String(k + 1), 72 + cx * TW, cy * (TH + 4) + 18); k++;
      }
    }
    return c.toDataURL('image/png');
  }, [items, cols, rows, TW, TH, mode === 'route']);
  const out = `shots/wip/${tag}-sheet${n > 1 ? n : ''}.png`;
  writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  sheets.push(out);
  console.log(`[sheet] ${out}`);
  sheetRows = [];
};

let frame = 0;
for (const v of views) {
  const thumbs = [];
  for (let k = 0; k < v.row.length; k++) {
    const w = v.row[k];
    const r = await page.evaluate(async ([v, w, first, TW, TH]) => {
      const fp = window.__fp, p = fp.player;
      if (first) {
        window.__routeHold?.(); window.__routeHold = null;
        fp.controls.placeAt(v.x, v.z, v.y + 0.05);
        const at = p.pos.clone();
        window.__routeHold = fp.controls.carry({ step(pos) { pos.copy(at); } });
      }
      p.yaw = w.yaw; p.pitch = w.pitch;
      await new Promise((res) => setTimeout(res, first ? 900 : 250));
      fp.renderer.shadowMap.needsUpdate = true;
      fp.post.composer.render();
      const c = document.getElementById('scene');
      const url = c.toDataURL('image/png');
      const t = document.createElement('canvas'); t.width = TW; t.height = TH; t.getContext('2d').drawImage(c, 0, 0, TW, TH);
      return { url, thumb: t.toDataURL('image/jpeg', 0.8), feet: p.pos.y - p.eye, x: p.pos.x, z: p.pos.z };
    }, [v, w, k === 0, TW, TH]);
    frame++;
    const out = mode === 'route'
      ? `shots/wip/${tag}-m${v.m.toFixed(1).padStart(5, '0')}-${k + 1}${w.name}.png`
      : `shots/wip/${tag}-${String(v.m + 1).padStart(2, '0')}-${w.name}.png`;
    writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
    thumbs.push(r.thumb);
    if (k === 0) console.log(`[saved] ${out}${v.row.length > 1 ? ` (+${v.row.length - 1})` : ''} feet ${r.feet.toFixed(2)} at ${r.x.toFixed(1)},${r.z.toFixed(1)}${w.note ? '  ' + w.note : ''}`);
    if (mode === 'findings') sheetRows.push([{ thumb: r.thumb }]);
  }
  if (mode === 'route') sheetRows.push({ label: `${+v.m.toFixed(1)} m`, thumbs });
  if ((mode === 'route' && sheetRows.length >= 50) || (mode === 'findings' && sheetRows.length >= 60)) await flush();
}
await flush();
await page.evaluate(() => window.__routeHold?.());
await browser.close();
console.log(`${frame} frames, ${sheets.length} sheet(s): ${sheets.join(' ')}`);
