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
import { NOON, GLAZES, put } from '../../v8/strata/noon.js';
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
  const seg = low ? 22 : 34;
  const hash1 = (n) => { const q = Math.sin(n * 127.1 + 311.7) * 43758.5453; return q - Math.floor(q); };
  const along = (dw) => dw / cs; // metres of tube for metres of plan

  // ---- the ware: one shell with a wall's thickness, glazed outside, washed inside, closed everywhere but where it
  // is broken. A break is a hole in the shell with an edge: the milk body in section between the two faces, its
  // outline irregular (the cells' corners are thrown about where they border a hole).
  const wTop = w0 + 0.5, wBot = wEnd - 1.3; // the whole section runs between these
  const door = o.door ? (o.y + up - o.door.y) / k : null; // where the planks pass the door's floor
  const crack = wTop + (wBot - wTop) * 0.62;
  const M0 = lineM(wTop), N2 = ctx.noise.noise2, LEN = 4.2;
  const Lm = along(wBot - wTop), tA = -along(wTop + 1.9), tB = Lm + 1.9, tD = door !== null ? along(door - wTop) : null, tC = along(crack - wTop);
  const nz = (a, t, q = 0) => N2(a * 1.4 + q * 7.3, t * 0.8 + q * 3.1);
  const open = (a, t) => {
    if (t < 0) return Math.abs(a) > 1.95 + 0.3 * nz(a, t) || t < tA + 0.7 + 0.7 * nz(a, t, 1); // the upper end: crown and shoulders left, the lip torn
    if (t > Lm) return a < -1.7 + 0.25 * nz(a, t) || a > 1.5 + 0.25 * nz(a, t) || t > tB - 0.7 - 0.7 * nz(a, t, 2); // the lower end, broken off
    if (tD !== null && Math.abs(t - tD) < 0.85 + 0.18 * nz(a, t, 3)) { const u = a * o.door.side; if (u > 0.7 + 0.12 * nz(a, t, 4) && u < 2.38) return true; } // the breach in its side
    const dc = (t - tC) / 1.9; // the crack along its crown, widest at its middle
    return Math.abs(dc) < 1 && Math.abs(a - 0.08 - 0.1 * Math.sin(t * 1.3)) < 0.4 * (1 - dc * dc) + 0.1 * nz(a, t, 5);
  };
  // a shell: cells na round by nt along; mask(a, t) true where it is gone. Outer, inner and edge go in as three parts.
  const shell = (Mx, S) => {
    const { na, t0, t1, a0 = -Math.PI, a1 = Math.PI, mask, rIn, rOut, seed = 1 } = S, nt = Math.max(1, Math.round((t1 - t0) / 0.48)), wrap = a1 - a0 > 6.28;
    const gone = (i, j) => { if (j < 0 || j >= nt) return true; if (wrap) i = (i + na) % na; else if (i < 0 || i >= na) return true; return mask(a0 + (a1 - a0) * (i + 0.5) / na, t0 + (t1 - t0) * (j + 0.5) / nt); };
    const V = (i, j) => { // a corner's place: thrown about if it borders a hole
      let a = a0 + (a1 - a0) * i / na, t = t0 + (t1 - t0) * j / nt;
      const g = [gone(i - 1, j - 1), gone(i, j - 1), gone(i - 1, j), gone(i, j)], some = g.some((q) => q), all = g.every((q) => q);
      if (some && !all) { const ii = wrap ? i % na : i; a += (hash1(ii * 3.1 + j * 7.7 + seed) - 0.5) * 0.7 * (a1 - a0) / na; t += (hash1(ii * 5.3 + j * 2.9 + seed) - 0.5) * 0.7 * (t1 - t0) / nt; }
      return [a, t];
    };
    const P = (rr, [a, t]) => [Math.sin(a) * rr, Math.cos(a) * rr, t];
    const parts = [{ pos: [], idx: [] }, { pos: [], idx: [] }, { pos: [], idx: [] }]; // outer, inner, edge
    const quad = (part, p, q, r2, s2) => { const n = part.pos.length / 3; part.pos.push(...p, ...q, ...r2, ...s2); part.idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
    // (outer and inner share corners between cells so the ware shades round, not in facets)
    const ids = [new Map(), new Map()];
    const vid = (w, rr, i, j) => { const key = (wrap ? (i % na) : i) + j * 1000, m = ids[w]; if (!m.has(key)) { m.set(key, parts[w].pos.length / 3); parts[w].pos.push(...P(rr, V(i, j))); } return m.get(key); };
    for (let j = 0; j < nt; j++) for (let i = 0; i < na; i++) {
      if (gone(i, j)) continue;
      const o4 = [vid(0, rOut, i, j), vid(0, rOut, i + 1, j), vid(0, rOut, i + 1, j + 1), vid(0, rOut, i, j + 1)];
      parts[0].idx.push(o4[0], o4[3], o4[1], o4[1], o4[3], o4[2]);
      const i4 = [vid(1, rIn, i, j), vid(1, rIn, i + 1, j), vid(1, rIn, i + 1, j + 1), vid(1, rIn, i, j + 1)];
      parts[1].idx.push(i4[0], i4[1], i4[3], i4[1], i4[2], i4[3]);
      const c = [V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)];
      const edge = (u, v) => quad(parts[2], P(rOut, c[u]), P(rOut, c[v]), P(rIn, c[v]), P(rIn, c[u]));
      if (gone(i, j - 1)) edge(0, 1); if (gone(i + 1, j)) edge(1, 2); if (gone(i, j + 1)) edge(2, 3); if (gone(i - 1, j)) edge(3, 0);
    }
    const geo = (part) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(part.pos, 3)); g.setIndex(part.idx); g.computeVertexNormals(); return g; };
    if (parts[0].idx.length) put(U, geo(parts[0]), Mx, { paint: S.outer, jit: 0.015 });
    if (parts[1].idx.length) put(U, geo(parts[1]), Mx, { paint: S.inner, jit: 0.015 });
    if (parts[2].idx.length) put(U, geo(parts[2]), Mx, { color: NOON.milk.clone().multiplyScalar(0.8), jit: 0.03 });
  };
  // the glazes, as a potter left them: each thrown length dipped in one quiet glaze, a band of a second brushed round
  // it below the collar and run in drips toward the tail; soot along the crown, lime crusted under the belly
  const quiet = (c, kq) => c.clone().lerp(NOON.biscuit, 0.3).multiplyScalar(kq);
  const fields = GLAZES.map((G) => [quiet(G[0], 0.8), quiet(G[1], 0.72)]);
  const setC = (out, c, kq) => { out[0] = c.r * kq; out[1] = c.g * kq; out[2] = c.b * kq; return out; };
  const outer = (x, y, z, out) => {
    const a = Math.atan2(x, y), li = Math.max(0, Math.floor(z / LEN)), tl = z - li * LEN, F = fields[((li % 4) + 4) % 4];
    const d = 0.5 + 0.5 * Math.sin(a * 7 + li * 2.1), drip = d * d * d * d * 1.3 + 0.12 * Math.sin(a * 19 + li);
    let kq = 0.94 + 0.06 * Math.sin(z * 39); // the wheel's rings
    kq *= 1 - 0.22 * Math.max(0, Math.cos(a)) ** 3; // soot settled along the crown
    const banded = z >= 0 && z <= Lm && tl > 0.3 && tl < 1.0 + drip;
    setC(out, banded ? F[1] : F[0], kq);
    const crust = Math.max(0, -Math.cos(a) - 0.72) * 2.2 * (0.6 + 0.4 * Math.sin(z * 2.3 + a * 5)); // lime, under the belly
    if (crust > 0) { const q = Math.min(0.55, crust); out[0] += (NOON.lime.r * 0.7 - out[0]) * q; out[1] += (NOON.lime.g * 0.7 - out[1]) * q; out[2] += (NOON.lime.b * 0.7 - out[2]) * q; }
    return out;
  };
  const wash = NOON.celadonT.clone().lerp(NOON.biscuit, 0.45);
  const inner = (x, y, z, out) => setC(out, wash, (0.62 + 0.05 * Math.sin(z * 39)) * (1 - 0.2 * Math.max(0, Math.cos(Math.atan2(x, y))))); // a thin wash, smoked overhead
  shell(M0, { na: seg, t0: tA, t1: tB, mask: open, rIn: r, rOut: Ro, outer, inner, seed: 3 });
  // a collar at each joint between two lengths, where the wall is whole all round
  for (let t = LEN; t < Lm - 0.6; t += LEN) {
    if ((tD !== null && Math.abs(t - tD) < 1.4) || Math.abs(t - tC) < 2.1) continue;
    const F = fields[Math.round(t / LEN) % 4];
    put(U, new THREE.TorusGeometry(Ro + 0.03, 0.11, 6, seg), M0.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, t)), { color: F[1].clone().multiplyScalar(0.8), jit: 0.02 });
  }
  // its shards lie on the floor below the broken end
  for (const [dw, du, a, sc] of [[1.6, 2.1, 0.5, 1.0], [2.4, -1.7, 2.2, 0.8], [3.2, 0.6, 4.0, 0.65], [0.4, -2.4, 1.2, 0.5]]) {
    const p = pt(wEnd + dw - 0.8, du), rs = r * sc, F = fields[(dw * 3 | 0) % 4];
    shell(new THREE.Matrix4().makeRotationY(a).setPosition(p[0], o.yEnd - rs * 0.93, p[2]), { na: 5, a0: -0.75, a1: 0.65, t0: 0, t1: 0.9 + sc, mask: (aa, t) => nz(aa * 3, t * 2 + dw, 6) > 0.55, rIn: rs, rOut: rs + 0.1,
      outer: (x, y, z, out) => setC(out, F[0], 0.9), inner: (x, y, z, out) => setC(out, wash, 0.6), seed: dw * 11 });
  }
  // the noon it still holds: two lenses still lit in its crown, one over the door and one near the lower end (the
  // last stretch was too dark to steer by)
  const lights = [];
  if (o.light !== false) {
    for (const fr of [0.36, 0.9]) { const wl = wTop + (wBot - wTop) * fr; P.lens(U, lineM(wl).multiply(new THREE.Matrix4().makeTranslation(0, r - 0.08, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), { r: 0.42, lit: 1, cheap: low }); }
    // one lamp for both (the house's court and the Leerie's row leave room for one more light here, not two: house-test), hung between them, reaching each
    const wl = wTop + (wBot - wTop) * 0.64, p = pt(wl), L = new THREE.PointLight(new THREE.Color(NOON.lightHex), 9, 15, 1.6);
    L.position.set(p[0], ya(wl) + 0.4, p[2]); L.name = `${o.name}-light`; ctx.scene.add(L); lights.push(L);
    ctx.registerUpdate((dt, t) => { L.intensity = 9 * (0.94 + 0.06 * Math.sin(t * 0.7)); }, { pos: { x: p[0], z: p[2] }, near: 40, hz: 2 });
  }

  // ---- the Late folk's planks: a sill at the top, then a stair down the bore, two stringers under it
  const Fr = frame(o.x, 0, o.z, fx, fz), wood = C.late.wood, grey = wood.clone().multiplyScalar(1.5);
  for (let q = 0; q < 4; q++) B.add(B.box(half * 2 - 0.1, 0.05, w0 / 4 - 0.015, { chip: 0.01 }), Fr.clone().multiply(mat(0, o.y - 0.028, (q + 0.5) * w0 / 4, 0, (rng() - 0.5) * 0.03, 0)), { color: grey.clone().multiplyScalar(0.75 + rng() * 0.35), moss: 0.2, ground: o.y - 1 });
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
    const rects = [[door - 0.7, door + 0.7, u0, Ro + 0.3], [back - 0.15, door + 0.7, Ro + 0.3, u1]];
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
    K.rail([e(door + 0.62, u0 + 0.5), e(door + 0.62, u1 - 0.1), e(back + 0.1, u1 - 0.1)], {});
  }
  const top = pt(0, 0, o.y), end = pt(wEnd, 0, o.yEnd);
  K.ascent({ id: o.name, held: true, offs: [0.5], path: [[end[0] + fx * 1.5, end[2] + fz * 1.5, o.yEnd], [end[0], end[2], o.yEnd], [top[0] + fx * 0.5, top[2] + fz * 0.5, o.y], [top[0] - fx * 1.5, top[2] - fz * 1.5, o.y]] });
  return { floor, top, end, length: wEnd, lights, door, ya, yb, pt };
}
