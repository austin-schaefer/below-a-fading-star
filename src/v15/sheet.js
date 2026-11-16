// The makers' contact sheet (v15-V1), behind ?v15=kit: every maker in src/v15/houses/ at ten seeds, a row a kind
// (north to south: SHEET.rows; the tall carriers last so they hide nothing), then two rows more: `plan`, the sizes
// src/v15/plan.js gives its plots (PLAN_PLOTS: houses against a riser, shops in one, a stall, the new house, and in
// `plan2` the Strake's five; each through makePlot, a block behind it standing for the step), and `lying`, the carrier on its side on the plan's
// 14 x 5. On a stone deck over the Foundered water south of the keep (the one place wide enough; a test page).
// ctx.village.sheet = { x, z, y, plots, records }. tools/village-test.mjs and tools/views-v15-kit.json read it.
import { make, makePlot, registerAll, faceOf } from './houses/index.js';
import { V, H, worn, rngOf } from './houses/kit.js';
import { mat } from '../structures/geo.js';

export const SHEET = { x: 70, z: 175, y: 1.2, dx: 11.5, dz: 15, n: 10, rows: ['elder', 'undercroft', 'late', 'new', 'plan', 'plan2', 'lying', 'carrier'] };
// the plan's plot sizes (src/v15/plan.js at v15-V0), and a plan small enough to stand in for it: the levels and
// risers these plots name. D is given so a shop's riser face falls where the plan puts it (0.6 m before its centre).
export const planStub = (y = 0) => ({ LEVEL: { up4: { y: y + 4 }, up29: { y: y + 2.9 } }, RISERS: [{ key: 'r4', D: 10, top: y + 4, foot: y }, { key: 'r29', D: 10, top: y + 2.9, foot: y }] });
export const PLAN_PLOTS = [
  { name: 'rungs-5', kind: 'house', hand: 'late', w: 5, d: 3.7, against: 'r4', roof: 'up4' },
  { name: 'rungs-6.4', kind: 'house', hand: 'late', w: 6.4, d: 3.7, against: 'r4', roof: 'up4' },
  { name: 'lees-house-1', kind: 'house', hand: 'late', w: 6, d: 4.4, against: 'r29', roof: 'up29' },
  { name: 'lees-house-2', kind: 'house', hand: 'late', w: 5.4, d: 4.6 },
  { name: 'quarrels-house', kind: 'house', hand: 'late', w: 5.6, d: 4.4, stair: false },
  { name: 'lees-shop-4.6', kind: 'shop', hand: 'heliarch', w: 4.6, d: 5.2, against: 'r29', roof: 'up29', D: 9.4 },
  { name: 'lees-shop-5', kind: 'shop', hand: 'heliarch', w: 5, d: 5.2, against: 'r29', roof: 'up29', D: 9.4 },
  { name: 'pennyworth-stall', kind: 'shop', hand: 'late', w: 3.4, d: 2.4 },
  { name: 'pennyworth-house', kind: 'house', hand: 'late', w: 6, d: 4.4, stair: false },
  { name: 'new-house', kind: 'new-house', hand: 'new', w: 7, d: 5.6 },
  // the Strake's five (6.8 x 5.2, the riser 0.2 m behind each; the shop's vault is the bones' own: `built`)
  { name: 'strake-elder', kind: 'house', hand: 'elder', w: 6.8, d: 5.2, against: 'r29', roof: 'up29', D: 12.8, o: { form: 'overhang' } },
  { name: 'strake-late', kind: 'house', hand: 'late', w: 6.8, d: 5.2, against: 'r29', roof: 'up29', D: 12.8 },
  { name: 'strake-shop', kind: 'shop', hand: 'heliarch', w: 6.8, d: 5.2, against: 'r29', roof: 'up29', D: 12.8, built: { rad: 1.48, spring: 0.9 } },
  { name: 'strake-carrier', kind: 'carrier', hand: 'noon', w: 6.8, d: 5.2, against: 'r29', roof: 'up29', D: 12.8, o: { form: 'sherd' } },
  { name: 'strake-new', kind: 'new-house', hand: 'new', w: 6.8, d: 5.2, against: 'r29', roof: 'up29', D: 12.8, o: { stage: 1 } },
];
// makePlot's options for one of them at level y
export const planOpts = (p, y) => ({ plan: planStub(y), built: p.built ? { [p.name]: { rad: p.built.rad, spring: y + p.built.spring } } : undefined, ...(p.o || {}) });

