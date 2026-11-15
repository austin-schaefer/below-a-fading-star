#!/usr/bin/env node
// The height path, bit for bit, in node (v13 L2): no browser. Imports src/terrain.js (and so everything heightAt calls)
// with 'three' resolved to vendor/ and a stub location, bakes the terrain on low and medium, and samples the queries at
// a few hundred thousand fixed points: the bake's own vertices on both tiers, a jittered grid over the whole square,
// random points, the causeway, every lead, every region's outline, the tarn's and the fen's shores, the river and the
// wall (a spiral from r 284 to 500). Per point: heightAt (exact and under each tier's coarse pass), what it leaves in
// WALL_SAMPLE, slopeAt, normalAt, biomeAt, regionAt, waterLevelAt, causewayDistance, riverAt. Per tier: every baked
// attribute (position, normal, colour, aIce, aWet, aWall, aRock, aGlac). Values are compared by their bits, so -0 and
// +0 differ: identical, not close.
//   node tools/height-check.mjs record [file]   write the recording (default shots/wip/height-check<params>.bin)
//   node tools/height-check.mjs [check] [file]  compare against it: one PASS/FAIL line per group, exit 1 on any FAIL
//   node tools/height-check.mjs bench           µs per call of heightAt, slopeAt, regionAt, biomeAt over the low
//                                               bake's vertices, and the bake's ms (low, medium), median of 3
//   --params=mountains=v4&cols=low   the URL's params (the height path reads them once, at import); recorded apart
//   --quick                          a tenth of the points, no medium bake (a fast loop while working)
// Record on the tree before a change, check after it. A FAIL names the first point that differs and by how much.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const pos = argv.filter((a) => !a.startsWith('--'));
const mode = ['record', 'check', 'bench'].includes(pos[0]) ? pos.shift() : 'check';
const params = flags.params || '';
const quick = !!flags.quick;
const file = pos[0] || `${ROOT}/shots/wip/height-check${params ? '-' + params.replace(/[^a-z0-9]+/gi, '_') : ''}${quick ? '-quick' : ''}.bin`;

const three = pathToFileURL(`${ROOT}/vendor/three/three.module.js`).href, addons = pathToFileURL(`${ROOT}/vendor/three/`).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) {
  if (s === 'three') return { url: ${JSON.stringify(three)}, shortCircuit: true };
  if (s.startsWith('three/addons/')) return { url: ${JSON.stringify(addons)} + s.slice(13), shortCircuit: true };
  return n(s, c);
}`));
globalThis.location = new URL(`http://localhost/?${params}`);
const THREE = await import('three');
const src = (p) => import(pathToFileURL(`${ROOT}/src/${p}`).href);
const T = await src('terrain.js');
const { WALL_SAMPLE } = await src('v4/mountains.js');
const R = await src('v4/regions.js');
const W = await src('world.js');
const routes = await src('v4/paths/routes.js');
const { mulberry32 } = await src('noise.js');

// ---------------------------------------------------------------- the bakes (first: they trace the leads, as the walk does)
const TIERS = quick ? ['low'] : ['low', 'medium'];
const ATTRS = ['position', 'normal', 'color', 'aIce', 'aWet', 'aWall', 'aRock', 'aGlac'];
function bake(q) {
  const t0 = performance.now();
  const t = T.buildTerrain({ scene: new THREE.Scene(), quality: q });
  const ms = performance.now() - t0;
  const geo = t.mesh.geometry;
  return { ms, attrs: Object.fromEntries(ATTRS.map((k) => [k, new Float32Array(geo.attributes[k].array)])), segs: geo.parameters.widthSegments, mesh: geo.attributes.position.array };
}

