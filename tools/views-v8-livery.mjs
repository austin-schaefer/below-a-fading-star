#!/usr/bin/env node
// v8-06: writes the livery sheets' views (tools/views-v8-livery-<d>.json): every officer and Late figure framed at the
// same distance d (4, 10 and 30 m), from in front of it and a little to one side (0.5 rad off its facing), the camera at
// eye height looking at its middle. Each view holds its figure still (the walkers by their test hooks) so a pair with
// ?livery=0 matches. Usage: node tools/views-v8-livery.mjs  (then tools/views.mjs on each file)
import { writeFileSync } from 'node:fs';
const FRAME = `window.__lvFrame = window.__lvFrame || ((who, d, off, dy = 0) => {
  const fp = __fp, p = fp.player, W = fp.walkers, K = fp.workers, S = fp.still; let x, z, yaw, h = 1.0, y = null;
  fp.sky.flicker.hold = null; fp.sky.flicker.value = 1;
  if (W) { W.linkBoy.reset(); W.thurifer.bow(null); W.leerie.at(null); }
  switch (who) {
    case 'thurifer': { W.thurifer.bow(70, 0, 1); const s = W.thurifer.state; x = s.x; z = s.z; yaw = s.yaw; h = 0.6; break; }
    case 'leerie': { W.leerie.at(4, 1, 1); const s = W.leerie.state; x = s.x; z = s.z; yaw = s.yaw; h = 1.1; break; }
    case 'linkboy': { const s = W.linkBoy.state; x = s.x; z = s.z; yaw = s.yaw; h = 1.0; break; }
    case 'taker': { const t = K.taker; x = t.seat.x; z = t.seat.z; yaw = t.yaw; h = 0.5; break; }
    case 'sexton': { const s = K.sexton.state; x = s.x; z = s.z; yaw = s.yaw; h = 1.0; break; }
    case 'coheirs': { const c = K.coheirs; x = (c.seats[0].x + c.seats[1].x) / 2; z = (c.seats[0].z + c.seats[1].z) / 2; yaw = c.seats[0].yaw + Math.PI / 2; h = 0.5; break; }
    case 'stylite': { const s = S.stylite; x = s.seat.x; z = s.seat.z; yaw = Math.atan2(s.face[0], s.face[1]); y = s.seat.y + 0.5; break; }
    case 'sleeper': { const s = S.sleeper; x = s.centre.x; z = s.centre.z; yaw = -Math.PI / 2; h = 0.2; break; }
    case 'accrescent': { const a = S.accrescent; x = a.pos.x; z = a.pos.z; yaw = a.man.rotation.y; h = 1.0; break; }
    case 'guest': { const g = fp.inhabitants2.guest; x = g.position.x; z = g.position.z; yaw = g.yaw; h = 1.0; break; }
  }
  const ty = y ?? fp.terrain.heightAt(x, z) + h;
  // the bearing nearest the asked one (yaw + off) with a clear line to the figure's middle: the ground sampled every
  // metre, then a ray against the scene's meshes (not the grass, the particles or the figure's own)
  const T = fp.terrain, THREE = fp.THREE, rc = window.__lvRc || (window.__lvRc = new THREE.Raycaster());
  const clear = (b) => {
    const cx = x + Math.sin(b) * d, cz = z + Math.cos(b) * d, cy = T.heightAt(cx, cz) + p.eye + dy;
    for (let k = 1; k < d; k++) { const f = k / d; if (T.heightAt(cx + (x - cx) * f, cz + (z - cz) * f) > cy + (ty - cy) * f - 0.15) return false; }
    const o = new THREE.Vector3(cx, cy, cz), dir = new THREE.Vector3(x - cx, ty - cy, z - cz); const L = dir.length(); dir.normalize();
    rc.set(o, dir); rc.far = L - 1.2;
    const keep = []; fp.scene.traverse((m) => { if (m.isMesh && m.visible && !m.isInstancedMesh && !/grass|living|walkers|inhabitants|terrain|sky|water|fog|cloud/i.test(m.name) && m.geometry?.boundingSphere) keep.push(m); });
    return rc.intersectObjects(keep, false).length === 0;
  };
  let b = yaw + off;
  if (d > 12) for (let k = 0; k < 24; k++) { const c = yaw + off + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.26; if (clear(c)) { b = c; break; } }
  const cx = x + Math.sin(b) * d, cz = z + Math.cos(b) * d;
  p.pos.set(cx, fp.terrain.heightAt(cx, cz) + p.eye + dy, cz);
  const dx = x - cx, dz = z - cz;
  p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(ty - p.pos.y, Math.hypot(dx, dz));
  fp.camera.position.copy(p.pos); fp.camera.rotation.set(p.pitch, p.yaw, 0, 'YXZ'); fp.camera.updateMatrixWorld();
})`;
const WHO = ['thurifer', 'leerie', 'linkboy', 'taker', 'sexton', 'stylite', 'sleeper', 'accrescent', 'coheirs', 'guest'];
const OFF = { sleeper: 0.9, guest: 0.3, coheirs: Math.PI + 0.3, leerie: -1.2 }, DY = { sleeper: 1.2 };
const DY30 = { sleeper: 4 }; // at 30 m a man lying in grass is seen only from a rise // the Sleeper over the grass he lies in
for (const d of [4, 10, 30]) {
  const views = WHO.map((w) => ({ name: `${w}-${d}m`, x: 0, z: 0, yaw: 0, settle: 900,
    js: `${FRAME}; window.__lvFrame('${w}', ${d}, ${OFF[w] ?? 0.5}, ${(d > 12 ? DY30 : DY)[w] ?? 0});`, pre: `window.__lvFrame('${w}', ${d}, ${OFF[w] ?? 0.5}, ${(d > 12 ? DY30 : DY)[w] ?? 0});` }));
  writeFileSync(new URL(`./views-v8-livery-${d}.json`, import.meta.url), JSON.stringify(views, null, 1));
}
console.log('wrote tools/views-v8-livery-4.json, -10.json, -30.json');
