// A BatchedMesh where the browser can multi-draw, and an instanced stand-in where it cannot.
// Without WEBGL_multi_draw (Firefox) three.js draws a BatchedMesh once per visible instance, which
// at q=high is ~3800 draw calls (main pass and shadow) from the trees alone. InstancedBatch keeps the
// subset of the BatchedMesh API the trees and the Lattice use (addGeometry, addInstance, setMatrixAt,
// setColorAt, setGeometryIdAt) and draws one InstancedMesh per geometry per 100 m cell: the same
// geometry, matrices and colours, so the same picture, in a few hundred calls. Cells keep coarse
// frustum culling; instances are not culled one by one, so a few more triangles reach the GPU.
// ?batch=instanced|batched forces either path (default: batched where WEBGL_multi_draw exists).
//
// The fade (v6, trees.js's LOD cross-fade): each instance carries (f, side) for fade.js's dither. On a
// BatchedMesh it rides in the alpha channel of three's colour texture (r170's setColorAt writes rgb and leaves
// the alpha it fills with 1): side 0 stores f, side 1 stores 2 + f, so the default 1 draws in full. The
// instanced stand-in keeps it in an `aFade` vec2 instance attribute on each of its meshes (enableFade).
// setFadeAt and cloneInstance are the two calls trees.js makes on either path.
import * as THREE from 'three';

const CELL = 100;
const SORT_STEP = 16;

export function makeBatch(ctx, maxInstances, maxVertices, maxIndices, material) {
  const pick = new URL(location.href).searchParams.get('batch');
  const multi = !!ctx.renderer.extensions.get('WEBGL_multi_draw');
  // ?sort=0 (v3 stage 3) draws instances in build order: BatchedMesh's own front-to-back sort is off and
  // the instanced stand-in does not re-sort its cells
  const sort = new URL(location.href).searchParams.get('sort') !== '0';
  if (pick === 'batched' || (pick !== 'instanced' && multi)) { const b = new THREE.BatchedMesh(maxInstances, maxVertices, maxIndices, material); b.sortObjects = sort; return b; }
  const ib = new InstancedBatch(material); ib.sortOn = sort; return ib;
}

const _m = new THREE.Matrix4(), _c = new THREE.Color(), _p = new THREE.Vector3();

// The GLSL a fading BatchedMesh's materials need (withFade's head and vertex): the alpha decoded to (f, side).
export const BATCH_FADE_HEAD = /* glsl */ `
vec2 fpBatchFade(float a) { return a > 1.5 ? vec2(a - 2.0, 1.0) : vec2(a, 0.0); }
#ifdef USE_BATCHING_COLOR
#define FP_BATCH_FADE fpBatchFade(texelFetch(batchingColorTexture, ivec2(int(getIndirectIndex(gl_DrawID)) % textureSize(batchingColorTexture, 0).x, int(getIndirectIndex(gl_DrawID)) / textureSize(batchingColorTexture, 0).x), 0).a)
#else
#define FP_BATCH_FADE vec2(1.0, 0.0)
#endif
`;

// (f, side) of instance id, f read from fs[k]: side 0 draws a share f of its pixels, side 1 the other 1 - f
// (fade.js). f comes in a typed array, not as an argument: a double passed to a call that is not inlined is
// boxed anew on every call, and this runs twice a frame for every fade in flight.
export function setFadeAt(b, id, fs, k, side) {
  if (b.isInstancedBatch) return b.setFadeAt(id, fs, k, side);
  const t = b._colorsTexture;
  t.image.data[id * 4 + 3] = side ? 2 + fs[k] : fs[k];
  t.needsUpdate = true;
}

// Show instance dst (a hidden spare) as a copy of src (same matrix, same colour) with geometry geo. False when
// the instanced stand-in's cell has no room left for it.
export function cloneInstance(b, dst, src, geo) {
  if (b.isInstancedBatch) return b.cloneInstance(dst, src, geo);
  b.getMatrixAt(src, _m); b.setMatrixAt(dst, _m);
  b.getColorAt(src, _c); b.setColorAt(dst, _c);
  b.setGeometryIdAt(dst, geo);
  b.setVisibleAt(dst, true);
  return true;
}

