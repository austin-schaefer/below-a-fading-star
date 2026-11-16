// The Late folk's lesser ways and the Heliarch undercrofts (v15-V0): the kit's ramp, bridge, roof walk and vault.
//   ramp(K, { name, pts: [[x, y, z], ...] (its centre line, top first), width, revet: -1 | +1 | 0 (the side that is
//             held up by a plank revetment: left or right of the way down), base(x, z) -> y (the ground under it) })
//             rammed earth between planks, cleats across it
//   bridge(K, { name, a: [x, y, z], b: [x, y, z], width (1.1), rails (true), register })   planks on two baulks
//   roofWalk(K, { name, pts: [[x, z] x 4] (round the roof), y, parapet: [bool x 4] (which edges carry a low wall, edge
//             i from pts[i] to pts[i + 1]), h (0.55), color })   a flat roof as a stacked floor; the parapet is drawn,
//             every edge holds (an edge onto a floor within a step stays open)
//   undercroft(K, plot, { riser: { D, top, foot }, depth (3.2) })   a Heliarch barrel vault let into a riser at a
//             shop's plot: lined, floored, a round-arched front; walls for the walker. The terrain is already cut
//             there (the plan's shops against a riser: src/v4/regions/height/demesne.js reads undercroftAt)
//   pier(K, { name, x, z, y0, y1, w, d, f })   a Heliarch pier (an aqueduct's last), a floor on its top
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { frame, rail } from './stairs.js';

const jit = (c, k) => c.clone().multiplyScalar(k);
function polyFloor(pts, y) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return (x, z) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return null;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [ax, az] = pts[j], [bx, bz] = pts[i]; if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside; }
    return inside ? y : null;
  };
}

export function ramp(K, o) {
  const { B, C } = K, rng = K.rng, w = o.width ?? 2.2, earth = new THREE.Color('#6f5d47'), wood = C.late.wood;
  const P = o.pts, segs = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz), fx = dx / len, fz = dz / len;
    segs.push({ a, b, len, fx, fz });
    const F = frame(a[0], a[1], a[2], fx, fz), dy = b[1] - a[1], pitch = -Math.atan2(dy, len), sl = Math.hypot(len, dy);
    const g0 = Math.min(o.base(a[0], a[2]), o.base(b[0], b[2])) - 0.3, th = (a[1] + b[1]) / 2 - g0;
    // the earth: a slab as deep as it stands over the ground, its top following the fall
    B.add(B.box(w - 0.1, 0.5, sl + 0.25, { seg: 1.2 }), F.clone().multiply(mat(0, dy / 2 - 0.25 - (i % 2) * 0.012, len / 2, pitch, 0, 0)), { color: jit(earth, 0.85 + rng() * 0.3), moss: 0.7, ground: g0, disp: 0.03, dispScale: 2 });
    if (th > 0.6) B.add(B.box(w - 0.3 - (i % 2) * 0.03, th, len + 0.1), F.clone().multiply(mat(0, dy / 2 - 0.4 - th / 2, len / 2)), { color: jit(earth, 0.6), moss: 0.8, ground: g0 });
    // a cleat across it every stride and a half (a split log pegged down), so feet and barrows hold
    for (let s = 0.5; s < len; s += 1.15) B.add(B.cyl(0.05, 0.06, w - 0.25, 6, 1), F.clone().multiply(mat(0, dy * s / len + 0.02, s, 0, (rng() - 0.5) * 0.08, Math.PI / 2)), { color: jit(wood, 0.8 + rng() * 0.5), moss: 0.3, ground: g0 });
    // the revetment: posts driven in and boards behind them, as high as the ramp stands
    if (o.revet) {
      const sd = o.revet;
      for (let s = 0; s <= len + 0.01; s += len / Math.max(1, Math.round(len / 1.3))) {
        const eu = sd * (w / 2 + 0.02), gp = Math.min(g0, o.base(a[0] + fx * s + fz * eu, a[2] + fz * s - fx * eu) - 0.3); // (the ground where the post stands, at the edge: it can lie lower than under the ramp's middle)
        const y = dy * s / len, h = a[1] + y - gp - 0.05; // (its foot a finger into the ground)
        if (h > 0.5) B.add(B.box(0.13, h, 0.13), F.clone().multiply(mat(sd * (w / 2 + 0.02), y - h / 2 + 0.22, s, (rng() - 0.5) * 0.06, 0, sd * 0.04)), { color: jit(wood, 0.8 + rng() * 0.4), moss: 0.35, ground: g0 });
      }
      if (th > 0.5) for (let q = 0, nb = Math.ceil(th / 0.28); q < nb; q++) {
        const drop = 0.2 + q * 0.28; if (drop > th + 0.1) break;
        B.add(B.box(0.045, 0.25, sl - 0.03, { chip: 0.01 }), F.clone().multiply(mat(sd * (w / 2 - 0.08 - (i % 2) * 0.012 - (q % 2) * 0.02), dy / 2 - drop, len / 2, pitch * Math.max(0, 1 - q * 0.22), 0, 0)), { color: jit(wood, 0.9 + rng() * 0.7), moss: 0.35, ground: g0 });
      }
    }
  }
  const floor = (x, z) => {
    for (const s of segs) {
      const dx = x - s.a[0], dz = z - s.a[2], t = dx * s.fx + dz * s.fz, u = dx * s.fz - dz * s.fx;
      if (t < -0.05 || t > s.len + 0.05 || u > w / 2 || u < -w / 2) continue;
      return s.a[1] + (s.b[1] - s.a[1]) * Math.max(0, Math.min(1, t / s.len));
    }
    return null;
  };
  // Its edge holds a walker only where the ramp stands more than a step over its own foot. (v15-Q4: the ground just
  // outside the Pennyworth ramp's outer edge lies 0.3 m under its foot, so the controls' own rule, a drop of over
  // 0.6 m, held the edge to within 1.4 m of the foot: a wall nobody could see, a hand above the turf. Four touch
  // walks stuck on it.)
  const A = P[0], Z = P[P.length - 1], low = Math.min(A[1], Z[1]);
  const heightNear = (x, z) => { let best = Infinity, y = low; for (const s of segs) { const dx = x - s.a[0], dz = z - s.a[2], t = Math.max(0, Math.min(s.len, dx * s.fx + dz * s.fz)), ex = dx - s.fx * t, ez = dz - s.fz * t, d = ex * ex + ez * ez; if (d < best) { best = d; y = s.a[1] + (s.b[1] - s.a[1]) * t / s.len; } } return y; };
  const keep = (x, z) => heightNear(x, z) > low + 0.6;
  K.addFloor(floor, { name: o.name, keep, box: boxOf(P.map((p) => [p[0], p[2]]), w) });
  if (o.register !== false) K.ascent({ id: o.name, held: true, offs: [0.5], path: [[Z[0], Z[2], Z[1]], ...P.slice(1, -1).reverse().map((p) => [p[0], p[2], p[1]]), [A[0], A[2], A[1]]] });
  return { floor, keep };
}
const boxOf = (pts, pad) => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return [x0 - pad, x1 + pad, z0 - pad, z1 + pad]; };

