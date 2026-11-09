// Carcanet Keep [Proposed] (wilderness-v4.md, the awe audit and "Height, and which architecture
// works"; site in wilderness-v4-placement.md section 5). The age of plain mass: four ranges of sheer, unornamented
// stone round a court, 24 to 36 m high, cut by a rhythm of deep-set slots too tall for any door, entered by one slot
// that is the gate; a few enormous details (the cracked lintel over the gate, a bronze ring on the court's south
// wall, a 30 m bronze needle on the south-west block). Its north-east
// corner has fallen outward: the north range breaks off at x 38-50, the east range at z 33-21, one great slab of the
// north face lies tilted on the hill's crown toward bearing 30 (it can be walked up), a tumbled chunk of the corner lies
// at bearing 57, and the blocks run out on bearings 30-60 to r 47, where the Demesne's scattered blocks (r 46-82,
// v4/regions/demesne.js) carry the same fall on down the hill past the road.
// ?keep=v2 builds the earlier keep (keep/v2.js) instead, so the two can be compared in the page.
import * as THREE from 'three';
import { mergeGeometries } from '../v4/kit/merge.js';
import { hexCellsIn } from './common.js';
import { CAUSEWAY_V4, LANDMARKS } from '../world.js';
import { KEEP_V2, buildKeepV2, ringTower, ringColliders } from './keep/v2.js';

export { ringTower, ringColliders };

const V2 = typeof location !== 'undefined' && new URLSearchParams(location.search).get('keep') === 'v2';

const BASE = LANDMARKS.castle.y; // the hill's crown (terrain.js flattens it to this)
const C = LANDMARKS.castle; // the hill's centre (x, z)
const GATE = KEEP_V2.gate; // the passage keeps the old gate's line: z 31-37.6, its mouth at x 7
const NEEDLE = { x: 28, z: 50.5, h: 30 };
const SLAB = { b: 30, r0: 27, Ls: 17, W: 13, T: 3, yHi: BASE + 6.5 }; // the fallen face: bearing, near end, slant length
const CHUNK = { x: 65.5, z: 12.5 };
const MOLES = { x: 75, z: 0, r: 12 }; // v7's reserved lawn (wilderness-v4-placement.md section 5): blocks keep off it

// What fauna/small.js reads to seat the rooks: its "donjon" ring (12 high perches) falls on the south-west block's
// roof, its hexagon (wall perches) on the four ranges' roofs; perches over the fallen corner find only rubble and drop.
const KEEP_V5 = { cx: 37, cz: 31, apothem: 20, thick: 11, gate: GATE, donjon: { x: 20, z: 50.5, rOut: 5, rIn: 3 }, needle: NEEDLE, slab: SLAB };
export const KEEP = V2 ? KEEP_V2 : KEEP_V5;

export function buildKeep(ctx, B, env) {
  return V2 ? buildKeepV2(ctx, B, env) : buildKeepV5(ctx, B, env);
}

// the causeway's v4 route round the keep's north and east (points 12-18), as the Demesne measures it
function roadD(x, z) {
  let d = Infinity;
  for (let i = 9; i < 18; i++) {
    const a = CAUSEWAY_V4[i], c = CAUSEWAY_V4[i + 1], ex = c.x - a.x, ez = c.z - a.z, l2 = ex * ex + ez * ez;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / l2));
    d = Math.min(d, Math.hypot(x - a.x - ex * t, z - a.z - ez * t));
  }
  return d;
}

