// structures: the ruins of the region. Carcanet Keep, the Armiger's Tower, the Cardinal Stones, the
// Sarsen Causeway, the Sunken Court, the Deodand Byre, boundary stones and cairns, and the scattered
// leavings of a long rule (statuary, aqueduct, arches, a shrine, obelisks, a graveyard, stray paving).
// All procedural: weathered primitives merged into one mesh per site, instanced pavers and bones,
// stone shaded in-shader (see structures/materials.js).
import * as THREE from 'three';
import { Builder, makeGround, decorate } from './structures/geo.js';
import { stoneTints, vary, BannerSet, HEX_R } from './structures/common.js';
import { makeStoneMaterial, makeBannerMaterials, makeBoneMaterial, RUST_SLOTS } from './structures/materials.js';
import { buildKeep } from './structures/keep.js';
import { buildCauseway } from './structures/causeway.js';
import { buildTower } from './structures/tower.js';
import { buildStones } from './structures/stones.js';
import { buildCourt } from './structures/court.js';
import { buildByre } from './structures/byre.js';
import { buildMarkers } from './structures/markers.js';
import { buildScatter } from './structures/scatter.js';
import { buildTaverna, TAVERNA } from './structures/taverna.js';
import { buildArches, ARCHES } from './structures/arches.js';

