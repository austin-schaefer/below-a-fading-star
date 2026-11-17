#!/usr/bin/env node
// Shore walk (v17, the owner's #1712): the sun's shadows must not jump from footstep to footstep. Walks 12 steps of
// 0.75 m forward from a stand, then 12 back, on the page's own frame loop (the shadow map keeps its own cadence: no
// redraw is forced), and takes a frame at each step. The lower half of each frame (the ground ahead) is reduced to a
// mean luminance; a step whose change is more than 3 times the median step (and over 3 of 255) is a jump.
//   SHOT_ANGLE=metal nice -n 10 node tools/shore-walk-test.mjs <base> [q=medium] [outDir] [extra url params]
// Before the walk, at each stand, the box row: the view is held while the walker's look turns (the shadow box sits
// 40 m ahead of the look), the map redrawn, and the held view's lower half may change by at most 1 of 255: what is in
// shadow must not depend on where the box is (the #1712 cause: a caster far up-sun slid through the box's near plane
// as the walker stepped and turned; ?shadowdepth=v16 brings it back, and this row fails on it by 12).
// Rows: the east shore (-21, 104) facing SE (the owner's), the pool's north shore, the fen's west shore.
// Env: ROWS=a,b; YAW= (override); STEPS=, STRIDE=; KEYS=1 walks on the keys (W, then S back); SAVE=1 writes the
// frames to outDir as shore-<row>-<q>-<i>.png; VERBOSE=1 prints each step's state.
import { launch } from './launch.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const [base = 'http://localhost:8123', q = 'medium', outDir = 'shots/wip', extra = ''] = process.argv.slice(2);
const save = process.env.SAVE === '1', KEYS = process.env.KEYS === '1'; // KEYS=1 walks on the keys
const ROWS = [
  { name: 'east-shore', x: -21, z: 104, yaw: -2.356, js: 'window.__fp.inhabitants2?.galley?.setU(0)' }, // the owner's stand, facing SE toward the great bridge; the galley held at the east end of its loop, 34 m off
  { name: 'tarn-north', x: -100, z: 55, yaw: -1.571 }, // the pool's north shore, walking E along it
  { name: 'fen-west', x: -20, z: 150, yaw: -2.356 }, // the fen's west shore, walking SE toward the Span
].filter((r) => !process.env.ROWS || process.env.ROWS.split(',').includes(r.name));
const STEPS = +(process.env.STEPS || 12), STRIDE = +(process.env.STRIDE || 0.75);

