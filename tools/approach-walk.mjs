#!/usr/bin/env node
// A way followed on foot to the thing it leads to (v14-B6, the owner's #54: the path to the Lonely Staircase ended at
// its back). A judge's tool, not a gate. Load, "Go out", the mouse captured by a click on the view, then W held and the
// look steered with the mouse through the given points (a track's last stretch, as a visitor follows it), on the
// page's own clock. Frames every 10 m walked and at the end (stopped, looking on along the last leg), 1280 x 720, then
// a plan view: the terrain's hillshade around the end, every track (the leads' lines, grey; the causeway, pale), the
// stair's slabs (the stub dark, the beds light), each ascent's first point and the way it climbs (a red arrow), and
// the walked trail (orange). Out: shots/wip/<prefix>-NN-<m>m.png, <prefix>-end.png, <prefix>-plan.png.
// Usage: node tools/approach-walk.mjs [base] <prefix> "x,z;x,z;..." [plan half-size m = 45]
//   Q=low · EVERY=10 (m between frames)
import { chromium } from 'playwright'; // npm install --no-save playwright@1.63.0 in the worktree (the wilderness skill)
import { writeFileSync } from 'node:fs';
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const prefix = process.argv[3] || 'approach';
const pts = (process.argv[4] || '').split(';').filter(Boolean).map((s) => s.split(',').map(Number));
const half = +(process.argv[5] || 45);
const EVERY = +(process.env.EVERY || 10), Q = process.env.Q || 'low';
if (pts.length < 2) { console.error('usage: node tools/approach-walk.mjs base prefix "x,z;x,z;..." [half]'); process.exit(2); }
const browser = await chromium.launch({ channel: process.env.CHANNEL || 'chromium', args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.clock.install();
const yaw0 = Math.atan2(-(pts[1][0] - pts[0][0]), -(pts[1][1] - pts[0][1]));
await page.goto(`${base}/?q=${Q}&pos=${pts[0][0]},${pts[0][1]}&yaw=${yaw0.toFixed(3)}`, { waitUntil: 'load', timeout: 120000 });
for (let i = 0; i < 3000 && !(await page.evaluate(() => document.body.classList.contains('ready') && !document.getElementById('begin').disabled)); i++) { await page.clock.runFor(100); await new Promise((r) => setTimeout(r, 30)); }
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; for (const k of ['place', 'hint']) { const e = document.getElementById(k); if (e) e.style.visibility = 'hidden'; } });
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));
const run = (ms) => page.clock.runFor(ms);
await page.click('#begin'); await run(300);
await page.mouse.click(640, 360); await run(300);
const locked = await page.evaluate(() => window.__fp.player.locked);
console.log('[lock]', locked ? 'the mouse is captured' : 'NOT captured: the look is turned through the page instead');
const pos = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, y: p.pos.y, yaw: p.yaw }; });
let mx = 640;
async function turn(w) {
  const dy = await page.evaluate((w) => { const p = window.__fp.player; let d = Math.atan2(-(w[0] - p.pos.x), -(w[1] - p.pos.z)) - p.yaw; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; return d; }, w);
  if (!locked) return page.evaluate((dy) => { window.__fp.player.yaw += dy; }, dy);
  const tx = mx - dy / 0.0021; await page.mouse.move(tx, 360, { steps: 3 }); mx = tx;
}
let n = 0;
const shot = async (name) => { const f = `shots/wip/${prefix}-${String(n++).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: f, timeout: 240000 }); const s = await pos(); console.log(`[saved] ${f}`, `at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) y ${s.y.toFixed(1)}`); };
const trail = [];
let walked = 0, next = 0, leg = 1, last = await pos();
await turn(pts[1]); await run(800);
await shot('0m'); next = EVERY;
await page.keyboard.down('KeyW');
for (let steps = 0; steps < 2000 && leg < pts.length; steps++) {
  const s = await pos();
  if (Math.hypot(pts[leg][0] - s.x, pts[leg][1] - s.z) < (leg === pts.length - 1 ? 0.5 : 1.2)) { leg++; continue; }
  await turn(pts[leg]); await run(100);
  const t = await pos(); walked += Math.hypot(t.x - last.x, t.z - last.z); last = t; trail.push([t.x, t.z]);
  if (walked >= next) { await shot(`${Math.round(next)}m`); next += EVERY; }
}
await page.keyboard.up('KeyW'); await run(600);
const L = pts.length - 1;
await turn([pts[L][0] * 2 - pts[L - 1][0], pts[L][1] * 2 - pts[L - 1][1]]); await run(400);
await shot('end');
console.log(`[walked] ${walked.toFixed(1)} m, ended at (${last.x.toFixed(1)}, ${last.z.toFixed(1)}), ${leg >= pts.length ? 'every point reached' : `stuck before point ${leg}`}`);
// the plan view
const png = await page.evaluate(async ({ trail, half, end }) => {
  const fp = window.__fp, T = fp.terrain, S = 900, px = S / (2 * half), cx = end[0], cz = end[1];
  const W = await import('/src/world.js');
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const P = (x, z) => [(x - cx + half) * px, (z - cz + half) * px];
  const img = g.createImageData(S, S), d = img.data, st = 0.5;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = cx - half + i / px, z = cz - half + j / px, h = T.heightAt(x, z);
    const nx = -(T.heightAt(x + st, z) - h) / st, nz = -(T.heightAt(x, z + st) - h) / st, l = Math.hypot(nx, 1, nz);
    const lit = Math.max(0, (nx * W.SUN.dir.x + 0.55 + nz * W.SUN.dir.z) / l), wet = T.waterDepthAt && T.waterDepthAt(x, z) > 0;
    const k = (j * S + i) * 4, v = 60 + 120 * lit;
    d[k] = wet ? 40 : v * 0.95; d[k + 1] = wet ? 60 : v * 0.9; d[k + 2] = wet ? 110 : v * 0.8; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const line = (q, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); q.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); g.setLineDash([]); };
  if (fp.causeway) line(fp.causeway.map((q) => [q.x, q.z]), '#e8dcc0', 3.5 * px);
  for (const Ld of fp.paths.leads) if (Ld.kind !== 'rivulet') for (const S2 of Ld.lines) { line(S2.map((s) => [s[0], s[1]]), '#2a2420', Math.max(2, Ld.w * px)); const [a, b] = P(S2[0][0], S2[0][1]); g.fillStyle = '#fff'; g.font = '13px sans-serif'; if (a > 0 && a < S && b > 0 && b < S) g.fillText(Ld.id, a + 4, b - 4); }
  if (fp.stair) for (const e of fp.stair.plan.els) {
    const [a, b] = P(e.cx, e.cz); g.save(); g.translate(a, b); g.rotate(Math.atan2(e.uz, e.ux));
    if (e.rest?.buried) { g.strokeStyle = 'rgba(80,70,60,0.5)'; g.lineWidth = 1; g.strokeRect(-e.hd * px, -e.hw * px, 2 * e.hd * px, 2 * e.hw * px); } else { g.fillStyle = e.kind === 2 ? '#3a2f3a' : e.kind === 3 ? '#556' : '#cfc6b8'; g.fillRect(-e.hd * px, -e.hw * px, 2 * e.hd * px, 2 * e.hw * px); } g.restore();
  }
  for (const a of fp.ascents?.list || []) {
    const p0 = a.path[0], p1 = a.path.find((q) => Math.hypot(q[0] - p0[0], q[1] - p0[1]) > 0.5) || a.path[1]; const [x0, y0] = P(p0[0], p0[1]), [x1, y1] = P(p1[0], p1[1]), ang = Math.atan2(y1 - y0, x1 - x0);
    g.strokeStyle = g.fillStyle = '#e02020'; g.lineWidth = 3; g.beginPath(); g.arc(x0, y0, 6, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(ang) * 40, y0 + Math.sin(ang) * 40); g.stroke();
    g.font = '14px sans-serif'; g.fillText(`${a.id} (up)`, x0 + 10, y0 + 18);
  }
  line(trail, '#ff8a00', 2.5);
  g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(`plan ${2 * half} m across, north up, centre (${cx.toFixed(0)}, ${cz.toFixed(0)}); orange: the walk; red: an ascent's first point and its climb`, 8, S - 10);
  return c.toDataURL('image/png').split(',')[1];
}, { trail, half, end: [last.x, last.z] });
writeFileSync(`shots/wip/${prefix}-plan.png`, Buffer.from(png, 'base64'));
console.log(`[saved] shots/wip/${prefix}-plan.png`);
await browser.close();
