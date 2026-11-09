// v7, the living: the walkers (world module `living-walkers`): CD the Little Thurifer on P3, CG the Leerie at his
// standards beside K1, DM the Link-Boy at his post on P4 and on every path lead (wilderness-v5.md, "## v7, the
// living"). The rig they share is walkers/gait.js; their fire and smoke one Points (walkers/flames.js); the Link-Boy's
// drawn shadows one disc (walkers/shadow.js). Main pass: the three bodies, the Thurifer's train, the Points, and the disc
// while the Link-Boy walks near you: at most 6 draw calls. One new PointLight, the link's.
// ?walkers=0 leaves them all out; ?thurifer=0, ?leerie=0, ?linkboy=0 each its own. ctx.walkers: { thurifer, leerie,
// linkBoy, stats() }, with the test hooks (thurifer.place/bow, leerie.at, linkBoy.lead/aside/reset) on each.
// Sound: named cues only (ctx.audio.cue), which are no-ops until the audio pass writes them: thurifer-chain (each swing's
// end, within 25 m), thurifer-hiss ({start}/{stop} while it walks), leerie-step, leerie-click (the touch), linkboy-step.
import { leads } from '../v4/paths/routes.js';
import { buildFlames } from './walkers/flames.js';
import { buildThurifer } from './walkers/thurifer.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const off = (k) => Q.get(k) === '0';

export async function build(ctx) {
  if (off('walkers')) { ctx.walkers = null; return; }
  const ll = Q.get('locallights');
  const standards = ll === null || ll.split(',').includes('leerie'); // the Leerie walks only where his row stands
  const want = { thurifer: !off('thurifer'), leerie: !off('leerie') && standards, linkBoy: !off('linkboy') };
  ctx._walkerLeads = leads().list;
  const cue = (name, pos, opts) => ctx.audio?.cue?.(name, pos, opts);
  const F = buildFlames(ctx, ctx.makeRng(7001));
  ctx.scene.add(F.points);
  const api = { thurifer: null, leerie: null, linkBoy: null, flames: F };
  if (want.thurifer) { const T = api.thurifer = buildThurifer(ctx, F, cue); ctx.scene.add(T.root, T.train); }
  else F.U.uOn.value.x = 0;
  F.U.uOn.value.y = 0;
  ctx.registerUpdate((dt, t) => F.frame(t));
  api.stats = () => {
    const parts = [api.thurifer, api.leerie, api.linkBoy].filter(Boolean).map((p) => p.stats());
    return { calls: 1 + parts.reduce((a, p) => a + p.calls, 0), tris: Math.round(parts.reduce((a, p) => a + p.tris, 0)), lights: api.linkBoy ? 1 : 0, sprites: F.sprites, figures: parts.length };
  };
  ctx.walkers = api;
  const st = api.stats();
  ctx.log(`walkers: ${st.figures} figures, ${st.calls} draw calls, ${st.tris} triangles, ${st.lights} light`);
}
