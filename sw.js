// The service worker (v13-L1): a repeat visit is served from this browser's own copy of the release it last saw,
// and never from a mix of two releases. DEPLOY.md says how it ships and how to turn it off; tools/sw-test.mjs is
// its proof.
//
// The key is the commit. Netlify's build writes commit.json ({"commit":"<short hash>"}) and stamps every response
// with the same hash in `X-Fp-Commit` (the build's _headers). The worker keeps one cache per commit, `fp1-<commit>`,
// and files a response only under the commit its own header names, so no cache can hold a file from another release.
//
// - Proven first. Until this browser has shown that it names the page a navigation makes (the probe below), the
//   worker answers nothing: a browser that cannot bind pages gets the site as if no worker were there, and the page
//   unregisters it for good (index.html).
// - A navigation to the page asks the network for commit.json (no-store, 1.5 s). The same commit as a cache that holds
//   the page: the page and every file it asks for are served from that cache. Another commit: the page comes from
//   the network and the caches no open tab still uses are dropped. No answer (offline, the timeout): the newest
//   cache as it is. An answer that is not a commit (an error, HTML, a stamp that disagrees with the body): the
//   network for this visit. A commit.json with no stamp (a host that does not send it, or the stamp removed on
//   purpose): every cache is deleted and the worker unregisters itself; pages it already serves keep their own
//   release (each file checked) until they go, new ones get the plain network; index.html registers only where the
//   stamp is.
// - Each page (client) is bound to the commit its page came from. A file the client asks for that its commit's
//   cache lacks is fetched; if its stamp is another commit (a deploy landed mid-load), it is fetched once more past
//   the HTTP cache, and if that is another commit too, the request fails and the page is told to reload
//   ('fp-stale'): it never runs a module from another release. index.html allows one such reload per page; a
//   second turns the worker off. A page the worker cannot place (no binding) gets the same; a request with no
//   client at all passes through, unkept.
// - Kept: only full 200 same-origin answers (no 206, no redirect, no error) for the page, src/, vendor/ and the two
//   icons, whose stamp matches; never commit.json, sw.js, a query string, anything cross-origin (there is none: the
//   type is vendor/fonts/). A fetch that fails or is cut off mid-body is not kept (cache.put rejects). The page is kept
//   once, under the scope's URL, whatever its query.
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
const PROBE = BASE + '__fp-probe';
const STAMP = 'x-fp-commit';
const TIMEOUT = 1500;
const RECENT = 2000; // a binding younger than this is kept even before its client is listed
const LATER = 3000; // and the caches are looked at again this long after a navigation, once the tab it replaced is gone
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cacheName = (commit) => `${V}-${commit}`;
const bound = new Map(); // clientId → { commit (null: pass through), t }
let latest = null; // the commit of the newest cache, for an offline navigation
let proven = null; // true once the probe showed this browser binds pages; false if it showed it does not
let loaded = null, ready = false;
// ?sw=0, no stamp, or the page's breaker: no navigation is answered again and nothing is written; a page already
// bound keeps its own release (each file still checked against it) until it goes, so no open tab can mix
let stopped = false;
// replaced by a newer sw.js (say, one that removes itself): this one writes nothing more either
const gone = () => stopped || (self.serviceWorker && self.serviceWorker.state === 'redundant');
const probes = new Set(); // client ids the probe's navigations made
// what the worker did lately, for tools/sw-test.mjs and a person at a console ('fp-trace' below)
const trace = [];
const T = (...a) => { trace.push(`${Math.round(performance.now())} ${a.join(' ')}`); if (trace.length > 120) trace.shift(); };

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  // a worker with another V does not read this V's caches, nor this one theirs
  for (const k of await caches.keys()) if (/^fp\d*-/.test(k) && !k.startsWith(`${V}-`)) await caches.delete(k);
})()));

