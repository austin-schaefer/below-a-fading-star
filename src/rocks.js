// Rocks: boulders, tors, scree and pebbles across the moor, so no view is bare ground.
// Faceted procedural stones with lichen on their upper faces; instanced in a few size classes.
import * as THREE from 'three';
import { clamp, smoothstep } from './noise.js';

function makeRockGeometry(rng, noise, detail, seed) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  // squash + random stretch so the stones aren't spheres
  const sx = 0.8 + rng() * 0.7, sy = 0.55 + rng() * 0.5, sz = 0.8 + rng() * 0.7;
  const ox = seed * 13.7, oz = seed * 7.3;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n1 = noise.fbm2(v.x * 1.3 + ox, v.z * 1.3 + v.y * 0.9 + oz, 3);
    const n2 = noise.noise2(v.x * 4 + ox, v.y * 4 + v.z * 3 + oz);
    const r = 1 + n1 * 0.32 + n2 * 0.08;
    v.multiplyScalar(r);
    v.x *= sx; v.y *= sy; v.z *= sz;
    // flatten the base so it sits in the turf
    if (v.y < -0.25 * sy) v.y = -0.25 * sy + (v.y + 0.25 * sy) * 0.25;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); // IcosahedronGeometry is already non-indexed: faceted normals
  return geo;
}

