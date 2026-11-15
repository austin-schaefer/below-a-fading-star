// tools/load-probe.mjs --profile (v13-P2): where the load's CPU goes. Not run on its own; load-probe imports it.
// Three loads in one fresh context, one after another:
//   1. a cold ordinary load under CDP's sampling Profiler (--interval µs, default 200): the whole-load tables, and
//      each startup phase's (the fp:<phase> marks give the windows; profile ticks are aligned to performance.now()
//      by reading it just before Profiler.stop, so a window's edge is good to a few ms);
//   2. a ?serial=1 load under the Profiler: each module's build is its own window (startup.built, read from a copy
//      of src/startup.js rewritten in flight), so each module gets its own heightAt share and top files;
//   3. a ?serial=1 load, not profiled, with src/height/field.js (the heightfield, v13 L2; it was in src/terrain.js)
//      and src/noise.js rewritten in flight (page.route) to
//      count calls: heightAt, normalAt, slopeAt, biomeAt and the simplex noise2, per phase and per module build.
//      Nothing in src/ changes and a visitor's load is untouched; only the probe's page is served the counting copy.
// The raw profiles go to shots/wip/load-profile-<q>-{cold,serial}.cpuprofile (open in DevTools' Performance panel).
import { writeFileSync, mkdirSync } from 'node:fs';

const COUNTED = ['heightAt', 'normalAt', 'slopeAt', 'biomeAt'];

// --- in-flight rewrites (the probe's page only)
function rewriteStartup(src) {
  // every mark and every built() also snapshots the counters (if any) and the time: absolute windows for each build
  return src
    .replace(/export function mark\(name, data, t\) \{/, 'export function mark(name, data, t) { (globalThis.__fpw ||= []).push({ k: "mark", name, t: t != null ? t : now(), c: globalThis.__fpc ? { ...globalThis.__fpc } : null });')
    .replace(/export function built\(name, t1\) \{/, 'export function built(name, t1) { (globalThis.__fpw ||= []).push({ k: "built", name, t0: t1, t: now(), c: globalThis.__fpc ? { ...globalThis.__fpc } : null });');
}
function rewriteTerrain(src) {
  let out = src;
  for (const n of COUNTED) out = out.replace(new RegExp(`export function ${n}\\(`), `function ${n}__orig(`);
  out += '\n' + COUNTED.map((n) => `export function ${n}(a, b, c, d) { globalThis.__fpc.${n}++;${n === 'heightAt' ? ' const k = a + "," + b; if (__fpSeen.has(k)) globalThis.__fpc.heightAtRepeat++; else __fpSeen.add(k);' : ''} return ${n}__orig(a, b, c, d); }`).join('\n') + '\n';
  // heightAtRepeat: calls at an (x, z) asked before, anywhere earlier in the load: what an exact memo could answer
  return `globalThis.__fpc ||= { ${[...COUNTED, 'heightAtRepeat', 'noise2'].map((n) => `${n}: 0`).join(', ')} };\nconst __fpSeen = new Set();\n` + out;
}
function rewriteNoise(src) {
  return src.replace(/function noise2\(xin, yin\) \{/, 'function noise2(xin, yin) { globalThis.__fpc && globalThis.__fpc.noise2++;');
}
async function routeRewrites(context, counting) {
  await context.route(/\/src\/(startup|height\/field|noise)\.js(\?.*)?$/, async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    const u = route.request().url();
    if (/startup\.js/.test(u)) body = rewriteStartup(body);
    else if (counting && /height\/field\.js/.test(u)) body = rewriteTerrain(body);
    else if (counting && /noise\.js/.test(u)) body = rewriteNoise(body);
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript', 'cache-control': 'no-store' } });
  });
}

// --- the profile
function index(profile) {
  const byId = new Map(), parent = new Map();
  for (const n of profile.nodes) byId.set(n.id, n);
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  // sample i lasts until sample i+1
  const t = [], d = [];
  let acc = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) { acc += profile.timeDeltas[i]; t.push(acc); }
  for (let i = 0; i < t.length; i++) d.push(i + 1 < t.length ? t[i + 1] - t[i] : 0);
  return { byId, parent, t, d };
}
const fileOf = (cf) => {
  if (!cf.url) return cf.functionName.startsWith('(') ? cf.functionName : '(native)';
  return cf.url.replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '');
};
const fnKey = (cf) => `${cf.functionName || '(anonymous)'} ${fileOf(cf)}:${cf.lineNumber + 1}`;

