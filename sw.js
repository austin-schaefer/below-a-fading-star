// The service worker (v13-L1): a repeat visit is served from this browser's own copy of the release it last saw,
// and never from a mix of two releases. DEPLOY.md says how it ships and how to turn it off; tools/sw-test.mjs is
// its proof.
//
// The key is the commit. Netlify's build writes commit.json ({"commit":"<short hash>"}) and stamps every response
// with the same hash in `X-Fp-Commit` (the build's _headers). The worker keeps one cache per commit, `fp1-<commit>`,
// and files a response only under the commit its own header names, so no cache can hold a file from another release.
//
// - A navigation to the page asks the network for commit.json (no-store, 3 s). The same commit as a cache that holds
//   the page: the page and every file it asks for are served from that cache. Another commit: the page comes from
//   the network and the caches no open tab still uses are dropped. No answer (offline, the timeout): the newest
//   cache is served as it is. An answer without the stamp (a host that does not send it): every cache is dropped
//   and the worker passes everything through, as if it were not there.
// - Each page (client) is bound to the commit its page came from. A file the client asks for that its commit's
//   cache lacks is fetched; if its stamp is another commit (a deploy landed mid-load), it is fetched once more
//   past the HTTP cache, and if that is another commit too, the request fails and the page is told to reload
//   ('fp-stale'): it never runs a module from another release. The reload asks commit.json again and gets the
//   new release whole.
// - Kept: only full 200 same-origin answers (no 206, no redirect, no error) for the page, src/, vendor/ and the two
//   icons, whose stamp matches; never commit.json, sw.js, a query string, anything cross-origin (the fonts keep
//   to the HTTP cache). A fetch that fails or is cut off mid-body is not kept (cache.put rejects).
// - A first visit is not controlled (no clients.claim), so it is exactly as before. After it is ready, the page
//   sends the list of what it fetched ('fp-fill', from resource timing); the worker reads each from the HTTP cache
//   (force-cache: what the page itself got, with its stamp) and keeps those whose stamp is the page's own, so the
//   second visit is already served from here. Nothing is fetched from a list kept in this file.
// - ?sw=0 on any navigation: every fp cache is deleted and the worker unregisters (index.html does the same from
//   the page, and stays off in this browser until ?sw=1).
const V = 'fp1';
const META = `${V}-meta`;
const SCOPE = self.registration.scope; // ends in '/'
const BASE = new URL(SCOPE).pathname;
const PAGE = SCOPE; // index.html is kept under the scope's own URL, whatever the query
const STAMP = 'x-fp-commit';
const TIMEOUT = 3000;
const RECENT = 2000; // a binding younger than this is kept even before its client is listed
const LATER = 3000; // and the caches are looked at again this long after a navigation, once the tab it replaced is gone
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cacheName = (commit) => `${V}-${commit}`;
const bound = new Map(); // clientId → { commit (null: pass through), t }
let latest = null; // the commit of the newest cache, for an offline navigation
let loaded = null;
let stopped = false; // ?sw=0: nothing is written again by this worker
// what the worker did lately, for tools/sw-test.mjs and a person at a console ('fp-trace' below)
const trace = [];
const T = (...a) => { trace.push(`${Math.round(performance.now())} ${a.join(' ')}`); if (trace.length > 120) trace.shift(); };

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // a worker with another V does not read this V's caches, nor this one theirs
  for (const k of await caches.keys()) if (/^fp\d*-/.test(k) && !k.startsWith(`${V}-`)) await caches.delete(k);
})()));

// --- bindings, kept in the meta cache too, since the browser stops an idle worker and a page may import later
function loadMeta() {
  if (!loaded) loaded = (async () => {
    try {
      const r = await (await caches.open(META)).match(SCOPE + '__fp-meta');
      if (!r) return;
      const j = await r.json();
      if (latest == null) latest = j.latest ?? null;
      for (const [id, b] of Object.entries(j.bound || {})) if (!bound.has(id)) bound.set(id, b);
    } catch { /* an unreadable meta is an empty one */ }
  })();
  return loaded;
}
let saving = Promise.resolve();
function saveMeta() {
  if (stopped) return saving;
  saving = saving.then(async () => {
    const body = JSON.stringify({ latest, bound: Object.fromEntries(bound) });
    await (await caches.open(META)).put(SCOPE + '__fp-meta', new Response(body, { headers: { 'content-type': 'application/json' } }));
  }).catch(() => {});
  return saving;
}
function bind(id, commit) {
  if (id) bound.set(id, { commit, t: Date.now() });
  if (commit) latest = commit;
  return saveMeta();
}

