// The load's yardstick (v13-P0): where the time goes from navigation to "Go out". No THREE: this file is the first
// module main.js imports, so it evaluates as soon as the static graph has arrived, and its own top level is the
// "module" mark (first module executed). main.js calls mark(name) at each boundary below; each is a
// performance.mark('fp:<name>') and a performance.measure('fp:<name>') from the boundary before, so the phases
// show in a browser's own profiler. Always on: a dozen marks, one observer, one array per module.
//
// The boundaries, in order (a phase is named for the mark that ends it):
//   nav (0, navigation start) · module (the static graph fetched; this file evaluates first) · tier (three and the
//   rest of the static graph evaluated, main.js's top level, chooseTier)
//   · renderer (the WebGLRenderer) · terrain (buildTerrain) · mountains (buildMountains) · scaffold (regions, kit,
//   strata, acts, the lights, sky, controls, HUD) · imports (the last world module's import resolved: in an ordinary
//   load that waits behind the builds already running, so only ?serial=1 makes it fetch alone) · modules
//   (every module built) · post (far, post, light slots, the profiler's panel) · programs (compileAsync; with the
//   count) · warmup (the warm-up draw) · ready ("Go out" enabled)
//
// Each module's own time: in an ordinary load the modules import and build together under one Promise.allSettled,
// so their times overlap and the sum means nothing. ?serial=1 imports them all first (the 'imports' phase is then
// fetch and evaluation alone) and builds them one after another, so each build's wall time is its own cost to the
// main thread (plus whatever it awaits: a progress paint, a compile). report().modules has { name, import, build }
// in ms either way; report().serial says which kind they are.
//
// Long tasks: every main-thread block over 50 ms until ready, from a PerformanceObserver for 'longtask' where the
// browser has it (Chromium), else from gaps in a 25 ms timer (each gap less the timer's own period, so a coarse
// stand-in); each with the phase that holds most of it. report().longest is the longest stall of the title card.
//
// startup.report() is carried by perf.report() and the bench's JSON as `startup`; tools/load-probe.mjs reads it as
// window.__fp_startup.report().
const ORDER = ['nav', 'module', 'tier', 'renderer', 'terrain', 'mountains', 'scaffold', 'imports', 'modules', 'post', 'programs', 'warmup', 'ready'];
const perf = typeof performance !== 'undefined' ? performance : null;
const now = () => (perf ? perf.now() : 0);
const marks = { nav: 0 };
const extra = {};
const modules = [];
const longTasks = [];
let serial = false, done = false, observer = null, gapTimer = null, last = '';

function safeMark(name, t) {
  try { perf?.mark(`fp:${name}`, t != null ? { startTime: t } : undefined); } catch { /* old browsers: no startTime option */ }
}
function safeMeasure(name, from) {
  try { perf?.measure(`fp:${name}`, { start: from === 'nav' ? 0 : `fp:${from}`, end: `fp:${name}` }); } catch { /* best effort */ }
}

// mark(name, data?, t?): the boundary `name` reached now (or at t, a performance.now() time); data goes into
// report().extra[name] (programs: { count }). A mark set twice keeps its first time.
export function mark(name, data, t) {
  if (marks[name] != null) return;
  marks[name] = t != null ? t : now();
  if (data) extra[name] = data;
  safeMark(name, marks[name]);
  safeMeasure(name, last || 'nav');
  last = name;
  // the task that reaches ready (it holds the warm-up) has its long-task entry delivered after it ends, and the
  // timer's gap shows only on its next tick: stop a little later; report() keeps only tasks begun by ready
  if (name === 'ready') setTimeout(stop, 250);
}
mark('module');

// The loop in main.js reports each module: imported(name, t0) when its import resolves (returns the time),
// built(name, t1) when its build settles.
export function imported(name, t0) {
  const t = now();
  modules.push({ name, import: t - t0, build: null, at: t0 });
  return t;
}
export function built(name, t1) {
  const m = modules.find((x) => x.name === name);
  if (m) m.build = now() - t1;
}
export function setSerial(on) { serial = !!on; }
// the load failed: stop listening
export function abort() { stop(); }

// Long tasks while loading
try {
  if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    observer = new PerformanceObserver((list) => { for (const e of list.getEntries()) longTasks.push({ t: e.startTime, ms: e.duration }); });
    observer.observe({ type: 'longtask', buffered: true });
  } else if (typeof setInterval !== 'undefined') {
    const P = 25;
    let prev = now();
    gapTimer = setInterval(() => { const t = now(); if (t - prev - P > 50) longTasks.push({ t: prev, ms: t - prev - P, gap: true }); prev = t; }, P);
  }
} catch { /* no long tasks then */ }
function stop() {
  if (done) return;
  done = true;
  // the observer's entries arrive after the task: take what is queued, then stop
  try { if (observer) { for (const e of observer.takeRecords()) longTasks.push({ t: e.startTime, ms: e.duration }); observer.disconnect(); } } catch { /* */ }
  if (gapTimer) clearInterval(gapTimer);
}

// the phase that holds most of a task [t, t + ms] (a task often spans marks: chooseTier's await resolves into one
// task that makes the renderer, the terrain and the mountains)
function phaseOf(t, ms) {
  let best = 'module', most = -1, prev = null;
  for (const k of ORDER) {
    if (marks[k] == null) continue;
    if (prev != null) {
      const o = Math.min(t + ms, marks[k]) - Math.max(t, marks[prev]);
      if (o > most) { most = o; best = k; }
    }
    prev = k;
  }
  return best;
}
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

export function report() {
  const at = {}, phases = {};
  let prev = null;
  for (const k of ORDER) {
    if (marks[k] == null) continue;
    at[k] = r1(marks[k]);
    if (prev != null) phases[k] = r1(marks[k] - marks[prev]);
    prev = k;
  }
  let nav = null;
  try {
    const n = perf?.getEntriesByType('navigation')?.[0];
    const fcp = perf?.getEntriesByType('paint')?.find((e) => e.name === 'first-contentful-paint');
    if (n) nav = { html: r1(n.responseEnd), domInteractive: r1(n.domInteractive), domContentLoaded: r1(n.domContentLoadedEventEnd), load: r1(n.loadEventEnd) || null, fcp: r1(fcp?.startTime), type: n.type };
  } catch { /* */ }
  const tasks = longTasks.filter((e) => marks.ready == null || e.t <= marks.ready)
    .map((e) => ({ t: r1(e.t), ms: r1(e.ms), phase: phaseOf(e.t, e.ms), ...(e.gap ? { gap: true } : {}) }));
  const longest = tasks.reduce((a, e) => (!a || e.ms > a.ms ? e : a), null);
  return {
    kind: 'fading-planet-startup', ready: at.ready ?? null, at, phases, extra, nav, serial,
    longTasks: tasks, longest, longTaskSource: observer ? 'longtask' : gapTimer ? 'timer-gaps' : 'none',
    modules: modules.map((m) => ({ name: m.name, import: r1(m.import), build: r1(m.build) })),
  };
}

const api = { mark, imported, built, setSerial, report };
if (typeof window !== 'undefined') window.__fp_startup = api;
export default api;