// self time per function and per file, inclusive time for named functions, and inside heightAt (the outermost
// heightAt frame's direct callee, and self time by function under it), over samples in [a, b] (µs ticks)
function analyse(P, ix, a, b, names) {
  const self = new Map(), byFile = new Map(), incl = new Map(names.map((n) => [n, 0])), underH = new Map(), underHSelf = new Map();
  let total = 0, idle = 0;
  for (let i = 0; i < P.samples.length; i++) {
    if (ix.t[i] < a || ix.t[i] > b) continue;
    const dt = ix.d[i] / 1000;
    const leaf = ix.byId.get(P.samples[i]);
    if (leaf.callFrame.functionName === '(idle)') { idle += dt; continue; }
    total += dt;
    const k = fnKey(leaf.callFrame), f = fileOf(leaf.callFrame);
    self.set(k, (self.get(k) || 0) + dt);
    byFile.set(f, (byFile.get(f) || 0) + dt);
    // the stack, leaf to root
    const stack = [];
    for (let id = P.samples[i]; id != null; id = ix.parent.get(id)) stack.push(ix.byId.get(id).callFrame);
    const seen = new Set();
    for (const cf of stack) if (incl.has(cf.functionName) && !seen.has(cf.functionName)) { seen.add(cf.functionName); incl.set(cf.functionName, incl.get(cf.functionName) + dt); }
    let outer = -1;
    for (let j = stack.length - 1; j >= 0; j--) if (stack[j].functionName === 'heightAt') { outer = j; break; }
    if (outer >= 0) {
      const callee = outer === 0 ? '(heightAt itself)' : fnKey(stack[outer - 1]);
      underH.set(callee, (underH.get(callee) || 0) + dt);
      underHSelf.set(outer === 0 ? '(heightAt itself)' : k, (underHSelf.get(outer === 0 ? '(heightAt itself)' : k) || 0) + dt);
    }
  }
  const sorted = (m) => [...m.entries()].sort((x, y) => y[1] - x[1]);
  return { total, idle, self: sorted(self), byFile: sorted(byFile), incl: [...incl.entries()], underH: sorted(underH), underHSelf: sorted(underHSelf) };
}

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const pc = (x, of) => (of > 0 ? `${Math.round((x / of) * 1000) / 10}%` : '-');

