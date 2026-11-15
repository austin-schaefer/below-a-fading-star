// The terrain's bake beside the builds, and kept (v13 L3). startBake(ctx, url, store) makes the terrain mesh at once
// (terrain.js makeTerrain: its x and z, its material, in the scene) and gets its bake from whichever answers first:
//   - kept: the store (src/v13/kept.js) has this tier's bake under this key: the leads and every array, no bake at all;
//   - worker: src/height/bake-worker.js, started at once beside the store's read (a URL with no query; the page's query
//     goes in its first message), traces the leads and bakes on another thread while the page builds the modules that
//     do not read the mesh (main.js's MODULES: { mesh: true } marks those that do), then keeps it; a worker whose
//     height params are not the page's is not used;
//   - page: here, as before v13 (no Worker, ?worker=0, or the worker failed at any point: the page does what is left).
// The three give the same bits (tools/height-check.mjs purebake; tools/build-check.mjs in the browser). It returns
// { terrain, leads, baked, info }: leads resolves once the leads are in this thread (every heightAt after it carries
// the runnels' cuts, so nothing may sample the height before it), baked once the mesh is whole; info says which way it
// came and how long each step took (startup's report carries it as extra.bake). ?worker=0, ?kept=0 turn each off;
// ?bakehold=ms holds the bake back that long (a test: a module that reads the mesh without { mesh: true } then fails).
import { makeTerrain } from '../terrain.js';
import { bakeTerrain, BAKED } from '../height/bake.js';
import { prepareMap, setLeads } from '../v4/paths/ground.js';
import { HEIGHT_PARAMS_KEY } from '../height/params.js';
import { queryKey, loadedScripts } from './kept.js';

const LEADS_WAIT = 30000, BAKE_WAIT = 90000; // a worker that has said nothing by then is given up (the page does it)

export function bakeKey(terrain) { return `${HEIGHT_PARAMS_KEY}|${queryKey(location.search)}|segs=${terrain.segs}`; }

