// The URL switches the height path reads (v13 L2), read once, here and nowhere else in it: ?mountains=v4 (the v4 wall),
// ?cols=low (the old cols), ?ridge=0 (no merlons). On the page they come from location's query. A worker has no page
// location (its own is the script's URL), so a worker that builds the height path is started with the page's query as
// its name: new Worker(url, { type: 'module', name: location.search }); node tools set globalThis.FP_HEIGHT_QUERY.
const q = globalThis.FP_HEIGHT_QUERY ?? (typeof document !== 'undefined' && typeof location !== 'undefined' ? location.search : (globalThis.name || ''));
export const HEIGHT_PARAMS = new URLSearchParams(q);
