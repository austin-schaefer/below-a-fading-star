// The Bell-House: a waystation beside the causeway, halfway from Carcanet Keep to the Cardinal Stones.
//
// The idea: a great bronze bell, cast by the Heliarchy for a belfry that was never raised, lies mouth-down in the turf
// ten metres off the road, sunk a little and leaning. Late travellers cut a pointed door through its waist and made it
// a shelter: a hearth on the flags inside, a ring of seat-stones, a lamp hung from the crown on a chain, the smoke
// going out where the canons broke off. Someone keeps it: the lamp is always lit, the hearth warm, and on a board
// inside the door every traveller's stroke is chalked, the last group unfinished. A crack runs up the bell's flank
// from the lip, and the lamp shows through it, a thin warm seam in the green; while the sun gutters the keeper's
// lamp is turned up and the seam and the door blaze. The clapper lies outside along the wall, a bench; the bronze
// at hand height either side of the door is rubbed gold by everyone who touched it going in; round the lip, a ring
// of pebbles, one left by each traveller.
//
// Site (brief issue-932): beside the causeway near (-60, -10); the bell stands at (-61.5, 3.5), ~10 m south of the
// road's line, its door facing the road. Its footprint is in src/v8/clearings.js ('the Bell-House').
// Draws: the solids (bell, flags, seats, hearth, clapper, lamp's iron, pebbles, kettle: one merged mesh, vertex
// colours, casting shadows), the glow (the crack's seam, the lamp's glass, the embers: one unlit mesh whose colour
// is turned each frame), the tally board (one plane on a CanvasTexture). One PointLight, short reach. Colliders: the
// bell's wall as capsules with the door left open, the seats and the clapper low enough to hop onto.
// ?waystation=0 leaves it out. ctx.waystation = { site, stats() }.
import * as THREE from 'three';
import { mergeGeometries } from '../v4/kit/merge.js';
import { clamp, smoothstep, lerp } from '../noise.js';

const PARAM = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('waystation')) || '';
const OFF = PARAM === '0';

export const BELL_HOUSE = { x: -61.3, z: 2.8, r: 5.9, door: [-0.25, 0.97] }; // door: the way it faces, toward the road
const DOOR = { half: 0.22, h: 2.25 }; // the door's half-width in radians (snapped to the grid's columns) and its height
// the bell's outer profile, lip to crown: [radius, height]
const PROF = [[3.02, 0], [3.1, 0.12], [3.08, 0.3], [2.95, 0.42], [2.72, 0.8], [2.5, 1.3], [2.32, 1.9], [2.2, 2.5], [2.12, 3.1],
  [2.13, 3.25], [2.08, 3.3], [2.06, 3.62], [2.11, 3.67], [2.06, 3.72], [2.0, 4.05], [1.86, 4.38], [1.6, 4.68], [1.2, 4.9], [0.75, 5.02], [0.46, 5.06]];
const SC = 1.45; // the bell's scale: 8.8 m across the mouth, 7.3 m high
const THICK = (y) => lerp(0.2, 0.11, clamp(y / 5, 0, 1));

