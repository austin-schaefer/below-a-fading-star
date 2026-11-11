// Thread 2, the twelfth chair (briefs/v8/index.md): the Collation is laid for twelve and one chair is gone. At the table:
// the gap on the north side, the cloth darker in two rounds where its plate and glass stood, and two furrows where the
// chair's back legs were dragged out of the clearing and away west-north-west through the pressed grass, until it was
// picked up. On the way, by P9: four square dents in the turf where it was set down, and the core of a medlar; on the
// causeway by the fen: its front rung, snapped off, the break pale; on P14's salt crust: four dents again. At the end, at
// the head of the Sexton's forty-first grave: the chair, facing the grave, its rung gone, with the place's pewter plate
// and glass on its seat and a black coat over its back.
// Meshes: the Collation's end (furrows, one mesh), the marks (one mesh for all three), the chair at the grave (one mesh).
// One collider: the chair.
import * as THREE from 'three';
import { CHAIR, CHAIR_GONE, dragStart } from './plan.js';
import { Acc, frame, local, ellipsoid, rod, boxAt, finish } from './kit.js';
import { SLOTS, GRAVE, heapZ } from '../../v7/workers/graves.js';

const SOIL = '#2a1e15', SOIL_L = '#4a3a2a', WOODC = '#4a3b2f', WOOD_D = '#43362b', PEWTER = '#666a72', GLASS = '#a5b3ab', COAT = '#17141a';

// the Collation's chair (collation.js chairAt), standing, with its rung gone: a stub of it in each front leg
function chair(acc, F) {
  const put = (w, h, d, x, y, z, c) => boxAt(acc, F, w, h, d, x, y, z, c, 0, 0, 0, 0.1);
  put(0.44, 0.045, 0.42, 0, 0.45, 0, WOODC);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(0.04, 0.45, 0.04, sx * 0.19, 0.225, sz * 0.18, WOOD_D);
  for (const sx of [-1, 1]) put(0.04, 0.52, 0.04, sx * 0.19, 0.71, -0.18, WOOD_D);
  put(0.42, 0.07, 0.03, 0, 0.93, -0.18, WOODC);
  put(0.4, 0.045, 0.03, 0, 0.74, -0.18, WOODC);
  for (const sx of [-1, 1]) put(0.035, 0.028, 0.028, sx * 0.155, 0.17, 0.18, '#7a6650'); // the rung's broken stubs, pale
}

function rung(acc, F) {
  rod(acc, F, [-0.17, 0.016, 0], [0.13, 0.016, 0], 0.016, '#4e3e30');
  rod(acc, F, [0.13, 0.016, 0], [0.2, 0.018, 0.006], 0.013, '#b09a78', 0.004); // the splintered end, the fresh wood showing
  rod(acc, F, [0.14, 0.022, 0.01], [0.22, 0.026, 0.035], 0.004, '#b09a78');
  rod(acc, F, [-0.21, 0.016, 0], [-0.17, 0.016, 0], 0.014, '#9a8466'); // the other end, snapped clean at the leg
  rod(acc, F, [0.3, 0.004, 0.1], [0.36, 0.006, 0.13], 0.004, '#b09a78'); // a splinter beside it
}
function dents(acc, F, medlar) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    boxAt(acc, F, 0.07, 0.014, 0.07, sx * 0.19, 0.004, sz * 0.18, '#120c08');
    boxAt(acc, F, 0.15, 0.01, 0.15, sx * 0.19, 0.001, sz * 0.18, SOIL_L, 0, 0.3, 0); // the turf bruised round each
    for (let k = 0; k < 3; k++) ellipsoid(acc, F, sx * 0.19 + (k - 1) * 0.06, 0.008, sz * 0.18 + sz * 0.07, 0.015, 0.01, 0.012, SOIL, { low: true }); // the crumbs it threw up
  }
  if (medlar) { // the core of a medlar, eaten sitting on it: brown, bitten, the calyx still on, two stones beside
    ellipsoid(acc, F, 0.45, 0.024, 0.12, 0.03, 0.024, 0.028, '#5a3820');
    ellipsoid(acc, F, 0.462, 0.026, 0.118, 0.016, 0.02, 0.03, '#c8ab78'); // the bite, the pale flesh
    rod(acc, F, [0.45, 0.034, 0.12], [0.45, 0.04, 0.12], 0.008, '#23160e');
    for (const [x, z] of [[0.5, 0.18], [0.53, 0.1]]) ellipsoid(acc, F, x, 0.006, z, 0.006, 0.004, 0.009, '#6a4a2c', { ay: x * 9 });
  }
}

