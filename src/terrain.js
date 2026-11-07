// Terrain: a single heightfield over the whole region, bounded by impassable mountains,
// with a glacier tongue coming down from the north. Everything else samples heightAt().
import * as THREE from 'three';
import { makeSimplex, mulberry32, clamp, lerp, smoothstep } from './noise.js';
import { WORLD, LANDMARKS, WATER, CAUSEWAY, PALETTE, SUN } from './world.js';

const SX = makeSimplex(WORLD.seed);
const SY = makeSimplex(WORLD.seed + 77);

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  const x = ax + dx * t, z = az + dz * t;
  return Math.hypot(px - x, pz - z);
}
export function causewayDistance(x, z) {
  let d = Infinity;
  for (let i = 0; i < CAUSEWAY.length - 1; i++) {
    const a = CAUSEWAY[i], b = CAUSEWAY[i + 1];
    d = Math.min(d, distToSegment(x, z, a.x, a.z, b.x, b.z));
  }
  return d;
}

// Flatten toward a target height inside r, blending out over `fall` metres.
function flatten(h, x, z, cx, cz, r, fall, target) {
  const d = Math.hypot(x - cx, z - cz);
  const m = 1 - smoothstep(r, r + fall, d);
  return lerp(h, target, m);
}

// Glacier channel mask: a notch in the northern mountain wall, 0..1
export function glacierMask(x, z) {
  const L = LANDMARKS.moraine;
  const wobble = SX.fbm2(z * 0.004, 3.1, 3) * 40;
  const across = 1 - smoothstep(55, 95, Math.abs(x - L.x - wobble));
  const along = smoothstep(-200, -250, z);
  return across * along;
}

export function heightAt(x, z) {
  // Rolling moorland
  let h = SX.fbm2(x * 0.0035, z * 0.0035, 5) * 11;
  h += SX.fbm2(x * 0.012 + 5, z * 0.012 - 3, 4) * 3.2;
  h += SX.noise2(x * 0.06, z * 0.06) * 0.35;
  // Gentle rise toward the north-east so the castle sees the region laid out below
  h += (z * -0.012) + (x * 0.006);

  // Landmark shaping
  const L = LANDMARKS;
  // Castle hill: flat crown, steep-ish sides
  h = flatten(h, x, z, L.castle.x, L.castle.z, 40, 55, L.castle.y + SX.noise2(x * 0.05, z * 0.05) * 0.4);
  // Tower hill
  h = flatten(h, x, z, L.tower.x, L.tower.z, 18, 48, L.tower.y + SX.noise2(x * 0.07, z * 0.07) * 0.5);
  // Stones shelf
  h = flatten(h, x, z, L.stones.x, L.stones.z, 30, 28, L.stones.y + SX.noise2(x * 0.08, z * 0.08) * 0.25);
  // Sunken court
  h = flatten(h, x, z, L.court.x, L.court.z, 34, 26, L.court.y + SX.noise2(x * 0.1, z * 0.1) * 0.2);
  // Tarn basin: flatten then dish
  {
    // A shelving shore: the floor crosses the water level (-4.6) at about r 58, then deepens to -12.5
    const d = Math.hypot(x - L.tarn.x, z - L.tarn.z);
    h = flatten(h, x, z, L.tarn.x, L.tarn.z, 62, 34, -4.0 + SX.noise2(x * 0.05, z * 0.05) * 0.25);
    const bowl = 1 - smoothstep(36, 60, d);
    h -= bowl * 8.5 + SX.noise2(x * 0.03, z * 0.03) * 0.5 * (1 - smoothstep(40, 70, d));
  }
  // Fen: broad, flat, pocked with pools
  {
    const d = Math.hypot(x - L.fen.x, z - L.fen.z);
    h = flatten(h, x, z, L.fen.x, L.fen.z, 70, 45, L.fen.y);
    const inFen = 1 - smoothstep(60, 85, d);
    const pools = SX.warped2(x * 0.03 + 11, z * 0.03 - 7, 4, 0.9);
    h -= inFen * (smoothstep(0.05, 0.45, pools) * 2.2 + 0.3);
  }
  // Orchard terraces: faint steps
  {
    const d = Math.hypot(x - L.orchard.x, z - L.orchard.z);
    const m = 1 - smoothstep(40, 65, d);
    const terraced = Math.floor((h + 100) / 1.2) * 1.2 - 100;
    h = lerp(h, terraced, m * 0.7);
  }
  // Causeway: a raised, level-ish bed
  {
    const cd = causewayDistance(x, z);
    const m = 1 - smoothstep(3.2, 7.5, cd);
    if (m > 0) {
      // level across the road by sampling base height at the nearest road axis is expensive; approximate with a mild lift
      h = lerp(h, h + 0.35 - SX.noise2(x * 0.02, z * 0.02) * 0.1, m);
    }
  }

  // Bounding mountains, with a glacier notch in the north
  const r = Math.hypot(x, z);
  const ramp = smoothstep(WORLD.regionRadius - 10, WORLD.mountainRadius, r);
  if (ramp > 0) {
    const ridge = SX.ridged2(x * 0.006 + 2.3, z * 0.006 - 1.1, 5);
    const ridge2 = SY.ridged2(x * 0.02, z * 0.02, 4);
    let mtn = ramp * ramp * 150 + ramp * (ridge * 90 + ridge2 * 25);
    // A saddle in the western wall where the sun sits
    const ang = Math.atan2(z, x);
    let dAng = Math.abs(ang - SUN.azimuth); if (dAng > Math.PI) dAng = Math.PI * 2 - dAng;
    const saddle = 1 - smoothstep(0.1, 0.3, dAng);
    mtn = lerp(mtn, ramp * ramp * 55 + ramp * (ridge * 20 + ridge2 * 10), saddle);
    const g = glacierMask(x, z);
    // glacier: a smoother, lower tongue riding up into the pass
    const glacierH = ramp * ramp * 60 + ramp * 20 + SX.fbm2(x * 0.02, z * 0.02, 3) * 2.5 * ramp;
    mtn = lerp(mtn, glacierH, g);
    h += mtn;
  }
  // Glacier tongue below the ramp too: ice spills a little way onto the moor
  {
    const g = glacierMask(x, z) * smoothstep(-215, -265, z) * (1 - ramp);
    h = lerp(h, h + 2.5 + SX.fbm2(x * 0.03, z * 0.03, 3) * 1.2, g);
  }
  return h;
}