export async function build(ctx) {
  const t0 = performance.now();
  const { scene } = ctx;
  const ground = makeGround(ctx);
  const tints = stoneTints(ctx.palette);
  const stone = makeStoneMaterial(ctx);
  const banners = new BannerSet();
  const rust = [];
  const notes = {};

  // pavers on the shared hex grid; any site may lay them, a cell is laid once
  const paverCells = new Set();
  const paverMats = [];
  const paverCols = [];
  const pRng = ctx.makeRng(4101);
  const _n = new THREE.Vector3(), _q = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  function addPaver(x, z, i, j, o = {}) {
    const key = i + ',' + j;
    if (paverCells.has(key)) return false;
    paverCells.add(key);
    const gy = ground.groundAt(x, z);
    ground.groundNormal(x, z, _n, 0.55);
    const tilt = o.tilt ?? 0.05;
    _q.setFromUnitVectors(UP, _n);
    _e.set((pRng() - 0.5) * tilt, (pRng() - 0.5) * 0.12, (pRng() - 0.5) * tilt);
    _q.multiply(_qt.setFromEuler(_e));
    const sink = o.sink ?? 0.03;
    _p.set(x + (pRng() - 0.5) * 0.04, gy + 0.04 - 0.065 - sink * 0.4 + 0.012, z + (pRng() - 0.5) * 0.04);
    const sc = 0.82 + pRng() * 0.16;
    _s.set(sc, 1, sc);
    paverMats.push(new THREE.Matrix4().compose(_p, _q, _s));
    const base = pRng() < 0.2 ? tints.old : tints.stone;
    paverCols.push(vary(base, pRng, 0.22).multiplyScalar((o.dark ? 0.75 : 0.9) * (0.75 + pRng() * 0.3)));
    return true;
  }

  const env = { ctx, ground, tints, rust, banners, notes, addPaver, rng: null };
  const sites = {};
  // debugging aid: ?sskip=scatter,court leaves those sites out
  const sskip = (new URL(location.href).searchParams.get('sskip') || '').split(',');
  const site = (name, salt, fn) => {
    const ts = performance.now();
    if (sskip.includes(name)) fn = () => null;
    const B = new Builder(ctx.noise);
    env.rng = ctx.makeRng(salt);
    let extra = null;
    try { extra = fn(ctx, B, env); }
    catch (e) { console.error(`[fp] structures: ${name} failed:`, e?.stack || e); }
    sites[name] = { B, ms: performance.now() - ts, extra, tris: B.triangles };
    return B;
  };
  await ctx.progress?.('raising the keep', 0.0);
  site('keep', 1101, buildKeep);
  await ctx.progress?.('laying the causeway', 0.15);
  site('causeway', 1202, buildCauseway);
  await ctx.progress?.('raising the tower', 0.3);
  site('tower', 1303, buildTower);
  await ctx.progress?.('setting the stones', 0.4);
  site('stones', 1404, buildStones);
  await ctx.progress?.('sinking the court', 0.5);
  site('court', 1505, buildCourt);
  await ctx.progress?.('roofing the byre', 0.6);
  site('byre', 1606, buildByre);
  await ctx.progress?.('lighting the lamps', 0.7);
  site('taverna', 1909, buildTaverna);
  site('arches', 2010, buildArches);
  // keep the scatter off the newer landmarks too
  env.taken = [[TAVERNA.x, TAVERNA.z, 26], [ARCHES.x, ARCHES.z, 26]];
  site('markers', 1707, buildMarkers);
  await ctx.progress?.('scattering the rubble', 0.9);
  site('scatter', 1808, buildScatter);

  // ---- meshes ----
  let tris = 0, draws = 0;
  const meshes = [];
  // causeway and markers geometry is sparse; fold them in with the scatter to save draw calls
  const merged = { keep: ['keep'], tower: ['tower'], stones: ['stones'], court: ['court'], byre: ['byre'], taverna: ['taverna'], arches: ['arches'], wide: ['causeway', 'markers', 'scatter'] };
  for (const [name, parts] of Object.entries(merged)) {
    let B = sites[parts[0]].B;
    for (let i = 1; i < parts.length; i++) {
      const o = sites[parts[i]].B;
      const off = B.count;
      for (const k of ['P', 'Nn', 'C', 'U', 'A', 'E', 'L']) for (let q = 0; q < o[k].length; q++) B[k].push(o[k][q]);
      for (let q = 0; q < o.I.length; q++) B.I.push(o.I[q] + off);
      B.count += o.count;
    }
    if (!B.count) continue;
    if (name === 'keep' || name === 'tower' || name === 'taverna') B.weldNormals(0.8);
    const m = new THREE.Mesh(B.build(), stone.mat);
    m.name = 'structures-' + name;
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); meshes.push(m);
    tris += B.triangles; draws++;
  }

  // pavers: one instanced hex prism with a carved ring, moss in the joints
  {
    const r = HEX_R * 0.9;
    const prof = [[r, -0.16], [r, 0.02], [r - 0.035, 0.06], [0.0, 0.068]];
    let g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 6, Math.PI / 6 * 0);
    g = g.toNonIndexed();
    g.computeVertexNormals();
    decorate(g, { course: -r * 0.6, moss: 0.3, mossFn: (x, y, z) => (y < 0.05 ? 1.0 : 0.3), low: 0.6 });
    const im = new THREE.InstancedMesh(g, stone.mat, paverMats.length);
    for (let i = 0; i < paverMats.length; i++) { im.setMatrixAt(i, paverMats[i]); im.setColorAt(i, paverCols[i]); }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.receiveShadow = true; im.castShadow = false;
    im.name = 'structures-pavers';
    scene.add(im);
    tris += (g.attributes.position.count / 3) * paverMats.length; draws++;
  }

  // banners
  let bannerMesh = null, bannerU = null;
  if (banners.count) {
    const bm = makeBannerMaterials(ctx);
    bannerU = bm.uniforms;
    bannerMesh = new THREE.Mesh(banners.build(), bm.mat);
    bannerMesh.customDepthMaterial = bm.depth;
    bannerMesh.castShadow = true; bannerMesh.receiveShadow = true;
    bannerMesh.name = 'structures-banners';
    scene.add(bannerMesh);
    tris += banners.I.length / 3; draws++;
  }

  // bones (the byre) and any other instanced fragments sites asked for
  const boneMat = makeBoneMaterial();
  for (const set of env.instanced || []) {
    if (!set.mats.length) continue;
    const im = new THREE.InstancedMesh(set.geo, set.material === 'stone' ? stone.mat : boneMat, set.mats.length);
    set.mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, set.cols[i]); });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    im.castShadow = !!set.cast; im.receiveShadow = true;
    im.name = 'structures-' + set.name;
    scene.add(im);
    tris += (set.geo.index ? set.geo.index.count : set.geo.attributes.position.count) / 3 * set.mats.length; draws++;
  }
  for (const m of env.extraMeshes || []) { scene.add(m.mesh); tris += m.tris; draws++; }

  // rust sources for the streak shader
  rust.slice(0, RUST_SLOTS).forEach((r, i) => stone.uniforms.uRust.value[i].set(r[0], r[1], r[2], r[3]));
  if (rust.length > RUST_SLOTS) ctx.log(`structures: ${rust.length - RUST_SLOTS} rust sources dropped`);

  // ---- per-frame: glyphs, the tower window, banner wind ----
  const flick = ctx.sky?.flicker || { value: 1 };
  const N2 = ctx.noise.noise2;
  const updates = env.updates || [];
  ctx.registerUpdate((dt, t) => {
    const f = flick.value;
    stone.uniforms.uSTime.value = t;
    // the stones brighten when the sun gutters
    stone.uniforms.uGlyph.value = (0.75 + 0.25 * Math.sin(t * 0.19) + 0.08 * N2(t * 0.13, 4.2)) * (1 + (1 - f) * 1.4);
    // the window: a slow uneven flame, dimming as the sun falters
    const flame = 0.78 + 0.16 * N2(t * 0.55, 1.7) + 0.06 * N2(t * 2.3, 8.1);
    stone.uniforms.uWindow.value = flame * (0.35 + 0.65 * f);
    if (bannerU) bannerU.uBTime.value = t;
    for (const u of updates) u(dt, t, f, flame);
  });

  const ms = performance.now() - t0;
  const per = Object.entries(sites).map(([k, v]) => `${k} ${v.ms.toFixed(0)}ms/${(v.tris / 1000).toFixed(0)}k`).join(', ');
  ctx.log(`structures: ${draws} draw calls, ${(tris / 1000).toFixed(0)}k tris, ${paverMats.length} pavers, built in ${ms.toFixed(0)}ms (${per})`);
  if (notes.keep) ctx.log('structures: gate', JSON.stringify(notes.keep.gate), 'courtyard', JSON.stringify(notes.keep.courtyard));
  if (notes.byre) ctx.log('structures: byre door', JSON.stringify(notes.byre));
  for (const k of ['taverna', 'arches', 'shrine', 'graveyard', 'gibbet']) if (notes[k]) ctx.log(`structures: ${k}`, JSON.stringify(notes[k]));
  ctx.structures = { notes };
}