export function buildChair(ctx, gy, surf, collation) {
  const rng = ctx.makeRng(80402), n = new THREE.Vector3();
  const meshes = [];
  // the furrows: the back legs' two lines, from where the chair stood, wavering, fading out where it was lifted
  const drag = new Acc(rng), f = dragStart(), C = Math.cos(CHAIR.drag.bearing), S = Math.sin(CHAIR.drag.bearing);
  const L = CHAIR.drag.len, step = 0.5;
  for (let u = 0; u < L; u += step) {
    const sway = (s) => 0.12 * Math.sin(s * 0.45) + 0.05 * Math.sin(s * 1.7);
    for (const side of [-0.21, 0.21]) {
      const a = u, b = Math.min(L, u + step), va = side + sway(a), vb = side + sway(b);
      const xa = f.x + a * C - va * S, za = f.z + a * S + va * C, xb = f.x + b * C - vb * S, zb = f.z + b * S + vb * C;
      const fade = 1 - Math.max(0, (u - L * 0.7) / (L * 0.3)), w = 0.05 * (0.4 + 0.6 * fade);
      const ya = gy(xa, za) + 0.008, yb = gy(xb, zb) + 0.008;
      rod(drag, null, [xa, ya, za], [xb, yb, zb], w, fade > 0.5 ? SOIL : SOIL_L, w, 0.1, 4);
      if (fade > 0.3) rod(drag, null, [xa - S * 0.06, ya - 0.004, za + C * 0.06], [xb - S * 0.06, yb - 0.004, zb + C * 0.06], w * 1.4, '#3b3020', w * 1.4, 0.1, 4); // the turf torn beside
    }
  }
  meshes.push(finish(ctx, drag, 'threads-chair-drag', { cast: false }));
  // the marks on the road
  const marks = new Acc(rng), markEnds = [];
  for (const r of CHAIR.rests) {
    const y = r.kind === 'rung' ? surf(r.x, r.z) : gy(r.x, r.z);
    ctx.terrain.normalAt(r.x, r.z, n);
    const F = frame(r.x, y + (r.kind === 'rung' ? 0 : 0.002), r.z, r.yaw, r.kind === 'rung' ? null : n.clone());
    if (r.kind === 'rung') rung(marks, F); else dents(marks, F, r.medlar);
    markEnds.push({ kind: r.kind, x: r.x, z: r.z, y });
  }
  meshes.push(finish(ctx, marks, 'threads-chair-marks', { cast: false }));
  // the chair at the head of the grave: west of its cut, facing east along it, on the Sexton's laid ground
  const s = SLOTS[CHAIR.grave], cx = s.x - s.dir * (GRAVE.len / 2 + 0.42), cz = s.z, yaw = Math.atan2(s.dir, 0);
  const cy = gy(cx, cz), G = frame(cx, cy, cz, yaw);
  const ch = new Acc(rng);
  chair(ch, G);
  // on the seat: the place's pewter plate and its glass (the dust in it), nothing on the plate
  const plate = new THREE.LatheGeometry([[0, 0], [0.085, 0], [0.098, 0.004], [0.138, 0.013], [0.148, 0.021], [0.153, 0.019], [0.149, 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
  ch.add(plate, local(G, -0.02, 0.4725, 0.04, 0.03, 0.5, 0), PEWTER, 0.08);
  rod(ch, G, [0.13, 0.4725, -0.08], [0.13, 0.478, -0.08], 0.03, '#929f98');
  rod(ch, G, [0.13, 0.478, -0.08], [0.13, 0.538, -0.08], 0.005, '#929f98');
  rod(ch, G, [0.13, 0.538, -0.08], [0.13, 0.613, -0.08], 0.021, GLASS, 0.034);
  rod(ch, G, [0.13, 0.54, -0.08], [0.13, 0.545, -0.08], 0.0225, '#58554f');
  // the coat over the back: hung by its shoulders on the top rail, the front fall to the seat, the back fall lower, an
  // empty sleeve down each side
  boxAt(ch, G, 0.5, 0.06, 0.07, 0, 0.94, -0.18, COAT, 0, 0, 0, 0.04);
  boxAt(ch, G, 0.44, 0.16, 0.022, 0, 0.86, -0.155, COAT, -0.08, 0, 0, 0.04); // the collar's fall, over the front of the back
  boxAt(ch, G, 0.52, 0.86, 0.025, 0, 0.53, -0.24, '#1c181f', 0.1, 0, 0, 0.04); // the body of it, hanging behind
  for (const sx of [-1, 1]) {
    rod(ch, G, [sx * 0.26, 0.92, -0.2], [sx * 0.3, 0.62, -0.26], 0.05, COAT, 0.045);
    rod(ch, G, [sx * 0.3, 0.62, -0.26], [sx * 0.28, 0.34, -0.25], 0.045, COAT, 0.04);
  }
  boxAt(ch, G, 0.16, 0.05, 0.02, 0, 0.9, -0.13, '#c8501e', 0, 0, 0, 0.04); // a strip of faded ember at the collar: an officer's
  const chairMesh = finish(ctx, ch, 'threads-chair');
  meshes.push(chairMesh);
  const col = { x: cx, z: cz, r: 0.32, y: cy - 0.1, h: 1.0 };
  ctx.addCollider(col);
  const ends = {
    table: { x: f.x, z: f.z, y: gy(f.x, f.z), stand: { x: 131.5, z: -72.5, yaw: Math.atan2(-(f.x - 131.5), -(f.z + 72.5)), pitch: -0.12 } },
    grave: { x: cx, z: cz, y: cy, slot: s.n, stand: { x: 34.5, z: 276, yaw: Math.atan2(-(cx - 34.5), -(cz - 276)), pitch: -0.12 } },
    marks: markEnds,
    dragEnd: { x: f.x + L * C, z: f.z + L * S },
  };
  return { meshes, ends, colliders: 1, heapZ: heapZ(s) };
}
