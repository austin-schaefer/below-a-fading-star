#!/usr/bin/env node
// The Lappet's ways as one system (v15-W1, the owner's "walls right next to stairs, stairs and ladders right by each
// other, dead-ends"). Every registered ascent in the village (ctx.ascents, inside the box x 40..130, z -75..40) is read
// from the live page with every module built, and each end of it (its mouth: the last point of the path's first level
// run, and the first of its last) is checked:
//   mouth     no collider that is not the way's own stands within 0.8 m of the mouth's middle (0.4 m out from the
//             last tread, along the way) at the walker's height (its bottom under the head, its top more than a step
//             over the feet): a mouth is 1.6 m clear. The way's own, or its flank: a capsule that lies along the way
//             (within 25 degrees of it) and is either not out in front of the mouth (its cheek, its rail, its ladder's
//             pole) or beside the mouth's line with a walker's half-width between (a house stair's own front wall).
//   landing   from the way's last tread (found back from the mouth toward the way) outward toward where the path leaves it (its first or last point), 1.2 m of floor within 0.3 m of the end's level
//             (on open ground, a slope of 1 in 3 more), nothing standing
//             in a walker's half-width (0.45 m) of that line: room to step off and turn.
//   doubled   no two ways join the same two levels (each end's level within 0.4 m) with both their ends within 6 m of
//             each other's: one of the two is the better, and the other has another job or goes.
//   dead end  from each end, the level is flooded on a 0.4 m grid (the floor the walker's feet find there, within a
//             0.3 m step of the last cell, and no collider at the walker's height within its radius + 0.3 m), up to
//             1,600 cells; the way's own line is not entered. An end whose flood runs out before that without meeting
//             another way's end or a place (a plot's front, a square, a fixture, the crown's and the Rungs' named
//             places, an act) is a dead end.
//   turn      (v15-W4: the owner's "walls blocking people from getting from stairs to their own door") from each end,
//             in each of 16 directions where the level runs on (floor at the end's level all the way 2.4 m out, not a
//             house's room, not under a deck, not back down the way) a body reaches 2 m out, every collider counted,
//             the way's own walls, parapets and newels too, and everything drawn knee to chest high (a parapet with no
//             collider is a wall to the eye: the owner's were)
//   door      every door a house record gives: its step is reached on foot from each way's end on its level within
//             8 m, by a walk no longer than twice the straight line and 3 m; a door with no way within 8 m is not shut
//             in a pocket
//   headroom  up each way's line every 0.25 m, a ray from 0.6 m over the floor to 2.1 m meets no drawn mesh (W1's
//             row read the colliders, and a footbridge across the Gullet's head passed it)
//   spine     the plan's SPINE (the one main way, keep's end to the house): joined, lit, 1.5 m wide on its levels
// Prints the table of ways (id, its two ends, the levels it joins, the module that built it) and one PASS/FAIL line per
// way per row. WAYS_JSON=path writes the table and the findings as JSON.
// Ladders (v15-W2): every ladder drawn anywhere is in ctx.ladders, climbable with its ascent or scenery with a reason;
// every file under src/ that speaks of a ladder registers one or is listed (NO_LADDER) as drawing none.
//   node tools/ways-test.mjs [base=http://localhost:8123]
import fs from 'node:fs';
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
await page.goto(`${base}/?q=low&music=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const r = await page.evaluate(async () => {
  const fp = window.__fp, P = await import('/src/v15/plan.js'), C = fp.controls, cols = C.state.colliders;
  if (!C.floorAt) return { missing: 'controls.floorAt' };
  const inBox = (x, z) => x > 40 && x < 130 && z > -75 && z < 40;
  const ways = fp.ascents.list.filter((a) => !a.test && a.path.every((p) => inBox(p[0], p[1])) && a.path.every((p) => p.length > 2));
  const v = (a, b) => [b[0] - a[0], b[1] - a[1]], nrm = (d) => { const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };
  // each end: { at: [x, z, y] the mouth, dir: outward unit, y }
  const endsOf = (path) => {
    const n = path.length, y0 = path[0][2], y1 = path[n - 1][2];
    let i = 0; while (i < n - 1 && Math.abs(path[i + 1][2] - y0) < 0.05) i++;
    let j = n - 1; while (j > 0 && Math.abs(path[j - 1][2] - y1) < 0.05) j--;
    if (i >= j) { i = Math.min(1, n - 2); j = Math.max(n - 2, 1); } // level all the way (a bridge, a crossing)
    // outward: toward where the path leaves the way (its first or last point), along the line it was going if that is the point itself
    const far = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.3;
    const dA = i > 0 && far(path[i], path[0]) ? nrm(v(path[i], path[0])) : nrm(v(path[1], path[0]));
    const dB = j < n - 1 && far(path[j], path[n - 1]) ? nrm(v(path[j], path[n - 1])) : nrm(v(path[n - 2], path[n - 1]));
    return [{ at: path[i], dir: dA, y: path[i][2], k: i }, { at: path[j], dir: dB, y: path[j][2], k: j }];
  };
  // a collider's nearest point to (x, z), its distance to the surface, and whether it stands at feet y
  const near = (c, x, z) => {
    if (c.len === undefined) { const d = Math.hypot(x - c.x, z - c.z); return { px: c.x, pz: c.z, d: d - c.r, t: 0 }; }
    let t = (x - c.x1) * c.ux + (z - c.z1) * c.uz; t = Math.max(0, Math.min(c.len, t));
    const px = c.x1 + c.ux * t, pz = c.z1 + c.uz * t; return { px, pz, d: Math.hypot(x - px, z - pz) - c.r, t };
  };
  const stands = (c, feet, t = 0) => { if (c.h === undefined) return true; const top = c.y + c.h + (c.len ? (c.dh || 0) * t / c.len : 0); return c.y < feet + 1.7 && top > feet + 0.35; };
  // the way's own, or a flank: a wall along the way (within 25 degrees of it) that is either behind the mouth (a cheek, a
  // rail, a ladder's pole) or beside its line with a walker's half-width (0.4 m) between them (a house stair's own front)
  const own = (c, e, pt) => {
    if (c.len === undefined) return false;
    if (Math.abs(c.ux * e.dir[0] + c.uz * e.dir[1]) < 0.906) return false;
    const ax = pt.px - e.at[0], az = pt.pz - e.at[1];
    return ax * e.dir[0] + az * e.dir[1] < 0.15 || Math.abs(ax * e.dir[1] - az * e.dir[0]) - c.r >= 0.4;
  };
  const desc = (c) => `${c.mod || '?'}${c.len !== undefined ? ' wall' : ' post'} at (${c.x.toFixed(1)}, ${c.z.toFixed(1)})${c.h !== undefined ? ` y ${c.y.toFixed(1)}..${(c.y + c.h).toFixed(1)}` : ''}`;
  const table = [], find = [];
  const all = ways.map((w) => ({ w, ends: endsOf(w.path) }));
  // the places a dead end may arrive at
  const places = [];
  for (const p of P.PLOTS) { const [fx, fz] = p.face; places.push([p.x + fx * p.d / 2, p.z + fz * p.d / 2, p.y, p.name]); }
  for (const f of P.FIXTURES) places.push([f.x, f.z, f.y, f.name]);
  for (const s of P.SQUARES) for (const q of s.pts) places.push([q[0], q[1], P.LEVEL[s.level].y, s.name]);
  for (const k of ['kiln', 'hand', 'shears', 'split', 'stage']) { const q = P.QUARRELS[k]; if (q) places.push([q.x, q.z, q.y ?? P.LEVEL.crown.y, `quarrels ${k}`]); }
  for (const h of fp.acts?.list || []) { const a = h.def || h; if (a.at) places.push([a.at.x, a.at.z, a.at.y - 1, `act ${a.id}`]); }
  // the dead-end flood
  const G = 0.4, CAP = 1600;
  function flood(e, self) {
    const seen = new Map(), q = [[0, 0, e.y]], key = (i, j) => i * 100000 + j;
    const sx = e.at[0] + e.dir[0] * 0.5, sz = e.at[1] + e.dir[1] * 0.5;
    seen.set(key(0, 0), e.y);
    const onSelf = (x, z) => { const p = self.path; for (let k = 0; k < p.length - 1; k++) { const a = p[k], b = p[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 0.7 && Math.abs(a[2] + (b[2] - a[2]) * t - e.y) > 0.2) return true; } return false; };
    const blocked = (x, z, feet) => { for (const c of cols) { if (Math.abs(c.x - x) > 12 || Math.abs(c.z - z) > 12) continue; const pt = near(c, x, z); if (pt.d < 0.3 && stands(c, feet, pt.t)) return true; } return false; };
    let hit = null;
    while (q.length && seen.size < CAP) {
      const [i, j, y] = q.shift(), x = sx + i * G, z = sz + j * G;
      for (const o of all) if (o.w !== self) for (const oe of o.ends) if (Math.abs(oe.y - y) < 0.6 && Math.hypot(oe.at[0] - x, oe.at[1] - z) < 1.2) { hit = `way ${o.w.id}`; break; }
      if (hit) break;
      for (const p of places) if (Math.abs(p[2] - y) < 1.2 && Math.hypot(p[0] - x, p[1] - z) < 1.5) { hit = `place ${p[3]}`; break; }
      if (hit) break;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj, k = key(ni, nj); if (seen.has(k)) continue;
        const nx = sx + ni * G, nz = sz + nj * G;
        if (!P.levelAt(nx, nz) && !inBox(nx, nz)) continue;
        const f = C.floorAt(nx, nz, y); if (Math.abs(f.y - y) > 0.3) continue;
        if (onSelf(nx, nz) || blocked(nx, nz, f.y)) continue;
        seen.set(k, f.y); q.push([ni, nj, f.y]);
      }
    }
    return { cells: seen.size, hit, open: seen.size >= CAP };
  }
  for (const { w, ends } of all) {
    const lv = (y) => (P.LEVELS.find((l) => Math.abs(l.y - y) < 0.35)?.key || `y ${y.toFixed(1)}`);
    table.push({ id: w.id, ends: ends.map((e) => [+e.at[0].toFixed(1), +e.at[1].toFixed(1), +e.y.toFixed(1)]), levels: ends.map((e) => lv(e.y)) });
    ends.forEach((e, ei) => {
      const tag = `${w.id} ${ei ? 'top' : 'foot'}`;
      // a perch (v15-W2): a ladder's head onto a place to stand that is the end of the way (a scaffold's stage, a ledge
      // before a hut's door): no mouth, landing or way on is asked of it, only that it says what it is
      if (ei && w.perch) { find.push({ row: 'mouth', tag, ok: w.perch.length > 12, detail: `a perch: ${w.perch}` }); return; }
      // mouth
      const mx = e.at[0] + e.dir[0] * 0.4, mz = e.at[1] + e.dir[1] * 0.4, inMouth = [];
      for (const c of cols) { if (Math.abs(c.x - mx) > 10 || Math.abs(c.z - mz) > 10) continue; const pt = near(c, mx, mz); if (pt.d < 0.8 && stands(c, e.y, pt.t) && !own(c, e, pt)) inMouth.push(`${desc(c)} ${Math.max(0, pt.d).toFixed(2)} m`); }
      find.push({ row: 'mouth', tag, ok: !inMouth.length, detail: inMouth.slice(0, 3).join('; ') });
      // landing
      let ok = true, why = '';
      // the landing is counted from the way's last tread: the registered mouth may already stand some way onto the floor
      // (a kit flight's path steps 0.9 m past its head), so find the edge back toward the way first
      const inw = ei ? nrm(v(w.path[e.k], w.path[e.k - 1] || w.path[e.k])) : nrm(v(w.path[e.k], w.path[e.k + 1] || w.path[e.k]));
      let back = 0;
      for (let t = 0.1; t <= 1.5; t += 0.1) { const f = C.floorAt(e.at[0] + inw[0] * t, e.at[1] + inw[1] * t, e.y); if (Math.abs(f.y - e.y) > 0.15) break; back = t; }
      for (let s = 0.1; s <= 1.2001 - back && ok; s += 0.1) {
        const x = e.at[0] + e.dir[0] * s, z = e.at[1] + e.dir[1] * s, f = C.floorAt(x, z, e.y);
        if (Math.abs(f.y - e.y) > 0.3 + (f.stack ? 0 : 0.35 * s)) { ok = false; why = `the floor is ${f.y.toFixed(2)} at ${s.toFixed(1)} m`; break; }
        for (const c of cols) { if (Math.abs(c.x - x) > 10 || Math.abs(c.z - z) > 10) continue; const pt = near(c, x, z); if (pt.d < 0.45 && stands(c, e.y, pt.t) && !own(c, e, pt)) { ok = false; why = `${desc(c)} at ${s.toFixed(1)} m`; break; } }
      }
      find.push({ row: 'landing', tag, ok, detail: why });
      // dead end
      const fl = flood(e, w);
      find.push({ row: 'dead end', tag, ok: fl.open || !!fl.hit, detail: fl.open ? `open (${fl.cells} cells)` : fl.hit ? `${fl.hit} (${fl.cells} cells)` : `nothing in ${fl.cells} cells (${(fl.cells * G * G).toFixed(0)} m2)` });
    });
  }
  // doubled
  for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
    const A = all[a].ends.slice().sort((p, q) => p.y - q.y), B = all[b].ends.slice().sort((p, q) => p.y - q.y);
    if (Math.abs(A[0].y - B[0].y) > 0.4 || Math.abs(A[1].y - B[1].y) > 0.4) continue;
    if (Math.abs(A[0].y - A[1].y) < 0.4) continue; // a crossing on one level doubles nothing
    const d0 = Math.hypot(A[0].at[0] - B[0].at[0], A[0].at[1] - B[0].at[1]), d1 = Math.hypot(A[1].at[0] - B[1].at[0], A[1].at[1] - B[1].at[1]);
    if (d0 < 6 && d1 < 6) find.push({ row: 'doubled', tag: `${all[a].w.id} / ${all[b].w.id}`, ok: false, detail: `feet ${d0.toFixed(1)} m apart, tops ${d1.toFixed(1)} m` });
  }
  // ---- (v15-W4) the rows that count a way's own walls, and the drawn meshes
  // a flood at 0.25 m where a body (0.45 m, the controls' BODY) stands: within a 0.3 m step of the last cell, and no
  // collider at the walker's height, the way's own included, within its radius + 0.45 m. Returns the cells' distances.
  const B2 = 0.25, BODY = 0.45;
  const colsNear = (x, z, R) => cols.filter((c) => Math.abs(c.x - x) < R + 3 && Math.abs(c.z - z) < R + 3);
  const free = (cs, x, z, feet) => { for (const c of cs) { const pt = near(c, x, z); if (pt.d < BODY && stands(c, feet, pt.t)) return false; } return true; };
  function reach(x0, z0, y0, R, cap = 20000, stop = null, extra = null) {
    const cs = colsNear(x0, z0, R), seen = new Map(), q = [[0, 0, y0, 0]], key = (i, j) => i * 4096 + j;
    seen.set(key(0, 0), { y: y0, d: 0 });
    let head = 0;
    while (head < q.length && seen.size < cap) {
      const [i, j, y, d] = q[head++];
      if (stop && stop(x0 + i * B2, z0 + j * B2, y)) return { seen, hit: true, d, i, j };
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj, k = key(ni, nj); if (seen.has(k)) continue;
        const nx = x0 + ni * B2, nz = z0 + nj * B2; if (Math.hypot(nx - x0, nz - z0) > R) continue;
        const f = C.floorAt(nx, nz, y); if (Math.abs(f.y - y) > 0.3) continue;
        if (!free(cs, nx, nz, f.y) || (extra && extra(ni, nj))) continue;
        seen.set(k, { y: f.y, d: d + B2 }); q.push([ni, nj, f.y, d + B2]);
      }
    }
    return { seen, hit: false, open: seen.size >= cap };
  }
  const flooded = (fl, x0, z0, x, z, tol) => { for (let i = Math.floor((x - tol - x0) / B2); i <= Math.ceil((x + tol - x0) / B2); i++) for (let j = Math.floor((z - tol - z0) / B2); j <= Math.ceil((z + tol - z0) / B2); j++) { if (Math.hypot(x0 + i * B2 - x, z0 + j * B2 - z) > tol) continue; if (fl.seen.has(i * 4096 + j)) return true; } return false; };
  const houseIn = (x, z, y) => P.PLOTS.some((p) => p.kind !== 'yard' && p.kind !== 'square' && p.kind !== 'garden' && p.kind !== 'tube' && Math.abs(p.y - y) < 0.35 && P.inPlot(p, x, z, 0.1));
  const THREE = fp.THREE || (await import('three'));
  const skip = /sky|star|cloud|far|lure|grass|fog|haze|water|folk|people|body|moth|bird|dust|smoke|glow|halo|beam|lamp-glass/i;
  const meshes = []; fp.scene.traverse((m) => { if ((m.isMesh || m.isInstancedMesh) && m.visible && !skip.test(m.name || '') && !(m.material && m.material.transparent && m.material.opacity < 0.5)) meshes.push(m); });
  // the drawn meshes as triangles in 1 m columns over the village, for vertical rays (a raycast through the merged
  // meshes costs tens of milliseconds a ray; this is the same answer, straight up or down)
  const TRI = [], TM = [], COLS = new Map(), cK = (i, j) => i * 4096 + j, va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), mi = new THREE.Matrix4(), mw = new THREE.Matrix4();
  fp.scene.updateMatrixWorld(true);
  meshes.forEach((m, mk) => {
    const g = m.geometry, pos = g?.attributes?.position; if (!pos) return;
    const idx = g.index, nTri = idx ? idx.count / 3 : pos.count / 3, inst = m.isInstancedMesh ? m.count : 1;
    for (let q = 0; q < inst; q++) {
      if (m.isInstancedMesh) { m.getMatrixAt(q, mi); mw.multiplyMatrices(m.matrixWorld, mi); } else mw.copy(m.matrixWorld);
      for (let t = 0; t < nTri; t++) {
        const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        va.fromBufferAttribute(pos, a).applyMatrix4(mw); vb.fromBufferAttribute(pos, b).applyMatrix4(mw); vc.fromBufferAttribute(pos, c).applyMatrix4(mw);
        const x0 = Math.min(va.x, vb.x, vc.x), x1 = Math.max(va.x, vb.x, vc.x), z0 = Math.min(va.z, vb.z, vc.z), z1 = Math.max(va.z, vb.z, vc.z);
        if (x1 < 40 || x0 > 130 || z1 < -75 || z0 > 40 || x1 - x0 > 30 || z1 - z0 > 30) continue;
        const k = TRI.length / 9; TRI.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z); TM.push(mk);
        for (let i = Math.floor(x0); i <= Math.floor(x1); i++) for (let j = Math.floor(z0); j <= Math.floor(z1); j++) { const kk = cK(i, j); let l = COLS.get(kk); if (!l) COLS.set(kk, (l = [])); l.push(k); }
      }
    }
  });
  // the surfaces over (x, z) between y0 and y1: the nearest to y0 ({ y, name }) or null
  const column = (x, z, y0, y1) => {
    const l = COLS.get(cK(Math.floor(x), Math.floor(z))); if (!l) return null;
    let best = null, bd = Infinity;
    for (const k of l) {
      const o9 = k * 9, ax = TRI[o9], az = TRI[o9 + 2], bx = TRI[o9 + 3], bz = TRI[o9 + 5], cx = TRI[o9 + 6], cz = TRI[o9 + 8];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const y = l1 * TRI[o9 + 1] + l2 * TRI[o9 + 4] + l3 * TRI[o9 + 7];
      if (y < Math.min(y0, y1) || y > Math.max(y0, y1)) continue;
      const dd = Math.abs(y - y0); if (dd < bd) { bd = dd; best = { y, name: meshes[TM[k]].name || meshes[TM[k]].type }; }
    }
    return best;
  };
  // something drawn standing at (x, z) between a walker's knee (0.5 m: lower is stepped or hopped over) and chest over feet (a parapet, a newel, a block)
  const drawnAt = (x, z, feet) => { const h = column(x, z, feet + 1.3, feet + 0.5); return h ? `${h.name} at (${x.toFixed(1)}, ${z.toFixed(1)}) ${(h.y - feet).toFixed(2)} m up` : null; };
  // something drawn over (x, z) under a walker's head: the space under a deck or a flight, not ground a body walks on
  const roofed = (x, z, feet) => !!column(x, z, feet + 0.4, feet + 2.1);
  // turn: from each end, every way the level runs (its floor 2.4 m out within 0.3 m of the end's, not a house's room,
  // not back down the way) the walker reaches a point 2 m out (within 0.5 m of it), own walls counted
  for (const { w, ends } of all) ends.forEach((e, ei) => {
    if (w.tick) return; // a ladder is taken from its foot and its head, by a carry
    // what is drawn knee to chest high on each cell within 3.45 m: a body (about 0.3 m of it, the cell's neighbours) does not pass it
    const x0 = e.at[0], z0 = e.at[1], dm = new Map(), dk = (i, j) => i * 4096 + j, shut = [];
    for (let i = -14; i <= 14; i++) for (let j = -14; j <= 14; j++) { if (Math.hypot(i, j) * B2 > 3.45) continue; const a = drawnAt(x0 + i * B2, z0 + j * B2, e.y); if (a) dm.set(dk(i, j), a); }
    const nearDrawn = (i, j) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const v = dm.get(dk(i + a, j + b)); if (v) return v; } return null; };
    const fl = reach(x0, z0, e.y, 3.2, 20000, null, (i, j) => !!nearDrawn(i, j));
    const self = (x, z) => { const p = w.path; for (let k = 0; k < p.length - 1; k++) { const a = p[k], b = p[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < 0.9 && Math.abs(a[2] + (b[2] - a[2]) * t - e.y) > 0.25) return true; } return false; };
    for (let k = 0; k < 16; k++) {
      const th = k * Math.PI / 8, ux = Math.sin(th), uz = -Math.cos(th), fx = x0 + ux * 2.4, fz = z0 + uz * 2.4, f = C.floorAt(fx, fz, e.y);
      if (Math.abs(f.y - e.y) > 0.3 || houseIn(fx, fz, e.y) || self(fx, fz) || self(x0 + ux * 1.2, z0 + uz * 1.2)) continue;
      // (where no body stands, in a slot between two houses or inside a tower, or under a deck or a flight: not ground the level runs on)
      const tx = x0 + ux * 2, tz = z0 + uz * 2;
      if (!free(colsNear(tx, tz, 0.6), tx, tz, e.y) || roofed(tx, tz, e.y) || roofed(fx, fz, e.y)) continue;
      // and the level is not only beyond a drop or a wall it has anyway: it is floor all the way out at the end's level
      let cont = true; for (let s = 0.4; s <= 2.4; s += 0.2) { const g = C.floorAt(x0 + ux * s, z0 + uz * s, e.y); if (Math.abs(g.y - e.y) > 0.35 || roofed(x0 + ux * s, z0 + uz * s, e.y)) { cont = false; break; } } // (and not in under a deck or a flight: the way's own legs stand there)
      if (!cont) continue;
      if (!flooded(fl, x0, z0, x0 + ux * 2, z0 + uz * 2, 0.5)) { let d = null; for (let q = 1; q <= 9 && !d; q++) d = nearDrawn(Math.round(ux * q), Math.round(uz * q)); shut.push(`${['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][k]}${d ? ` (drawn: ${d})` : ''}`); }
    }
    let why = '';
    if (shut.length) { // what stands there: the colliders at walking height within 2.4 m in the shut directions
      const cs = colsNear(x0, z0, 2.6).filter((c) => { const pt = near(c, x0, z0); return pt.d < 2.4 && stands(c, e.y, pt.t); });
      why = `shut to the ${shut.join(' ')}; by ${cs.slice(0, 3).map(desc).join('; ')}`;
    }
    find.push({ row: 'turn', tag: `${w.id} ${ei ? 'top' : 'foot'}`, ok: !shut.length, detail: why, at: [x0, z0, e.y] });
  });
  // doors: every door a house record gives. Its step (0.5 m out of its face) is reached on foot from every way's end
  // on its level within 8 m, by a way no longer than twice the straight line and 3 m; and a door no way's end on its
  // level reaches is not shut in a pocket (its flood meets a way's end, or runs out past 4,000 cells: open ground)
  const recs = [], take = (l) => { for (const R of l || []) if (R && R.plot) recs.push(R); };
  take(fp.village?.row?.records); take(fp.lees?.records); take(fp.rungs?.records && Object.values(fp.rungs.records)); take(fp.quarrels?.records); take(fp.pennyworth?.records);
  const doors = [];
  for (const R of recs) for (const d of R.doors) if (!d.ladder && inBox(d.x, d.z)) doors.push({ of: R.name || R.kind, x: d.x + d.face[0] * 0.5, z: d.z + d.face[1] * 0.5, y: d.y });
  for (const d of doors) {
    const fy = C.floorAt(d.x, d.z, d.y + 0.3).y, tag = `${d.of} door (${d.x.toFixed(1)}, ${d.z.toFixed(1)})`;
    const near8 = [];
    for (const { w, ends } of all) for (const e of ends) if (!w.tick && Math.abs(e.y - fy) < 0.4 && Math.hypot(e.at[0] - d.x, e.at[1] - d.z) < 8) near8.push({ w, e, L: Math.hypot(e.at[0] - d.x, e.at[1] - d.z) });
    const bad = [];
    for (const { w, e, L } of near8) {
      const fl = reach(e.at[0], e.at[1], e.y, 12, 20000, (x, z) => Math.hypot(x - d.x, z - d.z) < 0.4);
      if (!fl.hit) bad.push(`not reached from ${w.id} (${L.toFixed(1)} m off)`); else if (fl.d > 2 * L + 3) bad.push(`${fl.d.toFixed(1)} m round from ${w.id} (${L.toFixed(1)} m off)`);
    }
    let pocket = false;
    if (!near8.length) {
      const fl = reach(d.x, d.z, fy, 60, 4000, (x, z, y) => all.some(({ w, ends }) => ends.some((e) => Math.abs(e.y - y) < 0.4 && Math.hypot(e.at[0] - x, e.at[1] - z) < 0.6)));
      pocket = !fl.hit && !fl.open; if (pocket) bad.push(`shut in: ${fl.seen.size} cells (${(fl.seen.size * B2 * B2).toFixed(0)} m2) and no way`);
    }
    find.push({ row: 'door', tag, ok: !bad.length, detail: bad.join('; ') + (near8.length ? '' : pocket ? '' : ' (no way within 8 m; open ground)') });
  }
  // headroom: up every way's line, every 0.25 m, a ray from 0.6 m over the floor there to 2.1 m, against the drawn
  // meshes (not the colliders: W1's row passed a footbridge across a stair's head because its collider was low)
  for (const { w } of all) {
    if (w.tick) continue;
    const p = w.path, hits = [];
    for (let k = 0; k < p.length - 1; k++) {
      const a = p[k], b = p[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.25));
      for (let s = 0; s < n; s++) {
        const t = s / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, yl = a[2] + (b[2] - a[2]) * t, f = C.floorAt(x, z, yl + 0.3);
        const g = C.floorAt(x, z, yl + 1), feet = Math.abs(g.y - yl) < 1.2 ? g.y : Math.abs(f.y - yl) < 0.5 ? f.y : yl;
        const h = column(x, z, feet + 0.6, feet + 2.1); // (from over a knee: a kerb or a parapet's top in the line is the turn row's)
        if (h) hits.push(`${h.name} ${(h.y - feet).toFixed(2)} m over the feet (${feet.toFixed(2)}) at (${x.toFixed(1)}, ${z.toFixed(1)})`);
      }
    }
    find.push({ row: 'headroom', tag: w.id, ok: !hits.length, detail: hits.length ? `${hits.length} points: ${hits.slice(0, 2).join('; ')}` : '' });
  }
  // the spine (src/v15/plan.js SPINE): joined (each leg on one level reached on foot from the last), lit (a lamp within
  // 9 m of every 3 m of it, within 4 m up or down), and 1.5 m wide where it is walked on a level (a body 0.3 m either
  // side of its line stands, on the same floor)
  if (P.SPINE) {
    const L = fp.ascents.list, sp = [[P.SPINE.from[0], P.SPINE.from[1], P.LEVEL[P.SPINE.from[2]].y, 'from']];
    let missing = '';
    for (const leg of P.SPINE.legs) {
      if (leg.way) { const a = L.find((q) => q.id === leg.way); if (!a) { missing += ` ${leg.way}`; continue; } const p = a.path.map((q) => [q[0], q[1], q[2], leg.way]), last = sp[sp.length - 1]; if (Math.hypot(p[p.length - 1][0] - last[0], p[p.length - 1][1] - last[1]) < Math.hypot(p[0][0] - last[0], p[0][1] - last[1])) p.reverse(); sp.push(...p); }
      else sp.push(...leg.pts.map(([x, z, lv]) => [x, z, P.LEVEL[lv].y, 'lane']));
    }
    sp.push([P.SPINE.to[0], P.SPINE.to[1], P.LEVEL[P.SPINE.to[2]].y, 'to']);
    const gaps = [];
    for (let k = 0; k < sp.length - 1; k++) {
      const a = sp[k], b = sp[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (Math.abs(a[2] - b[2]) > 0.4 || d < 0.6 || (a[3] === b[3] && a[3] !== 'lane')) continue; // (a way's own line is walked by heights-test)
      const fl = reach(a[0], a[1], C.floorAt(a[0], a[1], a[2] + 0.3).y, d + 8, 60000, (x, z) => Math.hypot(x - b[0], z - b[1]) < 0.6);
      if (!fl.hit) gaps.push(`(${a[0].toFixed(1)}, ${a[1].toFixed(1)}) to (${b[0].toFixed(1)}, ${b[1].toFixed(1)})`);
    }
    find.push({ row: 'spine', tag: 'joined: every leg on a level reached on foot from the last', ok: !gaps.length && !missing, detail: (missing ? `missing ways:${missing}; ` : '') + gaps.join('; ') });
    const lamps = [...(fp.lappetFar?.lamps || []), ...(fp.lappetLamps?.lamps || [])].map((l) => [l.x, l.y, l.z]);
    fp.scene.traverse((m) => { if (m.isPointLight && m.distance > 0) { const v = m.getWorldPosition(new THREE.Vector3()); lamps.push([v.x, v.y, v.z]); } });
    const dark = [], narrow = [];
    let along = 0;
    for (let k = 0; k < sp.length - 1; k++) {
      const a = sp[k], b = sp[k + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 0.5)), ux = (b[0] - a[0]) / (d || 1), uz = (b[1] - a[1]) / (d || 1);
      for (let i = 0; i < n; i++, along += d / n) {
        const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = a[2] + (b[2] - a[2]) * t;
        if (i % 6 === 0 && !lamps.some((l) => Math.hypot(l[0] - x, l[2] - z) < 9 && Math.abs(l[1] - y) < 4)) dark.push(`${along.toFixed(0)} m (${x.toFixed(1)}, ${z.toFixed(1)})`);
        // (the clear width across the line: where a body's middle may stand either side of it, on the same floor, plus the body)
        if (Math.abs(b[2] - a[2]) < 0.1 && d > 0.6) {
          const f0 = C.floorAt(x, z, y + 0.3).y, cs = colsNear(x, z, 2), span = [0, 0], by = [null, null];
          [-1, 1].forEach((sd, q) => { for (let o = 0; o <= 1.2; o += 0.1) { const px = x - uz * o * sd, pz = z + ux * o * sd, f = C.floorAt(px, pz, f0 + 0.3); const c = cs.find((c) => { const pt = near(c, px, pz); return pt.d < BODY && stands(c, f.y, pt.t); }); if (Math.abs(f.y - f0) > 0.3 || c) { by[q] = c ? desc(c) : `floor ${f.y.toFixed(2)}`; break; } span[q] = o; } });
          const wide = span[0] + span[1] + 2 * BODY;
          if (wide < 1.5) narrow.push(`${along.toFixed(0)} m (${x.toFixed(1)}, ${z.toFixed(1)}) ${wide.toFixed(1)} m: ${by.filter(Boolean).join(' / ')}`);
        }
      }
    }
    find.push({ row: 'spine', tag: `lit: a lamp within 9 m of every 3 m (${along.toFixed(0)} m of it)`, ok: !dark.length, detail: dark.slice(0, 30).join('; ') + (dark.length > 30 ? ` and ${dark.length - 30} more` : '') });
    find.push({ row: 'spine', tag: '1.5 m wide where it is walked on a level', ok: !narrow.length, detail: narrow.slice(0, 30).join('; ') + (narrow.length > 30 ? ` and ${narrow.length - 30} more` : '') });
  }
  // ---- (v15-W7: the cold critic, "every flight's foot is hidden behind its own side wall", and the crown walked off)
  // A walker driven on the controls' own update, the keys held and the look steered, nothing teleported once placed.
  const p = fp.player, DT = 1 / 60;
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const ticks = fp.ascents.list.filter((a) => a.tick).map((a) => a.tick); // (every climbable ladder's, the village's or not)
  const ladderOn = () => fp.ladders?.list?.some((d) => d.state && d.state().on);
  function drive(x, z, y, steer, secs, until) {
    const r0 = fp.controls.placeAt(x, z, y); p.vel.set(0, 0, 0); p.vy = 0; p.keys.clear(); p.keys.add('KeyW');
    const f0 = r0.y; let low = f0, lowAt = null, still = 0, lx = p.pos.x, lz = p.pos.z, out = null;
    for (let i = 0; i < secs * 60; i++) {
      const yaw = steer(p.pos.x, p.pos.z, i); if (yaw === null) { out = 'done'; break; } p.yaw = yaw;
      fp.controls.update(DT); for (const t of ticks) t();
      const feet = p.pos.y - p.eye;
      if (!p.carried && feet < low - 0.05) { low = feet; lowAt = [p.pos.x, p.pos.z]; }
      if (until && until(p.pos.x, p.pos.z, feet)) { out = 'until'; break; }
      if (p.carried) { out = 'ladder'; break; } // (taken onto a ladder: a way, never a fall)
      if (i % 60 === 59) { still = Math.hypot(p.pos.x - lx, p.pos.z - lz) < 0.25 && !p.carried ? still + 1 : 0; lx = p.pos.x; lz = p.pos.z; if (still >= 2) { out = 'stuck'; break; } }
    }
    const res = { out, x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, drop: f0 - low, lowAt, carried: out === 'ladder' };
    p.keys.clear(); if (p.carried) { fp.controls.placeAt(x, z, y); } // (let go of a ladder taken)
    return res;
  }
  const toward = (tx, tz) => () => Math.atan2(-(tx - p.pos.x), -(tz - p.pos.z));
  const fmt = (x, z) => `(${x.toFixed(1)}, ${z.toFixed(1)})`;
  // seen and walked: from each end of each way (not the ladders: their own row), points on the level 7 m out at 45, 90
  // and 135 degrees either side of the way out, reached on foot from the end; from each, (seen) a ray from the eye to
  // the way's first tread (the floor's first change from the end's level, inward, anywhere across the way) is not
  // stopped by anything drawn within 2.4 m of the way's own line; (walked) a walker steered straight at that tread, then
  // along the way, comes out at its other end
  const rc = new THREE.Raycaster(), o3 = new THREE.Vector3(), d3 = new THREE.Vector3();
  const nearLine = (path, x, z, R) => { for (let k = 0; k < path.length - 1; k++) { const a = path[k], b = path[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)); if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < R) return true; } return false; };
  const sight = (ex, ey, ez, tx, ty, tz) => { o3.set(ex, ey, ez); d3.set(tx - ex, ty - ey, tz - ez); const L = d3.length(); d3.normalize(); rc.set(o3, d3); rc.far = L - 0.3; const h = rc.intersectObjects(meshes, false)[0]; return h ? { x: h.point.x, y: h.point.y, z: h.point.z, name: h.object.name || h.object.type } : null; };
  for (const { w, ends } of all) {
    if (w.tick) continue;
    ends.forEach((e, ei) => {
      const tag = `${w.id} ${ei ? 'top' : 'foot'}`, other = ends[1 - ei], [mx, mz] = e.at;
      const inw = ei ? nrm(v(w.path[e.k], w.path[e.k - 1])) : nrm(v(w.path[e.k], w.path[e.k + 1]));
      // the first tread: inward from the end until the floor leaves the end's level
      let t0 = null;
      for (let s = 0; s <= 2.5; s += 0.05) { const f = C.floorAt(mx + inw[0] * s, mz + inw[1] * s, e.y + 0.6); if (Math.abs(f.y - e.y) > 0.1) { t0 = { s: s + 0.1, y: C.floorAt(mx + inw[0] * (s + 0.1), mz + inw[1] * (s + 0.1), e.y + 0.6).y }; break; } }
      if (!t0) { if (!ei) find.push({ row: 'seen', tag, ok: true, detail: 'level all the way (a bridge): no tread' }); return; }
      const cx = mx + inw[0] * t0.s, cz = mz + inw[1] * t0.s, tread = [];
      for (let u = -3; u <= 3.001; u += 0.2) { const x = cx - inw[1] * u, z = cz + inw[0] * u, f = C.floorAt(x, z, t0.y + 0.3); if (Math.abs(f.y - t0.y) < 0.08) tread.push([x, Math.max(f.y, e.y) + 0.35, z, Math.abs(u)]); }
      tread.sort((a, b) => a[3] - b[3]);
      const lineOf = w.path.slice(Math.min(e.k, other.k), Math.max(e.k, other.k) + 1);
      const fl = reach(mx + e.dir[0] * 0.3, mz + e.dir[1] * 0.3, e.y, 8.6, 30000);
      const seenBad = [], walkBad = [], walkRound = [], views = [];
      for (const sd of [-1, 1]) for (const [deg, dist] of ei ? [[45, 7], [90, 7], [135, 7]] : [[45, 4], [45, 7], [90, 7], [135, 7]]) { // (the foot also from 4 m: the critic stood that near the head's west flight)
        const a = sd * deg * Math.PI / 180, ux = e.dir[0] * Math.cos(a) - e.dir[1] * Math.sin(a), uz = e.dir[0] * Math.sin(a) + e.dir[1] * Math.cos(a);
        const vx = mx + ux * dist, vz = mz + uz * dist, f = C.floorAt(vx, vz, e.y + 0.5);
        if (Math.abs(f.y - e.y) > 0.3 || houseIn(vx, vz, e.y) || roofed(vx, vz, f.y) || !flooded(fl, mx + e.dir[0] * 0.3, mz + e.dir[1] * 0.3, vx, vz, 0.4)) continue;
        // the eye at 1.6 m; the tread seen where nothing of the way's own stands between
        let seen = null, own = null;
        for (const q of tread) { const h = sight(vx, f.y + 1.6, vz, q[0], q[1], q[2]); if (!h) { seen = q; break; } if (!own && nearLine(lineOf, h.x, h.z, 2.4) && !houseIn(h.x, h.z, e.y)) own = h; } // (a house the view is behind is not the way's wall)
        const label = `${sd < 0 ? 'L' : 'R'}${deg}${dist < 7 ? `@${dist}` : ''} ${fmt(vx, vz)}`;
        views.push(label);
        if (!seen && own && !ei) seenBad.push(`${label}: ${own.name} at ${fmt(own.x, own.z)} y ${own.y.toFixed(1)}`);
        // walked: from where the tread is seen, at it, then along the way to its other end (where it is not seen there
        // is nothing to walk at: the seen row says why)
        const far = ei ? w.path[0] : w.path[w.path.length - 1];
        if (!seen) continue;
        const tq = seen, legs = [[tq[0], tq[2]], ...(ei ? lineOf.slice().reverse() : lineOf).slice(1).map((q) => [q[0], q[1]]), [far[0], far[1]]];
        let leg = 0;
        const r = drive(vx, vz, f.y, (x, z) => { while (leg < legs.length && Math.hypot(legs[leg][0] - x, legs[leg][1] - z) < 0.5) leg++; return leg >= legs.length ? null : Math.atan2(-(legs[leg][0] - x), -(legs[leg][1] - z)); }, 30,
          (x, z, feet) => Math.hypot(x - other.at[0], z - other.at[1]) < 0.8 && Math.abs(feet - other.y) < 0.35);
        const ok = (r.out === 'until' || r.out === 'done') && Math.abs(r.feet - other.y) < 0.4;
        // (held up away from the way, by a house's corner or a post on the straight line from the view: a visitor walks
        // round that, and it is no fault of the way's; held up within 2.4 m of the way's own line is)
        // (and held up by what another module built beside it, a house's wall or a chimney on its roof yard, a pier the
        // way leans on: a visitor goes round, and the way's kit is not at fault; held up by the ways' own kit, or by nothing
        // standing (a floor's edge), is)
        if (!ok) { const bc = colsNear(r.x, r.z, 1).filter((c) => { const pt = near(c, r.x, r.z); return pt.d < 0.7 && stands(c, r.feet, pt.t); }), by = bc.map(desc).slice(0, 2).join(', '), msg = `${label}: ${r.out || 'time'} at ${fmt(r.x, r.z)} feet ${r.feet.toFixed(1)}${by ? ` by ${by}` : ''}`; (nearLine([...lineOf, far], r.x, r.z, 2.4) && (!bc.length || bc.some((c) => c.mod === 'lappet')) ? walkBad : walkRound).push(msg); }
      }
      if (!ei) find.push({ row: 'seen', tag, ok: !seenBad.length, detail: seenBad.length ? seenBad.join('; ') : `${views.length} views` }); // (a head is guarded by its cheeks where it is cut into a floor: it is the foot that must be seen)
      find.push({ row: 'walked', tag, ok: !walkBad.length, detail: (walkBad.length ? walkBad.join('; ') : `${views.length} walks`) + (walkRound.length ? ` (held up away from it, walked round by a visitor: ${walkRound.join('; ')})` : '') });
    });
  }
  // ladders: walked into from 3 m out (straight, and 35 and 70 degrees off, either side), then pushed into, the
  // walker takes hold; and stood beside its foot or in behind it against the wall (the critic, at the rim's ladder:
  // "the frame fills with flat violet and E offers nothing"), facing the wall and walking, the walker takes hold
  for (const d of fp.ladders?.list || []) {
    if (!d.climb || !d.take || !d.n) continue;
    const [nx, nz] = d.n, y0 = d.foot[2], [kx, kz] = d.take, bad = [];
    const tries = [0, 35, -35, 70, -70].map((deg) => { const a = deg * Math.PI / 180; return [`${deg}`, kx + (-nx * Math.cos(a) + nz * Math.sin(a)) * 3, kz + (-nz * Math.cos(a) - nx * Math.sin(a)) * 3, false]; });
    for (const u of [-0.8, -0.5, 0.5, 0.8]) for (const a of [0, 0.3]) tries.push([`beside ${u > 0 ? '+' : ''}${u}${a ? ' in' : ''}`, kx - nz * u + nx * a, kz + nx * u + nz * a, true]);
    for (const [lab, vx, vz, stand] of tries) {
      const f = C.floorAt(vx, vz, y0 + 0.5); if (Math.abs(f.y - y0) > 0.3 || !free(colsNear(vx, vz, 1), vx, vz, f.y)) continue;
      let took = false;
      const r = drive(vx, vz, y0, (x, z) => (stand || Math.hypot(x - kx, z - kz) < 1.0 ? Math.atan2(-nx, -nz) : Math.atan2(-(kx - x), -(kz - z))), stand ? 1.5 : 6, () => (took = took || !!(d.state().on)));
      if (!took) bad.push(`${lab}: ${r.out || 'time'} at ${fmt(r.x, r.z)}`);
    }
    find.push({ row: 'ladder', tag: `${d.id} taken when walked into`, ok: !bad.length, detail: bad.join('; ') });
  }
  // the crown: from the keep's end (SPINE.arrive), W held at every yaw within 40 degrees of the stair head's bearing
  // (and the critic's own line), no drop over 1.2 m before the walker is at the head; and along the whole rim, walked
  // straight out at it from 3 m in, nobody goes over where there is no way down
  if (P.SPINE?.arrive) {
    const [ax, az] = P.SPINE.arrive, hd = all.find((o) => o.w.id === 'heliarch-head-west'), Y = P.LEVEL.crown.y;
    const head = P.at(P.STAIR.run, P.STAIR.s, P.RISERS[0].D + 1), b0 = Math.atan2(-(head[0] - ax), -(head[1] - az));
    const atHead = (x, z, feet) => Math.abs(feet - Y) < 0.3 && (p.onStack?.name || '').startsWith('heliarch-head') || Math.hypot(x - head[0], z - head[1]) < 1.6;
    for (const [lab, yaw] of [...[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((d) => [`${d >= 0 ? '+' : ''}${d}`, b0 + d * Math.PI / 180]), ['the critic\'s line', 0.2]]) {
      const r = drive(ax, az, Y, () => yaw, 14, atHead);
      find.push({ row: 'crown', tag: `from the keep's end at ${lab} (yaw ${yaw.toFixed(2)})`, ok: r.drop <= 1.2, detail: `${r.drop > 1.2 ? `fell ${r.drop.toFixed(1)} m at ${fmt(...r.lowAt)}` : r.out === 'until' ? 'at the head' : r.out === 'ladder' ? 'onto the ladder' : `held at ${fmt(r.x, r.z)}`}` });
    }
    void hd;
    const over = [];
    for (const run of [1, 2]) {
      const R = P.RUN[run], s0 = run === 1 ? P.FADE.s1[0] + 3 : P.cornerS(2, P.RISERS[0].D), s1 = run === 1 ? P.cornerS(1, P.RISERS[0].D) : P.FADE.s2[0] + 4;
      for (let s = s0; s <= s1; s += 1.5) {
        const [x, z] = P.at(run, s, P.RISERS[0].D - 3), [ox, oz] = P.at(run, s, P.RISERS[0].D + 2);
        if (Math.abs(C.floorAt(x, z, Y + 0.5).y - Y) > 0.3 || C.floorAt(ox, oz, Y + 0.5).y > Y - 1.2 || !free(colsNear(x, z, 1), x, z, Y)) continue;
        const r = drive(x, z, Y, () => Math.atan2(-R.n[0], -R.n[1]), 5);
        if (r.drop > 1.2 && !r.carried) over.push(`s ${s.toFixed(1)} ${fmt(x, z)} fell ${r.drop.toFixed(1)}`);
      }
      find.push({ row: 'crown', tag: `the rim of run ${run}: walked straight at it, nobody goes over but by a way`, ok: !over.length, detail: over.splice(0).join('; ') });
    }
  }
  return { table, find, n: ways.length, paths: ways.map((w) => ({ id: w.id, path: w.path })) };
});
if (r.missing) { console.log(`FAIL ways: ${r.missing} is missing`); process.exit(1); }
console.log(`${r.n} ways in the village:`);
for (const t of r.table) console.log(`  ${t.id.padEnd(22)} ${t.levels[0].padEnd(6)} (${t.ends[0].join(', ')})  ->  ${t.levels[1].padEnd(6)} (${t.ends[1].join(', ')})`);
let pass = 0, fail = 0;
const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); ok ? pass++ : fail++; };
for (const row of ['mouth', 'landing', 'dead end', 'turn', 'door', 'headroom', 'spine', 'seen', 'walked', 'ladder', 'crown']) for (const f of r.find.filter((q) => q.row === row)) check(f.ok, `${row}: ${f.tag}`, f.detail);
const dbl = r.find.filter((q) => q.row === 'doubled');
check(!dbl.length, 'doubled: no two ways join the same levels within 6 m at both ends', dbl.map((q) => `${q.tag} (${q.detail})`).join('; '));
check(r.n >= 15, `the village registers its ways (${r.n})`); // (v15-W4 took four out)