// ---------------------------------------------------------------- the points
function points(bakes) {
  const P = [];
  const add = (x, z) => P.push(x, z);
  // the bake's vertices (float32, as the mesh holds them)
  for (const b of bakes) for (let i = 0; i < b.mesh.length; i += 3) add(b.mesh[i], b.mesh[i + 2]);
  const S = W.WORLD.size / 2, k = quick ? 0.316 : 1;
  const rnd = mulberry32(13031);
  // a jittered grid, 1.7 m, over the walkable bowl and the wall's foot; and a coarser one over the whole square
  for (let n = Math.round(370 * k), i = 0; i < n; i++) for (let j = 0; j < n; j++) add(-315 + (630 * (i + rnd())) / n, -315 + (630 * (j + rnd())) / n);
  for (let n = Math.round(200 * k), i = 0; i < n; i++) for (let j = 0; j < n; j++) add(-S + (2 * S * (i + rnd())) / n, -S + (2 * S * (j + rnd())) / n);
  // random points
  for (let i = 0; i < 40000 * k; i++) add(-S + 2 * S * rnd(), -S + 2 * S * rnd());
  // along a polyline, every step metres, at offsets across it
  const along = (pts, step, offs) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az) || 1e-6, n = Math.max(1, Math.ceil(L / step));
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let s = 0; s < n; s++) { const t = (s + rnd()) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; for (const o of offs) add(x + nx * o, z + nz * o); }
    }
  };
  const fine = quick ? [-3, 0, 2.5] : [-9, -5, -3.2, -1.5, -0.6, 0, 0.4, 1.1, 2.2, 3.6, 5.5, 8];
  along(W.CAUSEWAY_V4.map((p) => [p.x, p.z]), 0.5 / k, fine);
  for (const L of routes.leads().list) for (const S2 of L.lines) along(S2.map((p) => [p.x, p.z]), 0.7 / k, quick ? [0, 1] : [-2, -0.8, -0.2, 0, 0.3, 1, 2.5]);
  // every region's outline (and the places' rings)
  const ring = (cx, cz, r, step) => { const n = Math.ceil((2 * Math.PI * r) / step); const pts = []; for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos((2 * Math.PI * i) / n), cz + r * Math.sin((2 * Math.PI * i) / n)]); return pts; };
  for (const key of Object.keys(W.REGIONS)) {
    const s = W.REGIONS[key].shape;
    let pts;
    if (s.circle) pts = ring(s.circle.x, s.circle.z, s.circle.r, 1);
    else if (s.ellipse) { pts = []; const e = s.ellipse; for (let i = 0; i <= 600; i++) pts.push([e.x + e.rx * Math.cos((2 * Math.PI * i) / 600), e.z + e.rz * Math.sin((2 * Math.PI * i) / 600)]); }
    else if (s.annulus) { along(ring(s.annulus.x, s.annulus.z, s.annulus.r0, 1), 1 / k, fine); pts = ring(s.annulus.x, s.annulus.z, s.annulus.r1, 1); }
    else if (s.poly) pts = [...s.poly, s.poly[0]];
    else pts = s.strip.map(([x, z]) => [x, z]);
    along(pts, 0.6 / k, s.strip ? [...fine, ...fine.map((o) => o + (s.strip[0][2] || 0)), ...fine.map((o) => o - (s.strip[0][2] || 0))] : fine);
    for (const y of W.REGIONS[key].yields || []) along(ring(y.x, y.z, y.r, 1), 1 / k, fine);
  }
  for (const [cx, cz, r] of [[W.LANDMARKS.wood.x, W.LANDMARKS.wood.z, 95], [70, 160, 75], [W.LANDMARKS.moraine.x, W.LANDMARKS.moraine.z, 50]]) along(ring(cx, cz, r, 1), 1 / k, fine);
  // the water's edges: the tarn, the fen, the pool, the river and its ravine
  for (const r of [50, 58, 62, 70, 85]) along(ring(W.WATER.tarn.x, W.WATER.tarn.z, r, 1), 0.8 / k, [0, 1.3]);
  for (const r of [45, 60, 70, 85, 115]) along(ring(W.WATER.fen.x, W.WATER.fen.z, r, 1), 0.8 / k, [0, 1.3]);
  for (const r of [3, 5, 6.8, 9, 14, 30, 60]) along(ring(W.WATER.pool.x, W.WATER.pool.z, r, 0.5), 0.3 / k, [0]);
  const RL = T.RIVER.line, rl = []; for (let i = 0; i < RL.n; i++) rl.push([RL.X[i], RL.Z[i]]);
  along(rl, 0.5 / k, quick ? [-10, -3, 0, 4, 12] : [-70, -40, -24, -16, -11, -8, -6, -4.5, -3, -1.5, 0, 1, 2.5, 3.8, 5, 7, 9.5, 13, 18, 30, 50, 69]);
  const GL = T.RIVER.gully, gl = []; for (let i = 0; i < GL.n; i++) gl.push([GL.X[i], GL.Z[i]]);
  along(gl, 0.3 / k, [-29, -14, -6, -2.2, -1.7, -0.8, 0, 0.9, 1.8, 3, 8, 16, 29]);
  // the wall: a golden-angle spiral, r 284 to 500
  for (let i = 0, n = 60000 * k; i < n; i++) { const r = 284 + 216 * (i / n), a = i * 2.399963229728653; add(r * Math.cos(a), r * Math.sin(a)); }
  return new Float64Array(P);
}

