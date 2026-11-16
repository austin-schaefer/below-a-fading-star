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
  return { table, find, n: ways.length, paths: ways.map((w) => ({ id: w.id, path: w.path })) };
});
if (r.missing) { console.log(`FAIL ways: ${r.missing} is missing`); process.exit(1); }
console.log(`${r.n} ways in the village:`);
for (const t of r.table) console.log(`  ${t.id.padEnd(22)} ${t.levels[0].padEnd(6)} (${t.ends[0].join(', ')})  ->  ${t.levels[1].padEnd(6)} (${t.ends[1].join(', ')})`);
let pass = 0, fail = 0;
const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); ok ? pass++ : fail++; };
for (const row of ['mouth', 'landing', 'dead end']) for (const f of r.find.filter((q) => q.row === row)) check(f.ok, `${row}: ${f.tag}`, f.detail);
const dbl = r.find.filter((q) => q.row === 'doubled');
check(!dbl.length, 'doubled: no two ways join the same levels within 6 m at both ends', dbl.map((q) => `${q.tag} (${q.detail})`).join('; '));
check(r.n >= 20, `the village registers its ways (${r.n})`);

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
  'src/v15/quarters/rungs.js': 'the hand-rope and the poles\' colliders beside rungs-ladder', 'src/v15/houses/kit.js': 'ladder() and climbLadder(); registerAll climbs', 'src/v15/houses/index.js': 'the makers\' index',
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
