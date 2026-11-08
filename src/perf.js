// Instruments for the v3 performance pass. Measures; changes nothing unless a toggle is flipped.
// - Profiler (?perf=1, or the debug panel's "profiler" row): frame time (rolling ~2 s average and 1% low),
//   CPU per module inside the update loop, GPU time per pass (EXT_disjoint_timer_query_webgl2 where the
//   browser has it, else n/a), draw calls, triangles, memory counts, lights, pixel ratio and render size.
// - Bench (?bench=1 for 45 s, ?bench=<seconds> for a shorter run of the same path): a fixed camera path,
//   spawn → causeway → the tarn's shore → the fen's edge → spawn, controls off, the gutter held off,
//   sampled every 500 ms, then a summary with the JSON to download. ctx.perf.report() returns it all.
// - Toggles (debug panel): each world module on/off (its scene objects hidden, its updates skipped),
//   bloom and shadows. Also ?bloom=0 and ?shadows=0.
// Modules are attributed by building each against forModule(name), a Proxy of ctx that tags its
// registerUpdate callbacks and the objects it adds to the scene. Objects a module parents elsewhere
// (under another object, the camera) are not tagged, so its toggle misses them.
import { SPAWN, CAUSEWAY, WATER } from './world.js';

const BLOCK_MS = 500; // one sample block
const WINDOW = 4;     // blocks in the rolling window (~2 s)
const PASSES = ['render', 'shadow', 'bloom', 'grade', 'output'];

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
    if (!m) { m = { name, cpu: 0, enabled: true, world: false, updates: 0, objects: new Set(), hidden: null }; mods.set(name, m); }
    return m;
  }
  const rawRegister = ctx.registerUpdate;
  function wrapUpdate(m, fn) {
    m.updates++;
    return (dt, t) => {
      if (!m.enabled) return;
      if (!api.active) { fn(dt, t); return; }
      const t0 = performance.now();
      fn(dt, t);
      m.cpu += performance.now() - t0;
    };
  }
  // updates registered outside a module build (terrain, sky, controls...) count as 'core'
  const core = mod('core');
  ctx.registerUpdate = (fn) => rawRegister(wrapUpdate(core, fn));

  function forModule(name) {
    const m = mod(name); m.world = true;
    const register = (fn) => rawRegister(wrapUpdate(m, fn));
    const add = (...objs) => { for (const o of objs) m.objects.add(o); scene.add(...objs); return scene; };
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
        for (const e of f) block.gpu[e.label] = (block.gpu[e.label] || 0) + gl.getQueryParameter(e.q, gl.QUERY_RESULT) / 1e6;
        block.gpuFrames++;
      }
      for (const e of f) gpu.free.push(e.q);
    }
  }
  function instrumentPost(post) {
    if (!gpu.ok) return;
    const passes = post.composer.passes;
    passes.forEach((p, i) => {
      const label = p === post.bloom ? 'bloom' : p === post.grade ? 'grade' : i === 0 ? 'render' : i === passes.length - 1 ? 'output' : `pass${i}`;
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
  const newBlock = (t0) => ({ t0, frameMs: [], gpu: {}, gpuFrames: 0, calls: [Infinity, -Infinity], tris: [Infinity, -Infinity], cpu: {} });
  let block = newBlock(performance.now());
  let win = [];
  const last = { calls: 0, tris: 0, points: 0, lines: 0 };
  let lastStart = 0, mark = 0;
  let current = null; // rolling summary, rebuilt at each block close

  function frameBegin() {
    const now = performance.now();
    if (bench) bench.drive(now);
    if (!api.active) { lastStart = 0; return; }
    if (lastStart) block.frameMs.push(now - lastStart);
    lastStart = now; mark = now;
    gpuPoll();
  }
  function cpu(name) { if (!api.active) return; const now = performance.now(); mod(name).cpu += now - mark; mark = now; }
  function markNow() { if (api.active) mark = performance.now(); }
  function frameEnd() {
    if (!api.active) return;
    gpuEndFrame();
    const r = renderer.info.render;
    last.calls = r.calls; last.tris = r.triangles; last.points = r.points; last.lines = r.lines;
    if (r.calls < block.calls[0]) block.calls[0] = r.calls;
    if (r.calls > block.calls[1]) block.calls[1] = r.calls;
    if (r.triangles < block.tris[0]) block.tris[0] = r.triangles;
    if (r.triangles > block.tris[1]) block.tris[1] = r.triangles;
    const now = performance.now();
    if (now - block.t0 >= BLOCK_MS) closeBlock(now);
  }
  function closeBlock(now) {
    for (const m of mods.values()) { block.cpu[m.name] = m.cpu; m.cpu = 0; }
    win.push(block); if (win.length > WINDOW) win.shift();
    if (bench) bench.add(block);
    block = newBlock(now);
    current = summarise(win);
    if (bench) bench.sample(current);
    if (overlay && overlay.classList.contains('shown')) draw();
  }
  function resetWindow() { win = []; block = newBlock(performance.now()); for (const m of mods.values()) m.cpu = 0; lastStart = 0; current = null; }

  function summarise(blocks) {
    const ms = []; let gpuFrames = 0; const g = {}, c = {};
    let calls = [Infinity, -Infinity], tris = [Infinity, -Infinity];
    for (const b of blocks) {
      for (const v of b.frameMs) ms.push(v);
      gpuFrames += b.gpuFrames;
      for (const k in b.gpu) g[k] = (g[k] || 0) + b.gpu[k];
      for (const k in b.cpu) c[k] = (c[k] || 0) + b.cpu[k];
      calls = [Math.min(calls[0], b.calls[0]), Math.max(calls[1], b.calls[1])];
      tris = [Math.min(tris[0], b.tris[0]), Math.max(tris[1], b.tris[1])];
    }
    const frame = frameStats(ms);
    const n = Math.max(1, ms.length);
    const cpuOut = {}; let cpuTotal = 0;
    for (const k of Object.keys(c).sort((a, b) => c[b] - c[a])) { cpuOut[k] = r2(c[k] / n); cpuTotal += c[k] / n; }
    return {
      frame, cpu: { totalMs: r2(cpuTotal), modules: cpuOut },
      gpu: gpuOut(g, gpuFrames),
      calls: isFinite(calls[0]) ? calls : null, tris: isFinite(tris[0]) ? tris : null,
    };
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
    o.total = r2(total / frames);
    return o;
  }

  function lightsByType() {
    const out = {};
    scene.traverse((o) => {
      if (!o.isLight) return;
      const e = out[o.type] ||= { count: 0, visible: 0, shadow: 0 };
      e.count++; if (o.visible) e.visible++; if (o.castShadow) e.shadow++;
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
      else lines.push(`gpu ${g.total} ms: render ${g.render ?? '–'} (shadow ${g.shadow ?? '–'}) · bloom ${g.bloom ?? '–'} · grade ${g.grade ?? '–'} · output ${g.output ?? '–'}`);
      const cpuParts = Object.entries(s.cpu.modules).filter(([, v]) => v >= 0.01).map(([k, v]) => `${k} ${v}`);
      lines.push(`cpu ${s.cpu.totalMs} ms: ${cpuParts.join(' · ') || '–'}`);
    }
    lines.push(`${last.calls} calls · ${(last.tris / 1000).toFixed(0)}k tris · ${mem.geometries} geometries · ${mem.textures} textures · ${renderer.info.programs?.length ?? '?'} programs`);
    lines.push('lights ' + (Object.entries(lights).map(([k, v]) => `${k.replace('Light', '')} ${v.visible}/${v.count}`).join(' · ') || 'none'));
    lines.push(`dpr ${renderer.getPixelRatio()} · ${size.css[0]}×${size.css[1]} css · ${size.buffer[0]}×${size.buffer[1]} px · q=${ctx.quality}`);
    overlay.textContent = lines.join('\n');
  }
  function setActive(on) {
    api.active = on;
    overlay?.classList.toggle('shown', on);
    if (on) { resetWindow(); draw(); }
    else { gpuEnd(); gpu.frame = null; }
  }

  // --- toggles
  let shadowLights = [];
  const toggles = {};
  function setBloom(on) { if (ctx.post) ctx.post.bloom.enabled = on; }
  function setShadows(on) { for (const l of shadowLights) l.castShadow = on; } // light hash changes; three recompiles
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
    if (url.searchParams.get('perf') === '1' || benchParam != null) setActive(true);
    if (benchParam != null) bench = makeBench(Number(benchParam));
  }

  // --- bench
  let bench = null;
  function benchPath() {
    // spawn, the causeway as far as the vertex nearest the tarn, an arc along the tarn's shore round to the
    // side facing the fen, across to the fen's near edge and an arc along it toward the keep, then home.
    const pts = [{ x: SPAWN.x, z: SPAWN.z }];
    const tarn = WATER.tarn, fen = WATER.fen;
    let near = 0;
    CAUSEWAY.forEach((p, i) => { if (Math.hypot(p.x - tarn.x, p.z - tarn.z) < Math.hypot(CAUSEWAY[near].x - tarn.x, CAUSEWAY[near].z - tarn.z)) near = i; });
    for (let i = 0; i <= near; i++) pts.push({ x: CAUSEWAY[i].x, z: CAUSEWAY[i].z });
    const bearing = (c, p) => Math.atan2(p.z - c.z, p.x - c.x);
    const arc = (c, rad, a0, a1) => {
      let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const n = Math.max(2, Math.ceil(Math.abs(d) / 0.07));
      for (let i = 0; i <= n; i++) { const a = a0 + (d * i) / n; pts.push({ x: c.x + Math.cos(a) * rad, z: c.z + Math.sin(a) * rad }); }
    };
    const cw = pts[pts.length - 1];
    arc(tarn, tarn.r + 4, bearing(tarn, cw), bearing(tarn, fen));
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
    const b = { duration, warm, length: path.length, phase: 'warm', t0: 0, samples: [], frameMs: [], calls: [Infinity, -Infinity], tris: [Infinity, -Infinity], gpu: {}, gpuN: 0, cpu: {}, cpuN: 0, result: null, done: false };
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
        userAgent: navigator.userAgent, quality: ctx.quality, dpr: renderer.getPixelRatio(), devicePixelRatio: devicePixelRatio,
        renderSize: size, url: location.search, duration, warmup: warm, pathMetres: Math.round(path.length),
        gpuTimer: gpu.ok, toggles: Object.fromEntries(Object.entries(toggles).map(([k, t]) => [k, t.get()])),
        summary: {
          avgFps: f.fps, low1Fps: f.low1Fps, avgFrameMs: f.avgMs, low1FrameMs: f.low1Ms, frames: f.frames,
          gpuMs: gpu.ok ? (b.gpuN ? gpuOut(b.gpu, b.gpuN) : null) : 'n/a',
          cpuMs: avg(b.cpu, b.cpuN),
          calls: isFinite(b.calls[0]) ? b.calls : null, tris: isFinite(b.tris[0]) ? b.tris : null,
        },
        samples: b.samples,
      };
      showSummary(b.result);
    }
    return b;
  }
  function showSummary(res) {
    const s = res.summary, el = document.createElement('div');
    el.id = 'perf-bench';
    const g = s.gpuMs === 'n/a' ? 'n/a (no timer query in this browser)' : s.gpuMs ? Object.entries(s.gpuMs).map(([k, v]) => `${k} ${v}`).join(' · ') + ' ms' : 'no results';
    const rng = (a, k = 1) => (a ? `${Math.round(a[0] / k)}–${Math.round(a[1] / k)}` : '–');
    el.innerHTML = '<h2>Bench done</h2><pre></pre><div class="row"><button type="button" data-a="dl">Download JSON</button><button type="button" data-a="copy">Copy JSON</button><button type="button" data-a="close">Close</button></div>';
    el.querySelector('pre').textContent = [
      `${res.duration} s · ${res.pathMetres} m · q=${res.quality} · dpr ${res.dpr} · ${res.renderSize.buffer.join('×')} px`,
      `avg ${s.avgFps ?? '–'} fps (${s.avgFrameMs ?? '–'} ms) · 1% low ${s.low1Fps ?? '–'} fps (${s.low1FrameMs ?? '–'} ms) · ${s.frames} frames`,
      `gpu ${g}`,
      `calls ${rng(s.calls)} · tris ${rng(s.tris, 1000)}k`,
      'or paste the output of __fp.perf.report() from the console',
    ].join('\n');
    const json = () => JSON.stringify(res, null, 1);
    el.addEventListener('click', async (e) => {
      const a = e.target?.dataset?.a;
      if (a === 'close') { el.remove(); document.getElementById('card')?.classList.remove('hidden'); }
      else if (a === 'dl') {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([json()], { type: 'application/json' }));
        link.download = `bench-${res.date.slice(0, 10)}-${res.commit ? res.commit.slice(0, 7) + '-' : ''}${res.quality}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      } else if (a === 'copy') {
        try { await navigator.clipboard.writeText(json()); e.target.textContent = 'Copied'; } catch { e.target.textContent = 'Copy failed: use report()'; }
      }
    });
    document.body.appendChild(el);
  }

  function report() {
    const live = renderer.info.render, mem = renderer.info.memory;
    const r = api.active ? last : { calls: live.calls, tris: live.triangles, points: live.points, lines: live.lines };
    return {
      date: new Date().toISOString(), active: api.active,
      ...(current || summarise(win.length ? win : [block])),
      render: { calls: r.calls, triangles: r.tris, points: r.points, lines: r.lines },
      memory: { geometries: mem.geometries, textures: mem.textures, programs: renderer.info.programs?.length ?? null },
      lights: lightsByType(), pixelRatio: renderer.getPixelRatio(), size: renderSize(), quality: ctx.quality,
      gpuTimer: gpu.ok,
      modules: Object.fromEntries([...mods.values()].map((m) => [m.name, { world: m.world, enabled: m.enabled, updates: m.updates, objects: m.objects.size }])),
      toggles: Object.fromEntries(Object.entries(toggles).map(([k, t]) => [k, t.get()])),
      bench: bench ? (bench.result || { phase: bench.phase, samples: bench.samples.length }) : null,
    };
  }

  const api = {
    active: false, gpuTimer: gpu.ok, forModule, attach, frameBegin, frameEnd, cpu, mark: markNow, report,
    setModule, setBloom, setShadows, setActive, toggles,
    get bench() { return bench; },
  };
  return api;
}
