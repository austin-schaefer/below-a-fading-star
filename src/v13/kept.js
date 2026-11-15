// The kept store (v13 L3): what the load computed, kept in IndexedDB for the next visit, so a repeat load can skip it.
// No THREE and no DOM: the page and the bake's worker both use it. Nothing here may make a visit wrong or slower:
// every miss, error, refusal, private window, timeout or version skew answers "not kept", and the caller computes.
//
// A record lives under `<tree>|<slot>` (a slot is a short name: 'bake:320', 'kept:rocks.place:low') and carries the
// key it was made under (the caller's string: the tier, the URL's switches, queryKey()). The tree is what the code
// running in this context is, never what the network says it is now:
//   - 'commit:<sha>' (off localhost, or ?kept=commit on it): the X-Fp-Commit stamp of this very module's own response
//     and of the bake's (fetched force-cache: the copy the module loader ran, from the HTTP cache or, under the
//     service worker, from its bound release) must agree with each other and with commit.json. Anything else (no
//     stamp, no commit.json, a disagreement: a deploy landed mid-load, or the service worker served an older release
//     than the network has) turns the store off for this load: nothing read, written or pruned.
//   - 'src' (localhost: tools/serve.sh has neither stamp nor commit.json): the record lists every script its context
//     had loaded with a hash of its text, and holds only while each still hashes the same (refetched once a load).
//     A test's fresh browser context starts with an empty store.
// A put replaces whatever was in its slot for this tree (an old key is gone); prune() deletes every record of another
// tree by its key alone (no record is read).
// A record carries a checksum of all it holds (sumOf), checked on every read. ?kept=0 turns it all off (get misses,
// put does nothing). FORMAT changes whenever what a record holds changes.
export const KEPT_FORMAT = 1;
const DB = 'fp-kept', STORE = 'records', WAIT = 2500;

// the URL's switches that cannot change what is computed: where the walker stands and what is measured. Everything
// else is part of a key, so a switch nobody listed here can only cost a miss, never a stale answer.
const VIEW = new Set(['pos', 'yaw', 'pitch', 'perf', 'bench', 'record', 'measure', 'debug', 'serial', 'kept', 'worker', 'q', 'tier', 'cap', 'idle', 'adapt', 'precompile', 'warmup', 'sw', 'gutter']);
export function queryKey(search) {
  const p = new URLSearchParams(search);
  return [...p.entries()].filter(([k]) => !VIEW.has(k)).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('&');
}

// a 64-bit hash of a text (two 32-bit lanes), as hex
export function hashText(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0') + ':' + s.length;
}

// a checksum of everything in data (typed arrays by their bytes; numbers, strings and booleans in plain objects, arrays
// and Maps, keys in order), so a record changed in the store is not used
const _f = new Float64Array(1), _u = new Uint32Array(_f.buffer);
export function sumOf(data) {
  let a = 0x811c9dc5 | 0, b = 0x9747b28c | 0;
  const mix = (w) => { a = Math.imul(a ^ w, 0x01000193); b = Math.imul(b ^ w, 0x5bd1e995); b ^= b >>> 13; };
  const str = (t) => { for (let i = 0; i < t.length; i++) mix(t.charCodeAt(i)); mix(t.length); };
  const walk = (v) => {
    if (v === null || v === undefined) { mix(7); return; }
    const ty = typeof v;
    if (ty === 'number') { _f[0] = v; mix(_u[0]); mix(_u[1]); return; }
    if (ty === 'string') { str(v); return; }
    if (ty === 'boolean') { mix(v ? 3 : 5); return; }
    if (ty !== 'object') return;
    if (ArrayBuffer.isView(v)) {
      const u = (v.byteOffset & 3) === 0 ? new Uint32Array(v.buffer, v.byteOffset, v.byteLength >> 2) : new Uint32Array(new Uint8Array(v.buffer, v.byteOffset, v.byteLength & ~3).slice().buffer);
      for (let i = 0; i < u.length; i++) mix(u[i]);
      mix(v.byteLength);
      return;
    }
    if (v instanceof Map) { for (const [k, x] of v) { walk(k); walk(x); } mix(v.size); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x); mix(v.length); return; }
    for (const k of Object.keys(v)) { str(k); walk(v[k]); }
  };
  walk(data);
  return `${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`;
}

// the page's query: the bake's worker is started without one (a service worker keeps no URL with a query) and is
// handed the page's as globalThis.FP_PAGE_QUERY before it imports anything
export const pageQuery = () => globalThis.FP_PAGE_QUERY ?? globalThis.location?.search ?? '';

