// Boundary stones round the region's edge every 60°, cairns on the moor, lone standing stones and a
// toppled milestone.
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, findSpot } from './common.js';

export function buildMarkers(ctx, B, env) {
  const { rng, ground, tints } = env;
  // boundary stones: hexagonal pillars on stepped plinths, a carved band, a hex cap
  for (let k = 0; k < 6; k++) {
    let a = (k / 6) * Math.PI * 2 + 0.12;
    let x = Math.cos(a) * 287, z = Math.sin(a) * 287;
    for (let i = 0; i < 12 && ctx.terrain.slopeAt(x, z) > 0.45; i++) { a += 0.02; x = Math.cos(a) * 285; z = Math.sin(a) * 285; }
    const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 1.2) - 0.3;
    const yaw = rng() * 6.28, lean = (rng() - 0.5) * 0.1;
    const m = mat(x, gb, z, lean, yaw, (rng() - 0.5) * 0.1);
    const off = gm - gb;
    const col = vary(tints.old, rng, 0.05).multiplyScalar(0.85);
    B.add(B.cyl(1.05, 1.15, 0.45 + off, 6, 1).translate(0, (0.45 + off) / 2, 0), m, { color: col, moss: 1, ground: gm, disp: 0.03 });
    B.add(B.cyl(0.8, 0.85, 0.3, 6, 1).translate(0, off + 0.6, 0), m, { color: col, moss: 0.95, ground: gm, disp: 0.03 });
    const H = 2.3 + rng() * 0.4;
    B.add(B.cyl(0.42, 0.5, H, 6, 4).translate(0, off + 0.75 + H / 2, 0), m, { color: col, moss: 0.9, ground: gm, disp: 0.03, dispScale: 1.8 });
    B.add(B.cyl(0.54, 0.54, 0.16, 6, 1).translate(0, off + 0.75 + H * 0.72, 0), m, { color: vary(tints.old, rng, 0.05), moss: 0.7, ground: gm, disp: 0.02 });
    B.add(B.cyl(0.58, 0.5, 0.26, 6, 1).translate(0, off + 0.75 + H + 0.13, 0), m, { color: col, moss: 0.95, ground: gm, disp: 0.03 });
    B.add(B.cyl(0.0, 0.4, 0.35, 6, 1).translate(0, off + 0.75 + H + 0.43, 0), m, { color: col, moss: 0.9, ground: gm, disp: 0.03 });
    // a worn carved device on the face turned inward
    for (let s = 0; s < 5; s++) {
      const fy = off + 0.75 + H * 0.45 + (s - 2) * 0.12;
      const lm = new THREE.Matrix4().compose(new THREE.Vector3(0, fy, 0.44), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      B.add(B.box(0.3 - Math.abs(s - 2) * 0.08, 0.04, 0.03), m.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI / 6)).multiply(lm), { color: tints.carve, moss: 0.3, ground: gm });
    }
    ctx.addCollider({ x, z, r: 1.0 });
  }
  // cairns on the moor
  for (let i = 0; i < 9; i++) {
    const p = findSpot(env, { slope: 0.35, sep: 30, size: 3 });
    if (!p) continue;
    cairn(B, env, p.x, p.z, 1.2 + rng() * 0.9);
    ctx.addCollider({ x: p.x, z: p.z, r: 1.1 });
  }
  // lone standing stones
  for (let i = 0; i < 6; i++) {
    const p = findSpot(env, { slope: 0.4, sep: 25, size: 2 });
    if (!p) continue;
    const gm = ground.groundAt(p.x, p.z);
    const h = 2.6 + rng() * 1.8, w = 0.9 + rng() * 0.5, d = 0.5 + rng() * 0.3;
    const g = B.box(w, h + 0.6, d, { seg: 0.45, chip: 0.14, seed: i * 13 });
    const pos = g.attributes.position;
    for (let q = 0; q < pos.count; q++) { const y = pos.getY(q) / (h + 0.6) + 0.5; pos.setX(q, pos.getX(q) * (1 - 0.35 * y)); pos.setZ(q, pos.getZ(q) * (1 - 0.25 * y)); if (y > 0.99) pos.setY(q, pos.getY(q) - 0.3 * Math.abs(pos.getX(q))); }
    B.add(g, mat(p.x, gm + (h + 0.6) / 2 - 0.6, p.z, (rng() - 0.5) * 0.2, rng() * 6.28, (rng() - 0.5) * 0.2), { color: vary(tints.old, rng, 0.07).multiplyScalar(0.8), moss: 1, ground: gm, disp: 0.07, dispScale: 1 });
    ctx.addCollider({ x: p.x, z: p.z, r: 0.6 });
  }
  // a toppled milestone, its stump still standing
  {
    const p = findSpot(env, { slope: 0.3, sep: 20, causeway: 9 });
    if (p) {
      const gm = ground.groundAt(p.x, p.z);
      B.add(B.box(0.55, 0.7, 0.45, { chip: 0.12, chipTop: true }), mat(p.x, gm + 0.15, p.z, 0, 0.4, 0), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: gm });
      B.add(B.box(0.55, 1.3, 0.45, { chip: 0.1 }).translate(0, 0.65, 0), mat(p.x + 0.9, gm + 0.12, p.z + 0.3, Math.PI / 2 - 0.05, 0.4 + 0.3, 0.05), { color: vary(tints.old, rng, 0.05), moss: 0.95, ground: gm - 0.3 });
      B.add(B.cyl(0.3, 0.3, 0.12, 12, 1), mat(p.x + 1.5, gm + 0.12, p.z + 0.7, Math.PI / 2 - 0.1, 0.7, 0), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: gm - 0.3 });
      ctx.addCollider({ x: p.x, z: p.z, r: 0.5 });
    }
  }
}

export function cairn(B, env, x, z, h) {
  const { rng, ground, tints } = env;
  const gm = ground.groundAt(x, z);
  let y = gm - 0.1;
  const layers = Math.round(h / 0.28);
  for (let l = 0; l < layers; l++) {
    const t = l / layers;
    const rr = 1.15 * (1 - t * 0.8);
    const n = Math.max(1, Math.round(7 * (1 - t)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.6, d = n > 1 ? rr * (0.6 + rng() * 0.3) : 0;
      const s = 0.22 + rng() * 0.16 * (1 - t * 0.5);
      B.add(B.rock(s, 0, 1.2, 0.6, 1), mat(x + Math.cos(a) * d, y + s * 0.3, z + Math.sin(a) * d, rng() * 0.6, rng() * 6.28, rng() * 0.6), { color: vary(tints.scree, rng, 0.15), moss: 0.95, ground: gm, disp: s * 0.18, dispScale: 3, flat: true });
    }
    y += 0.24;
  }
}
