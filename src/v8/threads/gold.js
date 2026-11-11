// Thread 4, the gold from the court (briefs/v8/index.md): on the Sunken Court's west floor, beside P5's end, a slab laid
// with a mosaic of the sign in the Heliarchy's hand: two slate-violet masses with a V cut between them (half-angle 35
// degrees), lapis sky in the notch, and in it the disc in gold tesserae, its diameter 0.6 of the notch's width at its
// centre, its lower third below the shoulders; a cream fillet and an ember border round it all. The western half of the
// disc has been picked out: pale empty sockets in a ragged line, a few strays taken from the rest. One gold tessera
// already lies on the mole heap by the causeway (v7, glyphs/moles.js). Two more lie along P5, catching the eye, and P5
// ends at the Wayside Shrine, where the saint in the niche wears the thief's nest on its head like a crown: a jackdaw's
// heap of sticks with the gold heaped in it, a bronze ring and a pewter spoon, and the jackdaw itself on the rim, a
// tessera in its beak, its pale eye on you. It has left one in the offering bowl.
// Draws: the mosaic slab (vertex colours), the gold (mosaic and nest, faintly lit), the glints (lit brighter, both tied
// to the sun's flicker), the nest and the bird. Low: the tesserae are flat tops (no sides).
import * as THREE from 'three';
import { GOLD } from './plan.js';
import { Acc, frame, local, ellipsoid, rod, boxAt, finish, surfaceAt } from './kit.js';
import { makeGround } from '../../structures/geo.js';

const TAN = Math.tan(35 * Math.PI / 180);
// the sign on the panel: a across (-H..H), b up toward the notch's open side. Apex at b -1.35, shoulders at b 0.15;
// the disc's centre bc and radius R follow from the bible's proportions (0.6 of the notch's width at bc, a third below)
const APEX = -1.35, SHOULDER = 0.15, BC = (SHOULDER + 0.14 * -APEX) / 0.86, R = 0.84 * (BC - APEX) / 2;
export const MOSAIC_SIGN = { apex: APEX, shoulder: SHOULDER, bc: BC, r: R, tan: TAN };
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
function pattern(a, b, H) {
  const m = Math.max(Math.abs(a), Math.abs(b));
  if (m > H - 0.15) return 'border';
  if (m > H - 0.22) return 'fillet';
  if (Math.hypot(a, b - BC) < R) return 'gold';
  const edge = Math.abs(a) - (b - APEX) * TAN;
  if (b < SHOULDER && edge > 0) return Math.abs(edge) < 0.06 ? 'fillet' : 'mountain';
  if (b >= SHOULDER && b < SHOULDER + 0.06 && edge > 0) return 'fillet';
  return 'sky';
}
// picked out: the disc's western (−a) half behind a ragged line, a few strays from the rest, a few left behind
const taken = (a, b) => {
  const line = 0.08 + 0.12 * Math.sin(b * 7.3) + 0.06 * Math.sin(b * 17.1 + 1.3);
  const r = hash(a * 13.1, b * 7.7);
  return a < line ? r > 0.07 : r < 0.12;
};
const COL = { border: ['#7c3218', 0.1], fillet: ['#c8bb98', 0.06], mountain: ['#24202a', 0.12], sky: ['#2d4f94', 0.1] };

