#!/usr/bin/env node
// The Lappet's folk from 20 m (v16-V1, the critic's "from 20 m only 2 of 8 can be framed"): for each of the eight
// (src/v15/people/folk.js), every standpoint on a ring 20 m out (every 10 degrees, every floor there within 10 m of
// theirs: the ground, a deck, a roof walked), with a ray from the eye (1.72 m) to their head, their chest and their
// tell (what of them carries: `tell` on their FOLK entry, a point in their own frame) against everything in the scene but the
// sky, the fog, the lures and the folk themselves. Prints, a line each, how many standpoints see the head or chest
// clear and how many see the tell, and frames the best one (most of the three clear; ties: within 3 m of their level,
// then the nearest to straight in front of them) looking at them, 1280 x 720, into shots/wip/<prefix>-<id>.png. A judge's tool, not a gate.
//   node tools/folk-frames.mjs [base] [prefix=v16-V1-folk] [q=medium] [only=id,id]
import { ANGLE } from './launch.mjs';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const [base = 'http://localhost:8123', prefix = 'v16-V1-folk', q = 'medium', only = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=${q}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp?.people?.figs, null, { timeout: 300000 });
await page.evaluate(() => {
  const fp = window.__fp; fp.events.dispatchEvent(new CustomEvent('begin')); document.getElementById('card')?.classList.add('hidden');
  for (const k of ['place', 'hint']) { const e = document.getElementById(k); if (e) e.style.visibility = 'hidden'; }
  fp.sky.flicker.next = 1e9;
});
const figs = await page.evaluate(() => window.__fp.people.figs.map((f) => f.id));
const rows = [];
for (const id of figs) {
  if (only && !only.split(',').includes(id)) continue;
  const r = await page.evaluate(async (id) => {
    const fp = window.__fp, T = fp.THREE, F = fp.people.figs.find((f) => f.id === id), f = F.fig, k = f.k;
    const tellAt = (await import('/src/v15/people/folk.js')).FOLK.find((q) => q.id === id)?.tell;
    const skip = /^(sky|stars?|clouds?|fog|haze)|lure|grass|moth|bird|dust|smoke|halo|lappet-people/i;
    const meshes = []; fp.scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !skip.test(o.name || '') && !skip.test(o.parent?.name || '')) meshes.push(o); });
    f.placeNow();
    const tell = tellAt ? f.toWorld(new T.Vector3(...tellAt), new T.Vector3()) : null;
    const targets = [new T.Vector3(f.x, f.y + 1.55 * k, f.z), new T.Vector3(f.x, f.y + 1.1 * k, f.z), ...(tell ? [tell] : [])];
    const rc = new T.Raycaster(), dir = new T.Vector3();
    const clear = (eye, t) => { dir.subVectors(t, eye); const d = dir.length(); rc.set(eye, dir.normalize()); rc.far = d - 0.35; return rc.intersectObjects(meshes, false).length === 0; };
    const out = [];
    for (let a = 0; a < 360; a += 10) {
      const ar = (a * Math.PI) / 180, x = f.x + 20 * Math.sin(ar), z = f.z + 20 * Math.cos(ar), ys = new Set();
      for (let h = f.y - 10; h <= f.y + 10; h += 0.8) { const fl = fp.controls.floorAt(x, z, h, true); if (fl && Number.isFinite(fl.y) && fl.y <= h + 0.6 && fl.y >= h - 1.3 && Math.abs(fl.y - f.y) < 10) ys.add(Math.round(fl.y * 10) / 10); }
      for (const y of ys) {
        const eye = new T.Vector3(x, y + 1.72, z), see = targets.map((t) => clear(eye, t));
        const front = Math.abs(Math.atan2(Math.sin(ar - f.yaw), Math.cos(ar - f.yaw)));
        out.push({ a, x: +x.toFixed(2), z: +z.toFixed(2), y, body: see[0] || see[1], n: see.filter(Boolean).length, tell: tell ? see[2] : null, front });
      }
    }
    out.sort((p, q) => q.n - p.n || (Math.abs(p.y - f.y) > 3) - (Math.abs(q.y - f.y) > 3) || p.front - q.front);
    return { id, name: F.name, at: [f.x, f.y, f.z], tellAt: tell && [tell.x, tell.y, tell.z], stands: out.length, body: out.filter((o) => o.body).length, tell: tell ? out.filter((o) => o.tell).length : null, best: out[0] };
  }, id);
  rows.push(r);
  const b = r.best;
  if (b) {
    await page.evaluate(([b, at]) => {
      const fp = window.__fp, P = fp.player; fp.controls.placeAt(b.x, b.z, b.y); P.vel.set(0, 0, 0);
      const dx = at[0] - b.x, dz = at[2] - b.z; P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(at[1] + 1.1 - (b.y + 1.72), Math.hypot(dx, dz));
    }, [b, r.at]);
    await page.waitForTimeout(2500);
    const url = await page.evaluate(() => { window.__fp.post.composer.render(); return document.getElementById('scene').toDataURL('image/png'); });
    writeFileSync(`shots/wip/${prefix}-${id}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(`${id.padEnd(12)} standpoints ${String(r.stands).padStart(3)}  body seen from ${String(r.body).padStart(3)}  tell seen from ${r.tell ?? '-'}  best ${JSON.stringify(b)}  -> shots/wip/${prefix}-${id}.png`);
}
console.log(`framed from 20 m (head or chest clear from some standpoint): ${rows.filter((r) => r.body > 0).length} of ${rows.length}; findable (body or tell): ${rows.filter((r) => r.body > 0 || r.tell > 0).length} of ${rows.length}`);
await browser.close();
