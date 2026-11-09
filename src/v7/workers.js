// v7, the living: the workers (world module living-workers), three people at a task nobody needs any more, each in
// one place and each with the one reaction its idea gives: BY the Taker of Altitudes on the Adust (workers/taker.js),
// BZ the Coheirs at their net on the Strandline (workers/coheirs.js), CF the Sexton of No One and his graves on the
// south moor (workers/sexton.js, the plan and clearances workers/graves.js, the ground workers/cut.js). No speech,
// no names, nothing legible: each is absorbed in the task. They fire named cues for the audio pass and synthesise
// nothing. ctx.workers (stats() and the test hooks); ?workers=0 leaves all three out, ?taker=0, ?coheirs=0 and
// ?sexton=0 each one.
import { SITES } from '../world.js';
import { buildTaker } from './workers/taker.js';
import { buildCoheirs } from './workers/coheirs.js';
import { buildSexton } from './workers/sexton.js';
import { SEXTON_OFF, digOrder } from './workers/graves.js';
import { waitFor, loaded } from './workers/rig.js';
import { skinGround, meshGround } from '../v4/regions/skin.js';

// The Adust's pavement slab nearest the Taker's site that a man can sit on: rebuilt from the pavements' mesh (each
// slab a box of five faces, its top first), preferring a slab no beetles stand on.
function findSeat(ctx, pave) {
  const site = SITES.taker;
  if (!pave) return { x: site.x, y: ctx.terrain.heightAt(site.x, site.z), z: site.z, slab: null, d: 0 };
  const P = pave.geometry.attributes.position.array, n = Math.floor(P.length / 3 / 20);
  const beetles = ctx.regions?.creatures?.beetles || [];
  let best = null, bestScore = -Infinity;
  for (let k = 0; k < n; k++) {
    const o = k * 60, c = [];
    for (let v = 0; v < 4; v++) c.push([P[o + v * 3], P[o + v * 3 + 1], P[o + v * 3 + 2]]);
    const x = (c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4, y = (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4, z = (c[0][2] + c[1][2] + c[2][2] + c[3][2]) / 4;
    const d = Math.hypot(x - site.x, z - site.z);
    if (d > site.r) continue;
    const hx = Math.hypot(c[3][0] - c[0][0], c[3][2] - c[0][2]) / 2, hz = Math.hypot(c[1][0] - c[0][0], c[1][2] - c[0][2]) / 2;
    const on = beetles.filter((b) => Math.hypot(b.x - x, b.z - z) < Math.max(hx, hz)).length;
    const score = Math.min(hx, hz) * 2 + Math.max(hx, hz) * 0.5 - d * 0.15 - (on ? 1.5 : 0);
    if (Math.min(hx, hz) >= 0.28 && score > bestScore) { bestScore = score; best = { x, y, z, slab: { hx, hz }, d, beetles: on }; }
  }
  return best || { x: site.x, y: ctx.terrain.heightAt(site.x, site.z), z: site.z, slab: null, d: 0 };
}

export async function build(ctx) {
  const q = new URLSearchParams(location.search), off = (k) => q.get(k) === '0';
  const W = ctx.workers = { off: off('workers'), taker: null, coheirs: null, sexton: null, stats: () => ({ calls: 0, tris: 0 }) };
  if (W.off) return;
  const t0 = performance.now();
  await ctx.progress?.('the workers', 0);
  // the Taker, once the Adust has laid its pavements (modules build in parallel)
  if (!off('taker')) {
    const pave = loaded('region-adust') ? await waitFor(() => ctx.scene.getObjectByName('adust-pavements')) : null;
    W.taker = buildTaker(ctx, findSeat(ctx, pave));
  }
  // the Coheirs, on the Strandline's shingle skin where it lies
  if (!off('coheirs')) {
    const skin = loaded('region-strandline') ? await waitFor(() => ctx.scene.getObjectByName('skin-strandline')) : null;
    const groundAt = skin ? skinGround(ctx.terrain, skin.userData.covers, skin.userData.lift) : meshGround(ctx.terrain);
    W.coheirs = buildCoheirs(ctx, groundAt);
  }
  // the Sexton, once rocks.js has placed its boulders (a boulder on a slot blocks it)
  if (!SEXTON_OFF) {
    if (loaded('rocks')) await waitFor(() => ctx.scene.getObjectByName('rocks-boulder-0'));
    W.sexton = buildSexton(ctx, digOrder());
  }
  W.stats = () => {
    const out = { calls: 0, tris: 0 };
    for (const k of ['taker', 'coheirs', 'sexton']) { const s = W[k]?.stats(); if (!s) continue; out[k] = s; out.calls += s.calls; out.tris += s.tris; }
    return out;
  };
  const st = W.stats();
  ctx.log?.(`workers: ${st.calls} calls, ${st.tris} tris; taker on a slab ${W.taker?.seat.d?.toFixed(2)} m from his site; ${W.sexton ? `${W.sexton.openCount()} graves open, ${W.sexton.order.length} slots dug or to dig, ${W.sexton.ground.cut} terrain triangles cut` : ''} (${(performance.now() - t0).toFixed(0)} ms)`);
}