// --- the meta: bindings, the newest commit, the proof. Kept in a cache, since the browser stops an idle worker and
// a page may import later; read before anything is written, so a restarted worker never writes over what it forgot.
function loadMeta() {
  if (!loaded) loaded = (async () => {
    try {
      const r = (await caches.has(META)) ? await (await caches.open(META)).match(SCOPE + '__fp-meta') : null; // opening would make it
      if (r) {
        const j = await r.json();
        if (latest == null) latest = j.latest ?? null;
        if (proven == null) proven = j.proven ?? null;
        for (const [id, b] of Object.entries(j.bound || {})) if (!bound.has(id)) bound.set(id, b);
      }
    } catch { /* an unreadable meta is an empty one */ }
    // the meta lost but a release's cache still here: only a proven worker fills one, so it was proven (and its pages,
    // now unknown, are sent round rather than passed through)
    if (proven == null) { try { if ((await caches.keys()).some((k) => k.startsWith(`${V}-`) && k !== META)) proven = true; } catch { /* */ } }
    ready = true;
  })();
  return loaded;
}
loadMeta();
let saving = Promise.resolve();
function saveMeta() {
  if (gone()) return saving;
  saving = saving.then(async () => {
    if (gone()) return;
    const body = JSON.stringify({ latest, proven, bound: Object.fromEntries(bound) });
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
  await loadMeta();
  if (gone()) return;
  const live = new Set((await self.clients.matchAll({ type: 'all', includeUncontrolled: true })).map((c) => c.id));
  const used = new Set(keep ? [keep] : []);
  for (const [id, b] of bound) {
    if (live.has(id) || Date.now() - b.t < RECENT) { if (b.commit) used.add(b.commit); } else bound.delete(id);
  }
  await saveMeta();
  for (const k of await caches.keys()) if (k.startsWith(`${V}-`) && k !== META && !used.has(k.slice(V.length + 1))) { T('drop', k); opened.delete(k); await caches.delete(k); }
}
async function clearAll() {
  latest = null;
  opened.clear();
  for (const k of await caches.keys()) if (/^fp\d*-/.test(k)) await caches.delete(k);
}
// Stop for good: nothing kept, no new page answered, the registration gone (the page decides whether it comes back).
// The bindings stay in memory: an open page's later files come from the network only if their stamp is its own
// release; any other and it is sent round, to a reload the unregistered worker no longer controls.
let puts = 0;
async function stop(why) {
  T('stop', why);
  stopped = true;
  await saving;
  await clearAll();
  await self.registration.unregister();
  for (let i = 0; i < 50 && puts > 0; i++) await sleep(20); // a put already under way could make a cache again
  await clearAll();
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
  let r;
  try { r = await fetch(SCOPE + 'commit.json', { cache: 'no-store', signal: ctl.signal }); }
  catch { clearTimeout(timer); return { kind: 'offline' }; }
  try {
    if (!r.ok) return { kind: 'error' }; // the host answered, but not with a commit: the network, the caches kept
    let j;
    try { j = JSON.parse(await r.text()); } catch (e) { return e && e.name === 'AbortError' ? { kind: 'offline' } : { kind: 'error' }; }
    if (!j || !j.commit) return { kind: 'error' };
    const st = stampOf(r);
    if (!st) return { kind: 'unstamped' }; // the stamp removed: the kill switch
    if (st !== String(j.commit)) return { kind: 'error' }; // a stamp that disagrees with the body: the network, this visit

    return { kind: 'commit', commit: String(j.commit) };
  } finally { clearTimeout(timer); }
}

const opened = new Map(); // cache name → open cache (forgotten when caches are deleted)
const workers = { bound: 0, fallback: 0 }; // Workers bound by their script's resultingClientId, and files fetched without one
const direct = new Set(); // commits whose files are fetched past the HTTP cache (its 304s came back without a stamp)
async function fromCache(commit, key) {
  if (!commit) return null;
  const name = cacheName(commit);
  let c = opened.get(name);
  if (!c) { if (!(await caches.has(name))) return null; c = await caches.open(name); opened.set(name, c); }
  return (await c.match(key)) || null;
}
function keepIn(commit, key, res) {
  if (gone()) return Promise.resolve();
  puts++;
  return caches.open(cacheName(commit)).then((c) => c.put(key, res)).catch(() => {}).finally(() => { puts--; });
}

// --- the page
async function navigate(event) {
  const req = event.request, id = event.resultingClientId;
  if (!id) return fetch(req); // no page will come of it
  const n = await netCommit();
  T('nav', id.slice(0, 4), n.kind, n.commit || '');
  let commit = null;
  if (n.kind === 'commit') commit = n.commit;
  else if (n.kind === 'offline') commit = latest;
  else if (n.kind === 'unstamped') { event.waitUntil(stop('commit.json carries no stamp')); return fetch(req); }
  else { event.waitUntil(bind(id, null)); return fetch(req); }
  const hit = await fromCache(commit, PAGE);
  if (hit) {
    event.waitUntil(bind(id, commit).then(() => prune(commit)).then(() => sleep(LATER)).then(() => prune(commit)));
    return hit;
  }
  let res = await fetch(req); // offline with no copy of the page: the browser's own error
  if (!full(res)) { event.waitUntil(bind(id, null)); return res; }
  let s = stampOf(res);
  if (n.kind === 'commit' && s !== commit) { // a page revalidated from the HTTP cache keeps its first stamp: ask past it
    const again = await fetch(req.url, { cache: 'reload', credentials: 'same-origin' }).catch(() => null);
    if (!full(again)) { event.waitUntil(bind(id, null)); return res; } // not sure which release this page is: the network
    res = again; s = stampOf(res);
  }
  if (!s) { event.waitUntil(bind(id, null)); return res; }
  // the page's own stamp is its release, even if a deploy landed since commit.json answered
  const keep = res.clone();
  event.waitUntil(bind(id, s).then(async () => {
    await keepIn(s, PAGE, keep);
    await prune(s);
    await sleep(LATER);
    await prune(s);
  }));
  return res;
}

// --- a file the page asks for
// Tell the page its release is gone (it reloads, index.html): the asking window, or, when a Worker asked, every
// window bound to the same commit. A client of no known commit that is not a window is told nothing.
async function sendRound(id, commit, why) {
  T('stale', id.slice(0, 4), why, commit);
  const c = await self.clients.get(id);
  const to = c && c.type === 'window' ? [c] : commit ? (await self.clients.matchAll({ type: 'window' })).filter((w) => bound.get(w.id)?.commit === commit) : [];
  for (const w of to) w.postMessage({ type: 'fp-stale', commit, why });
  return Response.error();
}
async function file(event, url) {
  if (!event.clientId) return fetch(event.request); // no page to bind or to send round (the probe shows pages have one)
  const b = bound.get(event.clientId);
  // a page this worker controls but cannot place (its binding lost with the browser's storage, say): its release is
  // unknown, so no file can be checked against it. Round it goes, rather than risk a file from another release.
  if (!b) {
    // a dedicated Worker the browser gave no binding (no resultingClientId on its script): its files come from the
    // network, kept nowhere, and only if their stamp is the newest release this worker knows; else they fail
    const c = await self.clients.get(event.clientId);
    if (c && c.type !== 'window') {
      workers.fallback++;
      const r = await fetch(new Request(event.request, { cache: 'reload' })).catch(() => null);
      return full(r) && latest && stampOf(r) === latest ? r : Response.error();
    }
    return sendRound(event.clientId, null, url.pathname + ' from a page of unknown release');
  }
  if (!b.commit) return fetch(event.request); // this page's release is unknown to the network too: as if no worker
  const commit = b.commit, key = url.href;
  // a Worker's script: the Worker is a client of its own, of its page's release
  if (event.resultingClientId) { workers.bound++; event.waitUntil(bind(event.resultingClientId, commit)); }
  const hit = await fromCache(commit, key);
  if (hit) return hit;
  // Once this release has shown that the host's 304s carry no stamp, its other files are fetched whole at once
  // ('reload' also refreshes the HTTP cache): one request each, not a conditional one and then a whole one.
  let res = await fetch(direct.has(commit) ? new Request(event.request, { cache: 'reload' }) : event.request);
  if (!full(res)) return res; // a 404, a 206, an error: served as it came, never kept
  if (stampOf(res) !== commit) {
    const again = await fetch(new Request(event.request, { cache: 'reload' })).catch(() => null);
    // a deploy landed while this page was loading: this file is another release's. Fail it and send the page round.
    if (!full(again) || stampOf(again) !== commit) return sendRound(event.clientId, commit, `${url.pathname} is ${(again && stampOf(again)) || stampOf(res)}`);
    direct.add(commit);
    res = again;
  }
  event.waitUntil(keepIn(commit, key, res.clone()));
  return res;
}

// The probe: index.html opens a hidden frame on PROBE once the worker is active. Its navigation's resultingClientId is
// noted; the frame's page (answered here, no network) says hello from its own client. The same id: this browser
// binds pages, and the worker may answer them. Anything else, or nothing: it never will.
// The page also fetches PROBE-sub, so the proof covers its files carrying its clientId too.
const PROBE_PAGE = '<!doctype html><meta charset="utf-8"><script>var w=navigator.serviceWorker&&navigator.serviceWorker.controller;if(w)fetch("./__fp-probe-sub",{cache:"no-store"}).then(function(){w.postMessage({type:"fp-hello"});},function(){w.postMessage({type:"fp-hello"});});</script>';
const subs = new Set(); // client ids PROBE-sub was fetched by

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname === PROBE + '-sub' && req.mode !== 'navigate') {
    if (event.clientId) subs.add(event.clientId);
    event.respondWith(new Response('', { headers: { 'cache-control': 'no-store' } }));
    return;
  }
  if (req.mode === 'navigate') {
    if (stopped) { if (event.resultingClientId) bound.set(event.resultingClientId, { commit: null, t: Date.now() }); return; } // a page after the stop: the plain network
    if (url.origin === location.origin && url.pathname === PROBE) {
      if (event.resultingClientId) probes.add(event.resultingClientId);
      T('probe', (event.resultingClientId || 'none').slice(0, 4));
      event.respondWith(new Response(PROBE_PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } }));
      return;
    }
    if (url.searchParams.get('sw') === '0') { event.waitUntil(stop('?sw=0')); return; } // to the network, as if no worker were here
    if (!isPage(url)) return;
    if (ready && proven !== true) return;
    event.respondWith(loadMeta().then(() => (proven === true && !stopped ? navigate(event) : fetch(req))));
    return;
  }
  if (req.headers.has('range') || !keepable(url)) return;
  if (ready && proven !== true) return;
  event.respondWith(loadMeta().then(() => (proven === true ? file(event, url) : fetch(req))));
});

