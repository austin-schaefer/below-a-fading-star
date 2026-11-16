// Stairs (v15-V0): the kit's flights and landings, each built into the site's Builder (the structures' stone shader)
// and walked on a stacked floor of its own. All in world metres; a flight is given by its head and the way it goes down.
//
//   frame(x, y, z, fx, fz)          a Matrix4 at (x, y, z) whose +z looks along [fx, fz] (unit) and +x to its right
//   stoneFlight(K, o)               Heliarch: a solid ashlar flight between cheek walls
//   timberFlight(K, o)              Late: plank treads on two stringers, a pole rail, propped from below; walked under
//   hexLanding(K, o)                a hexagon landing on a solid bastion (its points to the sides)
//   rail(K, pts, o)                 a Late pole rail on posts along [[x, y, z], ...]
// o for a flight: { name, x, y, z (the head: the upper floor's edge, on the axis), f: [fx, fz] (the way down),
//   drop (m), width, rise (about 0.22), run (0.29), base (y its mass goes down to; stone), cheeks: [left, right]
//   (stone: which sides carry a wall, default both), register (true: an ascent), lamp }
// Each returns { foot: [x, y, z], length, floor, steps }.
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';

export function frame(x, y, z, fx, fz) {
  return new THREE.Matrix4().makeRotationY(Math.atan2(fx, fz)).setPosition(x, y, z);
}
const ROT_PROFILE = new THREE.Matrix4().makeRotationY(-Math.PI / 2); // a profile drawn in (along, up) stood on the axis
const jit = (c, k) => c.clone().multiplyScalar(k);

// the steps of a flight: n risers, n - 1 treads; the last riser lands on the lower floor
function stepsOf(o) {
  const n = Math.max(2, Math.round(o.drop / (o.rise ?? 0.222))), rise = o.drop / n, run = o.run ?? 0.29;
  return { n, rise, run, length: (n - 1) * run };
}
// the walked floor of a flight: null off it; the tread under (x, z)
function flightFloor(o, S, half) {
  const [fx, fz] = o.f, x0 = o.x, z0 = o.z, y0 = o.y, L = S.length;
  const bx0 = Math.min(x0, x0 + fx * L) - half - 0.5, bx1 = Math.max(x0, x0 + fx * L) + half + 0.5, bz0 = Math.min(z0, z0 + fz * L) - half - 0.5, bz1 = Math.max(z0, z0 + fz * L) + half + 0.5;
  return (x, z) => {
    if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return null;
    const dx = x - x0, dz = z - z0, w = dx * fx + dz * fz, u = dx * fz - dz * fx;
    if (w < 0 || w >= L || u > half || u < -half) return null;
    return y0 - (Math.floor(w / S.run) + 1) * S.rise;
  };
}
function finish(K, o, S, floor, held = true) {
  K.addFloor(floor, { name: o.name, keep: held });
  const foot = [o.x + o.f[0] * S.length, o.y - o.drop, o.z + o.f[1] * S.length];
  if (o.register !== false) {
    const up = [o.x - o.f[0] * 1.2, o.z - o.f[1] * 1.2, o.y], dn = [foot[0] + o.f[0] * 1.2, foot[2] + o.f[1] * 1.2, foot[1]];
    K.ascent({ id: o.name, path: [dn, [foot[0], foot[2], foot[1]], [o.x, o.z, o.y], up], offs: [0.5], held: true });
  }
  return { foot, length: S.length, floor, steps: S };
}