// ---------------------------------------------------------------- one point's answers
const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
let H = 0;
const mix = (v) => {
  f64[0] = v;
  H = Math.imul(H ^ u32[0], 0x01000193) >>> 0; H = Math.imul(H ^ (H >>> 15), 0x2c1b3c6d) >>> 0;
  H = Math.imul(H ^ u32[1], 0x01000193) >>> 0; H = Math.imul(H ^ (H >>> 13), 0x297a2d39) >>> 0;
};
const GROUPS = ['heightAt', 'WALL_SAMPLE', 'slopeAt', 'normalAt', 'biomeAt', 'regionAt', 'water+causeway+river', 'heightAt coarse'];
const BKEYS = ['moor', 'heath', 'wood', 'marsh', 'shore', 'rock', 'ice', 'orchard', 'crystal', 'slope', 'h'];
const RKEYS = [...R.REGION_KEYS, ...R.PLACE_KEYS, 'moor'];
const PRIMARY = Object.fromEntries([...RKEYS].map((k, i) => [k, i]));
const RIV = ['s', 'd', 'y', 'hw', 'speed', 'tx', 'tz'];
const CELLS = TIERS.map((q) => W.WORLD.size / (q === 'low' ? 320 : 480));
function sample(Pts) {
  const n = Pts.length / 2;
  const h = new Float64Array(n), slope = new Float64Array(n), hash = new Uint32Array(n * GROUPS.length);
  const nv = new THREE.Vector3();
  for (let p = 0; p < n; p++) {
    const x = Pts[2 * p], z = Pts[2 * p + 1], o = p * GROUPS.length;
    WALL_SAMPLE.water = WALL_SAMPLE.mouth = WALL_SAMPLE.hard = WALL_SAMPLE.step = -1;
    h[p] = T.heightAt(x, z);
    H = 0; mix(h[p]); hash[o] = H;
    H = 0; mix(WALL_SAMPLE.water); mix(WALL_SAMPLE.mouth); mix(WALL_SAMPLE.hard); mix(WALL_SAMPLE.step); hash[o + 1] = H;
    slope[p] = T.slopeAt(x, z);
    H = 0; mix(slope[p]); hash[o + 2] = H;
    T.normalAt(x, z, nv); H = 0; mix(nv.x); mix(nv.y); mix(nv.z); hash[o + 3] = H;
    const b = T.biomeAt(x, z); H = 0; for (const k of BKEYS) mix(b[k]); hash[o + 4] = H;
    const w = R.regionAt(x, z); H = 0; for (const k of RKEYS) mix(w[k]); mix(PRIMARY[w.primary]); hash[o + 5] = H;
    H = 0; const wl = T.waterLevelAt(x, z); mix(wl === null ? 7777 : wl); mix(T.causewayDistance(x, z));
    const ri = T.riverAt(x, z); if (ri) { for (const k of RIV) mix(ri[k]); mix(ri.inWater ? 1 : 0); } else mix(-1); hash[o + 6] = H;
    H = 0; for (const c of CELLS) { R.setRegionsCoarse(c); mix(T.heightAt(x, z)); } R.setRegionsCoarse(0); hash[o + 7] = H;
  }
  return { h, slope, hash };
}

// ---------------------------------------------------------------- the file: a JSON header line, then the arrays
function save(rec) {
  const parts = [], head = { params, quick, n: rec.h.length, groups: GROUPS, tiers: TIERS, arrays: [] };
  const put = (name, arr) => { head.arrays.push({ name, type: arr.constructor.name, length: arr.length }); parts.push(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)); };
  put('points', rec.points); put('h', rec.h); put('slope', rec.slope); put('hash', rec.hash);
  for (const t of TIERS) for (const k of ATTRS) put(`${t}.${k}`, rec.bakes[t][k]);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.concat([Buffer.from(JSON.stringify(head) + '\n'), ...parts]));
}
function load() {
  const buf = readFileSync(file), nl = buf.indexOf(10), head = JSON.parse(buf.subarray(0, nl).toString());
  let off = nl + 1; const out = { head };
  for (const a of head.arrays) {
    const C = globalThis[a.type], bytes = a.length * C.BYTES_PER_ELEMENT, copy = new Uint8Array(bytes);
    copy.set(buf.subarray(off, off + bytes)); off += bytes;
    out[a.name] = new C(copy.buffer);
  }
  return out;
}

