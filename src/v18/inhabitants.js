// v18-F4: who lives in the wood. The stilters in the north grove (stilters.js), the eyes between the trees along the
// spurs and in the old wood (eyes.js), the moths at the glasshouse's panes (moths.js). This module only gathers what the
// three share: the tracks to keep off (the leads, and the north spur's straight line until F1's lead is in), the way out
// of the grove for the ring's gap, and the wood's trunks.
// ?inhabitants=0 leaves all three out; ?stilters=0, ?eyes=0, ?moths=0 each its own; ?mothpanes=1 draws the stand-in glass.
import { GROVE, SPURS } from './plan.js';
import { LEADS, leads, nearestLead } from '../v4/paths/routes.js';
import { hyp } from '../noise.js';
import { buildStilters } from './stilters.js';
import { buildEyes } from './eyes.js';
import { buildMoths } from './moths.js';

const segDist = (x, z, a, b) => {
  const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
  const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / l2));
  return hyp(x - a.x - ex * t, z - a.z - ez * t);
};

export async function build(ctx) {
  const url = new URL(location.href), P = url.searchParams;
  if (P.get('inhabitants') === '0') return;
  const N = SPURS.north;
  // the north spur as a lead (F1), or its straight line as a stand-in
  const spurLead = LEADS.findIndex((L) => L.pts.some(([x, z]) => hyp(x - N.to.x, z - N.to.z) < 8));
  const _h = {};
  const leadAt = (x, z) => {
    if (spurLead < 0 && segDist(x, z, N.from, N.to) < 4.5) return true;
    if (nearestLead(x, z, 1.5, _h)) return true;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; if (nearestLead(x + Math.cos(a) * 2, z + Math.sin(a) * 2, 1.5, _h)) return true; }
    return false;
  };
  // the way out of the grove: where the spur leaves it, GROVE.r + 4 from its middle
  let exit = { x: GROVE.x + (N.from.x - N.to.x) / hyp(N.from.x - N.to.x, N.from.z - N.to.z) * (GROVE.r + 4), z: GROVE.z + (N.from.z - N.to.z) / hyp(N.from.x - N.to.x, N.from.z - N.to.z) * (GROVE.r + 4) };
  if (spurLead >= 0) {
    const L = leads().list[spurLead];
    const S = L?.lines?.[0];
    if (S) {
      const fromTo = hyp(S[S.length - 1].x - N.to.x, S[S.length - 1].z - N.to.z) < hyp(S[0].x - N.to.x, S[0].z - N.to.z);
      const seq = fromTo ? S.slice().reverse() : S;
      const e = seq.find((p) => hyp(p.x - GROVE.x, p.z - GROVE.z) >= GROVE.r + 4);
      if (e) exit = { x: e.x, z: e.z };
    }
  }
  await ctx.built?.('vegetation');
  const trees = (ctx.woodTrees || []).filter((t) => hyp(t.x - GROVE.x, t.z - GROVE.z) < 70);
  const woodTrees = ctx.woodTrees || [];
  const out = ctx.inhabitants = { exit, spurLead };
  if (P.get('stilters') !== '0') out.stilters = ctx.stilters = buildStilters(ctx, { leadAt, exitAt: () => exit, trees });
  if (P.get('eyes') !== '0') out.eyes = buildEyes(ctx, { leadAt, woodTrees });
  if (P.get('moths') !== '0') out.moths = buildMoths(ctx, { standin: P.get('mothpanes') === '1' });
  out.leadAt = leadAt;
}
