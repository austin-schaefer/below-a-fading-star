#!/usr/bin/env node
// Map structure check (v4 map, src/v4/paths.js): __fp.paths is registered; the 49 paths (v8-01 joined the plan's 17 into
// one network: tools/roads-test.mjs), the kerb and five rivulets are all laid; each lead's two ends lie on it or on the
// lead it joins (leadAt finds one there) and resolve to the material of the
// region they are in; every rivulet runs downhill (its water never rises, and the ground along it is no higher than
// its water); no lead is drawn on the set-dressing strips; the causeway is CAUSEWAY_V4 (its samples are on the
// walked road, inside the walkable floor, from the colossi's feet to the pit) while the bench keeps v3's; the pit
// is a fall (deep, its rim fenced by colliders, a walker pushed at it from the road's end stops at the lip); the
// fall's lip is at y 53.5 ± 1 with its wall 65 m or more within 15 m behind it; the rumble's radius is doubled; and
// the leads' cost at high is about 10 draw calls and under 150k triangles.
// Usage: node tools/paths-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
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
const res = await page.evaluate(async () => {
  const fp = window.__fp, P = fp.paths, T = fp.terrain;
  if (!P) return { missing: true };
  const W = await import('/src/world.js');
  const out = { stats: P.stats(), leads: [], strips: [], road: {}, pit: {}, fall: {} };
  // the leads: ends on the lead, in their region's material; rivulets downhill
  for (const L of P.leads) {
    const ends = L.ends.flat().map(([x, z]) => {
      const h = P.leadAt(x, z), prim = fp.regions.regionAt(x, z, {}).primary;
      return { x: +x.toFixed(1), z: +z.toFixed(1), id: h && h.id, material: h && h.material, region: prim };
    });
    let rise = 0, waterUp = 0, groundOver = 0;
    if (L.kind === 'rivulet') for (const S of L.lines) {
      for (let i = 0; i < S.length; i++) {
        const [x, z, y, wy, open] = S[i];
        if (i) waterUp = Math.max(waterUp, wy - S[i - 1][3]);
        rise = Math.max(rise, y - wy);
        if (open) groundOver = Math.max(groundOver, T.heightAt(x, z) - wy);
      }
    }
    out.leads.push({ id: L.id, kind: L.kind, length: +L.length.toFixed(1), ends, materials: L.materials, ended: L.ended, rise: +rise.toFixed(2), waterUp: +waterUp.toFixed(3), groundOver: +groundOver.toFixed(3) });
  }
  // the strips: no open (drawn) sample of any lead on the Discontinued Track or the Surveyor's Pegs
  const strips = [{ name: 'the Discontinued Track', a: [170, 150], b: [215, 160], half: 1.0 }, { name: "the Surveyor's Pegs", a: [-80, -285], b: [-80, 285], half: 0.5 }];
  for (const S of strips) {
    let n = 0;
    for (const L of P.leads) for (const line of L.lines) for (const [x, z, , , open] of line) {
      const ex = S.b[0] - S.a[0], ez = S.b[1] - S.a[1], t = Math.max(0, Math.min(1, ((x - S.a[0]) * ex + (z - S.a[1]) * ez) / (ex * ex + ez * ez)));
      if (open && Math.hypot(x - S.a[0] - ex * t, z - S.a[1] - ez * t) < S.half) n++;
    }
    out.strips.push({ name: S.name, n });
  }
  // the road
  const cw = fp.causeway, V4 = W.CAUSEWAY_V4;
  out.road.isV4 = cw === V4 || (cw.length === V4.length && cw.every((p, i) => p.x === V4[i].x && p.z === V4[i].z));
  let off = 0, outside = 0, n = 0, samples = 0;
  for (let i = 0; i < V4.length - 1; i++) {
    const a = V4[i], b = V4[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = 0; s < L; s += 5) {
      const x = a.x + (b.x - a.x) * s / L, z = a.z + (b.z - a.z) * s / L;
      if (Math.hypot(x - W.SITES.pit.x, z - W.SITES.pit.z) < 22) continue; // the pit has the road's end
      samples++;
      off = Math.max(off, T.causewayDistance(x, z));
      if (Math.hypot(x, z) > fp.mountains.walkLimit(x, z) + 0.01) outside++;
      n++;
    }
  }
  out.road.samples = samples; out.road.off = +off.toFixed(3); out.road.outside = outside;
  out.road.start = [V4[0].x, V4[0].z]; out.road.end = [V4[V4.length - 1].x, V4[V4.length - 1].z];
  // the v3 road's far end (the tower hill) is now mid-road, and the old end of v3 no longer the end
  out.road.v3TowerOn = +T.causewayDistance(-222, -110).toFixed(3);
  // the pit: deep, fenced, a walker stops at the lip
  const pit = W.SITES.pit, rimY = T.heightAt(pit.x, pit.z - P.pit.rim(0) - 1.5);
  out.pit.depth = +(rimY - T.heightAt(pit.x, pit.z)).toFixed(1);
  out.pit.colliders = P.pit.colliders;
  {
    // walk from the road's last whole stretch straight at the pit's middle for four seconds
    const p = fp.player, sx = 192, sz = 166;
    p.pos.set(sx, T.heightAt(sx, sz) + p.eye, sz); if (p.vel) p.vel.set(0, 0, 0);
    p.yaw = Math.atan2(-(pit.x - sx), -(pit.z - sz)); p.pitch = 0;
    fp.events.dispatchEvent(new CustomEvent('begin'));
    p.keys.add('KeyW');
    let minY = Infinity;
    for (let i = 0; i < 160; i++) { fp.controls.update(0.05); minY = Math.min(minY, p.pos.y - p.eye); }
    p.keys.clear();
    out.pit.walk = { moved: +Math.hypot(p.pos.x - sx, p.pos.z - sz).toFixed(1), edge: +P.pit.edge(p.pos.x, p.pos.z).toFixed(2), minY: +minY.toFixed(1), rimY: +rimY.toFixed(1) };
  }
  // the fall
  const RV = T.river, lip = RV.lip, B = RV.back;
  out.fall.lipY = +lip.y.toFixed(2); out.fall.groundAtLip = +T.heightAt(lip.x, lip.z).toFixed(2); out.fall.poolY = RV.pool.y;
  let wall = -Infinity;
  for (let along = 2; along <= 15; along += 1) for (let ac = -9; ac <= 9; ac += 1.5) wall = Math.max(wall, T.heightAt(lip.x + B.x * along + B.z * ac, lip.z + B.z * along - B.x * ac));
  out.fall.wall15 = +wall.toFixed(1);
  out.fall.rumble = fp.river && fp.river.fall ? fp.river.fall.rumbleRadius : null;
  return out;
});
await browser.close();
if (res.missing) { console.log('FAIL __fp.paths is not registered'); process.exit(1); }

