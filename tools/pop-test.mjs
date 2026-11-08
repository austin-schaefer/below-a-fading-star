#!/usr/bin/env node
// Pop test (v6): counts what pops, swaps and uploads along routes, and measures pops in pictures.
//   node tools/pop-test.mjs [base-url] [--label=before] [--only=uploads,trees,...] [--q=medium]
// One browser, in sequence. The counters are ctx.perf.count's (src/perf.js; the url carries perf=1, adapt=0, wind=0).
// Routes: the bench (?bench=30), then in one page the probe's walks (wood, lattice, keep, span, causeway at 3 m/s of
// simulated time) and a 360° pan at (-195, 128) at 1.2 rad/s. Per rendered frame: interval, CPU, calls, triangles
// and the counters. Pinned sequences: the camera's render is frozen at a pose (the sky dome and the sun's screen
// position pinned with it), the player is stepped across a switch, and the frames of the next 24 game frames are
// grabbed; the largest changed-pixel count between consecutive frames (tools/pair-diff.mjs: blurred 1.5 px, 5% fuzz)
// is read against a baseline taken the same way at the same pose with nothing changing. A hard pop is one big step,
// a fade many small ones. Headless timings are not hardware timings: rows are counts and ratios.
// Rows { id, owner, target, value, pass, gate }: the process exits 1 only when a gated row fails; every row prints.
// Groups (--only): uploads (gated), pacing, trees, fungi, plants, rocks, shadow, aliasing. routes adds the other
// walks to the full run's numbers. --save-baseline keeps the first baseline pair as shots/wip/v6-01-baseline-{a,b,diff}.png. Writes shots/perf/v6-pop-<label>.json.
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seqChanged, pairDiff } from './pair-diff.mjs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const args = process.argv.slice(2), flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const base = args.find((a) => !a.startsWith('--')) || 'http://localhost:8123';
const label = flag('label', 'run'), Q = flag('q', 'medium');
const only = flag('only', '').split(',').filter(Boolean);
const ALL = ['uploads', 'pacing', 'trees', 'fungi', 'plants', 'rocks', 'shadow', 'aliasing'];
const want = (g) => !only.length || only.includes(g);
const needBench = want('uploads') || want('pacing');
const needWalk = want('uploads') || want('shadow') || want('routes') || !only.length;
const needSeq = ['trees', 'fungi', 'plants', 'rocks', 'aliasing'].some(want);
const t00 = Date.now();

const rows = [], extra = { routes: {}, seqs: {} };
const row = (id, owner, target, value, pass, gate = false, detail) => { rows.push({ id, owner, target, value, pass: !!pass, gate, ...(detail ? { detail } : {}) }); };

const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'metal'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const common = `q=${Q}&perf=1&adapt=0&wind=0`;

