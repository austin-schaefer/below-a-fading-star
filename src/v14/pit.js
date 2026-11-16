// The Pit from the bottom (v14-D2): the end of the way under the ground, and the answer to the Pit's card ("How then
// could an outer wind find its way into the pits and blow up from below?"). At the bottom of the Pit the floor of the
// world has worn through: in the middle of the rubble is a hole, the Nadir, and through it, under the world, is night
// and its stars, slowly turning; the wind comes up out of it. Someone from the valley found it and sounded it from
// below, as the leadsmen sound the world from above: a windlass on the floor (the down-reel), sheers over the hole, a
// line over their sheave and a crystal lead (a piece of one of the leadsmen's own, from the icefall) hanging in the
// hole's mouth. "Let go the lead": the pawl is knocked up, the drum runs, the lead drops into the stars and the Pit
// draws its breath in after it; at the line's bitter end the line snaps taut and sings, and the outer wind comes up
// it, a plume of cold motes up the throat and out over the lip into the sky, and winds the lead back up, rimed.
// The way up and out: the old road's own hex slabs, pinned into the wall one over the next and fanned clockwise up it
// from the floor on the west side to a landing over the lip on the north-west, beside where the road comes in.
// Story: stories/the-sounding-down.md. Plan: v14/pit/plan.js. The Pit's shape (heightAt) is untouched; the terrain's
// triangles over the floor are not drawn (this floor is drawn instead), as v5/nave.js does over its hole.
// Draws (ctx.pit.stats().calls): the place (floor, the Nadir's throat, stair, reel's frame, sheers: one mesh), the drum,
// the pawl, the lead (three), the two lines, the far stars and the night round a falling eye, the near stars, the motes
// and flames, the breath, the frost. Lights: the Nadir's (cold), the lead's (cold), and the lamps (warm): ten on the way
// and the landing's beacon; lights.js keeps the nearest three. ?pit=0 leaves it out (a test switch: the floor is then
// the old terrain and its black fan).
import * as THREE from 'three';
import { PIT, pitRim } from '../v4/paths/ground.js';
import { makeGround } from '../fauna/uncanny/kit.js';
import { UnderBuilder, underMaterial, installBelow } from './under.js';
import { C, dirOf, bearingOf, NADIR, nadirR, REEL, SHEERS, LEAD, STAIR, FLOOR, makeFloor, makeStair, wallR, LAMPS, STARLIGHT, LAMP_WARM, mouthClear } from './pit/plan.js';
import { PIT_HAZE, hazed, hazeAt } from './pit/haze.js';
import { hyp } from '../noise.js';

const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('pit') === '0';
const col = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const RUBBLE = col('#3b3632'), RUBBLE_D = col('#2a2624'), ROCK = col('#3a3431'), ROCK_D = col('#1d1a19'), SLAB = col('#857b70'), SLAB_D = col('#6a6158');
const BLACKROCK = col('#0b0a0c'), WORN = col('#a39a8e');
const TIMBER = col('#2e241c'), TIMBER_L = col('#45372a'), IRON = col('#26221f'), ROPE = col('#6a5d47'), BRONZE = col('#6e5a2e'), RIME = col('#cfdbe8');
const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// the act's timeline, in seconds from the press
export const SOUNDING = { knock: 0.35, out: 7.2, breath: 8.0, home: 22.5, done: 25 };

