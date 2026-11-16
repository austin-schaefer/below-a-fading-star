// The Quarrels (v15-Q1): the Lappet's crown, the level ground under Carcanet Keep's fallen north-east corner, and the
// only place in the valley where anything is being built. The Late folk are quarrying the keep: its fallen blocks are
// split, dragged and relaid as a house that is half up, and its fallen saint is their kiln and their trough.
//
// What stands here, every coordinate from src/v15/plan.js (the plots, QUARRELS, QUARRELS_ROUTE):
//   the Brow House        quarrels-house-2: a narrow Late house on the rim at the west end, the first lit window
//   the Leaning Lodging   quarrels-house-1: a Late house whose back is the west flank of the keep's fallen face (the
//                         slab, plan.SLAB); its roof is level with the slab where they meet, so the slab is its stair
//   the Saint's Rest      the square at the Heliarch stair's head: Heliarch hexagons relaid, a keep slab, the stock
//   the Smoking Saint     the lime kiln, in the head of the keep's fallen colossus, lying in the square's middle
//                         behind the stair's head; a bench at his cheek looks where he looks, at the Pomegranate
//                         House; three lesser heads wait in a row on the brink
//   the quarry            in the wound: a block split with wedges, the shears over a block half
//                         lifted, the windlass between its legs
//   the Drag              a track of planks from the shears round the stock and along the brink, a loaded sledge on it
//   the Last Arch         the aqueduct's last standing arch (on the line of the Rungs' pier); the templates hang on
//                         its pier; its drip falls into the saint's upturned hand (the Almoner), the masons' trough
//   the Banker            the masons' stock, twelve blocks squared up on the brink east of the saint
//   the Stage             a scaffold on the Last Arch's near pier, climbed by a cleated plank run (ascent `quarrels-stage`)
//   the chalk             the next blocks marked out on the keep's fallen face, and a tally
//   the Unroofed House    new-house: the kit's new house, rising, its stock between its wall and the old pier
// The makers: src/v15/houses/ (the plots), ./quarrels/saint.js, works.js, air.js.
//
// Draws: one mesh in the stone shader (`quarrels`), one Points (`quarrels-air`: smoke, the stoke hole's glow, the
// drip). Three point lights: the kiln's fire, the lamp by the saint's bench, a lamp on the old pier.
// ctx.quarrels = { records, route, places (where batch 3's people, goods and sounds go), stats() }. ?quarrels=0
// leaves it out.
import * as THREE from 'three';
import { makePlot, registerAll, plotMatrix, site } from '../houses/index.js';
import { L, H, V, PARTS, ch, worn, beam, hangLamp, pot, washing, patch } from '../houses/kit.js';
import { KEEP as KEEP_BUILT } from '../../structures/keep.js';
import { saint, lesserHead, almoner, bench } from './quarrels/saint.js';
import { lastArch, templates, shears, splitBlock, drag } from './quarrels/works.js';
import { air } from './quarrels/air.js';

// what each plot is given beyond what the plan says (the seed is the building)
const OPTS = {
  'new-house': { seed: 2, stage: 1 },
  'quarrels-house-1': { seed: 5, batter: 0.008 }, // (3.5 m to the slab's top: the kit's batter at that height reads as a lean)
  'quarrels-house-2': { seed: 3, form: 'tower' },
};

const WARM = new THREE.Color('#c9783a'); // firelight on stone, where it is baked
const LIFT = 0.015; // a Late house's floor and doorstep stand this far above the tread they are laid on

