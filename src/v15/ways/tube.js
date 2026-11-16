// The daylight main (v15-V0): a length of the Noonwrights' line laid straight down a stair of giants, so that it
// rests on each nosing and bridges each tread, and the Late folk's plank stair inside it. Glazed in fields, thrown
// in lengths joined at collars, cracked: its upper end torn open under its crown (the way in from the top floor), a
// breach in its side at the middle floor (a plank gangway to that tread), a crack along its crown where the sky gets
// in, its lower end broken off on the bottom floor. One collar still holds a little noon.
//
//   tube(K, { name, x, z, y (the top nosing where it rests, on its axis line), f: [fx, fz] (the way down), slope
//             (drop per metre along: the nosings' line), yEnd (the bottom floor), r (1.65, its bore), door: { y, side
//             (-1 left, +1 right of the way down), reach (how far back up the hill the gangway runs to the tread) } |
//             null, blocks: [[w0, w1, yFloor], ...] (where it lies too low over a floor to pass under), light (true) })
// Builds the glass into K.U (the Noonwrights' UnderBuilder: its own mesh and material), the planks, cribbing and
// gangway into K.B; registers the floors, the walls and the ascent. Returns { floor, top, end, length, lights }.
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { NOON, GLAZES } from '../../v8/strata/noon.js';
import { frame } from './stairs.js';