// Analytic-ish normal by central differences.
const _n = new THREE.Vector3();
export function normalAt(x, z, out = _n, eps = 0.6) {
  const hl = heightAt(x - eps, z), hr = heightAt(x + eps, z);
  const hd = heightAt(x, z - eps), hu = heightAt(x, z + eps);
  out.set(hl - hr, 2 * eps, hd - hu).normalize();
  return out;
}
export function slopeAt(x, z) {
  const n = normalAt(x, z, new THREE.Vector3());
  return Math.acos(clamp(n.y, -1, 1)); // radians from vertical
}

// Biome weights at a point. Not normalised; each is 0..1.
export function biomeAt(x, z) {
  const L = LANDMARKS;
  const h = heightAt(x, z);
  const slope = slopeAt(x, z);
  const r = Math.hypot(x, z);
  const rock = smoothstep(0.55, 0.95, slope) + smoothstep(WORLD.regionRadius, WORLD.regionRadius + 60, r) * 0.6;
  const ice = glacierMask(x, z) * smoothstep(-200, -240, z);
  const dWood = Math.hypot(x - L.wood.x, z - L.wood.z);
  const wood = (1 - smoothstep(L.wood.r - 25, L.wood.r + 15, dWood)) * (0.6 + 0.4 * SX.warped2(x * 0.02, z * 0.02, 3));
  const dFen = Math.hypot(x - L.fen.x, z - L.fen.z);
  const marsh = 1 - smoothstep(L.fen.r - 15, L.fen.r + 25, dFen);
  const dTarn = Math.hypot(x - L.tarn.x, z - L.tarn.z);
  const shore = (1 - smoothstep(58, 72, dTarn)) * smoothstep(50, 58, dTarn) + (marsh * smoothstep(-2.6, -2.2, h) * (1 - smoothstep(-1.8, -1.2, h)));
  const dOrch = Math.hypot(x - L.orchard.x, z - L.orchard.z);
  const orchard = 1 - smoothstep(L.orchard.r - 10, L.orchard.r + 10, dOrch);
  const dMor = Math.hypot(x - L.moraine.x, z - L.moraine.z);
  const crystal = (1 - smoothstep(40, 110, dMor)) * (0.5 + 0.5 * SX.warped2(x * 0.03 + 4, z * 0.03, 3));
  const heath = smoothstep(-0.2, 0.5, SX.warped2(x * 0.008 + 20, z * 0.008 + 9, 4));
  const moor = clamp(1 - rock - ice - marsh - wood * 0.5, 0, 1);
  return { moor, heath, wood, marsh, shore, rock, ice, orchard, crystal, slope, h };
}

