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
//   (stone: which sides carry a wall, default both), open (stone: the cheek stops where the treads are this high over
//   the lower floor, 1.0), flare (stone: the open treads under it stand out this far past the cheek's line, 0.5; 0
//   keeps them the flight's width), register (true: an ascent), lamp }
// Each returns { foot: [x, y, z], length, floor, steps }.
// A stone flight's foot is seen and walked into from the floor it lands on, from either side (v15-W7, the cold critic:
// "every flight's foot is hidden behind its own side wall"): its cheek and newel stop where the treads are a metre up
// (under that the fall off a tread's side is a step or two, which the edge-guard and the eye manage), and the open
// treads under it splay out past the cheek's line, so the foot is wider than the flight and its lowest steps are seen
// past the cheek's end from along the lane. tools/ways-test.mjs `seen` and `walked` guard it.
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
// the walked floor of a flight: null off it; the tread under (x, z). `spl`: { w0 (along: where the splayed treads
// begin), l, r (how far past `half` they reach on the left and right) }
function flightFloor(o, S, half, spl = null) {
  const [fx, fz] = o.f, x0 = o.x, z0 = o.z, y0 = o.y, L = S.length, ex = half + 0.5 + (spl ? Math.max(spl.l, spl.r) : 0);
  const bx0 = Math.min(x0, x0 + fx * L) - ex, bx1 = Math.max(x0, x0 + fx * L) + ex, bz0 = Math.min(z0, z0 + fz * L) - ex, bz1 = Math.max(z0, z0 + fz * L) + ex;
  return (x, z) => {
    if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return null;
    const dx = x - x0, dz = z - z0, w = dx * fx + dz * fz, u = dx * fz - dz * fx;
    if (w < 0 || w >= L) return null;
    const wide = spl && w >= spl.w0;
    if (u > half + (wide ? spl.r : 0) || u < -half - (wide ? spl.l : 0)) return null;
    return y0 - (Math.floor(w / S.run) + 1) * S.rise;
  };
}
function finish(K, o, S, floor, held = true) {
  K.addFloor(floor, { name: o.name, keep: held });
  const foot = [o.x + o.f[0] * S.length, o.y - o.drop, o.z + o.f[1] * S.length];
  if (o.register !== false) {
    // from a stride past the foot to a stride onto the upper floor, then on to `land` (default: two strides on)
    const up = [o.x - o.f[0] * 0.9, o.z - o.f[1] * 0.9, o.y], on = o.land ? [o.land[0], o.land[2], o.land[1]] : [o.x - o.f[0] * 2.1, o.z - o.f[1] * 2.1, o.y];
    const dn = [foot[0] + o.f[0] * 1.2, foot[2] + o.f[1] * 1.2, foot[1]];
    K.ascent({ id: o.name, path: [dn, [foot[0], foot[2], foot[1]], up, on], offs: [0.4], held: true });
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
  const back = o.back ?? 0.3; // its mass runs on behind the head, into the floor it leaves (a back face in the first riser's plane would show)
  sh.lineTo(S.length, base); sh.lineTo(-back, base); sh.lineTo(-back, -0.05); sh.lineTo(0, 0); // (its top falls away behind: never in the floor's own plane)
  B.add(B.extrude(sh, w), F.clone().multiply(ROT_PROFILE), { color: stone, course: 0.5, moss: 0.35, ground });
  const cheeks = o.cheeks ?? [true, true];
  // where the cheek stops: the first tread this high over the lower floor or lower (i: the tread's index, 1..n-1)
  const openH = o.open ?? 1.0, iOpen = Math.min(S.n - 1, Math.max(1, Math.ceil(S.n - openH / S.rise))), wOpen = (iOpen - 1) * S.run, fl = o.flare ?? 0.5;
  const splay = fl > 0 && iOpen < S.n - 1 ? { w0: wOpen, l: cheeks[0] ? fl : 0, r: cheeks[1] ? fl : 0 } : null;
  if (splay && !splay.l && !splay.r) splay.w0 = Infinity;
  // the splay: the open treads' own blocks either side, a finger under the flight's treads (no two tops in one plane)
  if (splay) [-1, 1].forEach((sd, k) => {
    const ext = k ? splay.r : splay.l; if (!ext) return;
    const sp = new THREE.Shape(), d = 0.015;
    // (its underside a little under the flight's, its risers a finger proud of the flight's: no two faces in one plane)
    const bs = base - 0.03, q = 0.015;
    sp.moveTo(wOpen + q, bs); sp.lineTo(wOpen + q, -iOpen * S.rise - d);
    for (let i = iOpen; i < S.n; i++) { sp.lineTo(i * S.run + q, -i * S.rise - d); if (i < S.n - 1) sp.lineTo(i * S.run + q, -(i + 1) * S.rise - d); }
    sp.lineTo(S.length + q, bs); sp.lineTo(wOpen + q, bs);
    B.add(B.extrude(sp, ext + 0.04), F.clone().multiply(mat(sd * (w / 2 + ext / 2 - 0.02), 0, 0)).multiply(ROT_PROFILE), { color: jit(stone, 0.95), course: 0.5, moss: 0.45, ground });
  });
  [-1, 1].forEach((sd, k) => {
    if (!cheeks[k]) return;
    // a cheek wall: from the base up to 0.95 over the pitch line, 0.3 thick, a moulded coping on it; it stops at the
    // tread `iOpen` (a metre up), where a newel stands, and the treads under it are open at the side (v15-W7; v15-W4
    // had ended it at the last tread, and a walker coming along the floor beside the foot met its flank)
    // (Behind the head the cheek still runs on a hand: it guards the slot.)
    const c = new THREE.Shape(), top = o.cheekTop ?? 0.95, e = 0.25, L = wOpen + 0.05, yL = -o.drop * Math.min(1, L / S.length);
    c.moveTo(-e, top); c.lineTo(L, yL + top + 0.05); c.lineTo(L, base); c.lineTo(-e, base); c.lineTo(-e, top);
    B.add(B.extrude(c, 0.3), F.clone().multiply(mat(sd * (w / 2 + 0.15), 0, 0)).multiply(ROT_PROFILE), { color: jit(stone, 0.92), course: 0.5, moss: 0.4, ground });
    const len = Math.hypot(L + e, yL), pitch = Math.atan2(-yL, L + e);
    B.add(B.box(0.42, 0.13, len - 0.3, { chip: 0.02 }), F.clone().multiply(mat(sd * (w / 2 + 0.15), top + 0.06 + yL / 2 + 0.03, (L - e) / 2 - 0.12, pitch, 0, 0)), { color: C.heliarch.dark, moss: 0.45, ground });
    // a hexagonal newel where it stops, from the ground (the splay's or the floor's) to over the tread beside it
    // (its foot short of the splay's first tread, so a walker on the splay does not brush it)
    const yT = -iOpen * S.rise, b0 = base + 0.07, hN = yT + 1.25 - b0, uN = sd * (w / 2 + 0.15), wN = L - 0.32; // (its foot a hand over the flight's underside: no two faces in one plane)
    B.add(B.cyl(0.24, 0.27, hN, 6, 1), F.clone().multiply(mat(uN, b0 + hN / 2, wN)), { color: jit(stone, 0.86), course: 0.4, moss: 0.4, ground });
    B.add(B.cyl(0.3, 0.3, 0.1, 6, 1), F.clone().multiply(mat(uN, b0 + hN + 0.02, wN)), { color: C.heliarch.dark, moss: 0.3, ground });
  });
  // nobody walks into its mass from beside it: a wall along each side's line in pieces (the splay's edge where it
  // has one), each one's top under the treads beside it (the lowest treads, within a step of the floor, are stepped
  // onto from any side)
  const yb = o.y + base, n = Math.ceil(S.length / 0.9);
  [-1, 1].forEach((sd, k) => {
    for (let i = 0; i < n; i++) {
      const a = S.length * i / n, b = S.length * (i + 1) / n, top = o.y - o.drop * Math.min(1, (b + 0.7) / S.length) - 0.4;
      if (top < o.y - o.drop + 0.3) continue;
      const out = splay && b > splay.w0 ? (k ? splay.r : splay.l) : 0, u = sd * (w / 2 + 0.05 + out), px = o.f[1] * u, pz = -o.f[0] * u;
      K.wall(o.x + o.f[0] * a + px, o.z + o.f[1] * a + pz, o.x + o.f[0] * b + px, o.z + o.f[1] * b + pz, 0.15, yb, top - yb);
    }
  });
  return finish(K, o, S, flightFloor(o, S, w / 2, splay));
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
      B.add(B.box(0.07, hgt + 0.3, 0.07), F.clone().multiply(mat(sd * (w / 2 + 0.058), -t * (o.drop - S.rise) - S.rise + hgt / 2 + 0.02, t * S.length, (rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.05)), { color: jit(wood, 0.9 + rng() * 0.3), moss: 0.15, ground });
    }
    B.add(B.cyl(0.035, 0.04, len + 0.3, 6, 1), F.clone().multiply(mat(sd * (w / 2 + 0.07), -(o.drop) / 2 + 0.92 - S.rise / 2, S.length / 2, pitch + Math.PI / 2, 0, 0)), { color: jit(wood, k ? 0.95 : 0.7), moss: 0.2, ground }); // (bare poles: a painted one read as a toy)
  });
  // props under it, where it has a floor to stand on: a pair of legs and a diagonal at the given fractions
  for (const t of o.props ?? []) {
    const yAt = -t * (o.drop - S.rise) - S.rise - 0.3, h = yAt - (o.propBase ?? ground) + o.y;
    if (h < 0.5) continue;
    for (const sd of [-1, 1]) B.add(B.box(0.1, h, 0.1), F.clone().multiply(mat(sd * (w / 2 - 0.115), yAt - h / 2, t * S.length, 0, 0, sd * 0.03)), { color: jit(wood, 0.85), moss: 0.25, ground });
    B.add(B.box(0.05, Math.hypot(h * 0.8, w), 0.08), F.clone().multiply(mat(0, yAt - h * 0.5, t * S.length + 0.06, 0, 0, Math.atan2(w, h * 0.8))), { color: jit(wood, 0.7), moss: 0.25, ground });
  }
  return finish(K, o, S, flightFloor(o, S, w / 2 + 0.05));
}

