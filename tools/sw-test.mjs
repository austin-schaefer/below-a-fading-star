#!/usr/bin/env node
// The service worker's proof (v13-L1): no world, a site of a few files served from memory by tools/sw-site.mjs,
// whose commit the test switches between loads, and the real sw.js and the real registration script from index.html.
//   node tools/sw-test.mjs [port]     default 8166; about 25 s. FP_BROWSER=firefox|webkit runs it in that engine
//                                     (the steps that stop the worker through CDP are Chromium's and say so).
// Each module of the site, as it runs, checks its own release against the page's (window.__v) and writes any
// mismatch to localStorage 'fp-mixed': a module graph from two releases is the failure every check looks for.
// The checks: index.html's modulepreload list is in the static graph; a first visit registers, passes the probe and
// fills the cache from what it fetched; the second visit of that commit asks the network only for commit.json; a new
// commit shows whole on the next navigation, with one cache entry for the page whatever its query; a file identical
// in both releases revalidated by a 304, with and without the stamp, is not mistaken; a deploy landing mid-load, on a
// module and on the page itself, never mixes (one reload into the new release); a second refusal on that reload turns
// the worker off until the next commit, after which it comes back; two tabs on two commits each stay whole, the older
// tab's cache is kept while it lives and dropped after; two tabs on one commit keep their bindings through a stopped
// worker; a slow commit.json (past 1.5 s) and offline serve the last release whole; commit.json as HTML goes to the
// network; a first visit whose fill reads an older page files it under that page's commit; a cut-off or error answer
// is not kept; a Worker's imports are its page's release; bindings lost mean a reload, never a pass-through; another
// page in the scope (listen.html) gets the plain network; a host
// that stops stamping, and a replacement sw.js that removes itself, leave no worker and no cache; ?sw=0 likewise.
import { ANGLE } from './launch.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './sw-site.mjs';
let pw;
try { pw = await import('playwright'); }
catch { pw = (await import('node:module')).createRequire('/opt/node22/lib/node_modules/')('playwright'); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.argv[2] || 8166);
const B = `http://localhost:${PORT}`;
const ENGINE = process.env.FP_BROWSER || 'chromium';
const CDP = ENGINE === 'chromium';
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const register = indexHtml.match(/<script id="sw-register">[\s\S]*?<\/script>/)?.[0];
if (!register) { console.log('FAIL index.html has no <script id="sw-register">'); process.exit(1); }