export function startBake(ctx, url, store) {
  const t0 = performance.now();
  const { terrain, finish, positions } = makeTerrain(ctx);
  const slot = `bake:${terrain.segs}`, key = bakeKey(terrain), keeping = !!(store && !store.off);
  // source: where the bake that was used came from (kept, worker, page); fellBack: why the page baked
  const info = { source: null, slot, leadsMs: null, bakedMs: null, workerLeadsMs: null, workerBakeMs: null, workerImportMs: null, finishMs: null, kept: null, fellBack: null, storeMs: null };
  let leadsFn, bakedFn, bakedErr, haveLeads = false, haveBake = false, worker = null, keptFn = () => {}, tl = 0, tb = 0;
  // info.keepLater(): a promise of this bake being kept (the worker's own put, or the page's, started now)
  const workerKept = new Promise((r) => { keptFn = r; });
  info.keepLater = () => workerKept;
  const leads = new Promise((r) => { leadsFn = r; });
  const baked = new Promise((r, j) => { bakedFn = r; bakedErr = j; });
  const stopWorker = (kept) => { clearTimeout(tl); clearTimeout(tb); if (worker) { try { worker.terminate(); } catch { /* */ } worker = null; } keptFn(kept); };
  const gotLeads = (B) => {
    if (haveLeads) return;
    if (B) setLeads(B); else prepareMap();
    haveLeads = true; info.leadsMs = performance.now() - t0; leadsFn();
  };
  const hold = Math.max(0, +url.searchParams.get('bakehold') || 0); // ?bakehold=ms: the bake arrives that much later (a test)
  const gotBake = (P, arrays, from) => {
    if (haveBake) return;
    if (hold && !gotBake.held) { gotBake.held = true; setTimeout(() => { gotBake.held = 'done'; gotBake(P, arrays, from); }, hold); return; }
    if (gotBake.held === true) return;
    const t1 = performance.now();
    finish(P, arrays);
    haveBake = true; info.source = from; info.finishMs = performance.now() - t1; info.bakedMs = performance.now() - t0; bakedFn(terrain);
  };
  // the page's own: whatever is not done yet (the leads first; the bake a task later, so a paint can come between)
  const onPage = (why) => {
    if (haveBake || onPage.started) return;
    onPage.started = true;
    stopWorker(false);
    info.fellBack = why;
    gotLeads(null);
    setTimeout(() => {
      try {
        if (haveBake) return;
        const P = new Float32Array(positions());
        const arrays = bakeTerrain(P, terrain.segs, terrain.size);
        // keep it for the next visit, just after ready (the clone is a few ms on this thread)
        if (keeping) {
          const copy = { leads: prepareMap(), P: P.slice(), baked: Object.fromEntries(Object.entries(arrays).map(([k, a]) => [k, a.slice()])) };
          const deps = loadedScripts();
          info.keepLater = () => store.put(slot, key, copy, deps).then((ok) => { info.kept = ok; });
        }
        gotBake(P, arrays, 'page');
      } catch (e) { bakedErr(e); }
    }, 0);
  };
  const fits = (rec) => {
    const n = (terrain.segs + 1) ** 2;
    return rec && rec.leads && rec.P instanceof Float32Array && rec.P.length === n * 3 && rec.baked && BAKED.every(([k, m]) => rec.baked[k] instanceof Float32Array && rec.baked[k].length === n * m);
  };
  // the worker, at once, raced with the store: whichever has the leads and the bake first is used (the same bits)
  const viaWorker = () => {
    if (url.searchParams.get('worker') === '0') return onPage('?worker=0');
    if (typeof Worker === 'undefined') return onPage('no Worker');
    try { worker = new Worker(new URL('../height/bake-worker.js', import.meta.url), { type: 'module' }); } // no query: the service worker keeps it
    catch (e) { return onPage(`new Worker: ${e?.message || e}`); }
    tl = setTimeout(() => { if (!haveLeads) onPage('the worker said nothing'); }, LEADS_WAIT);
    tb = setTimeout(() => { if (!haveBake) onPage('the worker did not finish'); }, BAKE_WAIT);
    worker.onmessage = (e) => {
      const m = e.data;
      try {
        if (m.type === 'leads') {
          if (m.params !== HEIGHT_PARAMS_KEY) return onPage(`the worker's height params (${m.params}) are not the page's (${HEIGHT_PARAMS_KEY})`);
          info.workerLeadsMs = m.ms; info.workerImportMs = m.importMs; gotLeads(m.leads);
        } else if (m.type === 'baked') {
          info.workerBakeMs = m.ms; clearTimeout(tl); clearTimeout(tb);
          if (Array.isArray(m.scripts)) (window.__fp_fill_extra ||= []).push(...m.scripts); // sw.js's first-visit fill keeps the worker's files too (index.html)
          if (!fits({ leads: true, P: m.P, baked: m.baked })) throw new Error('the worker\'s arrays are not this mesh\'s');
          gotBake(m.P, m.baked, 'worker');
          if (!keeping) stopWorker(null);
        } else if (m.type === 'kept') { info.kept = m.ok; if (!m.ok && m.errors?.length) ctx.log?.('bake: not kept:', m.errors.join('; ')); stopWorker(m.ok); }
        else if (m.type === 'error') { ctx.log?.(`bake: the worker failed (${m.stage}): ${m.message}`); if (m.stage !== 'kept') onPage(`worker ${m.stage}`); else { info.kept = false; stopWorker(false); } }
      } catch (err) { console.error('[fp] bake:', err); onPage(String(err?.message || err)); }
    };
    worker.onerror = (e) => { e.preventDefault?.(); onPage(`worker error: ${e.message || 'load'}`); };
    worker.postMessage({ query: location.search, segs: terrain.segs, size: terrain.size, slot, key, base: document.baseURI, kept: keeping });
  };
  viaWorker();
  if (keeping) (async () => {
    let rec = null;
    try { rec = await store.get(slot, key); } catch { rec = null; }
    info.storeMs = performance.now() - t0;
    if (!rec || haveBake || !fits(rec)) return;
    stopWorker(null); // the store answered first: nothing for the worker to do or keep
    gotLeads(rec.leads);
    gotBake(rec.P, rec.baked, 'kept');
  })().catch((e) => { console.error('[fp] bake: the kept bake would not go on:', e); if (!haveBake) onPage('kept bake refused'); });
  return { terrain, leads, baked, info };
}
