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
// The pixel ratio is never above the display's own, and never above 1.0 on a GPU without its own memory (an
// integrated GPU or Apple silicon: classifyGpu says 'integrated' or 'apple'), at medium or high. Bloom (half size), shadow cadence, light slots and the
// frame cap are the same at every tier (stage 2's flags still override them).
//
// Choosing (chooseTier, before the renderer exists): ?q= or ?tier= pins for this load; else the tier pinned in
// the debug panel (localStorage 'fp-tier'); else the device: a phone or 4 cores or fewer is low (as before);
// otherwise the GPU's name (WEBGL_debug_renderer_info, or WebGPU's adapter info where WebGL masks it): a
// discrete GPU is high, an integrated one medium, a software renderer low. When the name says neither
// (Apple silicon, Safari's "Apple GPU", a masked string) it starts high and the first 3 s of full-rate frames
// decide: an average over 1.15 frame intervals of the cap (over 20 ms uncapped) drops to medium.
//
// Adaptive step (makeTier().frame, every rendered frame). A step reallocates every composer target and changes
// the sharpness of the whole image, so it is rare and happens only on steady frames, or once per 20 s when
// the view never holds still:
// - Steady frames are those with the view turning under 0.35 rad/s, moving under 4.5 m/s, for 250 ms. Their
//   1% low over the last 2 s (the mean of the slowest 1% of frames, as the profiler reports it) decides.
// - Down 0.1, to the tier's floor, after 5 s of steady time with that 1% low over the tier's budget. Time
//   spent turning neither counts towards the 5 s nor resets it. If the view has not been steady for 20 s, the
//   1% low of every frame decides instead: over budget for those 20 s, it steps.
// - Up 0.05 after 45 s with the 1% low of every frame (turns too) under 0.6 of the budget, never to a ratio
//   that failed in the last 60 s.
// - After any step, or a tier change, nothing steps either way for 20 s; nor during the tier probe.
// - A stall (a frame over 50 ms and over twice the running mean) is left out of both windows: one long frame
//   is not a slow GPU. Five stalls in a row are: from the fifth on they count, and the mean follows them.
//   Frames under the title and paused cards, in a hidden tab, during the bench (unless
//   ?adapt=1) and gaps over a second are not counted.
// - The step, once due, waits for a steady frame right after a shadow-map redraw (so the reallocation and a
//   redraw never share a frame; after 3 s, any steady frame); a step the turning forced takes the next redraw.
//   Every step is in stats().steps (the profiler's report) with its reason and that wait.
// ?adapt=0 turns it off; ?budget=<ms> replaces the budget (a test hook: ?budget=1 forces a step down). ?dpr=
// sets the ratio and holds it (no adaptation unless ?adapt=1).
const TIERS = {
  high: { dpr: 1.25, floor: 1.0, shadowMap: 4096, budgetMs: 20 },
  medium: { dpr: 1.0, floor: 0.75, shadowMap: 2048, budgetMs: 33.3 },
  low: { dpr: 0.85, floor: 0.6, shadowMap: 2048, budgetMs: 33.3 },
};
export { TIERS };
const NAMES = ['high', 'medium', 'low'];
const KEY = 'fp-tier';
const STEP_DOWN = 0.1, STEP_UP = 0.05, OVER_MS = 5000, HEADROOM_MS = 45000, HEADROOM = 0.6, FAIL_MS = 60000;
const HOLD_MS = 20000, UNSTEADY_MS = 20000, TURN = 0.35, FAST = 4.5, SETTLE_MS = 250, STALL_MS = 50, WAIT_MS = 3000;
const SHARED = ['integrated', 'apple']; // GPUs without their own memory: at most 1.0 at medium and high
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
  const pinned = readPin();
  if (!NAMES.includes(asked) && !pinned && (navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent))) return { name: 'low', source: 'device', gpu: null, probe: false };
  // the GPU's kind also when the tier is pinned: it caps the pixel ratio
  const g = await gpuName();
  let kind = classifyGpu(g.webgl);
  if (kind === 'unknown' && g.webgpu) kind = classifyGpu(g.webgpu);
  const gpu = { ...g, kind };
  if (NAMES.includes(asked)) return { name: asked, source: 'url', gpu, probe: false };
  if (pinned) return { name: pinned, source: 'pinned', gpu, probe: false };
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
    const shared = SHARED.includes(state.gpu?.kind) && state.name !== 'low';
    state.base = dprParam || Math.min(devicePixelRatio, shared ? Math.min(1, T.dpr) : T.dpr);
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
    reset(); // a new size starts a fresh window
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
    heldAt = performance.now(); pending = null;
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

  // --- frame-time windows: the last 2 s of steady frames and of every frame, decided on every 500 ms (no
  // allocation per frame)
  const ringS = new Float32Array(512), ringA = new Float32Array(512);
  let nS = 0, headS = 0, nA = 0, headA = 0;
  let last = 0, blockAt = 0, probeT = 0, probeSum = 0, probeN = 0;
  let overMs = 0, allOverMs = 0, underMs = 0, heldAt = -Infinity, stillSince = 0, mean = 0;
  let blockFrames = 0, blockSteady = 0, lastYaw = null, lastPitch = 0, lastRedraws = -1, stalls = 0, stallRun = 0;
  let pending = null; // { to, l, why, at }
  const top = new Float32Array(8);
  function low1(ring = ringA, n = nA) {
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
  const windowFrames = () => Math.min(ringA.length, Math.max(30, Math.round(2 * (ctx.pacing?.cap || 60))));
  function reset() { last = 0; nS = 0; headS = 0; nA = 0; headA = 0; overMs = 0; allOverMs = 0; underMs = 0; blockFrames = 0; blockSteady = 0; }
  function budget() {
    const cap = ctx.pacing?.cap || 0;
    return budgetParam || Math.max(TIERS[state.name].budgetMs, cap > 0 ? 1.25 * 1000 / cap : 0);
  }

  let headEl = null;
  function frame() {
    const now = performance.now();
    const benching = ctx.perf?.bench && !ctx.perf.bench.done;
    // how the view moved since the last frame (this runs before controls.update, so it sees the last frame's turn)
    const pl = ctx.player;
    let steady = true;
    if (pl) {
      const dtS = last ? Math.max(1e-3, (now - last) / 1000) : 0;
      if (lastYaw != null && dtS) {
        const rate = (Math.abs(pl.yaw - lastYaw) + Math.abs(pl.pitch - lastPitch)) / dtS;
        if (rate > TURN || (pl.speed || 0) > FAST) stillSince = now;
      }
      lastYaw = pl.yaw; lastPitch = pl.pitch;
      steady = now - stillSince >= SETTLE_MS;
    }
    const redraws = ctx.shadowCadence?.stats.redraws ?? 0, justRedrew = redraws !== lastRedraws;
    lastRedraws = redraws;
    if (document.hidden || ctx.pacing?.idle || (benching && adaptParam !== '1')) { last = 0; return; }
    if (last) {
      const dt = now - last;
      if (dt > 1000) { reset(); last = now; return; }
      const long = dt > STALL_MS && mean > 0 && dt > 2 * mean;
      stallRun = long ? stallRun + 1 : 0;
      const stall = long && stallRun < 5; // five in a row is the GPU's new pace, not a stall
      if (stall) stalls++;
      else {
        mean = mean ? mean + (dt - mean) * 0.05 : dt;
        const w = windowFrames();
        ringA[headA] = dt; headA = (headA + 1) % w; if (nA < w) nA++;
        if (steady) { ringS[headS] = dt; headS = (headS + 1) % w; if (nS < w) nS++; }
        blockFrames++; if (steady) blockSteady++;
      }
      if (choice.probe && probeT < PROBE_MS) {
        // A stall is not a slow GPU: right after "Go out" the first frames compile shaders and upload textures
        // (100-900 ms each), which would drag the mean past the threshold on a fast machine. Frames over 250 ms
        // are left out of the probe, so it measures 3 s of ordinary frames.
        if (dt <= 250) { probeT += dt; probeSum += dt; probeN++; }
        if (probeT >= PROBE_MS) {
          state.probeMs = Math.round(probeSum / probeN * 10) / 10;
          const cap = ctx.pacing?.cap || 0, slow = cap > 0 ? 1.15 * 1000 / cap : 20;
          if (state.probeMs > slow && state.name === 'high' && !state.pinned) apply('medium', 'probe');
          else heldAt = now; // the probe's own frames start no step
        }
      }
    }
    last = now;
    // a due step waits for the cheapest frame: steady, and right after a shadow redraw
    // (a steady or headroom step only ever on a steady frame; one the turning itself forced, at the next redraw)
    const late = now - pending?.at > WAIT_MS;
    if (pending && (pending.why === 'unsteady' ? justRedrew || late : steady && (justRedrew || late))) {
      step(pending, now, justRedrew, steady);
    }
    if (now - blockAt < 500) return;
    const blockMs = blockAt ? Math.min(1000, now - blockAt) : 0;
    blockAt = now;
    if (headEl && ctx.debug?.shown) headEl.textContent = heading();
    const wasSteady = blockFrames > 0 && blockSteady * 2 >= blockFrames;
    blockFrames = 0; blockSteady = 0;
    if (!state.adapt || pending) return;
    if ((choice.probe && probeT < PROBE_MS) || now - heldAt < HOLD_MS) { overMs = 0; allOverMs = 0; underMs = 0; return; }
    const b = budget(), lS = low1(ringS, nS), lA = low1(ringA, nA);
    const canDown = state.dpr > state.floor + 1e-3, down = Math.max(state.floor, state.dpr - STEP_DOWN);
    // down, on steady frames: turning pauses the count
    if (wasSteady && lS != null) overMs = lS > b ? overMs + blockMs : 0;
    // down, when the view never holds still: every frame, over a longer window
    // (a steady block resets it, so 20 s of it are 20 s without holding still)
    if (!wasSteady && lA != null) allOverMs = lA > b ? allOverMs + blockMs : 0;
    else allOverMs = 0;
    // up: every frame, turns included, well under the budget
    underMs = lA != null && lA < b * HEADROOM && state.dpr < state.base - 1e-3 ? underMs + blockMs : 0;
    if (canDown && overMs >= OVER_MS) pending = { to: down, l: lS, why: 'steady', at: now };
    else if (canDown && allOverMs >= UNSTEADY_MS) pending = { to: down, l: lA, why: 'unsteady', at: now };
    else if (underMs >= HEADROOM_MS) {
      const up = Math.min(state.base, state.dpr + STEP_UP);
      const failed = state.steps.some((s) => s.to < s.from && s.from <= up + 1e-3 && now - s.at < FAIL_MS);
      if (!failed) pending = { to: up, l: lA, why: 'headroom', at: now };
    }
  }
  function step(p, now, afterRedraw, steady) {
    const from = state.dpr;
    pending = null;
    state.steps.push({ at: Math.round(now), from, to: Math.round(p.to * 100) / 100, low1Ms: Math.round(p.l * 10) / 10, why: p.why, waitMs: Math.round(now - p.at), afterRedraw, steady });
    if (state.steps.length > 20) state.steps.shift();
    const t0 = performance.now();
    setPixelRatio(p.to);
    heldAt = now;
    log(`pixel ratio ${from} -> ${state.dpr} (${p.why}; 1% low ${p.l.toFixed(1)} ms, budget ${budget().toFixed(1)}; waited ${Math.round(now - p.at)} ms${afterRedraw ? ', after a shadow redraw' : ''}; resize ${(performance.now() - t0).toFixed(1)} ms)`);
  }

  function heading() {
    const src = state.source === 'url' ? (state.pinned ? 'url, over the pin' : 'url') : state.pinned ? 'pinned' : `auto: ${state.source}`; // the source that won
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
    steadyLow1Ms: (() => { const l = low1(ringS, nS); return l == null ? null : Math.round(l * 10) / 10; })(),
    stalls, pending: pending ? { ...pending } : null, probeMs: state.probeMs, steps: state.steps.slice(), shadowMap: shadowMapSize(),
  });
  return { state, frame, apply, pin, attach, stats, setPixelRatio, shadowMapSize, budget };
}
