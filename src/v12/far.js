// Small things far off (v12 H5): from the tops (the Span's deck, the Diffident Stair, the glacier's shelf, the west
// gallery) the whole valley is in view at once, and on low that was twice the floor's triangles and draw calls, most of
// them in things a phone draws one or two pixels big: pavers, wall stones, cushions, beetles, horsetails, a figure on a
// far road. So, at the tiers that ask for it, anything a world module drew that is small on the screen is drawn
// smaller and then not at all, by its true distance from the eye (height included) against its own size:
//   px = radius / distance × (buffer pixels per radian of the view)
// Between `hi` and `lo` pixels it shrinks about its own origin (instances) or centre (meshes) with a smoothstep, so it
// goes to nothing; below `lo` it is not drawn. Nothing pops: a thing leaves at a pixel or two, already shrinking.
// - Instanced meshes (two instances or more, each under 4 m across): a stand-in InstancedMesh (same material,
//   the geometry's index and per-vertex attributes shared, its own per-instance ones) is drawn in the original's place,
//   holding only the instances big enough to see, packed again when the eye has moved 2 m or the module has written
//   its instances (a version change). The module's own mesh and buffers are never touched: it is swapped out only
//   while the scene renders (scene.onBeforeRender / onAfterRender), so every module, tool and toggle sees it as built.
// - Single meshes under 6 m across with no children: hidden, or their world matrix scaled about their centre, for the
//   render only, and restored after it.
// Core objects (the terrain, the sky, the ranges) and anything not added by a world module are left
// alone; anything that glows (a bright unlit material, additive blending, an emissive colour) goes only at a
// quarter of the band's size, so a lamp still reads as a point from a top.
// Tiers: low shrinks from 2.4 px and drops at 1.2 px, medium from 1 px to 0.5 px, high is untouched. ?far=0 off at every
// tier; ?far=lo,hi (pixels) sets both at any tier. installFar runs after the modules build and before the
// warm-up (which draws every stand-in once, full, so none uploads later); start() after the warm-up turns it on.
// ctx.far: { stats(), active }.
const TIERS = { low: [1.2, 2.4], medium: [0.5, 1.0], high: null };
const MIN_INST = 2, MAX_INST_R = 2, MAX_MESH_R = 3, STEP = 2;
const M3 = [0, 1, 2, 4, 5, 6, 8, 9, 10]; // the 3x3 of a world matrix
const GLOW = 2; // a light is kept down to half the band: a lamp reads as a point long after its body would
const BUDGET = 9000; // instances packed a frame at most (round robin over the meshes that want it)

