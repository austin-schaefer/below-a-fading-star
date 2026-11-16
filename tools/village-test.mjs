#!/usr/bin/env node
// v15-V1, the Lappet's houses (src/v15/houses/) and the Strake (src/v15/row.js). Each maker, at five seeds on a plot
// in the air, is checked for: numbers (no NaN, some triangles, a record with a door); its footprint (nothing drawn
// more than 0.6 m past the plot's sides, 0.35 m past its back, 2 m out over the street in front: an awning, a sign,
// a thrown door); closed geometry (rays from sixteen places round it at eye height and from above, and from inside
// every room it can be entered by, never meet the back of a face first: under 0.6%); colliders that agree with what
// is drawn (something drawn within reach of every collider's axis); floors that agree (a ray down onto every floor
// meets a surface within 0.14 m of where the walker's feet will be, for at least three samples in four, and never
// nothing). Then: a Late house's cost on low at ten seeds (2,500 triangles), real variation (ten Late seeds give at
// least three forms and five heights; five carriers three heights), the entered kinds (carrier, elder, new) have a
// room's floor and a door marked enter, and the row: five records, two draw calls, at most 45,000 triangles on low,
// a walker placed on the Late house's roof stands on it.
// Usage: node tools/village-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
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
await page.goto(`${base}/?q=low&only=villagerow`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const r = await page.evaluate(async () => {
  const fp = window.__fp, THREE = fp.THREE, H = await import('/src/v15/houses/index.js'), out = { makers: [], late: [], carrierTops: [] };
  if (!fp.village || fp.village.off) return { missing: true };
  const rc = new THREE.Raycaster(), both = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const SEEDS = [1, 2, 3, 5, 8], SIZE = { late: [7, 6], undercroft: [8, 6], carrier: [8, 7], elder: [9, 7], new: [8, 6.5] };
  for (const kind of H.KINDS) for (const seed of SEEDS) {
    const [w, d] = SIZE[kind], plot = { x: 300, y: 200, z: -300, face: [0, 1], w, d }, B = fp.strata.builder(), E = fp.strata.builder(), m = { kind, seed };
    let R;
    try { R = H.make(kind, B, plot, { seed, E, low: true }); } catch (e) { m.err = String(e.stack || e).slice(0, 300); out.makers.push(m); continue; }
    m.tris = B.triangles + E.triangles; m.nan = [...B.P, ...E.P].some((v) => !Number.isFinite(v));
    m.doors = R.doors.length; m.enter = R.doors.some((q) => q.enter); m.rooms = R.floors.filter((f) => f.layer === 0).length; m.colliders = R.colliders.length;
    // footprint
    let side = 0, back = 0, front = 0, top = 0;
    for (const P of [B.P, E.P]) for (let i = 0; i < P.length; i += 3) { const x = P[i] - plot.x, z = P[i + 2] - plot.z; side = Math.max(side, Math.abs(x) - w / 2); back = Math.max(back, -z - d / 2); front = Math.max(front, z - d / 2); top = Math.max(top, P[i + 1] - plot.y); }
    Object.assign(m, { side, back, front, top });
    const meshes = [new THREE.Mesh(B.build(), both)]; if (E.count) meshes.push(new THREE.Mesh(E.build(), both));
    for (const q of meshes) q.updateMatrixWorld();
    const cast = (o, dir, far = 80) => { rc.set(o, dir.normalize()); rc.near = 0.02; rc.far = far; const h = rc.intersectObjects(meshes, false); return h.length ? h[0] : null; };
    // closed: the first face a ray meets faces the eye
    let rays = 0, backs = 0;
    const O = new THREE.Vector3(), D = new THREE.Vector3();
    const look = (ox, oy, oz, tx, ty, tz) => { O.set(ox, oy, oz); D.set(tx - ox, ty - oy, tz - oz); const h = cast(O, D); if (!h) return; rays++; if (h.face.normal.dot(rc.ray.direction) > 0.08) backs++; };
    const rr = Math.max(w, d) / 2 + 6;
    for (let a = 0; a < 16; a++) for (const ey of [1.7, 9]) {
      const ox = plot.x + Math.sin(a / 16 * Math.PI * 2) * rr, oz = plot.z + Math.cos(a / 16 * Math.PI * 2) * rr;
      for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) look(ox, plot.y + ey, oz, plot.x + (i / 8 - 0.5) * (w + 0.6), plot.y + 0.15 + (j / 6) * (top - 0.2), plot.z + (((i * 3 + j * 5) % 7) / 6 - 0.5) * d);
    }
    for (const f of R.floors.filter((q) => q.layer === 0)) for (let a = 0; a < 24; a++) for (const p of [-0.5, 0, 0.5, 1.1]) { const ox = f.x, oz = f.z, oy = f.y + 1.7; look(ox, oy, oz, ox + Math.sin(a / 24 * 6.283) * Math.cos(p), oy + Math.sin(p), oz + Math.cos(a / 24 * 6.283) * Math.cos(p)); }
    m.rays = rays; m.backs = backs;
    // colliders: something drawn within reach of each one's axis
    let lone = 0;
    for (const c of R.colliders) {
      const pts = c.x1 !== undefined ? [[c.x1, c.z1], [(c.x1 + c.x2) / 2, (c.z1 + c.z2) / 2], [c.x2, c.z2]] : [[c.x, c.z]], y = c.y !== undefined ? c.y + Math.min(c.h * 0.5, 1.2) : plot.y + 1;
      let hit = false;
      for (const [x, z] of pts) for (const yy of [y, y - 0.5, y + 0.6]) for (let a = 0; a < 16 && !hit; a++) { O.set(x, yy, z); D.set(Math.sin(a * Math.PI / 8), 0, Math.cos(a * Math.PI / 8)); if (cast(O, D, c.r + 0.75)) hit = true; }
      if (!hit) for (const [x, z] of pts) { O.set(x, y + 3, z); D.set(0, -1, 0); if (cast(O, D, 8)) hit = true; }
      if (!hit) lone++;
    }
    m.lone = lone;
    // floors: a ray down onto each meets a surface where the feet will be
    let fs = 0, fok = 0, holes = 0;
    for (const f of R.floors) {
      const cy = Math.cos(f.yaw || 0), sy = Math.sin(f.yaw || 0), n = f.steps ? f.steps : 3;
      for (let i = 0; i < n; i++) for (const u of f.steps ? [0] : [-0.3, 0, 0.3]) {
        const lz = f.r !== undefined ? (i - 1) * f.r * 0.5 : ((i + 0.5) / n - 0.5) * f.d, lx = f.r !== undefined ? u * f.r * 1.4 : u * f.w;
        const x = f.x + lx * cy + lz * sy, z = f.z - lx * sy + lz * cy, want = H.floorAt(R.floors.filter((q) => q.layer === f.layer), x, z);
        if (want === null) continue;
        O.set(x, want + 1.3, z); D.set(0, -1, 0); const h = cast(O, D, 4);
        fs++; if (!h) holes++; else if (Math.abs(h.point.y - want) <= 0.14) fok++;
      }
    }
    Object.assign(m, { fs, fok, holes, form: R.form });
    for (const q of meshes) q.geometry.dispose();
    out.makers.push(m);
  }
  // the Late house: cost and variety at ten seeds; the carriers' heights
  for (let seed = 1; seed <= 10; seed++) { const B = fp.strata.builder(), R = H.make('late', B, { x: 0, y: 0, z: 0, face: [0, 1], w: 7, d: 6 }, { seed, low: true }); let top = 0; for (let i = 1; i < B.P.length; i += 3) top = Math.max(top, B.P[i]); out.late.push({ seed, tris: B.triangles, form: R.form, top }); }
  for (let seed = 1; seed <= 5; seed++) { const B = fp.strata.builder(), R = H.make('carrier', B, { x: 0, y: 0, z: 0, face: [0, 1], w: 8, d: 7 }, { seed, low: true }); out.carrierTops.push(R.top); }
  // the row
  const V = fp.village, st = V.stats();
  out.row = { records: V.row.records.length, kinds: V.row.records.map((q) => q.kind), tris: st.triangles, perHouse: st.perHouse };
  let draws = 0; fp.scene.traverse((o) => { if (o.isMesh && /^village-row/.test(o.name)) draws++; }); out.row.draws = draws;
  const roof = V.row.records[0].floors.find((f) => f.layer === 1 && !f.steps && f.r === undefined && f.w > 3);
  if (roof) { fp.controls.placeAt(roof.x, roof.z, roof.y); await new Promise((q) => setTimeout(q, 600)); out.row.roof = { want: roof.y, feet: fp.player.pos.y - fp.player.eye }; }
  return out;
});
await browser.close();
let pass = 0, fail = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`); ok ? pass++ : fail++; };
if (r.missing) { console.log('FAIL the village row is not built'); process.exit(1); }
for (const m of r.makers) {
  const id = `${m.kind} seed ${m.seed}`;
  if (m.err) { check(false, `${id}: builds (${m.err})`); continue; }
  check(!m.nan && m.tris > 200 && m.doors >= 1 && m.colliders >= 3, `${id}: builds (${m.tris} triangles, ${m.doors} doors, ${m.colliders} colliders${m.form ? ', ' + m.form : ''})`);
  check(m.side <= 0.6 && m.back <= 0.35 && m.front <= 2, `${id}: inside its footprint (past the sides ${m.side.toFixed(2)}, the back ${m.back.toFixed(2)}, the front ${m.front.toFixed(2)} m)`);
  check(m.rays > 500 && m.backs / m.rays < 0.006, `${id}: closed (${m.backs} of ${m.rays} rays met the back of a face first)`);
  check(m.lone === 0, `${id}: every collider has something drawn in it (${m.lone} of ${m.colliders} have nothing)`);
  check(m.fs === 0 || (m.holes === 0 && m.fok / m.fs >= 0.75), `${id}: floors are where they are drawn (${m.fok} of ${m.fs} samples, ${m.holes} over nothing)`);
  if (['carrier', 'elder', 'new'].includes(m.kind)) check(m.enter && m.rooms >= 1, `${id}: can be entered (a door marked enter, ${m.rooms} room floors)`);
}
const forms = new Set(r.late.map((l) => l.form)), tops = new Set(r.late.map((l) => Math.round(l.top * 4)));
check(r.late.every((l) => l.tris <= 2500), `a Late house costs at most 2,500 triangles on low (ten seeds: ${r.late.map((l) => l.tris).join(', ')})`);
check(forms.size >= 3 && tops.size >= 5, `ten Late seeds are not one house: ${forms.size} forms (${[...forms].join(', ')}), ${tops.size} heights (${r.late.map((l) => l.top.toFixed(1)).join(', ')})`);
check(new Set(r.carrierTops.map((t) => Math.round(t * 2))).size >= 3, `five carriers, at least three heights (${r.carrierTops.map((t) => t.toFixed(1)).join(', ')})`);
check(r.row.records === 5 && new Set(r.row.kinds).size === 5, `the row: five buildings of five kinds (${r.row.kinds.join(', ')})`);
check(r.row.draws <= 3 && r.row.tris <= 45000, `the row: ${r.row.draws} draw calls, ${r.row.tris} triangles on low (${r.row.perHouse.map((h) => `${h.kind} ${h.tris}`).join(', ')})`);
check(r.row.roof && Math.abs(r.row.roof.feet - r.row.roof.want) < 0.1, `the row: a walker placed on the Late house's roof stands on it (${r.row.roof ? r.row.roof.feet.toFixed(2) + ' for ' + r.row.roof.want.toFixed(2) : 'no roof floor'})`);
check(errors.length === 0, `no page errors (${errors.length}${errors.length ? ': ' + errors[0] : ''})`);
console.log(`village-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
