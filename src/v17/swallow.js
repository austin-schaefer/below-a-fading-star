// The Swallow (v17-U1): where the mere's water goes under the south slope, and the one length of the Noonwrights' tube
// that is clear. The water runs south down the cut (W1's), over the sill of the Heliarchs' portal and falls into the
// head, a drowned hall behind the face; the conduit leaves the head eastward under the apron, drowned to its crown, to
// the Meridian Garth's west wall (U2's). The tube's broken end lies on the quay beside the fall; inside it a plank
// floor goes down the head and the conduit, and from it the visitor sees water all round and over them, moving.
// The numbers: src/v17/plan.js (SWALLOW, AQUEDUCT, GARTH_DOOR); the line: swallow/line.js; the water seen through the
// glass: swallow/water.js; the parts: swallow/parts.js. world-code/runtime.md, "Under the ground", for the kit.
//   ?swallow=0 off. ctx.swallow: { floor(x, z), line, plan, rescues }
import * as THREE from 'three';
import { installBelow } from '../v14/under.js';
import { AQUEDUCT as A, SWALLOW as SW_PLAN, GARTH_DOOR } from './plan.js';
import * as L from './swallow/line.js';
import { SW, makeWaterUpdate } from './swallow/water.js';
import { buildParts } from './swallow/parts.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const SWALLOW_OFF = !!Q && Q.get('swallow') === '0';

const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function build(ctx) {
  if (SWALLOW_OFF) return;
  await ctx.progress?.('the swallow', 0);
  const below = installBelow(ctx);
  SW.uSwPool.value = SW_PLAN.pool;
  SW.uSwR.value = A.bore - 0.05;

  const parts = buildParts(ctx, L);
  for (const m of parts.meshes) { ctx.scene.add(m); below.keep(m); }
  for (const l of parts.lights) ctx.scene.add(l.L);

  // ---- the floor: the planks, one held stacked floor from the lip to the door's sill. Its ends are open: the lip onto
  // the quay at the same level, the sill onto the Garth's floor
  const HALF = 1.12, B = L.BBOX, _n = {};
  const floor = (x, z) => {
    if (x < B.x0 - 3 || x > B.x1 + 3 || z < B.z0 - 3 || z > B.z1 + 3) return null;
    L.near(x, z, _n);
    if (_n.s < -0.05 || _n.s > L.LEN + 0.05 || Math.abs(_n.d) > HALF) return null;
    return L.floorY(Math.max(0, Math.min(L.LEN, _n.s)));
  };
  ctx.addWalkable(floor, { stack: true, keep: true, name: 'swallow' });
  if (parts.quayGround) ctx.addWalkable(parts.quayGround, { replace: true });
  if (parts.quayFloor) ctx.addWalkable(parts.quayFloor, { stack: true, keep: parts.quayKeep, name: 'swallow-quay' });
  // the way, for heights-test and edges-test: from the quay into the lip, down the tube to the door's sill
  const path = [];
  if (parts.quayPath) path.push(...parts.quayPath);
  for (const s of [0.3, 4, 8, 12, 16, 22, 30, 40, 50, 60, 68, L.LEN - 0.3]) { const a = L.at(s); path.push([a.x, a.z, L.floorY(s)]); }
  ctx.ascents?.add({ id: 'swallow', held: true, offs: [0.2, 0.5, 0.8], path });

  // ---- under the ground: the tube and the conduit a narrow passage, sealed from where the turn hides the portal; the
  // head a hall that is never sealed (the portal is seen from all of it)
  const _q = {};
  const conduit = (x, y, z) => {
    if (x < B.x0 - 6 || x > B.x1 + 6 || z < B.z0 - 6 || z > B.z1 + 6) return 0;
    L.near(x, z, _q);
    if (_q.s < 2 || _q.s > L.LEN + 1) return 0;
    const f = L.floorY(Math.max(0, Math.min(L.LEN, _q.s)));
    const h = 1 - ss(A.conduit.half, A.conduit.half + 1, Math.abs(_q.d));
    let v = h * (1 - ss(f + 6, f + 8, y)) * ss(f - 4, f - 2, y);
    v *= _q.s < 17 ? 0.6 + 0.35 * ss(4, 12, _q.s) : 0.95 + 0.05 * ss(17, 19, _q.s);
    return v;
  };
  below.add(conduit, { size: 0.35 });
  if (parts.headVolume) below.add(parts.headVolume, { size: 1 });

  // ---- per frame, near: the water's clock and the axis at the eye, the lights breathing
  const waterUpdate = makeWaterUpdate(L, A), cam = ctx.camera.position;
  const mid = L.at(L.LEN / 2);
  ctx.registerUpdate((dt, t) => {
    waterUpdate(t, cam);
    for (const l of parts.lights) l.L.intensity = l.i * (0.93 + 0.07 * Math.sin(t * 0.6 + l.ph)); // it breathes; it does not flicker
    parts.update?.(dt, t);
  }, { pos: { x: mid.x, z: mid.z }, near: 90, hz: 0 });

  // from far off (the high stands look over the slope), only the face and its water are drawn: what is under the ground
  // is shut, at the cost of a distance a frame
  const far = parts.meshes.filter((m) => !/^swallow-(stone|fall|spray)$/.test(m.name)), P0 = L.at(8);
  ctx.registerUpdate(() => { const dx = cam.x - P0.x, dz = cam.z - P0.z, on = dx * dx + dz * dz < 130 * 130 || cam.y < -2; for (const m of far) m.visible = on; });

  // the Garth's door, as built: where the tube's glass ends (U2 builds the wall round it)
  ctx.swallow = { floor, line: L, plan: { A, SWALLOW: SW_PLAN, GARTH_DOOR }, parts };
  await ctx.progress?.('the swallow', 1);
}