let fail = 0, pass = 0;
const check = (ok, label, detail = '') => { if (ok) pass++; else fail++; console.log(ok ? 'PASS' : 'FAIL', label.padEnd(52), detail); };
const modErr = errors.filter((e) => /paths/.test(e));
check(!modErr.length, 'paths module loaded without errors', modErr[0] || '');
const kinds = (k) => res.leads.filter((l) => l.kind === k).length;
check(kinds('path') === 49 && kinds('kerb') === 1 && kinds('rivulet') === 5, 'the leads: 49 paths (v8-01: 17 + 32), 1 kerb, 5 rivulets', `${kinds('path')} / ${kinds('kerb')} / ${kinds('rivulet')}`);
for (const L of res.leads) {
  // v8-01: an end that is a junction finds the lead it joins (leadAt gives the nearest), and that is right too
  const bad = L.ends.filter((e) => !e.id || e.material !== e.region);
  check(!bad.length && L.length > 5, `${L.id} (${L.kind}): its ends lie on it or a lead it joins, in their region's material`,
    `${L.length} m, ${L.materials.join(' / ')}; ` + L.ends.map((e) => `(${e.x}, ${e.z}) ${e.id || 'none'} ${e.material || '-'}${e.material !== e.region ? ` vs ${e.region}` : ''}`).join(', '));
}
for (const L of res.leads.filter((l) => l.kind === 'rivulet')) {
  check(L.waterUp <= 0.001 && L.groundOver <= 0.02, `${L.id}: runs downhill only`, `water never rises (worst ${L.waterUp} m); ground over its water ${L.groundOver} m (cut through rises up to ${L.rise} m); ${L.ended}`);
}
for (const S of res.strips) check(S.n === 0, `no lead drawn on ${S.name}`, `${S.n} samples`);
check(res.road.isV4, 'ctx.causeway is CAUSEWAY_V4', `from (${res.road.start}) to (${res.road.end})`);
check(res.road.off < 0.01 && res.road.outside === 0, 'the road\'s samples are on CAUSEWAY_V4 and walkable', `${res.road.samples} samples, worst off ${res.road.off} m, ${res.road.outside} beyond the walk limit`);
check(res.road.v3TowerOn < 0.01, 'the v3 road is part of it (the tower hill is on the road)', `${res.road.v3TowerOn} m`);
check(res.pit.depth >= 15, 'the pit is a fall (deep)', `${res.pit.depth} m below its rim`);
check(res.pit.colliders >= 60, 'the pit\'s rim is fenced', `${res.pit.colliders} colliders`);
check(res.pit.walk.edge > 0 && res.pit.walk.minY > res.pit.walk.rimY - 2.5 && res.pit.walk.moved > 2, 'a walker from the road\'s end stops at the lip', JSON.stringify(res.pit.walk));
check(Math.abs(res.fall.lipY - 53.5) <= 1, 'the fall\'s lip is at y 53.5 ± 1', `lip ${res.fall.lipY}, ground there ${res.fall.groundAtLip}, pool ${res.fall.poolY}`);
check(Math.abs(res.fall.groundAtLip - 53.5) <= 1.5, 'the ground at the lip stands at it', `${res.fall.groundAtLip}`);
check(res.fall.wall15 >= 65, 'the wall stands 65 m or more within 15 m behind the lip', `${res.fall.wall15} m`);
check(res.fall.rumble === 140, 'the rumble\'s radius is doubled (70 to 140 m)', `${res.fall.rumble}`);
const st = res.stats;
check(st.leads.calls <= 11 && st.leads.tris < 150000, 'the leads at high: about 10 draw calls, under 150k tris', `${st.leads.calls} calls, ${st.leads.tris} tris; all of paths.js ${st.calls} calls, ${st.tris} tris`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
