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
// ?coffinroad=0 (or ?skip=coffinroad) leaves it out, and the Nave keeps its rim's colliders and south wall whole.
import * as THREE from 'three';
import { NAVE } from '../v5/nave/ground.js';
import { glowAt } from '../v5/nave.js';
import { UnderBuilder, underMaterial, installBelow, boxBelow } from './under.js';
import { ROAD_Y, SZ, SHALF, FOOT_X, RAFT, NSPUR, SSPUR, ROAD, PAIRS, DOOR, stairHead, candles, FLAME_Y, makeFloor, CR_OFF, GAP, ADRIFT, LID_OFF, pairX, WARM } from './coffin-road/plan.js';

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const TIMBER = C('#1f1813'), TIMBER_L = C('#3d3026'), LID = C('#4a3828'), BOARD = C('#231b15'), LEAD = C('#3f4341'), ROPE = C('#6d5f48');
const IRON = C('#26221f'), WAX = C('#6f6a58'), STONE = C('#6e655c'), STONE_D = C('#4c453f'), RUBBLE = C('#5d554c');
const MORTAR = C('#4a3a26'), GOLD = C('#c8962e'), GOLD_D = C('#8a6420'), RED = C('#6a2a1c'), BLACK = C('#050505');
const FLAME = '#9fe8c2'; // corpse-candle green (the palette's wisp)

