// The terrain's bake in a worker (v13 L3), beside the module builds. Started by src/v13/bake.js as a module worker
// with the page's query on its own URL, so every module here reads the page's switches from location; the height
// path's params from it too (src/height/params.js). It imports nothing of three.
// It is posted { segs, size, slot, key, base, kept } and answers, in order:
//   { type: 'leads', leads, ms }            the leads traced (v4/paths/routes.js leads()), for the page's own heightAt
//   { type: 'baked', P, baked, ms }         the vertices with their heights and every baked attribute (transferred)
//   { type: 'kept', ok }                    after keeping all of it in the store (src/v13/kept.js), unless kept is false
//   { type: 'error', stage, message }       on any failure: the page then does the rest itself
globalThis.FP_HEIGHT_PARAMS = location.search;
self.onmessage = async (e) => {
  const job = e.data;
  let stage = 'import';
  try {
    const t0 = performance.now();
    const [{ prepareMap }, B, K] = await Promise.all([import('../v4/paths/ground.js'), import('./bake.js'), job.kept ? import('../v13/kept.js') : null]);
    const tImported = performance.now();
    stage = 'leads';
    const leads = prepareMap();
    const tLeads = performance.now();
    self.postMessage({ type: 'leads', leads, ms: tLeads - tImported, importMs: tImported - t0 });
    stage = 'bake';
    const P = B.planePositions(job.size, job.segs);
    const baked = B.bakeTerrain(P, job.segs, job.size);
    const tBaked = performance.now();
    // the store's copy first (a memcpy), then the arrays themselves go to the page without a copy
    const copy = job.kept ? { leads, P: P.slice(), baked: Object.fromEntries(Object.entries(baked).map(([k, a]) => [k, a.slice()])) } : null;
    self.postMessage({ type: 'baked', P, baked, ms: tBaked - tLeads }, [P.buffer, ...Object.values(baked).map((a) => a.buffer)]);
    if (copy) {
      stage = 'kept';
      const store = K.openKept({ base: job.base });
      const deps = [...new Set([new URL(location.pathname, location.origin).href, ...K.loadedScripts()])];
      const ok = await store.put(job.slot, job.key, copy, deps);
      self.postMessage({ type: 'kept', ok, errors: store.stats.errors, deps: deps.length });
    }
  } catch (err) {
    self.postMessage({ type: 'error', stage, message: String(err?.stack || err) });
  }
};
