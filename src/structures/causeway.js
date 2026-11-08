// The Sarsen Causeway: hex paving along the CAUSEWAY polyline, waymarkers every ~40 m, and a pair of
// broken gateposts at the gate end.
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, hexCellsIn } from './common.js';
import { pitEdge, PIT_PAVE } from '../v4/paths/ground.js'; // v4 map: the road's end is laid by v4/paths.js

// Walk the polyline: point and direction at arc length s.
export function causewayAt(cw, s) {
  let acc = 0;
  for (let i = 0; i < cw.length - 1; i++) {
    const a = cw[i], b = cw[i + 1];
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    if (s <= acc + L || i === cw.length - 2) {
      const t = Math.min(1, Math.max(0, (s - acc) / L));
      const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx, dz };
    }
    acc += L;
  }
}
export function causewayLength(cw) {
  let acc = 0;
  for (let i = 0; i < cw.length - 1; i++) acc += Math.hypot(cw[i + 1].x - cw[i].x, cw[i + 1].z - cw[i].z);
  return acc;
}

export function buildCauseway(ctx, B, env) {
  const { rng, ground, tints } = env;
  const cw = ctx.causeway, T = ctx.terrain;
  const N2 = ctx.noise.noise2;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of cw) { x0 = Math.min(x0, p.x); z0 = Math.min(z0, p.z); x1 = Math.max(x1, p.x); z1 = Math.max(z1, p.z); }
  const keepGate = env.notes.keep?.gate;
  hexCellsIn(x0 - 4, z0 - 4, x1 + 4, z1 + 6, (x, z, i, j) => {
    const d = T.causewayDistance(x, z);
    // an apron spreading before the gate so the road meets it squarely
    let apron = false;
    if (keepGate && x < keepGate.x0 - 0.2 && x > keepGate.x0 - 11) {
      const fan = (keepGate.x0 - x) / 11;
      const zc = (keepGate.z0 + keepGate.z1) / 2 * (1 - fan) + 29.2 * fan;
      apron = Math.abs(z - zc) < 3.2 - fan * 1.0;
    }
    const edge = 1.75 + N2(x * 0.15, z * 0.15) * 0.3;
    if (d > edge && !apron) return;
    if (pitEdge(x, z) < PIT_PAVE) return; // v4 map: the slabs tilting into the pit and hanging over it are v4/paths.js's
    // ~15% missing, in clusters, more at the ragged edges
    const miss = N2(x * 0.21 + 9, z * 0.21 - 4) * 0.5 + 0.5;
    const gone = miss > 0.86 || rng() < 0.06 + Math.max(0, d - 1.1) * 0.12;
    // v4 map: on the Saltings' lobe the paving runs on unbroken into the crust, each slab standing a hand proud with
    // the crust lapping up its sides (the crust's lip round each is drawn by regions/saltings.js), canted a little as
    // it settled
    const salt = ctx.regions ? ctx.regions.regionAt(x, z).saltings : 0, sk = Math.min(1, Math.max(0, (salt - 0.2) / 0.4));
    if (gone && sk < 0.5) return;
    const r = rng();
    env.addPaver(x, z, i, j, { sink: (0.02 + r * 0.05) * (1 - sk) + (-0.1 + r * 0.05) * sk, tilt: 0.07 + sk * 0.05 });
  });

  // waymarkers every ~40 m: a short hexagonal pillar with a worn carving
  const len = causewayLength(cw);
  let n = 0;
  for (let s = 38; s < len - 26; s += 40) { // v4 map: none in the pit at the road's end
    const p = causewayAt(cw, s);
    const side = n % 2 ? 1 : -1;
    const nx = -p.dz * side, nz = p.dx * side;
    const x = p.x + nx * 2.9, z = p.z + nz * 2.9;
    const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 0.45);
    const lean = new THREE.Vector3((rng() - 0.5) * 0.12, 0, (rng() - 0.5) * 0.12);
    const H = 1.25 + rng() * 0.25;
    const yaw = Math.atan2(nx, nz) + Math.PI / 6;
    const base = mat(x, gb - 0.3, z, lean.x, yaw, lean.z);
    const col = vary(tints.old, rng, 0.07);
    B.add(B.cyl(0.32, 0.38, H + 0.3 + (gm - gb), 6, 3).translate(0, (H + 0.3 + (gm - gb)) / 2, 0), base, { color: col, moss: 0.9, ground: gm, disp: 0.025, dispScale: 2.5 });
    const capY = H + 0.3 + (gm - gb);
    B.add(B.cyl(0.36, 0.4, 0.14, 6, 1).translate(0, capY + 0.07, 0), base, { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: gm, disp: 0.02, dispScale: 3 });
    // the carving: a hex ring and a stroke, faced toward the road, worn nearly away
    const face = new THREE.Matrix4().makeRotationY(-Math.PI / 6 + Math.PI);
    for (let k = 0; k < 6; k++) {
      if (rng() < 0.3) continue;
      const a = k / 6 * Math.PI * 2;
      const local = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.1, capY - 0.42 + Math.sin(a) * 0.1, 0.33), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a + Math.PI / 2), new THREE.Vector3(1, 1, 1));
      B.add(B.box(0.1, 0.022, 0.02), base.clone().multiply(face).multiply(local), { color: tints.carve, moss: 0.3, ground: gm });
    }
    ctx.addCollider({ x, z, r: 0.42 });
    n++;
  }

  // broken gateposts at the gate end (v4 map: the road now runs on past the gate, so 14 m back from it)
  {
    let gi = 0, sg = 0;
    cw.forEach((q, i) => { if (Math.hypot(q.x - ctx.spawn.x, q.z - ctx.spawn.z) < Math.hypot(cw[gi].x - ctx.spawn.x, cw[gi].z - ctx.spawn.z)) gi = i; });
    for (let i = 0; i < gi; i++) sg += Math.hypot(cw[i + 1].x - cw[i].x, cw[i + 1].z - cw[i].z);
    const p = causewayAt(cw, sg - 14);
    if (gi > 0) { p.dx = -p.dx; p.dz = -p.dz; } // facing out from the gate, as on the v3 road
    for (const side of [-1, 1]) {
      const nx = -p.dz * side, nz = p.dx * side;
      const x = p.x + nx * 2.7, z = p.z + nz * 2.7;
      const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 0.5) - 0.3;
      const H = (side < 0 ? 3.3 : 1.7) + (gm - gb);
      const yaw = Math.atan2(p.dx, p.dz);
      B.add(B.box(0.78, H, 0.78, { chip: side < 0 ? 0.08 : 0.2, seed: side * 9 }), mat(x, gb + H / 2, z, (rng() - 0.5) * 0.04, yaw, (rng() - 0.5) * 0.04), { color: vary(tints.old, rng, 0.06), course: 0.55, moss: 0.85, ground: gm, disp: 0.03 });
      // a moulded cap on the one that stands, its finial gone
      if (side < 0) {
        B.add(B.box(1.0, 0.22, 1.0, { chip: 0.06 }), mat(x, gb + H + 0.1, z, 0, yaw, 0), { color: vary(tints.old, rng, 0.05), moss: 0.8, ground: gm });
        B.add(B.box(0.84, 0.16, 0.84, { chip: 0.05 }), mat(x, gb + H + 0.29, z, 0, yaw + 0.02, 0), { color: vary(tints.old, rng, 0.05), moss: 0.8, ground: gm });
        // a hinge iron bleeding rust
        B.add(B.box(0.06, 0.18, 0.2), mat(x - nx * 0.4, gm + 1.6, z - nz * 0.4, 0, yaw, 0), { color: tints.iron, iron: 1, moss: 0, ground: gm });
        env.rust.push([x - nx * 0.42, gm + 1.6, z - nz * 0.42, 1.4]);
      } else {
        // its upper half lies in the grass beside it
        const fx = x + nx * 1.4 + p.dx * 0.6, fz = z + nz * 1.4 + p.dz * 0.6;
        const fg = ground.groundAt(fx, fz);
        B.add(B.box(0.78, 1.6, 0.78, { chip: 0.18, seed: 3 }), mat(fx, fg + 0.22, fz, Math.PI / 2 - 0.08, yaw + 0.5, 0.1), { color: vary(tints.old, rng, 0.06), course: 0.55, moss: 0.95, ground: fg - 0.3, disp: 0.03 });
      }
      ctx.addCollider({ x, z, r: 0.6 });
    }
  }
  return { waymarkers: n };
}
