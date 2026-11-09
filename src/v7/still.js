// v7, the living: the still figures (world module living-still; ?still=0 leaves it out).
//
// CB The Long Sleeper (?sleeper=0): a man asleep on his back under an old medlar in the Bletting, breathing once a minute.
// CI The Stylite (?stylite=0): a gaunt man on top of the High Ling's tallest tor, a rope to a basket at its foot that
//   rises, empty, when you come near. CL The Accrescent (?accrescent=0): a man half grown through with crystal, walking
//   south out of the Lattice at a step an hour, with the line of his glassy footprints behind him.
// Each has one slow motion and none a gait. Wilderness-v5.md has the sections ("### CB", "### CI", "### CL"); the forms
// are in still/. No heightfield change, no clearance before a draw, no tree in a region's planting list, no light.
// ctx.still = { sleeper, stylite, accrescent, stats() }.
import { makeGround } from '../fauna/uncanny/kit.js';

const Q = new URLSearchParams(location.search);
const OFF = Q.get('still') === '0';

export async function build(ctx) {
  if (OFF) { ctx.still = { off: true }; return; }
  const G = makeGround(ctx);
  const api = { sleeper: null, stylite: null, accrescent: null };
  ctx.still = api;
  const parts = [];

  if (Q.get('sleeper') !== '0') {
    await ctx.progress?.('the sleeper under the medlar', 0.1);
    const { buildSleeper } = await import('./still/sleeper.js');
    const s = api.sleeper = buildSleeper(ctx, G);
    ctx.registerUpdate(s.update, { at: () => s.centre, near: 40, hz: 2 });
    parts.push(s);
  }

  api.stats = () => {
    let calls = 0, tris = 0;
    for (const p of parts) { const s = p.stats(); calls += s.calls; tris += s.tris; }
    return { calls, tris };
  };
}