// a hexagon landing: o: { name, x, y, z (the middle of its near edge, on the axis), f, depth (along the axis), width
// (its near and far edges), wing (how far its side points stand out, default 1), base (y), parapet: sides that carry a
// low wall, of ['left', 'right', 'far'], parapetH (0.9), color }
export function hexLanding(K, o) {
  const { B, C } = K, d = o.depth ?? 2.2, w = o.width ?? 3, wing = o.wing ?? 1, F = frame(o.x, o.y, o.z, o.f[0], o.f[1]), h = o.y - o.base;
  const stone = o.color || C.heliarch.stone;
  const pts = wing > 0 ? [[-w / 2, 0], [w / 2, 0], [w / 2 + wing, d / 2], [w / 2, d], [-w / 2, d], [-w / 2 - wing, d / 2]] : [[-w / 2, 0], [w / 2, 0], [w / 2, d], [-w / 2, d]]; // (u, w)
  const sh = new THREE.Shape(); pts.forEach(([u, v], i) => (i ? sh.lineTo(u, -v) : sh.moveTo(u, -v))); sh.closePath();
  B.add(B.extrude(sh, h), F.clone().multiply(mat(0, -h / 2, 0, -Math.PI / 2, 0, 0)), { color: stone, course: 0.5, moss: 0.35, ground: o.base });
  // a darker border course round its top, and a bronze hexagon let into the middle (verdigris)
  const sh2 = new THREE.Shape(); pts.forEach(([u, v], i) => { const k = 0.82, cu = u * k, cv = (v - d / 2) * k + d / 2; i ? sh2.lineTo(cu, -cv) : sh2.moveTo(cu, -cv); }); sh2.closePath();
  B.add(B.extrude(sh2, 0.03), F.clone().multiply(mat(0, 0.012, 0, -Math.PI / 2, 0, 0)), { color: jit(stone, 1.12), moss: 0.2, ground: o.base });
  B.add(B.cyl(0.42, 0.42, 0.02, 6, 1), F.clone().multiply(mat(0, 0.035, d / 2)), { color: C.heliarch.bronze, moss: 0.05, iron: 0.3, ground: o.base });
  const edges = wing > 0 ? { right: [pts[1], pts[2], pts[3]], left: [pts[4], pts[5], pts[0]], far: [pts[3], pts[4]] } : { right: [pts[1], pts[2]], left: [pts[3], pts[0]], far: [pts[2], pts[3]] };
  // A parapet stands only where its side has a drop: where the ground outside is at the landing's level (the tread the
  // landing stands out from), it is left down for 0.9 m either side of that and ends in a newel, so a walker on the
  // landing turns onto the tread (v15-W4: the bastion's parapet wrapped its corners onto the Low Rung, the owner's
  // "here too"). Each standing run is a wall to the walker as well as drawn.
  const ph = o.parapetH ?? 0.9, T = K.ctx.terrain, toW = (u, v) => [o.x + o.f[1] * u + o.f[0] * v, o.z - o.f[0] * u + o.f[1] * v];
  for (const side of o.parapet ?? []) {
    const e = edges[side];
    for (let i = 0; i < e.length - 1; i++) {
      const [u0, v0] = e[i], [u1, v1] = e[i + 1], len = Math.hypot(u1 - u0, v1 - v0), a = Math.atan2(u1 - u0, v1 - v0);
      // outward: away from the landing's middle
      let nu = v1 - v0, nv = -(u1 - u0); const nl = Math.hypot(nu, nv) || 1; nu /= nl; nv /= nl;
      if (nu * ((u0 + u1) / 2) + nv * ((v0 + v1) / 2 - d / 2) < 0) { nu = -nu; nv = -nv; }
      const m = Math.max(2, Math.ceil(len / 0.2)), open = [];
      for (let k = 0; k <= m; k++) { const t = k / m, u = u0 + (u1 - u0) * t, v = v0 + (v1 - v0) * t; open.push([0.5, 1.0].some((q) => { const [x, z] = toW(u + nu * q, v + nv * q); return T && Math.abs(T.heightAt(x, z) - o.y) < 0.6; })); }
      const shut = open.map((_, k) => !open.some((op, j) => op && Math.abs(j - k) * len / m < 0.9));
      for (let k = 0; k < m;) {
        if (!shut[k] || !shut[k + 1]) { k++; continue; }
        let j = k; while (j < m && shut[j + 1]) j++;
        const t0 = k / m, t1 = j / m, l = (t1 - t0) * len, cu = u0 + (u1 - u0) * (t0 + t1) / 2, cv = v0 + (v1 - v0) * (t0 + t1) / 2, whole = k === 0 && j === m;
        B.add(B.box(0.3, ph, l + (whole ? 0.12 : 0), { chip: 0.02 }), F.clone().multiply(mat(cu, ph / 2, cv, 0, a, 0)), { color: jit(stone, 0.92), course: 0.45, moss: 0.4, ground: o.base });
        B.add(B.box(0.42, 0.12, l + (whole ? 0.2 : 0.06), { chip: 0.02 }), F.clone().multiply(mat(cu, ph + 0.06, cv, 0, a, 0)), { color: C.heliarch.dark, moss: 0.45, ground: o.base });
        for (const [kk, tt] of [[k, t0], [j, t1]]) if (kk !== 0 && kk !== m) { // a cut end: a newel, as at a flight's foot
          const nu0 = u0 + (u1 - u0) * tt, nv0 = v0 + (v1 - v0) * tt;
          B.add(B.cyl(0.24, 0.27, ph + 0.2, 6, 1), F.clone().multiply(mat(nu0, (ph + 0.2) / 2, nv0)), { color: jit(stone, 0.86), course: 0.4, moss: 0.4, ground: o.base });
          B.add(B.cyl(0.3, 0.3, 0.1, 6, 1), F.clone().multiply(mat(nu0, ph + 0.25, nv0)), { color: C.heliarch.dark, moss: 0.3, ground: o.base });
        }
        if (ph > 0.5) { const [ax, az] = toW(u0 + (u1 - u0) * t0, v0 + (v1 - v0) * t0), [bx, bz] = toW(u0 + (u1 - u0) * t1, v0 + (v1 - v0) * t1); K.wall(ax, az, bx, bz, 0.18, o.y - 0.1, ph + 0.22); }
        k = j + 1;
      }
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
  // (kept half a metre inside its edges and under its top, so a flight that leaves it is not pushed off its first treads)
  if (h > 0.7 && o.solid !== false) { const c = [o.x + fx * d / 2, o.z + fz * d / 2], r = d / 2 - 0.5, e = Math.max(0.05, w / 2 + wing * 0.4 - r - 0.5); K.wall(c[0] - fz * e, c[1] + fx * e, c[0] + fz * e, c[1] - fx * e, r, o.base - 0.5, h); }
  return { floor, far: [o.x + fx * d, o.y, o.z + fz * d] };
}

// a Late rail: a rope on leaning poles along pts [[x, y, z], ...], weathered, unpainted (o.paint is not used: a
// painted pole read as a playground bar). o: { h (1), every (1.9) }
const HEMP = new THREE.Color('#6a5b43');
export function rail(K, pts, o = {}) {
  const { B, C } = K, rng = K.rng, hgt = o.h ?? 1, wood = C.late.wood, low = K.ctx.quality === 'low';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dz), n = Math.max(1, Math.round(len / (o.every ?? 1.9)));
    const F = frame(a[0], a[1], a[2], dx / len, dz / len), pitch = -Math.atan2(dy, len);
    const tops = [];
    for (let j = 0; j <= n; j++) {
      // each pole its own height and lean (the first of a later span shares the last one's place, not its pole)
      const h = hgt * (0.9 + rng() * 0.25), lx = (rng() - 0.5) * 0.14, lz = (rng() - 0.5) * 0.06;
      if (j > 0 || i === 0) B.add(B.box(0.07 + rng() * 0.03, h + 0.06, 0.07 + rng() * 0.02), F.clone().multiply(mat(0, dy * j / n + h / 2 - 0.03, len * j / n, lx, 0, lz)) /* its foot ends in what it stands on, a finger deep */, { color: jit(wood, 0.55 + rng() * 0.35), moss: 0.3, ground: a[1] });
      tops.push([0, dy * j / n + h - 0.1, len * j / n + lx * h * 0.8]);
    }
    // the rope: tied a hand under each pole's top, hanging slack between them
    for (let j = 0; j < n; j++) {
      const p = tops[j], q = tops[j + 1], sag = 0.06 + rng() * 0.12, parts = low ? 2 : 3;
      for (let k = 0; k < parts; k++) {
        const t0 = k / parts, t1 = (k + 1) / parts, at = (t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t - sag * 4 * t * (1 - t), p[2] + (q[2] - p[2]) * t];
        const u = at(t0), v = at(t1), l = Math.hypot(v[0] - u[0], v[1] - u[1], v[2] - u[2]);
        B.add(B.cyl(0.018, 0.018, l + 0.02, 5, 1), F.clone().multiply(mat((u[0] + v[0]) / 2, (u[1] + v[1]) / 2, (u[2] + v[2]) / 2, Math.PI / 2 - Math.atan2(v[1] - u[1], v[2] - u[2]), 0, 0)), { color: jit(HEMP, 0.8 + rng() * 0.3), moss: 0.1, ground: a[1] });
      }
    }
    void pitch;
  }
}
