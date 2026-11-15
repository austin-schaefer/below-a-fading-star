// The kept store (v13 L3): what the load computed, kept in IndexedDB for the next visit, so a repeat load can skip it.
// No THREE and no DOM: the page and the bake's worker both use it. Nothing here may make a visit wrong or slower:
// every miss, error, refusal, private window, timeout or version skew answers "not kept", and the caller computes.
//
// A record lives in one slot (a short name: 'bake:low', 'kept:rocks:low') and carries the key it was made under. The
// key is the caller's string (the tier, the URL's switches: queryKey()) and the tree, what the code was:
//   - 'commit:<sha>' where commit.json (the Netlify build's, and build-artifact.mjs's) names one: the same commit
//     runs the same code, so the record holds;
//   - 'src' where it does not (tools/serve.sh, a local copy): the record lists every script the computing context had
//     loaded with a hash of its text, and holds only while each of them still hashes the same (they are fetched
//     again to check, once a load each). A test's fresh browser context starts with an empty store either way.
// A put replaces whatever was in its slot (so an old key is gone); prune() deletes every record of another tree.
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
      r.onsuccess = () => res(r.result);
      r.onerror = () => { note('errors', `open: ${r.error?.name || r.error}`); res(null); };
      r.onblocked = () => { note('errors', 'open: blocked'); res(null); };
    } catch (e) { note('errors', `open: ${e?.name || e}`); res(null); }
  }), WAIT).then((d) => { if (!d) note('errors', 'open: no database (timed out or refused)'); return d; }));
  const tree = (async () => {
    try {
      const r = await timeout(fetch(new URL('commit.json', base), { cache: 'no-store' }), WAIT);
      if (r && r.ok) { const j = await r.json(); if (j && typeof j.commit === 'string' && j.commit) return `commit:${j.commit}`; }
    } catch { /* no commit.json: the scripts' own text decides */ }
    return 'src';
  })();
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
  async function read(slot) {
    const d = await db(); if (!d) return null;
    try { return await timeout(reqP(d.transaction(STORE, 'readonly').objectStore(STORE).get(slot)), WAIT); }
    catch (e) { note('errors', `get ${slot}: ${e?.name || e}`); return null; }
  }
  return {
    off: false, stats, tree,
    // the data kept in slot under key, or null
    async get(slot, key) {
      try {
        const rec = await read(slot);
        if (!rec) { note('misses', `${slot}: none`); return null; }
        const t = await tree;
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
        let dl = null;
        if (t === 'src') {
          if (!deps?.length) { note('errors', `put ${slot}: no scripts to key it by`); return false; }
          const hs = await Promise.all(deps.map(hashOf));
          if (hs.some((h) => h == null)) { note('errors', `put ${slot}: a script could not be read`); return false; }
          dl = deps.map((u, i) => [u, hs[i]]);
        }
        const d = await db(); if (!d) return false;
        const tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ v: KEPT_FORMAT, key, tree: t, deps: dl, at: Date.now(), sum: sumOf(data), data }, slot);
        await timeout(new Promise((res, rej) => { tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }), WAIT * 4, false);
        note('puts', slot);
        return true;
      } catch (e) { note('errors', `put ${slot}: ${e?.name || e}`); return false; }
    },
    // delete every record made by another tree (another commit, or the scripts' text against a commit)
    async prune() {
      try {
        const t = await tree, d = await db(); if (!d) return 0;
        const tx = d.transaction(STORE, 'readwrite'), cur = tx.objectStore(STORE).openCursor();
        let n = 0;
        cur.onsuccess = () => {
          const c = cur.result; if (!c) return;
          const rec = c.value;
          if (!rec || rec.v !== KEPT_FORMAT || rec.tree !== t) { c.delete(); n++; }
          c.continue();
        };
        await timeout(new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }), WAIT * 4);
        return n;
      } catch (e) { note('errors', `prune: ${e?.name || e}`); return 0; }
    },
  };
}

// ctx.kept(name, compute) (v13 L3): a module's own computed data (typed arrays and plain objects, nothing with
// methods or THREE in it) kept between visits. name: unique on the map ('rocks.place'); compute: () => data (or a
// promise of it). On a hit it returns the kept copy without calling compute; on a miss it computes, returns that, and
// keeps a snapshot taken at once, written once the walk is ready (later(fn) queues it). The key is the tier and the
// URL's switches; the tree (the commit, or the scripts' text) is the store's. A module must build the same from either.
export function keptHelper(store, { quality, search, later }) {
  const key = `${quality}|${queryKey(search)}`;
  const used = new Set();
  const kept = async (name, compute) => {
    if (used.has(name)) throw new Error(`ctx.kept: '${name}' asked for twice`);
    used.add(name);
    const slot = `kept:${name}:${quality}`;
    const hit = store && !store.off ? await store.get(slot, key) : null;
    if (hit != null) return hit;
    const v = await compute();
    if (store && !store.off) {
      const snap = structuredClone(v), deps = loadedScripts();
      later(() => store.put(slot, key, snap, deps));
    }
    return v;
  };
  return kept;
}
