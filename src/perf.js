// Instruments for the v3 performance pass. Measures; changes nothing unless a toggle is flipped.
// - Profiler (?perf=1, or the debug panel's "profiler" row): frame time (rolling ~2 s average and 1% low),
//   CPU per module inside the update loop, GPU time per pass (EXT_disjoint_timer_query_webgl2 where the
//   browser has it, else n/a), draw calls, triangles, memory counts, lights, pixel ratio and render size.
// - Bench (?bench=1 for 45 s, ?bench=<seconds> for a shorter run of the same path): a fixed camera path,
//   spawn → causeway → the tarn's shore → the fen's edge → spawn, controls off, the gutter held off,
//   sampled every 500 ms, then a summary with the JSON to download. ctx.perf.report() returns it all.
// - Recorder (?record=<seconds>, or ctx.perf.record(seconds) from the console; implies ?perf=1): once the walker
//   is out (the card hidden, the pointer locked or drag-look or touch engaged) it records every frame's duration,
//   timestamp and yaw into preallocated typed arrays, and every 250 ms a sample (GPU passes, draw calls, pixel
//   ratio, tier steps, shadow redraws, camera, memory counts, uploads, CPU per module). Idle time is not counted.
//   At the end it releases the pointer lock and shows the bench's panel with a summary and the record as JSON.
// - Toggles (debug panel): each world module on/off (its scene objects hidden, its updates skipped),
//   bloom and shadows. Also ?bloom=0 and ?shadows=0.
// Modules are attributed by building each against forModule(name), a Proxy of ctx that tags its
// registerUpdate callbacks, the objects it adds to the scene and its colliders (c.mod). Objects a module parents elsewhere
// (under another object, the camera) are not tagged, so its toggle misses them.
import { SPAWN, WATER } from './world.js';

// The bench walks the causeway as it was in v3, pinned here (v4 systems) so that v4's reroute of CAUSEWAY
// (from the saddle to the pit, wilderness-v4-placement.md) leaves bench numbers comparable with v3's.
const BENCH_CAUSEWAY = [
  { x: 8, z: 30 }, { x: -40, z: 22 }, { x: -90, z: 2 }, { x: -140, z: -30 }, { x: -185, z: -72 }, { x: -222, z: -110 },
];
import { installGpuMem } from './gpumem.js';

const BLOCK_MS = 500; // one sample block
const WINDOW = 4;     // blocks in the rolling window (~2 s)
const SAMPLE_MS = 250; // the recorder's sample length

const r1 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null || !isFinite(v) ? null : Math.round(v * 100) / 100);

// avg and "1% low" (the mean of the slowest 1% of frames, at least one) of a list of frame times (ms)
function frameStats(ms) {
  if (!ms.length) return { frames: 0, avgMs: null, low1Ms: null, fps: null, low1Fps: null };
  let sum = 0; for (const v of ms) sum += v;
  const sorted = ms.slice().sort((a, b) => b - a), n = Math.max(1, Math.round(sorted.length * 0.01));
  let worst = 0; for (let i = 0; i < n; i++) worst += sorted[i];
  const avg = sum / ms.length, low = worst / n;
  return { frames: ms.length, avgMs: r2(avg), low1Ms: r2(low), fps: r1(1000 / avg), low1Fps: r1(1000 / low) };
}

