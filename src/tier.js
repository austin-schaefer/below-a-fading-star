// Quality tiers and the adaptive pixel ratio (v3 stage 3).
//
// Three tiers. `ctx.quality` carries the tier's name; modules choose what they build from it, and medium builds
// exactly what high builds (every module tests `=== 'low'` or `!== 'low'`), so medium differs from high only in
// what this table sets, all of it changeable at runtime:
//
//   tier    pixel ratio  adaptive floor  shadow map  1%-low budget   builds as
//   high    1.25         1.0             4096²       20 ms (50 fps)  high
//   medium  1.0          0.75            2048²       33 ms (30 fps)  high
//   low     0.85         0.6             2048²       33 ms (30 fps)  low
//
// The pixel ratio is never above the display's own. Bloom (half size), shadow cadence, light slots and the
// frame cap are the same at every tier (stage 2's flags still override them).
//
// Choosing (chooseTier, before the renderer exists): ?q= or ?tier= pins for this load; else the tier pinned in
// the debug panel (localStorage 'fp-tier'); else the device: a phone or 4 cores or fewer is low (as before);
// otherwise the GPU's name (WEBGL_debug_renderer_info, or WebGPU's adapter info where WebGL masks it): a
// discrete GPU is high, an integrated one medium, a software renderer low. When the name says neither
// (Apple silicon, Safari's "Apple GPU", a masked string) it starts high and the first 3 s of full-rate frames
// decide: an average over 1.15 frame intervals of the cap (over 20 ms uncapped) drops to medium.
//
// Adaptive step (makeTier().frame, every rendered frame): when the 1% low over the last 2 s (the mean of the
// slowest 1% of frames, as the profiler reports it) has stayed over the tier's budget for 5 s, the pixel ratio
// steps down 0.1, to the tier's floor; after 20 s with the 1% low under 0.6 of the budget it steps back up
// 0.05, never to a ratio that failed in the last 60 s. Frames under the title and paused cards, in a hidden
// tab, during the bench (unless ?adapt=1) and stalls over a second are not counted. ?adapt=0 turns it off;
// ?budget=<ms> replaces the budget (a test hook: ?budget=1 forces a step down). ?dpr= sets the ratio and
// holds it (no adaptation unless ?adapt=1).
const TIERS = {
  high: { dpr: 1.25, floor: 1.0, shadowMap: 4096, budgetMs: 20 },
  medium: { dpr: 1.0, floor: 0.75, shadowMap: 2048, budgetMs: 33.3 },
  low: { dpr: 0.85, floor: 0.6, shadowMap: 2048, budgetMs: 33.3 },
};
export { TIERS };
const NAMES = ['high', 'medium', 'low'];
const KEY = 'fp-tier';
const STEP_DOWN = 0.1, STEP_UP = 0.05, OVER_MS = 5000, HEADROOM_MS = 20000, HEADROOM = 0.6, FAIL_MS = 60000;
const PROBE_MS = 3000;

// what the GPU's name says: 'discrete' | 'integrated' | 'software' | 'apple' | 'unknown'
export function classifyGpu(name) {
  const s = (name || '').toLowerCase();
  if (!s) return 'unknown';
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(s)) return 'software';
  if (/nvidia|geforce|quadro|rtx|gtx|tesla/.test(s)) return 'discrete';
  if (/radeon\s*(rx|pro|r9|r7|vii)|firepro|\brx\s*\d{3,4}/.test(s)) return 'discrete';
  if (/arc(\(tm\))?\s*a\d{3}/.test(s)) return 'discrete';
  if (/intel|iris|uhd|hd graphics|radeon(\(tm\))? graphics|vega \d+ graphics|adreno|mali|powervr|videocore|tegra/.test(s)) return 'integrated';
  if (/apple/.test(s)) return 'apple';
  return 'unknown';
}

function readPin() { try { const v = localStorage.getItem(KEY); return NAMES.includes(v) ? v : null; } catch { return null; } }
function writePin(v) { try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* storage blocked */ } }

async function gpuName() {
  let webgl = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    webgl = (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER)) || '';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* no WebGL: the renderer will say so */ }
  let webgpu = '';
  if (classifyGpu(webgl) === 'unknown' && navigator.gpu?.requestAdapter) {
    try {
      const adapter = await Promise.race([navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }), new Promise((r) => setTimeout(() => r(null), 400))]);
      const info = adapter?.info || (await adapter?.requestAdapterInfo?.()) || null;
      if (info) webgpu = [info.vendor, info.architecture, info.device, info.description].filter(Boolean).join(' ');
    } catch { /* no adapter */ }
  }
  return { webgl, webgpu };
}

