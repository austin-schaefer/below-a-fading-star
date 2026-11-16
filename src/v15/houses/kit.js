// The Lappet's house kit, the shared half (v15-V1): what every maker in this folder is built from. A maker is
// (B, M, o) like a strata part (src/v8/strata/parts.js): B a structures Builder, M the plot's Matrix4 (plotMatrix),
// o its options; it adds its geometry into B (and its Elder blocks into o.E, a second Builder for the Elder
// material, when one is given) and returns a site record of what a quarter needs to know, in world space.
//
// A plot is the plan's (src/v15/plan.js PLOTS): { x, z (the footprint's centre), y (the level its doors open at),
// face: [fx, fz] (the unit vector its front looks along), w (across the front), d (front to back) }. faceOf(deg)
// gives a face from a compass bearing.
// The local frame: origin at the plot's centre on its level, +y up, +z out of the front, +x to the right of
// someone looking at the front.
//
// The record (site()): { kind, seed, plot, colliders, floors, lamps, windows, doors, counters, shelves, lights,
// tris }. floors are rectangles or discs a walker stands on (registered by register() as stacked walkables with
// held edges, one walkable a house a layer); colliders are the engine's own shapes; lamps are empty brackets
// ({ x, y, z, face }); windows are the lit panes ({ x, y, z, lit }); doors and counters say where a person stands.
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { COLORS, PARTS } from '../../v8/strata/parts.js';
export { PARTS };

const c = (h) => new THREE.Color(h);
export const L = COLORS.late, H = COLORS.heliarch, N = COLORS.noon, E = COLORS.elder;
// the village's own colours, beside the hands': dirt and soot for wear, the masons' new-cut stone and raw timber
export const V = {
  dirt: c('#74644f'), soot: c('#191411'), mud: c('#9c8262'), newStone: c('#d9d2c1'), newDust: c('#e9e4d6'),
  rawWood: c('#b6976a'), rope: c('#b09a6a'), pane: c('#15100c'), lime: c('#f1ecde'), flag: c('#8a8378'),
  lit: [2.3, 1.05, 0.34], ember: [2.6, 0.7, 0.12],
};

export const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const rngOf = (seed, salt = 0) => mulberry((seed | 0) * 7919 + salt * 104729 + 13);
export const pick = (arr, rng) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
export const ch = (M, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(mat(x, y, z, rx, ry, rz, sx, sy, sz));
export const faceOf = (deg) => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180)];
export const plotMatrix = (p) => mat(p.x, p.y, p.z, 0, Math.atan2(p.face[0], p.face[1]), 0);
// M leaned: a point y up is carried kx sideways and kz forward (a whole house out of true)
export const leaned = (M, kx, kz = 0) => M.clone().multiply(new THREE.Matrix4().set(1, kx, 0, 0, 0, 1, 0, 0, 0, kz, 1, 0, 0, 0, 0, 1));
// a colour worn: toward dirt by k, and no two the same
export const worn = (col, rng, k = 0.18, v = 0.1) => col.clone().lerp(V.dirt, k).multiplyScalar(1 - v / 2 + rng() * v);

