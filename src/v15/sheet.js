// The makers' contact sheet (v15-V1), behind ?v15=kit: every maker in src/v15/houses/ at ten seeds, a row a kind,
// on a stone deck over the Foundered water south of the keep (the one place wide enough; it is a test page).
// ctx.village.sheet = { x, z, y, plots, records }. tools/village-test.mjs and tools/views-v15-kit.json read it.
import { make, register, KINDS, faceOf } from './houses/index.js';
import { ch, V } from './houses/kit.js';
import { mat } from '../structures/geo.js';

export const SHEET = { x: 70, z: 175, y: 1.2, dx: 11.5, dz: 15, n: 10 };

export function buildSheet(ctx) {
  const low = ctx.quality === 'low', B = ctx.strata.builder(), E = ctx.strata.builder(), S = SHEET, plots = [], records = [];
  const W = S.n * S.dx + 6, D = KINDS.length * S.dz + 8;
  B.add(B.box(W, 3, D, { seg: 20 }), mat(S.x, S.y - 1.5, S.z), { color: V.flag, moss: 0.2, course: 1.2, ground: S.y - 3 });
  KINDS.forEach((kind, r) => {
    for (let i = 0; i < S.n; i++) {
      const plot = { x: S.x + (i - (S.n - 1) / 2) * S.dx, z: S.z + (r - (KINDS.length - 1) / 2) * S.dz, y: S.y, face: faceOf(180), w: kind === 'late' ? 7 : kind === 'elder' ? 9 : 8, d: kind === 'late' ? 6 : 7, kind, seed: i + 1 };
      const R = make(kind, B, plot, { seed: i + 1, E, low, shop: kind === 'late' && i % 3 === 1 });
      register(ctx, R); plots.push(plot); records.push(R);
    }
  });
  ctx.addWalkable((x, z) => (Math.abs(x - S.x) <= W / 2 && Math.abs(z - S.z) <= D / 2 ? S.y : null), { stack: true, keep: true, name: 'village-sheet' });
  const mesh = ctx.strata.mesh(B, 'late', 'village-sheet'), blocks = ctx.strata.mesh(E, 'elder', 'village-sheet-elder');
  ctx.scene.add(mesh, blocks);
  ctx.village.sheet = { ...S, w: W, d: D, plots, records, meshes: [mesh, blocks] };
}
