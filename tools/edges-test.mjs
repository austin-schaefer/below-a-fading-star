#!/usr/bin/env node
// Walk to the edge and look down (v10-T1, the owner's issue #15): a scripted walker comes at each hole the map keeps
// a walker back from, from outside, at a walk and at a hurry, and must
//   - reach within a stated distance of the lip (the Pit and the Foundered Nave 1.0 m, the Great Span's broken edges
//     0.5 m, the Sunken Court's coping 1.0 m after a hop onto the kerb),
//   - never pass it (the signed distance to the lip stays >= 0; on the Span the deck holds, the walker never drops),
//   - never be under the floor: feet no lower than the terrain (or the deck) less 0.15 m at any tick,
// and at the Span's crack a running hop still clears it. v14-D0, the Coffin Road: a walker whose line meets the Nave's
// stair at its head goes down it, held on its floor (so that walk is not a pass of the lip, and is measured from the
// stair's floor), and at least one bearing does; hurrying and hopping sideways off the stair (high, middle, low) and
// off the road on the water keep the walker on (held edges); one dropped into the water off the road is put back on
// the road within three seconds (the page's own frames), never under the water's floor. v14-D2, the Pit's slabs round its
// wall: sideways off them toward the hole and the wall at three heights, the held edges keep the walker on; a walker on
// the landing's line walks out onto it. The kerbs along z 215 still hold at the crack's lips; v12-H1 opened
// them only where a fallen coping lies across the crack 4 m in from the south parapet, and a walker on that line, at a walk
// and with no hop, crosses on it both ways and stays on stone (never more than 0.3 m under the deck). Simulated at 60 Hz
// through controls.update in one page.
// Usage: node tools/edges-test.mjs [base=http://localhost:8123]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`${base}/?q=low&shadows=0&bloom=0`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 180000 });
const R = await page.evaluate(async () => {
  const fp = window.__fp, p = fp.player, T = fp.terrain, DT = 1 / 60;
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const NG = await import('/src/v5/nave/ground.js'), PG = await import('/src/v4/paths/ground.js');
  const SP = await import('/src/v4/span/plan.js'), CT = await import('/src/structures/court.js');
  const SPAN = SP.SPAN, Y = SPAN.deckY, pit = CT.COURT.pit;
  // the floor under (x, z): the terrain, or the Span's deck where the walker stands on it (deck: true)
  let onSpan = false;
  const floorAt = (x, z) => { const d = onSpan ? fp.span.deckAt(x, z) : null; return d !== null && d !== undefined && d > T.heightAt(x, z) ? d : T.heightAt(x, z); };
  // a walk: from (sx, sz) [on the deck at y, if given] at (tx, tz), for `secs`; keys W (and Shift when hurry); reports
  // the closest the lip got (min of edge(), >= 0 means never passed) and the lowest the feet went under the floor
  function walk(sx, sz, tx, tz, edge, { y, hurry = false, secs = 14, hopAt = null } = {}) {
    fp.controls.placeAt(sx, sz); onSpan = y !== undefined; if (y !== undefined) p.pos.y = y + p.eye;
    p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true;
    p.yaw = Math.atan2(-(tx - sx), -(tz - sz)); p.keys.clear(); p.keys.add('KeyW'); if (hurry) p.keys.add('ShiftLeft');
    let minEdge = Infinity, under = 0, stair = 0;
    for (let i = 0; i < secs * 60; i++) {
      fp.controls.update(DT);
      if (hopAt && i >= hopAt && i % 40 === 0) fp.controls.hop();
      // v14-D0: on the Coffin Road's stair (a held floor into the Nave) the lip is not passed and the floor is the stair's
      const cr = p.onStack && p.onStack.name === 'coffin-road' ? fp.coffinRoad.floor(p.pos.x, p.pos.z) : null;
      if (cr !== null && cr !== undefined) { stair++; under = Math.min(under, p.pos.y - p.eye - cr); continue; }
      const e = edge(p.pos.x, p.pos.z); if (e < minEdge) minEdge = e;
      under = Math.min(under, p.pos.y - p.eye - floorAt(p.pos.x, p.pos.z));
    }
    p.keys.clear();
    return { x: p.pos.x, z: p.pos.z, end: stair ? 0 : edge(p.pos.x, p.pos.z), minEdge, under, feet: p.pos.y - p.eye, stair };
  }
  const res = [];
  // the two ragged holes, from five bearings
  for (const [name, H, edge, reach] of [['the Foundered Nave', NG.NAVE, NG.naveEdge, 1.0], ['the Pit', PG.PIT, PG.pitEdge, 1.0]]) {
    for (const hurry of [false, true]) {
      let worst = 0, minEdge = Infinity, under = 0, n = 0, at = '', stairs = [];
      for (const b of [0, 60, 120, 180, 300]) {
        const a = b * Math.PI / 180, r = walk(H.x + Math.sin(a) * 30, H.z - Math.cos(a) * 30, H.x, H.z, edge, { hurry, secs: hurry ? 9 : 14 });
        if (r.stair) stairs.push(b);
        if (r.end > worst) { worst = r.end; at = `bearing ${b}`; }
        minEdge = Math.min(minEdge, r.minEdge); under = Math.min(under, r.under); n++;
      }
      res.push({ name, mode: hurry ? 'hurry' : 'walk', n, worst, minEdge, under, reach, at, stairs: H === NG.NAVE ? stairs : undefined });
    }
    // a hurrying hop at the lip, five seconds
    const a = 0.3, r = walk(H.x + Math.sin(a) * 30, H.z - Math.cos(a) * 30, H.x, H.z, edge, { hurry: true, secs: 12, hopAt: 240 });
    res.push({ name, mode: 'hop at the lip', n: 1, worst: r.end, minEdge: r.minEdge, under: r.under, reach: 1.0, at: '' });
  }
  // each Pit lookout (v10-T1): a walker coming straight at it reaches the lip within 0.9 m
  for (const b of PG.PIT_LOOKOUTS) {
    const a = b * Math.PI / 180, r = walk(PG.PIT.x + Math.sin(a) * 30, PG.PIT.z - Math.cos(a) * 30, PG.PIT.x, PG.PIT.z, PG.pitEdge, { secs: 14 });
    res.push({ name: `the Pit, lookout ${b}`, mode: 'walk', n: 1, worst: r.end, minEdge: r.minEdge, under: r.under, reach: 0.9, at: '' });
  }
  // the Span's broken edges, on the deck: the lip x of the deck run the walker is on, and which way the gap lies
  const c0 = SPAN.crack.x - SPAN.crack.w / 2, c1 = SPAN.crack.x + SPAN.crack.w / 2, T2 = SPAN.pierT / 2;
  const P = SPAN.piers;
  const spanTrials = [['the crack, from the west', -70, c0, 1], ['the crack, from the east', -20, c1, -1]];
  SPAN.collapsed.forEach(([a, b], i) => {
    spanTrials.push([`bay ${i + 1}, from the west`, a + T2 - 20, a + T2, 1]); // the deck ends at the west pier's far face
    spanTrials.push([`bay ${i + 1}, from the east`, b - T2 + 20, b - T2, -1]);
  });
  for (const [name, sx, lip, dir] of spanTrials) {
    for (const hurry of [false, true]) {
      // dir 1: walking +x toward a lip at `lip`; -1: walking -x
      const edge = (x) => dir * (lip - x);
      const r = walk(sx, 215, sx + dir * 100, 215, edge, { y: Y, hurry, secs: 12 });
      res.push({ name: 'the Span: ' + name, mode: hurry ? 'hurry' : 'walk', n: 1, worst: r.end, minEdge: r.minEdge, under: r.under, reach: 0.5, at: '', onDeck: Math.abs(r.feet - Y) < 0.05 });
    }
  }
  // the crack still clears at a run, with a hop
  let cleared = null;
  for (let lead = 0.2; lead < 3.5 && cleared === null; lead += 0.2) {
    fp.controls.placeAt(c0 - 6, 215); p.pos.y = Y + p.eye; p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true; p.yaw = -Math.PI / 2; p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft');
    for (let i = 0; i < 300 && p.pos.x < c0 - lead; i++) fp.controls.update(DT);
    fp.controls.hop();
    for (let i = 0; i < 120; i++) fp.controls.update(DT);
    p.keys.clear();
    if (p.pos.x > c1 && Math.abs(p.pos.y - p.eye - Y) < 0.05) cleared = lead;
  }
  res.push({ name: 'the Span: the crack, a running hop', hop: cleared });
  // v12-H1: the crack's fallen coping: walked across along its own line, both ways, no hop, no hurry
  const CW = fp.span.crackWay;
  for (const [name, x0, x1] of [['from the west', CW.x0 - 5, CW.x1 + 4], ['from the east', CW.x1 + 5, CW.x0 - 4]]) {
    fp.controls.placeAt(x0, CW.zc(x0)); p.pos.y = Y + p.eye; p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true; p.keys.clear(); p.keys.add('KeyW');
    let low = 0;
    for (let i = 0; i < 900 && Math.abs(p.pos.x - x1) > 0.4; i++) {
      const tx = p.pos.x + Math.sign(x1 - p.pos.x) * 2;
      p.yaw = Math.atan2(-(tx - p.pos.x), -(CW.zc(tx) - p.pos.z));
      fp.controls.update(DT);
      low = Math.min(low, p.pos.y - p.eye - Y);
    }
    p.keys.clear();
    res.push({ coping: name, ok: Math.abs(p.pos.x - x1) <= 0.4, low, feet: p.pos.y - p.eye - Y });
  }
  // v14-D0: the Coffin Road. Sideways off its stair (a hurry, then a hurrying hop) at three heights, and off the road
  // on the water: the held edges keep the walker on; dropped in the water off the road, put back on it
  if (fp.coffinRoad && !fp.coffinRoad.off) {
    const CR = fp.coffinRoad, Hd = CR.head, PL = await import('/src/v14/coffin-road/plan.js');
    const side = (x, z, y, yaw, hop, secs = 2) => {
      fp.controls.placeAt(x, z, y + 0.02); p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft'); p.yaw = yaw;
      let low = 0, off = 0;
      for (let i = 0; i < secs * 60; i++) {
        fp.controls.update(DT); if (hop && i % 30 === 5) fp.controls.hop();
        const f = CR.floor(p.pos.x, p.pos.z);
        if (f === null || f === undefined) off++; else low = Math.min(low, p.pos.y - p.eye - f);
      }
      p.keys.clear();
      return { off, low, feet: p.pos.y - p.eye, at: [p.pos.x, p.pos.z] };
    };
    for (const f of [0.98, 0.85, 0.5, 0.12]) {
      const x = PL.FOOT_X + f * (Hd.xHead - PL.FOOT_X), y = CR.stairY(x);
      for (const s of [-1, 1]) for (const hop of [false, true]) {
        const r = side(x, PL.SZ, y, s > 0 ? Math.PI : 0, hop);
        res.push({ cr: `off the stair's ${s > 0 ? 'south' : 'north'} side ${Math.round(f * 100)}% up, ${hop ? 'hopping' : 'hurrying'}`, ...r });
      }
    }
    // round 2: the landing over the hole (held), and over the turf (a step down onto the turf, never into the hole)
    for (const s of [-1, 1]) for (const hop of [false, true]) {
      const r = side(Hd.xHead + 0.15, PL.SZ, Hd.yHead, s > 0 ? Math.PI : 0, hop);
      res.push({ cr: `off the landing's ${s > 0 ? 'south' : 'north'} side over the hole, ${hop ? 'hopping' : 'hurrying'}`, ...r });
      const t = side(Hd.xRim + 1.6, PL.SZ, Hd.yHead, s > 0 ? Math.PI : 0, hop);
      res.push({ turf: `off the landing's ${s > 0 ? 'south' : 'north'} side over the turf, ${hop ? 'hopping' : 'hurrying'}`, edge: NG.naveEdge(t.at[0], t.at[1]), under: t.feet - T.heightAt(t.at[0], t.at[1]), ...t });
    }
    for (const [x, s] of [[262, 1], [275, -1], [290, 1]]) for (const hop of [false, true]) {
      const r = side(x, PL.ROAD.zc, PL.ROAD_Y, s > 0 ? Math.PI : 0, hop);
      res.push({ cr: `off the road at x ${x}, ${s > 0 ? 'south' : 'north'}, ${hop ? 'hopping' : 'hurrying'}`, ...r });
    }
    // the water: dropped in beside the road, 3 m up; put back on the road
    fp.controls.placeAt(270, 37, PL.ROAD_Y + 3); p.pos.x = 270; p.pos.z = 37; p.pos.y = PL.ROAD_Y + 3 + p.eye; p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear();
    // (the fall in simulated ticks; then the page's own frames, which run the road's update that gives the walker back)
    let back = null, lowW = 0, inWater = false;
    for (let i = 0; i < 60; i++) { fp.controls.update(DT); lowW = Math.min(lowW, p.pos.y - p.eye - (PL.ROAD_Y - 2)); }
    inWater = p.onStack?.name === 'nave-water';
    const t0 = performance.now();
    while (back === null && performance.now() - t0 < 4000) {
      await new Promise((r) => setTimeout(r, 50));
      lowW = Math.min(lowW, p.pos.y - p.eye - (PL.ROAD_Y - 2));
      const f = CR.floor(p.pos.x, p.pos.z);
      if (f !== null && f !== undefined && Math.abs(p.pos.y - p.eye - f) < 0.05) back = 1 + (performance.now() - t0) / 1000;
    }
    res.push({ water: true, back, lowW, inWater, rescues: CR.state.rescues });
  }
  // v14-D2: the Pit's way up, the road's slabs pinned round its wall: sideways off them (a hurry, then a hurrying hop)
  // toward the hole and toward the wall at three heights: the held edges keep the walker on; and a walker coming at
  // the rim on the landing's line from 30 m walks out onto the landing, held on its floor
  if (fp.pit && !fp.pit.off) {
    const PS = fp.pit.stair, PF = fp.pit.floor;
    const side = (x, z, y, yaw, hop, secs = 2) => {
      fp.controls.placeAt(x, z, y + 0.02); p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft'); p.yaw = yaw;
      let low = 0, off = 0;
      for (let i = 0; i < secs * 60; i++) {
        fp.controls.update(DT); if (hop && i % 30 === 5) fp.controls.hop();
        const f = PF(p.pos.x, p.pos.z);
        if (f === null || f === undefined) off++; else low = Math.min(low, p.pos.y - p.eye - f);
      }
      p.keys.clear();
      return { off, low, feet: p.pos.y - p.eye };
    };
    for (const sv of [0.2, 0.5, 0.8]) {
      const [x, y, z] = PS.point(sv), toHole = Math.atan2(-(200 - x), -(185 - z));
      for (const [way, yaw] of [['the hole', toHole], ['the wall', toHole + Math.PI]]) for (const hop of [false, true]) {
        const r = side(x, z, y, yaw, hop);
        res.push({ ps: `off the slabs ${Math.round((1 - sv) * 100)}% up, toward ${way}, ${hop ? 'hopping' : 'hurrying'}`, ...r });
      }
    }
    const L = PS.land, sx = 200 + L.dx * 30, sz = 185 + L.dz * 30;
    fp.controls.placeAt(sx, sz); p.vel.set(0, 0, 0); p.vy = 0; p.yaw = Math.atan2(-(200 - sx), -(185 - sz)); p.keys.clear(); p.keys.add('KeyW');
    let onLand = 0, low = 0;
    for (let i = 0; i < 14 * 60; i++) { fp.controls.update(DT); if (p.onStack?.name === 'pit-stair') { onLand++; low = Math.min(low, p.pos.y - p.eye - PF(p.pos.x, p.pos.z)); } }
    p.keys.clear();
    res.push({ psLand: true, onLand, low, feet: p.pos.y - p.eye, at: [p.pos.x, p.pos.z] });
  }
  // the Sunken Court: the kerb stops the walker; a hop lands on the coping, close over the water
  for (const [name, sx, sz, edge] of [['from the south', -40, -135, (x, z) => z - pit.z1], ['from the west', -65, -165, (x, z) => pit.x0 - x]]) {
    const r = walk(sx, sz, -40, -165, edge, { secs: 8, hopAt: 360 });
    res.push({ name: 'the Sunken Court, ' + name + ' (hopping)', mode: 'hop', n: 1, worst: r.end, minEdge: r.minEdge, under: r.under, reach: 1.0, at: '', lipPos: [r.x, r.z], onKerb: r.feet > T.heightAt(r.x, r.z) + 0.3 });
  }
  return res;
});
await browser.close();
let fail = 0;
const check = (ok, name, info) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!ok) fail++; };
const f = (v) => v.toFixed(2);
for (const r of R) {
  if (r.turf) { check(r.edge > 0 && r.under > -0.15, `the Coffin Road: ${r.turf}: on the turf or the landing, never over the hole`, `${f(r.edge)} m outside the lip, feet ${f(r.under)} m over the ground`); continue; }
  if (r.cr) { check(r.off === 0 && r.low > -0.15, `the Coffin Road: ${r.cr}: held on its floor`, `${r.off} ticks off it, lowest ${f(r.low)} m under it`); continue; }
  if (r.ps) { check(r.off === 0 && r.low > -0.15, `the Pit's slabs: ${r.ps}: held on them`, `${r.off} ticks off them, lowest ${f(r.low)} m under them`); continue; }
  if (r.psLand) { check(r.onLand > 30 && r.low > -0.15, 'the Pit: a walker on the landing\'s line from 30 m walks out onto it, held on its floor', `${r.onLand} ticks on it, lowest ${f(r.low)} m under it, ended at (${f(r.at[0])}, ${f(r.at[1])}) feet ${f(r.feet)}`); continue; }
  if (r.water) { check(r.inWater && r.back !== null && r.back <= 3 && r.lowW > -0.15, 'the Coffin Road: dropped in the water off the road, put back on the road within 3 s, never under the water\'s floor', `${r.inWater ? 'in the water' : 'not in the water'}, back ${r.back === null ? 'never' : 'after ' + f(r.back) + ' s'}, ${r.rescues} rescues, lowest ${f(r.lowW)} m under the water's floor`); continue; }
  if (r.stairs) check(r.stairs.length >= 1, `${r.name} (${r.mode}): the walker whose line meets the stair's head goes down it on its floor`, `bearings ${r.stairs.join(', ') || 'none'}`);
  if (r.coping) { check(r.ok && r.low > -0.3 && Math.abs(r.feet) < 0.05, `the Span: the crack's fallen coping, ${r.coping} (walk, no hop): crosses on it to the far deck`, `${r.ok ? 'across' : 'stopped'}, lowest ${f(r.low)} m under the deck`); continue; }
  if (r.hop !== undefined) { check(r.hop !== null, `${r.name}: lands on the far deck`, r.hop === null ? 'never' : `hop ${f(r.hop)} m short of the lip`); continue; }
  const who = `${r.name} (${r.mode})`;
  check(r.worst <= r.reach, `${who}: reaches within ${r.reach} m of the lip`, `${r.n > 1 ? 'worst of ' + r.n + ' bearings, ' : ''}${f(r.worst)} m${r.at ? ' at ' + r.at : ''}`);
  check(r.minEdge >= -0.05, `${who}: never passes the lip`, `closest ${f(r.minEdge)} m`);
  check(r.under >= -0.15, `${who}: never under the floor`, `lowest ${f(r.under)} m`);
  if (r.onDeck !== undefined) check(r.onDeck, `${who}: still on the deck`);
  if (r.onKerb !== undefined) check(r.onKerb, `${who}: standing on the coping`);
}
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
process.exit(fail ? 1 : 0);
