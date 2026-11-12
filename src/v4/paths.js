// The map structure (v4 map; plans/wilderness-v4.md "Map structure", placement plan section 4), as a world module:
//   - the leads: worn paths P1-P17, the old kerb K1 and the rivulets R1-R5 (traced in paths/routes.js), each drawn
//     as a wear on the ground in the material of the region it crosses, never as a plank: a soft-edged ground
//     decal in a clone of the terrain's own lighting, its middle bare or trodden, its shoulders thinning into the
//     cover (vegetation wears the plants off them through routes.js's wornAt), a slight groove in its normal; a
//     rivulet is a thin wet line in a damp margin, glinting with the sky. Drawn in tiles of 200 m, so only the
//     tiles in view cost a draw call.
//   - the pit at the causeway's end (SITES.pit, name [Proposed]): its cut is paths/ground.js; here the road's last
//     slabs tilting into it and hanging over nothing, the broken crust and earth of its lip, and the colliders
//     along its rim, so the walker stands at the edge rather than falls into a hole with no way out.
//   - the taller Tumbling Water: its face and lip are paths/ground.js (terrain.js's FALL_DROP); here the mist
//     column, widened 2.5 times and carried up the fall, with a drift of it across the gap toward the pit (the
//     spray and the doubled rumble are v2/riverlife.js's).
// Registers __fp.paths: { stats(), leadAt(x, z), leads, pit, fall }.
import * as THREE from 'three';
import { leads, nearestLead, MATERIAL_KEYS, MATERIALS, wornAt } from './paths/routes.js';
import { PIT, pitEdge, pitRim, PIT_PAVE, FALL } from './paths/ground.js';
import { groundOf, stoneGeo } from './regions/common.js';
import { hexCellsIn, HEX_R } from '../structures/common.js';
import { smoothstep, clamp } from '../noise.js';

const TILE = 250;
const KIND = { path: 0, kerb: 1, rivulet: 2 };

// GLSL: value noise on the ground plane, for ragged edges and specks (no textures)
const NOISE_GLSL = /* glsl */`
  float lHash(vec2 p) { p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
  float lNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(lHash(i), lHash(i + vec2(1, 0)), f.x), mix(lHash(i + vec2(0, 1)), lHash(i + vec2(1, 1)), f.x), f.y); }
  float lFbm(vec2 p) { return lNoise(p) * 0.55 + lNoise(p * 2.13 + 7.1) * 0.3 + lNoise(p * 4.7 - 3.3) * 0.15; }`;

