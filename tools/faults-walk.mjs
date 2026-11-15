#!/usr/bin/env node
// The heights' faults walked (v14-B2: #41 #47 #48 #49 #51): a judge's tool, not a gate. One page, "Go out", the view
// clicked (the mouse captured where the browser allows it, else the page's drag-to-look), then for each place: put at
// its start (as the settings map would), turned toward the thing with the mouse, and walked at it on W, steering with
// the mouse, frames in order at the distances given; a last frame or two side-stepping on A at the nearest (the view
// moving, where a flicker shows). Frames: shots/wip/<prefix>-<place>-NN-<what>.png.
//   node tools/faults-walk.mjs [base=http://localhost:8123] [prefix=faults] [q=low] [only=gnomon,bridge,lamp,chain,slabs]
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', prefix = 'faults', q = 'low', onlyArg = ''] = process.argv.slice(2);
const only = onlyArg ? onlyArg.split(',') : null;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base.replace(/\/?(\?.*)?$/, '')}/?q=${q}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready') && window.__fp, null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
await sleep(500);
await page.mouse.click(640, 360);
await sleep(600);
const locked = await page.evaluate(() => !!document.pointerLockElement);
console.log(`pointer captured: ${locked}`);
await page.evaluate(() => { const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, pitch: p.pitch }; });
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let mx = 640, my = 360;
async function turn(dyaw, dpitch) {
  const SENS = 0.0021, px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (!locked) { mx = 640; my = 360; await page.mouse.move(mx, my); await page.mouse.down(); }
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  if (!locked) await page.mouse.up();
}
async function face(t) { for (let k = 0; k < 3; k++) { const s = await st(); const dy = wrap(Math.atan2(-(t.x - s.x), -(t.z - s.z)) - s.yaw), dp = Math.atan2(t.y - s.y, Math.hypot(t.x - s.x, t.z - s.z)) - s.pitch; if (Math.abs(dy) < 0.03 && Math.abs(dp) < 0.03) return; await turn(dy, dp); await sleep(60); } }
let n = 0, place = '';
async function shot(what) { n++; const f = `shots/wip/${prefix}-${place}-${String(n).padStart(2, '0')}-${what}.png`; await sleep(250); await page.screenshot({ path: f }); const s = await st(); console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.y.toFixed(1)}, ${s.z.toFixed(1)})`); }
// walk at `look` (the thing) on W, steering at it, a frame at each of `stops` (m, level distance to `to`)
async function approach(to, look, stops) {
  const todo = [...stops].sort((a, b) => b - a);
  await face(look); await shot(`at-${todo[0] + 1}m`);
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 600 && todo.length; i++) {
    const s = await st(), d = Math.hypot(to.x - s.x, to.z - s.z);
    if (d <= todo[0]) { await page.keyboard.up('KeyW'); await face(look); await shot(`${todo.shift()}m`); if (todo.length) await page.keyboard.down('KeyW'); continue; }
    await face(look);
    await sleep(50);
  }
  await page.keyboard.up('KeyW');
}
async function sidestep(look, ms = 700) { await page.keyboard.down('KeyA'); await sleep(ms / 2); await shot('side-moving'); await sleep(ms / 2); await page.keyboard.up('KeyA'); await face(look); await shot('side-after'); }
const PLACES = {
  // #41: the waystone (gnomon) nearest the Lattice's mother crystal, its notch and bead from 10 m in to 1 m
  async gnomon() {
    const g = await page.evaluate(async () => {
      const fp = window.__fp, { LANDMARKS: L } = await import('/src/world.js');
      const m = L.moraine, H = fp.roads.heads, M = new fp.THREE.Matrix4(), P = new fp.THREE.Vector3(), Q = new fp.THREE.Quaternion(), S = new fp.THREE.Vector3();
      let best = -1, bd = Infinity;
      for (let i = 0; i < H.count; i++) { H.getMatrixAt(i, M); P.setFromMatrixPosition(M); const d = Math.hypot(P.x - m.x, P.z - m.z); if (d < bd) { bd = d; best = i; } }
      H.getMatrixAt(best, M); M.decompose(P, Q, S);
      const zf = new fp.THREE.Vector3(0, 0, 1).applyQuaternion(Q), t = { x: P.x, y: P.y + 0.45 * S.y, z: P.z }; // the notch's face, along the head's z
      const sx = t.x + zf.x * 11, sz = t.z + zf.z * 11;
      fp.controls.placeAt(sx, sz);
      return { to: { x: t.x, z: t.z }, look: { x: t.x, y: t.y + 0.25, z: t.z } };
    });
    await sleep(800);
    await approach(g.to, g.look, [10, 5, 2.5, 1.2]);
    await sidestep(g.look);
  },
  // #47: the icefall's bridge (a lead on its side): from the block's end across to T2's lip, then from below and both ends
  async bridge() {
    const b = await page.evaluate(async () => {
      const fp = window.__fp, { BRIDGE } = await import('/src/v12/icefall/plan.js');
      const [A, B] = BRIDGE.pts;
      const ux = B[0] - A[0], uz = B[1] - A[1], l = Math.hypot(ux, uz);
      fp.controls.placeAt(A[0] - ux / l * 2, A[1] - uz / l * 2, A[2]);
      return { A, B, to: { x: B[0], z: B[1] }, look: { x: B[0], y: B[2] + 0.6, z: B[1] } };
    });
    await sleep(800);
    await approach(b.to, b.look, [14, 9, 4]);
    // the ends and below: stood, then the view turned back along it
    await face({ x: b.A[0], y: b.A[2] - 1, z: b.A[1] }); await shot('back-along');
    await turn(0, -0.5); await shot('down-at-it');
  },
  // #49: the lamp-tender's lamp on its hook at the top of the Diffident Stair, from the deck's far end to 1 m
  async lamp() {
    const l = await page.evaluate(() => {
      const fp = window.__fp, S = fp.stair; const top = S.top || S;
      const L = top.lamp; L.phase = 'home'; L.t = 1;
      const d = top.deck, lamp = fp.scene.getObjectByName('stair-lamp');
      top.update?.(0, 0);
      const A = d.A; fp.controls.placeAt((A.x0 + A.x1) / 2, A.z1 - 0.6, d.y);
      return { to: { x: lamp.position.x, z: lamp.position.z }, look: { x: lamp.position.x, y: lamp.position.y, z: lamp.position.z } };
    });
    await sleep(1500);
    await approach(l.to, l.look, [5, 2.5, 1.3]);
    await sidestep(l.look);
  },
  // #51: the middle boom's tip chain past the gallery's deck, from the owner's place (-378, -37) along the deck
  async chain() {
    const c = await page.evaluate(() => {
      const fp = window.__fp, ch = fp.galleries.geo.chains[3], L = fp.lift;
      const q = L.gal.at(2, 0.0, 3.2); fp.controls.placeAt(q.x, q.z, L.gal.y);
      return { to: { x: ch.A[0], z: ch.A[2] }, look: { x: ch.A[0], y: L.gal.y + 1.2, z: ch.A[2] } };
    });
    await sleep(1500);
    await approach(c.to, c.look, [8, 4, 2]);
    await turn(0, 0.5); await shot('up-the-chain');
    await face({ x: c.look.x, y: c.look.y - 2.5, z: c.look.z }); await shot('down-past-the-deck');
    await sidestep(c.look);
  },
  // #48: the Diffident Stair's slabs in the turf where they ran into a tor: from (272, -18) facing north-east, walked up the line
  async slabs() {
    await page.evaluate(() => { window.__fp.controls.placeAt(272, -18); });
    await sleep(1500);
    const look = { x: 290, y: 8, z: -24 };
    await face(look); await shot('owner-view');
    await approach({ x: 286, z: -21 }, look, [10, 5]);
  },
};
for (const [k, f] of Object.entries(PLACES)) {
  if (only && !only.includes(k)) continue;
  place = k; n = 0;
  try { await f(); } catch (e) { console.log(`${k}: failed: ${e.message}`); }
}
if (errors.length) console.log('page errors:', errors.slice(0, 3).join(' | '));
await browser.close();
