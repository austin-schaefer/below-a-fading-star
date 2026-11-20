#!/usr/bin/env node
// v18-F1: the wood's three spurs (routes.js P57-P59) and the foxfire that is their only mark (src/v18/foxfire.js).
// Checks, from the live page on low: each spur leaves the wood way (P32) and ends at its doorstep (src/v18/plan.js
// SPURS, within 3 m); its threshold carries foxfire (2+ clumps on its logs' ends or posts) and its knot is 5-8.5 m in, with
// nothing else lit by the road; along it, every clump is within 14 m of the one before and in sight of it (the line
// between them at a walker's knee to eye misses every trunk collider but the two hosts); from every 4 m of the spur a
// clump is in sight within 16 m; no gnomon stands within 6 m of a spur past its head (no signpost: foxfire only); no
// stump stands on a tread; the foxfire's cost (draw calls, triangles). The roads-test's sight rule skips the spurs;
// its other rules (joined, walkable, dry, nothing across) hold for them.
// Usage: node tools/foxfire-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { launch } from './launch.mjs';
const base = (process.argv[2] || process.env.FP_BASE || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
await page.goto(`${base}/?q=low&pos=-200,126`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const res = await page.evaluate(async () => {
  const fp = window.__fp, F = fp.foxfire;
  if (!F) return { missing: true };
  const { SPURS } = await import('/src/v18/plan.js');
  const ends = { P57: SPURS.glass, P58: SPURS.beds, P59: SPURS.north };
  const leads = fp.paths.leads, P32 = leads.find((l) => l.id === 'P32');
  const segD = (x, z, pts) => { let b = Infinity; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)); b = Math.min(b, Math.hypot(x - ax - ex * t, z - az - ez * t)); } return b; };
  const C = fp.controls.state.colliders.filter((c) => c.r != null && c.x != null);
  // a sight at knee to eye height between two points on the ground: blocked by a collider whose disc it crosses, whose
  // top is above the knee, and which holds neither end
  const sees = (a, b) => {
    const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
    const x0 = Math.min(a.x, b.x) - 3, x1 = Math.max(a.x, b.x) + 3, z0 = Math.min(a.z, b.z) - 3, z1 = Math.max(a.z, b.z) + 3;
    for (const c of C) {
      if (c.x < x0 || c.x > x1 || c.z < z0 || c.z > z1 || c.x1 != null) continue;
      if (c.h != null && c.y != null && c.y + c.h < fp.terrain.heightAt(c.x, c.z) + 0.6) continue; // below the knee: a log, a stump
      if (Math.hypot(a.x - c.x, a.z - c.z) < c.r + 0.15 || Math.hypot(b.x - c.x, b.z - c.z) < c.r + 0.15) continue; // a host
      const t = Math.max(0, Math.min(1, ((c.x - a.x) * ex + (c.z - a.z) * ez) / l2));
      if (Math.hypot(c.x - a.x - ex * t, c.z - a.z - ez * t) < c.r) return false;
    }
    return true;
  };
  const out = [];
  for (const id of ['P57', 'P58', 'P59']) {
    const L = leads.find((l) => l.id === id);
    if (!L) { out.push({ id, missing: true }); continue; }
    const pts = L.lines[0].map((s) => [s[0], s[1]]), head = pts[0], end = pts[pts.length - 1];
    const cl = F.clumps.filter((c) => c.spur === id).sort((a, b) => a.at - b.at);
    // round three: the threshold's clumps (on its logs' cut ends or its posts), the knot 5-8.5 m in, and nothing else by
    // the road (within 3.5 m of P32's line and 12 m of the head)
    const P32l = P32.lines[0].map((q) => [q[0], q[1]]);
    const knot = cl.filter((c) => c.threshold);
    const mouth = cl.filter((c) => c.knot && c.at >= 5 && c.at <= 8.5 && c.n >= 6).length;
    const roadside = cl.filter((c) => !c.threshold && Math.hypot(c.x - head[0], c.z - head[1]) < 12 && segD(c.x, c.z, P32l) < 3.5).map((c) => `(${c.x.toFixed(1)},${c.z.toFixed(1)})`);
    // the chain
    // (every clump past the knot is seen from one before it, within 14 m: the knot's two mouth stumps are one station)
    const breaks = [];
    for (const b of cl) {
      if (b.threshold || b.knot) continue;
      const before = cl.filter((a) => a !== b && a.at <= b.at);
      if (!before.some((a) => Math.hypot(a.x - b.x, a.z - b.z) <= 14 && sees(a, b))) { const a = before[before.length - 1]; breaks.push(`${a ? a.at.toFixed(0) : '?'}->${b.at.toFixed(0)} (${a ? Math.hypot(a.x - b.x, a.z - b.z).toFixed(1) : '?'} m)`); }
    }
    // from every 4 m of the spur, a clump in sight within 16 m
    const blind = [];
    let s = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      for (let u = 0; u < l; u += 4) {
        const p = { x: ax + (bx - ax) * (u / l), z: az + (bz - az) * (u / l) };
        if (!cl.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 16 && sees(p, c))) blind.push(`(${p.x.toFixed(0)},${p.z.toFixed(0)})`);
      }
      s += l;
    }
    const gnomons = fp.roads.gnomons.filter((g) => g.visible && Math.hypot(g.x - head[0], g.z - head[1]) > 10 && segD(g.x, g.z, pts) < 6).map((g) => `(${g.x.toFixed(0)},${g.z.toFixed(0)})`);
    out.push({ id, len: +L.length.toFixed(0), headOnRoad: +segD(head[0], head[1], P32.lines[0].map((q) => [q[0], q[1]])).toFixed(2), endD: +Math.hypot(end[0] - ends[id].to.x, end[1] - ends[id].to.z).toFixed(2),
      clumps: cl.length, knot: knot.length, mouth, roadside, breaks, blind, samples: Math.ceil(s / 4), gnomons });
  }
  // stumps on a tread
  const onTread = F.stumps.filter((st) => { const h = fp.paths.leadAt(st.x, st.z); return h && h.d < 0.4 + 0.3; }).map((st) => `(${st.x.toFixed(1)},${st.z.toFixed(1)})`);
  // cost: the foxfire's objects
  const objs = []; fp.scene.traverse((o) => { if (/^v18-foxfire/.test(o.name)) objs.push(o); });
  const tris = objs.reduce((a, o) => a + (o.isPoints ? 0 : (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.count ?? 1)), 0);
  return { spurs: out, onTread, calls: objs.length, tris: Math.round(tris), clumps: F.clumps.length, stumps: F.stumps.length };
});
await browser.close();
let pass = 0, fail = 0;
const check = (ok, label, detail = '') => { if (ok) pass++; else fail++; console.log(ok ? 'PASS' : 'FAIL', label.padEnd(64), detail); };
check(!errors.length, 'the page loaded without errors', errors[0] || '');
if (res.missing) { check(false, 'ctx.foxfire is built'); }
else {
  for (const s of res.spurs) {
    if (s.missing) { check(false, `${s.id}: the spur is traced`); continue; }
    check(s.headOnRoad < 2.5, `${s.id}: leaves the wood way (its head on P32)`, `${s.headOnRoad} m from P32's line, ${s.len} m long`);
    check(s.endD < 3, `${s.id}: ends at its doorstep (the plan's SPURS)`, `${s.endD} m short`);
    check(s.knot >= 2 && s.mouth === 1, `${s.id}: its threshold marked (2+ clumps on its logs or posts) and its knot 5-8.5 m in`, `${s.knot} on the threshold, ${s.mouth} knot; ${s.clumps} on the spur`);
    check(!s.roadside.length, `${s.id}: no foxfire by the road but the threshold's (within 3.5 m of P32, 12 m of the head)`, s.roadside.join(' ') || 'none');
    check(!s.breaks.length, `${s.id}: each clump within 14 m of the last and in sight of it`, s.breaks.slice(0, 6).join(' ') || 'unbroken');
    check(!s.blind.length, `${s.id}: a clump in sight within 16 m from every 4 m of it`, `${s.samples} samples, ${s.blind.length} blind ${s.blind.slice(0, 6).join(' ')}`);
    check(!s.gnomons.length, `${s.id}: no gnomon along it (foxfire is its only mark)`, s.gnomons.join(' ') || 'none');
  }
  check(!res.onTread.length, 'no foxfire stump stands on a tread', res.onTread.join(' ') || 'none');
  check(res.calls <= 3 && res.tris < 20000, 'the foxfire: at most 3 draw calls, under 20k triangles', `${res.calls} objects, ${res.tris} triangles, ${res.clumps} clumps, ${res.stumps} stumps`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
