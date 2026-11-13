#!/usr/bin/env node
// Functional smoke test: load the scene headlessly, simulate walking, check movement, boundaries,
// colliders, landmark HUD and that no errors fire. Usage: node tools/walk-test.mjs [url]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const url = process.argv[2] || 'http://localhost:8123/?q=low';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 120000 });
const results = await page.evaluate(async () => {
  const fp = window.__fp, out = {};
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const p = fp.player;
  const start = { x: p.pos.x, z: p.pos.z };
  // walk west for 10 simulated seconds
  p.yaw = Math.PI / 2; p.keys.add('KeyW');
  for (let i = 0; i < 200; i++) fp.controls.update(0.05);
  out.walked = Math.hypot(p.pos.x - start.x, p.pos.z - start.z);
  out.onGround = p.onGround;
  out.feetAboveGround = p.pos.y - p.eye - fp.terrain.heightAt(p.pos.x, p.pos.z);
  // run at the region boundary: should stop near regionRadius + 48
  p.pos.set(-330, fp.terrain.heightAt(-330, 0) + p.eye, 0); p.yaw = Math.PI / 2; p.keys.add('ShiftLeft');
  for (let i = 0; i < 400; i++) fp.controls.update(0.05);
  out.boundaryRadius = Math.hypot(p.pos.x, p.pos.z);
  // the saddle's wedge (v4): walking toward the sun along the road's line reaches the road's start, r 366
  p.pos.set(-300, fp.terrain.heightAt(-300, 109) + p.eye, 109); p.yaw = 1.92; p.vel.set(0, 0, 0);
  for (let i = 0; i < 400; i++) fp.controls.update(0.05);
  out.saddleRadius = Math.hypot(p.pos.x, p.pos.z);
  p.keys.delete('ShiftLeft');
  // colliders: walk into a test collider
  fp.addCollider({ x: -100, z: 0, r: 2 });
  p.pos.set(-90, fp.terrain.heightAt(-90, 0) + p.eye, 0); p.yaw = Math.PI / 2; p.vel.set(0, 0, 0);
  for (let i = 0; i < 200; i++) fp.controls.update(0.05);
  out.colliderStop = Math.hypot(p.pos.x + 100, p.pos.z);
  p.keys.clear();
  // HUD landmark detection
  p.pos.set(-170, fp.terrain.heightAt(-170, -50) + p.eye, -50);
  fp.controls.update(0.016); fp.hud.update(0.016, 0);
  out.placeShown = document.getElementById('place').classList.contains('shown');
  out.placeName = document.getElementById('place-name').textContent;
  // the Great Span (v4): climb the west stair to the deck by its switchbacks, then walk east along the deck
  const feet = () => p.pos.y - p.eye;
  const walkTo = (pts, hurry, maxTicks = 4000) => {
    p.keys.clear(); p.keys.add('KeyW'); if (hurry) p.keys.add('ShiftLeft');
    let i = 0, t = 0;
    for (; t < maxTicks && i < pts.length; t++) {
      const [tx, tz] = pts[i], dx = tx - p.pos.x, dz = tz - p.pos.z;
      if (Math.hypot(dx, dz) < 0.7) { i++; continue; }
      p.yaw = Math.atan2(-dx, -dz);
      fp.controls.update(0.05);
    }
    p.keys.clear();
    return i === pts.length;
  };
  if (fp.span) {
    const S = fp.span.stairs.west;
    fp.controls.placeAt(S.foot.x + 3, S.foot.z); p.vel.set(0, 0, 0);
    const route = [[-205, 200], [-236, 200], [-239.5, 197], [-239.5, 193], [-236, 193], [-208, 193], [-204.5, 190], [-204.5, 186], [-208, 186], [-243, 186], [-246.5, 186], [-246.5, 207], [-246.5, 212], [-200, 213]];
    out.stairDone = walkTo(route, false);
    out.stairEnd = { x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), feet: +feet().toFixed(2), deck: fp.span.deckAt(p.pos.x, p.pos.z) };
    // the crack at x -45: a running hop at its lip clears it; walking on without one is stopped at the lip (v10-T1, #15: a kerb 0.3 m short of the edge)
    const crack = fp.span.plan.crack, lip = crack.x - crack.w / 2;
    const jump = (hop) => {
      p.pos.set(lip - 9, 56 + p.eye, 215); p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true; p.yaw = -Math.PI / 2;
      p.keys.clear(); p.keys.add('KeyW'); if (hop) p.keys.add('ShiftLeft');
      let hopped = false;
      for (let t = 0; t < 160; t++) {
        if (hop && !hopped && p.pos.x > lip - 0.45) hopped = fp.controls.hop();
        fp.controls.update(0.05);
      }
      p.keys.clear();
      return { x: +p.pos.x.toFixed(1), feet: +feet().toFixed(2), hopped };
    };
    out.crackRun = jump(true);
    out.crackWalk = jump(false);
    // the deck's west half, from the fallen bay's lip past the west stair's top to the gate, along three lines:
    // a step whose movement the colliders cut short is a block (each logged with the collider and its module)
    const C = p.colliders, westEnd = fp.span.plan.decks[0][1] - 1;
    out.deckWest = { blocks: [], reached: 0 };
    for (const z of [209, 215, 221]) {
      p.pos.set(westEnd, 56 + p.eye, z); p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true; p.yaw = Math.PI / 2;
      p.keys.clear(); p.keys.add('KeyW');
      for (let t = 0; t < 1200 && p.pos.x > -253; t++) {
        const bx = p.pos.x, bz = p.pos.z, f0 = feet();
        fp.controls.update(0.05);
        const ix = bx + p.vel.x * 0.05, iz = bz + p.vel.z * 0.05;
        if (Math.hypot(p.pos.x - ix, p.pos.z - iz) > 1e-3) {
          const c = C.find((c) => Math.hypot(ix - c.x, iz - c.z) < c.r + 0.45 && !(c.h !== undefined && (f0 > c.y + c.h || f0 < c.y - 0.5)));
          out.deckWest.blocks.push({ x: +bx.toFixed(1), z, by: c ? `${c.mod} (${c.x.toFixed(1)}, ${c.z.toFixed(1)}) r ${c.r.toFixed(2)}` : '?' });
        }
      }
      p.keys.clear();
      if (p.pos.x <= -253 && Math.abs(feet() - 56) < 0.3) out.deckWest.reached++;
    }
  }
  if (fp.span) {
    // v12-H1: the whole crossing on the keys, gate to gate: the west stair up, the three fallen bays on their thin ways and the
    // crack at x -45 on its fallen coping (walked, never a hop, never Shift: what a touch stick can do), the east stair down to
    // its foot. Nothing is teleported after the first placeAt.
    const S = fp.span.stairs.west, plan = fp.span.plan;
    fp.controls.placeAt(S.foot.x + 3, S.foot.z); p.vel.set(0, 0, 0); p.vy = 0;
    const walk = (pts, o = {}) => {
      p.keys.clear(); p.keys.add('KeyW'); if (o.run) p.keys.add('ShiftLeft');
      let i = 0, ticks = 0, hopped = false;
      for (; i < pts.length && ticks < 6000; ticks++) {
        const [tx, tz] = pts[i], dx = tx - p.pos.x, dz = tz - p.pos.z;
        if (Math.hypot(dx, dz) < 0.6) { i++; continue; }
        p.yaw = Math.atan2(-dx, -dz);
        if (o.hopX !== undefined && !hopped && p.pos.x > o.hopX) hopped = fp.controls.hop();
        const f0 = p.pos.y - p.eye; fp.controls.update(0.05);
        if (o.log) o.log(f0, hopped);
      }
      p.keys.clear();
      return i === pts.length;
    };
    const route = [[-205, 200], [-236, 200], [-239.5, 197], [-239.5, 193], [-236, 193], [-208, 193], [-204.5, 190], [-204.5, 186], [-208, 186], [-243, 186], [-246.5, 186], [-246.5, 207], [-246.5, 212], [-200, 213]];
    const cr = { stairUp: walk(route), bays: [], minFeet: 99, maxStep: 0, crackWalked: false };
    const hold = { x: p.pos.x };
    let lastFeet = null;
    const track = (f0, hopped) => { if (hopped) return; const f = p.pos.y - p.eye; if (f < cr.minFeet) cr.minFeet = f; if (lastFeet !== null) cr.maxStep = Math.max(cr.maxStep, f - lastFeet); lastFeet = f; };
    // each bay: along the deck to its way, along the way's own line to the far deck end, a few strides on
    const ways = fp.span.vestiges;
    const wayPts = (v) => { const o = [[v.a - 6, v.zc(v.a)]]; for (let x = v.a; x <= v.b; x += 2) o.push([x, v.zc(x)]); o.push([v.b, v.zc(v.b)], [v.b + 5, v.zc(v.b)]); return o; };
    const approach = (v) => [[v.a - 12, v.zc(v.a)]];
    cr.bays.push(walk([[-125, 213], ...approach(ways[0]), ...wayPts(ways[0])], { log: track }));
    const lip = plan.crack.x - plan.crack.w / 2, C = fp.span.crackWay;
    const crackPts = [[C.x0 - 6, C.zc(C.x0)]]; for (let x = C.x0; x <= C.x1; x += 1) crackPts.push([x, C.zc(x)]); crackPts.push([C.x1 + 3, C.zc(C.x1)]);
    cr.crackWalked = walk(crackPts, { log: track }) && p.pos.x > lip + 3 && Math.abs(p.pos.y - p.eye - 56) < 0.05;
    cr.bays.push(walk([[-10, 215], [ways[1].a - 12, ways[1].zc(ways[1].a)], ...wayPts(ways[1])], { log: track }));
    cr.bays.push(walk([[ways[1].b + 12, 215], ...approach(ways[2]), ...wayPts(ways[2])], { log: track }));
    cr.farDeck = { x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), feet: +(p.pos.y - p.eye).toFixed(2) };
    cr.eastDown = walk([[200, 214], [243, 213], [243, 209], [239, 206], [239, 201], [239, 170], [235, 165], [232, 166], [232, 198], [228, 202], [225, 200], [225, 167], [225, 161]]);
    const E = fp.span.stairs.east.foot;
    cr.end = { x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), feet: +(p.pos.y - p.eye).toFixed(2), ground: +fp.terrain.heightAt(p.pos.x, p.pos.z).toFixed(2), foot: E };
    out.crossing = cr;
    // the fall: from the middle of each way, one step off its side; where the walker lands
    out.falls = ways.map((v) => {
      const xm = (v.a + v.b) / 2, zc = v.zc(xm);
      p.pos.set(xm, v.y(xm) + p.eye, zc); p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true;
      p.yaw = Math.PI; p.keys.clear(); p.keys.add('KeyW'); // forward is +z: off the south side (the north side, for the river's)
      if (v.name === 'river') p.yaw = 0;
      let airTicks = 0, ticks = 0;
      for (; ticks < 400; ticks++) { fp.controls.update(0.05); if (!p.onGround) airTicks++; if (p.onGround && airTicks > 5) break; }
      p.keys.clear();
      for (let t = 0; t < 20; t++) fp.controls.update(0.05);
      const g = fp.terrain.heightAt(p.pos.x, p.pos.z), land = { x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), feet: +(p.pos.y - p.eye).toFixed(2), ground: +g.toFixed(2) };
      // then walk back toward the stairs' side (north-west of the Span, toward the bowl's middle): off whatever caught them, to the ground
      p.yaw = Math.atan2(-(0 - p.pos.x), -(100 - p.pos.z)); p.keys.add('KeyW');
      for (let t = 0; t < 300; t++) fp.controls.update(0.05);
      p.keys.clear();
      return { way: v.name, land, airTicks, r: +Math.hypot(p.pos.x, p.pos.z).toFixed(0), onGround: p.onGround, finite: Number.isFinite(p.pos.y), after: { x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), off: +(p.pos.y - p.eye - fp.terrain.heightAt(p.pos.x, p.pos.z)).toFixed(2) } };
    });
  }
  if (fp.span) {
    // v12-H1: the feet and the eye agree on each way: a ray down just inside the walkable's edge (hw - 0.08) meets drawn
    // stone or metal within 0.12 m of the walkable's height, and one just outside it (hw + 0.1) meets nothing within
    // 0.4 m of it. Samples a metre in from each lip (the west way's stride of air and the strut's stub excepted).
    const THREE = fp.THREE, rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3();
    const ms = fp.span.meshes.filter((m) => m.isMesh); for (const m of ms) m.updateMatrixWorld();
    const hitY = (x, z, y0) => { o.set(x, y0 + 3, z); rc.set(o, down); rc.far = 6; const h = rc.intersectObjects(ms, false)[0]; return h ? h.point.y : null; };
    const VP = await import('/src/v4/span/vestige-plan.js'), fs = VP.fenSlabs();
    const inSlot = (x) => { for (let i = 0; i < fs.n - 1; i++) { const e = fs.xc(i) + fs.len / 2; if (x > e - 0.05 && x < e + VP.FEN_GAP + 0.05) return true; } return false; };
    out.agree = [...fp.span.vestiges, fp.span.crackWay].map((v) => {
      let n = 0, inOk = 0, outBad = 0; const worst = [];
      for (let x = v.a + 1; x <= v.b - 1; x += (v.b - v.a - 2) / 23) {
        if (v.name === 'west' && Math.abs(x + 100) < 0.7) continue;
        if (v.name === 'river' && Math.abs(x - 145.55) < 1.2) continue;
        if (v.name === 'fen' && inSlot(x)) continue;
        if (v.name === 'crack' && Math.abs(x - fp.span.plan.crack.x) < 0.15) continue; // where it broke in two
        const y = v.y(x), zc = v.zc(x);
        for (const s of [-1, 1]) {
          n++;
          const hi = hitY(x, zc + s * (v.hw - 0.08), y);
          if (hi !== null && Math.abs(hi - y) <= 0.12) inOk++; else worst.push({ x: +x.toFixed(1), s, in: hi === null ? null : +(hi - y).toFixed(2) });
          const ho = hitY(x, zc + s * (v.hw + 0.1), y);
          if (ho !== null && ho > y - 0.4) { outBad++; worst.push({ x: +x.toFixed(1), s, out: +(ho - y).toFixed(2) }); }
        }
      }
      return { way: v.name, n, inOk, outBad, worst: worst.slice(0, 6) };
    });
  }
  out.colliders = fp.controls.state.colliders.length;
  out.calls = fp.renderer.info.render.calls; out.tris = fp.renderer.info.render.triangles;
  return out;
});
await page.waitForTimeout(1500);
await browser.close();
const checks = [
  ['walked 32-40m in 10s (3.6 m/s)', results.walked > 32 && results.walked < 40],
  ['stays on the ground', results.onGround && Math.abs(results.feetAboveGround) < 0.05],
  ['boundary holds (< 352m)', results.boundaryRadius < 352],
  ['the saddle lets you out to the road start (364-376m)', results.saddleRadius > 364 && results.saddleRadius < 376],
  ['collider stops the player (~2.45m)', results.colliderStop > 2.3 && results.colliderStop < 2.7],
  ['landmark card shows at the stones', results.placeShown && /Cardinal/.test(results.placeName)],
  ['the west stair climbs to the Span\'s deck (y 56) and the deck walks east', !!results.stairDone && Math.abs(results.stairEnd.feet - 56) < 0.3 && results.stairEnd.x > -202],
  ['the crack: a running hop clears it, a walk stops at the lip', !!results.crackRun && results.crackRun.hopped && results.crackRun.x > -40 && Math.abs(results.crackRun.feet - 56) < 0.3 && Math.abs(results.crackWalk.feet - 56) < 0.3 && results.crackWalk.x < -46 && results.crackWalk.x > -47.6],
  ['the deck\'s west half walks to the west gate without a block (3 lines)', !!results.deckWest && results.deckWest.reached === 3 && results.deckWest.blocks.length === 0],
  ['the whole Span on the keys, walking (no hop, no Shift): stair up, the three bays on their thin ways, the crack on its fallen coping, the east stair down to its foot', !!results.crossing && results.crossing.stairUp && results.crossing.bays.every(Boolean) && results.crossing.crackWalked && results.crossing.eastDown && results.crossing.minFeet > 52.5 && results.crossing.maxStep < 0.13 && Math.hypot(results.crossing.end.x - results.crossing.end.foot.x, results.crossing.end.z - results.crossing.end.foot.z) < 5 && Math.abs(results.crossing.end.feet - results.crossing.end.ground) < 0.3],
  ['a step off each way falls to what is below, and a walk from there reaches the ground, in the bowl', !!results.falls && results.falls.length === 3 && results.falls.every((f) => f.airTicks > 15 && f.onGround && f.finite && f.r < 352 && f.land.feet > -8 && Math.abs(f.after.off) < 0.3)],
  ['the feet and the eye agree on each way (the drawn top within 0.1 m of the walkable\'s edge, 90% of samples either side; the fen way\'s slots between its stones and the stride of air on the west way are not sampled)', !!results.agree && results.agree.length === 4 && results.agree.every((a) => a.inOk >= 0.9 * a.n && a.outBad <= 0.1 * a.n)],
  ['no page errors', errors.length === 0],
];
let fail = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
console.log(JSON.stringify(results));
if (errors.length) console.log(errors.join('\n'));
process.exit(fail ? 1 : 0);
