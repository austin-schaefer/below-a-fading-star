// v8-04, stories with two ends (world module `threads`; briefs/v8/brief-v8-04-threads.md, threads 1, 2 and 4 of
// briefs/v8/index.md): a visitor finds something in one place that makes them wonder and the answer somewhere else,
// told only by objects. threads/plan.js holds every position, the clearances and the stand points; each thread builds
// itself: threads/traveller.js (the traveller on the Span), threads/chair.js (the twelfth chair), threads/gold.js (the
// gold from the court); v8-08 adds threads/painter.js (the painter: his abandoned canvases on the way to the Unfinished
// Prospect, and him). Static but for the gold's glint (tied to the sun's flicker) and the painter, who turns when you
// come near. ctx.threads = { traveller, chair, gold, painter, ends(), stats() }. ?threads=0 leaves all four out;
// ?traveller=0, ?chair=0, ?gold=0 and ?painter=0 each its own (the Collation keeps its twelfth chair with ?chair=0).
import { OFF, THREADS_OFF } from './threads/plan.js';
import { buildTraveller } from './threads/traveller.js';
import { buildChair } from './threads/chair.js';
import { buildGold } from './threads/gold.js';
import { buildPainter } from './threads/painter.js';
import { meshGround } from '../v4/regions/skin.js';
import { surfaceAt } from './threads/kit.js';
import { waitFor, loaded } from '../v7/workers/rig.js';
import { SEXTON_OFF } from '../v7/workers/graves.js';

export async function build(ctx) {
  const T = ctx.threads = { traveller: null, chair: null, gold: null, painter: null, ends: () => ({}), stats: () => ({ calls: 0, tris: 0 }) };
  if (THREADS_OFF) return;
  const mg = meshGround(ctx.terrain);
  // the ground a prop lies on: the drawn terrain, or the Sexton's own turf where he has laid it
  const turf = () => ctx.scene.getObjectByName('living-workers-turf');
  const gy = (x, z) => (x > 38 && x < 72 && z > 262 && z < 286 && turf() ? surfaceAt(x, z, [turf()], mg, 60) : mg(x, z));
  const pavers = () => ctx.scene.getObjectByName('structures-pavers');
  const surf = (x, z) => surfaceAt(x, z, [pavers(), ctx.terrain.mesh], mg, 60);
  // the traveller's kit lies on the Span's deck: built only with the Span
  if (!OFF.traveller && loaded('span') && await waitFor(() => ctx.span)) T.traveller = buildTraveller(ctx, gy);
  if (!OFF.gold) {
    if (loaded('structures')) await waitFor(() => ctx.structures);
    T.gold = buildGold(ctx, gy);
  }
  if (!OFF.chair) {
    if (loaded('structures')) await waitFor(() => ctx.structures);
    if (loaded('living-workers') && !SEXTON_OFF) await waitFor(() => ctx.workers?.sexton || ctx.workers?.off); // his turf is laid by then
    T.chair = buildChair(ctx, gy, surf);
    // the Collation gives up its twelfth place only now that the chair stands at the graves
    if (loaded('dressing5')) T.chair.taken = !!(await waitFor(() => ctx.dressing5))?.collation?.takeTwelfth?.();
  }
  if (!OFF.painter) T.painter = buildPainter(ctx, mg, loaded('dressing5') && !/[?&](prospect|dressing5)=0/.test(location.search)); // v8-08: on the drawn ground (the High Ling, the Bletting)
  const all = () => [T.traveller, T.chair, T.gold, T.painter].filter(Boolean).flatMap((p) => p.meshes);
  T.ends = () => ({ traveller: T.traveller?.ends, chair: T.chair?.ends, gold: T.gold?.ends, painter: T.painter?.ends });
  T.stats = () => {
    let calls = 0, tris = 0;
    for (const m of all()) { calls++; tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }
    return { calls, tris: Math.round(tris) };
  };
}
