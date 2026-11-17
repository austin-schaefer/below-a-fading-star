#!/usr/bin/env node
// Walk to the edge and look down (v10-T1, the owner's issue #15): a scripted walker comes at each hole the map keeps
// a walker back from, from outside, at a walk and at a hurry, and must
//   - reach within a stated distance of the lip (the Pit and the Foundered Nave 1.0 m, the Great Span's broken edges
//     0.5 m, the Sunken Court's coping 1.0 m after a hop onto the kerb),
//   - never pass it (the signed distance to the lip stays >= 0; on the Span the deck holds, the walker never drops),
//   - never be under the floor: feet no lower than the terrain (or the deck) less 0.15 m at any tick,
// and at the Span's crack a running hop still clears it. v14-D0, the Noon Road: a walker whose line meets the Nave's
// stair at its head goes down it, held on its floor (so that walk is not a pass of the lip, and is measured from the
// stair's floor), and at least one bearing does; hurrying and hopping sideways off the stair (high, middle, low) and
// off the road on the water keep the walker on (held edges); one dropped into the water off the road is put back on
// the road within three seconds (the page's own frames), never under the water's floor. v14-D1, the Wellward Way: off
// each of its stretches sideways, hurrying and hopping, held and the eye under the vault; into the Gulf off the bridge,
// caught and put back; no uncapped collider standing down through it. v14-D2, the Pit's slabs round its
// wall: sideways off them toward the hole and the wall at three heights, the held edges keep the walker on; a walker on
// the landing's line walks out onto it. The kerbs along z 215 still hold at the crack's lips; v12-H1 opened
// them only where a fallen coping lies across the crack 4 m in from the south parapet, and a walker on that line, at a walk
// and with no hop, crosses on it both ways and stays on stone (never more than 0.3 m under the deck). Simulated at 60 Hz
// through controls.update in one page.
// v15-F1, the owner's #60, #61, #63, guarded: in the underground's meshes every sloping member's lower end bears on
// something and no two faces of different paint overlap in one plane (tools/under-geometry.mjs); every cord on the Noon
// Road meets glass or water and every knee of the Pit's stair meets the drawn rock; walking up the treads inside the
// Nave's south door from the passage, the eye meets the treads, not the hall beyond them (risers that faced away let it
// show through every step).
// Usage: node tools/edges-test.mjs [base=http://localhost:8123]
import { ANGLE } from './launch.mjs';
import { createRequire } from 'node:module';
import { membersBear, facesApart } from './under-geometry.mjs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${ANGLE}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
      // v14-D0: on the Noon Road's stair (a held floor into the Nave) the lip is not passed and the floor is the stair's
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
  // v14-D0: the Noon Road. Sideways off its stair (a hurry, then a hurrying hop) at three heights, and off the road
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
    for (let i = 0; i < 60; i++) { fp.controls.update(DT); lowW = Math.min(lowW, p.pos.y - p.eye - (NG.NAVE.water - 1.75)); }
    inWater = p.onStack?.name === 'nave-water';
    const t0 = performance.now();
    while (back === null && performance.now() - t0 < 4000) {
      await new Promise((r) => setTimeout(r, 50));
      lowW = Math.min(lowW, p.pos.y - p.eye - (NG.NAVE.water - 1.75));
      const f = CR.floor(p.pos.x, p.pos.z);
      if (f !== null && f !== undefined && Math.abs(p.pos.y - p.eye - f) < 0.05) back = 1 + (performance.now() - t0) / 1000;
    }
    res.push({ water: true, back, lowW, inWater, rescues: CR.state.rescues });
  }
  // v14-D1: the Wellward Way (src/v14/passage.js), the passage under the moor from the Nave's south door to the Pit's
  // floor. Sideways off it (a hurry, then a hurrying hop) at points in each of its stretches, both sides: held on its
  // floor, never under it, and a hop's eye never within 0.15 m of the vault over it (the camera's near plane);
  // dropped into the Gulf off the bridge, put back on the bridge within three seconds; and no uncapped collider of
  // the moor's still stands across the way (each is given a bottom under its ground)
  if (!fp.passage || fp.passage.off) res.push({ bwOff: true, why: fp.passage ? 'off (no road in the hall to leave from, or ?passage=0)' : 'not built' });
  if (fp.passage && !fp.passage.off) {
    const PS = fp.passage, P = PS.plan, SP = P.SP, q = { i: 0, s: 0, d: 0, e: 0, t: 0 };
    // its cuts into other modules' meshes each removed something (a renamed or reshaped mesh makes one a silent no-op)
    res.push({ bwCuts: true, cuts: { ...PS.cuts }, pit: !!(fp.pit && !fp.pit.off) });
    // the door opens onto the passage: from the sill, looking down the old stair's stub at eye height, the first thing
    // hit past the stub's own walls is the passage, not the hall road's mesh (its black end or fall left standing)
    { const D = (await import('/src/v14/coffin-road/plan.js')).DOOR, TH = fp.THREE, rc = new TH.Raycaster(); let seen = [];
      for (const [dx, dy] of [[0, 1.6], [0.4, 1.0], [-0.4, 2.2]]) { rc.set(new TH.Vector3(D.x + dx, D.sill + dy, D.z + 1.0), new TH.Vector3(0, -0.05, 1).normalize()); rc.far = 30;
        const h = rc.intersectObjects(fp.scene.children, true).find((x) => x.object.visible && !/points/.test(x.object.name)); seen.push(h ? h.object.name : 'nothing'); }
      res.push({ bwDoor: true, seen }); }
    // the gatehouse from the Pit's side: a hurry at each pier's face and outer corner from 6 m out on the floor never
    // puts the walker inside a pier or behind it, nor drops them into the trench
    { const po = PS.portal, ox = -P.IN[0], oz = -P.IN[1], rx = -oz, rz = ox, M = P.M;
      const loc = (x, z) => { const dx = x - M[0], dz = z - M[1]; return [dx * ox + dz * oz, dx * rx + dz * rz]; };
      for (const lat of [-3.7, -2.7, -1.9, 1.9, 2.7, 3.7]) {
        const sa = po.f0 - 6, [sx, , sz] = po.W(sa, lat * 0.6, 0), [tx, , tz] = po.W(po.f1 + 2, lat, 0);
        fp.controls.placeAt(sx, sz); p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft');
        const f0 = p.pos.y - p.eye; let inside = 0, drop = 0, far = -Infinity;
        for (let i = 0; i < 240; i++) {
          p.yaw = Math.atan2(-(tx - p.pos.x), -(tz - p.pos.z)); fp.controls.update(DT);
          const [al, la] = loc(p.pos.x, p.pos.z), A = Math.abs(la);
          if ((al > po.f0 + 0.05 && A > po.open + 0.05 && A < po.outer + 0.3) || (al > po.f1 && A > po.open + 0.05 && A < po.outer + 3)) inside++;
          drop = Math.max(drop, f0 - (p.pos.y - p.eye)); far = Math.max(far, al);
        }
        p.keys.clear();
        res.push({ bwPier: `at the gatehouse from the Pit's floor, aimed ${lat > 0 ? 'right' : 'left'} of the door at ${Math.abs(lat)} m`, inside, drop, far });
      }
    }
    const side = (s, sgn, hop, secs = 2) => {
      const a = P.at(s), l = Math.hypot(a.tx, a.tz), rx = -a.tz / l, rz = a.tx / l;
      fp.controls.placeAt(a.x, a.z, P.yAt(s) + 0.02); p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft');
      p.yaw = Math.atan2(-rx * sgn, -rz * sgn);
      let low = 0, off = 0, head = Infinity;
      for (let i = 0; i < secs * 60; i++) {
        fp.controls.update(DT); if (hop && i % 30 === 5) fp.controls.hop();
        const f = P.floor(p.pos.x, p.pos.z);
        if (f === null || f === undefined) off++; else low = Math.min(low, p.pos.y - p.eye - f);
        P.near(p.pos.x, p.pos.z, q); head = Math.min(head, P.ceilAt(q.s, q.d) - p.pos.y);
      }
      p.keys.clear();
      return { off, low, head, feet: p.pos.y - p.eye, at: [p.pos.x, p.pos.z] };
    };
    const where = [[6, 'the Line\'s first node'], [14, 'the Line\'s slope'], [SP.LINE + 8, 'the Flute'], [SP.LINE + 22, 'the Flute, further'], [SP.SUN + 1.5, 'the Laid Sun'], [SP.NECK0 + 1.2, 'the neck'], [SP.GULF0 + 5, 'the Gulf\'s bridge'], [SP.GULF0 + 16, 'the Gulf\'s bridge, further'], [SP.GULF1 + 6, 'the Gate\'s stair'], [P.L - 3, 'the Gate by the Pit\'s door']];
    for (const [s, name] of where) for (const sgn of [-1, 1]) for (const hop of [false, true]) {
      const r = side(s, sgn, hop);
      res.push({ bw: `off ${name} (s ${s.toFixed(0)}) to the ${sgn > 0 ? 'right' : 'left'}, ${hop ? 'hopping' : 'hurrying'}`, ...r });
    }
    // the Gulf: dropped off the bridge 3 m out to the side; put back on the bridge
    { const s = SP.GULF0 + 10, a = P.at(s), l = Math.hypot(a.tx, a.tz), x = a.x - (a.tz / l) * 3, z = a.z + (a.tx / l) * 3;
      p.pos.set(x, P.yAt(s) + p.eye, z); p.onStack = null; p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear(); p.onGround = false;
      let low = 0;
      for (let i = 0; i < 150; i++) { fp.controls.update(DT); low = Math.min(low, p.pos.y - p.eye - (P.yAt(s) - 16)); }
      const caught = p.onStack?.name === 'passage-gulf';
      let back = null; const t0 = performance.now();
      while (back === null && performance.now() - t0 < 4000) {
        await new Promise((r) => setTimeout(r, 50));
        const f = P.floor(p.pos.x, p.pos.z);
        if (f !== null && f !== undefined && Math.abs(p.pos.y - p.eye - f) < 0.1 && p.onStack?.name === 'passage') back = 1 + (performance.now() - t0) / 1000;
      }
      res.push({ gulf: true, caught, back, low, rescues: PS.state.rescues });
    }
    // the moor's uncapped colliders over the way: none left standing down through it
    { let n = 0; const left = [];
      for (const c of fp.controls.state.colliders) {
        if (c.y !== undefined || c.x1 !== undefined) continue;
        P.near(c.x, c.z, q); if (q.e < P.walkHalf(q.s) + c.r + 0.3 && q.s > 0.5 && q.s < P.L - 0.1) { n++; left.push([+c.x.toFixed(1), +c.z.toFixed(1)]); }
      }
      res.push({ cols: true, n, left: left.slice(0, 4), capped: PS.cuts.colliders });
    }
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
    // near the foot, where the slabs come down onto the bowl (v14-D2 round 2: they lay a metre inside it): off them
    // either way the walker is on the slabs or on the floor, never under either
    const PB = fp.pit.bowl;
    for (const sv of [0.9, 0.95, 0.99]) {
      const [x, y, z] = PS.point(sv), toHole = Math.atan2(-(200 - x), -(185 - z));
      for (const [way, yaw] of [['the hole', toHole], ['the wall', toHole + Math.PI], ['down', toHole + Math.PI / 2]]) {
        fp.controls.placeAt(x, z, y + 0.02); p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft'); p.yaw = yaw;
        let low = 0;
        for (let i = 0; i < 120; i++) { fp.controls.update(DT); const feet = p.pos.y - p.eye, sf = PF(p.pos.x, p.pos.z); const f = Math.max(sf !== null && sf !== undefined && sf <= feet + 0.6 ? sf : -Infinity, PB(p.pos.x, p.pos.z) ?? T.heightAt(p.pos.x, p.pos.z)); low = Math.min(low, feet - f); } // (the slabs' floor counts where it could hold the feet: the landing 26 m overhead does not)
        p.keys.clear();
        res.push({ psFoot: `${Math.round((1 - sv) * 100)}% up, toward ${way}`, low });
      }
    }
    // no tread's top under the floor beside it
    let worst = Infinity, at = 0;
    for (let i = 0; i <= 400; i++) { const sv = i / 400, d = PS.at(sv).y - PS.under(sv); if (d < worst) { worst = d; at = sv; } }
    res.push({ psTread: true, worst, at });
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
// v15-F1: the underground's geometry (tools/under-geometry.mjs) and the door's treads seen from below
const UNDER = '^(pit-floor|passage-|coffin-road|garth-)';
const UG = { bear: await page.evaluate(membersBear, UNDER), apart: await page.evaluate(facesApart, UNDER) };
UG.stats = await page.evaluate(async () => {
  const fp = window.__fp, THREE = await import('three'), out = {};
  if (fp.coffinRoad && !fp.coffinRoad.off) {
    out.ties = fp.coffinRoad.stats();
    const CR = await import('/src/v14/coffin-road/plan.js'), D = CR.DOOR, eye = [D.x, D.sill - D.rise * D.treads + 1.6, D.floorTo + D.treads * D.tread + 1.2];
    const meshes = []; fp.scene.traverse((o) => { if (o.isMesh && o.visible && !o.isInstancedMesh && /^(coffin-road|noon-road-glass|passage-|nave)/.test(o.name)) meshes.push(o); });
    const rc = new THREE.Raycaster(); out.door = [];
    for (let i = 0; i < D.treads; i++) for (const dx of [-0.5, 0, 0.5]) {
      const za = D.floorTo + i * D.tread, yt = D.sill - (i + 1) * D.rise + D.rise * 0.5, d = new THREE.Vector3(D.x + dx - eye[0], yt - eye[1], za + 0.01 - eye[2]).normalize();
      rc.set(new THREE.Vector3(...eye), d); rc.far = 6;
      const h = rc.intersectObjects(meshes, false)[0]; out.door.push(h ? `${h.object.name}@${h.distance.toFixed(2)}` : 'nothing');
    }
  }
  if (fp.pit && !fp.pit.off) out.pit = fp.pit.stats();
  return out;
});
await browser.close();
let fail = 0;
const check = (ok, name, info) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!ok) fail++; };
const f = (v) => v.toFixed(2);
for (const r of R) {
  if (r.turf) { check(r.edge > 0 && r.under > -0.15, `the Noon Road: ${r.turf}: on the turf or the landing, never over the hole`, `${f(r.edge)} m outside the lip, feet ${f(r.under)} m over the ground`); continue; }
  if (r.cr) { check(r.off === 0 && r.low > -0.15, `the Noon Road: ${r.cr}: held on its floor`, `${r.off} ticks off it, lowest ${f(r.low)} m under it`); continue; }
  if (r.bwOff) { check(false, 'the Wellward Way is built (its edges rows run)', r.why); continue; }
  if (r.bwCuts) { const need = ['fall', 'throat'].concat(r.pit ? ['pitRock'] : []); check(need.every((k) => r.cuts[k] > 0), 'the Wellward Way: each of its cuts into another module\'s mesh removed something', need.map((k) => `${k} ${r.cuts[k]}`).join(', ') + `; terrain ${r.cuts.terrain} (may be 0), colliders ${r.cuts.colliders}`); continue; }
  if (r.bwDoor) { check(r.seen.every((n) => /^passage/.test(n)), 'the Wellward Way: from the Nave\'s south door the eye sees down into the passage, not a wall', r.seen.join(', ')); continue; }
  if (r.bwPier) { check(r.inside === 0 && r.drop < 1, `the Wellward Way: ${r.bwPier}: never inside or behind a pier, never dropped`, `${r.inside} ticks inside, dropped ${f(r.drop)} m, got to ${f(r.far)} m along`); continue; }
  if (r.bw) { check(r.off === 0 && r.low > -0.15 && r.head > 0.15, `the Wellward Way: ${r.bw}: held on its floor, the eye under the vault`, `${r.off} ticks off it, lowest ${f(r.low)} m under it, the vault ${f(r.head)} m over the eye at the closest`); continue; }
  if (r.gulf) { check(r.caught && r.back !== null && r.back <= 3 && r.low > -0.15, 'the Wellward Way: dropped into the Gulf off the bridge, caught and put back on the bridge within 3 s', `${r.caught ? 'caught' : 'not caught'}, back ${r.back === null ? 'never' : 'after ' + f(r.back) + ' s'}, ${r.rescues} rescues, lowest ${f(r.low)} m under the catch`); continue; }
  if (r.cols) { check(r.n === 0, 'the Wellward Way: no uncapped collider of the moor\'s stands down through the way', `${r.capped} given a bottom; ${r.n} left${r.left.length ? ' at ' + r.left.map((a) => a.join(', ')).join('; ') : ''}`); continue; }
  if (r.water) { check(r.inWater && r.back !== null && r.back <= 3 && r.lowW > -0.15, 'the Noon Road: dropped in the water off the road, put back on the road within 3 s, never under the water\'s floor', `${r.inWater ? 'in the water' : 'not in the water'}, back ${r.back === null ? 'never' : 'after ' + f(r.back) + ' s'}, ${r.rescues} rescues, lowest ${f(r.lowW)} m under the water's floor`); continue; }
  if (r.ps) { check(r.off === 0 && r.low > -0.15, `the Pit's slabs: ${r.ps}: held on them`, `${r.off} ticks off them, lowest ${f(r.low)} m under them`); continue; }
  if (r.psFoot) { check(r.low > -0.15, `the Pit's slabs near the foot, ${r.psFoot}: never under the slabs or the floor`, `lowest ${f(r.low)} m`); continue; }
  if (r.psTread) { check(r.worst > -0.02, 'the Pit\'s slabs: no tread\'s top under the floor beside it', `least ${f(r.worst)} m over it at s ${f(r.at)}`); continue; }
  if (r.psLand) { check(r.onLand > 30 && r.low > -0.15, 'the Pit: a walker on the landing\'s line from 30 m walks out onto it, held on its floor', `${r.onLand} ticks on it, lowest ${f(r.low)} m under it, ended at (${f(r.at[0])}, ${f(r.at[1])}) feet ${f(r.feet)}`); continue; }
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
{
  const B = UG.bear, A = UG.apart, S = UG.stats;
  check(B.ends > 100 && B.floating.length === 0, 'the underground: every sloping member\'s lower end bears on something (no strut, knee, leg or bracket in the air)', `${B.ends} members, ${B.faces} faces near them; ${B.floating.length} in the air${B.floating.length ? ': ' + B.floating.slice(0, 4).join('; ') : ''}`);
  const np = A.pairs.reduce((a, p) => a + p.n, 0);
  check(A.faces > 1000 && np === 0, 'the underground: no two faces of different paint overlap in one plane (nothing flickers)', `${A.faces} faces in ${A.meshes} meshes; ${np} pairs${np ? ': ' + A.pairs.slice(0, 4).map((p) => `${p.k} ${p.n} at ${p.at.join(' | ')}`).join('; ') : ''}`);
  if (S.ties) check(S.ties.ties > 20 && S.ties.loose === 0, 'the Noon Road: every cord the Late folk tied down meets glass or water', `${S.ties.ties} cords, ${S.ties.loose} loose`);
  if (S.pit) check(S.pit.loose === 0, 'the Pit: every knee under the slabs meets the drawn rock', `${S.pit.loose} without`);
  if (S.door) check(S.door.length > 0 && S.door.every((h) => /^coffin-road@/.test(h) && parseFloat(h.split('@')[1]) < 4), 'the Noon Road: from the passage, walking up to the south door, the eye meets its treads, not the hall through them', S.door.join(', '));
}
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
process.exit(fail ? 1 : 0);