export function bridge(K, o) {
  const { B, C } = K, rng = K.rng, w = o.width ?? 1.1, [ax, ay, az] = o.a, [bx, by, bz] = o.b, len = Math.hypot(bx - ax, bz - az), fx = (bx - ax) / len, fz = (bz - az) / len;
  const F = frame(ax, ay, az, fx, fz), wood = C.late.wood, grey = jit(wood, 1.5), dy = by - ay, pitch = -Math.atan2(dy, len);
  for (const sd of [-1, 1]) B.add(B.box(0.16, 0.22, Math.hypot(len, dy) + 0.7, { chip: 0.02 }), F.clone().multiply(mat(sd * (w / 2 - 0.12), dy / 2 - 0.17, len / 2, pitch, sd * 0.01, 0)), { color: jit(wood, 0.75 + rng() * 0.2), moss: 0.3, ground: Math.min(ay, by) - 2 });
  const n = Math.round(len / 0.24);
  for (let i = 0; i < n; i++) {
    if (o.gaps && rng() < 0.05) continue; // a board gone (never two together: the floor under it is whole)
    const t = (i + 0.5) / n, sag = -0.06 * Math.sin(t * Math.PI);
    B.add(B.box(w + rng() * 0.12, 0.045, len / n - 0.02, { chip: 0.01 }), F.clone().multiply(mat((rng() - 0.5) * 0.04, dy * t + sag - 0.02, len * t, pitch, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.03)), { color: jit(grey, rng() < 0.12 ? 1.3 : 0.7 + rng() * 0.4), moss: 0.15, ground: Math.min(ay, by) - 2 });
  }
  if (o.rails !== false) for (const sd of [-1, 1]) rail(K, [[ax + fz * sd * (w / 2 - 0.07), ay, az - fx * sd * (w / 2 - 0.07)], [bx + fz * sd * (w / 2 - 0.07), by, bz - fx * sd * (w / 2 - 0.07)]], { h: 0.95, every: 1.6, paint: sd > 0 ? C.late.paint[2] : undefined });
  const floor = (x, z) => {
    const dx = x - ax, dz = z - az, t = dx * fx + dz * fz, u = dx * fz - dz * fx;
    if (t < 0 || t > len || u > w / 2 || u < -w / 2) return null;
    return ay + dy * (t / len);
  };
  K.addFloor(floor, { name: o.name, keep: o.rails !== false ? true : 'up', box: boxOf([[ax, az], [bx, bz]], w) }); // (held where its rails are drawn)
  if (o.register !== false) K.ascent({ id: o.name, held: true, offs: [0.5], path: [[ax - fx * 1.2, az - fz * 1.2, ay], [ax, az, ay], [bx, bz, by], [bx + fx * 1.2, bz + fz * 1.2, by]] });
  return { floor, len };
}