// per material: the trodden middle's colour, the speck colour (pebbles, clitter, footings, crust), speck size
// (cycles a metre) and amount. Order is MATERIAL_KEYS.
const MAT_LOOK = {
  moor: ['#3a3024', '#5e523c', 3.0, 0.25], demesne: ['#3c3628', '#5a5038', 3.0, 0.2], bletting: ['#45392a', '#6a5636', 2.6, 0.2],
  outwash: ['#4a4844', '#8e8a82', 5.0, 0.55], saltings: ['#6e625a', '#cfc6c0', 1.6, 0.55], strandline: ['#24221f', '#3e3a36', 6.0, 0.8],
  highLing: ['#2e2620', '#8c7c78', 1.4, 0.45], lynchets: ['#3e3628', '#76716a', 1.1, 0.55], adust: ['#7e4a32', '#a86848', 2.2, 0.35],
  wood: ['#2c2118', '#4a3220', 2.4, 0.4], fen: ['#2a2820', '#3c382c', 2.0, 0.3], lattice: ['#5c6670', '#9ab0bc', 4.0, 0.5],
};
const glslVec3 = (hex) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`; };
const MAT_GLSL = (() => {
  let s = 'void lMat(float m, out vec3 base, out vec3 speck, out float sf, out float sa) {\n';
  MATERIAL_KEYS.forEach((k, i) => {
    const [b, sp, f, a] = MAT_LOOK[k];
    s += `  ${i ? 'else ' : ''}if (m < ${i}.5) { base = ${glslVec3(b)}; speck = ${glslVec3(sp)}; sf = ${f.toFixed(2)}; sa = ${a.toFixed(2)}; }\n`;
  });
  return s + '  else { base = vec3(0.23, 0.19, 0.14); speck = vec3(0.37, 0.32, 0.24); sf = 3.0; sa = 0.2; }\n}';
})();

function leadMaterial(ctx) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const uFlicker = ctx.sky?.flicker || { value: 1 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFlick = uFlicker;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aLead; attribute vec3 aMat; attribute vec3 aGround; varying vec4 vLead; varying vec3 vMat; varying vec3 vLPos; varying vec3 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLead = aLead; vMat = aMat; vGround = aGround; vLPos = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vLead; varying vec3 vMat; varying vec3 vLPos; varying vec3 vGround; uniform float uFlick;
        ${NOISE_GLSL}
        ${MAT_GLSL}
        float lGroove; float lWet;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float u = vLead.x, along = vLead.y, kind = vLead.z, open = vLead.w, p = abs(u);
          vec2 g = vLPos.xz;
          float n = lFbm(g * 1.7), n2 = lNoise(g * 0.35);
          vec3 base, speck; float sf, sa;
          lMat(vMat.x + 0.0, base, speck, sf, sa);
          float a; vec3 col;
          lWet = 0.0; lGroove = 0.0;
          if (kind < 0.5) {
            // a worn path: a trodden middle, ragged shoulders where the cover comes back; specks of its ground
            float edge = p + (n - 0.5) * 0.55 + (n2 - 0.5) * 0.25;
            a = 1.0 - smoothstep(0.55, 1.0, edge);
            float sp = smoothstep(1.0 - sa, 1.0, lNoise(g * sf) * 0.7 + lNoise(g * sf * 2.3 + 3.1) * 0.3);
            // v8-01: the tread's colour is set against the ground under it (the terrain's own colour there, aGround),
            // not as a fixed hex: the material's hue at a luminance well above the ground's on dark ground, below it on
            // pale ground (salt, clay), so the line reads in every region; a way (vMat.y 1) more than a trod
            const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
            float gl = max(dot(vGround, LUM), 0.004), bl = max(dot(base, LUM), 0.004), lift = vMat.y;
            float target = gl < 0.2 ? min(0.5, max(gl * (1.9 + 0.9 * lift), gl + 0.04 + 0.04 * lift)) : gl * (0.5 - 0.12 * lift);
            vec3 hue = mix(vGround / gl, base / bl, 0.6);
            // two trodden lines where feet go, a little paler, and the turf breaking in at the edges in tufts
            float rut = smoothstep(0.16, 0.0, abs(p - 0.3 - (n2 - 0.5) * 0.12));
            col = hue * target * (0.8 + 0.34 * n) * (1.0 + 0.12 * rut);
            a *= 1.0 - 0.55 * smoothstep(0.58, 0.74, lFbm(g * 0.8 + 11.0)) * smoothstep(0.15, 0.6, p);
            col = mix(col, speck * (target / max(dot(speck, LUM), 0.004)) * (0.8 + 0.4 * lHash(floor(g * sf))), sp * 0.6);
            a *= 0.97 * (0.8 + 0.2 * lift);
            lGroove = u * (1.0 - smoothstep(0.3, 0.9, p));
          } else if (kind < 1.5) {
            // the kerb: dressed blocks set in a line, joints every 0.9 m, some sunk under the turf
            float j = fract(along / 0.9), blk = floor(along / 0.9);
            float joint = smoothstep(0.0, 0.04, j) * smoothstep(1.0, 0.96, j);
            float gone = step(0.78, lHash(vec2(blk, 3.7)));
            col = vec3(0.42, 0.39, 0.36) * (0.8 + 0.3 * lHash(vec2(blk, 1.3))) * (0.85 + 0.3 * n);
            col = mix(col * 0.45, col, joint);
            col = mix(col, vec3(0.2, 0.24, 0.14), smoothstep(0.55, 0.85, n) * 0.6); // moss on the worn ones
            a = (1.0 - smoothstep(0.75, 1.0, p + (n - 0.5) * 0.2)) * (1.0 - gone * smoothstep(0.3, 0.7, n2 + 0.2));
            lGroove = -u * 0.8 * smoothstep(0.6, 1.0, p);
          } else {
            // a rivulet: the wet line, a damp margin either side
            float wob = (n - 0.5) * 0.35;
            float line = 1.0 - smoothstep(0.18, 0.38, p + wob);
            float damp = 1.0 - smoothstep(0.35, 1.0, p + wob * 1.5);
            col = mix(base * 0.62, vec3(0.035, 0.033, 0.04), line);
            a = max(damp * 0.7, line) * (0.85 + 0.15 * n2);
            lWet = line;
            lGroove = u * line;
          }
          a *= open;
          // far off, a lead keeps only its line: no shimmer of specks
          float dist = length(vLPos - cameraPosition);
          a *= 1.0 - smoothstep(240.0, 340.0, dist);
          if (a < 0.004) discard;
          diffuseColor.rgb = col;
          diffuseColor.a = a;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, lWet);`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          // the groove: tilt the normal across the lead (aMat.z holds which way across is, as an angle)
          vec3 acrossW = vec3(cos(vMat.z), 0.0, sin(vMat.z));
          normal = normalize(normal + mat3(viewMatrix) * acrossW * lGroove * 0.35);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.05, 0.04, 0.06) * lWet * 0.25 * uFlick;`);
  };
  mat.customProgramCacheKey = () => 'fp-v4-leads';
  return mat;
}

// ribbons for every lead line, split into 200 m tiles
// v8-01: the terrain's own vertex colour at (x, z) (linear), bilinear over its grid: what a lead is set against
function groundColourSampler(terrain) {
  const g = terrain.mesh?.geometry, C = g?.attributes.color, P = g?.attributes.position;
  if (!C || !P) return (x, z, out) => { out[0] = 0.08; out[1] = 0.08; out[2] = 0.05; return out; };
  const n = Math.round(Math.sqrt(P.count)), x0 = P.getX(0), z0 = P.getZ(0), dx = P.getX(1) - x0, dz = P.getZ(n) - z0;
  return (x, z, out) => {
    const fx = clamp((x - x0) / dx, 0, n - 1.001), fz = clamp((z - z0) / dz, 0, n - 1.001), i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const k00 = j * n + i, k10 = k00 + 1, k01 = k00 + n, k11 = k01 + 1;
    for (let c = 0; c < 3; c++) {
      const a = C.array[k00 * 3 + c] * (1 - tx) + C.array[k10 * 3 + c] * tx, b = C.array[k01 * 3 + c] * (1 - tx) + C.array[k11 * 3 + c] * tx;
      out[c] = a * (1 - tz) + b * tz;
    }
    return out;
  };
}

function buildLeads(ctx) {
  const { terrain } = ctx;
  const groundCol = groundColourSampler(terrain), _gc = [0, 0, 0];
  const low = ctx.quality === 'low';
  const G = groundOf(terrain);
  const B = leads();
  const step = low ? 1.3 : 0.7, across = low ? [-1, 0, 1] : [-1, -0.5, 0, 0.5, 1];
  const tiles = new Map();
  const tileOf = (x, z) => `${Math.floor((x + TILE / 2) / TILE)},${Math.floor((z + TILE / 2) / TILE)}`; // v8-01: centred, so the walkable floor takes 3 x 3 tiles
  const getTile = (k) => { let t = tiles.get(k); if (!t) tiles.set(k, (t = { pos: [], lead: [], mat: [], gc: [], idx: [] })); return t; };
  const matIdx = Object.fromEntries(MATERIAL_KEYS.map((k, i) => [k, i]));
  let samplesTotal = 0;
  for (const L of B.list) {
    if (L.kind === 'kerb') continue; // the kerb is stones (buildKerb), not a wear
    const kind = KIND[L.kind];
    const lift = L.cls === 'way' ? 1 : 0.55; // v8-01: a way reads paler than a trod
    // the decal is wider than the worn line: the shoulders are where it fades
    const half = L.kind === 'rivulet' ? Math.max(0.55, L.w * 3.2) : L.kind === 'kerb' ? L.w * 1.4 : L.w * 2.0;
    for (const S of L.lines) {
      const len = S[S.length - 1].s;
      const n = Math.max(2, Math.ceil(len / step) + 1);
      // resample the line evenly; interpolate the sample data
      let j = 0, cur = null;
      for (let i = 0; i < n; i++) {
        const s = (len * i) / (n - 1);
        while (j < S.length - 2 && S[j + 1].s < s) j++;
        const a = S[j], b = S[j + 1], t = clamp((s - a.s) / Math.max(1e-6, b.s - a.s), 0, 1);
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        let tx = b.x - a.x, tz = b.z - a.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        const m = t < 0.5 ? a : b;
        const open = Math.min(a.open, b.open) * smoothstep(0, 2.5, s) * smoothstep(0, 2.5, len - s);
        const k = tileOf(x, z);
        if (!cur || cur.k !== k) {
          // a new strip in this tile (overlapping the last sample of the previous one)
          const T = getTile(k);
          const nc = { k, T, rows: 0 };
          if (cur && cur.last) { pushRow(nc, cur.last); }
          cur = nc;
        }
        const row = { x, z, tx, tz, s, open, mat: matIdx[m.mat] ?? 0 };
        pushRow(cur, row);
        cur.last = row;
        samplesTotal++;
      }
      cur = null;
    }
    function pushRow(c, r) {
      const T = c.T, base = T.pos.length / 3, nx = -r.tz, nz = r.tx; // across: left of the direction
      const ang = Math.atan2(nz, nx);
      for (const u of across) {
        const x = r.x + nx * u * half, z = r.z + nz * u * half;
        let y = Math.max(G.heightAt(x, z), terrain.heightAt(x, z)) + 0.035;
        if (L.kind === 'kerb') y += 0.05 * (1 - Math.abs(u)); // the stones stand a little proud
        T.pos.push(x, y, z);
        T.lead.push(u, r.s, kind, r.open);
        T.mat.push(r.mat, lift, ang);
        groundCol(x, z, _gc); T.gc.push(_gc[0], _gc[1], _gc[2]);
      }
      if (c.rows > 0) {
        const w = across.length, b0 = base - w;
        for (let q = 0; q < w - 1; q++) T.idx.push(b0 + q, b0 + q + 1, base + q, b0 + q + 1, base + q + 1, base + q); // facing up
      }
      c.rows++;
    }
  }
  const mat = leadMaterial(ctx);
  const meshes = [];
  for (const [k, T] of tiles) {
    if (!T.idx.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(T.pos, 3));
    g.setAttribute('aLead', new THREE.Float32BufferAttribute(T.lead, 4));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(T.mat, 3));
    g.setAttribute('aGround', new THREE.Float32BufferAttribute(T.gc, 3));
    g.setIndex(T.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(T.idx, 1) : new THREE.Uint16BufferAttribute(T.idx, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `paths-leads-${k}`; mesh.receiveShadow = true; mesh.castShadow = false; mesh.renderOrder = 1;
    ctx.scene.add(mesh);
    meshes.push(mesh);
  }
  return { meshes, samples: samplesTotal };
}


// ---------------------------------------------------------------- K1, the old kerb (the Leerie's row)
// A line of dressed kerbstones, each a metre or so long, set end to end and sunk in the turf: a few gone, a few
// canted or heaved, their tops worn round and greened. Instanced, one draw call.
function kerbGeometry() {
  const g = new THREE.BoxGeometry(1, 1, 1, 3, 2, 2);
  { // worn arrises: pull the corners in, round the top
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), c = Math.abs(x) * 2 * Math.abs(z) * 2;
      p.setXYZ(i, x * (1 - 0.06 * (y + 0.5)), y - (y > 0 ? 0.18 * Math.max(Math.abs(z) * 2, 0) ** 2 + 0.05 * c : 0), z * (1 - 0.1 * (y + 0.5)));
    }
    g.computeVertexNormals();
  }
  return g;
}
function buildKerb(ctx) {
  const { terrain, scene } = ctx;
  const rng = ctx.makeRng(41401);
  const K = leads().list.find((l) => l.kind === 'kerb');
  if (!K) return { meshes: [], stones: 0 };
  const S = K.lines[0], len = S[S.length - 1].s;
  const g = kerbGeometry();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
  const list = [];
  for (let s = 0.6; s < len - 0.4; s += 0.92 + rng() * 0.12) {
    if (rng() < 0.13) continue; // gone
    let j = 0; while (j < S.length - 2 && S[j + 1].s < s) j++;
    const a = S[j], b = S[j + 1], t = clamp((s - a.s) / Math.max(1e-6, b.s - a.s), 0, 1);
    const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z) + (rng() - 0.5) * 0.06;
    const h = 0.34, proud = 0.05 + rng() * 0.12, heave = rng() < 0.15;
    list.push({ x, z, y: terrain.heightAt(x, z) - h / 2 + proud + (heave ? 0.06 : 0), yaw, rx: (rng() - 0.5) * (heave ? 0.35 : 0.06), rz: (rng() - 0.5) * (heave ? 0.3 : 0.05),
      l: 0.84 + rng() * 0.12, w: 0.3 + rng() * 0.05, h, c: 0.17 + rng() * 0.08, moss: rng() });
  }
  const im = new THREE.InstancedMesh(g, mat, list.length);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), col = new THREE.Color(), _moss = new THREE.Color(0.1, 0.13, 0.06);
  list.forEach((k, i) => {
    _e.set(k.rx, k.yaw, k.rz, 'YXZ'); _q.setFromEuler(_e); _p.set(k.x, k.y, k.z); _s.set(k.w, k.h, k.l);
    im.setMatrixAt(i, _m.compose(_p, _q, _s));
    col.setRGB(k.c * 1.1, k.c, k.c * 0.84).lerp(_moss, k.moss * 0.5);
    im.setColorAt(i, col);
  });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = true; im.receiveShadow = true; im.name = 'paths-kerb';
  im.computeBoundingSphere();
  scene.add(im);
  return { meshes: [im], stones: list.length };
}

// ---------------------------------------------------------------- v8-01: the ways' kerbs and the slabs
// Here and there along a way, a run of three to six kerbstones on one side, the Heliarchy's edging, mostly gone;
// and where a lead with slabs crosses open water (the fen, the reed gap), flat stepping slabs a stride apart,
// which a walker can stand on (a walkable floor a hand over the water). One instanced mesh each.
const hx = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
function sampleLine(S, s) {
  let j = 0; while (j < S.length - 2 && S[j + 1].s < s) j++;
  const a = S[j], b = S[j + 1], t = clamp((s - a.s) / Math.max(1e-6, b.s - a.s), 0, 1), l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l };
}
function buildWaysEdge(ctx) {
  const { terrain, scene } = ctx;
  const B = leads();
  const kerbs = [], slabs = [];
  const wet = (x, z) => { const wl = terrain.waterLevelAt(x, z); return wl !== null && terrain.heightAt(x, z) > wl - 3 && terrain.heightAt(x, z) < wl + 0.04 ? wl : null; };
  for (const L of B.list) {
    if (L.kind !== 'path') continue;
    for (const S of L.lines) {
      const len = S[S.length - 1].s;
      if (L.cls === 'way') for (let s = 8; s < len - 10; s += 21) {
        const h = hx(s + L.seed, len);
        if (h > 0.5) continue;
        const side = hx(len, s * 1.7) < 0.5 ? -1 : 1, n = 3 + Math.floor(hx(s, L.seed) * 4);
        for (let k = 0; k < n; k++) {
          const p = sampleLine(S, s + k * 0.95);
          const x = p.x - p.dz * side * (L.w + 0.28), z = p.z + p.dx * side * (L.w + 0.28);
          if (wet(x, z) !== null || terrain.causewayDistance(x, z) < 2.5) continue;
          if (hx(x, z) < 0.15) continue; // one gone
          const heave = hx(z, x) < 0.15;
          kerbs.push({ x, z, y: terrain.heightAt(x, z) - 0.17 + 0.04 + hx(x * 3, z) * 0.1, yaw: Math.atan2(p.dx, p.dz) + (hx(x, z * 2) - 0.5) * 0.08,
            rx: (hx(x * 5, z) - 0.5) * (heave ? 0.3 : 0.05), rz: (hx(x, z * 5) - 0.5) * (heave ? 0.25 : 0.05), c: 0.2 + hx(x * 7, z) * 0.08, moss: hx(x, z * 7) });
        }
      }
      if (L.slabs) for (let s = 0.5; s < len; s += 1.0) {
        const p = sampleLine(S, s);
        const wl = wet(p.x, p.z);
        if (wl === null) continue;
        const j = (hx(p.x, p.z) - 0.5) * 0.18;
        slabs.push({ x: p.x - p.dz * j, z: p.z + p.dx * j, y: wl + 0.06, yaw: Math.atan2(p.dx, p.dz) + (hx(p.z, p.x) - 0.5) * 0.4, w: L.w * 1.5 + hx(s, p.x) * 0.3, c: 0.26 + hx(p.x * 3, p.z) * 0.1 });
      }
    }
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), col = new THREE.Color(), _moss = new THREE.Color(0.1, 0.13, 0.06);
  const meshes = [];
  if (kerbs.length) {
    const im = new THREE.InstancedMesh(kerbGeometry(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 }), kerbs.length);
    kerbs.forEach((k, i) => {
      _e.set(k.rx, k.yaw, k.rz, 'YXZ'); _q.setFromEuler(_e); _p.set(k.x, k.y, k.z); _s.set(0.26, 0.34, 0.88);
      im.setMatrixAt(i, _m.compose(_p, _q, _s));
      im.setColorAt(i, col.setRGB(k.c * 1.06, k.c, k.c * 1.08).lerp(_moss, k.moss * 0.45)); // Heliarch grey-violet, greened
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true; im.name = 'paths-way-kerbs'; im.computeBoundingSphere();
    scene.add(im); meshes.push(im);
  }
  if (slabs.length) {
    const g = new THREE.CylinderGeometry(0.5, 0.56, 0.22, 7, 1).translate(0, -0.08, 0);
    { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const k = 1 + 0.12 * Math.sin(a * 3 + 1) ; p.setX(i, p.getX(i) * k * 1.25); p.setZ(i, p.getZ(i) * k * 0.8); } g.computeVertexNormals(); }
    const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), slabs.length);
    slabs.forEach((k, i) => {
      _e.set(0, k.yaw + Math.PI / 2, 0); _q.setFromEuler(_e); _p.set(k.x, k.y, k.z); _s.set(k.w * 0.8, 1, 0.9);
      im.setMatrixAt(i, _m.compose(_p, _q, _s));
      im.setColorAt(i, col.setRGB(k.c * 1.04, k.c, k.c * 1.06));
    });
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    im.castShadow = false; im.receiveShadow = true; im.name = 'paths-slabs'; im.computeBoundingSphere();
    scene.add(im); meshes.push(im);
    // a floor on the slab lines over the water: the walker steps from slab to slab rather than wading
    const slabLeads = new Set(B.list.filter((l) => l.slabs).map((l) => l.id)), _h = {};
    ctx.addWalkable?.((x, z) => {
      const h = nearestLead(x, z, 0, _h);
      if (!h || !slabLeads.has(h.id) || h.d > h.w * 1.1) return null;
      const wl = terrain.waterLevelAt(x, z);
      return wl !== null && terrain.heightAt(x, z) < wl + 0.04 ? wl + 0.06 : null;
    });
  }
  return { meshes, kerbs: kerbs.length, slabs: slabs.length };
}

// ---------------------------------------------------------------- the pit's throat
// The terrain's grid draws the hole's walls as a few long flat faces; this is the rock in front of them: a ragged
// veneer a little inside the drawn wall, from the lip down, jutting in ledges of harder beds, darkening to nothing
// at the floor, and a floor of black rubble. One mesh.
function buildThroat(ctx) {
  const { terrain } = ctx;
  const low = ctx.quality === 'low';
  const G = groundOf(terrain);
  const N = ctx.noise;
  const nb = low ? 120 : 240, rows = low ? 12 : 20;
  const top = [], pos = [], col = [], idx = [];
  // per bearing: where the drawn ground starts to drop (the top), and the floor
  for (let i = 0; i < nb; i++) {
    const b = (i / nb) * 360, a = (b * Math.PI) / 180, dx = Math.sin(a), dz = -Math.cos(a);
    const R = pitRim(b);
    const yTop = terrain.heightAt(PIT.x + dx * (R + 0.6), PIT.z + dz * (R + 0.6));
    const yFloor = G.heightAt(PIT.x + dx * Math.max(1, R - 6), PIT.z + dz * Math.max(1, R - 6));
    top.push({ dx, dz, R, yTop, yFloor });
  }
  const yAt = (T, r) => G.heightAt(PIT.x + T.dx * r, PIT.z + T.dz * r);
  for (let i = 0; i < nb; i++) {
    const T = top[i];
    for (let k = 0; k <= rows; k++) {
      const f = k / rows, y = T.yTop - 0.15 + (T.yFloor + 0.4 - T.yTop) * Math.pow(f, 0.85);
      // where the drawn surface crosses y on this bearing, searched inward from outside the rim
      let r = T.R + 3;
      for (let rr = T.R + 3; rr > 0.5; rr -= 0.2) { if (yAt(T, rr) <= y) { r = rr; break; } }
      if (k === 0) r = Math.min(r, T.R + 0.2);
      const bed = Math.max(0, N.noise2(y * 0.35, i * 0.02 * nb / 240 * 6) ) * 0.9 + Math.max(0, N.noise2(i * 0.31, y * 0.9)) * 0.35;
      const inR = Math.max(0.6, r - 0.3 - bed * Math.min(1, k) - (k === rows ? 0.4 : 0));
      pos.push(PIT.x + T.dx * inR, y, PIT.z + T.dz * inR);
      const d = 1 - Math.pow(f, 0.6) * 0.92, st = 0.85 + 0.15 * Math.sin(y * 1.9 + N.noise2(i * 0.1, y * 0.2) * 2);
      col.push(0.27 * d * st, 0.24 * d * st, 0.22 * d * st);
    }
  }
  const W = rows + 1;
  for (let i = 0; i < nb; i++) {
    const j = (i + 1) % nb;
    for (let k = 0; k < rows; k++) {
      const a = i * W + k, b2 = j * W + k, c = a + 1, d = b2 + 1;
      idx.push(a, c, b2, b2, c, d);
    }
  }
  // the floor: a fan of black rubble from the bottom row to the middle
  const c0 = pos.length / 3;
  let fy = 0; for (const T of top) fy += T.yFloor; fy /= nb;
  pos.push(PIT.x, fy + 0.3, PIT.z); col.push(0.02, 0.02, 0.02);
  for (let i = 0; i < nb; i++) idx.push(i * W + rows, c0, ((i + 1) % nb) * W + rows);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m);
  mesh.name = 'paths-pit-throat'; mesh.receiveShadow = true; mesh.castShadow = false;
  ctx.scene.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------- the pit's lip and the road's end
function buildPit(ctx) {
  const { terrain, scene } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(41201);
  const meshes = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _ax = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  // the road's last slabs: the causeway's own hex cells within PIT_PAVE of the rim (structures/causeway.js leaves
  // them), tilting into the hole as the ground slumps, the last ones hanging over it from the lip
  const slabs = [];
  const road = (x, z) => terrain.causewayDistance(x, z);
  hexCellsIn(PIT.x - 26, PIT.z - 26, PIT.x + 26, PIT.z + 26, (x, z) => {
    const d = road(x, z), e = pitEdge(x, z);
    if (e >= PIT_PAVE || e < -2.2 || d > 1.75 + ctx.noise.noise2(x * 0.15, z * 0.15) * 0.3) return;
    if (rng() < 0.12) return;
    const bx = x - PIT.x, bz = z - PIT.z, bl = Math.hypot(bx, bz) || 1, inx = -bx / bl, inz = -bz / bl; // toward the hole
    let y, tilt;
    if (e >= 0) {
      y = terrain.heightAt(x, z) - 0.02 - (1 - e / PIT_PAVE) * 0.06;
      tilt = Math.pow(1 - e / PIT_PAVE, 1.6) * (0.35 + rng() * 0.3);
    } else {
      // over nothing: held by its outer edge at the lip, dipping in; the furthest have gone already
      if (e < -1.4 && rng() < 0.6) return;
      const lx = x - inx * (-e + 0.05), lz = z - inz * (-e + 0.05);
      y = terrain.heightAt(lx, lz) - 0.05 + e * 0.35;
      tilt = 0.45 + (-e) * 0.25 + rng() * 0.25;
    }
    slabs.push({ x, y, z, inx, inz, tilt, yaw: (rng() - 0.5) * 0.3, sc: 0.82 + rng() * 0.16, c: 0.32 + rng() * 0.14 });
  });
  // a few that went in: on ledges down the throat and on the floor
  for (let i = 0; i < (low ? 5 : 9); i++) {
    const b = 330 + rng() * 40, r = pitRim(b) - 1.5 - rng() * 6, a = (b * Math.PI) / 180;
    const x = PIT.x + Math.sin(a) * r, z = PIT.z - Math.cos(a) * r;
    slabs.push({ x, y: terrain.heightAt(x, z) + 0.05, z, inx: Math.cos(i), inz: Math.sin(i), tilt: 0.2 + rng() * 1.1, yaw: rng() * 6, sc: 0.85, c: 0.24 + rng() * 0.1 });
  }
  {
    const r = HEX_R * 0.9, prof = [[r, -0.16], [r, 0.02], [r - 0.035, 0.06], [0.0, 0.068]];
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 6).toNonIndexed();
    g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    const im = new THREE.InstancedMesh(g, m, slabs.length);
    const col = new THREE.Color();
    slabs.forEach((sb, i) => {
      _ax.set(-sb.inz, 0, sb.inx); // tilt about the line across the radius, so its inner edge dips
      _q.setFromAxisAngle(UP, sb.yaw);
      _q2.setFromAxisAngle(_ax, sb.tilt);
      _q.premultiply(_q2);
      _p.set(sb.x, sb.y, sb.z); _s.set(sb.sc, 1, sb.sc);
      im.setMatrixAt(i, _m.compose(_p, _q, _s));
      im.setColorAt(i, col.setRGB(sb.c * 1.05, sb.c * 0.97, sb.c * 0.9));
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true; im.name = 'paths-pit-slabs';
    im.computeBoundingSphere();
    scene.add(im); meshes.push(im);
  }
  // the lip: plates of crust and clods of earth broken along the rim, tilted in, some hanging; the fractal edge
  // at the scale the terrain's grid cannot draw
  const bits = [];
  for (let b = 0; b < 360; b += low ? 2.6 : 1.5) {
    const bb = b + (rng() - 0.5) * 1.2, a = (bb * Math.PI) / 180, R = pitRim(bb) + 0.2 + rng() * 1.4;
    const x = PIT.x + Math.sin(a) * R, z = PIT.z - Math.cos(a) * R;
    if (road(x, z) < 2.2) continue; // the slabs are there
    const e = pitEdge(x, z);
    const inx = -Math.sin(a), inz = Math.cos(a);
    const lx = x - inx * Math.max(0, -e), lz = z - inz * Math.max(0, -e);
    const s = 0.25 + Math.pow(rng(), 2) * 0.9;
    bits.push({ x, z, y: terrain.heightAt(lx, lz) - 0.08 - Math.max(0, -e) * 0.4, inx, inz, s, tilt: 0.15 + Math.max(0, -e) * 0.5 + rng() * 0.4, yaw: rng() * 6.28,
      salt: (ctx.regions?.regionAt(lx, lz).saltings || 0) > 0.3 && rng() < 0.6 });
  }
  {
    const g = stoneGeo(rng, ctx.noise, 1, { sx: 1.2, sy: 0.4, sz: 0.9, round: 0.15, seed: 7 });
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
    const im = new THREE.InstancedMesh(g, m, bits.length);
    const col = new THREE.Color();
    bits.forEach((it, i) => {
      _ax.set(-it.inz, 0, it.inx);
      _q.setFromAxisAngle(UP, it.yaw); _q2.setFromAxisAngle(_ax, it.tilt); _q.premultiply(_q2);
      _p.set(it.x, it.y, it.z); _s.set(it.s, it.s, it.s);
      im.setMatrixAt(i, _m.compose(_p, _q, _s));
      if (it.salt) col.setRGB(0.5, 0.47, 0.45).multiplyScalar(0.8 + rng() * 0.25); else col.setRGB(0.22, 0.19, 0.15).multiplyScalar(0.8 + rng() * 0.4);
      im.setColorAt(i, col);
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !low; im.receiveShadow = true; im.name = 'paths-pit-lip';
    im.computeBoundingSphere();
    scene.add(im); meshes.push(im);
  }
  // the rim's colliders (v10-T1, #15): one ring of small columns whose centres lie 0.45 m inside the edge, so the
  // walker's body stops 0.3 m outside it, close enough that the eye is over the edge and the throat fills the view.
  // The columns are 0.45 m apart and 0.3 + 0.45 thick, so a hurrying step (0.33 m) cannot pass between them.
  let colliders = 0;
  if (ctx.addCollider) {
    let lx = Infinity, lz = Infinity;
    for (let b = 0; b < 360; b += 0.25) {
      const a = (b * Math.PI) / 180, R = pitRim(b) - 0.45, x = PIT.x + Math.sin(a) * R, z = PIT.z - Math.cos(a) * R;
      if (Math.hypot(x - lx, z - lz) < 0.45) continue;
      ctx.addCollider({ x, z, r: 0.3 }); colliders++; lx = x; lz = z;
    }
  }
  return { meshes, slabs: slabs.length, bits: bits.length, colliders };
}

// ---------------------------------------------------------------- the taller fall's mist column, and its drift
const MIST_VERT = /* glsl */`
  attribute vec4 aSeed;   // x, z offset from the foot, height up the column (0..1), size
  attribute vec2 aPh;     // phase, drift (0: the column, 1: across the gap toward the pit)
  uniform float uTime, uDrop; uniform vec3 uFoot, uDrift;
  varying vec2 vUv; varying float vA; varying float vPh;
  #include <fog_pars_vertex>
  void main() {
    float life = fract(uTime * 0.03 + aPh.x);
    vec3 c;
    if (aPh.y < 0.5) {
      // up the fall: billows from the plunge, climbing and spreading as they go
      float up = aSeed.z * uDrop * 0.75 + life * 6.0;
      c = uFoot + vec3(aSeed.x * (1.0 + up / uDrop), up, aSeed.y * (1.0 + up / uDrop));
      c.xz += vec2(sin(uTime * 0.07 + aPh.x * 9.0), cos(uTime * 0.05 + aPh.x * 7.0)) * 1.5;
    } else {
      // across the gap: a slow drift off the column toward the pit, low over the ground
      c = uFoot + uDrift * life + vec3(aSeed.x, 6.0 + aSeed.z * 10.0 + life * 4.0, aSeed.y);
    }
    float size = aSeed.w * (0.8 + life * 0.7);
    vec3 transformed = c;
    vec4 mvPosition = modelViewMatrix * vec4(c, 1.0);
    mvPosition.xy += position.xy * size;
    vUv = position.xy + 0.5; vA = sin(life * 3.14159) * (aPh.y < 0.5 ? 1.0 : 0.55); vPh = aPh.x;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const MIST_FRAG = /* glsl */`
  uniform float uTime, uFlicker, uStrength; uniform vec3 uMist;
  varying vec2 vUv; varying float vA; varying float vPh;
  #include <fog_pars_fragment>
  ${NOISE_GLSL}
  void main() {
    vec2 p = vUv - 0.5; float r = length(p) * 2.0;
    float n = lFbm(vUv * 3.0 + vec2(vPh * 13.0, -uTime * 0.05));
    float a = (1.0 - smoothstep(0.1, 1.0, r)) * smoothstep(0.3, 0.75, n) * vA * uStrength;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uMist * (0.55 + 0.45 * uFlicker), a);
    #include <fog_fragment>
  }`;
function buildFallMist(ctx) {
  const RV = ctx.terrain.river, foot = RV.impact;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(41301);
  const nCol = low ? 16 : 30, nDrift = low ? 6 : 12, n = nCol + nDrift;
  const quad = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.setAttribute('position', quad.attributes.position);
  const seed = new Float32Array(n * 4), ph = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const drift = i >= nCol, a = rng() * Math.PI * 2, r = drift ? rng() * 10 : Math.sqrt(rng()) * 8; // 2.5 times the old 3.2 m
    seed[i * 4] = Math.cos(a) * r; seed[i * 4 + 1] = Math.sin(a) * r; seed[i * 4 + 2] = drift ? rng() : Math.pow(rng(), 1.4);
    seed[i * 4 + 3] = drift ? 14 + rng() * 10 : 7 + rng() * 9;
    ph[i * 2] = i / n + rng() * 0.05; ph[i * 2 + 1] = drift ? 1 : 0;
  }
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  g.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 2));
  g.instanceCount = n;
  const toPit = new THREE.Vector3(PIT.x - foot.x, 0, PIT.z - foot.z);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3((foot.x + PIT.x) / 2, 20, (foot.z + PIT.z) / 2), 70);
  const flick = ctx.sky?.flicker || { value: 1 };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uFlicker: { value: 1 }, uStrength: { value: 0.26 }, uMist: { value: new THREE.Color('#9a8e92') },
      uFoot: { value: new THREE.Vector3(foot.x, foot.y, foot.z) }, uDrop: { value: FALL.lipY - FALL.poolY }, uDrift: { value: toPit },
    }]),
    vertexShader: MIST_VERT, fragmentShader: MIST_FRAG, fog: true, transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'paths-fall-mist'; mesh.renderOrder = 13;
  ctx.scene.add(mesh);
  ctx.registerUpdate((dt, t) => { mat.uniforms.uTime.value = t; mat.uniforms.uFlicker.value = flick.value; },
    { pos: { x: (foot.x + PIT.x) / 2, z: (foot.z + PIT.z) / 2 }, near: 260, hz: 4 });
  return { meshes: [mesh], puffs: n };
}

