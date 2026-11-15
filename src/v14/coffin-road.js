// The Coffin Road (v14-D0): the first place in the walk where a visitor goes below the ground. On the Foundered Nave's
// south-east rim the Sexton's shears stand over the hole, two black timbers lashed at the head, a corpse-candle lantern
// hung from it, a coffin waiting on trestles beside them; from the shears' head a fan of chains holds a long timber
// stair that goes down through the hole's light, 17 m, to the black water. On the water forty coffins lie lashed two
// by two, head to foot, a candle on every pair: a raft at the stair's foot, a pair to a door in the south wall (the
// passage on toward the Pit, fallen in a few metres along), and sixteen pairs east along the nave under the roof to the
// hall's east wall, where the sun is set in tesserae with most of its gold gone. The story: stories/the-coffin-road.md.
// The plan (where everything is): v14/coffin-road/plan.js. Dark, sealed and stone-sounding by the kit: v14/under.js
// (the hall's own darkness, glow and below-volume are v5/nave.js's).
// Draws: the road (stair, shears, coffins, candles' irons, door, passage, the sun: one mesh), the flames (one Points).
// Lights: a PointLight between each two candles and one in the lantern (lights.js keeps the nearest three).
// ?coffinroad=0 leaves it out (the Nave then is as it was, with the gap in its rim's colliders closed by nothing: a
// test switch only).
import * as THREE from 'three';
import { NAVE } from '../v5/nave/ground.js';
import { glowAt, naveBuilt } from '../v5/nave.js';
import { UnderBuilder, underMaterial, installBelow, boxBelow } from './under.js';
import { ROAD_Y, SZ, SHALF, FOOT_X, RAFT, NSPUR, SSPUR, ROAD, PAIRS, DOOR, stairHead, candles, FLAME_Y, makeFloor } from './coffin-road/plan.js';

const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('coffinroad') === '0';
const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const TIMBER = C('#2b211a'), TIMBER_L = C('#3d3026'), LID = C('#352920'), LEAD = C('#3f4341'), ROPE = C('#6d5f48');
const IRON = C('#26221f'), WAX = C('#6f6a58'), STONE = C('#6e655c'), STONE_D = C('#4c453f'), RUBBLE = C('#5d554c');
const MORTAR = C('#4a3a26'), GOLD = C('#c8962e'), GOLD_D = C('#8a6420'), RED = C('#6a2a1c'), BLACK = C('#050505');
const FLAME = '#9fe8c2'; // corpse-candle green (the palette's wisp)

