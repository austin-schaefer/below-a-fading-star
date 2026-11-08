// The Lattice: F9AC's crystal growth below the glacier. Faceted shards grow in clusters on a hex
// grid (the overworld showing through), a few giants stand 10-15 m, and thin glowing filaments
// of biomesh creep over the ground away from the ice like frost veins, closing into hex cells
// near the seed. One BatchedMesh for all crystal shapes, one mesh for every filament.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, fogBatchFix } from './util.js';
import { makeBatch } from './batch.js';

const SQ3 = Math.sqrt(3);

// Faceted shard, flat shaded, height ~1 (apex), radius ~1 at the base. Non-indexed.
function shardGeo(rng, sides, bodyTop, taper, skew, bevel = false) {
  const pos = [];
  const ringR = [];
  for (let s = 0; s < sides; s++) ringR.push(0.8 + rng() * 0.4);
  const ring = (y, r, ox = 0) => ringR.map((rr, s) => { const a = (s / sides) * Math.PI * 2; return [Math.cos(a) * r * rr + ox, y, Math.sin(a) * r * rr]; });
  const rings = [ring(-0.25, 1.0)];
  if (bevel) { rings.push(ring(bodyTop * 0.45, 1.06, skew * 0.3)); }
  rings.push(ring(bodyTop, taper, skew * 0.7));
  const apex = [skew, 1, 0];
  const push = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let r = 0; r < rings.length - 1; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let s = 0; s < sides; s++) { const s1 = (s + 1) % sides; push(A[s], B[s1], B[s]); push(A[s], A[s1], B[s1]); }
  }
  const T = rings[rings.length - 1];
  for (let s = 0; s < sides; s++) push(T[s], apex, T[(s + 1) % sides]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function buildLattice(ctx, ground, shared) {
  const { landmarks: L, quality, noise } = ctx;
  const low = quality === 'low';
  const rng = ctx.makeRng(7707);
  const M = L.moraine;
  const G = { x: M.x, z: -345 }; // where the glacier comes from: growth radiates away from here
  const b = {};
  const weight = (x, z) => {
    if (x * x + z * z > 352 * 352) return 0;
    ground.biomeAt(x, z, b);
    const glacial = b.glacier * smoothstep(-205, -240, z) * 0.85;
    return clamp(Math.max(b.crystal * 1.1, glacial), 0, 1);
  };
  const okGround = (x, z) => ground.slopeAt(x, z) < 0.85 && ground.waterDepth(x, z) < 0 && ground.causewayDistance(x, z) > 4;

  // Geometries
  const geos = {
    hex: shardGeo(ctx.makeRng(7711), 6, 0.78, 0.82, 0.04),
    hex2: shardGeo(ctx.makeRng(7712), 6, 0.7, 0.65, 0.12),
    needle: shardGeo(ctx.makeRng(7713), 4, 0.86, 0.7, 0.08),
    giant: shardGeo(ctx.makeRng(7714), 6, 0.8, 0.86, 0.05, true),
  };
  const shards = []; // {x,y,z, h, r, tx, tz, rot, g, c}
  const hexCells = []; // {x,z,w}
  const S = 6.5; // hex spacing
  const qMax = Math.ceil(170 / S);
  for (let r = -qMax; r <= qMax; r++) for (let q = -qMax; q <= qMax; q++) {
    const x = M.x + S * (q + r / 2), z = M.z + S * (SQ3 / 2) * r;
    const w = weight(x, z);
    if (w < 0.08) continue;
    hexCells.push({ x, z, w, q, r });
    if (rng() > Math.pow(w, 1.15) * (low ? 0.5 : 0.95)) continue;
    if (!okGround(x, z)) continue;
    // cluster on this hex: a main shard, satellites toward the six corners
    const H = 0.6 + (0.6 + 3.4 * w) * (0.4 + 0.6 * rng());
    const awayX = x - G.x, awayZ = z - G.z, al = Math.hypot(awayX, awayZ) || 1;
    const lean = 0.08 + rng() * 0.12;
    shards.push({ x, z, h: H, r: H * (0.11 + rng() * 0.07), tx: (awayX / al) * lean, tz: (awayZ / al) * lean, rot: rng() * 6.28, g: rng() < 0.5 ? 'hex' : 'hex2', c: rng() });
    const nSat = low ? 3 : 6;
    for (let k = 0; k < nSat; k++) {
      if (rng() > w + 0.35) continue;
      const a = Math.PI / 6 + (k * Math.PI) / 3 + (rng() - 0.5) * 0.4;
      const d = 0.5 + rng() * (1.2 + w * 1.4);
      const sx = x + Math.cos(a) * d, sz = z + Math.sin(a) * d;
      const h = H * (0.25 + rng() * 0.45);
      const t = 0.25 + rng() * 0.45;
      shards.push({ x: sx, z: sz, h, r: h * (0.1 + rng() * 0.08), tx: Math.cos(a) * t, tz: Math.sin(a) * t, rot: rng() * 6.28, g: rng() < 0.3 ? 'needle' : 'hex', c: rng() });
    }
  }
  // Giants, with a skirt of medium shards
  const giants = [];
  for (let k = 0; k < 400 && giants.length < 7; k++) {
    const a = rng() * Math.PI * 2, d = 8 + Math.sqrt(rng()) * 55;
    const x = M.x + Math.cos(a) * d, z = M.z + 10 + Math.sin(a) * d * 0.8;
    if (weight(x, z) < 0.45 || !okGround(x, z) || ground.slopeAt(x, z) > 0.45) continue;
    if (giants.some((g) => Math.hypot(g.x - x, g.z - z) < 20)) continue;
    const h = 10 + rng() * 5, r = 1.1 + rng() * 1.0;
    const awayX = x - G.x, awayZ = z - G.z, al = Math.hypot(awayX, awayZ) || 1;
    const lean = 0.06 + rng() * 0.16;
    const gi = { x, z, h, r, tx: (awayX / al) * lean, tz: (awayZ / al) * lean + (rng() - 0.5) * 0.1, rot: rng() * 6.28, g: 'giant', c: 0.3 + rng() * 0.4 };
    giants.push(gi); shards.push(gi);
    ctx.addCollider({ x, z, r: r * 1.15 });
    const skirt = low ? 5 : 10;
    for (let i = 0; i < skirt; i++) {
      const aa = rng() * Math.PI * 2, dd = r * (0.9 + rng() * 1.6);
      const hh = h * (0.12 + rng() * 0.28);
      const t = 0.3 + rng() * 0.4;
      shards.push({ x: x + Math.cos(aa) * dd, z: z + Math.sin(aa) * dd, h: hh, r: hh * (0.12 + rng() * 0.06), tx: Math.cos(aa) * t, tz: Math.sin(aa) * t, rot: rng() * 6.28, g: rng() < 0.5 ? 'hex' : 'hex2', c: rng() });
    }
  }

  // Crystal material: dark glassy body, slow inner pulse, rim light; brighter while the sun gutters
  const crysGain = { value: 1 };
  const uni = {
    uTime: shared.time, uCrys: crysGain, uOrigin: { value: new THREE.Vector2(G.x, G.z) },
    uDeep: { value: new THREE.Color(ctx.palette.crystalDeep) }, uPale: { value: new THREE.Color(ctx.palette.crystal) },
  };
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a7898'), roughness: 0.08, metalness: 0.2, flatShading: true });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uni);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCrW; varying float vCrH;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_BATCHING
          vCrW = (modelMatrix * batchingMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vCrW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif
        vCrH = position.y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uCrys; uniform vec2 uOrigin; uniform vec3 uDeep, uPale; varying vec3 vCrW; varying float vCrH;
        float fpH3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float fpN3(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(fpH3(i), fpH3(i + vec3(1,0,0)), f.x), mix(fpH3(i + vec3(0,1,0)), fpH3(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(fpH3(i + vec3(0,0,1)), fpH3(i + vec3(1,0,1)), f.x), mix(fpH3(i + vec3(0,1,1)), fpH3(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float fpVeil = 0.0;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // glass with depth: faces seen square-on look down into dark blue with fracture veils that shift
          // with the eye (sampled further along the view ray); grazing faces go pale; roughness varies per face
          float facing = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
          vec3 Vw = normalize(vCrW - cameraPosition);
          vec3 q = vCrW * vec3(1.5, 0.4, 1.5) + Vw * 0.9; // veils drawn out along the growth axis, like fracture planes
          fpVeil = fpN3(q) * 0.6 + fpN3(q * 2.6 + 3.1) * 0.4;
          float core = smoothstep(-0.25, 1.0, vCrH);
          vec3 inner = mix(uDeep * 0.18, uDeep * 0.75 + uPale * 0.08, smoothstep(0.35, 0.8, fpVeil) * (0.35 + 0.65 * core));
          diffuseColor.rgb = mix(uPale * 0.24, inner, smoothstep(0.05, 0.75, facing));
          vec3 nW = normalize(cross(dFdx(vCrW), dFdy(vCrW)));
          float fh = fract(sin(dot(floor(nW * 7.0 + 0.5), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          roughnessFactor = mix(0.04, 0.42, fh * 0.7 + fpVeil * 0.3);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float fpD = length(vCrW.xz - uOrigin);
          float pulse = 0.5 + 0.5 * sin(uTime * 0.5 - fpD * 0.06);
          pulse *= pulse;
          float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);
          float core = smoothstep(-0.25, 1.0, vCrH);
          // a band of light climbing slowly through each crystal
          float band = smoothstep(0.82, 1.0, sin(vCrH * 7.0 - uTime * 0.9 - fpD * 0.11) * 0.5 + 0.5);
          totalEmissiveRadiance += (uDeep * (0.05 + 0.32 * pulse) * (0.3 + 0.7 * core * core) * (0.5 + fpVeil) + uPale * (fres * (0.3 + 0.3 * pulse) * (0.5 + 0.9 * fpVeil) + band * 0.4 * core * (0.4 + fpVeil))) * uCrys;
          // a faint glow from inside the veils that swells while the sun gutters (uCrys > 1)
          totalEmissiveRadiance += uPale * smoothstep(0.45, 0.85, fpVeil) * core * (0.1 + 0.6 * (uCrys - 1.0));
          // light caught in the veils: the inside of the glass is lit unevenly, so it never reads as paint
          totalEmissiveRadiance += uDeep * smoothstep(0.3, 0.85, fpVeil) * (0.12 + 0.2 * core) * (1.0 - fres) * uCrys;
        }`);
    fogBatchFix(shader);
  };
  mat.customProgramCacheKey = () => 'fp-veg-crystal';

  let vtx = 0;
  for (const k in geos) vtx += geos[k].attributes.position.count;
  const batch = makeBatch(ctx, shards.length, vtx, 0, mat); // instanced stand-in without multi-draw (batch.js)
  const gid = {}; for (const k in geos) gid[k] = batch.addGeometry(geos[k]);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), yq = new THREE.Quaternion(), col = new THREE.Color();
  const cDeep = new THREE.Color('#1c4a6a'), cPale = new THREE.Color('#5aa8d0'), cIce = new THREE.Color('#9ab8cc');
  let tris = 0;
  for (const s of shards) {
    const y = ground.heightAt(s.x, s.z);
    dir.set(s.tx, 1, s.tz).normalize();
    q.setFromUnitVectors(up, dir); yq.setFromAxisAngle(up, s.rot); q.multiply(yq);
    pos.set(s.x, y, s.z); sc.set(s.r, s.h, s.r);
    m4.compose(pos, q, sc);
    const id = batch.addInstance(gid[s.g]);
    batch.setMatrixAt(id, m4);
    col.copy(cDeep).lerp(cPale, s.c * 0.7);
    if (s.c > 0.9) col.lerp(cIce, 0.6);
    batch.setColorAt(id, col);
    tris += geos[s.g].attributes.position.count / 3;
  }
  batch.castShadow = true; batch.receiveShadow = true;
  batch.name = 'veg-lattice';
  batch.build?.();
  ctx.scene.add(batch);

  // ---------- Biomesh filaments ----------
  const P = [], A = [], E = [];
  let fil = 0;
  const lift = 0.07;
  function ribbon(pts) { // pts: [{x,z,w,along}]
    if (pts.length < 2) return;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const dx = p1.x - p0.x, dz = p1.z - p0.z, l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
      const y0 = ground.heightAt(p0.x, p0.z) + lift, y1 = ground.heightAt(p1.x, p1.z) + lift;
      const a = [p0.x + nx * p0.w, y0, p0.z + nz * p0.w], bb = [p0.x - nx * p0.w, y0, p0.z - nz * p0.w];
      const c = [p1.x - nx * p1.w, y1, p1.z - nz * p1.w], d = [p1.x + nx * p1.w, y1, p1.z + nz * p1.w];
      P.push(...a, ...bb, ...c, ...a, ...c, ...d);
      A.push(p0.along, p0.along, p1.along, p0.along, p1.along, p1.along);
      E.push(1, -1, -1, 1, -1, 1);
    }
    fil++;
  }
  const walk = (x, z, ang, len, w0, depth) => {
    const pts = [];
    const step = 0.8;
    let along = Math.hypot(x - G.x, z - G.z);
    for (let s = 0; s * step < len; s++) {
      const t = (s * step) / len;
      pts.push({ x, z, w: lerp(w0, 0.012, t), along });
      // meander, with a pull outward from the glacier
      const ax = x - G.x, az = z - G.z;
      const out = Math.atan2(az, ax);
      let da = out - ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      ang += da * 0.06 + noise.noise2(x * 0.09 + depth * 7, z * 0.09) * 0.32;
      x += Math.cos(ang) * step; z += Math.sin(ang) * step;
      along += step;
      if (!okGround(x, z) || x * x + z * z > 352 * 352) break;
      if (depth < 2 && rng() < 0.045) walk(x, z, ang + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.5), (len - s * step) * (0.3 + rng() * 0.3), lerp(w0, 0.012, t) * 0.8, depth + 1);
    }
    ribbon(pts);
  };
  const nStarts = low ? 130 : 260;
  for (let k = 0; k < nStarts; k++) {
    const c = hexCells[Math.floor(rng() * hexCells.length)];
    if (!c || c.w < 0.3) continue;
    const x = c.x + (rng() - 0.5) * 3, z = c.z + (rng() - 0.5) * 3;
    if (!okGround(x, z)) continue;
    const ang = Math.atan2(z - G.z, x - G.x) + (rng() - 0.5) * 1.4;
    walk(x, z, ang, 14 + rng() * 50 * c.w + 10, 0.05 + rng() * 0.05, 0);
  }
  // hex cells traced in biomesh near the seed, breaking up with distance
  for (const c of hexCells) {
    if (c.w < 0.5) continue;
    const R = S / SQ3;
    for (let e = 0; e < 3; e++) {
      if (rng() > (c.w - 0.4) * 1.5) continue;
      const a0 = Math.PI / 6 + (e * Math.PI) / 3, a1 = a0 + Math.PI / 3;
      const x0 = c.x + Math.cos(a0) * R, z0 = c.z + Math.sin(a0) * R, x1 = c.x + Math.cos(a1) * R, z1 = c.z + Math.sin(a1) * R;
      if (!okGround(x0, z0) || !okGround(x1, z1)) continue;
      const pts = [];
      const base = Math.hypot(c.x - G.x, c.z - G.z);
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        pts.push({ x: lerp(x0, x1, t), z: lerp(z0, z1, t), w: 0.035 + 0.02 * Math.sin(t * Math.PI), along: base + t * R });
      }
      ribbon(pts);
    }
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  fg.setAttribute('aAlong', new THREE.Float32BufferAttribute(A, 1));
  fg.setAttribute('aEdge', new THREE.Float32BufferAttribute(E, 1));
  fg.computeBoundingSphere();
  const filGain = { value: 1 };
  const fu = { uTime: shared.time, uGain: filGain, uFil: { value: new THREE.Color('#5fd0ff') } };
  const fmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide });
  fmat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, fu);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlong; attribute float aEdge; varying float vAlong; varying float vEdge; varying float vFade;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vAlong = aAlong; vEdge = aEdge;
        vFade = 1.0 - smoothstep(50.0, 150.0, distance(cameraPosition, position));`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uGain; uniform vec3 uFil; varying float vAlong; varying float vEdge; varying float vFade;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float pulse = pow(0.5 + 0.5 * sin(vAlong * 0.22 - uTime * 1.3), 10.0);
          float slow = 0.5 + 0.5 * sin(vAlong * 0.05 - uTime * 0.35);
          diffuseColor.rgb = uFil * (0.5 + 0.5 * slow + 2.6 * pulse) * uGain;
          diffuseColor.a = (1.0 - vEdge * vEdge) * (0.45 + 0.55 * max(pulse, slow * 0.6)) * vFade;
        }`);
  };
  fmat.customProgramCacheKey = () => 'fp-veg-filament';
  const filaments = new THREE.Mesh(fg, fmat);
  filaments.name = 'veg-biomesh';
  filaments.renderOrder = 2;
  ctx.scene.add(filaments);

  function update(flicker) {
    const g = 1 + 0.9 * (1 - flicker);
    crysGain.value = g; filGain.value = g;
  }
  return { batch, filaments, update, stats: { shards: shards.length, giants: giants.length, crystalTris: tris, filaments: fil, filamentTris: P.length / 9, hexCells: hexCells.length } };
}
