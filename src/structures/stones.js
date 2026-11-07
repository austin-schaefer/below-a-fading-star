// The Cardinal Stones: four leaning monoliths at the corners of a square, Pride, Sloth, Avarice and
// Spite clockwise from the north-east, each banded with carved glyphs that glow faintly in its colour.
// A low hexagonal altar between them, a ring of lesser stones fallen around.
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, rubblePile } from './common.js';

export function buildStones(ctx, B, env) {
  const { rng, ground, tints } = env;
  const L = ctx.landmarks.stones;
  const P = ctx.palette;
  const half = 7;
  // clockwise from the north-east, seen from above with north up (north is -z, east is +x)
  const corners = [
    { name: 'pride', dx: half, dz: -half, h: 7.6, col: P.pride },
    { name: 'sloth', dx: half, dz: half, h: 6.4, col: P.sloth },
    { name: 'avarice', dx: -half, dz: half, h: 7.0, col: P.avarice },
    { name: 'spite', dx: -half, dz: -half, h: 7.9, col: P.spite },
  ];
  for (let ci = 0; ci < corners.length; ci++) {
    const c = corners[ci];
    const x = L.x + c.dx, z = L.z + c.dz;
    const gm = ground.groundAt(x, z);
    const w = 1.75 + rng() * 0.2, d = 0.95 + rng() * 0.15, bury = 1.2;
    const H = c.h + bury;
    // broad face toward the centre
    const yaw = Math.atan2(-c.dx, -c.dz) + (rng() - 0.5) * 0.15;
    // lean a little, mostly outward
    const lx = (rng() - 0.5) * 0.06 - 0.05, lz = (rng() - 0.5) * 0.08;
    const m = mat(x, gm - bury, z, -0.07 + lx, yaw, lz);
    const taper = (y) => 1 - 0.32 * Math.pow(Math.max(0, y) / H, 1.4);
    const g = B.box(w, H, d, { seg: 0.42, chip: 0.14, seed: ci * 7 });
    {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), py = pos.getY(i) + H / 2, pz = pos.getZ(i);
        const tp = taper(py);
        let yy = py;
        // a weathered, rounded crown, lower on one shoulder
        const u = px / (w / 2), v = pz / (d / 2);
        if (py > H - 0.01) yy -= 0.5 * u * u + 0.25 * v * v + 0.35 * (u + 1) * (ci % 2 ? 0.6 : 0.3);
        pos.setXYZ(i, px * tp, yy, pz * tp);
      }
    }
    const tint = vary(tints.old, rng, 0.04).multiplyScalar(0.8);
    B.add(g, m, { color: tint, moss: 0.95, ground: gm + bury * 0, disp: 0.07, dispScale: 0.9 });
    // the glyph band: carved strokes, glowing in the element's colour
    const glow = new THREE.Color(c.col).multiplyScalar(2.2);
    const emit = [glow.r, glow.g, glow.b, 0];
    const bandY = bury + c.h * 0.6;
    const tp = taper(bandY);
    const faces = [
      { w: w * tp, off: (d / 2) * tp, rotY: 0 }, { w: w * tp, off: (d / 2) * tp, rotY: Math.PI },
      { w: d * tp, off: (w / 2) * tp, rotY: Math.PI / 2 }, { w: d * tp, off: (w / 2) * tp, rotY: -Math.PI / 2 },
    ];
    const carve = new THREE.Color(0.02, 0.016, 0.014);
    for (const f of faces) {
      const face = new THREE.Matrix4().makeRotationY(f.rotY);
      const stroke = (x0, y0, x1, y1, th = 0.04) => {
        const len = Math.hypot(x1 - x0, y1 - y0) + th;
        const a = Math.atan2(y1 - y0, x1 - x0);
        const lm = new THREE.Matrix4().compose(
          new THREE.Vector3((x0 + x1) / 2, bandY + (y0 + y1) / 2, f.off + 0.008),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a), new THREE.Vector3(1, 1, 1));
        B.add(B.box(len, th, 0.035), m.clone().multiply(face).multiply(lm), { color: carve, moss: 0, emit, ground: gm - bury, disp: 0.07, dispScale: 0.9 });
      };
      const usable = f.w - 0.3;
      // band rules above and below
      stroke(-usable / 2, 0.3, usable / 2, 0.3, 0.035);
      stroke(-usable / 2, -0.3, usable / 2, -0.3, 0.035);
      const ng = Math.max(1, Math.floor(usable / 0.34));
      for (let k = 0; k < ng; k++) {
        const gx = -usable / 2 + (k + 0.5) * (usable / ng);
        // a glyph: strokes between nodes of a 3x4 lattice
        const node = (i, j) => [gx + (i - 1) * 0.085, (j - 1.5) * 0.12];
        const nStrokes = 3 + Math.floor(rng() * 3);
        for (let s = 0; s < nStrokes; s++) {
          const i0 = Math.floor(rng() * 3), j0 = Math.floor(rng() * 4);
          const di = Math.floor(rng() * 3) - 1, dj = rng() < 0.6 ? (rng() < 0.5 ? -1 : 1) * (1 + Math.floor(rng() * 2)) : 0;
          const i1 = Math.min(2, Math.max(0, i0 + di)), j1 = Math.min(3, Math.max(0, j0 + dj));
          if (i0 === i1 && j0 === j1) continue;
          const [ax, ay] = node(i0, j0), [bx, by] = node(i1, j1);
          stroke(ax, ay, bx, by);
        }
      }
    }
    ctx.addCollider({ x, z, r: 1.15 });
  }

  // the altar: a low hexagonal slab, its top stone split and shifted
  {
    const gm = ground.groundAt(L.x, L.z);
    B.add(B.cyl(1.75, 1.9, 0.75, 6, 1), mat(L.x, gm + 0.1, L.z, 0, 0.1, 0), { color: vary(tints.old, rng, 0.04), moss: 0.9, ground: gm, disp: 0.04, dispScale: 1.5 });
    B.add(B.cyl(1.95, 2.0, 0.22, 6, 1), mat(L.x, gm - 0.1, L.z, 0, 0.1, 0), { color: vary(tints.old, rng, 0.05), moss: 1, ground: gm, disp: 0.04 });
    for (const s of [-1, 1]) {
      const g = B.cyl(1.4, 1.45, 0.24, 6, 1);
      // keep one half of the hexagon
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getX(i) * s < 0) pos.setX(i, 0);
      B.add(g, mat(L.x + s * 0.06, gm + 0.6, L.z + s * 0.05, s * 0.02, 0.1 + s * 0.04, 0.03 * s), { color: vary(tints.old, rng, 0.05), moss: 0.6, ground: gm, disp: 0.03 });
    }
    ctx.addCollider({ x: L.x, z: L.z, r: 1.85 });
  }

  // a ring of lesser stones, some still leaning, most fallen
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2 + (rng() - 0.5) * 0.15;
    const rr = 13 + (rng() - 0.5) * 1.6;
    const x = L.x + Math.cos(a) * rr, z = L.z + Math.sin(a) * rr;
    const gm = ground.groundAt(x, z);
    const h = 1.4 + rng() * 1.4, w = 0.7 + rng() * 0.4, d = 0.45 + rng() * 0.2;
    const tint = vary(tints.old, rng, 0.07).multiplyScalar(0.8);
    if (rng() < 0.45) {
      const lean = (rng() - 0.5) * 0.35;
      B.add(B.box(w, h + 0.6, d, { chip: 0.1, seed: i }), mat(x, gm + (h + 0.6) / 2 - 0.6, z, lean, a + Math.PI / 2, (rng() - 0.5) * 0.2), { color: tint, moss: 1, ground: gm, disp: 0.05, dispScale: 1.4 });
      ctx.addCollider({ x, z, r: 0.55 });
    } else {
      B.add(B.box(w, h, d, { chip: 0.12, seed: i }), mat(x, gm + d * 0.25, z, Math.PI / 2 + (rng() - 0.5) * 0.15, a + (rng() - 0.5) * 1.2, (rng() - 0.5) * 0.1), { color: tint, moss: 1, ground: gm - 0.2, disp: 0.05, dispScale: 1.4 });
      if (rng() < 0.6) rubblePile(B, env, x, z, 0.9, 4, { height: 0.15, size: 0.3, blocks: 0 });
    }
  }
  // a few rocks between
  for (let i = 0; i < 4; i++) {
    const a = rng() * 6.28, rr = 4 + rng() * 6;
    rubblePile(B, env, L.x + Math.cos(a) * rr, L.z + Math.sin(a) * rr, 0.8, 3, { height: 0.1, size: 0.3, blocks: 0 });
  }
}
