#!/usr/bin/env node
// The height path, bit for bit, in node (v13 L2): no browser. Imports src/terrain.js (and so everything heightAt calls)
// with 'three' resolved to vendor/ and a stub location, bakes the terrain on low and medium, and samples the queries at
// about 1.3 million fixed points: the bake's own vertices on both tiers, a jittered grid over the bowl and a coarser one
// over the whole square, random points, the causeway (and its bed's 7.5 m and 8 m edges), every lead, every region's
// outline and both of its boxes' edges, the landmarks' blocks at their reach (both sides and on it), r 284 and 352,
// z -200, the shores, the river and its ravine, the Span and the icefall's lines, and the wall (a spiral, denser past
// r 315). Per point, every value raw: heightAt (exact and under each tier's coarse pass), what it leaves in
// WALL_SAMPLE, slopeAt, normalAt, biomeAt, regionAt (its own object; and the Tinctures' blend into a caller's object),
// waterLevelAt, causewayDistance, riverAt. Per tier: every baked attribute. Compared as 64-bit (32 for the bake)
// patterns, element for element, so -0 and +0 differ: identical, not close. A hash per group is printed as a summary.
//   node tools/height-check.mjs record [file]   write the recording (default shots/wip/height-check[-params][-quick].bin);
//                                               its header carries the commit it was made at and whether src/ was clean
//   node tools/height-check.mjs [check] [file]  compare against it: a PASS/FAIL line per group and attribute, the first
//                                               differing point and its values; exit 1 on any FAIL
//   node tools/height-check.mjs pure [file]     as a worker would: three refused at import, no location, document or
//                                               window, the params handed in (globalThis.FP_HEIGHT_PARAMS); imports
//                                               src/height/field.js and checks its queries at the recording's points
//   node tools/height-check.mjs purebake [file] the bake as its worker makes it (v13 L3): three refused, no location, document
//                                               or window; the leads traced, then src/height/bake.js's planePositions and
//                                               bakeTerrain on each tier, compared with the recording's position and baked
//                                               attributes (normals are three's, on the page, so not here)
//   node tools/height-check.mjs bench           µs per call of heightAt, slopeAt, regionAt, biomeAt over the low bake's
//                                               vertices, and the node bake's ms (low, medium), median of 3
//   --params=mountains=v4&cols=low   the URL's switches (fixed when the height path loads); record each apart
//   --quick                          about a fifth of the points, no medium bake (a fast loop while working)
// The audit (runtime.md, "height-check"): record with this tool in a worktree at the base commit, check at the tip.
// Also asserts once that |noise2| < 1.1 for the noises the skips' bounds rest on.
import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync, mkdirSync, existsSync, openSync, readSync, writeSync, closeSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flags = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const pos = argv.filter((a) => !a.startsWith('--'));
const mode = ['record', 'check', 'bench', 'pure', 'purebake'].includes(pos[0]) ? pos.shift() : 'check';
const params = flags.params || '';
const quick = !!flags.quick;
const file = pos[0] || `${ROOT}/shots/wip/height-check${params ? '-' + params.replace(/[^a-z0-9]+/gi, '_') : ''}${quick ? '-quick' : ''}.bin`;

const three = pathToFileURL(`${ROOT}/vendor/three/three.module.js`).href, addons = pathToFileURL(`${ROOT}/vendor/three/`).href;
const PURE = mode === 'pure' || mode === 'purebake';
register('data:text/javascript,' + encodeURIComponent(PURE ? `export async function resolve(s, c, n) {
  if (s === 'three' || s.startsWith('three/') || s.includes('vendor/three')) throw new Error('the height path imported three (' + s + ' from ' + c.parentURL + ')');
  return n(s, c);
}` : `export async function resolve(s, c, n) {
  if (s === 'three') return { url: ${JSON.stringify(three)}, shortCircuit: true };
  if (s.startsWith('three/addons/')) return { url: ${JSON.stringify(addons)} + s.slice(13), shortCircuit: true };
  return n(s, c);
}`));
// the switches: a tree from before v13 L2 reads location; src/height/params.js is handed them, as a worker is
globalThis.FP_HEIGHT_PARAMS = `?${params}`;
if (PURE) { for (const g of ['location', 'document', 'window']) if (g in globalThis) delete globalThis[g]; }
else globalThis.location = new URL(`http://localhost/?${params}`);
const THREE = PURE ? null : await import('three');
const src = (p) => import(pathToFileURL(`${ROOT}/src/${p}`).href);
const T = await src(PURE ? 'height/field.js' : 'terrain.js');
const { WALL_SAMPLE } = await src('v4/mountains.js');
const R = await src(PURE ? 'height/regions.js' : 'v4/regions.js');
const W = await src('world.js');
const routes = await src('v4/paths/routes.js');
const N = await src('noise.js');
const ICE = await src('v12/icefall/plan.js');
const { SPAN } = await src('v4/span/plan.js');