// ---------------------------------------------------------------- bench
if (mode === 'bench') {
  const ms = { low: [], medium: [] };
  for (let r = 0; r < 3; r++) for (const q of TIERS) ms[q].push(bake(q).ms);
  const med = (a) => [...a].sort((p, q) => p - q)[a.length >> 1];
  const b = bake('low').mesh, n = b.length / 3;
  const time = (name, f) => {
    const runs = [];
    for (let r = 0; r < 3; r++) { const t0 = performance.now(); let s = 0; for (let i = 0; i < b.length; i += 3) s += f(b[i], b[i + 2]); runs.push(((performance.now() - t0) * 1000) / n); if (Number.isNaN(s)) console.log('nan'); }
    console.log(`${name.padEnd(10)} ${med(runs).toFixed(2)} µs a call (runs ${runs.map((v) => v.toFixed(2)).join(', ')}) over ${n} low vertices`);
  };
  time('heightAt', T.heightAt); time('slopeAt', T.slopeAt); time('regionAt', (x, z) => R.regionAt(x, z).moor); time('biomeAt', (x, z) => T.biomeAt(x, z).moor);
  for (const q of TIERS) console.log(`bake ${q.padEnd(6)} ${med(ms[q]).toFixed(0)} ms (runs ${ms[q].map((v) => v.toFixed(0)).join(', ')}; the first carries the JIT's warm-up)`);
  process.exit(0);
}

// ---------------------------------------------------------------- record / check
const t0 = performance.now();
const bakes = {}, meshes = [];
for (const q of TIERS) { const b = bake(q); bakes[q] = b.attrs; meshes.push(b); }
const Pts = points(meshes);
const got = { points: Pts, ...sample(Pts), bakes };
const secs = ((performance.now() - t0) / 1000).toFixed(1);
if (mode === 'record') {
  save(got);
  console.log(`recorded ${got.h.length} points x ${GROUPS.length} groups and ${TIERS.length} bakes (${ATTRS.length} attributes each) to ${file} in ${secs} s`);
  process.exit(0);
}
if (!existsSync(file)) { console.log(`FAIL height-check: no recording at ${file} (run: node tools/height-check.mjs record${params ? ' --params=' + params : ''}${quick ? ' --quick' : ''} on the tree before the change)`); process.exit(1); }
const want = load();
let fails = 0;
const line = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const same = (a, b) => a.length === b.length && Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.byteLength), Buffer.from(b.buffer, b.byteOffset, b.byteLength)) === 0;
line(same(want.points, Pts), `points: the same ${Pts.length / 2} points`);
const n = got.h.length;
for (let g = 0; g < GROUPS.length; g++) {
  let first = -1, count = 0;
  for (let p = 0; p < n; p++) if (want.hash[p * GROUPS.length + g] !== got.hash[p * GROUPS.length + g]) { count++; if (first < 0) first = p; }
  let extra = '';
  if (first >= 0) {
    const x = Pts[2 * first], z = Pts[2 * first + 1];
    extra = ` (first at ${x}, ${z}; heightAt ${want.h[first]} -> ${got.h[first]}, slopeAt ${want.slope[first]} -> ${got.slope[first]})`;
  }
  line(count === 0, `${GROUPS[g]}: ${n} points, ${count} differ${extra}`);
}
for (const q of TIERS) for (const k of ATTRS) {
  const A = want[`${q}.${k}`], B = got.bakes[q][k];
  let count = 0, maxd = 0, first = -1;
  const ua = new Uint32Array(A.buffer), ub = new Uint32Array(B.buffer);
  for (let i = 0; i < A.length; i++) if (ua[i] !== ub[i]) { count++; maxd = Math.max(maxd, Math.abs(A[i] - B[i])); if (first < 0) first = i; }
  line(count === 0 && A.length === B.length, `bake ${q} ${k}: ${A.length} values, ${count} differ${count ? ` (max |d| ${maxd.toExponential(2)}, first at index ${first})` : ''}`);
}
console.log(`height-check: ${fails ? fails + ' FAIL' : 'all PASS'} (${n} points, ${TIERS.length} bakes; ${secs} s; recording ${file})`);
process.exit(fails ? 1 : 0);