export async function runProfile({ browser, base, query, opts, P, wait }) {
  const names = (opts.inclusive || 'heightAt,slopeAt,normalAt,biomeAt,noise2,fbm2,warped2,ridged2,riverSection,applyMountains,regionsHeight,computeVertexNormals,mergeGeometries').split(',').filter(Boolean);
  const interval = Math.max(50, +opts.interval || 200);
  mkdirSync('shots/wip', { recursive: true });
  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await routeRewrites(context, false);
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('pageerror: ' + e.message));
  page.on('crash', () => console.error('the page crashed (out of memory?)'));
  const cdp = await context.newCDPSession(page);
  // a same-origin page first, so the profiled navigation stays in this renderer process
  await page.goto(`${base}/AGENTS.md`, { waitUntil: 'load' });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval });

  async function profiled(kind, url) {
    await cdp.send('Profiler.start');
    await page.goto(url, { waitUntil: 'commit', timeout: 300000 });
    console.error(`[profile] ${kind} load started`);
    await wait(page);
    const nowMs = await page.evaluate(() => performance.now());
    const { profile } = await cdp.send('Profiler.stop');
    const rep = await page.evaluate(() => ({ r: window.__fp_startup.report(), w: globalThis.__fpw || [] }));
    const offset = profile.endTime - nowMs * 1000; // µs tick at performance.now() = 0
    const file = `shots/wip/load-profile-${opts.q}-${kind}.cpuprofile`;
    writeFileSync(file, JSON.stringify(profile));
    return { profile, ix: index(profile), rep: rep.r, w: rep.w, offset, file };
  }

  const cold = await profiled('cold', `${base}/?${query}`);
  const serial = await profiled('serial', `${base}/?${query}&serial=1`);
  await context.close();

  // the counting load
  const cctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await routeRewrites(cctx, true);
  const cpage = await cctx.newPage();
  cpage.on('pageerror', (e) => console.error('pageerror (counting): ' + e.message));
  cpage.on('crash', () => console.error('the counting page crashed'));
  await cpage.goto(`${base}/?${query}&serial=1`, { waitUntil: 'commit', timeout: 300000 });
  await wait(cpage);
  const counted = await cpage.evaluate(() => ({ w: globalThis.__fpw || [], c: globalThis.__fpc || null }));
  await cctx.close();

  // --- tables
  const C = cold, ready = C.rep.ready;
  const whole = analyse(C.profile, C.ix, C.offset, C.offset + ready * 1000, names);
  P('');
  P(`load-profile ${base}/?${query} · sampling ${interval} µs · cold load, navigation to ready ${Math.round(ready)} ms (profiled; the profiler's own cost is in it)`);
  P(`busy (non-idle) ${f1(whole.total)} ms, idle ${f1(whole.idle)} ms · raw: ${C.file}, ${serial.file}`);
  P('');
  P('top 40 functions by self time (whole load)');
  for (const [k, ms] of whole.self.slice(0, 40)) P(`  ${f1(ms).padStart(8)} ms ${pc(ms, whole.total).padStart(6)}  ${k}`);
  P('');
  P('self time by file (whole load, top 25)');
  for (const [k, ms] of whole.byFile.slice(0, 25)) P(`  ${f1(ms).padStart(8)} ms ${pc(ms, whole.total).padStart(6)}  ${k}`);
  P('');
  P('inclusive time (whole load; a sample counts once per name however deep the recursion)');
  for (const [k, ms] of whole.incl) P(`  ${k.padEnd(22)} ${f1(ms).padStart(8)} ms ${pc(ms, whole.total).padStart(6)}`);

  // per phase
  const at = C.rep.at, ORDER = Object.keys(at);
  const phases = {};
  P('');
  P('per phase (cold): busy ms, heightAt inclusive, top files by self time');
  for (let i = 1; i < ORDER.length; i++) {
    const a = at[ORDER[i - 1]], b = at[ORDER[i]];
    const r = analyse(C.profile, C.ix, C.offset + a * 1000, C.offset + b * 1000, names);
    phases[ORDER[i]] = r;
    if (r.total < 30) continue;
    const h = r.incl.find(([n]) => n === 'heightAt')?.[1] || 0;
    P(`  ${ORDER[i].padEnd(10)} ${f1(b - a).padStart(8)} ms wall, ${f1(r.total).padStart(8)} busy; heightAt ${f1(h)} (${pc(h, r.total)})`);
    for (const [k, ms] of r.byFile.slice(0, 8)) P(`      ${f1(ms).padStart(8)} ${pc(ms, r.total).padStart(6)}  ${k}`);
  }
  for (const ph of ['terrain', 'modules']) {
    const r = ph === 'modules'
      ? analyse(C.profile, C.ix, C.offset + at.scaffold * 1000, C.offset + at.modules * 1000, names)
      : phases[ph];
    if (!r) continue;
    P('');
    P(`${ph === 'modules' ? 'imports + modules' : ph} (cold): top 20 functions by self time, of ${f1(r.total)} ms busy`);
    for (const [k, ms] of r.self.slice(0, 20)) P(`  ${f1(ms).padStart(8)} ms ${pc(ms, r.total).padStart(6)}  ${k}`);
    P(`  inclusive: ${r.incl.filter(([, ms]) => ms > 0).map(([k, ms]) => `${k} ${f1(ms)} (${pc(ms, r.total)})`).join(' · ')}`);
    const hT = r.underH.reduce((s, [, ms]) => s + ms, 0);
    P(`  inside heightAt (${f1(hT)} ms): by the outermost heightAt's direct callee`);
    for (const [k, ms] of r.underH.slice(0, 14)) P(`      ${f1(ms).padStart(8)} ${pc(ms, hT).padStart(6)}  ${k}`);
    P(`  inside heightAt: self time by function`);
    for (const [k, ms] of r.underHSelf.slice(0, 12)) P(`      ${f1(ms).padStart(8)} ${pc(ms, hT).padStart(6)}  ${k}`);
  }

  // per module (serial profile windows; counts from the counting load)
  const S = serial;
  const builds = S.w.filter((e) => e.k === 'built');
  const cw = counted.w;
  const cMarks = Object.fromEntries(cw.filter((e) => e.k === 'mark').map((e) => [e.name, e.c]));
  const cBuilt = cw.filter((e) => e.k === 'built');
  const delta = (a, b, n) => (a && b ? b[n] - a[n] : null);
  P('');
  if (counted.c) {
    P('calls (counting load, ?serial=1): per phase');
    const cm = cw.filter((e) => e.k === 'mark');
    for (let i = 1; i < cm.length; i++) {
      const dH = delta(cm[i - 1].c, cm[i].c, 'heightAt');
      if (!dH && !delta(cm[i - 1].c, cm[i].c, 'noise2')) continue;
      P(`  ${cm[i].name.padEnd(10)} ${['heightAt', 'heightAtRepeat', 'normalAt', 'slopeAt', 'biomeAt', 'noise2'].map((n) => `${n} ${delta(cm[i - 1].c, cm[i].c, n).toLocaleString('en')}`).join(' · ')}`);
    }
    P(`  whole load: ${Object.entries(counted.c).map(([k, v]) => `${k} ${v.toLocaleString('en')}`).join(' · ')}`);
  } else P('calls: the counting load found no counters (src/height/field.js not rewritten?)');
  P('');
  P('module builds (?serial=1, profiled): build ms, heightAt inclusive ms and share, heightAt calls, µs a call, top file other than heightAt\'s');
  const rows = [];
  let prevC = cMarks.imports;
  const cBy = new Map();
  for (const e of cBuilt) { cBy.set(e.name, { a: prevC, b: e.c }); prevC = e.c; }
  for (const e of builds) {
    const r = analyse(S.profile, S.ix, S.offset + e.t0 * 1000, S.offset + e.t * 1000, names);
    const h = r.incl.find(([n]) => n === 'heightAt')?.[1] || 0;
    const cc = cBy.get(e.name);
    const calls = cc ? delta(cc.a, cc.b, 'heightAt') : null;
    rows.push({ name: e.name, ms: e.t - e.t0, busy: r.total, h, calls, rep: cc ? delta(cc.a, cc.b, 'heightAtRepeat') : null, slope: cc ? delta(cc.a, cc.b, 'slopeAt') : null, noise: cc ? delta(cc.a, cc.b, 'noise2') : null, files: r.byFile.slice(0, 3), top: r.self.slice(0, 3) });
  }
  rows.sort((a, b) => b.ms - a.ms);
  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
  P(`  all ${rows.length} builds: ${f1(sum('ms'))} ms wall, heightAt ${f1(sum('h'))} ms (${pc(sum('h'), sum('busy'))} of busy), ${sum('calls').toLocaleString('en')} heightAt calls, ${pc(sum('rep'), sum('calls'))} of them at a point asked before`);
  for (const r of rows.slice(0, 25)) {
    P(`  ${r.name.padEnd(20)} ${f1(r.ms).padStart(7)} ms · heightAt ${f1(r.h).padStart(6)} ${pc(r.h, r.busy).padStart(6)} · ${r.calls == null ? '?' : r.calls.toLocaleString('en').padStart(9)} calls${r.calls ? ` (${f1((r.h * 1000) / r.calls)} µs, ${pc(r.rep || 0, r.calls)} repeats)` : ''} · slopeAt ${r.slope ?? '?'} · noise2 ${r.noise == null ? '?' : r.noise.toLocaleString('en')}`);
    P(`  ${''.padEnd(20)} files: ${r.files.map(([k, ms]) => `${k} ${pc(ms, r.busy)}`).join(', ')} · top: ${r.top.map(([k, ms]) => `${k.split(' ')[0]} ${pc(ms, r.busy)}`).join(', ')}`);
  }
  return { whole, rows };
}
