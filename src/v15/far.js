// The Lappet from far off (v15-P3): one draw, a few thousand triangles, built at load from what the quarters built.
//
// On low the quarters' own meshes are not drawn from more than 150 m off (ctx.lappet.farHidden, src/v15/bones.js:
// from the tops the valley's cost was at its limit), and on every tier the village from 100 m was a few pale specks.
// So this module makes, once the quarters have built, one merged mesh of two things:
// - **a block for every built house** (every record the quarters hand out: ctx.village.row, ctx.lees, ctx.rungs,
//   ctx.quarrels, ctx.pennyworth): its walls a box fitted to the vertices the quarter actually drew inside its plot
//   (so a house moved, widened or re-roofed by its quarter moves here with it), in the mean colour of those walls,
//   with a roof slab in the mean colour of its roof. Drawn only on low, from 140 m out, inside the near house (each
//   face 0.25 m in), so when the near meshes go at 150 m the block is already standing where the house stood.
// - **a speck for every light the village shows**: the quarters' emissive vertices (lamp glass, lit panes, the noon
//   glow of the fountain and the carriers; not the limewash's own paleness, channel 2) gathered on a grid into
//   points of light in their real places and colours. A speck is drawn from 60 m out on every tier and grows with
//   distance so it never falls under about a pixel and a half: what a village under the keep's shadow is seen by
//   from the road is its windows at different heights up the steps.
// The far mesh's material is a Lambert with two attributes: aCen (a piece's centre, and its kind: -1 a block, else a
// speck's radius) and aGlow (a speck's light). Its vertex shader draws a block at full size or not at all (uBox) and
// a speck scaled about its centre by its distance from the eye; its fragment adds aGlow as emitted light.
// ctx.lappetFar = { mesh, boxes: [{ name, kind, x, y, z, yaw, w, d, h, wall, roof }], specks: [{ x, y, z, r, c }],
//   lamps: the lamp records the quarters gave (for village-test), state(), stats() }. ?lappetfar=0 off.
// How a new building gets in: hand its record (src/v15/houses/kit.js site()) out in its quarter's `records` and push its
// meshes onto ctx.lappet.farHidden; nothing here names a plot or a place (world-code runtime.md, "The Lappet far").
import * as THREE from 'three';

const QUARTERS = ['lappet', 'quarrels', 'rungs', 'lees', 'pennyworth', 'villagerow'];
const BOX_IN = 10; // m inside lappet.FAR (150) that the blocks stand up on low, hidden in the near houses until those go
const SPECK_NEAR = 60; // a speck is nothing nearer than this, full from 1.6 x it
const PX = 3; // a speck's least radius on the screen, in pixels at 720 lines
const FAR_GLOW = 2.0; // a speck's light, times its own, from 150 m (from 1x at 60 m): what is a window at arm's length is a town's lights from the road
// #1712 (the owner: "glow of village lights is as bright as the sun"): a speck held at PX pixels is drawn larger than
// its light, so its light is divided by the square root of how much it was enlarged (by the whole of it, the village
// from 300 m was a few grey dots); and no speck is brighter than CAP (linear luminance, the scene before bloom): far
// under bloom's threshold (0.88), so a speck never haloes, and a quarter of the lit sun's disc (about 1.2 at its
// brightest). In a gutter the sun's disc falls to about 0.42 (held at 0.3); the specks' light is turned up (uGlow)
// and their cap rises to CAP_GUTTER as the lamps answer, just under 0.9 of the dimmed sun: the village holds, brighter
// than it was, while the world dims round it (village-test's #1712 rows).
const CAP = 0.3, CAP_GUTTER = 0.37;
const CELL = 0.9; // the grid lights are gathered on, m
const INSET = 0.25;
const CARRY = 330; // m: on low the far mesh, the fountain's glow and the kiln's smoke are drawn out to here (bones.js drops the ways' timber at the same)

