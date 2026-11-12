#!/usr/bin/env node
// v8-11, the rocks (src/rocks.js, src/v8/clearings.js; issues #11 and #12): at each tier, no stone's or boulder's footprint
// (ctx.rocks: centre and radius) reaches the Leerie's walked line or his standards (2 m to spare), the Thurifer's P3
// (2 m), any other road's tread (0.5 m), the causeway (2.5 m from its line), or a built place (the two graveyards, the
// Pomegranate House and its gate, the Collation, the shrine, the court, the keep, the Demesne lawn); nothing, pebbles and
// trees included, within a metre of the Long Figure's chalk (v9, #16; its shape from figure.js); the common keeps
// at most COMMON_MAX boulders and the map at most a BIG_SHARE of what ?rockcut=0 places; the lichen's full patch is
// under LICHEN_MAX times the stone's luminance (rocks.js and the regions' shared stone), where v8-10's was about 11x.
// The geometry is taken from the places' own modules, not from clearings.js, so the table is checked, not echoed.
// Usage: node tools/rocks-test.mjs [base=http://localhost:8123] [tiers=low,high]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const tiers = (process.argv[3] || 'low,high').split(',');
const COMMON_MAX = 10, BIG_SHARE = 0.45, LICHEN_MAX = 1.3;
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };

async function load(q) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
  await page.goto(`${base}/?q=${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
  return { page, errors };
}

const survey = async (page) => page.evaluate(async () => {
  const fp = window.__fp, R = fp.rocks;
  if (!R) return null;
  const { SITES, LANDMARKS: L } = await import('/src/world.js');
  const { LEERIE } = await import('/src/v5/lights.js');
  const { leads } = await import('/src/v4/paths/routes.js');
  const { TAVERNA } = await import('/src/structures/taverna.js');
  const { BARE } = await import('/src/v8/house/clear.js');
  const { COLLATION } = await import('/src/v5/dressing/collation.js');
  const { commonAt } = await import('/src/v8/places.js');
  const { LICHEN_CAP } = await import('/src/v4/regions/common.js');
  const { onFigure } = await import('/src/v4/dressing/figure.js');
  const segD = (x, z, ax, az, bx, bz) => { const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)); return Math.hypot(x - ax - ex * t, z - az - ez * t); };
  const lineD = (x, z, S) => { let d = Infinity; for (let i = 0; i < S.length - 1; i++) d = Math.min(d, segD(x, z, S[i].x, S[i].z, S[i + 1].x, S[i + 1].z)); return d; };
  // the Leerie's line and his standards' line (lights.js and leerie.js: the standards LEERIE.side east of K1, he 0.6 m nearer)
  const [x0, z0] = SITES.leerie.from, [x1, z1] = SITES.leerie.to, len = Math.hypot(x1 - x0, z1 - z0), nx = (z1 - z0) / len, nz = -(x1 - x0) / len;
  const off = (o) => [{ x: x0 + nx * o, z: z0 + nz * o }, { x: x1 + nx * o, z: z1 + nz * o }];
  const walk = off(LEERIE.side - 0.6), stands = off(LEERIE.side);
  const all = leads().list.filter((l) => l.kind !== 'rivulet');
  const P3 = all.find((l) => l.id === 'P3');
  const SX = SITES.sexton.block;
  const places = [
    ['the Leaning Yard', (x, z, r) => Math.hypot(x - L.graveyard.x, z - L.graveyard.z) < L.graveyard.r + r],
    ["the Sexton's graves", (x, z, r) => x > SX[0] - r && x < SX[1] + r && z > SX[2] - r && z < SX[3] + r],
    ['the Pomegranate House', (x, z, r) => Math.abs(x - TAVERNA.x) < TAVERNA.half + r && Math.abs(z - TAVERNA.z) < TAVERNA.half + r],
    ["the House's gate", (x, z, r) => Math.hypot((x - BARE.x) / (BARE.rx + r), (z - BARE.z) / (BARE.rz + r)) < 1],
    ['the Collation', (x, z, r) => Math.hypot(x - COLLATION.x, z - COLLATION.z) < COLLATION.length + r],
    ['the shrine', (x, z, r) => Math.hypot(x - L.shrine.x, z - L.shrine.z) < L.shrine.r + r],
    ['the court', (x, z, r) => Math.hypot(x - L.court.x, z - L.court.z) < L.court.r + r],
    ['the keep', (x, z, r) => Math.hypot(x - L.castle.x, z - L.castle.z) < L.castle.r + r],
    ['the Demesne lawn', (x, z) => fp.regions.regionAt(x, z).demesne > 0.3],
  ];
  const bad = { leerie: [], standards: [], p3: [], roads: [], causeway: [], places: {} };
  const items = [...R.boulders.map((b) => ({ ...b, cls: 'boulder' })), ...R.stones.map((b) => ({ ...b, cls: 'stone' }))];
  for (const it of items) {
    const { x, z, r } = it, tag = `${it.cls} (${x}, ${z}) r ${r}`;
    if (lineD(x, z, walk) - r < 2.0) bad.leerie.push(tag);
    if (lineD(x, z, stands) - r < 2.0) bad.standards.push(tag);
    if (P3 && Math.min(...P3.lines.map((S) => lineD(x, z, S))) - r - P3.w < 2.0) bad.p3.push(tag);
    for (const Ld of all) if (Math.min(...Ld.lines.map((S) => lineD(x, z, S))) - r - Ld.w < 0.5) { bad.roads.push(`${tag} on ${Ld.id}`); break; }
    if (fp.terrain.causewayDistance(x, z) - r < 2.5) bad.causeway.push(tag);
    for (const [name, f] of places) if (f(x, z, r)) (bad.places[name] ||= []).push(tag);
  }
  // the Long Figure (v9, #16): every rock class, and every drawn tree's trunk, a metre clear of his chalk
  const onHim = [...items, ...(R.pebbles || []).map((b) => ({ ...b, cls: 'pebble' }))].filter((it) => onFigure(it.x, it.z, it.r + 1, fp.terrain)).map((it) => `${it.cls} (${it.x}, ${it.z}) r ${it.r}`);
  const veg = window.__vegParts?.trees?.trees;
  const treesOnHim = veg ? veg.filter((t) => !t.hidden && onFigure(t.x, t.z, 1, fp.terrain)).map((t) => `${t.kind} (${t.x.toFixed(1)}, ${t.z.toFixed(1)})`) : null;
  bad.figure = { rocks: onHim, pebbles: !!R.pebbles, trees: treesOnHim };
  const common = R.boulders.filter((b) => fp.regions.regionAt(b.x, b.z).moor > 0.5 && commonAt(b.x, b.z, fp.terrain.causewayDistance(b.x, b.z)) > 0.5).length;
  const C = new fp.THREE.Color(R.rock), Y = [0.2126, 0.7152, 0.0722], lum = (c) => c[0] * Y[0] + c[1] * Y[1] + c[2] * Y[2];
  const stone = [C.r, C.g, C.b], lic = R.lichen;
  return {
    stats: R.stats(), cut: R.cut, bad, common,
    bloom: lic ? +lum(lic.bloom).toFixed(3) : null,
    rust: lic ? +(lum(stone.map((v, i) => v * lic.rust[i])) / lum(stone)).toFixed(3) : null,
    old: +(lum([0.55, 0.6, 0.42]) / lum(stone)).toFixed(2), cap: LICHEN_CAP,
  };
});

for (const q of tiers) {
  const { page, errors } = await load(q);
  const s = await survey(page);
  ok(!!s && s.cut, `${q}: ctx.rocks is built with the v8-11 cut`);
  if (!s) { await page.close(); continue; }
  const st = s.stats;
  console.log(`  ${q}: ${st.pebbles} pebbles, ${st.stones} stones, ${st.boulders} boulders; ${st.drawCalls} draws; thinned ${JSON.stringify(st.thinned)}`);
  const list = (a) => a.length ? `: ${a.slice(0, 4).join('; ')}${a.length > 4 ? ` (+${a.length - 4})` : ''}` : '';
  ok(!s.bad.leerie.length, `${q}: nothing bigger than a pebble within 2 m of the Leerie's walked line${list(s.bad.leerie)}`);
  ok(!s.bad.standards.length, `${q}: nor within 2 m of his twelve standards${list(s.bad.standards)}`);
  ok(!s.bad.p3.length, `${q}: nor within 2 m of the Thurifer's P3${list(s.bad.p3)}`);
  ok(!s.bad.roads.length, `${q}: no footprint within 0.5 m of any road's tread${list(s.bad.roads)}`);
  ok(!s.bad.causeway.length, `${q}: nor within 2.5 m of the causeway's line${list(s.bad.causeway)}`);
  const pl = Object.entries(s.bad.places);
  ok(!pl.length, `${q}: none in a built place${pl.length ? ': ' + pl.map(([k, v]) => `${k} ${v.length} (${v[0]})`).join('; ') : ''}`);
  ok(s.bad.figure.pebbles && !s.bad.figure.rocks.length, `${q}: no rock, pebbles included, within 1 m of the Long Figure's chalk${list(s.bad.figure.rocks)}`);
  ok(s.bad.figure.trees && !s.bad.figure.trees.length, `${q}: nor any tree${list(s.bad.figure.trees || ['vegetation not loaded'])}`);
  ok(s.common <= COMMON_MAX, `${q}: ${s.common} boulders on the grazed common (at most ${COMMON_MAX})`);
  ok(s.bloom !== null && s.bloom < LICHEN_MAX, `${q}: the lichen's full patch is ${s.bloom}x the stone's luminance (under ${LICHEN_MAX}; v8-10's was ${s.old}x)`);
  ok(s.rust !== null && s.rust < LICHEN_MAX, `${q}: the rust crust's is ${s.rust}x`);
  ok(s.cap > 0 && s.cap <= 1.5, `${q}: the regions' shared stone caps its lichen at ${s.cap}x the stone`);
  ok(!errors.length, `${q}: no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await page.close();
  // the same tier with ?rockcut=0: the boulders before the cut
  const old = await load(`${q}&rockcut=0`);
  const o = await old.page.evaluate(() => window.__fp.rocks?.stats());
  if (o) {
    console.log(`  ${q} ?rockcut=0: ${o.pebbles} pebbles, ${o.stones} stones, ${o.boulders} boulders`);
    ok(st.boulders <= o.boulders * BIG_SHARE, `${q}: ${st.boulders} boulders against ${o.boulders} before the cut (at most ${Math.round(BIG_SHARE * 100)}%)`);
    ok(st.pebbles === o.pebbles, `${q}: the pebbles stay (${st.pebbles})`);
  } else ok(false, `${q}: ?rockcut=0 builds ctx.rocks`);
  await old.page.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail || !pass ? 1 : 0);