export async function build(ctx) {
  if (OFF) { ctx.waystation = null; return; }
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(9320);
  const N2 = ctx.noise.noise2;
  const S = BELL_HOUSE;
  const yaw = Math.atan2(S.door[0], S.door[1]); // local +z is the door's way
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const W = (lx, lz) => [S.x + cy * lx + sy * lz, S.z - sy * lx + cy * lz]; // local to world
  const G = (lx, lz) => { const [x, z] = W(lx, lz); return terrain.heightAt(x, z); };
  let base = Infinity;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; base = Math.min(base, G(Math.sin(a) * 4.4, Math.cos(a) * 4.4)); }
  base -= 0.14; // sunk into the turf
  const g0 = G(0, 0);
  const TILT = 0.045; // it leans back, away from the road
  const frame = new THREE.Matrix4().compose(new THREE.Vector3(S.x, 0, S.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  const tilt = new THREE.Matrix4().makeRotationX(-TILT).premultiply(new THREE.Matrix4().makeTranslation(0, base, 0));
  const bellM = frame.clone().multiply(tilt);

  // ---------------------------------------------------------------- the bell
  const NA = low ? 56 : 80, NT = low ? 30 : 44;
  // the profile resampled to NT rows evenly by arc length, with its 2D normal (outward)
  const prof = [];
  {
    for (const p of PROF) { p[0] *= SC; p[1] *= SC; }
    const L = [0];
    for (let i = 1; i < PROF.length; i++) L.push(L[i - 1] + Math.hypot(PROF[i][0] - PROF[i - 1][0], PROF[i][1] - PROF[i - 1][1]));
    for (let j = 0; j <= NT; j++) {
      const s = (j / NT) * L[L.length - 1];
      let k = 1; while (k < L.length - 1 && L[k] < s) k++;
      const f = (s - L[k - 1]) / (L[k] - L[k - 1] || 1), r = lerp(PROF[k - 1][0], PROF[k][0], f), y = lerp(PROF[k - 1][1], PROF[k][1], f);
      prof.push({ r, y });
    }
    for (let j = 0; j <= NT; j++) {
      const a = prof[Math.max(0, j - 1)], b = prof[Math.min(NT, j + 1)], dr = b.r - a.r, dy = b.y - a.y, l = Math.hypot(dr, dy) || 1;
      prof[j].nr = dy / l; prof[j].ny = -dr / l;
      const t = THICK(prof[j].y);
      prof[j].ri = prof[j].r - prof[j].nr * t; prof[j].yi = prof[j].y - prof[j].ny * t;
    }
  }
  const DH = Math.max(1, Math.round(DOOR.half / ((Math.PI * 2) / NA))) * ((Math.PI * 2) / NA);
  const ang = (i) => (i / NA) * Math.PI * 2 - Math.PI; // door at angle 0 (local +z), i = NA/2
  const inDoor = (a, y) => Math.abs(a) < DH && y < DOOR.h;
  const CRACK_A = -1.15; // the crack, on the road side west of the door
  const crackAt = (y) => CRACK_A + 0.05 * Math.sin(y * 3.1) + 0.03 * Math.sin(y * 8.7 + 1);
  const CRACK_TOP = 4.4;
  const BRONZE = new THREE.Color('#5e4128'), VERD = new THREE.Color('#4f8c78'), VERD2 = new THREE.Color('#7fb39a'), GOLD = new THREE.Color('#b8975e');
  const SOIL = new THREE.Color('#2d2a1e'), SOOT = new THREE.Color('#120e0b'), INSIDE = new THREE.Color('#5e4630');
  const col = new THREE.Color();
  const paintOut = (a, y) => {
    const streak = N2(Math.cos(a) * 9 + Math.sin(a) * 3, y * 0.35) * 0.5 + 0.5; // verdigris runs down from the bands
    const band = Math.max(1 - smoothstep(0, 0.35, Math.abs(y - 5.0)), 1 - smoothstep(0, 0.5, Math.abs(y - 6.2)), 1 - smoothstep(0, 0.25, Math.abs(y - 0.35)));
    const top = smoothstep(5.2, 7.2, y);
    col.copy(BRONZE).multiplyScalar(0.85 + 0.3 * N2(a * 7, y * 2));
    col.lerp(VERD, clamp(streak * 0.95 - 0.1 + band * 0.4 + top * 0.5, 0, 0.92));
    col.lerp(VERD2, clamp((top - 0.3) * 0.5 + band * 0.25 * streak, 0, 0.5));
    // rubbed gold at hand height either side of the door
    const jamb = Math.abs(Math.abs(a) - DH - 0.06);
    col.lerp(GOLD, (1 - smoothstep(0.02, 0.1, jamb)) * smoothstep(0.85, 1.05, y) * (1 - smoothstep(1.4, 1.65, y)) * 0.75);
    // soot either side of the crack, soil at the foot
    col.lerp(SOOT, (1 - smoothstep(0.02, 0.16, Math.abs(a - crackAt(y)))) * (1 - smoothstep(CRACK_TOP - 0.4, CRACK_TOP + 0.2, y)) * 0.7);
    col.lerp(SOIL, (1 - smoothstep(0.0, 0.5, y)) * 0.6);
    return col;
  };
  const paintIn = (a, y) => col.copy(INSIDE).multiplyScalar(0.8 + 0.3 * N2(a * 5 + 4, y * 1.5)).lerp(VERD, 0.15 * (N2(a * 3, y) * 0.5 + 0.5)).lerp(SOOT, smoothstep(3.4, 7.0, y) * 0.85);
  const pos = [], nor = [], clr = [], idx = [];
  const vtx = (x, y, z, nx, ny, nz, c) => { pos.push(x, y, z); nor.push(nx, ny, nz); clr.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
  // vertex grids: outer [j][i], inner [j][i] (i wraps)
  const vo = [], vi = [];
  for (let j = 0; j <= NT; j++) {
    vo.push([]); vi.push([]);
    const P = prof[j];
    for (let i = 0; i < NA; i++) {
      const a = ang(i), s = Math.sin(a), c = Math.cos(a);
      const dent = 1 + 0.006 * N2(a * 4, P.y * 2); // not quite true
      vo[j].push(vtx(P.r * dent * s, P.y, P.r * dent * c, P.nr * s, P.ny, P.nr * c, paintOut(a, P.y)));
      vi[j].push(vtx(P.ri * dent * s, P.yi, P.ri * dent * c, -P.nr * s, -P.ny, -P.nr * c, paintIn(a, P.yi)));
    }
  }
  const cellOpen = (i, j) => inDoor(ang(i + 0.5), (prof[j].y + prof[j + 1].y) / 2);
  const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);
  const rimV = [];
  for (let j = 0; j < NT; j++) for (let i = 0; i < NA; i++) {
    const i1 = (i + 1) % NA;
    if (cellOpen(i, j)) continue;
    quad(vo[j][i], vo[j][i1], vo[j + 1][i1], vo[j + 1][i]);
    quad(vi[j][i], vi[j + 1][i], vi[j + 1][i1], vi[j][i1]);
  }
  // the cut edges: the door's jambs and arch, the lip, the crown's broken hole; each with its own flat-lit vertices
  const edge = (oa, ob, ia, ib) => {
    const P = (k) => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
    const A = P(oa), B = P(ob), C = P(ib), D = P(ia);
    const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const l = Math.hypot(...n) || 1; n = n.map((v) => v / l);
    const c = col.copy(BRONZE).lerp(GOLD, 0.35).multiplyScalar(0.9);
    const k = [A, B, C, D].map((p) => vtx(p[0], p[1], p[2], n[0], n[1], n[2], c));
    quad(k[0], k[1], k[2], k[3]);
  };
  for (let j = 0; j < NT; j++) for (let i = 0; i < NA; i++) {
    if (cellOpen(i, j)) continue;
    const i1 = (i + 1) % NA, im = (i + NA - 1) % NA;
    if (cellOpen(im, j)) edge(vo[j + 1][i], vo[j][i], vi[j + 1][i], vi[j][i]);
    if (cellOpen(i1, j)) edge(vo[j][i1], vo[j + 1][i1], vi[j][i1], vi[j + 1][i1]);
    if (j > 0 && cellOpen(i, j - 1)) edge(vo[j][i], vo[j][i1], vi[j][i], vi[j][i1]);
    if (j === 0) edge(vo[0][i1], vo[0][i], vi[0][i1], vi[0][i]);
    if (j === NT - 1) edge(vo[NT][i], vo[NT][i1], vi[NT][i], vi[NT][i1]);
  }
  const bellGeo = new THREE.BufferGeometry();
  bellGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bellGeo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  bellGeo.setAttribute('color', new THREE.Float32BufferAttribute(clr, 3));
  bellGeo.setIndex(idx);
  bellGeo.applyMatrix4(bellM);
  const parts = [bellGeo.toNonIndexed()];

  // ---------------------------------------------------------------- the props (local frame, on the ground)
  const tm = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const place = (lx, y, lz, ry, rx, rz, sx, syy, sz) => frame.clone().multiply(tm.compose(v.set(lx, y, lz), q.setFromEuler(eu.set(rx, ry, rz, 'YXZ')), sc.set(sx, syy, sz)));
  function part(geo, M, paint, shape) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (shape) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const o = shape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, o[0], o[1], o[2]); } }
    g.applyMatrix4(M); g.computeVertexNormals();
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { paint(p.getX(i), p.getY(i), p.getZ(i), col); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    parts.push(g);
  }
  const ICO = new THREE.IcosahedronGeometry(1, 1), ICO0 = new THREE.IcosahedronGeometry(1, 0), BOX = new THREE.BoxGeometry(1, 1, 1);
  const lumpy = (k, f, o) => (x, y, z) => { const d = 1 + k * N2(x * f + o, y * f + z * f * 0.7 + o); return [x * d, y * d, z * d]; };
  const STONE = [new THREE.Color('#8a857a'), new THREE.Color('#a19b8c'), new THREE.Color('#77736c')];
  const stonePaint = (base, tone) => (x, y, z, o) => o.copy(base).multiplyScalar(tone * (0.88 + 0.24 * N2(x * 3, y * 3 + z * 2)));
  const colliders = [];

  // the flags inside: irregular slabs over the floor, worn hollow toward the door
  for (let k = 0; k < (low ? 26 : 40); k++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 3.3, lx = Math.sin(a) * r, lz = Math.cos(a) * r;
    if (Math.hypot(lx, lz) < 0.75) continue; // the hearth
    const w = 0.55 + rng() * 0.35;
    part(BOX, place(lx, G(lx, lz) + 0.035, lz, rng() * 3, (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.04, w, 0.07, w * (0.7 + rng() * 0.3)), stonePaint(STONE[k % 3], 0.75 + rng() * 0.2), lumpy(0.08, 2, k));
  }
  // the threshold slab, out of the door
  part(BOX, place(0, G(0, 4.6) + 0.03, 4.6, 0.05, 0, 0, 1.05, 0.1, 0.7), stonePaint(STONE[2], 0.6), lumpy(0.12, 2.2, 3));
  // the seat-stones round the inside wall, either side, leaving the door and the hearth's way clear
  for (const [a0, a1] of [[0.6, 2.75], [-2.75, -0.6]]) {
    const n = low ? 5 : 7;
    for (let k = 0; k < n; k++) {
      const a = lerp(a0, a1, (k + 0.5) / n), r = 3.55, lx = Math.sin(a) * r, lz = Math.cos(a) * r, gy = G(lx, lz);
      part(ICO, place(lx, gy + 0.2, lz, a, (rng() - 0.5) * 0.08, 0, 0.36, 0.24, 0.3), stonePaint(STONE[k % 3], 0.85), (x, y, z) => { const d = 1 + 0.1 * N2(x * 2 + k, z * 2 + a); return [x * d, (y > 0 ? y * 0.55 : y) * d, z * d]; });
      const [wx, wz] = W(lx, lz); colliders.push({ x: wx, z: wz, r: 0.32, y: gy - 0.1, h: 0.53 });
    }
  }
  // the hearth: a ring of stones in the middle, a kettle on a trivet
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, lx = Math.sin(a) * 0.5, lz = Math.cos(a) * 0.5;
    part(ICO0, place(lx, G(lx, lz) + 0.08, lz, rng() * 6, 0, 0, 0.14, 0.11, 0.13), (x, y, z, o) => o.copy(STONE[k % 3]).multiplyScalar(0.7).lerp(SOOT, 0.55), lumpy(0.18, 4, k));
  }
  const IRON = new THREE.Color('#1c1916');
  const ironPaint = (x, y, z, o) => o.copy(IRON).lerp(new THREE.Color('#3b2618'), 0.4 * (N2(x * 6, y * 6 + z * 4) * 0.5 + 0.5));
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.3; part(BOX, place(Math.sin(a) * 0.22, g0 + 0.16, Math.cos(a) * 0.22, a, 0, 0, 0.025, 0.3, 0.025), ironPaint); }
  {
    const pts = [[0.001, 0], [0.12, 0.01], [0.17, 0.06], [0.18, 0.12], [0.15, 0.2], [0.07, 0.24], [0.06, 0.27], [0.001, 0.28]].map(([x, y]) => new THREE.Vector2(x, y));
    part(new THREE.LatheGeometry(pts, 10), place(0, g0 + 0.31, 0, 0, 0, 0, 1, 1, 1), (x, y, z, o) => o.set('#141210').lerp(new THREE.Color('#5a3a22'), 0.2 * (N2(x * 9, z * 9 + y * 9) * 0.5 + 0.5)));
    part(BOX, place(0.2, g0 + 0.5, 0, 0, 0, 0.9, 0.18, 0.025, 0.03), ironPaint); // the spout
  }
  // the lamp: a chain from the crown's inside to a lantern at head height and a half
  const CROWN_Y = base + prof[NT].yi - 0.05, LAMP_Y = g0 + 2.3, LZ = -Math.sin(TILT) * prof[NT].yi; // the crown leans back
  part(new THREE.CylinderGeometry(0.012, 0.012, CROWN_Y - LAMP_Y - 0.2, 4), place(0, (CROWN_Y + LAMP_Y + 0.2) / 2, LZ, 0, 0, 0, 1, 1, 1), ironPaint);
  part(new THREE.CylinderGeometry(0.03, 0.15, 0.12, 6), place(0, LAMP_Y + 0.2, LZ, 0, 0, 0, 1, 1, 1), ironPaint); // the hood
  part(new THREE.CylinderGeometry(0.13, 0.11, 0.05, 6), place(0, LAMP_Y - 0.17, LZ, 0, 0, 0, 1, 1, 1), ironPaint); // the pan
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; part(BOX, place(Math.sin(a) * 0.12, LAMP_Y, LZ + Math.cos(a) * 0.12, a, 0, 0, 0.018, 0.34, 0.018), ironPaint); }
  // the clapper, lying outside along the wall east of the door: a bench with a ball at one end
  {
    const pts = [[0.001, 0], [0.24, 0.04], [0.36, 0.25], [0.38, 0.42], [0.33, 0.62], [0.16, 0.8], [0.1, 0.95], [0.09, 2.0], [0.12, 2.1], [0.16, 2.18], [0.12, 2.3], [0.001, 2.32]].map(([x, y]) => new THREE.Vector2(x, y));
    const a = 0.85, r = 5.15, lx = Math.sin(a) * r, lz = Math.cos(a) * r, ry = a + Math.PI / 2 + 0.12; // along the tangent
    const gy = G(lx, lz);
    const M = place(lx, gy + 0.36, lz, ry, 0, 0, 1.25, 1.25, 1.25).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2 + 0.03)).multiply(new THREE.Matrix4().makeTranslation(0, -1.15, 0));
    part(new THREE.LatheGeometry(pts, 12), M, (x, y, z, o) => { o.copy(BRONZE).multiplyScalar(0.8).lerp(VERD, 0.55 * (N2(x * 2, z * 2 + y) * 0.5 + 0.5)).lerp(GOLD, smoothstep(gy + 0.5, gy + 0.62, y) * 0.75); });
    const dx = Math.cos(ry) * 1.44, dz = -Math.sin(ry) * 1.44; // the axis in the local frame
    const [x1, z1] = W(lx - dx, lz - dz), [x2, z2] = W(lx + dx, lz + dz);
    colliders.push({ x1, z1, x2, z2, r: 0.38, y: gy - 0.1, h: 0.85 });
  }
  // a broom against the wall west of the door
  {
    const a = -0.4, r = 4.1, lx = Math.sin(a) * r, lz = Math.cos(a) * r, gy = G(lx, lz);
    part(new THREE.CylinderGeometry(0.018, 0.022, 1.45, 5), place(lx, gy + 0.85, lz - 0.05, a, -0.32, 0, 1, 1, 1), (x, y, z, o) => o.set('#6b5238'));
    part(new THREE.ConeGeometry(0.17, 0.45, 7, 1, true), place(lx, gy + 0.2, lz + 0.18, a, -0.32 + Math.PI, 0, 1, 1, 0.55), (x, y, z, o) => o.set('#6e5f3e').multiplyScalar(0.8 + 0.3 * N2(x * 20, y * 20)));
  }
  // the travellers' pebbles round the lip, thicker by the door
  const NP = low ? 120 : 220;
  for (let k = 0; k < NP; k++) {
    let a = (rng() - 0.5) * Math.PI * 2;
    if (rng() < 0.4) a = (rng() - 0.5) * 1.6;
    if (Math.abs(a) < DH + 0.06) a += Math.sign(a || 1) * 0.25;
    const r = 4.55 + rng() * 0.3 + (rng() < 0.2 ? 0.3 : 0), lx = Math.sin(a) * r, lz = Math.cos(a) * r, s = 0.03 + rng() * 0.04;
    const stack = rng() < 0.15 ? s * 1.6 : 0;
    const pale = rng() < 0.18;
    part(ICO0, place(lx, G(lx, lz) + s * 0.6 + stack, lz, rng() * 6, rng(), rng(), s * 1.2, s, s), (x, y, z, o) => o.copy(pale ? STONE[1] : STONE[k % 3]).multiplyScalar(pale ? 1.1 : 0.6 + rng() * 0.25));
  }

  const solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.18 });
  const solid = new THREE.Mesh(mergeGeometries(parts), solidMat);
  solid.castShadow = true; solid.receiveShadow = true; solid.name = 'waystation';
  scene.add(solid);

  // ---------------------------------------------------------------- the glow: the crack's seam, the lamp, the embers
  const gp = [], gc = [];
  const gtri = (A, B, C, c) => { gp.push(...A, ...B, ...C); for (let k = 0; k < 3; k++) gc.push(c.r, c.g, c.b); };
  const P0 = new THREE.Vector3();
  const onBell = (a, y, out) => { // a point just off the outer surface at angle a, height y (bell frame)
    let j = 0; while (j < NT - 1 && prof[j + 1].y < y) j++;
    const f = clamp((y - prof[j].y) / (prof[j + 1].y - prof[j].y || 1), 0, 1), r = lerp(prof[j].r, prof[j + 1].r, f) + out;
    return P0.set(Math.sin(a) * r, y, Math.cos(a) * r).applyMatrix4(bellM).toArray();
  };
  {
    const n = 34, HOT = new THREE.Color('#ffc070'), DIM = new THREE.Color('#ff7a2a');
    for (let k = 0; k < n; k++) {
      const y0 = 0.05 + (k / n) * (CRACK_TOP - 0.05), y1 = 0.05 + ((k + 1) / n) * (CRACK_TOP - 0.05);
      const w0 = 0.016 * (1 - (k / n) * 0.8), w1 = 0.016 * (1 - ((k + 1) / n) * 0.8);
      const a0 = crackAt(y0) + (k % 2 ? 0.012 : -0.012), a1 = crackAt(y1) + (k % 2 ? -0.012 : 0.012);
      const A = onBell(a0 - w0, y0, 0.015), B = onBell(a0 + w0, y0, 0.015), C = onBell(a1 + w1, y1, 0.015), D = onBell(a1 - w1, y1, 0.015);
      const c = HOT.clone().lerp(DIM, k / n);
      gtri(A, B, C, c); gtri(A, C, D, c);
    }
  }
  const lampBox = (lx, y, lz, w, h, c) => {
    const g = new THREE.BoxGeometry(w, h, w).toNonIndexed(); g.applyMatrix4(place(lx, y, lz, 0.4, 0, 0, 1, 1, 1));
    const p = g.attributes.position.array; for (let i = 0; i < p.length; i += 3) { gp.push(p[i], p[i + 1], p[i + 2]); gc.push(c.r, c.g, c.b); }
  };
  lampBox(0, LAMP_Y, LZ, 0.2, 0.3, new THREE.Color('#ffd28a'));
  for (let k = 0; k < 9; k++) { const a = rng() * 6.28, r = rng() * 0.3; lampBox(Math.sin(a) * r, g0 + 0.09, Math.cos(a) * r, 0.1 + rng() * 0.08, 0.06, new THREE.Color('#ff6a20').multiplyScalar(1.2 + rng() * 0.8)); }
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.name = 'waystation-glow';
  scene.add(glow);

  // ---------------------------------------------------------------- the tally board, on the back wall
  let board = null;
  {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const c2 = cv.getContext('2d');
    c2.fillStyle = '#2a1f17'; c2.fillRect(0, 0, 256, 128);
    for (let k = 0; k < 9; k++) { c2.fillStyle = `rgba(0,0,0,${0.1 + 0.1 * (k % 3)})`; c2.fillRect(0, k * 14 + 3, 256, 2); }
    const r2 = ctx.makeRng(9321);
    let count = 0;
    const total = 211; // travellers so far
    c2.lineCap = 'round';
    for (let row = 0; row < 7 && count < total; row++) for (let grp = 0; grp < 9 && count < total; grp++) {
      const gx = 10 + grp * 27, gy = 10 + row * 17;
      for (let s = 0; s < 5 && count < total; s++, count++) {
        const fresh = total - count < 7;
        c2.strokeStyle = fresh ? 'rgba(240,232,210,0.95)' : `rgba(200,190,170,${0.35 + 0.35 * r2()})`;
        c2.lineWidth = fresh ? 2.2 : 1.6;
        c2.beginPath();
        if (s < 4) { c2.moveTo(gx + s * 5 + r2(), gy); c2.lineTo(gx + s * 5 + r2() * 2 - 1, gy + 12); }
        else { c2.moveTo(gx - 2, gy + 10); c2.lineTo(gx + 19, gy + 2); }
        c2.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const a = Math.PI; // on the back wall, facing the door: seen from the road through it
    const yb = 1.6, r = (() => { let jj = 0; while (jj < NT - 1 && prof[jj + 1].yi < yb) jj++; return prof[jj].ri - 0.14; })();
    board = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.68), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 }));
    const M = bellM.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(a) * r, yb, Math.cos(a) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + Math.PI), new THREE.Vector3(1, 1, 1)));
    M.decompose(board.position, board.quaternion, board.scale);
    board.receiveShadow = true; board.name = 'waystation-tally';
    scene.add(board);
  }

  // ---------------------------------------------------------------- the hearth's smoke out of the broken crown
  const NS = low ? 16 : 26, crown = new THREE.Vector3(0, prof[NT].y, 0).applyMatrix4(bellM);
  const sPos = new Float32Array(NS * 3), sCol = new Float32Array(NS * 4), sSeed = new Float32Array(NS);
  for (let i = 0; i < NS; i++) sSeed[i] = rng();
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  smokeGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 4));
  smokeGeo.boundingSphere = new THREE.Sphere(crown.clone().add(new THREE.Vector3(3, 6, 0)), 12);
  const puff = document.createElement('canvas'); puff.width = puff.height = 64;
  { const c2 = puff.getContext('2d'), gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64); }
  const smokeMat = new THREE.PointsMaterial({ size: 1.9, map: new THREE.CanvasTexture(puff), vertexColors: true, transparent: true, depthWrite: false, fog: true, sizeAttenuation: true });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.name = 'waystation-smoke'; smoke.frustumCulled = true;
  scene.add(smoke);
  const SMOKE_LIFE = 9, SMOKE_WIND = [0.55, 0.18];
  const smokeStep = (t) => {
    for (let i = 0; i < NS; i++) {
      const u = ((t / SMOKE_LIFE + sSeed[i] + i / NS) % 1), h = u * 7.5, sway = Math.sin(t * 0.4 + sSeed[i] * 9) * 0.35 * u;
      sPos[i * 3] = crown.x + SMOKE_WIND[0] * h * h * 0.12 + sway; sPos[i * 3 + 1] = crown.y + 0.2 + h; sPos[i * 3 + 2] = crown.z + SMOKE_WIND[1] * h * h * 0.12 - sway * 0.5;
      const a = smoothstep(0, 0.12, u) * (1 - smoothstep(0.45, 1, u)) * 0.3, g = 0.24 + 0.08 * u;
      sCol[i * 4] = g; sCol[i * 4 + 1] = g * 0.95; sCol[i * 4 + 2] = g * 0.98; sCol[i * 4 + 3] = a;
    }
    smokeGeo.attributes.position.needsUpdate = true; smokeGeo.attributes.color.needsUpdate = true;
  };
  smokeStep(0);

  // ---------------------------------------------------------------- the light, and its rhythm
  const [lwx, lwz] = W(0, LZ);
  const lamp = new THREE.PointLight(new THREE.Color('#ffa850'), 18, 8, 2);
  lamp.position.set(lwx, LAMP_Y - 0.05, lwz); lamp.name = 'waystation-lamp';
  scene.add(lamp);
  let turned = 0;
  ctx.registerUpdate((dt, t) => {
    const fl = ctx.sky?.flicker?.value ?? 1;
    const want = fl < 0.7 ? 1 : 0; // the keeper turns the lamp up while the sun gutters
    turned += (want - turned) * Math.min(1, dt * (want ? 2.5 : 0.6));
    const k = 0.86 + 0.08 * N2(t * 1.1, 3.3) + 0.06 * N2(t * 6.3, 1.7);
    lamp.intensity = 18 * k * (1 + 1.4 * turned);
    lamp.distance = 8 + 2 * turned;
    const g = (0.75 + 0.35 * k) * (1 + 2.2 * turned);
    glowMat.color.setRGB(g, g * 0.92, g * 0.85);
    smokeStep(t);
  }, { pos: { x: lwx, z: lwz }, near: 150, hz: 8 });

  // ---------------------------------------------------------------- the wall: capsules round the lip, the door left open
  {
    const R = 4.22, n = 30, gap = DH + 0.03;
    const from = gap, to = Math.PI * 2 - gap;
    for (let k = 0; k < n; k++) {
      const a0 = lerp(from, to, k / n), a1 = lerp(from, to, (k + 1) / n);
      const [x1, z1] = W(Math.sin(a0) * R, Math.cos(a0) * R), [x2, z2] = W(Math.sin(a1) * R, Math.cos(a1) * R);
      colliders.push({ x1, z1, x2, z2, r: 0.2, y: base - 1, h: 6.5, stand: false });
    }
  }
  for (const c of colliders) ctx.addCollider?.(c);

  const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const stats = { draws: 4, triangles: Math.round(tris(solid.geometry) + tris(glowGeo) + 2), points: NS, lights: 1, colliders: colliders.length };
  ctx.waystation = { site: S, stats: () => stats, lamp };
}
