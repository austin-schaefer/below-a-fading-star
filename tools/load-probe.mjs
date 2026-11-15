#!/usr/bin/env node
// The load's yardstick (v13-P0): navigation to "Go out", phase by phase, cold and repeat, with and without a CPU
// throttle. It reads src/startup.js's report (window.__fp_startup.report()) and counts the network over CDP.
//   node tools/load-probe.mjs <base> [--q=low|medium|high] [--runs=3] [--throttle=4] [--net=fast4g|slow4g|3g]
//                                    [--serial=0] [--params=a=1&b=2] [--json=path]
//   node tools/load-probe.mjs <base> --profile [--q=low] [--interval=200] [--inclusive=heightAt,slopeAt,...] [--out=path]
//     where the CPU goes instead (v13-P2, tools/load-profile.mjs says how): self time by function and by file,
//     inclusive time for named functions, per phase and per module build, with heightAt's call counts.
// Each run, in a new browser context (empty cache): a cold load; a repeat load (a reload in that context, as a
// visitor's refresh); then, unless --serial=0, a third load in the same context with ?serial=1, which imports every
// module first and builds them one at a time, so each module's build time is its own (startup.js says how).
// It prints one table: each phase's ms (median and range over the runs), time to ready, the longest stall of the
// title card (a main-thread task over 50 ms, with its phase), requests and kilobytes over the wire, requests
// answered from the cache or by a 304 on the repeat, the ten modules with the longest own build, and how far their
// serial sum is from the parallel 'modules' phase.
//
// What a local server hides: tools/serve.sh (http-server) has no latency, no gzip or brotli, no HTTP/2 multiplexing,
// and sends `cache-control: no-store`, so a repeat load here refetches everything and bytes are raw. Netlify sends
// gzip or brotli over HTTP/2 and `max-age=0, must-revalidate` with ETags (a repeat costs a round trip a file). The
// one honest network number is the live site, read-only, by hand:
//   node tools/load-probe.mjs https://below-a-fading-star.netlify.app --runs=3
// --net emulates a link over CDP (fast4g: 60 ms latency, 9 Mbit/s down, 1.5 up; slow4g: 150 ms, 1.6, 0.75; 3g:
// 300 ms, 0.4, 0.4): on localhost it adds latency and bandwidth but still not compression or HTTP/2.
// --throttle=N slows the page's CPU N times over CDP: 4 is the stand-in for a phone, and only a stand-in.
// Headless WebGL is ANGLE (SHOT_ANGLE=metal) or software: compile and warm-up times are this machine's, not a GPU's.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const opts = { q: 'low', runs: '3', throttle: '1', net: '', serial: '1', params: '', json: '', profile: '', interval: '200', inclusive: '', out: '' };
const pos = [];
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([a-z]+)(?:=(.*))?$/);
  if (m) opts[m[1]] = m[2] ?? '1'; else pos.push(a);
}
const base = (pos[0] || 'http://localhost:8123').replace(/\/$/, '');
const runs = Math.max(1, +opts.runs || 3), rate = Math.max(1, +opts.throttle || 1);
const NETS = { fast4g: [60, 9, 1.5], slow4g: [150, 1.6, 0.75], '3g': [300, 0.4, 0.4] };
const net = opts.net ? NETS[opts.net] : null;
if (opts.net && !net) { console.error(`--net: one of ${Object.keys(NETS).join(', ')}`); process.exit(2); }
const query = `q=${opts.q}${opts.params ? '&' + opts.params : ''}`;
const url = `${base}/?${query}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
if (opts.profile) {
  const { runProfile } = await import('./load-profile.mjs');
  const lines = [];
  const wait = (page) => page.waitForFunction(() => document.body?.classList.contains('ready') && window.__fp_startup?.report().ready != null, null, { timeout: 900000, polling: 250 });
  await runProfile({ browser, base, query, opts, wait, P: (s) => { lines.push(s); console.log(s); } });
  await browser.close();
  if (opts.out) { writeFileSync(opts.out, lines.join('\n') + '\n'); console.log('[saved]', opts.out); }
  process.exit(0);
}

async function load(page, cdp, kind, go) {
  const reqs = new Map();
  let cacheControl = null;
  const onReq = (e) => { if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, bytes: 0, cached: false, status: 0 }); };
  const onResp = (e) => {
    const r = reqs.get(e.requestId); if (!r) return;
    r.status = e.response.status;
    if (e.response.fromDiskCache || e.response.fromServiceWorker || e.response.fromPrefetchCache) r.cached = true;
    if (!cacheControl && /\/src\/main\.js/.test(e.response.url)) cacheControl = e.response.headers['cache-control'] || e.response.headers['Cache-Control'] || '(none)';
  };
  const onCache = (e) => { const r = reqs.get(e.requestId); if (r) r.cached = true; };
  const onDone = (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; };
  cdp.on('Network.requestWillBeSent', onReq); cdp.on('Network.responseReceived', onResp);
  cdp.on('Network.requestServedFromCache', onCache); cdp.on('Network.loadingFinished', onDone);
  const t0 = Date.now();
  await go();
  await page.waitForFunction(() => document.body?.classList.contains('ready') && (!window.__fp_startup || window.__fp_startup.report().ready != null), null, { timeout: 900000, polling: 250 });
  await page.waitForTimeout(300); // let the last loadingFinished events in
  const rep = await page.evaluate(() => (window.__fp_startup ? window.__fp_startup.report() : window.__probe.report()));
  cdp.off('Network.requestWillBeSent', onReq); cdp.off('Network.responseReceived', onResp);
  cdp.off('Network.requestServedFromCache', onCache); cdp.off('Network.loadingFinished', onDone);
  const list = [...reqs.values()];
  const kb = list.reduce((s, r) => s + r.bytes, 0) / 1024;
  return {
    kind, wallMs: Date.now() - t0, ...rep, cacheControl,
    net: { requests: list.length, kb: Math.round(kb), fromCache: list.filter((r) => r.cached).length, revalidated: list.filter((r) => r.status === 304).length },
  };
}

const out = [];
for (let i = 0; i < runs; i++) {
  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await context.newPage();
  // A tree from before v13-P0 (the live site until it is released) has no src/startup.js: then this stands in for
  // its report, with time to ready, long tasks and the paint, and no phases.
  await page.addInitScript(() => {
    const lt = []; let ready = null, ob = null;
    try { ob = new PerformanceObserver((l) => { for (const e of l.getEntries()) lt.push({ t: e.startTime, ms: e.duration }); }); ob.observe({ type: 'longtask', buffered: true }); } catch { /* */ }
    const iv = setInterval(() => { if (ready == null && document.body?.classList.contains('ready')) { ready = performance.now(); clearInterval(iv); } }, 10);
    window.__probe = { report: () => {
      const n = performance.getEntriesByType('navigation')[0], fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
      const tasks = lt.filter((e) => e.t <= ready).map((e) => ({ t: Math.round(e.t), ms: Math.round(e.ms), phase: null }));
      return { kind: 'probe-fallback', ready: Math.round(ready), at: {}, phases: {}, extra: {}, serial: false, modules: [],
        nav: { html: Math.round(n.responseEnd), domInteractive: Math.round(n.domInteractive), fcp: fcp ? Math.round(fcp.startTime) : null, type: n.type },
        longTasks: tasks, longest: tasks.reduce((a, e) => (!a || e.ms > a.ms ? e : a), null) };
    } };
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  if (net) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net[0], downloadThroughput: net[1] * 125000, uploadThroughput: net[2] * 125000 });
  const run = {};
  run.cold = await load(page, cdp, 'cold', () => page.goto(url, { waitUntil: 'commit', timeout: 300000 }));
  run.repeat = await load(page, cdp, 'repeat', () => page.reload({ waitUntil: 'commit', timeout: 300000 }));
  if (opts.serial !== '0' && run.cold.kind !== 'probe-fallback') run.serial = await load(page, cdp, 'serial', () => page.goto(`${url}&serial=1`, { waitUntil: 'commit', timeout: 300000 }));
  out.push(run);
  console.log(`run ${i + 1}/${runs}: cold ${run.cold.ready} ms, repeat ${run.repeat.ready} ms${run.serial ? `, serial ${run.serial.ready} ms` : ''}`);
  await context.close();
}
await browser.close();

// --- the table
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const cell = (a) => {
  const v = a.filter((x) => x != null); if (!v.length) return '-';
  const m = med(v), lo = Math.min(...v), hi = Math.max(...v);
  return v.length > 1 ? `${fmt(m)} [${fmt(lo)}–${fmt(hi)}]` : fmt(m);
};
const fmt = (x) => (Math.abs(x) >= 100 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString());
const spread = (a) => { const m = med(a); return m ? Math.round(((Math.max(...a) - Math.min(...a)) / m) * 100) : 0; };
const PH = ['module', 'tier', 'renderer', 'terrain', 'mountains', 'scaffold', 'imports', 'modules', 'post', 'programs', 'warmup', 'ready'];
const NAMES = { module: 'fetch (static graph, to first module)', tier: 'tier chosen', renderer: 'renderer made', terrain: 'terrain built', mountains: 'mountains built', scaffold: 'regions, kit, sky, controls, HUD', imports: 'module imports resolved', modules: 'modules built', post: 'far, post, light slots', programs: 'programs compiled', warmup: 'warm-up drawn', ready: 'to ready ("Go out")' };
const kinds = ['cold', 'repeat', ...(out[0].serial ? ['serial'] : [])];
const col = (k, f) => kinds.map((kind) => cell(out.map((r) => f(r[kind])))).map((s) => s.padStart(22)).join('');
const lines = [];
const P = (s) => { lines.push(s); console.log(s); };
P('');
P(`load-probe ${url} · runs ${runs} · cpu ${rate}x${net ? ` · net ${opts.net}` : ''} · ${out[0].cold.cacheControl ? `main.js cache-control: ${out[0].cold.cacheControl}` : ''}`);
P(`ms, median [min–max] over ${runs} run(s); a phase ends at its mark`);
P(`${'phase'.padEnd(40)}${kinds.map((k) => k.padStart(22)).join('')}`);
for (const p of PH) P(`${(p + ': ' + NAMES[p]).slice(0, 39).padEnd(40)}${col(p, (r) => r.phases[p])}`);
P(`${'READY (navigation to "Go out")'.padEnd(40)}${col('ready', (r) => r.ready)}`);
P(`${'  first contentful paint (title card)'.padEnd(40)}${col('fcp', (r) => r.nav?.fcp)}`);
P(`${'longest stall (ms)'.padEnd(40)}${col('longest', (r) => r.longest?.ms)}`);
P(`${'  long tasks over 50 ms (count)'.padEnd(40)}${col('n', (r) => r.longTasks.length)}`);
P(`${'  long tasks, total ms'.padEnd(40)}${col('sum', (r) => r.longTasks.reduce((s, e) => s + e.ms, 0))}`);
P(`${'requests'.padEnd(40)}${col('req', (r) => r.net.requests)}`);
P(`${'KB over the wire'.padEnd(40)}${col('kb', (r) => r.net.kb)}`);
P(`${'from cache / 304'.padEnd(40)}${kinds.map((kind) => `${cell(out.map((r) => r[kind].net.fromCache))} / ${cell(out.map((r) => r[kind].net.revalidated))}`.padStart(22)).join('')}`);
P(`${'programs compiled'.padEnd(40)}${col('prog', (r) => r.extra?.programs?.count)}`);
const stall = (kind) => {
  const by = {}; for (const r of out) { const l = r[kind].longest; if (l) by[l.phase] = (by[l.phase] || 0) + 1; }
  return Object.entries(by).map(([k, n]) => `${k} ×${n}`).join(', ');
};
P(`longest stall fell in: cold ${stall('cold')}; repeat ${stall('repeat')}`);
P(`spread of ready (max−min over median): cold ${spread(out.map((r) => r.cold.ready))}%, repeat ${spread(out.map((r) => r.repeat.ready))}%`);
if (out[0].serial) {
  const names = out[0].serial.modules.map((m) => m.name);
  const own = names.map((n) => ({ n, ms: med(out.map((r) => r.serial.modules.find((m) => m.name === n)?.build)) })).sort((a, b) => b.ms - a.ms);
  const sum = own.reduce((s, m) => s + (m.ms || 0), 0);
  const par = med(out.map((r) => r.cold.phases.modules + (r.cold.phases.imports || 0)));
  P('');
  P(`each module's own build (ms, median, from the ?serial=1 loads); ${names.length} modules, sum ${fmt(sum)} ms against the parallel imports+modules wall time of ${fmt(par)} ms (cold); serial imports alone ${fmt(med(out.map((r) => r.serial.phases.imports)))} ms`);
  for (const m of own.slice(0, 10)) P(`  ${m.n.padEnd(22)} ${fmt(m.ms).padStart(8)}  ${cell(out.map((r) => r.serial.modules.find((x) => x.name === m.n)?.build))}`);
}
if (errors.length) { P(''); P(`page errors (${errors.length}):`); for (const e of [...new Set(errors)].slice(0, 8)) P('  ' + e); }
if (opts.json) {
  writeFileSync(opts.json, JSON.stringify({ kind: 'fading-planet-load-probe', date: new Date().toISOString(), url, runs, throttle: rate, net: opts.net || null, table: lines, results: out }, null, 1));
  console.log('[saved]', opts.json);
}