// ---------------------------------------------------------------- the record
const _v = new THREE.Vector3();
export function site(M, kind, o) {
  const yaw = Math.atan2(M.elements[8], M.elements[10]);
  const R = { kind, seed: o.seed | 0, plot: { x: M.elements[12], y: M.elements[13], z: M.elements[14], yaw, w: o.w, d: o.d }, colliders: [], floors: [], lamps: [], windows: [], doors: [], counters: [], shelves: [], lights: [], tris: 0 };
  const W = (x, y, z) => { _v.set(x, y, z).applyMatrix4(M); return { x: _v.x, y: _v.y, z: _v.z }; };
  const face = (fx, fz) => { const cy = Math.cos(yaw), sy = Math.sin(yaw); return [fx * cy + fz * sy, -fx * sy + fz * cy]; };
  R.W = W; R.face = face;
  // a wall: the segment (x1, z1)-(x2, z2) swept by r, from y to y + h (local); never stood on unless stand
  R.wall = (x1, z1, x2, z2, y, h, r = 0.18, extra = {}) => { const a = W(x1, y, z1), b = W(x2, y, z2); R.colliders.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, r, y: a.y, h, stand: false, ...extra }); };
  R.post = (x, z, r, y = null, h = null, extra = {}) => { const a = W(x, y || 0, z); R.colliders.push(y === null ? { x: a.x, z: a.z, r, ...extra } : { x: a.x, z: a.z, r, y: a.y, h, ...extra }); };
  // a floor: a rectangle w (local x) by d (local z) centred at (x, z), turned by ry, level at y; or with `steps`, a
  // flight rising along its own +z from y to y1 in that many treads. layer 0: a ground room; 1: a roof and its stair
  R.floor = (x, z, w, d, y, f = {}) => { const a = W(x, y, z); R.floors.push({ x: a.x, z: a.z, yaw: yaw + (f.ry || 0), w, d, y: a.y, y1: f.y1 === undefined ? a.y : a.y + f.y1 - y, steps: f.steps || 0, layer: f.layer ?? 0, keep: f.keep ?? true }); };
  R.disc = (x, z, r, y, f = {}) => { const a = W(x, y, z); R.floors.push({ x: a.x, z: a.z, r, y: a.y, y1: a.y, steps: 0, layer: f.layer ?? 0, keep: f.keep ?? false }); };
  R.lamp = (x, y, z, fx = 0, fz = 1) => R.lamps.push({ ...W(x, y, z), face: face(fx, fz) });
  R.window = (x, y, z, lit) => R.windows.push({ ...W(x, y, z), lit: !!lit });
  R.door = (x, z, f = {}) => R.doors.push({ ...W(x, 0, z), face: face(f.fx || 0, f.fz ?? 1), enter: !!f.enter, w: f.w || 1 });
  R.counter = (x, y, z, w) => R.counters.push({ ...W(x, y, z), face: face(0, 1), w });
  R.shelf = (x, y, z, w, d) => R.shelves.push({ ...W(x, y, z), face: face(0, 1), w, d });
  R.light = (x, y, z, color, intensity, distance) => R.lights.push({ ...W(x, y, z), color, intensity, distance });
  return R;
}
// the floor a record's floors give at a world point, for one layer: the highest of them there, or null
export function floorAt(floors, x, z) {
  let y = null;
  for (const f of floors) {
    const dx = x - f.x, dz = z - f.z;
    if (f.r !== undefined) { if (dx * dx + dz * dz <= f.r * f.r && (y === null || f.y > y)) y = f.y; continue; }
    const cy = Math.cos(f.yaw), sy = Math.sin(f.yaw), lx = dx * cy - dz * sy, lz = dx * sy + dz * cy;
    if (Math.abs(lx) > f.w / 2 || Math.abs(lz) > f.d / 2) continue;
    let h = f.y;
    if (f.steps) h = f.y + (f.y1 - f.y) * Math.min(f.steps - 1, Math.floor(((lz + f.d / 2) / f.d) * f.steps)) / Math.max(1, f.steps - 1);
    if (y === null || h > y) y = h;
  }
  return y;
}
// hand a record to the walk: its colliders, and its floors as stacked walkables (one a layer), edges held
export function register(ctx, R) {
  for (const col of R.colliders) ctx.addCollider({ ...col });
  const layers = new Map();
  for (const f of R.floors) { if (!layers.has(f.layer)) layers.set(f.layer, []); layers.get(f.layer).push(f); }
  const rr = Math.hypot(R.plot.w, R.plot.d) / 2 + 2, rr2 = rr * rr, px = R.plot.x, pz = R.plot.z;
  for (const [layer, fs] of layers) {
    const fn = (x, z) => ((x - px) * (x - px) + (z - pz) * (z - pz) > rr2 ? null : floorAt(fs, x, z));
    ctx.addWalkable(fn, { stack: true, keep: fs.some((f) => f.keep), name: `${R.kind}-${R.seed}-${layer}` });
  }
}

