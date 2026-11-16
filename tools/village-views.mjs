#!/usr/bin/env node
// Writes tools/views-v15-village.json from the Lappet's plan (src/v15/plan.js), so the views move with the plan:
// the far views, then a street-level view at each level and each way. A view that stands on a tread or a way holds
// the eye there with a carry (its `js`), as tools/views-v12-heights.json does.
//   node tools/village-views.mjs            then: node tools/views.mjs tools/views-v15-village.json shots/wip v15-V0 low
import { writeFileSync } from 'node:fs';
import * as P from '../src/v15/plan.js';
const EYE = 1.72, r3 = (v) => Math.round(v * 1000) / 1000;
const views = [
  { name: 'far-east', x: 135, z: 5, yaw: 1.387, pitch: 0.08 },
  { name: 'far-north', x: 50, z: -75, yaw: -2.863, pitch: 0.08 },
  { name: 'far-kerb', x: 128, z: 5, yaw: 1.19, pitch: 0.1 },
  { name: 'from-house-corner', x: 112, z: -28, yaw: 0.9, pitch: 0.15 },
  { name: 'from-spawn', x: 2, z: 35, yaw: -1.57, pitch: 0.1 },
];
// stand at (run, s, D) with the feet at y, looking at (run, s, D) `to` with the eye pitched
function view(name, from, y, to, pitch = 0) {
  const [x, z] = P.at(...from), [tx, tz] = to.length === 3 ? P.at(...to) : to;
  const v = { name, x: r3(x), z: r3(z), yaw: r3(P.yawOf(tx - x, tz - z)), pitch };
  if (y !== null) v.js = `(() => { const fp = window.__fp; fp.controls.carry({ step(pos) { pos.set(${r3(x)}, ${r3(y + EYE)}, ${r3(z)}); } }); })()`;
  views.push(v);
}
const L = P.LEVEL, S = P.STAIR.s, tb = P.way('noon-main'), ld = P.way('rungs-ladder'), br = P.way('lane-bridge'), ls = P.way('lees-stair');
// the levels
view('level-crown', [1, 14, -9], L.crown.y, [1, 34, -6], -0.08);
view('level-high', [1, 10, 0.5], L.high.y, [1, 36, 1], -0.05);
view('level-mid', [1, 12, 8.6], L.mid.y, [1, 34, 8.4], -0.02);
view('level-low', [1, 12, 14.2], L.low.y, [1, 34, 13.6], 0);
view('level-lees', [1, 14, 21], null, [1, 34, 19], 0.12);
view('level-pennyworth', [2, 16, 30], null, [2, 2, 22], 0.2);
// the Heliarch stair, from the bottom up
view('stair-from-square', [1, S - 4.5, 23.6], null, [1, S, 10], 0.3);
view('stair-foot', [1, S + 3.2, 22.5], null, [1, S, 16], 0.3);
view('stair-bastion', [1, S, 16.6], L.low.y, [1, S, 9], 0.42);
view('stair-under-timber', [1, S - 6, 11.6], L.low.y, [1, S + 2, 11.6], 0.12);
view('stair-landing', [1, S - 0.4, 9.4], L.mid.y, [1, S, 3], 0.45);
view('stair-slot', [1, S - 5, 0.6], L.high.y, [1, S, 4.6], -0.3);
view('stair-head-below', [1, S - 9, -1.6], L.high.y, [1, S, -4.6], 0.18);
view('stair-head-down', [1, S, -6.6], L.crown.y, [1, S, 20], -0.42);
// the daylight main
view('tube-top', [tb.run, tb.s + 0.3, -1.4], L.high.y, [tb.run, tb.s, 12], -0.42);
view('tube-side-mid', [tb.run, tb.s + 8, 8.2], L.mid.y, [tb.run, tb.s, 10], 0.1);
view('tube-under-mid', [tb.run, tb.s - 5, 5.9], L.mid.y, [tb.run, tb.s + 3, 6], 0.1);
view('tube-side-low', [tb.run, tb.s - 7.5, 13.6], L.low.y, [tb.run, tb.s, 11], 0.3);
view('tube-foot', [tb.run, tb.s + 0.8, 23.2], null, [tb.run, tb.s, 12], 0.42);
view('tube-inside-up', [tb.run, tb.s, 15.5], P.LEVEL.high.y + 0.809 - (15.5 - 4.6) * (4 / 5.4), [tb.run, tb.s, 4], 0.55);
view('tube-inside-door', [tb.run, tb.s, 9.2], P.LEVEL.high.y + 0.809 - (9.2 - 4.6) * (4 / 5.4), [tb.run, tb.s, 20], -0.5);
view('tube-gangway', [tb.run, tb.s + 3.4, 8.6], L.mid.y, [tb.run, tb.s + 2.2, 12], -0.1);
// the ladder, the bridge and the pier
view('ladder-foot', [ld.run, ld.s - 2.2, 13.6], L.low.y, [ld.run, ld.s + 0.6, 10], 0.5);
view('ladder-top', [ld.run, ld.s - 2.5, 7.5], L.mid.y, [ld.run, ld.s + 0.5, 12], -0.3);
view('bridge', [br.run, br.s - 0.2, 7.6], L.mid.y, [br.run, br.s, 14], -0.1);
view('pier-from-lees', [br.run, br.s + 4, 21], null, [br.run, br.s, 13], 0.42);
view('pier-top', [br.run, br.s, 14.2], L.mid.y, [1, 30, 24], -0.3);
// the Lees' stair, the undercrofts, the ramp
view('lees-stair', [ls.run, ls.s + 7, 19.5], null, [ls.run, ls.s, 16], 0.2);
{ const p = P.plot('lees-shop-2'); view('undercroft-front', [p.run, p.s + 1.5, 20.2], null, [p.run, p.s, 14], 0.08); view('undercroft-inside', [p.run, p.s + 0.4, 13.2], null, [p.run, p.s - 0.3, 22], 0.05); }
{ const pr = P.way('pennyworth-ramp'), a = P.polar(pr.b0 - 4, P.HAHA - 2), b = P.polar(pr.b1 + 5, P.HAHA + 5), m = P.polar((pr.b0 + pr.b1) / 2, P.HAHA + 1);
  views.push({ name: 'ramp-top', x: r3(a[0]), z: r3(a[1]), yaw: r3(P.yawOf(m[0] - a[0], m[1] - a[1])), pitch: -0.2 });
  views.push({ name: 'ramp-foot', x: r3(b[0]), z: r3(b[1]), yaw: r3(P.yawOf(m[0] - b[0], m[1] - b[1])), pitch: 0.15 }); }
writeFileSync(new URL('./views-v15-village.json', import.meta.url), '[\n' + views.map((v) => '  ' + JSON.stringify(v)).join(',\n') + '\n]\n');
console.log(`${views.length} views`);
