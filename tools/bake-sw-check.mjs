#!/usr/bin/env node
// The terrain's bake worker under the service worker (v13 L3 with L1's sw.js): this tree served as Netlify serves it
// (tools/sw-site.mjs in-process: an X-Fp-Commit stamp on every response, commit.json), with ?sw=1 so the worker
// registers on localhost and ?kept=commit so the store keys by the stamp. Four loads in one context: a first visit
// (uncontrolled: the bake in its worker, kept, the worker filled), a controlled repeat (the bake from the store, no
// src/ file from the network), a controlled repeat with ?kept=0 (the bake from the worker, not the page's fallback,
// with the worker's script and imports served by the service worker), and one more controlled repeat.
//   node tools/bake-sw-check.mjs [port=8198]      FP_BROWSER=firefox|webkit for those engines
// Not in the suite (four loads, ~40 s); run it when the bake's worker, the store's keying or sw.js changes.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveSite } from './sw-site.mjs';
let pw;
try { pw = await import('playwright'); } catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const port = +(process.argv[2] || 8198), B = `http://localhost:${port}`;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = 'bakesw1';
const site = await serveSite({ port, commit: () => C, files: (p) => { if (p === '/commit.json') return JSON.stringify({ commit: C }); const f = join(ROOT, normalize(p)); return f.startsWith(ROOT) && existsSync(f) && statSync(f).isFile() ? readFileSync(f) : null; } });
const engine = process.env.FP_BROWSER || 'chromium';
const browser = await pw[engine].launch(engine === 'chromium' ? { args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const ready = () => page.waitForFunction(() => window.__fp_startup?.report().ready != null, null, { timeout: 300000 });
const st = () => page.evaluate(() => ({ controlled: !!navigator.serviceWorker?.controller, filled: window.__fp_sw?.filled, bake: window.__fp_startup.report().extra.bake, failed: window.__fp_startup.report().extra.failed, hits: window.__fp.keptStats.hits }));
const runs = [];
for (const q of ['?q=low&sw=1&kept=commit', '?q=low&sw=1&kept=commit', '?q=low&sw=1&kept=0', '?q=low&sw=1&kept=commit']) {
  site.counts.clear();
  await page.goto(B + '/' + q); await ready();
  if (!runs.length) await page.waitForFunction(() => window.__fp_sw?.filled, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const s = await st();
  const srcs = [...site.counts.keys()].filter((p) => p.startsWith('/src/'));
  s.src = srcs.length; s.srcs = srcs.slice(0, 6);
  runs.push(s);
  console.log(q, JSON.stringify({ controlled: s.controlled, source: s.bake.source, fellBack: s.bake.fellBack, kept: s.bake.kept, hits: s.hits, srcFromNetwork: s.src, some: s.src < 20 ? s.srcs : undefined, failed: s.failed }));
}
await browser.close(); await site.close();
const [a, b, c, d] = runs;
const checks = [
  [`first visit: the bake in its worker, kept (${a.bake.source}, ${a.bake.kept}); the service worker filled (${a.filled?.kept ?? 'no'})`, a.bake.source === 'worker' && a.bake.kept === true && !!a.filled?.kept],
  [`controlled repeat: the bake from the store, no src/ file from the network (${b.bake.source}, ${b.src})`, b.controlled && b.bake.source === 'kept' && b.src === 0],
  [`controlled repeat with ?kept=0 and a query: the bake from the worker, not the page (${c.bake.source}, ${c.bake.fellBack}); its files from the service worker (${c.src} from the network)`, c.controlled && c.bake.source === 'worker' && !c.bake.fellBack && c.src === 0],
  [`controlled repeat again: from the store (${d.bake.source})`, d.controlled && d.bake.source === 'kept'],
  [`no module failed, no page error (${errs.length})`, runs.every((r) => Array.isArray(r.failed) && !r.failed.length) && !errs.length],
];
for (const [n, ok] of checks) console.log(ok ? 'PASS' : 'FAIL', n);
process.exit(checks.every((x) => x[1]) ? 0 : 1);