const timeout = (p, ms, v = null) => Promise.race([p, new Promise((r) => setTimeout(() => r(v), ms))]);
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// the scripts this context has loaded (the page's or the worker's own module graph): same-origin .js
export function loadedScripts(perf = globalThis.performance) {
  try {
    const origin = globalThis.location?.origin;
    return [...new Set(perf.getEntriesByType('resource').map((e) => e.name.split('#')[0]).filter((n) => { try { const u = new URL(n); return u.origin === origin && /\.m?js$/.test(u.pathname); } catch { return false; } }))].sort();
  } catch { return []; }
}

export function openKept({ base, off = false, log = () => {} } = {}) {
  const stats = { hits: [], misses: [], puts: [], errors: [] };
  const note = (k, v) => { stats[k].push(v); if (k === 'errors') log(`kept: ${v}`); };
  if (off || typeof indexedDB === 'undefined') {
    const why = off ? 'off (?kept=0)' : 'no IndexedDB';
    return { off: true, why, stats, tree: Promise.resolve(null), get: async (slot) => { note('misses', `${slot}: ${why}`); return null; }, put: async () => false, prune: async () => 0 };
  }
  let dbP = null;
  const db = () => (dbP ||= timeout(new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); dbP = Promise.resolve(null); }; res(r.result); };
      r.onerror = () => { note('errors', `open: ${r.error?.name || r.error}`); res(null); };
      r.onblocked = () => { note('errors', 'open: blocked'); res(null); };
    } catch (e) { note('errors', `open: ${e?.name || e}`); res(null); }
  }), WAIT).then((d) => { if (!d) note('errors', 'open: no database (timed out or refused)'); return d; }));
  // on this machine's own server (tools/serve.sh has no commit.json, and asking for it logs a 404 the tests count as a
  // page error) the scripts' text decides, unless ?kept=commit says a local copy has the build's stamps (a _site/)
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(base).hostname) && !/[?&]kept=commit\b/.test(pageQuery());
  const stampOf = (u) => timeout(fetch(u, { cache: 'force-cache', credentials: 'same-origin' }).then((r) => (r.ok ? r.headers.get('x-fp-commit') : null)).catch(() => null), WAIT);
  const tree = (async () => {
    if (local) return 'src';
    try {
      const [r, s1, s2] = await Promise.all([timeout(fetch(new URL('commit.json', base), { cache: 'no-store' }), WAIT), stampOf(import.meta.url), stampOf(new URL('../height/bake.js', import.meta.url).href)]);
      const j = r && r.ok ? await r.json() : null, c = j && typeof j.commit === 'string' ? j.commit : '';
      stats.stamp = { commit: c || null, kept: s1, bake: s2 };
      if (c && s1 === c && s2 === c) return `commit:${c}`;
      note('misses', `the store is off: commit.json ${c || 'none'}, this code's stamps ${s1 || 'none'}, ${s2 || 'none'}`);
    } catch (e) { note('misses', `the store is off: ${e?.name || e}`); }
    return null;
  })();
  const rkey = (t, slot) => `${t}|${slot}`;
  // the scripts' hashes, each fetched once a load
  const hashes = new Map();
  const hashOf = (url) => {
    if (!hashes.has(url)) hashes.set(url, timeout(fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : null)).then((t) => (t == null ? null : hashText(t))), WAIT * 2).catch(() => null));
    return hashes.get(url);
  };
  async function depsHold(deps) {
    if (!Array.isArray(deps) || !deps.length) return false;
    const now = await Promise.all(deps.map(([u]) => hashOf(u)));
    return deps.every(([, h], i) => now[i] != null && now[i] === h);
  }
  async function read(t, slot) {
    const d = await db(); if (!d) return null;
    try { return await timeout(reqP(d.transaction(STORE, 'readonly').objectStore(STORE).get(rkey(t, slot))), WAIT); }
    catch (e) { note('errors', `get ${slot}: ${e?.name || e}`); return null; }
  }
  return {
    off: false, stats, tree,
    // the data kept in slot under key, or null
    async get(slot, key) {
      try {
        const t = await tree;
        if (!t) { note('misses', `${slot}: store off`); return null; }
        const rec = await read(t, slot);
        if (!rec) { note('misses', `${slot}: none`); return null; }
        if (rec.v !== KEPT_FORMAT || rec.key !== key || rec.tree !== t || rec.data == null) { note('misses', `${slot}: ${rec.v !== KEPT_FORMAT ? 'format' : rec.tree !== t ? 'tree' : 'key'}`); return null; }
        if (t === 'src' && !(await depsHold(rec.deps))) { note('misses', `${slot}: scripts changed`); return null; }
        if (rec.sum !== sumOf(rec.data)) { note('misses', `${slot}: corrupt`); return null; }
        note('hits', slot);
        return rec.data;
      } catch (e) { note('errors', `get ${slot}: ${e?.name || e}`); return null; }
    },
    // keep data in slot under key (replacing what was there); deps: the scripts it was computed with (for 'src')
    async put(slot, key, data, deps) {
      try {
        const t = await tree;
        if (!t) return false;
        let dl = null;
        if (t === 'src') {
          if (!deps?.length) { note('errors', `put ${slot}: no scripts to key it by`); return false; }
          const hs = await Promise.all(deps.map(hashOf));
          if (hs.some((h) => h == null)) { note('errors', `put ${slot}: a script could not be read`); return false; }
          dl = deps.map((u, i) => [u, hs[i]]);
        }
        const d = await db(); if (!d) return false;
        const tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ v: KEPT_FORMAT, key, tree: t, deps: dl, at: Date.now(), sum: sumOf(data), data }, rkey(t, slot));
        const ok = await timeout(new Promise((res, rej) => { tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }), WAIT * 4, false);
        if (!ok) { note('errors', `put ${slot}: timed out`); return false; }
        note('puts', slot);
        return true;
      } catch (e) { note('errors', `put ${slot}: ${e?.name || e}`); return false; }
    },
    // delete every record made by another tree (another commit, or the scripts' text against a commit)
    async prune() {
      try {
        const t = await tree; if (!t) return 0;
        const d = await db(); if (!d) return 0;
        const t0 = performance.now();
        const st = d.transaction(STORE, 'readwrite').objectStore(STORE), all = st.getAllKeys(); // keys only: no record is read
        let n = 0;
        all.onsuccess = () => { for (const k of all.result) if (typeof k !== 'string' || !k.startsWith(t + '|')) { st.delete(k); n++; } };
        await timeout(new Promise((res, rej) => { st.transaction.oncomplete = () => res(); st.transaction.onerror = () => rej(st.transaction.error); }), WAIT * 4);
        stats.pruneMs = performance.now() - t0; stats.pruned = n;
        return n;
      } catch (e) { note('errors', `prune: ${e?.name || e}`); return 0; }
    },
  };
}

