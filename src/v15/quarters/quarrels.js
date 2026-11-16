// The Quarrels (v15-Q1): the Lappet's crown, the level ground under Carcanet Keep's fallen north-east corner, and the
// only place in the valley where anything is being built. The Late folk are quarrying the keep: its fallen blocks are
// split, dragged and relaid as a house that is half up, and its fallen saint is their kiln and their trough.
//
// What stands here, every coordinate from src/v15/plan.js (the plots, QUARRELS, QUARRELS_ROUTE):
//   the Brow House        quarrels-house-2: a narrow Late house on the rim at the west end, the first lit window
//   the Leaning Lodging   quarrels-house-1: a Late house whose back is the west flank of the keep's fallen face (the
//                         slab, plan.SLAB); its roof is level with the slab where they meet, so the slab is its stair
//   the Saint's Rest      the square at the Heliarch stair's head: Heliarch hexagons relaid, a keep slab, the stock
//   the Smoking Saint     the lime kiln, in the head of the keep's fallen colossus on the brink; a bench against his
//                         cheek that looks over the brink at the Pomegranate House; three lesser heads wait in a row
//   the quarry            in the wound: a block split with wedges on the stair's axis, the shears over a block half
//                         lifted, the windlass between its legs
//   the Drag              a track of planks from the shears round the stock and along the brink, a loaded sledge on it
//   the Last Arch         the aqueduct's last standing arch (on the line of the Rungs' pier); the templates hang on
//                         its pier; its drip falls into the saint's upturned hand (the Almoner), the masons' trough
//   the Unroofed House    new-house: the kit's new house, rising, its stock between its wall and the old pier
// The makers: src/v15/houses/ (the plots), ./quarrels/saint.js, works.js, air.js.
//
// Draws: one mesh in the stone shader (`quarrels`), one Points (`quarrels-air`: smoke, the stoke hole's glow, the
// drip). Three point lights: the kiln's fire, a lamp at the lodging's door, a lamp on the old pier.
// ctx.quarrels = { records, route, places (where batch 3's people, goods and sounds go), stats() }. ?quarrels=0
// leaves it out.
import * as THREE from 'three';
import { makePlot, registerAll, plotMatrix } from '../houses/index.js';
import { L, H, V, PARTS, ch, worn, beam, hangLamp, pot } from '../houses/kit.js';
import { KEEP as KEEP_BUILT } from '../../structures/keep.js';
import { saint, lesserHead, almoner, bench } from './quarrels/saint.js';
import { lastArch, templates, shears, splitBlock, drag } from './quarrels/works.js';
import { air } from './quarrels/air.js';