// ---- the page-side kit, installed once per page (a string: it runs in the browser)
const KIT = () => {
  const fp = window.__fp, R = fp.renderer, pt = (window.__pt = { rec: null, onFrame: null });
  document.getElementById('card')?.classList.add('hidden');
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9; // the gutter held, so runs compare
  const CK = ['trees.lodSwitches', 'fungi.groupFlips', 'plants.repacks', 'plants.farSwitches', 'rocks.packs', 'shadow.redraws.move', 'shadow.redraws.clock', 'shadow.redraws.dynamic', 'shadow.redraws.turn', 'lights.handovers', 'tier.steps', 'uploads.programs', 'uploads.geometries', 'uploads.textures', 'uploads.texFirst', 'uploads.texData'];
  const tot = () => { const o = {}; for (const k of CK) o[k] = fp.perf.counters[k]?.total || 0; return o; };
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 0; };
  let drive = null, tBegin = 0, prevEnd = 0, tSim = 0;
  const fb = fp.perf.frameBegin, fe = fp.perf.frameEnd;
  fp.perf.frameBegin = function () {
    fb.apply(this, arguments);
    tBegin = performance.now();
    if (drive) drive(fp.time.dt);
  };
  fp.perf.frameEnd = function () {
    const r = fe.apply(this, arguments);
    const now = performance.now(), rc = pt.rec;
    if (rc) {
      const f = { iv: prevEnd ? now - prevEnd : 0, cpu: now - tBegin, calls: R.info.render.calls, tris: R.info.render.triangles, t: now - rc.t0 };
      const rp = fp.perf.counters['plants.repacks']?.last || 0, lod = fp.perf.counters['trees.lodSwitches']?.last || 0;
      f.repacks = rp; f.lod = lod; f.sh = (fp.perf.counters['shadow.redraws.move']?.last || 0) + (fp.perf.counters['shadow.redraws.clock']?.last || 0) + (fp.perf.counters['shadow.redraws.dynamic']?.last || 0) + (fp.perf.counters['shadow.redraws.turn']?.last || 0);
      if (rc.n++ > 3) rc.frames.push(f); // the hand-off frames are left out
    }
    prevEnd = now;
    if (pt.onFrame) pt.onFrame();
    return r;
  };
  const frames = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const dims0 = () => ({ ...(fp.gpumem?.dataDims?.() || {}) });
  pt.frames = frames;
  pt.pose = (x, z, yaw, pitch = 0) => { const p = fp.player; p.enabled = false; p.pos.x = x; p.pos.z = z; p.pos.y = fp.terrain.heightAt(x, z) + p.eye; p.yaw = yaw; p.pitch = pitch; p.vel?.set(0, 0, 0); };
  // record frames while a driver (route walk or spin) runs
  pt.run = async (spec, maxSecs) => {
    const p = fp.player;
    p.enabled = false;
    let s = 0, t = 0, done = false, L = 0; const segs = [];
    if (spec.route) { for (let i = 1; i < spec.route.length; i++) { const l = Math.hypot(spec.route[i][0] - spec.route[i - 1][0], spec.route[i][1] - spec.route[i - 1][1]); segs.push({ a: spec.route[i - 1], b: spec.route[i], L0: L, l }); L += l; } }
    const start = spec.route ? spec.route[0] : [spec.spin.x, spec.spin.z];
    pt.pose(start[0], start[1], 0, -0.04);
    await frames(30);
    const yaw0 = p.yaw;
    drive = (dt) => {
      p.enabled = false;
      t += dt;
      if (spec.route) {
        s = Math.min(L, s + 3 * dt);
        let g = segs[segs.length - 1]; for (const q of segs) if (s <= q.L0 + q.l) { g = q; break; }
        const u = (s - g.L0) / g.l, dx = g.b[0] - g.a[0], dz = g.b[1] - g.a[1];
        p.pos.x = g.a[0] + dx * u; p.pos.z = g.a[1] + dz * u; p.vel?.set(0, 0, 0);
        p.yaw = Math.atan2(-dx, -dz); p.pitch = -0.04;
        if (s >= L) done = true;
      } else { p.pos.x = spec.spin.x; p.pos.z = spec.spin.z; p.vel?.set(0, 0, 0); p.yaw = yaw0 + spec.spin.rate * t; p.pitch = -0.02; if (t >= spec.spin.secs) done = true; }
    };
    const c0 = tot(), d0 = dims0(), w0 = performance.now();
    pt.rec = { t0: w0, n: 0, frames: [] };
    while (!done && performance.now() - w0 < maxSecs * 1000) await frames(10);
    const rc = pt.rec; pt.rec = null; drive = null;
    const c1 = tot(), d1 = dims0(), F = rc.frames;
    const delta = {}; for (const k of CK) delta[k] = c1[k] - c0[k];
    const dd = {}; for (const k in d1) if (d1[k] - (d0[k] || 0)) dd[k] = d1[k] - (d0[k] || 0);
    const mi = med(F.map((f) => f.iv)), wall = F.reduce((a, f) => a + f.iv, 0) / 1000;
    return {
      frames: F.length, wallSecs: +wall.toFixed(1), complete: done, medianIv: +mi.toFixed(2), medianCpu: +med(F.map((f) => f.cpu)).toFixed(2),
      over2x: F.filter((f) => f.iv > 2 * mi).length, over2xAfter1s: F.filter((f) => f.iv > 2 * mi && f.t > 1000).length, maxIvRatio: +(Math.max(0, ...F.map((f) => f.iv)) / (mi || 1)).toFixed(2),
      calls: [Math.min(...F.map((f) => f.calls)), med(F.map((f) => f.calls)), Math.max(...F.map((f) => f.calls))], tris: [Math.min(...F.map((f) => f.tris)), med(F.map((f) => f.tris)), Math.max(...F.map((f) => f.tris))],
      counters: delta, lodFramesMax: Math.max(0, ...F.map((f) => f.lod)), repackFrames: F.filter((f) => f.repacks).length, repackTwoKindFrames: F.filter((f) => f.repacks > 1).length,
      shadowRedrawsPerSec: +((delta['shadow.redraws.move'] + delta['shadow.redraws.clock'] + delta['shadow.redraws.dynamic'] + delta['shadow.redraws.turn']) / (wall || 1)).toFixed(2),
      dataTextures: dd,
    };
  };
  // pinned sequences
  const cam = () => ({ x: fp.camera.position.x, y: fp.camera.position.y, z: fp.camera.position.z });
  const dome = fp.scene.getObjectByName('sky');
  const grab = (pin) => {
    if (!pin) return document.getElementById('scene').toDataURL('image/png').split(',')[1]; // unpinned: the camera moves with the player
    fp.camera.position.set(pin.x, pin.y, pin.z); fp.camera.updateMatrixWorld();
    dome?.position.copy(fp.camera.position); // the dome and the rays follow the camera: pinned with it
    fp.post.update(0, fp.time.t);
    fp.post.composer.render();
    return document.getElementById('scene').toDataURL('image/png').split(',')[1];
  };
  const trees = fp.scene.getObjectByName('veg-trees');
  const ver = (re) => { let s = 0; const r = new RegExp(re); fp.scene.traverse((o) => { if (r.test(o.name)) s += (o.geometry?.attributes?.iPos?.version ?? o.instanceMatrix?.version ?? 0) * 1000 + (o.geometry?.instanceCount ?? o.count ?? 0); }); return s; };
  const vis = (re) => { let s = ''; const r = new RegExp(re); fp.scene.traverse((o) => { if (r.test(o.name)) s += o.visible ? 1 : 0; }); return s; };
  const T = () => window.__vegParts.trees.trees;
  pt.findTree = (x, z, kind) => { let b = null, bd = 1e9; for (const t of T()) { if (kind && t.kind !== kind) continue; const d = Math.hypot(t.x - x, t.z - z); if (d < bd) { bd = d; b = t; } } return b && { x: b.x, z: b.z, id: b.id, kind: b.kind, d: bd }; };
  const watchOf = (w) => (w.id != null ? () => trees.getGeometryIdAt(w.id) : w.ver ? () => ver(w.ver) : () => vis(w.vis));
  pt.locate = async (sp) => {
    const watch = watchOf(sp.watch), n = Math.ceil(Math.hypot(sp.to[0] - sp.from[0], sp.to[1] - sp.from[1]) / sp.step);
    pt.pose(sp.from[0], sp.from[1], sp.yaw, sp.pitch || 0); await frames(40);
    let prev = watch();
    for (let i = 1; i <= n; i++) {
      const u = i / n; pt.pose(sp.from[0] + (sp.to[0] - sp.from[0]) * u, sp.from[1] + (sp.to[1] - sp.from[1]) * u, sp.yaw, sp.pitch || 0);
      await frames(2);
      const cur = watch(); if (cur !== prev) return i;
      prev = cur;
    }
    return 0;
  };
  const at = (sp, i) => [sp.from[0] + (sp.to[0] - sp.from[0]) * i / Math.ceil(Math.hypot(sp.to[0] - sp.from[0], sp.to[1] - sp.from[1]) / sp.step), sp.from[1] + (sp.to[1] - sp.from[1]) * i / Math.ceil(Math.hypot(sp.to[0] - sp.from[0], sp.to[1] - sp.from[1]) / sp.step)];
  // re-approach from the start so hysteresis and lazy repacks hold the before state; returns the pinned camera
  pt.approach = async (sp, i) => {
    const settle = sp.settle || 6;
    pt.pose(sp.from[0], sp.from[1], sp.yaw, sp.pitch || 0); await frames(settle);
    for (let j = 1; j < i; j += Math.max(1, Math.floor(4 / sp.step))) { const [x, z] = at(sp, j); pt.pose(x, z, sp.yaw, sp.pitch || 0); await frames(2); }
    const [bx, bz] = at(sp, i - 1); pt.pose(bx, bz, sp.yaw, sp.pitch || 0); await frames(settle);
    return cam();
  };
  // grab n game frames at the pin; the first is the before state, then the player steps to `after` (or stays)
  pt.grabRun = (pin, after, n) => new Promise((res) => {
    const out = []; let k = 0;
    pt.onFrame = () => {
      out.push(grab(pin));
      if (k++ === 0 && after) pt.pose(after[0], after[1], after[2], after[3] || 0);
      if (out.length >= n) { pt.onFrame = null; res(out); }
    };
  });
  pt.watchVal = (w) => String(watchOf(w)());
  pt.atPose = (sp, i) => at(sp, i);
  pt.hold = async (x, z, yaw, pitch, settle) => { pt.pose(x, z, yaw, pitch); await frames(settle); return cam(); };
  // which scene textures are small data textures, by size (the names of the per-frame uploads gpumem counts by size)
  pt.texNames = () => {
    const out = {};
    fp.scene.traverse((o) => {
      for (const k of ['_matricesTexture', '_indirectTexture', '_colorsTexture']) { const t = o[k]; if (t?.image?.width) (out[`${t.image.width}x${t.image.height}`] ||= []).push(`${o.name || o.type}.${k}`); }
    });
    return out;
  };
};

