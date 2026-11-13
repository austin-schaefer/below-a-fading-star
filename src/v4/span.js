// W. The Great Span [Proposed] (v4; replaces the Trigon Span): a single straight span across the south of the
// bowl along z = 215, from a shut gate in the west wall to a gate blocked by rockfall in the east, its deck at
// y 56 on ten piers, cyclopean engineering etched with triangles that each hold three more (span/etch.js).
// Three bays have fallen (the old Span's hollow and the tarn's south bay, the fen's south reach, the canyon's
// mouth) and lie below in bay-sized pieces; a crack at x -45 can be jumped at a run, or crossed on a fallen coping. A stair climbs to the deck
// beside each gate in switchbacks; at the foot of the west gate a door of human size stands ajar, the Postern
// (BG), plainly made later and smaller by someone else. The plan (every measure) is span/plan.js; the terrain's
// marked blocks call its spanGround(), the vegetation keeps off spanClear().
//
// Draw calls at high: the body, the gates, the crags, the stairs, the doors, the metal, the Postern's frame, the
// boulders, the rubble. The parts are span/deck.js, gates.js, postern.js, stairs.js, fallen.js, each filling the shared lists in K.
// ctx.span: { plan, stairs, slabs, deckAt(x, z), vestigeAt(x, z), vestiges (the three bays' ways), crackWay, floorAt(x, z), stats(), meshes, colliders }.
import * as THREE from 'three';
import { SPAN, BOT, deckAt } from './span/plan.js';
import { mergeGeometries } from './kit/merge.js';
import { etch } from './span/etch.js';
import { buildDeck } from './span/deck.js';
import { buildGates, boulderGeometry } from './span/gates.js';
import { buildPostern } from './span/postern.js';
import { buildStairs } from './span/stairs.js';
import { buildFallen } from './span/fallen.js';
import { buildVestige } from './span/vestige.js';
import { buildCamp } from './span/camp.js';
import { vestigeAt, VESTIGES, CRACK_WAY } from './span/vestige-plan.js';

const Y = SPAN.deckY;

