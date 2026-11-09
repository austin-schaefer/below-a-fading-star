#!/usr/bin/env node
// Regions check (v4): for every region in ctx.regions.keys, its module loaded without error; regionAt at its centre
// gives it a weight of at least 0.9; airAt there returns its Tincture (or nothing, for a region the brief leaves
// neutral); and, unless its module is still a stub, its stats() report at most 12 draw calls and 150k triangles at
// high and at least one of its creature. Generic over the regions, so every region module passes through it.
// The Demesne's yews (v6.3): every yew mesh carries at least 1000 triangles a yew at high (the clipped mass
// roughened, and the grown-out sprigs), an alpha-tested card material, and a mass the near-black green the brief
// asks for (mean vertex colour, shown in sRGB, luma under 0.3; v4 drew about 0.38): v4's smooth pale lathes fail all three.
// Usage: node tools/regions-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
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
await page.goto(`${base}/?q=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const res = await page.evaluate(() => {
  const fp = window.__fp, R = fp.regions, out = [];
  // a point well inside each shape
  const centre = (def) => {
    const s = def.shape;
    if (s.circle) return [s.circle.x, s.circle.z];
    if (s.ellipse) return [s.ellipse.x, s.ellipse.z];
    if (s.poly) { let x = 0, z = 0; for (const p of s.poly) { x += p[0]; z += p[1]; } return [x / s.poly.length, z / s.poly.length]; }
    if (s.strip) { let best = s.strip[0]; for (const p of s.strip) if (p[2] > best[2]) best = p; return [best[0], best[1]]; }
    if (s.annulus) {
      const a = s.annulus, span = (a.to - a.from + 360) % 360, b = ((a.from + span / 2) * Math.PI) / 180, r = (a.r0 + a.r1) / 2;
      return [a.x + Math.sin(b) * r, a.z - Math.cos(b) * r];
    }
    return [0, 0];
  };
  for (const key of R.keys) {
    const def = R.defs[key], H = R.hooks[key], [x, z] = centre(def);
    const w = { ...R.regionAt(x, z, {}) }[key];
    const air = R.airAt(x, z);
    const want = H.air ? new fp.THREE.Color(H.air.tint) : null;
    const airErr = want ? Math.max(Math.abs(air.color.r - want.r), Math.abs(air.color.g - want.g), Math.abs(air.color.b - want.b)) : air.strength;
    const stub = !R.stats[key] && ['height', 'ground', 'cover', 'stone', 'air', 'sound'].every((k) => !H[k]);
    let stats = null, statsErr = null;
    try { stats = R.stats[key] ? R.stats[key]() : null; } catch (e) { statsErr = String(e); }
    out.push({ key, file: R.files[key], x: +x.toFixed(1), z: +z.toFixed(1), w: +w.toFixed(3), tint: want ? '#' + want.getHexString() : null, got: '#' + air.color.getHexString(), strength: +air.strength.toFixed(3), airErr: +airErr.toFixed(4), stub, stats, statsErr });
  }
  const yews = fp.scene.children.filter((o) => /^demesne-yew/.test(o.name)).map((o) => {
    const g = o.geometry, c = g.attributes.color, tris = (g.index ? g.index.count : g.attributes.position.count) / 3;
    let l = 0; for (let i = 0; i < c.count; i++) l += 0.2126 * c.getX(i) + 0.7152 * c.getY(i) + 0.0722 * c.getZ(i);
    const toS = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
    return { name: o.name, n: o.userData.yews || (o.isInstancedMesh ? o.count : 1), perYew: o.isInstancedMesh ? tris : tris / (o.userData.yews || 1), tris, cards: !!(o.material.map && o.material.alphaTest > 0), luma: +toS(l / c.count).toFixed(3) };
  });
  return { out, yews };
});
await browser.close();

let fail = 0, pass = 0;
const check = (ok, label, detail) => { if (ok) pass++; else fail++; console.log(ok ? 'PASS' : 'FAIL', label.padEnd(44), detail); };
for (const r of res.out) {
  const tag = `${r.key} (${r.file}.js)`;
  const moduleErrors = errors.filter((e) => e.includes(`region-${r.key}`) || e.includes(`regions/${r.file}.js`));
  check(!moduleErrors.length, `${tag}: module loaded`, moduleErrors[0] || '');
  check(r.w >= 0.9, `${tag}: regionAt(${r.x}, ${r.z})`, `weight ${r.w}`);
  if (r.tint) check(r.airErr < 0.01, `${tag}: airAt is its Tincture`, `${r.got} (want ${r.tint}), strength ${r.strength}`);
  else check(r.strength === 0, `${tag}: airAt neutral (no Tincture)`, `strength ${r.strength}`);
  if (r.stub) { console.log('SKIP', `${tag}: stats`.padEnd(44), 'module is still a stub'); continue; }
  if (!r.stats) { check(false, `${tag}: stats()`, r.statsErr || 'ctx.regions.stats[key] not registered'); continue; }
  const s = r.stats;
  check(s.calls <= 12, `${tag}: draw calls <= 12`, `${s.calls}`);
  check(s.tris <= 150000, `${tag}: triangles <= 150k at high`, `${s.tris}`);
  check(s.creature > 0, `${tag}: its creature`, `${s.creature}`);
}
check(res.yews.length > 0, 'demesne yews: a mesh', res.yews.map((y) => y.name).join(', '));
for (const y of res.yews) {
  check(y.perYew >= 1000, `${y.name}: >= 1000 tris a yew at high`, `${Math.round(y.perYew)} (${y.n} yews)`);
  check(y.cards, `${y.name}: alpha-tested sprig cards`, `${y.cards}`);
  check(y.luma < 0.3, `${y.name}: near-black green (sRGB luma < 0.3)`, `${y.luma}`);
}
const other = errors.filter((e) => !res.out.some((r) => e.includes(`region-${r.key}`)));
if (other.length) console.log(`(other page errors: ${other.length}) ${other[0]}`);
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
