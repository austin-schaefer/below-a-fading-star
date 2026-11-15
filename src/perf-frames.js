// The frame yardstick (v13 P1): what the bench keeps of every frame and what it makes of it at the end. perf.js
// wires it in; nothing here runs unless the bench (or the recorder, for dist) is running.
// - dist(ms, n): the median, 95th, 99th and worst of a list of frame times, and the counts over 2x and 3x the median
//   (the recorder's numbers, shared)
// - makeFrameLog(cap): per frame, preallocated: JS ms (frameBegin to frameEnd), the interval since the last frame,
//   the leg and the place, the largest row (module or unowned cost) and callback in it, what is left unattributed,
//   and what else happened (EV bits: a shadow redraw, a plant or rock repack, a far.js pack, an upload, a compile)
// - makeDrawCost(ctx, mods): calls and triangles per module in the colour and shadow passes, on asked frames only
//   (heights-cost's method: each drawable's onBeforeRender / onAfterRender and its shadow pair read renderer.info)
// - geometryBytes(scene, mods), jsHeap(): memory
export const EV = { shadow: 1, plants: 2, rocks: 4, far: 8, texFirst: 16, texData: 32, geometry: 64, program: 128, teleport: 256, tier: 512, buffer: 1024, station: 2048 }; // station: a draw-cost station's frames (hooked; left out of the distributions)
const EV_NAMES = Object.entries(EV);
export const evNames = (ev) => EV_NAMES.filter(([, b]) => ev & b).map(([k]) => k);

const r1 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 100) / 100);
const MB = (b) => Math.round((b / 1048576) * 10) / 10;

export function dist(ms, n = ms.length) {
  if (!n) return { frames: 0, meanMs: null, medianMs: null, p95Ms: null, p99Ms: null, worstMs: null, over2xMedian: 0, over3xMedian: 0 };
  const s = Float32Array.from(ms.subarray ? ms.subarray(0, n) : ms.slice(0, n)).sort();
  const q = (f) => s[Math.min(n - 1, Math.floor(f * n))];
  const med = q(0.5);
  let o2 = 0, o3 = 0, sum = 0;
  for (let i = 0; i < n; i++) { const v = ms[i]; sum += v; if (v > 2 * med) o2++; if (v > 3 * med) o3++; }
  return { frames: n, meanMs: r2(sum / n), medianMs: r2(med), p95Ms: r2(q(0.95)), p99Ms: r2(q(0.99)), worstMs: r2(s[n - 1]), over2xMedian: o2, over3xMedian: o3 };
}

export function makeFrameLog(cap) {
  const f32 = () => new Float32Array(cap);
  return {
    n: 0, cap, truncated: false,
    js: f32(), iv: f32(), t: f32(), x: f32(), y: f32(), z: f32(), un: f32(), topMs: f32(), cbMs: f32(), bufKB: f32(),
    leg: new Uint8Array(cap), top: new Int16Array(cap), cb: new Int16Array(cap), ev: new Uint16Array(cap), tex: new Uint16Array(cap),
    far: new Uint32Array(cap), programs: new Uint16Array(cap),
  };
}

// the frames of one leg (or all, leg < 0) as a Float32Array of one field, less those with an event in `skip`
export function legValues(L, field, leg, skip = 0) {
  const a = L[field], take = (i) => (leg < 0 || L.leg[i] === leg) && !(L.ev[i] & skip);
  let k = 0; for (let i = 0; i < L.n; i++) if (take(i)) k++;
  const out = new Float32Array(k); k = 0;
  for (let i = 0; i < L.n; i++) if (take(i)) out[k++] = a[i];
  return out;
}

