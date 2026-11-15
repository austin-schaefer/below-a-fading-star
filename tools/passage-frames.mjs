#!/usr/bin/env node
// Stills along the Bearers' Way (v14-D1): a judge's tool, not a gate. One page load; the eye held at walking height on
// the passage's floor at distances s along it (src/v14/passage/plan.js), looking ahead, back, up, down or round, the
// sun's guttering held off as tools/views.mjs does. Stills only: the walked frames are tools/passage-walk.mjs's.
//   node tools/passage-frames.mjs [base=http://localhost:8123] [set=route|around|chamber|mouth] [q=low] [prefix=passage]
// route: every 10 m looking ahead, and at five points looking back and up. around: six points, six directions each
// (ahead, right, back, left, up, down). chamber: the room from its two ways in and over the work. mouth: the portal
// from the Pit's floor and from the Gate. Frames go to shots/wip/<prefix>-<set>-<q>-NN-<what>.png, in order; prints
// each with the draw calls, the share of the frame under 8/255 and the median luma.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', set = 'route', q = 'low', prefix = 'passage', extra = ''] = process.argv.slice(2);
mkdirSync('shots/wip', { recursive: true });
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=${q}&pos=246.7,40&yaw=3.14${extra}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; fp.events.dispatchEvent(new CustomEvent('begin')); });
const SP = await page.evaluate(() => window.__fp.passage.plan.SP);
const DIRS = { ahead: [0, 0], right: [-Math.PI / 2, 0], back: [Math.PI, 0], left: [Math.PI / 2, 0], up: [0, 1.25], down: [0, -1.1], backup: [Math.PI, 0.55], aheadup: [0, 0.55] };
const views = [];
const v = (name, s, dir, o = {}) => views.push({ name, s, dir, ...o });
if (set === 'route') {
  v('nave-door', -7, 'ahead');
  for (let s = 0, k = 0; s <= SP.L; s += 10, k++) v(`s${String(Math.round(s)).padStart(3, '0')}`, s, 'ahead');
  for (const s of [12, 40, SP.SUN, SP.GULF0 + 9, SP.L - 6]) { v(`s${String(Math.round(s)).padStart(3, '0')}-back`, s, 'back'); v(`s${String(Math.round(s)).padStart(3, '0')}-backup`, s, 'backup'); }
} else if (set === 'around') {
  for (const s of [6, 34, SP.SUN + 2, SP.GULF0 + 8, SP.GULF1 + 1.5, SP.L - 8]) for (const d of ['ahead', 'right', 'back', 'left', 'up', 'down']) v(`s${String(Math.round(s)).padStart(3, '0')}-${d}`, s, d);
} else if (set === 'chamber') {
  v('in', SP.SUN - 6.2, 'ahead', { pitch: -0.32 });
  v('near', SP.SUN - 3.5, 'ahead', { pitch: -0.5 });
  v('work', SP.SUN - 1.2, 'ahead', { yawOff: -0.9, pitch: -0.62, d: -1.4 });
  v('over', SP.SUN + 0.4, 'down', { d: -1.9 });
  v('back', SP.SUN + 5.6, 'back', { pitch: -0.35 });
  v('dome', SP.SUN, 'up');
} else if (set === 'mouth') {
  v('gate-out', SP.L - 9, 'ahead');
  v('gate-sill', SP.L - 2, 'ahead', { pitch: -0.1 });
  v('pit-floor', SP.L + 6, 'back', { pitch: 0.12 });
  v('pit-across', 0, 'at', { b: 200, r: 8.5, pitch: 0.12 });
  v('pit-west', 0, 'at', { b: 320, r: 8, pitch: 0.1 });
  v('pit-east', 0, 'at', { b: 90, r: 8, pitch: 0.1 });
  v('pit-up', SP.L + 3, 'back', { pitch: 0.95 });
}
const prefix2 = `${prefix}-${set}-${q}`;
let n = 0;
for (const w of views) {
  n++;
  const r = await page.evaluate(async (w) => {
    const fp = window.__fp, P = fp.passage.plan, p = fp.player;
    // beyond the line's ends: along its end directions (before s 0 the door's way north; past L out onto the Pit's floor)
    let x, z, y, tx, tz;
    if (w.dir === 'at') { // on the Pit's floor on bearing b, r m from its centre, looking at the portal
      const a = (w.b * Math.PI) / 180; x = 200 + Math.sin(a) * w.r; z = 185 - Math.cos(a) * w.r; y = null;
      tx = P.M[0] - x; tz = P.M[1] - z; const l = Math.hypot(tx, tz); tx /= l; tz /= l;
    } else if (w.s < 0) { const a = P.at(0); tx = a.tx; tz = a.tz; x = a.x + tx * w.s; z = a.z + tz * w.s; y = null; }
    else if (w.s > P.L) { const a = P.at(P.L); tx = a.tx; tz = a.tz; x = a.x + tx * (w.s - P.L); z = a.z + tz * (w.s - P.L); y = null; }
    else { const a = P.at(w.s); tx = a.tx; tz = a.tz; x = a.x; z = a.z; y = P.yAt(w.s); }
    if (w.d) { const l = Math.hypot(tx, tz); x += (-tz / l) * w.d; z += (tx / l) * w.d; }
    fp.controls.placeAt(x, z, y === null ? undefined : y + 0.02);
    const at = p.pos.clone();
    const rel = fp.controls.carry({ step(pos) { pos.copy(at); } });
    const D = { at: [0, 0], ahead: [0, 0], right: [-Math.PI / 2, 0], back: [Math.PI, 0], left: [Math.PI / 2, 0], up: [0, 1.25], down: [0, -1.1], backup: [Math.PI, 0.55], aheadup: [0, 0.55] }[w.dir];
    p.yaw = Math.atan2(-tx, -tz) + D[0] + (w.yawOff || 0); p.pitch = w.pitch ?? D[1];
    await new Promise((res) => setTimeout(res, w.settle ?? 1800));
    fp.renderer.shadowMap.needsUpdate = true;
    fp.renderer.info.reset(); fp.post.composer.render();
    const calls = fp.renderer.info.render.calls;
    const c = document.getElementById('scene'), url = c.toDataURL('image/png');
    // the frame's darkness: a small copy's luma
    const k = document.createElement('canvas'); k.width = 160; k.height = 90; const g = k.getContext('2d'); g.drawImage(c, 0, 0, 160, 90);
    const d = g.getImageData(0, 0, 160, 90).data, L = [];
    for (let i = 0; i < d.length; i += 4) L.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    L.sort((a, b) => a - b);
    const black = L.filter((v) => v < 8).length / L.length;
    const feet = p.pos.y - p.eye, here = fp.below?.here ?? 0;
    rel();
    return { url, calls, black, med: L[L.length >> 1], feet, here, x: p.pos.x, z: p.pos.z };
  }, w);
  const out = `shots/wip/${prefix2}-${String(n).padStart(2, '0')}-${w.name}.png`;
  writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  console.log(`[saved] ${out} calls=${r.calls} black<8=${(r.black * 100).toFixed(1)}% median=${r.med.toFixed(0)} feet=${r.feet.toFixed(2)} below=${r.here.toFixed(2)} at ${r.x.toFixed(1)},${r.z.toFixed(1)}`);
}
await browser.close();
