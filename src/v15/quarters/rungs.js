// The Rungs (v15-Q2): the Lappet's body, the stacked houses on the Mid and Low Rungs of the Elder stair, each one's
// roof the yard of the tread above, and the ways the Late folk threaded through them. Every coordinate is the plan's
// (src/v15/plan.js: the `rungs-*` plots and RUNGS, the quarter's own records); the houses are the kit's
// (src/v15/houses/ makePlot), the flights, planks and rails the ways' kit (src/v15/ways/). What is made here:
//   the houses      twelve Late houses against their risers, no two alike: each its own wash (CHARACTER), door
//                   head and things built into or onto it (Elder blocks under one, Heliarch quoins and lintels, a
//                   Noonwright collar for a window, a timber jetty, an upper room, a cupola, a loggia, dye run down
//                   the dyers' walls, soot over every lamp); a second row of small lights high in each front;
//                   two carry the plan's front stair, each registered as a way
//   the Cantle      a carrier's sherd standing as an apse over the High Rung, a plaster house in its lap, the gap
//                   behind its flanks packed
//   the Leads       the roof walk on the Low Rung's roofs (the Mid Rung's level): plank crossings with a stile at
//                   each end, a dovecote, drying trays, a loom
//   the Gullet      a mud stair straight down the slot between the two houses at the corner: mean, and whole
//   the Tenter      the dyers' stair down the Mid Rung's riser on the east run, cloth on tenter lines down its
//                   length, vats at its foot, their runnels across the lane to a drain
//   the Pier Stair  Heliarch treads let into the aqueduct's last pier's faces, the lowest gone: seen from the Lees
//                   between the Late timber of the Tenter and the Noonwrights' main
//   the Slype       the lane under the main: a door in the step, a niche with a light in it
//   the Squint      a bench at the west end of rungs-low-7's roof, over the Pier Stair, the Tenter and the main
//   the lanes       flags laid over the Elder treads where feet go, more of them lost than kept
//   and what the bones left: the ladder (up the rim to the crown) its poles stop a walker, a hand-rope, a worn stone say it is climbed
// Draws: `rungs-houses` and `rungs-ways` (the stone shader). No point light: every slot in reach of P9 and K1 is
// spoken for (tools/house-test.mjs), so the lamps and windows are emissive. ctx.rungs = { records, stats() }.
// ?rungs=0 leaves the quarter out.
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { makePlot, registerAll } from '../houses/index.js';
import { L, H, V, N, E as EL, PARTS, rngOf, ch, leaned, worn, limeGlow, beam, pot, leaf, hangLamp, facade, dirty, patch } from '../houses/kit.js';
const _p = new THREE.Vector3();
import { frame } from '../ways/stairs.js';

const I4 = new THREE.Matrix4();
const BODY = 0.5; // a walker's half width, and a little
// each house is its seed (the door's place, the things on its roof): the seeds are the ones whose stair and jar
// stand clear of the neighbours and the crossings (found by trying; a new seed wants the Leads walked again)
const HOUSES = {
  'rungs-mid-1': { seed: 3 }, 'rungs-mid-2': { seed: 8 }, 'rungs-mid-3': { seed: 5 }, 'rungs-mid-4': { seed: 13 }, 'rungs-mid-6': { seed: 7 }, 'rungs-mid-7': { seed: 15 },
  'rungs-low-1': { seed: 21 }, 'rungs-low-2': { seed: 9 }, 'rungs-low-3': { seed: 16 }, 'rungs-low-4': { seed: 33 }, 'rungs-low-5': { seed: 11 }, 'rungs-low-7': { seed: 6 },
  'rungs-cantle': { seed: 4, form: 'sherd', glaze: 3 },
};
// and its character, so the steps are not one white house twelve times: wash (little pure white: limewash gone grey,
// rose, saffron, ochre, all dirty), door (the head) and win, which the kit takes; the rest is built here on its front
// or roof. No two neighbours share a wash or a door.
const hex = (h) => new THREE.Color(h);
const CHARACTER = {
  'rungs-mid-1': { wash: hex('#a9a294'), door: 'horseshoe', quoins: 1 },
  'rungs-mid-2': { wash: hex('#c79a86'), door: 'rect', lintel: true, collar: true, cupola: true },
  'rungs-mid-3': { wash: hex('#c9a45a'), door: 'ogee', win: 'round' },
  'rungs-mid-4': { wash: hex('#d6cbb0'), door: 'horseshoe', elder: true, jetty: [0.1, 1], room: true },
  'rungs-mid-6': { wash: hex('#bdb6a6'), door: 'rect', lintel: true, dye: ['#8e3b2c', '#b9973a', '#3d5a8a'], loggia: true },
  'rungs-mid-7': { wash: hex('#b08f84'), door: 'horseshoe', quoins: 1, room: true },
  'rungs-low-1': { wash: hex('#c8a85e'), door: 'ogee', elder: true },
  'rungs-low-2': { wash: hex('#9d988d'), door: 'rect', lintel: true, jetty: [-1, -0.05], win: 'round' },
  'rungs-low-3': { wash: hex('#d2c4a4'), door: 'horseshoe', quoins: 1, collar: true },
  'rungs-low-4': { wash: hex('#c08f7c'), door: 'rect', lintel: true },
  'rungs-low-5': { wash: hex('#b7a57c'), door: 'ogee', elder: true, quoins: -1 },
  'rungs-low-7': { wash: hex('#c4bdaa'), door: 'rect', lintel: true, dye: ['#8e3b2c', '#3d5a8a', '#b9973a'], jetty: [0.15, 1] },
};

