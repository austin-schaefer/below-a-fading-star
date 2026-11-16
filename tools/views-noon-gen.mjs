#!/usr/bin/env node
// Writes a views.json (for tools/views.mjs) of free-standing poses under the ground (v14-D3): each view stands the
// eye at (x, y, z) looking at a target, whatever is or is not underfoot.
//   node tools/views-noon-gen.mjs <out.json> "name:x,y,z>tx,ty,tz" ...
import { writeFileSync } from 'node:fs';
const [out, ...specs] = process.argv.slice(2);
const views = specs.map((s) => {
  const [name, rest] = s.split(':'), [a, b] = rest.split('>'), [x, y, z] = a.split(',').map(Number), [tx, ty, tz] = b.split(',').map(Number);
  const dx = tx - x, dy = ty - y, dz = tz - z, yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
  const set = `(() => { const fp = window.__fp, p = fp.player; p.pos.set(${x}, ${y}, ${z}); p.yaw = ${yaw.toFixed(4)}; p.pitch = ${pitch.toFixed(4)}; p.vel?.set(0, 0, 0); p.vy = 0; fp.camera.position.copy(p.pos); fp.camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ'); fp.camera.updateMatrixWorld(true); })()`;
  return { name, x, z, yaw: +yaw.toFixed(4), pitch: +pitch.toFixed(4), settle: 1200, js: set, pre: set };
});
writeFileSync(out, JSON.stringify(views, null, 1));
console.log(`${views.length} views -> ${out}`);