let pass = 0, failN = 0, dumped = 0;
const check = (ok, what, detail = '') => { if (ok) pass++; else failN++; console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${detail ? ` (${detail})` : ''}`); };
const t0 = Date.now();

// --- no browser: every modulepreload in index.html is a file in the static graph from src/main.js
{
  const resolve = (from, spec) => (spec === 'three' ? 'vendor/three/three.module.js' : spec.startsWith('three/addons/') ? 'vendor/three/' + spec.slice(13) : posix.normalize(posix.join(posix.dirname(from), spec)));
  const graph = new Set(['src/main.js']), queue = ['src/main.js'];
  while (queue.length) {
    const f = queue.shift();
    for (const m of readFileSync(join(root, f), 'utf8').matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)) {
      const r = resolve(f, m[1] || m[2]);
      if (!graph.has(r)) { graph.add(r); queue.push(r); }
    }
  }
  const pre = [...indexHtml.matchAll(/<link rel="modulepreload" href="\.\/([^"]+)">/g)].map((m) => m[1]);
  check(pre.length > 0 && pre.every((p) => existsSync(join(root, p)) && graph.has(p)), 'each modulepreload in index.html exists and is in the static graph', pre.join(' '));
}

// --- the site: a page, a static graph of three modules (one identical in every release), one imported later, a Worker
const MIX = `const seen = (n, x) => { (window.__seen ||= []).push(n + ':' + x); if (x !== window.__v) { const m = JSON.parse(localStorage.getItem('fp-mixed') || '[]'); m.push(window.__v + ' page ran ' + n + ' of ' + x); localStorage.setItem('fp-mixed', JSON.stringify(m)); } };`;
const site = (v) => ({
  '/index.html': `<!doctype html><meta charset="utf-8"><title>${v}</title><script>window.__v = '${v}';</script>${register}<script type="module" src="./src/main.js"></script><body>`,
  '/src/main.js': `import { v as bv } from './b.js'; import { same } from './same.js';\n${MIX}\nconst v = '${v}'; seen('main', v); seen('b', bv); window.__same = same;\nwindow.loadLate = async () => { const m = await import('./late.js'); seen('late', m.v); return m.v; };\nconst q = new URL(location.href).searchParams;\nif (q.get('late') === '1') await window.loadLate();\nif (q.get('w') === '1') { const w = new Worker(new URL('./w.js', import.meta.url), { type: 'module' }); const got = await new Promise((r, no) => { w.onmessage = (e) => r(e.data); w.onerror = no; }); seen('w', got.w); seen('wb', got.wb); seen('wc', got.wc); (window.__fp_fill_extra ||= []).push(...got.files); }\ndocument.body.classList.add('ready'); window.__ready = true;\n`,
  '/src/b.js': `export const v = '${v}'; // ${'b'.repeat(4000)}\n`,
  '/src/same.js': `export const same = 'the same in every release';\n`,
  '/src/late.js': `export const v = '${v}';\n`,
  '/src/w.js': `import { v as wb } from './wb.js'; import { v as wc } from './wc.js'; postMessage({ w: '${v}', wb, wc, files: performance.getEntriesByType('resource').map((e) => e.name) });\n`,
  '/src/wb.js': `export const v = '${v}';\n`,
  '/src/wc.js': `export const v = '${v}';\n`,
  // a second page in the worker's scope that is not the walk's (listen.html, v17.1): its own module under src/
  '/listen.html': `<!doctype html><meta charset="utf-8"><title>other ${v}</title><script type="module" src="./src/other.js"></script><body>`,
  '/src/other.js': `window.__other = '${v}'; window.__got = await fetch('./src/same.js').then((r) => r.ok, () => false);\n`,
  '/commit.json': JSON.stringify({ commit: v }),
});
// a replacement sw.js that takes itself and its caches away (DEPLOY.md, "Turning it off")
const KILL = `self.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^fp\\d*-/.test(k)).map((k) => caches.delete(k)))).then(() => self.registration.unregister())));\n`;
let cur = 'aaaaaaa', stamped = true, swBody = null, down = false;
const cut = new Set(), fail = new Set(), html = new Set();
const holds = []; // { path, nth, arrived, release }: the nth request (by the server's count) for path waits
const srv = await serveSite({
  port: PORT,
  commit: () => (stamped ? cur : null),
  files: (p) => (p === '/sw.js' ? (swBody ?? readFileSync(join(root, 'sw.js'), 'utf8')) : site(cur)[p] ?? null),
  hooks: {
    async before(path, req, res, head) {
      if (down) { req.socket.destroy(); return true; }
      const h = holds.find((x) => x.path === path && x.nth === srv.counts.get(path));
      if (h) {
        await new Promise((r) => { h.go = r; h.arrive(); });
        holds.splice(holds.indexOf(h), 1);
        if (stamped) head['x-fp-commit'] = cur; else delete head['x-fp-commit'];
      }
      if (cut.has(path)) { // half the body, a full content-length, then the socket closed
        cut.delete(path);
        const body = Buffer.from(site(cur)[path]);
        res.writeHead(200, { ...head, 'content-type': 'application/javascript', 'content-length': body.length });
        res.write(body.subarray(0, body.length >> 1)); setTimeout(() => res.socket.destroy(), 50);
        return true;
      }
      if (fail.has(path)) { fail.delete(path); res.writeHead(500, head); res.end('boom'); return true; }
      if (html.has(path)) { html.delete(path); res.writeHead(200, { ...head, 'content-type': 'text/html' }); res.end('<!doctype html><title>not found</title>'); return true; }
      return false;
    },
  },
});
// hold(path, ahead = 1): the request for path `ahead` after the ones the server has seen waits; release() lets it go
const hold = (path, ahead = 1) => {
  const h = { path, nth: (srv.counts.get(path) || 0) + ahead };
  h.arrived = Promise.race([new Promise((r) => { h.arrive = r; }), new Promise((r, no) => setTimeout(() => no(new Error(`the held request for ${path} never came`)), 10000))]);
  h.release = () => h.go?.();
  holds.push(h);
  return h;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reqs = () => Object.fromEntries([...srv.counts].filter(([p]) => p !== '/favicon.ico'));
const reset = () => srv.counts.clear();
const onlyCheck = (c) => Object.keys(c).every((p) => p === '/commit.json' || p === '/sw.js') && c['/commit.json'] === 1;
const fmt = (c) => Object.entries(c).map(([p, n]) => `${p}×${n}`).join(' ') || 'none';
const traceOf = (page) => page.evaluate(() => new Promise((r) => { const w = navigator.serviceWorker.controller; if (!w) return r(null); const ch = new MessageChannel(); ch.port1.onmessage = (e) => r(e.data); w.postMessage({ type: 'fp-trace' }, [ch.port2]); setTimeout(() => r(null), 1000); })).catch(() => null);
// the worker's own log ('fp-trace' in sw.js), printed once after each new failure
const dump = async (page) => { if (failN > dumped) { dumped = failN; const t = await traceOf(page); if (t) console.log('  the worker\'s trace:\n  ' + [`latest ${t.latest}; proven ${t.proven}; bound ${t.bound.join(' ')}`, ...t.trace.slice(-30)].join('\n  ')); } };

// wait until the page shows release v whole (through reloads); returns what it saw
async function settle(page, v, ms = 8000) {
  const s0 = Date.now();
  let last = null;
  while (Date.now() - s0 < ms) {
    try {
      last = await page.evaluate(() => ({ v: window.__v, ready: !!window.__ready, seen: window.__seen || [], mixed: localStorage.getItem('fp-mixed'), controlled: !!navigator.serviceWorker.controller, sw: window.__fp_sw || null, url: location.href }));
      if (last.ready && last.v === v) return last;
    } catch { /* mid-navigation */ }
    await sleep(100);
  }
  return last;
}
const whole = (s, v, n = 2) => !!s && s.ready && s.v === v && !s.mixed && s.seen.length === (n === true ? 3 : n) && s.seen.every((x) => x.endsWith(':' + v));
const cachesOf = (page) => page.evaluate(async () => {
  const out = {};
  for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map((r) => { const u = new URL(r.url); return u.pathname + u.search; });
  return out;
});
const regsOf = (page) => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
const releases = (c) => Object.keys(c).filter((k) => /^fp1-(?!meta)/.test(k));
// a first visit in a context: registered, proven, filled
async function firstVisit(page, url, v) {
  await page.goto(url);
  const s = await settle(page, v);
  for (let i = 0; i < 80 && !(await page.evaluate(() => window.__fp_sw?.filled || window.__fp_sw?.proven === false).catch(() => false)); i++) await sleep(100);
  return { s, sw: await page.evaluate(() => window.__fp_sw) };
}

const browser = await pw[ENGINE].launch(ENGINE === 'chromium' ? { args: ['--use-gl=angle', `--use-angle=${ANGLE}`] } : {});
console.log(`sw-test in ${ENGINE}`);
try {
  // 1. a first visit: not controlled, registers, passes the probe, fills from what it fetched
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const U = `${B}/?sw=1&late=1`;
  let { s, sw } = await firstVisit(page, U, cur);
  check(whole(s, cur, true) && !s.controlled, 'first visit: whole and not controlled', s && s.seen.join(' '));
  check(sw?.proven === true, 'the worker\'s probe: this browser names the page a navigation makes', JSON.stringify(sw));
  let c = await cachesOf(page);
  check(sw?.filled?.commit === cur && sw.filled.kept >= 4, 'first visit: the worker kept what the page fetched, from the HTTP cache', JSON.stringify(sw?.filled));
  check((c[`fp1-${cur}`] || []).includes('/src/late.js') && !(c[`fp1-${cur}`] || []).some((p) => /commit\.json|probe/.test(p)), 'the cache holds the dynamic import, not commit.json or the probe', (c[`fp1-${cur}`] || []).join(' '));

  // 1b. another page in the scope (listen.html): the worker controls it but it is not the walk's page, so its files
  // under src/ and vendor/ come from the plain network: never an error, never the cache, never kept, twice over
  {
    const other = await ctx.newPage(), errs = [];
    other.on('pageerror', (e) => errs.push(e.message)); other.on('requestfailed', (r) => errs.push('failed ' + new URL(r.url()).pathname));
    for (const n of [1, 2]) {
      reset();
      await other.goto(`${B}/listen.html`);
      for (let i = 0; i < 30 && !(await other.evaluate(() => window.__other).catch(() => null)); i++) await sleep(100);
      const o = await other.evaluate(() => ({ v: window.__other || null, got: window.__got, controlled: !!navigator.serviceWorker.controller })), r = reqs();
      check(o.controlled && o.v === cur && o.got === true && errs.length === 0 && r['/src/other.js'] >= 1 && r['/src/same.js'] >= 1, `a page that is not the walk's, under the worker (visit ${n}): its module and its fetch come from the network`, `${JSON.stringify(o)} ${fmt(r)} ${errs.join(' ')}`);
    }
    const kept = (await cachesOf(page))[`fp1-${cur}`] || [];
    check(!kept.includes('/src/other.js') && !kept.includes('/listen.html'), 'and nothing of it is kept', kept.join(' '));
    await dump(other);
    await other.close();
  }

  // 2. the second visit of the same commit
  reset();
  await page.goto(`${B}/?sw=1&late=1&q=low&pos=1,2`);
  s = await settle(page, cur);
  let r = reqs();
  check(whole(s, cur, true) && s.controlled, 'second visit (another query): whole, controlled');
  check(onlyCheck(r), 'second visit: the network was asked for commit.json only (and sw.js)', fmt(r));
  check(/^[a-z]{7}$/.test(await page.evaluate(() => window.__fp_commit || '')), 'the page knows its commit from the worker (no fetch of its own)');

  // 3. a deploy: the next navigation is the new release, whole
  cur = 'bbbbbbb';
  reset();
  await page.goto(U);
  s = await settle(page, cur);
  r = reqs();
  check(whole(s, cur, true), 'after a deploy, the next navigation is the new release whole', s && s.seen.join(' '));
  // Chromium and Firefox revalidate it (a 304 with no stamp, so the worker asks again past the HTTP cache: twice);
  // WebKit's worker fetches it whole (once). Either way it must be this release's, which whole() checks.
  check((r['/src/same.js'] || 0) >= 1 && (r['/src/same.js'] || 0) <= 2 && whole(s, cur, true), 'a file the same in both releases, revalidated by a 304 without the stamp, is taken as this release only on its own stamp', fmt(r));
  await sleep(3300); // the worker looks again once the tab's previous page is gone (3 s)
  c = await cachesOf(page);
  check(!c['fp1-aaaaaaa'] && c['fp1-bbbbbbb']?.length >= 5 && c['fp1-bbbbbbb'].filter((p) => p.startsWith('/?') || p === '/').join() === '/', 'the old release\'s cache is dropped; the new one filled, the page kept once whatever its query', Object.keys(c).join(' ') + ': ' + (c['fp1-bbbbbbb'] || []).join(' '));
  srv.opts.stamp304 = true;
  cur = 'ccccccc';
  reset();
  await page.goto(U);
  s = await settle(page, cur);
  r = reqs();
  check(whole(s, cur, true) && (r['/src/same.js'] || 0) === 1, 'with a 304 that carries the stamp, the same file is asked once', fmt(r));
  srv.opts.stamp304 = false;
  reset();
  await page.goto(U);
  s = await settle(page, cur);
  check(whole(s, cur, true) && onlyCheck(reqs()), 'and the visit after that asks for commit.json only', fmt(reqs()));

  // 4. a deploy lands mid-load: a module of the static graph held while the commit changes
  cur = 'ddddddd';
  let h = hold('/src/b.js');
  const nav = page.goto(U).catch(() => {});
  await h.arrived;
  cur = 'eeeeeee';
  h.release();
  await nav;
  s = await settle(page, cur);
  check(whole(s, cur, true) && s.sw?.reloaded === 1 && !/fp-swr/.test(s.url), 'a deploy mid-load (on a module): one reload, the new release whole, the marker gone from the address', `${s && s.seen.join(' ')}; reloaded ${s?.sw?.reloaded}; ${s?.url}`);
  // the same, with the page itself held after commit.json answered
  cur = 'fffffff';
  h = hold('/index.html');
  const nav2 = page.goto(U).catch(() => {});
  await h.arrived;
  cur = 'ggggggg';
  h.release();
  await nav2;
  s = await settle(page, cur);
  check(whole(s, cur, true), 'a deploy between commit.json and the page: the page\'s own stamp binds it, whole', s && s.seen.join(' '));
  await dump(page);

  // 5. two tabs on two commits
  await page.goto(`${B}/?sw=1`); // this tab on ggggggg; its later import comes from the cache
  s = await settle(page, cur);
  const tab1 = await ctx.newPage();
  cur = 'hhhhhhh';
  await tab1.goto(`${B}/?sw=1`); // tab1 on hhhhhhh, late.js never fetched
  let s1 = await settle(tab1, cur);
  check(whole(s1, cur), 'tab two on the new commit, whole');
  c = await cachesOf(tab1);
  check(!!c['fp1-ggggggg'] && !!c['fp1-hhhhhhh'], 'tab one\'s cache is kept while it is open', Object.keys(c).join(' '));
  check(await page.evaluate(() => window.loadLate()) === 'ggggggg', 'tab one, importing later, gets its own release from its cache');
  cur = 'iiiiiii';
  const tab2 = await ctx.newPage();
  await tab2.goto(`${B}/?sw=1`);
  await settle(tab2, cur);
  await tab1.evaluate(() => window.loadLate().catch(() => 'refused')).catch(() => {});
  s1 = await settle(tab1, 'iiiiiii');
  check(whole(s1, 'iiiiiii'), 'a tab whose later import would be another release reloads into the new one, whole', s1 && `${s1.v} ${s1.seen.join(' ')}`);
  await dump(tab1);
  // two tabs on one commit, the worker stopped between: a navigation in one does not forget the other
  if (CDP) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    await cdp.send('ServiceWorker.stopAllWorkers');
    await sleep(200);
    await tab2.goto(`${B}/?sw=1`); // the restarted worker binds this navigation; tab1 (iiiiiii, no late.js yet) is still open
    await settle(tab2, cur);
    await sleep(2000); // both prunes
    const got = await tab1.evaluate(() => window.loadLate().catch(() => 'refused')).catch(() => 'reloaded');
    check(got === 'iiiiiii', 'two tabs on one commit, the worker stopped: a navigation in one keeps the other\'s binding and cache', got);
    await dump(tab2);
  } else console.log(`SKIP two tabs with the worker stopped (CDP's ServiceWorker.stopAllWorkers is Chromium's; ${ENGINE} has no way to stop it from here)`);
  await tab1.close(); await tab2.close();
  await page.goto(`${B}/?sw=1`);
  await settle(page, cur);
  await sleep(3300);
  c = await cachesOf(page);
  check(releases(c).join() === 'fp1-iiiiiii', 'once no tab uses an old commit, its cache is gone', Object.keys(c).join(' '));

  // 6. offline, and a commit.json slower than 1.5 s: the last release, whole
  down = true;
  await page.goto(`${B}/?sw=1`).catch(() => {});
  s = await settle(page, 'iiiiiii');
  check(whole(s, 'iiiiiii'), 'offline (the server gone): the cached release opens whole', s && s.seen.join(' '));
  down = false;
  h = hold('/commit.json');
  cur = 'jjjjjjj';
  await page.evaluate(() => { window.__ready = false; }); // so only the next page counts (Firefox keeps this one up meanwhile)
  const ts = Date.now();
  const nav3 = page.goto(`${B}/?sw=1`).catch(() => {});
  await h.arrived;
  s = await settle(page, 'iiiiiii', 6000);
  const took = Date.now() - ts;
  h.release();
  await nav3;
  check(whole(s, 'iiiiiii') && took >= 1400, 'commit.json past 1.5 s: the cached release, whole, after the timeout', `${took} ms`);
  await page.goto(`${B}/?sw=1`);
  s = await settle(page, cur);
  check(whole(s, cur), 'and the next navigation that hears commit.json is the new release', s && s.seen.join(' '));
  html.add('/commit.json');
  cur = 'kkkkkkk';
  await page.goto(`${B}/?sw=1`);
  s = await settle(page, cur);
  c = await cachesOf(page);
  check(whole(s, cur) && !!c['fp1-jjjjjjj'] && !c['fp1-kkkkkkk'], 'commit.json answered with HTML: the network for this visit, the caches kept', Object.keys(c).join(' '));

  // 7. a file cut off mid-body, and an error answer, are not kept
  cut.add('/src/b.js');
  await page.goto(`${B}/?sw=1&late=1`).catch(() => {});
  await sleep(1000);
  c = await cachesOf(page);
  let kept = c['fp1-kkkkkkk'] || [];
  check(kept.includes('/src/main.js') && !kept.includes('/src/b.js'), 'a file cut off mid-body is not kept (its neighbour is)', kept.join(' '));
  fail.add('/src/late.js');
  await page.goto(`${B}/?sw=1&late=1`).catch(() => {});
  await sleep(1000);
  c = await cachesOf(page);
  kept = c['fp1-kkkkkkk'] || [];
  check(kept.includes('/src/b.js') && !kept.includes('/src/late.js'), 'an error answer is not kept', kept.join(' '));
  await page.goto(`${B}/?sw=1&late=1`);
  s = await settle(page, cur);
  check(whole(s, cur, true), 'and the next load fetches them again and is whole', s && s.seen.join(' '));

  // 8. a Worker's own imports are of its page's release; the bindings outlive the worker being stopped
  cur = 'lllllll';
  await page.goto(`${B}/?sw=1&w=1`);
  s = await settle(page, cur);
  check(whole(s, cur, 5), 'a page whose Worker imports a module: the Worker is bound to the page\'s release, whole', s && s.seen.join(' '));
  if (CDP) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    await cdp.send('ServiceWorker.stopAllWorkers');
    await sleep(300);
    check(await page.evaluate(() => window.loadLate().catch(() => 'refused')) === 'lllllll', 'after the browser stops the worker, a later import still knows its page\'s release');
    // the bindings lost (the meta deleted and the worker stopped): a later import is refused and the page reloads
    await page.goto(`${B}/?sw=1&w=1`);
    await settle(page, cur);
    await page.evaluate(() => caches.delete('fp1-meta'));
    await cdp.send('ServiceWorker.stopAllWorkers');
    const navs = srv.counts.get('/commit.json') || 0; // each navigation asks it once
    const got = await page.evaluate(() => window.loadLate().catch(() => 'refused')).catch(() => 'refused');
    for (let i = 0; i < 30 && (srv.counts.get('/commit.json') || 0) === navs; i++) await sleep(100);
    await sleep(200);
    s = await settle(page, cur);
    check(got === 'refused' && (srv.counts.get('/commit.json') || 0) > navs && whole(s, cur, 5), 'a page whose release the worker cannot place gets no file from the network; it reloads, whole', `${got}, ${s && s.seen.join(' ')}`);
    await dump(page);
  } else console.log(`SKIP the worker stopped, the bindings lost (CDP is Chromium's; not run in ${ENGINE})`);

  // 9. the breaker: a reload the worker caused is refused again → the worker off until the next commit
  await page.goto(`${B}/?sw=1`); await settle(page, cur);
  const side = await ctx.newPage(); // another tab, open on this release while the first trips the breaker
  const sideV = cur;
  await side.goto(`${B}/?sw=1`); await settle(side, sideV);
  cur = 'mmmmmmm';
  const h1 = hold('/src/b.js'); // this load's b.js
  const h2 = hold('/src/b.js', 3); // after the re-ask past the HTTP cache, the reload's b.js
  const nav4 = page.goto(`${B}/?sw=1`).catch(() => {});
  await h1.arrived; cur = 'nnnnnnn'; h1.release();
  await h2.arrived; cur = 'ooooooo'; h2.release();
  await nav4;
  s = await settle(page, cur);
  await sleep(500);
  const flag = await page.evaluate(() => localStorage.getItem('fp-sw'));
  check(whole(s, cur) && !s.controlled && s.sw?.reloaded === 2 && (await regsOf(page)) === 0 && flag === 'fail:ooooooo', 'refused again on its reload: the worker unregisters, the page loads whole from the network, flagged off', `${s && s.seen.join(' ')}; reloaded ${s?.sw?.reloaded}; flag ${flag}`);
  let sl = await side.evaluate(() => window.loadLate().catch(() => 'refused')).catch(() => 'reloaded');
  let ss = await settle(side, sl === sideV ? sideV : cur);
  check((sl === sideV && whole(ss, sideV, true)) || whole(ss, cur), 'a second tab open through the trip keeps its own release or reloads into the new one, never both', `${sl}; ${ss && ss.v} ${ss && ss.seen.join(' ')}`);
  await side.close();
  await page.goto(`${B}/?sw=1`); await settle(page, cur); await sleep(400);
  check((await regsOf(page)) === 0, 'and on the same commit it stays off');
  cur = 'ppppppp';
  ({ s, sw } = await firstVisit(page, `${B}/?sw=1`, cur));
  check(whole(s, cur) && sw?.proven === true && (await regsOf(page)) === 1 && !(await page.evaluate(() => localStorage.getItem('fp-sw'))), 'a new commit clears the flag: registered and proven again', JSON.stringify(sw));

  // 10. a host that stops stamping: the worker deletes its caches and unregisters, as if never installed
  await page.goto(`${B}/?sw=1&late=1`); s = await settle(page, cur);
  stamped = false;
  await page.goto(`${B}/?sw=1&late=1`);
  s = await settle(page, cur);
  await sleep(500);
  c = await cachesOf(page);
  check(whole(s, cur, true) && (await regsOf(page)) === 0 && Object.keys(c).filter((k) => /^fp/.test(k)).length === 0, 'no stamp: the page loads from the network, no worker and no cache left', Object.keys(c).join(' '));
  await page.goto(`${B}/?sw=1`); await settle(page, cur); await sleep(400);
  check((await regsOf(page)) === 0, 'and with no stamp nothing registers again');
  stamped = true;

  // 11. a replacement sw.js that removes itself
  ({ s, sw } = await firstVisit(page, `${B}/?sw=1`, cur));
  await page.goto(`${B}/?sw=1`); s = await settle(page, cur);
  check(s?.controlled === true, 'stamped again: registered and controlling');
  swBody = KILL;
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r?.update(); });
  for (let i = 0; i < 30 && (await regsOf(page)) > 0; i++) await sleep(100);
  await sleep(2000); // past the old worker's last look at its caches
  c = await cachesOf(page);
  check((await regsOf(page)) === 0 && Object.keys(c).filter((k) => /^fp/.test(k)).length === 0, 'a sw.js that removes itself: on its update, no worker and no cache', Object.keys(c).join(' '));
  swBody = null;

  // 12. ?sw=0 leaves nothing behind
  ({ s, sw } = await firstVisit(page, `${B}/?sw=1`, cur));
  await page.goto(`${B}/?sw=1`); await settle(page, cur);
  const side2 = await ctx.newPage(); // a tab open on this release while another turns the worker off
  const side2V = cur;
  await side2.goto(`${B}/?sw=1`); await settle(side2, side2V);
  await page.goto(`${B}/?sw=0`);
  await sleep(800);
  await page.goto(`${B}/?q=1`);
  await sleep(500);
  const left = await page.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, keys: (await caches.keys()).filter((k) => /^fp/.test(k)), ctl: !!navigator.serviceWorker.controller }));
  check(left.regs === 0 && left.keys.length === 0 && !left.ctl, '?sw=0: no worker, no cache, the next load not controlled', JSON.stringify(left));
  cur = 'sssssss';
  sl = await side2.evaluate(() => window.loadLate().catch(() => 'refused')).catch(() => 'reloaded');
  ss = await settle(side2, cur);
  check(sl !== 'sssssss' && whole(ss, cur), 'after ?sw=0 in another tab and a deploy, an open tab\'s later import is refused, not mixed: it reloads whole', `${sl}; ${ss && ss.v} ${ss && ss.seen.join(' ')}`);
  await side2.close();
  check(!(await page.evaluate(() => localStorage.getItem('fp-mixed'))), 'no page ever ran a module of another release');
  await ctx.close();

  // 13. a first visit whose fill reads an older page than commit.json names: filed under the page's own commit
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  cur = 'qqqqqqq';
  const hc = hold('/commit.json'); // index.html's own check before it registers
  await p2.goto(`${B}/?sw=1&late=1`);
  await hc.arrived; cur = 'rrrrrrr'; hc.release();
  for (let i = 0; i < 80 && !(await p2.evaluate(() => window.__fp_sw?.filled || window.__fp_sw?.proven === false).catch(() => false)); i++) await sleep(100);
  const f2 = await p2.evaluate(() => window.__fp_sw?.filled);
  // Chromium and Firefox read the page's own files back from the HTTP cache (qqqqqqq); WebKit's worker does not share
  // that cache and fetches them anew (rrrrrrr). Either is filed under the stamp each file came with.
  const cq = await cachesOf(p2);
  check((f2?.commit === 'qqqqqqq' || f2?.commit === 'rrrrrrr') && (cq[`fp1-${f2.commit}`] || []).includes('/src/late.js') && releases(cq).length === 1, 'a fill after a deploy files what it read under the commit it came with', `${JSON.stringify(f2)} ${Object.keys(cq).join(' ')}`);
  await p2.goto(`${B}/?sw=1&late=1`);
  s = await settle(p2, cur);
  check(whole(s, cur, true) && s.controlled, 'and the next navigation is the newer release, whole', s && s.seen.join(' '));
  await ctx2.close();

  // 14. a worker registered but never proven (its first page closed before the probe answered): a controlled page proves it
  const ctx3 = await browser.newContext();
  const p4 = await ctx3.newPage();
  await p4.goto(`${B}/`); await settle(p4, cur);
  await p4.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready;
    for (let i = 0; i < 50 && reg.active?.state !== 'activated'; i++) await new Promise((r) => setTimeout(r, 50));
  });
  await p4.goto(`${B}/?sw=1&late=1`);
  s = await settle(p4, cur);
  for (let i = 0; i < 80 && !(await p4.evaluate(() => window.__fp_sw?.filled || window.__fp_sw?.proven === false).catch(() => false)); i++) await sleep(100);
  const sw4 = await p4.evaluate(() => window.__fp_sw);
  // Chromium and WebKit put the page under the unproven worker (the controlled path proves it); Firefox does not control
  // a page whose navigation the worker left alone, so the first-visit path proves it. Either way it ends proven.
  check(whole(s, cur, true) && sw4?.proven === true && sw4?.filled?.kept >= 4 && (s.controlled || ENGINE === 'firefox'), 'a worker registered but never proven: the next page proves it and fills it', JSON.stringify(sw4));
  reset();
  await p4.goto(`${B}/?sw=1&late=1`);
  s = await settle(p4, cur);
  check(whole(s, cur, true) && onlyCheck(reqs()), 'and the next visit asks for commit.json only', fmt(reqs()));
  await ctx3.close();

  // 15. a page that starts a module Worker importing two files: first visit, a controlled repeat, a new commit
  const ctx5 = await browser.newContext();
  const p5 = await ctx5.newPage();
  ({ s, sw } = await firstVisit(p5, `${B}/?sw=1&w=1`, cur));
  check(whole(s, cur, 5) && sw?.filled?.kept >= 6, 'a module Worker on a first visit: whole, and its own imports kept (the page passes on its resource list)', `${s && s.seen.join(' ')}; ${JSON.stringify(sw?.filled)}`);
  reset();
  await p5.goto(`${B}/?sw=1&w=1`);
  s = await settle(p5, cur);
  check(whole(s, cur, 5) && s.controlled && onlyCheck(reqs()), 'a controlled repeat: the page and its Worker\'s graph from the cache, the network asked for commit.json only', fmt(reqs()));
  cur = 'ttttttt';
  reset();
  await p5.goto(`${B}/?sw=1&w=1`);
  s = await settle(p5, cur);
  const wt = await traceOf(p5);
  check(whole(s, cur, 5) && (reqs()['/src/wb.js'] || 0) >= 1 && (reqs()['/src/wc.js'] || 0) >= 1, 'a new commit: the Worker\'s graph is all the new release, never mixed', `${s && s.seen.join(' ')}; ${fmt(reqs())}`);
  console.log(`  ${ENGINE}: Workers bound by their script's resultingClientId ${wt?.workers?.bound}, files fetched for a Worker without one ${wt?.workers?.fallback}`);
  await ctx5.close();

  // 16. a context with no ?sw=1 on localhost (every other test): nothing registers
  const plain = await browser.newContext();
  const p3 = await plain.newPage();
  await p3.goto(`${B}/`);
  await settle(p3, cur);
  await sleep(500);
  check((await regsOf(p3)) === 0, 'localhost without ?sw=1: no worker registered');
  await plain.close();
} catch (e) {
  failN++; console.log(`FAIL threw: ${e.message.split('\n')[0]}`);
} finally {
  await browser.close();
  await srv.close();
}
console.log(`sw-test (${ENGINE}): ${pass} passed, ${failN} failed, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failN ? 1 : 0);
