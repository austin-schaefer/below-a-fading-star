// The Rungs (v15-Q2): the Lappet's body, the stacked houses on the Mid and Low Rungs of the Elder stair, each one's
// roof the yard of the tread above, and the ways the Late folk threaded through them. Every coordinate is the plan's
// (src/v15/plan.js: the `rungs-*` plots and RUNGS, the quarter's own records); the houses are the kit's
// (src/v15/houses/ makePlot), the flights, planks and rails the ways' kit (src/v15/ways/). What is made here:
//   the houses      twelve Late plaster houses against their risers, lamps hung at their doors, a second row of small
//                   lights high in each front; five of them carry the plan's front stair, each registered as a way
//   the Cantle      a carrier's sherd standing as an apse over the High Rung, a plaster house in its lap, the gap
//                   behind its flanks packed
//   the Leads       the roof walk on the Low Rung's roofs (the Mid Rung's level): plank crossings with a stile at
//                   each end, a dovecote, drying trays, a loom
//   the Gullet      a mud stair straight down the slot between the two houses at the corner: mean, and whole
//   the Tenter      the dyers' stair down the Mid Rung's riser on the east run, cloth on tenter lines down its
//                   length, vats at its foot, their runnels across the lane to a drain
//   the Short Stair a Heliarch flight along the riser west of the main, broken through, its foot in a house's wall
//   the Slype       the lane under the main: a door in the step, a niche with a light in it
//   the Squint      a bench at the east end of the roof beside it: the three stairs of three ages in one look
//   the lanes       flags laid over the Elder treads where feet go, more of them lost than kept
//   and what the bones left: the ladder's poles stop a walker, a hand-rope, a lamp and a worn stone say it is climbed
// Draws: `rungs-houses` and `rungs-ways` (the stone shader). No point light: every slot in reach of P9 and K1 is
// spoken for (tools/house-test.mjs), so the lamps and windows are emissive. ctx.rungs = { records, stats() }.
// ?rungs=0 leaves the quarter out.
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { makePlot, registerAll } from '../houses/index.js';
import { L, H, V, N, PARTS, rngOf, ch, worn, limeGlow, beam, pot, leaf, hangLamp, facade, dirty } from '../houses/kit.js';
const _p = new THREE.Vector3();
import { frame } from '../ways/stairs.js';