// -> { name, source: 'url' | 'pinned' | 'device' | 'gpu' | 'probe', gpu: { webgl, webgpu, kind }, probe: bool }
export async function chooseTier(url) {
  const asked = url.searchParams.get('tier') || url.searchParams.get('q');
  if (NAMES.includes(asked)) return { name: asked, source: 'url', gpu: null, probe: false };
  const pinned = readPin();
  if (pinned) return { name: pinned, source: 'pinned', gpu: null, probe: false };
  if (navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent)) return { name: 'low', source: 'device', gpu: null, probe: false };
  const g = await gpuName();
  let kind = classifyGpu(g.webgl);
  if (kind === 'unknown' && g.webgpu) kind = classifyGpu(g.webgpu);
  const gpu = { ...g, kind };
  if (kind === 'discrete') return { name: 'high', source: 'gpu', gpu, probe: false };
  if (kind === 'integrated') return { name: 'medium', source: 'gpu', gpu, probe: false };
  if (kind === 'software') return { name: 'low', source: 'gpu', gpu, probe: false };
  return { name: 'high', source: 'probe', gpu, probe: true };
}

export function makeTier(ctx, url, choice) {
  const { renderer } = ctx;
  const num = (k) => { const v = parseFloat(url.searchParams.get(k)); return v > 0 ? v : null; };
  const dprParam = num('dpr'), budgetParam = num('budget');
  const adaptParam = url.searchParams.get('adapt');
  const benchUrl = url.searchParams.get('bench') != null;
  const state = {
    name: choice.name, source: choice.source, gpu: choice.gpu, pinned: readPin(),
    adapt: adaptParam === '1' || (adaptParam !== '0' && !dprParam),
    dpr: 1, base: 1, floor: 1, steps: [], probeMs: null,
  };
  function limits() {
    const T = TIERS[state.name];
    state.base = dprParam || Math.min(devicePixelRatio, T.dpr);
    state.floor = Math.min(state.base, T.floor);
  }
  limits();
  state.dpr = state.base;
  renderer.setPixelRatio(state.dpr);

  // pixel ratio: renderer and composer together (EffectComposer.setPixelRatio resizes every pass's targets)
  function setPixelRatio(pr) {
    state.dpr = Math.round(pr * 100) / 100;
    renderer.setPixelRatio(state.dpr);
    renderer.setSize(innerWidth, innerHeight);
    ctx.post?.composer.setPixelRatio(state.dpr);
    ring.fill(0); n = 0; head = 0; // a new size starts a fresh window
  }

  // high <-> medium changes live (they build the same); to or from low reloads, since low builds less
  function apply(name, source) {
    if (!NAMES.includes(name) || name === state.name) return;
    if (name === 'low' || state.name === 'low') {
      const u = new URL(location.href); u.searchParams.delete('q'); u.searchParams.delete('tier');
      location.replace(u);
      return;
    }
    state.name = name; state.source = source; ctx.quality = name;
    limits();
    ctx.setShadowMapSize?.(shadowMapSize());
    setPixelRatio(state.base);
    log(`tier ${name} (${source})`);
  }
  function pin(name) { // null = auto
    state.pinned = name; writePin(name);
    if (name) apply(name, 'pinned');
    else { const u = new URL(location.href); u.searchParams.delete('q'); u.searchParams.delete('tier'); location.replace(u); }
  }
  const smParam = num('smap');
  function shadowMapSize() { return smParam || TIERS[state.name].shadowMap; }
  const log = (m) => ctx.log?.(m);

  // --- frame-time window: the last 2 s of rendered frames, sampled every 500 ms (no allocation per frame)
  const ring = new Float32Array(512);
  let n = 0, head = 0, last = 0, blockAt = 0, overSince = 0, underSince = 0, probeT = 0, probeSum = 0, probeN = 0;
  const top = new Float32Array(8);
  function low1() {
    if (n < 10) return null;
    const k = Math.min(top.length, Math.max(1, Math.round(n * 0.01)));
    top.fill(0);
    for (let i = 0; i < n; i++) {
      const v = ring[i];
      if (v <= top[k - 1]) continue;
      let j = k - 1; while (j > 0 && top[j - 1] < v) { top[j] = top[j - 1]; j--; }
      top[j] = v;
    }
    let s = 0; for (let i = 0; i < k; i++) s += top[i];
    return s / k;
  }
  const windowFrames = () => Math.min(ring.length, Math.max(30, Math.round(2 * (ctx.pacing?.cap || 60))));
  function reset() { last = 0; n = 0; head = 0; overSince = 0; underSince = 0; }
  function budget() {
    const cap = ctx.pacing?.cap || 0;
    return budgetParam || Math.max(TIERS[state.name].budgetMs, cap > 0 ? 1.25 * 1000 / cap : 0);
  }

  let headEl = null;
  function frame() {
    const now = performance.now();
    const benching = ctx.perf?.bench && !ctx.perf.bench.done;
    if (document.hidden || ctx.pacing?.idle || (benching && adaptParam !== '1')) { last = 0; return; }
    if (last) {
      const dt = now - last;
      if (dt > 1000) { reset(); last = now; return; }
      const w = windowFrames();
      ring[head] = dt; head = (head + 1) % w; if (n < w) n++;
      if (choice.probe && probeT < PROBE_MS) {
        probeT += dt; probeSum += dt; probeN++;
        if (probeT >= PROBE_MS) {
          state.probeMs = Math.round(probeSum / probeN * 10) / 10;
          const cap = ctx.pacing?.cap || 0, slow = cap > 0 ? 1.15 * 1000 / cap : 20;
          if (state.probeMs > slow && state.name === 'high' && !state.pinned) apply('medium', 'probe');
        }
      }
    }
    last = now;
    if (now - blockAt < 500) return;
    blockAt = now;
    if (headEl && ctx.debug?.shown) headEl.textContent = heading();
    if (!state.adapt) return;
    const l = low1();
    if (l == null) return;
    const b = budget();
    if (l > b) {
      underSince = 0;
      overSince ||= now;
      if (now - overSince >= OVER_MS && state.dpr > state.floor + 1e-3) step(Math.max(state.floor, state.dpr - STEP_DOWN), l, now);
    } else if (l < b * HEADROOM && state.dpr < state.base - 1e-3) {
      overSince = 0;
      underSince ||= now;
      const up = Math.min(state.base, state.dpr + STEP_UP);
      const failed = state.steps.some((s) => s.to < s.from && s.from <= up + 1e-3 && now - s.at < FAIL_MS);
      if (now - underSince >= HEADROOM_MS && !failed) step(up, l, now);
    } else { overSince = 0; underSince = 0; }
  }
  function step(to, l, now) {
    const from = state.dpr;
    state.steps.push({ at: Math.round(now), from, to: Math.round(to * 100) / 100, low1Ms: Math.round(l * 10) / 10 });
    if (state.steps.length > 20) state.steps.shift();
    setPixelRatio(to);
    overSince = 0; underSince = 0;
    log(`pixel ratio ${from} -> ${state.dpr} (1% low ${l.toFixed(1)} ms, budget ${budget().toFixed(1)})`);
  }

  function heading() {
    const src = state.pinned ? 'pinned' : state.source === 'url' ? 'url' : `auto: ${state.source}`;
    return `quality · ${state.name} (${src}) · dpr ${state.dpr.toFixed(2)}${state.adapt ? '' : ' fixed'}`;
  }
  // the debug panel's quality rows: the heading shows the tier and the live pixel ratio; one row per choice
  function attach() {
    const d = ctx.debug;
    if (!d?.addToggle) return;
    headEl = d.addHeading?.(heading()) || null;
    const on = (t) => (t === 'auto' ? !state.pinned && state.source !== 'url' : state.pinned === t || (!state.pinned && state.source === 'url' && state.name === t));
    const rows = ['auto', ...NAMES].map((t) => [t, d.addToggle(t, () => on(t), () => { pin(t === 'auto' ? null : t); sync(); })]);
    // one choice: re-mark every row (addToggle only re-marks the clicked one)
    function sync() {
      for (const [t, row] of rows) { const v = on(t); row.firstChild.textContent = v ? 'on' : 'off'; row.classList.toggle('off', !v); }
      if (headEl) headEl.textContent = heading();
    }
  }
  const stats = () => ({
    tier: state.name, source: state.source, pinned: state.pinned, gpu: state.gpu, adapt: state.adapt,
    dpr: state.dpr, base: state.base, floor: state.floor, budgetMs: Math.round(budget() * 10) / 10,
    low1Ms: (() => { const l = low1(); return l == null ? null : Math.round(l * 10) / 10; })(),
    probeMs: state.probeMs, steps: state.steps.slice(), shadowMap: shadowMapSize(),
  });
  return { state, frame, apply, pin, attach, stats, setPixelRatio, shadowMapSize };
}
