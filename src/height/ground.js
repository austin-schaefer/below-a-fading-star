// The regions' ground hooks for the terrain's bake (v13 L3), three-free so the bake can run in a worker: each region's
// hook is in v4/regions/ground/<key>.js, which its module re-exports as `ground` (v4/regions.js checks they are the
// same). regionsGround(col, x, z, b) lerps the vertex colour col (anything with r, g, b and lerp: a THREE.Color or a
// height/color.js Col) by each region's hook at its weight; ?regions=1 tints it flat by region instead.
import { REGION_KEYS, _w, regionAt } from './regions.js';
import { Col, col } from './color.js';
import { ground as bletting } from '../v4/regions/ground/bletting.js';
import { ground as saltings } from '../v4/regions/ground/saltings.js';
import { ground as outwash } from '../v4/regions/ground/outwash.js';
import { ground as highLing } from '../v4/regions/ground/high-ling.js';
import { ground as demesne } from '../v4/regions/ground/demesne.js';
import { ground as lynchets } from '../v4/regions/ground/lynchets.js';
import { ground as strandline } from '../v4/regions/ground/strandline.js';
import { ground as adust } from '../v4/regions/ground/adust.js';

export const GROUND_HOOKS = { bletting, saltings, outwash, highLing, demesne, lynchets, strandline, adust };
const GROUND_KEYS = REGION_KEYS.filter((k) => typeof GROUND_HOOKS[k] === 'function');

// (the page's query; in the bake's worker, handed in as FP_PAGE_QUERY: its own URL has none)
export const REGIONS_DEBUG = new URLSearchParams(globalThis.FP_PAGE_QUERY ?? globalThis.location?.search ?? '').get('regions') === '1';
export const REGION_DEBUG_COLORS = {
  bletting: '#c8902a', saltings: '#f0e0e8', outwash: '#8fb4d8', highLing: '#b04a6a', demesne: '#5aa04a', lynchets: '#c8c070',
  strandline: '#222228', adust: '#c84a1a', wood: '#1a4a1a', fen: '#3a6a5a', lattice: '#4ad0ff', moor: '#6a6a40',
};
const DBG = Object.fromEntries(Object.entries(REGION_DEBUG_COLORS).map(([k, v]) => [k, col(v)]));
const _gw = { ..._w }, _dc = new Col();
export function regionsGround(c, x, z, b) {
  if (!REGIONS_DEBUG && !GROUND_KEYS.length) return c;
  const w = regionAt(x, z, _gw);
  if (REGIONS_DEBUG) {
    _dc.setRGB(0, 0, 0);
    for (const k of Object.keys(DBG)) if (w[k] > 0) _dc.r += DBG[k].r * w[k], _dc.g += DBG[k].g * w[k], _dc.b += DBG[k].b * w[k];
    return c.lerp(_dc, 0.75);
  }
  for (const k of GROUND_KEYS) if (w[k] > 0) GROUND_HOOKS[k](c, x, z, w[k], b);
  return c;
}