async function openPage(url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.setDefaultTimeout(600000);
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  return page;
}

const log = (...a) => console.log(`[${((Date.now() - t00) / 1000).toFixed(0)}s]`, ...a);
const sumUploads = (c) => c['uploads.programs'] + c['uploads.geometries'] + c['uploads.texFirst'] + c['uploads.textures'];
const upValue = (c) => `programs ${c['uploads.programs']}, geometries ${c['uploads.geometries']}, textures ${c['uploads.textures']}, first-sight uploads ${c['uploads.texFirst']}`;

// ---- the bench
if (needBench) {
  log('bench');
  const page = await openPage(`${base}/?${common}&bench=30&pos=2,35&yaw=0`);
  await page.evaluate(KIT);
  const res = await page.evaluate(async () => {
    const fp = window.__fp, pt = window.__pt;
    const c0 = {}; for (const k in fp.perf.counters) c0[k] = fp.perf.counters[k].total;
    const d0 = { ...(fp.gpumem?.dataDims?.() || {}) };
    pt.rec = { t0: performance.now(), n: 0, frames: [] };
    while (!fp.perf.bench.done) await pt.frames(30);
    const F = pt.rec.frames; pt.rec = null;
    const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 0; };
    const mi = med(F.map((f) => f.iv)), delta = {};
    for (const k in fp.perf.counters) delta[k] = fp.perf.counters[k].total - (c0[k] || 0);
    const d1 = fp.gpumem?.dataDims?.() || {}, dd = {}; for (const k in d1) if (d1[k] - (d0[k] || 0)) dd[k] = d1[k] - (d0[k] || 0);
    return { names: pt.texNames(), frames: F.length, medianIv: +mi.toFixed(2), medianCpu: +med(F.map((f) => f.cpu)).toFixed(2), over2x: F.filter((f) => f.iv > 2 * mi).length, over2xAfter1s: F.filter((f) => f.iv > 2 * mi && f.t > 1000).length, maxIvRatio: +(Math.max(...F.map((f) => f.iv)) / mi).toFixed(2), counters: delta, repackTwoKindFrames: F.filter((f) => f.repacks > 1).length, dataTextures: dd, bench: fp.perf.report().bench?.summary?.avgFps };
  });
  await page.close();
  const C = { 'uploads.programs': 0, 'uploads.geometries': 0, 'uploads.textures': 0, 'uploads.texFirst': 0, 'uploads.texData': 0, ...res.counters };
  extra.dataTextureNames = res.names; delete res.names;
  extra.routes.bench = res;
  if (want('uploads')) row('uploads.bench', 'v6-01', 'programs, geometries, first-sight textures after the card = 0', upValue(C), sumUploads(C) === 0, true, { texData: C['uploads.texData'], dataTextures: res.dataTextures });
  if (want('pacing')) row('pacing.bench', 'orchestrator', 'frames over 2x the median <= 2, all in the first second', `${res.over2x} over 2x (${res.over2xAfter1s} after 1 s), max ${res.maxIvRatio}x`, res.over2x <= 2 && res.over2xAfter1s === 0, false);
  if (want('plants')) row('plants.bench-repack-spread', 'v6-05', 'no frame packs two kinds', `${C['plants.repacks']} repacks, ${res.repackTwoKindFrames} frames with 2+`, res.repackTwoKindFrames === 0, true);
  extra.routes.benchCounters = res.counters;
}

