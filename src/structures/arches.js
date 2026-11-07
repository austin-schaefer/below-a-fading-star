// The arch-nest: dozens of slender arches of differing spans threading through one another, the bones
// of some ancient thinking machine. Torus segments and swept ribs, some whole, some snapped, with etched
// channels along their inner faces that carry a very dim cold glow (pulsing with the stones' uniform,
// so it brightens when the sun gutters).
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, rubblePile } from './common.js';

export const ARCHES = { x: 160, z: 60, r: 18 };

export function buildArches(ctx, B, env) {
  const { rng, ground, tints } = env;
  const { x: cx, z: cz, r: R } = ARCHES;
  const stoneC = vary(tints.dark, rng, 0.03).lerp(new THREE.Color('#5a6066'), 0.45);
  const verd = new THREE.Color('#2f5248');
  const glow = new THREE.Color(ctx.palette.crystal).multiplyScalar(0.26);
  const emit = [glow.r, glow.g, glow.b, 0];
  const gC = ground.groundAt(cx, cz);
  const n = 34;
  for (let i = 0; i < n; i++) {
    // biggest arches near the middle, smaller ones threading round them
    const t = i / n;
    const rad = 3 + (1 - t) * 9 + rng() * 2.5;
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * R * (0.25 + 0.75 * t);
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    const gy = ground.groundAt(x, z);
    const yaw = rng() * Math.PI;
    const tilt = (rng() - 0.5) * 0.35;
    const tube = 0.12 + rng() * 0.16 + (1 - t) * 0.1;
    // the centre sits below ground so most arches rise from the turf as more than a semicircle or less
    const drop = (rng() - 0.35) * rad * 0.5;
    const broken = rng() < 0.35;
    const a0 = Math.max(0, Math.asin(Math.min(0.95, Math.max(-0.95, drop / rad)))) ;
    const full = Math.PI + 2 * Math.asin(Math.min(0.9, Math.max(-0.9, -drop / rad)));
    const start = -Math.asin(Math.min(0.9, Math.max(-0.9, -drop / rad)));
    const arc = broken ? full * (0.3 + rng() * 0.45) : full;
    const st = broken && rng() < 0.5 ? start + (full - arc) : start;
    const segs = Math.max(8, Math.round(arc * rad * 2.2));
    // square-ish section reads as a carved rib
    const g = new THREE.TorusGeometry(rad, tube, 4, segs, arc);
    g.rotateZ(st);
    const m = mat(x, gy - drop, z, tilt, yaw, 0, 1, 1, 1, 'YXZ');
    const col = rng() < 0.3 ? vary(verd, rng, 0.1) : vary(stoneC, rng, 0.08);
    B.add(g, m, { color: col, moss: 0.55, iron: 0, ground: gy, disp: tube * 0.12, dispScale: 2.5 });
    // the etched channel along the intrados
    const cg = new THREE.TorusGeometry(rad - tube * 0.92, tube * 0.22, 3, segs, arc * 0.98);
    cg.rotateZ(st + arc * 0.01);
    B.add(cg, m, { color: new THREE.Color(0.01, 0.012, 0.014), moss: 0, ground: gy, emit, disp: tube * 0.12, dispScale: 2.5 });
    // fine cross-etching on some, like the ruling of a gauge
    if (!broken && rng() < 0.5) {
      for (let k = 1; k < 12; k++) {
        const aa = st + (k / 12) * arc;
        const lm = new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(aa) * (rad + tube * 0.95), Math.sin(aa) * (rad + tube * 0.95), 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), aa), new THREE.Vector3(1, 1, 1));
        B.add(B.box(0.02, 0.02, tube * 1.8), m.clone().multiply(lm), { color: tints.carve, moss: 0, ground: gy });
      }
    }
    // feet: where the arc meets the ground, a collider and a socket stone
    const ends = broken ? [st] : [st, st + arc];
    for (const ea of ends) {
      const p = new THREE.Vector3(Math.cos(ea) * rad, Math.sin(ea) * rad, 0).applyMatrix4(m);
      if (Math.abs(p.y - ground.groundAt(p.x, p.z)) > 1.0) continue;
      ctx.addCollider({ x: p.x, z: p.z, r: tube + 0.25 });
      B.add(B.cyl(tube * 2.2, tube * 2.6, 0.5, 8, 1), mat(p.x, ground.groundAt(p.x, p.z) + 0.05, p.z, 0, rng() * 3, 0), { color: vary(stoneC, rng, 0.08), moss: 0.9, ground: p.y - 0.3, disp: 0.02 });
    }
    // the snapped-off length lies beneath
    if (broken) {
      const lx = x + (rng() - 0.5) * rad, lz = z + (rng() - 0.5) * rad;
      const lg = ground.groundAt(lx, lz);
      const pr = rad * (0.6 + rng() * 0.4), parc = (full - arc) * 0.7;
      const pg = new THREE.TorusGeometry(pr, tube, 4, Math.max(6, Math.round(parc * pr * 2)), parc);
      B.add(pg, mat(lx, lg + tube * 0.6, lz, Math.PI / 2 + (rng() - 0.5) * 0.1, rng() * 6.28, 0), { color: col, moss: 0.9, ground: lg - 0.3, disp: tube * 0.12, dispScale: 2.5 });
      ctx.addCollider({ x: lx, z: lz, r: Math.min(1.5, pr * 0.4) });
    }
  }
  // swept ribs: long thin curves looping over and between the arches
  for (let i = 0; i < 9; i++) {
    const pts = [];
    const a = rng() * 6.28, span = 10 + rng() * 14;
    const x0 = cx + Math.cos(a) * span * 0.5, z0 = cz + Math.sin(a) * span * 0.5;
    const x1 = cx - Math.cos(a) * span * 0.5 + (rng() - 0.5) * 6, z1 = cz - Math.sin(a) * span * 0.5 + (rng() - 0.5) * 6;
    const hgt = 4 + rng() * 9;
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const x = x0 + (x1 - x0) * t + Math.sin(t * Math.PI * 2 + i) * 2.5, z = z0 + (z1 - z0) * t + Math.cos(t * Math.PI * 2 + i) * 2.5;
      const y = ground.groundAt(x, z) - 0.4 + Math.sin(t * Math.PI) * hgt + Math.sin(t * Math.PI * 3) * hgt * 0.15;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const broken = rng() < 0.4;
    const curve = new THREE.CatmullRomCurve3(broken ? pts.slice(0, 4 + Math.floor(rng() * 2)) : pts);
    const tg = new THREE.TubeGeometry(curve, broken ? 28 : 44, 0.09 + rng() * 0.07, 4, false);
    B.add(tg, null, { color: vary(stoneC, rng, 0.1).lerp(verd, rng() * 0.5), moss: 0.4, ground: gC, disp: 0.01 });
    const p0 = pts[0];
    ctx.addCollider({ x: p0.x, z: p0.z, r: 0.35 });
    if (!broken) ctx.addCollider({ x: pts[6].x, z: pts[6].z, r: 0.35 });
  }
  // a low ring of slabs round the nest, and a few hexagonal sockets where arches once stood
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, rr = R + 3;
    if (rng() < 0.35) continue;
    const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr, gy = ground.groundAt(x, z);
    B.add(B.box(2.4, 0.5, 1.0, { chip: 0.1, seed: i }), mat(x, gy + 0.05, z, (rng() - 0.5) * 0.1, Math.PI / 2 - a, (rng() - 0.5) * 0.1), { color: vary(stoneC, rng, 0.08), moss: 0.95, ground: gy - 0.2, disp: 0.03 });
  }
  for (let i = 0; i < 6; i++) {
    const a = rng() * 6.28, d = rng() * R, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    rubblePile(B, env, x, z, 1.2, 5, { height: 0.15, size: 0.35, tint: stoneC, blocks: 0 });
  }
  env.notes.arches = { x: cx, z: cz, r: R + 4 };
}