export function installFar(ctx, url) {
  const p = url.searchParams.get('far');
  let band = TIERS[ctx.quality] || null;
  if (p === '0') band = null;
  else if (p && /^[\d.]+,[\d.]+$/.test(p)) band = p.split(',').map(Number);
  const api = { active: false, start() {}, stats: () => ({ off: true }) };
  ctx.far = api;
  if (!band) return api;
  const [LO, HI] = band;
  const THREE = ctx.THREE, scene = ctx.scene, renderer = ctx.renderer, camera = ctx.camera;
  const inst = [], singles = [];
  const v3 = new THREE.Vector3(), m4 = new THREE.Matrix4(), size = new THREE.Vector2();

  // a light (a lamp, a lit window, a glow) stays at every distance: a point of light is what reads from a top
  const glows = (m) => (Array.isArray(m) ? m.some(glows) : !!m && (m.blending === THREE.AdditiveBlending
    || (m.isMeshBasicMaterial && Math.max(m.color.r, m.color.g, m.color.b) > 0.5)
    || (m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0.05 && (m.emissiveIntensity ?? 1) > 0)));
  // --- what is managed
  for (const [, m] of ctx.perf._mods) {
    if (!m.world) continue;
    for (const root of m.objects) root.traverse((o) => {
      if (o.userData.noFar) return;
      const boost = glows(o.material) ? GLOW : 1;
      if (o.isInstancedMesh) { const e = instEntry(o); if (e) { e.boost = boost; inst.push(e); } return; }
      if (!o.isMesh || o.isBatchedMesh || o.isSkinnedMesh || o.children.length || o.frustumCulled === false) return;
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      o.updateWorldMatrix(true, false);
      if (g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() > MAX_MESH_R) return;
      singles.push({ o, boost, saved: new Float32Array(16), hidden: false, scaled: false });
    });
  }

  function instEntry(o) {
    const g = o.geometry;
    if (o.count < MIN_INST || g.morphAttributes.position || !g.attributes.position) return null;
    for (const k in g.attributes) if (g.attributes[k].isInterleavedBufferAttribute) return null;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const r0 = g.boundingSphere.radius, n = o.instanceMatrix.count, a = o.instanceMatrix.array;
    let big = 0;
    for (let i = 0; i < o.count; i++) {
      const j = i * 16, s = Math.sqrt(Math.max(a[j] * a[j] + a[j + 1] * a[j + 1] + a[j + 2] * a[j + 2], a[j + 4] * a[j + 4] + a[j + 5] * a[j + 5] + a[j + 6] * a[j + 6], a[j + 8] * a[j + 8] + a[j + 9] * a[j + 9] + a[j + 10] * a[j + 10]));
      if (r0 * s > big) big = r0 * s;
    }
    if (big > MAX_INST_R) return null;
    const pg = new THREE.BufferGeometry();
    pg.setIndex(g.index);
    const own = [];
    for (const k in g.attributes) {
      const at = g.attributes[k];
      if (at.isInstancedBufferAttribute) {
        const na = new THREE.InstancedBufferAttribute(new at.array.constructor(at.array.length), at.itemSize, at.normalized, at.meshPerAttribute);
        na.setUsage(THREE.DynamicDrawUsage); na.array.set(at.array);
        pg.setAttribute(k, na); own.push([at, na]);
      } else pg.setAttribute(k, at);
    }
    for (const gr of g.groups) pg.addGroup(gr.start, gr.count, gr.materialIndex);
    pg.drawRange = g.drawRange; pg.boundingSphere = g.boundingSphere; pg.boundingBox = g.boundingBox;
    const c = new THREE.InstancedMesh(pg, o.material, n);
    c.name = 'far:' + o.name; c.userData.farOf = o; // not the module's name: tests that look a module's meshes up by name must not find it
    c.instanceMatrix.setUsage(THREE.DynamicDrawUsage); c.instanceMatrix.array.set(o.instanceMatrix.array);
    if (o.instanceColor) { c.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(o.instanceColor.array.length), 3); c.instanceColor.setUsage(THREE.DynamicDrawUsage); c.instanceColor.array.set(o.instanceColor.array); }
    c.count = o.count; c.visible = false; c.matrixAutoUpdate = false; c.matrixWorldAutoUpdate = false;
    c.castShadow = o.castShadow; c.receiveShadow = o.receiveShadow;
    scene.add(c);
    return { o, c, n, r0, own, im: o.instanceMatrix, ic: o.instanceColor, ver: -1, cx: new Float32Array(n), cy: new Float32Array(n), cz: new Float32Array(n), cr: new Float32Array(n), at: new THREE.Vector3(1e9, 0, 0), k: 0, srcCount: -1, vis: false, dead: false };
  }

  const verOf = (e) => e.o.instanceMatrix.version + (e.o.instanceColor ? e.o.instanceColor.version * 7 : 0) + e.own.reduce((s, [a]) => s + a.version * 13, 0) + e.o.count * 101;
  // per-instance centres and radii in world space, from the module's own matrices
  function measure(e) {
    const o = e.o, a = o.instanceMatrix.array, w = o.matrixWorld.elements, c = o.geometry.boundingSphere.center, ws = o.matrixWorld.getMaxScaleOnAxis();
    for (let i = 0; i < o.count; i++) {
      const j = i * 16;
      const lx = a[j] * c.x + a[j + 4] * c.y + a[j + 8] * c.z + a[j + 12], ly = a[j + 1] * c.x + a[j + 5] * c.y + a[j + 9] * c.z + a[j + 13], lz = a[j + 2] * c.x + a[j + 6] * c.y + a[j + 10] * c.z + a[j + 14];
      e.cx[i] = w[0] * lx + w[4] * ly + w[8] * lz + w[12]; e.cy[i] = w[1] * lx + w[5] * ly + w[9] * lz + w[13]; e.cz[i] = w[2] * lx + w[6] * ly + w[10] * lz + w[14];
      const s = Math.sqrt(Math.max(a[j] * a[j] + a[j + 1] * a[j + 1] + a[j + 2] * a[j + 2], a[j + 4] * a[j + 4] + a[j + 5] * a[j + 5] + a[j + 6] * a[j + 6], a[j + 8] * a[j + 8] + a[j + 9] * a[j + 9] + a[j + 10] * a[j + 10]));
      e.cr[i] = e.r0 * s * ws * e.boost;
    }
    o.computeBoundingSphere(); // the stand-in's culling sphere: every instance the module has (the packed ones are among them)
    e.c.boundingSphere = o.boundingSphere;
  }
  // pack the instances big enough to see into the stand-in, shrinking those in the band
  function pack(e, K) {
    const o = e.o, c = e.c, src = o.instanceMatrix.array, dst = c.instanceMatrix.array, cam = camera.position;
    const sc = o.instanceColor?.array, dc = c.instanceColor?.array;
    const sum = verOf(e);
    if (sum !== e.ver) { measure(e); e.ver = sum; }
    let j = 0;
    for (let i = 0; i < o.count; i++) {
      const dx = e.cx[i] - cam.x, dy = e.cy[i] - cam.y, dz = e.cz[i] - cam.z;
      const px = (e.cr[i] * K) / Math.sqrt(dx * dx + dy * dy + dz * dz + 1e-6);
      if (px <= LO) continue;
      const s = i * 16, d = j * 16;
      if (px >= HI) for (let q = 0; q < 16; q++) dst[d + q] = src[s + q];
      else {
        const t = (px - LO) / (HI - LO), f = t * t * (3 - 2 * t);
        for (let q = 0; q < 12; q++) dst[d + q] = src[s + q] * f;
        dst[d + 3] = src[s + 3]; dst[d + 7] = src[s + 7]; dst[d + 11] = src[s + 11];
        dst[d + 12] = src[s + 12]; dst[d + 13] = src[s + 13]; dst[d + 14] = src[s + 14]; dst[d + 15] = src[s + 15];
      }
      if (sc) { dc[j * 3] = sc[i * 3]; dc[j * 3 + 1] = sc[i * 3 + 1]; dc[j * 3 + 2] = sc[i * 3 + 2]; }
      for (const [a, b] of e.own) { const n = a.itemSize; for (let q = 0; q < n; q++) b.array[j * n + q] = a.array[i * n + q]; }
      j++;
    }
    c.count = j;
    if (j) {
      c.instanceMatrix.clearUpdateRanges(); c.instanceMatrix.addUpdateRange(0, j * 16); c.instanceMatrix.needsUpdate = true;
      if (dc) { c.instanceColor.clearUpdateRanges(); c.instanceColor.addUpdateRange(0, j * 3); c.instanceColor.needsUpdate = true; }
      for (const [a, b] of e.own) { b.clearUpdateRanges(); b.addUpdateRange(0, j * a.itemSize); b.needsUpdate = true; }
    }
    e.at.copy(cam); e.k = K;
  }
  const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };

  // --- each render of the scene from the walker's camera
  let rr = 0, packs = 0, packed = 0;
  const changed = [];
  scene.onBeforeRender = (r, s, cam) => {
    if (!api.active || cam !== camera) return;
    renderer.getDrawingBufferSize(size);
    const K = size.y / ((camera.fov * Math.PI) / 180), P = camera.position;
    // instanced: pack what needs it, within the budget
    let budget = BUDGET;
    for (let q = 0; q < inst.length && budget > 0; q++) {
      const e = inst[(rr + q) % inst.length];
      if (e.dead) continue;
      if (e.o.instanceMatrix !== e.im || e.o.instanceColor !== e.ic) { e.dead = true; e.c.visible = false; continue; } // the module swapped its buffers: draw its own
      if (e.at.distanceToSquared(P) > STEP * STEP || Math.abs(e.k - K) > 0.05 * K || verOf(e) !== e.ver) { pack(e, K); budget -= e.o.count; packs++; packed += e.o.count; }
    }
    rr = (rr + 1) % Math.max(1, inst.length);
    changed.length = 0;
    for (const e of inst) {
      if (e.dead) continue;
      const o = e.o, c = e.c;
      e.vis = shown(o);
      if (!e.vis) continue;
      o.visible = false; // the module's own is out for this render; the stand-in draws in its place
      c.visible = c.count > 0;
      c.matrixWorld.copy(o.matrixWorld);
      c.material = o.material; c.castShadow = o.castShadow; c.receiveShadow = o.receiveShadow; c.renderOrder = o.renderOrder;
      c.customDepthMaterial = o.customDepthMaterial; c.customDistanceMaterial = o.customDistanceMaterial; c.layers.mask = o.layers.mask;
      c.onBeforeRender = o.onBeforeRender; c.onAfterRender = o.onAfterRender;
    }
    // single meshes: hidden, or shrunk about their centre, for this render
    for (const e of singles) {
      const o = e.o;
      if (!o.visible || !shown(o)) continue;
      const g = o.geometry, w = o.matrixWorld.elements, rad = g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
      v3.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld);
      const px = (rad * e.boost * K) / Math.max(1e-3, v3.distanceTo(P));
      if (px >= HI) continue;
      if (px <= LO) { o.visible = false; e.hidden = true; changed.push(e); continue; }
      const t = (px - LO) / (HI - LO), f = t * t * (3 - 2 * t);
      for (let q = 0; q < 16; q++) e.saved[q] = w[q];
      for (const q of M3) w[q] *= f;
      w[12] = v3.x + (w[12] - v3.x) * f; w[13] = v3.y + (w[13] - v3.y) * f; w[14] = v3.z + (w[14] - v3.z) * f;
      e.scaled = true; changed.push(e);
    }
  };
  scene.onAfterRender = (r, s, cam) => {
    if (!api.active || cam !== camera) return;
    for (const e of inst) if (!e.dead && e.vis) { e.o.visible = true; e.c.visible = false; }
    for (const e of changed) {
      if (e.hidden) { e.o.visible = true; e.hidden = false; }
      if (e.scaled) { const w = e.o.matrixWorld.elements; for (let q = 0; q < 16; q++) w[q] = e.saved[q]; e.scaled = false; }
    }
    changed.length = 0;
  };

  api.start = () => { api.active = true; for (const e of inst) e.c.visible = false; };
  api.stats = () => {
    let drawn = 0, total = 0;
    for (const e of inst) { if (e.dead) continue; drawn += e.c.count; total += e.o.count; }
    return { band: [LO, HI], instanced: inst.length, dead: inst.filter((e) => e.dead).length, instances: { drawn, total }, singles: singles.length, packs, packed };
  };
  // before start (the warm-up), every stand-in is drawn full so its buffers upload behind the title card
  for (const e of inst) e.c.visible = true;
  return api;
}
