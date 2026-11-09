#!/usr/bin/env node
// v7 living-glyphs check (src/v7/glyphs.js): CP the Scriveners, the glyph motif, CT the Tesserine Moles.
// The shoal: every formed fish lies on its glyph's strokes (scaled, within 0.15 m); the form is the door's last (the last slot's
// before any shift, glyphOrder[0] after); after two forced gutters the next formation follows the lintel; while it wanders
// the shoal keeps to water 0.2-0.8 m deep. The moles: 18 heaps at load inside r 12; a rise completes, adds a heap and clicks;
// no heap is flattened in view. The motif: one glyph tessera (3 cm, face up, on the heap nearest the causeway); each standing
// brass cap carries a form and no two neighbours match; the erratic's decal lies within 2 cm of its rock. Cost: stats() within
// 6 draws and 25k triangles, no lights, and the module's CPU at 10 m.
// Usage: node tools/glyphs-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
await page.goto(`${base}/?q=high&perf=1&pos=-101,50`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.hold = 1; });
const sleep = (ms) => page.waitForTimeout(ms);
const at = (x, z, yaw = 0, pitch = 0) => page.evaluate(([x, z, yaw, pitch]) => { const p = window.__fp.player; p.pos.set(x, window.__fp.terrain.heightAt(x, z) + p.eye, z); p.yaw = yaw; p.pitch = pitch; if (p.vel) p.vel.set(0, 0, 0); }, [x, z, yaw, pitch]);
const r = {};

// ---- the Scriveners
await at(-101, 50, Math.PI, -0.3);
r.wander = await page.evaluate(async () => {
  const s = window.__fp.glyphs.scriveners; s.wander();
  let lo = Infinity, hi = 0;
  for (let k = 0; k < 12; k++) { await new Promise((res) => setTimeout(res, 400)); const [a, b] = s.depths(); lo = Math.min(lo, a); hi = Math.max(hi, b); }
  return { lo, hi, phase: s.state().phase };
});
// the module's CPU, standing 10 m from the shoal while it wanders
await at(-100, 46, Math.PI, -0.2);
await sleep(2500);
r.cpuShoal = await page.evaluate(() => window.__fp.perf.report().cpu.modules['living-glyphs'] ?? null);
r.form1 = await page.evaluate(async () => {
  const fp = window.__fp, s = fp.glyphs.scriveners, h = fp.hypogeum;
  const want = h.shifts > 0 ? h.glyphOrder[0] : h.glyphOrder[h.glyphOrder.length - 1];
  const f = s.form();
  await new Promise((res) => setTimeout(res, 3600));
  return { want, f, phase: s.state().phase, err: s.formedError(), shifts: h.shifts };
});
r.gutter = await page.evaluate(async () => {
  const fp = window.__fp, s = fp.glyphs.scriveners, h = fp.hypogeum, w = (ms) => new Promise((res) => setTimeout(res, ms));
  const before = h.shifts;
  for (let k = 0; k < 2; k++) { fp.sky.flicker.hold = 0.2; await w(400); fp.sky.flicker.hold = 1; await w(400); }
  s.release(); await w(3000);              // the break
  const f = s.form();
  await w(3600);
  return { shifts: h.shifts - before, f, want: h.glyphOrder[0], err: s.formedError(), last: s.doorsLast() };
});
await page.evaluate(() => { window.__fp.sky.flicker.hold = 1; window.__fp.glyphs.scriveners.release(); });
// and back in the band once the break has scattered them (2.5 s) and the shoal has gathered (8 s)
r.wander2 = await page.evaluate(async () => {
  const s = window.__fp.glyphs.scriveners;
  await new Promise((res) => setTimeout(res, 11000));
  let lo = Infinity, hi = 0;
  for (let k = 0; k < 8; k++) { await new Promise((res) => setTimeout(res, 400)); const [a, b] = s.depths(); lo = Math.min(lo, a); hi = Math.max(hi, b); }
  return { lo, hi, phase: s.state().phase };
});

// ---- the motif
r.motif = await page.evaluate(() => {
  const fp = window.__fp, g = fp.glyphs, caps = fp.scene.getObjectByName('surveyors-caps');
  const forms = caps?.geometry.attributes.aForm ? Array.from(caps.geometry.attributes.aForm.array).slice(0, caps.count) : [];
  return { caps: forms, capZ: fp.dressing.pegs.caps.map((c) => c.z), tess: g.moles.glyphTessera(), erratic: g.erratic ? g.erratic.offRock() : null, eForm: g.erratic?.form };
});

