#!/usr/bin/env node
// v8-01 roads (briefs/v8/brief-v8-01-roads.md): the leads and the causeway make one network, and every place is on it.
// Checks, from the live page: every track (each path lead's lines, the kerb K1 and the causeway) is joined to the one
// at the spawn (two tracks meet where they come within 3 m); every landmark has a track within its radius or 15 m of
// its centre (the Span: on its line; the canyon's four places from P13 on the rim, v8-09); every 4 m of every track has a standing gnomon within 80 m whose head clears
// the terrain from a walker's eye (1.6 m), traced here independently of the placement; every track sample is
// walkable (slope under 0.85 rad (the push-back is 0.95), inside the walk limit, not under more than 0.3 m of water unless the lead goes on
// slabs); nothing stands across any track; P13 walked on foot to the canyon rim's ends; no gnomon stands on a tread;
// the gnomons' cost (draw calls, triangles).
// Usage: node tools/roads-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const res = await page.evaluate(async () => {
  const fp = window.__fp, T = fp.terrain, R = fp.roads, P = fp.paths;
  if (!R || !P) return { missing: !R ? 'roads' : 'paths' };
  const W = await import('/src/world.js');
  // the tracks, resampled every 2 m
  const tracks = [];
  const resample = (pts, step) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / step));
      for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  for (const L of P.leads) {
    if (L.kind === 'rivulet') continue;
    L.lines.forEach((S, li) => tracks.push({ id: L.lines.length > 1 ? `${L.id}.${li}` : L.id, lead: L, w: L.kind === 'kerb' ? 0.6 : L.w, slabs: L.slabs, pts: resample(S.map((s) => [s[0], s[1]]), 2) }));
  }
  tracks.push({ id: 'causeway', w: 1.75, pts: resample(fp.causeway.map((p) => [p.x, p.z]), 2) });
  const segDist = (x, z, pts) => {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
      best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
    }
    return best;
  };
  const bbox = (t) => { if (!t.bb) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const [x, z] of t.pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } t.bb = [a, b, c, d]; } return t.bb; };
  // ---- connected: tracks meet within 3 m
  const meets = (A, B) => {
    const [a0, a1, a2, a3] = bbox(A), [b0, b1, b2, b3] = bbox(B);
    if (a0 > b2 + 3 || b0 > a2 + 3 || a1 > b3 + 3 || b1 > a3 + 3) return false;
    for (let i = 0; i < A.pts.length; i++) if (segDist(A.pts[i][0], A.pts[i][1], B.pts) < 3) return true;
    return false;
  };
  const sp = W.SPAWN;
  let start = tracks.reduce((best, t) => { const d = segDist(sp.x, sp.z, t.pts); return d < best.d ? { t, d } : best; }, { t: null, d: Infinity });
  const seen = new Set([start.t]), queue = [start.t];
  while (queue.length) { const A = queue.shift(); for (const B of tracks) if (!seen.has(B) && meets(A, B)) { seen.add(B); queue.push(B); } }
  const unjoined = tracks.filter((t) => !seen.has(t)).map((t) => t.id);
  // dead ends: a lead's end that meets no other track and is not at a place (a landmark's reach)
  // ---- the landmarks
  const places = [];
  for (const [k, L] of Object.entries(W.LANDMARKS)) {
    let best = Infinity, by = '';
    for (const t of tracks) for (const [x, z] of t.pts) {
      const d = L.axis ? W.landmarkDistance(L, x, z) : Math.hypot(x - L.x, z - L.z) - Math.max(L.r, 15);
      if (d < best) { best = d; by = t.id; }
    }
    places.push({ k, name: L.name, d: +best.toFixed(1), by, card: !!L.card, reached: L.reached || null, high: !!(L.feet && L.feet[0] > 20), below: !!(L.feet && L.feet[1] < -5), edge: Math.hypot(L.x, L.z) > 320 });
  }
  // ---- in sight: every 4 m, a visible gnomon within SIGHT m over the terrain
  const G = R.gnomons.filter((g) => g.visible);
  const H = (x, z) => T.heightAt(x, z);
  const clear = (x, z, g) => {
    const y0 = H(x, z) + 1.6, L = Math.hypot(g.x - x, g.z - z), n = Math.max(1, Math.ceil(L / 2));
    for (let i = 1; i < n; i++) {
      const t = i / n; if (t * L < 1.2 || (1 - t) * L < 1.2) continue;
      if (H(x + (g.x - x) * t, z + (g.z - z) * t) > y0 + (g.top - y0) * t) return false;
    }
    return true;
  };
  let samples = 0; const blind = [];
  for (const t of tracks) {
    for (let i = 0; i < t.pts.length; i += 2) {
      const [x, z] = t.pts[i];
      if (Math.hypot(x - 200, z - 185) < 12) continue; // v14-D2: the causeway's line runs on over the Pit's hole, where no one walks it (its floor has its own way)
      samples++;
      let ok = false, nearest = Infinity;
      for (const g of G) { const d = Math.hypot(g.x - x, g.z - z); if (d < R.SIGHT) { nearest = Math.min(nearest, d); if (clear(x, z, g)) { ok = true; break; } } }
      if (!ok) blind.push(`${t.id}@(${x.toFixed(0)},${z.toFixed(0)})`);
    }
  }
  // ---- walkable
  const steep = [], wet = [], outside = [], MAXG = 1.2;
  for (const t of tracks) {
    if (t.id === 'causeway') continue; // the paths-test walks the road
    for (let i = 0; i < t.pts.length; i++) {
      const [x, z] = t.pts[i], dep = T.waterDepthAt ? T.waterDepthAt(x, z) : 0;
      // the grade along the track over the next step (2 m), where a walker climbs or drops
      if (i + 1 < t.pts.length) {
        const [x2, z2] = t.pts[i + 1], run = Math.hypot(x2 - x, z2 - z), g = Math.abs(T.heightAt(x2, z2) - T.heightAt(x, z)) / Math.max(0.5, run);
        const wet2 = t.slabs && (dep > -0.3 || T.waterDepthAt(x2, z2) > -0.3); // on the slabs, level whatever the bank does
        if (g > MAXG && !wet2) steep.push(`${t.id}@(${x.toFixed(0)},${z.toFixed(0)}) ${g.toFixed(2)}`);
      }
      if (dep > 0.3 && !t.slabs) wet.push(`${t.id}@(${x.toFixed(0)},${z.toFixed(0)}) ${dep.toFixed(2)} m`);
      if (Math.hypot(x, z) > fp.mountains.walkLimit(x, z) + 0.01) outside.push(`${t.id}@(${x.toFixed(0)},${z.toFixed(0)})`);
    }
  }
  // ---- nothing stands across a track: no collider (a wall, a pier, a stone) within 0.3 m of a sample's middle,
  // but those a walker steps over (their top under 0.5 m above the ground) and those that travel the road (moving).
  // The causeway is 3.5 m wide: it is blocked where no line along it is clear (it grazes the keep's corner at the
  // gate), and it ends at the pit's lip (its line runs on under the water: samples past the rim ring are not road).
  const PG = await import('/src/v4/paths/ground.js');
  const blocked = [], CG = new Map(), CC = 8;
  const flat = [];
  for (const c of fp.controls.state.colliders) {
    if (c.moving) continue;
    if (c.x1 === undefined) { flat.push(c); continue; }
    // a capsule is read as circles along its length, a radius apart
    const L = Math.hypot(c.x2 - c.x1, c.z2 - c.z1), n = Math.max(1, Math.ceil(L / Math.max(0.1, c.r)));
    for (let i = 0; i <= n; i++) flat.push({ ...c, x: c.x1 + (c.x2 - c.x1) * i / n, z: c.z1 + (c.z2 - c.z1) * i / n });
  }
  for (const c of flat) { const k = Math.floor(c.x / CC) * 4096 + Math.floor(c.z / CC); let a = CG.get(k); if (!a) CG.set(k, (a = [])); a.push(c); }
  const hitAt = (x, z) => {
    const gy = T.heightAt(x, z);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const a = CG.get((Math.floor(x / CC) + i) * 4096 + Math.floor(z / CC) + j); if (!a) continue;
      for (const c of a) {
        if (Math.hypot(x - c.x, z - c.z) > c.r + 0.3) continue;
        if (c.h !== undefined && (c.y + c.h < gy + 0.5 || c.y > gy + 1.8)) continue;
        return c;
      }
    }
    return null;
  };
  for (const t of tracks) {
    const cw = t.id === 'causeway';
    for (let k = 0; k < t.pts.length; k++) {
      const [x, z] = t.pts[k];
      if (cw && PG.pitEdge(x, z) < 1.4) continue;
      let hit = hitAt(x, z);
      if (hit && cw) {
        const [x2, z2] = t.pts[Math.min(k + 1, t.pts.length - 1)], [x1, z1] = t.pts[Math.max(k - 1, 0)], dl = Math.hypot(x2 - x1, z2 - z1) || 1;
        for (let o = -1.5; o <= 1.5 && hit; o += 0.25) hit = hitAt(x - (z2 - z1) / dl * o, z + (x2 - x1) / dl * o);
      }
      if (hit) blocked.push(`${t.id}@(${x.toFixed(0)},${z.toFixed(0)}) ${hit.mod || '?'} r${hit.r.toFixed(1)} at (${hit.x.toFixed(1)},${hit.z.toFixed(1)})`);
    }
  }
  // ---- no gnomon on a tread
  const onTread = [];
  for (const g of R.gnomons) for (const t of tracks) { const d = segDist(g.x, g.z, t.pts); if (d < t.w + 0.3) { onTread.push(`(${g.x.toFixed(0)},${g.z.toFixed(0)}) on ${t.id} ${d.toFixed(2)}`); break; } }
  // ---- the canyon rim on foot (v8-09): P13's lines walked from the worn crust with the walker's own controls
  const rim = [];
  {
    fp.events.dispatchEvent(new CustomEvent('begin'));
    const p = fp.player, L = P.leads.find((l) => l.id === 'P13');
    for (const S of L.lines) {
      const pts = S.filter((_, i) => i % 2 === 0 || i === S.length - 1);
      p.pos.set(pts[0][0], T.heightAt(pts[0][0], pts[0][1]) + p.eye, pts[0][1]); p.vel.set(0, 0, 0); p.keys.clear(); p.keys.add('KeyW');
      let i = 1;
      for (let t = 0; t < 3000 && i < pts.length; t++) {
        const dx = pts[i][0] - p.pos.x, dz = pts[i][1] - p.pos.z;
        if (Math.hypot(dx, dz) < 0.8) { i++; continue; }
        p.yaw = Math.atan2(-dx, -dz); fp.controls.update(0.05);
      }
      p.keys.clear();
      rim.push({ ok: i === pts.length, at: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)], of: `${i}/${pts.length}` });
    }
  }
  // ---- v14-B6 (the owner's #54: a path brings a walker to the front of a way up, not its back): every way up whose foot is on the
  // ground (ctx.ascents, its first point with no y or a y within 1 m of the terrain) has a track ending at its foot:
  // the nearest track end within 4 m of the first point, and behind it (on the side the climb does not go: its
  // second distinct point is on the other side), so a walker who follows the track arrives facing up the way
  // ways down not yet given a track to their foot, each with why (listed for the agent who owns the place)
  const FEET_OPEN = { 'pit-stair': 'the Pit\'s stair is come to from its head (the trod P54 ends at its landing on the lip, v15-F1); its foot stands on the Pit\'s floor, where no track runs', 'coffin-road': 'the Sexton\'s stair down into the Nave (v14-D0), its head on the rim 42 m from P22\'s end: the Nave\'s own brief' };
  const feet = [];
  for (const a of fp.ascents?.list || []) {
    if (a.test) continue;
    const p0 = a.path[0], p1 = a.path.find((q) => Math.hypot(q[0] - p0[0], q[1] - p0[1]) > 0.5);
    if (!p1 || (p0[2] !== undefined && Math.abs(p0[2] - T.heightAt(p0[0], p0[1])) > 1)) continue;
    let best = null;
    for (const t of tracks) for (const e of [t.pts[0], t.pts[t.pts.length - 1]]) {
      const d = Math.hypot(e[0] - p0[0], e[1] - p0[1]);
      if (!best || d < best.d) best = { d, id: t.id, e };
    }
    const ux = p1[0] - p0[0], uz = p1[1] - p0[1], ahead = ((best.e[0] - p0[0]) * ux + (best.e[1] - p0[1]) * uz) / Math.hypot(ux, uz);
    feet.push({ id: a.id, d: +best.d.toFixed(1), by: best.id, ahead: +ahead.toFixed(2), at: p0.slice(0, 2).map((v) => +v.toFixed(1)), ok: best.d <= 4 && ahead <= 0.3, open: FEET_OPEN[a.id] || null });
  }
  // ---- and none leads to its back (#54: nothing a walker follows, a track or the stair's slabs lying in the turf,
  // brings them to the blank back of a way up): for an ascent that names its `back` (the turf behind its first rise), no track
  // ends within 4 m of it, and no slab of the stair lying in sight in the turf (not buried) is within 4 m of it
  const backs = [];
  for (const a of fp.ascents?.list || []) {
    if (a.test || !a.back) continue;
    const [bx, bz] = a.back, ends = [], slabs = [];
    for (const t of tracks) for (const e of [t.pts[0], t.pts[t.pts.length - 1]]) if (Math.hypot(e[0] - bx, e[1] - bz) < 4) ends.push(t.id);
    for (const e of fp.stair?.plan.els || []) if (e.rest && !e.rest.buried && Math.hypot(e.cx - bx, e.cz - bz) < 4) slabs.push(e.i);
    let near = Infinity;
    for (const e of fp.stair?.plan.els || []) if (e.rest && !e.rest.buried) near = Math.min(near, Math.hypot(e.cx - bx, e.cz - bz));
    backs.push({ id: a.id, ends, slabs, near: +near.toFixed(1), buried: (fp.stair?.plan.els || []).filter((e) => e.rest?.buried).length });
  }
  return { feet, backs, rim, stats: R.stats(), blocked, n: tracks.length, start: start.t.id, startD: +start.d.toFixed(1), unjoined, places, samples, blind, steep, wet, outside, onTread,
    lengths: { ways: +P.leads.filter((l) => l.cls === 'way').reduce((a, l) => a + l.length, 0).toFixed(0), trods: +P.leads.filter((l) => l.cls === 'trod').reduce((a, l) => a + l.length, 0).toFixed(0) } };
});
// #41: the waystones' heads have no two faces in one plane fighting for the pixel (the notch's dark lining was laid
// exactly on the flanks and shoulders, and flickered as the walker moved): forty standing heads, tools/coplanar.js
const CP = await page.evaluate(async () => {
  const fp = window.__fp, { coplanar } = await import('/tools/coplanar.js'), mesh = fp.scene.getObjectByName('roads-gnomons'), H = fp.roads.heads;
  const M = new fp.THREE.Matrix4(), P = new fp.THREE.Vector3(), out = { heads: 0, pairs: 0, at: [] };
  for (let i = 0; i < H.count && out.heads < 40; i += Math.max(1, Math.floor(H.count / 40))) {
    H.getMatrixAt(i, M); P.setFromMatrixPosition(M); P.y += 0.35;
    const r = coplanar(mesh, P, 0.75); out.heads++; out.pairs += r.length; if (r.length && out.at.length < 4) out.at.push(r[0].at);
  }
  return out;
});
await browser.close();
if (res.missing) { console.log(`FAIL __fp.${res.missing} is not registered`); process.exit(1); }
let fail = 0, pass = 0;
const check = (ok, label, detail = '') => { if (ok) pass++; else fail++; console.log(ok ? 'PASS' : 'FAIL', label.padEnd(60), detail); };
const modErr = errors.filter((e) => /roads|paths/.test(e));
check(!modErr.length, 'roads and paths loaded without errors', modErr[0] || '');
check(res.startD < 6 && res.unjoined.length === 0, 'one network: every track joined to the spawn\'s', `${res.n} tracks from ${res.start} (${res.startD} m from the spawn); ways ${res.lengths.ways} m, trods ${res.lengths.trods} m; unjoined: ${res.unjoined.join(', ') || 'none'}`);
// The Galleries and the Thrones hang on the mountain wall: no track reaches them (a track looks up at them).
// v14-B3: places on open ground a short walk off a track, each with how far past its reach the nearest track may lie
const EXEMPT = {
  escalade: { why: 'the Cyclopean Stairs, the Span\'s west stair, in the wood\'s fringe', max: 20 },
  pit: { why: 'the trod P54 ends at its landing on the north-west lip, which stands out over the rim 17.5 m from the middle; the causeway goes on past it to the Span\'s east stair (v15-F1, the owner\'s #59)', max: 4 },
};
for (const p of res.places) {
  // v14-B3: a place reached by its own way (`reached` in world.js) needs no track only if it is up (a deck, a top, the
  // gallery: its card's feet over 20 m), down (v14-D0: under the ground, its card's feet under -5 m: the Noon Road) or at
  // the walk's edge (the passes); a `reached` on the ground fails
  if (p.reached) { check(p.high || p.below || p.edge, `${p.name}: reached by ${p.reached}, not a track (it is ${p.high ? 'up' : p.below ? 'under the ground' : p.edge ? 'at the walk\'s edge' : 'on the ground: give it a track'})`, `${p.d} m from ${p.by}`); continue; }
  if (EXEMPT[p.k]) check(p.d <= EXEMPT[p.k].max, `${p.name}: exempt (${EXEMPT[p.k].why}); the nearest track within ${EXEMPT[p.k].max} m of its reach`, `${p.d} m, ${p.by}`);
  else check(p.d <= 0, `${p.name}${p.card ? ' (card)' : ''}: a track within its reach`, `${p.d <= 0 ? 'on' : p.d + ' m short,'} ${p.by}`);
}
{
  const shut = res.feet.filter((f) => !f.open), open = res.feet.filter((f) => f.open);
  const say = (f) => `${f.id} ${f.ok ? 'ok' : 'FAIL'}: ${f.by} ends ${f.d} m from (${f.at}), ${f.ahead > 0.3 ? `${f.ahead} m up the climb's side` : 'behind the foot'}`;
  check(shut.length >= 2 && shut.every((f) => f.ok), 'every way up with its foot on the ground: a track ends within 4 m of the foot, behind it (#54)', `${shut.length} ascents: ${shut.map(say).join('; ')}`);
  // an exemption lasts only while its reason holds: once a track reaches that foot, take the way out of FEET_OPEN
  check(open.every((f) => !f.ok), 'the ways up exempted in FEET_OPEN still have no track to their foot (once one does, drop its exemption)', open.map((f) => `${f.id}: ${f.ok ? `REACHED by ${f.by}` : `no track yet, nearest end ${f.d} m (${f.by})`} (${f.open})`).join('; ') || 'none exempted');
}
check(res.backs.length >= 1 && res.backs.every((b) => !b.ends.length && !b.slabs.length), 'nothing a walker follows ends at the back of a way up: no track end, no slab lying in sight in the turf, within 4 m of it (#54)', res.backs.map((b) => `${b.id}: track ends ${b.ends.join(',') || 'none'}, slabs ${b.slabs.length} (nearest in sight ${b.near} m; ${b.buried} under the turf)`).join('; '));
check(res.blind.length === 0, 'a standing gnomon in sight (80 m, over the terrain) every 4 m', `${res.samples} samples, ${res.blind.length} blind ${res.blind.slice(0, 8).join(' ')}`);
check(res.steep.length === 0, 'every track walkable: grade along it under 1.2 over each 2 m', `${res.steep.length} ${res.steep.slice(0, process.env.ALL ? 400 : 8).join(' ')}`);
check(res.wet.length === 0, 'every track sample dry-shod (or on slabs)', `${res.wet.length} ${res.wet.slice(0, process.env.ALL ? 400 : 8).join(' ')}`);
check(res.outside.length === 0, 'every track sample inside the walk limit', `${res.outside.length} ${res.outside.slice(0, 8).join(' ')}`);
check(res.blocked.length === 0, 'nothing stands across any track (a collider within 0.3 m of its middle; the causeway: across all its width)', `${res.blocked.length} ${res.blocked.slice(0, process.env.ALL ? 400 : 8).join(' ')}`);
check(res.rim.length === 3 && res.rim.every((r) => r.ok), 'the canyon rim walked on foot: P13 from the worn crust, under the Span, to the lips over the Speculum and the Cutting', JSON.stringify(res.rim));
check(res.onTread.length === 0, 'no gnomon stands on a tread', `${res.onTread.length} ${res.onTread.slice(0, 6).join(' ')}`);
check(CP.heads >= 30 && CP.pairs === 0, 'the waystones\' heads (#41): no two faces in one plane (the notch\'s lining stands off the stone)', `${CP.heads} heads, ${CP.pairs} pairs ${JSON.stringify(CP.at)}`);
const st = res.stats;
check(st.calls <= 4 && st.tris < 120000, 'the gnomons: 4 draw calls, under 120k triangles', JSON.stringify(st));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