const git = (...a) => { try { return execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim(); } catch { return '?'; } };
const TREE = { commit: git('rev-parse', 'HEAD'), srcDirty: git('status', '--porcelain', '--', 'src') !== '', tool: createHash('sha1').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex').slice(0, 12) };

// ---------------------------------------------------------------- |noise2| < 1.1, once (the spurs' skip and the blotches' signs rest on it)
function noiseMax() {
  const rnd = N.mulberry32(77);
  let mx = 0;
  for (const seed of [W.WORLD.seed, W.WORLD.seed + 404]) {
    const S = N.makeSimplex(seed);
    for (let i = 0; i < (quick ? 2e5 : 1e6); i++) { const v = Math.abs(S.noise2(rnd() * 600 - 300, rnd() * 600 - 300)); if (v > mx) mx = v; }
  }
  return mx;
}

// ---------------------------------------------------------------- the bakes (first: they trace the leads, as the walk does)
const TIERS = quick ? ['low'] : ['low', 'medium'];
const ATTRS = ['position', 'normal', 'color', 'aIce', 'aWet', 'aWall', 'aRock', 'aGlac'];
function bake(q) {
  const t0 = performance.now();
  const t = T.buildTerrain({ scene: new THREE.Scene(), quality: q });
  const ms = performance.now() - t0;
  const geo = t.mesh.geometry;
  return { ms, attrs: Object.fromEntries(ATTRS.map((k) => [k, new Float32Array(geo.attributes[k].array)])), mesh: geo.attributes.position.array };
}

// ---------------------------------------------------------------- the points
function points(bakes) {
  const P = [];
  const add = (x, z) => P.push(x, z);
  // the bake's vertices (float32, as the mesh holds them)
  for (const b of bakes) for (let i = 0; i < b.mesh.length; i += 3) add(b.mesh[i], b.mesh[i + 2]);
  const S = W.WORLD.size / 2, k = quick ? 0.316 : 1;
  const rnd = N.mulberry32(13031);
  // a jittered grid, 1.7 m, over the walkable bowl and the wall's foot; and a coarser one over the whole square
  for (let n = Math.round(370 * k), i = 0; i < n; i++) for (let j = 0; j < n; j++) add(-315 + (630 * (i + rnd())) / n, -315 + (630 * (j + rnd())) / n);
  for (let n = Math.round(200 * k), i = 0; i < n; i++) for (let j = 0; j < n; j++) add(-S + (2 * S * (i + rnd())) / n, -S + (2 * S * (j + rnd())) / n);
  for (let i = 0; i < 40000 * k; i++) add(-S + 2 * S * rnd(), -S + 2 * S * rnd());
  // along a polyline, every step metres, at offsets across it
  const along = (pts, step, offs) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az) || 1e-6, n = Math.max(1, Math.ceil(L / step));
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      for (let s = 0; s < n; s++) { const t = (s + rnd()) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; for (const o of offs) add(x + nx * o, z + nz * o); }
    }
  };
  const ring = (cx, cz, r, step) => { const n = Math.ceil((2 * Math.PI * r) / step); const pts = []; for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos((2 * Math.PI * i) / n), cz + r * Math.sin((2 * Math.PI * i) / n)]); return pts; };
  const fine = quick ? [-3, 0, 2.5] : [-9, -5, -3.2, -1.5, -0.6, 0, 0.4, 1.1, 2.2, 3.6, 5.5, 8];
  const edge = [-0.5, -0.01, -1e-6, 0, 1e-6, 0.01, 0.5]; // across a boundary: both sides and on it
  // the causeway, with its bed's reach (7.5 m, the bound at 8 m) on both sides
  along(W.CAUSEWAY_V4.map((p) => [p.x, p.z]), 0.5 / k, [...fine, ...[7.5, 8].flatMap((d) => edge.flatMap((e) => [d + e, -d - e]))]);
  for (const L of routes.leads().list) for (const S2 of L.lines) along(S2.map((p) => [p.x, p.z]), 0.7 / k, quick ? [0, 1] : [-2, -0.8, -0.2, 0, 0.3, 1, 2.5]);
  // every region's outline, and both of its boxes' edges (the tight box for its own blend, the wide one for the air's),
  // computed here from world.js as v13's height/regions.js does, so a tree from before it is sampled at the same edges
  const AIR = 25 / 8;
  for (const key of Object.keys(W.REGIONS)) {
    const s = W.REGIONS[key].shape, hb = W.REGIONS[key].blend / 2;
    let pts;
    if (s.circle) pts = ring(s.circle.x, s.circle.z, s.circle.r, 1);
    else if (s.ellipse) { pts = []; const e = s.ellipse; for (let i = 0; i <= 600; i++) pts.push([e.x + e.rx * Math.cos((2 * Math.PI * i) / 600), e.z + e.rz * Math.sin((2 * Math.PI * i) / 600)]); }
    else if (s.annulus) { along(ring(s.annulus.x, s.annulus.z, s.annulus.r0, 1), 1 / k, fine); pts = ring(s.annulus.x, s.annulus.z, s.annulus.r1, 1); }
    else if (s.poly) pts = [...s.poly, s.poly[0]];
    else pts = s.strip.map(([x, z]) => [x, z]);
    along(pts, 0.6 / k, s.strip ? [...fine, ...fine.map((o) => o + (s.strip[0][2] || 0)), ...fine.map((o) => o - (s.strip[0][2] || 0))] : fine);
    for (const y of W.REGIONS[key].yields || []) along(ring(y.x, y.z, y.r, 1), 1 / k, fine);
    let tight, pp = s.poly || s.strip;
    if (s.circle) tight = [s.circle.x - s.circle.r, s.circle.x + s.circle.r, s.circle.z - s.circle.r, s.circle.z + s.circle.r].map((v, i) => v + (i % 2 ? 1 : -1) * (hb + 1));
    else if (s.ellipse) { const e = s.ellipse, g = 1 + hb / Math.min(e.rx, e.rz); tight = [e.x - e.rx * g - 1, e.x + e.rx * g + 1, e.z - e.rz * g - 1, e.z + e.rz * g + 1]; }
    else if (s.annulus) { const a = s.annulus; tight = [a.x - a.r1 - hb - 1, a.x + a.r1 + hb + 1, a.z - a.r1 - hb - 1, a.z + a.r1 + hb + 1]; }
    else { const w = s.strip ? Math.max(...pp.map((p) => p[2])) : 0, q = w + hb + 1; tight = [Math.min(...pp.map((p) => p[0])) - q, Math.max(...pp.map((p) => p[0])) + q, Math.min(...pp.map((p) => p[1])) - q, Math.max(...pp.map((p) => p[1])) + q]; }
    let ext;
    if (s.circle) ext = [[s.circle.x - s.circle.r, s.circle.z - s.circle.r], [s.circle.x + s.circle.r, s.circle.z + s.circle.r]];
    else if (s.ellipse) ext = [[s.ellipse.x - s.ellipse.rx, s.ellipse.z - s.ellipse.rz], [s.ellipse.x + s.ellipse.rx, s.ellipse.z + s.ellipse.rz]];
    else if (s.annulus) ext = [[s.annulus.x - s.annulus.r1, s.annulus.z - s.annulus.r1], [s.annulus.x + s.annulus.r1, s.annulus.z + s.annulus.r1]];
    else ext = pp.map((p) => [p[0] - (p[2] || 0), p[1] - (p[2] || 0)]).concat(pp.map((p) => [p[0] + (p[2] || 0), p[1] + (p[2] || 0)]));
    const pad = 30 * AIR / 2 + 10, wide = [Math.min(...ext.map((p) => p[0])) - pad, Math.max(...ext.map((p) => p[0])) + pad, Math.min(...ext.map((p) => p[1])) - pad, Math.max(...ext.map((p) => p[1])) + pad];
    for (const [x0, x1, z0, z1] of [tight, wide]) along([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], 0.5 / k, edge);
  }
  for (const [cx, cz, r] of [[W.LANDMARKS.wood.x, W.LANDMARKS.wood.z, 95], [70, 160, 75], [W.LANDMARKS.moraine.x, W.LANDMARKS.moraine.z, 50]]) along(ring(cx, cz, r, 1), 1 / k, fine);
  // the landmarks' blocks at their reach (terrain's beyond(): skipped past sqrt(R² 1.0001 + 1)), and their inner edges;
  // the walls' start (284) and the spurs' (352); every ring with both sides and on it
  const L = W.LANDMARKS, sk = (R) => Math.sqrt(R * R * 1.0001 + 1);
  const rings = [[L.castle, [95, sk(95)]], [L.tower, [66, sk(66)]], [L.stones, [58, sk(58)]], [L.court, [60, sk(60)]], [L.tarn, [60, 70, 96, sk(96)]],
    [L.fen, [85, 115, sk(115)]], [L.orchard, [65, sk(65)]], [{ x: 0, z: 0 }, [284, 352]]];
  for (const [c, rs] of rings) for (const r of rs) along(ring(c.x, c.z, r, 0.5), 0.5 / k, edge);
  // z -200 (the glacier mask's own edge) across the north
  along([[-300, -200], [400, -200]], 0.3 / k, edge);
  // the water's edges: the tarn, the fen, the pool, the river and its ravine
  for (const r of [50, 58, 62, 70, 85]) along(ring(W.WATER.tarn.x, W.WATER.tarn.z, r, 1), 0.8 / k, [0, 1.3]);
  for (const r of [45, 60, 70, 85, 115]) along(ring(W.WATER.fen.x, W.WATER.fen.z, r, 1), 0.8 / k, [0, 1.3]);
  for (const r of [3, 5, 6.8, 9, 14, 30, 60]) along(ring(W.WATER.pool.x, W.WATER.pool.z, r, 0.5), 0.3 / k, [0]);
  const RL = T.RIVER.line, rl = []; for (let i = 0; i < RL.n; i++) rl.push([RL.X[i], RL.Z[i]]);
  along(rl, 0.5 / k, quick ? [-10, -3, 0, 4, 12] : [-70, -40, -24, -16, -11, -8, -6, -4.5, -3, -1.5, 0, 1, 2.5, 3.8, 5, 7, 9.5, 13, 18, 30, 50, 69]);
  const GL = T.RIVER.gully, gl = []; for (let i = 0; i < GL.n; i++) gl.push([GL.X[i], GL.Z[i]]);
  along(gl, 0.3 / k, [-29, -14, -6, -2.2, -1.7, -0.8, 0, 0.9, 1.8, 3, 8, 16, 29]);
  // the Span: along its line across the structure and the gates, and across it at every pier
  along([[-310, SPAN.z], [310, SPAN.z]], 0.5 / k, [-12, -8, -6.8, -4, -1, 0, 1, 4, 6.8, 8, 12]);
  for (const px of SPAN.piers) along([[px, SPAN.z - 30], [px, SPAN.z + 30]], 0.4 / k, [-9, -7, -3, 0, 3, 7, 9]);
  // the icefall: its axis up the notch, the slot, the bridge, the stairs and the lanes
  const axis = []; for (let z = -270; z >= -420; z -= 2) axis.push([ICE.axisX(z), z]);
  along(axis, 0.4 / k, [-40, -20, -8, -3, 0, 3, 8, 20, 40]);
  for (const line of [ICE.SLOT.pts, ICE.BRIDGE.pts, ICE.STAIR.f1, ICE.STAIR.f2, ...Object.values(ICE.LANES)]) along(line.map((p) => [p[0], p[1]]), 0.25 / k, [-4, -1.7, -0.8, 0, 0.8, 1.7, 4]);
  // the wall: a golden-angle spiral, r 284 to 500, and a denser one from r 315 to the terrain's edge
  for (let i = 0, n = 60000 * k; i < n; i++) { const r = 284 + 216 * (i / n), a = i * 2.399963229728653; add(r * Math.cos(a), r * Math.sin(a)); }
  for (let i = 0, n = 200000 * k; i < n; i++) { const r = 315 + 392 * (i / n), a = i * 2.399963229728653 + 0.5; const x = r * Math.cos(a), z = r * Math.sin(a); if (Math.abs(x) <= S && Math.abs(z) <= S) add(x, z); }
  return new Float64Array(P);
}