export function roofWalk(K, o) {
  const { B, C } = K, h = o.h ?? 0.55, col = o.color || C.late.plaster[3], P = o.pts;
  for (let i = 0; i < 4; i++) {
    if (!(o.parapet ?? [true, true, true, true])[i]) continue;
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % 4], len = Math.hypot(bx - ax, bz - az);
    B.add(B.box(0.24, h, len + 0.24, { chip: 0.03, seed: i }), frame(ax, o.y, az, (bx - ax) / len, (bz - az) / len).multiply(mat(0, h / 2, len / 2)), { color: jit(col, 0.9), moss: 0.25, ground: o.y - 3 });
  }
  const floor = polyFloor(P, o.y);
  // held on the sides that carry a parapet, open on the rest (v15-W3: what is seen holds)
  const par = o.parapet ?? [true, true, true, true];
  const keep = (x, z) => { let best = Infinity, k = 0; for (let i = 0; i < 4; i++) { const [ax, az] = P[i], [bx, bz] = P[(i + 1) % 4], ux = bx - ax, uz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * ux + (z - az) * uz) / (ux * ux + uz * uz))), d = Math.hypot(x - ax - ux * t, z - az - uz * t); if (d < best) { best = d; k = i; } } return !!par[k]; };
  K.addFloor(floor, { name: o.name, keep, box: boxOf(P, 0.3) });
  return { floor };
}

export function pier(K, o) {
  const { B, C } = K, h = o.y1 - o.y0, F = frame(o.x, o.y0, o.z, o.f[0], o.f[1]), stone = C.heliarch.stone;
  B.add(B.box(o.w + 0.3, 0.5, o.d + 0.3, { chip: 0.05 }), F.clone().multiply(mat(0, 0.2, 0)), { color: C.heliarch.dark, course: 0.5, moss: 0.6, ground: o.y0 });
  B.add(B.box(o.w, h - 0.3, o.d, { chip: 0.05, seed: 3 }), F.clone().multiply(mat(0, (h - 0.3) / 2, 0)), { color: stone, course: 0.5, moss: 0.4, ground: o.y0 });
  B.add(B.box(o.w + 0.28, 0.3, o.d + 0.28, { chip: 0.06, seed: 5 }), F.clone().multiply(mat(0, h - 0.15, 0)), { color: jit(stone, 0.9), course: 0, moss: 0.4, ground: o.y0 });
  // the springing of the arch that is gone, on the side toward the hill: three voussoirs still in place
  for (let i = 0; i < 3; i++) { const a = 0.25 + i * 0.3; B.add(B.box(o.w * 0.86, 0.5, 0.62, { chip: 0.05, seed: i }), F.clone().multiply(mat(0, h - 0.9 - Math.cos(a) * 0.2 + i * 0.36, -o.d / 2 - 0.2 - i * 0.42, -a, 0, 0)), { color: jit(stone, 0.86 + i * 0.05), course: 0, moss: 0.45, ground: o.y0 }); }
  const [fx, fz] = o.f, c = (u, v) => [o.x + fz * u + fx * v, o.z - fx * u + fz * v];
  const floor = polyFloor([c(-o.w / 2 - 0.1, -o.d / 2 - 0.1), c(o.w / 2 + 0.1, -o.d / 2 - 0.1), c(o.w / 2 + 0.1, o.d / 2 + 0.1), c(-o.w / 2 - 0.1, o.d / 2 + 0.1)], o.y1);
  K.addFloor(floor, { name: o.name, keep: true });
  K.wall(...c(-o.w / 2 + o.d / 2, 0), ...c(o.w / 2 - o.d / 2, 0), o.d / 2 - 0.1, o.y0 - 0.5, h + 0.5 - 0.05);
  return { floor };
}

