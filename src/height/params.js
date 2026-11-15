// The URL switches the height path reads (v13 L2): ?mountains=v4 (the v4 wall), ?cols=low (the old cols), ?ridge=0 (no
// merlons). They shape tables built when v4/mountains.js loads, so they are fixed before any height module evaluates:
//   - on the page (a document is present), from location's query, once, here;
//   - anywhere else (a worker, node), only from globalThis.FP_HEIGHT_PARAMS, set before the first height import to
//     what the page gives (HEIGHT_PARAMS, or HEIGHT_PARAMS_KEY, or a query string): without it the import throws, so a
//     worker never builds the walls with switches the page does not have. heightParamsFrom(query) is the parse.
// HEIGHT_PARAMS_KEY is a stable string of them (the same switches give the same string), for a cache's key.
export function heightParamsFrom(q) {
  if (q && typeof q === 'object' && !(q instanceof URLSearchParams)) q = `mountains=${q.mountains}&cols=${q.cols}&ridge=${q.ridge ? 1 : 0}`;
  const p = q instanceof URLSearchParams ? q : new URLSearchParams(String(q ?? ''));
  return Object.freeze({ mountains: p.get('mountains') === 'v4' ? 'v4' : 'c', cols: p.get('cols') === 'low' ? 'low' : 'high', ridge: p.get('ridge') !== '0' });
}
function given() {
  if (globalThis.FP_HEIGHT_PARAMS != null) return heightParamsFrom(globalThis.FP_HEIGHT_PARAMS);
  if (typeof document !== 'undefined' && typeof location !== 'undefined') return heightParamsFrom(location.search);
  throw new Error('height path: no params. Off the page (a worker, node), set globalThis.FP_HEIGHT_PARAMS to the page\'s HEIGHT_PARAMS or HEIGHT_PARAMS_KEY before importing it.');
}
export const HEIGHT_PARAMS = given();
export const HEIGHT_PARAMS_KEY = `mountains=${HEIGHT_PARAMS.mountains}&cols=${HEIGHT_PARAMS.cols}&ridge=${HEIGHT_PARAMS.ridge ? 1 : 0}`;