function buildKeepV5(ctx, B, env) {
  const { rng, ground } = env;
  const kit = ctx.kit;
  const stoneG = [], darkG = [], metalG = [];
  const q = new THREE.Quaternion(), e = new THREE.Euler(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const box = (list, x0, x1, y0, y1, z0, z1, m = null) => {
    if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3 || z1 - z0 < 1e-3) return;
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (m) g.applyMatrix4(m);
    list.push(g);
  };
  const paint = (g, hex, hex2 = null, mix = 0) => {
    const c = new THREE.Color(hex), c2 = hex2 ? new THREE.Color(hex2) : c, n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const k = mix * (0.5 + 0.5 * Math.sin(i * 1.7)); a[i * 3] = c.r + (c2.r - c.r) * k; a[i * 3 + 1] = c.g + (c2.g - c.g) * k; a[i * 3 + 2] = c.b + (c2.b - c.b) * k; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  };
  const metal = (g, hex, hex2, mix) => { metalG.push(paint(g, hex, hex2, mix)); };
  const col = (x, z, r, y, h) => ctx.addCollider(h === undefined ? { x, z, r } : { x, z, r, y, h });

  // ---------------------------------------------------------------- the four ranges
  // Each range is laid as strips across its length (u), each strip a core and a face layer on either side (v); a slot
  // leaves the face layer out between its sill and head and shows a black back, a zone (the gate's frame) leaves it out
  // below the zone's top, the cut (the passage) leaves everything out below its head.
  const slotsOf = (f) => {
    const out = [];
    for (let c = f.from + f.p / 2; c + f.w / 2 <= f.to; c += f.p) if (!(f.skip || []).some(([a, b]) => c + f.w / 2 > a && c - f.w / 2 < b)) out.push(c);
    return out;
  };
  function range(R) {
    const faces = [R.lo, R.hi];
    const inRag = (u) => !!R.ragged && u > R.ragged[0] && u < R.ragged[1];
    const brk = [R.u0, R.u1];
    for (const f of faces) if (f) {
      f.slots = slotsOf(f);
      for (const c of f.slots) brk.push(c - f.w / 2, c + f.w / 2);
      for (const z of f.zones || []) brk.push(z.a, z.b);
    }
    if (R.cut) brk.push(R.cut.a, R.cut.b);
    const us = brk.filter((u) => u >= R.u0 && u <= R.u1).sort((a, b) => a - b);
    const iv = [];
    for (let i = 0; i < us.length - 1; i++) {
      const a = us[i], b = us[i + 1];
      if (b - a < 1e-3) continue;
      const n = Math.ceil((b - a) / (inRag((a + b) / 2) ? 1.1 : 2.4));
      for (let k = 0; k < n; k++) iv.push([a + ((b - a) * k) / n, a + ((b - a) * (k + 1)) / n]);
    }
    const dlo = R.lo ? R.lo.d : 0, dhi = R.hi ? R.hi.d : 0;
    const X = R.axis === 'z'; // u runs along z (the west and east ranges), else along x
    const emit = (list, a, b, v0, v1, y0, y1) => (X ? box(list, v0, v1, y0, y1, a, b) : box(list, a, b, y0, y1, v0, v1));
    const at = (u, v) => (X ? [v, u] : [u, v]);
    for (const [a, b] of iv) {
      const m = (a + b) / 2, t = R.top(m);
      if (t < 0.6) continue;
      const yT = BASE + t, yTc = yT;
      const [cx, cz] = at(m, (R.v0 + R.v1) / 2);
      const y0 = ground.minGround(cx, cz, Math.min(6, Math.max(b - a, R.v1 - R.v0) / 2)) - 0.8;
      const inCut = R.cut && m > R.cut.a && m < R.cut.b;
      const yLow = inCut ? BASE + R.cut.h : y0;
      emit(stoneG, a, b, R.v0 + dlo, R.v1 - dhi, yLow, yT);
      faces.forEach((f, side) => {
        if (!f) return;
        const v0 = side ? R.v1 - dhi : R.v0, v1 = side ? R.v1 : R.v0 + dlo;
        // the face's own top: the coping chipped a course or two in places, the break's faces more ragged than its core
        const yT = yTc - (inRag(m) ? Math.round(rng() * 2) * 2.2 : rng() < 0.16 ? 2.2 * (1 + Math.floor(rng() * 2)) : 0);
        if (yT < y0 + 0.6) return;
        const slot = f.slots.find((c) => Math.abs(m - c) < f.w / 2);
        const zone = (f.zones || []).find((z) => m > z.a && m < z.b);
        if (zone) { if (yT > BASE + zone.top) emit(stoneG, a, b, v0, v1, BASE + zone.top, yT); }
        else if (inCut) emit(stoneG, a, b, v0, v1, yLow, yT);
        else if (slot && yT > BASE + f.s0 + 1) {
          emit(stoneG, a, b, v0, v1, y0, BASE + f.s0);
          if (yT > BASE + f.s1 + 0.3) emit(stoneG, a, b, v0, v1, BASE + f.s1, yT);
          const back = side ? v0 : v1; // the core's face, behind the slot
          emit(darkG, a, b, side ? back : back - 0.04, side ? back + 0.04 : back, BASE + f.s0, Math.min(BASE + f.s1, yT - 0.3));
        } else emit(stoneG, a, b, v0, v1, y0, yT);
        // colliders along the face (at the back of the frame where there is one), not across the passage
        if (t > 1.2 && !inCut) {
          const vc = zone ? (side ? v0 - 0.9 : v1 + 0.9) : (side ? R.v1 - 0.9 : R.v0 + 0.9);
          const n = Math.ceil((b - a) / 1.5);
          for (let k = 0; k < n; k++) { const [x, z] = at(a + ((b - a) * (k + 0.5)) / n, vc); col(x, z, 1.0); }
        }
      });
    }
    // the passage's two walls, and the frame's two cheeks
    if (R.cut) for (const u of [R.cut.a - 0.9, R.cut.b + 0.9]) for (let v = R.v0 + 0.75; v < R.v1; v += 1.5) { const [x, z] = at(u, v); col(x, z, 1.0); }
    for (const f of faces) for (const z of (f && f.zones) || []) for (const u of [z.a - 0.9, z.b + 0.9]) {
      const side = f === R.hi, v = side ? R.v1 - f.d / 2 : R.v0 + f.d / 2;
      const [x, zz] = at(u, v); col(x, zz, 1.0);
    }
  }
  // the break: full height to u0, nothing beyond u1, between them stepped down in courses, ragged
  const broken = (H, u0, u1, dir) => (u) => {
    const k = dir > 0 ? (u - u0) / (u1 - u0) : (u0 - u) / (u0 - u1);
    if (k <= 0) return H;
    if (k >= 1) return 0;
    const t = H * Math.pow(1 - k, 1.25) + (rng() - 0.5) * 6;
    return Math.max(0, Math.round(t / 2.2) * 2.2 + (rng() - 0.5) * 0.3);
  };
  const outer = { d: 2.6, w: 1.1, p: 5.2 }, court = { d: 2.2, w: 1.0, p: 5.6, s0: 3 };
  const H = { W: 30, N: 27, S: 24, E: 24, ped: 36 };
  // west range: the gate's front; the south-west block (z > 45) carries the needle
  range({
    axis: 'z', u0: 6, u1: 56, v0: 8, v1: 20, top: (u) => (u > 45 ? H.ped : H.W),
    lo: { ...outer, s0: 4, s1: 21, from: 6.5, to: 55.5, skip: [[27, 41.6]], zones: [{ a: 29, b: 39.6, top: 24.5 }] },
    hi: { ...court, s1: 16, from: 17.5, to: 44.5, skip: [[28.5, 40.1]], zones: [{ a: 30, b: 38.6, top: 23 }] },
    cut: { a: GATE.z0, b: GATE.z1, h: 22 },
  });
  // north range: broken off between x 38 and 50
  const nTop = broken(H.N, 38, 50, 1);
  range({
    axis: 'x', u0: 20, u1: 64, v0: 6, v1: 17, top: nTop, ragged: [37, 51],
    lo: { ...outer, s0: 4, s1: 19, from: 20.5, to: 63.5 },
    hi: { ...court, s1: 16, from: 20.5, to: 52.5 },
  });
  // south range: a plain stretch on the court side carries the ring
  range({
    axis: 'x', u0: 20, u1: 64, v0: 45, v1: 56, top: (u) => (u < 34 ? H.ped : H.S),
    lo: { ...court, s1: 15, from: 20.5, to: 52.5, skip: [[33.5, 46.5]] },
    hi: { ...outer, s0: 4, s1: 17, from: 20.5, to: 63.5 },
  });
  // east range: broken off between z 33 and 21
  const eTop = broken(H.E, 33, 21, -1);
  range({
    axis: 'z', u0: 17, u1: 45, v0: 53, v1: 64, top: eTop, ragged: [20, 34],
    lo: { ...court, s1: 15, from: 17.5, to: 44.5 },
    hi: { ...outer, s0: 4, s1: 17, from: 17.5, to: 44.5 },
  });

  // the battered footing: a sloped skirt 5 m high along the outer faces, 1.8 m proud at the turf, broken where the
  // ranges are and stopped either side of the gate's frame. [face plane: axis, coordinate, outward sign; along: a, b]
  {
    const O = 1.8, TOP = 5;
    const skirt = (axis, c, out, a, b) => {
      const mid = (a + b) / 2, [mx, mz] = axis === 'x' ? [c, mid] : [mid, c];
      const ys = Math.min(ground.minGround(mx, mz, (b - a) / 2), ground.groundAt(axis === 'x' ? c : a, axis === 'x' ? a : c), ground.groundAt(axis === 'x' ? c : b, axis === 'x' ? b : c)) - 1.0;
      const sh = new THREE.Shape([new THREE.Vector2(0, ys), new THREE.Vector2(O, ys), new THREE.Vector2(O, BASE + 0.4), new THREE.Vector2(0, BASE + TOP)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: b - a, bevelEnabled: false, steps: 1 });
      const n = axis === 'x' ? new THREE.Vector3(out, 0, 0) : new THREE.Vector3(0, 0, out), up = new THREE.Vector3(0, 1, 0);
      const t = new THREE.Vector3().crossVectors(n, up); // so the basis keeps its handedness
      const along = axis === 'x' ? t.z : t.x, start = along > 0 ? a : b;
      const M = new THREE.Matrix4().makeBasis(n, up, t).setPosition(axis === 'x' ? c : start, 0, axis === 'x' ? start : c);
      g.applyMatrix4(M);
      stoneG.push(g);
      for (let u = a + 0.9; u < b; u += 1.5) col(axis === 'x' ? c + out * 0.8 : u, axis === 'x' ? u : c + out * 0.8, 1.0);
    };
    skirt('x', 8, -1, 4.2, 27); skirt('x', 8, -1, 41.6, 57.8); // the west front, either side of the gate
    skirt('z', 6, -1, 6.2, 41); // the north front, to the break
    skirt('z', 56, 1, 6.2, 65.8); // the south front
    skirt('x', 64, 1, 33.5, 57.8); // the east front, from the break
  }

  // ---------------------------------------------------------------- the enormous details
  // the gate's lintel: one stone across the frame, proud of the face, cracked in two, the north half sagged
  {
    const y0 = BASE + 24.5, y1 = BASE + 27.5;
    box(stoneG, 6.8, 8.6, y0, y1, 27.4, 35.05);
    const m = new THREE.Matrix4().compose(p.set(7.7, -0.14, 38.2), q.setFromEuler(e.set(0.012, 0, 0)), s1);
    box(stoneG, -0.9, 0.9, y0, y1, -3.1, 3.0, m);
  }
  // the ring on the court face of the south range, 12 m across, bronze gone to verdigris
  {
    const g = new THREE.TorusGeometry(6, 0.55, 10, 72); g.translate(40, BASE + 11.5, 45 - 0.3);
    metal(g, '#4a3a22', '#3f5f50', 0.8);
  }
  // the needle: a bronze shaft on a stepped footing, 30 m from the block's roof, three collars, a point
  {
    const y = BASE + H.ped, nx = NEEDLE.x, nz = NEEDLE.z;
    const step = (w, h, y0) => { const g = new THREE.BoxGeometry(w, h, w); g.translate(nx, y0 + h / 2, nz); metal(g, '#3a2c1c', '#435a4a', 0.5); };
    step(4.4, 0.9, y - 0.1); step(3.2, 1.4, y + 0.8);
    const shaftH = NEEDLE.h - 3.4;
    const sh = new THREE.CylinderGeometry(0.2, 1.45, shaftH, 4, 6); sh.rotateY(Math.PI / 4); sh.translate(nx, y + 2.2 + shaftH / 2, nz);
    metal(sh, '#6a5238', '#48604f', 0.45); // bronze, gone partly to verdigris: it takes the sun from the west
    for (const k of [0.22, 0.5, 0.74]) {
      const r = 1.45 + (0.2 - 1.45) * k + 0.16, g = new THREE.CylinderGeometry(r, r, 0.45, 4, 1); g.rotateY(Math.PI / 4); g.translate(nx, y + 2.2 + shaftH * k, nz);
      metal(g, '#2a2018', '#3f5f50', 0.4);
    }
    const tip = new THREE.CylinderGeometry(0, 0.24, 1.2, 4, 1); tip.rotateY(Math.PI / 4); tip.translate(nx, y + 2.2 + shaftH + 0.6, nz);
    metal(tip, '#5a4526', '#3f5f50', 0.3);
  }

  // ---------------------------------------------------------------- the fall
  const blocks = []; // instanced: { x, y, z, sx, sy, sz, rx, ry, rz }
  const addBlock = (x, z, s, o = {}) => {
    const sx = s * (0.8 + rng() * 0.5), sy = s * (0.55 + rng() * 0.35), sz = s * (0.7 + rng() * 0.5);
    const b = { x, z, y: (o.y ?? ground.groundAt(x, z)) + sy * (o.lift ?? 0.18), sx, sy, sz, ry: rng() * 6.28, rx: (rng() - 0.5) * (o.tilt ?? 0.4), rz: (rng() - 0.5) * (o.tilt ?? 0.4) };
    blocks.push(b);
    if (s > 1.1) col(x, z, Math.max(sx, sz) * 0.5, b.y - sy, sy * 1.2);
    return b;
  };
  // the great slab: a stretch of the north range's face 13 m wide, fallen outward on its back, its near end propped
  // 6.5 m up on the corner's rubble, its far end in the turf; three slots run down it, and it cracked in three
  const sb = (SLAB.b * Math.PI) / 180, fx = Math.sin(sb), fz = -Math.cos(sb), sx = Math.cos(sb), sz = Math.sin(sb);
  const O = { x: C.x + fx * SLAB.r0, z: C.z + fz * SLAB.r0 };
  const farY = ground.groundAt(O.x + fx * SLAB.Ls * 0.93, O.z + fz * SLAB.Ls * 0.93) + 0.35;
  const theta = Math.asin(Math.min(0.6, (SLAB.yHi - farY) / SLAB.Ls)), cosT = Math.cos(theta), tanT = Math.tan(theta);
  {
    const M = new THREE.Matrix4().compose(p.set(O.x, SLAB.yHi, O.z), q.setFromEuler(e.set(theta, Math.PI - sb, 0, 'YXZ')), s1);
    const W2 = SLAB.W / 2, T = SLAB.T, dr = 1.0, slots = [-4, 0, 4], sw = 0.75, z0 = 1.6, z1 = SLAB.Ls - 2.2;
    const pieces = [[0, 5.3], [5.6, 11.1], [11.4, SLAB.Ls]];
    for (const [a, b] of pieces) {
      const zc = (a + b) / 2;
      const J = new THREE.Matrix4().compose(p.set(0, 0, zc), q.setFromEuler(e.set((rng() - 0.5) * 0.02, (rng() - 0.5) * 0.03, (rng() - 0.5) * 0.03)), s1)
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, -zc));
      const PM = M.clone().multiply(J);
      box(stoneG, -W2, W2, -T, -dr, a, b, PM);
      // the face: piers between the slots, solid where the slots stop short
      const xs = [-W2]; for (const c of slots) xs.push(c - sw, c + sw); xs.push(W2);
      for (let i = 0; i < xs.length - 1; i++) {
        const inSlot = i % 2 === 1;
        if (!inSlot) { box(stoneG, xs[i], xs[i + 1], -dr, 0, a, b, PM); continue; }
        if (a < z0) box(stoneG, xs[i], xs[i + 1], -dr, 0, a, Math.min(b, z0), PM);
        if (b > z1) box(stoneG, xs[i], xs[i + 1], -dr, 0, Math.max(a, z1), b, PM);
        const ia = Math.max(a, z0), ib = Math.min(b, z1);
        if (ib > ia) box(darkG, xs[i], xs[i + 1], -dr, -dr + 0.04, ia, ib, PM);
      }
    }
    // it can be walked up from its far end: the top of its face, as a plane
    const ox = O.x, oz = O.z, Lh = SLAB.Ls * cosT, w = W2 - 0.25;
    ctx.addWalkable?.((x, z) => {
      const dx = x - ox, dz = z - oz, along = dx * fx + dz * fz;
      if (along < 0.2 || along > Lh) return null;
      const side = dx * sx + dz * sz;
      if (side > w || side < -w) return null;
      return SLAB.yHi - along * tanT;
    });
    // its sides and its propped end stop a walker on the ground (not one standing on it)
    for (let along = 0.6; along < Lh; along += 1.4) {
      const top = SLAB.yHi - along * tanT;
      for (const sd of [-1, 1]) {
        const x = ox + fx * along + sx * sd * (W2 - 0.7), z = oz + fz * along + sz * sd * (W2 - 0.7), g = ground.groundAt(x, z);
        if (top - g > 0.9) col(x, z, 0.75, g, top - g - 0.7);
      }
    }
    for (let side = -W2 + 0.7; side < W2; side += 1.4) {
      const x = ox + fx * 0.6 + sx * side, z = oz + fz * 0.6 + sz * side, g = ground.groundAt(x, z);
      col(x, z, 0.75, g, SLAB.yHi - g - 0.7);
    }
    // the rubble it came down on, under the near end
    for (let i = 0; i < 9; i++) {
      const along = rng() * 3.5 - 1.0, side = (rng() - 0.5) * SLAB.W * 0.9;
      addBlock(ox + fx * along + sx * side, oz + fz * along + sz * side, 2.0 + rng() * 1.8, { lift: 0.3 });
    }
  }
  // a chunk of the corner itself, tumbled on an edge
  {
    const g = ground.groundAt(CHUNK.x, CHUNK.z);
    const M = new THREE.Matrix4().compose(p.set(CHUNK.x, g + 1.4, CHUNK.z), q.setFromEuler(e.set(0.38, 0.82, 0.24)), s1);
    box(stoneG, -4.5, 4.5, -3.5, 3.5, -4, 4, M);
    for (const c of [-1.8, 2.2]) box(darkG, c - 0.7, c + 0.7, -2.6, 2.6, 4, 4.04, M); // two of its slots, on its upturned face
    col(CHUNK.x, CHUNK.z, 4.6);
  }
  // the corner's footing and the court's broken end: big blocks where it stood
  for (let i = 0, n = 0; i < 400 && n < 20; i++) {
    const x = 42 + rng() * 22, z = 6 + rng() * 24;
    if ((x < 50 && z < 17) || (x > 53 && z > 22)) continue; // standing stubs
    if (Math.hypot(x - CHUNK.x, z - CHUNK.z) < 6) continue;
    if (blocks.some((o) => Math.hypot(o.x - x, o.z - z) < 2.6)) continue;
    addBlock(x, z, 1.5 + rng() * 2.2); n++;
  }
  // and the run of them outward on bearings 30-60, smaller as they go, into the Demesne's own (which begin at r 46)
  const onSlab = (x, z) => { const dx = x - O.x, dz = z - O.z, al = dx * fx + dz * fz, sd = dx * sx + dz * sz; return al > -1.5 && al < SLAB.Ls * cosT + 1.5 && Math.abs(sd) < SLAB.W / 2 + 1.5; };
  const low = ctx.quality === 'low';
  for (let i = 0, n = 0, N = low ? 30 : 44; i < 900 && n < N; i++) {
    const bb = ((30 + rng() * 30) * Math.PI) / 180, r = 30 + Math.pow(rng(), 0.75) * 17.5;
    const x = C.x + Math.sin(bb) * r, z = C.z - Math.cos(bb) * r;
    if (roadD(x, z) < 4.5 || onSlab(x, z) || Math.hypot(x - CHUNK.x, z - CHUNK.z) < 6) continue;
    const dm = Math.hypot(x - MOLES.x, z - MOLES.z);
    if (dm < 8 || (dm < MOLES.r && rng() < 0.7)) continue;
    if (blocks.some((o) => Math.hypot(o.x - x, o.z - z) < 2.2)) continue;
    const k = (r - 30) / 17.5;
    addBlock(x, z, (3.0 - 1.5 * k) * (0.7 + rng() * 0.5)); n++;
  }

  // ---------------------------------------------------------------- meshes
  const stone = kit.masonry({ color: '#7e7468', course: 3.0, base: BASE - 1, diminish: 0.955, slab: 4.5, joint: 0.02, wear: 0.9, moss: 0.55, inlay: 'bronze', inlayEvery: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: '#070607', roughness: 1, metalness: 0 });
  const bronze = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.3, roughness: 0.42 });
  const out = (env.extraMeshes ||= []);
  const add = (geos, mat, name, shadow) => {
    const g = mergeGeometries(geos);
    for (const x of geos) x.dispose();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.name = name; m.castShadow = shadow; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix();
    out.push({ mesh: m, tris: g.attributes.position.count / 3 });
    return m;
  };
  add(stoneG, stone.mat, 'structures-keep', true); // the name the rooks look for (fauna/small.js)
  add(darkG, dark, 'structures-keep-slots', false);
  add(metalG, bronze, 'structures-keep-bronze', true);
  {
    const g = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = 0.93 + 0.07 * Math.abs(Math.sin(i * 1.9)); pa.setXYZ(i, pa.getX(i) * k, pa.getY(i), pa.getZ(i) * k); }
    g.computeVertexNormals();
    const im = new THREE.InstancedMesh(g, stone.mat, blocks.length);
    const M = new THREE.Matrix4(), sc = new THREE.Vector3();
    blocks.forEach((b, i) => { q.setFromEuler(e.set(b.rx, b.ry, b.rz)); im.setMatrixAt(i, M.compose(p.set(b.x, b.y, b.z), q, sc.set(b.sx, b.sy, b.sz))); });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    im.name = 'structures-keep-blocks'; im.castShadow = true; im.receiveShadow = true;
    out.push({ mesh: im, tris: 12 * blocks.length });
  }
  // ---------------------------------------------------------------- paving: the passage, and the court worn through
  const N2 = ctx.noise.noise2;
  hexCellsIn(7, 17, 53, 45, (x, z, i, j) => {
    const pass = x < 20 && z > GATE.z0 + 0.3 && z < GATE.z1 - 0.3;
    const courtIn = x > 20.6 && x < 52.4 && z > 17.6 && z < 44.4;
    if (!pass && !courtIn) return;
    if (x > 41 && z < 31 - (x - 41) * 0.4) return; // the fallen corner's rubble
    const wear = N2(x * 0.09 + 3.3, z * 0.09 - 1.7) * 0.6 + N2(x * 0.31, z * 0.31) * 0.25 + (Math.abs(z - 34.3) < 2.6 ? 0.3 : 0);
    if (!pass && wear > 0.1) return;
    if (rng() < 0.1) return;
    env.addPaver(x, z, i, j, { sink: 0.03 + Math.max(0, wear + 0.4) * 0.05, tilt: 0.05 });
  });

  env.notes.keep = {
    gate: { x0: GATE.outerX, x1: 20, z0: GATE.z0, z1: GATE.z1 },
    courtyard: { x0: 20, x1: 53, z0: 17, z1: 45 },
    needle: { x: NEEDLE.x, z: NEEDLE.z, top: +(BASE + H.ped + NEEDLE.h).toFixed(1) },
    blocks: blocks.length,
  };
}