export async function build(ctx) {
  const url = new URL(location.href);
  if (url.searchParams.get('quarrels') === '0' || !ctx.strata?.on) { ctx.quarrels = { off: true }; return; }
  if (ctx.built) await ctx.built('lappet'); // (the plan, the ways' kit, what V0 built: read after they are there)
  if (!ctx.lappet || ctx.lappet.on === false) { ctx.quarrels = { off: true }; return; }
  const P = ctx.lappet.plan, Q = P.QUARRELS, low = ctx.quality === 'low', Y = P.LEVEL.crown.y, N2 = ctx.noise.noise2;
  const rng = ctx.makeRng(15101), B = ctx.strata.builder();
  const bx = (w, h, d, o = {}) => B.box(w, h, d, { seg: 9, ...o });
  const F = (x, z, face, y = Y) => plotMatrix({ x, z, y, face }); // a frame on the crown: +z along `face`, +x to its right seen from in front
  const colliders = [], add = (list) => { for (const c of list) colliders.push(c); };
  const at3 = (run, s, D, y = Y) => { const [x, z] = P.at(run, s, D); return [x, y, z]; };
  const n1 = P.RUN[1].n, n2 = P.RUN[2].n, d1 = P.RUN[1].dir, d2 = P.RUN[2].dir;

  // the keep's fallen face, as the keep builds it: the plan's copy must be the same slab
  { const S = KEEP_BUILT.slab, T = P.SLAB;
    if (!S || S.b !== T.b || S.r0 !== T.r0 || S.Ls !== T.Ls || S.W !== T.W || Math.abs(S.yHi - T.yHi) > 1e-6) console.warn('quarrels: the keep\'s fallen slab is not where src/v15/plan.js SLAB says: the Leaning Lodging will not meet it'); }
  const inSlab = (x, z, pad = 0) => { const dx = x - P.KEEP.x, dz = z - P.KEEP.z, al = dx * P.SLAB.f[0] + dz * P.SLAB.f[1] - P.SLAB.r0, sd = dx * P.SLAB.side[0] + dz * P.SLAB.side[1]; return al > -pad && al < P.SLAB.len + pad && Math.abs(sd) < P.SLAB.W / 2 + pad; };

  // ---------------------------------------------------------------- the plots
  const records = [], byName = {};
  for (const p of P.PLOTS) {
    if (p.quarter !== 'quarrels' || p.kind === 'yard') continue;
    const o = { ...OPTS[p.name] };
    if (p.leans === 'slab') { o.against = true; o.h = p.roofY - p.y; o.form = 'yard'; }
    const R = makePlot(B, p.kind === 'house' ? { ...p, y: p.y + LIFT } : p, { plan: P, built: ctx.lappet.built, low, ...o });
    records.push(R); byName[p.name] = R;
    R.lamps.forEach((lamp, i) => hangLamp(B, lamp, ['amber', 'ruby'][(R.seed + i) % 2], 0.5));
  }
  registerAll(ctx, records, 'quarrels');
  // robbed stone at the foot: the Late houses stand on a course of the keep's ashlar, a block at each front corner
  for (const name of ['quarrels-house-1', 'quarrels-house-2']) {
    const R = byName[name], p = P.plot(name), M = plotMatrix(p), f = { x0: -p.w / 2, x1: p.w / 2, zf: p.d / 2 };
    const inv = M.clone().invert(), doors = R.doors.map((d) => new THREE.Vector3(d.x, d.y, d.z).applyMatrix4(inv).x);
    for (const [x, w] of [[f.x0 + 0.5, 1.0], [f.x1 - 0.55, 1.1], [(f.x0 + f.x1) / 2, 0.9]]) {
      if (doors.some((dx) => Math.abs(dx - x) < w / 2 + 0.85)) continue;
      B.add(bx(w, 0.62, 0.34, { chip: 0.04, seed: x * 7 }), ch(M, x, 0.2, f.zf + 0.1, 0, (rng() - 0.5) * 0.04, 0), { color: worn(H.stone, rng, 0.1, 0.1), course: 0, moss: 0.5, ground: Y });
    }
  }

  // No wall of a house here is blank: on each side and back a visitor can walk round to, a small shuttered window,
  // a mended patch, a buttress of robbed ashlar or the things kept against a wall; a washing line joins the two houses.
  const dressWall = (WM, len, kinds, hgt = 2.6) => { // WM: the wall's foot middle on its face, +z out of it, +x along it
    const wood = () => ({ color: worn(L.wood, rng, 0.2, 0.2), moss: 0.05, ground: Y });
    for (const [kind, u] of kinds) {
      const x = (u - 0.5) * len;
      if (kind === 'window') {
        const w = 0.5, h = 0.72, y = 1.45, lit = rng() < 0.5;
        B.add(bx(w, h, 0.3), ch(WM, x, y + h / 2, -0.13), { color: V.pane, moss: 0, ground: Y, ...(lit ? { emit: [V.lit[0] * 0.55, V.lit[1] * 0.55, V.lit[2] * 0.55, 1] } : {}) });
        for (const sx of [-1, 1]) B.add(bx(0.07, h + 0.14, 0.34), ch(WM, x + sx * (w / 2 + 0.035), y + h / 2, -0.12), wood());
        B.add(bx(w + 0.3, 0.07, 0.4), ch(WM, x, y - 0.047, -0.1), { color: worn(H.stone, rng, 0.1), moss: 0.3, ground: Y, course: 0 });
        B.add(bx(w + 0.14, 0.07, 0.34), ch(WM, x, y + h + 0.047, -0.12), wood());
        for (const k of [0.33, 0.66]) B.add(bx(0.025, h, 0.025), ch(WM, x - w / 2 + w * k, y + h / 2, 0.025), { color: L.iron, iron: 0.8, moss: 0, ground: Y });
        const leafC = worn([V.teal, V.madder, V.saffron][Math.floor(rng() * 3)], rng, 0.35, 0.1);
        B.add(bx(w * 0.52, h, 0.2), ch(WM, x + w / 2 + 0.07 + w * 0.26, y + h / 2, -0.05, 0, -0.06, 0), { color: leafC, moss: 0.05, ground: Y });
      } else if (kind === 'buttress') {
        let y0 = -0.05; [[1.3, 0.55, 0.7], [1.1, 0.5, 0.5], [0.9, 0.45, 0.32]].forEach(([w, h, d], i) => { B.add(bx(w, h, d, { chip: 0.04, seed: i + u * 9 }), ch(WM, x + (rng() - 0.5) * 0.06, y0 + h / 2, d / 2 - 0.06, 0, (rng() - 0.5) * 0.03, 0), { color: worn(H.stone, rng, 0.1, 0.12), moss: 0.5 - i * 0.1, ground: Y, course: 0 }); y0 += h - 0.01; });
      } else if (kind === 'patch') {
        patch(B, ch(WM, x, 0.9 + rng() * 0.8, 0.012), 0.42 + rng() * 0.2, rng, { color: worn(V.mud, rng, 0.2, 0.1), moss: 0.1, ground: Y });
      } else if (kind === 'wood') {
        for (let i = 0; i < 9; i++) { const row = i < 4 ? 0 : i < 7 ? 1 : 2, k = i < 4 ? i : i < 7 ? i - 4 + 0.5 : i - 7 + 1; B.add(B.cyl(0.075, 0.085, 0.7, 5, 1), ch(WM, x - 0.3 + k * 0.17, 0.08 + row * 0.15, 0.4, Math.PI / 2, 0, (rng() - 0.5) * 0.1), wood()); }
      } else if (kind === 'pots') {
        pot(B, WM, x - 0.3, 0, 0.32, 0.22, worn(L.tile[0], rng, 0.4), 2.0, 8); pot(B, WM, x + 0.22, 0, 0.26, 0.16, worn(V.mud, rng, 0.3), 1.7, 8);
      } else if (kind === 'poles') {
        for (let i = 0; i < 3; i++) beam(B, WM, [x - 0.3 + i * 0.28, -0.4, 0.55 + i * 0.06], [x - 0.2 + i * 0.22, Math.min(hgt, 2.9) - i * 0.2, -0.16], 0.07, { color: worn(V.rawWood, rng, 0.15, 0.15), moss: 0.03, ground: Y, round: 6 }, 0.055);
      }
    }
  };
  { const p2 = P.plot('quarrels-house-2'), M2 = plotMatrix(p2), p1 = P.plot('quarrels-house-1'), M1 = plotMatrix(p1);
    dressWall(ch(M2, 0, 0, -p2.d / 2, 0, Math.PI, 0), p2.w, [['window', 0.3], ['buttress', 0.78], ['pots', 0.5]]);
    dressWall(ch(M2, p2.w / 2, 0, 0, 0, Math.PI / 2, 0), p2.d, [['patch', 0.4], ['poles', 0.72], ['window', 0.25]]);
    dressWall(ch(M2, -p2.w / 2, 0, 0, 0, -Math.PI / 2, 0), p2.d, [['window', 0.6], ['wood', 0.25], ['patch', 0.8]]);
    dressWall(ch(M1, p1.w / 2, 0, 0, 0, Math.PI / 2, 0), p1.d, [['window', 0.45], ['buttress', 0.8], ['patch', 0.2]]);
    dressWall(ch(M1, -p1.w / 2, 0, 0, 0, -Math.PI / 2, 0), p1.d, [['window', 0.5], ['wood', 0.2], ['poles', 0.8]]);
    // the washing line, from the Brow House's back to the lodging's side, over the way between them
    const a = new THREE.Vector3(-0.6, 2.75, -p2.d / 2 + 0.02).applyMatrix4(M2), b = new THREE.Vector3(-p1.w / 2 + 0.02, 2.75, 0.5).applyMatrix4(M1);
    for (const [q, QM] of [[a, M2], [b, M1]]) B.add(bx(0.5, 0.1, 0.5), new THREE.Matrix4().makeRotationY(Math.atan2(QM.elements[8], QM.elements[10])).setPosition(q.x, q.y, q.z), { color: L.iron, iron: 0.8, moss: 0, ground: Y });
    washing(B, new THREE.Matrix4(), [a.x, a.y, a.z], [b.x, b.y, b.z], rng, low ? 4 : 6); }

  // ---------------------------------------------------------------- the Saint's Rest: the square's paving
  // Heliarch hexagons lifted from the causeway and relaid round the stair's head, dusted with lime; ragged at the
  // edge, one in eight gone, the Elder slab showing under them
  {
    const pv = Q.paving, R = 0.44, yawH = Math.atan2(d1[0], d1[1]), stockP = P.plot('masons-yard');
    const court = (s, D) => { const u = Math.abs(s - P.STAIR.s), half = P.STAIR.width / 2 + 1.1 * Math.max(0, 1 - Math.abs(D + 5.95) / 1.15); return D > -7.4 && u < half + 0.3; }; // the Heliarch landing V0 laid behind the stair's head
    const kc = Q.kiln;
    let n = 0;
    for (let i = 0; (i * 1.5 * R) < pv.s1 - pv.s0; i++) for (let j = 0; j * Math.sqrt(3) * R < pv.D1 - pv.D0; j++) {
      const s = pv.s0 + i * 1.5 * R, D = pv.D0 + (j + (i & 1) * 0.5) * Math.sqrt(3) * R;
      if (D > pv.D1 - R * 0.9 || s > P.cornerS(1, D) - 0.4) continue;
      const [x, z] = P.at(1, s, D);
      const edge = Math.min(s - pv.s0, pv.s1 - s, D - pv.D0) / 1.6, r = rng(), r2 = rng(), r3 = rng();
      if (court(s, D) || inSlab(x, z, 0.5) || P.inPlot(stockP, x, z, -0.2) && ((x - stockP.x) * stockP.face[0] + (z - stockP.z) * stockP.face[1]) > -0.3) continue;
      const dk = Math.hypot(x - kc.x, z - kc.z); if (dk < 0.86 * (kc.S || 1.7) + 0.55) continue;
      const warm = Math.max(0, 1 - Math.hypot(x - (kc.x + kc.stoke[0] * 3.2), z - (kc.z + kc.stoke[1] * 3.2)) / 4.5); // the fire's light, baked: the stones by the stoke hole are warm
      if (r < 0.1 || (edge < 1 && r2 > edge * 0.8 + 0.35)) continue;
      const tilt = r3 < 0.1 ? 0.05 : 0.012;
      B.add(B.cyl(R - 0.025, R - 0.035, 0.16, 6, 1), new THREE.Matrix4().makeRotationY(yawH + Math.PI / 6).setPosition(x, Y - 0.035 + r3 * 0.02, z).multiply(new THREE.Matrix4().makeRotationX((rng() - 0.5) * tilt * 2)),
        { color: worn(r2 < 0.14 ? H.dark : H.stone, rng, 0.08, 0.14).lerp(V.newDust, 0.16 + 0.2 * rng()).lerp(WARM, warm * 0.45), moss: 0.5 * (1 - warm), ground: Y - 0.4, course: 0 });
      n++;
    }
    ctx.log?.(`quarrels: ${n} hexagons relaid`);
  }

  // ---------------------------------------------------------------- the Smoking Saint, his bench, the heads that wait
  const kiln = saint(B, F(Q.kiln.x, Q.kiln.z, Q.kiln.face), { S: Q.kiln.S, // (F takes any length of face)
    stoke: [Q.kiln.stoke[0] * Q.kiln.face[1] - Q.kiln.stoke[1] * Q.kiln.face[0], Q.kiln.stoke[0] * Q.kiln.face[0] + Q.kiln.stoke[1] * Q.kiln.face[1]], N2, low, rng });
  add(kiln.colliders);
  // the bench: at his right cheek (the east side, away from the fire's mouth), its sitters looking where he looks
  const kf = Q.kiln.face, kl = Math.hypot(kf[0], kf[1]), face = [kf[0] / kl, kf[1] / kl], right = [-face[1], face[0]];
  const seat = bench(B, F(Q.kiln.x + right[0] * 2.1 + face[0] * 0.25, Q.kiln.z + right[1] * 2.1 + face[1] * 0.25, face), { rng, w: 1.45 });
  add(seat.colliders);
  // a lamp on a mason's pole by the bench: the light his face is read by after the sun has left the square
  const bp = [Q.kiln.x + right[0] * 2.5 + face[0] * 1.6, Q.kiln.z + right[1] * 2.5 + face[1] * 1.6];
  beam(B, new THREE.Matrix4(), [bp[0], Y - 0.3, bp[1]], [bp[0] - right[0] * 0.1, Y + 2.9, bp[1] - right[1] * 0.1], 0.11, { color: worn(V.rawWood, rng, 0.1), moss: 0.03, ground: Y, round: 6 }, 0.08);
  beam(B, new THREE.Matrix4(), [bp[0], Y + 2.62, bp[1]], [bp[0] - right[0] * 0.75, Y + 2.8, bp[1] - right[1] * 0.75], 0.05, { color: worn(V.rawWood, rng, 0.1), moss: 0.03, ground: Y, round: 5 });
  const benchLamp = { x: bp[0] - right[0] * 0.7, y: Y + 2.78, z: bp[1] - right[1] * 0.7 };
  hangLamp(B, benchLamp, 'amber', 0.5);
  colliders.push({ x: bp[0], z: bp[1], r: 0.12, y: Y - 0.5, h: 3.2, stand: false });
  for (const [run, s, D, r] of Q.heads) {
    const [x, z] = P.at(run, s, D), dx = Q.kiln.x - x, dz = Q.kiln.z - z, l = Math.hypot(dx, dz);
    add(lesserHead(B, F(x, z, [dx / l, dz / l], Y - r * 0.12), { r, N2, low, rng, rz: (rng() - 0.5) * 0.3, rx: (rng() - 0.5) * 0.16 }).colliders);
  }

  // ---------------------------------------------------------------- the quarry: the split block, the shears
  { const [x, z] = [Q.split.x, Q.split.z]; add(splitBlock(B, F(x, z, d1, Y), { rng }).colliders); } // (its length across the stair's axis: +x of a frame facing along the rim is -n: into the crown)
  const sh = shears(B, new THREE.Matrix4().makeTranslation(Q.shears.x, Y, Q.shears.z), { feet: [[-1.5, -0.6], [1.5, -0.6], [0, 2.1]], rng, low });
  add(sh.colliders);

  // ---------------------------------------------------------------- the Drag
  const dr = drag(B, Q.track.map((t) => [t.x, Y, t.z]), { rng, sledge: Q.sledge });
  add(dr.colliders);

  // ---------------------------------------------------------------- the Last Arch, the templates, the Almoner
  const aq = Q.aqueduct, [ax, az] = P.at(aq.run, aq.s, aq.piers[1]);
  const AM = F(ax, az, P.RUN[aq.run].n), arch = lastArch(B, AM, { span: aq.piers[1] - aq.piers[0], over: Q.hand.D - aq.piers[1] - 1.15, rng, low });
  add(arch.colliders);
  templates(B, arch.west, { rng, low });
  // a lamp on the pier's corner, over the templates
  const lampM = ch(arch.west, -0.92, 2.95, 0);
  const lb = PARTS.late.bracket(B, lampM, { reach: 0.5 }), lampAt = new THREE.Vector3(lb.x, lb.y, lb.z).applyMatrix4(lampM);
  hangLamp(B, { x: lampAt.x, y: lampAt.y, z: lampAt.z }, 'amber', 0.6);
  const hand = almoner(B, F(Q.hand.x, Q.hand.z, P.RUN[Q.hand.run].n), { rng, low });
  add(hand.colliders);
  // the jar under his fingers, and two more beside the pier with their yoke laid down by them: the water is carried from here
  pot(B, new THREE.Matrix4(), hand.jar[0], Y, hand.jar[2], 0.2, worn(L.tile[0], rng, 0.45), 2.0, 8);
  { const [jx, , jz] = at3(aq.run, aq.s - 1.5, aq.piers[1] + 1.9), JM = F(jx, jz, d2);
    for (const s of [-1, 1]) pot(B, JM, s * 0.55, 0, 0, 0.19, worn(s > 0 ? V.mud : L.tile[4], rng, 0.4), 2.0, 8);
    beam(B, JM, [-0.75, 0.025, 0.42], [0.75, 0.03, 0.34], 0.05, { color: worn(V.rawWood, rng, 0.25), moss: 0, ground: Y, round: 5 });
    const a = new THREE.Vector3(-0.55, 0, 0).applyMatrix4(JM), b = new THREE.Vector3(0.55, 0, 0).applyMatrix4(JM);
    colliders.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, r: 0.25, y: Y - 0.5, h: 1.3, stand: false }); }

  // lamps where the way turns (glass and flame only: the three lights are the kiln's, the pier's and the lodging's):
  // one hung on the shears' leg, one on a mason's pole where the Drag turns along the brink
  { const f = [1.5, -0.6], t = 0.3, lx = Q.shears.x + f[0] * (1 - t) + 0.16, lz = Q.shears.z + f[1] + (0.55 - f[1]) * t, ly = Y - 0.3 + 6.7 * t;
    B.add(bx(0.05, 0.05, 0.3), new THREE.Matrix4().makeTranslation(lx - 0.1, ly + 0.02, lz), { color: L.iron, iron: 0.8, moss: 0, ground: Y });
    hangLamp(B, { x: lx, y: ly, z: lz }, 'amber', 0.7);
    const tp = Q.track[1], px = tp.x + 0.9, pz = tp.z - 0.9;
    beam(B, new THREE.Matrix4(), [px, Y - 0.3, pz], [px + 0.12, Y + 2.7, pz + 0.05], 0.11, { color: worn(V.rawWood, rng, 0.1), moss: 0.03, ground: Y, round: 6 }, 0.08);
    beam(B, new THREE.Matrix4(), [px - 0.05, Y + 2.45, pz], [px + 0.6, Y + 2.6, pz + 0.1], 0.05, { color: worn(V.rawWood, rng, 0.1), moss: 0.03, ground: Y, round: 5 });
    hangLamp(B, { x: px + 0.55, y: Y + 2.58, z: pz + 0.09 }, 'ruby', 0.7);
    colliders.push({ x: px, z: pz, r: 0.12, y: Y - 0.5, h: 3.2, stand: false }); }

  // ---------------------------------------------------------------- the Banker: the masons' stock
  // Twelve blocks of the keep squared up on the brink east of the saint (the plan's `masons-yard`): three by two and a
  // second tier, each a closed block, old on its faces with a drafted margin and a pick-dressed panel, one new face.
  { const yp = P.plot('masons-yard'), YM = plotMatrix(yp), bw = 1.5, bh = 0.78, bd = 1.15;
    for (let i = 0; i < 12; i++) {
      const tier = i >= 6 ? 1 : 0, j = i % 6, col = j % 3, row = Math.floor(j / 3);
      const x = (col - 1) * (bw + 0.14) + (tier ? 0.35 : 0) + (rng() - 0.5) * 0.06, z = (row - 0.5) * (bd + 0.2) + (rng() - 0.5) * 0.05, y = tier * (bh + 0.012), BM = ch(YM, x, y, z, 0, (rng() - 0.5) * 0.03, 0);
      const col0 = worn(H.stone, rng, 0.08, 0.12);
      B.add(bx(bw, bh, bd, { chip: 0.03, seed: i + 1 }), ch(BM, 0, bh / 2, 0), { color: col0, moss: tier ? 0.25 : 0.5, ground: Y, course: 0 });
      for (const s of [-1, 1]) B.add(bx(bw - 0.2, bh - 0.2, 0.02, { seg: 0.25 }), ch(BM, 0, bh / 2, s * (bd / 2 + 0.006)), { color: col0.clone().multiplyScalar(0.8), moss: 0.3, ground: Y - 9, course: 0, disp: 0.008, dispScale: 9 });
      B.add(bx(0.02, bh - 0.12, bd - 0.12), ch(BM, (i % 2 ? 1 : -1) * (bw / 2 + 0.006), bh / 2, 0), { color: worn(V.newStone, rng, 0.2, 0.1).multiplyScalar(0.74), moss: 0, ground: Y - 9, course: 0, disp: 0.006, dispScale: 14 });
      if (!tier) { const c = new THREE.Vector3(0, 0, 0).applyMatrix4(BM); colliders.push({ x: c.x, z: c.z, r: 0.72, y: Y - 0.5, h: 2 * bh + 0.55, stand: false }); }
    }
    for (let i = 0; i < 4; i++) B.add(bx(0.3, 0.07, 0.16), ch(YM, (i % 2 ? 1 : -1) * 2.3, 0.02, (i < 2 ? 1 : -1) * 1.2, 0, rng() * 3, 0), { color: worn(V.rawWood, rng, 0.2), moss: 0.1, ground: Y }); } // chocks

  // the slaking tub between the hand and the new house's stock: lime under water, a paddle left in it
  { const [tx, , tz] = at3(2, 21.5, -11.35), TM = F(tx, tz, n2);
    for (const s of [-1, 1]) { B.add(bx(0.9, 0.42, 0.05), ch(TM, 0, 0.2, s * 0.4), { color: worn(V.rawWood, rng, 0.3, 0.1), moss: 0.05, ground: Y }); B.add(bx(0.05, 0.42, 0.8), ch(TM, s * 0.43, 0.2, 0), { color: worn(V.rawWood, rng, 0.3, 0.1), moss: 0.05, ground: Y }); }
    B.add(bx(0.84, 0.3, 0.78), ch(TM, 0, 0.19, 0), { color: V.lime.clone().multiplyScalar(0.8), moss: 0, ground: Y - 9, wet: 0.6 });
    beam(B, TM, [0.1, 0.2, 0.05], [0.5, 1.15, -0.3], 0.045, { color: worn(V.rawWood, rng, 0.2), moss: 0, ground: Y, round: 5 });
    colliders.push({ x: tx, z: tz, r: 0.55, y: Y - 0.5, h: 1.0 }); }

  // ---------------------------------------------------------------- the Stage: the scaffold on the Last Arch
  // A mason's stage lashed to the far side of the arch's near pier, 2.5 m up, and a cleated plank run up to it from
  // the ground: the one thing on the crown a visitor climbs. From it: the channel's broken end, the hand under it,
  // the brink and the valley.
  const stage = site(arch.east, 'stage', { w: 3.2, d: 1.5, seed: 0 });
  { const SM = arch.east, hgt = 2.5, w = 3.2, d = 1.4, z0 = 0.05, raw = (k = 0.12) => ({ color: worn(V.rawWood, rng, k, 0.15), moss: 0.04, ground: Y, round: 6 }), plank = () => ({ color: worn(V.rawWood, rng, 0.3, 0.2).multiplyScalar(0.85), moss: 0.08, ground: Y });
    for (const x of [-w / 2 + 0.1, 0, w / 2 - 0.1]) { beam(B, SM, [x, -0.3, z0 + d - 0.08], [x, hgt + 1.05, z0 + d - 0.08], 0.13, raw(), 0.1); beam(B, SM, [x, hgt - 0.11, -0.12], [x, hgt - 0.11, z0 + d + 0.1], 0.1, raw()); beam(B, SM, [x, 0.5, z0 + d - 0.08], [x, hgt - 0.15, 0.02], 0.07, raw()); }
    for (let i = 0; i < 5; i++) B.add(bx(w + 0.06, 0.05, d / 5 - 0.02), ch(SM, (rng() - 0.5) * 0.05, hgt - 0.025, z0 + (i + 0.5) * (d / 5)), plank());
    beam(B, SM, [-w / 2, hgt + 0.95, z0 + d - 0.08], [w / 2, hgt + 1.0, z0 + d - 0.08], 0.06, raw()); // the one rail, on the open side
    beam(B, SM, [-w / 2 + 0.1, 0.4, z0 + d - 0.06], [0, hgt - 0.2, z0 + d - 0.06], 0.06, raw()); beam(B, SM, [0, 0.4, z0 + d - 0.06], [w / 2 - 0.1, hgt - 0.2, z0 + d - 0.06], 0.06, raw());
    // the run: two planks side by side with cleats nailed across, from the ground up to the stage's end
    const run = 5.2, rx0 = w / 2 + run, ang = Math.atan2(hgt, run), len = Math.hypot(hgt, run), rz = z0 + d / 2;
    for (const s of [-1, 1]) B.add(bx(len + 0.1, 0.05, 0.36), ch(SM, w / 2 + run / 2, hgt / 2 - 0.03, rz + s * 0.19, 0, 0, -ang), plank());
    for (let i = 1; i < 14; i++) { const t = i / 14; B.add(bx(0.05, 0.035, 0.74), ch(SM, rx0 - run * t, hgt * t + 0.005, rz, 0, 0, -ang), raw(0.2)); }
    for (const t of [0.33, 0.66]) { const px = rx0 - run * t; for (const s of [-1, 1]) beam(B, SM, [px, -0.3, rz + s * 0.42], [px, hgt * t - 0.02, rz + s * 0.42], 0.09, raw(), 0.08); beam(B, SM, [px, hgt * t - 0.09, rz - 0.5], [px, hgt * t - 0.09, rz + 0.5], 0.08, raw()); }
    stage.floor(0, z0 + d / 2, w, d, hgt, { layer: 1 });
    stage.floor(w / 2 + run / 2, rz, 0.78, run, 0, { ry: -Math.PI / 2, y1: hgt, steps: 14, layer: 1 });
    B.add(bx(0.5, 0.04, 0.4), ch(SM, -1.1, hgt + 0.02, 0.4, 0, 0.3, 0), plank()); B.add(B.rock(0.14, 0, 1, 0.45, 1), ch(SM, -1.1, hgt + 0.07, 0.4), { color: V.lime.clone().multiplyScalar(0.85), moss: 0, ground: Y - 9 }); // a mortar board
    stage.name = 'the-stage'; }
  registerAll(ctx, [stage], 'quarrels-stage');
  if (ctx.ascents) { const pt = (x, y, z) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(arch.east); return [v.x, v.z, v.y]; }; ctx.ascents.add({ id: 'quarrels-stage', path: [pt(1.6 + 5.2 + 0.9, 0, 0.75), pt(1.6 + 5.0, 0.1, 0.75), pt(1.6 + 2.6, 1.25, 0.75), pt(1.5, 2.5, 0.75), pt(-1.1, 2.5, 0.85)], offs: [0.95] }); }

  // ---------------------------------------------------------------- the chalk: the next blocks, marked on the keep's fallen face
  // The masons' lines on the slab's toe by the square: a grid of the courses they will split next, the first one crossed.
  { const chalk = { color: V.lime, moss: 0, ground: Y - 9, course: 0, emit: [0.02, 0.019, 0.017, 2] }, L0 = P.SLAB.len;
    const line = (a0, s0, a1, s1) => { const [x0, z0] = P.slabAt(a0, s0), [x1, z1] = P.slabAt(a1, s1); beam(B, new THREE.Matrix4(), [x0, P.slabTop(a0) + 0.012, z0], [x1, P.slabTop(a1) + 0.012, z1], 0.022, chalk); };
    for (const sd of [1.2, 2.7, 4.2, 5.7]) line(L0 - 4.6, sd, L0 - 0.9, sd);
    for (const al of [L0 - 4.6, L0 - 3.4, L0 - 2.2, L0 - 0.9]) line(al, 1.2, al, 5.7);
    line(L0 - 3.4, 1.2, L0 - 2.2, 2.7); line(L0 - 2.2, 1.2, L0 - 3.4, 2.7); // the one to take next, crossed
  }

  // ---------------------------------------------------------------- the walk
  for (const c of colliders) ctx.addCollider({ ...c });

  // ---------------------------------------------------------------- the stone
  const mesh = ctx.strata.mesh(B, 'late', 'quarrels');
  if (low) mesh.castShadow = false; // (on low only the Elder steps throw shadows: src/v15/bones.js)
  ctx.scene.add(mesh);

  // ---------------------------------------------------------------- the air and the lights
  const A = air(ctx, { mouth: kiln.mouth, fire: kiln.fire, lip: arch.lip, pool: hand.pool, low });
  ctx.scene.add(A.points);
  const fire = new THREE.PointLight(new THREE.Color('#ff8436'), 11, 17, 2); fire.name = 'quarrels-kiln-light'; fire.position.set(kiln.stand[0], Y + 1.1, kiln.stand[2]);
  const lamps = [fire];
  const lampLight = (x, y, z, name) => { const l = new THREE.PointLight(new THREE.Color('#ffb060'), 1.8, 8, 2); l.name = name; l.position.set(x, y, z); lamps.push(l); return l; };
  lampLight(lampAt.x, lampAt.y - 0.3, lampAt.z, 'quarrels-pier-lamp');
  lampLight(benchLamp.x, benchLamp.y - 0.3, benchLamp.z, 'quarrels-bench-lamp').intensity = 3.2; // (rakes across his face from his right)
  for (const l of lamps) ctx.scene.add(l);
  ctx.registerUpdate((dt, t) => {
    const f = 0.86 + 0.09 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 3.7 + 1.0);
    fire.intensity = 11 * f; A.tick(t, f);
  }, { pos: { x: Q.kiln.x, z: Q.kiln.z }, near: 240, hz: 4 });
  ctx.lappet.farHidden.push(mesh, A.points);

  const tris = B.triangles;
  ctx.quarrels = {
    records, mesh, route: P.QUARRELS_ROUTE,
    // where batch 3's people, goods and sounds go: each { x, y, z } and what it is for
    places: {
      bench: { at: seat.seat, for: 'two sitters beside the saint\'s cheek, looking where he looks: at the Pomegranate House' },
      stoke: { at: kiln.stand, for: 'the lime-burner, feeding the fire; the fire\'s sound' },
      windlass: { at: sh.spike, for: 'a mason at the handspike' },
      sledge: { at: dr.sledgeAt, for: 'two at the drag rope ahead of the sledge' },
      trough: { at: hand.c, for: 'someone filling a jar at the hand; the drip\'s sound' },
      doors: records.flatMap((R) => R.doors.map((d) => ({ at: [d.x, d.y, d.z], of: R.name, enter: d.enter }))),
    },
    stats: () => ({ draws: 2, triangles: tris, lights: lamps.length, perHouse: records.map((R) => ({ name: R.name, kind: R.kind, form: R.form, tris: R.tris })) }),
  };
  ctx.log?.(`quarrels: ${tris} triangles, ${colliders.length} colliders of its own, ${records.length} plots`);
}