export async function build(ctx) {
  await ctx.built('nave'); // (false at once when the Nave is left out: then no road)
  if (CR_OFF || !ctx.nave || ctx.nave.off) { ctx.coffinRoad = { off: true }; return; }
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
  // ---- the coffins. Six-sided (narrow at the head, widest at the shoulder, narrowest at the foot), a lid a hand
  // proud of the body with a coffin-shaped panel on it and a lead plate at the head; and not all alike: a child's,
  // a fine one (pale wood, a gilt plate, the sun's boss), crude ones (a box of boards, no taper, the lid three
  // planks), lids slid down off the head (the black inside), one off and floating.
  const coffinRing = (cx, cz, yaw, sc = 1, crude = false, len = 1) => {
    const L = 2.1 * sc * len, w = crude ? [[0, -0.3], [0.5, -0.3], [L, -0.3], [L, 0.3], [0.5, 0.3], [0, 0.3]] : [[0, -0.25], [0.52, -0.37], [L, -0.19], [L, 0.19], [0.52, 0.37], [0, 0.25]];
    const pts = w.map(([u, v]) => [u - L / 2, v * sc]);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return pts.map(([u, v]) => [cx + u * c - v * s, cz + u * s + v * c]);
  };
  const FINE = C('#5b4330'), CRUDE = C('#3a2f24'), CRUDE_L = C('#4a3c2c'), SHROUD = C('#a99f88');
  const coffin = (cx, cz, yaw, top, o = {}) => {
    const sc = o.sc ?? 1, kind = o.kind || 'plain', crude = kind === 'crude', fine = kind === 'fine';
    const body = crude ? CRUDE : fine ? FINE : TIMBER, lidc = crude ? CRUDE_L : fine ? C('#6b5038') : LID;
    const c = Math.cos(yaw), s = Math.sin(yaw), at = (u, v) => [cx + u * c - v * s, cz + u * s + v * c];
    B.prism(coffinRing(cx, cz, yaw, sc, crude), top - 0.62 * sc, top - 0.05, body, body, 0.15);
    // the dark inside, seen where a lid is slid or off
    if (o.lid !== 'shut') B.prism(coffinRing(cx, cz, yaw, sc * 0.88, crude), top - 0.05, top - 0.045, BLACK, BLACK, 0);
    if (o.lid === 'off') { // a shroud in it, the shape of someone
      const [hx, hz] = at(-0.62 * sc, 0), [fx, fz] = at(0.75 * sc, 0);
      B.beam([hx, top - 0.1, hz], [fx, top - 0.14, fz], 0.17 * sc, SHROUD, 0.12);
      const [kx, kz] = at(-0.8 * sc, 0); B.box(kx, top - 0.08, kz, 0.13 * sc, 0.09, 0.11 * sc, -yaw, SHROUD, SHROUD, 0.1);
      return;
    }
    const slid = o.lid === 'slid' ? 0.42 * sc : 0;
    const lcx = cx + c * slid, lcz = cz + s * slid;
    if (crude) { // three planks for a lid, laid along it
      for (const v of [-0.2, 0, 0.2]) { const [px, pz] = at(slid, v * sc); B.box(px, top - 0.03, pz, 1.06 * sc, 0.025, 0.095 * sc, -yaw + (rng() - 0.5) * 0.03, CRUDE_L, CRUDE_L, 0.3); }
      return;
    }
    B.prism(coffinRing(lcx, lcz, yaw, sc * 1.04), top - 0.05, top - 0.012, lidc, lidc, 0.18);
    B.prism(coffinRing(lcx, lcz, yaw, sc * 0.8), top - 0.02, top, fine ? C('#7a5c40') : C('#5a4532'), fine ? C('#7a5c40') : C('#5a4532'), 0.12);
    const [px, pz] = [lcx - c * 0.5 * sc, lcz - s * 0.5 * sc];
    B.box(px, top + 0.006, pz, 0.15 * sc, 0.008, 0.1 * sc, -yaw, fine ? GOLD : LEAD, fine ? GOLD : LEAD, 0.1);
    if (fine) { const [bx, bz] = [lcx + c * 0.2, lcz + s * 0.2]; B.prism(Array.from({ length: 8 }, (_, k) => [bx + Math.cos(k * 0.785) * 0.14, bz + Math.sin(k * 0.785) * 0.14]), top, top + 0.03, GOLD_D, GOLD, 0.15); }
    // the rope handles at the sides, tied through
    for (const u of [-0.45, 0.45]) for (const v of [-1, 1]) { const [a1, b1] = at(u * sc - 0.12, v * 0.36 * sc * (u < 0 ? 1 : 0.8)), [a2, b2] = at(u * sc + 0.12, v * 0.36 * sc * (u < 0 ? 1 : 0.8)); B.beam([a1, top - 0.22, b1], [a2, top - 0.22, b2], 0.018, ROPE, 0.08); }
  };
  // ---- the coffin on two trestles on the turf north of the shears, waiting: empty, and his size
  const wait = { x: xRim + 4.2, z: SZ - 5.2 };
  {
    const gy = g(wait.x, wait.z) + 0.78;
    for (const s of [-0.65, 0.65]) {
      const tx = wait.x + s;
      for (const w of [-0.3, 0.3]) for (const d of [-1, 1]) B.beam([tx + d * 0.12, g(tx, wait.z + w) - 0.1, wait.z + w], [tx, gy - 0.16, wait.z + w * 0.7], 0.035, TIMBER, 0.1);
      B.box(tx, gy - 0.13, wait.z, 0.06, 0.04, 0.42, 0, TIMBER_L);
    }
    coffin(wait.x, wait.z, 0, gy + 0.52, { lid: 'slid', sc: 1.05 });
  }
  await ctx.progress?.('the coffin road', 0.3);

  // ---- the forty: the raft's four, the spurs' two pairs, the road's pairs (one missing its north coffin, bridged;
  // the last with an empty place, its ropes ready), two adrift; lashed at the handles, a board or two between pairs
  const top = ROAD_Y;
  let laid = 0;
  const lay = (x, z, yaw, o) => { coffin(x, z, yaw, top, o); laid++; };
  const tie = (a, b) => B.beam([a[0], top - 0.2, a[1]], [b[0], top - 0.2, b[1]], 0.02, ROPE, 0.08);
  const boards = (x0, x1, z0, z1, along, n = 2) => {
    // planks laid along the way, a gap between them, over a space between coffins
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      if (along === 'x') B.box((x0 + x1) / 2, top - 0.03, z0 + (z1 - z0) * f, (x1 - x0) / 2 + 0.12, 0.028, (z1 - z0) / n / 2 - 0.04, (rng() - 0.5) * 0.04, BOARD, BOARD, 0.3);
      else B.box(x0 + (x1 - x0) * f, top - 0.03, (z0 + z1) / 2, (x1 - x0) / n / 2 - 0.04, 0.028, (z1 - z0) / 2 + 0.12, (rng() - 0.5) * 0.04, BOARD, BOARD, 0.3);
    }
  };
  // who lies where: deterministic, so the same visit sees the same forty
  const KIND = { 'raft-1': { sc: 0.55, kind: 'plain' }, 'raft-3': { kind: 'crude' }, 'road-5-n': { sc: 0.55 }, 'road-3-s': { kind: 'crude' }, 'road-7-n': { kind: 'crude' }, 'spur-s-1': { kind: 'crude' },
    'road-14-s': { kind: 'fine' }, 'road-2-n': { lid: 'slid' }, 'road-8-s': { lid: 'slid' }, 'road-11-n': { lid: 'slid' }, 'road-12-s': { sc: 0.92 }, 'spur-n-0': { lid: 'slid' } };
  const who = (k) => ({ lid: 'shut', sc: 0.94 + rng() * 0.1, ...(KIND[k] || {}) });
  // the raft: four abreast, lying north-south, at the stair's foot
  for (let i = 0; i < 4; i++) { const o = who('raft-' + i); lay(RAFT.x0 + 0.42 + i * 0.85, (RAFT.z0 + RAFT.z1) / 2 + (o.sc < 0.7 ? 0.45 : 0), Math.PI / 2 + (i % 2 ? Math.PI : 0), o); }
  tie([RAFT.x0 + 0.3, RAFT.z0 + 0.55], [RAFT.x1 - 0.3, RAFT.z0 + 0.55]); tie([RAFT.x0 + 0.3, RAFT.z1 - 0.55], [RAFT.x1 - 0.3, RAFT.z1 - 0.55]);
  if (KIND['raft-1']) boards(RAFT.x0 + 0.85, RAFT.x0 + 1.7, RAFT.z0, RAFT.z0 + 0.9, 'z', 2); // over the child's short length
  // the spurs: a pair each, north-south, boards to the road and to the door's sill
  const spurX = [(NSPUR.x0 + NSPUR.x1) / 2 - 0.4, (NSPUR.x0 + NSPUR.x1) / 2 + 0.4];
  const nz = (NSPUR.z1 + ROAD.z1) / 2, sz = SSPUR.z0 + 1.2;
  spurX.forEach((x, i) => { lay(x, nz, Math.PI / 2, who('spur-n-' + i)); lay(x, sz, -Math.PI / 2, who('spur-s-' + i)); });
  boards(NSPUR.x0, NSPUR.x1, ROAD.z1, nz - 1.05, 'z'); boards(NSPUR.x0, NSPUR.x1, nz + 1.05, RAFT.z0, 'z');
  boards(SSPUR.x0, SSPUR.x1, sz + 1.05, DOOR.z, 'z');
  boards(ROAD.x0, FOOT_X, ROAD.z0, ROAD.z1, 'x', 3); // where the north spur meets the road
  // the road
  const pitch = (ROAD.x1 - FOOT_X) / PAIRS;
  for (let i = 0; i < PAIRS; i++) {
    const x0 = FOOT_X + i * pitch, cx = pairX(i), flip = i % 2 ? Math.PI : 0;
    const last = i === PAIRS - 1, gap = i === GAP;
    if (!gap) lay(cx, ROAD.zc - 0.4, flip, who(`road-${i}-n`));
    else { boards(cx - 1.05, cx + 1.05, ROAD.z0, ROAD.zc - 0.02, 'x', 2); B.beam([cx - 0.5, top - 0.2, ROAD.zc - 0.05], [cx - 0.7, WY - 0.3, ROAD.z0 - 0.9], 0.02, ROPE); } // its place, bridged; its rope in the water
    if (!last) lay(cx, ROAD.zc + 0.4, flip + Math.PI, who(`road-${i}-s`));
    else { // the empty place: ropes laid ready across it, a candle-stub unlit on the board's end
      for (const u of [-0.6, 0.55]) B.beam([cx + u, top - 0.05, ROAD.zc + 0.05], [cx + u + 0.1, WY + 0.02, ROAD.z1 + 0.15], 0.018, ROPE);
    }
    if (!gap && !last) { tie([cx - 0.55, ROAD.zc - 0.05], [cx - 0.55, ROAD.zc + 0.05]); tie([cx + 0.5, ROAD.zc - 0.05], [cx + 0.5, ROAD.zc + 0.05]); }
    if (i < PAIRS - 1) boards(x0 + 2.15, x0 + pitch + 0.05, ROAD.z0 + 0.12, ROAD.z1 - 0.12, 'x', 3);
  }
  boards(FOOT_X - 0.1, FOOT_X + 0.08, ROAD.z0, ROAD.z1, 'x', 3);
  // adrift: two coffins loose on the water, one with its lid off (floating by it) and its candle out; one far
  // down the north aisle with its candle still lit
  for (const a of ADRIFT) {
    lay(a.x, a.z, a.yaw, { lid: a.lit ? 'shut' : 'off', sc: 1 });
    if (!a.lit) { const sx = a.x - Math.cos(a.yaw) * 0.5, sz2 = a.z - Math.sin(a.yaw) * 0.5; B.prism([[sx - 0.03, sz2 - 0.03], [sx + 0.03, sz2 - 0.03], [sx + 0.03, sz2 + 0.03], [sx - 0.03, sz2 + 0.03]], top - 0.05, top + 0.06, WAX, WAX); }
  }
  { // the lid, floating
    const L = LID_OFF, ring = coffinRing(L.x, L.z, L.yaw, 1.04);
    B.prism(ring, WY - 0.02, WY + 0.04, LID, LID, 0.15); B.prism(coffinRing(L.x, L.z, L.yaw, 0.8), WY + 0.04, WY + 0.06, TIMBER_L, LID, 0.12);
  }
  // other things floating: a few boards, a wreath gone black, a candle-stub
  for (const [x, z, yaw, len] of [[263.5, 37.6, 0.4, 1.6], [287.2, 46.4, -0.8, 1.1], [251.8, 37.2, 1.9, 0.9], [292.5, 36.8, 0.2, 1.3]]) B.box(x, WY + 0.015, z, len / 2, 0.025, 0.1, yaw, TIMBER_L, TIMBER_L, 0.3);
  for (const [x, z] of [[268.6, 45.9], [283.4, 38.1]]) for (let k = 0; k < 10; k++) { const a = k * 0.628, b = a + 0.628; B.beam([x + Math.cos(a) * 0.26, WY + 0.03, z + Math.sin(a) * 0.26], [x + Math.cos(b) * 0.26, WY + 0.03, z + Math.sin(b) * 0.26], 0.035, C('#2c2a1c'), 0.3); }
  // the candles: tapered wax with runs down it, on a pricket's spike, a stand, an iron bracket on the wall
  const CANDLES = candles();
  const taper = (x, z, y0, y1, r0, r1, col) => {
    const n = 6, ring = (r, y) => Array.from({ length: n }, (_, k) => [x + Math.cos(k * 1.047) * r, y, z + Math.sin(k * 1.047) * r]);
    const a = ring(r0, y0), b = ring(r1, y1);
    for (let k = 0; k < n; k++) { const k1 = (k + 1) % n; B.quad(a[k], a[k1], b[k1], b[k], col, [Math.cos((k + 0.5) * 1.047), 0, Math.sin((k + 0.5) * 1.047)], 0.08); }
    for (let k = 1; k < n - 1; k++) B.tri(b[0], b[k], b[k + 1], col, [0, 1, 0], 0.05);
    // runs of wax down the side, pooled at the foot
    for (let r = 0; r < 3; r++) { const ang = rng() * 6.28, len = (y1 - y0) * (0.25 + rng() * 0.5); B.beam([x + Math.cos(ang) * r1 * 1.05, y1 - 0.01, z + Math.sin(ang) * r1 * 1.05], [x + Math.cos(ang) * r0 * 1.08, y1 - len, z + Math.sin(ang) * r0 * 1.08], r1 * 0.28, WAX_R, 0.05); }
  };
  const WAX_R = C('#8d866e');
  for (const [x, z, kind] of CANDLES) {
    const fy = top + FLAME_Y[kind];
    if (kind === 0 || kind === 3) {
      const base = kind === 3 ? top + 0.0 : top;
      B.beam([x, base, z], [x, base + 0.1, z], 0.012, IRON, 0.05);
      B.box(x, base + 0.11, z, 0.065, 0.008, 0.065, rng() * 3, IRON);
      taper(x, z, base + 0.12, fy - 0.04, 0.04, 0.026, WAX);
    } else if (kind === 4) { // the bracket: a plate on the wall, an arm, a cup
      const wx = x > NAVE.x1 - 1 ? NAVE.x1 - 0.02 : x, wz = x > NAVE.x1 - 1 ? z : z < NAVE.z ? NAVE.z - NAVE.walls - 0.48 : NAVE.z + NAVE.walls + 0.48;
      B.beam([wx, fy - 0.95, wz], [x, fy - 0.42, z], 0.022, IRON, 0.05);
      B.box(wx, fy - 0.85, wz, wx === x ? 0.02 : 0.12, 0.2, wx === x ? 0.12 : 0.02, 0, IRON);
      B.box(x, fy - 0.42, z, 0.07, 0.015, 0.07, 0, IRON);
      taper(x, z, fy - 0.41, fy - 0.04, 0.045, 0.032, WAX);
    } else {
      const big = kind === 2, ch = big ? 0.6 : 0.37;
      for (let l = 0; l < 3; l++) { const a = l * 2.09 + 0.4; B.beam([x + Math.cos(a) * (big ? 0.34 : 0.22), top, z + Math.sin(a) * (big ? 0.34 : 0.22)], [x, top + (big ? 0.5 : 0.35), z], big ? 0.022 : 0.014, IRON, 0.05); }
      B.beam([x, top + 0.3, z], [x, fy - ch - 0.05, z], big ? 0.026 : 0.016, IRON, 0.05);
      B.prism(Array.from({ length: 8 }, (_, k) => [x + Math.cos(k * 0.785) * (big ? 0.17 : 0.09), z + Math.sin(k * 0.785) * (big ? 0.17 : 0.09)]), fy - ch - 0.08, fy - ch - 0.04, IRON); // its drip-pan
      taper(x, z, fy - ch - 0.04, fy - 0.04, big ? 0.085 : 0.05, big ? 0.06 : 0.034, WAX);
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
  // of red and ochre tesserae out to the vault, the gold that is left catching the candles (its own metal draw); at
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
  const gold = new THREE.Mesh(G.geometry(), underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.85 }), 'coffin-road-gold', '#ffcf7a'));
  gold.name = 'coffin-road-gold'; gold.receiveShadow = true;
  scene.add(gold);

  // ---- the flames: one Points draw, every candle and the lantern; a corpse-candle's cold green, a white heart
  const lanternAt = [apex[0], apex[1] - 2.25 + 0.05, SZ];
  const F = [...CANDLES.map(([x, z, kd]) => [x, top + FLAME_Y[kd], z, [0.1, 0.12, 0.18, 0.1, 0.12][kd], 0, WARM(x, z, kd) ? 1 : 0]), [...lanternAt, 0.24, 1, 0]];
  const fpos = new Float32Array(F.length * 3), fattr = new Float32Array(F.length * 4);
  const la = [0, 0, 0];
  F.forEach(([x, y, z, s, far, warm], i) => { fpos.set([x, y, z], i * 3); litAt(x, y, z, la); fattr.set([s, i * 7.31, far ? 1 : la[1], far ? 2 : warm], i * 4); });
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute('aF', new THREE.BufferAttribute(fattr, 4));
  // a flame: a teardrop, narrow and tall, a white heart low in it, cold green (warm under the sun); the lantern on the
  // shears is never under 3 px and has a wide halo, so it is the thing seen from the moor
  const fmat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uCol: { value: new THREE.Color(FLAME) }, uWarm: { value: new THREE.Color('#ffa24a') }, uDim: { value: 1 } }]),
    vertexShader: `uniform float uTime, uScale; attribute vec4 aF; varying float vI; varying float vK; varying float vAir; varying float vW;
      #include <fog_pars_vertex>
      void main() {
        float ph = aF.y, fl = 0.82 + 0.1 * sin(uTime * 11.0 + ph) + 0.08 * sin(uTime * 23.0 + ph * 2.3);
        vec3 transformed = position + vec3(0.0, 0.015 * sin(uTime * 7.0 + ph), 0.0);
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        float d = -mvPosition.z, px = aF.x * fl * uScale / max(d, 0.1), lantern = step(1.5, aF.w);
        float core = max(px, mix(2.2, 3.2, lantern)), S = clamp(core * mix(3.5, 6.0, lantern), 7.0, 64.0);
        vK = core / S; vI = fl * (1.0 + 1.2 * clamp((4.0 - px) / 4.0, 0.0, 1.0)) * (1.0 + 0.5 * lantern); vAir = aF.z; vW = aF.w;
        gl_PointSize = S;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uCol, uWarm; uniform float uDim; varying float vI; varying float vK; varying float vAir; varying float vW;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        // the flame's body: narrow, tapering to a tip above, round below (point coord y runs down)
        vec2 f = c / vK; f.y -= 0.35; float up = max(-f.y, 0.0); f.x *= 2.1 * (1.0 + 0.9 * up); f.y *= f.y > 0.0 ? 1.6 : 0.62;
        float body = exp(-dot(f, f) * 1.4), heart = exp(-dot(f + vec2(0.0, -0.35), f + vec2(0.0, -0.35)) * 4.0);
        float halo = exp(-dot(c, c) * mix(6.0, 3.0, step(1.5, vW))) * mix(0.18, 0.35, step(1.5, vW));
        vec3 tint = mix(uCol, uWarm, step(0.5, vW) * step(vW, 1.5));
        vec3 col = (tint * (body * 1.8 + halo) + vec3(0.95, 1.0, 0.92) * heart * 1.2) * vI * uDim;
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

  // ---- the lights: one between each two pairs' candles along the road, the raft's, the door's, the great candles
  // (warm, set high to reach the sun), the lit coffin adrift, the sconces either side of the sun (warm), the lantern;
  // the far brackets have only their baked glow
  const lights = [];
  const addLight = (x, y, z, i, d, col = FLAME) => { const L = new THREE.PointLight(new THREE.Color(col), i, d, 2); L.position.set(x, y, z); L.name = 'coffin-road-light'; scene.add(L); lights.push({ L, i, ph: rng() * 6 }); };
  const fl = (k) => CANDLES.map((c, i) => ({ c, i })).filter(({ c }) => c[2] === k);
  const prick = fl(0);
  for (let i = 0; i < prick.length; i += 2) { const a = prick[i].c, b = prick[Math.min(prick.length - 1, i + 1)].c; addLight((a[0] + b[0]) / 2, top + 0.8, (a[1] + b[1]) / 2, 3.2, 9); }
  const tall = fl(1);
  for (let i = 0; i < tall.length; i += 2) { const a = tall[i].c, b = tall[i + 1].c; addLight((a[0] + b[0]) / 2, top + 1.2, (a[1] + b[1]) / 2, 3.6, 9); }
  addLight(ROAD.x1 + 0.9, top + 3.2, ROAD.zc, 9, 16, '#ffa24a');
  for (const { c } of fl(3)) addLight(c[0], top + 0.8, c[1], 2.4, 8);
  for (const { c } of fl(4)) if (WARM(c[0], c[1], 4)) addLight(c[0] - 0.4, top + FLAME_Y[4], c[1], 4, 11, '#ffa24a');
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
  const below = installBelow(ctx);
  below.add(boxBelow(DOOR.x - DOOR.half - 0.6, DOOR.x + DOOR.half + 0.6, DOOR.z - 0.2, DOOR.z + DOOR.depth + 3, -4, 1, 0.6), { size: 0.35 }); // a narrow passage: a smaller room
  below.keep(mesh); below.keep(gold); below.keep(flames);

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

  const tris = (geo.attributes.position.count + gold.geometry.attributes.position.count) / 3;
  ctx.coffinRoad = {
    head, floor, stairY, laid, candles: CANDLES, lights: lights.map((l) => l.L), mesh, flames, state: S,
    stats: () => ({ calls: 3, tris: Math.round(tris), flames: F.length, coffins: laid, candles: CANDLES.length, lights: lights.length, colliders }),
  };
  ctx.log?.(`coffin road: ${laid} coffins, ${CANDLES.length} candles, ${lights.length} lights, ${Math.round(tris)} tris, stair ${(yHead - ROAD_Y).toFixed(1)} m down over ${(xHead - FOOT_X).toFixed(1)} m, ${(performance.now() - t0).toFixed(0)} ms`);
}