// Water height at a point, or null when there is no water body here.
export function waterLevelAt(x, z) {
  for (const w of Object.values(WATER)) {
    if (Math.hypot(x - w.x, z - w.z) < w.r) return w.y;
  }
  return null;
}
export function isUnderwater(x, z) {
  const w = waterLevelAt(x, z);
  return w !== null && heightAt(x, z) < w;
}

// A small procedural detail texture: periodic value-noise fbm so it tiles with no seam or banding.
function makeDetailTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry32(991);
  const lat = new Float32Array(64 * 64);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const pv = (x, y, period) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % period) + period) % period, y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period, y1 = (y0 + 1) % period;
    const idx = (xx, yy) => lat[((yy * 7 + xx * 13) % 4096 + 4096) % 4096];
    const a = idx(x0, y0), b = idx(x1, y0), c = idx(x0, y1), d = idx(x1, y1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const fbm = (u, v, base, oct) => {
    let sum = 0, amp = 0.5, norm = 0, per = base;
    for (let o = 0; o < oct; o++) { sum += amp * pv(u * per, v * per, per); norm += amp; amp *= 0.5; per *= 2; }
    return sum / norm;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const f = fbm(u, v, 4, 5);
    const g = fbm(u + 0.37, v + 0.11, 8, 4);
    const h = fbm(u + 0.71, v + 0.53, 16, 3);
    const i = (y * size + x) * 4;
    data[i] = f * 255; data[i + 1] = g * 255; data[i + 2] = h * 255; data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true; tex.needsUpdate = true;
  return tex;
}

const C = (hex) => new THREE.Color(hex);

export function buildTerrain(ctx) {
  const { scene } = ctx;
  const size = WORLD.size, segs = ctx.quality === 'low' ? 320 : 480;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const iceArr = new Float32Array(pos.count);
  const col = new THREE.Color();
  const cMoor = C(PALETTE.moorGrass), cDry = C(PALETTE.moorDry), cHeath = C(PALETTE.heather), cMud = C(PALETTE.mud);
  const cRock = C(PALETTE.rock), cRockD = C(PALETTE.rockDark), cScree = C(PALETTE.scree), cIce = C(PALETTE.ice);
  const cWood = C('#2e3420'), cShore = C('#45403a'), cOrch = C('#5a4a2c'), cCrys = C('#5a7a86'), cRoad = C('#6a5e55'), cPeat = C('#1e1a16'), cMoss = C('#3e5a30');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const b = biomeAt(x, z);
    // base: moor grass to dry grass by noise, heather patches
    const dry = SX.warped2(x * 0.01 + 3, z * 0.01 + 1, 3) * 0.5 + 0.5;
    col.copy(cMoor).lerp(cDry, dry);
    col.lerp(cHeath, b.heath * 0.55 * b.moor);
    // peat hags and moss cushions break up the moor
    const peat = smoothstep(0.35, 0.6, SX.warped2(x * 0.02 + 70, z * 0.02 + 33, 3));
    col.lerp(cPeat, peat * 0.7 * b.moor);
    const moss = smoothstep(0.3, 0.55, SX.warped2(x * 0.05 - 40, z * 0.05 + 12, 3)) * smoothstep(2, -2, y);
    col.lerp(cMoss, moss * 0.5);
    col.lerp(cWood, b.wood * 0.8);
    col.lerp(cOrch, b.orchard * 0.5);
    col.lerp(cMud, b.marsh * 0.85);
    col.lerp(cShore, b.shore * 0.8);
    col.lerp(cCrys, b.crystal * 0.5);
    // slope → rock; height → scree then dark rock
    const rockMix = clamp(b.rock, 0, 1);
    tmp.copy(cScree).lerp(cRock, smoothstep(10, 60, y)).lerp(cRockD, smoothstep(60, 160, y));
    col.lerp(tmp, rockMix);
    col.lerp(cIce, b.ice);
    iceArr[i] = b.ice;
    // causeway paving colour
    const cd = causewayDistance(x, z);
    col.lerp(cRoad, 1 - smoothstep(2.6, 4.2, cd));
    // a little per-vertex variation so the moor isn't flat
    const v = SX.noise2(x * 0.11, z * 0.11) * 0.06;
    col.r = clamp(col.r + v, 0, 1); col.g = clamp(col.g + v, 0, 1); col.b = clamp(col.b + v, 0, 1);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aIce', new THREE.BufferAttribute(iceArr, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const detail = makeDetailTexture();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aIce; varying vec3 vTPos; varying vec3 vTNormal; varying float vIce;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTPos = (modelMatrix * vec4(position,1.0)).xyz; vTNormal = normalize(mat3(modelMatrix) * normal); vIce = aIce;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uDetail; varying vec3 vTPos; varying vec3 vTNormal; varying float vIce;
        vec3 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
          vec3 w = abs(n); w = pow(w, vec3(4.0)); w /= (w.x + w.y + w.z);
          return texture2D(t, p.yz * s).rgb * w.x + texture2D(t, p.xz * s).rgb * w.y + texture2D(t, p.xy * s).rgb * w.z;
        }
        float fpHeight(vec3 p, vec3 n) {
          vec3 a = triplanar(uDetail, p, n, 0.3);
          vec3 b = triplanar(uDetail, p, n, 1.6);
          return a.r * 0.3 + b.g * 0.6 + a.b * 0.2;
        }
        // Perturb the world-space normal from the detail height so grazing light picks out the ground
        vec3 fpBumpWorld(vec3 p, vec3 n, float strength) {
          float e = 0.12;
          float h0 = fpHeight(p, n);
          vec3 g = vec3(fpHeight(p + vec3(e, 0.0, 0.0), n) - h0, fpHeight(p + vec3(0.0, e, 0.0), n) - h0, fpHeight(p + vec3(0.0, 0.0, e), n) - h0) / e;
          g -= n * dot(g, n);
          return normalize(n - g * strength);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 d1 = triplanar(uDetail, vTPos, vTNormal, 0.35);
          vec3 d2 = triplanar(uDetail, vTPos, vTNormal, 0.045);
          vec3 d3 = triplanar(uDetail, vTPos, vTNormal, 2.1);
          float grain = (d1.r - 0.5) * 0.55 + (d2.g - 0.5) * 0.4 + (d3.b - 0.4) * 0.25;
          // bare earth patches where the detail noise is low on flat ground
          float bare = smoothstep(0.62, 0.78, d2.r) * smoothstep(0.6, 0.9, vTNormal.y);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.6, 0.5), bare * 0.6);
          // rock faces get stratified streaks
          float rocky = smoothstep(0.75, 0.45, vTNormal.y);
          float strata = (sin(vTPos.y * 1.7 + d2.r * 4.0) * 0.5 + 0.5) * 0.12 * rocky;
          diffuseColor.rgb *= 1.0 + grain - strata;
          // dampness darkens low ground
          float wet = smoothstep(-1.0, -3.2, vTPos.y);
          diffuseColor.rgb *= 1.0 - wet * 0.35;
          // glacier ice: pale, faintly blue from within, with dark crevasse lines
          float crev = smoothstep(0.48, 0.5, abs(fract(vTPos.x * 0.07 + d2.r * 3.0 + vTPos.z * 0.015) - 0.5));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.72, 0.84) * (0.75 + 0.25 * d1.g) * (1.0 - crev * 0.6), vIce * 0.9);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.6, smoothstep(-1.0, -3.2, vTPos.y));
        roughnessFactor = mix(roughnessFactor, 0.45, vIce);`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          float camD = length(vTPos - cameraPosition);
          float bumpStrength = 0.07 * (1.0 - smoothstep(10.0, 60.0, camD));
          vec3 nW = fpBumpWorld(vTPos, normalize(vTNormal), bumpStrength);
          normal = normalize(mat3(viewMatrix) * nW);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.05, 0.09, 0.14) * vIce;`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'terrain';
  scene.add(mesh);

  return {
    mesh, heightAt, normalAt, slopeAt, biomeAt, waterLevelAt, isUnderwater, causewayDistance, glacierMask,
    size, regionRadius: WORLD.regionRadius,
  };
}
