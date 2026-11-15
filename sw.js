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
// - A navigation to the page asks the network for commit.json (no-store, 3 s). The same commit as a cache that holds
//   the page: the page and every file it asks for are served from that cache. Another commit: the page comes from
//   the network and the caches no open tab still uses are dropped. No answer (offline, the timeout): the newest
//   cache as it is. An answer that is not a commit (an error, HTML): the network for this visit. A commit.json with
//   no stamp (a host that does not send it, or the stamp removed on purpose): every cache is deleted and the worker
//   unregisters itself, so it behaves as not installed; index.html registers only where the stamp is.
// - Each page (client) is bound to the commit its page came from. A file the client asks for that its commit's
//   cache lacks is fetched; if its stamp is another commit (a deploy landed mid-load), it is fetched once more past
//   the HTTP cache, and if that is another commit too, the request fails and the page is told to reload
//   ('fp-stale'): it never runs a module from another release. index.html allows one such reload per page; a
//   second turns the worker off. A page the worker cannot place (no binding) gets the same; a request with no
//   client at all passes through, unkept.
// - Kept: only full 200 same-origin answers (no 206, no redirect, no error) for the page, src/, vendor/ and the two
//   icons, whose stamp matches; never commit.json, sw.js, a query string, anything cross-origin (the fonts keep
//   to the HTTP cache). A fetch that fails or is cut off mid-body is not kept (cache.put rejects). The page is kept
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
const TIMEOUT = 3000;
const RECENT = 2000; // a binding younger than this is kept even before its client is listed
const LATER = 3000; // and the caches are looked at again this long after a navigation, once the tab it replaced is gone
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cacheName = (commit) => `${V}-${commit}`;
const bound = new Map(); // clientId → { commit (null: pass through), t }
let latest = null; // the commit of the newest cache, for an offline navigation
let proven = null; // true once the probe showed this browser binds pages; false if it showed it does not
let loaded = null, ready = false;
let stopped = false; // ?sw=0, or no stamp: nothing is written again by this worker
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
  for (const k of await caches.keys()) if (k.startsWith(`${V}-`) && k !== META && !used.has(k.slice(V.length + 1))) { T('drop', k); await caches.delete(k); }
}
async function clearAll() {
  bound.clear(); latest = null;
  for (const k of await caches.keys()) if (/^fp\d*-/.test(k)) await caches.delete(k);
}
// Stop for good: nothing kept, nothing answered, the registration gone (the page decides whether it comes back).
async function stop(why) {
  T('stop', why);
  stopped = true;
  await saving;
  await clearAll();
  await self.registration.unregister();
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
    if (stampOf(r) !== String(j.commit)) return { kind: 'unstamped' };
    return { kind: 'commit', commit: String(j.commit) };
  } finally { clearTimeout(timer); }
}

async function fromCache(commit, key) {
  if (!commit || !(await caches.has(cacheName(commit)))) return null;
  return (await (await caches.open(cacheName(commit))).match(key)) || null;
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
    const again = await fetch(req.url, { cache: 'no-store', credentials: 'same-origin' }).catch(() => null);
    if (!full(again)) { event.waitUntil(bind(id, null)); return res; } // not sure which release this page is: the network
    res = again; s = stampOf(res);
  }
  if (!s) { event.waitUntil(bind(id, null)); return res; }
  // the page's own stamp is its release, even if a deploy landed since commit.json answered
  const keep = res.clone();
  event.waitUntil(bind(id, s).then(async () => {
    if (!gone()) await (await caches.open(cacheName(s))).put(PAGE, keep).catch(() => {});
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
  if (!event.clientId) return fetch(event.request); // no page to bind or to send round: through, unkept
  const b = bound.get(event.clientId);
  // a page this worker controls but cannot place (its binding lost with the browser's storage, say): its release is
  // unknown, so no file can be checked against it. Round it goes, rather than risk a file from another release.
  if (!b) return sendRound(event.clientId, null, url.pathname + ' from a page of unknown release');
  if (!b.commit) return fetch(event.request); // this page's release is unknown to the network too: as if no worker
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
  if (!gone()) event.waitUntil(caches.open(cacheName(commit)).then((c) => c.put(key, keep)).catch(() => {}));
  return res;
}

// The probe: index.html opens a hidden frame on PROBE once the worker is active. Its navigation's resultingClientId is
// noted; the frame's page (answered here, no network) says hello from its own client. The same id: this browser
// binds pages, and the worker may answer them. Anything else, or nothing: it never will.
const PROBE_PAGE = '<!doctype html><meta charset="utf-8"><script>var w=navigator.serviceWorker&&navigator.serviceWorker.controller;if(w)w.postMessage({type:"fp-hello"});</script>';

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || stopped) return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
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
  event.respondWith(loadMeta().then(() => (proven === true && !stopped ? file(event, url) : fetch(req))));
});

// --- messages from the page (index.html) and the probe
self.addEventListener('message', (event) => {
  const d = event.data || {};
  const reply = (v) => event.ports[0] && event.ports[0].postMessage(v);
  if (d.type === 'fp-off') { stopped = true; T('off from the page'); return; } // the page unregisters this worker
  if (d.type === 'fp-hello') {
    event.waitUntil(loadMeta().then(() => {
      const ok = !!(event.source && probes.has(event.source.id));
      if (proven !== true) proven = ok; // once proven, a stray hello does not unprove it
      T('hello', ok);
      return saveMeta();
    }));
  } else if (d.type === 'fp-proof') {
    event.waitUntil(loadMeta().then(() => reply({ proven })));
  } else if (d.type === 'fp-commit') {
    event.waitUntil(loadMeta().then(() => reply({ commit: bound.get(event.source && event.source.id)?.commit || null })));
  } else if (d.type === 'fp-trace') {
    reply({ trace, latest, proven, bound: [...bound].map(([id, b]) => `${id.slice(0, 4)}=${b.commit}`) });
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
