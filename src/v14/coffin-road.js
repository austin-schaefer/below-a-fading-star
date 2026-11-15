// The Noon Road (v14-D0, D3; the file, ctx.coffinRoad and the module's key keep the name the way down was first built
// under): the first place in the walk where a visitor goes below the ground. On the Foundered Nave's south-east rim
// the Late folk's shears stand over the hole, two black timbers lashed at the head, a flask of stored daylight in a
// cage hung from it, a glass bulb of the same in a rope cradle on trestles beside them; from the shears' head a fan
// of chains holds a long timber stair that goes down through the hole's light, 16 m, to a stage of planks on the back
// of a great glass node afloat on the black water. From there the walk is the Noonwrights' stalled freight: seven
// sealed carriers nose to tail east along the nave, through the hoops of the line they ran in, to the hall's east
// wall, where the Heliarchs' sun is set in tesserae with most of its gold gone; and a lesser one pitched down to a
// door in the south wall (the passage on toward the Pit). The glass is v14/noon-road.js (the fourth hand's parts);
// this file is the Late folk's timber, the door, the sun, the floor and the rescue. The story: stories/the-noon-road.md.
// The plans: v14/coffin-road/plan.js (the floor), v14/noon-road/plan.js (the glass). Dark, sealed and stone-sounding
// by the kit: v14/under.js (the hall's own darkness, glow and below-volume are v5/nave.js's).
// Draws: the timber and stone (stair, shears, stage, boards, door, passage, the sun: one mesh), the sun's gold, the
// glass, the glints (one Points): four. Lights: a PointLight over each vessel that holds its light and one in the
// shears' cage (lights.js keeps the nearest three).
// ?coffinroad=0 (or ?skip=coffinroad) leaves it out, and the Nave keeps its rim's colliders and south wall whole.
import * as THREE from 'three';
import { NAVE } from '../v5/nave/ground.js';
import { glowAt } from '../v5/nave.js';
import { UnderBuilder, underMaterial, installBelow, boxBelow } from './under.js';
import { buildNoon } from './noon-road.js';
import { ROAD_Y, SZ, SHALF, FOOT_X, RAFT, NSPUR, SSPUR, ROAD, DOOR, stairHead, makeFloor, CR_OFF, spurY, SLOPE, PATCH } from './coffin-road/plan.js';
import { MAIN, gapX, NODE } from './noon-road/plan.js';
import { NOON } from '../v8/strata/noon.js';

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const TIMBER = C('#1f1813'), TIMBER_L = C('#3d3026'), BOARD = C('#231b15'), ROPE = C('#6d5f48');
const IRON = C('#26221f'), STONE = C('#6e655c'), STONE_D = C('#4c453f'), RUBBLE = C('#5d554c');
const MORTAR = C('#4a3a26'), GOLD = C('#c8962e'), GOLD_D = C('#8a6420'), RED = C('#6a2a1c'), BLACK = C('#050505');
const FLAME = NOON.lightHex; // stored daylight (the fourth hand's one light)

