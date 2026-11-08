// The man in the cloak of eyes: a tall hooded figure standing before the Wayside Shrine, his cloak sewn thick with
// eyes. Every eye follows you, each with its own lag and its own small restlessness; they blink in waves
// that climb from hem to hood. He faces the sun until you come within 40 m, then turns, slowly, to you.
// When the sun gutters every eye shuts at once. He never moves from his spot.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../geo.js';
import { Painter, paintedMaterial, makeGround, approach, turnToward, angDiff } from './kit.js';

const TAU = Math.PI * 2;
const table = (tab, v) => {
  for (let k = 0; k < tab.length - 1; k++) {
    if (v <= tab[k + 1][0]) { const t = (v - tab[k][0]) / (tab[k + 1][0] - tab[k][0]); return lerp(tab[k][1], tab[k + 1][1], smoothstep(0, 1, t)); }
  }
  return tab[tab.length - 1][1];
};
// Profile of a tall man under heavy cloth: the hem spreads, the waist narrows, then real shoulders
// (wider than the waist, squared off) so from behind and from the side he reads as a man, not a pillar.
const WIDTH = [[0, 0.45], [0.14, 0.37], [0.5, 0.3], [0.74, 0.315], [0.86, 0.395], [0.92, 0.4], [0.96, 0.34], [1, 0.12]];
const HOOD_R = [[0, 0.17], [0.18, 0.23], [0.5, 0.235], [0.75, 0.18], [0.9, 0.1], [1, 0.012]];
const TOP = 2.7;

function cloakPt(n2, u, v, o) {
  const a = u * TAU;
  const hem = 0.02 + 0.09 * (0.5 + 0.5 * n2(Math.cos(a) * 1.7, Math.sin(a) * 1.7));
  const y = lerp(hem, TOP, v) + 0.05 * Math.cos(a) * smoothstep(0.8, 1, v);
  const w = table(WIDTH, v);
  const fold = 1 + (0.14 * (1 - v) + 0.025) * Math.pow(Math.abs(Math.sin(a * 6 + 0.8 * Math.sin(a * 3))), 0.6) - 0.06 * (1 - v) + 0.04 * (1 - v) * n2(a * 2.1, v * 3);
  const dz = lerp(0.68, 0.56, smoothstep(0.7, 0.95, v));
  o[0] = Math.cos(a) * w * fold;
  o[1] = y;
  o[2] = Math.sin(a) * w * dz * fold + 0.1 * v * v;
  return o;
}
// hood: m is the face cavity mask at this point
// The hood is bowed: tilted forward about the nape so it overhangs the face, its peak falling back a little.
const HOOD_TILT = 0.26, NAPE_Y = TOP - 0.12, NAPE_Z = 0.04;
const HC = Math.cos(HOOD_TILT), HS = Math.sin(HOOD_TILT);
function hoodPt(u, v, o) {
  const a = u * TAU;
  const cy = TOP - 0.1 + v * 0.8, cz = 0.14 + 0.13 * Math.sin(Math.PI * v) - 0.2 * Math.pow(v, 2.5);
  const r = table(HOOD_R, v);
  const front = Math.sin(a);
  const m = smoothstep(0.5, 0.82, front) * smoothstep(0.12, 0.26, v) * (1 - smoothstep(0.56, 0.7, v));
  const rr = r * (1 - 0.82 * m);
  const x = Math.cos(a) * rr, y = cy, z = cz + front * rr * 1.08;
  // tilt grows with height so the hood still sits on the shoulders at its base
  const k = smoothstep(0, 0.35, v);
  const dy = y - NAPE_Y, dz = z - NAPE_Z;
  o[0] = x;
  o[1] = lerp(y, NAPE_Y + dy * HC - dz * HS, k);
  o[2] = lerp(z, NAPE_Z + dz * HC + dy * HS, k);
  o[3] = m;
  return o;
}

function eyeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0 });
  const uGlow = { value: 0.32 };
  m.userData.uGlow = uGlow;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = uGlow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aGaze; attribute float aLid; attribute float aKind;
        varying vec3 vEP; varying vec3 vGz; varying float vLid; varying float vKind; varying vec3 vEN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vEP = position; vGz = aGaze; vLid = aLid; vKind = aKind;`)
      .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
        vEN = normalize(transformedNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vEP; varying vec3 vGz; varying float vLid; varying float vKind; varying vec3 vEN; uniform float uGlow;
        float ehash(float n) { return fract(sin(n * 91.345) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float fpR = 0.25; float fpGlow = 0.0; float fpSpec = 0.0;
        {
          vec3 p = normalize(vEP);
          float ap = mix(0.6, -0.1, vLid);
          float shape = 1.0 - 0.6 * p.x * p.x;
          float up = ap * shape, lo = -ap * 0.78 * shape;
          float lidD = max(p.y - up, lo - p.y);
          vec3 flesh = vec3(0.03, 0.022, 0.024);
          if (lidD > 0.0 || p.z < 0.05) {
            // lid: the cloak's own stuff, sore and dark at the rim
            float rim = 1.0 - smoothstep(0.0, 0.08, lidD);
            diffuseColor.rgb = mix(flesh, vec3(0.16, 0.03, 0.035), rim * 0.8);
            fpR = mix(0.75, 0.35, rim);
          } else {
            vec3 g = normalize(vGz);
            float d = dot(p, g);
            vec3 e1 = normalize(cross(vec3(0.0, 1.0, 0.0), g) + vec3(1e-4, 0.0, 0.0));
            vec3 e2 = cross(g, e1);
            vec3 q = p - g * d;
            float qx = dot(q, e1), qy = dot(q, e2), ql = length(q);
            // sclera: yellowed bone, veined toward the lids
            vec3 scl = vec3(0.7, 0.64, 0.5);
            float vein = smoothstep(0.55, 0.0, -lidD) * 0.0 + smoothstep(0.75, 0.2, d);
            float fine = smoothstep(0.82, 0.95, sin(atan(p.y, p.x) * 23.0 + p.z * 31.0 + vKind * 40.0) * 0.5 + 0.5);
            scl = mix(scl, vec3(0.55, 0.16, 0.12), clamp(vein * 0.6 + fine * (0.25 + vein) * 0.7, 0.0, 0.9));
            vec3 col = scl;
            if (d > 0.0 && ql < 0.44) {
              float k = ehash(vKind * 7.0 + 1.0);
              vec3 iris = k < 0.35 ? vec3(0.62, 0.72, 0.78) : k < 0.6 ? vec3(0.8, 0.62, 0.3) : k < 0.85 ? vec3(0.55, 0.62, 0.5) : vec3(0.85, 0.85, 0.82);
              float ang = atan(qy, qx);
              float streak = 0.75 + 0.25 * sin(ang * 31.0 + vKind * 13.0) * sin(ang * 7.0 - vKind * 5.0);
              iris *= streak * mix(1.0, 0.45, smoothstep(0.3, 0.44, ql));
              col = iris;
              bool pupil;
              if (vKind < 0.55) pupil = ql < 0.16;
              else if (vKind < 0.85) pupil = (qx * qx) / (0.33 * 0.33) + (qy * qy) / (0.06 * 0.06) < 1.0;
              else pupil = (qx * qx) / (0.05 * 0.05) + (qy * qy) / (0.3 * 0.3) < 1.0;
              if (pupil) col = vec3(0.01, 0.008, 0.01);
            }
            // shadow cast by the upper lid
            col *= mix(0.55, 1.0, smoothstep(0.0, 0.18, up - p.y));
            diffuseColor.rgb = col;
            fpR = 0.12; fpGlow = 1.0;
            // a wet point of light, always on the side toward you and a little above
            vec3 hl = normalize(vec3(-0.35, 0.45, 0.82));
            float spec = pow(max(dot(normalize(vEN), hl), 0.0), 90.0);
            fpSpec = spec;
          }
        }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = fpR;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * fpGlow * uGlow + vec3(1.0, 0.97, 0.9) * fpSpec * 1.6;');
  };
  return m;
}

export function buildCloak(ctx, U) {
  const { scene, camera, sky, terrain, noise } = ctx;
  const rng = ctx.makeRng(9101);
  const ground = makeGround(ctx);
  const n2 = noise.noise2;
  const low = ctx.quality === 'low';

  // the spot: before the Wayside Shrine. He stands about 6 m out from the niche, on the side away from the
  // sun, so that walking up from the causeway you see him from behind with the shrine and the sun beyond,
  // and he faces the sun over the shrine. The shrine is built by the structures module, which may finish
  // after us: until its note appears we place him against the landmark's centre and move him once it does.
  const SH = ctx.landmarks.shrine;
  const sunYaw = Math.atan2(ctx.sun.dir.x, ctx.sun.dir.z);
  const colliders = ctx.controls?.state?.colliders || [];
  let self = null;
  // clear ground: nothing solid within a couple of metres, and nothing big between him and the open moor
  // behind him (so walking up you see him, not the boulder he stands behind)
  const clear = (x, z, ax, az) => {
    for (const c of colliders) {
      if (c === self || c.h !== undefined) continue;
      const dx = c.x - x, dz = c.z - z;
      if (Math.hypot(dx, dz) < c.r + 1.6) return false;
      if (c.r < 0.9) continue;
      const along = dx * ax + dz * az;
      if (along > 0 && along < 30 && Math.abs(dx * az - dz * ax) < c.r + 0.8) return false;
    }
    return true;
  };
  const spot = (cx, cz) => {
    // the niche sits 4.2 m east and 1.2 m south of the cell's centre; try a fan of points round "away from the sun"
    const nx = cx + 4.2, nz = cz + 1.2;
    const away = sunYaw + Math.PI;
    let fallback = null;
    for (const da of [0, -0.35, 0.35, -0.7, 0.7, -1.05, 1.05, -1.4, 1.4]) for (const d of [6, 6.8, 5.5, 7.6]) {
      const ax = Math.sin(away + da), az = Math.cos(away + da);
      const x = nx + ax * d, z = nz + az * d;
      if (Math.hypot(x - cx, z - cz) < 5.5) continue; // clear of the cell's ring
      if (!U.rules.okFoot(x, z)) continue;
      if (clear(x, z, ax, az)) return [x, z];
      fallback ||= [x, z];
    }
    return fallback || [nx + Math.sin(away) * 6, nz + Math.cos(away) * 6];
  };
  const shrineNote = () => ctx.structures?.notes?.shrine || null;
  let placedFrom = shrineNote();
  let [sx, sz] = placedFrom ? spot(placedFrom.x, placedFrom.z) : spot(SH.x - 4.2, SH.z - 1.2);

  // ---- body: cloak, hood, sleeves. Coal-black, matte; only the eyes catch light.
  const P = new Painter(['aSway']);
  const cloth = '#0b090a', voidc = '#000000';
  P.paint(cloth, 0, 0.96);
  P.grid(low ? 36 : 54, low ? 24 : 32, (u, v, o) => { P.set('aSway', smoothstep(0.25, 0, v)); cloakPt(n2, u, v, o); }, true, false);
  P.set('aSway', 0);
  const h4 = [0, 0, 0, 0];
  P.grid(low ? 20 : 28, 18, (u, v, o) => {
    hoodPt(u, v, h4);
    P.paint(h4[3] > 0.3 ? voidc : cloth, 0, 0.96);
    o[0] = h4[0]; o[1] = h4[1]; o[2] = h4[2];
  }, true, true);
  // sleeves: hanging past the knee, wide at the cuff, nothing inside them
  const SLV = (sd, t) => { // centre and radius along the sleeve, t 0 shoulder .. 1 cuff
    // from the shoulder point, splaying a little from the body so the arms read at a distance
    const y = 2.5 - t * 1.66;
    return [sd * (0.31 + 0.2 * Math.pow(t, 1.4)), y, 0.03 + 0.11 * t, 0.075 + 0.07 * t * t];
  };
  for (const sd of [-1, 1]) {
    P.paint(cloth, 0, 0.96);
    P.grid(low ? 10 : 14, 10, (u, v, o) => {
      const c = SLV(sd, v), a = u * TAU, rib = 1 + 0.12 * Math.abs(Math.sin(a * 4));
      P.set('aSway', smoothstep(0.6, 1, v) * 0.7);
      o[0] = c[0] + Math.cos(a) * c[3] * rib; o[1] = c[1] + (v > 0.95 ? Math.sin(a + 1) * 0.03 : 0); o[2] = c[2] + Math.sin(a) * c[3] * rib;
    }, true, false);
    P.set('aSway', 0.7); P.paint(voidc, 0, 1);
    const c = SLV(sd, 0.99); P.blob(c[0], c[1] + 0.01, c[2], c[3] * 0.92, 0.02, c[3] * 0.92, 10, 3);
    P.set('aSway', 0);
  }
  const bodyMat = paintedMaterial({}, undefined, true);
  const body = new THREE.Mesh(P.geometry(), bodyMat);
  body.castShadow = true; body.receiveShadow = true; body.name = 'uncanny-cloak';

  // ---- eyes: sockets over the cloak, and a knot of them inside the hood where a face should be
  const sockets = [];
  const tmp = [0, 0, 0], a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0], d = [0, 0, 0];
  const nEyes = low ? 150 : 230, nHood = 9, nSleeve = Math.round(nEyes * 0.24);
  const fits = (p, r) => { for (const s of sockets) if (Math.hypot(s.p[0] - p[0], s.p[1] - p[1], s.p[2] - p[2]) < (s.r + r) * 1.08) return false; return true; };
  const eyeR = () => (rng() > 0.97 ? 0.05 + rng() * 0.02 : 0.019 + Math.pow(rng(), 2.4) * 0.028);
  // clustered: a noise field decides where they crowd, and they crowd most on his back
  const crowd = (u, v) => 0.5 + 0.5 * n2(Math.cos(u * TAU) * 2.2 + 7, Math.sin(u * TAU) * 2.2 + v * 4.5);
  let tries = 0;
  while (sockets.length < nEyes - nHood - nSleeve && tries++ < 20000) {
    const u = rng(), v = 0.2 + rng() * 0.72;
    const back = Math.sin(u * TAU) < 0 ? 1 : 0.3;
    if (rng() > back * smoothstep(0.25, 0.75, crowd(u, v))) continue;
    const r = eyeR();
    cloakPt(n2, u, v, tmp);
    if (!fits(tmp, r)) continue;
    const du = 0.004, dv = 0.006;
    cloakPt(n2, u + du, v, a); cloakPt(n2, u - du, v, b); cloakPt(n2, u, v + dv, c); cloakPt(n2, u, v - dv, d);
    const tu = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], tv = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    let nx = tv[1] * tu[2] - tv[2] * tu[1], ny = tv[2] * tu[0] - tv[0] * tu[2], nz = tv[0] * tu[1] - tv[1] * tu[0];
    const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    if (nx * tmp[0] + nz * (tmp[2] - 0.1 * v * v) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    sockets.push({ p: [tmp[0], tmp[1], tmp[2]], n: [nx, ny, nz], r });
  }
  tries = 0;
  const target = sockets.length + nSleeve;
  while (sockets.length < target && tries++ < 8000) {
    const sd = rng() < 0.5 ? -1 : 1, t = 0.08 + rng() * 0.86, an = rng() * TAU;
    if (Math.cos(an) * sd < -0.2) continue; // not on the inner face against the body
    const cc = SLV(sd, t), r = eyeR() * 0.85;
    const nx = Math.cos(an), nz = Math.sin(an);
    const p = [cc[0] + nx * cc[3] * 1.06, cc[1], cc[2] + nz * cc[3] * 1.06];
    if (!fits(p, r)) continue;
    sockets.push({ p, n: [nx, 0, nz], r });
  }
  for (let k = 0; k < nHood; k++) {
    const u = 0.25 + (rng() - 0.5) * 0.08, v = 0.3 + rng() * 0.22;
    hoodPt(u, v, h4);
    const r = 0.022 + rng() * 0.02;
    let clash = false;
    for (const s of sockets) if (Math.hypot(s.p[0] - h4[0], s.p[1] - h4[1], s.p[2] - h4[2]) < (s.r + r) * 1.05) { clash = true; break; }
    if (clash && k > 2) continue;
    const nx = (rng() - 0.5) * 0.3, ny = (rng() - 0.5) * 0.2, nz = 1;
    const nl = Math.hypot(nx, ny, nz);
    sockets.push({ p: [h4[0], h4[1], h4[2] + r * 0.4], n: [nx / nl, ny / nl, nz / nl], r, hood: true });
  }
  const N = sockets.length;
  const eyeGeo = new THREE.SphereGeometry(1, low ? 8 : 10, low ? 6 : 8);
  const gazeA = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
  const lidA = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  const kindA = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  gazeA.setUsage(THREE.DynamicDrawUsage); lidA.setUsage(THREE.DynamicDrawUsage);
  eyeGeo.setAttribute('aGaze', gazeA); eyeGeo.setAttribute('aLid', lidA); eyeGeo.setAttribute('aKind', kindA);
  const eyeMat = eyeMaterial();
  const eyes = new THREE.InstancedMesh(eyeGeo, eyeMat, N);
  eyes.name = 'uncanny-cloak-eyes'; eyes.receiveShadow = true;
  // per-eye state: socket basis (X, Y, Z), position, gaze, lag rate, saccade
  const S = new Float32Array(N * 12), G = new Float32Array(N * 3), rate = new Float32Array(N), sac = new Float32Array(N * 3), lid = new Float32Array(N), lidT = new Float32Array(N);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const s = sockets[i];
    const [nx, ny, nz] = s.n;
    // Y: world up projected onto the tangent plane; X = Y x Z
    let yx = -nx * ny, yy = 1 - ny * ny, yz = -nz * ny;
    const yl = Math.hypot(yx, yy, yz) || 1; yx /= yl; yy /= yl; yz /= yl;
    const xx = yy * nz - yz * ny, xy = yz * nx - yx * nz, xz = yx * ny - yy * nx;
    const px = s.p[0] - nx * s.r * 0.32, py = s.p[1] - ny * s.r * 0.32, pz = s.p[2] - nz * s.r * 0.32;
    S.set([xx, xy, xz, yx, yy, yz, nx, ny, nz, px, py, pz], i * 12);
    m4.set(xx * s.r, yx * s.r, nx * s.r, px, xy * s.r, yy * s.r, ny * s.r, py, xz * s.r, yz * s.r, nz * s.r, pz, 0, 0, 0, 1);
    eyes.setMatrixAt(i, m4);
    G[i * 3 + 2] = 1;
    gazeA.array[i * 3 + 2] = 1;
    rate[i] = rng() < 0.12 ? 0.5 + rng() * 0.6 : 2 + rng() * 6;
    sac[i * 3 + 2] = rng() * 3;
    kindA.array[i] = s.hood ? 0.6 + rng() * 0.25 : rng();
    lidT[i] = 3 + rng() * 20;
  }
  eyes.computeBoundingSphere();

  const g = new THREE.Group();
  g.add(body, eyes);
  g.position.set(sx, ground.at(sx, sz) - 0.04, sz);
  g.rotation.y = sunYaw;
  scene.add(g);
  const collider = self = { x: sx, z: sz, r: 0.65 };
  ctx.addCollider(collider);
  let lookT = 0, settled = false;
  function moveTo(x, z) { g.position.set(x, ground.at(x, z) - 0.04, z); collider.x = x; collider.z = z; }

  const state = { position: g.position, closed: false, distance: 99, facingPlayer: false };
  const cam = camera.position;
  let closedPrev = false;
  function update(dt, t) {
    bodyMat.userData.uT.value = t;
    // the shrine's own position, once the structures module has built it (looked for during the first minute)
    // (and once more when the rocks' colliders are surely in, to stand clear of them)
    if ((!placedFrom || !settled) && t < 60 && (lookT -= dt) <= 0) {
      lookT = 1;
      const n = shrineNote();
      if (n && (!placedFrom || t > 2)) { placedFrom = n; settled = t > 2; const p = spot(n.x, n.z); moveTo(p[0], p[1]); }
      else if (!n && t > 8) { settled = true; const p = spot(SH.x - 4.2, SH.z - 1.2); moveTo(p[0], p[1]); }
    }
    const dx = cam.x - g.position.x, dz = cam.z - g.position.z, dist = Math.hypot(dx, dz);
    state.distance = dist;
    // the figure: toward the sun, or toward you when you are near; never quickly
    const near = dist < 40;
    state.facingPlayer = near;
    g.rotation.y = turnToward(g.rotation.y, near ? Math.atan2(dx, dz) : sunYaw, (near ? 0.14 : 0.06) * dt);
    if (dist > 160) return;
    const yaw = g.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const wx = cam.x - g.position.x, wy = cam.y - g.position.y, wz = cam.z - g.position.z;
    const lx = wx * cy - wz * sy, ly = wy, lz = wx * sy + wz * cy;
    const gutter = sky.flicker.value < 0.62;
    state.closed = gutter;
    if (gutter !== closedPrev) { ctx.audio?.cue?.(gutter ? 'eyes-close' : 'eyes-open', g.position); closedPrev = gutter; }
    const ga = gazeA.array;
    for (let i = 0; i < N; i++) {
      const o = i * 12;
      // gaze: toward the camera in socket space, plus a restless offset that jumps every second or two
      const vx = lx - S[o + 9], vy = ly - S[o + 10], vz = lz - S[o + 11];
      let tx = vx * S[o] + vy * S[o + 1] + vz * S[o + 2];
      let ty = vx * S[o + 3] + vy * S[o + 4] + vz * S[o + 5];
      let tz = vx * S[o + 6] + vy * S[o + 7] + vz * S[o + 8];
      let tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      sac[i * 3 + 2] -= dt;
      if (sac[i * 3 + 2] <= 0) { sac[i * 3] = (rng() - 0.5) * 0.16; sac[i * 3 + 1] = (rng() - 0.5) * 0.12; sac[i * 3 + 2] = 0.4 + rng() * 2.6; }
      tx += sac[i * 3]; ty += sac[i * 3 + 1];
      // strain: an eye on the far side of the cloak rolls as far round toward you as it can
      if (tz < 0.42) { const k = Math.sqrt((1 - 0.42 * 0.42) / Math.max(1e-6, tx * tx + ty * ty)); tx *= k; ty *= k; tz = 0.42; }
      tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
      const k = 1 - Math.exp(-rate[i] * dt);
      let gx = G[i * 3] + (tx - G[i * 3]) * k, gyy = G[i * 3 + 1] + (ty - G[i * 3 + 1]) * k, gz = G[i * 3 + 2] + (tz - G[i * 3 + 2]) * k;
      const gl = Math.hypot(gx, gyy, gz) || 1; gx /= gl; gyy /= gl; gz /= gl;
      G[i * 3] = gx; G[i * 3 + 1] = gyy; G[i * 3 + 2] = gz;
      ga[i * 3] = gx; ga[i * 3 + 1] = gyy; ga[i * 3 + 2] = gz;
      // lids: a wave climbing from hem to hood, another running round the cloak, and each eye's own blink
      const ey = S[o + 10], az = Math.atan2(S[o + 11], S[o + 9]);
      const w1 = ((t / 5.3 - ey * 0.19) % 1 + 1) % 1, w2 = ((t / 8.9 - az / TAU) % 1 + 1) % 1;
      lidT[i] -= dt;
      if (lidT[i] < -0.16) lidT[i] = 4 + rng() * 22;
      let target = (w1 < 0.032 || w2 < 0.022 || lidT[i] < 0) ? 1 : 0;
      if (gutter) target = 1;
      lid[i] = approach(lid[i], target, target > lid[i] ? 38 : 11, dt);
      lidA.array[i] = lid[i];
    }
    gazeA.needsUpdate = true; lidA.needsUpdate = true;
  }
  ctx.registerUpdate(update, { at: () => g.position, near: 40, hz: 5 }); // v3: the eyes track every frame only within 40 m

  U.cloak = Object.assign(state, {
    group: g,
    // test hook: snap the figure's yaw and every eye's gaze to the current camera
    settle() { for (let i = 0; i < 40; i++) update(0.25, ctx.time.t); },
  });
  return { drawCalls: 2, tris: (P.i.length / 3) + N * eyeGeo.index.count / 3 };
}
