#!/usr/bin/env node
// Writes tools/views-v15-row.json: the Strake's views for tools/views.mjs, from the row's own frame (src/v15/row.js
// ROW, ROW_PLOTS), so they follow the row when the plan moves it.   node tools/views-v15-row.mjs
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
// the frame: the plan's STRAKE (src/v15/plan.js: the middle of its five fronts, its face), as src/v15/row.js stands on
// it when the Lappet's bones are built; `ROW=1` the row's own ROW, where it stands without them
const src = readFileSync(new URL('../src/v15/row.js', import.meta.url), 'utf8');
let ROW = eval('(' + src.match(/export const ROW = (\{[^}]+\})/)[1] + ')'), widths = [...src.matchAll(/kind: '(\w+)', w: ([\d.]+)/g)].map((m) => [m[1], +m[2]]);
let yaw = Math.PI - (ROW.bearing * Math.PI) / 180;
if (!process.env.ROW) {
  const P = await import('../src/v15/plan.js'), S = P.STRAKE, slots = S.slots.map((n) => P.plot(n)), KIND = { house: 'late', shop: 'undercroft', 'new-house': 'new', carrier: 'carrier' };
  ROW = { x: slots.reduce((q, p) => q + p.x + S.face[0] * p.d / 2, 0) / slots.length, z: slots.reduce((q, p) => q + p.z + S.face[1] * p.d / 2, 0) / slots.length };
  yaw = Math.atan2(S.face[0], S.face[1]);
  // (local x runs to the right of someone facing the fronts: the slots in the order they meet it)
  const lx = (p) => (p.x - ROW.x) * Math.cos(yaw) - (p.z - ROW.z) * Math.sin(yaw);
  widths = slots.slice().sort((p, q) => lx(p) - lx(q)).map((p) => [p.hand === 'elder' ? 'elder' : KIND[p.kind], p.w]);
}
const cy = Math.cos(yaw), sy = Math.sin(yaw);
const at = (lx, lz) => ({ x: +(ROW.x + lx * cy + lz * sy).toFixed(2), z: +(ROW.z - lx * sy + lz * cy).toFixed(2) });
// look from local (lx, lz) at local (tx, tz)
const view = (name, lx, lz, tx, tz, pitch = 0.08, extra = {}) => { const p = at(lx, lz), t = at(tx, tz); return { name, ...p, yaw: +Math.atan2(-(t.x - p.x), -(t.z - p.z)).toFixed(3), pitch, ...extra }; };
const len = widths.reduce((s, w) => s + w[1], 0), views = [];
let x = -len / 2;
// held at the walker's eye over the flags' level, wherever the ground is (the bench is narrow: 6 m out is over the ha-ha)
const hold = (p) => `(()=>{const fp=window.__fp;window.__hold&&window.__hold();const Y=fp.village.row.frame.y+fp.player.eye;window.__hold=fp.controls.carry({step(pos){pos.set(${p.x},Y,${p.z});}});})()`;
const free = '(()=>{window.__hold&&window.__hold();window.__hold=null;})()';
const G = ';window.__fp.sky.flicker.hold=0.3;window.__fp.sky.flicker.value=0.3';
const held = (v, g) => ({ ...v, js: hold(v) + (g ? G : '') }), loose = (v) => ({ ...v, js: free });
// local x runs west along the street (the right of someone facing the fronts), local z out from the fronts' line
views.push(held(view('from-east', -len / 2 - 2.2, 1.5, 0, 0.2, 0.12)), held(view('from-west', len / 2 + 5, 1.2, 0, 0.3, 0.1)));
views.push(held(view('front-14', 0, 14, 0, -2, 0.12)), held(view('front-22', -1, 22, 0, -2, 0.1)));
for (const [kind, w] of widths) { views.push(held(view(`six-${kind}`, x + w / 2 + 0.6, 6.2, x + w / 2, -2, 0.2))); views.push(held(view(`close-${kind}`, x + w / 2 - 1.3, 2.3, x + w / 2 + 0.3, -2, 0.16))); x += w; }
views.push(held(view('gutter-front', 0, 14, 0, -2, 0.12), true), held(view('gutter-street', -len / 2 - 2.2, 1.5, 0, 0.2, 0.12), true), held(view('gutter-from-west', len / 2 + 5, 1.2, 0, 0.3, 0.1), true));
views.push(held(view('west-end', len / 2 + 11, -1, len / 2 - 6, -2, 0.1)), loose(view('front-60', -6, 60, 0, -2, 0.1)), loose(view('back-above', 0, -30, 0, 0, -0.25)));
// from the tread behind (the Low Rung, on the plan): along the backs each way, and down onto the roofs from mid-row
const up = (v, dy) => ({ ...v, js: hold(v).replace('fp.village.row.frame.y+', `fp.village.row.frame.y+${dy}+`) }); // (held a tread up: the Low Rung is 2.9 m over the bench)
views.push(up(view('tread-along-east', len / 2 + 1.5, -4.6, -len / 2, -3.0, -0.3), 2.9), up(view('tread-along-west', -len / 2 - 1.5, -4.6, len / 2, -3.0, -0.3), 2.9), up(view('tread-down', 0, -7, 0, -1, -0.5), 2.9), up(view('tread-high', 2, -9, 0, 0, -0.45), 6.5));
writeFileSync(new URL('./views-v15-row.json', import.meta.url), JSON.stringify(views, null, 1));
console.log(views.length, 'views');