// ---------------------------------------------------------------- shapes
// an opening's outline (a list of [x, y]): w wide, its foot at y0, its jambs sp tall; the head by kind
export function openingPts(kind, cx, y0, w, sp, n = 10) {
  const r = w / 2, p = [];
  if (kind === 'horseshoe') {
    p.push([cx + r * 0.86, y0]);
    for (let i = 0; i <= n; i++) { const a = -0.5 + (i / n) * (Math.PI + 1); p.push([cx + Math.cos(a) * r, y0 + sp + Math.sin(a) * r]); }
    p.push([cx - r * 0.86, y0]);
  } else if (kind === 'ogee') {
    const Hh = r * 1.15, m = Math.max(4, n >> 1), og = (t) => Hh * (t < 0.5 ? 0.5 * Math.sin(Math.PI * t) : 1 - 0.5 * Math.sin(Math.PI * (1 - t)));
    p.push([cx + r, y0], [cx + r, y0 + sp]);
    for (let i = 1; i <= m; i++) p.push([cx + r * (1 - i / m), y0 + sp + og(i / m)]);
    for (let i = m - 1; i >= 0; i--) p.push([cx - r * (1 - i / m), y0 + sp + og(i / m)]);
    p.push([cx - r, y0]);
  } else if (kind === 'round') {
    p.push([cx + r, y0]);
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; p.push([cx + Math.cos(a) * r, y0 + sp + Math.sin(a) * r]); }
    p.push([cx - r, y0]);
  } else p.push([cx + r, y0], [cx + r, y0 + sp], [cx - r, y0 + sp], [cx - r, y0]);
  return p;
}
export const openingTop = (kind, w, sp) => sp + (kind === 'horseshoe' || kind === 'round' ? w / 2 : kind === 'ogee' ? (w / 2) * 1.15 : 0);
// a wall with holes in it, standing in the xy plane, d thick about z 0: w wide, h tall (or `top`, [[x, y], ...]
// from right to left, a roofline out of true), sunk `sink` under its foot. openings: [{ kind, x, y, w, sp }]
export function facade(B, M, o) {
  const w = o.w, sink = o.sink ?? 0.5, sh = new THREE.Shape();
  sh.moveTo(-w / 2, -sink); sh.lineTo(w / 2, -sink);
  const top = o.top || [[w / 2, o.h], [-w / 2, o.h]];
  for (const [x, y] of top) sh.lineTo(x, y);
  sh.lineTo(-w / 2, -sink);
  for (const op of o.openings || []) {
    const pts = openingPts(op.kind, op.x, op.y || 0, op.w, op.sp, o.n ?? 10), hole = new THREE.Path();
    pts.forEach(([x, y], i) => (i ? hole.lineTo(x, y) : hole.moveTo(x, y)));
    hole.closePath(); sh.holes.push(hole);
  }
  B.add(B.extrude(sh, o.d ?? 0.36, 1), M, { color: o.color, moss: o.moss ?? 0.2, course: o.course || 0, ground: o.ground, wet: o.wet || 0 });
}
// a flat plate of any outline, t thick, lying in the xy plane (a patch on a wall, a sign board, a rug)
export function plate(B, M, pts, t, o) {
  const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  B.add(B.extrude(sh, t, 1), M, o);
}
// an irregular patch, about r across: where a wall was mended, limewashed over or lost its plaster
export function patch(B, M, r, rng, o) {
  const n = 6 + Math.floor(rng() * 3), pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = r * (0.6 + rng() * 0.6); pts.push([Math.cos(a) * k * 1.25, Math.sin(a) * k]); }
  plate(B, M, pts, 0.03, o);
}
// a beam, pole or line between two local points, t thick (t2 deep)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _upx = new THREE.Vector3(1, 0, 0), _q = new THREE.Quaternion(), _one = new THREE.Vector3(1, 1, 1), _lm = new THREE.Matrix4();
export function beam(B, M, a, b, t, o, t2 = t) {
  _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
  const len = _a.distanceTo(_b), vert = Math.abs(_b.y - _a.y) > len * 0.98;
  _lm.lookAt(_a, _b, vert ? _upx : _up); _q.setFromRotationMatrix(_lm);
  const m = M.clone().multiply(new THREE.Matrix4().compose(_a.clone().add(_b).multiplyScalar(0.5), _q, _one));
  B.add(o.round ? B.cyl(t / 2, t2 / 2, len, o.round, 1).rotateX(Math.PI / 2) : B.box(t, t2, len, { seg: 9 }), m, o);
}
// a quad facing the way its corners wind (counter-clockwise seen from its front), for linings no box gives
export function quad(B, M, p0, p1, p2, p3, o) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...p0, ...p1, ...p2, ...p0, ...p2, ...p3], 3));
  B.add(g, M, o);
}
// the inside of a box (a niche, a room seen through a hole): five faces looking in, open toward +z
export function niche(B, M, w, h, d, o, back = null) {
  const x = w / 2, a = [-x, 0, 0], b = [x, 0, 0], cc = [x, h, 0], e = [-x, h, 0], a2 = [-x, 0, -d], b2 = [x, 0, -d], c2 = [x, h, -d], e2 = [-x, h, -d];
  quad(B, M, a2, b2, c2, e2, back || o);
  quad(B, M, a, a2, e2, e, o); quad(B, M, b2, b, cc, c2, o);
  quad(B, M, a, b, b2, a2, o); quad(B, M, e2, c2, cc, e, o);
}

