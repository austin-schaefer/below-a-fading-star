// The terrain's bake in a worker (v13 L3), beside the module builds. Started by src/v13/bake.js as a module worker on
// a URL with no query (a service worker keeps no URL with one, sw.js), and handed the page's query in its first
// message: set as globalThis.FP_PAGE_QUERY (and the height path's FP_HEIGHT_PARAMS) before anything is imported, so
// every module here reads the page's switches. It imports nothing of three.
// It is posted { query, segs, size, slot, key, base, kept } and answers, in order:
//   { type: 'leads', leads, ms, params }    the leads traced (v4/paths/routes.js leads()) and the height params' key it
//                                           used (the page compares it with its own and bakes itself on a mismatch)
//   { type: 'baked', P, baked, ms, scripts } the vertices with their heights and every baked attribute (transferred), and
//                                           the files this worker fetched (for the service worker's fill)
//   { type: 'kept', ok }                    after keeping all of it in the store (src/v13/kept.js), unless kept is false
//   { type: 'error', stage, message }       on any failure: the page then does the rest itself
self.onmessage = async (e) => {
  const job = e.data;
  let stage = 'import';
  try {
    globalThis.FP_PAGE_QUERY = String(job.query || '');
    globalThis.FP_HEIGHT_PARAMS = globalThis.FP_PAGE_QUERY;
    try { performance.setResourceTimingBufferSize(2000); } catch { /* */ }
    const t0 = performance.now();
    const [{ prepareMap }, B, P0, K] = await Promise.all([import('../v4/paths/ground.js'), import('./bake.js'), import('./params.js'), job.kept ? import('../v13/kept.js') : null]);
    const tImported = performance.now();
    stage = 'leads';
    const leads = prepareMap();
    const tLeads = performance.now();
    self.postMessage({ type: 'leads', leads, ms: tLeads - tImported, importMs: tImported - t0, params: P0.HEIGHT_PARAMS_KEY });
    stage = 'bake';
    const P = B.planePositions(job.size, job.segs);
    const baked = B.bakeTerrain(P, job.segs, job.size);
    const tBaked = performance.now();
    // the store's copy first (a memcpy), then the arrays themselves go to the page without a copy
    const copy = job.kept ? { leads, P: P.slice(), baked: Object.fromEntries(Object.entries(baked).map(([k, a]) => [k, a.slice()])) } : null;
    // what this worker fetched, for the service worker's first-visit fill (the page hands it on: window.__fp_fill_extra)
    let scripts = [];
    try { scripts = performance.getEntriesByType('resource').map((e) => e.name); } catch { /* */ }
    self.postMessage({ type: 'baked', P, baked, ms: tBaked - tLeads, scripts: [location.href, ...scripts] }, [P.buffer, ...Object.values(baked).map((a) => a.buffer)]);
    if (copy) {
      stage = 'kept';
      const store = K.openKept({ base: job.base });
      const deps = [...new Set([new URL(location.pathname, location.origin).href, ...K.loadedScripts()])];
      const ok = await store.put(job.slot, job.key, copy, deps);
      self.postMessage({ type: 'kept', ok, errors: store.stats.errors, misses: store.stats.misses, deps: deps.length });
    }
  } catch (err) {
    self.postMessage({ type: 'error', stage, message: String(err?.stack || err) });
  }
};
