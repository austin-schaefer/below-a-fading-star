// The uncanny: inhabitants of the moor that are not animals. The man in the cloak of eyes, the thing that
// slinks at the edge of sight, F9AC's biomesh creeping out from the Lattice, the traveller on his floating
// cushion with his wagon of treasures, the woman in Lees Tarn who keeps her back to you, and the stilted
// wading thing in the shallows of the river's mouth and the fen, which is never there when you look.
// Each part builds inside its own try/catch; ctx.uncanny holds their state and the test hooks.
import { makeRules } from './uncanny/kit.js';
import { buildCloak } from './uncanny/cloak.js';
import { buildSlinker } from './uncanny/slinker.js';
import { buildBiomesh } from './uncanny/biomesh.js';
import { buildTraveller } from './uncanny/traveller.js';
import { buildTarnWoman } from './uncanny/tarn.js';
import { buildStiltWader } from './uncanny/wader.js';

export function buildUncanny(ctx) {
  const U = ctx.uncanny = { rules: makeRules(ctx), stats: {} };
  const parts = [['cloak', buildCloak], ['slinker', buildSlinker], ['biomesh', buildBiomesh], ['traveller', buildTraveller], ['tarn', buildTarnWoman], ['wader', buildStiltWader]];
  for (const [name, fn] of parts) {
    try { U.stats[name] = fn(ctx, U) || {}; } catch (e) { console.error(`[fp] uncanny.${name} failed:`, e); }
  }
  const calls = Object.values(U.stats).reduce((a, s) => a + (s.drawCalls || 0), 0);
  const tris = Object.values(U.stats).reduce((a, s) => a + (s.tris || 0), 0);
  ctx.log(`uncanny: ${Object.keys(U.stats).join(', ')}; ${calls} draw calls, ~${Math.round(tris / 1000)}k tris`);
}