// ---- the walks, the pan and the pinned sequences, in one page
if (needWalk || needSeq) {
  const page = await openPage(`${base}/?${common}&pos=-68,142&yaw=1.571`);
  await page.evaluate(KIT);
  extra.dataTextureNames = await page.evaluate(() => window.__pt.texNames());
  if (needWalk) {
    const WALKS = {
      wood: { route: [[-68, 142], [-120, 136], [-170, 130], [-215, 128]], secs: 90 },
      woodpan: { spin: { x: -195, z: 128, rate: 1.2, secs: 12 }, secs: 20 },
      lattice: { route: [[25, -170], [30, -200], [36, -230], [40, -248]], secs: 50 },
      keep: { route: [[2, 35], [-10, 25], [-30, 20], [-60, 10]], secs: 40 },
      span: { route: [[-90, 182], [-140, 190], [-190, 196], [-205, 200]], secs: 70 },
      causeway: { route: [[8, 30], [-40, 22], [-90, 2], [-140, -30]], secs: 90 },
    };
    const names = ['wood', 'woodpan'].concat(!only.length || want('routes') ? ['lattice', 'keep', 'span', 'causeway'] : []);
    for (const n of names) {
      log('route', n);
      const r = await page.evaluate(([spec, secs]) => window.__pt.run(spec, secs), [WALKS[n], WALKS[n].secs]);
      extra.routes[n] = r;
      const C = r.counters;
      if (n === 'wood' && want('uploads')) row('uploads.wood', 'v6-01', 'programs, geometries, first-sight textures after the card = 0', upValue(C), sumUploads(C) === 0, true, { texData: C['uploads.texData'], dataTextures: r.dataTextures });
      if (n === 'woodpan') {
        if (want('uploads')) row('uploads.pan', 'v6-01', 'programs, geometries, first-sight textures after the card = 0', upValue(C), sumUploads(C) === 0, true, { texData: C['uploads.texData'], dataTextures: r.dataTextures });
        if (want('shadow')) row('shadow.pan-redraws', 'v6-03', 'a turn at 1.2 rad/s redraws <= 4/s', `${r.shadowRedrawsPerSec.toFixed(1)}/s (${C['shadow.redraws.move']} move, ${C['shadow.redraws.clock']} clock, ${C['shadow.redraws.dynamic']} dynamic, ${C['shadow.redraws.turn']} turn)`, r.shadowRedrawsPerSec <= 4, false);
      }
      if (n === 'wood' && want('plants')) row('plants.wood-repack-spread', 'v6-05', 'no frame packs two kinds', `${C['plants.repacks']} repacks in ${r.repackFrames} frames, ${r.repackTwoKindFrames} with 2+`, r.repackTwoKindFrames === 0, true);
      if (want('trees') && n === 'wood') row('trees.wood-switches', 'v6-04', 'reported (the switches per route)', `${C['trees.lodSwitches']} switches, at most ${r.lodFramesMax} in a frame`, true, false);
    }
  }
  if (needSeq) {
    const W = Math.PI / 2;
    const pose = (x, z) => [x, z];
    const SEQ = [
      // a tree, found by kind nearest a spot (the survey's lone tree at (-125.8, -44) is gone: v5 moved the trees), and the line to walk as offsets from it
      { id: 'tree-near', group: 'trees', owner: 'v6-04', gate: false /* noise-bound: a few pixels of scene motion (grass, motes, water) against a 2-200 px baseline; reported */, tree: [-125.8, -44, 'lone'], rel: [[44, 0], [14, 0]], yaw: W, step: 0.5 },
      { id: 'tree-far', group: 'trees', owner: 'v6-04', gate: true, tree: [-125.8, -44, 'lone'], rel: [[130, 0], [50, 0]], yaw: W, step: 1 },
      { id: 'tree-wood', group: 'trees', owner: 'v6-04', gate: false /* noise-bound: a few pixels of scene motion (grass, motes, water) against a 2-200 px baseline; reported */, tree: [-142.2, 140.9, 'wood'], rel: [[34, 0], [14, 0]], yaw: W, step: 0.5 },
      { id: 'grass-far', group: 'plants', owner: 'v6-05', gate: true, from: [-20, 18], to: [-70, 14], yaw: W, step: 1, watch: { ver: '^veg-grass-far$' } },
      { id: 'reeds-far', group: 'plants', owner: 'v6-05', gate: true, cands: [{ from: [70, 40], to: [70, 110], yaw: Math.PI }, { from: [70, 280], to: [70, 215], yaw: 0 }, { from: [-30, 160], to: [10, 160], yaw: -W }, { from: [190, 160], to: [150, 160], yaw: W }], step: 1, watch: { ver: '^veg-reeds-far$' } },
      { id: 'rocks', group: 'rocks', owner: 'v6-05', gate: false /* noise-bound: a slow drift against a 10-48 px baseline; the repack-spread rows are the gate */, from: [230, -20], to: [250, -40], yaw: 2.4, step: 1, settle: 3, watch: { ver: '^rocks-stone' } },
      { id: 'fungi', group: 'fungi', owner: 'v6-04', gate: false /* noise-bound: a few pixels of scene motion (grass, motes, water) against a 2-200 px baseline; reported */, from: [-68, 142], to: [-160, 132], yaw: W, step: 1, watch: { vis: 'veg-(toadstools|pods)' } },
    ];
    const FR = 24;
    let savedBaseline = false;
    const dir = mkdtempSync(join(tmpdir(), 'pop-seq-'));
    const save = (id, tag, frames) => frames.map((b64, k) => { const f = join(dir, `${id}-${tag}-${String(k).padStart(2, '0')}.png`); writeFileSync(f, Buffer.from(b64, 'base64')); return f; });
    for (const sp0 of SEQ) {
      if (!want(sp0.group)) continue;
      log('sequence', sp0.id);
      let sp = sp0, i = 0;
      if (sp0.tree) {
        const t = await page.evaluate(([x, z, k]) => window.__pt.findTree(x, z, k), sp0.tree);
        if (!t) { row(`${sp0.group}.${sp0.id}`, sp0.owner, 'largest step <= 2x baseline', `no ${sp0.tree[2]} tree`, false, false); continue; }
        sp = { ...sp0, from: [t.x + sp0.rel[0][0], t.z + sp0.rel[0][1]], to: [t.x + sp0.rel[1][0], t.z + sp0.rel[1][1]], watch: { id: t.id }, treeAt: [+t.x.toFixed(1), +t.z.toFixed(1), t.kind] };
      }
      for (const cand of sp0.cands || [null]) {
        sp = cand ? { ...sp0, ...cand } : sp;
        i = await page.evaluate((s) => window.__pt.locate(s), sp);
        if (i) break;
      }
      if (!i) { row(`${sp0.group}.${sp0.id}`, sp0.owner, 'largest step <= 2x baseline', 'no switch found along the line', false, !!sp0.gate); continue; }
      const pin = await page.evaluate(([s, k]) => window.__pt.approach(s, k), [sp, i]);
      const base = save(sp0.id, 'base', await page.evaluate(([p, n]) => window.__pt.grabRun(p, null, n), [pin, FR]));
      if (args.includes('--save-baseline') && !savedBaseline) { // the noise floor through this path: first and last baseline frame, and their diff, into shots/wip
        savedBaseline = true;
        copyFileSync(base[0], 'shots/wip/v6-01-baseline-a.png'); copyFileSync(base[base.length - 1], 'shots/wip/v6-01-baseline-b.png');
        extra.baselinePair = pairDiff('shots/wip/v6-01-baseline-a.png', 'shots/wip/v6-01-baseline-b.png', 'shots/wip/v6-01-baseline-diff.png');
        log('baseline pair', JSON.stringify(extra.baselinePair));
      }
      const pin2 = await page.evaluate(([s, k]) => window.__pt.approach(s, k), [sp, i]);
      const w0 = await page.evaluate((w) => window.__pt.watchVal(w), sp.watch);
      const [ax, az] = await page.evaluate(([s, k]) => window.__pt.atPose(s, k), [sp, i]);
      const sw = save(sp0.id, 'switch', await page.evaluate(([p, a, n]) => window.__pt.grabRun(p, a, n), [pin2, [ax, az, sp.yaw, sp.pitch || 0], FR]));
      const w1 = await page.evaluate((w) => window.__pt.watchVal(w), sp.watch);
      const bs = seqChanged(base), ss = seqChanged(sw);
      const bmax = Math.max(...bs), smax = Math.max(...ss), floor = Math.max(bmax, 1);
      const at = ss.indexOf(smax);
      extra.seqs[sp0.id] = { from: sp.from, to: sp.to, tree: sp.treeAt, switchStep: i, at: [ax, az], baseline: bs, switch: ss };
      row(`${sp0.group}.${sp0.id}`, sp0.owner, 'largest step <= 2x baseline', `${smax} changed (frame ${at + 1} of ${ss.length}) vs baseline ${bmax}: ${(smax / floor).toFixed(1)}x`, smax <= 2 * floor, !!sp0.gate, { baseline: bmax, largest: smax, ratio: +(smax / floor).toFixed(2), stepsOver100: ss.filter((c) => c > 100).length, watchBefore: w0.slice(0, 40), watchAfter: w1.slice(0, 40), switched: w0 !== w1 });
      console.log('  watch', sp0.id, w0.slice(0, 30), '->', w1.slice(0, 30), 'steps', ss.join(','));
    }
    if (want('aliasing')) {
      log('sequence aliasing');
      // the camera itself moves 5 cm (the thin things' coverage changes), so the frames are not pinned
      await page.evaluate(() => window.__pt.hold(-160, 140, Math.PI / 2, 0.25, 40));
      const base = save('aliasing', 'base', await page.evaluate(() => window.__pt.grabRun(null, null, 6)));
      await page.evaluate(() => window.__pt.hold(-160, 140, Math.PI / 2, 0.25, 40));
      const sw = save('aliasing', 'switch', await page.evaluate(() => window.__pt.grabRun(null, [-160, 140.05, Math.PI / 2, 0.25], 6)));
      const bs = seqChanged(base), ss = seqChanged(sw), bmax = Math.max(...bs), smax = Math.max(...ss);
      extra.seqs.aliasing = { baseline: bs, switch: ss };
      row('aliasing.step-5cm', 'v6-08', 'a 5 cm sideways step <= 2x baseline', `${smax} changed vs baseline ${bmax}: ${(smax / Math.max(1, bmax)).toFixed(1)}x`, smax <= 2 * Math.max(1, bmax), false, { baseline: bmax, largest: smax });
    }
    if (process.env.POP_KEEP) console.log('frames kept in', dir); else rmSync(dir, { recursive: true, force: true });
  }
  await page.close();
}
await browser.close();

// ---- the table
const pad = (s, n) => String(s).padEnd(n);
console.log('\n' + pad('row', 30) + pad('owner', 14) + pad('gate', 6) + pad('pass', 6) + 'value  (target)');
for (const r of rows) console.log(pad(r.id, 30) + pad(r.owner, 14) + pad(r.gate ? 'GATE' : '-', 6) + pad(r.pass ? 'ok' : 'FAIL', 6) + `${r.value}  (${r.target})`);
const failed = rows.filter((r) => r.gate && !r.pass);
const runSecs = Math.round((Date.now() - t00) / 1000);
console.log(`\n${rows.length} rows, ${rows.filter((r) => r.pass).length} pass, ${failed.length} gated failures, ${runSecs} s`);
mkdirSync('shots/perf', { recursive: true });
const out = `shots/perf/v6-pop-${label}.json`;
writeFileSync(out, JSON.stringify({ kind: 'fading-planet-pop-test', label, date: new Date().toISOString(), base, q: Q, only, runSecs, rows, ...extra }, null, 1));
console.log('wrote', out);
process.exit(failed.length ? 1 : 0);