export function stoneFlight(K, o) {
  const { B, C } = K, S = stepsOf(o), w = o.width ?? 3, base = (o.base ?? o.y - o.drop - 0.6) - o.y, F = frame(o.x, o.y, o.z, o.f[0], o.f[1]);
  const stone = o.color || C.heliarch.stone, ground = o.y - o.drop;
  // the flight's mass: its profile (treads, risers, the back and the base) drawn once and extruded across its width
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  for (let i = 1; i < S.n; i++) { sh.lineTo((i - 1) * S.run, -i * S.rise); sh.lineTo(i * S.run, -i * S.rise); }
  sh.lineTo(S.length, base); sh.lineTo(-(o.back ?? 0), base); sh.lineTo(-(o.back ?? 0), 0); sh.lineTo(0, 0);
  B.add(B.extrude(sh, w), F.clone().multiply(ROT_PROFILE), { color: stone, course: 0.5, moss: 0.35, ground });
  // worn nosings: every third tread's edge a paler strip (feet polish ashlar), and one tread cracked
  const cheeks = o.cheeks ?? [true, true];
  [-1, 1].forEach((sd, k) => {
    if (!cheeks[k]) return;
    // a cheek wall: from the base up to 0.95 over the pitch line, 0.3 thick, a moulded coping on it
    const c = new THREE.Shape(), top = o.cheekTop ?? 0.95, e = 0.25;
    c.moveTo(-e, top); c.lineTo(S.length + e, -o.drop + top); c.lineTo(S.length + e, base); c.lineTo(-e, base); c.lineTo(-e, top);
    B.add(B.extrude(c, 0.3), F.clone().multiply(mat(sd * (w / 2 + 0.15), 0, 0)).multiply(ROT_PROFILE), { color: jit(stone, 0.92), course: 0.5, moss: 0.4, ground });
    const len = Math.hypot(S.length + 2 * e, o.drop), pitch = Math.atan2(o.drop, S.length + 2 * e);
    B.add(B.box(0.42, 0.13, len + 0.06, { chip: 0.02 }), F.clone().multiply(mat(sd * (w / 2 + 0.15), top + 0.06 - o.drop / 2, S.length / 2, pitch, 0, 0)), { color: C.heliarch.dark, moss: 0.45, ground });
    // a hexagonal newel at the foot
    B.add(B.cyl(0.26, 0.3, 1.25, 6, 1), F.clone().multiply(mat(sd * (w / 2 + 0.15), -o.drop + 0.6, S.length + e + 0.1)), { color: jit(stone, 0.86), course: 0.4, moss: 0.4, ground });
    B.add(B.cyl(0.33, 0.33, 0.1, 6, 1), F.clone().multiply(mat(sd * (w / 2 + 0.15), -o.drop + 1.27, S.length + e + 0.1)), { color: C.heliarch.dark, moss: 0.3, ground });
  });
  // nobody walks through its mass from beside it or below it: a wall along the axis, its top just under the treads
  const yb = o.y + base;
  K.wall(o.x, o.z, o.x + o.f[0] * S.length, o.z + o.f[1] * S.length, w / 2 - 0.1, yb, o.y - 0.4 - yb, -o.drop);
  return finish(K, o, S, flightFloor(o, S, w / 2));
}