// ---------------------------------------------------------------- one point's answers, raw, point after point
const BKEYS = ['moor', 'heath', 'wood', 'marsh', 'shore', 'rock', 'ice', 'orchard', 'crystal', 'slope', 'h'];
const RKEYS = [...R.REGION_KEYS, ...R.PLACE_KEYS, 'moor'];
const PRIMARY = Object.fromEntries([...RKEYS].map((k, i) => [k, i]));
const RIV = ['s', 'd', 'y', 'hw', 'speed', 'tx', 'tz'];
const CELLS = TIERS.map((q) => W.WORLD.size / (q === 'low' ? 320 : 480));
const AIRB = 25 / 8;
const GROUPS = [['heightAt', 1], ['WALL_SAMPLE', 4], ['slopeAt', 1], ['normalAt', 3], ['biomeAt', BKEYS.length], ['regionAt', RKEYS.length + 1],
  ['regionAt (the air\'s blend, a caller\'s out)', RKEYS.length + 1], ['water+causeway+river', 3 + RIV.length], ['heightAt coarse', CELLS.length]];
const WIDTH = GROUPS.reduce((a, g) => a + g[1], 0), OFF = []; GROUPS.reduce((a, g) => (OFF.push(a), a + g[1]), 0);
const nv = PURE ? { x: 0, y: 0, z: 0 } : new THREE.Vector3(), outA = {}; // (a tree from before v13 L2 sets a Vector3)
function sampleInto(x, z, V, o) {
  WALL_SAMPLE.water = WALL_SAMPLE.mouth = WALL_SAMPLE.hard = WALL_SAMPLE.step = -1;
  V[o++] = T.heightAt(x, z);
  V[o++] = WALL_SAMPLE.water; V[o++] = WALL_SAMPLE.mouth; V[o++] = WALL_SAMPLE.hard; V[o++] = WALL_SAMPLE.step;
  V[o++] = T.slopeAt(x, z);
  T.normalAt(x, z, nv); V[o++] = nv.x; V[o++] = nv.y; V[o++] = nv.z;
  const b = T.biomeAt(x, z); for (const k of BKEYS) V[o++] = b[k];
  const w = R.regionAt(x, z); for (const k of RKEYS) V[o++] = w[k]; V[o++] = PRIMARY[w.primary];
  const a = R.regionAt(x, z, outA, AIRB); for (const k of RKEYS) V[o++] = a[k]; V[o++] = PRIMARY[a.primary];
  const wl = T.waterLevelAt(x, z); V[o++] = wl === null ? 7777 : wl; V[o++] = T.causewayDistance(x, z);
  const ri = T.riverAt(x, z); if (ri) { for (const k of RIV) V[o++] = ri[k]; V[o++] = ri.inWater ? 1 : 0; } else { for (let j = 0; j <= RIV.length; j++) V[o++] = -1; }
  for (const c of CELLS) { R.setRegionsCoarse(c); V[o++] = T.heightAt(x, z); } R.setRegionsCoarse(0);
}
const CHUNK = 32768;