function makeRockMaterial(palette) {
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(palette.rock), roughness: 0.92, metalness: 0.0 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRPos; varying vec3 vRN; varying float vRScale;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vRPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
          vRN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
          vRScale = length(vec3(instanceMatrix[0][0], instanceMatrix[1][0], instanceMatrix[2][0]));
        #else
          vRPos = (modelMatrix * vec4(position, 1.0)).xyz; vRN = normalize(mat3(modelMatrix) * normal); vRScale = 1.0;
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vRPos; varying vec3 vRN; varying float vRScale;
        float rhash(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }
        float rnoise(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(rhash(i), rhash(i + vec3(1,0,0)), f.x), mix(rhash(i + vec3(0,1,0)), rhash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(rhash(i + vec3(0,0,1)), rhash(i + vec3(1,0,1)), f.x), mix(rhash(i + vec3(0,1,1)), rhash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float rfbm(vec3 p) { return rnoise(p) * 0.5 + rnoise(p * 2.1 + 3.0) * 0.3 + rnoise(p * 4.3 + 7.0) * 0.2; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float g = rfbm(vRPos * 1.7);
          float g2 = rfbm(vRPos * 7.0);
          // grain and strata
          diffuseColor.rgb *= 0.78 + 0.45 * g + 0.12 * (g2 - 0.5);
          float strata = smoothstep(0.42, 0.5, abs(fract(vRPos.y * 0.9 + g * 1.5) - 0.5));
          diffuseColor.rgb *= 1.0 - strata * 0.18;
          // lichen: pale green-grey and rust-orange crusts on the upper and north faces
          float up = clamp(vRN.y, 0.0, 1.0);
          float north = clamp(-vRN.z, 0.0, 1.0);
          float l1 = smoothstep(0.52, 0.66, rfbm(vRPos * 3.1 + 11.0)) * (0.4 + 0.6 * up);
          float l2 = smoothstep(0.58, 0.7, rfbm(vRPos * 5.3 + 29.0)) * (0.3 + 0.7 * north);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.6, 0.42), l1 * 0.75);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.42, 0.16), l2 * 0.6);
          // damp dark base where it meets the turf
          float base = smoothstep(0.1, -0.2, vRN.y);
          diffuseColor.rgb *= 1.0 - base * 0.35;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.75, smoothstep(0.52, 0.66, rfbm(vRPos * 3.1 + 11.0)));`);
  };
  return mat;
}

export async function build(ctx) {
  const { THREE: T, scene, terrain, landmarks, palette, noise } = ctx;
  const t0 = performance.now();
  const rng = ctx.makeRng(41);
  const low = ctx.quality === 'low';
  const mat = makeRockMaterial(palette);
  // detail by use: boulders get the finest facets, pebbles the coarsest
  // each variant also gets a coarse twin of the same shape (same squash, same noise) for far boulders
  const twins = [];
  const variants = [2, 2, 1, 1, 1, 0, 0].map((d, i) => {
    const r3 = [rng(), rng(), rng()];
    let k = 0; const replay = () => r3[k++ % 3];
    const g = makeRockGeometry(replay, noise, d, i + 1);
    k = 0; twins.push(d > 1 ? makeRockGeometry(replay, noise, d - 1, i + 1) : g);
    return g;
  });
  const variantFor = { boulder: [0, 1, 2], stone: [2, 3, 4], pebble: [5, 6] };

  // Where rocks may not go
  const L = landmarks;
  const avoid = [
    [L.castle.x, L.castle.z, 46], [L.tower.x, L.tower.z, 14], [L.stones.x, L.stones.z, 14], [L.byre.x, L.byre.z, 14],
    [L.court.x, L.court.z, 24], [L.orchard.x, L.orchard.z, 30],
    // v2 sites: the Speculum's pale beach, the Menology's spiral, the Hypogeum's forecourt
    [L.speculum.x, L.speculum.z, 10], [L.menology.x, L.menology.z, 26], [L.hypogeum.x, L.hypogeum.z, 12],
  ];
  const pool = ctx.water.pool || { x: 208, z: 258 };
  function allowed(x, z) {
    if (terrain.isUnderwater(x, z)) return false;
    if (terrain.causewayDistance(x, z) < 4.5) return false;
    for (const [ax, az, ar] of avoid) if (Math.hypot(x - ax, z - az) < ar) return false;
    return true;
  }

  // Gather placements into size classes: pebbles (no shadow), stones, boulders (shadow)
  const classes = { pebble: [], stone: [], boulder: [] };
  const R = terrain.regionRadius + 70;
  const N = low ? 16000 : 30000;
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), up = new T.Vector3(0, 1, 0);
  const n = new T.Vector3();
  for (let i = 0; i < N; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!allowed(x, z)) continue;
    const b = terrain.biomeAt(x, z);
    // density: scree and rock slopes, heath, the moor; less in marsh and wood
    let density = 0.3 + b.rock * 0.9 + b.heath * 0.25 - b.marsh * 0.18 - b.wood * 0.12 + smoothstep(240, 320, r) * 0.6;
    if (ctx.regions) density *= ctx.regions.stoneAt(x, z).density; // v4 regions: a region's own stone replaces these
    density *= 0.55 + 0.45 * (noise.warped2(x * 0.012 + 50, z * 0.012 - 20, 3) * 0.5 + 0.5); // clumping
    if (rng() > density) continue;
    if (b.slope > 1.1) continue;
    // The cirque walls round the fall are steep and spray-wet: a stone sunk 0.18 of its size into a near-vertical
    // face pokes out as a flat dark ellipse (the "black ovals" Austin saw from the Speculum). Keep stones and
    // boulders off slopes over 0.6 rad, and everything off the spray band round the pool.
    if (Math.hypot(x - pool.x, z - pool.z) < 24) continue;
    const u = rng();
    let size, cls;
    if (u < 0.6) { size = 0.18 + rng() * 0.3; cls = 'pebble'; }
    else if (u < 0.92) { size = 0.5 + rng() * 0.9; cls = 'stone'; }
    else { size = 1.3 + rng() * rng() * 3.2; cls = 'boulder'; }
    if (b.slope > 0.6 && cls !== 'pebble') continue;
    if (b.rock > 0.5 && rng() < 0.4) { size *= 1.6; if (size > 1.3) cls = 'boulder'; }
    const y = terrain.heightAt(x, z);
    terrain.normalAt(x, z, n);
    classes[cls].push({ x, y: y - size * 0.18, z, size, variant: variantFor[cls][Math.floor(rng() * variantFor[cls].length)], rot: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.35, nx: n.x, nz: n.z });
  }
  // Tors: a few stacked outcrops as landmarks of the open moor
  const tors = [[-110, -110], [90, 60], [-40, 80], [160, 10], [-230, 30], [20, -120], [-120, 200], [120, -180]];
  for (const [tx, tz] of tors) {
    if (!allowed(tx, tz) || (ctx.regions && !ctx.regions.stoneAt(tx, tz).tors)) continue;
    const count = 6 + Math.floor(rng() * 5);
    for (let k = 0; k < count; k++) {
      const ang = rng() * Math.PI * 2, d = rng() * 5;
      const x = tx + Math.cos(ang) * d, z = tz + Math.sin(ang) * d;
      const size = 1.6 + rng() * 3.4;
      const y = terrain.heightAt(x, z) + (k > 2 ? rng() * size * 0.9 : 0) - size * 0.15;
      classes.boulder.push({ x, y, z, size, variant: variantFor.boulder[Math.floor(rng() * 3)], rot: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.8, nx: 0, nz: 0 });
    }
  }

  // Draw distance by size class: pebbles vanish into the turf past ~75 m and stones past ~170 m (a few pixels
  // by then); boulders and tors are kept everywhere, they are what the eye finds on the far slopes.
  // Each mesh keeps every matrix in its own array and packs the ones in reach into the instance buffer
  // whenever the player has moved a few metres (no allocation, a few thousand distance tests).
  const REACH = { pebble: low ? 60 : 75, stone: low ? 150 : 170, boulder: Infinity };
  // fine boulders swap to their coarse twin past this distance, and stop casting shadows (the shadow map
  // only reaches ~100 m round the player anyway)
  const BOULDER_NEAR = low ? 110 : 140;
  const packs = [];
  let drawCalls = 0, tris = 0;
  for (const [cls, list] of Object.entries(classes)) {
    // split by variant
    for (let vi = 0; vi < variants.length; vi++) {
      const items = list.filter((it) => it.variant === vi);
      if (!items.length) continue;
      const mesh = new T.InstancedMesh(variants[vi], mat, items.length);
      mesh.castShadow = cls !== 'pebble';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // spread over the whole region; distance packing below does the culling
      const all = new Float32Array(items.length * 16), xz = new Float32Array(items.length * 2);
      items.forEach((it, idx) => {
        e.set(it.tilt + it.nz * 0.6, it.rot, -it.nx * 0.6);
        q.setFromEuler(e);
        s.set(it.size, it.size, it.size);
        p.set(it.x, it.y, it.z);
        m.compose(p, q, s);
        mesh.setMatrixAt(idx, m);
        m.toArray(all, idx * 16); xz[idx * 2] = it.x; xz[idx * 2 + 1] = it.z;
        if (cls === 'boulder' && it.size > 0.9) ctx.addCollider({ x: it.x, z: it.z, r: it.size * 0.75 });
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.name = `rocks-${cls}-${vi}`;
      scene.add(mesh);
      if (REACH[cls] < Infinity) packs.push({ mesh, all, xz, r2: REACH[cls] * REACH[cls], n: items.length });
      else if (twins[vi] !== variants[vi]) {
        const far = new T.InstancedMesh(twins[vi], mat, items.length);
        far.castShadow = false; far.receiveShadow = true; far.frustumCulled = false;
        far.instanceMatrix.array.set(all); far.instanceMatrix.needsUpdate = true;
        far.name = `rocks-${cls}-${vi}-far`;
        scene.add(far);
        packs.push({ mesh, all, xz, r2: BOULDER_NEAR * BOULDER_NEAR, n: items.length, far });
        drawCalls++;
      }
      drawCalls++;
      tris += items.length * variants[vi].attributes.position.count / 3;
    }
  }
  const last = { x: Infinity, z: Infinity };
  function pack(px, pz) {
    for (const P of packs) {
      const dst = P.mesh.instanceMatrix.array;
      const fdst = P.far ? P.far.instanceMatrix.array : null;
      let c = 0, f = 0;
      for (let i = 0; i < P.n; i++) {
        const dx = P.xz[i * 2] - px, dz = P.xz[i * 2 + 1] - pz;
        if (dx * dx + dz * dz > P.r2) {
          if (fdst) { if (f !== i) fdst.set(P.all.subarray(i * 16, i * 16 + 16), f * 16); f++; }
          continue;
        }
        if (c !== i) dst.set(P.all.subarray(i * 16, i * 16 + 16), c * 16);
        c++;
      }
      P.mesh.count = c;
      P.mesh.instanceMatrix.needsUpdate = true;
      if (P.far) { P.far.count = f; P.far.instanceMatrix.needsUpdate = true; }
    }
  }
  ctx.registerUpdate(() => {
    const cp = ctx.camera.position;
    if ((cp.x - last.x) ** 2 + (cp.z - last.z) ** 2 < 36) return;
    last.x = cp.x; last.z = cp.z;
    pack(cp.x, cp.z);
  });
  ctx.log(`rocks: ${classes.pebble.length} pebbles, ${classes.stone.length} stones, ${classes.boulder.length} boulders; ${drawCalls} draw calls, ~${Math.round(tris / 1000)}k tris, ${(performance.now() - t0).toFixed(0)}ms`);
}
