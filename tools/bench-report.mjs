#!/usr/bin/env node
// Run the bench headlessly and save ctx.perf.report() (the bench's result included) as JSON, then print its summary:
// JS a frame per leg (the round, the Span's deck, waking at the gate), the hitch log's worst, the rows (modules and the
// unowned costs), memory, and calls and triangles per module at the stations, then one line for each module over its budget at a station. The lines are the bench panel's own
// (src/perf-frames.js benchLines). Headless WebGL is software or ANGLE: frame intervals and GPU times are noise here,
// JS ms, counts and ratios are real.
//   node tools/bench-report.mjs <url> [out.json] [width=960] [height=540] [--against=before.json]
//   node tools/bench-report.mjs <saved.json> [--against=before.json]     (print a saved report, or diff two)
// --throttle=4: Chromium's CPU throttle from the moment the page is ready (the bench's warm-up), a stand-in for a phone
// A saved file may be a report (tools output), a bench result, or the panel's Copy (the brief).
// e.g. node tools/bench-report.mjs "http://localhost:8123/?bench=45&perf=1&q=low" shots/wip/bench-low.json --against=shots/wip/v13-P1-baseline-low-1.json
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { benchLines, overBudget, MODULE_BUDGET } from '../src/perf-frames.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const benchOf = (j) => (j.bench && typeof j.bench === 'object' ? j.bench : j);
const load = (p) => benchOf(JSON.parse(readFileSync(p, 'utf8')));

let res, errors = [], extra = null;
if (args[0] && /\.json$/.test(args[0]) && existsSync(args[0])) res = load(args[0]);
else {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
  const [url = 'http://localhost:8123/?bench=45&perf=1&q=low', out, w = '960', h = '540'] = args;
  // --enable-precise-memory-info: performance.memory unrounded (a visitor's Chrome rounds it)
  const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  if (flags.throttle) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +flags.throttle }); }
  await page.waitForFunction(() => window.__fp?.perf?.bench?.done, null, { timeout: 900000, polling: 1000 });
  const rep = await page.evaluate(() => ({ headless: true, url: location.href, ...window.__fp.perf.report(), kept: window.__fp.keptStats ? { putMs: window.__fp.keptStats.putMs || [], puts: window.__fp.keptStats.puts, preloadMs: window.__fp.keptStats.preloadMs ?? null, ready: window.__fp_startup?.report().ready ?? null } : null }));
  // v13 L4: what writing the kept records cost the main thread, each put's checksum and clone (they run after ready, one an idle slot)
  if (rep.kept?.putMs?.length) { const k = rep.kept; console.log(`kept writes (${k.putMs.length}, from ${Math.round(k.putMs[0].at - k.ready)} to ${Math.round(k.putMs.at(-1).at - k.ready)} ms after ready): ` + k.putMs.map((p) => `${p.slot.replace(/^kept:/, '')} ${(p.sumMs + p.putMs).toFixed(1)}`).join(' · ') + ` · largest ${Math.max(...k.putMs.map((p) => p.sumMs + p.putMs)).toFixed(1)} ms`); }
  if (flags.throttle) rep.bench.cpuThrottle = +flags.throttle;
  extra = { firstBlock: rep.firstBlock };
  await browser.close();
  if (out) { writeFileSync(out, JSON.stringify(rep, null, 1)); console.log('[saved]', out); }
  res = rep.bench;
}

