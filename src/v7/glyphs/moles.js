// CT The Tesserine Moles [Proposed] (plans/wilderness-v5.md, "### CT. The Tesserine Moles"): "Molehills on the Demesne's old lawn,
// but the earth they push up is full of tesserae: small dressed cubes of red, gold and lapis from a mosaic floor somewhere
// under the turf. Now and then a new heap rises, slowly, with a click of stone on stone." Austin: "more of the cute": the
// cute is in the scale and the slow heave; no mole is ever seen.
// A fixed pool of 30 slots within r 12 of SITES.moles, 18 heaps at load. Each heap is 0.45-0.6 m across and 0.15-0.22 m
// high, dark crumbled soil, with 25-45 tesserae half-buried in it and a few spilled on the turf. While the walker is within
// 35 m, every 50-110 s a free slot heaves: the earth swells from the centre over 8 s with a crumbling jitter, the tesserae
// surface in its last 2 s, and 3-5 `moles-click` cues fire. With every slot used, the oldest heap is flattened back to turf
// while it is out of view. The glyph motif's tessera (v7): one cube of 3 cm, gold worn to brass, lies face up on the heap
// nearest the causeway with one of the lintel's forms incised in its upper face.
// One instanced mesh of heaps (the rise in its vertex shader), one of tesserae; both stand on the drawn terrain mesh.
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { hyp } from '../../noise.js';
import { meshGround } from '../../v4/regions/skin.js';
import { engrave } from './engrave.js';
import { lintelForms } from './forms.js';

const SITE = SITES.moles;               // (75, 0) r 12
const SLOTS = 30, AT_LOAD = 18, RISE = 8, SURFACE = 2, NEAR = 35, EVERY = [50, 110];
const COLORS = [['#8a2a1c', 0], ['#b8902a', 1], ['#26407a', 0]]; // red, gold worn to brass (metallic), lapis

// the heap's height at normalised radius r and bearing a (unit heap: radius 1, height 1), crumbled
function profile(r, a, seed) {
  const lump = 0.07 * Math.sin(a * 5 + seed * 7) * Math.sin(r * 9 + seed * 3) + 0.05 * Math.sin(a * 11 + seed * 13 + r * 5);
  return Math.max(0, Math.pow(Math.max(0, 1 - r * r), 0.85) * (1 + lump * (0.4 + r)));
}
// how far a vertex at radius r has risen at rise u: the centre first, the rim last
const riseAt = (u, r) => Math.max(0, Math.min(1, u * 2 - r));

