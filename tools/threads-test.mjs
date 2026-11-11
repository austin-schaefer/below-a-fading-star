#!/usr/bin/env node
// v8-04, stories with two ends (src/v8/threads.js): each thread's ends exist, stand on their ground, lie within 15 m of a
// track or the causeway (or on the Span's deck), and from each end's stand point the other end, or the next mark, is not
// hidden by the terrain where the brief says it is seen (the deck's lip down to the traveller is tested against the
// Span's own meshes too). The Collation has a gap where the twelfth chair was; the gold's glints lie within 3 m of P5; the
// draws stay small. Then ?threads=0 leaves every prop out and the Collation keeps its twelve chairs.
// Ends that wait on a track brief 01 is adding are listed in NEEDS_TRACK: they pass with a NOTE while no track is near,
// and a NOTE says when the track has arrived and the entry can go.
// Usage: node tools/threads-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const NEEDS_TRACK = { // end: the track it needs (v8-04's report to the orchestrator)
  'chair.table': 'a trod from P9\'s end (112, -82) to the Collation (141, -66), on to P8 at (148, -100)',
  'chair.grave': 'a trod from P14 at (42, 261) south to the Sexton\'s field (41, 279)',
};
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const r = await page.evaluate(() => {
  const fp = window.__fp, T = fp.terrain, THREE = fp.THREE, th = fp.threads, E = th.ends(), out = { ends: {}, sight: [] };
  const lines = fp.paths.leads.filter((l) => l.kind !== 'rivulet').map((l) => ({ id: l.id, pts: l.lines.flat() }));
  const track = (x, z) => {
    let d = T.causewayDistance(x, z), id = 'causeway';
    for (const l of lines) for (const p of l.pts) { const e = Math.hypot(p[0] - x, p[1] - z); if (e < d) { d = e; id = l.id; } }
    if (fp.span.deckAt(x, z) != null) { d = 0; id = 'the Span\'s deck'; }
    return { d, id };
  };
  // what is drawn under a point, excluding the threads' own meshes and the cover
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  const solids = fp.scene.children.filter((o) => o.isMesh && !/^threads|vegetation|grass|reeds|plants|fung|living-moles/.test(o.name));
  const under = (x, y, z) => { ray.set(new THREE.Vector3(x, y, z), down); ray.far = 50; const h = ray.intersectObjects(solids, false)[0]; return h ? h.point.y : null; };
  const end = (key, e, opts = {}) => {
    const g = opts.deck ? fp.span.deckAt(e.x, e.z) : under(e.x, (e.y ?? T.heightAt(e.x, e.z)) + 0.6, e.z);
    out.ends[key] = { x: +e.x.toFixed(2), z: +e.z.toFixed(2), y: e.y, ground: g, lift: g == null || e.y == null ? null : +(e.y - g).toFixed(3), ...track(e.x, e.z), wet: !opts.deck && T.isUnderwater(e.x, e.z) };
  };
  // the terrain between two points (each [x, y, z]): the lowest clearance of the line over the ground, sampled every 0.5 m
  const clear = (a, b) => {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.ceil(L / 0.5)); let m = Infinity;
    for (let i = 1; i < n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t; m = Math.min(m, a[1] + (b[1] - a[1]) * t - T.heightAt(x, z)); }
    return m;
  };
  const meshClear = (a, b) => { const A = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(A), L = d.length(); ray.set(A, d.normalize()); ray.far = L - 0.3; const h = ray.intersectObjects(solids, false)[0]; return h ? `${h.object.name} at ${h.distance.toFixed(1)} of ${L.toFixed(1)} m` : null; };
  const sight = (name, s, t, meshes = false) => { const a = [s.x, s.y, s.z], b = [t.x, t.y + 0.15, t.z]; out.sight.push({ name, terrain: +clear(a, b).toFixed(2), mesh: meshes ? meshClear(a, b) : null, d: +Math.hypot(t.x - s.x, t.z - s.z).toFixed(1) }); };
  const eyeAt = (s) => ({ ...s, y: s.y ?? T.heightAt(s.x, s.z) + 1.72 });
  // 1 the traveller
  const tr = E.traveller;
  if (tr) {
    end('traveller.deck', tr.deck, { deck: true }); end('traveller.body', tr.body); end('traveller.hat', tr.hat);
    sight('deck lip to the body', eyeAt(tr.deck.stand), tr.body, true);
    sight('body to the broken bay\'s lip', eyeAt(tr.body.stand), tr.deck.lip, true);
    out.deckLip = Math.abs(tr.deck.stand.x - tr.deck.lip.x);
  }
  // 2 the twelfth chair
  const ch = E.chair;
  if (ch) {
    end('chair.table', ch.table); end('chair.grave', ch.grave);
    ch.marks.forEach((m, i) => end(`chair.mark${i + 1}-${m.kind}`, m));
    sight('the gap to the furrows\' end', eyeAt(ch.table.stand), { ...ch.dragEnd, y: T.heightAt(ch.dragEnd.x, ch.dragEnd.z) });
    sight('the graves\' stand to the chair', eyeAt(ch.grave.stand), { ...ch.grave, y: ch.grave.y + 0.5 });
    const sx = fp.workers?.sexton; out.grave = sx ? { slot: ch.grave.slot, current: sx.order[sx.state.cur].n } : null;
  }
  const cy = fp.dressing5?.collation;
  out.cy = cy ? { chairs: cy.chairs.length, fallen: cy.chairs.filter((c) => c.fallen).length, plates: cy.plates, glasses: cy.glasses, places: cy.places } : null;
  // 4 the gold
  const gd = E.gold;
  if (gd) {
    end('gold.mosaic', gd.mosaic); end('gold.hoard', gd.hoard);
    gd.glints.forEach((g, i) => end(`gold.glint${i + 1}`, g));
    out.glints = gd.glints.map((g) => { const p5 = lines.find((l) => l.id === 'P5'); return Math.min(...p5.pts.map((p) => Math.hypot(p[0] - g.x, p[1] - g.z))); });
    const chain = [gd.mosaic.stand, ...gd.glints, gd.hoard];
    for (let i = 0; i < chain.length - 1; i++) sight(`gold ${i ? 'glint ' + i : 'mosaic'} to the next`, eyeAt({ x: chain[i].x, z: chain[i].z, y: i ? T.heightAt(chain[i].x, chain[i].z) + 1.72 : undefined }), chain[i + 1]);
    const gaps = []; const pts = [gd.mosaic, ...gd.glints, gd.hoard]; for (let i = 1; i < pts.length; i++) gaps.push(+Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z).toFixed(1));
    out.goldGaps = gaps;
    out.hoardOn = under(gd.hoard.x, gd.hoard.y + 0.05, gd.hoard.z);
  }
  out.stats = th.stats();
  out.names = fp.scene.children.filter((o) => /^threads/.test(o.name)).map((o) => o.name);
  out.stories = fp.settings ? fp.settings.places.filter((p) => p.group === 'Stories').length : null;
  return out;
});
// ?threads=0: a second, lighter load (only the threads, the Collation and what they wait on)
await page.goto(`${base}/?q=low&threads=0&only=threads,dressing5`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const off = await page.evaluate(() => ({ names: window.__fp.scene.children.filter((o) => /^threads/.test(o.name)).length, chairs: window.__fp.dressing5?.collation?.chairs.length, plates: window.__fp.dressing5?.collation?.plates }));
await browser.close();

let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
const E = r.ends;
check(['traveller.deck', 'traveller.body', 'traveller.hat', 'chair.table', 'chair.grave', 'gold.mosaic', 'gold.hoard'].every((k) => E[k]), 'every end of the three threads is built', Object.keys(E).join(' '));
check(r.names.length >= 8, 'their meshes are in the scene', r.names.join(' '));
const ground = Object.entries(E).filter(([k]) => k !== 'gold.hoard');
const off_ = ground.filter(([k, e]) => e.lift == null || Math.abs(e.lift) > (k === 'gold.mosaic' ? 0.25 : 0.12) || e.wet);
check(off_.length === 0, 'each stands on its ground (the deck, the drawn ground, the paving), none under water', off_.map(([k, e]) => `${k} lift ${e.lift}${e.wet ? ' wet' : ''}`).join('; ') || ground.map(([k, e]) => `${k} ${e.lift}`).join(', '));
check(r.hoardOn != null && Math.abs(r.hoardOn - E['gold.hoard'].y) < 0.25, 'the hoard sits on the saint\'s head in the shrine\'s niche', `nest ${E['gold.hoard'].y?.toFixed(2)}, under it ${r.hoardOn?.toFixed(2)}`);
const far = [], notes = [];
for (const [k, e] of Object.entries(E)) {
  const key = k.replace(/-.*$/, '');
  if (e.d <= 15) { if (NEEDS_TRACK[key]) notes.push(`${key} now has ${e.id} at ${e.d.toFixed(1)} m: drop it from NEEDS_TRACK`); continue; }
  if (NEEDS_TRACK[key]) { notes.push(`${key} is ${e.d.toFixed(1)} m from ${e.id}; needs ${NEEDS_TRACK[key]}`); continue; }
  far.push(`${k} ${e.d.toFixed(1)} m from ${e.id}`);
}
check(far.length === 0, 'each end and mark within 15 m of a track, the causeway or the Span\'s deck (or waiting on a named track)', far.join('; ') || Object.entries(E).map(([k, e]) => `${k} ${e.d.toFixed(1)} (${e.id})`).join(', '));
for (const n of notes) console.log(`NOTE  ${n}`);
check(r.glints.length >= 2 && r.glints.every((d) => d <= 3), 'the gold\'s glints lie within 3 m of P5', r.glints.map((d) => d.toFixed(1)).join(', '));
check(r.goldGaps.every((g) => g >= 8 && g <= 40), 'the gold\'s trail: each glint 8-40 m from the last', r.goldGaps.join(', '));
const blocked = r.sight.filter((s) => s.terrain < 0.05 || s.mesh);
check(blocked.length === 0, 'from each stand point the other end or the next mark is in sight over the terrain (and past the Span\'s lip)', (blocked.length ? blocked : r.sight).map((s) => `${s.name} ${s.d} m: clear ${s.terrain}${s.mesh ? ', blocked by ' + s.mesh : ''}`).join('; '));
check(r.deckLip >= 0 && r.deckLip <= 0.5, 'the deck\'s stand point is at the lip', `${r.deckLip?.toFixed(2)} m back`);
check(r.cy && r.cy.places === 12 && r.cy.chairs === 11 && r.cy.fallen === 1 && r.cy.plates === 11 && r.cy.glasses === 11, 'the Collation: laid for twelve, eleven chairs (one down), the gap\'s plate and glass gone', JSON.stringify(r.cy));
check(r.grave && r.grave.slot === r.grave.current, 'the chair stands at the grave the Sexton is digging', JSON.stringify(r.grave));
check(r.stats.calls <= 12 && r.stats.tris <= 80000, 'the three threads: at most 12 draw calls and 80k triangles (low)', `${r.stats.calls} calls, ${r.stats.tris} tris`);
check(r.stories === 6, 'the settings panel lists both ends of each thread under Stories', `${r.stories}`);
check(off.names === 0 && off.chairs === 12 && off.plates === 12, '?threads=0: no props, the Collation keeps its twelve chairs', JSON.stringify(off));
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
