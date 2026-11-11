// v5 story set-dressing: CY the Collation (a long table laid for twelve in Medlar Close), DE the Slipper (on the causeway,
// 24 m into the first walk) and DF the Unfinished Prospect (an easel at the High Ling's brow with a painted canvas of the
// view), plans/wilderness-v5.md "Detail". Each part is in src/v5/dressing/. ctx.dressing5 = { collation, slipper, prospect, stats() }
// (draw calls and triangles the three cost in all, 4 and about 8k). Static: no update, no lights. ?dressing5=0 leaves
// all three out, ?collation=0, ?slipper=0 and ?prospect=0 each its own.
import { buildCollation } from './dressing/collation.js';
import { buildSlipper } from './dressing/slipper.js';
import { buildProspect } from './dressing/prospect.js';
export { collationClear } from './dressing/collation.js';
export { prospectClear } from './dressing/prospect.js';

export async function build(ctx) {
  const q = new URLSearchParams(location.search), off = (k) => q.get('dressing5') === '0' || q.get(k) === '0';
  const parts = {};
  if (!off('collation')) parts.collation = buildCollation(ctx);
  if (!off('slipper')) parts.slipper = buildSlipper(ctx);
  if (!off('prospect')) parts.prospect = await buildProspect(ctx);
  function stats() {
    let calls = 0, tris = 0;
    for (const p of Object.values(parts)) for (const m of p.meshes) {
      const g = m.geometry; calls++; tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    }
    return { calls, tris: Math.round(tris) };
  }
  ctx.dressing5 = { ...parts, stats };
}
