// Rocks: boulders, tors, scree and pebbles across the moor, so no view is bare ground.
// Faceted procedural stones with lichen on their upper faces; instanced in a few size classes.
import * as THREE from 'three';
import { clamp, smoothstep } from './noise.js';
import { MOTHER_FOOT } from './vegetation/mother.js';
import { plinthsClear } from './v5/plinths.js';
import { stillRockClear } from './v7/still/clear.js'; // v7: the still figures' ground and the Accrescent's line
import { naveClear } from './v5/nave/ground.js'; // v5: BD the Foundered Nave's rim and hole
import { withFade, fadeDepthMaterial } from './fade.js';

const PARAMS = new URL(location.href).searchParams;
// v6: stones and pebbles fade over their reach's last 15%, and fine boulders cross to their coarse twin over
// 8 m, by the fade kit's dither (?rockfade=0: the hard cut and swap)
const FADE = PARAMS.get('rockfade') !== '0';
// v6: each pack repacks after 2 m, one a frame in turn, with no allocation and only the changed range uploaded
// (?packstep=6: every pack on one frame after 6 m, the whole buffer uploaded)
const OLD_PACK = PARAMS.get('packstep') === '6';
const STEP = OLD_PACK ? 6 : 2;
// with the fade, a pack reaches this much past its band so an instance comes into the band already packed
const SLACK = 3;

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