function heapGeometry(low) {
  const segs = low ? 9 : 13, rings = low ? 3 : 5, P = [0, profile(0, 0, 0.3), 0], R = [0], C = [], I = [];
  const soil = (k) => { const v = 0.6 + 0.6 * k; return [0.07 * v, 0.052 * v, 0.04 * v]; }; // dark crumbled soil, darker than the turf
  C.push(...soil(0.4));
  for (let j = 1; j <= rings; j++) for (let s = 0; s < segs; s++) {
    const r = j / rings, a = (s / segs) * 6.2832 + j * 0.37, rr = r * (1 + 0.08 * Math.sin(a * 3 + j));
    P.push(Math.cos(a) * rr, j === rings ? -0.04 : profile(r, a, 0.3), Math.sin(a) * rr); R.push(r);
    C.push(...soil(0.5 + 0.5 * Math.sin(a * 7 + j * 2.1) * Math.cos(a * 3 - j)));
  }
  for (let s = 0; s < segs; s++) I.push(0, 1 + ((s + 1) % segs), 1 + s);
  for (let j = 1; j < rings; j++) for (let s = 0; s < segs; s++) {
    const a = 1 + (j - 1) * segs + s, b = 1 + (j - 1) * segs + ((s + 1) % segs), c = a + segs, d = b + segs;
    I.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('aR', new THREE.Float32BufferAttribute(R, 1));
  g.setIndex(I); g.computeVertexNormals();
  return g;
}

export function buildMoles(ctx, { motif }) {
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(7402);
  const ground = meshGround(terrain);
  const lintel = lintelForms(ctx);

  // ---- the 30 slots: on the lawn within r 12, a heap's breadth apart, off the causeway's verge
  const slots = [];
  for (let k = 0; k < 2000 && slots.length < SLOTS; k++) {
    const a = rng() * 6.2832, r = Math.sqrt(rng()) * (SITE.r - 0.6), x = SITE.x + Math.cos(a) * r, z = SITE.z + Math.sin(a) * r;
    if (terrain.causewayDistance(x, z) < 4 || terrain.slopeAt(x, z) > 0.45) continue;
    if (slots.some((s) => hyp(s.x - x, s.z - z) < 1.6)) continue;
    const R = 0.225 + rng() * 0.075, H = 0.15 + rng() * 0.07;
    const n = Math.round((25 + rng() * 20) * (low ? 0.67 : 1)), spill = 2 + ((rng() * 4) | 0);
    slots.push({ x, z, R, H, rot: rng() * 6.2832, seed: rng(), n, spill, used: false, born: -1, rise: 0, rising: false, hold: null, clicks: [], tess: [] });
  }
  // the heaps up at load: the first 18 of the pool
  for (let i = 0; i < Math.min(AT_LOAD, slots.length); i++) { slots[i].used = true; slots[i].rise = 1; slots[i].born = -AT_LOAD + i; }
  // the heap nearest the causeway carries the glyph tessera
  let glyphHeap = 0, best = Infinity;
  for (let i = 0; i < Math.min(AT_LOAD, slots.length); i++) { const d = terrain.causewayDistance(slots[i].x, slots[i].z); if (d < best) { best = d; glyphHeap = i; } }

  // ---- each slot's frame: on the drawn ground, tilted to it
  const up = new THREE.Vector3(), q = new THREE.Quaternion(), qy = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  for (const s of slots) {
    const e = 0.4, gx = (ground(s.x + e, s.z) - ground(s.x - e, s.z)) / (2 * e), gz = (ground(s.x, s.z + e) - ground(s.x, s.z - e)) / (2 * e);
    up.set(-gx, 1, -gz).normalize();
    q.setFromUnitVectors(Y, up); qy.setFromAxisAngle(Y, s.rot); s.q = q.clone().multiply(qy);
    s.y = ground(s.x, s.z) - 0.015;
    s.pos = new THREE.Vector3(s.x, s.y, s.z);
  }

  // ---- the tesserae: the glyph tessera first, then each slot's own run (on the heap, then spilled on the turf)
  let NT = 1; for (const s of slots) { s.t0 = NT; NT += s.n + s.spill; }
  const tGeo = new THREE.BoxGeometry(1, 1, 1);
  const tForm = new Float32Array(NT).fill(-1), tMetal = new Float32Array(NT);
  const tess = new Array(NT);
  const col = new THREE.Color();
  // the glyph tessera: 3 cm, gold worn to brass, face up a little off the top of its heap
  {
    const s = slots[glyphHeap], a = s.rot + 1.1, r = 0.22;
    tess[0] = { slot: glyphHeap, lr: r, la: a, size: 0.03, sink: 0.35, q: new THREE.Quaternion().setFromAxisAngle(Y, rng() * 6.2832), glyph: true };
    tForm[0] = motif ? lintel[5] : -1; tMetal[0] = 1;
  }
  for (const s of slots) {
    for (let k = 0; k < s.n + s.spill; k++) {
      const spilled = k >= s.n, r = spilled ? 1.05 + rng() * 0.6 : Math.pow(rng(), 0.7) * 0.92, a = rng() * 6.2832;
      const e = new THREE.Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28);
      tess[s.t0 + k] = { slot: slots.indexOf(s), lr: r, la: a, size: 0.012 + rng() * 0.006, sink: spilled ? 0.25 + rng() * 0.2 : 0.4 + rng() * 0.25, q: new THREE.Quaternion().setFromEuler(e), spilled };
      const c = COLORS[(rng() * 3) | 0];
      tMetal[s.t0 + k] = c[1];
      tess[s.t0 + k].c = col.set(c[0]).multiplyScalar(0.7 + rng() * 0.4).clone();
    }
  }
  tGeo.setAttribute('aForm', new THREE.InstancedBufferAttribute(tForm, 1));
  tGeo.setAttribute('aMetal', new THREE.InstancedBufferAttribute(tMetal, 1));
  const tMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, metalness: 0 });
  // old colours with dirt in the chipped edges; the gold a worn metal
  tMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMetal; varying float vMetal; varying vec3 vTP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMetal = aMetal; vTP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vMetal; varying vec3 vTP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 a = abs(vTP); float m1 = max(a.x, max(a.y, a.z)), m2 = a.x + a.y + a.z - m1 - min(a.x, min(a.y, a.z));
          float chip = smoothstep(0.38, 0.5, m2) * (0.6 + 0.4 * sin(dot(vTP, vec3(41.0, 23.0, 37.0))));
          diffuseColor.rgb *= 1.0 - 0.65 * chip; }`)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vMetal * 0.45; // worn: half metal, so it keeps its colour in the keep\'s shade')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, vMetal);');
  };
  if (motif) engrave(tMat, { scale: 0.3, half: 0.011, top: 0.5, face: 0.5 });
  tMat.customProgramCacheKey = () => `moles-tesserae-${motif ? 1 : 0}`;
  const tMesh = new THREE.InstancedMesh(tGeo, tMat, NT);
  tMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < NT; i++) tMesh.setColorAt(i, i === 0 ? col.set('#d2ac58') : tess[i].c);
  tMesh.instanceColor.needsUpdate = true;
  tMesh.name = 'living-moles-tesserae'; tMesh.castShadow = false; tMesh.receiveShadow = true;

  // ---- the heaps
  const hGeo = heapGeometry(low);
  const aRise = new Float32Array(SLOTS), aSeed = new Float32Array(SLOTS);
  slots.forEach((s, i) => { aRise[i] = s.rise; aSeed[i] = s.seed * 10; });
  const riseAttr = new THREE.InstancedBufferAttribute(aRise, 1); riseAttr.setUsage(THREE.DynamicDrawUsage);
  hGeo.setAttribute('aRise', riseAttr); hGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  const uTime = { value: 0 };
  const hMat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 1, metalness: 0 });
  hMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aR; attribute float aRise; attribute float aSeed; uniform float uTime; varying vec3 vCrumb;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float k = clamp(aRise * 2.0 - aR, 0.0, 1.0);
          float jit = aRise > 0.0 && aRise < 1.0 ? sin(uTime * 17.0 + aSeed + position.x * 31.0) * sin(uTime * 11.0 + position.z * 27.0) : 0.0;
          transformed.y = transformed.y * k + jit * 0.05 * k * (1.0 - k) * 4.0;
          transformed.xz *= mix(0.55, 1.0, clamp(aRise * 1.6, 0.0, 1.0));
          vCrumb = position * vec3(1.0, 3.0, 1.0) + aSeed;
        }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCrumb;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 cell = floor(vCrumb * 14.0); float c = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          diffuseColor.rgb *= 0.78 + 0.44 * c * c; }`);
  };
  hMat.customProgramCacheKey = () => 'moles-heaps';
  const hMesh = new THREE.InstancedMesh(hGeo, hMat, SLOTS);
  hMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hMesh.name = 'living-moles'; hMesh.castShadow = false; hMesh.receiveShadow = true;
  for (const m of [hMesh, tMesh]) { m.frustumCulled = true; m.boundingSphere = new THREE.Sphere(new THREE.Vector3(SITE.x, ground(SITE.x, SITE.z), SITE.z), SITE.r + 4); scene.add(m); }

  // ---- placing
  const M = new THREE.Matrix4(), S = new THREE.Vector3(), V = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0), TQ = new THREE.Quaternion();
  function placeHeap(i) {
    const s = slots[i];
    if (!s.used) { hMesh.setMatrixAt(i, Z); aRise[i] = 0; }
    else { hMesh.setMatrixAt(i, M.compose(s.pos, s.q, S.set(s.R, s.H, s.R))); aRise[i] = s.rise; }
    hMesh.instanceMatrix.needsUpdate = true; riseAttr.needsUpdate = true;
  }
  function placeTessera(j) {
    const t = tess[j], s = slots[t.slot];
    // tesserae surface in the rise's last 2 s, from 3 cm down
    const u = s.used ? s.rise : 0, show = (u - (1 - SURFACE / RISE)) / (SURFACE / RISE);
    if (!s.used || show <= 0) { tMesh.setMatrixAt(j, Z); return; }
    const lr = t.lr, la = t.la, ca = Math.cos(la), sa = Math.sin(la);
    // a point on the heap's crumbled surface, in its own unit frame, through the heap's frame
    const h = t.spilled ? 0 : profile(lr, la, 0.3) * riseAt(u, lr) * s.H;
    const below = t.size * t.sink + (1 - Math.min(1, show)) * 0.03;
    V.set(ca * lr * s.R, 0, sa * lr * s.R).applyQuaternion(s.q);
    V.x += s.x; V.z += s.z;
    V.y = (t.spilled ? ground(V.x, V.z) : s.y + h) - below + (t.glyph ? 0.006 : 0);
    if (t.glyph) TQ.copy(s.q).multiply(t.q); else TQ.copy(t.q);
    tMesh.setMatrixAt(j, M.compose(V, TQ, S.setScalar(t.size)));
  }
  function placeSlot(i) { placeHeap(i); const s = slots[i]; for (let k = 0; k < s.n + s.spill; k++) placeTessera(s.t0 + k); if (tess[0].slot === i) placeTessera(0); tMesh.instanceMatrix.needsUpdate = true; }
  for (let i = 0; i < SLOTS; i++) placeSlot(i);

  // ---- the cycle
  const cam = ctx.camera, frustum = new THREE.Frustum(), PV = new THREE.Matrix4(), sph = new THREE.Sphere();
  const st = { next: EVERY[0] + rng() * (EVERY[1] - EVERY[0]), rising: -1, rises: 0, flattened: [], clicks: 0, age: AT_LOAD };
  const cuePos = { x: 0, y: 0, z: 0 };
  function inView(s) {
    PV.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(PV);
    sph.center.copy(s.pos); sph.radius = s.R + 0.3;
    return frustum.intersectsSphere(sph) && hyp(cam.position.x - s.x, cam.position.z - s.z) < 150;
  }
  function startRise(i, hold = null) {
    const s = slots[i];
    s.used = true; s.rise = 0; s.rising = true; s.hold = hold; s.born = st.age++;
    // 3-5 clicks over the rise, most of them as the tesserae come up
    const n = 3 + ((rng() * 3) | 0); s.clicks.length = 0;
    for (let k = 0; k < n; k++) s.clicks.push(RISE * (k === 0 ? 0.25 + rng() * 0.4 : 0.65 + rng() * 0.35));
    s.clicks.sort((a, b) => a - b);
    st.rising = i; st.rises++;
    placeSlot(i);
  }
  function freeSlot() {
    // a free slot, the one most in view (the heave is the show), else any
    let pick = -1;
    for (let i = 0; i < slots.length; i++) if (!slots[i].used) { if (pick < 0) pick = i; if (inView(slots[i])) return i; }
    return pick;
  }
  function flattenOldest() {
    let o = -1;
    for (let i = 0; i < slots.length; i++) if (slots[i].used && !slots[i].rising && (o < 0 || slots[i].born < slots[o].born)) o = i;
    if (o < 0) return false;
    const seen = inView(slots[o]);
    if (seen) return false;           // only while it is out of view
    slots[o].used = false; slots[o].rise = 0; placeSlot(o);
    st.flattened.push({ slot: o, inView: seen });
    return true;
  }
  function update(dt, t) {
    uTime.value = t;
    const near = hyp(ctx.player.pos.x - SITE.x, ctx.player.pos.z - SITE.z) < NEAR;
    if (st.rising >= 0) {
      const s = slots[st.rising], t0 = s.rise * RISE;
      if (s.hold === null || s.rise < s.hold) s.rise = Math.min(s.hold ?? 1, s.rise + dt / RISE);
      const t1 = s.rise * RISE;
      for (const c of s.clicks) if (c > t0 && c <= t1) {
        const k = (rng() * s.n) | 0, tt = tess[s.t0 + k];
        cuePos.x = s.x + Math.cos(tt.la) * tt.lr * s.R; cuePos.y = s.y + s.H * 0.6; cuePos.z = s.z + Math.sin(tt.la) * tt.lr * s.R;
        ctx.audio?.cue?.('moles-click', cuePos); st.clicks++;
      }
      placeSlot(st.rising);
      if (s.rise >= 1) { s.rising = false; st.rising = -1; }
    } else if (near) {
      st.next -= dt;
      if (st.next <= 0) {
        const i = freeSlot();
        if (i >= 0) { startRise(i); st.next = EVERY[0] + rng() * (EVERY[1] - EVERY[0]); }
      }
    }
    // with every slot in use, the oldest goes back to turf as soon as nobody is looking
    if (st.rising < 0) { let all = true; for (let i = 0; i < slots.length && all; i++) all = slots[i].used; if (all) flattenOldest(); }
  }
  // every frame while a heap rises (at: the walker himself), else 4 Hz beyond 35 m
  const atSite = { x: SITE.x, z: SITE.z };
  ctx.registerUpdate(update, { at: () => (st.rising >= 0 ? ctx.player.pos : atSite), near: NEAR, hz: 4 });

  return {
    heaps: hMesh, tesserae: tMesh, slots, glyphHeap,
    rise: (i = -1, hold = null) => { if (st.rising >= 0) return -1; const k = i >= 0 ? i : freeSlot(); if (k < 0 || slots[k].used) return -1; startRise(k, hold); return k; },
    release: () => { if (st.rising >= 0) slots[st.rising].hold = null; },
    flatten: () => flattenOldest(),
    state: () => ({ heaps: slots.filter((s) => s.used).length, rising: st.rising, rise: st.rising >= 0 ? slots[st.rising].rise : null, rises: st.rises, next: st.next, clicks: st.clicks, flattened: st.flattened.slice() }),
    glyphTessera: () => { const m = new THREE.Matrix4(); tMesh.getMatrixAt(0, m); const p = new THREE.Vector3(), r = new THREE.Quaternion(), sc = new THREE.Vector3(); m.decompose(p, r, sc); return { x: p.x, y: p.y, z: p.z, size: sc.x, up: new THREE.Vector3(0, 1, 0).applyQuaternion(r).y, form: tForm[0], heap: glyphHeap, causeway: best }; },
    tris: () => (hGeo.index.count / 3) * SLOTS + 12 * NT,
    count: NT,
  };
}
