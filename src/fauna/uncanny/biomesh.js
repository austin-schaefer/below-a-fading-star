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
  const q = low ? 0.5 : 1;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const okG = (x, z) => U.rules.dry(x, z, 0.1) && terrain.slopeAt(x, z) < 0.85;
  const colonies = [];
  const nrm = new THREE.Vector3();

  function colony(name, n, center, radius) {
    const mat = tileMaterial(ctx, center);
    const g = geo.clone();
    const seed = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    const aware = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    aware.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aSeed', seed); g.setAttribute('aAware', aware);
    const mesh = new THREE.InstancedMesh(g, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.name = 'uncanny-biomesh-' + name; mesh.receiveShadow = true; mesh.count = 0;
    scene.add(mesh);
    const C = {
      name, mesh, mat, n, center, radius, count: 0, seed, aware, cols: [], hf: null,
      u: new Float32Array(n), v: new Float32Array(n), au: new Float32Array(n), av: new Float32Array(n),
      yaw: new Float32Array(n), spd: new Float32Array(n), hopT: new Float32Array(n), hopP: new Float32Array(n),
      sx: new Float32Array(n), sz: new Float32Array(n), th: new Float32Array(n), mode: new Uint8Array(n), col: new Uint8Array(n),
      wx: new Float32Array(n), wy: new Float32Array(n), wz: new Float32Array(n), aw: new Float32Array(n), vmax: new Float32Array(n),
    };
    colonies.push(C);
    return C;
  }
  function addTile(C, u, v, mode = 0, col = 0, vmax = 1e9) {
    if (C.count >= C.n) return false;
    const i = C.count++;
    C.u[i] = C.au[i] = u; C.v[i] = C.av[i] = v; C.mode[i] = mode; C.col[i] = col; C.vmax[i] = vmax;
    C.yaw[i] = rng() * TAU; C.spd[i] = 0.02 + rng() * 0.045; C.hopT[i] = 2 + rng() * 30; C.hopP[i] = -1;
    const big = rng() < 0.04;
    const len = big ? 0.42 + rng() * 0.2 : 0.1 + Math.pow(rng(), 1.6) * 0.22;
    C.sx[i] = len; C.sz[i] = len * (0.45 + rng() * 0.4); C.th[i] = 0.018 + len * 0.08;
    C.seed.array[i] = rng() * 100;
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
  function map(C, i) {
    if (C.mode[i] === 1) {
      const c = C.cols[C.col[i]], R = c.r, th = C.u[i] / R;
      const cs = Math.cos(th), sn = Math.sin(th);
      P[0] = c.x + R * cs; P[1] = c.base + C.v[i]; P[2] = c.z + R * sn;
      N[0] = cs; N[1] = 0; N[2] = sn; T0[0] = -sn; T0[1] = 0; T0[2] = cs;
      return;
    }
    const x = C.u[i], z = C.v[i];
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
  function write(C, i, lift) {
    map(C, i);
    const yaw = C.yaw[i], cy = Math.cos(yaw), sy = Math.sin(yaw);
    // B0 = N x T0
    const bx = N[1] * T0[2] - N[2] * T0[1], by = N[2] * T0[0] - N[0] * T0[2], bz = N[0] * T0[1] - N[1] * T0[0];
    const dx = cy * T0[0] + sy * bx, dy = cy * T0[1] + sy * by, dz = cy * T0[2] + sy * bz;
    // Z = d x N
    const zx = dy * N[2] - dz * N[1], zy = dz * N[0] - dx * N[2], zz = dx * N[1] - dy * N[0];
    const sx = C.sx[i], sz = C.sz[i], th = C.th[i];
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
    if (C.mesh.boundingSphere) C.mesh.boundingSphere.radius += 2;
  }
  // a clump of tiles packed round (x, z)
  function patch(C, x, z, r, n) {
    for (let k = 0; k < n * 3 && n > 0; k++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (!okG(px, pz)) continue;
      if (addTile(C, px, pz)) n--; else return;
    }
  }

  // ---- 1. the Lattice carpet: clumps all about the seed, and trails running out from it like ants
  const M = L.moraine;
  {
    const C = colony('lattice', Math.round(960 * q), M, 70);
    const trailN = Math.round(C.n * 0.3);
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
    while (C.count < C.n && guard++ < 400) {
      const a = rng() * TAU, d = 2 + Math.pow(rng(), 1.5) * 38;
      const x = M.x + Math.cos(a) * d, z = M.z + Math.sin(a) * d * 0.85 + 5;
      const r = 0.7 + rng() * 1.6 * (1 - d / 50);
      patch(C, x, z, r, Math.round(r * r * (16 + rng() * 10)));
    }
    finish(C);
  }

  // ---- 2. outliers on the causeway, far from home: a thin column of them marching along the paving
  {
    const a = causeway[3], b = causeway[4];
    const len = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
    const C = colony('causeway', Math.round(200 * q), { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, 30);
    C.lift = 0.05;
    for (let k = 0; C.count < C.n && k < C.n * 3; k++) {
      const s = 14 + (k / (C.n * 3)) * 30 + (rng() - 0.5) * 0.6;
      const off = Math.sin(s * 0.19) * 0.9 + (rng() - 0.5) * (0.4 + 0.5 * (0.5 + 0.5 * Math.sin(s * 0.7)));
      const x = a.x + ux * s - uz * off, z = a.z + uz * s + ux * off;
      if (okG(x, z)) addTile(C, x, z);
    }
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
      for (let k = 0; C.count < C.n && k < 4000; k++) {
        const x = hf.x0 + rng() * 2 * R, z = hf.z0 + rng() * 2 * R;
        const ix = Math.round((x - hf.x0) / step), iz = Math.round((z - hf.z0) / step);
        const on = hf.on[iz * n + ix];
        const side = Math.cos(Math.atan2(z - pick.z, x - pick.x) - fl);
        if (on ? rng() < 0.25 + 0.5 * (side > -0.2) : (side > 0.6 && rng() < 0.3 && Math.hypot(x - pick.x, z - pick.z) < R * 0.9)) addTile(C, x, z);
      }
      U.biomesh.boulder = { x: pick.x, z: pick.z, r: pick.r };
    } else {
      // no rocks module: a clump in the turf beside the road
      patch(C, C.center.x, C.center.z, 2.4, C.n);
    }
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
    const perCol = Math.floor(C.n / C.cols.length);
    C.cols.forEach((c, ci) => {
      const face = Math.PI / 2 + (ci ? 0.5 : -0.5) + (rng() - 0.5) * 0.5; // toward the causeway side, where you come from
      const hTop = Math.min(c.top - c.base - 0.3, 2.8 + rng() * 2.5);
      let n = Math.round(perCol * 0.8);
      for (let k = 0; n > 0 && k < 4000; k++) {
        const th = face + (rng() - 0.5) * 1.5, h = Math.pow(rng(), 1.4) * hTop;
        const edge = hTop * (0.55 + 0.45 * (0.5 + 0.5 * noise.noise2(th * 2.3 + ci * 7, 0.5)));
        if (h > edge) continue;
        if (addTile(C, th * c.r, h, 1, ci, hTop)) { n--; const j = C.count - 1; C.sx[j] *= 1.3; C.sz[j] *= 1.3; }
      }
      // and a pool of them on the floor at its foot, spilling out from under the plinth
      for (let k = 0; C.count < perCol * (ci + 1) && k < 800; k++) {
        const a = face + (rng() - 0.5) * 1.5, d = 2.1 + Math.pow(rng(), 1.4) * 2.6;
        const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (okG(x, z) && Math.max(Math.abs(x - c.x), Math.abs(z - c.z)) > 1.55) addTile(C, x, z, 0, ci);
      }
    });
    finish(C);
    U.biomesh.columns = C.cols;
  }
  let deferred = 0, setupDone = false;

  const cam = camera.position;
  function update(dt, t) {
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
    for (const C of colonies) {
      C.mat.userData.u.uTime.value = t; C.mat.userData.u.uGlow.value = glow;
      if (!C.count) continue;
      const cd = Math.hypot(cam.x - C.center.x, cam.z - C.center.z);
      if (cd > C.radius + 110) continue;
      const aw = C.aware.array;
      let anyAware = false;
      for (let i = 0; i < C.count; i++) {
        const near = (C.wx[i] - cam.x) ** 2 + (C.wy[i] - cam.y) ** 2 + (C.wz[i] - cam.z) ** 2 < 36;
        C.aw[i] = approach(C.aw[i], near ? 1 : 0, near ? 3 : 0.5, dt);
        aw[i] = C.aw[i];
        if (C.aw[i] > 0.01) anyAware = true;
        if (near) continue;
        // creep: a slow flow field, breathing in waves out from the colony's heart, tethered to home
        const u = C.u[i], v = C.v[i];
        const ang = noise.noise2(u * 0.07 + t * 0.006, v * 0.07 - t * 0.0045 + C.col[i] * 9) * TAU * 1.3;
        const breath = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.45 - Math.hypot(C.au[i] - C.center.x * (C.mode[i] ? 0 : 1), C.av[i] - C.center.z * (C.mode[i] ? 0 : 1)) * 0.35 + C.seed.array[i] * 0.02));
        let du = Math.cos(ang) * C.spd[i] * breath + (C.au[i] - u) * 0.012;
        let dv = Math.sin(ang) * C.spd[i] * breath + (C.av[i] - v) * 0.012;
        if (C.mode[i] === 1) dv += 0.006;
        let lift = 0;
        if (C.hopP[i] >= 0) {
          C.hopP[i] += dt / 0.45;
          const p = C.hopP[i];
          lift = Math.sin(Math.min(1, p) * Math.PI) * (0.05 + C.sx[i] * 0.25);
          du += Math.cos(C.yaw[i]) * 0.55; dv -= Math.sin(C.yaw[i]) * 0.55;
          if (p >= 1) { C.hopP[i] = -1; C.hopT[i] = 6 + rng() * 30; }
        } else if ((C.hopT[i] -= dt) <= 0) C.hopP[i] = 0;
        let nu = u + du * dt, nv = v + dv * dt;
        if (C.mode[i] === 1) nv = clamp(nv, 0, C.vmax[i]);
        else if (!okG(nu, nv)) { nu = u; nv = v; C.yaw[i] += 0.5; }
        C.u[i] = nu; C.v[i] = nv;
        // body turns slowly into the way it is going
        const ty = Math.atan2(-dv, du);
        let dy = ty - C.yaw[i]; dy -= Math.round(dy / TAU) * TAU;
        C.yaw[i] += dy * Math.min(1, dt * 0.6);
        write(C, i, lift);
      }
      C.mesh.instanceMatrix.needsUpdate = true;
      if (anyAware || C.awareWas) C.aware.needsUpdate = true;
      C.awareWas = anyAware;
    }
  }
  ctx.registerUpdate(update);

  U.biomesh = {
    colonies,
    count: () => colonies.reduce((a, C) => a + C.count, 0),
    // test hook: run the creep forward without rendering (seconds)
    advance(sec) { for (let s = 0; s < sec; s += 0.5) update(0.5, ctx.time.t + s); },
  };
  const tiles = colonies.reduce((a, C) => a + C.n, 0);
  return { drawCalls: colonies.length, tris: tiles * 12 };
}