export async function build(ctx) {
  await Promise.race([naveBuilt, new Promise((r) => setTimeout(r, 30000))]); // (the Nave left out by ?only= or ?skip=: give up)
  if (OFF || !ctx.nave || ctx.nave.off) { ctx.coffinRoad = { off: true }; return; }
  const t0 = performance.now();
  const { scene, terrain: T } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(14001);
  await ctx.progress?.('the coffin road', 0);
  const head = stairHead(T), floor = makeFloor(head);
  const { xRim, xHead, xLand, yHead } = head, k = (yHead - ROAD_Y) / (xHead - FOOT_X);
  const stairY = (x) => ROAD_Y + (x - FOOT_X) * k;
  const litAt = ctx.nave.litAt;
  const lit = (x, y, z, out) => { litAt(x, y, z, out); out[2] = glowAt(x, y, z); return out; };
  const B = new UnderBuilder(lit);
  const g = (x, z) => T.heightAt(x, z);
  const WY = NAVE.water;

  // ---- the landing: planks on two bearers, a step over the turf, out over the lip to the flight's head; its posts
  {
    for (const s of [-1, 1]) {
      const z = SZ + s * (SHALF - 0.05);
      B.beam([xHead - 0.2, yHead - 0.12, z], [xLand + 0.15, yHead - 0.12, z], 0.09, TIMBER, 0.12);
      for (const px of [xRim + 0.35, xLand - 0.1]) B.beam([px, g(px, z) - 0.3, z], [px, yHead - 0.05, z], 0.08, TIMBER, 0.12);
    }
    const n = Math.round((xLand - xHead) / 0.3);
    for (let i = 0; i < n; i++) { const x = xHead + (i + 0.5) * (xLand - xHead) / n; B.box(x, yHead - 0.025, SZ, (xLand - xHead) / n / 2 - 0.015, 0.025, SHALF + 0.04 * (rng() - 0.5), (rng() - 0.5) * 0.04, TIMBER_L, TIMBER_L, 0.3); }
  }
  // ---- the stair: two stringers along its sides, a tread every rise, a hand-rope on stanchions both sides
  {
    const xTop = xHead + 0.15, run = xTop - FOOT_X;
    for (const s of [-1, 1]) {
      const z = SZ + s * (SHALF + 0.06);
      B.beam([FOOT_X - 0.15, ROAD_Y - 0.25, z], [xTop, stairY(xTop) - 0.25, z], 0.11, TIMBER, 0.12);
    }
    const n = Math.round((yHead - ROAD_Y) / 0.21), rise = (yHead - ROAD_Y) / n, tr = rise / k;
    for (let i = 1; i <= n; i++) {
      const x = FOOT_X + i * tr - tr / 2, y = ROAD_Y + i * rise;
      // worn: the middle of each tread a little lower and paler (drawn as two boards)
      B.box(x, y - 0.035, SZ, tr / 2 + 0.03, 0.035, SHALF - 0.02, 0, TIMBER, TIMBER_L, 0.25);
    }
    // the stanchions and the rope, every 2.6 m, both sides
    const posts = Math.ceil(run / 2.6);
    for (const s of [-1, 1]) {
      const z = SZ + s * (SHALF + 0.06);
      let prev = null;
      for (let i = 0; i <= posts; i++) {
        const x = FOOT_X + 0.3 + (i / posts) * (run - 0.6), y = stairY(x);
        B.beam([x, y - 0.3, z], [x, y + 0.95, z], 0.035, IRON, 0.05);
        const top = [x, y + 0.92, z];
        if (prev) { const mid = [(prev[0] + x) / 2, (prev[1] + top[1]) / 2 - 0.12, z]; B.beam(prev, mid, 0.018, ROPE, 0.05); B.beam(mid, top, 0.018, ROPE, 0.05); }
        prev = top;
      }
    }
  }
  // ---- the shears: two legs from the turf east of the rim, lashed at the head over the stair; the lantern; the chains
  const apex = [xRim - 1.4, g(xRim + 3, SZ) + 9.5, SZ];
  const feet = [[xRim + 3.4, SZ - 2.7], [xRim + 3.4, SZ + 2.7]];
  {
    for (const [fx, fz] of feet) {
      B.beam([fx, g(fx, fz) - 0.3, fz], [apex[0] + 0.15, apex[1] + 0.5, SZ + Math.sign(fz - SZ) * 0.18], 0.16, TIMBER, 0.15);
      B.box(fx, g(fx, fz) + 0.05, fz, 0.45, 0.12, 0.45, 0.3, STONE_D, STONE_D, 0.2); // its padstone
    }
    // the lashing at the head, the cross-tie, the block
    B.box(apex[0] + 0.15, apex[1] + 0.35, SZ, 0.3, 0.32, 0.36, 0, ROPE, ROPE, 0.2);
    const tieY = g(xRim + 2, SZ) + 3.6, tx = xRim + 2.25;
    B.beam([tx, tieY, SZ - 1.75], [tx, tieY, SZ + 1.75], 0.08, TIMBER, 0.1);
    B.box(apex[0], apex[1] - 0.35, SZ, 0.14, 0.22, 0.1, 0, IRON);
    // the guys: back east to stakes in the turf
    for (const s of [-1, 1]) {
      const sx = xRim + 13, sz = SZ + s * 5.5, sy = g(sx, sz);
      B.beam([apex[0] + 0.3, apex[1] + 0.3, SZ], [sx, sy + 0.4, sz], 0.022, ROPE, 0.05);
      B.beam([sx, sy - 0.2, sz], [sx - 0.15, sy + 0.55, sz], 0.05, TIMBER, 0.1);
    }
    // the chains: from the block, a fan to the stringers, three a side
    for (const s of [-1, 1]) for (const f of [0.82, 0.55, 0.27]) {
      const x = FOOT_X + f * (xHead - FOOT_X), y = stairY(x) - 0.2, z = SZ + s * (SHALF + 0.06);
      B.beam([apex[0], apex[1] - 0.55, SZ + s * 0.08], [x, y, z], 0.028, IRON, 0.05);
    }
    // the lantern: a chain down from the head, an iron cage, its candle (the flame is in the flames' draw)
    B.beam([apex[0], apex[1] - 0.55, SZ], [apex[0], apex[1] - 1.9, SZ], 0.015, IRON, 0.05);
    const ly = apex[1] - 2.25;
    for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.beam([apex[0] + cx * 0.15, ly - 0.3, SZ + cz * 0.15], [apex[0] + cx * 0.12, ly + 0.32, SZ + cz * 0.12], 0.014, IRON, 0.04);
    B.box(apex[0], ly - 0.33, SZ, 0.19, 0.03, 0.19, 0, IRON);
    B.prism([[apex[0] - 0.2, SZ - 0.2], [apex[0] + 0.2, SZ - 0.2], [apex[0] + 0.2, SZ + 0.2], [apex[0] - 0.2, SZ + 0.2]], ly + 0.32, ly + 0.36, IRON);
    B.prism([[apex[0], SZ - 0.18], [apex[0] + 0.18, SZ], [apex[0], SZ + 0.18], [apex[0] - 0.18, SZ]], ly + 0.36, ly + 0.55, IRON);
  }
  // ---- a coffin, the forty-first, on two trestles on the turf north of the shears, waiting
  const coffinRing = (cx, cz, yaw, sc = 1) => {
    // a six-sided coffin: narrow at the head, widest at the shoulder, narrowest at the foot (u along, w across)
    const L = 2.15 * sc, pts = [[0, -0.27], [0.5, -0.37], [L, -0.21], [L, 0.21], [0.5, 0.37], [0, 0.27]].map(([u, w]) => [u - L / 2, w * sc]);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return pts.map(([u, w]) => [cx + u * c - w * s, cz + u * s + w * c]);
  };
  const coffin = (cx, cz, yaw, top, sc = 1) => {
    const body = coffinRing(cx, cz, yaw, sc), lid = coffinRing(cx, cz, yaw, sc * 1.04);
    B.prism(body, top - 0.58, top - 0.05, TIMBER, TIMBER, 0.15);
    B.prism(lid, top - 0.05, top - 0.012, LID, LID, 0.18);
    // the lid's raised panel, its edge a coffin's shape inside the coffin's: what reads from the stair
    B.prism(coffinRing(cx, cz, yaw, sc * 0.8), top - 0.02, top, TIMBER_L, LID, 0.12);
    // the lead plate on the lid, toward the head
    const c = Math.cos(yaw), s = Math.sin(yaw), px = cx - c * 0.45 * sc, pz = cz - s * 0.45 * sc;
    B.box(px, top + 0.006, pz, 0.16, 0.008, 0.11, -yaw, LEAD, LEAD, 0.1);
  };
  const wait = { x: xRim + 4.2, z: SZ - 5.2 };
  {
    const gy = g(wait.x, wait.z) + 0.78;
    for (const s of [-0.65, 0.65]) {
      const tx = wait.x + s;
      for (const w of [-0.3, 0.3]) for (const d of [-1, 1]) B.beam([tx + d * 0.12, g(tx, wait.z + w) - 0.1, wait.z + w], [tx, gy - 0.16, wait.z + w * 0.7], 0.035, TIMBER, 0.1);
      B.box(tx, gy - 0.13, wait.z, 0.06, 0.04, 0.42, 0, TIMBER_L);
    }
    coffin(wait.x, wait.z, 0, gy + 0.48);
  }
  await ctx.progress?.('the coffin road', 0.3);

  // ---- the forty: the raft's four, the spurs' two pairs, the road's sixteen pairs; boards between, lashings across
  const top = ROAD_Y;
  let laid = 0;
  const lay = (x, z, yaw, sc = 1) => { coffin(x, z, yaw, top, sc); laid++; };
  const lash = (a, b) => B.beam([a[0], top + 0.012, a[1]], [b[0], top + 0.012, b[1]], 0.02, ROPE, 0.08);
  const boards = (x0, x1, z0, z1, along) => {
    // planks across a gap, laid crosswise to the way
    const n = Math.max(1, Math.round((along === 'x' ? x1 - x0 : z1 - z0) / 0.28));
    for (let i = 0; i < n; i++) {
      if (along === 'x') { const xa = x0 + (i / n) * (x1 - x0), xb = x0 + ((i + 1) / n) * (x1 - x0); B.box((xa + xb) / 2, top - 0.035, (z0 + z1) / 2, (xb - xa) / 2 - 0.012, 0.03, (z1 - z0) / 2 + rng() * 0.06, (rng() - 0.5) * 0.03, TIMBER_L, TIMBER_L, 0.3); }
      else { const za = z0 + (i / n) * (z1 - z0), zb = z0 + ((i + 1) / n) * (z1 - z0); B.box((x0 + x1) / 2, top - 0.035, (za + zb) / 2, (x1 - x0) / 2 + rng() * 0.06, 0.03, (zb - za) / 2 - 0.012, (rng() - 0.5) * 0.03, TIMBER_L, TIMBER_L, 0.3); }
    }
  };
  // the raft: four abreast, lying north-south, at the stair's foot
  for (let i = 0; i < 4; i++) lay(RAFT.x0 + 0.42 + i * 0.85, (RAFT.z0 + RAFT.z1) / 2, Math.PI / 2 + (i % 2 ? Math.PI : 0));
  lash([RAFT.x0 + 0.1, RAFT.z0 + 0.5], [RAFT.x1 - 0.1, RAFT.z0 + 0.5]); lash([RAFT.x0 + 0.1, RAFT.z1 - 0.5], [RAFT.x1 - 0.1, RAFT.z1 - 0.5]);
  // the spurs: a pair each, north-south, boards to the road and to the door's sill
  const spurX = [(NSPUR.x0 + NSPUR.x1) / 2 - 0.4, (NSPUR.x0 + NSPUR.x1) / 2 + 0.4];
  const nz = (NSPUR.z1 + ROAD.z1) / 2, sz = SSPUR.z0 + 1.2;
  for (const x of spurX) { lay(x, nz, Math.PI / 2); lay(x, sz, -Math.PI / 2); }
  boards(NSPUR.x0, NSPUR.x1, ROAD.z1, nz - 1.08, 'z'); boards(NSPUR.x0, NSPUR.x1, nz + 1.08, RAFT.z0, 'z');
  boards(SSPUR.x0, SSPUR.x1, sz + 1.08, DOOR.z, 'z');
  // the landing where the north spur meets the road: boards
  boards(ROAD.x0, FOOT_X, ROAD.z0, ROAD.z1, 'x');
  // the road
  const pitch = (ROAD.x1 - FOOT_X) / PAIRS;
  for (let i = 0; i < PAIRS; i++) {
    const x0 = FOOT_X + i * pitch, cx = x0 + 1.1, flip = i % 2 ? Math.PI : 0;
    lay(cx, ROAD.zc - 0.4, flip); lay(cx, ROAD.zc + 0.4, flip + Math.PI);
    lash([cx - 0.45, ROAD.z0 + 0.05], [cx - 0.45, ROAD.z1 - 0.05]); lash([cx + 0.55, ROAD.z0 + 0.05], [cx + 0.55, ROAD.z1 - 0.05]);
    boards(x0 + 2.2, x0 + pitch, ROAD.z0 + 0.1, ROAD.z1 - 0.1, 'x');
  }
  boards(FOOT_X, FOOT_X + 0.02, ROAD.z0, ROAD.z1, 'x');
  // the candles' irons and wax: a pricket on a pair's corner, a tall candle on a three-legged stand
  const CANDLES = candles();
  for (const [x, z, kind] of CANDLES) {
    if (kind === 0) {
      B.beam([x, top, z], [x, top + 0.12, z], 0.012, IRON, 0.05);
      B.box(x, top + 0.13, z, 0.07, 0.008, 0.07, rng() * 3, IRON);
      B.prism([[x - 0.035, z - 0.035], [x + 0.035, z - 0.035], [x + 0.035, z + 0.035], [x - 0.035, z + 0.035]], top + 0.14, top + FLAME_Y[0] - 0.05, WAX, WAX, 0.15);
    } else {
      const fy = top + FLAME_Y[kind], big = kind === 2, cw = big ? 0.08 : 0.045, ch = big ? 0.55 : 0.37;
      for (let l = 0; l < 3; l++) { const a = l * 2.09 + 0.4; B.beam([x + Math.cos(a) * (big ? 0.34 : 0.22), top, z + Math.sin(a) * (big ? 0.34 : 0.22)], [x, top + (big ? 0.5 : 0.35), z], big ? 0.022 : 0.014, IRON, 0.05); }
      B.beam([x, top + 0.3, z], [x, fy - ch - 0.05, z], big ? 0.026 : 0.016, IRON, 0.05);
      if (big) B.prism([[x - 0.16, z - 0.16], [x + 0.16, z - 0.16], [x + 0.16, z + 0.16], [x - 0.16, z + 0.16]], fy - ch - 0.08, fy - ch - 0.03, IRON); // its drip-pan
      B.prism([[x - cw, z - cw], [x + cw, z - cw], [x + cw, z + cw], [x - cw, z + cw]], fy - ch - 0.05, fy - 0.05, WAX, WAX, 0.15);
    }
  }
  await ctx.progress?.('the coffin road', 0.55);

  // ---- the door in the south wall and the passage behind it, fallen in
  {
    const x0 = DOOR.x - DOOR.half, x1 = DOOR.x + DOOR.half, y0 = DOOR.sill, y1 = DOOR.sill + DOOR.h, z = DOOR.z;
    // the frame: jambs and a lintel standing proud of the wall, and the sill
    for (const s of [-1, 1]) B.box(DOOR.x + s * (DOOR.half + 0.22), (y0 + y1) / 2 - 0.1, z - 0.12, 0.22, (y1 - y0) / 2 + 0.25, 0.2, 0, STONE, STONE, 0.12);
    B.box(DOOR.x, y1 + 0.32, z - 0.14, DOOR.half + 0.55, 0.32, 0.22, 0, STONE, STONE, 0.12);
    B.box(DOOR.x, y0 - 0.12, z + 0.1, DOOR.half + 0.1, 0.12, 0.35, 0, STONE_D, STONE_D, 0.1);
    // the passage: an inside-out box (floor, walls, vault) to the fall; seals it from the moor overhead
    const zf = DOOR.fall + 0.1, ze = z + DOOR.depth + 2.5, yf = DOOR.sill - DOOR.rise * DOOR.treads;
    for (const [xa, xb, nx] of [[x0, x0, 1], [x1, x1, -1]]) B.quad([xa, yf - 0.6, z], [xa, yf - 0.6, ze], [xa, y1, ze], [xa, y1, z], STONE_D, [nx, 0, 0], 0.15);
    B.quad([x0, y1, z], [x1, y1, z], [x1, y1, ze], [x0, y1, ze], STONE_D, [0, -1, 0], 0.15);
    B.quad([x0, y0, z], [x1, y0, z], [x1, y0, DOOR.floorTo], [x0, y0, DOOR.floorTo], STONE, [0, 1, 0], 0.15);
    for (let i = 1; i <= DOOR.treads; i++) {
      const za = DOOR.floorTo + (i - 1) * DOOR.tread, zb = za + DOOR.tread, yt = DOOR.sill - i * DOOR.rise;
      B.quad([x0, yt + DOOR.rise, za], [x1, yt + DOOR.rise, za], [x1, yt, za], [x0, yt, za], STONE_D, [0, 0, -1], 0.12);
      B.quad([x0, yt, za], [x1, yt, za], [x1, yt, zb], [x0, yt, zb], STONE, [0, 1, 0], 0.15);
    }
    B.quad([x0, yf, DOOR.floorTo + DOOR.treads * DOOR.tread], [x1, yf, DOOR.floorTo + DOOR.treads * DOOR.tread], [x1, yf, ze], [x0, yf, ze], STONE, [0, 1, 0], 0.15);
    B.quad([x0, yf - 0.6, ze], [x1, yf - 0.6, ze], [x1, y1, ze], [x0, y1, ze], BLACK, [0, 0, -1], 0);
    // the fall: the vault's blocks and the fill above them, from the floor to the vault, a black gap under the vault
    for (let i = 0; i < (low ? 16 : 26); i++) {
      const bx = x0 + 0.2 + rng() * (x1 - x0 - 0.4), bz = zf + rng() * 1.6, s = 0.25 + rng() * 0.4;
      const by = yf + (rng() * rng()) * (y1 - yf - 0.7) + s * 0.4;
      B.box(bx, by, bz, s * (1 + rng() * 0.5), s * (0.6 + rng() * 0.4), s, rng() * 3, rng() < 0.35 ? STONE_D : RUBBLE, RUBBLE, 0.15);
    }
    B.prism([[x0, zf + 0.3], [x1, zf + 0.3], [x1, ze], [x0, ze]], yf - 0.6, y1 - 0.75, RUBBLE, RUBBLE, 0.2);
  }
  // ---- the sun on the east wall: a setting-bed in red and ochre, rays round it; a few of its gold tesserae left
  {
    const x = NAVE.x1 - 0.04, cy = NAVE.ceil - 6.2, cz = NAVE.z, R = 2.6, RR = 4.4, N = 24;
    const P = (r, a) => [x, cy + Math.sin(a) * r, cz + Math.cos(a) * r];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      B.tri([x, cy, cz], P(R, a0), P(R, a1), MORTAR, [-1, 0, 0], 0.25);
      // a ray between every two
      if (i % 2 === 0) B.tri(P(R + 0.05, a0 + 0.02), P(R + 0.05, a1 + 0.13), P(RR * (0.9 + 0.1 * (i % 4 ? 1 : 0.8)), (a0 + a1) / 2 + 0.06), RED, [-1, 0, 0], 0.25);
    }
    // the gold that is left: tesserae in the rays' tips and a patch at the rim, catching the candles
    const nT = low ? 90 : 160;
    for (let i = 0; i < nT; i++) {
      const a = rng() * Math.PI * 2, r = rng() < 0.6 ? R * Math.sqrt(rng()) : R + rng() * (RR - R) * 0.8;
      if (r < R && rng() < 0.55) continue; // picked out
      const [px, py, pz] = P(r, a), s = 0.045 + rng() * 0.02;
      const off = -0.012;
      B.quad([px + off, py - s, pz - s], [px + off, py - s, pz + s], [px + off, py + s, pz + s], [px + off, py + s, pz - s], rng() < 0.7 ? GOLD : GOLD_D, [-1, 0.2 * (rng() - 0.5), 0.2 * (rng() - 0.5)], 0.3);
    }
  }
  await ctx.progress?.('the coffin road', 0.75);

  const geo = B.geometry();
  const mat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.05 }), 'coffin-road', FLAME);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'coffin-road'; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  // ---- the flames: one Points draw, every candle and the lantern; a corpse-candle's cold green, a white heart
  const lanternAt = [apex[0], apex[1] - 2.25 + 0.05, SZ];
  const F = [...CANDLES.map(([x, z, kd]) => [x, top + FLAME_Y[kd], z, [0.1, 0.13, 0.19][kd], 0]), [...lanternAt, 0.2, 1]];
  const fpos = new Float32Array(F.length * 3), fattr = new Float32Array(F.length * 3);
  const la = [0, 0, 0];
  F.forEach(([x, y, z, s, far], i) => { fpos.set([x, y, z], i * 3); litAt(x, y, z, la); fattr.set([s, i * 7.31, far ? 1 : la[1]], i * 3); });
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute('aF', new THREE.BufferAttribute(fattr, 3));
  const fmat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uCol: { value: new THREE.Color(FLAME) }, uDim: { value: 1 } }]),
    vertexShader: `uniform float uTime, uScale; attribute vec3 aF; varying float vI; varying float vK; varying float vAir;
      #include <fog_pars_vertex>
      void main() {
        float ph = aF.y, fl = 0.82 + 0.1 * sin(uTime * 11.0 + ph) + 0.08 * sin(uTime * 23.0 + ph * 2.3);
        vec3 transformed = position + vec3(0.0, 0.015 * sin(uTime * 7.0 + ph), 0.0);
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        float d = -mvPosition.z, px = aF.x * fl * uScale / max(d, 0.1);
        float core = max(px, 2.2), S = clamp(core * 3.5, 7.0, 64.0);
        vK = core / S; vI = fl * (1.0 + 1.2 * clamp((4.0 - px) / 4.0, 0.0, 1.0)); vAir = aF.z;
        gl_PointSize = S;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uDim; varying float vI; varying float vK; varying float vAir;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0; c.y *= 0.8; float r2 = dot(c, c), q = r2 / (vK * vK);
        float a = exp(-q * 1.6) * 2.0 + exp(-r2 * 6.0) * 0.22;
        vec3 col = mix(uCol, vec3(0.92, 1.0, 0.95), exp(-q * 4.0)) * a * vI * uDim;
        gl_FragColor = vec4(col, 1.0);
        vec3 pre = gl_FragColor.rgb;
        #include <fog_fragment>
        gl_FragColor.rgb = mix(pre, gl_FragColor.rgb, vAir);
      }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const flames = new THREE.Points(fgeo, fmat);
  flames.name = 'coffin-road-flames'; flames.frustumCulled = false; flames.renderOrder = 20;
  scene.add(flames);

  // ---- the lights: one between each two candles along the way, one in the lantern
  const lights = [];
  const addLight = (x, y, z, i, d) => { const L = new THREE.PointLight(new THREE.Color(FLAME), i, d, 2); L.position.set(x, y, z); L.name = 'coffin-road-light'; scene.add(L); lights.push({ L, i, ph: rng() * 6 }); };
  const order = CANDLES.map(([x, z, kd]) => [x, top + FLAME_Y[kd] + 0.15, z]);
  for (let i = 0; i < PAIRS; i += 2) { const a = order[i], b = order[Math.min(PAIRS - 1, i + 1)]; addLight((a[0] + b[0]) / 2, a[1] + 0.3, (a[2] + b[2]) / 2 + 0.0, 3.2, 9); }
  for (let i = PAIRS; i < order.length; i += 2) { const a = order[i], b = order[i + 1], big = CANDLES[i][2] === 2; addLight((a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2, big ? 7 : 3.6, big ? 13 : 9); }
  addLight(lanternAt[0], lanternAt[1], lanternAt[2], 6, 16);

  // ---- the floor: the stair, the raft, the spurs, the road and the passage, one stacked floor with held edges; the
  // water under it holds whoever falls in until the road takes them back (below)
  ctx.addWalkable(floor, { stack: true, keep: true, name: 'coffin-road' });
  const HALF = NAVE.walls + 0.5, CATCH = WY - 1.25;
  const inHall = (x, z) => x > NAVE.x0 + 9 && x < NAVE.x1 - 0.5 && Math.abs(z - NAVE.z) < HALF - 0.4;
  const water = { fn: (x, z) => (inHall(x, z) ? CATCH : null) };
  ctx.addWalkable(water.fn, { stack: true, keep: true, name: 'nave-water' });
  // colliders: the stair's sides where it is still within a step of the turf, the shears' feet, the waiting coffin
  let colliders = 0;
  if (ctx.addCollider) {
    for (const s of [-1, 1]) for (let x = xRim - 4.5; x <= xRim + 0.5; x += 0.4) { ctx.addCollider({ x, z: SZ + s * (SHALF + 0.32), r: 0.28, y: g(x, SZ) - 1.2, h: 3.2, stand: false }); colliders++; }
    for (const [fx, fz] of feet) { ctx.addCollider({ x: fx, z: fz, r: 0.5, y: g(fx, fz) - 0.5, h: 3 }); colliders++; }
    ctx.addCollider({ x1: wait.x - 0.95, z1: wait.z, x2: wait.x + 0.95, z2: wait.z, r: 0.45, y: g(wait.x, wait.z) - 0.2, h: 1.5, stand: false }); colliders++;
  }
  // under the ground: the passage (the hall and the hole's shaft are the Nave's)
  installBelow(ctx).add(boxBelow(DOOR.x - DOOR.half - 0.6, DOOR.x + DOOR.half + 0.6, DOOR.z - 0.2, DOOR.z + DOOR.depth + 3, -4, 1, 0.6));

  // the way down, for heights-test: from the turf east of the shears, down the stair, the raft, the north spur, the
  // road to its end under the sun
  const mid = (xHead + FOOT_X) / 2;
  ctx.ascents?.add({ id: 'coffin-road', held: true, offs: [0.2, 0.35, 0.7, 0.95],
    path: [[xLand + 3, SZ, g(xLand + 3, SZ)], [xLand - 0.5, SZ, yHead], [xHead - 0.3, SZ], [mid, SZ, stairY(mid)], [FOOT_X - 0.6, SZ, ROAD_Y], [246.7, 45.5, ROAD_Y], [246.7, 42, ROAD_Y], [270, 42, ROAD_Y], [ROAD.x1 - 0.6, 42, ROAD_Y]] });

  // ---- per frame, near: the flames' clock and size, the lights' flicker with the sun's gutter, the water giving back
  const ds = new THREE.Vector2(), p = ctx.player;
  const fd = new Float32Array(F.length), fi = F.map((_, i) => i), wf = ctx.nave.waterFlames, byNear = (a, b) => fd[a] - fd[b];
  let wet = 0, rescues = 0;
  const S = { get rescues() { return rescues; } };
  function update(dt, t) {
    fmat.uniforms.uTime.value = t;
    ctx.renderer.getDrawingBufferSize(ds);
    fmat.uniforms.uScale.value = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    for (const l of lights) l.L.intensity = l.i * (0.85 + 0.1 * Math.sin(t * 9 + l.ph) + 0.05 * Math.sin(t * 21 + l.ph * 2));
    // the eight flames nearest the eye, for the water to double
    const cam = ctx.camera.position;
    for (let i = 0; i < F.length; i++) fd[i] = (F[i][0] - cam.x) ** 2 + (F[i][1] - cam.y) ** 2 + (F[i][2] - cam.z) ** 2;
    fi.sort(byNear);
    if (wf) for (let j = 0; j < wf.length; j++) { const f = F[fi[j]]; wf[j].set(f[0], f[1], f[2], f[4] ? 0.5 : 1); }
    // fallen in: after a moment in the water the walker is put back on the nearest of the road
    if (p.onStack && p.onStack.name === 'nave-water') {
      wet += dt;
      if (wet > 0.9) {
        wet = 0; rescues++;
        const x = Math.min(ROAD.x1 - 0.5, Math.max(ROAD.x0 + 0.5, p.pos.x));
        let bx = x, bz = ROAD.zc;
        if (Math.abs(p.pos.z - SZ) < Math.abs(p.pos.z - ROAD.zc) && p.pos.x > FOOT_X && p.pos.x < xHead) { bx = Math.min(FOOT_X - 0.6, bx); bz = SZ; }
        ctx.controls.placeAt(bx, bz, ROAD_Y + 0.05);
        ctx.audio?.cue?.('tarn-step', { x: bx, y: ROAD_Y, z: bz });
      }
    } else wet = 0;
  }
  ctx.registerUpdate(update, { pos: { x: 266, z: 44 }, near: 110, hz: 2, r: 40 });

  const tris = geo.attributes.position.count / 3;
  ctx.coffinRoad = {
    head, floor, stairY, laid, candles: CANDLES, lights: lights.map((l) => l.L), mesh, flames, state: S,
    stats: () => ({ calls: 2, tris: Math.round(tris + F.length * 0), coffins: laid, candles: CANDLES.length, lights: lights.length, colliders }),
  };
  ctx.log?.(`coffin road: ${laid} coffins, ${CANDLES.length} candles, ${lights.length} lights, ${Math.round(tris)} tris, stair ${(yHead - ROAD_Y).toFixed(1)} m down over ${(xHead - FOOT_X).toFixed(1)} m, ${(performance.now() - t0).toFixed(0)} ms`);
}