class InstancedBatch extends THREE.Group {
  constructor(material) {
    super();
    this.isInstancedBatch = true;
    this.material = material;
    this.geos = [];   // geometry id -> BufferGeometry
    this.inst = [];   // instance id -> { geo, cell, slot, matrix, color }
    this.meshes = new Map(); // `${geo}|${cell}` -> InstancedMesh
    this.built = false; this.sortOn = true; this._sx = Infinity; this._sz = Infinity;
    this.fadeDepth = null; this.reserve = 0; // enableFade
    let cast = false, receive = false;
    Object.defineProperty(this, 'castShadow', { get: () => cast, set: (v) => { cast = v; for (const m of this.children) m.castShadow = v; } });
    Object.defineProperty(this, 'receiveShadow', { get: () => receive, set: (v) => { receive = v; for (const m of this.children) m.receiveShadow = v; } });
  }
  addGeometry(geo) { this.geos.push(geo); if (!geo.boundingSphere) geo.computeBoundingSphere(); return this.geos.length - 1; }
  addInstance(geo) { this.inst.push({ geo, cell: null, slot: -1, matrix: new THREE.Matrix4(), color: new THREE.Color(1, 1, 1), fade: [1, 0], on: true, mesh: null }); return this.inst.length - 1; }
  // Before build: every mesh gets an aFade instance attribute, the fade's depth material, and `reserve` slots
  // over its count for the spare instances cross-fades show (at most as many as the mesh's own count).
  enableFade(depth, reserve) { this.fadeDepth = depth; this.reserve = reserve; }
  setFadeAt(id, fs, k, side) {
    const it = this.inst[id], f = fs[k];
    it.fade[0] = f; it.fade[1] = side;
    if (it.slot < 0) return;
    const a = it.mesh.geometry.attributes.aFade; // the mesh _append put it in: no key string per call
    a.array[it.slot * 2] = f; a.array[it.slot * 2 + 1] = side; a.needsUpdate = true;
  }
  getGeometryIdAt(id) { return this.inst[id].geo; }
  getMatrixAt(id, m) { return m.copy(this.inst[id].matrix); }
  getColorAt(id, c) { return c.copy(this.inst[id].color); }
  // a hidden instance hides from build on (spares); shown again it goes back into its cell's mesh
  setVisibleAt(id, v) {
    const it = this.inst[id];
    if (it.on === v) return this;
    it.on = v;
    if (!this.built) return this;
    if (v) this._append(it, id); else this._remove(it);
    return this;
  }
  cloneInstance(dst, src, geo) {
    const d = this.inst[dst], s = this.inst[src];
    if (d.on) this.setVisibleAt(dst, false);
    const mesh = this.meshes.get(`${geo}|${s.cell}`);
    if (!mesh || mesh.count >= mesh.instanceMatrix.count) return false;
    d.matrix.copy(s.matrix); d.color.copy(s.color); d.cell = s.cell; d.geo = geo;
    this.setVisibleAt(dst, true);
    return true;
  }
  setMatrixAt(id, m) {
    const it = this.inst[id];
    it.matrix.copy(m);
    if (!this.built || it.slot < 0) return this;
    const mesh = this.meshes.get(`${it.geo}|${it.cell}`);
    mesh.setMatrixAt(it.slot, m); mesh.instanceMatrix.needsUpdate = true;
    return this;
  }
  setColorAt(id, c) {
    const it = this.inst[id];
    it.color.copy(c);
    if (!this.built || it.slot < 0) return this;
    const mesh = this.meshes.get(`${it.geo}|${it.cell}`);
    mesh.setColorAt(it.slot, c); mesh.instanceColor.needsUpdate = true;
    return this;
  }
  setGeometryIdAt(id, geo) {
    const it = this.inst[id];
    if (!this.built || it.slot < 0) { it.geo = geo; return this; }
    if (geo === it.geo) return this;
    this._remove(it); it.geo = geo; this._append(it, id);
    return this;
  }
  // Build the instanced meshes on first render, once every instance has its matrix. Each cell gets a
  // mesh for every geometry any of its instances can switch to (the caller lists them with lodSets).
  build() {
    if (this.built) return;
    this.built = true;
    const cells = new Map(); // cell -> { ids, geos: Set }
    for (let i = 0; i < this.inst.length; i++) {
      const it = this.inst[i];
      if (!it.on) continue; // a spare: its cell is its source's, set when it is shown
      _p.setFromMatrixPosition(it.matrix);
      it.cell = `${Math.floor(_p.x / CELL)},${Math.floor(_p.z / CELL)}`;
      let c = cells.get(it.cell);
      if (!c) cells.set(it.cell, (c = { ids: [], geos: new Map() }));
      c.ids.push(i);
      for (const g of this.lodSets?.(it.geo) || [it.geo]) c.geos.set(g, (c.geos.get(g) || 0) + 1);
    }
    for (const [cell, c] of cells) {
      // one sphere per cell around every instance's largest geometry: coarse frustum culling
      const box = new THREE.Box3();
      for (const i of c.ids) {
        const it = this.inst[i];
        let r = 0; for (const g of this.lodSets?.(it.geo) || [it.geo]) r = Math.max(r, this.geos[g].boundingSphere.radius + this.geos[g].boundingSphere.center.length());
        _p.setFromMatrixPosition(it.matrix);
        const s = it.matrix.getMaxScaleOnAxis() * r;
        box.expandByPoint(_p.clone().addScalar(s)); box.expandByPoint(_p.clone().addScalar(-s));
      }
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      for (const [g, n] of c.geos) {
        const cap = n + Math.min(n, this.reserve);
        let geo = this.geos[g];
        if (this.fadeDepth) { // its own geometry over the shared buffers, for its own aFade
          const src = geo; geo = new THREE.BufferGeometry();
          geo.setIndex(src.index);
          for (const k in src.attributes) geo.setAttribute(k, src.attributes[k]);
          geo.boundingSphere = src.boundingSphere;
          const fa = new Float32Array(cap * 2); for (let s = 0; s < cap; s++) fa[s * 2] = 1;
          geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(fa, 2).setUsage(THREE.DynamicDrawUsage));
        }
        const mesh = new THREE.InstancedMesh(geo, this.material, cap);
        if (this.fadeDepth) mesh.customDepthMaterial = this.fadeDepth;
        mesh.count = 0;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.setColorAt(0, _c.setRGB(1, 1, 1));
        mesh.boundingSphere = sphere;
        mesh.castShadow = this.castShadow; mesh.receiveShadow = this.receiveShadow;
        mesh.name = `${this.name}-${g}-${cell}`;
        mesh.ids = new Int32Array(cap);
        this.meshes.set(`${g}|${cell}`, mesh);
        this.add(mesh);
      }
    }
    for (let i = 0; i < this.inst.length; i++) if (this.inst[i].on) this._append(this.inst[i], i);
  }
  // Front to back inside each cell (v3 stage 3): three sorts the cells' meshes by distance but draws
  // each one's instances in build order, so near trees can be drawn after the far ones they hide and
  // their alpha-tested leaves shade every covered fragment twice. Re-sorted when the player has moved
  // SORT_STEP m; a mesh's matrices and colours are permuted in place (no allocation after the first).
  sortFrom(px, pz) {
    if (!this.sortOn || !this.built || (px - this._sx) ** 2 + (pz - this._sz) ** 2 < SORT_STEP * SORT_STEP) return;
    this._sx = px; this._sz = pz;
    const tmpM = this._tmpM ||= new Float32Array(16 * 4096), tmpC = this._tmpC ||= new Float32Array(3 * 4096), tmpF = this._tmpF ||= new Float32Array(2 * 4096);
    for (const mesh of this.children) {
      const n = mesh.count;
      if (n < 2 || n > 4096) continue;
      const key = mesh._key ||= new Float64Array(mesh.ids.length), ord = mesh._ord ||= new Int32Array(mesh.ids.length);
      for (let s = 0; s < n; s++) {
        const e = mesh.instanceMatrix.array, o = s * 16;
        key[s] = (e[o + 12] - px) ** 2 + (e[o + 14] - pz) ** 2; ord[s] = s;
      }
      const sub = ord.subarray(0, n);
      sub.sort((a, b) => key[a] - key[b]);
      let same = true; for (let s = 0; s < n; s++) if (sub[s] !== s) { same = false; break; }
      if (same) continue;
      const M = mesh.instanceMatrix.array, C = mesh.instanceColor.array, ids = mesh.ids, FA = mesh.geometry.attributes.aFade, F = FA?.array;
      tmpM.set(M.subarray(0, n * 16)); tmpC.set(C.subarray(0, n * 3)); if (F) tmpF.set(F.subarray(0, n * 2));
      const idsOld = this._ids ||= new Int32Array(4096); idsOld.set(ids.subarray(0, n));
      for (let s = 0; s < n; s++) {
        const from = sub[s];
        M.set(tmpM.subarray(from * 16, from * 16 + 16), s * 16); C.set(tmpC.subarray(from * 3, from * 3 + 3), s * 3);
        if (F) { F[s * 2] = tmpF[from * 2]; F[s * 2 + 1] = tmpF[from * 2 + 1]; }
        ids[s] = idsOld[from]; this.inst[ids[s]].slot = s;
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      if (FA) FA.needsUpdate = true;
    }
  }
  _append(it, id) {
    const mesh = this.meshes.get(`${it.geo}|${it.cell}`);
    const s = mesh.count++;
    it.slot = s; it.mesh = mesh; mesh.ids[s] = id;
    mesh.setMatrixAt(s, it.matrix); mesh.setColorAt(s, it.color);
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    const fa = mesh.geometry.attributes.aFade;
    if (fa) { fa.array[s * 2] = it.fade[0]; fa.array[s * 2 + 1] = it.fade[1]; fa.needsUpdate = true; }
    mesh.visible = mesh.count > 0;
  }
  _remove(it) {
    const mesh = this.meshes.get(`${it.geo}|${it.cell}`);
    const last = --mesh.count;
    if (it.slot !== last) { // move the last instance into the hole
      const mid = mesh.ids[last], moved = this.inst[mid];
      mesh.getMatrixAt(last, _m); mesh.setMatrixAt(it.slot, _m);
      mesh.getColorAt(last, _c); mesh.setColorAt(it.slot, _c);
      const fa = mesh.geometry.attributes.aFade;
      if (fa) { fa.array[it.slot * 2] = fa.array[last * 2]; fa.array[it.slot * 2 + 1] = fa.array[last * 2 + 1]; fa.needsUpdate = true; }
      mesh.ids[it.slot] = mid; moved.slot = it.slot;
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.visible = mesh.count > 0;
    it.slot = -1; it.mesh = null;
  }
}