export function createPerf(ctx) {
  const url = new URL(location.href);
  const benchParam = url.searchParams.get('bench');
  const { renderer, scene } = ctx;

  // --- modules: name -> { cpu (ms this block), enabled, world, objects, hidden }
  const mods = new Map();
  function mod(name) {
    let m = mods.get(name);
    if (!m) { m = { name, cpu: 0, tot: 0, enabled: true, world: false, updates: 0, objects: new Set(), hidden: null }; mods.set(name, m); }
    return m;
  }
  const rawRegister = ctx.registerUpdate;
  // Each callback is also timed on its own, labelled by the file:line that registered it, so the report
  // can say which callback inside a module costs what (report().callbacks, the bench's cpuCallbacks).
  const cbs = [];
  function site() {
    const lines = (new Error().stack || '').split('\n').slice(1);
    for (const l of lines) {
      const m = l.match(/\/src\/([^?#)]+?\.js)(?:\?[^:)]*)?:(\d+)/);
      if (m && !/^(perf|main)\.js$/.test(m[1])) return `${m[1]}:${m[2]}`;
    }
    return '?';
  }
  function wrapUpdate(m, fn) {
    m.updates++;
    const cb = { label: `${m.name} ${site()}`, cpu: 0 };
    cbs.push(cb);
    return (dt, t) => {
      if (!m.enabled) return;
      if (!api.active) { fn(dt, t); return; }
      const t0 = performance.now();
      fn(dt, t);
      const d = performance.now() - t0;
      m.cpu += d; m.tot += d; cb.cpu += d;
    };
  }
  // updates registered outside a module build (terrain, sky, controls...) count as 'core'
  const core = mod('core');
  ctx.registerUpdate = (fn, meta) => rawRegister(wrapUpdate(core, fn), meta);

  function forModule(name) {
    const m = mod(name); m.world = true;
    const register = (fn, meta) => rawRegister(wrapUpdate(m, fn), meta);
    const add = (...objs) => { for (const o of objs) m.objects.add(o); scene.add(...objs); return scene; };
    // each collider carries the module that registered it (c.mod), so a block can be traced to its owner
    const addCollider = (c) => { if (c && c.mod === undefined) c.mod = name; return ctx.addCollider(c); };
    const sceneProxy = new Proxy(scene, {
      get(target, prop) {
        if (prop === 'add') return add;
        const v = Reflect.get(target, prop, target);
        return typeof v === 'function' ? v.bind(target) : v;
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
    return new Proxy(ctx, {
      get(target, prop) {
        if (prop === 'registerUpdate') return register;
        if (prop === 'scene') return sceneProxy;
        if (prop === 'addCollider' && target.addCollider) return addCollider;
        return Reflect.get(target, prop, target);
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
  }

  function setModule(name, on) {
    const m = mods.get(name);
    if (!m || !m.world || m.enabled === on) return;
    m.enabled = on;
    if (!on) { m.hidden = new Map(); for (const o of m.objects) { m.hidden.set(o, o.visible); o.visible = false; } }
    else { for (const o of m.objects) o.visible = m.hidden?.has(o) ? m.hidden.get(o) : true; m.hidden = null; }
  }

  // --- GPU timer queries. Only one TIME_ELAPSED query can be open, so passes are timed in sequence and
  // the shadow map (rendered inside the render pass) splits the render pass's query in two.
  const gl = renderer.getContext();
  // ?gpu=0 behaves as if the extension were missing (the test checks the n/a path that way)
  const ext = url.searchParams.get('gpu') !== '0' && typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;
  const gpu = { ok: !!ext, open: null, frame: null, pending: [], free: [] };
  function gpuBegin(label) {
    if (!gpu.ok || !api.active) return;
    if (gpu.open) gpuEnd();
    const q = gpu.free.pop() || gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
    gpu.open = { q, label };
  }
  function gpuEnd() {
    if (!gpu.open) return;
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    (gpu.frame ||= []).push(gpu.open);
    gpu.open = null;
  }
  function gpuEndFrame() {
    if (!gpu.ok) return;
    gpuEnd();
    if (gpu.frame) gpu.pending.push(gpu.frame);
    gpu.frame = null;
    while (gpu.pending.length > 20) for (const e of gpu.pending.shift()) gl.deleteQuery(e.q);
  }
  function gpuPoll() {
    if (!gpu.ok || !gpu.pending.length) return;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    while (gpu.pending.length) {
      const f = gpu.pending[0];
      if (!disjoint && !gl.getQueryParameter(f[f.length - 1].q, gl.QUERY_RESULT_AVAILABLE)) break;
      gpu.pending.shift();
      if (!disjoint) {
        for (const e of f) {
          const ms = gl.getQueryParameter(e.q, gl.QUERY_RESULT) / 1e6;
          block.gpu[e.label] = (block.gpu[e.label] || 0) + ms;
          if (rec) rec.gpu[e.label] = (rec.gpu[e.label] || 0) + ms;
        }
        block.gpuFrames++; if (rec) rec.gpuFrames++;
      }
      for (const e of f) gpu.free.push(e.q);
    }
  }
  function instrumentPost(post) {
    if (!gpu.ok) return;
    const passes = post.composer.passes;
    passes.forEach((p, i) => {
      const label = p === post.bloom ? 'bloom' : p === post.rays ? 'rays' : p === post.finish ? 'finish' : p === post.grade ? 'grade' : i === 0 ? 'render' : i === passes.length - 1 ? 'output' : `pass${i}`;
      const orig = p.render;
      p.render = function (a, b, c, d, e) { gpuBegin(label); const r = orig.call(this, a, b, c, d, e); gpuEnd(); return r; };
    });
    const sm = renderer.shadowMap, smRender = sm.render;
    sm.render = function (lights, s, cam) {
      if (!lights.length || gpu.open?.label !== 'render') return smRender.call(this, lights, s, cam);
      gpuBegin('shadow');
      smRender.call(this, lights, s, cam);
      gpuBegin('render');
    };
  }

  // --- sampling: frames accumulate into 500 ms blocks; the overlay and report read the last WINDOW
  const newBlock = (t0) => ({ t0, frameMs: [], gpu: {}, gpuFrames: 0, calls: [Infinity, -Infinity], tris: [Infinity, -Infinity], cpu: {}, cb: {} });
  let firstBlock = null; // the first sampled block's per-callback ms (first-frame setup shows here)
  let block = newBlock(performance.now());
  let win = [];
  const last = { calls: 0, tris: 0, points: 0, lines: 0 };
  let lastStart = 0, mark = 0;
  let current = null; // rolling summary, rebuilt at each block close
  let rec = null, lastRec = null; // the recorder's live state; the last finished record

  // --- counters (v6): ctx.perf.count(key, n) from the modules, one boolean test when the profiler is off.
  // A slot is made the first time a key is counted (at build, for the keys the modules count in their updates);
  // after that counting allocates nothing. total: since the page loaded; last: the frame just ended; rec: the
  // total at the recorder's last sample.
  const counters = {}, clist = [];
  function count(key, n = 1) {
    if (!api.active) return;
    let c = counters[key];
    if (!c) { c = counters[key] = { total: 0, frame: 0, last: 0, rec: 0 }; clist.push(c); }
    c.total += n; c.frame += n;
  }
  // renderer.info deltas: programs, geometries and textures created since the last frame; texture uploads from gpumem
  let upProg = 0, upGeo = 0, upTex = 0, upFirst = 0, upData = 0;
  function countUploads() {
    const info = renderer.info, np = info.programs ? info.programs.length : 0, ng = info.memory.geometries, nt = info.memory.textures;
    if (np > upProg) count('uploads.programs', np - upProg);
    if (ng > upGeo) count('uploads.geometries', ng - upGeo);
    if (nt > upTex) count('uploads.textures', nt - upTex);
    upProg = np; upGeo = ng; upTex = nt;
    const gm = ctx.gpumem;
    if (gm) {
      if (gm.upFirst > upFirst) count('uploads.texFirst', gm.upFirst - upFirst);
      if (gm.upData > upData) count('uploads.texData', gm.upData - upData);
      upFirst = gm.upFirst; upData = gm.upData;
    }
  }
  function countersOut() {
    const totals = {}, lastFrame = {};
    for (const k in counters) { totals[k] = counters[k].total; if (counters[k].last) lastFrame[k] = counters[k].last; }
    return { totals, lastFrame };
  }

  function frameBegin() {
    const now = performance.now();
    if (bench) bench.drive(now);
    if (!api.active) { lastStart = 0; return; }
    if (lastStart) block.frameMs.push(now - lastStart);
    lastStart = now; mark = now;
    gpuPoll();
    if (rec) recBegin(now);
  }
  function cpu(name) { if (!api.active) return; const now = performance.now(), m = mod(name), d = now - mark; m.cpu += d; m.tot += d; mark = now; }
  function markNow() { if (api.active) mark = performance.now(); }
  function frameEnd() {
    ctx.gpumem?.frame();
    if (!api.active) return;
    gpuEndFrame();
    countUploads();
    for (let i = 0; i < clist.length; i++) { const c = clist[i]; c.last = c.frame; c.frame = 0; }
    const r = renderer.info.render;
    last.calls = r.calls; last.tris = r.triangles; last.points = r.points; last.lines = r.lines;
    if (r.calls < block.calls[0]) block.calls[0] = r.calls;
    if (r.calls > block.calls[1]) block.calls[1] = r.calls;
    if (r.triangles < block.tris[0]) block.tris[0] = r.triangles;
    if (r.triangles > block.tris[1]) block.tris[1] = r.triangles;
    const now = performance.now();
    if (rec?.on && rec.prev) recEnd(r);
    if (now - block.t0 >= BLOCK_MS) closeBlock(now);
  }
  function closeBlock(now) {
    for (const m of mods.values()) { block.cpu[m.name] = m.cpu; m.cpu = 0; }
    for (const c of cbs) { if (c.cpu) block.cb[c.label] = (block.cb[c.label] || 0) + c.cpu; c.cpu = 0; }
    if (!firstBlock) firstBlock = { frames: block.frameMs.length, cb: { ...block.cb } };
    win.push(block); if (win.length > WINDOW) win.shift();
    if (bench) bench.add(block);
    block = newBlock(now);
    current = summarise(win);
    if (bench) bench.sample(current);
    if (overlay && overlay.classList.contains('shown')) draw();
  }
  function resetWindow() { win = []; block = newBlock(performance.now()); for (const m of mods.values()) m.cpu = 0; for (const c of cbs) c.cpu = 0; lastStart = 0; current = null; }

  function summarise(blocks) {
    const ms = []; let gpuFrames = 0; const g = {}, c = {}, cb = {};
    let calls = [Infinity, -Infinity], tris = [Infinity, -Infinity];
    for (const b of blocks) {
      for (const v of b.frameMs) ms.push(v);
      gpuFrames += b.gpuFrames;
      for (const k in b.gpu) g[k] = (g[k] || 0) + b.gpu[k];
      for (const k in b.cpu) c[k] = (c[k] || 0) + b.cpu[k];
      for (const k in b.cb) cb[k] = (cb[k] || 0) + b.cb[k];
      calls = [Math.min(calls[0], b.calls[0]), Math.max(calls[1], b.calls[1])];
      tris = [Math.min(tris[0], b.tris[0]), Math.max(tris[1], b.tris[1])];
    }
    const frame = frameStats(ms);
    const n = Math.max(1, ms.length);
    const cpuOut = {}; let cpuTotal = 0;
    for (const k of Object.keys(c).sort((a, b) => c[b] - c[a])) { cpuOut[k] = r2(c[k] / n); cpuTotal += c[k] / n; }
    return {
      frame, cpu: { totalMs: r2(cpuTotal), modules: cpuOut, callbacks: topCallbacks(cb, n) },
      gpu: gpuOut(g, gpuFrames),
      calls: isFinite(calls[0]) ? calls : null, tris: isFinite(tris[0]) ? tris : null,
    };
  }
  // the heaviest callbacks, ms per frame, those under 0.01 ms dropped
  function topCallbacks(cb, n, k = 12) {
    const out = {};
    for (const [label, v] of Object.entries(cb).sort((a, b) => b[1] - a[1]).slice(0, k)) if (v / n >= 0.01) out[label] = r2(v / n);
    return out;
  }
  function gpuOut(g, frames) {
    if (!gpu.ok) return { available: false };
    if (!frames) return { available: true, frames: 0 };
    const o = { available: true, frames };
    let total = 0;
    for (const k of Object.keys(g)) total += g[k];
    // 'render' is the whole render pass including the shadow map; 'shadow' is the shadow map alone
    o.render = r2(((g.render || 0) + (g.shadow || 0)) / frames);
    for (const k of Object.keys(g)) if (k !== 'render') o[k] = r2(g[k] / frames);
    // post: the chain after the scene (v6-02: bloom, rays, finish; ?post=v3: bloom, grade, output); grade and
    // output stay as keys (null under the finish) so old and new records compare
    o.post = r2(['bloom', 'rays', 'finish', 'grade', 'output'].reduce((a, k) => a + (g[k] || 0), 0) / frames);
    o.grade ??= null; o.output ??= null;
    o.total = r2(total / frames);
    return o;
  }

  function lightsByType() {
    const out = {};
    scene.traverse((o) => {
      if (!o.isLight) return;
      const e = out[o.type] ||= { count: 0, visible: 0, shadow: 0 };
      e.count++; if (o.visible && o.layers.test(ctx.camera.layers)) e.visible++; if (o.castShadow) e.shadow++; // sources on lights.js's hidden layer count as not visible
    });
    return out;
  }
  function renderSize() {
    const c = renderer.domElement;
    return { css: [c.clientWidth, c.clientHeight], buffer: [c.width, c.height] };
  }

  // --- overlay
  let overlay = null;
  function draw() {
    if (!overlay) return;
    const s = current, mem = renderer.info.memory, size = renderSize(), lights = lightsByType();
    const lines = [];
    if (!s) lines.push('profiler: gathering…');
    else {
      const f = s.frame;
      lines.push(`frame ${f.avgMs ?? '–'} ms (${f.fps ?? '–'} fps) · 1% low ${f.low1Ms ?? '–'} ms (${f.low1Fps ?? '–'} fps)`);
      const g = s.gpu;
      if (!g.available) lines.push('gpu n/a (no timer query; the shadows toggle gives the shadow cost)');
      else if (!g.frames) lines.push('gpu waiting for queries…');
      else lines.push(`gpu ${g.total} ms: render ${g.render ?? '–'} (shadow ${g.shadow ?? '–'}) · post ${g.post} (bloom ${g.bloom ?? '–'} · rays ${g.rays ?? '–'} · finish ${g.finish ?? '–'} · grade ${g.grade ?? '–'} · output ${g.output ?? '–'})`);
      const cpuParts = Object.entries(s.cpu.modules).filter(([, v]) => v >= 0.01).map(([k, v]) => `${k} ${v}`);
      lines.push(`cpu ${s.cpu.totalMs} ms: ${cpuParts.join(' · ') || '–'}`);
    }
    lines.push(`${last.calls} calls · ${(last.tris / 1000).toFixed(0)}k tris · ${mem.geometries} geometries · ${mem.textures} textures · ${renderer.info.programs?.length ?? '?'} programs`);
    lines.push('lights ' + (Object.entries(lights).map(([k, v]) => `${k.replace('Light', '')} ${v.visible}/${v.count}`).join(' · ') || 'none'));
    lines.push(`dpr ${renderer.getPixelRatio()} · ${size.css[0]}×${size.css[1]} css · ${size.buffer[0]}×${size.buffer[1]} px · q=${ctx.quality}${ctx.tier ? ` (${ctx.tier.state.source}${ctx.tier.state.adapt ? ', adaptive' : ''})` : ''}`);
    const gm = ctx.gpumem?.stats();
    if (gm) lines.push(`gpu memory${gm.late ? ' (allocated since the profiler came on)' : ''} ${gm.totalMB} MB: textures ${gm.textureMB} · renderbuffers ${gm.renderbufferMB} · canvas ${gm.backbufferMB} · uploads ${gm.uploadsLastFrame}/frame`);
    const st = settings();
    lines.push(`cap ${st.cap || 'off'}${st.idle ? ' (idle ' + st.targetFps + ')' : ''} · shadow redraws ${st.shadows ? (st.shadows.every ? 'every frame' : st.shadows.redraws) : '–'} · point slots ${typeof st.lightSlots === 'object' ? st.lightSlots.active + '/' + st.lightSlots.slots : 'off'} · bloom ×${st.bloomRes} · throttle ${st.throttle ? 'on' : 'off'}`);
    if (rec) lines.unshift(rec.on ? `recording ${(rec.el / 1000).toFixed(1)} / ${rec.seconds} s` : `record armed: ${rec.seconds} s, starts when the walker is out`);
    overlay.textContent = lines.join('\n');
  }
  function setActive(on) {
    api.active = on;
    // the GL memory hooks cost a little on every texture call, so they go in only once the profiler is on; turned
    // on late (the panel's row), they count what is allocated from then on and the overlay says so
    if (on && !ctx.gpumem) ctx.gpumem = installGpuMem(renderer.getContext(), renderer.domElement, { late: true });
    overlay?.classList.toggle('shown', on);
    if (on) { resetWindow(); draw(); }
    else { gpuEnd(); gpu.frame = null; rec = null; }
  }

  // --- toggles
  let shadowLights = [];
  const toggles = {};
  function setBloom(on) { if (ctx.post) ctx.post.bloom.enabled = on; }
  function setShadows(on) { for (const l of shadowLights) l.castShadow = on; } // light hash changes; three recompiles
  // The bench files itself: the commit from commit.json (written by the Netlify build and build-artifact.mjs;
  // not looked for on localhost, where there is none), and the machine from ?machine=, remembered per browser.
  let machine = url.searchParams.get('machine');
  try { if (machine) localStorage.setItem('fp-machine', machine); else machine = localStorage.getItem('fp-machine'); } catch { /* storage blocked */ }
  if (!window.__fp_commit && !/^(localhost|127\.|\[::1\])/.test(location.hostname)) {
    fetch(new URL('commit.json', document.baseURI)).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.commit) window.__fp_commit = j.commit; }).catch(() => {});
  }
  function attach() {
    overlay = document.getElementById('perf');
    instrumentPost(ctx.post);
    scene.traverse((o) => { if (o.isLight && o.castShadow) shadowLights.push(o); });
    toggles.profiler = { get: () => api.active, set: setActive };
    toggles.bloom = { get: () => ctx.post.bloom.enabled, set: setBloom };
    toggles.shadows = { get: () => shadowLights.some((l) => l.castShadow), set: setShadows };
    for (const m of mods.values()) if (m.world) toggles[m.name] = { get: () => m.enabled, set: (on) => setModule(m.name, on) };
    if (url.searchParams.get('bloom') === '0') setBloom(false);
    if (url.searchParams.get('shadows') === '0') setShadows(false);
    if (ctx.debug?.addToggle) {
      ctx.debug.addHeading?.('measure');
      for (const [name, t] of Object.entries(toggles)) ctx.debug.addToggle(name, t.get, t.set);
    }
    const recordParam = Number(url.searchParams.get('record'));
    if (url.searchParams.get('perf') === '1' || benchParam != null || recordParam > 0) setActive(true);
    if (benchParam != null) bench = makeBench(Number(benchParam));
    else if (recordParam > 0) record(recordParam);
  }

  // --- bench
  let bench = null;
  function benchPath() {
    // spawn, the causeway as far as the vertex nearest the tarn, an arc along the tarn's shore round to the
    // side facing the fen, across to the fen's near edge and an arc along it toward the keep, then home.
    const pts = [{ x: SPAWN.x, z: SPAWN.z }];
    const tarn = WATER.tarn, fen = WATER.fen;
    let near = 0;
    BENCH_CAUSEWAY.forEach((p, i) => { if (Math.hypot(p.x - tarn.x, p.z - tarn.z) < Math.hypot(BENCH_CAUSEWAY[near].x - tarn.x, BENCH_CAUSEWAY[near].z - tarn.z)) near = i; });
    for (let i = 0; i <= near; i++) pts.push({ x: BENCH_CAUSEWAY[i].x, z: BENCH_CAUSEWAY[i].z });
    const bearing = (c, p) => Math.atan2(p.z - c.z, p.x - c.x);
    const arc = (c, rad, a0, a1) => {
      let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const n = Math.max(2, Math.ceil(Math.abs(d) / 0.07));
      for (let i = 0; i <= n; i++) { const a = a0 + (d * i) / n; pts.push({ x: c.x + Math.cos(a) * rad, z: c.z + Math.sin(a) * rad }); }
    };
    const cw = pts[pts.length - 1];
    arc(tarn, (tarn.shore ?? tarn.r) + 4, bearing(tarn, cw), bearing(tarn, fen)); // the old round shore (v4: r takes in the bay)
    arc(fen, fen.r + 4, bearing(fen, tarn), bearing(fen, SPAWN));
    pts.push({ x: SPAWN.x, z: SPAWN.z });
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    const length = cum[cum.length - 1];
    function at(s, out) {
      s = Math.max(0, Math.min(length, s));
      let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
      const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      out.x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f; out.z = pts[i - 1].z + (pts[i].z - pts[i - 1].z) * f;
      return out;
    }
    return { pts, length, at };
  }
  function makeBench(param) {
    const duration = param > 1 ? param : 45;
    const warm = Math.min(2, duration * 0.1); // held at spawn first, unrecorded, while shaders settle
    const path = benchPath();
    const b = { duration, warm, length: path.length, phase: 'warm', t0: 0, samples: [], frameMs: [], calls: [Infinity, -Infinity], tris: [Infinity, -Infinity], gpu: {}, gpuN: 0, cpu: {}, cpuN: 0, cb: {}, result: null, done: false };
    const p = ctx.player, here = { x: 0, z: 0 }, ahead = { x: 0, z: 0 };
    let prevHold = null, runStart = 0, lastNow = 0;
    b.drive = (now) => {
      if (b.done) return;
      if (!b.t0) {
        b.t0 = now;
        document.getElementById('card')?.classList.add('hidden');
        p.enabled = false;
        prevHold = ctx.sky.flicker.hold; ctx.sky.flicker.hold = 1;
      }
      const el = (now - b.t0) / 1000;
      if (b.phase === 'warm' && el >= warm) { b.phase = 'run'; runStart = now; resetWindow(); }
      if (b.phase === 'run' && lastNow) b.frameMs.push(now - lastNow);
      if (b.phase === 'run') lastNow = now;
      const u = b.phase === 'run' ? Math.min(1, (now - runStart) / 1000 / duration) : 0;
      const s = u * path.length;
      path.at(s, here); path.at(s + 10, ahead);
      let dx = ahead.x - here.x, dz = ahead.z - here.z;
      if (Math.hypot(dx, dz) < 0.5) { path.at(s - 10, ahead); dx = here.x - ahead.x; dz = here.z - ahead.z; }
      p.pos.x = here.x; p.pos.z = here.z; p.vel.set(0, 0, 0);
      p.yaw = Math.atan2(-dx, -dz); p.pitch = -0.04;
      if (u >= 1) finish();
    };
    // frame-weighted totals for the summary, straight from each closed block
    b.add = (blk) => {
      if (b.phase !== 'run') return;
      b.cpuN += blk.frameMs.length; for (const k in blk.cpu) b.cpu[k] = (b.cpu[k] || 0) + blk.cpu[k];
      for (const k in blk.cb) b.cb[k] = (b.cb[k] || 0) + blk.cb[k];
      b.gpuN += blk.gpuFrames; for (const k in blk.gpu) b.gpu[k] = (b.gpu[k] || 0) + blk.gpu[k];
    };
    b.sample = (s) => {
      if (b.phase !== 'run') return;
      const t = r2((performance.now() - runStart) / 1000);
      b.samples.push({ t, x: Math.round(p.pos.x), z: Math.round(p.pos.z), ...s });
      if (s.calls) { b.calls[0] = Math.min(b.calls[0], s.calls[0]); b.calls[1] = Math.max(b.calls[1], s.calls[1]); }
      if (s.tris) { b.tris[0] = Math.min(b.tris[0], s.tris[0]); b.tris[1] = Math.max(b.tris[1], s.tris[1]); }
    };
    function finish() {
      b.done = true; b.phase = 'done';
      ctx.sky.flicker.hold = prevHold;
      const f = frameStats(b.frameMs);
      const avg = (o, n) => { const r = {}; for (const k of Object.keys(o)) r[k] = r2(o[k] / Math.max(1, n)); return r; };
      const size = renderSize();
      b.result = {
        kind: 'fading-planet-bench', date: new Date().toISOString(),
        ...(window.__fp_commit ? { commit: String(window.__fp_commit) } : {}),
        ...(machine ? { machine } : {}),
        settings: settings(),
        userAgent: navigator.userAgent, quality: ctx.quality, tier: ctx.tier?.stats() ?? null, gpuMemory: ctx.gpumem?.stats() ?? null, dpr: renderer.getPixelRatio(), devicePixelRatio: devicePixelRatio,
        renderSize: size, url: location.search, duration, warmup: warm, pathMetres: Math.round(path.length),
        gpuTimer: gpu.ok, toggles: Object.fromEntries(Object.entries(toggles).map(([k, t]) => [k, t.get()])),
        summary: {
          avgFps: f.fps, low1Fps: f.low1Fps, avgFrameMs: f.avgMs, low1FrameMs: f.low1Ms, frames: f.frames,
          gpuMs: gpu.ok ? (b.gpuN ? gpuOut(b.gpu, b.gpuN) : null) : 'n/a',
          cpuMs: avg(b.cpu, b.cpuN),
          cpuCallbacks: topCallbacks(b.cb, Math.max(1, b.cpuN), 20),
          calls: isFinite(b.calls[0]) ? b.calls : null, tris: isFinite(b.tris[0]) ? b.tris : null,
        },
        samples: b.samples,
      };
      showSummary(b.result);
    }
    return b;
  }
  // --- recorder
  // The walker is out: the card is hidden (pacing.idle is false) and the view is steered, by the locked pointer,
  // drag-look (the lock refused or ?lock=0) or touch. A recording counts only these frames.
  function walking() {
    const p = ctx.player;
    return !!p && p.enabled && !ctx.pacing?.idle && (p.locked || p.lockFailed || p.dragLook || document.body.classList.contains('touch'));
  }
  function record(seconds) {
    seconds = Math.max(1, Math.min(600, Number(seconds) || 10));
    if (!api.active) setActive(true);
    const cap = Math.ceil(seconds * 120);
    rec = {
      seconds, cap, on: false, n: 0, el: 0, prev: 0, wall0: 0,
      ms: new Float32Array(cap), t: new Float32Array(cap), yaw: new Float32Array(cap), // per frame: duration, offset in recorded time, view yaw
      samples: [], sampleAt: 0, sampleN: 0, gpu: {}, gpuFrames: 0, calls: 0, tris: 0,
      tot: new Map(), uploads: 0, redraws: 0, dynamic: 0, idleFrames: 0,
    };
    draw();
    return rec.seconds;
  }
  function recBegin(now) {
    const walk = walking();
    if (!rec.on) {
      if (!walk) return;
      rec.on = true; rec.wall0 = now; rec.prev = 0;
      for (const m of mods.values()) rec.tot.set(m, m.tot);
      for (const k in counters) counters[k].rec = counters[k].total;
      rec.uploads = ctx.gpumem?.stats().uploads ?? 0;
      rec.redraws = ctx.shadowCadence?.stats.redraws ?? 0; rec.dynamic = ctx.shadowCadence?.stats.dynamic ?? 0;
      rec.gpu = {}; rec.gpuFrames = 0;
    }
    if (!walk) { rec.prev = 0; return; } // paused: the next frame has no interval to count
    if (rec.prev) {
      const i = rec.n++, dt = now - rec.prev;
      rec.ms[i] = dt; rec.el += dt; rec.t[i] = rec.el; rec.yaw[i] = ctx.player.yaw;
    }
    rec.prev = now;
  }
  function recEnd(r) {
    if (r.calls > rec.calls) rec.calls = r.calls;
    if (r.triangles > rec.tris) rec.tris = r.triangles;
    if (rec.el - rec.sampleAt >= SAMPLE_MS) recSample();
    if (rec.el >= rec.seconds * 1000 || rec.n >= rec.cap) recFinish();
  }
  // one 250 ms sample, closed at the frame that crosses it: everything summed or maxed over its frames
  function recSample() {
    const frames = rec.n - rec.sampleN;
    if (!frames) return;
    const cpu = {};
    for (const m of mods.values()) { const d = m.tot - (rec.tot.get(m) || 0); rec.tot.set(m, m.tot); if (d / frames >= 0.005) cpu[m.name] = r2(d / frames); }
    const gm = ctx.gpumem?.stats(), sc = ctx.shadowCadence?.stats, mem = renderer.info.memory, p = ctx.player, cam = ctx.camera.position;
    const size = renderSize();
    const g = !gpu.ok ? 'n/a' : rec.gpuFrames ? gpuOut(rec.gpu, rec.gpuFrames) : null;
    const uploads = gm ? gm.uploads : 0;
    const cn = {};
    for (const k in counters) { const c = counters[k], d = c.total - c.rec; c.rec = c.total; if (d) cn[k] = d; }
    rec.samples.push({
      t: r1(rec.sampleAt), frames, avgMs: r2((rec.el - rec.sampleAt) / frames),
      gpu: g && g !== 'n/a' ? { frames: g.frames, render: g.render, shadow: g.shadow ?? null, bloom: g.bloom ?? null, rays: g.rays ?? null, finish: g.finish ?? null, grade: g.grade ?? null, output: g.output ?? null, post: g.post, total: g.total } : g,
      calls: rec.calls, tris: rec.tris, dpr: renderer.getPixelRatio(), buffer: size.buffer,
      tierSteps: ctx.tier ? ctx.tier.state.steps.length : 0,
      shadowRedraws: sc ? sc.redraws : null, shadowDynamic: sc ? sc.dynamic : null,
      x: r1(cam.x), y: r1(cam.y), z: r1(cam.z), yaw: r2(p.yaw),
      geometries: mem.geometries, textures: mem.textures, programs: renderer.info.programs?.length ?? null,
      uploads: uploads - rec.uploads, counters: cn, cpuMs: cpu,
    });
    rec.uploads = uploads;
    rec.sampleAt = rec.el; rec.sampleN = rec.n; rec.gpu = {}; rec.gpuFrames = 0; rec.calls = 0; rec.tris = 0;
  }
  function recFinish() {
    recSample();
    const R = rec; rec = null;
    const n = R.n, ms = R.ms.subarray(0, n), sorted = Float32Array.from(ms).sort();
    const q = (f) => (n ? sorted[Math.min(n - 1, Math.floor(f * n))] : null);
    const med = q(0.5) ?? 0;
    let over2 = 0, over3 = 0; for (let i = 0; i < n; i++) { if (ms[i] > 2 * med) over2++; if (ms[i] > 3 * med) over3++; }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => ms[b] - ms[a]).slice(0, 10);
    const sampleOf = (t) => { let k = 0; while (k < R.samples.length - 1 && R.samples[k + 1].t <= t) k++; return k; };
    const worst = order.map((i, rank) => {
      const k = sampleOf(R.t[i] - R.ms[i]), s = R.samples[k], before = R.samples[k - 1];
      return {
        rank: rank + 1, ms: r1(ms[i]), t: r1(R.t[i]), yaw: r2(R.yaw[i]), sample: k,
        around: s && {
          gpu: s.gpu, uploads: s.uploads, dpr: s.dpr, calls: s.calls, tris: s.tris, x: s.x, z: s.z,
          shadowRedraws: s.shadowRedraws == null ? null : s.shadowRedraws - (before ? before.shadowRedraws : 0),
          shadowDynamic: s.shadowDynamic == null ? null : s.shadowDynamic - (before ? before.shadowDynamic : 0),
          tierSteps: s.tierSteps,
        },
      };
    });
    const wall = performance.now() - R.wall0, steps = (ctx.tier?.state.steps || []).filter((s) => s.at >= R.wall0);
    const size = renderSize();
    const res = {
      kind: 'fading-planet-record', date: new Date().toISOString(),
      ...(window.__fp_commit ? { commit: String(window.__fp_commit) } : {}),
      ...(machine ? { machine } : {}),
      settings: settings(), userAgent: navigator.userAgent, quality: ctx.quality, tier: ctx.tier?.stats() ?? null,
      dpr: renderer.getPixelRatio(), devicePixelRatio, renderSize: size, url: location.search, gpuTimer: gpu.ok,
      requestedSeconds: R.seconds, recordedSeconds: r2(R.el / 1000), idleSeconds: r2(Math.max(0, wall - R.el) / 1000),
      summary: {
        frames: n, fps: r1(n ? n / (R.el / 1000) : null), medianMs: r2(med), p95Ms: r2(q(0.95)), p99Ms: r2(q(0.99)), worstMs: r2(n ? sorted[n - 1] : null),
        over2xMedian: over2, over3xMedian: over3, worst, tierStepsDuring: steps,
      },
      samples: R.samples,
      frames: { note: 'per frame: ms = duration, t = offset in recorded time (ms, idle excluded), yaw = view yaw (rad)', ms: Array.from(ms, r2), t: Array.from(R.t.subarray(0, n), r1), yaw: Array.from(R.yaw.subarray(0, n), (v) => Math.round(v * 1000) / 1000) },
    };
    lastRec = res;
    if (document.pointerLockElement) { try { document.exitPointerLock(); } catch { /* ignore */ } } // so the panel can be clicked
    showSummary(res, recordView(res));
    if (overlay && overlay.classList.contains('shown')) draw();
  }
  function recordView(res) {
    const s = res.summary, gp = (g) => (g === 'n/a' ? 'gpu n/a' : g ? `gpu ${g.total} (render ${g.render}, shadow ${g.shadow ?? '–'}, post ${g.post ?? '–'}: bloom ${g.bloom ?? '–'}, rays ${g.rays ?? '–'}, finish ${g.finish ?? '–'}, grade ${g.grade ?? '–'}, output ${g.output ?? '–'})` : 'gpu no results');
    const lines = [
      `recorded ${res.recordedSeconds} s of ${res.requestedSeconds} s asked${res.idleSeconds > 0.05 ? ` (${res.idleSeconds} s idle, not counted)` : ''} · ${s.frames} frames · ${s.fps ?? '–'} fps · q=${res.quality} · dpr ${res.dpr} · ${res.renderSize.buffer.join('×')} px`,
      `median ${s.medianMs} ms · 95th ${s.p95Ms} · 99th ${s.p99Ms} · worst ${s.worstMs} · over 2× median ${s.over2xMedian} · over 3× ${s.over3xMedian}`,
      `tier steps during: ${s.tierStepsDuring.length ? s.tierStepsDuring.map((t) => `${t.from}→${t.to}`).join(', ') : 'none'}`,
      'worst ten (ms at t s, yaw; the 250 ms sample around it):',
      ...s.worst.map((w) => `${w.rank}. ${w.ms} ms at ${(w.t / 1000).toFixed(2)} s, yaw ${w.yaw} · ${w.around ? `${gp(w.around.gpu)} · uploads ${w.around.uploads} · shadow redraws ${w.around.shadowRedraws ?? '–'} (${w.around.shadowDynamic ?? '–'} dynamic) · dpr ${w.around.dpr}` : ''}`),
    ];
    return { title: 'Recording done', prefix: 'record', unhide: false, text: lines.join('\n') };
  }

  function benchView(res) {
    const s = res.summary;
    const g = s.gpuMs === 'n/a' ? 'n/a (no timer query in this browser)' : s.gpuMs ? Object.entries(s.gpuMs).filter(([k]) => k !== 'available' && k !== 'frames').map(([k, v]) => `${k} ${v}`).join(' · ') + ` ms (${s.gpuMs.frames} frames timed)` : 'no results';
    const rng = (a, k = 1) => (a ? `${Math.round(a[0] / k)}–${Math.round(a[1] / k)}` : '–');
    return { title: 'Bench done', prefix: 'bench', unhide: true, text: [
      `${res.duration} s · ${res.pathMetres} m · q=${res.quality} · dpr ${res.dpr} · ${res.renderSize.buffer.join('×')} px`,
      `avg ${s.avgFps ?? '–'} fps (${s.avgFrameMs ?? '–'} ms) · 1% low ${s.low1Fps ?? '–'} fps (${s.low1FrameMs ?? '–'} ms) · ${s.frames} frames`,
      `gpu ${g}`,
      `calls ${rng(s.calls)} · tris ${rng(s.tris, 1000)}k`,
      'or paste the output of __fp.perf.report() from the console',
    ].join('\n') };
  }
  // The panel for a finished bench or record: the summary as text, the result as JSON to download or copy.
  function showSummary(res, view = benchView(res)) {
    const el = document.createElement('div');
    el.id = 'perf-bench';
    el.innerHTML = '<h2></h2><pre></pre><div class="row"><button type="button" data-a="dl">Download JSON</button><button type="button" data-a="copy">Copy JSON</button><button type="button" data-a="close">Close</button></div>';
    el.querySelector('h2').textContent = view.title;
    el.querySelector('pre').textContent = view.text;
    const json = () => JSON.stringify(res, null, 1);
    el.addEventListener('click', async (e) => {
      const a = e.target?.dataset?.a;
      if (a === 'close') { el.remove(); if (view.unhide) document.getElementById('card')?.classList.remove('hidden'); }
      else if (a === 'dl') {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([json()], { type: 'application/json' }));
        const slug = res.machine ? '-' + res.machine.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
        link.download = `${view.prefix}-${res.date.slice(0, 10)}-${res.commit ? res.commit.slice(0, 7) + '-' : ''}${res.quality}${slug}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      } else if (a === 'copy') {
        try { await navigator.clipboard.writeText(json()); e.target.textContent = 'Copied'; } catch { e.target.textContent = 'Copy failed: use report()'; }
      }
    });
    document.body.appendChild(el);
  }

  // what the v3 stage 2 switches are doing (frame cap, shadow cadence, light slots, bloom size, throttling)
  function settings() {
    const sc = ctx.shadowCadence, ls = ctx.lightSlots;
    return {
      cap: ctx.pacing?.cap ?? null, targetFps: ctx.pacing?.fps ?? null, idle: ctx.pacing?.idle ?? null,
      shadows: sc ? { ...sc.settings, redraws: sc.stats.redraws, dynamicRedraws: sc.stats.dynamic, nearCasters: sc.stats.near, pcf: renderer.shadowMap.type === ctx.THREE.PCFShadowMap ? 'hard' : 'soft' } : null,
      lightSlots: ls ? { slots: ls.slots.length, sources: ls.sources.length, active: ls.active() } : 'off',
      bloomRes: ctx.post?.bloom?.resScale ?? 1, throttle: ctx.throttle !== false,
    };
  }
  function report() {
    const live = renderer.info.render, mem = renderer.info.memory;
    const r = api.active ? last : { calls: live.calls, tris: live.triangles, points: live.points, lines: live.lines };
    return {
      date: new Date().toISOString(), active: api.active,
      ...(current || summarise(win.length ? win : [block])),
      render: { calls: r.calls, triangles: r.tris, points: r.points, lines: r.lines },
      memory: { geometries: mem.geometries, textures: mem.textures, programs: renderer.info.programs?.length ?? null, gpu: ctx.gpumem?.stats() ?? null },
      tier: ctx.tier?.stats() ?? null, counters: countersOut(),
      lights: lightsByType(), pixelRatio: renderer.getPixelRatio(), size: renderSize(), quality: ctx.quality,
      settings: settings(), ...(machine ? { machine } : {}),
      gpuTimer: gpu.ok,
      firstBlock: firstBlock && { frames: firstBlock.frames, callbacks: topCallbacks(firstBlock.cb, 1) },
      modules: Object.fromEntries([...mods.values()].map((m) => [m.name, { world: m.world, enabled: m.enabled, updates: m.updates, objects: m.objects.size }])),
      toggles: Object.fromEntries(Object.entries(toggles).map(([k, t]) => [k, t.get()])),
      bench: bench ? (bench.result || { phase: bench.phase, samples: bench.samples.length }) : null,
    };
  }

  const api = {
    active: false, gpuTimer: gpu.ok, count, counters, forModule, attach, frameBegin, frameEnd, cpu, mark: markNow, report,
    record, lastRecord: () => lastRec, get recording() { return !!rec; }, setModule, setBloom, setShadows, setActive, toggles, _mods: mods, // _mods: name -> { objects, ... } for diagnostics
    get bench() { return bench; },
  };
  return api;
}
