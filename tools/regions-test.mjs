#!/usr/bin/env node
// Regions check (v4): for every region in ctx.regions.keys, its module loaded without error; regionAt at its centre
// gives it a weight of at least 0.9; airAt there returns its Tincture (or nothing, for a region the brief leaves
// neutral); and, unless its module is still a stub, its stats() report at most 12 draw calls and 150k triangles at
// high and at least one of its creature. Generic over the regions, so every region module passes through it.
// The Demesne's yews (v6.3): every yew mesh carries at least 1000 triangles a yew at high (the clipped mass
// roughened, and the grown-out sprigs), an alpha-tested card material, and a mass the near-black green the brief
// asks for (mean vertex colour, shown in sRGB, luma under 0.3; v4 drew about 0.38): v4's smooth pale lathes fail all three.
// Joins: a creature built of parts declares them (geometry.userData.parts, vertex ranges); every part must touch the
// rest (bounding boxes overlapping and vertices within 2 cm), so a body cannot fall apart into floating pieces again.
// The Demesne's peafowl are checked so, and each bird's train must start inside its rump in every instance.
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
const { out: res, pea, yews } = await page.evaluate(() => {
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
  // joins: the parts of one geometry form one connected piece
  const joins = (g) => {
    const parts = g?.userData?.parts, P = g?.attributes?.position;
    if (!parts?.length || !P) return { ok: false, why: 'no userData.parts' };
    const box = parts.map((q) => { const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (let i = q.start; i < q.start + q.count; i++) { const v = [P.getX(i), P.getY(i), P.getZ(i)]; for (let a = 0; a < 3; a++) { b[a] = Math.min(b[a], v[a]); b[a + 3] = Math.max(b[a + 3], v[a]); } } return b; });
    const near = (a, b) => {
      for (let k = 0; k < 3; k++) if (box[a][k] > box[b][k + 3] + 0.002 || box[b][k] > box[a][k + 3] + 0.002) return false;
      const A = parts[a], B = parts[b];
      for (let i = A.start; i < A.start + A.count; i++) for (let j = B.start; j < B.start + B.count; j++) {
        if (Math.hypot(P.getX(i) - P.getX(j), P.getY(i) - P.getY(j), P.getZ(i) - P.getZ(j)) < 0.02) return true;
      }
      return false;
    };
    const seen = new Set([0]), todo = [0];
    while (todo.length) { const a = todo.pop(); for (let b = 0; b < parts.length; b++) if (!seen.has(b) && near(a, b)) { seen.add(b); todo.push(b); } }
    const loose = parts.filter((_, i) => !seen.has(i)).map((q) => q.name);
    return { ok: !loose.length, why: loose.length ? `loose: ${loose.join(', ')}` : `${parts.length} parts: ${parts.map((q) => q.name).join(', ')}`, tris: g.index.count / 3 };
  };
  const body = fp.scene.getObjectByName('demesne-peafowl'), train = fp.scene.getObjectByName('demesne-peafowl-trains');
  let pea = { found: !!(body && train) };
  if (pea.found) {
    pea.body = joins(body.geometry); pea.train = joins(train.geometry);
    // each bird's train coverts (in its body's frame) come within 2 cm of the body's own surface
    const T = fp.THREE, mb = new T.Matrix4(), mt = new T.Matrix4(), v = new T.Vector3();
    const bg = body.geometry, bp = bg.attributes.position, bpart = bg.userData.parts?.find((q) => q.name === 'body');
    const cov = train.geometry.userData.parts?.find((q) => q.name === 'coverts'), tp = train.geometry.attributes.position;
    let worst = 0;
    if (bpart && cov) for (let i = 0; i < body.count; i++) {
      body.getMatrixAt(i, mb); train.getMatrixAt(i, mt); mt.premultiply(mb.invert());
      let best = 1e9;
      for (let k = cov.start; k < cov.start + cov.count; k++) {
        v.fromBufferAttribute(tp, k).applyMatrix4(mt);
        for (let j = bpart.start; j < bpart.start + bpart.count; j++) best = Math.min(best, Math.hypot(v.x - bp.getX(j), v.y - bp.getY(j), v.z - bp.getZ(j)));
      }
      worst = Math.max(worst, best);
    } else worst = Infinity;
    pea.rump = +worst.toFixed(4); pea.n = body.count; pea.calls = 2;
  }
  return { out, pea, yews };
});
await browser.close();

let fail = 0, pass = 0;
const check = (ok, label, detail) => { if (ok) pass++; else fail++; console.log(ok ? 'PASS' : 'FAIL', label.padEnd(44), detail); };
for (const r of res) {
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
check(yews.length > 0, 'demesne yews: a mesh', yews.map((y) => y.name).join(', '));
for (const y of yews) {
  check(y.perYew >= 1000, `${y.name}: >= 1000 tris a yew at high`, `${Math.round(y.perYew)} (${y.n} yews)`);
  check(y.cards, `${y.name}: alpha-tested sprig cards`, `${y.cards}`);
  check(y.luma < 0.3, `${y.name}: near-black green (sRGB luma < 0.3)`, `${y.luma}`);
}
check(pea.found, 'demesne: peafowl meshes', pea.found ? 'body and train' : 'demesne-peafowl / -trains not in the scene');
if (pea.found) {
  check(pea.body.ok, 'demesne: peafowl body is one piece', `${pea.body.why}; ${pea.body.tris} tris`);
  check(pea.train.ok, 'demesne: peafowl train is one piece', `${pea.train.why}; ${pea.train.tris} tris`);
  check(pea.rump < 0.02, 'demesne: each train starts at its rump', `coverts to body ${pea.rump} m over ${pea.n} birds`);
}
const other = errors.filter((e) => !res.some((r) => e.includes(`region-${r.key}`)));
if (other.length) console.log(`(other page errors: ${other.length}) ${other[0]}`);
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
