#!/usr/bin/env node
// The service worker's proof (v13-L1): no world, a site of a few files served from memory by tools/sw-site.mjs,
// whose commit the test switches between loads, and the real sw.js and the real registration script from index.html.
//   node tools/sw-test.mjs [port]     default 8166; about 20 s
// Each module of the site, as it runs, checks its own release against the page's (window.__v) and writes any
// mismatch to localStorage 'fp-mixed': a module graph from two releases is the failure every check below looks for.
// The checks: a first visit registers and fills the cache from what it fetched; the second visit of that commit
// asks the network only for commit.json (and the browser's sw.js update check); a new commit shows whole on the next
// navigation; a file identical in both releases (revalidated by a 304 that carries no stamp) is not mistaken for
// the old one; a deploy landing mid-load, on a module and on the page itself, never mixes (the worker refuses the
// file, the page reloads into the new release); two tabs on two commits each stay whole, the older tab's cache is
// kept while it lives and dropped after; offline serves the last release whole; a file cut off mid-body or an error
// answer is not kept; a host that stops stamping makes the worker drop its caches and step aside; ?sw=0 leaves no
// worker and no cache behind.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './sw-site.mjs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = (await import('node:module')).createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.argv[2] || 8166);
const B = `http://localhost:${PORT}`;
const register = readFileSync(join(root, 'index.html'), 'utf8').match(/<script id="sw-register">[\s\S]*?<\/script>/)?.[0];
if (!register) { console.log('FAIL index.html has no <script id="sw-register">'); process.exit(1); }

// --- the site: a page, a static graph of three modules (one identical in every release), one imported later
const MIX = `const seen = (n, x) => { (window.__seen ||= []).push(n + ':' + x); if (x !== window.__v) { const m = JSON.parse(localStorage.getItem('fp-mixed') || '[]'); m.push(window.__v + ' page ran ' + n + ' of ' + x); localStorage.setItem('fp-mixed', JSON.stringify(m)); } };`;
const site = (v) => ({
  '/index.html': `<!doctype html><meta charset="utf-8"><title>${v}</title><script>window.__v = '${v}';</script>${register}<script type="module" src="./src/main.js"></script><body>`,
  '/src/main.js': `import { v as bv } from './b.js'; import { same } from './same.js';\n${MIX}\nconst v = '${v}'; seen('main', v); seen('b', bv); window.__same = same;\nwindow.loadLate = async () => { const m = await import('./late.js'); seen('late', m.v); return m.v; };\nif (new URL(location.href).searchParams.get('late') === '1') await window.loadLate();\nconst q = new URL(location.href).searchParams;\nif (q.get('w') === '1') { const w = new Worker(new URL('./w.js', import.meta.url), { type: 'module' }); const got = await new Promise((r, no) => { w.onmessage = (e) => r(e.data); w.onerror = no; }); seen('w', got.w); seen('wb', got.wb); }\ndocument.body.classList.add('ready'); window.__ready = true;\n`,
  '/src/b.js': `export const v = '${v}'; // ${'b'.repeat(4000)}\n`,
  '/src/same.js': `export const same = 'the same in every release';\n`,
  '/src/late.js': `export const v = '${v}';\n`,
  '/src/w.js': `import { v as wb } from './wb.js'; postMessage({ w: '${v}', wb });\n`,
  '/src/wb.js': `export const v = '${v}';\n`,
  '/commit.json': JSON.stringify({ commit: v }),
});
let cur = 'aaaaaaa', stamped = true;
const sw = () => readFileSync(join(root, 'sw.js'), 'utf8');
const holds = new Map(); // path → { resolve } once a request for it waits
let down = false, cut = new Set(), fail = new Set();
const srv = await serveSite({
  port: PORT,
  commit: () => (stamped ? cur : null),
  files: (p) => (p === '/sw.js' ? sw() : site(cur)[p] ?? null),
  hooks: {
    async before(path, req, res, head) {
      if (down) { req.socket.destroy(); return true; }
      const h = holds.get(path);
      if (h && !h.waiting) { await new Promise((r) => { h.waiting = r; h.arrived?.(); }); holds.delete(path); head['x-fp-commit'] = stamped ? cur : undefined; if (!stamped) delete head['x-fp-commit']; }
      if (cut.has(path)) { // half the body, a full content-length, then the socket closed
        cut.delete(path);
        const body = Buffer.from(site(cur)[path]);
        res.writeHead(200, { ...head, 'content-type': 'application/javascript', 'content-length': body.length });
        res.write(body.subarray(0, body.length >> 1)); setTimeout(() => res.socket.destroy(), 50);
        return true;
      }
      if (fail.has(path)) { fail.delete(path); res.writeHead(500, head); res.end('boom'); return true; }
      return false;
    },
  },
});
// hold(path): the next request for path waits; returns { arrived: Promise, release() }
const hold = (path) => { const h = {}; const arrived = new Promise((r) => { h.arrived = r; }); holds.set(path, h); return { arrived, release: () => h.waiting?.() }; };