export function undercroft(K, p, o) {
  const { B, C, plan } = K, R = o.riser, depth = o.depth ?? 3.2, w = p.w - 1, y0 = R.foot, yT = R.top - 0.42, stone = C.heliarch.stone, dark = C.heliarch.dark;
  const n = plan.RUN[p.run].n, [x, z] = plan.at(p.run, p.s, R.D), F = frame(x, y0, z, n[0], n[1]); // +z out of the riser, the origin on its face at the floor
  const rad = Math.min(w / 2 - 0.25, yT - y0 - 1.0), spring = yT - y0 - rad - 0.1;
  // the lining: side walls, the back, the vault (a half barrel of nine staves), seen from inside
  // the room, seen from inside: the floor, two walls to the springing, the barrel over them, the back wall with its lunette
  {
    const hwR = w / 2 - 0.04, rise = yT - y0 - spring, NS = 10, pos = [], idx = [];
    const ring = [[-hwR, 0], [-hwR, spring]];
    for (let i = 1; i < NS; i++) { const a = Math.PI * (1 - i / NS); ring.push([Math.cos(a) * hwR, spring + Math.sin(a) * rise]); }
    ring.push([hwR, spring], [hwR, 0]);
    // the shell: each span of the section drawn from the front (z 0) to the back (z -depth), facing in
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % ring.length], b0 = pos.length / 3;
      pos.push(ax, ay, 0, bx, by, 0, bx, by, -depth, ax, ay, -depth);
      idx.push(b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2);
    }
    // the back wall: a fan from the middle of its foot
    const c0 = pos.length / 3; pos.push(0, 0, -depth);
    for (const [x, y] of ring) pos.push(x, y, -depth);
    for (let i = 0; i < ring.length - 1; i++) idx.push(c0, c0 + 2 + i, c0 + 1 + i);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    B.add(g.toNonIndexed(), F.clone(), { color: jit(stone, 0.72), course: 0.45, moss: 0.25, wet: 0.3, ground: y0 });
  }
  // the front: an ashlar wall across the opening with a round arch through it, its voussoirs a shade darker
  const sh = new THREE.Shape(), hw = w / 2 + 0.02, top = R.top - y0 - 0.005;
  sh.moveTo(-hw, -0.4); sh.lineTo(hw, -0.4); sh.lineTo(hw, top); sh.lineTo(-hw, top); sh.lineTo(-hw, -0.4);
  const hole = new THREE.Path(), sp = Math.min(spring, top - rad - 0.35);
  hole.moveTo(-rad, -0.4); hole.lineTo(-rad, sp); hole.absarc(0, sp, rad, Math.PI, 0, true); hole.lineTo(rad, -0.4); hole.lineTo(-rad, -0.4);
  sh.holes.push(hole);
  B.add(B.extrude(sh, 0.5, 14), F.clone().multiply(mat(0, 0, -0.25)), { color: stone, course: 0.48, moss: 0.4, ground: y0 });
  const ring = new THREE.Shape(); const ri = rad - 0.035; ring.moveTo(-rad - 0.34, sp); ring.absarc(0, sp, rad + 0.34, Math.PI, 0, true); ring.lineTo(ri, sp); ring.absarc(0, sp, ri, 0, Math.PI, false); ring.lineTo(-rad - 0.34, sp); // (a finger proud of the wall's own arch: no two faces in one surface)
  B.add(B.extrude(ring, 0.6, 14), F.clone().multiply(mat(0, 0, -0.18)), { color: dark, course: 0, moss: 0.35, ground: y0 });
  // the keystone carries the hexagon
  B.add(B.cyl(0.2, 0.2, 0.08, 6, 1), F.clone().multiply(mat(0, sp + rad + 0.17, 0.14, Math.PI / 2, 0, 0)), { color: C.heliarch.bronze, iron: 0.3, moss: 0.05, ground: y0 });
  // a threshold, worn in the middle
  B.add(B.box(rad * 2 + 0.3, 0.12, 0.7, { chip: 0.03 }), F.clone().multiply(mat(0, 0.0, -0.1)), { color: jit(dark, 0.9), moss: 0.5, ground: y0 });
  // walls for the walker: the two jambs, the two sides and the back
  const c = (u, v) => { const q = new THREE.Vector3(u, 0, v).applyMatrix4(F); return [q.x, q.z]; };
  const hgt = R.top - y0 + 0.6, wy = y0 - 0.6;
  K.wall(...c(-hw, -0.1), ...c(-rad - 0.3, -0.1), 0.3, wy, hgt);
  K.wall(...c(hw, -0.1), ...c(rad + 0.3, -0.1), 0.3, wy, hgt);
  K.wall(...c(-w / 2 - 0.3, 0), ...c(-w / 2 - 0.3, -depth), 0.3, wy, hgt);
  K.wall(...c(w / 2 + 0.3, 0), ...c(w / 2 + 0.3, -depth), 0.3, wy, hgt);
  K.wall(...c(-w / 2, -depth - 0.3), ...c(w / 2, -depth - 0.3), 0.3, wy, hgt);
  return { door: c(0, 0), inside: c(0, -depth / 2), rad, spring: y0 + sp };
}