// ---------------------------------------------------------------- ladders (v15-W2, the owner's rule, 2026-11-16)
// "ladders that are in a place that could read as climable, should be climable consistently": every ladder drawn
// anywhere in the walk is in ctx.ladders, either climbable (climb() in src/v15/ways/ladder.js, with its ascent) or
// scenery with the reason it does not read as a way up; and a file under src/ that speaks of a ladder either
// registers one or is named below with why it draws none. The next ladder somebody draws must choose.
const LD = await page.evaluate(() => {
  const fp = window.__fp, list = fp.ladders?.list || [], asc = fp.ascents.list;
  return { list: list.map((d) => ({ id: d.id, mod: d.mod, climb: !!d.climb, scenery: d.scenery || null, foot: d.foot.map((v) => +v.toFixed(1)), ascent: !!asc.find((a) => a.id === d.id), state: typeof d.state === 'function' })),
    orphans: asc.filter((a) => a.ladder && !list.find((d) => d.id === a.id)).map((a) => a.id) };
});
const NO_LADDER = { // files that speak of ladders and draw none
  'src/controls.js': 'a comment: the carrier reads the keys for the ladder', 'src/v8/house.js': 'the house\'s header: kept.js draws it',
  'src/v15/plan.js': 'the ways\' plan: rungs-ladder is drawn by src/v15/ways', 'src/v15/bones.js': 'its header lists the ways', 'src/v15/ways/index.js': 'calls ladder(K) (registered there)',
  'src/v15/quarters/rungs.js': 'the hand-rope and the poles\' colliders beside rungs-ladder', 'src/v15/houses/kit.js': 'ladder() and climbLadder(); registerAll climbs', 'src/v15/houses/index.js': 'the makers\' index', 'src/world.js': 'the Tender\'s Round card says how it is reached',
};
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
walk(new URL('../src', import.meta.url).pathname);
const root = new URL('..', import.meta.url).pathname;
const speak = files.map((f) => [f.slice(root.length), fs.readFileSync(f, 'utf8')]).filter(([, t]) => /ladder/i.test(t));
for (const [f, t] of speak) {
  const registers = /\bclimb\(|climbLadder\(|ladders\(ctx\)\.add\(|\bladder\(K\b/.test(t);
  check(registers || !!NO_LADDER[f], `ladders: ${f} speaks of a ladder and ${registers ? 'registers it' : NO_LADDER[f] ? 'draws none (' + NO_LADDER[f] + ')' : 'neither registers one nor is listed as drawing none'}`);
}
for (const d of LD.list) check(d.climb ? d.ascent && d.state : !!(d.scenery && d.scenery.length > 12), `ladders: ${d.id} (${d.mod}, foot ${d.foot.join(', ')}) is ${d.climb ? 'climbable, its ascent registered' : 'scenery: ' + d.scenery}`, d.climb && !d.ascent ? 'no ascent' : '');
check(!LD.orphans.length, 'ladders: every ladder ascent is in the register', LD.orphans.join(', '));
check(LD.list.filter((d) => d.climb).length >= 4 && LD.list.some((d) => !d.climb), `ladders: ${LD.list.filter((d) => d.climb).length} climbable, ${LD.list.filter((d) => !d.climb).length} scenery`);
check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
if (process.env.WAYS_JSON) fs.writeFileSync(process.env.WAYS_JSON, JSON.stringify(r, null, 1));
console.log(`ways: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
