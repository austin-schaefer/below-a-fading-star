#!/usr/bin/env node
// v8-04, stories with two ends (src/v8/threads.js): each thread's ends exist, stand on their ground, lie within 15 m of a
// track or the causeway (or on the Span's deck), and from each end's stand point the other end, or the next mark, is not
// hidden by the terrain where the brief says it is seen (the deck's lip down to the traveller is tested against the
// Span's own meshes too). The Collation has a gap where the twelfth chair was; the gold's glints lie within 3 m of P5; the
// draws stay small. v8-08, the painter: his four abandoned canvases lie within 5 m of a track, each in sight of its stand
// point 8-12 m off on a track; he sits within 15 m of the Prospect and of a track, and clutches his picture when you
// come within 6 m. Then ?threads=0 leaves every prop out and the Collation keeps its twelve chairs; ?painter=0 him alone.
// Ends that wait on a track brief 01 is adding are listed in NEEDS_TRACK: they pass with a NOTE while no track is near,
// and a NOTE says when the track has arrived and the entry can go.
// Usage: node tools/threads-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const NEEDS_TRACK = {}; // end: the track it needs (empty since v8-01 laid P47 and P48)
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
  const solids = fp.scene.children.filter((o) => o.isMesh && o.visible && !/^threads|vegetation|grass|reeds|plants|fung|living-moles/.test(o.name));
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
    sight('deck lip to the body', eyeAt(tr.deck.stand), { ...tr.body, y: tr.body.top }, true);
    sight('the approach below to the body', eyeAt(tr.body.stand), { ...tr.body, y: tr.body.top }, true);
    sight('the approach below to the broken bay\'s lip', eyeAt(tr.body.stand), tr.deck.lip, true);
    sight('the hat\'s stand to the hat', eyeAt(tr.hat.stand), { ...tr.hat, y: tr.hat.y + 1.1 }, true);
    out.deckPitch = tr.deck.stand.pitch;
    out.bodyApproach = Math.hypot(tr.body.stand.x - tr.body.x, tr.body.stand.z - tr.body.z);
    { // nothing over him, and the sun on him
      const p = new THREE.Vector3(tr.body.x, tr.body.top + 0.3, tr.body.z), up = new THREE.Vector3(0, 1, 0), sun = new THREE.Vector3(fp.sun.dir.x, fp.sun.dir.y, fp.sun.dir.z);
      ray.set(p, up); ray.far = 150; out.bodyOver = ray.intersectObjects(solids, false)[0]?.object.name || null;
      ray.set(p, sun); ray.far = 150; out.bodySun = ray.intersectObjects(solids, false)[0]?.object.name || null;
    }
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
  // 5 the painter (v8-08)
  const pa = E.painter;
  if (pa) {
    pa.attempts.forEach((a) => {
      end(`painter.${a.kind}`, a);
      sight(`the stand to the ${a.kind} canvas`, eyeAt(a.stand), { x: a.centre.x, y: a.centre.y - 0.15, z: a.centre.z }, true);
      out.ends[`painter.${a.kind}`].stand = +Math.hypot(a.stand.x - a.x, a.stand.z - a.z).toFixed(1);
      out.ends[`painter.${a.kind}`].standTrack = +track(a.stand.x, a.stand.z).d.toFixed(1);
    });
    pa.drops.forEach((d) => end(`painter.${d.kind}`, d));
    end('painter.man', pa.man);
    sight('the painter\'s stand to him', eyeAt(pa.man.stand), { ...pa.man, y: pa.man.y + 1.0 }, true);
    out.paintGap = pa.attempts.map((a, i) => i ? +Math.hypot(a.x - pa.attempts[i - 1].x, a.z - pa.attempts[i - 1].z).toFixed(1) : null).slice(1);
    out.manToProspect = +Math.hypot(pa.man.x - pa.prospect.x, pa.man.z - pa.prospect.z).toFixed(1);
  }
  out.stats = th.stats();
  out.bad = fp.scene.children.filter((o) => /^threads/.test(o.name)).filter((o) => { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox, v = new THREE.Vector3(); b.getSize(v); return !o.visible || o.geometry.attributes.position.count === 0 || v.x * v.y * v.z === 0 && v.x + v.z < 0.05; }).map((o) => o.name);
  out.twelfth = { taken: !!cy?.taken, shown: fp.scene.getObjectByName('collation-twelfth')?.visible, rings: fp.scene.getObjectByName('collation-rings')?.visible, chairTaken: th.chair?.taken };
  out.names = fp.scene.children.filter((o) => /^threads/.test(o.name)).map((o) => o.name);
  out.stories = fp.settings ? fp.settings.places.filter((p) => p.group === 'Stories').length : null;
  return out;
});
// the painter's behaviour: stand 3 m off him and he clutches the picture; walk away and he goes back to it
const beh = {};
if (r.ends['painter.man']) {
  const m = r.ends['painter.man'];
  const at = async (dx, dz) => { await page.evaluate(([x, z]) => { const p = window.__fp.player.pos; p.x = x; p.z = z; }, [m.x + dx, m.z + dz]); await page.waitForTimeout(2500); return page.evaluate(() => ({ ...window.__fp.threads.painter.state })); };
  beh.near = await at(-1.5, -2.6);
  beh.far = await at(-25, -20);
  await page.waitForTimeout(2500);
  beh.far = await page.evaluate(() => ({ ...window.__fp.threads.painter.state }));
}
// ?threads=0, and the module not loaded at all (?only= without it): lighter loads of the Collation alone
const offs = [];
for (const q of ['threads=0&only=threads,dressing5', 'only=dressing5', 'painter=0&only=threads,dressing5']) {
  await page.goto(`${base}/?q=low&${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
  offs.push(await page.evaluate(() => { const fp = window.__fp, c = fp.dressing5?.collation, tw = fp.scene.getObjectByName('collation-twelfth'); return { painter: fp.scene.children.filter((o) => /^threads-painter/.test(o.name)).length + (fp.threads?.painter ? 1 : 0), names: fp.scene.children.filter((o) => /^threads/.test(o.name)).length, chairs: c?.chairs.length, plates: c?.plates, twelfthHidden: tw ? !tw.visible : false }; }));
}
await browser.close();

let pass = 0, fail = 0;
const check = (ok, name, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  ' + info : ''}`); ok ? pass++ : fail++; };
const E = r.ends;
check(['traveller.deck', 'traveller.body', 'traveller.hat', 'chair.table', 'chair.grave', 'gold.mosaic', 'gold.hoard', 'painter.line', 'painter.suns', 'painter.slash', 'painter.kicked', 'painter.man'].every((k) => E[k]), 'every end of the four threads is built', Object.keys(E).join(' '));
check(r.names.length >= 8, 'their meshes are in the scene', r.names.join(' '));
check(r.bad.length === 0, 'none of them hidden or empty', r.bad.join(' '));
const ground = Object.entries(E).filter(([k]) => k !== 'gold.hoard');
const off_ = ground.filter(([k, e]) => e.lift == null || Math.abs(e.lift) > (k === 'gold.mosaic' ? 0.25 : 0.12) || e.wet);
check(off_.length === 0, 'each stands on its ground (the deck, the drawn ground, the paving), none under water', off_.map(([k, e]) => `${k} lift ${e.lift}${e.wet ? ' wet' : ''}`).join('; ') || ground.map(([k, e]) => `${k} ${e.lift}`).join(', '));
check(r.hoardOn != null && Math.abs(r.hoardOn - E['gold.hoard'].y) < 0.25, 'the hoard sits on the saint\'s head in the shrine\'s niche', `nest ${E['gold.hoard'].y?.toFixed(2)}, under it ${r.hoardOn?.toFixed(2)}`);
const far = [], notes = [];
for (const [k, e] of Object.entries(E)) {
  const key = k.replace(/-.*$/, '');
  if (/^painter\.(line|suns|slash|kicked|tube|brush|rag)$/.test(k)) { if (e.d > 5) far.push(`${k} ${e.d.toFixed(1)} m from ${e.id} (5 m for the painter's things)`); continue; }
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
check(r.deckPitch <= -0.5 && r.deckPitch >= -1.0, 'from the lip the body lies at a natural look down (0.5-1.0 rad), past the Span\'s and the rubble\'s meshes', `pitch ${r.deckPitch?.toFixed(2)}`);
check(!r.bodyOver && !r.bodySun, 'nothing over the body and the sun on it', `over ${r.bodyOver}, sun blocked by ${r.bodySun}`);
check(r.bodyApproach >= 15 && r.bodyApproach <= 25, 'the approach from below stands 15-25 m from the body', r.bodyApproach?.toFixed(1));
check(r.twelfth.taken && r.twelfth.shown === false && r.twelfth.rings === true && r.twelfth.chairTaken, 'the threads took the Collation\'s twelfth place after building the chair', JSON.stringify(r.twelfth));
check(r.cy && r.cy.places === 12 && r.cy.chairs === 11 && r.cy.fallen === 1 && r.cy.plates === 11 && r.cy.glasses === 11, 'the Collation: laid for twelve, eleven chairs (one down), the gap\'s plate and glass gone', JSON.stringify(r.cy));
check(r.grave && r.grave.slot === r.grave.current, 'the chair stands at the grave the Sexton is digging', JSON.stringify(r.grave));
const pk = ['line', 'suns', 'slash', 'kicked'].map((k) => E[`painter.${k}`]).filter(Boolean);
check(pk.length === 4 && pk.every((e) => e.stand >= 8 && e.stand <= 12 && e.standTrack <= 1.5), 'each of the painter\'s attempts has a stand point on a track, 8-12 m off', pk.map((e) => `${e.stand} m, ${e.standTrack} m off the track`).join('; '));
check(r.manToProspect <= 15 && E['painter.man']?.d <= 15, 'the painter sits within sight of the Prospect\'s easel and 15 m of a track', `${r.manToProspect} m from the easel, ${E['painter.man']?.d.toFixed(1)} m from ${E['painter.man']?.id}`);
check(r.names.filter((n) => /^threads-painter/.test(n)).length >= 7, 'the painter\'s meshes are in the scene (props, canvases, his seat, body, head, hands, picture)', r.names.filter((n) => /^threads-painter/.test(n)).join(' '));
check(beh.near && beh.near.near && beh.near.hug > 0.8 && beh.far && !beh.far.near && beh.far.hug < 0.3, 'within 6 m he clutches the picture to his chest; walk off and he goes back to it', JSON.stringify({ near: beh.near && { hug: +beh.near.hug.toFixed(2), turn: +beh.near.turn.toFixed(2) }, far: beh.far && { hug: +beh.far.hug.toFixed(2) } }));
check(r.stats.calls <= 18 && r.stats.tris <= 100000, 'the four threads: at most 18 draw calls and 100k triangles (low)', `${r.stats.calls} calls, ${r.stats.tris} tris`);
check(r.stories === 8, 'the settings panel lists both ends of each thread under Stories', `${r.stories}`);
check(offs.slice(0, 2).every((o) => o.names === 0 && o.chairs === 12 && o.plates === 12 && !o.twelfthHidden), '?threads=0 and ?only= without threads: no props, the Collation keeps its twelve chairs', JSON.stringify(offs.slice(0, 2)));
check(offs[2].painter === 0 && offs[2].names > 0, '?painter=0: no painter, the other threads stay', JSON.stringify(offs[2]));
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