// Drop every commit's cache that neither `keep` nor a live tab's binding names.
async function prune(keep) {
  if (stopped) return;
  const live = new Set((await self.clients.matchAll({ type: 'all', includeUncontrolled: true })).map((c) => c.id));
  const used = new Set(keep ? [keep] : []);
  for (const [id, b] of bound) {
    if (live.has(id) || Date.now() - b.t < RECENT) { if (b.commit) used.add(b.commit); } else bound.delete(id);
  }
  await saveMeta();
  for (const k of await caches.keys()) if (k.startsWith(`${V}-`) && k !== META && !used.has(k.slice(V.length + 1))) { T('drop', k, 'live', [...live].map((x) => x.slice(0, 4)).join()); await caches.delete(k); }
}
async function clearAll() {
  bound.clear(); latest = null;
  for (const k of await caches.keys()) if (/^fp\d*-/.test(k)) await caches.delete(k);
}

// --- what may be kept
function keepable(url) {
  if (url.origin !== location.origin || url.search || !url.pathname.startsWith(BASE)) return false;
  const p = url.pathname.slice(BASE.length);
  return p === '' || p === 'index.html' || p.startsWith('src/') || p.startsWith('vendor/') || p === 'favicon-32.png' || p === 'apple-touch-icon.png';
}
const isPage = (url) => url.origin === location.origin && (url.pathname === BASE || url.pathname === BASE + 'index.html');
const full = (r) => r && r.status === 200 && r.type === 'basic' && !r.redirected;
const stampOf = (r) => r.headers.get(STAMP);

async function netCommit() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(SCOPE + 'commit.json', { cache: 'no-store', signal: ctl.signal });
    if (!r.ok) return { kind: 'error' }; // the host answered, but not with a commit: pass through, keep the caches
    const j = await r.json();
    if (!j || !j.commit || stampOf(r) !== j.commit) return { kind: 'unstamped' };
    return { kind: 'commit', commit: String(j.commit) };
  } catch { return { kind: 'offline' }; } finally { clearTimeout(timer); }
}

async function fromCache(commit, key) {
  if (!commit || !(await caches.has(cacheName(commit)))) return null;
  return (await (await caches.open(cacheName(commit))).match(key)) || null;
}

// --- the page
async function navigate(event) {
  const req = event.request, id = event.resultingClientId;
  if (!id) return fetch(req); // no page will come of it (a download, say)
  const n = await netCommit();
  T('nav', id.slice(0, 4), n.kind, n.commit || '');
  let commit = null;
  if (n.kind === 'commit') commit = n.commit;
  else if (n.kind === 'offline') { await loadMeta(); commit = latest; }
  else {
    if (n.kind === 'unstamped') await clearAll();
    event.waitUntil(bind(id, null));
    return fetch(req);
  }
  const hit = await fromCache(commit, PAGE);
  if (hit) {
    event.waitUntil(bind(id, commit).then(() => prune(commit)).then(() => sleep(LATER)).then(() => prune(commit)));
    return hit;
  }
  let res = await fetch(req); // offline with no copy of the page: the browser's own error
  if (!full(res)) { event.waitUntil(bind(id, null)); return res; }
  let s = stampOf(res);
  if (n.kind === 'commit' && s !== commit) { // a page revalidated from the HTTP cache keeps its first stamp: ask past it
    const again = await fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).catch(() => null);
    if (full(again)) { res = again; s = stampOf(res); }
  }
  if (!s) { event.waitUntil(bind(id, null)); return res; }
  // the page's own stamp is its release, even if a deploy landed since commit.json answered
  const keep = res.clone();
  event.waitUntil(bind(id, s).then(async () => {
    await (await caches.open(cacheName(s))).put(PAGE, keep).catch(() => {});
    await prune(s);
    await sleep(LATER);
    await prune(s);
  }));
  return res;
}