let pass = 0, failN = 0;
const check = (ok, what, detail = '') => { if (ok) pass++; else failN++; console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${detail ? ` (${detail})` : ''}`); if (!ok) firstFail ||= what; };
let firstFail = null, dumped = 0;
const dump = async (page) => { if (failN > dumped) { dumped = failN; const t = await traceOf(page); if (t) console.log('  the worker\'s trace:\n  ' + [`latest ${t.latest}; bound ${t.bound.join(' ')}`, ...t.trace.slice(-40)].join('\n  ')); } };
// the worker's own log ('fp-trace' in sw.js), printed after a failure
const traceOf = (page) => page.evaluate(() => new Promise((r) => { const w = navigator.serviceWorker.controller; if (!w) return r(null); const ch = new MessageChannel(); ch.port1.onmessage = (e) => r(e.data); w.postMessage({ type: 'fp-trace' }, [ch.port2]); setTimeout(() => r(null), 1000); })).catch(() => null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reqs = () => Object.fromEntries([...srv.counts].filter(([p]) => p !== '/favicon.ico'));
const reset = () => srv.counts.clear();
const onlyCheck = (c) => Object.keys(c).every((p) => p === '/commit.json' || p === '/sw.js') && c['/commit.json'] === 1;
const fmt = (c) => Object.entries(c).map(([p, n]) => `${p}×${n}`).join(' ') || 'none';

// wait until the page shows release v whole (through reloads); returns what it saw
async function settle(page, v, ms = 8000) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < ms) {
    try {
      last = await page.evaluate(() => ({ v: window.__v, ready: !!window.__ready, seen: window.__seen || [], mixed: localStorage.getItem('fp-mixed'), controlled: !!navigator.serviceWorker.controller, filled: window.__fp_sw?.filled || null }));
      if (last.ready && last.v === v) return last;
    } catch { /* mid-navigation */ }
    await sleep(100);
  }
  return last;
}
const whole = (s, v, late = false) => !!s && s.ready && s.v === v && !s.mixed && s.seen.length === (late === true ? 3 : late || 2) && s.seen.every((x) => x.endsWith(':' + v));
const cachesOf = (page) => page.evaluate(async () => {
  const out = {};
  for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).map((r) => new URL(r.url).pathname);
  return out;
});

const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`] });
const t0 = Date.now();
try {
  // 1. a first visit: not controlled, registers, fills from what it fetched
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const U = `${B}/?sw=1&late=1`;
  await page.goto(U);
  let s = await settle(page, cur);
  check(whole(s, cur, true) && !s.controlled, 'first visit: whole and not controlled', s && s.seen.join(' '));
  for (let i = 0; i < 50 && !(await page.evaluate(() => window.__fp_sw?.filled)); i++) await sleep(100);
  const filled = await page.evaluate(() => window.__fp_sw?.filled);
  let c = await cachesOf(page);
  check(filled?.commit === cur && filled.kept >= 4, 'first visit: the worker kept what the page fetched, from the HTTP cache', JSON.stringify(filled));
  check((c[`fp1-${cur}`] || []).includes('/src/late.js') && !(c[`fp1-${cur}`] || []).includes('/commit.json'), 'the cache holds the dynamic import and not commit.json', (c[`fp1-${cur}`] || []).join(' '));

  // 2. the second visit of the same commit
  reset();
  await page.goto(U);
  s = await settle(page, cur);
  let r = reqs();
  check(whole(s, cur, true) && s.controlled, 'second visit: whole, controlled');
  check(onlyCheck(r), 'second visit: the network was asked for commit.json only (and sw.js)', fmt(r));
  check(s && /^[0-9a-f]{7}$/.test(await page.evaluate(() => window.__fp_commit || '')), 'the page knows its commit from the worker (no fetch of its own)');

  // 3. a deploy: the next navigation is the new release, whole
  cur = 'bbbbbbb';
  reset();
  await page.goto(U);
  s = await settle(page, cur);
  r = reqs();
  check(whole(s, cur, true), 'after a deploy, the next navigation is the new release whole', s && s.seen.join(' '));
  check((r['/src/same.js'] || 0) >= 1 && !(await page.evaluate(() => localStorage.getItem('fp-mixed'))), 'a file the same in both releases, revalidated without a stamp, was re-asked and kept', fmt(r));
  await sleep(3500); // the worker looks again once the tab's previous page is gone
  c = await cachesOf(page);
  check(!c['fp1-aaaaaaa'] && c['fp1-bbbbbbb']?.length >= 5, 'the old release\'s cache is dropped, the new one filled on fetch', Object.keys(c).join(' '));
  reset();
  await page.goto(U);
  s = await settle(page, cur);
  r = reqs();
  check(whole(s, cur, true) && onlyCheck(r), 'and the visit after that asks for commit.json only', fmt(r));

  // 4. a deploy lands mid-load: a module of the static graph held while the commit changes
  cur = 'ccccccc';
  let h = hold('/src/b.js');
  reset();
  const nav = page.goto(U).catch(() => {});
  await h.arrived;
  cur = 'ddddddd';
  h.release();
  await nav;
  s = await settle(page, cur);
  r = reqs();
  check(whole(s, cur, true), 'a deploy mid-load (on a module): the page ends on the new release whole, never mixed', `${s && s.seen.join(' ')}; ${fmt(r)}`);
  check((r['/index.html'] || 0) + (r['/'] || 0) >= 2, 'it got there by a reload (the worker refused the other release\'s file)', fmt(r));
  // the same, with the page itself held after commit.json answered
  cur = 'eeeeeee';
  h = hold('/index.html');
  const nav2 = page.goto(U).catch(() => {});
  await h.arrived;
  cur = 'fffffff';
  h.release();
  await nav2;
  s = await settle(page, cur);
  check(whole(s, cur, true), 'a deploy between commit.json and the page: the page\'s own stamp binds it, whole', s && s.seen.join(' '));

  // 5. two tabs on two commits
  await page.goto(`${B}/?sw=1`); // this tab on fffffff, late.js not asked for by this page (it is in the cache)
  s = await settle(page, 'fffffff');
  const tab1 = await ctx.newPage();
  cur = 'ggggggg';
  await tab1.goto(`${B}/?sw=1`); // tab1 on ggggggg, late.js not fetched
  let s1 = await settle(tab1, cur);
  check(whole(s1, cur), 'tab two on the new commit, whole');
  c = await cachesOf(tab1);
  check(!!c['fp1-fffffff'] && !!c['fp1-ggggggg'], 'tab one\'s cache is kept while it is open', Object.keys(c).join(' '));
  await dump(tab1);
  check(await page.evaluate(() => window.loadLate()) === 'fffffff', 'tab one, importing later, gets its own release from its cache');
  cur = 'hhhhhhh';
  const tab2 = await ctx.newPage();
  await tab2.goto(`${B}/?sw=1`);
  await settle(tab2, cur);
  // tab1 (ggggggg) never fetched late.js: its later import misses, the network has hhhhhhh, the worker refuses it
  await tab1.evaluate(() => window.loadLate().catch(() => 'refused'));
  s1 = await settle(tab1, 'hhhhhhh');
  check(whole(s1, 'hhhhhhh'), 'a tab whose later import would be another release reloads into the new one, whole', s1 && `${s1.v} ${s1.seen.join(' ')}`);
  await tab1.close(); await tab2.close();
  await page.goto(`${B}/?sw=1`); // page and its neighbours on hhhhhhh now
  await settle(page, cur);
  await sleep(3500); // the worker looks again once the tabs are gone
  c = await cachesOf(page);
  check(Object.keys(c).filter((k) => k !== 'fp1-meta').join() === 'fp1-hhhhhhh', 'once no tab uses an old commit, its cache is gone', Object.keys(c).join(' '));

  // 6. offline: the last release, whole
  down = true;
  await page.goto(`${B}/?sw=1`).catch(() => {});
  s = await settle(page, 'hhhhhhh');
  check(whole(s, 'hhhhhhh'), 'offline (the server gone): the cached release opens whole', s && s.seen.join(' '));
  down = false;

  // 7. a file cut off mid-body, and an error answer, are not kept
  cur = 'iiiiiii';
  cut.add('/src/b.js');
  await page.goto(`${B}/?sw=1&late=1`).catch(() => {});
  await sleep(1000);
  c = await cachesOf(page);
  let kept = c['fp1-iiiiiii'] || [];
  check(kept.includes('/src/main.js') && !kept.includes('/src/b.js'), 'a file cut off mid-body is not kept (its neighbour is)', kept.join(' '));
  fail.add('/src/late.js');
  await page.goto(`${B}/?sw=1&late=1`).catch(() => {});
  await sleep(1000);
  c = await cachesOf(page);
  kept = c['fp1-iiiiiii'] || [];
  check(kept.includes('/src/b.js') && !kept.includes('/src/late.js'), 'an error answer is not kept', kept.join(' '));
  await page.goto(`${B}/?sw=1&late=1`);
  s = await settle(page, cur);
  check(whole(s, cur, true), 'and the next load fetches them again and is whole', s && s.seen.join(' '));

  // 8. a Worker's own imports are of its page's release; the bindings outlive the worker being stopped
  cur = 'jjjjjjj';
  await page.goto(`${B}/?sw=1&w=1`);
  s = await settle(page, cur);
  check(whole(s, cur, 4), 'a page whose Worker imports a module: the Worker is bound to the page\'s release, whole', s && s.seen.join(' '));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  await sleep(300);
  check(await page.evaluate(() => window.loadLate().catch((e) => 'refused')) === 'jjjjjjj', 'after the browser stops the worker, a later import still knows its page\'s release');
  await cdp.send('ServiceWorker.stopAllWorkers');
  cur = 'kkkkkkk';
  await page.goto(`${B}/?sw=1&w=1`);
  s = await settle(page, cur);
  check(whole(s, cur, 4), 'a deploy, the worker stopped, the next load is the new release whole', s && s.seen.join(' '));
  await dump(page);

  // the bindings lost (the meta deleted and the worker stopped): a later import is refused and the page reloads
  await page.evaluate(() => caches.delete('fp1-meta'));
  await cdp.send('ServiceWorker.stopAllWorkers');
  const navs = srv.counts.get('/commit.json') || 0; // each navigation asks it once
  const got = await page.evaluate(() => window.loadLate().catch(() => 'refused')).catch(() => 'refused');
  for (let i = 0; i < 30 && (srv.counts.get('/commit.json') || 0) === navs; i++) await sleep(100);
  await sleep(200);
  s = await settle(page, cur);
  check(got === 'refused' && (srv.counts.get('/commit.json') || 0) > navs && whole(s, cur, 4), 'a page whose release the worker cannot place gets no file from the network; it reloads, whole', `${got}, ${s && s.seen.join(' ')}`);

  // 9. a host that stops stamping: the worker drops its caches and steps aside
  stamped = false;
  await page.goto(`${B}/?sw=1&late=1`);
  s = await settle(page, cur);
  await sleep(300);
  c = await cachesOf(page);
  check(whole(s, cur, true) && s.controlled && !Object.keys(c).some((k) => /^fp1-(?!meta)/.test(k)), 'no stamp: the page loads from the network and no release is cached', Object.keys(c).join(' '));
  stamped = true;

  // 10. ?sw=0 leaves nothing behind
  await page.goto(`${B}/?sw=1`); await settle(page, cur);
  await page.goto(`${B}/?sw=0`);
  await sleep(800);
  await page.goto(`${B}/?q=1`);
  await sleep(500);
  const left = await page.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, keys: (await caches.keys()).filter((k) => /^fp/.test(k)), ctl: !!navigator.serviceWorker.controller }));
  check(!(await page.evaluate(() => sessionStorage.getItem('fp-sw-tripped'))), 'the worker was never turned off by its own breaker in this tab (three refusals, each after a ready walk)');
  check(left.regs === 0 && left.keys.length === 0 && !left.ctl, '?sw=0: no worker, no cache, the next load not controlled', JSON.stringify(left));
  check(!errors.some((e) => /mixed/i.test(e)) && !(await page.evaluate(() => localStorage.getItem('fp-mixed'))), 'no page ever ran a module of another release');
  await ctx.close();

  // 11. a context with no ?sw=1 on localhost (every other test): nothing registers
  const plain = await browser.newContext();
  const p2 = await plain.newPage();
  await p2.goto(`${B}/`);
  await settle(p2, cur);
  await sleep(500);
  check((await p2.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0, 'localhost without ?sw=1: no worker registered');
  await plain.close();
} catch (e) {
  failN++; console.log(`FAIL threw: ${e.message.split('\n')[0]}`);
} finally {
  await browser.close();
  await srv.close();
}
console.log(`sw-test: ${pass} passed, ${failN} failed, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(failN ? 1 : 0);
