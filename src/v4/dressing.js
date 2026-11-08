// v4 terrain set-dressing, one world module: DG the Long Figure, DC the Discontinued Track, DH the Surveyor's Pegs
// (wilderness-v4-placement.md, "Terrain set-dressing in v4"). Each part is in src/v4/dressing/; ctx.dressing = { figure,
// track, pegs, stats() } (draw calls and triangles all four together cost when in view). ?skip=dressing leaves it out.
import { buildFigure } from './dressing/figure.js';
import { buildTrack } from './dressing/track.js';
import { buildPegs } from './dressing/pegs.js';

export async function build(ctx) {
  const parts = {};
  parts.figure = buildFigure(ctx);
  parts.track = buildTrack(ctx);
  parts.pegs = buildPegs(ctx);
  function stats() {
    let calls = 0, tris = 0;
    for (const p of Object.values(parts)) for (const m of p.meshes) {
      const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3;
      calls++; tris += t * (m.isInstancedMesh ? m.count : 1);
    }
    return { calls, tris: Math.round(tris) };
  }
  ctx.dressing = { ...parts, stats };
}