export function timberFlight(K, o) {
  const { B, C } = K, S = stepsOf({ rise: 0.235, run: 0.3, ...o }), w = o.width ?? 1.5, F = frame(o.x, o.y, o.z, o.f[0], o.f[1]);
  const wood = C.late.wood, grey = jit(C.late.wood, 1.5), ground = o.y - o.drop, rng = K.rng;
  const len = Math.hypot(S.length, o.drop - S.rise), pitch = Math.atan2(o.drop - S.rise, S.length);
  // two stringers, not quite parallel; the treads let into them, no two alike
  for (const sd of [-1, 1]) B.add(B.box(0.1, 0.26, len + 0.5, { chip: 0.015 }), F.clone().multiply(mat(sd * (w / 2 - 0.02), -(o.drop) / 2 - 0.16, S.length / 2, pitch, sd * 0.012, 0)), { color: jit(wood, 0.8 + rng() * 0.3), moss: 0.2, ground });
  for (let i = 1; i < S.n; i++) {
    const tw = w + 0.1 + rng() * 0.16, pale = rng() < 0.22; // a tread replaced last year, still pale
    B.add(B.box(tw, 0.055, S.run + 0.05, { chip: 0.012 }), F.clone().multiply(mat((rng() - 0.5) * 0.05, -i * S.rise - 0.028, (i - 0.5) * S.run, 0, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.035)), { color: pale ? jit(grey, 1.25) : jit(grey, 0.75 + rng() * 0.35), moss: pale ? 0.02 : 0.25, ground });
  }
  // a pole rail on posts, on one side or both; the posts nailed to the stringer's outside
  const rails = o.rails ?? [true, true];
  [-1, 1].forEach((sd, k) => {
    if (!rails[k]) return;
    const np = Math.max(2, Math.round(len / 1.7));
    for (let j = 0; j <= np; j++) {
      const t = j / np, hgt = 1.0 + (rng() - 0.5) * 0.08;
      B.add(B.box(0.07, hgt + 0.3, 0.07), F.clone().multiply(mat(sd * (w / 2 + 0.07), -t * (o.drop - S.rise) - S.rise + hgt / 2 - 0.15, t * S.length, (rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.05)), { color: jit(wood, 0.9 + rng() * 0.3), moss: 0.15, ground });
    }
    B.add(B.cyl(0.035, 0.04, len + 0.3, 6, 1), F.clone().multiply(mat(sd * (w / 2 + 0.07), -(o.drop) / 2 + 0.92 - S.rise / 2, S.length / 2, pitch + Math.PI / 2, 0, 0)), { color: k ? C.late.paint[1] : jit(wood, 1.1), moss: 0.1, ground });
  });
  // props under it, where it has a floor to stand on: a pair of legs and a diagonal at the given fractions
  for (const t of o.props ?? []) {
    const yAt = -t * (o.drop - S.rise) - S.rise - 0.3, h = yAt - (o.propBase ?? ground) + o.y;
    if (h < 0.5) continue;
    for (const sd of [-1, 1]) B.add(B.box(0.1, h, 0.1), F.clone().multiply(mat(sd * (w / 2 - 0.02), yAt - h / 2, t * S.length, 0, 0, sd * 0.03)), { color: jit(wood, 0.85), moss: 0.25, ground });
    B.add(B.box(0.05, Math.hypot(h * 0.8, w), 0.08), F.clone().multiply(mat(0, yAt - h * 0.5, t * S.length + 0.06, 0, 0, Math.atan2(w, h * 0.8))), { color: jit(wood, 0.7), moss: 0.25, ground });
  }
  return finish(K, o, S, flightFloor(o, S, w / 2 + 0.05));
}

// a hexagon landing: o: { name, x, y, z (the middle of its near edge, on the axis), f, depth (along the axis), width
// (its near and far edges), wing (how far its side points stand out, default 1), base (y), parapet: sides that carry a
// low wall, of ['left', 'right', 'far'], color }
export function hexLanding(K, o) {
  const { B, C } = K, d = o.depth ?? 2.2, w = o.width ?? 3, wing = o.wing ?? 1, F = frame(o.x, o.y, o.z, o.f[0], o.f[1]), h = o.y - o.base;
  const stone = o.color || C.heliarch.stone;
  const pts = [[-w / 2, 0], [w / 2, 0], [w / 2 + wing, d / 2], [w / 2, d], [-w / 2, d], [-w / 2 - wing, d / 2]]; // (u, w)
  const sh = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? sh.lineTo(u, -v) : sh.moveTo(u, -v))); sh.closePath();
  B.add(B.extrude(sh, h), F.clone().multiply(mat(0, -h / 2, 0, -Math.PI / 2, 0, 0)), { color: stone, course: 0.5, moss: 0.35, ground: o.base });
  // a darker border course round its top, and a bronze hexagon let into the middle (verdigris)
  const sh2 = new THREE.Shape(); pts.forEach(([u, v], i) => { const k = 0.82, cu = u * k, cv = (v - d / 2) * k + d / 2; i ? sh2.lineTo(cu, -cv) : sh2.moveTo(cu, -cv); }); sh2.closePath();
  B.add(B.extrude(sh2, 0.03), F.clone().multiply(mat(0, 0.012, 0, -Math.PI / 2, 0, 0)), { color: jit(stone, 1.12), moss: 0.2, ground: o.base });
  B.add(B.cyl(0.42, 0.42, 0.02, 6, 1), F.clone().multiply(mat(0, 0.035, d / 2)), { color: C.heliarch.bronze, moss: 0.05, iron: 0.3, ground: o.base });
  const edges = { right: [pts[1], pts[2], pts[3]], left: [pts[4], pts[5], pts[0]], far: [pts[3], pts[4]] };
  for (const side of o.parapet ?? []) {
    const e = edges[side];
    for (let i = 0; i < e.length - 1; i++) {
      const [u0, v0] = e[i], [u1, v1] = e[i + 1], len = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(u1 - u0, v1 - v0);
      B.add(B.box(0.3, 0.9, len + 0.12, { chip: 0.02 }), F.clone().multiply(mat((u0 + u1) / 2, 0.45, (v0 + v1) / 2, 0, a, 0)), { color: jit(stone, 0.92), course: 0.45, moss: 0.4, ground: o.base });
      B.add(B.box(0.42, 0.12, len + 0.2, { chip: 0.02 }), F.clone().multiply(mat((u0 + u1) / 2, 0.96, (v0 + v1) / 2, 0, a, 0)), { color: C.heliarch.dark, moss: 0.45, ground: o.base });
    }
  }
  const [fx, fz] = o.f, x0 = o.x, z0 = o.z, y = o.y, R = Math.hypot(w / 2 + wing, d) + 1;
  const floor = (x, z) => {
    const dx = x - x0, dz = z - z0;
    if (dx > R || dx < -R || dz > R || dz < -R) return null;
    const v = dx * fx + dz * fz, u = Math.abs(dx * fz - dz * fx);
    if (v < 0 || v > d || u > w / 2 + wing * (1 - Math.abs(v - d / 2) / (d / 2))) return null;
    return y;
  };
  if (o.floor !== false) K.addFloor(floor, { name: o.name, keep: true });
  // its bastion is solid: a wall round it for anyone below
  if (h > 0.7 && o.solid !== false) { const c = [o.x + fx * d / 2, o.z + fz * d / 2]; K.wall(c[0] - fz * (w / 2 + wing * 0.4), c[1] + fx * (w / 2 + wing * 0.4), c[0] + fz * (w / 2 + wing * 0.4), c[1] - fx * (w / 2 + wing * 0.4), d / 2 - 0.05, o.base - 0.5, h + 0.5 - 0.2); }
  return { floor, far: [o.x + fx * d, o.y, o.z + fz * d] };
}

