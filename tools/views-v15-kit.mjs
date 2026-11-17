#!/usr/bin/env node
// Writes tools/views-v15-kit.json: the makers' contact sheet (?v15=kit, src/v15/sheet.js) for tools/views.mjs:
// three frames a row from 14 m up to the south, and each row's first four from the deck.
//   node tools/views-v15-kit.mjs; FP_BASE=http://localhost:PORT node tools/views.mjs tools/views-v15-kit.json shots/wip v15-kit low 1280 720 "&v15=kit&only=villagerow"
import { writeFileSync, readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/v15/sheet.js', import.meta.url), 'utf8');
const S = eval('(' + src.match(/export const SHEET = (\{.+\});/)[1] + ')');
const hold = (x, y, z) => `(()=>{const fp=window.__fp;window.__hold&&window.__hold();window.__hold=fp.controls.carry({step(pos){pos.set(${x},${y},${z});}});})()`;
const views = [];
S.rows.forEach((kind, r) => {
  const z = S.z + (r - (S.rows.length - 1) / 2) * S.dz;
  for (const [n, x] of [['a', -38], ['b', 0], ['c', 38]]) views.push({ name: `${kind}-${n}`, x: S.x + x, z: z + 23, yaw: 0, pitch: -0.42, js: hold(S.x + x, S.y + 13, z + 23) });
  for (const [n, x] of [['near-1', -4 * S.dx], ['near-2', -1 * S.dx], ['near-3', 2 * S.dx]]) views.push({ name: `${kind}-${n}`, x: S.x + x, z: z + 10.2, yaw: 0, pitch: 0.12, js: hold(S.x + x, S.y + 1.7, z + 10.2) });
});
writeFileSync(new URL('./views-v15-kit.json', import.meta.url), JSON.stringify(views, null, 1));
console.log(views.length, 'views');