export async function build(ctx) {
  if (new URL(location.href).searchParams.get('rungs') === '0') return;
  if (ctx.built) await ctx.built('lappet');
  const lap = ctx.lappet;
  if (!lap || lap.on === false || !ctx.strata?.on || !lap.ways.kit) return;
  const P = lap.plan, { at, RUN, LEVEL, RISERS, RUNGS, cornerS } = P, low = ctx.quality === 'low';
  const yH = LEVEL.high.y, yM = LEVEL.mid.y, yL = LEVEL.low.y, DM = RISERS[2].D, DL = RISERS[3].D; // the Mid and Low Rungs' nosings
  // a run's own frame at (s, D, y): local +x out from the hill (D), +z along the run (s)
  const RM = (run, s, D, y) => { const [x, z] = at(run, s, D); return frame(x, y, z, RUN[run].dir[0], RUN[run].dir[1]); };
  const W3 = (run, s, D, y) => { const [x, z] = at(run, s, D); return [x, y, z]; };
  const B = ctx.strata.builder(), E = ctx.strata.builder();
  const K = lap.ways.kit('rungs-ways', 62), KB = K.B, ways = lap.ways, rng = rngOf(1511, 3);
  const box = (w, h, d, o = {}) => KB.box(w, h, d, { seg: 9, ...o }); // (a plank is twelve triangles)
  const jit = (c, k) => c.clone().multiplyScalar(k);
  const wood = (k = 1) => ({ color: jit(L.wood, k * (0.8 + rng() * 0.4)), moss: 0.2, ground: yL - 2 });
  const raw = () => ({ color: worn(V.rawWood, rng, 0.35, 0.2), moss: 0.12, ground: yL - 2, round: 5 });

  // ---------------------------------------------------------------- the houses
  const records = {}, list = [];
  for (const p of P.PLOTS) {
    const o = HOUSES[p.name]; if (!o || p.quarter !== 'rungs') continue;
    const c = CHARACTER[p.name] || {}, seed = o.seed;
    const R = makePlot(B, p, { plan: P, built: lap.built, E, low, ...o, ...(c.wash ? { wash: c.wash } : {}), ...(c.door ? { door: c.door } : {}), ...(c.win ? { win: c.win } : {}) });
    R.lamps.forEach((lamp, i) => hangLamp(B, { ...lamp, y: lamp.y + 0.24 }, ['amber', 'amber', 'ruby', 'emerald'][(seed + i) % 4], 0.5)); // (hung short: the kit's hook is at 2.25 m and its lamp would hang at a walker's brow)
    records[p.name] = R; list.push(R);
  }
  registerAll(ctx, list, 'rungs');
  // a house's own frame, and its roof's level in the world
  const MP = (R) => mat(R.plot.x, R.plot.y, R.plot.z, 0, R.plot.yaw, 0);
  const loc = (R, x, z) => { const dx = x - R.plot.x, dz = z - R.plot.z, c = Math.cos(R.plot.yaw), s = Math.sin(R.plot.yaw); return [dx * c - dz * s, dx * s + dz * c]; };
  const roofY = (R) => R.plot.y + R.roof.y;
  // is a point on a roof clear of what the kit stood there (a bed, a jar, a pole), by `rad`
  const clearOn = (R, x, z, rad) => R.colliders.every((c) => c.r === undefined || c.x === undefined || c.y === undefined || Math.abs(c.y - roofY(R)) > 0.6 || Math.hypot(c.x - x, c.z - z) >= c.r + rad);
  const taken = []; // what this file has stood on a roof: [x, z, r]
  const freeOn = (R, x, z, rad) => clearOn(R, x, z, rad) && taken.every((t) => Math.hypot(t[0] - x, t[1] - z) >= t[2] + rad);

  // a second row of lights high in each front: small panes in plaster frames stood proud of the wall (the fronts are
  // four metres high and the kit's windows stop at two and a half)
  for (const R of list) {
    if (R.kind !== 'late' || !R.front) continue;
    const F = R.front, M = MP(R), r2 = rngOf(R.seed, 77), stair = R.floors.some((q) => q.steps), xs = [];
    if (stair) { const d0 = R.doors[0]; if (d0) xs.push(loc(R, d0.x, d0.z)[0]); }
    else { const w = F.x1 - F.x0; xs.push(F.x0 + w * (0.2 + r2() * 0.1), F.x0 + w * (0.72 + r2() * 0.1)); if (w > 5 && !low) xs.push(F.x0 + w * (0.46 + r2() * 0.06)); }
    for (const [ix, x] of xs.entries()) {
      const pw = 0.34 + r2() * 0.14, ph = 0.42 + r2() * 0.22, y = Math.min(F.h - ph - 0.5, 2.95 + r2() * 0.25), zF = F.cz + (F.zf - F.cz) * (1 - F.k * (y + ph / 2)), lit = r2() < 0.62, k = 0.35 + r2() * 0.4;
      const fc = { color: worn(L.plaster[3], r2, 0.22, 0.1), moss: 0.1, ground: R.plot.y, emit: limeGlow(L.plaster[3], 0.05) }, xx = F.cx + (x - F.cx) * (1 - F.k * y);
      if (ix === 0 && CHARACTER[R.name]?.collar) { // a Noonwright collar for a window: a ring of the old glazed ware set in the wall, a pane in its eye
        const gz = N.celadon || N.celadonD, T2 = ch(M, xx, y + ph / 2, zF + 0.03);
        B.add(new THREE.TorusGeometry(0.4, 0.11, low ? 5 : 7, low ? 10 : 16), T2, { color: worn(gz, r2, 0.15), moss: 0.1, wet: 0.7, ground: R.plot.y });
        B.add(new THREE.TorusGeometry(0.4, 0.035, 4, low ? 10 : 16), ch(T2, 0, 0, 0.1), { color: worn(N.oxblood, r2, 0.1), moss: 0, wet: 0.8, ground: R.plot.y });
        B.add(B.cyl(0.31, 0.31, 0.04, low ? 8 : 12, 1), ch(T2, 0, 0, -0.01, Math.PI / 2, 0, 0), { color: new THREE.Color('#3a2410'), moss: 0, ground: R.plot.y - 3, emit: [V.lit[0] * 0.5, V.lit[1] * 0.5, V.lit[2] * 0.5, 1] });
        R.windows.push({ ...R.W(xx, y + ph / 2, zF), lit: true }); continue;
      }
      for (const sx of [-1, 1]) B.add(B.box(0.09, ph + 0.18, 0.09, { seg: 9 }), ch(M, xx + sx * (pw / 2 + 0.045), y + ph / 2, zF + 0.012), fc);
      for (const sy of [-1, 1]) B.add(B.box(pw + 0.24, 0.09, 0.11, { seg: 9 }), ch(M, xx, y + ph / 2 + sy * (ph / 2 + 0.045), zF + 0.02), fc);
      B.add(B.box(pw + 0.02, ph + 0.02, 0.04, { seg: 9 }), ch(M, xx, y + ph / 2, zF + 0.012), { color: lit ? new THREE.Color('#3a2410') : V.pane, moss: 0, ground: R.plot.y - 3, emit: lit ? [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] : undefined });
      B.add(B.box(0.03, ph + 0.02, 0.03, { seg: 9 }), ch(M, xx, y + ph / 2, zF + 0.04), { color: V.soot, moss: 0, ground: R.plot.y - 3 });
      R.windows.push({ ...R.W(xx, y + ph / 2, zF), lit });
    }
  }
  // ------------------------------------------------ what each house is built of and from (CHARACTER)
  // a frame on a front at (x, y): +z out of the wall, +y up its batter; on an end wall (sg: which end) at (z, y)
  const ML = (R) => leaned(MP(R), R.lean?.[0] || 0, R.lean?.[1] || 0); // (the house's frame as the kit built it: out of true)
  const FM = (R, x, y, out = 0) => { const F = R.front, q = 1 - F.k * y; return ch(ML(R), F.cx + (x - F.cx) * q, y, F.cz + (F.zf - F.cz) * q + out, -Math.atan(F.k * (F.zf - F.cz)), 0, 0); };
  const endX = (R) => R.front.x1 - 0.04; // (the side walls stand 40 mm in from the front's ends: late.js)
  const EM = (R, sg, z, y, out = 0) => { const F = R.front, q = 1 - F.k * y; return ch(ML(R), F.cx + (sg * endX(R) - F.cx) * q + sg * out, y, F.cz + (z - F.cz) * q, 0, sg * Math.PI / 2, 0).multiply(mat(0, 0, 0, -Math.atan(F.k * endX(R)), 0, 0)); };
  const doorX = (R) => (R.doors[0] ? loc(R, R.doors[0].x, R.doors[0].z)[0] : 99), stairOf = (R) => R.floors.find((q) => q.steps);
  const rooms = [];
  for (const R of list) {
    const c = CHARACTER[R.name]; if (!c || !R.front) continue;
    const F = R.front, r2 = rngOf(R.seed, 91), g0 = R.plot.y, dx = doorX(R), dw = R.doors[0]?.w || 1, wash = c.wash, stair = !!stairOf(R), h = F.h;
    // a stain laid on the front: a thin slab turned a few degrees out of the wall's plane, one edge in the plaster. (The kit
    // paints its own streaks and damp as sheets 30 mm and more off the wall, 6 mm apart: anything parallel to the wall
    // out there lies in one of their planes.)
    let ov = 0; const lay = (M, wd, l, y, o) => { const a = (ov++ % 2 ? -1 : 1) * (0.06 + (ov % 3) * 0.012); B.add(B.box(wd, l, 0.02), ch(M, 0, y, 0.012 + wd * 0.5 * Math.abs(a), 0, a, 0), o); };
    const stoneH = (k = 1) => ({ color: jit(H.stone, k * (0.85 + r2() * 0.2)), course: 0, moss: 0.4, ground: g0 }), tim = (k = 1) => ({ color: jit(V.rawWood.clone().lerp(L.wood, 0.45), k * (0.7 + r2() * 0.3)), moss: 0.15, ground: g0 - 2 }); // (weathered grey-brown: the kit's dark wood made the jetty a black box from the square)
    // Elder blocks for a ground storey: two courses of the old dark stone, the plaster begun on top of them
    if (c.elder && !stair) for (let x = F.x0 + 0.05; x < F.x1 - 0.4;) { const bw = Math.min(F.x1 - 0.05 - x, 0.85 + r2() * 0.6), xc = x + bw / 2; x += bw;
      if (Math.abs(xc - dx) < dw / 2 + 0.5 + bw / 2) continue;
      const h1 = 0.62 + r2() * 0.1; B.add(B.box(bw - 0.03, h1 + 0.3, 0.34, { chip: 0.05, seed: R.seed + x * 7 | 0 }), ch(FM(R, xc, 0), 0, h1 / 2 - 0.15, 0), { color: jit(EL.stone, 0.62 + r2() * 0.2), course: 0, moss: 0.55, ground: g0 });
      if (r2() < 0.7) { const h2 = 0.36 + r2() * 0.16, b2 = bw * (0.6 + r2() * 0.4); B.add(B.box(b2 - 0.03, h2, 0.3, { chip: 0.05, chipTop: true, seed: R.seed + x * 3 | 0 }), ch(FM(R, xc + (r2() - 0.5) * (bw - b2), h1), 0, h2 / 2 - 0.01, -0.02), { color: jit(EL.stone, 0.6 + r2() * 0.25), course: 0, moss: 0.5, ground: g0 }); } }
    // Heliarch ashlar for a corner: long and short, a few gone to plaster again
    if (c.quoins) for (let i = 0, y = 0; y < h + 0.15; i++) { const bh = 0.4 + r2() * 0.06, len = i % 2 ? 0.48 : 0.8; if (r2() < 0.85) B.add(B.box(len, bh - 0.025, 0.36, { chip: 0.035, seed: i + R.seed }), ch(FM(R, c.quoins * (F.x1 - len / 2 + 0.07), y), 0, bh / 2, -0.06), stoneH()); y += bh; }
    // a flat lintel of somebody's stone on two worn capitals
    if (c.lintel && dx < 90) { const yl = Math.min(h - 0.9, 2.16); B.add(B.box(dw + 0.78, 0.3, 0.34, { chip: 0.04, seed: R.seed }), ch(FM(R, dx, yl), 0, 0.15, 0.02), stoneH(1.05));
      for (const sx of [-1, 1]) B.add(B.box(0.26, 0.2, 0.3, { chip: 0.05, seed: R.seed + sx }), ch(FM(R, dx + sx * (dw / 2 + 0.2), yl - 0.2), 0, 0.1, 0.01), stoneH(0.9));
      B.add(B.box(dw * 0.5, 0.05, 0.02), ch(FM(R, dx, yl + 0.15), 0, 0, 0.19), { color: H.bronze, iron: 0.3, moss: 0.05, ground: g0 }); }
    // a timber upper storey jettied over the lane: joists and braces, boards, a shuttered light
    if (c.jetty && !stair) { const xa = F.x0 + (F.x1 - F.x0) * (c.jetty[0] + 1) / 2 + 0.25, xb = F.x0 + (F.x1 - F.x0) * (c.jetty[1] + 1) / 2 - 0.25, wj = xb - xa, y0 = 2.5, y1 = h + 0.42, dj = 0.62, J = FM(R, (xa + xb) / 2, y0), V0 = ch(ML(R), (xa + xb) / 2, y0, F.cz + (F.zf - F.cz) * (1 - F.k * y0));
      const nj = Math.max(3, Math.round(wj / 0.6));
      for (let i = 0; i <= nj; i++) { const x = -wj / 2 + 0.06 + (i / nj) * (wj - 0.12); beam(B, V0, [x, -0.07, -0.25], [x, -0.07, dj + 0.1], 0.11, tim(0.8)); if ((i === 0 || i === nj || i === (nj >> 1)) && Math.abs((xa + xb) / 2 + x - dx) > dw / 2 + 0.25 && !R.windows.some((wn) => Math.abs(loc(R, wn.x, wn.z)[0] - (xa + xb) / 2 - x) < 0.65 && wn.y - g0 < y0 + 0.3 && wn.y - g0 > y0 - 1.6)) beam(B, V0, // (a brace's foot wants wall: not in a door or a window)
        [x, -0.75, -0.02], [x, -0.1, dj - 0.08], 0.09, tim(0.7)); }
      B.add(B.box(wj, y1 - y0, dj + 0.2, { chip: 0.01 }), ch(V0, 0, (y1 - y0) / 2, dj / 2 - 0.1), tim(0.95));
      const wx = (r2() - 0.5) * (wj - 1.4), wy = (y1 - y0) * 0.5, k = 0.45 + r2() * 0.3;
      const nb = Math.round(wj / 0.24); for (let i = 0; i <= nb; i++) if (r2() < 0.8 && Math.abs(-wj / 2 + (i / nb) * wj - wx) > 0.62) B.add(B.box(0.035, y1 - y0 - 0.06, 0.025), ch(V0, -wj / 2 + (i / nb) * wj, (y1 - y0) / 2, dj + 0.008), tim(i % 4 ? 1.25 : 1.9));
      B.add(B.box(wj + 0.3, 0.06, dj + 0.45), ch(V0, 0, y1 - y0 + 0.02, dj / 2 + 0.02, 0.1, 0, 0), tim(1.3));
      B.add(B.box(0.5, 0.6, 0.05), ch(V0, wx, wy, dj + 0.03), { color: new THREE.Color('#3a2410'), moss: 0, ground: g0 - 3, emit: [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] });
      for (const sx of [-1, 1]) B.add(B.box(0.3, 0.64, 0.03), ch(V0, wx + sx * 0.27, wy, dj + 0.06, 0, sx * -0.9, 0).multiply(mat(sx * 0.14, 0, 0)), { color: worn(L.paint[(R.seed + 1) % 4], r2, 0.4), moss: 0.05, ground: g0 - 2 });
      R.windows.push({ ...R.W((xa + xb) / 2 + wx, y0 + wy, F.zf + dj), lit: true }); }
    // dye: run down the wall from the parapet where cloth was hung over it wet, and splashed at the foot
    if (c.dye) { for (let i = 0; i < (low ? 3 : 6); i++) { const x = F.x0 + 0.4 + r2() * (F.x1 - F.x0 - 0.8), col = hex(c.dye[i % c.dye.length]).lerp(wash, 0.5 + r2() * 0.25); let y = h + 0.3 - r2() * 0.5, wd = 0.2 + r2() * 0.5;
        if (Math.abs(x - dx) < dw / 2 + 0.45 || (c.jetty && !stair)) { if (c.jetty && y > 2.4) y = 2.2; }
        for (let j = 0; j < 4 && y > 0.4; j++) { const l = 0.45 + r2() * 0.5; if (Math.abs(x - dx) < dw / 2 + 0.4 && y - l < 2.4) break; lay(FM(R, x + (r2() - 0.5) * 0.04, y), wd, l, -l / 2, { color: col.clone().lerp(wash, j * 0.18), moss: 0, ground: g0 - 3 }); y -= l - 0.02; wd *= 0.62; } }
      for (let i = 0; i < 2; i++) { const x = F.x0 + 0.6 + r2() * (F.x1 - F.x0 - 1.2); if (Math.abs(x - dx) > dw / 2 + 0.7) patch(B, ch(FM(R, x, 0.35 + r2() * 0.3), 0, 0, 0.02, 0, 0.09, 0), 0.3 + r2() * 0.15, r2, { color: hex(c.dye[i]).lerp(wash, 0.25), moss: 0, ground: g0 - 3 }); } }
    // soot over the lamp
    for (const lamp of R.lamps) { const [lx, lz] = loc(R, lamp.x, lamp.z), ly = lamp.y + 0.24 - g0; if (ly + 0.9 > h + 0.2 || Math.abs(lz - F.zf) > 0.7 || Math.abs(lx - dx) < dw / 2 + 0.3) continue; // (only where the lamp hangs before this front, and not over the door)
      lay(FM(R, lx, ly + 0.2), 0.26, 0.5, 0.25, { color: wash.clone().lerp(V.soot, 0.45), moss: 0, ground: g0 - 3 });
      lay(FM(R, lx + 0.02, ly + 0.66), 0.14, 0.4, 0.2, { color: wash.clone().lerp(V.soot, 0.25), moss: 0, ground: g0 - 3 }); }
    // an upper room on the roof (the roof is the tread above's level: it stands a storey over that lane too)
    if (c.room && R.roof) { const rf = R.roof, rw = Math.min(2.9, (rf.x1 - rf.x0) * 0.56), rd = Math.min(1.9, rf.zf - rf.zb - 0.5), rh = 2.25 + r2() * 0.3;
      for (const sg of [1, -1]) { const cx = sg * (rf.x1 - rw / 2 - 0.12), cz = rf.zb + rd / 2 + 0.55; let ok = true;
        for (let u = -1; u <= 1 && ok; u += 0.5) for (let v = -1; v <= 1 && ok; v += 1) { const q = R.W(cx + u * rw / 2, 0, cz + v * rd / 2); ok = clearOn(R, q.x, q.z, 0.3); }
        if (!ok) continue;
        const M = ch(MP(R), cx, rf.y, cz), col = worn(wash.clone().lerp(L.plaster[(R.seed + 1) % 3], 0.5), r2, 0.25), o = { color: col, moss: 0.15, ground: g0, emit: limeGlow(col, 0.06) };
        B.add(B.box(rw, rh + 0.3, rd, { seg: 1.5, chip: 0.05, chipTop: true, seed: R.seed }), ch(M, 0, rh / 2 - 0.15, 0), { ...o, disp: 0.018, dispScale: 1.4 });
        B.add(B.box(rw + 0.16, 0.12, rd + 0.16, { chip: 0.03 }), ch(M, 0, rh + 0.02, 0), { color: worn(V.mud, r2, 0.2), moss: 0.25, ground: g0 });
        const k = 0.4 + r2() * 0.3; // a light toward the valley, a door on the roof's side, a pole and a rag
        B.add(B.box(0.42, 0.55, 0.05), ch(M, -sg * rw * 0.15, 1.35, rd / 2 + 0.005), { color: new THREE.Color('#3a2410'), moss: 0, ground: g0 - 3, emit: [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] });
        for (const sy of [-1, 1]) B.add(B.box(0.6, 0.08, 0.09), ch(M, -sg * rw * 0.15, 1.35 + sy * 0.32, rd / 2 + 0.02), { ...o, color: jit(col, 0.9) });
        B.add(B.box(0.06, 1.75, 0.8), ch(M, -sg * (rw / 2 + 0.005), 0.86, 0.1), { color: worn(L.paint[R.seed % 4], r2, 0.4), moss: 0.05, ground: g0 - 2 });
        B.add(B.box(0.09, 1.9, 0.98), ch(M, -sg * (rw / 2 - 0.02), 0.93, 0.1), { ...o, color: jit(col, 0.82) });
        beam(B, M, [sg * (rw / 2 - 0.2), rh, -rd / 2 + 0.2], [sg * (rw / 2 - 0.1), rh + 1.5, -rd / 2 + 0.15], 0.06, raw());
        const a = R.W(cx - rw / 2 + rd / 2, rf.y, cz), b2 = R.W(cx + rw / 2 - rd / 2, rf.y, cz); ctx.addCollider({ x1: a.x, z1: a.z, x2: b2.x, z2: b2.z, r: rd / 2 + 0.02, y: a.y - 0.2, h: rh + 0.4, stand: false });
        R.windows.push({ ...R.W(cx - sg * rw * 0.15, rf.y + 1.35, cz + rd / 2), lit: true }); rooms.push(R.name); break; } }
  }
  // an end wall with nothing built against it is not left blank: a small light, putlog ends, a streak, a patch
  for (const R of list) {
    const c = CHARACTER[R.name], p = R.plot && P.plot(R.name); if (!c || !R.front || !p) continue;
    const F = R.front, r2 = rngOf(R.seed, 93), g0 = R.plot.y, sS = Math.sign(loc(R, ...at(p.run, p.s + 3, p.D))[0]) || 1;
    for (const sg of [-1, 1]) {
      if ((p.name === 'rungs-low-4' || p.name === 'rungs-low-5') && Math.sign(loc(R, ...at(1, cornerS(1, DM), DM))[0]) === sg) continue; // (the Gullet's two walls have their own)
      const ds = sg * sS, near = P.PLOTS.some((q) => q !== p && q.quarter === 'rungs' && q.kind !== 'yard' && q.run === p.run && q.level === p.level && (q.s - p.s) * ds > 0 && Math.abs(q.s - p.s) - (q.w + p.w) / 2 < 1.3);
      if (near) continue;
      const z0 = F.cz + 0.5, z1 = F.zf - 0.55, zAt = (u) => z0 + (z1 - z0) * u, wash = c.wash; let zw = 0;
      // (a run of dirt lies a few degrees out of the wall's plane, one edge in the wall: the side wall's face wanders
      // some centimetres either way of its plane, and a sheet laid flat on that plane is buried in one place, hung clear
      // of it in another, and in the plane of the face in a third)
      const tilt = (i) => (i % 2 ? -1 : 1) * (0.07 + i * 0.012);
      { const z = zw = zAt(0.3 + r2() * 0.4), y = 2.5 + r2() * 0.5, pw = 0.36, ph = 0.5, k = 0.35 + r2() * 0.4, M = EM(R, sg, z, y), fc = { color: worn(L.plaster[3], r2, 0.25, 0.1), moss: 0.1, ground: g0, emit: limeGlow(L.plaster[3], 0.05) };
        for (const sx of [-1, 1]) B.add(B.box(0.09, ph + 0.18, 0.09, { seg: 9 }), ch(M, sx * (pw / 2 + 0.045), ph / 2, 0.012), fc);
        for (const sy of [-1, 1]) B.add(B.box(pw + 0.24, 0.09, 0.11, { seg: 9 }), ch(M, 0, ph / 2 + sy * (ph / 2 + 0.045), 0.02), fc);
        B.add(B.box(pw + 0.02, ph + 0.02, 0.04, { seg: 9 }), ch(M, 0, ph / 2, 0.012), { color: new THREE.Color('#3a2410'), moss: 0, ground: g0 - 3, emit: [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] });
        B.add(B.box(0.03, ph + 0.02, 0.03, { seg: 9 }), ch(M, 0, ph / 2, 0.04), { color: V.soot, moss: 0, ground: g0 - 3 }); }
      for (let i = 0; i < 3; i++) { const M = EM(R, sg, zAt(0.12 + i * 0.36 + r2() * 0.06), 3.25 + r2() * 0.12); beam(B, M, [0, 0, -0.3], [0, -0.02, 0.18 + r2() * 0.12], 0.09, raw()); }
      for (let i = 0; i < 3; i++) { const l = 0.7 + r2() * 1.2; let z = zAt(0.1 + r2() * 0.8); if (Math.abs(z - zw) < 0.6) z = zw + (z < zw ? -1 : 1) * (0.6 + i * 0.08); // (a run of dirt stands clear of the window: over its frame it lay in the frame's plane)
        const M = EM(R, sg, z, F.h + 0.25); B.add(B.box(0.1 + r2() * 0.12, l, 0.02), ch(M, 0, -l / 2, 0.02, 0, tilt(i), 0), { color: wash.clone().lerp(V.dirt, 0.4 + r2() * 0.2).multiplyScalar(0.8), moss: 0.3, ground: g0 - 3 }); }
      patch(B, ch(EM(R, sg, zAt(0.2 + r2() * 0.6), 1.0 + r2() * 0.5), 0, 0, 0.03), 0.32 + r2() * 0.2, r2, { color: worn(V.mud, r2, 0.3), moss: 0.2, course: 0.25, ground: g0 });
    }
  }
  // the plan's front stairs, each a way between two treads
  for (const R of list) {
    const f = R.floors.find((q) => q.steps); if (!f) continue;
    const p = P.plot(R.name), dx = f.s, dz = f.c, hx = f.x + dx * f.d / 2, hz = f.z + dz * f.d / 2, fx = f.x - dx * f.d / 2, fz = f.z - dz * f.d / 2;
    ctx.ascents?.add({ id: `${R.name}-stair`, held: true, offs: [0.5], path: [[fx - dx * 1.3 + p.face[0] * 0.3, fz - dz * 1.3 + p.face[1] * 0.3, p.y], [fx, fz, p.y], [hx + dx * 0.2, hz + dz * 0.2, f.y1], [hx + dx * 0.7, hz + dz * 0.7, f.y1], [hx + dx * 0.6 - p.face[0] * 1.35, hz + dz * 0.6 - p.face[1] * 1.35, f.y1]] }); // (the last: through the parapet's gap onto the roof)
    taken.push([hx + dx * 0.6 - p.face[0] * 1.2, hz + dz * 0.6 - p.face[1] * 1.2, 0.8]); // (nothing of this file's is stood on the roof where the stair comes onto it: the dovecote stood in the way)
  }

  // ---------------------------------------------------------------- floors of this file's own: level rectangles
  // ([cx, cz] centre, [ux, uz] along, half length, half width, y), one stacked floor for the lot (none lies over another)
  const rects = [];
  const rect = (cx, cz, ux, uz, hl, hw, y) => rects.push({ cx, cz, ux, uz, hl, hw, y });
  K.addFloor((x, z) => { let y = null; for (const r of rects) { const dx = x - r.cx, dz = z - r.cz, a = dx * r.ux + dz * r.uz; if (a > r.hl || a < -r.hl) continue; const b = dx * r.uz - dz * r.ux; if (b <= r.hw && b >= -r.hw && (y === null || r.y > y)) y = r.y; } return y; }, { name: 'rungs-leads', keep: true });

  // ---------------------------------------------------------------- the Leads: crossings from roof to roof
  // Planks on two baulks laid from parapet to parapet, a stile of two plastered steps inside each (the parapets stand
  // half a metre over the roofs); a rope either side where it is long, a trestle under it where it is longer.
  const plaster = () => ({ color: worn(L.plaster[3], rng, 0.2, 0.1), moss: 0.2, ground: yM - 1, emit: limeGlow(L.plaster[3], 0.05) });
  function crossing(Ra, Rb, n) {
    const end = (R, O) => { // the roof's end toward the other roof, and the furthest forward a walker reaches it past the kit's things
      const [lx] = loc(R, O.plot.x, O.plot.z), x = lx > 0 ? R.roof.x1 : R.roof.x0, inw = lx > 0 ? -1 : 1;
      for (let z = R.roof.zf - 0.75; z >= R.roof.zb + 0.55; z -= 0.1) { let ok = true; for (let t = 0.2; t <= 1.6 && ok; t += 0.2) { const q = R.W(x + inw * t, 0, z); ok = clearOn(R, q.x, q.z, BODY + 0.65); } /* (v15-W1: a stile's foot 2 m clear of the roof's jars and washing poles: a body's width each side, not a hair) */ if (ok) return R.W(x, R.roof.y, z); }
      return R.W(x, R.roof.y, R.roof.zb + 0.55);
    };
    const A = end(Ra, Rb), Bq = end(Rb, Ra), len = Math.hypot(Bq.x - A.x, Bq.z - A.z), ux = (Bq.x - A.x) / len, uz = (Bq.z - A.z) / len, y = A.y, yd = y + 0.57, hw = 0.46;
    const F = frame(A.x, y, A.z, ux, uz); // +z along the deck
    for (const sd of [-1, 1]) KB.add(box(0.13, 0.15, len + 0.5, { chip: 0.02 }), F.clone().multiply(mat(sd * 0.3, 0.455, len / 2, 0, sd * 0.012, 0)), wood(0.8));
    const np = Math.round(len / 0.26);
    for (let i = 0; i < np; i++) { const pale = rng() < 0.15; KB.add(box(0.94 + rng() * 0.1, 0.045, len / np - 0.02, { chip: 0.01 }), F.clone().multiply(mat((rng() - 0.5) * 0.04, 0.552 - (i % 2) * 0.006, (i + 0.5) * len / np, 0, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.02)), { color: jit(L.wood, pale ? 2.0 : 1.0 + rng() * 0.6), moss: pale ? 0.02 : 0.15, ground: yM - 2 }); }
    rect(A.x + ux * len / 2, A.z + uz * len / 2, ux, uz, len / 2 + 0.02, hw, yd);
    for (const [E0, sg] of [[A, -1], [Bq, 1]]) { // the stiles
      const S = frame(E0.x, y, E0.z, ux * sg, uz * sg);
      // (two steps of 0.22: the upper one 0.13 under the deck and 0.06 under the parapet's top, so neither is a step too high whichever the walker meets)
      KB.add(box(1.0, 0.62, 0.36, { chip: 0.03, chipTop: true, seed: n + sg }), S.clone().multiply(mat(0, 0.13, 0.16)), plaster());
      KB.add(box(1.0, 0.36, 0.34, { chip: 0.03, chipTop: true, seed: n + sg + 2 }), S.clone().multiply(mat(0, 0.04, 0.5)), plaster());
      rect(E0.x + ux * sg * 0.17, E0.z + uz * sg * 0.17, ux, uz, 0.18, hw, y + 0.44);
      rect(E0.x + ux * sg * 0.5, E0.z + uz * sg * 0.5, ux, uz, 0.17, hw, y + 0.22);
    }
    if (len > 2.6) for (const sd of [-1, 1]) K.rail([[A.x + ux * 0.25 + uz * sd * 0.5, yd - 0.02, A.z + uz * 0.25 - ux * sd * 0.5], [Bq.x - ux * 0.25 + uz * sd * 0.5, yd - 0.02, Bq.z - uz * 0.25 - ux * sd * 0.5]], { h: 0.9, every: Math.max(1.3, len / 3) });
    if (len > 4.4) { // a trestle under its middle, on the Low Rung
      for (const sd of [-1, 1]) beam(KB, F, [sd * 0.34, 0.4, len / 2], [sd * 0.75, yL - y - 0.05, len / 2 + 0.1], 0.12, raw());
      beam(KB, F, [-0.6, yL - y + 1.2, len / 2 + 0.08], [0.6, yL - y + 2.6, len / 2 + 0.05], 0.07, raw());
      for (const sd of [-1, 1]) ctx.addCollider({ x: A.x + ux * len / 2 + uz * sd * 0.7, z: A.z + uz * len / 2 - ux * sd * 0.7, r: 0.1, y: yL - 0.3, h: 2.4 });
    }
    ctx.ascents?.add({ id: `rungs-leads-${n}`, held: true, offs: [0.5], path: [[A.x - ux * 0.9, A.z - uz * 0.9, y], [A.x + ux * len / 2, A.z + uz * len / 2, yd], [Bq.x + ux * 0.9, Bq.z + uz * 0.9, y]] });
    return { A, B: Bq, len };
  }
  const cross = RUNGS.leads.crossings.map(([a, b], i) => crossing(records[a], records[b], i + 1));

  // what roofs are for (beside the kit's bed, jar and washing): each tried at a few places on its roof and stood
  // where a walker still gets by
  const onRoof = (name, rad, fn, zs = [0.2, -0.3, -0.8], hgt = 1.2, solid = true) => {
    const R = records[name]; if (!R) return;
    const xs = [0, 0.9, -0.9, 1.6, -1.6, 2.1, -2.1];
    for (const z of zs) for (const x of xs) {
      const lx = (R.roof.x0 + R.roof.x1) / 2 + x, lz = (R.roof.zb + R.roof.zf) / 2 + z;
      if (lx < R.roof.x0 + rad + 0.3 || lx > R.roof.x1 - rad - 0.3) continue;
      const q = R.W(lx, R.roof.y, lz);
      if (!freeOn(R, q.x, q.z, rad + BODY * 2 - 0.1) || cross.some((c) => [c.A, c.B].some((e) => Math.hypot(e.x - q.x, e.z - q.z) < rad + 2.9))) /* (v15-W1: a walker steps off a stile and on 1.2 m clear: the dovecote stood in the Leads' second landing) */ continue;
      taken.push([q.x, q.z, rad]);
      fn(ch(MP(R), lx, R.roof.y, lz), q.y);
      if (solid) ctx.addCollider({ x: q.x, z: q.z, r: rad, y: q.y, h: hgt, stand: false }); // (its true height, and not stood on: a walker hopped onto a 1.2 m cap and stood inside the dovecote)
      return;
    }
  };
  // a dovecote: a plaster box on a stump of Heliarch drum, its holes in rows, a perch under each row
  onRoof('rungs-low-3', 0.5, (M, y) => {
    PARTS.heliarch.drum(KB, M, { r: 0.4, h: 0.7 });
    KB.add(box(0.95, 1.15, 0.8, { chip: 0.04, chipTop: true }), ch(M, 0, 1.27, 0), { color: worn(L.plaster[0], rng, 0.2), moss: 0.25, ground: y, emit: limeGlow(L.plaster[0], 0.05) });
    KB.add(box(1.15, 0.05, 1.0), ch(M, 0, 1.87, 0, 0.07, 0, 0), { color: worn(L.tile[1], rng, 0.4), moss: 0.2, ground: y });
    for (let r = 0; r < 3; r++) { KB.add(box(0.9, 0.03, 0.12), ch(M, 0, 0.92 + r * 0.3, 0.44), wood()); for (let c2 = 0; c2 < 3; c2++) KB.add(box(0.15, 0.17, 0.02), ch(M, -0.28 + c2 * 0.28, 1.03 + r * 0.3, 0.408), { color: V.soot, moss: 0, ground: y - 3 }); }
  }, undefined, 1.95);
  // drying trays: two racks of split cane on trestles, saffron on one and madder root on the other
  for (const [name, col] of [['rungs-low-2', V.saffron], ['rungs-low-4', V.madder]]) onRoof(name, 0.62, (M, y) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(KB, M, [sx * 0.5, 0, sz * 0.3], [sx * 0.45, 0.62, sz * 0.26], 0.05, raw());
    KB.add(box(1.15, 0.035, 0.72), ch(M, 0, 0.635, 0, 0.03, 0, 0), wood(1.3));
    KB.add(box(1.02, 0.03, 0.6, { seg: 0.3 }), ch(M, 0, 0.668, 0, 0.03, 0, 0), { color: worn(col, rng, 0.12), moss: 0, ground: y - 3, disp: 0.012, dispScale: 9, emit: limeGlow(col, 0.05) });
    // the stuff heaped on it in rows, not a painted board
    for (let i = 0; i < (low ? 4 : 9); i++) KB.add(new THREE.IcosahedronGeometry(0.13 + rng() * 0.05, 0), ch(M, -0.38 + (i % 3) * 0.38 + (rng() - 0.5) * 0.08, 0.7, -0.2 + Math.floor(i / 3) * 0.2 + (rng() - 0.5) * 0.05, 0, rng() * 3, 0, 1.25, 0.4, 1), { color: worn(col, rng, 0.05, 0.3), moss: 0, ground: y - 3, emit: limeGlow(col, 0.06) });
    for (const sz of [-1, 1]) KB.add(box(1.1, 0.05, 0.04), ch(M, 0, 0.675, sz * 0.33, 0.03, 0, 0), raw());
  }, [-0.5, 0.1, -0.9], 0.72);
  // a loom: two uprights, the beams, the warp and a hand of cloth begun
  onRoof('rungs-low-5', 0.55, (M, y) => {
    for (const sx of [-1, 1]) { beam(KB, M, [sx * 0.55, 0, 0], [sx * 0.55, 1.75, -0.12], 0.07, raw()); beam(KB, M, [sx * 0.55, 0.0, -0.5], [sx * 0.55, 1.1, -0.07], 0.05, raw()); }
    for (const yy of [0.32, 1.66]) beam(KB, M, [-0.66, yy, -0.02 - yy * 0.065], [0.66, yy, -0.02 - yy * 0.065], 0.08, raw());
    KB.add(box(0.96, 1.3, 0.012), ch(M, 0, 0.99, -0.085, -0.068, 0, 0), { color: worn(V.linen, rng, 0.1), moss: 0, ground: y - 3 });
    KB.add(box(0.97, 0.42, 0.02), ch(M, 0, 0.56, -0.026, -0.068, 0, 0), { color: worn(V.madder, rng, 0.1), moss: 0, ground: y - 3, emit: limeGlow(V.madder, 0.05) });
  }, [-0.6, 0, -1], 1.8);
  // on the Mid Rung's roofs (the High Rung's level): a cupola, a loggia of poles and reed
  for (const R of list) { const c = CHARACTER[R.name]; if (!c) continue;
    if (c.cupola) onRoof(R.name, 0.85, (M, y) => { const r = 0.78, col = worn(L.tile[0].clone().lerp(L.plaster[3], 0.45), rng, 0.45, 0.2);
      B.add(B.cyl(r * 1.02, r * 1.08, 0.75, 8, 1), ch(M, 0, 0.32, 0), { color: worn(CHARACTER[R.name].wash, rng, 0.1), moss: 0.2, ground: y - 1 });
      B.add(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), ch(M, 0, 0.69, 0, 0, 0, 0, 1, 1.05, 1), { color: col, moss: 0.3, ground: y - 1, wet: 0.15 });
      if (!low) PARTS.late.finial(B, ch(M, 0, 0.69 + r * 0.95, 0), { h: 0.8, rng });
    }, [0.1, -0.3, 0.4], 1.6);
    if (c.loggia) onRoof(R.name, 1.25, (M, y) => { const q = new THREE.Vector3();
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const hh = 2.05 + (sz < 0 ? 0.25 : 0); beam(B, M, [sx * 0.95, 0, sz * 0.75], [sx * 0.9, hh, sz * 0.72], 0.09, raw()); q.set(sx * 0.95, 0, sz * 0.75).applyMatrix4(M); ctx.addCollider({ x: q.x, z: q.z, r: 0.08, y, h: 2.1 }); }
      for (const sz of [-1, 1]) beam(B, M, [-1.1, sz < 0 ? 2.3 : 2.05, sz * 0.73], [1.1, sz < 0 ? 2.3 : 2.05, sz * 0.73], 0.07, raw());
      for (let i = 0; i < 6; i++) B.add(B.box(0.4, 0.05, 1.9, { chip: 0.02, seed: i }), ch(M, -0.95 + i * 0.38, 2.24, 0, 0.165, 0, (rng() - 0.5) * 0.05), { color: worn(V.rawWood.clone().lerp(V.saffron, 0.3), rng, 0.25, 0.25), moss: 0.15, ground: y - 3 });
      for (const [i, colh] of ['#8e3b2c', '#3d5a8a'].entries()) { const l = 0.9 + rng() * 0.5; B.add(B.box(0.7, l, 0.02), ch(M, -0.5 + i * 0.95, 2.05 - l / 2, 0.76, 0.03, 0, 0), { color: hex(colh).lerp(V.linen, 0.25), moss: 0, ground: y - 3 }); } // two lengths left to dry under it
    }, [0.1, -0.2], 0, false);
  }

  // ---------------------------------------------------------------- the corner: the Gullet, and the plank over it
  // The two Low Rung houses at the corner stand 39 degrees apart and leave a slot between their end walls that widens
  // outward. Down it, on the corner's bisector, a mud stair: sixteen risers in three and a half metres, its nosings
  // limewashed so feet find them after dark. The third stair of the three, and the only whole one.
  {
    const n1 = RUN[1].n, n2 = RUN[2].n, bl = Math.hypot(n1[0] + n2[0], n1[1] + n2[1]), b = [(n1[0] + n2[0]) / bl, (n1[1] + n2[1]) / bl], t = [-b[1], b[0]]; // t: across, toward the east run
    const [cx0, cz0] = at(1, cornerS(1, DM), DM), G = RUNGS.gullet, sh = 0.23 * Math.sign(t[0] * RUN[2].dir[0] + t[1] * RUN[2].dir[1]);
    const hx = cx0 + b[0] * G.clear + t[0] * sh, hz = cz0 + b[1] * G.clear + t[1] * sh, drop = yM - yL, n = 16, rise = drop / n, run = 0.235, len = (n - 1) * run, w = G.width;
    const F = frame(hx, yM, hz, b[0], b[1]), ROT = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
    const shp = new THREE.Shape(); shp.moveTo(0, 0);
    for (let i = 1; i < n; i++) { shp.lineTo((i - 1) * run, -i * rise); shp.lineTo(i * run, -i * rise); }
    shp.lineTo(len, -drop - 0.4); shp.lineTo(-0.3, -drop - 0.4); shp.lineTo(-0.3, -0.05); shp.lineTo(0, 0);
    const mud = worn(L.plaster[0], rng, 0.38, 0.06);
    KB.add(KB.extrude(shp, w), F.clone().multiply(ROT), { color: mud, moss: 0.3, ground: yL, emit: limeGlow(mud, 0.04) });
    for (let i = 1; i < n; i++) KB.add(box(w - 0.02 - rng() * 0.08, 0.035, 0.085, { chip: 0.01 }), F.clone().multiply(mat(0, -i * rise + 0.008, i * run - 0.045)), { color: worn(V.lime, rng, 0.12 + rng() * 0.25), moss: 0.05, ground: yL - 3, emit: limeGlow(V.lime, 0.1) });
    // the head: planks from the nosing to the first riser
    ways.bridge(K, { name: 'rungs-gullet-head', a: [cx0 - b[0] * 0.3 + t[0] * sh, yM, cz0 - b[1] * 0.3 + t[1] * sh], b: [hx + b[0] * 0.04, yM, hz + b[1] * 0.04], width: w + 0.1, rails: false, register: false, over: [0.35, -0.06] });
    const floor = (x, z) => { const dx = x - hx, dz = z - hz, a = dx * b[0] + dz * b[1], u = dx * t[0] + dz * t[1]; if (a < 0 || a >= len || u > w / 2 + 0.03 || u < -w / 2 - 0.03) return null; return yM - (Math.floor(a / run) + 1) * rise; };
    K.addFloor(floor, { name: G.id, keep: true });
    for (const sd of [-1, 1]) for (let i = 0, m = 4; i < m; i++) { // nobody walks into its mass from the slot beside it
      const a0 = len * i / m, a1 = len * (i + 1) / m, top = Math.min(yM + 0.3, yM - drop * (a0 / len) + 1.5); // (and under the plank that crosses over the stair's head: at their full height they stopped a walker on the Leads)
      const px = t[0] * sd * (w / 2 + 0.3), pz = t[1] * sd * (w / 2 + 0.3); K.wall(hx + b[0] * a0 + px, hz + b[1] * a0 + pz, hx + b[0] * a1 + px, hz + b[1] * a1 + pz, 0.08, // (along the stair and higher than a walker on it: the houses' walls are a wedge, and a push sideways at one slid him up the stair; a body's width and two hands between them, so they do not squeeze him)
        yL - 0.4, top - yL + 0.4);
    }
    const fx = hx + b[0] * len, fz = hz + b[1] * len;
    K.ascent({ id: G.id, held: true, offs: [0.4],
      path: [[fx + b[0] * 1.3, fz + b[1] * 1.3, yL], [fx, fz, yL], [hx - b[0] * 0.9, hz - b[1] * 0.9, yM], [hx - b[0] * 1.5, hz - b[1] * 1.5, yM]] });
    // on the two end walls: a hand-rope on pegs up one, putlog ends and a roof's spout with its stain on the other
    {
      const wallOf = (R) => { const F = R.front, sg = Math.sign(loc(R, hx, hz)[0]) || 1, xe = sg * endX(R);
        // the wall's face at local (z, y): battered in toward the house's middle as it rises
        const P3 = (z, y, out = 0) => { const q = R.W(F.cx + (xe - F.cx) * (1 - F.k * y) + sg * out, y, F.cz + (z - F.cz) * (1 - F.k * y)); return [q.x, q.y, q.z]; };
        // where along the wall (local z) the stair is `a` from its head
        const zAt = (a) => { let best = 0, bd = 1e9; for (let z = -R.plot.d / 2 + 0.3; z <= R.plot.d / 2 - 0.2; z += 0.05) { const q = R.W(xe, 0, z), d = Math.abs((q.x - hx) * b[0] + (q.z - hz) * b[1] - a); if (d < bd) { bd = d; best = z; } } return best; };
        return { P3, zAt, R, sg }; };
      const stairY = (a) => yM - drop * Math.min(1, Math.max(0, a / len)) - R0;
      const R0 = records['rungs-low-5'].plot.y; // (both houses stand on the Low Rung)
      const A = wallOf(records['rungs-low-5']), C = wallOf(records['rungs-low-4']);
      const pegs = [0.35, 1.25, 2.2, 3.15].map((a) => { const z = A.zAt(a), y = stairY(a) + 1.0; beam(KB, I4, A.P3(z, y, -0.3), A.P3(z, y + 0.03, 0.13), 0.05, { color: L.iron, iron: 0.6, moss: 0, ground: yL - 3 }); return A.P3(z, y + 0.02, 0.11); });
      for (let i = 0; i < pegs.length - 1; i++) for (let j = 0; j < 3; j++) { const u0 = j / 3, u1 = (j + 1) / 3, pt = (u) => pegs[i].map((v, k) => v + (pegs[i + 1][k] - v) * u - (k === 1 ? 0.07 * 4 * u * (1 - u) : 0)); beam(KB, I4, pt(u0), pt(u1), 0.035, { color: V.rope, moss: 0, ground: yL - 3 }); }
      for (const [a, y] of [[0.9, 3.25], [2.0, 3.2], [3.1, 3.3], [1.5, 1.9]]) { const z = C.zAt(a); beam(KB, I4, C.P3(z, y, -0.35), C.P3(z, y - 0.02, 0.2 + rng() * 0.12), 0.09, raw()); } // putlogs: the builders' scaffold poles, sawn off
      { const z = C.zAt(2.6), yr = C.R.roof.y + 0.02, col = worn(L.tile[4], rng, 0.3); // the roof's spout, and where a thousand rains have run from it
        beam(KB, I4, C.P3(z, yr, -0.3), C.P3(z, yr - 0.1, 0.45), 0.13, { color: col, moss: 0.2, wet: 0.4, ground: yL - 3, round: 6 });
        for (let j = 0; j < 4; j++) { const y1 = yr - 0.25 - j * 0.75, y2 = y1 - 0.8, wd = 0.2 - j * 0.035; if (y2 < 0.3) break; B.add(B.box(wd, y1 - y2, 0.02), ch(EM(C.R, C.sg, z, y1), 0, -(y1 - y2) / 2, 0.02, 0, (j % 2 ? -1 : 1) * (0.08 + j * 0.01), 0), // (each length laps the next by a hand, and lies a few degrees out of the wall's plane and its neighbour's)
          { color: CHARACTER[C.R.name].wash.clone().lerp(V.dirt, 0.5 - j * 0.08).multiplyScalar(0.82), moss: 0.4 - j * 0.08, wet: 0.3, ground: yL - 3 }); } }
    }
    // a jar at the foot in the slot
    pot(KB, I4, fx - t[0] * 1.25 - b[0] * 0.5, yL, fz - t[1] * 1.25 - b[1] * 0.5, 0.28, worn(L.tile[4], rng, 0.4), 2);
    ctx.addCollider({ x: fx - t[0] * 1.25 - b[0] * 0.5, z: fz - t[1] * 1.25 - b[1] * 0.5, r: 0.3, y: yL, h: 0.6 });
  }

  // ---------------------------------------------------------------- the Tenter: the dyers' stair and their yard
  {
    const T = RUNGS.tenter, run = T.run, g = T.sign, dir = RUN[run].dir, f = [dir[0] * g, dir[1] * g], drop = yM - yL, yard = P.plot('rungs-dyers');
    ways.bridge(K, { name: 'rungs-tenter-head', a: W3(run, T.s - 1.3 * g, DM + 0.72, yM), b: W3(run, T.s + 0.16 * g, DM + 0.72, yM), // (run on under the first tread: the deck and the flight read as one thing)
      width: 1.75, rails: false, register: false });
    const [x, z] = at(run, T.s, DM + T.out);
    const fl = ways.timberFlight(K, { land: W3(run, T.s - 0.7 * g, DM - 0.4, yM), name: T.id, x, y: yM, z, f, drop, width: T.width, run: T.run1, rails: g > 0 ? [false, true] : [true, false], props: [0.05, 0.42], propBase: yL });
    K.rail([W3(run, T.s - 1.25 * g, DM + 0.05, yM), W3(run, T.s - 1.25 * g, DM + 1.5, yM), W3(run, T.s - 0.1 * g, DM + 1.5, yM)], {});
    for (const [u, v] of [[-1.2, 0.4], [-1.2, 1.5], [-0.1, 1.5]]) KB.add(box(0.12, drop, 0.12), mat(...W3(run, T.s + u * g, DM + v, yM - drop / 2 - 0.05)), wood(0.9));
    // the tenter lines: four tall poles stood along the yard's edge and a line down them, two more lines out to them
    // from posts on the Mid Rung's nosing, over the stair; the cloth in lengths: saffron, cream, madder
    const sa = T.s + g * fl.length + 0.05, sb = T.s + 0.15, Dp = DM + 3.45, yT = yM + 1.4, dyes = [V.saffron, V.linen, V.madder, V.madder, V.saffron, V.linen];
    const ss = [0, 0.34, 0.69, 1].map((u) => sa + (sb - sa) * u), sag = (u, k = 0.2) => -k * 4 * u * (1 - u);
    let nd = 0;
    // a length of cloth hung from M's origin, its width along M's +x: most of it down one side, a hand thrown over
    const cloth = (M, w, lh) => { const col = worn(dyes[nd++ % dyes.length], rng, 0.1, 0.12), o = { color: col, moss: 0, ground: yL - 6, emit: limeGlow(col, 0.07) }, tilt = 0.015 + rng() * 0.03;
      // hung wet, in folds: strips turned one way and the other, meeting at their edges, each its own length at the hem
      const n = low ? 3 : Math.max(4, Math.round(w / 0.2)), sw = w / n, a = 0.32 + rng() * 0.2, cw = sw / Math.cos(a), H = ch(M, 0, 0, 0.03, tilt, 0, 0);
      for (let i = 0; i < n; i++) { const sg = i % 2 ? -1 : 1, l = lh - (0.5 + 0.5 * Math.sin(i * 1.9 + nd)) * 0.14 - (i === 0 || i === n - 1 ? 0.07 : 0);
        KB.add(box(cw + 0.004, l, 0.014), ch(H, -w / 2 + (i + 0.5) * sw, -l / 2 + 0.012, 0, 0, sg * a, 0), { ...o, color: jit(col, sg > 0 ? 1 : 0.8) }); }
      KB.add(box(w, lh * 0.18, 0.016), ch(M, 0, -lh * 0.09 + 0.012, -0.03, -0.1, 0, 0), { ...o, color: jit(col, 0.9) });
      KB.add(box(w, 0.016, 0.11), ch(M, 0, 0.014, 0.002), o); }; // (the fold over the line)
    ss.forEach((s, i) => { const lean = 0, M = RM(run, s, Dp, yL); beam(KB, M, [0, -0.05, 0], [0, yT - yL + 0.2 + rng() * 0.3, 0], 0.11, raw()); if (i === 0 || i === 3) beam(KB, M, [0, -0.05, i ? 0.6 : -0.6], [lean * 0.5, (yT - yL) * 0.5, lean * 0.2], 0.07, raw()); const [px, pz] = at(run, s, Dp); ctx.addCollider({ x: px, z: pz, r: 0.1, y: yL - 0.3, h: 3 }); });
    for (let b = 0; b < 3; b++) { // along the poles: a cloth a bay, its face to the valley
      const M = RM(run, ss[b], Dp, yT), len = ss[b + 1] - ss[b];
      for (let i = 0; i < 4; i++) beam(KB, M, [0, sag(i / 4, 0.1), len * i / 4], [0, sag((i + 1) / 4, 0.1), len * (i + 1) / 4], 0.025, { color: V.rope, moss: 0, ground: yL - 3 });
      const u = 0.5 + (rng() - 0.5) * 0.15, w = Math.min(len - 0.35, 0.85 + rng() * 0.25);
      cloth(ch(M, 0, sag(u, 0.1), len * u, 0, Math.PI / 2 + (rng() - 0.5) * 0.1, 0), w, yT - (yL + 2.35) - rng() * 0.9);
    }
    for (const b of [1, 2]) { // out from the Mid Rung over the stair: their faces along the lane
      const s = ss[b], D0 = DM - 0.14, len = Dp - D0, y0 = yM + 1.75, M = RM(run, s, D0, y0), dy = yT - 0.05 - y0, fy = (v) => dy * v + sag(v);
      beam(KB, RM(run, s, D0, yM), [0, -0.04, 0], [(rng() - 0.5) * 0.1, 1.85, 0], 0.09, raw()); { const [px, pz] = at(run, s, D0); ctx.addCollider({ x: px, z: pz, r: 0.08, y: yM - 0.2, h: 1.9 }); }
      for (let i = 0; i < 5; i++) beam(KB, M, [len * i / 5, fy(i / 5), 0], [len * (i + 1) / 5, fy((i + 1) / 5), 0], 0.025, { color: V.rope, moss: 0, ground: yL - 3 });
      const flightY = yM - drop * Math.min(1, Math.max(0, (T.s - s) * g * -1 / fl.length)), v1 = (DM + T.out - D0) / len, v2 = (Dp - 0.75 - D0) / len;
      if (y0 + fy(v1) - flightY - 2.3 > 0.7) cloth(ch(M, len * v1, fy(v1), 0, 0, (rng() - 0.5) * 0.2, 0), 1.05, y0 + fy(v1) - flightY - 2.3);
      cloth(ch(M, len * v2, fy(v2), 0, 0, (rng() - 0.5) * 0.3, 0), 1.0, y0 + fy(v2) - (yL + 2.35) - rng() * 0.7);
    }
    // the vats at its foot: plastered tubs, one a Heliarch drum hollowed; saffron, madder and the black that fixes them
    const vats = [[yard.s - 1.25, DM + 2.3, 0.62, new THREE.Color('#b98a1e')], [yard.s + 0.1, DM + 3.05, 0.55, new THREE.Color('#7a2a1c')], [yard.s + 1.35, DM + 2.35, 0.5, new THREE.Color('#231a16')]];
    vats.forEach(([s, D, r, dye], i) => {
      const M = RM(run, s, D, yL), col = i === 2 ? jit(H.stone, 0.9) : worn(L.plaster[0], rng, 0.3);
      KB.add(KB.lathe([[0.001, 0], [r * 0.94, 0], [r, 0.72], [r - 0.09, 0.72], [r - 0.12, 0.58], [0.001, 0.58]], i === 2 ? 6 : 10), M, { color: col, moss: 0.3, ground: yL, course: i === 2 ? 0.4 : 0 });
      KB.add(KB.cyl(r - 0.125, r - 0.125, 0.012, i === 2 ? 6 : 10, 1), ch(M, 0, 0.592, 0), { color: dye, moss: 0, wet: 0.9, ground: yL - 3 });
      const [px, pz] = at(run, s, D); ctx.addCollider({ x: px, z: pz, r, y: yL, h: 0.72 });
      // its runnel: across the lane's flags to the drain at the nosing, the colour going to mud as it goes
      const D1 = DL - 0.62, n = 4;
      for (let j = 0; j < n; j++) { const a = j / n, c2 = (j + 1) / n, Da = D + r + (D1 - D - r) * a, Db = D + r + (D1 - D - r) * c2, wob = (q) => Math.sin(q * 5 + i * 2) * 0.12; beam(KB, RM(run, s, 0, yL), [Da - 0.03, 0.03 - j * 0.006, wob(a)], [Db, 0.03 - j * 0.006, wob(c2)], 0.15 - j * 0.015, { color: dye.clone().lerp(V.dirt, 0.25 + 0.4 * c2), moss: 0, wet: 0.8, ground: yL - 3 }, 0.04); }
    });
    // the drain: a gutter of the Noonwrights' glazed channel laid inside the rope along the nosing; it runs west and spills over the edge
    { const d0 = yard.s - 2.5, d1 = yard.s + 1.9, D = DL - 0.5, M = RM(run, d0, D, yL), len = d1 - d0;
      for (const sx of [-1, 1]) KB.add(box(0.05, 0.13, len, { chip: 0.01 }), ch(M, sx * 0.105, 0.06, len / 2), { color: worn(N.celadonD, rng, 0.3), moss: 0.2, wet: 0.5, ground: yL });
      KB.add(box(0.16, 0.05, len - 0.02), ch(M, 0, 0.022, len / 2), { color: jit(V.dirt, 0.55), moss: 0.2, wet: 0.8, ground: yL - 1 });
      beam(KB, M, [0, 0.05, 0.1], [0.75, -0.02, -0.2], 0.2, { color: worn(N.celadonD, rng, 0.3), moss: 0.2, wet: 0.6, ground: yL - 2 }, 0.07); }
  }

  // (v15-W4) The Stump, a Heliarch flight down the riser into rungs-low-7's end wall, is gone: from the Mid Rung it read
  // as a stair shut at its head and walled at its foot, the owner's "and another". The Pier Stair says the same hand.

  // ---------------------------------------------------------------- the Pier Stair: the Heliarchs' way up their aqueduct
  // Ashlar treads let into the last pier's faces: up its east face from the Low Rung, round the corner and along its
  // valley face to the top, out over the Lees. The lowest five are stubs. It is not walked; it is what a visitor in
  // the square sees between the Tenter's timber and the Noonwrights' main: the three hands' stairs in one look.
  {
    const pp = P.plot('bridge-pier'), run = pp.run, hw = pp.w / 2, hd = pp.d / 2, PM = RM(run, pp.s, pp.D, yL), rise = (yM - yL) / 16, tw = 0.72; // PM: +x out (D), +z along the run (s)
    const stone = (k) => ({ color: jit(H.stone, k), course: 0, moss: 0.4, ground: yL });
    const n1 = 7, g1 = (2 * hd) / n1, n2 = 8, g2 = (2 * hw - 0.1) / n2;
    for (let i = 0; i < n1; i++) { const gone = i < 5, len = gone ? 0.12 + rng() * 0.14 : tw; // up the east face (+z), from the hill side out
      KB.add(box(g1 + 0.03, 0.2, len + 0.3, { chip: gone ? 0.06 : 0.03, seed: i }), ch(PM, -hd + (i + 0.5) * g1, (i + 1) * rise - 0.1, hw + len / 2 - 0.15), stone(0.84 + (i % 3) * 0.07)); }
    KB.add(box(tw + 0.3, 0.2, tw + 0.3, { chip: 0.03, seed: 9 }), ch(PM, hd + tw / 2 - 0.15, (n1 + 1) * rise - 0.1, hw + tw / 2 - 0.15), stone(0.95)); // the quarter landing at the corner
    for (let i = 0; i < n2; i++) KB.add(box(tw + 0.3, 0.2, g2 + 0.03, { chip: 0.03, seed: 20 + i }), ch(PM, hd + tw / 2 - 0.15, (n1 + 2 + i) * rise - 0.1, hw - 0.05 - (i + 0.5) * g2), stone(0.86 + (i % 3) * 0.06)); // along the valley face, toward the west
    // nobody walks into the treads over the lane: the east face's flight is a wall to a walker
    { const a = at(run, pp.s + hw + 0.3, pp.D - hd + 0.2), c = at(run, pp.s + hw + 0.3, pp.D + hd); K.wall(a[0], a[1], c[0], c[1], 0.32, yL - 0.3, 2.4); }
  }

  // ---------------------------------------------------------------- the Slype: the lane under the main
  // The Low Rung's lane ducks in against the Mid Rung's riser to pass under the main. There, built against the Elder
  // face: a plastered door-case and its door (what is behind it is batch 3's), and a niche with a light in it.
  {
    const S = RUNGS.slype, run = S.run, sm = (S.s0 + S.s1) / 2, D0 = DM + 0.12; // (the riser's foot stands 0.2 out from its head)
    const M = ch(RM(run, sm, D0, yL), 0, 0, 0, 0, Math.PI / 2, 0); // +z out from the riser, +x toward the west
    // one plastered front against the step, out of true: a horseshoe door in it and, east of the door, a small round-headed niche
    const wash = worn(L.plaster[3], rng, 0.22), from = KB.count, dw = 1.0, nx = -1.15; // (the niche clear of the front's end: a hole that touches the outline leaves the end face open)
    facade(KB, ch(M, 0, 0, 0.2), { w: 3.5, d: 0.4, top: [[1.75, 2.35], [0.9, 2.62], [0.1, 2.7], [-0.9, 2.48], [-1.75, 2.2]], openings: [{ kind: 'horseshoe', x: 0.45, y: 0.012, w: dw, sp: 1.45 }, { kind: 'round', x: nx, y: 1.05, w: 0.5, sp: 0.42 }], color: wash, moss: 0.2, ground: yL, emit: limeGlow(wash, 0.2), n: low ? 7 : 10 }); // (it stands under the main, out of the sky's light: its limewash holds more of the niche's)
    leaf(KB, ch(M, 0.45, 0, 0.27), dw + 0.24, 2.1, worn(L.paint[1], rng, 0.35), rng, { plain: low });
    KB.add(box(dw + 0.5, 0.26, 0.5, { chip: 0.03 }), ch(M, 0.45, -0.07, 0.42), { color: H.stone, moss: 0.45, ground: yL });
    KB.add(box(0.62, 0.8, 0.04), ch(M, nx, 1.4, 0.3), { color: new THREE.Color('#3a2410'), moss: 0, ground: yL - 3, emit: [V.lit[0] * 0.3, V.lit[1] * 0.3, V.lit[2] * 0.3, 1] });
    KB.add(box(0.62, 0.05, 0.14), ch(M, nx, 1.03, 0.37), { color: worn(L.tile[1], rng, 0.3), moss: 0.1, ground: yL });
    dirty(KB, from, 0.2, rng);
    // the light in it: a clay lamp on the sill (not a hung one: its cup is open, and this one is looked down into)
    KB.add(box(0.16, 0.05, 0.13, { chip: 0.015 }), ch(M, nx, 1.08, 0.37), { color: worn(L.tile[4], rng, 0.3), moss: 0, ground: yL });
    { const g = L.glass.amber; KB.add(new THREE.IcosahedronGeometry(0.055, 1), ch(M, nx - 0.03, 1.16, 0.37, 0, 0, 0, 0.9, 1.6, 0.9), { color: new THREE.Color('#201008'), moss: 0, ground: yL - 3, emit: [g[0] * 1.3, g[1] * 1.3, g[2] * 1.3, 1] }); }
    // the main's own ware where it broke over the lane: sherds stood against the front, glaze out, the milk body's thickness at their edges
    for (const [x, ry, rz, gl, sc] of [[1.55, 0.3, 0.18, N.celadon, 1], [-0.72, -0.2, -0.3, N.oxblood, 0.75], [1.2, 1.1, 1.35, N.celadon, 0.6]]) { const S2 = ch(M, x, 0.3 * sc, 0.62, -0.35, ry, rz, sc, sc, sc);
      KB.add(box(0.62, 0.5, 0.075, { chip: 0.012, seed: x * 9 | 0 }), S2, { color: worn(N.milk, rng, 0.1), moss: 0.05, ground: yL - 1 });
      KB.add(box(0.56, 0.44, 0.02), ch(S2, 0, 0, 0.042), { color: worn(gl, rng, 0.08), moss: 0, wet: 0.9, ground: yL - 3 });
      KB.add(box(0.05, 0.3, 0.012), ch(S2, 0.1, -0.02, 0.054, 0, 0, 0.1), { color: worn(N.oxblood, rng, 0.05), moss: 0, wet: 0.9, ground: yL - 3 }); } // (a drip of ox-blood down the glaze)
  }

  // ---------------------------------------------------------------- the Cantle's flanks, packed
  // Where the sherd's broken ends stand off the High Rung's riser: rubble and mud rammed in behind them in courses,
  // Heliarch blocks at the foot, smaller stuff over, limewashed with the house.
  {
    const R = records['rungs-cantle'];
    if (R) { const p = R.plot, M = MP(R), zr = -p.d / 2 + 0.6; // (its back stands 0.6 m in the riser)
      for (const sg of [-1, 1]) for (let c = 0, y = -0.2; c < 7; c++) { const h = c < 2 ? 0.62 : 0.34 + rng() * 0.2, wd = 0.95 - c * 0.07 + rng() * 0.1, dp = 0.85 - c * 0.06;
        KB.add(box(wd, h, dp, { chip: 0.05, chipTop: true, seed: 50 + c + sg }), ch(M, sg * (p.w / 2 - 0.1 - wd / 2 + c * 0.04), y + h / 2, zr + dp / 2 - 0.15, 0, (rng() - 0.5) * 0.12, 0), c < 2 ? { color: jit(H.stone, 0.85 + rng() * 0.15), course: 0.5, moss: 0.4, ground: p.y } : { color: worn(L.plaster[0], rng, 0.35, 0.1), moss: 0.3, ground: p.y, emit: limeGlow(L.plaster[0], 0.04) });
        y += h - 0.02; }
    }
  }

  // ---------------------------------------------------------------- the Squint: a bench where the three stairs are seen
  {
    const R = records[RUNGS.squint.plot];
    if (R) { const x = R.roof.x1 - 0.36, z = R.roof.zb + 0.95, q = R.W(x, R.roof.y, z);
      // a board on two stumps of Heliarch drum, worn pale where people sit; a sherd of the main's ware for a back
      { const Mb = ch(MP(R), x, R.roof.y, z, 0, Math.PI / 2, 0);
        for (const sx of [-1, 1]) PARTS.heliarch.drum(KB, ch(Mb, sx * 0.45, 0, 0), { r: 0.17, h: 0.4 });
        KB.add(box(1.3, 0.06, 0.4, { chip: 0.015 }), ch(Mb, 0, 0.43, 0), { color: jit(L.wood, 1.7), moss: 0.05, ground: yM - 2 });
        KB.add(box(1.1, 0.5, 0.07, { chip: 0.012, seed: 71 }), ch(Mb, 0, 0.62, -0.3, -0.2, 0, 0), { color: worn(N.milk, rng, 0.1), moss: 0.05, ground: yM - 1 });
        KB.add(box(1.02, 0.42, 0.02), ch(Mb, 0, 0.62, -0.262, -0.2, 0, 0), { color: worn(N.celadon, rng, 0.08), moss: 0, wet: 0.9, ground: yM - 3 }); }
      ctx.addCollider({ x: q.x, z: q.z, r: 0.4, y: q.y, h: 0.45 }); taken.push([q.x, q.z, 0.8]); }
  }

  // ---------------------------------------------------------------- what the bones left: the ladder
  // (v15-W1: it stood a stride from the Tenter's head, both joining the Low and Mid Rungs; it is now the crown's west way
  // down to the High Rung, up the rim at the Brow House, where no stair goes.) Its poles stop a walker (a hand's breadth
  // each, so the rungs between them are still reached); a knotted hand-rope hangs beside it from a stake on the rim, and
  // the stone before its foot is worn pale. The lamp under the bridge's baulk stays where it was: it lights the bridge.
  {
    const ld = P.way('rungs-ladder'), yT = P.LEVEL[ld.to].y, yF = P.LEVEL[ld.from].y, Dr = P.RISERS.find((r) => r.top === yT).D;
    for (const sd of [-1, 1]) { const a = at(ld.run, ld.s + sd * 0.25, Dr + 0.7), c = at(ld.run, ld.s + sd * 0.25, Dr + 0.42); ctx.addCollider({ x1: a[0], z1: a[1], x2: c[0], z2: c[1], r: 0.05, y: yF, h: 1.9, stand: false }); }
    const M = RM(ld.run, ld.s + 0.62, Dr - 0.1, yT); // the stake, driven in at the brink, the rope knotted round its head
    KB.add(box(0.11, 1.05, 0.11, { chip: 0.01 }), ch(M, 0, 0.42, 0, 0.03, 0, -0.03), wood(0.8));
    const top = [0.02, 0.86, 0.02], pts = [top, [0.2, -0.3, 0.2], [0.34, -1.5, 0.16], [0.36, -2.6, 0.22], [0.4, -3.35, 0.18]];
    for (let i = 0; i < pts.length - 1; i++) { beam(KB, M, pts[i], pts[i + 1], 0.035, { color: V.rope, moss: 0.05, ground: yF - 3, round: 5 }); if (i) KB.add(new THREE.IcosahedronGeometry(0.045, 0), ch(M, ...pts[i]), { color: jit(V.rope, 0.8), moss: 0, ground: yF - 3 }); }
    KB.add(new THREE.IcosahedronGeometry(0.06, 0), ch(M, ...pts[pts.length - 1]), { color: jit(V.rope, 0.75), moss: 0, ground: yF - 3 });
    const br = P.way('lane-bridge'); hangLamp(KB, { x: at(br.run, br.s - 0.43, DM + 1.0)[0], y: yM - 0.275, z: at(br.run, br.s - 0.43, DM + 1.0)[1] }, 'amber', 0.55);
    KB.add(box(0.5, 0.09, 0.78, { chip: 0.04 }), ch(RM(ld.run, ld.s, Dr + 1.22, yF), 0, 0.015, 0, 0, 0.1, 0), { color: jit(H.stone, 1.25), moss: 0.15, ground: yF - 2 });
  }

  // ---------------------------------------------------------------- the lanes: flags over the Elder treads
  // Late paving in two ragged rows where feet go, of whatever stone there was; more lost than kept.
  for (const name of ['mid-lane', 'low-lane']) {
    const ln = P.LANES.find((q) => q.name === name), y = ln.y, keepP = low ? 0.3 : 0.55;
    for (let i = 0; i < ln.pts.length - 1; i++) {
      const [ax, az] = ln.pts[i], [bx, bz] = ln.pts[i + 1], len = Math.hypot(bx - ax, bz - az), F = frame(ax, y, az, (bx - ax) / len, (bz - az) / len);
      for (let a = 0.55; a < len - 0.9;) { const l = Math.min(len - 0.55 - a, 0.55 + rng() * 0.65); for (const off of [-0.33, 0.33]) if (rng() < keepP) KB.add(box(0.48 + rng() * 0.08, 0.07, l - 0.04, { chip: 0.03, chipTop: true, seed: i * 31 + a }), F.clone().multiply(mat(off + (rng() - 0.5) * 0.06, -0.008 + rng() * 0.006, a + l / 2, 0, (rng() - 0.5) * 0.07, 0)), { color: worn(rng() < 0.25 ? H.stone : V.flag, rng, 0.2, 0.22), moss: 0.5, wet: 0.08, ground: y - 0.4 }); a += l; }
    }
  }

  const mesh = ctx.strata.mesh(B, 'late', 'rungs-houses'), meshes = [mesh];
  ctx.scene.add(mesh);
  if (E.count > 0) { const m = ctx.strata.mesh(E, 'elder', 'rungs-elder'); ctx.scene.add(m); meshes.push(m); }
  const before = new Set(ctx.scene.children); K.finish();
  for (const m of ctx.scene.children) if (!before.has(m)) meshes.push(m);
  if (low) for (const m of meshes) m.castShadow = false;
  lap.farHidden.push(...meshes); // on low, not drawn from more than 150 m (bones.js)
  const tris = B.triangles + E.triangles + KB.triangles;
  ctx.rungs = { records, crossings: cross, stats: () => ({ draws: meshes.length, triangles: tris, houses: B.triangles, ways: KB.triangles }) };
  ctx.log?.(`rungs: ${list.length} houses ${B.triangles} tris, the ways ${KB.triangles} tris, ${meshes.length} draws`);
}