// ---------------------------------------------------------------- the file: a JSON header line, the points, the bakes, then the samples point after point
function header(n, extra) { return { tree: TREE, params, quick, n, width: WIDTH, groups: GROUPS, tiers: TIERS, attrs: ATTRS, ...extra }; }
function readHead(fd) {
  const b = Buffer.alloc(1 << 16); readSync(fd, b, 0, b.length, 0);
  const nl = b.indexOf(10); return { head: JSON.parse(b.subarray(0, nl).toString()), off: nl + 1 };
}
function readArr(fd, off, C, length) { const a = new C(length); readSync(fd, new Uint8Array(a.buffer), 0, a.byteLength, off); return a; }
const bytes = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);

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

let fails = 0;
const line = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
const t0 = performance.now();
const nm = noiseMax();
line(nm < 1.1, `|noise2| < 1.1: the largest of ${quick ? '400,000' : '2,000,000'} samples of the world's two noises is ${nm.toFixed(5)}`);

// ---------------------------------------------------------------- record
if (mode === 'record') {
  const bakes = {}, meshes = [];
  for (const q of TIERS) { const b = bake(q); bakes[q] = b.attrs; meshes.push(b); }
  const Pts = points(meshes), n = Pts.length / 2;
  mkdirSync(dirname(file), { recursive: true });
  const fd = openSync(file, 'w');
  writeSync(fd, JSON.stringify(header(n, { noiseMax: nm, bakeLens: Object.fromEntries(TIERS.flatMap((q) => ATTRS.map((k) => [`${q}.${k}`, bakes[q][k].length]))) })) + '\n');
  writeSync(fd, bytes(Pts));
  for (const q of TIERS) for (const k of ATTRS) writeSync(fd, bytes(bakes[q][k]));
  const V = new Float64Array(CHUNK * WIDTH);
  for (let p0 = 0; p0 < n; p0 += CHUNK) {
    const m = Math.min(CHUNK, n - p0);
    for (let i = 0; i < m; i++) sampleInto(Pts[2 * (p0 + i)], Pts[2 * (p0 + i) + 1], V, i * WIDTH);
    writeSync(fd, new Uint8Array(V.buffer, 0, m * WIDTH * 8));
  }
  closeSync(fd);
  console.log(`recorded ${n} points x ${WIDTH} values (${GROUPS.length} groups) and ${TIERS.length} bakes x ${ATTRS.length} attributes to ${file} in ${((performance.now() - t0) / 1000).toFixed(1)} s, at ${TREE.commit}${TREE.srcDirty ? ' (src/ NOT clean)' : ' (src/ clean)'}, tool ${TREE.tool}`);
  process.exit(fails ? 1 : 0);
}