// --- a file the page asks for
// Tell the page its release is gone (it reloads, index.html): the asking client, or, when a Worker asked, every
// window bound to the same commit.
async function sendRound(id, commit, why) {
  T('stale', id.slice(0, 4), why, commit);
  const c = await self.clients.get(id);
  const to = c && c.type === 'window' ? [c] : (await self.clients.matchAll({ type: 'window' })).filter((w) => bound.get(w.id)?.commit === commit || !commit);
  for (const w of to) w.postMessage({ type: 'fp-stale', commit, why });
  return Response.error();
}
async function file(event, url) {
  if (stopped) return fetch(event.request);
  await loadMeta();
  const b = bound.get(event.clientId);
  // a page this worker controls but cannot place (its binding lost with the browser's storage, say): its release is
  // unknown, so no file can be checked against it. Round it goes, rather than risk a file from another release.
  if (!b) return sendRound(event.clientId, null, url.pathname + ' from a page of unknown release');
  if (!b.commit) return fetch(event.request); // the deploy does not stamp: as if no worker were here
  const commit = b.commit, key = url.href;
  // a Worker's script: the Worker is a client of its own, of its page's release
  if (event.resultingClientId) event.waitUntil(bind(event.resultingClientId, commit));
  const hit = await fromCache(commit, key);
  if (hit) return hit;
  let res = await fetch(event.request);
  if (!full(res)) return res; // a 404, a 206, an error: served as it came, never kept
  if (stampOf(res) !== commit) {
    const again = await fetch(new Request(event.request, { cache: 'no-store' })).catch(() => null);
    // a deploy landed while this page was loading: this file is another release's. Fail it and send the page round.
    if (!full(again) || stampOf(again) !== commit) return sendRound(event.clientId, commit, `${url.pathname} is ${(again && stampOf(again)) || stampOf(res)}`);
    res = again;
  }
  const keep = res.clone();
  event.waitUntil(caches.open(cacheName(commit)).then((c) => c.put(key, keep)).catch(() => {}));
  return res;
}

// A browser that does not say which page a navigation makes (resultingClientId) cannot have its pages bound: the
// worker then answers nothing, and the site loads as if it were not there.
const BINDS = typeof FetchEvent !== 'undefined' && 'resultingClientId' in FetchEvent.prototype;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !BINDS) return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    if (url.searchParams.get('sw') === '0') {
      stopped = true;
      event.waitUntil(saving.then(clearAll).then(() => self.registration.unregister()));
      return; // to the network, as if no worker were here
    }
    if (isPage(url)) event.respondWith(navigate(event));
    return;
  }
  if (req.headers.has('range') || !keepable(url)) return;
  event.respondWith(file(event, url));
});

// --- messages from the page (index.html)
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'fp-commit' && event.ports[0]) {
    event.waitUntil(loadMeta().then(() => event.ports[0].postMessage({ commit: bound.get(event.source && event.source.id)?.commit || null })));
  } else if (d.type === 'fp-trace' && event.ports[0]) {
    event.ports[0].postMessage({ trace, latest, bound: [...bound].map(([id, b]) => `${id.slice(0, 4)}=${b.commit}`) });
  } else if (d.type === 'fp-fill' && Array.isArray(d.urls)) {
    event.waitUntil(fill(d.page, d.urls).then((n) => event.ports[0] && event.ports[0].postMessage(n)));
  }
});

// The first visit's files, read back from the HTTP cache: what the page got, kept only under the page's own stamp.
async function fill(page, urls) {
  const out = { kept: 0, skipped: 0, commit: null };
  try {
    const pu = new URL(page, SCOPE);
    if (!isPage(pu)) return out;
    const pr = await fetch(pu.href, { cache: 'force-cache', credentials: 'same-origin' });
    const commit = full(pr) && stampOf(pr);
    if (!commit) return out;
    out.commit = commit;
    const cache = await caches.open(cacheName(commit));
    if (!(await cache.match(PAGE))) await cache.put(PAGE, pr);
    const want = [...new Set(urls)].map((u) => { try { return new URL(u, SCOPE); } catch { return null; } }).filter((u) => u && keepable(u) && !isPage(u));
    await Promise.all(want.map(async (u) => {
      try {
        if (await cache.match(u.href)) { out.kept++; return; }
        const r = await fetch(u.href, { cache: 'force-cache', credentials: 'same-origin' });
        if (full(r) && stampOf(r) === commit) { await cache.put(u.href, r); out.kept++; } else out.skipped++;
      } catch { out.skipped++; }
    }));
    await loadMeta();
    if (!latest) { latest = commit; await saveMeta(); }
  } catch { /* a fill that fails leaves what it kept: each entry was checked on its own */ }
  return out;
}