export async function build(ctx) {
  const url = new URL(location.href);
  if (url.searchParams.get('lappetfar') === '0') { ctx.lappetFar = { off: true }; return; }
  if (ctx.built) await Promise.all(QUARTERS.map((n) => ctx.built(n)));
  const lap = ctx.lappet;
  if (!lap || lap.on === false || !lap.farHidden?.length) { ctx.lappetFar = { off: true }; return; }
  const low = ctx.quality === 'low', C = lap.middle, plan = lap.plan;

  const t0 = performance.now();
  // ---------------------------------------------------------------- what the quarters built
  const records = [];
  const take = (list, quarter) => { for (const R of list || []) if (R && R.plot && R.W) records.push({ R, quarter }); };
  take(ctx.village?.row?.records, 'strake');
  take(ctx.lees?.records, 'lees');
  take(ctx.rungs?.records && Object.values(ctx.rungs.records), 'rungs');
  take(ctx.quarrels?.records, 'quarrels');
  take(ctx.pennyworth?.records, 'pennyworth');
  const meshes = []; // (what is solid: a glow's sheets, additive, are no house's walls)
  for (const o of lap.farHidden) o.traverse?.((m) => { if (m.isMesh && m.geometry?.attributes?.position && !m.material?.transparent) meshes.push(m); });
  // What carries on its own from far off stays drawn on low out to 330 m (one draw each, a few hundred triangles; past
  // that the ways' timber goes too, bones.js, and the west gallery's frame is at its limit): the fountain's noon glow
  // (unfogged, additive: the shaft over the square) and the kiln's smoke, lit from under at its throat. Taken off
  // farHidden before the first frame.
  const carry = [ctx.lees?.meshes?.[1], ctx.scene.getObjectByName('quarrels-air')].filter((m) => m && lap.farHidden.includes(m));
  for (const m of carry) lap.farHidden.splice(lap.farHidden.indexOf(m), 1);

  // each record's frame (site(): local +z out of its front), and a grid of them for the vertex pass
  const G = 4, grid = new Map(), key = (i, j) => i * 4096 + j;
  const rec = records.map(({ R, quarter }, idx) => {
    const p = R.plot, c = Math.cos(p.yaw), s = Math.sin(p.yaw), hw = p.w / 2 + 0.4, hd = p.d / 2 + 0.4, rr = Math.hypot(hw, hd);
    // how high to look: the maker's own height (R.top; a Late house's roof, R.roof, and its parapet), never above the
    // tread a stacked house's roof is (the plan's `roof`, for the Late and undercroft makers, whose roof that tread is):
    // what stands on that is the next house's
    const pl = R.name && plan.plot(R.name), tread = pl && pl.roof && (R.kind === 'late' || R.kind === 'undercroft') ? plan.LEVEL[pl.roof].y + 0.35 : Infinity;
    const own = R.top > 0 ? p.y + R.top + 0.4 : R.roof ? p.y + R.roof.y + 1.0 : p.y + 8;
    const e = { idx, R, quarter, name: R.name || `${quarter}-${R.kind}-${idx}`, p, c, s, hw, hd, cap: Math.min(own, tread),
      x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, top: -Infinity, wall: [0, 0, 0, 0], roof: [0, 0, 0, 0] };
    for (let i = Math.floor((p.x - rr) / G); i <= Math.floor((p.x + rr) / G); i++) for (let j = Math.floor((p.z - rr) / G); j <= Math.floor((p.z + rr) / G); j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(e);
    }
    return e;
  });

  // one pass over every vertex the quarters drew: fit each record's walls and gather the lights
  const cells = new Map(), v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let nv = 0;
  for (const m of meshes) {
    nv += m.geometry.attributes.position.count;
    m.updateWorldMatrix(true, false);
    const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, Cc = g.attributes.color, E = g.attributes.aEmit;
    const ident = m.matrixWorld.equals(IDENT);
    nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); if (!ident) v.applyMatrix4(m.matrixWorld);
      // a light: lamp glass, a lit pane, the noon glow (channel 2, the limewash's paleness, is not a light)
      if (E) {
        const er = E.getX(i), eg = E.getY(i), eb = E.getZ(i), ch = E.getW(i);
        if (er + eg + eb > 0.3 && ch < 1.5) {
          const k = `${Math.floor(v.x / CELL)},${Math.floor(v.y / CELL)},${Math.floor(v.z / CELL)}`;
          let q = cells.get(k); if (!q) cells.set(k, (q = { n: 0, x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }));
          q.n++; q.x += v.x; q.y += v.y; q.z += v.z; q.r += er; q.g += eg; q.b += eb;
          q.lo[0] = Math.min(q.lo[0], v.x); q.lo[1] = Math.min(q.lo[1], v.y); q.lo[2] = Math.min(q.lo[2], v.z);
          q.hi[0] = Math.max(q.hi[0], v.x); q.hi[1] = Math.max(q.hi[1], v.y); q.hi[2] = Math.max(q.hi[2], v.z);
          continue;
        }
      }
      const list = grid.get(key(Math.floor(v.x / G), Math.floor(v.z / G))); if (!list) continue;
      for (const e of list) {
        if (v.y < e.p.y - 0.6 || v.y > e.cap) continue;
        const dx = v.x - e.p.x, dz = v.z - e.p.z, lx = dx * e.c - dz * e.s, lz = dx * e.s + dz * e.c;
        if (Math.abs(lx) > e.hw || Math.abs(lz) > e.hd) continue;
        if (lx < e.x0) e.x0 = lx; if (lx > e.x1) e.x1 = lx; if (lz < e.z0) e.z0 = lz; if (lz > e.z1) e.z1 = lz;
        if (v.y > e.top) e.top = v.y;
        if (N && Cc) {
          n.fromBufferAttribute(N, i); if (!ident) n.applyMatrix3(nm).normalize();
          const acc = n.y > 0.75 ? e.roof : Math.abs(n.y) < 0.4 ? e.wall : null;
          if (acc) { acc[0] += Cc.getX(i); acc[1] += Cc.getY(i); acc[2] += Cc.getZ(i); acc[3]++; }
        }
      }
    }
  }

  // ---------------------------------------------------------------- the blocks
  const pos = [], nor = [], col = [], cen = [], glow = [];
  const boxes = [];
  const quad = (a, b, c, d, nx, ny, nz, rgb, ce) => { for (const q of [a, b, c, a, c, d]) { pos.push(q[0], q[1], q[2]); nor.push(nx, ny, nz); col.push(rgb[0], rgb[1], rgb[2]); cen.push(ce[0], ce[1], ce[2], -1); glow.push(0, 0, 0); } };
  // a box in a record's frame: local x0..x1, z0..z1, world y0..y1; sides and top (no floor)
  const box = (e, x0, x1, z0, z1, y0, y1, side, top) => {
    const W = (lx, y, lz) => [e.p.x + lx * e.c + lz * e.s, y, e.p.z - lx * e.s + lz * e.c];
    const ce = W((x0 + x1) / 2, y0, (z0 + z1) / 2);
    const a = W(x0, y0, z1), b = W(x1, y0, z1), c = W(x1, y1, z1), d = W(x0, y1, z1); // front (+z)
    const a2 = W(x1, y0, z0), b2 = W(x0, y0, z0), c2 = W(x0, y1, z0), d2 = W(x1, y1, z0); // back
    const fz = [e.s, 0, e.c], fx = [e.c, 0, -e.s];
    quad(a, b, c, d, fz[0], 0, fz[2], side, ce);
    quad(a2, b2, c2, d2, -fz[0], 0, -fz[2], side, ce);
    quad(b, a2, d2, c, fx[0], 0, fx[2], shade(side, 0.92), ce);
    quad(b2, a, d, c2, -fx[0], 0, -fx[2], shade(side, 0.92), ce);
    quad(d, c, d2, c2, 0, 1, 0, top, ce);
  };
  for (const e of rec) {
    if (!(e.x1 > e.x0 && e.z1 > e.z0 && e.top > e.p.y + 0.5)) continue; // (nothing of it drawn: a yard, a plot left empty)
    const wall = mean(e.wall, [0.75, 0.7, 0.62]), roof = mean(e.roof, shade(wall, 0.8));
    const x0 = e.x0 + INSET, x1 = e.x1 - INSET, z0 = e.z0 + INSET, z1 = e.z1 - INSET;
    if (x1 - x0 < 0.4 || z1 - z0 < 0.4) continue;
    const y0 = e.p.y - 1.2, h = e.top - e.p.y, y1 = e.p.y + Math.max(0.6, h - 0.45);
    box(e, x0, x1, z0, z1, y0, y1, wall, roof);
    // its roof: a slab a hand proud of the walls, in the roof's colour (a flat Late roof, an Elder lintel, a carrier's back)
    box(e, x0 - 0.1, x1 + 0.1, z0 - 0.1, z1 + 0.1, y1 - 0.02, y1 + 0.2, shade(roof, 0.85), roof);
    boxes.push({ name: e.name, kind: e.R.kind, quarter: e.quarter, x: e.p.x, y: e.p.y, z: e.p.z, yaw: e.p.yaw, w: x1 - x0, d: z1 - z0, h: y1 + 0.2 - e.p.y, wall, roof });
  }
  const boxTris = pos.length / 9;

  // ---------------------------------------------------------------- the specks
  const specks = [];
  for (const q of cells.values()) {
    const x = q.x / q.n, y = q.y / q.n, z = q.z / q.n, k = 1 / q.n;
    const r = Math.min(0.5, Math.max(0.12, 0.5 * Math.max(q.hi[0] - q.lo[0], q.hi[1] - q.lo[1], q.hi[2] - q.lo[2])));
    specks.push({ x, y, z, r, c: [q.r * k, q.g * k, q.b * k] });
  }
  // two cells' halves of one pane are one light
  specks.sort((a, b) => a.x - b.x);
  for (let i = 0; i < specks.length; i++) {
    const a = specks[i]; if (a.gone) continue;
    for (let j = i + 1; j < specks.length && specks[j].x - a.x < 0.7; j++) {
      const b = specks[j]; if (b.gone || Math.abs(b.y - a.y) > 0.7 || Math.abs(b.z - a.z) > 0.7) continue;
      a.x = (a.x + b.x) / 2; a.y = (a.y + b.y) / 2; a.z = (a.z + b.z) / 2; a.r = Math.min(0.5, Math.max(a.r, b.r) + 0.1);
      a.c = [Math.max(a.c[0], b.c[0]), Math.max(a.c[1], b.c[1]), Math.max(a.c[2], b.c[2])]; b.gone = true;
    }
  }
  const lit = specks.filter((s) => !s.gone);
  for (const s of lit) {
    const O = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const F = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
    for (const f of F) for (const i of f) {
      const o = O[i]; pos.push(s.x + o[0] * s.r, s.y + o[1] * s.r, s.z + o[2] * s.r); nor.push(o[0], o[1], o[2]);
      col.push(0, 0, 0); cen.push(s.x, s.y, s.z, s.r); glow.push(s.c[0], s.c[1], s.c[2]);
    }
  }

  // ---------------------------------------------------------------- the mesh
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aCen', new THREE.Float32BufferAttribute(cen, 4));
  g.setAttribute('aGlow', new THREE.Float32BufferAttribute(glow, 3));
  g.computeBoundingSphere(); g.boundingSphere.radius += 2;
  const U = { uBox: { value: 0 }, uPx: { value: 0.002 }, uNear: { value: SPECK_NEAR }, uGlow: { value: 1 }, uCap: { value: CAP } };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aCen; attribute vec3 aGlow; uniform float uBox, uPx, uNear, uGlow, uCap; varying vec3 vFarGlow;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { float k, grow = 1.0; float dist = distance(aCen.xyz, cameraPosition);
          if (aCen.w < 0.0) k = uBox;
          else { grow = max(1.0, dist * uPx / aCen.w); k = grow * smoothstep(uNear, uNear * 1.6, dist); }
          transformed = aCen.xyz + (transformed - aCen.xyz) * k;
          vec3 gl = aGlow * uGlow * mix(1.0, ${FAR_GLOW.toFixed(2)}, smoothstep(uNear, 150.0, dist)) / sqrt(grow);
          float L = dot(gl, vec3(0.2126, 0.7152, 0.0722));
          vFarGlow = L > uCap ? gl * (uCap / L) : gl; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFarGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vFarGlow;');
  };
  mat.customProgramCacheKey = () => 'lappet-far-v4';
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'lappet-far'; mesh.castShadow = false; mesh.receiveShadow = true; mesh.userData.noFar = true;
  ctx.scene.add(mesh);

  // ---------------------------------------------------------------- each frame: the blocks on low from 140 m, a speck's least size
  let boxOn = false, carryGone = false;
  ctx.registerUpdate((dt, t) => {
    // the angle PX pixels subtend on a 720-line frame: a speck is the same share of the view at any resolution
    U.uPx.value = (PX * 2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) / 2)) / 720;
    const answer = ctx.sky?.flicker?.lampsAt?.(C.x, C.z) ?? 0;
    U.uCap.value = CAP + (CAP_GUTTER - CAP) * answer;
    U.uGlow.value = (0.92 + 0.05 * Math.sin(t * 1.7) + 0.03 * Math.sin(t * 5.3)) * (1 + 1.4 * answer); // turned up in a gutter, as near (v16-S1), when the wave reaches the village (v16-S2): from the heights it pricks out
    if (low) {
      const p = ctx.camera.position, d = Math.hypot(p.x - C.x, p.z - C.z), on = d > lap.FAR - BOX_IN, gone = d > CARRY;
      if (on !== boxOn) { boxOn = on; U.uBox.value = on ? 1 : 0; }
      if (gone !== carryGone) { carryGone = gone; for (const m of carry) m.visible = !gone; mesh.visible = !gone; } // (and the far mesh itself: the west gallery's frame, 400 m off, is at its 364 calls)
    }
  });

  const lamps = lampRecords(ctx, records);
  ctx.lappetFar = {
    mesh, boxes, specks: lit, lamps, records: rec.map((e) => e.name), uniforms: U,
    state: () => ({ boxes: U.uBox.value, px: U.uPx.value }),
    stats: () => ({ draws: 1, triangles: pos.length / 9, blocks: boxes.length, blockTris: boxTris, specks: lit.length, meshes: meshes.length }),
  };
  ctx.log?.(`lappetfar: built in ${(performance.now() - t0).toFixed(0)} ms (${nv} vertices read): ${boxes.length} blocks of ${records.length} records, ${lit.length} specks, ${pos.length / 9} tris, from ${meshes.length} meshes`);
}

const IDENT = new THREE.Matrix4();
const mean = (a, d) => (a[3] > 0 ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : d);
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

// every lamp a quarter says it hung: the records' brackets and the Pennyworth's own list (village-test checks a
// speck stands within a metre of each)
function lampRecords(ctx, records) {
  const out = [];
  for (const { R } of records) for (const l of R.lamps || []) out.push({ x: l.x, y: l.y, z: l.z });
  for (const l of ctx.pennyworth?.lamps || []) if (!out.some((o) => Math.abs(o.x - l.x) < 0.05 && Math.abs(o.z - l.z) < 0.05)) out.push({ x: l.x, y: l.y, z: l.z });
  return out;
}