export async function build(ctx) {
  const t0 = performance.now();
  await ctx.progress?.('wearing the paths', 0.1);
  const t1 = performance.now();
  const L = buildLeads(ctx);
  const t2 = performance.now();
  await ctx.progress?.('opening the pit', 0.6);
  const t3 = performance.now();
  const P = buildPit(ctx);
  P.meshes.push(buildThroat(ctx));
  const K = buildKerb(ctx);
  L.meshes.push(...K.meshes);
  const E = buildWaysEdge(ctx); // v8-01
  L.meshes.push(...E.meshes);
  const M = buildFallMist(ctx);
  const t4 = performance.now();
  const ms = { leads: Math.round(t2 - t1), pit: Math.round(t4 - t3) };
  const all = [...L.meshes, ...P.meshes, ...M.meshes];
  const B = leads();
  const tris = (ms) => ms.reduce((a, m) => a + (m.isInstancedMesh ? (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * m.count : m.geometry.index ? m.geometry.index.count / 3 : 0), 0);
  const api = {
    leads: B.list.map((l) => ({ id: l.id, kind: l.kind, cls: l.cls || null, w: l.w, slabs: !!l.slabs, brief: l.brief, length: l.length, ends: l.ends, ended: l.ended || null, skipped: l.skipped || null,
      materials: [...new Set(l.lines.flat().map((s) => s.mat))], lines: l.lines.map((S) => S.map((s) => [s.x, s.z, s.y, s.wy, s.open])) })),
    pit: { x: PIT.x, z: PIT.z, r: PIT.r, depth: PIT.depth, rim: pitRim, edge: pitEdge, slabs: P.slabs, colliders: P.colliders },
    fall: { lipY: ctx.terrain.river.lip.y, poolY: ctx.terrain.river.pool.y, lip: { ...ctx.terrain.river.lip } },
    materials: MATERIALS,
    leadAt(x, z) { const h = nearestLead(x, z, 0.3); return h ? { id: h.id, kind: h.kind, material: h.material, name: h.name, d: h.d, open: h.open } : null; },
    wornAt,
    stats() {
      return { leads: { calls: L.meshes.length, tris: Math.round(tris(L.meshes)), samples: L.samples }, pit: { calls: P.meshes.length, tris: Math.round(tris(P.meshes)), slabs: P.slabs, bits: P.bits, colliders: P.colliders },
        mist: { calls: 1, puffs: M.puffs }, calls: all.length, tris: Math.round(tris(all)), routeMs: Math.round(B.ms), buildMs: ms };
    },
  };
  ctx.paths = api;
  ctx.log(`paths: ${B.list.length} leads (${Math.round(B.list.reduce((a, l) => a + l.length, 0))} m) in ${L.meshes.length} tiles, the pit (${P.slabs} slabs, ${P.colliders} colliders), the fall's mist; routes ${B.ms.toFixed(0)} ms, build ${(performance.now() - t0).toFixed(0)} ms`);
}
