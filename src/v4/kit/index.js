// The v4 kit: shared pieces for the wonders and the regions. installKit(ctx) puts it on ctx.kit (main.js does,
// after the terrain and the walls, before any module builds):
//   ctx.kit.masonry(opts)        -> { mat, uniforms, set }  cyclopean masonry (masonry.js)
//   ctx.kit.stair(opts)          -> { geometry, walkable, top, steps, length }  worn, diminishing stairs (stairs.js)
//   ctx.kit.measureFigures(spots, opts) -> InstancedMesh  robed figures for scale (scale.js)
//   ctx.kit.rookWheel(opts)      -> { mesh, scatter }  rooks wheeling round a tall thing (scale.js)
//   ctx.kit.SCALE                sizes the briefs name (person, tread, door, rook)
//   ctx.kit.fogTierAt(x, z) / fogTierAmount(r) / FOG_TIERS / FOG_CAP  the walls' fog tiers (fog.js)
//   ctx.kit.CYCLOPEAN_GLSL       the masonry's GLSL, for ShaderMaterials
// Modules add what they build to ctx.scene themselves.
import { makeCyclopeanMaterial, CYCLOPEAN_GLSL } from './masonry.js';
import { makeStair } from './stairs.js';
import { measureFigures, rookWheel, SCALE } from './scale.js';
import { fogTierAt, fogTierAmount, FOG_TIERS, FOG_CAP } from './fog.js';

export function installKit(ctx) {
  ctx.kit = {
    masonry: (opts) => makeCyclopeanMaterial(ctx, opts),
    // a module's own ctx (its registerUpdate tagged for the profiler) can be passed as the last argument
    stair: (opts, mctx = ctx) => makeStair(mctx, opts),
    measureFigures: (spots, opts, mctx = ctx) => measureFigures(mctx, spots, opts),
    rookWheel: (opts, mctx = ctx) => rookWheel(mctx, opts),
    SCALE, fogTierAt, fogTierAmount, FOG_TIERS, FOG_CAP, CYCLOPEAN_GLSL,
  };
  return ctx.kit;
}