// ---------------------------------------------------------------- furniture and fittings
// a pot or jar, closed over its mouth: r its belly, k its height in r
export function pot(B, M, x, y, z, r, col, k = 1.8, seg = 8) {
  B.add(B.lathe([[0.001, 0], [r * 0.55, 0], [r, k * r * 0.35], [r * 0.92, k * r * 0.7], [r * 0.5, k * r * 0.92], [r * 0.62, k * r], [r * 0.4, k * r * 0.99], [0.001, k * r * 0.9]], seg), ch(M, x, y, z), { color: col, moss: 0.1, ground: M.elements[13] });
}
// a plank door leaf in its frame's plane (xy), foot at y 0: boards, two straps, a ring
export function leaf(B, M, w, h, col, rng, o = {}) {
  const g0 = M.elements[13] - 1;
  B.add(B.box(w, h, 0.07, { seg: 9 }), ch(M, 0, h / 2, 0), { color: col, moss: 0.05, ground: g0 });
  if (o.plain) return;
  for (const t of [0.22, 0.74]) B.add(B.box(w * 0.92, 0.07, 0.02, { seg: 9 }), ch(M, 0, h * t, 0.045), { color: L.iron, iron: 0.7, moss: 0, ground: g0 });
  B.add(new THREE.TorusGeometry(0.06, 0.012, 4, 8), ch(M, w * 0.3 * (rng() < 0.5 ? -1 : 1), h * 0.5, 0.05), { color: L.iron, iron: 0.8, moss: 0, ground: g0 });
}
// what stops an opening behind the wall's face: a pane (lit or dark) with a shape in front of it, or a shutter
// leaf. M: the opening's foot centre on the wall's mid-plane; w, h its size; kind 'lit' | 'dark' | 'shut'
export function stop(B, M, w, h, kind, rng, o = {}) {
  const g0 = M.elements[13] - 2, lit = kind === 'lit';
  if (kind === 'shut') { B.add(B.box(w + 0.2, h + 0.2, 0.05, { seg: 9 }), ch(M, 0, h / 2, -0.06), { color: o.paint || L.paint[0], moss: 0.05, ground: g0 }); for (let i = 1; i < 4; i++) B.add(B.box(w + 0.2, 0.02, 0.02, { seg: 9 }), ch(M, 0, h * i / 4, -0.03), { color: V.soot, moss: 0, ground: g0 }); return; }
  const k = lit ? 0.4 + rng() * 0.35 : 0;
  B.add(B.box(w + 0.24, h + 0.24, 0.04, { seg: 9 }), ch(M, 0, h / 2, -0.14), { color: lit ? c('#3a2410') : V.pane, moss: 0, ground: g0, emit: lit ? [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] : undefined });
  // the shape behind the glass: a grille of two bars, a jar on the sill, or a hanging thing
  const what = Math.floor(rng() * 3);
  if (what === 0) { B.add(B.box(0.035, h + 0.1, 0.03, { seg: 9 }), ch(M, 0, h / 2, -0.07), { color: V.soot, moss: 0, ground: g0 }); B.add(B.box(w + 0.1, 0.035, 0.03, { seg: 9 }), ch(M, 0, h * 0.55, -0.06), { color: V.soot, moss: 0, ground: g0 }); }
  else if (what === 1) pot(B, M, (rng() - 0.5) * w * 0.4, 0, -0.03, Math.min(w, h) * 0.2, V.soot, 2, 6);
  else { B.add(B.box(0.02, h * 0.45, 0.02, { seg: 9 }), ch(M, w * 0.15, h * 0.78, -0.05), { color: V.soot, moss: 0, ground: g0 }); B.add(new THREE.IcosahedronGeometry(Math.min(w, h) * 0.16, 0), ch(M, w * 0.15, h * 0.5, -0.05), { color: V.soot, moss: 0, ground: g0 }); }
}
// a shutter leaf thrown open flat on the wall beside its window (M: the window's foot centre on the wall's face)
export function shutter(B, M, w, h, side, col, ang = 0.12) {
  const g0 = M.elements[13] - 2, m = ch(M, side * w / 2, 0, 0.02, 0, -side * ang, 0);
  B.add(B.box(w * 0.5, h, 0.03, { seg: 9 }), ch(m, side * w * 0.27, h / 2, 0.02), { color: col, moss: 0.05, ground: g0 });
  B.add(B.box(w * 0.5, 0.03, 0.012, { seg: 9 }), ch(m, side * w * 0.27, h * 0.5, 0.042), { color: V.soot, moss: 0, ground: g0 });
}
// a solid flight of plastered steps from (x, z) along (dx, dz), w wide, rising h; returns its run. It records its
// treads as a floor and the mass under them as a wall. into: how far its mass runs on into the wall beside it, toward
// (ox, oz), so a battered wall leaves no gap
export function flight(B, M, R, o) {
  const { x, z, dx, dz, w, h } = o, into = o.into || 0, n = Math.max(2, Math.ceil(h / (o.rise || 0.22))), rise = h / n, tread = o.tread || 0.3, run = n * tread, ry = Math.atan2(dx, dz), g0 = M.elements[13];
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * tread, hh = (i + 1) * rise + 0.4;
    B.add(B.box(w + into, hh, tread + 0.012, { seg: 9, chip: 0.025, chipTop: true, seed: i * 3 + (o.seed || 0) }), ch(M, x + dx * s + (o.ox || 0) * into / 2, hh / 2 - 0.4, z + dz * s + (o.oz || 0) * into / 2, 0, ry, 0), { color: i % 3 === 1 ? o.color2 || o.color : o.color, moss: 0.3, ground: g0 });
  }
  R.floor(x + dx * run / 2, z + dz * run / 2, w, run, (o.y || 0) + rise, { ry, y1: (o.y || 0) + h, steps: n, layer: o.layer ?? 1 });
  R.wall(x + dx * w * 0.4, z + dz * w * 0.4, x + dx * (run - 0.1), z + dz * (run - 0.1), -0.4, 0.4 + rise - 0.16, w / 2 - 0.08, { dh: h - rise });
  return { run, n, rise, tread };
}
// a ladder from foot to top (local points), w wide: two rails and its rungs
export function ladder(B, M, foot, top, w, o, side = [1, 0, 0]) {
  const hx = side[0] * w / 2, hz = side[2] * w / 2, len = Math.hypot(top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]), n = Math.max(3, Math.round(len / 0.32));
  for (const s of [-1, 1]) beam(B, M, [foot[0] + s * hx, foot[1], foot[2] + s * hz], [top[0] + s * hx, top[1], top[2] + s * hz], 0.055, o);
  for (let i = 1; i < n; i++) { const t = i / n, p = [foot[0] + (top[0] - foot[0]) * t, foot[1] + (top[1] - foot[1]) * t, foot[2] + (top[2] - foot[2]) * t]; beam(B, M, [p[0] - hx, p[1], p[2] - hz], [p[0] + hx, p[1], p[2] + hz], 0.035, o); }
}
// washing on a line between two local points: the line sags, the cloths hang off true
export function washing(B, M, a, b, rng, n = 4) {
  const g0 = M.elements[13] - 3, dx = b[0] - a[0], dz = b[2] - a[2], ry = Math.atan2(-dz, dx);
  beam(B, M, a, b, 0.014, { color: V.rope, moss: 0, ground: g0 });
  for (let i = 0; i < n; i++) {
    const t = (i + 0.6 + rng() * 0.3) / (n + 0.6), w = 0.35 + rng() * 0.4, hh = 0.4 + rng() * 0.5;
    const col = rng() < 0.35 ? pick(L.cloth, rng) : worn(L.plaster[3], rng, 0.1);
    B.add(B.box(w, hh, 0.014, { seg: 9 }), ch(M, a[0] + dx * t, a[1] + (b[1] - a[1]) * t - hh / 2 - 0.01, a[2] + dz * t, 0, ry, (rng() - 0.5) * 0.12), { color: col, moss: 0, ground: g0 });
  }
}
// a bed frame: four posts, rails, a pallet and a quilt
export function bed(B, M, x, y, z, ry, rng, o = {}) {
  const m = ch(M, x, y, z, 0, ry, 0), g0 = M.elements[13] - 3, w = o.w || 0.9, len = o.len || 1.9, wood = o.wood || L.wood;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(B.box(0.07, sz < 0 ? 0.85 : 0.55, 0.07, { seg: 9 }), ch(m, sx * w / 2, (sz < 0 ? 0.85 : 0.55) / 2, sz * len / 2), { color: wood, moss: 0, ground: g0 });
  B.add(B.box(w, 0.12, len, { seg: 9 }), ch(m, 0, 0.36, 0), { color: wood, moss: 0, ground: g0 });
  B.add(B.box(w - 0.08, 0.1, len - 0.1, { seg: 0.6 }), ch(m, 0, 0.47, 0), { color: o.quilt || pick(L.cloth, rng), moss: 0, ground: g0, disp: 0.015, dispScale: 4 });
  B.add(B.box(w * 0.6, 0.09, 0.3, { seg: 9 }), ch(m, 0, 0.55, -len / 2 + 0.25), { color: worn(L.plaster[3], rng, 0.05), moss: 0, ground: g0 });
}
// a hanging sign in the Late hand on an iron arm out from a wall (M: the arm's root on the wall's face)
export function hangSign(B, M, rng, o = {}) {
  const g0 = M.elements[13] - 3, reach = o.reach || 0.75, s = o.size || 0.5;
  beam(B, M, [0, 0, 0], [0, 0.05, reach], 0.04, { color: L.iron, iron: 0.8, moss: 0, ground: g0 });
  beam(B, M, [0, -0.3, 0], [0, 0.02, reach * 0.7], 0.025, { color: L.iron, iron: 0.8, moss: 0, ground: g0 });
  const m = ch(M, 0, -0.1 - s - 0.16, reach * 0.62, 0, Math.PI / 2 + (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.08);
  for (const sx of [-1, 1]) beam(B, m, [sx * s * 0.3, s + 0.16, 0], [sx * s * 0.3, s + 0.3, 0], 0.012, { color: L.iron, iron: 1, moss: 0, ground: g0 });
  PARTS.late.sign(B, m, { w: s, h: s, rng });
  B.add(B.box(s + 0.16, s + 0.16, 0.02, { seg: 9 }), ch(m, 0, s / 2, -0.045), { color: L.paint[1], moss: 0, ground: g0 }); // its painted back
}
// a wall of any outline (pts, [[x, y], ...]) with holes (each a list of points), d thick about z 0
export function wallPoly(B, M, pts, holes, d, o) {
  const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  for (const h of holes || []) { const p = new THREE.Path(); h.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); sh.holes.push(p); }
  B.add(B.extrude(sh, d, 1), M, o);
}
// add a geometry and then colour it vertex by vertex in its own frame: fn(x, y, z, out) writes out.r, out.g, out.b
// and out.e (0..: how much of `light` it gives off on the lit-window channel)
export function addPainted(B, g, M, o, fn, light = N.light) {
  const lp = g.attributes.position.array.slice(), base = B.count, out = { r: 1, g: 1, b: 1, e: 0 };
  B.add(g, M, o);
  for (let i = 0, n = lp.length / 3; i < n; i++) {
    out.e = 0; fn(lp[i * 3], lp[i * 3 + 1], lp[i * 3 + 2], out);
    const k = (base + i) * 3, e = (base + i) * 4;
    B.C[k] = out.r; B.C[k + 1] = out.g; B.C[k + 2] = out.b;
    if (out.e > 0) { B.E[e] = light[0] * out.e; B.E[e + 1] = light[1] * out.e; B.E[e + 2] = light[2] * out.e; B.E[e + 3] = 1; }
  }
}
// a lamp of coloured glass hung at a bracket's hook (a record's lamp: world space; M the identity or a parent)
export function hangLamp(B, lamp, glass = 'amber', k = 1) {
  const g = L.glass[glass], m = mat(lamp.x, lamp.y, lamp.z), g0 = lamp.y - 3;
  B.add(B.cyl(0.006, 0.006, 0.12, 3, 1), ch(m, 0, -0.06, 0), { color: L.iron, iron: 1, moss: 0, ground: g0 });
  B.add(B.cyl(0.03, 0.11, 0.1, 8, 1), ch(m, 0, -0.14, 0), { color: L.gilt, moss: 0, ground: g0 });
  B.add(new THREE.IcosahedronGeometry(0.11, 1), ch(m, 0, -0.28, 0, 0, 0, 0, 1, 1.3, 1), { color: c('#201008'), moss: 0, ground: g0, emit: [g[0] * k, g[1] * k, g[2] * k, 1] });
  B.add(B.cyl(0.07, 0.02, 0.08, 8, 1), ch(m, 0, -0.44, 0), { color: L.gilt, moss: 0, ground: g0 });
}
// what was added since `from` (a Builder's count), battered: every point drawn in toward the vertical through local
// (cx, cz) by k of its distance for each metre it stands above the plot's level, as a mud wall is built
export function batter(B, from, M, cx, cz, k) {
  const inv = M.clone().invert(), P = B.P;
  for (let i = from; i < B.count; i++) {
    _v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).applyMatrix4(inv);
    if (_v.y <= 0) continue;
    const f = 1 - k * _v.y;
    _v.x = cx + (_v.x - cx) * f; _v.z = cz + (_v.z - cz) * f;
    _v.applyMatrix4(M); P[i * 3] = _v.x; P[i * 3 + 1] = _v.y; P[i * 3 + 2] = _v.z;
  }
}
// what was added since `from`, dirtied: its colours taken k of the way to dirt, unevenly (a part's clean colours worn)
export function dirty(B, from, k, rng, col = V.dirt) {
  const C = B.C;
  for (let i = from; i < B.count; i++) { const f = k * (0.6 + 0.8 * rng()); C[i * 3] += (col.r - C[i * 3]) * f; C[i * 3 + 1] += (col.g - C[i * 3 + 1]) * f; C[i * 3 + 2] += (col.b - C[i * 3 + 2]) * f; }
}
