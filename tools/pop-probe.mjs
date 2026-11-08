#!/usr/bin/env node
// Per-frame survey of pops, swaps and hitches along a route (the v6 survey's probe; see wilderness-v6.md).
//   node tools/pop-probe.mjs <base> <scenario> <out.json> [q=medium]
// Scenarios: bench (the ?bench path, 30 s), wood (the tarn's spit into the Deodand Wood), lattice (the
// Outwash to the Lattice), keep (spawn to the gate), span (the west floor toward the Great Span's west
// stair), woodpan (standing in the wood, turning 1.2 rad/s), causeway (walking the causeway toward the
// stones). The route walks at 3 m/s of simulated time, so a slow headless frame covers the same ground.
// Per rendered frame it records: the rAF interval, the frame's own CPU time (frameBegin to composer.render's
// end), draw calls and triangles, programs compiled so far, tree LOD switches (calls to the tree batch's
// setGeometryIdAt), instanced buffers re-uploaded (instanceMatrix.version changes, by mesh name), objects
// whose `visible` flipped (by name), shadow-map redraws, light-slot handovers (a lit slot whose position
// jumps more than 1 m, or that goes dark/lit in one frame), the pixel ratio, and new geometries/textures.
// Headless timings are not hardware timings: read the ratios and the counts, not the milliseconds.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }

const [base = 'http://localhost:8123', scen = 'bench', out = 'pop-probe.json', q = 'medium'] = process.argv.slice(2);
const SC = {
  bench: { url: '&bench=30', bench: true, secs: 36 },
  wood: { route: [[-68, 142], [-120, 136], [-170, 130], [-215, 128]], secs: 60 },
  lattice: { route: [[25, -170], [30, -200], [36, -230], [40, -248]], secs: 30 },
  keep: { route: [[2, 35], [-10, 25], [-30, 20], [-60, 10]], back: true, secs: 30 },
  span: { route: [[-90, 182], [-140, 190], [-190, 196], [-205, 200]], secs: 45 },
  causeway: { route: [[8, 30], [-40, 22], [-90, 2], [-140, -30]], secs: 60 },
  woodpan: { spin: { x: -195, z: 128, rate: 1.2 }, secs: 12 },
}[scen];
if (!SC) { console.error('unknown scenario', scen); process.exit(2); }
const r0 = SC.route?.[0] || [SC.spin?.x ?? 2, SC.spin?.z ?? 35];
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'metal'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(300000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=${q}&pos=${r0[0]},${r0[1]}&yaw=0${SC.url || ''}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate((SC) => {
  const fp = window.__fp, R = fp.renderer, P = { frames: [], names: {} };
  window.__probe = P;
  document.getElementById('card')?.classList.add('hidden');
  fp.sky.flicker.next = 1e9; // hold the gutter so runs compare
  const trees = fp.scene.getObjectByName('veg-trees');
  let lod = 0;
  if (trees?.setGeometryIdAt) { const o = trees.setGeometryIdAt.bind(trees); trees.setGeometryIdAt = (id, g) => { lod++; return o(id, g); }; }
  const inst = [], objs = [], packs = [];
  fp.scene.traverse((o) => { if (o.isInstancedMesh || o.isBatchedMesh) inst.push({ o, v: o.instanceMatrix?.version ?? -1, c: o.count }); if (o.geometry?.attributes?.iPos) packs.push({ o, a: o.geometry.attributes.iPos, v: o.geometry.attributes.iPos.version }); if (o.isMesh || o.isPoints || o.isLine || o.isGroup) objs.push({ o, v: o.visible }); });
  const slots = fp.lightSlots?.slots || [];
  const sl = slots.map((l) => ({ x: l.position.x, y: l.position.y, z: l.position.z, i: l.intensity }));
  const nm = (o) => o.name || o.parent?.name || o.parent?.parent?.name || '?';
  const key = (n) => (n || '?').replace(/-\d+(-far)?$/, '$1').replace(/\d+$/, '');
  const bump = (m, k) => { m[k] = (m[k] || 0) + 1; };
  // route driver: runs after the frame's dt is set and before the controls place the camera
  let lastShadow = 0;
  let nProg = R.info.programs?.length || 0;
  let s = 0, yaw0 = 0, tBegin = 0, prevNow = 0, t = 0;
  const route = SC.route, segs = [];
  if (route) { let L = 0; for (let i = 1; i < route.length; i++) { const l = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); segs.push({ a: route[i - 1], b: route[i], L0: L, l }); L += l; } P.length = L; }
  const fb = fp.perf.frameBegin;
  fp.perf.frameBegin = function () {
    fb.apply(this, arguments);
    tBegin = performance.now();
    const p = fp.player, dt = fp.time.dt;
    t += dt;
    if (SC.bench) return;
    p.enabled = false;
    if (route) {
      s = Math.min(P.length, s + 3 * dt);
      let g = segs[segs.length - 1]; for (const q of segs) if (s <= q.L0 + q.l) { g = q; break; }
      const u = (s - g.L0) / g.l, dx = g.b[0] - g.a[0], dz = g.b[1] - g.a[1];
      p.pos.x = g.a[0] + dx * u; p.pos.z = g.a[1] + dz * u; p.vel?.set(0, 0, 0);
      p.yaw = Math.atan2(-dx, -dz); p.pitch = -0.04;
    } else if (SC.spin) { p.pos.x = SC.spin.x; p.pos.z = SC.spin.z; p.vel?.set(0, 0, 0); p.yaw = yaw0 + SC.spin.rate * t; p.pitch = -0.02; }
  };
  const comp = fp.post.composer, cr = comp.render.bind(comp);
  comp.render = function (...a) {
    const r = cr(...a);
    const now = performance.now(), i = R.info, f = { iv: prevNow ? +(now - prevNow).toFixed(2) : 0, cpu: +(now - tBegin).toFixed(2), calls: i.render.calls, tris: i.render.triangles, prog: i.programs?.length || 0, geo: i.memory.geometries, tex: i.memory.textures, lod, inst: 0, vis: 0, shadow: fp.shadowCadence?.stats.redraws || 0, slot: 0, dpr: fp.tier?.state?.dpr, x: +fp.player.pos.x.toFixed(1), z: +fp.player.pos.z.toFixed(1), yaw: +fp.player.yaw.toFixed(3) };
    prevNow = now; lod = 0;
    const pl = i.programs || [];
    if (pl.length > nProg) { f.newProg = pl.slice(nProg).map((g) => g.name + ':' + String(g.cacheKey).slice(0, 60)); nProg = pl.length; }
    const ev = [];
    for (const e of inst) { const v = e.o.instanceMatrix?.version ?? -1; if (v !== e.v || e.o.count !== e.c) { f.inst++; bump(P.names, 'inst:' + key(nm(e.o))); ev.push('i:' + key(nm(e.o))); e.v = v; e.c = e.o.count; } }
    for (const e of packs) { if (e.a.version !== e.v) { f.repack = (f.repack || 0) + 1; bump(P.names, 'repack:' + key(nm(e.o))); ev.push('r:' + key(nm(e.o))); e.v = e.a.version; } }
    f.shadowNow = (fp.shadowCadence?.stats.redraws || 0) !== lastShadow; lastShadow = fp.shadowCadence?.stats.redraws || 0;
    for (const e of objs) { if (e.o.visible !== e.v) { f.vis++; bump(P.names, 'vis:' + key(nm(e.o))); ev.push('v:' + key(nm(e.o))); e.v = e.o.visible; } }
    slots.forEach((l, k) => {
      const o = sl[k], lit = l.intensity > 0, was = o.i > 0;
      const jump = Math.hypot(l.position.x - o.x, l.position.y - o.y, l.position.z - o.z);
      if ((lit && was && jump > 1) || lit !== was) { f.slot++; bump(P.names, 'slot'); }
      o.x = l.position.x; o.y = l.position.y; o.z = l.position.z; o.i = l.intensity;
    });
    if (ev.length) f.ev = ev.slice(0, 12);
    P.frames.push(f);
    return r;
  };
}, SC);
await page.waitForTimeout(SC.secs * 1000);
const res = await page.evaluate(() => {
  const P = window.__probe, F = P.frames.slice(5); // skip the hand-off frames
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)] || 0; };
  const iv = F.map((f) => f.iv), cpu = F.map((f) => f.cpu), mi = med(iv), mc = med(cpu);
  const sum = (k) => F.reduce((s, f) => s + (f[k] || 0), 0);
  const top = [...F].sort((a, b) => b.iv - a.iv).slice(0, 8);
  const shadowRedraws = F.length ? F[F.length - 1].shadow - F[0].shadow : 0;
  const progs = F.length ? [F[0].prog, F[F.length - 1].prog] : [];
  const progFrames = F.filter((f, i) => i && f.prog > F[i - 1].prog).map((f) => ({ x: f.x, z: f.z, prog: f.prog, iv: f.iv, cpu: f.cpu, newProg: f.newProg }));
  const dprs = [...new Set(F.map((f) => f.dpr))];
  return {
    frames: F.length, length: P.length, medianIv: mi, medianCpu: mc,
    over2x: F.filter((f) => f.iv > 2 * mi).length, over2xCpu: F.filter((f) => f.cpu > 2 * mc).length,
    maxIvRatio: +(Math.max(...iv) / mi).toFixed(2), maxCpuRatio: +(Math.max(...cpu) / mc).toFixed(2),
    repacks: sum('repack'), repackFrames: F.filter((f) => f.repack).length,
    cpuShadowFrames: med(F.filter((f) => f.shadowNow).map((f) => f.cpu)), cpuOtherFrames: med(F.filter((f) => !f.shadowNow).map((f) => f.cpu)),
    cpuRepackFrames: med(F.filter((f) => f.repack).map((f) => f.cpu)),
    lodSwitches: sum('lod'), lodFramesMax: Math.max(...F.map((f) => f.lod)), instUploads: sum('inst'), visFlips: sum('vis'), slotHandovers: sum('slot'),
    shadowRedraws, shadowPerSec: +(shadowRedraws / (sum('iv') / 1000)).toFixed(2), programs: progs, progFrames, dprs,
    calls: [Math.min(...F.map((f) => f.calls)), med(F.map((f) => f.calls)), Math.max(...F.map((f) => f.calls))],
    tris: [Math.min(...F.map((f) => f.tris)), med(F.map((f) => f.tris)), Math.max(...F.map((f) => f.tris))],
    geo: F.length ? [F[0].geo, F[F.length - 1].geo] : [], tex: F.length ? [F[0].tex, F[F.length - 1].tex] : [],
    byName: P.names, steady: Object.keys(P.names).filter((k) => P.names[k] > 0.8 * P.frames.length),
    eventful: Object.fromEntries(Object.entries(P.names).filter(([k, v]) => v <= 0.8 * P.frames.length)),
    worst: top.map(({ ev, ...f }) => f), series: F,
  };
});
res.scenario = scen; res.q = q;
writeFileSync(out, JSON.stringify(res));
const { series, ...summary } = res;
console.log(JSON.stringify(summary, null, 0).slice(0, 4000));
await browser.close();