mkdirSync(outDir, { recursive: true });
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const r0 = ROWS[0];
await page.goto(`${base}/?q=${q}&pos=${r0.x},${r0.z}&yaw=${r0.yaw}${extra}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => {
  document.getElementById('card')?.classList.add('hidden');
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
});

let fails = 0, passes = 0;
for (const row of ROWS) {
  if (process.env.YAW) row.yaw = +process.env.YAW;
  const fx = -Math.sin(row.yaw), fz = -Math.cos(row.yaw);
  const pts = [];
  for (let i = 0; i <= STEPS; i++) pts.push(i);
  for (let i = STEPS - 1; i >= 0; i--) pts.push(i);
  const lum = [], info = [];
  // stand at the start and let the page settle (chunks, the map)
  await page.evaluate(({ x, z, yaw, js }) => { const fp = window.__fp, p = fp.player; p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z); p.yaw = yaw; p.pitch = 0; p.vel?.set(0, 0, 0); if (js) (0, eval)(js); }, row);
  await page.waitForTimeout(4000);
  // The box: what is in shadow in this view must not depend on where the shadow box sits. The view is held and the
  // walker's look turned (the box sits 40 m ahead of the look, so it moves by up to 70 m); the map is redrawn there
  // and the held view taken again: its lower half may change by at most 1.0 of 255.
  {
    const q0 = await page.evaluate(() => window.__fp.camera.quaternion.toArray());
    const held = async () => page.evaluate((q0) => {
      const fp = window.__fp, c = document.getElementById('scene');
      fp.camera.quaternion.fromArray(q0); fp.renderer.shadowMap.needsUpdate = true; fp.post.composer.render();
      const w = 192, h = 108, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.drawImage(c, 0, 0, w, h);
      const d = g.getImageData(0, h / 2, w, h / 2).data;
      let L = 0; for (let i = 0; i < d.length; i += 4) L += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return L / (d.length / 4);
    }, q0);
    const L0 = await held();
    let worst = 0, at = 0;
    for (const dy of [-1.2, -0.6, 0.6, 1.2]) {
      await page.evaluate((yaw) => { window.__fp.player.yaw = yaw; }, row.yaw + dy);
      await page.waitForTimeout(900);
      const L = await held();
      if (Math.abs(L - L0) > Math.abs(worst)) { worst = L - L0; at = dy; }
    }
    await page.evaluate((yaw) => { window.__fp.player.yaw = yaw; }, row.yaw);
    await page.waitForTimeout(900);
    const ok = Math.abs(worst) <= 1.0;
    if (ok) passes++; else fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'} shore ${row.name} q=${q} box: the held view's shade with the look turned changes by ${worst.toFixed(2)} at ${at} rad (limit 1.00; lum ${L0.toFixed(1)})`);
  }
  for (let k = 0; k < pts.length; k++) {
    const s = pts[k], x = row.x + fx * s * STRIDE, z = row.z + fz * s * STRIDE;
    // a footstep: the walker moved by the step, as the controls would (y from the floor they stand on)
    if (KEYS && k > 0) { // on the keys: W (or S, coming back) held until the walker has made the step
      const key = k <= STEPS ? 'KeyW' : 'KeyS';
      await page.evaluate(() => { const fp = window.__fp; fp.controls.state.enabled = true; });
      await page.keyboard.down(key);
      await page.waitForFunction(({ x, z, fx, fz, fwd }) => { const p = window.__fp.player; const a = (p.pos.x - x) * fx + (p.pos.z - z) * fz; return fwd ? a > -0.05 : a < 0.05; }, { x, z, fx, fz, fwd: key === 'KeyW' }, { polling: 'raf', timeout: 20000 }).catch(() => {});
      await page.keyboard.up(key);
      await page.evaluate((js) => { if (js) (0, eval)(js); }, row.js);
      await page.waitForTimeout(400);
    } else {
      await page.evaluate(({ x, z, yaw, js }) => { const fp = window.__fp, p = fp.player; p.pos.x = x; p.pos.z = z; p.yaw = yaw; p.pitch = 0; p.vel?.set(0, 0, 0); if (js) (0, eval)(js); }, { x, z, yaw: row.yaw, js: row.js });
      await page.waitForTimeout(700);
    }
    const take = (save) => page.evaluate((save) => {
      const fp = window.__fp, c = document.getElementById('scene'), gm = fp.inhabitants2?.galley?.mesh;
      fp.post.composer.render(); // the frame as it stands: the shadow map at its own cadence
      const w = 192, h = 108, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d'); g.drawImage(c, 0, 0, w, h);
      const d = g.getImageData(0, h / 2, w, h / 2).data;
      let L = 0; for (let i = 0; i < d.length; i += 4) L += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      const a = fp.above, cad = fp.shadowCadence, sl = fp.lights.sun;
      return {
        L: L / (d.length / 4), url: save ? c.toDataURL('image/png') : null,
        x: +fp.player.pos.x.toFixed(2), z: +fp.player.pos.z.toFixed(2), y: +fp.player.pos.y.toFixed(2), floor: +(fp.player.floorBelow ?? NaN).toFixed?.(2), alt: a ? +a.alt.toFixed(1) : null, over: a ? +a.over.toFixed(1) : null,
        sb: sl.shadow.camera.right, galley: gm ? [+gm.position.x.toFixed(1), +gm.position.z.toFixed(1), +gm.position.distanceTo(fp.camera.position).toFixed(1), gm.castShadow] : null, redraws: cad.stats.redraws, light: [sl.position.x, sl.position.y, sl.position.z].map((v) => +v.toFixed(1)),
      };
    }, save);
    // two frames half a second apart, the darker kept: a moth, a wisp or a bird crossing the view is not the ground
    const r = await take(save); await page.waitForTimeout(500); const r2 = await take(false);
    if (r2.L < r.L) r.L = r2.L;
    lum.push(r.L); info.push(r);
    if (save) writeFileSync(`${outDir}/shore-${row.name}-${q}-${String(k).padStart(2, '0')}.png`, Buffer.from(r.url.split(',')[1], 'base64'));
  }
  const d = []; for (let i = 1; i < lum.length; i++) d.push(Math.abs(lum[i] - lum[i - 1]));
  const med = [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)];
  const lim = Math.max(3 * med, 3);
  const worst = d.reduce((m, v, i) => (v > d[m] ? i : m), 0);
  if (process.env.VERBOSE) info.forEach((r, i) => console.log(`  ${row.name} ${i} L=${lum[i].toFixed(2)} ${JSON.stringify({ ...r, L: undefined, url: undefined })}`));
  const ok = d[worst] <= lim;
  if (ok) passes++; else fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} shore ${row.name} q=${q}: worst step ${d[worst].toFixed(2)} at ${worst}->${worst + 1} (median ${med.toFixed(2)}, limit ${lim.toFixed(2)}; lum ${Math.min(...lum).toFixed(1)}..${Math.max(...lum).toFixed(1)})`);
}
await browser.close();
console.log(`=== ${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