// ---- the moles
await at(80, -8, 2.583, -0.1);
r.moles0 = await page.evaluate(() => {
  const m = window.__fp.glyphs.moles, used = m.slots.filter((s) => s.used);
  return { heaps: used.length, maxR: Math.max(...used.map((s) => Math.hypot(s.x - 75, s.z))), nearest: Math.min(...used.map((s) => window.__fp.terrain.causewayDistance(s.x, s.z))) };
});
await sleep(1500);
r.cpuMoles = await page.evaluate(() => window.__fp.perf.report().cpu.modules['living-glyphs'] ?? null);
r.rise = await page.evaluate(async () => {
  const fp = window.__fp, m = fp.glyphs.moles, cues = [];
  const audio = fp.audio, orig = audio?.cue;
  if (audio) audio.cue = (name, pos) => { cues.push(name); return orig?.call(audio, name, pos); };
  const before = m.state().heaps, k = m.rise();
  await new Promise((res) => setTimeout(res, 8800));
  if (audio) audio.cue = orig;
  return { k, before, after: m.state().heaps, rising: m.state().rising, clicks: cues.filter((c) => c === 'moles-click').length };
});
// flattening: never with the oldest heap in view; at once with it behind the walker
r.flat = await page.evaluate(async () => {
  const fp = window.__fp, m = fp.glyphs.moles, p = fp.player, w = (ms) => new Promise((res) => setTimeout(res, ms));
  let o = null; for (const s of m.slots) if (s.used && (!o || s.born < o.born)) o = s;
  // stand 4 m south of it, facing it
  p.pos.set(o.x, fp.terrain.heightAt(o.x, o.z + 4) + p.eye, o.z + 4); p.yaw = 0; p.pitch = -0.3;
  await w(400);
  const inView = m.flatten();
  p.yaw = Math.PI; await w(400);
  const away = m.flatten();
  const log = m.state().flattened;
  return { inView, away, log, heaps: m.state().heaps };
});
r.stats = await page.evaluate(() => window.__fp.glyphs.stats());
await browser.close();

let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
check(r.wander.lo >= 0.2 && r.wander.hi <= 0.8 && r.wander.phase === 'wander' && r.wander2.lo >= 0.2 && r.wander2.hi <= 0.8 && r.wander2.phase === 'wander', 'the wandering shoal keeps to water 0.2-0.8 m deep (at load, and 8 s after a break)', `depth ${r.wander.lo.toFixed(2)}-${r.wander.hi.toFixed(2)} m; after a break ${r.wander2.lo.toFixed(2)}-${r.wander2.hi.toFixed(2)} m`);
check(r.form1.phase === 'hold' && r.form1.err !== null && r.form1.err <= 0.15, 'every formed fish lies within 0.15 m of its glyph\'s strokes (x16)', `worst ${r.form1.err?.toFixed(3)} m`);
check(r.form1.f === r.form1.want, 'the shoal forms the glyph the door showed last', `form ${r.form1.f}, door's last ${r.form1.want} (${r.form1.shifts} shifts)`);
check(r.gutter.shifts === 2 && r.gutter.f === r.gutter.want && r.gutter.err <= 0.15, 'after the gutters the next formation is the lintel\'s new first (the one pushed off the end)', `${r.gutter.shifts} shifts, form ${r.gutter.f}, glyphOrder[0] ${r.gutter.want}, worst ${r.gutter.err?.toFixed(3)} m`);
check(r.moles0.heaps === 18 && r.moles0.maxR <= 12, '18 heaps at load, all inside r 12 of (75, 0)', `${r.moles0.heaps} heaps, furthest ${r.moles0.maxR.toFixed(1)} m, nearest the causeway ${r.moles0.nearest.toFixed(1)} m`);
check(r.rise.k >= 0 && r.rise.after === r.rise.before + 1 && r.rise.rising === -1 && r.rise.clicks >= 3 && r.rise.clicks <= 5, 'a rise completes in 8 s, adds a heap, and clicks 3-5 times', `slot ${r.rise.k}, ${r.rise.before} -> ${r.rise.after} heaps, ${r.rise.clicks} moles-click`);
check(r.flat.inView === false && r.flat.away === true && r.flat.log.every((f) => !f.inView), 'no heap is flattened in view (the oldest goes only behind the walker)', `in view: ${r.flat.inView}, behind: ${r.flat.away}, ${r.flat.log.length} flattened`);
const t = r.motif.tess;
check(t.form >= 0 && t.form <= 8 && Math.abs(t.size - 0.03) < 1e-4 && t.up > 0.9 && t.causeway === r.moles0.nearest, 'one glyph tessera: 3 cm, face up, on the heap nearest the causeway', `form ${t.form}, ${(t.size * 100).toFixed(1)} cm, up ${t.up.toFixed(2)}, heap ${t.heap} ${t.causeway.toFixed(1)} m from the causeway`);
const c = r.motif.caps;
check(c.length === r.motif.capZ.length && c.length >= 4 && c.every((f) => f >= 0 && f <= 8 && Number.isInteger(f)) && c.every((f, i) => i === 0 || f !== c[i - 1]), 'each standing brass cap carries a form, no two neighbours alike', `caps at z ${r.motif.capZ}: forms ${c}`);
const e = r.motif.erratic;
check(e && e.miss === 0 && e.worst < 0.02 && e.n > 20, 'the erratic\'s glyph lies within 2 cm of its rock', e ? `${e.n} vertices, worst ${(e.worst * 1000).toFixed(1)} mm, form ${r.motif.eForm}` : 'no decal');
check(r.stats.calls <= 6 && r.stats.tris <= 25000 && r.stats.lights === 0, 'stats() within budget (6 draws, 25k triangles, no lights)', JSON.stringify(r.stats));
check(r.cpuShoal !== null && r.cpuShoal < 0.08 && r.cpuMoles !== null && r.cpuMoles < 0.08, 'CPU under 0.08 ms a frame at 10 m (the shoal wandering; by the moles)', `shoal ${r.cpuShoal} ms, moles ${r.cpuMoles} ms`);
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
