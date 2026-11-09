// CF the Sexton's ground (v7, living-workers): the graves are real holes without carving the heightfield (see
// graves.js). The terrain's triangles over the block (plus 2 m, out to the terrain's own cell lines) are made
// degenerate, not re-indexed, as v5/nave.js does over the Nave's hole; in their place goes one turf mesh at the
// drawn terrain's heights on a 0.5 m grid whose lines also run along every slot's edges, in the terrain's own
// material, coloured from the terrain's vertex colours (and its wet band and normals), so its edge meets the
// terrain's exactly. Each slot's turf is its own little lid; an opened slot's lid folds away in the vertex shader.
// The pits (walls, floors, roots and stones in the faces) and the spoil heaps are a second mesh in an earth
// material: one uniform array holds each slot's depth (-1 unopened, 0-1.8 m), so the grave being dug deepens,
// and a new one opens, with no upload. Deep in a grave the light falls away (baked by depth, since the sun's
// shadow map is too coarse for a hole 0.8 m wide).
import * as THREE from 'three';
import { SITES, SUN } from '../../world.js';
import { makeSimplex, smoothstep, lerp, clamp } from '../../noise.js';
import { makeGround } from '../../fauna/uncanny/kit.js';
import { SLOTS, GRAVE, heapZ } from './graves.js';

const N_SLOTS = 64;
export const PAD = 2;

// the terrain's own vertex attributes at (x, z), bilinear (colour, wetness, normal), as the Nave's lip samples them
function terrainSampler(T) {
  const g = T.mesh.geometry, segs = g.parameters.widthSegments, size = g.parameters.width;
  const half = size / 2, cell = size / segs, row = segs + 1;
  const col = g.attributes.color.array, wet = g.attributes.aWet?.array, nor = g.attributes.normal.array;
  const at = (arr, k, x, z) => {
    const gx = clamp((x + half) / cell, 0, segs - 1e-4), gy = clamp((z + half) / cell, 0, segs - 1e-4), ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const n = arr.length / ((segs + 1) * (segs + 1));
    const a = arr[(iy * row + ix) * n + k], b = arr[(iy * row + ix + 1) * n + k], c = arr[((iy + 1) * row + ix) * n + k], d = arr[((iy + 1) * row + ix + 1) * n + k];
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  };
  return { cell, half, segs, colour: (x, z, o) => { for (let k = 0; k < 3; k++) o[k] = at(col, k, x, z); return o; }, wet: (x, z) => (wet ? at(wet, 0, x, z) : 0), normal: (x, z, o) => { for (let k = 0; k < 3; k++) o[k] = at(nor, k, x, z); const l = Math.hypot(o[0], o[1], o[2]) || 1; o[0] /= l; o[1] /= l; o[2] /= l; return o; } };
}

// take the terrain's triangles out over the rectangle (every triangle with all three corners inside it)
function cutTerrain(T, X0, X1, Z0, Z1) {
  const g = T.mesh.geometry, idx = g.index.array, P = g.attributes.position.array, e = 1e-3;
  const inside = (i) => { const x = P[i * 3], z = P[i * 3 + 2]; return x > X0 - e && x < X1 + e && z > Z0 - e && z < Z1 + e; };
  let cut = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (b === a && c === a) continue; // already out (the Nave's, or another cut)
    if (inside(a) && inside(b) && inside(c)) { idx[t + 1] = a; idx[t + 2] = a; cut++; }
  }
  g.index.needsUpdate = true;
  return cut;
}