export function buildGold(ctx, gy) {
  const rng = ctx.makeRng(80404), low = ctx.quality === 'low';
  const ground = makeGround(ctx);
  const meshes = [], M = GOLD.mosaic;
  // ---------------------------------------------------------------- the slab and its mosaic
  const base = new Acc(rng), gold = new Acc(rng), glint = new Acc(rng);
  let gm = -Infinity; for (const dx of [-1.8, 0, 1.8]) for (const dz of [-1.8, 0, 1.8]) gm = Math.max(gm, ground.groundAt(M.x + dx, M.z + dz));
  const top = gm + 0.13; // a hand over the highest ground under it: the court's slabs stand 0.12 over theirs
  const P = frame(M.x, top, M.z, M.yaw);
  boxAt(base, P, M.size + 0.3, 0.6, M.size + 0.3, 0, -0.3, 0, '#6a6157', 0, 0, 0, 0.04); // the slab, sunk into the floor
  boxAt(base, P, M.size + 0.02, 0.01, M.size + 0.02, 0, 0.005, 0, '#a39a88', 0, 0, 0, 0.02); // the mortar bed
  const H = M.size / 2 - 0.05, pitch = 0.075, t = 0.064, th = 0.012;
  const ax = new THREE.Vector3(1, 0, 0).transformDirection(P), az = new THREE.Vector3(0, 0, 1).transformDirection(P);
  const counts = { tesserae: 0, gold: 0, taken: 0 };
  const _c = new THREE.Color();
  const tile = (acc, a, b, h, w, color, jitter, flatOnly) => {
    // a tessera, pushed straight into the accumulator: its top (and on high its four sides), a little out of true
    const cx = M.x + ax.x * a - az.x * b, cz = M.z + ax.z * a - az.z * b, y = top + 0.01, yt = y + h;
    const tw = w / 2, ry = (hash(a, b) - 0.5) * 0.14, ca = Math.cos(ry), sa = Math.sin(ry);
    const ux = ax.x * ca - az.x * sa, uz = ax.z * ca - az.z * sa, vx = ax.x * sa + az.x * ca, vz = ax.z * sa + az.z * ca;
    const c4 = [[-tw, -tw], [tw, -tw], [tw, tw], [-tw, tw]].map(([u, v]) => [cx + ux * u + vx * v, cz + uz * u + vz * v]);
    _c.set(color); const k = 1 + (acc.rng() - 0.5) * 2 * jitter, r = _c.r * k, g = _c.g * k, bl = _c.b * k;
    const V = (x, yy, z, nx, ny, nz) => { acc.pos.push(x, yy, z); acc.nor.push(nx, ny, nz); acc.col.push(r, g, bl); acc.uv.push(0, 0); };
    for (const i of [0, 3, 2, 0, 2, 1]) V(c4[i][0], yt, c4[i][1], 0, 1, 0);
    if (flatOnly) return;
    for (let q = 0; q < 4; q++) {
      const p0 = c4[q], p1 = c4[(q + 1) % 4], ex = p1[0] - p0[0], ez = p1[1] - p0[1], l = Math.hypot(ex, ez), nx = ez / l, nz = -ex / l;
      V(p0[0], y, p0[1], nx, 0, nz); V(p1[0], y, p1[1], nx, 0, nz); V(p1[0], yt, p1[1], nx, 0, nz);
      V(p0[0], y, p0[1], nx, 0, nz); V(p1[0], yt, p1[1], nx, 0, nz); V(p0[0], yt, p0[1], nx, 0, nz);
    }
  };
  for (let a = -H + pitch / 2; a < H; a += pitch) for (let b = -H + pitch / 2; b < H; b += pitch) {
    const k = pattern(a, b, H);
    if (k === 'gold') {
      if (taken(a, b)) { counts.taken++; tile(base, a, b, 0.001, t * 0.94, '#b4ac9c', 0.08, true); continue; } // the empty socket: the pale bed with the tessera's print in it
      tile(gold, a, b, th, t, hash(b, a) < 0.3 ? '#a8822c' : '#c09634', 0.12, low); counts.gold++; counts.tesserae++;
      continue;
    }
    const [c, j] = COL[k];
    const shade = k === 'sky' ? new THREE.Color(c).lerp(new THREE.Color('#4a72b8'), Math.max(0, (b - BC) / 2)) : c;
    tile(base, a, b, th, t, shade, j, low); counts.tesserae++;
  }
  // a few picked tesserae dropped on the floor round the slab, as if the thief were in a hurry
  for (let k = 0; k < 3; k++) {
    const a = -H - 0.3 - rng() * 0.7, b = BC + (rng() - 0.5) * 1.6, x = M.x + ax.x * a - az.x * b, z = M.z + ax.z * a - az.z * b;
    boxAt(gold, frame(x, ground.groundAt(x, z) + 0.13, z, rng() * 6), 0.064, 0.012, 0.064, 0, 0.006, 0, '#b8902e', 0, 0, 0.1);
  }
  meshes.push(finish(ctx, base, 'threads-gold-mosaic', { cast: false }));

  // ---------------------------------------------------------------- the glints along P5
  const glints = [];
  for (const g of GOLD.glints) {
    const y = gy(g.x, g.z), F = frame(g.x, y, g.z, rng() * 6);
    for (let k = 0; k < 4; k++) boxAt(glint, F, 0.055, 0.02, 0.055, (rng() - 0.5) * 0.3, 0.012, (rng() - 0.5) * 0.3, k ? '#c09634' : '#d8ac44', (rng() - 0.5) * 0.4, rng() * 3, (rng() - 0.5) * 0.4, 0.05);
    glints.push({ x: g.x, z: g.z, y });
  }

  // ---------------------------------------------------------------- the hoard: the nest on the saint's head
  const sp = ctx.structures?.notes?.shrine || GOLD.shrine;
  const nx = sp.x + 4.2, nz = sp.z + 1.2, ng = ground.groundAt(nx, nz), yaw = Math.atan2(sp.x - nx, sp.z - nz) + Math.PI;
  const N = frame(nx, ng, nz, yaw), NS = 1.35; // the nest a jackdaw's, overbuilt
  // the top of the saint's head: found on the shrine's own mesh, under the niche's lintel (scatter.js: the head at 1.8)
  const hp = new THREE.Vector3(0, 0, -0.1).applyMatrix4(N);
  const stone = ctx.scene.children.filter((o) => o.isMesh && /^structures/.test(o.name));
  const headY = surfaceAt(hp.x, hp.z, stone, () => ng + 1.95, ng + 2.6);
  const headTop = Math.abs(headY - ng - 1.9) < 0.4 ? headY - ng : 1.95;
  const nest = new Acc(rng), K = local(N, 0, headTop - 0.02, -0.1, 0, 0, 0, NS);
  // the sticks: two rings of them laid round, crossing, some poking out; a lining of wool and moss
  for (let k = 0; k < (low ? 26 : 44); k++) {
    const a = rng() * 6.283, r = 0.13 + rng() * 0.07, y0 = rng() * 0.09, len = 0.14 + rng() * 0.16, tilt = (rng() - 0.5) * 0.5;
    const da = len / r * 0.5, x0 = Math.cos(a - da) * r, z0 = Math.sin(a - da) * r, x1 = Math.cos(a + da) * (r + (rng() - 0.5) * 0.06), z1 = Math.sin(a + da) * (r + (rng() - 0.5) * 0.06);
    rod(nest, K, [x0, y0, z0], [x1, y0 + tilt * 0.2, z1], 0.006 + rng() * 0.004, rng() < 0.5 ? '#3a2c1e' : '#4b3a28', 0.005, 0.15, 4);
  }
  for (let k = 0; k < 6; k++) { const a = rng() * 6.283; rod(nest, K, [Math.cos(a) * 0.15, 0.05, Math.sin(a) * 0.15], [Math.cos(a) * 0.32, 0.12 + rng() * 0.08, Math.sin(a) * 0.32], 0.005, '#3a2c1e', 0.003, 0.1, 4); }
  ellipsoid(nest, K, 0, 0.02, 0, 0.15, 0.04, 0.15, '#6e655a');
  // the loot in it: the gold heaped (below), a bronze ring, a pewter spoon handle up
  rod(nest, K, [0.05, 0.06, -0.04], [0.11, 0.2, -0.07], 0.007, '#7d828a');
  ellipsoid(nest, K, 0.04, 0.055, -0.035, 0.03, 0.01, 0.022, '#7d828a');
  nest.add(new THREE.TorusGeometry(0.022, 0.005, 5, 12), local(K, -0.07, 0.09, 0.05, 1.2, 0, 0.3), '#7a6a3a', 0.05);
  for (let k = 0; k < (low ? 18 : 30); k++) {
    const a = rng() * 6.283, r = Math.sqrt(rng()) * 0.1, y = 0.05 + (0.1 - r) * 0.45 + rng() * 0.02;
    boxAt(glint, K, 0.03, 0.03, 0.03, Math.cos(a) * r, y, Math.sin(a) * r, rng() < 0.3 ? '#a8822c' : '#c89a36', rng() * 3, rng() * 3, rng() * 3, 0.1);
  }
  // spilled over the rim and down the saint: on its shoulders, its lap, the niche's sill
  for (const [x, y, z, fig] of [[0.17, 1.62, -0.05, 1], [-0.15, 1.6, 0.0, 1], [0.05, 1.255, 0.2, 1], [-0.1, 1.255, 0.18, 1], [0.3, 0.46, 0.45, 0], [-0.4, 0.46, 0.5, 0]]) boxAt(glint, N, 0.032, 0.032, 0.032, x, y + (fig ? headTop - 1.95 : 0), z, '#c89a36', rng() * 3, rng() * 3, rng() * 3, 0.1);
  // the jackdaw, on the rim toward the path: black, a grey nape, a pale eye, a tessera in its beak, head cocked at you
  const J = local(K, 0.06, 0.13, 0.16, 0, 0.35, 0);
  ellipsoid(nest, J, 0, 0.085, -0.01, 0.062, 0.07, 0.11, '#141216', { ax: -0.5 });
  boxAt(nest, J, 0.07, 0.012, 0.13, 0, 0.06, -0.14, '#121014', 0.45, 0, 0, 0.04); // the tail
  for (const s of [-1, 1]) ellipsoid(nest, J, s * 0.05, 0.1, -0.03, 0.02, 0.05, 0.1, '#1a181d', { ax: -0.45 });
  const Hd = local(J, 0, 0.165, 0.075, 0.15, 0.25, 0.32);
  ellipsoid(nest, Hd, 0, 0, 0, 0.042, 0.04, 0.045, '#141216');
  ellipsoid(nest, Hd, 0, 0.004, -0.022, 0.044, 0.038, 0.03, '#6d6a70'); // the grey nape
  for (const s of [-1, 1]) ellipsoid(nest, Hd, s * 0.03, 0.01, 0.02, 0.009, 0.009, 0.009, '#dcdcd2');
  rod(nest, Hd, [0, -0.005, 0.035], [0, -0.01, 0.085], 0.012, '#1c1a1c', 0.002, 0.04, 5);
  for (const s of [-1, 1]) rod(nest, J, [s * 0.025, 0.04, 0], [s * 0.025, -0.005, 0.01], 0.004, '#222');
  boxAt(glint, Hd, 0.026, 0.026, 0.026, 0, -0.02, 0.07, '#c89a36', 0.3, 0.4, 0, 0.05);
  // and one left in the offering bowl
  boxAt(glint, N, 0.03, 0.03, 0.03, 0.06, 0.262, 1.08, '#c89a36', 0, 0.5, 0, 0.05);
  meshes.push(finish(ctx, nest, 'threads-gold-nest'));
  // ---------------------------------------------------------------- the gold, faintly lit; the glints brighter
  const flick = ctx.sky?.flicker || { value: 1 };
  const goldMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.32, emissive: new THREE.Color('#8a5a14'), emissiveIntensity: 0.35 });
  const glintMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.7, roughness: 0.3, emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 2.2 });
  const gm1 = finish(ctx, gold, 'threads-gold', { material: goldMat, cast: false });
  const gm2 = finish(ctx, glint, 'threads-gold-glints', { material: glintMat, cast: false });
  meshes.push(gm1, gm2);
  ctx.registerUpdate((dt, t) => {
    const f = flick.value;
    goldMat.emissiveIntensity = 0.35 * f;
    glintMat.emissiveIntensity = (1.6 + 0.9 * Math.max(0, Math.sin(t * 2.3) * Math.sin(t * 0.7 + 1))) * f; // a slow catch of the light
  }, { pos: { x: (M.x + nx) / 2, z: (M.z + nz) / 2 }, near: 90, hz: 0 });
  const nestPos = new THREE.Vector3(0, 0, 0).applyMatrix4(K);
  const ends = {
    mosaic: { x: M.x, z: M.z, y: top, stand: { x: -73.5, z: -149, yaw: Math.atan2(-(M.x + 73.5), -(M.z + 149)), pitch: -0.3 } },
    glints,
    hoard: { x: nestPos.x, z: nestPos.z, y: nestPos.y, ground: ng, niche: { x: nx, z: nz }, stand: { x: -97.5, z: -124.5, yaw: Math.atan2(-(nestPos.x + 97.5), -(nestPos.z + 124.5)), pitch: 0.05 } },
  };
  return { meshes, ends, counts };
}