const I4 = new THREE.Matrix4();
const BODY = 0.5; // a walker's half width, and a little
// each house is its seed (the wash, the door, the things on its roof); `side`: which end its stair's head or its
// jar stands at (+1 the west end on either run), found by trying seeds from the one given
const HOUSES = {
  'rungs-mid-1': { seed: 3 }, 'rungs-mid-2': { seed: 8 }, 'rungs-mid-3': { seed: 5 }, 'rungs-mid-4': { seed: 13 }, 'rungs-mid-6': { seed: 7 }, 'rungs-mid-7': { seed: 15 },
  'rungs-low-1': { seed: 21, side: -1 }, 'rungs-low-2': { seed: 9, side: 1 }, 'rungs-low-3': { seed: 16, side: 1 }, 'rungs-low-4': { seed: 30, side: -1 }, 'rungs-low-5': { seed: 11, side: 1 }, 'rungs-low-7': { seed: 6, side: 1 },
  'rungs-cantle': { seed: 4, form: 'sherd', glaze: 3 },
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
  const sideOf = (R) => { const f = R.floors.find((q) => q.steps); if (f) return Math.sign(f.s * Math.cos(R.plot.yaw) - f.c * Math.sin(R.plot.yaw)); const j = R.colliders.find((c) => c.r === 0.3 && c.y !== undefined && c.x !== undefined); return j ? Math.sign((j.x - R.plot.x) * Math.cos(R.plot.yaw) - (j.z - R.plot.z) * Math.sin(R.plot.yaw)) : 0; };
  for (const p of P.PLOTS) {
    const o = HOUSES[p.name]; if (!o || p.quarter !== 'rungs') continue;
    const { side, ...q } = o, opts = (seed) => ({ plan: P, built: lap.built, E, low, ...q, seed });
    let seed = q.seed;
    if (side) for (let t = 0; t < 12; t++, seed++) if (sideOf(makePlot(ctx.strata.builder(), p, opts(seed))) === side) break; // (a trial build into a builder that is thrown away)
    const R = makePlot(B, p, opts(seed));
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
    for (const x of xs) {
      const pw = 0.34 + r2() * 0.14, ph = 0.42 + r2() * 0.22, y = Math.min(F.h - ph - 0.5, 2.95 + r2() * 0.25), zF = F.cz + (F.zf - F.cz) * (1 - F.k * (y + ph / 2)), lit = r2() < 0.62, k = 0.35 + r2() * 0.4;
      const fc = { color: worn(L.plaster[3], r2, 0.22, 0.1), moss: 0.1, ground: R.plot.y, emit: limeGlow(L.plaster[3], 0.05) }, xx = F.cx + (x - F.cx) * (1 - F.k * y);
      for (const sx of [-1, 1]) B.add(B.box(0.09, ph + 0.18, 0.09, { seg: 9 }), ch(M, xx + sx * (pw / 2 + 0.045), y + ph / 2, zF + 0.012), fc);
      for (const sy of [-1, 1]) B.add(B.box(pw + 0.24, 0.09, 0.11, { seg: 9 }), ch(M, xx, y + ph / 2 + sy * (ph / 2 + 0.045), zF + 0.02), fc);
      B.add(B.box(pw + 0.02, ph + 0.02, 0.04, { seg: 9 }), ch(M, xx, y + ph / 2, zF + 0.012), { color: lit ? new THREE.Color('#3a2410') : V.pane, moss: 0, ground: R.plot.y - 3, emit: lit ? [V.lit[0] * k, V.lit[1] * k, V.lit[2] * k, 1] : undefined });
      B.add(B.box(0.03, ph + 0.02, 0.03, { seg: 9 }), ch(M, xx, y + ph / 2, zF + 0.04), { color: V.soot, moss: 0, ground: R.plot.y - 3 });
      R.windows.push({ ...R.W(xx, y + ph / 2, zF), lit });
    }
  }
  // the plan's front stairs, each a way between two treads
  for (const R of list) {
    const f = R.floors.find((q) => q.steps); if (!f) continue;
    const p = P.plot(R.name), dx = f.s, dz = f.c, hx = f.x + dx * f.d / 2, hz = f.z + dz * f.d / 2, fx = f.x - dx * f.d / 2, fz = f.z - dz * f.d / 2;
    ctx.ascents?.add({ id: `${R.name}-stair`, held: true, offs: [0.5], path: [[fx - dx * 1.3 + p.face[0] * 0.3, fz - dz * 1.3 + p.face[1] * 0.3, p.y], [fx, fz, p.y], [hx - dx * 0.15, hz - dz * 0.15, f.y1], [hx + dx * 0.6, hz + dz * 0.6, f.y1]] });
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
      for (let z = R.roof.zf - 0.75; z >= R.roof.zb + 0.55; z -= 0.1) { let ok = true; for (let t = 0.2; t <= 1.5 && ok; t += 0.2) { const q = R.W(x + inw * t, 0, z); ok = clearOn(R, q.x, q.z, BODY); } if (ok) return R.W(x, R.roof.y, z); }
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
      KB.add(box(1.0, 0.5, 0.36, { chip: 0.03, chipTop: true, seed: n + sg }), S.clone().multiply(mat(0, 0.13, 0.16)), plaster());
      KB.add(box(1.0, 0.3, 0.34, { chip: 0.03, chipTop: true, seed: n + sg + 2 }), S.clone().multiply(mat(0, 0.04, 0.5)), plaster());
      rect(E0.x + ux * sg * 0.17, E0.z + uz * sg * 0.17, ux, uz, 0.18, hw, y + 0.38);
      rect(E0.x + ux * sg * 0.5, E0.z + uz * sg * 0.5, ux, uz, 0.17, hw, y + 0.19);
    }
    if (len > 2.6) for (const sd of [-1, 1]) K.rail([[A.x + ux * 0.25 + uz * sd * 0.5, yd - 0.02, A.z + uz * 0.25 - ux * sd * 0.5], [Bq.x - ux * 0.25 + uz * sd * 0.5, yd - 0.02, Bq.z - uz * 0.25 - ux * sd * 0.5]], { h: 0.9, every: Math.max(1.3, len / 3) });
    if (len > 4.4) { // a trestle under its middle, on the Low Rung
      for (const sd of [-1, 1]) beam(KB, F, [sd * 0.34, 0.4, len / 2], [sd * 0.75, yL - y - 0.05, len / 2 + 0.1], 0.12, raw());
      beam(KB, F, [-0.6, yL - y + 1.2, len / 2 + 0.08], [0.6, yL - y + 2.6, len / 2 + 0.05], 0.07, raw());
      for (const sd of [-1, 1]) ctx.addCollider({ x: A.x + ux * len / 2 + uz * sd * 0.7, z: A.z + uz * len / 2 - ux * sd * 0.7, r: 0.1, y: yL - 0.3, h: 2.4 });
    }
    ctx.ascents?.add({ id: `rungs-leads-${n}`, held: true, offs: [0.5], path: [[A.x - ux * 1.4, A.z - uz * 1.4, y], [A.x + ux * len / 2, A.z + uz * len / 2, yd], [Bq.x + ux * 1.4, Bq.z + uz * 1.4, y]] });
    return { A, B: Bq, len };
  }
  const cross = RUNGS.leads.crossings.map(([a, b], i) => crossing(records[a], records[b], i + 1));

  // what roofs are for (beside the kit's bed, jar and washing): each tried at a few places on its roof and stood
  // where a walker still gets by
  const onRoof = (name, rad, fn, zs = [0.2, -0.3, -0.8]) => {
    const R = records[name]; if (!R) return;
    const xs = [0, 0.9, -0.9, 1.6, -1.6, 2.1, -2.1];
    for (const z of zs) for (const x of xs) {
      const lx = (R.roof.x0 + R.roof.x1) / 2 + x, lz = (R.roof.zb + R.roof.zf) / 2 + z;
      if (lx < R.roof.x0 + rad + 0.3 || lx > R.roof.x1 - rad - 0.3) continue;
      const q = R.W(lx, R.roof.y, lz);
      if (!freeOn(R, q.x, q.z, rad + BODY * 2 - 0.1) || cross.some((c) => [c.A, c.B].some((e) => Math.hypot(e.x - q.x, e.z - q.z) < rad + 1.9))) continue;
      taken.push([q.x, q.z, rad]);
      fn(ch(MP(R), lx, R.roof.y, lz), q.y);
      ctx.addCollider({ x: q.x, z: q.z, r: rad, y: q.y, h: 1.2 });
      return;
    }
  };
  // a dovecote: a plaster box on a stump of Heliarch drum, its holes in rows, a perch under each row
  onRoof('rungs-low-3', 0.5, (M, y) => {
    PARTS.heliarch.drum(KB, M, { r: 0.4, h: 0.7 });
    KB.add(box(0.95, 1.15, 0.8, { chip: 0.04, chipTop: true }), ch(M, 0, 1.27, 0), { color: worn(L.plaster[0], rng, 0.2), moss: 0.25, ground: y, emit: limeGlow(L.plaster[0], 0.05) });
    KB.add(box(1.15, 0.05, 1.0), ch(M, 0, 1.87, 0, 0.07, 0, 0), { color: worn(L.tile[1], rng, 0.4), moss: 0.2, ground: y });
    for (let r = 0; r < 3; r++) { KB.add(box(0.9, 0.03, 0.12), ch(M, 0, 0.92 + r * 0.3, 0.44), wood()); for (let c2 = 0; c2 < 3; c2++) KB.add(box(0.15, 0.17, 0.02), ch(M, -0.28 + c2 * 0.28, 1.03 + r * 0.3, 0.408), { color: V.soot, moss: 0, ground: y - 3 }); }
  });
  // drying trays: two racks of split cane on trestles, saffron on one and madder root on the other
  for (const [name, col] of [['rungs-low-2', V.saffron], ['rungs-low-4', V.madder]]) onRoof(name, 0.62, (M, y) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(KB, M, [sx * 0.5, 0, sz * 0.3], [sx * 0.45, 0.62, sz * 0.26], 0.05, raw());
    KB.add(box(1.15, 0.035, 0.72), ch(M, 0, 0.635, 0, 0.03, 0, 0), wood(1.3));
    KB.add(box(1.02, 0.03, 0.6, { seg: 0.3 }), ch(M, 0, 0.668, 0, 0.03, 0, 0), { color: worn(col, rng, 0.12), moss: 0, ground: y - 3, disp: 0.012, dispScale: 9, emit: limeGlow(col, 0.05) });
  }, [-0.5, 0.1, -0.9]);
  // a loom: two uprights, the beams, the warp and a hand of cloth begun
  onRoof('rungs-low-5', 0.55, (M, y) => {
    for (const sx of [-1, 1]) { beam(KB, M, [sx * 0.55, 0, 0], [sx * 0.55, 1.75, -0.12], 0.07, raw()); beam(KB, M, [sx * 0.55, 0.0, -0.5], [sx * 0.55, 1.1, -0.07], 0.05, raw()); }
    for (const yy of [0.32, 1.66]) beam(KB, M, [-0.66, yy, -0.02 - yy * 0.065], [0.66, yy, -0.02 - yy * 0.065], 0.08, raw());
    KB.add(box(0.96, 1.3, 0.012), ch(M, 0, 0.99, -0.085, -0.068, 0, 0), { color: worn(V.linen, rng, 0.1), moss: 0, ground: y - 3 });
    KB.add(box(0.97, 0.42, 0.02), ch(M, 0, 0.56, -0.026, -0.068, 0, 0), { color: worn(V.madder, rng, 0.1), moss: 0, ground: y - 3, emit: limeGlow(V.madder, 0.05) });
  }, [-0.6, 0, -1]);

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
    for (let i = 1; i < n; i++) KB.add(box(w - 0.02 - rng() * 0.08, 0.035, 0.085, { chip: 0.01 }), F.clone().multiply(mat(0, -i * rise + 0.008, (i - 1) * run + 0.045)), { color: worn(V.lime, rng, 0.12 + rng() * 0.25), moss: 0.05, ground: yL - 3, emit: limeGlow(V.lime, 0.1) });
    // the head: planks from the nosing to the first riser
    ways.bridge(K, { name: 'rungs-gullet-head', a: [cx0 - b[0] * 0.3 + t[0] * sh, yM, cz0 - b[1] * 0.3 + t[1] * sh], b: [hx + b[0] * 0.04, yM, hz + b[1] * 0.04], width: w + 0.1, rails: false, register: false });
    const floor = (x, z) => { const dx = x - hx, dz = z - hz, a = dx * b[0] + dz * b[1], u = dx * t[0] + dz * t[1]; if (a < 0 || a >= len || u > w / 2 + 0.03 || u < -w / 2 - 0.03) return null; return yM - (Math.floor(a / run) + 1) * rise; };
    K.addFloor(floor, { name: G.id, keep: true });
    for (const sd of [-1, 1]) for (let i = 0, m = 4; i < m; i++) { // nobody walks into its mass from the slot beside it
      const a0 = len * i / m, a1 = len * (i + 1) / m, top = yM - drop * Math.min(1, (a1 + 0.7) / len) - 0.4; if (top < yL + 0.3) continue;
      const px = t[0] * sd * (w / 2 + 0.05), pz = t[1] * sd * (w / 2 + 0.05); K.wall(hx + b[0] * a0 + px, hz + b[1] * a0 + pz, hx + b[0] * a1 + px, hz + b[1] * a1 + pz, 0.15, yL - 0.4, top - yL + 0.4);
    }
    const fx = hx + b[0] * len, fz = hz + b[1] * len;
    K.ascent({ id: G.id, held: true, offs: [0.4], path: [[fx + b[0] * 1.3, fz + b[1] * 1.3, yL], [fx, fz, yL], [hx - b[0] * 0.9, hz - b[1] * 0.9, yM], [hx - b[0] * 2.4, hz - b[1] * 2.4, yM]] });
    // a hand-rope down the wider side, pegged to the house wall, and a jar at the foot in the slot
    pot(KB, I4, fx - t[0] * 1.25 - b[0] * 0.5, yL, fz - t[1] * 1.25 - b[1] * 0.5, 0.28, worn(L.tile[4], rng, 0.4), 2);
    ctx.addCollider({ x: fx - t[0] * 1.25 - b[0] * 0.5, z: fz - t[1] * 1.25 - b[1] * 0.5, r: 0.3, y: yL, h: 0.6 });
  }

  // ---------------------------------------------------------------- the Tenter: the dyers' stair and their yard
  {
    const T = RUNGS.tenter, run = T.run, g = T.sign, dir = RUN[run].dir, f = [dir[0] * g, dir[1] * g], drop = yM - yL, yard = P.plot('rungs-dyers');
    ways.bridge(K, { name: 'rungs-tenter-head', a: W3(run, T.s - 1.3 * g, DM + 0.72, yM), b: W3(run, T.s, DM + 0.72, yM), width: 1.75, rails: false, register: false });
    const [x, z] = at(run, T.s, DM + T.out);
    const fl = ways.timberFlight(K, { land: W3(run, T.s - 0.7 * g, DM - 1.3, yM), name: T.id, x, y: yM, z, f, drop, width: T.width, run: T.run1, rails: g > 0 ? [false, true] : [true, false], props: [0.05, 0.42], propBase: yL });
    K.rail([W3(run, T.s - 1.25 * g, DM + 0.05, yM), W3(run, T.s - 1.25 * g, DM + 1.5, yM), W3(run, T.s - 0.1 * g, DM + 1.5, yM)], {});
    for (const [u, v] of [[-1.2, 0.4], [-1.2, 1.5], [-0.1, 1.5]]) KB.add(box(0.12, drop, 0.12), mat(...W3(run, T.s + u * g, DM + v, yM - drop / 2 - 0.05)), wood(0.9));
    // the tenter lines: four tall poles stood along the yard's edge and a line down them, two more lines out to them
    // from posts on the Mid Rung's nosing, over the stair; the cloth in lengths: saffron, cream, madder
    const sa = T.s + g * fl.length + 0.05, sb = T.s + 0.15, Dp = DM + 3.45, yT = yM + 1.4, dyes = [V.saffron, V.linen, V.madder, V.madder, V.saffron, V.linen];
    const ss = [0, 0.34, 0.69, 1].map((u) => sa + (sb - sa) * u), sag = (u, k = 0.2) => -k * 4 * u * (1 - u);
    let nd = 0;
    // a length of cloth hung from M's origin, its width along M's +x: most of it down one side, a hand thrown over
    const cloth = (M, w, lh) => { const col = worn(dyes[nd++ % dyes.length], rng, 0.1, 0.12), o = { color: col, moss: 0, ground: yL - 6, emit: limeGlow(col, 0.07) }, tilt = 0.015 + rng() * 0.03;
      KB.add(box(w, lh, 0.016, { seg: 0.9 }), ch(M, 0, -lh / 2 + 0.012, 0.03 + Math.sin(tilt) * lh / 2, tilt, 0, 0), { ...o, disp: 0.006, dispScale: 1.3 });
      KB.add(box(w, lh * 0.18, 0.016), ch(M, 0, -lh * 0.09 + 0.012, -0.03, -0.1, 0, 0), { ...o, color: jit(col, 0.9) });
      KB.add(box(w, 0.016, 0.09), ch(M, 0, 0.014, 0.002), o); }; // (the fold over the line)
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

  // ---------------------------------------------------------------- the Short Stair: a Heliarch flight, built over
  // Along the riser east of the pier, exact ashlar on a solid core: seven treads go down from the Mid Rung and the
  // eighth is in the end wall of the house that was built over the rest. A tread is gone, the cheek is a stump.
  {
    const S = RUNGS.stub, run = S.run, g = S.sign, w = S.width, Dc = DM + 0.05 + w / 2, rise = 0.25, going = 0.26, stone = (k) => ({ color: jit(H.stone, k), course: 0.5, moss: 0.45, ground: yL });
    const step = (i, extra = 0, sink = 0) => { const top = yM - (i + 1) * rise - sink, h = top - yL + 0.3; KB.add(box(w, h, going + extra, { chip: 0.03, seed: i }), ch(RM(run, S.s + g * ((i + 0.5) * going + extra / 2), Dc, yL), 0, h / 2 - 0.3, 0), stone(0.88 + (i % 3) * 0.06)); };
    for (let i = 0; i < 6; i++) step(i, 0, i === 3 ? 0.27 : 0); // (the fourth tread has gone down the hill)
    step(6, 0.5);
    KB.add(box(w, yM - yL + 0.3, 0.32, { chip: 0.03 }), ch(RM(run, S.s - g * 0.16, Dc, yL), 0, (yM - yL) / 2 - 0.15, 0), stone(0.95)); // its head, at the nosing
    KB.add(box(0.3, yM - yL + 0.75, 3 * going + 0.3, { chip: 0.06, chipTop: true, seed: 31 }), ch(RM(run, S.s + g * (1.5 * going - 0.15), Dc + w / 2 + 0.16, yL), 0, (yM - yL + 0.75) / 2 - 0.3, 0), stone(0.86));
    KB.add(box(0.3, 2.9, 2 * going, { chip: 0.07, chipTop: true, seed: 33 }), ch(RM(run, S.s + g * 4 * going, Dc + w / 2 + 0.16, yL), 0, 1.15, 0, 0.03, 0, 0), stone(0.82));
    const [bx, bz] = at(run, S.s + g * 1.1, Dc + 1.75);
    KB.add(box(0.8, 0.26, 0.5, { chip: 0.06, seed: 41 }), mat(bx, yL + 0.1, bz, 0.05, 0.7, 0.04), stone(0.8)); // the lost tread
    const a = at(run, S.s + g * 0.3, Dc + 0.05), c = at(run, S.s + g * 7 * going, Dc + 0.05);
    K.wall(a[0], a[1], c[0], c[1], w / 2 + 0.1, yL - 0.5, yM - yL);
  }

  // ---------------------------------------------------------------- the Slype: the lane under the main
  // The Low Rung's lane ducks in against the Mid Rung's riser to pass under the main. There, built against the Elder
  // face: a plastered door-case and its door (what is behind it is batch 3's), and a niche with a light in it.
  {
    const S = RUNGS.slype, run = S.run, sm = (S.s0 + S.s1) / 2, D0 = DM + 0.12; // (the riser's foot stands 0.2 out from its head)
    const M = ch(RM(run, sm, D0, yL), 0, 0, 0, 0, Math.PI / 2, 0); // +z out from the riser, +x toward the west
    // one plastered front against the step, out of true: a horseshoe door in it and, east of the door, a small round-headed niche
    const wash = worn(L.plaster[3], rng, 0.22), from = KB.count, dw = 1.0, nx = -1.15; // (the niche clear of the front's end: a hole that touches the outline leaves the end face open)
    facade(KB, ch(M, 0, 0, 0.2), { w: 3.5, d: 0.4, top: [[1.75, 2.35], [0.9, 2.62], [0.1, 2.7], [-0.9, 2.48], [-1.75, 2.2]], openings: [{ kind: 'horseshoe', x: 0.45, y: 0.012, w: dw, sp: 1.45 }, { kind: 'round', x: nx, y: 1.05, w: 0.5, sp: 0.42 }], color: wash, moss: 0.2, ground: yL, emit: limeGlow(wash, 0.07), n: low ? 7 : 10 });
    leaf(KB, ch(M, 0.45, 0, 0.24), dw + 0.24, 2.1, worn(L.paint[1], rng, 0.35), rng, { plain: low });
    KB.add(box(dw + 0.5, 0.26, 0.5, { chip: 0.03 }), ch(M, 0.45, -0.07, 0.42), { color: H.stone, moss: 0.45, ground: yL });
    KB.add(box(0.62, 0.8, 0.04), ch(M, nx, 1.4, 0.17), { color: new THREE.Color('#3a2410'), moss: 0, ground: yL - 3, emit: [V.lit[0] * 0.3, V.lit[1] * 0.3, V.lit[2] * 0.3, 1] });
    KB.add(box(0.62, 0.05, 0.24), ch(M, nx, 1.03, 0.3), { color: worn(L.tile[1], rng, 0.3), moss: 0.1, ground: yL });
    dirty(KB, from, 0.2, rng);
    // the light in it: a clay lamp on the sill (not a hung one: its cup is open, and this one is looked down into)
    KB.add(box(0.16, 0.05, 0.13, { chip: 0.015 }), ch(M, nx, 1.08, 0.3), { color: worn(L.tile[4], rng, 0.3), moss: 0, ground: yL });
    { const g = L.glass.amber; KB.add(new THREE.IcosahedronGeometry(0.055, 1), ch(M, nx - 0.03, 1.15, 0.3, 0, 0, 0, 0.8, 1.5, 0.8), { color: new THREE.Color('#201008'), moss: 0, ground: yL - 3, emit: [g[0] * 0.7, g[1] * 0.7, g[2] * 0.7, 1] }); }
  }

  // ---------------------------------------------------------------- the Squint: a bench where the three stairs are seen
  {
    const R = records[RUNGS.squint.plot];
    if (R) { const x = R.roof.x1 - 0.36, z = R.roof.zb + 0.95, q = R.W(x, R.roof.y, z);
      PARTS.late.bench(KB, ch(MP(R), x, R.roof.y, z, 0, Math.PI / 2, 0), { w: 1.25, h: 0.45, d: 0.5, rng });
      ctx.addCollider({ x: q.x, z: q.z, r: 0.4, y: q.y, h: 0.45 }); taken.push([q.x, q.z, 0.8]); }
  }

  // ---------------------------------------------------------------- what the bones left: the ladder
  // Its poles stop a walker (a hand's breadth each, so the rungs between them are still reached); a knotted hand-rope
  // hangs beside it from the Tenter's corner post, a lamp under the bridge's baulk lights its head, and the stone
  // before its foot is worn pale.
  {
    const ld = P.way('rungs-ladder'), T = RUNGS.tenter;
    for (const sd of [-1, 1]) { const a = at(ld.run, ld.s + sd * 0.25, DM + 0.7), c = at(ld.run, ld.s + sd * 0.25, DM + 0.42); ctx.addCollider({ x1: a[0], z1: a[1], x2: c[0], z2: c[1], r: 0.05, y: yL, h: 1.9, stand: false }); }
    const M = RM(ld.run, T.s + 1.25, DM + 0.05, yM), top = [0.02, 0.86, 0.02], pts = [top, [0.2, -0.3, 0.2], [0.34, -1.5, 0.16], [0.36, -2.6, 0.22], [0.4, -3.35, 0.18]];
    for (let i = 0; i < pts.length - 1; i++) { beam(KB, M, pts[i], pts[i + 1], 0.035, { color: V.rope, moss: 0.05, ground: yL - 3, round: 5 }); if (i) KB.add(new THREE.IcosahedronGeometry(0.045, 0), ch(M, ...pts[i]), { color: jit(V.rope, 0.8), moss: 0, ground: yL - 3 }); }
    KB.add(new THREE.IcosahedronGeometry(0.06, 0), ch(M, ...pts[pts.length - 1]), { color: jit(V.rope, 0.75), moss: 0, ground: yL - 3 });
    const br = P.way('lane-bridge'); hangLamp(KB, { x: at(br.run, br.s - 0.43, DM + 1.0)[0], y: yM - 0.275, z: at(br.run, br.s - 0.43, DM + 1.0)[1] }, 'amber', 0.55);
    KB.add(box(0.5, 0.09, 0.78, { chip: 0.04 }), ch(RM(ld.run, ld.s, DM + 1.22, yL), 0, 0.015, 0, 0, 0.1, 0), { color: jit(H.stone, 1.25), moss: 0.15, ground: yL - 2 });
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