// every frame whose JS is over 50 ms or 3x the run's median, the worst `keep` of them, by JS ms
export function hitchLog(L, legs, rows, cbs, keep = 60) {
  const med = dist(L.js, L.n).medianMs || 0;
  const thr = Math.min(50, 3 * med);
  const idx = [];
  for (let i = 0; i < L.n; i++) if (L.js[i] > thr) idx.push(i);
  idx.sort((a, b) => L.js[b] - L.js[a]);
  // the ten slowest frames whatever the rule says, so a run with no hitch still names its worst
  const ten = [];
  for (let i = 0; i < L.n; i++) { if (ten.length < 10) { ten.push(i); ten.sort((a, b) => L.js[b] - L.js[a]); } else if (L.js[i] > L.js[ten[9]]) { ten[9] = i; ten.sort((a, b) => L.js[b] - L.js[a]); } }
  const row = (i) => ({
    ms: r1(L.js[i]), intervalMs: r1(L.iv[i]), t: r2(L.t[i]), leg: legs[L.leg[i]], x: Math.round(L.x[i]), y: Math.round(L.y[i]), z: Math.round(L.z[i]),
    top: L.top[i] >= 0 ? rows[L.top[i]]?.name ?? '?' : null, topMs: r1(L.topMs[i]),
    callback: L.cb[i] >= 0 ? cbs[L.cb[i]]?.label ?? '?' : null, callbackMs: r1(L.cbMs[i]),
    unattributedMs: r1(L.un[i]),
    events: evNames(L.ev[i]), texUploads: L.tex[i], bufferKB: r1(L.bufKB[i]), farInstances: L.far[i], programs: L.programs[i],
  });
  return { rule: `JS over ${r1(thr)} ms (50 ms, or 3x the run's median ${med} ms, whichever is less)`, thresholdMs: r1(thr), count: idx.length, worst: idx.slice(0, keep).map(row), worstTen: ten.map(row) };
}

// A module's documented budget (world-code, "Light and budgets"): about 25 draw calls and 400k triangles in view, colour
// pass. overBudget() names every module past it (not `core:` rows: terrain and the sky are shared costs, not a module's) at any station; the bench report prints them. No gate.
export const MODULE_BUDGET = { calls: 25, tris: 400000 };
export function overBudget(draws) {
  const out = [];
  for (const st of draws || []) for (const [module, calls, tris] of st.modules || []) if (!module.startsWith('core:') && (calls > MODULE_BUDGET.calls || tris > MODULE_BUDGET.tris)) out.push({ module, station: st.name, calls, tris });
  return out.sort((a, b) => a.module.localeCompare(b.module) || a.station.localeCompare(b.station));
}

