// The terrain's bake beside the builds, and kept (v13 L3). startBake(ctx, url, store) makes the terrain mesh at once
// (terrain.js makeTerrain: its x and z, its material, in the scene) and gets its bake by the first of these that works:
//   1. kept: the store (src/v13/kept.js) has this tier's bake under this key: the leads and every array, no bake at all;
//   2. worker: src/height/bake-worker.js traces the leads and bakes on another thread while the page builds the modules
//      that do not read the mesh (main.js's MODULES: { mesh: true } marks those that do), then keeps it;
//   3. page: here, as before v13 (no Worker, ?worker=0, or the worker failed at any point: the page does what is left).
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
  const slot = `bake:${terrain.segs}`, key = bakeKey(terrain);
  const info = { source: null, slot, leadsMs: null, bakedMs: null, workerLeadsMs: null, workerBakeMs: null, workerImportMs: null, finishMs: null, kept: null, fellBack: null };
  let leadsFn, bakedFn, bakedErr, haveLeads = false, haveBake = false, worker = null, keptFn = () => {};
  // info.keepLater(): a promise of this bake being kept (the worker's own put, or the page's, started now)
  const workerKept = new Promise((r) => { keptFn = r; });
  const leads = new Promise((r) => { leadsFn = r; });
  const baked = new Promise((r, j) => { bakedFn = r; bakedErr = j; });
  const gotLeads = (B) => {
    if (haveLeads) return;
    if (B) setLeads(B); else prepareMap();
    haveLeads = true; info.leadsMs = performance.now() - t0; leadsFn();
  };
  const hold = Math.max(0, +url.searchParams.get('bakehold') || 0); // ?bakehold=ms: the bake arrives that much later (a test)
  const gotBake = (P, arrays) => {
    if (haveBake) return;
    if (hold && !gotBake.held) { gotBake.held = true; setTimeout(() => { gotBake.held = 'done'; gotBake(P, arrays); }, hold); return; }
    if (gotBake.held === true) return;
    const t1 = performance.now();
    finish(P, arrays);
    haveBake = true; info.finishMs = performance.now() - t1; info.bakedMs = performance.now() - t0; bakedFn(terrain);
  };
  // the page's own: whatever is not done yet (the leads first; the bake a task later, so a paint can come between)
  const onPage = (why) => {
    if (haveBake) return;
    if (worker) { try { worker.terminate(); } catch { /* */ } worker = null; }
    keptFn(false);
    info.fellBack = info.fellBack || why;
    if (!info.source || info.source === 'worker') info.source = info.source ? 'worker+page' : 'page';
    gotLeads(null);
    setTimeout(() => {
      try {
        if (haveBake) return;
        const P = new Float32Array(positions());
        const arrays = bakeTerrain(P, terrain.segs, terrain.size);
        // keep it for the next visit, once the walk is ready (the clone is a few ms on this thread)
        if (store && !store.off) {
          const copy = { leads: prepareMap(), P: P.slice(), baked: Object.fromEntries(Object.entries(arrays).map(([k, a]) => [k, a.slice()])) };
          const deps = loadedScripts();
          info.keepLater = () => store.put(slot, key, copy, deps).then((ok) => { info.kept = ok; });
        }
        gotBake(P, arrays);
      } catch (e) { bakedErr(e); }
    }, 0);
  };
  const fits = (rec) => {
    const n = (terrain.segs + 1) ** 2;
    return rec && rec.leads && rec.P instanceof Float32Array && rec.P.length === n * 3 && rec.baked && BAKED.every(([k, m]) => rec.baked[k] instanceof Float32Array && rec.baked[k].length === n * m);
  };
  const viaWorker = () => {
    if (url.searchParams.get('worker') === '0') return onPage('?worker=0');
    if (typeof Worker === 'undefined') return onPage('no Worker');
    try { worker = new Worker(new URL(`../height/bake-worker.js${location.search}`, import.meta.url), { type: 'module' }); }
    catch (e) { return onPage(`new Worker: ${e?.message || e}`); }
    info.source = 'worker';
    info.keepLater = () => workerKept;
    const tl = setTimeout(() => { if (!haveLeads) onPage('the worker said nothing'); }, LEADS_WAIT);
    const tb = setTimeout(() => { if (!haveBake) onPage('the worker did not finish'); }, BAKE_WAIT);
    worker.onmessage = (e) => {
      const m = e.data;
      try {
        if (m.type === 'leads') { info.workerLeadsMs = m.ms; info.workerImportMs = m.importMs; gotLeads(m.leads); }
        else if (m.type === 'baked') {
          info.workerBakeMs = m.ms; clearTimeout(tl); clearTimeout(tb);
          if (!fits({ leads: true, P: m.P, baked: m.baked })) throw new Error('the worker\'s arrays are not this mesh\'s');
          gotBake(m.P, m.baked);
          if (!(store && !store.off)) { worker.terminate(); worker = null; keptFn(null); }
        } else if (m.type === 'kept') { info.kept = m.ok; if (!m.ok && m.errors?.length) ctx.log?.('bake: not kept:', m.errors.join('; ')); worker?.terminate(); worker = null; keptFn(m.ok); }
        else if (m.type === 'error') { ctx.log?.(`bake: the worker failed (${m.stage}): ${m.message}`); if (m.stage !== 'kept') onPage(`worker ${m.stage}`); else { info.kept = false; worker?.terminate(); worker = null; keptFn(false); } }
      } catch (err) { console.error('[fp] bake:', err); onPage(String(err?.message || err)); }
    };
    worker.onerror = (e) => { e.preventDefault?.(); onPage(`worker error: ${e.message || 'load'}`); };
    worker.postMessage({ segs: terrain.segs, size: terrain.size, slot, key, base: document.baseURI, kept: !!(store && !store.off) });
  };
  (async () => {
    let rec = null;
    try { rec = store && !store.off ? await store.get(slot, key) : null; } catch { rec = null; }
    if (rec && fits(rec)) {
      try {
        info.source = 'kept';
        gotLeads(rec.leads);
        gotBake(rec.P, rec.baked);
        return;
      } catch (e) { console.error('[fp] bake: the kept bake would not go on:', e); info.source = null; if (haveLeads) return onPage('kept bake refused'); }
    }
    viaWorker();
  })().catch((e) => { console.error('[fp] bake:', e); onPage(String(e?.message || e)); });
  return { terrain, leads, baked, info };
}