// a Late rail: posts and one pole (and a lower rope) along pts [[x, y, z], ...]; o: { h (1), every (1.9), paint }
export function rail(K, pts, o = {}) {
  const { B, C } = K, rng = K.rng, hgt = o.h ?? 1, wood = C.late.wood;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / (o.every ?? 1.9)));
    const F = frame(a[0], a[1], a[2], dx / len, dz / len), pitch = -Math.atan2(dy, len);
    for (let j = i ? 1 : 0; j <= n; j++) B.add(B.box(0.075, hgt + 0.25, 0.075), F.clone().multiply(mat(0, dy * j / n + hgt / 2 - 0.12, len * j / n, (rng() - 0.5) * 0.06, 0, (rng() - 0.5) * 0.06)), { color: jit(wood, 0.8 + rng() * 0.4), moss: 0.15, ground: a[1] });
    B.add(B.cyl(0.035, 0.04, Math.hypot(len, dy) + 0.2, 6, 1), F.clone().multiply(mat(0, dy / 2 + hgt - 0.06, len / 2, pitch + Math.PI / 2, 0, 0)), { color: o.paint ?? jit(wood, 1.15), moss: 0.1, ground: a[1] });
    B.add(B.cyl(0.02, 0.02, Math.hypot(len, dy) + 0.1, 5, 1), F.clone().multiply(mat(0, dy / 2 + hgt * 0.52, len / 2, pitch + Math.PI / 2, 0, 0)), { color: jit(wood, 0.6), moss: 0.1, ground: a[1] });
  }
}