export async function build(ctx) {
  const { scene, terrain, kit } = ctx;
  const hi = ctx.quality !== 'low';
  const rng = ctx.makeRng(9301);
  const jit = (a) => (rng() - 0.5) * 2 * a;
  const H = (x, z) => terrain.heightAt(x, z);
  const colliders = [];
  const addCol = (c) => { colliders.push(c); ctx.addCollider(c); };
  // a ragged break from (x0, y0) up to (x1, y1), its x never past `limit` toward `side` (so a gap only widens)
  const ragged = (x0, y0, x1, y1, n, amp, side, limit) => {
    const o = [];
    for (let i = 1; i < n; i++) {
      const t = i / n; let x = x0 + (x1 - x0) * t + jit(amp); const y = y0 + (y1 - y0) * t + jit(amp * 0.6);
      if (side < 0) x = Math.min(x, limit); else x = Math.max(x, limit);
      o.push([x, y]);
    }
    return o;
  };
  const rubble = [];
  const addRubble = (x, z, s, y = null) => rubble.push({ x, z, y: y ?? H(x, z) - s * 0.3, sx: s * (0.7 + rng() * 0.6), sy: s * (0.5 + rng() * 0.5), sz: s * (0.7 + rng() * 0.6), ry: rng() * 6.28, rx: jit(0.25), rz: jit(0.25) });

  // ---------------------------------------------------------------- materials
  const stone = kit.masonry({ color: '#6c625a', course: 2.4, base: BOT, wear: 0.7, moss: 0.45, inlay: 'bronze', inlayEvery: 0.07 });
  etch(stone.mat, { size: 24, x0: 0, y0: Y - 2 * 24 * 0.8660254, amount: 0.5 });
  const gate = kit.masonry({ color: '#655b53', course: 4.4, base: Y, slab: 5, wear: 0.6, moss: 0.3 });
  etch(gate.mat, { size: 30, x0: 0, y0: Y, amount: 0.45 });
  const stairStone = kit.masonry({ color: '#71675f', course: 1.25, base: BOT, slab: 1.7, wear: 0.85, moss: 0.55 });
  etch(stairStone.mat, { size: 12, x0: 0, y0: 0, amount: 0.35 });
  const doorStone = kit.masonry({ color: '#5b534b', course: 3, base: Y, wear: 0.25, moss: 0.08, inlay: 'bronze', inlayEvery: 0.45 });
  etch(doorStone.mat, { size: 9, x0: 0, y0: Y + 0.25, amount: 0.6 });
  // the Postern's surround: a different, smaller stone, laid by other hands
  const lesser = kit.masonry({ color: '#8a7e6a', course: 0.3, base: Y, slab: 0.45, joint: 0.06, wear: 0.35, moss: 0.25 });
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.6 });
  const rockMat = new THREE.MeshStandardMaterial({ color: '#4d4743', roughness: 0.96, metalness: 0, flatShading: true });
  const cragMat = new THREE.MeshStandardMaterial({ color: '#3d3a3b', roughness: 1, metalness: 0, flatShading: true });
  const crags = [];

  const body = [], gates = [], stairs = [], doors = [], metals = [], posterns = [];
  const paint = (g, hex) => { // vertex colours for the metal mesh
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  };
  const K = { ctx, hi, rng, jit, H, addCol, ragged, rubble, addRubble, paint, body, gates, crags, stairs, doors, metals, posterns };
  await ctx.progress?.('raising the span', 0.1);
  buildDeck(K);
  await ctx.progress?.('raising the span', 0.3);
  buildGates(K);
  buildPostern(K);
  await ctx.progress?.('raising the span', 0.45);
  buildStairs(K);
  await ctx.progress?.('raising the span', 0.6);
  buildFallen(K);
  buildVestige(K); buildCamp(K); // v12-H1: the thin ways over the fallen bays and the find on the middle deck
  ctx.addWalkable(vestigeAt);
  await ctx.progress?.('raising the span', 0.85);
  const { boulders = [], stairInfo = {}, walkParts = [], partY = () => null, slabInfo = [] } = K;

  // ---------------------------------------------------------------- meshes
  const meshes = [];
  const addMesh = (geos, mat, name, shadow = true) => {
    if (!geos.length) return null;
    const g = mergeGeometries(geos);
    for (const q of geos) q.dispose();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.name = name; m.castShadow = shadow; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix();
    scene.add(m); meshes.push(m);
    return m;
  };
  addMesh(body, stone.mat, 'span-body');
  addMesh(gates, gate.mat, 'span-gates');
  addMesh(crags, cragMat, 'span-crags');
  addMesh(stairs, stairStone.mat, 'span-stairs');
  addMesh(doors, doorStone.mat, 'span-doors');
  addMesh(metals, metal, 'span-metal', false);
  addMesh(posterns, lesser.mat, 'span-postern', false);
  const inst = (geo, mat, list, name, shadow) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    const q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), M = new THREE.Matrix4();
    list.forEach((b, i) => { e.set(b.rx || 0, b.ry || 0, b.rz || 0); q.setFromEuler(e); m.setMatrixAt(i, M.compose(p.set(b.x, b.y, b.z), q, sc.set(b.sx, b.sy, b.sz))); });
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
    m.name = name; m.castShadow = shadow; m.receiveShadow = true;
    scene.add(m); meshes.push(m);
    return m;
  };
  const bg = boulderGeometry(ctx, hi);
  inst(bg, rockMat, boulders, 'span-rockfall', true);
  inst(new THREE.BoxGeometry(1, 1, 1), stone.mat, rubble, 'span-rubble', hi);
  // ---------------------------------------------------------------- ctx.span
  const floorAt = (x, z) => {
    let best = deckAt(x, z);
    const vy = vestigeAt(x, z); if (vy !== null && (best === null || vy > best)) best = vy;
    for (const w of walkParts) { const y = partY(w, x, z); if (y !== null && (best === null || y > best)) best = y; }
    return best;
  };
  const trisOf = (m) => { const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3; return t * (m.isInstancedMesh ? m.count : 1); };
  ctx.span = {
    plan: SPAN, stairs: stairInfo, slabs: slabInfo, deckAt, vestigeAt, vestiges: VESTIGES, crackWay: CRACK_WAY, floorAt, meshes: meshes.concat(K.vestigeMeshes || [], K.campMeshes || []), colliders,
    stats: () => ({ calls: meshes.length, shadowCalls: meshes.filter((m) => m.castShadow).length, tris: meshes.reduce((s, m) => s + trisOf(m), 0), colliders: colliders.length, boulders: boulders.length, rubble: rubble.length, slabs: slabInfo.length }),
  };
  ctx.log?.('span', JSON.stringify(ctx.span.stats()));
}