// --- messages from the page (index.html) and the probe
self.addEventListener('message', (event) => {
  const d = event.data || {};
  const reply = (v) => event.ports[0] && event.ports[0].postMessage(v);
  if (d.type === 'fp-off') { stopped = true; T('off from the page'); return; } // the page unregisters this worker
  if (d.type === 'fp-hello') {
    event.waitUntil(loadMeta().then(() => {
      const ok = !!(event.source && probes.has(event.source.id) && subs.has(event.source.id));
      if (proven !== true) proven = ok; // once proven, a stray hello does not unprove it
      T('hello', ok);
      return saveMeta();
    }));
  } else if (d.type === 'fp-proof') {
    event.waitUntil(loadMeta().then(() => reply({ proven })));
  } else if (d.type === 'fp-commit') {
    event.waitUntil(loadMeta().then(() => reply({ commit: bound.get(event.source && event.source.id)?.commit || null })));
  } else if (d.type === 'fp-trace') {
    reply({ trace, latest, proven, workers, bound: [...bound].map(([id, b]) => `${id.slice(0, 4)}=${b.commit}`) });
  } else if (d.type === 'fp-fill' && Array.isArray(d.urls)) {
    event.waitUntil(loadMeta().then(() => (proven === true && !stopped ? fill(d.page, d.urls) : { kept: 0, skipped: 0, commit: null, proven })).then(reply));
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
    if (!latest) { latest = commit; await saveMeta(); }
  } catch { /* a fill that fails leaves what it kept: each entry was checked on its own */ }
  return out;
}