export async function build(ctx) {
  if (OFF) { ctx.pit = { off: true }; return; }
  const t0 = performance.now();
  const { scene, terrain: T } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(14201);
  await ctx.progress?.('the bottom of the pit', 0);
  const MG = makeGround(ctx);
  // the floor walked and drawn: the bowl (plan.js makeFloor), a replacing walkable; the terrain beyond it
  const FL = makeFloor(T, ctx.noise);
  ctx.addWalkable(FL.y, { replace: true });
  const g = (x, z) => FL.y(x, z) ?? T.heightAt(x, z);
  const yC = FL.y0;                       // the Nadir's mouth, the lowest of the floor
  const yHole = yC - 0.25;
  const lipY = (() => { let a = 0; for (let b = 0; b < 360; b += 30) { const [dx, dz] = dirOf(b), R = pitRim(b) + 1.2; a += g(C.x + dx * R, C.z + dz * R); } return a / 12; })();
  const floorR = (b) => pitRim(b) - FLOOR.out;  // the bowl reaches here; the drawn floor goes on under the wall's foot
  const drawR = (b) => floorR(b) + 3.2;  // out to every cut triangle's far corner, up the wall's foot

  // ---- the terrain over the floor is not drawn (its triangles with any corner inside the bowl), nor
  // the Saltings' crust laid on those same triangles (v4/regions/saltings.js): this floor is drawn instead
  await Promise.all([ctx.built?.('paths'), ctx.built?.('region-saltings')]);
  let cut = 0;
  const cutOver = (geo) => {
    if (!geo?.index) return;
    const idx = geo.index.array, P = geo.attributes.position.array;
    const inside = (i) => { const x = P[i * 3], z = P[i * 3 + 2], r = Math.hypot(x - C.x, z - C.z); return r < 20 && r < pitRim(bearingOf(x, z)) - FLOOR.out - 0.2; };
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2], xa = P[a * 3], za = P[a * 3 + 2];
      if (Math.abs(xa - C.x) > 22 || Math.abs(za - C.z) > 22) continue;
      if (inside(a) || inside(b) || inside(c)) { idx[t + 1] = a; idx[t + 2] = a; cut++; }
    }
    geo.index.needsUpdate = true;
  };
  cutOver(T.mesh.geometry);
  cutOver(scene.getObjectByName('saltings-crust')?.geometry);
  // the rocks' pebbles that lay on the old ground down here, laid on this floor (await the rocks: before this in MODULES)
  await ctx.built?.('rocks');
  {
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    scene.traverse((o) => {
      if (!o.isInstancedMesh || !/rocks-pebble/.test(o.name)) return;
      let moved = 0;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m); v.setFromMatrixPosition(m);
        const fy = FL.y(v.x, v.z); if (fy === null) continue;
        m.elements[13] += fy - T.heightAt(v.x, v.z); o.setMatrixAt(i, m); moved++;
      }
      if (moved) { o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere?.(); }
    });
  }

  // ---- what lights it: the sky through the disc overhead (dimmer the deeper), the Nadir's starlight, the lamps
  const stair = makeStair(T, FL);
  const lampAt = LAMPS.map((s) => { const p = stair.point(s, -STAIR.half - 0.05); return [p[0], p[1] + 1.55, p[2]]; });
  // and a beacon on the landing's tall post, over the lip: seen from the road's end and the moor round it
  { const L = stair.land, u = L.r1 - 0.2, w = STAIR.half + 0.12; lampAt.push([C.x + L.dx * u - L.dz * w, L.y + 3.55, C.z + L.dz * u + L.dx * w]); }
  const BEACON = lampAt.length - 1;
  // a lamp's pool: on its slabs and the wall beside it, strongest a metre and a half round, gone by four
  const lampPool = (x, y, z) => { let gl = 0; for (const L of lampAt) { const d = Math.hypot(x - L[0], (y - L[1]) * 0.8, z - L[2]); gl += 1.3 * Math.exp(-d / 1.5); } return Math.min(1.8, gl); };
  // (v14-F1) and the gatehouse lamp's light carried to the reel, 8 m off, so the drum and its frame read in the act
  const [rpx, rpz] = dirOf(REEL.b), RPX = C.x + rpx * REEL.r, RPZ = C.z + rpz * REEL.r;
  const reelPool = (x, y, z) => 0.55 * Math.exp(-Math.hypot(x - RPX, z - RPZ) / 1.6);
  const lit = (x, y, z, out) => {
    out[0] = 0.26 + 0.74 * ss(yC + 4, lipY + 1, y);
    out[1] = 1;
    // the glow channel is the lamps' warm pools (the Nadir's cold light is its point light, and leaves the rim dark)
    out[2] = lampPool(x, y, z) + reelPool(x, y, z);
    return out;
  };
  const B = new UnderBuilder(lit);

  // ---- the floor: rubble and grit from the Nadir's edge to the wall's foot, a hair over the ground, curling down
  // into the hole at its edge; then the Nadir's rock throat, going down into the dark
  {
    const NB = low ? 72 : 120, rings = [];
    const rad = [0, 0.15, 0.4, 0.8, 1.3, 2, 2.8, 3.7, 4.7, 5.8, 7, 8.3, 9.7, 11.2, 12.6, 14, 15.4];
    for (let i = 0; i <= NB; i++) {
      const b = (i % NB) * 360 / NB, [dx, dz] = dirOf(b), r0 = nadirR(b), r1 = drawR(b), row = [];
      for (const u of rad) {
        const r = Math.min(r1, r0 + u), x = C.x + dx * r, z = C.z + dz * r, fy = FL.y(x, z);
        let y = (fy ?? Math.max(T.heightAt(x, z), MG.at(x, z), r < floorR(b) + 1.6 ? FLOOR.edge : -Infinity)) + 0.04 + Math.max(0, ctx.noise.noise2(x * 1.7, z * 1.7)) * 0.06;
        if (u === 0) y = yC - 0.35; else if (u < 0.5) y -= 0.18 * (1 - u / 0.5);
        const shade = 0.82 + 0.3 * ctx.noise.noise2(x * 0.6 + 4, z * 0.6) + (u < 1 ? -0.15 : 0);
        row.push([x, y, z, shade]);
        if (r >= r1) break;
      }
      while (row.length < rad.length) row.push(row[row.length - 1]);
      rings.push(row);
    }
    for (let i = 0; i < NB; i++) for (let k = 0; k < rad.length - 1; k++) {
      const a = rings[i][k], b = rings[i + 1][k], c = rings[i + 1][k + 1], d = rings[i][k + 1];
      const sh = (a[3] + c[3]) / 2, cc = (k + i) % 3 ? RUBBLE : RUBBLE_D, cl = [cc[0] * sh, cc[1] * sh, cc[2] * sh];
      B.quad(a.slice(0, 3), b.slice(0, 3), c.slice(0, 3), d.slice(0, 3), cl, [0, 1, 0], 0.18);
    }
    // the throat: ragged rock going down from the edge, facing in
    for (let i = 0; i < NB; i++) {
      const b0 = (i * 360) / NB, b1 = ((i + 1) * 360) / NB, [ax, az] = dirOf(b0), [bx, bz] = dirOf(b1);
      const ra = nadirR(b0), rb = nadirR(b1), y0 = yC - 0.35;
      const lay = [0, 0.3, 0.75, 1.25]; // the floor's thickness: a metre of rubble, then nothing
      for (let k = 0; k < lay.length - 1; k++) {
        const ja = 0.18 * Math.sin(b0 * 0.31 + k * 2.1), jb = 0.18 * Math.sin(b1 * 0.31 + k * 2.1), na = 0.18 * Math.sin(b0 * 0.31 + (k + 1) * 2.1), nb = 0.18 * Math.sin(b1 * 0.31 + (k + 1) * 2.1);
        const q = (r, j, dx, dz, y) => [C.x + dx * (r + j), y, C.z + dz * (r + j)];
        B.quad(q(ra, ja, ax, az, y0 - lay[k]), q(rb, jb, bx, bz, y0 - lay[k]), q(rb, nb, bx, bz, y0 - lay[k + 1]), q(ra, na, ax, az, y0 - lay[k + 1]), k ? BLACKROCK : ROCK_D, [-(ax + bx), 0, -(az + bz)], 0.2);
      }
      // the underside: a ragged lip of the floor's bottom, turned in, so its edge shows how thin the world is here
      { const yb = y0 - lay[lay.length - 1], q = (r, dx, dz, y) => [C.x + dx * r, y, C.z + dz * r];
        B.quad(q(ra + 0.18 * Math.sin(b0 * 0.31 + 6.3), ax, az, yb), q(rb + 0.18 * Math.sin(b1 * 0.31 + 6.3), bx, bz, yb), q(rb + 1.6, bx, bz, yb - 0.3), q(ra + 1.6, ax, az, yb - 0.3), BLACKROCK, [0, -1, 0], 0.1);
      }
    }
    // rubble: blocks fallen from the throat over the ages, kept off the ways (the passage's mouth, the stair's foot, the reel)
    const footP = stair.point(1);
    for (let i = 0; i < (low ? 46 : 80); i++) {
      const b = rng() * 360, [dx, dz] = dirOf(b), r = nadirR(b) + 0.8 + Math.pow(rng(), 0.7) * (floorR(b) - nadirR(b) - 0.6);
      const x = C.x + dx * r, z = C.z + dz * r;
      if (mouthClear(b) && r > 6) continue;
      if (Math.hypot(x - footP[0], z - footP[2]) < 3.2) continue;
      const [rx, rz] = dirOf(REEL.b); if (Math.hypot(x - (C.x + rx * REEL.r), z - (C.z + rz * REEL.r)) < 2.4) continue;
      if (Math.abs(((b - REEL.b + 540) % 360) - 180) < 14 && r < REEL.r + 6) continue; // the way from the mouth to the reel
      const s = 0.12 + Math.pow(rng(), 2.2) * 0.5;
      B.box(x, g(x, z) + s * 0.35, z, s * (1 + rng() * 0.6), s * (0.5 + rng() * 0.4), s * (0.8 + rng() * 0.5), rng() * 6, rng() < 0.4 ? ROCK_D : RUBBLE, RUBBLE, 0.2);
    }
  }
  await ctx.progress?.('the bottom of the pit', 0.25);

  // ---- the stair: the road's hex slabs, one a tread, each a riser over the last, on an iron knee into the wall; iron
  // stanchions on the hole's side with a rope between; a warm lamp at the head, nine on the way, one at the foot
  const treads = Math.ceil((stair.yHead - stair.yFoot) / 0.2);
  {
    const HEX = 0.7;
    for (let i = 0; i <= treads; i++) {
      const s = i / treads, q = stair.at(s), [dx, dz] = dirOf(q.b), x = C.x + dx * q.r, z = C.z + dz * q.r;
      const yaw = -(q.b * Math.PI) / 180 + (rng() - 0.5) * 0.12, c0 = 0.85 + rng() * 0.3, cl = (rng() < 0.3 ? SLAB_D : SLAB).map((v) => v * c0);
      const ring = []; for (let k = 0; k < 6; k++) { const a = yaw + k * Math.PI / 3 + Math.PI / 6; ring.push([x + Math.cos(a) * HEX, z + Math.sin(a) * HEX]); }
      B.prism(ring, q.y - 0.17, q.y, cl.map((v) => v * 0.55), cl, 0.12);
      // the worn middle: paler, where two hundred years of feet went
      const inner = ring.map(([px, pz]) => [x + (px - x) * 0.55, z + (pz - z) * 0.55]);
      B.prism(inner, q.y - 0.02, q.y + 0.006, WORN, WORN, 0.1);
      // a knee of iron under the slab: from the rock below, up to the slab's wall side
      const wr = Math.min(q.r + 3, Math.max(q.r + 0.9, wallR(T, q.b, q.y - 1.1) - 0.05));
      B.beam([x + dx * 0.4, q.y - 0.16, z + dz * 0.4], [C.x + dx * wr, q.y - 1.1, C.z + dz * wr], 0.022, IRON, 0.05);
    }
    // the stanchions and the rope on the hole's side
    const posts = Math.round(stair.len / 2.8);
    let prev = null;
    for (let i = 0; i <= posts; i++) {
      const s = i / posts, p = stair.point(s, -STAIR.half + 0.08);
      B.beam([p[0], p[1] - 0.2, p[2]], [p[0], p[1] + 1.02, p[2]], 0.025, IRON, 0.05);
      const top = [p[0], p[1] + 0.98, p[2]];
      if (prev) { const mid = [(prev[0] + top[0]) / 2, (prev[1] + top[1]) / 2 - 0.14, (prev[2] + top[2]) / 2]; B.beam(prev, mid, 0.016, ROPE, 0.05); B.beam(mid, top, 0.016, ROPE, 0.05); }
      prev = top;
    }
    // the landing: planks on two bearers from the first slab out over the lip; two iron posts at its outer end.
    // The planks' tops lie 2.5 cm under the first slab's, which rests on their inner end: at one height the two flicker.
    const L = stair.land, ax = L.dx, az = L.dz, tx = -az, tz = ax, n = Math.round((L.r1 - L.r0) / 0.3);
    for (let i = 0; i < n; i++) {
      const u = L.r0 + (i + 0.5) * (L.r1 - L.r0) / n;
      B.box(C.x + ax * u, L.y - 0.055, C.z + az * u, (L.r1 - L.r0) / n / 2 - 0.015, 0.03, STAIR.half + 0.05 * (rng() - 0.5), -(L.b * Math.PI) / 180 + Math.PI / 2, TIMBER_L, TIMBER_L, 0.3);
    }
    for (const w of [-1, 1]) {
      const x0 = C.x + ax * L.r0 + tx * w * (STAIR.half - 0.05), z0 = C.z + az * L.r0 + tz * w * (STAIR.half - 0.05);
      const x1 = C.x + ax * L.r1 + tx * w * (STAIR.half - 0.05), z1 = C.z + az * L.r1 + tz * w * (STAIR.half - 0.05);
      B.beam([x0, L.y - 0.12, z0], [x1, L.y - 0.12, z1], 0.08, TIMBER, 0.12);
      const px = C.x + ax * (L.r1 - 0.2) + tx * w * (STAIR.half + 0.12), pz = C.z + az * (L.r1 - 0.2) + tz * w * (STAIR.half + 0.12);
      B.beam([px, g(px, pz) - 0.3, pz], [px, L.y + (w > 0 ? 3.6 : 1.25), pz], 0.05, IRON, 0.05); // one post a tall lamp-post, seen from the road
      // a bearer's foot on the rim
      const fx = C.x + ax * (stair.R0 + 0.6) + tx * w * (STAIR.half - 0.05), fz = C.z + az * (stair.R0 + 0.6) + tz * w * (STAIR.half - 0.05);
      B.beam([fx, g(fx, fz) - 0.4, fz], [fx, L.y - 0.1, fz], 0.07, TIMBER, 0.12);
    }
    // the lamps: an iron crook on a stanchion and a cage; the head's on the landing's post
    for (const [x, y, z] of lampAt) {
      B.beam([x, y - 1.6, z], [x, y + 0.35, z], 0.03, IRON, 0.05);
      for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.beam([x + cx * 0.09, y - 0.16, z + cz * 0.09], [x + cx * 0.07, y + 0.18, z + cz * 0.07], 0.01, IRON, 0.04);
      B.box(x, y - 0.18, z, 0.11, 0.02, 0.11, 0, IRON);
      B.prism([[x, z - 0.11], [x + 0.11, z], [x, z + 0.11], [x - 0.11, z]], y + 0.18, y + 0.3, IRON);
    }
  }
  await ctx.progress?.('the bottom of the pit', 0.45);

  // ---- the sheers: three timbers from the floor round the Nadir lashed at a head over it, a sheave in the head
  const apex = [C.x, yC + SHEERS.h, C.z];
  const legFeet = SHEERS.legs.map((b) => { const [dx, dz] = dirOf(b); const x = C.x + dx * SHEERS.r, z = C.z + dz * SHEERS.r; return [x, g(x, z), z]; });
  {
    for (const [x, y, z] of legFeet) {
      B.beam([x, y - 0.3, z], [apex[0] + (x - C.x) * 0.04, apex[1] + 0.35, apex[2] + (z - C.z) * 0.04], 0.13, TIMBER, 0.15);
      B.box(x, y + 0.04, z, 0.35, 0.1, 0.35, rng(), ROCK, ROCK, 0.2);
    }
    B.box(apex[0], apex[1] + 0.28, apex[2], 0.28, 0.3, 0.28, 0.4, ROPE, ROPE, 0.2);
    // the sheave's cheeks and the block hanging from the head
    B.box(apex[0], apex[1] - 0.25, apex[2], 0.05, 0.28, 0.24, -(REEL.b * Math.PI) / 180, IRON);
    B.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 14), new THREE.Matrix4().compose(new THREE.Vector3(apex[0], apex[1] - 0.28, apex[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -(REEL.b * Math.PI) / 180 + Math.PI / 2, Math.PI / 2)), new THREE.Vector3(1, 1, 1)), BRONZE, 0.05);
  }
  // ---- the down-reel: a windlass on a sill, its drum on the line from the sheave, a crank, a ratchet and its pawl
  const [rdx, rdz] = dirOf(REEL.b), reelX = C.x + rdx * REEL.r, reelZ = C.z + rdz * REEL.r, reelG = g(reelX, reelZ);
  const ax2 = -rdz, az2 = rdx; // the drum's axle, across the line
  const drumY = reelG + 0.7, drumR = 0.26, drumL = 0.95;
  {
    for (const w of [-1, 1]) {
      const px = reelX + ax2 * w * (drumL / 2 + 0.12), pz = reelZ + az2 * w * (drumL / 2 + 0.12);
      // an A of two timbers each side and the sill under them
      for (const f of [-1, 1]) B.beam([px + rdx * f * 0.55, reelG - 0.1, pz + rdz * f * 0.55], [px, drumY + 0.18, pz], 0.07, TIMBER, 0.12);
      B.box(px, drumY, pz, 0.09, 0.12, 0.09, 0, IRON);
    }
    for (const f of [-1, 1]) B.beam([reelX + rdx * f * 0.55 - ax2 * (drumL / 2 + 0.3), reelG + 0.04, reelZ + rdz * f * 0.55 - az2 * (drumL / 2 + 0.3)], [reelX + rdx * f * 0.55 + ax2 * (drumL / 2 + 0.3), reelG + 0.04, reelZ + rdz * f * 0.55 + az2 * (drumL / 2 + 0.3)], 0.1, TIMBER_L, 0.12);
    // a coil of spare line and a bucket of tallow beside it; a stone on the sill
    B.geo(new THREE.TorusGeometry(0.32, 0.07, 6, 16), new THREE.Matrix4().compose(new THREE.Vector3(reelX + rdx * 1.2 + ax2 * 0.9, reelG + 0.07, reelZ + rdz * 1.2 + az2 * 0.9), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1)), ROPE, 0.1);
    B.geo(new THREE.CylinderGeometry(0.17, 0.14, 0.32, 9), new THREE.Matrix4().makeTranslation(reelX + rdx * 1.0 - ax2 * 1.0, g(reelX + rdx - ax2, reelZ + rdz - az2) + 0.16, reelZ + rdz * 1.0 - az2 * 1.0), TIMBER_L, 0.1);
  }
  await ctx.progress?.('the bottom of the pit', 0.6);

  // the place: one mesh
  const geo = B.geometry();
  const mat = hazed(underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.04 }), 'pit', LAMP_WARM));
  // the lamps' pools on the throat's rock beside them (v4/paths.js bakes the lip's last sun into the same channel)
  { const th = scene.getObjectByName('paths-pit-throat'), U = th?.geometry.attributes.aUnder, P = th?.geometry.attributes.position;
    if (U) { for (let i = 0; i < U.count; i++) U.setZ(i, Math.min(1.8, U.getZ(i) + lampPool(P.getX(i), P.getY(i), P.getZ(i)))); U.needsUpdate = true; } }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'pit-floor'; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  // ---- the drum (turns), with the crank and the ratchet: its own small mesh about the axle
  const D = new UnderBuilder(lit);
  {
    const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2); // the cylinder's axis along x
    D.geo(new THREE.CylinderGeometry(drumR, drumR, drumL, 16, 1, false), m, TIMBER_L, 0.15);
    // the wound line: a band of rope on the drum
    D.geo(new THREE.CylinderGeometry(drumR + 0.05, drumR + 0.05, drumL * 0.8, 16), m, ROPE, 0.2);
    // the flanges
    for (const s of [-1, 1]) D.geo(new THREE.CylinderGeometry(drumR + 0.14, drumR + 0.14, 0.05, 16), new THREE.Matrix4().makeTranslation(s * drumL / 2, 0, 0).multiply(m), TIMBER, 0.1);
    // the ratchet's teeth on one flange
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; D.box(drumL / 2 + 0.035, Math.sin(a) * (drumR + 0.14), Math.cos(a) * (drumR + 0.14), 0.012, 0.05, 0.05, 0, IRON); }
    // the crank: an arm and a handle off the other end
    D.beam([drumL / 2 + 0.05, 0, 0], [drumL / 2 + 0.3, 0, 0], 0.03, IRON, 0.05);
    D.beam([drumL / 2 + 0.3, 0, 0], [drumL / 2 + 0.3, 0.42, 0], 0.03, IRON, 0.05);
    D.beam([drumL / 2 + 0.3, 0.42, 0], [drumL / 2 + 0.55, 0.42, 0], 0.025, TIMBER, 0.08);
  }
  // the drum is built at its own origin: its aUnder is baked again at its place
  const dgeo = D.geometry();
  const drum = new THREE.Mesh(dgeo, hazed(underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.1 }), 'pit-drum', LAMP_WARM)));
  drum.name = 'pit-drum'; drum.castShadow = true; drum.receiveShadow = true;
  drum.position.set(reelX, drumY, reelZ);
  drum.rotation.set(0, Math.atan2(-az2, ax2), 0);
  { const u = dgeo.attributes.aUnder.array, o = [0, 0, 0]; for (let i = 0; i < u.length; i += 3) { lit(reelX, drumY, reelZ, o); u[i] = o[0]; u[i + 1] = o[1]; u[i + 2] = o[2]; } }
  scene.add(drum);
  // the pawl: a short iron dog on the sill's post, resting on the ratchet; knocked up, it swings clear
  const pawlG = new THREE.BoxGeometry(0.05, 0.05, 0.36); pawlG.translate(0, 0, 0.16);
  const pawl = new THREE.Mesh(pawlG, new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.6, metalness: 0.4, emissive: LAMP_WARM, emissiveIntensity: 0.1 })); // (v14-F1) the lamp's sheen on the iron
  pawl.name = 'pit-pawl';
  const pawlBase = new THREE.Vector3(reelX + ax2 * (drumL / 2 + 0.035) + rdx * (drumR + 0.42), drumY + 0.2, reelZ + az2 * (drumL / 2 + 0.035) + rdz * (drumR + 0.42));
  pawl.position.copy(pawlBase);
  pawl.rotation.set(0, Math.atan2(-rdx, -rdz), 0, 'YXZ');
  scene.add(pawl);

  // ---- the lead: a crystal lead the length of a man, six-sided, pointed, a bronze collar and eye; it holds a little of the starlight
  const leadG = (() => {
    const pts = [[0, 0], [0.13, 0.34], [0.15, LEAD.len - 0.18], [0.11, LEAD.len - 0.08], [0.0, LEAD.len - 0.02]].map(([r, y]) => new THREE.Vector2(r, y));
    const gg = new THREE.LatheGeometry(pts, 6); gg.computeVertexNormals(); return gg;
  })();
  const leadMat = hazed(new THREE.MeshStandardMaterial({ color: '#4a5c78', roughness: 0.2, metalness: 0.1, emissive: new THREE.Color(STARLIGHT), emissiveIntensity: 0.18, flatShading: true }));
  const lead = new THREE.Group(); lead.name = 'pit-lead';
  const leadBody = new THREE.Mesh(leadG, leadMat); lead.add(leadBody);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 8), hazed(new THREE.MeshStandardMaterial({ color: '#7a6232', roughness: 0.5, metalness: 0.6 })));
  collar.position.y = LEAD.len - 0.12; lead.add(collar);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), collar.material); eye.position.y = LEAD.len + 0.04; lead.add(eye);
  const leadRestY = yHole + LEAD.rest;
  lead.position.set(C.x, leadRestY, C.z);
  scene.add(lead);
  // the line from the sheave down to the lead's eye: a thin box stretched each frame; from the drum up to the sheave, fixed
  const lineMat = hazed(new THREE.MeshStandardMaterial({ color: '#5d5240', roughness: 0.8 }));
  const lineG = new THREE.BoxGeometry(0.03, 1, 0.03); lineG.translate(0, -0.5, 0);
  const line = new THREE.Mesh(lineG, lineMat); line.name = 'pit-line';
  line.position.set(apex[0], apex[1] - 0.28, apex[2]);
  scene.add(line);
  {
    const top = new THREE.Vector3(apex[0] + rdx * 0.2, apex[1] - 0.12, apex[2] + rdz * 0.2), bot = new THREE.Vector3(reelX - rdx * drumR, drumY + drumR * 0.3, reelZ - rdz * drumR);
    const run = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), lineMat);
    run.position.copy(top).add(bot).multiplyScalar(0.5); run.scale.y = top.distanceTo(bot);
    run.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
    run.name = 'pit-line-run'; scene.add(run);
  }

  // ---- the stars under the world: a disc at the bottom of the Nadir's throat, drawn by the direction it is seen in
  // (they are as far as the stars overhead), turning slowly; it writes no depth, so the lead goes on down into them
  const starsMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGust: { value: 0 }, uDraw: { value: 0 } },
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime, uGust, uDraw; varying vec3 vW;
      float h13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float layer(vec3 d, float K, float thr, float sz) {
        vec3 p = d * K, c = floor(p), f = fract(p);
        float h = h13(c); if (h < thr) return 0.0;
        vec3 o = vec3(h13(c + 11.1), h13(c + 23.7), h13(c + 37.3)) * 0.6 + 0.2;
        float tw = 0.7 + 0.3 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
        return smoothstep(sz, 0.0, length(f - o)) * tw * (0.4 + 0.6 * (h - thr) / (1.0 - thr));
      }
      void main() {
        vec3 d = normalize(vW - cameraPosition);
        float a = uTime * 0.012; float ca = cos(a), sa = sin(a);
        d = vec3(ca * d.x - sa * d.z, d.y, sa * d.x + ca * d.z);
        float s = layer(d, 70.0, 0.82, 0.16) + layer(d, 150.0, 0.86, 0.2) * 0.8 + layer(d, 32.0, 0.93, 0.12) * 1.6;
        float neb = 0.5 + 0.5 * sin(d.x * 3.1 + d.z * 2.3 + 1.7) * sin(d.z * 4.0 - d.x * 1.3);
        vec3 base = mix(vec3(0.0), vec3(0.012, 0.008, 0.026), neb * neb * neb); // black: the deepest thing in any frame
        vec3 c = base + vec3(0.85, 0.92, 1.0) * s * 1.6 * (1.0 + 0.6 * uGust);
        c *= 1.0 - 0.6 * uDraw; // the Pit drawing its breath dims them a little
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthWrite: false,
  });
  const starDisc = new THREE.Mesh(new THREE.CircleGeometry(NADIR.r + 7, 32).rotateX(-Math.PI / 2), starsMat);
  starDisc.position.set(C.x, yC - 0.35 - 1.25 - 0.6, C.z); starDisc.renderOrder = -2; starDisc.name = 'pit-stars';
  scene.add(starDisc);
  // and the near ones, at real depth under the hole (4 to 120 m down, out to 40 m round): they move against each other
  // as the visitor walks round the rim, and the whole field turns slowly over them, the deeper the slower, as if the
  // world were turning over the night. Additive points, depth-tested, so only the hole shows them; no fog
  const NS = low ? 180 : 320, spos = new Float32Array(NS * 3), sat = new Float32Array(NS * 2);
  for (let i = 0; i < NS; i++) {
    const a = rng() * Math.PI * 2, r = 0.5 + Math.pow(rng(), 0.6) * 40, d = 4 + Math.pow(rng(), 1.4) * 116;
    spos.set([Math.cos(a) * r, -d, Math.sin(a) * r], i * 3); sat.set([0.5 + rng() * (rng() < 0.12 ? 3 : 1.2), rng() * 50], i * 2);
  }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3)); sgeo.setAttribute('aS', new THREE.BufferAttribute(sat, 2));
  const nearMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHole: { value: new THREE.Vector3(C.x, yC - 1.6, C.z) }, uScale: { value: 400 }, uGust: { value: 0 } },
    vertexShader: `uniform float uTime, uScale, uGust; uniform vec3 uHole; attribute vec2 aS; varying float vB;
      void main() {
        float d = -position.y, a = uTime * 0.03 / (1.0 + d * 0.04);
        vec3 p = vec3(cos(a) * position.x - sin(a) * position.z, position.y, sin(a) * position.x + cos(a) * position.z) + uHole;
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float px = 0.06 * aS.x * uScale / max(-mv.z, 0.5);
        vB = (0.8 + 0.2 * sin(uTime * (1.3 + aS.y * 0.05) + aS.y)) * (1.0 + 0.7 * uGust) * clamp(px / 1.5, 0.35, 1.0);
        gl_PointSize = clamp(px * 3.0, 2.5, 14.0);
      }`,
    fragmentShader: `varying float vB; void main() { vec2 c = gl_PointCoord - 0.5; float r2 = dot(c, c) * 4.0; float a = exp(-r2 * 9.0) * 2.2 + exp(-r2 * 2.5) * 0.15; gl_FragColor = vec4(vec3(0.86, 0.92, 1.0) * a * vB, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const nearStars = new THREE.Points(sgeo, nearMat); nearStars.name = 'pit-stars-near'; nearStars.frustumCulled = false; nearStars.renderOrder = -1;
  scene.add(nearStars);

  // ---- the motes (the outer wind made visible) and the flames: one Points draw. Motes: idle, a slow breath up out of
  // the Nadir (uPhase advances with the flow, backwards while the Pit draws breath, so they pour back down); a gust
  // (uGustT, seconds since it began), a plume up the throat and out over the lip; the first uKept stay in the air.
  const NM = low ? 110 : 180, flames = lampAt.length;
  const mpos = new Float32Array((NM + flames) * 3), mattr = new Float32Array((NM + flames) * 4);
  for (let i = 0; i < NM; i++) { mpos.set([C.x, yHole, C.z], i * 3); mattr.set([rng(), rng() * Math.PI * 2, 0.3 + rng() * 1.6, i], i * 4); }
  lampAt.forEach((L, j) => { mpos.set(L, (NM + j) * 3); mattr.set([rng(), 0, 0, -1 - j], (NM + j) * 4); });
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  mgeo.setAttribute('aM', new THREE.BufferAttribute(mattr, 4));
  const mmat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uPhase: { value: 0 }, uGustT: { value: -1 }, uKept: { value: 0 }, uScale: { value: 400 }, uHole: { value: new THREE.Vector3(C.x, yHole, C.z) }, uCol: { value: new THREE.Color(STARLIGHT) }, uLip: { value: lipY - yHole }, uIdle: { value: 1 } }]),
    vertexShader: `uniform float uTime, uPhase, uGustT, uKept, uScale, uLip, uIdle; uniform vec3 uHole; attribute vec4 aM; varying float vA; varying float vK; varying float vF;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position; float a = 0.0, sz = 0.05; vF = 0.0;
        if (aM.w < 0.0) {
          // a lamp's flame
          float fl = 0.85 + 0.1 * sin(uTime * 9.0 + aM.x * 20.0) + 0.05 * sin(uTime * 21.0 + aM.x * 7.0);
          a = fl * 1.5; sz = 0.12; vF = 1.0;
        } else if (aM.w < uKept) {
          // kept: hung in the Pit's air, turning slowly round it, a little up and down
          float an = aM.y + uTime * (0.03 + 0.03 * aM.x), r = 3.5 + aM.z * 4.0;
          transformed = uHole + vec3(sin(an) * r, 3.0 + aM.x * (uLip - 4.0) + sin(uTime * 0.3 + aM.y) * 0.8, -cos(an) * r);
          a = 0.85; sz = 0.07;
        } else {
          float life = fract(uPhase * (0.06 + 0.04 * aM.x) + aM.x * 7.13);
          float an = aM.y + life * 2.4, r = aM.z * (0.35 + life * 0.9);
          // the idle breath: up the whole throat, its last wisps just over the lip (seen from the road's end)
          transformed = uHole + vec3(sin(an) * r * (1.0 + life * 2.0), life * (uLip + 4.0) - 0.6, -cos(an) * r * (1.0 + life * 2.0));
          a = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.7, 1.0, life)) * 0.6 * uIdle;
          float tt = uGustT - aM.x * 3.2;
          if (uGustT >= 0.0 && tt > 0.0 && tt < 14.0) {
            // the plume: up the full 26 m in five or six seconds, then spilling out over the lip and drifting off
            float up = tt * (4.2 + aM.z * 1.6) + tt * tt * 0.12, over = max(0.0, up - uLip);
            float rr = 0.6 + aM.z * (0.8 + tt * 0.5) + over * (0.5 + aM.x * 0.6);
            float gan = aM.y + tt * 0.5;
            transformed = uHole + vec3(sin(gan) * rr, up - over * 0.5, -cos(gan) * rr);
            float ga = smoothstep(0.0, 0.25, tt) * (1.0 - smoothstep(9.0, 14.0, tt)) * 1.5;
            a = max(a * (1.0 - smoothstep(0.0, 0.3, tt)), ga); sz = 0.12 + 0.28 * smoothstep(1.0, 7.0, tt); // bigger as they rise: the plume reads from 40 m off
          }
        }
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        float d = -mvPosition.z, px = sz * uScale / max(d, 0.1);
        float core = max(px, 1.6), S = clamp(core * 3.0, 4.0, 48.0);
        vK = core / S; vA = a * (1.0 + 0.8 * clamp((3.0 - px) / 3.0, 0.0, 1.0)) * step(0.001, a);
        gl_PointSize = vA > 0.0 ? S : 0.0;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; varying float vK; varying float vF;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c), q = r2 / (vK * vK);
        float a = exp(-q * 1.6) * 1.6 + exp(-r2 * 5.0) * 0.18;
        vec3 base = mix(uCol, vec3(1.0, 0.66, 0.32), vF), core = mix(vec3(0.95, 0.97, 1.0), vec3(1.0, 0.9, 0.7), vF); // a lamp's flame is warm
        vec3 col = mix(base, core, exp(-q * 4.0)) * a * vA;
        gl_FragColor = vec4(col, 1.0);
      }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const motes = new THREE.Points(mgeo, mmat);
  motes.name = 'pit-motes'; motes.frustumCulled = false; motes.renderOrder = 20;
  scene.add(motes);
  // the breath of fog that comes up with the gust: soft pale puffs rising the throat and spilling over the lip (one Points)
  const NP = low ? 18 : 30, ppos = new Float32Array(NP * 3), pat = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) { ppos.set([C.x, yHole, C.z], i * 3); pat.set([rng(), rng() * Math.PI * 2, 2.5 + rng() * 3.5], i * 3); }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('aP', new THREE.BufferAttribute(pat, 3));
  const puffMat = new THREE.ShaderMaterial({
    uniforms: { uGustT: { value: -1 }, uScale: { value: 400 }, uHole: { value: new THREE.Vector3(C.x, yHole, C.z) }, uLip: { value: lipY - yHole } },
    vertexShader: `uniform float uGustT, uScale, uLip; uniform vec3 uHole; attribute vec3 aP; varying float vA;
      void main() {
        float tt = uGustT - aP.x * 2.5; vA = 0.0;
        vec3 p = uHole;
        if (uGustT >= 0.0 && tt > 0.0 && tt < 16.0) {
          float up = tt * (3.6 + aP.x * 1.2), over = max(0.0, up - uLip), rr = 0.5 + tt * 0.25 + over * 0.8;
          p += vec3(sin(aP.y + tt * 0.2) * rr, up - over * 0.6, -cos(aP.y + tt * 0.2) * rr);
          vA = smoothstep(0.0, 1.0, tt) * (1.0 - smoothstep(9.0, 16.0, tt)) * 0.16;
        }
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = vA > 0.0 ? clamp(aP.z * (1.0 + max(0.0, tt) * 0.12) * uScale / max(-mv.z, 1.0), 2.0, 256.0) : 0.0;
      }`,
    fragmentShader: `varying float vA; void main() { vec2 c = gl_PointCoord - 0.5; float r2 = dot(c, c) * 4.0; gl_FragColor = vec4(vec3(0.62, 0.68, 0.82) * exp(-r2 * 2.6) * vA, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const breath = new THREE.Points(pgeo, puffMat); breath.name = 'pit-breath'; breath.frustumCulled = false; breath.renderOrder = 19;
  scene.add(breath);

  // ---- the lights: the Nadir's, cold, up out of the hole; the lead's own; the lamps
  const SL = new THREE.Color(STARLIGHT), WARM = new THREE.Color(LAMP_WARM);
  const nadirLight = new THREE.PointLight(SL, 4, 13, 2); nadirLight.position.set(C.x, yHole + 0.4, C.z); nadirLight.name = 'pit-nadir-light'; scene.add(nadirLight);
  const leadLight = new THREE.PointLight(SL, 1.2, 6, 2); leadLight.name = 'pit-lead-light'; scene.add(leadLight);
  // (each light a little out from its post toward the open Pit, so the post beside it is not burnt white)
  const lamps = lampAt.map(([x, y, z], j) => { const L = new THREE.PointLight(WARM, j === BEACON ? 3.5 : 1.8, j === BEACON ? 14 : 9, 2); const k = 0.45 / Math.hypot(x - C.x, z - C.z); L.position.set(x - (x - C.x) * k, y + 0.05, z - (z - C.z) * k); L.name = 'pit-lamp'; scene.add(L); return L; });

  // ---- floors and colliders: the stair (held edges), the Nadir's ring, the sheers' feet, the reel
  ctx.addWalkable(stair.floor, { stack: true, keep: true, name: 'pit-stair' });
  let colliders = 0;
  if (ctx.addCollider) {
    let lx = Infinity, lz = Infinity;
    for (let b = 0; b < 360; b += 2) {
      const [dx, dz] = dirOf(b), r = nadirR(b) + NADIR.guard, x = C.x + dx * r, z = C.z + dz * r;
      if (Math.hypot(x - lx, z - lz) < 0.4) continue;
      ctx.addCollider({ x, z, r: 0.3, y: yC - 3, h: 4.2, stand: false }); colliders++; lx = x; lz = z;
    }
    for (const [x, y, z] of legFeet) { ctx.addCollider({ x, z, r: 0.35, y: y - 0.5, h: 4, stand: false }); colliders++; }
    ctx.addCollider({ x1: reelX - ax2 * 0.75, z1: reelZ - az2 * 0.75, x2: reelX + ax2 * 0.75, z2: reelZ + az2 * 0.75, r: 0.55, y: reelG - 0.2, h: 1.4, stand: false }); colliders++;
  }
  // the floor counts as partly below: the stone room's share, the moor's wind sheltered (the Pit's own is its own),
  // the eye eased part way to the dark-adapted grade; the stair's upper half and the lip are the moor's
  installBelow(ctx).add((x, y, z) => {
    const dx = x - C.x, dz = z - C.z; if (dx * dx + dz * dz > 400) return 0;
    const e = Math.hypot(dx, dz) - pitRim(bearingOf(x, z)); if (e > 0) return 0;
    return 0.6 * ss(lipY - 9, lipY - 17, y) * ss(0, -2, e);
  }, { size: 1 }); // a hall's room; at most 0.6 here, so the kit's seal (at 1) never shuts the Pit, which is open to the sky

  // ---- what the soundings leave: the lead white with rime for good after the first; frost on the sheers, from the
  // sheave down the legs, a fifth of their length more with each sounding (and the drum's line pale with it)
  const RIMEC = new THREE.Color('#d4deea'), LEADC = new THREE.Color('#4a5c78');
  const frostMat = hazed(new THREE.MeshStandardMaterial({ color: '#cfdbe8', roughness: 0.6, emissive: new THREE.Color(STARLIGHT), emissiveIntensity: 0.12 }));
  const frost = new THREE.Mesh(new THREE.BufferGeometry(), frostMat); frost.name = 'pit-frost'; frost.visible = false; scene.add(frost);
  function rime(n) {
    leadMat.color.copy(n > 0 ? RIMEC : LEADC);
    const f = Math.min(1, n * 0.2);
    frost.visible = f > 0; if (!f) return;
    const F = new UnderBuilder(lit);
    for (const [x, y, z] of legFeet) {
      const top = [apex[0] + (x - C.x) * 0.04, apex[1] + 0.35, apex[2] + (z - C.z) * 0.04];
      F.beam(top, [top[0] + (x - top[0]) * f, top[1] + (y - 0.3 - top[1]) * f, top[2] + (z - top[2]) * f], 0.145, RIME, 0.2);
    }
    F.box(apex[0], apex[1] + 0.28, apex[2], 0.3, 0.32, 0.3, 0.4, RIME, RIME, 0.2);
    frost.geometry.dispose(); frost.geometry = F.geometry();
  }

  // ---- into the sky under the world: whoever gets over the Nadir (a teleport, a carry, a fall from the lip) falls
  // through. The view goes to its stars and closes; they wake at the Bitter End on the icefall's shelf, by the
  // leadsmen's broken eye and the frayed end of their line: the line that sounds the world brought them up
  const veil = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (veil) { veil.id = 'pit-veil'; veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8;opacity:0;background:#000;'; document.body.appendChild(veil); }
  const fall = { t: -1, release: null, falls: 0, t0: 0, raf: 0, cancelled: 0 };
  const WAKE = { x: 44, z: -390 }; // the Bitter End (settings.js's stand: yaw 1.2, the broken eye)
  // the night round a falling eye: the far stars on a sphere about the camera, 8 m out, drawn over whatever is further
  // (the height fog's violet, the sky dome), so under the star disc the eye sees night; the near stars draw on it
  const night = new THREE.Mesh(new THREE.SphereGeometry(8, 24, 16), starsMat);
  night.material = starsMat.clone(); night.material.side = THREE.BackSide; night.material.uniforms = starsMat.uniforms;
  night.name = 'pit-night'; night.visible = false; night.renderOrder = 30; night.frustumCulled = false;
  scene.add(night);
  const end = () => { fall.t = -1; night.visible = false; if (veil) veil.style.opacity = '0'; cancelAnimationFrame(fall.raf); fall.raf = 0; };
  // the fall runs on its own frames once begun: the world's update for the Pit is throttled to 2 Hz far from it, and
  // the waking is 600 m away
  function step() {
    const p = ctx.player, t = fall.t = performance.now() / 1000 - fall.t0;
    if (fall.release) { night.position.copy(ctx.camera.position); night.visible = ctx.camera.position.y < yC - 1.0; }
    if (veil) veil.style.opacity = String(t < 2.2 ? ss(0.9, 2.2, t) : 1 - ss(3.4, 5.4, t));
    if (t >= 3.2 && fall.release) {
      const r = fall.release; fall.release = null; r(); night.visible = false;
      ctx.controls.placeAt(WAKE.x, WAKE.z); p.yaw = 1.2; p.pitch = 0.1; p.vel?.set(0, 0, 0);
    }
    if (t >= 5.4) { end(); return; }
    fall.raf = requestAnimationFrame(step);
  }
  function skyFall() {
    const p = ctx.player;
    if (fall.t >= 0 || p.carried || p.pos.y - p.eye > yC - 1.6) return;
    const dx = p.pos.x - C.x, dz = p.pos.z - C.z; if (dx * dx + dz * dz > 20) return;
    fall.t = 0; fall.t0 = performance.now() / 1000; fall.falls++; let vy = -2;
    // a teleport during the fall (the settings map) ends the carry: drop() cancels the waking
    let first = true; // (placed straight onto the floor far under the hole, the fall still starts at its mouth)
    fall.release = ctx.controls.carry({ step(pos, d) { if (first) { first = false; if (pos.y < yHole + 1) pos.y = yHole + 1; } vy -= 9.8 * d; pos.y = Math.max(yC - 80, pos.y + vy * d); }, drop() { if (fall.release) { fall.release = null; fall.cancelled++; end(); } }, look: () => ({ yaw: p.yaw, pitch: -1.3, rate: 3 }) });
    ctx.audio?.cue?.('act-pit-breath', holeAt, { dur: 6 });
    fall.raf = requestAnimationFrame(step);
  }

  // kept under the seal, so a visitor in the passage under the moor (D1's) sees the Pit's own things through its mouth:
  // everything of the Pit's own, the throat's rock, the road's slabs and the lip's clods; and the disc of sky is an opening
  const kept = [mesh, drum, pawl, lead, line, starDisc, nearStars, motes, breath, frost, scene.getObjectByName('pit-line-run'), scene.getObjectByName('paths-pit-throat'), scene.getObjectByName('paths-pit-slabs'), scene.getObjectByName('paths-pit-lip')];
  for (const o of kept) if (o) ctx.below.keep?.(o);
  ctx.below.opening?.({ x: C.x, y: lipY, z: C.z, r: 15 });

  // ---- the act: "Let go the lead", at the reel's pawl, from the passage's side
  const S = { t: -1, n: 0, phase: 0, flow: 1, gust: 0, sounding: false, sounds: 0, leadY: leadRestY, line: 0 };
  // offered at the crank's end of the drum, the pawl and ratchet there, to a visitor looking at the reel or past it at the Nadir
  const actAt = { x: reelX + ax2 * (drumL / 2 + 0.2) + rdx * 0.25, y: drumY + 0.15, z: reelZ + az2 * (drumL / 2 + 0.2) + rdz * 0.25 };
  const looks = (pl, x, z, cone) => { const dx = x - pl.pos.x, dz = z - pl.pos.z, l = hyp(dx, dz) || 1; return (-Math.sin(pl.yaw) * dx - Math.cos(pl.yaw) * dz) / l >= Math.cos(cone); };
  const cueAt = { x: reelX, y: drumY, z: reelZ }, holeAt = { x: C.x, y: yHole, z: C.z };
  const keep = (n) => { mmat.uniforms.uKept.value = Math.min(14, n * 2); };
  const handle = ctx.acts?.add({
    id: 'pit-lead', at: actAt, reach: 2.4, rise: 2.5, facing: (pl) => looks(pl, actAt.x, actAt.z, 0.8) || looks(pl, C.x, C.z, 0.6),
    words: 'Let go the lead', every: 'free',
    lure: { x: pawlBase.x, y: pawlBase.y + 0.05, z: pawlBase.z, face: null },
    // one clock: the act's own (performance.now, as acts.js's busy timer), so a hidden tab cannot leave the two apart
    do(n) { S.t0 = performance.now() / 1000; S.t = 0; S.n = n; S.sounding = true; S.sounds++; cuedOut = cuedTaut = cuedBreath = cuedHome = false; ctx.audio?.cue?.('act-pit-pawl', cueAt); return SOUNDING.done; },
    show(n) { keep(n); rime(n); },
  });
  if (!handle) { keep(0); rime(0); }

  // ---- per frame, near: the haze by the eye's depth, the stars' clock, the breath, the sounding
  const ds = new THREE.Vector2(), cam = ctx.camera.position;
  const drumAxis = new THREE.Vector3(1, 0, 0);
  let drumA = 0, pawlA = 0, cuedOut = false, cuedTaut = false, cuedBreath = false, cuedHome = false;
  const leadDepth = (t) => {
    // the drop: free at first, then the line's drag; 52 m down at the bitter end
    const u = t - SOUNDING.knock; if (u <= 0) return 0;
    const span = SOUNDING.out - SOUNDING.knock; if (u < span) { const f = u / span; return 52 * (0.55 * f * f + 0.45 * f); }
    // held at the end, then wound back up on the breath
    if (t < SOUNDING.breath + 1.2) return 52 + Math.sin((t - SOUNDING.out) * 18) * 0.3 * Math.exp(-(t - SOUNDING.out) * 3);
    const w = Math.min(1, (t - SOUNDING.breath - 1.2) / (SOUNDING.home - SOUNDING.breath - 1.2));
    return 52 * (1 - w * w * (3 - 2 * w));
  };
  function update(dt, t) {
    starsMat.uniforms.uTime.value = t; mmat.uniforms.uTime.value = t;
    ctx.renderer.getDrawingBufferSize(ds);
    mmat.uniforms.uScale.value = puffMat.uniforms.uScale.value = nearMat.uniforms.uScale.value = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    nearMat.uniforms.uTime.value = t; nearMat.uniforms.uGust.value = S.gust;
    skyFall();
    const near = (cam.x - C.x) ** 2 + (cam.z - C.z) ** 2 < 32 * 32;
    PIT_HAZE.value = near ? hazeAt(cam.y, lipY, yC) : 1;
    // the sounding
    let flowTo = 1, depth = 0;
    if (S.t >= 0) {
      S.t = performance.now() / 1000 - S.t0; const st = S.t;
      depth = leadDepth(st);
      // the pawl swung up and clear, then back down as the lead comes home
      pawlA = st < SOUNDING.home ? Math.min(1, st / SOUNDING.knock) : Math.max(0, 1 - (st - SOUNDING.home) / 0.4);
      // the breath: drawn in while the lead falls, out after the line's end
      if (st < SOUNDING.out) flowTo = -1.6;
      else if (st < SOUNDING.breath) flowTo = 0;
      else flowTo = 1;
      const gt = st - SOUNDING.breath;
      mmat.uniforms.uGustT.value = puffMat.uniforms.uGustT.value = gt >= 0 && gt < 16 ? gt : -1;
      S.gust = gt >= 0 ? ss(0, 0.8, gt) * (1 - ss(6, 12, gt)) : 0;
      if (!cuedOut && st >= SOUNDING.knock) { cuedOut = true; ctx.audio?.cue?.('act-pit-run', cueAt, { dur: SOUNDING.out - SOUNDING.knock }); }
      if (!cuedTaut && st >= SOUNDING.out) { cuedTaut = true; ctx.audio?.cue?.('act-pit-taut', { x: apex[0], y: apex[1], z: apex[2] }); }
      if (!cuedBreath && st >= SOUNDING.breath) { cuedBreath = true; ctx.audio?.cue?.('act-pit-breath', holeAt, { dur: 12 }); }
      if (!cuedHome && st >= SOUNDING.home - 0.6) { cuedHome = true; ctx.audio?.cue?.('act-pit-home', cueAt); }
      // the drum turns as the line runs: out, then back in
      const dd = depth - S.line; S.line = depth; drumA += dd / (drumR + 0.05);
      if (st >= SOUNDING.done) { S.t = -1; S.sounding = false; cuedOut = cuedTaut = cuedBreath = cuedHome = false; mmat.uniforms.uGustT.value = puffMat.uniforms.uGustT.value = -1; S.gust = 0; S.line = 0; keep(S.n); rime(S.n); }
    }
    S.flow += (flowTo - S.flow) * Math.min(1, dt * 1.5);
    S.phase += dt * S.flow;
    mmat.uniforms.uPhase.value = S.phase;
    mmat.uniforms.uIdle.value = 0.5 + 0.5 * Math.min(1, Math.abs(S.flow));
    starsMat.uniforms.uGust.value = S.gust; starsMat.uniforms.uDraw.value = Math.max(0, -S.flow) * 0.4;
    // the lead and its line; a little swing at rest in the breath
    const swing = 0.03 * Math.sin(t * 0.7) + (S.t >= 0 && S.t > SOUNDING.home - 1 ? 0.12 * Math.exp(-(S.t - SOUNDING.home + 1) * 0.8) * Math.sin(S.t * 2.3) : 0);
    S.leadY = leadRestY - depth;
    lead.position.set(C.x + Math.sin(swing) * 0.4, S.leadY, C.z + Math.cos(t * 0.5) * 0.02);
    lead.rotation.set(swing * 0.4, t * 0.05, 0);
    const eyeY = S.leadY + LEAD.len + 0.08, top = apex[1] - 0.28;
    line.scale.y = Math.max(0.01, top - eyeY);
    const twang = S.t >= SOUNDING.out ? 0.08 * Math.exp(-(S.t - SOUNDING.out) * 1.2) * Math.sin(S.t * 31) : 0;
    line.rotation.set(twang + swing * 0.06, 0, 0);
    leadMat.emissiveIntensity = (S.n > 0 && !(S.t >= 0 && S.t < SOUNDING.home) ? 0.45 : 0.18) + 1.2 * S.gust + (S.t > SOUNDING.home - 1 && S.t < SOUNDING.done ? 0.8 * (1 - ss(SOUNDING.home - 1, SOUNDING.done, S.t)) : 0);
    leadLight.position.set(C.x, S.leadY + 0.6, C.z); leadLight.intensity = depth > 4 ? 0 : 1.2 + 2 * S.gust;
    nadirLight.intensity = 4 * (0.85 + 0.15 * Math.sin(t * 0.4)) * (1 - 0.35 * Math.max(0, -S.flow) / 1.6) + 9 * S.gust;
    drum.quaternion.setFromAxisAngle(_up, Math.atan2(-az2, ax2)).multiply(_q.setFromAxisAngle(drumAxis, drumA));
    pawl.rotation.x = -0.9 * pawlA;
    for (let i = 0; i < lamps.length; i++) lamps[i].intensity = (i === BEACON ? 3.5 : 1.8) * (0.88 + 0.08 * Math.sin(t * 9 + i * 2) + 0.04 * Math.sin(t * 21 + i)) * (1 + 0.6 * S.gust);
  }
  const _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();
  ctx.registerUpdate(update, { pos: { x: C.x, y: (yC + lipY) / 2, z: C.z }, near: 70, hz: 2, r: 20 });

  // the way up, for heights-test: from the floor at the stair's foot, up the slabs, over the landing to the turf
  const foot = stair.point(1), [hx, hz] = dirOf(STAIR.head);
  const outX = C.x + hx * (stair.land.r1 + 2.2), outZ = C.z + hz * (stair.land.r1 + 2.2);
  const path = [];
  { const [fx, fz] = dirOf(stair.footB), rr = stair.at(1).r + 2.0; path.push([C.x + fx * rr, C.z + fz * rr, g(C.x + fx * rr, C.z + fz * rr)]); }
  for (let i = 10; i >= 0; i--) { const p = stair.point(i / 10); path.push([p[0], p[2], p[1]]); }
  path.push([C.x + hx * (stair.land.r1 - 0.4), C.z + hz * (stair.land.r1 - 0.4), stair.yHead], [outX, outZ, g(outX, outZ)]);
  ctx.ascents?.add({ id: 'pit-stair', held: true, offs: [0.25, 0.5, 0.8], path });

  const tris = geo.attributes.position.count / 3;
  ctx.pit = {
    off: false, stair, yC, yHole, lipY, apex, reel: { x: reelX, z: reelZ, y: drumY }, act: actAt, state: S, treads, cut,
    floor: stair.floor, bowl: FL.y, haze: PIT_HAZE, sky: fall,
    stats: () => ({ calls: 14, tris: Math.round(tris + dgeo.attributes.position.count / 3), treads, colliders, cut, lights: 2 + lamps.length, motes: NM }),
  };
  ctx.log?.(`pit: floor at ${yC.toFixed(1)} (lip ~${lipY.toFixed(1)}), ${treads} slabs up ${(stair.yHead - stair.yFoot).toFixed(1)} m over ${stair.len.toFixed(0)} m, ${Math.round(tris)} tris, ${cut} terrain tris cut, ${(performance.now() - t0).toFixed(0)} ms`);
}