// ctx.kept(name, compute) (v13 L3): a module's own computed data (typed arrays and plain objects, nothing with
// methods or THREE in it) kept between visits. name: unique on the map ('rocks.place'); compute: () => data (or a
// promise of it). On a hit it returns the kept copy without calling compute; on a miss it computes, returns that, and
// keeps a snapshot taken at once, written straight away (later(fn) starts it and holds its promise). The key is the tier and the
// URL's switches; the tree (the commit, or the scripts' text) is the store's. A module must build the same from either.
export function keptHelper(store, { quality, search, later }) {
  const key = `${quality}|${queryKey(search)}`;
  const used = new Set();
  const live = store && !store.off;
  // kept.open(name) (v13 L4): the slot itself, for data that is only whole after the build has run (a height tape,
  // src/v13/tape.js): { data } on a hit, else { data: null }; keep(v) snapshots v at once and writes it straight away
  const open = async (name) => {
    if (used.has(name)) throw new Error(`ctx.kept: '${name}' asked for twice`);
    used.add(name);
    const slot = `kept:${name}:${quality}`, t0 = performance.now();
    const hit = live ? await store.get(slot, key) : null;
    const T = { name, getMs: performance.now() - t0 };
    (store.stats.timing ||= []).push(T);
    if (hit != null) { T.hit = true; return { data: hit, timing: T, keep: () => false }; }
    let kept = false;
    return {
      data: null, timing: T,
      keep(v) {
        if (kept || !live) return false;
        kept = true;
        const t2 = performance.now(), snap = structuredClone(v), deps = loadedScripts();
        T.snapMs = performance.now() - t2;
        later(() => store.put(slot, key, snap, deps));
        return true;
      },
    };
  };
  const kept = async (name, compute) => {
    const s = await open(name);
    if (s.data != null) return s.data;
    const t1 = performance.now();
    const v = await compute();
    s.timing.computeMs = performance.now() - t1;
    s.keep(v);
    return v;
  };
  kept.open = open;
  return kept;
}
