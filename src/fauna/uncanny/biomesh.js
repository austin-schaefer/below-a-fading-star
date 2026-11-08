// Biomesh: F9AC's work. Colonies of small chip-like tiles, dark and pinned like old integrated circuits,
// traced with glacial-blue light, clambering slowly over whatever they lie on. Hundreds carpet the ground
// about the Lattice; outliers have crept far down the causeway, up a boulder beside it, and up the
// columns of the Sunken Court. Each tile creeps along a slow flow field at a few cm/s, now and then
// hops; within 6 m of you they stop, and their traces brighten, as if attending. One InstancedMesh a colony.
// The colonies spread while you watch: every few seconds one sends out a runner, a thin lit trace that
// grows outward from its edge over two to four seconds, and a new tile settles at its end. Each colony has
// a ceiling; at the ceiling the oldest tiles in its interior go dark and are taken up again at the edge,
// so it never runs away. All the runners share one InstancedMesh of thin additive segments.
import * as THREE from 'three';
import { clamp, smoothstep } from '../geo.js';
import { makeGround, approach } from './kit.js';
import { hyp } from '../../noise.js';

const TAU = Math.PI * 2;

function tileMaterial(ctx, center) {
  const P = ctx.palette;
  const m = new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.3, metalness: 0.7 });
  const u = {
    uTime: { value: 0 }, uGlow: { value: 1 }, uCenter: { value: new THREE.Vector2(center.x, center.z) },
    uDeep: { value: new THREE.Color(P.crystalDeep) }, uHot: { value: new THREE.Color(P.crystal) },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aSeed; attribute float aAware; attribute float aFresh;
        varying vec3 vLoc; varying vec3 vN0; varying float vSeed; varying float vAware; varying vec3 vWP; varying float vFresh;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLoc = position; vN0 = normal; vSeed = aSeed; vAware = aAware; vFresh = aFresh;
        vWP = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uGlow; uniform vec2 uCenter; uniform vec3 uDeep; uniform vec3 uHot;
        varying vec3 vLoc; varying vec3 vN0; varying float vSeed; varying float vAware; varying vec3 vWP; varying float vFresh;
        float th(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fpTrace = 0.0; float fpMetal = 0.7; float fpRough = 0.3;
        {
          if (vN0.y > 0.5) {
            // top: a dark die in the middle, Manhattan traces and pads round it
            vec2 q = vLoc.xz + 0.5;
            vec2 g = q * vec2(7.0, 5.0) + vSeed * 13.0;
            vec2 c = floor(g), f = fract(g);
            float h1 = th(c), h2 = th(c + 7.3), h3 = th(c * 1.7 + 2.1);
            float lw = 0.09;
            float tr = 0.0;
            if (h1 > 0.42) tr = max(tr, smoothstep(lw, lw * 0.4, abs(f.y - 0.5)));
            if (h2 > 0.55) tr = max(tr, smoothstep(lw, lw * 0.4, abs(f.x - 0.5)));
            if (h3 > 0.8) tr = max(tr, smoothstep(0.24, 0.16, length(f - 0.5)));
            vec2 dd = abs(q - 0.5);
            float die = step(dd.x, 0.17) * step(dd.y, 0.2);
            float edge = smoothstep(0.47, 0.5, max(dd.x, dd.y));
            tr *= 1.0 - die;
            float camD = length(vWP - cameraPosition);
            tr = mix(tr, 0.22, smoothstep(5.0, 22.0, camD));
            fpTrace = max(tr, edge * 0.22);
            diffuseColor.rgb *= mix(1.0, 0.45, die);
            fpRough = mix(0.32, 0.12, die);
            fpTrace += max(vFresh, 0.0) * 0.35 * (1.0 - die);
          } else if (abs(vN0.z) > 0.5) {
            // long sides: a comb of tarnished gilt pins
            float pin = step(0.5, fract(vLoc.x * 11.0 + 0.25)) * step(-0.2, vLoc.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.36, 0.16), pin);
            fpMetal = mix(0.7, 0.95, pin); fpRough = mix(0.3, 0.45, pin);
          }
        }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = fpRough;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = fpMetal;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float pulse = 0.5 + 0.5 * sin(uTime * 1.1 - length(vWP.xz - uCenter) * 0.45 + vSeed * 0.8);
          vec3 ec = mix(uDeep, uHot, pulse * 0.7 + vAware * 0.3);
          float fresh = max(vFresh, 0.0), dim = max(-vFresh, 0.0);
          ec = mix(ec, uHot, fresh * 0.6);
          totalEmissiveRadiance += ec * fpTrace * uGlow * (0.35 + 1.1 * pulse * pulse + vAware * 1.8 + fresh * 2.4) * (1.0 - dim);
        }`)
      .replace('#include <lights_fragment_begin>', 'diffuseColor.rgb *= 1.0 - 0.55 * max(-vFresh, 0.0);\n#include <lights_fragment_begin>');
  };
  return m;
}

export function buildBiomesh(ctx, U) {
  const { scene, camera, terrain, landmarks: L, causeway, noise, sky } = ctx;
  const rng = ctx.makeRng(9303);
  const ground = makeGround(ctx);
  const low = ctx.quality === 'low';
  // 2.5x the chips of the first pass on high; low keeps roughly the first pass's high count
  const q = low ? 1 : 2.5;
  // each colony starts at this share of its ceiling and grows the rest by runners
  const FILL = 0.82;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const okG = (x, z) => U.rules.dry(x, z, 0.1) && terrain.slopeAt(x, z) < 0.85;
  const colonies = [];
  const nrm = new THREE.Vector3();
  const cam = camera.position;

  function colony(name, n, center, radius) {
    const mat = tileMaterial(ctx, center);
    const g = geo.clone();
    const seed = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    const aware = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    const fresh = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    aware.setUsage(THREE.DynamicDrawUsage); fresh.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aSeed', seed); g.setAttribute('aAware', aware); g.setAttribute('aFresh', fresh);
    const mesh = new THREE.InstancedMesh(g, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.name = 'uncanny-biomesh-' + name; mesh.receiveShadow = true; mesh.count = 0;
    scene.add(mesh);
    const C = {
      name, mesh, mat, n, limit: Math.round(n * FILL), center, radius, count: 0, seed, aware, fresh, cols: [], hf: null,
      u: new Float32Array(n), v: new Float32Array(n), au: new Float32Array(n), av: new Float32Array(n),
      yaw: new Float32Array(n), spd: new Float32Array(n), hopT: new Float32Array(n), hopP: new Float32Array(n),
      sx: new Float32Array(n), sz: new Float32Array(n), th: new Float32Array(n), mode: new Uint8Array(n), col: new Uint8Array(n),
      wx: new Float32Array(n), wy: new Float32Array(n), wz: new Float32Array(n), aw: new Float32Array(n), vmax: new Float32Array(n),
      // growth: birth time, grow-in (0..1), fresh glow (>0) or dimming (<0), held by a runner
      birth: new Float32Array(n), grow: new Float32Array(n).fill(1), fr: new Float32Array(n), busy: new Uint8Array(n),
      kind: 'ground', growR: radius, next: 1 + rng() * 2, every: [2.5, 5], phase: 0, grown: 0, recycled: 0,
    };
    colonies.push(C);
    return C;
  }
  function sizeTile(C, i) {
    const big = rng() < 0.04;
    const len = big ? 0.42 + rng() * 0.2 : 0.1 + Math.pow(rng(), 1.6) * 0.22;
    C.sx[i] = len; C.sz[i] = len * (0.45 + rng() * 0.4); C.th[i] = 0.018 + len * 0.08;
  }
  function addTile(C, u, v, mode = 0, col = 0, vmax = 1e9) {
    if (C.count >= C.limit) return false;
    const i = C.count++;
    C.u[i] = C.au[i] = u; C.v[i] = C.av[i] = v; C.mode[i] = mode; C.col[i] = col; C.vmax[i] = vmax;
    C.yaw[i] = rng() * TAU; C.spd[i] = 0.02 + rng() * 0.045; C.hopT[i] = 2 + rng() * 30; C.hopP[i] = -1;
    sizeTile(C, i);
    C.seed.array[i] = rng() * 100;
    C.birth[i] = -rng() * 600; // the first tiles have been here a while, in no particular order
    return true;
  }

  // ---- surfaces: ground, a raycast heightfield (boulder), or a column's cylinder
  const P = [0, 0, 0], N = [0, 1, 0], T0 = [1, 0, 0];
  function hfAt(hf, x, z) {
    const gx = clamp((x - hf.x0) / hf.step, 0, hf.n - 1.001), gz = clamp((z - hf.z0) / hf.step, 0, hf.n - 1.001);
    const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, n = hf.n, h = hf.h;
    const a = h[iz * n + ix], b = h[iz * n + ix + 1], c = h[(iz + 1) * n + ix], d = h[(iz + 1) * n + ix + 1];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  }
  // surface point P, normal N and a tangent T0 at surface coords (u, v): ground x, z; or a column's arc, height
  function mapUV(C, mode, col, u, v) {
    if (mode === 1) {
      const c = C.cols[col], R = c.r, th = u / R;
      const cs = Math.cos(th), sn = Math.sin(th);
      P[0] = c.x + R * cs; P[1] = c.base + v; P[2] = c.z + R * sn;
      N[0] = cs; N[1] = 0; N[2] = sn; T0[0] = -sn; T0[1] = 0; T0[2] = cs;
      return;
    }
    const x = u, z = v;
    if (C.hf) {
      const e = 0.12, h = hfAt(C.hf, x, z);
      P[1] = h;
      const nx = hfAt(C.hf, x - e, z) - hfAt(C.hf, x + e, z), nz = hfAt(C.hf, x, z - e) - hfAt(C.hf, x, z + e);
      const l = Math.hypot(nx, 2 * e, nz); N[0] = nx / l; N[1] = (2 * e) / l; N[2] = nz / l;
    } else {
      P[1] = ground.at(x, z) + (C.lift || 0);
      ground.normal(x, z, nrm); N[0] = nrm.x; N[1] = nrm.y; N[2] = nrm.z;
    }
    P[0] = x; P[2] = z;
    const d = N[0]; let tx = 1 - N[0] * d, ty = -N[1] * d, tz = -N[2] * d; const tl = Math.hypot(tx, ty, tz) || 1;
    T0[0] = tx / tl; T0[1] = ty / tl; T0[2] = tz / tl;
  }
  const map = (C, i) => mapUV(C, C.mode[i], C.col[i], C.u[i], C.v[i]);
  function write(C, i, lift) {
    map(C, i);
    const yaw = C.yaw[i], cy = Math.cos(yaw), sy = Math.sin(yaw);
    // B0 = N x T0
    const bx = N[1] * T0[2] - N[2] * T0[1], by = N[2] * T0[0] - N[0] * T0[2], bz = N[0] * T0[1] - N[1] * T0[0];
    const dx = cy * T0[0] + sy * bx, dy = cy * T0[1] + sy * by, dz = cy * T0[2] + sy * bz;
    // Z = d x N
    const zx = dy * N[2] - dz * N[1], zy = dz * N[0] - dx * N[2], zz = dx * N[1] - dy * N[0];
    const gr = C.grow[i], gs = gr >= 1 ? 1 : smoothstep(0, 1, gr);
    const sx = C.sx[i] * gs, sz = C.sz[i] * gs, th = C.th[i] * gs + 1e-4;
    const off = th * 0.5 + 0.004 + (i % 5) * 0.0025 + lift;
    const e = C.mesh.instanceMatrix.array, o = i * 16;
    e[o] = dx * sx; e[o + 1] = dy * sx; e[o + 2] = dz * sx; e[o + 3] = 0;
    e[o + 4] = N[0] * th; e[o + 5] = N[1] * th; e[o + 6] = N[2] * th; e[o + 7] = 0;
    e[o + 8] = zx * sz; e[o + 9] = zy * sz; e[o + 10] = zz * sz; e[o + 11] = 0;
    const px = P[0] + N[0] * off, py = P[1] + N[1] * off, pz = P[2] + N[2] * off;
    e[o + 12] = px; e[o + 13] = py; e[o + 14] = pz; e[o + 15] = 1;
    C.wx[i] = px; C.wy[i] = py; C.wz[i] = pz;
  }
  function finish(C) {
    C.mesh.count = C.count;
    for (let i = 0; i < C.count; i++) write(C, i, 0);
    C.mesh.instanceMatrix.needsUpdate = true; C.seed.needsUpdate = true;
    C.mesh.computeBoundingSphere();
    if (C.mesh.boundingSphere) C.mesh.boundingSphere.radius += 6; // room to grow
    C.limit = C.n; // from here on, runners may grow it to its ceiling
    C.ready = true;
  }
  // a clump of tiles packed round (x, z)
  function patch(C, x, z, r, n) {
    for (let k = 0; k < n * 3 && n > 0; k++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (!okG(px, pz)) continue;
      if (addTile(C, px, pz)) n--; else return;
    }
  }
  const nearCam = (x, y, z, r) => (x - cam.x) ** 2 + (y - cam.y) ** 2 + (z - cam.z) ** 2 < r * r;

  // ---- 1. the Lattice carpet: clumps all about the seed, and trails running out from it like ants
  const M = L.moraine;
  {
    const C = colony('lattice', Math.round(960 * q), M, 70);
    const trailN = Math.round(C.limit * 0.3);
    for (let s = 0; s < 7; s++) {
      let a = Math.PI / 2 + (rng() - 0.5) * 2.6, x = M.x + Math.cos(a) * 8, z = M.z + Math.sin(a) * 8;
      const per = Math.floor(trailN / 7);
      for (let k = 0; k < per; k++) {
        a += (noise.noise2(s * 3.1, k * 0.05) * 0.5) * 0.25;
        x += Math.cos(a) * 0.34; z += Math.sin(a) * 0.34;
        const j = (rng() - 0.5) * 0.5;
        if (okG(x - Math.sin(a) * j, z + Math.cos(a) * j)) addTile(C, x - Math.sin(a) * j, z + Math.cos(a) * j);
      }
    }
    let guard = 0;
    while (C.count < C.limit && guard++ < 1000) {
      const a = rng() * TAU, d = 2 + Math.pow(rng(), 1.5) * 38;
      const x = M.x + Math.cos(a) * d, z = M.z + Math.sin(a) * d * 0.85 + 5;
      const r = 0.7 + rng() * 1.6 * (1 - d / 50);
      patch(C, x, z, r, Math.round(r * r * (16 + rng() * 10)));
    }
    // runners: out from the carpet's edges, never past 46 m from the seed; this colony is big, so often
    C.kind = 'ground'; C.growR = 46; C.every = [1.1, 2.6];
    finish(C);
  }

  // ---- 2. outliers on the causeway, far from home: a thin column of them marching along the paving
  {
    const a = causeway[3], b = causeway[4];
    const len = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
    const C = colony('causeway', Math.round(200 * q), { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, 30);
    C.lift = 0.05;
    for (let k = 0; C.count < C.limit && k < C.limit * 3; k++) {
      const s = 14 + (k / (C.limit * 3)) * 30 + (rng() - 0.5) * 0.6;
      const off = Math.sin(s * 0.19) * 0.9 + (rng() - 0.5) * (0.4 + 0.5 * (0.5 + 0.5 * Math.sin(s * 0.7)));
      const x = a.x + ux * s - uz * off, z = a.z + uz * s + ux * off;
      if (okG(x, z)) addTile(C, x, z);
    }
    // runners run along the road, ahead of the column or behind it, keeping to the paving
    C.kind = 'road'; C.road = { ax: a.x, az: a.z, ux, uz, s0: 6, s1: Math.min(len - 2, 58), mid: 29, w: 1.7 };
    C.every = [2.4, 4.5];
    finish(C);
  }

  // ---- 3. a boulder beside the causeway, climbed; 4. two columns of the Sunken Court, climbed.
  // Both need the rocks and structures modules' meshes, which may finish building after us: set up later.
  const boulderC = colony('boulder', Math.round(120 * q), { x: -112, z: -12 }, 8);
  const courtC = colony('court', Math.round(220 * q), { x: L.court.x, z: L.court.z }, 30);
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3(), hits = [];
  const colliders = ctx.controls?.state?.colliders || [];
  function castDown(objs, x, z, top) {
    from.set(x, top, z); ray.set(from, down); ray.far = top + 50; hits.length = 0;
    ray.intersectObjects(objs, false, hits);
    return hits.length ? hits[0].point.y : null;
  }
  function setupBoulder() {
    const rocks = []; scene.traverse((o) => { if (/^rocks-boulder/.test(o.name)) rocks.push(o); });
    const C = boulderC;
    let pick = null, best = 1e9;
    if (rocks.length) {
      for (const c of colliders) {
        if (c.r < 1.0 || c.r > 2.4 || c.h !== undefined) continue;
        const cd = terrain.causewayDistance(c.x, c.z);
        if (cd < 5 || cd > 16 || U.rules.inKeep(c.x, c.z, 60)) continue;
        const d = Math.hypot(c.x - C.center.x, c.z - C.center.z);
        if (d < best && castDown(rocks, c.x, c.z, ground.at(c.x, c.z) + 12) !== null) { best = d; pick = c; }
      }
    }
    if (pick) {
      const R = pick.r / 0.75 * 1.25 + 1.2, n = 22, step = (2 * R) / (n - 1);
      const hf = { x0: pick.x - R, z0: pick.z - R, step, n, h: new Float32Array(n * n), on: new Uint8Array(n * n) };
      const top = ground.at(pick.x, pick.z) + 12;
      for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
        const x = hf.x0 + ix * step, z = hf.z0 + iz * step, g = ground.at(x, z);
        const y = castDown(rocks, x, z, top);
        hf.h[iz * n + ix] = y !== null && y > g ? y : g;
        hf.on[iz * n + ix] = y !== null && y > g + 0.05 ? 1 : 0;
      }
      C.hf = hf; C.center = { x: pick.x, z: pick.z }; C.mat.userData.u.uCenter.value.set(pick.x, pick.z);
      // most of the colony on the stone itself, flowing down one flank onto the turf
      const fl = rng() * TAU;
      for (let k = 0; C.count < C.limit && k < 8000; k++) {
        const x = hf.x0 + rng() * 2 * R, z = hf.z0 + rng() * 2 * R;
        const ix = Math.round((x - hf.x0) / step), iz = Math.round((z - hf.z0) / step);
        const on = hf.on[iz * n + ix];
        const side = Math.cos(Math.atan2(z - pick.z, x - pick.x) - fl);
        if (on ? rng() < 0.25 + 0.5 * (side > -0.2) : (side > 0.6 && rng() < 0.3 && Math.hypot(x - pick.x, z - pick.z) < R * 0.9)) addTile(C, x, z);
      }
      C.kind = 'hf'; C.growR = R * 0.95;
      U.biomesh.boulder = { x: pick.x, z: pick.z, r: pick.r };
    } else {
      // no rocks module: a clump in the turf beside the road
      patch(C, C.center.x, C.center.z, 2.4, C.limit);
      C.kind = 'ground'; C.growR = 4;
    }
    C.every = [3, 6];
    finish(C);
  }
  function setupCourt() {
    const C = courtC, K = L.court;
    let cols = colliders.filter((c) => c.h === undefined && Math.abs(c.r - 1.25) < 0.06 && Math.hypot(c.x - K.x, c.z - K.z) < 28);
    const meshes = []; scene.traverse((o) => { if (/^structures-court/.test(o.name) && !/pit/.test(o.name)) meshes.push(o); });
    let found = [];
    for (const c of cols) {
      const top = meshes.length ? castDown(meshes, c.x, c.z, 40) : null;
      if (top !== null && top - ground.at(c.x, c.z) > 6) found.push({ x: c.x, z: c.z, top });
    }
    // two standing columns at the end you come in by from the causeway (largest z), one from each colonnade
    found.sort((a, b) => b.z - a.z);
    let picks = found.length ? [found[0]] : [];
    const other = found.find((f) => Math.abs(f.x - found[0].x) > 5);
    if (other) picks.push(other);
    if (picks.length < 2) picks = [{ x: K.x - 11, z: K.z - 18 + 4 * 36 / 7, top: null }, { x: K.x + 11, z: K.z - 18 + 2 * 36 / 7, top: null }];
    for (const p of picks) {
      const g = ground.at(p.x, p.z);
      C.cols.push({ x: p.x, z: p.z, r: 1.08, base: g + 1.1, top: p.top ?? g + 11.6 });
    }
    // up each column: a streak climbing one flank, densest low down, ragged at its upper edge
    const perCol = Math.floor(C.limit / C.cols.length);
    C.cols.forEach((c, ci) => {
      const face = Math.PI / 2 + (ci ? 0.5 : -0.5) + (rng() - 0.5) * 0.5; // toward the causeway side, where you come from
      const hTop = Math.min(c.top - c.base - 0.3, 2.8 + rng() * 2.5);
      c.face = face; c.hTop = hTop; c.hMax = Math.min(c.top - c.base - 0.3, hTop + 3.5);
      let n = Math.round(perCol * 0.8);
      for (let k = 0; n > 0 && k < 8000; k++) {
        const th = face + (rng() - 0.5) * 1.5, h = Math.pow(rng(), 1.4) * hTop;
        const edge = hTop * (0.55 + 0.45 * (0.5 + 0.5 * noise.noise2(th * 2.3 + ci * 7, 0.5)));
        if (h > edge) continue;
        if (addTile(C, th * c.r, h, 1, ci, hTop)) { n--; const j = C.count - 1; C.sx[j] *= 1.3; C.sz[j] *= 1.3; }
      }
      // and a pool of them on the floor at its foot, spilling out from under the plinth
      for (let k = 0; C.count < perCol * (ci + 1) && k < 1600; k++) {
        const a = face + (rng() - 0.5) * 1.5, d = 2.1 + Math.pow(rng(), 1.4) * 2.6;
        const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (okG(x, z) && Math.max(Math.abs(x - c.x), Math.abs(z - c.z)) > 1.55) addTile(C, x, z, 0, ci);
      }
    });
    C.kind = 'court'; C.every = [2.2, 4.2];
    finish(C);
    U.biomesh.columns = C.cols;
  }
  let deferred = 0, setupDone = false;

  // ---- growth by runners -------------------------------------------------------------------------
  // Where a runner may go, per colony kind, in its surface coords (ground x, z; or column arc, height).
  function inside(C, mode, col, u, v) {
    if (mode === 1) { const c = C.cols[col]; return v > 0.05 && v < c.hMax; }
    switch (C.kind) {
      case 'road': {
        const R = C.road, dx = u - R.ax, dz = v - R.az, s = dx * R.ux + dz * R.uz, off = -dx * R.uz + dz * R.ux;
        return s > R.s0 && s < R.s1 && Math.abs(off) < R.w && okG(u, v);
      }
      case 'hf': return Math.hypot(u - C.center.x, v - C.center.z) < C.growR;
      case 'court': {
        const c = C.cols[col], ex = Math.max(Math.abs(u - c.x), Math.abs(v - c.z));
        return ex > 1.6 && Math.hypot(u - c.x, v - c.z) < 6.8 && okG(u, v);
      }
      default: return Math.hypot(u - C.center.x, v - C.center.z) < C.growR && okG(u, v);
    }
  }
  // how far out toward the colony's edge a tile is (0 heart .. 1 rim)
  function edgeness(C, i) {
    if (C.mode[i] === 1) { const c = C.cols[C.col[i]]; return C.v[i] / c.hMax; }
    switch (C.kind) {
      case 'road': { const R = C.road, s = (C.u[i] - R.ax) * R.ux + (C.v[i] - R.az) * R.uz; return Math.abs(s - R.mid) / 20; }
      case 'court': { const c = C.cols[C.col[i]]; return Math.hypot(C.u[i] - c.x, C.v[i] - c.z) / 6; }
      default: return Math.hypot(C.u[i] - C.center.x, C.v[i] - C.center.z) / C.growR;
    }
  }
  // outward heading (radians in the u, v plane) from tile i
  function outward(C, i) {
    const u = C.u[i], v = C.v[i];
    if (C.mode[i] === 1) return Math.PI / 2 + (rng() - 0.5) * 1.1; // up the column
    switch (C.kind) {
      case 'road': {
        const R = C.road, s = (u - R.ax) * R.ux + (v - R.az) * R.uz, sg = s > R.mid ? 1 : -1;
        return Math.atan2(R.uz * sg, R.ux * sg) + (rng() - 0.5) * 0.7;
      }
      case 'court': { const c = C.cols[C.col[i]]; return Math.atan2(v - c.z, u - c.x) + (rng() - 0.5) * 1.2; }
      default: {
        const a = Math.atan2(v - C.center.z, u - C.center.x), d = Math.hypot(u - C.center.x, v - C.center.z);
        // near the ceiling's rim the runner goes round the edge instead of out past it
        const tang = smoothstep(C.growR * 0.75, C.growR * 0.98, d) * (rng() < 0.5 ? -1 : 1) * 1.45;
        return a + tang + (rng() - 0.5) * 1.3;
      }
    }
  }

  const SEG = 10, MAXR = low ? 14 : 24;
  const runners = Array.from({ length: MAXR }, () => ({
    on: false, C: null, mode: 0, col: 0, n: 0, t: 0, dur: 3, fade: 0, target: -1,
    uv: new Float32Array((SEG + 1) * 2), wp: new Float32Array((SEG + 1) * 3), wn: new Float32Array((SEG + 1) * 3),
  }));
  const rGeo = new THREE.PlaneGeometry(1, 1); rGeo.rotateX(-Math.PI / 2); rGeo.translate(0.5, 0, 0);
  const rMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const rMesh = new THREE.InstancedMesh(rGeo, rMat, MAXR * SEG);
  rMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rMesh.setColorAt(0, new THREE.Color(0, 0, 0)); rMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  rMesh.frustumCulled = false; rMesh.count = 0; rMesh.renderOrder = 5; rMesh.name = 'uncanny-biomesh-runners';
  scene.add(rMesh);
  const hot = new THREE.Color(ctx.palette.crystal), deep = new THREE.Color(ctx.palette.crystalDeep), white = new THREE.Color(1, 1, 1);
  const camFwd = new THREE.Vector3();
  let clock = 0;

  // pick the tile a runner leaves from: out at the edge, and if possible in front of you, not at your feet
  function pickSource(C) {
    let best = -1, bs = -1e9;
    for (let k = 0; k < 64; k++) {
      const i = (rng() * C.count) | 0;
      if (C.busy[i] || C.grow[i] < 1 || C.fr[i] < 0) continue;
      const dx = C.wx[i] - cam.x, dy = C.wy[i] - cam.y, dz = C.wz[i] - cam.z, d = Math.hypot(dx, dy, dz) || 1;
      if (d < 6.5) continue;
      const inView = (dx * camFwd.x + dy * camFwd.y + dz * camFwd.z) / d > 0.82 && d < 26;
      const sc = edgeness(C, i) * 1.2 + (inView ? 3 : 0) - (d > 45 ? 0.8 : 0) + rng() * 0.6;
      if (sc > bs) { bs = sc; best = i; }
    }
    return best;
  }
  // the tile that will settle at the runner's end: a free slot under the ceiling, else the oldest of a
  // sample of interior tiles, which starts going dark now
  function pickTarget(C) {
    if (C.count < C.n) {
      const i = C.count++;
      C.mesh.count = C.count;
      C.grow[i] = 0; C.fr[i] = 0; C.aw[i] = 0; C.hopP[i] = -1; C.hopT[i] = 5 + rng() * 30;
      C.spd[i] = 0.02 + rng() * 0.045; C.seed.array[i] = rng() * 100; C.seed.needsUpdate = true;
      C.u[i] = C.au[i] = C.u[0]; C.v[i] = C.av[i] = C.v[0]; C.mode[i] = C.mode[0]; C.col[i] = C.col[0];
      C.grown++;
      return i;
    }
    let best = -1, bs = -1e9;
    for (let k = 0; k < 32; k++) {
      const i = (rng() * C.count) | 0;
      if (C.busy[i] || C.fr[i] !== 0 || C.grow[i] < 1) continue;
      const e = edgeness(C, i);
      const sc = (clock - C.birth[i]) * (e < 0.6 ? 1 : 0.25) + rng();
      if (sc > bs) { bs = sc; best = i; }
    }
    if (best >= 0) { C.fr[best] = -0.001; C.recycled++; }
    return best;
  }
  function startRunner(C) {
    const R = runners.find((r) => !r.on);
    if (!R) return false;
    const i = pickSource(C);
    if (i < 0) return false;
    const mode = C.mode[i], col = C.col[i];
    let u = C.u[i], v = C.v[i], a = outward(C, i);
    const len = (mode === 1 ? 0.9 : 2.2) + rng() * (mode === 1 ? 1.6 : 2.8), step = len / SEG;
    R.uv[0] = u; R.uv[1] = v; let n = 1;
    for (let k = 1; k <= SEG; k++) {
      a += (rng() - 0.5) * 0.55;
      let nu = u + Math.cos(a) * step, nv = v + Math.sin(a) * step, okk = inside(C, mode, col, nu, nv);
      for (const turn of [0.9, -0.9, 1.8, -1.8]) {
        if (okk) break;
        const b = a + turn; nu = u + Math.cos(b) * step; nv = v + Math.sin(b) * step;
        if ((okk = inside(C, mode, col, nu, nv))) a = b;
      }
      if (!okk) break;
      mapUV(C, mode, col, nu, nv);
      if (nearCam(P[0], P[1], P[2], 6)) break;
      u = nu; v = nv; R.uv[n * 2] = u; R.uv[n * 2 + 1] = v; n++;
    }
    if (n < 4) return false;
    const tgt = pickTarget(C);
    if (tgt < 0) return false;
    C.busy[tgt] = 1;
    for (let k = 0; k < n; k++) {
      mapUV(C, mode, col, R.uv[k * 2], R.uv[k * 2 + 1]);
      R.wp[k * 3] = P[0] + N[0] * 0.012; R.wp[k * 3 + 1] = P[1] + N[1] * 0.012; R.wp[k * 3 + 2] = P[2] + N[2] * 0.012;
      R.wn[k * 3] = N[0]; R.wn[k * 3 + 1] = N[1]; R.wn[k * 3 + 2] = N[2];
    }
    Object.assign(R, { on: true, C, mode, col, n, t: 0, dur: 2 + rng() * 2, fade: 1, target: tgt });
    return true;
  }
  function settle(R) {
    const C = R.C, i = R.target, k = R.n - 1;
    C.u[i] = C.au[i] = R.uv[k * 2]; C.v[i] = C.av[i] = R.uv[k * 2 + 1];
    C.mode[i] = R.mode; C.col[i] = R.col;
    C.vmax[i] = R.mode === 1 ? C.cols[R.col].hMax : 1e9;
    C.yaw[i] = rng() * TAU; sizeTile(C, i);
    if (R.mode === 1) { C.sx[i] *= 1.3; C.sz[i] *= 1.3; }
    C.grow[i] = 0.001; C.fr[i] = 1; C.busy[i] = 0; C.birth[i] = clock; C.aw[i] = 0;
    write(C, i, 0);
    ctx.audio?.cue?.('biomesh-settle', { x: C.wx[i], y: C.wy[i], z: C.wz[i] }, { quiet: true });
  }
  const m4 = new THREE.Matrix4(), rc = new THREE.Color();
  function drawRunners(dt, glow) {
    let k = 0;
    const e = rMesh.instanceMatrix.array;
    for (const R of runners) {
      if (!R.on) continue;
      R.t += dt;
      const g = clamp(R.t / R.dur, 0, 1) * (R.n - 1);
      if (R.t >= R.dur && R.fade === 1 && R.target >= 0) { settle(R); R.target = -1; }
      if (R.t > R.dur) R.fade = Math.max(0, 1 - (R.t - R.dur) / 2.6);
      if (R.fade <= 0) { R.on = false; continue; }
      const dc = Math.hypot(R.wp[0] - cam.x, R.wp[2] - cam.z);
      const distFade = 1 - smoothstep(45, 110, dc);
      if (distFade <= 0) continue;
      const full = Math.floor(g);
      for (let s = 0; s <= full && s < R.n - 1; s++) {
        const f = s < full ? 1 : g - full;
        if (f <= 0.001) continue;
        const a = s * 3, b = a + 3;
        const dx = (R.wp[b] - R.wp[a]) * f, dy = (R.wp[b + 1] - R.wp[a + 1]) * f, dz = (R.wp[b + 2] - R.wp[a + 2]) * f;
        const nx = R.wn[a], ny = R.wn[a + 1], nz = R.wn[a + 2];
        const L2 = Math.hypot(dx, dy, dz) || 1e-4;
        // width across: (d x n), normalised; a little wider with distance so it does not vanish into aliasing
        let wx = dy * nz - dz * ny, wy = dz * nx - dx * nz, wz = dx * ny - dy * nx;
        const wl = Math.hypot(wx, wy, wz) || 1, W = (0.04 + dc * 0.0022) * (s === full ? 1.8 : 1);
        wx *= W / wl; wy *= W / wl; wz *= W / wl;
        const o = k * 16;
        e[o] = dx; e[o + 1] = dy; e[o + 2] = dz; e[o + 3] = 0;
        e[o + 4] = nx * 0.01; e[o + 5] = ny * 0.01; e[o + 6] = nz * 0.01; e[o + 7] = 0;
        e[o + 8] = wx; e[o + 9] = wy; e[o + 10] = wz; e[o + 11] = 0;
        e[o + 12] = R.wp[a] - wx * 0.5; e[o + 13] = R.wp[a + 1] - wy * 0.5; e[o + 14] = R.wp[a + 2] - wz * 0.5; e[o + 15] = 1;
        // brightest at the growing tip, a cooler glow behind it, the whole trace fading once the tile has settled
        // a white-hot bead running out ahead, a crackling blue thread behind it
        const head = Math.exp(-(g - s - f) * 1.4);
        const I = (1.6 + 6 * head) * R.fade * distFade * glow * (0.75 + 0.25 * Math.sin(clock * 23 + s * 2.1));
        rc.copy(deep).lerp(hot, 0.45 + 0.55 * head).lerp(white, head * 0.6).multiplyScalar(I);
        rMesh.setColorAt(k, rc);
        k++;
      }
    }
    rMesh.count = k;
    if (k) { rMesh.instanceMatrix.needsUpdate = true; rMesh.instanceColor.needsUpdate = true; }
  }

  function update(dt, t) {
    clock = t;
    const f = sky.flicker.value;
    const glow = 1 + clamp((0.75 - f) / 0.4, 0, 1) * 2.6;
    if (!setupDone) {
      deferred += dt;
      // wait for the rocks and structures to be built (or for long enough that they are not coming)
      const haveRocks = !!scene.getObjectByName('rocks-boulder-0'), haveCourt = colliders.some((c) => Math.abs(c.r - 1.25) < 0.06);
      if ((haveRocks && haveCourt && deferred > 0.5) || deferred > 6) {
        setupDone = true;
        try { setupBoulder(); } catch (e) { console.error('[fp] uncanny.biomesh boulder:', e); }
        try { setupCourt(); } catch (e) { console.error('[fp] uncanny.biomesh court:', e); }
      }
    }
    camera.getWorldDirection(camFwd);
    for (const C of colonies) {
      C.mat.userData.u.uTime.value = t; C.mat.userData.u.uGlow.value = glow;
      if (!C.count || !C.ready) continue;
      const cd = hyp(cam.x - C.center.x, cam.z - C.center.z);
      // v3 stage 2: tiles more than 60 m away hold still (the creep is too slow to see there); a colony
      // wholly beyond that and past where runners start is skipped. ?throttle=0: the old 110 m.
      const hold = ctx.throttle !== false;
      if (cd > C.radius + (hold ? 70 : 110)) continue;
      // a new runner every few seconds while you are anywhere near
      if (cd < C.radius + 70 && (C.next -= dt) <= 0) {
        C.next = C.every[0] + rng() * (C.every[1] - C.every[0]);
        if (!startRunner(C)) C.next = 0.4;
      }
      // the creep is slow, so a big colony is stepped in interleaved slices, a part of it each frame
      const S = Math.max(1, Math.ceil(C.count / (low ? 600 : 900)));
      C.phase = (C.phase + 1) % S;
      const dS = dt * S;
      const aw = C.aware.array, fa = C.fresh.array;
      let anyAware = false, anyFresh = false, wrote = false;
      for (let i = C.phase; i < C.count; i += S) {
        const d2 = (C.wx[i] - cam.x) ** 2 + (C.wy[i] - cam.y) ** 2 + (C.wz[i] - cam.z) ** 2;
        const near = d2 < 36;
        C.aw[i] = approach(C.aw[i], near ? 1 : 0, near ? 3 : 0.5, dS);
        aw[i] = C.aw[i];
        if (C.aw[i] > 0.01) anyAware = true;
        // growing in, the fresh glow ebbing, or (held by a runner) going dark before being taken up
        if (C.grow[i] < 1 && !C.busy[i]) C.grow[i] = Math.min(1, C.grow[i] + dS / 0.8);
        const fr = C.fr[i];
        if (fr > 0) C.fr[i] = Math.max(0, fr - dS / 5);
        else if (fr < 0) C.fr[i] = Math.max(-1, fr - dS / 1.6);
        if (fr !== 0 || fa[i] !== 0) { fa[i] = C.fr[i]; anyFresh = true; }
        if (C.busy[i] && (C.fr[i] <= -1 || C.grow[i] < 1)) { write(C, i, 0); wrote = true; continue; } // dark, or not yet grown, waiting for its runner
        if (near && C.grow[i] >= 1) continue;
        if (hold && d2 > 3600 && C.grow[i] >= 1 && C.hopP[i] < 0) continue; // far: holds still (not mid-hop or growing in)
        // creep: a slow flow field, breathing in waves out from the colony's heart, tethered to home
        const u = C.u[i], v = C.v[i];
        const ang = noise.noise2(u * 0.07 + t * 0.006, v * 0.07 - t * 0.0045 + C.col[i] * 9) * TAU * 1.3;
        const breath = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.45 - hyp(C.au[i] - C.center.x * (C.mode[i] ? 0 : 1), C.av[i] - C.center.z * (C.mode[i] ? 0 : 1)) * 0.35 + C.seed.array[i] * 0.02));
        let du = Math.cos(ang) * C.spd[i] * breath + (C.au[i] - u) * 0.012;
        let dv = Math.sin(ang) * C.spd[i] * breath + (C.av[i] - v) * 0.012;
        if (C.mode[i] === 1) dv += 0.006;
        let lift = 0;
        if (C.hopP[i] >= 0) {
          C.hopP[i] += dS / 0.45;
          const p = C.hopP[i];
          lift = Math.sin(Math.min(1, p) * Math.PI) * (0.05 + C.sx[i] * 0.25);
          du += Math.cos(C.yaw[i]) * 0.55; dv -= Math.sin(C.yaw[i]) * 0.55;
          if (p >= 1) { C.hopP[i] = -1; C.hopT[i] = 6 + rng() * 30; }
        } else if ((C.hopT[i] -= dS) <= 0) C.hopP[i] = 0;
        let nu = u + du * dS, nv = v + dv * dS;
        if (C.mode[i] === 1) nv = clamp(nv, 0, C.vmax[i]);
        else if (!okG(nu, nv)) { nu = u; nv = v; C.yaw[i] += 0.5; }
        C.u[i] = nu; C.v[i] = nv;
        // body turns slowly into the way it is going
        const ty = Math.atan2(-dv, du);
        let dy = ty - C.yaw[i]; dy -= Math.round(dy / TAU) * TAU;
        C.yaw[i] += dy * Math.min(1, dS * 0.6);
        write(C, i, lift); wrote = true;
      }
      if (wrote) C.mesh.instanceMatrix.needsUpdate = true;
      if (anyAware || C.awareWas) C.aware.needsUpdate = true;
      if (anyFresh) C.fresh.needsUpdate = true;
      C.awareWas = anyAware;
    }
    drawRunners(dt, glow);
  }
  ctx.registerUpdate(update);

  U.biomesh = {
    colonies, runners,
    count: () => colonies.reduce((a, C) => a + C.count, 0),
    ceiling: () => colonies.reduce((a, C) => a + C.n, 0),
    activeRunners: () => runners.filter((r) => r.on).length,
    // test hook: run the creep forward without rendering (seconds)
    advance(sec, step = 0.1) { for (let s = 0; s < sec; s += step) update(step, ctx.time.t + s); },
    // test hook: start a runner from colony `name` now
    sprout(name = 'lattice') { const C = colonies.find((c) => c.name === name); return C && C.ready ? startRunner(C) : false; },
  };
  const tiles = colonies.reduce((a, C) => a + C.n, 0);
  return { drawCalls: colonies.length + 1, tris: tiles * 12 + MAXR * SEG * 2 };
}