export async function build(ctx) {
  await ctx.built('nave'); // (false at once when the Nave is left out: then no road)
  if (CR_OFF || !ctx.nave || ctx.nave.off) { ctx.coffinRoad = { off: true }; return; }
  const t0 = performance.now();
  const { scene, terrain: T } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(14001);
  await ctx.progress?.('the noon road', 0);
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
    // the lantern: a chain down from the head, an iron cage, a flask of stored daylight in it (the glass is noon-road.js's)
    B.beam([apex[0], apex[1] - 0.55, SZ], [apex[0], apex[1] - 1.9, SZ], 0.015, IRON, 0.05);
    const ly = apex[1] - 2.25;
    for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.beam([apex[0] + cx * 0.15, ly - 0.3, SZ + cz * 0.15], [apex[0] + cx * 0.12, ly + 0.32, SZ + cz * 0.12], 0.014, IRON, 0.04);
    B.box(apex[0], ly - 0.33, SZ, 0.19, 0.03, 0.19, 0, IRON);
    B.prism([[apex[0] - 0.2, SZ - 0.2], [apex[0] + 0.2, SZ - 0.2], [apex[0] + 0.2, SZ + 0.2], [apex[0] - 0.2, SZ + 0.2]], ly + 0.32, ly + 0.36, IRON);
    B.prism([[apex[0], SZ - 0.18], [apex[0] + 0.18, SZ], [apex[0], SZ + 0.18], [apex[0] - 0.18, SZ]], ly + 0.36, ly + 0.55, IRON);
  }
  // ---- on two trestles on the turf north of the shears: a glass bulb of the Noonwrights' in a rope cradle, a third
  // full of light, a bung in its neck: somebody decants the stored noon down there and carries it up
  const wait = { x: xRim + 4.2, z: SZ - 5.2 };
  const extras = [];
  {
    const gy = g(wait.x, wait.z) + 0.78;
    for (const s of [-0.65, 0.65]) {
      const tx = wait.x + s;
      for (const w of [-0.3, 0.3]) for (const d of [-1, 1]) B.beam([tx + d * 0.12, g(tx, wait.z + w) - 0.1, wait.z + w], [tx, gy - 0.16, wait.z + w * 0.7], 0.035, TIMBER, 0.1);
      B.box(tx, gy - 0.13, wait.z, 0.06, 0.04, 0.42, 0, TIMBER_L);
    }
    for (const w of [-0.3, 0.3]) B.beam([wait.x - 0.8, gy - 0.07, wait.z + w], [wait.x + 0.8, gy - 0.07, wait.z + w], 0.03, TIMBER_L, 0.1);
    const by = gy + 0.42;
    extras.push({ kind: 'bulb', at: [wait.x, by, wait.z], r: 0.62, lit: 0.55 });
    // the cradle: rope round it twice and over, and a carrying pole through the loops
    for (let k = 0; k < 12; k++) { const a = k * 0.5236, b = a + 0.5236; for (const [yy, rr] of [[by - 0.1, 0.64], [by + 0.28, 0.5]]) B.beam([wait.x + Math.cos(a) * rr, yy, wait.z + Math.sin(a) * rr], [wait.x + Math.cos(b) * rr, yy, wait.z + Math.sin(b) * rr], 0.016, ROPE, 0.08); }
    for (const a of [0.4, 1.9, 3.5, 5.0]) B.beam([wait.x + Math.cos(a) * 0.64, by - 0.1, wait.z + Math.sin(a) * 0.64], [wait.x + Math.cos(a) * 0.2, by + 0.72, wait.z + Math.sin(a) * 0.2], 0.014, ROPE, 0.08);
    B.beam([wait.x - 1.5, by + 0.78, wait.z + 0.05], [wait.x + 1.5, by + 0.74, wait.z - 0.05], 0.03, TIMBER_L, 0.1);
    B.box(wait.x, by + 0.62, wait.z, 0.07, 0.06, 0.07, 0.3, TIMBER_L); // the bung
  }
  extras.push({ kind: 'flask', at: [apex[0], apex[1] - 2.25, SZ], r: 0.15, lit: 1 });
  await ctx.progress?.('the noon road', 0.3);

  // ---- the Late folk's road-mending: the stage on the node's back at the stair's foot, the gangway north to the
  // string, boards down the pitched carrier to the door, and planks over every coupling; all lashed, none nailed
  const top = ROAD_Y;
  const planks = (x0, x1, z0, z1, along, n, y0 = top, y1 = top, dark = false) => {
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n, sk = (rng() - 0.5) * 0.03;
      if (along === 'x') { const z = z0 + (z1 - z0) * f, w = (z1 - z0) / n / 2 - 0.03; B.box((x0 + x1) / 2 + (rng() - 0.5) * 0.12, y0 - 0.03, z, (x1 - x0) / 2, 0.028, w, sk, BOARD, dark || i % 2 ? BOARD : TIMBER_L, 0.3); }
      else if (y0 === y1) { const x = x0 + (x1 - x0) * f, w = (x1 - x0) / n / 2 - 0.03; B.box(x, y0 - 0.03, (z0 + z1) / 2 + (rng() - 0.5) * 0.12, w, 0.028, (z1 - z0) / 2, sk, BOARD, i % 2 ? BOARD : TIMBER_L, 0.3); }
      else { const x = x0 + (x1 - x0) * f, w = (x1 - x0) / n / 2 - 0.03; B.quad([x - w, y0, z0], [x + w, y0, z0], [x + w, y1, z1], [x - w, y1, z1], i % 2 ? BOARD : TIMBER_L, [0, 1, 0], 0.3); B.quad([x - w, y1 - 0.05, z1], [x + w, y1 - 0.05, z1], [x + w, y0 - 0.05, z0], [x - w, y0 - 0.05, z0], BOARD, [0, -1, 0], 0.2); }
    }
  };
  const lash = (a, b) => B.beam(a, b, 0.02, ROPE, 0.08);
  // the stage: planks north-south on three bearers, the bearers lashed down round the node
  planks(RAFT.x0, RAFT.x1, RAFT.z0, RAFT.z1, 'z', 11);
  for (const z of [RAFT.z0 + 0.25, (RAFT.z0 + RAFT.z1) / 2, RAFT.z1 - 0.25]) B.beam([RAFT.x0 - 0.2, top - 0.12, z], [RAFT.x1 + 0.1, top - 0.12, z], 0.06, TIMBER, 0.12);
  for (const [x, z] of [[RAFT.x0 - 0.15, RAFT.z0 + 0.25], [RAFT.x0 - 0.15, RAFT.z1 - 0.25], [RAFT.x1, RAFT.z0 + 0.25]]) lash([x, top - 0.12, z], [x - 0.5, NAVE.water - 0.2, z + (z < NODE.z ? -0.6 : 0.6)]);
  // the tapping: a row of flasks on the stage's north-west corner, a funnel of horn, a coil of line
  for (let i = 0; i < 3; i++) extras.push({ kind: 'flask', at: [RAFT.x0 + 0.28 + i * 0.3, top + 0.16, RAFT.z0 + 0.3 + (i % 2) * 0.08], r: 0.1, lit: i === 1 ? 0 : 0.8 });
  for (let k = 0; k < 10; k++) { const a = k * 0.628, b = a + 0.628, cx = RAFT.x0 + 0.5, cz = RAFT.z1 - 0.5; B.beam([cx + Math.cos(a) * 0.24, top + 0.03, cz + Math.sin(a) * 0.24], [cx + Math.cos(b) * 0.24, top + 0.03, cz + Math.sin(b) * 0.24], 0.03, ROPE, 0.2); }
  // the gangway north to the string, sagging on its two ropes
  planks(NSPUR.x0 + 0.1, NSPUR.x1 - 0.1, ROAD.z1 - 0.3, RAFT.z0, 'z', 4);
  for (const x of [NSPUR.x0 + 0.05, NSPUR.x1 - 0.05]) lash([x, top - 0.07, ROAD.z1 - 0.4], [x, top - 0.07, RAFT.z0 + 0.1]);
  // down to the door: level a step, then boards on the lesser carrier's back, cleats across them
  planks(SSPUR.x0 + 0.1, SSPUR.x1 - 0.1, RAFT.z1, SLOPE.z0, 'z', 4);
  planks(SSPUR.x0 + 0.1, SSPUR.x1 - 0.1, SLOPE.z0, SLOPE.z1, 'z', 4, spurY(SLOPE.z0), spurY(SLOPE.z1));
  planks(SSPUR.x0 + 0.1, SSPUR.x1 - 0.1, SLOPE.z1, DOOR.z + 0.05, 'z', 4, DOOR.sill + 0.03, DOOR.sill + 0.03);
  for (let z = SLOPE.z0 + 0.5; z < SLOPE.z1; z += 0.62) B.box(DOOR.x, spurY(z) + 0.02, z, 0.72, 0.022, 0.03, 0, TIMBER, TIMBER, 0.2);
  // the road: planks over each coupling, from one back to the next, lashed to the coupling's ring
  planks(ROAD.x0, ROAD.x0 + 1.2, ROAD.zc - PATCH.half, ROAD.zc + PATCH.half, 'x', 3, top, top, true);
  for (let i = 0; i < MAIN.length - 1; i++) {
    const x = gapX(i);
    planks(x - PATCH.w, x + PATCH.e, ROAD.zc - PATCH.half, ROAD.zc + PATCH.half, 'x', 3, top, top, true); // a patch: the carriers are the road
    for (const s of [-1, 1]) lash([x - 0.2, top - 0.06, ROAD.zc + s * 0.47], [x - 0.15, top - 0.75, ROAD.zc + s * 1.2]);
  }
  planks(ROAD.x1 - 1.45, ROAD.x1, ROAD.zc - PATCH.half, ROAD.zc + PATCH.half, 'x', 3, top, top, true);
  // things floating: a few boards got loose
  for (const [x, z, yaw, len] of [[263.5, 45.6, 0.4, 1.6], [287.2, 44.9, -0.8, 1.1], [253.8, 45.2, 1.9, 0.9], [292.5, 37.2, 0.2, 1.3]]) B.box(x, WY + 0.015, z, len / 2, 0.025, 0.1, yaw, TIMBER_L, TIMBER_L, 0.3);
  await ctx.progress?.('the noon road', 0.55);

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
    // (each block's nearest corner stays 0.5 m past the floor's held end, so the eye never stands in one)
    for (let i = 0; i < (low ? 16 : 26); i++) {
      const s = 0.25 + rng() * 0.4, ex = s * (1 + rng() * 0.5), r = Math.hypot(ex, s);
      const bx = x0 + 0.2 + rng() * (x1 - x0 - 0.4), bz = DOOR.fall + 0.5 + r + rng() * 1.2;
      const by = yf + (rng() * rng()) * (y1 - yf - 0.7) + s * 0.4;
      B.box(bx, by, bz, ex, s * (0.6 + rng() * 0.4), s, rng() * 3, rng() < 0.35 ? STONE_D : RUBBLE, RUBBLE, 0.15);
    }
    B.prism([[x0, DOOR.fall + 1.1], [x1, DOOR.fall + 1.1], [x1, ze], [x0, ze]], yf - 0.6, y1 - 0.75, RUBBLE, RUBBLE, 0.2);
  }
  // ---- the sun on the east wall, set into it: a ring of stone moulding 12 m across standing out of the wall, the disc
  // of tesserae inside it (most of the gold picked out: the sockets left dark, each where a piece was), sixteen rays
  // of red and ochre tesserae out to the vault, the gold that is left catching the stored light (its own metal draw); at
  // its foot a step out of the water, and on it, awash, the pieces that fell
  const G = new UnderBuilder(lit);
  const SUN = { x: NAVE.x1, cy: -10.0, cz: NAVE.z, R: 4.9, RR: 6.5 };
  {
    const x = SUN.x, cy = SUN.cy, cz = SUN.cz, R = SUN.R, RR = SUN.RR;
    const P = (r, a, dx = 0) => [x - dx, cy + Math.sin(a) * r, cz + Math.cos(a) * r];
    const MORTAR_D = C('#2a2016'), OCHRE = C('#8a5a26'), ROSE = C('#7a3424');
    const N = 48;
    // the setting-bed, a hand proud of the wall
    for (let k = 0; k < N; k++) { const a0 = k / N * 6.2832, a1 = (k + 1) / N * 6.2832; B.tri(P(0, 0, 0.06), P(R, a0, 0.06), P(R, a1, 0.06), MORTAR, [-1, 0, 0], 0.2); }
    // the moulding: a ring standing out of the wall round the disc, and its inner face
    for (let k = 0; k < N; k++) {
      const a0 = k / N * 6.2832, a1 = (k + 1) / N * 6.2832;
      B.quad(P(R + 0.55, a0, 0.02), P(R + 0.55, a1, 0.02), P(R + 0.3, a1, 0.38), P(R + 0.3, a0, 0.38), STONE, [-1, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)], 0.12);
      B.quad(P(R + 0.3, a0, 0.38), P(R + 0.3, a1, 0.38), P(R, a1, 0.06), P(R, a0, 0.06), STONE_D, [-1, -Math.sin((a0 + a1) / 2), -Math.cos((a0 + a1) / 2)], 0.12);
    }
    // the tesserae: a grid 0.16 m; gold where it is left (patches: the lower left, round the rim, a few alone),
    // a dark socket where it was picked out
    const SN = ctx.noise, step = low ? 0.2 : 0.16, sz = step * 0.38;
    for (let v = -R; v <= R; v += step) for (let u = -R; u <= R; u += step) {
      const rr = Math.hypot(u, v); if (rr > R - 0.12) continue;
      const left = SN.noise2(u * 0.55 + 3.1, v * 0.55 - 1.7) + (rr > R - 0.9 ? 0.35 : 0) + (v < -1.5 && u < 0 ? 0.3 : 0) > 0.42;
      const px = x - 0.075, py = cy + v, pz = cz + u;
      if (left) { const t = (rng() - 0.5) * 0.5; G.quad([px - 0.01, py - sz, pz - sz], [px - 0.01, py - sz, pz + sz], [px - 0.01, py + sz, pz + sz], [px - 0.01, py + sz, pz - sz], rng() < 0.75 ? GOLD : GOLD_D, [-1, t, (rng() - 0.5) * 0.5], 0.25); }
      else B.quad([px, py - sz * 0.85, pz - sz * 0.85], [px, py - sz * 0.85, pz + sz * 0.85], [px, py + sz * 0.85, pz + sz * 0.85], [px, py + sz * 0.85, pz - sz * 0.85], MORTAR_D, [-1, 0, 0], 0.15);
    }
    // the rays, sixteen, long and short in turn, red and ochre, set in tesserae (a coarser grid), out to the vault
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.2832 + 0.1, long = k % 2 === 0, L = long ? RR + 0.7 : RR - 0.4, w = long ? 1.05 : 0.8;
      const A0 = P(R + 0.55, a - w / (R + 0.55), 0.03), A1 = P(R + 0.55, a + w / (R + 0.55), 0.03), T0 = P(L, a, 0.03);
      if (T0[1] > NAVE.ceil - 0.3 || T0[1] < NAVE.water + 0.4) { T0[1] = Math.max(NAVE.water + 0.4, Math.min(NAVE.ceil - 0.3, T0[1])); }
      B.tri(A0, A1, T0, long ? ROSE : OCHRE, [-1, 0, 0], 0.25);
      // a few gold pieces left along each ray's spine
      for (let q = 0; q < (low ? 3 : 6); q++) { if (rng() < 0.45) continue; const r = R + 0.8 + rng() * (L - R - 1.1), [px, py, pz] = P(r, a + (rng() - 0.5) * 0.04, 0.05), t = 0.06; G.quad([px, py - t, pz - t], [px, py - t, pz + t], [px, py + t, pz + t], [px, py + t, pz - t], GOLD, [-1, (rng() - 0.5) * 0.5, (rng() - 0.5) * 0.5], 0.25); }
    }
    // the step at its foot, out of the water, and the fallen gold on it, awash
    const sx0 = ROAD.x1 + 0.25, top2 = NAVE.water + 0.05;
    B.box((sx0 + x) / 2, top2 - 0.4, cz, (x - sx0) / 2, 0.4, 9.5, 0, STONE_D, STONE, 0.18);
    for (let q = 0; q < (low ? 40 : 80); q++) { const px = sx0 + 0.2 + rng() * (x - sx0 - 0.3), pz = cz + (rng() - 0.5) * 16, t = 0.035; G.quad([px - t, top2 + 0.004, pz - t], [px + t, top2 + 0.004, pz - t], [px + t, top2 + 0.004, pz + t], [px - t, top2 + 0.004, pz + t], rng() < 0.7 ? GOLD : GOLD_D, [(rng() - 0.5) * 0.6, 1, (rng() - 0.5) * 0.6], 0.25); }
  }
  const geo = B.geometry();
  const mat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.05 }), 'coffin-road', FLAME);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'coffin-road'; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  const gold = new THREE.Mesh(G.geometry(), underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.85 }), 'coffin-road-gold', FLAME));
  gold.name = 'coffin-road-gold'; gold.receiveShadow = true;
  scene.add(gold);

  // ---- the glass (the carriers, the node, the hoops, the elbow, the Late folk's bulb and flasks)
  const below = installBelow(ctx);
  const noon = buildNoon(ctx, { lit, below, extras });
  // ---- the glints: one Points draw: a soft round halo on the flask in the shears' cage (never under 3 px, so it is
  // the thing seen from the moor), the bulb on the trestle, and each lamp of stored light down below
  const lanternAt = [apex[0], apex[1] - 2.25, SZ];
  const F = [[...lanternAt, 0.3, 1], [extras[0].at[0], extras[0].at[1], extras[0].at[2], 0.5, 1], ...noon.lamps.map(([x, y, z, k]) => [x, y - 0.3, z, 0.5 + 0.9 * k, 0])];
  const fpos = new Float32Array(F.length * 3), fattr = new Float32Array(F.length * 4);
  const la = [0, 0, 0];
  F.forEach(([x, y, z, s, far], i) => { fpos.set([x, y, z], i * 3); litAt(x, y, z, la); fattr.set([s, i * 7.31, far ? 1 : la[1], far ? 2 : 0], i * 4); });
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute('aF', new THREE.BufferAttribute(fattr, 4));
  const fmat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uCol: { value: new THREE.Color(FLAME) } }]),
    vertexShader: `uniform float uTime, uScale; attribute vec4 aF; varying float vI; varying float vAir; varying float vW;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position;
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        float d = -mvPosition.z, lantern = step(1.5, aF.w), px = aF.x * uScale / max(d, 0.1);
        float S = clamp(px * mix(3.0, 2.2, lantern), mix(0.0, 14.0, lantern), 64.0);
        vI = (0.94 + 0.06 * sin(uTime * 0.7 + aF.y)) * mix(0.16, 1.0, lantern); vAir = aF.z; vW = aF.w;
        gl_PointSize = S;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uCol; varying float vI; varying float vAir; varying float vW;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c);
        float halo = exp(-r2 * 3.5) * (1.0 - smoothstep(0.7, 1.0, r2)), heart = exp(-r2 * 40.0) * step(1.5, vW);
        gl_FragColor = vec4(uCol * (halo * 0.6 + heart * 1.6) * vI, 1.0);
        vec3 pre = gl_FragColor.rgb;
        #include <fog_fragment>
        gl_FragColor.rgb = mix(pre, gl_FragColor.rgb, vAir);
      }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const flames = new THREE.Points(fgeo, fmat);
  flames.name = 'coffin-road-flames'; flames.frustumCulled = false; flames.renderOrder = 20;
  scene.add(flames);

  // ---- the lights: the stored light's own (noon-road.js) and the flask in the shears' cage
  const lantern = new THREE.PointLight(new THREE.Color(FLAME), 6, 16, 2);
  lantern.position.set(...lanternAt); lantern.name = 'coffin-road-light'; scene.add(lantern);
  const lights = [...noon.lights.map((l) => l.L), lantern];

  // ---- the floor: the stair, the raft, the spurs, the road and the passage, one stacked floor with held edges; the
  // water under it holds whoever falls in until the road takes them back (below)
  ctx.addWalkable(floor, { stack: true, keep: true, name: 'coffin-road' });
  const HALF = NAVE.walls + 0.5, CATCH = WY - 1.25;
  const inHall = (x, z) => x > NAVE.x0 + 9 && x < NAVE.x1 - 0.5 && Math.abs(z - NAVE.z) < HALF - 0.4;
  const water = { fn: (x, z) => (inHall(x, z) ? CATCH : null) };
  ctx.addWalkable(water.fn, { stack: true, keep: true, name: 'nave-water' });
  // colliders: the stair's sides where it is still within a step of the turf, the shears' feet, the trestles and their bulb
  let colliders = 0;
  if (ctx.addCollider) {
    for (const s of [-1, 1]) for (let x = xRim - 4.5; x <= xRim + 0.5; x += 0.4) { ctx.addCollider({ x, z: SZ + s * (SHALF + 0.32), r: 0.28, y: g(x, SZ) - 1.2, h: 3.2, stand: false }); colliders++; }
    for (const [fx, fz] of feet) { ctx.addCollider({ x: fx, z: fz, r: 0.5, y: g(fx, fz) - 0.5, h: 3 }); colliders++; }
    ctx.addCollider({ x1: wait.x - 0.95, z1: wait.z, x2: wait.x + 0.95, z2: wait.z, r: 0.45, y: g(wait.x, wait.z) - 0.2, h: 1.5, stand: false }); colliders++;
  }
  // under the ground: the passage (the hall and the hole's shaft are the Nave's)
  below.add(boxBelow(DOOR.x - DOOR.half - 0.6, DOOR.x + DOOR.half + 0.6, DOOR.z - 0.2, DOOR.z + DOOR.depth + 3, -4, 1, 0.6), { size: 0.35 }); // a narrow passage: a smaller room
  below.keep(mesh); below.keep(gold); below.keep(flames);

  // the way down, for heights-test: from the turf east of the shears, down the stair, the stage, the north spur, the
  // road to its end under the sun
  const mid = (xHead + FOOT_X) / 2;
  ctx.ascents?.add({ id: 'coffin-road', held: true, offs: [0.2, 0.35, 0.7, 0.95],
    path: [[xLand + 3, SZ, g(xLand + 3, SZ)], [xLand - 0.5, SZ, yHead], [xHead - 0.3, SZ], [mid, SZ, stairY(mid)], [FOOT_X - 0.6, SZ, ROAD_Y], [246.7, 45.5, ROAD_Y], [246.7, 42, ROAD_Y], [270, 42, ROAD_Y], [ROAD.x1 - 0.6, 42, ROAD_Y]] });

  // ---- per frame, near: the glints' clock and size, the stored light's breathing, the water giving back
  const ds = new THREE.Vector2(), p = ctx.player;
  let wet = 0, rescues = 0;
  const S = { get rescues() { return rescues; } };
  function update(dt, t) {
    fmat.uniforms.uTime.value = t;
    noon.update(dt, t);
    ctx.renderer.getDrawingBufferSize(ds);
    fmat.uniforms.uScale.value = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
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

  const tris = (geo.attributes.position.count + gold.geometry.attributes.position.count) / 3 + noon.tris;
  ctx.coffinRoad = {
    head, floor, stairY, noon, lights, mesh, glass: noon.mesh, flames, state: S,
    stats: () => ({ calls: 4, tris: Math.round(tris), glints: F.length, vessels: noon.vessels, lit: noon.lit, hoops: noon.hoops, lights: lights.length, colliders }),
  };
  ctx.log?.(`noon road: ${noon.vessels} carriers (${noon.lit} alight), ${noon.hoops} hoops, ${lights.length} lights, ${Math.round(tris)} tris, stair ${(yHead - ROAD_Y).toFixed(1)} m down over ${(xHead - FOOT_X).toFixed(1)} m, ${(performance.now() - t0).toFixed(0)} ms`);
}