// ---------------------------------------------------------------- check / pure
if (!existsSync(file)) { console.log(`FAIL height-check: no recording at ${file} (record on the tree before the change: node tools/height-check.mjs record${params ? ' --params=' + params : ''}${quick ? ' --quick' : ''})`); process.exit(1); }
const fd = openSync(file, 'r');
const { head, off: off0 } = readHead(fd);
const n = head.n;
console.log(`recording ${file}: made at ${head.tree.commit}${head.tree.srcDirty ? ' (src/ NOT clean)' : ' (src/ clean)'} with tool ${head.tree.tool}, params '${head.params}'${head.quick ? ', quick' : ''}; this tree ${TREE.commit}${TREE.srcDirty ? ' (src/ has changes)' : ''}, tool ${TREE.tool}`);
line(head.params === params && head.quick === quick && head.width === WIDTH && JSON.stringify(head.groups) === JSON.stringify(GROUPS) && (PURE || JSON.stringify(head.tiers) === JSON.stringify(TIERS)), `the recording's params, size and groups are this run's`);
if (head.tree.srcDirty) line(false, 'the recording was made with uncommitted changes in src/');
let off = off0;
const Pts = readArr(fd, off, Float64Array, 2 * n); off += Pts.byteLength;
const recBakes = {};
for (const q of head.tiers) for (const k of ATTRS) { const len = head.bakeLens[`${q}.${k}`]; recBakes[`${q}.${k}`] = [off, len]; off += len * 4; }
if (!PURE) {
  const bakes = {}, meshes = [];
  for (const q of TIERS) { const b = bake(q); bakes[q] = b.attrs; meshes.push(b); }
  const mine = points(meshes);
  line(mine.length === Pts.length && Buffer.compare(Buffer.from(bytes(mine)), Buffer.from(bytes(Pts))) === 0, `points: this tree makes the recording's ${n} points (the bake's vertices and the leads included)`);
  for (const q of TIERS) for (const k of ATTRS) {
    const [o, len] = recBakes[`${q}.${k}`], A = readArr(fd, o, Float32Array, len), B = bakes[q][k];
    let count = 0, maxd = 0, first = -1, big = 0, sum = 0;
    const ua = new Uint32Array(A.buffer), ub = new Uint32Array(B.buffer);
    for (let i = 0; i < A.length; i++) if (ua[i] !== ub[i]) { count++; const d = Math.abs(A[i] - B[i]); maxd = Math.max(maxd, d); sum += d; if (d > 1 / 255) big++; if (first < 0) first = i; }
    line(count === 0 && A.length === B.length, `bake ${q} ${k}: ${A.length} values, ${count} differ${count ? ` (max |d| ${maxd.toExponential(2)}, mean |d| of those ${(sum / count).toExponential(2)}, ${big} by more than 1/255; first at index ${first})` : ''}`);
  }
} else (await src('v4/paths/ground.js')).prepareMap(); // the leads, as the bake traces them first
if (mode === 'purebake') { // (v13 L3) the worker's bake: nothing sampled before it, as in the worker
  const B = await src('height/bake.js');
  const segsOf = (q) => (q === 'low' ? 320 : 480);
  for (const q of head.tiers) {
    const P = B.planePositions(W.WORLD.size, segsOf(q)), t1 = performance.now(), baked = B.bakeTerrain(P, segsOf(q), W.WORLD.size), ms = performance.now() - t1;
    for (const k of ATTRS) {
      if (k === 'normal') continue;
      const [o, len] = recBakes[`${q}.${k}`], A = readArr(fd, o, Float32Array, len), Bk = k === 'position' ? P : baked[k];
      let count = 0;
      const ua = new Uint32Array(A.buffer), ub = new Uint32Array(Bk.buffer, Bk.byteOffset, Bk.length);
      for (let i = 0; i < A.length; i++) if (ua[i] !== ub[i]) count++;
      line(count === 0 && A.length === Bk.length, `purebake ${q} ${k}: ${A.length} values, ${count} differ`);
    }
    console.log(`  (the ${q} bake took ${ms.toFixed(0)} ms in node)`);
  }
  console.log(`height-check purebake: ${fails ? fails + ' FAIL' : 'all PASS'} (src/height/bake.js with three refused and no location, document or window)`);
  process.exit(fails ? 1 : 0);
}
// the samples, chunk by chunk: the recording's bits against this tree's, element for element
const want = new Float64Array(CHUNK * WIDTH), got = new Float64Array(CHUNK * WIDTH);
const wb = new BigUint64Array(want.buffer), gb = new BigUint64Array(got.buffer);
const diff = GROUPS.map(() => ({ count: 0, first: null })), hashW = GROUPS.map(() => createHash('sha1')), hashG = GROUPS.map(() => createHash('sha1'));
for (let p0 = 0; p0 < n; p0 += CHUNK) {
  const m = Math.min(CHUNK, n - p0);
  readSync(fd, new Uint8Array(want.buffer, 0, m * WIDTH * 8), 0, m * WIDTH * 8, off + p0 * WIDTH * 8);
  for (let i = 0; i < m; i++) sampleInto(Pts[2 * (p0 + i)], Pts[2 * (p0 + i) + 1], got, i * WIDTH);
  for (let i = 0; i < m; i++) for (let g = 0; g < GROUPS.length; g++) {
    const o = i * WIDTH + OFF[g];
    for (let j = 0; j < GROUPS[g][1]; j++) if (wb[o + j] !== gb[o + j]) {
      const D = diff[g]; D.count++;
      if (!D.first) D.first = { p: p0 + i, x: Pts[2 * (p0 + i)], z: Pts[2 * (p0 + i) + 1], j, want: Array.from(want.subarray(o, o + GROUPS[g][1])), got: Array.from(got.subarray(o, o + GROUPS[g][1])) };
      break;
    }
  }
  for (let g = 0; g < GROUPS.length; g++) for (let i = 0; i < m; i++) { const o = (i * WIDTH + OFF[g]) * 8, e = o + GROUPS[g][1] * 8; hashW[g].update(new Uint8Array(want.buffer, o, e - o)); hashG[g].update(new Uint8Array(got.buffer, o, e - o)); }
}
closeSync(fd);
for (let g = 0; g < GROUPS.length; g++) {
  const D = diff[g], hw = hashW[g].digest('hex').slice(0, 10), hg = hashG[g].digest('hex').slice(0, 10);
  line(D.count === 0, `${PURE ? 'pure ' : ''}${GROUPS[g][0]}: ${n} points x ${GROUPS[g][1]}, ${D.count} points differ (sha1 ${hw} / ${hg})${D.first ? ` first at point ${D.first.p} (${D.first.x}, ${D.first.z}), value ${D.first.j}: ${JSON.stringify(D.first.want)} -> ${JSON.stringify(D.first.got)}` : ''}`);
}
console.log(`height-check${PURE ? ' pure' : ''}: ${fails ? fails + ' FAIL' : 'all PASS'} (${n} points x ${WIDTH} values${PURE ? '; src/height/field.js with three refused and no location, document or window' : `, ${TIERS.length} bakes`}; ${((performance.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