// One material per pack role, so each carries its own band (uFpBand: fade start, end; uFpSide: the kit's
// side); the rock patch and the fade make one program for all of them. f is the share of pixels kept by
// side 0: 1 inside the band's start, 0 past its end, from the instance's distance to the eye (the camera's
// position, never cameraPosition, so the shadow pass fades at the caster's distance).
function fadeRock(mat, eye, r0, r1, side) {
  const u = { uFpEye: { value: eye }, uFpBand: { value: new THREE.Vector2(r0, r1) }, uFpSide: { value: side } };
  return withFade(mat, {
    key: 'rocks', uniforms: u, head: 'uniform vec3 uFpEye; uniform vec2 uFpBand; uniform float uFpSide;',
    vertex: 'vec2(1.0 - smoothstep(uFpBand.x, uFpBand.y, distance(uFpEye.xz, (modelMatrix * instanceMatrix[3]).xz)), uFpSide)',
  });
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
    [L.court.x, L.court.z, 24], [L.orchard.x, L.orchard.z, 30], // the court's and the tower's wider v5 clearances are applied after the draws, below

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
    const it = { x, y: y - size * 0.18, z, size, variant: variantFor[cls][Math.floor(rng() * variantFor[cls].length)], rot: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.35, nx: n.x, nz: n.z };
    // Cleared after every draw so that rocks elsewhere keep their places (a radius changed in `avoid` above would shift the
    // rng stream and move every later rock): the court's piers reach 39 m, the lens mount's fins 15 m, the armillary's trunnions 22.5 m.
    if (Math.hypot(x - L.court.x, z - L.court.z) < L.court.r) continue;
    if (Math.hypot(x - L.tower.x, z - L.tower.z) < 17) continue;
    if (Math.hypot(x - L.arcature.x, z - L.arcature.z) < L.arcature.r) continue;
    if (Math.hypot(x - L.moraine.x, z - L.moraine.z) < MOTHER_FOOT) continue; // the Lattice's mother crystal stands here (vegetation/mother.js)
    if (plinthsClear(x, z)) continue; // the Plinth Road's corridor and its fallen blocks (v5/plinths.js)
    if (naveClear(x, z)) continue; // the Foundered Nave's rim and hole (v5/nave/ground.js)
    if (stillRockClear(x, z, size)) continue; // v7: the Sleeper's, the basket's and the Accrescent's ground and line (v7/still/clear.js)
    classes[cls].push(it);
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
      const it = { x, y, z, size, variant: variantFor.boulder[Math.floor(rng() * 3)], rot: rng() * Math.PI * 2, tilt: (rng() - 0.5) * 0.8, nx: 0, nz: 0 };
      if (!plinthsClear(x, z) && !naveClear(x, z)) classes.boulder.push(it); // after the draws, as above
    }
  }

  // Draw distance by size class: pebbles vanish into the turf past ~75 m and stones past ~170 m (a few pixels
  // by then); boulders and tors are kept everywhere, they are what the eye finds on the far slopes.
  // Each mesh keeps every matrix in its own array and packs the ones in reach into the instance buffer
  // once the player has moved 2 m from where it was last packed (no allocation, a few thousand distance tests).
  const REACH = { pebble: low ? 60 : 75, stone: low ? 150 : 170, boulder: Infinity };
  // fine boulders cross to their coarse twin by this distance, and the twin casts no shadow (the shadow map
  // only reaches ~100 m round the player anyway)
  const BOULDER_NEAR = low ? 110 : 140;
  const BOULDER_BAND = 8; // v6: the fine boulder fades out and its twin in over BOULDER_NEAR - 8 .. BOULDER_NEAR
  const eye = ctx.camera.position;
  const mats = {}, matFor = (role, r0, r1, side) => (mats[role] ||= FADE ? fadeRock(makeRockMaterial(palette), eye, r0, r1, side) : mat);
  const depthFine = FADE ? fadeDepthMaterial({ key: 'rocks', uniforms: { uFpEye: { value: eye }, uFpBand: { value: new THREE.Vector2(BOULDER_NEAR - BOULDER_BAND, BOULDER_NEAR) }, uFpSide: { value: 0 } },
    head: 'uniform vec3 uFpEye; uniform vec2 uFpBand; uniform float uFpSide;',
    vertex: 'vec2(1.0 - smoothstep(uFpBand.x, uFpBand.y, distance(uFpEye.xz, (modelMatrix * instanceMatrix[3]).xz)), uFpSide)' }) : null;
  const packs = [];
  let drawCalls = 0, tris = 0;
  for (const [cls, list] of Object.entries(classes)) {
    // split by variant
    for (let vi = 0; vi < variants.length; vi++) {
      const items = list.filter((it) => it.variant === vi);
      if (!items.length) continue;
      const fine = REACH[cls] === Infinity && twins[vi] !== variants[vi];
      const mesh = new T.InstancedMesh(variants[vi], REACH[cls] < Infinity ? matFor(cls, REACH[cls] * 0.85, REACH[cls], 0) : fine ? matFor('fine', BOULDER_NEAR - BOULDER_BAND, BOULDER_NEAR, 0) : mat, items.length);
      if (fine && depthFine) mesh.customDepthMaterial = depthFine; // the fine boulder's shadow fades with it
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
        // capped at the boulder's height, so one in the hollow under the Span does not block the deck above it
        if (cls === 'boulder' && it.size > 0.9) ctx.addCollider({ x: it.x, z: it.z, r: it.size * 0.75, y: it.y - 1, h: it.size * 2 + 1 });
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.name = `rocks-${cls}-${vi}`;
      scene.add(mesh);
      // r2: packed into the mesh inside this; f2: packed into the twin outside this (the fade band and its slack)
      const slot = new Int32Array(items.length); for (let i = 0; i < slot.length; i++) slot[i] = i;
      const sq = (r) => r * r;
      if (REACH[cls] < Infinity) packs.push({ mesh, all, xz, slot, r2: sq(REACH[cls] + (FADE ? SLACK : 0)), n: items.length, last: { x: Infinity, z: Infinity } });
      else if (fine) {
        const far = new T.InstancedMesh(twins[vi], matFor('twin', BOULDER_NEAR - BOULDER_BAND, BOULDER_NEAR, 1), items.length);
        far.castShadow = false; far.receiveShadow = true; far.frustumCulled = false;
        far.instanceMatrix.array.set(all); far.instanceMatrix.needsUpdate = true;
        far.name = `rocks-${cls}-${vi}-far`;
        scene.add(far);
        const fslot = new Int32Array(items.length); fslot.set(slot);
        packs.push({ mesh, all, xz, slot, r2: sq(BOULDER_NEAR + (FADE ? SLACK : 0)), f2: sq(FADE ? BOULDER_NEAR - BOULDER_BAND - SLACK : BOULDER_NEAR), n: items.length, far, fslot, last: { x: Infinity, z: Infinity } });
        drawCalls++;
      }
      drawCalls++;
      tris += items.length * variants[vi].attributes.position.count / 3;
    }
  }
  // Pack one mesh (and its twin): the matrices in reach, in placement order, into the front of the instance
  // buffer. A slot that already holds the same instance is not rewritten, and only the range from the first
  // changed slot to the last written one is uploaded. ?packstep=6: the old copy (a subarray per instance) and
  // the whole buffer uploaded.
  function packOne(P, px, pz) {
    const src = P.all, xz = P.xz, dst = P.mesh.instanceMatrix.array, fdst = P.far ? P.far.instanceMatrix.array : null;
    const S = P.slot, FS = P.fslot, r2 = P.r2, f2 = P.f2;
    let c = 0, f = 0, lo = Infinity, flo = Infinity;
    for (let i = 0; i < P.n; i++) {
      const dx = xz[i * 2] - px, dz = xz[i * 2 + 1] - pz, d2 = dx * dx + dz * dz;
      if (fdst && d2 > f2) {
        if (OLD_PACK) { if (f !== i) fdst.set(src.subarray(i * 16, i * 16 + 16), f * 16); }
        else if (FS[f] !== i) { FS[f] = i; const a = i * 16, b = f * 16; for (let k = 0; k < 16; k++) fdst[b + k] = src[a + k]; if (f < flo) flo = f; }
        f++;
      }
      if (d2 > r2) continue;
      if (OLD_PACK) { if (c !== i) dst.set(src.subarray(i * 16, i * 16 + 16), c * 16); }
      else if (S[c] !== i) { S[c] = i; const a = i * 16, b = c * 16; for (let k = 0; k < 16; k++) dst[b + k] = src[a + k]; if (c < lo) lo = c; }
      c++;
    }
    upload(P.mesh, c, lo);
    if (P.far) upload(P.far, f, flo);
    P.last.x = px; P.last.z = pz;
  }
  function upload(mesh, count, lo) {
    const im = mesh.instanceMatrix;
    mesh.count = count;
    if (OLD_PACK) { im.needsUpdate = true; ctx.perf?.count('rocks.uploadBytes', im.array.byteLength); return; }
    if (lo >= count) return; // nothing written: the front of the buffer already holds these
    const r = im.fpRange || (im.fpRange = { start: 0, count: 0 }); // reused: three's addUpdateRange allocates one a call
    r.start = lo * 16; r.count = (count - lo) * 16; im.updateRanges.length = 0; im.updateRanges.push(r); im.needsUpdate = true;
    ctx.perf?.count('rocks.uploadBytes', (count - lo) * 64);
  }
  // ?packstep=6: every pack on one frame once the camera has moved 6 m. Otherwise each pack is due after
  // 2 m from where it was last packed, and one due pack runs a frame, in turn, when the frame's pack token
  // (ctx.packToken, shared with vegetation/plants.js) is free and no plant kind is waiting for it.
  const last = { x: Infinity, z: Infinity };
  const token = (ctx.packToken ||= { t: -1, hold: 0 });
  let turn = 0;
  const step2 = STEP * STEP;
  ctx.registerUpdate(() => {
    const cp = ctx.camera.position;
    if (OLD_PACK) {
      if ((cp.x - last.x) ** 2 + (cp.z - last.z) ** 2 < step2) return;
      last.x = cp.x; last.z = cp.z;
      for (const P of packs) packOne(P, cp.x, cp.z);
      ctx.perf?.count('rocks.packs');
      return;
    }
    if (token.hold > 0) { token.hold--; return; } // a plant kind is waiting for the token: it goes first
    if (token.t === ctx.time.t) return;
    for (let k = 0; k < packs.length; k++) {
      const P = packs[(turn + k) % packs.length];
      const dx = cp.x - P.last.x, dz = cp.z - P.last.z;
      if (dx * dx + dz * dz < step2) continue;
      token.t = ctx.time.t;
      packOne(P, cp.x, cp.z);
      turn = (turn + k + 1) % packs.length;
      ctx.perf?.count('rocks.packs');
      return;
    }
  });
  // the first fill, before the first frame: every pack round the player
  { const pp = ctx.player.pos; for (const P of packs) packOne(P, pp.x, pp.z); }
  ctx.log(`rocks: ${classes.pebble.length} pebbles, ${classes.stone.length} stones, ${classes.boulder.length} boulders; ${drawCalls} draw calls, ~${Math.round(tris / 1000)}k tris, ${(performance.now() - t0).toFixed(0)}ms`);
}
