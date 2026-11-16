// The Lappet's ways (v15-V0): the kit for getting up and down the Elder stair, and the ones V0 places from the plan's
// records (src/v15/plan.js WAYS). A quarter builds its own with the same kit: ctx.lappet.ways is
//   { kit(name, salt) -> K, stoneFlight, timberFlight, hexLanding, rail, ladder, tube, ramp, bridge, roofWalk, pier, undercroft, frame }
// where K = kit(name) is a site: K.B (a structures Builder: the stone shader), K.U (the Noonwrights' UnderBuilder),
// K.C (the hands' colours), K.rng, K.plan, K.addFloor(fn, { name, keep }) (a stacked floor), K.wall(x1, z1, x2, z2, r,
// y, h, dh) (a capsule nobody walks through, never stood on), K.ascent(def) (ctx.ascents), K.rail(pts, o), and
// K.finish() which adds its meshes (`<name>-stone`, `<name>-glass`) and returns { tris }. Each kit function is in
// its file's header: stairs.js, ladder.js, tube.js, misc.js.
//
// What V0 places (ctx.lappet.built[name]):
//   heliarch-head    a bastion on the crown's rim at the stair's axis, twin flights down along the riser to the High Rung
//   heliarch-upper   cut into the High Rung and out over the Mid Rung, to a hexagon landing
//   timber-patch     where the Heliarch flight is broken: a Late plank flight, Mid Rung to the bastion on the Low Rung
//   heliarch-foot    from the bastion down into the Lees' square
//   noon-main        the daylight main down the three nosings, walked inside; a gangway from its side to the Mid Rung
//   rungs-ladder     Low Rung to Mid Rung, climbed
//   lees-stair       a plank stair up the Low Rung's riser from the Lees
//   pennyworth-ramp  rammed earth down the outside of the lowest riser to the house's wall
//   lane-bridge      planks from the Mid Rung's edge to the aqueduct's last pier
//   the undercrofts  a vault behind each shop plot against the Low Rung's riser (built[plot.name])
//   the rails        a Late pole rail along each nosing where no plot's roof meets it
import * as THREE from 'three';
import { UnderBuilder } from '../../v14/under.js';
import { noonGlass } from '../../v14/noon-road.js';
import { mat } from '../../structures/geo.js';
import { frame, stoneFlight, timberFlight, hexLanding, rail } from './stairs.js';
import { ladder } from './ladder.js';
import { tube } from './tube.js';
import { ramp, bridge, roofWalk, pier, undercroft } from './misc.js';

const SKY = (x, y, z, out) => { out[0] = 1; out[1] = 1; out[2] = 0; return out; };

