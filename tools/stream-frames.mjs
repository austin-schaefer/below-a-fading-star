#!/usr/bin/env node
// Frames in order along running water (v17 W1), for judging it moving: a walker on the bank going down a stream of the
// kit (src/v17/stream.js) at walking pace on the page's own clock, and across it, then contact sheets of the frames in
// order (12 to a sheet, numbered) for a reader who is shown nothing else.
//   node tools/stream-frames.mjs <base> <q> <stream> <prefix> [mode=down|across] [opts]
//   down:   from the stream's start to its end, `step` m a frame (default 1.4), the eye on the bank `off` m out from the
//           water's edge (default 2.2; `side` left|right of downstream, default left), looking down the stream and
//           `turn` rad toward the water (default 0.45), pitch `pitch` (default -0.28)
//   up:     as down, from its end to its start, looking up the stream (a weir's white water faces this way)
//   across: at each station `at` (x,z;x,z: the nearest points of the stream), from `span` m one side to `span` m the other
//           (default 9), `step` m a frame, looking the way it walks
//   hold:   one stand `at` (x,z) with `yaw` and `pitch`, `n` frames (default 12) `ms` apart (the water moving, the eye still)
//   opts as key=value after the mode: step, off, side, turn, pitch, at, span, ms (real ms between frames, default 1000:
//   1.4 m a second is a walk), from, to (s range, metres along the stream)
// The eye stands on the walker's floor there (the ground, or a deck over it: the leat's bridge), as controls.floorAt finds it.
// Writes shots/wip/<prefix>-NNN.png (1280x720) and shots/wip/<prefix>-sheet-N.png. Holds the sun's guttering off.
import { launch } from './launch.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const [base, q = 'medium', name = 'brook', prefix = 'stream', mode = 'down', ...rest] = process.argv.slice(2);
if (!base) { console.log('usage: stream-frames.mjs <base> <q> <stream> <prefix> [down|across] [key=value ...]'); process.exit(2); }
const O = Object.fromEntries(rest.map((a) => a.split('=')));
const step = +(O.step ?? 1.4), ms = +(O.ms ?? 1000);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=${q}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
// the stands, from the kit's own samples
const stands = await page.evaluate(async ({ name, mode, O, step }) => {
  const B = await import('/src/v17/bodies.js');
  const st = B.STREAMS.find((s) => s.name === name);
  if (!st) throw new Error('no stream ' + name);
  const out = [], yawOf = (dx, dz) => Math.atan2(-dx, -dz);
  const atS = (s) => { const k = Math.max(0, Math.min(st.n - 1, Math.round(s / 0.5))); return k; };
  if (mode === 'down' || mode === 'up') {
    const side = O.side === 'right' ? -1 : 1, off = +(O.off ?? 2.2), turn = +(O.turn ?? 0.45), pitch = +(O.pitch ?? -0.28);
    const s0 = +(O.from ?? 0), s1 = +(O.to ?? st.length);
    for (let s = s0; s <= s1; s += step) {
      const k = atS(s), tx = st.TX[k], tz = st.TZ[k], hw = side > 0 ? st.HWL[k] : st.HWR[k];
      const d = side * (hw + off), x = st.X[k] + tz * d, z = st.Z[k] - tx * d;
      out.push({ x, z, yaw: mode === 'up' ? yawOf(-tx, -tz) - side * turn : yawOf(tx, tz) + side * turn, pitch, s });
    }
    if (mode === 'up') out.reverse();
  } else if (mode === 'hold') {
    // one stand, `n` frames (default 12) `ms` apart: the water moving while the eye does not
    const [x, z] = (O.at || '').split(',').map(Number);
    for (let i = 0; i < +(O.n ?? 12); i++) out.push({ x, z, yaw: +(O.yaw ?? 0), pitch: +(O.pitch ?? -0.3), s: 0 });
  } else {
    const span = +(O.span ?? 9), pitch = +(O.pitch ?? -0.3);
    for (const p of (O.at || '').split(';').filter(Boolean)) {
      const [px, pz] = p.split(',').map(Number), s = st.sOf(px, pz), k = atS(s), tx = st.TX[k], tz = st.TZ[k];
      // walk from the right bank to the left (+d), looking the way it walks
      for (let d = -span; d <= span + 1e-6; d += step) out.push({ x: st.X[k] + tz * d, z: st.Z[k] - tx * d, yaw: yawOf(tz, -tx), pitch, s });
    }
  }
  return out;
}, { name, mode, O, step });
const files = [];
for (let i = 0; i < stands.length; i++) {
  const v = stands[i];
  await page.evaluate((v) => { const fp = window.__fp, p = fp.player; const h = fp.terrain.heightAt(v.x, v.z), fl = fp.controls?.floorAt ? fp.controls.floorAt(v.x, v.z, h + 1.2).y : h; p.pos.set(v.x, Math.max(h, fl) + p.eye, v.z); p.yaw = v.yaw; p.pitch = v.pitch; if (p.vel) p.vel.set(0, 0, 0); }, v);
  await page.waitForTimeout(ms);
  const url = await page.evaluate(() => { const fp = window.__fp; fp.renderer.shadowMap.needsUpdate = true; fp.post.composer.render(); return document.getElementById('scene').toDataURL('image/png'); });
  const f = `shots/wip/${prefix}-${String(i).padStart(3, '0')}.png`;
  writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  files.push(f);
}
console.log(`[frames] ${files.length} frames, ${files[0]} .. ${files[files.length - 1]}`);
// contact sheets: 12 frames (4 by 3) a sheet, numbered, in order
const per = 12;
for (let sh = 0; sh * per < files.length; sh++) {
  const imgs = files.slice(sh * per, sh * per + per).map((f, j) => `<div><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><b>${sh * per + j + 1}</b></div>`).join('');
  const sp = await browser.newPage({ viewport: { width: 1920, height: 810 } });
  await sp.setContent(`<style>body{margin:0;background:#000;display:grid;grid-template-columns:repeat(4,480px);gap:0}div{position:relative;width:480px;height:270px}img{width:480px;height:270px;display:block}b{position:absolute;left:6px;top:4px;color:#fff;font:bold 18px sans-serif;text-shadow:0 0 3px #000}</style>${imgs}`);
  const out = `shots/wip/${prefix}-sheet-${sh + 1}.png`;
  await sp.screenshot({ path: out });
  await sp.close();
  console.log(`[sheet] ${out}`);
}
await browser.close();
