// The far ranges' meshes and ctx.mountains (v13 L2: apart from v4/mountains.js, so that file and the heightfield it
// carries import no three and can be loaded in a worker). The ranges' surfaces, the walls and the tables are
// v4/mountains.js's; this builds the two rings of mesh beyond the terrain and returns the walls' API.
import * as THREE from 'three';
import { smoothstep } from '../noise.js';
import { SUN, PALETTE, PEAKS } from '../world.js';
import { SADDLE, SEATS, M_START, PROFILE, walkLimit, inWalk, clampWalk, addCorridor, corridors as CORRIDORS, saddleWeight, saddleFloor, RANGES_KIT } from './mountains.js';

const { FAR, CAND, farMassifs, farHeight, farCrest, fc: _fc, fr: _fr, noise: S, sampleBearing, bearing: _b } = RANGES_KIT;
const D2R = Math.PI / 180;
const TAU = Math.PI * 2;
const FAR_PALE = new THREE.Color('#8e8a99'); // the far ranges paled toward the haze

function buildRing(ctx, T) {
  const low = ctx.quality === 'low';
  // v11: more cells, evenly spaced in r, so the ridges in plan have room (medium/high 1200x56, low 720x30 a ring)
  const nA = CAND ? (low ? 720 : 1200) : (low ? 540 : 900), nR = CAND ? (low ? 30 : 56) : (low ? 18 : T.rows);
  const pos = new Float32Array((nA + 1) * (nR + 1) * 3), col = new Float32Array((nA + 1) * (nR + 1) * 3);
  const cRock = new THREE.Color('#5a535c'), cHigh = new THREE.Color('#77717c'), cSnow = new THREE.Color('#a2a2b4'), c = new THREE.Color();
  const cGully = new THREE.Color(T.name === 'far' ? '#302c3a' : '#3e3c4c'), cRib = new THREE.Color(T.name === 'far' ? '#867a80' : '#86828e');
  let k = 0;
  for (let i = 0; i <= nA; i++) {
    const az = -Math.PI + (TAU * i) / nA;
    for (let j = 0; j <= nR; j++) {
      const v = j / nR;
      if (CAND) {
        // the far ranges: rock darker in the valleys and pale on the ridges (the ridged field's value), snow on the
        // farthest's high ridges only, all paled a step toward the haze (the fog tiers do the rest)
        const r = T.r0 + (T.r1 - T.r0) * v, F = farMassifs(T, az, r, _fr), hc = _fc.hc;
        pos[k] = Math.cos(az) * r; pos[k + 1] = F.y; pos[k + 2] = Math.sin(az) * r;
        c.copy(cGully).lerp(cRib, smoothstep(0.15, 0.7, F.ridge));
        c.lerp(cSnow, smoothstep(0.78, 0.98, F.y / hc + 0.1 * S.noise2(pos[k] * 0.006, pos[k + 2] * 0.006)) * smoothstep(0.45, 0.7, F.ridge) * (T.name === 'farthest' ? 0.7 : 0.25));
        c.lerp(FAR_PALE, T.name === 'far' ? 0.15 : 0.3);
        col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
        k += 3;
        continue;
      }
      // rows denser toward the crest
      const r = T.r0 + (T.r1 - T.r0) * (0.5 - 0.5 * Math.cos(v * Math.PI));
      const y = farHeight(T, az, r);
      pos[k] = Math.cos(az) * r; pos[k + 1] = y; pos[k + 2] = Math.sin(az) * r;
      const hc = farCrest(T, az, _fc).hc;
      c.copy(cRock).lerp(cHigh, smoothstep(hc * 0.35, hc * 0.8, y));
      c.lerp(cSnow, smoothstep(hc * 0.85, hc * 1.02, y + 0.08 * hc * S.noise2(pos[k] * 0.01, pos[k + 2] * 0.01)) * (T.name === 'farthest' ? 0.8 : 0.4));
      col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
      k += 3;
    }
  }
  const idx = [];
  for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) {
    const a = i * (nR + 1) + j, b = a + nR + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1); // counter-clockwise seen from above
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  if (CAND) {
    // v11: the sun's side baked into the colour too, so the far ranges keep a bright side and a shadow side under
    // the fog tiers: warmed and lifted where a slope faces the low sun, cooled and dropped where it turns away
    const nrm = geo.getAttribute('normal').array, sd = SUN.dir, warm = new THREE.Color(PALETTE.sunLight);
    for (let q = 0; q < col.length; q += 3) {
      const ndl = nrm[q] * sd.x + nrm[q + 1] * sd.y + nrm[q + 2] * sd.z;
      const lit = smoothstep(-0.1, 0.6, ndl), sh = 0.45 + 0.85 * lit;
      col[q] = col[q] * sh + warm.r * 0.02 * lit; col[q + 1] = col[q + 1] * sh + warm.g * 0.02 * lit; col[q + 2] = col[q + 2] * (sh * 0.92 + 0.08) + warm.b * 0.02 * lit;
    }
  }
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  mesh.name = `ranges-${T.name}`;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  return mesh;
}

// ---------------------------------------------------------------- ctx.mountains
// Builds the far ranges and returns the walls' API for the modules that sit things on them.
export function buildMountains(ctx) {
  const rings = FAR.map((T) => buildRing(ctx, T));
  for (const m of rings) ctx.scene.add(m);
  const terrain = ctx.terrain;
  const azOf = (bearing) => (bearing - 90) * D2R;
  return {
    saddle: SADDLE, seats: SEATS, peaks: PEAKS, ranges: rings, far: FAR, profile: PROFILE,
    walkLimit, inWalk, clampWalk, addCorridor, corridors: CORRIDORS, saddleWeight, saddleFloor,
    // the main crest along a compass bearing: its radius and the ground's height there
    crestAt(bearing, out = { x: 0, z: 0, r: 0, y: 0 }) {
      const az = azOf(bearing); sampleBearing(az);
      // the crest radius is the shape's; search ±25 m for the rendered high point (the noise moves it)
      let best = -Infinity, br = _b.cr;
      for (let r = _b.cr - 25; r <= _b.cr + 25; r += 2.5) { const y = terrain.heightAt(Math.cos(az) * r, Math.sin(az) * r); if (y > best) { best = y; br = r; } }
      out.r = br; out.y = best; out.x = Math.cos(az) * br; out.z = Math.sin(az) * br;
      return out;
    },
    // the first point on the inner face, walking out along a bearing, where the ground reaches height y
    // (for things hung on the wall at a height: the Annals' band, the Galleries, the Lamps); null if the
    // wall never gets that high on that bearing
    faceAt(bearing, y, out = { x: 0, z: 0, r: 0, y: 0 }) {
      const az = azOf(bearing), cx = Math.cos(az), cz = Math.sin(az);
      let prev = -Infinity;
      for (let r = M_START; r <= 520; r += 2) {
        const h = terrain.heightAt(cx * r, cz * r);
        if (h >= y) {
          const rr = prev > -Infinity ? r - 2 + 2 * (y - prev) / Math.max(1e-3, h - prev) : r;
          out.r = rr; out.y = y; out.x = cx * rr; out.z = cz * rr;
          return out;
        }
        prev = h;
      }
      return null;
    },
    // the far ranges' surface (tier 2 or 3) at a bearing and radius, for anything set on them
    farHeightAt(tier, bearing, r) { return farHeight(FAR[tier - 2], azOf(bearing), r); },
  };
}