export function buildGround(ctx, slots) {
  const T = ctx.terrain, low = ctx.quality === 'low';
  const TS = terrainSampler(T), MG = makeGround(ctx), SN = makeSimplex(70301), rng = ctx.makeRng(70302);
  const B = SITES.sexton.block;
  // the rectangle, out to the terrain's cell lines
  const snap = (v, up) => -TS.half + (up ? Math.ceil((v + TS.half) / TS.cell) : Math.floor((v + TS.half) / TS.cell)) * TS.cell;
  const X0 = snap(B[0] - PAD, false), X1 = snap(B[1] + PAD, true), Z0 = snap(B[2] - PAD, false), Z1 = snap(B[3] + PAD, true);
  const cut = cutTerrain(T, X0, X1, Z0, Z1);

  // ---- the grid lines: 0.5 m, and every slot's edges
  const lines = (a, b, edges) => {
    const n = Math.round((b - a) / 0.5), out = [];
    for (let k = 0; k <= n; k++) { const v = a + ((b - a) * k) / n; if (k === 0 || k === n || !edges.some((e) => Math.abs(e - v) < 0.22)) out.push(v); }
    for (const e of edges) out.push(e);
    return [...new Set(out.map((v) => +v.toFixed(4)))].sort((p, q) => p - q);
  };
  const xe = [], ze = [];
  for (const s of SLOTS) { xe.push(s.x - GRAVE.len / 2, s.x + GRAVE.len / 2); ze.push(s.z - GRAVE.wid / 2, s.z + GRAVE.wid / 2); }
  const xs = lines(X0, X1, [...new Set(xe.map((v) => +v.toFixed(4)))]), zs = lines(Z0, Z1, [...new Set(ze.map((v) => +v.toFixed(4)))]);
  const slotOf = (x, z) => { for (const s of SLOTS) if (Math.abs(x - s.x) < GRAVE.len / 2 && Math.abs(z - s.z) < GRAVE.wid / 2) return s; return null; };

  // ---- the turf
  const pos = [], col = [], nor = [], wet = [], slotA = [], idx = [];
  const c3 = [0, 0, 0], n3 = [0, 0, 0];
  const vert = (x, z, slot) => {
    pos.push(x, MG.at(x, z), z);
    TS.colour(x, z, c3); col.push(c3[0], c3[1], c3[2]);
    TS.normal(x, z, n3); nor.push(n3[0], n3[1], n3[2]);
    wet.push(TS.wet(x, z)); slotA.push(slot);
    return pos.length / 3 - 1;
  };
  const NX = xs.length, NZ = zs.length, grid = new Int32Array(NX * NZ).fill(-1);
  const gv = (i, j) => { const k = j * NX + i; if (grid[k] < 0) grid[k] = vert(xs[i], zs[j], -1); return grid[k]; };
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const s = slotOf((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2);
    let a, b, c, d;
    if (s) { a = vert(xs[i], zs[j], s.n); b = vert(xs[i + 1], zs[j], s.n); c = vert(xs[i], zs[j + 1], s.n); d = vert(xs[i + 1], zs[j + 1], s.n); }
    else { a = gv(i, j); b = gv(i + 1, j); c = gv(i, j + 1); d = gv(i + 1, j + 1); }
    idx.push(a, c, b, b, c, d);
  }
  const tg = new THREE.BufferGeometry();
  const nv = pos.length / 3;
  tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  tg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  tg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  tg.setAttribute('aWet', new THREE.Float32BufferAttribute(wet, 1));
  tg.setAttribute('aIce', new THREE.Float32BufferAttribute(new Float32Array(nv), 1));
  tg.setAttribute('aGlac', new THREE.Float32BufferAttribute(new Float32Array(nv * 3), 3));
  tg.setAttribute('aSlot', new THREE.Float32BufferAttribute(slotA, 1));
  tg.setIndex(idx);
  tg.computeBoundingSphere();
  const uD = { value: new Float32Array(N_SLOTS).fill(-1) };
  const base = T.mesh.material, tmat = base.clone();
  tmat.polygonOffset = true; tmat.polygonOffsetFactor = -1; tmat.polygonOffsetUnits = -2;
  tmat.onBeforeCompile = (sh, r) => {
    const kept = base.userData.shader;
    base.onBeforeCompile(sh, r);
    base.userData.shader = kept; // the terrain's own uniforms stay the console's handle
    sh.uniforms.uD = uD;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aSlot; uniform float uD[${N_SLOTS}];`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nif (aSlot > -0.5 && uD[int(aSlot + 0.5)] > -0.5) transformed = vec3(0.0); // an opened slot's lid folds away`);
  };
  tmat.customProgramCacheKey = () => 'living-workers-turf';
  const turf = new THREE.Mesh(tg, tmat);
  turf.name = 'living-workers-turf'; turf.receiveShadow = true; turf.castShadow = false;
  ctx.scene.add(turf);

  // ---- the pits and the heaps
  const P = [], C = [], F = [], K = [], R = [], S2 = [], CC = [], I = [];
  const EARTH_TOP = new THREE.Color('#3a2a1c'), EARTH = new THREE.Color('#8a6c48'), EARTH_D = new THREE.Color('#6e5638'), FLOOR = new THREE.Color('#5a4630'), ROOT = new THREE.Color('#1e1610'), STONE = new THREE.Color('#6a6258'), SPOIL = new THREE.Color('#47362a'), SPOIL_L = new THREE.Color('#62503c');
  const tc = new THREE.Color();
  // a vertex: (x, y, z) where y is the rim (pits) or the turf (heaps); f the wall's fraction down (pits) or the heap's height; base the slot's lowest rim
  const pv = (x, y, z, c, f, kind, base, slot) => { P.push(x, y, z); C.push(c.r, c.g, c.b); F.push(f); K.push(kind); R.push(base); S2.push(slot); const sl = SLOTS[slot]; CC.push(sl.x, sl.z); return P.length / 3 - 1; };
  const quad = (a, b, c, d) => I.push(a, b, c, a, c, d);
  const FR = [0, 0.1, 0.45, 1];
  for (const s of slots) {
    const x0 = s.x - GRAVE.len / 2, x1 = s.x + GRAVE.len / 2, z0 = s.z - GRAVE.wid / 2, z1 = s.z + GRAVE.wid / 2;
    // the rim, round the cut: (x, z) along each side; the lowest rim sets the floor
    const sides = [[[x0, z0], [x1, z0], 3], [[x1, z0], [x1, z1], 1], [[x1, z1], [x0, z1], 3], [[x0, z1], [x0, z0], 1]];
    let base = Infinity;
    for (const [a, b, m] of sides) for (let k = 0; k <= m; k++) base = Math.min(base, MG.at(lerp(a[0], b[0], k / m), lerp(a[1], b[1], k / m)));
    for (const [a, b, m] of sides) {
      const ex = b[0] - a[0], ez = b[1] - a[1], el = Math.hypot(ex, ez), ox = ez / el, oz = -ex / el; // (ox, oz) points out of the cut
      const rows = [];
      for (let r = 0; r < FR.length; r++) {
        const row = [];
        for (let k = 0; k <= m; k++) {
          const u = k / m, x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u), f = FR[r];
          // the faces are spade-cut: true, with a little give into the earth below the turf
          const give = r === 0 || k === 0 || k === m ? 0 : 0.015 * SN.noise2(x * 3.1 + r, z * 3.1);
          if (f < 0.05) tc.copy(EARTH_TOP); else tc.copy(EARTH).lerp(EARTH_D, smoothstep(0.3, 1, f));
          tc.multiplyScalar(0.85 + 0.3 * (SN.noise2(x * 2.3 + f * 4, z * 2.3) * 0.5 + 0.5));
          row.push(pv(x + ox * give, MG.at(x, z), z + oz * give, tc, f, 0, base, s.n));
        }
        rows.push(row);
      }
      for (let r = 0; r < FR.length - 1; r++) for (let k = 0; k < m; k++) quad(rows[r][k], rows[r + 1][k], rows[r + 1][k + 1], rows[r][k + 1]);
      // roots hanging from the turf at the top, and stones in the face
      if (m > 1) for (let q = 0; q < 2; q++) {
        const u = 0.15 + 0.7 * rng(), x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u), y = MG.at(x, z), w = 0.012, hgt = 0.06 + rng() * 0.12;
        const t0 = pv(x - (ex / el) * w + ox * -0.01, y, z - (ez / el) * w + oz * -0.01, ROOT, 0.0, 0, base, s.n);
        const t1 = pv(x + (ex / el) * w + ox * -0.01, y, z + (ez / el) * w + oz * -0.01, ROOT, 0.0, 0, base, s.n);
        const t2 = pv(x + (ex / el) * 0.03 * (rng() - 0.5) - ox * 0.025, y, z + (ez / el) * 0.03 * (rng() - 0.5) - oz * 0.025, ROOT, hgt / GRAVE.depth, 0, base, s.n);
        I.push(t0, t1, t2);
      }
      if (m > 1) for (let q = 0; q < 2; q++) {
        const u = 0.12 + 0.76 * rng(), f = 0.2 + 0.7 * rng(), x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u), y = MG.at(x, z), sz = 0.04 + rng() * 0.05;
        tc.copy(STONE).multiplyScalar(0.7 + 0.5 * rng());
        const df = sz / GRAVE.depth, tx = ex / el, tz = ez / el;
        const c0 = pv(x - tx * sz, y, z - tz * sz, tc, f - df, 0, base, s.n), c1 = pv(x + tx * sz, y, z + tz * sz, tc, f - df * 0.6, 0, base, s.n);
        const c2 = pv(x + tx * sz * 0.3, y, z + tz * sz * 0.3, tc, f + df, 0, base, s.n), tip = pv(x - ox * sz * 0.7, y, z - oz * sz * 0.7, tc, f, 0, base, s.n);
        I.push(c0, c1, tip, c1, c2, tip, c2, c0, tip);
      }
    }
    // the floor
    { const a = pv(x0, base, z0, FLOOR, 1, 0, base, s.n), b = pv(x1, base, z0, FLOOR, 1, 0, base, s.n), c = pv(x1, base, z1, FLOOR, 1, 0, base, s.n), d = pv(x0, base, z1, FLOOR, 1, 0, base, s.n); quad(a, d, c, b); }
    // the heap on the north side: a soft mound of what came out, 0.35 m high, its edge sunk under the turf
    const hz = heapZ(s), HR = low ? 2 : 3, HS = low ? 8 : 10, hx = GRAVE.len / 2 + 0.05, hzr = GRAVE.heapW / 2;
    const top = (() => { tc.copy(SPOIL).lerp(SPOIL_L, 0.3); return pv(s.x, MG.at(s.x, hz), hz, tc, 1, 1, base, s.n); })();
    let prev = null;
    for (let r = 1; r <= HR; r++) {
      const ring = [], rr = r / HR;
      for (let k = 0; k < HS; k++) {
        const a = (k / HS) * Math.PI * 2, lump = 1 + 0.12 * SN.noise2(s.n * 7.3 + Math.cos(a) * 1.7, Math.sin(a) * 1.7 + rr);
        const x = s.x + Math.cos(a) * hx * rr * lump, z = hz + Math.sin(a) * hzr * rr * lump;
        const h = r === HR ? 0 : Math.pow(1 - rr * rr, 0.65) * (0.9 + 0.2 * (SN.noise2(x * 2.1, z * 2.1) * 0.5 + 0.5));
        tc.copy(SPOIL).lerp(SPOIL_L, smoothstep(0.2, 0.9, SN.noise2(x * 3.7, z * 3.7) * 0.5 + 0.5) * 0.7).multiplyScalar(0.85 + 0.25 * rng());
        ring.push(pv(x, MG.at(x, z), z, tc, h, 1, base, s.n));
      }
      for (let k = 0; k < HS; k++) {
        const k1 = (k + 1) % HS;
        if (!prev) I.push(top, ring[k1], ring[k]); else quad(prev[k], prev[k1], ring[k1], ring[k]);
      }
      prev = ring;
    }
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  pg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  pg.setAttribute('aF', new THREE.Float32BufferAttribute(F, 1));
  pg.setAttribute('aKind', new THREE.Float32BufferAttribute(K, 1));
  pg.setAttribute('aBase', new THREE.Float32BufferAttribute(R, 1));
  pg.setAttribute('aSlot', new THREE.Float32BufferAttribute(S2, 1));
  pg.setAttribute('aC', new THREE.Float32BufferAttribute(CC, 2));
  pg.setIndex(I);
  pg.computeVertexNormals(); // (the shader re-derives the walls' normals from the screen-space slope)
  pg.computeBoundingSphere();
  const pmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  pmat.onBeforeCompile = (sh) => {
    sh.uniforms.uD = uD;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aF; attribute float aKind; attribute float aBase; attribute float aSlot; attribute vec2 aC; uniform float uD[${N_SLOTS}]; varying float vDeep; varying vec3 vWP; varying vec3 vCut;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float fpD = uD[int(aSlot + 0.5)];
        if (aKind < 0.5) {
          // a wall's vertex runs from its rim (f 0) down to the floor, the lowest rim less the depth (f 1)
          transformed.y = mix(position.y, aBase - fpD, aF);
          vDeep = position.y - transformed.y;
        } else {
          // the heap grows with the grave
          float g = clamp(fpD / ${GRAVE.depth.toFixed(2)}, 0.0, 1.0);
          transformed.y = position.y - 0.04 + aF * ${(GRAVE.heapH + 0.04).toFixed(3)} * g;
          vDeep = 0.0;
        }
        if (fpD < 0.0) transformed = vec3(0.0); // an unopened slot: nothing
        vWP = transformed; vCut = vec3(aC, aKind < 0.5 ? aBase : -1e4);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDeep; varying vec3 vWP; varying vec3 vCut;')
      // the sun into the cut: a wall is lit only where the ray toward the sun leaves by the open top (the sun's
      // shadow map is far too coarse for a hole 0.8 m wide), so the walls facing it are lit down a hand's breadth
      .replace('#include <lights_fragment_end>', `{
        vec3 sd = vec3(${SUN.dir.x.toFixed(5)}, ${SUN.dir.y.toFixed(5)}, ${SUN.dir.z.toFixed(5)});
        float t = max(0.0, vCut.z - vWP.y) / sd.y;
        vec2 e = abs(vWP.xz + sd.xz * t - vCut.xy);
        float vis = vCut.z < -1e3 ? 1.0 : (1.0 - smoothstep(${(GRAVE.len / 2).toFixed(2)}, ${(GRAVE.len / 2 + 0.04).toFixed(2)}, e.x)) * (1.0 - smoothstep(${(GRAVE.wid / 2).toFixed(2)}, ${(GRAVE.wid / 2 + 0.04).toFixed(2)}, e.y));
        reflectedLight.directDiffuse *= vis; reflectedLight.directSpecular *= vis;
      }
      #include <lights_fragment_end>`)
      // flat faces: the walls move, so the normal comes from the surface itself
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        if (vCut.z > -1e3) normal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition))); // (the heaps keep their soft normals)`)
      .replace('#include <opaque_fragment>', `outgoingLight *= mix(1.0, 0.35, smoothstep(0.3, 1.8, vDeep));\n#include <opaque_fragment>`);
  };
  pmat.customProgramCacheKey = () => 'living-workers-pits';
  const pits = new THREE.Mesh(pg, pmat);
  pits.name = 'living-workers-graves'; pits.receiveShadow = true; pits.castShadow = false; pits.frustumCulled = false;
  ctx.scene.add(pits);
  const tris = (g) => g.index.count / 3;
  return {
    turf, pits, uD: uD.value, cut, rect: [X0, X1, Z0, Z1],
    stats: () => ({ calls: 2, tris: Math.round(tris(tg) + tris(pg)), turf: Math.round(tris(tg)), pits: Math.round(tris(pg)), terrainCut: cut }),
  };
}