export function buildWays(ctx, lappet) {
  const P = lappet.plan, { RISERS, LEVEL, RUN, STAIR, at, way } = P;
  const kit = (name, salt = 1) => {
    const K = {
      ctx, plan: P, name, B: ctx.strata.builder(), U: new UnderBuilder(SKY), C: ctx.strata.colors, rng: ctx.makeRng(15000 + salt),
      addFloor(fn, o = {}) { lappet.floors[o.name] = fn; return ctx.addWalkable(fn, { stack: true, keep: o.keep ?? true, name: o.name }); },
      wall(x1, z1, x2, z2, r, y, h, dh = 0) { lappet.colliders++; return ctx.addCollider({ x1, z1, x2, z2, r, y, h, dh, stand: false }); },
      ascent(def) { return ctx.ascents?.add(def); },
      rail(pts, o) { return rail(K, pts, o); },
      finish() {
        let tris = 0;
        if (K.B.count > 0) { const m = ctx.strata.mesh(K.B, 'late', `${name}-stone`); ctx.scene.add(m); tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }
        if (K.U.tris > 0) {
          const m = new THREE.Mesh(K.U.geometry(), noonGlass(`${name}-glass`)); m.name = `${name}-glass`; m.castShadow = true; m.receiveShadow = true;
          ctx.scene.add(m); tris += K.U.tris;
        }
        return { tris };
      },
    };
    return K;
  };
  Object.assign(lappet.ways, { kit, frame, stoneFlight, timberFlight, hexLanding, rail, ladder, tube, ramp, bridge, roofWalk, pier, undercroft });

  const n1 = RUN[STAIR.run].n, d1 = RUN[STAIR.run].dir, hw = STAIR.width / 2, sx = STAIR.s;
  const up = way('heliarch-upper'), tb = way('noon-main'), ld = way('rungs-ladder'), br = way('lane-bridge'), ls = way('lees-stair'), pr = way('pennyworth-ramp');
  const at3 = (run, s, D, y) => { const [x, z] = at(run, s, D); return [x, y, z]; };
  // what stands across each nosing, so the rails leave it clear: [riser key, run, s0, s1]
  const gaps = [
    ['high', 1, sx - hw - 0.5, sx + hw + 0.5], ['mid', 1, sx - hw - 1.2, sx + hw + 1.2], ['low', 1, sx - hw - 1.2, sx + hw + 1.2],
    ...['high', 'mid', 'low'].map((k) => [k, tb.run, tb.s - 2.3, tb.s + 2.3]),
    ['mid', tb.run, tb.s, tb.s + 3.4], // the gangway
    ['mid', ld.run, ld.s - 0.6, ld.s + 0.6], ['mid', br.run, br.s - 0.8, br.s + 0.8], ['low', ls.run, ls.s - 1.9, ls.s + 3.2],
  ];

  return {
    // openings in a riser's face and holes in a tread, before the stone is laid
    claim() {
      lappet.openings.push({ riser: 'high', run: STAIR.run, s0: sx - hw - 0.3, s1: sx + hw + 0.3, why: 'heliarch-upper' });
      lappet.holes.push({ level: 'high', run: STAIR.run, s0: sx - hw - 0.15, s1: sx + hw + 0.15, D0: up.D0, D1: RISERS[1].D + 0.3, why: 'heliarch-upper' });
    },
    build() {
      const K = kit('lappet-ways'), { B, C } = K, built = lappet.built, T = ctx.terrain;
      const stone = C.heliarch.stone, jit = (c, k) => c.clone().multiplyScalar(k);

      // ---------------------------------------------------------------- the Heliarch stair, on its axis
      // its head: a bastion standing on the High Rung against the crown's rim, level with the crown, a flight down
      // each way along the riser
      {
        const D0 = RISERS[0].D - 0.25, depth = 2.05, [x, z] = at(1, sx, D0);
        hexLanding(K, { name: 'heliarch-head', x, y: LEVEL.crown.y, z, f: n1, depth, width: STAIR.width, wing: 0, base: LEVEL.high.y - 0.3, parapet: ['far'] });
        // the hexagon on the crown behind it, where the masons' ground meets the stair
        hexLanding(K, { name: 'heliarch-head-court', x: x - n1[0] * 2.3, y: LEVEL.crown.y + 0.03, z: z - n1[1] * 2.3, f: n1, depth: 2.3, width: STAIR.width, wing: 1.1, base: LEVEL.crown.y - 0.05, solid: false, floor: false });
        const Dm = D0 + depth / 2 + 0.1, wd = depth - 0.25;
        for (const sg of [1, -1]) {
          const [hx, hz] = at(1, sx + sg * hw, Dm);
          built[`heliarch-head-${sg > 0 ? 'east' : 'west'}`] = stoneFlight(K, { name: `heliarch-head-${sg > 0 ? 'east' : 'west'}`, x: hx, y: LEVEL.crown.y, z: hz, f: [d1[0] * sg, d1[1] * sg], drop: 4, width: wd, run: 0.36, base: LEVEL.high.y - 0.3, cheeks: sg > 0 ? [false, true] : [true, false] });
        }
      }
      // the upper flight: cut into the High Rung, out over the Mid Rung, onto a hexagon
      {
        const [x, z] = at(1, sx, up.D0);
        built['heliarch-upper'] = stoneFlight(K, { name: 'heliarch-upper', x, y: LEVEL.high.y, z, f: n1, drop: 4, width: STAIR.width, run: (up.D1 - up.D0) / 17, base: LEVEL.mid.y - 0.4 });
        const [lx, lz] = at(1, sx, up.D1);
        hexLanding(K, { name: 'heliarch-landing', x: lx, y: LEVEL.mid.y + 0.03, z: lz, f: n1, depth: RISERS[2].D - up.D1 - 0.05, width: STAIR.width, wing: 1, base: LEVEL.mid.y - 0.06, solid: false, floor: false });
      }
      // the middle flight is gone (its stumps stand at the nosing and on the bastion; three of its blocks lie on the
      // Low Rung): the Late folk's plank flight spans the gap, and the Low Rung's lane passes under its upper half
      {
        const tp = way('timber-patch'), D0 = RISERS[2].D - 0.1, D1 = RISERS[3].D - 0.15, [x, z] = at(1, sx, D0), drop = 4, n = Math.round(drop / 0.235);
        const f = timberFlight(K, { name: 'timber-patch', x, y: LEVEL.mid.y, z, f: n1, drop, width: 1.6, run: (D1 - D0) / (n - 1), props: [0.3, 0.62], propBase: LEVEL.low.y });
        built['timber-patch'] = f; void tp;
        const yAt = (D) => LEVEL.mid.y - drop * (D - D0) / (D1 - D0) - 0.4, Dlow = D0 + (D1 - D0) * (drop - 1.95) / drop; // where the headroom runs out
        K.wall(...at(1, sx - 0.75, Dlow), ...at(1, sx + 0.75, Dlow), 0.2, LEVEL.low.y - 0.6, yAt(Dlow) - LEVEL.low.y + 0.6);
        K.wall(...at(1, sx, Dlow + 0.8), ...at(1, sx, D1 - 0.1), 0.75, LEVEL.low.y - 0.6, yAt(Dlow + 0.8) - LEVEL.low.y + 0.6, yAt(D1 - 0.1) - yAt(Dlow + 0.8));
        // boards nailed across under it there (why nobody walks under its foot)
        for (let q = 0; q < 4; q++) B.add(B.box(1.7, 0.16, 0.03), frame(...at3(1, sx, Dlow + 0.05, LEVEL.low.y + 0.3 + q * 0.42), n1[0], n1[1]).multiply(mat(0, 0, 0, 0, 0, (q % 2 ? 1 : -1) * 0.05)), { color: jit(C.late.wood, 0.8 + q * 0.15), moss: 0.2, ground: LEVEL.low.y });
        // the stumps: the Heliarch cheeks broken off short
        for (const sg of [-1, 1]) {
          B.add(B.box(0.36, 1.0, 1.3, { chip: 0.09, seed: sg }), frame(...at3(1, sx + sg * (hw + 0.15), D0 + 0.5, LEVEL.mid.y - 0.3), n1[0], n1[1]).multiply(mat(0, 0, 0, 0.5, 0, 0)), { color: jit(stone, 0.9), course: 0.5, moss: 0.5, ground: LEVEL.mid.y - 1 });
          B.add(B.box(0.36, 0.7, 0.9, { chip: 0.09, seed: sg + 4 }), frame(...at3(1, sx + sg * (hw + 0.15), D1 - 0.5, LEVEL.low.y + 0.35), n1[0], n1[1]), { color: jit(stone, 0.85), course: 0.5, moss: 0.5, ground: LEVEL.low.y });
        }
        const rngB = K.rng;
        for (const [ds, D, yaw] of [[2.7, 11.6, 0.4], [-2.9, 12.6, 1.3], [3.3, 13.4, 2.2]]) {
          const [bx, bz] = at(1, sx + ds, D);
          B.add(B.box(1.1, 0.5, 0.62, { chip: 0.08, seed: ds }), mat(bx, LEVEL.low.y + 0.2, bz, (rngB() - 0.5) * 0.3, yaw, 0.1), { color: jit(stone, 0.8 + rngB() * 0.2), course: 0.5, moss: 0.6, ground: LEVEL.low.y });
          ctx.addCollider({ x: bx, z: bz, r: 0.5, y: LEVEL.low.y - 0.5, h: 0.95 }); lappet.colliders++;
        }
      }
      // the bastion on the Low Rung's riser, and the foot flight into the Lees' square
      {
        const hf = way('heliarch-foot'), D0 = RISERS[3].D - 0.2, [x, z] = at(1, sx, D0);
        hexLanding(K, { name: 'heliarch-bastion', x, y: LEVEL.low.y, z, f: n1, depth: hf.D0 - D0, width: STAIR.width, wing: 1, base: LEVEL.bench.y - 0.4, parapet: ['left', 'right'] });
        const [fx, fz] = at(1, sx, hf.D0);
        built['heliarch-foot'] = stoneFlight(K, { name: 'heliarch-foot', x: fx, y: LEVEL.low.y, z: fz, f: n1, drop: LEVEL.low.y - LEVEL.bench.y, width: STAIR.width, run: (hf.D1 - hf.D0) / 12, base: LEVEL.bench.y - 0.4 });
      }

      // ---------------------------------------------------------------- the daylight main
      {
        const R = RUN[tb.run], k = (LEVEL.high.y - LEVEL.mid.y) / (RISERS[2].D - RISERS[1].D), [x, z] = at(tb.run, tb.s, RISERS[1].D);
        // where it lies less than a walker's height over each floor: from there down to where it rests
        const blocks = [[LEVEL.mid.y, RISERS[2].D], [LEVEL.low.y, RISERS[3].D], [LEVEL.bench.y, RISERS[3].D + (LEVEL.low.y - LEVEL.bench.y) / k - 0.9]]
          .map(([yF, Dend]) => [(LEVEL.high.y - yF - 1.95) / k, Dend - RISERS[1].D, yF]);
        built['noon-main'] = tube(K, { name: 'noon-main', x, y: LEVEL.high.y, z, f: R.n, slope: k, yEnd: LEVEL.bench.y, r: 1.65, door: { y: LEVEL.mid.y, side: -1, reach: 1.35, propTo: LEVEL.low.y }, blocks });
      }

      // ---------------------------------------------------------------- the ladder
      {
        const R = RUN[ld.run], [x, z] = at(ld.run, ld.s, RISERS[2].D + 0.2);
        built['rungs-ladder'] = ladder(K, { name: 'rungs-ladder', x, z, y0: LEVEL.low.y, y1: LEVEL.mid.y, n: [-R.n[0], -R.n[1]] });
      }

      // ---------------------------------------------------------------- the bridge to the pier
      {
        const R = RUN[br.run], pp = P.plot('bridge-pier');
        pier(K, { name: 'bridge-pier', x: pp.x, z: pp.z, y0: LEVEL.low.y, y1: LEVEL.mid.y, w: pp.w, d: pp.d, f: R.n });
        built['lane-bridge'] = bridge(K, { name: 'lane-bridge', a: at3(br.run, br.s, br.D0, LEVEL.mid.y), b: at3(br.run, br.s, br.D1 + 0.15, LEVEL.mid.y), width: 1.1, gaps: true });
        const c = (u, D) => at3(br.run, br.s + u, D, LEVEL.mid.y), e = pp.w / 2 + 0.02, Da = pp.D - pp.d / 2, Db = pp.D + pp.d / 2;
        K.rail([c(-0.65, Da), c(-e, Da), c(-e, Db), c(e, Db), c(e, Da), c(0.65, Da)], { h: 0.95, every: 1.2, paint: C.late.paint[3] });
      }

      // ---------------------------------------------------------------- the Lees' plank stair up the Low Rung's riser
      {
        const D = RISERS[3].D, y = LEVEL.low.y;
        bridge(K, { name: 'lees-stair-head', a: at3(ls.run, ls.s - 1.6, D + 0.72, y), b: at3(ls.run, ls.s - 0.3, D + 0.72, y), width: 1.75, rails: false, register: false });
        const [x, z] = at(ls.run, ls.s - 0.3, D + 0.9), drop = y - LEVEL.bench.y;
        built['lees-stair'] = timberFlight(K, { name: 'lees-stair', x, y, z, f: RUN[ls.run].dir, drop, width: 1.4, run: 0.3, rails: [false, true], props: [0.02, 0.45], propBase: LEVEL.bench.y });
        K.rail([at3(ls.run, ls.s - 1.65, D + 0.15, y), at3(ls.run, ls.s - 1.65, D + 1.62, y), at3(ls.run, ls.s - 0.3, D + 1.62, y)], { paint: C.late.paint[0] });
        for (const [u, v] of [[-1.5, 0.35], [-1.5, 1.5], [-0.4, 1.5]]) B.add(B.box(0.12, drop, 0.12), mat(...at3(ls.run, ls.s + u, D + v, y - drop / 2 - 0.05)), { color: jit(C.late.wood, 0.9), moss: 0.3, ground: LEVEL.bench.y });
      }

      // ---------------------------------------------------------------- the ramp to the Pennyworth
      {
        const r = P.HAHA + 1.08, y0 = LEVEL.bench.y, y1 = LEVEL.foot.y, pts = [];
        const p3 = (b, y) => { const [x, z] = P.polar(b, r); return [x, y, z]; };
        pts.push(p3(pr.b0 - 1.6, y0));
        for (let b = pr.b0; b < pr.b1 - 0.5; b += 2) pts.push(p3(b, y0 + (y1 - y0) * (b - pr.b0) / (pr.b1 - pr.b0)));
        pts.push(p3(pr.b1, y1), p3(pr.b1 + 1, y1));
        built['pennyworth-ramp'] = ramp(K, { name: 'pennyworth-ramp', pts, width: 2.4, revet: 1, base: (x, z) => T.heightAt(x, z) });
        // the riser beside it is a wall to anyone on the ramp
        for (let b = pr.b0 - 0.5; b < pr.b1 + 1.5; b += 3) { const a = P.polar(b, P.HAHA - 0.25), c = P.polar(Math.min(b + 3, pr.b1 + 1.5), P.HAHA - 0.25); K.wall(a[0], a[1], c[0], c[1], 0.3, y1 - 0.8, y0 - y1 + 0.78); }
        const outer = (b, y) => { const [x, z] = P.polar(b, r + 1.22); return [x, y, z]; };
        K.rail([outer(pr.b0 - 1.6, y0), outer(pr.b0, y0), outer((pr.b0 + pr.b1) / 2, (y0 + y1) / 2), outer(pr.b1 - 3, y1 + (y0 - y1) * 3 / (pr.b1 - pr.b0))], { every: 2.2 });
      }

      // ---------------------------------------------------------------- the undercrofts behind the Lees' shops
      for (const p of P.PLOTS) if (p.kind === 'shop' && p.against) built[p.name] = undercroft(K, p, { riser: RISERS.find((q) => q.key === p.against), depth: P.VAULT_DEPTH });

      // ---------------------------------------------------------------- rails along the nosings
      // where no house's roof meets a tread's edge and no way crosses it, the Late folk have put up a pole rail
      // (the edge holds without it: the rail says so)
      {
        const S1 = P.FADE.s1[1] + 1, S2 = P.FADE.s2[0] - 1;
        ['high', 'mid', 'low'].forEach((key, li) => {
          const R = RISERS.find((q) => q.key === key), y = R.top;
          for (const run of [1, 2]) {
            const a = run === 1 ? S1 : P.cornerS(2, R.D) + 0.1, b = run === 1 ? P.cornerS(1, R.D) - 0.1 : S2;
            const taken = [...P.PLOTS.filter((p) => p.run === run && p.against === key).map((p) => [p.s - p.w / 2 - 0.1, p.s + p.w / 2 + 0.1]), ...gaps.filter((g) => g[0] === key && g[1] === run).map((g) => [g[2], g[3]])].sort((p, q) => p[0] - q[0]);
            let s = a;
            const span = (s0, s1) => { if (s1 - s0 > 1.2) K.rail([at3(run, s0, R.D - 0.32, y), at3(run, s1, R.D - 0.32, y)], { paint: [undefined, C.late.paint[1], C.late.paint[0]][li], every: 2.1 }); };
            for (const [t0, t1] of taken) { if (t0 > s) span(s, Math.min(t0, b)); s = Math.max(s, t1); }
            if (s < b) span(s, b);
          }
        });
      }

      const done = K.finish();
      return { stats: () => ({ ways: Math.round(done.tris), floors: Object.keys(lappet.floors).length }) };
    },
  };
}