if (res.cpuThrottle) console.log(`CPU throttled ${res.cpuThrottle}x (a stand-in for a phone)`);
for (const l of benchLines(res, { hitches: 10, rows: 16, modules: 5 })) console.log(l);
if (res.summary?.cpuCallbacks) console.log('callbacks, ms a frame (the round): ' + Object.entries(res.summary.cpuCallbacks).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · '));
if (extra?.firstBlock) console.log('first block:', JSON.stringify(extra.firstBlock));
// a name for an overrun (no gate): every module past its documented budget at any station, colour pass
for (const o of overBudget(res.draws)) console.log(`over budget: ${o.module} at ${o.station}: ${o.calls} calls, ${o.tris.toLocaleString('en')} triangles (budget ${MODULE_BUDGET.calls} calls, ${MODULE_BUDGET.tris.toLocaleString('en')} triangles)`);

// --against: every number that is in both, before → after
if (flags.against) {
  const a = load(flags.against), b = res;
  const rows = [];
  const cmp = (label, x, y, unit = '') => {
    if (x == null && y == null) return;
    const d = x != null && y != null ? y - x : null, pct = d != null && x ? Math.round((d / x) * 100) : null;
    rows.push(`  ${label.padEnd(44)} ${String(x ?? '–').padStart(9)} → ${String(y ?? '–').padStart(9)}${unit}${d != null ? `  (${d > 0 ? '+' : ''}${Math.round(d * 100) / 100}${pct != null ? `, ${pct > 0 ? '+' : ''}${pct}%` : ''})` : ''}`);
  };
  console.log(`\nagainst ${flags.against} (before → after)`);
  // the two runs must be the same run to compare
  const same = [['quality', (r) => r.quality], ['duration', (r) => r.duration], ['leg seconds', (r) => r.legSeconds], ['CPU throttle', (r) => r.cpuThrottle ?? 1], ['dpr', (r) => r.dpr], ['render size', (r) => r.renderSize?.buffer?.join('x')], ['frame cap', (r) => r.settings?.cap]];
  for (const [k, f] of same) if (f(a) !== f(b) && f(a) !== undefined) console.log(`  WARNING: ${k} differs: ${f(a)} → ${f(b)}; the numbers below are not one run against another`);
  const old = !a.legs; // a report from before v13: no legs, and its \`frame\` row held what v13 names controls, sky, hud, post.update, shadow.cadence and lights.slots
  if (old) console.log('  the older report is from before v13: only the round\'s avg and 1% low, the world modules\' rows and main.js\'s own work in total (old frame vs frame + the six rows split out of it) mean the same thing in both; render, shadow.pass, far and perf had no row then and are left out');
  cmp('the round: avg frame ms', a.summary?.avgFrameMs, b.summary?.avgFrameMs);
  cmp('the round: 1% low ms', a.summary?.low1FrameMs, b.summary?.low1FrameMs);
  for (const leg of new Set([...Object.keys(a.legs || {}), ...Object.keys(b.legs || {})])) {
    for (const k of ['medianMs', 'p95Ms', 'p99Ms', 'worstMs', 'over2xMedian', 'over3xMedian']) cmp(`${leg}: JS ${k}`, a.legs?.[leg]?.js?.[k], b.legs?.[leg]?.js?.[k]);
  }
  cmp('hitches', a.hitches?.count, b.hitches?.count);
  cmp('worst hitch ms', a.hitches?.worst?.[0]?.ms, b.hitches?.worst?.[0]?.ms);
  cmp('unattributed ms of the median frame', a.unattributed?.medianUnattributedMs, b.unattributed?.medianUnattributedMs);
  // rows: the round's rows (v2), else the old cpuMs (v1, the same route)
  const ra = a.legs?.route?.rows || a.summary?.cpuMs || {}, rb = b.legs?.route?.rows || b.summary?.cpuMs || {};
  const SPLIT = ['frame', 'controls', 'sky', 'hud', 'post.update', 'shadow.cadence', 'lights.slots'], NEW = ['render', 'shadow.pass', 'far', 'perf', 'bench.drive'];
  if (old) {
    const own = (r) => Math.round(SPLIT.reduce((t, k) => t + (r[k] || 0), 0) * 100) / 100;
    cmp('the round: main.js\'s own work (old frame / v13 frame + its six rows)', own(ra), own(rb));
  }
  for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
    if (old && (SPLIT.includes(k) || NEW.includes(k))) continue;
    if (Math.abs((rb[k] || 0) - (ra[k] || 0)) >= 0.02) cmp(`the round: ${k} ms a frame`, ra[k] ?? 0, rb[k] ?? 0);
  }
  cmp('geometry MB at the end', a.memory?.end?.geometry?.totalMB, b.memory?.end?.geometry?.totalMB);
  cmp('JS heap MB at the end', a.memory?.end?.jsHeap?.usedMB, b.memory?.end?.jsHeap?.usedMB);
  cmp('textures MB at the end', a.memory?.end?.gpu?.textureMB, b.memory?.end?.gpu?.textureMB);
  for (const s of b.draws || []) {
    const o = (a.draws || []).find((x) => x.name === s.name);
    if (!o) continue;
    cmp(`${s.name}: colour calls`, o.colour.calls, s.colour.calls);
    cmp(`${s.name}: colour triangles`, o.colour.tris, s.colour.tris);
    if (o.shadow && s.shadow) cmp(`${s.name}: shadow triangles`, o.shadow.tris, s.shadow.tris);
  }
  console.log(rows.join('\n'));
}
if (errors.length) console.log(errors.join('\n'));