export function buildSheet(ctx) {
  const low = ctx.quality === 'low', B = ctx.strata.builder(), E = ctx.strata.builder(), S = SHEET, plots = [], records = [], rng = rngOf(77, 1);
  const PLAN_STUB = planStub(S.y), W = S.n * S.dx + 6, D = S.rows.length * S.dz + 8, face = faceOf(180);
  B.add(B.box(W, 3, D, { seg: 20 }), mat(S.x, S.y - 1.5, S.z), { color: V.flag, moss: 0.2, course: 1.2, ground: S.y - 3 });
  S.rows.forEach((kind, r) => {
    const z = S.z + (r - (S.rows.length - 1) / 2) * S.dz;
    for (let i = 0; i < S.n; i++) {
      const x = S.x + (i - (S.n - 1) / 2) * S.dx;
      let plot, R;
      if (kind === 'plan' || kind === 'plan2') {
        const p = PLAN_PLOTS[i + (kind === 'plan2' ? 10 : 0)]; if (!p) continue;
        plot = { ...p, x, z, y: S.y, face, seed: i + 1 }; delete plot.o; delete plot.built;
        R = makePlot(B, plot, { seed: i + 1, E, low, ...planOpts(p, S.y) });
        if (p.against) { // the step it stands against: a block behind it (for a shop, round the vault it is let into)
          const h = PLAN_STUB.LEVEL[p.roof].y - S.y, st = { color: worn(H.stone, rng, 0.1), course: 0.5, moss: 0.4, ground: S.y };
          if (p.kind !== 'shop' || p.built) B.add(B.box(p.w + 2, h, 2.4, { seg: 3 }), mat(x, S.y + h / 2 - 0.005, z - (p.D ? p.D - 10 : p.d / 2) - 1.22), st);
          else { const zf = z + (10 - p.D); B.add(B.box(p.w + 2, 0.4, 3.6, { seg: 3 }), mat(x, S.y + h - 0.2, zf - 1.8 - 0.52), st); B.add(B.box(p.w + 2, h, 1, { seg: 3 }), mat(x, S.y + h / 2, zf - 3.2 - 0.76), st); for (const sx of [-1, 1]) B.add(B.box(1.4, h - 0.02, 3.3, { seg: 3 }), mat(x + sx * (p.w / 2 + 0.3), S.y + h / 2 - 0.01, zf - 1.65 - 0.26), st); }
        }
      } else if (kind === 'lying') {
        if (i % 2) continue;
        plot = { x: x + S.dx / 2, z, y: S.y, face, w: 14, d: 5, kind: 'carrier', seed: i / 2 + 1 };
        R = make('carrier', B, plot, { seed: i / 2 + 1, low });
      } else {
        plot = { x, z, y: S.y, face, w: kind === 'late' ? 7 : kind === 'elder' ? 9 : 8, d: kind === 'late' ? 6 : 7, kind, seed: i + 1 };
        R = make(kind, B, plot, { seed: i + 1, E, low, shop: kind === 'late' && i % 3 === 1 });
      }
      plots.push(plot); records.push(R);
    }
  });
  registerAll(ctx, records, 'village-sheet');
  ctx.addWalkable((x, z) => (Math.abs(x - S.x) <= W / 2 && Math.abs(z - S.z) <= D / 2 ? S.y : null), { stack: true, keep: true, name: 'village-sheet-deck' });
  const mesh = ctx.strata.mesh(B, 'late', 'village-sheet'), blocks = ctx.strata.mesh(E, 'elder', 'village-sheet-elder');
  ctx.scene.add(mesh, blocks);
  ctx.village.sheet = { ...S, w: W, d: D, plots, records, meshes: [mesh, blocks] };
}
