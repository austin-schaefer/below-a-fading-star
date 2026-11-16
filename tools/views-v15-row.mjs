#!/usr/bin/env node
// Writes tools/views-v15-row.json: the Strake's views for tools/views.mjs, from the row's own frame (src/v15/row.js
// ROW, ROW_PLOTS), so they follow the row when the plan moves it.   node tools/views-v15-row.mjs
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/v15/row.js', import.meta.url), 'utf8');
const ROW = eval('(' + src.match(/export const ROW = (\{[^}]+\})/)[1] + ')');
const widths = [...src.matchAll(/kind: '(\w+)', w: ([\d.]+)/g)].map((m) => [m[1], +m[2]]);
const b = (ROW.bearing * Math.PI) / 180, yaw = Math.PI - b, cy = Math.cos(yaw), sy = Math.sin(yaw);
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
writeFileSync(new URL('./views-v15-row.json', import.meta.url), JSON.stringify(views, null, 1));
console.log(views.length, 'views');