// what each plot is given beyond what the plan says (the seed is the building)
const OPTS = {
  'new-house': { seed: 2, stage: 1 },
  'quarrels-house-1': { seed: 5 },
  'quarrels-house-2': { seed: 3, form: 'tower' },
};

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
    const R = makePlot(B, p, { plan: P, built: ctx.lappet.built, low, ...o });
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
      if (Math.hypot(x - kc.x, z - kc.z) < 1.9) continue;
      if (r < 0.1 || (edge < 1 && r2 > edge * 0.8 + 0.35)) continue;
      const tilt = r3 < 0.1 ? 0.05 : 0.012;
      B.add(B.cyl(R - 0.025, R - 0.035, 0.16, 6, 1), new THREE.Matrix4().makeRotationY(yawH + Math.PI / 6).setPosition(x, Y - 0.035 + r3 * 0.02, z).multiply(new THREE.Matrix4().makeRotationX((rng() - 0.5) * tilt * 2)),
        { color: worn(r2 < 0.14 ? H.dark : H.stone, rng, 0.08, 0.14).lerp(V.newDust, 0.16 + 0.2 * rng()), moss: 0.5, ground: Y - 0.4, course: 0 });
      n++;
    }
    ctx.log?.(`quarrels: ${n} hexagons relaid`);
  }

  // ---------------------------------------------------------------- the Smoking Saint, his bench, the heads that wait
  const kiln = saint(B, F(Q.kiln.x, Q.kiln.z, Q.kiln.face), { // (F takes any length of face)
    stoke: [Q.kiln.stoke[0] * Q.kiln.face[1] - Q.kiln.stoke[1] * Q.kiln.face[0], Q.kiln.stoke[0] * Q.kiln.face[0] + Q.kiln.stoke[1] * Q.kiln.face[1]], N2, low, rng });
  add(kiln.colliders);
  // the bench: at his right cheek, between him and the stair's head, its sitters looking where he looks
  const kf = Q.kiln.face, kl = Math.hypot(kf[0], kf[1]), face = [kf[0] / kl, kf[1] / kl], right = [-face[1], face[0]];
  const seat = bench(B, F(Q.kiln.x + right[0] * 2.3 + face[0] * 0.25, Q.kiln.z + right[1] * 2.3 + face[1] * 0.25, face), { rng, w: 1.45 });
  add(seat.colliders);
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
  // the jar under his fingers, and a yoke with two more beside the pier: the water is carried from here
  pot(B, new THREE.Matrix4(), hand.jar[0], Y, hand.jar[2], 0.2, worn(L.tile[0], rng, 0.45), 2.0, 8);
  { const [jx, , jz] = at3(aq.run, aq.s - 1.5, aq.piers[1] + 1.9), JM = F(jx, jz, d2);
    for (const s of [-1, 1]) pot(B, JM, s * 0.55, 0, 0, 0.19, worn(s > 0 ? V.mud : L.tile[4], rng, 0.4), 2.0, 8);
    beam(B, JM, [-0.7, 0.72, 0.08], [0.7, 0.78, -0.06], 0.045, { color: worn(V.rawWood, rng, 0.25), moss: 0, ground: Y, round: 5 });
    const a = new THREE.Vector3(-0.55, 0, 0).applyMatrix4(JM), b = new THREE.Vector3(0.55, 0, 0).applyMatrix4(JM);
    colliders.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, r: 0.25, y: Y - 0.5, h: 1.3, stand: false }); }

  // ---------------------------------------------------------------- the walk
  for (const c of colliders) ctx.addCollider({ ...c });

  // ---------------------------------------------------------------- the stone
  const mesh = ctx.strata.mesh(B, 'late', 'quarrels');
  if (low) mesh.castShadow = false; // (on low only the Elder steps throw shadows: src/v15/bones.js)
  ctx.scene.add(mesh);

  // ---------------------------------------------------------------- the air and the lights
  const A = air(ctx, { mouth: kiln.mouth, fire: kiln.fire, lip: arch.lip, pool: hand.pool, low });
  ctx.scene.add(A.points);
  const fire = new THREE.PointLight(new THREE.Color('#ff8436'), 8, 13, 2); fire.name = 'quarrels-kiln-light'; fire.position.set(kiln.stand[0] * 0.5 + kiln.fire[0] * 0.5, Y + 0.75, kiln.stand[2] * 0.5 + kiln.fire[2] * 0.5);
  const lamps = [fire];
  const lampLight = (x, y, z, name) => { const l = new THREE.PointLight(new THREE.Color('#ffb060'), 1.8, 8, 2); l.name = name; l.position.set(x, y, z); lamps.push(l); return l; };
  lampLight(lampAt.x, lampAt.y - 0.3, lampAt.z, 'quarrels-pier-lamp');
  { const l = byName['quarrels-house-1'].lamps[0]; if (l) lampLight(l.x, l.y - 0.3, l.z, 'quarrels-lodging-lamp'); }
  for (const l of lamps) ctx.scene.add(l);
  ctx.registerUpdate((dt, t) => {
    const f = 0.86 + 0.09 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 3.7 + 1.0);
    fire.intensity = 8 * f; A.tick(t, f);
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
