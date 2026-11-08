// A stair generator (v4 kit): a straight flight of worn treads, optionally diminishing (BL, the Diminishing
// Treads: each step's rise and run are `diminish` times the one below, so a long ascent reads taller than it
// is), with landings, missing and broken treads. Each step is a solid block down to below its foot, so the
// flight can stand on rough ground. Treads are hollowed in the middle by feet and their nosings rounded.
// makeStair(ctx, opts) -> { geometry, walkable(x, z) -> y | null, top: {x, y, z}, steps: [{x, z, y, run, rise}], length }
//   x, z, y: the foot of the first riser (y the ground there; defaults to the terrain);
//   heading: radians, the direction the flight climbs (x east, z south: 0 climbs toward -z, π/2 toward -x,
//            like the player's yaw);
//   width 4, steps 20, rise 0.32, run 0.6, diminish 1, landingEvery 0 (steps between landings), landing 3 (m),
//   wear 0.7 (0..1), missing [] and broken [] (step indices), rng (ctx.makeRng stream; for the wear's jitter).
// The geometry is in world space; give it a kit masonry material (base: y, diminish to match) and merge or add
// it as one mesh. Register walkable with ctx.addWalkable.
import * as THREE from 'three';
import { mergeGeometries } from './merge.js';

export function makeStair(ctx, o = {}) {
  const width = o.width ?? 4, n = o.steps ?? 20, d = o.diminish ?? 1, wear = o.wear ?? 0.7;
  const rng = o.rng || ctx.makeRng(7001);
  const heading = o.heading ?? 0;
  const fx = -Math.sin(heading), fz = -Math.cos(heading);   // forward (up the flight)
  const rx = Math.cos(heading), rz = -Math.sin(heading);    // right
  const x0 = o.x ?? 0, z0 = o.z ?? 0, y0 = o.y ?? ctx.terrain.heightAt(x0, z0);
  const missing = new Set(o.missing || []), broken = new Set(o.broken || []);
  const parts = [], steps = [];
  let s = 0, y = y0, rise = o.rise ?? 0.32, run = o.run ?? 0.6;
  const segX = 8;
  for (let i = 0; i < n; i++) {
    const landing = o.landingEvery && i > 0 && i % o.landingEvery === 0;
    const r = landing ? Math.max(run, o.landing ?? 3) : run;
    y += rise;
    const step = { i, s0: s, s1: s + r, y, run: r, rise, missing: missing.has(i) };
    steps.push(step);
    if (!step.missing) {
      // a block from below the foot of the flight's start (so it seats on rough ground) to the tread
      const depth = r + 0.04, h = y - (y0 - 1.2);
      const g = new THREE.BoxGeometry(width, h, depth, segX, 1, 3);
      const p = g.attributes.position;
      const dip = wear * Math.min(0.09, rise * 0.25), nose = wear * Math.min(0.06, rise * 0.18);
      const tilt = broken.has(i) ? (rng() - 0.5) * 0.5 : 0, drop = broken.has(i) ? rise * (0.4 + rng() * 0.6) : 0;
      for (let k = 0; k < p.count; k++) {
        let px = p.getX(k), py = p.getY(k), pz = p.getZ(k);
        if (py > 0) {
          const ax = (2 * px) / width, az = 0.5 - pz / depth;      // across -1..1; along 0 (front) .. 1 (back)
          py -= dip * (1 - ax * ax) * Math.sin(Math.min(1, az) * Math.PI) * (0.8 + 0.4 * rng()); // hollowed by feet
          if (az < 0.02) py -= nose * (1 - 0.5 * ax * ax);             // the nosing rounded off
          py -= drop * (0.5 + 0.5 * Math.sign(tilt || 1) * ax) + tilt * ax * 0.3; // a broken tread slumps to one end
        }
        // to world: local x across, z back along the flight (box front at -depth/2 is the riser)
        const along = s + depth / 2 + pz * -1;
        const wx = x0 + rx * px + fx * along, wz = z0 + rz * px + fz * along;
        p.setXYZ(k, wx, py + h / 2 + (y0 - 1.2), wz);
      }
      g.computeVertexNormals();
      parts.push(g);
    }
    s += r;
    rise *= d; run *= d;
  }
  const geometry = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  for (const g of parts) g.dispose();
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const length = s;
  function walkable(x, z) {
    const dx = x - x0, dz = z - z0;
    const along = dx * fx + dz * fz, across = dx * rx + dz * rz;
    if (along < 0 || along > length || Math.abs(across) > width / 2) return null;
    for (const st of steps) if (along <= st.s1) return st.missing ? null : st.y;
    return null;
  }
  const last = steps[steps.length - 1];
  const top = { x: x0 + fx * length, y: last.y, z: z0 + fz * length };
  return { geometry, walkable, top, steps, length };
}