const FLOOR_UP = 0.65; // the planks' line above the tube's underside, square to it
export function tube(K, o) {
  const { B, U, C, ctx } = K, P = ctx.strata.parts.noon, rng = K.rng, low = ctx.quality === 'low';
  const [fx, fz] = o.f, k = o.slope, th = Math.atan(k), cs = Math.cos(th), sn = Math.sin(th), r = o.r ?? 1.65, Ro = r + 0.1;
  const rise = 0.2, run = rise / k, up = FLOOR_UP / cs, w0 = up / k; // the sill is level out to w0, then the stair
  const yb = (w) => o.y - k * w, ya = (w) => yb(w) + Ro / cs;
  const wEnd = (o.y + up - o.yEnd) / k, nSteps = Math.ceil((wEnd - w0) / run);
  const floorY = (w) => (w < w0 ? o.y : Math.max(o.yEnd, o.y - (Math.floor((w - w0) / run) + 1) * rise));
  const half = Math.sqrt(r * r - (r - FLOOR_UP) * (r - FLOOR_UP)) - 0.12;
  const pt = (w, u = 0, y = 0) => [o.x + fx * w + fz * u, y, o.z + fz * w - fx * u];
  // a length's frame: its origin on the axis at w, +z down the line (or up it), the crown toward the sky
  const lineM = (w, dirSign = 1) => {
    const z = new THREE.Vector3(fx * cs * dirSign, -sn * dirSign, fz * cs * dirSign), x = new THREE.Vector3(0, 1, 0).cross(z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
    const p = pt(w); return new THREE.Matrix4().makeBasis(x, y, z).setPosition(p[0], ya(w), p[2]);
  };
  const seg = low ? 22 : 34, wear = null;
  const along = (dw) => dw / cs; // metres of tube for metres of plan

  // ---- the glass
  const wTop = w0 + 0.5, wBot = wEnd - 1.3; // the whole section runs between these
  // the upper end: only the crown and shoulders left, a hood over the way in, its lip torn
  P.tube(U, lineM(wTop, -1), { r, len: along(wTop + 1.9), a0: -1.95, a1: 1.95, ragged: 0.9, collar: false, seed: 31, seg, wear, glaze: GLAZES[1] });
  const door = o.door ? (o.y + up - o.door.y) / k : null; // where the planks pass the door's floor
  const crack = wTop + (wBot - wTop) * 0.62;
  let w = wTop, i = 0;
  const cuts = [wTop];
  if (door) cuts.push(door - 0.85, door + 0.85);
  cuts.push(crack - 1.0, crack + 1.0, wBot);
  cuts.sort((a, b) => a - b);
  for (let c = 0; c < cuts.length - 1; c++) {
    const a = cuts[c], b = cuts[c + 1], isDoor = door && Math.abs((a + b) / 2 - door) < 0.1, isCrack = Math.abs((a + b) / 2 - crack) < 0.1;
    // a plain stretch is thrown in lengths of about 4 m, a collar at each joint
    const n = isDoor || isCrack ? 1 : Math.max(1, Math.round(along(b - a) / 4.2));
    for (let j = 0; j < n; j++) {
      const wa = a + (b - a) * j / n, wb = a + (b - a) * (j + 1) / n, G = GLAZES[i % 4];
      let a0 = -Math.PI, a1 = Math.PI, rag = 0;
      if (isDoor) { rag = 0.35; if (o.door.side > 0) { a0 = 2.35; a1 = Math.PI * 2 + 0.7; } else { a0 = -0.7; a1 = Math.PI * 2 - 2.35; } }
      if (isCrack) { rag = 0.5; a0 = 0.62; a1 = Math.PI * 2 - 0.5; }
      const lit = i === 2 ? 0.7 : 0;
      P.tube(U, lineM(wa), { r, len: along(wb - wa) + 0.03, a0, a1, ragged: rag * 0.4, collar: !(isDoor || isCrack) && (j > 0 || c > 0), seed: 40 + i * 3, seg, wear, glaze: G, inlay: !low && i % 2 === 0, inlayLit: lit, lit: lit || undefined });
      if (!(isDoor || isCrack)) i++;
    }
    w = b;
  }
  // the lower end: broken off; the crown runs on a little as a torn hood, and its shards lie on the floor
  P.tube(U, lineM(wBot), { r, len: along(1.9), a0: -1.7, a1: 1.5, ragged: 1, collar: true, seed: 77, seg, wear, glaze: GLAZES[3] });
  for (const [dw, du, a, s] of [[1.6, 2.1, 0.5, 1.0], [2.4, -1.7, 2.2, 0.8], [3.2, 0.6, 4.0, 0.65], [0.4, -2.4, 1.2, 0.5]]) {
    const p = pt(wEnd + dw - 0.8, du);
    P.tube(U, new THREE.Matrix4().makeRotationY(a).setPosition(p[0], o.yEnd - r * s + 0.32 * s, p[2]), { r: r * s, len: 0.8 + s, a0: -0.7, a1: 0.6, ragged: 0.8, collar: false, seed: 90 + dw * 7, seg: 10, wear, glaze: GLAZES[(dw * 3 | 0) % 4] });
  }
  // the noon it still holds: a steady lamp at the lit collar, seen through the door and the crack
  const lights = [];
  if (o.light !== false) {
    const wl = wTop + (wBot - wTop) * 0.36, p = pt(wl), L = new THREE.PointLight(new THREE.Color(NOON.lightHex), 7, 11, 2);
    L.position.set(p[0], ya(wl) + 0.5, p[2]); L.name = `${o.name}-light`; ctx.scene.add(L); lights.push(L);
    P.lens(U, lineM(wl).multiply(new THREE.Matrix4().makeTranslation(0, r - 0.08, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), { r: 0.42, lit: 1, cheap: low });
    ctx.registerUpdate((dt, t) => { L.intensity = 7 * (0.94 + 0.06 * Math.sin(t * 0.7)); }, { pos: { x: p[0], z: p[2] }, near: 40, hz: 2 });
  }

  // ---- the Late folk's planks: a sill at the top, then a stair down the bore, two stringers under it
  const Fr = frame(o.x, 0, o.z, fx, fz), wood = C.late.wood, grey = wood.clone().multiplyScalar(1.5);
  for (let q = 0; q < 4; q++) B.add(B.box(half * 2 - 0.1, 0.05, w0 / 4 + 0.04, { chip: 0.01 }), Fr.clone().multiply(mat(0, o.y - 0.028, (q + 0.5) * w0 / 4, 0, (rng() - 0.5) * 0.03, 0)), { color: grey.clone().multiplyScalar(0.75 + rng() * 0.35), moss: 0.2, ground: o.y - 1 });
  for (let s = 0; s < nSteps; s++) {
    const wS = w0 + (s + 0.5) * run, y = floorY(wS);
    if (y <= o.yEnd + 0.01) break;
    const pale = rng() < 0.15;
    B.add(B.box(half * 2 - 0.06 + rng() * 0.1, 0.05, run + 0.04, { chip: 0.01 }), Fr.clone().multiply(mat((rng() - 0.5) * 0.04, y - 0.028, wS, 0, (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.02)), { color: pale ? grey.clone().multiplyScalar(1.3) : grey.clone().multiplyScalar(0.7 + rng() * 0.35), moss: pale ? 0 : 0.18, ground: y - 1 });
  }
  const sl = Math.hypot(wEnd - w0, o.y - o.yEnd);
  for (const sd of [-1, 1]) B.add(B.box(0.1, 0.2, sl, { chip: 0.01 }), Fr.clone().multiply(mat(sd * (half - 0.25), (o.y + o.yEnd) / 2 - 0.2, (w0 + wEnd) / 2, th, 0, 0)), { color: wood.clone().multiplyScalar(0.8), moss: 0.3, ground: o.yEnd });

  // ---- where it lies too low to pass under: cribbing (what stops it sliding: squared stone and baulks) and a wall
  for (const [wa, wb, yF] of o.blocks || []) {
    const top = (ww) => yb(ww) - yF, xz = (ww, u) => { const q = pt(ww, u); return [q[0], q[2]]; };
    // a trestle across it where the headroom runs out; nobody passes under it from there down
    K.block(...xz(wa, 0), ...xz(wb - 0.3, 0), Ro - 0.3, yF);
    for (const sd of [-1, 1]) B.add(B.box(0.14, top(wa) + 0.3, 0.14), Fr.clone().multiply(mat(sd * (Ro - 0.45), yF + (top(wa) + 0.3) / 2, wa, 0, 0, -sd * 0.1)), { color: wood.clone().multiplyScalar(0.9), moss: 0.3, ground: yF });
    B.add(B.box(Ro * 2 - 0.5, 0.12, 0.12), Fr.clone().multiply(mat(0, yF + 1.0, wa, 0, 0, 0.03)), { color: wood.clone().multiplyScalar(0.75), moss: 0.3, ground: yF });
    for (const sd of [-1, 1]) {
      const wc = wb - 0.5, h = Math.max(0.4, top(wc - 0.35) + 0.25);
      B.add(B.box(0.9, h, 1.1, { chip: 0.07, seed: wa }), Fr.clone().multiply(mat(sd * (Ro * 0.62), yF + h / 2 - 0.02, wc, 0, sd * 0.2, 0)), { color: C.heliarch.dark, course: 0.45, moss: 0.5, ground: yF });
      const h2 = Math.max(0.5, top(wa + 0.4) - 0.1);
      B.add(B.box(0.24, h2, 0.24), Fr.clone().multiply(mat(sd * (Ro * 0.5), yF + h2 / 2, wa + 0.4, 0, 0, sd * 0.12)), { color: wood.clone().multiplyScalar(0.9), moss: 0.3, ground: yF });
      B.add(B.box(0.22, 0.22, Ro * 1.5), Fr.clone().multiply(mat(0, yF + h2 * 0.5, wa + 0.4 + sd * 0.14, 0, Math.PI / 2, sd * 0.3)), { color: wood.clone().multiplyScalar(0.7), moss: 0.3, ground: yF });
    }
  }

  // ---- the floors
  const L = wEnd, x0 = o.x, z0 = o.z, R2 = (L + 3) * (L + 3);
  const floor = (x, z) => {
    const dx = x - x0, dz = z - z0;
    if (dx * dx + dz * dz > R2) return null;
    const ww = dx * fx + dz * fz, u = dx * fz - dz * fx;
    if (ww < 0 || ww > L || u > half || u < -half) return null;
    return floorY(ww);
  };
  K.addFloor(floor, { name: o.name, keep: true });
  // the gangway from the door to its tread: planks on two baulks let into the riser, propped from the floor below
  if (o.door) {
    const sd = o.door.side, y = o.door.y, back = door - o.door.reach, u0 = half - 0.1, u1 = Ro + 1.35;
    const rects = [[door - 0.7, door + 0.7, u0, u1], [back - 0.15, door + 0.7, Ro + 0.3, u1]];
    for (const [wa, wb, ua, ub] of rects) {
      const n = Math.max(2, Math.round((wb - wa) / 0.26));
      for (let q = 0; q < n; q++) B.add(B.box(ub - ua + rng() * 0.08, 0.05, (wb - wa) / n - 0.015, { chip: 0.01 }), Fr.clone().multiply(mat(sd * (ua + ub) / 2, y - 0.028, wa + (q + 0.5) * (wb - wa) / n, 0, (rng() - 0.5) * 0.03, 0)), { color: grey.clone().multiplyScalar(0.7 + rng() * 0.4), moss: 0.15, ground: y - 2 });
    }
    for (const uu of [Ro + 0.45, u1 - 0.12]) B.add(B.box(0.16, 0.2, door + 0.7 - back + 0.9), Fr.clone().multiply(mat(sd * uu, y - 0.16, (back + door + 0.7) / 2 - 0.4)), { color: wood.clone().multiplyScalar(0.8), moss: 0.3, ground: y - 2 });
    if (o.door.propTo !== undefined) for (const uu of [Ro + 0.45, u1 - 0.12]) { const h = y - 0.26 - o.door.propTo; B.add(B.box(0.12, h, 0.12), Fr.clone().multiply(mat(sd * uu, o.door.propTo + h / 2, door - 0.75, 0, 0, sd * 0.02)), { color: wood.clone().multiplyScalar(0.9), moss: 0.3, ground: o.door.propTo }); }
    const gang = (x, z) => {
      const dx = x - x0, dz = z - z0;
      if (dx * dx + dz * dz > R2) return null;
      const ww = dx * fx + dz * fz, u = (dx * fz - dz * fx) * sd;
      for (const [wa, wb, ua, ub] of rects) if (ww >= wa && ww <= wb && u >= ua && u <= ub) return y;
      return null;
    };
    K.addFloor(gang, { name: `${o.name}-gangway`, keep: true });
    const e = (ww, uu) => pt(ww, sd * uu, y);
    K.rail([e(door + 0.7, u0 + 0.5), e(door + 0.7, u1), e(back + 0.1, u1)], { paint: C.late.paint[0] });
  }
  const top = pt(0, 0, o.y), end = pt(wEnd, 0, o.yEnd);
  K.ascent({ id: o.name, held: true, offs: [0.5], path: [[end[0] + fx * 1.5, end[2] + fz * 1.5, o.yEnd], [end[0], end[2], o.yEnd], [top[0] + fx * 0.5, top[2] + fz * 0.5, o.y], [top[0] - fx * 1.5, top[2] - fz * 1.5, o.y]] });
  return { floor, top, end, length: wEnd, lights, door, ya, yb, pt };
}