// calls and triangles per module, on the frames asked for (begin()); the colour pass on the next render, the shadow
// pass on the next render that redraws the map. The hooks go on every drawable at begin() and come off when the station
// is done, so no other frame pays for them (the station's frames carry EV.station). The post chain's full-screen passes
// are the station's `other`.
export function makeDrawCost(ctx, mods) {
  const info = ctx.renderer.info.render;
  const owner = new Map();
  for (const [name, m] of mods) if (m.world) for (const o of m.objects) o.traverse((c) => owner.set(c, name));
  const entries = new Map(), list = [];
  const entry = (name) => { let e = entries.get(name); if (!e) { e = { name, c: 0, t: 0, sc: 0, st: 0 }; entries.set(name, e); list.push(e); } return e; };
  const st = { on: false, shadowOn: false, hooked: 0 };
  const nameOf = (o) => {
    const src = o.userData.farOf || o; // a far.js stand-in is credited to the module whose mesh it draws
    for (let p = src; p; p = p.parent) { const n = owner.get(p); if (n) return n; }
    return 'core:' + (src.name || src.geometry?.type || src.type);
  };
  const hooked = [];
  function hook(o) {
    if (o.__fpDraw || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
    o.__fpDraw = true; st.hooked++;
    const e = entry(nameOf(o));
    let c0 = 0, t0 = 0, s0 = 0, u0 = 0;
    const br = o.onBeforeRender, ar = o.onAfterRender, bs = o.onBeforeShadow, as = o.onAfterShadow;
    hooked.push([o, br, ar, bs, as]);
    o.onBeforeRender = function (a, b, c, d, f, g) { br.call(this, a, b, c, d, f, g); if (st.on) { c0 = info.calls; t0 = info.triangles; } };
    o.onAfterRender = function (a, b, c, d, f, g) { ar.call(this, a, b, c, d, f, g); if (st.on) { e.c += info.calls - c0; e.t += info.triangles - t0; } };
    if (bs && as) {
      o.onBeforeShadow = function (a, b, c, d, f, g, h) { bs.call(this, a, b, c, d, f, g, h); if (st.shadowOn) { s0 = info.calls; u0 = info.triangles; } };
      o.onAfterShadow = function (a, b, c, d, f, g, h) { as.call(this, a, b, c, d, f, g, h); if (st.shadowOn) { e.sc += info.calls - s0; e.st += info.triangles - u0; } };
    }
  }
  // put back exactly what was there (own properties: a far.js stand-in's is overwritten each frame anyway)
  function unhookAll() {
    for (const [o, br, ar, bs, as] of hooked) {
      o.onBeforeRender = br; o.onAfterRender = ar;
      if (bs && as) { o.onBeforeShadow = bs; o.onAfterShadow = as; }
      delete o.__fpDraw;
    }
    hooked.length = 0;
  }
  let cur = null;
  return {
    get hooked() { return st.hooked; }, get live() { return hooked.length; },
    get busy() { return !!cur; },
    begin(meta) { ctx.scene.traverse(hook); for (const e of list) { e.c = 0; e.t = 0; e.sc = 0; e.st = 0; } st.on = true; st.shadowOn = true; cur = { ...meta, frames: 0 }; },
    // after each render while a station is open: the frame's totals and whether the shadow map was redrawn in it
    end(calls, tris, shadowDrew) {
      if (!cur) return null;
      cur.frames++;
      if (st.on) { st.on = false; cur.calls = calls; cur.tris = tris; cur.shadowInFrame = shadowDrew; }
      if (st.shadowOn && (shadowDrew || cur.frames > 90)) { st.shadowOn = false; cur.shadowRedrawn = shadowDrew; }
      if (st.on || st.shadowOn) return null;
      let c = 0, t = 0, sc = 0, stt = 0;
      for (const e of list) { c += e.c; t += e.t; sc += e.sc; stt += e.st; }
      const rows = list.filter((e) => e.c || e.sc).map((e) => [e.name, e.c, e.t, e.sc, e.st]).sort((a, b) => (b[2] + b[4]) - (a[2] + a[4]));
      const out = {
        ...cur, colour: { calls: c, tris: t }, shadow: cur.shadowRedrawn ? { calls: sc, tris: stt } : null,
        // what the station frame drew that no hooked object did: the post chain's passes (and the shadow pass when it fell on that frame)
        other: { calls: cur.calls - c - (cur.shadowInFrame ? sc : 0), tris: cur.tris - t - (cur.shadowInFrame ? stt : 0) },
        modules: rows,
      };
      cur = null;
      unhookAll();
      return out;
    },
  };
}

// bytes in every geometry's attributes and index (and instanced meshes' matrices and colours), per module by the
// profiler's tagging; far.js's stand-ins (their own per-instance copies) as `far`, anything else as `core`. The CPU
// copies three keeps: the GPU holds the same bytes once each is drawn. Shared attributes count once.
export function geometryBytes(scene, mods, top = 12) {
  const owner = new Map();
  for (const [name, m] of mods) if (m.world) for (const o of m.objects) owner.set(o, name);
  const seen = new Set(), by = {};
  let total = 0, n = 0;
  const add = (name, a) => {
    if (!a) return;
    const key = a.isInterleavedBufferAttribute ? a.data : a, arr = key.array;
    if (!arr || seen.has(key)) return;
    seen.add(key); n++;
    by[name] = (by[name] || 0) + arr.byteLength; total += arr.byteLength;
  };
  (function walk(o, name) {
    const nm = owner.get(o) || (o.userData?.farOf ? 'far' : name);
    const g = o.geometry;
    if (g && g.attributes) {
      for (const k in g.attributes) add(nm, g.attributes[k]);
      add(nm, g.index);
      for (const k in g.morphAttributes) for (const a of g.morphAttributes[k]) add(nm, a);
    }
    if (o.isInstancedMesh) { add(nm, o.instanceMatrix); add(nm, o.instanceColor); }
    for (const c of o.children) walk(c, nm);
  })(scene, 'core');
  const sorted = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const byModule = Object.fromEntries(sorted.slice(0, top).map(([k, v]) => [k, MB(v)]));
  const rest = sorted.slice(top).reduce((s, [, v]) => s + v, 0);
  if (rest) byModule.rest = MB(rest);
  return { totalMB: MB(total), buffers: n, byModule };
}

// The JS heap where the browser says: Chromium's performance.memory (rounded by the browser unless it was started with
// --enable-precise-memory-info, as tools/bench-report.mjs does); performance.measureUserAgentSpecificMemory only on a
// cross-origin-isolated page, which this site is not; Firefox and Safari give neither.
export function jsHeap() {
  const m = performance.memory;
  if (m && m.usedJSHeapSize) return { api: 'performance.memory', usedMB: MB(m.usedJSHeapSize), totalMB: MB(m.totalJSHeapSize), limitMB: MB(m.jsHeapSizeLimit) };
  return { api: null, isolated: !!self.crossOriginIsolated };
}
// on an isolated page, the precise figure arrives later (it waits for a garbage collection): written into `into` then
export function jsHeapPrecise(into) {
  if (!self.crossOriginIsolated || typeof performance.measureUserAgentSpecificMemory !== 'function') return;
  into.precise = 'pending';
  performance.measureUserAgentSpecificMemory().then((r) => { into.precise = { api: 'measureUserAgentSpecificMemory', MB: MB(r.bytes) }; }).catch(() => { into.precise = null; });
}

// --- reading a finished bench (the panel, the copy, tools/bench-report.mjs). Plain functions of the result, no DOM.
const top = (o, k) => Object.fromEntries(Object.entries(o || {}).slice(0, k));
const kfmt = (t) => (t >= 1e6 ? `${(t / 1e6).toFixed(2)}M` : `${Math.round(t / 1000)}k`);
const LEG_WORDS = { route: 'the round', top: 'on the Span\'s deck', wake: 'waking at the gate' };
const UNOWNED = ['render', 'shadow.pass', 'far', 'frame', 'core', 'controls', 'sky', 'hud', 'post.update', 'shadow.cadence', 'lights.slots', 'bench.drive', 'perf'];

// The summary as lines of text, the trustworthy numbers first: JS per frame, the hitches, the rows, memory, draws.
export function benchLines(res, { hitches = 10, rows = 14, modules = 4 } = {}) {
  if (!res.legs) return [`a bench from before v13 (no legs): avg ${res.summary?.avgFrameMs} ms · 1% low ${res.summary?.low1FrameMs} ms`];
  const L = res.legs, names = Object.keys(L);
  const d = (x) => `median ${x.medianMs} · 95th ${x.p95Ms} · 99th ${x.p99Ms} · worst ${x.worstMs} · over 2× ${x.over2xMedian} · over 3× ${x.over3xMedian}`;
  const out = [];
  out.push(`${names.map((n) => `${L[n].seconds} s ${LEG_WORDS[n] || n}`).join(', ')} · q=${res.quality} · dpr ${res.dpr} · ${res.renderSize.buffer.join('×')} px`);
  out.push('JS a frame, ms (the page\'s own work; trustworthy):');
  for (const n of names) out.push(`  ${n} (${L[n].frames} frames): ${d(L[n].js)}`);
  out.push(`  all: ${d(res.js)}`);
  out.push(`frame interval, ms (the GPU and the browser too; not trustworthy headless): ${names.map((n) => `${n} median ${L[n].interval.medianMs} · worst ${L[n].interval.worstMs}`).join(' · ')}`);
  const h = res.hitches;
  out.push(`hitches, ${h.rule}: ${h.count}`);
  const list = h.worst.length ? h.worst : (h.worstTen || []);
  if (!h.worst.length && list.length) out.push('  none; the ten slowest frames:');
  list.slice(0, hitches).forEach((w, i) => out.push(`  ${i + 1}. ${w.ms} ms, ${w.leg} at ${w.t} s (${w.x}, ${w.y}, ${w.z}): ${w.top} ${w.topMs}${w.callback ? ` · ${w.callback} ${w.callbackMs}` : ''}${w.events.length ? ` · ${w.events.join(', ')}` : ''}${w.programs ? ` · ${w.programs} programs` : ''}${w.farInstances ? ` · far ${w.farInstances}` : ''}${w.bufferKB ? ` · ${w.bufferKB} KB sent` : ''}`));
  const u = res.unattributed;
  out.push(`unattributed (no row names it): ${u.medianUnattributedMs} ms of the median frame's ${u.medianFrameMs} · ${u.shareOfAllJs != null ? `${Math.round(u.shareOfAllJs * 1000) / 10}% of all JS` : ''} · main.js's own (frame) ${u.mainOwnMs ?? '–'} ms`);
  out.push(`rows, ms a frame (${names.join(' / ')}):`);
  const r0 = L[names[0]].rows || {};
  const keys = Object.keys(r0).filter((k) => r0[k] >= 0.01).slice(0, rows);
  for (const k of UNOWNED) if (!keys.includes(k) && r0[k] != null) keys.push(k);
  out.push('  ' + keys.map((k) => `${k} ${names.map((n) => L[n].rows?.[k] ?? 0).join('/')}`).join(' · '));
  const m = res.memory || {}, s = m.start || {}, e = m.end || {};
  const heap = (x) => (x?.jsHeap?.api ? `${x.jsHeap.usedMB}` : null);
  out.push(`memory, start → end: JS heap ${heap(s) && heap(e) ? `${heap(s)} → ${heap(e)} MB (${e.jsHeap.api})` : 'not given by this browser'}`);
  if (e.geometry) out.push(`  geometry ${s.geometry?.totalMB} → ${e.geometry.totalMB} MB: ${Object.entries(top(e.geometry.byModule, 6)).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  if (e.gpu) out.push(`  textures ${e.gpu.textureMB} MB · renderbuffers ${e.gpu.renderbufferMB} · canvas ${e.gpu.backbufferMB} · ${e.counts?.programs} programs`);
  out.push('draws at the stations, calls / triangles, colour (shadow):');
  for (const st of res.draws || []) {
    out.push(`  ${st.name} (${st.x}, ${st.y}, ${st.z}): ${st.colour.calls} / ${kfmt(st.colour.tris)}${st.shadow ? ` (${st.shadow.calls} / ${kfmt(st.shadow.tris)})` : ''} · other ${st.other.calls}`);
    out.push('    ' + st.modules.slice(0, modules).map(([k, c, t, sc, stt]) => `${k} ${c}/${kfmt(t)} (${sc}/${kfmt(stt)})`).join(' · '));
  }
  const g = res.summary.gpuMs;
  out.push(`gpu ${g === 'n/a' ? 'n/a (no timer query in this browser)' : g ? `${g.total} ms (render ${g.render}, shadow ${g.shadow ?? '–'}, post ${g.post})` : 'no results'} · the round as before v13: avg ${res.summary.avgFrameMs} ms · 1% low ${res.summary.low1FrameMs} ms`);
  return out;
}

// The short JSON the panel's Copy gives: everything above, small enough to paste into an issue (about 9 KB)
export function benchBrief(res) {
  const mem = (x) => x && { jsHeap: x.jsHeap, geometry: x.geometry && { totalMB: x.geometry.totalMB, byModule: top(x.geometry.byModule, 8) }, gpu: x.gpu && { totalMB: x.gpu.totalMB, textureMB: x.gpu.textureMB }, counts: x.counts };
  const legs = {};
  for (const [k, v] of Object.entries(res.legs || {})) {
    const rows = top(v.rows, 12);
    for (const u of UNOWNED) if (v.rows?.[u] != null) rows[u] = v.rows[u];
    legs[k] = { seconds: v.seconds, frames: v.frames, js: v.js, interval: v.interval, unattributedMs: v.unattributedMs, rows };
  }
  return {
    kind: 'fading-planet-bench-brief', version: res.version, date: res.date, ...(res.commit ? { commit: res.commit } : {}), ...(res.machine ? { machine: res.machine } : {}),
    userAgent: res.userAgent, quality: res.quality, dpr: res.dpr, devicePixelRatio: res.devicePixelRatio, renderSize: res.renderSize, url: res.url, gpuTimer: res.gpuTimer,
    tierSteps: res.tier?.steps?.length ?? null,
    summary: { avgFps: res.summary.avgFps, low1Fps: res.summary.low1Fps, avgFrameMs: res.summary.avgFrameMs, low1FrameMs: res.summary.low1FrameMs, frames: res.summary.frames, calls: res.summary.calls, tris: res.summary.tris, gpuMs: res.summary.gpuMs },
    js: res.js, interval: res.interval, legs, unattributed: res.unattributed,
    hitches: res.hitches && { rule: res.hitches.rule, count: res.hitches.count, worst: res.hitches.worst.slice(0, 10), worstTen: res.hitches.worstTen },
    memory: { start: mem(res.memory?.start), end: mem(res.memory?.end) },
    draws: (res.draws || []).map((s) => ({ name: s.name, x: s.x, y: s.y, z: s.z, calls: s.calls, tris: s.tris, colour: s.colour, shadow: s.shadow, other: s.other, modules: s.modules.filter((m, i) => i < 6 || m[1] > MODULE_BUDGET.calls || m[2] > MODULE_BUDGET.tris) })), // the top six, and any module over its budget
  };
}
